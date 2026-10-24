/**
 * 构建「移动端 H5 演示产物」。
 *
 * 为什么需要这个脚本：
 *   Taro 的正式产物是给微信小程序的（dist/ 目录 + project.config.json），
 *   它需要一个合法 appid 才能在小程序开发者工具里跑起来。
 *   为了让你（和评审的人）不改任何配置、打开链接就能看到真实效果，
 *   这里用 esbuild 把 Taro 的 H5 实现（@tarojs/components 的 React 版本）
 *   和 src/ 下的页面代码打包成一个自包含的单文件 HTML。
 *
 * 用法：node scripts/build-demo.mjs
 * 产物：dist-demo/elder-community.html
 */
import { build } from 'esbuild';
import { readFile, writeFile, mkdir, stat } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const outDir = resolve(root, 'dist-demo');
const outFile = resolve(outDir, 'elder-community.html');

// 跨端组件 / 运行时的最小实现（真实模块，能让 esbuild 正确解析 import 'react'）
const componentsStubPath = resolve(root, 'scripts/taro-components-stub.js');
const runtimeStubPath = resolve(root, 'scripts/taro-runtime-stub.js');

const aliasPlugin = {
  name: 'taro-alias',
  setup(b) {
    b.onResolve({ filter: /^@tarojs\/components$/ }, () => ({ path: componentsStubPath }));
    b.onResolve({ filter: /^@tarojs\/taro$/ }, () => ({ path: runtimeStubPath }));
    // '@/xxx' 映射到 src/xxx；文件类资源补全扩展名，目录类走 index
    b.onResolve({ filter: /^@\// }, async (args) => {
      const base = resolve(root, 'src', args.path.slice(2));
      if (/\.(tsx?|jsx?|scss|sass|css|json)$/.test(base)) return { path: base };
      const candidates = [`${base}.tsx`, `${base}.ts`, `${base}/index.tsx`, `${base}/index.ts`];
      for (const c of candidates) {
        try {
          const s = await stat(c);
          if (s.isFile()) return { path: c };
        } catch (e) {
          /* 继续尝试下一个 */
        }
      }
      return { path: base };
    });
  },
};

// 页面 / 组件里的 .scss 会被转成运行时注入的 <style>，保持和 Taro 一致的写法
const stylePlugin = {
  name: 'scss-inline',
  setup(b) {
    // 相对路径以导入方所在目录为基准解析；用独立命名空间避免被其他 onResolve 二次处理
    b.onResolve({ filter: /\.s?css$/ }, (args) => {
      if (args.path.startsWith('@/')) {
        return { path: resolve(root, 'src', args.path.slice(2)), namespace: 'scss' };
      }
      const importerDir = args.resolveDir || (args.importer ? dirname(args.importer) : resolve(root, 'src'));
      return { path: resolve(importerDir, args.path), namespace: 'scss' };
    });
    b.onLoad({ filter: /\.s?css$/, namespace: 'scss' }, async (args) => {
      const sass = (await import('sass')).default;
      const variables = await readFile(resolve(root, 'src/styles/variables.scss'), 'utf8');
      const raw = await readFile(args.path, 'utf8');
      // 去掉 @import 变量文件（已前置注入），避免 sass 内部解析不到相对路径
      const cleaned = raw
        .replace(/@import\s+['"]@\/styles\/variables\.scss['"];?/g, '')
        .replace(/@import\s+['"]\.\/variables\.scss['"];?/g, '');
      const result = sass.compileString(`${variables}\n${cleaned}`, {
        syntax: args.path.endsWith('.sass') ? 'indented' : 'scss',
        quietDeps: true,
      });
      // Taro 的 pxtransform 在正式构建时把 rpx 按 750 设计稿转成 px；
      // 演示产物直接编译给浏览器，这里做同样的换算（1rpx = 0.5px @375px 视口）
      const css = result.css.replace(/(-?\d+(?:\.\d+)?)rpx/g, (_, n) => {
        return `${(parseFloat(n) / 2).toFixed(2).replace(/\.00$/, '').replace(/(\.\d)0$/, '$1')}px`;
      });
      return {
        contents: `(function(){ if(typeof document==='undefined')return; var s=document.createElement('style'); s.textContent=${JSON.stringify(
          css
        )}; document.head.appendChild(s); })();`,
        loader: 'js',
      };
    });
  },
};

async function main() {
  await mkdir(outDir, { recursive: true });

  const result = await build({
    entryPoints: [resolve(root, 'scripts/entry-demo.tsx')],
    bundle: true,
    write: false,
    format: 'iife',
    platform: 'browser',
    target: ['es2017'],
    minify: true,
    legalComments: 'none',
    jsx: 'automatic',
    loader: { '.tsx': 'tsx', '.ts': 'ts' },
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
      API_MODE: JSON.stringify('mock'),
      API_BASE_URL: JSON.stringify(''),
    },
    plugins: [stylePlugin, aliasPlugin],
    logLevel: 'warning',
  });

  const js = result.outputFiles[0].text;

  // 引导脚本：toast 与图片压缩工具（原生 DOM，不依赖 React）
  const bootstrap = `
(function(){
  window.__ecToast = function (msg) {
    var el = document.getElementById('ec-toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(window.__ecToastTimer);
    window.__ecToastTimer = setTimeout(function () { el.classList.remove('show'); }, 1800);
  };
})();
window.__ecCompressImage = function (file) {
  return new Promise(function (resolve, reject) {
    var reader = new FileReader();
    reader.onload = function () {
      var img = new Image();
      img.onload = function () {
        var max = 1280, w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w >= h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        var canvas = document.createElement('canvas');
        canvas.width = w; canvas.height = h;
        var ctx = canvas.getContext('2d');
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, w, h);
        ctx.drawImage(img, 0, 0, w, h);
        try { resolve(canvas.toDataURL('image/jpeg', 0.8)); }
        catch (e) { resolve(reader.result); }
      };
      img.onerror = function () { reject(new Error('decode')); };
      img.src = reader.result;
    };
    reader.onerror = function () { reject(new Error('read')); };
    reader.readAsDataURL(file);
  });
};
`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
<link rel="icon" href="data:," />
<title>频道 · 动态</title>
<style>
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  body { margin: 0; background: #faf5f0; }
  #app { width: 100%; max-width: 560px; margin: 0 auto; min-height: 100vh; background: #faf5f0; }
  img { max-width: 100%; height: auto; }
  /* 大图预览灯箱：原生 DOM 构建，仅以空字符串清空容器，动态内容用 DOM API 注入 */
  .ec-lightbox { display: none; position: fixed; inset: 0; z-index: 1000; align-items: center; justify-content: center; opacity: 0; transition: opacity .24s ease; }
  .ec-lightbox.show { opacity: 1; }
  .ec-lightbox__mask { position: absolute; inset: 0; background: rgba(18,12,8,.94); }
  .ec-lightbox__bar { position: absolute; top: 0; left: 0; right: 0; display: flex; align-items: center; justify-content: space-between; padding: 16px 18px; z-index: 3; }
  .ec-lightbox__close { width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,.16); display: flex; align-items: center; justify-content: center; font-size: 26px; color: #fff; line-height: 1; cursor: pointer; }
  .ec-lightbox__count { font-size: 15px; color: #fff; letter-spacing: 1px; }
  .ec-lightbox__stage { position: relative; z-index: 2; width: 90vw; max-width: 680px; max-height: 82vh; display: flex; align-items: center; justify-content: center; }
  .ec-lightbox__img { max-width: 100%; max-height: 82vh; border-radius: 10px; box-shadow: 0 12px 40px rgba(0,0,0,.4); background: #fff; }
  .ec-lightbox__nav { position: absolute; top: 50%; transform: translateY(-50%); z-index: 3; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,.16); color: #fff; display: flex; align-items: center; justify-content: center; font-size: 30px; cursor: pointer; }
  .ec-lightbox__prev { left: 12px; }
  .ec-lightbox__next { right: 12px; }
  .ec-toast {
    position: fixed; left: 50%; top: 40%; transform: translate(-50%, -50%);
    background: rgba(43, 33, 24, 0.88); color: #fff; font-size: 17px; line-height: 1.6;
    padding: 20px 32px; border-radius: 14px; max-width: 76vw; text-align: center;
    opacity: 0; pointer-events: none; transition: opacity .2s ease; z-index: 999;
  }
  .ec-toast.show { opacity: 1; }
  /* 模态弹窗（showModal 原生 DOM 实现） */
  .ec-modal-mask { position: fixed; inset: 0; z-index: 1100; display: flex; align-items: center; justify-content: center; background: rgba(18,12,8,.5); opacity: 0; animation: ec-modal-in .18s ease forwards; }
  @keyframes ec-modal-in { to { opacity: 1; } }
  .ec-modal { width: 78%; max-width: 320px; background: #fff; border-radius: 18px; padding: 26px 22px 18px; box-shadow: 0 20px 60px rgba(0,0,0,.28); text-align: center; }
  .ec-modal__title { font-size: 18px; font-weight: 700; color: #2b2118; }
  .ec-modal__content { font-size: 15px; color: #6b5a4c; line-height: 1.6; margin-top: 12px; }
  .ec-modal__btns { display: flex; gap: 12px; margin-top: 22px; }
  .ec-modal__btn { flex: 1; min-height: 44px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 16px; cursor: pointer; }
  .ec-modal__btn--cancel { background: #f3ece4; color: #7a6a5c; }
  .ec-modal__btn--confirm { background: linear-gradient(125deg,#ef7d33,#e15a3f); color: #fff; font-weight: 600; }
</style>
</head>
<body>
<div id="app"></div>
<div class="ec-toast" id="ec-toast"></div>
<script>${bootstrap}</script>
<script>${js}</script>
</body>
</html>
`;

  await writeFile(outFile, html, 'utf8');
  console.log(`已生成演示产物: ${outFile}`);
}

main().catch((e) => {
  console.error('构建失败:', e);
  process.exit(1);
});
