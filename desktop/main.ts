import { app, BrowserWindow, ipcMain, protocol } from "electron";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { extname, join, resolve } from "node:path";
import {
  CourtScribeFiscalLocalHost,
  courtScribeLocalInstall,
  developmentCourtScribeRoot,
} from "./courtScribeLocalHost";
import { safeRendererAssetPath } from "./safeRendererPath";
import { CourtOsPlayerSqliteStoreV1 } from "./courtosPlayerStore";

const rendererRoot = join(import.meta.dirname, "renderer");

// Register before Electron is ready so relative renderer assets and fetches
// share a single secure, standard application origin. Without this, Chromium
// treats merecross:// as an opaque scheme and the packaged renderer can paint
// a blank window even though the native process is healthy.
protocol.registerSchemesAsPrivileged([
  {
    scheme: "merecross",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

function safeRendererPath(url: URL): string | null {
  return safeRendererAssetPath(rendererRoot, url);
}

function contentTypeFor(assetPath: string): string {
  switch (extname(assetPath).toLowerCase()) {
    case ".html": return "text/html; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".svg": return "image/svg+xml";
    case ".png": return "image/png";
    case ".jpg":
    case ".jpeg": return "image/jpeg";
    case ".webp": return "image/webp";
    case ".avif": return "image/avif";
    case ".woff2": return "font/woff2";
    default: return "application/octet-stream";
  }
}

function focusPrimaryWindow(): void {
  const window = BrowserWindow.getAllWindows()[0];
  if (!window) return;
  if (window.isMinimized()) window.restore();
  window.show();
  window.focus();
}

async function createWindow(): Promise<void> {
  const window = new BrowserWindow({
    width: 1440,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    title: "Merecross",
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      preload: join(import.meta.dirname, "preload.cjs"),
    },
  });
  window.webContents.on("did-fail-load", (_event, code, description, url) => {
    console.error(`[Merecross renderer] failed to load ${url}: ${code} ${description}`);
  });
  window.webContents.on("console-message", (_event, level, message, line, sourceId) => {
    if (level > 1) {
      console.error(`[Merecross renderer] ${sourceId}:${line} ${message}`);
    }
  });
  window.once("ready-to-show", () => window.show());
  await window.loadURL("merecross://app/courtos-home.html");
}

const hasSingleInstanceLock = app.requestSingleInstanceLock();
if (!hasSingleInstanceLock) {
  // Steam and Finder can both deliver a second launch request. The running
  // client owns the player database and must remain the only writer.
  app.quit();
} else {
  app.on("second-instance", focusPrimaryWindow);
  app.whenReady().then(async () => {
  process.env.COURTOS_DATA_ROOT = app.isPackaged
    ? process.resourcesPath
    : resolve(import.meta.dirname, "..", "..");
  const { handleDesktopCourtOsApi } = await import("./courtosDesktopService");
  const playerStore = new CourtOsPlayerSqliteStoreV1(
    join(app.getPath("userData"), "merecross-player-v1.sqlite"),
  );
  const playerStoreReply = <T>(operation: () => T) => {
    try {
      return { ok: true as const, value: operation() };
    } catch (error) {
      return {
        ok: false as const,
        message:
          error instanceof Error
            ? error.message
            : "CourtOS player store operation failed.",
      };
    }
  };
  ipcMain.on("courtos:player-store:get", (event, key: unknown) => {
    event.returnValue = playerStoreReply(() => playerStore.getItem(key));
  });
  ipcMain.on("courtos:player-store:set", (event, key: unknown, value: unknown) => {
    event.returnValue = playerStoreReply(() => playerStore.setItem(key, value));
  });
  ipcMain.on("courtos:player-store:remove", (event, key: unknown) => {
    event.returnValue = playerStoreReply(() => playerStore.removeItem(key));
  });
  const scribeRoot = app.isPackaged
    ? join(process.resourcesPath, "courtos-scribe")
    : developmentCourtScribeRoot();
  const fiscalScribe = new CourtScribeFiscalLocalHost(
    courtScribeLocalInstall(scribeRoot),
  );
  const persistScribeTelemetry = async (): Promise<void> => {
    // Packaged diagnostics are deliberately fact-free. They record only local
    // runtime phase/backend/latency so real Metal performance can be assessed
    // without retaining a House, person, claim, prompt, Matter, or prose.
    if (!app.isPackaged) return;
    const diagnosticsRoot = join(app.getPath("userData"), "diagnostics");
    await mkdir(diagnosticsRoot, { recursive: true });
    await writeFile(
      join(diagnosticsRoot, "courtos-scribe-runtime-telemetry-v1.json"),
      `${JSON.stringify(fiscalScribe.status(), null, 2)}\n`,
      "utf8",
    );
  };
  const recordScribeTelemetry = (): void => {
    void persistScribeTelemetry().catch((error) => {
      console.error(`[CourtOS Scribe] telemetry write failed: ${String(error)}`);
    });
  };
  // The renderer receives one constrained local-generation method only. It
  // accepts a compiled packet, never a general prompt, query, or data handle.
  ipcMain.handle("courtos:scribe:fiscal-brief", async (_event, request: unknown) => {
    const result = await fiscalScribe.fiscalBrief(request);
    recordScribeTelemetry();
    return result;
  });
  ipcMain.handle("courtos:scribe:briefing", async (_event, request: unknown) => {
    const result = await fiscalScribe.briefing(request);
    recordScribeTelemetry();
    return result;
  });
  ipcMain.handle("courtos:scribe:warm", async () => {
    const ready = await fiscalScribe.warm();
    recordScribeTelemetry();
    return ready;
  });
  ipcMain.handle("courtos:scribe:status", () => fiscalScribe.status());
  protocol.handle("merecross", async (request) => {
    const url = new URL(request.url);
    if (url.hostname !== "app") return new Response("Not found", { status: 404 });
    if (url.pathname.startsWith("/api/")) {
      return handleDesktopCourtOsApi(request);
    }
    const assetPath = safeRendererPath(url);
    if (!assetPath) return new Response("Not found", { status: 404 });
    try {
      return new Response(await readFile(assetPath), {
        headers: { "content-type": contentTypeFor(assetPath) },
      });
    } catch {
      return new Response("Not found", { status: 404 });
    }
  });
  await createWindow();
  // Do not tax launch or the Council Room with a 2.3 GB model load. Once the
  // application is visibly interactive, warm a single resident Scribe server
  // in the background so an entered responsibility can answer at warm speed.
  setTimeout(() => {
    void fiscalScribe.warm()
      .then(recordScribeTelemetry)
      .catch((error) => {
        recordScribeTelemetry();
        console.error(`[CourtOS Scribe] background warm failed: ${String(error)}`);
      });
  }, 750);
  app.once("before-quit", () => {
    fiscalScribe.dispose();
    playerStore.close();
  });
  });
}

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) void createWindow();
});
