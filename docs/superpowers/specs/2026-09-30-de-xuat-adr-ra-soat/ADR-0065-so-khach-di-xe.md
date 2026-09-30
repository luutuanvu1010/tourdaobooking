# ADR-0065 — "Số khách đi xe" của đơn: một ô riêng, gợi ý bằng số khách lớn nhất; đầu trang đơn và xe dùng số này

- **Trạng thái:** **proposed** (bản nháp của người soạn, 2026-09-30; **đã sửa lần 1 theo báo cáo người kiểm độc lập** cùng ngày; **sửa lần 2 theo điều phối**: đổi số từ nháp "0062" sang 0065; **sửa lần 3 theo người kiểm độc lập vòng 2**: chốt thứ tự đoạn `detail` khi tự hạ, lý do luôn ở cuối; đã qua kiểm độc lập 2 vòng (ĐẠT CÓ ĐIỀU KIỆN, các điều kiện đã sửa ở commit này), bản sửa vòng 2 chưa được kiểm lại). AI không tự duyệt (Hiến pháp N3, Điều 7.2).
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt **2b** (cùng ADR-0064; ADR này là **1** quyết định chạm dữ liệu — cột `ride_pax` gồm cả luật khi số khách dịch vụ giảm). Trang ghép: `trang-ghep-luot-2.md` phần 2b. ADR-0063 là lượt 2a, duyệt riêng.
- **Mốc đo mã:** `824193f1` (= `origin/main` bản 1.38 + commit giao diện 1.39); các tệp máy chủ trích dẫn không khác `origin/main` = `1db777f4`.
- **Nguồn (lời chủ, đã chốt 30/9 — không hỏi lại):** "Số khách của đơn = số khách đi trên xe: Bán hàng **nhập một ô riêng** 'Số khách đi xe', **gợi ý sẵn bằng số khách lớn nhất** trong các dịch vụ; người bán sửa nếu khác. **Xe và đầu trang đơn dùng số này.**" Bối cảnh: báo cáo rà soát §2 dòng 42 ("Số khách" dải đầu **cộng dồn mọi dịch vụ**: 2 người lớn tour + 2 người lớn mô tô = "4 người lớn").
- **ADR liên quan:** ADR-0047 A1/A3, L-A1 (chặng gắn một dịch vụ; số khách hiệu lực một nguồn), ADR-0049 D1/D2 (`lichChungChang`, L-D1, L-B1, `kiemXuatBen`), **ADR-0054 D10.3** (`pax_override`, `soNguoiChang`, L-R1 — accepted, **chưa thi công**), ADR-0062 (tin khi đơn đổi sau xác nhận — Đ1 đã dành sẵn đoạn "số khách đi xe"), ADR-0063 (sửa số khách sau xác nhận; hằng "giờ"), ADR-0025 (khoá sau "Đã giao").
- **Hiến chương áp dụng:** 5.1, 5.4 (một nguồn — áp cho số người như bài học Đợt E), 5.5, 5.12.
- **Xây trên lỗ đang hở:** **không có** (`docs/quyen-hoan.json:63`).
- **Xây trên nền chưa có (5.13):** ADR-0054 D10.3 (`pax_override`, hàm `soNguoiChang`) đã duyệt nhưng **chưa có migration** trên `main` (không tệp nào thêm cột `pax_override`). Sổ tiền `0044` (trigger `orders_delivered_lock` liệt kê từng cột) chưa gộp `main` (`7621436e`).

---

## Tóm tắt cho chủ (lời thường)

1. Form đơn có ô **"Số khách đi xe"**. Máy điền sẵn số khách đông nhất trong các dịch vụ (vd tour 2 người + mô tô 2 người → 2). Khác thì người bán sửa.
2. **Đầu trang đơn** hiện số này ("2 khách đi xe") thay cho con số cộng dồn. Chi tiết từng loại khách vẫn ở từng dịch vụ.
3. **Xe** giữ chỗ theo số này (cách tính cụ thể cho từng chặng: câu 7 của `cau-hoi-chu.md`).
4. **Tiền không đổi**: tiền vẫn tính theo số khách của từng dịch vụ.
5. Nếu người bán không sửa ô, số này **tự đi theo** khi số khách dịch vụ đổi sau này (câu 7 của `cau-hoi-chu.md`).
6. Sau khi đơn đã xác nhận, đổi số khách đi xe cũng **báo tin** cho HDV phụ trách và người lập như đổi giờ (ADR-0062).
7. Nếu văn phòng hay HDV **giảm** số khách dịch vụ làm tổng khách nhỏ hơn số khách đi xe đã gõ, máy **tự hạ** số khách đi xe xuống bằng tổng mới và ghi lịch sử (khuyến nghị — câu 8).

---

## Bối cảnh (hiện trạng đo trên `824193f1`)

| Nơi | Hiện trạng | Nguồn |
|---|---|---|
| Dải đầu trang đơn | **cộng dồn** số khách mọi dịch vụ theo loại | `web/order.ts:230-234` |
| Số khách "của đoàn" đã có | `soKhachDoan` = số khách hiệu lực của dịch vụ **đông nhất** (Ruling R9) — dùng cho cờ "danh sách nhiều hơn số khách" | `src/shared/hanh-khach.ts:161-163`; gọi ở `src/modules/orders/service.ts:207-208` |
| Số người một chặng (xe) | = tổng số khách hiệu lực **của dịch vụ** chặng đó gắn (gồm cả em bé) | `src/modules/orders/index.ts:218` (`hanhKhachChoChuyen`), `:294` (`lichChungChang`); nguồn `soKhachHieuLuc` `:164` |
| Luật xe dùng số người chặng | vượt số người (`VUOT_SO_NGUOI_CHANG`), thiếu suất (`THIEU_SUAT`) | `src/shared/dieu-phoi-kiem.ts:212`, `:341` |
| Chặng gắn đúng một dịch vụ | mỗi dịch vụ tự có chặng đi/về | `migrations/0034_chang_dua_don.sql:7-12`; ADR-0047 A1 |
| Số người riêng chiều về | `pax_override` + `soNguoiChang(chang, soKhachDichVu)` — **đã duyệt, chưa làm** | `docs/adr/ADR-0054-*.md` D10.3 |
| Khoá `orders` sau "Đã giao" | trigger liệt kê từng cột ⇒ thêm cột `orders` phải tạo lại trigger | `migrations/0044_orders_da_giao.sql:38-46` @`7621436e` |

---

## Quyết định

### D1. Dữ liệu

1. **Cột mới trên `orders`** (module `orders`): `ride_pax INTEGER NULL CHECK (ride_pax IS NULL OR ride_pax >= 1)`.
   - `NULL` = "theo gợi ý" (xem Q2 — câu 7).
   - Thêm bằng `ALTER TABLE … ADD COLUMN` (expand, chỉ thêm). Đơn cũ = `NULL` ⇒ hành vi như gợi ý, không cần chép dữ liệu.
   - Migration `0049` luôn đứng sau `0044` (Sổ tiền) ⇒ **cùng migration** phải `DROP TRIGGER orders_delivered_lock` rồi tạo lại có thêm `NEW.ride_pax IS OLD.ride_pax` — bài NT-R6 của Sổ tiền bắt nếu quên.
2. **Hàm thuần duy nhất** ở `src/shared/` (tên đề xuất `soKhachDiXe(ridePax, paxTheoDichVu)`): `ridePax` nếu khác `NULL`, không thì `soKhachDoan(paxTheoDichVu)` (dùng lại hàm R9, `hanh-khach.ts:161`). Kết quả kẹp `≤` tổng cộng dồn mọi dịch vụ lúc đọc.
3. **Kiểm lúc ghi (máy chủ):** `1 ≤ ride_pax ≤` tổng số khách hiệu lực cộng dồn của đơn. Lệch 5.1 có tên **L-R2** (dưới).
4. **Tiền:** `ride_pax` **không** vào `buildLines`, không vào `effectiveMoney`, không vào biên nhận tiền. Bài quét: không hàm tiền nào đọc `ride_pax`.

### D2. Nơi dùng số này (một luật — mọi nơi đổi trong cùng lát)

- **Đầu trang đơn** (`web/order.ts:230-234`): "N khách đi xe" (không chia loại).
- **Thẻ danh sách đơn** (`web/order-card.ts:155` "Số khách"): cùng số, cùng hàm — để "số khách của đơn" chỉ có một nghĩa.
- **Cờ danh sách hành khách** (`service.ts:207` — hôm nay `soKhachDoan`): đổi sang `soKhachDiXe`.
- **Số người của chặng (xe):** theo trả lời **Q1** (câu 7); mọi nơi ADR-0054 D10.3 liệt kê (`lichChungChang`, `hanhKhachChoChuyen`, L-D1 ở máy chủ, `kiemXuatBen` vế L-B1, `trangThaiChang`, câu kiểm định kỳ) đi qua **một** hàm `soNguoiChang`.
- DTO chi tiết đơn thêm `ridePax: number | null` (giá trị lưu) và `soKhachDiXe: number` (đã tính ở máy chủ). Màn không tự tính.

### D3. Ai nhập, ai sửa

- **Theo khuôn ADR-0054 D10.3 (accepted — ai ghi "số người trên xe")**, không nới: chỉ người qua `can(order.trip.edit, { ownerId, assigned })` (`permissions.ts:78`: Bán hàng đơn mình/đang phụ trách, Quản trị, Toàn quyền) ghi `ride_pax`, **cả khi nháp lẫn đã xác nhận**. Lời chủ: "Bán hàng nhập".
- Đối tác, Thực tập (chỉ có `order.modify`) lưu nháp: máy chủ **chép lại** `ride_pax` cũ; gửi giá trị khác bản cũ → 403 (tiền lệ D10.3). Ô trên form của họ chỉ hiện số gợi ý, không sửa được.
- **Route nào ghi `ride_pax`:**
  - **Đơn nháp:** `PUT /api/orders/:id` (chỉ nhận nháp — `src/modules/orders/index.ts:554` trả `NOT_EDITABLE` cho đơn khác nháp). `ridePax` khác bản cũ ⇒ hỏi thêm `can(order.trip.edit, { ownerId, assigned })`. Nhật ký: đoạn "số khách đi xe A → B" gộp vào dòng `updated` (đơn nháp không sinh tin — ADR-0062).
  - **Đơn đã xác nhận:** **chỉ** `PUT /api/orders/:id/trip` (thân thêm khoá `ridePax`). Câu **đầu lô** của `updateTrip` (`UPDATE orders SET updated_at = ? … WHERE … updated_at = ?`, `src/modules/orders/repository.ts:1179`) ghi thêm `ride_pax` — không thêm câu, không thêm lô.
  - **Bẫy "không đổi gì → trả sớm":** hôm nay `PUT /trip` trả sớm khi `moTa === null` (`index.ts:605-606`). Hàm dựng `moTa` phải thêm đoạn **"số khách đi xe A → B"** khi `ridePax` đổi, để lệnh **chỉ** đổi ô này không bị nuốt. Bài kiểm riêng (bài 4b).
  - Lệnh **chỉ** đổi `ride_pax`: **không** chèn dòng `ord_schedule_edit`, **không** đòi ghi chú đổi giờ, **không** xét mốc 6 giờ / `datGap` (nhánh `datGap` chỉ chạy khi có thao tác chặng — `index.ts:611`), **không** tính vào hạn "2 lần đổi giờ" (ADR-0063 D3.2). Lệnh đổi cả giờ lẫn `ride_pax` thì tính lượt vì phần giờ.
- **Tin khi đổi sau xác nhận (ADR-0062):** đoạn "số khách đi xe A → B" nằm trong dòng `trip_updated` của lệnh; ADR-0062 Đ1 đã dành sẵn đoạn này trong tập đoạn nhận ⇒ HDV phụ trách và người lập nhận tin, không cần hành động nhật ký riêng. Chọn cách này vì: một lệnh = một dòng nhật ký = một tin; cờ `doiSoKhach` giữ đúng nghĩa "ghi `order_money_adjustment`" (ADR-0063 bài 4). Tiền tố "số khách đi xe " khác "số khách: " (ADR-0062 Đ2, ca chéo trong bài khứ hồi).
- **Khi số khách dịch vụ giảm làm `ride_pax` cố định vượt tổng (L-R2 ở đường ghi tiền):**
  - Xảy ra ở **cả hai** route sửa số khách: route HDV (`handler-money-edit`) và route văn phòng (ADR-0063 D1). Người gọi hai route này (HDV, Kế toán) **không** có `order.trip.edit`, nên "từ chối, bắt sửa ô số khách đi xe trước" là **ngõ cụt** cho họ.
  - **Khuyến nghị (câu 8 = A):** luật nằm trong **đường ghi chung** `insertMoneyAdjustment` (sau khi `planMoneyEdit` ra tổng mới): nếu `ride_pax` khác `NULL` và lớn hơn tổng số khách hiệu lực mới ⇒ thêm câu `UPDATE orders SET ride_pax = <tổng mới> WHERE id = ? AND ride_pax > <tổng mới>` vào **cùng lô nguyên khối** của `insertMoneyAdjustment` (lô này không dùng lính gác: va chạm `seq` ném lỗi và cả lô quay lại — chú thích `repository.ts:1125-1130`; câu mới theo cùng cơ chế). Câu đăng ký bằng `defineSql` ở tệp nửa nghiêm `src/modules/orders/chang-hanh-khach-repo.ts` (không thêm SQL mới vào `repository.ts` LEGACY); **Thứ tự `detail` cố định** (khớp ADR-0062 Đ2): `"số khách: …" · "số khách đi xe A → B" · "lý do: …"` — tức `số khách: <dịch vụ>: người lớn 4 → 3 · số khách đi xe 4 → 3 · lý do: Khách bớt người`. **Lý do LUÔN ở cuối** (hàm đọc tin cắt tại " · lý do: " đầu tiên; lý do của route HDV còn là chữ tự do). Tin của ADR-0062 **có mang** đoạn tự hạ (câu tin "đổi số khách (…) · số khách đi xe 4 → 3") — giả định người soạn ghi ở ADR-0062 Đ2, đảo được. `ride_pax = NULL` thì không đụng (tự đi theo gợi ý). Kế toán **không** được sửa ô số khách đi xe riêng (giữ khuôn ADR-0054 D10.3).
  - Phương án khác (câu 8): B — Kế toán sửa được cả hai (hộp "Sửa số khách dịch vụ" của Kế toán có thêm ô số khách đi xe; mở rộng người ghi `ride_pax` ra ngoài `order.trip.edit`, lệch khuôn ADR-0054 D10.3); C — từ chối lưu (ngõ cụt như trên).
  - **Vì sao tách quyền** (Kế toán sửa số khách dịch vụ nhưng không sửa số khách đi xe): số khách dịch vụ là **tiền** (Kế toán giữ); số khách đi xe là **vận hành xe**, do người lập / Quản trị giữ theo ADR-0054 D10.3 và lời chủ "Bán hàng nhập". Tự hạ khi vượt giữ dữ liệu đúng mà không mở thêm quyền.
- **Nhãn:** ô / nút "**Số khách đi xe**" — khác nút "**Sửa số khách dịch vụ**" của ADR-0063 D1.12, để người dùng không lẫn hai con số.
- **Chặng đã lên xe mà số giảm** ⇒ lịch chung hiện "thừa suất — gỡ bớt", chuyến bị **giữ** (ADR-0049 D2 "giữ"; khuôn ADR-0054 D10.3).

---

## Lệch có chủ ý khỏi Hiến chương 5.1 (khuôn ADR-0029; chỉ hợp lệ khi chủ duyệt)

| Mã | Phạm vi | Vì sao chỉ ở mã | Lớp bù | Điều kiện gỡ |
|---|---|---|---|---|
| **L-R2** (mới) | `ride_pax ≤` tổng số khách hiệu lực cộng dồn | số khách hiệu lực nằm trong JSON của `order_money_adjustment` (cùng gốc L-A1, L-D1, L-R1) | máy chủ kiểm lúc ghi ở **mọi** đường ghi: `PUT /api/orders/:id`, `PUT /trip`, **và** đường ghi tiền chung `insertMoneyAdjustment` (route HDV + route văn phòng ADR-0063 — tự hạ theo câu 8, hoặc luật chủ chọn); `soKhachDiXe` kẹp lúc đọc; câu kiểm định kỳ "đơn có `ride_pax` > tổng" (báo) | số khách hiệu lực thành cột có kiểu — cùng điều kiện gỡ L-A1 |

## Cửa một chiều / hai chiều

- **Một chiều (nhẹ):** cột `orders.ride_pax` sau khi có dữ liệu.
- **Hai chiều:** công thức gợi ý (max), cách tính số người chặng (câu 7), luật tự hạ khi vượt (câu 8), nhãn.

## Hệ quả

- **Migration:** `0049_so_khach_di_xe.sql` (cột + tạo lại `orders_delivered_lock`). Bảng số: 0046 = ADR-0058, 0047 = ADR-0062, 0048 = ADR-0063, 0049 = ADR-0065; ADR-0054…0057 và ADR-0060, ADR-0061 (phiên Góp ý, mỗi ADR một migration) lấy số ≥ 0050. Lập kế hoạch vẫn quét mọi nhánh/worktree trước khi đặt tệp.
- **Thứ tự:** làm **cùng lát hoặc sau** ADR-0054 D10.3 (cùng hàm `soNguoiChang`; làm trước thì phải viết hàm hai lần). Làm **sau** khi Sổ tiền gộp `main` (tránh hai nhánh cùng sửa trigger khoá `orders`) và **sau** ADR-0063 D1 (luật tự hạ sửa `insertMoneyAdjustment` mà ADR-0063 đã thêm tham số hành động). Tin khi đổi sau xác nhận cần ADR-0062 đã thi công; nếu ADR-0062 chưa có thì đoạn nhật ký vẫn ghi, chỉ chưa có tin.
- **Form:** ô "Số khách đi xe" nằm cạnh khối chặng — nên **vẽ cùng ADR-0047 Phần B** (màn chặng chưa vẽ, có ô nơi trả) để khỏi vẽ hai lần.
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`; nhật ký thay đổi lời thường.
- **Việc lớn** (dữ liệu) ⇒ người kiểm độc lập chỉ-đọc sau thi công.

## Bài kiểm / hàng rào (sửa cố ý → đỏ → hoàn nguyên; dòng `docs/SO-HANG-RAO.md` kèm ngày)

1. **SQL:** `ride_pax = 0` → `RAISE`; sau "Đã giao" đổi `ride_pax` → `RAISE` (trigger khoá tạo lại); bài NT-R6 xanh.
2. **Hàm thuần `soKhachDiXe`:** bảng ca — `NULL` + (2, 2) → 2; `NULL` + (4, 2) → 4; `3` + (4, 2) → 3; `5` + (2, 2) → kẹp 4.
3. **"Một luật số khách của đơn":** bài quét — ngoài `soKhachDiXe`, không tệp `web/**`, `src/**` nào cộng dồn `pax` của nhiều dịch vụ để hiển thị (thêm tạm một chỗ cộng dồn → đỏ). Nối bài "một luật số người chặng" của ADR-0054.
4. **Máy chủ:** `ride_pax` > tổng → 400 câu tiếng Việt; Bán hàng đơn mình / Quản trị ghi → 200 (nháp và đã xác nhận); Bán hàng đơn người khác → 403; Kế toán gửi `ridePax` ở `PUT /trip` → 403; Đối tác / Thực tập lưu nháp gửi giá trị khác → 403, không gửi → giá trị cũ còn nguyên.
   - **4b. Không nuốt lệnh:** `PUT /trip` **chỉ** đổi `ridePax` trên đơn đã xác nhận → 200, `ride_pax` đổi, có dòng `trip_updated` "số khách đi xe A → B", **không** có dòng `ord_schedule_edit`, không đòi ghi chú, không đòi `datGap` (bỏ tạm đoạn "số khách đi xe" khỏi hàm dựng `moTa` → đỏ vì route trả sớm).
   - **4c. Tin:** lệnh 4b sinh tin cho HDV phụ trách + người lập (bài bảng ca của ADR-0062), không cho người sửa.
   - **4d. Giảm số khách dịch vụ khi `ride_pax` cố định vượt tổng mới** (theo câu 8 = A): route HDV và route văn phòng → 200, `ride_pax` hạ bằng tổng mới **cùng lô**, `detail` đúng thứ tự "số khách: …" · "số khách đi xe A → B" · "lý do: …" (lý do cuối cùng); tin tới HDV phụ trách / người lập (trừ người sửa) có cả hai phần đổi, không có lý do; `ride_pax = NULL` → không đổi; lô thua `seq` → `ride_pax` không đổi (cả lô quay lại).
5. **Tiền không đổi:** cùng đơn, đổi `ride_pax` → `total`, dòng tiền, biên nhận giữ nguyên (so số).
6. **Xe:** theo câu 7 — `lichChungChang` trả số người chặng đúng công thức; L-D1 chặn mở suất vượt; `kiemXuatBen` đòi đủ tên theo số mới.
7. `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --db local` (thoát 1 khi gieo lỗi L-R2); kịch bản Chrome form đơn + trang đơn.

## Phương án bị loại

- **Giữ cộng dồn, chỉ đổi nhãn:** không trả lời "bao nhiêu người thật" (chủ yêu cầu).
- **Chỉ dùng `soKhachDoan` (max) không có ô:** chủ muốn người bán sửa được khi khác (vd 4 vé nhưng 2 người tự đi).
- **Bảng riêng có lịch sử (`ord_ride_pax`):** nặng hơn cho một con số; lịch sử đủ ở nhật ký "cũ → mới".
- **Số khách đi xe mang tiền:** trái lời chủ; tiền theo dịch vụ.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0047 A1 (`:65`) | "Tới lúc đó số người của chặng = số khách hiệu lực của chính dịch vụ đó." | "Số người của chặng = `soNguoiChang` (ADR-0054 D10.3, sửa bởi ADR-0065 theo câu 7)." |
| ADR-0054 D10.3 | "`soNguoiChang(chang, soKhachDichVu)`: `pax_override` nếu có và ≤ số khách dịch vụ …" | "`soNguoiChang(chang, soKhachDichVu, soKhachDiXe)` — công thức theo ADR-0065 (câu 7); `pax_override` ≤ số người chặng chiều đi tương ứng." |
| ADR-0054 L-R1 | "`pax_override` ≤ số khách hiệu lực của dịch vụ" | "… ≤ số người chặng theo ADR-0065" (cùng điều kiện gỡ) |
| Ruling R9 (`hanh-khach.ts:161`, kế hoạch ADR-0047) | "Số khách của cả ĐOÀN = … dịch vụ ĐÔNG NHẤT" | "= `soKhachDiXe` (ô người bán nhập; trống thì dịch vụ đông nhất)" |
| ADR-0062 (lượt 1b) | — | **Không đổi câu nào:** ADR-0062 Đ1 đã dành sẵn đoạn "số khách đi xe A → B" trong tập đoạn nhận và bài khứ hồi. |
| ADR-0063 D1.11 (lượt 2a) | "luật nằm ở ADR-0065 D3 …" | **Không đổi**: ADR này điền luật đó (tự hạ trong `insertMoneyAdjustment`, câu 8). |

## Câu hỏi còn mở (chạm dữ liệu/luật — không tự chọn; đã gom vào `cau-hoi-chu.md`: Q1 + Q2 dưới = **câu 7**; luật tự hạ + Kế toán sửa số khách đi xe = **câu 8**)

- **Q1 — Xe tính số người **của từng chặng** thế nào?** (Chặng gắn từng dịch vụ; một đơn có thể có chặng ở nhiều dịch vụ.)
  - **A (khuyến nghị):** số người chặng = **nhỏ nhất** của (số khách đi xe; số khách của dịch vụ chặng đó gắn; `pax_override` nếu là chặng về). Ví dụ tour 4 + mô tô 2, đi xe 4: chặng tour 4, chặng mô tô 2. Xe không bao giờ giữ nhiều chỗ hơn số người đi xe, cũng không nhiều hơn số vé dịch vụ.
  - **B:** mọi chặng của đơn = số khách đi xe (đúng chữ "xe dùng số này"). Chặng của dịch vụ ít người hơn sẽ giữ thừa chỗ.
- **Q2 — Người bán không sửa ô thì máy lưu gì?**
  - **A (khuyến nghị):** lưu **trống** (= theo gợi ý); nếu người bán gõ đúng số gợi ý cũng lưu trống. Sau này văn phòng/HDV tăng số khách một dịch vụ thì số đi xe **tự tăng theo**. Chỉ khi người bán gõ số khác gợi ý mới lưu cố định.
  - **B:** luôn lưu con số lúc bấm lưu. Tăng khách sau đó mà quên sửa ô ⇒ xe **thiếu chỗ** (máy chỉ cảnh báo).
- **Q3 (câu 8) — Giảm số khách dịch vụ làm số khách đi xe (đã gõ cố định) vượt tổng; Kế toán có sửa ô số khách đi xe không?**
  - **A (khuyến nghị):** máy **tự hạ** số khách đi xe bằng tổng mới trong cùng lần lưu, ghi lịch sử; Kế toán **không** sửa ô này (vẫn chỉ Bán hàng đơn mình / đang phụ trách, Quản trị, Toàn quyền — khuôn ADR-0054 D10.3).
  - **B:** Kế toán sửa được cả hai (hộp "Sửa số khách dịch vụ" có thêm ô số khách đi xe) — mở thêm người ghi `ride_pax`.
  - **C:** từ chối lưu, bắt người có quyền sửa ô số khách đi xe trước — ngõ cụt cho HDV và Kế toán.

## Chưa giải quyết (ghi để chủ thấy, ngoài phạm vi)

- **Chặng trùng của cùng một đơn:** hai dịch vụ cùng có chặng đi cùng ngày giờ, cùng nơi (vd mẫu chặng ADR-0054 tự tạo cho cả tour lẫn mô tô) ⇒ xe vẫn giữ chỗ **hai lần**. ADR này chỉ thêm **cảnh báo** ở lịch chung / câu kiểm định kỳ "đơn có hai chặng mở cùng chiều, cùng ngày giờ, cùng nơi". Gộp chặng là việc của ADR-0047 Phần B (chủ vẽ).

## Chưa kiểm

- `web/order-card.ts:155` lấy "Số khách" từ trường nào của `OrderSummaryDto` (cộng dồn ở máy chủ hay trình duyệt) — chưa đọc.
- Biên nhận (`order-confirmation.ts`) hiện số khách từng dịch vụ — giữ nguyên; chưa xét có cần dòng "khách đi xe".
- Số đơn trên production có nhiều dịch vụ cùng có chặng: **không biết** (AI không truy vấn remote).
