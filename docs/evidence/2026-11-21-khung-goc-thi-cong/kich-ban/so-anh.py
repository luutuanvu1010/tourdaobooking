# So ảnh trang THẬT (sau khi chuyển sang khung gốc) với ảnh xem trước chủ dự án đã duyệt 21/11/2026.
# In tỉ lệ điểm ảnh khác nhau và vùng khác; ghi ảnh ghép [đã duyệt | thật | chỗ khác tô đỏ] ra NGOÀI kho (ADR-0215 Đ3).
# Chạy: python3 docs/evidence/2026-11-21-khung-goc-thi-cong/kich-ban/so-anh.py <thư mục đã duyệt> <thư mục thật> <thư mục ra> [tên-ảnh.png …]
import os
import sys
from PIL import Image, ImageChops

def so(da_duyet, that, ra):
    a = Image.open(da_duyet).convert("RGB")
    b = Image.open(that).convert("RGB")
    rong = min(a.width, b.width)
    cao = max(a.height, b.height)
    A = Image.new("RGB", (rong, cao), "white"); A.paste(a.crop((0, 0, rong, a.height)), (0, 0))
    B = Image.new("RGB", (rong, cao), "white"); B.paste(b.crop((0, 0, rong, b.height)), (0, 0))
    lech = ImageChops.difference(A, B).convert("L").point(lambda v: 255 if v > 24 else 0)
    khac = lech.histogram()[255] / (rong * cao)
    hop = lech.getbbox()
    do = Image.new("RGB", (rong, cao), (255, 0, 0))
    to = Image.composite(do, B, lech)
    ghep = Image.new("RGB", (rong * 3 + 32, cao), (90, 90, 90))
    ghep.paste(A, (0, 0)); ghep.paste(B, (rong + 16, 0)); ghep.paste(to, (rong * 2 + 32, 0))
    toi_da = 2400
    if ghep.width > toi_da:
        ghep = ghep.resize((toi_da, round(ghep.height * toi_da / ghep.width)))
    os.makedirs(os.path.dirname(ra), exist_ok=True)
    ghep.save(ra)
    return khac, hop, (a.width, a.height), (b.width, b.height)

if __name__ == "__main__":
    goc, that, ra = sys.argv[1:4]
    ten = sys.argv[4:] or sorted(f for f in os.listdir(that) if f.endswith(".png"))
    for t in ten:
        if not os.path.exists(os.path.join(goc, t)):
            print(f"- {t}: không có ảnh đã duyệt để so"); continue
        khac, hop, ka, kb = so(os.path.join(goc, t), os.path.join(that, t), os.path.join(ra, t))
        print(f"{'=' if khac < 0.002 else '~' if khac < 0.02 else '✗'} {t}: khác {khac * 100:.2f} % · vùng khác {hop} · đã duyệt {ka[0]}x{ka[1]} · thật {kb[0]}x{kb[1]}")
