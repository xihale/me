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

const STAR = `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 .4 9.05 6.95 15.6 8 9.05 9.05 8 15.6 6.95 9.05.4 8 6.95 6.95Z"/></svg>`;

/** 点击索引:词收成一颗星,飞到对应栏目标题上,然后消失 */
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

      const head = target.querySelector('h2') ?? target;
      const from = (row.querySelector('.nd') ?? row).getBoundingClientRect();
      const hr = head.getBoundingClientRect();
      const barH = document.querySelector('.bar')?.getBoundingClientRect().height ?? 0;
      const startY = window.scrollY;
      const destY = Math.max(0, hr.top + startY - barH - 12);
      const x0 = from.left + from.width / 2;
      const y0 = from.top + from.height / 2;
      const x1 = hr.left + 6;
      const y1 = barH + 12 + hr.height / 2;

      const star = document.createElement('div');
      star.className = 'fly-star';
      star.innerHTML = STAR;
      star.style.opacity = '0';
      star.style.transform = `translate(${x0}px, ${y0}px) translate(-50%, -50%) scale(0.45)`;
      document.body.appendChild(star);
      row.classList.add('depart');

      const root = document.documentElement;
      const prev = root.style.scrollBehavior;
      root.style.scrollBehavior = 'auto';
      const DUR = 820;
      const t0 = performance.now();
      const frame = (now: number) => {
        const t = Math.min(1, (now - t0) / DUR);
        const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
        window.scrollTo(0, startY + (destY - startY) * e);
        const sc = t < 0.55 ? 0.55 + t * 0.8 : 1 - (t - 0.55) * 1.3;
        const op = t < 0.08 ? t / 0.08 : t > 0.86 ? (1 - t) / 0.14 : 1;
        star.style.transform = `translate(${x0 + (x1 - x0) * e}px, ${y0 + (y1 - y0) * e}px) translate(-50%, -50%) scale(${sc.toFixed(3)})`;
        star.style.opacity = op.toFixed(3);
        if (t < 1) {
          requestAnimationFrame(frame);
          return;
        }
        star.remove();
        row.classList.remove('depart');
        root.style.scrollBehavior = prev;
        history.pushState(null, '', `#${id}`);
        flying = false;
      };
      requestAnimationFrame(frame);
    });
  }
}

/** 星轨:穿过节点的一条连贯尾迹,末端沿左边落到画面底。没有流动的光段。 */
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

  const draw = () => {
    if (matchMedia('(max-width: 860px)').matches) {
      document.documentElement.style.removeProperty('--rail-x');
      return;
    }
    const hb = hero.getBoundingClientRect();
    const nodes: Pt[] = rows.map((r) => {
      const b = r.querySelector('.nd')!.getBoundingClientRect();
      return { x: b.left + b.width / 2 - hb.left, y: b.top + b.height / 2 - hb.top };
    });
    if (!hb.width || nodes.some((n) => !n.y)) return;

    const nL = nodes[nodes.length - 1];
    const wrap = hero.querySelector('.wrap');
    const wb = wrap?.getBoundingClientRect();
    const padL = wrap ? parseFloat(getComputedStyle(wrap).paddingLeft) || 16 : 16;
    const endX = Math.max(12, (wb ? wb.left - hb.left : 0) + Math.min(14, padL * 0.35));
    const endY = hb.height - 1;
    const d = spline(nodes)
      + ` C${f1(nL.x)} ${f1(nL.y + 40)} ${f1(endX)} ${f1(nL.y + (endY - nL.y) * 0.5)} ${f1(endX)} ${f1(endY)}`;
    document.documentElement.style.setProperty('--rail-x', `${endX.toFixed(1)}px`);
    document.documentElement.style.setProperty('--hero-h', `${Math.round(hb.height)}px`);

    svg.setAttribute('viewBox', `0 0 ${Math.round(hb.width)} ${Math.round(hb.height)}`);
    svg.setAttribute('preserveAspectRatio', 'none');
    for (const p of paths) p.setAttribute('d', d);
  };

  draw();
  addEventListener('resize', draw);
  document.fonts?.ready.then(draw);
}
