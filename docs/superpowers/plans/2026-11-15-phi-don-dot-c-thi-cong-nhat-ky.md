# Nhật ký thi công — Phí đưa đón, Đợt C (đưa phí vào đơn)

Kế hoạch: `docs/superpowers/plans/2026-11-15-phi-don-dot-c.md`. Nguồn luật: ADR-0147 (Đ3), ADR-0203 (ĐB2, ĐB3), trang ghép `docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md`, thiết kế `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md` §5 §7, sổ vàng `golden/phi-dua-don.json`. Nhánh `claude/jolly-kepler-fffdb4` (worktree `two-factor-auth-expiry-328f96`). Ghi 15/11/2026 (người thi công Task 6). Nhật ký Đợt A + B: `docs/superpowers/plans/2026-11-14-phi-don-thi-cong-nhat-ky.md`.

Ba câu chủ đã chốt 15/11 («chốt theo đề xuất»): (1) giảm giá của đơn không trừ vào phí, trần giảm giá = tổng tiền dịch vụ (ca SV-PD-29); (2) trần một mức phí 5.000.000 đ; (3) dòng 0 đồng in «Miễn phí», phí của đơn nháp ghi «dự kiến».

## Số migration thật
- `0169_phi_don_tren_don.sql` (Task 1). Kiểm 15/11: `main` lớn nhất `0166`; `0167`–`0168` thuộc nhánh đăng ký tài khoản chưa gộp. Nhánh nào gộp trước thì kiểm lại số.

## Mỗi task đã làm gì (commit)
- **Task 1 — lược đồ** (`995d66490`): cột `line_kind` và sáu cột chụp phí trên `order_item`, chỉ mục duy nhất một chặng một dòng phí, trigger hình dạng dòng, trigger khoá cột chụp khi đơn hết nháp, bảng chốt lô `ord_xac_nhan_phi_gac`, cờ `ord_confirm_request.transfer_fee_missing`; bất biến `R-ORD-PD-1`.
- **Task 2 — phía giá** (`03c05b890`): `tinhPhiDonThuan` / `tinhPhiDonChoDon` (pricing tự tra nhóm bằng `groupsOf`), Thử tra dùng chung hàm thuần, trần 5.000.000 đ, 409 `transfer_fee_gap` khi «Đổi mức» để hở ngày, danh sách khu vực thiếu mức chung + băng báo + bất biến cảnh báo `R-PRC-PD-3`, bài cấp phí khớp cấp hoa hồng.
- **Task 3 — dòng phí khi lập / lưu nháp / sửa chặng nháp** (`c78a36418`): `phi-don-don.ts` (làm phẳng chặng, dòng phí), `tinhPhiNhap`, câu SQL gác theo khoá lạc quan, `OrderDto.phiDuaDon`, e2e `phi-don-don`, sửa có chủ đích ca (7) của e2e `phi-don`.
- **Task 4 — xác nhận** (`756d47bd0`, `9cfead239`): `chuanBiPhiDonXacNhan` tính lại từ đầu lúc xác nhận, cổng thiếu mức ở bốn cửa (409 `transfer_fee_missing`, Gửi đơn của Đối tác sang nhánh chờ xác nhận), câu chốt lô, e2e `phi-don-xac-nhan`.
- **Task 5 — mọi chỗ đọc dòng tiền** (`09475e55c`, `3cd757907`, `0b5cb7676`, `b99c44692`, `3e79c2eb0`): tiền hiệu lực gồm phí, «Sửa số khách» tính lại phí theo đơn giá đã chụp, biên nhận / chia phần / «Khách đã trả đủ» / công nợ đại lý gồm phí, bài quét chỗ đọc `order_item`, sáu bài canh sửa có chủ đích, e2e một ca có phí ở bốn kịch bản đọc tiền, cờ `phiDuKien` của biên nhận.
- **Task 6 — giao diện, chữ, tài liệu** (commit của lượt này): xem mục «Task 6» dưới.

## Quyết định của điều phối (ruling), lời thường
- **R1 / R3:** từ Task 3, tạm tính = tiền dịch vụ + tiền phí; tổng = tạm tính − giảm giá; giảm giá chỉ được so với tiền dịch vụ. Mọi chỗ dựng nhóm dịch vụ chỉ lấy dòng dịch vụ; dòng phí chỉ đi vào mục phí của đơn.
- **R2:** mọi chỗ tính trần giảm giá dùng cùng một gốc là tổng tiền dịch vụ.
- **R4:** chốt lô xác nhận dùng một bảng rỗng có trigger thay cho view có trigger INSTEAD OF (bài kiến trúc cấm INSTEAD OF; kế hoạch cho phép cơ chế khác cùng tác dụng).
- **R5:** mã mức trên dòng phí KHÔNG có khoá ngoại sang bảng mức của pricing (khoá ngoại sẽ làm đỏ bài ranh giới module và cần ADR cho cạnh toàn vẹn mới). Bù lại: dòng mức chỉ-thêm, không xoá được, và bất biến `R-ORD-PD-1` kiểm mã còn tồn tại. **Lệch chữ kế hoạch — báo chủ.**
- **R6:** tra khu vực của địa điểm bằng một hàm công bố mới của `locations` (`khuVucCuaDiaDiemDanhMuc`, đọc view của chính nó), vì bài hàng rào Đợt B cấm `orders` biết tên bảng / cột khu vực; cạnh orders → locations đã có, không thêm cạnh mới.
- **R7:** ba route sửa chặng `POST …/legs`, `/close`, `/replace` không tính lại phí vì chúng vốn từ chối đơn nháp. `PUT …/booker` trên đơn nháp không tính lại số «dự kiến»: số cũ tới lần lưu kế tiếp, lúc xác nhận luôn tính lại từ đầu.
- **R8:** câu chốt lô đứng CUỐI lô xác nhận, không «ngay sau câu đổi trạng thái» như chữ kế hoạch: câu bị bỏ qua để lại `changes() = 0`, đặt sớm thì các câu gác sau (nhật ký, bản chụp) thua theo. Tác dụng lui cả lô như nhau.
- **R9:** câu lý do «Có lượt đưa đón chưa có mức phí, Quản trị cần đặt phí đưa đón trước khi xác nhận.» ghép từ tên đã có, không phải tên mới. Task 6 đã bỏ chú thích «chữ tạm» sau khi «Phí đưa đón» vào bảng tham chiếu.
- **R10:** ở Còn vé, cổng thiếu phí đứng TRƯỚC phần kiểm mốc / đặt gấp (commit `9cfead239`). Trước Đợt C, Còn vé đã kiểm mốc trước các cổng khác — lệch thứ tự cổng §3 của trang ghép có từ trước, ngoài phạm vi. Chỉ đổi câu báo nào hiện trước, không ghi tiền hay dữ liệu. **Ghi để chủ biết.**

## Lệch chữ kế hoạch (đã được điều phối nhận)
- Chốt lô là **bảng** `ord_xac_nhan_phi_gac`, không phải view (R4).
- `fee_rule_id` **không khoá ngoại** (R5).
- Tra khu vực qua **hàm công bố của `locations`** (R6).
- Câu chốt **đứng cuối lô** (R8).
- **Thứ tự cổng ở Còn vé**: thiếu phí trước mốc / đặt gấp (R10).
- `chuanBiPhiDonXacNhan` nằm ở `orders/service.ts` (không ở `phi-don-don.ts`) vì gọi `locations` và `pricing` lúc chạy; `phi-don-don.ts` phải nạp được bằng node trần.
- `fee_return_pax` lưu `min(số người chiều về, số khách)` thay số thô; máy chủ đã chặn số người chiều về vượt số khách nên hai số trùng nhau trong thực tế.

## Task 5: chỗ đọc `order_item` được bỏ qua hoặc xếp loại (nguồn: `DA_RA` của `src/doc-dong-tien-phi-don.test.ts`)
- `orders/repository.ts` (5 chỗ) — BỎ RA / BỎ QUA: câu đọc dòng của chi tiết đơn (nhóm dịch vụ chỉ lấy dòng dịch vụ, phí đọc riêng); câu dòng tiền cho tạm tính dịch vụ (phần phí qua `getPhiChoHieuLuc`); kiểu bảng ghi, câu chèn dòng dịch vụ, câu xoá dòng của đơn nháp (ghi, không đọc tiền).
- `orders/chang-hanh-khach-repo.ts` (6) — LUẬT RIÊNG: các câu riêng của dòng phí (chèn hai kiểu, xoá, đọc theo đơn, `fee_money_many`).
- `orders/thuong-mai-repo.ts` (1) — BỎ RA: dòng tiền cho hoa hồng chỉ lấy dịch vụ; phí cộng riêng ở `ghepGiaDaiLy`.
- `src/shared/bang-tham-chieu-khai-niem.ts` (1) — BỎ QUA: chữ «mã nội bộ» của khái niệm, không truy vấn.
- `scripts/audit-checks.mjs` (5): kiểm hoa hồng theo dịch vụ — BỎ RA (dòng phí không có dịch vụ); `R-ORD-15` / `15w` ×3 (tạm tính = mọi dòng, gồm phí) — TÍNH VÀO; `R-ORD-PD-1` — LUẬT RIÊNG.
- `scripts/don-du-lieu-thu/migrations/0001_…adr_0158.sql` (3) — BỎ QUA: kịch bản xoá dữ liệu thử một lần, đã chạy 2/11.
- Không view nào đọc `order_item`. Không cần sửa (đọc qua phần dịch vụ đã lọc): `viPhamGiaDanhMuc`, `summarizeDeviations`, `validateOrder`, cổng Trả sau (nhận tổng đã gồm phí từ nơi gọi), `scripts/audit-thuong-mai.mjs`.

## Ranh giới ADR-0203
`pricing` tự tra nhóm của dịch vụ bằng `groupsOf` (không nhận nhóm từ `orders`, không đọc `locations`). `orders` chỉ gửi chặng đã làm phẳng (khu vực, chiều, dịch vụ, số khách tính tiền); `van-chuyen`, `ve-dien-tu` không sửa dòng nào.

## Đợt C phải đóng trước khi bật phí (7 điểm của nhật ký Đợt A + B) — trạng thái
1. Khu vực thiếu mức chung sau ngày áp: danh sách + băng báo + `R-PRC-PD-3` + cổng thiếu mức nêu tên khu vực — xong (Task 2, 4).
2. Lý do «đại lý hai cấp»: `DAI_LY_HAI_CAP`, câu riêng — xong (Task 2, 4); đọc vai đang mở hôm nay có chú thích ở `docBangPhiDonChoDon`.
3. Bài so cấp phí với cấp hoa hồng — xong (Task 2).
4. Trần 5.000.000 đ và tràn số — xong (Task 2; trần chưa có lần đỏ quan sát).
5. «Đổi mức» kết thúc sớm hơn dòng cũ ⇒ 409 `transfer_fee_gap` — xong (Task 2).
6. Dùng view khu vực thay vì cạnh mới — xong theo R6 (hàm công bố của `locations` đọc view của nó; không cạnh mới).
7. Gỡ câu «chưa được cộng vào đơn» ở màn Phí đưa đón và bài Hướng dẫn — xong (Task 6), kèm câu Thử tra và băng báo thiếu mức chung.

## Task 6 — giao diện, chữ, tài liệu
- **Một nguồn chữ** `src/shared/phi-don-hien-thi.ts`: `chuThanhTienPhi` («Miễn phí» CHỈ khi đơn giá đã chụp là 0 đồng), `tenKhoiPhiDon` («Phí đưa đón (dự kiến)» cho đơn nháp), `dongPhiTrenDon` (mục trên trang đơn), `cauThieuPhiDon` (chuyển từ `orders` sang đây; `orders/phi-don-don.ts` chuyển tiếp nên câu 409 và băng báo trên trang là MỘT câu). Hằng «Miễn phí» còn một (`MIEN_PHI` của biên nhận trỏ về `CHU_MIEN_PHI`).
- **Dòng số lượng 0** (dịch vụ sửa số khách còn toàn em bé, đơn giá phí > 0): trang đơn và biên nhận đều HIỆN dòng, in `0 khách × đơn giá` và 0 ₫, không in «Miễn phí» (chọn hiện thay vì ẩn vì dòng vẫn có trong tổng; phần chia của biên nhận đã bỏ phần phí 0 đồng).
- **Trang đơn** (`web/order.ts` `tienCard`): mục «Phí đưa đón» trên «Tạm tính» (tạm tính đã gồm phí), mỗi lượt một dòng «Chiều đi · <khu vực>» + dòng phụ «2 khách × 70.000 ₫», thành tiền bên phải; chặng thiếu mức ⇒ băng đỏ đúng câu 409, có cả khi chưa có dòng nào. Không thêm cổng quyền ở trang: route chi tiết đơn chỉ trả đơn cho người qua `money.view` (nhánh người xét duyệt giữ tiền có chủ đích).
- **Biểu mẫu lập / sửa đơn**: dòng «Phí đưa đón — Tính khi lưu» ở Tóm tắt và bảng chi tiết điện thoại, chỉ khi có lượt đưa đón; trình duyệt không tính phí. Lưu ý: «Tạm tính» xem trước của biểu mẫu chỉ là tiền dịch vụ, còn «Tạm tính» ở trang đơn và biên nhận gồm phí.
- **Biên nhận**: khối «Phí đưa đón» dùng `chuThanhTienPhi`; đơn nháp ghi «Phí đưa đón (dự kiến)».
- **Màn Cấp độ đại lý**: câu nhắc «Cấp độ đại lý cũng quyết định mức phí đưa đón; đơn đã xác nhận giữ mức cũ.» (`CHU_MAN.nhacPhiDon`).
- **Điểm 7**: câu mới ở `public/phi-don.html`, bài Hướng dẫn `phi-don` (đã chạy `npm run huong-dan:xem-lai -- phi-don`), câu thiếu mức của Thử tra và băng báo thiếu mức chung ở `web/phi-don.ts`. Mọi câu ngắn hơn câu cũ.
- **Bảng tham chiếu**: thêm ba khái niệm «Phí đưa đón» (chủ 14/11), «Miễn phí», «dự kiến» (chủ 15/11), sinh lại `docs/BANG-THAM-CHIEU.md`.
- Mô tả dòng phí dùng `CHIEU_LABEL` (một nguồn chữ chiều), chữ ra không đổi.
- **Kịch bản Chrome mới** `docs/evidence/2026-11-phi-don/kich-ban/phi-don-don-smoke.mjs`; ảnh thật `docs/evidence/2026-11-phi-don/phi-don-don-*.png`.
- Tài liệu mô tả: `docs/SYSTEM-DESIGN.md` §5 (bảng, migration), §6 d3, §7; `docs/CHANGE-GUIDE.md` z39 + bảng kiểm; `docs/HANDOFF-N1.md` «ĐANG CHỜ NHẬP: Phí đưa đón, Đợt C»; `docs/SO-HANG-RAO.md` (sửa dòng e2e `phi-don`, tám dòng mới); `docs/data-dictionary.json` (ghi chú vị trí câu chốt).

## Câu chờ chủ (một lần, gom)
1. **Q1 — giảm sau khi giao (ADR-0116) có được ăn vào phí không?** Hiện khoản giảm sau khi giao trừ vào phần Tour Đảo trước, mà phần này nay gồm phí đưa đón. Tức là mặc định đang để khoản giảm đó ăn vào phí trước (khác giảm giá của đơn, vốn không bao giờ trừ phí). Tổng phải thu không đổi theo lựa chọn nào, chỉ đổi cách chia trên biên nhận; đảo được bằng một vòng lặp. Chưa đổi gì, chờ chủ: (a) giữ như hiện nay; (b) trừ vào tiền dịch vụ trước, phí sau.
2. **Câu báo trần giảm giá** «Giảm giá không được vượt quá tạm tính.» nay lệch nghĩa: trần là tiền dịch vụ, còn «tạm tính» đã gồm phí. Bảng tham chiếu chưa có tên cho «tổng tiền dịch vụ (chưa gồm phí)» nên chưa đổi câu. Chủ chọn một: (a) «Giảm giá không được vượt quá tiền dịch vụ.»; (b) «Giảm giá không được vượt quá tổng tiền dịch vụ (chưa gồm phí đưa đón).»; (c) giữ câu cũ.
3. **Dòng mới cho bảng kịch bản Chrome ở `web/CLAUDE.md`** (người thi công không sửa tệp luật): «Phí đưa đón trên đơn (Đợt C): mục `phiDuaDon` của `tienCard` ở `web/order.ts`, dòng `[data-phi-don]` của `public/order-form.html`, `dongPhiTrenDon` / `chuThanhTienPhi` / `tenKhoiPhiDon` của `src/shared/phi-don-hien-thi.ts`, khối phí của `src/shared/order-confirmation.ts`, câu nhắc ở `web/cap-dai-ly.ts` → `phi-don-don-smoke.mjs` ở `docs/evidence/2026-11-phi-don/kich-ban/` (1280 + 390, cần `AXE_JS`, không cần mạng ngoài) + `v1-xac-nhan-png.mjs`, `mau-hd-02-dt.mjs`». Kèm dòng cũ còn chờ của Đợt A + B cho `phi-don-smoke.mjs`.
4. **Dòng «Phí đưa đón — Tính khi lưu» của biểu mẫu hiện cho mọi đơn có lượt đưa đón, kể cả khi chưa đặt ngày bắt đầu áp** (khi đó lưu xong không có phí nào). Ẩn dòng này trước ngày áp thì biểu mẫu phải hỏi máy chủ phí đang bật hay tắt — việc mới, chưa làm. Chủ chọn: (a) giữ như hiện nay (đơn giản; chỉ lệch trong khoảng từ lúc triển khai tới lúc đặt ngày); (b) làm thêm phần hỏi máy chủ để ẩn dòng khi phí tắt.
5. **Ảnh để duyệt:** năm ảnh `docs/evidence/2026-11-phi-don/phi-don-don-*.png` (thẻ Thanh toán của đơn nháp và đơn đã xác nhận ở máy tính và điện thoại, ảnh biên nhận có dòng «Miễn phí»).

## Kết quả bộ kiểm cuối
(Để trống cho người điều phối — Task 7: `npm test`, `npm run test:e2e`, kịch bản Chrome đủ bộ, người kiểm độc lập.)
