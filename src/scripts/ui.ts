type Dev = { kind: string; name: string };

export function initCabinet() {
  const root = document.getElementById('cabinet');
  if (!root) return;
  const devs: Dev[] = JSON.parse(document.getElementById('dev-data')!.textContent || '[]');
  const i = document.getElementById('cap-i')!, n = document.getElementById('cap-n')!;
  const els = [...root.querySelectorAll<SVGGElement>('.dev')];
  const scrollx = root.querySelector<HTMLElement>('.scrollx');
  const marks = [...root.querySelectorAll<HTMLElement>('.snap')];
  const svg = root.querySelector<SVGSVGElement>('svg');
  const stage = root.querySelector<HTMLElement>('.stage');
  // 窄屏:一件一屏,标题跟随居中那一件
  const narrow = matchMedia('(max-width: 860px)');
  let queued = 0;

  const show = (k: number | null) => {
    els.forEach((e, j) => e.classList.toggle('on', j === k));
    if (k === null) { i.textContent = ''; n.textContent = ''; return; }
    const d = devs[k];
    i.textContent = `${String(k + 1).padStart(2, '0')} · ${d.kind}`;
    n.textContent = d.name;
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

  root.addEventListener('pointerleave', () => { if (!narrow.matches) show(null); });
  root.addEventListener('focusout', (ev) => {
    if (!narrow.matches && !root.contains((ev as FocusEvent).relatedTarget as Node)) show(null);
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

export function initProjects() {
  const grid = document.getElementById('tiles');
  if (!grid) return;
  const tiles = [...grid.querySelectorAll<HTMLAnchorElement>('.tile')];
  const chips = [...document.querySelectorAll<HTMLButtonElement>('.filter [data-cat]')];
  chips.forEach((c) =>
    c.addEventListener('click', () => {
      const cat = c.dataset.cat!;
      chips.forEach((x) => x.classList.toggle('on', x === c));
      tiles.forEach((t) => t.classList.toggle('dim', cat !== '*' && t.dataset.cat !== cat));
    })
  );

  const peek = document.getElementById('peek')!;
  const pimg = peek.querySelector('.pimg') as HTMLElement;
  const pn = peek.querySelector('.pn') as HTMLElement;
  const pd = peek.querySelector('.pd') as HTMLElement;
  const ph = peek.querySelector('.ph') as HTMLElement;
  const fine = matchMedia('(hover: hover) and (min-width: 861px)');
  const open = (t: HTMLElement) => {
    if (!fine.matches) return;
    const d = t.dataset;
    pimg.innerHTML = d.img ? `<img src="${d.img}" alt="" />` : `<b>${d.sym}</b>`;
    pn.textContent = d.name!;
    pd.textContent = d.desc!;
    ph.textContent = d.host!;
    const r = t.getBoundingClientRect();
    const w = 300, h = peek.offsetHeight || 260;
    let x = r.right + 10;
    if (x + w > innerWidth - 12) x = r.left - w - 10;
    let y = r.top - 8;
    y = Math.max(72, Math.min(y, innerHeight - h - 12));
    peek.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    peek.classList.add('show');
  };
  const close = () => peek.classList.remove('show');
  tiles.forEach((t) => {
    t.addEventListener('pointerenter', () => open(t));
    t.addEventListener('focus', () => open(t));
    t.addEventListener('pointerleave', close);
    t.addEventListener('blur', close);
  });
  addEventListener('scroll', close, { passive: true });
}
