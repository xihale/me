export type Poem = { title: string; author: string; lines: string[] };
export type Quote = { text: string; from: string };

export const poems: Poem[] = [
  { title: '回答（节选）', author: '北岛', lines: ['卑鄙是卑鄙者的通行证', '高尚是高尚者的墓志铭', '看吧，在那镀金的天空中', '飘满了死者弯曲的倒影'] },
  { title: '无题', author: '鲁迅', lines: ['心事浩茫连广宇', '于无声处听惊雷'] },
];

export const quotes: Quote[] = [
  { text: '凡是过往，皆为序章。', from: '莎士比亚《暴风雨》' },
  { text: '生如夏花之绚烂，死如秋叶之静美。', from: '泰戈尔《飞鸟集》' },
];
