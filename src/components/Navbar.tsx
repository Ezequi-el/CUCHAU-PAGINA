import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Wallet, 
  ShoppingBag, 
  Clock, 
  HelpCircle, 
  LayoutDashboard, 
  LogOut, 
  Menu, 
  X, 
  Sparkles, 
  KeyRound, 
  UserCheck, 
  CreditCard,
  Layers,
  ArrowRightLeft,
  Gift,
  Coins
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { formatMXN } from '../api';

interface NavbarProps {
  onOpenInviteModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ onOpenInviteModal }) => {
  const { user, settings, activeTab, setActiveTab, demoSwitch, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const clientNavItems = [
    { id: 'inicio', label: 'Inicio', icon: LayoutDashboard },
    { id: 'catalogo', label: 'Catálogo', icon: ShoppingBag },
    { id: 'recargar', label: 'Recargar Saldo', icon: CreditCard },
    { id: 'compras', label: 'Mis Compras', icon: KeyRound },
    { id: 'movimientos', label: 'Movimientos', icon: Clock },
    { id: 'garantias', label: 'Garantías', icon: ShieldCheck },
    { id: 'referidos', label: 'Referidos & Puntos', icon: Gift },
  ];

  return (
    <header className="sticky top-0 z-40 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800 text-zinc-100">
      {/* Top Testing Demo Banner */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-zinc-900 to-indigo-950/80 border-b border-zinc-800/80 px-4 py-1.5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Sparkles className="w-3 h-3 mr-1 inline" /> DEMO INTERACTIVA
            </span>
            <span className="text-zinc-400 hidden sm:inline">
              Alterna entre cliente y administrador para probar el flujo completo:
            </span>
          </div>
          
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => demoSwitch('client')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                user?.role === 'client'
                  ? 'bg-emerald-600 text-white shadow-sm ring-1 ring-emerald-400'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <UserCheck className="w-3.5 h-3.5" />
              <span>Cliente (Carlos)</span>
            </button>

            <button
              onClick={() => demoSwitch('admin')}
              className={`px-2.5 py-1 rounded text-xs font-medium transition-all flex items-center gap-1.5 ${
                user?.role === 'admin'
                  ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-400'
                  : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Administrador</span>
            </button>

            <button
              onClick={onOpenInviteModal}
              className="px-2.5 py-1 rounded text-xs font-medium bg-zinc-800/80 text-amber-300 hover:bg-amber-950/40 hover:text-amber-200 border border-amber-500/30 transition-all flex items-center gap-1"
              title="Registrar nuevo usuario con código de invitación"
            >
              <KeyRound className="w-3 h-3" />
              <span className="hidden md:inline">Canjear</span> Invitación
            </button>
          </div>
        </div>
      </div>

      {/* Main Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setActiveTab(user?.role === 'admin' ? 'admin' : 'inicio')}
              className="flex items-center gap-2.5 text-left group"
            >
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-700 flex items-center justify-center text-zinc-950 font-black shadow-lg shadow-emerald-950/50 group-hover:scale-105 transition-transform">
                <ShieldCheck className="w-5 h-5 text-zinc-950" />
              </div>
              <div>
                <div className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                  {settings?.storeName || 'PrivaKey Digital'}
                  <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700">
                    MXN
                  </span>
                </div>
                <div className="text-[11px] text-zinc-400 font-medium">Bóveda privada de licencias</div>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden lg:flex items-center space-x-1">
              {user.role === 'admin' ? (
                <>
                  <button
                    onClick={() => setActiveTab('admin')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'admin'
                        ? 'bg-indigo-600 text-white'
                        : 'text-zinc-300 hover:bg-zinc-800 hover:text-white'
                    }`}
                  >
                    <Layers className="w-4 h-4" />
                    Panel Administrador
                  </button>

                  <button
                    onClick={() => setActiveTab('catalogo')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                      activeTab === 'catalogo'
                        ? 'bg-zinc-800 text-emerald-400'
                        : 'text-zinc-400 hover:bg-zinc-800/60 hover:text-zinc-200'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    Vista Tienda
                  </button>
                </>
              ) : (
                clientNavItems.map(item => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => setActiveTab(item.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                          : 'text-zinc-300 hover:bg-zinc-800/80 hover:text-white'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {item.label}
                    </button>
                  );
                })
              )}
            </nav>
          )}

          {/* Right Section: Balance & User Code */}
          <div className="hidden sm:flex items-center gap-3">
            {user ? (
              <>
                {/* Balance Chip */}
                <div 
                  onClick={() => user.role === 'client' && setActiveTab('recargar')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all ${
                    user.role === 'client' 
                      ? 'bg-zinc-900 hover:bg-zinc-850 border-emerald-500/30 cursor-pointer group' 
                      : 'bg-zinc-900 border-zinc-800'
                  }`}
                  title={user.role === 'client' ? 'Clic para recargar saldo' : 'Saldo'}
                >
                  <div className="w-6 h-6 rounded-md bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                    <Wallet className="w-3.5 h-3.5" />
                  </div>
                  <div className="text-left">
                    <div className="text-[10px] text-zinc-400 leading-tight">Saldo disponible</div>
                    <div className="text-sm font-bold font-mono text-emerald-400 leading-tight group-hover:text-emerald-300">
                      {formatMXN(user.balanceCents)}
                    </div>
                  </div>
                  {user.role === 'client' && (
                    <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded border border-emerald-800 ml-1">
                      + Recargar
                    </span>
                  )}
                </div>

                {/* Points Chip for Client */}
                {user.role === 'client' && (
                  <button
                    onClick={() => setActiveTab('referidos')}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg border bg-zinc-900 hover:bg-zinc-850 border-amber-500/30 transition-all text-left group"
                    title="Puntos de recomendación acumulados. Clic para canjear por saldo."
                  >
                    <div className="w-6 h-6 rounded-md bg-amber-500/10 flex items-center justify-center text-amber-400">
                      <Coins className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-[10px] text-zinc-400 leading-tight">Puntos</div>
                      <div className="text-xs font-bold font-mono text-amber-400 leading-tight group-hover:text-amber-300">
                        {(user.referralPoints || 0).toLocaleString()} pts
                      </div>
                    </div>
                  </button>
                )}

                {/* User Info */}
                <div className="flex items-center gap-2 pl-2 border-l border-zinc-800">
                  <div className="text-right">
                    <div className="text-xs font-semibold text-zinc-200">{user.name}</div>
                    <div className="text-[10px] font-mono text-zinc-400 flex items-center gap-1 justify-end">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block"></span>
                      {user.customerCode}
                    </div>
                  </div>

                  <button
                    onClick={logout}
                    className="p-1.5 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/80 transition-colors"
                    title="Cerrar sesión"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </>
            ) : (
              <button
                onClick={onOpenInviteModal}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow"
              >
                Canjear Invitación
              </button>
            )}
          </div>

          {/* Mobile hamburger */}
          <div className="flex lg:hidden items-center gap-2">
            {user && (
              <div 
                onClick={() => user.role === 'client' && setActiveTab('recargar')}
                className="flex items-center gap-1.5 px-2 py-1 rounded bg-zinc-900 border border-emerald-500/30 text-xs font-mono font-bold text-emerald-400"
              >
                <Wallet className="w-3.5 h-3.5" />
                {formatMXN(user.balanceCents)}
              </div>
            )}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 focus:outline-none"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && user && (
        <div className="lg:hidden border-t border-zinc-800 bg-zinc-950 px-4 pt-3 pb-6 space-y-3">
          <div className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-between">
            <div>
              <div className="text-sm font-bold text-white">{user.name}</div>
              <div className="text-xs text-zinc-400 font-mono">Folio: {user.customerCode} ({user.role})</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] text-zinc-400">Saldo actual</div>
              <div className="text-sm font-bold font-mono text-emerald-400">{formatMXN(user.balanceCents)}</div>
            </div>
          </div>

          <div className="space-y-1">
            {user.role === 'admin' ? (
              <>
                <button
                  onClick={() => { setActiveTab('admin'); setMobileMenuOpen(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                    activeTab === 'admin' ? 'bg-indigo-600 text-white' : 'text-zinc-300 hover:bg-zinc-800'
                  }`}
                >
                  <Layers className="w-4 h-4" /> Panel Administrador
                </button>
                <button
                  onClick={() => { setActiveTab('catalogo'); setMobileMenuOpen(false); }}
                  className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-zinc-300 hover:bg-zinc-800 flex items-center gap-2"
                >
                  <ShoppingBag className="w-4 h-4" /> Ver Catálogo como Cliente
                </button>
              </>
            ) : (
              clientNavItems.map(item => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setActiveTab(item.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
                      isActive
                        ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30'
                        : 'text-zinc-300 hover:bg-zinc-800'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    {item.label}
                  </button>
                );
              })
            )}

            <button
              onClick={() => { onOpenInviteModal(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-amber-300 hover:bg-amber-950/30 flex items-center gap-2"
            >
              <KeyRound className="w-4 h-4" /> Canjear Invitación
            </button>

            <button
              onClick={() => { logout(); setMobileMenuOpen(false); }}
              className="w-full text-left px-3 py-2 rounded-lg text-sm font-medium text-rose-400 hover:bg-rose-950/30 flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Cerrar Sesión
            </button>
          </div>
        </div>
      )}
    </header>
  );
};
