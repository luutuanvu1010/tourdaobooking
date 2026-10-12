# ADR-0052 — Bảng điều phối chung, lượt duyệt 2: chuyển điểm đón giữa hai xe (máy tự xác nhận); thay đổi khi xe đang chạy (thêm điểm, báo huỷ, cứu hộ, tài xế bổ sung tên); thông báo và Bảng tin cho chuyến

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-09-30 hai hộp hỏi: "Bạn có duyệt A-1 — ADR-0052 phần đầu (nhờ xe khác đón, ba việc văn phòng được làm khi xe chạy, tin báo) không?" → **"Duyệt A-1"**; và "Bạn có duyệt A-1b — ADR-0052 phần sau (cứu hộ chuyển khách, xe cứu hộ nhà xe phải có giá, tài xế ghi tên khách chưa có tên) không?" → **"Duyệt A-1b"**. Toàn bộ ADR (D4, D5 gồm D5b, D5c, D6) accepted. Câu hỏi của đề xuất đã được chủ trả lời ở sổ hỏi đáp Vận chuyển lần 16 và 17 (hệ quả ADR-0057 lần 18–19); người kiểm độc lập chỉ-đọc ĐẠT (các vòng lượt A; kiểm nhanh cuối @ `3bc38d7`, sửa chữ theo đó ở `eebcf15`). AI ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này. **Bổ sung bởi ADR-0053** (duyệt 2026-09-30): D4.3 `trip.transfer` và D5b `trip.passenger.add` của cột `DRIVER_PARTNER` đổi `none` → `assigned` (tài xế đối tác dùng app cho chuyến; ô `trip.passenger.add` của họ chỉ mở vì A-1b đã duyệt) — nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0053. *(Ghi chú gộp 2026-09-30: "Trả lời lần 16–22" nhắc trong ADR này là số cũ trên nhánh phiên sổ tiền; sau khi gộp với nhánh `ghi-trang-thai-1-37` nay là **lần 19–25** — bảng đối chiếu cuối `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`.)* **Bổ sung bởi [ADR-0097](ADR-0097-su-kien-dieu-chinh-co-ly-do.md)** (accepted 2026-10-03): D6.1 / `:210` danh sách tin chuyến đóng + `trip_allocation_corrected`, `trip_departure_revoked` (người nhận: tài xế đang lái + người có `trip.dispatch`). **Bổ sung/sửa bởi [ADR-0104](ADR-0104-dieu-chinh-khan-cap-va-dong-bo-chuyen.md)** (accepted 2026-10-08): thêm khách vào xe đang chạy / chặng khác trong mốc: điều chỉnh khẩn cấp của Bán hàng, Quản trị, Toàn quyền (`:29`, `:98`, `:192`, bài 7 `:246`); danh sách hành động sinh tin D6.1 (`:148`) thêm đồng bộ chuyến theo đơn và xếp / rút / dời khách lớp khẩn cấp; đề nghị chuyển khách leo thang (`:77`, `:80-85`) vẫn `trip.override`; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0104. **Sửa câu bởi [ADR-0111](ADR-0111-chuyen-khach-giua-xe.md)** (accepted 2026-10-08, lượt 8d-1 và 8d-2): D4 — `rule_code` thành danh mục `vc_transfer_rule` 11 dòng (thêm `CAM_KET_DICH`, `CHANG_KHACH_HIEU_LUC`) và rời danh sách tập đóng (`:64`, `:210`); cột quyết định đặt theo cạnh trạng thái, ghi lại đúng một lần ở cạnh `ESCALATED → CONFIRMED | REJECTED` (`:63`); `policy_id` = dòng chính sách lúc gửi (hạn chờ), công tắc tự đồng ý đọc lúc tài xế đích bấm Nhận (`:62`, `:66`); suất mang `transfer_id` (đề nghị mở) và `closed_transfer_id` (đề nghị đóng) (`:65`, `:110`, `:188`, `:221`, `:238`); thứ tự lô xác nhận viết lại cho chạy được (`:70`, sửa chữ); luật tầng `CAU_HINH` = `KHOANG_NGHI_DICH`, `MOC_TOI_THIEU`, `CAM_KET_DICH`, duyệt có `CAM_KET_DICH` không đạt thì cùng lô ghi khoá cam kết chuyến đích (`:80`); D6 — thêm tin "đề nghị **không nhận**" tới tài xế nguồn (`:148`, `:159`); D5c — cứu hộ `ONBOARD` chỉ sang xe đích đang chạy, "mọi suất mở" gồm suất người đi kèm (`:69`, `:89`, `:129`); chặng đặt gấp không được miễn mốc khi chuyển sang đích chưa chạy (`:77`, `:192` giữ chữ; câu bổ sung ở dòng Xếp ADR-0049 `:162`); nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0111. **Sửa câu bởi [ADR-0112](ADR-0112-bao-tai-xe-khi-bam-cap-nhat-theo-don.md)** (accepted 2026-10-09): D6.1 (`:148`) — cập nhật điểm theo đơn sinh tin cả khi xe chưa chạy, thêm cập nhật khách theo đơn (`trip_passengers_synced`, nhóm tin thường); D6.2 (`:157`) — người nhận là tài xế có dòng lái lúc sự kiện, câu "Văn phòng vừa đổi điểm đón ở chuyến … — mở để xem" / "Đơn vừa đổi khách ở chuyến … — mở để xem"; chỉ tính từ mốc phát hành; nguyên văn → mới ở bảng "Câu ADR bị thay" của ADR-0112.
  - Soạn từ bản đề xuất `docs/superpowers/specs/2026-09-30-de-xuat-adr-dieu-phoi-luot-2.md` (giữ nguyên nội dung từ đây trở xuống; lượt duyệt A-1 và A-1b, trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`).
  - **Ngày duyệt:** 2026-09-30. **Người phê chuẩn:** chủ dự án.
- **Ngày:** 2026-09-30.
- **Thuộc gói:** lượt duyệt A, trang ghép chung `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`. **Năm quyết định chạm dữ liệu/quyền, chia hai lượt duyệt** để giữ đúng chữ trần 3 của `CLAUDE.md` §9 (người kiểm độc lập V6): **lượt A-1 = D4 (chuyển điểm), D5 (thêm điểm, báo huỷ, LC-15 mới), D6 (thông báo)**; **lượt A-1b = D5c (cứu hộ — quyền bấm thay qua `trip.progress`) và D5b (tài xế ghi tên khách vào `ord_passenger`)**, duyệt sau A-1 (lượt riêng; chỉ ghép với lượt khác sau khi đếm lại trần 3). D6 (thông báo) nằm ở lượt này vì [TK] §6.4 đặt nó ở lượt 2 và D4 cần báo tài xế B ([TK] `:927`); ADR-0051 cũng hẹn phần tin đẩy cho "lượt 2 D6" (`ADR-0051:97, :227, :278, :491`).
- **Nguồn (lời chủ, chuẩn — không hỏi lại):**
  - [HĐ] = `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md`:
    - "Cách xe chạy thật" mục 7 (chuyển điểm khi xe chạy): *"Tôi nghĩ về phương án B, bảng điều phối chung sẽ nhận được thống tin này, tự động kích hoạt các logic có sẵn để tính toán, Ưu tiên luồng B nhận -> Điều phối xác nhận tự động"* — văn phòng **chỉ thêm điểm đón**, tài xế đề nghị với nhau;
    - mục 8 (bớt/huỷ điểm khi xe chạy): *"Được, kèm lý do, nhưng mặc định là tài xế hoàn thành điểm đón (trên thực tế có thể không đón được khách đã huỷ nhưng tài xế đang đến đó và không làm được việc khác.)"*;
    - mục 9: **không** tự báo khách khi đổi giờ; hệ thống nhắc người phụ trách / tài xế gọi;
    - "Trả lời lần 16" (30/9): **ĐP4 = a — "Có, kèm lý do"**; **ĐP5 = a — "Tài xế đề nghị"**; **ĐP9 = a — "Mã, tài xế, chỗ trống"**; **ĐP13 = a — "Không"**.
  - Phương án nguyên văn: [TK] `:1099-1102` (ĐP4), `:1104-1108` (ĐP5), `:1133-1137` (ĐP9), `:1157-1160` (ĐP13). ĐP5(a): *"tài xế xe hỏng gửi đề nghị "chuyển khách đang trên xe" sang xe cứu hộ, tài xế cứu hộ Nhận, máy tự xác nhận nếu đủ chỗ. **Văn phòng bấm thay được** cho tài xế xe hỏng (như đã cho bấm thay Xuất bến, Đã đón), có ghi người bấm."*
  - [TK] C9, C10, C11, C15 (`:41-44`, `:45`) — lời chủ đã ghi, chủ không phản đối.
- **Thiết kế dẫn:** [TK] §1.8 (`:211-244`), LC-14, LC-15 (`:338-339`), CH-07, CH-08 (`:378-379`), MQ-02…MQ-09 (`:393-400`), §2.4 (`:411-413`), §3.3 cổng đôi (`:499-505`), §3.5 (`:523-540`), §5.5–§5.9 (`:766-836`), §6.1 (`:866-878`), §6.5.2 (`:971-977`), lát 2.1–2.4 (`:1191-1194`, `:1261-1278`).
- **ADR liên quan:** ADR-0049 (bảng `vc_trip*`, LC-15 dạng khoá hẳn, ô `trip.*`, DTO tài xế — **bị nới/thay** vài câu), ADR-0050 (giờ xảy ra khi bấm thay; `STOP_CHANGED` trên xe đang chạy hoãn tới "lượt 2 D5"), ADR-0051 (mốc giờ hẹn, trigger `vc_trip_allocation_needs_appt`; tin đẩy hoãn tới "lượt 2 D6"), ADR-0047 A2 (`source = 'DRIVER'`), ADR-0022, ADR-0034, ADR-0036, ADR-0039, ADR-0045 (thông báo, Bảng tin), ADR-0007 điều 4(b) (hàm tiêm), ADR-0019 (cổng), ADR-0048 (**không đổi** ở lượt này). Hiến chương Phần I (đã duyệt): 1.2, 1.4, 4.1, 4.4, 5.1, 5.2, 5.3, 5.5, 5.6, 5.8, 5.10, 5.11, 5.12, 5.15, 5.16.
- **Xây trên lỗ đang hở:** **không có.** `docs/quyen-hoan.json` mục `phat_hien` = `[]` (kiểm 2026-09-30, HEAD `3fc295b`). Không dùng ô hoãn nào của `thao_tac` (kể cả `task.progress`).
- **Xây trên nền chưa có (Hiến chương 5.13) — ghi rõ:** lượt này xây trên **ADR-0049, ADR-0050, ADR-0051 CHƯA gộp `main`, CHƯA phát hành**. Mã ở nhánh `thi-cong-adr-0049-tiep` (máy chủ) và `giao-dien-dieu-phoi-luot-1` (giao diện); người kiểm độc lập K2c đạt có điều kiện; chủ chọn "xem từng mục luật lúc gộp" ([HĐ] lần 16, mục 1.1). Migration `0034`, `0035`, `0040`–`0043` **chưa áp remote** (kiểm chỉ-đọc 30/9, [HĐ] lần 15). Nếu một mục luật của ADR-0049 bị chủ bác lúc gộp (vd bảy ô mới, nới bài ghim hàng `DRIVER`), phần tương ứng ở đây phải soạn lại.
- **Không đụng tiền:** chuyển điểm, cứu hộ, báo huỷ không sinh bút toán; tiền xe thuê chỉ tính theo chuyến ([HĐ] lần 16, tiền Q9 a) — thuộc ADR tiền xe thuê.

---

## Tóm tắt cho chủ (lời thường)

1. **Nhờ xe khác đón:** tài xế A chọn điểm chưa tới, chọn xe B, bấm Gửi; B bấm **Nhận** → máy kiểm chỗ, giờ, giờ nghỉ, bằng lái → đạt thì **máy tự xác nhận**. 10 phút không nhận thì hết hạn.
2. Thiếu chỗ, trùng giờ, sai bằng: chỉ bác. Thiếu giờ nghỉ, hoặc xe nhận **chưa chạy** mà đã trong 6 giờ: Quản trị / Toàn quyền duyệt, có lý do (ĐP4; bạn chọn lần 17).
3. Tài xế thấy xe khác: mã chuyến, tên tài xế, chỗ trống, điểm sắp tới — không thấy khách (ĐP9).
4. Xe đang chạy, văn phòng chỉ: **thêm điểm đón** (khách không "đặt gấp" cần Quản trị phá lệ), **báo huỷ điểm** (tài xế vẫn tới), và **đổi điểm đón theo đơn** khi khách đổi khách sạn (cùng xe, khách đang chờ, điểm chưa tới — bạn chọn lần 17).
5. **Xe hỏng (lượt A-1b):** tài xế hoặc văn phòng bấm thay gửi "chuyển khách" sang xe cứu hộ; tài xế cứu hộ bấm Nhận. Xe cứu hộ của **nhà xe** phải **có giá trước khi chạy** (giá bảng hoặc giá thoả thuận Quản trị / Kế toán / Toàn quyền nhập) — không ngoại lệ (ADR-0057).
6. **Tài xế bổ sung tên khách chưa có tên** lúc đón (lượt A-1b); Bán hàng không sửa tên trên màn chuyến (ĐP13).
7. Tin báo tới tài xế (xếp, gỡ, đổi giờ, đề nghị) và Quản trị (cần duyệt); không tên, không SĐT khách.
8. Tài xế đối tác chưa dùng app ở lượt này (lượt A-2).
9. **Một chiều:** mỗi đề nghị, kết quả kiểm, tên khách tài xế nhập là chứng cứ không xoá.
10. Bạn cần: xác nhận đáp án bộ ca mẫu xe A/B; vẽ V4, V8–V11.

---

## Bối cảnh

ADR-0049 khoá hẳn kế hoạch của chuyến đang chạy (LC-15 "lượt 1: khoá hẳn") và hẹn lượt 2 nới đúng hai đường. ADR-0050 VK1-B hoãn việc "cập nhật điểm theo đơn" trên xe đang chạy tới "lượt 2 D5"; ADR-0051 hoãn tin đẩy tới "lượt 2 D6". Chủ đã trả lời bốn câu ĐP4, ĐP5, ĐP9, ĐP13 ngày 30/9. Bảng hôm nay (nhánh `thi-cong-adr-0049-tiep`, `migrations/0042_chuyen_xe.sql`) đã **định sẵn** các giá trị lượt này cần:
- `vc_trip_allocation.close_reason` có `TRANSFERRED` (`0042:133`);
- `vc_trip_stop.status` có `MOVED` (`0042:97`);
- `vc_trip_event.kind` **không** có `CHECK` liệt kê — danh sách mã ở `LOAI_SU_KIEN_CHUYEN` (`src/shared/dieu-phoi-kieu.ts:34-39`), thêm mã bằng mã nguồn;
- nhóm lý do `TU_CHOI_NHAN`, `BAO_HUY_DIEM` đã có trong `NHOM_LY_DO` (`dieu-phoi-kieu.ts:14`).

**Chưa có** (lượt này thêm bằng migration chỉ-thêm cột / bảng mới): `vc_trip_allocation.office_cancel_*`, `vc_trip_allocation.transfer_id`, `vc_trip_stop.added_while_running`, bảng `vc_transfer_request`, `vc_transfer_check`, hai cột chính sách.

---

## Quyết định

### D4. Chuyển điểm đón giữa hai xe + máy tự xác nhận (ĐP4 a, ĐP9 a)

**D4.1 Dữ liệu** (module `van-chuyen`, tiền tố `vc_`). Nếu chủ duyệt A-1 mà **bác** A-1b: tập `scope` vẫn định trọn (`STOP`, `ONBOARD`), nhưng đề nghị `ONBOARD` **chỉ do tài xế xe hỏng gửi** (ô `trip.transfer`); văn phòng không bấm thay.
- **`vc_transfer_request`** — đề nghị chuyển, thực thể có trạng thái (Hiến chương 5.16: trạng thái chờ nằm trong CSDL):
  - `id`, `from_trip_id`, `to_trip_id`;
  - `scope` `CHECK IN ('STOP','ONBOARD')` — `STOP`: một cụm đón **chưa tới** của xe nguồn; `ONBOARD`: khách **đang trên xe / đang chờ** của xe nguồn (cứu hộ, D5c). `CHECK` đúng trường theo phạm vi: `STOP` ⇒ `from_stop_id` NOT NULL, nơi gặp NULL; `ONBOARD` ⇒ `from_stop_id` NULL, đúng một trong `meet_location_id` / `meet_place_text`;
  - `pax_count` (số suất bị chuyển, chụp lúc gửi — không tên);
  - `proposed_by_party_id` (tài xế nguồn), `proposed_by_staff_id` (tài khoản bấm — khác khi văn phòng bấm thay, D5c), `proposed_at`;
  - `status` tập đóng, chỉ đi tiến: `PENDING → WITHDRAWN | DECLINED | EXPIRED | VOID | CONFIRMED | ESCALATED`; `ESCALATED → CONFIRMED | REJECTED | VOID` ([TK] §1.8). **Không** có `ESCALATED → EXPIRED`: đề nghị leo thang chờ tới khi Quản trị duyệt/bác, hoặc thành `VOID` khi nguồn/đích đổi (điểm đã tới, chuyến kết thúc — MQ-09); `accept_wait_minutes` chỉ áp cho `PENDING`;
  - `decided_mode` (`MAY`/`NGUOI`), `decided_by`, `decided_at`, `policy_id` (dòng `vc_dispatch_policy` đã dùng — 5.6), `decline_reason_code` (nhóm `TU_CHOI_NHAN`), `override_reason_code` (nhóm `PHA_LE`, khi Quản trị duyệt), `reject_reason_code`;
  - dấu vết. Không xoá; không sửa nội dung (chỉ đổi trạng thái đi tiến + cột quyết định đặt một lần).
- **`vc_transfer_check`** — bằng chứng "máy xác nhận theo luật nào", chỉ-thêm, cột có kiểu, **không JSON** (5.2, 5.6): `transfer_id`, `rule_code` tập đóng `CHECK IN ('SUC_CHUA_DICH','SUC_CHUA_NGUON','TRUNG_GIO_DICH','KHOANG_NGHI_DICH','MOC_TOI_THIEU','HANG_BANG_DICH','GIAY_TO_DICH','KHONG_CHEO','DIEM_CHUA_TOI')` (`MOC_TOI_THIEU` định sẵn cho Q-L2-B a), `ket_qua` `CHECK IN ('DAT','KHONG_DAT','CANH_BAO')`, `gia_tri`, `gioi_han` (INTEGER), `policy_row_id`, `rule_tier` `CHECK IN ('LOI','CAU_HINH')` (luật lõi hay luật cấu hình — ĐP4 rẽ nhánh theo cột này, không theo chữ).
- **`vc_trip_allocation.transfer_id`** (chỉ thêm cột): suất đóng `TRANSFERRED` hoặc suất mở bởi một lần chuyển trỏ tới đề nghị.
- **`vc_dispatch_policy`** thêm hai cột (chỉ thêm, có `DEFAULT` cho dòng cũ; Toàn quyền — `settings.ops`): `accept_wait_minutes` (gieo 10), `auto_confirm_transfer` (0/1, gieo 1 — công tắc an toàn: tắt thì mọi đề nghị B đã nhận thành `ESCALATED`).

**D4.2 Luật**
- **LC-14** (lõi, [TK] `:338`): tạo đề nghị chỉ khi chuyến nguồn `RUNNING`; chuyến đích `PLANNED` hoặc `RUNNING`, **cùng ngày chạy**; người gửi là tài xế đang mở của nguồn (hoặc văn phòng bấm thay với `ONBOARD` — D5c); người nhận là tài xế đang mở của đích; hai tài xế khác nhau; `STOP`: điểm nguồn `PENDING` và mọi suất mở của điểm `WAITING`. [CSDL] trigger trên `vc_transfer_request` (mọi dữ liệu cùng module) + [MC].
- **Xác nhận = một lô, cổng đôi** ([TK] §3.3 `:499-505`): cổng A (kiểm `version` cả hai) → cổng B (đòi dấu lệnh của A) → nhật ký `changes() > 0` → đổi trạng thái đề nghị → dòng `vc_transfer_check` → đóng suất ở A (`TRANSFERRED`, `transfer_id`) → mở suất ở B (`added_after_departure` nếu B đang chạy, `transfer_id`) → thêm điểm đón (và điểm trả nếu B chưa có nơi đó) ở B (MQ-06, `added_while_running` nếu B đang chạy) → điểm A → `MOVED` (khi `STOP`) → dòng manifest mới ở B nếu B đã xuất bến → sự kiện. Tất cả hoặc không gì (1.2).
  - Suất mở ở B **không** chụp lại mốc giờ hẹn (ADR-0051:149 — chặng đã có mốc).
  - Suất mở ở B giữ **trạng thái** như ở A (`BOARDED` giữ `BOARDED` khi `ONBOARD`) — khuôn [TK] §5.9 bước 2.
- **MQ-02/MQ-03 — máy tự xác nhận** (lời chủ mục 7, C9): B bấm Nhận → hàm thuần `kiemChuyen` (một nguồn cho màn hình và máy chủ) xét đủ bộ `rule_code` → mọi dòng `DAT`/`CANH_BAO` **và** công tắc bật → `CONFIRMED`, `decided_mode = 'MAY'`, `decided_by` = B. Có dòng `KHONG_DAT` → `ESCALATED`, **không** đổi suất.
  - Xe nguồn chỉ bớt người: ghi `SUC_CHUA_NGUON` = `DAT` cho đủ bằng chứng.
  - "Chuyến sau của B có thể trễ": máy không biết đường đi (G-05) → chỉ `CANH_BAO` khi B có chuyến kế trong vòng 2 × khoảng nghỉ.
  - Tự thử lại **một lần** khi cổng thua vì `version` ([TK] `:508`).
- **Mốc 6 giờ khi chuyển (Q-L2-B = a, [HĐ] "Trả lời lần 17" (30/9): nguyên văn nhãn "Có; chỉ miễn khi xe nhận đang chạy").** Xe đích `RUNNING` → không kiểm mốc. Xe đích `PLANNED` mà đã trong mốc → đề nghị `ESCALATED` (dòng `vc_transfer_check` `MOC_TOI_THIEU`, `rule_tier = 'CAU_HINH'`), Quản trị / Toàn quyền phá lệ kèm lý do như ADR-0049 D2.
- **MQ-08 — hết giờ chờ:** tính lúc đọc từ `proposed_at` + `accept_wait_minutes` (chụp `policy_id` lúc gửi). Dòng đóng thành `EXPIRED` trong lô của **lệnh kế tiếp chạm tới nó** (A rút, A gửi lại, B nhận muộn, văn phòng mở). Cron **không** ghi (5.11).
- **MQ-09 — tự huỷ khi hết hợp lệ:** lệnh làm điểm nguồn tới (`ARRIVED`), A/B kết thúc chuyến, văn phòng báo huỷ đúng điểm đó → đề nghị `PENDING`/`ESCALATED` liên quan thành `VOID` **trong cùng lô**.
- **ĐP4 = a — văn phòng duyệt thay khi luật cấu hình không đạt:** đề nghị `ESCALATED` mà **mọi** dòng `KHONG_DAT` có `rule_tier = 'CAU_HINH'` (hôm nay chỉ `KHOANG_NGHI_DICH`) → người có `trip.override` (Quản trị, Toàn quyền) bấm **Duyệt** kèm **lý do bắt buộc** (nhóm `PHA_LE`) → `CONFIRMED`, `decided_mode = 'NGUOI'`, `decided_by` = người duyệt, `override_reason_code`; cùng lô đổi suất như trên. Có **bất kỳ** dòng `KHONG_DAT` thuộc luật lõi → **chỉ Bác** (`REJECTED`). [CSDL] trigger: `ESCALATED → CONFIRMED` đòi `override_reason_code` NOT NULL **và** không có dòng `vc_transfer_check` `KHONG_DAT` + `LOI` của đề nghị đó.
- **Bác** (`REJECTED`): cũng ô `trip.override`, lý do bắt buộc. Văn phòng xử lý tiếp bằng đường D5.1 (thêm điểm vào xe khác) sau khi A đã tới/bỏ qua điểm — hoặc A tự gửi đề nghị khác.

**D4.3 Quyền** (bảng đủ 9 cột ở trang ghép)
- **Ô mới `trip.transfer`** — gửi, rút, nhận, không nhận đề nghị: `DRIVER = assigned`, `SUPER_ADMIN = any` (ADR-0014 điều 2), **mọi cột khác `none`**. Route chốt thêm "người gửi đang lái chuyến nguồn / người nhận đang lái chuyến đích", **áp cả Toàn quyền** (khuôn ADR-0030 điều 1). `DRIVER_PARTNER = none` ở lượt này (lượt 3).
- **`trip.override`** (có sẵn, ADMIN, SA — `permissions.ts:138@thi-cong-adr-0049-tiep`) thêm nghĩa: duyệt / bác đề nghị `ESCALATED`.
- **`settings.ops`** (có sẵn, chỉ SA) thêm hai cột chính sách.

**D4.4 Danh sách trường tài xế thấy về xe khác (ĐP9 = a; Hiến chương 4.4, dựng từng khoá)**
- Khi chọn xe đích: **mã chuyến, tên tài xế, số chỗ còn trống, điểm sắp tới** (tên nơi; chữ tự do che dãy ≥ 8 chữ số) của các chuyến `PLANNED`/`RUNNING` **cùng ngày** có tài xế đang mở. **Không:** khách, số người từng điểm, mã đơn, biển số, SĐT tài xế, lộ trình đầy đủ.
- Đề nghị gửi tới B: mã chuyến nguồn, tên tài xế A, điểm, `pax_count`, nơi trả của các chặng bị chuyển, "sau khi nhận: x/y chỗ" (máy tính sẵn). **Tên, năm sinh khách của đề nghị: chỉ khi đã `CONFIRMED`** (lúc đó họ là khách trên xe B, theo DTO của ADR-0049 "trong ngày chạy").
- Nguồn danh sách: hàm đọc mới của `van-chuyen`, đứng sau `can(trip.transfer, { assigned })`; bài liệt kê khoá.

### D5. Thay đổi khi xe đang chạy (ĐP5 a, ĐP13 a) — nới LC-15 đúng các đường có tên

**D5.1 Văn phòng thêm điểm đón / thêm khách vào xe đang chạy** (C9 "văn phòng chỉ thêm")
- Ô `trip.dispatch` (có sẵn: SALES, ADMIN, SA = any — `permissions.ts:137`). Lệnh mở suất mới (`added_after_departure = 1`), điểm mới (`added_while_running = 1`, cột mới), dòng manifest mới nếu chuyến đã xuất bến.
- Qua đủ luật lõi: LC-01, LC-02, LC-09, LC-10, LC-13 (không đổi xe/tài xế), LC-12 không cần kiểm lại (xe, tài xế không đổi).
- **Mốc 6 giờ — giữ nguyên ADR-0049 D2 (dòng "Xếp"):** chuyến đang chạy luôn nằm trong mốc (giờ xuất bến dự kiến < bây giờ + mốc), nên thêm khách vào nó là đổi "ai đi xe nào" trong mốc: chặng mang "đặt gấp" → qua, không ghi lý do lần nữa; mọi chặng khác (kể cả chặng quay về "chưa xếp" sau Kết thúc gián đoạn) → **chỉ Quản trị, Toàn quyền phá lệ** (`trip.override`) kèm lý do — đúng ĐP3 và [TK] §5.9 lượt 1 ("Quản trị hoặc Toàn quyền phá lệ mốc 6 giờ kèm lý do 'Sự cố vận hành'"). Lượt này **không** nới mốc.
- **Chụp mốc giờ hẹn:** lô này **phải** ghi dòng `vc_leg_appt_ack` (`kind = 'XEP'`) khi chặng chưa có — trigger `vc_trip_allocation_needs_appt` (`0043`) đã canh (ADR-0051:146).
- Giờ sự kiện của suất thêm sau xuất bến ≥ `valid_from_at` của suất đó (ADR-0050 VK1-A vế 3, `ADR-0050:127`).

**D5.2 Văn phòng báo huỷ điểm (tài xế vẫn tới)** (C10; G-06 đọc chặt "mặc định")
- Cột mới trên `vc_trip_allocation`: `office_cancel_at`, `office_cancel_by`, `office_cancel_reason_code` (nhóm `BAO_HUY_DIEM`). Đặt **một lần**, chỉ khi suất `WAITING`; `CHECK` ba cột cùng có hoặc cùng vắng.
- **Không** đổi `status`, **không** đóng suất, **không** bỏ điểm. Suất **vẫn chiếm chỗ** tới khi tài xế ghi "Khách đã huỷ" (`CANCELLED_AT_STOP`) hoặc "Đã đón" (báo huỷ nhầm). MQ-09: đề nghị chuyển đang chờ cho điểm đó → `VOID` cùng lô.
- Ô `trip.dispatch`. Việc tiền của đơn (hoàn, phí huỷ) **không** ở Vận chuyển.

**D5.3 LC-15 mới** (thay câu ADR-0049; lõi, không ai phá lệ)
- Chuyến `RUNNING`:
  - **mở suất** chỉ khi `added_after_departure = 1` **và** (lệnh D5.1 **hoặc** xác nhận một đề nghị `CONFIRMED` — `transfer_id` NOT NULL — **hoặc** lô "cập nhật điểm theo đơn" D5.3a: suất mở mang `opened_cmd_id` = dấu lệnh hiện hành của chuyến, và trong **cùng lô** đã có một suất cùng chuyến, cùng chặng, cùng `passenger_key` vừa đóng `STOP_CHANGED` với `closed_cmd_id` = cùng dấu lệnh);
  - **đóng suất** chỉ với (`TRANSFERRED` + `transfer_id` trỏ đề nghị `CONFIRMED`) **hoặc** `TRIP_INTERRUPTED` trong lô "Kết thúc gián đoạn" (giữ nguyên ADR-0049) **hoặc** `STOP_CHANGED` khi suất `WAITING` ở điểm `PENDING` **và** chuyến mang dấu lệnh của một lô đã ghi sự kiện `ALLOCATION_STOP_CHANGED` (khuôn LC-05 / `TRIP_INTERRUPTED`) — **đóng không mở lại bị chặn ở câu chốt cuối lô** (D5.3a);
  - **Tóm lại, bốn đường mở/đóng suất có tên trên chuyến đang chạy:** (1) D5.1 văn phòng thêm; (2) đề nghị chuyển `CONFIRMED` (kể cả cứu hộ `ONBOARD`); (3) Kết thúc gián đoạn; (4) cập nhật điểm theo đơn. Báo huỷ (D5.2) chỉ đặt cờ, không mở/đóng suất;
  - **thêm điểm** chỉ khi `added_while_running = 1`;
  - đặt `office_cancel_*` trên suất `WAITING`;
  - **cập nhật điểm theo đơn** (D5.3a): đóng `STOP_CHANGED` + mở lại **cùng chuyến, cùng chặng, cùng người** ở điểm mới (`added_after_departure = 1`; điểm mới `added_while_running = 1`), chỉ với suất `WAITING` ở điểm `PENDING`;
  - **vẫn cấm:** đổi xe, đổi tài xế, văn phòng rút/dời suất (`REMOVED`, `MOVED`), `STOP_CHANGED` với suất đã `BOARDED` hoặc điểm đã tới, sửa giờ chuyến.
- [CSDL]: migration mới **bỏ và tạo lại** trigger LC-15 (và trigger LC-04 cho ba cột `office_cancel_*`) — không sửa tệp `0042` đã qua kiểm (điều phối có thể chọn sửa tại chỗ nếu `0042` vẫn chưa áp remote lúc thi công; xem "Điểm cho người kiểm").
**D5.3a "Cập nhật điểm theo đơn" trên chuyến đang chạy (Q-L2-A = a, [HĐ] "Trả lời lần 17" (30/9): nguyên văn nhãn "Có, có điều kiện" — cùng xe, khách đang chờ, điểm chưa tới; vẫn theo luật mốc 6 giờ phía đơn)**
- Lệnh `cap-nhat-diem` của ADR-0050 VK1-B (ô `trip.dispatch`) nay chạy được trên chuyến `RUNNING`, **chỉ** cho suất `WAITING` ở điểm `PENDING`; đóng suất cũ `STOP_CHANGED`, mở suất mới cùng chuyến / chặng / `passenger_key` ở điểm có nơi mới (thêm điểm `added_while_running` nếu chưa có). Số chỗ không đổi. Không chụp lại mốc giờ hẹn (ADR-0051:149).
- **Mốc 6 giờ phía đơn giữ nguyên:** sửa nơi đón trên đơn đã xác nhận khi dưới mốc vẫn chỉ Quản trị / Toàn quyền (ADR-0049 D2, câu thay ADR-0047 A1). Lệnh phía chuyến không đòi phá lệ thêm (không đổi "ai đi xe nào" — ADR-0050 VK1-B).
- **Một suất đóng ↔ đúng một suất mở (điều phối chốt sau kiểm @1dcabd5), không gỡ được khách khỏi xe đang chạy:**
  - **Vì sao không "mở trước, đóng sau" như điều phối đề nghị:** chỉ mục duy nhất LC-01 `(leg_id, passenger_key) WHERE valid_to_at IS NULL AND passenger_key IS NOT NULL` (ADR-0049 D1) **không** gồm điểm — mở suất mới trước khi đóng suất cũ của **cùng người** vi phạm UNIQUE, dù điểm mới khác điểm cũ. Không nới chỉ mục (nới là mất "mỗi người một chuyến tại mỗi lúc"). Vì vậy thứ tự lô là **đóng → mở → câu chốt**, cho cùng bảo đảm:
  - lô: câu cổng (đặt `last_cmd_id`) → nhật ký → sự kiện `ALLOCATION_STOP_CHANGED` (id = dấu lệnh) → đóng suất cũ `STOP_CHANGED`, ghi `closed_cmd_id` = dấu lệnh → mở suất mới, ghi `opened_cmd_id` = dấu lệnh → **câu chốt cuối lô** `UPDATE vc_trip SET version = version WHERE id = :T AND last_cmd_id = :cmd`;
  - **trigger ở câu chốt** (khuôn LC-16 "kiểm ở câu cuối"): với dấu lệnh hiện hành, mỗi cặp (chặng, `passenger_key`) có số suất đóng `STOP_CHANGED` **bằng đúng** số suất mở cùng dấu lệnh (suất chưa tên: đếm theo chặng) → không bằng thì `RAISE`, cả lô huỷ. **Cả hai phía đếm với `trip_id = chuyến của lô`** (suất mở ở chuyến khác cùng dấu lệnh không được tính cho khớp). **Suất có tên và suất chưa tên là hai nhóm tách nhau:** suất có tên chỉ đối chiếu với suất có tên cùng `passenger_key`; suất chưa tên (`passenger_key IS NULL`) chỉ đối chiếu với suất chưa tên cùng chặng — không gộp (không cho đóng một suất chưa tên rồi mở suất có tên của người khác). Trigger khai `AFTER UPDATE OF version` (đã thử trên `node:sqlite`: câu chốt `SET version = version` có kích hoạt khi khớp `last_cmd_id`). Tiêu chí 6 thêm ca: "đóng ở chuyến A, mở suất ở chuyến B cùng dấu lệnh → `RAISE`"; "đóng suất chưa tên, mở suất có tên → `RAISE`";
  - hai cột mới trên `vc_trip_allocation` (chỉ thêm, đặt một lần): `opened_cmd_id`, `closed_cmd_id`;
  - lệnh SQL tay đóng `STOP_CHANGED` mà không có sự kiện `ALLOCATION_STOP_CHANGED` mang đúng dấu lệnh → `RAISE` (trigger phía đóng); có sự kiện nhưng không mở lại → `RAISE` ở câu chốt; không chạy câu chốt → câu kiểm định kỳ bắt (lưới thứ hai, dưới).
- Tài xế nhận tin "đổi điểm đón X → Y" (D6.2). Nhật ký `trip_stops_synced` như ADR-0050; **`detail` chỉ dùng nhãn nơi đã che dãy ≥ 8 chữ số hoặc tên địa điểm danh mục — không bao giờ `place_key` hay chữ tự do thô**.

**D5c (quyết định riêng — lượt A-1b). Cứu hộ xe hỏng (ĐP5 = a)** *(trước là D5.4)*
- Đề nghị `scope = 'ONBOARD'` từ xe hỏng A sang xe cứu hộ C: mọi suất mở `WAITING` + `BOARDED` của A; nơi gặp (địa điểm hoặc chữ, che số).
- **Người gửi:** tài xế A (ô `trip.transfer`, `assigned`) **hoặc văn phòng bấm thay** — **ngoại lệ có tên**: văn phòng bấm thay qua ô **`trip.progress`** (SALES, ADMIN, SA = any — cùng tập đã được bấm thay Xuất bến, Đã đón, đúng chữ phương án (a)), **chỉ** cho `scope = 'ONBOARD'`, ghi `proposed_by_staff_id` = người bấm. Văn phòng **không** gửi đề nghị `STOP` và **không** bấm Nhận thay tài xế đích (C9 "tài xế đề nghị với nhau").
- **Người nhận:** tài xế C bấm Nhận → MQ-02/03 như D4 (sức chứa C, trùng giờ C…).
- A (hoặc văn phòng bấm thay) bấm "Kết thúc gián đoạn" (ADR-0049) — LC-16 bảo đảm điểm còn chờ → `SKIPPED`.
- **Không xe nào nhận được** (C chưa dùng app — vd xe nhà xe trước lượt A-2 — hoặc không đủ chỗ): đường của lượt 1 vẫn dùng: A kết thúc gián đoạn → chặng về "chưa xếp" → văn phòng tạo chuyến cứu hộ mới hoặc thêm vào xe đang chạy bằng D5.1 (Quản trị / Toàn quyền phá lệ mốc kèm lý do, như lượt 1).
- **Giá xe cứu hộ của nhà xe (ADR-0057 T2, đã duyệt — lần 18: "Vẫn phải nhập giá thoả thuận trước")**: chuyến cứu hộ **mới** dùng xe nhà xe chỉ xuất bến khi có **nguồn giá** — giá bảng đã chụp lúc xếp, hoặc **giá thoả thuận trước** do Quản trị / Kế toán / Toàn quyền nhập (ô `transport.cost.adjust`); không ngoại lệ, không phá lệ (mã giữ `THIEU_GIA`). Xe cứu hộ đã `RUNNING` thì đã có nguồn giá (không xuất bến được nếu thiếu); khách nhận thêm giữa đường không đổi tiền (tiền theo chuyến — tiền Q9 a). Quy trình cứu hộ trên màn văn phòng phải có bước "nhập giá thoả thuận" ngay cạnh "tạo chuyến cứu hộ", hoặc dùng xe công ty.
- **Thứ tự thi công với ADR-0057:** phần "xe nhà xe phải có giá" dựa vào cổng `THIEU_GIA` và ô `transport.cost.*` của ADR-0057, mà các ô này **chỉ vào ở bản phát hành T2** của ADR-0057 (sau khi ADR-0049 lượt 1 gộp `main`). Nếu A-1b / A-2 phát hành **trước** T2 thì cổng giá chưa có ⇒ chuyến xe thuê chưa có đường nhập giá trong app. **Khuyến nghị: thi công A-1b và A-2 sau T2**; nếu buộc phải trước, điều phối ghi nợ có hạn và phần giá của D5c / D8.5a thi hành cùng T2.

**D5b (quyết định riêng — lượt A-1b). Tài xế bổ sung tên khách tại chỗ** (C15; ĐP13 = a) *(trước là D5.5; mở đường ghi mới vào `ord_passenger` nên tách khỏi D5)*
- **Ô mới `trip.passenger.add`:** `DRIVER = assigned`; `SUPER_ADMIN = any` (ADR-0014 điều 2; route vẫn chốt "đang lái"); **`ADMIN = none`** — không có route văn phòng cho ô này, Quản trị nhập tên ở màn đơn bằng `order.passenger.write = any`; **`SALES = none`** (ĐP13 a — `permissions.ts:86`); mọi cột khác `none`; `DRIVER_PARTNER = none` ở lượt này.
- **Chỉ gắn tên vào suất chưa tên** (thêm dòng `ord_passenger` mới cho người chưa có tên); tài xế **không** sửa, không huỷ tên đã có (sửa tên đã có vẫn ở màn đơn).
- Ghi `ord_passenger` với `source = 'DRIVER'` (giá trị đã có trong `CHECK` — `0035_hanh_khach.sql:19`) **bằng câu lệnh chưa chạy do `orders` cấp** (hàm công bố mới của `orders`, không tự kiểm quyền; nơi gọi đứng sau `can(trip.passenger.add, { assigned })` + "trong ngày chạy"), rồi gắn `passenger_key` vào **một suất chưa tên của đúng chặng, đúng chuyến** (LC-10) — một lô.
- Chỉ đơn có chặng trên chuyến mình lái; chỉ trong ngày chạy (`trongNgayChay`, `src/shared/dieu-phoi-kiem.ts:364`). Ngoài phạm vi → 404.
- Nhật ký: số người, mã chuyến, mã đơn; **không** tên, năm sinh (LC-18).

### D6. Thông báo và Bảng tin cho chuyến (ghép lượt 2 D5 cũ; hoàn tất phần hẹn của ADR-0051)

**D6.1 Nguồn tin = hình chiếu nhật ký** (khuôn ADR-0034 điều 1; không bảng `ntf_` mới)
- View công bố mới của `audit`: `v_aud_trip_event` (id, chuyến, người làm, hành động, lúc) — chỉ khoá, không `detail`. `thongbao` đọc view này.
- Hành động nhật ký sinh tin (danh sách chốt **trước khi ghi dòng đầu** — một chiều): xếp/gỡ/đổi tài xế; đổi giờ chuyến có tài xế; huỷ chuyến có tài xế; văn phòng thêm điểm / báo huỷ khi xe chạy; **cập nhật điểm theo đơn trên xe đang chạy (`trip_stops_synced`, D5.3a — `detail` chỉ mã chuyến, mã đơn, số người, nhãn nơi cũ → mới **đã che dãy ≥ 8 chữ số / tên địa điểm danh mục, không `place_key`, không chữ thô**; không tên, không SĐT)**; đề nghị gửi / xác nhận / leo thang / bác / hết hạn; kết thúc gián đoạn; khách vắng; giờ hẹn chặng đổi khi chặng đang có suất mở (`order_leg_updated`, MQ-07 — ADR-0051 hẹn).
- **Không** đọc chữ `detail` để tìm người nhận (ADR-0030 điều 3).

**D6.2 Người nhận — một hàm thuần duy nhất** (dùng chung hộp thông báo, gõ cửa màn hình khoá, Bảng tin)
- Nguyên tắc: **tin "cần xử lý" chỉ tới người có ô làm được việc đó.**

  | Sự kiện | Nhận (ngăn "Của tôi") |
  |---|---|
  | xếp / gỡ tài xế | tài xế được xếp / bị gỡ |
  | đổi giờ, huỷ chuyến; văn phòng thêm điểm, báo huỷ; **cập nhật điểm theo đơn khi xe đang chạy** ("đổi điểm đón X → Y") | tài xế có dòng lái mở **lúc sự kiện** (tin không tên, không SĐT khách) |
  | đề nghị gửi tới | tài xế đích |
  | đề nghị xác nhận / bác / hết hạn | tài xế nguồn, tài xế đích |
  | đề nghị **leo thang** | người có `trip.override` (Quản trị, Toàn quyền) — "cần xử lý" |
  | kết thúc gián đoạn | người có `trip.dispatch = any` (tạo chuyến cứu hộ) |
  | khách vắng | người lập + người phụ trách đơn **có `trip.view`** (khuôn ADR-0034) |
  | giờ hẹn chặng đổi khi đã xếp (MQ-07) | người lập / phụ trách đơn **qua được `can(trip.call_ack, { ownerId, assigned })`** (ô "Đã gọi báo" của ADR-0051 — người làm được việc gọi) + tài xế đang lái chuyến có suất của chặng |

- **Mọi người nhận phải qua `can(trip.view, …)` hiện hành lúc đọc** (tài xế: `assigned`). Hệ quả, nói rõ: người lập / phụ trách đơn là **Đối tác, Hướng dẫn viên, Thực tập** (không có `trip.view`) **không** nhận tin chuyến nào, kể cả "khách vắng" — đúng lời chủ Q1 "HDV, Đối tác không thấy lịch xe"; người phụ trách đơn là HDV thì tin MQ-07 chỉ tới người lập (nếu là văn phòng) và tài xế. Trước lượt 3, tài khoản `DRIVER_PARTNER` **không** nhận tin chuyến nào (ô `trip.view` của họ còn `none`).
- Tài xế: người nhận tính theo **dòng lái mở ≤ t và (còn mở hoặc đóng ≥ t)** — tài xế bị gỡ thấy tin gỡ, không thấy tin sau đó.
- Tin chuyến **không bao giờ** gắn `tat-ca`, `noi-bo`, `cho-nhan`. Tài xế không có `order.view` nên không nhận tin đơn (ADR-0022 điều 3 giữ nguyên).
- Không có tin "quan trọng" (rung trong giờ yên lặng — ADR-0039) ở lượt này.
- ADR-0045 giữ nguyên: đơn nháp không sinh tin; chặng nháp không lên xe.

**D6.3 Nối module — hàm tiêm, không cạnh mới** (ADR-0007 điều 4(b))
- `ctx.baoThayDoiChuyen(env, actor, { tripId, action })`: route `van-chuyen` gọi **sau** lô thành công, bắn-và-quên (5.10, 5.16 — tin được phép thất lạc; trạng thái chờ như đề nghị `PENDING` đã nằm trong CSDL). Không gọi khi 409.
- `ctx.chuyenLienQuan(env, staffId, tuLuc)`: `thongbao` hỏi các chuyến (và khoảng mở–đóng) tài khoản đã lái trong 30 ngày giữ tin.
- Gốc lắp ráp nối hai hàm này vào **hàm công bố** của `van-chuyen`. `thongbao` không import `van-chuyen`; vẫn **không module nào import `van-chuyen`** (`src/architecture.test.ts:735`).

**D6.4 Bảng tin (ADR-0022)**
- Loại sự kiện mới `chuyen`, nhãn `dieu-xe` = kết nối có `can(trip.view)` **không ngữ cảnh** (tức `any`: SALES, ACC, ADMIN, SA) + `nguoi:<id>` cho tài xế liên quan. Bảng điều phối và màn tài xế đang mở tự tải lại.
- Sự kiện Bảng tin chỉ gồm mã chuyến, loại thay đổi, thời điểm (bổ sung ADR-0022 điều 4).

---

## Câu ADR bị thay (nguyên văn → mới)

Tệp ADR cũ **không** sửa; `docs/adr/README.md` do điều phối cập nhật.

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0049 D1, bảng luật, LC-15 | "**Chuyến đang chạy: khoá hẳn kế hoạch.** Không mở/đóng suất, không thêm điểm, không đổi xe, đổi tài xế. Chỉ còn: trạng thái tiến độ, đổi thứ tự điểm chưa tới, gắn tên vào suất. Ngoại lệ duy nhất: lô "Kết thúc gián đoạn"" | "Chuyến đang chạy: không đổi xe, đổi tài xế, sửa giờ; văn phòng không rút/dời suất. Được thêm: (i) văn phòng thêm điểm/suất (`added_while_running`, `added_after_departure`) và báo huỷ (`office_cancel_*`); (ii) đóng/mở suất qua đề nghị chuyển `CONFIRMED` (`TRANSFERRED` + `transfer_id`); (iii) lô "Kết thúc gián đoạn" (giữ nguyên)." (ADR-0052 D5.3) |
| ADR-0049 D3, bảng ô | năm ô `trip.*`, `order.leg.short_notice` | thêm `trip.transfer` (D4.3), `trip.passenger.add` (D5b); `trip.override` thêm "duyệt/bác đề nghị leo thang"; `trip.dispatch` thêm "thêm điểm, báo huỷ khi xe chạy"; `trip.progress` thêm "văn phòng bấm thay gửi đề nghị cứu hộ `ONBOARD`" |
| ADR-0049 D3, "Nới hàng rào đã ghim" | "bài ghim hàng `DRIVER` … đổi … sang "đúng `trip.view`, `trip.progress` là `assigned`". Hàng `DRIVER_PARTNER` giữ nguyên." | "… đúng `trip.view`, `trip.progress`, **`trip.transfer`, `trip.passenger.add`** là `assigned`. Hàng `DRIVER_PARTNER` giữ nguyên." — **nới** bài ghim (Điều 9.4), chủ duyệt ADR này là duyệt việc nới |
| ADR-0049 D3, danh sách trường tài xế | (không có dữ liệu xe khác) | thêm danh sách D4.4 (ĐP9 a) |
| ADR-0049 D2, bảng "Mốc tối thiểu", dòng **Xếp** | "Lệnh đổi **"ai đi xe nào"**, đổi xe, đổi tài xế của chuyến có **giờ xuất bến dự kiến** < bây giờ + mốc → chặn. … Xếp **chính chặng đã đặt gấp** thì qua" | "… **Trừ** việc chuyển khách qua đề nghị giữa hai chuyến **khi chuyến đích đang chạy** (D4, kể cả cứu hộ `ONBOARD`): không kiểm mốc. Đích chưa chạy trong mốc: như dòng này (leo thang, Quản trị / Toàn quyền phá lệ). Văn phòng thêm khách vào xe đang chạy (D5.1) **vẫn** theo dòng này." — chủ chốt Q-L2-B a ("Có; chỉ miễn khi xe nhận đang chạy", lần 17) |
| ADR-0049 D2, `vc_dispatch_policy` | năm cột (+ `proxy_backdate_max_minutes` của ADR-0050) | thêm `accept_wait_minutes`, `auto_confirm_transfer` |
| ADR-0050 VK1-B | "Đường sửa trên xe đang chạy chờ lượt 2 của [TK] (D5 "văn phòng thêm điểm")." (`ADR-0050:217`) | "Trên xe đang chạy: được, cho suất đang chờ ở điểm chưa tới, cùng xe (ADR-0052 D5.3a — Q-L2-A a)." |
| ADR-0051 (phần hẹn "lượt 2 D6") | "Tin đẩy / Bảng tin khi giờ hẹn đổi (tới người phụ trách, tài xế): lượt 2 D6." (`ADR-0051:491`) | thi hành bằng D6.2 dòng MQ-07 |
| ADR-0047 A2 | "Giá trị `DRIVER` định sẵn … **chỉ dùng khi ADR lượt 2 mở đường ghi cho tài xế**" | "… mở bằng ô `trip.passenger.add` (ADR-0052 D5b), qua câu lệnh do `orders` cấp; chỉ thêm người chưa có tên." |
| ADR-0022 điều 3 | "**Nhóm nhận suy từ ô `order.view` hiện hành** …" | bổ sung: "Sự kiện chuyến (loại `chuyen`): nhóm `dieu-xe` (có `trip.view = any`) + `nguoi:<tài xế liên quan>`; không bao giờ `tat-ca`." |
| ADR-0022 điều 4 | "**Sự kiện chỉ gồm** mã/đơn, loại thay đổi, thời điểm." | bổ sung: "Sự kiện chuyến chỉ gồm mã chuyến, loại thay đổi, thời điểm." |
| ADR-0034 điều 1 | "Tin về đơn là hình chiếu của `audit_log` … Nguồn: các hành động `created`, …" | bổ sung nguồn thứ hai: `v_aud_trip_event` và `order_leg_updated` của chặng đang có suất mở (D6.1) |
| ADR-0007 điều 4(b) | khuôn hàm tiêm | thêm `ctx.baoThayDoiChuyen`, `ctx.chuyenLienQuan` |
| ADR-0019 (bản đồ ô) | — | thêm hai ô D4.3, D5b; không đổi danh sách cổng |

## Lệch có chủ ý khỏi Hiến chương 5.1

- **Không thêm lệch mới.** LC-14, LC-15 mới, luật `ESCALATED → CONFIRMED` có lớp CSDL (mọi dữ liệu cùng module `vc_`). L-D1 (ADR-0049) áp nguyên cho suất thêm khi xe chạy (máy chủ kiểm số suất mở ≤ số người chặng).
- Luật người nhận tin (D6.2) là luật quyền đọc ở máy chủ, không phải bất biến dữ liệu (khuôn LC-08).

## Cửa một chiều / hai chiều

- **Một chiều:** tiền tố, chủ bảng `vc_transfer_request`, `vc_transfer_check`; tập đóng `scope`, `status`, `rule_code`, `ket_qua`, `rule_tier` (đổi `CHECK` = dựng lại bảng → **định trọn ngay**); mỗi dòng đề nghị, dòng kiểm, sự kiện, nhật ký (chứng cứ, chỉ-thêm); **danh sách hành động nhật ký và trường `detail`** của D6 (chốt trước dòng đầu); mỗi lần tài xế đã thấy tên khách mới nhận (không rút lại được); tên khách do tài xế nhập đã vào `ord_passenger`.
- **Hai chiều:** hai ô mới và nghĩa thêm của ô cũ; giá trị chính sách (thêm dòng); công tắc tự xác nhận; luật người nhận tin (hàm thuần tính lúc đọc); nội dung chữ tin; hàm tiêm; màn hình.

## Hệ quả

- **Migration:** chỉ-thêm, **số ≥ 0044, lấy lúc thi công** sau khi liệt kê migration của mọi nhánh, worktree chưa gộp (`CLAUDE.md` §10; `docs/adr/README.md:77`). Gồm: hai bảng mới; cột `transfer_id`, `office_cancel_*` trên suất, `added_while_running` trên điểm; hai cột chính sách; **bỏ và tạo lại** trigger LC-15, LC-04 của suất (khuôn 0037 bỏ/tạo lại LC-1); view `v_aud_trip_event`. Phải đứng sau `0042`, `0043` trên cùng nhánh phát hành.
- **Ô quyền:** `trip.transfer`, `trip.passenger.add` mới; nới bài ghim hàng `DRIVER` (Điều 9.4); hàng `DRIVER_PARTNER` giữ ghim ADR-0048. **Không** thêm mã quyền ⇒ `EXTERNAL_PERMISSIONS` (`permissions.ts:29`) và trigger LC-1 (`0037_tai_xe_doi_tac.sql:10-12`) **không đổi**.
- **Route (tên đề xuất, kế hoạch chốt):**
  - tài xế (cổng `staff`, `can(trip.transfer, { assigned })` trước mọi truy vấn): `GET …/cuoc-cua-toi/:id/xe-nhan` (danh sách D4.4), `POST …/cuoc-cua-toi/:id/de-nghi` (gửi), `POST …/de-nghi/:rid/rut`, `…/nhan`, `…/khong-nhan`; `GET …/de-nghi-gui-toi`; `POST …/cuoc-cua-toi/:id/hanh-khach` (`trip.passenger.add`);
  - văn phòng (cổng `office`): `POST …/chuyen/:id/them-diem`, `…/phan-bo/:aid/bao-huy` (`trip.dispatch`); `POST …/chuyen/:id/cuu-ho` (`trip.progress`, chỉ `ONBOARD`); `POST …/de-nghi/:rid/duyet`, `…/bac` (`trip.override`); `GET …/de-nghi?ngay=` (`trip.view`);
  - mọi lệnh mang `request_id`; chuyến/đề nghị không phải của mình → **404**.
- **Bất biến `audit-invariants` (câu mới):** đề nghị `CONFIRMED` mà số suất `TRANSFERRED` ≠ số suất mở ở đích với cùng `transfer_id`; suất `TRANSFERRED` không có `transfer_id` / trỏ đề nghị không `CONFIRMED`; đề nghị `CONFIRMED` bởi `NGUOI` mà có dòng kiểm `KHONG_DAT` + `LOI`; suất `office_cancel_*` mà trạng thái lúc đặt không `WAITING` (theo sự kiện); điểm `added_while_running` trên chuyến chưa từng `RUNNING`; hành khách `source = 'DRIVER'` không có sự kiện ghi tên trên chuyến tương ứng. **Lưới thứ hai cho D5.3a:** suất đóng `STOP_CHANGED` trên chuyến đã từng `RUNNING` mà **không** có suất mở cùng chuyến, chặng, `passenger_key` với `opened_cmd_id` = `closed_cmd_id` của nó → **fail**.
- **Hàng rào mới** (mỗi cái một dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật):
  - trigger LC-14; LC-15 mới (văn phòng đóng suất chuyến `RUNNING` không qua đề nghị → `RAISE`); trigger `ESCALATED → CONFIRMED`; trigger chỉ-thêm hai bảng mới;
  - bài ghim hàng `DRIVER` mới (4 ô `assigned`); bài ghim `trip.transfer` SALES/ADMIN = `none`;
  - bài thứ tự lô cổng đôi (khuôn `thu-tu-lo.test.ts`);
  - bài quét "nơi gọi câu ghi hành khách của tài xế đứng sau `can(trip.passenger.add)`" (mở rộng bài quét hàm hẹp của ADR-0049);
  - bài liệt kê khoá DTO xe khác (ĐP9) và DTO đề nghị (không tên khi chưa `CONFIRMED`);
  - `src/hanh-khach-khong-lo-ten.test.ts` phải sửa cụ thể (`@thi-cong-adr-0049-tiep`): regex chọn route điều phối `:163-164` thêm nhóm `de-nghi` và route ghi hành khách của tài xế (nằm dưới `cuoc-cua-toi` — đã phủ nếu đặt đúng chỗ); `TRA_TEN :166` (hôm nay đúng hai route trả tên) thêm **route thứ ba**: chi tiết đề nghị đã `CONFIRMED` trả tên khách cho tài xế đích (D4.4); thêm nội dung tin đẩy / Bảng tin vào phần quét. Thêm ca: `trip_stops_synced` với nơi đón chữ tự do chứa dãy ≥ 8 chữ số và tên khách mẫu → `audit_log.detail` và tin không chứa dãy số, tên, `place_key` (`L:…`/`T:…`). `src/giay-to-khong-lo-so.test.ts` mở rộng cho route mới;
  - hàm thuần người nhận chạy với **mọi tập con quyền** (khuôn NT-3);
  - `src/architecture.test.ts`: không cạnh `thongbao → van-chuyen`;
  - hàng rào 2 (`src/route-write-guard.test.ts`) phủ route mới ở cổng `staff`.
- **Tài liệu:** `docs/data-dictionary.json` + `npm run dict`; `docs/SYSTEM-DESIGN.md`; `docs/CHANGE-GUIDE.md`.
- **Thứ tự:** kế hoạch → lát 2.1 (D4) ∥ 2.2 (D5, trừ cứu hộ) ∥ 2.3 (D6, chốt tên hành động nhật ký trước) → cứu hộ (sau 2.1) → **chủ xác nhận bộ ca mẫu** ([TK] `:1232`) trước khi nhận lát 2.1 → chủ vẽ V4, V8–V11 → lát 2.4 giao diện → người kiểm độc lập → phát hành (sau ADR-0049).
- **Việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ người kiểm độc lập chỉ đọc cuối lượt.

## Tiêu chí nghiệm thu (kiểm bằng máy)

1. **Đạt** (e2e, ví dụ Mường Thanh của chủ): `CONFIRMED`, `decided_mode = 'MAY'`, đủ dòng `vc_transfer_check` (có `rule_tier`), suất đóng ở A (`TRANSFERRED`, `transfer_id`) và mở ở B, điểm A → `MOVED`, B có điểm đón + trả mới (`added_while_running`), `version` cả hai tăng, nhật ký có mã luật, **không** tên.
2. **Không đạt:** vượt chỗ → `ESCALATED`, không suất nào đổi; công tắc tắt → `ESCALATED`; điểm đã tới → 409 / `VOID`; người gửi không lái nguồn → 404; B nhận sau hết giờ → `EXPIRED`.
3. **ĐP4:** chỉ thiếu khoảng nghỉ → Quản trị duyệt thiếu lý do → 400; có lý do → 200, `NGUOI`, đổi suất; Bán hàng duyệt → 403; có dòng lõi `KHONG_DAT` → Quản trị duyệt → 409 **và** SQL `UPDATE status='CONFIRMED'` thẳng → `RAISE`.
4. **ĐP9:** DTO xe khác chỉ có đúng bốn khoá; không khoá khách, mã đơn, SĐT (bài liệt kê khoá).
5. **Chạy đua:** văn phòng thêm điểm vào B đúng lúc B nhận → tự thử lại một lần, kết quả đúng theo dữ liệu mới; hai đề nghị cùng đổ vào B vượt chỗ → đề nghị sau `ESCALATED`.
6. **LC-15 mới:** văn phòng thêm suất vào chuyến `RUNNING` → được (có dòng `vc_leg_appt_ack` nếu chặng chưa có); văn phòng đóng suất `RUNNING` không qua đề nghị → 409 **và** `RAISE`; đổi xe/tài xế `RUNNING` → `RAISE`; `STOP_CHANGED` trên `RUNNING`: suất `WAITING` ở điểm `PENDING` → 200 (đóng + mở cùng chuyến, số chỗ không đổi, tài xế nhận tin); suất `BOARDED` hoặc điểm đã tới → 409 **và** `RAISE`. **Đóng `STOP_CHANGED` mà không mở lại** (SQL tay, hoặc lô bỏ câu mở) → `RAISE`; lô đúng thứ tự đóng → mở → chốt → được; mở trước khi đóng cùng người → UNIQUE LC-01 (ghi rõ để người thi công không đảo thứ tự).
6b. **Q-L2-B:** chuyển sang xe đích `PLANNED` trong mốc → `ESCALATED` với dòng `MOC_TOI_THIEU`; Quản trị duyệt có lý do → `CONFIRMED`; xe đích `RUNNING` → không kiểm mốc.
6c. **Giá cứu hộ (ADR-0057):** chuyến cứu hộ mới bằng xe nhà xe không có giá bảng và chưa nhập giá thoả thuận → Xuất bến 409 `THIEU_GIA`, không ai phá lệ được; Quản trị / Kế toán nhập giá thoả thuận → xuất bến 200.
7. **Mốc 6 giờ khi thêm điểm:** chặng không đặt gấp (kể cả chặng quay về "chưa xếp" sau gián đoạn), Bán hàng → 409 "cần Quản trị"; Bán hàng gọi phá lệ → 403; Quản trị phá lệ có lý do → 200 + sự kiện `PHA_LE`; chặng đặt gấp → 200 không phá lệ.
8. **Báo huỷ:** suất vẫn chiếm chỗ; tài xế ghi "Khách đã huỷ" → hết chiếm chỗ; đặt `office_cancel_*` lần hai → `RAISE`; đề nghị chờ cho điểm đó → `VOID`.
9. **Cứu hộ (ĐP5):** tài xế A gửi `ONBOARD` → C nhận → khách `BOARDED` sang C vẫn `BOARDED`; văn phòng (Bán hàng) bấm thay gửi → 201, ghi người bấm; văn phòng gửi `STOP` → 403; văn phòng bấm Nhận thay C → 403; Kế toán bấm thay → 403; ca không đủ chỗ → `ESCALATED`, đường lượt 1 vẫn chạy.
10. **Tên do tài xế (ĐP13, D5b):** tài xế thêm tên cho đơn không có trên chuyến mình → 404; ngoài ngày chạy → 404; tên thêm có `source = 'DRIVER'` và gắn vào suất chưa tên đúng chặng; gắn vào suất đã có tên / sửa tên đã có → 409; Bán hàng, Quản trị gọi route tài xế → 403; bài ghim hàng `DRIVER` nay có đúng 4 ô `assigned` (3 nếu A-1b chưa duyệt).
11. **Thông báo:** hàm người nhận với mọi tập con quyền: tin xếp chỉ tới tài xế được xếp; tài xế bị gỡ thấy tin gỡ, không thấy tin sau; tin leo thang chỉ tới `trip.override`; tin chuyến không bao giờ `tat-ca`; tài khoản chỉ-`DRIVER_PARTNER` **không** nhận tin chuyến nào; route gọi `baoThayDoiChuyen` đúng một lần sau lô thành công, không gọi khi 409.
12. **Không lộ:** chạy mọi route mới với dữ liệu mẫu có tên, năm sinh, SĐT, số bằng lái → `audit_log.detail`, nội dung tin, sự kiện Bảng tin không chứa chúng, không dãy ≥ 8 chữ số.
13. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` (thoát 0 sạch / 1 gieo lỗi).

## Phương án bị loại

- **Văn phòng tự chuyển khách giữa hai xe đang chạy:** trái C9 "văn phòng chỉ thêm".
- **ĐP4 (b) không cho duyệt thay:** chủ chọn a.
- **ĐP5 (b) văn phòng làm hết / (c) chỉ tài xế:** chủ chọn a.
- **Cho văn phòng bấm Nhận thay tài xế đích:** mở rộng quá chữ ĐP5(a) ("văn phòng bấm thay … cho tài xế **xe hỏng**").
- **Mở `trip.transfer` cho SALES/ADMIN:** thành đường văn phòng tự chuyển khách; ngoại lệ cứu hộ đi bằng `trip.progress` với phạm vi `ONBOARD` là đủ.
- **ĐP9 (c) thấy như văn phòng / (b) chỉ tên:** chủ chọn a.
- **ĐP13 (b) Bán hàng sửa tên mọi đơn trên màn chuyến:** chủ chọn a.
- **Tin leo thang tới mọi người xếp xe:** Bán hàng không duyệt được (chỉ `trip.override`), tin "cần xử lý" tới người không xử lý được là nhiễu.
- **Cron quét đề nghị hết hạn:** Cron không ghi dữ liệu Vận chuyển (5.11).
- **Durable Object / hàng đợi:** chủ chọn kiểm và ghi ngay (ĐP8, ADR-0049).

## Câu hỏi còn mở

**Đã trả lời lần 17** ([HĐ] "Trả lời lần 17" (30/9)), nguyên văn nhãn: **Q-L2-A** "Có, có điều kiện" (→ D5.3a); **Q-L2-B** "Có; chỉ miễn khi xe nhận đang chạy" (→ D4.2). Không còn câu mở.

## Việc vẽ cần chủ

- **V4** dòng dữ liệu (phễu, hành trình một chặng, nhật ký máy quyết); **V8** gửi đề nghị + chờ nhận (đếm ngược); **V9** đề nghị gửi tới tôi: Nhận / Không nhận; **V10** hộp đề nghị leo thang (duyệt / bác); **V11** thêm điểm đón vào xe đang chạy, báo huỷ điểm ([TK] `:695`, `:699-702`). Thêm vào V6: nút "Bổ sung tên", thẻ "văn phòng đã báo huỷ / thêm điểm" ([TK] `:697`).
- **Xác nhận bộ ca mẫu** (ví dụ xe A/B của chủ) trước khi nhận lát 2.1 ([TK] `:1232`).
- Nguồn: tệp câu hỏi `2026-09-30-van-chuyen-cau-hoi-cho-chu.md` mục 2, mục 8.

## Điểm cho người kiểm soi kỹ

1. Ngoại lệ bấm thay cứu hộ qua `trip.progress` (D5c) — đúng chữ ĐP5(a) chưa; có mở đường vòng nào cho văn phòng "chuyển" khách `STOP` không.
2. Luật `rule_tier` và trigger `ESCALATED → CONFIRMED` có chặn đủ "Quản trị duyệt khi luật lõi không đạt".
3. Người nhận tin leo thang = `trip.override` (không phải mọi người xếp xe) — khác [TK] lát 2.3 (`:1275`); đây là tự chốt theo nguyên tắc "tin cần xử lý tới người làm được", hai chiều.
4. Sửa `0042` tại chỗ hay migration mới cho LC-15/LC-04 (phụ thuộc `0042` đã áp remote chưa lúc thi công).
5. D6 là quyết định thứ ba của lượt — người kiểm xác nhận đúng trần 3 và D6 không kéo thêm quyết định quyền ngoài bảng người nhận.

## Chưa kiểm

- D1 chạy lô lần lượt cho cổng đôi (bài chạy đua của ADR-0049 chỉ phủ một chuyến).
- (Đã kiểm 30/9: cạnh `thongbao → audit` có sẵn — `src/architecture.test.ts:44@thi-cong-adr-0049-tiep`; `bangtin` là lá, dữ liệu do gốc lắp ráp truyền vào — `:27`. Không cạnh mới.)
- Quy mô thật (số đề nghị mỗi ngày).
- Tệp đề xuất này chưa có người kiểm độc lập.
