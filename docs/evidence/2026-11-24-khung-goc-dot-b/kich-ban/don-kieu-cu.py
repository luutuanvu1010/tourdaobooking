# Dọn kiểu cũ của đợt B khung gốc (24/11/2026): gỡ khỏi public/app.css mọi bộ chọn nhắc tới một lớp của nhóm Tài xế – Vận chuyển mà KHÔNG còn tệp nào dùng.
# «Còn dùng» = tên lớp xuất hiện nguyên chữ (ranh giới từ) trong web/**/*.ts, src/**/*.ts, public/*.html, hoặc khớp một họ lớp ghép bằng chuỗi mẫu (TIEN_TO_DONG).
# Một luật mất hết bộ chọn thì gỡ cả luật; luật còn bộ chọn khác thì chỉ bỏ bộ chọn chết. Không đụng phần khung (giữa hai dấu mốc khung gốc), @keyframes, @font-face.
# Chạy từ gốc kho: python3 docs/evidence/2026-11-24-khung-goc-dot-b/kich-ban/don-kieu-cu.py [--ghi]   (không --ghi: chỉ in danh sách)
import glob, re, sys

HO = ("dp-", "vc-", "xdc-", "bb-", "bk-", "bg-", "tx-", "xb-", "dn-", "cp-")
# Họ lớp ghép động trong mã (vd `dp-chip-${tone}`): mọi lớp mở đầu bằng các tiền tố này coi như còn dùng.
TIEN_TO_DONG = ("dp-chip-", "vc-alert-", "vc-chip-", "vc-tone-", "dp-lg-", "bg-tab-", "bk-nhom-", "dn-", "dp-cot-", "dp-gb", "dp-khach", "dp-leg-hang",
                "dp-stop", "dp-tab-", "vc-sheet-", "cp-dong", "cp-so", "tx-o")

nguon = ""
for t in glob.glob("web/**/*.ts", recursive=True) + glob.glob("src/**/*.ts", recursive=True) + glob.glob("public/*.html"):
    nguon += open(t, encoding="utf-8").read() + "\n"

css = open("public/app.css", encoding="utf-8").read()
DAU, CUOI = "/* ---------- Khung gốc giao diện (ADR-0222)", "/* ---------- Hết khung gốc giao diện (ADR-0222) ---------- */"
i0, i1 = css.index(DAU), css.index(CUOI) + len(CUOI)

lop_css = set(re.findall(r"\.([a-z][a-z0-9-]*)", re.sub(r"/\*.*?\*/", "", css, flags=re.S)))
def con_dung(l):
    if any(l.startswith(p) for p in TIEN_TO_DONG): return True
    return re.search(r"(?<![a-z0-9-])" + re.escape(l) + r"(?![a-z0-9-])", nguon) is not None
chet = sorted(l for l in lop_css if l.startswith(HO) and not con_dung(l))

def bo_chon_chet(sel):
    # Lớp nằm trong :not(…) KHÔNG làm bộ chọn chết (vd `main h1:not(.vc-plate)` vẫn áp cho mọi h1 khác) — chỉ xét phần ngoài :not().
    ngoai = re.sub(r":not\([^()]*\)", "", sel)
    return any(re.search(r"\." + re.escape(l) + r"(?![a-z0-9-])", ngoai) for l in chet)

def tach_bo_chon(s):
    # tách theo dấu phẩy ở mức ngoài cùng (không nằm trong ngoặc)
    ra, sau, cur = [], 0, ""
    for ch in s:
        if ch in "([": sau += 1
        if ch in ")]": sau -= 1
        if ch == "," and sau == 0: ra.append(cur); cur = ""
        else: cur += ch
    ra.append(cur)
    return ra

def xu_ly(doan):
    """Đi qua một đoạn CSS (không lồng phần khung), trả đoạn đã dọn và số luật/bộ chọn đã gỡ."""
    out, i, n, go_luat, go_chon = [], 0, len(doan), 0, 0
    while i < n:
        if doan.startswith("/*", i):
            j = doan.index("*/", i) + 2; out.append(doan[i:j]); i = j; continue
        if doan[i] in " \t\r\n}":
            out.append(doan[i]); i += 1; continue
        # đầu một luật hoặc at-rule: tới dấu { đầu tiên
        j = doan.index("{", i)
        dau = doan[i:j]
        # tìm ngoặc đóng tương ứng
        sau, k = 1, j + 1
        while sau:
            if doan.startswith("/*", k): k = doan.index("*/", k) + 2; continue
            if doan[k] == "{": sau += 1
            elif doan[k] == "}": sau -= 1
            k += 1
        than = doan[j + 1:k - 1]
        if dau.lstrip().startswith("@"):
            if re.match(r"\s*@(media|container|supports)\b", dau):
                moi, a, b = xu_ly(than); go_luat += a; go_chon += b
                if moi.strip(): out.append(dau + "{" + moi + "}")
                else: go_luat += 1
            else:
                out.append(doan[i:k])
        else:
            ds = tach_bo_chon(dau)
            giu = [s for s in ds if not bo_chon_chet(s)]
            if not giu: go_luat += 1
            else:
                go_chon += len(ds) - len(giu)
                if len(giu) != len(ds):
                    lead = re.match(r"\s*", ds[0]).group(0)
                    giu = [g.strip() for g in giu]
                    out.append(lead + ", ".join(giu) + " {" + than + "}")
                else:
                    out.append(doan[i:k])
        i = k
    return "".join(out), go_luat, go_chon

truoc, a1, b1 = xu_ly(css[:i0])
sau_, a2, b2 = xu_ly(css[i1:])
moi = truoc + css[i0:i1] + sau_
moi = re.sub(r"\n{3,}", "\n\n", moi)
print(f"{len(chet)} lớp không còn dùng; gỡ {a1 + a2} luật, bỏ {b1 + b2} bộ chọn khỏi luật còn lại; tệp {len(css)} → {len(moi)} ký tự")
print(" ".join(chet))
if "--ghi" in sys.argv:
    open("public/app.css", "w", encoding="utf-8").write(moi)
    print("đã ghi public/app.css")
