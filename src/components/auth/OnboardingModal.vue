<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
  >
    <div
      class="w-full max-w-lg rounded-4xl bg-surface-lowest border border-surface-high/60 p-5 sm:p-7 shadow-elevation-4 flex flex-col gap-5 my-auto max-h-[92vh] overflow-y-auto"
    >
      <!-- ===================================================================== -->
      <!-- ШАГ 1: БЫСТРАЯ РЕГИСТРАЦИЯ (EMAIL + ПАРОЛЬ) -->
      <!-- ===================================================================== -->
      <template v-if="currentStep === 'register'">
        <!-- Шапка регистрации -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-sans font-black tracking-tight text-2xl leading-none text-primary select-none -translate-y-[1px]">tobo</span>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary-onContainer leading-normal">
              Регистрация
            </span>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors"
            @click="closeModal"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <div>
          <h2 class="text-lg font-bold text-surface-on">Быстрая регистрация</h2>
          <p class="text-xs text-surface-onVariant/80 mt-1">
            Создайте аккаунт в tobo всего за пару секунд и перейдите к оформлению профиля
          </p>
        </div>

        <form @submit.prevent="handleQuickRegister" class="flex flex-col gap-4">
          <!-- Поле Email -->
          <div>
            <label for="onboarding_email" class="block text-xs font-semibold text-surface-on mb-1.5">
              Электронная почта (Email) *
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-surface-onVariant/60 material-symbols-rounded text-lg select-none">
                mail
              </span>
              <input
                id="onboarding_email"
                name="email"
                v-model="email"
                type="email"
                required
                autocomplete="email"
                placeholder="name@example.com"
                class="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on placeholder:text-surface-onVariant/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                :class="{ 'border-rose-500': emailError }"
              />
            </div>
            <span v-if="emailError" class="text-[11px] text-rose-500 mt-1 block">{{ emailError }}</span>
          </div>

          <!-- Поле Пароль -->
          <div>
            <label for="onboarding_password" class="block text-xs font-semibold text-surface-on mb-1.5">
              Пароль *
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-3 text-surface-onVariant/60 material-symbols-rounded text-lg select-none">
                lock
              </span>
              <input
                id="onboarding_password"
                name="password"
                v-model="password"
                :type="showPassword ? 'text' : 'password'"
                required
                minlength="6"
                autocomplete="new-password"
                placeholder="Минимум 6 символов"
                class="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on placeholder:text-surface-onVariant/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                :class="{ 'border-rose-500': passwordError }"
              />
              <button
                type="button"
                aria-label="Показать пароль"
                class="absolute right-3 top-2.5 text-surface-onVariant/60 hover:text-surface-on transition-colors cursor-pointer"
                @click="showPassword = !showPassword"
              >
                <span class="material-symbols-rounded text-lg">
                  {{ showPassword ? 'visibility_off' : 'visibility' }}
                </span>
              </button>
            </div>
            <span v-if="passwordError" class="text-[11px] text-rose-500 mt-1 block">{{ passwordError }}</span>
          </div>

          <!-- Кнопка "Продолжить" -->
          <div class="pt-2 flex flex-col gap-2">
            <button
              type="submit"
              class="w-full py-3 rounded-full bg-primary text-primary-on font-bold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Продолжить</span>
              <span class="material-symbols-rounded text-base">arrow_forward</span>
            </button>
            <button
              type="button"
              class="text-xs text-primary font-medium hover:underline text-center py-1 cursor-pointer"
              @click="currentStep = 'profile'"
            >
              Уже есть аккаунт? Настроить профиль
            </button>
          </div>
        </form>
      </template>

      <!-- ===================================================================== -->
      <!-- ШАГ 2: ЭКРАН ОНБОРДИНГА («НАСТРОЙКА ПРОФИЛЯ TOBO») -->
      <!-- ===================================================================== -->
      <template v-else-if="currentStep === 'profile'">
        <!-- Шапка онбординга -->
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <button
              type="button"
              aria-label="Назад к регистрации"
              class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors"
              @click="currentStep = 'register'"
            >
              <span class="material-symbols-rounded text-xl">arrow_back</span>
            </button>
            <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary-onContainer leading-normal">
              Шаг 2 из 2
            </span>
          </div>
          <button
            type="button"
            aria-label="Закрыть"
            class="w-8 h-8 rounded-full flex items-center justify-center text-surface-onVariant hover:bg-surface-high cursor-pointer transition-colors"
            @click="closeModal"
          >
            <span class="material-symbols-rounded text-xl">close</span>
          </button>
        </div>

        <div>
          <h2 class="text-lg font-bold text-surface-on">
            Добро пожаловать в tobo! Давайте настроим ваш профиль
          </h2>
          <p class="text-xs text-surface-onVariant/80 mt-1">
            Загрузите фото, выберите красивую пастельную обложку и придумайте ваш @username
          </p>
        </div>

        <form @submit.prevent="handleCompleteOnboarding" class="flex flex-col gap-4">
          <!-- 1. ОБЛОЖКА ПРОФИЛЯ (COVER) -->
          <div>
            <label class="block text-xs font-semibold text-surface-on mb-1.5">Обложка профиля</label>
            <div class="relative w-full h-28 sm:h-32 rounded-3xl overflow-hidden border border-surface-high/50 bg-surface-low group">
              <img
                :src="coverUrl || alexCoverSvg"
                alt="Обложка"
                class="w-full h-full object-cover transition-opacity duration-200"
              />
              <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
              <label
                for="onboarding_cover_file"
                class="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-xs text-white text-xs font-medium hover:bg-black/80 cursor-pointer transition-all m3-press-effect"
              >
                <span class="material-symbols-rounded text-sm">photo_camera</span>
                <span>Выбрать обложку</span>
                <input
                  id="onboarding_cover_file"
                  name="cover_file"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleCoverUpload"
                />
              </label>
            </div>

            <!-- 4 пастельных пресета обложек -->
            <div class="flex items-center gap-2 overflow-x-auto py-1.5 mt-1.5">
              <button
                v-for="preset in presetCovers"
                :key="preset.label"
                type="button"
                :title="preset.label"
                class="h-8 w-16 rounded-xl border-2 transition-all shrink-0 m3-press-effect overflow-hidden cursor-pointer"
                :class="coverUrl === preset.url ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-transparent opacity-75 hover:opacity-100'"
                @click="coverUrl = preset.url"
              >
                <img :src="preset.url" :alt="preset.label" class="w-full h-full object-cover" />
              </button>
            </div>
          </div>

          <!-- 2. КРУГЛЫЙ АВАТАР ПО ЦЕНТРУ С ВИДОИСКАТЕЛЕМ -->
          <div class="flex flex-col items-center -mt-8 relative z-10">
            <div class="relative group">
              <img
                :src="avatarUrl || alexAvatarSvg"
                alt="Аватар"
                class="w-20 h-20 rounded-full object-cover ring-4 ring-surface-lowest shadow-elevation-2 bg-surface-low"
              />
              <label
                for="onboarding_avatar_file"
                class="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-on flex items-center justify-center shadow-elevation-1 cursor-pointer hover:opacity-90 m3-press-effect border-2 border-surface-lowest transition-transform active:scale-95"
                title="Загрузить и кадрировать фото"
              >
                <span class="material-symbols-rounded text-sm">photo_camera</span>
                <input
                  id="onboarding_avatar_file"
                  name="avatar_file"
                  type="file"
                  accept="image/*"
                  class="hidden"
                  @change="handleAvatarUpload"
                />
              </label>
            </div>

            <div class="flex items-center gap-2 mt-2">
              <label
                for="onboarding_avatar_file"
                class="text-xs text-primary font-semibold hover:underline cursor-pointer flex items-center gap-1"
              >
                <span class="material-symbols-rounded text-sm">crop</span>
                <span>Выбрать и кадрировать фото</span>
              </label>
            </div>

            <!-- Горизонтальные пресеты аватаров -->
            <div class="flex items-center gap-2 overflow-x-auto py-1 mt-1">
              <button
                v-for="preset in presetAvatars"
                :key="preset.label"
                type="button"
                :title="preset.label"
                class="w-7 h-7 rounded-full border-2 transition-all shrink-0 m3-press-effect overflow-hidden cursor-pointer"
                :class="avatarUrl === preset.url ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-transparent opacity-70 hover:opacity-100'"
                @click="avatarUrl = preset.url"
              >
                <img :src="preset.url" :alt="preset.label" class="w-full h-full object-cover" />
              </button>
            </div>
          </div>

          <!-- 3. ИМЯ И ФАМИЛИЯ -->
          <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label for="onboarding_first_name" class="block text-xs font-semibold text-surface-on mb-1.5">
                Имя *
              </label>
              <input
                id="onboarding_first_name"
                name="first_name"
                v-model="firstName"
                type="text"
                required
                autocomplete="given-name"
                placeholder="Ваше имя"
                class="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                :class="{ 'border-rose-500': firstNameError }"
              />
              <span v-if="firstNameError" class="text-[11px] text-rose-500 mt-1 block">{{ firstNameError }}</span>
            </div>

            <div>
              <label for="onboarding_last_name" class="block text-xs font-semibold text-surface-on mb-1.5">
                Фамилия
              </label>
              <input
                id="onboarding_last_name"
                name="last_name"
                v-model="lastName"
                type="text"
                autocomplete="family-name"
                placeholder="Необязательно"
                class="w-full px-3.5 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              />
            </div>
          </div>

          <!-- 4. ЮЗЕРНЕЙМ (@username) -->
          <div>
            <label for="onboarding_username" class="block text-xs font-semibold text-surface-on mb-1.5">
              Юзернейм (@username) *
            </label>
            <div class="relative">
              <span class="absolute left-3.5 top-2.5 text-surface-onVariant/60 text-sm font-semibold select-none">@</span>
              <input
                id="onboarding_username"
                name="username"
                v-model="username"
                type="text"
                required
                autocomplete="username"
                placeholder="username"
                class="w-full pl-8 pr-3.5 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                :class="{ 'border-rose-500': usernameError }"
                @input="formatUsername"
              />
            </div>
            <span v-if="usernameError" class="text-[11px] text-rose-500 mt-1 block">{{ usernameError }}</span>
            <span v-else class="text-[11px] text-surface-onVariant/70 mt-1 block">
              Только латиница, цифры и символ подчеркивания _
            </span>
          </div>

          <!-- 5. О СЕБЕ (BIO) -->
          <div>
            <label for="onboarding_bio" class="block text-xs font-semibold text-surface-on mb-1.5">
              О себе (Bio)
            </label>
            <textarea
              id="onboarding_bio"
              name="bio"
              v-model="bio"
              rows="2"
              placeholder="Пара слов о себе..."
              class="w-full p-3 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none transition-all"
            />
          </div>

          <!-- КНОПКА ЗАВЕРШЕНИЯ -->
          <div class="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              class="px-5 py-2.5 rounded-full text-xs font-semibold text-surface-on hover:bg-surface-high transition-colors cursor-pointer"
              @click="closeModal"
            >
              Пропустить
            </button>
            <button
              type="submit"
              class="px-6 py-2.5 rounded-full bg-primary text-primary-on font-bold text-xs shadow-sm hover:opacity-95 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
            >
              <span>Завершить и перейти в tobo!</span>
              <span class="material-symbols-rounded text-base">arrow_forward</span>
            </button>
          </div>
        </form>
      </template>
    </div>

    <!-- КРУГЛЫЙ КРОППЕР АВАТАРА (КАК В ВК) -->
    <AvatarCropperModal
      v-model="showCropperModal"
      :image-src="cropperImageSrc"
      @crop-complete="handleCropComplete"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import AvatarCropperModal from '@/components/profile/AvatarCropperModal.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import {
  alexAvatarSvg,
  mishaAvatarSvg,
  annaAvatarSvg,
  toboOfficialAvatarSvg,
  alexCoverSvg,
  mishaCoverSvg,
  annaCoverSvg,
  peachCoverSvg
} from '@/lib/mockData';

const props = withDefaults(
  defineProps<{
    modelValue: boolean;
    initialStep?: 'register' | 'profile';
  }>(),
  {
    initialStep: 'register'
  }
);

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const router = useRouter();
const authStore = useAuthStore();
const toastStore = useToastStore();

const currentStep = ref<'register' | 'profile'>(props.initialStep);

// Шаг 1: Регистрация
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const emailError = ref('');
const passwordError = ref('');

// Шаг 2: Профиль
const firstName = ref(authStore.user.first_name || '');
const lastName = ref(authStore.user.last_name || '');
const username = ref(authStore.user.username || '');
const bio = ref(authStore.user.bio || '');
const avatarUrl = ref(authStore.user.avatar_url || alexAvatarSvg);
const coverUrl = ref(authStore.user.cover_url || alexCoverSvg);
const firstNameError = ref('');
const usernameError = ref('');

// Кроппер
const showCropperModal = ref(false);
const cropperImageSrc = ref('');

// Пресеты
const presetCovers = [
  { label: 'Лазурная волна', url: alexCoverSvg },
  { label: 'Лаванда и персик', url: mishaCoverSvg },
  { label: 'Мятная гармония', url: annaCoverSvg },
  { label: 'Персиковый рассвет', url: peachCoverSvg }
];

const presetAvatars = [
  { label: 'Лазурный', url: alexAvatarSvg },
  { label: 'Лавандовый', url: mishaAvatarSvg },
  { label: 'Мятный', url: annaAvatarSvg },
  { label: 'tobo', url: toboOfficialAvatarSvg }
];

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      currentStep.value = props.initialStep;
      firstName.value = authStore.user.first_name || '';
      lastName.value = authStore.user.last_name || '';
      username.value = authStore.user.username || '';
      bio.value = authStore.user.bio || '';
      avatarUrl.value = authStore.user.avatar_url || alexAvatarSvg;
      coverUrl.value = authStore.user.cover_url || alexCoverSvg;
      emailError.value = '';
      passwordError.value = '';
      firstNameError.value = '';
      usernameError.value = '';
    }
  }
);

function closeModal() {
  emit('update:modelValue', false);
}

function handleQuickRegister() {
  emailError.value = '';
  passwordError.value = '';

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.value.trim())) {
    emailError.value = 'Пожалуйста, введите корректный адрес электронной почты';
    return;
  }

  if (password.value.length < 6) {
    passwordError.value = 'Пароль должен содержать не менее 6 символов';
    return;
  }

  // Извлекаем предлагаемый username из email
  const suggestedUsername = email.value.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '').toLowerCase() || 'user';
  username.value = suggestedUsername;
  firstName.value = suggestedUsername.charAt(0).toUpperCase() + suggestedUsername.slice(1);

  authStore.registerQuickUser(email.value.trim(), password.value);
  toastStore.show('Аккаунт успешно создан! Настройте ваш профиль', 'success');

  // Переходим ко 2 шагу — мастеру профиля
  currentStep.value = 'profile';
}

function formatUsername() {
  username.value = username.value.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
}

function handleAvatarUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        cropperImageSrc.value = reader.result;
        showCropperModal.value = true;
      }
    };
    reader.readAsDataURL(file);
    target.value = '';
  }
}

function handleCropComplete(result: string | { base64: string; blob?: Blob }) {
  const base64 = typeof result === 'string' ? result : result.base64;
  avatarUrl.value = base64;
  toastStore.show('Миниатюра аватарки успешно кадрирована', 'success');
}

function handleCoverUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const file = target.files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        coverUrl.value = reader.result;
        toastStore.show('Обложка загружена', 'info');
      }
    };
    reader.readAsDataURL(file);
    target.value = '';
  }
}

async function handleCompleteOnboarding() {
  firstNameError.value = '';
  usernameError.value = '';

  if (!firstName.value.trim()) {
    firstNameError.value = 'Имя обязательно для заполнения';
    return;
  }

  if (!username.value.trim() || username.value.trim().length < 3) {
    usernameError.value = 'Юзернейм должен быть не короче 3 символов';
    return;
  }

  await authStore.completeOnboarding({
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim() || undefined,
    username: username.value.trim(),
    bio: bio.value.trim() || undefined,
    avatar_url: avatarUrl.value || alexAvatarSvg,
    cover_url: coverUrl.value || alexCoverSvg
  });

  closeModal();
  toastStore.show('Добро пожаловать в tobo!', 'success');
  router.push('/feed');
}
</script>
