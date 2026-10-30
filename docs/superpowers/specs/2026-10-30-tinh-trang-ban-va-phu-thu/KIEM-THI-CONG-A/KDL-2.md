# KĐL-2 — Kiểm độc lập T5–T10 (ADR-0146 + ADR-0152)

> Hồ sơ có ngày 30/10/2026. Người kiểm: subagent `nguoi-kiem-doc-lap`, chỉ đọc; người điều phối chép báo cáo. Phạm vi: `40978850..5ae705b8` (`0b27b65e` siết sau KĐL-1, `5afe6f1f` T6+T5, `dd6fb7dd` T7+T5, `f8fe7143` T8, `680f22cf` T9, `7991ac75` T10, `5ae705b8` vị từ khoảng rỗng).

## Kết luận: **ĐẠT** — không mục CHẶN; 1 NÊN SỬA nhỏ; 2 GHI NHẬN.

## Chạy lại
- `npm run typecheck`: 0 lỗi.
- 13 tệp bài (luat-ban-route, dac-diem-route, luat-ban-cong-route, luat-ban-moi-cua, luat-ban-mot-tep, for-order-luat-ban, orders-khong-doc-nhom-truc-tiep, permission-enforcement, route-write-guard, route-access, permissions, bang-tu-giao-dien, audit-invariants): 297/297 xanh.
- `node scripts/audit-invariants.mjs --db local`: «Mọi bất biến đạt, 1 cảnh báo» (cảnh báo `R-CTL-1` có từ trước).
- `src/phat-hien-han.test.ts`: 2/2 xanh (30/10). Không chạy `npm test` toàn bộ (người thi công: 6864 bài, 0 đỏ).

## Đột biến tự thử (bản sao tạm `/tmp/kdl2-copy`)
1. Bỏ `congLuatBan` ở `PUT /api/orders/:id/booker` → đỏ `luat-ban-moi-cua.test.ts` bài 1 và `luat-ban-cong-route.test.ts` bài 6 (tiêu chí 3).
2. `sales.block.write` của ADMIN = none → đỏ `permissions.test.ts` bài 9, 15, 20, 50, 51 (hai bài (i)) và `luat-ban-route.test.ts` bài 1.
3. Bỏ vế `holdsPartner` ở ba route luật bán → đỏ `luat-ban-route.test.ts` bài 1 (tài khoản lai phải 403).

## Đối chiếu
1. `MATRIX`: hai ô mới = SALES, ADMIN, SUPER_ADMIN `any`, bảy cột còn lại `none` (qua hàm chung `banHangQuanTri()`) — khớp ADR-0146 Đ5, ADR-0152 Đ3; bài (i) đủ hai vế.
2. Route mới (`pricing/index.ts` GET/POST/`…/ket-thuc`; 9 route `catalog/dac-diem-route.ts`): dòng đầu `can()` + `holdsPartner`; cổng đúng (`office` luật bán, đọc đặc điểm, gắn cho dịch vụ; `admin` định nghĩa, gắn theo nhóm); khoá lạc quan (`valid_to_date IS NULL` + `changes()`; `expectedUpdatedAt`; `dangThay`); dữ liệu + nhật ký một `db.batch`, nhật ký theo `changes() > 0`; nhật ký không SĐT/email/MST.
3. Cửa ghi đơn (R-4 theo Q-1 = (a)): lập đơn / lưu nháp sau `resolveBooker`, trước `tranGiamGiaNhap`; đổi bên đặt chỉ khi đổi thật, kể cả đơn đã xác nhận; `/status` và Gửi xác nhận (`xac-nhan-route.ts:117`) trước `tinhCanXacNhan`; Gửi đơn qua dòng đầu `kiemCongXacNhan`; Còn vé trước `congNhomTatDuaDon` và mốc, trước mọi ghi. Cửa «không cần cổng» không có cổng; chỉ `cong-ban.ts` gọi `kiemLuatBan(`.
4. (l3): không so `name`/`ten*` với chuỗi hằng; tên chỉ để viết câu báo; không tên cụ thể trong mã — đạt (vẫn «dựa vào kỷ luật», `SO-HANG-RAO.md:787`).
5. `kiemLuatBan` nhận `vnToday(new Date())` từ nơi gọi; không `date('now')`; dùng chung `hieuLuc`. Lọc for-order cùng điều kiện `benDatCuaToi`; thiếu hàm tiêm / chưa đăng nhập / rỗng ⇒ không lọc; lọc trước `nhomChoForm`.

## NÊN SỬA
1. `src/modules/catalog/dac-diem-route.ts:89–96` — `chayGan` `catch { return false }` nuốt mọi lỗi lô ⇒ lỗi lạ thành 409 `stale`. Dữ liệu an toàn (lô nguyên tử). Đề xuất chỉ nuốt lỗi trigger/UNIQUE đã biết, ném lại phần còn lại.

## GHI NHẬN
2. Cổng sớm ở Còn vé (`xac-nhan-route.ts` ~300) làm `kiemCongXacNhan` gọi lại lần hai (chỉ đọc) — hợp lý, đúng R-7, lưới ghim thứ tự.
3. `/status`, Gửi xác nhận cũng gọi hai lần (Q-1 (a) + dòng đầu `kiemCongXacNhan`) — không sai. Các lệch người thi công tự khai (cổng sớm Còn vé; ca tài khoản lai có loại ở T9 không dựng được qua route thật — 409 `role_partner_label_conflict`; vị từ khoảng rỗng `5ae705b8`) hợp lý.

## Chưa kiểm
- Chưa so từng chữ R-PRC-8 (`audit-checks.mjs`) với câu ở `luat-ban-repo.ts` (tin bài ghim văn bản + R-PRC-8 xanh).
- Chưa tái hiện đột biến từng dòng bảng 4.3 (ba đột biến trên).
- E2E, Chrome: ngoài phạm vi.

## Người điều phối xử lý (30/10)
- NÊN SỬA 1: dồn sang đợt 3 (lỗi nhỏ, không mở vòng riêng).
