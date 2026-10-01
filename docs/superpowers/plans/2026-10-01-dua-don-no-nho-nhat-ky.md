# Nhật ký thi công — nợ nhỏ Đưa đón + Hành khách (2026-10-01)

> Nguồn việc: mục "Kết quả" / "Nợ nhỏ" của `docs/superpowers/plans/2026-10-01-giao-dien-dua-don-hanh-khach.md` + hai nhật ký `…-giao-dien-dua-don-hanh-khach-nhat-ky.md` (PM-1, PM-2, R5) và `…-danh-muc-dua-don-canh-bao-xep-nhat-ky.md` (DỪNG "Người đổi", số hiệu chuyến bay). Vai: NGƯỜI THI CÔNG — không tự nghiệm thu (N8).
> Nhánh `worktree-agent-ad7b464c665c3ee02`, gốc `f0ed3ff3` (= `origin/main` lúc bắt đầu, đã có bản 1.62). Không thêm mục nhật ký phiên bản (điều phối thêm lúc gộp). Không migration.

## Việc và bằng chứng đỏ trước / xanh sau

| # | Việc | Tệp chính | Đỏ trước → xanh sau |
|---|---|---|---|
| 1 | **PM-2** — `GET /passengers` theo thứ tự nhập | `src/modules/orders/chang-hanh-khach-repo.ts` (`ORDER BY order_id, created_at, rowid` thay `…, id`) | Bài mới "PM-2: …" ở `src/modules/orders/hanh-khach-route.test.ts` (nháp 8 người; lưu nháp đảo thứ tự; sau xác nhận sửa tên người đầu vẫn đứng đầu, thêm 2 người đứng cuối): `not ok 1` trước sửa → 8/8 tệp xanh sau |
| 2 | **PM-1** — `PUT /api/orders/:id` mốc cũ → 409 `stale` trước khi kiểm thân | `src/modules/orders/index.ts` (so `expectedUpdatedAt` với `meta.updatedAt` NGAY SAU các cổng quyền — `order.modify`, đã giao, không nháp, `order.passenger.write` — TRƯỚC `validateOrder`) | Bài "PM-1: …" ở `src/modules/orders/luu-nhap-chang.test.ts`: `expected: 409, actual: 400` trước → 9/9 sau. Bài "400: chặng id không thuộc dịch vụ…" (mốc ĐÚNG) vẫn 400 — luật khác không đổi |
| 3 | Số hiệu chuyến bay trên bảng điều phối + thẻ chuyến tài xế | `src/shared/contracts.ts` (`ChangLichDto.soHieuChuyenBay`), `src/modules/van-chuyen/dieu-phoi-dto.ts`, `web/dieu-phoi.ts` (chip `✈︎ VN1553` sau chip trạng thái + nhãn đọc màn hình), `src/shared/tien-do-man.ts` (`soHieuTaiDiemDon`), `web/cuoc-chuyen.ts` (`bayCua` — cả trước xuất bến lẫn lúc chạy), khối `.dp-run-bay` của `public/app.css` | Bài khoá danh sách trắng mới "GET /lich: chặng có ĐÚNG các khoá…" ở `src/modules/van-chuyen/dieu-phoi.test.ts` đỏ (thiếu khoá) → xanh; bài `soHieuTaiDiemDon` ở `src/shared/tien-do-man.test.ts` đỏ (không có hàm) → xanh. `lichChungChang` của orders ĐÃ có `soHieuChuyenBay` (không đổi orders); DTO tài xế đã có khoá trên suất (không đổi máy chủ phía tài xế) |
| 4 | Cột "Người đổi" ở lịch sử mẫu chặng (M7) | `src/modules/van-chuyen/repository.ts` (`COT_MAU` thêm `t.created_by`), `src/modules/van-chuyen/index.ts` (`createdBy` trong `lichSuMauChang`), `src/shared/contracts.ts` (`MauChangBanDto.createdBy`), `src/shared/lich-su-nhom.ts` (tách `tenNguoiGhi` dùng chung), `src/shared/lich-su-mau-chang.ts` (`dongLichSuMauChang(lichSu, tenNguoi)` → `{ luc, ai, doi }`), `web/catalog.ts` (bảng máy tính ba cột "Lúc · Người đổi · Cũ → mới"; điện thoại "Lúc · Người"), `.dd-ai` | Bài "lịch sử mẫu: mỗi bản ĐÚNG các khoá…" ở `src/modules/van-chuyen/mau-chang.test.ts` đỏ → xanh; bài "cột Người đổi" ở `src/shared/lich-su-mau-chang.test.ts` đỏ → xanh. Route form `GET /api/van-chuyen/mau-chang` vẫn ĐÚNG ba khoá (TC-M3 + e2e) |
| 5 | Danh mục hiện đơn vị bằng chữ người đọc | `web/catalog.ts` (cột "Đơn vị" bảng + dòng "mã · đơn vị" của thẻ dùng `unitLabel` có sẵn ở `src/shared/service-form.ts` — "theo người", "theo nhóm 5 khách/lượt"; KHÔNG đặt chữ mới) | Bài quét mới `src/danh-muc-don-vi-web.test.ts` đỏ (`it.unit hiện thô … h("td", { class: "muted" }, it.unit)`) → xanh. Câu "Đơn vị … chưa hỗ trợ" giữ chữ Sheet có chủ ý (không có nhãn) |
| 6 | E2E riêng mẫu chặng | `tests/e2e/mau-chang.mjs` (khai ở `tests/e2e/run.mjs` sau `catalog`, trước `maintenance`; mã dịch vụ riêng `ZMC1`) | Viết SAU khi việc 4 xong (không có lần đỏ tự nhiên) — quan sát chặn: xem mục "Hàng rào" |
| 7 | Nhắc "Còn N khách chưa có tên" khi tắt `requireManifest` | `docs/SYSTEM-DESIGN.md` §6(k) — một gạch đầu dòng (không đổi hành vi) | — (tài liệu mô tả). Cùng lần: mô tả PM-1, PM-2 ở §6(k), `createdBy` ở dòng route §7, `soHieuChuyenBay` ở dòng `GET /lich` §7 |

## Giả định bề mặt (đảo ngược được — chủ bác được)

| # | Điều | Đã làm |
|---|---|---|
| G1 | Chỗ hiện số hiệu trên thẻ tài xế | CHỈ dưới **điểm đón** (số hiệu của các suất LÊN xe ở điểm đó, không trùng), cả trước xuất bến (`veDiemTruoc`) lẫn lúc chạy; điểm trả không hiện. Chip thẳng cột với tên nơi |
| G2 | Chỗ chip trên thẻ chặng bảng điều phối | Hàng đầu thẻ, SAU các chip trạng thái; nhãn đọc màn hình của nút thêm ", chuyến bay VN1553" |
| G3 | Không tải được danh sách tài khoản (`GET /api/staff`) | Cột "Người đổi" hiện "Người dùng cũ" (cùng luật lịch sử nhóm); `null` → "Hệ thống" |
| G4 | Thứ tự khách khi trùng `created_at` | Theo `rowid` (thứ tự câu INSERT trong lô). VACUUM có thể đánh số lại `rowid` nhưng giữ thứ tự tương đối; `created_at` vẫn đứng trước nên không lệ thuộc riêng `rowid` |
| G5 | PM-1: thân thiếu `expectedUpdatedAt` | Giữ 400 cũ (kiểm sớm chỉ chạy khi có chuỗi khác rỗng); mốc cũ mà thân còn lỗi khác → nay 409 `stale` (trước là 400) — form bảo tải lại, đúng hướng |

## Lệch / ghi chú giao diện

- 1040 Danh mục: "theo nhóm 5 khách/lượt" xuống ba dòng trong cột "Đơn vị" (bảng vốn cuộn ngang) — không sửa lần này.

## Hàng rào — quan sát chặn thật (P16)

- 2026-10-01 (sau khi xanh): bỏ `soHieuChuyenBay` khỏi `changLichDto` → `not ok 1 - GET /lich: chặng có ĐÚNG các khoá…` (`- 'soHieuChuyenBay'`); thêm `khoaNoiDon: c.khoaNoiDon` → `not ok 1` (`+ 'khoaNoiDon'`); hoàn nguyên → xanh, `git diff --quiet` sạch.
- Thêm `nguoiGhiSdt: null` vào bản mẫu → `not ok 1 - lịch sử mẫu: mỗi bản ĐÚNG các khoá…` (`+ 'nguoiGhiSdt'`); hoàn nguyên → xanh, sạch.
- Đổi ô "Đơn vị" về `it.unit` → `not ok 1 - web/catalog.ts: mọi chỗ hiện it.unit…`; hoàn nguyên → xanh, sạch.
- Ba dòng mới ở `docs/SO-HANG-RAO.md`.
- E2E `mau-chang`: xem "Kiểm đã chạy".

## Kiểm đã chạy (số liệu thật — điền ở cuối phiên)

(xem mục cuối)

## Đề xuất cho tệp luật (KHÔNG tự sửa — N9)

Thêm vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`:
- Chip số hiệu chuyến bay của thẻ chặng `web/dieu-phoi.ts`, `bayCua` của `web/cuoc-chuyen.ts`, `soHieuTaiDiemDon` của `src/shared/tien-do-man.ts`, khối `.dp-run-bay` → `so-hieu-chuyen-bay-smoke.mjs` ở `docs/evidence/2026-10-01-dua-don-hanh-khach/kich-ban/` (3 bước, 390 + 1040 + tài xế 390, không cần mạng ngoài) + `dieu-phoi-smoke.mjs` + `cuoc-smoke.mjs`.
- Cột "Người đổi" / đơn vị của `web/catalog.ts` → `danh-muc-dua-don-smoke.mjs` (đã cập nhật) + bài `src/danh-muc-don-vi-web.test.ts`.
