"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Plus, UserCog } from "lucide-react";
import { api } from "@/lib/client";
import { prettyPhone } from "@/lib/format";

type StaffMember = {
  id: number;
  name: string;
  phone: string;
  role: "STAFF" | "ADMIN";
  active: boolean;
  createdAt: string;
};

export function StaffManager({
  staff,
  currentAdminId,
}: {
  staff: StaffMember[];
  currentAdminId: number;
}) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"STAFF" | "ADMIN">("STAFF");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setBusy(true);
    try {
      await api("/api/admin/staff", { body: { name, phone, password, role } });
      setName("");
      setPhone("");
      setPassword("");
      setRole("STAFF");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create staff account.");
    } finally {
      setBusy(false);
    }
  }

  async function patch(id: number, body: Record<string, unknown>, msg: string) {
    setError(null);
    setNotice(null);
    try {
      await api(`/api/admin/staff/${id}`, { method: "PATCH", body });
      setNotice(msg);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed.");
    }
  }

  async function resetPassword(member: StaffMember) {
    const pw = prompt(
      `New password for ${member.name} (min 8 characters):`,
      ""
    );
    if (!pw) return;
    if (pw.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    await patch(member.id, { newPassword: pw }, `Password reset for ${member.name}.`);
  }

  return (
    <>
      {error ? <p className="field-error">{error}</p> : null}
      {notice ? (
        <p className="text-[13px] font-semibold text-brand-700">{notice}</p>
      ) : null}

      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-paper">
            <tr>
              <th className="th">Member</th>
              <th className="th">Role</th>
              <th className="th">Status</th>
              <th className="th">Joined</th>
              <th className="th text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {staff.map((member) => (
              <tr key={member.id} className={member.active ? "" : "opacity-60"}>
                <td className="td">
                  <div className="font-bold text-ink">{member.name}</div>
                  <div className="text-[12px] text-ink-mute">{prettyPhone(member.phone)}</div>
                </td>
                <td className="td">
                  <span className={`badge ${member.role === "ADMIN" ? "badge-green" : "badge-blue"}`}>
                    {member.role}
                  </span>
                </td>
                <td className="td">
                  {member.active ? (
                    <span className="badge badge-green">Active</span>
                  ) : (
                    <span className="badge badge-gray">Disabled</span>
                  )}
                </td>
                <td className="td text-[13px]">{member.createdAt}</td>
                <td className="td">
                  <div className="flex justify-end gap-1.5 flex-wrap">
                    <button className="btn btn-sm btn-outline" onClick={() => resetPassword(member)}>
                      <KeyRound className="w-3.5 h-3.5" /> Reset pw
                    </button>
                    <button
                      className="btn btn-sm btn-outline"
                      onClick={() =>
                        patch(
                          member.id,
                          { role: member.role === "ADMIN" ? "STAFF" : "ADMIN" },
                          `${member.name} is now ${member.role === "ADMIN" ? "STAFF" : "ADMIN"}.`
                        )
                      }
                    >
                      <UserCog className="w-3.5 h-3.5" /> {member.role === "ADMIN" ? "Make staff" : "Make admin"}
                    </button>
                    {member.id !== currentAdminId ? (
                      <button
                        className={`btn btn-sm ${member.active ? "btn-ghost text-red-600 hover:bg-red-50" : "btn-primary"}`}
                        onClick={() =>
                          patch(
                            member.id,
                            { active: !member.active },
                            `${member.name} ${member.active ? "disabled" : "re-enabled"}.`
                          )
                        }
                      >
                        {member.active ? "Disable" : "Enable"}
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={create} className="card p-6 space-y-4">
        <h2 className="font-extrabold text-ink">Add a team member</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="label">Name</label>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} placeholder="e.g. Sam Mwangi" />
          </div>
          <div>
            <label className="label">Phone number</label>
            <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} required inputMode="tel" placeholder="0712 345 678" />
          </div>
          <div>
            <label className="label">Temporary password (share privately)</label>
            <input className="input" type="text" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} placeholder="At least 8 characters" autoComplete="off" />
          </div>
          <div>
            <label className="label">Role</label>
            <select className="input" value={role} onChange={(e) => setRole(e.target.value as "STAFF" | "ADMIN")}>
              <option value="STAFF">Staff — orders, products, support</option>
              <option value="ADMIN">Admin — everything incl. settings</option>
            </select>
          </div>
        </div>
        <button className="btn btn-md btn-primary" disabled={busy}>
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          Create account
        </button>
      </form>
    </>
  );
}
