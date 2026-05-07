import { describe, it, expect } from "vitest";
import {
  readNumber,
  formatNumber,
  formatInput,
  getDirectionControls,
  keyToIndex,
  randomVectorColor,
} from "./math.js";

describe("readNumber", () => {
  it("parses valid numbers", () => {
    expect(readNumber("3.14")).toBe(3.14);
    expect(readNumber("0")).toBe(0);
    expect(readNumber("-5")).toBe(-5);
    expect(readNumber("1e3")).toBe(1000);
  });

  it("returns 0 for invalid input", () => {
    expect(readNumber("")).toBe(0);
    expect(readNumber("abc")).toBe(0);
  });

  it("returns 0 for NaN/Infinity strings", () => {
    expect(readNumber("NaN")).toBe(0);
    expect(readNumber("Infinity")).toBe(0);
    expect(readNumber("-Infinity")).toBe(0);
  });
});

describe("formatNumber", () => {
  it("rounds to 3 decimal places", () => {
    expect(formatNumber(3.14159)).toBe("3.142");
    expect(formatNumber(1.5)).toBe("1.5");
    expect(formatNumber(2)).toBe("2");
  });

  it("handles negative zero", () => {
    expect(formatNumber(-0)).toBe("0");
  });

  it("handles non-finite values", () => {
    expect(formatNumber(NaN)).toBe("不可定义");
    expect(formatNumber(Infinity)).toBe("不可定义");
    expect(formatNumber(-Infinity)).toBe("不可定义");
  });

  it("handles very small numbers", () => {
    expect(formatNumber(0.0001)).toBe("0");
    expect(formatNumber(0.001)).toBe("0.001");
  });
});

describe("formatInput", () => {
  it("returns integer as-is", () => {
    expect(formatInput(3)).toBe("3");
    expect(formatInput(0)).toBe("0");
    expect(formatInput(-5)).toBe("-5");
  });

  it("rounds floats to 3 decimal places", () => {
    expect(formatInput(3.14159)).toBe("3.142");
    expect(formatInput(1.5)).toBe("1.5");
  });
});

describe("getDirectionControls", () => {
  it("computes yaw/pitch for a vector", () => {
    const result = getDirectionControls({ x: 3, y: 2, z: 4 } as never);
    expect(result.magnitude).toBeCloseTo(5.385, 2);
    expect(result.yaw).toBeCloseTo(33.69, 1);
    expect(result.pitch).toBeCloseTo(47.97, 1);
  });

  it("returns zero direction for zero vector", () => {
    const result = getDirectionControls({ x: 0, y: 0, z: 0 } as never);
    expect(result).toEqual({ magnitude: 0, yaw: 0, pitch: 0 });
  });

  it("handles axial vectors", () => {
    const result = getDirectionControls({ x: 5, y: 0, z: 0 } as never);
    expect(result.magnitude).toBe(5);
    expect(result.yaw).toBe(0);
    expect(result.pitch).toBe(0);
  });
});

describe("keyToIndex", () => {
  it("maps x/y/z to 0/1/2", () => {
    expect(keyToIndex("x")).toBe(0);
    expect(keyToIndex("y")).toBe(1);
    expect(keyToIndex("z")).toBe(2);
  });

  it("defaults to 2 for unknown keys", () => {
    expect(keyToIndex("w")).toBe(2);
    expect(keyToIndex("")).toBe(2);
  });
});

describe("randomVectorColor", () => {
  it("returns a hex color string", () => {
    const color = randomVectorColor(1);
    expect(color).toMatch(/^#[0-9a-f]{6}$/);
  });

  it("cycles through palette", () => {
    expect(randomVectorColor(0)).toBe("#c4514b");
    expect(randomVectorColor(6)).toBe("#c4514b");
    expect(randomVectorColor(1)).toBe("#238b69");
  });
});
