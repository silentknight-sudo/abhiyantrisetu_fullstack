import * as THREE from 'three';

/**
 * Small procedural textures drawn on a canvas, so the 3D scenes look like real brick,
 * concrete and soil without loading any image files.
 */
function canvasTexture(
  size: number,
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  repeat: [number, number],
) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  draw(canvas.getContext('2d')!, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/** Deterministic noise so textures look the same on every load. */
function rng(seed: number) {
  return () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
}

function speckle(ctx: CanvasRenderingContext2D, size: number, n: number, alpha: number, seed = 7) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const v = Math.floor(r() * 255);
    ctx.fillStyle = `rgba(${v},${v},${v},${alpha * r()})`;
    ctx.fillRect(r() * size, r() * size, 1 + r() * 2, 1 + r() * 2);
  }
}

const cache = new Map<string, THREE.Texture>();
function cached(key: string, make: () => THREE.Texture) {
  if (!cache.has(key)) cache.set(key, make());
  return cache.get(key)!;
}

/** Red clay brick in stretcher bond with grey mortar joints. */
export const brickTexture = (repeat: [number, number] = [2, 2]) =>
  cached(`brick${repeat}`, () =>
    canvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#b9b2a6';
        ctx.fillRect(0, 0, s, s);
        const r = rng(3);
        const rows = 8;
        const h = s / rows;
        const w = s / 4;
        for (let y = 0; y < rows; y++) {
          const off = y % 2 ? w / 2 : 0;
          for (let x = -1; x < 5; x++) {
            const tone = 150 + Math.floor(r() * 45);
            ctx.fillStyle = `rgb(${tone + 40},${Math.floor(tone * 0.5)},${Math.floor(tone * 0.33)})`;
            ctx.fillRect(x * w + off + 2, y * h + 2, w - 4, h - 4);
          }
        }
        speckle(ctx, s, 2500, 0.25);
      },
      repeat,
    ),
  );

/** Cast concrete: light grey with pores and faint shuttering lines. */
export const concreteTexture = (repeat: [number, number] = [1, 1]) =>
  cached(`concrete${repeat}`, () =>
    canvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#a9adb1';
        ctx.fillRect(0, 0, s, s);
        speckle(ctx, s, 6000, 0.35, 11);
        ctx.strokeStyle = 'rgba(80,80,80,0.18)';
        for (let y = 0; y < s; y += s / 4) {
          ctx.beginPath();
          ctx.moveTo(0, y);
          ctx.lineTo(s, y);
          ctx.stroke();
        }
      },
      repeat,
    ),
  );

/** Painted cement plaster: warm off-white with a soft trowel texture. */
export const plasterTexture = (repeat: [number, number] = [2, 2]) =>
  cached(`plaster${repeat}`, () =>
    canvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#efe6d6';
        ctx.fillRect(0, 0, s, s);
        speckle(ctx, s, 3000, 0.08, 5);
      },
      repeat,
    ),
  );

/** Dug earth for the excavation and site floor. */
export const soilTexture = (repeat: [number, number] = [3, 3]) =>
  cached(`soil${repeat}`, () =>
    canvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#8a6440';
        ctx.fillRect(0, 0, s, s);
        speckle(ctx, s, 9000, 0.45, 13);
      },
      repeat,
    ),
  );

/** Short grass for the plot around the finished house. */
export const grassTexture = (repeat: [number, number] = [6, 6]) =>
  cached(`grass${repeat}`, () =>
    canvasTexture(
      256,
      (ctx, s) => {
        ctx.fillStyle = '#86a35b';
        ctx.fillRect(0, 0, s, s);
        const r = rng(17);
        for (let i = 0; i < 5000; i++) {
          const g = 110 + Math.floor(r() * 70);
          ctx.fillStyle = `rgba(${g - 50},${g},${g - 70},0.5)`;
          ctx.fillRect(r() * s, r() * s, 1, 2 + r() * 3);
        }
      },
      repeat,
    ),
  );
