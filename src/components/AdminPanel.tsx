import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Users, 
  KeyRound, 
  ShoppingBag, 
  Wallet, 
  ShieldCheck, 
  Settings, 
  Plus, 
  Check, 
  X, 
  AlertTriangle, 
  Clock, 
  Mail, 
  Zap, 
  RotateCcw, 
  Copy, 
  ExternalLink, 
  Download, 
  Upload, 
  SlidersHorizontal,
  CheckCircle2,
  XCircle,
  Eye,
  FileText,
  Search,
  Send,
  MessageSquare,
  Image as ImageIcon,
  Trash2,
  Ban,
  Unlock,
  UserCheck,
  RefreshCw,
  Info,
  BarChart3,
  Gift,
  Coins,
  Share2,
  Megaphone,
  Sparkles,
  Tag,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN, formatDate } from '../api';
import { AdminStatsOverview } from './AdminStatsOverview';
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
  PresentationMode,
  ReferralReward,
  InfoBanner 
} from '../types';

export const AdminPanel: React.FC = () => {
  const { user, settings, refreshSettings, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'orders' | 'balance' | 'products' | 'inventory' | 'warranty' | 'invitations' | 'users' | 'referrals' | 'banners' | 'settings' | 'backup'
  >('overview');

  // Data states
  const [orders, setOrders] = useState<Order[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [inventoryAccounts, setInventoryAccounts] = useState<(InventoryAccount & {
    productTitle: string;
    productPresentation: string;
    availableSlots: number;
    buyersCount: number;
  })[]>([]);
  const [movements, setMovements] = useState<BalanceMovement[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [warrantyCases, setWarrantyCases] = useState<WarrantyCase[]>([]);
  const [referralOverview, setReferralOverview] = useState<{
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
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Banners & Announcements States
  const [banners, setBanners] = useState<InfoBanner[]>([]);
  const [isBannerModalOpen, setIsBannerModalOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<Partial<InfoBanner> | null>(null);
  const [bannerSubmitting, setBannerSubmitting] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  // Filter for Inventory Tab
  const [selectedInventoryProductFilter, setSelectedInventoryProductFilter] = useState<string>('all');

  // Modals & Action States
  // 1. Invitations
  const [newInviteNote, setNewInviteNote] = useState('');
  const [newInviteEmail, setNewInviteEmail] = useState('');
  const [isCreatingInvite, setIsCreatingInvite] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  // 2. Balance credit / compensation
  const [balanceModalMode, setBalanceModalMode] = useState<'credit' | 'compensation' | null>(null);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [balanceAmountMXN, setBalanceAmountMXN] = useState('');
  const [balanceReference, setBalanceReference] = useState('');
  const [balanceReason, setBalanceReason] = useState('');
  const [compensationType, setCompensationType] = useState<'compensation_credit' | 'compensation_debit'>('compensation_credit');
  const [applyReferralCredit, setApplyReferralCredit] = useState(true);
  const [referralCreditType, setReferralCreditType] = useState<'cashback' | 'points'>('cashback');
  const [referralCreditCustomAmount, setReferralCreditCustomAmount] = useState('');
  const [balanceSubmitting, setBalanceSubmitting] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  // Referral Reward Generation Modal
  const [isReferralModalOpen, setIsReferralModalOpen] = useState(false);
  const [rewardTargetUserId, setRewardTargetUserId] = useState('');
  const [rewardTypeChoice, setRewardTypeChoice] = useState<'cashback' | 'points' | 'both'>('cashback');
  const [rewardAmountMXN, setRewardAmountMXN] = useState('');
  const [rewardPointsInput, setRewardPointsInput] = useState('');
  const [rewardCommissionRateInput, setRewardCommissionRateInput] = useState('5.0');
  const [rewardBaseAmountMXN, setRewardBaseAmountMXN] = useState('');
  const [selectedReferredOrderId, setSelectedReferredOrderId] = useState<string>('');
  const [rewardReason, setRewardReason] = useState('');
  const [rewardSourceType, setRewardSourceType] = useState<'purchase' | 'recharge' | 'manual'>('manual');
  const [rewardSourceId, setRewardSourceId] = useState('');
  const [rewardReferredUserId, setRewardReferredUserId] = useState('');
  const [pendingRewardIdToApprove, setPendingRewardIdToApprove] = useState<string | null>(null);
  const [rewardSubmitting, setRewardSubmitting] = useState(false);
  const [rewardError, setRewardError] = useState<string | null>(null);

  // Referral Batch Distribution Modal
  const [isBatchDistributeModalOpen, setIsBatchDistributeModalOpen] = useState(false);
  const [batchRewardType, setBatchRewardType] = useState<'cashback' | 'points' | 'both'>('points');
  const [batchAmountMXN, setBatchAmountMXN] = useState('25.00');
  const [batchPointsInput, setBatchPointsInput] = useState('150');
  const [batchReason, setBatchReason] = useState('Bonificación especial por metas y fidelidad en canal de referidos');
  const [batchMinReferrals, setBatchMinReferrals] = useState(1);
  const [batchSubmitting, setBatchSubmitting] = useState(false);
  const [batchError, setBatchError] = useState<string | null>(null);
  const [batchSuccessMessage, setBatchSuccessMessage] = useState<string | null>(null);

  // Expandable referrer list
  const [expandedReferrerIds, setExpandedReferrerIds] = useState<Set<string>>(new Set());

  // Referral Settings Form
  const [referralSettingsForm, setReferralSettingsForm] = useState({
    referralProgramEnabled: true,
    referralCommissionRate: 5,
    referralPointsPerMXN: 1,
    referralRewardType: 'both' as 'cashback' | 'points' | 'both',
    pointsExchangeRateCents: 10,
    autoCreditRewards: false,
  });
  const [savingRefSettings, setSavingRefSettings] = useState(false);
  const [refSettingsSuccess, setRefSettingsSuccess] = useState(false);

  // 3. Products
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [productSubmitting, setProductSubmitting] = useState(false);
  const [productImageFileError, setProductImageFileError] = useState<string | null>(null);

  // 4. Inventory Accounts Management Modals
  // 4a. Create Account
  const [isCreateAccountOpen, setIsCreateAccountOpen] = useState(false);
  const [newAccountProductId, setNewAccountProductId] = useState('');
  const [newAccountIdentifier, setNewAccountIdentifier] = useState('');
  const [newAccountCredentials, setNewAccountCredentials] = useState('');
  const [newAccountTotalSlots, setNewAccountTotalSlots] = useState(1);
  const [newAccountNotes, setNewAccountNotes] = useState('');
  const [accountSubmitting, setAccountSubmitting] = useState(false);
  const [accountError, setAccountError] = useState<string | null>(null);

  // 4b. Adjust Capacity
  const [adjustingAccount, setAdjustingAccount] = useState<InventoryAccount | null>(null);
  const [newCapacitySlots, setNewCapacitySlots] = useState<number>(1);
  const [capacityReason, setCapacityReason] = useState<string>('');
  const [capacitySubmitting, setCapacitySubmitting] = useState(false);
  const [capacityError, setCapacityError] = useState<string | null>(null);

  // 4c. Update Credentials
  const [updatingCredsAccount, setUpdatingCredsAccount] = useState<InventoryAccount | null>(null);
  const [newCredsInput, setNewCredsInput] = useState<string>('');
  const [credsUpdateNotes, setCredsUpdateNotes] = useState<string>('');
  const [credsSubmitting, setCredsSubmitting] = useState(false);
  const [credsError, setCredsError] = useState<string | null>(null);

  // 4d. View Buyers
  const [viewingBuyersAccount, setViewingBuyersAccount] = useState<InventoryAccount | null>(null);
  const [accountBuyersList, setAccountBuyersList] = useState<any[]>([]);
  const [loadingBuyers, setLoadingBuyers] = useState(false);

  // 5. Order Activation completion & cancellation
  const [completingOrder, setCompletingOrder] = useState<Order | null>(null);
  const [activationNotes, setActivationNotes] = useState('');
  const [activationCredentials, setActivationCredentials] = useState('');
  const [cancellingOrder, setCancellingOrder] = useState<Order | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');
  const [actionSubmitting, setActionSubmitting] = useState(false);

  // 6. Warranty Resolution
  const [resolvingCase, setResolvingCase] = useState<WarrantyCase | null>(null);
  const [resolutionType, setResolutionType] = useState<'replacement' | 'new_activation' | 'refund' | 'rejected'>('replacement');
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [replacementCredential, setReplacementCredential] = useState('');
  const [adminReplyMessage, setAdminReplyMessage] = useState('');

  // 7. Settings Form
  const [settingsForm, setSettingsForm] = useState<StoreSettings>({
    storeName: '',
    bankName: '',
    clabe: '',
    accountHolder: '',
    depositInstructions: '',
    telegramUsername: '',
    telegramLink: '',
    supportHours: '',
    updatedAt: '',
  });
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSuccess, setSettingsSuccess] = useState(false);

  // 8. Backup & Restore
  const [restoreJson, setRestoreJson] = useState('');
  const [restoreMessage, setRestoreMessage] = useState<string | null>(null);

  useEffect(() => {
    loadAllAdminData();
  }, []);

  useEffect(() => {
    if (settings) {
      setSettingsForm(settings);
    }
  }, [settings]);

  const loadAllAdminData = async () => {
    try {
      setLoading(true);
      const [ordList, usrList, prdList, movList, invList, warList, accList, refOverview, banList] = await Promise.all([
        api.orders.list(),
        api.users.list(),
        api.products.list(),
        api.wallet.getMovements(),
        api.invitations.list(),
        api.warranty.list(),
        api.inventory.getAccounts(),
        api.referrals.getAdminOverview(),
        api.banners.list(),
      ]);
      setOrders(ordList);
      setUsers(usrList);
      setProducts(prdList);
      setMovements(movList);
      setInvitations(invList);
      setWarrantyCases(warList);
      setInventoryAccounts(accList);
      setReferralOverview(refOverview);
      setBanners(banList || []);
      if (refOverview?.settings) {
        setReferralSettingsForm({
          referralProgramEnabled: refOverview.settings.referralProgramEnabled,
          referralCommissionRate: refOverview.settings.referralCommissionRate,
          referralPointsPerMXN: refOverview.settings.referralPointsPerMXN,
          referralRewardType: refOverview.settings.referralRewardType,
          pointsExchangeRateCents: refOverview.settings.pointsExchangeRateCents,
          autoCreditRewards: refOverview.settings.autoCreditRewards,
        });
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================
  // INVITATIONS HANDLERS
  // ==========================================
  const handleCreateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreatingInvite(true);
      await api.invitations.create({
        note: newInviteNote.trim() || undefined,
        assignedEmail: newInviteEmail.trim() || undefined,
      });
      setNewInviteNote('');
      setNewInviteEmail('');
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al crear invitación: ' + err.message);
    } finally {
      setIsCreatingInvite(false);
    }
  };

  const handleCopyInvite = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedInvite(code);
    setTimeout(() => setCopiedInvite(null), 2000);
  };

  const handleRevokeInvite = async (id: string) => {
    if (!confirm('¿Seguro que deseas revocar esta invitación?')) return;
    try {
      await api.invitations.revoke(id);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al revocar: ' + err.message);
    }
  };

  // ==========================================
  // BALANCE / WALLET HANDLERS
  // ==========================================
  const handleOpenCreditModal = (userId?: string) => {
    const chosenId = userId || (users.find(u => u.role === 'client')?.id || '');
    setBalanceModalMode('credit');
    setSelectedUserId(chosenId);
    setBalanceAmountMXN('');
    setBalanceReference('');
    setBalanceReason('');
    setBalanceError(null);
    setApplyReferralCredit(true);
    setReferralCreditType('cashback');
    setReferralCreditCustomAmount('');
  };

  const handleOpenCompensationModal = () => {
    setBalanceModalMode('compensation');
    setSelectedUserId(users.find(u => u.role === 'client')?.id || '');
    setBalanceAmountMXN('');
    setBalanceReference('');
    setBalanceReason('');
    setCompensationType('compensation_credit');
    setBalanceError(null);
  };

  const handleProcessBalance = async () => {
    if (!selectedUserId || !balanceAmountMXN || !balanceReference.trim() || !balanceReason.trim()) {
      setBalanceError('Todos los campos son obligatorios: usuario, monto, referencia y motivo.');
      return;
    }

    const amountFloat = parseFloat(balanceAmountMXN);
    if (isNaN(amountFloat) || amountFloat <= 0) {
      setBalanceError('Introduce un monto numérico válido mayor a $0.00 MXN.');
      return;
    }

    const amountCents = Math.round(amountFloat * 100);

    try {
      setBalanceSubmitting(true);
      setBalanceError(null);

      if (balanceModalMode === 'credit') {
        await api.wallet.credit({
          userId: selectedUserId,
          amountCents,
          reference: balanceReference.trim(),
          reason: balanceReason.trim(),
          generateReferralReward: applyReferralCredit,
          referralRewardType: referralCreditType,
          referralCustomCashbackCents: referralCreditType === 'cashback' && referralCreditCustomAmount ? Math.round(parseFloat(referralCreditCustomAmount) * 100) : undefined,
          referralCustomPoints: referralCreditType === 'points' && referralCreditCustomAmount ? parseInt(referralCreditCustomAmount) : undefined,
        });
      } else {
        await api.wallet.compensate({
          userId: selectedUserId,
          type: compensationType,
          amountCents,
          reference: balanceReference.trim(),
          reason: balanceReason.trim(),
        });
      }

      setBalanceModalMode(null);
      await loadAllAdminData();
      await refreshUser();
    } catch (err: any) {
      setBalanceError(err.message || 'Error al registrar el movimiento.');
    } finally {
      setBalanceSubmitting(false);
    }
  };

  // ==========================================
  // REFERRAL PROGRAM HANDLERS
  // ==========================================
  const handleOpenGenerateReward = (opts?: {
    referrerUserId?: string;
    referredUserId?: string;
    sourceType?: 'purchase' | 'recharge' | 'manual';
    sourceId?: string;
    pendingRewardId?: string;
    amountCents?: number;
    points?: number;
    commissionPercentage?: number;
    sourceAmountCents?: number;
    reason?: string;
  }) => {
    const targetId = opts?.referrerUserId || (users.find(u => u.role === 'client')?.id || '');
    setRewardTargetUserId(targetId);
    setRewardTypeChoice(opts?.amountCents && opts?.points ? 'both' : opts?.amountCents ? 'cashback' : (opts?.points ? 'points' : 'cashback'));
    setRewardAmountMXN(opts?.amountCents ? (opts.amountCents / 100).toFixed(2) : '');
    setRewardPointsInput(opts?.points ? String(opts.points) : '');
    setRewardCommissionRateInput(opts?.commissionPercentage ? String(opts.commissionPercentage) : String(referralSettingsForm.referralCommissionRate || 5));
    setRewardBaseAmountMXN(opts?.sourceAmountCents ? (opts.sourceAmountCents / 100).toFixed(2) : '');
    setSelectedReferredOrderId(opts?.sourceType === 'purchase' && opts.sourceId ? opts.sourceId : '');
    setRewardReason(opts?.reason || '');
    setRewardSourceType(opts?.sourceType || 'manual');
    setRewardSourceId(opts?.sourceId || '');
    setRewardReferredUserId(opts?.referredUserId || '');
    setPendingRewardIdToApprove(opts?.pendingRewardId || null);
    setRewardError(null);
    setIsReferralModalOpen(true);
  };

  const handleSelectReferredOrder = (
    order: { id: string; priceCents: number; productTitle: string; createdAt: string }, 
    friendUser: { id: string; name: string; customerCode: string },
    referrerName: string
  ) => {
    const baseMXN = (order.priceCents / 100).toFixed(2);
    const rate = referralSettingsForm.referralCommissionRate || 5;
    const ptsPerMXN = referralSettingsForm.referralPointsPerMXN || 1;
    const calculatedCash = ((order.priceCents * rate) / 10000).toFixed(2);
    const calculatedPoints = Math.round((order.priceCents / 100) * ptsPerMXN);

    setSelectedReferredOrderId(order.id);
    setRewardReferredUserId(friendUser.id);
    setRewardSourceType('purchase');
    setRewardSourceId(order.id);
    setRewardBaseAmountMXN(baseMXN);
    setRewardCommissionRateInput(String(rate));
    setRewardAmountMXN(calculatedCash);
    setRewardPointsInput(String(calculatedPoints));
    setRewardReason(`Comisión del ${rate}% por compra de ${friendUser.name} (${friendUser.customerCode}) en ${order.productTitle} (${order.id}) por $${baseMXN} MXN`);
  };

  const handleRecalculateRewardAmounts = (baseMXNStr: string, rateStr: string) => {
    const base = parseFloat(baseMXNStr || '0');
    const rate = parseFloat(rateStr || '0');
    if (!isNaN(base) && base > 0 && !isNaN(rate) && rate > 0) {
      const calcCash = ((base * rate) / 100).toFixed(2);
      setRewardAmountMXN(calcCash);
      const ptsPerMXN = referralSettingsForm.referralPointsPerMXN || 1;
      setRewardPointsInput(String(Math.round(base * ptsPerMXN)));
    }
  };

  const handleSaveReferralReward = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rewardTargetUserId || !rewardReason.trim()) {
      setRewardError('Selecciona el usuario referente e indica un motivo justificativo.');
      return;
    }

    const givesCash = rewardTypeChoice === 'cashback' || rewardTypeChoice === 'both';
    const givesPoints = rewardTypeChoice === 'points' || rewardTypeChoice === 'both';
    const cashFloat = parseFloat(rewardAmountMXN || '0');
    const ptsInt = parseInt(rewardPointsInput || '0');

    if (givesCash && (isNaN(cashFloat) || cashFloat <= 0) && (!givesPoints || ptsInt <= 0)) {
      setRewardError('Ingresa un monto válido en MXN para el cashback.');
      return;
    }
    if (givesPoints && (isNaN(ptsInt) || ptsInt <= 0) && (!givesCash || cashFloat <= 0)) {
      setRewardError('Ingresa una cantidad de puntos válida mayor a cero.');
      return;
    }

    try {
      setRewardSubmitting(true);
      setRewardError(null);
      const commPct = parseFloat(rewardCommissionRateInput || '0');
      const baseAmt = parseFloat(rewardBaseAmountMXN || '0');

      await api.referrals.generateReward({
        referrerUserId: rewardTargetUserId,
        rewardType: rewardTypeChoice,
        amountCents: givesCash ? Math.round(cashFloat * 100) : 0,
        points: givesPoints ? ptsInt : 0,
        commissionPercentage: !isNaN(commPct) && commPct > 0 ? commPct : undefined,
        sourceAmountCents: !isNaN(baseAmt) && baseAmt > 0 ? Math.round(baseAmt * 100) : undefined,
        reason: rewardReason.trim(),
        sourceType: rewardSourceType,
        sourceId: rewardSourceId.trim() || undefined,
        referredUserId: rewardReferredUserId || undefined,
        pendingRewardId: pendingRewardIdToApprove || undefined,
      });
      setIsReferralModalOpen(false);
      await loadAllAdminData();
      await refreshUser();
    } catch (err: any) {
      setRewardError(err.message || 'Error al generar recompensa de referido.');
    } finally {
      setRewardSubmitting(false);
    }
  };

  const handleOpenBatchDistribute = () => {
    setBatchError(null);
    setBatchSuccessMessage(null);
    setIsBatchDistributeModalOpen(true);
  };

  const handleSaveBatchDistribute = async (e: React.FormEvent) => {
    e.preventDefault();
    const givesCash = batchRewardType === 'cashback' || batchRewardType === 'both';
    const givesPoints = batchRewardType === 'points' || batchRewardType === 'both';
    const cashFloat = parseFloat(batchAmountMXN || '0');
    const ptsInt = parseInt(batchPointsInput || '0');

    if (givesCash && (isNaN(cashFloat) || cashFloat <= 0) && (!givesPoints || ptsInt <= 0)) {
      setBatchError('Indica un monto válido en MXN para el cashback masivo.');
      return;
    }
    if (givesPoints && (isNaN(ptsInt) || ptsInt <= 0) && (!givesCash || cashFloat <= 0)) {
      setBatchError('Indica una cantidad de puntos válida mayor a cero.');
      return;
    }
    if (!batchReason.trim()) {
      setBatchError('El motivo o justificación de auditoría es obligatorio.');
      return;
    }

    try {
      setBatchSubmitting(true);
      setBatchError(null);
      const res = await api.referrals.batchDistribute({
        rewardType: batchRewardType,
        amountCents: givesCash ? Math.round(cashFloat * 100) : 0,
        points: givesPoints ? ptsInt : 0,
        reason: batchReason.trim(),
        minReferredCount: batchMinReferrals,
      });
      setBatchSuccessMessage(`¡Éxito! Se acreditaron recompensas a ${res.distributedCount} referentes activos.`);
      await loadAllAdminData();
      await refreshUser();
      setTimeout(() => {
        setIsBatchDistributeModalOpen(false);
        setBatchSuccessMessage(null);
      }, 1800);
    } catch (err: any) {
      setBatchError(err.message || 'Error al procesar la distribución masiva.');
    } finally {
      setBatchSubmitting(false);
    }
  };

  const handleToggleReferrerExpand = (referrerId: string) => {
    setExpandedReferrerIds(prev => {
      const next = new Set(prev);
      if (next.has(referrerId)) {
        next.delete(referrerId);
      } else {
        next.add(referrerId);
      }
      return next;
    });
  };

  const handleApprovePendingReward = async (reward: ReferralReward, typeChoice: 'cashback' | 'points' | 'both' = 'cashback') => {
    try {
      await api.referrals.generateReward({
        referrerUserId: reward.referrerUserId,
        rewardType: typeChoice,
        amountCents: typeChoice === 'cashback' || typeChoice === 'both' ? reward.cashbackCents : 0,
        points: typeChoice === 'points' || typeChoice === 'both' ? reward.pointsEarned : 0,
        reason: reward.notes || 'Aprobación de comisión de referidos por administración',
        sourceType: reward.sourceType,
        sourceId: reward.sourceId || undefined,
        referredUserId: reward.referredUserId || undefined,
        pendingRewardId: reward.id,
      });
      await loadAllAdminData();
      await refreshUser();
    } catch (err: any) {
      alert('Error al aprobar recompensa: ' + err.message);
    }
  };

  const handleRejectPendingReward = async (reward: ReferralReward) => {
    const reason = prompt('Motivo del rechazo de la bonificación (opcional):');
    if (reason === null) return;
    try {
      await api.referrals.rejectReward(reward.id, reason.trim() || undefined);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al rechazar: ' + err.message);
    }
  };

  const handleSaveReferralSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSavingRefSettings(true);
      setRefSettingsSuccess(false);
      await api.referrals.updateSettings(referralSettingsForm);
      setRefSettingsSuccess(true);
      await loadAllAdminData();
      await refreshSettings();
      setTimeout(() => setRefSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert('Error al guardar configuración de referidos: ' + err.message);
    } finally {
      setSavingRefSettings(false);
    }
  };

  // ==========================================
  // BANNERS & ANNOUNCEMENTS HANDLERS
  // ==========================================
  const handleOpenCreateBanner = (preset?: Partial<InfoBanner>) => {
    setEditingBanner(preset || {
      title: '',
      message: '',
      type: 'info',
      badgeText: 'Aviso',
      active: true,
      priority: 1,
      dismissible: true,
      linkUrl: '',
      linkText: 'Ver Más',
      iconName: 'Info',
      targetAudience: 'all',
    });
    setBannerError(null);
    setIsBannerModalOpen(true);
  };

  const handleOpenEditBanner = (banner: InfoBanner) => {
    setEditingBanner({ ...banner });
    setBannerError(null);
    setIsBannerModalOpen(true);
  };

  const handleSaveBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBanner || !editingBanner.title?.trim() || !editingBanner.message?.trim()) {
      setBannerError('El título y el mensaje del banner son obligatorios.');
      return;
    }

    try {
      setBannerSubmitting(true);
      setBannerError(null);
      if (editingBanner.id) {
        await api.banners.update(editingBanner.id, editingBanner);
      } else {
        await api.banners.create(editingBanner);
      }
      setIsBannerModalOpen(false);
      setEditingBanner(null);
      await loadAllAdminData();
    } catch (err: any) {
      setBannerError(err.message || 'Error al guardar el banner.');
    } finally {
      setBannerSubmitting(false);
    }
  };

  const handleToggleBanner = async (id: string) => {
    try {
      await api.banners.toggle(id);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al cambiar estado del banner: ' + err.message);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!confirm('¿Estás seguro de eliminar este aviso informativo?')) return;
    try {
      await api.banners.delete(id);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al eliminar banner: ' + err.message);
    }
  };

  // ==========================================
  // PRODUCTS HANDLERS
  // ==========================================
  const handleOpenCreateProduct = () => {
    setEditingProduct({
      title: '',
      category: 'Streaming & Series',
      description: '',
      priceCents: 10000,
      deliveryMode: 'automatic',
      presentation: 'full_account',
      imageUrl: null,
      warrantyDays: 30,
      warrantyConditions: 'Garantía estándar de 30 días contra caídas de suscripción.',
      manualStockCount: 0,
      active: true,
      hasSold: false,
    });
    setProductImageFileError(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditProduct = (prod: Product) => {
    setEditingProduct({ ...prod });
    setProductImageFileError(null);
    setIsProductModalOpen(true);
  };

  const handleProductImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setProductImageFileError(null);

    const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowedTypes.includes(file.type)) {
      setProductImageFileError('Formato no permitido. Utiliza PNG, JPG, WEBP o SVG.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setProductImageFileError('La imagen excede el límite máximo de 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setEditingProduct(prev => prev ? { ...prev, imageUrl: reader.result as string } : null);
      }
    };
    reader.onerror = () => {
      setProductImageFileError('Error al leer el archivo de imagen.');
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;

    try {
      setProductSubmitting(true);
      if (editingProduct.id) {
        await api.products.update(editingProduct.id, editingProduct);
      } else {
        await api.products.create(editingProduct);
      }
      setIsProductModalOpen(false);
      setEditingProduct(null);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al guardar producto: ' + err.message);
    } finally {
      setProductSubmitting(false);
    }
  };

  const handleToggleProduct = async (id: string) => {
    try {
      await api.products.toggle(id);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error: ' + err.message);
    }
  };

  // ==========================================
  // INVENTORY ACCOUNTS & QUOTAS HANDLERS
  // ==========================================
  const handleOpenCreateAccount = (presetProductId?: string) => {
    const defaultProduct = presetProductId 
      ? products.find(p => p.id === presetProductId)
      : products.find(p => p.deliveryMode === 'automatic');
    
    setNewAccountProductId(defaultProduct ? defaultProduct.id : '');
    setNewAccountIdentifier('');
    setNewAccountCredentials('');
    setNewAccountTotalSlots(defaultProduct?.presentation === 'profile' ? 4 : 1);
    setNewAccountNotes('');
    setAccountError(null);
    setIsCreateAccountOpen(true);
  };

  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAccountProductId || !newAccountIdentifier.trim() || !newAccountCredentials.trim()) {
      setAccountError('Por favor completa todos los campos requeridos.');
      return;
    }

    const targetProduct = products.find(p => p.id === newAccountProductId);
    const slots = targetProduct?.presentation === 'profile' 
      ? Math.max(1, Math.round(Number(newAccountTotalSlots) || 1))
      : 1;

    try {
      setAccountSubmitting(true);
      setAccountError(null);
      await api.inventory.createAccount({
        productId: newAccountProductId,
        identifier: newAccountIdentifier.trim(),
        rawCredentials: newAccountCredentials.trim(),
        totalSlots: slots,
        notes: newAccountNotes.trim() || undefined,
      });

      setIsCreateAccountOpen(false);
      await loadAllAdminData();
    } catch (err: any) {
      setAccountError(err.message || 'Error al crear la cuenta de inventario.');
    } finally {
      setAccountSubmitting(false);
    }
  };

  const handleOpenAdjustCapacity = (acc: InventoryAccount) => {
    setAdjustingAccount(acc);
    setNewCapacitySlots(acc.totalSlots);
    setCapacityReason('');
    setCapacityError(null);
  };

  const handleSaveCapacity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingAccount) return;

    if (newCapacitySlots < adjustingAccount.consumedSlots) {
      setCapacityError(`No puedes reducir la capacidad a ${newCapacitySlots} cupos porque ya se han vendido ${adjustingAccount.consumedSlots} cupos.`);
      return;
    }

    if (!capacityReason.trim()) {
      setCapacityError('El motivo del ajuste es obligatorio.');
      return;
    }

    try {
      setCapacitySubmitting(true);
      setCapacityError(null);
      await api.inventory.updateCapacity(adjustingAccount.id, {
        newTotalSlots: newCapacitySlots,
        reason: capacityReason.trim(),
      });
      setAdjustingAccount(null);
      await loadAllAdminData();
    } catch (err: any) {
      setCapacityError(err.message || 'Error al actualizar capacidad.');
    } finally {
      setCapacitySubmitting(false);
    }
  };

  const handleOpenUpdateCreds = (acc: InventoryAccount) => {
    setUpdatingCredsAccount(acc);
    setNewCredsInput('');
    setCredsUpdateNotes('');
    setCredsError(null);
  };

  const handleSaveCredentialsUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!updatingCredsAccount) return;

    if (!newCredsInput.trim() || !credsUpdateNotes.trim()) {
      setCredsError('Se requieren las nuevas credenciales y una nota explicativa.');
      return;
    }

    try {
      setCredsSubmitting(true);
      setCredsError(null);
      await api.inventory.updateCredentials(updatingCredsAccount.id, {
        newCredentials: newCredsInput.trim(),
        notes: credsUpdateNotes.trim(),
      });
      setUpdatingCredsAccount(null);
      await loadAllAdminData();
    } catch (err: any) {
      setCredsError(err.message || 'Error al actualizar credenciales.');
    } finally {
      setCredsSubmitting(false);
    }
  };

  const handleToggleBlockAccount = async (id: string) => {
    try {
      await api.inventory.toggleBlock(id);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al cambiar estado de cuenta: ' + err.message);
    }
  };

  const handleOpenBuyersModal = async (acc: InventoryAccount) => {
    setViewingBuyersAccount(acc);
    setAccountBuyersList([]);
    try {
      setLoadingBuyers(true);
      const res = await api.inventory.getBuyers(acc.id);
      setAccountBuyersList(res.buyers);
    } catch (err: any) {
      alert('Error al cargar compradores: ' + err.message);
    } finally {
      setLoadingBuyers(false);
    }
  };

  // ==========================================
  // ORDER ACTIVATION HANDLERS
  // ==========================================
  const handleCompleteActivation = async () => {
    if (!completingOrder) return;
    try {
      setActionSubmitting(true);
      await api.orders.completeActivation(completingOrder.id, {
        activationNotes: activationNotes.trim(),
        deliveredCredentials: activationCredentials.trim() || undefined,
      });
      setCompletingOrder(null);
      setActivationNotes('');
      setActivationCredentials('');
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al completar activación: ' + err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  const handleCancelAndRefund = async () => {
    if (!cancellingOrder || !cancellationReason.trim()) return;
    try {
      setActionSubmitting(true);
      await api.orders.cancelAndRefund(cancellingOrder.id, cancellationReason.trim());
      setCancellingOrder(null);
      setCancellationReason('');
      await loadAllAdminData();
      await refreshUser();
    } catch (err: any) {
      alert('Error al cancelar pedido: ' + err.message);
    } finally {
      setActionSubmitting(false);
    }
  };

  // ==========================================
  // WARRANTY RESOLUTION
  // ==========================================
  const handleResolveWarranty = async () => {
    if (!resolvingCase || !resolutionNotes.trim()) {
      alert('Por favor añade notas justificando la resolución.');
      return;
    }

    try {
      await api.warranty.resolve(resolvingCase.id, {
        resolutionType,
        notes: resolutionNotes.trim(),
        replacementCredential: replacementCredential.trim() || undefined,
      });
      setResolvingCase(null);
      setResolutionNotes('');
      setReplacementCredential('');
      await loadAllAdminData();
      await refreshUser();
    } catch (err: any) {
      alert('Error al resolver caso: ' + err.message);
    }
  };

  const handleSendAdminMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingCase || !adminReplyMessage.trim()) return;

    try {
      const updated = await api.warranty.sendMessage(resolvingCase.id, adminReplyMessage.trim());
      setResolvingCase(updated);
      setAdminReplyMessage('');
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al enviar mensaje: ' + err.message);
    }
  };

  // ==========================================
  // USERS MANAGEMENT
  // ==========================================
  const handleToggleUserStatus = async (userId: string) => {
    try {
      await api.users.toggleStatus(userId);
      await loadAllAdminData();
    } catch (err: any) {
      alert('Error al cambiar estado de usuario: ' + err.message);
    }
  };

  // ==========================================
  // SETTINGS MANAGEMENT
  // ==========================================
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSettingsSaving(true);
      setSettingsSuccess(false);
      await api.settings.update(settingsForm);
      setSettingsSuccess(true);
      await refreshSettings();
      setTimeout(() => setSettingsSuccess(false), 3000);
    } catch (err: any) {
      alert('Error al guardar configuración: ' + err.message);
    } finally {
      setSettingsSaving(false);
    }
  };

  // ==========================================
  // BACKUP & RESTORE
  // ==========================================
  const handleRestoreBackup = async () => {
    if (!restoreJson.trim()) return;
    try {
      const parsed = JSON.parse(restoreJson);
      const res = await api.backup.restore(parsed);
      setRestoreMessage(res.message);
      await loadAllAdminData();
      await refreshSettings();
      await refreshUser();
    } catch (err: any) {
      alert('Error al restaurar copia de seguridad: ' + err.message);
    }
  };

  // KPI calculations
  const pendingOrdersCount = orders.filter(o => o.status === 'pending_activation').length;
  const openWarrantiesCount = warrantyCases.filter(c => c.status === 'open' || c.status === 'in_review').length;
  const totalSlotsAvailable = inventoryAccounts
    .filter(a => a.status === 'active')
    .reduce((sum, a) => sum + Math.max(0, a.totalSlots - a.consumedSlots), 0);
  const totalSlotsConsumed = inventoryAccounts.reduce((sum, a) => sum + a.consumedSlots, 0);

  const filteredInventoryAccounts = inventoryAccounts.filter(acc => {
    if (selectedInventoryProductFilter === 'all') return true;
    return acc.productId === selectedInventoryProductFilter;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner / Heading */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
            <Layers className="w-3.5 h-3.5" /> Consola de Administración Central
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Panel de Control PrivaKey
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Gestión de usuarios, catálogo con imágenes, cuentas completas, cupos compartidos, saldo y garantías.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-center min-w-[95px]">
            <div className="text-[10px] text-zinc-400 uppercase font-mono">Cupos Libres</div>
            <div className="text-lg font-bold text-emerald-400">{totalSlotsAvailable}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-purple-500/30 text-center min-w-[95px]">
            <div className="text-[10px] text-purple-400 uppercase font-mono">Cuentas</div>
            <div className="text-lg font-bold text-purple-400">{inventoryAccounts.length}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-amber-500/30 text-center min-w-[95px]">
            <div className="text-[10px] text-amber-400 uppercase font-mono flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> Activaciones
            </div>
            <div className="text-lg font-bold text-amber-400">{pendingOrdersCount}</div>
          </div>

          <div className="p-3 rounded-xl bg-zinc-900 border border-indigo-500/30 text-center min-w-[95px]">
            <div className="text-[10px] text-indigo-400 uppercase font-mono flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Garantías
            </div>
            <div className="text-lg font-bold text-indigo-400">{openWarrantiesCount}</div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-zinc-800">
        {[
          { id: 'overview', label: 'Panel & Métricas', icon: BarChart3 },
          { id: 'orders', label: 'Pedidos y Activaciones', icon: KeyRound, badge: pendingOrdersCount },
          { id: 'balance', label: 'Saldo & Movimientos', icon: Wallet },
          { id: 'products', label: 'Catálogo de Productos', icon: ShoppingBag },
          { id: 'inventory', label: 'Cuentas & Cupos', icon: Layers, badge: inventoryAccounts.filter(a => a.status === 'blocked').length ? '⚠️' : undefined },
          { id: 'warranty', label: 'Atención Garantías', icon: ShieldCheck, badge: openWarrantiesCount },
          { id: 'invitations', label: 'Invitaciones de Acceso', icon: Users },
          { id: 'users', label: 'Clientes Registrados', icon: Users },
          { id: 'referrals', label: 'Programa de Referidos', icon: Gift, badge: referralOverview?.stats?.totalPendingRewards ? `${referralOverview.stats.totalPendingRewards} Pend.` : undefined },
          { id: 'banners', label: 'Banners & Avisos', icon: Megaphone, badge: banners.filter(b => b.active).length ? `${banners.filter(b => b.active).length} Act.` : undefined },
          { id: 'settings', label: 'Datos Bancarios & Telegram', icon: Settings },
          { id: 'backup', label: 'Copias de Seguridad', icon: Download },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                isActive
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-950/50'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
              {tab.badge ? (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-amber-400 text-zinc-950">
                  {tab.badge}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* 0. OVERVIEW & METRICS TAB */}
      {/* ======================================================== */}
      {activeTab === 'overview' && (
        <AdminStatsOverview
          orders={orders}
          users={users}
          products={products}
          movements={movements}
          warrantyCases={warrantyCases}
          inventoryAccounts={inventoryAccounts}
          loading={loading}
          onNavigateTab={(tab) => setActiveTab(tab as any)}
          onOpenCreditModal={handleOpenCreditModal}
        />
      )}

      {/* ======================================================== */}
      {/* 1. ORDERS & ACTIVATIONS TAB */}
      {/* ======================================================== */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-bold text-white">Todos los Pedidos y Activaciones</h2>
              <p className="text-xs text-zinc-400">
                Supervisa compras completadas, completa activaciones por correo o cancela y reembolsa pedidos no viables.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Pedido / Fecha</th>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Producto & Presentación</th>
                    <th className="py-3.5 px-4">Importe</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {orders.map(order => {
                    const isPending = order.status === 'pending_activation';
                    const isCompleted = order.status === 'completed';
                    const isCancelled = order.status === 'cancelled';
                    const isProfile = order.presentation === 'profile';

                    return (
                      <tr key={order.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="font-mono font-bold text-zinc-200">{order.id}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{formatDate(order.createdAt)}</div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="font-semibold text-zinc-200">{order.customerName}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {order.customerEmail} ({order.customerCode})
                          </div>
                        </td>

                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-white">{order.productSnapshot.title}</span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                              isProfile 
                                ? 'bg-purple-950 text-purple-300 border border-purple-800' 
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {isProfile ? `Perfil #${order.slotNumber || 1}` : 'Cuenta completa'}
                            </span>
                          </div>
                          <div className="text-[11px] text-zinc-400 flex items-center gap-1 mt-0.5">
                            {order.deliveryMode === 'automatic' ? (
                              <span className="text-emerald-400 font-medium flex items-center gap-1">
                                <Zap className="w-3 h-3" /> Entrega Automática
                              </span>
                            ) : (
                              <span className="text-sky-400 font-medium flex items-center gap-1">
                                <Mail className="w-3 h-3" /> Correo: {order.targetEmail}
                              </span>
                            )}
                          </div>
                          {order.referralCodeApplied && (
                            <div className="flex items-center gap-1.5 mt-1.5">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-950/80 text-amber-300 border border-amber-500/30">
                                <Gift className="w-3 h-3 text-amber-400" /> Ref: {order.referralCodeApplied} {order.referrerName ? `(${order.referrerName})` : ''}
                              </span>
                              {order.referralRewardStatus === 'pending' ? (
                                <button
                                  onClick={() => handleOpenGenerateReward({
                                    referrerUserId: order.referrerUserId || undefined,
                                    referredUserId: order.userId,
                                    sourceType: 'purchase',
                                    sourceId: order.id,
                                    amountCents: order.referralCashbackCents || Math.round(order.priceCents * 0.05),
                                    points: order.referralPoints || Math.round(order.priceCents / 100),
                                    reason: `Comisión por compra de ${order.productSnapshot.title} (Pedido ${order.id})`,
                                  })}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 hover:bg-amber-400 text-zinc-950 transition-colors shadow"
                                >
                                  Generar Comisión
                                </button>
                              ) : order.referralRewardStatus === 'credited' ? (
                                <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-0.5">
                                  <Check className="w-3 h-3" /> Acreditado
                                </span>
                              ) : null}
                            </div>
                          )}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap font-mono font-bold text-sm text-zinc-200">
                          {formatMXN(order.priceCents)}
                        </td>

                        <td className="py-4 px-4 whitespace-nowrap">
                          {isPending && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              Pendiente Activación
                            </span>
                          )}
                          {isCompleted && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Entregado / Activo
                            </span>
                          )}
                          {isCancelled && (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                              Cancelado / Reembolsado
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right whitespace-nowrap space-x-2">
                          {isPending && (
                            <>
                              <button
                                onClick={() => {
                                  setCompletingOrder(order);
                                  setActivationNotes('Activado exitosamente en la plataforma.');
                                  setActivationCredentials('');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow"
                              >
                                Completar Activación
                              </button>
                              <button
                                onClick={() => {
                                  setCancellingOrder(order);
                                  setCancellationReason('Imposible activar en la cuenta especificada');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 text-rose-300 border border-rose-800/80 font-semibold text-xs"
                              >
                                Cancelar y Devolver
                              </button>
                            </>
                          )}
                          {isCompleted && (
                            <button
                              onClick={async () => {
                                const res = await api.orders.getCredentials(order.id);
                                alert(`Credenciales / Notas:\n\n${res.content || res.activationNotes || 'Sin datos adicionales'}`);
                              }}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                            >
                              Ver Credencial
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. BALANCE & MOVEMENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'balance' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Gestión de Saldo y Movimientos</h2>
              <p className="text-xs text-zinc-400">
                Acredita transferencias reportadas por Telegram o realiza correcciones compensatorias sin alterar el historial.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => handleOpenCreditModal()}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5"
              >
                <Plus className="w-4 h-4" />
                <span>Acreditar Saldo SPEI</span>
              </button>

              <button
                onClick={() => handleOpenCompensationModal()}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-4 h-4" />
                <span>Movimiento Compensatorio</span>
              </button>
            </div>
          </div>

          {/* Movements table */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Folio / Fecha</th>
                    <th className="py-3.5 px-4">Usuario</th>
                    <th className="py-3.5 px-4">Tipo</th>
                    <th className="py-3.5 px-4">Referencia Obligatoria</th>
                    <th className="py-3.5 px-4">Motivo Detallado</th>
                    <th className="py-3.5 px-4 text-right">Importe</th>
                    <th className="py-3.5 px-4 text-right">Saldo Tras Movimiento</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {movements.map(mov => {
                    const u = users.find(usr => usr.id === mov.userId);
                    const isPositive = mov.amountCents > 0;

                    return (
                      <tr key={mov.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                          <div className="font-bold text-zinc-200">{mov.id}</div>
                          <div className="text-[10px] text-zinc-500">{formatDate(mov.createdAt)}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-zinc-200">{u?.name || mov.userId}</div>
                          <div className="text-[10px] font-mono text-zinc-400">{u?.customerCode}</div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {mov.type}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-zinc-300">
                          {mov.reference}
                        </td>

                        <td className="py-3.5 px-4 text-zinc-300">
                          {mov.reason}
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono font-bold whitespace-nowrap">
                          <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                            {isPositive ? '+' : ''}
                            {formatMXN(mov.amountCents)}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right font-mono text-zinc-300 whitespace-nowrap">
                          {formatMXN(mov.balanceAfterCents)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 3. PRODUCTS TAB (CATALOG MANAGER WITH IMAGES & PRESENTATIONS) */}
      {/* ======================================================== */}
      {activeTab === 'products' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Catálogo de Productos Digitales</h2>
              <p className="text-xs text-zinc-400">
                Gestiona productos con imágenes, modalidad de entrega y presentación comercial (cuenta completa o perfil).
              </p>
            </div>

            <button
              onClick={handleOpenCreateProduct}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nuevo Producto</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map(prod => {
              const isProfile = prod.presentation === 'profile';

              return (
                <div
                  key={prod.id}
                  className={`rounded-2xl bg-zinc-900 border overflow-hidden flex flex-col justify-between transition-all ${
                    prod.active ? 'border-zinc-800' : 'border-zinc-800/40 opacity-70'
                  }`}
                >
                  <div>
                    {/* Image Header */}
                    <div className="relative w-full h-36 bg-zinc-950 border-b border-zinc-800/80">
                      {prod.imageUrl ? (
                        <img
                          src={prod.imageUrl}
                          alt={prod.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-zinc-600">
                          <ShoppingBag className="w-8 h-8 mb-1" />
                          <span className="text-[10px] font-mono">SIN IMAGEN ASIGNADA</span>
                        </div>
                      )}

                      <div className="absolute top-2 left-2 flex gap-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded shadow ${
                          isProfile ? 'bg-purple-950 text-purple-300 border border-purple-800' : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                        }`}>
                          {isProfile ? 'Perfil' : 'Cuenta completa'}
                        </span>
                        {prod.hasSold && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-900 text-zinc-300 border border-zinc-700">
                            🔒 Con ventas
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2 right-2">
                        <button
                          onClick={() => handleToggleProduct(prod.id)}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                            prod.active
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-zinc-800 text-zinc-500 border-zinc-700'
                          }`}
                        >
                          {prod.active ? 'Activo' : 'Inactivo'}
                        </button>
                      </div>
                    </div>

                    <div className="p-5">
                      <div className="text-[11px] font-mono uppercase text-zinc-400 mb-1">{prod.category}</div>
                      <h3 className="text-base font-bold text-white">{prod.title}</h3>
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2">{prod.description}</p>

                      <div className="mt-4 pt-3 border-t border-zinc-800 text-xs space-y-1.5">
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Precio:</span>
                          <span className="font-mono font-bold text-emerald-400">{formatMXN(prod.priceCents)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Modalidad:</span>
                          <span className="text-zinc-300 font-medium">
                            {prod.deliveryMode === 'automatic' ? '⚡ Entrega Automática' : '✉️ Activación Correo'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Stock disponible:</span>
                          <span className="font-bold text-zinc-200">{prod.availableStock ?? 0} cupos</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-500">Garantía:</span>
                          <span className="text-zinc-300">{prod.warrantyDays} días</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="p-5 pt-0">
                    <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleOpenEditProduct(prod)}
                        className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
                      >
                        Editar Producto
                      </button>

                      {prod.deliveryMode === 'automatic' && (
                        <button
                          onClick={() => {
                            setSelectedInventoryProductFilter(prod.id);
                            setActiveTab('inventory');
                          }}
                          className="flex-1 px-3 py-2 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 text-xs font-semibold flex items-center justify-center gap-1"
                        >
                          <Layers className="w-3.5 h-3.5" />
                          <span>Ver Cuentas</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 4. INVENTORY ACCOUNTS & SHARED QUOTAS TAB */}
      {/* ======================================================== */}
      {activeTab === 'inventory' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                <span>Inventario de Cuentas y Cupos Compartidos</span>
              </h2>
              <p className="text-xs text-zinc-400">
                Cada cuenta conserva sus credenciales y límite de cupos. Las compras consumen cupos en orden FIFO (la más antigua primero).
              </p>
            </div>

            <button
              onClick={() => handleOpenCreateAccount()}
              className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-md flex items-center gap-1.5 self-start sm:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>Nueva Cuenta de Inventario</span>
            </button>
          </div>

          {/* Product Filter Bar */}
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs">
            <span className="text-zinc-400 font-medium">Filtrar por producto:</span>
            <select
              value={selectedInventoryProductFilter}
              onChange={e => setSelectedInventoryProductFilter(e.target.value)}
              className="bg-zinc-950 border border-zinc-750 text-zinc-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-indigo-500"
            >
              <option value="all">Todos los productos automáticos</option>
              {products.filter(p => p.deliveryMode === 'automatic').map(p => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.presentation === 'profile' ? 'Perfil' : 'Cuenta completa'})
                </option>
              ))}
            </select>
          </div>

          {/* Accounts Table */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">ID / Identificador</th>
                    <th className="py-3.5 px-4">Producto Asociado</th>
                    <th className="py-3.5 px-4">Presentación</th>
                    <th className="py-3.5 px-4">Cupos & Capacidad</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones de Gestión</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {filteredInventoryAccounts.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        No hay cuentas de inventario registradas para este filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredInventoryAccounts.map(acc => {
                      const isProfile = acc.presentation === 'profile';
                      const isBlocked = acc.status === 'blocked';
                      const isExhausted = acc.status === 'exhausted' || acc.consumedSlots >= acc.totalSlots;
                      const availableSlots = Math.max(0, acc.totalSlots - acc.consumedSlots);
                      const percent = Math.min(100, Math.round((acc.consumedSlots / acc.totalSlots) * 100));

                      return (
                        <tr key={acc.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="font-mono font-bold text-zinc-200">{acc.id}</div>
                            <div className="text-zinc-300 font-mono font-medium">{acc.identifier}</div>
                            <div className="text-[10px] text-zinc-500 font-mono mt-0.5">{acc.credentialsSnippet}</div>
                          </td>

                          <td className="py-4 px-4">
                            <div className="font-bold text-white">{acc.productTitle}</div>
                            {acc.notes && <div className="text-[11px] text-zinc-400 mt-0.5">{acc.notes}</div>}
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`px-2.5 py-1 rounded text-[11px] font-bold ${
                              isProfile 
                                ? 'bg-purple-950 text-purple-300 border border-purple-800' 
                                : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                            }`}>
                              {isProfile ? 'Perfil (Compartido)' : 'Cuenta completa (1)'}
                            </span>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            <div className="flex items-center gap-2 font-mono">
                              <span className="font-bold text-zinc-200">{acc.consumedSlots} / {acc.totalSlots}</span>
                              <span className="text-zinc-500 text-[10px]">({availableSlots} disponibles)</span>
                            </div>
                            <div className="w-28 h-1.5 bg-zinc-800 rounded-full mt-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  isBlocked ? 'bg-rose-500' : isExhausted ? 'bg-zinc-600' : 'bg-emerald-500'
                                }`}
                                style={{ width: `${percent}%` }}
                              ></div>
                            </div>
                          </td>

                          <td className="py-4 px-4 whitespace-nowrap">
                            {isBlocked ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-950 text-rose-300 border border-rose-800">
                                🚫 Bloqueada
                              </span>
                            ) : isExhausted ? (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                Agotada ({acc.totalSlots} vendidos)
                              </span>
                            ) : (
                              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-800">
                                ✅ Activa
                              </span>
                            )}
                          </td>

                          <td className="py-4 px-4 text-right whitespace-nowrap space-x-1.5">
                            <button
                              onClick={() => handleOpenBuyersModal(acc)}
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                              title="Ver clientes que compraron de esta cuenta"
                            >
                              Ver Compradores ({acc.buyersCount || acc.consumedSlots})
                            </button>

                            <button
                              onClick={() => handleOpenAdjustCapacity(acc)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/60 text-indigo-300 border border-indigo-800/80 text-xs font-semibold"
                              title="Corregir o aumentar cupos sin reducir por debajo de lo vendido"
                            >
                              Ajustar Cupos
                            </button>

                            <button
                              onClick={() => handleOpenUpdateCreds(acc)}
                              className="px-2.5 py-1 rounded-lg bg-amber-950/60 hover:bg-amber-900/60 text-amber-300 border border-amber-800/80 text-xs font-semibold"
                              title="Actualizar credenciales manteniendo registro protegido"
                            >
                              Credenciales
                            </button>

                            <button
                              onClick={() => handleToggleBlockAccount(acc.id)}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold border ${
                                isBlocked 
                                  ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800 hover:bg-emerald-900/60'
                                  : 'bg-rose-950/60 text-rose-300 border-rose-800 hover:bg-rose-900/60'
                              }`}
                              title={isBlocked ? 'Reactivar cuenta para ventas' : 'Detener nuevas ventas de esta cuenta'}
                            >
                              {isBlocked ? 'Desbloquear' : 'Bloquear'}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 5. WARRANTY CASES TAB */}
      {/* ======================================================== */}
      {activeTab === 'warranty' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Casos de Garantía y Reclamos</h2>
              <p className="text-xs text-zinc-400">
                Conversa con los clientes y resuelve con reemplazo de clave, nueva activación, devolución de saldo o rechazo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[500px]">
            {/* Left cases list */}
            <div className="lg:col-span-5 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3 overflow-y-auto max-h-[600px]">
              {warrantyCases.map(c => {
                const isSelected = resolvingCase?.id === c.id;
                return (
                  <div
                    key={c.id}
                    onClick={() => setResolvingCase(c)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-zinc-850 border-indigo-500/80 shadow'
                        : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <span className="font-mono text-xs font-bold text-indigo-400">{c.id}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {c.status}
                      </span>
                    </div>
                    <div className="text-sm font-bold text-white">{c.subject}</div>
                    <div className="text-xs text-zinc-400">
                      Cliente: {c.customerName} ({c.customerCode})
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono mt-2 flex justify-between">
                      <span>Pedido: {c.orderId}</span>
                      <span>{c.messages.length} mensajes</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Right case detail & resolver */}
            {resolvingCase ? (
              <div className="lg:col-span-7 rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between space-y-5">
                <div>
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                    <div>
                      <div className="font-mono text-xs font-bold text-indigo-400">{resolvingCase.id}</div>
                      <h3 className="text-lg font-bold text-white">{resolvingCase.subject}</h3>
                      <div className="text-xs text-zinc-400 font-mono">
                        Cliente: {resolvingCase.customerName} • {resolvingCase.customerEmail}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-3 py-1 rounded-full bg-zinc-800 text-amber-300 border border-zinc-700">
                      {resolvingCase.status}
                    </span>
                  </div>

                  {/* Messages list */}
                  <div className="mt-4 p-4 rounded-xl bg-zinc-950/80 border border-zinc-800 space-y-3 max-h-[220px] overflow-y-auto text-xs">
                    {resolvingCase.messages.map(msg => (
                      <div key={msg.id} className="p-2.5 rounded-lg bg-zinc-900 border border-zinc-850 space-y-1">
                        <div className="flex justify-between text-[10px] text-zinc-400 font-mono">
                          <strong className={msg.senderRole === 'admin' ? 'text-indigo-400' : 'text-emerald-400'}>
                            {msg.senderName} ({msg.senderRole})
                          </strong>
                          <span>{formatDate(msg.timestamp)}</span>
                        </div>
                        <p className="text-zinc-200 whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    ))}
                  </div>

                  {/* Quick message reply form */}
                  <form onSubmit={handleSendAdminMessage} className="mt-3 flex gap-2">
                    <input
                      type="text"
                      value={adminReplyMessage}
                      onChange={e => setAdminReplyMessage(e.target.value)}
                      placeholder="Escribe una respuesta para el cliente..."
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                    />
                    <button
                      type="submit"
                      disabled={!adminReplyMessage.trim()}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold text-xs flex items-center gap-1.5"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Responder</span>
                    </button>
                  </form>
                </div>

                {/* Resolution Action Box */}
                <div className="pt-4 border-t border-zinc-800 space-y-4">
                  <div className="text-xs font-bold text-zinc-300 uppercase font-mono">
                    Emitir Resolución Oficial de Garantía
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    {[
                      { id: 'replacement', label: 'Reemplazo (Consume Cupo)', color: 'border-emerald-500/40 text-emerald-300' },
                      { id: 'new_activation', label: 'Reactivar Correo', color: 'border-sky-500/40 text-sky-300' },
                      { id: 'refund', label: 'Devolver a Saldo', color: 'border-amber-500/40 text-amber-300' },
                      { id: 'rejected', label: 'Rechazo Justificado', color: 'border-rose-500/40 text-rose-300' },
                    ].map(type => (
                      <button
                        key={type.id}
                        type="button"
                        onClick={() => setResolutionType(type.id as any)}
                        className={`p-2 rounded-xl border text-center font-semibold transition-all ${
                          resolutionType === type.id
                            ? `bg-zinc-800 ${type.color} ring-1 ring-white/20`
                            : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
                        }`}
                      >
                        {type.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    rows={2}
                    value={resolutionNotes}
                    onChange={e => setResolutionNotes(e.target.value)}
                    placeholder="Justificación / notas oficiales de la resolución para el cliente..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />

                  <button
                    onClick={handleResolveWarranty}
                    className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                  >
                    Confirmar Resolución y Cerrar Caso
                  </button>
                </div>
              </div>
            ) : (
              <div className="lg:col-span-7 rounded-2xl bg-zinc-900 border border-zinc-800 p-12 text-center text-zinc-500 flex flex-col items-center justify-center">
                <ShieldCheck className="w-12 h-12 text-zinc-600 mb-2" />
                <p className="text-sm">Selecciona un caso de la lista para atender al cliente.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 6. INVITATIONS TAB */}
      {/* ======================================================== */}
      {activeTab === 'invitations' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Invitaciones de Un Solo Uso</h2>
              <p className="text-xs text-zinc-400">
                Genera accesos VIP para nuevos compradores. Cada enlace o código solo puede ser canjeado una vez.
              </p>
            </div>
          </div>

          <form onSubmit={handleCreateInvite} className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <input
              type="text"
              value={newInviteNote}
              onChange={e => setNewInviteNote(e.target.value)}
              placeholder="Nota interna (ej. Cliente Telegram @Carlos)"
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            <input
              type="email"
              value={newInviteEmail}
              onChange={e => setNewInviteEmail(e.target.value)}
              placeholder="Correo reservado (opcional)"
              className="bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
            />
            <button
              type="submit"
              disabled={isCreatingInvite}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreatingInvite ? 'Generando...' : 'Crear Invitación'}</span>
            </button>
          </form>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Código / Enlace</th>
                    <th className="py-3.5 px-4">Nota / Asignación</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Canjeado Por</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {invitations.map(inv => {
                    const isActive = inv.status === 'active';
                    return (
                      <tr key={inv.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono font-bold text-indigo-400">
                          {inv.code}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {inv.note || '-'}
                        </td>
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isActive ? (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              Disponible
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-zinc-800 text-zinc-400 border border-zinc-700">
                              Canjeada
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-zinc-300">
                          {inv.redeemedUserName ? `${inv.redeemedUserName} (${inv.redeemedUserEmail})` : '-'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          {isActive && (
                            <>
                              <button
                                onClick={() => handleCopyInvite(inv.code)}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
                              >
                                {copiedInvite === inv.code ? 'Copiado!' : 'Copiar'}
                              </button>
                              <button
                                onClick={() => handleRevokeInvite(inv.id)}
                                className="px-2.5 py-1 rounded-lg bg-rose-950/60 text-rose-300 border border-rose-800 text-xs font-semibold"
                              >
                                Revocar
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 7. USERS TAB */}
      {/* ======================================================== */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-white">Clientes y Usuarios Registrados</h2>
              <p className="text-xs text-zinc-400">
                Consulta folios de cliente (CLI-XXXX), saldos disponibles y suspende accesos cuando sea necesario.
              </p>
            </div>
          </div>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Identificador</th>
                    <th className="py-3.5 px-4">Nombre / Correo</th>
                    <th className="py-3.5 px-4">Rol</th>
                    <th className="py-3.5 px-4">Saldo Disponible</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {users.map(u => {
                    const isActive = u.status === 'active';
                    return (
                      <tr key={u.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-bold text-zinc-200">
                          {u.customerCode}
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-white">{u.name}</div>
                          <div className="text-[11px] text-zinc-400 font-mono">{u.email}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                            {u.role}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-mono font-bold text-sm text-emerald-400">
                          {formatMXN(u.balanceCents)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                              isActive
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                            }`}
                          >
                            {isActive ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          {u.role === 'client' && (
                            <>
                              <button
                                onClick={() => handleOpenCreditModal(u.id)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-semibold"
                              >
                                Acreditar Saldo
                              </button>
                              <button
                                onClick={() => handleToggleUserStatus(u.id)}
                                className={`px-2.5 py-1 rounded-lg text-xs font-semibold ${
                                  isActive
                                    ? 'bg-rose-950/50 text-rose-300 border border-rose-800 hover:bg-rose-900/50'
                                    : 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                }`}
                              >
                                {isActive ? 'Suspender' : 'Reactivar'}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8. SETTINGS TAB */}
      {/* ======================================================== */}
      {activeTab === 'settings' && (
        <div className="max-w-4xl space-y-6">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-7 space-y-6">
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <span>Configuración de Datos Bancarios y Telegram</span>
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Estos datos son mostrados al cliente en la sección de Recargar Saldo.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Nombre Comercial de la Tienda:</label>
                  <input
                    type="text"
                    value={settingsForm.storeName}
                    onChange={e => setSettingsForm({ ...settingsForm, storeName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Banco Receptor (SPEI):</label>
                  <input
                    type="text"
                    value={settingsForm.bankName}
                    onChange={e => setSettingsForm({ ...settingsForm, bankName: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">CLABE Interbancaria (18 dígitos):</label>
                  <input
                    type="text"
                    value={settingsForm.clabe}
                    onChange={e => setSettingsForm({ ...settingsForm, clabe: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Titular de la Cuenta:</label>
                  <input
                    type="text"
                    value={settingsForm.accountHolder}
                    onChange={e => setSettingsForm({ ...settingsForm, accountHolder: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Usuario de Telegram:</label>
                  <input
                    type="text"
                    value={settingsForm.telegramUsername}
                    onChange={e => setSettingsForm({ ...settingsForm, telegramUsername: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-sky-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Enlace Directo de Telegram:</label>
                  <input
                    type="text"
                    value={settingsForm.telegramLink}
                    onChange={e => setSettingsForm({ ...settingsForm, telegramLink: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-sky-400 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Instrucciones para Depósito:</label>
                <textarea
                  rows={3}
                  value={settingsForm.depositInstructions}
                  onChange={e => setSettingsForm({ ...settingsForm, depositInstructions: e.target.value })}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {settingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Configuración actualizada correctamente.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={settingsSaving}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center gap-2"
              >
                {settingsSaving ? 'Guardando...' : 'Guardar Configuración Oficial'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8b. REFERRALS PROGRAM TAB */}
      {/* ======================================================== */}
      {activeTab === 'referrals' && (
        <div className="space-y-8">
          {/* Header & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
                <Gift className="w-3.5 h-3.5" /> Programa de Referidos & Recompensas
              </div>
              <h2 className="text-xl font-bold text-white">Comisiones, Puntos y Cashback por Recomendación</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Monitorea recomendaciones entre clientes, audita compras de amigos referidos, calcula comisiones transparentes y distribuye bonificaciones individuales o masivas.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                onClick={() => handleOpenBatchDistribute()}
                className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-amber-500/40 hover:bg-amber-950/40 text-amber-300 font-bold text-xs shadow flex items-center gap-2 transition-all"
                title="Distribuir puntos o cashback a todos los referentes calificados"
              >
                <Coins className="w-4 h-4 text-amber-400" />
                <span>Distribución Masiva</span>
              </button>

              <button
                onClick={() => handleOpenGenerateReward()}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-zinc-950 font-bold text-xs shadow-lg shadow-amber-950/40 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Procesar Comisión / Bonificación</span>
              </button>

              <button
                onClick={loadAllAdminData}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-indigo-400" /> Referentes Activos
              </div>
              <div className="text-2xl font-bold text-white font-mono">
                {referralOverview?.stats?.totalReferrersCount || referralOverview?.referrers?.length || 0}
              </div>
              <div className="text-[10px] text-zinc-500">Clientes con código propio</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <UserCheck className="w-3.5 h-3.5 text-emerald-400" /> Amigos Vinculados
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {referralOverview?.stats?.totalReferredUsersCount || 0}
              </div>
              <div className="text-[10px] text-zinc-500">Registrados por recomendación</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> Puntos Otorgados
              </div>
              <div className="text-2xl font-bold text-amber-400 font-mono">
                {(referralOverview?.stats?.totalPointsGranted || 0).toLocaleString()}
              </div>
              <div className="text-[10px] text-zinc-500">Puntos acumulados p/canje</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-1">
              <div className="text-[11px] text-zinc-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <Wallet className="w-3.5 h-3.5 text-emerald-400" /> Cashback Pagado
              </div>
              <div className="text-2xl font-bold text-emerald-400 font-mono">
                {formatMXN(referralOverview?.stats?.totalCashbackCents || 0)}
              </div>
              <div className="text-[10px] text-zinc-500">Acreditado a saldos directos</div>
            </div>

            <div className="p-4 rounded-2xl bg-zinc-900 border border-amber-500/30 space-y-1 bg-amber-950/10">
              <div className="text-[11px] text-amber-400 font-medium uppercase tracking-wider flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-amber-400" /> Pendientes Panel
              </div>
              <div className="text-2xl font-bold text-amber-300 font-mono">
                {referralOverview?.stats?.totalPendingRewards || 0}
              </div>
              <div className="text-[10px] text-amber-400/80">Esperando aprobación</div>
            </div>
          </div>

          {/* Section: Pending Rewards awaiting Admin Action */}
          {referralOverview?.rewards?.filter(r => r.status === 'pending').length ? (
            <div className="rounded-2xl bg-amber-950/20 border border-amber-500/40 p-5 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping"></span>
                  <h3 className="text-sm font-bold text-amber-300">
                    Bonificaciones Pendientes por Aprobar o Acreditar ({referralOverview.rewards.filter(r => r.status === 'pending').length})
                  </h3>
                </div>
                <span className="text-xs text-amber-400 font-medium">
                  El cliente recibirá saldo o puntos tras tu confirmación
                </span>
              </div>

              <div className="divide-y divide-zinc-800 overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="text-[10px] font-mono uppercase text-zinc-400 bg-zinc-950/60">
                    <tr>
                      <th className="py-2.5 px-3">Folio</th>
                      <th className="py-2.5 px-3">Referente Beneficiario</th>
                      <th className="py-2.5 px-3">Origen / Transacción</th>
                      <th className="py-2.5 px-3">Monto Base</th>
                      <th className="py-2.5 px-3">Recompensa Propuesta</th>
                      <th className="py-2.5 px-3 text-right">Acciones de Aprobación</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60">
                    {referralOverview.rewards.filter(r => r.status === 'pending').map(reward => (
                      <tr key={reward.id} className="hover:bg-amber-950/30 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-zinc-300">{reward.id}</td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-white">{reward.referrerName}</div>
                          <div className="text-[11px] font-mono text-amber-400">{reward.referrerCode}</div>
                        </td>
                        <td className="py-3 px-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 uppercase">
                            {reward.sourceType === 'purchase' ? '🛒 Compra' : reward.sourceType === 'recharge' ? '💳 Recarga SPEI' : '🎁 Manual'}
                          </span>
                          {reward.referredUserName && (
                            <div className="text-[11px] text-zinc-400 mt-0.5">
                              Amigo: {reward.referredUserName}
                            </div>
                          )}
                          {reward.notes && (
                            <div className="text-[10px] text-zinc-500 italic mt-0.5">{reward.notes}</div>
                          )}
                        </td>
                        <td className="py-3 px-3 font-mono text-zinc-300 font-medium">
                          {reward.sourceAmountCents ? formatMXN(reward.sourceAmountCents) : '-'}
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-mono font-bold text-emerald-400">
                            {formatMXN(reward.cashbackCents)}
                          </div>
                          <div className="text-[10px] font-mono text-amber-400">
                            o {reward.pointsEarned} puntos
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleApprovePendingReward(reward, 'cashback')}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow inline-flex items-center gap-1"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Acreditar Saldo ({formatMXN(reward.cashbackCents)})</span>
                          </button>

                          <button
                            onClick={() => handleApprovePendingReward(reward, 'points')}
                            className="px-2.5 py-1 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow inline-flex items-center gap-1"
                          >
                            <Coins className="w-3.5 h-3.5" />
                            <span>Dar Puntos ({reward.pointsEarned})</span>
                          </button>

                          <button
                            onClick={() => handleRejectPendingReward(reward)}
                            className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-rose-950 hover:text-rose-300 text-zinc-400 text-xs font-semibold"
                          >
                            Rechazar
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ) : null}

          {/* Section: Referrers Table */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-400" />
                  <span>Clientes y sus Códigos de Referido</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Cada cliente tiene su código asignado para recomendar amigos y acumular comisiones o puntos.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Cliente</th>
                    <th className="py-3.5 px-4">Código de Referido</th>
                    <th className="py-3.5 px-4">Referido Por</th>
                    <th className="py-3.5 px-4 text-center">Amigos Vinculados</th>
                    <th className="py-3.5 px-4">Puntos Acumulados</th>
                    <th className="py-3.5 px-4">Ganancias Saldo (Histórico)</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {users.filter(u => u.role === 'client').map(client => {
                    const clientCode = client.referralCode || client.customerCode;
                    const referrerData = referralOverview?.referrers?.find(r => r.user.id === client.id);
                    const referralsCount = referrerData?.referredCount ?? users.filter(u => u.referredByCode === clientCode || u.referredByCode === client.customerCode).length;
                    const isExpanded = expandedReferrerIds.has(client.id);
                    const details = referrerData?.referredUsersDetails || [];

                    return (
                      <React.Fragment key={client.id}>
                        <tr className="hover:bg-zinc-850/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-2">
                              {referralsCount > 0 ? (
                                <button
                                  type="button"
                                  onClick={() => handleToggleReferrerExpand(client.id)}
                                  className="p-1 rounded-md bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                                  title={isExpanded ? 'Ocultar red de referidos' : 'Ver amigos y transacciones generadas'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              ) : (
                                <span className="w-5" />
                              )}
                              <div>
                                <div className="font-semibold text-white">{client.name}</div>
                                <div className="text-[11px] font-mono text-zinc-400">{client.email}</div>
                                <div className="text-[10px] font-mono text-zinc-500">Folio: {client.customerCode}</div>
                              </div>
                            </div>
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-zinc-950 border border-amber-500/30 font-mono font-bold text-amber-400">
                              <Gift className="w-3.5 h-3.5 text-amber-400" />
                              {clientCode}
                            </span>
                          </td>

                          <td className="py-3.5 px-4">
                            {client.referredByCode ? (
                              <span className="inline-flex items-center gap-1 text-zinc-300 font-mono text-xs">
                                <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                                {client.referredByCode}
                              </span>
                            ) : (
                              <span className="text-zinc-500 text-[11px]">Orgánico (Directo)</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-center">
                            <button
                              type="button"
                              onClick={() => referralsCount > 0 && handleToggleReferrerExpand(client.id)}
                              disabled={referralsCount === 0}
                              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold font-mono transition-colors ${
                                referralsCount > 0
                                  ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 cursor-pointer'
                                  : 'bg-zinc-800 text-zinc-500 border border-zinc-700/40 cursor-default'
                              }`}
                            >
                              <span>{referralsCount} amigos</span>
                              {referralsCount > 0 && (
                                isExpanded ? <ChevronUp className="w-3 h-3 ml-0.5" /> : <ChevronDown className="w-3 h-3 ml-0.5" />
                              )}
                            </button>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-amber-400">
                            <div className="flex items-center gap-1">
                              <Coins className="w-3.5 h-3.5" />
                              <span>{(client.referralPoints || 0).toLocaleString()} pts</span>
                            </div>
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold text-emerald-400">
                            {formatMXN(client.referralEarningsCents || 0)}
                          </td>

                          <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                            <button
                              onClick={() => handleOpenGenerateReward({
                                referrerUserId: client.id,
                                reason: `Comisión de referidos para ${client.name}`,
                              })}
                              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow inline-flex items-center gap-1.5 transition-all"
                              title="Procesar cashback o puntos por compras o recomendaciones"
                            >
                              <Gift className="w-3.5 h-3.5" />
                              <span>Procesar Comisión</span>
                            </button>
                          </td>
                        </tr>

                        {/* Expandable row: Transparency Audit of Referred Friends and Orders */}
                        {isExpanded && (
                          <tr className="bg-zinc-950/70 border-b border-zinc-800 animate-in fade-in">
                            <td colSpan={7} className="p-4 sm:p-5">
                              <div className="rounded-xl bg-zinc-900/90 border border-zinc-800 p-4 space-y-4">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                                  <div>
                                    <div className="text-xs font-bold text-white flex items-center gap-2">
                                      <Users className="w-4 h-4 text-amber-400" />
                                      <span>Desglose Transparente de Recomendaciones de {client.name}</span>
                                    </div>
                                    <p className="text-[11px] text-zinc-400 mt-0.5">
                                      Compras y actividad generada por sus amigos. Puedes calcular y acreditar comisión por orden con un solo clic.
                                    </p>
                                  </div>

                                  <div className="text-xs font-mono text-zinc-400 flex items-center gap-3">
                                    <span>Tasa Base Actual: <strong className="text-emerald-400">{referralSettingsForm.referralCommissionRate}%</strong></span>
                                    <span>•</span>
                                    <span>Puntos Base: <strong className="text-amber-400">{referralSettingsForm.referralPointsPerMXN} pt / $1 MXN</strong></span>
                                  </div>
                                </div>

                                {details.length === 0 ? (
                                  <div className="text-center py-4 text-xs text-zinc-500">
                                    No se encontraron amigos vinculados a este referente.
                                  </div>
                                ) : (
                                  <div className="space-y-4">
                                    {details.map(friend => (
                                      <div key={friend.id} className="rounded-xl bg-zinc-950/80 border border-zinc-800/80 p-3.5 space-y-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                                          <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-indigo-500/20 text-indigo-300 font-mono font-bold text-[10px] flex items-center justify-center">
                                              {friend.name.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                              <span className="font-bold text-zinc-100">{friend.name}</span>
                                              <span className="text-zinc-500 font-mono text-[11px] ml-2">Folio: {friend.customerCode}</span>
                                              <span className="text-zinc-500 text-[11px] ml-2">({friend.email})</span>
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-3 text-xs font-mono">
                                            <span className="text-zinc-400">Total Comprado: <strong className="text-emerald-400">{formatMXN(friend.totalSpentCents)}</strong></span>
                                            <span className="text-zinc-500">({friend.ordersCount} compras)</span>
                                          </div>
                                        </div>

                                        {friend.orders && friend.orders.length > 0 ? (
                                          <div className="overflow-x-auto">
                                            <table className="w-full text-left text-[11px]">
                                              <thead className="bg-zinc-900/60 text-zinc-400 font-mono uppercase text-[9px]">
                                                <tr>
                                                  <th className="py-2 px-3">Pedido</th>
                                                  <th className="py-2 px-3">Producto</th>
                                                  <th className="py-2 px-3">Monto Base</th>
                                                  <th className="py-2 px-3">Comisión Estimada ({referralSettingsForm.referralCommissionRate}%)</th>
                                                  <th className="py-2 px-3">Estado Comisión</th>
                                                  <th className="py-2 px-3 text-right">Acción Transparente</th>
                                                </tr>
                                              </thead>
                                              <tbody className="divide-y divide-zinc-900">
                                                {friend.orders.map(order => {
                                                  const isCredited = order.referralRewardStatus === 'credited';
                                                  const suggestedCashCents = Math.round((order.priceCents * (referralSettingsForm.referralCommissionRate || 5)) / 100);
                                                  return (
                                                    <tr key={order.id} className="hover:bg-zinc-900/40 transition-colors">
                                                      <td className="py-2 px-3 font-mono font-bold text-zinc-300">{order.id}</td>
                                                      <td className="py-2 px-3 text-zinc-200">{order.productTitle}</td>
                                                      <td className="py-2 px-3 font-mono font-medium text-zinc-100">{formatMXN(order.priceCents)}</td>
                                                      <td className="py-2 px-3 font-mono text-emerald-400 font-bold">
                                                        {formatMXN(suggestedCashCents)}
                                                      </td>
                                                      <td className="py-2 px-3">
                                                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                                                          isCredited 
                                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                                        }`}>
                                                          {isCredited ? 'Acreditada' : 'Pendiente / No Acreditada'}
                                                        </span>
                                                      </td>
                                                      <td className="py-2 px-3 text-right">
                                                        <button
                                                          type="button"
                                                          onClick={() => handleSelectReferredOrder(order, friend, client.name)}
                                                          className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-emerald-600 hover:text-white text-emerald-400 font-semibold text-[10px] transition-colors inline-flex items-center gap-1 border border-zinc-700"
                                                        >
                                                          <Coins className="w-3 h-3" />
                                                          <span>Calcular & Acreditar</span>
                                                        </button>
                                                      </td>
                                                    </tr>
                                                  );
                                                })}
                                              </tbody>
                                            </table>
                                          </div>
                                        ) : (
                                          <div className="text-[11px] text-zinc-500 italic p-2 bg-zinc-900/40 rounded-lg">
                                            Este amigo aún no ha realizado pedidos completados.
                                          </div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Rewards History */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Coins className="w-5 h-5 text-amber-400" />
                  <span>Historial de Comisiones y Puntos Generados</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Registro de todas las bonificaciones otorgadas a referentes por compras, recargas y ajustes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Folio / Fecha</th>
                    <th className="py-3.5 px-4">Referente Beneficiario</th>
                    <th className="py-3.5 px-4">Amigo Recomendado</th>
                    <th className="py-3.5 px-4">Origen</th>
                    <th className="py-3.5 px-4">Recompensa Otorgada</th>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Detalle / Notas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {(!referralOverview?.rewards || referralOverview.rewards.length === 0) ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500">
                        Aún no hay recompensas registradas en el historial.
                      </td>
                    </tr>
                  ) : (
                    referralOverview.rewards.map(reward => {
                      const isPending = reward.status === 'pending';
                      const isApproved = reward.status === 'approved';
                      return (
                        <tr key={reward.id} className="hover:bg-zinc-850/40 transition-colors">
                          <td className="py-3.5 px-4">
                            <div className="font-mono font-bold text-zinc-200">{reward.id}</div>
                            <div className="text-[10px] text-zinc-500 font-mono">{formatDate(reward.createdAt)}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{reward.referrerName}</div>
                            <div className="text-[11px] font-mono text-amber-400">{reward.referrerCode}</div>
                          </td>

                          <td className="py-3.5 px-4">
                            {reward.referredUserName ? (
                              <div>
                                <span className="font-medium text-zinc-200">{reward.referredUserName}</span>
                                {reward.referredCustomerCode && (
                                  <span className="text-[10px] font-mono text-zinc-400 block">{reward.referredCustomerCode}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-zinc-500">-</span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-zinc-800 text-zinc-300 uppercase">
                              {reward.sourceType === 'purchase' ? '🛒 Compra' : reward.sourceType === 'recharge' ? '💳 Recarga SPEI' : '🎁 Manual'}
                            </span>
                            {reward.sourceAmountCents ? (
                              <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                                Base: {formatMXN(reward.sourceAmountCents)}
                              </div>
                            ) : null}
                          </td>

                          <td className="py-3.5 px-4 font-mono font-bold">
                            {reward.rewardType === 'cashback' ? (
                              <span className="text-emerald-400">{formatMXN(reward.cashbackCents)} MXN</span>
                            ) : reward.rewardType === 'points' ? (
                              <span className="text-amber-400">{reward.pointsEarned} pts</span>
                            ) : (
                              <div className="space-y-0.5">
                                <span className="text-emerald-400 block">{formatMXN(reward.cashbackCents)}</span>
                                <span className="text-amber-400 text-[10px] block">+{reward.pointsEarned} pts</span>
                              </div>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                                isApproved
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                                  : isPending
                                  ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                                  : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                              }`}
                            >
                              {isApproved ? 'Acreditado a Saldo' : isPending ? 'Pendiente Aprobación' : 'Rechazado'}
                            </span>
                          </td>

                          <td className="py-3.5 px-4 text-zinc-400 max-w-xs truncate text-[11px]">
                            {reward.notes || '-'}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section: Referral Settings */}
          <div className="max-w-4xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-7 space-y-6">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Settings className="w-5 h-5 text-indigo-400" />
                <span>Configuración y Reglas del Programa de Referidos</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-1">
                Define el porcentaje de comisión, la entrega de puntos y si deseas que las bonificaciones se acrediten de forma automática o requieran tu autorización manual.
              </p>
            </div>

            <form onSubmit={handleSaveReferralSettings} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Active switch */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>Programa de Referidos Activo en la Plataforma</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      Permite a los clientes invitar amigos con su código y recibir beneficios.
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={referralSettingsForm.referralProgramEnabled}
                      onChange={e => setReferralSettingsForm({ ...referralSettingsForm, referralProgramEnabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                {/* Commission Rate */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Porcentaje de Comisión / Cashback (%):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="100"
                      required
                      value={referralSettingsForm.referralCommissionRate}
                      onChange={e => setReferralSettingsForm({ ...referralSettingsForm, referralCommissionRate: parseFloat(e.target.value || '0') })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-zinc-500 font-mono">%</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Ejemplo: Al 10%, si un referido compra $200 MXN, el referente gana $20 MXN de cashback.
                  </p>
                </div>

                {/* Points Per MXN */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Puntos Otorgados por cada $1 MXN gastado:
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="0"
                    required
                    value={referralSettingsForm.referralPointsPerMXN}
                    onChange={e => setReferralSettingsForm({ ...referralSettingsForm, referralPointsPerMXN: parseInt(e.target.value || '0') })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-indigo-500"
                  />
                  <p className="text-[11px] text-zinc-500 mt-1">
                    Ejemplo: Con 1 punto por peso, una recarga de $150 otorga 150 puntos al referente.
                  </p>
                </div>

                {/* Reward Type Default */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Modalidad Predeterminada de Recompensa:
                  </label>
                  <select
                    value={referralSettingsForm.referralRewardType}
                    onChange={e => setReferralSettingsForm({ ...referralSettingsForm, referralRewardType: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="cashback">Solo Cashback directo a saldo interno ($ MXN)</option>
                    <option value="points">Solo Puntos canjeables por saldo</option>
                    <option value="both">Ambos (Cashback a saldo + Puntos de fidelidad)</option>
                  </select>
                </div>

                {/* Points Exchange Rate */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tasa de Canje de Puntos (Centavos por Punto):
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="1"
                      min="1"
                      required
                      value={referralSettingsForm.pointsExchangeRateCents}
                      onChange={e => setReferralSettingsForm({ ...referralSettingsForm, pointsExchangeRateCents: parseInt(e.target.value || '10') })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-indigo-500"
                    />
                    <span className="absolute right-3 top-2 text-xs text-zinc-500 font-mono">¢ MXN</span>
                  </div>
                  <p className="text-[11px] text-zinc-500 mt-1">
                    {referralSettingsForm.pointsExchangeRateCents} centavos = 100 puntos equivalen a {formatMXN(100 * referralSettingsForm.pointsExchangeRateCents)} de saldo para compras.
                  </p>
                </div>

                {/* Approval mode switch */}
                <div className="sm:col-span-2 p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <div className="text-xs font-bold text-white flex items-center gap-2">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>Acreditación Automática Directa</span>
                    </div>
                    <div className="text-[11px] text-zinc-400">
                      {referralSettingsForm.autoCreditRewards 
                        ? 'Las comisiones se acreditan inmediatamente al concretarse el pedido/recarga.'
                        : 'Requerir que el administrador las genere o autorice manualmente desde este panel.'}
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={referralSettingsForm.autoCreditRewards}
                      onChange={e => setReferralSettingsForm({ ...referralSettingsForm, autoCreditRewards: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                  </label>
                </div>
              </div>

              {refSettingsSuccess && (
                <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Configuración de referidos guardada y sincronizada exitosamente.</span>
                </div>
              )}

              <button
                type="submit"
                disabled={savingRefSettings}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow flex items-center gap-2"
              >
                {savingRefSettings ? 'Guardando...' : 'Guardar Parámetros de Referidos'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* 8c. BANNERS & ANNOUNCEMENTS TAB */}
      {/* ======================================================== */}
      {activeTab === 'banners' && (
        <div className="space-y-8">
          {/* Header & Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mb-2">
                <Megaphone className="w-3.5 h-3.5" /> Banners & Avisos Informativos
              </div>
              <h2 className="text-xl font-bold text-white">Avisos Personalizables para Clientes</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Publica avisos en tiempo real: anuncios de mejoras, beneficios por unirse al canal de referidos, promociones exclusivas o alertas del sistema.
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleOpenCreateBanner()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-950/40 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Crear Nuevo Banner</span>
              </button>

              <button
                onClick={loadAllAdminData}
                className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white transition-colors"
                title="Actualizar datos"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick Preset Templates */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
            <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Plantillas Rápidas Preconfiguradas</span>
            </div>
            <p className="text-[11px] text-zinc-400">
              Crea avisos sugeridos con un solo clic y personalízalos según tus necesidades comerciales.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
              <button
                onClick={() => handleOpenCreateBanner({
                  title: 'Canal Exclusivo de Referidos en Telegram',
                  message: '¿Ya estás en nuestro canal oficial de referidos? Únete ahora y recibe hasta 10% de descuento en tus compras, bonificaciones anticipadas y comisiones exclusivas por recomendar amigos.',
                  badgeText: 'Beneficio Exclusivo',
                  type: 'referral',
                  active: true,
                  priority: 1,
                  dismissible: true,
                  linkUrl: settings?.telegramLink || 'https://t.me/PrivaKeySoporte',
                  linkText: 'Unirme al Canal de Referidos',
                  iconName: 'Gift',
                  targetAudience: 'all',
                })}
                className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 hover:bg-amber-950/40 transition-colors text-left space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-amber-400" />
                    Canal de Referidos & Descuento
                  </span>
                  <Plus className="w-3.5 h-3.5 text-amber-400 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[10px] text-zinc-400">
                  Aviso para invitar clientes al canal de Telegram y otorgarles descuento o bonos.
                </p>
              </button>

              <button
                onClick={() => handleOpenCreateBanner({
                  title: 'Novedades y Mejoras en PrivaKey',
                  message: 'Hemos optimizado el sistema de entrega automática, acreditación ágil de saldo SPEI y módulo de recompensas transparentes.',
                  badgeText: 'Novedades & Mejoras',
                  type: 'announcement',
                  active: true,
                  priority: 2,
                  dismissible: true,
                  linkUrl: 'catalogo',
                  linkText: 'Ver Catálogo',
                  iconName: 'Sparkles',
                  targetAudience: 'all',
                })}
                className="p-3.5 rounded-xl bg-purple-950/20 border border-purple-500/30 hover:bg-purple-950/40 transition-colors text-left space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-300 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                    Novedades & Mejoras
                  </span>
                  <Plus className="w-3.5 h-3.5 text-purple-400 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[10px] text-zinc-400">
                  Comunica actualizaciones, nuevos productos en catálogo o mejoras de velocidad.
                </p>
              </button>

              <button
                onClick={() => handleOpenCreateBanner({
                  title: 'Promoción de Recargas SPEI',
                  message: 'Recarga saldo este fin de semana y recibe puntos de fidelidad extra para canjear por productos de streaming y software.',
                  badgeText: 'Promoción Especial',
                  type: 'promo',
                  active: true,
                  priority: 3,
                  dismissible: true,
                  linkUrl: 'recargar',
                  linkText: 'Recargar Saldo',
                  iconName: 'Coins',
                  targetAudience: 'all',
                })}
                className="p-3.5 rounded-xl bg-emerald-950/20 border border-emerald-500/30 hover:bg-emerald-950/40 transition-colors text-left space-y-1.5 group"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    Promoción de Recargas
                  </span>
                  <Plus className="w-3.5 h-3.5 text-emerald-400 opacity-60 group-hover:opacity-100" />
                </div>
                <p className="text-[10px] text-zinc-400">
                  Incentiva la recarga de saldo SPEI con puntos adicionales o beneficios de compra.
                </p>
              </button>
            </div>
          </div>

          {/* List of Existing Banners */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl space-y-4 p-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-400" />
                  <span>Banners Configurados en el Sistema</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Los avisos con estado activo se muestran inmediatamente en el panel y vista de tus clientes.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">Estado</th>
                    <th className="py-3.5 px-4">Tipo & Badge</th>
                    <th className="py-3.5 px-4">Título y Mensaje</th>
                    <th className="py-3.5 px-4">Enlace / Botón CTA</th>
                    <th className="py-3.5 px-4 text-center">Prioridad</th>
                    <th className="py-3.5 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {banners.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-zinc-500">
                        No hay banners configurados. Usa el botón "Crear Nuevo Banner" o las plantillas rápidas.
                      </td>
                    </tr>
                  ) : (
                    banners.map(banner => (
                      <tr key={banner.id} className="hover:bg-zinc-850/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <label className="relative inline-flex items-center cursor-pointer">
                            <input
                              type="checkbox"
                              checked={banner.active}
                              onChange={() => handleToggleBanner(banner.id)}
                              className="sr-only peer"
                            />
                            <div className="w-9 h-5 bg-zinc-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            <span className="ml-2 text-[11px] font-semibold text-zinc-300">
                              {banner.active ? 'Activo' : 'Inactivo'}
                            </span>
                          </label>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              banner.type === 'referral'
                                ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                : banner.type === 'announcement'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                                : banner.type === 'promo'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : banner.type === 'warning'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                                : 'bg-sky-500/10 text-sky-400 border border-sky-500/30'
                            }`}>
                              {banner.type === 'referral' ? '🎁 Canal Referidos' : banner.type === 'announcement' ? '✨ Mejoras / Novedades' : banner.type === 'promo' ? '🏷️ Promoción' : banner.type === 'warning' ? '⚠️ Alerta' : 'ℹ️ Informativo'}
                            </span>
                            {banner.badgeText && (
                              <div className="text-[10px] font-mono text-zinc-400">
                                Badge: <strong className="text-zinc-200">{banner.badgeText}</strong>
                              </div>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-sm">
                          <div className="font-semibold text-white">{banner.title}</div>
                          <p className="text-[11px] text-zinc-400 line-clamp-2 mt-0.5">{banner.message}</p>
                        </td>

                        <td className="py-3.5 px-4">
                          {banner.linkText ? (
                            <div>
                              <span className="font-medium text-indigo-400 text-xs">{banner.linkText}</span>
                              <div className="text-[10px] font-mono text-zinc-500 truncate max-w-[160px]">
                                {banner.linkUrl || 'Sin enlace'}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-500 text-[11px]">Sin botón CTA</span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-center font-mono font-bold text-zinc-300">
                          #{banner.priority || 1}
                        </td>

                        <td className="py-3.5 px-4 text-right whitespace-nowrap space-x-2">
                          <button
                            onClick={() => handleOpenEditBanner(banner)}
                            className="px-2.5 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-colors"
                          >
                            Editar
                          </button>

                          <button
                            onClick={() => handleDeleteBanner(banner.id)}
                            className="p-1.5 rounded-lg bg-zinc-800 hover:bg-rose-950 hover:text-rose-400 text-zinc-400 transition-colors"
                            title="Eliminar aviso"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
      {/* ======================================================== */}
      {activeTab === 'backup' && (
        <div className="max-w-4xl space-y-6">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Download className="w-5 h-5 text-emerald-400" />
              <span>Exportar Copia de Seguridad Inmutable</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Descarga un archivo JSON completo que contiene la base de datos íntegra (usuarios, saldo, pedidos, inventario cifrado y movimientos).
            </p>
            <a
              href="/api/admin/backup"
              download
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Copia de Seguridad JSON</span>
            </a>
          </div>

          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-400" />
              <span>Restaurar Base de Datos desde Copia</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Pega aquí el contenido JSON exportado previamente para restablecer el sistema a un punto de control.
            </p>

            <textarea
              rows={6}
              value={restoreJson}
              onChange={e => setRestoreJson(e.target.value)}
              placeholder="Pega el contenido JSON de la copia de seguridad aquí..."
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
            />

            {restoreMessage && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>{restoreMessage}</span>
              </div>
            )}

            <button
              onClick={handleRestoreBackup}
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs shadow flex items-center gap-2"
            >
              <Upload className="w-4 h-4" />
              <span>Ejecutar Restauración del Sistema</span>
            </button>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE / EDIT PRODUCT */}
      {/* ======================================================== */}
      {isProductModalOpen && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white">
                {editingProduct.id ? 'Editar Producto Digital' : 'Crear Nuevo Producto Digital'}
              </h3>
              <button
                onClick={() => setIsProductModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Título del Producto:</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.title || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, title: e.target.value })}
                    placeholder="ej. Disney+ Premium 4K"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Categoría:</label>
                  <input
                    type="text"
                    required
                    value={editingProduct.category || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, category: e.target.value })}
                    placeholder="ej. Streaming & Series"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Precio en MXN:</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={editingProduct.priceCents ? editingProduct.priceCents / 100 : ''}
                    onChange={e => setEditingProduct({ ...editingProduct, priceCents: Math.round(parseFloat(e.target.value || '0') * 100) })}
                    placeholder="ej. 45.00"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Delivery Mode & Presentation Configuration */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Modalidad de Entrega:</label>
                  <select
                    disabled={editingProduct.hasSold}
                    value={editingProduct.deliveryMode || 'automatic'}
                    onChange={e => setEditingProduct({ ...editingProduct, deliveryMode: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    <option value="automatic">⚡ Entrega Automática (Inventario)</option>
                    <option value="email_activation">✉️ Activación por Correo (Manual)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Presentación Comercial:</label>
                  <select
                    disabled={editingProduct.hasSold}
                    value={editingProduct.presentation || 'full_account'}
                    onChange={e => setEditingProduct({ ...editingProduct, presentation: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500 disabled:opacity-60"
                  >
                    <option value="full_account">👤 Cuenta completa (1 solo cupo)</option>
                    <option value="profile">👥 Perfil (Cupos compartidos)</option>
                  </select>
                </div>

                {editingProduct.hasSold && (
                  <div className="sm:col-span-2 p-2.5 rounded-lg bg-amber-950/30 border border-amber-500/20 text-amber-300 text-[11px] flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>Bloqueado por ventas: No se puede cambiar la modalidad ni la presentación tras la primera venta.</span>
                  </div>
                )}

                {/* Image Section */}
                <div className="sm:col-span-2 space-y-2 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4 text-indigo-400" />
                      <span>Imagen del Producto</span>
                    </label>
                    {editingProduct.imageUrl && (
                      <button
                        type="button"
                        onClick={() => setEditingProduct({ ...editingProduct, imageUrl: null })}
                        className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Quitar imagen
                      </button>
                    )}
                  </div>

                  {editingProduct.imageUrl && (
                    <div className="w-full h-32 rounded-lg overflow-hidden border border-zinc-800 relative bg-zinc-900">
                      <img
                        src={editingProduct.imageUrl}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="block text-[11px] text-zinc-400 mb-1">Subir archivo (PNG, JPG, WEBP, SVG &lt; 5MB):</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif"
                        onChange={handleProductImageFileUpload}
                        className="w-full text-xs text-zinc-400 file:mr-2 file:py-1 file:px-2.5 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-zinc-800 file:text-zinc-200 hover:file:bg-zinc-700"
                      />
                    </div>

                    <div>
                      <span className="block text-[11px] text-zinc-400 mb-1">O pegar URL de imagen:</span>
                      <input
                        type="url"
                        value={editingProduct.imageUrl || ''}
                        onChange={e => setEditingProduct({ ...editingProduct, imageUrl: e.target.value.trim() || null })}
                        placeholder="https://..."
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                      />
                    </div>
                  </div>

                  {productImageFileError && (
                    <p className="text-[11px] text-rose-400">{productImageFileError}</p>
                  )}
                </div>

                {editingProduct.deliveryMode === 'email_activation' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Stock de Activaciones Manuales:</label>
                    <input
                      type="number"
                      value={editingProduct.manualStockCount || 0}
                      onChange={e => setEditingProduct({ ...editingProduct, manualStockCount: parseInt(e.target.value || '0') })}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Días de Garantía:</label>
                  <input
                    type="number"
                    value={editingProduct.warrantyDays || 30}
                    onChange={e => setEditingProduct({ ...editingProduct, warrantyDays: parseInt(e.target.value || '30') })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Insignia (Opcional):</label>
                  <input
                    type="text"
                    value={editingProduct.badge || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, badge: e.target.value })}
                    placeholder="ej. Más Vendido / Oficial"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Descripción Comercial:</label>
                  <textarea
                    rows={2}
                    value={editingProduct.description || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, description: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Condiciones de Garantía:</label>
                  <textarea
                    rows={2}
                    value={editingProduct.warrantyConditions || ''}
                    onChange={e => setEditingProduct({ ...editingProduct, warrantyConditions: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3">
                <button
                  type="submit"
                  disabled={productSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
                >
                  {productSubmitting ? 'Guardando...' : 'Guardar Producto'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE INVENTORY ACCOUNT */}
      {/* ======================================================== */}
      {isCreateAccountOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Nuevo Inventario Cifrado</span>
                <h3 className="text-base font-bold text-white">Cargar Cuenta de Inventario</h3>
              </div>
              <button
                onClick={() => setIsCreateAccountOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateAccount} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Producto al que pertenece:</label>
                <select
                  value={newAccountProductId}
                  onChange={e => {
                    setNewAccountProductId(e.target.value);
                    const prod = products.find(p => p.id === e.target.value);
                    if (prod?.presentation === 'profile') {
                      setNewAccountTotalSlots(4);
                    } else {
                      setNewAccountTotalSlots(1);
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                >
                  {products.filter(p => p.deliveryMode === 'automatic').map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} ({p.presentation === 'profile' ? 'Presentación: Perfiles' : 'Presentación: Cuenta Completa'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Identificador de la Cuenta (Correo o usuario único):
                </label>
                <input
                  type="text"
                  required
                  value={newAccountIdentifier}
                  onChange={e => setNewAccountIdentifier(e.target.value)}
                  placeholder="ej. cuenta_disney_01@privamail.mx"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  El sistema impedirá duplicar este identificador en otras cuentas para respetar el límite de cupos.
                </p>
              </div>

              {/* Slots configuration */}
              {(() => {
                const prod = products.find(p => p.id === newAccountProductId);
                const isProfile = prod?.presentation === 'profile';

                return (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">
                      Límite de Cupos Vendibles:
                    </label>
                    <input
                      type="number"
                      min={1}
                      disabled={!isProfile}
                      value={isProfile ? newAccountTotalSlots : 1}
                      onChange={e => setNewAccountTotalSlots(Math.max(1, parseInt(e.target.value || '1')))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-emerald-400 font-bold focus:outline-none focus:border-indigo-500 disabled:opacity-60"
                    />
                    <p className="text-[11px] text-zinc-400 mt-1">
                      {isProfile 
                        ? 'Indica la cantidad entera positiva de cupos de perfil que se venderán de esta cuenta (ej. 4 o 2).'
                        : 'Para cuenta completa, el límite es exactamente 1 cupo único.'}
                    </p>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Credenciales a Entregar (Se cifrarán con AES-256-GCM):
                </label>
                <textarea
                  rows={3}
                  required
                  value={newAccountCredentials}
                  onChange={e => setNewAccountCredentials(e.target.value)}
                  placeholder="Usuario: correo@ejemplo.com&#10;Contraseña: ClaveSecreta99!&#10;Indicaciones: Ingresa en perfil 3"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nota Interna (Opcional):
                </label>
                <input
                  type="text"
                  value={newAccountNotes}
                  onChange={e => setNewAccountNotes(e.target.value)}
                  placeholder="ej. Lote A - Contratada anualmente"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {accountError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{accountError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={accountSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow"
                >
                  {accountSubmitting ? 'Cifrando y registrando...' : 'Ingresar al Inventario'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCreateAccountOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADJUST CAPACITY */}
      {/* ======================================================== */}
      {adjustingAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div>
              <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Ajuste de Capacidad</span>
              <h3 className="text-base font-bold text-white mt-0.5">{adjustingAccount.identifier}</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Cupos ya consumidos/vendidos: <strong className="text-emerald-400 font-mono">{adjustingAccount.consumedSlots}</strong>
              </p>
            </div>

            <form onSubmit={handleSaveCapacity} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nueva capacidad total de cupos:
                </label>
                <input
                  type="number"
                  min={adjustingAccount.consumedSlots}
                  value={newCapacitySlots}
                  onChange={e => setNewCapacitySlots(parseInt(e.target.value || '1'))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-indigo-500"
                />
                <p className="text-[11px] text-zinc-500 mt-1">
                  Por regla de integridad, no se puede reducir por debajo de los {adjustingAccount.consumedSlots} cupos ya vendidos.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Motivo obligatorio del ajuste:
                </label>
                <textarea
                  rows={2}
                  required
                  value={capacityReason}
                  onChange={e => setCapacityReason(e.target.value)}
                  placeholder="ej. Se ampliaron perfiles en la cuenta madre / Corrección por error de carga"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* History log display */}
              {adjustingAccount.capacityHistory && adjustingAccount.capacityHistory.length > 0 && (
                <div className="pt-2 border-t border-zinc-800 text-[11px] space-y-1.5">
                  <div className="font-semibold text-zinc-400">Historial de cambios:</div>
                  <div className="max-h-24 overflow-y-auto space-y-1">
                    {adjustingAccount.capacityHistory.map((h, i) => (
                      <div key={i} className="text-zinc-500 font-mono">
                        {formatDate(h.timestamp)}: {h.previousSlots} → {h.newSlots} ({h.reason}) por {h.adminName}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {capacityError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {capacityError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={capacitySubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow"
                >
                  {capacitySubmitting ? 'Guardando...' : 'Aplicar Ajuste Registrado'}
                </button>
                <button
                  type="button"
                  onClick={() => setAdjustingAccount(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: UPDATE CREDENTIALS */}
      {/* ======================================================== */}
      {updatingCredsAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div>
              <span className="text-[10px] font-mono text-amber-400 uppercase font-bold">Actualización Protegida</span>
              <h3 className="text-base font-bold text-white mt-0.5">{updatingCredsAccount.identifier}</h3>
              <p className="text-xs text-zinc-400 mt-1">
                La nueva clave se reflejará en las compras vinculadas de los clientes y conservará el registro protegido sin borrar la entrega original.
              </p>
            </div>

            <form onSubmit={handleSaveCredentialsUpdate} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nuevas credenciales completas:
                </label>
                <textarea
                  rows={3}
                  required
                  value={newCredsInput}
                  onChange={e => setNewCredsInput(e.target.value)}
                  placeholder="Usuario: ...&#10;Contraseña: NuevaClave2026!&#10;Indicaciones: ..."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Nota explicativa del cambio (obligatorio):
                </label>
                <textarea
                  rows={2}
                  required
                  value={credsUpdateNotes}
                  onChange={e => setCredsUpdateNotes(e.target.value)}
                  placeholder="ej. Renovación periódica de contraseña / Actualización de acceso"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {credsError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs">
                  {credsError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={credsSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-zinc-950 font-bold text-xs shadow"
                >
                  {credsSubmitting ? 'Actualizando...' : 'Actualizar Credenciales'}
                </button>
                <button
                  type="button"
                  onClick={() => setUpdatingCredsAccount(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: VIEW ACCOUNT BUYERS */}
      {/* ======================================================== */}
      {viewingBuyersAccount && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-2xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold">Compradores Vinculados</span>
                <h3 className="text-base font-bold text-white">{viewingBuyersAccount.identifier}</h3>
                <p className="text-xs text-zinc-400">
                  Total de compradores: <strong>{accountBuyersList.length}</strong> de {viewingBuyersAccount.totalSlots} cupos
                </p>
              </div>
              <button
                onClick={() => setViewingBuyersAccount(null)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {loadingBuyers ? (
              <div className="py-8 text-center text-zinc-500 text-xs">Cargando compradores...</div>
            ) : accountBuyersList.length === 0 ? (
              <div className="py-8 text-center text-zinc-500 text-xs">
                Esta cuenta aún no tiene compras registradas.
              </div>
            ) : (
              <div className="max-h-80 overflow-y-auto rounded-xl border border-zinc-800">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950 font-mono text-[10px] text-zinc-400 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Cupo</th>
                      <th className="py-2.5 px-3">Cliente</th>
                      <th className="py-2.5 px-3">Pedido</th>
                      <th className="py-2.5 px-3">Fecha Compra</th>
                      <th className="py-2.5 px-3">Garantía</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800 font-mono">
                    {accountBuyersList.map(buyer => (
                      <tr key={buyer.orderId} className="hover:bg-zinc-850/40">
                        <td className="py-2.5 px-3 font-bold text-indigo-400">
                          #{buyer.slotNumber || 1}
                        </td>
                        <td className="py-2.5 px-3">
                          <div className="font-sans font-semibold text-zinc-200">{buyer.customerName}</div>
                          <div className="text-[11px] text-zinc-400">{buyer.customerEmail} ({buyer.customerCode})</div>
                        </td>
                        <td className="py-2.5 px-3 text-zinc-300">{buyer.orderId}</td>
                        <td className="py-2.5 px-3 text-zinc-400 text-[11px]">{formatDate(buyer.createdAt)}</td>
                        <td className="py-2.5 px-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] ${
                            buyer.warrantyStatus === 'active' ? 'bg-emerald-950 text-emerald-300' : 'bg-zinc-800 text-zinc-400'
                          }`}>
                            {buyer.warrantyStatus}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setViewingBuyersAccount(null)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREDIT / COMPENSATION */}
      {/* ======================================================== */}
      {balanceModalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase">
                {balanceModalMode === 'credit' ? 'Acreditación Directa de Saldo SPEI' : 'Movimiento Compensatorio'}
              </span>
              <h3 className="text-lg font-bold text-white mt-1">
                {balanceModalMode === 'credit' ? 'Registrar Depósito Manual' : 'Corregir Saldo con Ajuste Contable'}
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Cliente Receptor:</label>
                <select
                  value={selectedUserId}
                  onChange={e => setSelectedUserId(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                >
                  {users.filter(u => u.role === 'client').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.customerCode}) - Saldo actual: {formatMXN(u.balanceCents)}
                    </option>
                  ))}
                </select>
              </div>

              {balanceModalMode === 'compensation' && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Sentido de la Compensación:</label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCompensationType('compensation_credit')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                        compensationType === 'compensation_credit'
                          ? 'bg-emerald-600/20 text-emerald-400 border-emerald-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      + Crédito (Bonificación)
                    </button>
                    <button
                      type="button"
                      onClick={() => setCompensationType('compensation_debit')}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${
                        compensationType === 'compensation_debit'
                          ? 'bg-rose-600/20 text-rose-400 border-rose-500/40'
                          : 'bg-zinc-950 text-zinc-400 border-zinc-800'
                      }`}
                    >
                      - Débito (Corrección de error)
                    </button>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Monto en Pesos Mexicanos (MXN):</label>
                <input
                  type="number"
                  step="0.01"
                  value={balanceAmountMXN}
                  onChange={e => setBalanceAmountMXN(e.target.value)}
                  placeholder="ej. 500.00"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-sm text-emerald-400 font-mono font-bold focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Referencia Obligatoria (Folio SPEI / Clave de Rastreo):
                </label>
                <input
                  type="text"
                  value={balanceReference}
                  onChange={e => setBalanceReference(e.target.value)}
                  placeholder="ej. SPEI-984210984"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Motivo Detallado Obligatorio (Justificación contable):
                </label>
                <textarea
                  rows={2}
                  value={balanceReason}
                  onChange={e => setBalanceReason(e.target.value)}
                  placeholder="ej. Depósito bancario reportado en Telegram comprobante #492"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              {balanceModalMode === 'credit' && (() => {
                const targetUser = users.find(u => u.id === selectedUserId);
                const targetReferrer = targetUser?.referredByUserId 
                  ? users.find(u => u.id === targetUser.referredByUserId) 
                  : users.find(u => (u.referralCode && u.referralCode === targetUser?.referredByCode) || u.customerCode === targetUser?.referredByCode);
                const hasReferrer = Boolean(targetUser?.referredByCode || targetReferrer);

                return (
                  <div className="p-3.5 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        {hasReferrer ? 'Cliente Recomendado por:' : 'Programa de Referidos (Opcional):'}
                      </span>
                      {hasReferrer ? (
                        <span className="font-mono text-xs font-bold text-amber-300">
                          {targetReferrer?.name || 'Referente'} ({targetUser?.referredByCode || targetReferrer?.customerCode})
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-500">Sin referente registrado</span>
                      )}
                    </div>

                    {hasReferrer ? (
                      <>
                        <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300">
                          <input
                            type="checkbox"
                            checked={applyReferralCredit}
                            onChange={e => setApplyReferralCredit(e.target.checked)}
                            className="rounded border-zinc-700 bg-zinc-900 text-amber-500 focus:ring-0"
                          />
                          <span>Generar comisión / puntos para el referente por esta recarga</span>
                        </label>

                        {applyReferralCredit && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-amber-500/20">
                            <div>
                              <label className="block text-[11px] text-zinc-400 mb-1">Tipo de Recompensa:</label>
                              <select
                                value={referralCreditType}
                                onChange={e => setReferralCreditType(e.target.value as any)}
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                              >
                                <option value="cashback">Cashback a Saldo ($ MXN)</option>
                                <option value="points">Puntos de fidelidad</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] text-zinc-400 mb-1">
                                {referralCreditType === 'cashback' ? 'Monto Comisión (MXN):' : 'Puntos a otorgar:'}
                              </label>
                              <input
                                type="number"
                                step={referralCreditType === 'cashback' ? "0.01" : "1"}
                                value={referralCreditCustomAmount}
                                onChange={e => setReferralCreditCustomAmount(e.target.value)}
                                placeholder={
                                  referralCreditType === 'cashback'
                                    ? balanceAmountMXN ? `$${(parseFloat(balanceAmountMXN || '0') * (referralSettingsForm.referralCommissionRate / 100)).toFixed(2)} (${referralSettingsForm.referralCommissionRate}%)` : `Sugerido (${referralSettingsForm.referralCommissionRate}%)`
                                    : balanceAmountMXN ? `${Math.round(parseFloat(balanceAmountMXN || '0') * referralSettingsForm.referralPointsPerMXN)} pts` : `Sugerido (${referralSettingsForm.referralPointsPerMXN} pts/$1)`
                                }
                                className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-amber-400 font-mono focus:outline-none focus:border-amber-500"
                              />
                            </div>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-[11px] text-zinc-400">
                        Si este cliente reportó un código de referido en su comprobante, puedes usar el botón "Generar Bonificación Manual" en la pestaña de Referidos.
                      </p>
                    )}
                  </div>
                );
              })()}

              {balanceError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{balanceError}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={balanceSubmitting}
                onClick={handleProcessBalance}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
              >
                {balanceSubmitting ? 'Registrando...' : 'Registrar Movimiento Oficial'}
              </button>
              <button
                onClick={() => setBalanceModalMode(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: COMPLETE ACTIVATION */}
      {/* ======================================================== */}
      {completingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div>
              <span className="text-xs font-bold text-emerald-400 uppercase">Completar Activación</span>
              <h3 className="text-lg font-bold text-white mt-1">{completingOrder.productSnapshot.title}</h3>
              <p className="text-xs text-sky-400 font-mono mt-0.5">
                Correo a activar: {completingOrder.targetEmail}
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Notas de confirmación para el cliente:
                </label>
                <textarea
                  rows={2}
                  value={activationNotes}
                  onChange={e => setActivationNotes(e.target.value)}
                  placeholder="ej. Activación confirmada, revisa la bandeja de entrada de tu correo para aceptar invitación."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Credenciales o enlace entregado (opcional):
                </label>
                <textarea
                  rows={2}
                  value={activationCredentials}
                  onChange={e => setActivationCredentials(e.target.value)}
                  placeholder="ej. Enlace de invitación https://... o credenciales temporales"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs font-mono text-zinc-200 focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-950/30 border border-emerald-800/40 text-xs text-emerald-300">
                Al completar, el pedido pasará a <strong>Entregado</strong> y comenzará a correr la vigencia de garantía ({completingOrder.productSnapshot.warrantyDays} días).
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={actionSubmitting}
                onClick={handleCompleteActivation}
                className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow"
              >
                {actionSubmitting ? 'Guardando...' : 'Confirmar Activación Exitosa'}
              </button>
              <button
                onClick={() => setCompletingOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CANCEL AND REFUND ORDER */}
      {/* ======================================================== */}
      {cancellingOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div>
              <span className="text-xs font-bold text-rose-400 uppercase">Cancelar Pedido y Devolver Saldo</span>
              <h3 className="text-lg font-bold text-white mt-1">{cancellingOrder.productSnapshot.title}</h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Se reembolsará <strong className="text-emerald-400 font-mono">{formatMXN(cancellingOrder.priceCents)}</strong> al saldo interno del cliente.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Motivo obligatorio de la cancelación:
                </label>
                <textarea
                  rows={3}
                  value={cancellationReason}
                  onChange={e => setCancellationReason(e.target.value)}
                  placeholder="ej. El correo no admite más grupos familiares / Error al canjear"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                disabled={actionSubmitting || !cancellationReason.trim()}
                onClick={handleCancelAndRefund}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow"
              >
                {actionSubmitting ? 'Procesando...' : 'Reembolsar Saldo y Cancelar'}
              </button>
              <button
                onClick={() => setCancellingOrder(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: PROCESS REFERRAL REWARD & COMMISSIONS */}
      {/* ======================================================== */}
      {isReferralModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Gift className="w-4 h-4 text-amber-400" />
                  Transparencia de Comisiones & Recompensas
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Procesar Cashback o Puntos por Referidos</h3>
              </div>
              <button
                onClick={() => setIsReferralModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveReferralReward} className="space-y-4">
              {/* Referrer Selector & Details Card */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Cliente Referente Beneficiario (Quien recibe la comisión):
                </label>
                <select
                  required
                  value={rewardTargetUserId}
                  onChange={e => {
                    const newId = e.target.value;
                    setRewardTargetUserId(newId);
                    setRewardReferredUserId('');
                    setSelectedReferredOrderId('');
                    setRewardBaseAmountMXN('');
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value="">Selecciona el referente...</option>
                  {users.filter(u => u.role === 'client').map(u => (
                    <option key={u.id} value={u.id}>
                      {u.name} (Folio: {u.customerCode} | Código: {u.referralCode || u.customerCode})
                    </option>
                  ))}
                </select>
              </div>

              {/* Referrer quick stats card */}
              {(() => {
                const targetRef = users.find(u => u.id === rewardTargetUserId);
                const targetRefData = referralOverview?.referrers?.find(r => r.user.id === rewardTargetUserId);
                if (!targetRef) return null;
                return (
                  <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800/80 grid grid-cols-3 gap-2 text-center text-xs">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">Saldo Actual</div>
                      <div className="font-bold text-emerald-400 font-mono">{formatMXN(targetRef.balanceCents)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">Puntos Fidelidad</div>
                      <div className="font-bold text-amber-400 font-mono">{(targetRef.referralPoints || 0).toLocaleString()} pts</div>
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-mono">Amigos Vinculados</div>
                      <div className="font-bold text-indigo-400 font-mono">{targetRefData?.referredCount ?? 0} amigos</div>
                    </div>
                  </div>
                );
              })()}

              {/* Quick Pick: Purchases from Referred Friends */}
              {(() => {
                const targetRefData = referralOverview?.referrers?.find(r => r.user.id === rewardTargetUserId);
                const friendsList = targetRefData?.referredUsersDetails || [];
                const allFriendOrders = friendsList.flatMap(f => (f.orders || []).map(o => ({ order: o, friend: f })));

                if (allFriendOrders.length === 0) return null;

                return (
                  <div className="rounded-xl bg-zinc-950/80 border border-zinc-800 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                        <ShoppingBag className="w-3.5 h-3.5 text-amber-400" />
                        Compras de Amigos Referidos (Cálculo Inmediato con 1 Clic):
                      </span>
                      <span className="text-[10px] text-zinc-500 font-mono">
                        {allFriendOrders.length} compra{allFriendOrders.length > 1 ? 's' : ''}
                      </span>
                    </div>

                    <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                      {allFriendOrders.map(({ order, friend }) => {
                        const isSelected = selectedReferredOrderId === order.id;
                        const isCredited = order.referralRewardStatus === 'credited';
                        const suggestedCash = ((order.priceCents * (referralSettingsForm.referralCommissionRate || 5)) / 10000).toFixed(2);

                        return (
                          <div
                            key={order.id}
                            onClick={() => {
                              const refUser = users.find(u => u.id === rewardTargetUserId);
                              handleSelectReferredOrder(order, friend, refUser?.name || 'Referente');
                            }}
                            className={`p-2 rounded-lg border text-xs cursor-pointer transition-all flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-amber-950/40 border-amber-500 text-white'
                                : 'bg-zinc-900 border-zinc-800 hover:border-zinc-700 text-zinc-300'
                            }`}
                          >
                            <div className="truncate">
                              <span className="font-mono font-bold text-amber-400 mr-2">{order.id}</span>
                              <span className="font-semibold text-zinc-200">{friend.name}: </span>
                              <span className="text-zinc-400">{order.productTitle}</span>
                              <span className="font-mono text-emerald-400 ml-2">({formatMXN(order.priceCents)})</span>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                isCredited 
                                  ? 'bg-emerald-500/10 text-emerald-400' 
                                  : 'bg-amber-500/10 text-amber-400'
                              }`}>
                                {isCredited ? 'Acreditada' : `Calcular +$${suggestedCash}`}
                              </span>
                              <Check className={`w-3.5 h-3.5 ${isSelected ? 'text-amber-400' : 'text-zinc-600'}`} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })()}

              {/* Reward Type Choice */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Modalidad de Recompensa a Procesar:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setRewardTypeChoice('cashback')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      rewardTypeChoice === 'cashback'
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    💰 Saldo Cashback (MXN)
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardTypeChoice('points')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      rewardTypeChoice === 'points'
                        ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    🪙 Puntos Fidelidad
                  </button>

                  <button
                    type="button"
                    onClick={() => setRewardTypeChoice('both')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      rewardTypeChoice === 'both'
                        ? 'bg-indigo-950/50 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    ✨ Saldo + Puntos
                  </button>
                </div>
              </div>

              {/* Transparency Calculation Box */}
              <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-zinc-300 flex items-center justify-between">
                  <span>Cálculo Transparente de Comisión</span>
                  <button
                    type="button"
                    onClick={() => handleRecalculateRewardAmounts(rewardBaseAmountMXN, rewardCommissionRateInput)}
                    className="text-[10px] text-amber-400 hover:text-amber-300 underline font-mono"
                  >
                    Recalcular Montos
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Monto Base Compra / Operación ($):</label>
                    <input
                      type="number"
                      step="0.01"
                      value={rewardBaseAmountMXN}
                      onChange={e => {
                        setRewardBaseAmountMXN(e.target.value);
                        handleRecalculateRewardAmounts(e.target.value, rewardCommissionRateInput);
                      }}
                      placeholder="ej. 150.00"
                      className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] text-zinc-400 mb-1">Porcentaje de Comisión (%):</label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.5"
                        value={rewardCommissionRateInput}
                        onChange={e => {
                          setRewardCommissionRateInput(e.target.value);
                          handleRecalculateRewardAmounts(rewardBaseAmountMXN, e.target.value);
                        }}
                        placeholder="ej. 5.0"
                        className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 font-mono text-zinc-100 text-xs focus:outline-none focus:border-amber-500"
                      />
                      <span className="absolute right-2.5 top-1.5 text-zinc-500 font-mono text-xs">%</span>
                    </div>
                  </div>
                </div>

                {/* Resulting Values */}
                <div className="grid grid-cols-2 gap-3 pt-1">
                  {(rewardTypeChoice === 'cashback' || rewardTypeChoice === 'both') && (
                    <div>
                      <label className="block text-[11px] text-zinc-400 mb-1">Cashback a Acreditar (MXN):</label>
                      <input
                        type="number"
                        step="0.01"
                        required
                        value={rewardAmountMXN}
                        onChange={e => setRewardAmountMXN(e.target.value)}
                        placeholder="ej. 7.50"
                        className="w-full bg-zinc-900 border border-emerald-500/40 rounded-lg px-2.5 py-1.5 font-mono font-bold text-emerald-400 text-xs focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  )}

                  {(rewardTypeChoice === 'points' || rewardTypeChoice === 'both') && (
                    <div className={rewardTypeChoice === 'points' ? 'col-span-2' : ''}>
                      <label className="block text-[11px] text-zinc-400 mb-1">Puntos a Entregar:</label>
                      <input
                        type="number"
                        step="1"
                        required
                        value={rewardPointsInput}
                        onChange={e => setRewardPointsInput(e.target.value)}
                        placeholder="ej. 150"
                        className="w-full bg-zinc-900 border border-amber-500/40 rounded-lg px-2.5 py-1.5 font-mono font-bold text-amber-400 text-xs focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Justification & Transparency Reason */}
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Concepto y Razón Transparente de Auditoría:
                </label>
                <textarea
                  rows={2}
                  required
                  value={rewardReason}
                  onChange={e => setRewardReason(e.target.value)}
                  placeholder="ej. Comisión del 5% por compra de Mariana López (CLI-91024) en Windows 11 Pro - Orden ORD-710492"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
                <p className="text-[10px] text-zinc-500 mt-1">
                  Esta justificación se registrará en el estado de cuenta del cliente y en los registros de auditoría inmutables.
                </p>
              </div>

              {rewardError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{rewardError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={rewardSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition-all"
                >
                  {rewardSubmitting ? 'Acreditando...' : 'Acreditar Comisión Oficial'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsReferralModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: BATCH DISTRIBUTE REFERRAL REWARDS */}
      {/* ======================================================== */}
      {isBatchDistributeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <Coins className="w-4 h-4 text-amber-400" />
                  Distribución Masiva por Fidelidad
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Distribuir Recompensas Masivas</h3>
              </div>
              <button
                onClick={() => setIsBatchDistributeModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBatchDistribute} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Criterio de Elegibilidad de Referentes:
                </label>
                <select
                  value={batchMinReferrals}
                  onChange={e => setBatchMinReferrals(parseInt(e.target.value || '1'))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-amber-500 font-medium"
                >
                  <option value={1}>Clientes con al menos 1 amigo referido</option>
                  <option value={2}>Clientes con al menos 2 amigos referidos</option>
                  <option value={3}>Clientes con 3 o más amigos referidos (Top Referentes)</option>
                  <option value={5}>Clientes con 5 o más amigos referidos (VIPs)</option>
                </select>
              </div>

              {/* Beneficiaries Preview */}
              {(() => {
                const count = (referralOverview?.referrers || []).filter(r => r.referredCount >= batchMinReferrals).length;
                return (
                  <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between text-xs">
                    <span className="text-amber-300 font-medium">Clientes Beneficiarios Estimados:</span>
                    <span className="font-mono font-bold text-amber-400 text-sm">{count} clientes calificados</span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Tipo de Recompensa Masiva:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchRewardType('points')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      batchRewardType === 'points'
                        ? 'bg-amber-950/50 border-amber-500 text-amber-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    🪙 Solo Puntos
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchRewardType('cashback')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      batchRewardType === 'cashback'
                        ? 'bg-emerald-950/50 border-emerald-500 text-emerald-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    💰 Solo Saldo MXN
                  </button>

                  <button
                    type="button"
                    onClick={() => setBatchRewardType('both')}
                    className={`py-2 px-2.5 rounded-xl text-xs font-semibold border transition-all text-center ${
                      batchRewardType === 'both'
                        ? 'bg-indigo-950/50 border-indigo-500 text-indigo-300'
                        : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                    }`}
                  >
                    ✨ Puntos + Saldo
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(batchRewardType === 'cashback' || batchRewardType === 'both') && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Cashback por Cliente (MXN):</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      value={batchAmountMXN}
                      onChange={e => setBatchAmountMXN(e.target.value)}
                      placeholder="ej. 25.00"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                )}

                {(batchRewardType === 'points' || batchRewardType === 'both') && (
                  <div className={batchRewardType === 'points' ? 'col-span-2' : ''}>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Puntos por Cliente:</label>
                    <input
                      type="number"
                      step="1"
                      required
                      value={batchPointsInput}
                      onChange={e => setBatchPointsInput(e.target.value)}
                      placeholder="ej. 150"
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Motivo de Auditoría:
                </label>
                <textarea
                  rows={2}
                  required
                  value={batchReason}
                  onChange={e => setBatchReason(e.target.value)}
                  placeholder="ej. Bonificación de fin de mes por fidelidad en canal de referidos"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-amber-500"
                />
              </div>

              {batchError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{batchError}</span>
                </div>
              )}

              {batchSuccessMessage && (
                <div className="p-3 rounded-lg bg-emerald-950/60 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{batchSuccessMessage}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={batchSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow transition-all"
                >
                  {batchSubmitting ? 'Distribuyendo...' : 'Confirmar Distribución Masiva'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBatchDistributeModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cerrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: CREATE / EDIT CUSTOM INFO BANNER */}
      {/* ======================================================== */}
      {isBannerModalOpen && editingBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-xl rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <div>
                <span className="text-xs font-bold text-indigo-400 uppercase flex items-center gap-1.5">
                  <Megaphone className="w-4 h-4 text-indigo-400" />
                  {editingBanner.id ? 'Editar Banner Informativo' : 'Crear Nuevo Banner Informativo'}
                </span>
                <h3 className="text-lg font-bold text-white mt-0.5">Configuración de Aviso en Tiempo Real</h3>
              </div>
              <button
                onClick={() => setIsBannerModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBanner} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Título del Banner / Aviso:
                </label>
                <input
                  type="text"
                  required
                  value={editingBanner.title || ''}
                  onChange={e => setEditingBanner({ ...editingBanner, title: e.target.value })}
                  placeholder="ej. ¿Ya estás en nuestro canal de referidos? Te damos descuento"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">
                  Mensaje Detallado:
                </label>
                <textarea
                  rows={3}
                  required
                  value={editingBanner.message || ''}
                  onChange={e => setEditingBanner({ ...editingBanner, message: e.target.value })}
                  placeholder="ej. Únete a nuestro canal oficial para recibir cupones de descuento exclusivos, comisiones aceleradas por invitar amigos y soporte prioritario."
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Tipo de Banner / Estilo:
                  </label>
                  <select
                    value={editingBanner.type || 'info'}
                    onChange={e => setEditingBanner({ ...editingBanner, type: e.target.value as any })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="referral">🎁 Canal de Referidos & Beneficio (Ámbar / Dorado)</option>
                    <option value="announcement">✨ Novedades & Mejoras (Púrpura)</option>
                    <option value="promo">🏷️ Promoción o Descuento (Verde Esmeralda)</option>
                    <option value="info">ℹ️ Información General (Azul / Cielo)</option>
                    <option value="warning">⚠️ Alerta o Mantenimiento (Naranja / Rojo)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Texto del Badge (Etiqueta):
                  </label>
                  <input
                    type="text"
                    value={editingBanner.badgeText || ''}
                    onChange={e => setEditingBanner({ ...editingBanner, badgeText: e.target.value })}
                    placeholder="ej. Beneficio Exclusivo, Novedades"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Texto del Botón de Acción (CTA):
                  </label>
                  <input
                    type="text"
                    value={editingBanner.linkText || ''}
                    onChange={e => setEditingBanner({ ...editingBanner, linkText: e.target.value })}
                    placeholder="ej. Unirme al Canal, Ver Catálogo, Ir a Referidos"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Destino (Enlace URL o Pestaña):
                  </label>
                  <input
                    type="text"
                    value={editingBanner.linkUrl || ''}
                    onChange={e => setEditingBanner({ ...editingBanner, linkUrl: e.target.value })}
                    placeholder="ej. https://t.me/... o referidos, catalogo, recargar"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 items-center pt-1">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Prioridad de Aparición:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    value={editingBanner.priority || 1}
                    onChange={e => setEditingBanner({ ...editingBanner, priority: parseInt(e.target.value || '1') })}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <div className="space-y-2 pt-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium">
                    <input
                      type="checkbox"
                      checked={editingBanner.active !== false}
                      onChange={e => setEditingBanner({ ...editingBanner, active: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-0"
                    />
                    <span>Publicar inmediatamente (Activo)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs text-zinc-300 font-medium">
                    <input
                      type="checkbox"
                      checked={editingBanner.dismissible !== false}
                      onChange={e => setEditingBanner({ ...editingBanner, dismissible: e.target.checked })}
                      className="rounded border-zinc-700 bg-zinc-950 text-indigo-600 focus:ring-0"
                    />
                    <span>Permitir al usuario cerrar el aviso (X)</span>
                  </label>
                </div>
              </div>

              {/* Live Preview Inside Modal */}
              <div className="space-y-1.5 pt-2">
                <span className="text-[11px] font-mono uppercase text-zinc-400 block">
                  Vista Previa en Tiempo Real:
                </span>
                <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                  editingBanner.type === 'referral'
                    ? 'bg-gradient-to-r from-amber-950/50 via-zinc-900 to-amber-950/30 border-amber-500/40 text-amber-200'
                    : editingBanner.type === 'announcement'
                    ? 'bg-gradient-to-r from-purple-950/50 via-zinc-900 to-purple-950/30 border-purple-500/40 text-purple-200'
                    : editingBanner.type === 'promo'
                    ? 'bg-gradient-to-r from-emerald-950/50 via-zinc-900 to-emerald-950/30 border-emerald-500/40 text-emerald-200'
                    : editingBanner.type === 'warning'
                    ? 'bg-gradient-to-r from-rose-950/50 via-zinc-900 to-rose-950/30 border-rose-500/40 text-rose-200'
                    : 'bg-gradient-to-r from-sky-950/50 via-zinc-900 to-sky-950/30 border-sky-500/40 text-sky-200'
                }`}>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-white/10 uppercase">
                        {editingBanner.badgeText || 'Aviso'}
                      </span>
                      <h4 className="text-xs font-bold text-white">{editingBanner.title || 'Título del banner'}</h4>
                    </div>
                    <p className="text-[11px] text-zinc-300">
                      {editingBanner.message || 'Mensaje descriptivo del aviso para clientes...'}
                    </p>
                  </div>

                  {editingBanner.linkText && (
                    <button
                      type="button"
                      className="px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 bg-white text-zinc-950 shadow"
                    >
                      {editingBanner.linkText}
                    </button>
                  )}
                </div>
              </div>

              {bannerError && (
                <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>{bannerError}</span>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="submit"
                  disabled={bannerSubmitting}
                  className="flex-1 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow transition-all"
                >
                  {bannerSubmitting ? 'Guardando...' : editingBanner.id ? 'Actualizar Banner' : 'Publicar Banner'}
                </button>
                <button
                  type="button"
                  onClick={() => setIsBannerModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 text-zinc-300 text-xs font-semibold hover:bg-zinc-700"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
