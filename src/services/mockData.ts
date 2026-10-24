import {
  Announcement,
  ChannelMember,
  CommunityUser,
  Comment,
  Conversation,
  Message,
  Post,
  AppNotification,
} from '@/types/community';
import { placeholderImages } from '@/utils/placeholderImages';

/**
 * 当前登录用户（mock 阶段固定单例；接后端后由 /me 接口下发，并带 channelIds）。
 * channelIds 持久化在 ec_user，刷新不丢。
 */
export const currentUser: CommunityUser = {
  id: 'u_1001',
  name: '李桂芳',
  avatar: '',
  building: '3 号楼 2 单元 501',
  address: '北京市 朝阳区',
  age: 68,
  isSelf: true,
  channelIds: [],
};

/** 预置邻居（频道创建时作为初始成员，让群组/私信有真实对象） */
const neighbors: Record<string, CommunityUser> = {
  wang: { id: 'u_1002', name: '王建国', avatar: '', building: '3 号楼 1 单元 302', age: 71, address: '北京市 朝阳区' },
  zhang: { id: 'u_1003', name: '张秀英', avatar: '', building: '2 号楼 2 单元 401', age: 66, address: '北京市 海淀区' },
  chen: { id: 'u_1004', name: '陈志强', avatar: '', building: '5 号楼 3 单元 202', age: 74, address: '北京市 西城区' },
  liu: { id: 'u_1005', name: '刘玉梅', avatar: '', building: '3 号楼 2 单元 503', age: 69, address: '北京市 朝阳区' },
};

export const NEIGHBOR_LIST: CommunityUser[] = Object.values(neighbors);

export function daysAgo(days: number, hour: number, minute: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/** 话题筛选项，与发布页共用（地址粒度只到城市+区） */
export const TOPICS = ['生活分享', '健康养生', '活动召集'];

/** 系统消息提醒的固定对端（「消息提醒」会话） */
export const SYSTEM_USER: CommunityUser = {
  id: 'sys_notify',
  name: '消息提醒',
  avatar: '',
  building: '系统通知',
  isSelf: false,
  channelIds: [],
};

/* ===================== 频道级种子内容生成 ===================== */

/** 系统 AI 默认生成的 3 条公告 */
export function defaultAnnouncements(cid: string, creatorId: string, channelName: string): Announcement[] {
  const base = daysAgo(0, 8, 0);
  return [
    {
      id: `a_${cid}_1`,
      channelId: cid,
      title: `欢迎来到《${channelName}》`,
      body: '本频道由创建者发起，大家可以在这里分享邻里日常、互帮互助。发言请友善，禁止发布无关广告。',
      creatorId,
      createdAt: base,
    },
    {
      id: `a_${cid}_2`,
      channelId: cid,
      title: '每周活动预告',
      body: '周三上午社区活动室有健康讲座，周六早上小广场打太极。欢迎报名，来了就是朋友。',
      creatorId,
      createdAt: daysAgo(0, 8, 1),
    },
    {
      id: `a_${cid}_3`,
      channelId: cid,
      title: '社区公约',
      body: '互相尊重、互相关照。遇到急事可在群聊里呼救，邻里之间能帮就帮一把。',
      creatorId,
      createdAt: daysAgo(0, 8, 2),
    },
  ];
}

/**
 * 为某个频道生成初始内容（帖子/评论/会话/消息/通知）。
 * members[0] 为创建者本人，members[1..] 为其它成员。
 * 仅用于「首次创建频道」的演示灌数；加入频道只给最少内容。
 */
export function makeSeedContent(
  cid: string,
  channelName: string,
  members: CommunityUser[],
  creatorId: string
): {
  posts: Post[];
  comments: Comment[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
} {
  const me = members[0];
  const others = members.slice(1);
  const gid = `conv_group_${cid}`;

  /* ---- 帖子 ---- */
  const posts: Post[] = [
    {
      id: `p_${cid}_1`,
      channelId: cid,
      author: others[0] ?? me,
      topic: '生活分享',
      content: '今天早上在小区花园捡到一个布钱包，里面有老年卡和一点现金，已经交到物业前台了。失主看到了去领一下吧。',
      images: [],
      likeCount: 32,
      commentCount: 2,
      viewCount: 86,
      liked: false,
      createdAt: daysAgo(0, 8, 20),
    },
    {
      id: `p_${cid}_2`,
      channelId: cid,
      author: others[1] ?? me,
      topic: '生活分享',
      content: '社区食堂这个月新添了软烂菜窗口，红烧肉炖得很烂，牙口不好的老伙计也能吃。中午 11 点开饭，人不多。',
      images: [placeholderImages.food(), placeholderImages.meal()],
      likeCount: 58,
      commentCount: 3,
      viewCount: 152,
      liked: true,
      createdAt: daysAgo(0, 11, 5),
    },
    {
      id: `p_${cid}_3`,
      channelId: cid,
      author: others[2] ?? me,
      topic: '健康养生',
      content: '社区卫生服务中心下周三上午有免费量血压和血糖，带上医保卡就行，8 点半开始。',
      images: [placeholderImages.health()],
      likeCount: 41,
      commentCount: 1,
      viewCount: 98,
      liked: false,
      createdAt: daysAgo(1, 9, 40),
    },
    {
      id: `p_${cid}_4`,
      channelId: cid,
      author: me,
      topic: '生活分享',
      content: '我家有理发的推子，天冷了不方便出门的老哥老姐，我可以上门帮忙推个头发，不收钱，就当串门聊天。',
      images: [placeholderImages.haircut()],
      likeCount: 47,
      commentCount: 2,
      viewCount: 73,
      liked: false,
      createdAt: daysAgo(2, 15, 10),
    },
  ];

  /* ---- 评论 ---- */
  const comments: Comment[] = [
    { id: `c_${cid}_1`, channelId: cid, postId: `p_${cid}_1`, author: others[1] ?? me, content: '真是热心人，这种好事要表扬。', createdAt: daysAgo(0, 9, 10) },
    { id: `c_${cid}_2`, channelId: cid, postId: `p_${cid}_2`, author: others[0] ?? me, content: '太好了，明天中午就去尝尝，谢谢告诉。', createdAt: daysAgo(0, 11, 30) },
    { id: `c_${cid}_3`, channelId: cid, postId: `p_${cid}_4`, author: others[2] ?? me, content: '真热心，我老伴腿脚不利索，能有你帮忙太好了。', createdAt: daysAgo(2, 16, 20) },
  ];

  /* ---- 会话：群组 + 私信 ---- */
  const conversations: Conversation[] = [
    {
      id: gid,
      channelId: cid,
      kind: 'group',
      title: `${channelName} 群聊`,
      memberIds: members.map((m) => m.id),
      lastMessage: `${me.name}：大家好，欢迎来到《${channelName}》`,
      lastAt: daysAgo(0, 8, 30),
      unread: 0,
      pinned: true,
    },
  ];
  const messages: Message[] = [
    {
      id: `m_${cid}_g1`,
      channelId: cid,
      conversationId: gid,
      senderId: me.id,
      content: `大家好，欢迎来到《${channelName}》！`,
      createdAt: daysAgo(0, 8, 30),
    },
  ];

  // 有第二位成员才生成私信种子
  for (let i = 0; i < Math.min(2, others.length); i++) {
    const peer = others[i];
    const convId = `conv_dm_${cid}_${me.id}_${peer.id}`;
    conversations.push({
      id: convId,
      channelId: cid,
      kind: 'dm',
      peer,
      lastMessage: i === 0 ? `${me.name}：行呀，您要啥尽管说。` : `${peer.name}：今天拍得真好看，谢谢你教我。`,
      lastAt: i === 0 ? daysAgo(0, 10, 12) : daysAgo(1, 17, 30),
      unread: i === 0 ? 0 : 0,
    });
    messages.push(
      {
        id: `m_${cid}_d${i}1`,
        channelId: cid,
        conversationId: convId,
        senderId: peer.id,
        content: i === 0 ? '明天去菜市场能帮我带点菜不？' : '今天月季拍得真好看，谢谢你教我。',
        createdAt: i === 0 ? daysAgo(0, 9, 40) : daysAgo(1, 17, 20),
      },
      {
        id: `m_${cid}_d${i}2`,
        channelId: cid,
        conversationId: convId,
        senderId: me.id,
        content: i === 0 ? '行呀，您要啥尽管说。' : '下次咱们一起拍月季去。',
        createdAt: i === 0 ? daysAgo(0, 10, 12) : daysAgo(1, 17, 30),
      }
    );
  }

  /* ---- 系统消息提醒 ---- */
  const notifications: AppNotification[] = [
    {
      id: `n_${cid}_1`,
      channelId: cid,
      icon: '💬',
      title: `${others[2]?.name ?? '邻居'} 评论了你的动态`,
      body: '“真热心，我老伴腿脚不利索，能有你帮忙太好了。”',
      postId: `p_${cid}_4`,
      read: false,
      createdAt: daysAgo(0, 7, 5),
    },
    {
      id: `n_${cid}_2`,
      channelId: cid,
      icon: '❤️',
      title: `${others[1]?.name ?? '邻居'} 赞了你的动态`,
      body: '《我家有理发的推子，可以上门帮邻居推头发》',
      postId: `p_${cid}_4`,
      read: false,
      createdAt: daysAgo(0, 8, 40),
    },
    {
      id: `n_${cid}_3`,
      channelId: cid,
      icon: '👥',
      title: `${others[0]?.name ?? '邻居'} 关注了你`,
      body: '想和你成为邻里好友，以后动态会优先推荐给你。',
      read: true,
      createdAt: daysAgo(1, 10, 10),
    },
  ];

  return { posts, comments, conversations, messages, notifications };
}

/** 加入频道时的最少初始内容（joiner 浏览器内，无其它成员） */
export function makeJoinContent(
  cid: string,
  channelName: string,
  me: CommunityUser
): {
  posts: Post[];
  comments: Comment[];
  conversations: Conversation[];
  messages: Message[];
  notifications: AppNotification[];
} {
  const gid = `conv_group_${cid}`;
  const posts: Post[] = [
    {
      id: `p_${cid}_1`,
      channelId: cid,
      author: me,
      topic: '生活分享',
      content: `我刚加入《${channelName}》，以后请大家多关照！`,
      images: [],
      likeCount: 0,
      commentCount: 0,
      viewCount: 1,
      liked: false,
      createdAt: daysAgo(0, 8, 20),
    },
  ];
  const conversations: Conversation[] = [
    {
      id: gid,
      channelId: cid,
      kind: 'group',
      title: `${channelName} 群聊`,
      memberIds: [me.id],
      lastMessage: `${me.name}：我刚加入频道，请大家多关照！`,
      lastAt: daysAgo(0, 8, 30),
      unread: 0,
      pinned: true,
    },
  ];
  const messages: Message[] = [
    { id: `m_${cid}_g1`, channelId: cid, conversationId: gid, senderId: me.id, content: '我刚加入频道，请大家多关照！', createdAt: daysAgo(0, 8, 30) },
  ];
  const notifications: AppNotification[] = [
    {
      id: `n_${cid}_1`,
      channelId: cid,
      icon: '🎉',
      title: '加入成功',
      body: `你已成功加入《${channelName}》，去动态里和大家打个招呼吧。`,
      read: false,
      createdAt: daysAgo(0, 8, 25),
    },
  ];
  return { posts, comments: [], conversations, messages, notifications };
}

/** 为新成员生成一个默认（基础资料复制而来）的频道资料 */
export function defaultMemberProfile(user: CommunityUser): ChannelMember['profile'] {
  return {
    name: user.name,
    avatar: user.avatar,
    address: user.address,
    age: user.age,
    contact: '',
    bio: '',
  };
}
