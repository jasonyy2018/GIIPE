'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { CheckCircle2, XCircle, ArrowRight, Loader2, Copy, Download, CheckCheck } from 'lucide-react';
import PublicLayout from '@/components/public/PublicLayout';

interface OrderDetails {
  id: string;
  amount: number;
  status: string;
  platformOrderNo?: string;
  payType?: string;
  payTime?: string;
  createdAt: string;
  eventId: string;
}

const REGISTRATION_FORM_URL = 'https://gsm-academic.mikecrm.com/3IMx533';

export default function PaymentReturnPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'failed' | 'pending'>('loading');
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [eventTitle, setEventTitle] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [pollingCount, setPollingCount] = useState(0);
  const [fallbackOrderId, setFallbackOrderId] = useState<string | null>(null);
  const [fallbackAmount, setFallbackAmount] = useState<string | null>(null);

  const fetchOrderStatus = useCallback(async (orderId: string) => {
    try {
      const token = localStorage.getItem('authToken');
      if (!token) return null;

      const res = await fetch(`/api/payment/query/${orderId}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (res.ok) {
        return await res.json();
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    const orderId = sessionStorage.getItem('lastOrderId');
    const storedEventTitle = sessionStorage.getItem('lastOrderEventTitle');
    const storedAmount = sessionStorage.getItem('lastOrderAmount');

    if (storedEventTitle) setEventTitle(storedEventTitle);
    if (orderId) setFallbackOrderId(orderId);
    if (storedAmount) setFallbackAmount(storedAmount);

    if (!orderId) {
      // No orderId stored, show a generic success after delay
      const timer = setTimeout(() => setStatus('success'), 2000);
      return () => clearTimeout(timer);
    }

    // Poll order status
    const pollOrder = async () => {
      const orderData = await fetchOrderStatus(orderId);
      if (orderData) {
        setOrder(orderData);
        if (orderData.status === 'SUCCESS') {
          setStatus('success');
          return true;
        } else if (orderData.status === 'FAILED') {
          setStatus('failed');
          return true;
        }
      }
      return false;
    };

    // Initial check
    pollOrder().then((done) => {
      if (!done) {
        setStatus('pending');
        // Poll every 3 seconds for up to 30 seconds
        let count = 0;
        const interval = setInterval(async () => {
          count++;
          setPollingCount(count);
          const isDone = await pollOrder();
          if (isDone || count >= 10) {
            clearInterval(interval);
            if (!isDone) {
              // After timeout, assume success (webhook will update actual status)
              setStatus('success');
            }
          }
        }, 3000);

        return () => clearInterval(interval);
      }
    });
  }, [fetchOrderStatus]);

  // 支付成功后自动跳转到第三方报名链接，并携带订单信息
  useEffect(() => {
    if (status !== 'success') return;

    // 优先使用后端返回的订单信息，其次使用 sessionStorage 里的回退值
    const orderNo = order?.platformOrderNo || order?.id || fallbackOrderId;
    const amountYuan =
      order?.amount != null
        ? (order.amount / 100).toFixed(2)
        : fallbackAmount || undefined;

    try {
      const url = new URL(REGISTRATION_FORM_URL);
      if (orderNo) url.searchParams.set('orderId', orderNo);
      if (order?.id && order?.platformOrderNo) {
        url.searchParams.set('platformOrderNo', order.platformOrderNo);
        url.searchParams.set('internalOrderId', order.id);
      }
      if (amountYuan) url.searchParams.set('amount', amountYuan);
      if (eventTitle) url.searchParams.set('eventTitle', eventTitle);

      // 直接跳转到报名表
      window.location.href = url.toString();
    } catch (e) {
      console.error('Failed to redirect to registration form:', e);
    }
  }, [status, order, eventTitle, fallbackOrderId, fallbackAmount]);

  const copyOrderNo = async () => {
    const orderNo = order?.platformOrderNo || order?.id;
    if (!orderNo) return;

    try {
      await navigator.clipboard.writeText(orderNo);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textArea = document.createElement('textarea');
      textArea.value = orderNo;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadReceipt = () => {
    const orderNo = order?.platformOrderNo || order?.id || 'N/A';
    const amount = order?.amount ? (order.amount / 100).toFixed(2) : '0.00';
    const payTime = order?.payTime
      ? new Date(order.payTime).toLocaleString('zh-CN')
      : new Date().toLocaleString('zh-CN');
    const title = eventTitle || 'Event Registration';

    const receiptContent = `
╔══════════════════════════════════════════╗
║              E-RECEIPT                   ║
╠══════════════════════════════════════════╣
║                                          ║
║  Order No:    ${orderNo.padEnd(27)}║
║  Item:        ${title.padEnd(27)}║
║  Amount:      ￥${amount.padEnd(25)}║
║  Date:        ${payTime.padEnd(27)}║
║  Status:      PAID                       ║
║  Method:      ${(order?.payType || 'Online Payment').padEnd(27)}║
║                                          ║
╠══════════════════════════════════════════╣
║  This receipt is system-generated.        ║
║  Contact organizer for official invoice.  ║
╚══════════════════════════════════════════╝
    `.trim();

    const blob = new Blob([receiptContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Receipt_${orderNo}_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <PublicLayout>
      <div className="min-h-[70vh] flex items-center justify-center bg-gray-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-lg w-full bg-white rounded-xl shadow-lg overflow-hidden">

          {/* Loading / Pending State */}
          {(status === 'loading' || status === 'pending') && (
            <div className="flex flex-col items-center justify-center py-16 px-8">
              <Loader2 className="h-16 w-16 text-primary animate-spin mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Verifying Payment...</h2>
              <p className="text-gray-500 text-center">
                Please wait, we are confirming your transaction status.
              </p>
              {status === 'pending' && pollingCount > 2 && (
                <p className="text-xs text-gray-400 mt-4">
                  Payment gateway is currently processing, please be patient...
                </p>
              )}
            </div>
          )}

          {/* Success State */}
          {status === 'success' && (
            <div className="flex flex-col items-center">
              {/* Success Header */}
              <div className="w-full bg-gradient-to-r from-green-500 to-green-600 py-8 px-8 text-center">
                <CheckCircle2 className="h-16 w-16 text-white mx-auto mb-3" />
                <h2 className="text-2xl font-bold text-white">Payment Successful!</h2>
                <p className="text-green-100 text-sm mt-1">Your event registration is confirmed</p>
              </div>

              {/* Order Details */}
              <div className="w-full px-8 py-6 space-y-4">
                {/* Event Title */}
                {eventTitle && (
                  <div className="text-center pb-4 border-b border-gray-100">
                    <p className="text-sm text-gray-500">Registration</p>
                    <p className="text-lg font-semibold text-gray-900">{eventTitle}</p>
                  </div>
                )}

                {/* Order Info Grid */}
                <div className="space-y-3">
                  {/* Order Number */}
                  <div className="flex items-center justify-between py-2">
                    <span className="text-sm text-gray-500">Order No.</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-mono text-gray-900">
                        {order?.platformOrderNo || order?.id || 'Processing...'}
                      </span>
                      {(order?.platformOrderNo || order?.id) && (
                        <button
                          onClick={copyOrderNo}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                          title="Copy Order No."
                        >
                          {copied ? (
                            <CheckCheck className="w-4 h-4 text-green-500" />
                          ) : (
                            <Copy className="w-4 h-4 text-gray-400" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Amount */}
                  <div className="flex items-center justify-between py-2 border-t border-gray-100">
                    <span className="text-sm text-gray-500">Amount</span>
                    <span className="text-lg font-bold text-green-600">
                      ￥{order?.amount ? (order.amount / 100).toFixed(2) : '0.00'}
                    </span>
                  </div>

                  {/* Pay Time */}
                  {order?.payTime && (
                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Payment Time</span>
                      <span className="text-sm text-gray-700">
                        {new Date(order.payTime).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Pay Type */}
                  {order?.payType && (
                    <div className="flex items-center justify-between py-2 border-t border-gray-100">
                      <span className="text-sm text-gray-500">Method</span>
                      <span className="text-sm text-gray-700">{order.payType}</span>
                    </div>
                  )}
                </div>

                {/* Download Receipt */}
                <div className="pt-4 border-t border-gray-200">
                  <button
                    onClick={downloadReceipt}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download e-Receipt</span>
                  </button>
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 pt-4">
                  <Link
                    href="/dashboard"
                    className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors w-full sm:w-auto flex-1"
                  >
                    Go to Dashboard
                    <ArrowRight className="ml-2 -mr-1 h-5 w-5" />
                  </Link>
                  <Link
                    href="/conferences"
                    className="inline-flex justify-center items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 transition-colors w-full sm:w-auto flex-1"
                  >
                    Browse More Events
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Failed State */}
          {status === 'failed' && (
            <div className="flex flex-col items-center py-12 px-8">
              <XCircle className="h-20 w-20 text-red-500 mb-6" />
              <h2 className="text-2xl font-bold text-gray-900 mb-3">Payment Failed</h2>
              <p className="text-gray-600 mb-2 text-center">
                We're sorry, your payment could not be completed. Please try again or contact support.
              </p>
              {order?.id && (
                <p className="text-xs text-gray-400 mb-6">
                  Order No: {order.id}
                </p>
              )}
              <div className="flex flex-col sm:flex-row gap-3 w-full">
                <Link
                  href="/conferences"
                  className="inline-flex justify-center items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary hover:bg-primary-dark transition-colors w-full sm:w-auto flex-1"
                >
                  Return to Event List
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </PublicLayout>
  );
}
