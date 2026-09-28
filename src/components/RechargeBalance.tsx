import React, { useState, useEffect } from 'react';
import { 
  CreditCard, 
  Send, 
  Copy, 
  Check, 
  ExternalLink, 
  AlertCircle, 
  ShieldCheck, 
  Clock, 
  CheckCircle2,
  Building,
  Hash,
  User as UserIcon,
  HelpCircle,
  Gift,
  Coins,
  Share2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN, formatDate } from '../api';
import { BalanceMovement } from '../types';

export const RechargeBalance: React.FC = () => {
  const { user, settings, refreshUser, setActiveTab } = useAuth();
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [deposits, setDeposits] = useState<BalanceMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Link referrer state
  const [referrerCodeInput, setReferrerCodeInput] = useState('');
  const [isLinking, setIsLinking] = useState(false);
  const [linkMsg, setLinkMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    loadDeposits();
  }, [user?.id]);

  const loadDeposits = async () => {
    try {
      setLoading(true);
      const data = await api.wallet.getMovements();
      const depOnly = data.filter(m => m.type === 'deposit' || m.type === 'compensation_credit' || m.type === 'referral_cashback' || m.type === 'points_redemption');
      setDeposits(depOnly);
    } catch (err) {
      console.error('Error loading deposits:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleLinkReferrer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!referrerCodeInput.trim()) return;

    try {
      setIsLinking(true);
      setLinkMsg(null);
      await api.referrals.bindCode(referrerCodeInput.trim());
      await refreshUser();
      setLinkMsg({ type: 'success', text: '¡Código de referente vinculado con éxito!' });
      setReferrerCodeInput('');
    } catch (err: any) {
      setLinkMsg({ type: 'error', text: err.message || 'Error al vincular código.' });
    } finally {
      setIsLinking(false);
    }
  };

  const referralCodeToShow = user?.referralCode || user?.customerCode;

  const telegramPrefillMessage = encodeURIComponent(
    `Hola, envío comprobante de transferencia SPEI para recarga de saldo.\n\nIdentificador de Cliente: ${user?.customerCode}\nNombre: ${user?.name}\nCorreo: ${user?.email}\nCódigo de Referido propio: ${referralCodeToShow}${user?.referredByCode ? `\nReferido por: ${user.referredByCode}` : ''}`
  );

  const telegramUrl = settings?.telegramLink 
    ? `${settings.telegramLink}?text=${telegramPrefillMessage}`
    : `https://t.me/${(settings?.telegramUsername || '@PrivaKeySoporte').replace('@', '')}?text=${telegramPrefillMessage}`;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
          <CreditCard className="w-3.5 h-3.5" /> Transferencia SPEI & Saldo
        </span>
        <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
          Recargar Saldo en Pesos Mexicanos
        </h1>
        <p className="text-sm text-zinc-400 mt-1">
          Transfiere desde cualquier banco mexicano (BBVA, Santander, Banorte, Nu, Mercado Pago, etc.) y reporta por Telegram.
        </p>
      </div>

      {/* Main Grid: Bank Details & Telegram Action */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Bank details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-7 space-y-6">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-emerald-400" />
                <span>Datos Oficiales para Transferencia</span>
              </h2>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-emerald-400 border border-zinc-700">
                SPEI 24/7
              </span>
            </div>

            {/* Bank detail items */}
            <div className="space-y-4">
              {/* CLABE */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Hash className="w-3 h-3 text-emerald-400" /> CLABE Interbancaria (18 dígitos)
                  </div>
                  <div className="text-base sm:text-lg font-mono font-bold text-emerald-400 tracking-wider">
                    {settings?.clabe || '012180015678901234'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.clabe || '012180015678901234', 'clabe')}
                  className="px-3 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  {copiedKey === 'clabe' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiada</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>

              {/* Banco */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <Building className="w-3 h-3 text-zinc-400" /> Banco Destino
                  </div>
                  <div className="text-sm sm:text-base font-semibold text-zinc-100">
                    {settings?.bankName || 'BBVA México'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.bankName || 'BBVA México', 'bank')}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                >
                  {copiedKey === 'bank' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Titular */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-medium text-zinc-400 uppercase tracking-wider flex items-center gap-1">
                    <UserIcon className="w-3 h-3 text-zinc-400" /> Titular de la Cuenta
                  </div>
                  <div className="text-xs sm:text-sm font-semibold text-zinc-200 uppercase">
                    {settings?.accountHolder || 'PRIVAKEY DISTRIBUCIONES DIGITALES S.A. DE C.V.'}
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(settings?.accountHolder || 'PRIVAKEY DISTRIBUCIONES DIGITALES S.A. DE C.V.', 'holder')}
                  className="p-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors shrink-0"
                >
                  {copiedKey === 'holder' ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>

              {/* Concepto Obligatorio */}
              <div className="p-4 rounded-xl bg-emerald-950/20 border border-emerald-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Concepto Obligatorio SPEI
                  </div>
                  <div className="text-lg font-mono font-extrabold text-white">
                    {user?.customerCode}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Escribe este folio como concepto en tu banca móvil para identificar tu pago.
                  </div>
                </div>
                <button
                  onClick={() => handleCopy(user?.customerCode || '', 'concept')}
                  className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors shrink-0 shadow"
                >
                  {copiedKey === 'concept' ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copiado</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copiar Folio</span>
                    </>
                  )}
                </button>
              </div>

              {/* Tu Código de Referido */}
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Gift className="w-3.5 h-3.5 text-amber-400" /> Tu Código de Referido
                  </div>
                  <div className="text-lg font-mono font-extrabold text-white">
                    {referralCodeToShow}
                  </div>
                  <div className="text-[11px] text-zinc-400">
                    Comparte tu código con amigos. Ganarás 5% de comisión en saldo cashback o puntos cuando recarguen o compren.
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 shrink-0">
                  <button
                    onClick={() => handleCopy(referralCodeToShow || '', 'refcode')}
                    className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-zinc-950 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors shadow"
                  >
                    {copiedKey === 'refcode' ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-zinc-950" />
                        <span>Copiado</span>
                      </>
                    ) : (
                      <>
                        <Share2 className="w-3.5 h-3.5" />
                        <span>Copiar Código</span>
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('referidos')}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium text-center"
                  >
                    Ver mis puntos →
                  </button>
                </div>
              </div>

              {/* Vinculación de Referente si no tiene */}
              <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-300 flex items-center gap-1.5">
                    <Gift className="w-3.5 h-3.5 text-emerald-400" />
                    <span>¿Fuiste recomendado por un amigo?</span>
                  </div>
                  {user?.referredByCode ? (
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800">
                      Vinculado: {user.referredByCode}
                    </span>
                  ) : null}
                </div>

                {user?.referredByCode ? (
                  <p className="text-[11px] text-zinc-400">
                    Tus recargas y compras generan comisiones y puntos automáticamente para tu recomendador <strong>{user.referredByCode}</strong>.
                  </p>
                ) : (
                  <div>
                    <p className="text-[11px] text-zinc-400 mb-2">
                      Si tienes el código de referido de quien te invitó a PrivaKey, vincúlalo aquí para que reciba beneficios por tus recargas:
                    </p>
                    <form onSubmit={handleLinkReferrer} className="flex gap-2">
                      <input
                        type="text"
                        value={referrerCodeInput}
                        onChange={e => setReferrerCodeInput(e.target.value.toUpperCase())}
                        placeholder="Código de referido (ej. CLI-84920)"
                        className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-500"
                      />
                      <button
                        type="submit"
                        disabled={isLinking || !referrerCodeInput.trim()}
                        className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold disabled:opacity-40 transition-colors"
                      >
                        {isLinking ? 'Guardando...' : 'Vincular'}
                      </button>
                    </form>
                    {linkMsg && (
                      <p className={`text-[11px] mt-1.5 ${linkMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {linkMsg.text}
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Instructions box */}
            <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 text-xs text-zinc-400 space-y-2">
              <div className="font-semibold text-zinc-300 flex items-center gap-1.5">
                <HelpCircle className="w-4 h-4 text-amber-400" />
                Instrucciones importantes:
              </div>
              <p>
                {settings?.depositInstructions ||
                  'Realiza tu transferencia SPEI agregando tu Identificador de Cliente en el Concepto de Pago. Una vez realizada, envía el comprobante a nuestro Telegram oficial indicando tu correo y folio de cliente.'}
              </p>
              <p className="text-[11px] text-zinc-500">
                Horario de atención para acreditación: {settings?.supportHours || '09:00 - 23:00 hrs (CDMX)'}.
              </p>
            </div>
          </div>
        </div>

        {/* Right Column: Telegram Action Card */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-gradient-to-br from-zinc-900 to-sky-950/40 border border-sky-900/40 p-6 flex flex-col justify-between h-full space-y-6">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/30 flex items-center justify-center mb-4">
                <Send className="w-6 h-6" />
              </div>

              <h2 className="text-lg font-bold text-white">
                Reportar por Telegram
              </h2>
              <p className="text-xs text-zinc-300 mt-2 leading-relaxed">
                Una vez hecha la transferencia, envía la captura o PDF de tu comprobante a nuestro canal de soporte.
              </p>

              <div className="mt-4 p-3 rounded-xl bg-zinc-950/80 border border-zinc-800 text-xs space-y-1.5 font-mono">
                <div className="text-zinc-500 text-[10px] uppercase font-sans">Datos que debes enviar:</div>
                <div className="text-zinc-300">• Tu folio cliente: <strong className="text-emerald-400">{user?.customerCode}</strong></div>
                <div className="text-zinc-300">• Monto transferido</div>
                <div className="text-zinc-300">• Comprobante digital</div>
                {user?.referredByCode && (
                  <div className="text-amber-400">• Código de tu referente: <strong>{user.referredByCode}</strong></div>
                )}
              </div>
            </div>

            <div>
              <a
                href={telegramUrl}
                target="_blank"
                rel="noreferrer"
                className="w-full px-5 py-3 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold text-sm shadow-lg shadow-sky-950/60 flex items-center justify-center gap-2 transition-all hover:translate-y-[-1px]"
              >
                <Send className="w-4 h-4" />
                <span>Abrir Telegram Oficial</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>

              <div className="text-center mt-3 text-[11px] text-zinc-400">
                Contacto directo: <strong className="text-zinc-200">{settings?.telegramUsername || '@PrivaKeySoporte'}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recharge History Table */}
      <div className="rounded-2xl bg-zinc-900 border border-zinc-800 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            <span>Tus Recargas Acreditadas</span>
          </h3>
          <span className="text-xs text-zinc-400">
            Acreditaciones manuales registradas
          </span>
        </div>

        {loading ? (
          <div className="py-8 text-center text-xs text-zinc-500">Cargando recargas...</div>
        ) : deposits.length === 0 ? (
          <div className="py-10 text-center text-zinc-500 space-y-2">
            <CreditCard className="w-8 h-8 mx-auto text-zinc-600" />
            <p className="text-xs">No tienes recargas previas registradas.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800">
            {deposits.map(dep => (
              <div key={dep.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="text-xs font-semibold text-zinc-200 flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>{dep.reason}</span>
                  </div>
                  <div className="text-[11px] text-zinc-400 font-mono flex items-center gap-2">
                    <span>Folio SPEI: {dep.reference}</span>
                    <span>•</span>
                    <span>{formatDate(dep.createdAt)}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-mono font-bold text-emerald-400">
                    +{formatMXN(dep.amountCents)}
                  </div>
                  <div className="text-[10px] text-zinc-500 font-mono">
                    Saldo tras abono: {formatMXN(dep.balanceAfterCents)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
