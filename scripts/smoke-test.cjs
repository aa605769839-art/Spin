/* 端到端冒烟测试：频道全流程 + 既有回归项
 * 流程覆盖：引导态 → 创建频道 → 公告管理 → 群组置顶/成员 → 点头像私信 → 3 条上限 → 拒收 → 切换频道
 */
const { chromium } = require('/workspace/elder-community/node_modules/playwright');

const URL = process.env.URL || 'http://localhost:8099/elder-community.html';

function log(ok, msg) {
  console.log(`${ok ? 'PASS' : 'FAIL'} · ${msg}`);
  if (!ok) process.exitCode = 1;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch({
    args: ['--no-sandbox'],
    executablePath: '/root/.cache/ms-playwright/chromium-1208/chrome-linux64/chrome',
  });
  // 全新上下文 = 干净 localStorage，模拟「新用户无频道」
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(m.text());
  });

  await page.goto(URL, { waitUntil: 'networkidle' });
  await sleep(900);

  /* ============ A) 引导态（无频道） ============ */
  log((await page.locator('.ec-tabbar').count()) === 1, '首屏 tabbar 可见');
  const activeTab = await page.locator('.ec-tab.is-active .ec-tab__label').first().textContent();
  log(activeTab && activeTab.trim() === '动态', `默认高亮「动态」(=${activeTab})`);
  log((await page.locator('.ec-tab').count()) === 3, '底部共 3 个 Tab');
  log((await page.locator('.feed--onboard').count()) === 1, '无频道时展示引导态');
  log((await page.locator('.onboard__btn--primary').count()) === 1, '引导态含「创建频道」入口');

  /* ============ B) 创建频道 ============ */
  await page.locator('.onboard__btn--primary').click();
  await page.waitForSelector('.channel-create', { timeout: 5000 });
  await sleep(300);
  await page.locator('.form__input').fill('阳光花园邻里');
  await page.locator('.form__submit').click();
  await page.waitForSelector('.feed:not(.feed--onboard)', { timeout: 5000 });
  await sleep(700);
  log((await page.locator('.feed--onboard').count()) === 0, '创建后离开引导态进入动态');
  log((await page.locator('.feed__switch').count()) === 1, '动态页含「切换频道」入口');
  const noticeCount = await page.locator('.notice-card').count();
  log(noticeCount >= 3, `公告区默认生成 ${noticeCount} 条（=3）`);
  log((await page.locator('.feed__manage').count()) === 1, '创建者可见「管理」按钮');
  log((await page.locator('.feed__avatar').count()) === 0, '首页顶部无个人头像');
  log((await page.locator('.post-stats__icon--like').first().textContent())?.match(/[♥♡]/) != null, '点赞使用爱心图标');
  log((await page.locator('.post-stats__item--view').count()) >= 1, '动态列表展示浏览量(小眼镜)');

  /* ============ C) 公告管理（创建者） ============ */
  await page.locator('.feed__manage').click();
  await page.waitForSelector('.ann-manage', { timeout: 5000 });
  await sleep(400);
  const annItems = await page.locator('.ann-manage__item').count();
  log(annItems >= 3, `公告管理列表渲染 ${annItems} 条`);
  await page.locator('.navbar__back').click();
  await sleep(400);
  log((await page.locator('.feed').count()) === 1, '从公告管理返回动态');

  /* ============ D) 消息列表：群组置顶 + 消息提醒 ============ */
  await page.locator('.ec-tab', { hasText: '私信' }).click();
  await page.waitForSelector('.messages', { timeout: 5000 });
  await sleep(500);
  log((await page.locator('.msg-item--group').count()) === 1, '存在群组会话（公共群聊）');
  log((await page.locator('.msg-item--group .msg-item__group-icon').count()) === 1, '群组用 👥 图标');
  const groupCountText = await page.locator('.msg-item--group .msg-item__count').first().textContent();
  log(!!groupCountText && groupCountText.includes('人'), `群组显示成员数 (${groupCountText})`);
  log((await page.locator('.msg-item--system').count()) === 1, '存在「消息提醒」系统会话');
  const firstKind = await page.locator('.msg-item').first().getAttribute('class');
  log(firstKind && firstKind.includes('msg-item--group'), '群组在会话列表最前（置顶优先）');

  /* ============ E) 群组聊天 → 点头像发起私信 ============ */
  await page.locator('.msg-item--group').click();
  await page.waitForSelector('.chat', { timeout: 5000 });
  await sleep(500);
  const memberCount = await page.locator('.chat__member').count();
  log(memberCount >= 2, `群组头像墙渲染 ${memberCount} 人`);
  // 点第 2 个成员（非自己）发起私信
  await page.locator('.chat__member').nth(1).click();
  await page.waitForSelector('.chat', { timeout: 5000 });
  await sleep(500);
  const dmConvName = await page.locator('.navbar__title').first().textContent();
  log(dmConvName && dmConvName !== '群聊' && dmConvName !== '消息提醒', `点头像进入私信会话 (${dmConvName})`);
  log((await page.locator('.chat__input').count()) === 1, '私信会话含输入框');

  /* ============ F) 私信 3 条上限规则 ============ */
  const beforeBubbles = await page.locator('.bubble').count();
  for (let i = 1; i <= 3; i++) {
    await page.locator('.chat__input').fill(`测试私信${i}`);
    await page.locator('.chat__send').click();
    await sleep(450);
  }
  const afterBubbles = await page.locator('.bubble').count();
  log(afterBubbles >= beforeBubbles + 3, `连续发送 3 条成功 (${beforeBubbles} → ${afterBubbles})`);
  const hintText = (await page.locator('.chat__dm-hint').first().textContent()) || '';
  log(hintText.includes('3 条'), `第 3 条后触发上限提示 (=${hintText.trim()})`);
  log((await page.locator('.chat__send.is-disabled').count()) === 1, '达上限后发送按钮置灰（不可再发）');

  /* ============ G) 拒收规则 ============ */
  await page.locator('.navbar__back').click();
  await sleep(400);
  await page.locator('.chat__member').nth(2).click();
  await page.waitForSelector('.chat', { timeout: 5000 });
  await sleep(500);
  log((await page.locator('.chat__reject').count()) === 1, '私信页含「拒收」入口');
  await page.locator('.chat__reject').click();
  await page.waitForSelector('.ec-modal-mask', { timeout: 3000 });
  await sleep(200);
  await page.locator('.ec-modal__btn--confirm').click();
  await sleep(400);
  const rejectHint = (await page.locator('.chat__dm-hint').first().textContent()) || '';
  log(rejectHint.includes('拒收'), `拒收后提示拦截 (=${rejectHint.trim()})`);
  log((await page.locator('.chat__send.is-disabled').count()) === 1, '拒收后发送按钮置灰');

  /* 返回群组，再回消息列表 */
  await page.locator('.navbar__back').click();
  await sleep(300);
  await page.locator('.navbar__back').click();
  await sleep(300);

  /* ============ H) 我的 → 切换频道 ============ */
  await page.locator('.ec-tab', { hasText: '我的' }).click();
  await page.waitForSelector('.mine', { timeout: 5000 });
  await sleep(500);
  log((await page.locator('.mine__profile').count()) === 1, '我的页含个人名片');
  log((await page.locator('.mine__switch').count()) === 1, '我的页含「切换频道」入口');
  log((await page.locator('.mine__manage').count()) === 1, '创建者可见「管理公告」入口');
  await page.locator('.mine__switch').click();
  await page.waitForSelector('.channel-switch', { timeout: 5000 });
  await sleep(400);
  const switchItems = await page.locator('.switch__item').count();
  log(switchItems === 1, `切换页列出 ${switchItems} 个频道`);
  log((await page.locator('.switch__current-tag').count()) === 1, '当前频道有「当前」标记');
  await page.locator('.navbar__back').click();
  await sleep(300);

  /* ============ I) 邀请链接跨浏览器加入 ============ */
  // 回到切换频道页，复制当前频道的邀请链接
  await page.locator('.mine__switch').click();
  await page.waitForSelector('.channel-switch', { timeout: 5000 });
  await sleep(400);
  log((await page.locator('.switch__invite-btn').count()) === 1, '切换页含「复制邀请链接」入口');
  await page.locator('.switch__invite-btn').click();
  await sleep(300);
  const inviteUrl = await page.evaluate(() => window.__lastClipboard || '');
  log(inviteUrl.includes('invite='), `已生成邀请链接 (=${inviteUrl.slice(0, 46)}…)`);

  // 全新上下文 = 另一个人打开邀请链接
  const ctx2 = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page2 = await ctx2.newPage();
  const errors2 = [];
  page2.on('pageerror', (e) => errors2.push(String(e)));
  page2.on('console', (m) => { if (m.type() === 'error') errors2.push(m.text()); });
  await page2.goto(inviteUrl, { waitUntil: 'networkidle' });
  await sleep(900);
  log((await page2.locator('.channel-join').count()) === 1, '带邀请参数启动直接渲染「加入频道」页（全屏）');
  const joinTitle = await page2.locator('.join__title').first().textContent();
  log(!!joinTitle && joinTitle.includes('阳光花园邻里'), `加入页显示频道名 (=${joinTitle})`);
  await page2.locator('.join__input').nth(0).fill('赵大海');
  await page2.locator('.join__input').nth(1).fill('上海市 浦东新区');
  await page2.locator('.join__submit').click();
  await page2.waitForSelector('.feed:not(.feed--onboard)', { timeout: 5000 });
  await sleep(700);
  log((await page2.locator('.feed--onboard').count()) === 0, '新用户通过邀请成功加入频道');
  await page2.locator('.ec-tab', { hasText: '我的' }).click();
  await sleep(400);
  const joinedName = await page2.locator('.mine__profile-name').first().textContent();
  log(joinedName && joinedName.includes('赵大海'), `新用户资料独立保存 (=${joinedName})`);
  log(errors2.length === 0, `邀请加入流程无报错 (${errors2.length} 条)`);
  await ctx2.close();

  /* ============ J) 运行时无报错 ============ */
  log(errors.length === 0, `运行时无 JS 报错 (${errors.length} 条)` + (errors.length ? `: ${errors.slice(0, 3).join(' | ')}` : ''));

  await browser.close();
  console.log(process.exitCode ? '\n❌ 冒烟测试存在失败项' : '\n✅ 全部冒烟测试通过');
})().catch((e) => {
  console.error('测试异常:', e);
  process.exit(1);
});
