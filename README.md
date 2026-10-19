# me

xihale 的个人主页 —— Astro 静态站点。现代极简，中性色打底，蓝绿色点睛；首页背景是一个会缓慢漂移、随指针扭动的 Julia 集（WebGL 手写，支持 `prefers-reduced-motion`），窄屏下画布旋转 90°，视角回到画面正中，按横构图取景；触屏上不用指针事件，长按画面就加速漂移。

## 内容与素材

- **展柜**：纯 SVG 线稿，7 件现役设备按同一比例摆在一条台面上（`src/components/Cabinet.astro`）。手机显示实时时间，笔记本在打字，平板上是数独，Kindle 上是《静夜思》；悬停或点按查看型号。手机上一件一屏、左右滑动，标题跟随居中那一件。
- **项目**：元素周期表式的方格索引，可按类别筛选，悬停浮出截图与简介；手机上收成两列（窄屏平板三列）的卡片，筛选掉的项目同色变淡。
- **项目缩略图**：`public/img/shots/<域名 slug>.webp`，统一 720×450、WebP（q≈80，`-strip`），没有图的项目在浮层里显示符号方块。
- **番剧/书/游戏/专辑封面**：Bangumi，`public/img/covers/<subject id>.webp`。
- **电影**：豆瓣「看过」导出，`src/data/movies.ts`（110 部，星级 0–5 + 标记日期 + 短评）；封面在 `public/img/movies/<豆瓣 subject id>.webp`。首页「清单」只展示四星以上的预览与一张「全部」卡片，完整分档列表与短评在子页 `/movies`。
- **书**：Bangumi 优先，Bangumi 没有条目的用豆瓣「读过」补充（`src/data/books.ts` 合并两源；豆瓣独有的封面在 `public/img/books/<豆瓣 subject id>.webp`，星级 ×2 折成十分制）。
- **清单子页**：`/bangumi` 收录全部书（32）、游戏（6）、专辑（13）（未评分显示 `—`）；首页每格只放评分最高的 12 部，其余走「更多」卡片。
- **音乐**：网易云单曲，`src/data/music.ts`；封面在 `public/img/music/<song id>.webp`。
- **字体**：Noto Serif SC 每个字重用 cn-font-split 预切成 86 个 `unicode-range` 分片（`public/fonts/noto-serif-sc/<字重>/`，`npm run fonts` 重新生成），浏览器只下载页面实际用到的分片；拉丁字符仍走 @fontsource 的小子集。

## 开发

```sh
npm install
npm run dev      # http://localhost:4321
npm run build    # 输出到 dist/
npm run fonts    # 重新生成 Noto Serif SC 分片（public/fonts/，改动字体或分片参数后跑一次）
```

## 内容

- `src/data/projects.ts`：项目列表（分组、链接、简介）
- `src/data/status.ts`：设备与 Bangumi 评分清单（番剧 40 / 书 26 / 游戏 6 / 专辑 13，取自 bgm.tv collections API 的「看过」）
- `src/data/music.ts`：网易云单曲与歌单链接
- `src/data/movies.ts`：豆瓣电影（星级、日期、短评）
- `src/data/books.ts`：书/游戏/专辑清单（合并 Bangumi 与豆瓣，统一 `Entry` 结构）
- `src/pages/index.astro`：首页结构与文案
- `src/pages/movies/index.astro`：电影分档子页
- `src/pages/bangumi/index.astro`：书/游戏/专辑完整子页
- `src/components/Cabinet.astro`：设备展柜
- `src/components/Header.astro`：页头（各页共用）
- `src/scripts/julia.ts`：首屏背景着色器
- `src/scripts/ui.ts`：展柜与项目索引的交互
- `src/scripts/chrome.ts`：主题切换、滚动高亮、入场动画

## 部署

自有域名/Vercel/Cloudflare Pages：默认 `base` 为 `/`，直接构建即可，可用 `SITE` 环境变量设置站点地址。
GitHub Pages：`.github/workflows/deploy.yml` 已按 `https://xihale.github.io/me` 配置（`BASE=/me`），在仓库 Settings → Pages 选择 GitHub Actions 即可。
