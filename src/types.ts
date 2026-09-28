export type UserRole = 'admin' | 'client';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  customerCode: string;
  email: string;
  name: string;
  role: UserRole;
  balanceCents: number;
  status: UserStatus;
  invitedBy?: string | null;
  referralCode?: string;
  referredByCode?: string | null;
  referredByUserId?: string | null;
  referralPoints?: number;
  referralEarningsCents?: number;
  createdAt: string;
  ordersCount?: number;
  totalSpentCents?: number;
}

export type DeliveryMode = 'automatic' | 'email_activation';
export type PresentationMode = 'full_account' | 'profile';

export interface Product {
  id: string;
  title: string;
  category: string;
  description: string;
  priceCents: number;
  deliveryMode: DeliveryMode;
  presentation: PresentationMode;
  imageUrl?: string | null;
  warrantyDays: number;
  warrantyConditions: string;
  active: boolean;
  manualStockCount?: number;
  availableStock?: number;
  badge?: string;
  hasSold?: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AccountStatus = 'active' | 'blocked' | 'exhausted';

export interface AccountCapacityChange {
  id: string;
  adminId: string;
  adminName: string;
  previousSlots: number;
  newSlots: number;
  reason: string;
  timestamp: string;
}

export interface AccountCredentialUpdate {
  id: string;
  adminId: string;
  adminName: string;
  notes: string;
  timestamp: string;
}

export interface InventoryAccount {
  id: string;
  productId: string;
  identifier: string;
  credentialsSnippet: string;
  presentation: PresentationMode;
  totalSlots: number;
  consumedSlots: number;
  status: AccountStatus;
  notes?: string;
  capacityHistory?: AccountCapacityChange[];
  credentialUpdates?: AccountCredentialUpdate[];
  createdAt: string;
  updatedAt: string;
}

export interface StockUnit {
  id: string;
  productId: string;
  contentSnippet: string;
  status: 'available' | 'reserved' | 'delivered' | 'defective';
  orderId?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  defectiveReason?: string;
}

export type OrderStatus = 'completed' | 'pending_activation' | 'cancelled';
export type OrderWarrantyStatus = 'active' | 'expired' | 'claimed' | 'refunded' | 'none';

export interface Order {
  id: string;
  userId: string;
  productId: string;
  inventoryAccountId?: string | null;
  slotNumber?: number | null;
  productSnapshot: {
    title: string;
    category: string;
    description: string;
    priceCents: number;
    deliveryMode: DeliveryMode;
    presentation: PresentationMode;
    imageUrl?: string | null;
    warrantyDays: number;
    warrantyConditions: string;
  };
  priceCents: number;
  status: OrderStatus;
  deliveryMode: DeliveryMode;
  presentation: PresentationMode;
  targetEmail?: string | null;
  stockUnitId?: string | null;
  hasDeliveredContent?: boolean;
  isCredentialsUpdated?: boolean;
  activationNotes?: string | null;
  deliveryTimestamp?: string | null;
  warrantyExpiresAt?: string | null;
  warrantyStatus: OrderWarrantyStatus;
  customerName?: string;
  customerEmail?: string;
  customerCode?: string;
  referralCodeApplied?: string | null;
  referrerUserId?: string | null;
  referrerName?: string | null;
  referralRewardStatus?: 'none' | 'pending' | 'credited';
  referralCashbackCents?: number;
  referralPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export type MovementType = 
  | 'deposit' 
  | 'purchase' 
  | 'refund' 
  | 'compensation_credit' 
  | 'compensation_debit'
  | 'referral_cashback'
  | 'points_redemption';

export interface BalanceMovement {
  id: string;
  userId: string;
  adminId?: string | null;
  type: MovementType;
  amountCents: number;
  balanceAfterCents: number;
  reference: string;
  reason: string;
  orderId?: string | null;
  referralCode?: string | null;
  createdAt: string;
}

export type ReferralSourceType = 'purchase' | 'recharge' | 'manual';
export type ReferralRewardType = 'cashback' | 'points' | 'both';
export type ReferralRewardStatus = 'pending' | 'approved' | 'rejected';

export interface ReferralReward {
  id: string;
  referrerUserId: string;
  referrerName: string;
  referrerCode: string;
  referredUserId?: string | null;
  referredUserName?: string | null;
  referredCustomerCode?: string | null;
  sourceType: ReferralSourceType;
  sourceId?: string | null;
  sourceAmountCents?: number;
  rewardType: ReferralRewardType;
  pointsEarned: number;
  cashbackCents: number;
  commissionPercentage?: number;
  status: ReferralRewardStatus;
  notes?: string;
  createdAt: string;
  processedAt?: string;
  processedByAdminId?: string | null;
}

export type BannerType = 'info' | 'promo' | 'referral' | 'warning' | 'announcement';

export interface InfoBanner {
  id: string;
  title: string;
  message: string;
  type: BannerType;
  badgeText?: string;
  active: boolean;
  priority: number;
  dismissible: boolean;
  linkUrl?: string; // external or internal tab ('referidos', 'catalogo', 'recargar')
  linkText?: string;
  iconName?: string;
  targetAudience?: 'all' | 'clients';
  createdAt: string;
  updatedAt: string;
}

export type WarrantyStatus = 
  | 'open' 
  | 'in_review' 
  | 'resolved_replacement' 
  | 'resolved_activation' 
  | 'resolved_refund' 
  | 'rejected';

export interface WarrantyMessage {
  id: string;
  senderRole: 'client' | 'admin';
  senderName: string;
  message: string;
  timestamp: string;
}

export interface WarrantyCase {
  id: string;
  orderId: string;
  userId: string;
  status: WarrantyStatus;
  subject: string;
  initialDescription: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  messages: WarrantyMessage[];
  productTitle?: string;
  customerName?: string;
  customerEmail?: string;
  customerCode?: string;
  orderPriceCents?: number;
  warrantyExpiresAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Invitation {
  id: string;
  code: string;
  note?: string;
  assignedEmail?: string | null;
  status: 'active' | 'redeemed' | 'revoked';
  createdBy: string;
  redeemedBy?: string | null;
  redeemedUserName?: string;
  redeemedUserEmail?: string;
  redeemedAt?: string | null;
  createdAt: string;
}

export interface StoreSettings {
  storeName: string;
  bankName: string;
  clabe: string;
  accountHolder: string;
  depositInstructions: string;
  telegramUsername: string;
  telegramLink: string;
  supportHours: string;
  referralProgramEnabled?: boolean;
  referralCommissionRate?: number;
  referralPointsPerMXN?: number;
  referralRewardType?: 'cashback' | 'points' | 'both';
  pointsExchangeRateCents?: number;
  autoCreditRewards?: boolean;
  updatedAt: string;
}
