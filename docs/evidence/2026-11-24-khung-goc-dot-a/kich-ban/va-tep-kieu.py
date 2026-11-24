#!/usr/bin/env python3
# Khung gốc đợt A (Tạo / Sửa đơn, Đơn chờ xác nhận), 24/11/2026: sinh tệp kiểu ĐỀ XUẤT từ public/app.css bằng một danh sách sửa có tên
# (cùng cách với docs/evidence/2026-11-24-dot-goc-thi-giac/kich-ban/va-tep-kieu.py). Kịch bản chụp (chup.mjs --thay-css) thay /app.css của trang bằng tệp sinh ra,
# nên ảnh đề xuất là đúng thứ tệp kiểu sẽ vẽ sau khi chủ duyệt; lúc thi công chạy lại với ra là public/app.css, rồi gỡ luật cũ không còn dùng (không đổi hình).
# Ba phần:
#   A. tham số mới của KHUNG (trong cặp dấu mốc «Khung gốc giao diện», viết chung, không id của màn): cột phụ đứng sau ở biểu mẫu một cột; khối chỉ hiện từ 560;
#      phần không phải nút (tóm tắt tiền, câu lỗi khi lưu) trong thanh nút của trang / thanh dính đáy đứng riêng một hàng; nhóm chọn một (ô tròn) và ô chọn dáng chung.
#   B. ruột Tạo / Sửa đơn theo ADR-0234 nguyên tắc 1 (một dòng một thứ đậm): chỉ đổi ĐỘ ĐẬM về --fw-regular, khoanh trong #order-form (không đổi màn khác).
#   C. sửa tại chỗ vài luật cũ của Tạo đơn (lề của thanh bước, dòng ngày khởi hành, tóm tắt điện thoại) — chỉ bớt, không thêm luật bố cục ngoài khung.
#
# Chạy từ GỐC kho:  python3 docs/evidence/2026-11-24-khung-goc-dot-a/kich-ban/va-tep-kieu.py <ra.css> [--vao public/app.css]
# Mỗi lần sửa phải trúng ĐÚNG MỘT dòng và đúng một chỗ trong dòng, sai là dừng.
import sys

vao = sys.argv[sys.argv.index("--vao") + 1] if "--vao" in sys.argv else "public/app.css"
ra = sys.argv[1]
dong = open(vao, encoding="utf-8").read().split("\n")


def tim(dau):
    trung = [i for i, d in enumerate(dong) if d.lstrip().startswith(dau)]
    if len(trung) != 1:
        sys.exit(f"«{dau}»: {len(trung)} dòng trùng (cần 1)")
    return trung[0]


def sua(dau, cu, moi):
    i = tim(dau)
    if dong[i].count(cu) != 1:
        sys.exit(f"«{dau}»: «{cu}» xuất hiện {dong[i].count(cu)} lần (cần 1)")
    dong[i] = dong[i].replace(cu, moi)


def them_sau(dau, cac_dong):
    i = tim(dau)
    dong[i + 1:i + 1] = cac_dong


def them_truoc(dau, cac_dong):
    i = tim(dau)
    dong[i:i] = cac_dong


# ---------- A. Khung ----------
# A1. Biểu mẫu có cột phụ: cột phụ (tóm tắt, người phụ trách) đứng SAU cột chính khi một cột (khuôn Chi tiết đưa cột phụ lên trước).
them_truoc("/* Thanh nút: trong khối thì các nút chia đều khi khối hẹp.", [
    "/* Biểu mẫu có cột phụ (data-phu=\"sau\"): khi một cột, cột phụ (tóm tắt, người phụ trách) đứng SAU cột chính — khuôn Chi tiết đưa cột phụ lên trước. */",
    "body[data-khung-goc] .hai-cot[data-phu=\"sau\"] > .cot-phu { order: 0; }",
])
# A2. Khối chỉ hiện khi vùng nội dung từ 560 (data-chi="rong" — trước đây chỉ có cho nút): tóm tắt tiền của biểu mẫu, ở điện thoại đã nằm trong thanh dính đáy.
sua("body[data-khung-goc] .nut[data-chi=\"rong\"] { display: none; }", "body[data-khung-goc] .nut[data-chi=\"rong\"] { display: none; }",
    "body[data-khung-goc] .nut[data-chi=\"rong\"], body[data-khung-goc] .khoi[data-chi=\"rong\"] { display: none; }")
sua("body[data-khung-goc] .nut[data-chi=\"rong\"] { display: inline-flex; }", "body[data-khung-goc] .nut[data-chi=\"rong\"] { display: inline-flex; }",
    "body[data-khung-goc] .nut[data-chi=\"rong\"] { display: inline-flex; }\n  body[data-khung-goc] .khoi[data-chi=\"rong\"] { display: grid; }")
# A3. Thanh nút của trang và thanh dính đáy: phần không phải nút (tóm tắt tiền, câu cảnh báo, câu lỗi khi lưu) đứng riêng một hàng, trên các nút.
sua("body[data-khung-goc] :is(main, main > .vung-ve) > .thanh-day { position: sticky;", "display: flex; gap: var(--s3);", "display: flex; flex-wrap: wrap; gap: var(--s3);")
them_truoc("@container trang (min-width: 560px) { body[data-khung-goc] :is(main, main > .vung-ve) > .thanh-day { display: none; } }", [
    "/* Phần không phải nút trong thanh nút của trang và thanh dính đáy (tóm tắt tiền, câu cảnh báo, câu lỗi khi lưu): riêng một hàng, trên các nút. */",
    "body[data-khung-goc] :is(main, main > .vung-ve) > :is(.thanh-day, .thanh-nut[data-kieu=\"trang\"]) > :not(.nut) { flex: 1 1 100%; margin: 0; }",
])
# A4. Thành phần: nhóm chọn một (ô tròn) và ô tích dáng chung; ô chọn (select) bỏ dáng của máy, mũi tên vẽ như ô chọn có nhãn nổi.
them_truoc("/* ---------- Hết khung gốc giao diện (ADR-0222) ---------- */", [
    "/* Nhóm chọn một (fieldset.nhom-chon): tên nhóm như nhãn ô nhập, mỗi lựa chọn một hàng cao bằng ô nhập; ô tròn và ô tích một cỡ, màu chính (ADR-0234 nguyên tắc 7) */",
    "body[data-khung-goc] .nhom-chon { display: flex; flex-direction: column; min-width: 0; margin: 0; padding: 0; border: 0; }",
    "body[data-khung-goc] .nhom-chon > legend { margin: 0 0 var(--s1); padding: 0; font-size: var(--fs-label); font-weight: var(--fw-regular); line-height: var(--lh-20); color: var(--c-text); }",
    "body[data-khung-goc] .nhom-chon > label { display: flex; align-items: center; gap: var(--s3); min-height: var(--kg-cao-o); margin: 0; font-weight: var(--fw-regular); }",
    "body[data-khung-goc] .nhom-chon > p { margin: 0; font-size: var(--fs-label); line-height: var(--lh-20); color: var(--c-text-muted); }",
    "body[data-khung-goc] .khoi input:is([type=\"radio\"], [type=\"checkbox\"]) { flex: none; width: var(--s5); height: var(--s5); margin: 0; accent-color: var(--c-primary); }",
    "body[data-khung-goc] .khoi select:not([multiple]):not(.o-noi-khung > select) { -webkit-appearance: none; appearance: none; padding-right: var(--s6); background-color: var(--c-surface); background-image: linear-gradient(45deg, transparent 50%, var(--c-text-muted) 50%), linear-gradient(135deg, var(--c-text-muted) 50%, transparent 50%); background-size: var(--w-o-chon-mui) var(--w-o-chon-mui); background-position: calc(100% - var(--s4) - var(--w-o-chon-mui)) 50%, calc(100% - var(--s4)) 50%; background-repeat: no-repeat; }",
])

# ---------- B. Ruột Tạo / Sửa đơn: độ đậm (ADR-0234 nguyên tắc 1) ----------
them_sau("/* ---------- Hết khung gốc giao diện (ADR-0222) ---------- */", [
    "",
    "/* ---------- Tạo / Sửa đơn — ruột trang theo ngôn ngữ thị giác (ADR-0234 nguyên tắc 1: một dòng một thứ đậm; khối một con số nổi). Chỉ đổi ĐỘ ĐẬM, khoanh trong",
    "   #order-form nên thành phần dùng chung ở màn khác không đổi. Còn đậm: tên khối, tên dịch vụ, tên hành khách, bước đang xem, lựa chọn đang chọn, số khách đã có tên, tổng tiền, chữ nút. */",
    "#order-form :is(.o-noi-chu, .guest-label, .dqdt-nhan, .dd-nhan, .svc-sub, .trip-title, .owner-text, .owner-role, .hk-dem-chu, .catalog-ma, .catalog-gia-so, .catalog-dau, .svc-chip-gon, .chip, .counter-btn, .svc-mo-phai, .buoc-cham, .mobile-sum-mo),",
    "#order-form :is(.buoc-nut:not([aria-current=\"step\"]), .loc-nut:not([aria-pressed=\"true\"]), .mobile-sum-line > span:first-child, .kv.strong > :first-child) { font-weight: var(--fw-regular); }",
])

# ---------- C. Sửa tại chỗ luật cũ của Tạo đơn ----------
# Thanh bước nay là con đầu của cột chính: khoảng cách tới khối đầu do cột lo (nhịp của khung), bỏ lề dưới riêng.
sua(".buoc-thanh { position: sticky; top: 0;", "margin: 0 0 var(--s3); ", "margin: 0; ")
sua(".buoc-thanh { top: calc(var(--bar-h) + env(safe-area-inset-top));", "margin: 0 calc(-1 * var(--s4)) var(--s3);", "margin: 0 calc(-1 * var(--s4));")
# Ngày khởi hành nay là ô đầu của khối Khách hàng (dưới tên khối): bỏ nét kẻ và lề tách khối.
sua(".khach-ngay { padding-bottom: var(--s3);", "padding-bottom: var(--s3); margin-bottom: var(--s3); border-bottom: 1px solid var(--c-border);", "display: block;")
# Tóm tắt tiền điện thoại: nằm trong thanh dính đáy của khung (thanh tự ẩn khi vùng nội dung từ 560) nên luôn hiện trong thanh.
sua(".mobile-actions-summary { display: none; }", "display: none;", "display: block;")

# Đơn chờ xác nhận: dòng đầu của mỗi đơn (mã đơn + huy hiệu) đứng sát trái trong danh sách dòng của khung (trước đây huy hiệu bị đẩy sang phải thẻ).
sua(".cx-the-dau { display: flex;", "justify-content: space-between; ", "")

open(ra, "w", encoding="utf-8").write("\n".join(dong))
print(f"ghi {ra}")
