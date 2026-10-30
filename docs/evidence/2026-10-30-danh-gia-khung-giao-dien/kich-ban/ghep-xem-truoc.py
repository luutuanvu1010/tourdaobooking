# Ghép ảnh đôi «Trước | Sau» cho bản xem trước gửi chủ (luật khung 30/10/2026).
# Trước = /tmp/ux/truoc2 (mã 2.48, tệp giao diện công ty giống production); Sau = /tmp/ux/sau3 (nhánh claude/danh-gia-khung-giao-dien, cùng tệp giao diện).
# Dùng: python3 ghep-xem-truoc.py <thư mục ra>
import os, sys
from PIL import Image, ImageDraw, ImageFont

RA = sys.argv[1] if len(sys.argv) > 1 else "/tmp/ux/xem-truoc"
os.makedirs(RA, exist_ok=True)
FONT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "../../../../public/fonts/be-vietnam-pro-600.woff2")
f_td = ImageFont.truetype(FONT, 30); f_nh = ImageFont.truetype(FONT, 24); f_ghi = ImageFont.truetype(FONT, 22)
T, S = "/tmp/ux/truoc2", "/tmp/ux/sau3"

# (tên ra, tiêu đề, vai, trang, khổ, chiều cao cắt, ghi chú đổi gì)
CAP = [
    ("01-chi-tiet-don-laptop", "Chi tiết đơn — laptop", "SALES", "order", 1040, 1150, "Dải tóm tắt 4 cột đều (hết chữ xuống dòng từng từ) · một hàng nút, «Huỷ đơn» tách phải · nhãn – giá trị đứng sát nhau · tên người dùng ở chân thanh bên hiện đủ"),
    ("02-don-hang-may-tinh", "Đơn hàng — màn 1440", "SALES", "orders", 1440, 900, "Thẻ «chữ trái – nhãn phải» thành bảng thẳng cột có hàng tiêu đề · bỏ ô tìm và nút «+ Tạo đơn» trùng thanh trên · tiêu đề không lặp"),
    ("03-don-hang-dien-thoai", "Đơn hàng — iPhone", "SALES", "orders", 390, 844, "Ngày + trạng thái / tên khách đầy đủ / điện thoại · số khách · còn thu — không còn «Ng…», «2I» (thẻ cao hơn: bỏ quyết định «đúng 2 dòng» của Đợt E)"),
    ("04-chi-tiet-don-dien-thoai", "Chi tiết đơn — iPhone", "SALES", "order", 390, 844, "Mã đơn trên thanh trên hiện đủ · các nút cùng hàng cao bằng nhau"),
    ("05-cho-xac-nhan", "Đơn chờ xác nhận — màn 1440", "SALES", "cho-xac-nhan", 1440, 900, "Nút «Kiểm vé» cỡ vừa cạnh thông tin, không còn thanh đỏ dài 1.100 px ở mỗi thẻ"),
    ("06-trang-toi", "Trang «Tôi» — màn 1440", "SALES", "account", 1440, 1500, "Thẻ xếp kín hai cột, hết hố trống · bỏ dòng «Đăng xuất» trùng (đã có ở chân thanh bên)"),
    ("07-trang-chu", "Trang chủ — màn 1440", "SALES", "trang-chu", 1440, 820, "Biểu đồ doanh thu giãn theo ô · tiêu đề khối màu chữ chính"),
    ("08-so-cong-no", "Sổ công nợ — màn 1440 (Kế toán)", "ACCOUNTING", "so-cong-no", 1440, 900, "Tự mở bên đầu danh sách (hết nửa màn trống) · dải nhắc bảo mật màu cát, hết lặp «Bật ngay» · tiêu đề không lặp ba lần"),
    ("09-quan-ly-tai-khoan", "Quản lý tài khoản — màn 1440 (Quản trị)", "ADMIN", "staff", 1440, 900, "Thanh bên tự cuộn tới mục đang mở · thao tác hàng không gạch chân, việc nguy hiểm chữ xám (đỏ khi rê chuột)"),
    ("10-danh-muc", "Danh mục dịch vụ — màn 1440 (Quản trị)", "ADMIN", "catalog", 1440, 900, "Điều khiển của hàng nhóm đứng ngay cạnh tên nhóm · liên kết không gạch chân"),
    ("11-danh-ba", "Danh bạ — màn 1440", "SALES", "parties", 1440, 900, "Bộ lọc thẳng bốn cột, nút canh phải · tiêu đề không lặp"),
    ("12-hoa-hong", "Hoa hồng đối tác — màn 1440", "SALES", "hoa-hong", 1440, 900, "Dải cảnh báo có khoảng cách với khối dưới · tiêu đề không lặp"),
    ("13-xe", "Xe — màn 1440 (Quản trị)", "ADMIN", "xe", 1440, 900, "Tiêu đề không lặp (tên trang ở thanh trên)"),
    ("14-don-hang-laptop", "Đơn hàng — laptop (dưới 1100 px vẫn là thẻ)", "SALES", "orders", 1040, 900, "Thẻ ba hàng không cắt chữ · bỏ ô tìm và nút trùng"),
    ("15-hdv-dien-thoai", "Đơn hàng của hướng dẫn viên — iPhone", "FIELD", "orders", 390, 844, "Tên khách, số khách hiện đủ"),
]

def ve(ten, tieu_de, vai, trang, kho, cao, ghi):
    a, b = f"{T}/{vai}/{trang}-{kho}.png", f"{S}/{vai}/{trang}-{kho}.png"
    if not (os.path.exists(a) and os.path.exists(b)):
        print("✗ thiếu", ten); return None
    A = Image.open(a).convert("RGB"); B = Image.open(b).convert("RGB")
    cao = min(cao, A.height, B.height)
    A = A.crop((0, 0, A.width, cao)); B = B.crop((0, 0, B.width, cao))
    g, dau, nhan = 24, 60, 44
    W = A.width + B.width + g * 3
    do = ImageDraw.Draw(Image.new("RGB", (1, 1)))
    dong_ghi, dong = [], ""
    for tu in ghi.split(" "):  # xuống dòng chú thích theo bề rộng, tính trước để chừa đủ chiều cao
        thu = (dong + " " + tu).strip()
        if do.textlength(thu, font=f_ghi) > W - 2 * g: dong_ghi.append(dong); dong = tu
        else: dong = thu
    dong_ghi.append(dong)
    H = dau + nhan + cao + 20 + 30 * len(dong_ghi) + 16
    im = Image.new("RGB", (W, H), (255, 255, 255)); d = ImageDraw.Draw(im)
    d.text((g, 14), tieu_de, fill=(15, 23, 42), font=f_td)
    d.rectangle((g, dau, g + A.width, dau + nhan - 6), fill=(253, 233, 238)); d.text((g + 12, dau + 6), "TRƯỚC — bản đang chạy", fill=(142, 14, 43), font=f_nh)
    x2 = g * 2 + A.width
    d.rectangle((x2, dau, x2 + B.width, dau + nhan - 6), fill=(220, 252, 231)); d.text((x2 + 12, dau + 6), "SAU — bản mới" if B.width < 600 else "SAU — bản mới (chưa lên production)", fill=(22, 101, 52), font=f_nh)
    im.paste(A, (g, dau + nhan)); im.paste(B, (x2, dau + nhan))
    for x, w in ((g, A.width), (x2, B.width)): d.rectangle((x - 1, dau + nhan - 1, x + w, dau + nhan + cao), outline=(225, 231, 239))
    y = dau + nhan + cao + 14
    for dg in dong_ghi: d.text((g, y), dg, fill=(71, 85, 105), font=f_ghi); y += 30
    if im.width > 2200: r = 2200 / im.width; im = im.resize((2200, int(im.height * r)), Image.LANCZOS)
    p = os.path.join(RA, ten + ".jpg"); im.save(p, quality=80); print("✓", ten, im.size); return p

for c in CAP: ve(*c)
