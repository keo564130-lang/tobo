// ==============================================================================
// ХРАНИЛИЩЕ НАСТРОЕК СИСТЕМЫ, БЕЗОПАСНОСТИ И КОНФИДЕНЦИАЛЬНОСТИ (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { UserSettings, ActiveSession } from '@/types/database';
import { localStore } from '@/lib/supabase';

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

export const useSettingsStore = defineStore('settings', () => {
  const savedSettings = localStorage.getItem('tobo_user_settings');
  const settings = ref<UserSettings>(
    savedSettings ? JSON.parse(savedSettings) : DEFAULT_SETTINGS
  );

  const activeSessions = ref<ActiveSession[]>(localStore.getActiveSessions());
  const cacheSizeMb = ref<number>(24.8);

  function saveSettings() {
    localStorage.setItem('tobo_user_settings', JSON.stringify(settings.value));
  }

  function toggle2FA() {
    settings.value.security.two_factor_enabled = !settings.value.security.two_factor_enabled;
    saveSettings();
  }

  function terminateOtherSessions() {
    localStore.terminateOtherSessions();
    activeSessions.value = localStore.getActiveSessions();
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
