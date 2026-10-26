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

## Lần giao L2 (26/10, trợ lý thi công; Task 2.2 trừ Step 0 — CHƯA kiểm độc lập)

**Phạm vi**: ADR-0135 Đ7 + Đ8. Nháp không ghi thu (409 `order_draft_no_payment`; người khác → 404 trước, theo L1); cổng đặt ở đơn NHẬN của lệnh chuyển cọc (`ghiChuyen`); cờ `coTheGhiThu` thêm `status !== "draft"`. QR: mọi đơn không `confirmed` → 409 `qr_requires_confirmed` (đặt SAU kiểm quyền xem + `money.view`, TRƯỚC đọc tiền/tài khoản). Màn Tạo đơn bỏ ba ô trả trước, bước hai ghi thu, dòng ở Tóm tắt / thanh dính / bảng chi tiết, tham số `thutruoc=loi` của trang đơn; nút QR ở `web/order.ts` chỉ khi `confirmed`. Hướng dẫn Bán hàng + Đối tác sửa câu ô «Thanh toán trước». Không migration, không đổi ô quyền.

**Step 0 — VIỆC CỦA CHỦ trước khi chạy `npm run trien-khai`** (AI không chạy lệnh remote). Chạy ở thư mục `tourdao-sales`:
```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(DISTINCT o.id) AS so_don FROM orders o JOIN bil_payment_receipt r ON r.order_id = o.id WHERE o.status = 'draft'"
```
Kết quả > 0: chủ quyết cách xử lý các nháp đó (huỷ chúng rơi vào lỗ TNV-G1) và ghi kết quả vào nhật ký này. Kết quả chưa có.

**Thứ tự đỏ → xanh**: `nhap-khong-thu.test.ts` 6/6 đỏ (201 thay vì 409; `coTheGhiThu` true; 201 thay vì 400 ở duyệt chuyển; QR 200/`nothing_due`) → cài đặt → 6/6 xanh. `tao-don-khong-tra-truoc.test.ts` 3/3 đỏ (còn `prepaid`, còn câu hướng dẫn, nút QR chưa chặn) → sửa form / hướng dẫn / `order.ts` → xanh.

**Bài cũ sửa dữ liệu gieo / kỳ vọng (không nới luật)**: `ben-kia.test.ts` (ghi thu lên nháp: 400 → 409 vì cổng đứng trước); `qr-thanh-toan.test.ts` (đơn huỷ: `nothing_due` → `qr_requires_confirmed`); `o-chon-nhan-noi-safari.test.ts` (bỏ điều kiện «còn ít nhất một ô chọn một» vì hai ô chọn một duy nhất của form đã bỏ; luật cho ô sau này giữ). e2e: `so-tien`, `orders`, `chong-ghi-trung`, `sua-so-khach`, `dispatch` xác nhận đơn TRƯỚC khi ghi thu; `sua-so-khach` CA 4: Kế toán sửa tiền nháp của người khác 409 → 404 (hệ quả L1); thêm ca vào `so-tien` (nháp 409) và `qr-thanh-toan` mục 2b. Kịch bản Chrome `a2-smoke-form.mjs` (bỏ mọi chỗ gõ / đo ô trả trước, thêm kiểm «không còn ô») và `a2-smoke-order.mjs` (bỏ khoản thu 500.000 lên nháp; tiền «đã trả trước 0 ₫»).

**Rà `billing` (câu hỏi L1 để ngỏ — `v_ord_order_label`)**: đã xem mọi route đọc của `billing/index.ts`: `GET …/payments` (đã chặn nháp người khác ở L1), `GET …/nhap-ke-toan` (L1), `POST /api/ledger/balances` (L1 bỏ nháp người khác), `GET /api/ledger/unpaid-summary` (chỉ đếm, đơn đã xác nhận), `GET /api/ledger/mine`, `GET /api/ledger`, `GET /api/ledger/ben/:partyId`, `GET /api/ledger/coc`, `…/coc/doi-chieu`, `…/coc/dem`, `GET /api/ledger/adjustment-requests`, `GET /api/ledger/ky`. Kết quả: (1) MỘT chỗ lộ mã đơn nháp qua view đã có và đã chặn bằng bài đỏ: `POST …/coc/duyet` tra đơn nhận theo MÃ qua `orderByCode` → nhận cả đơn nháp của người khác (201); nay nháp = «Không tìm thấy đơn nhận tiền.» (400). (2) Các route ledger văn phòng (`/api/ledger`, `/ben`, `/coc*`) ghép mã đơn qua `v_ord_order_label` cho mọi dòng `bil_*`; đơn nháp MỚI không còn dòng `bil_*` (không ghi thu được) nên không lộ thêm, nhưng nháp CŨ đã có khoản thu từ ô Trả trước (đối tượng của Step 0) vẫn hiện mã trong sổ cho Kế toán/văn phòng. CHƯA có bài cho phần này vì phụ thuộc kết quả Step 0 (nếu 0 thì không có gì để lộ); xem Nợ.

**Đo (26/10)**: `npm test` — lần cuối 6282 bài, 1 đỏ (`o-chon-nhan-noi-safari`, đã sửa); chạy lại sau sửa xem báo cáo cuối. `typecheck` 0 lỗi, `build:web` xanh. e2e `so-tien qr-thanh-toan coc-don-huy orders nhap-rieng-tu` xanh; thêm `chong-ghi-trung sua-so-khach dispatch` xanh (6/6). Chrome: `a2-smoke-form` xanh («UI SMOKE FORM OK»; 390 + 800 + 1040 trong kịch bản; chưa chạy kiểm màu vì không đặt `AXE_JS` — kịch bản này không dùng axe). `a2-smoke-order` đỏ ở bước 2 (nút «Xác nhận đơn» bị khoá phía giao diện khi nháp thiếu ngày — thay đổi 2ce61247 có từ trước, không do L2; bước 1 đã xanh).

### Nợ / câu hỏi cho chủ (L2)
- `tests/e2e/so-dai-ly-dot-2.mjs` (mục I): Quản trị gắn «bên đặt» vào nháp của Đối tác / tài khoản lai → nay 404 (nháp riêng tư, hệ quả L1); cần quyết định cách dựng lại ca (xác nhận trước? cho Đối tác Gửi đơn ở Đợt 3?). Chưa sửa.
- `a2-smoke-order.mjs` đỏ có sẵn (khoá nút Xác nhận khi thiếu ngày); kịch bản Chrome khác còn nhắc ô trả trước: `a2-evidence.mjs`, `v1-xac-nhan-png.mjs`, `qr-smoke.mjs`, `tao-don-thiet-ke-lai/…/than-gui.mjs`, `nhan-noi-safari-smoke.mjs`, `thanh-dinh-smoke.mjs` — chưa chạy, nhiều khả năng cần sửa.
- Sổ `/api/ledger*` hiện mã nháp cũ có khoản thu cho văn phòng (xem Rà billing) — quyết sau Step 0.
- Hướng dẫn Đối tác: chỉ sửa câu bước 6 (mâu thuẫn trực tiếp); phần còn lại của Trợ giúp Đối tác để Task 3.5.

## K1 26/10 (người kiểm độc lập Đợt 2 báo «đạt có điều kiện»; trợ lý thi công sửa)
Đã sửa: P1 `GET /api/dispatch/handlers` lọc nháp người khác; P2 `tests/e2e/so-dai-ly-dot-2.mjs` mục 6 dựng ca bằng SQL; P3 bài `donCuaNguoiDat` có nháp lệch tiền; P4 `tu-choi-truoc`, `han-muc-tu-choi` vào cổng nháp (route `han-muc-tu-choi` nay 404 cho đơn không tồn tại, trước đó 403 «không phụ trách»). Ghi nhận, KHÔNG sửa mã:
- Ghi thu trên nháp người khác trả 404 đứng TRƯỚC kiểm ô quyền; chữ Đ7 nói 409 — 404 là suy diễn từ Đ1/Đ2. Chờ chủ xác nhận.
- `GET /api/orders/nguoi-lap` lộ ngày `ganNhat` của người chỉ có nháp (dấu hiệu có nháp, không lộ nội dung). Chờ chủ quyết.
- Route ghi billing trên nháp người khác trả 409/403 chứ không 404 (kênh dò sự tồn tại, xem dòng «lưới hở chấp nhận được» ở `docs/SO-HANG-RAO.md`).
- `tests/e2e/orders.mjs` từng bỏ vòng 403 «SALES khác/kế toán/FIELD» của nháp mà dòng `console.log` vẫn khẳng định; đã đặt lại vòng ấy trên đơn ĐÃ XÁC NHẬN (sửa chuyến, huỷ ⇒ 403) và sửa dòng log.


## Lần giao L3 (26/10, trợ lý thi công; Task 3.1 + 3.2 + 3.2b — CHƯA kiểm độc lập)

**Phạm vi**: nền của bước xác nhận (ADR-0136) — chưa có route nào của bước xác nhận (Task 3.3 trở đi), chưa giao diện. Luật thuần `src/shared/xac-nhan-don.ts` (`canXacNhan` ba bước, `hanXacNhan`, `duocQuyetDinh`, `KetQuaXacNhan`) và `src/shared/gui-don-cau-bao.ts` (`CAU_BAO_GUI_DON` nguyên văn); migration `0119_yeu_cau_xac_nhan.sql` (ba bảng); hai ô quyền; tách lô xác nhận.

**Số migration**: `0119`. Kiểm ngay trước khi tạo tệp (fetch `origin --prune`, mọi nhánh cục bộ + xa chưa gộp, mọi worktree): `main` có tới `0118_muc_ta_gan_rieng`; số cao nhất ở các nhánh khác là `0118` (16 nhánh), `0117` (5), `0115` (2), `0098` (2 nhánh cũ); không nhánh hay worktree nào giữ `0119` trở lên.

**Rulings**
- `hanXacNhan`: gửi trong khoảng 22:00–06:00 ⇒ đồng hồ chạy từ 06:00; gửi sát 22:00 ⇒ phần 15 phút còn thiếu tính tiếp từ 06:00 hôm sau; hạn đúng 22:00 (21:45 + 15) vẫn là 22:00 cùng ngày (không đẩy sang sáng). Trả ISO UTC, giữ giây lẻ.
- `canXacNhan`: dịch vụ nhập tay (`ma` null) không bao giờ cần xác nhận; giá trị tường minh `false` của dòng dịch vụ thắng dòng nhóm `true` và ngược lại.
- Bảng `ord_confirm_request`: trigger tách bốn cái (đã khép thì không sửa; bất biến đơn / người gửi / hạn; khép phải đủ trường; `RUT_LAI` không có vé, kết quả khác phải có vé). Giá trị `outcome`, `ticket`, `scope` kiểm ở mã, không `CHECK` liệt kê. Thêm `created_by`, `updated_by` (bài kiến trúc ADR-0003 đòi cột kiểm toán WHO) — kế hoạch không liệt kê hai cột này.
- Hai ô quyền: đúng giá trị kế hoạch. `order.submit` của Quản trị = `none` nên thêm vào `ADMIN_NONE_OPS` của `permissions.test.ts`. `can()` lấy HỢP nên tài khoản lai (Bán hàng + Đối tác) có cả hai ô; cổng cho tài khoản lai đặt ở route (Task 3.3, 3.4). `order.modify` giữ giá trị; chỉ đổi chú thích và mô tả ở `TEN_THAO_TAC` (thêm câu «Đối tác không bấm Xác nhận đơn mà bấm Gửi đơn»); kho trợ lý sinh lại bằng `node scripts/sinh-so-do-trang.mjs`.
- Task 3.2b: `soanXacNhan` (repository) trả `{ at, cau }`, `daXacNhan(kq)` đọc chỉ số 1; `confirmOrder` là vỏ mỏng. Tệp mới `src/modules/orders/xac-nhan-chung.ts` giữ `kiemCongXacNhan` (các cổng R2 giá, người lớn, chọn đón, [mốc khi `kiemMoc`], bản chụp mức, R3 trần), `kemChupXacNhan`, `dichLoiXacNhan` (lỗi trigger), `chanDoanXacNhan` (lô thua), `chayLoNoiChuyen`, `tienChoHoaHong` và các hằng phản hồi `STALE`, `RACED`, `GIA_DANH_MUC`, `TRAN_GIAM_GIA`, `MOC_CHUA_CO`; `index.ts` import lại từ đó. `POST /status` nhánh `confirmed` gọi các hàm này, cùng thứ tự cổng và câu lỗi. Khác biệt duy nhất: nếu `findOrder` trả null (không thể xảy ra sau `getMeta` vì không xoá cứng đơn) nay trả 404 thay vì rơi sang lô thua.
- `kiemCongXacNhan.mocToiThieu` nhận giá trị đã gọi `ctx.mocToiThieu()` MỘT lần (TC-26). `kiemMoc = false` dành cho lúc chỉ GỬI yêu cầu (mốc chỉ chặn ở Còn vé).

**Bài đỏ → xanh**: `xac-nhan-don.test.ts` + `gui-don-cau-bao.test.ts` đỏ (thiếu mô-đun) → 14/14 xanh; `migrations-xac-nhan.test.ts` 0/9 đỏ → 9/9 xanh; ghim ô quyền: 7 bài đỏ ở `permissions.test.ts` (kèm ghim hàng Đối tác ở `xem-don-theo-quyen.test.ts`) khi đã thêm bảng kỳ vọng mà chưa có ô → thêm ô còn đỏ 6 (tên trợ lý, `ADMIN_NONE_OPS`, tệp sinh) → xanh sau khi thêm `TEN_THAO_TAC`, `ADMIN_NONE_OPS`, chạy bộ sinh; `soan-xac-nhan.test.ts` 0/4 đỏ → 4/4 xanh. Đột biến đã quan sát: xem dòng cuối `docs/SO-HANG-RAO.md` (26/10).

### Nợ / điều chưa làm (L3)
- `ORDER_CONFIRM` (`chang-hanh-khach-repo.ts`) chưa nhận vế «yêu cầu còn mở» và `auditStatement` chưa có id riêng cho khuôn `wonGuard` mà Task 3.2b nêu: hôm nay chưa có nơi dùng nên thêm sẽ là mã chết không có bài; làm cùng Task 3.3 (nơi gọi đầu tiên) kèm bài đua.
- `src/permission-enforcement.test.ts` đỏ có chủ đích tới Task 3.3, 3.4 (chưa có `can(…,"order.confirm.review")`, `can(…,"order.submit")` ở route).
- `kiemCongXacNhan`, `chanDoanXacNhan`, `dichLoiXacNhan` chưa có bài riêng; được các bài `/status` hiện có (e2e `orders`, `dat-gap*`, `tran-giam-gia-don`, `thuc-tap-gia-route`) canh gián tiếp.
- Trigger chặn `RUT_LAI` có vé / quyết định thiếu vé chưa đột biến riêng.

**Đo cuối L3 (26/10)**: `npm test` 6311 bài, 6310 đạt, 1 đỏ CÓ CHỦ ĐÍCH (`permission-enforcement` hàng rào 1: «order.confirm.review, order.submit» chưa có lời gọi can() — hết ở Task 3.3, 3.4); bài đo giờ hook 1/1 xanh. `typecheck` 0 lỗi, `build:web` xanh. e2e `permissions orders dispatch nhap-rieng-tu` 7/7 xanh (196 giây, migration 0119 áp trên D1 local tạm, `audit-invariants` cuối xanh).

## Lần giao L4 (26/10, trợ lý thi công; Task 3.3 — CHƯA kiểm độc lập)

**Phạm vi**: route của bước xác nhận (ADR-0136): `POST /api/orders/:id/gui-xac-nhan`, `…/rut-xac-nhan`, `…/quyet-dinh`; `GET /api/orders/cho-xac-nhan`; `GET|POST /api/cai-dat/xac-nhan-don`; khoá khi chờ; nhánh đọc đã cắt cho người xét duyệt (Đ6); lịch chung nối yêu cầu mở. KHÔNG làm 3.3b (chạy tạm Hướng 2: không sửa tiền khi chờ), 3.4, giao diện. Không migration mới.

**Rulings**
- Cờ chưa có dòng nào ⇒ không cần xác nhận; công tắc `self_confirm_internal` không có dòng ⇒ TẮT (migration gieo 1 nên thực tế bật).
- DTO xét duyệt cắt cả `customerName` (chặt hơn kế hoạch, vì ADR không cho phép tên khách ở đó); lịch sử, `suaSoKhach`, `canhBaoKhuyenMai` rỗng / null; `canModify` false.
- Hết vé: máy chủ tự gán lý do `HET_CHO` (nhóm Công ty huỷ) không hỏi `order.cancel.classify`; Huỷ dùng `docLyDoHuy`.
- Gửi và Rút lại đều đẩy `orders.updated_at` (câu `orderTouchDraft`): nếu không, Hết vé / Huỷ chỉ khoá theo `status` + `updated_at` nên huỷ vẫn thắng sau Rút lại.
- Khép yêu cầu đứng SAU câu xác nhận trong lô (khác chữ ADR Đ7 — đã ghi ở kế hoạch); câu khép gác bằng id nhật ký của lô thắng (`wonGuard`), mọi câu đổi giờ / ngày mang cùng điều kiện «yêu cầu còn mở VÀ đơn nháp đúng mốc».
- Bước mở yêu cầu chỉ kiểm chọn Đón / Không đón (không chạy R2, R3 — giá của Thực tập xét theo người bấm Còn vé); chặng dưới mốc KHÔNG bị từ chối lúc gửi (chính nó đưa đơn vào diện `DAT_GAP`); mốc 6 giờ chỉ chặn ở Còn vé, tính trên giờ / ngày MỚI.
- Bên cầm yêu cầu đã khép của đúng đơn ⇒ 409 `RACED`; nháp không chờ của người khác ⇒ 404 (ADR-0135 Đ2).
- Cờ chỉ đặt cho mã danh mục có thật (qua `getEffectiveServices`) hoặc nhóm ĐANG CÓ dịch vụ (qua view `v_ctl_service_group`); nhóm tồn tại nhưng chưa có dịch vụ ⇒ 400 (lệch nhỏ so với «nhóm có thật»; không có view công bố liệt kê nhóm). Gửi đúng trạng thái đang hiệu lực ⇒ 200, không ghi dòng.
- `daThuCuaDon` = `tienNhieuDon().daThu` của billing (đã loại dòng đảo, trừ hoàn tiền khách); `null` ⇒ 503 `khoan_thu_chua_kiem`.
- Ba route mới kiểm Đã giao trước mọi bước khác (bài NT-F7); `POST /api/cai-dat/xac-nhan-don` là miễn trừ có tên của bài đó.
- `src/architecture.test.ts`: thêm tên hai câu vào `DOC_AUDIT_LOG_WONGUARD` (mở rộng danh sách nợ có hạn của `orders`) — người kiểm độc lập nên xét lại. Hàng rào 2 (`route-write-guard`) nay đọc cả tệp route phụ `xac-nhan-route.ts` (`TEP_ROUTE_PHU`) và có bài canh việc đó.
- Bài trợ lý `tro-ly-van-nghia` đo lại 45 → 46 (mô tả ô `order.confirm.review` của L3 có chữ «người lập đơn»); không phải do L4.
- E2E cũ phải đổi: `chang-hanh-khach.mjs` (9: `/status` dưới mốc nay trả `confirm_request_required` trước, rồi người lập tự đặt gấp), `tai-xe-cuoc.mjs` (người lập đặt gấp thay Quản trị — vốn đã 404 từ ADR-0135).

**Bài đỏ → xanh** (mỗi nhóm viết bài đỏ trước, thấy đỏ, rồi mới cài): lát 1 `xac-nhan-route.test.ts` 11 bài; lát 2 `xac-nhan-quyet-dinh.test.ts` 14 bài (có đua thật bằng `w.chenTruocLo`); lát 3 `xac-nhan-doc.test.ts` 5 bài; lát 4 `xac-nhan-cai-dat.test.ts` 8 bài (8/8 đỏ khi chưa có route); lát 4b thêm bài (q) vào `xac-nhan-doc.test.ts` (đỏ → xanh). Viết lại TC-22 trong `dat-gap.test.ts`. Đột biến đã quan sát đỏ → hoàn nguyên: xem dòng ADR-0136 L4 ở `docs/SO-HANG-RAO.md` (M1–M9, M11–M22).

**Đo cuối L4**: `npm test` 6351 bài, 6346 đạt, 1 đỏ CÓ CHỦ ĐÍCH (`permission-enforcement` hàng rào 1: ô `order.submit` chưa có `can()` — chờ Task 3.4); bước đo giờ của hook xanh. `npm run typecheck` 0 lỗi; `npm run build:web` xanh. `npm run test:e2e -- xac-nhan-don permissions orders dispatch nhap-rieng-tu chong-ghi-trung dong-bo-chuyen chang-hanh-khach tai-xe-cuoc`: 12/12 xanh (3 nhóm, 143 giây; có kiểm lớp vé). `node scripts/audit-invariants.mjs --db local` trên D1 local trống của worktree: 1 vi phạm R-N1-5 (không có quản trị viên nào trong CSDL trống — không liên quan L4); bản trong e2e chạy trên D1 tạm có tài khoản và xanh.

### Nợ / điều chưa làm (L4)
- `khoaKhiCho` chưa phủ route giao người phụ trách (`dispatch`) và các route văn phòng `thuong-mai`, `chup-bu` trên đơn đang chờ.
- Tin báo Đ10 (lúc gửi / lúc quyết định) thuộc Task 3.5; `baoThayDoi` dùng «sua» cho Gửi / Rút, «xac_nhan» / «huy» cho quyết định (chưa thêm loại `cho_xac_nhan`).
- Vế «yêu cầu còn mở» trong `ORDER_CONFIRM` là lớp phòng thủ thêm: đột biến bỏ nó không đỏ (khoá `updated_at` đã che) — không tính là hàng rào.
- Ca (n) khoản thu: bài khung thử dùng `daThuGia` / `khongTiemDaThu` (nháp không ghi thu được qua API từ L2); không có ca e2e. Ca (q) lịch chung: bài khung thử, không e2e.
- Ca Đối tác (Gửi đơn) và 409 `partner_submit_required` ở `/status` thuộc Task 3.4 (có comment đánh dấu chỗ đặt).
- E2E `xac-nhan-don` không khẳng định cờ `quaHan` (phụ thuộc đồng hồ thật).

## Lần giao L5 (26/10, trợ lý thi công; Task 3.4 — CHƯA kiểm độc lập)

**Phạm vi**: `POST /api/orders/:id/gui-don` (nhánh A / nhánh B); 409 `partner_submit_required` ở `/status` (confirmed) và `gui-xac-nhan` chỉ chặn NGƯỜI LẬP giữ quyền Đối tác; chuyển bài và kịch bản đang cho Đối tác tự xác nhận sang Gửi đơn. KHÔNG làm Task 3.3b, giao diện (Task 3.5), cổng «luật bán» (lượt 2). Không migration mới. Hai commit: route Gửi đơn (`2cf26240`), rồi đóng đường cũ + chuyển bài (`ff85c724`); commit nhật ký/sổ hàng rào/sửa e2e sau đó.

**Rulings (bề mặt, đảo được)**
- Thứ tự cổng của `gui-don`: nháp của người khác 404 (ADR-0135 Đ2) đứng TRƯỚC `can(order.submit)` 403 (kế hoạch ghi 403 trước): Thực tập hay Bán hàng gọi trên nháp CỦA MÌNH vẫn 403, trên nháp người khác 404. Rồi đã giao → không phải nháp (409 `order_not_draft`) → đã có yêu cầu mở (409 `confirm_already_open`) → `kiemCongXacNhan`.
- Thứ tự cổng trong `kiemCongXacNhan` giữ như `/status` hôm nay: R2 giá danh mục → người lớn → chọn Đón → R3; kế hoạch liệt kê chọn Đón trước R2/R3. Không thêm bước kiểm chọn Đón riêng ở route (một nguồn).
- Mốc tối thiểu ở Gửi đơn chỉ cần CÓ (không có → 503 `moc_toi_thieu_chua_co`, vì `canXacNhan` cần mốc để phân nhánh); chặng dưới mốc chưa đặt gấp đi nhánh A (`DAT_GAP`), mốc chỉ chặn lúc Còn vé.
- Nhánh A và `gui-xac-nhan` dùng chung hai hàm trong `xac-nhan-route.ts`: `moYeuCau` (lô mở yêu cầu) và `chanKhoanThu` (khoản thu, 503 khi chưa kiểm). Nhánh B không kiểm khoản thu (đúng «hai câu còn mở đã chốt»).
- Nhánh B ghi nhật ký `confirmed` với chữ «tự xác nhận khi Đối tác gửi đơn» kể cả khi người gửi là Toàn quyền (kế hoạch giả định người gửi là Đối tác); người gửi không nhận tin vì tin bỏ qua người làm.
- Ô `order.submit` là cổng duy nhất của quyền (không kiểm `holdsPartner`); Toàn quyền gửi được nháp của chính mình — có bài ghim.
- Cổng `partner_submit_required` đặt ngay sau `can()` ở `/status` (chỉ khi đích là confirmed và đơn là nháp của chính người gọi) và ở `gui-xac-nhan`; hàm `phaiGuiDon` + câu `PHAI_GUI_DON` ở `xac-nhan-route.ts`. Không đặt trong `kiemCongXacNhan` (bài đột biến G11 chứng minh đặt ở đó thì Gửi đơn tự chặn mình).
- Khung thử: `tests/audit/harness.mjs` thêm hàm `w.xacNhanDon(id, as)` chọn đường theo quyền (người giữ PARTNER → Gửi đơn, còn lại `/status`) để các bài giá / trần / hoa hồng / biên nhận giữ nguyên kỳ vọng ghi quyền. Kịch bản e2e dùng cách thử `/status` rồi Gửi đơn khi gặp đúng `partner_submit_required`.
- Dòng `POST /api/orders/:id/gui-don` thêm vào ảnh chụp truy cập (382 route), bảng CA của NT-F7 (`sau-da-giao.test.ts`), và `src/shared/tro-ly-cau-truc.ts` sinh lại (mục «Việc: gửi đơn»).

**Bài đỏ → xanh**: `gui-don-route.test.ts` 7 bài (ca 1, 2, 3, 4b, 5, 6, 7 — 8/8 đỏ khi chưa có route, vì 404; sau cài 7 xanh; ca 5 thêm nhánh người lớn, ca 6 thêm Toàn quyền gửi nháp mình); `gui-don-dong-duong-cu.test.ts` 1 bài (ca 4a — đỏ vì `confirm_request_required` thay `partner_submit_required`, xanh sau cổng). Sau khi bật cổng, `npm test` đỏ 70 bài ở 19 tệp (đo lại số kế hoạch ghi ≥ 36 / 10 tệp: nhiều hơn vì có cả bài billing, biên nhận, lọc đơn…); sửa bằng hàm `xacNhanDon` hoặc đổi sang `gui-don`: `da-giao-thuong-mai`, `lich-su-don-doi-tac`, `billing/ben-kia*`, `so-cong-no-ben`, `so-du-bang-tong-dong-no`, `dispatch/tu-choi`, `ben-dat-doi-tac`, `dat-gap-hien-thi`, `dat-gap` (TC-22: Đối tác nhận `partner_submit_required` rồi Gửi đơn nhánh A), `hanh-khach-route`, `loc-don-route`, `thuc-tap-gia-route`, `thuong-mai-route`, `tran-giam-gia-don`, `receipt/bien-nhan`, `thongbao/tin-doi-hop`, `so-la-doi-tac`, `so-la-thuong-mai-toan-nen-tang`. KHÔNG nới kỳ vọng ghi quyền (R2/R3 vẫn 403 câu cũ).
- Commit 1 (`2cf26240`) kiểm riêng ở bản chép sạch: `dat-gap`, `xac-nhan-*`, `gui-don-route`, `permission-enforcement`, `route-access`, `route-write-guard`, `sau-da-giao`, `tro-ly-cau-truc`, `architecture`, `permissions` — 199 bài xanh. (Bản đầu của commit 1 đã làm lại vì đỏ `dat-gap` TC-22 và thiếu bản sinh lại; commit chưa đẩy lên đâu.)
- E2E sửa: `nhap-tay-va-gia-doi-tac.mjs` (`confirm` thử `/status` rồi Gửi đơn; ca 9f dựng nháp có nhập tay bằng SQL vì từ ADR-0135 Quản trị không sửa được nháp của Đối tác, Quản trị xác nhận thay nay 404), `nhap-ke-toan.mjs`, `so-dai-ly-dot-2.mjs`, `dispatch.mjs` (`newOrder`), `permissions.mjs` (Đối tác «Gửi đơn» + ca `order.submit` mới); kịch bản mới `tests/e2e/gui-don.mjs` (ca 1, 2, 4, 6) đã vào `run.mjs`.

**Đột biến đã quan sát** (đỏ → hoàn nguyên → xanh): xem dòng ADR-0136 L5 ở `docs/SO-HANG-RAO.md` (G1–G13, K1–K4).

**Đo cuối L5**: `npm test` 6356 bài (6355 bộ chính + 1 bài đo giờ của hook), 0 đỏ — `permission-enforcement` hàng rào 1 xanh THẬT (lời gọi `can(…,"order.submit")` nằm trong route Gửi đơn). `npm run typecheck` 0 lỗi; `npm run build:web` xanh. `npm run test:e2e -- gui-don xac-nhan-don permissions orders dispatch nhap-rieng-tu so-dai-ly-dot-2 chong-ghi-trung nhap-tay-va-gia-doi-tac nhap-ke-toan`: lần đầu 3 đỏ (`permissions` Đối tác xác nhận thẳng, `nhap-tay` ca 9f, `dispatch` `newOrder`), sửa xong chạy lại `permissions` + `nhap-tay` xanh (5/5, 47 giây) và toàn bộ `npm run test:e2e` (75 kịch bản, 615 giây, 3 nhóm, kèm `audit-invariants` cuối và trong từng nhóm): 71 xanh, 4 đỏ — `trip`, `booker`, `cam-ket-xe` đỏ CÓ SẴN trước L5 (xem nợ), `catalog` đỏ một lần rồi xanh khi chạy riêng. `dispatch` sau sửa xanh trong lượt toàn bộ.

### Nợ / điều chưa làm (L5)
- **Nợ L4 «khoá khi chờ»**: route `thuong-mai` / `chup-bu` đã trả 409 `not_confirmed` cho nháp (đơn đang chờ luôn là nháp) nên `khoaKhiCho` ở đó vô nghĩa — đóng. Route giao người phụ trách (`PUT /api/orders/:id/handler`, module `dispatch`): người lập đổi người phụ trách khi đơn đang chờ vẫn được; cạnh `dispatch → orders` có trong `ALLOWED_EDGES` nên làm được (xuất hàm kiểm yêu cầu mở từ `orders/index.ts`), nhưng ADR Đ3 chỉ cấm «sửa, xác nhận, huỷ» chứ không nói đổi người phụ trách — để chủ quyết, chưa làm.
- Ca (n) khoản thu và (q) lịch chung của Task 3.3, ca (3) chặng dưới mốc và (7) khoản thu của Task 3.4 chỉ có ở bài khung thử, không e2e (nháp không ghi thu được qua API; chặng dưới mốc phụ thuộc đồng hồ thật).
- Phần `meta.staffId === staff.id` của `phaiGuiDon` không quan sát được riêng (ADR-0135 Đ2 trả 404 trước) — không tính là hàng rào.
- Cổng «luật bán» chưa có (lượt 2); chỗ móc: ngay sau `kiemCongXacNhan`, trước phân nhánh.
- Tài khoản lai Kế toán + Đối tác: không làm (bộ nhớ dự án: không thể tồn tại; R-LC-1 chưa bắt lai chỉ theo mã quyền — nợ có sẵn, chờ chủ chọn lưới).
- E2E đỏ CÓ SẴN ở `main` của nhánh trước L5 (đã xác nhận trên bản chép sạch của `9a93e175`): `trip` (`trip.mjs:163`), `booker` (`booker.mjs:188`), `cam-ket-xe` (`cam-ket-xe.mjs:62`) — Quản trị / Bán hàng khác xác nhận hoặc sửa nháp của người khác nay 404 (ADR-0135 Đ2); không phải do L5, không sửa vì ngoài phạm vi. `catalog` đỏ một lần trong lượt chạy toàn bộ (`bootstrap song song ghi nhật ký đồng bộ 0 lần`), chạy riêng xanh: có vẻ do tải máy, chưa tái hiện.

## Lần giao L6 (26–27/10, trợ lý thi công; Task 3.5 — CHƯA kiểm độc lập)

**Phạm vi**: giao diện bước xác nhận đơn và «Gửi đơn». Làm: trang đơn (khối `xacNhan` do máy chủ gửi; nút «Gửi đơn» / «Gửi xác nhận» / «Rút lại», dải «Chờ xác nhận», bảng «Xác nhận đơn» Còn vé / Hết vé / Huỷ, ảnh xác nhận chỉ sau khi đã xác nhận); form lập đơn («Gửi đơn» = lưu rồi gửi; gửi hỏng thì vào trang nháp vừa lưu, không tạo nháp trùng); trang `/cho-xac-nhan`; thẻ Trang chủ «Đơn chờ xác nhận» (máy tính + dải điện thoại); ô Điều phối đổi chữ thành «CHỜ XÁC NHẬN»; tin báo Đ10; Trợ giúp Đối tác nói «Gửi đơn». KHÔNG làm: Task 3.3b, kịch bản Chrome cũ (L7), gỡ ô lọc dịch vụ (L8). Commit theo thứ tự: `1653a01d` (khối `xacNhan`), `5717e879`, `f375cc76`, `2f871d73`, `3504803e`, `c989a11e` (Trợ giúp).

**Rulings (bề mặt, đảo được)**
- Giao diện chỉ ẩn/hiện theo cờ máy chủ gửi (`canXacNhan`, `quyetDinhDuoc`, `yeuCau`); hạn do máy chủ tính, giao diện chỉ đổi ra chữ («còn N phút» khi ≤ 60 phút, còn xa thì nói giờ hạn). Địa chỉ không mang SĐT/tên: chỉ một chữ cái nhánh `gui=A|B` và cờ `guiloi=1`; câu lỗi máy chủ để ở `sessionStorage`.
- Người xét duyệt (không phải người lập) thấy trang đơn chờ đã cắt: không tên / SĐT / ghi chú khách, không hành khách, không biên nhận, không ảnh.
- Mục «Chờ xác nhận» ở thanh bên KHÔNG thêm (trần 10 mục và bài HDV): chỉ là trang (`TRANG`, `TRANG_TOI`) + thẻ Trang chủ, đúng điều kế hoạch yêu cầu.
- Tin báo: nhãn kết nối Bảng tin mới `xet-duyet` cho nháp đang chờ (nháp riêng tư ADR-0135: chỉ người lập và người giữ `order.confirm.review`); Đối tác nhận tin xác nhận / huỷ của đơn MÌNH lập, câu tin không kèm tên người làm.
- Trợ giúp Đối tác: bài khoá chữ + tên nút (không còn «Lưu, chờ xác nhận» / [[Xác nhận đơn]], có «Gửi đơn», «Rút lại», hai câu báo nguyên văn). Bộ xếp hạng của Trợ lý rất nhạy với độ dài chữ: một câu «Đơn đi vào nhánh chờ xác nhận, và văn phòng phải … rồi mới xác nhận được» làm bài Đ6 đỏ — đã rút gọn, KHÔNG nới bài. Không thêm mục vào Hướng dẫn Bán hàng (làm đỏ A4 30 phút và các bài trợ lý).
- Các bài đã khoá giá trị cũ được cập nhật theo luật mới (hợp lệ): `THAY_DOI` 13 giá trị, `nhanKetNoi` thêm `xet-duyet`, `web-push` ánh xạ, `viec-cua-ban` / `pham-vi-so` (thẻ `donCho`), `thong-bao.test.ts` (Đối tác chủ đơn nay nhận tin xác nhận).

**Nhãn chữ MỚI cần chủ duyệt**: «Gửi xác nhận» / «Rút lại» (từ kế hoạch Task 3.5, chưa chủ duyệt riêng), «Cần Quản trị đặt gấp», «Quá hạn», «Chờ xác nhận · còn N phút», câu giải thích tiền khoá («Đơn đang chờ nên tiền chỉ để xem. Muốn đổi tiền, hãy chọn Huỷ để người lập đơn tạo lại.» — thuộc Hướng 2 tạm), «Đơn chờ xác nhận» / «Kiểm vé» ở thẻ Trang chủ, câu «Đơn đã được lưu nháp nhưng chưa gửi được: …».

**Bài đỏ → xanh** (viết đỏ trước): `order-view-xac-nhan.test.ts` (5), `xac-nhan-hien-thi.test.ts`, `xac-nhan-trang-don.test.ts` (5, khung thử máy chủ), `viec-cua-ban-don-cho.test.ts`, `thong-bao-xac-nhan.test.ts` (7), `huong-dan-doi-tac-gui-don.test.ts` (3).

**Đột biến đã quan sát** (đỏ → hoàn nguyên): khối `xacNhan` ép `choTuXacNhan` thành `true` ⇒ bài `xac-nhan-trang-don` đỏ; Trợ giúp thay `[[Gửi đơn]]` ⇒ `huong-dan-doi-tac-gui-don` đỏ; dời `xac-nhan-hien-thi.ts` ⇒ bài chữ đỏ; kịch bản Chrome: đổi nhãn nút «Gửi đơn» thành «Gửi đơn X» ⇒ kịch bản `xac-nhan-smoke` đỏ 5 bước (rồi hoàn nguyên, xanh 10/10).

**Kịch bản Chrome mới** `docs/evidence/2026-10-26-xac-nhan-don/kich-ban/xac-nhan-smoke.mjs`: 10 bước xanh, có axe (AXE_JS = bản axe-core có sẵn trong cache npx; Chrome qua `chrome-wrap.sh`), ảnh ở `docs/evidence/2026-10-26-xac-nhan-don/anh/` (390 và 1040): Đối tác (nháp, chờ, nhánh B, đã xác nhận), Bán hàng (Gửi xác nhận, chờ), Kế toán (Trang chủ, danh sách, bảng), HDV (danh sách 390 + 1040), Quản trị (Điều phối). Kế toán mở trang sau Đối tác theo bẫy cookie chung. Bước nhánh B kiểm hộp ảnh tự mở theo chữ trên màn («XÁC NHẬN ĐƠN DỊCH VỤ») hoặc hộp thoại mở — chưa kiểm chi tiết hình ảnh PNG (đó là việc của `v1-xac-nhan-png`, đang đỏ có sẵn, xem nợ).

**Hai bài sửa ở lượt đo cuối (hợp lệ, ghi để người kiểm xét)**: `goi-trang-nhe` trần gói Đơn hàng nới 96.700 → 96.800 (vượt 13 byte do dữ liệu `TRANG`/nhãn tin; có chú thích cạnh hằng số, theo tiền lệ ADR-0128) — người kiểm cân nhắc xem có muốn rút gọn thay vì nới; `thong-bao-doi` NT-B9 đổi kỳ vọng: Đối tác / Thực tập nay NHẬN tin xác nhận và huỷ của đơn mình lập (ADR-0136 Đ10), đơn người khác vẫn không.

### Lệch cần chủ xử lý (L6)
- **Cảnh báo ở màn gán nhóm Danh mục (kế hoạch Task 3.5): CHƯA làm, dừng chờ chủ.** Cờ «cần xác nhận» chỉ đọc được qua `GET /api/cai-dat/xac-nhan-don` (cổng `admin`, `settings.ops` = Toàn quyền); màn Danh mục dành cho Quản trị nên Quản trị không đọc được cờ. Muốn cảnh báo phải mở rộng hợp đồng (đưa cờ vào `CatalogAdminGroupDto` / mục danh mục) và nới ai được ĐỌC cờ — chạm quyền và hợp đồng giữa module, theo P8 phải hỏi. Phương án: (a) đưa cờ vào DTO danh mục chỉ cho người giữ `settings.ops`; (b) cho Quản trị đọc cờ (chỉ đọc); (c) bỏ cảnh báo.
- **Giao diện cài đặt cờ «cần xác nhận» (dịch vụ / nhóm, công tắc tự xác nhận nội bộ): chưa có**; kế hoạch xếp vào Task 5.1 (trang Bảng điều khiển, cần ảnh mẫu chủ duyệt trước). Hôm nay cờ chỉ đặt được qua API (đã có route + e2e).

### Nợ / điều chưa làm (L6)
- Kịch bản Chrome CŨ đỏ vì luật mới (thuộc L7, không sửa ở đây): `trang-chu-smoke` (xác nhận đơn có dịch vụ cờ → `confirm_request_required`), `v1-xac-nhan-png` (không còn ô `prepaidAmount` từ ADR-0135), `a2-smoke-order` (bước `incomplete_trip`, đỏ có sẵn). `a2-smoke-form`, `a2-smoke-sheet` xanh. `dat-gap-smoke` báo «OK (0 bước)» — không dựa vào (kịch bản phụ thuộc giờ trong ngày).
- Form lập đơn của Đối tác («Gửi đơn» = lưu rồi gửi, gửi hỏng → trang nháp) chưa có kịch bản Chrome riêng (đã có bài thuần và e2e API); L7.
- Ảnh PNG xác nhận ở nhánh B: kiểm hiện hộp, không đối chiếu pixel.
- Cảnh báo `Hạn xác nhận` hiển thị «hạn 06:15 27/10/2026» khi gửi ban đêm (đúng luật bỏ 22:00–06:00); chữ này chờ chủ xem.

## Lần giao L7+L8 (27/10, trợ lý thi công; Task 3.6 + YC-0013 + dọn nhỏ — CHƯA kiểm độc lập)

**Làm**
- **(B) e2e về xanh:** `trip` (đua lưu-xoá-ngày: `confirm(A, d)` thay `confirm(ADMIN, d)`), `booker` (ca 400 đầu vào sai chạy bằng người lập trên nháp của mình), `cam-ket-xe` (nháp của Đối tác: Đối tác tự «Gửi đơn», nhánh B, thay Quản trị xác nhận thay) — đều do ADR-0135 Đ2 (nháp người khác 404); chỉ đổi CÁCH DỰNG, không nới kỳ vọng quyền / tiền. `catalog` (đỏ một lần «bootstrap song song 0 lần» ở L5): xem số đo cuối.
- **(A) Tài liệu:** nhật ký thay đổi 2.34 (số tạm; `app-info.test.ts` đổi theo), `SYSTEM-DESIGN` §5 (3 bảng, migration 0119), §6 (d2), §7 (6 route), §8 (2 ô quyền), §16 (4 dòng lệch: Đ8 + tiêu chí 8 hoãn; Đ13.5 câu 3 + tiêu chí 4 hiểu hẹp; khép yêu cầu sau câu xác nhận; Đ7 ADR-0135 404 vs 409), `CHANGE-GUIDE` z27 + bẫy 85, `HANDOFF-N1` (khối «ĐANG CHỜ PHÁT HÀNH», KHÔNG ghi đã triển khai), `BACKLOG` §48 tiến độ. `data-dictionary` + `npm run dict`: đã đủ từ L3, không đổi.
- **(D) L8 (YC-0013 gỡ ô lọc dịch vụ): ĐÃ CÓ SẴN trên `main`** từ commit `aa5aa9b9` (24/10, bản 2.29; kiểm độc lập đạt): `web/orders.ts` không còn ô «Dịch vụ», máy chủ vẫn nhận `dichVu`, bộ lọc đã nhớ vẫn mở được và bỏ được bằng chip (`docLocDaNho`). Không có gì để làm thêm.
- **(E) Trần gói trang Đơn hàng trả về 96.700, KHÔNG nới:** rút `thongBaoNoi` (`src/shared/bang-tin.ts`) bỏ nhánh riêng cho `cho_xac_nhan` (dùng lại đường chung, chỉ khác đích liên kết); bỏ `=== true` thừa; sửa dòng `danhBa`/`cuoc` bị dính ở `muc-giao-dien.ts`. Bài bang-tin / thong-bao 83/83 xanh. Không thêm hàng rào nên không có dòng sổ hàng rào mới.
- **(C) Kịch bản Chrome cũ:** theo lệnh điều phối giữa chừng (chủ phàn nàn quá lâu) — KHÔNG sửa bước, KHÔNG chạy lại tiếp. Đã chạy MỘT lượt trước lệnh: xanh `a2-smoke-sheet`, `a2-smoke-form`, `khong-cuon-truoc-smoke`, `than-gui` (mặc định); đỏ: `trang-chu-smoke` (409 `confirm_request_required` ở `createAndConfirm`), `v1-xac-nhan-png` (ô `prepaidAmount` + ghi thu lên nháp), `qr-smoke` (đỏ có sẵn ở bước B axe `#strips`, phần E đã hết hiệu lực), `thanh-dinh-smoke` (6 bước nhắc ô trả trước), `chon-hdv-lap-don-smoke` (đợi nút «Lưu, chờ xác nhận» của form Đối tác, nay «Gửi đơn»), `a2-evidence` (đỏ có sẵn: khoá `pickupTime` đã gỡ từ ADR-0047). Đã ghi một dòng chú thích đầu tệp «thay bằng …» ở 7 tệp (`trang-chu-smoke`, `v1-xac-nhan-png`, `a2-evidence`, `qr-smoke`, `thanh-dinh-smoke`, `nhan-noi-safari-smoke`, `than-gui`) và thêm dòng bảng cho `xac-nhan-smoke` ở `web/CLAUDE.md`. `chon-hdv-lap-don-smoke` chưa ghi chú (đỏ vì chữ nút Đối tác). `a2-smoke-order` đỏ sẵn từ 2ce61247 (không chạy lại); `dat-gap-smoke` báo «OK (0 bước)» là giả — nợ.

### Nợ (L7+L8)
- Kịch bản Chrome cần sửa dựng dữ liệu rồi chạy lại: `trang-chu-smoke` (đặt gấp từng chặng rồi xác nhận lại — bản sửa nhỏ đã thử, hoàn nguyên theo lệnh), `v1-xac-nhan-png` (bỏ ô trả trước; ghi thu sau xác nhận), `thanh-dinh-smoke` (đổi bước trả trước thành «không còn»; bản thử còn đỏ 2 bước thang nút `vienThuoc`, chưa điều tra), `chon-hdv-lap-don-smoke`, `qr-smoke` (axe `#strips` có sẵn), `nhan-noi-safari-smoke` (cần WebKit).
- `dat-gap-smoke` «OK (0 bước)» giả.
- Lệch chờ chủ: cảnh báo ở màn gán nhóm, giao diện cài đặt cờ, cổng giao người phụ trách khi đơn chờ (xem L5/L6).
