import React, { createElement, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import Taro from '@tarojs/taro';
import Feed from '@/pages/index/index';
import Publish from '@/pages/publish/index';
import Detail from '@/pages/detail/index';
import Mine from '@/pages/mine/index';
import Messages from '@/pages/messages/index';
import Chat from '@/pages/chat/index';
import ProfileEdit from '@/pages/profile-edit/index';
import ChannelCreate from '@/pages/channel-create/index';
import ChannelJoin from '@/pages/channel-join/index';
import ChannelSwitch from '@/pages/channel-switch/index';
import AnnouncementManage from '@/pages/announcement-manage/index';
import { messageApi } from '@/services';
import '@/app.scss';

// 演示产物的底部 tab 栏（对应 app.config 的 tabBar 配置）
const TABS = [
  { path: '/pages/index/index', label: '动态', icon: '🏠' },
  { path: '/pages/messages/index', label: '私信', icon: '💬' },
  { path: '/pages/mine/index', label: '我的', icon: '👤' },
];

// 启动首屏路由：若 URL 含 ?invite=，直接进入「加入频道」（全屏，无 tab），
// 模拟他人点开邀请链接的场景（另一浏览器/隐身窗口的 localStorage 是隔离的）。
function initialRoute(): { path: string; params: Record<string, string> } {
  if (
    typeof window !== 'undefined' &&
    /[?&]invite=/.test(window.location.search)
  ) {
    return { path: '/pages/channel-join/index', params: {} };
  }
  return { path: '/pages/index/index', params: {} };
}

/**
 * 演示产物的入口。
 * 用一个极简的页面栈复刻 Taro 的路由行为，让 4 个页面在浏览器里可以互相跳转，
 * 从而完整展示「浏览 → 详情 → 评论 → 发布 → 我的」整条链路。
 */
function Router() {
  const [route, setRoute] = useState<{ path: string; params: Record<string, string> }>(
    initialRoute
  );
  // 私信未读总数，用于 tab 红点
  const [unread, setUnread] = useState(0);

  const refreshUnread = () => {
    messageApi
      .listConversations()
      .then((list) => setUnread(list.reduce((sum, c) => sum + (c.unread || 0), 0)))
      .catch(() => {});
  };

  useEffect(() => {
    const Taro = (window as any).__TARO__;
    if (!Taro || typeof Taro.__subscribe !== 'function') return;
    const sync = () => {
      const cur = Taro.__current();
      const path = cur.path || cur.url || '/pages/index/index';
      setRoute({ path, params: cur.params || {} });
      refreshUnread();
    };
    // 邀请场景首屏固定为「加入频道」页，不被 Taro 路由栈覆盖；其余场景立即同步到栈顶
    if (route.path !== '/pages/channel-join/index') sync();
    refreshUnread();
    return Taro.__subscribe(sync);
  }, []);

  const pageMap: Record<string, any> = {
    '/pages/index/index': Feed,
    '/pages/publish/index': Publish,
    '/pages/detail/index': Detail,
    '/pages/mine/index': Mine,
    '/pages/messages/index': Messages,
    '/pages/chat/index': Chat,
    '/pages/profile-edit/index': ProfileEdit,
    '/pages/channel-create/index': ChannelCreate,
    '/pages/channel-join/index': ChannelJoin,
    '/pages/channel-switch/index': ChannelSwitch,
    '/pages/announcement-manage/index': AnnouncementManage,
  };

  const Page = pageMap[route.path] || Feed;
  const isTab = TABS.some((t) => t.path === route.path);

  return createElement(
    'div',
    { className: 'ec-page' },
    createElement(Page, { key: route.path + JSON.stringify(route.params) } as any),
    isTab
      ? createElement(
          'div',
          { className: 'ec-tabbar' },
          ...TABS.map((t) =>
            createElement(
              'div',
              {
                key: t.path,
                className: `ec-tab ${t.path === route.path ? 'is-active' : ''}`,
                onClick: () => {
                  try {
                    Taro.switchTab({ url: t.path });
                  } catch (e) {
                    /* ignore */
                  }
                },
              },
              createElement('div', { className: 'ec-tab__icon' }, t.icon),
              createElement('div', { className: 'ec-tab__label' }, t.label),
              t.label === '私信' && unread > 0
                ? createElement(
                    'div',
                    { className: 'ec-tab__badge' },
                    unread > 99 ? '99+' : String(unread)
                  )
                : null
            )
          )
        )
      : null
  );
}

const container = document.getElementById('app');
if (container) {
  createRoot(container).render(createElement(Router));
}
