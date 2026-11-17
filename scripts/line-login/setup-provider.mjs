// LINE Login spike: registers LINE as a Supabase custom OAuth2 provider ("custom:line").
//
// Usage (reads values from the environment, never from this file):
//   LINE_CHANNEL_ID=... LINE_CHANNEL_SECRET=... SUPABASE_SERVICE_ROLE_KEY=... \
//   node scripts/line-login/setup-provider.mjs
//
// NEXT_PUBLIC_SUPABASE_URL is read from the environment or from .env.local.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

function fromEnvFile(name) {
  try {
    const line = readFileSync(".env.local", "utf8").split(/\r?\n/).find((row) => row.startsWith(name + "="));
    return line?.slice(name.length + 1).trim();
  } catch {
    return undefined;
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL || fromEnvFile("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || fromEnvFile("SUPABASE_SERVICE_ROLE_KEY");
const channelId = process.env.LINE_CHANNEL_ID || fromEnvFile("LINE_CHANNEL_ID");
const channelSecret = process.env.LINE_CHANNEL_SECRET || fromEnvFile("LINE_CHANNEL_SECRET");

const missing = Object.entries({ NEXT_PUBLIC_SUPABASE_URL: url, SUPABASE_SERVICE_ROLE_KEY: serviceKey, LINE_CHANNEL_ID: channelId, LINE_CHANNEL_SECRET: channelSecret })
  .filter(([, value]) => !value).map(([name]) => name);
if (missing.length) {
  console.error("Missing: " + missing.join(", "));
  process.exit(1);
}

const identifier = "custom:line";
const config = {
  name: "LINE",
  client_id: channelId,
  client_secret: channelSecret,
  // LINE Login v2.1 endpoints. "openid profile" gives a stable user id (sub), display name and picture.
  authorization_url: "https://access.line.me/oauth2/v2.1/authorize",
  token_url: "https://api.line.me/oauth2/v2.1/token",
  userinfo_url: "https://api.line.me/oauth2/v2.1/userinfo",
  scopes: ["openid", "profile"],
  // Many LINE users have no email, and email needs a separate LINE approval.
  email_optional: true,
  pkce_enabled: true,
  enabled: true,
};

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } }).auth.admin;
const existing = await admin.customProviders.getProvider(identifier);
const result = existing.data
  ? await admin.customProviders.updateProvider(identifier, config)
  : await admin.customProviders.createProvider({ provider_type: "oauth2", identifier, ...config });

if (result.error) {
  console.error("Failed:", result.error.message);
  process.exit(1);
}
const { client_id, enabled, email_optional, scopes, authorization_url } = result.data;
console.log((existing.data ? "Updated " : "Created ") + identifier, { client_id, enabled, email_optional, scopes, authorization_url });
