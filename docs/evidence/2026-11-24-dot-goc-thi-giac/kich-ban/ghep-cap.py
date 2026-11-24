# Ghép ảnh «hiện tại» và «đề xuất» của cùng một màn, cùng bề rộng, thành MỘT ảnh hai cột (trái: hiện tại, phải: đề xuất) để chủ dự án so.
# Chạy: python3 docs/evidence/2026-11-24-dot-goc-thi-giac/kich-ban/ghep-cap.py <thư mục ảnh hiện tại> <thư mục ảnh đề xuất> <thư mục ra> [hậu tố: dau|ca] [cao tối đa]
# Ảnh vào và ra đều NGOÀI kho. Ảnh điện thoại (2x) thu về nửa cỡ; ảnh máy tính giữ cỡ thật.
import glob, os, sys
from PIL import Image, ImageDraw, ImageFont

hien, de, ra = sys.argv[1], sys.argv[2], sys.argv[3]
hau = sys.argv[4] if len(sys.argv) > 4 else "dau"
cao_max = int(sys.argv[5]) if len(sys.argv) > 5 else 0
os.makedirs(ra, exist_ok=True)
try:
    phong = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 22)
except Exception:
    phong = ImageFont.load_default()
for a in sorted(glob.glob(os.path.join(hien, f"*-{hau}.jpg"))):
    ten = os.path.basename(a)
    b = os.path.join(de, ten)
    if not os.path.exists(b):
        continue
    A, B = Image.open(a).convert("RGB"), Image.open(b).convert("RGB")
    if "-390-" in ten:
        A = A.resize((A.width // 2, A.height // 2), Image.LANCZOS)
        B = B.resize((B.width // 2, B.height // 2), Image.LANCZOS)
    if cao_max:
        A, B = A.crop((0, 0, A.width, min(A.height, cao_max))), B.crop((0, 0, B.width, min(B.height, cao_max)))
    khe, dau = 24, 40
    W, H = A.width + B.width + khe, max(A.height, B.height) + dau
    to = Image.new("RGB", (W, H), (255, 255, 255))
    v = ImageDraw.Draw(to)
    v.text((0, 8), "Hiện tại", fill=(71, 85, 105), font=phong)
    v.text((A.width + khe, 8), "Đề xuất", fill=(12, 74, 110), font=phong)
    to.paste(A, (0, dau))
    to.paste(B, (A.width + khe, dau))
    to.save(os.path.join(ra, ten.replace(f"-{hau}.jpg", f"-{hau}-cap.jpg")), quality=85)
print("xong", ra)
