// ==============================================================================
// МАТЕМАТИЧЕСКИЙ МОДУЛЬ КАДРИРОВАНИЯ ИЗОБРАЖЕНИЙ (HTML5 CANVAS 400x400)
// Стандарт: Google Material 3 Expressive + Референс ВКонтакте / Telegram
// Проект: tobo (https://tobo-me.vercel.app)
// Лицензия: Apache License 2.0
// ==============================================================================

export interface CropperDimensions {
  containerWidth: number;    // 288 px
  containerHeight: number;   // 288 px
  viewfinderPadding: number;  // 14 px от края до круга
  viewfinderDiameter: number; // 260 px
  targetSize: number;        // 400 px
}

export interface ImageLayout {
  naturalWidth: number;
  naturalHeight: number;
  displayedWidth: number;
  displayedHeight: number;
}

export interface CropState {
  offsetX: number;
  offsetY: number;
  zoom: number; // 1.0 ... 3.0
}

export interface CropResult {
  base64: string;
  blob: Blob;
}

export const DEFAULT_CROPPER_DIMENSIONS: CropperDimensions = {
  containerWidth: 288,
  containerHeight: 288,
  viewfinderPadding: 14,
  viewfinderDiameter: 260,
  targetSize: 400
};

/**
 * Рассчитывает размеры отображаемого изображения, чтобы оно покрывало видоискатель (aspect fill/cover).
 */
export function calculateCoverDimensions(
  naturalWidth: number,
  naturalHeight: number,
  viewfinderSize: number = DEFAULT_CROPPER_DIMENSIONS.viewfinderDiameter
): { width: number; height: number } {
  if (!naturalWidth || !naturalHeight) {
    return { width: viewfinderSize, height: viewfinderSize };
  }

  const aspect = naturalWidth / naturalHeight;
  if (aspect > 1) {
    // Горизонтальное: высота равна диаметру видоискателя, ширина пропорциональна
    const height = viewfinderSize;
    const width = viewfinderSize * aspect;
    return { width, height };
  } else {
    // Вертикальное или квадрат: ширина равна диаметру видоискателя, высота пропорциональна
    const width = viewfinderSize;
    const height = viewfinderSize / aspect;
    return { width, height };
  }
}

/**
 * Ограничение смещения (drag offset) в допустимых пределах,
 * чтобы видоискатель не выходил за границы масштабированного изображения.
 */
export function clampCropOffset(
  offset: number,
  scaledDimension: number,
  viewfinderSize: number = DEFAULT_CROPPER_DIMENSIONS.viewfinderDiameter
): number {
  const maxOffset = Math.max(0, (scaledDimension - viewfinderSize) / 2);
  return Math.max(-maxOffset, Math.min(maxOffset, offset));
}

/**
 * Рассчитывает координаты и выполняет обрезку на Canvas 400x400 с экспортом в Base64 JPEG и Blob.
 */
export async function processCanvasCrop(
  imageSource: string | HTMLImageElement,
  _state: CropState,
  containerRect: { width: number; height: number; left: number; top: number },
  imageRect: { width: number; height: number; left: number; top: number },
  dimensions: CropperDimensions = DEFAULT_CROPPER_DIMENSIONS
): Promise<CropResult> {
  return new Promise((resolve, reject) => {
    const handleImageLoaded = (img: HTMLImageElement) => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = dimensions.targetSize;
        canvas.height = dimensions.targetSize;

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('Canvas 2D context init failed'));
          return;
        }

        // 1. Координаты видоискателя на экране
        const scaleFactorX = containerRect.width / dimensions.containerWidth;
        const scaleFactorY = containerRect.height / dimensions.containerHeight;
        
        const cropScreenLeft = containerRect.left + dimensions.viewfinderPadding * scaleFactorX;
        const cropScreenTop = containerRect.top + dimensions.viewfinderPadding * scaleFactorY;
        const cropScreenDiameter = dimensions.viewfinderDiameter * scaleFactorX;

        // 2. Коэффициент пересчета экрана в выходные 400x400 пикселей
        const screenToTargetRatio = dimensions.targetSize / cropScreenDiameter;

        // 3. Расчет позиции отрисовки изображения относительно верхнего левого угла холста
        const drawX = (imageRect.left - cropScreenLeft) * screenToTargetRatio;
        const drawY = (imageRect.top - cropScreenTop) * screenToTargetRatio;
        const drawW = imageRect.width * screenToTargetRatio;
        const drawH = imageRect.height * screenToTargetRatio;

        // 4. Заливка фонового нейтрального слоя (для исключения прозрачности в JPEG)
        ctx.fillStyle = '#1A1C1E';
        ctx.fillRect(0, 0, dimensions.targetSize, dimensions.targetSize);

        // 5. Включение качественной бикубической интерполяции
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';

        // 6. Отрисовка трансформированного кадра
        ctx.drawImage(img, drawX, drawY, drawW, drawH);

        // 7. Экспорт в Base64 и Blob
        const base64 = canvas.toDataURL('image/jpeg', 0.92);
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to convert Canvas to Blob'));
              return;
            }
            resolve({ base64, blob });
          },
          'image/jpeg',
          0.92
        );
      } catch (err) {
        reject(err);
      }
    };

    if (typeof imageSource === 'string') {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => handleImageLoaded(img);
      img.onerror = () => reject(new Error('Image failed to load in cropperEngine'));
      img.src = imageSource;
    } else {
      handleImageLoaded(imageSource);
    }
  });
}
