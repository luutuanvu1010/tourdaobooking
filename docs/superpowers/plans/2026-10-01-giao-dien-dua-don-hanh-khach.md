# Kế hoạch thi công — Giao diện "Đưa đón" + "Hành khách" (ADR-0047 Phần B) + cảnh báo sớm (2026-10-01)

> Bổ sung cho `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md` §7 (Phần B, B0–B7). Vai: điều phối lập; người thi công làm; người kiểm độc lập nghiệm thu (N8).
> Vì sao gấp: `docs/superpowers/specs/2026-10-01-danh-gia-luong-xe-chay.md` — không màn hình nào nhập nơi trả / hành khách ⇒ chuyến kẹt `CHUA_CO_NOI_TRA`, `THIEU_TEN` ở xuất bến.

## Lời chủ (2026-10-01, chat)

- *"1- A : đọc ở Desktop/Tour Đảo service form , 2- Có"* — (1) làm theo bản vẽ Claude Design của chủ; (2) **có** cảnh báo sớm "chưa có nơi trả / thiếu tên khách" lúc xác nhận đơn và lúc xếp xe — **chỉ cảnh báo, không chặn**.
- Bản vẽ: chép nguyên vào `docs/design/2026-10-01-dua-don-hanh-khach/` (mục lục + câu chữ: `00 Muc luc va cau chu.dc.html`; màn `M1`…`M7`, `07` giữ nguyên; bản chạy được `The dua don (standalone).html`; bản đồ màn → tệp: `github.md`).
- Đã chốt trước (không hỏi lại): nơi trả gợi ý theo dịch vụ = ADR-0076 (Q-D); ô "Số khách đi xe" **cả đơn** (`ride_pax`) **KHÔNG làm** — chờ ADR-0065 (Q-A) ⇒ dựng theo **Tweaks tắt**: mẫu số = số khách dịch vụ, dải đầu = số cộng dồn (như mục lục bản vẽ nói); ô "Số người chiều về" (`pax_override`, ADR-0054) **làm**.

## Quyết định áp dụng (bề mặt, ghi lại — chủ bác được)

| # | Mục "cần chủ duyệt" trong mục lục bản vẽ | Áp dụng | Lý do |
|---|---|---|---|
| D1 | Câu 2 = A (Nơi trả gợi ý) | làm | ADR-0076 đã duyệt |
| D2 | Đoạn "Số khách đi xe" | **tắt** | Q-A; ADR-0065 chưa duyệt |
| D3 | Form điện thoại ẩn thanh tab, thanh lưu dính đáy | làm | khớp app + 07 |
| D4 | Chi tiết đơn: hai khối mới sau "Khách hàng"; thẻ dịch vụ bỏ dòng Giờ đón / Điểm đón; "Sửa thông tin chuyến" còn Giờ khởi hành, Check-in, Ghi chú | làm | chủ vẽ |
| D5 | Câu khoá đơn đã xác nhận đổi theo vai (M3) | làm theo bản vẽ | chữ, đảo ngược được |
| D6 | "Nhà riêng" thay địa chỉ gõ tự do ở thẻ danh sách đơn / biên nhận / điều phối | **KHÔNG làm** — giữ hiện trạng | bản vẽ ghi "không vẽ, chờ duyệt"; chạm dữ liệu hiện cho tài xế ⇒ hỏi chủ sau |
| D7 | Bố cục bảng hành khách máy tính | làm | chủ vẽ |
| D8 | Chữ "đề xuất" trong danh sách câu chữ | dùng đúng chữ bản vẽ | chủ vẽ = duyệt bề mặt; liệt kê lại trong báo cáo cuối |
| D9 | Giá trị ngoài token (lưới chặng 200/140px, cột bảng 28/1fr/112/176/96, …) | thêm vào nhóm "Riêng của Tour Đảo Booking" ở `public/app.css` | `web/CLAUDE.md` |

Ngoài phạm vi lần này: biên nhận PNG dòng đưa đón (B5 cũ), "Việc của tôi" hiện chặng, D6.

## Cảnh báo sớm (lời chủ "2 — Có") — đặc tả ngắn

- **Hai điều kiện, đúng nghĩa cổng xuất bến** (một luật, không viết lại): (a) chặng mở chưa có nơi trả (không điểm danh mục và không địa chỉ gõ tự do) — cùng nghĩa `coNoiTra` của `kiemXuatBen`; (b) số hành khách có tên < số người phải chở — cùng nghĩa `THIEU_TEN`.
- **Lúc xác nhận đơn** (nút "Xác nhận đơn" ở form và ở trang đơn): hiện dòng cảnh báo trước / sau khi xác nhận, **vẫn xác nhận được**. Chữ theo bản vẽ: "Cần nơi trả trước khi xếp xe" / "Còn N khách chưa có tên — cần đủ trước khi xe chạy". Luật thuần đặt ở `src/shared/` (một hàm, có `*.test.ts`), giao diện gọi hàm đó; máy chủ **không** đổi `confirmGaps` (không chặn).
- **Lúc xếp xe** (bảng điều phối): `kiemXep` trả thêm danh sách `canhBao` (không vào `chan`, không vào `canPhaLe`) gồm `CHUA_CO_NOI_TRA`, `THIEU_TEN` cho chặng được xếp; lệnh xếp vẫn chạy; giao diện điều phối hiện câu cảnh báo sau khi xếp. Dùng lại dữ liệu `kiemXuatBen` đã có (không tính lần hai bằng cách khác).

## Chia việc (hai người thi công song song, mỗi người một worktree từ nhánh `worktree-doi-chieu-phieu-giam-doc`)

- **Người 1 — trang đơn:** M1, M2, M6 (form đơn: khối Đưa đón trong thẻ dịch vụ, khối Hành khách, tạo sẵn chặng theo mẫu `GET /api/van-chuyen/mau-chang` + `changMacDinh`), M3, M4, M5 (chi tiết đơn + hai bảng trượt), cảnh báo lúc xác nhận. Gửi `legs` / `passengers` qua `POST/PUT /api/orders` (nháp) và `POST/PUT /legs`, `POST /passengers` (đã xác nhận). Không gửi `pickupTime` / `pickupPlace` từ form mới.
- **Người 2 — danh mục + điều phối:** M7 (khung "Đưa đón" ở Danh mục, `GET/POST /api/van-chuyen/mau-chang/:code`, lịch sử), cảnh báo lúc xếp (`kiemXep` + `web/dieu-phoi*.ts`), hiện số hiệu chuyến bay trên bảng điều phối / thẻ chuyến tài xế nếu bản vẽ có.
- Tệp chung dễ đụng: `public/app.css` (mỗi người thêm khối riêng có chú thích), `src/shared/contracts.ts`. Điều phối gộp.

## Luật (nhắc)

Không `innerHTML`; ô gõ 16px; CSS chỉ token; chữ tiếng Việt có dấu, không lộ `OUT`/`RETURN`/`adult`; ẩn/hiện theo `can()`; **bản vẽ cần dữ liệu API chưa có ⇒ DỪNG, báo điều phối**, không tự thêm trường hợp đồng; mỗi task đỏ trước xanh sau; sửa giao diện chạy kịch bản Chrome 390 + 1040.

## Tiêu chí nghiệm thu (kiểm được)

1. Lập đơn có dịch vụ đưa đón trên form: nhập ngày / giờ / nơi đón / nơi trả (điểm danh mục hoặc gõ tự do), lưu nháp, mở lại ⇒ còn đủ; `GET /api/orders/:id` có `legs` đúng.
2. Dịch vụ có mẫu Hai chiều ⇒ form tạo sẵn chiều đi + chiều về, nơi trả gợi ý điền sẵn, sửa / bỏ được (M6).
3. Nhập 4 hành khách (họ tên, năm sinh, loại tuỳ chọn) ⇒ lưu nháp ⇒ `GET /passengers` trả 4; lỗi dòng hiện đúng chữ (thiếu tên, năm sinh ngoài 1906–năm nay).
4. Đơn đã xác nhận: "Sửa đưa đón" (M4) thêm nơi trả cho chặng ⇒ `PUT /legs/:id` 200; bỏ chặng bắt chọn lý do; "Sửa danh sách" (M5) thêm / huỷ người.
5. Kịch bản đầu-cuối trên D1 tạm: lập đơn → nhập nơi trả + đủ tên → xác nhận → xếp chuyến → "Cập nhật điểm theo đơn" → xuất bến **không** bị giữ `CHUA_CO_NOI_TRA` / `THIEU_TEN`.
6. Xác nhận đơn thiếu nơi trả / thiếu tên ⇒ hiện cảnh báo, xác nhận **vẫn thành công**. Xếp chuyến cho chặng đó ⇒ xếp thành công + hiện cảnh báo.
7. Đối tác / Thực tập: ô "Số người chiều về" chỉ xem (403 nếu gửi); không thấy nút ngoài quyền.
8. M7: Quản trị đổi mẫu (Không / Một / Hai chiều, giờ về, nơi trả gợi ý) ⇒ lưu bản mới, lịch sử hiện; người không phải Quản trị không thấy nút.
9. Chữ khớp danh sách câu chữ bản vẽ; không chữ Anh / mã thô; 390 + 1040 không tràn ngang.
10. `npm test`, `npm run typecheck`, e2e liên quan (`chang-hanh-khach`, `dieu-phoi`, `orders`, `catalog`, `pwa`) xanh; kịch bản Chrome + ảnh ở `docs/evidence/2026-10-01-dua-don-hanh-khach/`.
11. Nhật ký phiên bản: mục mới (số = lớn nhất + 1 lúc gộp).

## Kết quả (điều phối, 2026-10-01 16:55)

- Người 2 (M7 + cảnh báo xếp) @c953c426: kiểm độc lập **ĐẠT CÓ ĐIỀU KIỆN** (điều kiện e2e). Người 1 (M1–M6 + cảnh báo xác nhận) @9020f0c6, đã gộp Người 2: kiểm độc lập **ĐẠT CÓ ĐIỀU KIỆN** (điều kiện e2e), không CAO/VỪA.
- Gộp vào nhánh này + `origin/main` + nhật ký phiên bản **1.57** (@99a57503): `npm run typecheck` 0 lỗi; `npm test` 2511/2511; **e2e đủ bộ 37/37** (gồm `dua-don-dau-cuoi`, `audit-invariants`). Bài đo giờ hook đỏ do máy tải 24–98 (nhánh không đổi hook; lúc máy rảnh trước đó xanh) — chạy lại khi máy rảnh.
- Nợ nhỏ (không chặn): PM-1 `PUT /api/orders/:id` trả 400 thay vì 409 khi chặng vừa bị bỏ; PM-2 `GET /passengers` sắp theo `created_at, id` ⇒ thứ tự khác thứ tự nhập (sửa: `rowid` / cột thứ tự — cần chủ); trang đơn nhắc thiếu tên cả khi chính sách tắt `requireManifest`; mã đơn vị `perPax` lộ ở Danh mục (có từ trước); lịch sử mẫu chặng thiếu cột "Người đổi" và bảng điều phối chưa hiện số hiệu chuyến bay (chờ chủ — thêm khoá DTO); D6 "Nhà riêng" chờ chủ; chữ tự đặt: "Đã xác nhận đơn.", "Đã lưu đưa đón.", "Đã lưu danh sách hành khách.", "Điểm đã ngưng"; đề xuất dòng mới cho bảng kịch bản Chrome của `web/CLAUDE.md` (ở hai nhật ký thi công).
