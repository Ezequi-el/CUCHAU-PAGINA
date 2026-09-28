import React, { useState, useEffect } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  Mail, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag,
  Layers,
  UserCheck,
  Info,
  RefreshCw,
  MessageSquare,
  Gift
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN, formatDate } from '../api';
import { Order } from '../types';

interface MyOrdersProps {
  onOpenWarrantyModal?: (orderId: string, productTitle: string) => void;
}

export const MyOrders: React.FC<MyOrdersProps> = ({ onOpenWarrantyModal }) => {
  const { user, setActiveTab } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending' | 'cancelled'>('all');

  // Decrypted credentials cache: orderId -> { content, isUpdated, updateNotes, slotNumber }
  const [revealedData, setRevealedData] = useState<Record<string, {
    content: string;
    isUpdated?: boolean;
    updateNotes?: string | null;
    slotNumber?: number | null;
  }>>({});
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);

  // Warranty case modal state
  const [activeWarrantyOrder, setActiveWarrantyOrder] = useState<Order | null>(null);
  const [warrantySubject, setWarrantySubject] = useState('');
  const [warrantyDescription, setWarrantyDescription] = useState('');
  const [isSubmittingWarranty, setIsSubmittingWarranty] = useState(false);
  const [warrantySuccess, setWarrantySuccess] = useState<string | null>(null);
  const [warrantyError, setWarrantyError] = useState<string | null>(null);

  useEffect(() => {
    loadOrders();
  }, [user?.id]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const data = await api.orders.list();
      setOrders(data);
    } catch (err) {
      console.error('Error loading orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReveal = async (orderId: string) => {
    if (revealedData[orderId]) {
      // Toggle off
      const next = { ...revealedData };
      delete next[orderId];
      setRevealedData(next);
      return;
    }

    try {
      setLoadingKey(orderId);
      const res = await api.orders.getCredentials(orderId);
      setRevealedData(prev => ({
        ...prev,
        [orderId]: {
          content: res.content || 'Sin credenciales entregadas',
          isUpdated: (res as any).isCredentialsUpdated,
          updateNotes: (res as any).credentialsUpdateNotes,
          slotNumber: (res as any).slotNumber,
        }
      }));
    } catch (err) {
      alert('Error al descifrar credenciales: ' + err);
    } finally {
      setLoadingKey(null);
    }
  };

  const handleCopyCredential = (orderId: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKeyId(orderId);
    setTimeout(() => setCopiedKeyId(null), 2000);
  };

  const handleOpenWarranty = (order: Order) => {
    setActiveWarrantyOrder(order);
    setWarrantySubject(`Falla en ${order.productSnapshot.title}`);
    setWarrantyDescription('');
    setWarrantySuccess(null);
    setWarrantyError(null);
  };

  const handleSubmitWarranty = async () => {
    if (!activeWarrantyOrder) return;
    if (!warrantySubject.trim() || !warrantyDescription.trim()) {
      setWarrantyError('Por favor completa el asunto y describe la falla con detalle.');
      return;
    }

    try {
      setIsSubmittingWarranty(true);
      setWarrantyError(null);
      await api.warranty.create({
        orderId: activeWarrantyOrder.id,
        subject: warrantySubject.trim(),
        description: warrantyDescription.trim(),
      });
      setWarrantySuccess('Caso de garantía creado correctamente.');
      await loadOrders();
    } catch (err: any) {
      setWarrantyError(err.message || 'Error al abrir garantía.');
    } finally {
      setIsSubmittingWarranty(false);
    }
  };

  const filteredOrders = orders.filter(o => {
    if (filter === 'completed') return o.status === 'completed';
    if (filter === 'pending') return o.status === 'pending_activation';
    if (filter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <KeyRound className="w-3.5 h-3.5" /> Bóveda de Licencias
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Mis Compras y Entregas
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Consulta tus credenciales cifradas, estado de activación, cupos compartidos y vigencia de garantía.
          </p>
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 self-start sm:self-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'all' ? 'bg-zinc-800 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Todos ({orders.length})
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'completed' ? 'bg-emerald-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Entregados
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'pending' ? 'bg-amber-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Pendientes
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
              filter === 'cancelled' ? 'bg-rose-600 text-white shadow-sm' : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {/* Orders List */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando pedidos...
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
          <KeyRound className="w-10 h-10 mx-auto text-zinc-600" />
          <p className="text-sm">No tienes compras registradas en esta categoría.</p>
          <button
            onClick={() => setActiveTab('catalogo')}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow"
          >
            Ir al Catálogo Privado
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredOrders.map(order => {
            const isCompleted = order.status === 'completed';
            const isPending = order.status === 'pending_activation';
            const isCancelled = order.status === 'cancelled';
            const revealedInfo = revealedData[order.id];
            const hasRevealed = Boolean(revealedInfo);
            const isWarrantyActive = order.warrantyStatus === 'active';
            const isWarrantyExpired = order.warrantyStatus === 'expired';
            const isWarrantyClaimed = order.warrantyStatus === 'claimed';
            const isRefunded = order.warrantyStatus === 'refunded';
            const isProfile = order.presentation === 'profile';

            return (
              <div
                key={order.id}
                className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-lg transition-all"
              >
                {/* Order Top Bar */}
                <div className="bg-zinc-950/80 px-6 py-4 border-b border-zinc-800 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-mono font-bold text-sm text-zinc-200">
                      {order.id}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-xs text-zinc-400 font-mono">
                      {formatDate(order.createdAt)}
                    </span>
                    <span className="text-zinc-600">•</span>
                    <span className="text-xs text-zinc-400 font-mono font-semibold">
                      {formatMXN(order.priceCents)}
                    </span>
                  </div>

                  {/* Status & Presentation Badges */}
                  <div className="flex items-center gap-2">
                    {/* Presentation Badge */}
                    {isProfile ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-800/80">
                        <Layers className="w-3 h-3" /> Perfil {order.slotNumber ? `(Cupo #${order.slotNumber})` : ''}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800/80">
                        <UserCheck className="w-3 h-3" /> Cuenta completa
                      </span>
                    )}

                    {/* Referral Badge if applied */}
                    {order.referralCodeApplied && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80" title={`Código de referido aplicado: ${order.referralCodeApplied}`}>
                        <Gift className="w-3 h-3 text-amber-400" /> Ref: {order.referralCodeApplied}
                      </span>
                    )}

                    {/* Status Badge */}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Entregado
                      </span>
                    )}
                    {isPending && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                        <Clock className="w-3.5 h-3.5" /> Pendiente de activación
                      </span>
                    )}
                    {isCancelled && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/30">
                        <XCircle className="w-3.5 h-3.5" /> Cancelado y Reembolsado
                      </span>
                    )}
                  </div>
                </div>

                {/* Order Body */}
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left: Product Info Snapshot */}
                    <div className="lg:col-span-2 space-y-4">
                      <div className="flex gap-4 items-start">
                        {order.productSnapshot.imageUrl ? (
                          <img
                            src={order.productSnapshot.imageUrl}
                            alt={order.productSnapshot.title}
                            className="w-16 h-16 rounded-xl object-cover border border-zinc-800 shrink-0"
                          />
                        ) : (
                          <div className="w-16 h-16 rounded-xl bg-zinc-950 border border-zinc-800 flex items-center justify-center shrink-0 text-zinc-600">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}

                        <div>
                          <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                            {order.productSnapshot.category}
                          </div>
                          <h2 className="text-lg font-bold text-white mt-0.5">
                            {order.productSnapshot.title}
                          </h2>
                          <p className="text-xs text-zinc-400 mt-1 leading-relaxed">
                            {order.productSnapshot.description}
                          </p>
                        </div>
                      </div>

                      {/* Presentation note if profile */}
                      {isProfile && (
                        <div className="p-3 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-300 text-xs flex items-start gap-2">
                          <Info className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                          <div>
                            <span className="font-semibold">Modalidad perfil compartido:</span> Se entregan credenciales compartidas y no un perfil identificado. {order.slotNumber ? `Tu asignación corresponde al cupo #${order.slotNumber}.` : ''}
                          </div>
                        </div>
                      )}

                      {/* Delivery Mode specifics */}
                      {order.deliveryMode === 'email_activation' && (
                        <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-1.5">
                          <div className="font-semibold text-sky-400 flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5" />
                            <span>Activación manual por correo:</span>
                          </div>
                          <div className="font-mono text-zinc-200">
                            Correo destino confirmado: <strong>{order.targetEmail}</strong>
                          </div>
                          {order.activationNotes && (
                            <div className="text-zinc-400 pt-1 text-[11px] border-t border-zinc-800">
                              Nota del administrador: {order.activationNotes}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Credentials Box (Automatic or Delivered) */}
                      {isCompleted && (
                        <div className="p-4 rounded-xl bg-zinc-950 border border-emerald-950/60 space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="text-xs font-bold text-zinc-300 flex items-center gap-2">
                              <KeyRound className="w-4 h-4 text-emerald-400" />
                              <span>Credenciales de Acceso Privadas</span>
                            </div>

                            <button
                              onClick={() => handleReveal(order.id)}
                              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-850"
                            >
                              {loadingKey === order.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                              ) : hasRevealed ? (
                                <>
                                  <EyeOff className="w-3.5 h-3.5" />
                                  <span>Ocultar</span>
                                </>
                              ) : (
                                <>
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Descifrar y Mostrar</span>
                                </>
                              )}
                            </button>
                          </div>

                          {/* Credentials updated banner if admin updated credentials */}
                          {hasRevealed && revealedInfo.isUpdated && (
                            <div className="p-2.5 rounded-lg bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-center gap-2">
                              <RefreshCw className="w-4 h-4 text-amber-400 shrink-0" />
                              <span>
                                <strong>Credenciales actualizadas por administración:</strong> {revealedInfo.updateNotes || 'Se han refrescado los accesos para este servicio.'}
                              </span>
                            </div>
                          )}

                          {hasRevealed ? (
                            <div className="relative">
                              <pre className="p-3 rounded-lg bg-zinc-900/90 text-xs font-mono text-emerald-300 whitespace-pre-wrap break-all border border-zinc-800 select-all leading-relaxed">
                                {revealedInfo.content}
                              </pre>
                              <button
                                onClick={() => handleCopyCredential(order.id, revealedInfo.content)}
                                className="absolute top-2 right-2 p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white"
                                title="Copiar al portapapeles"
                              >
                                {copiedKeyId === order.id ? (
                                  <Check className="w-4 h-4 text-emerald-400" />
                                ) : (
                                  <Copy className="w-4 h-4" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="p-3 rounded-lg bg-zinc-900/60 text-xs font-mono text-zinc-500 border border-zinc-800 flex items-center justify-between">
                              <span>••••-••••-••••-•••• (Cifrado con AES-256-GCM)</span>
                              <span className="text-[11px] text-zinc-400">Clic en Descifrar</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Right: Warranty & Actions */}
                    <div className="space-y-4 rounded-xl bg-zinc-950 p-4 border border-zinc-800 flex flex-col justify-between">
                      <div className="space-y-3">
                        <div className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
                          <ShieldCheck className="w-4 h-4 text-amber-400" />
                          <span>Garantía Oficial</span>
                        </div>

                        <div className="text-xs space-y-1.5">
                          <div className="text-zinc-400">
                            Cobertura contratada: <strong className="text-zinc-200">{order.productSnapshot.warrantyDays} días</strong>
                          </div>

                          {order.warrantyExpiresAt ? (
                            <div className="text-zinc-400">
                              Vence el: <strong className="text-zinc-200 font-mono">{formatDate(order.warrantyExpiresAt)}</strong>
                            </div>
                          ) : (
                            <div className="text-zinc-500 italic text-[11px]">
                              La garantía comenzará al completar la activación.
                            </div>
                          )}

                          {/* Warranty status pill */}
                          <div className="pt-2">
                            {isWarrantyActive && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Garantía Vigente
                              </span>
                            )}
                            {isWarrantyExpired && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                                Garantía Expirada
                              </span>
                            )}
                            {isWarrantyClaimed && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                Caso de Garantía en Trámite
                              </span>
                            )}
                            {isRefunded && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
                                Reembolsado a Saldo
                              </span>
                            )}
                          </div>

                          <div className="text-[11px] text-zinc-400 pt-2 border-t border-zinc-850 leading-relaxed">
                            {order.productSnapshot.warrantyConditions}
                          </div>
                        </div>
                      </div>

                      {/* Warranty Action Button */}
                      <div className="pt-3 border-t border-zinc-800">
                        {isCompleted && (
                          <>
                            {isWarrantyActive ? (
                              <button
                                onClick={() => handleOpenWarranty(order)}
                                className="w-full px-3 py-2 rounded-lg bg-zinc-850 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
                              >
                                <ShieldCheck className="w-4 h-4" />
                                <span>Solicitar Garantía</span>
                              </button>
                            ) : isWarrantyClaimed ? (
                              <button
                                onClick={() => setActiveTab('garantias')}
                                className="w-full px-3 py-2 rounded-lg bg-amber-950/40 text-amber-300 border border-amber-500/30 text-xs font-semibold flex items-center justify-center gap-1.5"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>Ver Caso en Garantías</span>
                              </button>
                            ) : null}
                          </>
                        )}

                        {isPending && (
                          <div className="text-[11px] text-amber-400 bg-amber-950/20 p-2 rounded-lg border border-amber-900/40 text-center">
                            El administrador está procesando tu activación.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* WARRANTY MODAL */}
      {activeWarrantyOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 shadow-2xl space-y-5">
            <div>
              <div className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Reclamo de Garantía
              </div>
              <h2 className="text-xl font-bold text-white mt-1">
                {activeWarrantyOrder.productSnapshot.title}
              </h2>
              <p className="text-xs text-zinc-400 font-mono mt-0.5">
                Pedido: {activeWarrantyOrder.id}
              </p>
            </div>

            {warrantySuccess ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">¡Reclamo Enviado!</h3>
                <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                  El caso ha sido abierto. El administrador revisará tu problema para resolver mediante reposición de clave o reactivación.
                </p>
                <div className="pt-2 flex gap-3 justify-center">
                  <button
                    onClick={() => {
                      setActiveWarrantyOrder(null);
                      setActiveTab('garantias');
                    }}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow"
                  >
                    Ir al Hub de Garantías
                  </button>
                  <button
                    onClick={() => setActiveWarrantyOrder(null)}
                    className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
                  >
                    Cerrar
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Asunto del problema:
                  </label>
                  <input
                    type="text"
                    value={warrantySubject}
                    onChange={e => setWarrantySubject(e.target.value)}
                    placeholder="ej. La clave indica que ya fue utilizada"
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">
                    Describe lo sucedido con detalle:
                  </label>
                  <textarea
                    rows={4}
                    value={warrantyDescription}
                    onChange={e => setWarrantyDescription(e.target.value)}
                    placeholder="Explica qué error aparece, qué pasos realizaste y cualquier código de error del software..."
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-xs text-zinc-100 focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div className="p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-[11px] text-zinc-400 space-y-1">
                  <div><strong>Condiciones de tu garantía:</strong></div>
                  <div>{activeWarrantyOrder.productSnapshot.warrantyConditions}</div>
                </div>

                {warrantyError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{warrantyError}</span>
                  </div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    disabled={isSubmittingWarranty}
                    onClick={handleSubmitWarranty}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs shadow flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isSubmittingWarranty ? 'Enviando reclamo...' : 'Enviar Reclamo a Soporte'}</span>
                  </button>

                  <button
                    onClick={() => setActiveWarrantyOrder(null)}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
