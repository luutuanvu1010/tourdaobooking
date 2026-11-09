# Đợt 2 — thi công ADR lượt A (T-03, Q-05, R3d): kế hoạch con và nhật ký

- **Kế hoạch mẹ:** `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` Phần V (chủ duyệt 9/11: «Duyệt, mở thi công toàn bộ , lần lượt từng đợt cho tới khi hoàn thành»).
- **ADR (chủ duyệt 9/11, «Duyệt cả A và B»):** ADR-0188 (kể cả 4(a) chặn cửa gộp hồ sơ), ADR-0189, ADR-0190. ADR thắng kế hoạch khi lệch.
- **Xây trên lỗ đang hở: HC-4.2** (chỉ phần ADR-0188) — khoá `xay_tren_cho_phep_adr_0188` đã có ở `docs/quyen-hoan.json`. Chỉ siết, không thêm đường ghi sổ.
- **Loại:** việc lớn (tiền, quyền) — một người kiểm độc lập chỉ đọc cho cả nhánh.
- **Nhánh:** `claude/dot-2-adr-luot-a-1048aa` (cắt từ `main` b5785a8d7). Không migration.
- **Đo trước:** gói trang Đơn hàng 110.343 byte, trần 110.443 (dư 100). Đo lại sau khi gộp `main` lần cuối.
- Dòng trỏ ở ADR-0168, ADR-0053, ADR-0007 đã có (phiên duyệt đã ghi) — không sửa ADR nào.

## Task A — T-03: cổng đổi bên đặt + cổng gộp hồ sơ (ADR-0188)

**Tiêu chí nghiệm thu (hành vi):**
1. Đơn `CREDIT` đã xác nhận, hết nợ, đổi bên đặt sang: bên không hạn mức → 409 `khong_co_han_muc` câu a; khách lẻ (null) → 409 `tra_sau_thieu_ben_dat` câu c; bên có đơn quá hạn còn nợ → 409 `co_don_qua_han` câu b; bên có hạn mức → 200, phiên bản hạn mức bên cũ và bên mới mỗi bên tăng đúng 1. Đơn không đổi ở mọi ca 409.
2. Lệnh làm đổi phiên bản bên MỚI chen giữa kiểm và ghi → 409 `credit_version_stale`, bên đặt giữ nguyên.
3. Đơn nháp và đơn `PREPAID` đổi sang bên không hạn mức → 200, không câu gác.
4. `kiemTraSau` trả `null` → 503. Còn nợ → vẫn 409 `tra_sau_con_no_doi_ben_dat` (đứng trước mọi điều mới).
5. Câu a/b/c là hằng riêng ở `tra-sau-cong.ts`; KHÔNG dùng `kq.cau` của billing (câu đó bảo «chọn thanh toán ngay» — việc không làm được).
6. Gộp hồ sơ: hồ sơ phụ có đơn `CREDIT` đã xác nhận chưa huỷ (kể cả hết nợ) mà hồ sơ chính không hạn mức / có đơn quá hạn → bị chặn ở CẢ xem trước (`chan`) lẫn POST (409), câu nói «hồ sơ chính»; hồ sơ chính có hạn mức → gộp được, lô mang câu gác phiên bản hồ sơ chính; phiên bản đổi chen giữa → 409 `credit_version_stale` (không phải `MERGE_STALE`).
7. `npm run typecheck` 0 lỗi; mọi bài cũ xanh.

**Bước:** đỏ trước ở `src/tra-sau-duong-ghi.test.ts` (sửa hai bài cũ cho bên mới có hạn mức; thêm T3-a…f) và bài gộp; rồi sửa `congDoiBenDatTraSau` (nhận `benMoi`, `kiemTraSau`), mở `loai` thành `"sua_tang" | "doi_ben"` ở mọi chỗ khai; route `PUT /api/orders/:id/booker` lấy `kiemTraSau` từ ctx; thêm hàm bắt buộc mới vào `GopHoSoNoi` (hồ sơ có đơn Trả sau đã xác nhận chưa huỷ), gốc lắp ráp nối; kiểm ở `tinhGop`, câu gác nối cuối lô gộp, dịch lỗi phiên bản bằng hàm đặt ở chỗ `parties` được import (không import `orders`).

## Task B — Q-05: khung xem khách có hạn (ADR-0189)

**Tiêu chí nghiệm thu:**
1. `trongNgayChay`: xuất bến D 12:35 (ngày chạy D) → D, D+1 đúng; D+2, D+9 sai. Xuất bến D+1 00:30 (ngày chạy D) → đúng tới hết D+2, sai D+3. Xuất bến tối D−1 → chỉ D đúng. Vế hạn Từ chối của tài xế đối tác giữ nguyên và giao với vế này.
2. DTO tài xế (`DRIVER`, `DRIVER_PARTNER`) chuyến quên Kết thúc ở D+2: không tên, năm sinh, liên hệ, chỉ đường, mã đơn (đối tác); route bổ sung tên khách → như ngoài khung; lệnh tiến độ, Kết thúc vẫn 200.
3. Văn phòng không đổi.
4. Màn tài xế hiện dòng nhắc «Chuyến chưa bấm Kết thúc — tên khách đã ẩn. Bấm Kết thúc khi xong hoặc báo văn phòng.» khi: chuyến `RUNNING`, cờ `trongNgayChay` tắt, hôm nay (VN) > ngày chạy. Điều kiện là một hàm thuần ở `src/shared/` có bài ba ca; hàm đó KHÔNG gọi `trongNgayChay` (bài một-hàm-khung).
5. Bài/kiểm cũ nào khẳng định «9 ngày sau vẫn thấy» thì đảo lại.

## Task C — R3d: chỉ Quản trị, Toàn quyền ngừng dùng / dùng lại hồ sơ (ADR-0190)

**Tiêu chí nghiệm thu:**
1. Ô mới `party.deactivate` = `quanTri()` (nếu gói Đơn hàng vượt trần → dùng `admin.manage`, ghi lý do ở commit; không nới trần).
2. `PUT /api/parties/:id` hồ sơ không gắn tài khoản: cờ `active` đổi (cả hai chiều) mà thiếu ô → 403 câu «Chỉ Quản trị hoặc Toàn quyền ngừng dùng hoặc dùng lại hồ sơ.» (một hằng), hồ sơ không đổi. Hỏi SAU luật hồ sơ gắn tài khoản và luật công ty chủ. Cờ không đổi → Bán hàng sửa tên vẫn 200.
3. Bán hàng, Quản lý bán hàng, Kế toán → 403; Quản trị, Toàn quyền → 200.
4. Nhật ký `party_updated` thêm «— ngừng dùng» / «— dùng lại»; không SĐT/email/MST.
5. DTO chi tiết hồ sơ có cờ đổi được «Đang dùng» (máy chủ tính bằng đúng ô); `web/parties.ts` khoá ô «Đang dùng» theo cờ; mọi nút khác đổi «Đang dùng» trên giao diện (nếu có) cũng theo cờ.
6. Đảo bài cũ: `ho-so-co-tai-khoan.test.ts` ca Bán hàng ngưng hồ sơ khách → 403; ca R3d của `tests/audit/redteam.test.mjs` thành bài hồi quy.
7. Hai phát hiện phụ vào `docs/BACKLOG.md`.

## Kiểm cuối (Phần X kế hoạch mẹ)

`npm test`, `npm run typecheck`, e2e liên quan (đổi bên đặt, hồ sơ, chuyến tài xế), kịch bản Chrome `cuoc-smoke.mjs`, `tai-xe-thay-khach-smoke.mjs`, màn Danh bạ (390 và 1280). Mục nhật ký thay đổi số kế tiếp so với `main`. Người kiểm độc lập cả nhánh.

## Nhật ký

- 2026-11-09: viết kế hoạch con. Đo gói Đơn hàng 110.343 / 110.443.
- Task A (c1d3f8162, 7304a66a7, ea02ec875): cổng đổi bên đặt + cổng gộp hồ sơ 4(a); hàm bắt buộc mới `donTraSauDaXacNhan` của `GopHoSoNoi`. Người duyệt task: đạt.
- Task B (ca65c944e, d1e200f08): vế RUNNING của `trongNgayChay` có hạn; hàm dòng nhắc `src/shared/nhac-ket-thuc.ts`. Người duyệt task: đạt.
- Task C (e6d456f36, 786c6048f, 2024cff0e, d1c07d269): ô `party.deactivate` (gói Đơn hàng 110.366 / 110.443, không nới trần), mã `party_deactivate_forbidden`, cờ DTO `activeEditable`, BACKLOG mục 68. Vòng sửa 1: tách mã lỗi riêng (bài đang so câu). Vòng sửa 2: bài đếm trợ lý C4 đo lại 17 → 18.
- Nhật ký thay đổi 2.84 (số tạm) — 190d53fa4.
- Người kiểm độc lập (`nguoi-kiem-doc-lap`) cả nhánh: **ĐẠT**, một Low (hai khối ghi chú liền nhau ở `src/shared/tra-sau.ts`); tự chạy typecheck và các tệp kiểm, phá thử bốn chỗ đều đỏ đúng chỗ.
- Kiểm cuối: typecheck 0 lỗi; `npm test` lần 1: 8585/8590, 1 đỏ (C4, đã sửa); e2e booker, parties, gop-ho-so, tra-sau, tai-xe-cuoc, tai-xe-doi-tac, trip, permissions xanh; dieu-phoi đỏ lần đầu vì wrangler «internal error» ở bước dựng D1, chạy lại xanh.
- Chrome (AXE_JS có): `cuoc-smoke` 19/19; `t2b-danh-ba-smoke` đạt (bước A2 ghi đè hai ảnh của thư mục khác — đã khôi phục); kịch bản mới `docs/evidence/2026-11-09-dot-2-adr-luot-a/kich-ban/dot-2-smoke.mjs` 8/8 (390 + 1280; phá thử: bỏ hai chỗ giao diện thì A1, A2, B1, B2 đỏ). `tai-xe-thay-khach-smoke` đỏ sẵn ở bước dựng dữ liệu (Quản trị xác nhận đơn nháp của Bán hàng — trái ADR-0135), sửa một dòng (586d6ab6b), chạy 10/10.
- `npm test` lần 2 trên mã cuối (sau 586d6ab6b): 8590 bài, 0 đỏ, thoát 0.
- Đề xuất dòng cho bảng kịch bản ở `web/CLAUDE.md` (tệp luật, chủ duyệt): «Dòng nhắc chuyến quên Kết thúc (ADR-0189) ở `web/cuoc-chuyen.ts`; ô «Đang dùng» khoá theo `activeEditable` ở `web/parties.ts` (ADR-0190) | `dot-2-smoke.mjs` ở `docs/evidence/2026-11-09-dot-2-adr-luot-a/kich-ban/`».
- Việc còn cho chủ (không chặn): câu a dạng «hồ sơ chính» do AI viết lại; đơn trả sau đã giao vẫn chặn gộp (đúng chữ ADR); Bán hàng thấy ô «Đang dùng» khoá mà không có câu giải thích; màn tài xế ngày thứ hai chỉ ghi giờ xuất bến, không ngày.
