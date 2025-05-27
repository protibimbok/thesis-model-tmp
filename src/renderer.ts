import * as THREE from "three";
// @ts-ignore
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";

// Scene and renderer
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(
  60,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.set(20, 20, 20);
camera.lookAt(0, 0, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
document.body.appendChild(renderer.domElement);

// Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;

// Layers
const layers: Record<string, THREE.Object3D> = {};
let spacingMultiplier = 1;

// Base Layer
const baseBlock = new THREE.Mesh(
  new THREE.BoxGeometry(16, 1, 4),
  new THREE.MeshPhysicalMaterial({
    color: 0x170069,
    metalness: 0,
    roughness: 0,
    transmission: 1,
    transparent: true,
    opacity: 0.8,
    clearcoat: 1,
    clearcoatRoughness: 0,
  })
);
baseBlock.castShadow = true;
baseBlock.receiveShadow = true;
scene.add(baseBlock);
layers.base = baseBlock;

// Rail Layer
const rails = new THREE.Group();
const railGeometry = new THREE.BoxGeometry(16, 0.2, 1);
const railMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });

["front", "back"].forEach((_, i) => {
  const rail = new THREE.Mesh(railGeometry, railMaterial);
  rail.position.z = i === 0 ? 1.5 : -1.5;
  rail.castShadow = rail.receiveShadow = true;
  rails.add(rail);
});
scene.add(rails);
layers.rails = rails;

// Piezo Layer
const piezoGroup = new THREE.Group();
const piezoGeometry = new THREE.BoxGeometry(1, 0.2, 4);
const piezoMaterial = new THREE.MeshPhysicalMaterial({
  color: 0xffc107,
  transparent: true,
  opacity: 0.9,
  roughness: 0.2,
  transmission: 0.5,
});
const pinGeometry = new THREE.BoxGeometry(0.1, 0.2, 0.4);
const pinMaterial = new THREE.MeshStandardMaterial({
  color: 0xc0c0c0,
  metalness: 1,
  roughness: 0.3,
});

[-5.33, 0, 5.33].forEach((x) => {
  const block = new THREE.Mesh(piezoGeometry, piezoMaterial);
  block.position.set(x, 0, 0);
  piezoGroup.add(block);

  const leftPin = new THREE.Mesh(pinGeometry, pinMaterial);
  leftPin.position.set(x - 0.4, 0, -2);
  const rightPin = new THREE.Mesh(pinGeometry, pinMaterial);
  rightPin.position.set(x + 0.4, 0, -2);
  piezoGroup.add(leftPin, rightPin);
});
scene.add(piezoGroup);
layers.piezo = piezoGroup;

// Solar Panel
const solarPanel = new THREE.Mesh(
  new THREE.BoxGeometry(16, 0.2, 4),
  new THREE.MeshPhysicalMaterial({
    color: 0x1e3a8a,
    metalness: 0.3,
    roughness: 0.2,
    reflectivity: 0.6,
    clearcoat: 1,
    clearcoatRoughness: 0.1,
  })
);
solarPanel.castShadow = solarPanel.receiveShadow = true;
scene.add(solarPanel);
layers.solar = solarPanel;

// Labels
type LabelEntry = {
  sprite: THREE.Sprite;
  line: THREE.Line;
  offset: THREE.Vector3;
  getTargetObject: () => THREE.Object3D;
};
const labels: LabelEntry[] = [];

function createLabel(
  text: string,
  getTargetObject: () => THREE.Object3D,
  offset: THREE.Vector3
) {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  canvas.width = 256;
  canvas.height = 64;
  ctx.fillStyle = "black";
  ctx.font = "24px sans-serif";
  ctx.fillText(text, 10, 40);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(4, 1, 1);
  scene.add(sprite);

  const geometry = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(),
    new THREE.Vector3(),
  ]);
  const line = new THREE.Line(
    geometry,
    new THREE.LineBasicMaterial({ color: 0x000000 })
  );
  scene.add(line);

  labels.push({ sprite, line, offset, getTargetObject });
}
createLabel("Base Layer", () => baseBlock, new THREE.Vector3(0, 0, 5));
createLabel("Rail Layer", () => rails, new THREE.Vector3(0, 0, 5));
createLabel("Piezo-electric", () => piezoGroup, new THREE.Vector3(0, 0, 5));
createLabel("Solar Panel", () => solarPanel, new THREE.Vector3(2, 0, 5));

// Spacing update
function updatePositions() {
  const s = spacingMultiplier;
  baseBlock.position.y = 0.5 * s;
  rails.position.y = 1.1 * s;
  piezoGroup.position.y = 1.3 * s;
  solarPanel.position.y = 1.5 * s;
}
updatePositions();

// UI Handlers
(document.getElementById("toggleBase") as HTMLInputElement).onchange = (e) =>
  (baseBlock.visible = (e.target as HTMLInputElement).checked);
(document.getElementById("toggleRails") as HTMLInputElement).onchange = (e) =>
  (rails.visible = (e.target as HTMLInputElement).checked);
(document.getElementById("togglePiezo") as HTMLInputElement).onchange = (e) =>
  (piezoGroup.visible = (e.target as HTMLInputElement).checked);
(document.getElementById("toggleSolar") as HTMLInputElement).onchange = (e) =>
  (solarPanel.visible = (e.target as HTMLInputElement).checked);
(document.getElementById("spacingSlider") as HTMLInputElement).oninput = (
  e
) => {
  spacingMultiplier = parseFloat((e.target as HTMLInputElement).value);
  updatePositions();
};

// Lights
scene.add(new THREE.AmbientLight(0xffffff, 0.5));
const dirLight = new THREE.DirectionalLight(0xffffff, 0.7);
dirLight.position.set(10, 15, 10);
dirLight.castShadow = true;
scene.add(dirLight);

// Resize
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Animate
function animate() {
  requestAnimationFrame(animate);
  controls.update();

  let labelYOffset = 0;
  const labelSpacing = 1.2;

  for (const { sprite, line, offset, getTargetObject } of labels) {
    const obj = getTargetObject();

    if (!obj.visible) {
      sprite.visible = false;
      line.visible = false;
      continue;
    }

    // Compute bounding box
    const bbox = new THREE.Box3().setFromObject(obj);
    const center = bbox.getCenter(new THREE.Vector3());
    const edge = bbox.max.clone();
    edge.y = center.y; // Use horizontal edge at center height

    const labelPos = new THREE.Vector3()
      .copy(edge)
      .add(offset)
      .add(new THREE.Vector3(0, labelYOffset, 0)); // Add label vertical stacking

    sprite.position.copy(labelPos);
    sprite.quaternion.copy(camera.quaternion);
    sprite.visible = true;

    const positions = line.geometry.attributes
      .position as THREE.BufferAttribute;
    positions.setXYZ(0, edge.x, edge.y, edge.z);
    positions.setXYZ(1, labelPos.x, labelPos.y, labelPos.z);
    positions.needsUpdate = true;

    line.visible = true;
    labelYOffset += labelSpacing;
  }

  renderer.render(scene, camera);
}

animate();
