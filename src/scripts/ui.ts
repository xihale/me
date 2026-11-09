type Dev = { kind: string; name: string };

export function initCabinet() {
  const root = document.getElementById('cabinet');
  if (!root) return;
  const devs: Dev[] = JSON.parse(document.getElementById('dev-data')!.textContent || '[]');
  const i = document.getElementById('cap-i')!, n = document.getElementById('cap-n')!;
  const btns = [...root.querySelectorAll<HTMLButtonElement>('.dev-btn')];
  const els = [...root.querySelectorAll<SVGGElement>('.dev')];
  const scrollx = root.querySelector<HTMLElement>('.scrollx');
  const marks = [...root.querySelectorAll<HTMLElement>('.snap')];
  const svg = root.querySelector<SVGSVGElement>('svg');
  const stage = root.querySelector<HTMLElement>('.stage');
  // 窄屏:一件一屏,标题跟随居中那一件
  const narrow = matchMedia('(max-width: 860px)');
  let queued = 0;

  const show = (k: number | null) => {
    const idx = k ?? 0;
    els.forEach((e, j) => e.classList.toggle('on', j === idx));
    const d = devs[idx];
    if (d) {
      i.textContent = `${String(idx + 1).padStart(2, '0')} · ${d.kind}`;
      n.textContent = d.name;
      btns.forEach((b, j) => {
        b.classList.toggle('on', j === idx);
        b.setAttribute('aria-pressed', String(j === idx));
      });
    }
  };

  els.forEach((e, k) => {
    e.addEventListener('pointerenter', () => show(k));
    e.addEventListener('focus', () => show(k));
    e.addEventListener('click', () => {
      if (!narrow.matches || !scrollx || !marks[k]) { show(k); return; }
      const m = marks[k];
      const box = scrollx.getBoundingClientRect();
      scrollx.scrollTo({
        left: m.getBoundingClientRect().left - box.left + scrollx.scrollLeft - scrollx.clientWidth / 2,
        behavior: 'smooth',
      });
    });
  });

  btns.forEach((btn, idx) => {
    btn.addEventListener('click', () => {
      if (!scrollx || !marks[idx]) { show(idx); return; }
      const m = marks[idx];
      const box = scrollx.getBoundingClientRect();
      scrollx.scrollTo({
        left: m.getBoundingClientRect().left - box.left + scrollx.scrollLeft - scrollx.clientWidth / 2,
        behavior: 'smooth',
      });
      if (!narrow.matches) show(idx);
    });
  });

  root.addEventListener('pointerleave', () => { if (!narrow.matches) show(0); });
  root.addEventListener('focusout', (ev) => {
    if (!narrow.matches && !root.contains((ev as FocusEvent).relatedTarget as Node)) show(0);
  });

  // 按图形算每件的中心点,并补出两端可居中的余量
  const place = () => {
    if (!scrollx || !svg || !stage || marks.length !== els.length) return;
    const k = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    els.forEach((g, idx) => {
      const b = g.querySelector('.lift')!.getBBox();
      marks[idx].style.left = `${((b.x + b.width / 2) * k).toFixed(2)}px`;
    });
    if (!narrow.matches) { scrollx.style.paddingInline = ''; return; }
    const half = scrollx.clientWidth / 2;
    const first = parseFloat(marks[0].style.left);
    const last = parseFloat(marks[marks.length - 1].style.left);
    scrollx.style.paddingInline = `${Math.max(0, half - first)}px ${Math.max(0, half - (stage.clientWidth - last))}px`;
  };

  const sync = () => {
    if (!scrollx || !narrow.matches || !marks.length) return;
    const box = scrollx.getBoundingClientRect();
    const mid = scrollx.scrollLeft + scrollx.clientWidth / 2;
    let best = 0;
    let near = Infinity;
    marks.forEach((m, idx) => {
      const d = Math.abs(m.getBoundingClientRect().left - box.left + scrollx.scrollLeft - mid);
      if (d < near) { near = d; best = idx; }
    });
    show(best);
  };

  scrollx?.addEventListener('scroll', () => {
    cancelAnimationFrame(queued);
    queued = requestAnimationFrame(sync);
  }, { passive: true });
  addEventListener('resize', () => { place(); sync(); });
  narrow.addEventListener('change', () => { place(); sync(); });
  place();
  show(0);
  if (scrollx && narrow.matches && marks.length) {
    const box = scrollx.getBoundingClientRect();
    scrollx.scrollLeft = marks[0].getBoundingClientRect().left - box.left + scrollx.scrollLeft - scrollx.clientWidth / 2;
  }
  sync();

  const tick = () => {
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    root.querySelectorAll('[data-clock]').forEach((e) => (e.textContent = t));
  };
  tick();
  setInterval(tick, 5000);
}

type Pt = { x: number; y: number };
const f1 = (v: number) => v.toFixed(1);
/** 流星线的实时几何,供点击飞行取径 */
type RailInfo = { path: SVGPathElement; endX: number; top: number; height: number };
let railInfo: RailInfo | null = null;

/** 三对角线性方程组,Thomas 追赶法,O(n) */
function tridiag(a: number[], b: number[], c: number[], r: number[]): number[] {
  const n = b.length;
  const cp = new Array<number>(n).fill(0);
  const dp = new Array<number>(n).fill(0);
  cp[0] = c[0] / b[0];
  dp[0] = r[0] / b[0];
  for (let i = 1; i < n; i++) {
    const m = b[i] - a[i] * cp[i - 1];
    cp[i] = (c[i] ?? 0) / m;
    dp[i] = (r[i] - a[i] * dp[i - 1]) / m;
  }
  const x = new Array<number>(n).fill(0);
  x[n - 1] = dp[n - 1];
  for (let i = n - 2; i >= 0; i--) x[i] = dp[i] - cp[i] * x[i + 1];
  return x;
}

/**
 * 自然三次样条(弦长参数化):过每个点,切线与曲率处处连续(C²),
 * 是数学意义上的一条光滑曲线,而非逐段拼出来的近似。
 * endDir 给出末端切线方向(单位弦长系),让尾端精确竖直,与下方脊线无缝相接。
 */
function spline(p: Pt[], endDir?: Pt): string {
  const n = p.length - 1; // 段数
  if (n < 1) return '';
  if (n === 1) return `M${f1(p[0].x)} ${f1(p[0].y)} L${f1(p[1].x)} ${f1(p[1].y)}`;
  const h: number[] = [], dx: number[] = [], dy: number[] = [];
  for (let i = 0; i < n; i++) {
    h.push(Math.max(Math.hypot(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y), 0.5));
    dx.push((p[i + 1].x - p[i].x) / h[i]);
    dy.push((p[i + 1].y - p[i].y) / h[i]);
  }
  // 解二阶导 M:首端自然(M₀=0),末端给 endDir 则钳位,否则同样自然
  const N = n + 1;
  const a = new Array<number>(N).fill(0);
  const b = new Array<number>(N).fill(1);
  const c = new Array<number>(N).fill(0);
  const rx = new Array<number>(N).fill(0);
  const ry = new Array<number>(N).fill(0);
  for (let i = 1; i < n; i++) {
    a[i] = h[i - 1];
    b[i] = 2 * (h[i - 1] + h[i]);
    c[i] = h[i];
    rx[i] = 6 * (dx[i] - dx[i - 1]);
    ry[i] = 6 * (dy[i] - dy[i - 1]);
  }
  if (endDir) {
    a[n] = h[n - 1];
    b[n] = 2 * h[n - 1];
    rx[n] = 6 * (endDir.x - dx[n - 1]);
    ry[n] = 6 * (endDir.y - dy[n - 1]);
  }
  const Mx = tridiag(a, b, c, rx);
  const My = tridiag(a, b, c, ry);
  let d = `M${f1(p[0].x)} ${f1(p[0].y)}`;
  for (let i = 0; i < n; i++) {
    // Hermite 端点斜率 → 三次贝塞尔控制点
    const k = h[i] / 6;
    const mx0 = dx[i] - k * (2 * Mx[i] + Mx[i + 1]);
    const my0 = dy[i] - k * (2 * My[i] + My[i + 1]);
    const mx1 = dx[i] + k * (Mx[i] + 2 * Mx[i + 1]);
    const my1 = dy[i] + k * (My[i] + 2 * My[i + 1]);
    d += ` C${f1(p[i].x + (mx0 * h[i]) / 3)} ${f1(p[i].y + (my0 * h[i]) / 3)}`
      + ` ${f1(p[i + 1].x - (mx1 * h[i]) / 3)} ${f1(p[i + 1].y - (my1 * h[i]) / 3)}`
      + ` ${f1(p[i + 1].x)} ${f1(p[i + 1].y)}`;
  }
  return d;
}

const STAR = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .4 9.05 6.95 15.6 8 9.05 9.05 8 15.6 6.95 9.05.4 8 6.95 6.95Z"/></svg>`;

/** 点击索引:词收成星,沿「流星线余段 → 脊线 → 挂线」抵达栏目,落点炸开、两旁绽星 */
function bindFlight(rows: HTMLAnchorElement[], reduced: boolean) {
  let flying = false;
  for (const row of rows) {
    row.addEventListener('click', (ev) => {
      if (ev.button !== 0 || ev.metaKey || ev.ctrlKey || ev.shiftKey || ev.altKey) return;
      const id = row.getAttribute('href')?.replace(/^#/, '');
      const target = id ? document.getElementById(id) : null;
      if (!target || reduced) return;
      ev.preventDefault();
      if (flying) return;
      flying = true;

      const head = (target.querySelector('h2') ?? target) as HTMLElement;
      const h2r = head.getBoundingClientRect();
      const headDocTop = head.getBoundingClientRect().top + scrollY;
      const from = (row.querySelector('.nd') ?? row).getBoundingClientRect();
      const sy = scrollY;
      const barH = document.querySelector('.bar')?.getBoundingClientRect().height ?? 0;
      const startY = window.scrollY;
      const destY = Math.max(0, headDocTop - barH - 12);
      // 标题最终停留的文档坐标:sticky 钉住时取钉住位
      const stickyTop = parseFloat(getComputedStyle(head).top);
      const headFinalTop = Number.isFinite(stickyTop) ? Math.max(stickyTop + destY, headDocTop) : headDocTop;
      const endYDoc = headFinalTop + (h2r.top + sy - headDocTop) + h2r.height / 2;
      const endXDoc = h2r.left - 12;
      const x0 = from.left + from.width / 2;
      const y0Doc = from.top + sy + from.height / 2;

      // 分段路线:星沿真实轨道走;窄屏无轨时兜底走直线
      type Leg = { len: number; at: (p: number) => [number, number] };
      const legs: Leg[] = [];
      const ri = railInfo && !matchMedia('(max-width: 860px)').matches ? railInfo : null;
      if (ri) {
        const L = ri.path.getTotalLength();
        // 圆点在线上的投影:飞行由此汇入流星线
        let s0 = 0;
        let bd = Infinity;
        for (let i = 0; i <= 160; i++) {
          const slen = (L * i) / 160;
          const q = ri.path.getPointAtLength(slen);
          const d = (q.x - x0) ** 2 + (q.y + ri.top - y0Doc) ** 2;
          if (d < bd) { bd = d; s0 = slen; }
        }
        const yRailEnd = ri.top + ri.height - 1;
        legs.push({
          len: Math.max(1, L - s0),
          at: (p) => {
            const q = ri.path.getPointAtLength(s0 + p);
            return [q.x, q.y + ri.top];
          },
        });
        legs.push({ len: Math.max(1, endYDoc - yRailEnd), at: (p) => [ri.endX, yRailEnd + p] });
        legs.push({ len: Math.max(1, endXDoc - ri.endX), at: (p) => [ri.endX + p, endYDoc] });
      } else {
        legs.push({ len: 1, at: (p) => [x0 + (endXDoc - x0) * p, y0Doc + (endYDoc - y0Doc) * p] });
      }
      const total = legs.reduce((n, l) => n + l.len, 0);
      const at = (p: number): [number, number] => {
        let s = Math.max(0, Math.min(1, p)) * total;
        for (const l of legs) {
          if (s <= l.len) return l.at(s);
          s -= l.len;
        }
        const last = legs[legs.length - 1];
        return last.at(last.len);
      };

      const star = document.createElement('div');
      star.className = 'fly-star';
      star.innerHTML = STAR;
      const [sx, sy0] = at(0);
      star.style.opacity = '0';
      star.style.transform = `translate(${sx}px, ${sy0}px) translate(-50%, -50%) scale(0.45)`;
      document.body.appendChild(star);
      row.classList.add('depart');

      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      const DUR = 900;
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        window.scrollTo(0, startY + (destY - startY) * e);
        // 星先胀后敛,落地前收定速率,无中途折向
        const sc = 0.55 + 0.4 * Math.sin((Math.PI * Math.min(t / 0.88, 1)));
        const op = t < 0.07 ? t / 0.07 : 1;
        const [x, y] = at(e);
        star.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
        star.style.opacity = op.toFixed(3);
        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }
        // 到站:星炸成星芒淡出,标题两旁同步绽出小星(与 hero hover 同款)
        head.classList.remove('star-hit');
        void head.offsetWidth;
        head.classList.add('star-hit');
        setTimeout(() => head.classList.remove('star-hit'), 1000);
        star.animate(
          [
            { transform: `translate(${endXDoc}px, ${endYDoc}px) translate(-50%, -50%) scale(0.55)`, opacity: 1 },
            { transform: `translate(${endXDoc}px, ${endYDoc}px) translate(-50%, -50%) scale(2.3)`, opacity: 0 },
          ],
          { duration: 460, easing: 'cubic-bezier(0.16, 0.84, 0.3, 1)' },
        ).onfinish = () => star.remove();
        row.classList.remove('depart');
        root.style.scrollBehavior = prev;
        history.pushState(null, '', `#${id}`);
        flying = false;
      };
      requestAnimationFrame(frame);
    });
  }
}

/** 星轨:C² 自然样条过每个节点,尾端竖直落入页面脊线。加载时自流星头描画一次。 */
export function initHeroRail() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const rows = [...(hero?.querySelectorAll<HTMLAnchorElement>('.hero-fall .row') ?? [])];
  if (!hero || rows.length < 3) return;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
  bindFlight(rows, reduced);

  const svg = hero.querySelector<SVGSVGElement>('.sky');
  const rail = svg?.querySelector<SVGPathElement>('.rail');
  const glow = svg?.querySelector<SVGPathElement>('.rail-glow');
  if (!svg || !rail || !glow) return;
  const paths = [glow, rail];
  let intro: Animation[] | null = null;
  let introduced = false;

  const draw = () => {
    if (matchMedia('(max-width: 860px)').matches) {
      document.documentElement.style.removeProperty('--rail-x');
      railInfo = null;
      // 横竖屏切换:桌面分支画过的曲线要整条撤掉,不能留残像
      if (intro) {
        for (const a of intro) a.cancel();
        intro = null;
        for (const p of paths) p.style.strokeDasharray = '';
      }
      for (const p of paths) p.removeAttribute('d');
      return;
    }
    const hb = hero.getBoundingClientRect();
    const nodes: Pt[] = rows.map((r) => {
      const b = r.querySelector('.nd')!.getBoundingClientRect();
      return { x: b.left + b.width / 2 - hb.left, y: b.top + b.height / 2 - hb.top };
    });
    if (!hb.width || nodes.some((n) => !n.y)) return;

    const n0 = nodes[0];
    const nL = nodes[nodes.length - 1];
    const wrap = hero.querySelector('.wrap');
    const wb = wrap?.getBoundingClientRect();
    const padL = wrap ? parseFloat(getComputedStyle(wrap).paddingLeft) || 16 : 16;
    const endX = Math.max(12, (wb ? wb.left - hb.left : 0) + Math.min(14, padL * 0.35));
    const endY = hb.height - 1;
    // 流星头:沿进入方向逆推一小段,借纵向渐变淡出,像刚落到第一个词上
    const d01 = Math.hypot(n0.x - nodes[1].x, n0.y - nodes[1].y);
    const headLen = Math.min(d01 * 0.45, hb.height * 0.2);
    const head: Pt = { x: n0.x + ((n0.x - nodes[1].x) / d01) * headLen, y: n0.y + ((n0.y - nodes[1].y) / d01) * headLen };
    // 尾端两点同在 x=endX,配合竖直钳位切线,轨迹拐进脊线时没有折角
    const drop = endY - nL.y;
    const pts: Pt[] = [head, ...nodes, { x: endX, y: nL.y + drop * 0.55 }, { x: endX, y: endY }];
    const d = spline(pts, { x: 0, y: 1 });
    document.documentElement.style.setProperty('--rail-x', `${endX.toFixed(1)}px`);
    document.documentElement.style.setProperty('--hero-h', `${Math.round(hb.height)}px`);

    svg.setAttribute('viewBox', `0 0 ${Math.round(hb.width)} ${Math.round(hb.height)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    railInfo = { path: rail, endX, top: hb.top + scrollY, height: hb.height };
    // 挂线几何:脊线节点到各栏目标题的水平引线
    document.querySelectorAll<HTMLElement>('.home .sec > .head').forEach((h) => {
      const h2 = h.querySelector('h2');
      if (!h2) return;
      const r = h.getBoundingClientRect();
      const q = h2.getBoundingClientRect();
      h.style.setProperty('--hang-w', `${Math.max(10, r.left - endX).toFixed(1)}px`);
      h.style.setProperty('--hang-y', `${(q.top - r.top + q.height / 2).toFixed(1)}px`);
    });
    // 路径重算(字体就绪/resize)前先撤掉进行中的描画虚线,避免新旧长度错位
    if (intro) {
      for (const a of intro) a.cancel();
      intro = null;
      for (const p of paths) p.style.strokeDasharray = '';
    }
    for (const p of paths) p.setAttribute('d', d);
    if (!reduced && !introduced) {
      introduced = true;
      intro = paths.map((p) => {
        const len = p.getTotalLength();
        p.style.strokeDasharray = `${len}`;
        return p.animate(
          [{ strokeDashoffset: len }, { strokeDashoffset: 0 }],
          { duration: 1700, delay: 300, easing: 'cubic-bezier(0.55, 0.06, 0.25, 1)', fill: 'backwards' },
        );
      });
      Promise.allSettled(intro.map((x) => x.finished)).then(() => {
        if (intro) {
          for (const p of paths) p.style.strokeDasharray = '';
          intro = null;
        }
      });
    }
  };

  draw();
  addEventListener('resize', draw);
  document.fonts?.ready.then(draw);
}

/** 脊线悬停:光标高度亮起一颗带向上尾迹的星,点击顺线飞回顶部 */
export function initRise() {
  const rise = document.querySelector<HTMLElement>('.rise');
  const hero = document.querySelector<HTMLElement>('.hero');
  if (!rise || !hero || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  // 脊线自 hero 底部开始;条只在真实线段上可命中,hero 暗区不出现手型/链接预览/点击
  const onRail = (clientY: number) => clientY > hero.getBoundingClientRect().height - scrollY + 6;
  const sync = (clientY: number | null) => {
    const on = clientY !== null && onRail(clientY) && clientXInStrip;
    rise.classList.toggle('on-rail', on);
    rise.style.pointerEvents = on ? 'auto' : 'none';
    if (on) rise.style.setProperty('--ry', `${(clientY! - rise.getBoundingClientRect().top).toFixed(1)}px`);
  };
  let clientXInStrip = false;
  window.addEventListener(
    'pointermove',
    (e) => {
      const r = rise.getBoundingClientRect();
      clientXInStrip = e.clientX >= r.left && e.clientX <= r.right;
      sync(e.clientY);
    },
    { passive: true },
  );
  rise.addEventListener('pointerleave', () => rise.classList.remove('on-rail'));
  // 键盘聚焦时按星默认高度判断是否处于线段上
  rise.addEventListener(
    'focus',
    () => rise.classList.toggle('on-rail', onRail(innerHeight * 0.6)),
    { once: false },
  );
  rise.addEventListener('click', () => {
    if (!rise.classList.contains('on-rail')) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const mark = rise.querySelector<HTMLElement>('.rise-star');
    if (!mark) return;
    const from = parseFloat(rise.style.getPropertyValue('--ry')) || rise.getBoundingClientRect().height * 0.6;
    mark.animate(
      [
        { transform: `translate(28px, ${from}px) translate(-50%, -50%) scale(1)`, opacity: 1 },
        { transform: 'translate(28px, -44px) translate(-50%, -50%) scale(0.45)', opacity: 0 },
      ],
      { duration: 640, easing: 'cubic-bezier(0.5, 0, 0.6, 1)' },
    );
  });
  rise.style.pointerEvents = 'none';
}
