// Build source for the local, tree-shaken renderer; never requested at runtime.
export { Scene, PerspectiveCamera, WebGLRenderer, Group, Mesh, MeshStandardMaterial,
  BufferGeometry, Float32BufferAttribute, Vector3, HemisphereLight, DirectionalLight,
  SRGBColorSpace, ACESFilmicToneMapping, DoubleSide, Raycaster, MathUtils } from 'three';
export { OrbitControls } from 'three/addons/controls/OrbitControls.js';
