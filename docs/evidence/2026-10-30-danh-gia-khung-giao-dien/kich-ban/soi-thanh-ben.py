# Thanh bên máy tính có cho thấy mục của trang đang mở không? (phiên đánh giá khung giao diện 30/10/2026)
# Khổ 1366×650 = phần hiển thị của trình duyệt trên laptop màn 1366×768. CHỈ máy chủ thử cục bộ.
# Mục nằm trong chân thanh bên (Của tôi, Hỗ trợ, Hướng dẫn) luôn thấy — không tính.
# Dùng: python3 soi-thanh-ben.py   (UX_TK_FILE trỏ tệp tài khoản thử, mặc định /tmp/ux/tai-khoan.json)
import json, os
from playwright.sync_api import sync_playwright

BASE = os.environ.get("UX_BASE", "http://localhost:8795")
HERE = os.path.dirname(os.path.abspath(__file__))
tk = {t["bo"].split("+")[0]: t for t in reversed(json.load(open(os.environ.get("UX_TK_FILE", "/tmp/ux/tai-khoan.json")))["taiKhoan"])}
mt = json.load(open(os.path.join(HERE, "../../2026-10-29-dot-0-khung-chung/ma-tran-quyen.json")))["bo"]
JS = """(() => { const a=document.querySelector('#sidebar [aria-current=page]'); if(!a) return {co:false};
 if (a.closest('.sidebar-foot')) return {co:true, chan:true};
 const f=document.querySelector('#sidebar .sidebar-foot')?.getBoundingClientRect();
 const r=a.getBoundingClientRect(), day=Math.min(innerHeight, f?f.top:1e9);
 return {co:true, txt:a.textContent.trim(), y:Math.round(r.top), day:Math.round(day), thay: r.bottom <= day + 1}; })()"""
with sync_playwright() as pw:
    br = pw.chromium.launch(args=["--no-sandbox"])
    for vai in ["SUPER_ADMIN", "ACCOUNTING", "SALES"]:
        t = tk[vai]; ctx = br.new_context(viewport={"width": 1366, "height": 650})
        ctx.request.post(BASE + "/api/auth/login", data=json.dumps({"phone": t["sdt"], "pin": t["pin"], "turnstileToken": "X"}), headers={"Origin": BASE, "Content-Type": "application/json"})
        pg = ctx.new_page(); khuat = []; tong = 0
        for p in mt[vai]["trang"]:
            if p in ("/order", "/chuyen", "/xe-chi-tiet", "/cuoc-chuyen"): continue
            pg.goto(BASE + p, wait_until="load"); pg.wait_for_timeout(700)
            r = pg.evaluate(JS)
            if not r.get("co") or r.get("chan"): continue
            tong += 1
            if not r["thay"]: khuat.append(f'{p} («{r["txt"]}» ở y={r["y"]}, phần thấy được tới y={r["day"]})')
        print(f"{vai} 1366×650: {len(khuat)}/{tong} trang có mục đang mở BỊ KHUẤT ở thanh bên"); [print("   ", k) for k in khuat]
        ctx.close()
    br.close()
