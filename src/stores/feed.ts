// ==============================================================================
// ХРАНИЛИЩЕ ЛЕНТЫ НОВОСТЕЙ И АЛГОРИТМИЧЕСКОГО СКОРИНГА (Pinia)
// Лицензия: Apache License 2.0
// ==============================================================================

import { defineStore } from 'pinia';
import { ref } from 'vue';
import type { Post, PostComment, PostAudience } from '@/types/database';
import { localStore } from '@/lib/supabase';

export const useFeedStore = defineStore('feed', () => {
  const posts = ref<Post[]>(localStore.getRankedFeed());
  const isLoading = ref(false);

  function refreshFeed() {
    posts.value = localStore.getRankedFeed();
  }

  function createPost(
    content: string, 
    mediaUrls: string[] = [], 
    disableComments: boolean = false, 
    audience: PostAudience = 'all'
  ) {
    const newPost = localStore.createPost(content, mediaUrls, disableComments, audience);
    refreshFeed();
    return newPost;
  }

  function toggleLike(postId: string) {
    const res = localStore.toggleLikePost(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_liked = res.isLiked;
      post.likes_count = res.count;
      post.rank_score = localStore.calculatePostScore(post);
    }
    return res;
  }

  function toggleRepost(postId: string) {
    const res = localStore.toggleRepost(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_reposted = res.isReposted;
      post.reposts_count = res.count;
      post.rank_score = localStore.calculatePostScore(post);
    }
    return res;
  }

  function toggleBookmark(postId: string) {
    const isBookmarked = localStore.toggleBookmark(postId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.is_bookmarked = isBookmarked;
    }
    return isBookmarked;
  }

  function getComments(postId: string): PostComment[] {
    return localStore.getComments(postId);
  }

  function addComment(postId: string, text: string, parentId?: string | null): PostComment {
    const comment = localStore.addComment(postId, text, parentId);
    const post = posts.value.find(p => p.id === postId);
    if (post) {
      post.comments_count += 1;
      post.rank_score = localStore.calculatePostScore(post);
    }
    return comment;
  }

  function getUserPosts(userId: string): Post[] {
    return localStore.getUserPosts(userId);
  }

  // Подписка на обновление ленты в реальном времени
  localStore.subscribe((event) => {
    if (['new_post', 'post_updated', 'new_comment'].includes(event.type)) {
      refreshFeed();
    }
  });

  return {
    posts,
    isLoading,
    refreshFeed,
    createPost,
    toggleLike,
    toggleRepost,
    toggleBookmark,
    getComments,
    addComment,
    getUserPosts
  };
});
