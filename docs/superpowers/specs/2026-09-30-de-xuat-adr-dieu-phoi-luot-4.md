# Đề xuất ADR-0054 (số tạm) — Bảng điều phối chung, lượt duyệt 4: chiều về theo dịch vụ (mẫu chặng trong Danh mục) và số người riêng của chặng về

- **Trạng thái:** **ĐỀ XUẤT — chờ người kiểm độc lập (chỉ đọc) rồi chủ duyệt.** AI soạn (vai lập kế hoạch), không tự duyệt (Hiến pháp N3, Điều 7.2). Số ADR là **số tạm**; điều phối cấp số thật lúc ghi vào `docs/adr/` (`docs/adr/README.md:63` hiện ghi số kế tiếp là 0052; ba đề xuất của lượt duyệt A dùng tạm 0052, 0053, 0054).
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt A (trang ghép chung `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`). **Độc lập** với ADR-0052, ADR-0053: không đụng bảng `vc_`, trình và duyệt lúc nào cũng được ([TK] §6.4 dòng D10, §8.1 lát 4.1).
- **Nguồn (lời chủ, chuẩn — không hỏi lại):**
  - [HĐ] = `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`:
    - "Cách xe chạy thật" mục 3: *"**Chiều về:** tuỳ dịch vụ → **khai theo từng dịch vụ trong danh mục** (không đưa đón / một chiều / hai chiều; lập đơn tự tạo đúng số chặng, sửa tay được)."*
    - "Trả lời lần 16": **ĐP1 = a — "Có"** ("Chiều về được ít người hơn chiều đi; văn phòng sửa số người chặng về"); **ĐP10 = a — "Trong app"** ("cài trong app, màn Danh mục, có lịch sử (không phải cột Google Sheet)").
  - Câu hỏi và phương án nguyên văn: [TK] = `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:1064-1067` (ĐP1), `:1141-1144` (ĐP10). Phương án (a) của ĐP1: *"Văn phòng sửa được số người của riêng chặng về, không vượt số khách của đơn."* Phương án (a) của ĐP10: *"Trong app, ở màn Danh mục (Quản trị sửa, có lịch sử, có ngày hiệu lực)."*
  - Tệp gom câu: `docs/superpowers/specs/2026-09-30-van-chuyen-cau-hoi-cho-chu.md` mục 4, mục 10.
- **Thiết kế dẫn:** [TK] C5 (`:36`), CH-09 (`:380`), §5.10 (`:838-845`), §6.4 D10 (`:917`), §6.5.4 (`:987-993`), lát 4.1–4.2 (`:1200-1201`, `:1284`); V12, V14 (`:703`, `:705`).
- **ADR liên quan:** ADR-0047 (chặng, `ord_transfer_leg`, số khách hiệu lực — **bị thay một câu**), ADR-0049 (lịch chung, L-D1, L-B1, `kiemXuatBen`), ADR-0033 (route danh mục cho người lập đơn), ADR-0002 (đồ thị, tiền tố), ADR-0019 (cổng). Hiến chương Phần I (đã duyệt): 2.2, 4.1, 5.1, 5.2, 5.3, 5.5, 5.6, 5.13.
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 2026-09-30 ở HEAD `3fc295b`). Không dùng ô hoãn nào của mục `thao_tac`.
- **Xây trên nền chưa có (Hiến chương 5.13):** ADR-0047 (chặng `ord_transfer_leg`, `0034`) và ADR-0049 (lịch chung, `kiemXuatBen`) **đã duyệt nhưng CHƯA gộp `main`, CHƯA phát hành**: `0034`/`0035` chỉ có trên nhánh `thi-cong-adr-0049-tiep` và `giao-dien-dieu-phoi-luot-1`; `main` dừng ở `0039` (kiểm 30/9 bằng `git ls-tree`); lần kiểm chỉ-đọc 30/9 ([HĐ] "Trả lời lần 15") cho thấy `0034`, `0035`, `0040`–`0043` chưa áp remote. Lát của ADR này đứng **sau** khi `0034` lên `main`.
- **Loại:** xem mục "Cửa một chiều / hai chiều".

---

## Tóm tắt cho chủ (lời thường)

1. Mỗi dịch vụ trong Danh mục có thêm một ô **"Đưa đón"**: *không đưa đón / một chiều / hai chiều* (tuỳ chọn: giờ đón gợi ý cho chiều về). Quản trị cài trong app; mỗi lần đổi là một bản mới, có ngày giờ và người đổi, xem lại được.
2. Lập đơn: chọn dịch vụ "hai chiều" thì form **tự tạo sẵn** chặng đi và chặng về; người lập vẫn thêm, bỏ, sửa tay được. Đây chỉ là **gợi ý sẵn**, máy không bắt.
3. Chặng **về** có thể **ít người hơn** chiều đi (ví dụ 2 khách ở lại đảo). Văn phòng ghi số người về; không vượt số khách của dịch vụ.
4. Xe về chỉ giữ chỗ cho đúng số người về; danh sách tên đủ khi có đủ tên cho số người về.
5. Bảng giá trên Google Sheet **không đổi**.
6. Không đụng chuyến xe, không đụng tiền.
7. **Ai sửa số người chặng về:** đúng như bạn nói, **văn phòng** (Bán hàng với đơn mình lập hoặc phụ trách, Quản trị, Toàn quyền) — dùng quyền sửa chuyến đi có sẵn. Đối tác, Thực tập, Hướng dẫn viên không sửa được. Không câu nào cần bạn trả lời thêm.
8. **Bạn cần vẽ:** V12 (phần tự tạo chặng trên form đơn) và V14 (ô "Đưa đón" ở màn Danh mục).

---

## Quyết định

### D10.1 Mẫu chặng theo dịch vụ ("dịch vụ đưa đón mấy chiều") — dữ liệu trong app, có lịch sử (ĐP10 = a)

- **Bảng mới `catalog_transfer_template`**, chủ là module `catalog` (tiền tố `catalog_` đã có — `migrations/0006_catalog.sql:25`, `:44`, `:54`; **không** thêm tiền tố mới vào ADR-0002). Chỉ-thêm, có ngày hiệu lực (Hiến chương 5.2; khuôn `vc_dispatch_policy`).

  | Cột | Nghĩa |
  |---|---|
  | `id` | |
  | `code` | mã dịch vụ — **cùng khoá** với `catalog_override.code` (`0006:44`), không khoá ngoại tới `catalog_item` (dòng Sheet có thể biến mất rồi quay lại) |
  | `mode` | `CHECK IN ('NONE','ONE_WAY','ROUND_TRIP')` — tập đóng, định trọn |
  | `return_time_hint` | giờ đón gợi ý chiều về (`HH:MM`, NULL = không gợi ý); `CHECK` khuôn giờ; chỉ có khi `mode = 'ROUND_TRIP'` |
  | `valid_from_at` | lúc máy chủ ghi (hiệu lực ngay — khuôn lời chủ "Hiệu lực ngay" cho chính sách điều phối, [HĐ] "Trả lời lần 12" câu 3); `UNIQUE (code, valid_from_at)` |
  | `created_at`, `created_by` | dấu vết |

  - Dòng hiệu lực của một dịch vụ = dòng mới nhất đã tới. Không có dòng nào = `NONE` (không đưa đón) — đúng [TK] CH-09 "trống = không đưa đón".
  - Trigger cấm `UPDATE`/`DELETE` (chỉ-thêm). Đổi = thêm dòng.
- **Không phải cột Sheet** (chủ chọn a): đồng bộ Sheet 15 phút **không** chạm bảng này (`catalog_sync` không đổi).
- **Quyền:** ghi = cổng `admin` + `can(admin.manage)` (Quản trị, Toàn quyền — `src/shared/permissions.ts:100@thi-cong-adr-0049-tiep`), cùng ô với việc ghi đè danh mục hiện có. **Không thêm ô.** Đọc: màn Danh mục (cổng `admin`) và DTO danh mục cho người lập đơn (route của ADR-0033, cổng `orders`) — thêm **một** trường `duaDon: { mode, gioVeGoiY }`, không tiền.
- **Nhật ký:** `catalog_transfer_template_set` — `detail` = mã dịch vụ, chế độ cũ → mới, giờ gợi ý. Không dữ liệu cá nhân.

### D10.2 Lập đơn tự tạo chặng theo mẫu — chỉ là mặc định, sửa tay được

- Một hàm thuần ở `src/shared/` (tên đề xuất `changMacDinh(mauChang, dichVu)`) trả danh sách chặng gợi ý cho **một** dịch vụ:
  - `NONE` → 0 chặng; `ONE_WAY` → 1 chặng `OUT`; `ROUND_TRIP` → `OUT` + `RETURN` (chặng về: nơi đón = nơi trả chiều đi, nơi trả = nơi đón chiều đi, giờ = `return_time_hint` hoặc trống).
- **Form đơn** gọi hàm này khi người lập chọn dịch vụ, rồi cho thêm/bỏ/sửa như hôm nay (ADR-0047 A1). **Máy chủ không tự tạo chặng và không bắt số chặng khớp mẫu** — mẫu là gợi ý (CH-09 "không chặn"). Lý do: tự tạo ở máy chủ thì chặng người lập đã bỏ sẽ bị tạo lại.
- Đơn **đã có** không bị đổi khi Quản trị đổi mẫu (5.6: mẫu chỉ dùng lúc lập).
- Chiều về chưa có giờ vẫn **không xếp xe được** tới khi có giờ ([TK] §5.10 bước 2 — giữ nguyên ADR-0049).

### D10.3 Số người riêng của chặng về (ĐP1 = a)

- **Cột mới trên `ord_transfer_leg`** (bảng của `orders`, `0034_chang_dua_don.sql:7-31@thi-cong-adr-0049-tiep`; hôm nay **không** có cột số người): `pax_override INTEGER NULL`.
  - `CHECK (pax_override IS NULL OR (pax_override >= 1 AND direction = 'RETURN'))` — chỉ chặng **về**; 0 người thì **bỏ chặng** (đóng dòng có lý do, ADR-0047 A1), không ghi 0.
  - NULL = theo số khách hiệu lực của dịch vụ (như hôm nay).
- **Số người hiệu lực của một chặng = một hàm thuần duy nhất** ở `src/shared/` (tên đề xuất `soNguoiChang(chang, soKhachDichVu)`): `pax_override` nếu có và ≤ số khách dịch vụ; nếu số khách dịch vụ sau này **giảm xuống dưới** `pax_override` thì lấy số khách dịch vụ (máy không tự sửa cột; câu kiểm định kỳ báo).
  - **Mọi nơi đang dùng "số người của chặng" phải đổi sang hàm này, trong cùng lát:** `lichChungChang` (`src/modules/orders/index.ts:268@thi-cong-adr-0049-tiep`), kiểm L-D1 (số suất mở ≤ số người) ở máy chủ, `kiemXuatBen` vế L-B1 (đủ tên cho số người), `trangThaiChang`, câu kiểm định kỳ L-D1/L-B1. Bài kiểm "một luật" (khuôn bài học Đợt E "hai luật"): quét mã, không nơi nào tự tính số người chặng ngoài hàm này.
- **Quyền — áp lời chủ "văn phòng sửa" vào ô có sẵn, không thêm ô:** chỉ người qua `can(order.trip.edit, { ownerId, assigned })` ghi được `pax_override`, **cả khi đơn nháp lẫn đã xác nhận** (`permissions.ts:78@thi-cong-adr-0049-tiep`: SALES `ownOrAssigned`, ADMIN `any`, SA `any`; mọi cột khác `none` — đúng tập "văn phòng"). Đối tác, Thực tập, HDV **không** ghi được.
  - Lưu nháp của người chỉ có `order.modify` (đơn nháp xoá–chèn lại chặng — C21): máy chủ **chép lại** `pax_override` cũ cho chặng về còn giữ; gửi giá trị khác bản cũ → 403. Tiền lệ: dấu "đặt gấp" được giữ qua lần lưu nháp ([HĐ] "Trả lời lần 6" Q1).
  - Chặng về bị bỏ rồi thêm lại → mất `pax_override` (chặng mới).
- **Mốc 6 giờ:** đổi số người **không** phải đổi "ngày, giờ, nơi đón, nơi trả" nên **không** đòi đặt gấp (ADR-0049 D2 chỉ liệt kê bốn trường đó). Chặng đã lên xe mà số người giảm → lịch chung hiện "thừa suất — gỡ bớt", chuyến bị **giữ** tới khi người xếp xe gỡ ([TK] §1.5 cuối; ADR-0049 D2 "giữ"); tăng → "thiếu suất".
- **Nhật ký:** sửa chặng dùng hành động có sẵn `order_leg_updated` (ADR-0047), `detail` thêm "số người về cũ → mới". Không tên.

---

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0047 A1 | "**Số người của riêng chặng** (`pax_override`, chiều về ít người hơn): **chờ lượt 2** (Q6)." ([TK] `:1009` trích) | "Chặng **về** có `pax_override` (≥ 1, chỉ `RETURN`); số người hiệu lực của chặng tính bằng một hàm thuần duy nhất (ADR-0054 D10.3)." |
| ADR-0047 A1 (tạo chặng) | chặng do người lập thêm tay ("Thêm chiều về") | "… Form đơn **tạo sẵn** chặng theo mẫu của dịch vụ (`catalog_transfer_template`, ADR-0054 D10.1–D10.2); người lập sửa tay được; máy chủ không bắt khớp mẫu." |
| ADR-0049 D1 (hàm `lichChungChang`, danh sách trường) | "… số người, số người đã có tên …" | "… số người **hiệu lực của chặng** (`soNguoiChang`, ADR-0054) …" — danh sách trường không thêm khoá |
| ADR-0033 (DTO danh mục cho người lập đơn) | (không có trường đưa đón) | thêm `duaDon: { mode, gioVeGoiY }` — không tiền |

## Lệch có chủ ý khỏi Hiến chương 5.1 (khuôn ADR-0029; chỉ hợp lệ khi chủ duyệt)

| Mã | Phạm vi | Vì sao chỉ ở mã | Lớp bù | Điều kiện gỡ |
|---|---|---|---|---|
| **L-R1** (mới) | `pax_override` ≤ số khách hiệu lực của dịch vụ | số khách hiệu lực nằm trong JSON của `orders` (`after_json`) — cùng gốc với L-A1 (ADR-0047), L-D1 (ADR-0049) | máy chủ kiểm lúc lưu chặng; hàm `soNguoiChang` kẹp lúc đọc; câu kiểm định kỳ "chặng về có số người vượt số khách dịch vụ" (báo, không chặn) | số khách hiệu lực thành cột có kiểu — **cùng điều kiện gỡ** L-A1, L-D1 |

Phần còn lại có lớp CSDL đủ: `CHECK` của `pax_override` (≥ 1, chỉ `RETURN`); `CHECK` `mode`; trigger chỉ-thêm của `catalog_transfer_template`.

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** chủ và tên bảng `catalog_transfer_template` (module `catalog`); tập `mode` trong `CHECK`; cột `pax_override` trên `ord_transfer_leg` một khi đã có dòng mang giá trị.
- **Hai chiều:** giờ gợi ý; luật tự tạo chặng (hàm thuần, chỉ ở form); ai sửa `pax_override` (ô có sẵn); nhãn màn hình.
- **Không một chiều nào về dữ liệu cá nhân hay tiền.**

## Hệ quả

- **Migration:** hai migration chỉ-thêm (hoặc một), **số ≥ 0044, lấy lúc thi công** sau khi liệt kê migration của **mọi nhánh và worktree chưa gộp** (`CLAUDE.md` §10; `docs/adr/README.md:77` ghi "số kế tiếp cho việc khác là 0044"; sổ tiền, Kernel lượt 2–3 và ADR-0052/0053 có thể lấy số trước). `ALTER TABLE ord_transfer_leg ADD COLUMN pax_override …` phải đứng **sau** `0034` trên cùng nhánh phát hành.
- **Module `catalog` đang là LEGACY** (`src/architecture.test.ts:74`, bảng ở `LEGACY_TABLES :90-92`). Bảng mới trong module cũ: kế hoạch thi công phải kiểm luật của `src/architecture.test.ts` cho bảng mới của module LEGACY (**chưa kiểm**); nếu hàng rào đòi, bảng mới đi đường SQL nghiêm (`defineSql`) ngay từ đầu — **siết**, không nới.
- **Đồ thị:** không cạnh mới. `orders → catalog` đã có (`src/architecture.test.ts:40`); `catalog` không đọc `orders`.
- **Ô quyền:** không ô mới, không đổi giá trị ô nào (xem trang ghép).
- **Route (tên đề xuất, kế hoạch chốt):** `GET/POST /api/catalog/:code/dua-don` (cổng `admin`, `admin.manage`) — xem lịch sử, thêm bản mới. Route danh mục cho người lập đơn (ADR-0033) thêm trường `duaDon`. Route lưu chặng của `orders` nhận thêm `soNguoiVe`.
- **Bất biến `audit-invariants` (câu mới):** "chặng về có `pax_override` > số khách hiệu lực của dịch vụ" (cảnh báo, L-R1); "chặng có `pax_override` mà không phải `RETURN`" (vi phạm — lưới thứ hai sau `CHECK`).
- **Hàng rào mới** (mỗi cái một dòng `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật: sửa cố ý → đỏ → hoàn nguyên):
  - `CHECK` `pax_override` (ghi `pax_override` cho chặng `OUT` → `RAISE`; ghi 0 → `RAISE`);
  - trigger chỉ-thêm `catalog_transfer_template` (`UPDATE`/`DELETE` → `RAISE`);
  - bài "một luật số người chặng" (thêm cố ý một chỗ tự tính số người → đỏ);
  - bài ghim DTO danh mục người lập đơn (khoá `duaDon` không mang tiền).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Việc lớn** (dữ liệu) ⇒ người kiểm độc lập chỉ đọc sau thi công.

## Tiêu chí nghiệm thu (kiểm bằng máy)

1. SQL (`node:sqlite`): `UPDATE`/`DELETE` dòng `catalog_transfer_template` → `RAISE`; `mode` ngoài tập → `RAISE`; `return_time_hint` khi `mode ≠ ROUND_TRIP` → `RAISE`.
2. Route: Quản trị thêm bản mẫu → 201, bản cũ còn trong lịch sử; Bán hàng → 403; Toàn quyền → 201.
3. Hàm `changMacDinh`: "hai chiều" → đúng 2 chặng, chặng về đảo nơi đón/trả; "một chiều" → 1; "không đưa đón" hoặc không có dòng → 0 (bảng ca).
4. Form (kịch bản Chrome, khuôn `web/CLAUDE.md`): chọn dịch vụ "hai chiều" → hiện sẵn 2 chặng; bỏ chặng về, lưu nháp, mở lại → vẫn 1 chặng (máy chủ không tạo lại).
5. `pax_override`: chặng `OUT` → 400 ở route **và** `RAISE` ở CSDL; 0 → 400/`RAISE`; vượt số khách dịch vụ → 400 (L-R1); hợp lệ → 200, nhật ký có "số người về cũ → mới", không tên.
6. `soNguoiChang` là nơi duy nhất: `lichChungChang` trả số người = `pax_override`; `kiemXuatBen` đòi đủ tên theo số người về (2/4 khách có tên, chặng về 2 người → đạt); L-D1 máy chủ chặn mở suất thứ 3 cho chặng về 2 người.
7. Đổi mẫu dịch vụ không đổi chặng của đơn đã có.
8. Quyền `pax_override`: Bán hàng (đơn mình) → 200; Bán hàng đơn người khác → 403; Quản trị → 200; Đối tác / Thực tập lưu nháp gửi giá trị khác → 403, lưu nháp không gửi → giá trị cũ còn nguyên; HDV → 403.
9. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` (thoát 0 dữ liệu sạch, thoát 1 dữ liệu gieo lỗi L-R1).

## Phương án bị loại

- **Cột mới trong Google Sheet** (ĐP10 b): chủ chọn trong app; Sheet sửa nhầm là đổi cách lập đơn mà không biết ai đổi.
- **Ghi đè tại chỗ trong `catalog_override`** (thêm cột): bảng đó ghi đè không lịch sử (`0006:44`, khoá chính `code`); chủ đòi "có lịch sử".
- **Máy chủ tự tạo chặng theo mẫu:** tạo lại chặng người lập đã bỏ; trái "sửa tay được".
- **Chiều về luôn đủ người, ai không về thì "vắng"** (ĐP1 b): chủ chọn a.
- **Cho `pax_override` ở cả chặng đi:** chủ chỉ nói chiều về; mở rộng sau bằng ADR (đổi một `CHECK`).

## Câu hỏi còn mở

**Không có.** Người sửa `pax_override` được chốt bằng **áp** lời chủ "văn phòng sửa số người chặng về" vào ô có sẵn (D10.3) — không thêm ô, không đổi nghĩa ô. Người kiểm soi điểm này; chủ bác được (khi đó phương án khác là cho mọi người sửa được chặng, gồm người lập nháp là Đối tác, Thực tập).

## Việc vẽ cần chủ

- **V12** (phần tự tạo chặng trên form đơn — [TK] `:703`, lượt 4) và **V14** (ô "Đưa đón" + lịch sử ở màn Danh mục — [TK] `:705`). Nguồn: tệp câu hỏi mục 8.
- Lưu ý: màn chặng của ADR-0047 (tệp câu hỏi mục 8, mục 1–5) **chưa vẽ**; V12 nên vẽ cùng lúc để khỏi vẽ hai lần.

## Chưa kiểm

- `catalog_item.code` có ổn định qua mỗi lần đồng bộ Sheet không — dựa vào việc `catalog_override` đã dùng `code` làm khoá (`0006:44`); **chưa kiểm** bằng dữ liệu thật.
- Luật của `src/architecture.test.ts` cho bảng mới trong module LEGACY.
- Số migration kế tiếp trên mọi nhánh `worktree-agent-*` (người đọc chỉ kiểm được các nhánh có tên liên quan).
- Tệp đề xuất này chưa có người kiểm độc lập.
