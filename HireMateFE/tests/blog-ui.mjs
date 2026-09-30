// Isolated browser fixtures; never connects to an application DB.
// Playwright may be supplied via NODE_PATH from the bundled runtime.
import { createRequire } from 'node:module';
import assert from 'node:assert/strict';
import { createServer } from 'vite';
const { chromium } = createRequire(import.meta.url)('playwright');
process.env.VITE_API_BASE_URL = 'http://127.0.0.1:44999/api';
const server = await createServer({ server: { host: '127.0.0.1', port: 4301, strictPort: true, open: false } });
await server.listen();
const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on('pageerror', error => console.error('PAGE ERROR:', error.message));
page.on('console', msg => { if (msg.type() === 'error') console.error('BROWSER:', msg.text()); });
let posts = [], creates = 0, updates = 0, failSave = false, failDelete = false, failCover = false, failPublic = false;
const check = (value, name) => { assert.ok(value, name); console.log(`PASS: ${name}`); };
const token = 'test.' + Buffer.from(JSON.stringify({ email: 'admin@gmail.com', role: 'Admin', exp: 4102444800 })).toString('base64url') + '.test';
await page.addInitScript(token => localStorage.setItem('hm_access_token', token), token);
await page.route('**/api/**', async route => {
  const req = route.request(), path = new URL(req.url()).pathname, method = req.method();
  if (new URL(req.url()).port !== '44999') return route.continue();
  const send = (status, data, message = '') => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify({ data, message }) });
  if (method === 'OPTIONS') return send(200, {});
  if (path === '/api/Auth/me') return send(200, { email: 'admin@gmail.com', roles: ['Admin'], fullName: 'Test Admin' });
  if (path === '/api/Admin/blog/categories') return send(200, ['Interview Tips']);
  if (path === '/api/Admin/blog' && method === 'GET') return send(200, posts);
  if (path === '/api/Admin/blog' && method === 'POST') {
    creates++; await new Promise(resolve => setTimeout(resolve, 200));
    if (failSave) return send(500, null, 'Test: lưu thất bại');
    const post = { ...req.postDataJSON(), id: 'test-id', author: 'Test Admin', coverUrl: null, createdAt: '2026-09-29T01:00:00Z', updatedAt: '2026-09-29T01:00:00Z', publishedAt: null };
    posts.push(post); return send(201, post);
  }
  if (path.endsWith('/cover')) {
    if (method === 'GET') return route.fulfill({ status: 200, contentType: 'image/png', body: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') });
    return failCover ? send(500, null, 'Test: ảnh thất bại') : send(200, posts[0]);
  }
  if (path === '/api/Admin/blog/test-id') {
    if (method === 'GET') return send(200, posts[0]);
    if (method === 'PUT') { updates++; posts[0] = { ...posts[0], ...req.postDataJSON() }; return send(200, posts[0]); }
    if (method === 'DELETE') { if (failDelete) return send(500, null, 'Test: xóa thất bại'); posts = []; return send(200, null); }
  }
  if (path === '/api/Blog') return failPublic ? send(500, null, 'Test: API thất bại') : send(200, posts.filter(p => p.isPublished));
  if (path.startsWith('/api/Blog/')) {
    const post = posts.find(p => p.slug === path.split('/').pop() && p.isPublished);
    return post ? send(200, post) : send(404, null, 'Không tìm thấy bài viết');
  }
  return send(200, {});
});
const button = name => page.getByRole('button', { name, exact: true });
try {
  await page.goto('http://127.0.0.1:4301/admin/blog');
  await page.getByText('Chưa có bài viết.', { exact: true }).waitFor();
  await button('Tạo bài viết mới').click();
  await page.getByLabel('Tiêu đề *', { exact: true }).fill('5 Mẹo Trả Lời Phỏng Vấn STAR');
  check(await page.getByLabel('Slug (URL) *').inputValue() === '5-meo-tra-loi-phong-van-star', 'Vietnamese auto slug');
  await page.getByLabel('Slug (URL) *').fill('custom-slug');
  await page.getByLabel('Tiêu đề *', { exact: true }).fill('Bài kiểm thử');
  check(await page.getByLabel('Slug (URL) *').inputValue() === 'custom-slug', 'Manual slug survives title edit');
  const xss = '<script>window.blogXss=1</script><img src=x onerror="window.blogXss=1"><a href="javascript:alert(1)">test</a>';
  await page.getByLabel('Nội dung *', { exact: true }).fill(xss);
  await button('Xem trước').click();
  check(creates === 0 && updates === 0, 'Preview performs no writes');
  check((await page.locator('article').innerText()).includes(xss) && await page.evaluate(() => window.blogXss) === undefined, 'Preview escapes script/event/javascript URL');
  await button('Quay lại soạn thảo').click();
  failSave = true;
  await button('Lưu nháp').click();
  await page.getByRole('alert').filter({ hasText: 'Test: lưu thất bại' }).waitFor();
  check(posts.length === 0 && await page.getByRole('dialog').isVisible(), 'API failure keeps form and no fake success');
  failSave = false;
  await button('Lưu nháp').evaluate(b => { b.click(); b.click(); });
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  check(creates === 2 && posts.length === 1, 'Double click sends only one additional create');
  await button('Chỉnh sửa / Trạng thái').click();
  await page.getByLabel('Mô tả ngắn', { exact: true }).fill('Updated summary');
  await button('Xuất bản').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  check(posts.length === 1 && posts[0].summary === 'Updated summary' && updates === 1 && creates === 2, 'Edit updates via PUT without INSERT');
  await button('Chỉnh sửa / Trạng thái').click();
  failCover = true;
  await page.getByLabel('Ảnh đại diện', { exact: true }).setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aXioAAAAASUVORK5CYII=', 'base64') });
  await button('Xuất bản').click();
  await page.getByRole('alert').filter({ hasText: 'Nội dung đã lưu' }).waitFor();
  failCover = false;
  await button('Xuất bản').click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  check(creates === 2 && posts.length === 1 && updates === 3, 'Cover retry preserves saved ID');
  const savedTitle = posts[0].title;
  posts[0].title = 'T'.repeat(200);
  posts[0].summary = 'S'.repeat(500);
  posts[0].coverUrl = '/api/Blog/custom-slug/cover';
  for (const [width, height] of [[1280, 900], [768, 1024], [390, 844]]) {
    await page.setViewportSize({ width, height });
    await page.goto('http://127.0.0.1:4301/admin/blog');
    await button('Chỉnh sửa / Trạng thái').waitFor();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Admin long-title layout fits ${width}px`);
    await button('Chỉnh sửa / Trạng thái').click();
    const modal = page.getByRole('dialog');
    const box = await modal.boundingBox();
    check(box.x >= 0 && box.y >= 0 && box.x + box.width <= width + 1 && box.y + box.height <= height + 1, `Modal fits ${width}px viewport`);
    check(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1), `Modal content has no horizontal overflow ${width}px`);
    await button('Xuất bản').scrollIntoViewIfNeeded();
    const action = await button('Xuất bản').boundingBox();
    check(action.y >= 0 && action.y + action.height <= height + 1, `Publish action reachable ${width}px`);
    await button('Đóng').click();
    await page.goto('http://127.0.0.1:4301/blog');
    await page.locator('article').waitFor();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Public card long-title layout fits ${width}px`);
    await page.goto('http://127.0.0.1:4301/blog/custom-slug');
    await page.locator('article').waitFor();
    check(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `Public detail long-title layout fits ${width}px`);
    const imageBox = await page.locator('article img').boundingBox();
    check(imageBox && imageBox.width <= width && imageBox.height <= 360, `Cover constrained ${width}px`);
  }
  posts[0].title = savedTitle;
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.goto('http://127.0.0.1:4301/blog/custom-slug');
  await page.locator('article').waitFor();
  check((await page.locator('article').innerText()).includes(xss) && await page.evaluate(() => window.blogXss) === undefined, 'Public body escapes XSS');
  await page.goto('http://127.0.0.1:4301/blog/missing');
  await page.getByRole('heading', { name: 'Không tìm thấy bài viết (404)' }).waitFor();
  check(await page.locator('article').count() === 0, '404 has no fake article');
  failPublic = true;
  await page.goto('http://127.0.0.1:4301/blog');
  await page.getByRole('alert').filter({ hasText: 'Test: API thất bại' }).waitFor();
  check(await page.locator('article').count() === 0, 'API error has no fallback cards');
  await page.goto('http://127.0.0.1:4301/admin/blog');
  await button('Xóa').waitFor();
  page.on('dialog', d => d.accept()); failDelete = true;
  await button('Xóa').click();
  await page.getByRole('alert').filter({ hasText: 'Test: xóa thất bại' }).waitFor();
  check(posts.length === 1 && await button('Xóa').count() === 1, 'Delete failure retains article');
  failDelete = false;
  await button('Xóa').click();
  await page.getByText('Chưa có bài viết.', { exact: true }).waitFor();
  check(posts.length === 0, 'Delete removes UI after success');
} catch (error) {
  console.error(await page.locator('[role="dialog"]').evaluateAll(dialogs => dialogs.flatMap(d => Array.from(d.querySelectorAll('*')).filter(e => e.getBoundingClientRect().right > d.getBoundingClientRect().right).map(e => ({ tag: e.tagName, id: e.id, width: e.getBoundingClientRect().width, right: e.getBoundingClientRect().right })))));
  throw error;
}
finally { await browser.close(); await server.close(); }
