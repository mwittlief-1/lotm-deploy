(function defineMerecrossSharedWaterTexture() {
  "use strict";

  const BASE_SIZE = 512;
  const BASE_COLOR = "#527f89";

  function createCanvas(size = BASE_SIZE) {
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    const scale = size / BASE_SIZE;

    context.fillStyle = BASE_COLOR;
    context.fillRect(0, 0, size, size);

    let randomState = 27;
    const random = () => {
      randomState = (randomState * 1664525 + 1013904223) >>> 0;
      return randomState / 4294967296;
    };

    context.save();
    context.globalAlpha = 0.08;
    for (let index = 0; index < 1600; index += 1) {
      const light = random() > 0.48;
      context.fillStyle = light ? "#a8c0bd" : "#274f59";
      const x = random() * size;
      const y = random() * size;
      const length = (0.6 + random() * 2.2) * scale;
      context.fillRect(x, y, length, Math.max(0.5, 0.8 * scale));
    }
    context.restore();

    const waves = [
      [64, 9, "#b4c9c4", 0.18, 3],
      [128, 7, "#294f5a", 0.2, 6],
      [196, 10, "#9fbcb9", 0.2, 2.4],
      [258, 8, "#264f59", 0.18, 5],
      [326, 10, "#b7ccc6", 0.17, 2.6],
      [392, 8, "#274f5a", 0.19, 5.5],
      [458, 9, "#aac2be", 0.18, 2.5],
    ];
    for (const [baseY, amplitude, color, opacity, width] of waves) {
      context.beginPath();
      for (let x = 0; x <= BASE_SIZE; x += 8) {
        const y = baseY + Math.sin((x / BASE_SIZE) * Math.PI * 4) * amplitude;
        if (x === 0) context.moveTo(0, y * scale);
        else context.lineTo(x * scale, y * scale);
      }
      context.strokeStyle = color;
      context.globalAlpha = opacity;
      context.lineWidth = width * scale;
      context.lineCap = "round";
      context.stroke();
    }

    const glints = [
      [42, 101, 56],
      [246, 165, 56],
      [390, 228, 64],
      [94, 291, 56],
      [278, 355, 60],
      [430, 423, 56],
    ];
    context.globalAlpha = 0.18;
    context.strokeStyle = "#d3ddd4";
    context.lineWidth = 1.4 * scale;
    context.lineCap = "round";
    for (const [x, y, length] of glints) {
      context.beginPath();
      context.moveTo(x * scale, y * scale);
      context.quadraticCurveTo(
        (x + length / 2) * scale,
        (y - 5) * scale,
        (x + length) * scale,
        y * scale,
      );
      context.stroke();
    }
    context.globalAlpha = 1;
    return canvas;
  }

  window.MERECROSS_SHARED_WATER = Object.freeze({
    baseColor: BASE_COLOR,
    createCanvas,
  });
})();
