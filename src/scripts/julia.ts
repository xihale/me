// A slowly drifting Julia set, drawn as ink contour lines. Pointer nudges the parameter.
const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FS = `
#extension GL_OES_standard_derivatives : enable
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uM; uniform vec2 uView;
uniform vec3 uBg, uInk, uAcc;
uniform float uScale;
void main(){
  vec2 p = (gl_FragCoord.xy - uRes * uView) / min(uRes.x * 0.8, uRes.y);
  p *= uScale;
  float a = uT * 0.045 + 2.2 + uM.x * 0.35;
  float r = 0.7885 + uM.y * 0.03;
  vec2 c = r * vec2(cos(a), sin(a));
  vec2 z = p; float n = 0.; bool esc = false;
  for (int i = 0; i < 80; i++) {
    z = vec2(z.x*z.x - z.y*z.y, 2.*z.x*z.y) + c;
    if (dot(z, z) > 256.) { esc = true; break; }
    n += 1.;
  }
  vec3 col = uBg;
  if (esc) {
    float s = n - log2(log2(dot(z, z))) + 4.;
    // 等高线间距固定在 s 空间;线宽改用像素空间导数,避免外层出现大块粗带、
    // 内层细线又因采样不足断成虚线
    float band = abs(fract(s * 0.5) - 0.5) * 2.;
    float d = max(fwidth(s), 1e-4);
    float aa = d * 0.5;
    // 线距小于几个像素时改用平均覆盖率,否则细节会闪成噪点
    float line = mix(1. - smoothstep(0., aa, band), clamp(d * 0.5, 0., 1.), smoothstep(0.55, 1.3, d));
    float fade = exp(-s * 0.06);
    // 亮底上的细线需要更高的不透明度,否则整片发灰
    float light = step(0.5, dot(uBg, vec3(0.2126, 0.7152, 0.0722)));
    float ink = line * mix(mix(0.05, 0.3, light), mix(0.4, 0.5, light), fade);
    col = mix(uBg, uInk, ink);
    col = mix(col, uAcc, smoothstep(0.35, 0.9, fade) * line * mix(0.85, 0.8, light));
  } else {
    col = mix(uBg, uAcc, 0.07);
  }
  gl_FragColor = vec4(col, 1.);
}`;

function hex(v: string): [number, number, number] {
  const s = v.trim().replace('#', '');
  const f = s.length === 3 ? s.replace(/./g, (c) => c + c) : s;
  return [0, 2, 4].map((i) => parseInt(f.slice(i, i + 2), 16) / 255) as [number, number, number];
}

export function initJulia(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext('webgl', { antialias: false, powerPreference: 'low-power' });
  if (!gl) return;
  gl.getExtension('OES_standard_derivatives');
  const sh = (t: number, src: string) => {
    const s = gl.createShader(t)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram()!;
  gl.attachShader(prog, sh(gl.VERTEX_SHADER, VS));
  gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FS));
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return;
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = (n: string) => gl.getUniformLocation(prog, n);
  const uRes = U('uRes'), uT = U('uT'), uM = U('uM'), uBg = U('uBg'), uInk = U('uInk'), uAcc = U('uAcc'), uView = U('uView'), uScale = U('uScale');

  // 窄屏画布转了 90°,视角中心回到画面中央,分形放大并稍微超出屏幕边缘
  const narrow = matchMedia('(max-width: 860px)');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 触屏没有悬停:长按加速,别的指针事件都不要;有些环境没有指针设备,所以再看触点
  const touch = matchMedia('(hover: none)').matches && navigator.maxTouchPoints > 0;
  const BOOST = 12;
  let visible = true, raf = 0, last = performance.now(), clock = 0, speed = 1, want = 1;
  const target = [0, 0], cur = [0, 0];

  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    gl.uniform3fv(uBg, hex(cs.getPropertyValue('--bg')));
    gl.uniform3fv(uInk, hex(cs.getPropertyValue('--ink')));
    gl.uniform3fv(uAcc, hex(cs.getPropertyValue('--accent')));
  };
  const resize = () => {
    // 手机竖屏的像素少,画布按 dpr 上限 2 倍再乘 0.75 取样,否则细线会糊
    const k = Math.min(devicePixelRatio || 1, narrow.matches ? 2 : 1.5) * 0.75;
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * k));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
    gl.uniform2f(uView, narrow.matches ? 0.5 : 0.68, 0.5);
    gl.uniform1f(uScale, narrow.matches ? 1.65 : 2.5);
  };
  const draw = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    speed += (want - speed) * 0.08;
    clock += dt * speed;
    cur[0] += (target[0] - cur[0]) * 0.04;
    cur[1] += (target[1] - cur[1]) * 0.04;
    gl.uniform1f(uT, reduce ? 0 : clock);
    gl.uniform2f(uM, cur[0], cur[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now: number) => {
    draw(now);
    raf = visible && !reduce ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  colors(); resize(); draw(last);
  canvas.classList.add('on');
  if (reduce) {
    const onResize = () => { resize(); draw(performance.now()); };
    addEventListener('resize', onResize);
    narrow.addEventListener('change', onResize);
    new MutationObserver(() => { colors(); draw(performance.now()); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return;
  }
  addEventListener('resize', resize);
  narrow.addEventListener('change', resize);
  if (touch) {
    let press = 0;
    const release = () => { clearTimeout(press); want = 1; };
    canvas.addEventListener('pointerdown', (e) => {
      if (!e.isPrimary) return;
      clearTimeout(press);
      press = window.setTimeout(() => { want = BOOST; }, 280);
    });
    canvas.addEventListener('pointerup', release);
    canvas.addEventListener('pointercancel', release);
  } else {
    addEventListener('pointermove', (e) => {
      target[0] = (e.clientX / innerWidth) * 2 - 1;
      target[1] = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });
  }
  new MutationObserver(colors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(canvas);
  kick();
}
