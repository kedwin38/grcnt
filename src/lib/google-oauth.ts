// Minimal Google OAuth 2.0 (Authorization Code flow) — no SDK dependency,
// same philosophy as src/lib/totp.ts. The ID token is only ever read from a
// response we fetched ourselves, server-to-server, over TLS directly from
// Google's token endpoint — never one supplied by the browser — so decoding
// its payload without re-verifying the JWT signature is safe here.

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

export type GoogleIdTokenPayload = {
  sub: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
};

export function buildGoogleAuthUrl(opts: {
  clientId: string;
  redirectUri: string;
  state: string;
}): string {
  const url = new URL(AUTH_ENDPOINT);
  url.searchParams.set("client_id", opts.clientId);
  url.searchParams.set("redirect_uri", opts.redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", "openid email profile");
  url.searchParams.set("state", opts.state);
  url.searchParams.set("prompt", "select_account");
  url.searchParams.set("access_type", "online");
  return url.toString();
}

export class GoogleOAuthError extends Error {}

export async function exchangeGoogleCode(opts: {
  code: string;
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}): Promise<GoogleIdTokenPayload> {
  const res = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code: opts.code,
      client_id: opts.clientId,
      client_secret: opts.clientSecret,
      redirect_uri: opts.redirectUri,
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    throw new GoogleOAuthError(`Google token exchange failed (${res.status})`);
  }
  const json = (await res.json()) as { id_token?: string };
  if (!json.id_token) throw new GoogleOAuthError("Google did not return an ID token");
  return decodeGoogleIdToken(json.id_token);
}

function decodeGoogleIdToken(idToken: string): GoogleIdTokenPayload {
  const parts = idToken.split(".");
  if (parts.length !== 3) throw new GoogleOAuthError("Malformed ID token");
  const json = Buffer.from(parts[1].replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  return JSON.parse(json) as GoogleIdTokenPayload;
}
