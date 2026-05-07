import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import {
  CSS2DRenderer,
} from "three/examples/jsm/renderers/CSS2DRenderer.js";
import type { VectorModel, VectorRender } from "./types.js";

function mustGetElement<T extends HTMLElement>(id: string): T {
  const element = document.getElementById(id);
  if (!element) {
    throw new Error(`Missing element: ${id}`);
  }
  return element as T;
}

export const CAMERA_TARGET = new THREE.Vector3(0, 0.72, 0);

export const viewport = mustGetElement<HTMLElement>("viewport");
export const scene = new THREE.Scene();
scene.background = new THREE.Color("#f7fafc");

export const camera = new THREE.PerspectiveCamera(45, 1, 0.1, 1000);
camera.position.set(8, 7, 8);

export const renderState = {
  renderer: null as THREE.WebGLRenderer | null,
  labelRenderer: null as CSS2DRenderer | null,
  controls: null as OrbitControls | null,
  fallbackCanvas: null as HTMLCanvasElement | null,
  fallbackContext: null as CanvasRenderingContext2D | null,
};

export const axesGroup = new THREE.Group();
export const grid = new THREE.GridHelper(12, 12, 0x8a94a7, 0xd9dee8);
grid.position.y = 0;

export const vectorRoot = new THREE.Group();

export const vectors: VectorModel[] = [
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

export const app = {
  selectedId: vectors[0].id,
  nextVectorId: 2,
  editMode: "components" as "components" | "direction",
};

export const vectorRenders = new Map<number, VectorRender>();

export const inputs = {
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
