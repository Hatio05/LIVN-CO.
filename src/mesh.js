// Interactive particle mesh drawn on a fixed 2D canvas behind the page.
// Points drift slowly, link to near neighbours, and reach toward the cursor.

const LINK_DIST = 140;
const POINTER_DIST = 200;

export function initMesh(canvas, { reduced = false } = {}) {
  const ctx = canvas.getContext('2d');
  const pointer = { x: -9999, y: -9999, active: false };
  let points = [];
  let width = 0;
  let height = 0;
  let dpr = 1;
  let drift = 0;
  let running = !reduced;

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    const target = Math.min(150, Math.round((width * height) / 12500));
    points = Array.from({ length: target }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.18,
      vy: (Math.random() - 0.5) * 0.18,
      r: Math.random() * 1.1 + 0.4,
    }));
    if (!running) draw();
  }

  function step() {
    for (const p of points) {
      p.x += p.vx;
      p.y += p.vy + drift;

      if (pointer.active) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < 90 * 90 && d2 > 0.01) {
          const d = Math.sqrt(d2);
          const f = (1 - d / 90) * 0.6;
          p.x += (dx / d) * f;
          p.y += (dy / d) * f;
        }
      }

      if (p.x < -20) p.x = width + 20;
      else if (p.x > width + 20) p.x = -20;
      if (p.y < -20) p.y = height + 20;
      else if (p.y > height + 20) p.y = -20;
    }
    // Scroll velocity nudges the field, then settles.
    drift *= 0.92;
  }

  function draw() {
    ctx.clearRect(0, 0, width, height);
    const n = points.length;

    ctx.lineWidth = 1;
    for (let i = 0; i < n; i++) {
      const a = points[i];
      for (let j = i + 1; j < n; j++) {
        const b = points[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < LINK_DIST * LINK_DIST) {
          const alpha = (1 - Math.sqrt(d2) / LINK_DIST) * 0.14;
          ctx.strokeStyle = `rgba(200, 200, 210, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(b.x, b.y);
          ctx.stroke();
        }
      }
    }

    if (pointer.active) {
      for (const p of points) {
        const dx = p.x - pointer.x;
        const dy = p.y - pointer.y;
        const d2 = dx * dx + dy * dy;
        if (d2 < POINTER_DIST * POINTER_DIST) {
          const alpha = (1 - Math.sqrt(d2) / POINTER_DIST) * 0.4;
          ctx.strokeStyle = `rgba(235, 235, 240, ${alpha})`;
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(pointer.x, pointer.y);
          ctx.stroke();
        }
      }
    }

    ctx.fillStyle = 'rgba(220, 220, 228, 0.55)';
    for (const p of points) {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function tick() {
    if (!running) return;
    step();
    draw();
    requestAnimationFrame(tick);
  }

  function onPointerMove(e) {
    pointer.x = e.clientX;
    pointer.y = e.clientY;
    pointer.active = e.pointerType !== 'touch';
  }
  function onPointerLeave() {
    pointer.active = false;
  }
  function onVisibility() {
    if (reduced) return;
    const wasRunning = running;
    running = !document.hidden;
    if (running && !wasRunning) requestAnimationFrame(tick);
  }

  window.addEventListener('resize', resize);
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  document.documentElement.addEventListener('pointerleave', onPointerLeave);
  document.addEventListener('visibilitychange', onVisibility);

  resize();
  if (running) requestAnimationFrame(tick);

  return {
    // Called from Lenis with the current scroll velocity.
    nudge(velocity) {
      drift = Math.max(-2.5, Math.min(2.5, -velocity * 0.08));
    },
  };
}
