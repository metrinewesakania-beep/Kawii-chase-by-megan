# KAWIIS CHASE WITH MEGAN

Kawii's Chase is a stylized 3D endless skate chase built with HTML5, CSS, JavaScript ES modules, and Three.js from a pinned CDN. It is designed for mobile browsers and desktop browsers as a static site with no build step.

## Features
- Three-lane endless skate chase
- Jumping, sliding, lane switching, and tricks
- Neon rooftop city and skyline with procedural obstacles and rings
- Chase meter, score, distance, collectibles, and local best score
- Keyboard and touch controls
- Responsive HUD and mobile-first layout
- Loading and WebGL error states
- GitHub Pages friendly static deployment

## File structure
- `index.html` — game shell, screen overlays, HUD, canvas, controls
- `style.css` — neon cinematic UI and responsive layout
- `src/main.js` — app bootstrap and scene loop
- `src/controls.js` — keyboard and touch input
- `src/player.js` — skater model and motion logic
- `src/world.js` — city environment, obstacles, collectibles
- `src/game.js` — score, collisions, difficulty, game states

## Local run
From the repo root:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Controls
Desktop:
- A / Left Arrow: move left
- D / Right Arrow: move right
- W / Space / Up: jump
- S / Down: slide
- T / E: trick
- P / Escape: pause or resume

Mobile:
- Use the on-screen touch buttons for left, right, jump, slide, and trick
- Swipe left/right to move lanes; swipe up to jump; swipe down to slide

## Publishing to GitHub Pages
1. Push this repo to GitHub.
2. Open the repository in GitHub.
3. Go to Settings → Pages.
4. Choose:
   - Source: Deploy from a branch
   - Branch: main
   - Folder: /(root)
5. Save and wait for the Pages URL to appear.
6. Verify it loads at the public URL.

Expected URL format:

```text
https://metrinewesakania-beep.github.io/Kawii-chase-by-megan/
```

## Notes
- The visual style intentionally uses stylized prototype meshes for speed and clarity.
- Best score is stored in localStorage with safe fallback handling.
- No API keys or backend are required.
- Pixel ratio and geometry are tuned to be lighter on Android devices.
