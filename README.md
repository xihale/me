# me

xihale 的个人主页 —— Astro 静态站点。现代极简，中性色打底，蓝绿色点睛；首页背景是一个会缓慢漂移、随指针扭动的 Julia 集（WebGL 手写，支持 `prefers-reduced-motion`）。

## 内容与素材

- **展柜**：three.js 渲染的 glTF 玻璃龙（Stanford Dragon，Khronos glTF Sample Assets，已去掉背景布并压缩到 2.7 MB，滚动到可视区才加载），背后的等高线按明暗主题实时重绘。
- **古画**：Art Institute of Chicago 开放获取的公有领域藏品。
- **项目缩略图**：`public/img/shots/<域名 slug>.webp`，没有图的项目自动显示首字母方块。
- **番剧/书/游戏封面**：Bangumi，`public/img/covers/<subject id>.webp`。

## 开发

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # 输出到 dist/
```

## 内容

- `src/data/projects.ts`：项目列表（分组、链接、简介、是否存档）
- `src/data/status.ts`：设备与 Bangumi 评分清单
- `src/pages/index.astro`：页面结构与文案
- `src/data/art.ts`：古画藏品
- `src/scripts/julia.ts`：首屏背景着色器
- `src/scripts/model.ts`：3D 模型查看器

## 部署

自有域名/Vercel/Cloudflare Pages：默认 `base` 为 `/`，直接构建即可，可用 `SITE` 环境变量设置站点地址。
GitHub Pages：`.github/workflows/deploy.yml` 已按 `https://xihale.github.io/me` 配置（`BASE=/me`），在仓库 Settings → Pages 选择 GitHub Actions 即可。
