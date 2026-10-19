export type Project = { name: string; url: string; desc: string };
export type Group = { title: string; short: string; items: Project[] };
export type Entry = Project & { cat: string; short: string; no: string; sym: string; host: string };

const p = (name: string, url: string, desc: string): Project => ({ name, url, desc });

export const groups: Group[] = [
  { title: '站点', short: '站点', items: [
    p('Blog', 'https://xihale.top', '个人博客'),
    p('诗', 'https://poetry.xeed.ink', '12.5 万首中国诗选，一屏一首'),
    p('毛泽东选集', 'https://github.com/xihale/mao', '静态阅读站与 EPUB 电子书构建'),
    p('ShareBin', 'https://share.xihale.top', '粘贴即可生成分享链接'),
    p('status-lite', 'https://status.fg.xihale.top', '轻量服务器状态页'),
  ]},
  { title: '网络', short: '网络', items: [
    p('snirect', 'https://github.com/xihale/snirect', '绕过 SNI 阻断的透明代理'),
    p('snirectAndroid', 'https://github.com/xihale/snirectAndroid', 'snirect 的 Android 端'),
    p('DropRelay', 'https://drop.fg.xihale.top', '内网点对点文件直传'),
    p('kc-go', 'https://github.com/xihale/kc-go', 'OpenWrt 网络保活与 DDNS 更新'),
    p('Syndi', 'https://github.com/xihale/syndi', 'RSSHub 的 Go 重写'),
  ]},
  { title: '工具', short: '工具', items: [
    p('unNCM', 'https://unncm.x.xeed.ink', '把 .ncm 还原为 mp3 或 flac 的 Android 工具'),
    p('Upix', 'https://upix.xihale.top', '分布式图像超分工具'),
    p('九宫格切图', 'http://ngimage.code.xihale.top', '图片加九宫格压线的小工具'),
    p('pinyin-pro demo', 'https://pinyin-pro-demo.code.xihale.top', '词语转拼音的演示'),
    p('SchedMate', 'https://sched.xeed.ink', '课表与排班的网页工具'),
  ]},
  { title: '编程', short: '编程', items: [
    p('Zig Playground', 'https://zp.xeed.ink', '浏览器内运行 Zig'),
    p('Ziglings Web', 'https://zlg.xeed.ink', 'Ziglings 习题的网页练习环境'),
    p('ziglang.cc', 'https://ziglang.cc', 'Zig 中文社区站点（本人有合并的贡献）'),
    p('paper4gdut', 'https://github.com/xihale/paper4gdut', '广东工业大学本科毕业论文 Typst 模板'),
  ]},
  { title: '自动化', short: '自动', items: [
    p('aur 发布流水线', 'https://github.com/xihale/aur', '上游发版后自动构建并推送 AUR'),
  ]},
  { title: '学习', short: '学习', items: [
    p('高等数学习题册', 'https://tongji-calc.xihale.top', '同济《高等数学》习题的 Typst 电子化'),
    p('中医体质辨识测评', 'https://tcm.xihale.top', '依《中医体质分类与判定》的 33 题单页应用'),
  ]},
  { title: '玩', short: '玩', items: [
    p('Fractal', 'https://fractal.code.xihale.top', 'Mandelbrot 与 Julia 集的交互探索'),
    p('Sudoku', 'https://sudoku.code.xihale.top', '数独解题页'),
    p('immerse', 'https://immerse.code.xihale.top', '专注氛围工具'),
  ]},
  { title: '参与', short: '参与', items: [
    p('EasyTier Android', 'https://github.com/xihale/easytier-android', 'EasyTier 的原生安卓客户端'),
    p('LightFrame 轻框', 'https://lightframe.vilinko.com', 'VilinkoStudio 协作项目'),
    p('LinkSheet 文档', 'https://linksheet.xihale.top', '安卓应用 LinkSheet 的文档站'),
  ]},
  { title: '早期', short: '早期', items: [
    p('Light（xlog）', 'http://xlog.code.xihale.top', '早期自建网志'),
    p('aword', 'https://aword.code.xihale.top', '早期「一言」实验页'),
  ]},
];

// 首字母做符号,重名时顺延取名字里的下一个字母,如 Blog / Books → Bl
const symbols = () => {
  const used = new Set<string>();
  return (name: string) => {
    if (!/^[A-Za-z]/.test(name)) return [...name][0];
    const letters = name.replace(/[^A-Za-z]/g, '');
    const first = letters[0].toUpperCase();
    for (const c of letters.slice(1)) {
      const s = first + c.toLowerCase();
      if (!used.has(s)) { used.add(s); return s; }
    }
    return first;
  };
};

export const entries: Entry[] = (() => {
  const sym = symbols();
  let k = 0;
  return groups.flatMap((g) =>
    g.items.map((it) => ({ ...it, cat: g.title, short: g.short, no: String(++k).padStart(2, '0'), sym: sym(it.name), host: new URL(it.url).host }))
  );
})();
