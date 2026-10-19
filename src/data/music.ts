export type Song = { title: string; artist: string; id: number };

const s = (title: string, artist: string, id: number): Song => ({ title, artist, id });

export const songs: Song[] = [
  s('ハッピーエンド (instrumental)', 'back number', 441120257),
  s('またね幻 (Live in Studio_80光年先の君へ)', 'ずっと真夜中でいいのに。', 3362570928),
  s('我愛メイデン', '羽生まゐご / 初音ミク', 2084005979),
  s('魚の目シンパシー', 'ラブリーサマーちゃん', 440411023),
  s('lowmotion algae', 'ずっと真夜中でいいのに。', 3362571887),
  s('孤独の肖像1st.', '中島みゆき', 623978),
  s('凝望远去的航船', 'Warsic / 壹勺籽糖', 3351211922),
  s('VOICES Strings ver. ～featuring Ayasa', 'Ayasa / Xperia', 440464651),
  s('ACE COMBAT 8: WINGS OF THEVE Main Theme - Everflow', 'PROJECT ACES', 3431645720),
  s('Fake Love (Orchestral Version)', 'MDP', 1995166023),
  s('Velune', 'santilavadenz', 3418408981),
  s('告白の夜', 'Ayasa', 3386967464),
  s('Ahead of Us', '小瀬村晶', 2029892284),
  s('Early Summer', 'Ryo Fukui', 22812037),
  s('purple clouds', '牛尾憲輔', 1909358352),
  s('requiem phases', '牛尾憲輔', 1909358215),
  s('light', 'jizue', 414691986),
  s('Beginning of Life', 'JABBERLOOP', 505399074),
];

export const songUrl = (id: number) => `https://music.163.com/song?id=${id}`;
export const likedUrl = 'https://music.163.com/#/user/home?id=1416036370';
