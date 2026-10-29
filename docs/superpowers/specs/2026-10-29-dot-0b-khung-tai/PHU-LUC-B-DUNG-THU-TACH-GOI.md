# Phụ lục B — Dựng thử tách gói chung (29/10/2026, ngoài kho)

> Hồ sơ có ngày. Main session dựng thử trên `main` 25f127d1 bằng đúng 48 điểm vào của `build:web`, thêm `--splitting --chunk-names=chung-[hash] --metafile`, đầu ra ở thư mục tạm, **không ghi vào kho**. Số ở đây là **số nền để đặt ngân sách** (đặc tả mục 2, Q-5); kế hoạch thi công đo lại trên mã thật rồi ghi số cuối.

- Tổng JS thô: **1,468,005 byte** (459,519 nén) so với ≈ 5,4 MB của 48 gói phẳng hôm nay · gói con: **52** · phần riêng: 48.
- Gói con lớn nhất `chung-GIXXKU32.js`: 156,973 byte thô / 47,505 nén, chứa `web/shell.ts` + cụm khung, được **48/48** trang nhập trực tiếp.
- Vòng 1 (Q-6) ước: `/`, `/login`, `/ngoai-mang`, `/404` + bao đóng JS = **13 tệp JS, 244,054 byte thô / 80,258 nén** (chưa tính 4 HTML, 2 css, 3 phông ≈ 84 KB, manifest, 2 icon).
- `src/shared/changelog.ts` chỉ nằm trong phần riêng `help.js` (không ở gói con nào).
- Số gói con mỗi trang nhập trực tiếp: ít nhất 1, nhiều nhất 33; `orders.js` nhập 13. Gói con có thể nhập gói con khác (đồ thị sâu), nên tệp kê phải ghi **bao đóng**.

## Gói con lớn nhất

| Gói con | Thô | Nén | Trang nhập trực tiếp | Gồm (vài tệp đầu) |
|---|---:|---:|---:|---|
| `chung-GIXXKU32.js` | 156,973 | 47,505 | 48 | permissions.ts, maintenance.ts, safe-next.ts, vn-date.ts |
| `chung-JWKN3RXX.js` | 54,551 | 18,458 | 2 | dong-gap-the.ts, hanh-khach.ts, hanh-khach-form.ts, order-view.ts |
| `chung-GPAJZSGI.js` | 22,930 | 8,638 | 3 | qr-thong-tin.ts, qrcode.js, qr-ve.ts |
| `chung-W2YPMR6M.js` | 12,290 | 4,209 | 3 | trip-form.ts, so-nguoi-chang.ts, nguoi-di-kem.ts, service-form.ts |
| `chung-2UYPVJCV.js` | 10,784 | 3,572 | 4 | xe-dang-chay-man.ts |
| `chung-EIAB4WSV.js` | 8,990 | 3,566 | 5 | dieu-phoi-hien-thi.ts, gio-xay-ra.ts, tien-do-man.ts |
| `chung-4DSDB7YC.js` | 8,928 | 3,345 | 22 | giay-to-ui.ts |
| `chung-WN5Y3A4L.js` | 8,886 | 3,361 | 2 | passkey-error.ts, encoding.ts, passkey.ts, hai-lop-ui.ts |
| `chung-P2JIWB4I.js` | 7,427 | 2,514 | 4 | chang-mac-dinh.ts, chang-form.ts |
| `chung-IGZNNOWL.js` | 6,828 | 2,897 | 2 | cho-vang.ts, tien-do-ui.ts, xac-nhan-xuat-ben.ts |
| `chung-5BPJQPRO.js` | 5,996 | 2,324 | 4 | dat-gap-hien-thi.ts, order-errors.ts |
| `chung-EWQX4LQV.js` | 5,875 | 2,475 | 2 | so-dai-ly-ui.ts |

## Phần riêng từng trang (byte thô) và bao đóng

| Trang | Phần riêng | Số gói con trong bao đóng | Tổng tải (riêng + bao đóng) |
|---|---:|---:|---:|
| `account.js` | 55,828 | 20 | 278,951 |
| `audit.js` | 2,235 | 2 | 161,159 |
| `ban.js` | 4,381 | 6 | 179,765 |
| `bang-gia-xe.js` | 13,280 | 6 | 191,331 |
| `bang-ke-xe.js` | 5,421 | 6 | 183,472 |
| `catalog.js` | 28,077 | 8 | 210,835 |
| `chinh-sach-dieu-phoi.js` | 16,926 | 5 | 186,668 |
| `cho-xac-nhan.js` | 1,572 | 2 | 159,939 |
| `chup-bu.js` | 2,528 | 2 | 163,118 |
| `chuyen-sua.js` | 9,877 | 4 | 182,410 |
| `chuyen.js` | 56,619 | 19 | 273,241 |
| `cuoc-chuyen.js` | 34,172 | 12 | 239,226 |
| `cuoc.js` | 2,188 | 6 | 184,351 |
| `de-nghi.js` | 5,390 | 8 | 198,733 |
| `dieu-chinh-cong-no.js` | 6,920 | 2 | 164,615 |
| `dieu-kien-xuat-ben.js` | 6,405 | 3 | 174,179 |
| `dieu-phoi.js` | 33,197 | 13 | 218,796 |
| `feedback.js` | 47,638 | 2 | 206,484 |
| `giao-dien.js` | 13,195 | 4 | 173,461 |
| `giay-to-sap-het-han.js` | 3,654 | 4 | 172,274 |
| `gui-thong-bao.js` | 6,156 | 1 | 163,129 |
| `help.js` | 300,296 | 1 | 457,269 |
| `hoa-hong.js` | 38,347 | 6 | 210,860 |
| `home.js` | 33,145 | 5 | 196,320 |
| `khoa-thang.js` | 4,673 | 2 | 162,492 |
| `khong-co-trang.js` | 136 | 2 | 159,060 |
| `lich-xe-ban.js` | 6,708 | 7 | 183,838 |
| `loai-giay-to-nguoi.js` | 193 | 2 | 162,358 |
| `loai-giay-to-xe.js` | 292 | 4 | 173,258 |
| `locations.js` | 4,960 | 5 | 172,270 |
| `login.js` | 13,264 | 4 | 202,361 |
| `ly-do-dieu-phoi.js` | 5,485 | 3 | 173,259 |
| `ngoai-mang.js` | 259 | 2 | 159,183 |
| `nguoi-ban.js` | 4,728 | 4 | 174,605 |
| `order-form.js` | 50,642 | 19 | 306,860 |
| `order.js` | 121,148 | 33 | 414,900 |
| `orders.js` | 13,945 | 13 | 188,963 |
| `parties.js` | 46,230 | 8 | 223,328 |
| `sessions.js` | 12,394 | 1 | 169,367 |
| `so-cong-no.js` | 6,517 | 2 | 164,336 |
| `staff.js` | 30,770 | 3 | 188,397 |
| `tai-xe.js` | 1,473 | 3 | 169,247 |
| `thiet-lap.js` | 535 | 2 | 159,459 |
| `tro-ly-cai-dat.js` | 20,493 | 2 | 179,339 |
| `xe-chi-tiet.js` | 5,524 | 4 | 175,249 |
| `xe-dang-chay.js` | 1,722 | 8 | 195,065 |
| `xe-sua.js` | 7,095 | 3 | 174,869 |
| `xe.js` | 2,867 | 4 | 171,487 |

Ghi chú: «tổng tải» là mọi byte JS thô trình duyệt cần cho trang ở lần mở đầu khi chưa có gói nào trong cache; gói con dùng chung chỉ tải một lần cho mọi trang, nên tổng tải của trang thứ hai trở đi nhỏ hơn nhiều.
