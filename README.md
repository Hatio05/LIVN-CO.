# LIVN CO. landing page

A dark, glassmorphic landing page built with Vite, Three.js, GSAP (ScrollTrigger + SplitText) and Lenis.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the build
```

## Structure

- `index.html`: page markup (hero, statement, bento grid, process, contact, footer)
- `src/styles.css`: design tokens, glass surfaces, bento layout, responsive rules
- `src/main.js`: Lenis smooth scroll, intro sequence, scroll-triggered reveals, pointer interactions
- `src/hero.js`: the 3D hero scene (lazy-loaded chunk)
- `src/mesh.js`: the interactive particle mesh background

## Notes

- `prefers-reduced-motion` disables smooth scrolling, entrance animations and the animated backgrounds; all content renders statically.
- Copy, the "140+" figure, the testimonial and `hello@livnco.com` are placeholders to replace with real studio content.
- The bento visuals are CSS-drawn; real project photography can be dropped into the `.viz` layers of each card.
