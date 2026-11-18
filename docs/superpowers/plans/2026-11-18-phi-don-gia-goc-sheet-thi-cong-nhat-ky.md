# Nhật ký thi công — Phí đưa đón từ giá gốc Sheet (ADR-0218), Đợt 1

Kế hoạch: `2026-11-18-phi-don-gia-goc-sheet.md`. Nhánh `claude/redesign-pricing-subsystem-50496b`. Đợt 2 (Task 6–11) làm ngày 18/11 sau khi chủ xác nhận 28 ca sổ vàng — xem mục «Đợt 2» ở cuối.

## Việc đã làm (Đợt 1)
- Task 1: migration `0178_phi_don_gia_goc` (số 0178 kiểm còn trống 18/11 trên mọi nhánh); năm bảng + view, dictionary sinh lại. Bài `src/migrations-phi-don-gia-goc.test.ts`.
- Task 2: đồng bộ hai cột Sheet; `kePhiDonGoc`; `catalog/phi-don-goc-repo.ts` (nửa nghiêm); `giaGocPhiDon`, `dichVuDuaDonChuaCoGiaGoc` ở `catalog/index.ts`.
- Task 3: mức giảm theo cấp (`pricing/giam-phi-don-*`), khối ở `web/cap-dai-ly.ts` qua `web/giam-phi-don.ts`.
- Task 4: chương trình miễn phí (`pricing/chuong-trinh-phi-don-*`), khối ở `web/phi-don.ts` qua `web/chuong-trinh-phi-don.ts`.
- Task 5: công tắc biên nhận, danh sách dịch vụ chưa có giá, bảng tham chiếu (`cho-chon`).

## Lệch so với kế hoạch (mã thật thắng, bề mặt)
1. Migration 0178: kiến trúc (ADR-0003) đòi đủ cột kiểm toán ở bảng mới nên thêm `created_by/updated_at/updated_by` (giá gốc), `updated_at/updated_by` (chương trình, công tắc), bốn cột kiểm toán (phạm vi). Khoá chống trùng của bảng phạm vi là chỉ mục biểu thức `COALESCE` vì khoá chính có cột NULL không chặn trùng trong SQLite.
2. Bài migration dùng `node:sqlite` trực tiếp (khuôn `migrations-cong-tac-gio-don.test.ts`), không dùng `world()`.
3. `kePhiDonGoc` nhận `parse.phiDon` (không nhận cả `parse`); vấn đề trả theo dạng `VanDeDongBo` (`row`, `code?`, `message`); vấn đề «cột không còn» mang `row = 0` nên `web/catalog.ts` hiện không kèm «Dòng 0».
4. Mức giảm: kết thúc = đóng tới hết HÔM NAY; mức chưa tới ngày bắt đầu không kết thúc được (CSDL cấm đóng sớm hơn ngày bắt đầu, trả 400) — chỉ thay được bằng mức bắt đầu muộn hơn. GET trả thêm `cap` (cấp đang bật) và `doiDuoc`.
5. Chương trình: kết thúc ghi `ended_at` = lúc bấm, không nhận ngày; GET trả chương trình còn hiệu lực + đã kết thúc trong 30 ngày.
6. Bài chương trình ở Task 4 (đọc sổ vàng) bỏ qua ca không có đáp án lượt (GG-16, GG-19).
7. Bước «chạy thấy đỏ» của Task 5 chỉ làm gián tiếp (bài viết trước, mã chưa có nên đỏ do thiếu route/hàm); không chụp riêng dòng FAIL.
8. Số route trong `route-access.test.ts`: 565 → 574 (3 + 3 + 3).

## Nợ / chưa làm
- Kịch bản Chrome cho `web/cap-dai-ly.ts`, `web/phi-don.ts`, `web/account.ts`: xem báo cáo cuối về việc đã chạy hay chưa.
- Cập nhật `docs/gia/README.md` của kho tourdaovn (13 → 15 cột): kho khác, việc sau.
- Đợt 2 (Task 6–11): xem dưới.


# Đợt 2 (Task 6–11) — sinh tiền

Người thi công: trợ lý, 18/11. CHƯA có người kiểm độc lập (sẽ có). Không deploy, không push.

## Việc đã làm
- Task 6: migration `0179_phi_don_nguon_tinh` (số 0179 kiểm còn trống trên mọi nhánh; lớn nhất 0178). Bảy cột chụp vào `order_item`; ba trigger dòng phí tạo lại với nhánh nguồn mới; trigger đóng băng thêm bảy cột. Bài thêm vào `src/migrations-phi-don-chon.test.ts` (kể cả khoá trần 5.000.000 khớp `TRAN_MUC_PHI_DON`).
- Task 7: `pricing/phi-don-gia-goc-rules.ts` (`tinhPhiLuotDon`) + `tinhPhiDonGiaGoc` ở `pricing/index.ts`; bài chạy 19 ca sổ vàng có đáp án lượt (GG-16 và GG-19 phủ ở bài route).
- Task 8: nối vào mọi đường của `orders` (lập, lưu nháp, đổi bên đặt trên nháp, sửa chặng/chuyến nháp, đọc nháp, `/status`, Gửi xác nhận, Gửi đơn, Còn vé), `audit-checks` R-ORD-PD-1, khoá `doiPhi`, `client_outdated`.
- Task 9: giao diện «Đổi phí» ở biểu mẫu đơn và bảng Còn vé; `src/shared/phi-don-doi-phi-o.ts`.
- Task 10: `receipt/gop-phi-don.ts`; ảnh xác nhận in dòng trọn gói / khối «Đưa đón (phần Tour Đảo)».
- Task 11: tài liệu (SYSTEM-DESIGN §6 d5, CHANGE-GUIDE z42), bảng tham chiếu, câu nhắc Cấp độ đại lý, màn Phí đưa đón gọn.

## Lệch so với kế hoạch / phán đoán (mã thật thắng)
1. **Đỏ trước xanh chưa đủ ở Task 6, 7**: viết bài và mã gần như cùng lúc; đã bù bằng bài phá cố ý (bỏ nhánh `PER_TRIP` của trigger ⇒ bài đỏ; bỏ `max(0, …)` ⇒ bài đỏ; hoàn nguyên).
2. **Dịch vụ nhập tay có lượt đón ⇒ `O_TRONG`** (không có dòng giá gốc; đơn bị giữ; văn phòng «Đổi phí»). Phương án an toàn, đảo ngược được; chương trình «tất cả»/theo đối tác vẫn khớp. Hiện nhập tay đã tắt cho đơn mới nên chỉ ảnh hưởng nháp cũ.
3. **Nhật ký không ghi thay đổi chỉ do số khách** (so nguồn, đơn giá, chương trình, lý do — không so số lượng).
4. **Lý do đổi phí**: qua `maskLongDigits` trước khi vào nhật ký; DTO có `lyDoDoi` nhưng `datGapTheoVai` bỏ với người không có ô xem đặt gấp; DTO KHÔNG có người đổi.
5. **Đối tác gửi `phiDon` hoặc `doiPhi` ⇒ `transfer_fee_not_allowed` thắng `client_outdated`**; `client_outdated` chỉ cho người không giữ quyền Đối tác.
6. **Kiểu `DauVaoLuotDon`, `KetQuaLuot` đặt ở `src/shared/phi-don-gia-goc.ts`** (kiến trúc cấm `orders` import tệp của `pricing`).
7. **Ô giá gốc của dịch vụ theo nhóm / xe riêng**: xe riêng chụp mã cấp nhưng mức giảm 0 (khớp GG-08: `cap` C3, `muc_giam` 0).
8. **Màn Phí đưa đón không ẩn khỏi menu**: màn đó giữ ngày bắt đầu áp + chương trình + danh sách dịch vụ chưa có giá; chỉ bảng mức + Thử tra vào khối gập «luật cũ» (kế hoạch nói ẩn mục menu — làm vậy sẽ ẩn cả phần mới).
9. **Bảng tham chiếu không có trạng thái «ngưng»**: «Số khác», «Chưa chọn» giữ trạng thái cũ, giải nghĩa ghi «ĐÃ NGƯNG DÙNG cho đơn mới». Chữ mới khai `cho-chon`: «Đổi phí», «Lý do đổi phí», «Đổi cấp cũng đổi phí đưa đón…», «Câu báo của phí đưa đón do máy tính».
10. **Chưa xoá** `src/shared/phi-don-o-chon.ts`, `phi-don-chon.ts` và bài cũ của chúng, `phi-don-chon-smoke.mjs` (hồ sơ có ngày; không còn dùng ở đường đơn) — nợ dọn.
11. **PUT /booker nháp**: câu phí + tiền đứng TRƯỚC câu UPDATE, gác cùng mốc `expectedUpdatedAt`; không có câu «chốt thua» riêng (nếu câu UPDATE thua vì lý do khác mốc — hồ sơ bên đặt không còn — phí đã đổi mà bên đặt chưa đổi; xác suất rất thấp vì `resolveBooker` kiểm trước).
12. **Bài ADR-0214 chuyển nghĩa** (không xoá): `phi-don-don.test.ts` (viết lại), `phi-don-don-route.test.ts`, `phi-don-xac-nhan.test.ts`, `phi-don-chon-tien.test.ts`, `phi-don-doc-tien.test.ts` (sửa sau kiểm độc lập: `phiDon` → `doiPhi`, bật công tắc «Hiện riêng» ở `setup` để giữ bất biến dòng phí riêng trên biên nhận; không bài nào bị xoá hay nới), `cong-no-dai-ly.test.ts`, `phi-don-hien-thi.test.ts`, `order-confirmation.test.ts` (khối phí cần công tắc bật), `cap-dai-ly-hien-thi.test.ts`, e2e `phi-don-don`, `phi-don-xac-nhan`, `gui-don`, `xac-nhan-don`, `phi-don`, `lib-phi-don`. Bài mới: `phi-don-gia-goc-rules.test.ts`, `phi-don-gia-goc-route.test.ts`, `phi-don-doi-phi-o.test.ts`, `receipt/gop-phi-don.test.ts`, e2e `phi-don-gia-goc`, Chrome `phi-don-gia-goc-smoke.mjs`.
13. **Chạy Chrome không có `AXE_JS`**: bỏ kiểm màu (axe) — ghi trong tên bước.

## Nợ / chưa làm
- Người kiểm độc lập Đợt 2.
- Nhật ký thay đổi phát hành (bước A.0 của HANDOFF) và cập nhật `docs/HANDOFF-N1.md`: việc của lượt phát hành, chưa làm.
- `docs/gia/README.md` của tourdaovn (13 → 15 cột).
- Kiểm axe (màu) cho giao diện mới.

## Sửa sau kiểm độc lập Đợt 2 (18/11, KHÔNG ĐẠT ở 94ae001df)
- CAO-1: `src/phi-don-doc-tien.test.ts` chuyển `phiDon` → `doiPhi`; `setup` bật công tắc «Hiện riêng» để các bài canh dòng phí riêng trên biên nhận vẫn đúng; không bài nào xoá hay nới (17/17 xanh).
- CAO-2: bài hướng dẫn «Bật phí đưa đón trên đơn» được ĐỌC LẠI và viết lại theo màn mới (ngày áp, giá gốc Sheet, chương trình, Đổi phí, khối gập «luật cũ»); sau đó mới `npm run huong-dan:xem-lai -- phi-don`. Một lần bảng từ bắt «cấp đại lý» ⇒ sửa «cấp độ đại lý» (cả bài hướng dẫn, câu báo, bảng tham chiếu).
- VỪA-1: bài đếm khách cho dịch vụ nhóm `PAX(1,2,1,1)` ở `phi-don-don.test.ts` (phí trên 4 người, chiều về min(3,4)). Phá cố ý: (a) `soKhachTinhTien: s.pax.adult` ⇒ đỏ đúng bài mới (bốn bài cũ vẫn xanh — chứng tỏ trước đó có kẽ hở); (b) đếm theo lượt nhóm (kiểu `soKhachTinhHoaHong`, 1 lượt) ⇒ đỏ 5 bài gồm bài mới; hoàn nguyên, 11/11 xanh.
- VỪA-2: không sửa gọn được (điều kiện `BOOKER_VALUE` chỉ có ở câu UPDATE) ⇒ nợ có hạn 2027-02-28 ở mục «Việc còn treo / nợ» của `docs/HANDOFF-N1.md`.
- THẤP-1: Còn vé bỏ được số đã đổi: phần tử `{ legId, bo: true }` trong `doiPhi` ⇒ máy chủ tính lại (`chuanBiPhiDonXacNhan` nhận `null` = bỏ); nút «Bỏ đổi phí» hiện ở lượt đang mang số đổi (`web/xac-nhan-don-ui.ts`); bài route trong `phi-don-xac-nhan.test.ts` (không gửi gì ⇒ giữ; bo ⇒ giá gốc, nhật ký ghi cũ → mới; nhắc hai lần ⇒ 400). Chưa chạy lại kịch bản Chrome cho nút mới.
