export default defineAppConfig({
  pages: [
    'pages/index/index',
    'pages/publish/index',
    'pages/detail/index',
    'pages/mine/index',
    'pages/messages/index',
    'pages/chat/index',
    'pages/profile-edit/index',
    'pages/channel-create/index',
    'pages/channel-join/index',
    'pages/channel-switch/index',
    'pages/announcement-manage/index',
  ],
  window: {
    backgroundTextStyle: 'light',
    navigationBarBackgroundColor: '#E8722C',
    navigationBarTitleText: '频道',
    navigationBarTextStyle: 'white',
    backgroundColor: '#FDF7F0',
  },
  tabBar: {
    color: '#7A6A5C',
    selectedColor: '#E8722C',
    backgroundColor: '#FFFFFF',
    borderStyle: 'white',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '动态',
      },
      {
        pagePath: 'pages/mine/index',
        text: '我的',
      },
    ],
  },
});
