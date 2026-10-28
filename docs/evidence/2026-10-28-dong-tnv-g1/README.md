# Bằng chứng 28/10/2026 — đóng dần lỗ TNV-G1 (đơn huỷ còn tiền đã thu)

> Hồ sơ có ngày, viết xong là đóng băng. Lời chủ dự án 28/10: «vá luôn lỗi và thêm dòng tiền vào đơn» (phần «thêm dòng tiền» = ADR phí đón, phiên khác lo).
> Nhánh `claude/nostalgic-aryabhata-066936`, CHƯA gộp `main`, CHƯA triển khai. TNV-G1 CHƯA đóng (xem `docs/quyen-hoan.json`).

## 1. Kịch bản Chrome mới — `kich-ban/thu-truoc-smoke.mjs`
Chạy từ gốc worktree, sau `npm run build:web`, có `AXE_JS` và `CHROME_BIN` (lệnh ở đầu tệp). Năm bước, 1040 + 390:
1–2. Trang chủ Kế toán: «Cần xem lại» có «1 khoản thu trước đã duyệt, chờ chi» và «1 đơn huỷ còn người chưa nộp tiền», cả hai trỏ xuống khối «Thu trước của đơn huỷ»; khối liệt kê hai việc theo thứ tự, mã đơn mở trang đơn; không chữ «cọc»; không tràn ngang; axe sạch.
3. Chuông Kế toán: tin «Đơn … đã được duyệt hoàn thu trước cho khách, chờ ghi chi hoàn», không số tiền.
4. Trang đơn huỷ (Kế toán): «Đã trả lại khách trước khi huỷ 150.000 ₫»; ghi chi hoàn 500.000 → «Đã hoàn trả 500.000 ₫», công ty còn giữ 850.000 ₫.
5. Bán hàng: không dòng thu trước, khối ẩn.

- **Quan sát chặn thật (P16), 28/10:** tắt dòng `void taiThuTruoc(staff);` ở `web/home.ts` → build → chạy → đỏ ở bước 1 («hết giờ chờ: khối thu trước + Cần xem lại (1040)») → hoàn nguyên → xanh. Sau phiếu người kiểm độc lập (T6), bước 5 kiểm thêm «trang Bán hàng không gọi `/api/ledger/coc*`»: gỡ cổng `coKhoiThuTruoc` ở `taiThuTruoc` → đỏ «Trang chủ Bán hàng không được gọi /api/ledger/coc*» → hoàn nguyên → xanh.
- **Người kiểm độc lập 28/10: ĐẠT**, không lỗi cao. Đã vá: V1 (thêm ca tài khoản lai Kế toán + Đối tác vào `src/shared/thong-bao-duyet-hoan.test.ts`; bỏ `|| holdsPartner(staff)` → đỏ → hoàn nguyên), V3 (ba dòng ở `docs/SO-HANG-RAO.md`), T6 (bước 5 ở trên), T7 (bài `src/migrations-0025.test.ts` nay 9 hành động, khoá thêm «duyệt chuyển không vào view»), T8 (câu tiến độ ở `docs/quyen-hoan.json`), T3 (nhắc tải lại ở `docs/HANDOFF-N1.md`). Chờ chủ: V2 (chữ «trước khi huỷ» với đơn huỷ cũ). Ghi để biết, không làm: T1 (gói Đơn hàng còn đệm 19 byte), T2, T4, T5.
- **Nợ giao diện có sẵn thấy trong ảnh:** ở khổ 1040, cột phải của trang đơn hẹp nên giá trị «… ₫ — còn có thể hoàn tới …» ngắt giữa con số (ảnh `don-huy-ke-toan-1040.png` của kịch bản cũ, đơn không có dòng mới, cũng vậy).
- **Nợ có sẵn, không do việc này:** axe báo `moderate region: #strips` vì dải nhắc bảo mật hai lớp (`.mfa-strip`) nằm ngoài vùng mốc trang (đã ghi ở đầu `docs/evidence/2026-10-08-qr-thanh-toan/kich-ban/qr-smoke.mjs`). Kịch bản bỏ riêng `#strips` khi chạy axe ở Trang chủ, phần còn lại phải sạch mọi mức.
- Ảnh ở `anh/` (Trang chủ Kế toán hai khổ, chuông, trang đơn huỷ sau khi ghi chi).

## 2. Kịch bản cũ đã sửa — `docs/evidence/2026-10-05-nam-loi-tien/kich-ban/coc-don-huy-smoke.mjs`
Ba chỗ đỏ có sẵn: ghi thu lên đơn nháp (ADR-0135 Đ7, nay 409) → ghi thu sau khi xác nhận; nhãn «Cọc giữ lại – khách huỷ» → «Thu trước giữ lại – khách huỷ»; chờ «Đã hoàn» → «Đã hoàn trả». Thêm `OUT=…` để không ghi đè ảnh có ngày 5/10 (lần chạy này ghi vào `anh/` ở đây).

## 2b. Kịch bản Chrome theo bảng `web/CLAUDE.md`, chạy 28/10 trên nhánh (sau `npm run build:web`, có `AXE_JS`)
| Kịch bản | Kết quả |
|---|---|
| `thu-truoc-smoke.mjs` (mới) | xanh, 5 bước |
| `coc-don-huy-smoke.mjs` (đã sửa, mục 2) | xanh |
| `trang-chu-smoke.mjs` | xanh |
| `a2-smoke-form.mjs`, `a2-smoke-sheet.mjs` | xanh |
| `xac-nhan-smoke.mjs` (thay `v1-xac-nhan-png.mjs`, đỏ sẵn từ 27/10 theo ghi chú đầu tệp) | xanh |
| `a2-smoke-order.mjs` | **đỏ có sẵn**: «hết giờ chờ: banner incomplete_trip» ở bước 2 (xác nhận khi thiếu ngày). Chạy lại trên bản sạch `git archive d9cf8adb`: đỏ ĐÚNG chỗ đó |
| `v1-nguoi-phu-trach.mjs` | **đỏ có sẵn**: 16 bước ✗ / 1 ✓, gốc là «giao Sales Một: 409 `order_not_confirmed`». Trên bản sạch d9cf8adb: cùng từng bước đỏ/xanh |

Hai kịch bản đỏ sẵn đều vướng bước xác nhận đơn (ADR-0135/0136, 27/10), không chạm phần tiền của đơn huỷ — ghi nợ, chưa sửa ở việc này.

## 3. Chạy lại kịch bản G1 — điều kiện 5 ở §6 kế hoạch `docs/superpowers/plans/2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md`
Do một trợ lý chạy nền làm, 28/10 21:25–21:31 giờ VN. **Chưa có người kiểm thứ hai.**
- **Mã đã chạy:** `git archive d9cf8adb` (= `main` lúc đó), D1 tạm cục bộ, sáu máy thử song song. **Không** phải production; **không** gồm phần sửa của nhánh này.
- **Kịch bản:** bản CHÉP của `~/Documents/danh-gia-ux/2026-10-01/kich-ban/` (bản gốc ngoài kho không bị ghi). Sửa ở bản chép: thêm `LAN_GUI_SECRET`, `MFA_ENCRYPTION_KEY` cho máy thử; huỷ ở văn phòng thêm `lyDo: "KHACH_DOI_Y"`; ghi thu chuyển ra SAU bước xác nhận (ADR-0135 Đ7); `pickupChoice: "KHONG_DON"` (ADR-0134); Đối tác dùng «Gửi đơn» (ADR-0136); thêm bước quan sát `[g1-rerun]` và tệp `bo-sung-2.mjs`. Cố ý không sửa mã lý do Từ chối ở HD08 (thuộc G9).
- **Cách chấm:** theo mã HTTP và số tiền trong `thuc_te`, KHÔNG theo nhãn `ket_luan` tự sinh (nhãn vẫn so dấu hiệu lỗi cũ, ví dụ QT05 ghi «xe vẫn xuất bến» là sai — xuất bến bị 409 vì ngoài cửa sổ, suất của đơn huỷ đã tự rút).

| Mã | Cũ (2/10) | Nay | Kết luận |
|---|---|---|---|
| kiem-lai-09 | còn lại 150.000; biên nhận «Đã huỷ» còn lại 150.000 | còn lại 0, dư 0; nhãn «Thu trước giữ lại – khách huỷ», hạn, còn giữ 50.000; ảnh huỷ không có «Còn lại» | hết |
| 09 (nhóm 1) | còn lại 180.000; thu sau huỷ 201; Kế toán hoàn tự do 201 | còn lại 0; Bán hàng thu sau huỷ 403; hoàn tự do 409 `coc_needs_approval` | hết (phần G1) |
| 26 (nhóm 3) | còn lại 140.000; thu thêm 201; hoàn 201 | còn lại 0 ở cả ba nơi; sổ thu trước có đơn, còn giữ 60.000; thu thêm 403; hoàn 403 / 409 | hết |
| HD06 | 300.000 còn lại; Kế toán không thấy | còn lại 0; nhóm Khách huỷ; sổ có đơn và người giữ tiền; không đẩy tin (đúng đ5) | hết |
| HD08 | còn lại 100.000 | còn lại 0; nhóm Chưa kết luận; CK chưa xác nhận không tính vào đã trả | hết (phần G1); G9 chưa kiểm |
| QT05 | Quản trị không có đường hoàn | còn lại 0; Quản trị hoàn tự do 403, duyệt hoàn 201 | hết |
| DT04 | còn lại 140.000 | còn lại 0; Kế toán thấy đối tác giữ 60.000; Đối tác không thấy tên người giữ | hết |
| KT01 (Đ5) | thẻ còn lại 140.000; sổ không có mục | còn lại 0; sổ có Đ5; ô đếm người giữ tiền = 1 | hết cho G1 |

Dò thêm (đều đúng ADR-0089): ai ghi thu được vào đơn huỷ; duyệt và chi tách người (`coc_same_person`, `coc_exceeds_approved`, `coc_exceeds_paid`); huỷ không lý do 400; Bán hàng đọc sổ thu trước 403; hạn hoàn = ngày đi + 60 ngày. `audit-invariants --db local` đạt trên cả sáu D1 tạm (một cảnh báo R-CTL-1 không liên quan).

**Ngoài G1, không chặn đóng, ghi để người điều phối xem:** (a) đơn KHÔNG huỷ mà khách trả dư không nằm trong `canChi` của `GET /api/ledger/coc` — kế hoạch §3.4 hứa có, nhưng kiểu `canChi` bắt buộc `duyetId`; (b) KT01 Đ3 thuộc G5, Đ6 thuộc ADR-0088; (c) biên nhận nháp vẫn có tiêu đề «XÁC NHẬN ĐƠN DỊCH VỤ [Chờ xác nhận]»; (d) HD08 bước Từ chối gửi mã cũ `busy` → 400, G9 chưa kiểm lại.

Tệp: `g1-chay-lai/ket-qua/*.ket-qua.jsonl` (kết quả mới), `g1-chay-lai/nhat-ky/*.log` (nhật ký từng nhóm, `audit-1…6.log`). Bản chép kịch bản đã sửa (cùng `may-chu.mjs`, `chay.sh`; khoá máy thử sinh ngẫu nhiên mỗi lần chạy) KHÔNG đưa vào kho; cất ngoài kho ở thư mục ghi chú chung của nhóm phiên: `~/Library/Application Support/Claude/side-session-notes/local_5f8b3116-5801-4df4-9799-5d2d23e52c2a/g1-chay-lai-2026-10-28/`. Gộp nhánh này vào `main` rồi thì nên chạy lại điều kiện 5 trên mã đã gộp trước khi đóng TNV-G1.
