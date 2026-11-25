import { FormEvent, useState } from 'react';
import {
  ArrowRight,
  Check,
  Download,
  ExternalLink,
  Maximize2,
  Minus,
  Plus,
  X,
} from 'lucide-react';
import {
  BusinessSettings,
  CustomOrderEnquiry,
  DemoOrder,
  FulfilmentType,
  PlatterProduct,
} from '../types/simplyPlattered';
import {
  buildWhatsAppCustomEnquiryUrl,
  formatShortDate,
  formatZAR,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '../lib/formatters';
import { downloadOrderConfirmationPdf } from '../lib/pdfGenerator';
import { PlatterImage, POSTER_IMAGE_PATH } from './PlatterImage';

interface StorefrontViewProps {
  products: PlatterProduct[];
  orders: DemoOrder[];
  settings: BusinessSettings;
  bag: Record<string, number>;
  onUpdateBagQuantity: (productId: string, delta: number) => void;
  onStartOrder: (preselectProductId?: string) => void;
  onOpenAdmin: () => void;
  onSubmitCustomEnquiry: (
    input: Omit<CustomOrderEnquiry, 'id' | 'reference' | 'createdAt' | 'status' | 'adminNotes'>
  ) => CustomOrderEnquiry;
}

export function StorefrontView({
  products,
  orders,
  settings,
  bag,
  onUpdateBagQuantity,
  onStartOrder,
  onOpenAdmin,
  onSubmitCustomEnquiry,
}: StorefrontViewProps) {
  const [posterModalOpen, setPosterModalOpen] = useState(false);

  // Custom order enquiry state
  const [enqName, setEnqName] = useState('');
  const [enqPhone, setEnqPhone] = useState('');
  const [enqEmail, setEnqEmail] = useState('');
  const [enqDate, setEnqDate] = useState('');
  const [enqGuests, setEnqGuests] = useState('');
  const [enqFulfilment, setEnqFulfilment] = useState<FulfilmentType>('collection');
  const [enqDetails, setEnqDetails] = useState('');
  const [submittedEnquiry, setSubmittedEnquiry] = useState<CustomOrderEnquiry | null>(null);
  const [enqError, setEnqError] = useState('');

  const sortedProducts = [...products].sort((a, b) => a.sortOrder - b.sortOrder);
  const totalBagCount = Object.values(bag).reduce((s, q) => s + q, 0);
  const totalBagAmount = sortedProducts.reduce(
    (sum, p) => sum + (bag[p.id] || 0) * p.price,
    0
  );

  const handleEnquirySubmit = (e: FormEvent) => {
    e.preventDefault();
    setEnqError('');
    if (!enqName.trim() || !enqPhone.trim() || !enqDetails.trim()) {
      setEnqError('Please enter your name, phone number, and custom platter requirements.');
      return;
    }

    const created = onSubmitCustomEnquiry({
      customerName: enqName.trim(),
      phone: enqPhone.trim(),
      email: enqEmail.trim(),
      eventDate: enqDate,
      guestCount: enqGuests.trim(),
      fulfilmentType: enqFulfilment,
      details: enqDetails.trim(),
    });
    setSubmittedEnquiry(created);
    setEnqName('');
    setEnqPhone('');
    setEnqEmail('');
    setEnqDate('');
    setEnqGuests('');
    setEnqDetails('');
  };

  return (
    <div className="w-full">
      {/* Section 1: Storefront Hero */}
      <section className="w-full border-b border-[#E5E2DC] dark:border-[#2D2B27] bg-[#FAFAF8] dark:bg-[#111110]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 lg:py-16">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-12 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center">
              <p className="text-xs font-medium text-[#64605A] dark:text-[#A8A29E] mb-4">
                South African Festive Catering · Collection &amp; Delivery · Interactive Client Demo
              </p>
              <h1
                className="font-display font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F4F0] text-balance leading-[1.08]"
                style={{ fontSize: 'clamp(2.25rem, 4.2vw, 3.65rem)' }}
              >
                {settings.tagline}
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#57534E] dark:text-[#D6D3CD] leading-relaxed max-w-xl">
                Handcrafted savoury and braai platters prepared fresh to order for Christmas tables,
                family gatherings, and year-end celebrations. Browse our confirmed menu below or
                build a demonstration order with instant 50% deposit calculation and PDF confirmation.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-4">
                <a
                  href="#platters"
                  className="inline-flex items-center gap-2 px-6 py-3 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  Explore Festive Platters
                  <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </a>
                <a
                  href={`https://wa.me/${settings.whatsappDigits}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-5 py-3 text-sm font-semibold text-[#1C1917] dark:text-[#F5F4F0] bg-white dark:bg-[#1B1A18] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[44px]"
                >
                  WhatsApp {settings.whatsappDisplay}
                  <ExternalLink
                    className="w-4 h-4 text-[#64605A] dark:text-[#A8A29E]"
                    aria-hidden="true"
                  />
                </a>
              </div>

              {/* Confirmed Ordering Essentials Strip */}
              <div className="mt-10 pt-6 border-t border-[#E5E2DC] dark:border-[#2D2B27] grid grid-cols-1 sm:grid-cols-3 gap-6">
                <div>
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Advance Notice</p>
                  <p className="mt-1 text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                    {settings.minNoticeHours} Hours Minimum
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Deposit Policy</p>
                  <p className="mt-1 text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums">
                    {settings.depositPercentage}% Deposit Required
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">Fulfilment</p>
                  <p className="mt-1 text-base font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                    Collection &amp; Delivery
                  </p>
                </div>
              </div>
            </div>

            {/* Right visual anchor: Official Supplied Festive Platter Poster */}
            <div className="lg:col-span-5 flex flex-col">
              <div className="relative h-full min-h-[340px] rounded-xl overflow-hidden border border-[#E5E2DC] dark:border-[#2D2B27] bg-[#1A1410] flex flex-col justify-between">
                <div className="relative flex-1 overflow-hidden">
                  <img
                    src={POSTER_IMAGE_PATH}
                    alt="Simply Plattered Festive Platters menu poster showing Classic Savoury Platter, The Festive Feast, and Traditional Braai & Bites"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover object-center"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/45 to-transparent p-5 flex items-end justify-between gap-4">
                    <div>
                      <p className="text-xs text-white/80">Official Menu Poster</p>
                      <p className="font-display text-lg font-semibold text-white">
                        Festive Platters Collection
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPosterModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#1C1917] bg-white hover:bg-[#F5F4F0] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Maximize2 className="w-3.5 h-3.5" aria-hidden="true" />
                      View Full Poster
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Featured Festive Platters Grid */}
      <section id="platters" className="w-full py-16 lg:py-20 bg-[#FAFAF8] dark:bg-[#111110]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-8 border-b border-[#E5E2DC] dark:border-[#2D2B27]">
            <div>
              <p className="text-xs font-medium text-[#164E37] dark:text-[#5ED09E]">
                Festive Menu · South African Rand (ZAR)
              </p>
              <h2 className="mt-1.5 font-display text-3xl sm:text-4xl font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F4F0] text-balance">
                Festive Platters
              </h2>
            </div>
            <p className="text-sm text-[#57534E] dark:text-[#A8A29E] max-w-md">
              Select quantities below to build your demonstration order. Prices and availability
              update live from the Demo Admin dashboard.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {sortedProducts.map((product) => {
              const qtyInBag = bag[product.id] || 0;
              return (
                <article
                  key={product.id}
                  className={`group flex flex-col bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl overflow-hidden transition-transform duration-200 hover:-translate-y-0.5 ${
                    !product.available ? 'opacity-75' : ''
                  }`}
                >
                  <PlatterImage product={product} />

                  <div className="flex flex-col flex-1 p-6">
                    {/* Unboxed clean metadata */}
                    <div className="flex items-center justify-between gap-2 text-xs text-[#64605A] dark:text-[#A8A29E]">
                      <span>
                        {product.servesText} · {product.items.length} items
                      </span>
                      <span
                        className={
                          product.available
                            ? 'text-[#164E37] dark:text-[#5ED09E] font-medium'
                            : 'text-[#B91C1C] dark:text-[#FCA5A5] font-medium'
                        }
                      >
                        {product.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="mt-2 flex items-baseline justify-between gap-4">
                      <h3 className="font-display text-xl font-semibold text-[#1C1917] dark:text-[#F5F4F0] leading-snug">
                        {product.name}
                      </h3>
                      <p className="font-mono text-lg font-semibold text-[#164E37] dark:text-[#5ED09E] tabular-nums whitespace-nowrap shrink-0">
                        {formatZAR(product.price)}
                      </p>
                    </div>

                    {product.description && (
                      <p className="mt-2 text-sm text-[#57534E] dark:text-[#D6D3CD] leading-relaxed">
                        {product.description}
                      </p>
                    )}

                    {/* Exact Platter Items from Poster */}
                    <div className="mt-5 pt-4 border-t border-[#ECEAE4] dark:border-[#262522] flex-1">
                      <p className="text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-2.5">
                        Included on this platter
                      </p>
                      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-[#44403C] dark:text-[#D6D3CD]">
                        {product.items.map((item, idx) => (
                          <li key={`${product.id}-item-${idx}`} className="flex items-start gap-1.5">
                            <span
                              className="text-[#A17428] dark:text-[#E7C67E] select-none"
                              aria-hidden="true"
                            >
                              ·
                            </span>
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Controls */}
                    <div className="mt-6 pt-4 border-t border-[#ECEAE4] dark:border-[#262522]">
                      {!product.available ? (
                        <button
                          type="button"
                          disabled
                          className="w-full py-2.5 px-4 text-sm font-medium text-[#78716C] dark:text-[#A8A29E] bg-[#F2F1ED] dark:bg-[#23221F] rounded-lg cursor-not-allowed"
                        >
                          Currently Unavailable
                        </button>
                      ) : qtyInBag > 0 ? (
                        <div className="flex items-center justify-between gap-3">
                          <div className="inline-flex items-center border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg bg-[#FAFAF8] dark:bg-[#23221F]">
                            <button
                              type="button"
                              onClick={() => onUpdateBagQuantity(product.id, -1)}
                              aria-label={`Decrease quantity of ${product.name}`}
                              className="w-10 h-10 inline-flex items-center justify-center text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#ECEAE4] dark:hover:bg-[#2D2B27] rounded-l-lg cursor-pointer"
                            >
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center font-mono text-sm font-semibold tabular-nums text-[#1C1917] dark:text-[#F5F4F0]">
                              {qtyInBag}
                            </span>
                            <button
                              type="button"
                              onClick={() => onUpdateBagQuantity(product.id, 1)}
                              aria-label={`Increase quantity of ${product.name}`}
                              className="w-10 h-10 inline-flex items-center justify-center text-[#1C1917] dark:text-[#F5F4F0] hover:bg-[#ECEAE4] dark:hover:bg-[#2D2B27] rounded-r-lg cursor-pointer"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                          <button
                            type="button"
                            onClick={() => onStartOrder()}
                            className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[40px]"
                          >
                            Review Order
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => onUpdateBagQuantity(product.id, 1)}
                            className="flex-1 py-2.5 px-4 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[42px]"
                          >
                            Add to Demo Order
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>

          {/* Inline Bag Summary Strip when items selected */}
          {totalBagCount > 0 && (
            <div className="mt-10 p-5 bg-[#164E37] dark:bg-[#1B6345] text-white rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <p className="text-xs text-white/80">
                  Selected for Demo Order · {settings.depositPercentage}% Deposit:{' '}
                  <span className="font-mono font-semibold text-white tabular-nums">
                    {formatZAR(totalBagAmount * (settings.depositPercentage / 100))}
                  </span>
                </p>
                <p className="mt-0.5 font-display text-xl font-semibold tabular-nums">
                  {totalBagCount} {totalBagCount === 1 ? 'Platter' : 'Platters'} ·{' '}
                  {formatZAR(totalBagAmount)}
                </p>
              </div>
              <button
                type="button"
                onClick={() => onStartOrder()}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold text-[#164E37] bg-white hover:bg-[#F5F4F0] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer min-h-[44px]"
              >
                Continue to Demo Order Form
                <ArrowRight className="w-4 h-4" aria-hidden="true" />
              </button>
            </div>
          )}
        </div>
      </section>

      {/* Section 3: Larger Platters & Custom Orders + Confirmed Business Info */}
      <section
        id="custom-orders"
        className="w-full py-16 lg:py-20 bg-[#F2F1ED] dark:bg-[#161614] border-t border-[#E5E2DC] dark:border-[#2D2B27]"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Left: Larger Platters & Confirmed Business Details */}
            <div className="lg:col-span-5 space-y-8">
              <div>
                <p className="text-xs font-medium text-[#164E37] dark:text-[#5ED09E]">
                  Price on Request · Bespoke Catering
                </p>
                <h2 className="mt-1.5 font-display text-3xl font-semibold tracking-tight text-[#1C1917] dark:text-[#F5F4F0] text-balance">
                  Larger Platters &amp; Custom Orders
                </h2>
                <p className="mt-3 text-sm sm:text-base text-[#57534E] dark:text-[#D6D3CD] leading-relaxed">
                  Hosting a larger Christmas gathering, office celebration, or family function?
                  Larger platter sizes and custom assortments are quoted individually on request.
                </p>
              </div>

              <div className="space-y-4 pt-6 border-t border-[#DDD9D0] dark:border-[#2D2B27]">
                <h3 className="font-display text-lg font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                  Ordering Policy &amp; Business Details
                </h3>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                    <dt className="text-[#64605A] dark:text-[#A8A29E]">WhatsApp Orders</dt>
                    <dd className="font-mono font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right">
                      <a
                        href={`https://wa.me/${settings.whatsappDigits}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#164E37] dark:text-[#5ED09E] hover:underline"
                      >
                        {settings.whatsappDisplay} ({settings.whatsappInternational})
                      </a>
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                    <dt className="text-[#64605A] dark:text-[#A8A29E]">Advance Notice</dt>
                    <dd className="font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right">
                      Minimum {settings.minNoticeHours} hours
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                    <dt className="text-[#64605A] dark:text-[#A8A29E]">Deposit Policy</dt>
                    <dd className="font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right">
                      {settings.depositPercentage}% deposit required (manual tracking)
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                    <dt className="text-[#64605A] dark:text-[#A8A29E]">Delivery Charges</dt>
                    <dd className="font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right tabular-nums">
                      {settings.deliveryFee !== null
                        ? formatZAR(settings.deliveryFee)
                        : 'To be configured by owner'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                    <dt className="text-[#64605A] dark:text-[#A8A29E]">Business Email</dt>
                    <dd className="font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right">
                      {settings.businessEmail || 'Not configured yet'}
                    </dd>
                  </div>
                  <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                    <dt className="text-[#64605A] dark:text-[#A8A29E]">Business Hours</dt>
                    <dd className="font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right">
                      {settings.businessHours || 'To be configured by owner'}
                    </dd>
                  </div>
                  {settings.businessAddress && (
                    <div className="flex justify-between gap-4 py-2 border-b border-[#E5E2DC] dark:border-[#262522]">
                      <dt className="text-[#64605A] dark:text-[#A8A29E]">Collection Address</dt>
                      <dd className="font-medium text-[#1C1917] dark:text-[#F5F4F0] text-right">
                        {settings.businessAddress}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>

            {/* Right: Interactive Custom Order Enquiry Form (saved to localStorage) */}
            <div className="lg:col-span-7 bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl p-6 sm:p-8">
              <h3 className="font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                Request a Custom Platter Quote (Demo)
              </h3>
              <p className="mt-1.5 text-sm text-[#57534E] dark:text-[#A8A29E]">
                Submit a demonstration custom enquiry saved locally to this browser, or send your
                enquiry directly via WhatsApp.
              </p>

              {submittedEnquiry ? (
                <div className="mt-6 p-6 bg-[#FAFAF8] dark:bg-[#23221F] border border-[#E5E2DC] dark:border-[#3A3732] rounded-lg space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-[#164E37]/10 dark:bg-[#5ED09E]/15 text-[#164E37] dark:text-[#5ED09E] flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                        Demo Custom Enquiry Saved Locally
                      </p>
                      <p className="text-xs font-mono text-[#64605A] dark:text-[#A8A29E] mt-0.5">
                        Reference: {submittedEnquiry.reference}
                      </p>
                      <p className="text-sm text-[#57534E] dark:text-[#D6D3CD] mt-2">
                        This demonstration enquiry is stored only in this browser and has not been
                        sent to Simply Plattered. You can review it inside the Demo Admin dashboard.
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <a
                      href={buildWhatsAppCustomEnquiryUrl(submittedEnquiry, settings)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors"
                    >
                      Send via WhatsApp
                      <ExternalLink className="w-4 h-4" />
                    </a>
                    <button
                      type="button"
                      onClick={() => setSubmittedEnquiry(null)}
                      className="px-4 py-2.5 text-sm font-medium text-[#1C1917] dark:text-[#F5F4F0] bg-white dark:bg-[#1B1A18] border border-[#D6D3CD] dark:border-[#3A3732] hover:border-[#1C1917] dark:hover:border-[#A8A29E] rounded-lg cursor-pointer"
                    >
                      Submit Another Enquiry
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleEnquirySubmit} className="mt-6 space-y-4">
                  {enqError && (
                    <div
                      role="alert"
                      className="p-3 text-sm text-[#991B1B] dark:text-[#FCA5A5] bg-[#FEF2F2] dark:bg-[#2C1414] border border-[#FECACA] dark:border-[#7F1D1D] rounded-lg"
                    >
                      {enqError}
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="enq-name"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        Full Name *
                      </label>
                      <input
                        id="enq-name"
                        type="text"
                        required
                        value={enqName}
                        onChange={(e) => setEnqName(e.target.value)}
                        placeholder="Your full name"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="enq-phone"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        Phone / WhatsApp Number *
                      </label>
                      <input
                        id="enq-phone"
                        type="tel"
                        required
                        value={enqPhone}
                        onChange={(e) => setEnqPhone(e.target.value)}
                        placeholder="e.g. 082 123 4567"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label
                        htmlFor="enq-email"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        Email Address
                      </label>
                      <input
                        id="enq-email"
                        type="email"
                        value={enqEmail}
                        onChange={(e) => setEnqEmail(e.target.value)}
                        placeholder="name@example.co.za"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="enq-date"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        Preferred Date
                      </label>
                      <input
                        id="enq-date"
                        type="date"
                        value={enqDate}
                        onChange={(e) => setEnqDate(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]"
                      />
                    </div>
                    <div>
                      <label
                        htmlFor="enq-guests"
                        className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                      >
                        Estimated Guests
                      </label>
                      <input
                        id="enq-guests"
                        type="text"
                        value={enqGuests}
                        onChange={(e) => setEnqGuests(e.target.value)}
                        placeholder="e.g. 20–30 guests"
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]"
                      />
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5">
                      Fulfilment Preference
                    </span>
                    <div className="inline-flex p-1 bg-[#F2F1ED] dark:bg-[#23221F] rounded-lg border border-[#E5E2DC] dark:border-[#3A3732]">
                      <button
                        type="button"
                        onClick={() => setEnqFulfilment('collection')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          enqFulfilment === 'collection'
                            ? 'bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] shadow-xs'
                            : 'text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0]'
                        }`}
                      >
                        Collection
                      </button>
                      <button
                        type="button"
                        onClick={() => setEnqFulfilment('delivery')}
                        className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                          enqFulfilment === 'delivery'
                            ? 'bg-white dark:bg-[#1B1A18] text-[#1C1917] dark:text-[#F5F4F0] shadow-xs'
                            : 'text-[#64605A] dark:text-[#A8A29E] hover:text-[#1C1917] dark:hover:text-[#F5F4F0]'
                        }`}
                      >
                        Delivery
                      </button>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="enq-details"
                      className="block text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] mb-1.5"
                    >
                      Platter Size, Items &amp; Dietary Notes *
                    </label>
                    <textarea
                      id="enq-details"
                      rows={3}
                      required
                      value={enqDetails}
                      onChange={(e) => setEnqDetails(e.target.value)}
                      placeholder="Describe the larger platters, preferred items, or dietary requirements for your occasion..."
                      className="w-full px-3.5 py-2.5 text-sm bg-[#FAFAF8] dark:bg-[#23221F] text-[#1C1917] dark:text-[#F5F4F0] placeholder:text-[#78716C] border border-[#D6D3CD] dark:border-[#3A3732] rounded-lg focus:bg-white dark:focus:bg-[#1B1A18] focus:border-[#164E37] dark:focus:border-[#5ED09E]"
                    />
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                    <p className="text-xs text-[#64605A] dark:text-[#A8A29E]">
                      Saved locally in this browser for demo review.
                    </p>
                    <button
                      type="submit"
                      className="px-5 py-2.5 text-sm font-semibold text-white bg-[#164E37] hover:bg-[#113D2B] dark:bg-[#1B6345] dark:hover:bg-[#227A55] rounded-lg transition-colors whitespace-nowrap cursor-pointer min-h-[42px]"
                    >
                      Save Demo Quote Request
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Section 4: Recent Demo Orders Saved in This Browser */}
      {orders.length > 0 && (
        <section className="w-full py-14 bg-[#FAFAF8] dark:bg-[#111110] border-t border-[#E5E2DC] dark:border-[#2D2B27]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-6">
              <div>
                <p className="text-xs font-medium text-[#64605A] dark:text-[#A8A29E]">
                  Local Browser Storage · {orders.length}{' '}
                  {orders.length === 1 ? 'Order' : 'Orders'}
                </p>
                <h2 className="mt-1 font-display text-2xl font-semibold text-[#1C1917] dark:text-[#F5F4F0]">
                  Your Recent Demo Orders
                </h2>
              </div>
              <button
                type="button"
                onClick={onOpenAdmin}
                className="text-sm font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline whitespace-nowrap cursor-pointer"
              >
                Manage All Orders in Demo Admin
              </button>
            </div>

            <div className="overflow-x-auto bg-white dark:bg-[#1B1A18] border border-[#E5E2DC] dark:border-[#2D2B27] rounded-xl">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E5E2DC] dark:border-[#2D2B27] text-xs text-[#64605A] dark:text-[#A8A29E] bg-[#FAFAF8] dark:bg-[#161614]">
                    <th className="py-3 px-4 font-semibold">Demo Ref</th>
                    <th className="py-3 px-4 font-semibold">Customer</th>
                    <th className="py-3 px-4 font-semibold">Requested</th>
                    <th className="py-3 px-4 font-semibold text-right">Total</th>
                    <th className="py-3 px-4 font-semibold text-right">50% Deposit</th>
                    <th className="py-3 px-4 font-semibold">Status</th>
                    <th className="py-3 px-4 font-semibold text-right">PDF</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ECEAE4] dark:divide-[#262522]">
                  {orders.slice(0, 5).map((order) => (
                    <tr
                      key={order.id}
                      className="hover:bg-[#FAFAF8] dark:hover:bg-[#23221F]/60"
                    >
                      <td className="py-3 px-4 font-mono text-xs font-semibold text-[#1C1917] dark:text-[#F5F4F0] whitespace-nowrap">
                        {order.reference}
                      </td>
                      <td className="py-3 px-4 text-[#1C1917] dark:text-[#F5F4F0] whitespace-nowrap">
                        {order.customer.fullName}
                      </td>
                      <td className="py-3 px-4 text-[#57534E] dark:text-[#D6D3CD] whitespace-nowrap tabular-nums">
                        {formatShortDate(order.requestedDate)} · {order.requestedTime}
                      </td>
                      <td className="py-3 px-4 font-mono text-right font-semibold text-[#1C1917] dark:text-[#F5F4F0] tabular-nums whitespace-nowrap">
                        {formatZAR(order.totalAmount)}
                      </td>
                      <td className="py-3 px-4 font-mono text-right text-[#57534E] dark:text-[#A8A29E] tabular-nums whitespace-nowrap">
                        {formatZAR(order.depositRequired)}
                      </td>
                      <td className="py-3 px-4 text-xs text-[#57534E] dark:text-[#D6D3CD] whitespace-nowrap">
                        {ORDER_STATUS_LABELS[order.orderStatus]} ·{' '}
                        {PAYMENT_STATUS_LABELS[order.paymentStatus]}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => downloadOrderConfirmationPdf(order, settings)}
                          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#164E37] dark:text-[#5ED09E] hover:underline cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Confirmation PDF
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <footer className="w-full bg-[#1C1917] dark:bg-[#0A0A09] text-[#D6D3CD] border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div>
            <p className="font-display text-xl font-semibold text-white">
              {settings.businessName}
            </p>
            <p className="mt-1 text-sm text-[#A8A29E]">{settings.tagline}</p>
            <p className="mt-3 text-xs text-[#A8A29E]">
              WhatsApp: {settings.whatsappDisplay} ({settings.whatsappInternational}) · South
              Africa · {settings.minNoticeHours}h Advance Notice · {settings.depositPercentage}%
              Deposit Required
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-6 text-sm">
            <button
              type="button"
              onClick={() => onStartOrder()}
              className="text-white hover:text-[#E7C67E] transition-colors cursor-pointer"
            >
              Demo Order Form
            </button>
            <button
              type="button"
              onClick={onOpenAdmin}
              className="text-white hover:text-[#E7C67E] transition-colors cursor-pointer"
            >
              Demo Admin Dashboard
            </button>
            <a
              href={`https://wa.me/${settings.whatsappDigits}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#E7C67E] hover:text-white transition-colors"
            >
              WhatsApp Us
            </a>
          </div>
        </div>
        <div className="border-t border-white/10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#A8A29E]">
            <span>Client Demonstration Build — Database-free browser storage mode.</span>
            <span>All demo orders stay on this device only.</span>
          </div>
        </div>
      </footer>

      {/* Poster Lightbox Modal */}
      {posterModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Simply Plattered Festive Platters Poster"
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPosterModalOpen(false)}
        >
          <div
            className="relative max-w-2xl w-full bg-[#1C1917] rounded-xl overflow-hidden border border-white/15"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="text-sm font-medium text-white">
                Simply Plattered — Supplied Festive Platters Poster
              </p>
              <button
                type="button"
                onClick={() => setPosterModalOpen(false)}
                aria-label="Close poster view"
                className="w-8 h-8 inline-flex items-center justify-center rounded-md text-white/80 hover:text-white hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="max-h-[80vh] overflow-auto bg-black flex items-center justify-center">
              <img
                src={POSTER_IMAGE_PATH}
                alt="Simply Plattered Festive Platters full poster"
                referrerPolicy="no-referrer"
                className="w-full h-auto object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
