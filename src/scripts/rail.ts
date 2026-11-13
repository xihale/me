/**
 * 首页流星轨系统 (Hero Trajectory & Spine)
 *
 * 1. 曲线先行 (Curve-First):单段解析三次贝塞尔 X(u) 定义自夜空潜入、最终精确竖直汇入左侧脊线的
 *    凸单调轨迹(零拐点、零过冲、零拼接折角),五个索引节点严格落在该解析曲线上。
 * 2. 纯布局量测 (Transform-Immune):全链路以 offsetTop/offsetLeft 量测静态几何,隔离入场与揭示动画偏移。
 * 3. 双向同轨彗星飞行:
 *    - 点击索引下行:词化为流光,沿「流星弧余段 → 左侧脊线 → 圆角挂线」匀速抵达对应章节标题。
 *    - 点击脊线回顶:流光自光标位置起飞,沿「左侧脊线北上 → 汇入流星弧 → 掠过五枚节点 → 顺尾迹没入右上夜空」。
 */

type Pt = { x: number; y: number };

interface CurveModel {
  railX: number;
  spanX: number;
  y0: number;
  yTurn: number;
  vSpan: number;
  heroW: number;
  heroH: number;
  heroTop: number;
  uHead: number;
  uNodes: number[];
  rows: HTMLAnchorElement[];
  xAtU: (u: number) => number;
  yAtU: (u: number) => number;
  xAtHeroY: (y: number) => number;
  /** dx/dy (相对于 hero 纵坐标 y 的斜率) */
  dxdyAtHeroY: (y: number) => number;
}

/** 形状参数 β=-0.14: f(u) = 1.14u² - 0.14u³, 在 [0, 1.3] 上 f''(u) > 1.1 > 0 严格凸单调 */
const BETA = -0.14;
const fU = (u: number) => (1 - BETA) * u * u + BETA * u * u * u;
const dfU = (u: number) => 2 * (1 - BETA) * u + 3 * BETA * u * u;
const f2 = (v: number) => v.toFixed(2);
const smoothstep = (x: number) => {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
};

const STAR_SVG = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .4 9.05 6.95 15.6 8 9.05 9.05 8 15.6 6.95 9.05.4 8 6.95 6.95Z"/></svg>`;

let activeModel: CurveModel | null = null;
let isFlying = false;
let flightUid = 0;

/** 供 night.ts 查询:给定文档纵坐标 yDoc,返回 hero 左上夜空微雨的安全右界 x */
export function heroSkyMaxX(yDoc: number): number | null {
  const m = activeModel;
  if (!m) return null;
  const y = yDoc - m.heroTop;
  if (y < 20 || y > m.heroH * 0.56) return null;
  return m.xAtHeroY(y) - 96;
}

/** 沿 offsetParent 累加静态布局坐标,不受 CSS transform 或 scroll 影响 */
function offsetWithin(el: HTMLElement, stopAt: HTMLElement | null): Pt {
  let x = 0;
  let y = 0;
  let cur: HTMLElement | null = el;
  while (cur && cur !== stopAt) {
    x += cur.offsetLeft;
    y += cur.offsetTop;
    cur = cur.offsetParent as HTMLElement | null;
  }
  return { x, y };
}

/** 创建视口固定的飞行渲染层(前导星芒 + 渐隐青玉彗尾) */
function createFlightOverlay() {
  const ns = 'http://www.w3.org/2000/svg';
  const layer = document.createElementNS(ns, 'svg');
  layer.setAttribute('class', 'fly-layer');
  layer.setAttribute('aria-hidden', 'true');
  const gradId = `fly-wake-${++flightUid}`;
  layer.innerHTML = `
    <defs>
      <linearGradient id="${gradId}" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="var(--accent)" stop-opacity="0"/>
        <stop offset="62%" stop-color="var(--accent)" stop-opacity="0.48"/>
        <stop offset="100%" stop-color="#e8f3ef" stop-opacity="0.94"/>
      </linearGradient>
    </defs>
    <path class="fly-wake-glow" fill="none" stroke="url(#${gradId})"/>
    <path class="fly-wake" fill="none" stroke="url(#${gradId})"/>
  `;
  const wakeGlow = layer.querySelector<SVGPathElement>('.fly-wake-glow')!;
  const wakeCore = layer.querySelector<SVGPathElement>('.fly-wake')!;
  const gradEl = layer.querySelector<SVGLinearGradientElement>(`#${gradId}`)!;

  const star = document.createElement('div');
  star.className = 'fly-star';
  star.innerHTML = STAR_SVG;
  document.body.append(layer, star);

  const setWake = (ptsView: Pt[]) => {
    if (ptsView.length < 2) {
      wakeGlow.removeAttribute('d');
      wakeCore.removeAttribute('d');
      return;
    }
    let d = '';
    for (let i = 0; i < ptsView.length; i++) {
      d += `${i === 0 ? 'M' : 'L'}${f2(ptsView[i].x)} ${f2(ptsView[i].y)} `;
    }
    const tail = ptsView[0];
    const head = ptsView[ptsView.length - 1];
    gradEl.setAttribute('x1', f2(tail.x));
    gradEl.setAttribute('y1', f2(tail.y));
    gradEl.setAttribute('x2', f2(head.x));
    gradEl.setAttribute('y2', f2(head.y));
    wakeGlow.setAttribute('d', d);
    wakeCore.setAttribute('d', d);
  };

  return { layer, star, setWake };
}

/** 构造下行弧长采样器(弯轨余段 → 竖直脊线 → 圆角拐入水平引线) */
function buildDownTrack(m: CurveModel, rowIdx: number, endXDoc: number, endYDoc: number) {
  const pts: Pt[] = [];
  const push = (x: number, y: number) => {
    const prev = pts[pts.length - 1];
    if (!prev || Math.hypot(x - prev.x, y - prev.y) > 0.25) pts.push({ x, y });
  };

  const uStart = m.uNodes[rowIdx] ?? 0;
  const curveSteps = Math.max(16, Math.round(uStart * 44));
  for (let i = 0; i <= curveSteps; i++) {
    const u = uStart * (1 - i / curveSteps);
    push(m.xAtU(u), m.heroTop + m.yAtU(u));
  }

  const yCurveEnd = m.heroTop + m.yTurn;
  const dxHang = Math.max(0, endXDoc - m.railX);
  const dySpine = Math.max(0, endYDoc - yCurveEnd);
  const R = Math.min(16, dxHang * 0.45, dySpine * 0.25);
  const yFilletStart = Math.max(yCurveEnd, endYDoc - R);
  const spineDist = yFilletStart - yCurveEnd;
  const spineSteps = Math.max(8, Math.min(64, Math.round(spineDist / 28)));
  for (let i = 1; i <= spineSteps; i++) {
    push(m.railX, yCurveEnd + (spineDist * i) / spineSteps);
  }

  if (R > 1.5) {
    const filletSteps = 8;
    for (let i = 1; i <= filletSteps; i++) {
      const t = i / filletSteps;
      const mt = 1 - t;
      const x = mt * mt * m.railX + 2 * mt * t * m.railX + t * t * (m.railX + R);
      const y = mt * mt * yFilletStart + 2 * mt * t * endYDoc + t * t * endYDoc;
      push(x, y);
    }
  }
  push(endXDoc, endYDoc);

  const cum = new Float64Array(pts.length);
  for (let i = 1; i < pts.length; i++) {
    cum[i] = cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  const total = Math.max(1, cum[pts.length - 1]);

  const atDist = (s: number): Pt => {
    const clamped = Math.max(0, Math.min(total, s));
    let lo = 0;
    let hi = pts.length - 1;
    while (lo < hi - 1) {
      const mid = (lo + hi) >> 1;
      if (cum[mid] <= clamped) lo = mid;
      else hi = mid;
    }
    const seg = cum[hi] - cum[lo];
    const t = seg > 1e-4 ? (clamped - cum[lo]) / seg : 0;
    return {
      x: pts[lo].x + (pts[hi].x - pts[lo].x) * t,
      y: pts[lo].y + (pts[hi].y - pts[lo].y) * t,
    };
  };

  return { total, atDist };
}

function bindFlight(rows: HTMLAnchorElement[], reducedMq: MediaQueryList, narrowMq: MediaQueryList) {
  rows.forEach((row, idx) => {
    row.addEventListener('click', (ev) => {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const id = row.getAttribute('href')?.replace(/^#/, '');
      const target = id ? document.getElementById(id) : null;
      if (!target || reducedMq.matches || narrowMq.matches || !activeModel) return;
      ev.preventDefault();
      if (isFlying) return;
      isFlying = true;

      const m = activeModel;
      const secHead = target.querySelector<HTMLElement>('.head');
      const h2 = (target.querySelector<HTMLElement>('h2') ?? target) as HTMLElement;

      const secPos = offsetWithin(target, null);
      const secPadTop = parseFloat(getComputedStyle(target).paddingTop) || 0;
      const naturalHeadTop = secPos.y + secPadTop;
      const h2InHead = secHead ? offsetWithin(h2, secHead) : offsetWithin(h2, target);
      const naturalH2Top = secHead ? naturalHeadTop + h2InHead.y : secPos.y + h2InHead.y;
      const h2DocLeft = offsetWithin(h2, null).x;
      const h2H = h2.offsetHeight;

      const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
      const destY = Math.max(0, Math.min(maxScroll, naturalH2Top - innerHeight * 0.24));

      let endYDoc = naturalH2Top + h2H / 2;
      if (secHead) {
        const stickyTop = parseFloat(getComputedStyle(secHead).top);
        if (Number.isFinite(stickyTop)) {
          const maxHeadTop = secPos.y + target.offsetHeight - secHead.offsetHeight;
          const finalHeadTop = Math.min(maxHeadTop, Math.max(naturalHeadTop, destY + stickyTop));
          endYDoc = finalHeadTop + h2InHead.y + h2H / 2;
        }
      }
      const endXDoc = h2DocLeft - 11;

      const track = buildDownTrack(m, idx, endXDoc, endYDoc);
      const startY = window.scrollY;
      const { layer, star, setWake } = createFlightOverlay();
      row.classList.add('depart');

      const root = document.documentElement;
      const prevBehavior = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';

      let raf = 0;
      const abort = () => {
        if (raf) cancelAnimationFrame(raf);
        layer.remove();
        star.remove();
        row.classList.remove('depart');
        root.style.scrollBehavior = prevBehavior;
        isFlying = false;
      };

      const DUR = Math.min(960, Math.max(680, 520 + track.total * 0.12));
      const WAKE_MAX = Math.min(110, Math.max(54, track.total * 0.14));
      const t0 = performance.now();

      const frame = (now: number) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        const curScroll = startY + (destY - startY) * e;
        window.scrollTo(0, curScroll);

        const sHead = e * track.total;
        const head = track.atDist(sHead);
        const vx = head.x;
        const vy = head.y - curScroll;

        const wakeLen = WAKE_MAX * Math.sin(Math.PI * t);
        if (wakeLen > 2) {
          const sTail = Math.max(0, sHead - wakeLen);
          const steps = 10;
          const wakePts: Pt[] = [];
          for (let k = 0; k <= steps; k++) {
            const p = track.atDist(sTail + ((sHead - sTail) * k) / steps);
            wakePts.push({ x: p.x, y: p.y - curScroll });
          }
          setWake(wakePts);
        } else {
          setWake([]);
        }

        const sc = 0.56 + 0.42 * Math.sin(Math.PI * Math.min(t / 0.9, 1));
        const op = t < 0.06 ? t / 0.06 : 1;
        star.style.opacity = op.toFixed(3);
        star.style.transform = `translate3d(${f2(vx)}px, ${f2(vy)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;

        if (t < 1) {
          raf = requestAnimationFrame(frame);
          return;
        }

        layer.remove();
        row.classList.remove('depart');
        root.style.scrollBehavior = prevBehavior;
        history.pushState(null, '', `#${id}`);

        h2.classList.remove('star-hit');
        void h2.offsetWidth;
        h2.classList.add('star-hit');
        setTimeout(() => h2.classList.remove('star-hit'), 1000);

        star.animate(
          [
            { transform: `translate3d(${f2(vx)}px, ${f2(vy)}px, 0) translate(-50%, -50%) scale(0.6)`, opacity: 1 },
            { transform: `translate3d(${f2(vx)}px, ${f2(vy)}px, 0) translate(-50%, -50%) scale(2.25)`, opacity: 0 },
          ],
          { duration: 440, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)' },
        ).onfinish = () => star.remove();

        isFlying = false;
      };

      document.addEventListener('visibilitychange', () => { if (document.hidden && isFlying) abort(); }, { once: true });
      raf = requestAnimationFrame(frame);
    });
  });
}

export function initHeroRail() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const wrap = hero?.querySelector<HTMLElement>('.wrap');
  const fall = hero?.querySelector<HTMLElement>('.hero-fall');
  const rows = [...(fall?.querySelectorAll<HTMLAnchorElement>('.row') ?? [])];
  if (!hero || !wrap || !fall || rows.length < 3) return;

  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  const narrowMq = matchMedia('(max-width: 860px)');
  bindFlight(rows, reducedMq, narrowMq);

  const svg = hero.querySelector<SVGSVGElement>('.sky');
  const rail = svg?.querySelector<SVGPathElement>('.rail');
  const glow = svg?.querySelector<SVGPathElement>('.rail-glow');
  const coreGrad = svg?.querySelector<SVGLinearGradientElement>('#rail-grad');
  const glowGrad = svg?.querySelector<SVGLinearGradientElement>('#rail-glow-grad');
  if (!svg || !rail || !glow) return;

  const homeBody = document.querySelector<HTMLElement>('.home-body');
  const railDown = document.querySelector<HTMLElement>('.rail-down');
  const mastEl = hero.querySelector<HTMLElement>('.m-masthead');
  const coreStops = coreGrad?.querySelectorAll('stop');
  const glowStops = glowGrad?.querySelectorAll('stop');
  let introPlayed = false;

  const layout = () => {
    const heroW = hero.clientWidth;
    const heroH = hero.clientHeight;
    if (!heroW || !heroH) return;

    const narrow = narrowMq.matches;
    const heroDoc = offsetWithin(hero, null);
    const wrapLeft = wrap.offsetLeft;
    const wrapW = wrap.clientWidth;
    const fallPos = offsetWithin(fall, hero);
    const padL = fallPos.x - wrapLeft;
    const innerW = Math.max(240, wrapW - padL * 2);

    const railX = narrow
      ? Math.max(10, Math.min(20, padL * 0.45))
      : Math.max(14, wrapLeft + Math.min(16, padL * 0.36));

    const ndCenters = rows.map((r) => {
      const nd = r.querySelector<HTMLElement>('.nd');
      const ndOffX = nd ? nd.offsetLeft + nd.offsetWidth / 2 : 2.5;
      const ndOffY = nd ? nd.offsetTop + nd.offsetHeight / 2 : r.offsetHeight / 2;
      return {
        ndOffX,
        y: fallPos.y + r.offsetTop + ndOffY,
      };
    });

    const y0 = ndCenters[0].y;
    const yLast = ndCenters[ndCenters.length - 1].y;
    if (yLast <= y0 + 20) return;

    const tailDrop = narrow
      ? Math.max(44, Math.min(88, (yLast - y0) * 0.28))
      : Math.max(76, Math.min(176, (yLast - y0) * 0.35));
    const maxYTurn = narrow ? heroH - 18 : heroH;
    const yTurn = Math.min(maxYTurn, Math.max(yLast + (narrow ? 34 : 48), yLast + tailDrop));
    const vSpan = Math.max(80, yTurn - y0);

    let spanX: number;
    if (narrow) {
      const rightLimit = wrapLeft + wrapW - padL - 4;
      let maxSpan = innerW * 0.56;
      ndCenters.forEach(({ ndOffX, y }, i) => {
        const u = Math.max(0, (yTurn - y) / vSpan);
        const fu = fU(u);
        if (fu > 0.01) {
          const rowW = rows[i].offsetWidth || 160;
          const limit = (rightLimit - (railX - ndOffX + rowW)) / fu;
          if (limit < maxSpan) maxSpan = limit;
        }
      });
      spanX = Math.max(96, Math.min(innerW * 0.56, vSpan * 0.92, maxSpan));
    } else {
      const row0Width = rows[0].offsetWidth || 260;
      const maxRightX = wrapLeft + wrapW - padL - Math.max(220, row0Width) - 8;
      spanX = Math.max(
        180,
        Math.min(innerW * 0.49, vSpan * 1.04, Math.max(220, maxRightX - railX)),
      );
    }

    const xAtU = (u: number) => (u <= 0 ? railX : railX + spanX * fU(u));
    const yAtU = (u: number) => yTurn - vSpan * u;
    const xAtHeroY = (y: number) => (y >= yTurn ? railX : xAtU((yTurn - y) / vSpan));
    const dxdyAtHeroY = (y: number) => {
      if (y >= yTurn) return 0;
      const u = (yTurn - y) / vSpan;
      return -(spanX * dfU(u)) / vSpan;
    };

    const uNodes = ndCenters.map(({ ndOffX, y }, i) => {
      const u = Math.max(0, (yTurn - y) / vSpan);
      const targetX = xAtU(u);
      const dx = targetX - (fallPos.x + ndOffX);
      rows[i].style.setProperty('--dx', `${f2(dx)}px`);
      return u;
    });

    const topFloor = narrow && mastEl
      ? offsetWithin(mastEl, hero).y + mastEl.offsetHeight + 12
      : 46;
    const uMaxTop = 1 + Math.max(0.05, (y0 - topFloor) / vSpan);
    const slopeAt1 = Math.max(1, spanX * dfU(1));
    const rightMargin = narrow ? 14 : 24;
    const uMaxRight = 1 + Math.max(0.05, (heroW - rightMargin - (railX + spanX)) / slopeAt1);
    const uHead = Math.min(narrow ? 1.42 : 1.16, uMaxTop, uMaxRight);

    const p0: Pt = { x: xAtU(uHead), y: yAtU(uHead) };
    const p1: Pt = {
      x: p0.x - (uHead / 3) * spanX * dfU(uHead),
      y: p0.y + (uHead / 3) * vSpan,
    };
    const p2: Pt = { x: railX, y: yTurn - (uHead / 3) * vSpan };
    const p3: Pt = { x: railX, y: yTurn };

    const d = `M${f2(p0.x)} ${f2(p0.y)} C${f2(p1.x)} ${f2(p1.y)} ${f2(p2.x)} ${f2(p2.y)} ${f2(p3.x)} ${f2(p3.y)}`
      + (!narrow && heroH > yTurn + 0.5 ? ` V${f2(heroH)}` : '');

    svg.setAttribute('viewBox', `0 0 ${heroW} ${heroH}`);
    const gradEndY = narrow ? yTurn : heroH;
    for (const g of [coreGrad, glowGrad]) {
      if (!g) continue;
      g.setAttribute('x1', f2(p0.x));
      g.setAttribute('y1', f2(p0.y));
      g.setAttribute('x2', f2(railX));
      g.setAttribute('y2', f2(gradEndY));
    }
    if (coreStops?.length) {
      coreStops[coreStops.length - 1].setAttribute('stop-opacity', narrow ? '0' : '0.82');
    }
    if (glowStops?.length) {
      glowStops[glowStops.length - 1].setAttribute('stop-opacity', narrow ? '0' : '0.05');
    }
    glow.setAttribute('d', d);
    rail.setAttribute('d', d);

    if (narrow) {
      activeModel = null;
      document.documentElement.style.removeProperty('--rail-x');
    } else {
      document.documentElement.style.setProperty('--rail-x', `${f2(railX)}px`);

      const bodyRef = homeBody ?? document.body;
      document.querySelectorAll<HTMLElement>('.home .sec > .head').forEach((headEl) => {
        const h2 = headEl.querySelector<HTMLElement>('h2');
        if (!h2) return;
        const headX = offsetWithin(headEl, bodyRef).x;
        const h2InHead = offsetWithin(h2, headEl);
        headEl.style.setProperty('--hang-w', `${f2(Math.max(10, headX - railX))}px`);
        headEl.style.setProperty('--hang-y', `${f2(h2InHead.y + h2.offsetHeight / 2)}px`);
      });

      activeModel = {
        railX, spanX, y0, yTurn, vSpan, heroW, heroH,
        heroTop: heroDoc.y,
        uHead, uNodes, rows,
        xAtU, yAtU, xAtHeroY, dxdyAtHeroY,
      };
    }

    if (!introPlayed) {
      introPlayed = true;
      if (!reducedMq.matches && window.scrollY < 48) {
        svg.classList.add('intro');
        railDown?.classList.add('intro');
        rail.addEventListener('animationend', () => svg.classList.remove('intro'), { once: true });
        railDown?.addEventListener('animationend', () => railDown.classList.remove('intro'), { once: true });
      }
    }
  };

  layout();
  let rafId = 0;
  const schedule = () => {
    if (rafId) return;
    rafId = requestAnimationFrame(() => {
      rafId = 0;
      layout();
    });
  };

  const ro = new ResizeObserver(schedule);
  ro.observe(hero);
  ro.observe(fall);
  narrowMq.addEventListener('change', layout);
  document.fonts?.ready.then(schedule);
}

/**
 * 脊线归星交互:
 * - 悬停:阻尼平滑跟随光标,在脊线上点亮一枚拖着向下锥形彗尾的归星(无生硬三角箭头)。
 * - 点击:归星自光标位置起飞,沿「左侧脊线北上 → 汇入主流星弧 → 依次掠亮五枚节点 → 顺尾迹没入右上夜空」。
 */
export function initRise() {
  const rise = document.querySelector<HTMLElement>('.rise');
  const hero = document.querySelector<HTMLElement>('.hero');
  const footer = document.querySelector<HTMLElement>('footer');
  if (!rise || !hero || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;

  const reducedMq = matchMedia('(prefers-reduced-motion: reduce)');
  let inStrip = false;
  let lastClientY: number | null = null;
  let targetY = innerHeight * 0.6;
  let currentY = targetY;
  let trackRaf = 0;

  const onSpine = (clientY: number) => {
    const topLim = hero.getBoundingClientRect().bottom + 10;
    const botLim = footer ? footer.getBoundingClientRect().top - 14 : innerHeight + 100;
    return clientY > topLim && clientY < botLim;
  };

  const stepTrack = () => {
    const diff = targetY - currentY;
    if (Math.abs(diff) > 0.25) {
      currentY += diff * 0.28;
      rise.style.setProperty('--ry', `${currentY.toFixed(1)}px`);
      trackRaf = requestAnimationFrame(stepTrack);
    } else {
      currentY = targetY;
      rise.style.setProperty('--ry', `${currentY.toFixed(1)}px`);
      trackRaf = 0;
    }
  };

  const syncHover = (clientY: number | null, snap = false) => {
    const active = !isFlying && clientY !== null && inStrip && onSpine(clientY);
    const wasActive = rise.classList.contains('on-rail');
    rise.classList.toggle('on-rail', active);
    rise.style.pointerEvents = active ? 'auto' : 'none';
    if (active && clientY !== null) {
      targetY = clientY - rise.getBoundingClientRect().top;
      if (!wasActive || snap || reducedMq.matches) {
        currentY = targetY;
        rise.style.setProperty('--ry', `${currentY.toFixed(1)}px`);
      } else if (!trackRaf) {
        trackRaf = requestAnimationFrame(stepTrack);
      }
    }
  };

  window.addEventListener(
    'pointermove',
    (e) => {
      const r = rise.getBoundingClientRect();
      inStrip = e.clientX >= r.left && e.clientX <= r.right;
      lastClientY = e.clientY;
      syncHover(e.clientY);
    },
    { passive: true },
  );
  window.addEventListener('scroll', () => {
    if (lastClientY !== null) syncHover(lastClientY, true);
  }, { passive: true });
  rise.addEventListener('pointerleave', () => {
    inStrip = false;
    rise.classList.remove('on-rail');
  });
  rise.addEventListener('focus', () => {
    targetY = innerHeight * 0.6;
    currentY = targetY;
    rise.style.setProperty('--ry', `${currentY.toFixed(1)}px`);
    rise.classList.toggle('on-rail', !isFlying && onSpine(targetY));
  });

  rise.addEventListener('click', (ev) => {
    if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
    if (!rise.classList.contains('on-rail')) return;
    if (reducedMq.matches || !activeModel) return;

    ev.preventDefault();
    if (isFlying) return;
    isFlying = true;
    rise.classList.remove('on-rail');
    rise.style.pointerEvents = 'none';

    const m = activeModel;
    const startScroll = window.scrollY;
    const clickViewY = Math.max(48, Math.min(innerHeight - 36, currentY));
    const startDocY = startScroll + clickViewY;

    // 终点顺着流星弧向右上夜空再延展少许,让星芒沿着原轨迹自然消隐入星海
    const slopeAtHead = Math.max(1, m.spanX * dfU(m.uHead));
    const uMaxSkyTop = 1 + Math.max(0.06, (m.y0 - 26) / m.vSpan);
    const uMaxSkyRight = 1 + Math.max(0.06, (m.heroW - 20 - (m.railX + m.spanX)) / slopeAtHead);
    const uSkyEnd = Math.min(m.uHead + 0.05, uMaxSkyTop, uMaxSkyRight);
    const endDocY = Math.min(clickViewY - 16, m.heroTop + m.yAtU(uSkyEnd));

    const nodeDocYs = m.uNodes.map((u) => m.heroTop + m.yAtU(u));
    const passed = new Array<boolean>(nodeDocYs.length).fill(false);

    const xAtDocY = (docY: number) => m.xAtHeroY(docY - m.heroTop);
    const slopeAtDocY = (docY: number) => m.dxdyAtHeroY(docY - m.heroTop);

    const { layer, star, setWake } = createFlightOverlay();
    const root = document.documentElement;
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = 'auto';

    let raf = 0;
    const abort = () => {
      if (raf) cancelAnimationFrame(raf);
      layer.remove();
      star.remove();
      root.style.scrollBehavior = prevBehavior;
      isFlying = false;
    };

    const DUR = Math.min(1180, Math.max(880, 740 + startScroll * 0.08));
    const WAKE_MAX = 118;
    const t0 = performance.now();
    let prevDocY = startDocY;

    const frame = (now: number) => {
      const t = Math.min(1, (now - t0) / DUR);
      // 页面滚动在 t=0.62 平滑归零,留出完整定格视野欣赏流光沿 Hero 流星线向右上掠入夜空
      const eScroll = smoothstep(t / 0.62);
      const curScroll = startScroll * (1 - eScroll);
      window.scrollTo(0, curScroll);

      // 屏幕纵坐标单调上升,并在末端保留轻盈余速滑入夜空渐隐(绝不生硬急刹)
      const eStar = 0.8 * smoothstep(t) + 0.2 * t * t;
      const vy = clickViewY + (endDocY - clickViewY) * eStar;
      const docY = curScroll + vy;
      const vx = xAtDocY(docY);

      // 掠过五枚索引节点(摘抄 → 展柜)时依次点亮节点微芒
      for (let i = nodeDocYs.length - 1; i >= 0; i--) {
        if (!passed[i] && prevDocY >= nodeDocYs[i] && docY <= nodeDocYs[i]) {
          passed[i] = true;
          const row = m.rows[i];
          row.classList.add('pass');
          setTimeout(() => row.classList.remove('pass'), 520);
        }
      }
      prevDocY = docY;

      // 沿真实轨道(脊线 + 弯轨)向后回溯等弧长采样点,绘出贴轨弯曲的青玉彗尾
      const wakeEnv = Math.sin(Math.PI * Math.min(1, t * 0.94 + 0.04));
      const wakeLen = WAKE_MAX * wakeEnv;
      if (wakeLen > 3) {
        const steps = 12;
        const ds = wakeLen / steps;
        const backPts: Pt[] = [{ x: vx, y: vy }];
        let yCursor = docY;
        for (let k = 1; k <= steps; k++) {
          const sl = slopeAtDocY(yCursor);
          const dy = ds / Math.hypot(sl, 1);
          yCursor = Math.min(startDocY, yCursor + dy);
          backPts.push({ x: xAtDocY(yCursor), y: yCursor - curScroll });
          if (yCursor >= startDocY) break;
        }
        backPts.reverse();
        setWake(backPts);
      } else {
        setWake([]);
      }

      // 末段顺着流星尾端渐缩消散入夜幕,而非生硬停驻
      const fadeIn = t < 0.05 ? t / 0.05 : 1;
      const fadeOut = t > 0.78 ? (1 - (t - 0.78) / 0.22) ** 1.35 : 1;
      const op = fadeIn * fadeOut;
      const sc = (0.68 + 0.34 * Math.sin(Math.PI * Math.min(1, t / 0.78))) * (0.45 + 0.55 * fadeOut);
      star.style.opacity = op.toFixed(3);
      star.style.transform = `translate3d(${f2(vx)}px, ${f2(vy)}px, 0) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
      layer.style.opacity = fadeOut.toFixed(3);

      if (t < 1) {
        raf = requestAnimationFrame(frame);
        return;
      }

      window.scrollTo(0, 0);
      layer.remove();
      star.remove();
      root.style.scrollBehavior = prevBehavior;
      if (location.hash) history.replaceState(null, '', location.pathname + location.search);
      isFlying = false;
    };

    document.addEventListener('visibilitychange', () => { if (document.hidden && isFlying) abort(); }, { once: true });
    raf = requestAnimationFrame(frame);
  });

  rise.style.pointerEvents = 'none';
}
