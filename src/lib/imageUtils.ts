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

/** Image MIME types that can be compressed for storage (cost documents, etc.) */
const COMPRESSIBLE_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];

/**
 * Compresses an image file for storage (e.g. cost document photos).
 * Reduces file size while keeping documents readable. PDFs and non-image files are returned unchanged.
 */
export const compressImageForStorage = async (file: File): Promise<File> => {
  if (!COMPRESSIBLE_IMAGE_TYPES.includes(file.type)) {
    return file;
  }
  // Max 1920px, quality 0.82 - good balance for document photos
  return resizeImageFile(file, 1920, 1920, 0.82);
};

/** Format file size for display (e.g. "1.25 MB") */
export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
};