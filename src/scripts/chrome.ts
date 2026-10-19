const root = document.documentElement;
const scheme = matchMedia('(prefers-color-scheme: dark)');
const PREFS = ['auto', 'light', 'dark'] as const;
type Pref = (typeof PREFS)[number];

const LABELS: Record<Pref, string> = {
  auto: '主题：跟随系统，点击切换为亮色',
  light: '主题：亮色，点击切换为暗色',
  dark: '主题：暗色，点击切换为跟随系统',
};

const syncTheme = () => {
  const pref = root.dataset.pref;
  const dark = pref === 'dark' || (pref !== 'light' && scheme.matches);
  root.dataset.theme = dark ? 'dark' : 'light';
};

function initTheme() {
  syncTheme();
  scheme.addEventListener('change', syncTheme);
  const btn = document.getElementById('theme');
  if (!btn) return;
  const label = () => {
    const text = LABELS[(root.dataset.pref as Pref) || 'auto'];
    btn.setAttribute('aria-label', text);
    btn.title = text;
  };
  label();
  btn.addEventListener('click', () => {
    const cur = (root.dataset.pref as Pref) || 'auto';
    const next = PREFS[(PREFS.indexOf(cur) + 1) % PREFS.length];
    root.dataset.pref = next;
    localStorage.setItem('theme', next);
    syncTheme();
    label();
  });
}

export function initChrome() {
  initTheme();

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
