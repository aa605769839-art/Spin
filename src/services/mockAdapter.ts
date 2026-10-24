import {
  AppNotification,
  Comment,
  CommunityUser,
  Conversation,
  FeedPage,
  Message,
  Post,
  PublishCommentPayload,
  PublishPostPayload,
} from '@/types/community';
import { KEY, read, write } from './storage';
import {
  currentUser,
  SYSTEM_USER,
} from './mockData';
import {
  canSendDm,
  getCurrentChannelId,
  getMyMember,
  recordDmReply,
  recordDmSent,
  rejectDm,
} from './channel';

/**
 * 本地 Mock 适配器（频道作用域版）。
 * 所有读写都带 channelId（默认取当前频道），数据按 ec_xxx:<channelId> 分桶持久化。
 */

const PAGE_SIZE = 5;

function delay<T>(data: T, ms = 220): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(data), ms));
}

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function resolveCid(channelId?: string): string {
  return channelId || getCurrentChannelId() || '';
}

/** 当前用户在某频道的「作者身份」：id 不变，昵称/头像/地区取该频道资料 */
function meAsAuthor(cid: string): CommunityUser {
  const profile = getMyMember(cid).profile;
  return {
    ...currentUser,
    name: profile.name || currentUser.name,
    avatar: profile.avatar || currentUser.avatar,
    address: profile.address,
    age: profile.age,
  };
}

/* ===================== 社区动态 ===================== */

export function fetchFeed(cursor?: string, channelId?: string): Promise<FeedPage> {
  const cid = resolveCid(channelId);
  if (!cid) return delay({ list: [], nextCursor: null, hasMore: false }, 80);
  const all = read<Post[]>(KEY.posts(cid), []).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const start = cursor ? Number(cursor) : 0;
  const list = all.slice(start, start + PAGE_SIZE);
  const next = start + PAGE_SIZE;
  return delay({
    list,
    nextCursor: next < all.length ? String(next) : null,
    hasMore: next < all.length,
  });
}

export function fetchPostDetail(postId: string, channelId?: string): Promise<Post | null> {
  const cid = resolveCid(channelId);
  if (!cid) return delay(null, 80);
  const list = read<Post[]>(KEY.posts(cid), []);
  const idx = list.findIndex((p) => p.id === postId);
  if (idx < 0) return delay(null, 120);
  const updated: Post = { ...list[idx], viewCount: (list[idx].viewCount || 0) + 1 };
  list[idx] = updated;
  write(KEY.posts(cid), list);
  return delay(updated, 120);
}

export function fetchComments(postId: string, channelId?: string): Promise<Comment[]> {
  const cid = resolveCid(channelId);
  if (!cid) return delay([], 80);
  const list = read<Comment[]>(KEY.comments(cid), [])
    .filter((c) => c.postId === postId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return delay(list, 120);
}

export function publishPost(payload: PublishPostPayload): Promise<Post> {
  const cid = resolveCid(payload.channelId);
  const post: Post = {
    id: uid('p'),
    channelId: cid,
    author: meAsAuthor(cid),
    content: payload.content,
    images: payload.images || [],
    topic: payload.topic,
    audioDuration: payload.audioDuration,
    likeCount: 0,
    commentCount: 0,
    viewCount: 0,
    liked: false,
    createdAt: new Date().toISOString(),
  };
  write(KEY.posts(cid), [post, ...read<Post[]>(KEY.posts(cid), [])]);
  return delay(post, 320);
}

export function toggleLike(postId: string, channelId?: string): Promise<{ liked: boolean; likeCount: number }> {
  const cid = resolveCid(channelId);
  const posts = read<Post[]>(KEY.posts(cid), []).map((p) => {
    if (p.id !== postId) return p;
    const liked = !p.liked;
    return { ...p, liked, likeCount: Math.max(0, p.likeCount + (liked ? 1 : -1)) };
  });
  const target = posts.find((p) => p.id === postId);
  write(KEY.posts(cid), posts);
  const likedMap = read<Record<string, boolean>>(KEY.liked(cid), {});
  if (target) {
    likedMap[postId] = target.liked;
    write(KEY.liked(cid), likedMap);
  }
  return delay({ liked: target?.liked ?? false, likeCount: target?.likeCount ?? 0 }, 100);
}

export function addComment(payload: PublishCommentPayload): Promise<Comment> {
  const cid = resolveCid(payload.channelId);
  const replyTo = payload.replyToId
    ? read<Comment[]>(KEY.comments(cid), []).find((c) => c.id === payload.replyToId)?.author
    : undefined;
  const comment: Comment = {
    id: uid('c'),
    channelId: cid,
    postId: payload.postId,
    author: meAsAuthor(cid),
    content: payload.content,
    replyTo,
    createdAt: new Date().toISOString(),
  };
  write(KEY.comments(cid), [...read<Comment[]>(KEY.comments(cid), []), comment]);
  write(
    KEY.posts(cid),
    read<Post[]>(KEY.posts(cid), []).map((p) =>
      p.id === payload.postId ? { ...p, commentCount: p.commentCount + 1 } : p
    )
  );
  return delay(comment, 260);
}

export function fetchMyPosts(channelId?: string): Promise<Post[]> {
  const cid = resolveCid(channelId);
  if (!cid) return delay([], 80);
  return delay(
    read<Post[]>(KEY.posts(cid), [])
      .filter((p) => p.author.id === currentUser.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    160
  );
}

/* ===================== 私信 / 群组（按频道） ===================== */

const SYS_CONV_PREFIX = 'conv_sys_';

function getConversations(cid: string): Conversation[] {
  return read<Conversation[]>(KEY.conversations(cid), []);
}
function readMessages(cid: string): Message[] {
  return read<Message[]>(KEY.messages(cid), []);
}
function getNotifications(cid: string): AppNotification[] {
  return read<AppNotification[]>(KEY.notifications(cid), []);
}

/** 系统消息提醒会话：由通知实时聚合，置顶（次于群组） */
function buildSystemConversation(cid: string): Conversation {
  const notifs = getNotifications(cid).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  const latest = notifs[0];
  const unread = notifs.filter((n) => !n.read).length;
  return {
    id: `${SYS_CONV_PREFIX}${cid}`,
    channelId: cid,
    kind: 'system',
    peer: SYSTEM_USER,
    lastMessage: latest ? latest.title : '暂无新消息提醒',
    lastAt: latest ? latest.createdAt : new Date().toISOString(),
    unread,
    pinned: true,
  };
}

function convOrder(c: Conversation): number {
  if (c.kind === 'group') return 0;
  if (c.kind === 'system') return 1;
  return 2;
}

/** 会话列表：群组置顶 → 消息提醒 → 私信，其余按最近时间倒序 */
export function listConversations(channelId?: string): Promise<Conversation[]> {
  const cid = resolveCid(channelId);
  if (!cid) return delay([], 80);
  const list = [...getConversations(cid), buildSystemConversation(cid)].sort((a, b) => {
    const oa = convOrder(a);
    const ob = convOrder(b);
    if (oa !== ob) return oa - ob;
    return new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime();
  });
  return delay(list, 160);
}

export function listNotifications(channelId?: string): Promise<AppNotification[]> {
  const cid = resolveCid(channelId);
  if (!cid) return delay([], 80);
  const list = getNotifications(cid).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
  return delay(list, 120);
}

export function markNotificationsRead(channelId?: string): Promise<void> {
  const cid = resolveCid(channelId);
  if (!cid) return delay(undefined, 20);
  write(
    KEY.notifications(cid),
    getNotifications(cid).map((n) => ({ ...n, read: true }))
  );
  return delay(undefined, 20);
}

export function getMessages(conversationId: string, channelId?: string): Promise<Message[]> {
  const cid = resolveCid(channelId);
  if (!cid) return delay([], 80);
  const list = readMessages(cid)
    .filter((m) => m.conversationId === conversationId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  return delay(list, 120);
}

export interface SendResult {
  ok: boolean;
  message?: Message;
  error?: string;
}

/** 发送消息：群组直接写入；私信需过 DM 规则，并记录策略 */
export function sendMessage(conversationId: string, content: string, channelId?: string): Promise<SendResult> {
  const cid = resolveCid(channelId);
  if (!cid) return delay({ ok: false, error: '未选中频道' }, 80);
  const conv = getConversations(cid).find((c) => c.id === conversationId);
  if (!conv) return delay({ ok: false, error: '会话不存在' }, 80);

  if (conv.kind === 'dm' && conv.peer) {
    const check = canSendDm(currentUser.id, conv.peer.id, cid);
    if (!check.ok) return delay({ ok: false, error: check.reason }, 80);
    // 仅记录「我发给对方」的未回复计数；对方回复时（autoReply）才会清零
    recordDmSent(currentUser.id, conv.peer.id, cid);
  }

  const message: Message = {
    id: uid('m'),
    channelId: cid,
    conversationId,
    senderId: currentUser.id,
    content,
    createdAt: new Date().toISOString(),
  };
  write(KEY.messages(cid), [...readMessages(cid), message]);
  write(
    KEY.conversations(cid),
    getConversations(cid).map((c) =>
      c.id === conversationId
        ? { ...c, lastMessage: content, lastAt: message.createdAt, unread: 0 }
        : c
    )
  );
  return delay({ ok: true, message }, 200);
}

/** 确保与某邻居的私信会话存在（从群聊点头像 / 详情「私信」进入时调用） */
export function ensureConversation(peer: CommunityUser, channelId?: string): Promise<Conversation> {
  const cid = resolveCid(channelId);
  const pairId = `conv_dm_${cid}_${[currentUser.id, peer.id].sort().join('_')}`;
  const existing = getConversations(cid).find((c) => c.id === pairId);
  if (existing) return delay(existing, 60);
  const conv: Conversation = {
    id: pairId,
    channelId: cid,
    kind: 'dm',
    peer,
    lastMessage: '',
    lastAt: new Date().toISOString(),
    unread: 0,
  };
  write(KEY.conversations(cid), [...getConversations(cid), conv]);
  return delay(conv, 60);
}

export function markRead(conversationId: string, channelId?: string): Promise<void> {
  const cid = resolveCid(channelId);
  if (!cid) return delay(undefined, 20);
  if (conversationId.startsWith(SYS_CONV_PREFIX)) {
    return markNotificationsRead(cid);
  }
  write(
    KEY.conversations(cid),
    getConversations(cid).map((c) => (c.id === conversationId ? { ...c, unread: 0 } : c))
  );
  return delay(undefined, 20);
}

/** 模拟对方自动回复（演示用，私信页默认不调用，以体现「未回复则 3 条上限」规则） */
const AUTO_REPLIES = [
  '好的，收到啦，谢谢您！',
  '哎呀，您太客气了。',
  '这个主意好，咱们就这么说定。',
  '我回头也跟家里人说一声。',
  '行，那到时候见哈。',
];

export function autoReply(conversationId: string, channelId?: string): Promise<SendResult> {
  const cid = resolveCid(channelId);
  const conv = getConversations(cid).find((c) => c.id === conversationId);
  if (!conv || !conv.peer) return Promise.reject(new Error('会话不存在'));
  const content = AUTO_REPLIES[Math.floor(Math.random() * AUTO_REPLIES.length)];
  const message: Message = {
    id: uid('m'),
    channelId: cid,
    conversationId,
    senderId: conv.peer.id,
    content,
    createdAt: new Date().toISOString(),
  };
  // 对方回复我 —— 清零「我→对方」的未回复计数，解除 3 条上限
  recordDmReply(conv.peer.id, currentUser.id, cid);
  write(KEY.messages(cid), [...readMessages(cid), message]);
  write(
    KEY.conversations(cid),
    getConversations(cid).map((c) =>
      c.id === conversationId
        ? { ...c, lastMessage: content, lastAt: message.createdAt, unread: (c.unread || 0) + 1 }
        : c
    )
  );
  return delay({ ok: true, message }, 700);
}

export const messageApi = {
  listConversations,
  getMessages,
  listNotifications,
  sendMessage,
  ensureConversation,
  autoReply,
  markRead,
  markNotificationsRead,
};
