# Ghép ảnh đôi «Trước | Sau (minh hoạ)» cho báo cáo đánh giá khung giao diện 30/10/2026.
# Dùng: python3 ghep-truoc-sau.py <thư mục ra>
import os, sys
from PIL import Image, ImageDraw, ImageFont

RA = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ux/ghep"
os.makedirs(RA, exist_ok=True)
FONT = "/workspace/tourdaobooking/.claude/worktrees/danh-gia-khung-giao-dien/public/fonts/be-vietnam-pro-600.woff2"
try:
    f_tieu_de = ImageFont.truetype(FONT, 30); f_nhan = ImageFont.truetype(FONT, 24)
except Exception:
    f_tieu_de = f_nhan = ImageFont.load_default()

# (tên tệp ra, tiêu đề, ảnh trước, ảnh sau, chiều cao cắt)
CAP = [
    ("01-chi-tiet-don-1040", "Chi tiết đơn — laptop 1040 px: dải tóm tắt và hàng nút", "/tmp/ux/truoc/SALES/order-1040.png", "/tmp/ux/sau/SALES/order-1040.png", 1050),
    ("02-danh-sach-don-1440", "Đơn hàng — máy tính 1440 px: thẻ «chữ trái, nhãn phải» → bảng thẳng cột", "/tmp/ux/truoc/SALES/orders-1440.png", "/tmp/ux/sau/SALES/orders-1440.png", 900),
    ("03-danh-sach-don-390", "Đơn hàng — iPhone 390 px: tên khách, số khách, số tiền bị cắt", "/tmp/ux/truoc/SALES/orders-390.png", "/tmp/ux/sau/SALES/orders-390.png", 780),
    ("04-cho-xac-nhan-1440", "Đơn chờ xác nhận — 1440 px: nút đỏ dài 1.100 px lặp mỗi thẻ", "/tmp/ux/truoc/SALES/cho-xac-nhan-1440.png", "/tmp/ux/sau/SALES/cho-xac-nhan-1440.png", 980),
    ("05-trang-toi-1440", "Trang «Tôi» — 1440 px: lưới hai cột để lại hố trống", "/tmp/ux/truoc/SALES/account-1440.png", "/tmp/ux/sau/SALES/account-1440.png", 1700),
    ("06-trang-chu-1440", "Trang chủ — 1440 px: thẻ doanh thu kéo hết bề ngang, biểu đồ tí hon", "/tmp/ux/truoc/SALES/trang-chu-1440.png", "/tmp/ux/sau/SALES/trang-chu-1440.png", 800),
]

for ten, tieu_de, a, b, cao in CAP:
    A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGB")
    cao = min(cao, A.height, B.height)
    A = A.crop((0, 0, A.width, cao)); B = B.crop((0, 0, B.width, cao))
    gap, dau, nhan = 24, 64, 44
    W = A.width + B.width + gap * 3
    H = dau + nhan + cao + gap
    im = Image.new("RGB", (W, H), (255, 255, 255))
    d = ImageDraw.Draw(im)
    d.text((gap, 16), tieu_de, fill=(15, 23, 42), font=f_tieu_de)
    d.rectangle((gap, dau, gap + A.width, dau + nhan - 6), fill=(253, 233, 238))
    d.text((gap + 12, dau + 6), "TRƯỚC — hiện trạng (bản 2.48)", fill=(142, 14, 43), font=f_nhan)
    x2 = gap * 2 + A.width
    d.rectangle((x2, dau, x2 + B.width, dau + nhan - 6), fill=(220, 252, 231))
    d.text((x2 + 12, dau + 6), "SAU — minh hoạ bằng lớp CSS chèn tạm (chưa phải mã thật)", fill=(22, 101, 52), font=f_nhan)
    im.paste(A, (gap, dau + nhan)); im.paste(B, (x2, dau + nhan))
    d.rectangle((gap - 1, dau + nhan - 1, gap + A.width, dau + nhan + cao), outline=(225, 231, 239))
    d.rectangle((x2 - 1, dau + nhan - 1, x2 + B.width, dau + nhan + cao), outline=(225, 231, 239))
    # thu nhỏ ảnh rộng cho nhẹ
    if im.width > 2400:
        r = 2400 / im.width; im = im.resize((2400, int(im.height * r)), Image.LANCZOS)
    im.save(os.path.join(RA, ten + ".jpg"), quality=82)
    print("✓", ten, im.size)
