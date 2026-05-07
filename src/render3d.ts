import * as THREE from "three";
import {
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { VectorModel, VectorRender } from "./types.js";
import { AXIS_COLORS } from "./types.js";
import { formatNumber, keyToIndex, getVectorDisplayName } from "./math.js";
import {
  scene,
  vectors,
  vectorRoot,
  vectorRenders,
  axesGroup,
} from "./state.js";

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

function createLabel(text: string, className: string) {
  const element = document.createElement("div");
  element.className = className;
  element.textContent = text;
  return new CSS2DObject(element);
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

function removeCss2DLabels(root: THREE.Object3D) {
  root.traverse((object) => {
    if (object instanceof CSS2DObject) {
      object.element.remove();
    }
  });
}

export function buildAxes() {
  axesGroup.clear();
  axesGroup.add(createDashedAxis(new THREE.Vector3(-6, 0, 0), new THREE.Vector3(6, 0, 0), "#d94841"));
  axesGroup.add(createDashedAxis(new THREE.Vector3(0, -6, 0), new THREE.Vector3(0, 6, 0), "#26935d"));
  axesGroup.add(createDashedAxis(new THREE.Vector3(0, 0, -6), new THREE.Vector3(0, 0, 6), "#2f6fca"));

  const labelDefs: Array<[string, THREE.Vector3, string]> = [
    ["X", new THREE.Vector3(6.35, 0, 0), "#d94841"],
    ["Y", new THREE.Vector3(0, 6.35, 0), "#26935d"],
    ["Z", new THREE.Vector3(0, 0, 6.35), "#2f6fca"],
  ];

  for (const [text, position, color] of labelDefs) {
    const label = createLabel(text, "label label--axis");
    label.element.style.color = color;
    label.position.copy(position);
    axesGroup.add(label);
  }
}

export function renderVectors() {
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
