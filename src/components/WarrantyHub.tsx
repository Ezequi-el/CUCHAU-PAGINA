import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  MessageSquare, 
  Send, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  RotateCcw, 
  Sparkles, 
  ChevronRight, 
  AlertCircle,
  KeyRound,
  User as UserIcon,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatDate, formatMXN } from '../api';
import { WarrantyCase } from '../types';

export const WarrantyHub: React.FC = () => {
  const { user, setActiveTab } = useAuth();
  const [cases, setCases] = useState<WarrantyCase[]>([]);
  const [selectedCase, setSelectedCase] = useState<WarrantyCase | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    loadCases();
  }, [user?.id]);

  const loadCases = async () => {
    try {
      setLoading(true);
      const data = await api.warranty.list();
      setCases(data);
      if (data.length > 0 && !selectedCase) {
        setSelectedCase(data[0]);
      } else if (selectedCase) {
        const fresh = data.find(c => c.id === selectedCase.id);
        if (fresh) setSelectedCase(fresh);
      }
    } catch (err) {
      console.error('Error loading warranty cases:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCase || !newMessage.trim() || sending) return;

    try {
      setSending(true);
      const updated = await api.warranty.sendMessage(selectedCase.id, newMessage.trim());
      setNewMessage('');
      setSelectedCase(updated);
      await loadCases();
    } catch (err: any) {
      alert('Error al enviar mensaje: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: WarrantyCase['status']) => {
    switch (status) {
      case 'open':
        return {
          label: 'Abierto / Nuevo',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: Clock,
        };
      case 'in_review':
        return {
          label: 'En Revisión por Soporte',
          color: 'bg-sky-500/10 text-sky-400 border-sky-500/30',
          icon: Clock,
        };
      case 'resolved_replacement':
        return {
          label: 'Resuelto: Reemplazo Entregado',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'resolved_activation':
        return {
          label: 'Resuelto: Nueva Activación',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: CheckCircle2,
        };
      case 'resolved_refund':
        return {
          label: 'Resuelto: Devolución a Saldo',
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30',
          icon: RotateCcw,
        };
      case 'rejected':
        return {
          label: 'Rechazado Justificado',
          color: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: XCircle,
        };
      default:
        return {
          label: status,
          color: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          icon: HelpCircle,
        };
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Centro de Garantías Oficial
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Casos de Garantía y Soporte
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Atención directa, reposición de licencias, reactivaciones o reembolsos al saldo interno.
          </p>
        </div>

        <button
          onClick={() => setActiveTab('compras')}
          className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-md shadow-emerald-950/50 flex items-center gap-2 self-start sm:self-auto"
        >
          <KeyRound className="w-4 h-4" />
          <span>Abrir Garantía desde Mis Compras</span>
        </button>
      </div>

      {/* Main Grid: Cases List & Active Conversation */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando casos de garantía...
        </div>
      ) : cases.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800 space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-zinc-600" />
          <h3 className="text-base font-bold text-zinc-200">No tienes casos de garantía abiertos</h3>
          <p className="text-xs max-w-md mx-auto text-zinc-400">
            Si presentas alguna dificultad con una clave o activación vigente, puedes solicitar garantía directamente desde tu sección de Mis Compras.
          </p>
          <button
            onClick={() => setActiveTab('compras')}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold"
          >
            Ver Mis Compras
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[550px]">
          {/* Left Column: Cases List */}
          <div className="lg:col-span-4 rounded-2xl bg-zinc-900 border border-zinc-800 p-4 space-y-3 overflow-y-auto max-h-[650px]">
            <div className="text-xs font-bold text-zinc-400 uppercase tracking-wider px-2 py-1">
              Tus Casos ({cases.length})
            </div>

            {cases.map(c => {
              const badge = getStatusBadge(c.status);
              const isSelected = selectedCase?.id === c.id;

              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCase(c)}
                  className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-zinc-800/90 border-emerald-500/50 shadow-md'
                      : 'bg-zinc-950/60 border-zinc-800/80 hover:border-zinc-700'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <span className="font-mono text-xs font-bold text-zinc-300">{c.id}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${badge.color}`}>
                      {badge.label}
                    </span>
                  </div>

                  <div className="text-sm font-bold text-white line-clamp-1">{c.subject}</div>
                  <div className="text-xs text-zinc-400 mt-0.5 line-clamp-1">{c.productTitle || `Pedido: ${c.orderId}`}</div>

                  <div className="flex items-center justify-between text-[11px] text-zinc-500 mt-2 font-mono">
                    <span>{formatDate(c.updatedAt)}</span>
                    <span className="flex items-center gap-1 text-zinc-400">
                      <MessageSquare className="w-3 h-3" />
                      {c.messages.length}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Chat and Details */}
          {selectedCase && (
            <div className="lg:col-span-8 rounded-2xl bg-zinc-900 border border-zinc-800 flex flex-col justify-between overflow-hidden shadow-xl">
              {/* Case Header */}
              <div className="p-4 sm:p-5 bg-zinc-950/90 border-b border-zinc-800 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm font-bold text-emerald-400">{selectedCase.id}</span>
                      <span className="text-zinc-600">•</span>
                      <span className="text-xs text-zinc-400 font-mono">Pedido: {selectedCase.orderId}</span>
                    </div>
                    <h2 className="text-lg font-bold text-white mt-0.5">{selectedCase.subject}</h2>
                  </div>

                  {(() => {
                    const badge = getStatusBadge(selectedCase.status);
                    const Icon = badge.icon;
                    return (
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${badge.color}`}>
                        <Icon className="w-3.5 h-3.5" />
                        {badge.label}
                      </span>
                    );
                  })()}
                </div>

                {selectedCase.resolutionNotes && (
                  <div className="p-3 rounded-xl bg-zinc-900 border border-zinc-800 text-xs space-y-1">
                    <span className="font-bold text-zinc-200">Resolución Oficial del Administrador:</span>
                    <p className="text-zinc-300">{selectedCase.resolutionNotes}</p>
                  </div>
                )}
              </div>

              {/* Messages Thread */}
              <div className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1 max-h-[420px] bg-zinc-950/40">
                {selectedCase.messages.map(msg => {
                  const isAdmin = msg.senderRole === 'admin';
                  return (
                    <div
                      key={msg.id}
                      className={`flex flex-col ${isAdmin ? 'items-start' : 'items-end'}`}
                    >
                      <div className="text-[11px] text-zinc-400 font-mono mb-1 flex items-center gap-1.5 px-1">
                        {isAdmin ? (
                          <span className="text-sky-400 font-semibold flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" /> Soporte Oficial
                          </span>
                        ) : (
                          <span className="text-zinc-300 font-semibold">{msg.senderName}</span>
                        )}
                        <span>•</span>
                        <span>{formatDate(msg.timestamp)}</span>
                      </div>

                      <div
                        className={`max-w-[85%] sm:max-w-[75%] p-3.5 rounded-2xl text-xs sm:text-sm leading-relaxed ${
                          isAdmin
                            ? 'bg-zinc-800 text-zinc-100 border border-zinc-700/80 rounded-tl-sm'
                            : 'bg-emerald-600 text-white shadow-md rounded-tr-sm'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.message}</p>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Message Input Box */}
              {selectedCase.status === 'open' || selectedCase.status === 'in_review' ? (
                <form
                  onSubmit={handleSendMessage}
                  className="p-3 sm:p-4 bg-zinc-950 border-t border-zinc-800 flex gap-2"
                >
                  <input
                    type="text"
                    value={newMessage}
                    onChange={e => setNewMessage(e.target.value)}
                    placeholder="Escribe tu respuesta o detalle adicional..."
                    className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs sm:text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="submit"
                    disabled={sending || !newMessage.trim()}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 text-white font-semibold text-xs sm:text-sm shadow flex items-center gap-2"
                  >
                    {sending ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span className="hidden sm:inline">Enviar</span>
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <div className="p-4 bg-zinc-950 border-t border-zinc-800 text-center text-xs text-zinc-500 font-medium">
                  Este caso de garantía ya ha sido resuelto y finalizado.
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
