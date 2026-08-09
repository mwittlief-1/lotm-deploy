(() => {
  "use strict";

  const params = new URLSearchParams(window.location.search);
  if (params.get("courtos") !== "1") return;

  const rendererKey = document.body.dataset.mapRenderer;
  const configuredParentOrigin = (() => {
    const value = params.get("parentOrigin");
    if (!value) return null;
    try { return new URL(value).origin; } catch { return null; }
  })();
  const themes = window.MERECROSS_CARTOGRAPHY_THEME_V1;
  let themeId = params.get("theme") || themes?.defaultThemeId || null;
  let theme = themes?.resolve?.(themeId) ?? null;
  let rendererUsable = false;

  function applyTheme(nextThemeId) {
    themeId = nextThemeId || themes?.defaultThemeId || themeId;
    theme = themes?.resolve?.(themeId) ?? theme;
    if (!theme) return;
    const root = document.documentElement;
    for (const [name, value] of Object.entries(theme.palette)) {
      root.style.setProperty(`--merecross-map-${name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`, value);
    }
    document.body.dataset.cartographyTheme = theme.id;
    window.dispatchEvent(new CustomEvent("merecross:cartography-theme", { detail: theme }));
  }

  function isCourtOsHost(event) {
    return Boolean(
      configuredParentOrigin &&
      event.source === window.parent &&
      event.origin === configuredParentOrigin
    );
  }

  function post(type, payload = {}) {
    if (!configuredParentOrigin || window.parent === window) return;
    window.parent.postMessage({ type, payload }, configuredParentOrigin);
  }

  function rendererError({ code = "RENDERER_INITIALIZATION_FAILED", message = "The terrain renderer could not be prepared." } = {}) {
    if (rendererUsable) return;
    post("merecross:spatial:error:v1", {
      schemaVersion: "merecross_spatial_adapter_v1",
      protocolVersion: 1,
      rendererKey,
      themeId: theme?.id ?? themeId,
      themeSchemaVersion: themes?.schemaVersion ?? null,
      themeVersion: themes?.version ?? null,
      code,
      message,
    });
  }

  function rendererReady({ rendererKey: reportedRendererKey = rendererKey } = {}) {
    if (rendererUsable) return;
    if (!rendererKey || reportedRendererKey !== rendererKey || !theme || !themes?.schemaVersion || !themes?.version) {
      rendererError({
        code: "RENDERER_CONTRACT_MISMATCH",
        message: "The terrain renderer did not match its embedded contract.",
      });
      return;
    }
    rendererUsable = true;
    post("merecross:spatial:ready:v1", {
      schemaVersion: "merecross_spatial_adapter_v1",
      protocolVersion: 1,
      rendererKey,
      themeId: theme.id,
      themeSchemaVersion: themes.schemaVersion,
      themeVersion: themes.version,
      firstUsableFrame: true,
      controls: ["drag", "zoom", "rotate", "north_reset"],
    });
  }

  window.addEventListener("message", (event) => {
    if (!isCourtOsHost(event) || !event.data || typeof event.data !== "object") return;
    const message = event.data;
    if (message.type === "merecross:spatial:init:v1") {
      applyTheme(message.payload?.themeId);
    } else if (message.type === "merecross:spatial:reset-north:v1") {
      const reset = document.querySelector("#compass, #reset, #reset-view, #view-context");
      if (reset instanceof HTMLElement) reset.click();
    } else if (message.type === "merecross:spatial:request-state:v1") {
      post("merecross:spatial:state:v1", { rendererKey, themeId, ready: rendererUsable });
    }
  });

  window.addEventListener("error", (event) => {
    rendererError({
      code: "RENDERER_SCRIPT_ERROR",
      message: typeof event?.message === "string" ? event.message : "The terrain renderer failed during initialization.",
    });
  });
  window.addEventListener("unhandledrejection", (event) => {
    const reason = event?.reason;
    rendererError({
      code: "RENDERER_PROMISE_REJECTION",
      message: reason instanceof Error ? reason.message : "The terrain renderer failed during initialization.",
    });
  });

  applyTheme(themeId);

  const style = document.createElement("style");
  style.dataset.courtosEmbeddedTheme = "v1";
  style.textContent = `
    body.courtos-viewer {
      background: var(--merecross-map-dark-timber, #2c2117) !important;
      color: var(--merecross-map-warm-vellum, #d8c9a6) !important;
    }
    body.courtos-viewer .controls,
    body.courtos-viewer .panel,
    body.courtos-viewer .title,
    body.courtos-viewer .masthead,
    body.courtos-viewer .scene-title,
    body.courtos-viewer .scene-help,
    body.courtos-viewer .help,
    body.courtos-viewer .compass,
    body.courtos-viewer .scope-nav { display: none !important; }
    body.courtos-viewer canvas {
      filter: saturate(.78) sepia(.12) contrast(.92) brightness(.88);
    }
    body.courtos-viewer .scene,
    body.courtos-viewer .scene-panel,
    body.courtos-viewer #estate-viewer {
      background: var(--merecross-map-dark-timber, #2c2117) !important;
    }
    body.courtos-viewer .scene::after,
    body.courtos-viewer .scene-panel::after,
    body.courtos-viewer #estate-viewer::after {
      content: "";
      position: absolute;
      inset: 0;
      z-index: 2;
      pointer-events: none;
      background:
        radial-gradient(circle at 52% 38%, transparent 28%, rgb(34 24 14 / 17%) 100%),
        linear-gradient(180deg, rgb(165 118 54 / 8%), transparent 26%, rgb(31 21 12 / 15%));
      box-shadow: inset 0 0 110px rgb(26 18 11 / 32%);
    }
    body.courtos-viewer .map-label {
      border: 1px solid rgb(178 138 69 / 48%) !important;
      border-radius: 2px !important;
      background: rgb(36 27 18 / 88%) !important;
      color: var(--merecross-map-warm-vellum, #d8c9a6) !important;
      font-family: Georgia, serif !important;
      box-shadow: 0 5px 14px rgb(18 12 8 / 30%) !important;
    }
    body.courtos-viewer .map-label.portfolio.active,
    body.courtos-viewer .map-label.focus {
      border-color: var(--merecross-map-muted-brass, #b28a45) !important;
      box-shadow: 0 0 0 2px rgb(178 138 69 / 24%), 0 5px 14px rgb(18 12 8 / 34%) !important;
    }
    body.courtos-viewer .map-label.neighbor_county {
      padding: 0 !important;
      border: 0 !important;
      background: transparent !important;
      box-shadow: none !important;
      color: var(--merecross-map-warm-vellum, #d8c9a6) !important;
      opacity: .72;
      text-shadow: 0 2px 5px rgb(11 9 6 / 72%) !important;
    }
  `;
  document.head.append(style);

  window.MERECROSS_EMBEDDED_ADAPTER_V1 = Object.freeze({
    rendererKey,
    parentOrigin: configuredParentOrigin,
    rendererReady,
    rendererError,
    getState: () => ({ themeId: theme?.id ?? themeId, rendererUsable }),
  });
})();
