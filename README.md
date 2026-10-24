# 暖邻社区 · 邻里圈

面向老年人的社区邻里圈应用。**Taro 3 + React 18 + TypeScript + SCSS**，一套代码可编译到微信小程序与 H5。

---

## 一、快速开始

```bash
npm install

# 微信小程序（产物在 dist/，用微信开发者工具打开本目录）
npm run dev:weapp

# H5
npm run dev:h5

# 构建可独立运行的移动端演示页（单文件 HTML，双击即可打开）
npm run build:demo        # → dist-demo/elder-community.html
```

---

## 二、目录结构

```
elder-community/
├── config/                     # Taro 编译配置（含 API_MODE 数据源开关）
│   ├── index.js
│   ├── dev.js
│   └── prod.js
├── src/
│   ├── app.ts / app.config.ts  # 应用入口、全局路由与 tabBar
│   ├── styles/variables.scss   # 适老化设计 token（字号 / 颜色 / 点击区尺寸）
│   ├── types/community.ts      # 领域模型，前后端共用
│   ├── services/
│   │   ├── request.ts          # 统一请求层（超时、鉴权头、错误归一）
│   │   ├── api.ts              # 真实后端契约层（接口定义 + 调用实现）
│   │   ├── mockAdapter.ts      # 本地模拟实现，数据落 Taro Storage
│   │   ├── mockData.ts         # 种子数据
│   │   └── index.ts            # 统一出口，按 API_MODE 自动切换
│   ├── components/             # Avatar / PostCard / EmptyState / PageState
│   └── pages/
│       ├── index/              # 邻里圈信息流（首页）
│       ├── publish/            # 我要发言
│       ├── detail/             # 帖子详情 + 评论
│       └── mine/               # 我的
└── scripts/
    ├── build-demo.mjs          # 生成单文件移动端演示页
    ├── smoke-test.cjs          # 端到端冒烟测试
    └── schema.json             # 线上数据表 schema
```

---

## 三、适老化设计规范

本项目所有视觉与交互决策都服从一条原则：**让 70 岁的用户一次就能看懂、一次就能点对。**

| 维度 | 规范 | 落地位置 |
| --- | --- | --- |
| 正文字号 | ≥ 34rpx（≈17px），主内容 36rpx | `variables.scss` `$font-md` |
| 行高 | 1.8 ~ 1.9，避免视觉拥挤 | 各页面正文样式 |
| 可点击区 | 最小 88rpx（≈44px），主按钮 ≥ 96rpx | `$tap-min` |
| 对比度 | 正文 `#2B2118` on `#FDF7F0`，对比度 > 12:1 | `$color-text` / `$color-bg` |
| 色彩语义 | 暖橙主色，红涨绿跌不适用；避免纯蓝紫等冷色 | `$color-primary` |
| 图标语义 | 点赞用五角星（★/☆）而非爱心，老年用户更易理解 | `PostCard` |
| 无空屏 | 所有空状态必须有「为什么空 + 下一步做什么」 | `EmptyState` |
| 无死路 | 所有失败必须有可点击的「再试一次」 | `PageState` |
| 减少输入 | 话题用大胶囊单选替代搜索框 | `index` / `publish` |

---

## 四、数据层：Mock 与真实后端如何切换

**切换只改配置，页面代码零改动。**

在 `config/dev.js` / `config/prod.js` 中：

```js
defineConstants: {
  API_MODE: JSON.stringify('mock'),                     // 'mock' | 'remote'
  API_BASE_URL: JSON.stringify('https://api.example.com/api'),
}
```

- `API_MODE = 'mock'` → 走 `src/services/mockAdapter.ts`，数据持久化在本地，开箱即跑；
- `API_MODE = 'remote'` → 走 `src/services/api.ts` 的真实 HTTP 调用。

`src/services/index.ts` 负责按开关分发，页面里统一 `import { communityApi } from '@/services'`。

### 后端接口契约

统一响应体：`{ code: number, message: string, data: T }`，`code` 为 `0` 或 `200` 视为成功。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/community/feed?cursor=` | 信息流，游标分页，返回 `{ list, nextCursor, hasMore }` |
| GET | `/community/posts/:id` | 动态详情 |
| POST | `/community/posts` | 发布动态 |
| POST | `/community/posts/:id/like` | 点赞 / 取消点赞 |
| GET | `/community/posts/:id/comments` | 评论列表 |
| POST | `/community/comments` | 发表评论 |
| GET | `/community/my/posts` | 我的动态 |

鉴权：`request.ts` 自动从本地读取 `token` 并注入 `Authorization: Bearer <token>`。

---

## 五、线上数据表

项目配套的「邻里圈动态」数据表已创建（9 字段：标题、发布人、楼栋门牌、话题、正文、语音时长、点赞数、评论数、发布时间），Schema 见 `scripts/schema.json`。

---

## 六、验证情况

```bash
npm run type-check          # TypeScript 类型检查，0 错误
node scripts/build-demo.mjs # 产物构建
node scripts/smoke-test.cjs # 端到端冒烟测试（需先起本地静态服务）
```

演示产物的质量门结果：

```
QUALITY_OK 报错=pass 性能=pass 安全=pass
（PQ001/PQ005 为压缩后 React DOM 运行时的静态分析误报，已声明放行；
  PQ110 ES6 语法为 WARN，现代浏览器不受影响）
```
