import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { ClientDashboard } from './components/ClientDashboard';
import { ProductCatalog } from './components/ProductCatalog';
import { RechargeBalance } from './components/RechargeBalance';
import { MyOrders } from './components/MyOrders';
import { MovementsList } from './components/MovementsList';
import { WarrantyHub } from './components/WarrantyHub';
import { AdminPanel } from './components/AdminPanel';
import { ReferralProgramView } from './components/ReferralProgramView';
import { InviteRegisterModal } from './components/InviteRegisterModal';
import { ShieldCheck, Send, KeyRound, ExternalLink, Sparkles } from 'lucide-react';

function AppContent() {
  const { user, settings, activeTab, setActiveTab } = useAuth();
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-zinc-950">
      {/* Top Navbar */}
      <Navbar onOpenInviteModal={() => setInviteModalOpen(true)} />

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
        {user?.status === 'suspended' ? (
          <div className="max-w-md mx-auto my-20 p-8 rounded-2xl bg-zinc-900 border border-rose-800 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Acceso Suspendido</h2>
            <p className="text-xs text-zinc-400">
              Tu cuenta ha sido suspendida preventivamente. Comunícate con el administrador por Telegram para reactivar tu acceso.
            </p>
            <a
              href={settings?.telegramLink || 'https://t.me/PrivaKeySoporte'}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold"
            >
              <Send className="w-4 h-4" />
              <span>Contactar Soporte por Telegram</span>
            </a>
          </div>
        ) : (
          <>
            {activeTab === 'inicio' && <ClientDashboard />}
            {activeTab === 'catalogo' && <ProductCatalog />}
            {activeTab === 'recargar' && <RechargeBalance />}
            {activeTab === 'compras' && <MyOrders />}
            {activeTab === 'movimientos' && <MovementsList />}
            {activeTab === 'garantias' && <WarrantyHub />}
            {activeTab === 'referidos' && <ReferralProgramView />}
            {activeTab === 'admin' && <AdminPanel />}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-850 bg-zinc-950 py-8 px-4 text-xs text-zinc-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-3.5 h-3.5" />
            </div>
            <span className="font-semibold text-zinc-300">
              {settings?.storeName || 'PrivaKey'} • Tienda Digital Privada con Saldo MXN
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-zinc-400">
            <span>Precios en Pesos Mexicanos</span>
            <span>•</span>
            <span>Cifrado AES-256-GCM</span>
            <span>•</span>
            <a
              href={settings?.telegramLink || 'https://t.me/PrivaKeySoporte'}
              target="_blank"
              rel="noreferrer"
              className="hover:text-sky-400 flex items-center gap-1"
            >
              <Send className="w-3 h-3 text-sky-400" />
              <span>Telegram: {settings?.telegramUsername || '@PrivaKeySoporte'}</span>
            </a>
          </div>
        </div>
      </footer>

      {/* Modal for One-Time Invitations / Login */}
      <InviteRegisterModal
        isOpen={inviteModalOpen}
        onClose={() => setInviteModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
