// ==============================================================================
// КЛИЕНТСКАЯ КОМПРЕССИЯ ИЗОБРАЖЕНИЙ (WebP) ДЛЯ tobo
// Лицензия: Apache License 2.0
// ==============================================================================

export interface CompressionOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number; // 0 to 1
}

/**
 * Сжимает изображение на стороне клиента в формат WebP для минимизации трафика и мгновенной загрузки.
 */
export async function compressImageToWebP(
  file: File,
  options: CompressionOptions = {}
): Promise<{ blob: Blob; dataUrl: string }> {
  const { maxWidth = 1600, maxHeight = 1600, quality = 0.82 } = options;

  return new Promise((resolve, reject) => {
    // Если это GIF или SVG, не пережимаем через Canvas, чтобы не потерять анимацию или вектор
    if (file.type === 'image/gif' || file.type === 'image/svg+xml') {
      const reader = new FileReader();
      reader.onload = () => {
        resolve({ blob: file, dataUrl: reader.result as string });
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
      return;
    }

    const img = new Image();
    const objectUrl = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Масштабирование с сохранением пропорций
      if (width > maxWidth || height > maxHeight) {
        if (width / height > maxWidth / maxHeight) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        } else {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        reject(new Error('Не удалось инициализировать 2D контекст Canvas'));
        return;
      }

      // Качественная интерполяция
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Конвертация в image/webp
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('Ошибка конвертации Canvas в Blob'));
            return;
          }
          const dataUrl = canvas.toDataURL('image/webp', quality);
          resolve({ blob, dataUrl });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (e) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error('Не удалось загрузить изображение для компрессии'));
    };

    img.src = objectUrl;
  });
}
