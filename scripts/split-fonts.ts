// 把 Noto Serif SC 切成 unicode-range 分片，浏览器只下载页面实际用到的分片。
// 输入复用 @fontsource/noto-serif-sc 里的完整 chinese-simplified woff2，无需额外下载字体。
// 用法：bun run fonts
import { fontSplit } from 'cn-font-split';
import { rmSync } from 'node:fs';

const weights = [300, 500] as const;
const src = (w: number) =>
  `node_modules/@fontsource/noto-serif-sc/files/noto-serif-sc-chinese-simplified-${w}-normal.woff2`;

for (const w of weights) {
  await fontSplit({
    input: src(w),
    outDir: `public/fonts/noto-serif-sc/${w}`,
    css: { fontFamily: 'Noto Serif SC', fontWeight: String(w), fontDisplay: 'swap' },
    targetType: 'woff2',
    testHtml: false,
    reporter: false,
    silent: true,
  });
  console.log(`weight ${w}: done`);
  rmSync(`public/fonts/noto-serif-sc/${w}/index.proto`);
}
