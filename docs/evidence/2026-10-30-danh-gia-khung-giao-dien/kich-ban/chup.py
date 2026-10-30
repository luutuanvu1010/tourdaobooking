# Chụp màn hình theo vai cho phiên đánh giá khung giao diện 30/10/2026.
# CHỈ chạy trên máy chủ thử cục bộ (may-chu.mjs, kho D1 tạm, dữ liệu giả) — không bao giờ trỏ vào production.
# Dùng: python3 chup.py --vai SALES,ACCOUNTING --kho 390x844,1440x900 [--trang /orders,/order] [--ra /tmp/ux/anh] [--css them.css]
#   --css: chèn thêm một tệp CSS vào mọi trang (dùng để dựng ảnh «sau» cho đề xuất sửa — không sửa mã sản phẩm).
import argparse, json, os, re, sys
from playwright.sync_api import sync_playwright

BASE = os.environ.get("UX_BASE", "http://localhost:8795")
if not re.match(r"^http://(localhost|127\.0\.0\.1):", BASE):
    sys.exit("Chỉ chạy trên máy chủ thử cục bộ")

ap = argparse.ArgumentParser()
ap.add_argument("--vai", required=True)
ap.add_argument("--kho", default="390x844,1440x900")
ap.add_argument("--trang", default="")
ap.add_argument("--ra", default="/tmp/ux/anh")
ap.add_argument("--css", default="")
ap.add_argument("--man", type=int, default=3, help="chụp tối đa N màn chiều cao")
ap.add_argument("--tk", default=os.environ.get("UX_TK_FILE", "/tmp/ux/tai-khoan.json"))
ap.add_argument("--id", default="/tmp/ux/id.json")
a = ap.parse_args()

tk = {t["bo"].split("+")[0]: t for t in reversed(json.load(open(a.tk))["taiKhoan"])}
ma_tran = json.load(open(os.path.join(os.path.dirname(__file__), "../../2026-10-29-dot-0-khung-chung/ma-tran-quyen.json")))["bo"]
ID = json.load(open(a.id)) if os.path.exists(a.id) else {}
THAM_SO = {"/order": "order", "/chuyen": "trip", "/xe-chi-tiet": "xe", "/cuoc-chuyen": "tripTaiXe"}
css_them = open(a.css).read() if a.css else ""

def url(p):
    k = THAM_SO.get(p)
    return BASE + p + (f"?id={ID[k]}" if k and ID.get(k) else "")

with sync_playwright() as pw:
    br = pw.chromium.launch(args=["--no-sandbox", "--lang=vi-VN", "--hide-scrollbars"])
    for vai in a.vai.split(","):
        t = tk[vai]
        trang = [x for x in (a.trang.split(",") if a.trang else ["/"] + ma_tran[vai]["trang"]) if x]
        for kho in a.kho.split(","):
            w, h = map(int, kho.split("x"))
            mobile = w < 641
            ctx = br.new_context(viewport={"width": w, "height": h}, device_scale_factor=1, is_mobile=mobile, has_touch=mobile, locale="vi-VN",
                                 user_agent=("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1" if mobile else None))
            r = ctx.request.post(BASE + "/api/auth/login", data=json.dumps({"phone": t["sdt"], "pin": t["pin"], "turnstileToken": "XXXX.DUMMY.TOKEN.XXXX"}),
                                 headers={"Origin": BASE, "Content-Type": "application/json"})
            if r.status != 200:
                print(f"✗ đăng nhập {vai}: {r.status} {r.text()[:200]}"); ctx.close(); continue
            pg = ctx.new_page()
            for p in trang:
                ten = (p.strip("/") or "trang-chu").replace("/", "_")
                thu_muc = os.path.join(a.ra, vai); os.makedirs(thu_muc, exist_ok=True)
                try:
                    pg.goto(url(p), wait_until="load", timeout=30000)
                    pg.wait_for_timeout(1800)
                    if css_them:
                        pg.add_style_tag(content=css_them); pg.wait_for_timeout(300)
                    cao = pg.evaluate("document.documentElement.scrollHeight")
                    pg.screenshot(path=os.path.join(thu_muc, f"{ten}-{w}.png"), clip={"x": 0, "y": 0, "width": w, "height": min(cao, a.man * h)}, full_page=True)
                    print(f"✓ {vai} {p} {w} cao {cao} → {pg.url.replace(BASE, '')[:60]}")
                except Exception as e:
                    print(f"✗ {vai} {p} {w}: {str(e)[:200]}")
            ctx.close()
    br.close()
