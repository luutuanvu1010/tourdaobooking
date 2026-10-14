# Đợt 2 lượt 1 — Bật/tắt đưa đón theo nhóm và điểm chọn nhanh: Kế hoạch thi công

> **Dành cho người thi công:** dùng `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans`; mỗi task có `- [ ]`. **Chưa được bắt đầu** cho tới khi chủ DUYỆT văn bản ADR-0118 (Task 0). Người kiểm (Task 7) là phiên khác, chỉ đọc.

**Mục tiêu:** thi hành ADR-0118 (đề xuất): cờ "Có đưa đón" theo nhóm dịch vụ, máy chủ từ chối ghi/xác nhận chặng cho dịch vụ thuộc nhóm tắt; cờ "Chọn nhanh" theo địa điểm và hàng nút chọn nhanh ở form Tạo đơn. **Không có tiền** (lượt 2 là ADR khác).

**Kiến trúc:** một migration chỉ-thêm (`ctl_group.transfer_enabled`, view `v_ctl_service_transfer`, `loc_location.quick_pick_order`, gieo hai điểm). Luật "nhóm cho đưa đón" là MỘT hàm thuần ở `catalog` (xếp cờ cho form) cộng MỘT chốt chặn có I/O ở `orders` gọi từ năm cửa; `orders` chỉ đọc view công bố. Giao diện ẩn/hiện, không phải cổng.

**Công nghệ:** TypeScript, SQLite/D1, `node --test`, giao diện thuần `h()`, `tests/e2e/*.mjs`, kịch bản Chrome.

**Đặc tả (đọc trước):** `docs/superpowers/specs/2026-10-14-dot-2-luot-1-dua-don-theo-nhom-va-diem-nhanh/{de-xuat-adr.md,trang-ghep.md}` (ADR-0118 sau khi duyệt chuyển vào `docs/adr/` và **thắng khi lệch**) và `docs/superpowers/specs/2026-10-14-dot-2-gia-dua-don.md` §3.3.

## Bảng việc

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 0 | Điều kiện: chủ duyệt ADR-0118, đọc sổ hoãn, nhánh mới từ `main`, số migration | ADR ở `docs/adr/`; `npm test` xanh trên nhánh mới | chưa |
| 1 | Migration + từ điển dữ liệu + bài migration | N-1…N-3 xanh; `npm run dict` khớp | chưa |
| 2 | `catalog`: hàm thuần, route nhóm nhận `transferEnabled`, DTO, nhật ký | N-4…N-7 xanh | chưa |
| 3 | `orders`: chốt chặn ở năm cửa + hàng rào kiến trúc | N-8…N-13 xanh; hàng rào quan sát đỏ một lần | chưa |
| 4 | `locations`: `quickPickOrder` ở route, DTO, kiểm đầu vào | N-14…N-16 xanh | chưa |
| 5 | Giao diện: form (ẩn khối, nút chọn nhanh), Danh mục, Địa điểm; kịch bản Chrome | N-17…N-20 xanh; ảnh thật hai khổ chủ duyệt | chưa |
| 6 | Tài liệu sống, nhật ký thay đổi 1.97, Trợ giúp, sổ hàng rào, e2e | `typecheck`, `npm test`, `npm run test:e2e` xanh | chưa |
| 7 | Người kiểm độc lập | Báo cáo "đủ trình chủ", không còn "Chặn" | chưa |

Báo chủ dạng "xong x / 8". Mỗi task kết thúc bằng một commit tiếng Việt (tiêu đề nói việc, thân nói vì sao).

## Ràng buộc chung
- Tiếng Việt có dấu mọi chữ hiện ra; gọi "Nền tảng"; nhật ký không ghi SĐT/email/MST/tên khách.
- Không `innerHTML`, dùng `h()`; giá trị CSS vào token; ô gõ 16px; nút bấm ≥ 44px.
- Không sửa migration đã có; số migration kế tiếp từ `0096` (kiểm lại ở Task 0 bằng `ls migrations` và `git ls-tree` của mọi nhánh chưa gộp). Trigger không bắt đầu bằng `stf_`/`staff_`.
- Câu SQL mới của module nghiêm đi qua `defineSql`; `orders` chỉ import module khác qua `index.ts` và chỉ đọc view `v_<tiền tố>_*`.
- Sửa hành vi → bài **đỏ trước, xanh sau**. Hàng rào mới phải quan sát **chặn thật một lần** rồi ghi `docs/SO-HANG-RAO.md`.
- Việc lớn (dữ liệu): người thi công không tự khai "đạt"; Task 7 do phiên khác làm.
- Không chạm `buildLines`, `billing`, sổ tiền, `ord_transfer_leg` (cấu trúc), bản đồ quyền.

## Xây trên lỗ đang hở
Đọc `docs/quyen-hoan.json` ngày 2026-10-14: TNV-G1/G3/G4, HC-4.2, HC-5.19 (hạn 2026-10-31) và HC-5.11 (hạn 2026-11-15). Lượt 1 **không ghi tiền, không đụng `billing`/`hoan-tat-repo.ts`, không tạo bút toán, không đụng Cron** → **không xây trên lỗ nào**. Người thi công đọc lại tệp ở Task 0 và ghi kết luận kèm "cần người kiểm xác nhận bằng diff". Cổng ngày hạn: từ 2026-11-01 `src/phat-hien-han.test.ts` làm `npm test` đỏ mọi nhánh nếu chủ chưa đóng/gia hạn năm mục hạn 31/10.

## Task 0 — Điều kiện (không viết mã)
- [ ] Chủ đã duyệt văn bản ADR-0118 trong chat; ADR được chuyển vào `docs/adr/ADR-0118-….md` (công cụ sửa tệp, N9) và `docs/adr/README.md` thêm dòng mục lục. Chưa duyệt → **dừng**, không thi công.
- [ ] Nhánh mới dựng trên `main` mới nhất; `npm test` và `npm run typecheck` xanh trước khi sửa.
- [ ] Số migration = số lớn nhất trong `migrations/` + 1, đã rà mọi nhánh chưa gộp (dự kiến `0096`).
- [ ] Ghi sổ điều phối `docs/superpowers/plans/2026-10-14-dot-2-luot-1-thi-cong-nhat-ky.md` (ruling, nợ).
- [ ] **Chủ chạy một câu đếm chỉ-đọc** (người thi công soạn lệnh, kèm thư mục): hai mã `CANG_VINPEARL`, `BEN_TAU_NHA_TRANG` còn tồn tại và `active = 1` trên D1 thật không; ghi kết quả vào nhật ký thi công. Nếu thiếu: bỏ phần gieo ở Task 1, báo chủ thêm điểm bằng màn Địa điểm.

## Task 1 — Migration và từ điển dữ liệu
**Tệp:** `migrations/0096_dua_don_theo_nhom_va_diem_nhanh.sql` (tên chốt ở Task 0), `docs/data-dictionary.json`, `docs/DATA-DICTIONARY.md` (sinh bằng `npm run dict`), bài mới `src/migrations-dua-don-nhom.test.ts` (khuôn `src/migrations-mau-chang.test.ts`).
- [ ] **Bài đỏ trước:** N-1 `ctl_group` có cột `transfer_enabled` mặc định 1 cho cả 14 nhóm gieo; chèn giá trị 2 bị CHECK chặn. N-2 view `v_ctl_service_transfer`: dịch vụ thuộc nhóm tắt → 0; chưa phân loại → 1; mã không có dòng gán → 1; nhóm hiện hành đổi (dòng `seq` lớn nhất) thì view đổi theo. N-3 `loc_location.quick_pick_order` NULL mặc định, 0 và 100 bị CHECK chặn; hai điểm gieo có 1 và 2 (nếu tồn tại), điểm khác NULL; chạy migration trên D1 thiếu hai mã không lỗi.
- [ ] Viết migration (`ALTER TABLE … ADD COLUMN`, `CREATE VIEW`, `UPDATE … WHERE code IN`). View: `catalog_item` LEFT JOIN `v_ctl_service_group` LEFT JOIN `ctl_group`, `COALESCE(g.transfer_enabled, 1)`.
- [ ] Cập nhật `docs/data-dictionary.json` (2 cột, 1 view) + `npm run dict`; chạy `node --test src/migrations-dua-don-nhom.test.ts src/architecture.test.ts`.
- **Expected:** bài N-1…N-3 đỏ rồi xanh; kiến trúc xanh (view đúng tiền tố `v_ctl_`).

## Task 2 — `catalog`: luật thuần, route nhóm, DTO
**Tệp:** `src/modules/catalog/nhom-rules.ts` (+ test), `nhom-repo.ts` (+ test), `index.ts`, `src/shared/contracts.ts`.
- [ ] **Bài đỏ trước:** N-4 `PATCH /api/catalog/groups/:code` nhận `transferEnabled` boolean; kiểu khác → 400; không kèm khoá lạc quan → 400; mốc lệch → 409 như hôm nay; không đổi gì → trả nhóm, không nhật ký. N-5 đổi cờ ghi **một** dòng `catalog_group_updated` có "đưa đón: bật → tắt"; Bán hàng/Kế toán → 403, không ghi. N-6 `CatalogServiceDto.transferEnabled` ở `GET /api/catalog/for-order` đúng theo nhóm (kể cả Đối tác, Thực tập); nhóm tắt → mọi dịch vụ của nó `false`, chưa phân loại → `true`. N-7 `CatalogAdminGroupDto.transferEnabled` ở `GET /api/catalog/groups`.
- [ ] Hàm thuần `choPhepDuaDon(groupCode, nhoms)` (nguồn duy nhất cho DTO); mở rộng `suaNhom`/`NhomRow`.
- **Expected:** `node --test src/modules/catalog/*.test.ts` xanh; `npm run typecheck` 0 lỗi (kể cả `web/`).

## Task 3 — `orders`: chốt chặn máy chủ
**Tệp:** `src/modules/orders/service.ts` (cạnh `resolveLegPlaces`), `rules.ts`, `index.ts` (route trạng thái), `src/modules/catalog/index.ts` (công bố hàm đọc view cho `orders` qua `index.ts` nếu cần), bài mới `src/modules/orders/dua-don-nhom-tat.test.ts`.
- [ ] Một hàm `kiemNhomChoPhepDuaDon(db, danhSachDichVu)` đọc `v_ctl_service_transfer`, trả lỗi `transfer_disabled` có tên dịch vụ và tên nhóm; dịch vụ nhập tay (`catalog_code` rỗng) luôn qua.
- [ ] **Bài đỏ trước (mỗi cửa một bài, nhóm đã tắt trong khung thử):** N-8 `POST /api/orders` có chặng → 4xx `transfer_disabled`, không lưu đơn; không chặng → 201. N-9 `PUT /api/orders/:id` (lưu nháp) có chặng → từ chối, đơn không đổi. N-10 `POST …/legs`, `PUT …/legs/:legId`, `POST …/legs/:legId/replace` → từ chối, không ghi chặng, không nhật ký. N-11 `POST …/legs/:legId/close` vẫn **200**. N-12 `POST …/status` xác nhận đơn nháp còn chặng mở thuộc nhóm tắt → từ chối; xác nhận đơn không chặng → 200; đơn **đã xác nhận** có chặng từ trước vẫn sửa số khách/ghi chú/huỷ được. N-13 nhóm bật lại → mọi cửa hoạt động; dịch vụ nhập tay luôn qua.
- [ ] **Hàng rào kiến trúc:** `orders` không đọc `ctl_group` trực tiếp (bài trong `src/architecture.test.ts` hoặc bài quét riêng); sửa cố ý để đọc bảng trực tiếp → đỏ → hoàn nguyên.
- **Expected:** mỗi bài đỏ vì thiếu chốt, xanh sau khi thêm; `node --test src/modules/orders/*.test.ts src/architecture.test.ts` xanh.

## Task 4 — `locations`: chọn nhanh
**Tệp:** `src/modules/locations/{index,repository,rules}.ts` (+ test), `src/shared/contracts.ts`.
- [ ] **Bài đỏ trước:** N-14 `GET /api/locations` mọi tài khoản đăng nhập thấy `quickPickOrder`; N-15 `PUT /api/locations/:id` với `quickPickOrder` số 1–99 hoặc `null` lưu được, ghi `location_updated`; 0, 100, chữ → 400; Bán hàng/Kế toán/HDV → 403; N-16 địa điểm ngưng dùng (`active = 0`) **không** được hiển thị thành nút (DTO vẫn mang số, giao diện lọc theo `active`).
- **Expected:** `node --test src/modules/locations/*.test.ts` xanh.

## Task 5 — Giao diện
**Tệp:** `web/order-form.ts`, `web/khoi-dua-don.ts`, `web/catalog.ts`, `web/locations.ts`, `public/app.css`, kịch bản `docs/evidence/2026-10-14-dua-don-nhom-va-diem-nhanh/kich-ban/`.
- [ ] **Bài đỏ trước (kiểu bài văn bản + hàm thuần như `src/khoi-gap-noi-day.test.ts`):** N-17 khối đưa đón không dựng khi `transferEnabled === false` của dịch vụ; đổi dịch vụ sang nhóm tắt → chặng bị bỏ khỏi dữ liệu gửi và hiện một dòng báo. N-18 hàng nút chọn nhanh chỉ gồm điểm `active` có `quickPickOrder`, xếp theo số; bấm nút điền `dropoffLocationId` (chiều đi) hoặc `pickupLocationId` (chiều về), xoá chữ tự gõ. N-19 màn Danh mục có công tắc "Có đưa đón" mỗi nhóm; màn Địa điểm có cột "Chọn nhanh". N-20 mọi chữ mới tiếng Việt có dấu, không `innerHTML`.
- [ ] Kịch bản Chrome (cần `AXE_JS`) chạy ở 390 và 1040; ảnh thật trước/sau cho chủ duyệt một lượt (nhóm tắt, nút chọn nhanh, Danh mục, Địa điểm).
- **Expected:** `npm run build:web`, `npm run typecheck` sạch; kịch bản xanh kèm kiểm màu.

## Task 6 — Tài liệu sống, nhật ký, e2e
- [ ] `docs/SYSTEM-DESIGN.md` (§ chặng, § danh mục, § địa điểm) và `docs/CHANGE-GUIDE.md` (công thức thêm cờ nhóm) cập nhật cùng commit; `docs/SO-HANG-RAO.md` thêm dòng cho hàng rào Task 3 với **ngày quan sát chặn thật**.
- [ ] `src/shared/changelog.ts` mục **1.97** (số tạm, chốt ở bước A.0 của `docs/HANDOFF-N1.md`); Trợ giúp Quản trị nói công tắc "Có đưa đón" và "Chọn nhanh" — **trần chữ Quản trị đã sát** (xem `src/shared/huong-dan.test.ts`): rút một câu cũ hoặc ghi ruling và nhờ chủ nới trần, không tự nới.
- [ ] e2e `tests/e2e/dua-don-theo-nhom.mjs` (đăng nhập qua `login()`/`session()`): tắt nhóm → lập đơn có chặng 4xx → đóng chặng được → bật lại → lập được; Quản trị đặt chọn nhanh, nhân viên thấy nút; cuối chạy `audit-invariants`.
- [ ] Chạy `npm run typecheck`, `npm test`, `npm run test:e2e` (cần mạng) đều xanh.

## Task 7 — Người kiểm độc lập (phiên khác, chỉ đọc)
Đọc mã thật, chạy lại lệnh, kiểm: chốt chặn ở **cả năm cửa** (đọc cả đường lưu nháp xoá–chèn lại); không cửa nào bị bỏ sót khi chặng đi kèm `short-notice`; đơn đã xác nhận có chặng cũ không bị khoá oan; view `v_ctl_service_transfer` đúng khi nhóm đổi giữa chừng; hàng rào thật sự đỏ khi lách; hành động nhật ký không lộ tên khách; ảnh khớp mô tả. Báo cáo ghi **mốc commit** đã đọc.

## Điểm cần canh (Review Focus)
1. Lưu nháp **xoá–chèn lại** chặng (ADR-0047): đơn nháp cũ có chặng ở nhóm vừa tắt phải bị từ chối kèm câu hướng dẫn, không để rơi vào trạng thái nửa lưu.
2. Thứ tự lô: kiểm nhóm tắt **trước** khi ghi bất cứ dòng nào ở các lệnh một-lô (`replace`).
3. Dịch vụ đổi nhóm sau khi đơn đã xác nhận: không đổi nghĩa đơn cũ.
4. Nút chọn nhanh trỏ điểm đã ngưng dùng giữa lúc mở form: server vẫn chặn bằng R7.

## Ghi chú nối sang lượt 2
Lượt 2 (lớp giá) đọc cờ này: nhóm tắt đưa đón thì không có chặng nên không có tiền đưa đón; cờ chọn nhanh có thể dùng lại làm gợi ý cho điểm có sẵn mức vùng. Không làm gì cho lượt 2 trong kế hoạch này.
