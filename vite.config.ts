import { sveltekit } from "@sveltejs/kit/vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [tailwindcss(), sveltekit()],
  build: {
    // 한글 서브셋 woff2 조각은 대부분 4KB 미만이라 Vite 기본값이 통째로 base64로
    // CSS에 박는다 → 서브셋의 요점(쓰는 조각만 받기)이 사라진다.
    assetsInlineLimit: (file) => (/\.woff2?$/.test(file) ? false : undefined),
  },
});
