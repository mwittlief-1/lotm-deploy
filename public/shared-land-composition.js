(function defineMerecrossSharedLandComposition() {
  "use strict";

  const TILE_SIZE = 384;
  const FAMILY_DEFINITIONS = Object.freeze({
    field: {
      source: "/assets/mapgen-landscape/materials/worked-arable-v1-1024.jpg",
      base: "#b69b57",
    },
    open: {
      source: "/assets/mapgen-landscape/materials/pasture-meadow-v1-1024.jpg",
      base: "#879764",
    },
    forest: {
      source: "/assets/mapgen-landscape/materials/copse-floor-v1-1024.jpg",
      base: "#526b49",
    },
    wet: {
      source: "/assets/mapgen-landscape/materials/damp-swale-v1-1024.jpg",
      base: "#6f8e7e",
    },
    hill: {
      source: "/assets/mapgen-landscape/materials/dry-ridge-v1-1024.jpg",
      base: "#8d7855",
    },
    mountain: {
      source: "/assets/mapgen-landscape/materials/fieldstone-v1-1024.jpg",
      base: "#777b79",
    },
    coast: {
      source: "/assets/mapgen-landscape/materials/dry-ridge-v1-1024.jpg",
      base: "#9b8c66",
    },
  });

  function seededRandom(seedText) {
    let state = 2166136261;
    for (const character of seedText) {
      state ^= character.charCodeAt(0);
      state = Math.imul(state, 16777619);
    }
    return () => {
      state = Math.imul(state ^ (state >>> 15), 2246822507);
      state = Math.imul(state ^ (state >>> 13), 3266489909);
      return ((state ^= state >>> 16) >>> 0) / 4294967296;
    };
  }

  function loadImage(source) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.decoding = "async";
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error(`Unable to load land texture ${source}.`));
      image.src = source;
    });
  }

  function pathThrough(context, points) {
    context.beginPath();
    context.moveTo(points[0][0], points[0][1]);
    for (let index = 1; index < points.length; index += 1) {
      const previous = points[index - 1];
      const current = points[index];
      const controlX = (previous[0] + current[0]) / 2;
      context.quadraticCurveTo(controlX, previous[1], current[0], current[1]);
    }
  }

  function addGrain(context, size, random) {
    context.save();
    context.globalCompositeOperation = "soft-light";
    for (let index = 0; index < 1900; index += 1) {
      const light = random() > 0.52;
      context.globalAlpha = 0.018 + random() * 0.045;
      context.fillStyle = light ? "#eee3bd" : "#263b2d";
      const radius = 0.35 + random() * 1.35;
      context.fillRect(random() * size, random() * size, radius * 2.2, radius);
    }
    context.restore();
  }

  function addFieldGrammar(context, size, random, variant) {
    context.save();
    context.translate(size / 2, size / 2);
    context.rotate((-0.34 + variant * 0.2) * Math.PI);
    context.translate(-size / 2, -size / 2);
    for (let band = -3; band < 13; band += 1) {
      const y = band * 38 + (random() - 0.5) * 15;
      context.fillStyle = band % 3 === 0 ? "rgb(105 84 43 / 13%)" : "rgb(228 209 137 / 11%)";
      context.fillRect(-size * 0.35, y, size * 1.7, 18 + random() * 12);
      context.strokeStyle = "rgb(73 68 42 / 20%)";
      context.lineWidth = 1.1;
      context.setLineDash([18 + random() * 16, 4 + random() * 7]);
      context.beginPath();
      context.moveTo(-size * 0.35, y + 17);
      context.lineTo(size * 1.35, y + 17 + (random() - 0.5) * 6);
      context.stroke();
    }
    context.restore();
  }

  function addOpenGrammar(context, size, random) {
    context.save();
    for (let patch = 0; patch < 28; patch += 1) {
      context.beginPath();
      context.ellipse(
        random() * size,
        random() * size,
        18 + random() * 50,
        5 + random() * 18,
        random() * Math.PI,
        0,
        Math.PI * 2,
      );
      context.fillStyle = random() > 0.5 ? "rgb(210 190 119 / 10%)" : "rgb(52 78 45 / 11%)";
      context.fill();
    }
    context.strokeStyle = "rgb(236 224 172 / 15%)";
    context.lineWidth = 1;
    for (let index = 0; index < 95; index += 1) {
      const x = random() * size;
      const y = random() * size;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (random() - 0.5) * 3, y - 2 - random() * 5);
      context.stroke();
    }
    context.restore();
  }

  function addForestGrammar(context, size, random) {
    context.save();
    context.globalCompositeOperation = "multiply";
    for (let cluster = 0; cluster < 78; cluster += 1) {
      const x = random() * size;
      const y = random() * size;
      const radius = 5 + random() * 16;
      const gradient = context.createRadialGradient(x - radius * 0.25, y - radius * 0.3, 1, x, y, radius);
      gradient.addColorStop(0, "rgb(115 139 82 / 30%)");
      gradient.addColorStop(0.54, "rgb(50 82 45 / 30%)");
      gradient.addColorStop(1, "rgb(24 48 32 / 5%)");
      context.fillStyle = gradient;
      context.beginPath();
      context.arc(x, y, radius, 0, Math.PI * 2);
      context.fill();
    }
    context.restore();
  }

  function addWetGrammar(context, size, random, variant) {
    context.save();
    context.lineCap = "round";
    for (let channel = 0; channel < 10; channel += 1) {
      const y = channel * 43 + (random() - 0.5) * 38;
      const points = [];
      for (let x = -32; x <= size + 40; x += 48) {
        points.push([x, y + Math.sin((x / size) * Math.PI * (2.5 + variant)) * (8 + random() * 12)]);
      }
      pathThrough(context, points);
      context.strokeStyle = channel % 2 ? "rgb(43 91 85 / 28%)" : "rgb(150 174 145 / 19%)";
      context.lineWidth = 2 + random() * 5;
      context.stroke();
    }
    context.strokeStyle = "rgb(51 82 55 / 22%)";
    context.lineWidth = 0.9;
    for (let reed = 0; reed < 145; reed += 1) {
      const x = random() * size;
      const y = random() * size;
      context.beginPath();
      context.moveTo(x, y);
      context.lineTo(x + (random() - 0.5) * 2, y - 4 - random() * 7);
      context.stroke();
    }
    context.restore();
  }

  function addHillGrammar(context, size, random, variant) {
    context.save();
    context.lineCap = "round";
    context.lineWidth = 1.5;
    for (let ridge = -2; ridge < 11; ridge += 1) {
      const y = ridge * 45 + (random() - 0.5) * 22;
      const points = [];
      for (let x = -25; x <= size + 25; x += 35) {
        points.push([x, y + Math.sin(x * 0.025 + ridge + variant) * (7 + random() * 7)]);
      }
      pathThrough(context, points);
      context.strokeStyle = ridge % 2 ? "rgb(68 61 43 / 24%)" : "rgb(222 205 152 / 15%)";
      context.stroke();
    }
    context.restore();
  }

  function addMountainGrammar(context, size, random, variant) {
    context.save();
    context.lineJoin = "round";
    for (let ridge = 0; ridge < 11; ridge += 1) {
      const startX = -40 + ridge * 45 + (random() - 0.5) * 26;
      const points = [
        [startX - 85, size + 35],
        [startX + 5, 40 + random() * 90],
        [startX + 100 + variant * 8, size + 35],
      ];
      context.beginPath();
      context.moveTo(points[0][0], points[0][1]);
      context.lineTo(points[1][0], points[1][1]);
      context.lineTo(points[2][0], points[2][1]);
      context.strokeStyle = "rgb(49 52 49 / 22%)";
      context.lineWidth = 2.2;
      context.stroke();
      context.beginPath();
      context.moveTo(points[1][0], points[1][1]);
      context.lineTo(points[1][0] + 38, points[1][1] + 94);
      context.strokeStyle = "rgb(219 216 192 / 16%)";
      context.lineWidth = 4.5;
      context.stroke();
    }
    context.restore();
  }

  function addCoastGrammar(context, size, random) {
    context.save();
    for (let shelf = 0; shelf < 8; shelf += 1) {
      const y = shelf * 55 + random() * 22;
      const points = [];
      for (let x = -30; x <= size + 30; x += 44) {
        points.push([x, y + Math.sin(x * 0.03 + shelf) * (5 + random() * 7)]);
      }
      pathThrough(context, points);
      context.strokeStyle = shelf % 2 ? "rgb(74 77 63 / 25%)" : "rgb(231 220 170 / 18%)";
      context.lineWidth = 1.2 + random() * 2.8;
      context.stroke();
    }
    context.restore();
  }

  function buildTile(family, definition, image, variant, size = TILE_SIZE) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const random = seededRandom(`${family}:${variant}:realm-land-v2`);

    context.fillStyle = definition.base;
    context.fillRect(0, 0, size, size);
    context.save();
    context.globalAlpha = 0.76;
    context.translate(variant ? size : 0, 0);
    context.scale(variant ? -1 : 1, 1);
    context.drawImage(image, 0, 0, size, size);
    context.restore();
    context.fillStyle = definition.base;
    context.globalAlpha = 0.22;
    context.fillRect(0, 0, size, size);
    context.globalAlpha = 1;

    if (family === "field") addFieldGrammar(context, size, random, variant);
    else if (family === "open") addOpenGrammar(context, size, random);
    else if (family === "forest") addForestGrammar(context, size, random);
    else if (family === "wet") addWetGrammar(context, size, random, variant);
    else if (family === "hill") addHillGrammar(context, size, random, variant);
    else if (family === "mountain") addMountainGrammar(context, size, random, variant);
    else if (family === "coast") addCoastGrammar(context, size, random);
    addGrain(context, size, random);
    return canvas;
  }

  function familyFor(hex, recipe = null) {
    const subtype = hex.landcover_subtype ?? recipe?.landcover_subtype ?? "";
    const terrain = hex.terrain ?? "";
    if (
      recipe?.procedural?.field_pattern_density >= 0.2 ||
      /rich_open_fields|mixed_smallholdings|high_fields|terraced_fields/.test(subtype)
    ) {
      return "field";
    }
    if (terrain === "forest" || /forest|wood|coppice|orchard/.test(subtype)) return "forest";
    if (terrain === "marsh" || /wet|damp|reed|fen|flood|salt_marsh|tidal/.test(subtype)) return "wet";
    if (terrain === "mountains" || /crag|scree|bare_ridge|alpine/.test(subtype)) return "mountain";
    if (terrain === "hills" || /rolling|upland|ridge|slope|heath/.test(subtype)) return "hill";
    if (terrain === "coast" || /shore|strand|coast|dune/.test(subtype)) return "coast";
    return "open";
  }

  function stableVariant(value) {
    let hash = 0;
    for (const character of String(value)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
    return (hash >>> 0) % 2;
  }

  let readyPromise = null;
  function load(size = TILE_SIZE) {
    if (readyPromise) return readyPromise;
    readyPromise = Promise.all(
      Object.entries(FAMILY_DEFINITIONS).map(async ([family, definition]) => {
        const image = await loadImage(definition.source);
        return [
          family,
          [
            buildTile(family, definition, image, 0, size),
            buildTile(family, definition, image, 1, size),
          ],
        ];
      }),
    ).then((entries) => new Map(entries));
    return readyPromise;
  }

  window.MERECROSS_SHARED_LAND = Object.freeze({
    familyDefinitions: FAMILY_DEFINITIONS,
    familyFor,
    load,
    stableVariant,
  });
})();
