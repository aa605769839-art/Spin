module.exports = {
  env: {
    NODE_ENV: '"production"',
  },
  defineConstants: {
    // 对接真实后端时改成 'remote'，并把 API_BASE_URL 指向你的服务地址
    API_MODE: JSON.stringify(process.env.API_MODE || 'mock'),
    API_BASE_URL: JSON.stringify(process.env.API_BASE_URL || 'https://api.example.com/api'),
  },
  mini: {},
  h5: {},
};
