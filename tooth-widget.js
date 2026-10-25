/* Local, on-demand Three.js viewer. The home page never loads this script. */
'use strict';
(() => {
  const stage = document.getElementById('tooth-stage');
  if (!stage) return;
  stage.setAttribute('aria-busy', 'true');
  const loading = document.getElementById('tooth-loading');
  const fallback = document.getElementById('tooth-fallback');
  const failure = document.getElementById('tooth-failure');
  const hotspotLayer = document.getElementById('tooth-hotspots');
  const toggle = document.getElementById('cutaway-toggle');
  const badge = document.getElementById('view-badge');
  const actionButtons = document.querySelectorAll('.viewer-control');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const parts = {
    enamel: ['Емаль', 'Тверда зовнішня оболонка коронки зуба. Захищає тканини, що розташовані під нею.'],
    dentin: ['Дентин', 'Тверда тканина, яка становить основну частину зуба. Розташована під емаллю коронки та цементом кореня, оточує пульпу.'],
    pulp: ['Пульпа', 'М’яка тканина всередині зуба, що містить судини й нерви. Заповнює пульпову камеру та кореневий канал.'],
    root: ['Корінь', 'Частина зуба, розташована в кістковій лунці. Його поверхню вкриває цемент; усередині проходить кореневий канал.']
  };
  const hotspotNote = document.getElementById('hotspot-note');
  document.getElementById('close-hotspot-note').addEventListener('click', () => {
    hotspotNote.hidden = true;
    document.getElementById('tooth-canvas')?.focus({ preventScroll: true });
  });
  hotspotNote.addEventListener('keydown', event => {
    if (event.key === 'Escape') { hotspotNote.hidden = true; document.getElementById('tooth-canvas')?.focus(); }
  });
  let selectedPart = 'enamel';
  let viewer = null;
  // Explanations remain usable even if WebGL or the local module is unavailable.
  function selectPart(part) {
    if (!parts[part]) return;
    selectedPart = part;
    document.getElementById('part-title').textContent = parts[part][0];
    document.getElementById('part-text').textContent = parts[part][1];
    document.querySelectorAll('[data-part]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.part === part));
    });
    if (viewer) {
      if (part === 'dentin' || part === 'pulp') {
        toggle.checked = true;
        viewer.setCutaway();
      }
      viewer.highlight(part);
    }
  }
  document.querySelectorAll('[data-part]').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      const part = button.dataset.part;
      selectPart(part);
      hotspotNote.hidden = !button.classList.contains('tooth-hotspot');
      document.getElementById('hotspot-note-title').textContent = parts[part][0];
      document.getElementById('hotspot-note-text').textContent = parts[part][1];
    });
  });
  let failed = false;
  let cleanupPartial = () => {};
  const timeout = window.setTimeout(showFallback, 15000);
  function showFallback() {
    failed = true;
    clearTimeout(timeout);
    stage.setAttribute('aria-busy', 'false');
    stage.dataset.state = 'fallback';
    loading.hidden = true;
    fallback.hidden = false;
    failure.hidden = false;
    hotspotLayer.hidden = true;
    hotspotNote.hidden = true;
    badge.hidden = true;
    toggle.disabled = true;
    actionButtons.forEach(button => { button.disabled = true; });
    if (viewer) viewer.dispose();
    else cleanupPartial();
    viewer = null;
  }
  async function init() {
    try {
      const [THREE, { createTooth }] = await Promise.all([
        import('./assets/vendor/three-tooth.min.js'), import('./tooth-model.js')
      ]);
      if (failed) return;
      const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.1;
      const canvas = renderer.domElement;
      canvas.id = 'tooth-canvas';
      canvas.tabIndex = 0;
      canvas.setAttribute('role', 'img');
      canvas.setAttribute('aria-label', 'Інтерактивна 3D-модель різця. Стрілки — обертання, плюс і мінус — масштаб, Home — початковий вигляд.');
      canvas.setAttribute('aria-describedby', 'tooth-help');
      stage.prepend(canvas);
      cleanupPartial = () => { renderer.dispose(); canvas.remove(); };
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 50);
      const initialPosition = new THREE.Vector3(4.8, 2, 7);
      const initialTarget = new THREE.Vector3(0, -0.25, 0);
      camera.position.copy(initialPosition);
      const controls = new THREE.OrbitControls(camera, canvas);
      controls.target.copy(initialTarget);
      controls.enablePan = false;
      controls.enableDamping = !reducedMotion.matches;
      controls.dampingFactor = 0.1;
      controls.rotateSpeed = 0.7;
      controls.zoomSpeed = 0.75;
      controls.minDistance = 4.7;
      controls.maxDistance = 12;
      controls.minPolarAngle = 0.12;
      controls.maxPolarAngle = Math.PI - 0.12;
      controls.update();
      scene.add(new THREE.HemisphereLight(0xffffff, 0x78958b, 2.4));
      const keyLight = new THREE.DirectionalLight(0xffffff, 3);
      keyLight.position.set(3, 5, 6);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xe3fff4, 1.4);
      fillLight.position.set(-4, 1, -3);
      scene.add(fillLight);
      const model = createTooth(THREE);
      scene.add(model.cutaway, model.intact);
      model.intact.visible = false;
      let frameId = 0;
      let visible = true;
      let disposed = false;
      let resetAnimation = null;
      let lastResetTime = 0;
      const hotspots = [...hotspotLayer.querySelectorAll('button')];
      const svgNS = 'http://www.w3.org/2000/svg';
      const connectors = document.createElementNS(svgNS, 'svg');
      connectors.classList.add('hotspot-connectors');
      connectors.setAttribute('aria-hidden', 'true');
      hotspotLayer.prepend(connectors);
      const lines = new Map(hotspots.map(button => {
        const line = document.createElementNS(svgNS, 'line');
        connectors.append(line);
        return [button.dataset.part, line];
      }));
      const offsets = { enamel: [62,-12], dentin: [66,8], pulp: [-62,-12], root: [60,0] };
      const raycaster = new THREE.Raycaster();
      const projected = new THREE.Vector3();
      const direction = new THREE.Vector3();
      function positionHotspots() {
        const width = stage.clientWidth, height = stage.clientHeight;
        connectors.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const geometry = toggle.checked ? model.cutaway : model.intact;
        for (const button of hotspots) {
          const part = button.dataset.part;
          const anchor = model.anchors[part];
          projected.copy(anchor).project(camera);
          const x = (projected.x * .5 + .5) * width;
          const y = (-projected.y * .5 + .5) * height;
          direction.copy(anchor).sub(camera.position);
          const distance = direction.length();
          raycaster.set(camera.position, direction.normalize());
          const hit = raycaster.intersectObjects(geometry.children, false)[0];
          const occluded = hit && hit.distance < distance - .12;
          const internal = part === 'dentin' || part === 'pulp';
          const show = projected.z < 1 && projected.z > -1 && x > 12 && x < width - 12 && y > 12 && y < height - 12 && !occluded && (toggle.checked || !internal);
          button.hidden = !show;
          button.tabIndex = show ? 0 : -1;
          const line = lines.get(part);
          line.style.display = show ? '' : 'none';
          if (!show) continue;
          const [ox, oy] = offsets[part];
          const labelX = Math.max(44, Math.min(width - 44, x + ox));
          const labelY = Math.max(42, Math.min(height - 28, y + oy));
          button.style.left = `${labelX}px`;
          button.style.top = `${labelY}px`;
          line.setAttribute('x1', x);
          line.setAttribute('y1', y);
          line.setAttribute('x2', labelX);
          line.setAttribute('y2', labelY);
        }
      }
      function invalidate() {
        if (!frameId && !disposed && visible && !document.hidden) frameId = requestAnimationFrame(render);
      }
      function render(time) {
        frameId = 0;
        if (disposed || !visible || document.hidden) return;
        if (resetAnimation) {
          const t = Math.min(1, (time - lastResetTime) / 360);
          const ease = 1 - (1 - t) ** 3;
          camera.position.lerpVectors(resetAnimation.position, initialPosition, ease);
          controls.target.lerpVectors(resetAnimation.target, initialTarget, ease);
          if (t === 1) resetAnimation = null;
        }
        const changed = controls.update();
        try {
          renderer.render(scene, camera);
          positionHotspots();
        } catch (error) {
          showFallback();
          return;
        }
        if (changed || resetAnimation) invalidate();
      }
      function resize() {
        const width = stage.clientWidth, height = stage.clientHeight;
        if (!width || !height) return;
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
        renderer.setSize(width, height, false);
        invalidate();
      }
      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(stage);
      const intersectionObserver = new IntersectionObserver(entries => {
        visible = entries[0].isIntersecting;
        if (visible) invalidate();
      });
      intersectionObserver.observe(stage);
      controls.addEventListener('change', invalidate);
      controls.addEventListener('start', () => { resetAnimation = null; hotspotNote.hidden = true; });
      document.addEventListener('visibilitychange', invalidate);
      function orbit(horizontal, vertical = 0) {
        resetAnimation = null;
        const offset = camera.position.clone().sub(controls.target);
        const distance = offset.length();
        const theta = Math.atan2(offset.x, offset.z) + horizontal;
        const phi = THREE.MathUtils.clamp(Math.acos(offset.y / distance) + vertical, controls.minPolarAngle, controls.maxPolarAngle);
        camera.position.set(
          distance * Math.sin(phi) * Math.sin(theta),
          distance * Math.cos(phi),
          distance * Math.sin(phi) * Math.cos(theta)
        ).add(controls.target);
        controls.update();
        invalidate();
      }
      function zoom(factor) {
        resetAnimation = null;
        const offset = camera.position.clone().sub(controls.target);
        const distance = THREE.MathUtils.clamp(offset.length() * factor, controls.minDistance, controls.maxDistance);
        offset.setLength(distance);
        camera.position.copy(controls.target).add(offset);
        controls.update();
        invalidate();
      }
      function reset() {
        hotspotNote.hidden = true;
        // Flush any damping from an unfinished gesture before resetting.
        controls.enableDamping = false;
        controls.update();
        if (reducedMotion.matches) {
          camera.position.copy(initialPosition);
          controls.target.copy(initialTarget);
          controls.update();
        } else {
          resetAnimation = { position: camera.position.clone(), target: controls.target.clone() };
          lastResetTime = performance.now();
        }
        controls.enableDamping = !reducedMotion.matches;
        invalidate();
      }
      document.getElementById('rotate-left').addEventListener('click', () => orbit(-Math.PI / 8));
      document.getElementById('rotate-right').addEventListener('click', () => orbit(Math.PI / 8));
      document.getElementById('zoom-in').addEventListener('click', () => zoom(.85));
      document.getElementById('zoom-out').addEventListener('click', () => zoom(1 / .85));
      document.getElementById('reset-view').addEventListener('click', reset);
      canvas.addEventListener('keydown', event => {
        const keys = {
          ArrowLeft: () => orbit(-Math.PI / 12), ArrowRight: () => orbit(Math.PI / 12),
          ArrowUp: () => orbit(0, -Math.PI / 12), ArrowDown: () => orbit(0, Math.PI / 12),
          '+': () => zoom(.85), '=': () => zoom(.85), '-': () => zoom(1 / .85), Home: reset
        };
        if (keys[event.key]) { event.preventDefault(); keys[event.key](); }
      });
      function setCutaway() {
        model.cutaway.visible = toggle.checked;
        model.intact.visible = !toggle.checked;
        badge.textContent = toggle.checked ? 'Умовний розріз' : 'Зовнішній вигляд';
        invalidate();
      }
      toggle.addEventListener('change', setCutaway);
      function onMotionChange() {
        controls.enableDamping = !reducedMotion.matches;
        if (reducedMotion.matches && resetAnimation) { resetAnimation = null; reset(); }
        invalidate();
      }
      reducedMotion.addEventListener('change', onMotionChange);
      canvas.addEventListener('webglcontextlost', event => {
        event.preventDefault();
        showFallback();
      });
      viewer = {
        setCutaway,
        highlight(part) {
          model.cutaway.traverse(object => {
            if (object.isMesh) {
              object.material.emissive.set(object.userData.part === part ? '#24362c' : '#000000');
              object.material.emissiveIntensity = .12;
            }
          });
          invalidate();
        },
        dispose() {
          if (disposed) return;
          disposed = true;
          cancelAnimationFrame(frameId);
          resizeObserver.disconnect();
          intersectionObserver.disconnect();
          reducedMotion.removeEventListener('change', onMotionChange);
          document.removeEventListener('visibilitychange', invalidate);
          controls.dispose();
          const materials = new Set();
          scene.traverse(object => {
            if (object.isMesh) { object.geometry.dispose(); materials.add(object.material); }
          });
          materials.forEach(material => material.dispose());
          renderer.dispose();
          canvas.remove();
        }
      };
      resize();
      // Commit ready state only after the first real WebGL frame succeeds.
      renderer.render(scene, camera);
      clearTimeout(timeout);
      stage.setAttribute('aria-busy', 'false');
      stage.dataset.state = 'ready';
      stage.dataset.triangles = model.triangleCount;
      fallback.hidden = true;
      loading.hidden = true;
      hotspotLayer.hidden = false;
      badge.hidden = false;
      actionButtons.forEach(button => { button.disabled = false; });
      toggle.disabled = false;
      viewer.highlight(selectedPart);
      invalidate();
      window.addEventListener('pagehide', event => { if (!event.persisted) viewer?.dispose(); });
    } catch (error) {
      showFallback();
    }
  }
  init();
})();
