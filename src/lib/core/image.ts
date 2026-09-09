// 업로드 이미지 판별. **확장자와 Content-Type을 믿지 않는다** — 둘 다 클라이언트가
// 적어 보내는 값이라, `evil.html`을 `.png`로 올리고 image/png라 우기면 그대로 통과한다.
// 공개 CDN(cdn.aislop.kr)에 그게 올라가면 우리 도메인에서 남의 HTML이 실행된다.
// 그래서 **파일 앞부분 바이트를 직접 본다.** 이건 위조하려면 진짜 이미지여야 한다.
//
// ⚠️ 라이브러리(file-type 등)를 넣지 마라 — 아래가 전부고, 세 포맷이면 12바이트다.
//    sharp는 네이티브 바이너리라 Workers에서 아예 안 돈다.

export const IMAGE_TYPES = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
} as const;

export type ImageType = keyof typeof IMAGE_TYPES;

// 5MB. 스크린샷 한 장이 이보다 크면 사진이 아니라 사고다.
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
// 사례 하나에 붙일 수 있는 이미지 수. 근거지 갤러리가 아니다.
export const MAX_IMAGES_PER_POST = 5;

const starts = (b: Uint8Array, sig: number[], at = 0) =>
  sig.every((v, i) => b[at + i] === v);

/** 앞부분 바이트로 실제 포맷을 판별한다. 모르는 것이면 null. */
export function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length < 12) return null;
  // \x89PNG\r\n\x1a\n
  if (starts(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
    return "png";
  // JPEG는 SOI(FF D8 FF)만 본다 — 뒤 바이트는 인코더마다 다르다.
  if (starts(bytes, [0xff, 0xd8, 0xff])) return "jpeg";
  // RIFF....WEBP — 4~7바이트는 파일 크기라 건너뛴다.
  if (
    starts(bytes, [0x52, 0x49, 0x46, 0x46]) &&
    starts(bytes, [0x57, 0x45, 0x42, 0x50], 8)
  )
    return "webp";
  return null;
}
