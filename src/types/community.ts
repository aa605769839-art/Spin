/** 频道（Channel）领域模型 —— 与后端契约一一对应，两端共用 */

/* ============ 频道相关 ============ */

/** 频道内用户的个人资料（按频道独立保存，默认复制基础资料，可单独修改） */
export interface ChannelMemberProfile {
  /** 昵称，如「李桂芳」 */
  name: string;
  /** 头像地址 */
  avatar?: string;
  /** 所在地区（城市 + 区，如「北京市 朝阳区」），用于首页天气等本地化服务 */
  address?: string;
  /** 年龄，用于社区适老服务分组 */
  age?: number;
  /** 紧急联系人 */
  contact?: string;
  /** 个性签名 / 简介 */
  bio?: string;
}

export interface CommunityUser {
  id: string;
  /** 基础昵称（各频道资料默认复制自此） */
  name: string;
  /** 基础头像 */
  avatar: string;
  /** 楼栋门牌（数据保留，列表/详情不再展示具体楼栋单元） */
  building?: string;
  /** 基础地区（城市 + 区），用于首页天气等本地化服务 */
  address?: string;
  /** 基础年龄 */
  age?: number;
  /** 是否本人 */
  isSelf?: boolean;
  /** 该用户加入/创建的频道 id 列表（上限 3 个） */
  channelIds: string[];
}

/** 频道成员关系：把用户与某个频道的个人资料、角色绑定在一起 */
export interface ChannelMember {
  userId: string;
  channelId: string;
  /** creator = 创建者（拥有公告管理等权限）；member = 普通成员 */
  role: 'creator' | 'member';
  /** 该频道内的个人资料（独立于其它频道） */
  profile: ChannelMemberProfile;
  joinedAt: string;
}

/** 频道公告（系统 AI 默认生成 3 条，由创建者管理） */
export interface Announcement {
  id: string;
  channelId: string;
  title: string;
  body: string;
  creatorId: string;
  createdAt: string;
}

/** 一个独立的频道实体 */
export interface Channel {
  id: string;
  name: string;
  description?: string;
  avatar?: string;
  /** 创建者用户 id */
  creatorId: string;
  /** 邀请码（用于 ?invite= 链接） */
  inviteCode: string;
  createdAt: string;
  /** 频道全体成员 id（含创建者），群组默认包含所有人 */
  memberIds: string[];
  /** 频道公告（系统 AI 默认 3 条） */
  announcements: Announcement[];
}

/* ============ 社区动态相关 ============ */

export interface Comment {
  id: string;
  /** 所属频道 */
  channelId: string;
  postId: string;
  author: CommunityUser;
  /** 被回复的人（评论回复时存在），用于展示「回复 @某某」 */
  replyTo?: CommunityUser;
  content: string;
  createdAt: string;
}

export interface Post {
  id: string;
  /** 所属频道 */
  channelId: string;
  author: CommunityUser;
  /** 正文 */
  content: string;
  /** 配图，最多 9 张 */
  images: string[];
  /** 话题标签，如「生活分享」 */
  topic?: string;
  /** 语音时长（秒），老人发布时可只发语音 */
  audioDuration?: number;
  likeCount: number;
  commentCount: number;
  /** 浏览量（小眼镜标签展示，进详情页自增） */
  viewCount: number;
  /** 当前用户是否已点赞 */
  liked: boolean;
  createdAt: string;
}

export interface FeedPage {
  list: Post[];
  /** 下一页游标，为空表示没有更多了 */
  nextCursor: string | null;
  hasMore: boolean;
}

export interface PublishPostPayload {
  /** 目标频道（不传则取当前频道） */
  channelId?: string;
  content: string;
  images: string[];
  topic?: string;
  audioDuration?: number;
}

export interface PublishCommentPayload {
  /** 目标频道（不传则取当前频道） */
  channelId?: string;
  postId: string;
  content: string;
  /** 回复某条评论时，传被回复人的 id */
  replyToId?: string;
}

/* ============ 私信 / 群组相关 ============ */

export type ConversationKind = 'group' | 'dm' | 'system';

/** 会话（群聊 / 私信 / 系统消息提醒） */
export interface Conversation {
  id: string;
  /** 所属频道 */
  channelId: string;
  /** 会话类型 */
  kind: ConversationKind;
  /**
   * 私信的另一方（kind=dm 时有效）。
   * 注意：这是「对方」对象，不区分当前用户视角，页面按 senderId 判断左右。
   */
  peer?: CommunityUser;
  /** 群组名称（kind=group 时，如「频道名 群聊」） */
  title?: string;
  /** 群组成员 id（kind=group 时，含频道所有人） */
  memberIds?: string[];
  /** 最近一条消息预览 */
  lastMessage: string;
  /** 最近消息时间（ISO） */
  lastAt: string;
  /** 未读条数 */
  unread: number;
  /** 是否置顶（群组固定置顶，系统消息提醒次置顶） */
  pinned?: boolean;
}

/** 私信 / 群消息 */
export interface Message {
  id: string;
  /** 所属频道 */
  channelId: string;
  conversationId: string;
  /** 发送方，用于区分左右气泡 */
  senderId: string;
  content: string;
  createdAt: string;
}

/** 系统消息提醒（置顶在私信里的「消息提醒」对话） */
export interface AppNotification {
  id: string;
  /** 所属频道 */
  channelId: string;
  /** 表情图标，如 💬 ❤️ 📢 */
  icon: string;
  /** 通知标题，如「王建国 评论了你的动态」 */
  title: string;
  /** 通知正文 */
  body: string;
  /** 关联的动态 id（可点击跳转，可选） */
  postId?: string;
  /** 是否已读 */
  read?: boolean;
  createdAt: string;
}
