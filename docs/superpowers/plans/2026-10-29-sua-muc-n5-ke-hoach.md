# «Sửa» cho chính sách SẮP áp dụng + lịch sử «Đã huỷ» của hai loại gắn (ADR-0148 Đ1, phần N5) — Kế hoạch thi công

- **Nguồn:** ADR-0148 (accepted 29/10) tiêu chí 1 «dòng cũ còn trong lịch sử, ghi "đã huỷ"»; kế hoạch lượt 1 `2026-10-29-sua-muc-luot-1-ke-hoach.md` Task 5; sổ thi công lượt 1 mục N5, NO-4, NO-6. Chủ 29/10 bấm «Làm ngay» sau khi nghiệm thu bản 2.44.
- **Vai:** phiên này (kế hoạch + nghiệm thu) soạn; thi công ở PHIÊN RIÊNG (P15/N8); người kiểm độc lập chỉ đọc trước khi giao.
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` 29/10 không mục nào chạm `pricing`).

## Sự thật đã kiểm khi soạn (main 041e129a)
1. **Gắn loại:** `GET /api/pricing/muc-ta` ⇒ `docMucTa` đọc `roleTiersAll` ⇒ `MucTaDto.gan` ĐÃ có mọi lần gắn (đang áp, sắp áp, đã ngừng, đã huỷ — `daHuy`, `thayCho`, `lyDoSua`). Màn «Mức TA» (`web/hoa-hong-thiet-lap.ts`, `dangAp = m.gan.filter((g) => g.conHieuLuc)`) chỉ hiện lần đang áp ⇒ lần sắp áp không có «Sửa» (NO-6), lần đã huỷ không xem được. **Chỉ là việc giao diện.**
2. **Gắn riêng (đối tác):** `GET /api/pricing/ho-so/:id/hoa-hong` ⇒ `hoaHongHoSo` trả `mucRieng` = MỘT lần gắn đang áp hôm nay; câu `GAN_RIENG_HO_SO` (`party_tiers_of`) lọc `voided_at IS NULL` (câu tra). Khối hồ sơ Danh bạ (`web/parties.ts`) chỉ có «Sửa»/«Ngừng» cho lần đang áp ⇒ lần sắp áp không sửa được ở đâu, lần đã huỷ không xem được (NO-4). **Cần thêm dữ liệu từ máy chủ.**
3. `nutSua(d, homNay)` (`src/shared/hoa-hong-hien-thi.ts`) đã cho «Sửa» với dòng chưa tới ngày; `trangThaiDong` đã có `DA_HUY` / «Đã ngừng» / «Sắp áp dụng»; route Sửa của cả hai loại gắn đã nhận dòng sắp áp (bài `sua-muc-route.test.ts`).
4. Không cần migration. Nhánh `claude/service-group-pickup-setup-ae4465` đang giữ phiên bản tạm **2.45** + migration 0127 ⇒ mục nhật ký của việc này lấy **2.46 tạm** (kiểm lại lúc thi công).

## Quyết định người soạn tự áp (bề mặt, đảo ngược được — ghi để chủ biết)
- **R1 Màn «Mức TA»:** dưới mỗi mức, sau các lần gắn đang áp, hiện lần gắn **sắp áp** với nhãn «Sắp áp dụng từ <ngày>» và nút «Sửa áp dụng chính sách» (theo `coQuyenSua` + `nutSua`, dùng lại `nutSuaGan`). «Đổi»/«Ngừng» giữ đúng luật `nutDoiNgung` hiện có (không mở thêm).
- **R2 Lịch sử gắn loại:** mặc định ẩn lần đã ngừng / đã huỷ, bật xem theo **đúng khuôn bảng dòng mức** (bộ lọc `loc.chiConHieuLuc` + `conApHoacSap` ở `web/hoa-hong-bang.ts`; nhãn trạng thái `trangThaiDong` / `NHAN_TRANG_THAI`, không nút). Bảng dòng mức hôm nay KHÔNG hiện lý do sửa ⇒ lịch sử gắn cũng không (giữ một khuôn; lý do vẫn nằm trong CSDL).
- **R3 Gắn riêng ở hồ sơ Danh bạ:** khối «Hoa hồng» liệt kê mọi lần gắn riêng của hồ sơ: đang áp (giữ nút như hôm nay), sắp áp (nút «Sửa»), và lịch sử (đã ngừng, đã huỷ) ẩn sau cùng kiểu nút bật như R2.
- **R4 Hợp đồng máy chủ (thêm, không đổi):** `HoaHongHoSoResponse` thêm trường `ganRieng: GanRiengLichSuDto[]` (mọi lần gắn của hồ sơ, kể cả đã huỷ, xếp mới → cũ): `id, muc {code, ten, dangBat}, tuNgay, denNgay, conHieuLuc, daHuy, thayCho, lyDoSua`. Chỉ mã, tên mức, ngày, lý do — **không** SĐT/email/MST. Câu SQL mới `party_tiers_history` (`defineSql`, câu tĩnh, có EXPLAIN như mọi câu `pricing`); `mucRieng` và mọi câu **tra** giữ nguyên (dòng huỷ vẫn không bao giờ được tra ra). Route, cổng, quyền **không đổi** (`office` + `partner.commission.view` + `holdsPartner` ⇒ 403).

## Tiêu chí nghiệm thu
1. Gắn loại bắt đầu từ ngày mai trở đi hiện dưới mức của nó, nhãn «Sắp áp dụng từ …»; người có `partner.commission.write` thấy «Sửa» và sửa được (huỷ–thay); người chỉ xem thấy dòng, không nút.
2. Mặc định không thấy lần gắn đã ngừng / đã huỷ; bật xem thì thấy đủ, nhãn đúng, không nút nào.
3. Hồ sơ đối tác có gắn riêng sắp áp: khối Hoa hồng hiện nó kèm «Sửa», sửa được; sau khi sửa, lần cũ hiện «Đã huỷ — thay bằng dòng khác» trong lịch sử, lần mới hiện «Sắp áp dụng».
4. Quyền và dữ liệu không đổi: không route mới, không migration; Đối tác / Bán hàng gọi route khối hồ sơ vẫn 403; bài ảnh chụp mức truy cập không đổi số; dòng đã huỷ vẫn không ra ở thử tra, bản chụp, `mucRieng`.
5. Trần gói trang (`src/goi-trang-nhe.test.ts`) không nới; ô gõ 16px, không `innerHTML`, chữ tiếng Việt có dấu.

## Task
1. **Máy chủ (R4):** bài đỏ trước ở `sua-muc-route.test.ts` (hoặc tệp bài mới cạnh): hồ sơ có gắn đang áp + sắp áp + đã huỷ ⇒ `ganRieng` có đủ ba, đúng cờ; `mucRieng` không đổi. Câu SQL + DTO + `docs/SYSTEM-DESIGN.md` §7 (một dòng mô tả trường mới).
2. **Luật hiển thị thuần** (`src/shared/hoa-hong-hien-thi.ts`): hàm chia lần gắn thành «đang áp / sắp áp / lịch sử» dùng chung cho R1–R3, bài thuần cạnh tệp.
3. **Giao diện:** `web/hoa-hong-thiet-lap.ts` (R1, R2), `web/parties.ts` (R3); theo `web/CLAUDE.md`.
4. **Kịch bản Chrome** `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs`: thêm bước gắn loại sắp áp → Sửa; hồ sơ gắn riêng sắp áp → Sửa → xem lịch sử; hai khổ + axe (`AXE_JS`); ảnh vào thư mục bằng chứng **mới** có ngày.
5. **Nhật ký thay đổi** mục mới **2.46 tạm** (một dòng lời thường), `app-info.test.ts` theo số mới; `docs/CHANGE-GUIDE.md` z15 thêm một câu.
6. **Bộ kiểm dài, MỘT lần ở cuối:** `npm test`, `npm run typecheck`, `npm run test:e2e` (chạm API), kịch bản Chrome. Đỏ thì nêu tên bài.
7. **Người kiểm độc lập** (subagent `nguoi-kiem-doc-lap`, chỉ đọc): đối từng tiêu chí 1–5 + R4 (không lộ dòng huỷ ở câu tra, không trường nhạy cảm, quyền không đổi).

## Không thuộc kế hoạch
Lượt 2 ADR-0148 (Đ2 «Giá đại lý», Đ3) — chờ ca mẫu Kế toán. NO-1 (điều khoản nhà cung cấp), NO-5 (hộp «Ngừng» cho chọn ngày quá sớm), G1, G4.
