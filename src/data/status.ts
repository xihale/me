export type Device = { kind: string; name: string; on: string };
export const devices: Device[] = [
  { kind: '电脑', name: '机械革命 Yaoshi15Pro Series（GM5PQ0A）', on: '终端里在打字' },
  { kind: '平板', name: 'Mi Pad 6 Pro', on: '一盘数独' },
  { kind: '阅读器', name: 'Kindle KWP3', on: '《静夜思》' },
  { kind: '手机', name: 'iPhone 7s', on: '锁屏，时间是真的' },
  { kind: '手机', name: 'Redmi Turbo 4 Pro', on: '锁屏，同上' },
  { kind: '手机', name: 'HONOR 9X Pro', on: '锁屏，同上' },
  { kind: '穿戴', name: 'HUAWEI Band 9', on: '表盘，时间也是真的' },
];

export type Rated = { title: string; id: number; score: number };
const r = (s: string): Rated[] =>
  s.trim().split('\n').map((l) => {
    const [title, id, score] = l.split('|');
    return { title, id: +id, score: +score };
  });

export const anime = r(`
葬送的芙莉莲|400602|9
来自深渊 烈日的黄金乡|298477|9
淡岛百景|493724|9
天元突破 红莲螺岩|770|9
BanG Dream! It's MyGO!!!!!|428735|8
不吉波普不笑|240039|8
我的三体 章北海传|246001|8
药屋少女的呢喃 第二季|486347|8
少女乐队的呐喊|431767|8
疯狂动物城|133860|8
剧场版 少女☆歌剧 Revue Starlight|294135|8
吹响吧！上低音号 第二季|152091|8
莉兹与青鸟|216371|8
浪客剑心 追忆篇|1728|8
进击的巨人 第三季 Part.2|263750|8
吹响吧！上低音号|115908|8
四月是你的谎言|100444|8
夏日幽灵|328674|8
游戏人生 零|187276|8
金牌得主|430699|8
重启咲良田|193378|8
3月的狮子 第二季|211567|8
罗小黑战记2|442114|8
漂流少年|332649|8
蓝色巨星|353792|8
千年女优|840|8
剧场版 链锯人 蕾塞篇|470660|8
奇诺之旅|211068|8
蓦然回首|480441|8
来自新世界|37785|8
千与千寻|311|8
辉夜姬物语|56847|8
平家物语|348335|8
异国日记|493016|8
蓝色恐惧|839|8
哆啦A梦：大雄的绘画奇遇记|515422|8
RE:cycle of the PENGUINDRUM [后篇] 我爱你|379789|8
Fate/Zero|10639|8
朝花夕誓——于离别之朝束起约定之花|218971|8
航海王：粉丝来信|518519|8
`);

export const books = r(`
重启咲良田|14477|10
人类衰退之后|11236|8
你名字的侧面|354752|8
来自新世界|37782|8
`);

export const games = r(`
魔法使之夜|540053|9
星之终途后日谈：渺茫希望的日记|495135|8
`);

export const music = r(`
魔法使之夜 OST|36140|9
`);

export const film = r(`
情书|12886|8
`);

export const bgm = (id: number) => `https://bgm.tv/subject/${id}`;
