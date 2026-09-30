// .state/posts.json 의 각 글 url 을 1280×800 으로 열어 한 화면씩 내려가며 최대 5장 찍는다.
// 결과: .state/shots/<id>_N.jpg, 그리고 눈으로 거를 .state/sheet.jpg
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import fs from "node:fs";

const ST = new URL(".state/", import.meta.url).pathname;
const posts = JSON.parse(fs.readFileSync(ST + "posts.json", "utf8"));
const only = process.argv.slice(2); // id 를 넘기면 그것만 다시 찍는다
fs.mkdirSync(ST + "shots", { recursive: true });
const b = await chromium.launch({
  executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
});
await Promise.all(
  posts
    .filter((p) => !only.length || only.includes(p.id))
    .map(async (p) => {
      for (const f of fs.readdirSync(ST + "shots"))
        if (f.startsWith(p.id + "_")) fs.unlinkSync(ST + "shots/" + f);
      const page = await b.newPage({ viewport: { width: 1280, height: 800 }, locale: "ko-KR" });
      try {
        await page.goto(p.url, { waitUntil: "networkidle", timeout: 30000 }).catch(() => {});
        await page.waitForTimeout(1500);
        const H = await page.evaluate(() => document.documentElement.scrollHeight);
        let prev = 0, k = 0;
        for (let y = 0; y < H && k < 5; y += 800) {
          await page.evaluate((v) => window.scrollTo(0, v), y);
          await page.waitForTimeout(700);
          const buf = await page.screenshot({ type: "jpeg", quality: 82 });
          if (Math.abs(buf.length - prev) < 200) continue; // 스크롤이 안 먹은 같은 화면
          prev = buf.length;
          fs.writeFileSync(`${ST}shots/${p.id}_${++k}.jpg`, buf);
        }
        console.log(p.id, k);
      } catch (e) {
        console.log(p.id, "ERR", e.message);
      } finally {
        await page.close();
      }
    }),
);
await b.close();
execFileSync("python3", [new URL("sheet.py", import.meta.url).pathname], { stdio: "inherit" });
