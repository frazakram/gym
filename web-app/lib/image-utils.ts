/**
 * Client-side image compression. Iteratively downscales and re-encodes until
 * the result fits the target size, so users never have to worry about how
 * big their photo is.
 *
 * Handles:
 * - HEIC/HEIF formats (iPhone) by graceful fallback
 * - canvas.toBlob() hanging on mobile (per-step timeout)
 * - Originals up to ~25 MB — we keep retrying with smaller dimensions/quality
 *   until we hit the target or exhaust the step ladder
 */

export interface CompressionOptions {
  /** Soft target — first result <= this wins. Default 700 KB. */
  targetBytes?: number;
  /** Hard ceiling — if even most-aggressive step exceeds this, we throw. Default 1.2 MB. */
  maxBytes?: number;
  /** Per-step toBlob timeout (mobile safety). Default 12 s. */
  timeoutMs?: number;
}

/** Default target keeps full request payload (2 photos + JSON) well under Vercel's 4.5 MB limit. */
export const TARGET_COMPRESSED_SIZE = 700 * 1024;
/** Hard ceiling. */
export const MAX_COMPRESSED_SIZE = 1.2 * 1024 * 1024;

/** Compression ladder: tried in order, first result <= target wins. */
const STEPS: Array<{ maxDim: number; quality: number }> = [
  { maxDim: 1280, quality: 0.82 },
  { maxDim: 1024, quality: 0.78 },
  { maxDim: 1024, quality: 0.65 },
  { maxDim: 800,  quality: 0.7 },
  { maxDim: 800,  quality: 0.55 },
  { maxDim: 640,  quality: 0.6 },
  { maxDim: 512,  quality: 0.55 },
  { maxDim: 384,  quality: 0.5 },
];

const UNSUPPORTED_TYPES = ['image/heic', 'image/heif'];

export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const targetBytes = options.targetBytes ?? TARGET_COMPRESSED_SIZE;
  const maxBytes = options.maxBytes ?? MAX_COMPRESSED_SIZE;
  const timeoutMs = options.timeoutMs ?? 12000;

  // HEIC/HEIF: canvas can't decode, so accept as-is only when already small.
  if (UNSUPPORTED_TYPES.includes(file.type) || /\.(heic|heif)$/i.test(file.name)) {
    if (file.size <= maxBytes) return file;
    throw new Error(
      `HEIC images this large (${(file.size / 1024 / 1024).toFixed(1)} MB) cannot be compressed in the browser. Please convert to JPEG/PNG first.`
    );
  }

  // Load once, reuse the decoded image across every compression step.
  const img = await loadImage(file);

  let smallest: File | null = null;
  for (const step of STEPS) {
    try {
      const out = await encodeStep(img, file.name, step.maxDim, step.maxDim, step.quality, timeoutMs);
      if (!out) continue;
      if (!smallest || out.size < smallest.size) smallest = out;
      if (out.size <= targetBytes) return out;
    } catch (err) {
      console.warn(`[compressImage] step ${step.maxDim}@${step.quality} failed:`, err);
    }
  }

  if (smallest && smallest.size <= maxBytes) return smallest;

  // Original-as-fallback only when it's already tiny.
  if (file.size <= maxBytes) return file;

  throw new Error(
    `Couldn't compress image below ${(maxBytes / 1024 / 1024).toFixed(1)} MB. ` +
    `Smallest version was ${smallest ? (smallest.size / 1024 / 1024).toFixed(1) : '?'} MB. Try a different photo.`
  );
}

function loadImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not decode image — file may be corrupt or in an unsupported format.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Failed to read image file.'));
    reader.readAsDataURL(file);
  });
}

function encodeStep(
  img: HTMLImageElement,
  baseName: string,
  maxWidth: number,
  maxHeight: number,
  quality: number,
  timeoutMs: number
): Promise<File | null> {
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(null), timeoutMs);
    try {
      let width = img.width;
      let height = img.height;
      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        clearTimeout(timer);
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          clearTimeout(timer);
          if (!blob) {
            resolve(null);
            return;
          }
          resolve(new File([blob], renameToJpeg(baseName), {
            type: 'image/jpeg',
            lastModified: Date.now(),
          }));
        },
        'image/jpeg',
        quality,
      );
    } catch (err) {
      clearTimeout(timer);
      console.warn('[compressImage] encode error:', err);
      resolve(null);
    }
  });
}

function renameToJpeg(name: string): string {
  return name.replace(/\.[^.]+$/, '') + '.jpg';
}
