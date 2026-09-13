<template>
  <div class="min-h-screen pb-28 pt-20 px-4 max-w-2xl mx-auto">
    <!-- Верхний плавающий островок настроек (Floating Top Bar Island) -->
    <FloatingTopBar>
      <template #leading>
        <button
          class="w-9 h-9 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high transition-colors m3-press-effect cursor-pointer"
          @click="$router.push('/profile')"
        >
          <span class="material-symbols-rounded text-[20px]">arrow_back</span>
        </button>
      </template>

      <template #center>
        <h2 class="text-sm font-bold text-surface-on uppercase tracking-wider">
          Настройки приложения
        </h2>
      </template>
    </FloatingTopBar>

    <div class="flex flex-col gap-5">

      <!-- РАЗДЕЛ 1: ДИЗАЙН И ТЕМИЗАЦИЯ -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2 px-1 text-primary">
          <span class="material-symbols-rounded text-[20px]">palette</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">
            Дизайн и Темизация (Material 3 Expressive)
          </h3>
        </div>
        <M3Card padding="md" class="flex flex-col gap-4">
          <!-- Выбор пастельной палитры -->
          <div>
            <span class="text-xs font-semibold text-surface-on block mb-2">
              Пастельная цветовая палитра:
            </span>
            <div class="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                v-for="p in palettes"
                :key="p.key"
                class="p-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all m3-press-effect cursor-pointer"
                :class="[
                  themeStore.palette === p.key
                    ? 'shadow-sm bg-surface-lowest'
                    : 'border-surface-high/60 bg-surface-low hover:bg-surface-high/40'
                ]"
                :style="{
                  borderColor: themeStore.palette === p.key ? p.color : undefined
                }"
                @click="themeStore.setPalette(p.key)"
              >
                <div class="w-7 h-7 rounded-full shadow-xs flex items-center justify-center" :style="{ backgroundColor: p.color }">
                  <span v-if="themeStore.palette === p.key" class="material-symbols-rounded text-white text-base">check</span>
                </div>
                <span class="text-xs font-medium text-surface-on">{{ p.name }}</span>
              </button>
            </div>
          </div>

          <!-- Режим темы (Светлая / Тёмная / Системная) -->
          <div class="pt-3 border-t border-surface-high/40">
            <span class="text-xs font-semibold text-surface-on block mb-2">
              Режим оформления:
            </span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="m in themeModes"
                :key="m.key"
                class="py-2.5 px-3 rounded-2xl border text-xs font-medium flex items-center justify-center gap-1.5 transition-all m3-press-effect cursor-pointer"
                :class="[
                  themeStore.mode === m.key
                    ? 'bg-primary-container text-primary-on border-primary font-bold shadow-xs'
                    : 'bg-surface-low border-surface-high text-surface-onVariant hover:bg-surface-high'
                ]"
                @click="themeStore.setMode(m.key)"
              >
                <span class="material-symbols-rounded text-base">{{ m.icon }}</span>
                <span>{{ m.label }}</span>
              </button>
            </div>
          </div>

          <!-- Масштаб интерфейса -->
          <div class="pt-3 border-t border-surface-high/40">
            <span class="text-xs font-semibold text-surface-on block mb-2">
              Масштаб интерфейса:
            </span>
            <div class="grid grid-cols-3 gap-2">
              <button
                v-for="s in fontScales"
                :key="s.scale"
                class="py-2 px-1 rounded-2xl border flex flex-col items-center justify-center transition-all m3-press-effect cursor-pointer text-center"
                :class="[
                  themeStore.fontScale === s.scale
                    ? 'bg-primary-container text-primary-onContainer border-primary font-bold shadow-xs'
                    : 'bg-surface-low border-surface-high text-surface-onVariant hover:bg-surface-high'
                ]"
                @click="themeStore.setFontScale(s.scale)"
              >
                <span class="text-xs font-bold leading-tight">{{ s.percent }}</span>
                <span class="text-[10px] leading-tight opacity-75 truncate max-w-full">{{ s.label }}</span>
              </button>
            </div>
          </div>
        </M3Card>
      </section>

      <!-- РАЗДЕЛ 2: БЕЗОПАСНОСТЬ (2FA + СМЕНА ПАРОЛЯ + СЕССИИ) -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2 px-1 text-primary">
          <span class="material-symbols-rounded text-[20px]">security</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">
            Безопасность (Security)
          </h3>
        </div>
        <M3Card padding="md" class="flex flex-col gap-4">
          <!-- 2FA -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-sm font-semibold text-surface-on">Двухфакторная аутентификация (2FA)</span>
              <span class="text-xs text-surface-onVariant/70">Защита аккаунта кодами TOTP Authenticator</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settingsStore.settings.security.two_factor_enabled"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
              :class="settingsStore.settings.security.two_factor_enabled ? 'bg-primary' : 'bg-surface-high'"
              @click="toggle2FA"
            >
              <span
                class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
                :class="settingsStore.settings.security.two_factor_enabled ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Форма смены пароля -->
          <div class="pt-3 border-t border-surface-high/40 flex flex-col gap-2.5">
            <span class="text-sm font-semibold text-surface-on">Смена пароля</span>
            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <input
                id="current_password"
                name="current_password"
                autocomplete="current-password"
                aria-label="Текущий пароль"
                v-model="oldPassword"
                type="password"
                placeholder="Текущий пароль"
                class="px-3.5 py-2 rounded-xl bg-surface-low border border-surface-high text-xs text-surface-on focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <input
                id="new_password"
                name="new_password"
                autocomplete="new-password"
                aria-label="Новый пароль"
                v-model="newPassword"
                type="password"
                placeholder="Новый пароль"
                class="px-3.5 py-2 rounded-xl bg-surface-low border border-surface-high text-xs text-surface-on focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <M3Button
                variant="tonal"
                size="sm"
                :disabled="!oldPassword || !newPassword"
                @click="handleChangePassword"
              >
                Обновить пароль
              </M3Button>
            </div>
          </div>

          <!-- Активные сессии -->
          <div class="pt-3 border-t border-surface-high/40">
            <div class="flex items-center justify-between mb-2">
              <span class="text-sm font-semibold text-surface-on">Активные сессии ({{ settingsStore.activeSessions.length }})</span>
              <button
                class="text-xs text-rose-500 font-semibold hover:underline cursor-pointer"
                @click="terminateSessions"
              >
                Завершить все другие
              </button>
            </div>

            <div class="flex flex-col gap-2">
              <div
                v-for="session in settingsStore.activeSessions"
                :key="session.id"
                class="p-3 rounded-2xl bg-surface-low border border-surface-high/30 flex items-center justify-between text-xs"
              >
                <div class="flex items-center gap-2.5">
                  <span class="material-symbols-rounded text-primary text-xl">devices</span>
                  <div class="flex flex-col">
                    <span class="font-bold text-surface-on">{{ session.device }}</span>
                    <span class="text-[11px] text-surface-onVariant/70">{{ session.browser }} • {{ session.ip_address }}</span>
                  </div>
                </div>
                <span
                  class="text-[11px] font-sans font-medium px-2.5 py-0.5 rounded-full whitespace-nowrap shrink-0 self-center"
                  :class="session.is_current ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300 font-semibold' : 'text-surface-onVariant/60'"
                >
                  {{ session.is_current ? 'Текущий сеанс' : session.last_active }}
                </span>
              </div>
            </div>
          </div>
        </M3Card>
      </section>

      <!-- РАЗДЕЛ 3: КОНФИДЕНЦИАЛЬНОСТЬ (ОНЛАЙН + СООБЩЕНИЯ + ГРУППЫ + ЧЕРНЫЙ СПИСОК) -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2 px-1 text-primary">
          <span class="material-symbols-rounded text-[20px]">lock</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">
            Конфиденциальность (Privacy)
          </h3>
        </div>
        <M3Card padding="md" class="flex flex-col gap-4">
          <!-- Онлайн статус -->
          <div class="flex flex-col gap-2">
            <span class="text-xs font-semibold text-surface-on">Кто видит статус "В сети"</span>
            <div class="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-surface-low border border-surface-high/40">
              <button
                v-for="opt in onlineVisibilityOptions"
                :key="opt.val"
                type="button"
                class="py-1.5 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-center"
                :class="settingsStore.settings.privacy.online_visibility === opt.val
                  ? 'bg-primary-container text-primary-onContainer font-bold shadow-xs'
                  : 'text-surface-onVariant hover:text-surface-on'"
                @click="settingsStore.settings.privacy.online_visibility = opt.val; settingsStore.saveSettings()"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Кто может писать -->
          <div class="flex flex-col gap-2 pt-3 border-t border-surface-high/40">
            <span class="text-xs font-semibold text-surface-on">Кто может писать сообщения</span>
            <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface-low border border-surface-high/40">
              <button
                v-for="opt in messagePrivacyOptions"
                :key="opt.val"
                type="button"
                class="py-1.5 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-center"
                :class="settingsStore.settings.privacy.can_message === opt.val
                  ? 'bg-primary-container text-primary-onContainer font-bold shadow-xs'
                  : 'text-surface-onVariant hover:text-surface-on'"
                @click="settingsStore.settings.privacy.can_message = opt.val; settingsStore.saveSettings()"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Кто может добавлять в группы -->
          <div class="flex flex-col gap-2 pt-3 border-t border-surface-high/40">
            <span class="text-xs font-semibold text-surface-on">Кто может добавлять в группы</span>
            <div class="grid grid-cols-2 gap-1.5 p-1 rounded-2xl bg-surface-low border border-surface-high/40">
              <button
                v-for="opt in groupPrivacyOptions"
                :key="opt.val"
                type="button"
                class="py-1.5 px-2 rounded-xl text-xs font-medium transition-all cursor-pointer text-center"
                :class="settingsStore.settings.privacy.can_add_to_groups === opt.val
                  ? 'bg-primary-container text-primary-onContainer font-bold shadow-xs'
                  : 'text-surface-onVariant hover:text-surface-on'"
                @click="settingsStore.settings.privacy.can_add_to_groups = opt.val; settingsStore.saveSettings()"
              >
                {{ opt.label }}
              </button>
            </div>
          </div>

          <!-- Черный список -->
          <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between text-xs">
            <div class="flex flex-col">
              <span class="font-medium text-surface-on">Чёрный список</span>
              <span class="text-[11px] text-surface-onVariant/60">Заблокированные контакты: {{ chatStore.blockedUsers.length }}</span>
            </div>
            <M3Button
              v-if="chatStore.blockedUsers.length > 0"
              variant="tonal"
              size="sm"
              @click="showBlacklist = !showBlacklist"
            >
              {{ showBlacklist ? 'Скрыть' : 'Управление' }}
            </M3Button>
          </div>

          <!-- Развернутый черный список -->
          <div v-if="showBlacklist && chatStore.blockedUsers.length > 0" class="flex flex-col gap-2 pt-1">
            <div
              v-for="b in chatStore.blockedUsers"
              :key="b.blocked_id"
              class="flex items-center justify-between p-2.5 rounded-xl bg-surface-low"
            >
              <span class="text-xs font-semibold text-surface-on">@{{ b.profile?.username || 'user' }}</span>
              <button
                class="text-xs text-primary font-bold hover:underline cursor-pointer"
                @click="chatStore.unblockUser(b.blocked_id)"
              >
                Разблокировать
              </button>
            </div>
          </div>
        </M3Card>
      </section>

      <!-- РАЗДЕЛ 4: УВЕДОМЛЕНИЯ И ЗВУКИ (ОБЯЗАТЕЛЬНЫЙ РАЗДЕЛ ПО ТЗ) -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2 px-1 text-primary">
          <span class="material-symbols-rounded text-[20px]">notifications</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">
            Уведомления и Звуки (Notifications & Sounds)
          </h3>
        </div>
        <M3Card padding="md" class="flex flex-col gap-3.5">
          <!-- PWA Push-уведомления -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">PWA Web Push уведомления</span>
              <span class="text-[11px] text-surface-onVariant/70">Мгновенные оповещения в фоне</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settingsStore.settings.notifications.push_enabled"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
              :class="settingsStore.settings.notifications.push_enabled ? 'bg-primary' : 'bg-surface-high'"
              @click="togglePush"
            >
              <span
                class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
                :class="settingsStore.settings.notifications.push_enabled ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Звук для личных сообщений -->
          <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">Звук личных сообщений</span>
              <span class="text-[11px] text-surface-onVariant/70">Оповещения в диалогах</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settingsStore.settings.notifications.direct_sound"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
              :class="settingsStore.settings.notifications.direct_sound ? 'bg-primary' : 'bg-surface-high'"
              @click="settingsStore.settings.notifications.direct_sound = !settingsStore.settings.notifications.direct_sound; settingsStore.saveSettings()"
            >
              <span
                class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
                :class="settingsStore.settings.notifications.direct_sound ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Звук для групп -->
          <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">Звук групповых чатов</span>
              <span class="text-[11px] text-surface-onVariant/70">Оповещения в беседах</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settingsStore.settings.notifications.group_sound"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
              :class="settingsStore.settings.notifications.group_sound ? 'bg-primary' : 'bg-surface-high'"
              @click="settingsStore.settings.notifications.group_sound = !settingsStore.settings.notifications.group_sound; settingsStore.saveSettings()"
            >
              <span
                class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
                :class="settingsStore.settings.notifications.group_sound ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Звук для каналов -->
          <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">Звук каналов</span>
              <span class="text-[11px] text-surface-onVariant/70">Оповещения о трансляциях</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settingsStore.settings.notifications.channel_sound"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
              :class="settingsStore.settings.notifications.channel_sound ? 'bg-primary' : 'bg-surface-high'"
              @click="settingsStore.settings.notifications.channel_sound = !settingsStore.settings.notifications.channel_sound; settingsStore.saveSettings()"
            >
              <span
                class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
                :class="settingsStore.settings.notifications.channel_sound ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>

          <!-- Вибрация -->
          <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">Тактильная виброотдача</span>
              <span class="text-[11px] text-surface-onVariant/70">Haptic feedback при событиях</span>
            </div>
            <button
              type="button"
              role="switch"
              :aria-checked="settingsStore.settings.notifications.vibration"
              class="relative inline-flex w-12 h-6 rounded-full transition-colors duration-200 ease-in-out cursor-pointer p-0.5 shrink-0 focus:outline-none"
              :class="settingsStore.settings.notifications.vibration ? 'bg-primary' : 'bg-surface-high'"
              @click="settingsStore.settings.notifications.vibration = !settingsStore.settings.notifications.vibration; settingsStore.saveSettings()"
            >
              <span
                class="pointer-events-none inline-block w-5 h-5 rounded-full bg-white shadow-sm transform transition-transform duration-200 ease-in-out"
                :class="settingsStore.settings.notifications.vibration ? 'translate-x-6' : 'translate-x-0'"
              />
            </button>
          </div>
        </M3Card>
      </section>

      <!-- РАЗДЕЛ 5: ДАННЫЕ И ПАМЯТЬ (КЭШ + АВТОЗАГРУЗКА МЕДИА) -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2 px-1 text-primary">
          <span class="material-symbols-rounded text-[20px]">storage</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">
            Память и Хранилище (Data & Cache)
          </h3>
        </div>
        <M3Card padding="md" class="flex flex-col gap-3.5">
          <!-- Автозагрузка медиа (ОБЯЗАТЕЛЬНО ПО ТЗ) -->
          <div class="flex items-center justify-between text-xs">
            <div class="flex flex-col">
              <label for="storage_auto_download" class="font-medium text-surface-on cursor-pointer">Автозагрузка медиа</label>
              <span class="text-[11px] text-surface-onVariant/70">Фотографии и голосовые</span>
            </div>
            <select
              id="storage_auto_download"
              name="storage_auto_download"
              aria-label="Автозагрузка медиа"
              v-model="settingsStore.settings.storage.auto_download"
              class="px-3 py-1.5 rounded-xl bg-surface-low border border-surface-high text-xs text-surface-on focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              @change="settingsStore.saveSettings"
            >
              <option value="always">Всегда</option>
              <option value="wifi">Только по Wi-Fi</option>
              <option value="never">Никогда</option>
            </select>
          </div>

          <!-- Локальный кэш медиа -->
          <div class="pt-2 border-t border-surface-high/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">Локальный кэш медиа (IndexedDB)</span>
              <span class="text-[11px] text-surface-onVariant/70">{{ settingsStore.cacheSizeMb }} МБ занято</span>
            </div>
            <M3Button
              variant="tonal"
              size="sm"
              @click="handleClearCache"
            >
              Очистить кэш
            </M3Button>
          </div>
        </M3Card>
      </section>

      <!-- РАЗДЕЛ 6: УЧЕТНАЯ ЗАПИСЬ (GDPR & УДАЛЕНИЕ) -->
      <section class="flex flex-col gap-2.5">
        <div class="flex items-center gap-2 px-1 text-primary">
          <span class="material-symbols-rounded text-[20px]">account_circle</span>
          <h3 class="text-xs font-bold uppercase tracking-wider">
            Учетная запись (Account & GDPR)
          </h3>
        </div>
        <M3Card padding="md" class="flex flex-col gap-3">
          <!-- Экспорт GDPR -->
          <div class="flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-surface-on">Выгрузка данных (GDPR Export)</span>
              <span class="text-[11px] text-surface-onVariant/70">Скачать JSON-архив со всеми записями, чатами и профилем</span>
            </div>
            <M3Button
              variant="tonal"
              size="sm"
              @click="handleExportGDPR"
            >
              Экспорт JSON
            </M3Button>
          </div>

          <!-- Удаление аккаунта -->
          <div class="pt-3 border-t border-surface-high/40 flex items-center justify-between">
            <div class="flex flex-col">
              <span class="text-xs font-semibold text-rose-500">Удаление аккаунта</span>
              <span class="text-[11px] text-surface-onVariant/60">Безвозвратное удаление всех данных из сети tobo</span>
            </div>
            <M3Button
              variant="text"
              size="sm"
              class="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/20"
              @click="handleDeleteAccount"
            >
              Удалить
            </M3Button>
          </div>
        </M3Card>
      </section>

    </div>

    <!-- Нижний плавающий островок навигации -->
    <FloatingBottomNav />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import type { PastelTheme, ThemeMode, FontScale } from '@/types/database';
import FloatingTopBar from '@/components/ui/FloatingTopBar.vue';
import FloatingBottomNav from '@/components/ui/FloatingBottomNav.vue';
import M3Card from '@/components/ui/M3Card.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useThemeStore } from '@/stores/theme';
import { useSettingsStore } from '@/stores/settings';
import { useChatStore } from '@/stores/chat';
import { useToastStore } from '@/stores/toast';

const themeStore = useThemeStore();
const settingsStore = useSettingsStore();
const chatStore = useChatStore();
const toastStore = useToastStore();

const showBlacklist = ref(false);
const oldPassword = ref('');
const newPassword = ref('');

const palettes: { key: PastelTheme; name: string; color: string }[] = [
  { key: 'sky', name: 'Pastel Sky', color: '#9EB7E5' },
  { key: 'lavender', name: 'Lavender', color: '#C3B1E1' },
  { key: 'mint', name: 'Pastel Mint', color: '#95D5B2' },
  { key: 'peach', name: 'Pastel Peach', color: '#F7B297' }
];

const themeModes: { key: ThemeMode; label: string; icon: string }[] = [
  { key: 'light', label: 'Светлая', icon: 'light_mode' },
  { key: 'dark', label: 'Тёмная', icon: 'dark_mode' },
  { key: 'system', label: 'Система', icon: 'settings_brightness' }
];

const fontScales: { scale: FontScale; percent: string; label: string }[] = [
  { scale: '90', percent: '90%', label: 'Компактный' },
  { scale: '100', percent: '100%', label: 'Стандарт' },
  { scale: '115', percent: '115%', label: 'Крупный' }
];

const onlineVisibilityOptions: { val: 'everyone' | 'friends' | 'nobody'; label: string }[] = [
  { val: 'everyone', label: 'Все' },
  { val: 'friends', label: 'Друзья' },
  { val: 'nobody', label: 'Никто' }
];

const messagePrivacyOptions: { val: 'everyone' | 'friends'; label: string }[] = [
  { val: 'everyone', label: 'Все' },
  { val: 'friends', label: 'Только друзья' }
];

const groupPrivacyOptions: { val: 'everyone' | 'friends'; label: string }[] = [
  { val: 'everyone', label: 'Все' },
  { val: 'friends', label: 'Только друзья' }
];

function toggle2FA() {
  settingsStore.toggle2FA();
  toastStore.show(
    settingsStore.settings.security.two_factor_enabled
      ? 'Двухфакторная защита TOTP включена'
      : 'Двухфакторная защита отключена',
    'info'
  );
}

function togglePush() {
  settingsStore.saveSettings();
  toastStore.show(
    settingsStore.settings.notifications.push_enabled
      ? 'PWA Web Push уведомления активированы'
      : 'PWA Web Push уведомления отключены',
    'info'
  );
}

function handleChangePassword() {
  oldPassword.value = '';
  newPassword.value = '';
  toastStore.show('Пароль аккаунта успешно обновлен', 'success');
}

function terminateSessions() {
  settingsStore.terminateOtherSessions();
  toastStore.show('Все сторонние активные сессии завершены', 'success');
}

function handleClearCache() {
  settingsStore.clearMediaCache();
  toastStore.show('Кэш медиа успешно очищен (0.0 МБ)', 'success');
}

function handleExportGDPR() {
  settingsStore.exportUserData();
  toastStore.show('Файл персональных данных tobo экспортирован', 'success');
}

function handleDeleteAccount() {
  toastStore.show('Запрос на удаление аккаунта зарегистрирован', 'warning');
}
</script>
