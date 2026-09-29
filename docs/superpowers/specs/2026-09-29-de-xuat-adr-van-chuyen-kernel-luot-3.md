# Đề xuất ADR-00xx (điều phối cấp số) — Vận chuyển, thừa kế Transportation Kernel, lượt duyệt 3: cam kết xe riêng / cỡ xe tối thiểu trên chặng; mỗi xe mỗi loại giấy tờ một dòng đang dùng

- **Trạng thái:** **ĐỀ XUẤT — chờ chủ duyệt, sau lượt 1 và 2.**
  - AI soạn ở vai người thiết kế (P15); không tự duyệt (N3, Điều 7.2).
  - Chưa có người kiểm độc lập.
  - Không đặt tệp ở `docs/adr/`.
- **Ngày:** 2026-09-29.
- **Nguồn:**
  - bản soi `docs/superpowers/specs/2026-09-29-transportation-kernel-va-lo-he-thong.md` (**[SOI]**): LH-04, B6, B7;
  - lời chủ [HĐ] "Trả lời lần 9" (ý 2 "xe riêng / hạng xe hứa với khách");
  - [REF]:80, :129;
  - [ĐC] "Ý đáng học" 1;
  - ADR-0040 (**[0040]**), ADR-0047 (**[0047]**), ADR-0049 (**[0049]**);
  - [TK]:166 ("máy không cấm ghép").
- **Loại:**
  - **một chiều:** hai cột cam kết trên `ord_transfer_leg` (tên, kiểu); mỗi cam kết đã ghi trên đơn đã xác nhận (lời hứa với khách, có nhật ký);
  - **hai chiều:** cách xử lý khi vi phạm (chặn / phá lệ / cảnh báo); luật một dòng giấy tờ hiện hành (bỏ trigger bằng migration mới được).
- **Hiến chương áp:** 2.2, 5.1, 5.2 (cam kết là cột có kiểu, **không JSON** như `service_level JSONB` của [REF]:129), 5.3, 5.5, 5.6, 5.7, 5.12.
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 29/9).
- **Xây trên nền chưa có (5.13):** kiểm xếp / đổi xe / cổng xuất bến của ADR-0049 (đang thi công); chặng của ADR-0047 (chưa gộp). VK3-B chỉ cần production 1.37.
- **Câu pháp lý còn treo — CHƯA CÓ NGƯỜI CHUYÊN MÔN KIỂM:**
  - xe hợp đồng (Nghị định 158/2024, sửa bởi NĐ 218/2026 theo [TRA]) có được **ghép khách của nhiều đơn / nhiều hợp đồng** vào một xe không. [TRA] ghi "chưa chắc".
  - Câu này chạm cả mô hình "một chuyến gom khách của nhiều đơn" đã duyệt (`docs/superpowers/specs/2026-09-27-van-chuyen-design.md:52`; ADR-0049). Đề xuất này **không** trả lời nó; cột "xe riêng" dùng được với mọi câu trả lời.

---

## Tóm tắt cho chủ (lời thường)

1. **Hứa xe riêng / xe đủ lớn với khách:**
   - chặng đưa đón có thêm hai ô: **"Xe riêng"** (không ghép khách đơn khác) và **"Xe tối thiểu … chỗ"**;
   - máy **chặn** xếp sai (ghép khách vào xe riêng, xếp vào xe nhỏ hơn) và **giữ** chuyến sai ở cổng xuất bến;
   - Quản trị / Toàn quyền **phá lệ** được, kèm lý do (vd xe hỏng, khách đồng ý đi chung).
   - Giá không đổi: giá xe riêng vẫn do danh mục quyết.
2. **Mỗi xe mỗi loại giấy tờ chỉ một dòng đang dùng:** thêm "Kiểm định" khi xe đã có Kiểm định → máy bảo "dùng Gia hạn". Tránh hai dòng cùng loại làm máy đọc nhầm hạn.
3. **Câu pháp lý ghép khách xe hợp đồng chưa ai kiểm** → nên hỏi người chuyên môn trước khi chạy chuyến ghép thật.
4. **Bạn cần:** trả lời 3 câu ở cuối tệp, rồi bấm duyệt.

---

## Bối cảnh

- **Ý 2 của chủ** ([HĐ] lần 9): "xe riêng / hạng xe hứa với khách".
  - Hôm nay máy **không cấm ghép** ([TK]:166).
  - Không có chỗ ghi lời hứa "xe riêng" hay "xe 16 chỗ" → người xếp xe phải nhớ.
  - [REF] gọi đây là `Commitment` ([REF]:80), cất dạng JSON ([REF]:129). Hiến chương 5.2 cấm JSON cho dữ liệu nghiệp vụ → **cột có kiểu**.
- **LH-04** của [SOI] (production 1.37):
  - thêm được dòng giấy tờ xe mới cùng loại khi đã có dòng đang dùng (`src/modules/van-chuyen/index.ts:232-255`, `rules.ts:168-172`, `web/giay-to-ui.ts:72`);
  - cổng xuất bến sắp có lấy **bất kỳ** dòng nào còn hạn (`src/shared/dieu-phoi-kiem.ts:221@fd78247`).
  - Việc siết K-01 (đếm) giao ngay; phần **chặn** là quyết định dữ liệu → ở đây.

Hai quyết định chạm dữ liệu (trần 3 — `CLAUDE.md` §9). Để lượt 3 vì:
- VK3-A có câu pháp lý treo và cần kiểm xếp của ADR-0049 chạy trước;
- VK3-B nên chờ số đếm K-01 để biết có bao nhiêu dòng phải dọn.

**Chủ đã quyết / nguyên tắc đã duyệt, áp dụng không hỏi lại:**
- ADR-0047 A1: "chặng **không mang tiền**; giá đưa đón do danh mục quyết" → cam kết không tính tiền.
- ADR-0049 D2 + ĐP3: người phá lệ luật cấu hình lúc xếp = **chỉ Quản trị, Toàn quyền**, ô `trip.override`.
- ADR-0040 D1: ô quản lý xe (giấy tờ xe) = Quản trị + Toàn quyền; "gia hạn = thêm dòng mới".
- Phần II quy tắc 4: view công bố không mang con số → "số chỗ tối thiểu" **không** vào view.

---

## Quyết định

### VK3-A. Cam kết xe riêng / cỡ xe tối thiểu trên chặng (ý 2; thừa kế [REF] `Commitment`)

**Dữ liệu** — thêm cột vào `ord_transfer_leg` (module `orders`; migration riêng chỉ `ADD COLUMN`; không sửa `0034`):

| Cột | Kiểu, ràng buộc | Nghĩa |
|---|---|---|
| `exclusive_vehicle` | INTEGER NOT NULL DEFAULT 0, `CHECK IN (0,1)` | **xe riêng**: chuyến chở chặng này không chở khách của **đơn khác** |
| `min_vehicle_seats` | INTEGER NULL, `CHECK (NULL OR BETWEEN 1 AND 100)` | **xe tối thiểu N chỗ** — cùng nghĩa `vc_vehicle.passenger_capacity` (số người được chở, **không kể tài xế**) |

- **Ai ghi:** như mọi trường vận hành của chặng — `order.modify` (nháp), `order.trip.edit` (sau xác nhận). Không ô mới.
- **Nhật ký:** `order_leg_updated` trước→sau: "xe riêng: không → có", "xe tối thiểu: — → 15 chỗ".
- **Mốc 6 giờ:** không kiểm khi sửa hai cột này (ĐP2(iv) chỉ nói ngày, giờ, nơi). Bật "xe riêng" sau khi đã xếp → chuyến bị **giữ** ở cổng (dưới), người xếp phải xếp lại.
  - Nếu đã trong 6 giờ, xếp lại là đổi "ai đi xe nào" → cần Quản trị phá lệ mốc (luật có sẵn).
- **Mặc định:** 0 / trống. Khi [TK] D10 (mẫu chặng theo dịch vụ) được duyệt, mẫu có thể điền sẵn hai ô theo mã dịch vụ ("Đưa đón sân bay xe riêng 7 chỗ"). **Không** làm ở đây.

**Luật** (một hàm thuần ở `src/shared/`, gọi từ `kiemXep`, `kiemTaoSuaChuyen` khi đổi xe, và `kiemXuatBen` — một nguồn; tên đề xuất `kiemCamKet`):
- **R-XR (xe riêng):**
  - trên một chuyến, nếu có suất khách đang mở của một chặng `exclusive_vehicle = 1` thuộc đơn A, thì **mọi** suất khách đang mở khác phải thuộc đơn A;
  - suất người đi kèm (HDV, phụ xe) không tính.
- **R-CX (cỡ xe):** `passenger_capacity` của xe ≥ `min_vehicle_seats` lớn nhất trong các chặng có suất khách đang mở trên chuyến.
- **Kích hoạt:**
  - xếp (mở suất), dời đến: xét chuyến sau lệnh;
  - đổi xe: xét R-CX;
  - xuất bến: xét cả hai — bắt trường hợp bật cam kết **sau** khi đã xếp.
- **Kết quả khi vi phạm** — theo câu hỏi **Q-L3-1**. Khuyến nghị (a): **cần phá lệ**, khuôn khoảng nghỉ (CH-02):
  - lệnh xếp / đổi xe trả 409 "cần Quản trị phá lệ";
  - Quản trị / Toàn quyền gửi phá lệ kèm lý do nhóm `PHA_LE` (ô `trip.override` có sẵn; mã luật mới `CAM_KET` thêm vào `MA_LUAT_PHA_LE` — `src/shared/dieu-phoi-kieu.ts:54@fd78247`);
  - phá lệ ghi vào cột mới trên chuyến `commitment_override_reason_code` (FK `vc_reason`), khuôn `rest_override_reason_code` ([0049]:82). Cổng xuất bến thấy cột này thì không giữ vì cam kết;
  - lệnh xếp sau đó tạo vi phạm **mới** (thêm đơn khác vào chuyến đã phá lệ) phải phá lệ lại. Cách nhận biết "vi phạm mới" (vd so danh sách đơn lúc phá lệ) do kế hoạch chốt; người kiểm soi.
- **Lớp giữ** (với (a)): luật **phá lệ được** là luật cấu hình, không phải bất biến → **máy chủ** + **câu kiểm định kỳ** `warn` ("chuyến đang chạy / đã chạy vi phạm cam kết mà không có phá lệ"). **Không** trigger. Trigger không biết đã có người phá lệ — cùng lý do [TK] để khoảng nghỉ ở máy chủ. **Không** lệch 5.1.
  - Nếu chủ chọn (c) "chặn cứng": R-XR thành bất biến → trigger đọc cờ mới `is_exclusive` trên view `v_ord_leg_key` (**đổi hợp đồng view của ADR-0047** — thêm vào "Câu ADR bị thay"); R-CX là con số, không vào view được → **lệch 5.1 hẹp** (khuôn L-B2 của ADR-0049), cần chủ duyệt riêng.
- **Hàm hẹp của `orders`** trả thêm hai khoá `xeRieng`, `choToiThieu`: `lichChungChang` ([0049]:72) và `hanhKhachChoChuyen` ([0047]:138). Không tiền, không tên. Nơi gọi vẫn đứng sau `can()` (bài `CONG_BO` có sẵn).
- **Hiện:**
  - form đơn: hai ô trên mỗi chặng;
  - lịch chung: nhãn "XE RIÊNG", "≥ 15 chỗ" trên chặng;
  - hộp xếp: lý do chặn bằng lời.
  - DTO tài xế: không cần (tài xế không tự nhận khách).

**Câu hỏi "hạng xe"** — theo **Q-L3-2**. Khuyến nghị (a) chỉ **số chỗ tối thiểu**. Danh mục "loại xe" (Limousine, ghế da…) là việc "để sau" đã ghi (`docs/superpowers/specs/2026-09-27-van-chuyen-design.md:180`); cần thêm cột loại trên xe + danh mục mới.

### VK3-B. Mỗi xe, mỗi loại giấy tờ: tối đa một dòng hiện hành (bịt LH-04)

- **Luật:** với một xe và một loại giấy tờ, tối đa **một** dòng hiện hành — chưa huỷ, không có dòng gia hạn chưa huỷ. Cùng định nghĩa `HIEN_HANH` ở `src/modules/van-chuyen/repository.ts:90`. Muốn thay: **Gia hạn** (dòng mới nối dòng cũ) hoặc **Sửa sai** / **Huỷ dòng**.
- **[Máy chủ]:**
  - `POST /api/van-chuyen/xe/:id/giay-to` với loại đã có dòng hiện hành → **409** `document_type_exists` "Xe đã có <loại> đang dùng — bấm Gia hạn hoặc Sửa sai";
  - lớp route và lớp CSDL trả **mã khác nhau** (khuôn R15 của ADR-0040).
- **[CSDL]:** trigger `BEFORE INSERT ON vc_vehicle_document WHEN NEW.previous_id IS NULL AND EXISTS (<dòng hiện hành cùng xe, cùng loại>)` → `RAISE`. Bảng của chính module (5.3).
- **Giao diện:** form "Thêm giấy tờ" ẩn loại đã có dòng hiện hành, hiện gợi ý "Gia hạn" (`web/giay-to-ui.ts:72`).
- **Dữ liệu cũ:** trigger chỉ canh dòng **mới**; dòng song song đã có (số đếm từ K-01) giữ nguyên tới khi Quản trị huỷ dòng nhập nhầm bằng "Sửa sai → Huỷ dòng" (có sẵn). Migration **không** tự sửa dữ liệu.
- **Không áp** cho giấy tờ của người: một người có nhiều bằng lái khác hạng là hợp lệ.
- **Ngoại lệ sau này:** nếu một loại thật sự cần nhiều dòng (vd nhiều hợp đồng bảo hiểm tự nguyện), thêm cột "cho nhiều dòng" vào danh mục loại bằng migration chỉ-thêm. Không làm bây giờ.
- **Quyền:** không đổi — `vehicle.manage` (Quản trị, Toàn quyền).

---

## Câu ADR bị thay (nguyên văn → mới)

| ADR / tài liệu | Nguyên văn | Mới |
|---|---|---|
| ADR-0047 A1, bảng cột `ord_transfer_leg` ([0047]:58-60) | (không có cam kết) | thêm `exclusive_vehicle` (0/1, mặc định 0), `min_vehicle_seats` (NULL hoặc 1–100) |
| ADR-0047 A3, `hanhKhachChoChuyen` ([0047]:138) | "… nơi đón, nơi trả (chữ tự do che dãy số), số người, và từng người …" | "… số người, **cờ xe riêng, số chỗ tối thiểu**, và từng người …" |
| ADR-0049 D1, `lichChungChang` ([0049]:72) | "Chỉ gồm: …, số người, số người đã có tên, cờ đặt gấp." | "…, cờ đặt gấp, **cờ xe riêng, số chỗ tối thiểu** (ADR-00xx VK3-A)." |
| ADR-0049 D2, cổng xuất bến ([0049]:173-179) | danh sách kiểm | thêm: "cam kết xe riêng / cỡ xe của mọi chặng trên chuyến được giữ, **hoặc** chuyến đã có phá lệ cam kết" |
| ADR-0049 D3, ô `trip.override` ([0049]:200) | "phá lệ mốc lúc xếp, khoảng nghỉ" | "phá lệ mốc lúc xếp, khoảng nghỉ, **cam kết xe riêng / cỡ xe** (ADR-00xx VK3-A)" — cùng cột quyền, không đổi ai giữ ô |
| ADR-0049 D1, bảng `vc_trip` ([0049]:82) | "…, `rest_minutes_snapshot`, `rest_override_reason_code`, …" | thêm `commitment_override_reason_code` (chỉ khi Q-L3-1 = (a)) |
| [TK]:166 (thiết kế, không phải ADR) | "chuyến có thể chở chặng chiều đi của đơn này và chặng chiều về của đơn khác nếu cùng lúc — máy không cấm" | "… máy không cấm, **trừ khi một chặng trên chuyến mang cam kết xe riêng**" |
| ADR-0040 D1, giấy tờ xe ([0040]:33-35) | "**gia hạn = thêm dòng mới, không sửa đè**. Sửa sai phải có lý do …" | "… ; **mỗi xe, mỗi loại tối đa một dòng hiện hành** — thay bằng Gia hạn, không thêm chuỗi song song (ADR-00xx VK3-B)." |
| ADR-0047 A3, view `v_ord_leg_key` ([0047]:143) | "`v_ord_leg_key(id, order_id, order_service_id, is_open)`" | **không đổi** với (a) / (b); chỉ khi Q-L3-1 = (c): thêm cờ `is_exclusive` |

---

## Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Loại | Đổi gì |
|---|---|---|
| `ord_transfer_leg` | chặng (một loại) | + 2 cột cam kết; **không** thêm loại dòng. Chặng nay mang cả "lời hứa về xe" (vẫn không mang tiền) |
| `vc_trip` | chuyến | + `commitment_override_reason_code` (nếu (a)) |
| `vc_reason` | lý do | không thêm nhóm (dùng `PHA_LE` có sẵn) |
| `vc_vehicle_document` | giấy tờ xe | không cột mới; + trigger "một dòng hiện hành mỗi loại" |
| `audit_log` | nhật ký | `order_leg_updated` có thêm trường; sự kiện phá lệ có mã luật `CAM_KET` |

**(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào** — **không ô mới**:

| Ô (có sẵn) | Chạm | Áp cho |
|---|---|---|
| `order.modify`, `order.trip.edit` | 2 cột cam kết của chặng | như mọi trường vận hành của chặng; không đổi nghĩa ô |
| `trip.dispatch` | bị R-XR, R-CX chặn khi xếp / đổi xe | Bán hàng, Quản trị, Toàn quyền |
| `trip.override` | phá lệ cam kết; `vc_trip.commitment_override_reason_code` | chỉ Quản trị, Toàn quyền (ĐP3) |
| `trip.view` | đọc nhãn cam kết trên lịch chung | như ADR-0049 D3 |
| `vehicle.manage` | `vc_vehicle_document` (luật mới) | Quản trị, Toàn quyền |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Ô trong thân | Lớp CSDL |
|---|---|---|---|
| Ghi cam kết trên chặng | `orders` | `order.modify` / `order.trip.edit` | `CHECK` hai cột |
| Xếp, đổi xe, phá lệ cam kết | `office` | `trip.dispatch` / `trip.override` | — (luật phá lệ được — máy chủ + kiểm định kỳ); chỉ với (c) mới có trigger |
| Cổng xuất bến | — | `kiemXuatBen` (một hàm) + `kiemCamKet` | LC-05 (có sẵn) |
| Thêm giấy tờ xe | `office` | `vehicle.manage` | trigger "một dòng hiện hành" |
| Hợp đồng giữa các phần | — | `lichChungChang`, `hanhKhachChoChuyen` thêm 2 khoá; không tự kiểm quyền (bài `CONG_BO`) | — |

---

## Cửa một chiều / hai chiều

- **Một chiều:** hai cột cam kết (tên, kiểu); mỗi lời hứa đã ghi trên đơn đã xác nhận.
- **Hai chiều:**
  - chặn / phá lệ / cảnh báo (mã);
  - cột phá lệ trên chuyến (để trống được);
  - trigger một dòng hiện hành (bỏ bằng migration mới);
  - nhãn hiển thị.

## Hệ quả

- **Việc lớn** (dữ liệu đơn + luật xếp xe + chặn ghi giấy tờ) ⇒ **người kiểm độc lập**.
- **Hàng rào mới**, mỗi cái một dòng `docs/SO-HANG-RAO.md` + ngày thấy chặn thật:
  - bài `kiemCamKet` (ghép vào xe riêng; xếp vào xe nhỏ; bật cam kết sau khi xếp → giữ ở cổng; phá lệ → qua; mỗi ca P16);
  - bài Bán hàng gửi phá lệ cam kết → 403;
  - câu kiểm định kỳ `warn` "chuyến vi phạm cam kết không phá lệ";
  - trigger "một dòng hiện hành" (thêm dòng song song → `RAISE`; bỏ trigger → đỏ);
  - bài route 409 `document_type_exists`;
  - bài liệt kê khoá của hai hàm hẹp (có cam kết, không tiền, không tên).
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Việc của chủ, ngoài app:** hỏi người chuyên môn (luật sư hoặc cơ quan quản lý vận tải ở địa phương) câu ghép khách xe hợp đồng, trước khi chạy chuyến ghép nhiều đơn thật.
- **Thứ tự:**
  1. chủ duyệt;
  2. VK3-B làm được ngay trên `main` (không phụ thuộc ADR-0049), sau khi đếm K-01;
  3. VK3-A sau lát 1.5 của ADR-0049 (kiểm xếp chạy thật);
  4. chủ vẽ hai ô trên form đơn + nhãn trên lịch chung;
  5. người kiểm độc lập;
  6. phát hành.

## Phương án bị loại

- **Cam kết dạng JSON "mức dịch vụ"** ([REF]:129): trái Hiến chương 5.2.
- **Cam kết đặt ở danh mục dịch vụ, không ở chặng:** danh mục đồng bộ từ Google Sheet, và một đơn có thể hứa khác danh mục (khách trả thêm). Để [TK] D10 dùng danh mục làm **mặc định** thì hợp hơn.
- **Tính tiền theo cam kết** (xe riêng giá cao hơn): trái ADR-0047 A1 "chặng không mang tiền"; giá theo mã dịch vụ.
- **Tự động tách chuyến khi xếp vi phạm:** máy tự sửa kế hoạch là tác nhân tự động (5.11), người xếp mất quyền quyết.
- **Giấy tờ xe: chỉ cảnh báo, không chặn** (VK3-B): là phương án (b) của Q-L3-3 — K-01 đã làm phần cảnh báo.

## Câu hỏi cho chủ (lời thường — trả lời một lần cho cả ba)

**Q-L3-1 — Người xếp xe ghép khách đơn khác vào chặng "xe riêng", hoặc xếp vào xe nhỏ hơn số chỗ đã hứa. Máy làm gì?**
- **(a) Chặn; Quản trị / Toàn quyền phá lệ kèm lý do (Khuyến nghị):** như khoảng nghỉ. Xe hỏng, khách đồng ý đi chung thì vẫn chạy được, có ghi ai cho phép.
- **(b) Chỉ cảnh báo:** vẫn cho xếp, hiện đỏ trên bảng.
- **(c) Chặn cứng, không ai phá lệ.**

**Q-L3-2 — "Hạng xe hứa với khách" nghĩa là gì?**
- **(a) Chỉ số chỗ tối thiểu (Khuyến nghị):** vd "xe từ 15 chỗ". Làm được ngay.
- **(b) Thêm danh mục "loại xe"** (Limousine, ghế da, thường…): mỗi xe khai loại, chặng hứa loại. Thêm một danh mục và một cột trên xe.

**Q-L3-3 — Xe đã có "Kiểm định" đang dùng, người nhập lại bấm "Thêm Kiểm định" (thay vì Gia hạn). Máy làm gì?**
- **(a) Không cho thêm, bảo "dùng Gia hạn" (Khuyến nghị).** Dòng song song đã có thì Quản trị huỷ dòng nhập nhầm.
- **(b) Cho thêm, chỉ cảnh báo** (câu kiểm định kỳ đã giao làm).

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- **G-1:** tên cột, tên hàm `kiemCamKet`, mã luật `CAM_KET`, mã lỗi `document_type_exists` — kế hoạch chốt.
- **G-2:** suất người đi kèm không phạm R-XR.
- **G-3:** R-CX so với số chỗ **không kể tài xế**, cùng nghĩa hồ sơ xe.

## Chưa kiểm

- **Pháp lý ghép khách xe hợp đồng:** **chưa có người chuyên môn kiểm**.
- Nhu cầu thật: bao nhiêu đơn mua xe riêng / xe cỡ lớn.
- Số dòng giấy tờ xe song song trên production (chờ K-01).
- Tệp đề xuất chưa có người kiểm độc lập.
