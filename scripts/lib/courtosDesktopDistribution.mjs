import { createHash } from "node:crypto";
import { createReadStream, existsSync } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { execFile } from "node:child_process";
import { basename, join, relative, resolve, sep } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

export const DISTRIBUTION_SCHEMA_VERSION = "merecross_desktop_distribution_v1";
export const DEFAULT_DISTRIBUTION_CONFIG = "config/courtos-desktop-distribution.v1.json";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

export async function loadDistributionConfig(repositoryRoot, configPath = DEFAULT_DISTRIBUTION_CONFIG) {
  const absolutePath = resolve(repositoryRoot, configPath);
  const config = JSON.parse(await readFile(absolutePath, "utf8"));
  validateDistributionConfig(config);
  return { config, absolutePath };
}

export function validateDistributionConfig(config) {
  assert(config?.schema_version === DISTRIBUTION_SCHEMA_VERSION, "Desktop distribution schema version is invalid.");
  assert(config.product?.name === "Merecross", "Desktop distribution product name must be Merecross.");
  assert(config.product?.bundle_id === "com.vytis.merecross", "Desktop bundle identity is invalid.");
  assert(config.product?.steam_app_id === 5084580, "Steam App ID must be 5084580.");
  assert(config.product?.install_folder === "Merecross", "Steam install folder must be Merecross.");

  const mac = config.platforms?.["macos-arm64"];
  assert(mac?.artifact_name === "Merecross.app", "macOS artifact name must be Merecross.app.");
  assert(mac?.executable_relative_path === "Merecross.app", "Steam must launch the macOS app bundle.");
  assert(mac?.steam?.depot_id === 5084581, "macOS Steam depot must be 5084581.");
  assert(mac?.steam?.operating_system === "macOS", "macOS launch option is not platform scoped.");

  const windows = config.platforms?.["windows-x64"];
  assert(windows?.artifact_name === "Merecross.exe", "Windows artifact name must be Merecross.exe.");
  assert(windows?.steam?.depot_id === null, "Windows depot must fail closed until Steam assigns an ID.");
  assert(Array.isArray(windows?.blocking_dependencies) && windows.blocking_dependencies.length > 0,
    "Windows packaging dependencies must remain explicit.");

  for (const [name, channel] of Object.entries(config.channels ?? {})) {
    if (name === "local_uat") continue;
    assert(channel.signing === "developer_id_application", `${name} must require Developer ID signing.`);
    assert(channel.notarization_required === true, `${name} must require Apple notarization.`);
    assert(channel.set_live_automatically === false, `${name} must never set a Steam build live automatically.`);
  }
  assert(config.steam_safety?.set_live_forbidden_in_generated_vdf === true,
    "Steam upload configuration must forbid automatic branch promotion.");
  return config;
}

export function platformContract(config, platformKey) {
  const contract = config.platforms?.[platformKey];
  assert(contract, `Unknown desktop distribution platform: ${platformKey}`);
  return contract;
}

export function channelContract(config, channelName) {
  const channel = config.channels?.[channelName];
  assert(channel, `Unknown desktop distribution channel: ${channelName}`);
  return channel;
}

export async function sha256File(filePath) {
  const hash = createHash("sha256");
  await new Promise((resolvePromise, reject) => {
    const stream = createReadStream(filePath);
    stream.on("data", (chunk) => hash.update(chunk));
    stream.on("error", reject);
    stream.on("end", resolvePromise);
  });
  return hash.digest("hex");
}

async function run(command, args, options = {}) {
  try {
    const result = await execFileAsync(command, args, { encoding: "utf8", ...options });
    return { ok: true, stdout: result.stdout ?? "", stderr: result.stderr ?? "" };
  } catch (error) {
    return {
      ok: false,
      stdout: error?.stdout ?? "",
      stderr: error?.stderr ?? "",
      message: error instanceof Error ? error.message : String(error),
    };
  }
}

async function plistValue(appPath, key) {
  const plist = join(appPath, "Contents", "Info.plist");
  const result = await run("/usr/libexec/PlistBuddy", ["-c", `Print :${key}`, plist]);
  assert(result.ok, `Unable to read ${key} from ${plist}: ${result.stderr || result.message}`);
  return result.stdout.trim();
}

export async function inspectMacApplication(appPath, { requireNotarized = false } = {}) {
  const absoluteAppPath = resolve(appPath);
  assert(existsSync(absoluteAppPath), `macOS application does not exist: ${absoluteAppPath}`);
  assert(basename(absoluteAppPath) === "Merecross.app", "macOS artifact must be named Merecross.app.");

  const bundleId = await plistValue(absoluteAppPath, "CFBundleIdentifier");
  const executable = await plistValue(absoluteAppPath, "CFBundleExecutable");
  const version = await plistValue(absoluteAppPath, "CFBundleShortVersionString");
  assert(bundleId === "com.vytis.merecross", `Unexpected macOS bundle identifier: ${bundleId}`);
  assert(executable === "Merecross", `Unexpected macOS executable: ${executable}`);

  const executablePath = join(absoluteAppPath, "Contents", "MacOS", executable);
  assert(existsSync(executablePath), `macOS executable is missing: ${executablePath}`);
  const fileResult = await run("file", [executablePath]);
  assert(fileResult.ok, `Unable to inspect macOS executable architecture: ${fileResult.stderr || fileResult.message}`);
  const architectures = ["arm64", "x86_64"].filter((architecture) => fileResult.stdout.includes(architecture));
  assert(architectures.length > 0, `Unsupported macOS executable architecture: ${fileResult.stdout.trim()}`);

  const verifyResult = await run("codesign", ["--verify", "--deep", "--strict", "--verbose=2", absoluteAppPath]);
  assert(verifyResult.ok, `macOS code signature is invalid: ${verifyResult.stderr || verifyResult.message}`);
  const detailResult = await run("codesign", ["-dv", "--verbose=4", absoluteAppPath]);
  const signatureDetails = `${detailResult.stdout}\n${detailResult.stderr}`;
  const developerIdSigned = /Authority=Developer ID Application:/.test(signatureDetails);
  const adhocSigned = /Signature=adhoc/.test(signatureDetails) || /flags=0x2\(adhoc\)/.test(signatureDetails);

  const assessment = await run("spctl", ["-a", "-vv", "-t", "exec", absoluteAppPath]);
  const assessmentText = `${assessment.stdout}\n${assessment.stderr}`;
  const notarized = assessment.ok && /source=Notarized Developer ID/.test(assessmentText);
  const staple = await run("xcrun", ["stapler", "validate", absoluteAppPath]);
  const ticketStapled = staple.ok;

  if (requireNotarized) {
    assert(developerIdSigned, "External macOS distribution requires a Developer ID Application signature.");
    assert(notarized, `External macOS distribution requires Gatekeeper notarization acceptance: ${assessmentText.trim()}`);
    assert(ticketStapled, `External macOS distribution requires a stapled notarization ticket: ${staple.stderr || staple.message}`);
  }

  const executableStats = await stat(executablePath);
  return {
    app_path: absoluteAppPath,
    bundle_id: bundleId,
    version,
    executable,
    executable_path: executablePath,
    executable_bytes: executableStats.size,
    executable_sha256: await sha256File(executablePath),
    architectures,
    signing: developerIdSigned ? "developer_id_application" : adhocSigned ? "adhoc" : "other",
    gatekeeper_accepted: assessment.ok,
    notarized,
    ticket_stapled: ticketStapled,
  };
}

function vdfEscape(value) {
  return String(value).replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

export function renderSteamDepotVdf({ depotId, contentRoot }) {
  assert(Number.isInteger(depotId) && depotId > 0, "Steam depot ID is invalid.");
  assert(contentRoot, "Steam content root is required.");
  return `"DepotBuildConfig"\n{\n` +
    `  "DepotID" "${depotId}"\n` +
    `  "ContentRoot" "${vdfEscape(resolve(contentRoot))}"\n` +
    `  "FileMapping"\n  {\n` +
    `    "LocalPath" "*"\n` +
    `    "DepotPath" "."\n` +
    `    "recursive" "1"\n` +
    `  }\n` +
    `  "FileExclusion" "*.DS_Store"\n` +
    `  "FileExclusion" "**/.DS_Store"\n` +
    `}\n`;
}

export function renderSteamAppVdf({ appId, description, buildOutput, depotId, depotVdfPath, preview = false }) {
  assert(Number.isInteger(appId) && appId > 0, "Steam App ID is invalid.");
  assert(Number.isInteger(depotId) && depotId > 0, "Steam depot ID is invalid.");
  const rendered = `"AppBuild"\n{\n` +
    `  "AppID" "${appId}"\n` +
    `  "Desc" "${vdfEscape(description)}"\n` +
    `  "BuildOutput" "${vdfEscape(resolve(buildOutput))}"\n` +
    `  "Preview" "${preview ? "1" : "0"}"\n` +
    `  "Local" ""\n` +
    `  "Depots"\n  {\n` +
    `    "${depotId}" "${vdfEscape(resolve(depotVdfPath))}"\n` +
    `  }\n` +
    `}\n`;
  assert(!/SetLive/i.test(rendered), "Generated Steam VDF must never promote a branch automatically.");
  return rendered;
}

export async function directoryBytes(rootPath) {
  const { readdir } = await import("node:fs/promises");
  let bytes = 0;
  for (const entry of await readdir(rootPath, { withFileTypes: true })) {
    const entryPath = join(rootPath, entry.name);
    if (entry.isDirectory()) bytes += await directoryBytes(entryPath);
    else if (entry.isFile()) bytes += (await stat(entryPath)).size;
  }
  return bytes;
}

export function relativePortable(from, to) {
  return relative(from, to).split(sep).join("/");
}
