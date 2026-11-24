# Ghép tờ so sánh «hiện tại / đề xuất» của ĐỢT A (Tạo / Sửa đơn, Đơn chờ xác nhận), từ ảnh do chup.mjs cùng thư mục chụp (ảnh nằm NGOÀI kho). Chép khung từ
# docs/evidence/2026-11-21-khung-goc-xem-truoc/kich-ban/ghep.py; mỗi tờ để ba bề rộng cạnh nhau, ảnh đủ chiều dài.
# Mỗi tờ là một tệp HTML (ghi cạnh ảnh, ngoài kho); chụp thành PNG bằng kich-ban/chup-html.mjs.
#   python3 docs/evidence/2026-11-21-khung-goc-dot-a/kich-ban/ghep.py [thư mục ra, mặc định ~/tourdao-khung-goc-dot-a]
import os, sys, html
from PIL import Image
RA = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/tourdao-khung-goc-dot-a")
ANH = os.path.join(RA, "anh"); GHEP = os.path.join(RA, "ghep"); os.makedirs(GHEP, exist_ok=True)
KIEU = """
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 36px 40px; width: 2440px; background: #fff; color: #17212f; font: 15px/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; }
  h1 { margin: 0 0 4px; font-size: 28px; }
  .dan { margin: 0 0 14px; font-size: 16px; color: #5b6878; }
  ul.diem { margin: 0 0 18px; padding: 12px 18px 12px 34px; background: #f3f6fa; border-radius: 10px; font-size: 15.5px; display: grid; gap: 4px; }
  ul.diem b { color: #0c4a6e; }
  h2 { margin: 22px 0 10px; font-size: 18px; display: flex; align-items: baseline; gap: 10px; }
  h2 small { font-size: 14px; font-weight: 400; color: #5b6878; }
  .hang { display: flex; gap: 20px; align-items: flex-start; }
  .cap { display: flex; gap: 14px; }
  figure { margin: 0; }
  figcaption { margin: 0 0 6px; font-size: 13.5px; font-weight: 700; letter-spacing: .02em; }
  figcaption.truoc { color: #8a94a3; } figcaption.sau { color: #0c4a6e; }
  .khung { border: 1.5px solid #c4cedb; border-radius: 8px; overflow: hidden; background: #f2f5f9; }
  .sau + * .khung, figure.sau .khung { border-color: #0c4a6e; }
  .khung img { display: block; width: 100%; height: auto; }
  .chan { margin-top: 22px; padding-top: 10px; border-top: 1px solid #c4cedb; font-size: 13px; color: #5b6878; }
  .o-rong { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; }
  .o-rong figcaption { font-weight: 600; color: #17212f; }
  .o-rong figcaption span { font-weight: 400; color: #5b6878; }
  .nhan-pa { margin: 18px 0 8px; font-size: 16px; font-weight: 700; }
  .nhan-pa span { font-weight: 400; color: #5b6878; }
"""
def hinh(lop, nhan, tep, rong, cao):
    return f'<figure class="{lop}"><figcaption class="{lop}">{html.escape(nhan)}</figcaption><div class="khung" style="width:{rong}px;height:{cao}px"><img src="file://{html.escape(tep)}" alt=""></div></figure>'
def cao_thu(tep, rong):
    w, h = Image.open(tep).size
    return round(h * rong / w)
def cap(khoa, kho, rong, tran):
    t, s = os.path.join(ANH, "truoc", f"{khoa}-{kho}.png"), os.path.join(ANH, "sau", f"{khoa}-{kho}.png")
    cao = min(tran, max(cao_thu(t, rong), cao_thu(s, rong)))
    return f'<div class="cap">{hinh("truoc", "HIỆN TẠI", t, rong, cao)}{hinh("sau", "ĐỀ XUẤT", s, rong, cao)}</div>'
MAN = [
  ("tao-don", "1", "Tạo đơn (Bán hàng, đơn mới)", [
    "<b>Một kiểu khối</b> cho mọi phần (Khách hàng, Dịch vụ, Hành khách, Thanh toán, Tóm tắt, Người phụ trách, Hướng dẫn viên): cùng đệm, bo góc, bóng; thẻ người phụ trách bỏ viền đậm riêng.",
    "<b>Tên khối luôn ở đầu khối.</b> «Ngày khởi hành» thành ô đầu tiên của khối Khách hàng (trước đây đứng trên tên khối); «Điền thông tin của tôi» ở đầu khối bên phải.",
    "<b>Nút «Lưu…» và «Quay lại» xuống thanh nút cuối biểu mẫu</b>, «Lưu» bên phải, dính đáy màn hình khi cuộn (giống Sửa xe đã duyệt). Cột phải còn Tóm tắt và người phụ trách, cũng dính khi cuộn.",
    "<b>Hai cột theo chỗ trống thật</b> (vùng nội dung từ 800 chia 7 và 5, từ 1.040 chia 8 và 4, như Chi tiết đơn); hẹp hơn thì một cột, Tóm tắt nằm trong thanh dính đáy như điện thoại hiện nay.",
    "<b>Ô nhập giữ kiểu nhãn nổi trong ô</b> (câu hỏi 1). Phần ruột thẻ dịch vụ, danh mục, hành khách giữ nguyên lần này."]),
  ("sua-don", "2", "Sửa đơn (đơn nháp có ba dịch vụ)", [
    "Cùng khuôn với Tạo đơn. Ở cửa sổ 1.130, hai ô «Tên khách» và «Số điện thoại» xếp dọc vì cột chính hẹp hơn 560 (luật lưới chung); máy tính 1.440 vẫn cạnh nhau.",
    "<b>Điện thoại gần như giữ nguyên:</b> tổng tiền và «Lưu thay đổi» dính đáy; khối Người phụ trách ở cuối trang như hiện nay."]),
  ("sua-don-mo", "3", "Sửa đơn: mở thẻ dịch vụ, thêm hai hành khách, mở chi tiết tiền", [
    "Trạng thái ngoài lần tải đầu, chụp để sau thi công so được: phần ruột thẻ dịch vụ và hành khách không đổi, chỉ khung quanh nó đổi.",
    "<b>Điện thoại:</b> bấm «Chi tiết» ở thanh đáy thì bảng tiền mở ngay trên nút «Lưu» như hiện nay."]),
  ("tao-don-doi-tac", "4", "Tạo đơn (tài khoản Đối tác)", [
    "Cùng khuôn. Nút chính «Gửi đơn» xuống thanh nút cuối biểu mẫu như Bán hàng.",
    "Khối Thanh toán của Đối tác vẫn không có tên khối (như hiện nay)."]),
  ("cho-xac-nhan", "5", "Đơn chờ xác nhận", [
    "<b>Một khối «Danh sách chờ»</b>, mỗi đơn một dòng ngăn bằng nét kẻ (thay vì mỗi đơn một thẻ riêng); chữ bên trái, nút «Kiểm vé» bên phải (câu hỏi 3).",
    "<b>Nút «Kiểm vé»</b> đổi từ màu san hô sang màu nút chính của khung (xanh đậm): màu san hô dành cho «Tạo đơn» ở thanh trên.",
    "<b>Câu dẫn đầu trang</b> dài tối đa 720 cho dễ đọc."]),
]
for khoa, so, ten, diem in MAN:
    than = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>{KIEU}</style></head><body>
<h1>{so}. {ten}: hiện tại và đề xuất theo khung gốc</h1>
<p class="dan">Ảnh chụp thật trên máy thử, dữ liệu giả. Ảnh «đề xuất» làm bằng cách tiêm lớp kiểu của khung, chưa sửa mã. Chữ trên nút, nhãn giữ nguyên.</p>
<ul class="diem">{"".join(f"<li>{d}</li>" for d in diem)}</ul>
<div class="hang">
  <div><h2>Máy tính 1.440</h2>{cap(khoa, 1440, 520, 9000)}</div>
  <div><h2>Cửa sổ 1.130</h2>{cap(khoa, 1130, 420, 9000)}</div>
  <div><h2>Điện thoại 390</h2>{cap(khoa, 390, 210, 9000)}</div>
</div>
<p class="chan">Khung gốc giao diện, đợt A, xem trước 21/11/2026 · {ten} · ảnh gốc ở ~/tourdao-khung-goc-dot-a/anh/</p>
</body></html>"""
    open(os.path.join(GHEP, f"{so}-{khoa}.html"), "w", encoding="utf8").write(than)
print("ghi", sorted(os.listdir(GHEP)))
