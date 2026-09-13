<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Редактировать профиль"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div class="flex flex-col gap-4">
      <!-- Имя и Фамилия -->
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="edit_first_name" class="block text-xs font-semibold text-surface-on mb-1">Имя</label>
          <input
            id="edit_first_name"
            name="first_name"
            aria-label="Имя"
            v-model="firstName"
            type="text"
            class="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label for="edit_last_name" class="block text-xs font-semibold text-surface-on mb-1">Фамилия</label>
          <input
            id="edit_last_name"
            name="last_name"
            aria-label="Фамилия"
            v-model="lastName"
            type="text"
            class="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- Юзернейм -->
      <div>
        <label for="edit_username" class="block text-xs font-semibold text-surface-on mb-1">Юзернейм (@username)</label>
        <div class="relative">
          <span class="absolute left-3.5 top-2 text-surface-onVariant/60 text-sm">@</span>
          <input
            id="edit_username"
            name="username"
            aria-label="Юзернейм"
            v-model="username"
            type="text"
            class="w-full pl-8 pr-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- Биография -->
      <div>
        <label for="edit_bio" class="block text-xs font-semibold text-surface-on mb-1">О себе (Bio)</label>
        <textarea
          id="edit_bio"
          name="bio"
          aria-label="О себе"
          v-model="bio"
          rows="3"
          class="w-full p-3 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <!-- Выбор аватара -->
      <div>
        <label class="block text-xs font-semibold text-surface-on mb-1.5">Аватар профиля</label>
        <div class="flex items-center gap-3">
          <img
            :src="avatarUrl || alexAvatarSvg"
            alt="Аватар"
            class="w-14 h-14 rounded-full object-cover border-2 border-primary shrink-0 shadow-xs"
          />
          <div class="flex-1 flex flex-col gap-2 min-w-0">
            <!-- Кнопка загрузки файла -->
            <label for="avatar_file_input" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-low border border-surface-high/60 text-xs font-medium text-surface-on hover:bg-surface-high cursor-pointer transition-colors m3-press-effect w-fit">
              <span class="material-symbols-rounded text-base text-primary">upload</span>
              <span>Загрузить фото</span>
              <input id="avatar_file_input" name="avatar_file" aria-label="Загрузить аватар" type="file" accept="image/*" class="hidden" @change="handleAvatarUpload" />
            </label>
            <!-- Горизонтальные пресеты -->
            <div class="flex items-center gap-2 overflow-x-auto py-1">
              <button
                v-for="preset in presetAvatars"
                :key="preset.label"
                type="button"
                :title="preset.label"
                class="w-8 h-8 rounded-full border-2 transition-all shrink-0 m3-press-effect overflow-hidden cursor-pointer"
                :class="avatarUrl === preset.url ? 'border-primary ring-2 ring-primary/40 scale-105' : 'border-transparent opacity-75 hover:opacity-100'"
                @click="avatarUrl = preset.url"
              >
                <img :src="preset.url" :alt="preset.label" class="w-full h-full object-cover" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Выбор обложки профиля -->
      <div>
        <label class="block text-xs font-semibold text-surface-on mb-1.5">Обложка профиля</label>
        <div class="flex flex-col gap-2">
          <div class="relative w-full h-32 sm:h-36 rounded-3xl overflow-hidden border border-surface-high/50 bg-surface-low shadow-xs">
            <img
              :src="coverUrl || alexCoverSvg"
              alt="Обложка"
              class="w-full h-full object-cover"
            />
            <div class="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
            <label for="cover_file_input" class="absolute right-3 bottom-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-md text-white text-xs font-medium hover:bg-black/80 cursor-pointer transition-all m3-press-effect shadow-sm">
              <span class="material-symbols-rounded text-sm">photo_camera</span>
              <span>Выбрать обложку</span>
              <input id="cover_file_input" name="cover_file" aria-label="Загрузить обложку" type="file" accept="image/*" class="hidden" @change="handleCoverUpload" />
            </label>
          </div>
          <!-- 4 пастельных пресета обложек: идеальная сетка grid-cols-4 -->
          <div class="grid grid-cols-4 gap-2 w-full mt-1">
            <button
              v-for="preset in presetCovers"
              :key="preset.label"
              type="button"
              :title="preset.label"
              class="h-10 w-full rounded-2xl border-2 transition-all m3-press-effect overflow-hidden cursor-pointer"
              :class="coverUrl === preset.url ? 'border-primary ring-2 ring-primary/40 scale-[1.02]' : 'border-transparent opacity-75 hover:opacity-100'"
              @click="coverUrl = preset.url"
            >
              <img :src="preset.url" :alt="preset.label" class="w-full h-full object-cover" />
            </button>
          </div>
        </div>
      </div>

      <!-- Кнопки сохранения -->
      <div class="pt-2 flex items-center justify-end gap-2">
        <M3Button variant="text" size="md" @click="$emit('update:modelValue', false)">
          Отмена
        </M3Button>
        <M3Button variant="filled" size="md" @click="saveProfile">
          Сохранить
        </M3Button>
      </div>
    </div>

    <!-- Круглый видоискатель-кроппер миниатюры аватара -->
    <AvatarCropperModal
      v-model="showCropperModal"
      :image-src="cropperImageSrc"
      @crop-complete="handleCropComplete"
    />

    <!-- Прямоугольный видоискатель-кроппер обложки -->
    <CoverCropperModal
      v-model="showCoverCropperModal"
      :image-src="coverCropperImageSrc"
      @crop-complete="handleCoverCropComplete"
    />
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Button from '@/components/ui/M3Button.vue';
import AvatarCropperModal from '@/components/profile/AvatarCropperModal.vue';
import CoverCropperModal from '@/components/profile/CoverCropperModal.vue';
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

const presetAvatars = [
  { label: 'Лазурный', url: alexAvatarSvg },
  { label: 'Лавандовый', url: mishaAvatarSvg },
  { label: 'Мятный', url: annaAvatarSvg },
  { label: 'tobo', url: toboOfficialAvatarSvg }
];

const presetCovers = [
  { label: 'Лазурная волна', url: alexCoverSvg },
  { label: 'Лаванда и персик', url: mishaCoverSvg },
  { label: 'Мятная гармония', url: annaCoverSvg },
  { label: 'Персиковый рассвет', url: peachCoverSvg }
];

const props = defineProps<{
  modelValue: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const authStore = useAuthStore();
const toastStore = useToastStore();

const firstName = ref(authStore.user.first_name);
const lastName = ref(authStore.user.last_name || '');
const username = ref(authStore.user.username);
const bio = ref(authStore.user.bio || '');
const avatarUrl = ref(authStore.user.avatar_url || '');
const coverUrl = ref(authStore.user.cover_url || '');

const showCropperModal = ref(false);
const cropperImageSrc = ref('');
const showCoverCropperModal = ref(false);
const coverCropperImageSrc = ref('');

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
  toastStore.show('Миниатюра аватара обновлена', 'success');
}

function handleCoverUpload(e: Event) {
  const target = e.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        coverCropperImageSrc.value = reader.result;
        showCoverCropperModal.value = true;
      }
    };
    reader.readAsDataURL(target.files[0]);
    target.value = '';
  }
}

function handleCoverCropComplete(result: { base64: string; blob?: Blob }) {
  coverUrl.value = result.base64;
  toastStore.show('Обложка профиля успешно кадрирована', 'success');
}

watch(
  () => props.modelValue,
  (open) => {
    if (open) {
      firstName.value = authStore.user.first_name;
      lastName.value = authStore.user.last_name || '';
      username.value = authStore.user.username;
      bio.value = authStore.user.bio || '';
      avatarUrl.value = authStore.user.avatar_url || '';
      coverUrl.value = authStore.user.cover_url || '';
    }
  }
);

function saveProfile() {
  authStore.updateProfile({
    first_name: firstName.value.trim(),
    last_name: lastName.value.trim() || undefined,
    username: username.value.trim(),
    bio: bio.value.trim(),
    avatar_url: avatarUrl.value.trim(),
    cover_url: coverUrl.value.trim()
  });

  emit('update:modelValue', false);
  toastStore.show('Профиль успешно обновлен', 'success');
}
</script>
