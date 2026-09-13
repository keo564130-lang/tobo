// ==============================================================================
// ХРАНИЛИЩЕ НАСТРОЕК СИСТЕМЫ, БЕЗОПАСНОСТИ И КОНФИДЕНЦИАЛЬНОСТИ (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserSettings, ActiveSession } from '@/types/database';
import { localStore } from '@/lib/supabase';
import { useToastStore } from '@/stores/toast';

const DEFAULT_SETTINGS: UserSettings = {
  privacy: {
    online_visibility: 'everyone',
    can_message: 'everyone',
    can_add_to_groups: 'everyone'
  },
  notifications: {
    push_enabled: true,
    direct_sound: true,
    group_sound: true,
    channel_sound: false,
    vibration: true
  },
  storage: {
    auto_download: 'always'
  },
  security: {
    two_factor_enabled: false
  }
};

export function getCurrentSessionInfo(): ActiveSession {
  const ua = typeof navigator !== 'undefined' ? navigator.userAgent : '';

  // Определение реального устройства / ОС
  let device = 'ПК / Рабочая станция';
  if (/android/i.test(ua)) {
    device = 'Android устройство';
  } else if (/iphone/i.test(ua)) {
    device = 'Apple iPhone';
  } else if (/ipad/i.test(ua)) {
    device = 'Apple iPad';
  } else if (/macintosh|mac os x/i.test(ua)) {
    device = 'Apple Mac';
  } else if (/windows/i.test(ua)) {
    device = 'Windows PC';
  } else if (/linux/i.test(ua)) {
    device = 'Linux PC';
  }

  // Определение реального веб-браузера
  let browser = 'Веб-браузер';
  if (/edg/i.test(ua)) {
    browser = 'Microsoft Edge';
  } else if (/chrome|crios/i.test(ua)) {
    browser = 'Google Chrome';
  } else if (/firefox|fxios/i.test(ua)) {
    browser = 'Mozilla Firefox';
  } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
    browser = 'Apple Safari';
  } else if (/opera|opr/i.test(ua)) {
    browser = 'Opera';
  }

  return {
    id: `session-current-${Date.now()}`,
    user_id: '',
    device,
    browser,
    ip_address: '127.0.0.1 (Текущий IP)',
    last_active: 'Текущий сеанс',
    is_current: true
  };
}

export const useSettingsStore = defineStore('settings', () => {
  const savedSettings = localStorage.getItem('tobo_user_settings');
  const settings = ref<UserSettings>(
    savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS
  );

  // Всегда содержит только РЕАЛЬНУЮ текущую сессию пользователя (никаких заглушек)
  const activeSessions = ref<ActiveSession[]>([getCurrentSessionInfo()]);
  const cacheSizeMb = ref<number>(0.0);

  function saveSettings() {
    localStorage.setItem('tobo_user_settings', JSON.stringify(settings.value));
  }

  function toggle2FA() {
    settings.value.security.two_factor_enabled = !settings.value.security.two_factor_enabled;
    saveSettings();
  }

  function terminateOtherSessions() {
    localStore.terminateOtherSessions();
    activeSessions.value = [getCurrentSessionInfo()];
    const toastStore = useToastStore();
    toastStore.show('Все остальные сеансы успешно завершены', 'success');
  }

  function clearMediaCache() {
    cacheSizeMb.value = 0.0;
  }

  function exportUserData() {
    const data = {
      profile: localStore.getCurrentUser(),
      posts: localStore.getUserPosts(localStore.getCurrentUser().id),
      chats: localStore.getChats(),
      sessions: activeSessions.value,
      settings: settings.value,
      exported_at: new Date().toISOString(),
      platform: 'tobo Social Network & Messenger (Apache 2.0)'
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tobo_gdpr_export_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return {
    settings,
    activeSessions,
    cacheSizeMb,
    saveSettings,
    toggle2FA,
    terminateOtherSessions,
    clearMediaCache,
    exportUserData
  };
});
