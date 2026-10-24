/* Taro 跨端组件的最小 Web 实现（真实模块，便于 esbuild 正确解析 import 'react'） */
import React from 'react';

const h = (tag, props, children) => React.createElement(tag, props, children);

// Taro 用 className 表示类名，需要原样透传给 DOM；其余自定义属性（onClick 等）直接展开
function mapProps(p, skip) {
  const out = {};
  for (const k of Object.keys(p)) {
    if (k === 'children' || (skip && skip.indexOf(k) >= 0)) continue;
    // Taro 事件用 onInput/onChange，转成原生小写事件名
    if (k === 'onInput') { out.onInput = p.onInput; continue; }
    if (k === 'onConfirm') { out.onConfirm = p.onConfirm; continue; }
    if (k === 'lazyLoad') continue;
    out[k] = p[k];
  }
  return out;
}

// 用 forwardRef，让业务里挂在 View 上的 ref 能透传到真实 DOM（如聊天页滚动锚点）
export const View = React.forwardRef((p, ref) => h('div', { ...mapProps(p), ref }, p.children));
export const Text = (p) => h('span', mapProps(p), p.children);
export const Image = (p) =>
  h('img', {
    src: p.src,
    className: p.className,
    style: p.style,
    loading: p.lazyLoad ? 'lazy' : 'eager',
    alt: '',
  }, null);
export const Input = (p) =>
  h('input', {
    className: p.className,
    style: p.style,
    value: p.value,
    maxLength: p.maxlength,
    placeholder: p.placeholder,
    onInput: (e) => p.onInput && p.onInput({ detail: { value: e.target.value } }),
    onConfirm: (e) => p.onConfirm && p.onConfirm({ detail: { value: e.target.value } }),
  });
export const Textarea = (p) =>
  h('textarea', {
    className: p.className,
    style: p.style,
    value: p.value,
    maxLength: p.maxlength,
    placeholder: p.placeholder,
    onInput: (e) => p.onInput && p.onInput({ detail: { value: e.target.value } }),
  });
