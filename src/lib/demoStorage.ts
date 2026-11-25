import {
  BusinessSettings,
  CustomEnquiryStatus,
  CustomOrderEnquiry,
  DemoConfig,
  DemoOrder,
  DemoOrderItem,
  DemoPayment,
  DemoStoreState,
  FulfilmentType,
  OrderStatus,
  PaymentMethod,
  PlatterProduct,
} from '../types/simplyPlattered';
import {
  calculateOrderTotals,
  computePaymentStatus,
  generateDemoOrderRef,
  getEarliestFulfilmentDateTime,
} from './formatters';

export const DEMO_STORAGE_KEY = 'simply_plattered_demo_store_v1';
export const CURRENT_SCHEMA_VERSION = 1;

let memoryFallbackStore: DemoStoreState | null = null;

function createId(prefix: string): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

/** Exact confirmed business defaults from user brief — unconfirmed fields intentionally blank/null */
export function createDefaultBusinessSettings(): BusinessSettings {
  return {
    businessName: 'Simply Plattered',
    tagline: 'Freshly Prepared with Care, Perfect for Sharing.',
    country: 'South Africa',
    currencyCode: 'ZAR',
    currencySymbol: 'R',
    whatsappDisplay: '061 560 6932',
    whatsappInternational: '+27 61 560 6932',
    whatsappDigits: '27615606932',
    minNoticeHours: 48,
    depositPercentage: 50,
    businessEmail: '',
    notificationEmail: '',
    businessAddress: '',
    businessHours: '',
    deliveryFee: null,
    freeDeliveryThreshold: null,
    deliveryNotes: '',
    paymentInstructions: '',
  };
}

/** Exact 3 festive platters seeded from the supplied Simply Plattered poster */
export function createDefaultProducts(): PlatterProduct[] {
  const now = new Date().toISOString();
  return [
    {
      id: 'platter_classic_savoury',
      slug: 'classic-savoury-platter',
      name: 'Classic Savoury Platter',
      shortTag: '01 · Festive Favourite',
      servesText: 'Serves 2 People',
      price: 199,
      description:
        'A crowd-pleasing savoury selection with golden pastries, mini frikkadelle, cocktail worsies, potato salad, and dipping sauce.',
      items: [
        'Cocktail Samosas',
        'Cocktail Pies',
        'Spring Rolls',
        'Sausage Rolls',
        'Mini Frikkadelle',
        'Cocktail Worsies',
        'Potato Salad',
        'Dipping Sauce',
      ],
      available: true,
      sortOrder: 1,
      posterCrop: {
        widthPercent: 345,
        translateXPercent: -5.0,
        translateYPercent: -41.5,
      },
      updatedAt: now,
    },
    {
      id: 'platter_festive_feast',
      slug: 'the-festive-feast',
      name: 'The Festive Feast',
      shortTag: '02 · Generous Selection',
      servesText: 'Serves 2 People',
      price: 249,
      description:
        'An abundant celebratory platter featuring mini frikkadelle, chicken pieces, savoury pastries, halfmoons, cheese cubes, pasta salad, and two dipping sauces.',
      items: [
        'Mini Frikkadelle',
        'Chicken Pieces',
        'Cocktail Samoosas',
        'Cocktail Pies',
        'Spring Rolls',
        'Halfmoons',
        'Cheese Cubes',
        'Pasta Salad',
        'Two Dipping Sauces',
      ],
      available: true,
      sortOrder: 2,
      posterCrop: {
        widthPercent: 345,
        translateXPercent: -35.5,
        translateYPercent: -41.5,
      },
      updatedAt: now,
    },
    {
      id: 'platter_traditional_braai',
      slug: 'traditional-braai-and-bites',
      name: 'Traditional Braai & Bites',
      shortTag: '03 · South African Classic',
      servesText: 'Serves 2 People',
      price: 279,
      description:
        'Inspired by South African gatherings with mini boerewors rolls, chicken sosaties, mini frikkadelle, garlic bread bites, potato salad, and BBQ sauce.',
      items: [
        'Mini Boerewors Rolls',
        'Mini Frikkadelle',
        'Chicken Sosaties',
        'Cocktail Pies',
        'Sausage Rolls',
        'Garlic Bread Bites',
        'Potato Salad',
        'BBQ Sauce',
      ],
      available: true,
      sortOrder: 3,
      posterCrop: {
        widthPercent: 345,
        translateXPercent: -66.0,
        translateYPercent: -41.5,
      },
      updatedAt: now,
    },
  ];
}

export function createDefaultDemoConfig(): DemoConfig {
  return {
    demoPasscode: '2026',
    sampleDataSeeded: false,
    lastExportedAt: null,
    lastResetAt: null,
  };
}

export function createInitialDemoStore(): DemoStoreState {
  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    products: createDefaultProducts(),
    orders: [],
    customEnquiries: [],
    businessSettings: createDefaultBusinessSettings(),
    demoConfig: createDefaultDemoConfig(),
  };
}

function isStorageAvailable(): boolean {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    const probeKey = '__sp_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);
    return true;
  } catch {
    return false;
  }
}

/** Safely validates and migrates parsed JSON into a complete DemoStoreState */
function normalizeStore(raw: unknown): DemoStoreState {
  const defaults = createInitialDemoStore();
  if (!raw || typeof raw !== 'object') return defaults;
  const data = raw as Partial<DemoStoreState>;

  const businessSettings: BusinessSettings = {
    ...defaults.businessSettings,
    ...(data.businessSettings && typeof data.businessSettings === 'object'
      ? data.businessSettings
      : {}),
  };

  const demoConfig: DemoConfig = {
    ...defaults.demoConfig,
    ...(data.demoConfig && typeof data.demoConfig === 'object'
      ? data.demoConfig
      : {}),
  };

  const products: PlatterProduct[] =
    Array.isArray(data.products) && data.products.length > 0
      ? data.products.map((p, idx) => ({
          id: String(p.id || createId('platter')),
          slug: String(p.slug || `platter-${idx + 1}`),
          name: String(p.name || 'Untitled Platter'),
          shortTag: String(p.shortTag || `0${idx + 1} · Platter`),
          servesText: String(p.servesText || 'Serves 2 People'),
          price: Number.isFinite(Number(p.price)) ? Number(p.price) : 0,
          description: String(p.description || ''),
          items: Array.isArray(p.items) ? p.items.map(String) : [],
          available: typeof p.available === 'boolean' ? p.available : true,
          sortOrder: Number.isFinite(Number(p.sortOrder)) ? Number(p.sortOrder) : idx + 1,
          posterCrop: p.posterCrop,
          customImageDataUrl: p.customImageDataUrl,
          updatedAt: String(p.updatedAt || defaults.updatedAt),
        }))
      : defaults.products;

  const orders: DemoOrder[] = Array.isArray(data.orders) ? data.orders : [];
  const customEnquiries: CustomOrderEnquiry[] = Array.isArray(data.customEnquiries)
    ? data.customEnquiries
    : [];

  return {
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: String(data.updatedAt || defaults.updatedAt),
    products,
    orders,
    customEnquiries,
    businessSettings,
    demoConfig,
  };
}

/** Reads the versioned demo store from localStorage with safe fallback */
export function loadDemoStore(): DemoStoreState {
  if (!isStorageAvailable()) {
    if (!memoryFallbackStore) {
      memoryFallbackStore = createInitialDemoStore();
    }
    return memoryFallbackStore;
  }

  try {
    const serialized = window.localStorage.getItem(DEMO_STORAGE_KEY);
    if (!serialized) {
      const fresh = createInitialDemoStore();
      saveDemoStore(fresh);
      return fresh;
    }
    const parsed = JSON.parse(serialized);
    const normalized = normalizeStore(parsed);
    memoryFallbackStore = normalized;
    return normalized;
  } catch (err) {
    console.error('Failed to read localStorage demo store; resetting safely:', err);
    const fresh = createInitialDemoStore();
    memoryFallbackStore = fresh;
    return fresh;
  }
}

/** Persists the entire versioned demo store safely to localStorage */
export function saveDemoStore(state: DemoStoreState): {
  ok: boolean;
  error?: string;
} {
  const nextState: DemoStoreState = {
    ...state,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
  };
  memoryFallbackStore = nextState;

  if (!isStorageAvailable()) {
    return {
      ok: false,
      error: 'Browser localStorage is unavailable; changes are kept in memory for this session.',
    };
  }

  try {
    window.localStorage.setItem(DEMO_STORAGE_KEY, JSON.stringify(nextState));
    return { ok: true };
  } catch (err) {
    const message =
      err instanceof Error
        ? err.message
        : 'Unable to save to browser storage (storage quota may be full).';
    return { ok: false, error: message };
  }
}

/** Resets all demo data back to initial seeded poster state */
export function resetDemoStore(): DemoStoreState {
  const fresh = createInitialDemoStore();
  fresh.demoConfig.lastResetAt = new Date().toISOString();
  saveDemoStore(fresh);
  return fresh;
}

/** Returns approximate byte size of persisted demo data */
export function getDemoStorageSizeBytes(): number {
  try {
    if (!isStorageAvailable()) return 0;
    const raw = window.localStorage.getItem(DEMO_STORAGE_KEY);
    return raw ? new Blob([raw]).size : 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// PRODUCT CRUD
// ============================================================================

export function addDemoProduct(
  state: DemoStoreState,
  input: Omit<PlatterProduct, 'id' | 'slug' | 'sortOrder' | 'updatedAt'>
): DemoStoreState {
  const now = new Date().toISOString();
  const slug = input.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  const nextSort =
    state.products.reduce((max, p) => Math.max(max, p.sortOrder), 0) + 1;

  const product: PlatterProduct = {
    ...input,
    id: createId('platter'),
    slug: slug || `platter-${nextSort}`,
    sortOrder: nextSort,
    updatedAt: now,
  };

  const next: DemoStoreState = {
    ...state,
    products: [...state.products, product],
  };
  saveDemoStore(next);
  return next;
}

export function updateDemoProduct(
  state: DemoStoreState,
  productId: string,
  updates: Partial<Omit<PlatterProduct, 'id'>>
): DemoStoreState {
  const now = new Date().toISOString();
  const next: DemoStoreState = {
    ...state,
    products: state.products.map((p) =>
      p.id === productId ? { ...p, ...updates, updatedAt: now } : p
    ),
  };
  saveDemoStore(next);
  return next;
}

export function toggleDemoProductAvailability(
  state: DemoStoreState,
  productId: string
): DemoStoreState {
  const now = new Date().toISOString();
  const next: DemoStoreState = {
    ...state,
    products: state.products.map((p) =>
      p.id === productId ? { ...p, available: !p.available, updatedAt: now } : p
    ),
  };
  saveDemoStore(next);
  return next;
}

export function deleteDemoProduct(
  state: DemoStoreState,
  productId: string
): DemoStoreState {
  const next: DemoStoreState = {
    ...state,
    products: state.products.filter((p) => p.id !== productId),
  };
  saveDemoStore(next);
  return next;
}

// ============================================================================
// ORDER & SIMULATED PAYMENT CRUD
// ============================================================================

export interface CreateDemoOrderInput {
  customer: {
    fullName: string;
    phone: string;
    email: string;
  };
  items: Array<{
    product: PlatterProduct;
    quantity: number;
  }>;
  fulfilmentType: FulfilmentType;
  requestedDate: string;
  requestedTime: string;
  deliveryAddress: {
    street: string;
    suburb: string;
    city: string;
    postalCode: string;
    notes: string;
  } | null;
  specialInstructions: string;
  allergyNotes: string;
}

export function createDemoOrder(
  state: DemoStoreState,
  input: CreateDemoOrderInput
): { nextState: DemoStoreState; order: DemoOrder } {
  const now = new Date().toISOString();
  const orderItems: DemoOrderItem[] = input.items
    .filter((entry) => entry.quantity > 0)
    .map((entry) => ({
      productId: entry.product.id,
      name: entry.product.name,
      servesText: entry.product.servesText,
      unitPrice: entry.product.price,
      quantity: entry.quantity,
      lineTotal: Math.round(entry.product.price * entry.quantity * 100) / 100,
    }));

  const rawSubtotal = orderItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const totals = calculateOrderTotals(
    rawSubtotal,
    input.fulfilmentType,
    state.businessSettings
  );

  // Never automatically mark orders as confirmed or deposits as paid
  const order: DemoOrder = {
    id: createId('ord'),
    reference: generateDemoOrderRef('SP-DEMO'),
    isSampleDemo: false,
    createdAt: now,
    updatedAt: now,
    customer: {
      fullName: input.customer.fullName.trim(),
      phone: input.customer.phone.trim(),
      email: input.customer.email.trim(),
    },
    items: orderItems,
    fulfilmentType: input.fulfilmentType,
    requestedDate: input.requestedDate,
    requestedTime: input.requestedTime,
    deliveryAddress:
      input.fulfilmentType === 'delivery' && input.deliveryAddress
        ? {
            street: input.deliveryAddress.street.trim(),
            suburb: input.deliveryAddress.suburb.trim(),
            city: input.deliveryAddress.city.trim(),
            postalCode: input.deliveryAddress.postalCode.trim(),
            notes: input.deliveryAddress.notes.trim(),
          }
        : null,
    specialInstructions: input.specialInstructions.trim(),
    allergyNotes: input.allergyNotes.trim(),
    subtotal: totals.subtotal,
    deliveryFee: totals.deliveryFee,
    totalAmount: totals.totalAmount,
    depositPercentage: state.businessSettings.depositPercentage,
    depositRequired: totals.depositRequired,
    orderStatus: 'pending_review',
    payments: [],
    paymentStatus: 'unpaid',
    adminNotes: '',
  };

  const nextState: DemoStoreState = {
    ...state,
    orders: [order, ...state.orders],
  };
  saveDemoStore(nextState);
  return { nextState, order };
}

export function updateDemoOrderStatus(
  state: DemoStoreState,
  orderId: string,
  orderStatus: OrderStatus
): DemoStoreState {
  const now = new Date().toISOString();
  const next: DemoStoreState = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, orderStatus, updatedAt: now } : o
    ),
  };
  saveDemoStore(next);
  return next;
}

export function updateDemoOrderAdminNotes(
  state: DemoStoreState,
  orderId: string,
  adminNotes: string
): DemoStoreState {
  const now = new Date().toISOString();
  const next: DemoStoreState = {
    ...state,
    orders: state.orders.map((o) =>
      o.id === orderId ? { ...o, adminNotes, updatedAt: now } : o
    ),
  };
  saveDemoStore(next);
  return next;
}

export function addDemoOrderPayment(
  state: DemoStoreState,
  orderId: string,
  paymentInput: {
    amount: number;
    method: PaymentMethod;
    reference: string;
    paidAt: string;
    notes: string;
  }
): DemoStoreState {
  const now = new Date().toISOString();
  const payment: DemoPayment = {
    id: createId('pay'),
    amount: Math.round(Number(paymentInput.amount) * 100) / 100,
    method: paymentInput.method,
    reference: paymentInput.reference.trim(),
    paidAt: paymentInput.paidAt || now.slice(0, 10),
    notes: paymentInput.notes.trim(),
    recordedAt: now,
  };

  const next: DemoStoreState = {
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const payments = [...o.payments, payment];
      const paymentStatus = computePaymentStatus(
        o.totalAmount,
        o.depositRequired,
        payments
      );
      return {
        ...o,
        payments,
        paymentStatus,
        updatedAt: now,
      };
    }),
  };
  saveDemoStore(next);
  return next;
}

export function deleteDemoOrderPayment(
  state: DemoStoreState,
  orderId: string,
  paymentId: string
): DemoStoreState {
  const now = new Date().toISOString();
  const next: DemoStoreState = {
    ...state,
    orders: state.orders.map((o) => {
      if (o.id !== orderId) return o;
      const payments = o.payments.filter((p) => p.id !== paymentId);
      const paymentStatus = computePaymentStatus(
        o.totalAmount,
        o.depositRequired,
        payments
      );
      return {
        ...o,
        payments,
        paymentStatus,
        updatedAt: now,
      };
    }),
  };
  saveDemoStore(next);
  return next;
}

export function deleteDemoOrder(
  state: DemoStoreState,
  orderId: string
): DemoStoreState {
  const next: DemoStoreState = {
    ...state,
    orders: state.orders.filter((o) => o.id !== orderId),
  };
  saveDemoStore(next);
  return next;
}

/** Optional helper for client demos: seeds 2 clearly labelled sample demo orders on demand */
export function seedSampleDemoOrders(state: DemoStoreState): DemoStoreState {
  const earliest = getEarliestFulfilmentDateTime(state.businessSettings.minNoticeHours);
  const baseDate = new Date(earliest.earliestDateObj.getTime() + 24 * 60 * 60 * 1000);
  const secondDate = new Date(earliest.earliestDateObj.getTime() + 72 * 60 * 60 * 1000);
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
      d.getDate()
    ).padStart(2, '0')}`;
  const now = new Date().toISOString();

  const p1 = state.products[0] || createDefaultProducts()[0];
  const p2 = state.products[1] || createDefaultProducts()[1];
  const p3 = state.products[2] || createDefaultProducts()[2];

  const sampleOrder1Subtotal = p2.price * 2 + p1.price;
  const sampleOrder1Deposit =
    Math.round(sampleOrder1Subtotal * (state.businessSettings.depositPercentage / 100) * 100) /
    100;

  const sample1: DemoOrder = {
    id: createId('ord_sample'),
    reference: generateDemoOrderRef('SP-SAMPLE'),
    isSampleDemo: true,
    createdAt: now,
    updatedAt: now,
    customer: {
      fullName: 'Sample Client A (Demo)',
      phone: '082 000 0001',
      email: 'sample-client-a@example.test',
    },
    items: [
      {
        productId: p2.id,
        name: p2.name,
        servesText: p2.servesText,
        unitPrice: p2.price,
        quantity: 2,
        lineTotal: p2.price * 2,
      },
      {
        productId: p1.id,
        name: p1.name,
        servesText: p1.servesText,
        unitPrice: p1.price,
        quantity: 1,
        lineTotal: p1.price,
      },
    ],
    fulfilmentType: 'collection',
    requestedDate: fmt(baseDate),
    requestedTime: '11:30',
    deliveryAddress: null,
    specialInstructions: 'Sample demonstration order showing a recorded 50% simulated deposit.',
    allergyNotes: 'No peanuts please (sample note).',
    subtotal: sampleOrder1Subtotal,
    deliveryFee: 0,
    totalAmount: sampleOrder1Subtotal,
    depositPercentage: state.businessSettings.depositPercentage,
    depositRequired: sampleOrder1Deposit,
    orderStatus: 'confirmed',
    payments: [
      {
        id: createId('pay_sample'),
        amount: sampleOrder1Deposit,
        method: 'eft',
        reference: 'DEMO-EFT-50PCT',
        paidAt: now.slice(0, 10),
        notes: 'Simulated 50% deposit recorded in Demo Admin',
        recordedAt: now,
      },
    ],
    paymentStatus: 'deposit_paid',
    adminNotes: 'Clearly marked sample order created for client presentation.',
  };

  const sampleOrder2Subtotal = p3.price * 2;
  const sampleOrder2Totals = calculateOrderTotals(
    sampleOrder2Subtotal,
    'delivery',
    state.businessSettings
  );

  const sample2: DemoOrder = {
    id: createId('ord_sample'),
    reference: generateDemoOrderRef('SP-SAMPLE'),
    isSampleDemo: true,
    createdAt: now,
    updatedAt: now,
    customer: {
      fullName: 'Sample Client B (Demo)',
      phone: '083 000 0002',
      email: 'sample-client-b@example.test',
    },
    items: [
      {
        productId: p3.id,
        name: p3.name,
        servesText: p3.servesText,
        unitPrice: p3.price,
        quantity: 2,
        lineTotal: p3.price * 2,
      },
    ],
    fulfilmentType: 'delivery',
    requestedDate: fmt(secondDate),
    requestedTime: '15:00',
    deliveryAddress: {
      street: '10 Sample Street (Demo Address)',
      suburb: 'Demo Suburb',
      city: 'Johannesburg',
      postalCode: '2000',
      notes: 'Call on arrival (sample note)',
    },
    specialInstructions: 'Sample delivery order awaiting deposit review.',
    allergyNotes: '',
    subtotal: sampleOrder2Totals.subtotal,
    deliveryFee: sampleOrder2Totals.deliveryFee,
    totalAmount: sampleOrder2Totals.totalAmount,
    depositPercentage: state.businessSettings.depositPercentage,
    depositRequired: sampleOrder2Totals.depositRequired,
    orderStatus: 'awaiting_deposit',
    payments: [],
    paymentStatus: 'unpaid',
    adminNotes: 'Sample delivery order — unpaid.',
  };

  const next: DemoStoreState = {
    ...state,
    orders: [sample1, sample2, ...state.orders],
    demoConfig: {
      ...state.demoConfig,
      sampleDataSeeded: true,
    },
  };
  saveDemoStore(next);
  return next;
}

// ============================================================================
// CUSTOM ENQUIRIES CRUD
// ============================================================================

export function createCustomEnquiry(
  state: DemoStoreState,
  input: Omit<CustomOrderEnquiry, 'id' | 'reference' | 'createdAt' | 'status' | 'adminNotes'>
): { nextState: DemoStoreState; enquiry: CustomOrderEnquiry } {
  const enquiry: CustomOrderEnquiry = {
    ...input,
    id: createId('enq'),
    reference: generateDemoOrderRef('SP-CUSTOM'),
    createdAt: new Date().toISOString(),
    status: 'new',
    adminNotes: '',
  };

  const nextState: DemoStoreState = {
    ...state,
    customEnquiries: [enquiry, ...state.customEnquiries],
  };
  saveDemoStore(nextState);
  return { nextState, enquiry };
}

export function updateCustomEnquiry(
  state: DemoStoreState,
  enquiryId: string,
  updates: { status?: CustomEnquiryStatus; adminNotes?: string }
): DemoStoreState {
  const next: DemoStoreState = {
    ...state,
    customEnquiries: state.customEnquiries.map((e) =>
      e.id === enquiryId ? { ...e, ...updates } : e
    ),
  };
  saveDemoStore(next);
  return next;
}

export function deleteCustomEnquiry(
  state: DemoStoreState,
  enquiryId: string
): DemoStoreState {
  const next: DemoStoreState = {
    ...state,
    customEnquiries: state.customEnquiries.filter((e) => e.id !== enquiryId),
  };
  saveDemoStore(next);
  return next;
}

// ============================================================================
// BUSINESS SETTINGS & EXPORT / IMPORT
// ============================================================================

export function updateBusinessSettings(
  state: DemoStoreState,
  updates: Partial<BusinessSettings>
): DemoStoreState {
  const next: DemoStoreState = {
    ...state,
    businessSettings: {
      ...state.businessSettings,
      ...updates,
    },
  };
  saveDemoStore(next);
  return next;
}

export function exportDemoDataJson(state: DemoStoreState): {
  json: string;
  nextState: DemoStoreState;
} {
  const nextState: DemoStoreState = {
    ...state,
    demoConfig: {
      ...state.demoConfig,
      lastExportedAt: new Date().toISOString(),
    },
  };
  saveDemoStore(nextState);
  return {
    json: JSON.stringify(nextState, null, 2),
    nextState,
  };
}

export function importDemoDataJson(jsonString: string): {
  ok: boolean;
  state?: DemoStoreState;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object' || !Array.isArray(parsed.products)) {
      return {
        ok: false,
        error: 'The selected file does not look like a valid Simply Plattered demo backup.',
      };
    }
    const normalized = normalizeStore(parsed);
    saveDemoStore(normalized);
    return { ok: true, state: normalized };
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Could not parse JSON backup: ${err.message}`
          : 'Could not parse JSON backup.',
    };
  }
}

export function buildOrdersCsv(orders: DemoOrder[]): string {
  const headers = [
    'Reference',
    'Created At',
    'Customer Name',
    'Phone',
    'Email',
    'Fulfilment',
    'Requested Date',
    'Requested Time',
    'Platters',
    'Subtotal (ZAR)',
    'Delivery Fee (ZAR)',
    'Total (ZAR)',
    'Deposit Required (ZAR)',
    'Simulated Paid (ZAR)',
    'Outstanding Balance (ZAR)',
    'Order Status',
    'Payment Status',
    'Allergies',
    'Special Instructions',
  ];

  const escapeCsv = (val: string | number) => {
    const str = String(val ?? '');
    if (/[",\n]/.test(str)) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = orders.map((order) => {
    const paid = order.payments.reduce((s, p) => s + p.amount, 0);
    const balance = Math.max(0, order.totalAmount - paid);
    const platters = order.items.map((i) => `${i.quantity}x ${i.name}`).join('; ');
    return [
      order.reference,
      order.createdAt,
      order.customer.fullName,
      order.customer.phone,
      order.customer.email,
      order.fulfilmentType,
      order.requestedDate,
      order.requestedTime,
      platters,
      order.subtotal.toFixed(2),
      order.deliveryFee === null ? 'TBC' : order.deliveryFee.toFixed(2),
      order.totalAmount.toFixed(2),
      order.depositRequired.toFixed(2),
      paid.toFixed(2),
      balance.toFixed(2),
      order.orderStatus,
      order.paymentStatus,
      order.allergyNotes,
      order.specialInstructions,
    ]
      .map(escapeCsv)
      .join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}
