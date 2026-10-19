import { defineConfig } from 'astro/config';

// 部署到子路径（如 GitHub Pages 的 /me）时设置 BASE，自有域名保持默认即可。
export default defineConfig({
  site: process.env.SITE || 'https://xihale.top',
  base: process.env.BASE || '/',
});
