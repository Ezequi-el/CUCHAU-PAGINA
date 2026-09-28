import fs from 'node:fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { 
  StoreData, 
  User, 
  Product, 
  InventoryAccount,
  StockUnit, 
  Order, 
  BalanceMovement, 
  WarrantyCase, 
  Invitation, 
  StoreSettings,
  InfoBanner 
} from './types.js';
import { 
  hashPassword, 
  encryptCredential, 
  generateCustomerCode, 
  generateInviteCode, 
  generateMovementCode,
  generateOrderCode,
  generateAccountId
} from './crypto.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '..', 'data');
const DB_FILE = path.join(DATA_DIR, 'store.json');

// In-memory cache of the store for maximum responsiveness
let inMemoryStore: StoreData | null = null;

// Async mutex lock queue to guarantee strict sequential transactional execution
let queuePromise = Promise.resolve();

function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const result = queuePromise.then(task, task);
  // Keep queue chain alive even on error
  queuePromise = result.then(() => {}, () => {});
  return result;
}

export async function initDb(): Promise<void> {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
    try {
      const content = await fs.readFile(DB_FILE, 'utf-8');
      inMemoryStore = JSON.parse(content);
      // Migrate if needed
      let mutated = false;
      if (!inMemoryStore!.inventoryAccounts) {
        inMemoryStore!.inventoryAccounts = [];
        mutated = true;
      }
      if (!inMemoryStore!.referralRewards) {
        inMemoryStore!.referralRewards = [];
        mutated = true;
      }
      if (!inMemoryStore!.infoBanners || inMemoryStore!.infoBanners.length === 0) {
        const nowIso = new Date().toISOString();
        inMemoryStore!.infoBanners = [
          {
            id: 'ban_referral_channel',
            title: 'Canal Exclusivo de Referidos en Telegram',
            message: '¿Ya estás en nuestro canal oficial de referidos? Únete ahora y recibe hasta 10% de descuento en tus compras, bonificaciones anticipadas y comisiones exclusivas por recomendar a tus amigos.',
            badgeText: 'Beneficio Exclusivo',
            type: 'referral',
            active: true,
            priority: 1,
            dismissible: true,
            linkUrl: 'https://t.me/PrivaKeySoporte',
            linkText: 'Unirme al Canal de Referidos',
            iconName: 'Gift',
            targetAudience: 'all',
            createdAt: nowIso,
            updatedAt: nowIso,
          },
          {
            id: 'ban_novedades',
            title: 'Nuevas Mejoras en la Plataforma PrivaKey',
            message: 'Hemos actualizado el sistema de entregas automáticas, acreditación ágil de saldo SPEI y módulo de recompensas transparentes.',
            badgeText: 'Novedades & Mejoras',
            type: 'announcement',
            active: true,
            priority: 2,
            dismissible: true,
            linkUrl: 'catalogo',
            linkText: 'Explorar Catálogo',
            iconName: 'Sparkles',
            targetAudience: 'all',
            createdAt: nowIso,
            updatedAt: nowIso,
          }
        ];
        mutated = true;
      }

      // Settings migration for referrals
      if (inMemoryStore!.settings.referralProgramEnabled === undefined) {
        inMemoryStore!.settings.referralProgramEnabled = true;
        inMemoryStore!.settings.referralCommissionRate = 5; // 5%
        inMemoryStore!.settings.referralPointsPerMXN = 1; // 1 point per $1 MXN
        inMemoryStore!.settings.referralRewardType = 'both';
        inMemoryStore!.settings.pointsExchangeRateCents = 10; // 1 pt = 10 cents ($0.10 MXN)
        inMemoryStore!.settings.autoCreditRewards = false;
        mutated = true;
      }

      // Users migration for referrals
      for (const u of inMemoryStore!.users) {
        if (!u.referralCode) {
          u.referralCode = u.customerCode;
          mutated = true;
        }
        if (u.referralPoints === undefined) {
          u.referralPoints = u.role === 'client' ? 120 : 0;
          mutated = true;
        }
        if (u.referralEarningsCents === undefined) {
          u.referralEarningsCents = u.role === 'client' ? 2500 : 0; // $25.00 MXN
          mutated = true;
        }
      }
      // Ensure all products have presentation and default image
      for (const prod of inMemoryStore!.products) {
        if (!prod.presentation) {
          prod.presentation = 'full_account';
          mutated = true;
        }
        if (prod.imageUrl === undefined) {
          prod.imageUrl = null;
          mutated = true;
        }
      }
      // If no inventory accounts exist yet, seed them from createSeedData
      if (inMemoryStore!.inventoryAccounts.length === 0) {
        const seed = await createSeedData();
        inMemoryStore!.inventoryAccounts = seed.inventoryAccounts;
        inMemoryStore!.products = seed.products;
        inMemoryStore!.orders = seed.orders;
        mutated = true;
      }
      if (mutated) {
        await persistStore(inMemoryStore!);
      }
    } catch {
      // File doesn't exist or corrupted, generate seed
      inMemoryStore = await createSeedData();
      await persistStore(inMemoryStore);
    }
  } catch (err) {
    console.error('Failed to init DB:', err);
    inMemoryStore = await createSeedData();
  }
}

async function persistStore(data: StoreData): Promise<void> {
  const tempFile = `${DB_FILE}.tmp.${Date.now()}`;
  await fs.writeFile(tempFile, JSON.stringify(data, null, 2), 'utf-8');
  await fs.rename(tempFile, DB_FILE);
}

export function runTransaction<T>(operation: (store: StoreData) => Promise<T> | T): Promise<T> {
  return enqueue(async () => {
    if (!inMemoryStore) {
      await initDb();
    }
    // Deep clone to provide rollback safety
    const cloned: StoreData = JSON.parse(JSON.stringify(inMemoryStore));
    try {
      const result = await operation(cloned);
      inMemoryStore = cloned;
      await persistStore(cloned);
      return result;
    } catch (err) {
      // Cloned copy discarded, inMemoryStore unaltered
      throw err;
    }
  });
}

export async function getStore(): Promise<StoreData> {
  if (!inMemoryStore) {
    await initDb();
  }
  return JSON.parse(JSON.stringify(inMemoryStore!));
}

export async function backupStore(): Promise<StoreData> {
  return getStore();
}

export async function restoreStore(backupData: StoreData): Promise<void> {
  return enqueue(async () => {
    inMemoryStore = backupData;
    await persistStore(backupData);
  });
}

async function createSeedData(): Promise<StoreData> {
  const now = new Date().toISOString();

  // Passwords
  const adminAuth = hashPassword('admin123');
  const clientAuth = hashPassword('cliente123');

  const adminUser: User = {
    id: 'usr_admin',
    customerCode: 'ADM-0001',
    email: 'admin@privakey.mx',
    name: 'Administrador General',
    passwordHash: adminAuth.hash,
    passwordSalt: adminAuth.salt,
    role: 'admin',
    balanceCents: 0,
    status: 'active',
    referralCode: 'ADM-0001',
    referralPoints: 0,
    referralEarningsCents: 0,
    createdAt: now,
    updatedAt: now,
  };

  const clientUser: User = {
    id: 'usr_carlos',
    customerCode: 'CLI-84920',
    email: 'carlos@cliente.mx',
    name: 'Carlos Mendoza',
    passwordHash: clientAuth.hash,
    passwordSalt: clientAuth.salt,
    role: 'client',
    balanceCents: 45000, // $450.00 MXN
    status: 'active',
    referralCode: 'CLI-84920',
    referralPoints: 120,
    referralEarningsCents: 2500, // $25.00 MXN
    createdAt: now,
    updatedAt: now,
  };

  const settings: StoreSettings = {
    storeName: 'PrivaKey Digital MX',
    bankName: 'BBVA México',
    clabe: '012180015678901234',
    accountHolder: 'PRIVAKEY DISTRIBUCIONES DIGITALES S.A. DE C.V.',
    depositInstructions: 'Realiza tu transferencia SPEI agregando tu Identificador de Cliente en el Concepto de Pago. Una vez realizada, envía el comprobante a nuestro Telegram oficial indicando tu correo y folio de cliente.',
    telegramUsername: '@PrivaKeySoporte',
    telegramLink: 'https://t.me/PrivaKeySoporte',
    supportHours: 'Lunes a Domingo: 09:00 - 23:00 hrs (CDMX)',
    referralProgramEnabled: true,
    referralCommissionRate: 5, // 5%
    referralPointsPerMXN: 1, // 1 point per $1 MXN
    referralRewardType: 'both',
    pointsExchangeRateCents: 10, // 1 pt = $0.10 MXN (100 pts = $10.00 MXN)
    autoCreditRewards: false,
    updatedAt: now,
  };

  const initialMovement: BalanceMovement = {
    id: generateMovementCode(),
    userId: 'usr_carlos',
    adminId: 'usr_admin',
    type: 'deposit',
    amountCents: 45000,
    balanceAfterCents: 45000,
    reference: 'SPEI-839201948',
    reason: 'Acreditación manual depósito SPEI confirmado vía Telegram',
    createdAt: now,
  };

  const invitations: Invitation[] = [
    {
      id: 'inv_1',
      code: 'INV-8X2M-90Q4',
      note: 'Invitación VIP de prueba para nuevo comprador',
      status: 'active',
      createdBy: 'usr_admin',
      createdAt: now,
    },
    {
      id: 'inv_2',
      code: 'INV-K7P9-33V2',
      note: 'Invitación de cortesía con acceso general',
      status: 'active',
      createdBy: 'usr_admin',
      createdAt: now,
    },
    {
      id: 'inv_redeemed_demo',
      code: 'INV-USED-CARLOS',
      note: 'Invitación inicial canjeada por Carlos',
      status: 'redeemed',
      createdBy: 'usr_admin',
      redeemedBy: 'usr_carlos',
      redeemedAt: now,
      createdAt: now,
    }
  ];

  const products: Product[] = [
    {
      id: 'prod_disney_perfil',
      title: 'Disney+ Premium (Perfil)',
      category: 'Streaming & Series',
      description: 'Acceso por credenciales a cuenta Disney+ compartida en calidad Ultra HD 4K y Dolby Atmos. 1 pantalla simultánea sin anuncios.',
      priceCents: 4500, // $45.00 MXN
      deliveryMode: 'automatic',
      presentation: 'profile',
      imageUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 30,
      warrantyConditions: 'Garantía de 30 días continuos. Si las credenciales caducan, se actualizan vía administración.',
      active: true,
      hasSold: false,
      badge: '6 Cupos Totales',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_max_completa',
      title: 'Max Platino 4K (Cuenta Completa)',
      category: 'Streaming & Series',
      description: 'Cuenta completa exclusiva de uso privado. Hasta 4 pantallas simultáneas en 4K Ultra HD y descargas offline.',
      priceCents: 15000, // $150.00 MXN
      deliveryMode: 'automatic',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1522869635100-9f4c5e86aa37?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 30,
      warrantyConditions: 'Garantía total de 30 días. No modificar contraseñas de facturación asociadas.',
      active: true,
      hasSold: false,
      badge: 'Cuenta Completa',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_win11',
      title: 'Windows 11 Pro Retail (1 PC)',
      category: 'Sistemas Operativos',
      description: 'Clave original Microsoft Retail de 25 caracteres para activación permanente de 1 PC. Reinstalable en el mismo equipo y vinculable a cuenta Microsoft.',
      priceCents: 28000, // $280.00 MXN
      deliveryMode: 'automatic',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 365,
      warrantyConditions: 'Garantía de activación inmediata de 365 días. Cubre error de clave no válida o bloqueo de servidor.',
      active: true,
      hasSold: true,
      badge: 'Más Vendido',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_office2024',
      title: 'Microsoft Office 2024 Professional Plus',
      category: 'Productividad',
      description: 'Suite completa 2024 para Windows (Word, Excel, PowerPoint, Outlook, Access, Publisher). Licencia perpetua por código de canje en setup.office.com.',
      priceCents: 42000, // $420.00 MXN
      deliveryMode: 'automatic',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 365,
      warrantyConditions: 'Garantía de 1 año contra revocación de licencia oficial. Válida para 1 instalación fija.',
      active: true,
      hasSold: false,
      badge: 'Oficial',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_canva_pro',
      title: 'Canva Pro Anual (Activación a tu correo)',
      category: 'Diseño Gráfico',
      description: 'Activación directa a tu cuenta personal existente de Canva. Conserva tus diseños, plantillas y marcas previas sin perder acceso.',
      priceCents: 29000, // $290.00 MXN
      deliveryMode: 'email_activation',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1626785774573-4b799315345d?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 365,
      warrantyConditions: 'Garantía por los 365 días del servicio. Si el plan sufre caída, el administrador reactiva o reubica el correo en 24h hábiles.',
      active: true,
      hasSold: false,
      manualStockCount: 8,
      badge: 'Popular',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_spotify3m',
      title: 'Spotify Premium 3 Meses (Invitación Familiar)',
      category: 'Streaming & Música',
      description: 'Enlace de invitación y dirección para unirse a plan Premium sin anuncios. Requiere que la cuenta no haya tenido plan familiar en los últimos 12 meses.',
      priceCents: 11000, // $110.00 MXN
      deliveryMode: 'email_activation',
      presentation: 'profile',
      imageUrl: 'https://images.unsplash.com/photo-1614680376593-902f749f7ffc?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 90,
      warrantyConditions: 'Garantía de 90 días naturales. En caso de desvinculación antes del periodo, se entrega nueva invitación de reposición.',
      active: true,
      hasSold: false,
      manualStockCount: 5,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_nordvpn',
      title: 'NordVPN Privado 1 Año (Credenciales)',
      category: 'Seguridad & VPN',
      description: 'Acceso privado para protección de navegación, cifrado de tráfico y streaming internacional en hasta 6 dispositivos simultáneos.',
      priceCents: 35000, // $350.00 MXN
      deliveryMode: 'automatic',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 365,
      warrantyConditions: 'Garantía total de 1 año. En caso de pérdida de suscripción, se efectúa reemplazo con nuevo usuario o reposición de saldo.',
      active: true,
      hasSold: false,
      badge: 'Alta Velocidad',
      createdAt: now,
      updatedAt: now,
    },
    {
      id: 'prod_youtube1m',
      title: 'YouTube Premium 1 Mes (Activación por Correo)',
      category: 'Streaming & Música',
      description: 'YouTube y YouTube Music sin anuncios, descargas offline y reproducción en segundo plano para tu correo de Google.',
      priceCents: 5500, // $55.00 MXN
      deliveryMode: 'email_activation',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1543269865-cbf427effbad?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 30,
      warrantyConditions: 'Garantía de 30 días contra caídas. No acumulable si la cuenta ya tiene suscripción activa.',
      active: true,
      hasSold: false,
      manualStockCount: 12,
      createdAt: now,
      updatedAt: now,
    }
  ];

  // Specific requirement: "Cargar en un mismo producto una cuenta de cuatro cupos y otra de dos: deben existir seis unidades comprables."
  const inventoryAccounts: InventoryAccount[] = [
    {
      id: 'CTA-84910',
      productId: 'prod_disney_perfil',
      identifier: 'disney_perfiles_01@privamail.mx',
      encryptedCredentials: encryptCredential('Usuario: disney_perfiles_01@privamail.mx\nContraseña: Disney#Pass2026\nNota: Cuenta compartida - Usa cualquier perfil disponible.'),
      credentialsSnippet: 'disney_perfiles_01••••mx',
      presentation: 'profile',
      totalSlots: 4, // 4 slots
      consumedSlots: 0,
      status: 'active',
      notes: 'Lote A - 4 perfiles autorizados',
      capacityHistory: [],
      credentialUpdates: [],
      createdAt: new Date(Date.now() - 3600000).toISOString(), // Oldest (FIFO first)
      updatedAt: new Date(Date.now() - 3600000).toISOString(),
    },
    {
      id: 'CTA-84911',
      productId: 'prod_disney_perfil',
      identifier: 'disney_perfiles_02@privamail.mx',
      encryptedCredentials: encryptCredential('Usuario: disney_perfiles_02@privamail.mx\nContraseña: Star#Pass2026\nNota: Cuenta compartida - Usa cualquier perfil disponible.'),
      credentialsSnippet: 'disney_perfiles_02••••mx',
      presentation: 'profile',
      totalSlots: 2, // 2 slots (total across the 2 accounts = 6 units!)
      consumedSlots: 0,
      status: 'active',
      notes: 'Lote B - 2 perfiles autorizados',
      capacityHistory: [],
      credentialUpdates: [],
      createdAt: new Date(Date.now() - 1800000).toISOString(), // Second (FIFO next)
      updatedAt: new Date(Date.now() - 1800000).toISOString(),
    },
    {
      id: 'CTA-84912',
      productId: 'prod_max_completa',
      identifier: 'max_completa_01@privamail.mx',
      encryptedCredentials: encryptCredential('Usuario: max_completa_01@privamail.mx\nContraseña: Max#Privada99!\nAcceso: Cuenta completa 4 pantallas'),
      credentialsSnippet: 'max_completa_01••••mx',
      presentation: 'full_account',
      totalSlots: 1, // Single slot for full account
      consumedSlots: 0,
      status: 'active',
      notes: 'Cuenta completa privada y exclusiva',
      capacityHistory: [],
      credentialUpdates: [],
      createdAt: now,
      updatedAt: now,
    }
  ];

  // Stock units for automatic products
  const stockUnits: StockUnit[] = [
    // Windows 11 keys
    {
      id: 'stk_win_1',
      productId: 'prod_win11',
      encryptedContent: encryptCredential('VK7JG-NPHTM-C97JM-9MPGT-3V66T\nInstrucciones: Ve a Configuración > Sistema > Activación > Cambiar clave de producto.'),
      contentSnippet: 'VK7JG-****-****-3V66T',
      status: 'delivered',
      orderId: 'ORD-710492',
      createdAt: now,
      deliveredAt: now,
    },
    {
      id: 'stk_win_2',
      productId: 'prod_win11',
      encryptedContent: encryptCredential('W269N-WFGWX-YVC9B-4J6C9-T83GX\nInstrucciones: Ve a Configuración > Sistema > Activación > Cambiar clave de producto.'),
      contentSnippet: 'W269N-****-****-T83GX',
      status: 'available',
      createdAt: now,
    },
    {
      id: 'stk_win_3',
      productId: 'prod_win11',
      encryptedContent: encryptCredential('MH37W-N47XK-V7XM9-C7227-GCQG9\nInstrucciones: Ve a Configuración > Sistema > Activación > Cambiar clave de producto.'),
      contentSnippet: 'MH37W-****-****-GCQG9',
      status: 'available',
      createdAt: now,
    },
    // Office keys
    {
      id: 'stk_off_1',
      productId: 'prod_office2024',
      encryptedContent: encryptCredential('NK8R7-8BG69-279TF-322V9-4KRC6\nCanje: Entra en https://setup.office.com con tu cuenta Microsoft e introduce el código.'),
      contentSnippet: 'NK8R7-****-****-4KRC6',
      status: 'available',
      createdAt: now,
    },
    {
      id: 'stk_off_2',
      productId: 'prod_office2024',
      encryptedContent: encryptCredential('B9GN2-DXXQC-9DHKT-GGWCR-4X66T\nCanje: Entra en https://setup.office.com con tu cuenta Microsoft e introduce el código.'),
      contentSnippet: 'B9GN2-****-****-4X66T',
      status: 'available',
      createdAt: now,
    },
    // NordVPN
    {
      id: 'stk_vpn_1',
      productId: 'prod_nordvpn',
      encryptedContent: encryptCredential('Usuario: nord_usr_8491@privamail.mx\nContraseña: Kripto#Nord99!26\nServidores: Más de 6,000 activos en 110 países.'),
      contentSnippet: 'nord_usr_****@privamail.mx',
      status: 'available',
      createdAt: now,
    },
    {
      id: 'stk_vpn_2',
      productId: 'prod_nordvpn',
      encryptedContent: encryptCredential('Usuario: nord_usr_9934@privamail.mx\nContraseña: Secure#Net88@26\nServidores: Más de 6,000 activos en 110 países.'),
      contentSnippet: 'nord_usr_****@privamail.mx',
      status: 'available',
      createdAt: now,
    }
  ];

  // Demo seeded past order for Carlos to showcase "Mis compras" and warranty status right away
  const orderDate = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();
  const warrantyExpiration = new Date(Date.now() + 363 * 24 * 60 * 60 * 1000).toISOString();

  const demoOrder: Order = {
    id: 'ORD-710492',
    userId: 'usr_carlos',
    productId: 'prod_win11',
    productSnapshot: {
      title: 'Windows 11 Pro Retail (1 PC)',
      category: 'Sistemas Operativos',
      description: 'Clave original Microsoft Retail de 25 caracteres para activación permanente de 1 PC. Reinstalable en el mismo equipo y vinculable a cuenta Microsoft.',
      priceCents: 28000,
      deliveryMode: 'automatic',
      presentation: 'full_account',
      imageUrl: 'https://images.unsplash.com/photo-1588702547919-26089e690ecc?w=600&auto=format&fit=crop&q=80',
      warrantyDays: 365,
      warrantyConditions: 'Garantía de activación inmediata de 365 días. Cubre error de clave no válida o bloqueo de servidor.',
    },
    priceCents: 28000,
    status: 'completed',
    deliveryMode: 'automatic',
    presentation: 'full_account',
    stockUnitId: 'stk_win_1',
    deliveredContentEncrypted: stockUnits[0].encryptedContent,
    deliveryTimestamp: orderDate,
    warrantyExpiresAt: warrantyExpiration,
    warrantyStatus: 'active',
    createdAt: orderDate,
    updatedAt: orderDate,
  };

  const initialPurchaseMovement: BalanceMovement = {
    id: 'MOV-194029',
    userId: 'usr_carlos',
    adminId: null,
    type: 'purchase',
    amountCents: -28000,
    balanceAfterCents: 17000,
    reference: 'ORD-710492',
    reason: 'Compra de producto: Windows 11 Pro Retail (1 PC)',
    orderId: 'ORD-710492',
    createdAt: orderDate,
  };

  // Re-adjust Carlos's final balance to 17000 cents ($170.00 MXN) so everything reconciles perfectly
  clientUser.balanceCents = 17000;

  return {
    settings,
    users: [adminUser, clientUser],
    invitations,
    products,
    inventoryAccounts,
    stockUnits,
    orders: [demoOrder],
    balanceMovements: [initialMovement, initialPurchaseMovement],
    warrantyCases: [],
    referralRewards: [
      {
        id: 'REF-REW-1001',
        referrerUserId: 'usr_carlos',
        referrerName: 'Carlos Mendoza',
        referrerCode: 'CLI-84920',
        referredUserId: 'usr_demo_friend',
        referredUserName: 'Mariana López',
        referredCustomerCode: 'CLI-91024',
        sourceType: 'recharge',
        sourceId: 'SPEI-DEMO-991',
        sourceAmountCents: 50000, // $500 MXN
        rewardType: 'cashback',
        pointsEarned: 120,
        cashbackCents: 2500, // $25.00 MXN (5%)
        commissionPercentage: 5,
        status: 'approved',
        notes: 'Comisión acreditada al saldo por primera recarga SPEI',
        createdAt: now,
        processedAt: now,
        processedByAdminId: 'usr_admin',
      }
    ],
    infoBanners: [
      {
        id: 'ban_referral_channel',
        title: 'Canal Exclusivo de Referidos en Telegram',
        message: '¿Ya estás en nuestro canal oficial de referidos? Únete ahora y recibe hasta 10% de descuento en tus compras, bonificaciones anticipadas y comisiones exclusivas por recomendar a tus amigos.',
        badgeText: 'Beneficio Exclusivo',
        type: 'referral',
        active: true,
        priority: 1,
        dismissible: true,
        linkUrl: 'https://t.me/PrivaKeySoporte',
        linkText: 'Unirme al Canal de Referidos',
        iconName: 'Gift',
        targetAudience: 'all',
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 'ban_novedades',
        title: 'Nuevas Mejoras en la Plataforma PrivaKey',
        message: 'Hemos actualizado el sistema de entregas automáticas, acreditación ágil de saldo SPEI y módulo de recompensas transparentes.',
        badgeText: 'Novedades & Mejoras',
        type: 'announcement',
        active: true,
        priority: 2,
        dismissible: true,
        linkUrl: 'catalogo',
        linkText: 'Explorar Catálogo',
        iconName: 'Sparkles',
        targetAudience: 'all',
        createdAt: now,
        updatedAt: now,
      }
    ],
    auditLogs: [
      {
        id: 'aud_init',
        adminId: 'usr_admin',
        adminName: 'Administrador General',
        action: 'system_initialized',
        targetType: 'system',
        targetId: 'privakey_core',
        createdAt: now,
      }
    ],
    sessions: {},
  };
}
