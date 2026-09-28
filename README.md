# LIVN CO. landing page

A dark, glassmorphic landing page with a 3D hero (Three.js), smooth scrolling (Lenis) and scroll-triggered animations (GSAP ScrollTrigger + SplitText).

## Run it

Everything is in one file, `index.html`. There is nothing to install or build:

- **Locally:** double-click `index.html` to open it in your browser.
- **Online:** upload `index.html` to any static host (GitHub Pages, Netlify, Vercel, S3). For GitHub Pages, enable Pages on this repo and point it at the branch root.

The libraries (Three.js, GSAP, Lenis) and the Inter font load from public CDNs (jsDelivr and Google Fonts), so an internet connection is needed for the full experience. Offline, the page falls back to a static version of the same content after a few seconds.

## Editing

- Styles live in the `<style>` block in the `<head>`.
- The page script is the `<script type="module">` at the end of `<body>`, in three parts: particle mesh background, 3D hero, and page animations.
- `prefers-reduced-motion` disables smooth scrolling, entrance animations and the animated backgrounds; all content renders statically.
- Copy, the "140+" figure, the testimonial and `hello@livnco.com` are placeholders to replace with real studio content.
