#!/usr/bin/env python3
# Đợt gốc ngôn ngữ thị giác (ADR-0234 đề xuất, 24/11/2026): sinh tệp kiểu ĐỀ XUẤT từ public/app.css bằng một danh sách sửa có tên.
# Khác lớp xem trước 24/11 (lop-kieu/phuong-an-a.css + -b.css, tiêm chồng lên trang): đây là CHÍNH bản sửa tệp kiểu, chỉ ở ba tầng
#   1. giá trị gốc (:root), 2. khung chung (thanh trên, dải nhắc, thanh dưới, thanh bên, ảnh đại diện), 3. thành phần chung (.btn, .nut, .badge, .huy-hieu, tiền,
#   khối và bảng của khung gốc) — không có luật viết riêng cho một màn, không color-mix(), không px viết thẳng sau dấu mốc PWA.
# Kịch bản chụp (chup.mjs --thay-css) thay tệp /app.css của trang bằng tệp sinh ra, nên ảnh đề xuất là đúng thứ mã sẽ vẽ sau khi chủ duyệt
# (bước 4 của kế hoạch: chép tệp sinh ra vào public/app.css).
#
# Chạy từ GỐC kho:  python3 docs/evidence/2026-11-24-dot-goc-thi-giac/kich-ban/va-tep-kieu.py <ra.css> [--vao public/app.css]
# Mỗi lần sửa phải trúng ĐÚNG MỘT dòng và đúng một chỗ trong dòng, sai là dừng (tệp gốc đã đổi thì người chạy phải xem lại danh sách).
import sys

vao = sys.argv[sys.argv.index("--vao") + 1] if "--vao" in sys.argv else "public/app.css"
ra = sys.argv[1]
dong = open(vao, encoding="utf-8").read().split("\n")


def sua(dau, cu, moi):
    """Dòng (bỏ khoảng trắng đầu) bắt đầu bằng `dau` phải có đúng một; trong dòng đó `cu` phải xuất hiện đúng một lần."""
    trung = [i for i, d in enumerate(dong) if d.lstrip().startswith(dau)]
    if len(trung) != 1:
        sys.exit(f"«{dau}»: {len(trung)} dòng trùng (cần 1)")
    i = trung[0]
    if dong[i].count(cu) != 1:
        sys.exit(f"«{dau}»: «{cu}» xuất hiện {dong[i].count(cu)} lần (cần 1)")
    dong[i] = dong[i].replace(cu, moi)


def sua_het(dau, cu, moi, so):
    """Như sua(), cho luật lặp lại nguyên văn ở `so` dòng (hai khổ của cùng một màn)."""
    trung = [i for i, d in enumerate(dong) if d.lstrip().startswith(dau)]
    if len(trung) != so:
        sys.exit(f"«{dau}»: {len(trung)} dòng trùng (cần {so})")
    for i in trung:
        dong[i] = dong[i].replace(cu, moi)


def them_sau(dau, cac_dong):
    trung = [i for i, d in enumerate(dong) if d.lstrip().startswith(dau)]
    if len(trung) != 1:
        sys.exit(f"«{dau}»: {len(trung)} dòng trùng (cần 1)")
    dong[trung[0] + 1:trung[0] + 1] = cac_dong


CHU = " /* ADR-0234 */"

# ---------- 1. Giá trị gốc (:root) ----------
# Nền trang trung tính hơn, viền mảnh trung tính (Đ2; số chủ duyệt bằng ảnh)
sua("--c-surface-alt: #f2f5f9;", "#f2f5f9;", "#f4f6f8;" + CHU)
sua("--c-border: #e1e7ef;", "#e1e7ef;", "#e3e7ec;" + CHU)
# San hô: hành động chốt, KHÔNG còn cho số tiền (nguyên tắc 2)
sua("--c-accent: #c0392b;", "CHỈ hành động chốt (\"Xác nhận đơn\") và nhãn giá — không dùng cho lỗi/xoá", "CHỈ MỘT hành động chốt mỗi màn — không dùng cho tiền, lỗi, xoá (ADR-0234)")
# Hai bậc bo góc: 8 cho thứ bấm và gõ, 12 cho khối; tròn hẳn cho huy hiệu, ảnh đại diện (nguyên tắc 3)
sua("--radius-lg: 18px;", "18px;", "12px;" + CHU)
sua("--radius-xs: 6px;", "6px;", "8px;")
sua("--radius-tile: 14px;", "14px;", "12px;")
# Phẳng trước: khối viền mảnh, không bóng; chỉ lớp nổi (--shadow-overlay, --shadow-float) giữ bóng (nguyên tắc 3)
sua("--shadow-card: 0 1px 2px", "0 1px 2px rgba(15, 23, 42, 0.04), 0 3px 10px rgba(15, 23, 42, 0.05);", "0 0 0 0 transparent;" + CHU)
sua("--ring-card: 0 0 0 1px rgba(15, 23, 42, 0.05);", "rgba(15, 23, 42, 0.05);", "var(--c-border);")
sua("--shadow-card-hover:", "0 2px 6px rgba(15, 23, 42, 0.06), 0 12px 28px rgba(15, 23, 42, 0.1);", "0 0 0 1px var(--c-input-border);")
sua("--shadow-btn-solid:", "0 1px 2px rgba(8, 47, 73, 0.22), 0 4px 14px rgba(12, 74, 110, 0.24);", "0 0 0 0 transparent;")
sua("--shadow-btn-accent:", "0 1px 2px rgba(150, 39, 26, 0.18), 0 4px 12px rgba(192, 57, 43, 0.22);", "0 0 0 0 transparent;")
sua("--shadow-tab-new:", "0 2px 8px rgba(192, 57, 43, 0.3);", "0 0 0 0 transparent;")
sua("--shadow-search:", "0 1px 3px rgba(15, 23, 42, .08), 0 4px 12px rgba(8, 47, 73, .10);", "0 0 0 1px var(--c-border);")
sua("--shadow-tile:", "inset 0 0 0 1px rgba(12, 74, 110, 0.06), 0 1px 2px rgba(15, 23, 42, 0.06);", "inset 0 0 0 1px var(--c-border);")
sua("--grad-gloss:", "linear-gradient(180deg, rgba(255, 255, 255, 0.55) 0%, rgba(255, 255, 255, 0) 100%);", "none;")
sua("--grad-summary:", "linear-gradient(120deg, var(--c-summary-bg) 0%, var(--c-summary-bg-2) 100%);", "none;" + CHU + " /* dải tóm tắt một màu")
sua("--c-tabbar-glass:", "rgba(255, 255, 255, 0.86);", "var(--c-surface);" + CHU + " /* thanh dưới nền đặc, không mờ kính")
sua("--blur-glass:", "saturate(180%) blur(16px);", "none;")
# Tiền viết màu mực, kể cả trên dải tóm tắt nền đậm (chữ trên dải) (nguyên tắc 2)
sua("--c-summary-due:", "#fcd34d;", "var(--c-on-summary);" + CHU)
# Một họ phông: tiêu đề dùng phông nội dung chủ đang chọn (núm «Phông tiêu đề» vẫn còn) (nguyên tắc 4)
sua("--font-display: \"Be Vietnam Pro\"", "\"Be Vietnam Pro\", system-ui, -apple-system, \"Segoe UI\", \"Segoe UI Symbol\", Roboto, \"Noto Sans\", sans-serif;", "var(--font);" + CHU)
# Thang chữ sáu cỡ 12 · 14 · 16 · 18 · 24 · 32: các bậc cũ cách nhau 1–2 điểm gộp về bậc gần nhất (nguyên tắc 4)
sua("--fs-step-2: 13px;", "13px;", "12px;" + CHU)
sua("--fs-step-6: 17px;", "17px;", "16px;" + CHU)
sua("--fs-step-9: 20px;", "20px;", "18px;" + CHU)
sua("--fs-step-10: 22px;", "22px;", "24px;" + CHU)
sua("--fs-step-12: 26px;", "26px;", "24px;" + CHU)
sua("--fs-step-13: 28px;", "28px;", "32px;" + CHU)
# Nút phụ nền trắng viền mảnh: xanh nhạt chỉ còn một nghĩa «đang chọn» (nguyên tắc 2, 7)
sua("--c-btn-soft-bg:", "var(--c-primary-soft);", "var(--c-surface);" + CHU)
sua("--c-btn-soft-border:", "var(--c-primary-soft);", "var(--c-input-border);")
sua("--c-btn-soft-hover-bg:", "var(--c-primary-soft-hover);", "var(--c-soft-hover);")
# Hai mức mật độ (Đ3): «thoáng» là thang hiện có (dòng 52); «gọn» chỉ cho bảng khuôn Danh sách ở máy tính có chuột
them_sau("--kg-cao-dau-bang: 40px;", [
    "  --kg-cao-dong-gon: 44px;        /* ADR-0234 Đ3: mức «gọn» — dòng bảng khuôn Danh sách ở màn từ 900 có chuột */",
    "  --kg-cao-dau-bang-gon: 36px;    /* ADR-0234 Đ3: mức «gọn» — hàng tiêu đề cột */",
])

# ---------- 2. Thành phần chung thế hệ cũ (.btn, .badge, tiền) ----------
sua(".btn { display: inline-block;", "background: #fff; border: 1px solid var(--c-primary);", "background: var(--c-surface); border: 1px solid var(--c-input-border);")
sua(".btn-accent { color: #fff;", "color: #fff;", "color: var(--c-on-dark);")
sua(".btn-danger { color: var(--c-danger); border-color: var(--c-danger); }", "border-color: var(--c-danger);", "border-color: var(--c-danger-border);")
# Tiền: màu mực, số đều cột; đã đủ thì mờ và không đậm. Đỏ chỉ còn cho quá hạn, lỗi, huỷ (nguyên tắc 2, 4)
sua(".money-ok { color: var(--c-green-text); }", "color: var(--c-green-text);", "color: var(--c-text-muted); font-weight: var(--fw-regular); font-variant-numeric: tabular-nums;")
sua(".money-due { color: var(--c-accent-strong); }", "color: var(--c-accent-strong);", "color: var(--c-tien); font-variant-numeric: tabular-nums;")
# Luật tiền: MỌI số tiền dùng một màu (token --c-tien = màu mực). Sửa tại chỗ giá trị màu của các luật tiền đang có (không thêm luật riêng cho màn nào).
them_sau("--c-text-muted: #475569;", [
    "  --c-tien: var(--c-text);      /* ADR-0234 nguyên tắc 2: màu của MỌI số tiền — không đỏ, san hô, lá; số cần chú ý nổi bằng cỡ và độ đậm */",
])
sua(".price-cell .mark {", "color: var(--c-accent);", "color: var(--c-tien);")
sua(".kv.strong { font-weight: var(--fw-heavy);", "color: var(--c-accent);", "color: var(--c-tien); font-variant-numeric: tabular-nums;")  # dòng tổng (cặp khoá–giá trị nhấn)
sua(".tag-price {", "color: var(--c-accent-strong); background: var(--c-accent-soft);", "color: var(--c-tien); background: var(--c-surface-alt);")
sua("#mobile-total {", "color: var(--c-accent-strong);", "color: var(--c-tien); font-variant-numeric: tabular-nums;")
sua(".sum-chi-tiet .kv.strong > span:last-child {", "color: var(--c-accent-strong);", "color: var(--c-tien);")
sua(".dash-so-thieu { color: var(--c-danger); }", "color: var(--c-danger);", "color: var(--c-tien);")
sua_het(".dash-today-money .money-due { color: var(--c-danger); }", "color: var(--c-danger);", "color: var(--c-tien);", 2)
sua(".tx-tien {", "color: var(--c-accent-strong);", "color: var(--c-tien);")
sua(".cp-tong {", "color: var(--c-accent-strong);", "color: var(--c-tien);")
sua(".bk-tien {", "color: var(--c-accent-strong);", "color: var(--c-tien);")
sua(".bk-tong-so {", "color: var(--c-total-num);", "color: var(--c-on-total);")
# Huy hiệu trạng thái: một dáng, có chấm (không chỉ dựa vào màu), chữ thường (nguyên tắc 1, 2)
sua(".badge { padding: 2px 10px;", "padding: 2px 10px; font-size: var(--fs-old-badge); font-weight: var(--fw-bold);",
    "display: inline-flex; align-items: center; gap: 6px; padding: 2px 10px 2px 8px; font-size: var(--fs-old-badge); font-weight: var(--fw-regular); white-space: nowrap;")
them_sau(".badge { display: inline-flex;", [
    ":is(.badge-draft, .badge-confirmed, .badge-cancelled, .badge-delivered, .badge-completed):not(#dash-today-count)::before { content: \"\"; flex: none; width: 6px; height: 6px; border-radius: 50%; background: currentColor; } /* ADR-0234: chấm trạng thái (huy hiệu ĐẾM ở Trang chủ chỉ mượn màu, không có chấm) */",
])
sua(".badge-completed {", "color: var(--c-text-inverse); background: var(--c-primary);", "color: var(--c-primary-strong); background: var(--c-surface-alt);")

# ---------- 3. Khung chung ----------
# Thanh dưới (điện thoại): chữ thường, mục đang chọn nhấn một bậc
sua("#tabbar .tab { flex: 1 1 0;", "font-weight: var(--fw-semibold);", "font-weight: var(--fw-regular);")
sua("#tabbar .tab[aria-current=\"page\"] { color:", "font-weight: var(--fw-heavy);", "font-weight: var(--fw-semibold);")
# Ảnh đại diện chữ cái: nền xanh nhạt (cát chỉ còn nghĩa «nhắc»)
sua(".bar-avatar { display: flex;", "color: var(--c-sand-text); background: var(--c-sand);", "color: var(--c-avatar-text); background: var(--c-avatar-bg);")
sua(".sidebar-avatar { flex: none;", "color: var(--c-sand-text); background: var(--c-sand);", "color: var(--c-avatar-text); background: var(--c-avatar-bg);")
# Thanh bên: mục chữ thường, mục đang chọn nhấn một bậc
sua(".sidebar-item { display: flex;", "font-weight: var(--fw-semibold);", "font-weight: var(--fw-regular);")
sua(".sidebar-item[aria-current=\"page\"] { color: var(--c-sidebar-text-on); font-weight: var(--fw-bold);", "font-weight: var(--fw-bold);", "font-weight: var(--fw-semibold);")
# Dải nhắc: một dòng, nền trắng, một vạch màu bên trái nói mức độ; nút trong dải là lối chữ (nguyên tắc 5)
sua(".dai { display: flex;", "color: var(--c-text-muted); background: var(--c-surface-alt);", "color: var(--c-text); background: var(--c-surface);")
sua(".dai { display: flex;", "padding: var(--s2) var(--le-trang);", "padding: 0 var(--le-trang);")  # một dòng cao đúng 44 (vùng chạm của nút)
sua(".dai { flex-wrap: nowrap;", " padding-top: var(--s1); padding-bottom: var(--s1);", "")  # dải gốc đã hết đệm dọc: hai khai báo này thừa (bù trần ADR-0222 Đ7a cho hai khai báo của chấm huy hiệu)
sua(".dai[data-tong=\"bien\"] {", "color: var(--c-primary-strong); background: var(--c-primary-soft);", "box-shadow: inset var(--bw-indicator) 0 0 var(--c-primary);")
sua(".dai[data-tong=\"cat\"] {", "color: var(--c-sand-text); background: var(--c-mat-mang-bg);", "box-shadow: inset var(--bw-indicator) 0 0 var(--c-sand);")
sua(".dai[data-tong=\"do\"] {", "color: var(--c-danger); background: var(--c-danger-soft);", "box-shadow: inset var(--bw-indicator) 0 0 var(--c-danger);")
them_sau(".dai[data-tong=\"do\"] {", [
    ".dai[data-tong=\"cat\"] > svg { color: var(--c-sand-text); } .dai[data-tong=\"do\"] > svg { color: var(--c-danger); } .dai[data-tong=\"bien\"] > svg { color: var(--c-primary); } /* ADR-0234 */",
])
sua(".dai-cau { display: -webkit-box;", "display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; line-clamp: 2; overflow: hidden;", "display: block; overflow: hidden;")
sua(".dai-cau { flex: 1;", "overflow-wrap: anywhere; font-weight: var(--fw-semibold);", "overflow: hidden; white-space: nowrap; text-overflow: ellipsis; font-weight: var(--fw-regular);")
sua(".dai .nut { flex: none;", "min-height: var(--h-control); }", "min-height: var(--h-control); color: var(--c-primary); background: transparent; border-color: transparent; text-decoration: underline; text-underline-offset: var(--s1); }")

# ---------- 4. Thành phần chung v2 và khung gốc ----------
sua(".nut[data-cap=\"phu\"] {", "border-color: var(--c-btn-soft-bg);", "border-color: var(--c-btn-soft-border);")
sua(".huy-hieu { display: inline-flex;", "font-weight: var(--fw-semibold);", "font-weight: var(--fw-regular);")
# Nhãn ô nhập: chữ thường màu mực — trong biểu mẫu, thứ nổi là giá trị người gõ và nút chính (nguyên tắc 1)
sua(".nhan { display: block;", "font-weight: var(--fw-semibold);", "font-weight: var(--fw-regular);")
sua("body[data-khung-goc] .truong > :is(label, .nhan)", "font-weight: var(--fw-semibold);", "font-weight: var(--fw-regular);")
# Bảng: tiêu đề cột chữ thường mờ, nền trắng (vạch mảnh của dòng đầu tách đầu bảng)
sua("body[data-khung-goc] .bang th {", "font-weight: var(--fw-semibold); line-height: var(--lh-24); white-space: nowrap; color: var(--c-text-muted); background: var(--c-surface-alt);",
    "font-weight: var(--fw-regular); line-height: var(--lh-24); white-space: nowrap; color: var(--c-text-muted); background: var(--c-surface);")
sua("body[data-khung-goc] .bang-dau { display: grid;", "font-weight: var(--fw-semibold); line-height: var(--lh-20); color: var(--c-text-muted); background: var(--c-surface-alt);",
    "font-weight: var(--fw-regular); line-height: var(--lh-20); color: var(--c-text-muted); background: var(--c-surface);")
# Cặp nhãn–số được nhấn (số còn phải thu): số màu mực là thứ nổi duy nhất của khối; nhãn chữ thường
sua("body[data-khung-goc] .cap[data-nhan-manh] {", "color: var(--c-accent);", "color: var(--c-tien); font-variant-numeric: tabular-nums;")
sua("body[data-khung-goc] .cap[data-nhan-manh] > :first-child", "font-weight: var(--fw-semibold);", "font-weight: var(--fw-regular);")
# Mức «gọn» (Đ3): bảng của khuôn Danh sách ở cửa sổ từ 900 có chuột — chỉ giảm chiều dọc và một bậc chữ bảng; nút, ô nhập, vùng chạm giữ nguyên
trung = [i for i, d in enumerate(dong) if d.startswith("/* -- Tầng 5: thành phần")]
if len(trung) != 1:
    sys.exit("không thấy dấu mốc «Tầng 5» của khung gốc")
dong[trung[0]:trung[0]] = [
    "/* Mức «gọn» (ADR-0234 Đ3): bảng khuôn Danh sách ở cửa sổ từ 900 có chuột. Chỉ giảm chiều dọc và một bậc chữ bảng; nút, ô nhập, vùng chạm giữ nguyên. Máy chọn, không có núm. */",
    "@media (min-width: 900px) and (pointer: fine) {",
    "  body[data-khung-goc=\"danh-sach\"] { --kg-cao-dong: var(--kg-cao-dong-gon); --kg-cao-dau-bang: var(--kg-cao-dau-bang-gon); }",
    "  body[data-khung-goc=\"danh-sach\"] :is(.bang, .bang-luoi), body[data-khung-goc=\"danh-sach\"] .bang-luoi [data-o][data-so] { font-size: var(--fs-step-3); }",
    "  body[data-khung-goc=\"danh-sach\"] .bang-luoi .bang-hang { padding-block: var(--s1); }",
    "}",
    "",
]

open(ra, "w", encoding="utf-8").write("\n".join(dong))
print(f"Đã ghi {ra}")
