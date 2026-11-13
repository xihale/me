/**
 * 全页夜幕:一块固定画布上的星场与同辐射点流星群。
 * 同一枚种子,每个页面、每次访问都是同一片天;
 * 三层深度随滚动缓缓错位,星光以加色混合叠出辉光;
 * 流星统一遵循 ~32° 青玉辐射点倾角,前粗后尖如针芒渐隐,与首页主流星轨同源同向。
 */

import { heroSkyMaxX } from './rail';

type Star = {
  x: number;
  y: number;
  r: number;
  a: number;
  pal: number;
  layer: 0 | 1 | 2;
  tw: number;
  ph: number;
  spike: boolean;
};

type MeteorStyle = keyof typeof METEOR_STYLE;

type Meteor = {
  x: number; y: number; // 起点(doc=true 时 y 为文档坐标,随 hero 滚动)
  dx: number; dy: number; // 单位方向
  len: number; // 行程
  trail: number; // 尾迹峰值长度
  dur: number; // 寿命 ms
  t0: number;
  st: MeteorStyle;
  a: number; // 峰值亮度 0~1
  doc?: boolean;
};

/** mulberry32:确定性 PRNG */
function rng32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const PALETTE = [
  { core: '#eceae2', halo: '232, 230, 223' }, // 墨白
  { core: '#dde6ea', halo: '186, 202, 210' }, // 冷白
  { core: '#eee3cd', halo: '226, 210, 182' }, // 暖白
  { core: '#9dc4b5', halo: '110, 158, 143' }, // 青玉
];
const PAL_WEIGHT = [0.52, 0.24, 0.16, 0.08];

/** 全站流星统一辐射角 (~32.1°):与首页主星轨入场切线平行,绝不交叉打架 */
const RADIANT_TILT = 0.56;

/** 流星两档笔触:均采用前圆后尖的锥形针芒几何,不再用等宽粗线拼圆点 */
const METEOR_STYLE = {
  big: { halo: '158, 199, 183', core: '236, 243, 239', coreR: 0.72, haloR: 2.1, glow: 11 },
  drift: { halo: '130, 178, 160', core: '222, 239, 231', coreR: 0.52, haloR: 1.45, glow: 6.5 },
};

const LAYER = [
  { speed: 0.045, parallax: 2.5 },
  { speed: 0.11, parallax: 5.5 },
  { speed: 0.18, parallax: 10 },
];

export function initNight() {
  const el = document.querySelector<HTMLCanvasElement>('canvas.night');
  const cx = el?.getContext('2d');
  if (!el || !cx) return;
  const cv: HTMLCanvasElement = el;
  const ctx: CanvasRenderingContext2D = cx;

  const stillMq = matchMedia('(prefers-reduced-motion: reduce)');
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const heroEl = document.querySelector<HTMLElement>('.hero');

  let W = 0;
  let H = 0;
  let TH = 0;
  let stars: Star[] = [];
  let sprites: HTMLCanvasElement[] = [];
  let meteors: Meteor[] = [];
  let nextMeteorAt = 0;
  let nextDriftAt = 0;
  let raf = 0;
  let tx = 0, ty = 0, px = 0, py = 0;

  const rand = (rng: () => number, lo: number, hi: number) => lo + rng() * (hi - lo);
  const gauss = (rng: () => number) => {
    const u = Math.max(rng(), 1e-7);
    return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * rng());
  };
  const pickPal = (rng: () => number) => {
    let u = rng();
    for (let i = 0; i < PAL_WEIGHT.length; i++) {
      u -= PAL_WEIGHT[i];
      if (u < 0) return i;
    }
    return 0;
  };

  /** 检查新流星轨道是否与在场流星过近(法向航道间距 >= minGap),杜绝双线并排拥挤 */
  const laneClear = (x: number, yView: number, dx: number, dy: number, minGap: number) => {
    for (const m of meteors) {
      const my = m.y - (m.doc ? scrollY : 0);
      const perp = Math.abs((m.x - x) * dy - (my - yView) * dx);
      if (perp < minGap) return false;
    }
    return true;
  };

  /** 远天偶发大流星:同辐射角微幅散射(±2°),避开在场航道 */
  const makeBig = (scale = 1): Meteor | null => {
    const rng = Math.random;
    const tilt = RADIANT_TILT + rand(rng, -0.035, 0.035);
    const dx = -Math.cos(tilt);
    const dy = Math.sin(tilt);
    // 在首页顶部时优先落于右侧与中下夜空,不抢主星轨风头
    const onHero = heroEl && scrollY < H * 0.55;
    const x = onHero ? rand(rng, W * 0.58, W * 0.96) : rand(rng, W * 0.24, W * 0.94);
    const y = onHero ? rand(rng, H * 0.08, H * 0.44) : rand(rng, H * 0.05, H * 0.52);
    if (!laneClear(x, y, dx, dy, 110)) return null;
    return {
      x, y, dx, dy,
      len: Math.hypot(W, H) * rand(rng, 0.15, 0.24) * scale,
      trail: rand(rng, 92, 150) * scale,
      dur: rand(rng, 920, 1380) * scale,
      t0: 0,
      st: 'big',
      a: rand(rng, 0.52, 0.74),
    };
  };

  /** Hero 左上空白域远景微星:同一时刻至多一缕、克制留白,严格受主星轨解析净空约束 */
  const makeDrift = (): Meteor | null => {
    if (!heroEl || meteors.length > 0) return null;

    const hr = heroEl.getBoundingClientRect();
    if (hr.width <= 860 || hr.bottom < 80 || hr.top > H) return null;

    const rng = Math.random;
    const tilt = RADIANT_TILT + rand(rng, -0.024, 0.024);
    const dx = -Math.cos(tilt);
    const dy = Math.sin(tilt);
    const heroDocTop = hr.top + scrollY;

    for (let attempt = 0; attempt < 5; attempt++) {
      const yDoc = heroDocTop + hr.height * rand(rng, 0.07, 0.3);
      const maxStart = heroSkyMaxX(yDoc);
      if (maxStart === null || maxStart < 150) continue;

      const x = rand(rng, Math.max(96, maxStart * 0.34), maxStart);
      const maxByLeft = (x - 32) / -dx;
      const len = rand(rng, 88, 165);
      if (len > maxByLeft) continue;

      const endLim = heroSkyMaxX(yDoc + dy * len);
      if (endLim !== null && x + dx * len > endLim) continue;

      return {
        x,
        y: yDoc,
        dx,
        dy,
        len,
        trail: len * rand(rng, 0.45, 0.62),
        dur: (len / rand(rng, 95, 140)) * 1000,
        t0: 0,
        st: 'drift',
        a: rand(rng, 0.24, 0.46),
        doc: true,
      };
    }
    return null;
  };

  function makeSprite(pal: number) {
    const s = 96;
    const c = document.createElement('canvas');
    c.width = s; c.height = s;
    const g = c.getContext('2d')!;
    const p = PALETTE[pal];
    const halo = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    halo.addColorStop(0, `rgba(${p.halo}, 0.22)`);
    halo.addColorStop(0.24, `rgba(${p.halo}, 0.045)`);
    halo.addColorStop(1, `rgba(${p.halo}, 0)`);
    g.fillStyle = halo;
    g.fillRect(0, 0, s, s);
    const core = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, 6.2);
    core.addColorStop(0, p.core);
    core.addColorStop(0.55, p.core);
    core.addColorStop(1, `rgba(${p.halo}, 0)`);
    g.fillStyle = core;
    g.beginPath();
    g.arc(s / 2, s / 2, 6.2, 0, Math.PI * 2);
    g.fill();
    return c;
  }

  function build() {
    const rng = rng32(0x5eed);
    const narrow = W <= 860;
    const area = W * H;
    const n = narrow
      ? Math.round(Math.min(36, Math.max(22, area / 11500)))
      : Math.round(Math.min(105, Math.max(52, area / 16500)));
    stars = [];
    const bAngle = -RADIANT_TILT;
    const bx = rand(rng, 0.1, 0.3) * W;
    const by = rand(rng, 0.55, 0.75) * H;
    const bdx = Math.cos(bAngle);
    const bdy = Math.sin(bAngle);
    const sigma = H * (narrow ? 0.16 : 0.13);
    const rScale = narrow ? 0.82 : 1;
    const aScale = narrow ? 0.85 : 1;
    for (let i = 0; i < n; i++) {
      const u = rng();
      const layer: 0 | 1 | 2 = u < 0.7 ? 0 : u < 0.93 ? 1 : 2;
      let x: number;
      let y: number;
      if (rng() < (narrow ? 0.18 : 0.26)) {
        const t = rand(rng, -0.35, 1.35) * W;
        x = bx + bdx * t + gauss(rng) * sigma * bdy;
        y = by + bdy * t + gauss(rng) * sigma * bdx;
        x = ((x % W) + W) % W;
        y = ((y % TH) + TH) % TH;
      } else {
        x = rng() * W;
        y = rng() * TH;
      }
      const rr = (layer === 0 ? rand(rng, 0.45, 0.82) : layer === 1 ? rand(rng, 0.75, 1.18) : rand(rng, 1.05, 1.5)) * rScale;
      const aa = (layer === 0 ? rand(rng, 0.08, 0.28) : layer === 1 ? rand(rng, 0.18, 0.44) : rand(rng, 0.32, 0.64)) * aScale;
      stars.push({
        x, y, r: rr, a: aa,
        pal: pickPal(rng),
        layer,
        tw: rand(rng, 0.16, 0.52),
        ph: rng() * Math.PI * 2,
        spike: false,
      });
    }
  }

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth;
    H = innerHeight;
    TH = H + Math.round(H * 0.35);
    cv.width = Math.round(W * dpr);
    cv.height = Math.round(H * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    sprites = PALETTE.map((_, i) => makeSprite(i));
    build();
    if (stillMq.matches) draw(performance.now(), true);
  }

  /** 绘制锥形针芒轨迹:头部圆润微鼓、尾部物理收尖至 0px */
  function fillNeedle(hx: number, hy: number, tx2: number, ty2: number, angle: number, rHead: number) {
    ctx.beginPath();
    ctx.arc(hx, hy, rHead, angle - Math.PI / 2, angle + Math.PI / 2);
    ctx.lineTo(tx2, ty2);
    ctx.closePath();
    ctx.fill();
  }

  function drawMeteor(m: Meteor, now: number) {
    const t = (now - m.t0) / m.dur;
    if (t >= 1 || t < 0) return false;
    const st = METEOR_STYLE[m.st];
    const ease = 1 - (1 - t) ** 2.2;
    const hx = m.x + m.dx * m.len * ease;
    const hy = m.y + m.dy * m.len * ease - (m.doc ? scrollY : 0);
    if (hy < -80 || hy > H + 80) return true;

    // 柔和起势、绵长收尾,尾迹随速度先展后敛
    const env = Math.sin(Math.PI * Math.min(1, t / 0.16) * 0.5)
      * (1 - Math.max(0, (t - 0.48) / 0.52)) ** 1.45;
    if (env <= 0.004) return false;

    const curTrail = m.trail * Math.sin(Math.PI * Math.min(0.92, t * 0.88 + 0.08));
    if (curTrail < 2) return true;
    const tx2 = hx - m.dx * curTrail;
    const ty2 = hy - m.dy * curTrail;
    const angle = Math.atan2(m.dy, m.dx);

    ctx.globalCompositeOperation = 'lighter';

    // 1. 外层青玉柔晕锥
    const gHalo = ctx.createLinearGradient(hx, hy, tx2, ty2);
    gHalo.addColorStop(0, `rgba(${st.halo}, ${0.3 * env * m.a})`);
    gHalo.addColorStop(0.45, `rgba(${st.halo}, ${0.09 * env * m.a})`);
    gHalo.addColorStop(1, `rgba(${st.halo}, 0)`);
    ctx.fillStyle = gHalo;
    fillNeedle(hx, hy, tx2, ty2, angle, st.haloR);

    // 2. 内芯亮白针芒(自头部向尾端渐细至 0px,消除生硬圆头大头针感)
    const bright = (0.36 + 0.52 * m.a) * env;
    const gCore = ctx.createLinearGradient(hx, hy, tx2, ty2);
    gCore.addColorStop(0, `rgba(${st.core}, ${bright})`);
    gCore.addColorStop(0.36, `rgba(${st.halo}, ${0.38 * bright})`);
    gCore.addColorStop(1, `rgba(${st.halo}, 0)`);
    ctx.fillStyle = gCore;
    fillNeedle(hx, hy, tx2, ty2, angle, st.coreR);

    // 3. 鼻端极轻的微芒呼吸,不盖出硬点
    ctx.globalAlpha = env * (0.16 + 0.28 * m.a);
    ctx.drawImage(sprites[3], hx - st.glow / 2, hy - st.glow / 2, st.glow, st.glow);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    return true;
  }

  function draw(now: number, still = false) {
    ctx.clearRect(0, 0, W, H);
    const sy = still ? 0 : scrollY;
    if (!still) {
      px += (tx - px) * 0.05;
      py += (ty - py) * 0.05;
    } else {
      px = 0; py = 0;
    }
    ctx.globalCompositeOperation = 'lighter';
    for (const s of stars) {
      const L = LAYER[s.layer];
      let y = (((s.y - sy * L.speed) % TH) + TH) % TH;
      const x = s.x + px * L.parallax;
      y += py * L.parallax * 0.6;
      if (y < -14 || y > H + 14) continue;
      const tw = still ? 0.9 : 0.87 + 0.13 * Math.sin((now / 1000) * s.tw + s.ph);
      const a = s.a * tw;
      const size = s.r * 6.4;
      ctx.globalAlpha = a;
      ctx.drawImage(sprites[s.pal], x - size / 2, y - size / 2, size, size);
      if (s.spike) {
        const len = s.r * 9 * (0.82 + 0.18 * tw);
        const col = PALETTE[s.pal].halo;
        const mid = `rgba(${col}, ${0.45 * a})`;
        const gx = ctx.createLinearGradient(x - len, y, x + len, y);
        gx.addColorStop(0, `rgba(${col}, 0)`);
        gx.addColorStop(0.5, mid);
        gx.addColorStop(1, `rgba(${col}, 0)`);
        ctx.strokeStyle = gx;
        ctx.lineWidth = 0.8;
        ctx.beginPath();
        ctx.moveTo(x - len, y); ctx.lineTo(x + len, y);
        ctx.stroke();
        const gy = ctx.createLinearGradient(x, y - len, x, y + len);
        gy.addColorStop(0, `rgba(${col}, 0)`);
        gy.addColorStop(0.5, mid);
        gy.addColorStop(1, `rgba(${col}, 0)`);
        ctx.strokeStyle = gy;
        ctx.beginPath();
        ctx.moveTo(x, y - len); ctx.lineTo(x, y + len);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';

    if (!still) {
      meteors = meteors.filter((m) => drawMeteor(m, now));
      if (now >= nextMeteorAt && !document.hidden) {
        const m = makeBig(W <= 860 ? 0.78 : 1);
        if (m) {
          m.t0 = now;
          meteors.push(m);
        }
        nextMeteorAt = now + (W <= 860 ? rand(Math.random, 20000, 36000) : rand(Math.random, 16000, 30000));
      }
      if (now >= nextDriftAt && !document.hidden) {
        nextDriftAt = now + rand(Math.random, 6800, 13500);
        const m = makeDrift();
        if (m) {
          m.t0 = now;
          meteors.push(m);
        }
      }
    }
  }

  function frame(now: number) {
    if (document.hidden) {
      raf = 0;
      return;
    }
    draw(now);
    raf = requestAnimationFrame(frame);
  }

  function start() {
    if (!raf && !stillMq.matches) {
      const now = performance.now();
      nextMeteorAt = now + rand(Math.random, 9000, 16000);
      nextDriftAt = now + rand(Math.random, 3500, 7200);
      // 延后一帧待主星轨完成首帧几何建模后,再置入一颗半途微雨丝
      requestAnimationFrame((t) => {
        if (stillMq.matches || document.hidden) return;
        const warm = makeDrift();
        if (warm) {
          warm.t0 = t - warm.dur * 0.32;
          meteors.push(warm);
        }
      });
      raf = requestAnimationFrame(frame);
    }
  }

  function stop() {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  let resizeRaf = 0;
  addEventListener('resize', () => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(() => {
      resizeRaf = 0;
      resize();
    });
  }, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else start();
  });

  stillMq.addEventListener('change', () => {
    if (stillMq.matches) {
      stop();
      meteors = [];
      draw(performance.now(), true);
    } else {
      resize();
      start();
    }
  });

  if (finePointer.matches) {
    addEventListener('pointermove', (e) => {
      tx = e.clientX / W - 0.5;
      ty = e.clientY / H - 0.5;
    }, { passive: true });
  }

  resize();
  start();
}
