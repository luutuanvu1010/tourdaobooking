# Bốn phép đo của ADR-0234 Đ5b (đề xuất) + hai phép phụ, từ số đo do chup.mjs ghi (đoạn đo do-thi-giac.js của lượt 24/11): so hai bộ ảnh theo từng màn, từng bề rộng.
# Chạy: python3 docs/evidence/2026-11-24-dot-goc-thi-giac/kich-ban/bon-phep-do.py <thư mục số đo bộ A> <thư mục số đo bộ B> [--md]
# Cột: đậm = tỉ lệ phần tử chữ ở độ đậm từ 600 (theo số phần tử; trong ngoặc theo ký tự); đặc = số nút nền đặc trong vùng nội dung; màu tiền = các màu chữ của số tiền;
# bóng = số phần tử có bóng mờ (mọi lớp); dải = chiều cao dải nhắc; khung = tỉ lệ khung chung trên khung nhìn; tràn = tràn ngang.
import glob, json, os, sys

A, B = sys.argv[1], sys.argv[2]
def doc(t):
    d = json.load(open(t))["do"]
    tn = sum(v["n"] for v in d["doDam"].values()); tk = sum(v["ky"] for v in d["doDam"].values())
    dn = sum(v["n"] for k, v in d["doDam"].items() if int(k) >= 600); dk = sum(v["ky"] for k, v in d["doDam"].items() if int(k) >= 600)
    mau = sorted({k.split(" ")[1] for k in d.get("tien", {})})
    # bóng có độ mờ (không tính viền vẽ bằng bóng 0 0 0 Npx, vạch chỉ báo inset, vòng tiêu điểm): trên cả màn, gồm cả lớp nổi
    import re
    def mo(k): return any(not p.strip().endswith("inset") and float((re.findall(r"(-?[\d.]+)px", p) + ["0"] * 3)[2]) > 0 for p in re.split(r",(?![^(]*\))", k))
    bong = sum(v["n"] for k, v in d.get("bong", {}).items() if mo(k))
    kc = d.get("khungChung", {})
    khung = (kc.get("thanhTren", 0) + kc.get("dai", 0) + kc.get("thanhDuoi", 0) + kc.get("dinhDay", 0)) / max(kc.get("khungNhin", 1), 1)
    return {"dam": f"{dn / tn:.0%} ({dk / tk:.0%})" if tn else "—", "dac": len(d.get("nutChinh", [])), "tien": " ".join(mau) or "—", "bong": bong,
            "dai": kc.get("dai", 0), "khung": f"{khung:.0%}", "tran": "có" if d.get("tranNgang") else "không"}
print("| Màn | Rộng | Đậm A → B | Nút đặc A → B | Màu tiền A → B | Bóng mờ A → B | Dải A → B | Khung chung A → B | Tràn B |")
print("|---|---|---|---|---|---|---|---|---|")
for a in sorted(glob.glob(os.path.join(A, "*.json")), key=lambda t: (os.path.basename(t).split("-")[0], int(os.path.basename(t).rsplit("-", 1)[1][:-5]))):
    b = os.path.join(B, os.path.basename(a))
    if not os.path.exists(b): continue
    x, y = doc(a), doc(b)
    ten = os.path.basename(a)[:-5].rsplit("-", 1)
    print(f"| {ten[0]} | {ten[1]} | {x['dam']} → {y['dam']} | {x['dac']} → {y['dac']} | {x['tien']} → {y['tien']} | {x['bong']} → {y['bong']} | {x['dai']} → {y['dai']} | {x['khung']} → {y['khung']} | {y['tran']} |")
