<template>
  <Teleport to="body">
    <div v-if="modelValue" class="fixed inset-0 z-[150] bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4">
      <div class="w-full max-w-lg rounded-4xl bg-surface-lowest border border-surface-high/60 p-4 sm:p-6 shadow-elevation-4 flex flex-col items-center">
        <!-- Шапка модалки -->
        <div class="w-full flex items-center justify-between mb-4">
          <div class="flex items-center gap-2">
            <span class="material-symbols-rounded text-primary text-xl">crop_landscape</span>
            <h3 class="text-base font-bold text-surface-on">Кадрирование обложки</h3>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors"
            @click="$emit('update:modelValue', false)"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <!-- Область кадрирования с прямоугольным видоискателем (16:7) -->
        <div
          ref="cropContainer"
          class="relative w-full max-w-[360px] aspect-[16/7] rounded-2xl overflow-hidden bg-[#1A1C1E] select-none cursor-grab active:cursor-grabbing touch-none flex items-center justify-center shadow-inner"
          @mousedown="startDrag"
          @touchstart="handleTouchStart"
          @wheel.prevent="onWheel"
        >
          <!-- Картинка обложки: гарантированное сохранение пропорций инлайн-стилями -->
          <img
            ref="imgElement"
            :src="imageSrc"
            alt="Кадрируемая обложка"
            class="absolute pointer-events-none select-none max-w-none"
            :class="{ 'transition-transform duration-75': !isDragging }"
            :style="{
              width: `${dispWidth}px`,
              height: `${dispHeight}px`,
              maxWidth: 'none',
              maxHeight: 'none',
              minWidth: `${dispWidth}px`,
              minHeight: `${dispHeight}px`,
              left: '50%',
              top: '50%',
              transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`
            }"
            @load="onImageLoad"
          />

          <!-- Полупрозрачный силуэт аватара в нижнем левом углу для визуального контроля перекрытия -->
          <svg
            v-if="showAvatarGuide"
            class="absolute inset-0 w-full h-full pointer-events-none transition-opacity duration-300"
            viewBox="0 0 1200 525"
            preserveAspectRatio="none"
          >
            <!-- Круглая зона перекрытия аватаром: радиус 160, центр (225, 525) -->
            <circle
              cx="225"
              cy="525"
              r="160"
              fill="rgba(0, 0, 0, 0.45)"
              stroke="rgba(255, 255, 255, 0.85)"
              stroke-width="3"
              stroke-dasharray="10 8"
            />
            <!-- Силуэт головы и плеч аватара -->
            <circle cx="225" cy="435" r="32" fill="rgba(255, 255, 255, 0.35)" />
            <path
              d="M 180 510 C 180 475, 202 465, 225 465 C 248 465, 270 475, 270 510 Z"
              fill="rgba(255, 255, 255, 0.35)"
            />
            <!-- Подпись «Аватар» -->
            <text
              x="225"
              y="520"
              fill="rgba(255, 255, 255, 0.95)"
              font-size="22"
              font-weight="700"
              letter-spacing="0.5"
              text-anchor="middle"
              font-family="system-ui, -apple-system, sans-serif"
            >
              Аватар
            </text>
          </svg>

          <!-- Белая рамка видоискателя и внешняя контрастная тень -->
          <div class="absolute inset-0 rounded-2xl border-2 border-white/90 ring-4 ring-black/40 pointer-events-none" />

          <!-- Угловые L-маркеры видоискателя -->
          <svg class="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 1200 525" preserveAspectRatio="none">
            <path d="M 14 60 L 14 14 L 60 14" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 1140 14 L 1186 14 L 1186 60" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 14 465 L 14 511 L 60 511" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M 1140 511 L 1186 511 L 1186 465" fill="none" stroke="white" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>

        <!-- Переключатель силуэта аватара и подсказка -->
        <div class="w-full max-w-[360px] flex items-center justify-between mt-2.5 px-1 text-xs text-surface-onVariant">
          <span class="flex items-center gap-1 opacity-80">
            <span class="material-symbols-rounded text-sm text-primary">info</span>
            <span>Круг — зона аватара</span>
          </span>
          <button
            type="button"
            class="flex items-center gap-1 font-medium hover:text-surface-on transition-colors cursor-pointer"
            :class="showAvatarGuide ? 'text-primary font-semibold' : 'text-surface-onVariant/70'"
            @click="showAvatarGuide = !showAvatarGuide"
          >
            <span class="material-symbols-rounded text-sm">
              {{ showAvatarGuide ? 'visibility' : 'visibility_off' }}
            </span>
            <span>{{ showAvatarGuide ? 'Силуэт вкл' : 'Силуэт выкл' }}</span>
          </button>
        </div>

        <!-- Ползунок масштабирования зума от 0.5x до 4.0x -->
        <div class="w-full max-w-[360px] flex items-center gap-3 mt-3 text-surface-onVariant">
          <button
            type="button"
            class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
            title="Отдалить"
            @click="setZoom(zoom - 0.1)"
          >
            <span class="material-symbols-rounded text-lg">zoom_out</span>
          </button>
          <input
            :value="zoom"
            type="range"
            min="0.5"
            max="4.0"
            step="0.05"
            aria-label="Масштаб обложки"
            class="flex-1 accent-primary h-1.5 bg-surface-high rounded-lg cursor-pointer"
            @input="handleZoomInput"
          />
          <button
            type="button"
            class="w-6 h-6 flex items-center justify-center hover:text-surface-on cursor-pointer"
            title="Приблизить"
            @click="setZoom(zoom + 0.1)"
          >
            <span class="material-symbols-rounded text-lg">zoom_in</span>
          </button>
        </div>

        <!-- Кнопки действий -->
        <div class="w-full flex items-center justify-end gap-2.5 mt-6 pt-3 border-t border-surface-high/40">
          <button
            type="button"
            class="px-5 py-2.5 rounded-full text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors cursor-pointer"
            :disabled="isProcessing"
            @click="$emit('update:modelValue', false)"
          >
            Отмена
          </button>
          <button
            type="button"
            class="px-6 py-2.5 rounded-full bg-primary text-primary-on font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
            :disabled="isProcessing"
            @click="cropAndSave"
          >
            <span v-if="isProcessing" class="material-symbols-rounded text-base animate-spin">sync</span>
            <span v-else class="material-symbols-rounded text-base">check</span>
            <span>{{ isProcessing ? 'Обработка...' : 'Применить обложку' }}</span>
          </button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch, nextTick, onUnmounted } from 'vue';

export interface CoverCropResult {
  base64: string;
  blob: Blob;
}

const props = defineProps<{
  modelValue: boolean;
  imageSrc: string;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'crop-complete', result: CoverCropResult): void;
}>();

const cropContainer = ref<HTMLDivElement | null>(null);
const imgElement = ref<HTMLImageElement | null>(null);

// Исходные естественные размеры картинки
const naturalWidth = ref(0);
const naturalHeight = ref(0);
const baseScale = ref(1);
const zoom = ref(1.0);
const position = reactive({ x: 0, y: 0 });
const isDragging = ref(false);
const isProcessing = ref(false);
const showAvatarGuide = ref(true);
const dragStart = reactive({ x: 0, y: 0 });

// Точные константы целевого соотношения (16:7)
const TARGET_WIDTH = 1200;
const TARGET_HEIGHT = 525;
const TARGET_ASPECT = TARGET_WIDTH / TARGET_HEIGHT; // 1200 / 525 = 16 / 7 = 2.2857142857142856
const VIEWFINDER_BASE_WIDTH = 360;

const containerWidth = ref(VIEWFINDER_BASE_WIDTH);
const containerHeight = computed(() => containerWidth.value / TARGET_ASPECT);

function measureContainer() {
  if (cropContainer.value) {
    const rect = cropContainer.value.getBoundingClientRect();
    if (rect.width > 0) {
      containerWidth.value = rect.width;
    }
  }
}

function updateImageDimensions(width: number, height: number) {
  if (!width || !height) return;
  naturalWidth.value = width;
  naturalHeight.value = height;
  measureContainer();

  const cw = containerWidth.value || VIEWFINDER_BASE_WIDTH;
  const ch = cw / TARGET_ASPECT;

  // Рассчитываем cover-масштаб, чтобы видоискатель был полностью закрыт картинкой без черных полос
  const scaleX = cw / width;
  const scaleY = ch / height;
  baseScale.value = Math.max(scaleX, scaleY);
  clampPosition();
}

// Экранные размеры превью в DOM (строго сохраняют пропорции naturalWidth / naturalHeight)
const dispWidth = computed(() => {
  if (!naturalWidth.value) return containerWidth.value * zoom.value;
  return Math.round(naturalWidth.value * baseScale.value * zoom.value);
});

const dispHeight = computed(() => {
  if (!naturalHeight.value) return containerHeight.value * zoom.value;
  return Math.round(naturalHeight.value * baseScale.value * zoom.value);
});

function clampPosition() {
  const cw = containerWidth.value || VIEWFINDER_BASE_WIDTH;
  const ch = cw / TARGET_ASPECT;

  const currentW = dispWidth.value;
  const currentH = dispHeight.value;

  const maxOffsetX = Math.max(0, (currentW - cw) / 2);
  const maxOffsetY = Math.max(0, (currentH - ch) / 2);

  position.x = Math.max(-maxOffsetX, Math.min(maxOffsetX, position.x));
  position.y = Math.max(-maxOffsetY, Math.min(maxOffsetY, position.y));
}

function setZoom(val: number) {
  zoom.value = Math.min(Math.max(0.5, +val.toFixed(2)), 4.0);
  clampPosition();
}

function handleZoomInput(e: Event) {
  const target = e.target as HTMLInputElement;
  setZoom(parseFloat(target.value));
}

function onImageLoad(e?: Event) {
  const target = (e?.target as HTMLImageElement) || imgElement.value;
  if (!target) return;
  updateImageDimensions(target.naturalWidth, target.naturalHeight);
}

// Обработка открытия модалки
watch(
  () => [props.modelValue, props.imageSrc],
  async ([isOpen]) => {
    if (isOpen && props.imageSrc) {
      zoom.value = 1.0;
      position.x = 0;
      position.y = 0;

      await nextTick();
      measureContainer();

      const img = new Image();
      img.onload = () => {
        updateImageDimensions(img.naturalWidth, img.naturalHeight);
      };
      img.src = props.imageSrc;
      window.addEventListener('resize', measureContainer);
    } else {
      window.removeEventListener('resize', measureContainer);
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  window.removeEventListener('resize', measureContainer);
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
  window.removeEventListener('touchmove', handleTouchMove);
  window.removeEventListener('touchend', handleTouchEnd);
});

// Drag мышкой
function startDrag(e: MouseEvent) {
  isDragging.value = true;
  dragStart.x = e.clientX - position.x;
  dragStart.y = e.clientY - position.y;
  window.addEventListener('mousemove', onDrag);
  window.addEventListener('mouseup', stopDrag);
}

function onDrag(e: MouseEvent) {
  if (!isDragging.value) return;
  position.x = e.clientX - dragStart.x;
  position.y = e.clientY - dragStart.y;
  clampPosition();
}

function stopDrag() {
  isDragging.value = false;
  window.removeEventListener('mousemove', onDrag);
  window.removeEventListener('mouseup', stopDrag);
}

// Touch события на смартфонах с поддержкой Pinch-to-Zoom
let initialPinchDistance = 0;
let initialPinchZoom = 1.0;

function getPinchDistance(t1: Touch, t2: Touch): number {
  return Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY);
}

function handleTouchStart(e: TouchEvent) {
  if (e.touches.length === 1) {
    isDragging.value = true;
    dragStart.x = e.touches[0].clientX - position.x;
    dragStart.y = e.touches[0].clientY - position.y;
  } else if (e.touches.length === 2) {
    isDragging.value = false;
    initialPinchDistance = getPinchDistance(e.touches[0], e.touches[1]);
    initialPinchZoom = zoom.value;
  }
  window.addEventListener('touchmove', handleTouchMove, { passive: false });
  window.addEventListener('touchend', handleTouchEnd);
}

function handleTouchMove(e: TouchEvent) {
  if (e.touches.length === 1 && isDragging.value) {
    e.preventDefault();
    position.x = e.touches[0].clientX - dragStart.x;
    position.y = e.touches[0].clientY - dragStart.y;
    clampPosition();
  } else if (e.touches.length === 2 && initialPinchDistance > 0) {
    e.preventDefault();
    const currentDist = getPinchDistance(e.touches[0], e.touches[1]);
    const factor = currentDist / initialPinchDistance;
    setZoom(initialPinchZoom * factor);
  }
}

function handleTouchEnd(e: TouchEvent) {
  if (e.touches.length === 0) {
    isDragging.value = false;
    initialPinchDistance = 0;
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
  } else if (e.touches.length === 1) {
    // Переход обратно на однопальцевый драг
    isDragging.value = true;
    initialPinchDistance = 0;
    dragStart.x = e.touches[0].clientX - position.x;
    dragStart.y = e.touches[0].clientY - position.y;
  }
}

function onWheel(e: WheelEvent) {
  const delta = e.deltaY > 0 ? -0.05 : 0.05;
  setZoom(zoom.value + delta);
}

/**
 * АБСОЛЮТНОЕ АНАЛИТИЧЕСКОЕ КАДРИРОВАНИЕ (HTML5 CANVAS 1200x525).
 * Полностью исключает DOM-артефакты getBoundingClientRect() и стили CSS.
 * Отрисовка происходит строго с изотропным коэффициентом масштабирования:
 * отношение ширины к высоте вырезаемого фрагмента всегда тождественно 1200 / 525 (16:7),
 * что на 100.00% математически гарантирует отсутствие любых деформаций объекта.
 */
async function cropAndSave() {
  if (!naturalWidth.value || !naturalHeight.value || isProcessing.value) return;
  isProcessing.value = true;

  try {
    const cw = containerWidth.value || VIEWFINDER_BASE_WIDTH;
    const ch = cw / TARGET_ASPECT;

    // Масштаб отображения на экране относительно исходных пикселей
    const currentScale = baseScale.value * zoom.value;
    const scaleToNatural = 1 / currentScale;

    // Размеры видоискателя в естественных пикселях исходного изображения
    const sourceW = cw * scaleToNatural;
    const sourceH = ch * scaleToNatural;

    // Центр видоискателя в координатах исходного изображения
    const sourceCenterX = (naturalWidth.value / 2) - (position.x * scaleToNatural);
    const sourceCenterY = (naturalHeight.value / 2) - (position.y * scaleToNatural);

    // Целевой холст 1200x525
    const canvas = document.createElement('canvas');
    canvas.width = TARGET_WIDTH;
    canvas.height = TARGET_HEIGHT;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2d context for cover crop');

    // 1. Заливка темного базового слоя (для корректного экспорта в JPEG)
    ctx.fillStyle = '#1A1C1E';
    ctx.fillRect(0, 0, TARGET_WIDTH, TARGET_HEIGHT);

    // 2. Включение качественного бикубического сглаживания
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';

    // 3. Загружаем свежий объект Image для отрисовки исходных данных
    const img = new Image();
    img.crossOrigin = 'anonymous';
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error('Failed to load image for canvas export'));
      img.src = props.imageSrc;
    });

    // 4. Изотропная матричная трансформация Canvas
    // canvasScale строго одинаков по X и по Y, так как sourceW / sourceH === 1200 / 450
    const canvasScale = TARGET_WIDTH / sourceW;

    ctx.save();
    // Переносим начало координат в центр Canvas (600, 225)
    ctx.translate(TARGET_WIDTH / 2, TARGET_HEIGHT / 2);
    // Изотропно масштабируем
    ctx.scale(canvasScale, canvasScale);
    // Центрируем вырезаемую область исходного изображения
    ctx.translate(-sourceCenterX, -sourceCenterY);
    // Отрисовываем исходное изображение в его естественных координатах от (0, 0)
    ctx.drawImage(img, 0, 0, naturalWidth.value, naturalHeight.value);
    ctx.restore();

    // 5. Экспорт в JPEG 0.92 и Blob
    const base64 = canvas.toDataURL('image/jpeg', 0.92);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        emit('crop-complete', { base64, blob });
        emit('update:modelValue', false);
      },
      'image/jpeg',
      0.92
    );
  } catch (err) {
    console.error('Ошибка аналитического кадрирования обложки:', err);
  } finally {
    isProcessing.value = false;
  }
}
</script>
