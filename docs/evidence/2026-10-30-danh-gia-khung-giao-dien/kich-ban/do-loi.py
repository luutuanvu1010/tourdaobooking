# Chạy do-loi-hien-thi.js trên mọi trang × khổ cho các vai chỉ định; ghi so-lieu/loi-hien-thi.json.
# CHỈ máy chủ thử cục bộ. Dùng: python3 do-loi.py --vai SUPER_ADMIN,DRIVER,DRIVER_PARTNER --kho 390x844,1040x900,1440x900
import argparse, json, os, re, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("UX_BASE", "http://localhost:8795")
if not re.match(r"^http://(localhost|127\.0\.0\.1):", BASE):
    sys.exit("Chỉ chạy trên máy chủ thử cục bộ")
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--vai", required=True)
ap.add_argument("--kho", default="390x844,1040x900,1440x900")
ap.add_argument("--trang", default="")
ap.add_argument("--ra", default=os.path.join(HERE, "..", "so-lieu", "loi-hien-thi.json"))
ap.add_argument("--css", default="")
a = ap.parse_args()

tk = {t["bo"].split("+")[0]: t for t in reversed(json.load(open(os.environ.get("UX_TK_FILE", "/tmp/ux/tai-khoan.json")))["taiKhoan"])}
ma_tran = json.load(open(os.path.join(HERE, "../../2026-10-29-dot-0-khung-chung/ma-tran-quyen.json")))["bo"]
ID = json.load(open("/tmp/ux/id.json"))
THAM_SO = {"/order": "order", "/chuyen": "trip", "/xe-chi-tiet": "xe", "/cuoc-chuyen": "tripTaiXe"}
DO = open(os.path.join(HERE, "do-loi-hien-thi.js")).read()
css_them = open(a.css).read() if a.css else ""
url = lambda p: BASE + p + (f"?id={ID[THAM_SO[p]]}" if p in THAM_SO else "")
da_xet = set()
ket_qua = []
with sync_playwright() as pw:
    br = pw.chromium.launch(args=["--no-sandbox", "--lang=vi-VN"])
    for vai in a.vai.split(","):
        t = tk[vai]
        trang = [x for x in (a.trang.split(",") if a.trang else ["/"] + ma_tran[vai]["trang"]) if x and x not in da_xet]
        ctx = br.new_context(locale="vi-VN")
        r = ctx.request.post(BASE + "/api/auth/login", data=json.dumps({"phone": t["sdt"], "pin": t["pin"], "turnstileToken": "X"}), headers={"Origin": BASE, "Content-Type": "application/json"})
        if r.status != 200: print("✗ đăng nhập", vai, r.status); continue
        pg = ctx.new_page()
        for kho in a.kho.split(","):
            w, h = map(int, kho.split("x"))
            pg.set_viewport_size({"width": w, "height": h})
            for p in trang:
                o = {"vai": vai, "trang": p, "kho": w}
                try:
                    pg.goto(url(p), wait_until="load", timeout=30000); pg.wait_for_timeout(1500)
                    if css_them: pg.add_style_tag(content=css_them); pg.wait_for_timeout(200)
                    o["url"] = pg.url.replace(BASE, "")
                    o.update(pg.evaluate(DO))
                    print(f"✓ {vai} {p} {w}: cắt {len(o['cat'])} che {len(o['che'])} tràn {len(o['tran'])} rỗng {len(o['rong'])}")
                except Exception as e:
                    o["loi"] = str(e)[:200]; print("✗", vai, p, w, o["loi"])
                ket_qua.append(o)
        da_xet.update(trang)
        ctx.close()
    br.close()
os.makedirs(os.path.dirname(a.ra), exist_ok=True)
json.dump(ket_qua, open(a.ra, "w"), ensure_ascii=False, indent=1)
print("Ghi", a.ra, len(ket_qua), "ô")
