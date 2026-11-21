# Ghép ảnh minh hoạ cho hồ sơ phân tích khung gốc 21/11/2026 từ số đo (do-bo-cuc.mjs) và ảnh chụp, tất cả nằm NGOÀI kho.
#   1. Bản đồ bề rộng: mỗi màn một dòng, vẽ đúng tỉ lệ ngang vùng nội dung (xanh nhạt) và các khối, thẻ tầng ngoài cùng (xanh đậm, chồng lên nhau thì đậm hơn).
#   2. Tờ so sánh theo loại màn: ảnh thật thu nhỏ, kẻ hai mép vùng nội dung (xanh) và khung từng khối cấp 1 (đỏ).
# Chạy: python3 docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/ve-anh.py [thư mục ra, mặc định ~/tourdao-bo-cuc-2026-11-21]
import json, os, sys
from PIL import Image, ImageDraw, ImageFont

RA = os.path.expanduser(sys.argv[1] if len(sys.argv) > 1 else "~/tourdao-bo-cuc-2026-11-21")
D = json.load(open(os.path.join(RA, "so-do", "bo-cuc-truoc.json"), encoding="utf8"))["ketQua"]
TH = json.load(open(os.path.join(RA, "so-do", "tong-hop-truoc.json"), encoding="utf8"))
GUI = os.path.join(RA, "gui-chu"); os.makedirs(GUI, exist_ok=True)
F = "/System/Library/Fonts/Supplemental/Arial.ttf"; FB = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
def font(co, dam=False): return ImageFont.truetype(FB if dam else F, co)
TEN_BO = {"SALES": "Bán hàng", "INTERN": "Thực tập sinh", "ACCOUNTING": "Kế toán", "ADMIN": "Quản trị", "FIELD": "Hướng dẫn viên", "PARTNER": "Đối tác", "SUPER_ADMIN": "Toàn quyền", "DRIVER": "Tài xế công ty", "DRIVER_PARTNER": "Tài xế đối tác", "HR": "Nhân sự", "SALES_MANAGER": "Quản lý bán hàng", "KHACH": "Chưa đăng nhập"}
LOAI = {}
for dong in TH["loaiManChiTiet"]: LOAI[dong["so"]] = dong
THU_TU = ["Tổng quan", "Danh sách", "Chi tiết", "Biểu mẫu", "Thiết lập", "Trang đọc", "Công cụ", "Trạng thái"]
def cua(kho): return sorted([x for x in D if x["kho"] == kho and x.get("do") and not x["do"].get("loi")], key=lambda x: (THU_TU.index(LOAI[x["so"]]["loai"]), x["so"]))
def ten(x): return f'{LOAI[x["so"]]["tieuDe"]} · {TEN_BO[x["bo"]]}'

# ---------- 1. Bản đồ bề rộng ----------
def ban_do(kho, tep, tieu_de):
    ds = cua(kho); vw = int(kho.split("x")[0]); tl = 1000 / vw; GUT = 430; CAO = 15; KE = 3; DAU = 96
    cao = DAU + sum(CAO + KE for _ in ds) + 26 * len(THU_TU) + 40
    im = Image.new("RGB", (GUT + 1000 + 30, cao), "white"); d = ImageDraw.Draw(im, "RGBA")
    d.text((20, 16), tieu_de, font=font(22, True), fill=(20, 30, 50))
    d.text((20, 48), "Mỗi dòng là một màn, vẽ đúng tỉ lệ ngang. Xám đậm: thanh bên. Xanh nhạt: vùng nội dung của trang. Xanh đậm: các khối và thẻ bên trong.", font=font(14), fill=(70, 80, 95))
    d.text((20, 68), "Nếu bố cục đều, các dải xanh đậm phải kín vùng xanh nhạt và thẳng hàng từ trên xuống dưới.", font=font(14), fill=(70, 80, 95))
    y = DAU; loai_truoc = None
    for x in ds:
        o = x["do"]; loai = LOAI[x["so"]]["loai"]
        if loai != loai_truoc:
            d.text((20, y + 4), loai.upper(), font=font(14, True), fill=(180, 60, 20)); y += 26; loai_truoc = loai
        d.text((20, y), ten(x)[:54], font=font(12), fill=(40, 50, 65))
        X = lambda v: GUT + v * tl
        d.rectangle([X(0), y, X(vw), y + CAO], fill=(238, 241, 245))
        if o["thanhBen"]: d.rectangle([X(0), y, X(o["thanhBen"]), y + CAO], fill=(196, 204, 214))
        cl = o["main"]["trai"] + o["main"]["dem"][3]; nd = o["main"]["noiDung"]
        d.rectangle([X(cl), y, X(cl + nd), y + CAO], fill=(205, 222, 255))
        hop = [(k["trai"], k["rong"]) for k in o["khoi"] if k["coVo"] and k["cao"] >= 40] + [(t["trai"], t["rong"]) for t in o["the"] if t["sau"] == 0]
        for trai, rong in hop: d.rectangle([X(cl + trai), y + 2, X(cl + trai + rong), y + CAO - 2], fill=(20, 60, 150, 70))
        y += CAO + KE
    im.save(os.path.join(GUI, tep)); print("ghi", tep, im.size)

# ---------- 2. Tờ so sánh theo loại màn ----------
def to_so_sanh(kho, ds_so, tep, tieu_de, cot=4, rong_o=420, cao_cat=1500):
    vw = int(kho.split("x")[0]); tl = rong_o / vw; cao_o = int(cao_cat * tl); NHAN = 44; LE = 18
    ds = [x for x in cua(kho) if x["so"] in ds_so]; ds.sort(key=lambda x: ds_so.index(x["so"]))
    hang = (len(ds) + cot - 1) // cot
    im = Image.new("RGB", (LE + cot * (rong_o + LE), 84 + hang * (cao_o + NHAN + LE)), "white"); d = ImageDraw.Draw(im, "RGBA")
    d.text((LE, 14), tieu_de, font=font(24, True), fill=(20, 30, 50))
    d.text((LE, 48), "Ảnh thật trên máy thử (dữ liệu giả). Hai vạch xanh: mép vùng nội dung của trang. Khung đỏ: từng khối lớn trong trang.", font=font(15), fill=(70, 80, 95))
    for i, x in enumerate(ds):
        o = x["do"]; gx = LE + (i % cot) * (rong_o + LE); gy = 84 + (i // cot) * (cao_o + NHAN + LE)
        d.text((gx, gy), ten(x)[:46], font=font(15, True), fill=(20, 30, 50))
        d.text((gx, gy + 20), f'vùng nội dung {o["main"]["noiDung"]} · {len(o["khoi"])} khối · mức khai: {o["rong"] or "không khai"}', font=font(12), fill=(90, 100, 115))
        tep_anh = os.path.join(RA, "anh", "truoc", f'man-{x["so"]:03d}-{vw}.jpg')
        if os.path.exists(tep_anh):
            a = Image.open(tep_anh).convert("RGB"); a = a.crop((0, 0, a.width, min(a.height, cao_cat))); a = a.resize((rong_o, int(a.height * tl)), Image.LANCZOS); im.paste(a, (gx, gy + NHAN))
        cl = o["main"]["trai"] + o["main"]["dem"][3]; nd = o["main"]["noiDung"]
        for vx in (cl, cl + nd): d.line([gx + vx * tl, gy + NHAN, gx + vx * tl, gy + NHAN + cao_o], fill=(0, 90, 255, 230), width=2)
        for k in o["khoi"]:
            if k["y"] > cao_cat: continue
            d.rectangle([gx + (cl + k["trai"]) * tl, gy + NHAN + k["y"] * tl, gx + (cl + k["trai"] + k["rong"]) * tl, gy + NHAN + min(cao_cat, k["y"] + k["cao"]) * tl], outline=(225, 20, 50, 235), width=2)
        d.rectangle([gx - 1, gy + NHAN - 1, gx + rong_o, gy + NHAN + cao_o], outline=(190, 198, 208, 255), width=1)
    im.save(os.path.join(GUI, tep), quality=86); print("ghi", tep, im.size)

if __name__ == "__main__":
    ban_do("1440x900", "1-ban-do-be-rong-may-tinh-1440.png", "Bản đồ bề rộng 87 màn ở máy tính (cửa sổ 1.440)")
    ban_do("1130x820", "1b-ban-do-be-rong-cua-so-1130.png", "Bản đồ bề rộng 87 màn ở cửa sổ 1.130 (cỡ cửa sổ trong ảnh chủ gửi)")
    # Màn đại diện cho từng loại (mỗi trang một lần, ưu tiên trang nhiều người dùng). Số là số màn trong bảng 87 màn của đợt 20/11.
    CHON = [("Danh sách", "2-cung-loai-danh-sach.jpg", [16, 24, 54, 36, 43, 68, 72, 23]),
            ("Thiết lập", "3-cung-loai-thiet-lap.jpg", [58, 59, 61, 62, 47, 53, 64, 74]),
            ("Chi tiết", "4-cung-loai-chi-tiet.jpg", [18, 32, 37, 79]),
            ("Biểu mẫu", "5-cung-loai-bieu-mau.jpg", [12, 33, 38, 45, 69, 29, 44, 51])]
    for loai, tep, ds_so in CHON:
        to_so_sanh("1130x820", ds_so, tep, f"Các màn cùng loại «{loai}» đặt cạnh nhau (cửa sổ 1.130)")
