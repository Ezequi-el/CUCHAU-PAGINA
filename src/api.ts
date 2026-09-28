import { 
  User, 
  Product, 
  Order, 
  BalanceMovement, 
  WarrantyCase, 
  Invitation, 
  StoreSettings, 
  StockUnit,
  InventoryAccount,
  ReferralReward,
  InfoBanner 
} from './types';

const TOKEN_KEY = 'privakey_auth_token';

export function getAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setAuthToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearAuthToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export async function apiFetch<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const contentType = response.headers.get('content-type');
  let data: any = null;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    data = await response.text();
  }

  if (!response.ok) {
    const errorMsg = data?.error || (typeof data === 'string' ? data : 'Error de comunicación con el servidor');
    throw new Error(errorMsg);
  }

  return data as T;
}

// Helpers
export function formatMXN(cents: number): string {
  const amount = (cents / 100).toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `$${amount} MXN`;
}

export function formatDate(isoString: string): string {
  if (!isoString) return '-';
  try {
    const d = new Date(isoString);
    return d.toLocaleString('es-MX', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

// API methods
export const api = {
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiFetch<{ token: string; user: User }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(credentials),
      }),
    registerWithInvite: (data: { inviteCode: string; email: string; name: string; password: string }) =>
      apiFetch<{ token: string; user: User }>('/api/auth/register-with-invite', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    me: () =>
      apiFetch<{ user: User; settings: StoreSettings }>('/api/auth/me'),
    logout: () =>
      apiFetch<{ success: boolean }>('/api/auth/logout', { method: 'POST' }),
    demoSwitch: (role: 'admin' | 'client') =>
      apiFetch<{ token: string; user: User; settings: StoreSettings }>('/api/auth/demo-switch', {
        method: 'POST',
        body: JSON.stringify({ role }),
      }),
  },

  settings: {
    get: () => apiFetch<StoreSettings>('/api/settings'),
    update: (settings: Partial<StoreSettings>) =>
      apiFetch<StoreSettings>('/api/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  },

  products: {
    list: () => apiFetch<Product[]>('/api/products'),
    create: (data: Partial<Product>) =>
      apiFetch<Product>('/api/admin/products', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<Product>) =>
      apiFetch<Product>(`/api/admin/products/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggle: (id: string) =>
      apiFetch<Product>(`/api/admin/products/${id}/toggle`, {
        method: 'PATCH',
      }),
    getStockUnits: (id: string) =>
      apiFetch<StockUnit[]>(`/api/admin/products/${id}/stock`),
    loadStock: (id: string, rawUnits: string | string[]) =>
      apiFetch<{ success: boolean; count: number }>(`/api/admin/products/${id}/stock`, {
        method: 'POST',
        body: JSON.stringify({ rawUnits }),
      }),
    uploadImage: (id: string, image: string) =>
      apiFetch<{ success: boolean; product: Product }>(`/api/admin/products/${id}/image`, {
        method: 'POST',
        body: JSON.stringify({ image }),
      }),
    removeImage: (id: string) =>
      apiFetch<{ success: boolean; product: Product }>(`/api/admin/products/${id}/image`, {
        method: 'DELETE',
      }),
  },

  inventory: {
    getAccounts: (productId?: string) => {
      const url = productId ? `/api/admin/inventory/accounts?productId=${productId}` : '/api/admin/inventory/accounts';
      return apiFetch<(InventoryAccount & { productTitle: string; productPresentation: string; availableSlots: number; buyersCount: number })[]>(url);
    },
    createAccount: (data: { productId: string; identifier: string; rawCredentials: string; totalSlots?: number; notes?: string }) =>
      apiFetch<{ success: boolean; account: InventoryAccount }>('/api/admin/inventory/accounts', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    updateCapacity: (id: string, data: { newTotalSlots: number; reason: string }) =>
      apiFetch<{ success: boolean; account: InventoryAccount }>(`/api/admin/inventory/accounts/${id}/capacity`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    updateCredentials: (id: string, data: { newCredentials: string; notes: string }) =>
      apiFetch<{ success: boolean; account: InventoryAccount; affectedOrdersCount: number }>(`/api/admin/inventory/accounts/${id}/credentials`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggleBlock: (id: string) =>
      apiFetch<{ success: boolean; account: InventoryAccount }>(`/api/admin/inventory/accounts/${id}/toggle-block`, {
        method: 'PATCH',
      }),
    getBuyers: (id: string) =>
      apiFetch<{
        account: InventoryAccount;
        buyersCount: number;
        buyers: Array<{
          orderId: string;
          userId: string;
          customerName: string;
          customerEmail: string;
          customerCode: string;
          slotNumber: number;
          priceCents: number;
          status: string;
          warrantyStatus: string;
          warrantyExpiresAt?: string;
          deliveryTimestamp?: string;
          createdAt: string;
          replacementOrderId?: string;
        }>;
      }>(`/api/admin/inventory/accounts/${id}/buyers`),
  },

  wallet: {
    getMovements: (userId?: string) => {
      const url = userId ? `/api/wallet/movements?userId=${userId}` : '/api/wallet/movements';
      return apiFetch<BalanceMovement[]>(url);
    },
    credit: (data: { 
      userId: string; 
      amountCents: number; 
      reference: string; 
      reason: string;
      referralCode?: string;
      generateReferralReward?: boolean;
      referralRewardType?: 'cashback' | 'points';
      referralCustomCashbackCents?: number;
      referralCustomPoints?: number;
    }) =>
      apiFetch<{ user: User; movement: BalanceMovement; referralReward?: any }>('/api/admin/wallet/credit', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    compensate: (data: {
      userId: string;
      type: 'compensation_credit' | 'compensation_debit';
      amountCents: number;
      reference: string;
      reason: string;
    }) =>
      apiFetch<{ user: User; movement: BalanceMovement }>('/api/admin/wallet/compensation', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  orders: {
    purchase: (data: { productId: string; targetEmail?: string; referralCode?: string }) =>
      apiFetch<{ success: boolean; order: Order; balanceCents: number }>('/api/orders/purchase', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    list: () => apiFetch<Order[]>('/api/orders'),
    getCredentials: (orderId: string) =>
      apiFetch<{
        content: string | null;
        status: string;
        activationNotes?: string | null;
        deliveryTimestamp?: string | null;
        warrantyExpiresAt?: string | null;
      }>(`/api/orders/${orderId}/credentials`),
    completeActivation: (orderId: string, data: { activationNotes: string; deliveredCredentials?: string }) =>
      apiFetch<Order>(`/api/admin/orders/${orderId}/complete-activation`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    cancelAndRefund: (orderId: string, reason: string) =>
      apiFetch<{ order: Order; userBalanceCents: number }>(`/api/admin/orders/${orderId}/cancel-and-refund`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      }),
  },

  warranty: {
    list: () => apiFetch<WarrantyCase[]>('/api/warranty/cases'),
    create: (data: { orderId: string; subject: string; description: string }) =>
      apiFetch<WarrantyCase>('/api/warranty/cases', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    sendMessage: (caseId: string, message: string) =>
      apiFetch<WarrantyCase>(`/api/warranty/cases/${caseId}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message }),
      }),
    resolve: (
      caseId: string,
      data: {
        resolutionType: 'replacement' | 'new_activation' | 'refund' | 'rejected';
        notes: string;
        replacementCredential?: string;
      }
    ) =>
      apiFetch<{ c: WarrantyCase; order: Order }>(`/api/admin/warranty/cases/${caseId}/resolve`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
  },

  invitations: {
    list: () => apiFetch<Invitation[]>('/api/admin/invitations'),
    create: (data: { note?: string; assignedEmail?: string }) =>
      apiFetch<Invitation>('/api/admin/invitations', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    revoke: (id: string) =>
      apiFetch<Invitation>(`/api/admin/invitations/${id}/revoke`, {
        method: 'POST',
      }),
  },

  users: {
    list: () => apiFetch<User[]>('/api/admin/users'),
    toggleStatus: (id: string) => apiFetch<User>(`/api/admin/users/${id}/toggle-status`, { method: 'POST' }),
  },

  backup: {
    exportUrl: '/api/admin/backup',
    restore: (jsonData: any) =>
      apiFetch<{ success: boolean; message: string }>('/api/admin/restore', {
        method: 'POST',
        body: JSON.stringify(jsonData),
      }),
  },

  referrals: {
    getMyStats: () =>
      apiFetch<{
        referralCode: string;
        pointsBalance: number;
        earningsCents: number;
        currentBalanceCents: number;
        referredFriendsCount: number;
        referredFriends: Array<{
          id: string;
          name: string;
          customerCode: string;
          createdAt: string;
          ordersCount: number;
          totalSpentCents: number;
        }>;
        rewardsHistory: ReferralReward[];
        referrerInfo: { name: string; code: string } | null;
        settings: {
          referralProgramEnabled: boolean;
          referralCommissionRate: number;
          referralPointsPerMXN: number;
          referralRewardType: 'cashback' | 'points' | 'both';
          pointsExchangeRateCents: number;
        };
      }>('/api/referrals/my-stats'),

    validateCode: (code: string) =>
      apiFetch<{
        valid: boolean;
        referrerName: string;
        referrerCode: string;
        commissionRate: number;
        rewardType: string;
      }>('/api/referrals/validate-code', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    bindCode: (code: string) =>
      apiFetch<{ success: boolean; user: User }>('/api/referrals/bind', {
        method: 'POST',
        body: JSON.stringify({ code }),
      }),

    redeemPoints: (points: number) =>
      apiFetch<{
        success: boolean;
        balanceCents: number;
        remainingPoints: number;
        creditedCents: number;
      }>('/api/referrals/redeem-points', {
        method: 'POST',
        body: JSON.stringify({ points }),
      }),

    getAdminOverview: () =>
      apiFetch<{
        referrers: Array<{
          user: User;
          referralCode: string;
          referredCount: number;
          pointsTotal: number;
          cashbackTotalCents: number;
          pendingCount: number;
          referredUsersDetails?: Array<{
            id: string;
            name: string;
            email: string;
            customerCode: string;
            createdAt: string;
            ordersCount: number;
            totalSpentCents: number;
            orders: Array<{
              id: string;
              productTitle: string;
              priceCents: number;
              status: string;
              createdAt: string;
              referralRewardStatus?: string;
            }>;
          }>;
        }>;
        rewards: ReferralReward[];
        stats: {
          totalReferrersCount: number;
          totalReferredUsersCount: number;
          totalCashbackCents: number;
          totalPointsGranted: number;
          totalPendingRewards: number;
        };
        settings: {
          referralProgramEnabled: boolean;
          referralCommissionRate: number;
          referralPointsPerMXN: number;
          referralRewardType: 'cashback' | 'points' | 'both';
          pointsExchangeRateCents: number;
          autoCreditRewards: boolean;
        };
      }>('/api/admin/referrals/overview'),

    generateReward: (data: {
      referrerUserId: string;
      rewardType: 'cashback' | 'points' | 'both';
      amountCents?: number;
      points?: number;
      commissionPercentage?: number;
      sourceAmountCents?: number;
      reason: string;
      sourceType?: 'purchase' | 'recharge' | 'manual';
      sourceId?: string;
      referredUserId?: string;
      pendingRewardId?: string;
    }) =>
      apiFetch<{ success: boolean; reward: ReferralReward; referrer: User }>(
        '/api/admin/referrals/generate-reward',
        {
          method: 'POST',
          body: JSON.stringify(data),
        }
      ),

    batchDistribute: (data: {
      rewardType: 'cashback' | 'points' | 'both';
      amountCents?: number;
      points?: number;
      reason: string;
      minReferredCount?: number;
    }) =>
      apiFetch<{
        success: boolean;
        distributedCount: number;
        totalCashbackDistributedCents: number;
        totalPointsDistributed: number;
      }>('/api/admin/referrals/batch-distribute', {
        method: 'POST',
        body: JSON.stringify(data),
      }),

    rejectReward: (id: string, reason?: string) =>
      apiFetch<{ success: boolean; reward: ReferralReward }>(
        `/api/admin/referrals/reject-reward/${id}`,
        {
          method: 'POST',
          body: JSON.stringify({ reason }),
        }
      ),

    updateSettings: (settings: Partial<StoreSettings>) =>
      apiFetch<StoreSettings>('/api/admin/referrals/settings', {
        method: 'PUT',
        body: JSON.stringify(settings),
      }),
  },

  banners: {
    list: () => apiFetch<InfoBanner[]>('/api/admin/banners'),
    listActive: () => apiFetch<InfoBanner[]>('/api/banners'),
    create: (data: Partial<InfoBanner>) =>
      apiFetch<InfoBanner>('/api/admin/banners', {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<InfoBanner>) =>
      apiFetch<InfoBanner>(`/api/admin/banners/${id}`, {
        method: 'PUT',
        body: JSON.stringify(data),
      }),
    toggle: (id: string) =>
      apiFetch<InfoBanner>(`/api/admin/banners/${id}/toggle`, {
        method: 'POST',
      }),
    delete: (id: string) =>
      apiFetch<{ success: boolean; message: string }>(`/api/admin/banners/${id}`, {
        method: 'DELETE',
      }),
  },
};
