// src/lib/watermarkPhoto.ts

export interface WatermarkOptions {
  latitude: number | null;
  longitude: number | null;
  accuracy?: number | null;
  address?: string | null;
  timestamp?: Date;
  departmentName?: string | null;
  appName?: string;
}

const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.88;
const MAX_OUTPUT_BYTES = 4 * 1024 * 1024; // 4 MB hard cap

/**
 * Burns a GPS-camera style watermark into the photo.
 * Returns the ORIGINAL file if anything fails, so uploads never break.
 */
export async function watermarkPhoto(
  file: File,
  opts: WatermarkOptions
): Promise<File> {
  try {
    const img = await loadImage(file);
    const canvas = drawWatermarked(img, opts);

    // Try toBlob first, then fall back to toDataURL
    let blob = await canvasToBlob(canvas);

    if (!blob) {
      // Fallback for iOS Safari where toBlob can be flaky
      blob = dataUrlToBlob(canvas.toDataURL('image/jpeg', JPEG_QUALITY));
    }

    if (!blob || blob.size === 0) {
      console.warn('[watermark] empty blob — using original');
      return file;
    }

    // Size guard — if the watermarked image is huge, fall back
    if (blob.size > MAX_OUTPUT_BYTES) {
      console.warn(
        `[watermark] output too large (${blob.size} bytes) — using original`
      );
      return file;
    }

    // ✅ Preserve the SAME name so Supabase paths stay predictable
    const safeName = sanitizeName(file.name || 'photo.jpg');
    const out = new File([blob], safeName, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });

    console.log(
      `[watermark] ok: ${file.name} (${file.size}b) → ${out.name} (${out.size}b)`
    );
    return out;
  } catch (err) {
    console.warn('[watermark] failed — uploading original', err);
    return file; // 🔑 never block the upload
  }
}

/* ---------- internals ---------- */

function drawWatermarked(
  img: HTMLImageElement,
  opts: WatermarkOptions
): HTMLCanvasElement {
  let { width, height } = img;
  if (!width || !height) {
    width = 800;
    height = 600;
  }
  if (Math.max(width, height) > MAX_DIMENSION) {
    const scale = MAX_DIMENSION / Math.max(width, height);
    width = Math.round(width * scale);
    height = Math.round(height * scale);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D not available');

  // White background (protects PNG with transparency → JPEG)
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(img, 0, 0, width, height);

  const ts = opts.timestamp ?? new Date();
  const pad = Math.round(width * 0.028);
  const mainSize = Math.max(16, Math.round(width * 0.036));
  const smallSize = Math.max(12, Math.round(mainSize * 0.72));
  const lineGap = Math.round(mainSize * 1.35);

  const dateStr = ts
    .toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
    .toUpperCase();

  const timeStr = ts.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });

  type Line = { text: string; size: number; weight: string };
  const lines: Line[] = [];

  lines.push({
    text: `${dateStr}  ${timeStr}`,
    size: mainSize,
    weight: '800',
  });

  if (opts.latitude != null && opts.longitude != null) {
    const acc =
      opts.accuracy != null && Number.isFinite(opts.accuracy)
        ? `   ±${Math.round(opts.accuracy)}m`
        : '';
    lines.push({
      text: `Lat ${opts.latitude.toFixed(6)}°  Long ${opts.longitude.toFixed(
        6
      )}°${acc}`,
      size: smallSize,
      weight: '700',
    });
  }

  if (opts.address) {
    const wrapped = wrapText(ctx, opts.address, width - pad * 2, smallSize);
    for (const w of wrapped.slice(0, 3)) {
      lines.push({ text: w, size: smallSize, weight: '500' });
    }
  }

  const tag = [opts.appName, opts.departmentName].filter(Boolean).join(' · ');
  if (tag) {
    lines.push({ text: tag, size: smallSize, weight: '700' });
  }

  let bannerHeight = pad + lines.length * lineGap;
  bannerHeight += Math.round(pad * 0.5);

  const bannerTop = height - bannerHeight;

  ctx.fillStyle = 'rgba(0,0,0,0.62)';
  ctx.fillRect(0, bannerTop, width, bannerHeight);

  const accentHeight = Math.max(3, Math.round(width * 0.006));
  ctx.fillStyle = '#660033';
  ctx.fillRect(0, bannerTop, width, accentHeight);

  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = '#ffffff';
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 4;
  ctx.shadowOffsetY = 1;

  let y = bannerTop + accentHeight + pad + Math.round(mainSize * 0.85);

  for (let i = 0; i < lines.length; i++) {
    const l = lines[i];
    ctx.font = `${l.weight} ${l.size}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
    ctx.fillStyle = i === 0 ? '#ffffff' : 'rgba(255,255,255,0.94)';
    ctx.fillText(l.text, pad, y);
    y += lineGap;
  }

  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  return canvas;
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url);
      reject(new Error('Image load timed out'));
    }, 15000);

    img.onload = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timeout);
      URL.revokeObjectURL(url);
      reject(new Error('Image load failed'));
    };
    img.src = url;
  });
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob | null> {
  return new Promise((resolve) => {
    // Some browsers callback with null — we resolve it, caller handles fallback
    canvas.toBlob((b) => resolve(b), 'image/jpeg', JPEG_QUALITY);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [meta, b64] = dataUrl.split(',');
  const mime = /:(.*?);/.exec(meta)?.[1] || 'image/jpeg';
  const bin = atob(b64);
  const len = bin.length;
  const u8 = new Uint8Array(len);
  for (let i = 0; i < len; i++) u8[i] = bin.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

function sanitizeName(name: string): string {
  // Keep letters, digits, dash, underscore, dot. Replace anything else.
  return (
    name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'photo.jpg'
  );
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  fontSize: number
): string[] {
  ctx.font = `500 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif`;
  const words = text.split(/\s+/);
  const out: string[] = [];
  let current = '';
  for (const word of words) {
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      out.push(current);
      current = word;
    } else {
      current = test;
    }
  }
  if (current) out.push(current);
  return out;
      }
