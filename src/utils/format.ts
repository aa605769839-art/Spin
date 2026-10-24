/** 时间友好化 —— 老人看得懂的相对时间 */
export function formatTime(iso: string): string {
  const now = Date.now();
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return '';
  const diff = Math.floor((now - t) / 1000);

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)} 分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} 小时前`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} 天前`;

  const d = new Date(t);
  return `${d.getMonth() + 1} 月 ${d.getDate()} 日`;
}

/** 大数字友好化，如 1.2 万 */
export function formatCount(n: number): string {
  if (n < 10000) return String(n);
  return `${(n / 10000).toFixed(1)} 万`;
}

/** 退出登录 / 切换身份时清掉本地缓存，避免脏数据串号 */
export function clearLocalCache(keys: string[]): void {
  keys.forEach((k) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      require('@tarojs/taro').default.removeStorageSync(k);
    } catch (e) {
      /* ignore */
    }
  });
}
