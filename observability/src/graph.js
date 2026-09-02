import * as THREE from "three";

const COLORS = {
  turn: 0x6b8498,
  tool: 0x5d8f86,
  mcp: 0x7a7596,
  approval: 0xc4923a,
  error: 0xb54a4a,
  meta: 0x3d4650,
  system: 0x3d4650,
};

function colorFor(ev) {
  if (ev.cls === "error" || ev.badges?.includes("error")) return COLORS.error;
  if (ev.cls === "approval" || ev.approval === "wait") return COLORS.approval;
  if (ev.cls === "mcp" || ev.badges?.includes("mcp")) return COLORS.mcp;
  if (ev.cls === "tool") return COLORS.tool;
  if (ev.cls === "turn") return COLORS.turn;
  return COLORS.meta;
}

function makeNode(ev, index) {
  const pulse = ev.cls === "approval" || ev.approval === "wait";
  const err = ev.cls === "error" || ev.badges?.includes("error");
  const geo = ev.cls === "mcp"
    ? new THREE.IcosahedronGeometry(0.22, 0)
    : ev.cls === "tool"
      ? new THREE.OctahedronGeometry(0.2)
      : ev.cls === "turn"
        ? new THREE.BoxGeometry(0.28, 0.28, 0.28)
        : new THREE.SphereGeometry(0.18, 12, 12);
  const mat = new THREE.MeshStandardMaterial({
    color: colorFor(ev),
    roughness: 0.72,
    metalness: 0.12,
    emissive: pulse ? 0x3a2a10 : err ? 0x2a1010 : 0x000000,
    emissiveIntensity: pulse || err ? 0.35 : 0,
  });
  const mesh = new THREE.Mesh(geo, mat);
  const angle = index * 0.46;
  const radius = 2.2 + (index % 7) * 0.35;
  mesh.position.set(
    Math.cos(angle) * radius,
    (index % 5) * 0.35 - 0.7,
    Math.sin(angle) * radius - index * 0.12,
  );
  mesh.userData = { pulse, phase: index * 0.7 };
  return mesh;
}

export function createGraph(container) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0d10);
  scene.fog = new THREE.Fog(0x0b0d10, 16, 42);

  const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 80);
  camera.position.set(8, 5.5, 11);

  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  container.appendChild(renderer.domElement);

  scene.add(new THREE.HemisphereLight(0x88919c, 0x0a0c10, 0.75));
  const key = new THREE.DirectionalLight(0xc4c0b4, 0.32);
  key.position.set(6, 10, 4);
  scene.add(key);

  const grid = new THREE.GridHelper(28, 28, 0x1a2028, 0x14181e);
  grid.position.y = -1.6;
  scene.add(grid);

  const nodes = new THREE.Group();
  const lines = new THREE.Group();
  scene.add(nodes);
  scene.add(lines);

  const meshes = [];
  let last = null;
  let theta = 0.35;
  let phi = 0.42;
  let dist = 16;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function layoutCamera() {
    camera.position.set(
      Math.cos(theta) * Math.cos(phi) * dist,
      Math.sin(phi) * dist * 0.65 + 2,
      Math.sin(theta) * Math.cos(phi) * dist,
    );
    camera.lookAt(0, 0, -meshes.length * 0.04);
  }

  function resize() {
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  function addEvent(ev) {
    if (ev.cls === "ctl") return;
    const mesh = makeNode(ev, meshes.length);
    nodes.add(mesh);
    if (last) {
      const geo = new THREE.BufferGeometry().setFromPoints([last.position.clone(), mesh.position.clone()]);
      const line = new THREE.Line(
        geo,
        new THREE.LineBasicMaterial({ color: 0x2a333c, transparent: true, opacity: 0.7 }),
      );
      lines.add(line);
    }
    last = mesh;
    meshes.push(mesh);
  }

  function reset() {
    while (nodes.children.length) {
      const child = nodes.children[0];
      child.geometry?.dispose?.();
      child.material?.dispose?.();
      nodes.remove(child);
    }
    while (lines.children.length) {
      const child = lines.children[0];
      child.geometry?.dispose?.();
      child.material?.dispose?.();
      lines.remove(child);
    }
    meshes.length = 0;
    last = null;
  }

  container.addEventListener("pointerdown", (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener("pointerup", () => {
    dragging = false;
  });
  window.addEventListener("pointermove", (e) => {
    if (!dragging) return;
    theta += (e.clientX - lastX) * 0.008;
    phi = Math.max(-0.2, Math.min(1.1, phi + (e.clientY - lastY) * 0.006));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  container.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      dist = Math.max(7, Math.min(32, dist + e.deltaY * 0.01));
    },
    { passive: false },
  );

  let raf = 0;
  const tick = () => {
    const t = performance.now() * 0.001;
    if (!dragging) theta += 0.0012;
    for (const mesh of meshes) {
      if (mesh.userData.pulse) {
        const s = 1 + 0.14 * Math.sin(t * 5 + mesh.userData.phase);
        mesh.scale.setScalar(s);
        mesh.material.emissiveIntensity = 0.28 + 0.2 * (0.5 + 0.5 * Math.sin(t * 5 + mesh.userData.phase));
      }
    }
    layoutCamera();
    renderer.render(scene, camera);
    raf = requestAnimationFrame(tick);
  };

  const ro = new ResizeObserver(resize);
  ro.observe(container);
  resize();
  tick();

  return {
    addEvent,
    reset,
    resize,
    dispose() {
      cancelAnimationFrame(raf);
      ro.disconnect();
      reset();
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
