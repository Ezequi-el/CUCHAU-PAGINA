import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  ShoppingBag, 
  KeyRound, 
  Clock, 
  ShieldCheck, 
  ArrowUpRight, 
  Copy, 
  Check, 
  AlertCircle, 
  Send, 
  Sparkles, 
  ChevronRight,
  ExternalLink,
  Gift,
  Coins,
  Megaphone,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN, formatDate } from '../api';
import { Order, BalanceMovement, WarrantyCase, InfoBanner } from '../types';

export const ClientDashboard: React.FC = () => {
  const { user, settings, setActiveTab } = useAuth();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [allMovements, setAllMovements] = useState<BalanceMovement[]>([]);
  const [warrantyCases, setWarrantyCases] = useState<WarrantyCase[]>([]);
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [recentMovements, setRecentMovements] = useState<BalanceMovement[]>([]);
  const [banners, setBanners] = useState<InfoBanner[]>([]);
  const [dismissedBannerIds, setDismissedBannerIds] = useState<string[]>(() => {
    try {
      const stored = sessionStorage.getItem('privakey_dismissed_banners');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedRefCode, setCopiedRefCode] = useState(false);

  useEffect(() => {
    loadData();
  }, [user?.id]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [orders, movements, warranties, activeBanners] = await Promise.all([
        api.orders.list(),
        api.wallet.getMovements(),
        api.warranty.list(),
        api.banners.listActive(),
      ]);
      setAllOrders(orders || []);
      setAllMovements(movements || []);
      setWarrantyCases(warranties || []);
      setRecentOrders((orders || []).slice(0, 3));
      setRecentMovements((movements || []).slice(0, 4));
      setBanners(activeBanners || []);
    } catch (err) {
      console.error('Error loading dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissBanner = (bannerId: string) => {
    setDismissedBannerIds(prev => {
      const next = [...prev, bannerId];
      try {
        sessionStorage.setItem('privakey_dismissed_banners', JSON.stringify(next));
      } catch (e) {
        console.error(e);
      }
      return next;
    });
  };

  const handleBannerActionClick = (linkUrl?: string) => {
    if (!linkUrl) return;
    const clean = linkUrl.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('//')) {
      window.open(clean, '_blank', 'noopener,noreferrer');
    } else {
      const tabId = clean.toLowerCase();
      if (['referidos', 'catalogo', 'recargar', 'compras', 'garantias'].includes(tabId)) {
        setActiveTab(tabId as any);
      }
    }
  };

  const copyCustomerCode = () => {
    if (user?.customerCode) {
      navigator.clipboard.writeText(user.customerCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  if (!user) return null;

  return (
    <div className="space-y-8 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Customizable Info Banners / Announcements */}
      {banners.filter(b => b.active && !dismissedBannerIds.includes(b.id)).length > 0 && (
        <div className="space-y-3">
          {banners
            .filter(b => b.active && !dismissedBannerIds.includes(b.id))
            .map(banner => {
              const isReferral = banner.type === 'referral';
              const isAnnouncement = banner.type === 'announcement';
              const isPromo = banner.type === 'promo';
              const isWarning = banner.type === 'warning';

              return (
                <div
                  key={banner.id}
                  className={`relative overflow-hidden rounded-2xl p-4 sm:p-5 border transition-all shadow-lg flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
                    isReferral
                      ? 'bg-gradient-to-r from-amber-950/60 via-zinc-900 to-amber-950/30 border-amber-500/40 text-amber-100 shadow-amber-950/20'
                      : isAnnouncement
                      ? 'bg-gradient-to-r from-purple-950/60 via-zinc-900 to-purple-950/30 border-purple-500/40 text-purple-100 shadow-purple-950/20'
                      : isPromo
                      ? 'bg-gradient-to-r from-emerald-950/60 via-zinc-900 to-emerald-950/30 border-emerald-500/40 text-emerald-100 shadow-emerald-950/20'
                      : isWarning
                      ? 'bg-gradient-to-r from-rose-950/60 via-zinc-900 to-rose-950/30 border-rose-500/40 text-rose-100 shadow-rose-950/20'
                      : 'bg-gradient-to-r from-sky-950/60 via-zinc-900 to-sky-950/30 border-sky-500/40 text-sky-100 shadow-sky-950/20'
                  }`}
                >
                  <div className="flex items-start gap-3.5 pr-8 sm:pr-0">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
                      isReferral
                        ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                        : isAnnouncement
                        ? 'bg-purple-500/20 text-purple-400 border-purple-500/30'
                        : isPromo
                        ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                        : isWarning
                        ? 'bg-rose-500/20 text-rose-400 border-rose-500/30'
                        : 'bg-sky-500/20 text-sky-400 border-sky-500/30'
                    }`}>
                      {isReferral ? (
                        <Gift className="w-5 h-5" />
                      ) : isAnnouncement ? (
                        <Sparkles className="w-5 h-5" />
                      ) : isPromo ? (
                        <Coins className="w-5 h-5" />
                      ) : (
                        <Megaphone className="w-5 h-5" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        {banner.badgeText && (
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                            isReferral
                              ? 'bg-amber-400 text-zinc-950'
                              : isAnnouncement
                              ? 'bg-purple-400 text-zinc-950'
                              : isPromo
                              ? 'bg-emerald-400 text-zinc-950'
                              : 'bg-white/20 text-white'
                          }`}>
                            {banner.badgeText}
                          </span>
                        )}
                        <h3 className="text-sm sm:text-base font-bold text-white tracking-tight">
                          {banner.title}
                        </h3>
                      </div>
                      <p className="text-xs text-zinc-300 max-w-3xl leading-relaxed">
                        {banner.message}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                    {banner.linkText && banner.linkUrl && (
                      <button
                        onClick={() => handleBannerActionClick(banner.linkUrl)}
                        className={`px-4 py-2 rounded-xl text-xs font-bold shadow-md transition-all flex items-center gap-1.5 hover:scale-[1.02] ${
                          isReferral
                            ? 'bg-amber-500 hover:bg-amber-400 text-zinc-950'
                            : isAnnouncement
                            ? 'bg-purple-600 hover:bg-purple-500 text-white'
                            : isPromo
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-zinc-100 hover:bg-white text-zinc-950'
                        }`}
                      >
                        <span>{banner.linkText}</span>
                        {banner.linkUrl.startsWith('http') ? (
                          <ExternalLink className="w-3 h-3" />
                        ) : (
                          <ChevronRight className="w-3 h-3" />
                        )}
                      </button>
                    )}

                    {banner.dismissible && (
                      <button
                        onClick={() => handleDismissBanner(banner.id)}
                        className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-black/30 transition-colors"
                        title="Ocultar aviso"
                        aria-label="Cerrar aviso"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* Welcome & Balance Hero */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <div className="lg:col-span-2 relative overflow-hidden rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-950 border border-zinc-800 p-6 sm:p-8 shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
          
          <div className="relative z-10 flex flex-col justify-between h-full space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Bóveda Privada Activa
                </span>
                <h1 className="text-2xl sm:text-3xl font-bold text-white mt-2">
                  Hola, {user.name}
                </h1>
                <p className="text-sm text-zinc-400">
                  Saldo en pesos mexicanos y compras protegidas con garantía directa.
                </p>
              </div>

              {/* Customer ID Badge */}
              <div className="bg-zinc-950/80 border border-zinc-800 rounded-xl p-3 flex items-center gap-3">
                <div>
                  <div className="text-[10px] text-zinc-400 font-medium uppercase tracking-wider">Tu Identificador</div>
                  <div className="text-base font-mono font-bold text-zinc-100">{user.customerCode}</div>
                </div>
                <button
                  onClick={copyCustomerCode}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white transition-colors"
                  title="Copiar folio para concepto SPEI"
                >
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="pt-4 border-t border-zinc-800/80 flex flex-wrap items-end justify-between gap-4">
              <div>
                <div className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Saldo Disponible</div>
                <div className="text-3xl sm:text-4xl font-extrabold font-mono text-emerald-400 tracking-tight mt-0.5">
                  {formatMXN(user.balanceCents)}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={() => setActiveTab('recargar')}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all hover:translate-y-[-1px]"
                >
                  <Wallet className="w-4 h-4" />
                  Recargar Saldo SPEI
                </button>

                <button
                  onClick={() => setActiveTab('catalogo')}
                  className="px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-sm border border-zinc-700 flex items-center gap-2 transition-all"
                >
                  <ShoppingBag className="w-4 h-4" />
                  Ver Catálogo
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Step-by-Step Flow Card */}
        <div className="rounded-2xl bg-zinc-900/90 border border-zinc-800 p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 text-zinc-100 font-bold text-base mb-3">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <span>Flujo de Compra Privado</span>
            </div>
            <p className="text-xs text-zinc-400 mb-4">
              Sistema exclusivo por saldo interno para garantizar entregas seguras y sin intermediarios.
            </p>

            <ol className="space-y-3 text-xs">
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] border border-zinc-700">1</span>
                <div>
                  <span className="font-semibold text-zinc-200">Transfiere por SPEI</span>
                  <p className="text-zinc-400 text-[11px]">Usa tu folio <strong className="text-emerald-400 font-mono">{user.customerCode}</strong> como concepto.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] border border-zinc-700">2</span>
                <div>
                  <span className="font-semibold text-zinc-200">Envía comprobante a Telegram</span>
                  <p className="text-zinc-400 text-[11px]">El administrador acredita tu saldo en minutos.</p>
                </div>
              </li>
              <li className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-zinc-800 text-emerald-400 font-mono font-bold flex items-center justify-center shrink-0 text-[11px] border border-zinc-700">3</span>
                <div>
                  <span className="font-semibold text-zinc-200">Adquiere y recibe al instante</span>
                  <p className="text-zinc-400 text-[11px]">Claves directas o activación por correo con garantía.</p>
                </div>
              </li>
            </ol>
          </div>

          <div className="mt-5 pt-3 border-t border-zinc-800">
            <a
              href={settings?.telegramLink || 'https://t.me/PrivaKeySoporte'}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-sky-400 hover:text-sky-300 font-medium flex items-center justify-between p-2 rounded-lg bg-sky-950/20 border border-sky-900/40 hover:bg-sky-950/40 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5" />
                Telegram Oficial: {settings?.telegramUsername || '@PrivaKeySoporte'}
              </span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </div>

      {/* Quick Action Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('catalogo')}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left group hover:bg-zinc-850"
        >
          <div className="w-10 h-10 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-zinc-200 group-hover:text-emerald-400 transition-colors">
            Catálogo Privado
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Explora licencias y suscripciones</div>
        </button>

        <button
          onClick={() => setActiveTab('recargar')}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left group hover:bg-zinc-850"
        >
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <Wallet className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-zinc-200 group-hover:text-amber-400 transition-colors">
            Datos Bancarios
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">CLABE para transferencias SPEI</div>
        </button>

        <button
          onClick={() => setActiveTab('compras')}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left group hover:bg-zinc-850"
        >
          <div className="w-10 h-10 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <KeyRound className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-zinc-200 group-hover:text-sky-400 transition-colors">
            Mis Compras
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Claves entregadas y activación</div>
        </button>

        <button
          onClick={() => setActiveTab('garantias')}
          className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/40 transition-all text-left group hover:bg-zinc-850"
        >
          <div className="w-10 h-10 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center mb-3 group-hover:scale-110 transition-transform">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div className="text-sm font-bold text-zinc-200 group-hover:text-indigo-400 transition-colors">
            Centro de Garantías
          </div>
          <div className="text-xs text-zinc-400 mt-0.5">Reportes y reemplazos</div>
        </button>
      </div>

      {/* Referral Program Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-amber-950/40 via-zinc-900 to-amber-950/20 border border-amber-500/30 p-5 sm:p-6 flex flex-col md:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <Gift className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-400">Programa de Referidos</span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-400 text-zinc-950">
                Gana Comisión o Puntos
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-bold text-white">
              Recomienda amigos con tu código y recibe recompensas
            </h3>
            <p className="text-xs text-zinc-400 max-w-xl">
              Comparte tu código personal. Cada vez que tus amigos compren o recarguen, ganarás comisiones en saldo MXN o puntos canjeables para tus compras.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0 w-full md:w-auto">
          <div className="p-3 rounded-xl bg-zinc-950 border border-amber-500/30 flex items-center justify-between gap-3 w-full sm:w-auto">
            <div className="space-y-0.5">
              <span className="text-[10px] uppercase font-mono text-zinc-400 block">Tu Código</span>
              <span className="font-mono text-base font-extrabold text-amber-400">{user.referralCode || user.customerCode}</span>
            </div>
            <button
              onClick={() => {
                navigator.clipboard.writeText(user.referralCode || user.customerCode);
                setCopiedRefCode(true);
                setTimeout(() => setCopiedRefCode(false), 2000);
              }}
              className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
              title="Copiar código de referido"
            >
              {copiedRefCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={() => setActiveTab('referidos')}
            className="w-full sm:w-auto px-4 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>Ver Mis Puntos y Referidos</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Two Columns: Recent Orders & Recent Movements */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-zinc-100 text-base">
              <KeyRound className="w-4 h-4 text-emerald-400" />
              <span>Compras Recientes</span>
            </div>
            <button
              onClick={() => setActiveTab('compras')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Ver todas <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500">Cargando compras...</div>
          ) : recentOrders.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 space-y-3">
              <ShoppingBag className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">Aún no has realizado ninguna compra.</p>
              <button
                onClick={() => setActiveTab('catalogo')}
                className="px-4 py-2 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 text-xs font-semibold hover:bg-emerald-600/30"
              >
                Explorar Catálogo Privado
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentOrders.map(order => (
                <div
                  key={order.id}
                  onClick={() => setActiveTab('compras')}
                  className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 hover:border-zinc-700 cursor-pointer transition-all flex items-center justify-between gap-3 group"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-sm text-zinc-200 group-hover:text-emerald-400 transition-colors">
                      {order.productSnapshot.title}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono">
                      <span>{order.id}</span>
                      <span>•</span>
                      <span>{formatDate(order.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-mono font-bold text-sm text-zinc-200">
                      {formatMXN(order.priceCents)}
                    </div>
                    <span
                      className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full mt-1 ${
                        order.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : order.status === 'pending_activation'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {order.status === 'completed'
                        ? 'Entregado'
                        : order.status === 'pending_activation'
                        ? 'Pendiente de activación'
                        : 'Cancelado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Movements */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-zinc-100 text-base">
              <Clock className="w-4 h-4 text-emerald-400" />
              <span>Últimos Movimientos de Saldo</span>
            </div>
            <button
              onClick={() => setActiveTab('movimientos')}
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              Ver historial <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-zinc-500">Cargando movimientos...</div>
          ) : recentMovements.length === 0 ? (
            <div className="py-10 text-center text-zinc-500 space-y-2">
              <Wallet className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">No hay movimientos registrados todavía.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recentMovements.map(mov => {
                const isPositive = mov.amountCents > 0;
                return (
                  <div
                    key={mov.id}
                    className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800/80 flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="text-xs font-semibold text-zinc-200 line-clamp-1">
                        {mov.reason}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-mono">
                        <span className="text-zinc-500">{mov.reference}</span>
                        <span>•</span>
                        <span>{formatDate(mov.createdAt)}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div
                        className={`font-mono font-bold text-sm ${
                          isPositive ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {isPositive ? '+' : ''}
                        {formatMXN(mov.amountCents)}
                      </div>
                      <div className="text-[10px] text-zinc-400 font-mono mt-0.5">
                        Saldo: {formatMXN(mov.balanceAfterCents)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
