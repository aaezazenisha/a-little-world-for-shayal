# Only You — a world for Shayal

A first-person 3D romantic adventure with four explorable environments: a monumental entrance, pink dream gardens, a green flower meadow, and a moonlit world with fireworks. Built with HTML/CSS/JavaScript and Three.js, with no backend or paid service.

Live site: https://aaezazenisha.github.io/a-little-world-for-shayal/

## Play

- On a phone, use the left joystick to walk and drag elsewhere to look around.
- On a computer, use W A S D or arrow keys to walk, and drag to look. Press E to interact.
- Follow the illuminated stone path to the door, bunny, flower, and final glowing light.
- Walk close to a guide, then press the main button. If you are too far away, a hint points you along the path.
- Movement is fully manual. Use the joystick or W A S D to explore. No automatic-travel buttons.
- The ? button explains controls and offers Gentle motion. Device Reduce Motion preferences are respected.
- “what what what?” starts the supplied song at 1:25 and reveals “I LOVE YOU SO MUCH SHAYAL” with 3D fireworks.
- Replay pauses and resets the audio. “Stay under the stars” lets you explore after the reveal.

The illustrated version remains available at classic.html. The 3D version requires WebGL2 and an internet connection for the pinned Three.js module from jsDelivr. It offers the illustrated version if 3D loading fails. Physical iPhone performance varies by device; the pixel ratio and scene complexity are capped for mobile.

## Files

index.html / immersive.html — 3D journey entry pages
world.js — worlds, models, movement, transitions, audio, and fireworks
world.css — responsive game interface
music.mp3 — supplied song
classic.html / style.css / script.js — preserved illustrated journey
.nojekyll — static GitHub Pages hosting

## Preview and publish

The published HTTPS link is the easiest preview. JavaScript modules should be served over HTTP/HTTPS, rather than opening index.html directly from the filesystem. The classic version can be opened as a local file.

To publish a copy: upload the listed files to the root of a GitHub repository. Under Settings → Pages, choose Deploy from a branch, main, /(root), Save. Keep the music alongside index.html. GitHub Pages is public.

Official GitHub guide: https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site

## Explore and play

Find two glowing love notes in each world, eight in total. Walk within a few steps and press Read this love note, or E. The heart counter opens a journal where you can reread the notes and revisit any world already discovered. Notes stay collected while revisiting; replay starts a fresh hunt.

In the entrance garden, ring the wind chimes. In the pink world, make three wishes at the fountain. In the meadow, wake up a circle of flowers and watch the butterflies. In the night world, release up to six sky lanterns and watch for shooting stars. Benches and distant lanterns add to the scenery. Activities are optional and do not block the main journey.

