import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import {
  Wallet,
  ShoppingBag,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertTriangle,
  PieChart as PieChartIcon,
  BarChart3,
  Activity,
  Layers,
  Sparkles,
  Users,
  KeyRound,
  ExternalLink,
  PlusCircle,
  HelpCircle,
  FileText
} from 'lucide-react';
import { Order, BalanceMovement, WarrantyCase, User, Product, InventoryAccount } from '../types';
import { formatMXN, formatDate } from '../api';

interface AdminStatsOverviewProps {
  orders: Order[];
  users: User[];
  products: Product[];
  movements: BalanceMovement[];
  warrantyCases: WarrantyCase[];
  inventoryAccounts: InventoryAccount[];
  loading?: boolean;
  onNavigateTab: (tab: string) => void;
  onOpenCreditModal?: (userId?: string) => void;
}

const COLORS = {
  emerald: '#10b981',
  emeraldLight: '#34d399',
  emeraldDark: '#059669',
  sky: '#0ea5e9',
  amber: '#f59e0b',
  rose: '#f43f5e',
  indigo: '#6366f1',
  purple: '#a855f7',
  zinc: '#71717a',
};

const CATEGORY_PALETTE = [
  '#10b981', // emerald
  '#0ea5e9', // sky
  '#8b5cf6', // violet
  '#f59e0b', // amber
  '#ec4899', // pink
  '#06b6d4', // cyan
  '#f43f5e', // rose
  '#eab308', // yellow
];

export const AdminStatsOverview: React.FC<AdminStatsOverviewProps> = ({
  orders,
  users,
  products,
  movements,
  warrantyCases,
  inventoryAccounts,
  loading = false,
  onNavigateTab,
  onOpenCreditModal,
}) => {
  const [timeRange, setTimeRange] = useState<'all' | '30d' | '7d'>('all');
  const [activeSection, setActiveSection] = useState<'all' | 'finances' | 'sales' | 'warranties'>('all');

  // Filter items by selected time range
  const { filteredOrders, filteredMovements, filteredWarranties } = useMemo(() => {
    if (timeRange === 'all') {
      return {
        filteredOrders: orders,
        filteredMovements: movements,
        filteredWarranties: warrantyCases,
      };
    }

    const now = new Date().getTime();
    const daysAgo = timeRange === '7d' ? 7 : 30;
    const cutoffTime = now - daysAgo * 24 * 60 * 60 * 1000;

    return {
      filteredOrders: orders.filter(o => new Date(o.createdAt).getTime() >= cutoffTime),
      filteredMovements: movements.filter(m => new Date(m.createdAt).getTime() >= cutoffTime),
      filteredWarranties: warrantyCases.filter(w => new Date(w.createdAt).getTime() >= cutoffTime),
    };
  }, [orders, movements, warrantyCases, timeRange]);

  // 1. FINANCIAL & BALANCE METRICS
  const financialStats = useMemo(() => {
    // Total balance in clients' hands
    const clientUsers = users.filter(u => u.role === 'client');
    const totalClientBalanceCents = clientUsers.reduce((sum, u) => sum + (u.balanceCents || 0), 0);
    const clientsWithBalanceCount = clientUsers.filter(u => u.balanceCents > 0).length;

    // Movement sums
    let totalDepositsCents = 0;
    let depositsCount = 0;
    let totalSpentCents = 0;
    let purchasesCount = 0;
    let totalRefundsCents = 0;
    let refundsCount = 0;
    let totalCompensationCreditCents = 0;
    let totalCompensationDebitCents = 0;

    filteredMovements.forEach(m => {
      if (m.type === 'deposit') {
        totalDepositsCents += Math.max(0, m.amountCents);
        depositsCount++;
      } else if (m.type === 'purchase') {
        totalSpentCents += Math.abs(m.amountCents);
        purchasesCount++;
      } else if (m.type === 'refund') {
        totalRefundsCents += Math.max(0, m.amountCents);
        refundsCount++;
      } else if (m.type === 'compensation_credit') {
        totalCompensationCreditCents += Math.max(0, m.amountCents);
      } else if (m.type === 'compensation_debit') {
        totalCompensationDebitCents += Math.abs(m.amountCents);
      }
    });

    const netDepositsCents = totalDepositsCents + totalCompensationCreditCents - totalRefundsCents - totalCompensationDebitCents;
    const averageDepositCents = depositsCount > 0 ? Math.round(totalDepositsCents / depositsCount) : 0;

    // Ranking of top clients by balance
    const topClientsByBalance = [...clientUsers]
      .filter(u => u.balanceCents > 0)
      .sort((a, b) => b.balanceCents - a.balanceCents)
      .slice(0, 6)
      .map(u => ({
        name: u.name || u.email.split('@')[0],
        email: u.email,
        customerCode: u.customerCode,
        balanceMXN: u.balanceCents / 100,
        balanceCents: u.balanceCents,
        id: u.id,
      }));

    return {
      clientUsersCount: clientUsers.length,
      totalClientBalanceCents,
      clientsWithBalanceCount,
      totalDepositsCents,
      depositsCount,
      averageDepositCents,
      totalSpentCents,
      purchasesCount,
      totalRefundsCents,
      refundsCount,
      netDepositsCents,
      topClientsByBalance,
    };
  }, [users, filteredMovements]);

  // 2. TIMELINE CHART: INFLOWS (DEPOSITS) VS OUTFLOWS (SALES)
  const timelineChartData = useMemo(() => {
    const datesMap = new Map<string, { deposits: number; sales: number; refunds: number }>();

    filteredMovements.forEach(m => {
      const dateKey = m.createdAt.slice(0, 10);
      const current = datesMap.get(dateKey) || { deposits: 0, sales: 0, refunds: 0 };

      if (m.type === 'deposit' || m.type === 'compensation_credit') {
        current.deposits += Math.max(0, m.amountCents) / 100;
      } else if (m.type === 'purchase') {
        current.sales += Math.abs(m.amountCents) / 100;
      } else if (m.type === 'refund') {
        current.refunds += Math.max(0, m.amountCents) / 100;
      }
      datesMap.set(dateKey, current);
    });

    // Also include orders dates if movements don't cover
    filteredOrders.forEach(o => {
      const dateKey = o.createdAt.slice(0, 10);
      if (!datesMap.has(dateKey)) {
        datesMap.set(dateKey, { deposits: 0, sales: 0, refunds: 0 });
      }
    });

    const sortedDates = Array.from(datesMap.keys()).sort();

    return sortedDates.map(dateKey => {
      const entry = datesMap.get(dateKey)!;
      const parts = dateKey.split('-');
      const formattedLabel = `${parts[2]}/${parts[1]}`;
      return {
        date: dateKey,
        label: formattedLabel,
        depositos: Math.round(entry.deposits),
        ventas: Math.round(entry.sales),
        reembolsos: Math.round(entry.refunds),
      };
    });
  }, [filteredMovements, filteredOrders]);

  // 3. ORDERS & SALES BREAKDOWN METRICS
  const salesStats = useMemo(() => {
    const totalOrdersCount = filteredOrders.length;
    const completedOrders = filteredOrders.filter(o => o.status === 'completed');
    const pendingOrders = filteredOrders.filter(o => o.status === 'pending_activation');
    const cancelledOrders = filteredOrders.filter(o => o.status === 'cancelled');

    const totalRevenueCents = completedOrders.reduce((sum, o) => sum + (o.priceCents || 0), 0);
    const averageOrderValueCents = completedOrders.length > 0 ? Math.round(totalRevenueCents / completedOrders.length) : 0;

    // By Presentation Mode
    const fullAccountOrders = filteredOrders.filter(o => o.presentation === 'full_account');
    const profileOrders = filteredOrders.filter(o => o.presentation === 'profile');

    // By Category
    const categoryMap = new Map<string, { count: number; totalCents: number }>();
    filteredOrders.forEach(o => {
      const cat = o.productSnapshot?.category || 'General';
      const existing = categoryMap.get(cat) || { count: 0, totalCents: 0 };
      existing.count += 1;
      existing.totalCents += o.priceCents || 0;
      categoryMap.set(cat, existing);
    });

    const categoryData = Array.from(categoryMap.entries()).map(([name, data]) => ({
      name,
      count: data.count,
      totalMXN: data.totalCents / 100,
      totalCents: data.totalCents,
    })).sort((a, b) => b.totalCents - a.totalCents);

    // Top Products by Sales Volume & Revenue
    const productMap = new Map<string, { title: string; count: number; revenueCents: number; presentation: string }>();
    filteredOrders.forEach(o => {
      const prodId = o.productId;
      const title = o.productSnapshot?.title || 'Producto';
      const presentation = o.presentation === 'profile' ? 'Perfil' : 'Cuenta Completa';
      const key = `${prodId}_${o.presentation}`;
      const existing = productMap.get(key) || { title, count: 0, revenueCents: 0, presentation };
      existing.count += 1;
      existing.revenueCents += o.priceCents || 0;
      productMap.set(key, existing);
    });

    const topProducts = Array.from(productMap.values())
      .sort((a, b) => b.revenueCents - a.revenueCents)
      .slice(0, 6)
      .map(p => ({
        ...p,
        revenueMXN: p.revenueCents / 100,
      }));

    return {
      totalOrdersCount,
      completedOrdersCount: completedOrders.length,
      pendingOrdersCount: pendingOrders.length,
      cancelledOrdersCount: cancelledOrders.length,
      totalRevenueCents,
      averageOrderValueCents,
      fullAccountCount: fullAccountOrders.length,
      profileCount: profileOrders.length,
      categoryData,
      topProducts,
    };
  }, [filteredOrders]);

  // 4. WARRANTY STATS & QUALITY METRICS
  const warrantyStats = useMemo(() => {
    const totalCases = filteredWarranties.length;
    const openCases = filteredWarranties.filter(w => w.status === 'open');
    const inReviewCases = filteredWarranties.filter(w => w.status === 'in_review');
    const resolvedReplacement = filteredWarranties.filter(w => w.status === 'resolved_replacement');
    const resolvedActivation = filteredWarranties.filter(w => w.status === 'resolved_activation');
    const resolvedRefund = filteredWarranties.filter(w => w.status === 'resolved_refund');
    const rejectedCases = filteredWarranties.filter(w => w.status === 'rejected');

    const totalActiveAttention = openCases.length + inReviewCases.length;
    const totalResolved = resolvedReplacement.length + resolvedActivation.length + resolvedRefund.length;

    // Quality rate: orders without warranty claims
    const completedCount = orders.filter(o => o.status === 'completed').length;
    const incidentRate = completedCount > 0 ? (totalCases / completedCount) * 100 : 0;
    const qualityRate = Math.max(0, 100 - incidentRate);

    const resolutionPieData = [
      { name: 'Reemplazos', value: resolvedReplacement.length, color: COLORS.emerald },
      { name: 'Reactivaciones', value: resolvedActivation.length, color: COLORS.sky },
      { name: 'Reembolsos', value: resolvedRefund.length, color: COLORS.amber },
      { name: 'Rechazados', value: rejectedCases.length, color: COLORS.zinc },
      { name: 'Por Atender', value: totalActiveAttention, color: COLORS.rose },
    ].filter(item => item.value > 0);

    return {
      totalCases,
      openCasesCount: openCases.length,
      inReviewCount: inReviewCases.length,
      totalActiveAttention,
      resolvedReplacementCount: resolvedReplacement.length,
      resolvedActivationCount: resolvedActivation.length,
      resolvedRefundCount: resolvedRefund.length,
      rejectedCount: rejectedCases.length,
      totalResolved,
      qualityRate,
      resolutionPieData,
    };
  }, [filteredWarranties, orders]);

  // 5. INVENTORY & SLOTS METRICS
  const inventoryStats = useMemo(() => {
    const totalAccounts = inventoryAccounts.length;
    const activeAccounts = inventoryAccounts.filter(a => a.status === 'active');
    const blockedAccounts = inventoryAccounts.filter(a => a.status === 'blocked');
    const exhaustedAccounts = inventoryAccounts.filter(a => a.status === 'exhausted');

    const totalSlots = activeAccounts.reduce((sum, a) => sum + (a.totalSlots || 0), 0);
    const consumedSlots = activeAccounts.reduce((sum, a) => sum + (a.consumedSlots || 0), 0);
    const availableSlots = Math.max(0, totalSlots - consumedSlots);
    const occupancyRate = totalSlots > 0 ? Math.round((consumedSlots / totalSlots) * 100) : 0;

    return {
      totalAccounts,
      activeAccountsCount: activeAccounts.length,
      blockedAccountsCount: blockedAccounts.length,
      exhaustedAccountsCount: exhaustedAccounts.length,
      totalSlots,
      consumedSlots,
      availableSlots,
      occupancyRate,
    };
  }, [inventoryAccounts]);

  return (
    <div className="space-y-6">
      {/* Top Header & Range Selection */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-zinc-900/90 border border-zinc-800 rounded-2xl p-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-4 h-4" />
            </span>
            <h2 className="text-xl font-bold text-white tracking-tight">
              Métricas & Análisis Administrativo
            </h2>
          </div>
          <p className="text-xs text-zinc-400">
            Supervisión integral de saldos de clientes, flujo de depósitos SPEI, ventas de catálogo y soporte de garantías.
          </p>
        </div>

        {/* Filters and Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Time range buttons */}
          <div className="flex items-center p-1 bg-zinc-950 border border-zinc-800 rounded-xl text-xs font-medium">
            <button
              onClick={() => setTimeRange('all')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === 'all'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              Todo
            </button>
            <button
              onClick={() => setTimeRange('30d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === '30d'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              30 Días
            </button>
            <button
              onClick={() => setTimeRange('7d')}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                timeRange === '7d'
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              7 Días
            </button>
          </div>

          {/* Quick Credit Modal Action */}
          {onOpenCreditModal && (
            <button
              onClick={() => onOpenCreditModal()}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-950/40 transition-all"
            >
              <PlusCircle className="w-4 h-4" />
              Acreditar Saldo
            </button>
          )}
        </div>
      </div>

      {/* Main KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Saldo Total en Manos de Clientes */}
        <div 
          onClick={() => onNavigateTab('balance')}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 p-5 transition-all cursor-pointer group shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 group-hover:text-emerald-400 transition-colors">
              Saldo en Custodia (Clientes)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 group-hover:scale-110 transition-transform">
              <Wallet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-emerald-400 tracking-tight">
            {formatMXN(financialStats.totalClientBalanceCents)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-800/80">
            <span>{financialStats.clientsWithBalanceCount} clientes con saldo</span>
            <span className="text-emerald-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
              Ver saldos <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 2: Ventas Totales Brutas */}
        <div 
          onClick={() => onNavigateTab('orders')}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-sky-500/40 p-5 transition-all cursor-pointer group shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 group-hover:text-sky-400 transition-colors">
              Facturación en Compras
            </span>
            <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center border border-sky-500/20 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-sky-400 tracking-tight">
            {formatMXN(salesStats.totalRevenueCents)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-800/80">
            <span>{salesStats.completedOrdersCount} pedidos completados</span>
            <span className="text-sky-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
              Ver pedidos <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 3: Depósitos SPEI Acreditados */}
        <div 
          onClick={() => onNavigateTab('balance')}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-indigo-500/40 p-5 transition-all cursor-pointer group shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 group-hover:text-indigo-400 transition-colors">
              Depósitos SPEI Históricos
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20 group-hover:scale-110 transition-transform">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl sm:text-3xl font-bold font-mono text-indigo-400 tracking-tight">
            {formatMXN(financialStats.totalDepositsCents)}
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-800/80">
            <span>{financialStats.depositsCount} recargas procesadas</span>
            <span className="text-indigo-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
              Historial <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>

        {/* KPI 4: Atención Garantías & Activaciones */}
        <div 
          onClick={() => onNavigateTab(warrantyStats.totalActiveAttention > 0 ? 'warranty' : 'orders')}
          className="rounded-2xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/40 p-5 transition-all cursor-pointer group shadow-lg shadow-black/20"
        >
          <div className="flex items-center justify-between text-zinc-400 text-xs mb-3">
            <span className="font-semibold uppercase tracking-wider text-[11px] text-zinc-400 group-hover:text-amber-400 transition-colors">
              Atención Inmediata
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 group-hover:scale-110 transition-transform">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-bold font-mono text-amber-400 tracking-tight">
              {warrantyStats.totalActiveAttention + salesStats.pendingOrdersCount}
            </span>
            <span className="text-xs text-zinc-400">casos pendientes</span>
          </div>
          <div className="flex items-center justify-between text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-800/80">
            <span>{salesStats.pendingOrdersCount} activaciones / {warrantyStats.totalActiveAttention} garantías</span>
            <span className="text-amber-400 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform text-[11px]">
              Resolver <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-zinc-800 text-xs font-semibold">
        <button
          onClick={() => setActiveSection('all')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSection === 'all'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Vista Integral</span>
        </button>
        <button
          onClick={() => setActiveSection('finances')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSection === 'finances'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <Wallet className="w-3.5 h-3.5 text-emerald-400" />
          <span>Tesorería & Saldos</span>
        </button>
        <button
          onClick={() => setActiveSection('sales')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSection === 'sales'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <ShoppingBag className="w-3.5 h-3.5 text-sky-400" />
          <span>Compras & Catálogo</span>
        </button>
        <button
          onClick={() => setActiveSection('warranties')}
          className={`px-4 py-2 rounded-xl transition-all flex items-center gap-1.5 ${
            activeSection === 'warranties'
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
          <span>Garantías & Calidad</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SECTION 1: TIMELINE & BALANCE OVERVIEW */}
      {/* ======================================================== */}
      {(activeSection === 'all' || activeSection === 'finances') && (
        <div className="space-y-6">
          {/* Main Chart: Depósitos vs Compras Timeline */}
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <TrendingUp className="w-4 h-4 text-emerald-400" />
                  <span>Flujo Cronológico: Depósitos SPEI vs Compras de Clientes</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Comparativa de dinero ingresado por recargas vs compras de licencias en el tiempo (MXN).
                </p>
              </div>

              {/* Legend Summary */}
              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500" />
                  <span className="text-zinc-300">Depósitos ({formatMXN(financialStats.totalDepositsCents)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded bg-sky-500" />
                  <span className="text-zinc-300">Compras ({formatMXN(salesStats.totalRevenueCents)})</span>
                </div>
              </div>
            </div>

            {timelineChartData.length > 0 ? (
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timelineChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="adminDepositGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                      </linearGradient>
                      <linearGradient id="adminSalesGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.4} />
                        <stop offset="95%" stopColor="#0ea5e9" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                    <XAxis dataKey="label" stroke="#71717a" fontSize={11} tickLine={false} />
                    <YAxis
                      stroke="#71717a"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#18181b',
                        borderColor: '#27272a',
                        borderRadius: '0.75rem',
                        color: '#f4f4f5',
                        fontSize: '12px',
                        boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.5)',
                      }}
                      formatter={(val: any, name: any) => {
                        const label = name === 'depositos' ? 'Depósitos SPEI' : name === 'ventas' ? 'Compras Clientes' : 'Reembolsos';
                        return [`$${Number(val).toLocaleString('es-MX')} MXN`, label];
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="depositos"
                      name="depositos"
                      stroke="#10b981"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#adminDepositGrad)"
                    />
                    <Area
                      type="monotone"
                      dataKey="ventas"
                      name="ventas"
                      stroke="#0ea5e9"
                      strokeWidth={2.5}
                      fillOpacity={1}
                      fill="url(#adminSalesGrad)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                <BarChart3 className="w-8 h-8 mb-2 opacity-50" />
                <span>No se registraron movimientos en este período de tiempo seleccionado.</span>
              </div>
            )}
          </div>

          {/* Two Columns: Top Clientes por Saldo & Desglose Financiero */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Clientes con Mayor Saldo */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <Users className="w-4 h-4 text-emerald-400" />
                  <span>Clientes con Mayor Saldo Activo</span>
                </div>
                <button
                  onClick={() => onNavigateTab('users')}
                  className="text-xs text-emerald-400 hover:text-emerald-300 font-medium flex items-center gap-1"
                >
                  Ver todos ({financialStats.clientUsersCount}) <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {financialStats.topClientsByBalance.length > 0 ? (
                <div className="space-y-3">
                  {financialStats.topClientsByBalance.map((client, idx) => (
                    <div
                      key={client.id}
                      className="p-3 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between hover:border-emerald-500/30 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span className="w-6 h-6 rounded-full bg-zinc-800 text-zinc-300 text-xs font-mono font-bold flex items-center justify-center shrink-0">
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-sm font-semibold text-zinc-200">
                            {client.name}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono">
                            {client.email} • Folio: <span className="text-emerald-400">{client.customerCode}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="font-mono font-bold text-emerald-400 text-sm">
                          {formatMXN(client.balanceCents)}
                        </div>
                        {onOpenCreditModal && (
                          <button
                            onClick={() => onOpenCreditModal(client.id)}
                            className="text-[11px] text-zinc-400 hover:text-zinc-200 underline mt-0.5"
                          >
                            Ajustar saldo
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  No hay clientes con saldo positivo actualmente.
                </div>
              )}
            </div>

            {/* Resumen de Tesorería */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center gap-2 text-white font-bold text-base">
                <Wallet className="w-4 h-4 text-indigo-400" />
                <span>Balance General de Tesorería</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400 uppercase font-mono">Total Depósitos SPEI</div>
                  <div className="text-base font-bold font-mono text-emerald-400 mt-1">
                    {formatMXN(financialStats.totalDepositsCents)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{financialStats.depositsCount} transferencias</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400 uppercase font-mono">Depósito Promedio</div>
                  <div className="text-base font-bold font-mono text-zinc-200 mt-1">
                    {formatMXN(financialStats.averageDepositCents)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">por acreditación</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400 uppercase font-mono">Total Reembolsos</div>
                  <div className="text-base font-bold font-mono text-rose-400 mt-1">
                    {formatMXN(financialStats.totalRefundsCents)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">{financialStats.refundsCount} operaciones</div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/80 border border-zinc-800">
                  <div className="text-[11px] text-zinc-400 uppercase font-mono">Retención Neta</div>
                  <div className="text-base font-bold font-mono text-indigo-400 mt-1">
                    {formatMXN(financialStats.netDepositsCents)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-0.5">ingresos netos recibidos</div>
                </div>
              </div>

              <div className="pt-2 border-t border-zinc-800 flex items-center justify-between text-xs">
                <span className="text-zinc-400">Total clientes registrados:</span>
                <span className="font-bold text-zinc-200">{financialStats.clientUsersCount} usuarios</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 2: PURCHASES & CATALOG METRICS */}
      {/* ======================================================== */}
      {(activeSection === 'all' || activeSection === 'sales') && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Productos Más Vendidos */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <BarChart3 className="w-4 h-4 text-sky-400" />
                  <span>Productos con Mayor Facturación</span>
                </div>
                <button
                  onClick={() => onNavigateTab('products')}
                  className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center gap-1"
                >
                  Gestionar Catálogo <ArrowUpRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {salesStats.topProducts.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={salesStats.topProducts}
                      layout="vertical"
                      margin={{ top: 5, right: 20, left: 10, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#27272a" horizontal={false} />
                      <XAxis type="number" stroke="#71717a" fontSize={11} tickFormatter={(val) => `$${val}`} />
                      <YAxis
                        type="category"
                        dataKey="title"
                        stroke="#71717a"
                        fontSize={11}
                        width={110}
                        tickFormatter={(val) => (val.length > 14 ? val.slice(0, 14) + '…' : val)}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '0.75rem',
                          color: '#f4f4f5',
                          fontSize: '12px',
                        }}
                        formatter={(val: any, name: any, item: any) => [
                          `$${Number(val).toLocaleString('es-MX')} MXN (${item.payload.count} ventas)`,
                          'Ingresos',
                        ]}
                      />
                      <Bar dataKey="revenueMXN" fill="#0ea5e9" radius={[0, 6, 6, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  No hay pedidos registrados en este período.
                </div>
              )}
            </div>

            {/* Ventas por Categoría */}
            <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <PieChartIcon className="w-4 h-4 text-purple-400" />
                  <span>Distribución por Categoría</span>
                </div>
                <div className="text-xs text-zinc-400 font-mono">
                  Ticket Promedio: <strong className="text-zinc-200">{formatMXN(salesStats.averageOrderValueCents)}</strong>
                </div>
              </div>

              {salesStats.categoryData.length > 0 ? (
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <div className="h-56 w-56 shrink-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={salesStats.categoryData}
                          dataKey="totalMXN"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          innerRadius={45}
                          outerRadius={75}
                          paddingAngle={3}
                        >
                          {salesStats.categoryData.map((entry, index) => (
                            <Cell
                              key={`cat-cell-${index}`}
                              fill={CATEGORY_PALETTE[index % CATEGORY_PALETTE.length]}
                            />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            borderColor: '#27272a',
                            borderRadius: '0.75rem',
                            color: '#f4f4f5',
                            fontSize: '12px',
                          }}
                          formatter={(val: any) => [`$${Number(val).toLocaleString('es-MX')} MXN`, 'Ventas']}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="flex-1 space-y-2 w-full text-xs">
                    {salesStats.categoryData.slice(0, 5).map((cat, idx) => (
                      <div key={cat.name} className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/60 border border-zinc-800">
                        <div className="flex items-center gap-2">
                          <div
                            className="w-2.5 h-2.5 rounded-full shrink-0"
                            style={{ backgroundColor: CATEGORY_PALETTE[idx % CATEGORY_PALETTE.length] }}
                          />
                          <span className="font-medium text-zinc-200 truncate max-w-[120px]">{cat.name}</span>
                        </div>
                        <div className="text-right font-mono">
                          <span className="font-bold text-zinc-100">{formatMXN(cat.totalCents)}</span>
                          <span className="text-[10px] text-zinc-500 ml-1.5">({cat.count})</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-48 flex items-center justify-center text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                  Sin datos de categorías en este período.
                </div>
              )}
            </div>
          </div>

          {/* Modalidades de Entrega & Rendimiento de Stock */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center border border-purple-500/20 shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Modalidad de Pedidos</div>
                <div className="text-sm font-bold text-zinc-200 mt-0.5">
                  {salesStats.fullAccountCount} Cuentas / {salesStats.profileCount} Perfiles
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Cupos Disponibles Libres</div>
                <div className="text-sm font-bold text-emerald-400 mt-0.5">
                  {inventoryStats.availableSlots} de {inventoryStats.totalSlots} cupos
                </div>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shrink-0">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs text-zinc-400">Activaciones Pendientes</div>
                <div className="text-sm font-bold text-amber-400 mt-0.5">
                  {salesStats.pendingOrdersCount} pedidos por entregar
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* SECTION 3: WARRANTIES & QUALITY */}
      {/* ======================================================== */}
      {(activeSection === 'all' || activeSection === 'warranties') && (
        <div className="space-y-6">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-white font-bold text-base">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Salud de Operaciones & Garantías</span>
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Métricas de soporte post-venta, resoluciones y tasa de efectividad de licencias.
                </p>
              </div>

              <button
                onClick={() => onNavigateTab('warranty')}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
              >
                Ir a Centro de Garantías ({warrantyStats.openCasesCount + warrantyStats.inReviewCount} abiertos) <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-mono">Tasa de Confiabilidad</div>
                <div className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                  {warrantyStats.qualityRate.toFixed(1)}%
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">pedidos sin incidencias</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-mono">Tickets Resueltos</div>
                <div className="text-2xl font-bold font-mono text-indigo-400 mt-1">
                  {warrantyStats.totalResolved}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">reemplazos y soluciones</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-mono">Reemplazos Otorgados</div>
                <div className="text-2xl font-bold font-mono text-sky-400 mt-1">
                  {warrantyStats.resolvedReplacementCount}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">nuevas credenciales</div>
              </div>

              <div className="p-4 rounded-xl bg-zinc-950/80 border border-zinc-800">
                <div className="text-[11px] text-zinc-400 uppercase font-mono">Rechazados / No Procede</div>
                <div className="text-2xl font-bold font-mono text-zinc-400 mt-1">
                  {warrantyStats.rejectedCount}
                </div>
                <div className="text-[11px] text-zinc-500 mt-0.5">por políticas de uso</div>
              </div>
            </div>

            {/* Resolution Distribution Pie Chart */}
            {warrantyStats.resolutionPieData.length > 0 && (
              <div className="pt-4 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-6">
                <div className="h-44 w-44 shrink-0">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={warrantyStats.resolutionPieData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        innerRadius={35}
                        outerRadius={60}
                        paddingAngle={3}
                      >
                        {warrantyStats.resolutionPieData.map((entry, index) => (
                          <Cell key={`res-cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#18181b',
                          borderColor: '#27272a',
                          borderRadius: '0.75rem',
                          color: '#f4f4f5',
                          fontSize: '12px',
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                  {warrantyStats.resolutionPieData.map((item) => (
                    <div key={item.name} className="p-2 rounded-lg bg-zinc-950/60 border border-zinc-800 flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div className="truncate">
                        <span className="text-zinc-300 font-medium">{item.name}</span>
                        <span className="text-zinc-500 font-mono ml-1 font-bold">({item.value})</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
