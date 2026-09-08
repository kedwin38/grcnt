"use client";

// Client-side fetch helper: attaches the CSRF double-submit header and
// normalises the JSON envelope into either data or a thrown Error.

function csrfToken(): string {
  const match = document.cookie.match(/(?:^|;\s*)gcn_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : "";
}

export async function api<T = unknown>(
  path: string,
  opts: { method?: string; body?: unknown } = {}
): Promise<T> {
  const res = await fetch(path, {
    method: opts.method || (opts.body ? "POST" : "GET"),
    headers: {
      "Content-Type": "application/json",
      "x-csrf-token": csrfToken(),
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  let payload: { ok: boolean; data?: T; error?: string } | null = null;
  try {
    payload = await res.json();
  } catch {
    /* non-JSON */
  }
  if (!res.ok || !payload || payload.ok !== true) {
    throw new Error(payload?.error || `Request failed (${res.status})`);
  }
  return payload.data as T;
}

export function getCookie(name: string): string | null {
  const match = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}
