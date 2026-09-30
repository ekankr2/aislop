#!/usr/bin/env python3
# 소스 두 곳에서 새 후보를 모아 .state/candidates.json 에 쓴다.
# 이미 올린 URL(원격 D1)과 이전에 본 키(.state/seen.txt)는 뺀다.
# 판정(AI를 스스로 밝혔나)은 여기서 하지 않는다 — hits는 사람(Claude)이 읽을 단서일 뿐이다.
import html, json, os, re, subprocess, sys, time, urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
ST = os.path.join(HERE, ".state")
REPO = os.path.abspath(os.path.join(HERE, "../../.."))
os.makedirs(ST, exist_ok=True)
UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/140 Safari/537.36"
PAGES = int(sys.argv[1]) if len(sys.argv) > 1 else 3

AI = re.compile(
    r"(claude|클로드|cursor|codex|코덱스|chatgpt|gpt|gemini|제미나이|openai|anthropic|"
    r"바이브 ?코딩|vibe ?cod|ai로|ai 에이전트|ai agent|llm|생성형|ai가|ai를|ai 기반|"
    r"ai-powered|인공지능|copilot|windsurf|lovable|bolt\.new)",
    re.I,
)


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.geturl(), r.read().decode("utf-8", "ignore")


def hits(text):
    return [m.group(0) for m in re.finditer(r".{0,70}" + AI.pattern + r".{0,70}", text, re.I)][:4]


def posted_urls():
    env = dict(os.environ, CLOUDFLARE_API_TOKEN=open(os.path.expanduser("~/.claude/.cf-token")).read().strip())
    out = subprocess.run(
        ["npx", "wrangler", "d1", "execute", "aislop", "--remote", "--json",
         "--command", "select url, submit_reason from post"],
        cwd=REPO, env=env, capture_output=True, text=True,
    ).stdout
    rows = json.loads(out)[0]["results"]
    return set(re.findall(r"https?://\S+", " ".join(f"{r['url']} {r['submit_reason']}" for r in rows)))


seen_path = os.path.join(ST, "seen.txt")
seen = set(open(seen_path).read().split()) if os.path.exists(seen_path) else set()
posted = posted_urls()
cands = []

# ── vibe.kowanas: 목록 → 상세(데이터가 SvelteKit 페이로드에 박혀 있다) ──
slugs = []
for p in range(1, PAGES + 1):
    _, s = get(f"https://vibe.kowanas.com/ko/new?page={p}")
    slugs += [x for x in re.findall(r'href="/ko/p/([^"]+)"', s) if x not in slugs]
for slug in slugs:
    key = "v:" + slug
    src = f"https://vibe.kowanas.com/ko/p/{slug}"
    if key in seen or src in posted:
        continue
    _, s = get(src)
    ko = re.search(r'ko:\{title:"(.*?)",description:"(.*?)"\}', s)
    en = re.search(r'en:\{title:"(.*?)",description:"(.*?)"\}', s)
    u = re.search(r',url:"(https?://[^"]+)",category', s)
    shot = re.search(r'screenshot_url:"([^"]+)"', s)
    if not ko or not u or u.group(1) in posted:
        continue
    text = ko.group(2) + " " + (en.group(2) if en else "")
    cands.append(dict(key=key, src=src, title=ko.group(1), url=u.group(1), text=ko.group(2),
                      hits=hits(ko.group(1) + " " + text), fallbackShot=shot.group(1) if shot else None))
    time.sleep(0.3)

# ── 긱뉴스 Show: 목록 → 토픽 ──
# ⚠️ 토픽 페이지가 /topic_browser_check 로 튕기면 **거기서 멈춘다.** 봇 차단이다 —
#    헤드리스 브라우저로 뚫지 마라. 못 읽은 건 seen에 안 넣으니 다음 날 다시 시도된다.
ids = []
for p in range(1, PAGES + 1):
    _, s = get(f"https://news.hada.io/show?page={p}")
    ids += [x for x in re.findall(r"topic\?id=(\d+)'", s) if x not in ids]
blocked = False
for tid in ids:
    key = "gn:" + tid
    src = f"https://news.hada.io/topic?id={tid}"
    if key in seen or src in posted:
        continue
    final, s = get(src)
    if "topic_browser_check" in final:
        blocked = True
        break
    t = re.search(r"<title>(.*?)</title>", s, re.S)
    link = re.search(r"class='topictitle.*?href=['\"]([^'\"]+)", s, re.S)
    body = re.search(r"topic_contents[^>]*>(.*?)</(?:span|div)>\s*</div>", s, re.S)
    text = re.sub(r"\s+", " ", html.unescape(re.sub(r"<[^>]+>", " ", body.group(1) if body else ""))).strip()
    url = link.group(1) if link else ""
    if not url.startswith("http") or url in posted:
        continue
    title = html.unescape(t.group(1)).replace("| GeekNews", "").strip() if t else ""
    cands.append(dict(key=key, src=src, title=title, url=url, text=text[:1500], hits=hits(title + " " + text)))
    time.sleep(2.5)

json.dump(cands, open(os.path.join(ST, "candidates.json"), "w"), ensure_ascii=False, indent=1)
print(f"후보 {len(cands)}개 (AI 단서 있음 {sum(1 for c in cands if c['hits'])}개)"
      + (" — 긱뉴스 봇 차단에 걸려 중간에 멈춤" if blocked else ""))
