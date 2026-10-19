// 公有领域藏品：芝加哥艺术博物馆（Art Institute of Chicago）开放获取
export type Art = { id: number; zh?: string; en: string; artist: string; date: string; h: number };
export const art: Art[] = [
  { id: 145677, zh: '林堂诗思图', en: 'Poetic Thoughts in a Forest Pavilion', artist: '倪瓒 Ni Zan', date: '约 1371', h: 2075 },
  { id: 61483, zh: '林麓幽居图', en: 'Quiet Life in a Wooded Glen', artist: '王蒙 Wang Meng', date: '1361', h: 2135 },
  { id: 13954, zh: '雪夜访戴图', en: 'Visiting Dai Kui on a Snowy Night', artist: '夏葵 Xia Kui', date: '15 世纪', h: 1625 },
  { id: 79716, en: 'Flight of Geese', artist: '佚名 Unknown', date: '14 世纪', h: 1435 },
];
export const scroll: Art = { id: 68041, en: 'Bamboo-Covered Stream in Spring Rain', artist: '夏昶 Xia Chang', date: '1441', h: 294 };
