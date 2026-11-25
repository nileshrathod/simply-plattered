import {
  BusinessSettings,
  DemoOrder,
  DemoPayment,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '../types/simplyPlattered';

/** Formats a numeric amount in South African Rand, e.g. R199.00 */
export function formatZAR(amount: number): string {
  const safe = Number.isFinite(amount) ? amount : 0;
  return `R${safe.toLocaleString('en-ZA', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).replace(/\s/g, ',')}`;
}

/** Formats an ISO date string into readable South African date/time */
export function formatDateTimeZA(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Formats a YYYY-MM-DD date string cleanly */
export function formatShortDate(dateStr: string): string {
  if (!dateStr) return '—';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const d = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  if (Number.isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('en-ZA', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

/** Returns earliest valid fulfilment date (YYYY-MM-DD) and time (HH:mm) given minimum advance notice hours */
export function getEarliestFulfilmentDateTime(minNoticeHours: number): {
  minDate: string;
  minTime: string;
  earliestDateObj: Date;
} {
  const now = new Date();
  const earliest = new Date(now.getTime() + minNoticeHours * 60 * 60 * 1000);
  // Round up to next 30-minute mark for cleaner UX
  const minutes = earliest.getMinutes();
  const remainder = minutes % 30;
  if (remainder > 0) {
    earliest.setMinutes(minutes + (30 - remainder), 0, 0);
  } else {
    earliest.setSeconds(0, 0);
  }

  const yyyy = earliest.getFullYear();
  const mm = String(earliest.getMonth() + 1).padStart(2, '0');
  const dd = String(earliest.getDate()).padStart(2, '0');
  const hh = String(earliest.getHours()).padStart(2, '0');
  const min = String(earliest.getMinutes()).padStart(2, '0');

  return {
    minDate: `${yyyy}-${mm}-${dd}`,
    minTime: `${hh}:${min}`,
    earliestDateObj: earliest,
  };
}

/** Validates whether a chosen YYYY-MM-DD + HH:mm meets the minimum advance notice rule */
export function validateAdvanceNotice(
  dateStr: string,
  timeStr: string,
  minNoticeHours: number
): { valid: boolean; message?: string } {
  if (!dateStr || !timeStr) {
    return { valid: false, message: 'Please select both a requested date and time.' };
  }
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) {
    return { valid: false, message: 'Please enter a valid date and time.' };
  }

  const requested = new Date(y, m - 1, d, hh, mm, 0, 0);
  const minAllowed = new Date(Date.now() + minNoticeHours * 60 * 60 * 1000);

  if (requested.getTime() < minAllowed.getTime()) {
    const earliestFormatted = minAllowed.toLocaleString('en-ZA', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    });
    return {
      valid: false,
      message: `Simply Plattered requires at least ${minNoticeHours} hours' advance notice. Earliest available slot is ${earliestFormatted}.`,
    };
  }
  return { valid: true };
}

/** Calculates subtotal, delivery fee (if configured), total, and 50% deposit */
export function calculateOrderTotals(
  subtotal: number,
  fulfilmentType: 'collection' | 'delivery',
  settings: BusinessSettings
): {
  subtotal: number;
  deliveryFee: number | null;
  totalAmount: number;
  depositRequired: number;
} {
  const cleanSubtotal = Math.round(subtotal * 100) / 100;
  let deliveryFee: number | null = 0;

  if (fulfilmentType === 'delivery') {
    if (settings.deliveryFee === null || settings.deliveryFee === undefined) {
      deliveryFee = null;
    } else if (
      settings.freeDeliveryThreshold !== null &&
      settings.freeDeliveryThreshold > 0 &&
      cleanSubtotal >= settings.freeDeliveryThreshold
    ) {
      deliveryFee = 0;
    } else {
      deliveryFee = Math.round(settings.deliveryFee * 100) / 100;
    }
  } else {
    deliveryFee = 0;
  }

  const totalAmount = Math.round((cleanSubtotal + (deliveryFee ?? 0)) * 100) / 100;
  const depositRequired =
    Math.round(totalAmount * (settings.depositPercentage / 100) * 100) / 100;

  return {
    subtotal: cleanSubtotal,
    deliveryFee,
    totalAmount,
    depositRequired,
  };
}

/** Computes total simulated payments recorded against an order */
export function getOrderPaidTotal(payments: DemoPayment[]): number {
  const sum = payments.reduce((acc, p) => acc + (Number(p.amount) || 0), 0);
  return Math.round(sum * 100) / 100;
}

/** Computes outstanding balance for an order */
export function getOrderOutstandingBalance(order: DemoOrder): number {
  const paid = getOrderPaidTotal(order.payments);
  return Math.max(0, Math.round((order.totalAmount - paid) * 100) / 100);
}

/** Computes payment status strictly from recorded simulated payments */
export function computePaymentStatus(
  totalAmount: number,
  depositRequired: number,
  payments: DemoPayment[]
): PaymentStatus {
  const paid = getOrderPaidTotal(payments);
  if (paid <= 0) return 'unpaid';
  if (paid + 0.01 >= totalAmount && totalAmount > 0) return 'paid_in_full';
  if (paid + 0.01 >= depositRequired && depositRequired > 0) return 'deposit_paid';
  return 'partial_deposit';
}

/** Generates a readable unique demo order reference, e.g. SP-DEMO-20261124-4821 */
export function generateDemoOrderRef(prefix = 'SP-DEMO'): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${y}${m}${d}-${rand}`;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending_review: 'Pending Review',
  awaiting_deposit: 'Awaiting Deposit',
  confirmed: 'Confirmed',
  in_preparation: 'In Preparation',
  ready: 'Ready',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Unpaid',
  partial_deposit: 'Partial Deposit',
  deposit_paid: 'Deposit Paid (50%+)',
  paid_in_full: 'Paid in Full',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  eft: 'EFT / Bank Transfer',
  instant_eft: 'Instant EFT',
  cash: 'Cash',
  other: 'Other Manual Payment',
};

/** Builds a WhatsApp link with a pre-filled demo order summary */
export function buildWhatsAppOrderUrl(
  order: DemoOrder,
  settings: BusinessSettings
): string {
  const lines = [
    `Hello ${settings.businessName},`,
    `I created a platter order summary (${order.reference}):`,
    '',
    ...order.items.map(
      (i) => `- ${i.quantity}x ${i.name} (${formatZAR(i.lineTotal)})`
    ),
    '',
    `Fulfilment: ${order.fulfilmentType === 'delivery' ? 'Delivery' : 'Collection'}`,
    `Requested Date: ${formatShortDate(order.requestedDate)} at ${order.requestedTime}`,
    order.fulfilmentType === 'delivery' && order.deliveryAddress
      ? `Delivery Address: ${order.deliveryAddress.street}, ${order.deliveryAddress.suburb}, ${order.deliveryAddress.city} ${order.deliveryAddress.postalCode}`
      : null,
    `Estimated Total: ${formatZAR(order.totalAmount)}${
      order.fulfilmentType === 'delivery' && order.deliveryFee === null
        ? ' (excl. delivery fee to be confirmed)'
        : ''
    }`,
    `${order.depositPercentage}% Deposit Required: ${formatZAR(order.depositRequired)}`,
    order.allergyNotes ? `Allergies: ${order.allergyNotes}` : null,
    order.specialInstructions ? `Notes: ${order.specialInstructions}` : null,
    '',
    `Customer: ${order.customer.fullName} (${order.customer.phone})`,
  ].filter(Boolean);

  return `https://wa.me/${settings.whatsappDigits}?text=${encodeURIComponent(
    lines.join('\n')
  )}`;
}

/** Builds a WhatsApp link for a custom platter / larger order enquiry */
export function buildWhatsAppCustomEnquiryUrl(
  params: {
    customerName: string;
    eventDate: string;
    guestCount: string;
    fulfilmentType: 'collection' | 'delivery';
    details: string;
  },
  settings: BusinessSettings
): string {
  const lines = [
    `Hello ${settings.businessName},`,
    `I would like to request a quote for a Larger Platter / Custom Order:`,
    params.customerName ? `Name: ${params.customerName}` : null,
    params.eventDate ? `Event Date: ${params.eventDate}` : null,
    params.guestCount ? `Approx. Guests: ${params.guestCount}` : null,
    `Fulfilment: ${params.fulfilmentType === 'delivery' ? 'Delivery' : 'Collection'}`,
    params.details ? `Details: ${params.details}` : null,
  ].filter(Boolean);

  return `https://wa.me/${settings.whatsappDigits}?text=${encodeURIComponent(
    lines.join('\n')
  )}`;
}
