import { jsPDF } from 'jspdf';
import {
  BusinessSettings,
  DemoOrder,
  PlatterProduct,
} from '../types/simplyPlattered';
import {
  formatDateTimeZA,
  formatShortDate,
  formatZAR,
  getOrderOutstandingBalance,
  getOrderPaidTotal,
  ORDER_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from './formatters';

const BRAND_GREEN: [number, number, number] = [22, 78, 55];
const BRAND_GOLD: [number, number, number] = [161, 116, 40];
const INK_DARK: [number, number, number] = [28, 25, 23];
const INK_MUTED: [number, number, number] = [100, 96, 90];
const SURFACE_TINT: [number, number, number] = [245, 244, 240];
const BORDER_LIGHT: [number, number, number] = [224, 220, 212];
const ALERT_BG: [number, number, number] = [254, 247, 231];
const ALERT_TEXT: [number, number, number] = [146, 64, 14];

function drawPageHeader(
  doc: jsPDF,
  title: string,
  subtitle: string,
  settings: BusinessSettings
): number {
  const pageWidth = doc.internal.pageSize.getWidth();

  // Top dark evergreen bar
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(0, 0, pageWidth, 26, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('times', 'bold');
  doc.setFontSize(18);
  doc.text(settings.businessName, 14, 12);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(230, 238, 234);
  doc.text(settings.tagline, 14, 18.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(255, 255, 255);
  doc.text(title, pageWidth - 14, 11.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(230, 238, 234);
  doc.text(subtitle, pageWidth - 14, 18.5, { align: 'right' });

  // Prominent Demo Notice banner
  doc.setFillColor(...ALERT_BG);
  doc.setDrawColor(...BRAND_GOLD);
  doc.setLineWidth(0.3);
  doc.rect(14, 31, pageWidth - 28, 9, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...ALERT_TEXT);
  doc.text(
    'DEMO MODE DOCUMENT — Saved locally in this browser only. Orders are NOT transmitted to Simply Plattered.',
    pageWidth / 2,
    36.8,
    { align: 'center' }
  );

  return 47;
}

function drawFooter(doc: jsPDF, settings: BusinessSettings) {
  const pageCount = doc.getNumberOfPages();
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.setLineWidth(0.25);
    doc.line(14, pageHeight - 16, pageWidth - 14, pageHeight - 16);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...INK_MUTED);
    const contactBits = [
      settings.businessName,
      `WhatsApp: ${settings.whatsappDisplay} (${settings.whatsappInternational})`,
      settings.businessEmail ? `Email: ${settings.businessEmail}` : null,
      settings.businessAddress ? settings.businessAddress : null,
    ]
      .filter(Boolean)
      .join('  |  ');

    doc.text(contactBits, 14, pageHeight - 10.5);
    doc.text(
      `Page ${i} of ${pageCount} · Local Demo PDF`,
      pageWidth - 14,
      pageHeight - 10.5,
      { align: 'right' }
    );
  }
}

function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  const pageHeight = doc.internal.pageSize.getHeight();
  if (y + needed > pageHeight - 24) {
    doc.addPage();
    return 18;
  }
  return y;
}

/** 1. Customer Order Confirmation PDF (Client-side) */
export function downloadOrderConfirmationPdf(
  order: DemoOrder,
  settings: BusinessSettings
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawPageHeader(
    doc,
    'DEMO ORDER CONFIRMATION',
    `Ref: ${order.reference}`,
    settings
  );

  // Meta Summary Strip
  doc.setFillColor(...SURFACE_TINT);
  doc.setDrawColor(...BORDER_LIGHT);
  doc.rect(14, y, pageWidth - 28, 19, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...INK_MUTED);
  doc.text('DEMO REFERENCE', 18, y + 5.5);
  doc.text('CREATED', 72, y + 5.5);
  doc.text('ORDER STATUS', 122, y + 5.5);
  doc.text('PAYMENT STATUS', 162, y + 5.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...INK_DARK);
  doc.text(order.reference, 18, y + 12.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(formatDateTimeZA(order.createdAt), 72, y + 12.5);
  doc.text(ORDER_STATUS_LABELS[order.orderStatus], 122, y + 12.5);
  doc.text(PAYMENT_STATUS_LABELS[order.paymentStatus], 162, y + 12.5);

  y += 26;

  // Two-column Customer & Fulfilment Details
  const colW = (pageWidth - 34) / 2;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND_GREEN);
  doc.text('Customer Details', 14, y);
  doc.text('Fulfilment Details', 14 + colW + 6, y);

  y += 2.5;
  doc.setDrawColor(...BORDER_LIGHT);
  doc.line(14, y, 14 + colW, y);
  doc.line(14 + colW + 6, y, pageWidth - 14, y);
  y += 5.5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK_DARK);

  const leftLines = [
    `Name: ${order.customer.fullName}`,
    `Phone: ${order.customer.phone}`,
    `Email: ${order.customer.email}`,
  ];
  leftLines.forEach((line, idx) => {
    doc.text(line, 14, y + idx * 5.2);
  });

  const rightLines = [
    `Method: ${order.fulfilmentType === 'delivery' ? 'Delivery' : 'Collection'}`,
    `Requested: ${formatShortDate(order.requestedDate)} at ${order.requestedTime}`,
    `Notice Policy: Minimum ${settings.minNoticeHours} hours' advance notice`,
  ];
  if (order.fulfilmentType === 'delivery' && order.deliveryAddress) {
    const addr = [
      order.deliveryAddress.street,
      order.deliveryAddress.suburb,
      order.deliveryAddress.city,
      order.deliveryAddress.postalCode,
    ]
      .filter(Boolean)
      .join(', ');
    rightLines.push(`Address: ${addr}`);
    if (order.deliveryAddress.notes) {
      rightLines.push(`Delivery Notes: ${order.deliveryAddress.notes}`);
    }
  } else if (settings.businessAddress) {
    rightLines.push(`Collection Address: ${settings.businessAddress}`);
  } else {
    rightLines.push('Collection Address: Confirmed directly via WhatsApp');
  }

  let rightY = y;
  rightLines.forEach((line) => {
    const wrapped = doc.splitTextToSize(line, colW);
    doc.text(wrapped, 14 + colW + 6, rightY);
    rightY += wrapped.length * 4.8;
  });

  y = Math.max(y + leftLines.length * 5.2, rightY) + 8;

  // Ordered Platters Table
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(...BRAND_GREEN);
  doc.text('Ordered Platters', 14, y);
  y += 4;

  // Table header
  doc.setFillColor(...BRAND_GREEN);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Platter', 17, y + 5.4);
  doc.text('Serves', 98, y + 5.4);
  doc.text('Qty', 132, y + 5.4, { align: 'right' });
  doc.text('Unit Price', 160, y + 5.4, { align: 'right' });
  doc.text('Line Total', pageWidth - 17, y + 5.4, { align: 'right' });
  y += 8;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  order.items.forEach((item, index) => {
    y = ensureSpace(doc, y, 10);
    if (index % 2 === 1) {
      doc.setFillColor(...SURFACE_TINT);
      doc.rect(14, y, pageWidth - 28, 8.5, 'F');
    }
    doc.setTextColor(...INK_DARK);
    doc.text(item.name, 17, y + 5.6);
    doc.setTextColor(...INK_MUTED);
    doc.text(item.servesText, 98, y + 5.6);
    doc.setTextColor(...INK_DARK);
    doc.text(String(item.quantity), 132, y + 5.6, { align: 'right' });
    doc.text(formatZAR(item.unitPrice), 160, y + 5.6, { align: 'right' });
    doc.setFont('helvetica', 'bold');
    doc.text(formatZAR(item.lineTotal), pageWidth - 17, y + 5.6, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setDrawColor(...BORDER_LIGHT);
    doc.line(14, y + 8.5, pageWidth - 14, y + 8.5);
    y += 8.5;
  });

  y += 6;
  y = ensureSpace(doc, y, 52);

  // Totals & Deposit Box (right aligned)
  const paidTotal = getOrderPaidTotal(order.payments);
  const outstanding = getOrderOutstandingBalance(order);

  const summaryX = pageWidth - 96;
  const summaryW = 82;

  const drawTotalRow = (
    label: string,
    value: string,
    bold = false,
    highlight = false
  ) => {
    if (highlight) {
      doc.setFillColor(...SURFACE_TINT);
      doc.rect(summaryX, y - 4.2, summaryW, 7, 'F');
    }
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.setFontSize(bold ? 9.5 : 8.8);
    doc.setTextColor(...(bold ? INK_DARK : INK_MUTED));
    doc.text(label, summaryX + 3, y);
    doc.setTextColor(...(highlight ? BRAND_GREEN : INK_DARK));
    doc.text(value, summaryX + summaryW - 3, y, { align: 'right' });
    y += 6.5;
  };

  drawTotalRow('Platter Subtotal', formatZAR(order.subtotal));
  drawTotalRow(
    'Delivery Fee',
    order.fulfilmentType === 'collection'
      ? 'R0.00 (Collection)'
      : order.deliveryFee === null
      ? 'To be confirmed'
      : formatZAR(order.deliveryFee)
  );
  drawTotalRow('Estimated Order Total', formatZAR(order.totalAmount), true, true);
  drawTotalRow(
    `${order.depositPercentage}% Deposit Required`,
    formatZAR(order.depositRequired),
    true
  );
  drawTotalRow('Simulated Payments Recorded', formatZAR(paidTotal));
  drawTotalRow('Outstanding Balance', formatZAR(outstanding), true);

  // Notes & Allergies section
  if (order.allergyNotes || order.specialInstructions) {
    y += 4;
    y = ensureSpace(doc, y, 28);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND_GREEN);
    doc.text('Allergy Notes & Special Instructions', 14, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...INK_DARK);
    if (order.allergyNotes) {
      const wrapped = doc.splitTextToSize(
        `Allergies: ${order.allergyNotes}`,
        pageWidth - 28
      );
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4.8 + 2;
    }
    if (order.specialInstructions) {
      const wrapped = doc.splitTextToSize(
        `Special Instructions: ${order.specialInstructions}`,
        pageWidth - 28
      );
      doc.text(wrapped, 14, y);
      y += wrapped.length * 4.8 + 2;
    }
  }

  // Recorded Simulated Payments (if any)
  if (order.payments.length > 0) {
    y += 4;
    y = ensureSpace(doc, y, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND_GREEN);
    doc.text('Simulated Payments Recorded (Demo)', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    order.payments.forEach((p) => {
      y = ensureSpace(doc, y, 6);
      doc.setTextColor(...INK_DARK);
      doc.text(
        `${p.paidAt} · ${PAYMENT_METHOD_LABELS[p.method]} · ${formatZAR(p.amount)}${
          p.reference ? ` (Ref: ${p.reference})` : ''
        }`,
        14,
        y
      );
      y += 5;
    });
  }

  // Payment & Confirmation Policy Notice
  y += 6;
  y = ensureSpace(doc, y, 28);
  doc.setFillColor(...SURFACE_TINT);
  doc.setDrawColor(...BORDER_LIGHT);
  const policyText = settings.paymentInstructions
    ? `Payment Instructions (Configured by Owner): ${settings.paymentInstructions}`
    : `Ordering Policy: A ${settings.depositPercentage}% deposit is required to confirm real orders, with a minimum of ${settings.minNoticeHours} hours' advance notice. To place a live order or request payment details, contact ${settings.businessName} on WhatsApp at ${settings.whatsappDisplay} (${settings.whatsappInternational}).`;
  const wrappedPolicy = doc.splitTextToSize(policyText, pageWidth - 36);
  const boxH = wrappedPolicy.length * 4.6 + 9;
  doc.rect(14, y, pageWidth - 28, boxH, 'FD');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  doc.setTextColor(...INK_DARK);
  doc.text(wrappedPolicy, 18, y + 6.5);

  drawFooter(doc, settings);
  doc.save(`${order.reference}-confirmation.pdf`);
}

/** 2. Kitchen Preparation Sheet PDF (Client-side, for Demo Admin) */
export function downloadKitchenPrepPdf(
  order: DemoOrder,
  products: PlatterProduct[],
  settings: BusinessSettings
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawPageHeader(
    doc,
    'KITCHEN PREP SHEET',
    `Ref: ${order.reference}`,
    settings
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...INK_DARK);
  doc.text(
    `Due: ${formatShortDate(order.requestedDate)} at ${order.requestedTime} (${
      order.fulfilmentType === 'delivery' ? 'DELIVERY' : 'COLLECTION'
    })`,
    14,
    y
  );
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...INK_MUTED);
  doc.text(
    `Customer: ${order.customer.fullName} · ${order.customer.phone} · Status: ${
      ORDER_STATUS_LABELS[order.orderStatus]
    }`,
    14,
    y
  );
  y += 8;

  if (order.allergyNotes) {
    doc.setFillColor(254, 242, 242);
    doc.setDrawColor(220, 38, 38);
    const allergyWrapped = doc.splitTextToSize(
      `ALLERGY ALERT: ${order.allergyNotes}`,
      pageWidth - 36
    );
    const boxH = allergyWrapped.length * 5 + 7;
    doc.rect(14, y, pageWidth - 28, boxH, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(185, 28, 28);
    doc.text(allergyWrapped, 18, y + 6);
    y += boxH + 6;
  }

  order.items.forEach((item) => {
    y = ensureSpace(doc, y, 36);
    const prod = products.find((p) => p.id === item.productId);
    doc.setFillColor(...SURFACE_TINT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.rect(14, y, pageWidth - 28, 9, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(...BRAND_GREEN);
    doc.text(`${item.quantity} x  ${item.name}`, 18, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_MUTED);
    doc.text(item.servesText, pageWidth - 18, y + 6, { align: 'right' });
    y += 13;

    const components = prod?.items?.length ? prod.items : ['Standard platter items'];
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK_DARK);

    components.forEach((comp) => {
      y = ensureSpace(doc, y, 6);
      doc.rect(18, y - 3, 3, 3);
      doc.text(`${comp}  (x${item.quantity} platter portions)`, 24, y);
      y += 5.5;
    });
    y += 4;
  });

  if (order.specialInstructions) {
    y = ensureSpace(doc, y, 20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(...BRAND_GREEN);
    doc.text('Special Instructions', 14, y);
    y += 5;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...INK_DARK);
    const wrapped = doc.splitTextToSize(order.specialInstructions, pageWidth - 28);
    doc.text(wrapped, 14, y);
  }

  drawFooter(doc, settings);
  doc.save(`${order.reference}-kitchen-prep.pdf`);
}

/** 3. Demo Business Summary Report PDF (Client-side, for Demo Admin Reports) */
export function downloadBusinessReportPdf(
  orders: DemoOrder[],
  products: PlatterProduct[],
  settings: BusinessSettings,
  filterLabel: string
): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = drawPageHeader(
    doc,
    'DEMO BUSINESS SUMMARY REPORT',
    filterLabel,
    settings
  );

  const activeOrders = orders.filter((o) => o.orderStatus !== 'cancelled');
  const totalOrderValue = activeOrders.reduce((s, o) => s + o.totalAmount, 0);
  const totalDepositsRequired = activeOrders.reduce(
    (s, o) => s + o.depositRequired,
    0
  );
  const totalPaid = activeOrders.reduce(
    (s, o) => s + getOrderPaidTotal(o.payments),
    0
  );
  const totalOutstanding = activeOrders.reduce(
    (s, o) => s + getOrderOutstandingBalance(o),
    0
  );

  // KPI summary grid
  const kpis = [
    { label: 'Active Demo Orders', value: String(activeOrders.length) },
    { label: 'Total Order Value', value: formatZAR(totalOrderValue) },
    { label: 'Simulated Payments', value: formatZAR(totalPaid) },
    { label: 'Outstanding Balance', value: formatZAR(totalOutstanding) },
  ];

  const boxW = (pageWidth - 28 - 9) / 4;
  kpis.forEach((kpi, idx) => {
    const x = 14 + idx * (boxW + 3);
    doc.setFillColor(...SURFACE_TINT);
    doc.setDrawColor(...BORDER_LIGHT);
    doc.rect(x, y, boxW, 18, 'FD');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...INK_MUTED);
    doc.text(kpi.label.toUpperCase(), x + 3, y + 6);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BRAND_GREEN);
    doc.text(kpi.value, x + 3, y + 13.5);
  });

  y += 26;

  // Platter Breakdown
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_GREEN);
  doc.text('Platter Demand Summary (Active Demo Orders)', 14, y);
  y += 4;

  const platterMap = new Map<string, { name: string; qty: number; rev: number }>();
  products.forEach((p) => platterMap.set(p.id, { name: p.name, qty: 0, rev: 0 }));
  activeOrders.forEach((order) => {
    order.items.forEach((item) => {
      const existing = platterMap.get(item.productId) || {
        name: item.name,
        qty: 0,
        rev: 0,
      };
      existing.qty += item.quantity;
      existing.rev += item.lineTotal;
      platterMap.set(item.productId, existing);
    });
  });

  doc.setFillColor(...BRAND_GREEN);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('Platter Name', 17, y + 5.4);
  doc.text('Units Ordered', 142, y + 5.4, { align: 'right' });
  doc.text('Estimated Revenue', pageWidth - 17, y + 5.4, { align: 'right' });
  y += 8;

  Array.from(platterMap.values()).forEach((row, idx) => {
    if (idx % 2 === 1) {
      doc.setFillColor(...SURFACE_TINT);
      doc.rect(14, y, pageWidth - 28, 8, 'F');
    }
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.8);
    doc.setTextColor(...INK_DARK);
    doc.text(row.name, 17, y + 5.4);
    doc.text(String(row.qty), 142, y + 5.4, { align: 'right' });
    doc.text(formatZAR(row.rev), pageWidth - 17, y + 5.4, { align: 'right' });
    y += 8;
  });

  y += 10;
  y = ensureSpace(doc, y, 25);

  // Order Ledger
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(...BRAND_GREEN);
  doc.text(
    `Demo Orders Ledger (${orders.length} orders · 50% Deposits Required: ${formatZAR(
      totalDepositsRequired
    )})`,
    14,
    y
  );
  y += 4;

  doc.setFillColor(...BRAND_GREEN);
  doc.rect(14, y, pageWidth - 28, 8, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('Ref', 16, y + 5.4);
  doc.text('Customer', 56, y + 5.4);
  doc.text('Date', 100, y + 5.4);
  doc.text('Status', 124, y + 5.4);
  doc.text('Total', 165, y + 5.4, { align: 'right' });
  doc.text('Paid', pageWidth - 16, y + 5.4, { align: 'right' });
  y += 8;

  if (orders.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(...INK_MUTED);
    doc.text('No demo orders match this filter.', 16, y + 6);
  } else {
    orders.forEach((order, idx) => {
      y = ensureSpace(doc, y, 8.5);
      if (idx % 2 === 1) {
        doc.setFillColor(...SURFACE_TINT);
        doc.rect(14, y, pageWidth - 28, 8, 'F');
      }
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.8);
      doc.setTextColor(...INK_DARK);
      doc.text(order.reference, 16, y + 5.2);
      doc.text(order.customer.fullName.slice(0, 22), 56, y + 5.2);
      doc.text(order.requestedDate, 100, y + 5.2);
      doc.text(ORDER_STATUS_LABELS[order.orderStatus], 124, y + 5.2);
      doc.text(formatZAR(order.totalAmount), 165, y + 5.2, { align: 'right' });
      doc.text(formatZAR(getOrderPaidTotal(order.payments)), pageWidth - 16, y + 5.2, {
        align: 'right',
      });
      y += 8;
    });
  }

  drawFooter(doc, settings);
  doc.save(`simply-plattered-demo-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}
