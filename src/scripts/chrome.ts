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

  // 左侧脊线随滚动向下生长,把「长卷推进」具象成一条线
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const grow = () => {
      const max = document.documentElement.scrollHeight - innerHeight;
      const p = max > 0 ? Math.min(1, scrollY / max) : 1;
      document.documentElement.style.setProperty('--rail-grow', (0.12 + 0.88 * p).toFixed(3));
    };
    grow();
    addEventListener('scroll', grow, { passive: true });
  }

  const navLinks = [...document.querySelectorAll<HTMLAnchorElement>('.bar nav a')].filter((a) =>
    a.getAttribute('href')?.startsWith('#')
  );
  const secs = navLinks.map((a) => document.querySelector<HTMLElement>(a.getAttribute('href')!));
  const spy = () => {
    let id = '';
    for (const s of secs) if (s && s.getBoundingClientRect().top <= 80) id = s!.id;
    for (const a of navLinks) a.classList.toggle('on', a.getAttribute('href') === `#${id}`);
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
