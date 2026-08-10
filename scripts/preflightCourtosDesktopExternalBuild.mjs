#!/usr/bin/env node
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = resolve(import.meta.dirname, "..");
const brandedIconPath = resolve(repositoryRoot, "desktop/build/icon.icns");

if (process.platform !== "darwin") {
  throw new Error("Developer ID signing and Apple notarization preflight must run on macOS.");
}

let identities = "";
try {
  const result = await execFileAsync("security", ["find-identity", "-v", "-p", "codesigning"], {
    encoding: "utf8",
  });
  identities = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
} catch (error) {
  identities = `${error?.stdout ?? ""}\n${error?.stderr ?? ""}`;
}
const developerIdAvailable = /Developer ID Application:/.test(identities);
const appleIdCredentials = Boolean(
  process.env.APPLE_ID && process.env.APPLE_APP_SPECIFIC_PASSWORD && process.env.APPLE_TEAM_ID,
);
const apiKeyCredentials = Boolean(
  process.env.APPLE_API_KEY && process.env.APPLE_API_KEY_ID && process.env.APPLE_API_ISSUER,
);
const signingCredential = developerIdAvailable || Boolean(process.env.CSC_LINK);
const notarizationCredential = appleIdCredentials || apiKeyCredentials;
const brandedIconAvailable = existsSync(brandedIconPath);

const result = {
  schema_version: "merecross_macos_external_build_preflight_v1",
  status: signingCredential && notarizationCredential && brandedIconAvailable ? "ready" : "blocked",
  branded_app_icon_available: brandedIconAvailable,
  branded_app_icon_path: brandedIconPath,
  developer_id_identity_available: developerIdAvailable,
  csc_link_available: Boolean(process.env.CSC_LINK),
  notarization_credential_mode: appleIdCredentials
    ? "apple_id_app_password"
    : apiKeyCredentials
      ? "app_store_connect_api_key"
      : "missing",
  required_actions: [
    ...(!brandedIconAvailable ? ["provide the approved Merecross macOS app icon at desktop/build/icon.icns"] : []),
    ...(!signingCredential ? ["install a Developer ID Application identity or provide CSC_LINK"] : []),
    ...(!notarizationCredential ? ["provide Apple notarization credentials through the build environment"] : []),
  ],
  secret_values_recorded: false,
};
console.log(JSON.stringify(result, null, 2));
if (result.status !== "ready") process.exitCode = 2;
