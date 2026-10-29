# «Sửa» cho chính sách SẮP áp dụng + lịch sử «Đã huỷ» của hai loại gắn (ADR-0148 Đ1, phần N5) — Sổ điều phối thi công

- **Kế hoạch:** `docs/superpowers/plans/2026-10-29-sua-muc-n5-ke-hoach.md` (R1–R4, tiêu chí 1–5, Task 1–7). Nguồn: ADR-0148 Đ1 tiêu chí 1; sổ lượt 1 `2026-10-29-sua-muc-luot-1-thi-cong-nhat-ky.md` mục N5, NO-4, NO-6.
- **Phiên thi công:** nhánh `claude/sua-muc-n5-bcfa1e` (worktree `recursing-kilby-af8ebc`), cắt từ nhánh có commit kế hoạch eb7607c8. Vai: THI CÔNG, không tự nghiệm thu (Task 7 = người kiểm độc lập chỉ đọc).
- **Nền:** đầu phiên `main` = `origin/main` = 10db5cb5 đã có bản 2.45 tạm + migration 0127 (ADR-0149 đưa đón theo dịch vụ). Nhập main vào nhánh bằng công cụ đồng bộ của ứng dụng (commit 327ac5cf, không xung đột) TRƯỚC khi sửa ⇒ nhánh dựng trên main mới nhất.
- **Số đã lấy:** mục nhật ký **2.46 tạm** (main 2.45). **Không migration.** Đổi mã máy chủ (trường `ganRieng` của khối hồ sơ) + giao diện ⇒ sau `day-len` cần `npm run trien-khai`.
- **Xây trên lỗ đang hở:** không (theo kế hoạch; `docs/quyen-hoan.json` không mục nào chạm `pricing`).

## Task 1 — Máy chủ, R4 (xong, commit 752f7b26)
- Câu LỊCH SỬ mới `party_tiers_history` (`pricing/repository.ts`, `defineSql`, EXPLAIN qua `architecture.test.ts`): mọi lần gắn riêng của một hồ sơ, kể cả đã huỷ, `ORDER BY valid_from_date DESC, (voided_at IS NOT NULL), created_at DESC, id`. Câu tra `party_tiers_of` giữ nguyên.
- `HoaHongHoSoResponse.ganRieng: GanRiengLichSuDto[]` (`src/shared/contracts.ts`): `id, muc {code, ten, dangBat}, tuNgay, denNgay, conHieuLuc, daHuy, thayCho, lyDoSua` — không SĐT/email/MST. `conHieuLuc` = chưa huỷ và trong khoảng ngày (cùng công thức `dtoGan`). `mucRieng`, route, cổng, quyền không đổi. Ba lệnh ghi gắn riêng (gắn, kết thúc, sửa) trả khối qua cùng hàm nên cũng mang lịch sử.
- Bài đỏ trước: bài mới «N5 (R4)…» (đã ngừng + đang áp + sắp áp ⇒ sửa lần sắp áp ⇒ lịch sử bốn dòng đúng thứ tự, đúng cờ, đúng tập trường; `mucRieng` không đổi; thử tra hôm nay / 01/11). Bài cũ «gắn đối tác huỷ–thay sang ngày sau…» viết lại (khối nay có lịch sử nên không thể «không nhắc gắn huỷ» trên cả phản hồi): `mucRieng` null, `vai` theo TA1, phần tra của khối (mọi trường trừ `ganRieng`) không nhắc gắn huỷ, lịch sử có gắn huỷ mang cờ. Đỏ 2/2 trước khi có trường; xanh 14/14 sau.
- Quan sát chặn thật (P16, 29/10): (1) câu tra `party_tiers_of` bỏ `voided_at IS NULL` ⇒ bài viết lại đỏ; (2) câu lịch sử thêm `voided_at IS NULL` ⇒ cả hai bài đỏ; hoàn nguyên ⇒ xanh 14/14. (3) gỡ vế `(voided_at IS NOT NULL)` khỏi thứ tự ⇒ bài vẫn XANH (xem NO-N5-2).
- `docs/SYSTEM-DESIGN.md` §7: một câu mô tả trường mới. `docs/SO-HANG-RAO.md`: một dòng mới.

## Task 2 — Luật hiển thị thuần (xong, commit 25764f6a)
- `chiaLanGan(ds, homNay)` (`src/shared/hoa-hong-hien-thi.ts`): đang áp (thứ tự máy chủ) / sắp áp (ngày bắt đầu sớm trước) / lịch sử = đã ngừng + đã huỷ (mới → cũ, trùng ngày giữ thứ tự máy chủ), theo `trangThaiDong`. `nhanSapAp` «Sắp áp dụng từ <ngày>[ đến <ngày>]»; `nhanNutLichSu` «Xem lịch sử (n)» / «Ẩn lịch sử».
- Bài thuần cạnh tệp (2 bài, đỏ trước rồi xanh 29/29): lịch sử ≡ phần `conApHoacSap` loại bỏ (một khuôn với bảng dòng mức); chữ nút bật không trùng chữ đầu nút ghi mà kịch bản Chrome đếm.

## Task 3 — Giao diện (xong, commit 64ab5c04)
- `web/hoa-hong-lich-su.ts` (mới, nhỏ): `huyHieuTrangThai` (dời từ `hoa-hong-bang.ts`, bảng dòng mức dùng lại) + `khoiLichSuGan` (nút bật `aria-expanded`/`aria-controls` + danh sách ẩn, chỉ nhãn trạng thái, không nút, không lý do).
- `web/hoa-hong-thiet-lap.ts` (R1, R2): dưới mỗi chính sách, `lanApDung` = lần đang áp (Ngừng cho người ghi; Sửa theo `coQuyenSua` + `nutSua`), lần sắp áp (huy hiệu «Sắp áp dụng từ …», chỉ Sửa), rồi «Xem lịch sử (n)». Vẫn đứng dưới thanh nút như bố cục cũ.
- `web/parties.ts` (R3): danh sách «Chính sách riêng: <tên> · Sắp áp dụng từ …» kèm «Sửa» (cùng hộp Sửa `moSua` của lần đang áp — kiểu tham số nới thành `Pick<GanRiengLichSuDto, …>`), nằm NGOÀI `.actions`; lịch sử sau nút cùng kiểu. Lần đang áp và nút của nó giữ nguyên (đọc `mucRieng`).
- `public/app.css`: hai dòng cho `.hh-lich-su-khoi` (chỉ token).
- Kiểm riêng (không phải bộ kiểm dài): `npm run build:web`; 31 tệp bài quét giao diện (gồm `goi-trang-nhe` — trần gói trang, `giao-dien-hoi-bang-quyen`, `hoa-hong-mot-nguon`) xanh 169/169; `tsc -p web` 0 lỗi.

## Task 4–5 — Kịch bản Chrome, nhật ký, tài liệu (xong phần viết, commit c97d2caf)
- `hoa-hong-smoke.mjs`: bước 13 (Thiết lập, lần áp dụng chính sách sắp tới → Sửa → lịch sử «Đã huỷ…»), bước 14 (Danh bạ, chính sách riêng sắp áp → Sửa → lịch sử), câu kiểm thêm ở bước 7 (Bán hàng thấy lần sắp áp, không nút). Ảnh vào thư mục mới `docs/evidence/2026-10-29-sua-muc-n5/anh/` (`OUT=`).
- Nhật ký thay đổi mục **2.46 tạm** (hai dòng lời thường; dòng đầu từng dài 203 ký tự ⇒ `changelog.test.ts` đỏ ⇒ tách đôi), `app-info.test.ts` theo 2.46. `docs/CHANGE-GUIDE.md` z15 thêm một câu (một hàm `chiaLanGan` cho hai màn; lần đang áp đọc từ câu tra, không dựng từ lịch sử).
- e2e `tests/e2e/sua-muc.mjs` bước 4: phản hồi «Sửa» chính sách riêng có lịch sử (lần thay rồi lần huỷ), `mucRieng` không bao giờ là lần huỷ.

## Quyết định thi công tự áp (bề mặt / an toàn, ghi lại để chủ biết)
- **T5-1 (lệch chữ kế hoạch, giữ quyền như cũ):** tiêu chí 4 viết «Đối tác / Bán hàng gọi route khối hồ sơ vẫn 403». Sự thật trên main: Bán hàng có ô `partner.commission.view` và route khối hồ sơ trả **200** cho Bán hàng (bài `ho-so-hoa-hong.test.ts` ghim: Bán hàng, Kế toán, Quản trị, Toàn quyền ⇒ 200; HDV, Nhân sự, Đối tác, tài khoản lai ⇒ 403). Làm theo R4 «quyền không đổi»: không đổi cổng ⇒ Bán hàng nay đọc được thêm `ganRieng` (mã, tên chính sách, ngày, lý do sửa) — cùng loại dữ liệu Bán hàng đã đọc được ở `/api/pricing/muc-ta` (lý do sửa của dòng mức và gắn loại). Báo phiên điều phối; muốn Bán hàng không thấy lý do sửa của gắn riêng thì là quyết định mới.
- **T5-2 (R2):** kế hoạch trỏ bộ lọc `loc.chiConHieuLuc` của bảng dòng mức, nhưng thẻ «Thiết lập» không có ô lọc đó ⇒ dùng nút bật riêng mỗi chính sách («Xem lịch sử (n)», cùng kiểu R3). Cùng khuôn ở chỗ quan trọng: tập lịch sử ≡ phần `conApHoacSap` loại bỏ (bài thuần), nhãn `trangThaiDong` / `NHAN_TRANG_THAI`, không nút, không lý do.
- **T5-3 (R1, tiêu chí 1):** danh sách lần áp dụng dưới mỗi chính sách trước chỉ dựng cho người ghi; nay dựng cho mọi người xem được trang (nút vẫn theo quyền) ⇒ Bán hàng thấy thêm cả lần ĐANG áp dưới chính sách (trước chỉ thấy dòng tóm tắt «Đang áp dụng cho n loại: …»).
- **T5-4:** lần sắp áp ở Danh bạ chỉ có «Sửa», không «Ngừng» (cùng luật «chưa tới ngày» của `nutDoiNgung`). Mục «Loại đối tác được hưởng hoa hồng» ở Thiết lập vẫn chỉ nêu chính sách đang áp của loại (R1 nói «dưới mỗi mức»).
- **T5-5:** câu lịch sử xếp lần chưa huỷ trước lần bị huỷ khi trùng ngày bắt đầu (huỷ–thay giữ ngày cũ) — để bài chạy dưới đồng hồ giả cho kết quả cố định; ngoài thử nghiệm giờ tạo đã quyết định thứ tự.

## Nợ có tên (không sửa trong việc này)
- **NO-N5-1:** đại lý chỉ có chính sách riêng SẮP áp (chưa có lần đang áp) vẫn hiện nút «Áp dụng chính sách riêng» như hôm nay (R3 giữ nút); gắn thêm từ hôm nay không thời hạn sẽ chồng ngày với lần sắp áp ⇒ máy chủ từ chối bằng câu tiếng Việt (409 «đã có một mức riêng trong khoảng ngày này»). Không sai dữ liệu, chỉ thừa một đường bấm.
- **NO-N5-2:** thứ tự «lần thay trước lần bị huỷ cùng ngày» không có hàng rào chắc (P16 lần 3 không đỏ) — dựa vào kỷ luật; đã ghi ở `docs/SO-HANG-RAO.md`.
- **NO-N5-3:** chỉ chạy kịch bản Chrome `hoa-hong-smoke.mjs` (bước 12, 14 phủ khối Hoa hồng của `web/parties.ts`). Các kịch bản khác của `web/parties.ts` trong bảng `web/CLAUDE.md` (Danh bạ t2b, Đợt A, Giấy tờ, Nhà xe) phủ các mục KHÁC của trang, không chạy lại.

## Bộ kiểm dài (chạy một lần ở cuối, 29/10, cây 2266c93b)
- `npm run typecheck`: 0 lỗi (server, `web/`, `web/sw/`).
- `npm test`: **xanh** — bước 1: 6631 bài, 6627 đạt, 0 đỏ, 4 todo; bước 2 (bài đo giờ hook, chạy một mình) đạt; thoát 0.
- `npm run test:e2e`: **78/78 kịch bản xanh** (885 giây), gồm `sua-muc` (câu kiểm mới về lịch sử gắn riêng), `muc-ta`, `so-dai-ly`, `audit-invariants` cuối.
- Kịch bản Chrome `hoa-hong-smoke.mjs` (`AXE_JS` = axe-core 4.13.0, `OUT=docs/evidence/2026-10-29-sua-muc-n5/anh`): **HOA HONG SMOKE OK** ngay lần đầu — 33 bước ở hai khổ 390 + 1040 (gồm 13, 14 mới và câu kiểm mới ở bước 7); axe nhẹ chỉ có «region — #strips» (moderate, có từ trước). Người thi công tự xem ảnh 25 (1040) và 27 (390): lần sắp áp + một nút «Sửa», lịch sử mở ra có nhãn xám «Đã huỷ — thay bằng dòng khác», không nút.
- Ảnh: chỉ lưu 10 ảnh của phần N5 (bước 13, 14: tệp `23-…` tới `27-…`, 4,8 MB); 47 ảnh còn lại trùng nội dung bằng chứng lượt 1 (`docs/evidence/2026-10-29-sua-muc/anh/`) nên không lưu.
- Production lúc kiểm (GET công khai `/api/auth/config`, 29/10): bản **2.44**, đang bật bảo trì tới 31/10 ⇒ bản 2.45 (ADR-0149, migration 0127) đã ở main nhưng CHƯA triển khai; `npm run trien-khai` sau khi nhập nhánh này sẽ mang cả 2.45 (có migration 0127) lẫn 2.46.

## Ghi chú bề mặt (không sửa, để chủ xem ảnh)
- **NO-N5-4:** dòng tóm tắt đầu thẻ chính sách vẫn nói «Chưa áp dụng cho loại nào» khi chính sách chỉ có lần áp dụng SẮP tới (dòng sắp áp hiện ngay bên dưới, ảnh 23/25). Đúng nghĩa «hôm nay», nhưng có thể thêm «· sắp áp dụng cho n loại» nếu chủ muốn.
