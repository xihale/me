import { asset } from './asset';
import { bgm, books as bgmBooks, games as bgmGames, albums as bgmAlbums, type Rated } from './status';

export type Entry = { title: string; score: number; url: string; img: string };

export const byScore = <T extends { score: number }>(list: T[]): T[] =>
  [...list].sort((a, b) => b.score - a.score);

const fromBgm = (list: Rated[]): Entry[] =>
  list.map((x) => ({ title: x.title, score: x.score, url: bgm(x.id), img: asset(`img/covers/${x.id}.webp`) }));

// 豆瓣独有的书（Bangumi 收藏里没有的）。星级 ×2 折成十分制；未评分记 0。
const fromDouban = (s: string): Entry[] =>
  s.trim().split('\n').map((l) => {
    const [title, id, score] = l.split('|');
    return { title, score: +score, url: `https://book.douban.com/subject/${id}/`, img: asset(`img/books/${id}.webp`) };
  });

const doubanBooks = fromDouban(`
古都|25788092|8
活着|4913064|8
睡美人|25772862|0
骆驼祥子|1043815|0
解忧杂货店|25862578|0
如父如子|27611824|0
`);

export const books: Entry[] = [...fromBgm(bgmBooks), ...doubanBooks];
export const games: Entry[] = fromBgm(bgmGames);
export const albums: Entry[] = fromBgm(bgmAlbums);

export const shelves: [string, string, Entry[]][] = [
  ['书', 'books', books],
  ['游戏', 'games', games],
  ['专辑', 'albums', albums],
];
