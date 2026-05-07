import type * as THREE from "three";
import type { CSS2DObject } from "three/examples/jsm/renderers/CSS2DRenderer.js";

export type VectorModel = {
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

export type VectorRender = {
  group: THREE.Group;
  labels: CSS2DObject[];
};

export const AXIS_COLORS = {
  x: 0xd94841,
  y: 0x26935d,
  z: 0x2f6fca,
};
