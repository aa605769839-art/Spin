/**
 * 天气工具（演示用）。
 *
 * 需求：首页天气预报「根据地址来确定」。
 * 真实场景应调用天气 API；演示环境无网络依赖，这里用「地址 + 当天」做确定性派生：
 *   - 同一地址同一天，天气稳定不变（老人不会一刷新就变天）；
 *   - 不同地址会得到不同的天气与气温（满足「按地址确定」）；
 *   - 隔天后会自然变化，像真实天气一样。
 */

interface Weather {
  /** 天气图标 */
  icon: string;
  /** 天气文案，如「晴」「小雨」 */
  label: string;
  /** 气温（摄氏度） */
  temp: number;
  /** 解析出的地区名（城市+区），用于 hero 展示 */
  district: string;
}

const CONDITIONS: ReadonlyArray<{ icon: string; label: string; base: number }> = [
  { icon: '☀️', label: '晴', base: 22 },
  { icon: '🌤️', label: '晴间多云', base: 20 },
  { icon: '⛅', label: '多云', base: 19 },
  { icon: '🌥️', label: '阴', base: 17 },
  { icon: '🌧️', label: '小雨', base: 15 },
  { icon: '⛈️', label: '雷阵雨', base: 16 },
  { icon: '🌨️', label: '小雪', base: 4 },
];

/** 简单字符串哈希，保证同输入同输出，分布足够均匀 */
function hashStr(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** 从「北京市 朝阳区」这类地址里取出末尾的地区（区/县） */
export function getDistrict(address?: string): string {
  if (!address) return '本地';
  const parts = address.trim().split(/\s+/).filter(Boolean);
  return parts[parts.length - 1] || address;
}

/** 一年中的第几天（1~366），用于让天气随时间缓慢变化 */
function dayOfYear(d: Date): number {
  const start = new Date(d.getFullYear(), 0, 0);
  const diff = d.getTime() - start.getTime();
  return Math.floor(diff / 86400000);
}

/**
 * 根据地址派生天气。
 * @param address 用户所在地区（城市+区），如「北京市 朝阳区」
 */
export function weatherFor(address?: string): Weather {
  const district = getDistrict(address);
  // 地址决定气温基准与「性格」（南方暖、北方凉），并决定天气种类偏好
  const addrSeed = hashStr(address || 'default-city');
  const cond = CONDITIONS[addrSeed % CONDITIONS.length];
  // 当天微调：同一地址每天气温小幅波动，但当天内稳定
  const daySeed = hashStr(`${address || 'default-city'}|${dayOfYear(new Date())}`);
  const temp = cond.base + (daySeed % 6) - 2;
  return {
    icon: cond.icon,
    label: cond.label,
    temp,
    district,
  };
}
