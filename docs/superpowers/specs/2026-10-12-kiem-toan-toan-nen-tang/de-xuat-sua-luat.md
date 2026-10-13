# Đề xuất sửa tệp luật, gom theo từng tệp (2026-10-12)

> AI không tự sửa các tệp luật (N9). Mỗi dòng dưới đây là MỘT việc cho bạn duyệt; số dòng và bằng chứng nằm ở phụ lục đã trỏ. Tệp luật là: `CLAUDE.md` các cấp, `docs/ARCHITECTURE.md`, `docs/adr/**`, `docs/kernel-18.md`, `docs/quyen-hoan.json`, `docs/SYSTEM-DESIGN.md` §16. Đề xuất cũ của đợt 1 vẫn ở `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md`.

## Sai sự thật, nên duyệt trước
| Tệp | Việc | Chi tiết |
|---|---|---|
| `CLAUDE.md` §10 (Chế độ bảo trì) | Câu "chặn mọi SĐT ngoài `allowed_phones`" sai. Mã chặn mọi tài khoản không giữ Toàn quyền, đúng ADR-0071 điều 3. Ba nhóm trợ lý và người kiểm B cùng nêu. | nhóm 1 mục A; nhóm 2 mục A; nhóm 3; kiểm B (K-B-8) |
| `CLAUDE.md` §10 ("512 hôm nay") | Thật là 1024 (10 mã quyền). Nên ghi `1 << PERMISSION_CODES.length` hoặc bỏ số. | nhóm 3; kiểm C (K-C-10) |
| `docs/ARCHITECTURE.md` bảng thi hành (khoảng dòng 135–160) | Khoảng 8 ô nói sai hiện trạng tiền: 1.4/4.4 (biên nhận đã dựng ở máy chủ), 4.2/5.5 (sổ công nợ đã có), 5.1 (khoá tiền đơn đã xác nhận đã có), 5.3, 5.6 (bản chụp mức đã có), 5.9, 5.14 (khoá kỳ đã có), 5.17, K4 ("hạn 15/10" thật là 31/10). Thiếu dòng 2.4, 4.1, 4.3, 4.5, 5.2. | kiểm A (K-A-4); kiểm C (K-C-05); nhóm 2 mục B |
| `docs/ARCHITECTURE.md` Phần II (khoảng dòng 175–194) | `access` có 6 giá trị, không phải 4; `audit` không import nhưng đọc view của 4 module; danh sách module "nghiêm" và tiền tố bảng đã cũ; thiếu hạng `KHONG_BANG`. Nên trỏ thẳng hằng trong `src/architecture.test.ts` thay vì chép danh sách. | nhóm 1 mục A–B |
| `docs/kernel-18.md` | Dòng 1 trích ADR-0074 (bảo mật hai lớp, chưa làm) như đã có; dòng 4, 10, 14 cũ; chưa có "Người duyệt" và dòng "Kiểm lại bằng người"; hạn PH-TDS-01 (31/10) không máy canh. | kiểm C (K-C-06, K-C-07) |
| `docs/adr/README.md` | 14 ADR đã duyệt (gồm 0092, 0094, 0108 về tiền) nằm dưới nhãn "chờ duyệt"; thiếu 0066, 0069, 0070; 9 ADR đã duyệt chỉ có ở nhánh chưa nhập; ADR-0091 ghi "proposed" nhưng đã bị thay một phần. | kiểm C (K-C-02, K-C-08) |

## Chủ phải chọn một bên (luật nói ba kiểu)
| Chuyện | Các bên | Chi tiết |
|---|---|---|
| Số migration của B5 (siết `staff_party_required`) | `CLAUDE.md` §10 "chờ số kế tiếp"; `docs/adr/README.md` dòng 131 "không giữ chỗ số nữa" nhưng dòng 133 "0019 vẫn giữ"; bài `src/migrations-ho-so-cong-ty-chu.test.ts` còn canh "0019 để dành cho B5"; `CHANGE-GUIDE` công thức d nói 0019. Cũng: "số lớn nhất + 1" (0091) không dùng được vì các nhánh chưa nhập đã giữ 0084–0086, 0089, 0091–0093. | nhóm 3; kiểm C (K-C-10); kiểm D (K-D-4) |
| Migration 0088 thêm trigger siết ngay trong lần phát hành đầu | Luật hai lần phát hành (expand–contract) hay cho phép siết cùng lần khi runbook ghi khoảng hở và đường lùi. | kiểm A (K-A-7) |
| Luật "xoá cứng chỉ có ngoại lệ duy nhất" | Thực tế còn `login_attempt` và dòng đơn nháp ở `orders/repository.ts`. Liệt kê đủ hoặc bỏ chữ "duy nhất". | kiểm A (K-A-9) |
| Ngoại lệ vai `IT` miễn luật "một máy" | ADR-0085 cho phép, `src/CLAUDE.md` và R-N1-12 nói "vai hồ sơ không bao giờ là điều kiện cho phép". | kiểm B (K-B-5) |

## Việc nhỏ, tiện thể
| Tệp | Việc | Chi tiết |
|---|---|---|
| `CLAUDE.md` §6 | "từng cột: `DATA-DICTIONARY.md`" sai: sổ không liệt kê cột bảng. | nhóm 1 mục B; kiểm A (K-A-8) |
| `CLAUDE.md` §7 | Origin: nên ghi cả DELETE và quy tắc JSON; "không có dependency runtime" chưa nhắc `web/vendor/qrcode.js` (ADR-0108). | nhóm 3; kiểm C (K-C-10) |
| `src/CLAUDE.md` dòng 6, 8, 15, 27 | 16 module (thật 22), "thuần" (còn 3 tệp cần môi trường Worker), danh sách module nghiêm, danh sách tiền tố. | nhóm 1 mục B |
| `web/CLAUDE.md` | Bảng "sửa tệp nào chạy kịch bản nào" thiếu dòng QR, ba trang sổ đại lý, sáu trang khác; hai lời dặn lỗi thời ở dòng ~21 và ~54. | nhóm 3; đề xuất đợt 1 mục 3, 6 |
| `docs/SYSTEM-DESIGN.md` §16 (chủ giữ) | Bốn hàng hết lý do: 5.14 khoá kỳ, "ba danh sách" cổng (nay bốn), "14 trang", công ty ở ảnh xác nhận. | nhóm 2 mục C; kiểm C (K-C-11) |
| `tests/e2e/pwa.mjs` dòng 23 | Chú thích nói màu chính, mã dùng `--c-status-bar`. | nhóm 3 |

## Việc cần ADR hoặc ghi sổ (cùng ba quyết định ở `README.md`)
- Nhập ADR-0109 vào bản chính trước đợt 2 (K-C-01).
- Ghi vào sổ hoãn `docs/quyen-hoan.json`, kèm người chịu trách nhiệm và hạn, nếu chọn cách khác thi công ngay: K-B-1, K-A-1, K-A-3, lệch 5.17 (K-A-2). Thêm câu cho phép riêng cho HC-5.19 và cho sổ đại lý (K-C-03).
- Một chỗ theo dõi có hạn cho ADR đã duyệt mà chưa thi công: 0099, 0074, bản siết và Cron dọn vé của 0094 (K-B-2).
- Bốn câu truy vấn thô mới ở `orders/repository.ts` và hạn máy cho module cũ `orders`, `audit` (K-A-6); cạnh `staff → audit` thừa (K-A-10).
