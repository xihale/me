export type Feed = { name: string; url: string; desc: string; by: string };
export type FeedGroup = { title: string; items: Feed[] };

const f = (name: string, url: string, desc: string, by: string): Feed => ({ name, url, desc, by });

export const feedGroups: FeedGroup[] = [
  { title: '博客', items: [
    f('antfu.me', 'https://antfu.me', 'Anthony Fu,Vue/Vite 核心团队,写前端工程与开源', '博客'),
    f('评论尸', 'https://1q43.blog/', '互联网与社会的中文写作,评论尸的自留地', '博客'),
    f('最小可读', 'https://mvread.blog/', '基本无害,可能有用', '博客'),
    f('心的道理', 'https://stephenleng.com/cn/', '思想史、历史哲学与人性理论', '博客'),
    f('寥雪峰的周报', 'https://www.tianxianzi.me/', '寥雪峰的个人周报', '博客'),
  ]},
];
