import * as THREE from "three";
import { formatNumber, hexToRgba } from "./math.js";
import {
  vectors,
  inputs,
  renderState,
} from "./state.js";

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

export function renderFallbackPreview() {
  if (!renderState.fallbackCanvas || !renderState.fallbackContext) return;

  const width = renderState.fallbackCanvas.clientWidth;
  const height = renderState.fallbackCanvas.clientHeight;
  const ctx = renderState.fallbackContext;
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
