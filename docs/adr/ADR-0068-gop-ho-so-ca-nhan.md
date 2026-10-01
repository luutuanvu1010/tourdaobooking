# ADR-0068 — Gộp hồ sơ cá nhân trùng: hồ sơ phụ trỏ về hồ sơ chính, chỉ chuyển phần còn sửa được, sổ sách giữ nguyên

- **Trạng thái:** **accepted** 2026-10-01 (chủ dự án duyệt bằng lời qua hộp hỏi gom — nguyên văn ở `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong-nhat-ky.md`). Bản nháp gốc giữ ở `docs/superpowers/specs/2026-09-30-gop-ho-so/`.
- **Ngày:** 2026-09-30 (soạn), 2026-10-01 (duyệt).
- **Số:** 0068 — 0066 (trợ lý AI) và 0067 (lọc đơn theo người lập) đã có văn bản ở nhánh khác. Migration số tạm `0056_gop_ho_so.sql` theo luật 1.46 (không giữ chỗ; số lớn nhất của `main` + 1; nhánh gộp sau tự đổi tên) — kế hoạch viết `0054` nhưng số đó đã dùng ở bản 1.47; thi công dùng `0055`, đổi thành `0056` khi gộp main 1.49 (2026-10-01) vì `0055_nhom_dich_vu` đã lên production.
- **Thuộc gói:** một lượt duyệt gồm ADR này + đặc tả `docs/superpowers/specs/2026-09-30-gop-ho-so/dac-ta.md` (trang ghép ở §9 của đặc tả). Hai quyết định chạm dữ liệu/quyền ≤ trần 3.
- **Nguồn (lời chủ, chuẩn — không hỏi lại):** phiên 2026-09-30, sau khi chủ phát hiện ở Danh bạ: "Nguyễn Phú Hải" hai dòng giống hệt (vai Khách hàng); "Nguyễn Tiền Phương" một hồ sơ có SĐT + vai Lái cano, một hồ sơ không SĐT + vai Điều hành chung (tài khoản). Chủ chọn **"1, làm chức năng gộp hồ sơ"**; hộp hỏi gom: **gộp tay + danh sách gợi ý**; **không có nút hoàn tác**; **Quản trị + Toàn quyền**; **làm luôn phần chặn tạo trùng khi thêm tài khoản**. Chủ đồng ý thiết kế trình trong trò chuyện (gồm: bản đầu **chỉ hồ sơ cá nhân**, **chưa có** nút "Không phải trùng"). Lượt duyệt 2026-10-01: **"Duyệt, làm từng phần"**; điểm dừng kế hoạch: Q2 và Q5 **"Từ chối gộp"**, Q1/Q3/Q4 **"Đồng ý cả ba"**.
- **Mốc mã:** `main` = `5f6fcbc2` (bản 1.44).
- **ADR liên quan:** ADR-0001 điều 8 (gộp hồ sơ là thao tác Quản trị, `pty_party.merged_into_id`, không xoá cứng — **ADR này thi hành điều đó, thu hẹp phạm vi về hồ sơ cá nhân**); ADR-0003 điều 8 (không xoá cứng); ADR-0005 / ADR-0001 điều 5 (SĐT đăng nhập không phải liên hệ — bất biến R-N1-13); ADR-0007 bảng quyền (dòng "gộp hồ sơ" = Quản trị); ADR-0013 (hồ sơ gắn tài khoản; điều 5: đường mới gắn tài khoản vào hồ sơ có sẵn phải kiểm lại luật); ADR-0014 điều 8 và ADR-0019 điều 2 (cấp bậc tài khoản); ADR-0018 (vai tài khoản, LC-3); ADR-0024 6.4 (gộp phải từ chối hồ sơ công ty chủ); ADR-0040 (giấy tờ của người, không lộ số); ADR-0044 (đơn đã giao khoá người đặt); ADR-0048 (nhà xe đối tác, có thể là cá nhân).
- **Hiến chương Phần I (đã duyệt) áp:** 2.1 (mỗi người ngoài đời là **một** hồ sơ — hồ sơ trùng là vi phạm cần sửa), Điều 4 (sổ và nhật ký là sự thật chỉ-thêm; hình chiếu không tạo sự thật), luật không xoá cứng.
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (đọc 2026-09-30 @`5f6fcbc2`).
- **Loại cửa:** **một chiều** (cột mới + dữ liệu thật đổi chủ; không có thao tác tách lại — chủ chọn).

---

## Tóm tắt cho chủ (lời thường)

1. Quản trị (hoặc Toàn quyền) chọn **hồ sơ phụ** (bỏ đi) và **hồ sơ chính** (giữ lại), xem bảng "sẽ chuyển / sẽ giữ", gõ xác nhận rồi gộp.
2. **Chuyển sang hồ sơ chính:** số điện thoại, email, công việc đang làm, quan hệ, giấy tờ còn hiệu lực, và người đặt của các đơn **chưa giao, chưa huỷ**. Thứ hồ sơ chính đã có thì không nhân đôi.
3. **Giữ nguyên ở hồ sơ phụ:** đơn đã giao hoặc đã huỷ, chuyến xe, phiếu thu, công nợ, nhật ký — sổ sách không được sửa. Hồ sơ phụ ẩn khỏi Danh bạ và ô chọn khách; mở bằng đường dẫn cũ thì thấy "Đã gộp vào <hồ sơ chính>". Hồ sơ chính có mục "Hồ sơ đã gộp vào đây".
4. **Không gộp được:** người với tổ chức; hồ sơ công ty Tour Đảo; hai hồ sơ **đều** có tài khoản; hồ sơ phụ có tài khoản (phải chọn hồ sơ có tài khoản làm hồ sơ chính); kết quả làm một người vừa là nhân viên vừa là đối tác bên ngoài; hồ sơ phụ đang đứng tên xe; hồ sơ phụ có công việc / quan hệ bắt đầu từ ngày trong tương lai. Hồ sơ chính gắn tài khoản Quản trị khác → chỉ Toàn quyền gộp.
5. **Không có nút tách lại.** Gộp nhầm thì Toàn quyền sửa tay (thêm lại liên hệ / công việc ở hồ sơ cần thiết).

---

## Bối cảnh

- Danh bạ mỗi dòng là **một hồ sơ** (`pty_party`). Hồ sơ trùng sinh ra từ: (a) người lập đơn chọn "tạo mới" thay vì "dùng hồ sơ có sẵn"; (b) Thêm tài khoản mà không bấm "Dùng hồ sơ có sẵn" — máy chủ tạo hồ sơ mới **không có liên hệ** (cố ý, R-N1-13), nên tra theo SĐT về sau không thấy trùng; giao diện chỉ gợi ý **một** hồ sơ khớp SĐT và không tra theo tên.
- Chưa có mã gộp nào (không cột, không route, không test — đã tra `migrations/`, `src/`, `web/`).
- Rất nhiều chỗ trỏ tới hồ sơ nằm trên dòng **chỉ-thêm / đông cứng** mà CSDL chặn sửa: `vc_trip_driver` (`vc_trip_driver_close_once`), `vc_trip_allocation` (`…_identity`), `vc_trip_departure_check` / `vc_trip_manifest` (`…_no_update`), `bil_payment_receipt` / `bil_debt_line` (`…_no_update`), `audit_log` (0017), `orders.booker_party_id` khi đơn đã giao (`orders_delivered_lock`, 0044), `pty_person_document.party_id` (`pty_person_document_identity`). Vì vậy **"sửa mọi tham chiếu sang hồ sơ chính" là không làm được** mà không phá các hàng rào đã duyệt.

## Quyết định

**Đ1 — Mô hình: con trỏ + chuyển phần sống.** Thêm cột `pty_party.merged_into_id` (khoá ngoại `pty_party.id`, NULL = chưa gộp) và `merged_at` (ISO UTC). Gộp A (phụ) vào B (chính) trong **một** `db.batch()`:
  1. **Liên hệ** mở của A: đóng (`valid_to_date` = hôm nay VN); mở dòng tương ứng trên B nếu B chưa có liên hệ mở cùng loại + cùng `value_normalized`. Liên hệ chính: giữ liên hệ chính của B; nếu B chưa có liên hệ chính loại đó thì dòng chuyển sang mang cờ chính như ở A.
  2. **Công việc** (vai nhóm `OTHER`) mở của A: đóng; mở trên B từ hôm nay nếu B **không có dòng nào (mở hay đã đóng) cùng loại + cùng nơi chồng lấn hôm nay** — trigger `pty_party_role_no_overlap_ins` so cả hai đầu ngày. B có dòng mở → "bỏ vì đã có"; B có dòng đã đóng chạm hôm nay → không mở, xem trước ghi "hồ sơ chính vừa kết thúc công việc này hôm nay".
  3. **Quan hệ** mở có A ở một đầu: đóng; mở lại với B thay A, **trừ** khi thành B↔B, B đã có quan hệ mở y hệt, hoặc chồng lấn ngày như bước 2 (`pty_relationship_no_overlap_ins`) — khi đó chỉ đóng.
  4. **Giấy tờ**, theo từng loại mà B **chưa** có giấy tờ hiện hành: huỷ **mọi** dòng chưa huỷ của loại đó ở A — **cả chuỗi gia hạn**, huỷ từ dòng mới nhất về dòng cũ nhất (trigger `pty_person_document_superseded` cấm sửa dòng còn dòng gia hạn chưa huỷ; `…_cccd_one_person_ins` tính mọi dòng chưa huỷ cùng số, kể cả dòng tiền nhiệm) — với lý do cố định "đã gộp vào hồ sơ khác", **rồi** chèn trên B một dòng mới mang nội dung của dòng hiện hành. Loại mà B đã có: giữ nguyên ở A (Đ4). Số giấy tờ không bao giờ vào nhật ký, câu báo lỗi, bảng xem trước.
  5. **Đơn** có `booker_party_id` = A, `status IN ('draft','confirmed')` và `delivered_at IS NULL`: đổi sang B **và** đặt `updated_at` = mốc lô (để khoá lạc quan của người đang sửa đơn bắt được — không thì lần lưu cũ ghi đè). Đơn đã giao (`delivered_at` ≠ NULL, khoá bởi `orders_delivered_lock`) và đơn `cancelled` (chính sách, CSDL không chặn) giữ A. Đơn cũ lệch tiền làm `orders_money_update` chặn → cả lô từ chối, câu lỗi nêu mã đơn.
  6. A: `active = 0`, `merged_into_id = B`, `merged_at = now`.
  7. Nhật ký `party_merged` (hành động mới, khai ở `src/shared/audit-actions.ts`) trên **cả A và B** (hai dòng), `detail` chỉ gồm tên hai hồ sơ + số dòng đã chuyển theo loại — **không** SĐT, email, số giấy tờ.
- Mọi tham chiếu khác giữ A — gồm công nợ (`bil_debt_line`), phiếu thu, chuyến, nhật ký. Xem trước **hiện số dòng công nợ còn mở của A** để người gộp biết sổ "theo người" của B sẽ không thấy chúng (nợ ghi ở Hệ quả). Xe (`vc_vehicle.owner_party_id`) thuộc công ty chủ hoặc **nhà xe đối tác — có thể là cá nhân** (`vc_vehicle_owner_ins` nhận mọi hồ sơ trong `v_pty_carrier`; `0038` có nhánh nhà xe cá nhân) → A đang là chủ xe thì từ chối (Đ2; chủ chốt 2026-10-01, Q2 "Từ chối gộp"). Người đọc muốn "gom về một người" đi theo `merged_into_id` (một bước, không chuỗi — Đ3).

**Đ2 — Điều kiện (máy chủ kiểm, trả 409 kèm câu tiếng Việt; giao diện chỉ tắt nút):**
  - A ≠ B; cả hai là `PERSON`; cả hai `active = 1` và chưa gộp; A chưa là đích của lần gộp nào (không chuỗi).
  - Không bên nào là hồ sơ công ty chủ (`OWNER_COMPANY`) — ADR-0024 6.4 (hồ sơ cá nhân nên không thể, vẫn kiểm để hàng rào không phụ thuộc phạm vi).
  - A **không** gắn tài khoản (`staff.party_id`); cả hai gắn tài khoản → từ chối. Có tài khoản thì bên đó bắt buộc là B.
  - A không còn vai **tài khoản** mở (nhóm `INTERNAL`/`EXTERNAL`) — gộp không được là đường vòng đổi quyền của một tài khoản (ADR-0013 điều 5, ADR-0018). **Giới hạn biết trước:** hồ sơ chưa có tài khoản mà đang giữ vai nhóm này (vd "Tài xế công ty" `DRIVER_INTERNAL`) không làm hồ sơ phụ được cho tới khi vai đó được kết thúc. Công việc nhóm `OTHER` (vd "Lái cano" `BOAT_CAPTAIN`) không bị giới hạn này.
  - Kết quả không vi phạm LC-3 (B vừa có vai nội bộ vừa vai bên ngoài) — trigger `pty_party_role_group_conflict_*` là lưới cuối.
  - A không có việc đang mở ở điều phối / vận chuyển (người phụ trách đơn đang mở; tài xế / tổ lái của chuyến chưa chốt). Có thì từ chối, nêu loại việc. `parties` không được đọc `dsp_*` / `vc_*` (`ALLOWED_EDGES`) và hiện chỉ có view `v_dsp_order_handler`, `v_dsp_first_handler` (không có `v_vc_*`) → kiểm này do **gốc lắp ráp tiêm** vào (như `ctx.isAssigned`), module chủ cung cấp hàm đọc; nếu module chủ công bố được **câu bảo vệ** (khuôn `cauBaoVeNguoiPhuTrach`) thì đưa vào lô, không thì khe thời gian giữa kiểm và ghi được chấp nhận và ghi rõ trong kế hoạch.
  - A **không** đang đứng tên xe (`vc_vehicle.owner_party_id`) — 409 `merge_source_owns_vehicle` (chủ chốt 2026-10-01, Q2).
  - A **không** có công việc hay quan hệ bắt đầu sau hôm nay (không đóng được bằng ngày hôm nay) — 409 `merge_source_future_row` (chủ chốt 2026-10-01, Q5).
  - Người gộp giữ `admin.manage`; nếu B gắn tài khoản thì người gộp phải **quản được** tài khoản đó (luật cấp bậc hiện có — tài khoản Quản trị khác / Toàn quyền → chỉ Toàn quyền).
  - Chống bấm đúp / hai người gộp cùng lúc: mọi câu của lô mang điều kiện trạng thái (A và B còn `active = 1 AND merged_into_id IS NULL`), lô thua thì không đổi gì.

**Đ3 — Bất biến CSDL (trigger, migration mới):** `merged_into_id` chỉ đặt **một lần**, không xoá / đổi; không trỏ chính mình; đích phải `active = 1` và chưa gộp (không chuỗi); đặt `merged_into_id` đòi `active = 0` cùng lúc; hồ sơ đã gộp **không mở lại** (`active` không về 1). Kiểm bất biến chỉ-đọc mới `R-PTY-MERGE-*` trong `audit-invariants`: không chuỗi, hồ sơ đã gộp không còn liên hệ / vai / quan hệ mở, không tài khoản.

**Đ4 — Giấy tờ khi B đã có giấy tờ hiện hành cùng loại:** không chép, **không huỷ** ở A (A đã ẩn; dữ liệu không mất). Bảng xem trước ghi "giữ ở hồ sơ phụ" cho loại đó.

**Đ5 — Quyền:** dùng ô có sẵn `admin.manage` (bảng ADR-0007 đã ghi "gộp hồ sơ" ở ô này — **không** thêm ô MATRIX mới, không đổi bản đồ quyền) + luật cấp bậc hiện có. Route mới hỏi `can(…, "admin.manage")` và được bài `route-write-guard` phủ.

**Đ6 — Chỗ đặt mã:** phần ghi `pty_*` do module `parties` sinh câu lệnh chưa chạy; phần đổi người đặt đơn do `orders` sinh câu chưa chạy (có điều kiện chưa giao, chưa huỷ); kiểm "có tài khoản / quản được" qua `staff`. Nơi ghép lô là **gốc lắp ráp** (hàm tiêm `ctx.gopHoSo`, như cách gốc tiêm `ctx.isAssigned`) — **không** thêm cạnh phụ thuộc trong `ALLOWED_EDGES`; nếu về sau buộc phải thêm cạnh thì đó là **nới hàng rào** (Điều 9.4), phải trình chủ duyệt riêng. Hàm đọc mới công bố cho gốc lắp ráp: `viecXeCuaNguoi` (`van-chuyen`), `soDongNoCuaNguoi` (`billing`) — chủ đồng ý 2026-10-01 (Q3).

**Đ7 — Đọc sau khi gộp:** `LOOKUP` hiện **không** lọc `active` (`parties/repository.ts`) và `GET /api/parties?includeInactive=1` trả cả hồ sơ ngưng → thêm lọc `merged_into_id IS NULL` cho lookup, danh sách (kể cả khi `includeInactive`) và ô chọn khách trên đơn. Liên hệ đã chuyển nên tra SĐT ra B. Chi tiết hồ sơ phụ trả thêm "đã gộp vào" (id + tên B); chi tiết B trả danh sách hồ sơ đã gộp vào nó. **Nhãn tên trên đơn cũ, biên nhận, sổ tiền không đổi** (vẫn tên A — thường trùng tên B); không thêm chữ "(đã gộp…)" vào view nhãn dùng chung để biên nhận không in chữ lạ.

**Đ8 — Danh sách "Hồ sơ nghi trùng"** (chỉ đọc, `admin.manage`): cặp hồ sơ cá nhân đang mở có (a) cùng SĐT liên hệ mở (chuẩn hoá), (b) cùng tên sau chuẩn hoá ở máy chủ bằng JS (Unicode NFC, `toLocaleLowerCase('vi')`, bỏ khoảng trắng thừa; **giữ dấu** — `lower()` của SQLite không thường hoá chữ có dấu), (c) SĐT đăng nhập của tài khoản gắn hồ sơ này trùng SĐT liên hệ mở của hồ sơ khác (`staff.phone` do `staff` sở hữu → đọc qua hàm công bố của `staff`, tiêm ở gốc lắp ráp như Đ2). Mỗi cặp ghi lý do khớp và nút "Gộp…". Chưa có "Không phải trùng" (chủ đồng ý). SĐT chỉ hiện cho người giữ `admin.manage` (vốn xem được liên hệ).

**Đ9 — Chặn tạo trùng khi Thêm tài khoản:** khi có hồ sơ cá nhân đang mở khớp SĐT (liên hệ) **hoặc** khớp tên chuẩn hoá, giao diện liệt kê **mọi** hồ sơ khớp (route đọc `GET /api/staff/ho-so-khop`, chủ đồng ý 2026-10-01 Q4); người tạo phải chọn "dùng hồ sơ này" hoặc tick "vẫn tạo hồ sơ mới". **Máy chủ cũng kiểm, ở route `POST /api/staff` (module `accounts`) — không đặt trong `createAccountWithRolesStatements` của `staff`, vì hàm đó dùng chung với đồng bộ từ Sheet:** `POST /api/staff` không kèm `partyId` mà có hồ sơ khớp và không có cờ `taoHoSoMoi: true` → 409 kèm danh sách (id + tên, không SĐT của hồ sơ khác). Đồng bộ nhân viên từ Sheet giữ nguyên hành vi (ngoài phạm vi; ghi backlog).

## Hệ quả

- **Được:** Danh bạ đúng "một người một hồ sơ" (Hiến chương 2.1); tra SĐT ra đúng người; lỗi gốc (tạo tài khoản sinh hồ sơ trùng) bị chặn ở cả giao diện lẫn máy chủ.
- **Mất / nợ:** lịch sử (đơn đã giao, chuyến, tiền) của một người có thể nằm ở hai hồ sơ — báo cáo "theo khách" và sổ công nợ "theo người" sau này phải gom theo `merged_into_id` (ghi nợ cho module báo cáo / billing lượt sau). Không tách lại được. Tổ chức (đại lý, nhà xe) chưa gộp được; nhà xe cá nhân đứng tên xe chưa gộp được.
- **Lệch có tên:** không.

## Câu thay

- ADR-0001 điều 8: "Gộp hồ sơ … thiết kế ở N2 (`pty_party.merged_into_id`…)" — **bổ sung**: phạm vi thi hành lần đầu chỉ hồ sơ cá nhân; mô hình con trỏ + chuyển phần sống (Đ1), không viết lại `booker_party_id` của đơn đã giao.

## Phương án đã cân nhắc

1. **Sửa mọi tham chiếu sang B rồi ẩn A** — bị CSDL chặn ở ≥ 10 trigger chỉ-thêm / đông cứng; nới chúng là phá hàng rào tiền và vận chuyển. **Loại.**
2. **Chỉ đánh dấu A → B, không chuyển gì** — tra SĐT vẫn ra A (đã ẩn) → người lập đơn lại tạo hồ sơ thứ ba. **Loại.**
3. **Con trỏ + chuyển phần sống (chọn).**
