export type Project = { name: string; url: string; desc: string; archived?: boolean };
export type Group = { title: string; short: string; items: Project[] };

const p = (name: string, url: string, desc: string, archived = false): Project => ({ name, url, desc, ...(archived ? { archived } : {}) });

export const groups: Group[] = [
  { title: '阅读', short: '阅读', items: [
    p('毛泽东选集', 'https://github.com/xihale/mao', '静态阅读站与 EPUB 电子书构建'),
    p('The Disordered Mind 中文电子版', 'https://github.com/xihale/The-Disordered-Mind', 'Markdown 排印，产出 PDF、EPUB 与 HTML'),
    p('诗（白卷·中国诗选）', 'https://poetry.xeed.ink', '12.5 万首中国诗选，一屏一首'),
  ]},
  { title: '学习', short: '学习', items: [
    p('高等数学习题册', 'https://tongji-calc.xihale.top', '同济《高等数学》习题的 Typst 电子化'),
    p('中医体质辨识测评', 'https://tcm.xihale.top', '依《中医体质分类与判定》的 33 题单页应用'),
  ]},
  { title: '写作', short: '写作', items: [
    p('种墨', 'https://xihale.top', '个人博客'),
    p('paper4gdut', 'https://github.com/xihale/paper4gdut', '广东工业大学本科毕业论文 Typst 模板'),
  ]},
  { title: '探索', short: '探索', items: [
    p('aur 发布流水线', 'https://github.com/xihale/aur', '上游发版后自动构建并推送 AUR'),
    p('glm 配额守护', 'https://github.com/xihale/glm', 'GLM 与 Gemini 配额监控与激活'),
    p('Fractal', 'https://fractal.code.xihale.top', 'Mandelbrot 与 Julia 集的交互探索'),
    p('SchedMate', 'https://sched.xeed.ink', '课表与排班的网页工具'),
  ]},
  { title: '工具与存档', short: '工具', items: [
    p('DropRelay', 'https://drop.fg.xihale.top', '内网点对点文件直传'),
    p('fuckview', 'https://github.com/xihale/fuckview', 'AnyView 题库的自动化工作流'),
    p('kc-go', 'https://github.com/xihale/kc-go', 'OpenWrt 网络保活与 DDNS 更新'),
    p('九宫格切图', 'http://ngimage.code.xihale.top', '图片加九宫格压线的小工具'),
    p('status-lite', 'https://status.fg.xihale.top', '轻量服务器状态页'),
    p('snirect', 'https://github.com/xihale/snirect', '绕过 SNI 阻断的透明代理'),
    p('snirectAndroid', 'https://github.com/xihale/snirectAndroid', 'snirect 的 Android 端'),
    p('Light（xlog）', 'http://xlog.code.xihale.top', '早期自建网志', true),
    p('aword', 'https://aword.code.xihale.top', '早期「一言」实验页', true),
  ]},
  { title: '分享', short: '分享', items: [
    p('ShareBin', 'https://share.xihale.top', '粘贴即可生成分享链接'),
    p('Syndi', 'https://github.com/xihale/syndi', 'RSSHub 的 Go 重写'),
    p('pinyin-pro demo', 'https://pinyin-pro-demo.code.xihale.top', '词语转拼音的演示'),
  ]},
  { title: '媒体', short: '媒体', items: [
    p('unNCM', 'https://unncm.x.xeed.ink', '把 .ncm 还原为 mp3 或 flac 的 Android 工具'),
    p('Upix', 'https://upix.xihale.top', '分布式图像超分工具'),
  ]},
  { title: '编程', short: '编程', items: [
    p('Zig Playground', 'https://zp.xeed.ink', '浏览器内运行 Zig'),
    p('Ziglings Web', 'https://zlg.xeed.ink', 'Ziglings 习题的网页练习环境'),
    p('ziglang.cc', 'https://ziglang.cc', 'Zig 中文社区站点（本人有合并的贡献）'),
  ]},
  { title: '练习与专注', short: '练习', items: [
    p('Sudoku', 'https://sudoku.code.xihale.top', '数独解题页'),
    p('immerse', 'https://immerse.code.xihale.top', '专注氛围工具'),
  ]},
  { title: '参与或借用', short: '参与', items: [
    p('EasyTier Android', 'https://github.com/xihale/easytier-android', 'EasyTier 的原生安卓客户端'),
    p('forgecode', 'https://github.com/xihale/forgecode', 'AI 编程 CLI 的分支'),
    p('LightFrame 轻框', 'https://lightframe.vilinko.com', 'VilinkoStudio 协作项目'),
    p('LinkSheet 文档', 'https://linksheet.xihale.top', '安卓应用 LinkSheet 的文档站'),
  ]},
];
