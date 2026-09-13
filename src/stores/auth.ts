// ==============================================================================
// ХРАНИЛИЩЕ АВТОРИЗАЦИИ И ПРОФИЛЯ ПОЛЬЗОВАТЕЛЯ (Pinia)
// Стандарт: Google Material 3 Expressive + Supabase Auth SDK
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { Session, User } from '@supabase/supabase-js';
import type { Profile } from '@/types/database';
import { supabase, isSupabaseConfigured, localStore } from '@/lib/supabase';
import { currentUserMock, mishaProfileMock } from '@/lib/mockData';

export const useAuthStore = defineStore('auth', () => {
  // Состояния
  const session = ref<Session | null>(null);
  const authUser = ref<User | null>(null);
  const user = ref<Profile>(localStore.getCurrentUser());
  const isLoading = ref(false);
  const isInitialized = ref(false);
  const authError = ref<string | null>(null);

  // Модальные окна
  const showAuthModal = ref(false);
  const authModalMode = ref<'signin' | 'signup'>('signin');
  const showOnboarding = ref(false);
  const onboardingStep = ref<'register' | 'profile'>('profile');

  // Геттеры
  const isAuthenticated = computed(() => Boolean(session.value?.user || (user.value && user.value.id !== '')));
  const isDeveloper = computed(() => Boolean(user.value?.is_developer));

  // 1. ИНИЦИАЛИЗАЦИЯ СЕССИИ И СЛУШАТЕЛЬ SUPABASE AUTH
  async function initAuth(): Promise<void> {
    if (isInitialized.value) return;
    isLoading.value = true;

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data: { session: existingSession } } = await supabase.auth.getSession();
        session.value = existingSession;
        authUser.value = existingSession?.user || null;

        if (existingSession?.user) {
          await loadUserProfile(existingSession.user.id);
        }

        // Слушатель событий смены состояния авторизации
        supabase.auth.onAuthStateChange(async (event, currentSession) => {
          session.value = currentSession;
          authUser.value = currentSession?.user || null;

          if (event === 'SIGNED_IN' && currentSession?.user) {
            await loadUserProfile(currentSession.user.id);
          } else if (event === 'SIGNED_OUT') {
            user.value = { ...currentUserMock, id: '', is_developer: false };
            localStore.updateCurrentUser(user.value);
          }
        });
      }
    } catch (err: any) {
      console.warn('initAuth warning:', err);
    } finally {
      isLoading.value = false;
      isInitialized.value = true;
    }
  }

  // Загрузка профиля из public.profiles
  async function loadUserProfile(userId: string): Promise<void> {
    if (!isSupabaseConfigured() || !supabase) return;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (!error && data) {
        user.value = {
          ...data,
          is_developer: Boolean(data.is_developer)
        };
        localStore.updateCurrentUser(user.value);
      }
    } catch (err) {
      console.warn('loadUserProfile error:', err);
    }
  }

  // 2. РЕГИСТРАЦИЯ
  async function signUp(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true;
    authError.value = null;

    try {
      if (isSupabaseConfigured() && supabase) {
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: {
              username: baseUsername,
              first_name: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1)
            }
          }
        });

        if (error) {
          authError.value = error.message;
          return { success: false, error: error.message };
        }

        if (data.user) {
          session.value = data.session;
          authUser.value = data.user;
          if (data.session) {
            await loadUserProfile(data.user.id);
          }
          return { success: true };
        }
      } else {
        // Офлайн-режим
        const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
        const updated = localStore.updateCurrentUser({
          username: baseUsername,
          first_name: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1),
          is_developer: false
        });
        user.value = updated;
        return { success: true };
      }
    } catch (err: any) {
      authError.value = err.message || 'Ошибка регистрации';
      return { success: false, error: authError.value || undefined };
    } finally {
      isLoading.value = false;
    }
    return { success: true };
  }

  // 3. ВХОД
  async function signIn(email: string, password: string): Promise<{ success: boolean; error?: string }> {
    isLoading.value = true;
    authError.value = null;

    try {
      if (isSupabaseConfigured() && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password
        });

        if (error) {
          authError.value = error.message;
          return { success: false, error: error.message };
        }

        session.value = data.session;
        authUser.value = data.user;
        await loadUserProfile(data.user.id);
        return { success: true };
      } else {
        return { success: true };
      }
    } catch (err: any) {
      authError.value = err.message || 'Ошибка входа';
      return { success: false, error: authError.value || undefined };
    } finally {
      isLoading.value = false;
    }
  }

  // 4. ВЫХОД
  async function signOut(): Promise<void> {
    if (isSupabaseConfigured() && supabase) {
      await supabase.auth.signOut();
    }
    session.value = null;
    authUser.value = null;
    user.value = { ...currentUserMock, id: '', is_developer: false };
    localStore.updateCurrentUser(user.value);
  }

  // 5. ЗАГРУЗКА АВАТАРА В SUPABASE STORAGE
  async function uploadAvatar(blob: Blob): Promise<string> {
    if (!isSupabaseConfigured() || !supabase || !user.value.id) {
      return URL.createObjectURL(blob);
    }
    const path = `${user.value.id}/avatar_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('avatars').upload(path, blob, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from('avatars').getPublicUrl(path);
    return data.publicUrl;
  }

  // 6. ЗАГРУЗКА ОБЛОЖКИ В SUPABASE STORAGE
  async function uploadCover(file: File | Blob): Promise<string> {
    if (!isSupabaseConfigured() || !supabase || !user.value.id) {
      return URL.createObjectURL(file);
    }
    const path = `${user.value.id}/cover_${Date.now()}.jpg`;
    const { error } = await supabase.storage.from('media').upload(path, file, {
      contentType: 'image/jpeg',
      upsert: true
    });
    if (error) throw error;
    const { data } = supabase.storage.from('media').getPublicUrl(path);
    return data.publicUrl;
  }

  // 7. ПРОВЕРКА УНИКАЛЬНОСТИ @USERNAME
  async function checkUsernameUnique(username: string): Promise<boolean> {
    if (!isSupabaseConfigured() || !supabase) return true;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', username.toLowerCase().trim())
        .neq('id', user.value.id || '00000000-0000-0000-0000-000000000000')
        .limit(1);
      return !error && (!data || data.length === 0);
    } catch {
      return true;
    }
  }

  // 8. ЗАВЕРШЕНИЕ ОНБОРДИНГА
  async function completeOnboarding(profileData: Partial<Profile>): Promise<void> {
    const updated = localStore.updateCurrentUser(profileData);
    user.value = updated;
    localStorage.setItem('tobo_onboarding_completed', 'true');

    if (isSupabaseConfigured() && supabase && user.value.id) {
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
        console.warn('completeOnboarding Supabase update failed:', err);
      }
    }
  }

  // 9. ОБНОВЛЕНИЕ ДАННЫХ ПРОФИЛЯ
  async function updateProfile(updates: Partial<Profile>): Promise<void> {
    const updated = localStore.updateCurrentUser(updates);
    user.value = updated;

    if (isSupabaseConfigured() && supabase && user.value.id) {
      try {
        const payload: Record<string, any> = {
          ...updates,
          updated_at: new Date().toISOString()
        };
        delete payload.id;
        delete payload.created_at;
        await supabase.from('profiles').update(payload).eq('id', user.value.id);
      } catch (err) {
        console.warn('updateProfile Supabase update failed:', err);
      }
    }
  }

  // Быстрая регистрация (обратная совместимость)
  function registerQuickUser(email: string, _password?: string) {
    const baseUsername = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
    const updated = localStore.updateCurrentUser({
      username: baseUsername,
      first_name: baseUsername.charAt(0).toUpperCase() + baseUsername.slice(1)
    });
    user.value = updated;
    localStorage.setItem('tobo_user_email', email);
  }

  // Переключение аккаунта (локальный режим отладки)
  function switchAccount(target: 'me' | 'misha') {
    if (target === 'misha') {
      user.value = localStore.updateCurrentUser({ ...mishaProfileMock });
    } else {
      user.value = localStore.updateCurrentUser({ ...currentUserMock });
    }
  }

  function openAuthModal(mode: 'signin' | 'signup' = 'signin') {
    authModalMode.value = mode;
    showAuthModal.value = true;
  }

  function openOnboarding(step: 'register' | 'profile' = 'profile') {
    onboardingStep.value = step;
    showOnboarding.value = true;
  }

  return {
    session,
    authUser,
    user,
    isLoading,
    isInitialized,
    authError,
    showAuthModal,
    authModalMode,
    showOnboarding,
    onboardingStep,
    isAuthenticated,
    isDeveloper,
    initAuth,
    loadUserProfile,
    signUp,
    signIn,
    signOut,
    uploadAvatar,
    uploadCover,
    checkUsernameUnique,
    completeOnboarding,
    updateProfile,
    registerQuickUser,
    switchAccount,
    openAuthModal,
    openOnboarding
  };
});
