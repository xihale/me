type Dev = { kind: string; name: string; on: string };

export function initCabinet() {
  const root = document.getElementById('cabinet');
  if (!root) return;
  const devs: Dev[] = JSON.parse(document.getElementById('dev-data')!.textContent || '[]');
  const i = document.getElementById('cap-i')!, n = document.getElementById('cap-n')!, on = document.getElementById('cap-on')!;
  const els = [...root.querySelectorAll<SVGGElement>('.dev')];
  const show = (k: number | null) => {
    els.forEach((e, j) => e.classList.toggle('on', j === k));
    if (k === null) { i.textContent = '00'; n.textContent = n.dataset.def!; on.textContent = on.dataset.def!; return; }
    const d = devs[k];
    i.textContent = `${String(k + 1).padStart(2, '0')} · ${d.kind}`;
    n.textContent = d.name;
    on.textContent = `屏幕上：${d.on}`;
  };
  els.forEach((e, k) => {
    e.addEventListener('pointerenter', () => show(k));
    e.addEventListener('focus', () => show(k));
    e.addEventListener('click', () => show(k));
  });
  root.addEventListener('pointerleave', () => show(null));
  root.addEventListener('focusout', (ev) => { if (!root.contains((ev as FocusEvent).relatedTarget as Node)) show(null); });

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
  const chips = [...document.querySelectorAll<HTMLButtonElement>('[data-cat]')];
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
