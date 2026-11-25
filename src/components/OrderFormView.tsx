import { FormEvent, useMemo, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Download,
  ExternalLink,
  Minus,
  Plus,
} from 'lucide-react';
import {
  BusinessSettings,
  DemoOrder,
  FulfilmentType,
  PlatterProduct,
} from '../types/simplyPlattered';
import {
  buildWhatsAppOrderUrl,
  calculateOrderTotals,
  formatDateTimeZA,
  formatShortDate,
  formatZAR,
  getEarliestFulfilmentDateTime,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  validateAdvanceNotice,
} from '../lib/formatters';
import { CreateDemoOrderInput } from '../lib/demoStorage';
import { downloadOrderConfirmationPdf } from '../lib/pdfGenerator';

interface OrderFormViewProps {
  products: PlatterProduct[];
  settings: BusinessSettings;
  bag: Record<string, number>;
  onUpdateBagQuantity: (productId: string, delta: number) => void;
  onClearBag: () => void;
  onSubmitOrder: (input: CreateDemoOrderInput) => DemoOrder;
  onBackToStorefront: () => void;
  onOpenAdmin: () => void;
}

export function OrderFormView({
  products,
  settings,
  bag,
  onUpdateBagQuantity,
  onClearBag,
  onSubmitOrder,
  onBackToStorefront,
  onOpenAdmin,
}: OrderFormViewProps) {
  const earliest = useMemo(
    () => getEarliestFulfilmentDateTime(settings.minNoticeHours),
    [settings.minNoticeHours]
  );

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [fulfilmentType, setFulfilmentType] = useState<FulfilmentType>('collection');
  const [requestedDate, setRequestedDate] = useState(earliest.minDate);
  const [requestedTime, setRequestedTime] = useState('12:00');
  const [street, setStreet] = useState('');
  const [suburb, setSuburb] = useState('');
  const [city, setCity] = useState('');
  const [postalCode, setPostalCode] = useState('');
  const [deliveryNotes, setDeliveryNotes] = useState('');
  const [allergyNotes, setAllergyNotes] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [submittedOrder, setSubmittedOrder] = useState<DemoOrder | null>(null);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.sortOrder - b.sortOrder),
    [products]
  );

  const selectedItems = useMemo(
    () =>
      sortedProducts
        .filter((p) => p.available && (bag[p.id] || 0) > 0)
        .map((product) => ({
          product,
          quantity: bag[product.id] || 0,
        })),
    [sortedProducts, bag]
  );

  const subtotal = useMemo(
    () => selectedItems.reduce((sum, entry) => sum + entry.product.price * entry.quantity, 0),
    [selectedItems]
  );

  const totals = useMemo(
    () => calculateOrderTotals(subtotal, fulfilmentType, settings),
    [subtotal, fulfilmentType, settings]
  );

  const noticeValidation = useMemo(
    () => validateAdvanceNotice(requestedDate, requestedTime, settings.minNoticeHours),
    [requestedDate, requestedTime, settings.minNoticeHours]
  );

  const handleSetEarliestSlot = () => {
    const fresh = getEarliestFulfilmentDateTime(settings.minNoticeHours);
    setRequestedDate(fresh.minDate);
    setRequestedTime(fresh.minTime);
  };

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage('');

    if (selectedItems.length === 0) {
      setErrorMessage('Please select at least one available platter to place a demo order.');
      return;
    }

    if (!fullName.trim() || !phone.trim() || !email.trim()) {
      setErrorMessage('Please complete your full name, phone number, and email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    const check = validateAdvanceNotice(requestedDate, requestedTime, settings.minNoticeHours);
    if (!check.valid) {
      setErrorMessage(check.message || 'Requested date/time does not meet the advance notice rule.');
      return;
    }

    if (fulfilmentType === 'delivery') {
      if (!street.trim() || !suburb.trim() || !city.trim()) {
        setErrorMessage('Please provide your street address, suburb, and city for delivery.');
        return;
      }
    }

    const created = onSubmitOrder({
      customer: {
        fullName,
        phone,
        email,
      },
      items: selectedItems,
      fulfilmentType,
      requestedDate,
      requestedTime,
      deliveryAddress:
        fulfilmentType === 'delivery'
          ? { street, suburb, city, postalCode, notes: deliveryNotes }
          : null,
      specialInstructions,
      allergyNotes,
    });

    onClearBag();
    setSubmittedOrder(created);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const inputClass =
    'w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]';

  // ============================================================================
  // POST-SUBMISSION CONFIRMATION SCREEN
  // ============================================================================
  if (submittedOrder) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl overflow-hidden">
          <div className="bg-[#164E37] dark:bg-[#1B6345] text-white px-6 sm:px-8 py-6">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-[#E7C67E] shrink-0" />
              <div>
                <p className="text-xs text-white/80">Local Browser Demonstration</p>
                <h1 className="font-display text-2xl sm:text-3xl font-semibold">
                  Demo Order Saved Locally
                </h1>
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-8">
            <div
              role="status"
              className="p-4 bg-[#FEF7E7] dark:bg-[#2B2212] border border-[#E7C67E] dark:border-[#6B4E1B] rounded-lg text-sm text-[#78350F] dark:text-[#FDE68A] space-y-1.5"
            >
              <p className="font-semibold">
                Important: This order has NOT been sent to {settings.businessName}.
              </p>
              <p>
                This website is running in database-free demonstration mode. Your demo order has
                been saved only in this browser&apos;s local storage. Its status is{' '}
                <strong>{ORDER_STATUS_LABELS[submittedOrder.orderStatus]}</strong> and payment
                status is <strong>{PAYMENT_STATUS_LABELS[submittedOrder.paymentStatus]}</strong>{' '}
                (deposits are never marked paid automatically).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 py-4 border-y border-[#ECEAE4] dark:border-[#262522]">
              <div>
                <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Demo Order Reference</p>
                <p className="mt-1 font-mono text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                  {submittedOrder.reference}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Submitted</p>
                <p className="mt-1 text-sm text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                  {formatDateTimeZA(submittedOrder.createdAt)}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Order Status</p>
                <p className="mt-1 text-sm font-semibold text-[#92400E] dark:text-[#FCD34D]">
                  {ORDER_STATUS_LABELS[submittedOrder.orderStatus]}
                </p>
              </div>
              <div>
                <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Payment Status</p>
                <p className="mt-1 text-sm font-semibold text-[#991B1B] dark:text-[#FCA5A5]">
                  {PAYMENT_STATUS_LABELS[submittedOrder.paymentStatus]}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-sm">
              <div>
                <h2 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-3">
                  Customer Details
                </h2>
                <dl className="space-y-1.5 text-[#44403C] dark:text-[#D6D3CD]">
                  <div>
                    <dt className="inline text-[#64605A] dark:text-[#A8A29E]">Name: </dt>
                    <dd className="inline font-medium text-[#1C1917] dark:text-[#F5F4F0]">
                      {submittedOrder.customer.fullName}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-[#64605A] dark:text-[#A8A29E]">Phone: </dt>
                    <dd className="inline font-mono text-[#1C1917] dark:text-[#F5F4F0]">
                      {submittedOrder.customer.phone}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-[#64605A] dark:text-[#A8A29E]">Email: </dt>
                    <dd className="inline text-[#1C1917] dark:text-[#F5F4F0]">
                      {submittedOrder.customer.email}
                    </dd>
                  </div>
                </dl>
              </div>

              <div>
                <h2 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-3">
                  Fulfilment Details
                </h2>
                <dl className="space-y-1.5 text-[#44403C] dark:text-[#D6D3CD]">
                  <div>
                    <dt className="inline text-[#64605A] dark:text-[#A8A29E]">Method: </dt>
                    <dd className="inline font-medium text-[#1C1917] dark:text-[#F5F4F0] capitalize">
                      {submittedOrder.fulfilmentType}
                    </dd>
                  </div>
                  <div>
                    <dt className="inline text-[#64605A] dark:text-[#A8A29E]">Requested Slot: </dt>
                    <dd className="inline font-medium text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                      {formatShortDate(submittedOrder.requestedDate)} at{' '}
                      {submittedOrder.requestedTime}
                    </dd>
                  </div>
                  {submittedOrder.fulfilmentType === 'delivery' &&
                    submittedOrder.deliveryAddress && (
                      <div>
                        <dt className="inline text-[#64605A] dark:text-[#A8A29E]">
                          Delivery Address:{' '}
                        </dt>
                        <dd className="inline text-[#1C1917] dark:text-[#F5F4F0]">
                          {[
                            submittedOrder.deliveryAddress.street,
                            submittedOrder.deliveryAddress.suburb,
                            submittedOrder.deliveryAddress.city,
                            submittedOrder.deliveryAddress.postalCode,
                          ]
                            .filter(Boolean)
                            .join(', ')}
                        </dd>
                      </div>
                    )}
                </dl>
              </div>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-3">
                Ordered Platters
              </h2>
              <div className="border border-[#ECEAE4] dark:border-[#262522] rounded-lg overflow-hidden">
                <table className="w-full text-sm text-left border-collapse">
                  <thead>
                    <tr className="bg-[#FAFAF8] dark:bg-[#161614] border-b border-[#ECEAE4] dark:border-[#262522] text-xs text-[#64605A] dark:text-[#A8A29E]">
                      <th className="py-2.5 px-4 font-semibold">Platter</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Qty</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Unit Price</th>
                      <th className="py-2.5 px-4 font-semibold text-right">Line Total</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ECEAE4] dark:divide-[#262522]">
                    {submittedOrder.items.map((item) => (
                      <tr key={item.productId}>
                        <td className="py-3 px-4">
                          <p className="font-medium text-[#1C1917] dark:text-[#F5F4F0]">
                            {item.name}
                          </p>
                          <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                            {item.servesText}
                          </p>
                        </td>
                        <td className="py-3 px-4 font-mono text-right tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-4 font-mono text-right tabular-nums text-[#57534E] dark:text-[#A8A29E]">
                          {formatZAR(item.unitPrice)}
                        </td>
                        <td className="py-3 px-4 font-mono text-right font-semibold tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                          {formatZAR(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 ml-auto max-w-sm space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[#64605A] dark:text-[#A8A29E]">Platter Subtotal</span>
                  <span className="font-mono tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                    {formatZAR(submittedOrder.subtotal)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#64605A] dark:text-[#A8A29E]">Delivery Fee</span>
                  <span className="font-mono tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                    {submittedOrder.fulfilmentType === 'collection'
                      ? 'R0.00'
                      : submittedOrder.deliveryFee === null
                      ? 'To be confirmed'
                      : formatZAR(submittedOrder.deliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-[#ECEAE4] dark:border-[#262522] font-semibold text-base text-[#1C1917] dark:text-[#F5F4F0]">
                  <span>Estimated Total</span>
                  <span className="font-mono tabular-nums">
                    {formatZAR(submittedOrder.totalAmount)}
                  </span>
                </div>
                <div className="flex justify-between p-3 bg-[#F2F1ED] dark:bg-[#23221F] rounded-lg font-semibold text-[#164E37] dark:text-[#5ED09E]">
                  <span>{submittedOrder.depositPercentage}% Deposit Required</span>
                  <span className="font-mono tabular-nums">
                    {formatZAR(submittedOrder.depositRequired)}
                  </span>
                </div>
              </div>
            </div>

            {(submittedOrder.allergyNotes || submittedOrder.specialInstructions) && (
              <div className="p-4 bg-[#FAFAF8] dark:bg-[#23221F] border border-[#ECEAE4] dark:border-[#3A3732] rounded-lg text-sm space-y-1.5 text-[#1C1917] dark:text-[#F5F4F0]">
                {submittedOrder.allergyNotes && (
                  <p>
                    <strong className="text-[#991B1B] dark:text-[#FCA5A5]">Allergy Notes:</strong>{' '}
                    {submittedOrder.allergyNotes}
                  </p>
                )}
                {submittedOrder.specialInstructions && (
                  <p>
                    <strong>Special Instructions:</strong> {submittedOrder.specialInstructions}
                  </p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-[#ECEAE4] dark:border-[#262522]">
              <button
                type="button"
                onClick={() => downloadOrderConfirmationPdf(submittedOrder, settings)}
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
              >
                <Download className="w-4 h-4" />
                Download Order Confirmation PDF
              </button>

              <a
                href={buildWhatsAppOrderUrl(submittedOrder, settings)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-white dark:bg-[#23221F] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg transition-colors whitespace-nowrap min-h-[44px]"
              >
                Send Summary via WhatsApp
                <ExternalLink className="w-4 h-4 text-[#64605A] dark:text-[#A8A29E]" />
              </a>

              <button
                type="button"
                onClick={onOpenAdmin}
                className="inline-flex items-center gap-2 px-4 py-3 text-sm font-semibold text-[#164E37] dark:text-[#5ED09E] hover:bg-[#164E37]/5 dark:hover:bg-[#5ED09E]/10 rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[44px]"
              >
                View Order in Demo Admin
              </button>

              <button
                type="button"
                onClick={() => {
                  setSubmittedOrder(null);
                  setFullName('');
                  setPhone('');
                  setEmail('');
                  setAllergyNotes('');
                  setSpecialInstructions('');
                }}
                className="ml-auto text-sm font-medium text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] cursor-pointer"
              >
                Start Another Demo Order
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // INTERACTIVE DEMO ORDER FORM
  // ============================================================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 lg:py-14">
      <div className="mb-8">
        <button
          type="button"
          onClick={onBackToStorefront}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[#57534E] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0] mb-4 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Platter Menu
        </button>
        <h1 className="font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F4F0]">
          Demo Online Order Form
        </h1>
        <p className="mt-2 text-sm sm:text-base text-[#57534E] dark:text-[#A8A29E] max-w-2xl">
          Build a demonstration order below. Your order is saved locally in this browser so you can
          download a PDF confirmation and manage it inside the Demo Admin dashboard.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Form Steps */}
        <div className="lg:col-span-8 space-y-8">
          {errorMessage && (
            <div
              role="alert"
              className="p-4 bg-[#FEF2F2] dark:bg-[#2C1414] border border-[#FECACA] dark:border-[#7F1D1D] rounded-xl flex items-start gap-3 text-sm text-[#991B1B] dark:text-[#FCA5A5]"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{errorMessage}</p>
            </div>
          )}

          {/* Step 1: Select Platters */}
          <section className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6">
            <h2 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
              1. Select Platters &amp; Quantities
            </h2>
            <p className="mt-1 text-xs text-[#64605A] dark:text-[#A8A29E]">
              Choose one or more platters. All prices are in South African Rand (ZAR).
            </p>

            <div className="mt-5 divide-y divide-[#ECEAE4] dark:divide-[#262522]">
              {sortedProducts.map((product) => {
                const qty = bag[product.id] || 0;
                return (
                  <div
                    key={product.id}
                    className={`py-4 first:pt-0 last:pb-0 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                      !product.available ? 'opacity-60' : ''
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-baseline gap-2">
                        <h3 className="font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                          {product.name}
                        </h3>
                        <span className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                          · {product.servesText}
                        </span>
                        {!product.available && (
                          <span className="text-xs font-medium text-[#B91C1C] dark:text-[#FCA5A5]">
                            · Currently Unavailable
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-[#57534E] dark:text-[#A8A29E] line-clamp-2">
                        {product.items.join(', ')}
                      </p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 shrink-0">
                      <span className="font-mono text-sm font-semibold text-[#164E37] dark:text-[#5ED09E] tabular-nums">
                        {formatZAR(product.price)}
                      </span>
                      {product.available ? (
                        <div className="inline-flex items-center border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg bg-[#FAFAF8] dark:bg-[#23221F]">
                          <button
                            type="button"
                            onClick={() => onUpdateBagQuantity(product.id, -1)}
                            disabled={qty === 0}
                            aria-label={`Remove one ${product.name}`}
                            className="w-9 h-9 inline-flex items-center justify-center text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#ECEAE4] dark:hover:bg-[#2D2B27] disabled:opacity-40 rounded-l-lg cursor-pointer"
                          >
                            <Minus className="w-4 h-4" />
                          </button>
                          <span className="w-9 text-center font-mono text-sm font-semibold tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                            {qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateBagQuantity(product.id, 1)}
                            aria-label={`Add one ${product.name}`}
                            className="w-9 h-9 inline-flex items-center justify-center text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#ECEAE4] dark:hover:bg-[#2D2B27] rounded-r-lg cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[#78716C] dark:text-[#A8A29E] px-3 py-1.5 bg-[#F2F1ED] dark:bg-[#23221F] rounded-md">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Step 2: Customer Details */}
          <section className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6">
            <h2 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
              2. Customer Contact Details
            </h2>
            <p className="mt-1 text-xs text-[#64605A] dark:text-[#A8A29E]">
              Stored locally in your browser to populate the demo confirmation PDF and Demo Admin
              order view.
            </p>

            <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label
                  htmlFor="order-fullname"
                  className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                >
                  Full Name *
                </label>
                <input
                  id="order-fullname"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter customer full name"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="order-phone"
                  className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                >
                  Phone / WhatsApp Number *
                </label>
                <input
                  id="order-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 082 123 4567"
                  className={inputClass}
                />
              </div>
              <div>
                <label
                  htmlFor="order-email"
                  className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                >
                  Email Address *
                </label>
                <input
                  id="order-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="customer@example.co.za"
                  className={inputClass}
                />
              </div>
            </div>
          </section>

          {/* Step 3: Fulfilment & 48-Hour Notice Date/Time */}
          <section className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 space-y-5">
            <div>
              <h2 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                3. Fulfilment, Date &amp; Time
              </h2>
              <p className="mt-1 text-xs text-[#64605A] dark:text-[#A8A29E]">
                Minimum {settings.minNoticeHours} hours&apos; advance notice is required for all
                platter orders.
              </p>
            </div>

            <div>
              <span className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-2">
                Fulfilment Method
              </span>
              <div className="grid grid-cols-2 gap-3 max-w-md">
                <button
                  type="button"
                  onClick={() => setFulfilmentType('collection')}
                  className={`p-3.5 text-left rounded-lg border transition-colors cursor-pointer ${
                    fulfilmentType === 'collection'
                      ? 'border-[#164E37] dark:border-[#5ED09E] bg-[#164E37]/5 dark:bg-[#5ED09E]/10 text-[#1C1917] dark:text-[#F5F4F0]'
                      : 'border-[#D6D3CD] dark:border-[#3A3732] bg-[#FAFAF8] dark:bg-[#23221F] text-[#57534E] dark:text-[#A8A29E] hover:border-[#A8A29E]'
                  }`}
                >
                  <p className="text-sm font-semibold">Collection</p>
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E] mt-0.5">
                    No delivery fee
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setFulfilmentType('delivery')}
                  className={`p-3.5 text-left rounded-lg border transition-colors cursor-pointer ${
                    fulfilmentType === 'delivery'
                      ? 'border-[#164E37] dark:border-[#5ED09E] bg-[#164E37]/5 dark:bg-[#5ED09E]/10 text-[#1C1917] dark:text-[#F5F4F0]'
                      : 'border-[#D6D3CD] dark:border-[#3A3732] bg-[#FAFAF8] dark:bg-[#23221F] text-[#57534E] dark:text-[#A8A29E] hover:border-[#A8A29E]'
                  }`}
                >
                  <p className="text-sm font-semibold">Delivery</p>
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E] mt-0.5 tabular-nums">
                    {settings.deliveryFee !== null
                      ? formatZAR(settings.deliveryFee)
                      : 'Fee confirmed by owner'}
                  </p>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="order-date"
                  className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                >
                  Requested Date *
                </label>
                <input
                  id="order-date"
                  type="date"
                  required
                  min={earliest.minDate}
                  value={requestedDate}
                  onChange={(e) => setRequestedDate(e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
              <div>
                <label
                  htmlFor="order-time"
                  className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                >
                  Requested Time *
                </label>
                <input
                  id="order-time"
                  type="time"
                  required
                  value={requestedTime}
                  onChange={(e) => setRequestedTime(e.target.value)}
                  className={`${inputClass} tabular-nums`}
                />
              </div>
            </div>

            {!noticeValidation.valid && (
              <div className="p-3.5 bg-[#FEF7E7] dark:bg-[#2B2212] border border-[#E7C67E] dark:border-[#6B4E1B] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#78350F] dark:text-[#FDE68A]">
                <span>{noticeValidation.message}</span>
                <button
                  type="button"
                  onClick={handleSetEarliestSlot}
                  className="px-3 py-1.5 font-semibold bg-white dark:bg-[#1B1A18] text-[#78350F] dark:text-[#FDE68A] border border-[#D97706]/40 dark:border-[#6B4E1B] rounded-md hover:bg-[#FFFBEB] dark:hover:bg-[#23221F] whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Use Earliest Valid Slot
                </button>
              </div>
            )}

            {fulfilmentType === 'delivery' && (
              <div className="pt-4 border-t border-[#ECEAE4] dark:border-[#262522] space-y-4">
                <p className="text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                  Delivery Address
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="del-street"
                      className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                    >
                      Street Address &amp; Complex / Unit *
                    </label>
                    <input
                      id="del-street"
                      type="text"
                      required={fulfilmentType === 'delivery'}
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      placeholder="Street number, street name, unit"
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="del-suburb"
                      className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                    >
                      Suburb *
                    </label>
                    <input
                      id="del-suburb"
                      type="text"
                      required={fulfilmentType === 'delivery'}
                      value={suburb}
                      onChange={(e) => setSuburb(e.target.value)}
                      placeholder="Suburb"
                      className={inputClass}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label
                        htmlFor="del-city"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        City *
                      </label>
                      <input
                        id="del-city"
                        type="text"
                        required={fulfilmentType === 'delivery'}
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="City"
                        className={inputClass}
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="del-postal"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        Postal Code
                      </label>
                      <input
                        id="del-postal"
                        type="text"
                        value={postalCode}
                        onChange={(e) => setPostalCode(e.target.value)}
                        placeholder="e.g. 2196"
                        className={inputClass}
                      />
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <label
                      htmlFor="del-notes"
                      className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                    >
                      Gate Code or Delivery Directions (Optional)
                    </label>
                    <input
                      id="del-notes"
                      type="text"
                      value={deliveryNotes}
                      onChange={(e) => setDeliveryNotes(e.target.value)}
                      placeholder="Security gate instructions, landmarks, etc."
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </section>

          {/* Step 4: Special Instructions & Allergies */}
          <section className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 space-y-4">
            <h2 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
              4. Allergy Notes &amp; Special Instructions
            </h2>
            <div>
              <label
                htmlFor="order-allergies"
                className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
              >
                Allergies or Dietary Restrictions (Optional)
              </label>
              <textarea
                id="order-allergies"
                rows={2}
                value={allergyNotes}
                onChange={(e) => setAllergyNotes(e.target.value)}
                placeholder="List any nut, dairy, gluten, or other food allergies..."
                className={inputClass}
              />
            </div>
            <div>
              <label
                htmlFor="order-instructions"
                className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
              >
                Special Instructions (Optional)
              </label>
              <textarea
                id="order-instructions"
                rows={2}
                value={specialInstructions}
                onChange={(e) => setSpecialInstructions(e.target.value)}
                placeholder="Occasion notes, sauce preferences, or timing details..."
                className={inputClass}
              />
            </div>
          </section>
        </div>

        {/* Right Sticky Order Review Panel */}
        <aside className="lg:col-span-4 lg:sticky lg:top-24">
          <div className="bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 space-y-5">
            <h2 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
              Demo Order Summary
            </h2>

            {selectedItems.length === 0 ? (
              <p className="text-sm text-[#64605A] dark:text-[#A8A29E] py-4 border-y border-[#ECEAE4] dark:border-[#262522]">
                No platters selected yet. Add quantities on the left to calculate your order total
                and {settings.depositPercentage}% deposit.
              </p>
            ) : (
              <ul className="divide-y divide-[#ECEAE4] dark:divide-[#262522] border-y border-[#ECEAE4] dark:border-[#262522]">
                {selectedItems.map(({ product, quantity }) => (
                  <li
                    key={product.id}
                    className="py-3 flex items-start justify-between gap-3 text-sm"
                  >
                    <div>
                      <p className="font-medium text-[#1C1917] dark:text-[#F5F4F0]">
                        {quantity} × {product.name}
                      </p>
                      <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                        {formatZAR(product.price)} each · {product.servesText}
                      </p>
                    </div>
                    <span className="font-mono font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums whitespace-nowrap">
                      {formatZAR(product.price * quantity)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between">
                <span className="text-[#64605A] dark:text-[#A8A29E]">Platter Subtotal</span>
                <span className="font-mono tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                  {formatZAR(totals.subtotal)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64605A] dark:text-[#A8A29E]">
                  {fulfilmentType === 'delivery' ? 'Delivery Fee' : 'Collection'}
                </span>
                <span className="font-mono tabular-nums text-right text-[#1C1917] dark:text-[#F5F4F0]">
                  {fulfilmentType === 'collection'
                    ? 'R0.00'
                    : totals.deliveryFee === null
                    ? 'TBC by owner'
                    : formatZAR(totals.deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between pt-2.5 border-t border-[#ECEAE4] dark:border-[#262522] text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                <span>Estimated Total</span>
                <span className="font-mono tabular-nums">{formatZAR(totals.totalAmount)}</span>
              </div>
              <div className="flex justify-between p-3.5 bg-[#F2F1ED] dark:bg-[#23221F] rounded-lg font-semibold text-[#164E37] dark:text-[#5ED09E]">
                <span>{settings.depositPercentage}% Deposit Required</span>
                <span className="font-mono tabular-nums">
                  {formatZAR(totals.depositRequired)}
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-[#FEF7E7] dark:bg-[#2B2212] border border-[#E7C67E]/80 dark:border-[#6B4E1B] rounded-lg text-xs text-[#78350F] dark:text-[#FDE68A] leading-relaxed">
              <strong>Demo Mode:</strong> Submitting saves this order locally in your browser with
              status <em>Pending Review</em> and <em>Unpaid</em>. It does not notify Simply
              Plattered or charge any payment.
            </div>

            <button
              type="submit"
              disabled={selectedItems.length === 0 || !noticeValidation.valid}
              className="w-full py-3 px-4 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] disabled:bg-[#A8A29E] dark:disabled:bg-[#3A3732] dark:disabled:text-[#78716C] disabled:cursor-not-allowed rounded-lg transition-colors cursor-pointer min-h-[44px]"
            >
              Submit Demonstration Order
            </button>
          </div>
        </aside>
      </form>
    </div>
  );
}
