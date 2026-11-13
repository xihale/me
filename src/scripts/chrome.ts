export function initChrome() {
  const bar = document.querySelector<HTMLElement>('.bar');
  if (bar?.hasAttribute('data-idle')) {
    const atTop = () => bar.classList.toggle('top', scrollY < innerHeight * 0.55);
    atTop();
    addEventListener('scroll', atTop, { passive: true });
  }

  const markBelow = () => document.body.classList.toggle('below', scrollY > innerHeight * 0.62);
  markBelow();
  addEventListener('scroll', markBelow, { passive: true });

  // 左侧脊线随阅读视线向下点亮,底轴全程不断线,不缩放节点星芒
  const homeBody = document.querySelector<HTMLElement>('.home-body');
  if (homeBody && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const syncLit = () => {
      const lit = Math.max(120, innerHeight * 0.62 - homeBody.getBoundingClientRect().top);
      homeBody.style.setProperty('--rail-lit', `${Math.round(lit)}px`);
    };
    syncLit();
    addEventListener('scroll', syncLit, { passive: true });
    addEventListener('resize', syncLit, { passive: true });
  }

  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.bar nav a')].filter((a) =>
    a.getAttribute('href')?.startsWith('#')
  );
  const secs = navLinks.map((a) => document.querySelector<HTMLElement>(a.getAttribute('href')!));
  const spy = () => {
    // 判据与落点同一把尺:章节顶边越过视口 24% 线即视为当前节点
    const line = innerHeight * 0.24;
    let id = '';
    for (const s of secs) if (s && s.getBoundingClientRect().top <= line) id = s.id;
    for (const a of navLinks) a.classList.toggle('on', a.getAttribute('href') === `#${id}`);
    for (const s of secs) s?.querySelector('.head')?.classList.toggle('on', s.id === id);
  };
  spy();
  addEventListener('scroll', spy, { passive: true });

  const io = new IntersectionObserver(
    (es) => {
      es.forEach((e) => {
        if (e.isIntersecting) {
          e.target.classList.add('in');
          io.unobserve(e.target);
        }
      });
    },
    { rootMargin: '0px 0px -6% 0px' }
  );
  document.querySelectorAll('.rv').forEach((el) => io.observe(el));
}
