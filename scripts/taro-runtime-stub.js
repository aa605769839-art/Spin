/* Taro 运行时 API 的最小实现（真实模块，便于 esbuild 正确解析 import 'react'） */
import React from 'react';

let listeners = [];
// 初始栈用 path 键（与 navigateTo/switchTab 写入的结构一致），
// 否则 Router 首次 sync 读 cur.path 会得到 undefined，导致首页 tabbar 不显示
const stack = [{ path: '/pages/index/index', params: {} }];

function parseUrl(url) {
  const [path, qs] = String(url).split('?');
  const params = {};
  (qs || '')
    .split('&')
    .filter(Boolean)
    .forEach((kv) => {
      const [k, v] = kv.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
  return { path, params };
}

const Taro = {
  navigateTo(o) {
    stack.push(parseUrl(o.url));
    listeners.forEach((l) => l());
  },
  redirectTo(o) {
    stack[stack.length - 1] = parseUrl(o.url);
    listeners.forEach((l) => l());
  },
  navigateBack() {
    if (stack.length > 1) stack.pop();
    listeners.forEach((l) => l());
  },
  switchTab(o) {
    const u = parseUrl(o.url);
    stack.length = 0;
    stack.push(u);
    listeners.forEach((l) => l());
  },
  showToast(o) {
    window.__ecToast && window.__ecToast(o.title || '');
  },
  setClipboardData(opts) {
    const data = (opts && (opts.data || opts.content)) || '';
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(data);
    } catch (e) {
      /* 忽略：部分环境无 clipboard 权限 */
    }
    // 同时暂存到 window，便于演示与自动化测试读取
    window.__lastClipboard = data;
    if (opts && typeof opts.success === 'function') opts.success({ data });
    window.__ecToast && window.__ecToast('邀请链接已复制');
  },
  showModal(opts) {
    return new Promise(function (resolve) {
      var overlay = document.createElement('div');
      overlay.className = 'ec-modal-mask';
      var box = document.createElement('div');
      box.className = 'ec-modal';
      var title = document.createElement('div');
      title.className = 'ec-modal__title';
      title.textContent = (opts && opts.title) || '提示';
      var content = document.createElement('div');
      content.className = 'ec-modal__content';
      content.textContent = (opts && opts.content) || '';
      var btns = document.createElement('div');
      btns.className = 'ec-modal__btns';
      var cancel = document.createElement('div');
      cancel.className = 'ec-modal__btn ec-modal__btn--cancel';
      cancel.textContent = (opts && opts.cancelText) || '取消';
      var confirm = document.createElement('div');
      confirm.className = 'ec-modal__btn ec-modal__btn--confirm';
      confirm.textContent = (opts && opts.confirmText) || '确定';
      btns.appendChild(cancel);
      btns.appendChild(confirm);
      box.appendChild(title);
      if (content.textContent) box.appendChild(content);
      box.appendChild(btns);
      overlay.appendChild(box);
      document.body.appendChild(overlay);
      function close(res) {
        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
        if (opts && typeof opts.success === 'function') opts.success(res || {});
        if (opts && typeof opts.complete === 'function') opts.complete(res || {});
        resolve(res || {});
      }
      cancel.onclick = function () {
        close({ confirm: false, cancel: true });
      };
      confirm.onclick = function () {
        close({ confirm: true, cancel: false });
      };
    });
  },
  chooseImage(opts) {
    return new Promise(function (resolve, reject) {
      try {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.multiple = !!(opts && opts.count > 1);
        input.style.display = 'none';
        input.onchange = function () {
          var files = Array.prototype.slice.call(input.files || []);
          if (!files.length) {
            reject(new Error('cancel'));
            return;
          }
          Promise.all(files.map(function (f) { return window.__ecCompressImage(f); }))
            .then(function (paths) { resolve({ tempFilePaths: paths }); })
            .catch(function (e) { reject(e); });
        };
        input.oncancel = function () { reject(new Error('cancel')); };
        document.body.appendChild(input);
        input.click();
      } catch (e) {
        reject(e);
      }
    });
  },
  previewImage(opts) {
    var urls = (opts && opts.urls) || [];
    if (!urls.length) return;
    var overlay = document.getElementById('ec-lightbox');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'ec-lightbox';
      overlay.className = 'ec-lightbox';
      document.body.appendChild(overlay);
    }
    var idx = 0;
    var cur = opts.current;
    if (cur) {
      var k = urls.indexOf(cur);
      if (k >= 0) idx = k;
    }
    function closeLb() {
      overlay.classList.remove('show');
      setTimeout(function () { overlay.style.display = 'none'; }, 240);
    }
    function render() {
      overlay.innerHTML = '';
      var mask = document.createElement('div'); mask.className = 'ec-lightbox__mask';
      var bar = document.createElement('div'); bar.className = 'ec-lightbox__bar';
      var close = document.createElement('div'); close.className = 'ec-lightbox__close'; close.textContent = '×';
      var cnt = document.createElement('div'); cnt.className = 'ec-lightbox__count'; cnt.textContent = (idx + 1) + ' / ' + urls.length;
      bar.appendChild(close); bar.appendChild(cnt);
      var stage = document.createElement('div'); stage.className = 'ec-lightbox__stage';
      var img = document.createElement('img'); img.className = 'ec-lightbox__img'; img.src = urls[idx];
      stage.appendChild(img);
      overlay.appendChild(mask); overlay.appendChild(bar); overlay.appendChild(stage);
      if (urls.length > 1) {
        var prev = document.createElement('div'); prev.className = 'ec-lightbox__nav ec-lightbox__prev'; prev.textContent = '‹';
        var next = document.createElement('div'); next.className = 'ec-lightbox__nav ec-lightbox__next'; next.textContent = '›';
        overlay.appendChild(prev); overlay.appendChild(next);
        prev.onclick = function (e) { e.stopPropagation(); idx = (idx - 1 + urls.length) % urls.length; render(); };
        next.onclick = function (e) { e.stopPropagation(); idx = (idx + 1) % urls.length; render(); };
      }
      mask.onclick = closeLb;
      close.onclick = closeLb;
      stage.onclick = function (e) { e.stopPropagation(); idx = (idx + 1) % urls.length; render(); };
    }
    overlay.onclick = closeLb;
    overlay.style.display = 'flex';
    requestAnimationFrame(function () { overlay.classList.add('show'); });
    render();
  },
  getStorageSync(k) {
    try {
      return window.localStorage.getItem(k) || '';
    } catch (e) {
      return '';
    }
  },
  setStorageSync(k, v) {
    try {
      window.localStorage.setItem(k, v);
    } catch (e) {}
  },
  removeStorageSync(k) {
    try {
      window.localStorage.removeItem(k);
    } catch (e) {}
  },
  useLaunch(cb) {
    React.useEffect(() => {
      cb && cb();
    }, []);
  },
  useDidShow(cb) {
    React.useEffect(() => {
      cb && cb();
      listeners.push(cb);
      return () => {
        listeners = listeners.filter((l) => l !== cb);
      };
    }, []);
  },
  useRouter() {
    const [route, setRoute] = React.useState(stack[stack.length - 1]);
    React.useEffect(() => {
      const sync = () => setRoute({ ...stack[stack.length - 1] });
      listeners.push(sync);
      return () => {
        listeners = listeners.filter((l) => l !== sync);
      };
    }, []);
    return { path: route.path, params: route.params };
  },
  useLoad(cb) {
    React.useEffect(() => {
      cb && cb(stack[stack.length - 1].params);
    }, []);
  },
  __subscribe(fn) {
    listeners.push(fn);
    return () => {
      listeners = listeners.filter((l) => l !== fn);
    };
  },
  __current() {
    return stack[stack.length - 1];
  },
};

if (typeof window !== 'undefined') window.__TARO__ = Taro;
export default Taro;
export const useLaunch = Taro.useLaunch;
export const useDidShow = Taro.useDidShow;
export const useRouter = Taro.useRouter;
export const useLoad = Taro.useLoad;
