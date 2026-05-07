import "./styles.css";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { CSS2DRenderer } from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { VectorModel } from "./types.js";
import {
  readNumber,
  formatNumber,
  formatInput,
  getDirectionControls,
  getVectorDisplayName,
  randomVectorColor,
} from "./math.js";
import {
  CAMERA_TARGET,
  scene,
  camera,
  renderState,
  viewport,
  axesGroup,
  grid,
  vectorRoot,
  vectors,
  app,
  inputs,
} from "./state.js";
import { buildAxes, renderVectors } from "./render3d.js";
import { renderFallbackPreview } from "./render2d.js";

scene.add(grid);
scene.add(axesGroup);

scene.add(new THREE.AmbientLight(0xffffff, 0.72));
const directionalLight = new THREE.DirectionalLight(0xffffff, 1.15);
directionalLight.position.set(8, 10, 6);
scene.add(directionalLight);

scene.add(vectorRoot);

initViewportRenderer();
buildAxes();
bindEvents();
syncAll();
resize();
animate();

function bindEvents() {
  inputs.addVector.addEventListener("click", () => {
    const id = app.nextVectorId++;
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
    app.selectedId = id;
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
  });
  inputs.app.addEventListener("transitionend", (e) => {
    if (e.propertyName === "grid-template-columns") resize();
  });

  window.addEventListener("resize", resize);
  window.addEventListener("keydown", (e) => {
    const target = e.target as HTMLElement;
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") return;

    if (e.key === "Delete" || e.key === "Backspace") {
      e.preventDefault();
      deleteVector(app.selectedId);
    } else if (e.key === "Tab") {
      e.preventDefault();
      const idx = vectors.findIndex((v) => v.id === app.selectedId);
      app.selectedId = vectors[(idx + 1) % vectors.length].id;
      syncAll();
    } else if (e.key === "1") {
      setView("iso");
    } else if (e.key === "2") {
      setView("xy");
    } else if (e.key === "3") {
      setView("xz");
    } else if (e.key === "4") {
      setView("yz");
    }
  });
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
  app.editMode = mode;
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
    renderState.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
    });
    renderState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    viewport.appendChild(renderState.renderer.domElement);

    renderState.labelRenderer = new CSS2DRenderer();
    renderState.labelRenderer.domElement.style.position = "absolute";
    renderState.labelRenderer.domElement.style.inset = "0";
    renderState.labelRenderer.domElement.style.pointerEvents = "none";
    viewport.appendChild(renderState.labelRenderer.domElement);

    renderState.controls = new OrbitControls(camera, renderState.renderer.domElement);
    renderState.controls.enableDamping = true;
    renderState.controls.target.copy(CAMERA_TARGET);
  } catch (error) {
    console.error("WebGL 初始化失败，已切换到 2D 预览模式。", error);
    const fallback = document.createElement("div");
    fallback.className = "fallback-stage";

    const canvas = document.createElement("canvas");
    canvas.className = "fallback-canvas";
    renderState.fallbackCanvas = canvas;
    renderState.fallbackContext = canvas.getContext("2d");

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
  inputs.componentMode.classList.toggle("mode-tab--active", app.editMode === "components");
  inputs.directionMode.classList.toggle("mode-tab--active", app.editMode === "direction");
  inputs.componentFields.classList.toggle("is-hidden", app.editMode !== "components");
  inputs.directionFields.classList.toggle("is-hidden", app.editMode !== "direction");
  inputs.directionTip.classList.toggle("is-hidden", app.editMode !== "direction");
}

function renderVectorList() {
  inputs.vectorList.replaceChildren();

  for (const vector of vectors) {
    const item = document.createElement("div");
    item.className = `vector-item${vector.id === app.selectedId ? " vector-item--active" : ""}`;

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
      app.selectedId = vector.id;
      syncAll();
    });

    const remove = document.createElement("button");
    remove.className = "vector-delete";
    remove.type = "button";
    remove.textContent = "删除";
    remove.disabled = vectors.length === 1;
    remove.addEventListener("click", () => deleteVector(vector.id));

    item.append(swatch, select, remove);
    inputs.vectorList.appendChild(item);
  }
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
  renderState.controls?.target.copy(CAMERA_TARGET);
  renderState.controls?.update();
  renderFallbackPreview();
}

function zoomCamera(multiplier: number) {
  if (!renderState.controls) return;
  const offset = camera.position.clone().sub(renderState.controls.target);
  camera.position.copy(renderState.controls.target.clone().add(offset.multiplyScalar(multiplier)));
  renderState.controls.update();
}

function resize() {
  const { clientWidth, clientHeight } = viewport;
  camera.aspect = clientWidth / Math.max(clientHeight, 1);
  camera.updateProjectionMatrix();
  renderState.renderer?.setSize(clientWidth, clientHeight);
  renderState.labelRenderer?.setSize(clientWidth, clientHeight);
  if (renderState.fallbackCanvas) {
    const pixelRatio = Math.min(window.devicePixelRatio, 2);
    renderState.fallbackCanvas.width = Math.max(1, Math.floor(clientWidth * pixelRatio));
    renderState.fallbackCanvas.height = Math.max(1, Math.floor(clientHeight * pixelRatio));
    renderState.fallbackCanvas.style.width = `${clientWidth}px`;
    renderState.fallbackCanvas.style.height = `${clientHeight}px`;
    renderState.fallbackContext?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    renderFallbackPreview();
  }
}

function animate() {
  requestAnimationFrame(animate);
  if (!renderState.renderer || !renderState.labelRenderer) return;
  renderState.controls?.update();
  renderState.renderer.render(scene, camera);
  renderState.labelRenderer.render(scene, camera);
}

function getSelectedVector() {
  const vector = vectors.find((entry) => entry.id === app.selectedId);
  if (!vector) {
    throw new Error("No selected vector");
  }
  return vector;
}

function deleteVector(id: number) {
  const vector = vectors.find((v) => v.id === id);
  if (!vector) return;
  if (!confirm(`确定删除「${getVectorDisplayName(vector)}」？`)) return;
  const index = vectors.findIndex((v) => v.id === id);
  if (index >= 0) vectors.splice(index, 1);
  if (app.selectedId === id) app.selectedId = vectors[0].id;
  syncAll();
}
