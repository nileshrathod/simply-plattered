import { FormEvent, useMemo, useState } from 'react';
import {
  BarChart3,
  ClipboardList,
  Download,
  ExternalLink,
  FileSpreadsheet,
  FileText,
  Lock,
  LogOut,
  MessageSquare,
  Package,
  Search,
  Settings,
  Trash2,
  X,
} from 'lucide-react';
import {
  BusinessSettings,
  CustomEnquiryStatus,
  DemoOrder,
  DemoStoreState,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  PlatterProduct,
} from '../types/simplyPlattered';
import {
  buildWhatsAppOrderUrl,
  formatDateTimeZA,
  formatShortDate,
  formatZAR,
  getOrderOutstandingBalance,
  getOrderPaidTotal,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../lib/formatters';
import { buildOrdersCsv } from '../lib/demoStorage';
import {
  downloadBusinessReportPdf,
  downloadKitchenPrepPdf,
  downloadOrderConfirmationPdf,
} from '../lib/pdfGenerator';
import { AdminProductsTab } from './admin/AdminProductsTab';
import { AdminSettingsTab } from './admin/AdminSettingsTab';

type AdminTab = 'orders' | 'products' | 'enquiries' | 'reports' | 'settings';

interface AdminDashboardViewProps {
  store: DemoStoreState;
  isAdminUnlocked: boolean;
  onUnlockAdmin: () => void;
  onLockAdmin: () => void;
  onUpdateOrderStatus: (orderId: string, status: OrderStatus) => void;
  onUpdateOrderNotes: (orderId: string, notes: string) => void;
  onAddPayment: (
    orderId: string,
    payment: {
      amount: number;
      method: PaymentMethod;
      reference: string;
      paidAt: string;
      notes: string;
    }
  ) => void;
  onDeletePayment: (orderId: string, paymentId: string) => void;
  onDeleteOrder: (orderId: string) => void;
  onToggleProductAvailability: (productId: string) => void;
  onUpdateProduct: (
    productId: string,
    updates: Partial<Omit<PlatterProduct, 'id'>>
  ) => void;
  onAddProduct: (
    input: Omit<PlatterProduct, 'id' | 'slug' | 'sortOrder' | 'updatedAt'>
  ) => void;
  onDeleteProduct: (productId: string) => void;
  onUpdateCustomEnquiry: (
    enquiryId: string,
    updates: { status?: CustomEnquiryStatus; adminNotes?: string }
  ) => void;
  onDeleteCustomEnquiry: (enquiryId: string) => void;
  onSaveSettings: (updates: Partial<BusinessSettings>) => void;
  onExportJson: () => void;
  onImportJson: (jsonText: string) => { ok: boolean; error?: string };
  onSeedSampleOrders: () => void;
  onResetAllDemoData: () => void;
  onNavigateToOrderForm: () => void;
}

function triggerTextDownload(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AdminDashboardView({
  store,
  isAdminUnlocked,
  onUnlockAdmin,
  onLockAdmin,
  onUpdateOrderStatus,
  onUpdateOrderNotes,
  onAddPayment,
  onDeletePayment,
  onDeleteOrder,
  onToggleProductAvailability,
  onUpdateProduct,
  onAddProduct,
  onDeleteProduct,
  onUpdateCustomEnquiry,
  onDeleteCustomEnquiry,
  onSaveSettings,
  onExportJson,
  onImportJson,
  onSeedSampleOrders,
  onResetAllDemoData,
  onNavigateToOrderForm,
}: AdminDashboardViewProps) {
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  const [activeTab, setActiveTab] = useState<AdminTab>('orders');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Orders Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');
  const [paymentFilter, setPaymentFilter] = useState<PaymentStatus | 'all'>('all');
  const [fulfilmentFilter, setFulfilmentFilter] = useState<'all' | 'collection' | 'delivery'>(
    'all'
  );
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Simulated Payment Form inside Order Inspector
  const [payAmount, setPayAmount] = useState('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('eft');
  const [payRef, setPayRef] = useState('');
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [payNotes, setPayNotes] = useState('');
  const [payError, setPayError] = useState('');

  // Report date range filter
  const [reportFrom, setReportFrom] = useState('');
  const [reportTo, setReportTo] = useState('');

  const selectedOrder = useMemo(
    () => store.orders.find((o) => o.id === selectedOrderId) || null,
    [store.orders, selectedOrderId]
  );

  const filteredOrders = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return store.orders.filter((order) => {
      if (statusFilter !== 'all' && order.orderStatus !== statusFilter) return false;
      if (paymentFilter !== 'all' && order.paymentStatus !== paymentFilter) return false;
      if (fulfilmentFilter !== 'all' && order.fulfilmentType !== fulfilmentFilter) return false;
      if (dateFrom && order.requestedDate < dateFrom) return false;
      if (dateTo && order.requestedDate > dateTo) return false;
      if (q) {
        const haystack = [
          order.reference,
          order.customer.fullName,
          order.customer.phone,
          order.customer.email,
          ...order.items.map((i) => i.name),
        ]
          .join(' ')
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [store.orders, searchQuery, statusFilter, paymentFilter, fulfilmentFilter, dateFrom, dateTo]);

  const reportOrders = useMemo(() => {
    return store.orders.filter((order) => {
      if (reportFrom && order.requestedDate < reportFrom) return false;
      if (reportTo && order.requestedDate > reportTo) return false;
      return true;
    });
  }, [store.orders, reportFrom, reportTo]);

  const metrics = useMemo(() => {
    const active = filteredOrders.filter((o) => o.orderStatus !== 'cancelled');
    const totalValue = active.reduce((s, o) => s + o.totalAmount, 0);
    const totalDeposit = active.reduce((s, o) => s + o.depositRequired, 0);
    const totalPaid = active.reduce((s, o) => s + getOrderPaidTotal(o.payments), 0);
    const totalOutstanding = active.reduce((s, o) => s + getOrderOutstandingBalance(o), 0);
    return {
      count: filteredOrders.length,
      activeCount: active.length,
      totalValue,
      totalDeposit,
      totalPaid,
      totalOutstanding,
    };
  }, [filteredOrders]);

  const reportMetrics = useMemo(() => {
    const active = reportOrders.filter((o) => o.orderStatus !== 'cancelled');
    const totalValue = active.reduce((s, o) => s + o.totalAmount, 0);
    const totalPaid = active.reduce((s, o) => s + getOrderPaidTotal(o.payments), 0);
    const totalOutstanding = active.reduce((s, o) => s + getOrderOutstandingBalance(o), 0);
    const collectionCount = active.filter((o) => o.fulfilmentType === 'collection').length;
    const deliveryCount = active.filter((o) => o.fulfilmentType === 'delivery').length;

    const platterBreakdown = new Map<string, { name: string; qty: number; revenue: number }>();
    store.products.forEach((p) =>
      platterBreakdown.set(p.id, { name: p.name, qty: 0, revenue: 0 })
    );
    active.forEach((order) => {
      order.items.forEach((item) => {
        const entry = platterBreakdown.get(item.productId) || {
          name: item.name,
          qty: 0,
          revenue: 0,
        };
        entry.qty += item.quantity;
        entry.revenue += item.lineTotal;
        platterBreakdown.set(item.productId, entry);
      });
    });

    return {
      totalOrders: reportOrders.length,
      activeOrders: active.length,
      totalValue,
      totalPaid,
      totalOutstanding,
      collectionCount,
      deliveryCount,
      platterRows: Array.from(platterBreakdown.values()),
    };
  }, [reportOrders, store.products]);

  const handlePasscodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    setPasscodeError('');
    if (passcodeInput.trim() === store.demoConfig.demoPasscode) {
      onUnlockAdmin();
      setPasscodeInput('');
    } else {
      setPasscodeError(
        `Incorrect demo passcode. Use the documented demo PIN: ${store.demoConfig.demoPasscode}`
      );
    }
  };

  const handleRecordPayment = (e: FormEvent, order: DemoOrder) => {
    e.preventDefault();
    setPayError('');
    const amountNum = Number(payAmount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      setPayError('Please enter a valid payment amount greater than R0.00.');
      return;
    }

    onAddPayment(order.id, {
      amount: amountNum,
      method: payMethod,
      reference: payRef,
      paidAt: payDate,
      notes: payNotes,
    });
    setPayAmount('');
    setPayRef('');
    setPayNotes('');
  };

  const fieldClass =
    'px-3 py-2 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]';

  // ============================================================================
  // DEMO-ONLY ACCESS GATE (Explicitly non-production, client-side only)
  // ============================================================================
  if (!isAdminUnlocked) {
    return (
      <div className="max-w-lg mx-auto px-4 sm:px-6 py-16">
        <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 sm:p-8 space-y-6">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#164E37]/10 dark:bg-[#5ED09E]/15 text-[#164E37] dark:text-[#5ED09E] flex items-center justify-center shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs font-semibold text-[#164E37] dark:text-[#5ED09E]">DEMO ADMIN</p>
              <h1 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                Demo Admin Dashboard Access
              </h1>
            </div>
          </div>

          <div className="p-4 bg-[#FEF7E7] dark:bg-[#2B2212] border border-[#E7C67E] dark:border-[#6B4E1B] rounded-lg text-xs text-[#78350F] dark:text-[#FDE68A] leading-relaxed space-y-1">
            <p className="font-semibold">
              DEMO MODE: Data is stored locally in this browser. Orders are not sent to the
              business.
            </p>
            <p>
              This login screen is a <strong>client-side demonstration gate only</strong> and is NOT
              production authentication. A live production build would use server-verified
              administrator accounts.
            </p>
          </div>

          <form onSubmit={handlePasscodeSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="demo-admin-pin"
                className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
              >
                Demo Access PIN (documented PIN:{' '}
                <span className="font-mono text-[#164E37] dark:text-[#5ED09E]">
                  {store.demoConfig.demoPasscode}
                </span>
                )
              </label>
              <input
                id="demo-admin-pin"
                type="password"
                value={passcodeInput}
                onChange={(e) => setPasscodeInput(e.target.value)}
                placeholder={`Enter ${store.demoConfig.demoPasscode}`}
                className={`w-full font-mono ${fieldClass}`}
              />
            </div>

            {passcodeError && (
              <p role="alert" className="text-xs font-medium text-[#B91C1C] dark:text-[#FCA5A5]">
                {passcodeError}
              </p>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-1">
              <button
                type="submit"
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors cursor-pointer min-h-[42px]"
              >
                Unlock with Demo PIN
              </button>
              <button
                type="button"
                onClick={onUnlockAdmin}
                className="flex-1 py-2.5 px-4 text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg transition-colors cursor-pointer min-h-[42px]"
              >
                Quick Enter Demo Admin
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // ============================================================================
  // UNLOCKED DEMO ADMIN WORKSPACE
  // ============================================================================
  const navItems: Array<{ id: AdminTab; label: string; count?: number; icon: typeof ClipboardList }> =
    [
      {
        id: 'orders',
        label: 'Orders & Payments',
        count: store.orders.length,
        icon: ClipboardList,
      },
      {
        id: 'products',
        label: 'Products & Menu',
        count: store.products.length,
        icon: Package,
      },
      {
        id: 'enquiries',
        label: 'Custom Enquiries',
        count: store.customEnquiries.length,
        icon: MessageSquare,
      },
      { id: 'reports', label: 'Reports & Exports', icon: BarChart3 },
      { id: 'settings', label: 'Business Settings', icon: Settings },
    ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Prominent Demo Admin Banner */}
      <div
        role="status"
        className="mb-6 p-4 bg-[#FEF7E7] dark:bg-[#2B2212] border border-[#E7C67E] dark:border-[#6B4E1B] rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3"
      >
        <div className="text-sm text-[#78350F] dark:text-[#FDE68A]">
          <strong className="font-semibold">DEMO ADMIN · </strong>
          DEMO MODE: Data is stored locally in this browser. Orders are not sent to the business.
        </div>
        <button
          type="button"
          onClick={onLockAdmin}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#78350F] dark:text-[#FDE68A] bg-white dark:bg-[#1B1A18] border border-[#E7C67E] dark:border-[#6B4E1B] hover:bg-[#FFFBEB] dark:hover:bg-[#23221F] rounded-md whitespace-nowrap shrink-0 cursor-pointer"
        >
          <LogOut className="w-3.5 h-3.5" />
          Exit Demo Admin
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-8 items-start">
        {/* Left Sidebar (240px on desktop) */}
        <aside className="w-full lg:w-60 shrink-0 bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-3">
          <div className="px-3 py-2 border-b border-[#ECEAE4] dark:border-[#262522] mb-2">
            <p className="text-xs font-semibold text-[#164E37] dark:text-[#5ED09E]">DEMO ADMIN</p>
            <p className="font-display text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0] truncate">
              {store.businessSettings.businessName}
            </p>
          </div>
          <nav aria-label="Demo Admin sections" className="space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const active = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                    active
                      ? 'bg-[#164E37] dark:bg-[#1B6345] text-white'
                      : 'text-[#44403C] dark:text-[#D6D3CD] hover:bg-[#F2F1ED] dark:hover:bg-[#23221F] hover:text-[#1C1917] dark:hover:text-[#F5F4F0]'
                  }`}
                >
                  <span className="inline-flex items-center gap-2.5 truncate">
                    <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.count !== undefined && (
                    <span
                      className={`font-mono text-xs tabular-nums ${
                        active ? 'text-white/85' : 'text-[#78716C] dark:text-[#A8A29E]'
                      }`}
                    >
                      {item.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Workspace Panel */}
        <main className="flex-1 min-w-0 w-full">
          {/* ================================================================ */}
          {/* TAB 1: ORDERS & MANUAL PAYMENT TRACKING */}
          {/* ================================================================ */}
          {activeTab === 'orders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                    Demo Orders &amp; Manual Payments
                  </h1>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                    Review demo orders, update statuses, record simulated deposits, and download
                    client-side PDFs.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={onSeedSampleOrders}
                    className="px-3.5 py-2 text-xs font-semibold text-[#164E37] dark:text-[#5ED09E] bg-white dark:bg-[#1B1A18] border border-[#164E37]/30 dark:border-[#5ED09E]/35 hover:border-[#164E37] dark:hover:border-[#5ED09E] rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    + Load Sample Demo Orders
                  </button>
                  <button
                    type="button"
                    onClick={onNavigateToOrderForm}
                    className="px-3.5 py-2 text-xs font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg whitespace-nowrap cursor-pointer"
                  >
                    + New Demo Order
                  </button>
                </div>
              </div>

              {/* 4-Column Summary Strip */}
              <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Filtered Orders</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                    {metrics.count}
                  </p>
                  <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5 tabular-nums">
                    {metrics.activeCount} active (excl. cancelled)
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Order Value</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                    {formatZAR(metrics.totalValue)}
                  </p>
                  <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5 tabular-nums">
                    50% Deposits: {formatZAR(metrics.totalDeposit)}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Simulated Payments</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#164E37] dark:text-[#5ED09E] tabular-nums">
                    {formatZAR(metrics.totalPaid)}
                  </p>
                  <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5">
                    Recorded manually in demo
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Outstanding Balance</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#92400E] dark:text-[#FCD34D] tabular-nums">
                    {formatZAR(metrics.totalOutstanding)}
                  </p>
                  <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5">
                    Remaining across active orders
                  </p>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-6 gap-3">
                <div className="sm:col-span-2 relative">
                  <Search
                    className="w-4 h-4 text-[#78716C] dark:text-[#A8A29E] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
                    aria-hidden="true"
                  />
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ref, customer, phone, platter..."
                    className={`w-full pl-9 pr-3 ${fieldClass}`}
                  />
                </div>
                <select
                  aria-label="Filter by order status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as OrderStatus | 'all')}
                  className={fieldClass}
                >
                  <option value="all">All Order Statuses</option>
                  {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <select
                  aria-label="Filter by payment status"
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value as PaymentStatus | 'all')}
                  className={fieldClass}
                >
                  <option value="all">All Payment Statuses</option>
                  {Object.entries(PAYMENT_STATUS_LABELS).map(([k, label]) => (
                    <option key={k} value={k}>
                      {label}
                    </option>
                  ))}
                </select>
                <input
                  type="date"
                  aria-label="Requested date from"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className={`${fieldClass} tabular-nums`}
                />
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    aria-label="Requested date to"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className={`w-full ${fieldClass} tabular-nums`}
                  />
                  {(searchQuery ||
                    statusFilter !== 'all' ||
                    paymentFilter !== 'all' ||
                    fulfilmentFilter !== 'all' ||
                    dateFrom ||
                    dateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchQuery('');
                        setStatusFilter('all');
                        setPaymentFilter('all');
                        setFulfilmentFilter('all');
                        setDateFrom('');
                        setDateTo('');
                      }}
                      className="text-xs font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline whitespace-nowrap cursor-pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {/* Fulfilment Segmented Filter */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="inline-flex p-1 bg-[#F2F1ED] dark:bg-[#1B1A18] rounded-lg border border-[#E5E2DC] dark:border-[#2D2B27]">
                  {(['all', 'collection', 'delivery'] as const).map((mode) => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setFulfilmentFilter(mode)}
                      className={`px-3 py-1.5 text-xs font-semibold rounded-md capitalize transition-colors cursor-pointer ${
                        fulfilmentFilter === mode
                          ? 'bg-white dark:bg-[#2A2824] text-[#1C1917] dark:text-[#F5F4F0] shadow-xs'
                          : 'text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0]'
                      }`}
                    >
                      {mode === 'all' ? 'All Fulfilment' : mode}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                  Click any order row to update status, record simulated payments, or download PDFs.
                </p>
              </div>

              {/* Orders Table or Empty State */}
              {filteredOrders.length === 0 ? (
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-10 text-center space-y-4">
                  <p className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                    {store.orders.length === 0
                      ? 'No Demo Orders Stored in This Browser Yet'
                      : 'No Demo Orders Match Your Filters'}
                  </p>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] max-w-md mx-auto">
                    {store.orders.length === 0
                      ? 'Submit a demonstration order through the storefront form, or load 2 clearly labelled sample demo orders to explore order management, simulated payment tracking, and PDF generation.'
                      : 'Adjust or clear your search, status, or date filters to view stored demo orders.'}
                  </p>
                  {store.orders.length === 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
                      <button
                        type="button"
                        onClick={onSeedSampleOrders}
                        className="px-4 py-2.5 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg cursor-pointer"
                      >
                        Load 2 Sample Demo Orders
                      </button>
                      <button
                        type="button"
                        onClick={onNavigateToOrderForm}
                        className="px-4 py-2.5 text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer"
                      >
                        Open Customer Order Form
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-[#FAFAF8] dark:bg-[#161614] border-b border-[#E5E2DC] dark:border-[#2D2B27] text-xs text-[#64605A] dark:text-[#A8A29E]">
                          <th className="py-3 px-3.5 font-semibold">Ref &amp; Customer</th>
                          <th className="py-3 px-3.5 font-semibold">Platters</th>
                          <th className="py-3 px-3.5 font-semibold">Fulfilment</th>
                          <th className="py-3 px-3.5 font-semibold text-right">Total / Deposit</th>
                          <th className="py-3 px-3.5 font-semibold text-right">Paid / Balance</th>
                          <th className="py-3 px-3.5 font-semibold">Status</th>
                          <th className="py-3 px-3.5 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#ECEAE4] dark:divide-[#262522]">
                        {filteredOrders.map((order) => {
                          const paid = getOrderPaidTotal(order.payments);
                          const balance = getOrderOutstandingBalance(order);
                          const isSelected = selectedOrderId === order.id;
                          return (
                            <tr
                              key={order.id}
                              onClick={() => setSelectedOrderId(order.id)}
                              className={`cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-[#164E37]/5 dark:bg-[#5ED09E]/10'
                                  : 'hover:bg-[#FAFAF8] dark:hover:bg-[#23221F]/60'
                              }`}
                            >
                              <td className="py-3 px-3.5 align-top">
                                <p className="font-mono text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                                  {order.reference}
                                </p>
                                <p className="font-medium text-[#1C1917] dark:text-[#F5F4F0] mt-0.5">
                                  {order.customer.fullName}
                                </p>
                                <p className="text-xs text-[#64605A] dark:text-[#A8A29E] font-mono">
                                  {order.customer.phone}
                                </p>
                              </td>
                              <td className="py-3 px-3.5 align-top text-xs text-[#44403C] dark:text-[#D6D3CD]">
                                {order.items.map((item) => (
                                  <div key={item.productId} className="whitespace-nowrap">
                                    <span className="font-mono font-semibold">
                                      {item.quantity}×
                                    </span>{' '}
                                    {item.name}
                                  </div>
                                ))}
                              </td>
                              <td className="py-3 px-3.5 align-top whitespace-nowrap">
                                <p className="font-medium text-[#1C1917] dark:text-[#F5F4F0] capitalize">
                                  {order.fulfilmentType}
                                </p>
                                <p className="text-xs text-[#57534E] dark:text-[#D6D3CD] tabular-nums">
                                  {formatShortDate(order.requestedDate)}
                                </p>
                                <p className="text-xs text-[#78716C] dark:text-[#A8A29E] font-mono tabular-nums">
                                  {order.requestedTime}
                                </p>
                              </td>
                              <td className="py-3 px-3.5 align-top text-right whitespace-nowrap font-mono tabular-nums">
                                <p className="font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                                  {formatZAR(order.totalAmount)}
                                </p>
                                <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                                  Dep: {formatZAR(order.depositRequired)}
                                </p>
                              </td>
                              <td className="py-3 px-3.5 align-top text-right whitespace-nowrap font-mono tabular-nums">
                                <p className="font-semibold text-[#164E37] dark:text-[#5ED09E]">
                                  {formatZAR(paid)}
                                </p>
                                <p
                                  className={`text-xs ${
                                    balance > 0
                                      ? 'text-[#92400E] dark:text-[#FCD34D]'
                                      : 'text-[#64605A] dark:text-[#A8A29E]'
                                  }`}
                                >
                                  Bal: {formatZAR(balance)}
                                </p>
                              </td>
                              <td className="py-3 px-3.5 align-top whitespace-nowrap text-xs">
                                <p className="font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                                  {ORDER_STATUS_LABELS[order.orderStatus]}
                                </p>
                                <p
                                  className={`mt-0.5 ${
                                    order.paymentStatus === 'paid_in_full' ||
                                    order.paymentStatus === 'deposit_paid'
                                      ? 'text-[#164E37] dark:text-[#5ED09E]'
                                      : order.paymentStatus === 'partial_deposit'
                                      ? 'text-[#92400E] dark:text-[#FCD34D]'
                                      : 'text-[#B91C1C] dark:text-[#FCA5A5]'
                                  }`}
                                >
                                  {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                                </p>
                              </td>
                              <td className="py-3 px-3.5 align-top text-right whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedOrderId(order.id);
                                  }}
                                  className="text-xs font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline cursor-pointer"
                                >
                                  Manage
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Selected Order Detail & Payment Tracking Panel */}
              {selectedOrder && (
                <div className="bg-white dark:bg-[#1B1A18] border border-[#164E37]/40 dark:border-[#5ED09E]/40 rounded-xl p-6 space-y-6">
                  <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#ECEAE4] dark:border-[#262522] pb-4">
                    <div>
                      <p className="text-xs font-mono text-[#64605A] dark:text-[#A8A29E]">
                        {selectedOrder.reference} · Created{' '}
                        {formatDateTimeZA(selectedOrder.createdAt)}
                      </p>
                      <h2 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0] mt-0.5">
                        {selectedOrder.customer.fullName}
                      </h2>
                      <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                        {selectedOrder.customer.phone} · {selectedOrder.customer.email}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          downloadOrderConfirmationPdf(selectedOrder, store.businessSettings)
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5" />
                        Confirmation PDF
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          downloadKitchenPrepPdf(
                            selectedOrder,
                            store.products,
                            store.businessSettings
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        Kitchen Prep PDF
                      </button>
                      <a
                        href={buildWhatsAppOrderUrl(selectedOrder, store.businessSettings)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg"
                      >
                        WhatsApp
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      <button
                        type="button"
                        onClick={() => setSelectedOrderId(null)}
                        aria-label="Close order inspector"
                        className="p-2 text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] rounded-lg cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Left: Order Details & Status Control */}
                    <div className="lg:col-span-6 space-y-5">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label
                            htmlFor="inspector-order-status"
                            className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                          >
                            Update Order Status
                          </label>
                          <select
                            id="inspector-order-status"
                            value={selectedOrder.orderStatus}
                            onChange={(e) =>
                              onUpdateOrderStatus(
                                selectedOrder.id,
                                e.target.value as OrderStatus
                              )
                            }
                            className={`w-full ${fieldClass}`}
                          >
                            {Object.entries(ORDER_STATUS_LABELS).map(([k, label]) => (
                              <option key={k} value={k}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                            Requested Fulfilment
                          </p>
                          <p className="text-sm text-[#1C1917] dark:text-[#F5F4F0] capitalize font-medium">
                            {selectedOrder.fulfilmentType} ·{' '}
                            {formatShortDate(selectedOrder.requestedDate)} at{' '}
                            {selectedOrder.requestedTime}
                          </p>
                          {selectedOrder.deliveryAddress && (
                            <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-1">
                              {[
                                selectedOrder.deliveryAddress.street,
                                selectedOrder.deliveryAddress.suburb,
                                selectedOrder.deliveryAddress.city,
                                selectedOrder.deliveryAddress.postalCode,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-2">
                          Ordered Items
                        </p>
                        <ul className="divide-y divide-[#ECEAE4] dark:divide-[#262522] border border-[#ECEAE4] dark:border-[#262522] rounded-lg text-sm">
                          {selectedOrder.items.map((item) => (
                            <li
                              key={item.productId}
                              className="px-3.5 py-2.5 flex justify-between gap-2 text-[#1C1917] dark:text-[#F5F4F0]"
                            >
                              <span>
                                <strong className="font-mono">{item.quantity}×</strong> {item.name}{' '}
                                <span className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                                  ({formatZAR(item.unitPrice)} ea)
                                </span>
                              </span>
                              <span className="font-mono font-semibold tabular-nums">
                                {formatZAR(item.lineTotal)}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {(selectedOrder.allergyNotes || selectedOrder.specialInstructions) && (
                        <div className="p-3.5 bg-[#FAFAF8] dark:bg-[#23221F] border border-[#ECEAE4] dark:border-[#3A3732] rounded-lg text-xs space-y-1">
                          {selectedOrder.allergyNotes && (
                            <p className="text-[#991B1B] dark:text-[#FCA5A5]">
                              <strong>Allergies:</strong> {selectedOrder.allergyNotes}
                            </p>
                          )}
                          {selectedOrder.specialInstructions && (
                            <p className="text-[#44403C] dark:text-[#D6D3CD]">
                              <strong>Instructions:</strong> {selectedOrder.specialInstructions}
                            </p>
                          )}
                        </div>
                      )}

                      <div>
                        <label
                          htmlFor="inspector-admin-notes"
                          className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                        >
                          Internal Demo Admin Notes
                        </label>
                        <textarea
                          id="inspector-admin-notes"
                          rows={2}
                          value={selectedOrder.adminNotes}
                          onChange={(e) =>
                            onUpdateOrderNotes(selectedOrder.id, e.target.value)
                          }
                          placeholder="Add internal preparation or payment follow-up notes..."
                          className={`w-full ${fieldClass}`}
                        />
                      </div>

                      <div className="pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteOrder(selectedOrder.id);
                            setSelectedOrderId(null);
                          }}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#B91C1C] dark:text-[#FCA5A5] hover:underline cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Delete This Demo Order
                        </button>
                      </div>
                    </div>

                    {/* Right: Simulated Manual Payment Tracking */}
                    <div className="lg:col-span-6 space-y-4 lg:border-l lg:border-[#ECEAE4] dark:lg:border-[#262522] lg:pl-6">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                          Simulated Manual Payments
                        </h3>
                        <span className="text-xs font-semibold text-[#164E37] dark:text-[#5ED09E]">
                          {PAYMENT_STATUS_LABELS[selectedOrder.paymentStatus]}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 p-3 bg-[#FAFAF8] dark:bg-[#23221F] border border-[#ECEAE4] dark:border-[#3A3732] rounded-lg text-xs">
                        <div>
                          <span className="text-[#64605A] dark:text-[#A8A29E]">Total</span>
                          <p className="font-mono font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums mt-0.5">
                            {formatZAR(selectedOrder.totalAmount)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#64605A] dark:text-[#A8A29E]">
                            {selectedOrder.depositPercentage}% Deposit
                          </span>
                          <p className="font-mono font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums mt-0.5">
                            {formatZAR(selectedOrder.depositRequired)}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#64605A] dark:text-[#A8A29E]">Recorded Paid</span>
                          <p className="font-mono font-semibold text-[#164E37] dark:text-[#5ED09E] tabular-nums mt-0.5">
                            {formatZAR(getOrderPaidTotal(selectedOrder.payments))}
                          </p>
                        </div>
                        <div>
                          <span className="text-[#64605A] dark:text-[#A8A29E]">Outstanding</span>
                          <p className="font-mono font-semibold text-[#92400E] dark:text-[#FCD34D] tabular-nums mt-0.5">
                            {formatZAR(getOrderOutstandingBalance(selectedOrder))}
                          </p>
                        </div>
                      </div>

                      {selectedOrder.payments.length > 0 ? (
                        <ul className="divide-y divide-[#ECEAE4] dark:divide-[#262522] border border-[#ECEAE4] dark:border-[#262522] rounded-lg text-xs">
                          {selectedOrder.payments.map((p) => (
                            <li
                              key={p.id}
                              className="px-3.5 py-2.5 flex items-center justify-between gap-2"
                            >
                              <div>
                                <p className="font-semibold text-[#1C1917] dark:text-[#F5F4F0] font-mono tabular-nums">
                                  {formatZAR(p.amount)} · {PAYMENT_METHOD_LABELS[p.method]}
                                </p>
                                <p className="text-[#64605A] dark:text-[#A8A29E]">
                                  {p.paidAt}
                                  {p.reference ? ` · Ref: ${p.reference}` : ''}
                                  {p.notes ? ` · ${p.notes}` : ''}
                                </p>
                              </div>
                              <button
                                type="button"
                                onClick={() => onDeletePayment(selectedOrder.id, p.id)}
                                aria-label="Remove simulated payment"
                                className="p-1 text-[#78716C] dark:text-[#A8A29E] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                          No simulated payments recorded yet for this demo order.
                        </p>
                      )}

                      <form
                        onSubmit={(e) => handleRecordPayment(e, selectedOrder)}
                        className="p-4 bg-[#FAFAF8] dark:bg-[#23221F] border border-[#ECEAE4] dark:border-[#3A3732] rounded-lg space-y-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                            Record Simulated Payment Entry
                          </p>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() =>
                                setPayAmount(selectedOrder.depositRequired.toFixed(2))
                              }
                              className="text-[11px] font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline cursor-pointer"
                            >
                              Fill 50% Deposit
                            </button>
                            <span className="text-[#D6D3CD] dark:text-[#3A3732]">·</span>
                            <button
                              type="button"
                              onClick={() =>
                                setPayAmount(
                                  getOrderOutstandingBalance(selectedOrder).toFixed(2)
                                )
                              }
                              className="text-[11px] font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline cursor-pointer"
                            >
                              Fill Balance
                            </button>
                          </div>
                        </div>

                        {payError && (
                          <p className="text-xs font-medium text-[#B91C1C] dark:text-[#FCA5A5]">
                            {payError}
                          </p>
                        )}

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[11px] font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                              Amount (ZAR) *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required
                              value={payAmount}
                              onChange={(e) => setPayAmount(e.target.value)}
                              placeholder="0.00"
                              className="w-full px-3 py-1.5 text-sm font-mono bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-md tabular-nums"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                              Method
                            </label>
                            <select
                              value={payMethod}
                              onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-md"
                            >
                              {Object.entries(PAYMENT_METHOD_LABELS).map(([k, label]) => (
                                <option key={k} value={k}>
                                  {label}
                                </option>
                              ))}
                            </select>
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                              Payment Reference
                            </label>
                            <input
                              type="text"
                              value={payRef}
                              onChange={(e) => setPayRef(e.target.value)}
                              placeholder="e.g. EFT-1042"
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-md"
                            />
                          </div>
                          <div>
                            <label className="block text-[11px] font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                              Payment Date
                            </label>
                            <input
                              type="date"
                              value={payDate}
                              onChange={(e) => setPayDate(e.target.value)}
                              className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-md tabular-nums"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-semibold text-[#57534E] dark:text-[#A8A29E] mb-1">
                            Notes (optional)
                          </label>
                          <input
                            type="text"
                            value={payNotes}
                            onChange={(e) => setPayNotes(e.target.value)}
                            placeholder="e.g. Proof of payment received via WhatsApp"
                            className="w-full px-3 py-1.5 text-sm bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-md"
                          />
                        </div>

                        <button
                          type="submit"
                          className="w-full py-2 px-4 text-xs font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors cursor-pointer"
                        >
                          Record Simulated Payment
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 2: PRODUCTS & MENU CMS */}
          {/* ================================================================ */}
          {activeTab === 'products' && (
            <AdminProductsTab
              products={store.products}
              onToggleAvailability={onToggleProductAvailability}
              onUpdateProduct={onUpdateProduct}
              onAddProduct={onAddProduct}
              onDeleteProduct={onDeleteProduct}
            />
          )}

          {/* ================================================================ */}
          {/* TAB 3: CUSTOM ENQUIRIES */}
          {/* ================================================================ */}
          {activeTab === 'enquiries' && (
            <div className="space-y-6">
              <div>
                <h2 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                  Larger Platters &amp; Custom Order Enquiries
                </h2>
                <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                  Custom &quot;Price on Request&quot; enquiries saved locally from the storefront.
                </p>
              </div>

              {store.customEnquiries.length === 0 ? (
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-10 text-center">
                  <p className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                    No Custom Order Enquiries Yet
                  </p>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-1">
                    When a visitor submits the &quot;Larger Platters &amp; Custom Orders&quot; form
                    on the storefront, it appears here.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {store.customEnquiries.map((enq) => (
                    <div
                      key={enq.id}
                      className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-5 space-y-3"
                    >
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-mono text-xs text-[#64605A] dark:text-[#A8A29E]">
                            {enq.reference} · {formatDateTimeZA(enq.createdAt)}
                          </p>
                          <h3 className="font-semibold text-[#1C1917] dark:text-[#F5F4F0] mt-0.5">
                            {enq.customerName} · {enq.phone}
                            {enq.email ? ` · ${enq.email}` : ''}
                          </h3>
                          <p className="text-xs text-[#57534E] dark:text-[#A8A29E] mt-0.5 capitalize">
                            {enq.fulfilmentType}
                            {enq.eventDate ? ` · Event Date: ${enq.eventDate}` : ''}
                            {enq.guestCount ? ` · Guests: ${enq.guestCount}` : ''}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <select
                            aria-label="Enquiry status"
                            value={enq.status}
                            onChange={(e) =>
                              onUpdateCustomEnquiry(enq.id, {
                                status: e.target.value as CustomEnquiryStatus,
                              })
                            }
                            className="px-2.5 py-1.5 text-xs bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-md"
                          >
                            <option value="new">New</option>
                            <option value="quoted">Quoted</option>
                            <option value="converted">Converted to Order</option>
                            <option value="closed">Closed</option>
                          </select>
                          <button
                            type="button"
                            onClick={() => onDeleteCustomEnquiry(enq.id)}
                            aria-label="Delete enquiry"
                            className="p-1.5 text-[#78716C] dark:text-[#A8A29E] hover:text-[#B91C1C] dark:hover:text-[#FCA5A5] cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-sm text-[#44403C] dark:text-[#D6D3CD] bg-[#FAFAF8] dark:bg-[#23221F] border border-[#ECEAE4] dark:border-[#3A3732] rounded-lg p-3">
                        {enq.details}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 4: REPORTS & EXPORTS */}
          {/* ================================================================ */}
          {activeTab === 'reports' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
                <div>
                  <h2 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                    Demo Business Reports &amp; Exports
                  </h2>
                  <p className="text-sm text-[#57534E] dark:text-[#A8A29E] mt-0.5">
                    Client-side summary figures calculated strictly from orders stored in this
                    browser.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      downloadBusinessReportPdf(
                        reportOrders,
                        store.products,
                        store.businessSettings,
                        reportFrom || reportTo
                          ? `Period: ${reportFrom || 'Start'} to ${reportTo || 'Present'}`
                          : 'All Local Demo Orders'
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Download Report PDF
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      triggerTextDownload(
                        `simply-plattered-demo-orders-${new Date()
                          .toISOString()
                          .slice(0, 10)}.csv`,
                        buildOrdersCsv(reportOrders),
                        'text/csv;charset=utf-8'
                      )
                    }
                    className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-white dark:bg-[#1B1A18] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    Export Orders CSV
                  </button>
                </div>
              </div>

              {/* Date Range Filter */}
              <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4 flex flex-wrap items-center gap-4 text-sm">
                <span className="text-xs font-semibold text-[#57534E] dark:text-[#A8A29E]">
                  Filter by Requested Date:
                </span>
                <input
                  type="date"
                  value={reportFrom}
                  onChange={(e) => setReportFrom(e.target.value)}
                  className={`${fieldClass} tabular-nums`}
                />
                <span className="text-xs text-[#64605A] dark:text-[#A8A29E]">to</span>
                <input
                  type="date"
                  value={reportTo}
                  onChange={(e) => setReportTo(e.target.value)}
                  className={`${fieldClass} tabular-nums`}
                />
                {(reportFrom || reportTo) && (
                  <button
                    type="button"
                    onClick={() => {
                      setReportFrom('');
                      setReportTo('');
                    }}
                    className="text-xs font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline cursor-pointer"
                  >
                    Reset Range
                  </button>
                )}
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Active Orders</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                    {reportMetrics.activeOrders}
                  </p>
                  <p className="text-xs text-[#78716C] dark:text-[#A8A29E] mt-0.5 tabular-nums">
                    {reportMetrics.collectionCount} Collection · {reportMetrics.deliveryCount}{' '}
                    Delivery
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Total Estimated Sales</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                    {formatZAR(reportMetrics.totalValue)}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                    Simulated Payments Collected
                  </p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#164E37] dark:text-[#5ED09E] tabular-nums">
                    {formatZAR(reportMetrics.totalPaid)}
                  </p>
                </div>
                <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-4">
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Outstanding Balance</p>
                  <p className="mt-1 font-mono text-2xl font-semibold text-[#92400E] dark:text-[#FCD34D] tabular-nums">
                    {formatZAR(reportMetrics.totalOutstanding)}
                  </p>
                </div>
              </div>

              {/* Platter Breakdown Table */}
              <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl overflow-hidden">
                <div className="px-5 py-3.5 border-b border-[#ECEAE4] dark:border-[#262522]">
                  <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                    Platter Breakdown (Active Demo Orders)
                  </h3>
                </div>
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr className="bg-[#FAFAF8] dark:bg-[#161614] border-b border-[#ECEAE4] dark:border-[#262522] text-xs text-[#64605A] dark:text-[#A8A29E]">
                      <th className="py-3 px-5 font-semibold">Platter</th>
                      <th className="py-3 px-5 font-semibold text-right">Units Ordered</th>
                      <th className="py-3 px-5 font-semibold text-right">Estimated Revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4] dark:divide-[#262522]">
                    {reportMetrics.platterRows.map((row) => (
                      <tr key={row.name}>
                        <td className="py-3 px-5 font-medium text-[#1C1917] dark:text-[#F5F4F0]">
                          {row.name}
                        </td>
                        <td className="py-3 px-5 font-mono text-right tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                          {row.qty}
                        </td>
                        <td className="py-3 px-5 font-mono text-right font-semibold tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                          {formatZAR(row.revenue)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* TAB 5: BUSINESS SETTINGS & DEMO STORAGE */}
          {/* ================================================================ */}
          {activeTab === 'settings' && (
            <AdminSettingsTab
              settings={store.businessSettings}
              demoConfig={store.demoConfig}
              orderCount={store.orders.length}
              productCount={store.products.length}
              onSaveSettings={onSaveSettings}
              onExportJson={onExportJson}
              onImportJson={onImportJson}
              onSeedSampleOrders={onSeedSampleOrders}
              onResetAllDemoData={onResetAllDemoData}
            />
          )}
        </main>
      </div>
    </div>
  );
}
