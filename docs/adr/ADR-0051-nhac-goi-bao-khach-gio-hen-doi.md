# ADR-0051 — Bảng điều phối lượt 1, bổ sung: nhắc "gọi báo khách" khi giờ hẹn đổi sau khi xếp xe, và dấu "Đã gọi báo"

- **Trạng thái:** **accepted**. Chủ dự án trả lời trực tiếp phiên điều phối, chat 2026-09-29 tối: Q-GB-1 **"Không, sửa giờ trên đơn"**, Q-GB-2 **"Có nút "Bỏ đánh dấu""**, Q-GB-3 **"Hiện ngay hôm nay"** (cả ba là phương án khuyến nghị); câu duyệt "Duyệt ghi phần "Đã gọi báo" thành quyết định chính thức (ADR-0051) theo 3 câu trên? Gồm: một bảng ghi "giờ hẹn đã biết / đã gọi"; người bấm được là Bán hàng (đơn mình lập hoặc phụ trách), Quản trị, Toàn quyền — giống quyền sửa chuyến đi của đơn; tài xế không thấy; nhật ký không ghi số điện thoại hay tên khách. (Tôi chỉ ghi sau khi người kiểm xem bản cuối và báo đạt.)" → **"Duyệt, ghi theo 3 câu"** (nguyên văn: [HĐ] "Trả lời lần 14"). Trước đó, "Trả lời lần 12" câu 2: **"Làm ngay lượt này"**. Điều kiện đã nêu với chủ: người kiểm độc lập xem bản cuối → **ĐẠT** (bản đề xuất đỉnh `360f1ce`). AI ghi lại (vai điều phối), không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung phải bằng ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0052** (duyệt 2026-09-30): tin khi giờ hẹn đổi (phần hẹn "lượt 2 D6") — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0052.
- **Ngày:** 2026-09-29.
- **Nguồn:**
  - bản đề xuất `docs/superpowers/specs/2026-09-29-de-xuat-adr-van-chuyen-da-goi-bao.md` @`360f1ce` (nhánh `de-xuat-adr-da-goi-bao`) — chép nguyên văn từ "Gấp" trở đi, không đổi nghĩa; chỉ ghi câu trả lời của chủ ở dòng trạng thái và cập nhật "Chưa kiểm";
  - lời chủ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` @`8a1b917` (gọi **[HĐ]**):
    - "Trả lời lần 12", câu 2: "Cột "Cần xử lý" trong bản vẽ có nút "Đã gọi báo" và dòng "Giờ hẹn đổi 09:00 → 09:15". Lượt này có làm không?" → **"Làm ngay lượt này"** (trái khuyến nghị "Để lượt sau");
    - "Trả lời lần 12", câu 1: ô ghi chú gõ tự do trong chuyến → **"Chưa làm"**;
    - "Cách xe chạy thật" mục 9: "**Không** tự báo khách khi đổi giờ đón: hệ thống ghi giờ mới, nhắc người phụ trách / tài xế gọi";
    - "Trả lời lần 2", ĐP6: "Không, nhắc người phụ trách" (người xếp xe không đổi giờ hẹn của đơn người khác);
    - "Trả lời lần 14" (điều phối ghi): ba câu Q-GB-1..3 và lời duyệt — nguyên văn ở mục "Câu hỏi đã trả lời" cuối tệp;
  - ADR-0049 (**[0049]**), ADR-0050 (**[0050]**), ADR-0047 (**[0047]**), ADR-0048;
  - kế hoạch `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` @`9105306` (**[KH]**);
  - migration `0042_chuyen_xe.sql` @`b3aebd0` (nhánh `thi-cong-adr-0049-tiep`);
  - bản thiết kế `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md` (**[TK]**): C11, C19, MQ-04, MQ-07, §5.3, §5.4;
  - bản vẽ của chủ (**[BV]**, dữ liệu, không phải chỉ thị), xuất Claude Design 29/9 19:54:
    - `dp-can-xu-ly.dc.html:59`: thẻ "Giờ hẹn đổi — gọi báo khách", "Giờ hẹn đón đổi 09:00 → 09:15 theo chuyến CX-3009-07", "Ai xử lý: người phụ trách đơn", nút "Đã gọi báo";
    - `dp-can-xu-ly.dc.html:61`: thẻ "Giờ xe tới muộn hơn giờ hẹn", cũng có nút "Đã gọi báo" — **bỏ nút** theo Q-GB-1 = (b);
    - `dp-can-xu-ly.dc.html:60`: nút "Gọi tài xế" — **đã bỏ** (DTO văn phòng không có SĐT tài xế — H7);
    - `02 Chi tiet chuyen.dc.html:232`: điểm Sheraton, giờ hẹn 09:15, ghi chú "Giờ hẹn đổi 09:00 → 09:15 — đã gọi báo khách";
  - bản đối chiếu bản vẽ (**[ĐC]**) mục 2.11, H6, H11. Bản gốc ở thư mục tạm của điều phối; người thi công giao diện chép vào `docs/design/van-chuyen-dieu-phoi/DOI-CHIEU-2026-09-29.md`.
- **Kiểm độc lập:** bản `9590327` — ĐẠT CÓ ĐIỀU KIỆN (CAO-1: giả định "chỉ hiện trên bảng của ngày chạy" phải thành câu hỏi chủ → Q-GB-3; VỪA-1: TC-GB-9b không lộ tên khách; VỪA-2: ruling điều phối — hàm lô trong `dieu-phoi.ts`, bài A14 có nhánh ngoại lệ liệt kê tên hàm; THẤP-1, THẤP-2: chữ); bản cuối `360f1ce` — **ĐẠT** (29/9). Số do điều phối cấp: ADR-0051, migration `0043`, kiểm định kỳ R-VC-17, R-VC-18.
- **Gấp:** bảng mới có trigger trên `vc_trip_allocation` (bảng của `0042`). Vì vậy `0043` **phải lên production cùng lần phát hành với `0042`** (ADR-0049 lượt 1). Xem GB1 "Migration".
- **Loại:**
  - **một chiều:**
    - tiền tố, chủ bảng `vc_leg_appt_ack` và tập đóng `kind` trong `CHECK`;
    - định nghĩa "giờ đã biết" (mốc chụp lúc chặng **lần đầu** lên xe);
    - mỗi dòng đã ghi: chứng cứ "ai đã báo khách giờ nào, lúc nào", chỉ-thêm;
  - **hai chiều:** ô quyền mới; hiển thị, nhãn; phạm vi ngày của danh sách nhắc (hằng trong mã); câu kiểm định kỳ.
- **Hiến chương áp** (`docs/ARCHITECTURE.md` Phần I, đã duyệt): 1.2, 1.4, 2.2, K4, K12, 4.1, 5.1, 5.3, 5.5, 5.6, 5.8, 5.11, 5.12, 5.13.
- **Liên quan:**
  - ADR-0049 D1 (bảng, lịch chung, thứ tự lô, LC-04, LC-15), D3 (ô, route, DTO);
  - ADR-0050 "Phương án bị loại" (dòng về số phiên bản chặng);
  - ADR-0047 A1, A3 (chặng sửa tại chỗ; hàm hẹp `hanhKhachChoChuyen`);
  - ADR-0048: không đổi (`DRIVER_PARTNER` không có ô mới).
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 29/9 @`9105306`). Không dùng ô hoãn nào.
- **Xây trên nền chưa có (Hiến chương 5.13):**
  - ADR-0049 đã duyệt, **đang thi công**. Nhánh `thi-cong-adr-0049-tiep` đã commit A1–A11 (+ R-P15, R-P18) và **A12**: `0042_chuyen_xe.sql` ở `b3aebd0` (29/9 20:50), **chưa gộp `main`**, chưa áp remote.
  - Kiểm 29/9: `git log --all --oneline -- 'migrations/0042*'` chỉ ra `b3aebd0`. `git log --all -- 'migrations/004*'` và `find` mọi worktree: không nơi nào có số ≥ 0043.
  - Theo R-P19 (chủ chốt 29/9, "Trả lời lần 13" — dẫn theo commit `b3aebd0`): bảng `vc_` **không** khoá ngoại sang `ord_*`; toàn vẹn giữ bằng trigger đọc view, sổ dữ liệu ghi "tham chiếu logic".
  - Đề xuất này cần bảng suất (`0042`), route xếp và bài thứ tự lô (A13, A14). Task của nó chạy **sau** A12–A14.
- **Migration:** `0043_…` — **điều phối đã cấp**. Điều phối cập nhật mục "Số migration đã giữ chỗ" ở `docs/adr/README.md`. Trước khi tạo tệp: quét lại mọi nhánh, worktree (`CLAUDE.md` §10).

---

## Tóm tắt cho chủ (lời thường)

1. **Khi khách đã được xếp xe mà giờ hẹn đón (hoặc ngày đón) trên đơn bị sửa**, cột "Cần xử lý" hiện: "Giờ hẹn đổi — gọi báo khách · TD-… · Giờ hẹn đón đổi 09:00 → 09:15 · CX-3009-07".
   - Hiện **mọi lần đổi**, kể cả khi giờ mới vẫn nằm trong khung giờ của chuyến (như ví dụ trong bản vẽ).
   - Hiện **ngay hôm nay** cho mọi chuyến trong 14 ngày tới, ở bất kỳ ngày nào bạn đang xem trên bảng (bạn chọn "Hiện ngay hôm nay").
2. **Người lập đơn, người phụ trách đơn, Quản trị, Toàn quyền** gọi khách xong thì bấm **"Đã gọi báo"**.
   - Máy ghi ai bấm, lúc nào, báo giờ nào. Mục biến mất.
   - Màn chi tiết chuyến ghi "đã gọi báo khách (Lan, 07:52)".
   - Bán hàng khác và Kế toán **thấy** mục nhưng **không có nút**.
   - Bấm nhầm thì bấm **"Bỏ đánh dấu"**: mục hiện lại, nhật ký ghi cả hai lần (bạn chọn có nút này).
3. **Đổi giờ lần nữa** thì mục hiện lại, lần này "09:15 → 09:30". **Đổi về đúng giờ cũ** trước khi kịp gọi thì mục tự hết.
4. **Mục tự hết** khi: khách đã lên xe; chuyến kết thúc hoặc bị huỷ; chặng bị rút khỏi xe; đơn bị huỷ (lúc đó bảng báo "đơn đã huỷ" như đã có).
5. **Thẻ "Giờ xe tới muộn hơn giờ hẹn"** giữ nguyên, **không** có nút "Đã gọi báo" (bạn chọn "sửa giờ trên đơn"). Người phụ trách gọi khách rồi sửa giờ hẹn trên đơn; lúc đó thẻ "Giờ hẹn đổi" hiện ra và bấm "Đã gọi báo" ở đó.
6. **Không đổi:**
   - máy **không** tự gọi hay nhắn khách;
   - tài xế **không** thấy mục này, nhưng vẫn thấy giờ hẹn mới trên màn của mình;
   - **không** có ô ghi chú gõ tự do;
   - không đổi gì ở phần đơn hàng: máy tự nhớ "giờ đã biết" ở phần Vận chuyển.

---

## Bối cảnh

**Lời chủ.** Chủ chọn "Làm ngay lượt này" (lần 12) cho nút "Đã gọi báo" và dòng "Giờ hẹn đổi 09:00 → 09:15" của bản vẽ. Chủ đã được báo trước: việc này thêm dữ liệu "đã gọi" và "giờ hẹn cũ", lượt 1 dài thêm, có thể cần quyết định bổ sung. Đây là dữ liệu mới ngoài ADR-0049, nên cần ADR riêng.

**Vì sao cảnh báo có sẵn không đủ.**
- Lượt 1 hôm nay chỉ nhận ra "giờ hẹn đổi sau khi xếp" khi giờ mới **nằm ngoài** khung giờ chuyến (`GIO_HEN_NGOAI_CHUYEN`, `src/shared/dieu-phoi-lich-chung.ts:106-113@9105306`).
- Ví dụ của bản vẽ: 09:00 → 09:15 trên chuyến 09:00–10:45 ([BV] `02 Chi tiet chuyen.dc.html` khối "GIỜ 09:00–10:45"). Giờ mới nằm **trong** khung, nên cảnh báo cũ **không** báo.
- Vậy chủ muốn báo **mọi** lần đổi giờ của khách đã xếp.
- Hai việc khác nhau, người xử lý cũng khác:
  - `GIO_HEN_NGOAI_CHUYEN`: người **xếp xe** phải dời khách sang chuyến khác;
  - việc mới: người **phụ trách đơn** phải gọi khách.

**Vì sao cần dữ liệu mới: máy không biết "giờ cũ".**
- Sau khi đơn xác nhận, chặng được **sửa tại chỗ** (`UPDATE ord_transfer_leg …`, `src/modules/orders/chang-hanh-khach-repo.ts:172,181@9105306`; [0047] A1). Lịch sử giờ hẹn chỉ còn trong **chữ** của nhật ký `order_leg_updated`.
- `van-chuyen` là module nghiêm, **không đọc `audit_log`**. ADR-0049 đã loại đường này ("Phương án bị loại": cổng lô bằng `EXISTS(audit_log)`).
- Không có view công bố nào của `orders` mang giờ hẹn: Phần II quy tắc 4 chỉ cho khoá + nhãn + cờ.
- Vậy "giờ cũ" chỉ có thể là một **bản chụp** do chính `van-chuyen` ghi: "giờ hẹn đã biết" của chặng. Lúc đọc, máy so bản chụp đó với giờ hẹn hiện hành. Giờ hiện hành đọc qua hàm hẹp **có sẵn** của `orders`.

**Không làm lại phương án ADR-0050 đã loại.**
- [0050]:355 đã loại "số phiên bản trên chặng + suất nhớ phiên bản đã xếp" vì:
  - (a) phải thêm cột ở `ord_transfer_leg` và `vc_trip_allocation`;
  - (b) "giờ đã có `GIO_HEN_NGOAI_CHUYEN` + cảnh báo giờ xe tới (K-02)".
- Đề xuất này **giữ** vế (a): không thêm cột nào ở `ord_*` hay `vc_trip_allocation`; bảng của `orders` không đổi.
- Vế (b) **không còn đủ** sau lời chủ lần 12. Ghi ở "Câu ADR bị thay".

**Ý đã có sẵn trong thiết kế nhưng đổi cơ chế.** [TK] MQ-07 ("Nhắc gọi khách khi giờ hẹn đổi", [TK]:398) và §5.4(a) bước 2 ([TK]:759) định nghĩa việc nhắc gọi khách:
- kích hoạt bởi nhật ký `order_leg_updated`;
- "không ghi gì ở `vc_`".

Đề xuất này thay cơ chế đó bằng "so bản chụp lúc đọc". Lý do: module nghiêm không đọc được nhật ký. Phần **thông báo** của MQ-07 (tin đẩy tới người phụ trách và tài xế) vẫn thuộc lượt 2 D6, **không** làm ở đây.

**Chủ đã quyết, áp dụng không hỏi lại:**
- [HĐ] "Cách xe chạy thật" mục 9 và [TK] C11, LC-17: máy **không** liên lạc khách, chỉ nhắc người gọi.
- ĐP6 / C19: "đơn của ai người đó lo"; người xếp xe không đổi giờ hẹn của đơn người khác.
- Lần 12 câu 1: **không** ô chữ tự do → lệnh "Đã gọi báo" không nhận chữ nào (khớp [KH] I18: "lệnh `vc_` chỉ nhận mã").
- Lần 12, về "Gọi tài xế": **bỏ** ([ĐC] H7).
- Lần 14: Q-GB-1 = (b), Q-GB-2 = (a), Q-GB-3 = (a) — xem "Câu hỏi đã trả lời".

---

## Quyết định

Hai quyết định chạm dữ liệu / quyền: **GB1**, **GB2**.
- Q-GB-1 = (b) nên **không** có quyết định thứ ba (bảng "đã báo khách giờ xe tới" của phụ lục A cũ bị bỏ).
- Q-GB-3 = (a) **không** thêm quyết định dữ liệu / quyền: không bảng, không ô mới; chỉ một route đọc và một DTO (hình chiếu).
- Tổng **2** — dưới trần 3 của `CLAUDE.md` §9.

### GB1. Mốc "giờ hẹn đã biết" của chặng; mục "Giờ hẹn đổi — gọi báo khách"; lệnh "Đã gọi báo" và "Bỏ đánh dấu"

**Phân loại (Hiến chương 2.2).** "Mốc giờ hẹn đã biết" là **dòng ghi nhận chỉ-thêm** của module `van-chuyen`. Mỗi dòng trả lời: "từ lúc này, giờ hẹn mà bên xe coi là khách đã biết là X, do ai, vì sao". Loại dòng là **tập đóng** trong `CHECK`, vì mã rẽ nhánh theo nó (phép thử của 2.2).

**Bảng mới `vc_leg_appt_ack`** (module `van-chuyen`, tiền tố `vc_`, migration `0043`; tên đề xuất, kế hoạch chốt **trước** khi viết migration):

| Cột | Kiểu, ràng buộc | Nghĩa |
|---|---|---|
| `id` | TEXT PK | dòng `DA_GOI` / `BO_DANH_DAU`: **= `audit_log.id`** của lệnh (nối một-một, **không** khoá ngoại — khuôn 0021, như `vc_trip_event`); dòng `XEP`: id riêng |
| `leg_id` | TEXT NOT NULL, **không** khoá ngoại — "tham chiếu logic" tới `ord_transfer_leg(id)` | chặng. Cùng cách `vc_trip_allocation.leg_id` của `0042` (`b3aebd0`, R-P19). Chặng luôn hợp lệ: dòng `XEP` chỉ sinh trong lô mở suất (đã qua LC-09 đọc `v_ord_leg_key`); dòng khác đòi có suất mở (trigger `…_active`). Bài siết "tham chiếu logic không có khoá ngoại" của `b3aebd0` phủ cả cột này |
| `seq` | INTEGER NOT NULL `CHECK (seq >= 1)`; **`UNIQUE (leg_id, seq)`** | số thứ tự trong chuỗi mốc của chặng — cũng là "phiên bản" mà màn gửi lại |
| `kind` | TEXT NOT NULL `CHECK (kind IN ('XEP','DA_GOI','BO_DANH_DAU'))` — **định trọn** | `XEP`: máy chụp lúc chặng **lần đầu** lên xe; `DA_GOI`: người bấm "Đã gọi báo"; `BO_DANH_DAU`: dòng đảo của một `DA_GOI` (Hiến chương 5.5; chủ chọn Q-GB-2 = (a)) |
| `appt_date` | TEXT NOT NULL, `CHECK (date(appt_date) IS appt_date)` | ngày hẹn "đã biết" **sau** dòng này (ngày dân sự VN) |
| `appt_time` | TEXT NULL, khuôn `HH:MM` như `ord_transfer_leg.pickup_time` (0034) | giờ hẹn "đã biết"; NULL = "chưa chốt giờ" |
| `prev_appt_date`, `prev_appt_time` | cùng khuôn; NULL ở dòng `XEP` | giờ "đã biết" **trước** dòng này. Chụp lại để mỗi dòng tự đọc được "A → B" (5.6), không phải dò dòng trước |
| `request_id` | TEXT NULL **UNIQUE**, `CHECK (request_id IS NULL OR length(request_id) = 36)` | mã yêu cầu do màn sinh mỗi lần bấm (khuôn LC-11). NULL ở `XEP` |
| `created_at`, `created_by`, `updated_at`, `updated_by` | dấu vết (bài ADR-0003; [KH] I8) | `created_by` của `XEP` = người xếp xe; của `DA_GOI` / `BO_DANH_DAU` = người bấm |

`CHECK` mức bảng:
- `(seq = 1) = (kind = 'XEP')`;
- `(kind = 'XEP') = (request_id IS NULL)`;
- `(kind = 'XEP') = (prev_appt_date IS NULL)`;
- `kind = 'XEP' OR NOT (appt_date IS prev_appt_date AND appt_time IS prev_appt_time)`: dòng người bấm luôn là một **thay đổi**.

**Trigger** (thân trigger chỉ đọc bảng `vc_` — Hiến chương 5.3; thông báo lỗi bắt đầu `gb_`, máy chủ đổi thành 409 qua `loiRangBuocChuyen`):

| Tên (đề xuất) | Khi nào chặn |
|---|---|
| `vc_leg_appt_ack_no_update`, `vc_leg_appt_ack_no_delete` | mọi `UPDATE`, `DELETE` (chỉ-thêm — khuôn LC-04) |
| `vc_leg_appt_ack_chain` (`BEFORE INSERT`, `NEW.seq > 1`) | không có dòng `(leg_id, seq − 1)` có `appt_*` **IS** `NEW.prev_appt_*`. Với `BO_DANH_DAU`, thêm: dòng `seq − 1` phải là `DA_GOI` **và** `NEW.appt_*` **IS** `prev_appt_*` của dòng đó (khôi phục đúng giờ trước khi bấm) |
| `vc_leg_appt_ack_active` (`BEFORE INSERT`, `NEW.kind <> 'XEP'`) | chặng **không** có suất khách (`kind = 'PASSENGER'`) đang mở, trạng thái `WAITING`, trên chuyến `PLANNED` hoặc `RUNNING` |
| `vc_trip_allocation_needs_appt` (`BEFORE INSERT ON vc_trip_allocation`, `NEW.kind = 'PASSENGER'`) | chặng **chưa có** dòng mốc nào. Tức mọi lệnh mở suất khách lần đầu **phải** chụp mốc trong cùng lô. Canh cả lệnh lượt 2 (thêm khách lên xe đang chạy) khỏi quên |

**Mốc chụp lúc xếp (`XEP`)** — mốc cố định do ADR này quy định (Hiến chương 5.6):
- **Khi nào:** trong lô của **mọi** lệnh mở suất khách (lượt 1: route 5 "xếp"), khi chặng **chưa có** dòng nào trong bảng. Lô "dời" (`MOVED`), "cập nhật điểm theo đơn" (`STOP_CHANGED`), "chuyển điểm" của lượt 2 (`TRANSFERRED`) và "rút rồi xếp lại" **không** chụp lại: chặng đã có mốc.
  - **Vì sao "lần đầu" chứ không "mỗi lần mở suất":** đóng rồi mở suất (`STOP_CHANGED`, `MOVED`) mà chụp lại thì mốc mới = giờ hiện hành. Một lần đổi giờ **chưa gọi** sẽ bị nuốt mất (bẫy "tái mốc" — có bài TC-GB-4).
  - **Hệ quả có chủ ý:** chặng bị rút khỏi xe, đổi giờ lúc không nằm trên xe, rồi xếp lại → mục hiện ngay khi xếp lại ("A → B"). Nhắc thừa một lần, không bao giờ nhắc thiếu.
- **Giá trị:** `appt_date`, `appt_time` = ngày giờ hẹn của chặng mà máy chủ **đọc trong chính request đó** qua `lichChungChang` (route xếp đã đọc — [KH] I38).
  - Đơn bị sửa giữa lúc đọc và lúc ghi → mốc là giờ người xếp đã thấy → mục hiện ngay → đúng: giờ đã đổi sau khi họ xếp.
- **Câu SQL:** `INSERT INTO vc_leg_appt_ack (…) SELECT … WHERE NOT EXISTS (SELECT 1 FROM vc_leg_appt_ack WHERE leg_id = ?) AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ? AND last_cmd_id = ?)`.
  - Nhãn `GHI`; đứng **sau** câu cổng và nhật ký, **trước** câu mở suất (thứ tự lô [0049]:98–117).
  - **Không** dùng `INSERT OR IGNORE`: trong SQLite, `IGNORE` còn nuốt cả lỗi `CHECK` / `NOT NULL`, giấu lỗi.
  - `UNIQUE (leg_id, seq)` là lưới cuối nếu giả định "D1 chạy lô lần lượt" sai ([0049] "Chưa kiểm").
- Không có dòng nhật ký riêng. Dòng `trip_allocated` của cùng lô đã ghi việc xếp; bảng có `created_at/by`.

**Mục "Giờ hẹn đổi — gọi báo khách"** (tính **lúc đọc**, không lưu cột trạng thái — khuôn "giữ" của ADR-0049 D2):
- Một chặng L **có mục** khi đủ bốn điều:
  1. L có ít nhất một suất khách **mở**, trạng thái **`WAITING`**, trên chuyến **`PLANNED` hoặc `RUNNING`**;
  2. đơn chưa huỷ, chặng còn mở. Nếu không, `CHANG_GIU` / lý do giữ đã lo (I38); không có mục;
  3. L có mốc. Mốc hiện hành = dòng có `seq` lớn nhất;
  4. (ngày, giờ) hẹn **hiện hành** của L **khác** (`appt_date`, `appt_time`) của mốc. So bằng "IS": giờ NULL là một giá trị ("chưa chốt giờ").
- **Một mục mỗi chặng**, không phải mỗi suất. Chặng tách hai xe ("tách đoàn") → một mục kèm **mọi** mã chuyến ở điều 1. Một lần "Đã gọi báo" là đủ, vì một đơn một người liên hệ.
- Mục ghi: mã đơn; chiều; **cũ** = giờ của mốc; **mới** = giờ hiện hành (kèm ngày khi ngày khác; "chưa chốt giờ" khi NULL); mã chuyến và ngày chuyến; `phienBan` = `seq` của mốc.
- **Nhãn và loại:** mã loại `GIO_HEN_DOI`, nhãn "Giờ hẹn đổi — gọi báo khách", "Ai xử lý: người phụ trách đơn" — hằng ở `src/shared/goi-bao.ts` (một chỗ; màn không tự đặt chữ).
  - Mục **không** thuộc `canhBao[]` theo ngày của `GET /lich` (Q-GB-3 = (a): danh sách riêng — xem "Nơi hiện"). Vì vậy **không** thêm `GIO_HEN_DOI` vào `LOAI_CANH_BAO_LICH`, tránh một loại cảnh báo mà lịch theo ngày không bao giờ phát.
  - **Không** mở rộng `GIO_HEN_NGOAI_CHUYEN`: khác nghĩa, khác người xử lý. Hai thứ có thể cùng hiện cho một chặng (ví dụ đổi sang ngày khác).
  - Chú thích ở `dieu-phoi-lich-chung.ts:106` ("Giờ hẹn đổi sau khi xếp (MQ-04) — lượt 1 nhận ra khi giờ hẹn nằm NGOÀI khung") phải sửa: `GIO_HEN_NGOAI_CHUYEN` nay chỉ là "giờ hẹn ngoài khung chuyến"; "giờ hẹn đổi" là danh sách nhắc gọi khách của ADR-0051.
- **Mục tự hết** (không ai bấm) khi một trong bốn điều trên không còn đúng:
  - khách đã lên xe, vắng hoặc huỷ tại điểm — không còn suất `WAITING`;
  - chuyến kết thúc hoặc huỷ;
  - chặng bị rút hay dời khỏi mọi xe;
  - đơn huỷ, chặng đóng;
  - giờ hẹn được đổi **về đúng** giờ của mốc.
- **Luật thuần một nguồn** (`src/shared/goi-bao.ts` + `goi-bao.test.ts`; màn và máy chủ dùng chung):
  - `mocHienHanh(dong[])`;
  - `mucGioHenDoi({ chang, moc, suat, chuyen })` → danh sách mục;
  - `kiemDaGoiBao(…)`, `kiemBoDanhDau(…)` → `{ ok }` hoặc mã từ chối.
- **Đọc giờ hẹn hiện hành** — không thêm hàm hẹp, không thêm khoá vào hàm hẹp:
  - lô xếp: `lichChungChang` (đã đọc sẵn — I38);
  - danh sách nhắc, chi tiết chuyến, route "Đã gọi báo" / "Bỏ đánh dấu": đọc **theo id** bằng `hanhKhachChoChuyen(db, legIds)` (ADR-0047 A3, hàm hẹp có sẵn cho Vận chuyển, không giới hạn ngày). Chỉ lấy `pickupDate`, `pickupTime`, `orderId`, `orderCode`, `direction`, `noiDon` (đã che dãy số).
    - Họ tên, năm sinh hàm này trả về (`nguoi[]`) **không** đi vào DTO của danh sách, khối `gioHenDoi` / `daGoiBao`, hay nhật ký. Có bài TC-GB-9b.
    - Người gọi đều có `contact.view = any` (bài ghim [KH] mục 1.2: mọi mã có `trip.view = any` có `contact.view = any`), nên đọc thừa ở máy chủ không lộ thêm cho ai.
  - Hai hàm vẫn chỉ gọi trong thân route, sau `can(` (bài `CONG_BO`).
  - Vì sao không thêm hàm hẹp mới "giờ hẹn theo id": đó là đổi hợp đồng giữa hai module, thêm một mục nới ở `ham-cong-bo.test.ts`, và thêm một quyết định vào lượt duyệt. Hàm có sẵn đủ dùng.

**Nơi hiện — chủ chọn Q-GB-3 = (a) "Hiện ngay hôm nay"** (một route đọc mới; không bảng, không ô mới):
- **Route** (tên đề xuất) `GET /api/van-chuyen/nhac-goi-khach`, cổng `office`, `if (!can(staff, "trip.view")) return FORBIDDEN()` đầu thân (hàng rào 2, luật 1b).
  - Kế toán đọc được (thấy mục, `baoDuoc = false`).
  - Không tham số: phạm vi tính theo **hôm nay** (`vnToday`), không theo ngày đang xem trên bảng.
- **Phạm vi đọc — chốt:** chuyến có `status IN ('PLANNED','RUNNING')` và `service_date` trong **[hôm nay − 1, hôm nay + 14]**.
  - "− 1": chuyến qua nửa đêm còn đang chạy.
  - "+ 14": hằng trong mã dùng chung `NHAC_GOI_SO_NGAY = 14` (tên đề xuất) ở `goi-bao.ts`; đổi bằng mã, hai chiều.
  - Chuyến xa hơn 14 ngày: mục tự vào danh sách khi còn 14 ngày; lúc nào cũng thấy ở chi tiết chuyến (V2). Xe thường xếp tối hôm trước ([TK] §5.3), nên chuyến `PLANNED` xa hơn 14 ngày hiếm.
  - Lọc theo **ngày của chuyến** (`vc_trip.service_date`), **không** theo ngày hẹn của chặng. Chặng bị dời sang ngày xa vẫn được bắt, vì chuyến đang chở nó còn trong phạm vi.
- **Truy vấn** (ước tính, **chưa đo**):
  - 1 câu `vc_` (`defineSql`): suất khách mở `WAITING` trên các chuyến trong phạm vi → danh sách `legId` + mã chuyến + ngày chuyến;
  - 1 câu `vc_`: dòng mốc cuối của các chặng đó;
  - `hanhKhachChoChuyen(db, legIds)`: giờ hẹn hiện hành theo id — 4–5 câu của `orders`, số dòng tỉ lệ số chặng đang trên xe trong 16 ngày. Quy mô hôm nay ước vài chục đến vài trăm chặng;
  - `v_ord_order_owner` + `ctx.isAssigned` **chỉ cho chặng đã có mục** (để tính `baoDuoc`) — thường vài chặng.
  - Nếu đo thấy chậm: lọc trước chặng có mốc rồi mới đọc giờ; không đổi hợp đồng.
- **DTO** (tên khoá kế hoạch chốt):
  - `{ muc: [{ legId, orderCode, chieu, noiDon, ngayChuyen, gioHenDoi }] }`;
  - `gioHenDoi: { cu: { ngay, gio }, moi: { ngay, gio }, phienBan, maChuyen: string[], baoDuoc: boolean }`;
  - `noiDon` = tên điểm danh mục hoặc chữ tự do **đã che dãy số** (như mọi chỗ của lịch);
  - `baoDuoc` do máy chủ tính bằng **đúng** lời gọi `can(trip.call_ack, { ownerId, assigned })` của route ghi. Màn chỉ ẩn/hiện nút; máy chủ luôn kiểm lại;
  - sắp theo giờ hẹn mới tăng dần;
  - **không** có tên khách, năm sinh, SĐT, người lập, người phụ trách ([0049]:72; [KH] mục 1.7), khoá so sánh nơi (bài TC-GB-9b, TC-50).
- **Màn V1, cột "Cần xử lý":**
  - hiện danh sách này **ở mọi ngày đang xem** (đây là "việc cần làm bây giờ");
  - mục của chuyến khác ngày đang xem có nhãn "Chuyến dd/mm";
  - `GET /lich?ngay=D` **không** lặp mục này (khỏi hai chỗ cho một mục);
  - màn gọi lại route này mỗi lần tải lại lịch;
  - thẻ theo [BV]:59: tiêu đề "<mã đơn> · <nơi đón>"; dòng "Giờ hẹn đón đổi 09:00 → 09:15 · CX-3009-07"; "Ai xử lý: người phụ trách đơn"; nút "Đã gọi báo" khi `baoDuoc`;
  - Kế toán, Bán hàng không phải người lập / phụ trách: thấy thẻ, **không** nút;
  - sau khi bấm: thẻ biến mất; dải báo ngắn "Đã ghi: đã gọi báo khách TD-… — Bỏ đánh dấu".
- **V2, chi tiết chuyến** (`GET /api/van-chuyen/chuyen/:id`): với mỗi chặng có suất trên chuyến:
  - còn mục → `gioHenDoi` (cùng hình);
  - mốc cuối là `DA_GOI` và giờ hiện hành = giờ của mốc → `daGoiBao: { cu, moi, luc (HH:MM giờ VN), nguoiBam, phienBan, boDuoc }`.
    - `nguoiBam` = chuỗi nhãn tên nhân viên của `v_stf_staff_label`, không SĐT, không id — khuôn [KH] I46 / R-P11;
    - `boDuoc` = cùng lời gọi `can(trip.call_ack, …)`, và điều 1 còn đúng.
  - Dòng điểm dừng hiện "Giờ hẹn đổi 09:00 → 09:15 — đã gọi báo khách (Lan, 07:52)" kèm nút "Bỏ đánh dấu" khi `boDuoc`; hoặc "— chưa gọi báo" kèm nút "Đã gọi báo" khi `baoDuoc` ([BV] 02:232).
- **Thẻ K-02 "Giờ xe tới muộn hơn giờ hẹn"** (`GIO_XE_TOI_MUON_HON_HEN`, [BV]:61): **giữ nguyên, không có nút** "Đã gọi báo" (Q-GB-1 = (b)).
- **Tài xế** (`GET /cuoc-cua-toi*`, route 19–20): **không** có khoá mới. Tài xế vẫn thấy giờ hẹn **hiện hành** (khoá `gioHen` có sẵn — [KH] mục 1.8). Lý do: người gọi khách là người phụ trách đơn (C19). Tin đẩy cho tài xế là lượt 2 D6.

**Lệnh "Đã gọi báo"** — một **họ lệnh riêng** trên mốc của chặng, **không** phải lệnh kế hoạch chuyến:
- **Route** (tên đề xuất): `POST /api/van-chuyen/chang/:legId/da-goi-bao`, cổng `office`.
  - Thân: `{ phienBan, gioMoi: { ngay, gio }, requestId }`.
  - `phienBan` = `seq` của mốc mà màn đã thấy; `gioMoi` = giờ "mới" mà màn đã hiện. **Không** nhận chữ nào khác (lần 12 câu 1; [KH] I18).
- **Thứ tự trong thân** — mã trả **cố định** 403 → 404 → 403 → 409, không phụ thuộc trạng thái chặng (khuôn hai bước của route tài xế, [KH] mục 1.2):
  1. **cổng thô theo ô, trước mọi truy vấn** (hàng rào 2): `if (!can(staff, "trip.view") || !can(staff, "trip.call_ack", { ownerId: staff.id, assigned: true })) return FORBIDDEN()`.
     - Vế thứ hai đúng khi người gọi có ô `trip.call_ack` ≠ `none` ở **bất kỳ** cột nào (khuôn `can(staff, "trip.view", { assigned: true })` của [KH] 1.2 bước 1).
     - Kế toán luôn nhận 403 ở đây, dù chặng đang ra sao;
  2. đọc `order_id` của chặng qua view công bố **có sẵn** `v_ord_leg_key` (có cả chặng đóng, đơn huỷ). Không có → 404;
  3. đọc người lập (`v_ord_order_owner`, view công bố có sẵn — tiền lệ `thongbao`, migration 0025) và `ctx.isAssigned(orderId)` (hàm tiêm có sẵn). Rồi `if (!can(staff, "trip.call_ack", { ownerId, assigned })) return FORBIDDEN()` (GB2);
  4. `requestId` đã có dòng → 200, trả kết quả của lần đầu;
  5. đọc giờ hẹn hiện hành theo id (`hanhKhachChoChuyen`). Không có (đơn huỷ, chặng đóng) → 409 `khong_con_can_goi`;
  6. đọc mốc + suất của chặng (bảng `vc_`) → `kiemDaGoiBao`:
     - không có mục (điều 1 sai, hoặc giờ không đổi) → 409 `khong_con_can_goi`;
     - `phienBan` ≠ `seq` mốc hiện hành, hoặc `gioMoi` ≠ giờ hiện hành → 409 `gio_hen_vua_doi` ("Giờ hẹn vừa đổi hoặc đã có người báo — tải lại");
  7. **một lô, đúng hai câu**, nhãn mới `CONG_MOC` cho câu cổng:
     - (a) **câu cổng** = `INSERT INTO vc_leg_appt_ack (id = :cmd, leg_id, seq = :phienBan + 1, kind = 'DA_GOI', appt_* = giờ hiện hành vừa đọc, prev_appt_* = giờ của mốc, request_id, …) SELECT … WHERE (SELECT max(seq) FROM vc_leg_appt_ack WHERE leg_id = :leg) = :phienBan`;
     - (b) **nhật ký** `auditStatement(…, "changes() > 0")` ngay sau, `id = :cmd`;
     - **nơi đặt — ruling điều phối (sau người kiểm, VỪA-2):**
       - hàm dựng lô "Đã gọi báo" và "Bỏ đánh dấu" đặt **trong `src/modules/van-chuyen/dieu-phoi.ts`**, cùng chỗ mọi hàm dựng lô khác. Bài thứ tự lô (Task A14, [KH] mục 1.5) quét tên xuất của tệp đó nên **tự bắt** hai hàm này;
       - bài A14 thêm **một nhánh ngoại lệ tường minh cho luật 3** ("mọi câu sau mang `EXISTS` dấu lệnh của `vc_trip`"). Nhánh này chỉ áp cho danh sách **tên hàm** liệt kê cứng (tên đề xuất: `lenhDaGoiBao`, `lenhBoDanhDauGoiBao`) có câu đầu mang nhãn `CONG_MOC`;
       - với các hàm trong danh sách đó, bài kiểm thay bằng: câu đầu nhãn `CONG_MOC`, là `INSERT` có điều kiện `max(seq)`; câu thứ hai nhãn `NHAT_KY`, có `changes() > 0`; **không** câu nào khác;
       - hàm **không** có tên trong danh sách mà dùng nhãn `CONG_MOC` → bài đỏ. Không bỏ qua ngầm;
       - P16: bỏ một tên khỏi danh sách ngoại lệ → bài đỏ (hàm đó rơi về luật 3 và thiếu `EXISTS` dấu lệnh);
  8. `changes() = 0` (người khác vừa bấm, hoặc mốc vừa đổi) → đọc lại → 409 `gio_hen_vua_doi`. Trigger `gb_` → 409 cùng mã.
- **Vì sao không đi qua câu cổng `UPDATE vc_trip SET version = version + 1`** (thay [0049]:98–107 cho họ lệnh này):
  - "Đã gọi báo" không đổi kế hoạch chuyến. Tăng `version` sẽ làm người xếp xe đang sửa chuyến nhận 409 `stale` oan.
  - Việc này phải làm được cả khi chuyến **đang chạy** (khách chưa đón), mà LC-15 khoá kế hoạch chuyến đang chạy.
  - Ghi mốc không chạm bảng `vc_trip*`, nên **không phải** ngoại lệ của LC-15.
- Giờ hiện hành đổi lần nữa giữa bước 5 và bước 7 → mốc ghi giờ **đã báo** (giờ màn đã hiện) → mục hiện lại "đã báo → mới nhất". Đúng.
- **Không** ghi `vc_trip_event`. Đây không phải sự kiện chuyến; một chặng có thể nằm trên hai chuyến. Nhật ký chuyến ở màn V2 vẫn chỉ gồm `LOAI_SU_KIEN_CHUYEN` ([ĐC] H11). Dấu "đã gọi báo" hiện ở **dòng điểm dừng**.

**Lệnh "Bỏ đánh dấu"** (chủ chọn Q-GB-2 = (a)):
- Route `POST /api/van-chuyen/chang/:legId/bo-danh-dau-goi-bao`, thân `{ phienBan, requestId }`, cùng ô quyền, cùng thứ tự kiểm (403 → 404 → 403 → 409).
- Chỉ khi dòng cuối (`seq = phienBan`) là `DA_GOI` **và** điều 1 còn đúng. Ngược lại → 409 `khong_con_can_goi` / `gio_hen_vua_doi`.
- Lô đúng hai câu (họ `CONG_MOC`, hàm `lenhBoDanhDauGoiBao` trong `dieu-phoi.ts`):
  - câu cổng `INSERT … kind = 'BO_DANH_DAU', seq = phienBan + 1, appt_* = prev_appt_* của dòng DA_GOI, prev_appt_* = appt_* của dòng DA_GOI … WHERE max(seq) = :phienBan`;
  - nhật ký ngay sau.
- Mục hiện lại đúng "A → B" cũ. Không giới hạn thời gian (hai chiều, thêm sau được nếu cần).

**Nhật ký** (`src/shared/audit-actions.ts`, nhóm `trip`; tên đề xuất):
- `trip_appt_called` ("Đã gọi báo khách giờ hẹn mới"), `trip_appt_call_undone` ("Bỏ đánh dấu đã gọi báo").
- `orderId` = **NULL**, theo khuôn [KH] I17. Lý do: người xem lịch sử đơn gồm HDV, Đối tác — những người không được thấy lịch xe (C1). Giới hạn chấp nhận: dấu này **không** hiện trong lịch sử của đơn (xem "Chưa làm").
- `detail` — **danh sách trắng**, chốt trước dòng đầu (cửa một chiều):
  - mã đơn; chiều ("chiều đi" / "chiều về");
  - "giờ hẹn đón 09:00 → 09:15" (thêm "dd/mm" khi ngày khác; "chưa chốt giờ" khi NULL);
  - mã chuyến đang chở chặng.
  - **Không** SĐT, họ tên khách, năm sinh, tên người liên hệ, chữ nơi tự do, khoá so sánh nơi, chữ gõ tự do nào.
  - Ví dụ: "TD-20260930-0018 · chiều đi · giờ hẹn đón 09:00 → 09:15 · CX-3009-07".
- Không sinh tin Bảng tin / thông báo điện thoại. Việc đó thuộc lượt 2 D6 ([TK] §3.5).

**Migration `0043`** (điều phối đã cấp):
- `CREATE TABLE vc_leg_appt_ack` + chỉ mục `(leg_id, seq)` (qua `UNIQUE`) + năm trigger ở trên. **Không** dữ liệu gieo.
- **Phải cùng lần phát hành với `0042`.** Lý do: trigger `vc_trip_allocation_needs_appt` chặn mọi suất khách mới của chặng chưa có mốc. Nếu `0042` lên trước và đã có suất, lệnh dời / cập nhật điểm trên các chặng đó sẽ bị chặn.
  - Hôm nay production chưa có bảng chuyến nên không cần dữ liệu bù.
  - Nếu hai tệp bị tách lần phát hành: DỪNG, hỏi điều phối (cần bước bù mốc cho suất đang mở trước khi bật trigger).
- `docs/data-dictionary.json` thêm bảng (module `van-chuyen`; `leg_id` ghi "tham chiếu logic" như `vc_trip_allocation.leg_id` của `b3aebd0`) + `npm run dict`. **Không** view mới.

### GB2. Ô quyền mới `trip.call_ack` — ai được ghi "Đã gọi báo" / "Bỏ đánh dấu"

| Ô | SALES | ACC | ADMIN | FIELD | PARTNER | SA | INTERN | DRIVER | DRIVER_PARTNER |
|---|---|---|---|---|---|---|---|---|---|
| `trip.call_ack` — ghi / bỏ dấu "đã gọi báo khách" giờ hẹn mới của chặng đang trên xe | **ownOrAssigned** | none | any | none | none | any | none | none | none |

- **Đã có căn cứ, không hỏi chủ:**
  - Hiến chương **5.8** (đã duyệt): "Quyền làm một bước … được xét theo **vai của người đó trên chính đối tượng** (người lập, người phụ trách…) kết hợp mức quyền";
  - ĐP6 / C19 (chủ 29/9): "đơn của ai người đó lo", "người gọi khách là người đã hứa với khách";
  - [BV]:59 "Ai xử lý: người phụ trách đơn";
  - Kế toán chỉ xem ([HĐ] Q1; [BV] "Chỉ xem — Kế toán không xếp xe").
  - Người kiểm độc lập xác nhận: có căn cứ, giống byte hàng `order.trip.edit`.
- "Của mình" = người lập đơn (`orders.staff_id`, đọc qua `v_ord_order_owner`). "Được giao" = người phụ trách đang mở (`ctx.isAssigned` — **người phụ trách đơn**, khác `assigned` của tài xế trên chuyến). Route truyền **cả hai** vào `can()` (`src/CLAUDE.md`: "route dùng ô `ownOrAssigned` phải truyền `assigned`").
- **Ô riêng, không dùng lại `order.trip.edit`**, dù hai hàng giống hệt nhau hôm nay:
  - hai thao tác khác nghĩa (sửa thông tin chuyến của đơn ≠ ghi đã báo khách), theo tinh thần ruling R-K1 ("một mã, một nghĩa");
  - ô riêng để bản đồ quyền (ADR-0019) đọc đúng và đổi riêng được.
  - Bài ghim khoá quan hệ: `trip.call_ack` **không rộng hơn** `order.trip.edit` ở mọi cột. Người không được đổi giờ hẹn thì không được xác nhận đã báo giờ hẹn.
- **Cổng:** `office` (Bán hàng, Kế toán, Quản trị, Toàn quyền). HDV, Đối tác, Thực tập, Tài xế, Tài xế đối tác bị cổng chặn trước.
- **Bài ghim** (`src/shared/permissions.test.ts`):
  - bảng `ADR` +1 hàng;
  - `DRIVER_ROW`, `DRIVER_PARTNER_ROW` thêm khoá `trip.call_ack: "none"`. **Không** nới hàng ghim nào.
  - Mới (siết):
    - `trip.call_ack` ⊆ `order.trip.edit` theo từng cột (thứ tự `none < own, assigned < ownOrAssigned < any`);
    - `trip.call_ack ≠ none` ⇒ `trip.view = any` và `contact.view ≠ none` (người bấm thấy được bảng và SĐT khách để gọi).
  - Bài 512 tập con không đổi số (không thêm mã quyền).
- **Hàng rào 1** (`src/permission-enforcement.test.ts`): ô vào `MATRIX` **cùng commit** với route đầu tiên hỏi nó. **Hàng rào 2**: hai route ghi có `can()` được dùng kết quả; route đọc `nhac-goi-khach` có `can(trip.view)` (luật 1b).
- `src/route-access.test.ts`: **+3** (`da-goi-bao`, `bo-danh-dau-goi-bao`, `nhac-goi-khach`) — [KH] mục 1.7: 155 → 158.
- `docs/quyen-hoan.json`: không mục hoãn.

---

## Câu ADR bị thay / bổ sung (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 D1, bảng ([0049]:80–86) | năm bảng `vc_trip*` | thêm dòng: "`vc_leg_appt_ack` \| mốc "giờ hẹn đã biết" của chặng, chỉ-thêm (`XEP` máy chụp lúc chặng lần đầu lên xe; `DA_GOI`; `BO_DANH_DAU`) \| `leg_id`, `seq`, `kind`, `appt_date/time`, `prev_appt_date/time`, `request_id` (ADR-0051 GB1)" |
| ADR-0049 D1, "Lịch chung ngày D = ghép lúc đọc ba nguồn" ([0049]:71–74) | "… hàm hẹp mới của `orders`, `lichChungChang` …; dữ liệu `vc_` của chuyến; hàm thuần `dungLichChung`" | **bổ sung, không đổi lịch theo ngày:** "Ngoài lịch ngày D, bảng điều phối có **danh sách nhắc gọi khách** không theo ngày (chuyến chưa kết thúc trong [hôm nay − 1, hôm nay + 14]), dựng lúc đọc từ `vc_` + mốc giờ hẹn + giờ hẹn hiện hành đọc theo id qua `hanhKhachChoChuyen` (ADR-0051 GB1)" |
| ADR-0049 D1, "Thứ tự lô" ([0049]:98–107) | "mọi lệnh ghi một `db.batch` … 1. Câu cổng … `UPDATE vc_trip SET version = version + 1 …`" | thêm: "**Họ lệnh trên mốc giờ hẹn** ('Đã gọi báo', 'Bỏ đánh dấu' — ADR-0051 GB1) không chạm `vc_trip*`: lô đúng hai câu — câu cổng (nhãn `CONG_MOC`) là `INSERT` có điều kiện `max(seq) = phienBan`, nhật ký ngay sau với `changes() > 0`; không kiểm, không tăng `version`; bài thứ tự lô có nhánh ngoại lệ luật 3 liệt kê tên hàm." Lô xếp thêm một câu "chụp mốc" có `EXISTS` dấu lệnh, đứng trước câu mở suất |
| ADR-0049 D1, LC-15 ([0049]:133) | "Chuyến đang chạy: khoá hẳn kế hoạch … Chỉ còn: trạng thái tiến độ, đổi thứ tự điểm chưa tới, gắn tên vào suất" | **làm rõ, không nới:** "Ghi mốc giờ hẹn của chặng (ADR-0051) không phải sửa kế hoạch chuyến và không chạm bảng `vc_trip*`; làm được khi chuyến đang chạy, chừng nào khách của chặng còn chờ đón." |
| ADR-0049 D3, ô mới ([0049]:195–201) | năm ô | thêm `trip.call_ack` (bảng GB2) |
| ADR-0049 D3, route ([0049]:214–220) | danh sách route văn phòng | thêm `POST /api/van-chuyen/chang/:legId/da-goi-bao`, `POST …/bo-danh-dau-goi-bao` (cổng `office`, cổng thô `trip.view` + `trip.call_ack`, rồi `can(trip.call_ack, { ownerId, assigned })`) và `GET /api/van-chuyen/nhac-goi-khach` (`can(trip.view)`) |
| ADR-0049 D3, danh sách trường cho tài xế ([0049]:231–239) | — | **không đổi**: không khoá mới cho tài xế |
| ADR-0049 trang ghép (2) ([0049]:297–307) | dòng `trip.view`: "đọc mọi bảng `vc_trip*` …" | "… và `vc_leg_appt_ack` (văn phòng + Kế toán; **không** qua DTO tài xế)"; thêm dòng `trip.call_ack` |
| ADR-0050 "Phương án bị loại" ([0050]:355) | "… So nơi lúc đọc đủ cho lỗ đã thấy; giờ đã có `GIO_HEN_NGOAI_CHUYEN` + cảnh báo giờ xe tới (K-02)." | **bổ sung lý do:** vế "giờ đã có `GIO_HEN_NGOAI_CHUYEN`…" không còn đủ sau lời chủ lần 12 (báo **mọi** lần đổi giờ của khách đã xếp). ADR-0051 thêm mốc giờ hẹn ở `vc_`. Vế "không thêm cột ở `ord_transfer_leg`, `vc_trip_allocation`" **vẫn giữ** |

**Tài liệu thiết kế / kế hoạch phải sửa theo** (không phải câu ADR):
- [TK] MQ-07 ([TK]:398): kích hoạt nay là "so mốc giờ hẹn lúc đọc", không phải `order_leg_updated`. [TK] §5.4(a) bước 2 ([TK]:759): "không ghi gì ở `vc_`" → "không ghi gì lúc đổi giờ. Mốc đã chụp lúc xếp; 'Đã gọi báo' ghi một dòng mốc". [TK] §3.5 dòng "Giờ hẹn / nơi đón của chặng đổi" ([TK]:530): phần thông báo vẫn lượt 2 D6.
- [KH]:
  - mục 1.1: tệp `goi-bao.ts`, hằng `GIO_HEN_DOI` + nhãn + `NHAC_GOI_SO_NGAY`; hai hành động nhật ký; danh sách trắng `detail`;
  - mục 1.2: ô `trip.call_ack` + bài ghim;
  - mục 1.3: bảng mới, migration `0043`;
  - mục 1.4: trigger;
  - mục 1.5: họ lệnh `CONG_MOC` (ngoại lệ luật 3 liệt kê tên hàm) + câu chụp mốc trong lô xếp;
  - mục 1.7: +3 route (155 → 158);
  - mục 1.8: DTO danh sách nhắc, khối `gioHenDoi` / `daGoiBao` của V2;
  - **I38:** `hanhKhachChoChuyen` được dùng thêm để đọc **ngày giờ hẹn theo id** (danh sách nhắc, chi tiết chuyến, hai route ghi). Tên người đọc được không vào DTO, nhật ký (TC-GB-9b);
  - I45: R-VC-17, R-VC-18 (điều phối đã cấp);
  - mục 4 (điểm dễ hỏng): bẫy tái mốc; khung thử chèn thẳng suất.
- `src/shared/dieu-phoi-lich-chung.ts:106`: sửa chú thích (xem GB1).

---

## Trang ghép (`CLAUDE.md` §9 — bắt buộc: lượt duyệt 2 quyết định và một loại dữ liệu mới)

**(1) Bảng nào chứa loại thực thể nào (sau lượt này)**

| Bảng | Loại | Đổi gì |
|---|---|---|
| `vc_leg_appt_ack` (**mới**) | mốc "giờ hẹn đã biết" của chặng — **ba loại dòng**: `XEP` (máy chụp trong lô xếp lần đầu), `DA_GOI` (người bấm), `BO_DANH_DAU` (dòng đảo); `CHECK` đúng một bộ cột theo loại | mới. Chỉ `van-chuyen` ghi. Không tên, không SĐT, không nơi — chỉ ngày giờ và khoá chặng |
| `vc_trip_allocation` (`0042`) | suất khách / suất người đi kèm | **không** thêm cột, không thêm loại dòng. Thêm **điều kiện**: suất khách chỉ mở được khi chặng đã có mốc (trigger `vc_trip_allocation_needs_appt`) |
| `vc_trip_event` | sự kiện chuyến | **không đổi**: "Đã gọi báo" không phải sự kiện chuyến |
| `audit_log` | nhật ký | + `trip_appt_called`, `trip_appt_call_undone` (`orderId` NULL; `detail` danh sách trắng) |
| `ord_transfer_leg` | chặng | **không đổi**. Chỉ được đọc (qua `lichChungChang`, `hanhKhachChoChuyen`) |
| `v_ord_order_owner` (view công bố, 0025) | người lập đơn | **không đổi view**. Thêm một người đọc: `van-chuyen` (tiền lệ `thongbao`) |
| `v_ord_leg_key` (view công bố, 0035) | khoá chặng → đơn | **không đổi view**. `van-chuyen` đã đọc (trigger LC-09, [KH] I38); thêm một nơi đọc: hai route ghi |

**(2) Dòng bản đồ quyền nào chạm bảng nào, áp cho loại nào**

| Ô | Chạm | Áp cho |
|---|---|---|
| `trip.call_ack` (**mới**) | ghi dòng `DA_GOI` / `BO_DANH_DAU` của `vc_leg_appt_ack` | Bán hàng: chặng của đơn **mình lập hoặc mình đang phụ trách**; Quản trị, Toàn quyền: mọi chặng. Chỉ khi chặng còn khách chờ đón trên xe chưa kết thúc |
| `trip.dispatch` (có sẵn) | ghi dòng `XEP` (trong lô xếp — không ô mới) | như ADR-0049 D3 |
| `trip.view` (có sẵn) | đọc danh sách nhắc (mọi chuyến trong [hôm nay − 1, hôm nay + 14]), khối `gioHenDoi` / `daGoiBao` của V2 | văn phòng + Kế toán: mọi chặng. Tài xế (`assigned`): **không** có khoá mới trong DTO tài xế, **không** gọi được route danh sách (cổng `office`) |
| `order.trip.edit` (có sẵn, `orders`) | sửa giờ hẹn → nguồn sinh mục | không đổi. Bài ghim: `trip.call_ack` ⊆ `order.trip.edit` |
| `contact.view` (có sẵn) | người bấm cần SĐT khách để gọi (ở trang đơn — không ở bảng điều phối) | không đổi. Bài ghim: `trip.call_ack ≠ none` ⇒ `contact.view ≠ none` |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Ô trong thân route | Lớp CSDL |
|---|---|---|---|
| "Đã gọi báo", "Bỏ đánh dấu" | `office` | thô, trước mọi truy vấn: `trip.view` + `trip.call_ack` ≠ none ở một cột nào đó → `v_ord_leg_key` (404) → người lập + `ctx.isAssigned` → `trip.call_ack` với `{ ownerId, assigned }` (403) → 409 | `CHECK` loại dòng; `UNIQUE (leg_id, seq)`; `UNIQUE (request_id)`; trigger chuỗi, trigger "còn khách chờ trên xe", chỉ-thêm |
| Lô xếp (chụp mốc) | `office` | `trip.dispatch` (có sẵn) | trigger `vc_trip_allocation_needs_appt`; `UNIQUE (leg_id, seq)` |
| Danh sách nhắc gọi khách (`GET …/nhac-goi-khach`) | `office` | `trip.view` đầu thân; `baoDuoc` tính bằng đúng lời gọi `can(trip.call_ack, { ownerId, assigned })` | — (tính lúc đọc). Là **hình chiếu**, không phải quyết định dữ liệu / quyền mới |
| Chi tiết chuyến (khối `gioHenDoi` / `daGoiBao`) | `office` | `trip.view` | — (tính lúc đọc) |
| Màn tài xế | `staff` | như ADR-0049 | — (không khoá mới; bài liệt kê khoá DTO) |
| Hợp đồng giữa các phần | — | `lichChungChang`, `hanhKhachChoChuyen` **không đổi khoá**; `v_ord_order_owner`, `v_ord_leg_key`, `ctx.isAssigned` có sẵn; nơi gọi hàm hẹp đứng sau `can(` (bài `CONG_BO`) | trigger mới chỉ đọc bảng `vc_` |

---

## Cửa một chiều / hai chiều

- **Một chiều:**
  - tiền tố và chủ bảng `vc_leg_appt_ack`;
  - tập `kind` trong `CHECK` (ba giá trị). Đổi `CHECK` trong SQLite là dựng lại bảng;
  - **định nghĩa mốc** ("lần đầu lên xe", chỉ người bấm mới dời mốc): đổi sau thì các mục cũ tính khác;
  - mỗi dòng đã ghi (chứng cứ "đã báo khách giờ nào"; chỉ-thêm);
  - danh sách trắng `detail` của hai hành động nhật ký.
- **Hai chiều:** ô quyền (thêm, bớt cột); phạm vi ngày của danh sách nhắc (`NHAC_GOI_SO_NGAY`); hiển thị, nhãn; câu kiểm định kỳ; luật thuần (đổi cùng test).
- **Tránh một chiều không cần:** không cột mới ở `ord_*`, `vc_trip_allocation`; không view mới; không hàm hẹp mới; không đổi khoá hàm hẹp.

---

## Hệ quả

- **Việc lớn** (dữ liệu + quyền) ⇒ **người kiểm độc lập** khi thi công xong, cùng vòng kiểm ADR-0049 (K2 của [KH]).
- **Hàng rào mới**, mỗi cái một dòng `docs/SO-HANG-RAO.md`, kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên):
  - trigger chỉ-thêm, chuỗi, "còn khách chờ trên xe" của `vc_leg_appt_ack`;
  - trigger `vc_trip_allocation_needs_appt` (P16: bỏ câu chụp mốc khỏi lô xếp → lô xếp đỏ);
  - `UNIQUE (leg_id, seq)` + câu cổng có điều kiện (P16: bỏ vế `max(seq) = phienBan` → bài bấm đồng thời thấy lỗi `UNIQUE` thay vì 409);
  - nhánh ngoại lệ `CONG_MOC` của bài thứ tự lô (P16: bỏ một tên khỏi danh sách → đỏ);
  - bài "không tái mốc" (P16: đổi luật thành "chụp mỗi lần mở suất" → ca `STOP_CHANGED` / `MOVED` đỏ);
  - bài ghim `trip.call_ack` (hàng, ⊆ `order.trip.edit`, ⇒ `trip.view` / `contact.view`);
  - bài "không mang tên người" TC-GB-9b + bài liệt kê khoá DTO tài xế không có khoá mới (mở rộng TC-50 của [KH]);
  - bài quét nhật ký không SĐT / họ tên / chữ nơi tự do (mở rộng `src/hanh-khach-khong-lo-ten.test.ts`);
  - bài phạm vi danh sách nhắc (lọc theo ngày chuyến, P16: đổi sang ngày hẹn → đỏ);
  - hai câu kiểm định kỳ **R-VC-17**, **R-VC-18** (điều phối đã cấp; R-VC-12…16 đã dùng cho [0050] + K-02 — [KH] I45), mức `fail` (lưới thứ hai của trigger):
    - **R-VC-17:** suất khách đang mở mà chặng **không có** dòng mốc nào;
    - **R-VC-18:** chuỗi mốc hỏng — `seq` không liên tục từ 1, dòng `seq = 1` không phải `XEP`, hoặc `prev_appt_*` không khớp `appt_*` của dòng trước.
- **Chi phí có tên — khung thử của ADR-0049:** trigger `vc_trip_allocation_needs_appt` bám vào bảng suất của `0042`. Mọi chỗ **chèn thẳng** suất khách bằng SQL sẽ đỏ ngay khi `0043` có mặt, trừ khi chèn dòng mốc `XEP` trước:
  - harness `src/modules/van-chuyen/dieu-phoi.test.ts`;
  - bài migration (kể cả 42 bài của `0042` ở `b3aebd0`);
  - các ca gieo lỗi R-VC-3…16 trong `src/audit-invariants.test.ts`;
  - bộ gieo e2e.
  - Task A-GB bước 0 liệt kê và sửa hết. R-VC-17 ở mức `fail` còn làm đỏ bước `audit-invariants --strict` cuối e2e nếu bộ gieo quên.
  - Người thi công A12–A14 cần được báo **trước** rằng một trigger của `0043` sẽ bám vào bảng của họ.
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md` (§5 bảng, §6 luồng điều phối, §7 route); `docs/CHANGE-GUIDE.md` (công thức điều phối: "mở suất khách mới phải chụp mốc"); `docs/adr/README.md` (số ADR, số migration).
- **Thứ tự:**
  1. ~~chủ trả lời Q-GB-1..3, duyệt nguyên tắc~~ — xong 29/9 (lần 14);
  2. người kiểm độc lập đọc bản cuối → ĐẠT;
  3. điều phối chép thành `docs/adr/ADR-0051-…`, cập nhật `docs/adr/README.md` (số ADR, giữ số `0043`), sửa [KH] theo danh sách trên;
  4. người thi công ADR-0049: Task **A-GB** sau A12–A14 (cần bảng suất, route xếp, bài thứ tự lô); Task **B-GB** cùng Phần B;
  5. người kiểm độc lập (K2), cùng vòng ADR-0049;
  6. phát hành **cùng** ADR-0049 lượt 1.

## Phương án bị loại

- **Đọc giờ cũ từ nhật ký `order_leg_updated`** ([TK] MQ-07 bản cũ): `van-chuyen` là module nghiêm, không đọc `audit_log` (ADR-0049 đã loại cổng lô bằng nhật ký). Giờ nằm trong chữ tự do của `detail`, dễ vỡ.
- **Thêm cột / số phiên bản ở `ord_transfer_leg`:** đổi bảng của `orders`; [0050]:355 đã loại. `orders` không biết chặng đã lên xe hay chưa (không cạnh `orders → van-chuyen`).
- **Chụp giờ trên `vc_trip_allocation`:**
  - LC-04 cấm sửa nội dung suất, nên dấu "đã gọi" không ghi vào đó được;
  - đóng rồi mở suất (`STOP_CHANGED`, `MOVED`) sẽ tái mốc và nuốt một lần đổi chưa gọi.
- **Chụp lại mốc mỗi lần mở suất:** cùng bẫy tái mốc.
- **Ghi "Đã gọi báo" thành `vc_trip_event` qua câu cổng `version`:**
  - người xếp xe nhận 409 `stale` oan;
  - bị LC-15 chặn trên chuyến đang chạy;
  - một chặng có thể trên hai chuyến.
- **Mở rộng `GIO_HEN_NGOAI_CHUYEN`:** khác nghĩa, khác người xử lý; ví dụ của bản vẽ (giờ mới trong khung chuyến) vẫn không báo.
- **Mọi Bán hàng bấm được** (như bản vẽ vẽ nút cho vai Bán hàng): trái Hiến chương 5.8 và ĐP6; người bấm có thể không phải người đã gọi.
- **Dùng lại ô `order.trip.edit`:** hai nghĩa một ô (tinh thần R-K1). Thay bằng bài ghim "không rộng hơn".
- **Kèm ô ghi chú khi bấm:** chủ chọn "Chưa làm" (lần 12); [KH] I18.
- **Máy tự nhắn / gọi khách:** chủ đã chọn không (C11, LC-17).
- **Thêm hàm hẹp mới "giờ hẹn theo id" ở `orders`:** đổi hợp đồng giữa hai module, thêm một quyết định vào lượt duyệt. `hanhKhachChoChuyen` đã đủ.
- **`INSERT OR IGNORE` cho câu chụp mốc:** nuốt cả lỗi `CHECK` / `NOT NULL`.
- **"Đã gọi báo" trên thẻ xe tới muộn** (bảng thứ hai "đã báo khách giờ xe tới"): chủ chọn Q-GB-1 = (b) — giữ một chỗ ghi giờ hẹn (trên đơn).
- **Chỉ hiện mục trên bảng của đúng ngày chuyến chạy:** chủ chọn Q-GB-3 = (a) — việc cần gọi phải thấy ngay.
- **Nhét danh sách nhắc vào `GET /lich?ngay=D`:** mỗi lần đổi ngày xem lại phải tính cả 16 ngày; route riêng tách chi phí và giữ lịch theo ngày đúng nghĩa ADR-0049 D1.
- **Danh sách nhắc không giới hạn ngày trên:** chi phí tăng theo số chuyến tạo sẵn; 14 ngày đủ cho cách xếp xe hôm nay (tối hôm trước).

## Câu hỏi đã trả lời (chủ, chat 2026-09-29 tối — điều phối ghi vào [HĐ] "Trả lời lần 14")

Câu hỏi giữ nguyên văn như đã trình.

**Q-GB-1 — Thẻ "Giờ xe tới muộn hơn giờ hẹn" (ví dụ: hẹn 07:45, xe dự kiến tới 07:58) có nút "Đã gọi báo" như bản vẽ không?** → **Chủ chọn (b) "Không, sửa giờ trên đơn".**
- (a) Có, như bản vẽ — Được: bấm một nút là xong, thẻ hết; không phải sửa đơn. Mất: thêm một bảng nhỏ nữa; giờ hẹn trên đơn vẫn là 07:45 dù khách đã được báo 07:58, tức có hai chỗ ghi giờ.
- **(b) Không; người phụ trách gọi khách rồi sửa giờ hẹn trên đơn thành 07:58** (khuyến nghị) — Được: giờ trên đơn luôn là giờ đã hẹn với khách (một chỗ ghi); sau khi sửa, thẻ "Giờ hẹn đổi" hiện ra và bấm "Đã gọi báo" ở đó. Mất: thêm một bước sửa đơn; nếu không sửa thì thẻ xe muộn còn nằm trên bảng tới khi xe tới điểm đón đó.

**Q-GB-2 — Bấm nhầm "Đã gọi báo" (ví dụ chạm nhầm thẻ trên điện thoại) thì sửa thế nào?** → **Chủ chọn (a) "Có nút Bỏ đánh dấu".**
- **(a) Có nút "Bỏ đánh dấu"** (khuyến nghị) — Được: thẻ hiện lại; nhật ký ghi cả lần bấm lẫn lần bỏ, ai, lúc nào. Mất: thêm một nút, một đường xử lý.
- (b) Không có; máy hỏi "Xác nhận đã gọi báo khách TD-…?" trước khi ghi — Được: gọn nhất. Mất: chạm nhầm mà vẫn bấm xác nhận thì thẻ mất luôn; khách có thể không được báo giờ mới.

**Q-GB-3 — Nếu giờ hẹn đổi cho một chuyến chạy sau nhiều ngày, bạn cần thấy nhắc gọi khách ngay hôm nay, hay chỉ thấy trên bảng của đúng ngày chuyến chạy?** → **Chủ chọn (a) "Hiện ngay hôm nay".**
- **(a) Hiện ngay trên bảng hôm nay** (mọi mục chờ gọi của các chuyến sắp tới, tới khi bấm) (khuyến nghị).
- (b) Chỉ trên bảng của đúng ngày chuyến chạy.

**Lời duyệt:** "Duyệt, ghi theo 3 câu" — điều phối chỉ ghi thành ADR-0051 sau khi người kiểm đọc bản cuối và báo đạt.

**Đã có căn cứ, không hỏi:**
- ai được bấm: Hiến chương 5.8 + ĐP6 → người lập, người phụ trách, Quản trị, Toàn quyền;
- tài xế không thấy thẻ: C19, lượt 2 D6;
- không ô ghi chú: lần 12 câu 1;
- báo mọi lần đổi giờ: lần 12 câu 2.

## Giả định đã tự đặt (bề mặt, đảo ngược được)

- **G-GB-1:** tên bảng, ô, route, hằng, hàm, hành động nhật ký, khoá DTO ở tệp này là **đề xuất**. Kế hoạch chốt. Riêng tên bảng, tên cột và ba giá trị `kind` phải chốt **trước** khi viết migration.
- **G-GB-2:** sau khi bấm, thẻ biến mất khỏi "Cần xử lý" (không giữ dòng mờ "đã gọi"). Dấu "đã gọi báo" và nút "Bỏ đánh dấu" hiện ở màn chi tiết chuyến và ở dải báo ngay sau khi bấm.
- **G-GB-3:** chặng mà cả **ngày** lẫn giờ đổi hiện "30/09 09:00 → 01/10 09:15"; chỉ giờ đổi thì không kèm ngày.
- **G-GB-4:** mức `fail` cho R-VC-17/18, vì là lưới thứ hai của trigger (dữ liệu hỏng, không phải việc vận hành).
- **G-GB-5:** con số phạm vi danh sách nhắc [hôm nay − 1, hôm nay + 14] (chủ chọn "hiện ngay hôm nay", chưa chọn con số). Là hằng trong mã, đổi bằng mã.

## Chưa làm (ngoài phạm vi, ghi để khỏi hỏi lại)

- Tin đẩy / Bảng tin khi giờ hẹn đổi (tới người phụ trách, tài xế): lượt 2 D6.
- Nhắc gọi khách khi **nơi** đón / trả đổi: nơi đổi đã có `NOI_HEN_DOI` (giữ chuyến) và `NOI_HEN_KHAC_DIEM` (ADR-0050). Chủ chưa yêu cầu nhắc gọi khách cho việc này.
- "Đã gọi báo" trên thẻ xe tới muộn: chủ chọn không (Q-GB-1 = (b)).
- Dấu "đã gọi báo" trong **lịch sử của đơn** (trang đơn): `orders` không đọc được `vc_`; nhật ký để `orderId` NULL (I17). Muốn có thì cần quyết định riêng.
- Chặng đổi giờ khi **chưa** lên xe: không có mục (người xếp xe thấy giờ mới lúc xếp).
- Câu kiểm "chuyến đã xuất bến mà còn chặng đổi giờ chưa gọi báo": ý tưởng, chưa làm.

## Chưa kiểm

- `INSERT … SELECT … WHERE max(seq) = ?` + `UNIQUE (leg_id, seq)` dưới nhiều yêu cầu song song trên D1: dựa vào giả định "D1 chạy lô lần lượt" (ADR-0049 "Chưa kiểm"). `UNIQUE` là lưới nếu giả định sai. Bài chạy đua TC-GB-5 kiểm.
- So `IS` giữa hai giá trị NULL trong thân trigger: đúng trên SQLite. **Chưa thử** trên cả `node:sqlite` lẫn D1 local — người thi công thử cả hai (bài học R-P4).
- Trigger ở `0043` đặt trên bảng của `0042`: hợp lệ trong SQLite. **Chưa thử** với bài migration của dự án (thứ tự áp theo tên tệp).
- `hanhKhachChoChuyen(db, legIds)` trả đúng chặng mở của đơn đã xác nhận, không giới hạn ngày: **đọc mã** (`chang-hanh-khach-repo.ts:422-432@9105306`), chưa chạy thử cho ca "ngày đón dời xa".
- Hiệu năng route danh sách nhắc (16 ngày chuyến, gọi `hanhKhachChoChuyen` cho mọi chặng đang trên xe trong khoảng đó): ước vài chục đến vài trăm chặng, **chưa đo**.
- Người kiểm độc lập: bản `9590327` ĐẠT CÓ ĐIỀU KIỆN; bản cuối `360f1ce` **ĐẠT** (29/9). Người kiểm tự thử bằng `node:sqlite` (không phải D1): trigger ở migration sau tham chiếu bảng của migration trước và phép so `IS` với NULL chạy đúng như mô tả — **không thay** cho bài migration / khung thử thật của dự án và D1 local.
- Ghi chú của người kiểm cho người thi công / kiểm tay (không phải lỗi): giờ hẹn đổi 09:00 → 09:15 (đã "Đã gọi báo"), rồi 09:15 → 09:30 (chưa gọi); bấm "Bỏ đánh dấu" dựa trên màn cũ thì mục hiện "09:00 → 09:30" (bỏ qua mốc 09:15) — đúng theo `CHECK` / trigger, đúng thông tin.

---

## Phụ lục — Bổ sung kế hoạch thi công (không sửa tệp kế hoạch chính; điều phối chép vào [KH] khi ghi ADR)

Viết tiêu chí **trước** khi làm (P20). Mỗi task đỏ → xanh; mỗi hàng rào có một lần P16 (sửa cố ý → đỏ → hoàn nguyên). Chạy sau A12 (`0042`, `b3aebd0`), A13 (route xếp, lịch), A14 (bài thứ tự lô). Nhật ký thi công ghi lệnh + đầu ra.

### Task A-GB — máy chủ, CSDL, luật thuần, quyền

- **Bước 0 — soát:**
  - quét số migration mọi nhánh / worktree; xác nhận `0043` còn trống;
  - `grep` mọi `INSERT INTO vc_trip_allocation` trong test, harness, `scripts/`, `tests/`. Chỗ nào chèn suất khách thẳng thì chèn dòng mốc `XEP` trước (một hàm gieo dùng chung, không chép tay);
  - xác nhận bài thứ tự lô (A14) đã có và đọc cách nó liệt kê hàm của `dieu-phoi.ts`. Chưa có thì DỪNG, báo điều phối (ruling VỪA-2 dựa vào nó).
- **Bước 1 — test đỏ** cho TC-GB-1…16.
- **Bước 2 — migration `0043`** + `docs/data-dictionary.json` + `npm run dict`.
- **Bước 3 — luật thuần** `src/shared/goi-bao.ts` (+ `goi-bao.test.ts`): `mocHienHanh`, `mucGioHenDoi`, `kiemDaGoiBao`, `kiemBoDanhDau`, hằng `GIO_HEN_DOI`, nhãn, "Ai xử lý", `NHAC_GOI_SO_NGAY`. Sửa chú thích `dieu-phoi-lich-chung.ts:106`.
- **Bước 4 — lô (ruling VỪA-2):**
  - lô xếp: câu "chụp mốc" (nhãn `GHI`, có `EXISTS` dấu lệnh, trước câu mở suất);
  - hàm `lenhDaGoiBao`, `lenhBoDanhDauGoiBao` đặt **trong `src/modules/van-chuyen/dieu-phoi.ts`**, câu cổng nhãn `CONG_MOC`;
  - bài A14 thêm nhánh ngoại lệ luật 3 cho nhãn `CONG_MOC`, **liệt kê tên hai hàm**; hàm khác dùng `CONG_MOC` → đỏ;
  - P16: bỏ một tên khỏi danh sách ngoại lệ → đỏ.
- **Bước 5 — route ghi** "Đã gọi báo", "Bỏ đánh dấu" (thứ tự 403 → 404 → 403 → 409); `MATRIX` + `trip.call_ack` **cùng commit** (hàng rào 1); bài ghim.
- **Bước 6 — route đọc** `GET /api/van-chuyen/nhac-goi-khach` (phạm vi, truy vấn, DTO theo GB1 "Nơi hiện"); khối `gioHenDoi` / `daGoiBao` ở `GET /chuyen/:id`; `src/route-access.test.ts` +3.
- **Bước 7 — nhật ký** hai hành động + danh sách trắng `detail`; bài quét.
- **Bước 8 — câu kiểm định kỳ** R-VC-17, R-VC-18 (`scripts/audit-checks.mjs` + `src/audit-invariants.test.ts`).
- **Bước 9 — P16** cho từng hàng rào ở "Hệ quả"; dòng `docs/SO-HANG-RAO.md`.
- **Bước 10 — chạy:** `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e -- dieu-phoi` (có mạng). Commit theo nhóm.

**Tiêu chí nghiệm thu (máy kiểm được):**

- **TC-GB-1 — lược đồ:**
  - bảng, `CHECK`, `UNIQUE`, năm trigger có mặt; `leg_id` không khoá ngoại (bài "tham chiếu logic" của `b3aebd0` phủ);
  - `UPDATE` / `DELETE` một dòng → lỗi `gb_`;
  - chèn `seq = 2` không có `seq = 1` → lỗi;
  - `prev_appt_*` lệch dòng trước → lỗi;
  - `DA_GOI` có giờ = giờ trước → lỗi `CHECK`;
  - `BO_DANH_DAU` sau một `XEP` → lỗi; `BO_DANH_DAU` không khôi phục đúng giờ trước → lỗi;
  - `DA_GOI` khi chặng không còn suất `WAITING` trên chuyến `PLANNED`/`RUNNING` → lỗi;
  - bài "thân trigger chỉ đọc bảng `vc_` hoặc view công bố" ([KH] mục 1.4) phủ cả trigger mới.
  - P16: bỏ từng trigger → ca tương ứng đỏ.
- **TC-GB-2 — chụp mốc:**
  - xếp chặng lần đầu → đúng **một** dòng `XEP`, `seq = 1`, ngày giờ = giờ hẹn đọc trong request;
  - tách đoàn xếp tiếp sang chuyến thứ hai → **không** thêm dòng;
  - P16: bỏ câu chụp khỏi lô xếp → lô xếp bị trigger `vc_trip_allocation_needs_appt` chặn (409), không suất nào được mở.
- **TC-GB-3 — luật thuần `mucGioHenDoi`** (bảng ca trong `goi-bao.test.ts`):
  - không đổi → không mục;
  - 09:00 → 09:15 trên chuyến 09:00–10:45 → **có** mục (ca bản vẽ; `GIO_HEN_NGOAI_CHUYEN` của lịch **không** báo);
  - đổi ngày → mục kèm ngày; giờ → "chưa chốt giờ" → có mục;
  - đổi rồi đổi về giờ mốc → không mục;
  - khách `BOARDED` / `NO_SHOW` / `CANCELLED_AT_STOP` hết → không mục;
  - chuyến `ENDED` / `CANCELLED` → không mục; chuyến `RUNNING` còn khách chờ → có mục;
  - đơn huỷ / chặng đóng → không mục (lý do giữ cũ vẫn hiện);
  - chặng trên hai chuyến → **một** mục, hai mã chuyến.
- **TC-GB-4 — không tái mốc:**
  - xếp (09:00) → đổi 09:15 → "cập nhật điểm theo đơn" (`STOP_CHANGED`) → mục **vẫn** "09:00 → 09:15";
  - như trên với "dời sang chuyến khác" (`MOVED`);
  - rút khỏi xe → không mục; xếp lại → mục "09:00 → 09:15";
  - P16: đổi luật thành "chụp mỗi lần mở suất" → ca `STOP_CHANGED` đỏ.
- **TC-GB-5 — lệnh "Đã gọi báo":**
  - 200 → một dòng `DA_GOI` (`seq + 1`, giờ mới, giờ cũ) và một dòng nhật ký cùng `id`; mục hết khỏi danh sách nhắc; V2 có `daGoiBao`;
  - cùng `requestId` lần hai → 200 kết quả cũ, không thêm dòng;
  - `phienBan` cũ hoặc `gioMoi` lệch giờ hiện hành → 409 `gio_hen_vua_doi`, không ghi gì;
  - không còn mục → 409 `khong_con_can_goi`;
  - hai người bấm **song song** (bài chạy đua trên D1 local, khuôn TC-33) → đúng một 200, còn lại 409, đúng một dòng;
  - chuyến `RUNNING` còn khách chờ → 200, `vc_trip.version` **không đổi**;
  - đổi giờ lần nữa sau khi bấm → mục hiện lại "giờ đã báo → giờ mới";
  - bài thứ tự lô (A14) liệt kê **tường minh** `lenhDaGoiBao`, `lenhBoDanhDauGoiBao`: đúng hai câu (cổng `CONG_MOC` `INSERT` có điều kiện `max(seq)`, rồi `NHAT_KY` với `changes() > 0`).
  - P16:
    - thêm một câu thứ ba vào lô → bài đỏ;
    - bỏ điều kiện `max(seq)` → bài đỏ;
    - bỏ một tên khỏi danh sách ngoại lệ → bài đỏ;
    - một hàm lạ dùng nhãn `CONG_MOC` → bài đỏ.
- **TC-GB-6 — quyền:**
  - Bán hàng người lập → 200; Bán hàng người phụ trách (không phải người lập) → 200;
  - Bán hàng khác → 403 và `baoDuoc = false` ở danh sách nhắc;
  - Kế toán → 403 và `baoDuoc = false`; Quản trị, Toàn quyền → 200;
  - **thứ tự mã cố định:** Kế toán trên chặng đã đóng / đơn đã huỷ → vẫn **403** (không 409); id chặng lạ → 404; Bán hàng khác trên chặng đơn đã huỷ → 403 (không 409);
  - HDV, Đối tác, Thực tập, Tài xế, Tài xế đối tác → bị cổng chặn (403) ở cả ba route mới;
  - bài ghim `MATRIX` (hàng; ⊆ `order.trip.edit`; ⇒ `trip.view = any`, `contact.view ≠ none`);
  - hàng rào 1, hàng rào 2 xanh.
  - P16:
    - đổi ô Bán hàng thành `any` → bài ghim "⊆ `order.trip.edit`" đỏ và ca "Bán hàng khác → 403" đỏ;
    - bỏ `assigned` khỏi lời gọi `can()` → ca "người phụ trách → 200" đỏ;
    - bỏ lời gọi `can(trip.call_ack…)` → hàng rào 1 đỏ.
- **TC-GB-7 — "Bỏ đánh dấu":**
  - sau `DA_GOI` → 200, dòng `BO_DANH_DAU` khôi phục đúng giờ trước, mục hiện lại "A → B" trong danh sách nhắc;
  - `phienBan` không phải dòng `DA_GOI` cuối → 409;
  - khách đã lên xe (điều 1 sai) → 409 (và trigger `…_active` chặn khi gỡ kiểm ở máy chủ — P16);
  - cùng quyền, cùng thứ tự mã như TC-GB-6.
- **TC-GB-8 — nhật ký:**
  - `detail` đúng danh sách trắng (bài so mẫu);
  - `orderId` NULL (P16: ghi `orderId` → đỏ);
  - bài quét nhật ký sau mọi route mới: không SĐT, không họ tên hay năm sinh khách, không chữ nơi tự do, không chuỗi `L:` / `T:` (mở rộng `src/hanh-khach-khong-lo-ten.test.ts`).
- **TC-GB-9 — DTO:**
  - danh sách nhắc có đúng tập khoá `{ legId, orderCode, chieu, noiDon, ngayChuyen, gioHenDoi }`, không tên người lập / phụ trách;
  - `GET /chuyen/:id` có `gioHenDoi` / `daGoiBao` đúng khoá, `nguoiBam` chỉ là nhãn tên nhân viên;
  - DTO tài xế (route 19, 20) **không** có `gioHenDoi`, `daGoiBao`, `phienBan` (mở rộng bài liệt kê khoá TC-50).
- **TC-GB-9b — không mang tên người của `hanhKhachChoChuyen`** (sửa theo người kiểm, VỪA-1):
  - gieo một đơn có hành khách tên riêng dễ nhận (ví dụ "Kiểm Thử Tên Riêng", năm sinh 1987) trên chặng đổi giờ;
  - gọi danh sách nhắc, `GET /chuyen/:id`, "Đã gọi báo", "Bỏ đánh dấu";
  - kiểm:
    - toàn bộ JSON của danh sách nhắc;
    - khối `gioHenDoi` / `daGoiBao` của V2 (phần khác của V2 có `hoTen`, `namSinh` theo [KH] mục 1.8 — ngoài phạm vi bài này);
    - `detail` nhật ký của hai route ghi.
  - Không nơi nào có khoá `nguoi`, `fullName`, `birthYear`, `hoTen`, `namSinh`, chuỗi tên đã gieo hay "1987";
  - P16: chèn `nguoi` (mảng của `hanhKhachChoChuyen`) vào DTO danh sách nhắc → bài đỏ.
- **TC-GB-9c — phạm vi danh sách nhắc (Q-GB-3 = (a)):**
  - chuyến ngày mai có chặng đổi giờ → danh sách hôm nay có mục, `ngayChuyen` đúng;
  - chuyến hôm nay + 14 → có; hôm nay + 15 → không;
  - chuyến hôm qua đang chạy còn khách chờ → có;
  - chặng có ngày đón dời xa (hôm nay + 20) nhưng chuyến ở hôm nay + 2 → **vẫn** có mục, hiện đúng ngày giờ mới (đọc theo id);
  - `GET /lich?ngay=D` **không** chứa mục loại `GIO_HEN_DOI`;
  - Kế toán → 200 (`baoDuoc = false`); HDV, Tài xế → 403;
  - P16:
    - đổi lọc sang ngày hẹn của chặng → ca "ngày đón dời xa" đỏ;
    - bỏ `can(trip.view)` → hàng rào 2 đỏ.
- **TC-GB-10 — câu kiểm định kỳ R-VC-17, R-VC-18:** dữ liệu sạch → 0; gieo lỗi (gỡ trigger trên bản sao) → đúng số; P16: gỡ vế chính của câu → ca gieo không bắt (đỏ ở bài).
- **TC-GB-11 — kiến trúc:**
  - SQL mới qua `defineSql`, chỉ ghi bảng `vc_`, ngoài `vc_` chỉ đọc `v_ord_order_owner`, `v_ord_leg_key` (bài `EXPLAIN` của module nghiêm);
  - `hanhKhachChoChuyen` / `lichChungChang` chỉ gọi trong thân route sau `can(` (bài `CONG_BO`);
  - không module nào import `van-chuyen`.
- **TC-GB-12 — e2e** (`tests/e2e/dieu-phoi.mjs`, khối mới):
  - xếp → người lập sửa giờ trên đơn → danh sách nhắc có mục;
  - Bán hàng khác bấm → 403;
  - người lập bấm → 200 → mục hết;
  - bỏ đánh dấu → mục hiện lại; bấm lại → mục hết;
  - sửa giờ lần nữa → mục hiện lại;
  - `audit-invariants` cuối bộ xanh (R-VC-17/18 = 0).

### Task B-GB — giao diện (cùng Phần B của [KH]; theo bản vẽ đã sửa theo căn cứ)

- **Bước 1 — V1, cột "Cần xử lý":**
  - thẻ `GIO_HEN_DOI` theo [BV]:59, nguồn là `GET …/nhac-goi-khach`, hiện ở mọi ngày đang xem, nhãn "Chuyến dd/mm" khi khác ngày đang xem;
  - bỏ "Gọi tài xế" ([BV]:60, H7);
  - **bỏ** nút "Đã gọi báo" ở thẻ "Giờ xe tới muộn hơn giờ hẹn" ([BV]:61; Q-GB-1 = (b)) — thẻ chỉ còn chữ và "Ai xử lý";
  - nút xuống dòng ở 1040 và 390 ([ĐC] mục 4: bỏ `nowrap`).
- **Bước 2 — sau khi bấm và V2:**
  - dải báo "Đã ghi: đã gọi báo khách TD-… — Bỏ đánh dấu";
  - dòng điểm dừng V2 theo [BV] 02:232 với nút "Đã gọi báo" / "Bỏ đánh dấu".
- **Bước 3 — chữ:** câu lỗi 409 dùng chung "Giờ hẹn vừa đổi hoặc đã có người báo — tải lại" (khuôn H10); nhãn lấy từ hằng `src/shared/goi-bao.ts`, màn không tự đặt chữ.
- **Bước 4 — kịch bản Chrome:** V1, V2 ở 390 và 1040, ba vai (Bán hàng người lập, Bán hàng khác, Kế toán).
  - Trang của tài khoản nào mở **sau cùng** (bẫy cookie chung — `CLAUDE.md` §10).
  - Ảnh vào `docs/evidence/`.
  - Không `innerHTML`; giá trị CSS qua token.

**Tiêu chí nghiệm thu:**

- **TC-GB-13 — V1:**
  - thẻ hiện nhãn "Giờ hẹn đổi — gọi báo khách", "<mã đơn> · <nơi đón>", "Giờ hẹn đón đổi 09:00 → 09:15 · CX-…", "Ai xử lý: người phụ trách đơn";
  - xem ngày khác vẫn thấy thẻ của chuyến ngày mai, có nhãn "Chuyến dd/mm";
  - nút "Đã gọi báo" chỉ khi `baoDuoc`; Kế toán, Bán hàng khác không có nút;
  - thẻ `GIO_XE_TOI_MUON_HON_HEN` **không** có nút "Đã gọi báo" (bài dựng DOM đếm nút);
  - không tràn ngang ở 390; không chữ Anh.
- **TC-GB-14 — sau khi bấm:**
  - thẻ biến mất; dải báo "Đã ghi…" có "Bỏ đánh dấu";
  - bấm "Bỏ đánh dấu" → thẻ hiện lại;
  - 409 → câu tải lại, thẻ còn nguyên.
- **TC-GB-15 — V2:** dòng điểm có "Giờ hẹn đổi A → B — đã gọi báo khách (<tên>, HH:MM)" kèm "Bỏ đánh dấu" theo `boDuoc`, hoặc "— chưa gọi báo" kèm nút theo `baoDuoc`.
- **TC-GB-16 — tài xế:** màn "Cuốc của tôi" và chi tiết cuốc không đổi (bài liệt kê khoá TC-GB-9 + ảnh so trước / sau).
