import type { Prisma } from "@prisma/client";
import type { CardProduct } from "@/components/store/ProductCard";

export type ProductWithCategory = Prisma.ProductGetPayload<{
  include: { category: true };
}>;

export type FieldDef = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  unit?: string;
  options?: string[];
  badge?: boolean;
};

export type ImageRef = { id: number; alt?: string };

export function parseImages(product: { images: string }): ImageRef[] {
  try {
    const parsed = JSON.parse(product.images);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function parseAttributes(product: { attributes: string }): Record<string, string | number> {
  try {
    const parsed = JSON.parse(product.attributes);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function parseFields(category: { fields: string }): FieldDef[] {
  try {
    const parsed = JSON.parse(category.fields);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Value of the category's badge field, e.g. "30 GB" for a data bundle. */
export function badgeValue(product: ProductWithCategory): string | null {
  const fields = parseFields(product.category);
  const attrs = parseAttributes(product);
  for (const field of fields) {
    if (field.badge && attrs[field.key] !== undefined && attrs[field.key] !== "") {
      return `${attrs[field.key]}${field.unit ? ` ${field.unit}` : ""}`;
    }
  }
  return null;
}

export function toCardProduct(product: ProductWithCategory): CardProduct {
  return {
    id: product.id,
    name: product.name,
    slug: product.slug,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    imageId: parseImages(product)[0]?.id ?? null,
    categoryName: product.category.name,
    categoryIcon: product.category.icon,
    badge: badgeValue(product),
    stock: product.stock,
    instant: product.category.instantTopup,
    requiresRouterNumber: product.category.requiresRouterNumber,
    hotSale: product.hotSale,
  };
}
