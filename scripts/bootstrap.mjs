// Idempotent first-boot seeding: admin account, default categories and sample
// products. Safe to run on every start — only creates what's missing.
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

try {
  process.loadEnvFile();
} catch {
  /* no .env file — rely on real env vars (e.g. Railway) */
}

const db = new PrismaClient();

const env = {
  adminName: process.env.ADMIN_NAME || "Green Admin",
  adminPhone: process.env.ADMIN_PHONE || "254700000000",
  adminPassword: process.env.ADMIN_PASSWORD || "Admin#2026",
};

async function seedAdmin() {
  const existingAdmin = await db.user.findFirst({ where: { role: "ADMIN" } });
  if (existingAdmin) {
    console.log(`• admin exists: ${existingAdmin.name} (${existingAdmin.phone})`);
    return;
  }
  await db.user.create({
    data: {
      name: env.adminName,
      phone: env.adminPhone,
      passwordHash: await bcrypt.hash(env.adminPassword, 10),
      role: "ADMIN",
    },
  });
  console.log(`✓ admin created: ${env.adminName} (${env.adminPhone})`);
  console.log(`  ⚠ change this password from Admin → Staff after first login`);
}

const CATEGORIES = [
  {
    name: "Data Bundles",
    slug: "data-bundles",
    icon: "wifi",
    description: "Stay connected for less — instant top-up to any Safaricom line.",
    requiresImage: false,
    tracksStock: false,
    instantTopup: true,
    sortOrder: 1,
    fields: [
      { key: "size_gb", label: "Size", type: "number", unit: "GB", badge: true },
      { key: "validity", label: "Validity", type: "select", options: ["24 hours", "7 days", "30 days", "90 days"] },
    ],
    products: [
      { name: "1 GB Data Bundle", price: 55, sortOrder: 1, attrs: { size_gb: 1, validity: "24 hours" } },
      { name: "5 GB Data Bundle", price: 250, compareAtPrice: 300, sortOrder: 2, attrs: { size_gb: 5, validity: "7 days" } },
      { name: "10 GB Data Bundle", price: 450, compareAtPrice: 500, sortOrder: 3, attrs: { size_gb: 10, validity: "7 days" } },
      { name: "25 GB Data Bundle", price: 900, compareAtPrice: 1000, sortOrder: 4, attrs: { size_gb: 25, validity: "30 days" } },
      { name: "50 GB Data Bundle", price: 1700, sortOrder: 5, attrs: { size_gb: 50, validity: "30 days" } },
      { name: "Unlimited Weekly Data", price: 1000, sortOrder: 6, attrs: { size_gb: "Unlimited", validity: "7 days" } },
    ],
  },
  {
    name: "Airtime",
    slug: "airtime",
    icon: "zap",
    description: "Top up in a tap — for any Safaricom number.",
    requiresImage: false,
    tracksStock: false,
    instantTopup: true,
    sortOrder: 2,
    fields: [{ key: "amount", label: "Airtime value", type: "number", unit: "KSh", badge: true }],
    products: [
      { name: "KSh 50 Airtime", price: 48, sortOrder: 1, attrs: { amount: 50 } },
      { name: "KSh 100 Airtime", price: 97, sortOrder: 2, attrs: { amount: 100 } },
      { name: "KSh 200 Airtime", price: 196, sortOrder: 3, attrs: { amount: 200 } },
      { name: "KSh 500 Airtime", price: 492, compareAtPrice: 500, sortOrder: 4, attrs: { amount: 500 } },
      { name: "KSh 1000 Airtime", price: 985, compareAtPrice: 1000, sortOrder: 5, attrs: { amount: 1000 } },
    ],
  },
  {
    name: "Minutes & SMS",
    slug: "minutes-sms",
    icon: "phone",
    description: "Talk more, text more — bundles for callers.",
    requiresImage: false,
    tracksStock: false,
    instantTopup: true,
    sortOrder: 3,
    fields: [
      { key: "minutes", label: "Minutes", type: "number", unit: "min", badge: true },
      { key: "sms", label: "SMS", type: "number", unit: "SMS" },
      { key: "validity", label: "Validity", type: "select", options: ["24 hours", "7 days", "30 days"] },
    ],
    products: [
      { name: "20 Minutes Talk Bundle", price: 35, sortOrder: 1, attrs: { minutes: 20, validity: "24 hours" } },
      { name: "100 Minutes + 200 SMS", price: 100, sortOrder: 2, attrs: { minutes: 100, sms: 200, validity: "7 days" } },
      { name: "500 Minutes Talk Bundle", price: 300, sortOrder: 3, attrs: { minutes: 500, validity: "30 days" } },
    ],
  },
  {
    name: "Phones",
    slug: "phones",
    icon: "smartphone",
    description: "Genuine devices with warranty. Delivery or pickup.",
    requiresImage: true,
    tracksStock: true,
    instantTopup: false,
    sortOrder: 4,
    fields: [
      { key: "storage", label: "Storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB"], badge: true },
      { key: "ram", label: "RAM", type: "text", unit: "GB" },
      { key: "color", label: "Colour", type: "text" },
    ],
    products: [
      { name: "Sample Phone — replace with your stock (128GB)", price: 15999, stock: 5, featured: true, sortOrder: 1, attrs: { storage: "128GB", ram: "4", color: "Black" } },
      { name: "Sample Phone — replace with your stock (256GB)", price: 24999, stock: 3, featured: true, sortOrder: 2, attrs: { storage: "256GB", ram: "8", color: "Green" } },
    ],
  },
  {
    name: "Accessories",
    slug: "accessories",
    icon: "headphones",
    description: "Chargers, earphones, covers and more.",
    requiresImage: true,
    tracksStock: true,
    instantTopup: false,
    sortOrder: 5,
    fields: [{ key: "type", label: "Type", type: "text" }],
    products: [],
  },
];

async function seedCatalog() {
  const categoryCount = await db.category.count();
  if (categoryCount > 0) {
    console.log(`• catalog exists (${categoryCount} categories)`);
    return;
  }
  for (const cat of CATEGORIES) {
    await createCategoryWithProducts(cat);
  }
}

async function createCategoryWithProducts(cat) {
  const { products, ...categoryData } = cat;
  const created = await db.category.create({
    data: { ...categoryData, fields: JSON.stringify(categoryData.fields) },
  });
  let i = 0;
  for (const p of products) {
    i += 1;
    await db.product.create({
      data: {
        categoryId: created.id,
        name: p.name,
        slug: `${p.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50)}-${i}${created.id}`,
        price: p.price,
        compareAtPrice: p.compareAtPrice || null,
        attributes: JSON.stringify(p.attrs || {}),
        stock: cat.tracksStock ? (p.stock ?? 0) : null,
        featured: !!p.featured,
        sortOrder: p.sortOrder,
      },
    });
  }
  console.log(`✓ category seeded: ${cat.name} (${products.length} products)`);
}

// Introduced after the initial catalog seed above already ran in production,
// so it's gated on its own slug (not categoryCount) — this is the pattern to
// follow for adding any further one-off category on top of an existing shop.
const WIFI_CATEGORY = {
  name: "WiFi Packages",
  slug: "wifi-packages",
  icon: "wifi",
  description: "5G router data packages — loaded directly onto your router.",
  requiresImage: false,
  tracksStock: false,
  instantTopup: false,
  requiresRouterNumber: true,
  sortOrder: 6,
  fields: [
    { key: "size_gb", label: "Size", type: "number", unit: "GB", badge: true },
    { key: "validity", label: "Validity", type: "select", options: ["7 days", "30 days"] },
  ],
  products: [
    { name: "20 GB Router Package", price: 1000, sortOrder: 1, attrs: { size_gb: 20, validity: "30 days" } },
    { name: "50 GB Router Package", price: 2000, sortOrder: 2, attrs: { size_gb: 50, validity: "30 days" } },
    { name: "Unlimited Router Package", price: 3500, sortOrder: 3, attrs: { size_gb: "Unlimited", validity: "30 days" } },
  ],
};

async function seedWifiCategory() {
  const existing = await db.category.findUnique({ where: { slug: WIFI_CATEGORY.slug } });
  if (existing) {
    console.log(`• category exists: ${WIFI_CATEGORY.name}`);
    return;
  }
  await createCategoryWithProducts(WIFI_CATEGORY);
  console.log(`  ⚠ sample prices — edit them from Admin → Categories/Products`);
}

async function main() {
  await seedAdmin();
  await seedCatalog();
  await seedWifiCategory();
}

main()
  .catch((err) => {
    console.error("bootstrap failed:", err);
    process.exitCode = 1;
  })
  .finally(() => db.$disconnect());
