# Kế hoạch thi công PHẦN MÁY CHỦ — ô mới của chặng đưa đón: số người chiều về (`pax_override`), số hiệu chuyến bay (`flight_code`), mẫu chặng + nơi trả mặc định

> **Cho người thi công (AI):** dùng skill `superpowers:subagent-driven-development` (khuyến nghị) hoặc `superpowers:executing-plans`. Làm từng task, mỗi bước đánh dấu ô `- [ ]`. Ghi sổ `docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-thi-cong-nhat-ky.md` sau mỗi task (P19). **Không** làm giao diện: màn hình chờ chủ vẽ bằng Claude Design (U1, 1/10).

**Mục tiêu.** Máy chủ nhận, kiểm, lưu, trả ba thứ mới của chặng trước khi có giao diện:
1. **Số người riêng của chặng về** `pax_override` (ADR-0054 D10.3, **đã duyệt**).
2. **Số hiệu chuyến bay** `flight_code` (ADR-0055 VK2-C, **đã duyệt**). Người xếp xe và tài xế thấy.
3. **Mẫu chặng theo dịch vụ** `vc_leg_template` + hàm gợi ý `changMacDinh` (ADR-0054 D10.1–D10.2, **đã duyệt**). Đây là **tiền đề** của nơi trả mặc định.
4. **Nơi trả mặc định theo dịch vụ** (ADR nháp `docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md`, **CHƯA duyệt**): chỉ lên lịch ở Task 7, **chờ chủ**.

**Nguồn chuẩn tắc (đã duyệt, không hỏi lại):**
- `docs/adr/ADR-0054-dieu-phoi-luot-4-chieu-ve-theo-dich-vu.md` (D10.1, D10.2, D10.3, L-R1, mục "Hệ quả", tiêu chí 1–9);
- `docs/adr/ADR-0055-van-chuyen-kernel-luot-2.md` **chỉ VK2-C** (C1–C4, G-C1, G-C2). **Không làm** VK2-A (khung bận của xe) và VK2-B (giờ lái tối đa): ngoài phạm vi, lên kế hoạch riêng;
- ADR-0047 A1–A3 (chặng, hành khách), ADR-0049 D1–D3 (lịch chung, mốc 6 giờ, DTO tài xế), ADR-0050 VK1-B (khoá nơi);
- lời chủ 1/10 U2 (`docs/superpowers/specs/2026-10-01-uu-tien-xe-chay-quyet-dinh.md`).

**Đã kiểm trước khi viết (1/10, HEAD `8f647226`):**
- **Không có** kế hoạch thi công riêng cho ADR-0054 / ADR-0055. `ls docs/superpowers/plans | grep -i "0054\|0055\|luot-4\|kernel"` → 0 tệp.
  - Lộ trình `docs/superpowers/specs/2026-09-29-van-chuyen-lo-trinh.md:24-25` ghi cả hai "chưa" kế hoạch, "chưa" thi công.
  - Bàn giao `docs/superpowers/plans/2026-09-30-van-chuyen-ban-giao-dieu-phoi.md:17-18` ghi "Đã duyệt, chưa thi công".
  - ⇒ Kế hoạch này **là** kế hoạch máy chủ cho phần ô chặng của hai ADR đó, không trỏ đi đâu khác.
- **`main` chưa có** cột `pax_override` / `flight_code`, bảng `vc_leg_template`, hàm `changMacDinh` / `soNguoiChang`. `grep` chỉ ra chú thích `src/modules/orders/index.ts:189`.
- **Số migration:** `main` dừng ở `0055_nhom_dich_vu.sql`. Nhánh `worktree-gop-ho-so` **đã giữ `0056_gop_ho_so.sql`** (`git ls-tree --name-only worktree-gop-ho-so migrations/`). Vì vậy số "0056" ghi ở tài liệu quyết định 1/10 **đã cũ**.
  - Kế hoạch này dùng **`0057`** (cột chặng), **`0058`** (mẫu chặng), **`0059`** (nơi trả mặc định — chờ).
  - Số thật = số lớn nhất trên `main` + 1 **lúc gộp**, sau khi liệt kê lại mọi nhánh (Task 0).
  - Bài migration tìm tệp theo **đuôi tên** (`endsWith("_chang_so_nguoi_chuyen_bay.sql")`) để đổi số chỉ phải đổi tên tệp (`docs/CHANGE-GUIDE.md` công thức d).

**Vai.** Lập kế hoạch (P15). Người thi công làm ở phiên khác. Người kiểm độc lập chỉ-đọc làm ở phiên khác nữa (N8).

**Loại việc.** **Việc lớn** (dữ liệu: migration, cột mới, bảng mới; hợp đồng DTO tài xế) ⇒ Task K bắt buộc.

**Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 1/10).

---

## Bảng task (làm ngay / chờ)

| Task | Nội dung | Căn cứ | Trạng thái |
|---|---|---|---|
| 0 | Đo lại mã, chốt số migration, đọc lại bài khoá | — | **làm ngay** |
| 1 | Migration `0057`: `flight_code`, `pax_override` trên `ord_transfer_leg` | ADR-0055 C1, ADR-0054 D10.3 | **làm ngay** |
| 2 | Luật thuần: `kiemChang` nhận hai ô; `soNguoiChang`; chuẩn hoá số hiệu; `moTaChang` | như trên | **làm ngay** |
| 3 | Ghi: lưu nháp (giữ / chép / 403), route chặng sau xác nhận, nhánh nháp cho `pax_override`, L-R1 | ADR-0054 D10.3, ADR-0055 C2 | **làm ngay** |
| 4 | Đọc: DTO đơn, `lichChungChang`, `hanhKhachChoChuyen`, DTO văn phòng + tài xế | ADR-0055 C3, ADR-0054 D10.3 | **làm ngay** |
| 5 | Bài "một luật số người chặng" + kiểm định kỳ | ADR-0054 "Hệ quả" | **làm ngay** |
| 6 | Mẫu chặng `vc_leg_template` (migration `0058`), route, `changMacDinh` | ADR-0054 D10.1–D10.2 | **làm ngay** (tiền đề Task 7) |
| 7 | Nơi trả mặc định: cột `default_dropoff_location_id` (migration `0059`), route, hàm | ADR nháp nơi trả | **CHỜ chủ duyệt ADR** |
| 8 | "Số khách đi xe" cấp ĐƠN (`orders.ride_pax`) | ADR-0065 (proposed), câu 7, câu 8 | **CHỜ chủ duyệt ADR-0065** — chỉ ghi chỗ móc |
| 9 | e2e | — | **làm ngay** (sau 1–6) |
| 10 | Tài liệu: sổ dữ liệu, SYSTEM-DESIGN, CHANGE-GUIDE, sổ hàng rào | — | **làm ngay** |
| K | Người kiểm độc lập chỉ-đọc | CLAUDE.md §3 | bắt buộc |

**Có thể phát hành mà không chờ Task 7, 8.** Task 6 (mẫu chặng) không phụ thuộc ADR nháp. Nếu chủ duyệt ADR nơi trả **trước khi** `0058` lên `main`, gộp cột vào `CREATE TABLE` của `0058` (lớp `CHECK` thay trigger; xem Task 7).

---

## Tiêu chí nghiệm thu (viết TRƯỚC khi làm — hành vi kiểm được)

### A. `flight_code` (ADR-0055 VK2-C)

- **TC-F1.** SQL: `flight_code = 'vn1553'` (chữ thường) → `RAISE` (`CHECK` chữ hoa); `'VN'` (2 ký tự) → `RAISE`; `'VN15530AB'` (9) → `RAISE`; `NULL` và `'VN1553'` → được.
- **TC-F2.** Chuẩn hoá ở máy chủ:
  - `" vn 1553 "` → lưu `VN1553`;
  - `"VN-1553"`, `"VNA1553"` (ký tự thứ ba phải là số), `"VN15530"` (năm chữ số), `"ABCDEFGH"` → 400 câu tiếng Việt (khuôn `^[A-Z0-9]{2}[0-9]{1,4}[A-Z]?$`). Lưu ý: `"1553"` **khớp** khuôn ("15" + "53") nên không dùng làm ca sai;
  - `""` / `null` → xoá về `NULL`.
- **TC-F3.** Ai ghi (C2):
  - **đơn nháp** (`PUT /api/orders/:id`, ô `order.modify`): Bán hàng đơn mình → 200; Đối tác đơn mình → 200; Thực tập đơn mình → 200; Kế toán → 403;
  - **sau xác nhận** (`POST /legs`, `PUT /legs/:legId`, ô `order.trip.edit`): Bán hàng đơn mình → 200, đơn người khác → 403; Quản trị → 200; Đối tác / Thực tập / HDV → 403.
- **TC-F4.** **Khoá vắng = giữ:** lưu nháp với thân chặng **không có** khoá `flightCode` (bản PWA cũ) → giá trị đang lưu của chặng cùng id còn nguyên sau lần xoá–chèn lại.
- **TC-F5.** Sửa **chỉ** số hiệu chuyến bay của chặng đã xác nhận đang **dưới mốc 6 giờ** → 200, **không** đòi `datGap`, không dấu đặt gấp mới, dấu cũ không bị bỏ (C2: "Sửa số hiệu không kiểm mốc 6 giờ").
- **TC-F6.** Nhật ký `order_leg_updated`: `detail` có "số hiệu chuyến bay VN1553 → VJ123" (G-C2: ghi giá trị); thêm chặng có số hiệu → đoạn "số hiệu chuyến bay VN1553".
- **TC-F7.** Đọc:
  - chi tiết đơn `LegDto.flightCode` có giá trị;
  - `lichChungChang` có khoá `soHieuChuyenBay`;
  - DTO tài xế `GET /cuoc-cua-toi/:id` có số hiệu **cả ngoài ngày chạy** (G-C1), trong khi `hoTen` / `lienHe` vắng mặt;
  - biên nhận gửi khách (PNG / `order-confirmation`) **không** có số hiệu (C3).

### B. `pax_override` (ADR-0054 D10.3)

- **TC-P1.** SQL:
  - `pax_override = 0` → `RAISE`;
  - `pax_override = 2` trên chặng `OUT` → `RAISE` (trigger, cả `INSERT` lẫn `UPDATE`);
  - `NULL` trên chặng nào cũng được;
  - `2` trên `RETURN` → được.
- **TC-P2.** Route:
  - `OUT` + `paxOverride` → 400;
  - `0` → 400;
  - **lớn hơn số khách hiệu lực của dịch vụ** → 400 (L-R1);
  - hợp lệ → 200, nhật ký có "số người chiều về 4 → 2", không tên.
- **TC-P3.** Quyền đơn **đã xác nhận** (ô `order.trip.edit`, `PUT /legs/:legId`): Bán hàng đơn mình → 200; đơn người khác → 403; Quản trị, Toàn quyền → 200; HDV, Đối tác, Kế toán → 403.
- **TC-P4.** Quyền đơn **nháp**:
  - (a) Bán hàng đơn mình / Quản trị ghi qua **nhánh nháp** của `PUT /api/orders/:id/legs/:legId` (chỉ nhận `paxOverride` + `expectedUpdatedAt`) → 200;
  - (b) thân nhánh nháp có thêm khoá khác (giờ, nơi) → 409 `use_order_form`;
  - (c) Đối tác / Thực tập lưu nháp (`PUT /api/orders/:id`) gửi `paxOverride` **khác** bản cũ → 403;
  - (d) không gửi → giá trị cũ còn nguyên;
  - (e) gửi **bằng** bản cũ → 200.
- **TC-P5.** **Không mất khi lưu nháp:** Quản trị đặt `pax_override = 2` qua nhánh nháp. Lệnh này đẩy mốc `orders.updated_at` (`changeLeg` có `orderTouchGuarded` — `src/modules/orders/repository.ts:1315-1340`), nên form đang mở của Đối tác sẽ nhận 409 `stale` — đúng. Đối tác (người lập) **tải lại** rồi lưu nháp bằng thân **không có** khoá `paxOverride` (bản PWA cũ) → vẫn `2`.
- **TC-P6.** Chặng về bị **bỏ** rồi thêm lại → chặng mới `pax_override = NULL` (D10.3).
- **TC-P7.** Đổi `pax_override` trên chặng đã xác nhận dưới mốc 6 giờ → **không** đòi `datGap` (D10.3: không phải một trong bốn trường).
- **TC-P8.** `soNguoiChang` là **nơi duy nhất** tính số người chặng:
  - `lichChungChang.soNguoi` = 2 cho chặng về `pax_override = 2` của dịch vụ 4 khách;
  - `hanhKhachChoChuyen.soNguoi` cũng 2;
  - `kiemXuatBen` với 2/4 khách có tên, chặng về 2 người → không `THIEU_TEN`;
  - L-D1 chặn mở suất thứ 3;
  - giảm số khách dịch vụ xuống 1 (đường sửa số khách sẵn có) → `soNguoi` = 1 (kẹp lúc đọc), cột không tự đổi.
- **TC-P9.** Bài "một luật": thêm cố ý một chỗ cộng `adult + child + senior + infant` cho số người chặng ở `src/modules/orders/index.ts` → bài đỏ → hoàn nguyên.

### C. Mẫu chặng (ADR-0054 D10.1–D10.2) — tiêu chí 1–4, 7 của ADR-0054

- **TC-M1.** SQL:
  - `UPDATE` / `DELETE` dòng `vc_leg_template` → `RAISE`;
  - `mode` ngoài tập → `RAISE`;
  - `return_time_hint` khi `mode <> 'ROUND_TRIP'` → `RAISE`;
  - bài tiền tố bảng + bốn cột WHO (`architecture.test.ts`) xanh.
- **TC-M2.** Route ghi `POST /api/van-chuyen/mau-chang/:code`: Quản trị → 201, bản cũ còn trong lịch sử; Toàn quyền → 201; Bán hàng → 403; nhật ký `transfer_template_set` có chế độ cũ → mới.
- **TC-M3.** Route form `GET /api/van-chuyen/mau-chang` (cổng `orders`, `can(order.create)`):
  - Bán hàng, Đối tác, Thực tập → 200;
  - HDV, Kế toán, tài xế → 403;
  - khoá trả về đúng danh sách trắng (mã, chế độ, giờ gợi ý).
- **TC-M4.** `changMacDinh` (bảng ca): `ROUND_TRIP` → 2 chặng, chặng về đảo nơi đón / trả, giờ = gợi ý; `ONE_WAY` → 1; `NONE` hoặc không có dòng → 0.
- **TC-M5.** Máy chủ **không** tạo chặng theo mẫu: lưu nháp không có chặng cho dịch vụ "hai chiều" → 0 chặng trong CSDL.
- **TC-M6.** Đổi mẫu không đổi chặng đơn cũ.
- **TC-M7.** `sync force` danh mục sau khi gieo mẫu → mẫu y nguyên (e2e `catalog.mjs`).

### D. Nơi trả mặc định — tiêu chí 1–8 của ADR nháp (chỉ áp khi Task 7 được mở)

### E. Chung

- **TC-G1.** `npm test` xanh; `npm run typecheck` 0 lỗi; `npm run test:e2e` đủ bộ xanh (đuôi `audit-invariants --strict`); `node scripts/audit-invariants.mjs --db local` thoát 0.
- **TC-G2.** Mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` **kèm ngày thấy chặn thật** (sửa cố ý → đỏ → hoàn nguyên).

---

## Ràng buộc chung (mọi task)

- Tiếng Việt có dấu ở mọi câu lỗi, nhật ký, tài liệu. Không lộ mã thô (`RETURN`, `pax_override`).
- **SQL mới của `orders` chỉ ở `src/modules/orders/chang-hanh-khach-repo.ts`** (`defineSql`, câu tĩnh, EXPLAIN). Ưu tiên **mở rộng** câu chèn / sửa chặng có sẵn (`LEG_INSERT_COLS`, `LEG_SET` — `:140-:190`) thay vì thêm câu mới.
  - Thêm câu có lính gác mới ⇒ phải vào `DOC_AUDIT_LOG_WONGUARD` = **nới hàng rào** ⇒ dừng, đề xuất cho chủ (N9).
  - Kế hoạch này được thiết kế để **không cần** câu gác mới.
- `orders` **không** import `van-chuyen`; `van-chuyen` không đọc bảng `catalog`. Mẫu chặng chỉ đi qua route `van-chuyen` (ADR-0054 D10.1).
- Hàm hẹp của `orders` (`lichChungChang`, `hanhKhachChoChuyen`) chỉ gọi trong thân route SAU `can(` (`src/orders-cong-bo.test.ts`).
- DTO dựng **từng khoá** (không trải `...chang`). Khoá so sánh nơi không bao giờ vào DTO (bẫy 53 (3)).
- Migration chỉ thêm tệp mới; không sửa `0034`, `0040`, `0042`, `0043`, `0044` (đã áp remote — kiểm lại bằng `npx wrangler d1 migrations list tourdao-sales-db --remote` ở Task 0, lệnh chỉ đọc).
- Không ô `MATRIX` mới, không đổi giá trị ô nào.
- Tệp luật (`CLAUDE.md`, `src/CLAUDE.md`, `docs/ARCHITECTURE.md`, ADR đã duyệt) người thi công không tự sửa; chỉ đề xuất diff (N9).

---

## Task 0 — Đo lại, chốt số (làm ngay)

- [ ] **0.1** Đo lại `tệp:dòng` của kế hoạch trên `main` mới nhất:
  - `src/modules/orders/index.ts`: `ChangChoChuyen` `:177`, `hanhKhachChoChuyen` `:201`, `lichChungChang` `:276`, route `PUT /api/orders/:id` `:660` (`legMeta` `:689`), `POST /legs` `:751`, `PUT /legs/:legId` `:776` (đo 1/10);
  - `src/modules/orders/service.ts:121-:213` (`planAddLeg`, `planEditLeg`);
  - `src/shared/chang-dua-don.ts:62-:156` (`ChangHopLe`, `kiemChang`), `:266` (`moTaChang`);
  - `src/modules/orders/chang-hanh-khach-repo.ts:140-:190` (câu chèn / sửa chặng);
  - `src/shared/dieu-phoi-kiem.ts:315-:350` (`kiemXuatBen`);
  - `src/modules/van-chuyen/tai-xe-dto.ts:38-:79` (`cuocChiTietDto`), `dieu-phoi-dto.ts:135-:145` (suất).
- [ ] **0.2** Liệt kê migration mọi nhánh:
  ```
  git log --branches --diff-filter=A --name-only --format= -- migrations/ | sort -u | tail
  git ls-tree --name-only worktree-gop-ho-so migrations/ | tail -3
  ```
  Chốt số (dự kiến `0057`, `0058`, `0059`). Ghi ruling vào sổ thi công.
- [ ] **0.3** Tìm **mọi** nơi tính "số người của chặng" hôm nay: `grep -n "adult + p.child\|\.adult + \|pax_adult +" src scripts`. Dự kiến:
  - `index.ts` trong `hanhKhachChoChuyen` và `lichChungChang` (hai chỗ cộng tay `p.adult + p.child + p.senior + p.infant`);
  - `scripts/audit-checks.mjs:38-42` (SQL số khách hiệu lực).
  Ghi danh sách vào sổ — Task 4 đổi đủ.
- [ ] **0.4** Xác nhận đường tính mốc của `PUT /legs/:legId` (`duoiMocKhiSua(cu, fields, …)`). Nếu lệnh chỉ đổi số hiệu / số người mà giờ cũ đã dưới mốc, hàm hôm nay có **đòi `datGap`** không? (Dự kiến **có**, vì xét min(giờ cũ, giờ mới).) Đó là bẫy của TC-F5 / TC-P7.
- [ ] **0.5** Đọc khoá `docs/data-dictionary.json` của `logicalRefs` (`src/architecture.test.ts:260`, `:917-:920`): mỗi `logicalRef` cần `viaView`, mà `catalog` chưa có view công bố cho mã dịch vụ. ADR-0054 ghi "kế hoạch thi công chốt cách ghi (chưa kiểm)". Chốt một trong hai:
  - (a) không khai `logicalRefs` cho `vc_leg_template.code`, chỉ ghi `note` ở bảng;
  - (b) dừng, hỏi điều phối nếu bài đòi.
  Ghi ruling.
- [ ] **0.7** Đọc lại lô `changeLeg` (`src/modules/orders/repository.ts:1315-1340`) và hai câu `leg_update_checked` / `leg_update_guarded` (`chang-hanh-khach-repo.ts:~176-190`). Đọc 1/10:
  - câu đầu lô lọc `status = 'confirmed'`;
  - lô đẩy mốc đơn (`orderTouchGuarded`).
  Còn đúng thì Task 3.5 cần câu đầu lô mới cho đơn nháp, và TC-P5 phải tải lại trước khi lưu. Đổi thì sửa Task 3.5 theo mã thật, ghi ruling.
- [ ] **0.6** ADR-0062 Phần B (báo tin khi đơn đổi) đã lên `main` chưa? Nếu đã có hàm đọc `detail` của `order_leg_updated`: kiểm nó **bỏ qua** đoạn mới ("số hiệu chuyến bay …", "số người chiều về …") hoặc chủ đích nhận. **Không** tự thêm loại tin mới (ngoài ADR-0062).

## Task 1 — Migration `0057_chang_so_nguoi_chuyen_bay.sql` (làm ngay)

**Tệp:** `migrations/0057_chang_so_nguoi_chuyen_bay.sql` (mới), `src/migrations-chang-o-moi.test.ts` (mới, tìm tệp theo đuôi tên).

- [ ] **1.1 Đỏ:** viết bài TC-F1, TC-P1 trên `node:sqlite` (khuôn `src/migrations-chang-dua-don.test.ts`, `upTo(...)`). Chạy → đỏ vì cột chưa có.
- [ ] **1.2 Xanh:** migration chỉ-thêm:
  ```sql
  ALTER TABLE ord_transfer_leg ADD COLUMN flight_code TEXT
    CHECK (flight_code IS NULL OR (flight_code = upper(flight_code) AND length(flight_code) BETWEEN 3 AND 8));
  ALTER TABLE ord_transfer_leg ADD COLUMN pax_override INTEGER CHECK (pax_override IS NULL OR pax_override >= 1);
  CREATE TRIGGER ord_transfer_leg_pax_override_return_ins BEFORE INSERT ON ord_transfer_leg
  WHEN NEW.pax_override IS NOT NULL AND NEW.direction <> 'RETURN'
  BEGIN SELECT RAISE(ABORT, 'pax_override_return: chỉ chặng về có số người riêng'); END;
  CREATE TRIGGER ord_transfer_leg_pax_override_return_upd BEFORE UPDATE ON ord_transfer_leg
  WHEN NEW.pax_override IS NOT NULL AND NEW.direction <> 'RETURN'
  BEGIN SELECT RAISE(ABORT, 'pax_override_return: chỉ chặng về có số người riêng'); END;
  ```
  - **Lệch chữ có chủ ý so với ADR-0054 D10.3:** ADR viết một `CHECK (pax_override IS NULL OR (pax_override >= 1 AND direction = 'RETURN'))`. Nhưng `CHECK` nhiều cột **không thêm được bằng `ALTER`** (`docs/CHANGE-GUIDE.md` công thức z bước 4). Thi công tách làm hai lớp: `CHECK` một cột (≥ 1) + trigger (chỉ `RETURN`). Hiệu quả chặn như nhau. Ghi ruling vào sổ thi công. Dòng sổ hàng rào ghi đúng hai lớp.
  - Bài `CHECK` phải **tắt trigger** để thấy `CHECK` chặn (bẫy 53, z3 "Làm" 3 — khuôn `src/migrations-chuyen-xe.test.ts`).
  - Trigger khoá "Đã giao" của `0044:77-85` **không liệt kê cột** ⇒ không cần tạo lại (đã đọc 1/10).
- [ ] **1.3** Thấy hàng rào chặn thật: đổi cố ý `'RETURN'` → `'OUT'` trong trigger → bài đỏ → hoàn nguyên. Ghi ngày.
- [ ] **1.4** `npm run db:migrate:local`; `node --test src/migrations-chang-o-moi.test.ts src/migrations-chang-dua-don.test.ts src/architecture.test.ts`.

## Task 2 — Luật thuần (làm ngay)

**Tệp:** `src/shared/chang-dua-don.ts` (+ `.test.ts`), tệp mới `src/shared/so-nguoi-chang.ts` (+ `.test.ts`), `src/shared/contracts.ts`.

- [ ] **2.1 Đỏ:** bảng ca cho:
  - `chuanHoaSoHieuChuyenBay(raw)` (TC-F2);
  - `kiemChang` nhận `flightCode`, `paxOverride` (TC-P2 phần hình thức: `OUT` + số → lỗi; 0 → lỗi; không phải số nguyên → lỗi);
  - `soNguoiChang` (TC-P8 phần thuần);
  - `moTaChang` (TC-F6, "số người chiều về A → B").
- [ ] **2.2 Xanh:**
  - `ChangHopLe` thêm `flightCode: string | null`, `paxOverride: number | null`.
  - **Khoá vắng** trong thân được giữ ở dạng riêng (vd `undefined` trong kết quả kiểm, hoặc cờ `coKhoa`) để Task 3 phân biệt "không gửi" với "gửi null" — đừng ép về `null` ở đây.
  - `soNguoiChang(chang: { direction; paxOverride }, soKhachDichVu: number, them?: { soKhachDiXe?: number | null }): number`:
    - hôm nay: `RETURN` có `paxOverride` → `min(paxOverride, soKhachDichVu)`; còn lại `soKhachDichVu`;
    - tham số thứ ba **chừa sẵn** cho ADR-0065 (Task 8) để thêm luật không phải sửa nơi gọi; hôm nay bị bỏ qua và có bài ghim "bỏ qua".
  - `moTaChang`: `MoTaChangVao` thêm `soHieu`, `soNguoiVe`.
    - Đoạn mới: "số hiệu chuyến bay A → B" (giá trị, không che — không phải chữ tự do, đã qua khuôn), "số người chiều về A → B" (trống = "theo số khách dịch vụ").
    - Thêm chặng: kèm "số hiệu chuyến bay X" khi có.
  - `LegInput`, `LegEditInput`, `LegDto` (`contracts.ts:321-:350`) thêm `flightCode?`, `paxOverride?`.
- [ ] **2.3** `node --test src/shared/chang-dua-don.test.ts src/shared/so-nguoi-chang.test.ts` xanh; `npm run typecheck`.

## Task 3 — Đường ghi (làm ngay)

**Tệp:** `src/modules/orders/chang-hanh-khach-repo.ts`, `service.ts`, `index.ts`, `repository.ts` (chỉ chỗ gọi), bài `src/modules/orders/chang-route.test.ts`, `luu-nhap-chang.test.ts`, `dat-gap.test.ts`.

- [ ] **3.1 Đỏ:** bài route cho TC-F3, TC-F4, TC-F5, TC-P2, TC-P3, TC-P4 (a)–(e), TC-P5, TC-P6, TC-P7 trên khung `world()` (khuôn `chang-route.test.ts`, `luu-nhap-chang.test.ts`).
- [ ] **3.2 SQL:** thêm `flight_code`, `pax_override` vào `LEG_INSERT_COLS` và `LEG_SET` (cùng câu có sẵn — **không câu mới, không tên gác mới**). Bài EXPLAIN (`NUA_NGHIEM`) xanh.
- [ ] **3.3 Lưu nháp `PUT /api/orders/:id`** (và `POST /api/orders` cho đơn mới):
  - `flightCode`: khoá có → dùng (ô `order.modify` đã hỏi); khoá vắng → chép giá trị đang lưu của chặng **cùng id** (khuôn `legMeta` `index.ts:689`, `chepDatGapNhap`).
  - `paxOverride`: khoá vắng → chép giá trị đang lưu cùng id; khoá có và **khác** bản đang lưu → cần `can(order.trip.edit, { ownerId, assigned })`, không có → **403** (câu tiếng Việt "Chỉ văn phòng đổi được số người chiều về"), hỏi **trước** khi ghi; bằng bản cũ → được.
  - Chặng mới (id null) có `paxOverride` → cũng cần `order.trip.edit`.
  - L-R1: `paxOverride` ≤ số khách **của dịch vụ trong thân** (nháp chưa có điều chỉnh tiền) → vượt = 400.
- [ ] **3.4 Sau xác nhận `POST /legs`, `PUT /legs/:legId`:**
  - nhận hai khoá; khoá vắng ở `PUT` = giữ;
  - L-R1 so với **số khách hiệu lực** (`soKhachHieuLuc`/`effectivePax` — một nguồn, bài học Đợt E);
  - **bẫy mốc (Task 0.4):** nếu ngày, giờ, nơi đón, nơi trả **không đổi** (chỉ số hiệu / số người) thì **không** gọi `xetDatGapSua` và **không** bỏ dấu đặt gấp cũ (TC-F5, TC-P7). Viết điều kiện bằng một hàm thuần `chiDoiOPhu(cu, moi)` ở `chang-dua-don.ts` (có bài), không rải `if` trong route.
- [ ] **3.5 Nhánh nháp cho `pax_override`** (ADR-0054 D10.3 "đường mới cho đơn nháp"):
  - `PUT /api/orders/:id/legs/:legId` với đơn **nháp**: thân chỉ được có `paxOverride` + `expectedUpdatedAt` → đi tiếp; có khoá khác → giữ 409 `use_order_form` như hôm nay.
  - Ô vẫn là `order.trip.edit` (đã hỏi ở đầu route).
  - **Câu ghi (đã đọc 1/10):** câu đầu lô hiện có `leg_update_checked` (`chang-hanh-khach-repo.ts:~186-190`) có điều kiện `status = 'confirmed'`. Dùng lại cho đơn nháp sẽ **luôn** trả 0 dòng → 409 `stale`. Vì vậy nhánh nháp cần **một câu đầu lô mới** (vd `leg_pax_override_draft_checked`):
    - `UPDATE ord_transfer_leg SET pax_override = ?, updated_at = ?, updated_by = ? WHERE id = ? AND order_id = ? AND closed_at IS NULL AND updated_at = ? AND direction = 'RETURN' AND EXISTS (SELECT 1 FROM orders WHERE id = ? AND status = 'draft')`;
    - đây là câu đầu lô, **tự quyết thắng / thua**, nên tên **không** mang đuôi `_guarded` / `_draft` và **không** vào `DOC_AUDIT_LOG_WONGUARD` (`docs/CHANGE-GUIDE.md` công thức z). Phần còn lại của lô dùng lại `changeLeg`: nhật ký `changes() > 0`, `orderTouchGuarded`, `serviceMirrorUpdateGuarded`.
    - Nếu bài nào đòi khai câu này vào một danh sách mà việc khai là **nới** hàng rào (vd danh sách ngoại lệ) → **dừng**, đề xuất cho chủ (N9), không tự khai.
  - Nhật ký `order_leg_updated`; Bảng tin `chuyen` đúng một lần.
  - Thứ tự trả lỗi giữ khuôn route: 404 → 403 → Đã giao → (nháp: kiểm thân) → hủy → 400.
- [ ] **3.6** Thấy chặn thật: bỏ tạm kiểm 403 ở 3.3 → TC-P4 (c) đỏ → hoàn nguyên. Bỏ tạm nhánh chép ở 3.3 → TC-F4, TC-P5 đỏ → hoàn nguyên. Ghi ngày.
- [ ] **3.7** `node --test src/modules/orders/*.test.ts src/route-write-guard.test.ts src/route-access.test.ts` xanh.

## Task 4 — Đường đọc (làm ngay)

**Tệp:** `src/modules/orders/index.ts`, `chang-hanh-khach-repo.ts` (câu đọc chặng thêm hai cột), `src/modules/van-chuyen/dieu-phoi-dto.ts`, `tai-xe-dto.ts`, `src/shared/contracts.ts`; bài khoá: `src/modules/orders/ham-cong-bo.test.ts`, `lich-chung-chang.test.ts`, `src/hanh-khach-khong-lo-ten.test.ts` (TC-50, khối van-chuyen), `src/modules/van-chuyen/tai-xe-dto.test.ts`.

- [ ] **4.1 Đỏ:** sửa các bài liệt kê khoá **trước** (thêm `soHieuChuyenBay` cho lịch chung, suất văn phòng, suất tài xế; `flightCode`, `paxOverride` cho `LegDto`) → đỏ. Bài TC-F7, TC-P8 (phần đọc).
- [ ] **4.2 Xanh:**
  - `LegDto` thêm `flightCode`, `paxOverride` (ai xem được chặng thì thấy — C3).
  - `ChangLichChung` thêm `soHieuChuyenBay`. `soNguoi` = `soNguoiChang(...)` (thay chỗ cộng tay).
  - `ChangChoChuyen.soNguoi` = `soNguoiChang(...)`. **Không** thêm số hiệu vào `ChangChoChuyen` (ADR-0055 không nêu; giữ hẹp).
  - Suất của DTO văn phòng (`dieu-phoi-dto.ts` quanh `:138-:142`) thêm `soHieuChuyenBay` lấy từ `changLich`. DTO tài xế (`cuocChiTietDto`) chọn thêm khoá này **ngoài** nhánh `trongNgay` (G-C1: có mọi lúc).
  - Áp cho `DRIVER`; `DRIVER_PARTNER` theo đúng ADR-0053 khi lượt 3 mở — không mở sớm.
  - Biên nhận / ảnh xác nhận: **không đổi** (`src/shared/order-confirmation.ts` không đọc khoá mới; thêm một ca ghim).
- [ ] **4.3** `src/giay-to-khong-lo-so.test.ts` **không** cần ca mới: bài đó canh **số giấy tờ** trên route `/documents|/giay-to`; số hiệu chuyến bay không phải giấy tờ, không đi route đó. Hàng rào thật là các bài liệt kê khoá ở 4.1. Ghi ruling.
- [ ] **4.4** `node --test src/modules/orders/*.test.ts src/modules/van-chuyen/*.test.ts src/hanh-khach-khong-lo-ten.test.ts src/orders-cong-bo.test.ts src/dieu-phoi-ca-mau.test.ts` xanh. Bộ ca mẫu `golden/dieu-phoi/`: nếu đáp án đổi thì **báo chủ**, không tự sửa đáp án (z2 "Làm" 3).

## Task 5 — Bài "một luật số người chặng" + kiểm định kỳ (làm ngay)

**Tệp:** `src/so-nguoi-chang-mot-luat.test.ts` (mới), `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`.

- [ ] **5.1 Đỏ → xanh:** bài quét mã (khuôn Đợt E "hai luật"): ngoài `src/shared/so-nguoi-chang.ts`, không tệp nào trong `src/modules/orders/`, `src/modules/van-chuyen/`, `src/shared/dieu-phoi-*.ts` cộng bốn loại tuổi để ra số người **của chặng**.
  - Danh sách cho phép đặt tên rõ: `effectivePax` / số khách dịch vụ, `soKhachDoan`.
  - Chống bài rỗng: bài phải tìm thấy đúng một định nghĩa `soNguoiChang`.
  - Thấy chặn thật theo TC-P9.
- [ ] **5.2** Hai câu `CHECKS` mới (`docs/CHANGE-GUIDE.md` công thức d bước 5):
  - `R-ORD-…` "chặng có `pax_override` mà không phải chiều về" — `level: "fail"` (lưới thứ hai sau trigger);
  - `R-ORD-…` "chặng về có `pax_override` > số khách hiệu lực của dịch vụ" — `level: "warn"` (L-R1, tình trạng hợp lệ sau khi giảm khách; cột không tự sửa). Dùng lại biểu thức số khách hiệu lực có sẵn ở `scripts/audit-checks.mjs:38-42`, **không** viết bộ đọc `after_json` thứ hai.
  - Kèm bài ở `src/audit-invariants.test.ts`: ca xanh, ca đỏ, dữ liệu khoẻ ⇒ 0.

## Task 6 — Mẫu chặng theo dịch vụ (ADR-0054 D10.1–D10.2) — làm ngay, tiền đề của Task 7

**Tệp:** `migrations/0058_mau_chang.sql`, `src/modules/van-chuyen/` (route + `defineSql` ở cuối `repository.ts` hoặc tệp mới `mau-chang-repo.ts` — module NGHIÊM), `src/shared/chang-mac-dinh.ts` (+ `.test.ts`), `src/shared/audit-actions.ts`, `src/shared/contracts.ts`, `src/route-access.test.ts` (SNAPSHOT), `src/hanh-khach-khong-lo-ten.test.ts` (regex chọn route thêm `mau-chang` + ca), `docs/data-dictionary.json`.

- [ ] **6.1 Đỏ:** TC-M1 (SQL), TC-M2, TC-M3 (route), TC-M4 (thuần), TC-M5, TC-M6.
- [ ] **6.2 Xanh:**
  - Bảng `vc_leg_template` đúng cột ADR-0054 D10.1:
    - `id`, `code`;
    - `mode CHECK IN ('NONE','ONE_WAY','ROUND_TRIP')`;
    - `return_time_hint` (HH:MM, chỉ khi `ROUND_TRIP` — `CHECK` bảng);
    - `valid_from_at`, `UNIQUE (code, valid_from_at)`;
    - bốn cột WHO.
  - Trigger chỉ-thêm (`UPDATE` / `DELETE` → `RAISE`).
  - Route:
    - `GET /api/van-chuyen/mau-chang/:code` và `POST /api/van-chuyen/mau-chang/:code` (cổng `admin`, `can(admin.manage)` dòng đầu thân);
    - `GET /api/van-chuyen/mau-chang` (cổng `orders`, `can(order.create)` dòng đầu thân) trả map mã → `{ mode, returnTimeHint }`.
  - `valid_from_at` = giờ máy chủ, thân **không** được mang ngày hiệu lực (khuôn z2: 400). Hai lần ghi cùng mili-giây → 409 `stale`.
  - Nhật ký `transfer_template_set` (khai ở `audit-actions.ts`, nhãn tiếng Việt), `detail` = mã dịch vụ, chế độ cũ → mới, giờ gợi ý. Không `order_id`.
  - `changMacDinh(mau, dichVu)` thuần ở `src/shared/` — giao diện dùng sau. Máy chủ **không** gọi nó khi lưu đơn (TC-M5).
- [ ] **6.3** Thấy chặn thật: bỏ tạm trigger chỉ-thêm → TC-M1 đỏ → hoàn nguyên; bỏ tạm `can(order.create)` → TC-M3 đỏ → hoàn nguyên.
- [ ] **6.4** `docs/data-dictionary.json`: bảng `vc_leg_template` (module `van-chuyen`), ghi `code` theo ruling 0.5 → `npm run dict`.

## Task 7 — Nơi trả mặc định theo dịch vụ — **CHỜ CHỦ DUYỆT ADR nháp** (`docs/superpowers/specs/2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md`)

**Không bắt đầu** trước khi `docs/adr/README.md` ghi ADR đó **accepted** và chủ trả lời Q1. Chủ chọn **B** (chép nơi check-in) thì Task 7 chỉ còn phần hàm thuần ở form, không migration — kế hoạch viết lại phần này.

Nếu chủ chọn **A** (khuyến nghị):

- [ ] **7.1 Đỏ:** tiêu chí 1–8 của ADR nháp.
- [ ] **7.2 Dữ liệu:**
  - **Nếu `0058` CHƯA lên `main`:** đưa cột vào `CREATE TABLE vc_leg_template` + `CHECK (default_dropoff_location_id IS NULL OR mode <> 'NONE')`. Không cần `0059`.
  - **Nếu `0058` đã lên `main`:** `0059_mau_chang_noi_tra.sql`, `ALTER TABLE vc_leg_template ADD COLUMN default_dropoff_location_id TEXT REFERENCES loc_location(id)` + trigger `BEFORE INSERT` thay cho `CHECK` (không thêm `CHECK` nhiều cột bằng `ALTER`). Bảng chỉ-thêm nên không cần trigger `UPDATE`.
- [ ] **7.3 Route:** `POST …/mau-chang/:code` nhận `noiTraMacDinhId`; vắng = chép bản hiện hành, **trừ khi** bản mới `mode = 'NONE'` → `NULL` (chép thì vi phạm NT-D1 và trả 400 bất ngờ — có ca riêng); điểm phải `active = 1` qua `v_loc_location_label`; `mode = NONE` + điểm → 400. Nhật ký thêm "nơi trả mặc định A → B" (tên điểm). Route form thêm khoá `noiTraMacDinh: { id, ten } | null` (điểm ngưng → `null`); sửa bài liệt kê khoá.
- [ ] **7.4 Hàm thuần:** `changMacDinh` điền `dropoffLocationId` chiều đi, `pickupLocationId` chiều về.
- [ ] **7.5 Kiểm định kỳ:** NT-D4 "mẫu hiện hành trỏ điểm đã ngưng" (`level: "warn"`) + bài.
- [ ] **7.6 Bài NT-D5:** lưu nháp chặng đi không nơi trả cho dịch vụ có mặc định → CSDL vẫn trống (máy chủ không tự điền).
- [ ] **7.7 e2e:** `catalog.mjs` thêm "gieo mẫu có nơi trả → `sync force` → mẫu y nguyên".
- [ ] **7.8** `docs/data-dictionary.json`: theo tiền lệ. Mở mục `integrityEdges`; nếu khoá ngoại `vc_trip_stop → loc_location` đã được liệt kê thì thêm `vc_leg_template → loc_location` cùng khuôn, nếu không thì thôi → `npm run dict`.

## Task 8 — "Số khách đi xe" cấp ĐƠN (`orders.ride_pax`) — **CHỜ ADR-0065** (không làm trong kế hoạch này)

- Lời chủ 1/10 (U2) gọi ô "Số khách đi xe" là `pax_override`. Nhưng:
  - `pax_override` của ADR-0054 là số người **riêng của một chặng về** (chỉ `RETURN`);
  - "Số khách đi xe" của **cả đơn** (lời chủ 30/9: "Bán hàng nhập một ô riêng, gợi ý bằng số khách lớn nhất; xe và đầu trang đơn dùng số này") là cột `orders.ride_pax` của **ADR-0065 — proposed**, câu 7 và câu 8 còn chờ chủ (`docs/superpowers/specs/2026-09-30-de-xuat-adr-ra-soat/cau-hoi-chu.md:49-77`).
  - Xem mục "Mâu thuẫn cần chủ" cuối tệp.
- Móc đã chừa: tham số thứ ba `them.soKhachDiXe` của `soNguoiChang` (Task 2). ADR-0065 thay công thức trong **một** hàm, không sửa nơi gọi.
- Khi ADR-0065 được duyệt, kế hoạch riêng của nó phải:
  - tạo lại trigger `orders_delivered_lock` (`0044`) có thêm cột;
  - lấy số migration theo luật lúc gộp;
  - sửa câu L-R1 theo bảng "Câu ADR bị thay" của ADR-0065.

## Task 9 — e2e (làm ngay, sau Task 1–6)

**Tệp:** `tests/e2e/chang-hanh-khach.mjs` (mở rộng), `tests/e2e/mau-chang.mjs` (mới, thêm vào `run.mjs`), `tests/e2e/tai-xe-cuoc.mjs`, `tests/e2e/catalog.mjs`.

- [ ] **9.1** `chang-hanh-khach.mjs`:
  - lưu nháp có `flightCode` + chuẩn hoá;
  - nháp không khoá → giữ;
  - Đối tác gửi `paxOverride` khác → 403;
  - Quản trị nhánh nháp → 200;
  - xác nhận → sửa số hiệu dưới mốc không đòi đặt gấp;
  - `paxOverride` vượt → 400.
  - Đăng nhập luôn qua `login()` / `session()` của `tests/e2e/lib.mjs`.
- [ ] **9.2** `tai-xe-cuoc.mjs`: chi tiết cuốc có `soHieuChuyenBay` ngoài ngày chạy, không tên khách.
- [ ] **9.3** `mau-chang.mjs`: ghi / đọc lịch sử (Quản trị), 403 (Bán hàng), route form (Đối tác 200, HDV 403). `catalog.mjs`: gieo mẫu → `sync force` → mẫu còn (TC-M7). Dùng mã dịch vụ thật đọc từ Sheet, **không** mã giả `ZZ*` (bẫy công thức k).
- [ ] **9.4** `npm run test:e2e` **đủ bộ** (chạm migration), cần mạng; tắt `wrangler dev` mồ côi trước. Đuôi `audit-invariants --strict` xanh.

## Task 10 — Tài liệu (làm ngay)

- [ ] `docs/data-dictionary.json` + `npm run dict`: bảng `vc_leg_template`. Cột mới của `ord_transfer_leg` không liệt kê (sổ không liệt kê cột — z2 "Làm" 1), nhưng thêm ghi chú nếu bảng có `note`.
- [ ] `docs/SYSTEM-DESIGN.md`: §5 (dữ liệu), §7 (route `mau-chang`, khoá mới của chặng), §6 luồng chặng (số người chiều về, số hiệu chuyến bay).
- [ ] `docs/CHANGE-GUIDE.md`:
  - công thức z: hai ô mới, luật "khoá vắng = giữ", bẫy mốc chỉ-đổi-ô-phụ, `soNguoiChang` một luật;
  - công thức mới "mẫu chặng";
  - bảng §3 kiểm nào;
  - bẫy mới: `CHECK` nhiều cột qua `ALTER` → trigger.
- [ ] `docs/SO-HANG-RAO.md`: một dòng mỗi hàng rào, kèm ngày thấy chặn thật:
  - trigger + `CHECK` `pax_override`;
  - `CHECK` `flight_code`;
  - trigger chỉ-thêm mẫu chặng;
  - bài một luật số người;
  - bài khoá route form mẫu chặng;
  - 403 lưu nháp `paxOverride`.
- [ ] Sổ thi công: ruling 0.2 (số migration), 0.5 (`logicalRefs`), 1.2 (lệch chữ `CHECK` → trigger), 4.3 (`giay-to-khong-lo-so` không áp).
- [ ] **Không** tự sửa `CLAUDE.md`, `src/CLAUDE.md`, ADR. Đề xuất diff nếu cần. CHANGE-GUIDE z / z3 còn ghi "nhánh thi công, CHƯA gộp" dù mã đã ở `main` từ 1.38: đây là tài liệu mô tả nên sửa được, ghi lại.

## Task K — Kiểm độc lập (bắt buộc — việc lớn: dữ liệu)

- [ ] Gọi subagent `nguoi-kiem-doc-lap` (chỉ đọc), đưa cho nó:
  - kế hoạch này, ADR-0054, ADR-0055 VK2-C;
  - danh sách commit;
  - lệnh để tự chạy lại: `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`.
- [ ] Người kiểm đối chiếu từng TC ở trên với mã thật và kiểm lại các mục sau:
  - không câu SQL gác mới;
  - không ô quyền mới;
  - DTO tài xế không thêm khoá nào ngoài `soHieuChuyenBay`;
  - biên nhận không đổi;
  - dòng sổ hàng rào có ngày.
- [ ] Chỉ báo "đạt" dựa trên báo cáo người kiểm + test xanh. Người thi công không tự nghiệm thu (N8).

---

## Mâu thuẫn cần chủ (ghi để điều phối trình một lần — không chặn Task 0–6, 9, 10)

1. **"Số khách đi xe" là ô nào?**
   - U2 (1/10) ghi "Số khách đi xe" (`pax_override`, ADR-0054). Thực ra:
     - ADR-0054 = số người riêng của **chiều về** của từng chặng;
     - "Số khách đi xe" cấp **đơn** (Bán hàng nhập, gợi ý bằng số khách đông nhất) là `ride_pax` của **ADR-0065 — chưa duyệt**, còn câu 7, 8.
   - Kế hoạch làm đúng ADR-0054 đã duyệt và để ADR-0065 chờ (Task 8).
   - Nếu ý chủ là ô cấp đơn thì cần duyệt ADR-0065 (lượt 2b). Khi đó ADR-0065 sửa công thức `soNguoiChang` và L-R1.
2. **Ai nhập.** ADR-0054: "chỉ văn phòng" (`order.trip.edit`: Bán hàng đơn mình / phụ trách, Quản trị, Toàn quyền). ADR-0065 nháp: "Bán hàng nhập", theo cùng ô. Hai ADR khớp về người ghi; Đối tác / Thực tập lập nháp không sửa được cả hai số. Nếu chủ muốn Đối tác tự ghi "khách về ít hơn" thì phải có ADR mới (nới quyền).
3. **Số migration 0056 trong tài liệu quyết định 1/10 đã cũ** (nhánh gộp hồ sơ giữ `0056`). Không cần chủ quyết, chỉ ghi.
4. **Nơi trả mặc định:** Q1 của ADR nháp (A cột mẫu — khuyến nghị / B chép nơi check-in) + xin đồng ý ghi "điểm đón nội thành" vào sổ việc để sau.
