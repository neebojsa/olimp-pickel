export interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
  /** Preserve PNG format for transparency. When true and input is PNG, outputs PNG. */
  preservePng?: boolean;
}

export const resizeImageFile = (
  file: File,
  maxWidth: number = 200,
  maxHeight: number = 200,
  quality: number = 0.8,
  options?: ResizeImageOptions
): Promise<File> => {
  const preservePng = options?.preservePng ?? false;
  const isPng = file.type === 'image/png';

  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions while maintaining aspect ratio
      let { width, height } = img;
      
      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }

      canvas.width = width;
      canvas.height = height;

      // Draw and resize image
      ctx?.drawImage(img, 0, 0, width, height);

      const usePng = preservePng && isPng;
      const mimeType = usePng ? 'image/png' : 'image/jpeg';
      const outputQuality = usePng ? undefined : quality;

      // Convert canvas to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            const resizedFile = new File([blob], file.name, {
              type: mimeType,
              lastModified: Date.now(),
            });
            resolve(resizedFile);
          } else {
            reject(new Error('Failed to resize image'));
          }
        },
        mimeType,
        outputQuality
      );
    };

    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
};

export const validateImageFile = (file: File): boolean => {
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  return validTypes.includes(file.type);
};

const MAX_PART_PHOTO_WIDTH = 1024;
const MAX_PART_PHOTO_HEIGHT = 768;

/**
 * Resize image for part/inventory photo upload.
 * - If larger than 1024x768: compress to fit within 1024x768 (maintains aspect ratio)
 * - If smaller: returns original file unchanged (no re-encoding)
 */
export const resizeImageForPartPhoto = (file: File): Promise<File> => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!imageTypes.includes(file.type)) {
    return Promise.resolve(file);
  }
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const { width, height } = img;
      if (width <= MAX_PART_PHOTO_WIDTH && height <= MAX_PART_PHOTO_HEIGHT) {
        URL.revokeObjectURL(img.src);
        resolve(file);
        return;
      }
      URL.revokeObjectURL(img.src);
      resizeImageFile(file, MAX_PART_PHOTO_WIDTH, MAX_PART_PHOTO_HEIGHT, 0.85, {
        preservePng: file.type === 'image/png',
      }).then(resolve).catch(reject);
    };
    img.onerror = () => {
      URL.revokeObjectURL(img.src);
      reject(new Error('Failed to load image'));
    };
    img.src = URL.createObjectURL(file);
  });
};

/**
 * Compress an image file for storage. Use AFTER AI/OCR scanning (which needs original quality).
 * Only compresses images (jpg, png) - PDFs and other formats are returned unchanged.
 * Max 1920px on longest side, quality 0.85 - keeps documents readable while reducing size.
 */
export const compressImageForStorage = (
  file: File,
  maxDimension: number = 1920,
  quality: number = 0.85
): Promise<File> => {
  const imageTypes = ['image/jpeg', 'image/jpg', 'image/png'];
  if (!imageTypes.includes(file.type)) {
    return Promise.resolve(file);
  }

  return resizeImageFile(file, maxDimension, maxDimension, quality, {
    preservePng: file.type === 'image/png',
  });
};