import { Router, Response } from 'express';
import { 
  runTransaction, 
  getStore, 
  backupStore, 
  restoreStore 
} from './db.js';
import { 
  hashPassword, 
  verifyPassword, 
  encryptCredential, 
  decryptCredential, 
  generateCustomerCode, 
  generateInviteCode, 
  generateMovementCode, 
  generateOrderCode,
  generateCaseCode,
  generateAccountId
} from './crypto.js';
import { 
  createSession, 
  removeSession, 
  requireAuth, 
  requireAdmin, 
  AuthenticatedRequest 
} from './auth.js';
import { 
  Product, 
  StockUnit, 
  Order, 
  BalanceMovement, 
  WarrantyCase, 
  AuditLog, 
  User,
  InventoryAccount,
  PresentationMode,
  OrderProductSnapshot,
  ReferralReward,
  InfoBanner
} from './types.js';

export const apiRouter = Router();

// ==========================================
// 1. AUTHENTICATION & DEMO SWITCH
// ==========================================

// Login
apiRouter.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Correo y contraseña requeridos.' });
  }

  const store = await getStore();
  const user = store.users.find(u => u.email.toLowerCase() === String(email).trim().toLowerCase());

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  const isValid = verifyPassword(password, user.passwordSalt, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Tu cuenta ha sido suspendida. Contacta a soporte por Telegram.' });
  }

  const token = await createSession(user.id);
  const { passwordHash, passwordSalt, ...safeUser } = user;
  res.json({ token, user: safeUser });
});

// Register with one-time invite token
apiRouter.post('/auth/register-with-invite', async (req, res) => {
  const { inviteCode, email, name, password, referralCode } = req.body;

  if (!inviteCode || !email || !name || !password) {
    return res.status(400).json({ error: 'Todos los campos son obligatorios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanCode = String(inviteCode).trim().toUpperCase();
  const cleanRefCode = referralCode ? String(referralCode).trim().toUpperCase() : null;

  try {
    const result = await runTransaction(async store => {
      // Check existing email
      if (store.users.some(u => u.email.toLowerCase() === cleanEmail)) {
        throw new Error('Ya existe una cuenta registrada con este correo electrónico.');
      }

      // Check invitation
      const invite = store.invitations.find(i => i.code === cleanCode);
      if (!invite) {
        throw new Error('Código de invitación no válido.');
      }

      if (invite.status !== 'active') {
        throw new Error('Esta invitación ya ha sido canjeada o no está disponible.');
      }

      if (invite.assignedEmail && invite.assignedEmail.toLowerCase() !== cleanEmail) {
        throw new Error(`Esta invitación está reservada para el correo ${invite.assignedEmail}.`);
      }

      // Check referrer if provided
      let referrerUser: User | undefined;
      if (cleanRefCode) {
        referrerUser = store.users.find(u => 
          (u.referralCode?.toUpperCase() === cleanRefCode || u.customerCode?.toUpperCase() === cleanRefCode) &&
          u.status === 'active'
        );
      }

      const now = new Date().toISOString();
      const userId = 'usr_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
      const customerCode = generateCustomerCode();
      const { salt, hash } = hashPassword(password);

      const newUser: User = {
        id: userId,
        customerCode,
        email: cleanEmail,
        name: String(name).trim(),
        passwordHash: hash,
        passwordSalt: salt,
        role: 'client',
        balanceCents: 0,
        status: 'active',
        invitedBy: invite.createdBy,
        referralCode: customerCode,
        referredByCode: referrerUser ? (referrerUser.referralCode || referrerUser.customerCode) : null,
        referredByUserId: referrerUser ? referrerUser.id : null,
        referralPoints: 0,
        referralEarningsCents: 0,
        createdAt: now,
        updatedAt: now,
      };

      // Mark invitation redeemed
      invite.status = 'redeemed';
      invite.redeemedBy = userId;
      invite.redeemedAt = now;

      store.users.push(newUser);

      // Audit log
      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: invite.createdBy,
        adminName: 'Sistema Invitación',
        action: 'invite_redeemed',
        targetType: 'user',
        targetId: userId,
        details: { inviteCode: cleanCode, email: cleanEmail },
        createdAt: now,
      });

      return newUser;
    });

    const token = await createSession(result.id);
    const { passwordHash, passwordSalt, ...safeUser } = result;
    res.json({ token, user: safeUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al canjear invitación.' });
  }
});

// Current user info
apiRouter.get('/auth/me', requireAuth, async (req: AuthenticatedRequest, res) => {
  const store = await getStore();
  const freshUser = store.users.find(u => u.id === req.user!.id);
  if (!freshUser) {
    return res.status(404).json({ error: 'Usuario no encontrado.' });
  }
  const { passwordHash, passwordSalt, ...safeUser } = freshUser;
  res.json({ user: safeUser, settings: store.settings });
});

// Logout
apiRouter.post('/auth/logout', async (req: AuthenticatedRequest, res) => {
  if (req.token) {
    await removeSession(req.token);
  }
  res.json({ success: true });
});

// Demo switch: Allows switching between Admin and Client in 1 click for testing
apiRouter.post('/auth/demo-switch', async (req, res) => {
  const { role } = req.body; // 'admin' | 'client'
  const store = await getStore();
  const targetUser = store.users.find(u => u.role === (role === 'admin' ? 'admin' : 'client'));

  if (!targetUser) {
    return res.status(404).json({ error: 'Usuario demo no encontrado.' });
  }

  const token = await createSession(targetUser.id);
  const { passwordHash, passwordSalt, ...safeUser } = targetUser;
  res.json({ token, user: safeUser, settings: store.settings });
});

// ==========================================
// 2. STORE SETTINGS (BANK & TELEGRAM)
// ==========================================

apiRouter.get('/settings', async (_req, res) => {
  const store = await getStore();
  res.json(store.settings);
});

apiRouter.put('/admin/settings', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { 
    storeName, 
    bankName, 
    clabe, 
    accountHolder, 
    depositInstructions, 
    telegramUsername, 
    telegramLink,
    supportHours 
  } = req.body;

  if (!bankName || !clabe || !accountHolder || !telegramUsername) {
    return res.status(400).json({ error: 'Todos los campos bancarios y de Telegram son obligatorios.' });
  }

  const updatedSettings = await runTransaction(store => {
    store.settings = {
      ...store.settings,
      storeName: storeName || store.settings.storeName,
      bankName: String(bankName).trim(),
      clabe: String(clabe).trim(),
      accountHolder: String(accountHolder).trim(),
      depositInstructions: String(depositInstructions).trim(),
      telegramUsername: String(telegramUsername).trim(),
      telegramLink: String(telegramLink).trim(),
      supportHours: supportHours || store.settings.supportHours,
      updatedAt: new Date().toISOString(),
    };
    return store.settings;
  });

  res.json(updatedSettings);
});

// ==========================================
// 3. INVITATIONS MANAGEMENT (ADMIN)
// ==========================================

apiRouter.get('/admin/invitations', requireAdmin, async (_req, res) => {
  const store = await getStore();
  const enriched = store.invitations.map(inv => {
    const redeemedUser = inv.redeemedBy ? store.users.find(u => u.id === inv.redeemedBy) : null;
    return {
      ...inv,
      redeemedUserName: redeemedUser?.name,
      redeemedUserEmail: redeemedUser?.email,
    };
  });
  res.json(enriched);
});

apiRouter.post('/admin/invitations', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { note, assignedEmail } = req.body;
  const now = new Date().toISOString();
  const code = generateInviteCode();

  const newInvite = await runTransaction(store => {
    const invite = {
      id: 'inv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
      code,
      note: note ? String(note).trim() : 'Invitación personalizada',
      assignedEmail: assignedEmail ? String(assignedEmail).trim().toLowerCase() : null,
      status: 'active' as const,
      createdBy: req.user!.id,
      createdAt: now,
    };
    store.invitations.unshift(invite);
    return invite;
  });

  res.json(newInvite);
});

apiRouter.post('/admin/invitations/:id/revoke', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await runTransaction(store => {
      const invite = store.invitations.find(i => i.id === id);
      if (!invite) throw new Error('Invitación no encontrada.');
      if (invite.status === 'redeemed') throw new Error('No se puede revocar una invitación ya canjeada.');
      invite.status = 'revoked';
      return invite;
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4. PRODUCTS & CATALOG
// ==========================================

apiRouter.get('/products', async (req: AuthenticatedRequest, res) => {
  const store = await getStore();
  const isAdmin = req.user?.role === 'admin';

  // Compute available stock for each product
  const productsWithStock = store.products
    .filter(p => isAdmin || p.active)
    .map(prod => {
      let availableStock = 0;
      if (prod.deliveryMode === 'automatic') {
        // Sum available slots from active inventoryAccounts
        const accounts = (store.inventoryAccounts || []).filter(
          acc => acc.productId === prod.id && acc.status === 'active'
        );
        const accountSlots = accounts.reduce(
          (sum, a) => sum + Math.max(0, a.totalSlots - a.consumedSlots), 
          0
        );

        // Plus any legacy stockUnits if present
        const legacyUnits = (store.stockUnits || []).filter(
          s => s.productId === prod.id && s.status === 'available'
        ).length;

        availableStock = accountSlots + legacyUnits;
      } else {
        availableStock = prod.manualStockCount || 0;
      }

      const hasSold = Boolean(prod.hasSold) || (store.orders || []).some(o => o.productId === prod.id);

      return {
        ...prod,
        presentation: prod.presentation || 'full_account',
        imageUrl: prod.imageUrl || null,
        availableStock,
        hasSold,
      };
    });

  res.json(productsWithStock);
});

apiRouter.post('/admin/products', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { 
    title, 
    category, 
    description, 
    priceCents, 
    deliveryMode, 
    presentation,
    imageUrl,
    warrantyDays, 
    warrantyConditions,
    manualStockCount,
    badge 
  } = req.body;

  if (!title || !category || !description || priceCents == null || !deliveryMode) {
    return res.status(400).json({ error: 'Campos requeridos incompletos.' });
  }

  const now = new Date().toISOString();
  const presMode: PresentationMode = presentation === 'profile' ? 'profile' : 'full_account';

  const newProduct: Product = {
    id: 'prod_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    title: String(title).trim(),
    category: String(category).trim(),
    description: String(description).trim(),
    priceCents: Math.round(Number(priceCents)),
    deliveryMode: deliveryMode === 'automatic' ? 'automatic' : 'email_activation',
    presentation: presMode,
    imageUrl: imageUrl ? String(imageUrl).trim() : null,
    warrantyDays: Math.max(1, Number(warrantyDays) || 30),
    warrantyConditions: String(warrantyConditions || 'Garantía estándar del producto.').trim(),
    active: true,
    hasSold: false,
    manualStockCount: deliveryMode === 'email_activation' ? Math.max(0, Number(manualStockCount) || 0) : undefined,
    badge: badge ? String(badge).trim() : undefined,
    createdAt: now,
    updatedAt: now,
  };

  await runTransaction(store => {
    store.products.unshift(newProduct);
    store.auditLogs.push({
      id: 'aud_' + Date.now(),
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'product_created',
      targetType: 'product',
      targetId: newProduct.id,
      details: { title: newProduct.title, priceCents: newProduct.priceCents, presentation: newProduct.presentation },
      createdAt: now,
    });
  });

  res.json(newProduct);
});

apiRouter.put('/admin/products/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { 
    title, 
    category, 
    description, 
    priceCents, 
    deliveryMode,
    presentation,
    imageUrl,
    warrantyDays, 
    warrantyConditions,
    manualStockCount,
    badge,
    active 
  } = req.body;

  try {
    const updated = await runTransaction(store => {
      const prod = store.products.find(p => p.id === id);
      if (!prod) throw new Error('Producto no encontrado.');

      const hasSold = Boolean(prod.hasSold) || store.orders.some(o => o.productId === id);

      if (presentation && presentation !== prod.presentation) {
        if (hasSold) {
          throw new Error('No se permite cambiar la presentación comercial (cuenta completa o perfil) después de haber realizado la primera venta.');
        }
        prod.presentation = presentation === 'profile' ? 'profile' : 'full_account';
      }

      if (deliveryMode && deliveryMode !== prod.deliveryMode) {
        if (hasSold) {
          throw new Error('No se permite cambiar la modalidad de entrega después de haber realizado la primera venta.');
        }
        prod.deliveryMode = deliveryMode;
      }

      if (title) prod.title = String(title).trim();
      if (category) prod.category = String(category).trim();
      if (description) prod.description = String(description).trim();
      if (priceCents != null) prod.priceCents = Math.round(Number(priceCents));
      if (imageUrl !== undefined) prod.imageUrl = imageUrl ? String(imageUrl).trim() : null;
      if (warrantyDays != null) prod.warrantyDays = Math.max(1, Number(warrantyDays));
      if (warrantyConditions != null) prod.warrantyConditions = String(warrantyConditions).trim();
      if (badge !== undefined) prod.badge = badge ? String(badge).trim() : undefined;
      if (active !== undefined) prod.active = Boolean(active);
      if (prod.deliveryMode === 'email_activation' && manualStockCount != null) {
        prod.manualStockCount = Math.max(0, Number(manualStockCount));
      }
      prod.updatedAt = new Date().toISOString();
      return prod;
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Upload, replace, or validate product image
apiRouter.post('/admin/products/:id/image', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { image } = req.body; // Base64 data URL or external URL

  if (!image) {
    return res.status(400).json({ error: 'Se requiere una imagen para procesar.' });
  }

  if (typeof image !== 'string') {
    return res.status(400).json({ error: 'Formato de imagen inválido.' });
  }

  // Validate format and size
  if (image.startsWith('data:')) {
    const match = image.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,/);
    if (!match) {
      return res.status(400).json({ error: 'Formato de imagen no soportado. Usa PNG, JPG, WEBP o SVG.' });
    }
    const mime = match[1].toLowerCase();
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif', 'image/svg+xml'];
    if (!allowed.includes(mime)) {
      return res.status(400).json({ error: `Tipo de archivo (${mime}) no permitido. Formatos aceptados: PNG, JPG, WEBP, SVG.` });
    }
    const base64Content = image.split(',')[1] || '';
    const approxBytes = (base64Content.length * 3) / 4;
    if (approxBytes > 5 * 1024 * 1024) {
      return res.status(400).json({ error: 'La imagen excede el límite máximo de 5MB. Por favor sube una imagen más ligera.' });
    }
  } else if (!image.startsWith('http://') && !image.startsWith('https://')) {
    return res.status(400).json({ error: 'URL de imagen no válida.' });
  }

  try {
    const updated = await runTransaction(store => {
      const prod = store.products.find(p => p.id === id);
      if (!prod) throw new Error('Producto no encontrado.');
      prod.imageUrl = image;
      prod.updatedAt = new Date().toISOString();
      return prod;
    });

    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Remove product image
apiRouter.delete('/admin/products/:id/image', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await runTransaction(store => {
      const prod = store.products.find(p => p.id === id);
      if (!prod) throw new Error('Producto no encontrado.');
      prod.imageUrl = null;
      prod.updatedAt = new Date().toISOString();
      return prod;
    });
    res.json({ success: true, product: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

apiRouter.patch('/admin/products/:id/toggle', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await runTransaction(store => {
      const prod = store.products.find(p => p.id === id);
      if (!prod) throw new Error('Producto no encontrado.');
      prod.active = !prod.active;
      prod.updatedAt = new Date().toISOString();
      return prod;
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 4.1 INVENTORY ACCOUNTS & QUOTAS MANAGEMENT
// ==========================================

// List inventory accounts (admin)
apiRouter.get('/admin/inventory/accounts', requireAdmin, async (req, res) => {
  const store = await getStore();
  const { productId } = req.query;

  let accounts = store.inventoryAccounts || [];
  if (productId) {
    accounts = accounts.filter(a => a.productId === productId);
  }

  const enriched = accounts.map(acc => {
    const product = store.products.find(p => p.id === acc.productId);
    const buyersCount = (store.orders || []).filter(o => o.inventoryAccountId === acc.id).length;
    return {
      ...acc,
      productTitle: product?.title || 'Producto desconocido',
      productPresentation: product?.presentation || acc.presentation,
      availableSlots: Math.max(0, acc.totalSlots - acc.consumedSlots),
      buyersCount,
    };
  });

  res.json(enriched);
});

// Create inventory account
apiRouter.post('/admin/inventory/accounts', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { productId, identifier, rawCredentials, totalSlots, notes } = req.body;

  if (!productId || !identifier || !rawCredentials) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: producto, identificador y credenciales.' });
  }

  const cleanIdentifier = String(identifier).trim().toLowerCase();
  const rawCreds = String(rawCredentials).trim();

  try {
    const newAccount = await runTransaction(store => {
      const product = store.products.find(p => p.id === productId);
      if (!product) throw new Error('Producto no encontrado.');
      if (product.deliveryMode !== 'automatic') {
        throw new Error('Solo se pueden asociar cuentas de inventario a productos con modalidad de entrega automática.');
      }

      // Check duplicate accounts across the entire store to prevent bypassing quotas
      const duplicate = (store.inventoryAccounts || []).find(
        a => a.identifier.toLowerCase() === cleanIdentifier
      );
      if (duplicate) {
        throw new Error(`La cuenta "${cleanIdentifier}" ya está registrada en el inventario. No se permite duplicar cuentas para eludir límites ni venderlas simultáneamente en diferentes modalidades.`);
      }

      let slots = 1;
      if (product.presentation === 'full_account') {
        slots = 1;
      } else {
        slots = Math.max(1, Math.round(Number(totalSlots) || 1));
      }

      const now = new Date().toISOString();
      const accountId = generateAccountId();

      let snippet = rawCreds.substring(0, 8) + '••••' + (rawCreds.length > 12 ? rawCreds.substring(rawCreds.length - 4) : '');
      if (snippet.length < 5) snippet = '••••••';

      const account: InventoryAccount = {
        id: accountId,
        productId: product.id,
        identifier: cleanIdentifier,
        encryptedCredentials: encryptCredential(rawCreds),
        credentialsSnippet: snippet,
        presentation: product.presentation,
        totalSlots: slots,
        consumedSlots: 0,
        status: 'active',
        notes: notes ? String(notes).trim() : undefined,
        capacityHistory: [],
        credentialUpdates: [],
        createdAt: now,
        updatedAt: now,
      };

      if (!store.inventoryAccounts) store.inventoryAccounts = [];
      store.inventoryAccounts.push(account);

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'inventory_account_created',
        targetType: 'inventory_account',
        targetId: account.id,
        details: { identifier: cleanIdentifier, totalSlots: slots, productId: product.id, presentation: product.presentation },
        createdAt: now,
      });

      return account;
    });

    res.json({ success: true, account: newAccount });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update account capacity
apiRouter.put('/admin/inventory/accounts/:id/capacity', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { newTotalSlots, reason } = req.body;

  if (newTotalSlots == null || !reason) {
    return res.status(400).json({ error: 'Debes indicar la nueva capacidad de cupos y el motivo obligatorio del cambio.' });
  }

  const requestedSlots = Math.round(Number(newTotalSlots));
  if (requestedSlots < 1) {
    return res.status(400).json({ error: 'La capacidad debe ser un número entero positivo mayor o igual a 1.' });
  }

  try {
    const updated = await runTransaction(store => {
      const account = (store.inventoryAccounts || []).find(a => a.id === id);
      if (!account) throw new Error('Cuenta de inventario no encontrada.');

      const product = store.products.find(p => p.id === account.productId);
      if (product && product.presentation === 'full_account' && requestedSlots !== 1) {
        throw new Error('Una cuenta completa no puede configurarse con múltiples cupos. Debe tener exactamente 1 cupo.');
      }

      if (requestedSlots < account.consumedSlots) {
        throw new Error(`No se puede reducir la capacidad a ${requestedSlots} cupos porque ya se han vendido ${account.consumedSlots} cupos.`);
      }

      const now = new Date().toISOString();
      const prevSlots = account.totalSlots;
      account.totalSlots = requestedSlots;

      if (!account.capacityHistory) account.capacityHistory = [];
      account.capacityHistory.push({
        id: 'cap_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        previousSlots: prevSlots,
        newSlots: requestedSlots,
        reason: String(reason).trim(),
        timestamp: now,
      });

      // Update status if it was exhausted and now has slots available
      if (account.status === 'exhausted' && account.consumedSlots < account.totalSlots) {
        account.status = 'active';
      }

      account.updatedAt = now;

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'account_capacity_adjusted',
        targetType: 'inventory_account',
        targetId: account.id,
        details: { previousSlots: prevSlots, newSlots: requestedSlots, reason: String(reason).trim() },
        createdAt: now,
      });

      return account;
    });

    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Update account credentials (reflects in linked purchases while keeping audit trail)
apiRouter.put('/admin/inventory/accounts/:id/credentials', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { newCredentials, notes } = req.body;

  if (!newCredentials || !notes) {
    return res.status(400).json({ error: 'Se requieren las nuevas credenciales y una nota explicativa para el registro administrativo protegido.' });
  }

  const rawCreds = String(newCredentials).trim();
  const cleanNotes = String(notes).trim();

  try {
    const updated = await runTransaction(store => {
      const account = (store.inventoryAccounts || []).find(a => a.id === id);
      if (!account) throw new Error('Cuenta de inventario no encontrada.');

      const now = new Date().toISOString();
      let snippet = rawCreds.substring(0, 8) + '••••' + (rawCreds.length > 12 ? rawCreds.substring(rawCreds.length - 4) : '');
      if (snippet.length < 5) snippet = '••••••';

      if (!account.credentialUpdates) account.credentialUpdates = [];
      account.credentialUpdates.push({
        id: 'crup_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        notes: cleanNotes,
        timestamp: now,
      });

      // Update credentials on account
      account.encryptedCredentials = encryptCredential(rawCreds);
      account.credentialsSnippet = snippet;
      account.updatedAt = now;

      // Update linked active orders' current deliveredContentEncrypted
      const linkedOrders = (store.orders || []).filter(o => o.inventoryAccountId === account.id);
      for (const order of linkedOrders) {
        order.deliveredContentEncrypted = account.encryptedCredentials;
        order.activationNotes = `[Credenciales actualizadas por administración]: ${cleanNotes}`;
        order.updatedAt = now;
      }

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'account_credentials_updated',
        targetType: 'inventory_account',
        targetId: account.id,
        details: { affectedOrdersCount: linkedOrders.length, notes: cleanNotes },
        createdAt: now,
      });

      return { account, affectedOrdersCount: linkedOrders.length };
    });

    res.json({ success: true, ...updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Toggle block status on account
apiRouter.patch('/admin/inventory/accounts/:id/toggle-block', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await runTransaction(store => {
      const account = (store.inventoryAccounts || []).find(a => a.id === id);
      if (!account) throw new Error('Cuenta de inventario no encontrada.');

      const now = new Date().toISOString();
      if (account.status === 'blocked') {
        account.status = account.consumedSlots >= account.totalSlots ? 'exhausted' : 'active';
      } else {
        account.status = 'blocked';
      }
      account.updatedAt = now;

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: account.status === 'blocked' ? 'account_blocked' : 'account_unblocked',
        targetType: 'inventory_account',
        targetId: account.id,
        createdAt: now,
      });

      return account;
    });

    res.json({ success: true, account: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// View all buyers linked to an account
apiRouter.get('/admin/inventory/accounts/:id/buyers', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const store = await getStore();
  const account = (store.inventoryAccounts || []).find(a => a.id === id);
  if (!account) {
    return res.status(404).json({ error: 'Cuenta de inventario no encontrada.' });
  }

  const buyersOrders = (store.orders || []).filter(o => o.inventoryAccountId === id);
  const buyersList = buyersOrders.map(order => {
    const user = store.users.find(u => u.id === order.userId);
    return {
      orderId: order.id,
      userId: order.userId,
      customerName: user?.name || 'Cliente desconocido',
      customerEmail: user?.email || 'Sin correo',
      customerCode: user?.customerCode || 'CLI-????',
      slotNumber: order.slotNumber,
      priceCents: order.priceCents,
      status: order.status,
      warrantyStatus: order.warrantyStatus,
      warrantyExpiresAt: order.warrantyExpiresAt,
      deliveryTimestamp: order.deliveryTimestamp,
      createdAt: order.createdAt,
      replacementOrderId: order.replacementOrderId,
    };
  });

  res.json({
    account,
    buyersCount: buyersList.length,
    buyers: buyersList,
  });
});

// View stock units for automatic product (admin - legacy support)
apiRouter.get('/admin/products/:id/stock', requireAdmin, async (req, res) => {
  const { id } = req.params;
  const store = await getStore();
  const units = (store.stockUnits || []).filter(u => u.productId === id);
  res.json(units);
});

// Load individual stock units for automatic delivery (admin)
apiRouter.post('/admin/products/:id/stock', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { rawUnits } = req.body; // Array of strings or newline separated string

  if (!rawUnits) {
    return res.status(400).json({ error: 'Se requiere el contenido de las unidades de stock.' });
  }

  const items: string[] = Array.isArray(rawUnits)
    ? rawUnits
    : String(rawUnits).split('\n').map(s => s.trim()).filter(Boolean);

  if (items.length === 0) {
    return res.status(400).json({ error: 'No se encontraron unidades válidas para cargar.' });
  }

  const now = new Date().toISOString();

  try {
    const createdUnits = await runTransaction(store => {
      const prod = store.products.find(p => p.id === id);
      if (!prod) throw new Error('Producto no encontrado.');
      if (prod.deliveryMode !== 'automatic') {
        throw new Error('Este producto no tiene modalidad de entrega automática.');
      }

      const newUnits: StockUnit[] = [];
      for (const item of items) {
        // Create snippet (mask center)
        let snippet = item.substring(0, 5) + '****' + item.substring(Math.max(5, item.length - 4));
        if (item.length < 8) snippet = '****' + item.substring(Math.max(0, item.length - 2));

        const unit: StockUnit = {
          id: 'stk_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          productId: id,
          encryptedContent: encryptCredential(item),
          contentSnippet: snippet,
          status: 'available',
          createdAt: now,
        };
        newUnits.push(unit);
        store.stockUnits.push(unit);
      }

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'stock_loaded',
        targetType: 'product',
        targetId: id,
        details: { count: newUnits.length, productTitle: prod.title },
        createdAt: now,
      });

      return newUnits;
    });

    res.json({ success: true, count: createdUnits.length });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 5. BALANCE & MOVEMENTS (WALLET)
// ==========================================

apiRouter.get('/wallet/movements', requireAuth, async (req: AuthenticatedRequest, res) => {
  const store = await getStore();
  const userId = req.user!.role === 'admin' && req.query.userId 
    ? String(req.query.userId) 
    : req.user!.id;

  const movements = store.balanceMovements
    .filter(m => m.userId === userId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json(movements);
});

// Admin credits balance manually (deposit)
apiRouter.post('/admin/wallet/credit', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { 
    userId, 
    amountCents, 
    reference, 
    reason,
    referralCode,
    generateReferralReward,
    referralRewardType, // 'cashback' | 'points'
    referralCustomCashbackCents,
    referralCustomPoints
  } = req.body;

  if (!userId || !amountCents || !reference || !reason) {
    return res.status(400).json({ 
      error: 'Todos los campos son obligatorios: usuario, monto, referencia y motivo.' 
    });
  }

  const cents = Math.round(Number(amountCents));
  if (cents <= 0) {
    return res.status(400).json({ error: 'El monto a acreditar debe ser mayor a cero.' });
  }

  const cleanRef = String(reference).trim();
  const cleanReason = String(reason).trim();

  if (!cleanRef || !cleanReason) {
    return res.status(400).json({ error: 'La referencia y el motivo no pueden estar vacíos.' });
  }

  try {
    const result = await runTransaction(store => {
      const user = store.users.find(u => u.id === userId);
      if (!user) throw new Error('Usuario no encontrado.');

      user.balanceCents += cents;
      const now = new Date().toISOString();

      const movement: BalanceMovement = {
        id: generateMovementCode(),
        userId: user.id,
        adminId: req.user!.id,
        type: 'deposit',
        amountCents: cents,
        balanceAfterCents: user.balanceCents,
        reference: cleanRef,
        reason: cleanReason,
        createdAt: now,
      };

      store.balanceMovements.push(movement);

      // Check if admin chose to generate referral reward or user has referrer
      let createdReward = null;
      let referrerUser: User | undefined;
      const effectiveRefCode = referralCode ? String(referralCode).trim().toUpperCase() : user.referredByCode;

      if (effectiveRefCode) {
        referrerUser = store.users.find(u => 
          (u.referralCode?.toUpperCase() === effectiveRefCode || u.customerCode?.toUpperCase() === effectiveRefCode) &&
          u.id !== user.id &&
          u.status === 'active'
        );

        if (referrerUser && !user.referredByCode) {
          user.referredByCode = referrerUser.referralCode || referrerUser.customerCode;
          user.referredByUserId = referrerUser.id;
        }
      }

      if (generateReferralReward && referrerUser) {
        const commRate = store.settings.referralCommissionRate || 5;
        const ptsPerMXN = store.settings.referralPointsPerMXN || 1;

        const rewardTypeToUse = referralRewardType || (store.settings.referralRewardType === 'points' ? 'points' : 'cashback');
        const calculatedCashback = referralCustomCashbackCents != null 
          ? Math.round(Number(referralCustomCashbackCents))
          : Math.round(cents * (commRate / 100));
        const calculatedPoints = referralCustomPoints != null
          ? Math.round(Number(referralCustomPoints))
          : Math.round((cents / 100) * ptsPerMXN);

        if (rewardTypeToUse === 'cashback') {
          referrerUser.balanceCents += calculatedCashback;
          referrerUser.referralEarningsCents = (referrerUser.referralEarningsCents || 0) + calculatedCashback;

          const refMovement: BalanceMovement = {
            id: generateMovementCode(),
            userId: referrerUser.id,
            adminId: req.user!.id,
            type: 'referral_cashback',
            amountCents: calculatedCashback,
            balanceAfterCents: referrerUser.balanceCents,
            reference: cleanRef,
            reason: `Comisión por recarga SPEI de tu referido ${user.name} (${user.customerCode})`,
            referralCode: referrerUser.referralCode || referrerUser.customerCode,
            createdAt: now,
          };
          store.balanceMovements.push(refMovement);
        } else {
          // Points
          referrerUser.referralPoints = (referrerUser.referralPoints || 0) + calculatedPoints;
        }

        if (!store.referralRewards) store.referralRewards = [];
        createdReward = {
          id: 'REF-REW-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          referrerUserId: referrerUser.id,
          referrerName: referrerUser.name,
          referrerCode: referrerUser.referralCode || referrerUser.customerCode,
          referredUserId: user.id,
          referredUserName: user.name,
          referredCustomerCode: user.customerCode,
          sourceType: 'recharge' as const,
          sourceId: cleanRef,
          sourceAmountCents: cents,
          rewardType: rewardTypeToUse as 'cashback' | 'points',
          pointsEarned: rewardTypeToUse === 'points' ? calculatedPoints : 0,
          cashbackCents: rewardTypeToUse === 'cashback' ? calculatedCashback : 0,
          commissionPercentage: commRate,
          status: 'approved' as const,
          notes: `Generado por admin al acreditar recarga SPEI: ${cleanRef}`,
          createdAt: now,
          processedAt: now,
          processedByAdminId: req.user!.id,
        };
        store.referralRewards.unshift(createdReward);
      }

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'balance_credited',
        targetType: 'user',
        targetId: user.id,
        details: { amountCents: cents, reference: cleanRef, reason: cleanReason, referralReward: createdReward ? createdReward.id : null },
        createdAt: now,
      });

      return { user, movement, referralReward: createdReward };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin compensatory movement (correction without deleting history)
apiRouter.post('/admin/wallet/compensation', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { userId, type, amountCents, reference, reason } = req.body;

  if (!userId || !type || !amountCents || !reference || !reason) {
    return res.status(400).json({ 
      error: 'Todos los campos son obligatorios: usuario, tipo, monto, referencia y motivo.' 
    });
  }

  if (type !== 'compensation_credit' && type !== 'compensation_debit') {
    return res.status(400).json({ error: 'Tipo de compensación no válido.' });
  }

  const cents = Math.round(Number(amountCents));
  if (cents <= 0) {
    return res.status(400).json({ error: 'El importe debe ser mayor a cero.' });
  }

  const cleanRef = String(reference).trim();
  const cleanReason = String(reason).trim();

  try {
    const result = await runTransaction(store => {
      const user = store.users.find(u => u.id === userId);
      if (!user) throw new Error('Usuario no encontrado.');

      let appliedDelta = 0;
      if (type === 'compensation_credit') {
        appliedDelta = cents;
        user.balanceCents += cents;
      } else {
        appliedDelta = -cents;
        if (user.balanceCents < cents) {
          throw new Error(`Saldo insuficiente para compensación de débito. Saldo actual: $${(user.balanceCents / 100).toFixed(2)} MXN`);
        }
        user.balanceCents -= cents;
      }

      const now = new Date().toISOString();
      const movement: BalanceMovement = {
        id: generateMovementCode(),
        userId: user.id,
        adminId: req.user!.id,
        type,
        amountCents: appliedDelta,
        balanceAfterCents: user.balanceCents,
        reference: cleanRef,
        reason: cleanReason,
        createdAt: now,
      };

      store.balanceMovements.push(movement);

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'compensatory_movement',
        targetType: 'user',
        targetId: user.id,
        details: { type, amountCents: appliedDelta, reference: cleanRef, reason: cleanReason },
        createdAt: now,
      });

      return { user, movement };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 6. PURCHASES & ORDERS (ATOMIC MUTEX)
// ==========================================

apiRouter.post('/orders/purchase', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { productId, targetEmail, referralCode } = req.body;

  if (!productId) {
    return res.status(400).json({ error: 'ID de producto requerido.' });
  }

  try {
    const result = await runTransaction(async store => {
      // 1. Fetch user
      const user = store.users.find(u => u.id === req.user!.id);
      if (!user) throw new Error('Usuario no encontrado.');

      if (user.status === 'suspended') {
        throw new Error('Tu cuenta está suspendida. No puedes realizar compras.');
      }

      // 2. Fetch product
      const product = store.products.find(p => p.id === productId);
      if (!product) throw new Error('Producto no encontrado.');

      if (!product.active) {
        throw new Error('Este producto no está disponible para la venta.');
      }

      // 3. Balance verification
      if (user.balanceCents < product.priceCents) {
        const diff = ((product.priceCents - user.balanceCents) / 100).toFixed(2);
        throw new Error(`Saldo insuficiente. Te faltan $${diff} MXN para adquirir este producto.`);
      }

      const now = new Date().toISOString();
      const orderId = generateOrderCode();

      // Check referral attribution
      const codeToUse = (referralCode && String(referralCode).trim()) || user.referredByCode;
      let referrerUser: User | undefined;
      if (codeToUse) {
        const cleanRefCode = String(codeToUse).trim().toUpperCase();
        referrerUser = store.users.find(u => 
          (u.referralCode?.toUpperCase() === cleanRefCode || u.customerCode?.toUpperCase() === cleanRefCode) &&
          u.id !== user.id &&
          u.status === 'active'
        );

        if (referrerUser && !user.referredByCode) {
          user.referredByCode = referrerUser.referralCode || referrerUser.customerCode;
          user.referredByUserId = referrerUser.id;
        }
      }

      let refCashbackCents = 0;
      let refPoints = 0;
      let refStatus: 'none' | 'pending' | 'credited' = 'none';

      if (referrerUser && store.settings.referralProgramEnabled !== false) {
        const commRate = store.settings.referralCommissionRate || 5;
        const ptsPerMXN = store.settings.referralPointsPerMXN || 1;
        refCashbackCents = Math.round(product.priceCents * (commRate / 100));
        refPoints = Math.round((product.priceCents / 100) * ptsPerMXN);

        if (store.settings.autoCreditRewards) {
          refStatus = 'credited';
          if (store.settings.referralRewardType === 'cashback' || store.settings.referralRewardType === 'both') {
            referrerUser.balanceCents += refCashbackCents;
            referrerUser.referralEarningsCents = (referrerUser.referralEarningsCents || 0) + refCashbackCents;
            const refMov: BalanceMovement = {
              id: generateMovementCode(),
              userId: referrerUser.id,
              adminId: null,
              type: 'referral_cashback',
              amountCents: refCashbackCents,
              balanceAfterCents: referrerUser.balanceCents,
              reference: orderId,
              reason: `Comisión automática por compra de referido ${user.name} (${product.title})`,
              orderId,
              referralCode: referrerUser.referralCode || referrerUser.customerCode,
              createdAt: now,
            };
            store.balanceMovements.push(refMov);
          }
          if (store.settings.referralRewardType === 'points' || store.settings.referralRewardType === 'both') {
            referrerUser.referralPoints = (referrerUser.referralPoints || 0) + refPoints;
          }
          if (!store.referralRewards) store.referralRewards = [];
          store.referralRewards.unshift({
            id: 'REF-REW-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            referrerUserId: referrerUser.id,
            referrerName: referrerUser.name,
            referrerCode: referrerUser.referralCode || referrerUser.customerCode,
            referredUserId: user.id,
            referredUserName: user.name,
            referredCustomerCode: user.customerCode,
            sourceType: 'purchase',
            sourceId: orderId,
            sourceAmountCents: product.priceCents,
            rewardType: store.settings.referralRewardType === 'points' ? 'points' : 'cashback',
            pointsEarned: refPoints,
            cashbackCents: refCashbackCents,
            commissionPercentage: commRate,
            status: 'approved',
            notes: `Comisión acreditada automáticamente por compra: ${product.title}`,
            createdAt: now,
            processedAt: now,
          });
        } else {
          // Manual generation by admin from panel as requested by user
          refStatus = 'pending';
          if (!store.referralRewards) store.referralRewards = [];
          store.referralRewards.unshift({
            id: 'REF-REW-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
            referrerUserId: referrerUser.id,
            referrerName: referrerUser.name,
            referrerCode: referrerUser.referralCode || referrerUser.customerCode,
            referredUserId: user.id,
            referredUserName: user.name,
            referredCustomerCode: user.customerCode,
            sourceType: 'purchase',
            sourceId: orderId,
            sourceAmountCents: product.priceCents,
            rewardType: store.settings.referralRewardType === 'points' ? 'points' : 'cashback',
            pointsEarned: refPoints,
            cashbackCents: refCashbackCents,
            commissionPercentage: commRate,
            status: 'pending',
            notes: `Pendiente de generar por admin: Compra de ${product.title}`,
            createdAt: now,
          });
        }
      }

      let stockUnitId: string | null = null;
      let inventoryAccountId: string | null = null;
      let slotNumber: number | null = null;
      let deliveredContentEncrypted: string | null = null;
      let orderStatus: Order['status'] = 'pending_activation';
      let deliveryTimestamp: string | null = null;
      let warrantyExpiresAt: string | null = null;

      if (product.deliveryMode === 'automatic') {
        // Priority 1: Find oldest active inventory account with available slots (FIFO)
        const availableAccounts = (store.inventoryAccounts || [])
          .filter(a => a.productId === product.id && a.status === 'active' && a.consumedSlots < a.totalSlots)
          .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

        if (availableAccounts.length > 0) {
          const account = availableAccounts[0];
          account.consumedSlots += 1;
          const assignedSlot = account.consumedSlots;
          if (account.consumedSlots >= account.totalSlots) {
            account.status = 'exhausted';
          }
          account.updatedAt = now;

          inventoryAccountId = account.id;
          slotNumber = assignedSlot;
          deliveredContentEncrypted = account.encryptedCredentials;
          orderStatus = 'completed';
          deliveryTimestamp = now;

          const expDate = new Date(Date.now() + product.warrantyDays * 24 * 60 * 60 * 1000);
          warrantyExpiresAt = expDate.toISOString();
        } else {
          // Priority 2: Check legacy stock units fallback
          const availableUnit = (store.stockUnits || []).find(
            u => u.productId === product.id && u.status === 'available'
          );

          if (!availableUnit) {
            throw new Error('No hay existencias disponibles para entrega automática de este producto.');
          }

          // Atomically claim unit
          availableUnit.status = 'delivered';
          availableUnit.orderId = orderId;
          availableUnit.deliveredAt = now;

          stockUnitId = availableUnit.id;
          deliveredContentEncrypted = availableUnit.encryptedContent;
          orderStatus = 'completed';
          deliveryTimestamp = now;

          const expDate = new Date(Date.now() + product.warrantyDays * 24 * 60 * 60 * 1000);
          warrantyExpiresAt = expDate.toISOString();
        }
      } else {
        // Email activation mode
        const cleanTargetEmail = String(targetEmail || '').trim().toLowerCase();
        if (!cleanTargetEmail || !cleanTargetEmail.includes('@')) {
          throw new Error('Debes ingresar un correo electrónico válido para la activación.');
        }

        const currentStock = product.manualStockCount || 0;
        if (currentStock <= 0) {
          throw new Error('No hay existencias disponibles para activación por correo de este producto.');
        }

        // Decrement manual stock
        product.manualStockCount = currentStock - 1;
        orderStatus = 'pending_activation';
        // Warranty will start once admin completes activation!
      }

      // Lock product presentation once sold
      product.hasSold = true;

      // 4. Deduct balance atomically
      user.balanceCents -= product.priceCents;

      // 5. Create immutable snapshot
      const productSnapshot: OrderProductSnapshot = {
        title: product.title,
        category: product.category,
        description: product.description,
        priceCents: product.priceCents,
        deliveryMode: product.deliveryMode,
        presentation: product.presentation || 'full_account',
        imageUrl: product.imageUrl || null,
        warrantyDays: product.warrantyDays,
        warrantyConditions: product.warrantyConditions,
      };

      // 6. Create Order
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        productId: product.id,
        inventoryAccountId,
        slotNumber,
        productSnapshot,
        priceCents: product.priceCents,
        status: orderStatus,
        deliveryMode: product.deliveryMode,
        presentation: product.presentation || 'full_account',
        targetEmail: product.deliveryMode === 'email_activation' ? String(targetEmail).trim().toLowerCase() : null,
        stockUnitId,
        originalDeliveredCredentialsEncrypted: deliveredContentEncrypted,
        deliveredContentEncrypted,
        deliveryTimestamp,
        warrantyExpiresAt,
        warrantyStatus: orderStatus === 'completed' ? 'active' : 'none',
        referralCodeApplied: referrerUser ? (referrerUser.referralCode || referrerUser.customerCode) : null,
        referrerUserId: referrerUser ? referrerUser.id : null,
        referrerName: referrerUser ? referrerUser.name : null,
        referralRewardStatus: refStatus,
        referralCashbackCents: refCashbackCents,
        referralPoints: refPoints,
        createdAt: now,
        updatedAt: now,
      };

      // 7. Record Balance Movement
      const movement: BalanceMovement = {
        id: generateMovementCode(),
        userId: user.id,
        adminId: null,
        type: 'purchase',
        amountCents: -product.priceCents,
        balanceAfterCents: user.balanceCents,
        reference: orderId,
        reason: `Compra de producto: ${product.title}`,
        orderId,
        createdAt: now,
      };

      store.orders.unshift(newOrder);
      store.balanceMovements.push(movement);

      return { order: newOrder, newBalanceCents: user.balanceCents };
    });

    res.json({
      success: true,
      order: result.order,
      balanceCents: result.newBalanceCents,
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || 'Error al procesar la compra.' });
  }
});

// List orders (Client sees own, Admin sees all)
apiRouter.get('/orders', requireAuth, async (req: AuthenticatedRequest, res) => {
  const store = await getStore();
  const isAdmin = req.user!.role === 'admin';

  let orders = store.orders;
  if (!isAdmin) {
    orders = orders.filter(o => o.userId === req.user!.id);
  }

  // Update expired warranties on the fly if needed
  const now = new Date();
  orders.forEach(o => {
    if (o.status === 'completed' && o.warrantyStatus === 'active' && o.warrantyExpiresAt) {
      if (new Date(o.warrantyExpiresAt) < now) {
        o.warrantyStatus = 'expired';
      }
    }
  });

  const enriched = orders.map(ord => {
    const owner = store.users.find(u => u.id === ord.userId);
    // Don't send encrypted string in general list
    const { deliveredContentEncrypted, ...safeOrder } = ord;
    return {
      ...safeOrder,
      hasDeliveredContent: Boolean(deliveredContentEncrypted),
      customerName: owner?.name,
      customerEmail: owner?.email,
      customerCode: owner?.customerCode,
    };
  });

  res.json(enriched);
});

// Decrypt credentials for authorized order (Buyer or Admin)
apiRouter.get('/orders/:id/credentials', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const store = await getStore();
  const order = store.orders.find(o => o.id === id);

  if (!order) {
    return res.status(404).json({ error: 'Pedido no encontrado.' });
  }

  const isOwner = req.user!.id === order.userId;
  const isAdmin = req.user!.role === 'admin';

  if (!isOwner && !isAdmin) {
    return res.status(403).json({ error: 'No tienes permiso para ver las credenciales de este pedido.' });
  }

  if (!order.deliveredContentEncrypted) {
    return res.json({ 
      content: null, 
      status: order.status, 
      notes: order.activationNotes || 'Activación pendiente de procesar por el administrador.' 
    });
  }

  const decrypted = decryptCredential(order.deliveredContentEncrypted);

  let isCredentialsUpdated = false;
  let credentialsUpdateNotes: string | null = null;
  if (order.inventoryAccountId) {
    const acc = (store.inventoryAccounts || []).find(a => a.id === order.inventoryAccountId);
    if (acc && acc.credentialUpdates && acc.credentialUpdates.length > 0) {
      isCredentialsUpdated = true;
      credentialsUpdateNotes = acc.credentialUpdates[acc.credentialUpdates.length - 1].notes;
    }
  }

  res.json({
    content: decrypted,
    status: order.status,
    slotNumber: order.slotNumber || null,
    activationNotes: order.activationNotes,
    deliveryTimestamp: order.deliveryTimestamp,
    warrantyExpiresAt: order.warrantyExpiresAt,
    isCredentialsUpdated,
    credentialsUpdateNotes,
  });
});

// Admin completes email activation
apiRouter.post('/admin/orders/:id/complete-activation', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { activationNotes, deliveredCredentials } = req.body;

  try {
    const updated = await runTransaction(store => {
      const order = store.orders.find(o => o.id === id);
      if (!order) throw new Error('Pedido no encontrado.');

      if (order.status !== 'pending_activation') {
        throw new Error('Solo se pueden completar pedidos en estado pendiente.');
      }

      const now = new Date();
      order.status = 'completed';
      order.activationNotes = activationNotes ? String(activationNotes).trim() : 'Activación completada con éxito.';
      order.deliveryTimestamp = now.toISOString();

      if (deliveredCredentials) {
        order.deliveredContentEncrypted = encryptCredential(String(deliveredCredentials).trim());
      }

      // Warranty starts NOW upon activation
      const warrantyDays = order.productSnapshot.warrantyDays || 30;
      const expDate = new Date(now.getTime() + warrantyDays * 24 * 60 * 60 * 1000);
      order.warrantyExpiresAt = expDate.toISOString();
      order.warrantyStatus = 'active';
      order.updatedAt = now.toISOString();

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'activation_completed',
        targetType: 'order',
        targetId: order.id,
        details: { targetEmail: order.targetEmail },
        createdAt: now.toISOString(),
      });

      return order;
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin cancels pending order and refunds client balance once
apiRouter.post('/admin/orders/:id/cancel-and-refund', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  if (!reason || !String(reason).trim()) {
    return res.status(400).json({ error: 'Debes especificar el motivo de la cancelación y reembolso.' });
  }

  const cleanReason = String(reason).trim();

  try {
    const result = await runTransaction(store => {
      const order = store.orders.find(o => o.id === id);
      if (!order) throw new Error('Pedido no encontrado.');

      if (order.status === 'cancelled' || order.warrantyStatus === 'refunded') {
        throw new Error('Este pedido ya ha sido cancelado o reembolsado anteriormente.');
      }

      const user = store.users.find(u => u.id === order.userId);
      if (!user) throw new Error('Cliente del pedido no encontrado.');

      const now = new Date().toISOString();

      // Refund to internal balance
      user.balanceCents += order.priceCents;

      // Restore manual stock if it was email activation
      if (order.deliveryMode === 'email_activation') {
        const prod = store.products.find(p => p.id === order.productId);
        if (prod && prod.manualStockCount != null) {
          prod.manualStockCount += 1;
        }
      }

      order.status = 'cancelled';
      order.warrantyStatus = 'refunded';
      order.activationNotes = `Cancelado por administrador: ${cleanReason}`;
      order.updatedAt = now;

      // Record refund movement
      const movement: BalanceMovement = {
        id: generateMovementCode(),
        userId: user.id,
        adminId: req.user!.id,
        type: 'refund',
        amountCents: order.priceCents,
        balanceAfterCents: user.balanceCents,
        reference: order.id,
        reason: `Reembolso por cancelación de pedido: ${cleanReason}`,
        orderId: order.id,
        createdAt: now,
      };

      store.balanceMovements.push(movement);

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'order_cancelled_refunded',
        targetType: 'order',
        targetId: order.id,
        details: { reason: cleanReason, refundedCents: order.priceCents },
        createdAt: now,
      });

      return { order, userBalanceCents: user.balanceCents };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 7. WARRANTY CASES & RESOLUTIONS
// ==========================================

// Create warranty case from an active order
apiRouter.post('/warranty/cases', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { orderId, subject, description } = req.body;

  if (!orderId || !subject || !description) {
    return res.status(400).json({ error: 'Pedido, asunto y descripción del problema requeridos.' });
  }

  try {
    const newCase = await runTransaction(store => {
      const order = store.orders.find(o => o.id === orderId);
      if (!order) throw new Error('Pedido no encontrado.');

      if (order.userId !== req.user!.id && req.user!.role !== 'admin') {
        throw new Error('No puedes abrir garantía de un pedido que no te pertenece.');
      }

      if (order.status !== 'completed') {
        throw new Error('Solo se puede solicitar garantía para pedidos completados.');
      }

      if (order.warrantyStatus === 'refunded') {
        throw new Error('Este pedido ya fue reembolsado anteriormente.');
      }

      // Check warranty expiration
      if (!order.warrantyExpiresAt || new Date(order.warrantyExpiresAt) < new Date()) {
        throw new Error('La garantía para este pedido ha vencido.');
      }

      // Check for already open case
      const existingOpen = store.warrantyCases.find(
        c => c.orderId === orderId && (c.status === 'open' || c.status === 'in_review')
      );
      if (existingOpen) {
        throw new Error('Ya existe un caso de garantía en trámite para este pedido.');
      }

      const now = new Date().toISOString();
      const caseItem: WarrantyCase = {
        id: generateCaseCode(),
        orderId,
        userId: order.userId,
        status: 'open',
        subject: String(subject).trim(),
        initialDescription: String(description).trim(),
        messages: [
          {
            id: 'msg_' + Date.now(),
            senderRole: req.user!.role,
            senderName: req.user!.name,
            message: String(description).trim(),
            timestamp: now,
          }
        ],
        createdAt: now,
        updatedAt: now,
      };

      order.warrantyStatus = 'claimed';
      store.warrantyCases.unshift(caseItem);
      return caseItem;
    });

    res.json(newCase);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// List warranty cases
apiRouter.get('/warranty/cases', requireAuth, async (req: AuthenticatedRequest, res) => {
  const store = await getStore();
  const isAdmin = req.user!.role === 'admin';

  let cases = store.warrantyCases;
  if (!isAdmin) {
    cases = cases.filter(c => c.userId === req.user!.id);
  }

  const enriched = cases.map(c => {
    const order = store.orders.find(o => o.id === c.orderId);
    const user = store.users.find(u => u.id === c.userId);
    return {
      ...c,
      productTitle: order?.productSnapshot?.title,
      customerName: user?.name,
      customerEmail: user?.email,
      customerCode: user?.customerCode,
      orderPriceCents: order?.priceCents,
      warrantyExpiresAt: order?.warrantyExpiresAt,
    };
  });

  res.json(enriched);
});

// Post a message in a warranty case
apiRouter.post('/warranty/cases/:id/messages', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { message } = req.body;

  if (!message || !String(message).trim()) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
  }

  try {
    const updated = await runTransaction(store => {
      const c = store.warrantyCases.find(item => item.id === id);
      if (!c) throw new Error('Caso de garantía no encontrado.');

      if (c.userId !== req.user!.id && req.user!.role !== 'admin') {
        throw new Error('No tienes acceso a este caso de garantía.');
      }

      const now = new Date().toISOString();
      c.messages.push({
        id: 'msg_' + Date.now(),
        senderRole: req.user!.role,
        senderName: req.user!.name,
        message: String(message).trim(),
        timestamp: now,
      });

      if (c.status === 'open' && req.user!.role === 'admin') {
        c.status = 'in_review';
      }

      c.updatedAt = now;
      return c;
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin resolves warranty case (Replacement, New Activation, Refund, or Justified Rejection)
apiRouter.post('/admin/warranty/cases/:id/resolve', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { resolutionType, notes, replacementCredential } = req.body;

  if (!resolutionType || !notes) {
    return res.status(400).json({ error: 'Se requiere el tipo de resolución y notas explicativas.' });
  }

  const cleanNotes = String(notes).trim();
  const now = new Date().toISOString();

  try {
    const result = await runTransaction(async store => {
      const c = store.warrantyCases.find(item => item.id === id);
      if (!c) throw new Error('Caso de garantía no encontrado.');

      const order = store.orders.find(o => o.id === c.orderId);
      if (!order) throw new Error('Pedido vinculado no encontrado.');

      const user = store.users.find(u => u.id === order.userId);
      if (!user) throw new Error('Cliente del pedido no encontrado.');

      // 1. REPLACEMENT
      if (resolutionType === 'replacement') {
        // Mark previous unit as defective if legacy
        if (order.stockUnitId) {
          const prevUnit = (store.stockUnits || []).find(u => u.id === order.stockUnitId);
          if (prevUnit) {
            prevUnit.status = 'defective';
            prevUnit.defectiveReason = `Reemplazado por garantía en caso ${c.id}: ${cleanNotes}`;
          }
        }

        // Check if there is an active inventory account with free slots for this product
        const nextAccount = (store.inventoryAccounts || []).find(
          a => a.productId === order.productId && a.status === 'active' && a.consumedSlots < a.totalSlots
        );

        let newEncryptedContent: string;
        let newStockUnitId: string | null = null;
        let repAccountId: string | null = null;
        let repSlotNum: number | null = null;

        if (nextAccount) {
          nextAccount.consumedSlots += 1;
          repSlotNum = nextAccount.consumedSlots;
          if (nextAccount.consumedSlots >= nextAccount.totalSlots) {
            nextAccount.status = 'exhausted';
          }
          nextAccount.updatedAt = now;
          repAccountId = nextAccount.id;
          newEncryptedContent = nextAccount.encryptedCredentials;
        } else {
          // Fallback to legacy units
          let newStockUnit = (store.stockUnits || []).find(
            u => u.productId === order.productId && u.status === 'available'
          );

          if (newStockUnit) {
            newStockUnit.status = 'delivered';
            newStockUnit.orderId = order.id;
            newStockUnit.deliveredAt = now;
            newStockUnitId = newStockUnit.id;
            newEncryptedContent = newStockUnit.encryptedContent;
          } else if (replacementCredential) {
            newEncryptedContent = encryptCredential(String(replacementCredential).trim());
          } else {
            throw new Error('No hay cupos disponibles en inventario para realizar el reemplazo automático.');
          }
        }

        // Conserve original expiration date and link replacement!
        order.stockUnitId = newStockUnitId;
        order.replacementAccountId = repAccountId;
        order.replacementSlotNumber = repSlotNum;
        order.deliveredContentEncrypted = newEncryptedContent;
        order.activationNotes = `[Reemplazo de garantía el ${new Date().toLocaleDateString('es-MX')}]: ${cleanNotes}`;
        order.warrantyStatus = 'active'; // Returns to active under original warranty period
        order.updatedAt = now;

        c.status = 'resolved_replacement';
        c.resolutionNotes = cleanNotes;
        c.resolvedAt = now;
        c.resolvedBy = req.user!.id;
      } 
      // 2. NEW ACTIVATION
      else if (resolutionType === 'new_activation') {
        order.activationNotes = `[Reactivación por garantía]: ${cleanNotes}`;
        if (replacementCredential) {
          order.deliveredContentEncrypted = encryptCredential(String(replacementCredential).trim());
        }
        order.warrantyStatus = 'active';
        order.updatedAt = now;

        c.status = 'resolved_activation';
        c.resolutionNotes = cleanNotes;
        c.resolvedAt = now;
        c.resolvedBy = req.user!.id;
      }
      // 3. REFUND TO INTERNAL BALANCE
      else if (resolutionType === 'refund') {
        if (order.warrantyStatus === 'refunded') {
          throw new Error('Este pedido ya fue reembolsado previamente.');
        }

        user.balanceCents += order.priceCents;
        order.warrantyStatus = 'refunded';
        order.updatedAt = now;

        const movement: BalanceMovement = {
          id: generateMovementCode(),
          userId: user.id,
          adminId: req.user!.id,
          type: 'refund',
          amountCents: order.priceCents,
          balanceAfterCents: user.balanceCents,
          reference: c.id,
          reason: `Reembolso por resolución de garantía ${c.id}: ${cleanNotes}`,
          orderId: order.id,
          createdAt: now,
        };

        store.balanceMovements.push(movement);

        c.status = 'resolved_refund';
        c.resolutionNotes = cleanNotes;
        c.resolvedAt = now;
        c.resolvedBy = req.user!.id;
      } 
      // 4. JUSTIFIED REJECTION
      else if (resolutionType === 'rejected') {
        // Return order to active or expired
        if (order.warrantyExpiresAt && new Date(order.warrantyExpiresAt) < new Date()) {
          order.warrantyStatus = 'expired';
        } else {
          order.warrantyStatus = 'active';
        }
        order.updatedAt = now;

        c.status = 'rejected';
        c.resolutionNotes = cleanNotes;
        c.resolvedAt = now;
        c.resolvedBy = req.user!.id;
      } else {
        throw new Error('Tipo de resolución desconocido.');
      }

      // Add system message to the case chat
      c.messages.push({
        id: 'msg_' + Date.now(),
        senderRole: 'admin',
        senderName: req.user!.name,
        message: `[Caso Resuelto: ${resolutionType.toUpperCase()}] ${cleanNotes}`,
        timestamp: now,
      });

      return { c, order };
    });

    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 8. USERS MANAGEMENT (ADMIN)
// ==========================================

apiRouter.get('/admin/users', requireAdmin, async (_req, res) => {
  const store = await getStore();
  const usersWithStats = store.users.map(u => {
    const { passwordHash, passwordSalt, ...safeUser } = u;
    const userOrders = store.orders.filter(o => o.userId === u.id);
    return {
      ...safeUser,
      ordersCount: userOrders.length,
      totalSpentCents: userOrders.reduce((sum, o) => sum + (o.status !== 'cancelled' ? o.priceCents : 0), 0),
    };
  });
  res.json(usersWithStats);
});

apiRouter.post('/admin/users/:id/toggle-status', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await runTransaction(store => {
      const user = store.users.find(u => u.id === id);
      if (!user) throw new Error('Usuario no encontrado.');
      if (user.role === 'admin') throw new Error('No se puede suspender a un administrador.');

      user.status = user.status === 'active' ? 'suspended' : 'active';
      user.updatedAt = new Date().toISOString();

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'user_status_changed',
        targetType: 'user',
        targetId: user.id,
        details: { newStatus: user.status },
        createdAt: new Date().toISOString(),
      });

      const { passwordHash, passwordSalt, ...safeUser } = user;
      return safeUser;
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// 9. BACKUP & RESTORE (ADMIN)
// ==========================================

apiRouter.get('/admin/backup', requireAdmin, async (_req, res) => {
  const backup = await backupStore();
  // Clear sessions for backup export
  const cleanBackup = { ...backup, sessions: {} };
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename=privakey_backup_${Date.now()}.json`);
  res.json(cleanBackup);
});

apiRouter.post('/admin/restore', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const backupData = req.body;
  if (!backupData || !backupData.settings || !backupData.users || !backupData.products) {
    return res.status(400).json({ error: 'Estructura de copia de seguridad no válida.' });
  }

  try {
    await restoreStore(backupData);
    res.json({ success: true, message: 'Base de datos restaurada correctamente desde la copia de seguridad.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 10. REFERRAL PROGRAM (CLIENT & ADMIN)
// ==========================================

// Client: My referral stats, code, points, history, and referred friends
apiRouter.get('/referrals/my-stats', requireAuth, async (req: AuthenticatedRequest, res) => {
  const store = await getStore();
  const user = store.users.find(u => u.id === req.user!.id);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

  const referralCode = user.referralCode || user.customerCode;
  const referredFriends = store.users
    .filter(u => u.referredByUserId === user.id || (u.referredByCode && u.referredByCode.toUpperCase() === referralCode.toUpperCase()))
    .map(u => {
      const orders = store.orders.filter(o => o.userId === u.id && o.status !== 'cancelled');
      const totalSpent = orders.reduce((sum, o) => sum + o.priceCents, 0);
      return {
        id: u.id,
        name: u.name,
        customerCode: u.customerCode,
        createdAt: u.createdAt,
        ordersCount: orders.length,
        totalSpentCents: totalSpent,
      };
    });

  const myRewards = (store.referralRewards || [])
    .filter(r => r.referrerUserId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Also check if user was referred by someone
  let referrerInfo = null;
  if (user.referredByCode || user.referredByUserId) {
    const ref = store.users.find(u => u.id === user.referredByUserId || (user.referredByCode && (u.referralCode === user.referredByCode || u.customerCode === user.referredByCode)));
    if (ref) {
      referrerInfo = {
        name: ref.name,
        code: ref.referralCode || ref.customerCode,
      };
    }
  }

  res.json({
    referralCode,
    pointsBalance: user.referralPoints || 0,
    earningsCents: user.referralEarningsCents || 0,
    currentBalanceCents: user.balanceCents,
    referredFriendsCount: referredFriends.length,
    referredFriends,
    rewardsHistory: myRewards,
    referrerInfo,
    settings: {
      referralProgramEnabled: store.settings.referralProgramEnabled !== false,
      referralCommissionRate: store.settings.referralCommissionRate || 5,
      referralPointsPerMXN: store.settings.referralPointsPerMXN || 1,
      referralRewardType: store.settings.referralRewardType || 'both',
      pointsExchangeRateCents: store.settings.pointsExchangeRateCents || 10,
    },
  });
});

// Client/General: Validate referral code
apiRouter.post('/referrals/validate-code', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Código requerido.' });

  const cleanCode = String(code).trim().toUpperCase();
  const store = await getStore();
  const referrer = store.users.find(u => 
    (u.referralCode?.toUpperCase() === cleanCode || u.customerCode?.toUpperCase() === cleanCode) &&
    u.status === 'active'
  );

  if (!referrer) {
    return res.status(404).json({ valid: false, error: 'Código de referido no encontrado o inactivo.' });
  }

  if (referrer.id === req.user!.id) {
    return res.status(400).json({ valid: false, error: 'No puedes usar tu propio código de referido.' });
  }

  res.json({
    valid: true,
    referrerName: referrer.name,
    referrerCode: referrer.referralCode || referrer.customerCode,
    commissionRate: store.settings.referralCommissionRate || 5,
    rewardType: store.settings.referralRewardType || 'both',
  });
});

// Client: Bind referral code to current profile
apiRouter.post('/referrals/bind', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { code } = req.body;
  if (!code) return res.status(400).json({ error: 'Código requerido.' });

  const cleanCode = String(code).trim().toUpperCase();

  try {
    const updatedUser = await runTransaction(store => {
      const user = store.users.find(u => u.id === req.user!.id);
      if (!user) throw new Error('Usuario no encontrado.');

      if (user.referredByCode) {
        throw new Error(`Ya tienes vinculado el código de referido ${user.referredByCode}.`);
      }

      const referrer = store.users.find(u => 
        (u.referralCode?.toUpperCase() === cleanCode || u.customerCode?.toUpperCase() === cleanCode) &&
        u.status === 'active'
      );

      if (!referrer) {
        throw new Error('El código de referido proporcionado no existe.');
      }

      if (referrer.id === user.id) {
        throw new Error('No puedes vincular tu propio código de referido.');
      }

      user.referredByCode = referrer.referralCode || referrer.customerCode;
      user.referredByUserId = referrer.id;
      user.updatedAt = new Date().toISOString();

      const { passwordHash, passwordSalt, ...safeUser } = user;
      return safeUser;
    });

    res.json({ success: true, user: updatedUser });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Client: Redeem points for store balance
apiRouter.post('/referrals/redeem-points', requireAuth, async (req: AuthenticatedRequest, res) => {
  const { points } = req.body;
  const pts = Math.round(Number(points));
  if (!pts || pts <= 0) {
    return res.status(400).json({ error: 'Debes indicar una cantidad válida de puntos a canjear.' });
  }

  try {
    const result = await runTransaction(store => {
      const user = store.users.find(u => u.id === req.user!.id);
      if (!user) throw new Error('Usuario no encontrado.');

      const currentPoints = user.referralPoints || 0;
      if (currentPoints < pts) {
        throw new Error(`Puntos insuficientes. Tienes ${currentPoints} puntos disponibles e intentaste canjear ${pts}.`);
      }

      const rateCents = store.settings.pointsExchangeRateCents || 10; // 10 cents per point
      const creditCents = pts * rateCents;

      user.referralPoints = currentPoints - pts;
      user.balanceCents += creditCents;

      const now = new Date().toISOString();
      const movement: BalanceMovement = {
        id: generateMovementCode(),
        userId: user.id,
        adminId: null,
        type: 'points_redemption',
        amountCents: creditCents,
        balanceAfterCents: user.balanceCents,
        reference: `PTS-${pts}`,
        reason: `Canje de ${pts} puntos del programa de referidos por saldo de compra`,
        createdAt: now,
      };

      store.balanceMovements.push(movement);

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: user.id,
        adminName: user.name,
        action: 'referral_points_redeemed',
        targetType: 'user',
        targetId: user.id,
        details: { points: pts, creditedCents: creditCents },
        createdAt: now,
      });

      return {
        balanceCents: user.balanceCents,
        remainingPoints: user.referralPoints,
        creditedCents: creditCents,
      };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Referral Overview & Network
apiRouter.get('/admin/referrals/overview', requireAdmin, async (_req, res) => {
  const store = await getStore();
  const allUsers = store.users;
  const rewards = (store.referralRewards || []).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Aggregate stats per referrer
  const referrersMap = new Map<string, {
    user: any;
    referralCode: string;
    referredCount: number;
    pointsTotal: number;
    cashbackTotalCents: number;
    pendingCount: number;
    referredUsersDetails: Array<{
      id: string;
      name: string;
      email: string;
      customerCode: string;
      createdAt: string;
      ordersCount: number;
      totalSpentCents: number;
      orders: Array<{
        id: string;
        productTitle: string;
        priceCents: number;
        status: string;
        createdAt: string;
        referralRewardStatus?: string;
      }>;
    }>;
  }>();

  allUsers.forEach(u => {
    if (u.role === 'admin') return;
    const code = u.referralCode || u.customerCode;
    const referredUsers = allUsers.filter(other => other.referredByUserId === u.id || (other.referredByCode && other.referredByCode.toUpperCase() === code.toUpperCase()));
    const userRewards = rewards.filter(r => r.referrerUserId === u.id);
    const cashback = userRewards.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.cashbackCents, 0);
    const points = u.referralPoints || 0;
    const pending = userRewards.filter(r => r.status === 'pending').length;

    if (referredUsers.length > 0 || userRewards.length > 0 || points > 0 || cashback > 0) {
      const { passwordHash, passwordSalt, ...safeUser } = u;
      
      const referredUsersDetails = referredUsers.map(ru => {
        const ruOrders = (store.orders || []).filter(o => o.userId === ru.id);
        const ruSpentCents = ruOrders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.priceCents, 0);
        return {
          id: ru.id,
          name: ru.name,
          email: ru.email,
          customerCode: ru.customerCode,
          createdAt: ru.createdAt,
          ordersCount: ruOrders.length,
          totalSpentCents: ruSpentCents,
          orders: ruOrders.map(o => ({
            id: o.id,
            productTitle: o.productSnapshot?.title || 'Producto digital',
            priceCents: o.priceCents,
            status: o.status,
            createdAt: o.createdAt,
            referralRewardStatus: o.referralRewardStatus || 'pending',
          })),
        };
      });

      referrersMap.set(u.id, {
        user: safeUser,
        referralCode: code,
        referredCount: referredUsers.length,
        pointsTotal: points,
        cashbackTotalCents: cashback,
        pendingCount: pending,
        referredUsersDetails,
      });
    }
  });

  const totalCashbackCents = rewards.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.cashbackCents, 0);
  const totalPointsGranted = rewards.filter(r => r.status === 'approved').reduce((sum, r) => sum + r.pointsEarned, 0);
  const totalPendingRewards = rewards.filter(r => r.status === 'pending').length;

  res.json({
    referrers: Array.from(referrersMap.values()),
    rewards,
    stats: {
      totalReferrersCount: referrersMap.size,
      totalReferredUsersCount: allUsers.filter(u => Boolean(u.referredByCode || u.referredByUserId)).length,
      totalCashbackCents,
      totalPointsGranted,
      totalPendingRewards,
    },
    settings: {
      referralProgramEnabled: store.settings.referralProgramEnabled !== false,
      referralCommissionRate: store.settings.referralCommissionRate || 5,
      referralPointsPerMXN: store.settings.referralPointsPerMXN || 1,
      referralRewardType: store.settings.referralRewardType || 'both',
      pointsExchangeRateCents: store.settings.pointsExchangeRateCents || 10,
      autoCreditRewards: Boolean(store.settings.autoCreditRewards),
    },
  });
});

// Admin: Generate cashback or points reward for a referrer (from purchase, recharge, or manual)
apiRouter.post('/admin/referrals/generate-reward', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const {
    referrerUserId,
    rewardType, // 'cashback' | 'points' | 'both'
    amountCents, // if cashback or both
    points, // if points or both
    commissionPercentage,
    sourceAmountCents,
    reason,
    sourceType, // 'purchase' | 'recharge' | 'manual'
    sourceId,
    referredUserId,
    pendingRewardId,
  } = req.body;

  if (!referrerUserId || !rewardType || !reason) {
    return res.status(400).json({ error: 'Faltan datos obligatorios: referente, tipo de recompensa y motivo.' });
  }

  const givesCash = rewardType === 'cashback' || rewardType === 'both';
  const givesPoints = rewardType === 'points' || rewardType === 'both';
  const cashCents = givesCash ? Math.max(0, Math.round(Number(amountCents || 0))) : 0;
  const ptsCount = givesPoints ? Math.max(0, Math.round(Number(points || 0))) : 0;

  if (givesCash && cashCents <= 0 && (!givesPoints || ptsCount <= 0)) {
    return res.status(400).json({ error: 'Debes indicar un monto en MXN mayor a cero para el cashback.' });
  }
  if (givesPoints && ptsCount <= 0 && (!givesCash || cashCents <= 0)) {
    return res.status(400).json({ error: 'Debes indicar una cantidad de puntos mayor a cero.' });
  }

  try {
    const result = await runTransaction(store => {
      const referrer = store.users.find(u => u.id === referrerUserId);
      if (!referrer) throw new Error('Usuario referente no encontrado.');

      let referredUser: User | undefined;
      if (referredUserId) {
        referredUser = store.users.find(u => u.id === referredUserId);
      }

      const now = new Date().toISOString();
      const cleanReason = String(reason).trim();
      const cleanSourceType = (sourceType as any) || 'manual';
      const cleanSourceId = sourceId ? String(sourceId).trim() : `MAN-${Date.now()}`;
      const commPct = commissionPercentage !== undefined ? Number(commissionPercentage) : undefined;
      const baseSourceCents = sourceAmountCents ? Number(sourceAmountCents) : undefined;

      if (cashCents > 0) {
        referrer.balanceCents += cashCents;
        referrer.referralEarningsCents = (referrer.referralEarningsCents || 0) + cashCents;

        const movement: BalanceMovement = {
          id: generateMovementCode(),
          userId: referrer.id,
          adminId: req.user!.id,
          type: 'referral_cashback',
          amountCents: cashCents,
          balanceAfterCents: referrer.balanceCents,
          reference: cleanSourceId,
          reason: `Cashback de referidos generado por administración: ${cleanReason}`,
          referralCode: referrer.referralCode || referrer.customerCode,
          createdAt: now,
        };
        store.balanceMovements.push(movement);
      }

      if (ptsCount > 0) {
        referrer.referralPoints = (referrer.referralPoints || 0) + ptsCount;
      }

      if (!store.referralRewards) store.referralRewards = [];

      let rewardRecord;
      if (pendingRewardId) {
        const existing = store.referralRewards.find(r => r.id === pendingRewardId);
        if (existing) {
          existing.status = 'approved';
          existing.processedAt = now;
          existing.processedByAdminId = req.user!.id;
          existing.notes = (existing.notes ? existing.notes + ' | ' : '') + cleanReason;
          if (cashCents > 0) existing.cashbackCents = cashCents;
          if (ptsCount > 0) existing.pointsEarned = ptsCount;
          if (commPct !== undefined) existing.commissionPercentage = commPct;
          existing.rewardType = (rewardType as any) || (cashCents > 0 && ptsCount > 0 ? 'both' : cashCents > 0 ? 'cashback' : 'points');
          rewardRecord = existing;
        }
      }

      if (!rewardRecord) {
        rewardRecord = {
          id: 'REF-REW-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          referrerUserId: referrer.id,
          referrerName: referrer.name,
          referrerCode: referrer.referralCode || referrer.customerCode,
          referredUserId: referredUser ? referredUser.id : null,
          referredUserName: referredUser ? referredUser.name : null,
          referredCustomerCode: referredUser ? referredUser.customerCode : null,
          sourceType: cleanSourceType,
          sourceId: cleanSourceId,
          sourceAmountCents: baseSourceCents || (cashCents > 0 ? cashCents : 0),
          rewardType: (rewardType as any) || (cashCents > 0 && ptsCount > 0 ? 'both' : cashCents > 0 ? 'cashback' : 'points'),
          pointsEarned: ptsCount,
          cashbackCents: cashCents,
          commissionPercentage: commPct,
          status: 'approved' as const,
          notes: cleanReason,
          createdAt: now,
          processedAt: now,
          processedByAdminId: req.user!.id,
        };
        store.referralRewards.unshift(rewardRecord);
      }

      // If source was an order, update its referralRewardStatus to credited
      if (cleanSourceType === 'purchase' && cleanSourceId) {
        const order = store.orders.find(o => o.id === cleanSourceId);
        if (order) {
          order.referralRewardStatus = 'credited';
          order.updatedAt = now;
        }
      }

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'referral_reward_generated',
        targetType: 'user',
        targetId: referrer.id,
        details: { 
          rewardType, 
          amountCents: cashCents, 
          points: ptsCount, 
          commissionPercentage: commPct, 
          reason: cleanReason, 
          rewardId: rewardRecord.id 
        },
        createdAt: now,
      });

      const { passwordHash, passwordSalt, ...safeReferrer } = referrer;
      return { reward: rewardRecord, referrer: safeReferrer };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Batch distribute rewards/points to referrers
apiRouter.post('/admin/referrals/batch-distribute', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const {
    rewardType, // 'cashback' | 'points' | 'both'
    amountCents,
    points,
    reason,
    minReferredCount = 1,
  } = req.body;

  if (!rewardType || !reason) {
    return res.status(400).json({ error: 'Tipo de recompensa y motivo son obligatorios.' });
  }

  const givesCash = rewardType === 'cashback' || rewardType === 'both';
  const givesPoints = rewardType === 'points' || rewardType === 'both';
  const cashCents = givesCash ? Math.max(0, Math.round(Number(amountCents || 0))) : 0;
  const ptsCount = givesPoints ? Math.max(0, Math.round(Number(points || 0))) : 0;

  if (cashCents <= 0 && ptsCount <= 0) {
    return res.status(400).json({ error: 'Debes indicar al menos un monto de cashback o puntos a otorgar.' });
  }

  try {
    const result = await runTransaction(store => {
      const now = new Date().toISOString();
      const allUsers = store.users;
      const cleanReason = String(reason).trim();
      const qualifyingReferrers: User[] = [];

      for (const u of allUsers) {
        if (u.role === 'admin') continue;
        const code = u.referralCode || u.customerCode;
        const referredFriends = allUsers.filter(other => other.referredByUserId === u.id || (other.referredByCode && other.referredByCode.toUpperCase() === code.toUpperCase()));
        if (referredFriends.length >= Number(minReferredCount)) {
          qualifyingReferrers.push(u);
        }
      }

      if (qualifyingReferrers.length === 0) {
        throw new Error(`No hay clientes que cumplan con el criterio mínimo de ${minReferredCount} amigos referidos.`);
      }

      if (!store.referralRewards) store.referralRewards = [];

      for (const referrer of qualifyingReferrers) {
        if (cashCents > 0) {
          referrer.balanceCents += cashCents;
          referrer.referralEarningsCents = (referrer.referralEarningsCents || 0) + cashCents;

          const movement: BalanceMovement = {
            id: generateMovementCode(),
            userId: referrer.id,
            adminId: req.user!.id,
            type: 'referral_cashback',
            amountCents: cashCents,
            balanceAfterCents: referrer.balanceCents,
            reference: `BATCH-${Date.now().toString(36)}`,
            reason: `Distribución masiva de recompensas: ${cleanReason}`,
            referralCode: referrer.referralCode || referrer.customerCode,
            createdAt: now,
          };
          store.balanceMovements.push(movement);
        }

        if (ptsCount > 0) {
          referrer.referralPoints = (referrer.referralPoints || 0) + ptsCount;
        }

        const rewardRecord: ReferralReward = {
          id: 'REF-REW-' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
          referrerUserId: referrer.id,
          referrerName: referrer.name,
          referrerCode: referrer.referralCode || referrer.customerCode,
          sourceType: 'manual',
          sourceId: `BATCH-${Date.now().toString(36)}`,
          sourceAmountCents: cashCents > 0 ? cashCents : 0,
          rewardType: (rewardType as any) || (cashCents > 0 && ptsCount > 0 ? 'both' : cashCents > 0 ? 'cashback' : 'points'),
          pointsEarned: ptsCount,
          cashbackCents: cashCents,
          status: 'approved',
          notes: cleanReason,
          createdAt: now,
          processedAt: now,
          processedByAdminId: req.user!.id,
        };
        store.referralRewards.unshift(rewardRecord);
      }

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'referral_batch_distribution',
        targetType: 'referrals',
        targetId: 'multiple',
        details: {
          beneficiariesCount: qualifyingReferrers.length,
          rewardType,
          amountCents: cashCents,
          points: ptsCount,
          reason: cleanReason,
        },
        createdAt: now,
      });

      return {
        distributedCount: qualifyingReferrers.length,
        totalCashbackDistributedCents: cashCents * qualifyingReferrers.length,
        totalPointsDistributed: ptsCount * qualifyingReferrers.length,
      };
    });

    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Reject pending referral reward
apiRouter.post('/admin/referrals/reject-reward/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { reason } = req.body;

  try {
    const updated = await runTransaction(store => {
      const reward = (store.referralRewards || []).find(r => r.id === id);
      if (!reward) throw new Error('Recompensa no encontrada.');
      if (reward.status !== 'pending') throw new Error('Solo se pueden rechazar recompensas en estado pendiente.');

      reward.status = 'rejected';
      reward.processedAt = new Date().toISOString();
      reward.processedByAdminId = req.user!.id;
      if (reason) {
        reward.notes = (reward.notes ? reward.notes + ' | ' : '') + `Rechazado: ${reason}`;
      }

      return reward;
    });

    res.json({ success: true, reward: updated });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Update referral program settings
apiRouter.put('/admin/referrals/settings', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const {
    referralProgramEnabled,
    referralCommissionRate,
    referralPointsPerMXN,
    referralRewardType,
    pointsExchangeRateCents,
    autoCreditRewards,
  } = req.body;

  try {
    const updatedSettings = await runTransaction(store => {
      if (referralProgramEnabled !== undefined) {
        store.settings.referralProgramEnabled = Boolean(referralProgramEnabled);
      }
      if (referralCommissionRate !== undefined) {
        store.settings.referralCommissionRate = Math.max(0, Math.min(100, Number(referralCommissionRate)));
      }
      if (referralPointsPerMXN !== undefined) {
        store.settings.referralPointsPerMXN = Math.max(0, Number(referralPointsPerMXN));
      }
      if (referralRewardType && ['cashback', 'points', 'both'].includes(referralRewardType)) {
        store.settings.referralRewardType = referralRewardType;
      }
      if (pointsExchangeRateCents !== undefined) {
        store.settings.pointsExchangeRateCents = Math.max(1, Number(pointsExchangeRateCents));
      }
      if (autoCreditRewards !== undefined) {
        store.settings.autoCreditRewards = Boolean(autoCreditRewards);
      }
      store.settings.updatedAt = new Date().toISOString();

      return store.settings;
    });

    res.json(updatedSettings);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ==========================================
// BANNERS & ANNOUNCEMENTS API
// ==========================================

// Get active banners for clients/public
apiRouter.get('/banners', async (_req, res) => {
  const store = await getStore();
  const banners = (store.infoBanners || [])
    .filter(b => b.active)
    .sort((a, b) => (a.priority || 99) - (b.priority || 99));
  res.json(banners);
});

// Admin: Get all banners
apiRouter.get('/admin/banners', requireAdmin, async (_req, res) => {
  const store = await getStore();
  const banners = (store.infoBanners || []).sort((a, b) => (a.priority || 99) - (b.priority || 99));
  res.json(banners);
});

// Admin: Create banner
apiRouter.post('/admin/banners', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { title, message, type, badgeText, active, priority, dismissible, linkUrl, linkText, iconName, targetAudience } = req.body;
  if (!title || !message) {
    return res.status(400).json({ error: 'Título y mensaje son obligatorios para el banner.' });
  }

  const now = new Date().toISOString();
  const newBanner: InfoBanner = {
    id: 'ban_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6),
    title: String(title).trim(),
    message: String(message).trim(),
    type: type || 'info',
    badgeText: badgeText ? String(badgeText).trim() : undefined,
    active: active !== undefined ? Boolean(active) : true,
    priority: Number(priority) || 1,
    dismissible: dismissible !== undefined ? Boolean(dismissible) : true,
    linkUrl: linkUrl ? String(linkUrl).trim() : undefined,
    linkText: linkText ? String(linkText).trim() : undefined,
    iconName: iconName ? String(iconName).trim() : undefined,
    targetAudience: targetAudience || 'all',
    createdAt: now,
    updatedAt: now,
  };

  const result = await runTransaction(store => {
    if (!store.infoBanners) store.infoBanners = [];
    store.infoBanners.unshift(newBanner);
    store.auditLogs.push({
      id: 'aud_' + Date.now(),
      adminId: req.user!.id,
      adminName: req.user!.name,
      action: 'banner_created',
      targetType: 'banner',
      targetId: newBanner.id,
      details: { title: newBanner.title, type: newBanner.type },
      createdAt: now,
    });
    return newBanner;
  });

  res.json(result);
});

// Admin: Update banner
apiRouter.put('/admin/banners/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const { title, message, type, badgeText, active, priority, dismissible, linkUrl, linkText, iconName, targetAudience } = req.body;

  try {
    const updated = await runTransaction(store => {
      const banner = (store.infoBanners || []).find(b => b.id === id);
      if (!banner) throw new Error('Banner no encontrado.');

      if (title !== undefined) banner.title = String(title).trim();
      if (message !== undefined) banner.message = String(message).trim();
      if (type !== undefined) banner.type = type;
      if (badgeText !== undefined) banner.badgeText = String(badgeText).trim();
      if (active !== undefined) banner.active = Boolean(active);
      if (priority !== undefined) banner.priority = Number(priority) || 1;
      if (dismissible !== undefined) banner.dismissible = Boolean(dismissible);
      if (linkUrl !== undefined) banner.linkUrl = linkUrl ? String(linkUrl).trim() : undefined;
      if (linkText !== undefined) banner.linkText = linkText ? String(linkText).trim() : undefined;
      if (iconName !== undefined) banner.iconName = iconName ? String(iconName).trim() : undefined;
      if (targetAudience !== undefined) banner.targetAudience = targetAudience;
      banner.updatedAt = new Date().toISOString();

      store.auditLogs.push({
        id: 'aud_' + Date.now(),
        adminId: req.user!.id,
        adminName: req.user!.name,
        action: 'banner_updated',
        targetType: 'banner',
        targetId: banner.id,
        details: { title: banner.title, active: banner.active },
        createdAt: new Date().toISOString(),
      });

      return banner;
    });

    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Toggle banner active
apiRouter.post('/admin/banners/:id/toggle', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    const updated = await runTransaction(store => {
      const banner = (store.infoBanners || []).find(b => b.id === id);
      if (!banner) throw new Error('Banner no encontrado.');
      banner.active = !banner.active;
      banner.updatedAt = new Date().toISOString();
      return banner;
    });
    res.json(updated);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Admin: Delete banner
apiRouter.delete('/admin/banners/:id', requireAdmin, async (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  try {
    await runTransaction(store => {
      const idx = (store.infoBanners || []).findIndex(b => b.id === id);
      if (idx === -1) throw new Error('Banner no encontrado.');
      store.infoBanners.splice(idx, 1);
    });
    res.json({ success: true, message: 'Banner eliminado correctamente.' });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

