module.exports = {
  env: {
    NODE_ENV: '"development"',
  },
  defineConstants: {
    API_MODE: JSON.stringify('mock'),
    API_BASE_URL: JSON.stringify('http://localhost:3000/api'),
  },
  mini: {},
  h5: {
    devServer: {
      host: '0.0.0.0',
      port: 10086,
      allowedHosts: 'all',
    },
  },
};
