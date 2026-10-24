import {
  Comment,
  FeedPage,
  Post,
  PublishCommentPayload,
  PublishPostPayload,
} from '@/types/community';
import { CommunityApi, remoteApi } from './api';
import * as mock from './mockAdapter';
import * as channel from './channel';
import { isMockMode } from './request';

/**
 * 业务统一出口 —— 页面只 import 这个文件。
 *
 * 数据源由 config 里的 API_MODE 决定：
 *   API_MODE = 'mock'   → 本地模拟数据（默认，开箱即跑）
 *   API_MODE = 'remote' → 真实后端接口（契约见 ./api.ts）
 *
 * 切后端只需改配置，页面代码零改动。
 */

const mockApi: CommunityApi = {
  fetchFeed: (cursor?: string): Promise<FeedPage> => mock.fetchFeed(cursor),
  fetchPostDetail: (postId: string): Promise<Post | null> => mock.fetchPostDetail(postId),
  publishPost: (payload: PublishPostPayload): Promise<Post> => mock.publishPost(payload),
  toggleLike: (postId: string): Promise<{ liked: boolean; likeCount: number }> =>
    mock.toggleLike(postId),
  fetchComments: (postId: string): Promise<Comment[]> => mock.fetchComments(postId),
  addComment: (payload: PublishCommentPayload): Promise<Comment> => mock.addComment(payload),
  fetchMyPosts: (): Promise<Post[]> => mock.fetchMyPosts(),
};

export const communityApi: CommunityApi = isMockMode() ? mockApi : remoteApi;

export const dataSourceLabel = isMockMode() ? '本地模拟数据' : '线上接口';

/**
 * 私信服务（演示用 mock，独立出口，不进入社区业务契约）。
 * 接真实后端时，再补 remote 实现并切换数据源即可。
 */
export const messageApi = mock.messageApi;

/**
 * 频道服务（频道 CRUD / 成员资料 / 公告 / 私信规则 / 当前频道会话态）。
 * 接真实后端时，同样替换为 remote 实现即可。
 */
export const channelApi = {
  MAX_CHANNELS: channel.MAX_CHANNELS,
  createChannel: channel.createChannel,
  joinChannel: channel.joinChannel,
  getChannels: channel.getChannels,
  getChannel: channel.getChannel,
  getCurrentChannelId: channel.getCurrentChannelId,
  setCurrentChannel: channel.setCurrentChannel,
  ensureCurrentChannel: channel.ensureCurrentChannel,
  getMembers: channel.getMembers,
  getMyMember: channel.getMyMember,
  isCreator: channel.isCreator,
  updateMyProfile: channel.updateMyProfile,
  myChannelProfile: channel.myChannelProfile,
  getAnnouncements: channel.getAnnouncements,
  addAnnouncement: channel.addAnnouncement,
  updateAnnouncement: channel.updateAnnouncement,
  deleteAnnouncement: channel.deleteAnnouncement,
  canSendDm: channel.canSendDm,
  recordDmSent: channel.recordDmSent,
  recordDmReply: channel.recordDmReply,
  rejectDm: channel.rejectDm,
  currentUser: channel.currentUser,
};
