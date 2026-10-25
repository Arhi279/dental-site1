# Local Three.js renderer

- Three.js **0.180.0**, including its OrbitControls and PMREMGenerator, from the official npm package: https://www.npmjs.com/package/three/v/0.180.0
- Upstream: https://github.com/mrdoob/three.js/tree/r180
- License: MIT, preserved verbatim in `THREE-LICENSE.txt`.
- `three-tooth.min.js` is a tree-shaken ES module, built with esbuild **0.25.11**. No CDN or third-party requests are needed at runtime.
- It is dynamically imported on `tooth-anatomy.html` only. The home page loads no Three.js code.

To reproduce the bundle from the checked-in `three-entry.js` (Node/npm needed only for rebuilding):

```sh
npm install --prefix /tmp/dental-three-build three@0.180.0 esbuild@0.25.11
NODE_PATH=/tmp/dental-three-build/node_modules /tmp/dental-three-build/node_modules/.bin/esbuild assets/vendor/three-entry.js --bundle --minify --format=esm --target=es2020 --legal-comments=inline --outfile=assets/vendor/three-tooth.min.js
```

Run from the repository root. The website itself remains static HTML/CSS/JavaScript, without a build step.

The viewer generates its own 128px studio PMREM once at startup. No environment textures are downloaded. PlaneGeometry, MeshBasicMaterial, Color and PMREMGenerator are exported by the local bundle for this lighting setup.
