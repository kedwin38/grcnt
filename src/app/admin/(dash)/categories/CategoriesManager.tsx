"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, Layers, Loader2, Pencil, Plus, Trash2, X } from "lucide-react";
import { api } from "@/lib/client";

type FieldRow = {
  key: string;
  label: string;
  type: "text" | "number" | "select";
  unit: string;
  options: string; // comma separated for select
  badge: boolean;
};

export type CategoryRow = {
  id: number;
  name: string;
  slug: string;
  description: string;
  icon: string;
  requiresImage: boolean;
  tracksStock: boolean;
  instantTopup: boolean;
  fields: FieldRow[];
  sortOrder: number;
  active: boolean;
  productCount: number;
};

const ICONS = [
  "package", "smartphone", "wifi", "phone", "message", "zap",
  "battery", "headphones", "watch", "gift", "sim", "signal",
];

const emptyCategory: Omit<CategoryRow, "id" | "productCount"> = {
  name: "",
  slug: "",
  description: "",
  icon: "package",
  requiresImage: false,
  tracksStock: false,
  instantTopup: true,
  fields: [],
  sortOrder: 0,
  active: true,
};

export function CategoriesManager({ initial }: { initial: CategoryRow[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<CategoryRow | Omit<CategoryRow, "id" | "productCount"> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function remove(cat: CategoryRow) {
    setError(null);
    setBusy(true);
    try {
      const res = await api<{ hidden?: boolean; products?: number }>(
        `/api/admin/categories/${cat.id}`,
        { method: "DELETE" }
      );
      if (res.hidden) {
        setError(
          `“${cat.name}” has ${res.products} products — it was hidden instead of deleted. Remove its products first to delete it fully.`
        );
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="flex justify-between items-center">
        <p className="text-[13px] text-ink-mute">{initial.length} categories</p>
        <button className="btn btn-md btn-primary" onClick={() => setEditing({ ...emptyCategory })}>
          <Plus className="w-4 h-4" /> New category
        </button>
      </div>

      {error ? (
        <div className="rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[13px] font-medium px-3.5 py-3 flex gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" /> {error}
        </div>
      ) : null}

      <div className="grid sm:grid-cols-2 gap-4">
        {initial.map((cat) => (
          <div key={cat.id} className={`card p-5 ${cat.active ? "" : "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-extrabold text-ink">{cat.name}</span>
                  {cat.active ? (
                    <span className="badge badge-green">Live</span>
                  ) : (
                    <span className="badge badge-gray">Hidden</span>
                  )}
                </div>
                <div className="text-[12px] text-ink-mute mt-0.5">
                  /shop?cat={cat.slug} · {cat.productCount} products
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button className="btn btn-sm btn-ghost" onClick={() => setEditing(cat)} aria-label={`Edit ${cat.name}`}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button
                  className="btn btn-sm btn-ghost text-red-600 hover:bg-red-50"
                  onClick={() => remove(cat)}
                  disabled={busy}
                  aria-label={`Delete ${cat.name}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <span className="badge badge-gray">{cat.icon}</span>
              {cat.requiresImage ? (
                <span className="badge badge-amber">Photos required</span>
              ) : (
                <span className="badge badge-gray">No photos needed</span>
              )}
              {cat.tracksStock ? <span className="badge badge-blue">Tracks stock</span> : null}
              {cat.instantTopup ? <span className="badge badge-green">Instant top-up</span> : null}
              {cat.fields.map((f) => (
                <span key={f.key} className="badge badge-gray">
                  {f.label}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {editing ? (
        <CategoryEditor
          value={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            router.refresh();
          }}
        />
      ) : null}
    </>
  );
}

function CategoryEditor({
  value,
  onClose,
  onSaved,
}: {
  value: CategoryRow | Omit<CategoryRow, "id" | "productCount">;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isNew = !("id" in value);
  const [name, setName] = useState(value.name);
  const [slug, setSlug] = useState(value.slug);
  const [description, setDescription] = useState(value.description);
  const [icon, setIcon] = useState(value.icon);
  const [requiresImage, setRequiresImage] = useState(value.requiresImage);
  const [tracksStock, setTracksStock] = useState(value.tracksStock);
  const [instantTopup, setInstantTopup] = useState(value.instantTopup);
  const [sortOrder, setSortOrder] = useState(String(value.sortOrder));
  const [active, setActive] = useState(value.active);
  const [fields, setFields] = useState<FieldRow[]>(value.fields.map((f) => ({ ...f })));
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function updateField(i: number, patch: Partial<FieldRow>) {
    setFields((prev) => prev.map((f, idx) => (idx === i ? { ...f, ...patch } : f)));
  }

  async function save() {
    setError(null);
    setBusy(true);
    try {
      const payload = {
        name: name.trim(),
        slug: slug.trim(),
        description: description.trim(),
        icon,
        requiresImage,
        tracksStock,
        instantTopup,
        sortOrder: Math.max(0, parseInt(sortOrder || "0", 10) || 0),
        active,
        fields: fields.map((f) => ({
          key: f.key.trim(),
          label: f.label.trim(),
          type: f.type,
          unit: f.unit.trim(),
          options: f.type === "select"
            ? f.options.split(",").map((s) => s.trim()).filter(Boolean)
            : undefined,
          badge: f.badge,
        })),
      };
      if (isNew) {
        await api("/api/admin/categories", { body: payload });
      } else {
        await api(`/api/admin/categories/${(value as CategoryRow).id}`, {
          method: "PATCH",
          body: payload,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-ink/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 animate-fade-in">
      <div className="bg-surface w-full sm:max-w-2xl rounded-t-3xl sm:rounded-3xl shadow-lift max-h-[92vh] overflow-y-auto">
        <div className="sticky top-0 bg-surface flex items-center justify-between px-6 py-4 border-b border-line">
          <h2 className="font-extrabold text-ink flex items-center gap-2">
            <Layers className="w-5 h-5 text-brand-600" />
            {isNew ? "New category" : `Edit “${value.name}”`}
          </h2>
          <button className="btn btn-sm btn-ghost" onClick={onClose} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Name</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Bundles" />
            </div>
            <div>
              <label className="label">URL slug (optional)</label>
              <input className="input" value={slug} onChange={(e) => setSlug(e.target.value)} placeholder="data-bundles" />
            </div>
          </div>

          <div>
            <label className="label">Short description (shows on shop header)</label>
            <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Stay connected for less" />
          </div>

          <div>
            <label className="label">Icon</label>
            <div className="flex flex-wrap gap-2">
              {ICONS.map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setIcon(i)}
                  className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold border transition-colors ${
                    icon === i
                      ? "bg-brand-500 text-white border-brand-500"
                      : "bg-surface border-line text-ink-soft hover:border-brand-300"
                  }`}
                >
                  {i}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-3">
            <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3.5 cursor-pointer">
              <input type="checkbox" checked={requiresImage} onChange={(e) => setRequiresImage(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#3aa335]" />
              <span>
                <span className="block text-sm font-bold text-ink">Products need photos</span>
                <span className="block text-[12px] text-ink-mute">e.g. Phones — a cover image is required</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3.5 cursor-pointer">
              <input type="checkbox" checked={tracksStock} onChange={(e) => setTracksStock(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#3aa335]" />
              <span>
                <span className="block text-sm font-bold text-ink">Track stock levels</span>
                <span className="block text-[12px] text-ink-mute">Physical goods with a count</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3.5 cursor-pointer">
              <input type="checkbox" checked={instantTopup} onChange={(e) => setInstantTopup(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#3aa335]" />
              <span>
                <span className="block text-sm font-bold text-ink">Fulfilled as top-up</span>
                <span className="block text-[12px] text-ink-mute">Delivered to a phone number after payment</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-xl border border-line px-4 py-3.5 cursor-pointer">
              <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} className="mt-0.5 w-5 h-5 accent-[#3aa335]" />
              <span>
                <span className="block text-sm font-bold text-ink">Visible on site</span>
                <span className="block text-[12px] text-ink-mute">Customers can browse it</span>
              </span>
            </label>
          </div>

          {/* Field schema editor */}
          <div className="rounded-2xl border border-line p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-bold text-ink">Product details</div>
                <div className="text-[12px] text-ink-mute">
                  Custom fields each product in this category fills in (e.g. Size GB, Validity)
                </div>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline"
                onClick={() =>
                  setFields((prev) => [
                    ...prev,
                    { key: "", label: "", type: "text", unit: "", options: "", badge: false },
                  ])
                }
              >
                <Plus className="w-3.5 h-3.5" /> Add field
              </button>
            </div>
            {fields.map((field, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-start bg-paper rounded-xl p-3 border border-line/60">
                <div className="col-span-12 sm:col-span-4">
                  <label className="label mb-1">Label</label>
                  <input className="input h-9" value={field.label} onChange={(e) => updateField(i, { label: e.target.value })} placeholder="Validity" />
                </div>
                <div className="col-span-6 sm:col-span-3">
                  <label className="label mb-1">Key</label>
                  <input className="input h-9" value={field.key} onChange={(e) => updateField(i, { key: e.target.value.replace(/[^a-zA-Z0-9_]/g, "_").toLowerCase() })} placeholder="validity" />
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="label mb-1">Type</label>
                  <select className="input h-9" value={field.type} onChange={(e) => updateField(i, { type: e.target.value as FieldRow["type"] })}>
                    <option value="text">Text</option>
                    <option value="number">Number</option>
                    <option value="select">Choice</option>
                  </select>
                </div>
                <div className="col-span-6 sm:col-span-2">
                  <label className="label mb-1">Unit</label>
                  <input className="input h-9" value={field.unit} onChange={(e) => updateField(i, { unit: e.target.value })} placeholder="days" />
                </div>
                <div className="col-span-6 sm:col-span-1 flex flex-col gap-1.5">
                  <label className="text-[11px] font-bold text-ink-mute">Big</label>
                  <input type="checkbox" checked={field.badge} onChange={(e) => updateField(i, { badge: e.target.checked })} className="w-5 h-5 accent-[#3aa335]" title="Show as the big number on cards" />
                </div>
                <div className="col-span-12 sm:col-span-12">
                  {field.type === "select" ? (
                    <input className="input h-9" value={field.options} onChange={(e) => updateField(i, { options: e.target.value })} placeholder="Choices, comma separated: 24 hours, 7 days, 30 days" />
                  ) : null}
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-red-600 hover:underline mt-1.5"
                    onClick={() => setFields((prev) => prev.filter((_, idx) => idx !== i))}
                  >
                    Remove field
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="w-36">
            <label className="label">Display order</label>
            <input className="input" type="number" min={0} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} />
          </div>

          {error ? <p className="field-error">{error}</p> : null}

          <div className="flex justify-end gap-2 pt-2">
            <button className="btn btn-md btn-ghost" onClick={onClose}>Cancel</button>
            <button className="btn btn-md btn-primary" onClick={save} disabled={busy}>
              {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {isNew ? "Create category" : "Save changes"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
