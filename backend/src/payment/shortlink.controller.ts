import { Controller, Get, Param, HttpException, HttpStatus, Req, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PaymentService } from './payment.service';
import { Public } from '../auth/decorators/public.decorator';
import { CsrfExempt } from '../common/guards/csrf.guard';
import { Request } from 'express';

@Controller('payment/short')
export class PaymentShortlinkController {
  private readonly logger = new Logger(PaymentShortlinkController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  @Get('qr/:slug')
  @Public()
  @CsrfExempt()
  async resolveQrSlug(@Param('slug') slug: string) {
    if (!slug || slug.length < 4) {
      throw new HttpException('Invalid short code', HttpStatus.BAD_REQUEST);
    }

    const event = await this.prisma.event.findFirst({
      where: {
        id: {
          startsWith: slug,
        },
        isPaymentEnabled: true,
      },
    });

    if (!event) {
      throw new HttpException('Event not found for this short code', HttpStatus.NOT_FOUND);
    }

    if (!event.price) {
      throw new HttpException('Payment is not enabled for this event', HttpStatus.BAD_REQUEST);
    }

    // Create a fresh order and directly obtain cashierUrl, so short link behaves like Pay to Register
    const order = await this.prisma.order.create({
      data: {
        eventId: event.id,
        amount: event.price,
        status: 'PENDING',
      },
    });

    const frontendUrl =
      process.env.FRONTEND_URL || process.env.NEXT_PUBLIC_SITE_URL || 'https://www.giip.info';
    const backendPublicUrl = process.env.BACKEND_PUBLIC_URL || frontendUrl;

    const jsonDataObj: Record<string, string> = {
      accountid: process.env.PAYMENT_ACCOUNT_ID || '1',
      idserial: order.id,
      journo: order.id,
      userip: '127.0.0.1',
      partnerid: process.env.PAYMENT_PARTNER_ID || 'PT000159',
      schoolcode: process.env.PAYMENT_SCHOOL_CODE || '10001',
      projectId: process.env.PAYMENT_PROJECT_ID || 'c6b5a747e30b4380ac6a4e624d1d7c10',
      txamt: String(event.price),
      unitAmount: String(event.price),
      productdesc: `Registration: ${event.title}`.slice(0, 100),
      username: 'Guest',
      returnurl: `${frontendUrl}/payment/callback`,
      notifyurl: `${backendPublicUrl}/api/payment/notify`,
    };

    const jsonDataStr = JSON.stringify(jsonDataObj);
    const encryptedJsonData = this.paymentService.encryptDESede(jsonDataStr);
    const sign = this.paymentService.signRSA(jsonDataStr);

    const paymentDomain = process.env.PAYMENT_DOMAIN || 'cwpay.pku.edu.cn';
    const gatewayUrl = `https://${paymentDomain}/pay/cashier/createOrder`;
    this.logger.log(`shortlink createOrder: slug=${slug}, eventId=${event.id}, orderId=${order.id}`);

    const response = await fetch(gatewayUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        partnerid: process.env.PAYMENT_PARTNER_ID || 'PT000159',
        jsonData: encryptedJsonData,
        sign,
        gateway: 'WEB',
      }),
    });

    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text().catch(() => '');
      throw new HttpException(
        `Payment gateway returned unexpected response: ${response.status} ${text.substring(0, 200)}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    const responseData: any = await response.json();
    if (!(responseData?.messageCode === '0' || responseData?.returncode === 'SUCCESS')) {
      throw new HttpException(
        `Payment gateway error: ${responseData?.message || responseData?.returnmsg || 'Unknown error'}`,
        HttpStatus.BAD_GATEWAY,
      );
    }

    let cashierUrl: string = responseData.data || responseData.cashierUrl || '';
    if (cashierUrl && !/^https?:\/\//i.test(cashierUrl)) {
      cashierUrl = `https://${cashierUrl.startsWith('/') ? paymentDomain : ''}${cashierUrl}`;
    }

    return { cashierUrl, orderId: order.id };
  }
}

