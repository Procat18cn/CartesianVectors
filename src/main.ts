import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DObject,
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";

type VectorModel = {
  id: number;
  name: string;
  x: number;
  y: number;
  z: number;
  color: string;
  thickness: number;
  visible: boolean;
  showComponents: boolean;
  showProjectionBox: boolean;
  showAngles: boolean;
  showNameLabel: boolean;
  showComponentLabels: boolean;
  showMagnitudeLabel: boolean;
};

type VectorRender = {
  group: THREE.Group;
  labels: CSS2DObject[];
};

const AXIS_COLORS = {
  x: 0xd94841,
  y: 0x26935d,
  z: 0x2f6fca,
};
const CAMERA_TARGET = new THREE.Vector3(0, 0.72, 0);

const viewport = mustGetElement<HTMLElement>("viewport");
const scene = new THREE.Scene();
scene.background = new THREE.Color("#f7fafc");

const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(8, 7, 8);

let renderer: THREE.WebGLRenderer | null = null;
let labelRenderer: CSS2DRenderer | null = null;
let controls: OrbitControls | null = null;
let fallbackCanvas: HTMLCanvasElement | null = null;
let fallbackContext: CanvasRenderingContext2D | null = null;

initViewportRenderer();

const axesGroup = new THREE.Group();
const grid = new THREE.GridHelper(12, 12, 0x8a94a7, 0xd9dee8);
grid.position.y = 0;
scene.add(grid);
scene.add(axesGroup);

scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
directionalLight.position.set(8, 10, 6);
scene.add(directionalLight);

const vectorRoot = new THREE.Group();
scene.add(vectorRoot);

const vectors: VectorModel[] = [
  {
    id: 1,
    name: "向量 A",
    x: 3,
    y: 2,
    z: 4,
    color: "#6f4bd8",
    thickness: 0.08,
    visible: true,
    showComponents: true,
    showProjectionBox: true,
    showAngles: true,
    showNameLabel: true,
    showComponentLabels: true,
    showMagnitudeLabel: true,
  },
];

let selectedId = vectors[0].id;
let nextVectorId = 2;
let editMode: "components" | "direction" = "components";
const vectorRenders = new Map<number, VectorRender>();

const inputs = {
  app: mustGetElement<HTMLDivElement>("app"),
  panelToggle: mustGetElement<HTMLButtonElement>("panelToggle"),
  addVector: mustGetElement<HTMLButtonElement>("addVector"),
  backgroundColor: mustGetElement<HTMLInputElement>("backgroundColor"),
  showGrid: mustGetElement<HTMLInputElement>("showGrid"),
  showAxes: mustGetElement<HTMLInputElement>("showAxes"),
  vectorList: mustGetElement<HTMLDivElement>("vectorList"),
  vectorName: mustGetElement<HTMLInputElement>("vectorName"),
  vectorColor: mustGetElement<HTMLInputElement>("vectorColor"),
  vectorX: mustGetElement<HTMLInputElement>("vectorX"),
  vectorY: mustGetElement<HTMLInputElement>("vectorY"),
  vectorZ: mustGetElement<HTMLInputElement>("vectorZ"),
  vectorMagnitude: mustGetElement<HTMLInputElement>("vectorMagnitude"),
  vectorYaw: mustGetElement<HTMLInputElement>("vectorYaw"),
  vectorPitch: mustGetElement<HTMLInputElement>("vectorPitch"),
  vectorThickness: mustGetElement<HTMLInputElement>("vectorThickness"),
  vectorVisible: mustGetElement<HTMLInputElement>("vectorVisible"),
  showComponents: mustGetElement<HTMLInputElement>("showComponents"),
  showProjectionBox: mustGetElement<HTMLInputElement>("showProjectionBox"),
  showAngles: mustGetElement<HTMLInputElement>("showAngles"),
  showNameLabel: mustGetElement<HTMLInputElement>("showNameLabel"),
  showComponentLabels: mustGetElement<HTMLInputElement>("showComponentLabels"),
  showMagnitudeLabel: mustGetElement<HTMLInputElement>("showMagnitudeLabel"),
  vectorDetails: mustGetElement<HTMLElement>("vectorDetails"),
  viewHelp: mustGetElement<HTMLButtonElement>("viewHelp"),
  viewHelpPopover: mustGetElement<HTMLDivElement>("viewHelpPopover"),
  componentMode: mustGetElement<HTMLButtonElement>("componentMode"),
  directionMode: mustGetElement<HTMLButtonElement>("directionMode"),
  componentFields: mustGetElement<HTMLDivElement>("componentFields"),
  directionFields: mustGetElement<HTMLDivElement>("directionFields"),
  directionTip: mustGetElement<HTMLParagraphElement>("directionTip"),
  resetView: mustGetElement<HTMLButtonElement>("resetView"),
  zoomIn: mustGetElement<HTMLButtonElement>("zoomIn"),
  zoomOut: mustGetElement<HTMLButtonElement>("zoomOut"),
};

buildAxes();
bindEvents();
syncAll();
resize();
animate();

function mustGetElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

function bindEvents() {
  inputs.addVector.addEventListener("click", () => {
    const id = nextVectorId++;
    vectors.push({
      id,
      name: `向量 ${String.fromCharCode(64 + Math.min(id, 26))}`,
      x: 2,
      y: id % 2 === 0 ? -1.5 : 1.5,
      z: 2.5,
      color: randomVectorColor(id),
      thickness: 0.08,
      visible: true,
      showComponents: true,
      showProjectionBox: true,
      showAngles: false,
      showNameLabel: true,
      showComponentLabels: true,
      showMagnitudeLabel: true,
    });
    selectedId = id;
    syncAll();
  });

  inputs.backgroundColor.addEventListener("input", () => {
    scene.background = new THREE.Color(inputs.backgroundColor.value);
    renderFallbackPreview();
  });
  inputs.showGrid.addEventListener("change", () => {
    grid.visible = inputs.showGrid.checked;
    renderFallbackPreview();
  });
  inputs.showAxes.addEventListener("change", () => {
    axesGroup.visible = inputs.showAxes.checked;
    renderFallbackPreview();
  });

  const updateSelected = (patch: Partial<VectorModel>) => {
    const vector = getSelectedVector();
    Object.assign(vector, patch);
    syncAll();
  };

  inputs.vectorName.addEventListener("input", () =>
    updateSelected({ name: inputs.vectorName.value }),
  );
  inputs.vectorName.addEventListener("blur", () => {
    if (!inputs.vectorName.value.trim()) {
      updateSelected({ name: "未命名向量" });
    }
  });
  inputs.vectorColor.addEventListener("input", () =>
    updateSelected({ color: inputs.vectorColor.value }),
  );
  inputs.vectorX.addEventListener("input", () =>
    updateSelected({ x: readNumber(inputs.vectorX.value) }),
  );
  inputs.vectorY.addEventListener("input", () =>
    updateSelected({ y: readNumber(inputs.vectorY.value) }),
  );
  inputs.vectorZ.addEventListener("input", () =>
    updateSelected({ z: readNumber(inputs.vectorZ.value) }),
  );
  inputs.vectorMagnitude.addEventListener("input", updateSelectedDirection);
  inputs.vectorYaw.addEventListener("input", updateSelectedDirection);
  inputs.vectorPitch.addEventListener("input", updateSelectedDirection);
  inputs.vectorThickness.addEventListener("input", () =>
    updateSelected({ thickness: readNumber(inputs.vectorThickness.value) }),
  );
  inputs.vectorVisible.addEventListener("change", () =>
    updateSelected({ visible: inputs.vectorVisible.checked }),
  );
  inputs.showComponents.addEventListener("change", () =>
    updateSelected({ showComponents: inputs.showComponents.checked }),
  );
  inputs.showProjectionBox.addEventListener("change", () =>
    updateSelected({ showProjectionBox: inputs.showProjectionBox.checked }),
  );
  inputs.showAngles.addEventListener("change", () =>
    updateSelected({ showAngles: inputs.showAngles.checked }),
  );
  inputs.showNameLabel.addEventListener("change", () =>
    updateSelected({ showNameLabel: inputs.showNameLabel.checked }),
  );
  inputs.showComponentLabels.addEventListener("change", () =>
    updateSelected({ showComponentLabels: inputs.showComponentLabels.checked }),
  );
  inputs.showMagnitudeLabel.addEventListener("change", () =>
    updateSelected({ showMagnitudeLabel: inputs.showMagnitudeLabel.checked }),
  );

  inputs.componentMode.addEventListener("click", () => setEditMode("components"));
  inputs.directionMode.addEventListener("click", () => setEditMode("direction"));

  inputs.resetView.addEventListener("click", () => setView("iso"));
  inputs.zoomIn.addEventListener("click", () => zoomCamera(0.82));
  inputs.zoomOut.addEventListener("click", () => zoomCamera(1.18));

  document.querySelectorAll<HTMLButtonElement>("[data-view]").forEach((button) => {
    button.addEventListener("click", () => setView(button.dataset.view ?? "iso"));
  });
  inputs.viewHelp.addEventListener("click", () => {
    const isHidden = inputs.viewHelpPopover.classList.toggle("is-hidden");
    inputs.viewHelp.setAttribute("aria-expanded", String(!isHidden));
  });
  inputs.panelToggle.addEventListener("click", () => {
    const isCollapsed = inputs.app.classList.toggle("panel-collapsed");
    inputs.panelToggle.setAttribute("aria-expanded", String(!isCollapsed));
    inputs.panelToggle.setAttribute("aria-label", isCollapsed ? "展开控制栏" : "收缩控制栏");
    window.setTimeout(resize, 190);
  });

  window.addEventListener("resize", resize);
}

function updateSelectedDirection() {
  const magnitude = Math.max(0, readNumber(inputs.vectorMagnitude.value));
  const yaw = THREE.MathUtils.degToRad(readNumber(inputs.vectorYaw.value));
  const pitch = THREE.MathUtils.degToRad(
    THREE.MathUtils.clamp(readNumber(inputs.vectorPitch.value), -90, 90),
  );
  const horizontal = magnitude * Math.cos(pitch);
  const vector = getSelectedVector();
  vector.x = horizontal * Math.cos(yaw);
  vector.y = horizontal * Math.sin(yaw);
  vector.z = magnitude * Math.sin(pitch);
  syncAll();
}

function setEditMode(mode: "components" | "direction") {
  editMode = mode;
  syncControls();
}

function syncAll() {
  syncControls();
  renderVectorList();
  renderVectors();
  renderDetails();
  renderFallbackPreview();
}

function initViewportRenderer() {
  try {
    renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    viewport.appendChild(renderer.domElement);

    labelRenderer = new CSS2DRenderer();
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.inset = "0";
    labelRenderer.domElement.style.pointerEvents = "none";
    viewport.appendChild(labelRenderer.domElement);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.copy(CAMERA_TARGET);
  } catch (error) {
    console.error("WebGL 初始化失败，已切换到 2D 预览模式。", error);
    const fallback = document.createElement("div");
    fallback.className = "fallback-stage";

    const canvas = document.createElement("canvas");
    canvas.className = "fallback-canvas";
    fallbackCanvas = canvas;
    fallbackContext = canvas.getContext("2d");

    const note = document.createElement("div");
    note.className = "fallback-note";
    note.innerHTML =
      "<strong>当前浏览器未启用 WebGL</strong><span>已切换到 2D 等轴测预览。若需完整 3D 拖拽旋转，请使用支持 WebGL 的浏览器或开启硬件加速。</span>";

    fallback.append(canvas, note);
    viewport.appendChild(fallback);
  }
}

function syncControls() {
  const vector = getSelectedVector();
  inputs.vectorName.value = vector.name;
  inputs.vectorColor.value = vector.color;
  inputs.vectorX.value = formatInput(vector.x);
  inputs.vectorY.value = formatInput(vector.y);
  inputs.vectorZ.value = formatInput(vector.z);
  const direction = getDirectionControls(vector);
  inputs.vectorMagnitude.value = formatInput(direction.magnitude);
  inputs.vectorYaw.value = formatInput(direction.yaw);
  inputs.vectorPitch.value = formatInput(direction.pitch);
  inputs.vectorThickness.value = String(vector.thickness);
  inputs.vectorVisible.checked = vector.visible;
  inputs.showComponents.checked = vector.showComponents;
  inputs.showProjectionBox.checked = vector.showProjectionBox;
  inputs.showAngles.checked = vector.showAngles;
  inputs.showNameLabel.checked = vector.showNameLabel;
  inputs.showComponentLabels.checked = vector.showComponentLabels;
  inputs.showMagnitudeLabel.checked = vector.showMagnitudeLabel;
  inputs.componentMode.classList.toggle("mode-tab--active", editMode === "components");
  inputs.directionMode.classList.toggle("mode-tab--active", editMode === "direction");
  inputs.componentFields.classList.toggle("is-hidden", editMode !== "components");
  inputs.directionFields.classList.toggle("is-hidden", editMode !== "direction");
  inputs.directionTip.classList.toggle("is-hidden", editMode !== "direction");
}

function renderVectorList() {
  inputs.vectorList.replaceChildren();

  for (const vector of vectors) {
    const item = document.createElement("div");
    item.className = `vector-item${vector.id === selectedId ? " vector-item--active" : ""}`;

    const swatch = document.createElement("span");
    swatch.className = "vector-swatch";
    swatch.style.backgroundColor = vector.color;

    const select = document.createElement("button");
    select.className = "vector-select";
    select.type = "button";
    select.textContent = `${getVectorDisplayName(vector)} (${formatNumber(vector.x)}, ${formatNumber(
      vector.y,
    )}, ${formatNumber(vector.z)})`;
    select.addEventListener("click", () => {
      selectedId = vector.id;
      syncAll();
    });

    const remove = document.createElement("button");
    remove.className = "vector-delete";
    remove.type = "button";
    remove.textContent = "删除";
    remove.disabled = vectors.length === 1;
    remove.addEventListener("click", () => {
      const index = vectors.findIndex((entry) => entry.id === vector.id);
      if (index >= 0) {
        vectors.splice(index, 1);
      }
      if (selectedId === vector.id) {
        selectedId = vectors[0].id;
      }
      syncAll();
    });

    item.append(swatch, select, remove);
    inputs.vectorList.appendChild(item);
  }
}

function renderVectors() {
  removeCss2DLabels(vectorRoot);
  vectorRoot.clear();
  vectorRenders.clear();

  for (const vector of vectors) {
    const group = new THREE.Group();
    const labels: CSS2DObject[] = [];
    group.visible = vector.visible;

    const end = new THREE.Vector3(vector.x, vector.y, vector.z);
    const length = end.length();
    if (length > 0.0001) {
      group.add(createArrow(new THREE.Vector3(0, 0, 0), end, vector.color, vector.thickness));
      if (vector.showNameLabel) {
        const label = createLabel(getVectorDisplayName(vector), "label");
        label.position.copy(end.clone().multiplyScalar(1.04));
        labels.push(label);
        group.add(label);
      }
      if (vector.showMagnitudeLabel) {
        const label = createLabel(`|v|=${formatNumber(length)}`, "label");
        label.position.copy(end.clone().multiplyScalar(0.52).add(new THREE.Vector3(0, 0.28, 0)));
        labels.push(label);
        group.add(label);
      }
    }

    if (vector.showComponents && length > 0.0001) {
      addComponentArrows(group, vector);
    }

    if (vector.showProjectionBox && length > 0.0001) {
      addProjectionBox(group, vector);
    }

    if (vector.showAngles && length > 0.0001) {
      addAngleGuides(group, labels, vector, end, length);
    }

    vectorRoot.add(group);
    vectorRenders.set(vector.id, { group, labels });
  }
}

function removeCss2DLabels(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof CSS2DObject) {
      object.element.remove();
    }
  });
}

function buildAxes() {
  axesGroup.clear();
  axesGroup.add(createDashedAxis(new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0), "#d94841"));
  axesGroup.add(createDashedAxis(new THREE.Vector3(0, -6, 0), new THREE.Vector3(0, 6, 0), "#26935d"));
  axesGroup.add(createDashedAxis(new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, 6), "#2f6fca"));

  const labels: Array<[string, THREE.Vector3, string]> = [
    ["X", new THREE.Vector3(6.35, 0, 0), "#d94841"],
    ["Y", new THREE.Vector3(0, 6.35, 0), "#26935d"],
    ["Z", new THREE.Vector3(0, 0, 6.35), "#2f6fca"],
  ];

  for (const [text, position, color] of labels) {
    const label = createLabel(text, "label label--axis");
    label.element.style.color = color;
    label.position.copy(position);
    axesGroup.add(label);
  }
}

function addComponentArrows(group: THREE.Group, vector: VectorModel) {
  const origin = new THREE.Vector3(0, 0, 0);
  const componentColor = vector.color;
  const components: Array<[THREE.Vector3, string, string]> = [
    [new THREE.Vector3(vector.x, 0, 0), "x", "x"],
    [new THREE.Vector3(0, vector.y, 0), "y", "y"],
    [new THREE.Vector3(0, 0, vector.z), "z", "z"],
  ];

  for (const [end, key, labelText] of components) {
    if (end.length() <= 0.0001) continue;
    group.add(createArrow(origin, end, componentColor, 0.065, 0.38));
    if (vector.showComponentLabels) {
      const label = createLabel(`${labelText}=${formatNumber(end.getComponent(keyToIndex(key)))}`, "label");
      label.position.copy(end.clone().multiplyScalar(1.08));
      group.add(label);
    }
  }
}

function addProjectionBox(group: THREE.Group, vector: VectorModel) {
  const points = [
    new THREE.Vector3(vector.x, 0, 0),
    new THREE.Vector3(vector.x, vector.y, 0),
    new THREE.Vector3(0, vector.y, 0),
    new THREE.Vector3(vector.x, 0, vector.z),
    new THREE.Vector3(0, vector.y, vector.z),
    new THREE.Vector3(vector.x, vector.y, vector.z),
    new THREE.Vector3(0, 0, vector.z),
  ];

  const segments: Array<[THREE.Vector3, THREE.Vector3]> = [
    [points[0], points[1]],
    [points[2], points[1]],
    [points[0], points[3]],
    [points[6], points[3]],
    [points[2], points[4]],
    [points[6], points[4]],
    [points[3], points[5]],
    [points[4], points[5]],
    [points[1], points[5]],
  ];

  const material = new THREE.LineDashedMaterial({
    color: 0x5a6478,
    dashSize: 0.16,
    gapSize: 0.1,
    transparent: true,
    opacity: 0.58,
  });

  for (const [start, end] of segments) {
    if (start.distanceTo(end) <= 0.0001) continue;
    const geometry = new THREE.BufferGeometry().setFromPoints([start, end]);
    const line = new THREE.Line(geometry, material);
    line.computeLineDistances();
    group.add(line);
  }
}

function addAngleGuides(
  group: THREE.Group,
  labels: CSS2DObject[],
  vector: VectorModel,
  end: THREE.Vector3,
  length: number,
) {
  const axes: Array<{
    name: string;
    axis: THREE.Vector3;
    color: number;
    cosine: number;
  }> = [
    { name: "α", axis: new THREE.Vector3(1, 0, 0), color: AXIS_COLORS.x, cosine: vector.x / length },
    { name: "β", axis: new THREE.Vector3(0, 1, 0), color: AXIS_COLORS.y, cosine: vector.y / length },
    { name: "γ", axis: new THREE.Vector3(0, 0, 1), color: AXIS_COLORS.z, cosine: vector.z / length },
  ];

  for (const axis of axes) {
    const angle = Math.acos(THREE.MathUtils.clamp(axis.cosine, -1, 1));
    const arc = createAngleArc(axis.axis, end.clone().normalize(), angle, axis.color);
    group.add(arc);

    const label = createLabel(`${axis.name}=${formatNumber(THREE.MathUtils.radToDeg(angle))}°`, "label");
    const mid = axis.axis.clone().lerp(end.clone().normalize(), 0.5).normalize().multiplyScalar(1.15);
    label.position.copy(mid);
    labels.push(label);
    group.add(label);
  }
}

function createAngleArc(
  from: THREE.Vector3,
  to: THREE.Vector3,
  angle: number,
  color: number,
) {
  const points: THREE.Vector3[] = [];
  const radius = 0.88;
  const steps = 28;
  const start = from.clone().normalize();
  const end = to.clone().normalize();
  let rotationAxis = start.clone().cross(end).normalize();

  if (rotationAxis.length() <= 0.0001) {
    rotationAxis = new THREE.Vector3(0, 1, 0).cross(start).normalize();
    if (rotationAxis.length() <= 0.0001) {
      rotationAxis = new THREE.Vector3(1, 0, 0).cross(start).normalize();
    }
  }

  for (let i = 0; i <= steps; i += 1) {
    const t = angle <= 0.0001 ? 0 : i / steps;
    points.push(
      start
        .clone()
        .applyAxisAngle(rotationAxis, angle * t)
        .normalize()
        .multiplyScalar(radius),
    );
  }

  const geometry = new THREE.BufferGeometry().setFromPoints(points);
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.9 });
  return new THREE.Line(geometry, material);
}

function createArrow(
  start: THREE.Vector3,
  end: THREE.Vector3,
  color: string,
  thickness: number,
  opacity = 1,
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const group = new THREE.Group();
  if (length <= 0.0001) return group;

  const normalized = direction.clone().normalize();
  const headLength = Math.min(Math.max(length * 0.18, 0.2), 0.48);
  const shaftLength = Math.max(length - headLength, 0.01);
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.48,
    metalness: 0.02,
    transparent: opacity < 1,
    opacity,
  });

  const shaftGeometry = new THREE.CylinderGeometry(thickness, thickness, shaftLength, 24);
  const shaft = new THREE.Mesh(shaftGeometry, material);
  shaft.position.copy(start.clone().add(normalized.clone().multiplyScalar(shaftLength / 2)));
  shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalized);

  const tail = new THREE.Mesh(new THREE.SphereGeometry(thickness, 20, 12), material);
  tail.position.copy(start);

  const headGeometry = new THREE.ConeGeometry(thickness * 2.7, headLength, 28);
  const head = new THREE.Mesh(headGeometry, material);
  head.position.copy(start.clone().add(normalized.clone().multiplyScalar(shaftLength + headLength / 2)));
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normalized);

  group.add(tail, shaft, head);
  return group;
}

function createDashedAxis(start: THREE.Vector3, end: THREE.Vector3, color: string) {
  const group = new THREE.Group();
  const direction = end.clone().sub(start).normalize();
  const axisLength = start.distanceTo(end);
  const headLength = 0.42;
  const dashLength = 0.34;
  const gapLength = 0.2;
  const radius = 0.038;
  const drawableLength = Math.max(0, axisLength - headLength * 0.92);
  const lineEnd = end.clone().sub(direction.clone().multiplyScalar(headLength * 0.92));
  const material = new THREE.MeshStandardMaterial({
    color,
    roughness: 0.5,
    transparent: true,
    opacity: 0.82,
  });

  let cursor = 0;
  while (cursor < drawableLength) {
    const segmentLength = Math.min(dashLength, drawableLength - cursor);
    const segmentStart = start.clone().add(direction.clone().multiplyScalar(cursor));
    const segmentEnd = start.clone().add(direction.clone().multiplyScalar(cursor + segmentLength));
    group.add(createCapsuleSegment(segmentStart, segmentEnd, radius, material));
    cursor += dashLength + gapLength;
  }

  const head = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, headLength, 24),
    new THREE.MeshStandardMaterial({ color, roughness: 0.48 }),
  );
  head.position.copy(lineEnd.clone().add(direction.clone().multiplyScalar(headLength / 2)));
  head.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);
  group.add(head);
  return group;
}

function createCapsuleSegment(
  start: THREE.Vector3,
  end: THREE.Vector3,
  radius: number,
  material: THREE.Material,
) {
  const direction = end.clone().sub(start);
  const length = direction.length();
  const geometry = new THREE.CapsuleGeometry(radius, Math.max(0.001, length - radius * 2), 4, 12);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start.clone().add(end).multiplyScalar(0.5));
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  return mesh;
}

function createLabel(text: string, className: string) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  return new CSS2DObject(element);
}

function renderDetails() {
  const vector = getSelectedVector();
  const v = new THREE.Vector3(vector.x, vector.y, vector.z);
  const length = v.length();

  const rows: Array<[string, string]> = [
    ["坐标", `(${formatNumber(vector.x)}, ${formatNumber(vector.y)}, ${formatNumber(vector.z)})`],
    ["|v|", formatNumber(length)],
  ];

  if (length <= 0.0001) {
    rows.push(["方向", "零向量无定义方向"]);
    rows.push(["夹角", "不可定义"]);
    rows.push(["方向余弦", "不可定义"]);
  } else {
    const unit = v.clone().divideScalar(length);
    const cosines = [vector.x / length, vector.y / length, vector.z / length];
    const angles = cosines.map((value) =>
      THREE.MathUtils.radToDeg(Math.acos(THREE.MathUtils.clamp(value, -1, 1))),
    );
    const identity = cosines.reduce((sum, value) => sum + value * value, 0);

    rows.push(["单位向量", `(${formatNumber(unit.x)}, ${formatNumber(unit.y)}, ${formatNumber(unit.z)})`]);
    const direction = getDirectionControls(vector);
    rows.push(["方向参数", `Yaw=${formatNumber(direction.yaw)}°, Pitch=${formatNumber(direction.pitch)}°`]);
    rows.push(["夹角", `α=${formatNumber(angles[0])}°, β=${formatNumber(angles[1])}°, γ=${formatNumber(angles[2])}°`]);
    rows.push(["方向余弦", `(${formatNumber(cosines[0])}, ${formatNumber(cosines[1])}, ${formatNumber(cosines[2])})`]);
    rows.push(["恒等式", `cos²α + cos²β + cos²γ = ${formatNumber(identity)}`]);
  }

  inputs.vectorDetails.replaceChildren(
    ...rows.flatMap(([term, value]) => {
      const dt = document.createElement("dt");
      dt.textContent = term;
      const dd = document.createElement("dd");
      dd.textContent = value;
      return [dt, dd];
    }),
  );
}

function setView(view: string) {
  const distance = 10;
  const positions: Record<string, THREE.Vector3> = {
    iso: new THREE.Vector3(8, 7, 8),
    xy: new THREE.Vector3(0, 0, distance),
    xz: new THREE.Vector3(0, -distance, 0),
    yz: new THREE.Vector3(distance, 0, 0),
  };
  camera.position.copy(positions[view] ?? positions.iso);
  controls?.target.copy(CAMERA_TARGET);
  controls?.update();
  renderFallbackPreview();
}

function zoomCamera(multiplier: number) {
  if (!controls) return;
  const offset = camera.position.clone().sub(controls.target);
  camera.position.copy(controls.target.clone().add(offset.multiplyScalar(multiplier)));
  controls.update();
}

function resize() {
  const { clientWidth, clientHeight } = viewport;
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
  renderer?.setSize(clientWidth, clientHeight);
  labelRenderer?.setSize(clientWidth, clientHeight);
  if (fallbackCanvas) {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    fallbackCanvas.width = Math.max(1, Math.floor(clientWidth * pixelRatio));
    fallbackCanvas.height = Math.max(1, Math.floor(clientHeight * pixelRatio));
    fallbackCanvas.style.width = `${clientWidth}px`;
    fallbackCanvas.style.height = `${clientHeight}px`;
    fallbackContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    renderFallbackPreview();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderer || !labelRenderer) return;
  controls?.update();
  renderer.render(scene, camera);
  labelRenderer.render(scene, camera);
}

function renderFallbackPreview() {
  if (!fallbackCanvas || !fallbackContext) return;

  const width = fallbackCanvas.clientWidth;
  const height = fallbackCanvas.clientHeight;
  const ctx = fallbackContext;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = inputs?.backgroundColor?.value ?? "#f7fafc";
  ctx.fillRect(0, 0, width, height);

  const visibleVectors = vectors.filter((vector) => vector.visible);
  const maxComponent = Math.max(
    6,
    ...visibleVectors.flatMap((vector) => [
      Math.abs(vector.x),
      Math.abs(vector.y),
      Math.abs(vector.z),
    ]),
  );
  const scale = Math.min(width, height) / (maxComponent * 3.2);
  const origin = { x: width * 0.5, y: height * 0.58 };

  const project = (x: number, y: number, z: number) => ({
    x: origin.x + (x - z) * scale,
    y: origin.y + ((x + z) * 0.42 - y) * scale,
  });

  if (inputs.showGrid.checked) {
    ctx.strokeStyle = "rgba(105, 118, 145, 0.18)";
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i += 1) {
      drawLine2d(ctx, project(-6, 0, i), project(6, 0, i));
      drawLine2d(ctx, project(i, 0, -6), project(i, 0, 6));
    }
  }

  if (inputs.showAxes.checked) {
    ctx.setLineDash([8, 6]);
    drawArrow2d(ctx, project(-6, 0, 0), project(6, 0, 0), "#d94841", 3);
    drawArrow2d(ctx, project(0, -6, 0), project(0, 6, 0), "#26935d", 3);
    drawArrow2d(ctx, project(0, 0, -6), project(0, 0, 6), "#2f6fca", 3);
    ctx.setLineDash([]);
    drawText2d(ctx, "X", project(6.4, 0, 0), "#d94841");
    drawText2d(ctx, "Y", project(0, 6.4, 0), "#26935d");
    drawText2d(ctx, "Z", project(0, 0, 6.4), "#2f6fca");
  }

  for (const vector of visibleVectors) {
    const end = project(vector.x, vector.y, vector.z);
    const origin2d = project(0, 0, 0);

    if (vector.showProjectionBox) {
      ctx.setLineDash([6, 5]);
      ctx.strokeStyle = "rgba(74, 85, 105, 0.55)";
      ctx.lineWidth = 1.2;
      const helperPoints = [
        [project(vector.x, 0, 0), project(vector.x, vector.y, 0)],
        [project(0, vector.y, 0), project(vector.x, vector.y, 0)],
        [project(vector.x, vector.y, 0), end],
        [project(vector.x, 0, vector.z), end],
        [project(0, vector.y, vector.z), end],
      ];
      for (const [start, finish] of helperPoints) {
        drawLine2d(ctx, start, finish);
      }
      ctx.setLineDash([]);
    }

    if (vector.showComponents) {
      const componentColor = hexToRgba(vector.color, 0.42);
      const xEnd = project(vector.x, 0, 0);
      const yEnd = project(0, vector.y, 0);
      const zEnd = project(0, 0, vector.z);
      drawArrow2d(ctx, origin2d, xEnd, componentColor, 2);
      drawArrow2d(ctx, origin2d, yEnd, componentColor, 2);
      drawArrow2d(ctx, origin2d, zEnd, componentColor, 2);
      if (vector.showComponentLabels) {
        drawText2d(ctx, `x=${formatNumber(vector.x)}`, { x: xEnd.x + 8, y: xEnd.y }, vector.color);
        drawText2d(ctx, `y=${formatNumber(vector.y)}`, { x: yEnd.x + 8, y: yEnd.y }, vector.color);
        drawText2d(ctx, `z=${formatNumber(vector.z)}`, { x: zEnd.x + 8, y: zEnd.y }, vector.color);
      }
    }

    drawArrow2d(ctx, origin2d, end, vector.color, Math.max(3, vector.thickness * 32));
    if (vector.showNameLabel) {
      drawText2d(ctx, vector.name, { x: end.x + 12, y: end.y - 10 }, vector.color);
    }
    if (vector.showMagnitudeLabel) {
      drawText2d(ctx, `|v|=${formatNumber(new THREE.Vector3(vector.x, vector.y, vector.z).length())}`, {
        x: (origin2d.x + end.x) / 2 + 12,
        y: (origin2d.y + end.y) / 2 - 10,
      }, vector.color);
    }
  }
}

function drawLine2d(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
) {
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
}

function drawArrow2d(
  ctx: CanvasRenderingContext2D,
  start: { x: number; y: number },
  end: { x: number; y: number },
  color: string,
  width: number,
) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy);
  if (length < 0.5) return;

  const angle = Math.atan2(dy, dx);
  const headLength = Math.min(16, Math.max(8, length * 0.12));

  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = width;
  ctx.lineCap = "round";
  drawLine2d(ctx, start, end);
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - headLength * Math.cos(angle - Math.PI / 7),
    end.y - headLength * Math.sin(angle - Math.PI / 7),
  );
  ctx.lineTo(
    end.x - headLength * Math.cos(angle + Math.PI / 7),
    end.y - headLength * Math.sin(angle + Math.PI / 7),
  );
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

function drawText2d(
  ctx: CanvasRenderingContext2D,
  text: string,
  position: { x: number; y: number },
  color: string,
) {
  ctx.save();
  ctx.font = "600 13px sans-serif";
  ctx.textBaseline = "middle";
  ctx.fillStyle = "rgba(255,255,255,0.88)";
  const metrics = ctx.measureText(text);
  ctx.fillRect(position.x - 5, position.y - 11, metrics.width + 10, 22);
  ctx.fillStyle = color;
  ctx.fillText(text, position.x, position.y);
  ctx.restore();
}

function getSelectedVector() {
  const vector = vectors.find((entry) => entry.id === selectedId);
  if (!vector) {
    throw new Error("No selected vector");
  }
  return vector;
}

function getVectorDisplayName(vector: VectorModel) {
  return vector.name.trim() || "未命名向量";
}

function readNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "不可定义";
  const fixed = Number.parseFloat(value.toFixed(3));
  return Object.is(fixed, -0) ? "0" : String(fixed);
}

function formatInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number.parseFloat(value.toFixed(3)));
}

function getDirectionControls(vector: VectorModel) {
  const magnitude = new THREE.Vector3(vector.x, vector.y, vector.z).length();
  if (magnitude <= 0.0001) {
    return { magnitude: 0, yaw: 0, pitch: 0 };
  }
  return {
    magnitude,
    yaw: THREE.MathUtils.radToDeg(Math.atan2(vector.y, vector.x)),
    pitch: THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(vector.z / magnitude, -1, 1))),
  };
}

function keyToIndex(key: string) {
  return key === "x" ? 0 : key === "y" ? 1 : 2;
}

function randomVectorColor(id: number) {
  const palette = ["#c4514b", "#238b69", "#2f6fca", "#b36a16", "#6f4bd8", "#216f7a"];
  return palette[id % palette.length];
}

function hexToRgba(hex: string, opacity: number) {
  const color = new THREE.Color(hex);
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
    color.b * 255,
  )}, ${opacity})`;
}
