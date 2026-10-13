#!/usr/bin/env python3
"""So sánh trước / sau của bộ ảnh Tạo đơn bốn bước: chiều cao trang, thân gửi lên máy chủ (bỏ id ngẫu nhiên), vi phạm axe.
Chạy từ gốc repo: python3 docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/so-sanh.py"""
import json
import re

D = "docs/evidence/2026-10-14-tao-don-bon-buoc"
a = json.load(open(f"{D}/sau/so-do-sau.json"))
b = json.load(open(f"{D}/truoc/so-do-truoc.json"))
print("== chiều cao trang (px): trước, sau, thay đổi %")
for k in a:
    print(f"{k:34} {b[k]:6} {a[k]:6} {100 * (a[k] - b[k]) / b[k]:+6.1f}")
x = json.load(open(f"{D}/sau/than-gui-sau.json"))
y = json.load(open(f"{D}/truoc/than-gui-truoc.json"))
chuan = lambda s: re.sub(r"[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}", "<id>", s)
print("== thân gửi lên (POST lập đơn, PUT lưu thay đổi) giống nhau từng byte sau khi bỏ id ngẫu nhiên:")
print({k: chuan(x[k]) == chuan(y[k]) for k in x})
ax = json.load(open(f"{D}/sau/axe-sau.json"))
ay = json.load(open(f"{D}/truoc/axe-truoc.json"))
ids = lambda d: sorted({v["id"] for k in d for v in d[k]})
print("== axe (mã vi phạm): trước", ids(ay), "· sau", ids(ax))
