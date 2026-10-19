// A slowly drifting Julia set, drawn as ink contour lines. Pointer nudges the parameter.
const VS = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
const FS = `
precision highp float;
uniform vec2 uRes; uniform float uT; uniform vec2 uM;
uniform vec3 uBg, uInk, uAcc;
void main(){
  vec2 p = (gl_FragCoord.xy - uRes * vec2(0.68, 0.5)) / min(uRes.x * 0.8, uRes.y);
  p *= 2.5;
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
    float band = abs(fract(s * 0.5) - 0.5) * 2.;
    float line = 1. - smoothstep(0.0, 0.1, band);
    float fade = exp(-s * 0.06);
    col = mix(uBg, uInk, line * (0.05 + 0.4 * fade));
    col = mix(col, uAcc, smoothstep(0.35, 0.9, fade) * line * 0.85);
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
  const uRes = U('uRes'), uT = U('uT'), uM = U('uM'), uBg = U('uBg'), uInk = U('uInk'), uAcc = U('uAcc');

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let visible = true, raf = 0, t0 = performance.now();
  const target = [0, 0], cur = [0, 0];

  const colors = () => {
    const cs = getComputedStyle(document.documentElement);
    gl.uniform3fv(uBg, hex(cs.getPropertyValue('--bg')));
    gl.uniform3fv(uInk, hex(cs.getPropertyValue('--ink')));
    gl.uniform3fv(uAcc, hex(cs.getPropertyValue('--accent')));
  };
  const resize = () => {
    const k = Math.min(devicePixelRatio || 1, 1.5) * (innerWidth < 700 ? 0.6 : 0.75);
    canvas.width = Math.max(1, Math.round(canvas.clientWidth * k));
    canvas.height = Math.max(1, Math.round(canvas.clientHeight * k));
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.uniform2f(uRes, canvas.width, canvas.height);
  };
  const draw = (now: number) => {
    cur[0] += (target[0] - cur[0]) * 0.04;
    cur[1] += (target[1] - cur[1]) * 0.04;
    gl.uniform1f(uT, reduce ? 0 : (now - t0) / 1000);
    gl.uniform2f(uM, cur[0], cur[1]);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  };
  const loop = (now: number) => {
    draw(now);
    raf = visible && !reduce ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };

  colors(); resize(); draw(t0);
  canvas.classList.add('on');
  if (reduce) {
    addEventListener('resize', () => { resize(); draw(t0); });
    new MutationObserver(() => { colors(); draw(t0); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return;
  }
  addEventListener('resize', resize);
  addEventListener('pointermove', (e) => {
    target[0] = (e.clientX / innerWidth) * 2 - 1;
    target[1] = (e.clientY / innerHeight) * 2 - 1;
  }, { passive: true });
  new MutationObserver(colors).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(canvas);
  kick();
}
