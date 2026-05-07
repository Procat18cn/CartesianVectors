import * as THREE from "three";
import type { VectorModel } from "./types.js";

export function readNumber(value: string) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "不可定义";
  const fixed = Number.parseFloat(value.toFixed(3));
  return Object.is(fixed, -0) ? "0" : String(fixed);
}

export function formatInput(value: number) {
  return Number.isInteger(value) ? String(value) : String(Number.parseFloat(value.toFixed(3)));
}

export function getDirectionControls(vector: VectorModel) {
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

export function keyToIndex(key: string) {
  return key === "x" ? 0 : key === "y" ? 1 : 2;
}

export function randomVectorColor(id: number) {
  const palette = ["#c4514b", "#238b69", "#2f6fca", "#b36a16", "#6f4bd8", "#216f7a"];
  return palette[id % palette.length];
}

export function hexToRgba(hex: string, opacity: number) {
  const color = new THREE.Color(hex);
  return `rgba(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(
    color.b * 255,
  )}, ${opacity})`;
}

export function getVectorDisplayName(vector: VectorModel) {
  return vector.name.trim() || "未命名向量";
}
