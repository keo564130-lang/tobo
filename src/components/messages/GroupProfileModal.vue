<template>
  <M3BottomSheet
    :model-value="modelValue"
    title="Информация о группе"
    @update:model-value="$emit('update:modelValue', $event)"
  >
    <div v-if="chat" class="flex flex-col gap-5">
      <!-- Шапка группы -->
      <div class="flex items-center gap-4">
        <M3Avatar
          :src="chat.avatar_url"
          :name="chat.title"
          size="xl"
        />
        <div class="flex flex-col">
          <h3 class="text-xl font-bold text-surface-on">
            {{ chat.title }}
          </h3>
          <span class="text-xs text-surface-onVariant/70 mt-0.5">
            {{ members.length }} участников ({{ onlineCount }} в сети)
          </span>
        </div>
      </div>

      <!-- Описание группы -->
      <div v-if="chat.description" class="p-3.5 rounded-2xl bg-surface-low border border-surface-high/40 text-xs text-surface-on leading-relaxed">
        {{ chat.description }}
      </div>

      <!-- ВМЕСТО ОБЩИХ ГРУПП: ПОЛНЫЙ СПИСОК УЧАСТНИКОВ С РОЛЯМИ -->
      <div class="flex flex-col gap-2">
        <div class="flex items-center justify-between px-1">
          <span class="text-xs font-bold uppercase tracking-wider text-surface-onVariant/80">
            Участники группы ({{ members.length }})
          </span>
          <button
            class="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
            @click="handleAddMember"
          >
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Добавить</span>
          </button>
        </div>

        <div class="flex flex-col gap-1.5 max-h-60 overflow-y-auto pr-1">
          <div
            v-for="member in members"
            :key="member.user_id"
            class="flex items-center justify-between p-2.5 rounded-2xl bg-surface-low hover:bg-surface-high/40 transition-colors"
          >
            <div class="flex items-center gap-2.5">
              <M3Avatar
                :src="member.profile?.avatar_url"
                :name="member.profile?.first_name || 'Участник'"
                size="sm"
                :is-online="member.profile?.is_online"
                show-online
              />
              <div class="flex flex-col">
                <span class="text-xs font-bold text-surface-on">
                  {{ member.profile?.first_name }} {{ member.profile?.last_name || '' }}
                </span>
                <span class="text-[10px] text-surface-onVariant/60">
                  @{{ member.profile?.username }}
                </span>
              </div>
            </div>

            <!-- Роль и управление -->
            <div class="flex items-center gap-2">
              <span
                class="text-[10px] font-bold px-2 py-0.5 rounded-full"
                :class="[
                  member.role === 'owner' ? 'bg-primary-container text-primary-on' : '',
                  member.role === 'admin' ? 'bg-secondary-container text-secondary-on' : '',
                  member.role === 'member' ? 'bg-surface-high text-surface-onVariant' : ''
                ]"
              >
                {{ member.role === 'owner' ? 'Владелец' : (member.role === 'admin' ? 'Админ' : 'Участник') }}
              </span>

              <!-- Меню управления для владельца/админа -->
              <button
                v-if="member.role !== 'owner'"
                class="w-6 h-6 rounded-full flex items-center justify-center text-surface-onVariant hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
                title="Удалить из группы"
                @click="removeMember(member.user_id)"
              >
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </M3BottomSheet>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import type { Chat, ChatMember } from '@/types/database';
import M3BottomSheet from '@/components/ui/M3BottomSheet.vue';
import M3Avatar from '@/components/ui/M3Avatar.vue';
import { currentUserMock, mishaProfileMock, annaProfileMock } from '@/lib/mockData';
import { useToastStore } from '@/stores/toast';

const props = defineProps<{
  modelValue: boolean;
  chat: Chat | null;
}>();

defineEmits<{
  (e: 'update:modelValue', val: boolean): void;
}>();

const toastStore = useToastStore();

const members = ref<ChatMember[]>([
  {
    chat_id: 'chat-group-family-004',
    user_id: currentUserMock.id,
    role: 'owner',
    joined_at: new Date().toISOString(),
    profile: currentUserMock
  },
  {
    chat_id: 'chat-group-family-004',
    user_id: mishaProfileMock.id,
    role: 'admin',
    joined_at: new Date().toISOString(),
    profile: mishaProfileMock
  },
  {
    chat_id: 'chat-group-family-004',
    user_id: annaProfileMock.id,
    role: 'member',
    joined_at: new Date().toISOString(),
    profile: annaProfileMock
  }
]);

const onlineCount = computed(() => {
  return members.value.filter(m => m.profile?.is_online).length;
});

function removeMember(userId: string) {
  members.value = members.value.filter(m => m.user_id !== userId);
  toastStore.show('Участник удален из группы', 'info');
}

function handleAddMember() {
  toastStore.show('Выберите контакт для добавления в группу', 'info');
}
</script>
