import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export type Posture = 'book' | 'tabletop';

export type FoldState = {
  angle: number;
  posture: Posture;
  halfOpened: boolean;
};

// Scene units. Each half is a portrait slab, and the two halves together
// hold one inner display.
const HALF_WIDTH = 1;
const HEIGHT = 1.5;
const DEPTH = 0.06;
const BEVEL = 0.012;
const CORNER = 0.16;
const BEZEL = 0.035;

const DISPLAY_WIDTH = 2 * (HALF_WIDTH - BEZEL);
const DISPLAY_HEIGHT = HEIGHT - 2 * BEZEL;

const cameras: Record<
  Posture,
  { position: THREE.Vector3; target: THREE.Vector3 }
> = {
  book: {
    position: new THREE.Vector3(1.6, 1.1, 4.4),
    target: new THREE.Vector3(0, 0, 0.25),
  },
  tabletop: {
    position: new THREE.Vector3(1.4, 2.6, 4),
    target: new THREE.Vector3(0, 0.4, 0.35),
  },
};

// One half seen from the front: x runs from the hinge (0) to the outer edge
// (side * width), and only the two outer corners are rounded.
function halfOutline(
  side: 1 | -1,
  width: number,
  height: number,
  radius: number
) {
  const shape = new THREE.Shape();
  const outer = side * width;
  const top = height / 2;
  shape.moveTo(0, -top);
  shape.lineTo(outer - side * radius, -top);
  shape.quadraticCurveTo(outer, -top, outer, -top + radius);
  shape.lineTo(outer, top - radius);
  shape.quadraticCurveTo(outer, top, outer - side * radius, top);
  shape.lineTo(0, top);
  shape.closePath();
  return shape;
}

function halfBody(side: 1 | -1, material: THREE.Material) {
  const depth = DEPTH - 2 * BEVEL;
  const geometry = new THREE.ExtrudeGeometry(
    halfOutline(side, HALF_WIDTH, HEIGHT, CORNER),
    {
      depth,
      bevelEnabled: true,
      bevelThickness: BEVEL,
      bevelSize: BEVEL,
      bevelSegments: 3,
      curveSegments: 12,
    }
  );
  geometry.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geometry, material);
}

// Both halves map onto one texture, so the display runs across the hinge.
function halfScreen(side: 1 | -1, material: THREE.Material) {
  const geometry = new THREE.ShapeGeometry(
    halfOutline(side, HALF_WIDTH - BEZEL, DISPLAY_HEIGHT, CORNER - BEZEL),
    12
  );
  const position = geometry.attributes.position!;
  const uv = geometry.attributes.uv!;
  for (let i = 0; i < position.count; i++) {
    uv.setXY(
      i,
      position.getX(i) / DISPLAY_WIDTH + 0.5,
      position.getY(i) / DISPLAY_HEIGHT + 0.5
    );
  }
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.z = DEPTH / 2 + 0.001;
  return mesh;
}

// The Posture example's screen: one pane while flat, two panes split at the
// hinge while half open. In tabletop the device lies a quarter turn around,
// so the left pane ends up at the bottom and the labels turn back upright.
function drawScreen(context: CanvasRenderingContext2D, state: FoldState) {
  const { width, height } = context.canvas;
  const book = state.posture === 'book';
  const panes = !state.halfOpened
    ? [{ label: 'Flat', dark: false }]
    : book
      ? [
          { label: 'Page 1', dark: true },
          { label: 'Page 2', dark: false },
        ]
      : [
          { label: 'Controls', dark: false },
          { label: 'Video', dark: true },
        ];

  const paneWidth = width / panes.length;
  panes.forEach((pane, index) => {
    context.fillStyle = pane.dark ? '#0f172a' : '#e0e7ff';
    context.fillRect(index * paneWidth, 0, paneWidth, height);

    context.save();
    context.translate(index * paneWidth + paneWidth / 2, height / 2);
    if (!book) {
      context.rotate(Math.PI / 2);
    }
    context.fillStyle = pane.dark ? '#ffffff' : '#0f172a';
    context.font = '600 88px Geist, system-ui, sans-serif';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(pane.label, 0, 0);
    context.restore();
  });
}

export function createFoldableScene(canvas: HTMLCanvasElement) {
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environment = environment;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.enablePan = false;
  controls.enableZoom = false;
  controls.minAzimuthAngle = -Math.PI / 3;
  controls.maxAzimuthAngle = Math.PI / 3;
  // Vertical swipes keep scrolling the page; sideways drags turn the phone.
  canvas.style.touchAction = 'pan-y';

  const screenCanvas = document.createElement('canvas');
  screenCanvas.width = 1024;
  screenCanvas.height = Math.round((1024 * DISPLAY_HEIGHT) / DISPLAY_WIDTH);
  const screenContext = screenCanvas.getContext('2d')!;
  const texture = new THREE.CanvasTexture(screenCanvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

  const body = new THREE.MeshPhysicalMaterial({
    color: 0x1c1c1f,
    metalness: 0.6,
    roughness: 0.35,
    clearcoat: 0.5,
    clearcoatRoughness: 0.2,
  });
  const display = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: 0x3a3a3f,
    metalness: 0.9,
    roughness: 0.25,
  });

  // stand lays the phone on the table in tabletop; device turns the hinge.
  const stand = new THREE.Group();
  const device = new THREE.Group();
  const [first, second] = ([-1, 1] as const).map((side) => {
    const half = new THREE.Group();
    half.add(halfBody(side, body), halfScreen(side, display));
    device.add(half);
    return half;
  }) as [THREE.Group, THREE.Group];
  device.add(
    new THREE.Mesh(
      new THREE.CylinderGeometry(DEPTH / 2, DEPTH / 2, HEIGHT - 2 * CORNER, 24),
      metal
    )
  );
  stand.add(device);
  scene.add(stand);

  let state: FoldState | undefined;

  function placeCamera(posture: Posture) {
    camera.position.copy(cameras[posture].position);
    controls.target.copy(cameras[posture].target);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = Math.PI;
    controls.update();
    // Only sideways turns, so the view never ends up under the table.
    const polar = controls.getPolarAngle();
    controls.minPolarAngle = polar;
    controls.maxPolarAngle = polar;
  }

  function update(next: FoldState) {
    const fold = THREE.MathUtils.degToRad(180 - next.angle);
    if (next.posture === 'book') {
      // Book stands up, and each half turns by half of the fold.
      stand.rotation.x = 0;
      device.rotation.z = 0;
      first.rotation.y = fold / 2;
      second.rotation.y = -fold / 2;
    } else {
      // Tabletop lies on its back with the hinge across, and only the top
      // half lifts.
      stand.rotation.x = -Math.PI / 2;
      device.rotation.z = Math.PI / 2;
      first.rotation.y = 0;
      second.rotation.y = -fold;
    }

    if (state?.posture !== next.posture) {
      placeCamera(next.posture);
    }
    if (
      state?.posture !== next.posture ||
      state?.halfOpened !== next.halfOpened
    ) {
      drawScreen(screenContext, next);
      texture.needsUpdate = true;
    }
    state = next;
  }

  // The canvas can draw before Geist loads, so draw the labels again after.
  document.fonts?.ready.then(() => {
    if (state) {
      drawScreen(screenContext, state);
      texture.needsUpdate = true;
    }
  });

  function resize() {
    const { clientWidth, clientHeight } = canvas;
    renderer.setSize(clientWidth, clientHeight, false);
    camera.aspect = clientWidth / clientHeight;
    camera.updateProjectionMatrix();
  }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  let visible = true;
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    visible = entry?.isIntersecting ?? true;
  });
  visibilityObserver.observe(canvas);

  let frame = 0;
  const loop = () => {
    frame = requestAnimationFrame(loop);
    if (visible) {
      controls.update();
      renderer.render(scene, camera);
    }
  };
  loop();

  function dispose() {
    cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    visibilityObserver.disconnect();
    controls.dispose();
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
      }
    });
    [body, display, metal].forEach((material) => material.dispose());
    texture.dispose();
    environment.dispose();
    pmrem.dispose();
    renderer.dispose();
  }

  return { update, dispose };
}

export type FoldableScene = ReturnType<typeof createFoldableScene>;
