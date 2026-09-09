import { describe, expect, it } from "bun:test";
import { type ImageType, sniffImageType } from "./image";

const pad = (head: number[]): Uint8Array => {
  const b = new Uint8Array(16);
  b.set(head);
  return b;
};

const PNG = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
const JPEG = [0xff, 0xd8, 0xff, 0xe0];
const WEBP = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x45, 0x42, 0x50];

describe("sniffImageType", () => {
  const cases: [string, number[], ImageType][] = [
    ["png", PNG, "png"],
    ["jpeg", JPEG, "jpeg"],
    ["webp", WEBP, "webp"],
  ];
  for (const [name, head, want] of cases) {
    it(`${name}을 알아본다`, () => {
      expect(sniffImageType(pad(head))).toBe(want);
    });
  }

  it("HTML을 이미지로 통과시키지 않는다 — 이게 이 함수의 존재 이유다", () => {
    const html = new TextEncoder().encode("<html><script>alert(1)</script>");
    expect(sniffImageType(html)).toBeNull();
  });

  it("SVG도 거른다 — 스크립트를 품을 수 있어 이미지로 취급하면 안 된다", () => {
    const svg = new TextEncoder().encode(
      '<svg xmlns="http://www.w3.org/2000/svg">',
    );
    expect(sniffImageType(svg)).toBeNull();
  });

  it("RIFF지만 WEBP가 아니면(wav 등) 거른다", () => {
    const wav = [0x52, 0x49, 0x46, 0x46, 1, 2, 3, 4, 0x57, 0x41, 0x56, 0x45];
    expect(sniffImageType(pad(wav))).toBeNull();
  });

  it("12바이트보다 짧으면 판별하지 않는다", () => {
    expect(sniffImageType(new Uint8Array(PNG))).toBeNull();
  });
});
