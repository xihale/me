export { initHeroRail, initRise } from './rail';

type Dev = { kind: string; name: string };

export function initCabinet() {
  const root = document.getElementById('cabinet');
  if (!root) return;
  const devs: Dev[] = JSON.parse(document.getElementById('dev-data')!.textContent || '[]');
  const i = document.getElementById('cap-i')!, n = document.getElementById('cap-n')!;
  const cnt = document.getElementById('cap-cnt');
  const prevBtn = document.getElementById('cap-prev');
  const nextBtn = document.getElementById('cap-next');
  const btns = [...root.querySelectorAll<HTMLButtonElement>('.dev-btn')];
  const scaleItems = [...root.querySelectorAll<SVGGElement>('.ms-dev')];
  const scaleSvg = root.querySelector<SVGSVGElement>('.m-scale-svg');
  const els = [...root.querySelectorAll<SVGGElement>('.dev')];
  const scrollxs = [...root.querySelectorAll<HTMLElement>('.scrollx')];
  const marks = [...root.querySelectorAll<HTMLElement>('.snap')];
  // 窄屏:一件一屏,标题跟随居中那一件
  const narrow = matchMedia('(max-width: 860px)');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  let queued = 0;
  let current = 0;
  let hovering = false;
  let focused = false;
  let inView = true;
  let bag: number[] = [];

  const nextRandom = () => {
    if (devs.length <= 1) return 0;
    if (!bag.length) {
      bag = devs.map((_, idx) => idx).filter((idx) => idx !== current);
      for (let j = bag.length - 1; j > 0; j--) {
        const k = Math.floor(Math.random() * (j + 1));
        [bag[j], bag[k]] = [bag[k], bag[j]];
      }
    }
    return bag.pop()!;
  };

  const show = (k: number | null) => {
    const idx = Math.max(0, Math.min(devs.length - 1, k ?? 0));
    current = idx;
    els.forEach((e, j) => e.classList.toggle('on', j === idx));
    scaleItems.forEach((s, j) => s.classList.toggle('on', j === idx));
    const d = devs[idx];
    if (d) {
      i.textContent = `${String(idx + 1).padStart(2, '0')} · ${d.kind}`;
      n.textContent = d.name;
      if (cnt) cnt.textContent = `${String(idx + 1).padStart(2, '0')} / ${String(devs.length).padStart(2, '0')}`;
      btns.forEach((b, j) => {
        b.classList.toggle('on', j === idx);
        b.setAttribute('aria-pressed', String(j === idx));
      });
    }
  };

  const centerInTrack = (idx: number, smooth = true) => {
    const dev = els[idx];
    const track = dev?.closest<HTMLElement>('.scrollx');
    if (!dev || !track) return;
    if (track.scrollWidth <= track.clientWidth + 1) return;
    const fig = dev.querySelector<SVGGraphicsElement>('.lift') ?? dev;
    const figRect = fig.getBoundingClientRect();
    const trackRect = track.getBoundingClientRect();
    const figCenter = figRect.left - trackRect.left + track.scrollLeft + figRect.width / 2;
    const targetLeft = Math.max(
      0,
      Math.min(track.scrollWidth - track.clientWidth, figCenter - trackRect.width / 2),
    );
    if (Math.abs(targetLeft - track.scrollLeft) < 1) return;
    track.scrollTo({
      left: targetLeft,
      behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto',
    });
  };

  const ensureInView = (idx: number, smooth = true) => {
    const dev = els[idx];
    const shelf = dev?.closest<HTMLElement>('.scrollx');
    if (!shelf) return;
    const bar = document.querySelector<HTMLElement>('.bar');
    const topSafe = (bar ? bar.getBoundingClientRect().bottom : 68) + 12;
    const bottomSafe = window.innerHeight - 16;
    const shelfRect = shelf.getBoundingClientRect();
    const capRect = root.querySelector<HTMLElement>('.cap')?.getBoundingClientRect();
    const topEdge = capRect ? Math.min(capRect.top, shelfRect.top) : shelfRect.top;
    const bottomEdge = capRect ? Math.max(capRect.bottom, shelfRect.bottom) : shelfRect.bottom;

    if (topEdge >= topSafe && bottomEdge <= bottomSafe) return;

    const avail = bottomSafe - topSafe;
    let delta = 0;
    if (bottomEdge - topEdge <= avail) {
      delta = topEdge < topSafe ? topEdge - topSafe : bottomEdge - bottomSafe;
    } else if (shelfRect.top < topSafe) {
      delta = shelfRect.top - topSafe;
    } else if (shelfRect.bottom > bottomSafe) {
      delta = shelfRect.height <= avail ? shelfRect.bottom - bottomSafe : shelfRect.top - topSafe;
    }

    if (Math.abs(delta) > 1) {
      window.scrollBy({
        top: delta,
        behavior: smooth && !reducedMotion.matches ? 'smooth' : 'auto',
      });
    }
  };

  const scrollToDev = (idx: number, smooth = true) => {
    const clamped = Math.max(0, Math.min(devs.length - 1, idx));
    if (!marks[clamped]) { show(clamped); return; }
    centerInTrack(clamped, smooth);
    if (!narrow.matches) show(clamped);
    ensureInView(clamped, smooth);
  };

  els.forEach((e, k) => {
    e.addEventListener('pointerenter', () => {
      if (!narrow.matches) show(k);
    });
    e.addEventListener('focus', () => {
      show(k);
    });
    e.addEventListener('click', () => {
      if (!narrow.matches) { show(k); return; }
      centerInTrack(k, true);
    });
    e.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        show(k);
      }
    });
  });

  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'ArrowLeft') {
      ev.preventDefault();
      scrollToDev((current - 1 + devs.length) % devs.length);
    } else if (ev.key === 'ArrowRight') {
      ev.preventDefault();
      scrollToDev((current + 1) % devs.length);
    }
  });

  btns.forEach((btn, idx) => {
    btn.addEventListener('click', () => scrollToDev(idx));
  });

  scaleItems.forEach((item, idx) => {
    item.addEventListener('click', () => scrollToDev(idx));
    item.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        scrollToDev(idx);
      }
    });
  });

  // 比例尺滑擦交互:拇指在双排剪影尺上划过即可连贯切换器物
  if (scaleSvg) {
    let scrubbing = false;
    const pickAt = (clientX: number, clientY: number) => {
      let best = 0;
      let minDist = Infinity;
      scaleItems.forEach((g, idx) => {
        const r = g.getBoundingClientRect();
        const d = Math.hypot(r.left + r.width / 2 - clientX, r.top + r.height / 2 - clientY);
        if (d < minDist) { minDist = d; best = idx; }
      });
      if (best !== current) scrollToDev(best);
    };
    scaleSvg.addEventListener('pointerdown', (ev) => {
      scrubbing = true;
      scaleSvg.setPointerCapture?.(ev.pointerId);
      pickAt(ev.clientX, ev.clientY);
    });
    scaleSvg.addEventListener('pointermove', (ev) => {
      if (scrubbing) pickAt(ev.clientX, ev.clientY);
    });
    scaleSvg.addEventListener('pointerup', () => { scrubbing = false; });
    scaleSvg.addEventListener('pointercancel', () => { scrubbing = false; });
  }

  prevBtn?.addEventListener('click', () => {
    scrollToDev((current - 1 + devs.length) % devs.length);
  });
  nextBtn?.addEventListener('click', () => {
    scrollToDev((current + 1) % devs.length);
  });

  root.addEventListener('pointerenter', () => { hovering = true; });
  root.addEventListener('pointerleave', () => { hovering = false; });
  root.addEventListener('focusin', () => { focused = true; });
  root.addEventListener('focusout', (ev) => {
    if (!root.contains((ev as FocusEvent).relatedTarget as Node)) focused = false;
  });

  if ('IntersectionObserver' in window) {
    new IntersectionObserver(
      (entries) => { inView = entries[0]?.isIntersecting ?? true; },
      { threshold: 0.15 },
    ).observe(root);
  }

  // 按每层图形算每件的中心点,并补出两端可居中的余量
  const place = () => {
    scrollxs.forEach((track) => {
      const tSvg = track.querySelector<SVGSVGElement>('.stage > svg');
      const tStage = track.querySelector<HTMLElement>('.stage');
      const tDevs = [...track.querySelectorAll<SVGGElement>('.dev')];
      const tMarks = [...track.querySelectorAll<HTMLElement>('.snap')];
      if (!tSvg || !tStage || tMarks.length !== tDevs.length || !tMarks.length) return;
      const k = tSvg.getBoundingClientRect().width / tSvg.viewBox.baseVal.width;
      tDevs.forEach((g, idx) => {
        const b = g.querySelector<SVGGraphicsElement>('.lift')!.getBBox();
        tMarks[idx].style.left = `${((b.x + b.width / 2) * k).toFixed(2)}px`;
      });
      if (!narrow.matches) { track.style.paddingInline = ''; return; }
      const half = track.clientWidth / 2;
      const first = parseFloat(tMarks[0].style.left);
      const last = parseFloat(tMarks[tMarks.length - 1].style.left);
      track.style.paddingInline = `${Math.max(0, half - first)}px ${Math.max(0, half - (tStage.clientWidth - last))}px`;
    });
  };

  const syncTrack = (track: HTMLElement) => {
    if (!narrow.matches) return;
    const tMarks = [...track.querySelectorAll<HTMLElement>('.snap')];
    if (!tMarks.length) return;
    const box = track.getBoundingClientRect();
    const mid = track.scrollLeft + track.clientWidth / 2;
    let best = Number(tMarks[0].dataset.i || 0);
    let near = Infinity;
    tMarks.forEach((m) => {
      const d = Math.abs(m.getBoundingClientRect().left - box.left + track.scrollLeft - mid);
      if (d < near) { near = d; best = Number(m.dataset.i || 0); }
    });
    show(best);
  };

  scrollxs.forEach((track) => {
    track.addEventListener('scroll', () => {
      cancelAnimationFrame(queued);
      queued = requestAnimationFrame(() => syncTrack(track));
    }, { passive: true });
  });
  addEventListener('resize', () => { place(); if (scrollxs[0]) syncTrack(scrollxs[0]); });
  narrow.addEventListener('change', () => { place(); if (scrollxs[0]) syncTrack(scrollxs[0]); });
  place();

  const startIdx = Math.floor(Math.random() * devs.length);
  show(startIdx);
  if (narrow.matches) {
    centerInTrack(startIdx, false);
  }

  // 桌面端空闲时随机轮换陈列器物（不锁定在某一件）
  setInterval(() => {
    if (narrow.matches || hovering || focused || !inView || document.hidden || reducedMotion.matches) return;
    show(nextRandom());
  }, 4200);

  const tick = () => {
    const d = new Date();
    const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    root.querySelectorAll('[data-clock]').forEach((e) => (e.textContent = t));
  };
  tick();
  setInterval(tick, 5000);
}
