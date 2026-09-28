import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// Cinematic hero: a slowly breathing dark-chrome form with an orbiting particle halo.
// The form turns toward the cursor and swells where the cursor touches it.
// `state.intro` (0..1) and `state.scroll` (0..1) are driven by GSAP from main.js.

const NOISE_GLSL = /* glsl */ `
uniform float uTime;
uniform float uAmp;
uniform vec3 uPointDir;
uniform float uPointStrength;

vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
            i.z + vec4(0.0, i1.z, i2.z, 1.0))
          + i.y + vec4(0.0, i1.y, i2.y, 1.0))
          + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

vec3 displace(vec3 p) {
  vec3 n = normalize(p);
  float d = snoise(n * 1.1 + vec3(0.0, uTime * 0.11, uTime * 0.07)) * 0.7
          + snoise(n * 2.2 - vec3(uTime * 0.09)) * 0.12;
  float bulge = pow(max(dot(n, uPointDir), 0.0), 7.0) * uPointStrength;
  return n * (1.0 + d * uAmp + bulge * 0.2);
}
`;

export function initHero(canvas, { reduced = false, state = { intro: 1, scroll: 0 } } = {}) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch {
    canvas.closest('.hero')?.classList.add('no-webgl');
    return null;
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 0.95;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
  camera.position.set(0, 0, 6);

  // rig: layout placement + scroll motion. spin: pointer-driven orientation.
  const rig = new THREE.Group();
  const spin = new THREE.Group();
  rig.add(spin);
  scene.add(rig);

  const uniforms = {
    uTime: { value: 0 },
    uAmp: { value: 0.22 },
    uPointDir: { value: new THREE.Vector3(0, 0, 1) },
    uPointStrength: { value: 0 },
  };

  const material = new THREE.MeshPhysicalMaterial({
    color: 0x2a2a2f,
    metalness: 1,
    roughness: 0.24,
    clearcoat: 1,
    clearcoatRoughness: 0.12,
    envMapIntensity: 0.85,
  });
  material.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${NOISE_GLSL}`)
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        vec3 baseN = normalize(position);
        vec3 helper = abs(baseN.y) < 0.99 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
        vec3 tangentDir = normalize(cross(baseN, helper));
        vec3 bitangentDir = normalize(cross(baseN, tangentDir));
        float eps = 0.008;
        vec3 displaced = displace(position);
        vec3 dT = displace(position + tangentDir * eps) - displaced;
        vec3 dB = displace(position + bitangentDir * eps) - displaced;
        vec3 objectNormal = normalize(cross(dT, dB));
        `
      )
      .replace('#include <begin_vertex>', 'vec3 transformed = displaced;');
  };

  const segments = window.innerWidth < 768 ? 128 : 200;
  const blob = new THREE.Mesh(new THREE.SphereGeometry(1, segments, segments), material);
  spin.add(blob);

  // Particle halo
  const HALO = 2200;
  const haloPos = new Float32Array(HALO * 3);
  for (let i = 0; i < HALO; i++) {
    const a = Math.random() * Math.PI * 2;
    const r = 1.55 + Math.pow(Math.random(), 2) * 0.6;
    haloPos[i * 3] = Math.cos(a) * r;
    haloPos[i * 3 + 1] = (Math.random() - 0.5) * 0.08 * r;
    haloPos[i * 3 + 2] = Math.sin(a) * r;
  }
  const haloGeo = new THREE.BufferGeometry();
  haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
  const halo = new THREE.Points(
    haloGeo,
    new THREE.PointsMaterial({
      color: 0xc8c8d0,
      size: 0.012,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    })
  );
  const haloTilt = new THREE.Group();
  haloTilt.rotation.set(1.2, 0, -0.35);
  haloTilt.add(halo);
  rig.add(haloTilt);

  const ringGeo = new THREE.BufferGeometry().setFromPoints(
    Array.from({ length: 257 }, (_, i) => {
      const a = (i / 256) * Math.PI * 2;
      return new THREE.Vector3(Math.cos(a) * 2.35, 0, Math.sin(a) * 2.35);
    })
  );
  const ring = new THREE.Line(ringGeo, new THREE.LineBasicMaterial({ color: 0x5a5a62, transparent: true, opacity: 0.35 }));
  haloTilt.add(ring);

  // A soft key light that follows the cursor for moving highlights.
  const key = new THREE.PointLight(0xffffff, 18, 12, 1.6);
  key.position.set(2, 2, 3);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfe3ff, 1.4);
  rim.position.set(-4, 1.5, -3);
  scene.add(rim);

  // Pointer tracking
  const pointer = new THREE.Vector2(0, 0);
  const pointerTarget = new THREE.Vector2(0, 0);
  const raycaster = new THREE.Raycaster();
  const hitSphere = new THREE.Sphere();
  const hitPoint = new THREE.Vector3();
  const tmpDir = new THREE.Vector3();
  let pointerInside = false;
  let bulgeTarget = 0;

  function onPointerMove(e) {
    const rect = canvas.getBoundingClientRect();
    pointerTarget.set(((e.clientX - rect.left) / rect.width) * 2 - 1, -((e.clientY - rect.top) / rect.height) * 2 + 1);
    pointerInside = e.clientY >= rect.top && e.clientY <= rect.bottom;
  }
  window.addEventListener('pointermove', onPointerMove, { passive: true });

  const layout = { x: 0, y: 0, scale: 1 };

  function resize() {
    const w = canvas.clientWidth;
    const h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();

    const halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    const halfW = halfH * camera.aspect;
    if (camera.aspect >= 1.05) {
      layout.x = halfW * 0.46;
      layout.y = 0;
      layout.scale = Math.min(0.92, halfH / 2.05);
    } else {
      // Portrait: the form sits above the copy.
      layout.x = 0;
      layout.y = halfH * 0.38;
      layout.scale = Math.min(0.72, (halfW * 0.8) / 2.35);
    }
  }
  const ro = new ResizeObserver(resize);
  ro.observe(canvas);
  resize();

  const timer = new THREE.Timer();
  let visible = true;
  let rafId = 0;

  function render() {
    timer.update();
    const dt = Math.min(timer.getDelta(), 0.05);
    const t = timer.getElapsed();
    const { intro, scroll } = state;

    if (!reduced) uniforms.uTime.value = t;

    pointer.lerp(pointerTarget, 1 - Math.pow(0.001, dt));

    const easeIntro = 1 - Math.pow(1 - intro, 3);
    const s = layout.scale * (0.55 + 0.45 * easeIntro) * (1 + scroll * 0.35);
    rig.scale.setScalar(s);
    rig.position.set(layout.x * (1 - scroll * 0.5), layout.y + scroll * 0.9, -scroll * 1.5);

    spin.rotation.y += ((pointer.x * 0.55 + t * 0.05 + scroll * 1.6) - spin.rotation.y) * 0.06;
    spin.rotation.x += ((-pointer.y * 0.35) - spin.rotation.x) * 0.06;
    halo.rotation.y = t * 0.06 + scroll * 1.2;
    haloTilt.rotation.z = -0.35 + pointer.x * 0.12;

    uniforms.uAmp.value = 0.1 + 0.08 * easeIntro + scroll * 0.16;
    halo.material.opacity = 0.7 * easeIntro * (1 - scroll * 0.6);
    ring.material.opacity = 0.35 * easeIntro;

    key.position.set(pointer.x * 4, pointer.y * 3, 3);
    camera.position.z = 6 - easeIntro * 0.4;

    // Swell where the cursor touches the surface.
    bulgeTarget = 0;
    if (pointerInside) {
      raycaster.setFromCamera(pointer, camera);
      blob.getWorldPosition(hitSphere.center);
      hitSphere.radius = s * 1.05;
      if (raycaster.ray.intersectSphere(hitSphere, hitPoint)) {
        blob.worldToLocal(tmpDir.copy(hitPoint)).normalize();
        uniforms.uPointDir.value.lerp(tmpDir, 0.15).normalize();
        bulgeTarget = 1;
      }
    }
    uniforms.uPointStrength.value += (bulgeTarget - uniforms.uPointStrength.value) * 0.06;

    renderer.render(scene, camera);
  }

  function loop() {
    rafId = requestAnimationFrame(loop);
    if (!visible || document.hidden) return;
    render();
  }

  if (reduced) {
    render();
    // Still re-render on resize so the static frame stays sharp.
    new ResizeObserver(() => render()).observe(canvas);
  } else {
    loop();
  }

  return {
    setVisible(v) {
      visible = v;
    },
    destroy() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      renderer.dispose();
    },
  };
}
