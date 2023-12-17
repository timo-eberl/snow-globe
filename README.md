# Snow Globe

A snow globe made with three.js for the lecture "113447a Computer Graphics".

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

## Run with Visual Studio Code

1. Install the extension [Live Server (Five Server)](https://open-vsx.org/vscode/item?itemName=yandeu.five-server)
2. Open `index.html`
3. Right click anywhere
4. Click "Open with Five Server"
5. Your browser should open with the running application. Everytime you save a file, the site will refresh.

## Run with another local server

You can use any http server you want, for example:

- `npx http-server` (Node.js)
- `python -m http.server` (Python 3.x)
