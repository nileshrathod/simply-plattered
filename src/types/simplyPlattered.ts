export type FulfilmentType = 'collection' | 'delivery';

export type OrderStatus =
  | 'pending_review'
  | 'awaiting_deposit'
  | 'confirmed'
  | 'in_preparation'
  | 'ready'
  | 'completed'
  | 'cancelled';

export type PaymentStatus =
  | 'unpaid'
  | 'partial_deposit'
  | 'deposit_paid'
  | 'paid_in_full';

export type PaymentMethod = 'eft' | 'instant_eft' | 'cash' | 'other';

export type CustomEnquiryStatus = 'new' | 'quoted' | 'converted' | 'closed';

export interface PosterCropSpec {
  /** Image width percentage relative to container width (e.g. 345) */
  widthPercent: number;
  /** Translate X percentage relative to image width (negative) */
  translateXPercent: number;
  /** Translate Y percentage relative to image height (negative) */
  translateYPercent: number;
}

export interface PlatterProduct {
  id: string;
  slug: string;
  name: string;
  shortTag: string;
  servesText: string;
  price: number;
  description: string;
  items: string[];
  available: boolean;
  sortOrder: number;
  posterCrop?: PosterCropSpec;
  customImageDataUrl?: string;
  updatedAt: string;
}

export interface DemoOrderItem {
  productId: string;
  name: string;
  servesText: string;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface CustomerDetails {
  fullName: string;
  phone: string;
  email: string;
}

export interface DeliveryAddress {
  street: string;
  suburb: string;
  city: string;
  postalCode: string;
  notes: string;
}

export interface DemoPayment {
  id: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  paidAt: string;
  notes: string;
  recordedAt: string;
}

export interface DemoOrder {
  id: string;
  reference: string;
  isSampleDemo?: boolean;
  createdAt: string;
  updatedAt: string;
  customer: CustomerDetails;
  items: DemoOrderItem[];
  fulfilmentType: FulfilmentType;
  requestedDate: string; // YYYY-MM-DD
  requestedTime: string; // HH:mm
  deliveryAddress: DeliveryAddress | null;
  specialInstructions: string;
  allergyNotes: string;
  subtotal: number;
  deliveryFee: number | null; // null means not configured / to be confirmed by owner
  totalAmount: number;
  depositPercentage: number;
  depositRequired: number;
  orderStatus: OrderStatus;
  payments: DemoPayment[];
  paymentStatus: PaymentStatus;
  adminNotes: string;
}

export interface CustomOrderEnquiry {
  id: string;
  reference: string;
  createdAt: string;
  customerName: string;
  phone: string;
  email: string;
  eventDate: string;
  guestCount: string;
  fulfilmentType: FulfilmentType;
  details: string;
  status: CustomEnquiryStatus;
  adminNotes: string;
}

export interface BusinessSettings {
  businessName: string;
  tagline: string;
  country: string;
  currencyCode: string;
  currencySymbol: string;
  whatsappDisplay: string;
  whatsappInternational: string;
  whatsappDigits: string;
  minNoticeHours: number;
  depositPercentage: number;
  // Unconfirmed details — empty/null until configured by the owner in Demo Admin
  businessEmail: string;
  notificationEmail: string;
  businessAddress: string;
  businessHours: string;
  deliveryFee: number | null;
  freeDeliveryThreshold: number | null;
  deliveryNotes: string;
  paymentInstructions: string;
}

export interface DemoConfig {
  demoPasscode: string;
  sampleDataSeeded: boolean;
  lastExportedAt: string | null;
  lastResetAt: string | null;
}

export interface DemoStoreState {
  schemaVersion: number;
  updatedAt: string;
  products: PlatterProduct[];
  orders: DemoOrder[];
  customEnquiries: CustomOrderEnquiry[];
  businessSettings: BusinessSettings;
  demoConfig: DemoConfig;
}
