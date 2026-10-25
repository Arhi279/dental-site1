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
  const hotspotDock = document.getElementById('hotspot-dock');
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
      hotspotNote.hidden = !(button.classList.contains('tooth-hotspot') || button.closest('#hotspot-dock'));
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
    hotspotDock.hidden = true;
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
      renderer.toneMappingExposure = 1.0;
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
      const initialPosition = new THREE.Vector3(4.2, 1.35, 6.5);
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
      // Broad studio cards baked once into a small PMREM. No HDR download,
      // transparent materials, real-time shadows or per-frame lighting updates.
      const studio = new THREE.Scene();
      studio.background = new THREE.Color('#687570');
      const cardGeometry = new THREE.PlaneGeometry(1, 1);
      const cardMaterials = [];
      function softbox(position, width, height, radiance) {
        const color = new THREE.Color().setRGB(...radiance);
        const material = new THREE.MeshBasicMaterial({ color, side: THREE.DoubleSide });
        cardMaterials.push(material);
        const card = new THREE.Mesh(cardGeometry, material);
        card.position.set(...position);
        card.scale.set(width, height, 1);
        card.lookAt(0, 0, 0);
        studio.add(card);
      }
      softbox([-3.8, 3.5, 4.5], 3.5, 5.5, [6.0, 5.8, 5.5]);
      softbox([4.5, 1.4, 2.5], 2.5, 4.0, [2.2, 2.4, 2.5]);
      softbox([-1.0, 3.0, -4.0], 3.0, 4.0, [4.0, 4.1, 4.0]);
      const pmrem = new THREE.PMREMGenerator(renderer);
      let studioMap;
      try {
        studioMap = pmrem.fromScene(studio, .06, .1, 30, { size: 128 });
        scene.environment = studioMap.texture;
        scene.environmentIntensity = .8;
      } finally {
        pmrem.dispose();
        cardGeometry.dispose();
        cardMaterials.forEach(material => material.dispose());
      }
      cleanupPartial = () => { studioMap?.dispose(); renderer.dispose(); canvas.remove(); };
      scene.add(new THREE.HemisphereLight(0xffffff, 0x9baca4, .42));
      const keyLight = new THREE.DirectionalLight(0xfff9ed, 1.25);
      keyLight.position.set(-3.5, 5, 5);
      scene.add(keyLight);
      const fillLight = new THREE.DirectionalLight(0xeaf4ff, .35);
      fillLight.position.set(4, 1, 3);
      scene.add(fillLight);
      const rimLight = new THREE.DirectionalLight(0xf3fff9, .65);
      rimLight.position.set(-2, 3, -4);
      scene.add(rimLight);
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
      const raycaster = new THREE.Raycaster();
      const projected = new THREE.Vector3();
      const direction = new THREE.Vector3();
      const dockButtons = [...hotspotDock.querySelectorAll('button')];
      hotspots.forEach(button => button.setAttribute('aria-label', parts[button.dataset.part][0]));
      // Project the actual exterior, rather than using an angle-specific offset.
      // Sampling every vertex stays conservative at rotated/zoomed silhouettes.
      const outline = model.labelBounds || (() => {
        const points = [];
        model.intact.children.forEach(mesh => {
          const position = mesh.geometry.attributes.position;
          for (let i = 0; i < position.count; i++) points.push(new THREE.Vector3().fromBufferAttribute(position, i));
        });
        return points;
      })();
      let labelMetrics = null;
      function measureLabels() {
        labelMetrics = new Map();
        hotspots.forEach(button => {
          button.hidden = false;
          button.classList.remove('is-compact');
          labelMetrics.set(button.dataset.part, { width: button.offsetWidth, height: button.offsetHeight });
        });
      }
      function visibleAnchor(part, geometry, width, height) {
        const internal = part === 'dentin' || part === 'pulp';
        if (internal && !toggle.checked) return null;
        const candidates = (toggle.checked ? model.anchorCandidatesCutaway?.[part] : null) || model.anchorCandidates?.[part] || [model.anchors[part]];
        const sorted = [...candidates].sort((a, b) => a.distanceToSquared(camera.position) - b.distanceToSquared(camera.position));
        // The closest surface candidates are the likely front-facing ones.
        // A ray must end on actual visible tissue: no labels on a removed quadrant.
        for (const anchor of sorted.slice(0, 6)) {
          projected.copy(anchor).project(camera);
          const x = (projected.x * .5 + .5) * width;
          const y = (-projected.y * .5 + .5) * height;
          if (projected.z <= -1 || projected.z >= 1 || x < 0 || x > width || y < 0 || y > height) continue;
          direction.copy(anchor).sub(camera.position);
          const distance = direction.length();
          raycaster.set(camera.position, direction.normalize());
          raycaster.far = distance + .06;
          const hit = raycaster.intersectObjects(geometry.children, false)[0];
          if (hit && hit.object.userData.part === part && Math.abs(hit.distance - distance) < .06) return { x, y };
        }
        return null;
      }
      function positionHotspots() {
        const width = stage.clientWidth, height = stage.clientHeight;
        if (!labelMetrics) measureLabels();
        connectors.setAttribute('viewBox', `0 0 ${width} ${height}`);
        const geometry = toggle.checked ? model.cutaway : model.intact;
        const bounds = { left: Infinity, right: -Infinity, top: Infinity, bottom: -Infinity };
        for (const point of outline) {
          projected.copy(point).project(camera);
          const x = (projected.x * .5 + .5) * width;
          const y = (-projected.y * .5 + .5) * height;
          bounds.left = Math.min(bounds.left, x); bounds.right = Math.max(bounds.right, x);
          bounds.top = Math.min(bounds.top, y); bounds.bottom = Math.max(bounds.bottom, y);
        }
        // The clearance protects fine model details even at a grazing angle.
        const margin = 8, clearance = 10, gap = 8, top = 52, bottom = height - margin;
        const available = {
          left: bounds.left - clearance - margin,
          right: width - margin - bounds.right - clearance
        };
        const rails = { left: [], right: [] };
        const docked = new Set();
        for (const button of hotspots) {
          const part = button.dataset.part, line = lines.get(part);
          const anchor = visibleAnchor(part, geometry, width, height);
          line.style.display = 'none';
          if (!anchor) { button.hidden = true; button.tabIndex = -1; continue; }
          const metrics = labelMetrics.get(part);
          let labelWidth = metrics.width;
          let sides = ['left', 'right'].filter(side => available[side] >= labelWidth);
          const compact = !sides.length;
          if (compact) {
            labelWidth = 44;
            sides = ['left', 'right'].filter(side => available[side] >= labelWidth);
          }
          button.classList.toggle('is-compact', compact);
          if (!sides.length) { button.hidden = true; button.tabIndex = -1; docked.add(part); continue; }
          const preferred = anchor.x < (bounds.left + bounds.right) / 2 ? 'left' : 'right';
          sides.sort((a, b) => (rails[a].length * 2 + (a === preferred ? 0 : 1)) - (rails[b].length * 2 + (b === preferred ? 0 : 1)));
          const side = sides[0];
          const x = side === 'left' ? bounds.left - clearance - labelWidth / 2 : bounds.right + clearance + labelWidth / 2;
          rails[side].push({ button, line, anchor, x, y: anchor.y, height: metrics.height });
        }
        // Preserve the anchor order within each rail, then pack with real label
        // heights. Forward/backward passes avoid collisions near crown and apex.
        for (const lane of Object.values(rails)) {
          lane.sort((a, b) => a.anchor.y - b.anchor.y);
          let cursor = top;
          for (const label of lane) {
            label.y = Math.max(label.anchor.y, cursor + label.height / 2);
            cursor = label.y + label.height / 2 + gap;
          }
          cursor = bottom;
          for (let i = lane.length - 1; i >= 0; i--) {
            const label = lane[i];
            label.y = Math.min(label.y, cursor - label.height / 2);
            cursor = label.y - label.height / 2 - gap;
          }
          for (const label of lane) {
            if (label.y - label.height / 2 < top) { label.button.hidden = true; label.button.tabIndex = -1; docked.add(label.button.dataset.part); continue; }
            label.button.hidden = false;
            label.button.tabIndex = 0;
            label.button.style.left = `${label.x}px`;
            label.button.style.top = `${label.y}px`;
            label.line.style.display = '';
            label.line.setAttribute('x1', label.anchor.x); label.line.setAttribute('y1', label.anchor.y);
            label.line.setAttribute('x2', label.x); label.line.setAttribute('y2', label.y);
          }
        }
        hotspotDock.hidden = !docked.size;
        dockButtons.forEach(button => { button.hidden = !docked.has(button.dataset.part); });
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
        labelMetrics = null;
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
        badge.textContent = toggle.checked ? 'Анатомічний розріз' : 'Зовнішній вигляд';
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
        highlight() {
          // Selection lives in the labels and explanation; tissue colours stay neutral.
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
          studioMap?.dispose();
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
