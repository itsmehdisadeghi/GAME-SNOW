import * as THREE from 'three';

export interface ProceduralTextures {
  cobbleMap: THREE.CanvasTexture;
  cobbleBump: THREE.CanvasTexture;
  snowBump: THREE.CanvasTexture;
  contactShadow: THREE.CanvasTexture;
  emberGrate: THREE.CanvasTexture;
  dispose: () => void;
}

export function createProceduralTextures(maxAnisotropy: number): ProceduralTextures {
  // 1. Warm Alpine Cobblestone Albedo & Bump
  const cobbleCanvas = document.createElement('canvas');
  cobbleCanvas.width = 512;
  cobbleCanvas.height = 512;
  const ctx = cobbleCanvas.getContext('2d')!;

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = 512;
  bumpCanvas.height = 512;
  const bCtx = bumpCanvas.getContext('2d')!;

  // Mortar base
  ctx.fillStyle = '#3c3938';
  ctx.fillRect(0, 0, 512, 512);
  bCtx.fillStyle = '#282828';
  bCtx.fillRect(0, 0, 512, 512);

  const rows = 8;
  const cols = 8;
  const cellW = 512 / cols;
  const cellH = 512 / rows;

  const stonePalette = ['#736b64', '#81766c', '#696462', '#8a7d6f', '#786e66', '#6d6661'];

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (cellW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const seed = Math.sin(r * 97.3 + c * 43.1) * 43758.5453;
      const frac = seed - Math.floor(seed);
      const x = c * cellW + offset + 3;
      const y = r * cellH + 3;
      const w = cellW - 6;
      const h = cellH - 6;
      const rad = 10;

      // Stone color fill
      ctx.fillStyle = stonePalette[Math.floor(frac * stonePalette.length)];
      roundRectPath(ctx, x, y, w, h, rad);
      ctx.fill();

      // Subtle warm highlight top-left
      ctx.fillStyle = 'rgba(255, 244, 224, 0.14)';
      roundRectPath(ctx, x + 2, y + 2, w - 8, h * 0.45, rad * 0.7);
      ctx.fill();

      // Subtle frost specks in mortar seams
      ctx.fillStyle = 'rgba(215, 232, 248, 0.18)';
      ctx.fillRect(x - 1, y + h, w * 0.4, 2);

      // Bump height
      const lum = Math.round(170 + frac * 55);
      bCtx.fillStyle = `rgb(${lum},${lum},${lum})`;
      roundRectPath(bCtx, x + 1, y + 1, w - 2, h - 2, rad);
      bCtx.fill();
    }
  }

  const cobbleMap = new THREE.CanvasTexture(cobbleCanvas);
  cobbleMap.colorSpace = THREE.SRGBColorSpace;
  cobbleMap.wrapS = THREE.RepeatWrapping;
  cobbleMap.wrapT = THREE.RepeatWrapping;
  cobbleMap.repeat.set(7, 7);
  cobbleMap.anisotropy = maxAnisotropy;

  const cobbleBump = new THREE.CanvasTexture(bumpCanvas);
  cobbleBump.wrapS = THREE.RepeatWrapping;
  cobbleBump.wrapT = THREE.RepeatWrapping;
  cobbleBump.repeat.set(7, 7);
  cobbleBump.anisotropy = maxAnisotropy;

  // 2. Soft Snow Micro-Grain Bump Map
  const snowCanvas = document.createElement('canvas');
  snowCanvas.width = 256;
  snowCanvas.height = 256;
  const sCtx = snowCanvas.getContext('2d')!;
  sCtx.fillStyle = '#808080';
  sCtx.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 3200; i++) {
    const x = Math.random() * 256;
    const y = Math.random() * 256;
    const v = 108 + Math.floor(Math.random() * 44);
    sCtx.fillStyle = `rgb(${v},${v},${v})`;
    sCtx.fillRect(x, y, 2, 2);
  }
  const snowBump = new THREE.CanvasTexture(snowCanvas);
  snowBump.wrapS = THREE.RepeatWrapping;
  snowBump.wrapT = THREE.RepeatWrapping;
  snowBump.anisotropy = maxAnisotropy;

  // 3. Soft Radial Contact Shadow Disc
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = 128;
  shadowCanvas.height = 128;
  const shCtx = shadowCanvas.getContext('2d')!;
  const grad = shCtx.createRadialGradient(64, 64, 10, 64, 64, 60);
  grad.addColorStop(0, 'rgba(10, 18, 30, 0.72)');
  grad.addColorStop(0.6, 'rgba(10, 18, 30, 0.34)');
  grad.addColorStop(1, 'rgba(10, 18, 30, 0.0)');
  shCtx.fillStyle = grad;
  shCtx.fillRect(0, 0, 128, 128);
  const contactShadow = new THREE.CanvasTexture(shadowCanvas);

  // 4. Thermal Hearth Grate Ember Texture
  const emberCanvas = document.createElement('canvas');
  emberCanvas.width = 256;
  emberCanvas.height = 256;
  const eCtx = emberCanvas.getContext('2d')!;
  const eGrad = eCtx.createRadialGradient(128, 128, 14, 128, 128, 120);
  eGrad.addColorStop(0, '#fff2b0');
  eGrad.addColorStop(0.45, '#ff8626');
  eGrad.addColorStop(0.82, '#b93410');
  eGrad.addColorStop(1, '#3b150c');
  eCtx.fillStyle = eGrad;
  eCtx.fillRect(0, 0, 256, 256);

  // Iron grate bars overlaid
  eCtx.fillStyle = '#252124';
  for (let i = 0; i < 6; i++) {
    const pos = 22 + i * 40;
    eCtx.fillRect(pos, 0, 14, 256);
  }
  eCtx.fillRect(0, 118, 256, 20);

  const emberGrate = new THREE.CanvasTexture(emberCanvas);
  emberGrate.colorSpace = THREE.SRGBColorSpace;
  emberGrate.anisotropy = maxAnisotropy;

  return {
    cobbleMap,
    cobbleBump,
    snowBump,
    contactShadow,
    emberGrate,
    dispose: () => {
      cobbleMap.dispose();
      cobbleBump.dispose();
      snowBump.dispose();
      contactShadow.dispose();
      emberGrate.dispose();
    },
  };
}

function roundRectPath(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
