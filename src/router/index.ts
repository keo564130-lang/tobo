import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router';
import FeedView from '@/views/FeedView.vue';
import MessagesView from '@/views/MessagesView.vue';
import ProfileView from '@/views/ProfileView.vue';
import SettingsView from '@/views/SettingsView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    redirect: '/feed'
  },
  {
    path: '/feed',
    name: 'Feed',
    component: FeedView
  },
  {
    path: '/messages',
    name: 'Messages',
    component: MessagesView
  },
  {
    path: '/profile',
    name: 'Profile',
    component: ProfileView
  },
  {
    path: '/settings',
    name: 'Settings',
    component: SettingsView
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/feed'
  }
];

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  }
});
