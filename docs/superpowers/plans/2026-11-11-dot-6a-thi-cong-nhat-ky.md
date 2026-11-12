# Nhật ký thi công Đợt 6A — ảnh biên lai chuyển khoản bắt buộc (ADR-0196)

- **Ngày:** 2026-11-11. **Nhánh:** `claude/dot-6a-bien-lai-6e4f72` (worktree `soan-adr-a-b-ed0d40`), cắt từ `main` @`2a7ca7117`.
- **Căn cứ:** ADR-0196 (accepted 11/11, câu (a): chỉ Đối tác ghi «Công ty, chuyển khoản» mới bắt buộc ảnh); kế hoạch mẹ `2026-11-08-sua-sau-ra-soat-lan-2.md` Phần IX, Task 6A.1–6A.4.
- **Điều kiện phát hành:** khoá `xay_tren_cho_phep_adr_0196` (HC-5.19) — CHỈ phát hành SAU diễn tập khôi phục (hẹn 2026-11-25). Nhánh NẰM CHỜ; không đưa lệnh nhập trước khi chủ báo diễn tập xong (hoặc chủ nói rõ cho nhập sớm). Migration 0158 không được vào `main` trước diễn tập (`npm run trien-khai` áp mọi migration chưa áp).
- **Số migration:** 0158 (lúc đặt: `main` tới 0157, không nhánh / worktree chưa gộp nào có 0158+; giữ chỗ ở thư mục ghi chú chung).
- **Thứ tự nhập:** 6B (ADR-0197) nhập trước; hai nhánh cùng chạm `web/order.ts` ⇒ 6A gộp `main` sau khi 6B nhập, đánh lại số bản, chạy lại bộ kiểm.

## Đã làm

| Việc | Tệp chính |
|---|---|
| Vị từ chung «Công ty thu bằng chuyển khoản» + `canBienLai` đủ bốn điều; `canDoiChieu` gọi lại vị từ | `src/shared/bien-lai.ts`, `src/modules/billing/rules.ts` |
| Bảng `bil_receipt_proof` (khuôn `fbk_attachment` + `UNIQUE(receipt_id)`, trigger người tải = người ghi khoản / `CUSTOMER_PAYMENT`, trần 20/giờ bằng trigger, `_no_replace` có `receipt_id`) | `migrations/0158_bien_lai_chuyen_khoan.sql` |
| SQL nghiêm, kho R2 (D1 trước, R2 sau, lỗi không ném), đọc ảnh / chuẩn bị lô | `billing/bien-lai-repo.ts`, `billing/kho-bien-lai.ts`, `billing/bien-lai.ts` |
| `ghiLanThu` nhận ảnh: kiểm → MỘT lô (khoản thu, DECLARED, dòng ảnh, nhật ký) → đặt kho → đánh dấu; lính gác `changes()` | `billing/service.ts` |
| Route xem (nhật ký trước, no-store, CSP sandbox), gỡ (Toàn quyền, bắt buộc lý do), hàng chờ + chạy lại | `billing/index.ts` |
| Ô quyền `payment.proof.view` (theo ADR) và `payment.proof.purge` (giả định — xem dưới) | `src/shared/permissions.ts` |
| DTO khoản thu mang `bienLai` (chỉ trạng thái) cho người giữ ô xem; cờ `bienLaiKhiCongTyCk` | `contracts.ts`, `service.ts` |
| Kho `BIEN_LAI` (`wrangler.jsonc`, `worker-configuration.d.ts`), cổng 1e biết kho thứ tư | `scripts/release-lib.mjs` |
| Luật kiểm `R-BIL-BL1` (tải dở dang quá 1 giờ / chờ xoá) | `scripts/audit-checks.mjs` |
| Giao diện: ô «Ảnh biên lai chuyển khoản» trong «Ghi khoản thu» (thu nhỏ trên máy), «Xem biên lai» / câu trạng thái ở dòng khoản thu | `web/order.ts`, `web/thu-nho-anh.ts` (tách từ `web/ho-tro-tep.ts`) |
| Sổ dữ liệu, cột N3, sổ nợ «ghi nhiều lần», ảnh chụp route, bảng phân loại lịch sử (bốn hành động mới ẩn khỏi lịch sử đơn) | các tệp tương ứng |
| e2e `bien-lai`; kịch bản Chrome `bien-lai-smoke.mjs` (cùng thư mục `qr-smoke.mjs`) | `tests/e2e/bien-lai.mjs`, `docs/evidence/2026-10-08-qr-thanh-toan/` |

## Đỏ trước, xanh sau

- `src/modules/billing/bien-lai-luat.test.ts`: đỏ (thiếu `src/shared/bien-lai.ts`) → xanh 6/6.
- `src/migrations-bien-lai.test.ts`: đỏ 6/6 (chưa có bảng) → xanh 6/6.
- `src/modules/billing/bien-lai-route.test.ts`: chạy trên mã trước phần máy chủ (`cefdf7829`, worktree tạm) ĐỎ 14/14 → trên nhánh XANH 14/14.
- Đột biến quan sát chặn thật: ghi ở `docs/SO-HANG-RAO.md` (năm dòng ADR-0196, 2026-11-11).

## Giả định của người thi công (chủ sửa được bằng một câu)

1. **Ô `payment.proof.purge` (chỉ Toàn quyền)** cho lệnh gỡ ảnh và hàng chờ dọn kho: ADR chỉ nói «chỉ Toàn quyền», không có ô sẵn đúng nghĩa; không mượn ô của việc khác. Không nới ai.
2. **Ảnh gửi kèm khoản KHÔNG cần ảnh ⇒ 400** (không lưu tệp ADR không cho).
3. **Đặt kho hỏng thì giữ «tải dở dang»** (đúng chữ ADR Đ2), khác khuôn vé hỗ trợ (quyết xoá ngay).
4. **Bốn hành động nhật ký mới mặc định ẩn** khỏi lịch sử đơn (Đối tác và nội bộ), như mọi loại dòng mới; trang Nhật ký (Toàn quyền) đọc được.
5. **Kịch bản Chrome tách tệp** `bien-lai-smoke.mjs` thay vì chèn vào `qr-smoke.mjs` (cần tài khoản Đối tác; bước B/C của `qr-smoke.mjs` đỏ sẵn). Đầu `qr-smoke.mjs` có dòng trỏ sang.
6. **Chữ giao diện** lấy nguyên văn ADR («Ảnh biên lai chuyển khoản», «Xem biên lai», «ảnh chưa tải xong», «Biên lai đã được gỡ», «Chưa có biên lai»); câu 400/413/429 do người thi công viết, chủ đổi được.

## Cần chủ quyết

- ~~Trần gói trang Đơn hàng +87 byte~~ — **CHỦ ĐÃ DUYỆT** 11/11/2026 (chuyển qua phiên điều phối), nguyên văn «Duyệt nới 87 byte»; `TRAN_ORDERS` = 111.444 (`src/goi-trang-nhe.test.ts`).
- Nhánh vẫn NẰM CHỜ tới sau buổi diễn tập khôi phục (25/11).

## Chưa làm / chưa kiểm

- Chưa thử iPhone thật (HEIC, Safari); chưa đo bộ nhớ Worker với thân ~14 MB; chưa có nút gỡ trên giao diện (BACKLOG §70).
- Chưa tạo kho R2 thật: chủ chạy trước lần triển khai (ở thư mục `tourdao-sales`; nếu hỏi sửa cấu hình thì trả lời «n»): `npx wrangler r2 bucket create tourdao-sales-bien-lai`.

## Kiểm độc lập (2026-11-11, `nguoi-kiem-doc-lap`, chỉ đọc)

- **Kết luận: ĐẠT.** Không lỗi CAO; không giả định nào lệch chữ ADR (giả định 5 — tách tệp kịch bản Chrome — là lệch chữ nhẹ về chỗ đặt, chủ cần biết).
- **VỪA 1** (lính gác `EXISTS` của câu chèn ảnh không có bài canh): đã thêm ca «lính gác cùng lô» ở `bien-lai-route.test.ts` (tầng câu lệnh, vì đường route bị trigger đơn đã giao chặn sớm hơn); đột biến `EXISTS` → `1 = 1` nay đỏ. Dòng ở `docs/SO-HANG-RAO.md`.
- **VỪA 2** (chữ mới chưa vào bảng tham chiếu): đã thêm khái niệm «Ảnh biên lai chuyển khoản» (`cho-chon`, chữ nguyên văn ADR) ở `src/shared/bang-tham-chieu-khai-niem.ts`, `npm run tham-chieu`.
- **THẤP** (ghi nhận, không sửa): chặn cỡ thân chỉ theo `Content-Length` (khuôn ADR-0144, `BL-TEP-THAN-HAI-LAN`); phản hồi phát lại của lớp vé không mang cờ `bienLaiChuaTaiXong` (chỉ ảnh hưởng dòng chữ nhắc).

## Đủ bộ `npm test` lần 1 — các bài cũ phải cập nhật có chủ đích

Bản Development (`wrangler.dev.jsonc`) khai kho `tourdao-sales-dev-bien-lai` (bài «hai bản cùng bộ kho»; trang `docs/HUONG-DAN-TAO-BAN-DEVELOPMENT.md` thêm lệnh tạo kho thứ tư); sơ đồ kiến trúc có khối ngoài `BIEN_LAI`; hai cột N3 vào `COT_N3_NHAT_KY` (R-PD-1); route gỡ vào `KHONG_CAN` của bài đồng bộ chuyến; số route 492 ở bài «xem như vai»; route xem ảnh vào danh sách miễn 200 của bài «số lạ toàn Nền tảng»; bài vé điện tử gửi kèm ảnh khi Đối tác ghi «Công ty, chuyển khoản»; bài Trợ lý đo lại 13 → 12.

## Bộ kiểm cuối (2026-11-12, trên nhánh sau mọi sửa)

- `npm run typecheck`: 0 lỗi.
- `npm test` đủ bộ: 8863 bài, 8859 xanh, 0 đỏ (4 bỏ qua có sẵn); bước đo giờ hook xanh.
- `npm run test:e2e` đủ bộ: 91/91 kịch bản xanh, kể cả `bien-lai`; H5 xanh; `audit-invariants --strict` ba nhóm thoát 0 (một cảnh báo R-ORD-6a có sẵn, không do Đợt 6A).
- Kịch bản Chrome `bien-lai-smoke.mjs`: 8/8 bước xanh ở 390 và 1280, axe không vi phạm critical/serious; ảnh ở `docs/evidence/2026-10-08-qr-thanh-toan/anh-bien-lai/`.
- Người kiểm độc lập: ĐẠT (hai mục VỪA đã sửa, xem trên).

## Kho R2 (2026-11-12, chủ tự chạy)

- Chủ đã tạo `tourdao-sales-bien-lai` (production) và `tourdao-sales-dev-bien-lai` (bản Development). Kiểm bằng `wrangler r2 bucket list` (chỉ đọc): cả hai có mặt. Cổng 1e của `npm run trien-khai` sẽ không dừng vì thiếu kho.
- Lệnh tạo kho hỏi «thêm vào cấu hình?», chủ trả lời «yes» ⇒ wrangler chèn binding thứ hai `tourdao_sales_bien_lai` / `tourdao_sales_dev_bien_lai` kèm `remote: true` và định dạng lại cả hai tệp. Đã `git restore wrangler.jsonc wrangler.dev.jsonc`; nhánh sạch, binding duy nhất vẫn là `BIEN_LAI`.
- Trạng thái: nhánh NẰM CHỜ tới sau diễn tập khôi phục (25/11); 6B nhập trước, rồi 6A gộp main, đánh lại số bản, chạy lại bộ kiểm.
