// 근거 이미지 → R2. 열람은 cdn.aislop.kr(버킷 커스텀 도메인) 직결이라 Worker를 안 탄다.
//
// ⚠️ SDK를 넣지 마라. `ASSETS_BUCKET`이 곧 R2 클라이언트다 — aws-sdk/S3 클라이언트는
//    Workers **밖에서** R2를 붙일 때 쓰는 물건이라 여기선 번들만 키운다.

import { env } from "$lib/core/db/client";
import {
  IMAGE_TYPES,
  type ImageType,
  MAX_IMAGE_BYTES,
  sniffImageType,
} from "$lib/core/image";

export class UploadError extends Error {}

export interface StoredImage {
  key: string;
  url: string;
  type: ImageType;
}

// 키에 원본 파일명을 쓰지 않는다 — 사용자가 정한 문자열이 공개 URL 경로가 되면
// 경로 조작·한글 인코딩·중복이 전부 따라온다. postId로 묶고 이름은 난수로 준다.
const keyFor = (postId: string, type: ImageType) =>
  `evidence/${postId}/${crypto.randomUUID()}.${type === "jpeg" ? "jpg" : type}`;

export async function putEvidenceImage(
  postId: string,
  file: File,
): Promise<StoredImage> {
  const bucket = env().ASSETS_BUCKET;
  const base = env().CDN_BASE;
  // 로컬 dev엔 바인딩이 없다. 조용히 넘어가면 "왜 안 뜨지"가 되므로 말하고 멈춘다.
  if (!bucket || !base) throw new UploadError("이미지 저장소가 연결되지 않음");

  if (file.size === 0) throw new UploadError("빈 파일");
  if (file.size > MAX_IMAGE_BYTES)
    throw new UploadError(
      `이미지는 ${Math.floor(MAX_IMAGE_BYTES / 1024 / 1024)}MB까지`,
    );

  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImageType(bytes);
  if (!type) throw new UploadError("PNG·JPEG·WEBP만 올릴 수 있음");

  const key = keyFor(postId, type);
  await bucket.put(key, bytes, {
    httpMetadata: {
      // ⚠️ 파일이 준 Content-Type이 아니라 **우리가 판별한 것**을 적는다.
      contentType: IMAGE_TYPES[type],
      // 키가 난수라 내용이 바뀔 일이 없다 — 영구 캐시.
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return { key, url: `${base}/${key}`, type };
}

// 근거를 지울 때 R2 객체도 같이 지운다. 남겨 두면 아무도 안 가리키는 파일이 영영 쌓인다.
export async function deleteEvidenceImage(key: string): Promise<void> {
  await env().ASSETS_BUCKET?.delete(key);
}
