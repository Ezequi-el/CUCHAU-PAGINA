import React, { useState, useEffect } from 'react';
import { 
  Gift, 
  Copy, 
  Check, 
  Users, 
  Coins, 
  ArrowRight, 
  Sparkles, 
  Share2, 
  Clock, 
  CheckCircle2, 
  AlertCircle,
  ShoppingBag,
  ExternalLink,
  ChevronRight,
  UserCheck,
  Megaphone,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN, formatDate } from '../api';
import { ReferralReward, InfoBanner } from '../types';

export const ReferralProgramView: React.FC = () => {
  const { user, refreshUser, setActiveTab, settings } = useAuth();
  const [stats, setStats] = useState<{
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
  } | null>(null);

  const [banners, setBanners] = useState<InfoBanner[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Bind referrer state
  const [bindCodeInput, setBindCodeInput] = useState('');
  const [bindLoading, setBindLoading] = useState(false);
  const [bindMessage, setBindMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Redeem points modal state
  const [redeemModalOpen, setRedeemModalOpen] = useState(false);
  const [pointsToRedeem, setPointsToRedeem] = useState('');
  const [redeemLoading, setRedeemLoading] = useState(false);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadReferralStats();
  }, [user?.id]);

  const loadReferralStats = async () => {
    try {
      setLoading(true);
      const [data, activeBanners] = await Promise.all([
        api.referrals.getMyStats(),
        api.banners.listActive(),
      ]);
      setStats(data);
      setBanners(activeBanners || []);
    } catch (err) {
      console.error('Error loading referral stats:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDismissBanner = (bannerId: string) => {
    setDismissedBanners(prev => [...prev, bannerId]);
  };

  const handleBannerAction = (url?: string) => {
    if (!url) return;
    const clean = url.trim();
    if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('//')) {
      window.open(clean, '_blank', 'noopener,noreferrer');
    } else {
      const tabId = clean.toLowerCase();
      if (['referidos', 'catalogo', 'recargar', 'compras', 'garantias'].includes(tabId)) {
        setActiveTab(tabId as any);
      }
    }
  };

  const copyCode = () => {
    const code = stats?.referralCode || user?.referralCode || user?.customerCode || '';
    if (code) {
      navigator.clipboard.writeText(code);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  };

  const copyShareLink = () => {
    const code = stats?.referralCode || user?.referralCode || user?.customerCode || '';
    const link = `${window.location.origin}/?ref=${code}`;
    navigator.clipboard.writeText(link);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleBindReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bindCodeInput.trim()) return;

    try {
      setBindLoading(true);
      setBindMessage(null);
      await api.referrals.bindCode(bindCodeInput.trim());
      await refreshUser();
      await loadReferralStats();
      setBindMessage({ type: 'success', text: `¡Código vinculado correctamente! Tu referente recibirá comisiones por tus compras y recargas.` });
      setBindCodeInput('');
    } catch (err: any) {
      setBindMessage({ type: 'error', text: err.message || 'Error al vincular código.' });
    } finally {
      setBindLoading(false);
    }
  };

  const handleRedeemPoints = async () => {
    const pts = parseInt(pointsToRedeem);
    if (isNaN(pts) || pts <= 0) {
      setRedeemError('Ingresa una cantidad de puntos válida.');
      return;
    }

    if (pts > (stats?.pointsBalance || 0)) {
      setRedeemError('No tienes suficientes puntos para realizar este canje.');
      return;
    }

    try {
      setRedeemLoading(true);
      setRedeemError(null);
      const res = await api.referrals.redeemPoints(pts);
      await refreshUser();
      await loadReferralStats();
      setRedeemSuccess(`¡Canje exitoso! Se han acreditado ${formatMXN(res.creditedCents)} de saldo directamente a tu cuenta.`);
      setPointsToRedeem('');
      setTimeout(() => {
        setRedeemSuccess(null);
        setRedeemModalOpen(false);
      }, 2500);
    } catch (err: any) {
      setRedeemError(err.message || 'Error al canjear puntos.');
    } finally {
      setRedeemLoading(false);
    }
  };

  const commissionRate = stats?.settings?.referralCommissionRate ?? 5;
  const pointsRateCents = stats?.settings?.pointsExchangeRateCents ?? 10;
  const currentPoints = stats?.pointsBalance ?? user?.referralPoints ?? 0;
  const pointsWorthCents = currentPoints * pointsRateCents;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Top Banner */}
      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 mb-2">
          <Gift className="w-3.5 h-3.5" /> Programa de Beneficios & Puntos
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Recomienda a tus Amigos y Gana
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Comparte tu código de referido. Gana comisiones en saldo cashback ({commissionRate}%) o acumula puntos para adquirir cuentas completas y perfiles digitales sin costo.
        </p>
      </div>

      {/* Customizable Info Banners / Promotional Notices */}
      {banners.filter(b => b.active && !dismissedBanners.includes(b.id)).length > 0 && (
        <div className="space-y-3">
          {banners
            .filter(b => b.active && !dismissedBanners.includes(b.id))
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
                        onClick={() => handleBannerAction(banner.linkUrl)}
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

      {/* Hero Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: My Referral Code */}
        <div className="rounded-2xl bg-gradient-to-br from-zinc-900 via-zinc-900 to-amber-950/20 border border-amber-500/30 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                <Share2 className="w-3.5 h-3.5" /> Tu Código Personal
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-500/30">
                {commissionRate}% Comisión
              </span>
            </div>
            
            <div className="mt-4 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
              <div className="font-mono text-xl font-extrabold text-white tracking-wider">
                {stats?.referralCode || user?.customerCode}
              </div>
              <button
                onClick={copyCode}
                className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow"
              >
                {copiedCode ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-zinc-950" />
                    <span>Copiado</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copiar</span>
                  </>
                )}
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 mt-2">
              Tus amigos lo ingresan al comprar o recargar saldo para vincularse a tu red.
            </p>
          </div>

          <div className="pt-3 border-t border-zinc-800/80 flex items-center justify-between">
            <button
              onClick={copyShareLink}
              className="text-xs text-amber-400 hover:text-amber-300 font-semibold flex items-center gap-1.5 transition-colors"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Enlace directo copiado' : 'Copiar enlace con código'}</span>
            </button>
          </div>
        </div>

        {/* Card 2: Points Balance */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" /> Puntos Disponibles
              </span>
              <span className="text-[10px] text-zinc-500 font-mono">
                100 pts = {formatMXN(100 * pointsRateCents)}
              </span>
            </div>

            <div className="mt-3 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-amber-400">
                {currentPoints}
              </span>
              <span className="text-xs font-medium text-zinc-400">
                pts acumulados
              </span>
            </div>
            <div className="text-xs text-zinc-400 mt-1">
              Valor de canje: <strong className="text-emerald-400 font-mono">{formatMXN(pointsWorthCents)}</strong> para comprar en la tienda.
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
            <button
              onClick={() => {
                setRedeemModalOpen(true);
                setPointsToRedeem(String(currentPoints));
                setRedeemError(null);
                setRedeemSuccess(null);
              }}
              disabled={currentPoints <= 0}
              className="w-full py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-all disabled:opacity-40 disabled:cursor-not-allowed shadow"
            >
              <Coins className="w-4 h-4" />
              <span>Canjear Puntos por Saldo</span>
            </button>
          </div>
        </div>

        {/* Card 3: Lifetime Earnings & Friends */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5 text-emerald-400" /> Tu Red de Amigos
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                Activa
              </span>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[11px] text-zinc-500">Amigos Referidos</div>
                <div className="text-2xl font-bold font-mono text-zinc-100">
                  {stats?.referredFriendsCount ?? 0}
                </div>
              </div>
              <div>
                <div className="text-[11px] text-zinc-500">Cashback Total Ganado</div>
                <div className="text-2xl font-bold font-mono text-emerald-400">
                  {formatMXN(stats?.earningsCents ?? 0)}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
            <span>Saldo actual disponible:</span>
            <strong className="text-white font-mono">{formatMXN(user?.balanceCents || 0)}</strong>
          </div>
        </div>
      </div>

      {/* Referrer Attribution Section */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <span>Patrocinador / Código que te Recomendó</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-1">
              Si fuiste invitado por un amigo o colega, ingresa su código de referido para que reciba sus comisiones.
            </p>
          </div>

          {stats?.referrerInfo ? (
            <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                ✓
              </div>
              <div>
                <div className="text-[10px] text-zinc-400 uppercase">Referido oficialmente por</div>
                <div className="text-sm font-semibold text-zinc-100">
                  {stats.referrerInfo.name} <span className="font-mono text-xs text-emerald-400">({stats.referrerInfo.code})</span>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleBindReferrer} className="flex items-center gap-2 max-w-md w-full">
              <input
                type="text"
                value={bindCodeInput}
                onChange={e => setBindCodeInput(e.target.value.toUpperCase())}
                placeholder="Código (ej. CLI-84920)"
                className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-500"
              />
              <button
                type="submit"
                disabled={bindLoading || !bindCodeInput.trim()}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-bold transition-colors disabled:opacity-40"
              >
                {bindLoading ? 'Guardando...' : 'Vincular'}
              </button>
            </form>
          )}
        </div>

        {bindMessage && (
          <div className={`mt-3 p-3 rounded-xl text-xs flex items-center gap-2 ${
            bindMessage.type === 'success' ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800' : 'bg-rose-950/60 text-rose-300 border border-rose-800'
          }`}>
            {bindMessage.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" /> : <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />}
            <span>{bindMessage.text}</span>
          </div>
        )}
      </div>

      {/* Main Bottom Grid: Friends List & Rewards History */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Referred Friends */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-emerald-400" />
              <span>Amigos en tu Red ({stats?.referredFriendsCount ?? 0})</span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">Comisión activa</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Cargando amigos...</div>
          ) : !stats?.referredFriends || stats.referredFriends.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-3">
              <Users className="w-10 h-10 mx-auto text-zinc-600 opacity-60" />
              <p className="text-xs max-w-sm mx-auto">
                Aún no tienes amigos registrados con tu código. Comparte tu folio <strong>{stats?.referralCode}</strong> y empieza a ganar comisiones.
              </p>
              <button
                onClick={copyCode}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 transition-colors inline-flex items-center gap-1.5"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copiar mi código</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto pr-1">
              {stats.referredFriends.map(friend => (
                <div key={friend.id} className="py-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold text-zinc-200">
                      {friend.name}
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2">
                      <span>{friend.customerCode}</span>
                      <span>•</span>
                      <span>Registrado: {formatDate(friend.createdAt)}</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-xs font-mono font-bold text-emerald-400">
                      {formatMXN(friend.totalSpentCents)} gastados
                    </div>
                    <div className="text-[10px] text-zinc-500">
                      {friend.ordersCount} compras realizadas
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Rewards History */}
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Historial de Comisiones & Bonos</span>
            </h3>
            <span className="text-xs text-zinc-500 font-mono">Cashback y Puntos</span>
          </div>

          {loading ? (
            <div className="py-12 text-center text-xs text-zinc-500">Cargando recompensas...</div>
          ) : !stats?.rewardsHistory || stats.rewardsHistory.length === 0 ? (
            <div className="py-12 text-center text-zinc-500 space-y-2">
              <Coins className="w-10 h-10 mx-auto text-zinc-600 opacity-60" />
              <p className="text-xs">No hay comisiones registradas todavía.</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 max-h-96 overflow-y-auto pr-1">
              {stats.rewardsHistory.map(reward => (
                <div key={reward.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                        reward.rewardType === 'points'
                          ? 'bg-amber-950 text-amber-400 border border-amber-800'
                          : 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                      }`}>
                        {reward.rewardType === 'points' ? 'Puntos' : 'Cashback'}
                      </span>
                      <span>{reward.notes || 'Comisión de referido'}</span>
                    </div>
                    <div className="text-[11px] text-zinc-500 font-mono flex items-center gap-2">
                      <span>{formatDate(reward.createdAt)}</span>
                      {reward.referredUserName && (
                        <>
                          <span>•</span>
                          <span>Amigo: {reward.referredUserName}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    {reward.rewardType === 'cashback' ? (
                      <div className="text-xs font-mono font-bold text-emerald-400">
                        +{formatMXN(reward.cashbackCents)}
                      </div>
                    ) : (
                      <div className="text-xs font-mono font-bold text-amber-400">
                        +{reward.pointsEarned} pts
                      </div>
                    )}
                    <span className={`text-[10px] font-semibold ${
                      reward.status === 'approved' ? 'text-emerald-500' : reward.status === 'pending' ? 'text-amber-500' : 'text-zinc-500'
                    }`}>
                      {reward.status === 'approved' ? 'Acreditado' : reward.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* How it works explanation */}
      <div className="rounded-2xl bg-zinc-900/60 border border-zinc-800 p-6 space-y-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>¿Cómo funciona el Programa de Referidos PrivaKey?</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs text-zinc-300">
          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 font-bold flex items-center justify-center">1</div>
            <strong className="block text-white font-semibold">Comparte tu Folio o Enlace</strong>
            <p className="text-zinc-400 leading-relaxed">
              Invita a compradores, revendedores o amigos a adquirir cuentas y licencias en PrivaKey compartiéndoles tu código personal.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 font-bold flex items-center justify-center">2</div>
            <strong className="block text-white font-semibold">Reciben Saldo o Compran</strong>
            <p className="text-zinc-400 leading-relaxed">
              Cada vez que tu referido recargue saldo por SPEI o realice una compra en el catálogo, se generará tu comisión del {commissionRate}%.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800/80 space-y-2">
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-400 font-bold flex items-center justify-center">3</div>
            <strong className="block text-white font-semibold">Disfruta de Saldo y Puntos</strong>
            <p className="text-zinc-400 leading-relaxed">
              El administrador acredita tu cashback directo a tu saldo, o canjea tus puntos acumulados por pesos mexicanos para seguir comprando.
            </p>
          </div>
        </div>
      </div>

      {/* Modal: Redeem Points */}
      {redeemModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-amber-400" />
                <span>Canjear Puntos por Saldo</span>
              </h3>
              <button
                onClick={() => setRedeemModalOpen(false)}
                className="text-zinc-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 space-y-1">
              <div>Tasa de cambio oficial: <strong>100 puntos = {formatMXN(100 * pointsRateCents)}</strong></div>
              <div>Tienes <strong>{currentPoints} puntos</strong> disponibles para canje inmediato.</div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-semibold text-zinc-300">
                Puntos a canjear:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max={currentPoints}
                  value={pointsToRedeem}
                  onChange={e => setPointsToRedeem(e.target.value)}
                  className="flex-1 bg-zinc-950 border border-zinc-700 rounded-xl px-3 py-2 text-sm text-white font-mono focus:outline-none focus:border-amber-500"
                />
                <button
                  type="button"
                  onClick={() => setPointsToRedeem(String(currentPoints))}
                  className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
                >
                  Máximo
                </button>
              </div>

              {pointsToRedeem && parseInt(pointsToRedeem) > 0 && (
                <div className="p-3 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between text-xs">
                  <span className="text-zinc-400">Saldo que recibirás:</span>
                  <span className="font-mono text-base font-bold text-emerald-400">
                    +{formatMXN(parseInt(pointsToRedeem) * pointsRateCents)}
                  </span>
                </div>
              )}
            </div>

            {redeemError && (
              <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{redeemError}</span>
              </div>
            )}

            {redeemSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{redeemSuccess}</span>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRedeemModalOpen(false)}
                disabled={redeemLoading}
                className="flex-1 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={handleRedeemPoints}
                disabled={redeemLoading || !pointsToRedeem || parseInt(pointsToRedeem) <= 0}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 text-xs font-bold transition-all shadow disabled:opacity-40"
              >
                {redeemLoading ? 'Canjeando...' : 'Confirmar Canje'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
