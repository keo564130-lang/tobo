// ==============================================================================
// ХРАНИЛИЩЕ АВТОРИЗАЦИИ И ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Profile } from '@/types/database';
import { localStore, supabase, isSupabaseConfigured } from '@/lib/supabase';
import { mishaProfileMock, currentUserMock } from '@/lib/mockData';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<Profile>(localStore.getCurrentUser());
  const isAuthenticated = ref(true);
  const showOnboarding = ref(false);
  const onboardingStep = ref<'register' | 'profile'>('register');

  function openOnboarding(step: 'register' | 'profile' = 'register') {
    onboardingStep.value = step;
    showOnboarding.value = true;
  }

  function updateProfile(updates: Partial<Profile>) {
    const updated = localStore.updateCurrentUser(updates);
    user.value = updated;
  }

  function registerQuickUser(email: string, _password?: string) {
    isAuthenticated.value = true;
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    const updated = localStore.updateCurrentUser({
      username: baseUsername,
      first_name: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1)
    });
    user.value = updated;
    localStorage.setItem('tobo_user_email', email);
  }

  async function completeOnboarding(profileData: Partial<Profile>) {
    updateProfile(profileData);
    localStorage.setItem('tobo_onboarding_completed', 'true');

    if (supabase && isSupabaseConfigured()) {
      try {
        await supabase.from('profiles').update({
          first_name: profileData.first_name,
          last_name: profileData.last_name,
          username: profileData.username,
          bio: profileData.bio,
          avatar_url: profileData.avatar_url,
          cover_url: profileData.cover_url,
          updated_at: new Date().toISOString()
        }).eq('id', user.value.id);
      } catch (err) {
        console.warn('Supabase sync skipped/failed:', err);
      }
    }
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
    showOnboarding,
    onboardingStep,
    openOnboarding,
    updateProfile,
    registerQuickUser,
    completeOnboarding,
    switchAccount
  };
});
