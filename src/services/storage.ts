import Taro from '@tarojs/taro';

/**
 * 轻量 Storage 封装（基于 Taro Storage，H5 底层即 localStorage）。
 * 所有频道相关的本地持久化都走这里，key 统一加频道作用域后缀。
 */

export function read<T>(key: string, fallback: T): T {
  try {
    const v = Taro.getStorageSync(key);
    if (v === '' || v === null || v === undefined) return fallback;
    return typeof v === 'string' ? (JSON.parse(v) as T) : (v as T);
  } catch (e) {
    return fallback;
  }
}

export function write(key: string, value: unknown): void {
  try {
    Taro.setStorageSync(key, JSON.stringify(value));
  } catch (e) {
    // 存储不可用时静默降级，不影响当次会话
    console.warn('[storage] 写入失败', key, e);
  }
}

/** 频道作用域 key 构造器 */
export const KEY = {
  channels: 'ec_channels',
  currentChannel: 'ec_current_channel',
  user: 'ec_user',
  members: (cid: string) => `ec_members:${cid}`,
  posts: (cid: string) => `ec_posts:${cid}`,
  comments: (cid: string) => `ec_comments:${cid}`,
  liked: (cid: string) => `ec_liked:${cid}`,
  conversations: (cid: string) => `ec_conversations:${cid}`,
  messages: (cid: string) => `ec_messages:${cid}`,
  notifications: (cid: string) => `ec_notifications:${cid}`,
  dmPolicy: (cid: string) => `ec_dm_policy:${cid}`,
};
