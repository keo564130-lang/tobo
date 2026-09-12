// ==============================================================================
// ХРАНИЛИЩЕ ТЕМЫ И ДИЗАЙН-СИСТЕМЫ MATERIAL 3 EXPRESSIVE (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { PastelTheme, ThemeMode, FontScale } from '@/types/database';

export const useThemeStore = defineStore('theme', () => {
  const palette = ref<PastelTheme>(
    (localStorage.getItem('tobo_palette') as PastelTheme) || 'sky'
  );
  const mode = ref<ThemeMode>(
    (localStorage.getItem('tobo_theme_mode') as ThemeMode) || 'light'
  );
  const fontScale = ref<FontScale>(
    (localStorage.getItem('tobo_font_scale') as FontScale) || '100'
  );

  function applyTheme() {
    const root = document.documentElement;

    // Применение пастельной палитры
    root.setAttribute('data-theme-palette', palette.value);

    // Применение темного/светлого режима
    const isDark =
      mode.value === 'dark' ||
      (mode.value === 'system' &&
        window.matchMedia('(prefers-color-scheme: dark)').matches);

    if (isDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    // Применение масштаба шрифта
    root.style.setProperty('--font-scale', `${fontScale.value}%`);

    // Сохранение в LocalStorage
    localStorage.setItem('tobo_palette', palette.value);
    localStorage.setItem('tobo_theme_mode', mode.value);
    localStorage.setItem('tobo_font_scale', fontScale.value);
  }

  function setPalette(newPalette: PastelTheme) {
    palette.value = newPalette;
    applyTheme();
  }

  function setMode(newMode: ThemeMode) {
    mode.value = newMode;
    applyTheme();
  }

  function setFontScale(newScale: FontScale) {
    fontScale.value = newScale;
    applyTheme();
  }

  return {
    palette,
    mode,
    fontScale,
    applyTheme,
    setPalette,
    setMode,
    setFontScale
  };
});
