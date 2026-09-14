/**
 * Minimal Three.js STL viewer.
 * Call initSTLViewer(container, stlUrl) once per project card.
 * `container` is the empty <div class="stl-viewer"> element to render into.
 */
function initSTLViewer(container, stlUrl) {
  const wrap = container.closest(".viewer-wrap");
  const statusEl = wrap ? wrap.querySelector(".viewer-status") : null;

  const scene = new THREE.Scene();
  scene.background = null;

  const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 5000);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.AmbientLight(0xffffff, 0.6));

  const keyLight = new THREE.DirectionalLight(0xffffff, 0.9);
  keyLight.position.set(1, 1.5, 1.2);
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0xffffff, 0.4);
  fillLight.position.set(-1.5, -0.5, -1);
  scene.add(fillLight);

  const controls = new THREE.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.autoRotate = true;
  controls.autoRotateSpeed = 2.2;
  controls.addEventListener("start", () => { controls.autoRotate = false; });

  function sizeToContainer() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }
  sizeToContainer();

  let ro;
  if (window.ResizeObserver) {
    ro = new ResizeObserver(sizeToContainer);
    ro.observe(container);
  } else {
    window.addEventListener("resize", sizeToContainer);
  }

  const loader = new THREE.STLLoader();
  loader.load(
    stlUrl,
    (geometry) => {
      geometry.center();
      geometry.computeBoundingSphere();
      const radius = geometry.boundingSphere ? geometry.boundingSphere.radius : 1;

      const material = new THREE.MeshStandardMaterial({
        color: 0x6b7cff,
        metalness: 0.15,
        roughness: 0.55,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      const dist = radius * 2.8 || 5;
      camera.position.set(dist, dist * 0.6, dist);
      camera.lookAt(0, 0, 0);
      controls.minDistance = radius * 0.8;
      controls.maxDistance = radius * 8;
      controls.target.set(0, 0, 0);
      controls.update();

      if (statusEl) statusEl.hidden = true;
    },
    undefined,
    (err) => {
      console.error("Failed to load STL:", stlUrl, err);
      if (statusEl) {
        statusEl.textContent = "Couldn't load the 3D preview. Use the download links below to view the model in your own CAD software.";
        statusEl.classList.add("viewer-status--error");
        statusEl.hidden = false;
      }
    }
  );

  (function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  })();
}
