import { Comment, FeedPage, Post, PublishCommentPayload, PublishPostPayload } from '@/types/community';
import { request } from './request';

/**
 * 邻里圈业务接口 —— 真实后端契约层。
 *
 * 每个函数都是一段「接口定义 + 请求实现」，页面只依赖这里的函数名。
 * 后端约定（可直接按这个契约实现服务端）：
 *
 *   GET    /community/feed?cursor=0        → FeedPage      信息流，游标分页
 *   GET    /community/posts/:id            → Post          动态详情
 *   POST   /community/posts                → Post          发布动态
 *   POST   /community/posts/:id/like       → { liked, likeCount }  点赞 / 取消点赞
 *   GET    /community/posts/:id/comments   → Comment[]     评论列表
 *   POST   /community/comments             → Comment       发表评论
 *   GET    /community/my/posts             → Post[]        我的动态
 *
 * 统一响应体：{ code: number, message: string, data: T }，code 为 0 / 200 视为成功。
 */

export interface CommunityApi {
  fetchFeed(cursor?: string): Promise<FeedPage>;
  fetchPostDetail(postId: string): Promise<Post | null>;
  publishPost(payload: PublishPostPayload): Promise<Post>;
  toggleLike(postId: string): Promise<{ liked: boolean; likeCount: number }>;
  fetchComments(postId: string): Promise<Comment[]>;
  addComment(payload: PublishCommentPayload): Promise<Comment>;
  fetchMyPosts(): Promise<Post[]>;
}

export const remoteApi: CommunityApi = {
  fetchFeed(cursor) {
    return request<FeedPage>({
      url: '/community/feed',
      method: 'GET',
      data: cursor ? { cursor } : {},
    });
  },

  fetchPostDetail(postId) {
    return request<Post>({ url: `/community/posts/${postId}`, method: 'GET' });
  },

  publishPost(payload) {
    return request<Post>({ url: '/community/posts', method: 'POST', data: payload });
  },

  toggleLike(postId) {
    return request<{ liked: boolean; likeCount: number }>({
      url: `/community/posts/${postId}/like`,
      method: 'POST',
    });
  },

  fetchComments(postId) {
    return request<Comment[]>({ url: `/community/posts/${postId}/comments`, method: 'GET' });
  },

  addComment(payload) {
    return request<Comment>({ url: '/community/comments', method: 'POST', data: payload });
  },

  fetchMyPosts() {
    return request<Post[]>({ url: '/community/my/posts', method: 'GET' });
  },
};
