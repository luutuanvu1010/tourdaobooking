# ADR-0049 — Bảng điều phối chung, lượt duyệt 1: chuyến xe và lịch chung; luật, chính sách, mốc 6 giờ; quyền và route tài xế công ty (Vận chuyển)

- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29, câu "Duyệt quyết định Bảng điều phối chung, lượt 1 (9 điểm ở trên)?". Nguyên văn: **"Duyệt, ghi theo câu 1"**. Câu 1 là ĐP2(v); chủ chọn **"Cho lưu nháp, chặn ở Xác nhận"** (nguyên văn câu hỏi và trả lời: [HĐ] "Trả lời lần 4"). Điều kiện điều phối đã nêu với chủ: người kiểm độc lập xem bản cuối rồi mới ghi. Đã kiểm 29/9, **ĐẠT** (bản đề xuất đỉnh `dcea833`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **D1 (bảng `vc_trip`: thêm `route_code`, cờ `rented`) và D2 (cổng xuất bến: chuyến xe thuê phải có nguồn giá, không phá lệ) bị bổ sung bởi ADR-0057** (duyệt 2026-09-30).
- **Ngày:** 2026-09-29.
- **Nguồn:**
  - bản đề xuất `docs/superpowers/specs/2026-09-29-de-xuat-adr-bang-dieu-phoi-luot-1.md`, chép nguyên văn từ "Bối cảnh" trở đi, không đổi nghĩa;
  - bản thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` (gọi tắt **[TK]**), Phần 1–3, 6 và 8, phần của lượt duyệt 1 (D1, D2, D3);
  - lời chủ nguyên văn `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (gọi tắt **[HĐ]**), kể cả các mục "Trả lời lần 2", "lần 3", "lần 4".
- **Kiểm độc lập:**
  - bản thiết kế [TK]: CÓ ĐIỀU KIỆN (4 lỗi CAO), đã sửa, kiểm lại **ĐẠT** (29/9);
  - bản đề xuất: kiểm nhanh CẦN SỬA nhẹ (ĐP2(v), nguồn C21), sửa ở commit `fd19085`, kiểm bản cuối **ĐẠT** (29/9, 8/8 mục, không còn phát hiện treo).
- **Thay:** lượt duyệt 2 (B1, B2, B3) của `docs/superpowers/specs/2026-09-28-de-xuat-adr-van-chuyen-1b.md` (chưa từng được duyệt).
- **Loại:**
  - **một chiều:** tiền tố và chủ sở hữu các bảng `vc_trip*`; tập trạng thái đóng (chuyến, suất, điểm dừng); bản chụp xuất bến và danh sách hành khách đã chốt (chứng cứ, lưu ≥ 3 năm); dữ liệu cá nhân tài xế đã xem;
  - **hai chiều:** ô quyền, giá trị chính sách, danh mục lý do, luật thuần, màn hình.
- **Hiến chương áp** (`docs/ARCHITECTURE.md` Phần I, đã duyệt): 1.2, 1.4, 2.1, 2.2, 4.1, 4.4, 5.1 (ba lệch hẹp — mục "Lệch có chủ ý"), 5.2, 5.3, 5.5, 5.6, 5.7 (lần áp đầu tiên của "giữ"), 5.8, 5.11, 5.12, 5.13, 5.15.
- **Liên quan:** ADR-0002, ADR-0006, ADR-0007, ADR-0019, ADR-0040, ADR-0047, ADR-0048 (mục "Câu ADR bị thay"). **Không** đụng ADR-0022, ADR-0034 (thông báo, Bảng tin — lượt duyệt 2).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` rỗng (kiểm 2026-09-29). Không dùng ô hoãn nào trong mục `thao_tac` (kể cả `task.progress`).
- **Xây trên nền chưa có (Hiến chương 5.13):** ADR-0047 (chặng, hành khách, `soKhachHieuLuc`, view khoá + cờ, `ord_`) và ADR-0048 (`DRIVER_PARTNER`, `v_pty_carrier_driver`) đã duyệt, **chưa thi công**. Lát của ADR này đứng sau lát nền đó.
- **Migration:** số dự kiến từ **0040** (0034–0036 giữ cho ADR-0047, 0037–0039 cho ADR-0048 — `docs/adr/README.md`). Năm cột "đặt gấp" trên `ord_transfer_leg`: **một migration riêng chỉ thêm cột**, số từ 0040 trở đi — **không** chạm migration 0034–0036 của ADR-0047 đang thi công. Kiểm lại mọi nhánh, worktree lúc thi công.

---

## Tóm tắt (lời thường)

1. **Lịch chung không phải sổ riêng:** máy dựng lại mỗi lần mở, từ giờ đón trên đơn — không chép, không lệch.
2. **Chuyến xe** = một xe + một tài xế + các điểm đón/trả. Mỗi khách là một **"suất"** trên đúng một xe; rời xe là đóng suất, ghi ai, lúc nào, vì sao. Không xoá, không ghi đè.
3. **Máy chặn:** vượt số chỗ; xe hoặc tài xế trùng giờ; xuất bến khi thiếu điều kiện (giấy tờ, hạng bằng, đủ tên khách). Chuyến thiếu điều kiện bị **giữ**, hiện lý do và ai phải xử lý.
4. **Mốc 6 giờ** tính tới giờ xe xuất bến. Trong 6 giờ, chỉ khoá "ai đi xe nào", đổi xe, đổi tài xế. **Chỉ Quản trị, Toàn quyền phá lệ**, kèm lý do.
5. **Đặt gấp:** Bán hàng vẫn lưu nháp đơn sát giờ, nhưng không xác nhận được → nhờ Quản trị/Toàn quyền bấm "Đặt gấp" có lý do → xác nhận. Xếp chặng đó lên xe không phải phá lệ lần nữa.
6. **Xếp xe:** Bán hàng, Quản trị, Toàn quyền. Kế toán chỉ xem. Hướng dẫn viên, Đối tác không thấy.
7. **Tài xế công ty:** thấy chuyến mình lái; tự bấm Xuất bến / Đã tới / Đã đón / Vắng / Kết thúc (văn phòng bấm thay được). Thấy tên, năm sinh, SĐT khách **chỉ trong ngày chạy**. **Tài xế đối tác chưa dùng app cho chuyến** (lượt 3, hỏi riêng).
8. **Xe đang chạy:** lượt này khoá hẳn kế hoạch, chỉ bấm tiến độ. Xe hỏng → "Kết thúc gián đoạn", văn phòng tạo chuyến cứu hộ mới.
9. **Chưa có ở lượt này:** chuyển điểm giữa hai xe, văn phòng thêm/báo huỷ điểm khi xe chạy, tin báo điện thoại, gợi ý xếp xe, tài xế tự thêm tên khách.

---

## Bối cảnh

Chủ yêu cầu một **bộ điều phối chung** cho Vận chuyển: vừa là bảng điều khiển, vừa là nơi tính toán logic, vừa trực quan hoá dòng dữ liệu ([HĐ] mục 5, 6). Giờ đón trên biểu mẫu là giờ trên lịch chung. Chuyến thật đón nhiều khách sạn và trả nhiều điểm; lịch đổi được trước và trong lúc chạy ([HĐ] mục 1, 2). Nền dữ liệu đã có quyết định: chặng và hành khách (ADR-0047), nhà xe và tài xế đối tác (ADR-0048), xe và giấy tờ (ADR-0040, đã lên production).

Lượt duyệt này gồm **ba quyết định chạm dữ liệu và quyền** (tối đa của một lượt — `CLAUDE.md` §9). Chuyển điểm giữa hai xe, thay đổi khi xe đang chạy, thông báo (lượt 2); tài xế đối tác, Từ chối, Báo bận (lượt 3); chiều về theo dịch vụ (lượt 4) nằm ở [TK] §6.4.

**Chủ đã quyết, áp dụng không hỏi lại:**
- [HĐ] Q1–Q3: người xếp xe; tài xế tự bấm; SĐT trong ngày chạy.
- [HĐ] "Trả lời lần 2", 29/9:
  - ĐP2: theo 4 khuyến nghị;
  - ĐP3: chỉ Quản trị, Toàn quyền phá lệ;
  - ĐP6: người xếp xe không đổi giờ hẹn khách của đơn người khác;
  - ĐP7: hợp đồng vận chuyển để sau;
  - ĐP8: kiểm và ghi ngay.
- [HĐ] "Trả lời lần 3", 29/9: ngày đón trong [ngày đi − 1, ngày đi + 7] — con số điền cho câu "khoảng cho phép (luật đổi được, ở mã — Phần II)" mà ADR-0047 A1 để cho mã, **không** phải câu ADR bị thay (vì vậy không có dòng ở bảng "Câu ADR bị thay"); đơn nháp chỉ giữ bản cuối (cùng mục).
- [HĐ] "Trả lời lần 4", 29/9: ĐP2(v), chủ trả lời 29/9 ([HĐ] "Trả lời lần 4"): "Cho lưu nháp, chặn ở Xác nhận". Chủ đã được nói rõ cách này lỏng hơn câu "áp cả lúc khách đặt (biểu mẫu)" ngày 28/9 và vẫn chọn. Lời duyệt ADR này: "Duyệt, ghi theo câu 1".

---

## Quyết định

### D1. Chuyến xe, suất, điểm dừng, sự kiện; lịch chung là hình chiếu

**Module và đồ thị**
- Mọi bảng mới thuộc module `van-chuyen` (STRICT, tiền tố `vc_`), trong **cùng Worker**. Bộ điều phối là một phần của `van-chuyen`, không phải Worker hay module riêng.
  - Lý do: luật sức chứa phải nằm cạnh bảng xe. Phần II quy tắc 4 cấm view công bố mang con số, nên module khác không đọc được số chỗ của xe để tự kiểm.
- Cạnh mới:
  - `van-chuyen → orders`: suất trỏ chặng; hàm đọc hẹp;
  - `van-chuyen → locations`: điểm dừng trỏ `loc_location`.
- Vẫn **không module nào import `van-chuyen`**. `orders` nhận con số mốc tối thiểu qua **hàm tiêm từ gốc lắp ráp**.

**Lịch chung là hình chiếu, không phải bảng**
- Không có bảng lịch chung. Lý do: một bảng như vậy sẽ chép giờ hẹn của chặng, trái ADR-0006 điều 5 và ADR-0047 A1 ("hai giờ, hai chỗ, không chép qua lại").
- Lịch chung ngày D = ghép **lúc đọc** ba nguồn:
  - hàm hẹp mới của `orders`, `lichChungChang(db, tuNgay, denNgay)`. Hàm trả chặng còn hiệu lực của đơn **đã xác nhận, chưa huỷ**, theo **ngày đón**. Chỉ gồm: khoá, mã đơn, tên dịch vụ, chiều, ngày giờ hẹn, nơi đón/trả (chữ tự do đã che dãy số), số người, số người đã có tên, cờ đặt gấp. **Không** có tiền, ghi chú, người lập, SĐT, họ tên. Hàm không tự kiểm quyền; nơi gọi đứng sau `can(trip.view)`;
  - dữ liệu `vc_` của chuyến;
  - hàm thuần `dungLichChung` ở `src/shared/`.
- Đơn nháp chỉ hiện thành **một con số** trên đầu màn.
- **Giờ xe tới** của điểm dừng: để trống nghĩa là theo giờ hẹn sớm nhất tại điểm (tính lúc đọc). Người xếp xe ghi đè được, có ghi nhật ký.

**Bảng**

| Bảng | Là gì | Cột chính |
|---|---|---|
| `vc_trip` | chuyến: kế hoạch + thực thi, **một** thực thể | `code` (dạng `CX-3009-07`), `vehicle_id`, `carrier_party_id` (chủ xe chụp lúc xếp), `service_date`, `planned_start_ms`, `planned_end_ms` (`CHECK` kết thúc > bắt đầu, ≤ 24 giờ), `rest_minutes_snapshot`, `rest_override_reason_code`, `status`, `departed_at/ms`, `ended_at/ms`, `cancel_reason_code`, `end_reason_code`, `version` (khoá lạc quan), `last_cmd_id` (dấu lệnh — "Thứ tự lô"), dấu vết |
| `vc_trip_driver` | ai lái, có hiệu lực | `trip_id`, `driver_party_id`, `valid_from_at`, `valid_to_at`, `close_reason` (tập đóng: `REASSIGNED`, `TRIP_CANCELLED`, `REFUSED` để sẵn), `closed_by`; chỉ mục duy nhất một dòng mở mỗi chuyến |
| `vc_trip_stop` | điểm dừng | `seq`, `kind` (`PICKUP`/`DROPOFF`), `location_id` hoặc `place_text` (đúng một), `planned_time` (NULL = theo giờ hẹn), `status`, `arrived_at`, `done_at`, `skip_reason_code` |
| `vc_trip_allocation` | **suất**: một người trên một chuyến, có hiệu lực | `kind` (`PASSENGER`/`CREW`), `leg_id` (bắt buộc với khách), `passenger_key` (NULL = chưa có tên; đặt **một lần**), `crew_party_id`, `board_stop_id`, `alight_stop_id`, `status`, `valid_from_at`, `valid_to_at`, `close_reason` (tập đóng: `MOVED`, `REMOVED`, `TRIP_CANCELLED`, `TRIP_INTERRUPTED`, `TRANSFERRED` để sẵn), `added_after_departure` |
| `vc_trip_event` | sự kiện có kiểu, **cùng id** với dòng `audit_log` (nối một-một, **không** khoá ngoại — khuôn migration 0021) | `trip_id`, `kind`, `stop_id`, `allocation_id`, `count` (số người, không tên), `request_id` **UNIQUE**, `client_at`, `decided_mode` (`NGUOI`/`MAY`) |

**Máy trạng thái** (tập đóng `CHECK`, định **trọn** từ lượt này, kể cả giá trị chỉ dùng từ lượt 2; trigger chỉ đi tiến)
- **Chuyến:** `PLANNED → RUNNING → ENDED | ENDED_INTERRUPTED`; `PLANNED → CANCELLED`.
- **Suất:** `WAITING → BOARDED → DROPPED`; `WAITING → NO_SHOW → BOARDED` (đón muộn, bước lùi duy nhất); `WAITING → CANCELLED_AT_STOP`. Rời chuyến = **đóng dòng**, không đổi trạng thái.
- **Điểm dừng:** `PENDING → ARRIVED → DONE`; `PENDING → SKIPPED`; `ARRIVED → SKIPPED` chỉ trong lô "Kết thúc gián đoạn"; `PENDING → MOVED` để sẵn cho lượt 2.

**Vì sao không sửa đè**
- Khách ở xe nào, tài xế nào lái: dòng có hiệu lực. Danh sách hành khách theo xe là chứng cứ pháp lý; phải trả lời được cho **mọi thời điểm**.
- Sự kiện, nhật ký, bản chụp: chỉ-thêm.
- Thứ tự điểm và giờ xe tới là thuộc tính kế hoạch: **cập nhật**, kèm nhật ký cùng lô (Hiến chương 4.1).

**Thứ tự lô** (khuôn `wonGuard` của `orders`; mọi lệnh ghi một `db.batch`)
1. **Câu cổng**, chạy đầu lô:
   ```
   UPDATE vc_trip SET version = version + 1, last_cmd_id = :cmd
    WHERE id = :T AND version = :v [AND <điều kiện trạng thái>]
   ```
   Tạo chuyến thì câu cổng là chính câu `INSERT`.
2. Nhật ký `auditStatement(…, "changes() > 0")` đứng **ngay sau** câu cổng.
3. Mọi câu ghi sau mang `EXISTS (SELECT 1 FROM vc_trip WHERE id = :T AND last_cmd_id = :cmd)`.
- Dấu lệnh là id riêng của request, nên bên thua không bao giờ lọt qua. Điều kiện chỉ đọc bảng `vc_`, nên hợp với module nghiêm: **không đọc `audit_log`**.
- **Lệnh tiến độ** của tài xế: câu chuyển trạng thái của chính suất/điểm đứng đầu; câu cổng `… AND changes() > 0` ngay sau. Lệnh tiến độ không kiểm `version` nhưng **có tăng**.
- **Câu đổi trạng thái chuyến** sang trạng thái cuối (`ENDED`, `ENDED_INTERRUPTED`, `CANCELLED`) luôn là **câu cuối lô**.
- Lô **"Kết thúc gián đoạn"**, thứ tự cố định:
  1. câu cổng;
  2. nhật ký;
  3. sự kiện `ENDED_INTERRUPTED`;
  4. đóng suất `WAITING`/`BOARDED` với `TRIP_INTERRUPTED`;
  5. điểm `PENDING`/`ARRIVED` → `SKIPPED`;
  6. đổi trạng thái chuyến.
- Trigger chỉ cho đóng suất của chuyến đang chạy khi có sự kiện `ENDED_INTERRUPTED` mang **đúng dấu lệnh hiện hành**. Tức là chỉ đúng **trong chính lô đó** (khuôn LC-05). Chi tiết: [TK] §2.1a.

**Luật lõi của lượt này** (đổi bằng ADR; **không ai phá lệ**, kể cả Toàn quyền)

| Mã | Luật | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| LC-01 | Mỗi người của một chặng ở **đúng một** chuyến tại mỗi lúc | chỉ mục duy nhất `(leg_id, passenger_key)` cho suất có tên đang mở | số suất mở của chặng ≤ số người — **lệch L-D1** |
| LC-02 | Tổng suất `WAITING` + `BOARDED` ≤ số chỗ của xe, mọi lúc | trigger trên suất; trên đổi xe; trên giảm số chỗ hoặc ngừng xe | câu báo bằng lời |
| LC-03 | Xe và tài xế không chồng giờ; mỗi xe, mỗi tài xế chỉ một chuyến đang chạy | trigger + chỉ mục duy nhất `(vehicle_id) WHERE status = 'RUNNING'` | có |
| LC-04 | Không xoá; không sửa nội dung; chỉ đóng dòng, gắn tên, đổi trạng thái đi tiến | trigger | — |
| LC-06 | Chuyến đã kết thúc hay huỷ: không sửa được (cả điểm, suất) | trigger | — |
| LC-07 | Trạng thái chỉ đi tiến | trigger | — |
| LC-09 | Chỉ chặng còn hiệu lực của đơn đã xác nhận, chưa huỷ, mới lên xe. Đơn huỷ sau khi xếp → **giữ** | trigger đọc `v_ord_leg_key`, `v_ord_order_flag` | có |
| LC-10 | Người gắn vào suất thuộc đúng đơn của chặng | trigger đọc `v_ord_passenger_key` | có |
| LC-11 | Giờ sự kiện do máy chủ ghi; lệnh lặp không ghi hai lần | `UNIQUE(request_id)` | có |
| LC-13 | Không chéo xe–tài xế (ADR-0048 B1.4) | trigger đọc `v_pty_carrier_driver` | có |
| LC-15 | **Chuyến đang chạy: khoá hẳn kế hoạch.** Không mở/đóng suất, không thêm điểm, không đổi xe, đổi tài xế. Chỉ còn: trạng thái tiến độ, đổi thứ tự điểm chưa tới, gắn tên vào suất. Ngoại lệ duy nhất: lô "Kết thúc gián đoạn" | trigger | 409 bằng lời |
| LC-16 | Kết thúc thường chỉ khi mọi suất có kết quả cuối, mọi điểm xong. Không thì "Kết thúc gián đoạn" có lý do | trigger ở câu đổi trạng thái | có |
| LC-18 | Nhật ký chỉ ghi số người, mã chuyến, mã đơn — không tên, năm sinh, SĐT, số giấy tờ | — | danh sách trắng + bài quét nhật ký |

**Thay ADR-0006 cho xe đường bộ:** việc đưa đón bằng xe là **chuyến** của Vận chuyển, không phải nhiệm vụ của Phân công. Mã `PICKUP`/`DROPOFF` của Phân công **không** bị ngưng: ADR-0006 điều 4 còn dùng cho người đón không lái xe, ví dụ HDV đón ở cảng. Câu cụ thể ở mục "Câu ADR bị thay".

### D2. Luật, chính sách, cổng xuất bến, mốc tối thiểu, "giữ"

**Chính sách** (dòng có ngày hiệu lực, chỉ-thêm; khuôn `vc_expiry_policy`)
- **`vc_dispatch_policy`**, Toàn quyền sửa (`settings.ops`):

  | Cột | Nghĩa | Gieo |
  |---|---|---|
  | `min_lead_minutes` | mốc tối thiểu — **một con số cho cả lúc đặt và lúc xếp** (chủ: luật "ghép điều kiện chung") | 360 |
  | `warn_lead_minutes` | cảnh báo sát mốc | 120 |
  | `rest_minutes` | khoảng nghỉ giữa hai chuyến | 30 |
  | `require_manifest` | bắt đủ danh sách hành khách | 1 |
  | `require_contract` | bắt hợp đồng vận chuyển; **khoá ở 0** tới khi có ADR hợp đồng (ĐP7) | 0 |

  `valid_from_at` UNIQUE; cấm đặt hiệu lực lùi ngày.
- **`vc_departure_rule`**, Toàn quyền: "xe từ N người trở lên → bắt buộc giấy tờ X của xe hoặc tài xế còn hạn tới hết chuyến". Giữ nguyên thiết kế 1b B2.
- **`vc_license_capacity`**, Toàn quyền: hạng bằng → số khách tối đa không kể lái. Gieo theo bảng tra 27/9: B 8; D1 16; D2 29; D không giới hạn; B2 cũ 8; C cũ 8; D cũ 29; E cũ không giới hạn. **Chưa có người chuyên môn kiểm.**
- **`vc_reason`**, Quản trị (`admin.manage`): danh mục lý do theo nhóm (đổi giờ xe, phá lệ, kết thúc gián đoạn, huỷ chuyến, bỏ qua điểm…). Máy chỉ rẽ nhánh theo **nhóm**, nên lý do là dữ liệu (Hiến chương 2.2).

**Mốc tối thiểu 6 giờ** (C17, C18 của [TK])

| Lúc | Luật | Ai phá lệ |
|---|---|---|
| **Đặt** | Lưu **nháp** chặng dưới mốc được (có cảnh báo) — ĐP2(v), chủ trả lời 29/9 ([HĐ] "Trả lời lần 4"): "Cho lưu nháp, chặn ở Xác nhận". Chủ đã được nói rõ cách này lỏng hơn câu "áp cả lúc khách đặt (biểu mẫu)" ngày 28/9 và vẫn chọn. **Xác nhận đơn**, hoặc **sửa ngày, giờ, nơi đón, nơi trả** của chặng đơn đã xác nhận, khi giờ hẹn < bây giờ + mốc → chặn, trừ khi chặng mang **"đặt gấp"**. Điều kiện nằm **trong** câu xác nhận (khuôn `confirmWindow`) | **chỉ Quản trị, Toàn quyền** (ô mới `order.leg.short_notice`), kèm lý do |
| **Xếp** | Lệnh đổi **"ai đi xe nào"**, đổi xe, đổi tài xế của chuyến có **giờ xuất bến dự kiến** < bây giờ + mốc → chặn. Đổi thứ tự điểm, chỉnh giờ xe tới **vẫn làm được**, có ghi. Xếp **chính chặng đã đặt gấp** thì qua, không ghi lý do lần nữa | **chỉ Quản trị, Toàn quyền** (ô mới `trip.override`), kèm lý do nhóm `PHA_LE` |

- **Cột "đặt gấp" trên `ord_transfer_leg`** (bổ sung ADR-0047 A1): `short_notice_reason`, `short_notice_note` (≤ 120 ký tự, che dãy số), `short_notice_by`, `short_notice_at`, `short_notice_lead_minutes` (số phút đã dùng — chụp tại mốc, 5.6).
  - `CHECK`: có lý do thì có người + lúc.
  - Lý do là **hằng trong mã dùng chung** (khuôn `CANCEL_REASONS`), vì `orders` không được đọc bảng `vc_`.
- **Route mới** (cổng `orders`): `POST /api/orders/:id/legs/:legId/short-notice`, thân `{ lyDo, ghiChu }`, hỏi `can(order.leg.short_notice)`.
- **Hàm tiêm mới** `ctx.mocToiThieu(env) → { phut }` (khuôn `isAssigned`, ADR-0007 điều 4(b)). Gốc lắp ráp nối nó vào hàm công bố `mocToiThieuHienHanh` của `van-chuyen`. Thiếu hàm tiêm thì **chặn**, không đoán con số.
- **Không phải lệch 5.1:** luật phụ thuộc **giờ hiện tại** nên là "khoảng cho phép" — Phần II đặt loại luật này ở mã.

**Khoảng nghỉ:** là luật cấu hình ở máy chủ, không phải trigger. Chụp vào `vc_trip.rest_minutes_snapshot`. Xuất bến thì kiểm lại từ giờ **kết thúc thật** của chuyến trước. Chỉ Quản trị, Toàn quyền phá lệ, ghi vào `rest_override_reason_code`.

**Cổng xuất bến** — một hàm thuần `kiemXuatBen`, dùng chung cho màn hình và máy chủ. Kiểm:
- sàn cứng: có xe đang dùng; có đúng một tài xế; GPLX hiện hành, còn hạn tới hết chuyến, hạng đủ chở số chỗ của xe;
- mọi dòng `vc_departure_rule` đang hiệu lực;
- đủ tên cho số người mỗi chặng (`require_manifest`);
- không đơn nào đã huỷ;
- sức chứa;
- nghỉ đủ.

Giấy tờ đọc qua hàm công bố của `parties`, không lấy số.

- **Bản chụp** (chỉ-thêm, lưu ≥ 3 năm):
  - `vc_trip_departure_check`: dòng đầu cùng các dòng con có kiểu, không JSON. Lưu khoá trước; chỉ chép giá trị hồ sơ còn sửa tại chỗ được (biển số, số chỗ, hạng, hạn). Không tên, không số giấy tờ;
  - `vc_trip_manifest`: danh sách người lúc xuất bến, trỏ đúng **dòng** `ord_passenger` đã dùng.
- **[CSDL]:** chuyển `PLANNED → RUNNING` chỉ khi có dòng kiểm đạt ghi cùng lô (LC-05).
- **"Giữ"** (Hiến chương 5.7): chuyến không đạt thì ở `PLANNED`, hiện **lý do + ai xử lý** (văn phòng / Quản trị / Toàn quyền). Không lưu cột "giữ"; tính lại mỗi lần đọc. Kiểu `LyDoGiu` ở `src/shared/` là chỗ sống duy nhất (K9).

**Luật đủ điều kiện lái (LC-12):** hạng và hạn GPLX, giấy tờ xe. Kiểm ở máy chủ lúc gán tài xế, lúc đổi xe, lúc xuất bến; có bản chụp và câu kiểm định kỳ — **lệch L-B2**.

### D3. Quyền, cổng, route, danh sách trường cho tài xế công ty

**Ô mới** (cột theo `PERMISSION_CODES`; `DRIVER_PARTNER` là cột của ADR-0048)

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER |
|---|---|---|---|---|---|---|---|---|---|
| `trip.view` — xem lịch chung, chuyến | any | any | any | none | none | any | none | **assigned** | none |
| `trip.dispatch` — tạo/sửa/huỷ chuyến, xếp/dời/rút suất, đổi xe/tài xế (chuyến **chưa chạy**) | any | none | any | none | none | any | none | none | none |
| `trip.progress` — xuất bến, đã tới, đã đón, vắng, khách đã huỷ, đã trả, kết thúc (thường / gián đoạn), đổi thứ tự điểm chưa tới | any | none | any | none | none | any | none | **assigned** | none |
| `trip.override` — phá lệ mốc lúc xếp, khoảng nghỉ | none | none | any | none | none | any | none | none | none |
| `order.leg.short_notice` — đặt gấp | none | none | any | none | none | any | none | none | none |

- `assigned` = đang có dòng lái mở trên chuyến. Phạm vi tính trong `van-chuyen` từ `vc_trip_driver`, theo `ctx.staff.partyId`; **không** nới `can(assigned)` của người phụ trách đơn.
- Văn phòng bấm thay tiến độ, có ghi người bấm ([HĐ] Q2).
- **Nới hàng rào đã ghim (Điều 9.4):** bài ghim hàng `DRIVER` (ADR-0040) đổi từ "mọi ô nghiệp vụ `none`" sang "đúng `trip.view`, `trip.progress` là `assigned`". Hàng `DRIVER_PARTNER` (ADR-0048) **giữ nguyên**.

**Cổng**
- Màn văn phòng: cổng `office`, thân route hỏi `trip.*`.
- Chính sách: cổng `office` + `settings.ops`. Danh mục lý do: cổng `admin` + `admin.manage`.
- Route tài xế: cổng `staff`, thân route hỏi `can(trip.*, { assigned })` **trước** mọi truy vấn. Chuyến không phải của mình → **404** (không lộ chuyến có tồn tại).
- `DRIVER`, `DRIVER_PARTNER` vẫn không vào `office`, `orders`, `admin`.
- Hàng rào 2 (`route-write-guard`) được **siết** thêm cho route nghiệp vụ ở cổng `staff` (ADR-0019 điều 6).

**Route chính**
- Văn phòng:
  - `GET /api/van-chuyen/lich?ngay=`;
  - `POST /api/van-chuyen/chuyen`;
  - `PUT /api/van-chuyen/chuyen/:id` (kèm `version`);
  - `POST …/chuyen/:id/phan-bo`, `…/rut`, `…/huy`, `…/pha-le`, `…/xuat-ben` (bấm thay);
  - `GET …/chuyen/:id`.
- Chính sách:
  - `GET/POST /api/van-chuyen/chinh-sach-dieu-phoi`, `…/dieu-kien`, `…/hang-bang`;
  - `GET/POST/PUT /api/van-chuyen/ly-do`.
- Tài xế:
  - `GET /api/van-chuyen/cuoc-cua-toi?tu=&den=`;
  - `GET /api/van-chuyen/cuoc-cua-toi/:id`;
  - `POST …/xuat-ben`, `…/diem/:sid/da-toi`, `…/phan-bo/:aid/don`, `…/phan-bo/:aid/vang`, `…/phan-bo/:aid/khach-huy`, `…/phan-bo/:aid/tra`, `…/ket-thuc`, `…/ket-thuc-gian-doan`, `…/thu-tu`;
  - mọi lệnh mang `request_id`.
- Tên route là đề xuất; kế hoạch thi công chốt.

**Danh sách trường cho tài xế** (Hiến chương 4.4; dựng mới từng khoá theo khuôn `pool.ts`)
- **Được:**
  - mã chuyến, biển số, số chỗ, giờ, trạng thái;
  - điểm dừng (tên nơi; chữ tự do che dãy số), giờ hẹn, giờ xe tới;
  - mã đơn, số người mỗi điểm;
  - **trong ngày chạy:** họ tên + năm sinh khách của chuyến; tên + SĐT người liên hệ của đơn có khách trên chuyến — qua hàm hẹp mới `lienHeChoTaiXe` của `orders` ([HĐ] Q3);
  - trạng thái từng suất; điều kiện xuất bến còn thiếu.
- **Không bao giờ:** tiền, dịch vụ khác của đơn, ghi chú đơn, người lập, người phụ trách, số giấy tờ.
- **"Trong ngày chạy"** = hôm nay (ngày dân sự VN) là `service_date` của chuyến, **hoặc** chuyến đang chạy. Ngoài khoảng đó các khoá tên, năm sinh, SĐT **vắng mặt** (không phải chuỗi rỗng).

---

## Lệch có chủ ý khỏi Hiến chương 5.1 (khuôn ADR-0029; chỉ hợp lệ khi chủ duyệt)

| Mã | Phạm vi | Vì sao chỉ ở mã | Lớp bù | Điều kiện gỡ |
|---|---|---|---|---|
| **L-D1** | số suất mở của một chặng ≤ số người của chặng | số người sau sửa nằm trong JSON của `orders` (`after_json`) | máy chủ lúc mở suất; **giữ** ở cổng xuất bến; câu kiểm định kỳ | số khách hiệu lực thành cột có kiểu (cùng điều kiện L-A1 của ADR-0047) |
| **L-B1** | đủ tên cho số người lúc xuất bến | như trên | `kiemXuatBen`; trigger đòi dòng kiểm đạt cùng lô; câu kiểm định kỳ | như trên |
| **L-B2** | hạng, hạn GPLX; giấy tờ còn hạn tới hết chuyến | Phần II quy tắc 4 cấm view mang hạng/hạn | máy chủ lúc gán + lúc xuất bến; bản chụp; câu kiểm "chuyến 48 giờ tới có tài xế không đạt" | view cờ `v_pty_driver_eligible` nếu chủ nới quy tắc 4 — không đề xuất ở đây |

---

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0006 điều 2 | "`task_kind_code` (… `PICKUP` đón, `DROPOFF` tiễn, `BOAT` lái cano, …)" | giữ danh sách; thêm: "`PICKUP`/`DROPOFF` của Phân công chỉ dùng cho **người** đón/tiễn không lái xe (vd HDV đón ở cảng); đưa đón bằng xe đường bộ là Chuyến của Vận chuyển (ADR-0049)." |
| ADR-0006 điều 4 | "**Nhiệm vụ** = dòng phạm vi `order_service_id`; một dịch vụ có nhiều nhiệm vụ đang mở (vd tài xế đón ở khách sạn, HDV đón ở cảng, lái cano)." | "… (vd HDV đón ở cảng, lái cano). **Việc đưa đón bằng xe đường bộ là Chuyến của phân hệ Vận chuyển** (ADR-0049), không phải nhiệm vụ của Phân công." |
| ADR-0006 điều 5, vế thứ hai | "*giờ và nơi điều xe/đón thực tế* = `dsp_assignment.scheduled_time` / `location_id` / `place_text` của nhiệm vụ `PICKUP` … câu 'tài xế đón mấy giờ' đọc từ nhiệm vụ `PICKUP` của dịch vụ đó." | "… = giờ xe tới của điểm dừng `vc_trip_stop.planned_time` (trống = theo giờ hẹn của chặng) … câu 'tài xế đón mấy giờ' đọc từ điểm dừng của chuyến có suất của chặng đó." |
| ADR-0006 điều 7, vế "đã đón" | "Tiến độ **của từng nhiệm vụ** (đã gọi, đã đón) nằm ở `dsp_assignment.status_code`/`done_at`" | "… Với xe đường bộ, 'đã đón' = suất `vc_trip_allocation.status = 'BOARDED'` (một nguồn)." |
| ADR-0040 D1 | "Phụ thuộc `parties` (hàm công bố) và `audit` (`auditStatement`). Không module nào import `van-chuyen`." | "Phụ thuộc `parties`, `audit`, **`orders`**, **`locations`**. Không module nào import `van-chuyen`." — sửa `ALLOWED_EDGES` là nới hàng rào (Điều 9.4) |
| ADR-0040 D3 | "**Lượt 1b:** mở ô 'xem cuốc xe của mình'. Trang đầu của tài xế hiện các cuốc được giao." | "… mở `trip.view`, `trip.progress` (phạm vi `assigned`); tên, năm sinh, SĐT khách chỉ trong ngày chạy (ADR-0049)." — nới bài ghim hàng `DRIVER` |
| ADR-0047 A1 (bảng cột `ord_transfer_leg`) | (không có cột đặt gấp) | thêm `short_notice_reason`, `short_notice_note`, `short_notice_by`, `short_notice_at`, `short_notice_lead_minutes`; `CHECK` có lý do thì có người + lúc |
| ADR-0047 A1 (sau xác nhận) | "Sau xác nhận: **thêm** chặng được (thêm chiều về); **sửa** trường vận hành (ngày, giờ, nơi) được; **bỏ** = đóng dòng có lý do." | "… **sửa** trường vận hành được; **khi giờ hẹn đã dưới mốc tối thiểu** (ADR-0049 D2) chỉ Quản trị, Toàn quyền sửa, kèm lý do đặt gấp. **Xác nhận** đơn có chặng dưới mốc cũng đòi đặt gấp." |
| ADR-0047 A3 | "Hàm trả liên hệ (SĐT) cho tài xế: **chờ lượt 2** (Q3)." | "`lienHeChoTaiXe(db, orderIds)` — chỉ gọi sau `can(trip.view, assigned)`, chỉ trong ngày chạy (chủ trả lời Q3). Thêm hàm hẹp `lichChungChang` (danh sách trường ở ADR-0049 D1)." |
| ADR-0019 điều 1, dòng cổng `staff` | "`staff` \| mọi tài khoản đang hoạt động \| việc tự phục vụ của chính người gọi (điều 4)" | "… việc tự phục vụ của chính người gọi (điều 4) **và route nghiệp vụ theo vai trên chính đối tượng** của người không qua cổng nào khác (tài xế: chuyến mình đang lái), canh bằng `can()` trong thân route." Danh sách mã của cổng không đổi |
| ADR-0019 điều 4 | "**Tự phục vụ là ngoại lệ vĩnh viễn** … các route đọc của chính mình ở cổng `staff` … tự khoanh phạm vi bằng **danh tính trong phiên**" | thêm: "Route **nghiệp vụ** ở cổng `staff` (`GET /api/parties/documents/mine` của ADR-0040; các route tài xế `/api/van-chuyen/cuoc-cua-toi*`) **không** thuộc ngoại lệ tự phục vụ: chúng hỏi ô của `MATRIX` bằng `can()` như điều 2." |
| ADR-0019 điều 6 | "Hàng rào 2 mở rộng từ 'mọi đường **ghi**' sang 'mọi route (đọc lẫn ghi) sau cổng `office`, `orders`, `admin`'" | "… và **mọi route nghiệp vụ ở cổng `staff`** không thuộc ngoại lệ tự phục vụ." — siết, không nới |
| ADR-0019 (bản đồ ô) | — | thêm năm ô ở D3 |
| ADR-0007 điều 4(b) | khuôn hàm tiêm từ gốc lắp ráp | thêm `ctx.mocToiThieu` |
| ADR-0002 (đồ thị) | cạnh của `van-chuyen`: `parties`, `audit` | thêm `orders`, `locations` |
| ADR-0048 | — | **không đổi** ở lượt này: mọi ô `trip.*` của `DRIVER_PARTNER` vẫn `none` |

---

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Loại |
|---|---|
| `vc_trip` | chuyến — một loại; xe công ty và xe nhà xe **chung bảng**; luật không rẽ nhánh theo chủ xe |
| `vc_trip_driver` | ai lái, có hiệu lực — hồ sơ tài xế công ty hoặc tài xế đối tác (tài xế đối tác được xếp lái nhưng **chưa** dùng app ở lượt này) |
| `vc_trip_stop` | điểm dừng đón / trả |
| `vc_trip_allocation` | **hai loại dòng**: suất hành khách (trỏ chặng + người, tên gắn sau được) và suất người đi kèm (trỏ hồ sơ: HDV, phụ xe); `CHECK` đúng một loại |
| `vc_trip_event` | sự kiện có kiểu, nối 1-1 `audit_log`; chỉ số người |
| `vc_dispatch_policy`, `vc_departure_rule`, `vc_license_capacity` | chính sách có ngày hiệu lực |
| `vc_reason` | danh mục lý do |
| `vc_trip_departure_check` (+ dòng con), `vc_trip_manifest` | bản chụp xuất bến; chỉ-thêm; manifest trỏ dòng `ord_passenger`, không chép tên |
| `ord_transfer_leg` (ADR-0047) | + năm cột "đặt gấp" (không thêm loại dòng) |
| `audit_log` | + hành động `trip_*`, `order_leg_short_notice`; không tên, năm sinh, SĐT, số giấy tờ |

**(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào**

| Ô | Chạm | Áp cho |
|---|---|---|
| `trip.view` | đọc mọi bảng `vc_trip*`; lịch chung qua `lichChungChang`; liên hệ qua `lienHeChoTaiXe` | văn phòng + Kế toán: mọi chuyến; tài xế công ty: chuyến mình lái, DTO hẹp |
| `trip.dispatch` | `vc_trip`, `vc_trip_driver`, `vc_trip_stop`, `vc_trip_allocation` (cả hai loại dòng), `vc_trip_event` | chuyến **chưa chạy**; trong 6 giờ không đổi "ai đi xe nào", xe, tài xế nếu không có phá lệ |
| `trip.progress` | trạng thái chuyến, điểm, suất; `vc_trip_event`; **ghi** bản chụp xuất bến | tài xế: chuyến mình; văn phòng: mọi chuyến (bấm thay) |
| `trip.override` | sự kiện `PHA_LE`; `vc_trip.rest_override_reason_code` | chỉ Quản trị, Toàn quyền |
| `order.leg.short_notice` | cột "đặt gấp" của `ord_transfer_leg` | chỉ Quản trị, Toàn quyền; mọi đơn |
| `settings.ops` | ba bảng chính sách | Toàn quyền |
| `admin.manage` | `vc_reason` | Quản trị, Toàn quyền |
| `order.trip.edit`, `order.modify`, `contact.view`, `order.passenger.write` | **không đổi** ô. Sửa chặng dưới mốc thêm điều kiện "đã đặt gấp". SĐT, tên trong DTO tài xế là **ngoại lệ có tên** dưới `trip.view` + "trong ngày chạy" | — |
| `vehicle.manage` | không đổi, không mở chuyến | — |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Ô trong thân route | Lớp CSDL |
|---|---|---|---|
| Bảng điều phối, chi tiết chuyến, xếp xe, phá lệ, xuất bến bấm thay | `office` | `trip.view` / `trip.dispatch` / `trip.progress` / `trip.override` | LC-01…04, 06, 07, 09–11, 13, 15, 16; LC-05 |
| Chính sách; danh mục lý do | `office` / `admin` | `settings.ops` / `admin.manage` | trigger chỉ-thêm của chính sách |
| Màn tài xế | `staff` | `trip.*` với `assigned`; ngoài phạm vi → 404 | như trên |
| Đặt gấp; xác nhận và sửa chặng dưới mốc | `orders` | `order.leg.short_notice`; `order.modify` / `order.trip.edit` + điều kiện mốc trong câu ghi | `CHECK` cột đặt gấp |
| Hợp đồng giữa các phần | — | `lichChungChang`, `lienHeChoTaiXe` không tự kiểm quyền: bài quét "nơi gọi đứng sau `can()`"; hàm tiêm `ctx.mocToiThieu` | — |

---

## Cửa một chiều / hai chiều

- **Một chiều:**
  - tiền tố và chủ các bảng `vc_trip*`;
  - các tập đóng (trạng thái chuyến, suất, điểm; `kind`; `close_reason`) — đổi `CHECK` trong SQLite là phải dựng lại bảng, nên **định trọn ngay lượt này**;
  - bản chụp, manifest, sự kiện, nhật ký;
  - danh sách trường của `detail` nhật ký (chốt trước khi ghi dòng đầu);
  - mỗi lần tài xế đã xem tên, SĐT khách (không rút lại được).
- **Hai chiều:** ô quyền; giá trị chính sách (thêm dòng mới); danh mục lý do; luật thuần (đổi cùng test); màn hình; hàm tiêm.
- **Tránh một chiều không cần:** không thêm lớp Durable Object — lớp mới làm Cloudflare chặn `wrangler rollback` (ĐP8).

---

## Hệ quả

- **Việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ có **người kiểm độc lập** ở cuối lượt.
- **Hàng rào mới**, mỗi cái một dòng `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên):
  - trigger LC-01…LC-16 của lượt này;
  - bài ghim hàng `DRIVER` mới; bài ghim `order.leg.short_notice`, `trip.override` chỉ Quản trị + Toàn quyền;
  - bài thứ tự lô (câu cổng đầu, nhật ký ngay sau, dấu lệnh, trạng thái chuyến cuối);
  - **bài chạy đua** trên D1 local (10 yêu cầu song song vào chuyến còn 3 chỗ → đúng 3 thành công) — kiểm giả định "D1 chạy lô lần lượt" (**chưa kiểm**);
  - bài quét "nơi gọi hàm hẹp đứng sau `can()`";
  - bài liệt kê khoá DTO tài xế (ngoài ngày chạy không có tên, SĐT; không bao giờ có tiền);
  - bài quét nhật ký không tên, năm sinh, SĐT (mở rộng `src/giay-to-khong-lo-so.test.ts`);
  - hàng rào 2 siết cho cổng `staff`;
  - câu kiểm định kỳ L-D1, L-B1, L-B2, "sự kiện mồ côi", "chặng quá mốc chưa xếp".
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Thứ tự:**
  1. kế hoạch thi công;
  2. lát 1.1–1.7 ([TK] §8) — máy chủ, CSDL, luật thuần. Chạy song song được: chính sách (1.1), luật thuần (1.3), phía `orders` (1.4), cùng nền ADR-0047/0048;
  3. chủ vẽ 8 màn;
  4. lát 1.8 giao diện;
  5. người kiểm độc lập;
  6. phát hành.
- **Tiêu chí nghiệm thu** kiểm bằng máy: [TK] §8.2, lát 1.1–1.8.

## Phương án bị loại

- **Bảng "lịch chung" riêng:** chép giờ hẹn, trái "một nguồn".
- **Tách bảng "bản xếp" khỏi chuyến:** luật phải giữ hai nơi, phải chép kế hoạch sang thực thi.
- **Phân bổ theo `person_key` như 1b:** khách chưa có tên không xếp được, sức chứa tính thiếu.
- **Khoảng nghỉ trong trigger như 1b:** không phá lệ được như chủ cho.
- **Cổng lô bằng `EXISTS(audit_log)`:** `van-chuyen` là module nghiêm, không được đọc `audit_log`. Thêm view `v_aud_*` thì phức tạp hơn dấu lệnh.
- **Durable Object "điều phối" theo ngày; hàng đợi xử lý nền:** chủ chọn kiểm và ghi ngay (ĐP8).
- **Bán hàng tự phá lệ mốc 6 giờ:** chủ chọn chỉ Quản trị, Toàn quyền (ĐP3).
- **Chặn luôn cả lưu nháp chặng dưới mốc:** chủ chọn ĐP2(v) = "Cho lưu nháp, chặn ở Xác nhận" (29/9, [HĐ] "Trả lời lần 4").
- **Mở luôn cho tài xế đối tác:** dữ liệu cá nhân cho người ngoài công ty là một chiều — tách sang lượt 3, hỏi riêng (ĐP12).

## Chưa kiểm

- D1 chạy lô lần lượt (có bài chạy đua ở lát 1.5).
- Chi phí Cloudflare (ước tính rất nhỏ, chưa đo).
- Quy mô thật (số chặng, số chuyến mỗi ngày).
- Pháp lý: ghép khách nhiều đơn vào một xe hợp đồng (Nghị định 158/2024), bảng hạng bằng.
- Bản đề xuất đã có người kiểm độc lập xem bản cuối (ĐẠT, 29/9). Chưa thi công: chưa có mã, test hay quan sát chạy thật cho điều nào ở đây.
