// ==============================================================================
// ХРАНИЛИЩЕ АВТОРИЗАЦИИ И ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Profile } from '@/types/database';
import { localStore } from '@/lib/supabase';
import { mishaProfileMock, currentUserMock } from '@/lib/mockData';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Profile>(localStore.getCurrentUser());
  const isAuthenticated = ref(true);

  function updateProfile(updates: Partial<Profile>) {
    const updated = localStore.updateCurrentUser(updates);
    user.value = updated;
  }

  // Возможность переключения пользователя для проверки симметричности интерфейса
  function switchAccount(target: 'me' | 'misha') {
    if (target === 'misha') {
      user.value = localStore.updateCurrentUser({ ...mishaProfileMock });
    } else {
      user.value = localStore.updateCurrentUser({ ...currentUserMock });
    }
  }

  return {
    user,
    isAuthenticated,
    updateProfile,
    switchAccount
  };
});
