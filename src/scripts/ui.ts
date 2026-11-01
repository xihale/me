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

/** Catmull-Rom 转三次贝塞尔:过每一个点,切线取邻点差,整条无折角 */
function spline(p: Pt[]) {
  let d = `M${f1(p[0].x)} ${f1(p[0].y)}`;
  for (let i = 0; i < p.length - 1; i++) {
    const a = p[i - 1] ?? p[i], b = p[i], c = p[i + 1], e = p[i + 2] ?? p[i + 1];
    d += ` C${f1(b.x + (c.x - a.x) / 6)} ${f1(b.y + (c.y - a.y) / 6)} ${f1(c.x - (e.x - b.x) / 6)} ${f1(c.y - (e.y - b.y) / 6)} ${f1(c.x)} ${f1(c.y)}`;
  }
  return d;
}

/** 星轨:穿过五枚节点的实测中心,两端沿同一条抛物线甩出画外;流星沿它自右上滑向左下 */
export function initHeroRail() {
  const hero = document.querySelector<HTMLElement>('.hero');
  const svg = hero?.querySelector<SVGSVGElement>('.sky');
  const rows = [...(hero?.querySelectorAll<HTMLAnchorElement>('.hero-fall .row') ?? [])];
  if (!hero || !svg || rows.length < 3) return;

  const rail = svg.querySelector<SVGPathElement>('.rail');
  const group = svg.querySelector<SVGGElement>('.comet-g');
  const glow = svg.querySelector<SVGPathElement>('.comet-glow');
  const mid = svg.querySelector<SVGPathElement>('.comet-mid');
  const core = svg.querySelector<SVGPathElement>('.comet-core');
  if (!rail || !group || !glow || !mid || !core) return;
  const paths = [...svg.querySelectorAll<SVGPathElement>('path')];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  let frac: number[] = [];
  const lit: boolean[] = [];

  const draw = () => {
    if (matchMedia('(max-width: 860px)').matches) return;
    const hb = hero.getBoundingClientRect();
    const nodes: Pt[] = rows.map((r) => {
      const b = r.querySelector('.nd')!.getBoundingClientRect();
      return { x: b.left + b.width / 2 - hb.left, y: b.top + b.height / 2 - hb.top };
    });
    if (!hb.width || nodes.some((n) => !n.y)) return;

    // x(y)=ay²+by+c 由首、中、末三点定形;两端顺它延到画面之外
    const [n0, , n2, , n4] = nodes;
    const h = n2.y - n0.y || 1;
    const a = (n0.x - 2 * n2.x + n4.x) / (2 * h * h);
    const b = (n2.x - n0.x - a * (n2.y ** 2 - n0.y ** 2)) / (n2.y - n0.y);
    const at = (y: number) => a * y * y + b * y + n0.x - a * n0.y ** 2 - b * n0.y;
    const yTop = n0.y - Math.max(260, hb.height * 0.45);
    const yEnd = n4.y + Math.max(150, hb.height * 0.18);
    const pts: Pt[] = [{ x: at(yTop), y: yTop }, ...nodes, { x: at(yEnd), y: yEnd }];

    const d = spline(pts);
    svg.setAttribute('viewBox', `0 0 ${Math.round(hb.width)} ${Math.round(hb.height)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    for (const p of paths) p.setAttribute('d', d);

    // 每个节点落在整条路径的哪个位置(0..1)
    const L = rail.getTotalLength();
    const N = 720;
    const samples = Array.from({ length: N + 1 }, (_, i) => rail.getPointAtLength((L * i) / N));
    frac = nodes.map((n) => {
      let best = 0, bd = Infinity;
      for (let i = 0; i < samples.length; i++) {
        const dd = (samples[i].x - n.x) ** 2 + (samples[i].y - n.y) ** 2;
        if (dd < bd) { bd = dd; best = i; }
      }
      return best / N;
    });
  };

  draw();
  addEventListener('resize', draw);
  document.fonts?.ready.then(draw);
  if (reduced) return;

  // 流星:9s 一圈;头部经过某个节点时,把那一行点亮
  const CYCLE = 9000, TRAVEL = 1016, OFF = 34, HEAD = 116;
  const narrow = matchMedia('(max-width: 860px)');
  let t0 = 0;
  const tick = (now: number) => {
    if (!t0) t0 = now;
    if (narrow.matches) {
      requestAnimationFrame(tick);
      return;
    }
    const p = (((now - t0) % CYCLE) + CYCLE) % CYCLE / CYCLE;
    const off = OFF - TRAVEL * p;
    const off1 = `${off.toFixed(2)}`;
    glow.style.strokeDashoffset = off1;
    mid.style.strokeDashoffset = off1;
    core.style.strokeDashoffset = `${(off - HEAD).toFixed(2)}`;
    const fade = Math.max(0, Math.min((p - 0.03) / 0.13, (0.97 - p) / 0.09, 1));
    group.style.opacity = fade.toFixed(3);
    const head = (TRAVEL * p + HEAD) / 1000;
    for (let i = 0; i < rows.length; i++) {
      const on = frac.length > i && Math.abs(head - frac[i]) < 0.04;
      if (on !== lit[i]) {
        lit[i] = on;
        rows[i].classList.toggle('lit', on);
      }
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}
