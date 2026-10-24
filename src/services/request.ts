import Taro from '@tarojs/taro';

/**
 * 统一请求层。
 *
 * 业务层只调用 `src/services/*`，不直接碰这里。
 * 后端地址与数据源切换见 `config/dev.js`、`config/prod.js` 注入的 API_MODE / API_BASE_URL：
 *   - API_MODE === 'mock'   → 走 `src/services/mockAdapter.ts` 的本地模拟数据
 *   - API_MODE === 'remote' → 走真实后端 HTTP 接口
 */

export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
}

const TIMEOUT = 15000;

/** 读取本地登录态 token，接入真实后端时由登录流程写入 */
export function getToken(): string {
  try {
    return Taro.getStorageSync('token') || '';
  } catch (e) {
    return '';
  }
}

export function isMockMode(): boolean {
  // defineConstants 注入；单元测试或未注入时兜底为 mock
  return typeof API_MODE === 'undefined' || API_MODE === 'mock';
}

function buildUrl(path: string): string {
  const base = typeof API_BASE_URL === 'undefined' ? '' : API_BASE_URL;
  if (/^https?:\/\//.test(path)) return path;
  return `${base.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
}

export interface RequestOptions {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  data?: Record<string, any>;
  header?: Record<string, string>;
}

export async function request<T>(options: RequestOptions): Promise<T> {
  const { url, method = 'GET', data, header } = options;
  const token = getToken();

  const res = await Taro.request({
    url: buildUrl(url),
    method,
    data,
    timeout: TIMEOUT,
    header: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...header,
    },
  });

  if (res.statusCode < 200 || res.statusCode >= 300) {
    throw new Error(`网络异常(${res.statusCode})，请稍后再试`);
  }

  const body = res.data as ApiResponse<T>;
  // 兼容后端直接返回裸数据的写法
  if (body && typeof body === 'object' && 'code' in body) {
    if (body.code !== 0 && body.code !== 200) {
      throw new Error(body.message || '请求失败，请稍后再试');
    }
    return body.data;
  }
  return res.data as T;
}

export { buildUrl };
