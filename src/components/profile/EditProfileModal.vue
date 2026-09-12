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
          <label class="block text-xs font-semibold text-surface-on mb-1">Имя</label>
          <input
            v-model="firstName"
            type="text"
            class="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label class="block text-xs font-semibold text-surface-on mb-1">Фамилия</label>
          <input
            v-model="lastName"
            type="text"
            class="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- Юзернейм -->
      <div>
        <label class="block text-xs font-semibold text-surface-on mb-1">Юзернейм (@username)</label>
        <div class="relative">
          <span class="absolute left-3.5 top-2 text-surface-onVariant/60 text-sm">@</span>
          <input
            v-model="username"
            type="text"
            class="w-full pl-8 pr-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
      </div>

      <!-- Биография -->
      <div>
        <label class="block text-xs font-semibold text-surface-on mb-1">О себе (Bio)</label>
        <textarea
          v-model="bio"
          rows="3"
          class="w-full p-3 rounded-2xl bg-surface-low border border-surface-high/60 text-sm text-surface-on focus:outline-none focus:ring-2 focus:ring-primary resize-none"
        />
      </div>

      <!-- Ссылка на аватар -->
      <div>
        <label class="block text-xs font-semibold text-surface-on mb-1">URL аватара</label>
        <input
          v-model="avatarUrl"
          type="text"
          class="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-xs text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
        />
      </div>

      <!-- Ссылка на обложку -->
      <div>
        <label class="block text-xs font-semibold text-surface-on mb-1">URL баннера обложки</label>
        <input
          v-model="coverUrl"
          type="text"
          class="w-full px-3.5 py-2 rounded-2xl bg-surface-low border border-surface-high/60 text-xs text-surface-on focus:outline-none focus:ring-2 focus:ring-primary"
        />
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
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Button from '@/components/ui/M3Button.vue';
import { useAuthStore } from '@/stores/auth';
import { useToastStore } from '@/stores/toast';

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
