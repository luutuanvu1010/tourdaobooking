# Ghép ảnh «màn đầu» của nhiều màn thành các TỜ ẢNH để nhìn xuyên các màn (ngôn ngữ thị giác chỉ thấy được khi đặt các màn cạnh nhau).
# Chạy: python3 docs/evidence/2026-11-24-danh-gia-thi-giac/kich-ban/lap-to-anh.py <thư mục ảnh> <thư mục ra> <bề rộng: 390|1280|1440> [số cột] [bề rộng ô] [hậu tố: dau|ca]
# Ảnh vào và tờ ảnh ra đều nằm NGOÀI kho.
import glob, os, re, sys
from PIL import Image, ImageDraw, ImageFont

vao, ra, rong = sys.argv[1], sys.argv[2], sys.argv[3]
cot = int(sys.argv[4]) if len(sys.argv) > 4 else (6 if rong == "390" else 3)
o_rong = int(sys.argv[5]) if len(sys.argv) > 5 else (260 if rong == "390" else 520)
hau_to = sys.argv[6] if len(sys.argv) > 6 else "dau"
os.makedirs(ra, exist_ok=True)
tep = sorted(glob.glob(os.path.join(vao, f"*-{rong}-{hau_to}.jpg")))
try:
    phong = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial Unicode.ttf", 13)
except Exception:
    phong = ImageFont.load_default()
hang = 2 if rong == "390" else 4
moi_to = cot * hang
for i in range(0, len(tep), moi_to):
    lo = tep[i:i + moi_to]
    anh = []
    for t in lo:
        im = Image.open(t).convert("RGB")
        ti = o_rong / im.width
        cao = min(int(im.height * ti), 1200)
        im = im.resize((o_rong, int(im.height * ti)), Image.LANCZOS).crop((0, 0, o_rong, cao))
        anh.append((t, im))
    cao_o = max(im.height for _, im in anh) + 22
    so_hang = (len(anh) + cot - 1) // cot
    to = Image.new("RGB", (cot * (o_rong + 8) + 8, so_hang * (cao_o + 8) + 8), (120, 120, 120))
    ve = ImageDraw.Draw(to)
    for j, (t, im) in enumerate(anh):
        x, y = 8 + (j % cot) * (o_rong + 8), 8 + (j // cot) * (cao_o + 8)
        ve.rectangle([x, y, x + o_rong, y + 20], fill=(20, 20, 20))
        ten = re.sub(rf"-{rong}-{hau_to}\.jpg$", "", os.path.basename(t))
        ve.text((x + 4, y + 3), ten[:int(o_rong / 7.2)], fill=(255, 255, 255), font=phong)
        to.paste(im, (x, y + 22))
    dich = os.path.join(ra, f"to-{rong}-{hau_to}-{i // moi_to + 1:02d}.jpg")
    to.save(dich, quality=80)
    print(dich, len(lo))
