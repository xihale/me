type Dev = { kind: string; name: string };

export function initCabinet() {
  const root = document.getElementById('cabinet');
  if (!root) return;
  const devs: Dev[] = JSON.parse(document.getElementById('dev-data')!.textContent || '[]');
  const i = document.getElementById('cap-i')!, n = document.getElementById('cap-n')!;
  const step = document.getElementById('cap-step');
  const gBars = [...root.querySelectorAll<HTMLElement>('.g-bar')];
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
      if (step) step.textContent = `${String(idx + 1).padStart(2, '0')} / 07`;
      gBars.forEach((b, j) => b.classList.toggle('on', j === idx));
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

  gBars.forEach((bar, idx) => {
    bar.addEventListener('click', () => {
      if (!scrollx || !marks[idx]) return;
      const m = marks[idx];
      const box = scrollx.getBoundingClientRect();
      scrollx.scrollTo({
        left: m.getBoundingClientRect().left - box.left + scrollx.scrollLeft - scrollx.clientWidth / 2,
        behavior: 'smooth',
      });
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

  // 没有封面的项目:用名字做种子画一张 Julia 集,只取 alpha 当 mask,颜色跟随主题
  const frac = (seed: string) => {
    let h = 2166136261;
    for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
    const SETS = [[-0.8, 0.156], [-0.4, 0.6], [0.285, 0.01], [-0.70176, -0.3842], [-0.835, -0.2321], [0.355, 0.355], [-0.7269, 0.1889]];
    const [cx, cy] = SETS[(h >>> 0) % SETS.length];
    const W = 256, H = 160, sc = 1.35, max = 32;
    const cv = document.createElement('canvas');
    cv.width = W; cv.height = H;
    const px = cv.getContext('2d')!.createImageData(W, H);
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      let zx = (x / W - 0.5) * sc * 2 * (W / H), zy = (y / H - 0.5) * sc * 2, n = 0;
      while (n < max && zx * zx + zy * zy < 4) { const nx = zx * zx - zy * zy + cx; zy = 2 * zx * zy + cy; zx = nx; n++; }
      px.data[(y * W + x) * 4 + 3] = n === max ? 255 : Math.round((n / max) ** 0.6 * 210);
    }
    cv.getContext('2d')!.putImageData(px, 0, 0);
    return cv.toDataURL();
  };
  tiles.forEach((t) => {
    const c = t.querySelector<HTMLCanvasElement>('.frac');
    if (!c) return;
    const url = `url("${frac(t.dataset.name!)}")`;
    c.style.maskImage = url;
    c.style.setProperty('-webkit-mask-image', url);
  });

  const sheet = document.getElementById('sheet') as HTMLDialogElement | null;
  const sImg = document.getElementById('sheet-img');
  const sCat = document.getElementById('sheet-cat');
  const sHost = document.getElementById('sheet-host');
  const sName = document.getElementById('sheet-name');
  const sDesc = document.getElementById('sheet-desc');
  const sBtn = document.getElementById('sheet-btn') as HTMLAnchorElement | null;
  const sClose = document.getElementById('sheet-close');
  const fine = matchMedia('(hover: hover) and (min-width: 861px)');

  if (sheet) {
    sClose?.addEventListener('click', () => sheet.close());
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      sheet.addEventListener('click', (event) => {
        if (event.target !== sheet) return;
        const rect = sheet.getBoundingClientRect();
        const inContent =
          rect.top <= event.clientY &&
          event.clientY <= rect.top + rect.height &&
          rect.left <= event.clientX &&
          event.clientX <= rect.left + rect.width;
        if (!inContent) sheet.close();
      });
    }
  }

  tiles.forEach((t) => {
    t.addEventListener('click', (ev) => {
      if (fine.matches || !sheet) return;
      ev.preventDefault();
      const d = t.dataset;
      if (sImg) sImg.innerHTML = d.img ? `<img src="${d.img}" alt="${d.name}" />` : `<b>${d.sym}</b>`;
      if (sCat) sCat.textContent = d.cat || '';
      if (sHost) sHost.textContent = d.host || '';
      if (sName) sName.textContent = d.name || '';
      if (sDesc) sDesc.textContent = d.desc || '';
      if (sBtn) sBtn.href = t.href;
      sheet.showModal();
    });
  });
}
