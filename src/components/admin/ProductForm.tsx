"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, ImagePlus, Loader2, Save, Star, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";

export type AdminCategory = {
  id: number;
  name: string;
  icon: string;
  requiresImage: boolean;
  tracksStock: boolean;
  instantTopup: boolean;
  fields: { key: string; label: string; type: "text" | "number" | "select"; unit?: string; options?: string[] }[];
};

export type ProductFormValues = {
  id?: number;
  categoryId: number;
  name: string;
  description: string;
  price: string;
  compareAtPrice: string;
  images: { id: number; alt?: string }[];
  attributes: Record<string, string>;
  stock: string;
  lowStockAt: string;
  active: boolean;
  featured: boolean;
  sortOrder: string;
};

export function ProductForm({
  categories,
  initial,
}: {
  categories: AdminCategory[];
  initial?: ProductFormValues;
}) {
  const router = useRouter();
  const [categoryId, setCategoryId] = useState<number>(
    initial?.categoryId || categories[0]?.id || 0
  );
  const [name, setName] = useState(initial?.name || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [price, setPrice] = useState(initial?.price || "");
  const [compareAtPrice, setCompareAtPrice] = useState(initial?.compareAtPrice || "");
  const [images, setImages] = useState<{ id: number }[]>(initial?.images || []);
  const [attributes, setAttributes] = useState<Record<string, string>>(
    initial?.attributes || {}
  );
  const [stock, setStock] = useState(initial?.stock ?? "");
  const [lowStockAt, setLowStockAt] = useState(initial?.lowStockAt ?? "3");
  const [active, setActive] = useState(initial?.active ?? true);
  const [featured, setFeatured] = useState(initial?.featured ?? false);
  const [sortOrder, setSortOrder] = useState(initial?.sortOrder ?? "0");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const category = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId]
  );

  async function upload(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      Array.from(files).slice(0, 6).forEach((f) => fd.append("file", f));
      const csrf = document.cookie.match(/(?:^|;\s*)gcn_csrf=([^;]+)/)?.[1] || "";
      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        headers: { "x-csrf-token": decodeURIComponent(csrf) },
        body: fd,
      });
      const payload = await res.json();
      if (!res.ok || !payload.ok) throw new Error(payload.error || "Upload failed.");
      setImages((prev) => [...prev, ...payload.data.ids.map((id: number) => ({ id }))].slice(0, 6));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  async function save() {
    setError(null);
    setSaving(true);
    try {
      const body = {
        categoryId,
        name: name.trim(),
        description: description.trim(),
        price: Math.round(parseFloat(price) || 0),
        compareAtPrice: compareAtPrice ? Math.round(parseFloat(compareAtPrice)) : null,
        images,
        attributes,
        stock: category?.tracksStock ? Math.max(0, parseInt(stock || "0", 10) || 0) : null,
        lowStockAt: Math.max(0, parseInt(lowStockAt || "3", 10) || 0),
        active,
        featured,
        sortOrder: Math.max(0, parseInt(sortOrder || "0", 10) || 0),
      };
      if (!body.name || !body.price) throw new Error("Name and price are required.");
      if (initial?.id) {
        await api(`/api/admin/products/${initial.id}`, { method: "PATCH", body });
      } else {
        await api("/api/admin/products", { body });
      }
      router.push("/admin/products");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the product.");
      setSaving(false);
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
      <div className="space-y-5">
        <div className="card p-6 space-y-4">
          <h2 className="font-extrabold text-ink">Basics</h2>
          <div>
            <label className="label">Category</label>
            <select className="input" value={categoryId} onChange={(e) => setCategoryId(Number(e.target.value))}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Product name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. 30GB Data Bundle – 7 days" />
          </div>
          <div>
            <label className="label">Description (optional)</label>
            <textarea className="input" rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this a great deal?" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Price (KSh)</label>
              <input className="input" type="number" min={1} inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="1000" />
            </div>
            <div>
              <label className="label">Was-price (KSh, optional)</label>
              <input className="input" type="number" min={0} inputMode="numeric" value={compareAtPrice} onChange={(e) => setCompareAtPrice(e.target.value)} placeholder="1200" />
            </div>
          </div>
        </div>

        {/* Dynamic fields from the category schema */}
        {category && category.fields.length > 0 ? (
          <div className="card p-6 space-y-4">
            <h2 className="font-extrabold text-ink">{category.name} details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {category.fields.map((field) => (
                <div key={field.key}>
                  <label className="label">
                    {field.label}
                    {field.unit ? ` (${field.unit})` : ""}
                  </label>
                  {field.type === "select" ? (
                    <select
                      className="input"
                      value={attributes[field.key] || ""}
                      onChange={(e) => setAttributes((a) => ({ ...a, [field.key]: e.target.value }))}
                    >
                      <option value="">—</option>
                      {(field.options || []).map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      className="input"
                      type={field.type === "number" ? "number" : "text"}
                      inputMode={field.type === "number" ? "numeric" : undefined}
                      value={attributes[field.key] || ""}
                      onChange={(e) => setAttributes((a) => ({ ...a, [field.key]: e.target.value }))}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="card p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-extrabold text-ink">Images</h2>
            {category?.requiresImage ? (
              <span className="badge badge-amber">Required for {category.name}</span>
            ) : (
              <span className="badge badge-gray">Optional — stylised card shown instead</span>
            )}
          </div>
          {images.length > 0 ? (
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {images.map((img, i) => (
                <div key={img.id} className="relative group rounded-xl overflow-hidden border border-line">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={`/api/img/${img.id}`} alt="" className="aspect-square object-cover w-full" />
                  {i === 0 ? (
                    <span className="absolute top-1.5 left-1.5 badge badge-green">Cover</span>
                  ) : (
                    <button
                      className="absolute top-1.5 left-1.5 btn btn-sm btn-outline bg-surface/90 opacity-0 group-hover:opacity-100"
                      onClick={() => setImages((prev) => [img, ...prev.filter((p) => p.id !== img.id)])}
                    >
                      Cover
                    </button>
                  )}
                  <button
                    className="absolute top-1.5 right-1.5 w-7 h-7 rounded-lg bg-red-600 text-white flex items-center justify-center opacity-0 group-hover:opacity-100"
                    onClick={() => setImages((prev) => prev.filter((p) => p.id !== img.id))}
                    aria-label="Remove image"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          ) : null}
          <button
            type="button"
            className="btn btn-md btn-outline w-full border-dashed"
            onClick={() => fileRef.current?.click()}
            disabled={uploading || images.length >= 6}
          >
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ImagePlus className="w-4 h-4" />}
            {uploading ? "Uploading…" : "Add images (JPEG/PNG/WebP, max 4MB each)"}
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => upload(e.target.files)}
          />
        </div>
      </div>

      <div className="space-y-5">
        <div className="card p-6 space-y-4">
          <h2 className="font-extrabold text-ink">Availability</h2>
          {category?.tracksStock ? (
            <>
              <div>
                <label className="label">Stock count</label>
                <input className="input" type="number" min={0} inputMode="numeric" value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
              </div>
              <div>
                <label className="label">Low-stock alert at</label>
                <input className="input" type="number" min={0} inputMode="numeric" value={lowStockAt} onChange={(e) => setLowStockAt(e.target.value)} />
              </div>
            </>
          ) : (
            <p className="text-[13px] text-ink-mute leading-relaxed">
              {category?.name} products are digital — no stock tracking needed. They
              remain available unless you deactivate them.
            </p>
          )}
          <div>
            <label className="label">Display order (lower shows first)</label>
            <input className="input" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>
          <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 cursor-pointer">
            <span className="text-sm font-semibold text-ink">Visible on site</span>
            <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="w-5 h-5 accent-[#3aa335]" />
          </label>
          <label className="flex items-center justify-between rounded-xl border border-line px-4 py-3 cursor-pointer">
            <span className="text-sm font-semibold text-ink flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500" /> Featured on home page
            </span>
            <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="w-5 h-5 accent-[#3aa335]" />
          </label>
        </div>

        {error ? (
          <div className="rounded-xl bg-red-50 border border-red-200 text-red-700 text-[13px] font-medium px-3.5 py-3 flex gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
          </div>
        ) : null}

        <button className="btn btn-lg btn-primary w-full" onClick={save} disabled={saving || categories.length === 0}>
          {saving ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Save className="w-4.5 h-4.5" />}
          {initial?.id ? "Save changes" : "Create product"}
        </button>
        {initial?.id ? (
          <DeleteProductButton id={initial.id} name={initial.name} />
        ) : null}
      </div>
    </div>
  );
}

function DeleteProductButton({ id, name }: { id: number; name: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  async function remove() {
    setBusy(true);
    try {
      await api(`/api/admin/products/${id}`, { method: "DELETE" });
      router.push("/admin/products");
      router.refresh();
    } catch {
      setBusy(false);
      setConfirming(false);
    }
  }

  if (!confirming) {
    return (
      <button className="btn btn-md btn-ghost w-full text-red-600 hover:bg-red-50" onClick={() => setConfirming(true)}>
        <Trash2 className="w-4 h-4" /> Delete product…
      </button>
    );
  }
  return (
    <div className="rounded-xl border border-red-200 bg-red-50 p-4 space-y-3">
      <p className="text-[13px] font-semibold text-red-700">
        Delete “{name}”? Products with order history are archived instead.
      </p>
      <div className="flex gap-2">
        <button className="btn btn-md btn-danger flex-1" onClick={remove} disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Yes, delete
        </button>
        <button className="btn btn-md btn-ghost" onClick={() => setConfirming(false)}>Back</button>
      </div>
    </div>
  );
}
