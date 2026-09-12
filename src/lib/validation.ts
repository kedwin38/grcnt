import { z } from "zod";
import { normalizePhone } from "./format";

// ─── Auth ────────────────────────────────────────────────────────────────────

export const phoneSchema = z
  .string()
  .transform((v) => normalizePhone(v))
  .refine((v) => v !== null, "Enter a valid Safaricom number, e.g. 0712 345 678")
  .transform((v) => v as string);

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(100);

export const registerSchema = z.object({
  name: z.string().trim().min(2, "Enter your full name").max(80),
  phone: phoneSchema,
  password: passwordSchema,
});

export const loginSchema = z.object({
  phone: phoneSchema,
  password: z.string().min(1, "Enter your password"),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: passwordSchema,
});

export const profileSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
});

// ─── Orders & payments ───────────────────────────────────────────────────────

export const cartItemSchema = z.object({
  productId: z.number().int().positive(),
  qty: z.number().int().min(1).max(20),
});

export const routerNumberSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9-]{4,40}$/, "Enter a valid router number")
  .optional()
  .or(z.literal(""));

export const orderCreateSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, "Your cart is empty").max(20),
    fulfilment: z.enum(["INSTANT_TOPUP", "ROUTER_TOPUP", "PICKUP", "DELIVERY"]),
    topupPhone: phoneSchema.optional(),
    routerNumber: routerNumberSchema,
    address: z.string().trim().max(300).optional().or(z.literal("")),
    notes: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine(
    (v) => v.fulfilment !== "DELIVERY" || (v.address && v.address.length >= 8),
    { message: "Enter the delivery address", path: ["address"] }
  )
  .refine(
    (v) => v.fulfilment !== "INSTANT_TOPUP" || !!v.topupPhone,
    { message: "Enter the Safaricom number to top up", path: ["topupPhone"] }
  )
  .refine(
    (v) => v.fulfilment !== "ROUTER_TOPUP" || !!v.routerNumber,
    { message: "Enter the router number to load", path: ["routerNumber"] }
  );

export const stkSchema = z.object({
  code: z.string().trim().regex(/^GCN-[A-Z0-9]{6,12}$/, "Invalid order code"),
  phone: phoneSchema,
});

// ─── Support ─────────────────────────────────────────────────────────────────

export const ticketCreateSchema = z.object({
  name: z.string().trim().min(2, "Enter your name").max(80),
  phone: phoneSchema,
  subject: z.string().trim().min(3, "Enter a subject").max(120),
  message: z.string().trim().min(10, "Give us a few more details").max(2000),
  orderCode: z.string().trim().max(20).optional().or(z.literal("")),
});

export const ticketReplySchema = z.object({
  body: z.string().trim().min(1, "Write a reply").max(2000),
});

// ─── Admin: catalog ──────────────────────────────────────────────────────────

export const fieldDefSchema = z.object({
  key: z
    .string()
    .trim()
    .regex(/^[a-z0-9_]{1,30}$/i, "Key: letters, numbers, underscore"),
  label: z.string().trim().min(1).max(40),
  type: z.enum(["text", "number", "select"]),
  unit: z.string().trim().max(10).optional().or(z.literal("")),
  options: z.array(z.string()).optional(),
  badge: z.boolean().optional(),
});

export const categorySchema = z.object({
  name: z.string().trim().min(2, "Category name is too short").max(60),
  slug: z
    .string()
    .trim()
    .regex(/^[a-z0-9-]{2,60}$/, "Lowercase letters, numbers and dashes only")
    .optional()
    .or(z.literal("")),
  description: z.string().trim().max(300).optional().or(z.literal("")),
  icon: z.string().trim().max(40).default("package"),
  requiresImage: z.boolean().default(false),
  tracksStock: z.boolean().default(false),
  instantTopup: z.boolean().default(true),
  requiresRouterNumber: z.boolean().default(false),
  fields: z.array(fieldDefSchema).max(12).default([]),
  sortOrder: z.number().int().min(0).max(999).default(0),
  active: z.boolean().default(true),
});

export const productSchema = z.object({
  categoryId: z.number().int().positive(),
  name: z.string().trim().min(2, "Product name is too short").max(120),
  description: z.string().trim().max(3000).optional().or(z.literal("")),
  price: z.number().int().min(1, "Price must be at least KSh 1").max(10_000_000),
  compareAtPrice: z.number().int().min(0).max(10_000_000).nullable().optional(),
  images: z
    .array(z.object({ id: z.number().int().positive(), alt: z.string().max(120).optional() }))
    .max(6)
    .default([]),
  attributes: z.record(z.union([z.string(), z.number()])).default({}),
  stock: z.number().int().min(0).max(100000).nullable().optional(),
  lowStockAt: z.number().int().min(0).max(1000).default(3),
  active: z.boolean().default(true),
  featured: z.boolean().default(false),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

// ─── Admin: staff & settings ─────────────────────────────────────────────────

export const staffSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  password: passwordSchema,
  role: z.enum(["STAFF", "ADMIN"]).default("STAFF"),
});

export const businessSettingsSchema = z.object({
  name: z.string().trim().min(2).max(80),
  legalName: z.string().trim().max(120),
  tagline: z.string().trim().max(140),
  description: z.string().trim().max(600),
  phone: phoneSchema,
  whatsapp: phoneSchema,
  email: z.string().trim().email(),
  location: z.string().trim().max(160),
  tillNumber: z.string().trim().min(3).max(12),
  openHours: z.string().trim().max(120),
  announcement: z.string().trim().max(160).optional().or(z.literal("")),
});

export const mpesaSettingsSchema = z.object({
  environment: z.enum(["sandbox", "production"]),
  consumerKey: z.string().trim().max(120).optional().or(z.literal("")),
  consumerSecret: z.string().trim().max(120).optional().or(z.literal("")),
  passkey: z.string().trim().max(200).optional().or(z.literal("")),
  shortcode: z.string().trim().regex(/^\d{5,7}$/, "Shortcode is 5–7 digits"),
  transactionType: z.enum(["CustomerBuyGoodsOnline", "CustomerPayBillOnline"]),
  tillNumber: z
    .string()
    .trim()
    .regex(/^\d{5,7}$/, "Till number is 5–7 digits")
    .optional()
    .or(z.literal("")),
  callbackBaseUrl: z
    .string()
    .trim()
    .url("Include https://")
    .max(200)
    .optional()
    .or(z.literal("")),
});

export const seoSettingsSchema = z.object({
  siteTitle: z.string().trim().min(5).max(120),
  siteDescription: z.string().trim().min(20).max(300),
  keywords: z.string().trim().max(300),
});

export const backupSettingsSchema = z.object({
  enabled: z.boolean(),
  endpoint: z.string().trim().max(200).optional().or(z.literal("")),
  region: z.string().trim().max(40).optional().or(z.literal("")),
  bucket: z.string().trim().max(120).optional().or(z.literal("")),
  accessKeyId: z.string().trim().max(200).optional().or(z.literal("")),
  secretAccessKey: z.string().trim().max(200).optional().or(z.literal("")),
  prefix: z.string().trim().max(120).optional().or(z.literal("")),
  intervalHours: z.number().int().min(0).max(168),
  retentionCount: z.number().int().min(0).max(365),
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

import { ZodError } from "zod";

export function zodMessage(err: ZodError): string {
  const first = err.issues[0];
  return first ? first.message : "Invalid input";
}
