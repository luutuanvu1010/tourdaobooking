# Nhật ký thi công — M7 "Đưa đón" ở Danh mục + cảnh báo sớm lúc xếp xe (Người 2, 2026-10-01)

> Kế hoạch: `docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md` (phần Người 2; tiêu chí 6 — phần xếp, 8, 9, 10). Bản vẽ: `docs/design/2026-10-01-dua-don-hanh-khach/M7 Danh muc - dua don.dc.html` + mục "Danh mục (M7)" của `00 Muc luc va cau chu.dc.html`. Vai: người thi công — KHÔNG tự nghiệm thu (N8).
> Nhánh `worktree-agent-a0b4e92769db45529`, gộp từ `worktree-doi-chieu-phieu-giam-doc` @ 34db1b5c.

## Đã làm

| Phần | Tệp | Ghi chú |
|---|---|---|
| (B) Cảnh báo lúc xếp | `src/shared/dieu-phoi-kiem.ts` | Rút `lyDoNoiTra`, `lyDoThieuTen` — `kiemXuatBen` gọi ĐÚNG chỗ cũ (thứ tự lý do giữ không đổi), `kiemXep` gọi cho từng chặng được xếp → `canhBao` (kiểu `KetQuaXep = KetQuaKiem & { canhBao }`; không vào `chan` / `canPhaLe`, `ok` không đổi). THIEU_TEN theo cờ `requireManifest` như cổng. |
| | `src/modules/van-chuyen/dieu-phoi-lenh.ts`, `index.ts` | `lenhXep` trả `{ loi, canhBao }`; route `POST …/chuyen/:id/phan-bo` gắn `canhBaoXep` (vắng khi rỗng). `lenhDoi` (dời) không đổi hành vi. |
| | `src/shared/contracts.ts` | `ChuyenChiTietResponse.canhBaoXep?: LyDoGiuDto[]` (khoá riêng — `canhBao` đã là cảnh báo lịch chung). |
| | `web/dieu-phoi.ts` | `xong()` của hộp "Xếp vào chuyến" (cả đường phá lệ): có cảnh báo → dải VÀNG "Đã xếp N khách vào …" + "<lý do> — cần bổ sung ở đơn trước khi xe chạy." (+ dòng "Còn … ở cột Chưa xếp"); không có → dải xanh như cũ. `web/chuyen.ts` KHÔNG có lệnh xếp → không sửa. |
| (A) M7 | `src/shared/lich-su-mau-chang.ts` (+ test) | Câu "Cũ → mới", cột "Lúc" (dd/mm/yyyy hh:mm giờ VN), nhãn chip. |
| | `web/catalog.ts`, `public/app.css` | Chip chế độ (dòng bảng: dưới tên; thẻ: cạnh tên), nút "Đưa đón" ngay sau "Sửa giá" (chỉ khi `can(staff, "admin.manage")`), khung: ≥900px ở `#edit` (chỗ khung "Sửa giá"), hẹp hơn: bảng trượt `moBangTruot`. Thân POST luôn đủ ba khoá. Token mới `--w-dd-che-do`, `--w-dd-o` ở nhóm "Riêng"; khối CSS `/* Đưa đón — danh mục / điều phối */` cuối tệp. |
| Tài liệu mô tả | `docs/SYSTEM-DESIGN.md` §7 (2 dòng bảng route) | |
| Sổ hàng rào | `docs/SO-HANG-RAO.md` | Dòng "Cảnh báo sớm lúc xếp CÙNG NGHĨA cổng xuất bến". |
| Kịch bản | `docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/danh-muc-dua-don-smoke.mjs` (9 bước), `canh-bao-xep-smoke.mjs` (2 bước) | |
| Sửa kịch bản cũ | `docs/evidence/2026-09-29-adr-0049/kich-ban/dieu-phoi-smoke.mjs` bước 3–4 (dải xanh → dải vàng có câu nhắc — hành vi MỚI theo lời chủ); `dp-lib.mjs` tạo tài xế bằng tài khoản `chu` | `dp-lib` đỏ SẴN ở bước dựng dữ liệu (403 "Chỉ Hành chính nhân sự hoặc người phụ trách hệ thống được thêm tài khoản." — ADR-0071), không do việc này. |

## DỪNG vì thiếu dữ liệu API (không tự thêm trường hợp đồng)

- **Cột "Người đổi" của lịch sử M7**: `MauChangBanDto` không mang người ghi. CSDL CÓ (`vc_leg_template.created_by`), nên sửa chỉ ở DTO: thêm `createdBy: string | null` vào `MauChangBanDto` (khuôn `GET /api/catalog/:code/group-history` → màn ghép tên từ `GET /api/staff` như lịch sử nhóm). Chờ điều phối / chủ quyết. Hiện bảng lịch sử chỉ có "Lúc" · "Cũ → mới".
- **Số hiệu chuyến bay trên bảng điều phối (phần C)**: `ChangLichDto` (`GET /api/van-chuyen/lich`) không có `soHieuChuyenBay` → không làm. Thẻ chuyến tài xế (`web/cuoc-chuyen.ts`) DTO có sẵn, nhưng hàng khách vẽ bằng `veDiemChay` dùng chung với Chi tiết chuyến (bấm thay) và kịch bản bắt buộc `cuoc-smoke.mjs` (tài khoản tài xế, chờ > 2 phút) — phần C "không bắt buộc" nên KHÔNG làm lần này.

## Giả định bề mặt (đảo ngược được — chủ bác được)

| # | Bản vẽ không nói | Đã làm |
|---|---|---|
| G1 | Câu lịch sử khi chỉ đổi giờ về / bỏ giờ / đổi hay bỏ nơi trả / điểm đã ngưng / lưu y nguyên / tắt đưa đón | "Giờ về 16:30 → 17:00", "Giờ về 17:00", "Bỏ giờ về 16:30", "Nơi trả gợi ý A → B", "Bỏ nơi trả gợi ý A", "… (điểm đã ngưng dùng)", "Lưu lại, không đổi", "Hai chiều → Không đưa đón" (giờ / nơi trả mất theo, không nêu) — bài `src/shared/lich-su-mau-chang.test.ts` |
| G2 | Lịch sử trống | "Chưa có lần đổi nào." |
| G3 | Sau "Lưu bản mới" | Khung vẫn mở, lịch sử vẽ lại, dòng "Đã lưu bản mới." (chip dòng đổi ngay, không tải lại danh mục) |
| G4 | Nơi trả hiện hành là điểm ĐÃ NGƯNG | Ô hiện "Không gợi ý" + câu mờ "Nơi trả gợi ý đang là “X” — điểm này đã ngưng dùng. Chọn điểm khác hoặc để trống." (gửi id điểm ngưng sẽ 400) |
| G5 | Ô giờ dùng bàn phím số (iPhone không có ":") | Gõ "1630" / "930" → gửi "16:30" / "09:30"; chữ khác gửi nguyên để máy chủ báo câu của nó |
| G6 | Nhãn loại điểm trong ô nơi trả | `"<tên> · <tên loại viết thường>"` như bản vẽ ("Ga cáp treo Vinpearl · ga cáp treo") |
| G7 | Khổ 641–899px | Bảng trượt hiện dạng hộp giữa màn (khuôn `.sheet` có sẵn), cùng mốc 900px của bảng ↔ thẻ |
| G8 | Câu cảnh báo lúc xếp (bản vẽ chỉ có câu ở trang đơn, M3) | Dải vàng tiêu đề "Đã xếp N khách vào <mã chuyến>", mỗi dòng "<câu lý do giữ> — cần bổ sung ở đơn trước khi xe chạy." (câu lý do lấy từ `MA_GIU`, có mã đơn + số tên thiếu, không tên khách) |

## Lệch bản vẽ

- Bảng lịch sử máy tính THIẾU cột "Người đổi"; bản điện thoại thiếu "· <người>" sau giờ (xem DỪNG).
- Bảng danh mục 1040 giữ chữ 16px, cuộn ngang khi hẹp (bản vẽ ghi rõ "giữ 16px khi làm thật"); ba nút "Sửa giá / Đưa đón / Ẩn" nằm theo khuôn `.row-actions` có sẵn (bản vẽ xếp dọc chỉ để vừa khung vẽ).
- 390: ba thẻ chọn xếp dọc như bản vẽ; tiêu đề "Đưa đón: <tên>" (không mã) như bản vẽ.

## Hàng rào — quan sát chặn thật (P16)

- 2026-10-01: trong `kiemXep` đổi `lyDoThieuTen(c, v.chinhSach?.requireManifest ?? false)` thành `lyDoThieuTen(c, true)` → `node --test src/shared/dieu-phoi-kiem.test.ts`: `not ok 31 - kiemXep cảnh báo…`, `not ok 32 - MỘT luật hai nơi…` (31 pass / 2 fail) → hoàn nguyên → 33/33.
- 2026-10-01: trong `lyDoThieuTen` trừ thêm 1 ở vế số tên → 3 bài đỏ (31, 32, 33) → hoàn nguyên → 33/33.
- Đỏ trước xanh sau: bài mới của `dieu-phoi-kiem.test.ts` và `lich-su-mau-chang.test.ts` chạy đỏ (thiếu hàm / thiếu tệp) trước khi viết mã.

## Kiểm đã chạy (số liệu thật, máy của phiên)

- `npm run typecheck`: 0 lỗi.
- `npm test`: bộ chính 2435/2435 + bài đo giờ 1/1 (lần chạy cuối, sau phần A).
- `npm run build:web`: xanh.
- `npm run test:e2e -- catalog dieu-phoi van-chuyen pwa`: 5/5 xanh (144 giây; `dieu-phoi` có ca (1) `canhBaoXep` THIEU_TEN đúng mã đơn, không tên khách; ca (7) thiếu nơi trả → 200 + CHUA_CO_NOI_TRA, gửi lại cùng `requestId` → 200 không cảnh báo; `pwa` quét CSS sau dấu mốc PWA — khối mới chỉ token).
- Kịch bản Chrome:
  - `danh-muc-dua-don-smoke.mjs`: 9/9 (1040 Quản trị, 390 Quản trị + Toàn quyền, Bán hàng bị từ chối; axe quét khung mới 0 critical/serious). Ảnh `m7-1040-khung-dua-don.png`, `m7-390-the-dich-vu.png`, `m7-390-bang-truot.png`.
  - `canh-bao-xep-smoke.mjs`: 2/2 (390 + 1040). Ảnh `canh-bao-xep-390.png`, `canh-bao-xep-1040.png`.
  - Hồi quy theo bảng `web/CLAUDE.md`: `danh-muc-nhom-smoke.mjs` 10/10; `quyen-thieu-quan-tri-smoke.mjs` thoát 0 (tài khoản chỉ Toàn quyền vào `/catalog` không lỗi — chip đọc `GET /api/van-chuyen/mau-chang` qua cổng `orders`, SUPER_ADMIN có trong `ORDERS_GATE`); `dot-a-smoke.mjs` dich-vu 1040 + 390 (axe) xanh, đỏ SẴN ở `nhat-ky` (ADR-0038, ghi sẵn ở bảng); `dieu-phoi-smoke.mjs` 9 ✓ / 2 ✗ — hai bước đỏ là axe `color-contrast` ở `.sidebar-head > .brand > .brand-name > span` (chữ thương hiệu thanh bên). CHƯA so trên commit gốc 34db1b5c (ở gốc `dp-lib` không dựng được dữ liệu nên kịch bản không chạy tới đó) — chỉ SUY RA không do việc này vì `web/shell.ts` và khối CSS thanh bên không đổi. Bước 3–4 (xếp → dải cảnh báo) xanh.

- `npm run test:e2e` (TOÀN BỘ, vì đổi phản hồi route xếp): 36/36 xanh (639 giây). Lần chạy trước đó 27/34 đỏ do cả ba `wrangler dev` của bộ chạy chết giữa chừng (ECONNREFUSED / "other side closed" — máy đang chạy nhiều phiên khác); chạy lại không đổi mã → xanh.
- `trang-chu-smoke.mjs` (bảng `web/CLAUDE.md` dòng 61, 68): 11 ✓ rồi dừng ở axe `color-contrast` (1 nút) của **Trang chủ** — trang không bị việc này đụng; cùng kiểu lỗi chữ thương hiệu thanh bên như trên. Kịch bản bắt buộc `AXE_JS` nên không chạy được phần sau (đếm mục thanh bên) để đối chiếu. CHƯA so trên commit gốc — chỉ suy ra (khối CSS mới chỉ thêm lớp `.dd-*` và hai token).
- CHƯA chạy: `xe-smoke`, `danh-muc-giay-to-smoke`, `chinh-sach-dieu-phoi-smoke` (dòng 68 — đếm mục thanh bên; việc này chỉ đổi dải kết quả xếp); `chuyen-smoke` (giao diện không import `dieu-phoi-kiem`); các kịch bản điều phối khác vừa được `dp-lib` gỡ chặn (`chuyen-sua`, `rut-doi`, `cap-nhat-khach`, `goi-bao`, `cuoc-smoke`).

## Đề xuất cho tệp luật (KHÔNG tự sửa — N9)

Thêm hai dòng vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`:
- `web/catalog.ts` khung "Đưa đón", `src/shared/lich-su-mau-chang.ts`, khối `.dd-*` của `public/app.css` → `danh-muc-dua-don-smoke.mjs` ở `docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/` (9 bước, 1040 + 390) + `danh-muc-nhom-smoke.mjs` + `quyen-thieu-quan-tri-smoke.mjs`.
- Dải kết quả xếp của `web/dieu-phoi.ts` (`canhBaoXep`) → `canh-bao-xep-smoke.mjs` (2 bước, 390 + 1040) + `dieu-phoi-smoke.mjs`.

## Nợ / để người kiểm xem

- `canhBaoXep` không có ở lần gửi lại cùng `requestId` (lô không chạy lại) — chủ ý, có e2e.
- Vế "suất chưa tên − khoá rảnh" lúc xếp coi = 0; chứng minh bằng bài so 6 ca, không phải luật CSDL.
- `dp-lib.mjs` nay tạo tài xế bằng tài khoản Quản trị + Toàn quyền (`ACCOUNTS.chu`) — sửa để chạy lại được sau ADR-0071.
