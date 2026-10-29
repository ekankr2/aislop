#!/bin/bash
# .state/posts.json 을 slopmaster 로 실제 /submit 폼에 올린다.
# 세션은 원격 D1에 2시간짜리를 직접 심고, 끝나면(실패해도) 지운다.
# ⚠️ 쿠키 원본은 이 프로세스 밖으로 안 나간다. DB엔 sha256만 들어간다(core/auth.ts와 같은 방식).
set -euo pipefail
HERE=$(cd "$(dirname "$0")" && pwd); ST=$HERE/.state; REPO=$(cd "$HERE/../../.." && pwd)
export CLOUDFLARE_API_TOKEN=$(cat ~/.claude/.cf-token)
ADMIN=082a32d5-1845-49a0-a49c-23404a347da9 # slopmaster
TOKEN=$(python3 -c "import secrets;print(secrets.token_urlsafe(32))")
HASH=$(printf %s "$TOKEN" | shasum -a 256 | cut -d' ' -f1)
NOW=$(TZ=Asia/Seoul date +%Y-%m-%dT%H:%M:%S+09:00); EXP=$(TZ=Asia/Seoul date -v+2H +%Y-%m-%dT%H:%M:%S+09:00)
d1() { (cd "$REPO" && npx wrangler d1 execute aislop --remote --command "$1" >/dev/null 2>&1); }
# 이름 중복 검사용 — 사이트는 URL만 보므로 웹·앱스토어처럼 주소가 다른 같은 서비스를 못 잡는다.
(cd "$REPO" && npx wrangler d1 execute aislop --remote --json --command "select title from post where deleted_at is null" 2>/dev/null) > "$ST/titles.json"
d1 "insert into session(token_hash,user_id,expires_at,created_at) values('$HASH','$ADMIN','$EXP','$NOW')"
trap 'd1 "delete from session where token_hash='"'"'$HASH'"'"'"; echo "세션 지움"' EXIT

TOKEN="$TOKEN" ST="$ST" python3 - <<'PY'
import glob, json, os, subprocess, time
st, t = os.environ["ST"], os.environ["TOKEN"]
posts = json.load(open(f"{st}/posts.json"))
seen = open(f"{st}/seen.txt", "a")
titles = [r["title"].lower().replace(" ", "") for r in json.load(open(f"{st}/titles.json"))[0]["results"]]
for p in posts:
    name = p["name"].lower().replace(" ", "")  # 이름 없는 글은 KeyError로 멈춘다 — 빠뜨리지 마라
    if any(name in x for x in titles):
        print("중복(이름) " + p["id"], p["name"], flush=True)
        seen.write(p["key"] + "\n"); seen.flush()
        continue
    files = sorted(glob.glob(f"{st}/shots/{p['id']}_*"))[:5]  # 사이트 상한 MAX_IMAGES_PER_POST=5
    args = []
    for f in files:
        args += ["-F", f"images=@{f};type=" + ("image/webp" if f.endswith("webp") else "image/png" if f.endswith("png") else "image/jpeg")]
    # 유저가 제품 링크만 준 글은 src == url이다 — 같은 주소를 두 번 적지 않는다.
    body = p["body"].rstrip() + f"\n\n{p['url']}" + ("" if p["src"] == p["url"] else f"\n출처 {p['src']}")
    r = subprocess.run(
        ["curl", "-s", "-H", "Origin: https://aislop.kr", "-b", f"session={t}",
         "--form-string", f"url={p['url']}", "--form-string", f"title={p['title']}", "--form-string", f"body={body}",
         "-F", f"category={p['category']}", *args, "https://aislop.kr/submit"],
        capture_output=True, text=True)
    ok = '"status":303' in r.stdout
    dup = "중복 사례" in r.stdout
    print(("올림 " if ok else "중복 " if dup else "실패 ") + p["id"], p["title"], f"({len(files)}장)",
          "" if ok or dup else r.stdout[:200], flush=True)
    if ok or dup:
        seen.write(p["key"] + "\n"); seen.flush()
    time.sleep(4)  # WRITE_LIMITER 20회/60초
PY
