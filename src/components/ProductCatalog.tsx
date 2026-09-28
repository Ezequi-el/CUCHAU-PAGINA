import React, { useState, useEffect } from 'react';
import { 
  ShoppingBag, 
  Zap, 
  Mail, 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  Search, 
  ArrowRight,
  Sparkles,
  Info,
  X,
  Layers,
  UserCheck,
  Gift,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api, formatMXN } from '../api';
import { Product, Order } from '../types';

export const ProductCatalog: React.FC = () => {
  const { user, refreshUser, setActiveTab } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('todos');

  // Purchase modal state
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [targetEmail, setTargetEmail] = useState('');
  const [emailConfirm, setEmailConfirm] = useState('');
  const [referralCode, setReferralCode] = useState('');
  const [isValidatingRef, setIsValidatingRef] = useState(false);
  const [refValidation, setRefValidation] = useState<{ valid: boolean; referrerName?: string; error?: string } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      setLoading(true);
      const data = await api.products.list();
      setProducts(data);
    } catch (err) {
      console.error('Error loading products:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['todos', ...Array.from(new Set(products.map(p => p.category)))];

  const filteredProducts = products.filter(prod => {
    const matchesCategory = selectedCategory === 'todos' || prod.category === selectedCategory;
    const matchesSearch = 
      prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      prod.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleOpenPurchase = (prod: Product) => {
    setSelectedProduct(prod);
    setPurchaseError(null);
    setCompletedOrder(null);
    setTargetEmail(user?.email || '');
    setEmailConfirm(user?.email || '');
    const prefillCode = user?.referredByCode || '';
    setReferralCode(prefillCode);
    if (prefillCode) {
      setRefValidation({ valid: true, referrerName: 'Recomendador vinculado' });
    } else {
      setRefValidation(null);
    }
  };

  const handleCloseModal = () => {
    setSelectedProduct(null);
    setPurchaseError(null);
    setCompletedOrder(null);
    setIsSubmitting(false);
    setReferralCode('');
    setRefValidation(null);
  };

  const handleValidateReferralCode = async () => {
    if (!referralCode.trim()) return;
    try {
      setIsValidatingRef(true);
      const res = await api.referrals.validateCode(referralCode.trim());
      setRefValidation({
        valid: true,
        referrerName: res.referrerName,
      });
    } catch (err: any) {
      setRefValidation({
        valid: false,
        error: err.message || 'Código no válido',
      });
    } finally {
      setIsValidatingRef(false);
    }
  };

  const handleConfirmPurchase = async () => {
    if (!selectedProduct || !user || isSubmitting) return;

    if (selectedProduct.deliveryMode === 'email_activation') {
      if (!targetEmail || !targetEmail.includes('@')) {
        setPurchaseError('Por favor introduce un correo electrónico válido para la activación.');
        return;
      }
      if (targetEmail.trim().toLowerCase() !== emailConfirm.trim().toLowerCase()) {
        setPurchaseError('Los correos electrónicos no coinciden. Verifica que esté escrito correctamente.');
        return;
      }
    }

    if (user.balanceCents < selectedProduct.priceCents) {
      setPurchaseError('Saldo insuficiente para completar esta compra.');
      return;
    }

    try {
      setIsSubmitting(true);
      setPurchaseError(null);

      const res = await api.orders.purchase({
        productId: selectedProduct.id,
        targetEmail: selectedProduct.deliveryMode === 'email_activation' ? targetEmail.trim() : undefined,
        referralCode: referralCode.trim() || undefined,
      });

      await refreshUser();
      await loadProducts(); // Refresh stock counts
      setCompletedOrder(res.order);
    } catch (err: any) {
      setPurchaseError(err.message || 'Error al procesar la compra.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-zinc-800 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
            <Sparkles className="w-3 h-3" /> Catálogo Privado MXN
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Licencias, Cuentas y Cupos Digitales
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Precios en pesos mexicanos con asignación atómica de inventario, cuentas completas y perfiles compartidos.
          </p>
        </div>

        {/* User Balance Reminder */}
        {user && (
          <div className="flex items-center gap-3 p-3 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
            <div>
              <div className="text-[11px] text-zinc-400">Tu saldo disponible</div>
              <div className="text-lg font-mono font-bold text-emerald-400">
                {formatMXN(user.balanceCents)}
              </div>
            </div>
            <button
              onClick={() => setActiveTab('recargar')}
              className="px-3 py-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 text-xs font-semibold border border-emerald-500/30"
            >
              + Recargar
            </button>
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar por nombre o descripción..."
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Categories Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-2 sm:pb-0">
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-zinc-900 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
              }`}
            >
              {cat === 'todos' ? 'Todas las categorías' : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Products Grid */}
      {loading ? (
        <div className="py-20 text-center text-zinc-500">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
          Cargando inventario de la bóveda...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 text-center text-zinc-500 bg-zinc-900/40 rounded-2xl border border-zinc-800">
          <ShoppingBag className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
          <p className="text-sm">No se encontraron productos que coincidan con tu búsqueda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProducts.map(prod => {
            const hasStock = (prod.availableStock ?? 0) > 0;
            const canAfford = user ? user.balanceCents >= prod.priceCents : true;
            const isProfile = prod.presentation === 'profile';

            return (
              <div
                key={prod.id}
                className="rounded-2xl bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 overflow-hidden flex flex-col justify-between transition-all hover:shadow-xl hover:shadow-zinc-950/50 group"
              >
                <div>
                  {/* Product Image Banner */}
                  <div className="relative w-full h-44 bg-zinc-950 border-b border-zinc-800/80 overflow-hidden">
                    {prod.imageUrl ? (
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          // Hide broken image and fallback to placeholder
                          (e.currentTarget as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-900 to-zinc-950 text-zinc-600">
                        <ShoppingBag className="w-10 h-10 mb-1 opacity-60" />
                        <span className="text-[11px] font-mono uppercase tracking-wider">{prod.category}</span>
                      </div>
                    )}

                    {/* Overlay Badges */}
                    <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
                      {/* Commercial Presentation Badge */}
                      {isProfile ? (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-purple-950/90 text-purple-300 border border-purple-500/40 shadow-sm flex items-center gap-1 backdrop-blur-md">
                          <Layers className="w-3 h-3" /> Perfil
                        </span>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-bold bg-emerald-950/90 text-emerald-300 border border-emerald-500/40 shadow-sm flex items-center gap-1 backdrop-blur-md">
                          <UserCheck className="w-3 h-3" /> Cuenta completa
                        </span>
                      )}

                      {prod.badge && (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-zinc-900/90 text-zinc-300 border border-zinc-700 backdrop-blur-md">
                          {prod.badge}
                        </span>
                      )}
                    </div>

                    {/* Stock pill over image */}
                    <div className="absolute bottom-2.5 right-3">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-medium backdrop-blur-md border ${
                          hasStock
                            ? 'bg-zinc-900/90 text-emerald-400 border-emerald-500/30'
                            : 'bg-rose-950/90 text-rose-300 border-rose-500/30'
                        }`}
                      >
                        {hasStock ? `${prod.availableStock} cupos disponibles` : 'Agotado'}
                      </span>
                    </div>
                  </div>

                  {/* Card Content */}
                  <div className="p-5">
                    {/* Category */}
                    <div className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      {prod.category}
                    </div>

                    {/* Title */}
                    <h3 className="text-lg font-bold text-white group-hover:text-emerald-400 transition-colors leading-snug">
                      {prod.title}
                    </h3>

                    {/* Description */}
                    <p className="text-xs text-zinc-400 mt-2 line-clamp-3 leading-relaxed">
                      {prod.description}
                    </p>

                    {/* Profile Presentation Explanatory Note */}
                    {isProfile && (
                      <div className="mt-3 p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/20 text-purple-300 text-[11px] flex items-start gap-2">
                        <Info className="w-3.5 h-3.5 shrink-0 text-purple-400 mt-0.5" />
                        <span className="leading-tight">
                          Se entregan credenciales compartidas y no un perfil identificado.
                        </span>
                      </div>
                    )}

                    {/* Delivery & Warranty Details */}
                    <div className="mt-4 pt-3 border-t border-zinc-800/80 space-y-2">
                      <div className="flex items-center gap-2 text-xs">
                        {prod.deliveryMode === 'automatic' ? (
                          <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                            <Zap className="w-3.5 h-3.5 shrink-0" />
                            <span>Entrega automática inmediata</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-sky-400 font-medium">
                            <Mail className="w-3.5 h-3.5 shrink-0" />
                            <span>Activación manual a tu correo</span>
                          </div>
                        )}
                      </div>

                      {/* Warranty */}
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                        <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>{prod.warrantyDays} días de garantía</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Price and CTA */}
                <div className="p-5 pt-0">
                  <div className="pt-3 border-t border-zinc-800 flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[10px] text-zinc-400 uppercase font-medium">Precio MXN</div>
                      <div className="text-xl font-bold font-mono text-zinc-100">
                        {formatMXN(prod.priceCents)}
                      </div>
                    </div>

                    <button
                      disabled={!hasStock}
                      onClick={() => handleOpenPurchase(prod)}
                      className={`px-4 py-2.5 rounded-xl font-semibold text-xs flex items-center gap-2 transition-all ${
                        !hasStock
                          ? 'bg-zinc-800 text-zinc-500 cursor-not-allowed'
                          : canAfford
                          ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-md shadow-emerald-950/50 hover:translate-y-[-1px]'
                          : 'bg-zinc-800 hover:bg-zinc-700 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      <span>{!hasStock ? 'Sin cupos' : canAfford ? 'Comprar ahora' : 'Ver detalle'}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* PURCHASE CONFIRMATION MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-zinc-900 border border-zinc-800 p-6 sm:p-7 shadow-2xl space-y-6 my-8">
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              disabled={isSubmitting}
              className="absolute top-4 right-4 p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 disabled:opacity-50"
            >
              <X className="w-5 h-5" />
            </button>

            {completedOrder ? (
              /* Success State */
              <div className="text-center py-4 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-xl font-bold text-white">¡Compra realizada con éxito!</h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Folio de pedido: <strong className="text-zinc-200 font-mono">{completedOrder.id}</strong>
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 text-left text-xs space-y-2.5">
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Producto:</span>
                    <span className="font-semibold text-zinc-200">{completedOrder.productSnapshot.title}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-400">Presentación:</span>
                    <span className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                      completedOrder.presentation === 'profile' 
                        ? 'bg-purple-950 text-purple-300 border border-purple-800' 
                        : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                    }`}>
                      {completedOrder.presentation === 'profile' ? 'Perfil' : 'Cuenta completa'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Modalidad:</span>
                    <span className="text-zinc-200">
                      {completedOrder.deliveryMode === 'automatic'
                        ? '⚡ Entrega Automática (Credenciales listas)'
                        : '✉️ Activación por correo pendiente'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-zinc-400">Importe cobrado:</span>
                    <span className="font-mono text-emerald-400 font-bold">{formatMXN(completedOrder.priceCents)}</span>
                  </div>
                  {completedOrder.referralCodeApplied && (
                    <div className="flex justify-between pt-1 border-t border-zinc-800/60">
                      <span className="text-zinc-400 flex items-center gap-1">
                        <Gift className="w-3.5 h-3.5 text-amber-400" />
                        Código de referido:
                      </span>
                      <span className="font-mono text-amber-400 font-bold">
                        {completedOrder.referralCodeApplied} {completedOrder.referrerName ? `(${completedOrder.referrerName})` : ''}
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    onClick={() => {
                      handleCloseModal();
                      setActiveTab('compras');
                    }}
                    className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow"
                  >
                    Ver en Mis Compras
                  </button>

                  <button
                    onClick={handleCloseModal}
                    className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm"
                  >
                    Seguir comprando
                  </button>
                </div>
              </div>
            ) : (
              /* Checkout Form */
              <>
                <div className="flex gap-4 items-start">
                  {selectedProduct.imageUrl && (
                    <img
                      src={selectedProduct.imageUrl}
                      alt={selectedProduct.title}
                      className="w-16 h-16 rounded-xl object-cover border border-zinc-700 shrink-0"
                    />
                  )}
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                        selectedProduct.presentation === 'profile'
                          ? 'bg-purple-950 text-purple-300 border border-purple-800'
                          : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {selectedProduct.presentation === 'profile' ? 'Perfil' : 'Cuenta completa'}
                      </span>
                      <span className="text-[11px] font-semibold text-zinc-400 uppercase">
                        {selectedProduct.category}
                      </span>
                    </div>
                    <h2 className="text-lg font-bold text-white">
                      {selectedProduct.title}
                    </h2>
                  </div>
                </div>

                {/* Important notice if profile */}
                {selectedProduct.presentation === 'profile' && (
                  <div className="p-3.5 rounded-xl bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs flex items-start gap-2.5">
                    <Info className="w-4 h-4 shrink-0 text-purple-400 mt-0.5" />
                    <div>
                      <strong className="block text-purple-300 mb-0.5">Presentación comercial: Perfil</strong>
                      <span>Se entregan credenciales compartidas y no un perfil identificado. El cupo adquirido te otorga derecho de acceso sin modificar las credenciales.</span>
                    </div>
                  </div>
                )}

                {/* Delivery Mode details */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs space-y-2">
                  <div className="flex items-center gap-2 text-zinc-300">
                    {selectedProduct.deliveryMode === 'automatic' ? (
                      <>
                        <Zap className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span><strong>Entrega Inmediata:</strong> Al confirmar, se consumirá un cupo y verás tus credenciales en “Mis Compras”.</span>
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 text-sky-400 shrink-0" />
                        <span><strong>Activación Manual:</strong> El administrador vinculará tu correo y activará el plan.</span>
                      </>
                    )}
                  </div>

                  <div className="flex items-center gap-2 text-zinc-400 pt-2 border-t border-zinc-800/80">
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                    <span><strong>Garantía:</strong> {selectedProduct.warrantyDays} días. {selectedProduct.warrantyConditions}</span>
                  </div>
                </div>

                {/* If email activation: target email input */}
                {selectedProduct.deliveryMode === 'email_activation' && (
                  <div className="space-y-3 p-4 rounded-xl bg-zinc-950/70 border border-sky-950">
                    <label className="block text-xs font-semibold text-sky-300">
                      Correo al que se activará el producto:
                    </label>
                    <input
                      type="email"
                      value={targetEmail}
                      onChange={e => setTargetEmail(e.target.value)}
                      placeholder="ejemplo@correo.com"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sky-500"
                    />

                    <label className="block text-xs font-semibold text-sky-300">
                      Confirma el correo (evita errores):
                    </label>
                    <input
                      type="email"
                      value={emailConfirm}
                      onChange={e => setEmailConfirm(e.target.value)}
                      placeholder="repite ejemplo@correo.com"
                      className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 focus:outline-none focus:border-sky-500"
                    />
                  </div>
                )}

                {/* Referral Code Field */}
                <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-zinc-300 flex items-center gap-1.5">
                      <Gift className="w-3.5 h-3.5 text-amber-400" />
                      <span>Código de Referido / Recomendación (Opcional):</span>
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">
                      Genera 5% cashback/puntos
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={referralCode}
                      onChange={e => {
                        setReferralCode(e.target.value.toUpperCase());
                        setRefValidation(null);
                      }}
                      placeholder="Ej. CLI-84920"
                      className="flex-1 bg-zinc-900 border border-zinc-700 rounded-lg px-3 py-1.5 text-xs text-white uppercase font-mono focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleValidateReferralCode}
                      disabled={isValidatingRef || !referralCode.trim()}
                      className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold disabled:opacity-40 transition-colors"
                    >
                      {isValidatingRef ? 'Validando...' : 'Aplicar'}
                    </button>
                  </div>

                  {refValidation && (
                    <div className={`text-[11px] flex items-center gap-1.5 ${refValidation.valid ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {refValidation.valid ? <Check className="w-3.5 h-3.5" /> : <AlertTriangle className="w-3.5 h-3.5" />}
                      <span>
                        {refValidation.valid
                          ? `Código aplicado (${refValidation.referrerName}). Tu recomendador generará ${formatMXN(Math.round(selectedProduct.priceCents * 0.05))} de cashback o puntos.`
                          : refValidation.error}
                      </span>
                    </div>
                  )}
                </div>

                {/* Balance math breakdown */}
                <div className="p-4 rounded-xl bg-zinc-950 border border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Tu saldo actual:</span>
                    <span className="font-mono text-zinc-200">{formatMXN(user?.balanceCents || 0)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400">
                    <span>Precio del producto:</span>
                    <span className="font-mono text-zinc-200">- {formatMXN(selectedProduct.priceCents)}</span>
                  </div>
                  <div className="pt-2 border-t border-zinc-800 flex justify-between font-semibold">
                    <span className="text-zinc-300">Saldo restante estimado:</span>
                    <span
                      className={`font-mono ${
                        (user?.balanceCents || 0) - selectedProduct.priceCents >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatMXN((user?.balanceCents || 0) - selectedProduct.priceCents)}
                    </span>
                  </div>
                </div>

                {/* Error Banner */}
                {purchaseError && (
                  <div className="p-3 rounded-xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                    <span>{purchaseError}</span>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleCloseModal}
                    disabled={isSubmitting}
                    className="order-2 sm:order-1 px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-sm transition-colors disabled:opacity-50"
                  >
                    Cancelar
                  </button>

                  {(user?.balanceCents || 0) < selectedProduct.priceCents ? (
                    <button
                      type="button"
                      onClick={() => {
                        handleCloseModal();
                        setActiveTab('recargar');
                      }}
                      className="order-1 sm:order-2 flex-1 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-sm transition-colors shadow"
                    >
                      Recargar saldo para comprar
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleConfirmPurchase}
                      className="order-1 sm:order-2 flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          <span>Procesando compra segura...</span>
                        </>
                      ) : (
                        <span>Confirmar y pagar {formatMXN(selectedProduct.priceCents)}</span>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
