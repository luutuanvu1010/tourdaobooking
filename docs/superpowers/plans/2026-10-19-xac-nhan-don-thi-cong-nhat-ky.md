# Nhật ký thi công — Bước Xác nhận đơn (kế hoạch `2026-10-19-xac-nhan-don.md`)

Sổ điều phối (P19: trạng thái sống ở đây, không trong trí nhớ phiên). Phiên đầu (19/10) dừng theo lệnh chủ: "phiên đã kéo dài quá lâu" → "đồng ý, làm bước 1 rồi dừng".

## Trạng thái khi bàn giao (19/10; cập nhật 25/10)

| Đợt | Trạng thái |
|---|---|
| 0 — hồ sơ | Xong. Lượt 1 **chủ duyệt** ("duyệt lượt 1"): `docs/adr/ADR-0134-don-khong-don-khung-gio.md`, `docs/adr/ADR-0135-nhap-rieng-tu-khong-thu.md`. Lượt 2 của bộ 19/10 (`docs/superpowers/specs/2026-10-19-xac-nhan-don/`): **ADR-0136 đã duyệt 25/10** kèm bản bổ sung (xem hàng 3); đề xuất thư + QR (số tạm 0137) chưa trình, cần số mới. |
| 1 — đón/không đón, khung giờ | **ĐÃ LÊN PRODUCTION bản 2.23 (19/10)**: kiểm độc lập ĐẠT có điều kiện, chuẩn bị phát hành (64 kịch bản Chrome, e2e trọn 70/70, tài liệu), chủ day-len + trien-khai; GET /api/auth/config trả version 2.23. Lịch sử: thi công **đã commit** (416a8388 migration, cb318faa máy chủ, dafd1d06 giao diện, 4bc6a1e6 e2e). Báo cáo cuối của trợ lý thi công và **kiểm độc lập chưa có** — xem mục "Việc kế tiếp". |
| 2 — nháp riêng tư, không thu | Chưa làm. **Phát hành chung với Đợt 3** (chủ chọn A, đặc tả 5f). |
| 3 — bước xác nhận | Chưa làm. **ADR-0136 chủ duyệt 25/10** (đề xuất gốc + bản bổ sung 25/10: cờ «cần xác nhận» theo dịch vụ hoặc nhóm, nút «Gửi đơn» của Đối tác, ô `order.submit`): `docs/adr/ADR-0136-buoc-xac-nhan-don-va-gui-don.md`. **Kế hoạch ĐÃ SỬA 25/10** theo Ruling (người kiểm độc lập đã soát một vòng, đã sửa theo); chờ chủ `day-len` nhánh sửa kế hoạch rồi thi công. Điểm sửa tiền khi đơn chờ (Đ8): chủ quyết 26/10 giữ ADR-0023 đ4, lý do là mã đóng. |
| 4 — thư + QR | Chưa làm. Đề xuất mang số tạm 0137 (nay đã là ADR sổ đại lý): cần số mới, chưa trình lại. |
| 5 — Bảng điều khiển | Chưa làm; cần ảnh mẫu chủ duyệt trước. |

## Ruling / lệch kế hoạch

- Số ADR lùi 0133→0134 … 0136→0137 (0133 đã bị nhánh chiết khấu theo loại khách giữ). Giá nếu sai: đổi số lần nữa.
- Migration: kế hoạch ghi 0114/0115; trợ lý Đợt 1 đặt **0115** cho tệp chọn đón (đã kiểm lại lúc tạo — cần xác minh lý do trong báo cáo kiểm độc lập; nếu 0114 trống thì giữ nguyên vẫn hợp lệ vì wrangler theo dõi theo tên). Migration Đợt 3 lấy số kế tiếp **sau khi kiểm lại mọi nhánh**.
- Lịch chung điều phối: chỉ hiện chặng của nháp có yêu cầu xác nhận mở (chủ "theo khuyến nghị của bạn", đặc tả 5d).
- Đợt 2 không phát hành trước Đợt 3 (chủ chọn A, đặc tả 5f).
- **25/10 — chủ duyệt ADR-0136**, nguyên văn: «Duyệt lượt 1 (ADR-0136 gốc + bản bổ sung 25/10) theo mọi khuyến nghị của người soạn, kể cả hai câu còn mở.» Bản chép: `docs/adr/ADR-0136-buoc-xac-nhan-don-va-gui-don.md`; bản bổ sung và trang ghép mới ở `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/`. **Kế hoạch này viết trước bản bổ sung, nên phải sửa trước khi thi công Đợt 2 + 3:**
  - Task 3.1: `canXacNhan` đọc cờ theo ba bước của Đ1 (dòng dịch vụ → dòng nhóm hiện hành qua `v_ctl_service_group` → không cần), không chỉ tập mã dịch vụ.
  - Task 3.2: migration 0115 đã bị dùng, lấy số kế tiếp sau khi kiểm mọi nhánh; `ord_service_confirm_flag` thêm phạm vi `SERVICE | GROUP` (mã dịch vụ hoặc mã nhóm); cột `required` 0/1 kế hoạch đã có giữ làm giá trị cần / không cần (đừng thêm cột trùng), và giá trị «không cần» phải ghi được tường minh để dòng dịch vụ thắng dòng nhóm; thêm ô `order.submit` (PARTNER `own`, SUPER_ADMIN `any`, còn lại `none`).
  - Task 3.3: điều kiện «chưa có khoản thu» khi mở yêu cầu (hàm do gốc lắp ráp tiêm vào); route Gửi đơn (Đ13); luật 409 `partner_submit_required` ở `/status` và route Gửi xác nhận khi người lập giữ quyền Đối tác. Ca e2e (a) hôm nay mong Đối tác nhận `confirm_request_required` rồi tự gửi xác nhận; theo Đ13.5 Đối tác nhận `partner_submit_required` trước, và phải gửi bằng Gửi đơn.
  - Task 3.4: nút Gửi đơn ở form và trang đơn, hai câu báo nhánh A / B, Trợ giúp Đối tác.
  - Bài đỏ đo được và các e2e phải sửa: trang ghép 25/10 mục 6. Cổng «luật bán» trong Gửi đơn chỉ thêm khi ADR chính sách bán (lượt 2) đã duyệt.

## Lệch cần chủ xử lý (ghi 26/10; không sửa ADR)

- **ADR-0136 Đ13.5 câu thứ ba và tiêu chí nghiệm thu 4** nói tài khoản lai (giữ quyền Đối tác) xác nhận đơn được giao do người khác lập «vẫn như hôm nay». ADR-0135 Đ2 (nháp của người khác: 404, kể cả người phụ trách chọn sẵn) làm đường đó không còn với **nháp thường**. Chủ chốt 26/10: «Đơn chờ thì quyết định được, nháp thường thì không». Kế hoạch hiểu chữ ADR-0136 hẹp lại: chỉ đơn **đang chờ**, quyết định qua ô `order.confirm.review`. Chờ chủ ra dòng bổ sung cho ADR.
- **ADR-0136 Đ8 (sửa tiền khi chờ) và tiêu chí 8:** chủ hoãn 26/10 — Task 3.3b, hai hướng, chờ chủ duyệt sau.

## Báo cáo trợ lý thi công Đợt 1 (19/10, tự khai — CHƯA kiểm độc lập)

- Commit: 416a8388, cb318faa, dafd1d06, 4bc6a1e6, debe67da (hai kịch bản Chrome a2 gieo đơn có lựa chọn đón).
- Kiểm: `npm test` 5692 đạt / 0 đỏ; typecheck 0 lỗi; build:web OK; e2e 9 bộ xanh (chon-don, orders, chang-hanh-khach, dua-don-dau-cuoi, mau-chang, trip, dispatch, nhap-tay-va-gia-doi-tac, catalog) sau khi sửa dữ liệu gieo của trip/dispatch/nhap-tay; Chrome a2-smoke-form/order/sheet OK 390 + 1040.
- Ruling của trợ lý: (1) migration **0115** vì 0114 đã bị nhánh chiết khấu (pricing) giữ; (2) POST khung giờ trả 200 (luật H7: 201 phải có Location); (3) mọi dịch vụ vắng `pickupChoice` ⇒ giữ giá trị đã lưu, vắng lẫn có ⇒ 400; (4) sửa chặng đổi giờ ⇒ xoá cuối khung; (5) một câu lỗi chung cho ba ca; (6) nút Đón giữ `data-action="them-dua-don"`; (7) dữ liệu gieo kiểm thử gửi lựa chọn tường minh; (8) nháp cũ lưu được, chưa xác nhận được tới khi chọn; (9) cổng chọn đón chạy trước `incomplete_trip`.
- **Còn treo:** chưa chạy trọn ~65 bộ e2e; ~53 kịch bản Chrome khác trong `docs/evidence` gieo đơn rồi xác nhận mà chưa gửi lựa chọn đón — nhiều khả năng đỏ 409 `pickup_choice_required` (vd `dat-gap-smoke`), phải rà và sửa dữ liệu gieo trước khi phát hành; chưa viết `chon-don-smoke.mjs`; commit cb318faa chưa typecheck riêng (chỉ HEAD).

## Việc kế tiếp (phiên mới, theo thứ tự)

1. Đọc `.superpowers/sdd/2026-10-19-xac-nhan-don/progress.md` (sổ cục bộ, không trong git) và nhật ký này; `git log --oneline origin/main..HEAD`.
2. Nếu worktree còn thay đổi chưa commit của trợ lý Đợt 1 (vd kịch bản `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`): đọc diff, quyết giữ/bỏ, commit.
3. Gọi `nguoi-kiem-doc-lap` cho Đợt 1 (dữ liệu + hợp đồng API): ADR-0134, Task 1.1–1.3, Review Focus 6; chạy lại `npm test`, `npm run typecheck`, e2e `chon-don orders chang-hanh-khach dua-don-dau-cuoi trip dispatch nhap-tay-va-gia-doi-tac`, kịch bản Chrome `chon-don-smoke.mjs` (ghi rõ có chạy hay không).
4. Đạt → Đợt 1 phát hành riêng được (`npm run day-len` do chủ chạy; có migration ⇒ "cần `npm run trien-khai`").
5. Trình chủ lượt 2 (ADR-0136, 0137 + `TRANG-GHEP-LUOT-2.md`); kiểm lại số ADR trước khi cấp. — **25/10: ADR-0136 đã duyệt** (Ruling 25/10); đề xuất thư + QR cần số mới, chưa trình.
6. Đợt 2 + 3 thi công theo kế hoạch (mỗi đợt một trợ lý + kiểm độc lập), phát hành chung. — **Kế hoạch đã sửa theo Ruling 25/10 (Task 3.2b mới: tách lô xác nhận trước 3.3).**

## Việc ngoài kế hoạch làm trong phiên

- **Gỡ hook Stop «cổng xanh»** theo lệnh chủ ("gỡ đi…"), nhánh riêng `worktree-agent-a7b56f52be49e4ff4` (commit 2334efd5, dựng trên origin/main b1b2abe4): bỏ đăng ký trong `.claude/settings.json`, sửa CLAUDE.md §8, sổ hàng rào ghi "ĐÃ GỠ 2026-10-19". Hai tệp `.claude/hooks/cong-xanh*.mjs` còn nằm đó (AI bị chặn xoá), không còn được gọi. Kết quả kiểm độc lập: xem báo cáo cuối phiên.

## Lần giao L1 (26/10, trợ lý thi công; Task 2.1 + 2.3 — CHƯA kiểm độc lập)

**Phạm vi**: nháp riêng tư (ADR-0135) — luật thuần `src/shared/xem-don-nhap.ts` (`xemDuocDon`, `ketQuaXemDon`, `chiNguoiLapGhiNhap`); đường đọc/ghi của orders, dispatch, receipt, billing, van-chuyen, thông báo, bảng tin, Việc của bạn; khoá `choXacNhan` → `donNhap` (phạm vi `CUA_TOI`); lịch chung chặng tắt phần nháp. KHÔNG làm: Task 2.2, Đợt 3, đổi giá trị ô quyền, migration.

**Bước 0 — kiểm view `v_ord_*` có lộ mã đơn nháp không**: `v_ord_order_label` (id, order_code) là view công bố trên MỌI đơn, kể cả nháp (thiết kế từ migration 0009, không đổi). Các nơi dùng: thongbao (tin nháp bị `locHopThongBao`/`DongDon.laNhap` lọc theo trạng thái HIỆN TẠI), audit, feedback, van-chuyen, billing. Đã sửa/chặn: tin thông báo nháp chỉ tới người lập; `donCuaNguoiDat` không trả mã nháp; hộp thoại gộp hồ sơ không còn nêu mã đơn nháp. CHƯA kiểm sâu từng đường: audit (`audit/repository.ts` ghép nhãn vào dòng nhật ký — nhật ký đơn nháp đọc qua route đơn nên đã 404), feedback (`DON_CUA_NGUOI` chỉ đơn của chính người đó), billing (`bil_*` gắn đơn nháp chỉ có khi nháp đã nhận tiền — thuộc Task 2.2). Kết luận: view không đổi; không thấy đường lộ cho người khác ngoài các điểm đã chặn; phần billing để Task 2.2.

**Rulings**: `isAssigned`/`findHandledOrderIds` loại đơn nháp; cổng nháp đặt TRƯỚC kiểm ô quyền ở các route đặt gấp, `handler-cancel`/`handler-money-edit`/`handler-refuse` và route chặng/hành khách (để người không phải người lập luôn 404, không lộ 403/409); `LEG_LICH_CHUNG_NHAP` có điều kiện `0 = 1`; tin nháp xét theo trạng thái hiện tại.

**Hàng rào**: dòng mới ở `docs/SO-HANG-RAO.md` (đột biến `chiNguoiLapGhiNhap` luôn `true` ⇒ 24 bài đỏ, hoàn nguyên ⇒ 41/41 xanh, quan sát 26/10). Ba cổng 404 mới ở route `handler-*` thêm SAU bài hàng loạt; chỉ có đột biến chứng minh, bài riêng từng cổng nằm ở `tu-choi.test.ts` (TC-4), `nhap-rieng-tu.test.ts`.

**Bài cũ đỏ → cách sửa** (chỉ sửa dữ liệu gieo/kỳ vọng, KHÔNG nới luật): các bài giả định người khác đọc/ghi/xác nhận nháp. Ba khuôn: (1) xác nhận bằng chính người lập (`SELECT staff_id`) hoặc tạo nháp rồi `UPDATE … status='confirmed'` (chèn thẳng đã xác nhận bị trigger chặn); (2) đổi kỳ vọng sang 404 nơi "người khác đọc/ghi nháp" là chính điểm kiểm; (3) dấu «đặt gấp» của Đối tác/Thực tập gieo bằng SQL vì họ không có ô. Danh sách tệp: billing (`ben-kia`, `ben-kia-lua-chon`, `so-cong-no-ben`, `so-du-bang-tong-dong-no`, `dieu-chinh-duyet-route`, `nhap-ke-toan`); orders (`o-moi-chang`, `cam-ket-chang`, `canh-bao-ha-muc`, `xem-don-theo-quyen`, `dat-gap`, `dat-gap-hien-thi`, `dat-gap-sat-gio`, `thuong-mai-route`, `loc-don-route`, `loc-chua-phu-trach`, `tim-chu-dai`, `dashboard`, `lich-chung-chang`, `so-khach-van-phong-route`, `chang-route`, `chiet-khau-theo-loai`, `tran-giam-gia-don`, `order-ref`, `nguoi-lap-route`, `nguoi-dat-gop`); dispatch (`nhan-don`, `tu-choi`, `service`, `handler-of`); van-chuyen (`dieu-phoi`, `dieu-chinh-khan-cap`, `nhan-khan-cap`, `xe-dang-chay-route`, `tests/audit/dieu-phoi-khung.mjs`); khác (`thongbao/tin-doi-hop`, `receipt/bien-nhan`, `parties/gop-route`, `pricing/*` ba tệp, `so-la-doi-tac`, `so-la-thuong-mai-toan-nen-tang`, `so-vang-so-dai-ly`, `shared/viec-cua-ban`). e2e: `orders`, `permissions`, `thongbao`, `bangtin`, `chang-hanh-khach`, `dispatch` (đơn dựng sẵn nay xác nhận mặc định; HDV chọn sẵn không thấy nháp trong «Việc của tôi»/danh sách), thêm `nhap-rieng-tu`.

**Đo (26/10)**: `npm test` thoát 0 — 6273 bài, 6269 đạt, 0 hỏng (4 bỏ qua theo bộ cũ); `npm run typecheck` 0 lỗi; `npm run build:web` xanh; e2e `nhap-rieng-tu orders dispatch permissions bangtin thongbao gop-ho-so chang-hanh-khach` xanh cả tám + `audit-invariants` cuối.

### Nợ / câu hỏi cho chủ
- Nháp của Đối tác/Thực tập dưới mốc 6 giờ không đóng dấu «đặt gấp» được (đường thật là «Gửi duyệt xác nhận» — Đợt 3).
- `/api/orders/nguoi-lap` có thể liệt kê người chỉ có nháp.
- `GET /api/dispatch/handlers?orderIds=` chưa lọc nháp.
- Thông báo 409 gộp hồ sơ không còn nêu mã đơn nháp.
- `STATUS_LABEL.draft` còn là «Chờ xác nhận» (đổi chữ thuộc giao diện/Đợt 3).
- HDV chọn sẵn nay nhận 404 (trước là 403/409) ở `handler-cancel`/`handler-money-edit`/`handler-refuse` với nháp.
- Billing ghép nhãn đơn nháp đã nhận tiền: để Task 2.2.
