# Ghép tờ so sánh «hiện tại / đề xuất» của bốn màn mẫu và tờ so sánh bề rộng trang, từ ảnh do chup.mjs chụp (ảnh nằm NGOÀI kho).
# Mỗi tờ là một tệp HTML (ghi cạnh ảnh, ngoài kho); chụp thành PNG bằng kich-ban/chup-html.mjs.
#   python3 docs/evidence/2026-11-21-khung-goc-xem-truoc/kich-ban/ghep.py [thư mục ra, mặc định ~/tourdao-khung-goc-2026-11-21]
import os, sys, html
from PIL import Image
RA = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/tourdao-khung-goc-2026-11-21")
ANH = os.path.join(RA, "anh"); GHEP = os.path.join(RA, "ghep"); os.makedirs(GHEP, exist_ok=True)
KIEU = """
  * { box-sizing: border-box; }
  body { margin: 0; padding: 32px 36px 40px; width: 1680px; background: #fff; color: #17212f; font: 15px/1.45 -apple-system, "Helvetica Neue", Arial, sans-serif; }
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
  ("don-hang", "1", "Đơn hàng", "khuôn Danh sách", [
    "<b>Cửa sổ 1.130 hết vỡ cột:</b> bảng tự gọn lại theo chỗ trống thật, số điện thoại nằm dưới tên khách.",
    "<b>Ô tìm</b> không còn kéo dài hết trang (tối đa 480); nút «Lọc» cao bằng ô tìm.",
    "<b>Đầu bảng</b> theo một kiểu chung của mọi bảng; «Tải thêm» nằm ở chân bảng.",
    "<b>Điện thoại</b> gần như giữ nguyên: vẫn là thẻ dòng, chỉ đổi đệm và khoảng cách về thang chung."]),
  ("chi-tiet-don", "2", "Chi tiết đơn", "khuôn Chi tiết", [
    "<b>Một nút chính</b> (nền đậm) ở đầu trang bên trái; các nút sửa cùng một kiểu; «Huỷ đơn» tách sang phải.",
    "<b>Nút sửa của từng khối</b> lên đầu khối, bên phải (khi khối đủ rộng), nên các nút sửa thẳng một hàng dọc.",
    "<b>Cửa sổ 1.130</b> đã có cột tiền bên phải (chia 7 và 5); máy tính 1.440 chia 8 và 4.",
    "<b>Dịch vụ</b> và <b>Phần đối tác</b> là một khối, mỗi dịch vụ một mục ngăn bằng nét kẻ: hết thẻ lồng trong thẻ.",
    "<b>Điện thoại:</b> dải tóm tắt lên đầu, khối tiền ngay sau, «Xem ảnh gửi khách» dính đáy màn hình (thanh tab nhường chỗ như ở trang biểu mẫu), «Huỷ đơn» xuống cuối trang."]),
  ("sua-xe", "3", "Sửa xe", "khuôn Biểu mẫu", [
    "<b>Ô nhập</b> cao 48 một kiểu, nhãn đứng trên ô; hai ô ngắn đứng cạnh nhau theo lưới 12 cột.",
    "<b>Thanh nút cuối biểu mẫu:</b> «Lưu» bên phải, «Huỷ» cạnh trái nó, «Ngừng dùng xe» tách sang trái. Mọi biểu mẫu sẽ kết thúc bằng cùng thanh này.",
    "<b>Bỏ lối «‹ Xe»</b> trong thân trang vì thanh trên đã có đường dẫn về.",
    "<b>Điện thoại:</b> «Ngừng dùng xe» thành một khối riêng cuối biểu mẫu, «Lưu» dính đáy."]),
  ("dia-diem", "4", "Địa điểm", "khuôn Thiết lập", [
    "<b>Danh sách lên đầu trang.</b> Biểu mẫu thêm và sửa không nằm sẵn trên trang nữa, mở trong bảng trượt khi bấm nút ở đầu khối.",
    "<b>Bảng gọn hơn:</b> mã nằm dưới tên, số canh phải, không còn ô chữ xuống dòng lộn xộn ở cửa sổ 1.130.",
    "<b>Khu vực đón</b> là danh sách dòng trong khối, hết thẻ lồng trong thẻ.",
    "<b>Điện thoại:</b> thấy danh sách ngay, không phải cuộn qua hai biểu mẫu thêm.",
    "Chữ trên nút giữ nguyên chữ đang có trên trang («Thêm địa điểm», «Thêm khu vực đón», «Sửa», «Sửa khu vực đón»)."]),
]
for khoa, so, ten, khuon, diem in MAN:
    than = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>{KIEU}</style></head><body>
<h1>{so}. {ten}: hiện tại và đề xuất theo khung gốc</h1>
<p class="dan">Màn mẫu của {khuon}. Ảnh chụp thật trên máy thử, dữ liệu giả. Ảnh «đề xuất» làm bằng cách tiêm lớp kiểu của khung, chưa sửa mã.</p>
<ul class="diem">{"".join(f"<li>{d}</li>" for d in diem)}</ul>
<h2>Máy tính, cửa sổ rộng 1.440</h2>
{cap(khoa, 1440, 796, 640)}
<div class="hang">
  <div><h2>Cửa sổ rộng 1.130 <small>(cỡ cửa sổ trong ảnh bạn gửi ngày 20/11)</small></h2>{cap(khoa, 1130, 532, 760)}</div>
  <div><h2>Điện thoại 390</h2>{cap(khoa, 390, 248, 760)}</div>
</div>
<p class="chan">Khung gốc giao diện, bản đề xuất 21/11/2026 · {ten} · ảnh đủ chiều dài của từng màn nằm ở ~/tourdao-khung-goc-2026-11-21/anh/</p>
</body></html>"""
    open(os.path.join(GHEP, f"{so}-{khoa}.html"), "w", encoding="utf8").write(than)

# Tờ so sánh bề rộng trang: (a) ba mức đã duyệt 15/11, (b) hai mức. Ảnh do chup.mjs chụp với --nhan rong --kho 1440x900,1920x1080 [--rong hai-muc].
def o_rong(khoa, kho, pa, nhan, rong=796):
    tep = os.path.join(ANH, "rong", f"{khoa}-{kho}{'-hai-muc' if pa == 'b' else ''}.png")
    cao = round(rong * (900 / 1440 if kho == 1440 else 1080 / 1920))
    return f'<figure><figcaption class="rong">{nhan}</figcaption><div class="khung" style="width:{rong}px;height:{cao}px"><img src="file://{tep}" alt=""></div></figure>'
than = f"""<!doctype html><html lang="vi"><head><meta charset="utf-8"><style>{KIEU}
  figcaption.rong {{ font-size: 15px; font-weight: 700; color: #17212f; }} figcaption.rong span {{ font-weight: 400; color: #5b6878; }}
</style></head><body>
<h1>6. Bề rộng trang: giữ ba mức đã duyệt, hay gom còn hai mức</h1>
<p class="dan">Chỉ để bạn so. Mặc định giữ phương án (a) bạn đã duyệt ngày 15/11. Ảnh là bốn màn mẫu đã theo khung gốc, chụp phần đầu trang.</p>
<ul class="diem">
<li><b>(a) Ba mức, như đã duyệt:</b> trang danh sách kín vùng nội dung; trang chi tiết và thiết lập rộng tối đa 1.120; trang biểu mẫu và trang đọc 720.</li>
<li><b>(b) Hai mức:</b> trang làm việc (danh sách, chi tiết, thiết lập) đều kín vùng nội dung; trang biểu mẫu và trang đọc 720.</li>
<li>Khác nhau chỉ ở trang chi tiết và trang thiết lập, và chỉ rõ ở màn lớn 1.920. Ở máy tính 1.440 hai phương án lệch nhau 24, gần như không thấy.</li>
</ul>
<h2>Màn lớn 1.920 · hai màn giống nhau ở cả hai phương án</h2>
<div class="cap">{o_rong("don-hang", 1920, "a", "Đơn hàng <span>(danh sách) · kín vùng nội dung, rộng 1.624</span>")}{o_rong("sua-xe", 1920, "a", "Sửa xe <span>(biểu mẫu) · rộng 720</span>")}</div>
<h2>Màn lớn 1.920 · trang chi tiết</h2>
<div class="cap">{o_rong("chi-tiet-don", 1920, "a", "(a) Ba mức <span>· Chi tiết đơn rộng 1.120, bên phải để trống</span>")}{o_rong("chi-tiet-don", 1920, "b", "(b) Hai mức <span>· Chi tiết đơn kín vùng nội dung, rộng 1.624</span>")}</div>
<h2>Màn lớn 1.920 · trang thiết lập</h2>
<div class="cap">{o_rong("dia-diem", 1920, "a", "(a) Ba mức <span>· Địa điểm rộng 1.120, bên phải để trống</span>")}{o_rong("dia-diem", 1920, "b", "(b) Hai mức <span>· Địa điểm kín vùng nội dung, rộng 1.624</span>")}</div>
<h2>Máy tính 1.440 · trang chi tiết <small>(hai phương án gần như nhau)</small></h2>
<div class="cap">{o_rong("chi-tiet-don", 1440, "a", "(a) Ba mức <span>· rộng 1.120</span>")}{o_rong("chi-tiet-don", 1440, "b", "(b) Hai mức <span>· rộng 1.144</span>")}</div>
<p class="chan">Khung gốc giao diện, bản đề xuất 21/11/2026 · so sánh bề rộng trang</p>
</body></html>"""
open(os.path.join(GHEP, "6-so-sanh-be-rong.html"), "w", encoding="utf8").write(than)
print("ghi", sorted(os.listdir(GHEP)))
