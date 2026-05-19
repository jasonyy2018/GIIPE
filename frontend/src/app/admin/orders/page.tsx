'use client';

import React, { useState, useEffect, useCallback } from 'react';
import AdminGuard from '@/components/AdminGuard';
import { useAuth } from '@/contexts/AuthContext';

interface Order {
  id: string;
  amount: number;
  amountYuan: string;
  feeCents?: number;
  feeYuan?: string;
  totalYuan?: string;
  status: string;
  payType: string | null;
  platformOrderNo: string | null;
  payTime: string | null;
  createdAt: string;
  eventTitle: string;
  payerName: string;
  event?: { id: string; title: string };
}

interface OrderStats {
  totalOrders: number;
  successOrders: number;
  pendingOrders: number;
  failedOrders: number;
  totalRevenueYuan: string;
}

interface EventOption {
  id: string;
  title: string;
}

const STATUS_MAP: Record<string, { label: string; color: string }> = {
  SUCCESS: { label: '成功', color: 'bg-green-100 text-green-800' },
  PENDING: { label: '待支付', color: 'bg-yellow-100 text-yellow-800' },
  FAILED: { label: '失败', color: 'bg-red-100 text-red-800' },
};

const PAY_TYPE_MAP: Record<string, string> = {
  '01': '支付宝',
  '02': '微信支付',
  '03': '银行卡',
};



function OrdersPageContent() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState<OrderStats | null>(null);
  const [events, setEvents] = useState<EventOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  // Filters
  const [eventId, setEventId] = useState('');
  const [status, setStatus] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const getToken = () => typeof window !== 'undefined' ? localStorage.getItem('authToken') : null;

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (status) params.append('status', status);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', String(page));
      params.append('limit', '20');

      const res = await fetch(`/api/admin/orders?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotal(data.pagination?.total || 0);
      }
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  }, [eventId, status, startDate, endDate, page]);

  const fetchStats = useCallback(async () => {
    try {
      const token = getToken();
      const params = new URLSearchParams();
      if (eventId) params.append('eventId', eventId);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const res = await fetch(`/api/admin/orders/stats?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  }, [eventId, startDate, endDate]);

  const fetchEvents = useCallback(async () => {
    try {
      const token = getToken();
      const res = await fetch('/api/admin/events?limit=100', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        const eventList = data.events || data.data || data || [];
        setEvents(Array.isArray(eventList) ? eventList.map((e: any) => ({ id: e.id, title: e.title })) : []);
      }
    } catch (err) {
      console.error('Failed to load events:', err);
    }
  }, []);

  useEffect(() => { fetchEvents(); }, [fetchEvents]);
  useEffect(() => { fetchOrders(); fetchStats(); }, [fetchOrders, fetchStats]);

  const handleExport = async () => {
    const token = getToken();
    const params = new URLSearchParams();
    if (eventId) params.append('eventId', eventId);
    if (status) params.append('status', status);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);

    try {
      const res = await fetch(`/api/admin/orders/export?${params.toString()}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payment-ledger-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      } else {
        alert('导出失败');
      }
    } catch (err) {
      console.error('Export failed:', err);
      alert('导出失败');
    }
  };

  const handleFilter = () => { setPage(1); fetchOrders(); fetchStats(); };
  const handleReset = () => { setEventId(''); setStatus(''); setStartDate(''); setEndDate(''); setPage(1); };

  const formatDate = (d: string | null) => {
    if (!d) return '-';
    return new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-6">
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">支付流水</h1>
            <p className="text-gray-500 mt-1">查看所有支付订单记录，支持筛选和导出凭证</p>
          </div>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors shadow-sm"
          >
            <i className="fas fa-file-excel"></i>
            导出 Excel 凭证
          </button>
        </div>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="text-sm text-gray-500">总订单数</div>
              <div className="text-2xl font-bold text-gray-900 mt-1">{stats.totalOrders}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="text-sm text-gray-500">总收入</div>
              <div className="text-2xl font-bold text-green-600 mt-1">¥{stats.totalRevenueYuan}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="text-sm text-gray-500">成功付款</div>
              <div className="text-2xl font-bold text-green-600 mt-1">{stats.successOrders}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="text-sm text-gray-500">待支付</div>
              <div className="text-2xl font-bold text-yellow-600 mt-1">{stats.pendingOrders}</div>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-5">
              <div className="text-sm text-gray-500">支付失败</div>
              <div className="text-2xl font-bold text-red-600 mt-1">{stats.failedOrders}</div>
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">活动</label>
              <select
                value={eventId}
                onChange={(e) => setEventId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">全部活动</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              >
                <option value="">全部状态</option>
                <option value="SUCCESS">成功</option>
                <option value="PENDING">待支付</option>
                <option value="FAILED">失败</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary/50"
              />
            </div>
            <div className="flex gap-2">
              <button onClick={handleFilter} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark text-sm transition-colors">筛选</button>
              <button onClick={handleReset} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm transition-colors">重置</button>
            </div>
          </div>
        </div>

        {/* Orders Table */}
        <div className="bg-white rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">序号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">订单号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">平台订单号</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">收费项目</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">付款人</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">金额（元）</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">手续费（元）</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">应付金额（元）</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">状态</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付方式</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">支付时间</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">创建时间</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                      <p className="text-gray-500 mt-2">加载中...</p>
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="px-4 py-12 text-center text-gray-500">
                      <i className="fas fa-inbox text-4xl text-gray-300 mb-3 block"></i>
                      暂无订单记录
                    </td>
                  </tr>
                ) : (
                  orders.map((order, idx) => {
                    const statusInfo = STATUS_MAP[order.status] || { label: order.status, color: 'bg-gray-100 text-gray-800' };
                    return (
                      <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500">{(page - 1) * 20 + idx + 1}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-700 max-w-[140px] truncate" title={order.id}>{order.id}</td>
                        <td className="px-4 py-3 text-sm font-mono text-gray-600 max-w-[180px] truncate" title={order.platformOrderNo || '-'}>{order.platformOrderNo || '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-[220px] truncate" title={order.eventTitle}>{order.eventTitle}</td>
                        <td className="px-4 py-3 text-sm text-gray-700">{order.payerName}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">¥{order.amountYuan}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 text-right">¥{order.feeYuan ?? '0.00'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-medium text-right">¥{order.totalYuan ?? order.amountYuan}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${statusInfo.color}`}>
                            {statusInfo.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-700">{order.payType ? (PAY_TYPE_MAP[order.payType] || order.payType) : '-'}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.payTime)}</td>
                        <td className="px-4 py-3 text-sm text-gray-500">{formatDate(order.createdAt)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
              <div className="text-sm text-gray-500">
                共 {total} 条记录，第 {page}/{totalPages} 页
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <button
                  onClick={() => setPage(Math.min(totalPages, page + 1))}
                  disabled={page === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>

  );
}

export default function AdminOrdersPage() {
  return (
    <AdminGuard>
      <OrdersPageContent />
    </AdminGuard>
  );
}
