<template>
  <div
    v-if="modelValue"
    class="fixed inset-0 z-60 bg-black/70 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    @click.self="closeModal"
  >
    <div
      class="w-full max-w-md rounded-4xl bg-surface-lowest border border-surface-high/60 p-6 shadow-elevation-4 flex flex-col gap-5 my-auto"
    >
      <!-- Шапка модального окна -->
      <div class="flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="font-sans font-black tracking-tight text-2xl leading-none text-primary select-none -translate-y-[1px]">tobo</span>
          <span class="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary-container text-primary-onContainer leading-normal">
            {{ mode === 'signin' ? 'Вход' : 'Регистрация' }}
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

      <!-- Заголовок и подзаголовок -->
      <div>
        <h2 class="text-lg font-bold text-surface-on">
          {{ mode === 'signin' ? 'Войдите в аккаунт tobo' : 'Создайте новый аккаунт' }}
        </h2>
        <p class="text-xs text-surface-onVariant/80 mt-1">
          {{ mode === 'signin'
            ? 'Введите почту и пароль для доступа к ленте и диалогам'
            : 'Зарегистрируйтесь за пару секунд и настройте свой профиль' }}
        </p>
      </div>

      <!-- M3 Segmented Buttons: [ Вход ] / [ Регистрация ] -->
      <div class="p-1 rounded-2xl bg-surface-low border border-surface-high/50 flex items-center gap-1">
        <button
          type="button"
          class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
          :class="mode === 'signin'
            ? 'bg-primary-container text-primary-onContainer font-bold shadow-xs'
            : 'text-surface-onVariant hover:text-surface-on hover:bg-surface-high/40'"
          @click="switchMode('signin')"
        >
          <span class="material-symbols-rounded text-sm">login</span>
          <span>Вход</span>
        </button>
        <button
          type="button"
          class="flex-1 py-2 px-3 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5"
          :class="mode === 'signup'
            ? 'bg-primary-container text-primary-onContainer font-bold shadow-xs'
            : 'text-surface-onVariant hover:text-surface-on hover:bg-surface-high/40'"
          @click="switchMode('signup')"
        >
          <span class="material-symbols-rounded text-sm">person_add</span>
          <span>Регистрация</span>
        </button>
      </div>

      <!-- Баннер общей ошибки (Supabase Auth / Сеть) -->
      <div
        v-if="generalError"
        class="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2"
      >
        <span class="material-symbols-rounded text-base shrink-0">error</span>
        <span>{{ generalError }}</span>
      </div>

      <!-- Форма ввода данных -->
      <form @submit.prevent="handleSubmit" class="flex flex-col gap-4">
        <!-- Поле Email -->
        <div>
          <label for="auth_modal_email" class="block text-xs font-semibold text-surface-on mb-1.5">
            Электронная почта (Email) *
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-3 text-surface-onVariant/60 material-symbols-rounded text-lg select-none">
              mail
            </span>
            <input
              id="auth_modal_email"
              name="email"
              v-model="email"
              type="email"
              required
              autocomplete="email"
              placeholder="name@example.com"
              class="w-full pl-10 pr-3.5 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on placeholder:text-surface-onVariant/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              :class="{ 'border-rose-500 focus:ring-rose-500': emailError }"
              @input="clearEmailError"
            />
          </div>
          <span v-if="emailError" class="text-[11px] text-rose-500 mt-1 block">{{ emailError }}</span>
        </div>

        <!-- Поле Пароль -->
        <div>
          <label for="auth_modal_password" class="block text-xs font-semibold text-surface-on mb-1.5">
            Пароль *
          </label>
          <div class="relative">
            <span class="absolute left-3.5 top-3 text-surface-onVariant/60 material-symbols-rounded text-lg select-none">
              lock
            </span>
            <input
              id="auth_modal_password"
              name="password"
              v-model="password"
              :type="showPassword ? 'text' : 'password'"
              required
              minlength="6"
              :autocomplete="mode === 'signin' ? 'current-password' : 'new-password'"
              :placeholder="mode === 'signin' ? 'Ваш пароль' : 'Минимум 6 символов'"
              class="w-full pl-10 pr-10 py-2.5 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on placeholder:text-surface-onVariant/40 focus:outline-none focus:ring-2 focus:ring-primary transition-all"
              :class="{ 'border-rose-500 focus:ring-rose-500': passwordError }"
              @input="clearPasswordError"
            />
            <button
              type="button"
              aria-label="Показать или скрыть пароль"
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

        <!-- Кнопка действия с индикатором загрузки -->
        <div class="pt-2 flex flex-col gap-2">
          <button
            type="submit"
            :disabled="authStore.isLoading"
            class="w-full py-3 rounded-full bg-primary text-primary-on font-bold text-sm shadow-sm hover:opacity-95 active:scale-[0.99] transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <span
              v-if="authStore.isLoading"
              class="w-4 h-4 border-2 border-primary-on border-t-transparent rounded-full animate-spin"
            />
            <span v-if="!authStore.isLoading">
              {{ mode === 'signin' ? 'Войти в tobo' : 'Создать аккаунт' }}
            </span>
            <span v-else>
              {{ mode === 'signin' ? 'Выполняется вход...' : 'Создание аккаунта...' }}
            </span>
            <span v-if="!authStore.isLoading" class="material-symbols-rounded text-base">
              arrow_forward
            </span>
          </button>

          <button
            type="button"
            class="text-xs text-primary font-medium hover:underline text-center py-1 cursor-pointer"
            @click="switchMode(mode === 'signin' ? 'signup' : 'signin')"
          >
            {{ mode === 'signin' ? 'Нет аккаунта? Зарегистрироваться' : 'Уже есть аккаунт? Войти' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';
import { validateEmail, validatePassword } from '@/lib/validation';

interface Props {
  modelValue: boolean;
  initialMode?: 'signin' | 'signup';
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: false,
  initialMode: 'signin'
});

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
  (e: 'auth-success'): void;
}>();

const authStore = useAuthStore();
const toastStore = useToastStore();

const mode = ref<'signin' | 'signup'>(props.initialMode || 'signin');
const email = ref('');
const password = ref('');
const showPassword = ref(false);
const emailError = ref('');
const passwordError = ref('');
const generalError = ref('');

watch(
  () => [props.modelValue, props.initialMode],
  ([isOpen, newMode]) => {
    if (isOpen) {
      mode.value = (newMode as 'signin' | 'signup') || 'signin';
      emailError.value = '';
      passwordError.value = '';
      generalError.value = '';
    }
  }
);

function switchMode(newMode: 'signin' | 'signup') {
  mode.value = newMode;
  emailError.value = '';
  passwordError.value = '';
  generalError.value = '';
}

function clearEmailError() {
  if (emailError.value) emailError.value = '';
  if (generalError.value) generalError.value = '';
}

function clearPasswordError() {
  if (passwordError.value) passwordError.value = '';
  if (generalError.value) generalError.value = '';
}

function closeModal() {
  emit('update:modelValue', false);
}

async function handleSubmit() {
  emailError.value = '';
  passwordError.value = '';
  generalError.value = '';

  // Валидация Email через lib/validation
  const emailValidation = validateEmail(email.value);
  if (!emailValidation.isValid) {
    emailError.value = emailValidation.error || 'Некорректный email';
    return;
  }

  // Валидация пароля через lib/validation
  const passwordValidation = validatePassword(password.value);
  if (!passwordValidation.isValid) {
    passwordError.value = passwordValidation.error || 'Некорректный пароль';
    return;
  }

  const trimmedEmail = email.value.trim();

  if (mode.value === 'signin') {
    const res = await authStore.signIn(trimmedEmail, password.value);
    if (res.success) {
      toastStore.show('С возвращением в tobo!', 'success');
      emit('auth-success');
      closeModal();
    } else {
      generalError.value = res.error || 'Неверный логин или пароль';
    }
  } else {
    const res = await authStore.signUp(trimmedEmail, password.value);
    if (res.success) {
      toastStore.show('Аккаунт успешно создан! Настройте ваш профиль', 'success');
      emit('auth-success');
      closeModal();
      // Переход на экран онбординга к настройке профиля
      authStore.openOnboarding('profile');
    } else {
      generalError.value = res.error || 'Ошибка при регистрации аккаунта';
    }
  }
}
</script>
