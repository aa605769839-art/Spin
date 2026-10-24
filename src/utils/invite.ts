import { Channel } from '@/types/community';

/** 邀请链接载荷（只带频道标识与名称，足够在另一浏览器里重建本地频道） */
export interface InvitePayload {
  id: string;
  name: string;
  creatorName?: string;
}

/** 把频道信息编码为可放进 URL 的短串（支持中文） */
export function encodeInvite(channel: Channel): string {
  const payload: InvitePayload = { id: channel.id, name: channel.name };
  return btoa(encodeURIComponent(JSON.stringify(payload)));
}

/** 解码邀请串，失败返回 null */
export function decodeInvite(code: string): InvitePayload | null {
  try {
    const json = decodeURIComponent(atob(code));
    const p = JSON.parse(json) as InvitePayload;
    if (p && p.id && p.name) return p;
    return null;
  } catch (e) {
    return null;
  }
}

/** 拼出完整的邀请链接（?invite=...） */
export function buildInviteLink(code: string): string {
  const base = typeof window !== 'undefined' ? window.location.origin + window.location.pathname : '';
  return `${base}?invite=${encodeURIComponent(code)}`;
}

/** 从当前 URL 读取邀请参数 */
export function readInviteFromUrl(): InvitePayload | null {
  if (typeof window === 'undefined') return null;
  const params = new URLSearchParams(window.location.search);
  const raw = params.get('invite');
  if (!raw) return null;
  return decodeInvite(raw);
}
