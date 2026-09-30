# 한 줄 = 글 하나, 칸 = 캡처. 이걸 Read 로 보고 쓰레기 컷을 지운다.
import glob, json, os
from PIL import Image, ImageDraw, ImageStat
ST = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".state")
posts = json.load(open(os.path.join(ST, "posts.json")))

# 기계로 거를 수 있는 건 먼저 거른다: 거의 단색(로딩 전·빈 화면)은 지우고,
# GitHub 저장소는 README 글자벽이라 2장만 남긴다.
for p in posts:
    for f in sorted(glob.glob(os.path.join(ST, "shots", p["id"] + "_*"))):
        if ImageStat.Stat(Image.open(f).convert("L")).stddev[0] < 12:
            os.remove(f)
    if "github.com" in p["url"]:
        for f in sorted(glob.glob(os.path.join(ST, "shots", p["id"] + "_*")))[2:]:
            os.remove(f)
W, H = 320, 200
sheet = Image.new("RGB", (W * 5 + 60, H * len(posts)), "white")
d = ImageDraw.Draw(sheet)
for r, p in enumerate(posts):
    d.text((4, r * H + 4), p["id"], fill="black")
    for c, f in enumerate(sorted(glob.glob(os.path.join(ST, "shots", p["id"] + "_*")))[:5]):
        sheet.paste(Image.open(f).convert("RGB").resize((W, H)), (60 + c * W, r * H))
sheet.save(os.path.join(ST, "sheet.jpg"), quality=70)
print("sheet:", os.path.join(ST, "sheet.jpg"))
