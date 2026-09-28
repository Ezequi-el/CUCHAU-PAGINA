import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  ArrowUpRight, 
  ArrowDownLeft, 
  RotateCcw, 
  SlidersHorizontal, 
  ShieldCheck, 
  Wallet,
  Calendar,
  Filter
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN, formatDate } from '../api';
import { BalanceMovement } from '../types';

export const MovementsList: React.FC = () => {
  const { user } = useAuth();
  const [movements, setMovements] = useState<BalanceMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState<string>('all');

  useEffect(() => {
    loadMovements();
  }, [user?.id]);

  const loadMovements = async () => {
    try {
      setLoading(true);
      const data = await api.wallet.getMovements();
      setMovements(data);
    } catch (err) {
      console.error('Error loading movements:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredMovements = movements.filter(m => {
    if (filterType === 'all') return true;
    if (filterType === 'deposit') return m.type === 'deposit';
    if (filterType === 'purchase') return m.type === 'purchase';
    if (filterType === 'refund') return m.type === 'refund';
    if (filterType === 'compensation') return m.type.startsWith('compensation');
    return true;
  });

  const getMovementBadge = (type: string) => {
    switch (type) {
      case 'deposit':
        return {
          label: 'Abono SPEI',
          color: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
          icon: ArrowDownLeft,
        };
      case 'purchase':
        return {
          label: 'Compra de Licencia',
          color: 'bg-zinc-800 text-zinc-300 border-zinc-700',
          icon: ArrowUpRight,
        };
      case 'refund':
        return {
          label: 'Devolución al Saldo',
          color: 'bg-sky-500/10 text-sky-400 border-sky-500/20',
          icon: RotateCcw,
        };
      case 'compensation_credit':
        return {
          label: 'Ajuste a Favor',
          color: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
          icon: SlidersHorizontal,
        };
      case 'compensation_debit':
        return {
          label: 'Ajuste en Contra',
          color: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
          icon: SlidersHorizontal,
        };
      default:
        return {
          label: type,
          color: 'bg-zinc-800 text-zinc-400 border-zinc-700',
          icon: Clock,
        };
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Clock className="w-3.5 h-3.5" /> Libro Mayor Inmutable
          </span>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Historial de Movimientos
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Registro detallado de abonos, compras, devoluciones y ajustes de saldo.
          </p>
        </div>

        {/* Balance Card */}
        {user && (
          <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[10px] text-zinc-400 font-medium">Saldo actual disponible</div>
              <div className="text-lg font-mono font-bold text-emerald-400">{formatMXN(user.balanceCents)}</div>
            </div>
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-2">
        {[
          { id: 'all', label: 'Todos' },
          { id: 'deposit', label: 'Abonos SPEI' },
          { id: 'purchase', label: 'Compras' },
          { id: 'refund', label: 'Devoluciones' },
          { id: 'compensation', label: 'Ajustes' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterType(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              filterType === tab.id
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Movements Table / Cards */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando libro contable...
        </div>
      ) : filteredMovements.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <Clock className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm">No se encontraron movimientos registrados con este filtro.</p>
        </div>
      ) : (
        <div className="rounded-2xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-zinc-950/80 text-zinc-400 border-b border-zinc-800 font-mono uppercase text-[10px]">
                <tr>
                  <th className="py-3.5 px-4 font-semibold">Tipo / Fecha</th>
                  <th className="py-3.5 px-4 font-semibold">Motivo y Referencia</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Importe</th>
                  <th className="py-3.5 px-4 font-semibold text-right">Saldo Resultante</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/80">
                {filteredMovements.map(mov => {
                  const badge = getMovementBadge(mov.type);
                  const Icon = badge.icon;
                  const isPositive = mov.amountCents > 0;

                  return (
                    <tr key={mov.id} className="hover:bg-zinc-850/50 transition-colors">
                      {/* Type & Date */}
                      <td className="py-4 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold border ${badge.color}`}
                          >
                            <Icon className="w-3 h-3" />
                            {badge.label}
                          </span>
                          <div className="text-[11px] text-zinc-400 font-mono">
                            {formatDate(mov.createdAt)}
                          </div>
                        </div>
                      </td>

                      {/* Reason & Reference */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5">
                          <div className="font-semibold text-zinc-200">
                            {mov.reason}
                          </div>
                          <div className="text-[11px] font-mono text-zinc-500">
                            Ref: <strong className="text-zinc-400">{mov.reference}</strong>
                            {mov.orderId && ` • Pedido: ${mov.orderId}`}
                          </div>
                        </div>
                      </td>

                      {/* Amount */}
                      <td className="py-4 px-4 text-right whitespace-nowrap font-mono font-bold text-sm">
                        <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                          {isPositive ? '+' : ''}
                          {formatMXN(mov.amountCents)}
                        </span>
                      </td>

                      {/* Resulting Balance */}
                      <td className="py-4 px-4 text-right whitespace-nowrap font-mono text-zinc-300">
                        {formatMXN(mov.balanceAfterCents)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
