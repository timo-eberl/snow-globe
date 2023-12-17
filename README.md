# Snow Globe

A snow globe made with three.js for the lecture "113447a Computer Graphics".

Check it out here: https://orb.timoeberl.de

## Checklist

- [x] Responsive Design -> Different resolutions works, resizing works, resolution scale is dynamically adjusted to avoid lag
- [x] Orbit Controls -> Camera orbits around a point inside the globe
- [x] Import at least one 3D model -> tree
- [x] Materials -> Everywhere
- [x] Texture -> HDRI Map for reflections, spot light noise map, "freeze" image effect
- [x] Light -> directional lights, spot light inside house
- [x] Camera -> 2 cameras: one renders the scene, one renders the post-processing
- [x] Shadows -> directional lights and the spot light have shadows
- [x] Fog -> used in a hacky way to create an effect when entering the globe
- [x] Simple animation -> snow particles and light inside house
- [x] Shader -> post-processing "freeze" effect when inside globe

## Install with NPM and a build tool

1. Install Node.js
2. Install three.js: `npm install --save three`
3. Install a build tool, for example vite: `npm install --save-dev vite`
4. Start vite (or your build tool of choice): `npx vite`
5. Open the URL that vite printed in your terminal

> To create a build for production, run `npx vite build`

## Run with Visual Studio Code

1. Uncomment the `<script type="importmap"> ... </script>` in `index.html`
2. Change texture and model file paths in `main.js` (you need to add `public/`)
3. Install the extension [Live Server (Five Server)](https://open-vsx.org/vscode/item?itemName=yandeu.five-server)
4. Open `index.html`
5. Right click anywhere
6. Click "Open with Five Server"
7. Your browser should open with the running application. Everytime you save a file, the site will refresh.

> You can use any http server you want, for example: `npx http-server` or `python -m http.server`
