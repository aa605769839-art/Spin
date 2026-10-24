import { Announcement, Channel, ChannelMember, CommunityUser } from '@/types/community';
import { KEY, read, write } from './storage';
import {
  currentUser,
  defaultAnnouncements,
  defaultMemberProfile,
  makeJoinContent,
  makeSeedContent,
  NEIGHBOR_LIST,
} from './mockData';

/** 一个用户最多创建/加入的频道数 */
export const MAX_CHANNELS = 3;

function uid(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

/* ===================== 当前用户 / 当前频道（会话态） ===================== */

// 启动时把已持久化的 channelIds 合并回单例（保持模块内同一引用）
const savedUser = read<{ channelIds?: string[] }>(KEY.user, {});
if (savedUser.channelIds) currentUser.channelIds = savedUser.channelIds;

let _currentChannelId: string | null = read<string | null>(KEY.currentChannel, null);

export function getCurrentChannelId(): string | null {
  return _currentChannelId;
}

export function setCurrentChannel(id: string): void {
  _currentChannelId = id;
  write(KEY.currentChannel, id);
}

/** 若当前频道丢失但仍有频道，回退到第一个 */
export function ensureCurrentChannel(): string | null {
  const channels = getChannels();
  if (!_currentChannelId || !channels.find((c) => c.id === _currentChannelId)) {
    if (channels.length) setCurrentChannel(channels[0].id);
    else _currentChannelId = null;
  }
  return _currentChannelId;
}

function persistUser(): void {
  write(KEY.user, { channelIds: currentUser.channelIds });
}

/* ===================== 频道 CRUD ===================== */

export function getChannels(): Channel[] {
  return read<Channel[]>(KEY.channels, []);
}

export function getChannel(id: string): Channel | undefined {
  return getChannels().find((c) => c.id === id);
}

function saveChannels(list: Channel[]): void {
  write(KEY.channels, list);
}

function saveMembers(cid: string, members: ChannelMember[]): void {
  write(KEY.members(cid), members);
}

/** 创建频道（creator = 当前用户）。含初始成员、3 条默认公告与演示灌数。 */
export function createChannel(input: {
  name: string;
  description?: string;
}): { channel: Channel; error?: string } {
  if (currentUser.channelIds.length >= MAX_CHANNELS) {
    return { channel: null as any, error: `你最多只能创建或加入 ${MAX_CHANNELS} 个频道` };
  }
  const id = uid('ch');
  const creatorProfile = defaultMemberProfile(currentUser);
  const seedMembers: ChannelMember[] = [
    {
      userId: currentUser.id,
      channelId: id,
      role: 'creator',
      profile: creatorProfile,
      joinedAt: new Date().toISOString(),
    },
    ...NEIGHBOR_LIST.slice(0, 3).map<ChannelMember>((n) => ({
      userId: n.id,
      channelId: id,
      role: 'member',
      profile: defaultMemberProfile(n),
      joinedAt: new Date().toISOString(),
    })),
  ];
  const channel: Channel = {
    id,
    name: input.name.trim() || '未命名频道',
    description: input.description?.trim(),
    creatorId: currentUser.id,
    inviteCode: id,
    createdAt: new Date().toISOString(),
    memberIds: seedMembers.map((m) => m.userId),
    announcements: defaultAnnouncements(id, currentUser.id, input.name.trim() || '未命名频道'),
  };

  // 写入频道、成员与初始内容
  saveChannels([...getChannels(), channel]);
  saveMembers(id, seedMembers);
  const seed = makeSeedContent(id, channel.name, [...NEIGHBOR_LIST.slice(0, 3), currentUser], currentUser.id);
  write(KEY.posts(id), seed.posts);
  write(KEY.comments(id), seed.comments);
  write(KEY.conversations(id), seed.conversations);
  write(KEY.messages(id), seed.messages);
  write(KEY.notifications(id), seed.notifications);
  write(KEY.liked(id), {});
  write(KEY.dmPolicy(id), {});

  currentUser.channelIds = [...currentUser.channelIds, id];
  persistUser();
  setCurrentChannel(id);
  return { channel };
}

/** 通过邀请链接加入频道（在另一浏览器/隐身窗口打开时，数据是本地全新的） */
export function joinChannel(
  payload: { id: string; name: string; creatorName?: string },
  profile: ChannelMember['profile']
): { channel: Channel; error?: string } {
  if (currentUser.channelIds.length >= MAX_CHANNELS) {
    return { channel: null as any, error: `你最多只能创建或加入 ${MAX_CHANNELS} 个频道` };
  }
  if (getChannel(payload.id)) {
    // 已在本机存在，直接切换
    currentUser.channelIds = Array.from(new Set([...currentUser.channelIds, payload.id]));
    persistUser();
    setCurrentChannel(payload.id);
    return { channel: getChannel(payload.id)! };
  }
  const id = payload.id;
  const me: ChannelMember = {
    userId: currentUser.id,
    channelId: id,
    role: 'member',
    profile: { ...defaultMemberProfile(currentUser), ...profile },
    joinedAt: new Date().toISOString(),
  };
  const channel: Channel = {
    id,
    name: payload.name || '未命名频道',
    creatorId: 'remote',
    inviteCode: id,
    createdAt: new Date().toISOString(),
    memberIds: [currentUser.id],
    announcements: defaultAnnouncements(id, 'remote', payload.name || '未命名频道'),
  };
  saveChannels([...getChannels(), channel]);
  saveMembers(id, [me]);
  const seed = makeJoinContent(id, channel.name, currentUser);
  write(KEY.posts(id), seed.posts);
  write(KEY.comments(id), seed.comments);
  write(KEY.conversations(id), seed.conversations);
  write(KEY.messages(id), seed.messages);
  write(KEY.notifications(id), seed.notifications);
  write(KEY.liked(id), {});
  write(KEY.dmPolicy(id), {});

  currentUser.channelIds = [...currentUser.channelIds, id];
  persistUser();
  setCurrentChannel(id);
  return { channel };
}

/* ===================== 成员与资料 ===================== */

export function getMembers(cid: string): ChannelMember[] {
  const members = read<ChannelMember[]>(KEY.members(cid), []);
  const channel = getChannel(cid);
  if (channel && channel.memberIds.length !== members.length) {
    // 简单对账：补齐缺失成员
    return members;
  }
  return members;
}

export function getMember(cid: string, userId: string): ChannelMember | undefined {
  return getMembers(cid).find((m) => m.userId === userId);
}

/** 取当前用户在某频道的成员关系（不存在则按基础资料兜底创建） */
export function getMyMember(cid: string): ChannelMember {
  const members = getMembers(cid);
  let me = members.find((m) => m.userId === currentUser.id);
  if (!me) {
    me = {
      userId: currentUser.id,
      channelId: cid,
      role: getChannel(cid)?.creatorId === currentUser.id ? 'creator' : 'member',
      profile: defaultMemberProfile(currentUser),
      joinedAt: new Date().toISOString(),
    };
    saveMembers(cid, [...members, me]);
    const ch = getChannel(cid);
    if (ch && !ch.memberIds.includes(currentUser.id)) {
      ch.memberIds = [...ch.memberIds, currentUser.id];
      saveChannels(getChannels().map((c) => (c.id === cid ? ch : c)));
    }
  }
  return me;
}

export function isCreator(cid: string): boolean {
  return getChannel(cid)?.creatorId === currentUser.id;
}

export function updateMyProfile(cid: string, profile: ChannelMember['profile']): void {
  const members = getMembers(cid);
  const next = members.map((m) =>
    m.userId === currentUser.id ? { ...m, profile: { ...m.profile, ...profile } } : m
  );
  saveMembers(cid, next);
}

/** 取当前频道下展示用的「我」的资料（昵称/地址等） */
export function myChannelProfile(cid: string): ChannelMember['profile'] {
  return getMyMember(cid).profile;
}

/* ===================== 公告（创建者管理） ===================== */

export function getAnnouncements(cid: string): Announcement[] {
  const ch = getChannel(cid);
  return ch ? [...ch.announcements].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()) : [];
}

function mutateChannel(cid: string, fn: (c: Channel) => Channel): void {
  saveChannels(getChannels().map((c) => (c.id === cid ? fn(c) : c)));
}

export function addAnnouncement(
  cid: string,
  input: { title: string; body: string }
): { ok: boolean; error?: string } {
  if (!isCreator(cid)) return { ok: false, error: '只有频道创建者可以管理公告' };
  mutateChannel(cid, (c) => ({
    ...c,
    announcements: [
      ...c.announcements,
      {
        id: uid('a'),
        channelId: cid,
        title: input.title.trim() || '无标题',
        body: input.body,
        creatorId: currentUser.id,
        createdAt: new Date().toISOString(),
      },
    ],
  }));
  return { ok: true };
}

export function updateAnnouncement(
  cid: string,
  announceId: string,
  input: { title: string; body: string }
): { ok: boolean; error?: string } {
  if (!isCreator(cid)) return { ok: false, error: '只有频道创建者可以管理公告' };
  mutateChannel(cid, (c) => ({
    ...c,
    announcements: c.announcements.map((a) =>
      a.id === announceId ? { ...a, title: input.title.trim() || a.title, body: input.body } : a
    ),
  }));
  return { ok: true };
}

export function deleteAnnouncement(cid: string, announceId: string): { ok: boolean; error?: string } {
  if (!isCreator(cid)) return { ok: false, error: '只有频道创建者可以管理公告' };
  mutateChannel(cid, (c) => ({ ...c, announcements: c.announcements.filter((a) => a.id !== announceId) }));
  return { ok: true };
}

/* ===================== 私信规则（DM Policy） ===================== */

type DmPolicyMap = Record<string, { unreplied: number; rejected: boolean }>;

function pairKey(a: string, b: string): string {
  return `${a}->${b}`;
}

export function getDmPolicy(cid: string): DmPolicyMap {
  return read<DmPolicyMap>(KEY.dmPolicy(cid), {});
}

function saveDmPolicy(cid: string, map: DmPolicyMap): void {
  write(KEY.dmPolicy(cid), map);
}

/** 当前是否允许 from 给 to 发送私信（双向拒收 / 单向超 3 条未回复 即拦截） */
export function canSendDm(fromId: string, toId: string, cid: string): { ok: boolean; reason?: string; unreplied?: number } {
  const map = getDmPolicy(cid);
  const forward = map[pairKey(fromId, toId)] || { unreplied: 0, rejected: false };
  const reverse = map[pairKey(toId, fromId)] || { unreplied: 0, rejected: false };
  if (forward.rejected) return { ok: false, reason: '你已拒收对方消息，无法再发送' };
  if (reverse.rejected) return { ok: false, reason: '对方已拒收你的消息' };
  if (forward.unreplied >= 3) return { ok: false, reason: '对方还未回复，你最多可发 3 条私信', unreplied: forward.unreplied };
  return { ok: true, unreplied: forward.unreplied };
}

/** 记录一次「from 发给 to」的发送（在 canSendDm 通过后调用） */
export function recordDmSent(fromId: string, toId: string, cid: string): void {
  const map = getDmPolicy(cid);
  const k = pairKey(fromId, toId);
  map[k] = { unreplied: (map[k]?.unreplied || 0) + 1, rejected: map[k]?.rejected || false };
  saveDmPolicy(cid, map);
}

/** 记录「replier 回复了 target」：target 发往 replier 的未回复计数清零（解除限制） */
export function recordDmReply(replierId: string, targetId: string, cid: string): void {
  const map = getDmPolicy(cid);
  const k = pairKey(targetId, replierId);
  if (map[k]) {
    map[k] = { ...map[k], unreplied: 0 };
    saveDmPolicy(cid, map);
  }
}

/** rejecter 拒收 target 的消息 */
export function rejectDm(rejecterId: string, targetId: string, cid: string): void {
  const map = getDmPolicy(cid);
  const k = pairKey(rejecterId, targetId);
  map[k] = { unreplied: map[k]?.unreplied || 0, rejected: true };
  saveDmPolicy(cid, map);
}

export { currentUser };
