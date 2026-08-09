(() => {
  "use strict";

  const theme = Object.freeze({
    id: "merecross_courtos_cartography_v1",
    label: "Merecross estate survey",
    palette: Object.freeze({
      realmInk: "#17130e",
      darkTimber: "#2c2117",
      warmVellum: "#d8c9a6",
      archiveStone: "#8c846f",
      mutedBrass: "#b28a45",
      riverSlate: "#526d6d",
      mist: "#b8b39f",
      dangerWax: "#8b302b",
    }),
    semantics: Object.freeze({
      route: Object.freeze({ meaning: "movement", color: "#b28a45", stroke: 8, cap: "round" }),
      waterway: Object.freeze({ meaning: "constraint", color: "#526d6d", stroke: 10, cap: "round" }),
      boundary: Object.freeze({ meaning: "jurisdiction", color: "#8c846f", stroke: 4, dash: [18, 14] }),
      crossing: Object.freeze({ meaning: "decision", color: "#b28a45", form: "hollow_node" }),
      witness: Object.freeze({ meaning: "authority", color: "#b28a45", form: "solid_node_with_tick" }),
      recordTick: Object.freeze({ meaning: "memory", color: "#b28a45", form: "short_strong_short" }),
    }),
    terrain: Object.freeze({
      plains: "#8f895f",
      forest: "#506346",
      hills: "#8d6d4d",
      mountains: "#777870",
      marsh: "#5c7569",
      coast: "#9d8d65",
      water: "#526d6d",
    }),
    labels: Object.freeze({
      placeInk: "#d8c9a6",
      metadataInk: "#8c846f",
      surface: "#241b12",
      rule: "#b28a45",
      selectedRule: "#d8b86a",
    }),
    states: Object.freeze({
      hover: Object.freeze({ color: "#d8c9a6", opacity: 0.72 }),
      selectedManor: Object.freeze({ color: "#d8b86a", form: "crossing_ring", opacity: 0.96 }),
      unknown: Object.freeze({ color: "#8c846f", fog: "#777765", opacity: 0.46, pattern: "broken_record" }),
    }),
    material: Object.freeze({
      saturation: 0.78,
      contrast: 0.92,
      brightness: 0.88,
      sepia: 0.12,
      warmLight: "#d8bd88",
      ambient: "#7c755f",
      fog: "#777765",
    }),
    visual: Object.freeze({
      environment: Object.freeze({
        void: "#34352e",
        skyTop: "#4f5d59",
        horizon: "#7d7b68",
        groundMist: "#9b8f72",
        fog: "#68695c",
      }),
      lighting: Object.freeze({
        hemisphereSky: "#cbbf9f",
        hemisphereGround: "#35382f",
        hemisphereIntensity: 1.32,
        sun: "#d9bd88",
        sunIntensity: 2.05,
        fill: "#7d8c87",
        fillIntensity: 0.24,
        exposure: 0.82,
      }),
      material: Object.freeze({
        terrainLift: "#a59672",
        terrainLiftMix: 0.18,
        contextLiftMix: 0.08,
        terrainRoughness: 0.95,
        textureSaturation: 0.78,
      }),
      water: Object.freeze({
        deep: "#465f61",
        shallow: "#5f7774",
        bank: "#485247",
        shore: "#756d56",
        glint: "#aaa98e",
        glintOpacity: 0.12,
      }),
      routes: Object.freeze({
        verge: "#4c4938",
        bed: "#806343",
        wear: "#a28760",
        boundary: "#6f6856",
        jurisdiction: "#342f27",
        grid: "#5b5749",
      }),
      labels: Object.freeze({
        surface: "rgba(31, 25, 18, 0.88)",
        surfaceSolid: "#1f1912",
        placeInk: "#ded2b4",
        metadataInk: "#aaa18b",
        rule: "#9f7d43",
        selectedRule: "#d0ad64",
        shadow: "rgba(11, 9, 6, 0.46)",
        radius: 2,
      }),
      selection: Object.freeze({
        fill: "#c8a65e",
        fillOpacity: 0.18,
        rule: "#d5b66b",
      }),
    }),
    motion: Object.freeze({
      routeDrawMs: 640,
      waterFlowMs: 1800,
      boundaryExtendMs: 520,
      crossingRevealMs: 180,
      witnessSettleMs: 220,
      recordStampMs: 220,
    }),
  });

  window.MERECROSS_CARTOGRAPHY_THEME_V1 = Object.freeze({
    schemaVersion: "merecross_cartography_theme_v1",
    version: "1.0.0",
    defaultThemeId: theme.id,
    themes: Object.freeze({ [theme.id]: theme }),
    resolve(themeId) {
      return this.themes[themeId] ?? this.themes[this.defaultThemeId];
    },
  });
})();
