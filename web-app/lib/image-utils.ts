/**
 * Utility to compress and resize images on the client side using Canvas API.
 * This helps in reducing payload size for API requests and ensures compatibility
 * with server-side body size limits.
 *
 * Handles mobile-specific issues:
 * - HEIC/HEIF formats (common on iPhone) that canvas can't render
 * - canvas.toBlob() hanging on mobile due to memory constraints
 * - Graceful fallback to original file when compression fails
 */

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
  timeoutMs?: number; // timeout for toBlob on mobile
}

const DEFAULT_OPTIONS: CompressionOptions = {
  maxWidth: 1200,
  maxHeight: 1200,
  quality: 0.8,
  timeoutMs: 15000,
};

/**
 * Compress and resize an image. On failure (e.g. HEIC on non-Safari,
 * mobile memory limits), returns the original file instead of throwing.
 */
export async function compressImage(
  file: File,
  options: CompressionOptions = {}
): Promise<File> {
  const { maxWidth, maxHeight, quality, timeoutMs } = { ...DEFAULT_OPTIONS, ...options };

  // Skip compression for unsupported formats that canvas can't handle
  const unsupported = ['image/heic', 'image/heif'];
  if (unsupported.includes(file.type)) {
    // Return as-is — the server or browser may still handle it
    return file;
  }

  return new Promise((resolve, reject) => {
    // Timeout guard: if toBlob() never fires (common on mobile), resolve with original file
    const timer = setTimeout(() => {
      console.warn('Image compression timed out, using original file');
      resolve(file);
    }, timeoutMs!);

    const cleanup = () => clearTimeout(timer);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          // Calculate new dimensions while maintaining aspect ratio
          if (width > height) {
            if (width > maxWidth!) {
              height = Math.round((height * maxWidth!) / width);
              width = maxWidth!;
            }
          } else {
            if (height > maxHeight!) {
              width = Math.round((width * maxHeight!) / height);
              height = maxHeight!;
            }
          }

          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          if (!ctx) {
            cleanup();
            console.warn('Failed to get canvas context, using original file');
            resolve(file);
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              cleanup();
              if (!blob) {
                console.warn('Failed to create blob from canvas, using original file');
                resolve(file);
                return;
              }
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            },
            'image/jpeg',
            quality
          );
        } catch (err) {
          cleanup();
          console.warn('Canvas compression failed, using original file:', err);
          resolve(file);
        }
      };
      img.onerror = () => {
        cleanup();
        // Image couldn't be loaded (HEIC on non-Safari, corrupt file, etc.)
        // Fall back to original file instead of breaking the upload flow
        console.warn('Failed to load image for compression, using original file');
        resolve(file);
      };
    };
    reader.onerror = () => {
      cleanup();
      reject(new Error('Failed to read file for compression'));
    };
  });
}
