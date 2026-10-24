/**
 * 演示用插画图片生成器。
 *
 * 演示产物是纯前端页面，无法依赖外链图片（也会被质量门拦截），
 * 因此用「渐变背景 + 主题 emoji + 标题」生成一组风格统一、温暖高级的 SVG 海报作为占位图。
 * 返回 dataURI（image/svg+xml），可直接塞进 <Image src> 或 <img src>。
 */

interface Art {
  emoji: string;
  title: string;
  from: string;
  to: string;
}

const ARTS: Record<string, Art> = {
  food: { emoji: '🍲', title: '社区食堂·红烧肉', from: '#ff9a5a', to: '#ef6b3e' },
  meal: { emoji: '🍚', title: '软烂菜窗口', from: '#ffc36b', to: '#ff9a3d' },
  flower: { emoji: '🌸', title: '楼下月季开了', from: '#ff8fb1', to: '#e85d8a' },
  taichi: { emoji: '🌅', title: '晨练太极', from: '#ffb36b', to: '#ff7e5f' },
  veggies: { emoji: '🥬', title: '今日买菜', from: '#8fd06a', to: '#4fa85a' },
  health: { emoji: '💗', title: '免费量血压', from: '#5ec6c0', to: '#3a9aa8' },
  haircut: { emoji: '💈', title: '上门理发', from: '#b79bff', to: '#7d5fe0' },
  community: { emoji: '🏡', title: '暖邻社区', from: '#ffae6b', to: '#ef7d33' },
};

function make(art: Art, w = 480, h = 480): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="${art.from}"/>
      <stop offset="1" stop-color="${art.to}"/>
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#g)"/>
  <circle cx="${w / 2}" cy="${h * 0.42}" r="${w * 0.24}" fill="rgba(255,255,255,0.16)"/>
  <circle cx="${w / 2}" cy="${h * 0.42}" r="${w * 0.2}" fill="rgba(255,255,255,0.12)"/>
  <text x="50%" y="${h * 0.42}" font-size="${w * 0.3}" text-anchor="middle" dominant-baseline="central">${art.emoji}</text>
  <text x="50%" y="${h * 0.82}" font-size="${w * 0.082}" text-anchor="middle" fill="#ffffff" font-family="-apple-system, 'PingFang SC', sans-serif" font-weight="600">${art.title}</text>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg.replace(/\s+/g, ' ').trim())}`;
}

export const placeholderImages = {
  food: () => make(ARTS.food),
  meal: () => make(ARTS.meal),
  flower: () => make(ARTS.flower),
  taichi: () => make(ARTS.taichi),
  veggies: () => make(ARTS.veggies),
  health: () => make(ARTS.health),
  haircut: () => make(ARTS.haircut),
  community: () => make(ARTS.community),
};

export type PlaceholderKey = keyof typeof placeholderImages;
