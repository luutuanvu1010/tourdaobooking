# Đề xuất ADR-0056 (số tạm — điều phối cấp số thật) — Vận chuyển, thừa kế Transportation Kernel, lượt 3: cam kết xe riêng / số chỗ tối thiểu trên chặng; mỗi xe mỗi loại giấy tờ một dòng hiện hành

- **Trạng thái:** **ĐỀ XUẤT — chờ người kiểm độc lập (chỉ đọc) rồi chủ duyệt.**
  - AI soạn ở vai người thiết kế (P15); không tự duyệt (N3, Điều 7.2). Không đặt ở `docs/adr/`.
  - Thuộc **lượt duyệt B** (cùng ADR-0055 tạm, ADR-0057 tạm); trang ghép: `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-b-kernel-tien.md` (mục 0 đề nghị tách: B1 tiền, B2 Kernel lượt 2, **B3 = tệp này**).
- **Ngày:** 2026-09-30.
- **Nguồn:**
  - bản đề xuất gốc `docs/superpowers/specs/2026-09-29-de-xuat-adr-van-chuyen-kernel-luot-3.md` (**[NG]**);
  - lời chủ, [HĐ] `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` "Trả lời lần 16" (30/9), nguyên văn nhãn:
    - **Q-L3-1 — a "Chặn, Quản trị cho phép"**: "'Xe riêng' bị xếp ghép / xe nhỏ hơn: chặn, Quản trị cho phép kèm lý do";
    - **Q-L3-2 — a "Số chỗ tối thiểu"**: "'Hạng xe hứa với khách' = số chỗ tối thiểu";
    - **Q-L3-3 — a "Không cho, dùng Gia hạn"**: "Xe đã có giấy tờ loại đó: bấm 'Thêm' bị từ chối, bảo dùng Gia hạn";
  - [HĐ] lần 9 ý 2 ("xe riêng / hạng xe hứa với khách"); tệp gom câu `docs/superpowers/specs/2026-09-30-van-chuyen-cau-hoi-cho-chu.md` mục 6 ("Việc kèm: hỏi người chuyên môn pháp lý…");
  - ADR-0040, ADR-0047, ADR-0049, ADR-0050; Hiến chương Phần I.
  - Mã đo trên `thi-cong-adr-0049-tiep` @ `1f8b498` (`@49`) và `main` (`@main`).
- **Loại:**
  - **một chiều:** hai cột cam kết trên `ord_transfer_leg` (tên, kiểu); mỗi cam kết đã ghi trên đơn đã xác nhận (lời hứa với khách, có nhật ký).
  - **hai chiều:** chặn + phá lệ (mã); cột phá lệ trên chuyến (để trống được); trigger "một dòng hiện hành" (bỏ bằng migration mới); nhãn hiển thị.
- **Hiến chương áp:** 2.2, 5.1, 5.2 (cột có kiểu, không JSON "mức dịch vụ"), 5.3, 5.5, 5.6, 5.7, 5.12, 5.13.
- **Xây trên lỗ đang hở:** `docs/quyen-hoan.json` `phat_hien` = `[]` (kiểm 30/9).
- **Xây trên nền chưa gộp / chưa phát hành (5.13):**
  - VK3-A dựa vào `kiemXep`, `kiemTaoSuaChuyen`, `kiemXuatBen` (`src/shared/dieu-phoi-kiem.ts:176`, `:90`, `:252 @49`), `hanhKhachChoChuyen`, `lichChungChang` (`src/modules/orders/index.ts:193`, `:268 @49`) và bảng `vc_trip` (`0042 @49`) — **chưa gộp `main`**; bốn mục luật ADR-0049 chủ "Xem từng mục lúc gộp" (lần 16, 1.1);
  - VK3-B chỉ cần `vc_vehicle_document` (`0033`, đã lên production). Bước đếm K-01 **đã có trên `main`** dưới tên `R-VC-11` (commit `38ecea4`, `scripts/audit-checks.mjs:189-195`, mức `warn`); lộ trình `docs/superpowers/specs/2026-09-29-van-chuyen-lo-trinh.md:17` ghi kết quả production "0/0" (tức chưa có cặp giấy tờ song song) — người soạn **chưa tự kiểm** con số này.
- **Câu pháp lý còn treo — CHƯA CÓ NGƯỜI CHUYÊN MÔN KIỂM:** xe hợp đồng (NĐ 158/2024, sửa bởi NĐ 218/2026 theo tra cứu 27/9) có được **ghép khách của nhiều đơn / nhiều hợp đồng** vào một xe không. Đề xuất này không trả lời câu đó; cột "xe riêng" dùng được với mọi câu trả lời. **Việc kèm (của chủ, ngoài app):** hỏi người chuyên môn (luật sư hoặc Sở GTVT Khánh Hoà) **trước khi chạy chuyến ghép nhiều đơn thật**.
- **Migration:** chỉ thêm, sau các số đã giữ chỗ (`0044`, `0045` cho sổ tiền lượt 1; `0019`, `0029`). Không sửa `0033`, `0034`, `0042`.

---

## Tóm tắt (lời thường)

1. Chặng đưa đón có thêm hai ô: **"Xe riêng"** (không ghép khách đơn khác) và **"Xe tối thiểu … chỗ"** (bạn chọn: hạng xe = số chỗ tối thiểu).
2. Máy **chặn** xếp sai (ghép khách vào xe riêng, xếp vào xe ít chỗ hơn) và **giữ** chuyến sai ở cổng xuất bến; **Quản trị / Toàn quyền cho phép** được, kèm lý do (bạn chọn).
3. Giá không đổi: hai ô này không mang tiền.
4. **Giấy tờ xe:** xe đã có "Kiểm định" đang dùng mà bấm "Thêm Kiểm định" → máy từ chối, bảo "dùng Gia hạn" (bạn chọn). Bản trùng cũ đã có thì Quản trị huỷ tay.
5. **Việc của bạn ngoài app:** hỏi người chuyên môn về ghép khách nhiều đơn trên xe hợp đồng trước khi chạy chuyến ghép thật.
6. **Bạn cần:** sau khi người kiểm báo đạt, bấm duyệt (không còn câu hỏi mở).

---

## Quyết định

### VK3-A. Cam kết xe riêng / số chỗ tối thiểu trên chặng (Q-L3-1 = a, Q-L3-2 = a)

**A1. Dữ liệu** — migration mới, chỉ `ADD COLUMN` vào `ord_transfer_leg` (module `orders`):

| Cột | Kiểu, ràng buộc | Nghĩa |
|---|---|---|
| `exclusive_vehicle` | INTEGER NOT NULL DEFAULT 0, `CHECK IN (0,1)` | xe riêng: chuyến chở chặng này không chở khách của **đơn khác** |
| `min_vehicle_seats` | INTEGER NULL, `CHECK (… IS NULL OR … BETWEEN 1 AND 100)` | số chỗ tối thiểu — **cùng nghĩa** `vc_vehicle.passenger_capacity`: số người được chở **không kể tài xế** (`0033:26`; giấy 16 chỗ thì nhập 15) |

- `DEFAULT 0` ở đây hợp lệ: cờ mặc định "không cam kết" đúng nghĩa cho mọi chặng cũ.
- **Ai ghi** (đúng ô của route chặng hiện có, `src/modules/orders/index.ts @49`): nháp — `PUT /api/orders/:id` hỏi `order.modify` (`:553`) = `SALES` ownOrAssigned, `ADMIN`, **`PARTNER` own**, `SUPER_ADMIN`, **`INTERN` own**; sau xác nhận — `POST /legs` (`:638`), `PUT /legs/:legId` (`:663`) hỏi `order.trip.edit` = `SALES` ownOrAssigned, `ADMIN`, `SUPER_ADMIN`. ⇒ Đối tác ghi được "xe riêng" trên nháp của mình (lời hứa với khách của họ) — như mọi trường vận hành của chặng.
- **Mốc 6 giờ:** không kiểm khi sửa hai cột (ĐP2(iv) chỉ nói ngày, giờ, nơi). Bật cam kết sau khi đã xếp → chuyến bị **giữ** ở cổng xuất bến; xếp lại trong 6 giờ vẫn cần Quản trị phá lệ mốc (luật có sẵn).
- **Nhật ký:** `order_leg_updated` trước→sau ("xe riêng: không → có", "xe tối thiểu: — → 15 chỗ").

**A2. Luật** — một hàm thuần `kiemCamKet` ở `src/shared/`, gọi từ `kiemXep`, `kiemTaoSuaChuyen` (khi đổi xe) và `kiemXuatBen` — một nguồn:
- **R-XR (xe riêng):** nếu trên chuyến có suất khách đang mở của một chặng `exclusive_vehicle = 1` thuộc đơn A, thì **mọi** suất khách đang mở khác phải thuộc đơn A. Suất người đi kèm (HDV, phụ xe — loại `CREW`) không tính.
- **R-CX (số chỗ):** `passenger_capacity` của xe ≥ `min_vehicle_seats` lớn nhất trong các chặng có suất khách đang mở trên chuyến.
- **Kích hoạt:** xếp / dời đến (xét chuyến sau lệnh); đổi xe (R-CX); xuất bến (cả hai — bắt cam kết bật **sau** khi đã xếp).

**A3. Khi vi phạm — chặn, Quản trị cho phép (Q-L3-1 = a):**
- lệnh xếp / đổi xe trả 409 "cần Quản trị phá lệ cam kết";
- Quản trị / Toàn quyền gửi phá lệ, lý do nhóm `PHA_LE` (ô `trip.override` có sẵn — `permissions.ts:138 @49`: chỉ `ADMIN`, `SUPER_ADMIN`);
- mã luật mới `CAM_KET` thêm vào `MA_LUAT_PHA_LE` (`src/shared/dieu-phoi-kieu.ts:74 @49`) **và** vào `MA_GIU` — bài ghim `dieu-phoi-kieu.test.ts:74-80 @49` đòi "đúng hai luật" và "mỗi mã cũng là một mã giữ": bài này **đổi giá trị ghim theo ADR** (thêm một mã), không nới;
- phá lệ ghi vào cột mới `vc_trip.commitment_override_reason_code` (FK `vc_reason`, khuôn `rest_override_reason_code`, `0042:28 @49`), migration mới `ADD COLUMN`. Cổng xuất bến thấy cột này thì không giữ vì cam kết. Chuyến đã kết thúc/huỷ không sửa được cột (trigger `vc_trip_final_frozen`, `0042:412`) — đúng ý;
- **Vi phạm mới sau phá lệ — cách nhận biết (đề xuất, chặt):** phá lệ **không miễn trước** cho lệnh sau. **Mỗi** lệnh xếp / dời đến / đổi xe mà `kiemCamKet` (xét chuyến **sau** lệnh) còn báo vi phạm đều phải mang phá lệ **trong chính lệnh đó** (sự kiện `PHA_LE` mã `CAM_KET` cùng dấu lô; cột `commitment_override_reason_code` ghi lý do lần gần nhất). Cổng xuất bến nhận khi lệnh **cuối cùng** làm đổi tập suất hoặc xe của chuyến có phá lệ đi kèm. Không cần cột lưu "danh sách đơn lúc phá lệ". Mất: vi phạm kéo dài thì mỗi lần xếp thêm lại cần Quản trị. Kế hoạch chỉ được nới cách này khi chủ đồng ý; **người kiểm soi**.
- **Lớp giữ:** luật phá lệ được là **luật cấu hình**, không phải bất biến → **máy chủ** + **câu kiểm định kỳ** `warn` "chuyến đang chạy / đã chạy vi phạm cam kết mà không có phá lệ". **Không** trigger (trigger không biết đã có người phá lệ — cùng lý do khoảng nghỉ ở ADR-0049 D2). **Không** lệch 5.1. View `v_ord_leg_key` **không đổi**.

**A4. Hàm hẹp của `orders`** thêm hai khoá `xeRieng`, `choToiThieu`: `lichChungChang` và `hanhKhachChoChuyen`. Không tiền, không tên. Nơi gọi vẫn đứng sau `can()` (bài `src/orders-cong-bo.test.ts` có sẵn).

**A5. Hiện:** form đơn — hai ô mỗi chặng; lịch chung — nhãn "XE RIÊNG", "≥ 15 chỗ"; hộp xếp — lý do chặn bằng lời. DTO tài xế: không cần.

**A6. Liên hệ với tiền xe thuê (ADR-0057 tạm):** "số chỗ" ở đây và chiều "cỡ xe" để tra giá thuê phải cùng **một** nghĩa (không kể tài xế) — xem ADR-0057 câu Q-T1.

### VK3-B. Mỗi xe, mỗi loại giấy tờ: tối đa một dòng hiện hành (Q-L3-3 = a)

- **Luật:** một xe + một loại giấy tờ → tối đa **một** dòng hiện hành — chưa huỷ, không có dòng gia hạn chưa huỷ; cùng định nghĩa `HIEN_HANH` (`src/modules/van-chuyen/repository.ts:90 @49`). Thay bằng **Gia hạn** (dòng mới nối dòng cũ) hoặc **Sửa sai / Huỷ dòng**.
- **[Máy chủ]** `POST /api/van-chuyen/xe/:id/giay-to` (`src/modules/van-chuyen/index.ts:373 @49`) với loại đã có dòng hiện hành → **409** `document_type_exists` "Xe đã có <loại> đang dùng — bấm Gia hạn hoặc Sửa sai". Route và CSDL trả **mã khác nhau** (khuôn R15 của ADR-0040).
- **[CSDL]** trigger `BEFORE INSERT ON vc_vehicle_document WHEN NEW.previous_id IS NULL AND EXISTS (<dòng hiện hành cùng xe, cùng loại>)` → `RAISE`. Bảng của chính module.
- **Giao diện:** form "Thêm giấy tờ" ẩn loại đã có dòng hiện hành, gợi ý "Gia hạn" (`web/giay-to-ui.ts:63-72 @main` — chỗ lọc loại cho nút "Thêm").
- **Dữ liệu cũ:** trigger chỉ canh dòng mới; migration **không** tự sửa dữ liệu. Dòng song song đã có: Quản trị huỷ bằng "Sửa sai → Huỷ dòng" (có sẵn) — theo ADR-0050 VK1-C, **trước khi** bật điều kiện giấy tờ lúc xuất bến. Con số lấy từ `R-VC-11` trên production (lộ trình ghi 0 — kiểm lại ngay trước phát hành).
- **Không áp** cho giấy tờ của người (nhiều bằng lái khác hạng là hợp lệ).
- **Quyền:** không đổi — `vehicle.manage` (Quản trị, Toàn quyền).

---

## Câu ADR bị thay (nguyên văn → mới)

| ADR / tài liệu | Nguyên văn | Mới |
|---|---|---|
| ADR-0047 A1, bảng cột `ord_transfer_leg` | (không có cam kết) | thêm `exclusive_vehicle` (0/1, mặc định 0), `min_vehicle_seats` (NULL hoặc 1–100, không kể tài xế) |
| ADR-0047 A3, `hanhKhachChoChuyen` | "… nơi đón, nơi trả (chữ tự do che dãy số), số người, và từng người …" | "… số người, **cờ xe riêng, số chỗ tối thiểu**, và từng người …" |
| ADR-0049 D1, `lichChungChang` (`:72`) | "Chỉ gồm: …, số người, số người đã có tên, cờ đặt gấp." | "…, cờ đặt gấp, **cờ xe riêng, số chỗ tối thiểu** (ADR-0056 VK3-A)" — nếu ADR-0055 cũng được duyệt thì thêm cả số hiệu chuyến bay |
| ADR-0049 D2, cổng xuất bến (`:173-179`) | danh sách kiểm | thêm: "cam kết xe riêng / số chỗ của mọi chặng trên chuyến được giữ, **hoặc** chuyến đã có phá lệ cam kết" |
| ADR-0049 D3, ô `trip.override` (`:200`) | "phá lệ mốc lúc xếp, khoảng nghỉ" | "phá lệ mốc lúc xếp, khoảng nghỉ, **cam kết xe riêng / số chỗ** (ADR-0056)" — không đổi ai giữ ô |
| ADR-0049 D1, bảng `vc_trip` (`:82`) | "…, `rest_minutes_snapshot`, `rest_override_reason_code`, …" | thêm `commitment_override_reason_code` |
| Thiết kế [TK] `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:166` (không phải ADR) | "… máy không cấm" (ghép khách đơn khác) | "… máy không cấm, **trừ khi một chặng trên chuyến mang cam kết xe riêng**" |
| ADR-0040 D1, giấy tờ xe (`docs/adr/ADR-0040-*.md:35`) | "**gia hạn = thêm dòng mới, không sửa đè**. Sửa sai phải có lý do …" | "… ; **mỗi xe, mỗi loại tối đa một dòng hiện hành** — thay bằng Gia hạn, không thêm chuỗi song song (ADR-0056 VK3-B)." |
| ADR-0047 A3, view `v_ord_leg_key` | `(id, order_id, order_service_id, is_open)` | **không đổi** (Q-L3-1 = a không cần trigger) |

## Lệch có chủ ý khỏi Hiến chương

**Không có.** R-XR, R-CX là luật cấu hình phá lệ được (máy chủ + kiểm định kỳ, như khoảng nghỉ); VK3-B có hai lớp.

## Cửa một chiều / hai chiều

- **Một chiều:** hai cột cam kết; mỗi lời hứa đã ghi trên đơn đã xác nhận.
- **Hai chiều:** chặn/phá lệ (mã); cột phá lệ; trigger một dòng hiện hành; nhãn.

## Hệ quả

- **Việc lớn** (dữ liệu đơn + luật xếp xe + chặn ghi giấy tờ) ⇒ người kiểm độc lập chỉ-đọc.
- **Hàng rào mới** (mỗi cái một dòng `docs/SO-HANG-RAO.md` + ngày thấy chặn thật, P16):
  1. bài `kiemCamKet` — ghép vào xe riêng; xe ít chỗ; bật cam kết sau khi xếp → giữ ở cổng; phá lệ → qua; thêm đơn khác sau phá lệ → chặn lại;
  2. `SALES` gửi phá lệ cam kết → 403;
  3. câu kiểm định kỳ `warn` "chuyến vi phạm cam kết không phá lệ";
  4. trigger "một dòng hiện hành" (thêm dòng song song → `RAISE`; bỏ trigger → đỏ);
  5. route 409 `document_type_exists` (mã khác mã CSDL);
  6. bài liệt kê khoá của `lichChungChang`, `hanhKhachChoChuyen` (có cam kết, không tiền, không tên).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Thứ tự:** chủ duyệt → VK3-B làm được ngay trên `main` (không phụ thuộc ADR-0049) → VK3-A sau khi ADR-0049 lượt 1 gộp `main` → chủ vẽ hai ô + nhãn → người kiểm độc lập → phát hành.

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)

1. Chặng đơn A bật "xe riêng", xếp thêm suất đơn B vào cùng chuyến → 409; Quản trị phá lệ kèm lý do → qua, `commitment_override_reason_code` có giá trị, sự kiện phá lệ mang `CAM_KET`.
2. Chặng yêu cầu ≥ 15 chỗ, xếp vào xe 7 chỗ hoặc đổi sang xe 7 chỗ → 409.
3. Bật "xe riêng" sau khi đã ghép → `kiemXuatBen` giữ, lý do bằng lời.
4. `PARTNER` bật "xe riêng" trên nháp của mình → được; `SALES` gửi phá lệ → 403.
5. Thêm "Kiểm định" khi đã có dòng hiện hành → route 409 **và** `INSERT` tay → trigger chặn; Gia hạn → được; loại chưa có → được.
6. `npm test`, `npm run typecheck`, `npm run test:e2e`, `audit-invariants --db local` xanh.

## Phương án bị loại

- Cam kết dạng JSON "mức dịch vụ" — trái 5.2.
- Cam kết ở danh mục dịch vụ thay vì ở chặng — danh mục đồng bộ Sheet; đơn có thể hứa khác danh mục (để làm **mặc định** khi có mẫu chặng theo dịch vụ).
- Tính tiền theo cam kết — trái ADR-0047 A1 "chặng không mang tiền".
- Tự tách chuyến khi vi phạm — tác nhân tự sửa kế hoạch (5.11).
- Q-L3-1 (b)/(c), Q-L3-2 (b) danh sách loại xe (Limousine…), Q-L3-3 (b) — chủ đã chọn (a).

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- G-1: tên cột, hàm `kiemCamKet`, mã `CAM_KET`, mã lỗi `document_type_exists` — kế hoạch chốt.
- G-2: suất người đi kèm không phạm R-XR.
- G-3: R-CX so với số chỗ không kể tài xế.

## Câu hỏi còn mở

**Không có** câu mới cho lượt này. Câu pháp lý ghép khách là việc của chủ ngoài app (ở trên). Câu "cỡ xe" của tiền xe thuê nằm ở ADR-0057 (Q-T1).

## Chưa kiểm

- Pháp lý ghép khách xe hợp đồng: chưa có người chuyên môn kiểm.
- Số dòng giấy tờ xe song song trên production (`R-VC-11`): lộ trình ghi 0; người soạn chưa tự kiểm (lệnh chỉ-đọc remote là việc của chủ/điều phối). Kiểm lại ngay trước khi phát hành trigger.
- Nhu cầu thật: bao nhiêu đơn mua xe riêng / xe cỡ lớn.
- Trạng thái remote của `0034`, `0042`: theo kiểm của điều phối ở lần 15, người soạn không tự chạy lệnh.
- Bản đề xuất này **chưa có người kiểm độc lập**.
