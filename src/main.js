import '@fontsource-variable/inter';
import './styles.css';

import Lenis from 'lenis';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import { initMesh } from './mesh.js';

gsap.registerPlugin(ScrollTrigger, SplitText);

const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const EASE = 'expo.out';

const mesh = initMesh(document.querySelector('.mesh'), { reduced });
// GSAP drives this state; the lazily loaded three.js scene reads it every frame.
const heroState = { intro: reduced ? 1 : 0, scroll: 0 };
let hero = null;
let heroVisible = true;
import('./hero.js').then(({ initHero }) => {
  hero = initHero(document.querySelector('.hero-canvas'), { reduced, state: heroState });
  hero?.setVisible(heroVisible);
});
function setHeroVisible(v) {
  heroVisible = v;
  hero?.setVisible(v);
}

/* ---------------- Smooth scroll ---------------- */

let lenis = null;
if (!reduced) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);

  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, smoothWheel: true });
  lenis.on('scroll', (e) => {
    ScrollTrigger.update();
    mesh.nudge(e.velocity);
  });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

// Anchor links glide through Lenis instead of jumping.
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const id = link.getAttribute('href');
    const target = id === '#top' ? 0 : document.querySelector(id);
    // Without Lenis (reduced motion) the browser's native jump is the right behaviour.
    if (!lenis || target === null) return;
    e.preventDefault();
    lenis.scrollTo(target, { duration: 1.6, offset: id === '#top' ? 0 : -24 });
  });
});

/* ---------------- Nav: hide on scroll down, show on scroll up ---------------- */

const nav = document.querySelector('.nav');
let navHidden = false;
if (lenis) {
  lenis.on('scroll', ({ scroll, direction }) => {
    const hide = direction === 1 && scroll > 160;
    if (hide === navHidden) return;
    navHidden = hide;
    gsap.to(nav, { yPercent: hide ? -140 : 0, duration: 0.7, ease: hide ? 'power3.in' : EASE, overwrite: 'auto' });
  });
}

/* ---------------- Pointer micro-interactions ---------------- */

function initMagnetic() {
  // Offsets go through CSS variables (eased in CSS) so the button keeps its own :active scale.
  document.querySelectorAll('[data-magnetic]').forEach((el) => {
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      el.style.setProperty('--tx', `${(e.clientX - (r.left + r.width / 2)) * 0.25}px`);
      el.style.setProperty('--ty', `${(e.clientY - (r.top + r.height / 2)) * 0.35}px`);
    });
    el.addEventListener('pointerleave', () => {
      el.style.setProperty('--tx', '0px');
      el.style.setProperty('--ty', '0px');
    });
  });
}

function initCards() {
  document.querySelectorAll('.card').forEach((card) => {
    const viz = card.querySelector('.viz-slats, .viz-plinth');
    const rx = !reduced && gsap.quickTo(card, 'rotationX', { duration: 0.8, ease: 'power3.out' });
    const ry = !reduced && gsap.quickTo(card, 'rotationY', { duration: 0.8, ease: 'power3.out' });

    card.addEventListener('pointermove', (e) => {
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width;
      const py = (e.clientY - r.top) / r.height;
      card.style.setProperty('--mx', `${px * 100}%`);
      card.style.setProperty('--my', `${py * 100}%`);
      if (viz) {
        viz.style.setProperty('--px', (px - 0.5) * 2);
        viz.style.setProperty('--py', (py - 0.5) * 2);
      }
      // Tilt only once the entrance animation has handed over the transform.
      if (rx && card.dataset.revealed) {
        rx((0.5 - py) * 5);
        ry((px - 0.5) * 6);
      }
    });
    card.addEventListener('pointerleave', () => {
      if (viz) {
        viz.style.setProperty('--px', 0);
        viz.style.setProperty('--py', 0);
      }
      if (rx) {
        rx(0);
        ry(0);
      }
    });
  });
}

/* ---------------- Entrance + scroll choreography ---------------- */

// Splits into masked lines and re-splits on resize. `animate` builds the reveal; once a
// reveal has started, later re-splits just leave the fresh lines in place.
function splitLines(el, animate) {
  let started = false;
  SplitText.create(el, {
    type: 'lines',
    mask: 'lines',
    linesClass: 'line',
    autoSplit: true,
    onSplit(self) {
      gsap.set(el, { autoAlpha: 1 });
      if (started) return;
      const anim = animate(self.lines);
      anim.eventCallback('onStart', () => (started = true));
      return anim;
    },
  });
}

function introTimeline() {
  const intro = document.querySelector('.intro');
  intro.style.clipPath = 'inset(0 0 0% 0)';
  lenis?.stop();
  const tl = gsap.timeline({ onComplete: () => lenis?.start() });

  tl.fromTo('.intro-mark span', { yPercent: 110 }, { yPercent: 0, duration: 0.9, stagger: 0.08, ease: EASE })
    .to('.intro-mark span', { yPercent: -110, duration: 0.7, stagger: 0.05, ease: 'expo.in' }, '+=0.25')
    .to(intro, { clipPath: 'inset(0 0 100% 0)', duration: 1.1, ease: 'expo.inOut' }, '-=0.25')
    .set(intro, { display: 'none' })
    .to(heroState, { intro: 1, duration: 2.4, ease: 'power3.out' }, '-=0.9')
    .add(() => {
      splitLines(document.querySelector('[data-hero-title]'), (lines) =>
        gsap.fromTo(lines, { yPercent: 110 }, { yPercent: 0, duration: 1.2, stagger: 0.1, ease: EASE })
      );
    }, '<0.15')
    .fromTo(
      '[data-hero-fade]',
      { autoAlpha: 0, y: 24, filter: 'blur(8px)' },
      { autoAlpha: 1, y: 0, filter: 'blur(0px)', duration: 1.1, stagger: 0.1, ease: EASE },
      '<0.35'
    )
    .fromTo(nav, { autoAlpha: 0, yPercent: -60 }, { autoAlpha: 1, yPercent: 0, duration: 1, ease: EASE }, '<0.1');

  return tl;
}

function heroScroll() {
  gsap
    .timeline({
      scrollTrigger: {
        trigger: '.hero',
        start: 'top top',
        end: 'bottom top',
        scrub: true,
        onToggle: (self) => setHeroVisible(self.isActive),
      },
    })
    .to(heroState, { scroll: 1, ease: 'none' }, 0)
    .to('.hero-inner', { yPercent: -22, autoAlpha: 0, ease: 'none' }, 0);
}

function revealHeadings() {
  document.querySelectorAll('[data-split]').forEach((el) => {
    splitLines(el, (lines) =>
      gsap.fromTo(
        lines,
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.2,
          stagger: 0.09,
          ease: EASE,
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }
      )
    );
  });
}

function revealGeneric() {
  document.querySelectorAll('[data-reveal]').forEach((el) => {
    gsap.fromTo(
      el,
      { autoAlpha: 0, y: 40, filter: 'blur(10px)' },
      {
        autoAlpha: 1,
        y: 0,
        filter: 'blur(0px)',
        duration: 1.2,
        ease: EASE,
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      }
    );
  });
}

function revealCards() {
  const cards = gsap.utils.toArray('[data-card]');
  gsap.set(cards, { autoAlpha: 0, y: 80, scale: 0.96, rotationX: 8, transformPerspective: 1000, transformOrigin: '50% 100%' });
  ScrollTrigger.batch(cards, {
    start: 'top 92%',
    once: true,
    onEnter: (batch) =>
      gsap.to(batch, {
        autoAlpha: 1,
        y: 0,
        scale: 1,
        rotationX: 0,
        duration: 1.3,
        stagger: 0.1,
        ease: EASE,
        onComplete() {
          batch.forEach((c) => (c.dataset.revealed = '1'));
        },
      }),
  });
}

function statementScrub() {
  const el = document.querySelector('[data-scrub-words]');
  const { words } = SplitText.create(el, { type: 'words' });
  gsap.fromTo(
    words,
    { opacity: 0.14 },
    {
      opacity: 1,
      ease: 'none',
      stagger: 0.1,
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 50%', scrub: 0.6 },
    }
  );
  gsap.fromTo(
    el,
    { y: 60 },
    { y: 0, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'top 40%', scrub: true } }
  );
}

function counters() {
  document.querySelectorAll('[data-count]').forEach((el) => {
    const end = Number(el.dataset.count);
    const obj = { v: 0 };
    el.textContent = '0';
    gsap.to(obj, {
      v: end,
      duration: 2,
      ease: 'power2.out',
      onUpdate: () => (el.textContent = Math.round(obj.v)),
      scrollTrigger: { trigger: el, start: 'top 90%', once: true },
    });
  });
}

function processPan() {
  const mm = gsap.matchMedia();
  const steps = gsap.utils.toArray('[data-step]');

  mm.add('(min-width: 900px)', () => {
    const track = document.querySelector('.process-track');
    const distance = () => track.scrollWidth - window.innerWidth;

    const pan = gsap.to(track, {
      x: () => -distance(),
      ease: 'none',
      scrollTrigger: {
        trigger: '.process',
        start: 'top top',
        end: () => `+=${distance()}`,
        pin: true,
        scrub: 1,
        invalidateOnRefresh: true,
      },
    });

    steps.forEach((step) => {
      gsap.fromTo(
        step,
        { autoAlpha: 0, y: 60, rotationY: -12, transformPerspective: 1000 },
        {
          autoAlpha: 1,
          y: 0,
          rotationY: 0,
          duration: 1.2,
          ease: EASE,
          scrollTrigger: { trigger: step, containerAnimation: pan, start: 'left 92%', once: true },
        }
      );
    });
  });

  mm.add('(max-width: 899px)', () => {
    steps.forEach((step) => {
      gsap.fromTo(
        step,
        { autoAlpha: 0, y: 60 },
        { autoAlpha: 1, y: 0, duration: 1.2, ease: EASE, scrollTrigger: { trigger: step, start: 'top 90%', once: true } }
      );
    });
  });
}

function footerParallax() {
  gsap.fromTo(
    '.footer-mark',
    { yPercent: 30 },
    { yPercent: 0, ease: 'none', scrollTrigger: { trigger: '.footer', start: 'top bottom', end: 'bottom bottom', scrub: true } }
  );
}

/* ---------------- Boot ---------------- */

document.fonts.ready.then(() => {
  if (finePointer) initMagnetic();
  initCards();

  if (reduced) return;

  introTimeline();
  heroScroll();
  revealHeadings();
  revealGeneric();
  revealCards();
  statementScrub();
  counters();
  processPan();
  footerParallax();
  ScrollTrigger.refresh();
});
