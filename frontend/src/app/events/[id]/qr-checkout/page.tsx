'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import PublicLayout from '@/components/public/PublicLayout';
import { publicAPI } from '@/lib/public-api';

export default function EventQrCheckoutPage() {
  const params = useParams();
  const eventId = params?.id as string | undefined;
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setError('Invalid event.');
      return;
    }

    let cancelled = false;

    const startPayment = async () => {
      try {
        const res = await publicAPI.createPaymentOrder(eventId);
        if (cancelled) return;

        if (res.success && res.cashierUrl) {
          // 与 Pay to Register 按钮保持一致的存储，用于回调页展示信息
          sessionStorage.setItem('lastOrderId', res.orderId);
          sessionStorage.setItem('lastOrderEventTitle', '');
          sessionStorage.setItem('lastOrderAmount', '');

          let url = res.cashierUrl;
          if (!/^https?:\/\//i.test(url)) {
            url = `https://${url}`;
          }
          window.location.href = url;
        } else {
          setError('Failed to create payment order.');
        }
      } catch (e: any) {
        setError(e?.message || 'Failed to initialize payment.');
      }
    };

    startPayment();

    return () => {
      cancelled = true;
    };
  }, [eventId]);

  return (
    <PublicLayout>
      <div className="min-h-[60vh] flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-md px-6 py-10 text-center">
          {!error ? (
            <>
              <p className="text-sm text-primary font-semibold tracking-wide mb-3">
                Redirecting to Secure Payment
              </p>
              <p className="text-lg font-medium text-gray-900 mb-4">
                正在为您打开收银台，请稍候…
              </p>
              <p className="text-sm text-gray-500">
                如果长时间没有跳转，请返回活动页面重试，或联系管理员。
              </p>
            </>
          ) : (
            <>
              <p className="text-lg font-semibold text-red-600 mb-3">无法发起支付</p>
              <p className="text-sm text-gray-600 mb-2">{error}</p>
              <p className="text-xs text-gray-400">
                请返回活动页面重新扫码或联系管理员。
              </p>
            </>
          )}
        </div>
      </div>
    </PublicLayout>
  );
}

