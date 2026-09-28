export type UserRole = 'admin' | 'client';
export type UserStatus = 'active' | 'suspended';

export interface User {
  id: string;
  customerCode: string; // e.g. CLI-7492
  email: string;
  name: string;
  passwordHash: string;
  passwordSalt: string;
  role: UserRole;
  balanceCents: number; // Stored in Mexican cents (e.g. 25000 = $250.00 MXN)
  status: UserStatus;
  invitedBy?: string | null;
  referralCode: string; // e.g. REF-84920 or CLI-84920
  referredByCode?: string | null;
  referredByUserId?: string | null;
  referralPoints: number;
  referralEarningsCents: number;
  createdAt: string;
  updatedAt: string;
}

export type InvitationStatus = 'active' | 'redeemed' | 'revoked';

export interface Invitation {
  id: string;
  code: string; // e.g. INV-7A9B-4X2K
  note?: string;
  assignedEmail?: string | null;
  status: InvitationStatus;
  createdBy: string;
  redeemedBy?: string | null;
  redeemedAt?: string | null;
  createdAt: string;
}

export type DeliveryMode = 'automatic' | 'email_activation';
export type PresentationMode = 'full_account' | 'profile';

export interface Product {
  id: string;
  title: string;
  category: string;
  description: string;
  priceCents: number; // in MXN cents
  deliveryMode: DeliveryMode;
  presentation: PresentationMode; // 'full_account' = "Cuenta completa", 'profile' = "Perfil"
  imageUrl?: string | null;
  warrantyDays: number;
  warrantyConditions: string;
  active: boolean;
  manualStockCount?: number; // for email_activation mode
  badge?: string;
  hasSold?: boolean; // Set to true after first sale to lock presentation change
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
  id: string; // e.g. ACC-19482
  productId: string;
  identifier: string; // Normalized account login e.g. "disney_latam_01@privamail.mx"
  encryptedCredentials: string; // Encrypted with AES-256-GCM
  credentialsSnippet: string; // Masked preview
  presentation: PresentationMode;
  totalSlots: number; // 1 for full_account, integer >= 1 for profile
  consumedSlots: number; // Number of slots consumed/sold
  status: AccountStatus;
  notes?: string;
  capacityHistory?: AccountCapacityChange[];
  credentialUpdates?: AccountCredentialUpdate[];
  createdAt: string;
  updatedAt: string;
}

export type StockUnitStatus = 'available' | 'reserved' | 'delivered' | 'defective';

export interface StockUnit {
  id: string;
  productId: string;
  encryptedContent: string;
  contentSnippet: string;
  status: StockUnitStatus;
  orderId?: string | null;
  createdAt: string;
  deliveredAt?: string | null;
  defectiveReason?: string;
}

export type OrderStatus = 'completed' | 'pending_activation' | 'cancelled';
export type OrderWarrantyStatus = 'active' | 'expired' | 'claimed' | 'refunded' | 'none';

export interface OrderProductSnapshot {
  title: string;
  category: string;
  description: string;
  priceCents: number;
  deliveryMode: DeliveryMode;
  presentation: PresentationMode;
  imageUrl?: string | null;
  warrantyDays: number;
  warrantyConditions: string;
}

export interface Order {
  id: string; // e.g. ORD-984210
  userId: string;
  productId: string;
  inventoryAccountId?: string | null;
  slotNumber?: number | null; // 1-indexed slot number consumed
  productSnapshot: OrderProductSnapshot;
  priceCents: number;
  status: OrderStatus;
  deliveryMode: DeliveryMode;
  presentation: PresentationMode;
  targetEmail?: string | null;
  stockUnitId?: string | null;
  originalDeliveredCredentialsEncrypted?: string | null;
  deliveredContentEncrypted?: string | null;
  activationNotes?: string | null;
  deliveryTimestamp?: string | null;
  warrantyExpiresAt?: string | null;
  warrantyStatus: OrderWarrantyStatus;
  previousOrderId?: string | null;
  replacementOrderId?: string | null;
  replacementAccountId?: string | null;
  replacementSlotNumber?: number | null;
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
  id: string; // e.g. MOV-394820
  userId: string;
  adminId?: string | null;
  type: MovementType;
  amountCents: number; // Positive for credit, negative for debit
  balanceAfterCents: number;
  reference: string; // SPEI folio, Order ID, or compensation code
  reason: string; // Mandatory explanation
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
  sourceId?: string | null; // Order ID, Movement ID, or Manual reference
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
  priority: number; // 1 = highest
  dismissible: boolean;
  linkUrl?: string; // external url or internal tab identifier (e.g. 'referidos', 'catalogo', 'recargar')
  linkText?: string; // e.g. "Unirme al Canal", "Ver Beneficios", "Ver Catálogo"
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
  id: string; // e.g. GAR-94812
  orderId: string;
  userId: string;
  status: WarrantyStatus;
  subject: string;
  initialDescription: string;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  resolvedBy?: string | null;
  messages: WarrantyMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface AuditLog {
  id: string;
  adminId: string;
  adminName: string;
  action: string;
  targetType: string;
  targetId: string;
  details?: Record<string, any>;
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
  referralProgramEnabled: boolean;
  referralCommissionRate: number; // e.g. 5 = 5%
  referralPointsPerMXN: number; // e.g. 1 pt per $1 MXN
  referralRewardType: 'cashback' | 'points' | 'both';
  pointsExchangeRateCents: number; // e.g. 10 cents per point (100 pts = $10.00 MXN)
  autoCreditRewards: boolean; // if false, admin approves/generates from panel
  updatedAt: string;
}

export interface StoreData {
  settings: StoreSettings;
  users: User[];
  invitations: Invitation[];
  products: Product[];
  inventoryAccounts: InventoryAccount[];
  stockUnits: StockUnit[];
  orders: Order[];
  balanceMovements: BalanceMovement[];
  warrantyCases: WarrantyCase[];
  referralRewards: ReferralReward[];
  infoBanners: InfoBanner[];
  auditLogs: AuditLog[];
  sessions: Record<string, { userId: string; expiresAt: string }>;
}
