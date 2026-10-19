// Lazy glTF viewer: a glass dragon refracting a contour-line backdrop drawn in the site's colors.
export async function initModel(host: HTMLElement) {
  const url = host.dataset.src!;
  const [THREE, { GLTFLoader }, { OrbitControls }, { RoomEnvironment }] = await Promise.all([
    import('three'),
    import('three/examples/jsm/loaders/GLTFLoader.js'),
    import('three/examples/jsm/controls/OrbitControls.js'),
    import('three/examples/jsm/environments/RoomEnvironment.js'),
  ]);

  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0.7, 7.2);
  scene.add(camera);

  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 4, 5);
  scene.add(key);

  // Backdrop pinned to the camera so refraction always has something to bend.
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1024;
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  const paint = () => {
    const cs = getComputedStyle(document.documentElement);
    const bg = cs.getPropertyValue('--bg').trim(), ink = cs.getPropertyValue('--ink').trim(), acc = cs.getPropertyValue('--accent').trim();
    const c = cv.getContext('2d')!;
    c.fillStyle = bg; c.fillRect(0, 0, 1024, 1024);
    c.globalAlpha = 0.16; c.strokeStyle = ink; c.lineWidth = 1.5;
    for (let i = 0; i <= 1024; i += 64) { c.beginPath(); c.moveTo(i, 0); c.lineTo(i, 1024); c.stroke(); c.beginPath(); c.moveTo(0, i); c.lineTo(1024, i); c.stroke(); }
    c.globalAlpha = 0.8; c.strokeStyle = acc; c.lineWidth = 3.5;
    for (let k = 0; k < 9; k++) {
      c.beginPath();
      for (let x = 0; x <= 1024; x += 8) {
        const y = 120 * k + 40 * Math.sin(x / 150 + k) + 20 * Math.sin(x / 47 + k * 2);
        x ? c.lineTo(x, y) : c.moveTo(x, y);
      }
      c.stroke();
    }
    c.globalAlpha = 1; c.fillStyle = acc;
    c.beginPath(); c.arc(760, 300, 70, 0, 7); c.fill();
    tex.needsUpdate = true;
  };
  paint();
  const back = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
  back.position.z = -9;
  camera.add(back);
  const fit = () => {
    const h = 2 * Math.tan((camera.fov * Math.PI) / 360) * 9.01;
    back.scale.set(h * camera.aspect, h, 1);
  };

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.set(0, 0.5, 0);
  controls.enableDamping = true;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.autoRotate = !reduce;
  controls.autoRotateSpeed = 0.9;
  controls.minPolarAngle = Math.PI * 0.32;
  controls.maxPolarAngle = Math.PI * 0.62;
  renderer.domElement.style.touchAction = 'pan-y';

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    fit();
  };
  resize();
  new ResizeObserver(resize).observe(host);

  const gltf = await new GLTFLoader().loadAsync(url);
  const model = gltf.scene;
  scene.add(model);

  let visible = true, raf = 0;
  const loop = () => {
    controls.update();
    renderer.render(scene, camera);
    raf = visible && !reduce ? requestAnimationFrame(loop) : 0;
  };
  const kick = () => { if (!raf) raf = requestAnimationFrame(loop); };
  controls.addEventListener('change', () => { if (reduce) kick(); });
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }).observe(host);
  new MutationObserver(() => { paint(); kick(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  kick();
  host.classList.add('ready');
}
