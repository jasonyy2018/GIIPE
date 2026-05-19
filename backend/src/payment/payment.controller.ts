import { Controller, Post, Body, Req, Res, Get, Param, HttpException, HttpStatus, Logger, UseGuards, Put } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PrismaService } from '../prisma/prisma.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Public } from '../auth/decorators/public.decorator';
import { CsrfExempt } from '../common/guards/csrf.guard';
import { Request, Response } from 'express';

/** Truncate string to max byte length in UTF-8 (payment gateway field limits). */
function truncateToBytes(str: string, maxBytes: number): string {
  if (Buffer.byteLength(str, 'utf8') <= maxBytes) return str;
  let s = str;
  while (Buffer.byteLength(s, 'utf8') > maxBytes && s.length > 0) s = s.slice(0, -1);
  return s;
}

/** Truncate string to max character count (for productdesc 商品描述). */
function truncateToChars(str: string, maxChars: number): string {
  return str.length <= maxChars ? str : str.slice(0, maxChars);
}

/**
 * 预下单时我们传给支付平台的 jsonData 字段及长度上限。
 * 超出会触发网关「字符串规则校验失败」。若平台文档有不同限制，可在此调整。
 *
 * productdesc 按字符数限制，其余按 UTF-8 字节数限制。
 */
const PAYMENT_FIELD_LIMITS = {
  productdescChars: 100, // 商品描述 100 字符
  username: 64,          // 用户名/付款人 (字节)
  idserial: 64,          // 用户标识 (字节)
  journo: 64,            // 订单号 (字节)
  returnurl: 256,        // 前台回调 URL (字节)
  notifyurl: 256,        // 异步通知 URL (字节)
} as const;

@Controller('payment')
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  // Default values - these should ideally come from environment variables
  private readonly partnerId = process.env.PAYMENT_PARTNER_ID || 'PT000159';
  private readonly schoolCode = process.env.PAYMENT_SCHOOL_CODE || '10001';
  private readonly paymentDomain = process.env.PAYMENT_DOMAIN || 'cwpay.pku.edu.cn'; 

  constructor(
    private readonly paymentService: PaymentService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('create-order')
  @Public()
  @CsrfExempt()
  async createOrder(@Req() req: any, @Body() body: { eventId: string; gateway?: string }) {
    const userId = req.user?.id || null;
    const { eventId, gateway: clientGateway } = body;

    this.logger.log(`create-order called: eventId=${eventId}, userId=${userId}`);

    if (!eventId) {
      throw new HttpException('eventId is required', HttpStatus.BAD_REQUEST);
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });

    if (!event) {
      throw new HttpException('Event not found', HttpStatus.NOT_FOUND);
    }

    if (!event.isPaymentEnabled || !event.price) {
      throw new HttpException('Payment is not enabled for this event', HttpStatus.BAD_REQUEST);
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const eventStartDate = new Date(event.startDate);
    eventStartDate.setHours(0, 0, 0, 0);

    if (today >= eventStartDate) {
      throw new HttpException('Payment channel is closed for this event', HttpStatus.BAD_REQUEST);
    }

    if (userId) {
      const existingOrder = await this.prisma.order.findFirst({
           where: { userId, eventId, status: 'SUCCESS' }
      });

      if (existingOrder) {
         throw new HttpException('You have already paid for this event', HttpStatus.BAD_REQUEST);
      }
    }

    const orderData: any = {
      eventId,
      amount: event.price,
      status: 'PENDING',
    };
    if (userId) orderData.userId = userId;

    const order = await this.prisma.order.create({
      data: orderData,
    });

    const frontendUrl = process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || frontendUrl;

    const jsonDataObj: Record<string, string> = {
      accountid: process.env.PAYMENT_ACCOUNT_ID || "1",
      idserial: truncateToBytes(userId || order.id, PAYMENT_FIELD_LIMITS.idserial),
      journo: truncateToBytes(order.id, PAYMENT_FIELD_LIMITS.journo),
      userip: req.ip?.replace('::ffff:', '') || '127.0.0.1',
      partnerid: this.partnerId,
      schoolcode: this.schoolCode,
      projectId: process.env.PAYMENT_PROJECT_ID || "c6b5a747e30b4380ac6a4e624d1d7c10",
      txamt: String(event.price),
      unitAmount: String(event.price),
      productdesc: truncateToChars(`Registration: ${event.title}`, PAYMENT_FIELD_LIMITS.productdescChars),
      username: truncateToBytes(req.user?.username || 'Guest', PAYMENT_FIELD_LIMITS.username),
      returnurl: truncateToBytes(`${frontendUrl}/payment/callback`, PAYMENT_FIELD_LIMITS.returnurl),
      notifyurl: truncateToBytes(`${backendPublicUrl}/api/payment/notify`, PAYMENT_FIELD_LIMITS.notifyurl),
    };

    const jsonDataStr = JSON.stringify(jsonDataObj);

    let encryptedJsonData: string;
    let sign: string;

    try {
      encryptedJsonData = this.paymentService.encryptDESede(jsonDataStr);
    } catch (error: any) {
      this.logger.error('DESede encryption failed', { message: error.message, orderId: order.id });
      throw new HttpException('Payment encryption failed — check PAYMENT_DES_KEY', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      sign = this.paymentService.signRSA(jsonDataStr);
    } catch (error: any) {
      this.logger.error('RSA signing failed', { message: error.message, orderId: order.id });
      throw new HttpException('Payment signing failed — check PAYMENT_RSA_PRIVATE_KEY', HttpStatus.INTERNAL_SERVER_ERROR);
    }

    try {
      const gatewayUrl = `https://${this.paymentDomain}/pay/cashier/createOrder`;
      this.logger.log(`Calling payment gateway: ${gatewayUrl}, orderId=${order.id}`);
      
      const response = await fetch(gatewayUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
           partnerid: this.partnerId,
           jsonData: encryptedJsonData,
           sign: sign,
           gateway: clientGateway || 'WEB',
        })
      });

      const contentType = response.headers.get('content-type');
      let responseData: any;

      if (contentType && contentType.includes('application/json')) {
        responseData = await response.json();
        this.logger.log('Gateway JSON response', JSON.stringify(responseData).substring(0, 300));
      } else {
        const text = await response.text();
        this.logger.error(`Gateway non-JSON (${response.status}): ${text.substring(0, 500)}`);
        throw new HttpException(`Payment gateway returned unexpected response: ${response.status}`, HttpStatus.BAD_GATEWAY);
      }

      if (responseData.messageCode === '0' || responseData.returncode === 'SUCCESS') {
          let cashierUrl: string = responseData.data || responseData.cashierUrl || '';
          if (cashierUrl && !/^https?:\/\//i.test(cashierUrl)) {
            cashierUrl = `https://${cashierUrl.startsWith('/') ? this.paymentDomain : ''}${cashierUrl}`;
          }
          this.logger.log(`Returning cashierUrl: ${cashierUrl}`);
          return {
              success: true,
              cashierUrl,
              orderId: order.id
          };
      } else {
         this.logger.error('Gateway failure', responseData);
         throw new HttpException(
           `Payment gateway error: ${responseData.message || responseData.returnmsg || 'Unknown error'}`,
           HttpStatus.BAD_GATEWAY,
         );
      }
    } catch (error: any) {
       if (error instanceof HttpException) throw error;
       
       this.logger.error('Gateway communication error', {
         message: error.message,
         orderId: order.id,
       });
       throw new HttpException(
         `Failed to communicate with payment server: ${error.message}`,
         HttpStatus.INTERNAL_SERVER_ERROR,
       );
    }
  }

  @Post('notify')
  @Public()
  @CsrfExempt()
  async paymentNotify(@Req() req: Request, @Res() res: Response) {
    // The payment gateway hits this webhook asynchronously
    const { partnerid, jsonData, sign } = req.body;

    if (!partnerid || !jsonData || !sign) {
      return res.status(HttpStatus.BAD_REQUEST).send('Missing parameters');
    }

    try {
      // 1. Decrypt jsonData using DESede
      const decryptedJsonStr = this.paymentService.decryptDESede(jsonData as string);

      // 2. Verify signature using RSA
      const isValid = this.paymentService.verifyRSA(decryptedJsonStr, sign as string);

      if (!isValid) {
        this.logger.error('Signature verification failed for webhook notification');
        return res.status(HttpStatus.UNAUTHORIZED).send('Invalid signature');
      }

      const notifyData = JSON.parse(decryptedJsonStr);

      if (notifyData.returncode === 'SUCCESS' || notifyData.tradestatus === 'SUCCESS') {
        const orderId = notifyData.journo;

        // Find and update the order
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (order) {
            // Lock and update mechanism to avoid duplicate processing would ideally use a Prisma transaction
            // with a condition like `where: { id: orderId, status: 'PENDING' }`
            const feeCents = notifyData.poundage != null ? parseInt(String(notifyData.poundage), 10) : null;
            await this.prisma.order.update({
              where: { id: orderId },
              data: {
                status: 'SUCCESS',
                platformOrderNo: notifyData.businessorderno,
                payType: notifyData.paytype,
                payTime: notifyData.paytime ? new Date(
                  `${notifyData.paytime.substring(0,4)}-${notifyData.paytime.substring(4,6)}-${notifyData.paytime.substring(6,8)}T${notifyData.paytime.substring(8,10)}:${notifyData.paytime.substring(10,12)}:${notifyData.paytime.substring(12,14)}Z`
                ) : new Date(),
                ...(Number.isInteger(feeCents) && feeCents >= 0 && { feeCents }),
              }
            });

            if (order.userId) {
              await this.prisma.registration.upsert({
                where: {
                  userId_eventId: { userId: order.userId, eventId: order.eventId }
                },
                update: { status: 'CONFIRMED' },
                create: {
                  userId: order.userId,
                  eventId: order.eventId,
                  status: 'CONFIRMED'
                }
              });
            }

            return res.status(HttpStatus.OK).send('success');
        } else {
            this.logger.error(`Order not found for notification: ${orderId}`);
            return res.status(HttpStatus.OK).send('success');
        }
      } else {
        this.logger.warn(`Payment notification reported failure: ${notifyData.returnmsg}`);
        return res.status(HttpStatus.OK).send('success');
      }
    } catch (error) {
      this.logger.error('Failed to process payment notification', error);
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).send('ERROR');
    }
  }

  @Post('return-callback')
  @Public()
  @CsrfExempt()
  async returnCallback(@Body() body: { partnerid: string; jsonData: string; sign: string }) {
    const { partnerid, jsonData, sign } = body;
    if (!partnerid || !jsonData || !sign) {
      return { processed: false, reason: 'Missing parameters' };
    }

    try {
      const decryptedJsonStr = this.paymentService.decryptDESede(jsonData);
      const isValid = this.paymentService.verifyRSA(decryptedJsonStr, sign);
      if (!isValid) {
        this.logger.warn('Return-callback signature verification failed');
        return { processed: false, reason: 'Invalid signature' };
      }

      const data = JSON.parse(decryptedJsonStr);
      this.logger.log(`Return-callback data: ${JSON.stringify(data).substring(0, 300)}`);

      if (data.returncode === 'SUCCESS') {
        const orderId = data.journo;
        const order = await this.prisma.order.findUnique({ where: { id: orderId } });
        if (order && order.status === 'PENDING') {
          const feeCents = data.poundage != null ? parseInt(String(data.poundage), 10) : null;
          await this.prisma.order.update({
            where: { id: orderId },
            data: {
              status: 'SUCCESS',
              platformOrderNo: data.businessorderno,
              payType: data.paytype,
              payTime: data.paytime ? new Date(
                `${data.paytime.substring(0,4)}-${data.paytime.substring(4,6)}-${data.paytime.substring(6,8)}T${data.paytime.substring(8,10)}:${data.paytime.substring(10,12)}:${data.paytime.substring(12,14)}Z`
              ) : new Date(),
              ...(Number.isInteger(feeCents) && feeCents >= 0 && { feeCents }),
            },
          });

          if (order.userId) {
            await this.prisma.registration.upsert({
              where: { userId_eventId: { userId: order.userId, eventId: order.eventId } },
              update: { status: 'CONFIRMED' },
              create: { userId: order.userId, eventId: order.eventId, status: 'CONFIRMED' },
            });
          }
        }
      }

      return { processed: true };
    } catch (error: any) {
      this.logger.error('Return-callback processing failed', error.message);
      return { processed: false, reason: error.message };
    }
  }

  @Get('query/:id')
  @UseGuards(JwtAuthGuard)
  async queryOrder(@Req() req: any, @Param('id') id: string) {
    const userId = req.user.id;
    const order = await this.prisma.order.findUnique({
       where: { id }
    });

    if (!order) {
       throw new HttpException('Order not found', HttpStatus.NOT_FOUND);
    }

    if (order.userId !== userId && req.user.role !== 'ADMIN') {
       throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    return order;
  }
}
