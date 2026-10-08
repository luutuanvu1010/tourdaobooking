# Kế hoạch A5: chuyển khách giữa hai xe, cứu hộ có nơi gặp, hộp duyệt đề nghị leo thang, bảng kiểm luật

- **Gốc:** ADR-0052 D4 và D5c; đánh giá ERP mục C51 phần 2 và C52; BACKLOG BL-VC-D4, phần D4.
- **Nơi đo:** nhánh `claude/van-chuyen-goi-a-c`. Nhiệm vụ yêu cầu đo ở `6b0b826e`. Nhánh nay ở `bfc3ed6c`, chỉ khác ở sổ thi công, BACKLOG và một bài kiểm `khung-ban-route.test.ts`.
- **Đ1 (ADR-0104):** nhánh `adr-0104-d1`, worktree `agent-ab1511956f3ec7f56`, đang ở `b3e66350` (vòng sửa theo phiếu kiểm, đã qua CAO-2, CAO-3, CAO-4, THẤP-11).
- **Số dòng:** mọi số dòng trong kế hoạch đo trên `bfc3ed6c`. Riêng `src/modules/van-chuyen/index.ts` sẽ lệch sau khi Đ1 và Đ2 gộp, nên phải đo lại ở bước T0.
- **Người thi công:** trợ lý AI. Kế hoạch này chỉ đọc mã, không sửa tệp nào.

---

## 0. Phạm vi

### 0.1 Trong phạm vi
1. **Nhờ xe khác đón một điểm** (C51 phần 2, ADR-0052 D4, phạm vi `STOP`).
   - Tài xế A đang chạy gửi đề nghị cho một điểm chưa tới. Điểm đó phải có mọi suất đang chờ.
   - Xe B nhận được nếu chuyến B ở trạng thái `PLANNED` hoặc `RUNNING`, cùng ngày chạy, tài xế khác A.
   - Tài xế B bấm Nhận hoặc Không nhận. Máy kiểm luật rồi tự xác nhận, hoặc đẩy lên văn phòng duyệt.
   - Văn phòng duyệt hoặc bác bằng ô `trip.override`.
2. **Cứu hộ có nơi gặp** (C52, ADR-0052 D5c, phạm vi `ONBOARD`).
   - Chuyển cả khách đang trên xe lẫn khách đang chờ sang xe C. Nơi gặp là một địa điểm, hoặc chữ tự do đã che dãy số dài.
   - Văn phòng được bấm thay qua ô `trip.progress`, chỉ cho phạm vi `ONBOARD`.
3. **Bảng kiểm luật dạng danh mục.** Lời chủ 2/10 (`docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md:165-173`): "tập mã luật để dạng danh mục (thêm luật = thêm dòng), không khoá cứng bằng CHECK". Ghi ở BACKLOG BL-VC-D4, `docs/BACKLOG.md:200`.
4. **Hộp "Đề nghị cần duyệt"** cho người giữ `trip.override`.
5. **Tin báo theo ADR-0052 D6.2.** Thêm hai cột chính sách `accept_wait_minutes` và `auto_confirm_transfer`. Gieo nhóm lý do `TU_CHOI_NHAN`.

### 0.2 Ngoài phạm vi
- **C51 phần 1** (suất `NO_SHOW` vẫn bị tính chỗ): việc B7, cần ADR riêng.
- **V4** "Dòng dữ liệu / Nhật ký quyết định": phần sau của BL-VC-D4, để kế hoạch riêng. Câu hỏi quyền Q6b của nó cũng chờ kế hoạch đó.
- **Tạo chuyến cứu hộ mới và giá xe cứu hộ của nhà xe** (ADR-0052 :134, ADR-0057 T2): đường lượt 1 giữ nguyên. A5 không tạo chuyến.
- **Không làm:** chia người lớn / trẻ em, số thứ tự đề nghị kiểu ĐN-xxxx, km, cron hết hạn. Hết hạn tính lười (MQ-08).
- **C24, C25:** thuộc A4. Riêng ô `trip.transfer` của `DRIVER_PARTNER` có điều kiện, xem G-A5-20.

### 0.3 Câu ADR đang hiệu lực mà kế hoạch dùng (ADR:dòng)

**ADR-0052**

| Dòng | Nội dung |
|---|---|
| :55-66 | D4.1: bảng `vc_transfer_request`, `vc_transfer_check`, cột `vc_trip_allocation.transfer_id`, hai cột chính sách |
| :61 | Đồ thị trạng thái. Không có cạnh `ESCALATED → EXPIRED` |
| :62 | Ba cột lý do: Không nhận dùng `TU_CHOI_NHAN`; Duyệt dùng `PHA_LE`; Bác dùng `reject_reason_code`, chưa nói nhóm nào |
| :69 | LC-14: điều kiện tạo đề nghị |
| :70-72 | Lô xác nhận cổng đôi. Suất `BOARDED` sang xe mới vẫn giữ `BOARDED` |
| :73 | Chuyến đích không chụp lại mốc giờ hẹn (ADR-0051:149) |
| :74-76 | MQ-02/03: máy tự xác nhận. Xe nguồn chỉ bớt người. Tự thử lại một lần |
| :78-79 | MQ-08 hết hạn lười; MQ-09 tự huỷ (`VOID`) trong cùng lô |
| :80 | ĐP4: duyệt thay chỉ khi mọi dòng `KHONG_DAT` thuộc tầng `CAU_HINH`. Lý do Duyệt dùng nhóm `PHA_LE` |
| :81 | Bác dùng `trip.override`, lý do bắt buộc |
| :84-86 | D4.3: ô `trip.transfer`, `trip.override` thêm nghĩa duyệt / bác, `settings.ops` quản hai cột chính sách |
| :89-91 | D4.4: danh sách xe nhận gồm đúng mã chuyến, tên tài xế, chỗ trống, điểm sắp tới. Tên khách chỉ hiện khi đề nghị đã `CONFIRMED` |
| :130-134 | D5c: văn phòng bấm thay qua `trip.progress`, chỉ `ONBOARD`. Văn phòng không bấm Nhận thay tài xế. Còn đường lượt 1 làm dự phòng |
| :148, :154-168 | D6.1, D6.2: danh sách hành động sinh tin (một chiều) và bảng người nhận |
| :217-231 | Route, bất biến, hàng rào mới |
| :233, :274 | Chủ phải xác nhận bộ ca mẫu A/B trước khi nghiệm thu |

**Các ADR khác**
- **ADR-0104** :101 (duyệt / bác đề nghị leo thang "vẫn hỏi `trip.override`"), :230, :232, :233, :244 ("Không đổi … ADR-0052 `:80-85` và `:189`"), :74 (nhãn nhóm `PHA_LE` đổi thành "Điều chỉnh khẩn cấp, phá lệ", mã nhóm giữ nguyên).
- **ADR-0104 Đ2:** :155-166 (máy đồng bộ không ghi gì lên chuyến `RUNNING`), :142 (ngoại lệ có tên trong bài thứ tự lô), :154 (trần câu lệnh).
- **ADR-0053:** D7.1 :46 (`DRIVER_PARTNER` có `trip.transfer` = `assigned`), :50 (không thêm mã quyền mới nên `EXTERNAL_PERMISSIONS` và LC-1 không đổi), D7.2 `trongKhungXemKhach`, D7.4, D7.5.
- **ADR-0105:** sửa ADR-0053 D7.2 và D7.3. `diaChiChiDuong` chỉ hiện trong khung xem khách.
- **ADR-0056:** A2 (luật cam kết xe riêng / số chỗ tối thiểu kiểm khi "xếp / dời đến"), A3 (Quản trị cho qua kèm lý do, ghi `vc_trip.commitment_override_*`).
- **ADR-0051:149.**

### 0.4 Câu đã bị ADR sau thay (không dùng nguyên văn)

| Câu cũ | Thay bởi |
|---|---|
| ADR-0052 :64, `rule_code CHECK IN (…9 mã…)` | ADR mới (Hộp 1) theo lời chủ 2/10. Wave 5 HOÃN cũng ghi: "lệch ADR-0052 D4.1 … phải có ADR mới trước mọi migration" |
| ADR-0052 :77 (mốc 6 giờ khi chuyển; "phá lệ như ADR-0049 D2") | ADR-0104 :230: duyệt bằng `trip.override` không đổi; Điều chỉnh khẩn cấp **không** áp cho đề nghị chuyển khách |
| ADR-0052 :84, "`DRIVER_PARTNER = none` ở lượt này" | ADR-0053 D7.1 :46: `assigned` |
| ADR-0052 :192 | ADR-0104 :233 |
| ADR-0052 D6.1 :148 | ADR-0104 :232 thêm hành động. Phần đề nghị không đổi |
| ADR-0052 :80, chữ "nhóm `PHA_LE`" | Mã giữ nguyên. Nhãn hiện "Điều chỉnh khẩn cấp, phá lệ" (ADR-0104 :74, Đ1 `dieu-phoi-kieu.ts:19`) |
| ADR-0053 D7.2, D7.3 | ADR-0105 |

### 0.5 Hiện trạng đo được

**Đã có sẵn**
- `close_reason` đã có `TRANSFERRED` (0042).
- Điểm đã có trạng thái `MOVED`, nhãn "Đã chuyển" (`src/shared/dieu-phoi-man.ts:321`).
- `LENH_DONG_SUAT` (`src/shared/dieu-phoi-kieu.ts:127`) ghi chú "TRANSFERRED … chưa có lệnh".
- `NHOM_LY_DO` đã có `TU_CHOI_NHAN` nhưng chưa gieo dòng nào. `NHOM_LY_DO_HIEN` (`src/shared/chinh-sach-hien-thi.ts:209`) chưa có nhóm này.
- `GET /chuyen/:id/cuu-ho` (`index.ts:1264`) hỏi `trip.dispatch`, trả 409 `chua_gian_doan`. Hàm `cuuHoTu` (`cuu-ho.ts`) lọc `CONG_TY` và trạng thái `PLANNED`/`RUNNING`.

**Trigger LC-15, bản mới nhất của từng cái**

| Trigger | Bản mới nhất ở |
|---|---|
| `vc_trip_running_locked_alloc_ins`, `_alloc_close` | 0085 |
| `vc_trip_running_locked_stop_ins` | 0076 |
| `vc_trip_allocation_identity` | 0085 |
| `vc_trip_stop_changed_balance`, `vc_trip_correction_balance` | 0085 |
| `vc_trip_revoke_no_progress` | 0085. Chỉ lọc `x.trip_id = NEW.id` |

**Bài gác và mốc liên quan**
- `thu-tu-lo.test.ts:21`: chỉ quét `dieu-phoi.ts`.
- `hanh-khach-khong-lo-ten.test.ts:172`: regex chưa có `de-nghi`. `:174`: `TRA_TEN` đúng 2 route.
- `lop-vuot.test.ts` (Đ1) NT-3(b): mọi dòng có chuỗi `"trip.override"` nằm ngoài biểu thức đổi lớp đều đỏ.
- Trần chữ hướng dẫn: Bán hàng 4497/4500, Quản trị 4496/4500. Thời gian đọc: chung 9 + Bán hàng 21 = 30 phút, đã chạm trần.
- Ca mẫu `golden/dieu-phoi/xe-a-b-luot-1.json` vẫn ở trạng thái `cho_xac_nhan`.

---

## 1. Điểm chưa trả lời

### 1a. Việc mặt ngoài, đảo được: tự áp và ghi vào sổ thi công dưới mã G-A5-x

Các mục có dấu (✦) được ghi lại trong ADR mới để chủ nhìn thấy khi duyệt Hộp 1, nhưng không hỏi riêng.

- **G-A5-1. Ô duyệt và bác.** Duyệt / bác đề nghị leo thang chỉ dùng `trip.override` (Quản trị, Toàn quyền), theo ADR-0104 :101, :230, :244. Ô `trip.urgent_adjust` (Bán hàng khi sát giờ) không áp cho việc này. Mục này đóng THẤP-15 của Đ1 bằng bài kiểm ở T8.
- **G-A5-2. Mốc 6 giờ.** Xe đích `PLANNED` mà đã vào mốc thì `MOC_TOI_THIEU` luôn ra `KHONG_DAT` tầng `CAU_HINH`, chặng đặt gấp cũng không được miễn. Đúng chữ ADR-0052 D4.2; ADR-0104 :233.
  - Tính bằng `gioXetMocXep` (`src/shared/moc-toi-thieu.ts` của Đ1) để chỉ có một nguồn.
  - Xe đích `RUNNING` thì ghi `DAT` (ADR-0052 :77, câu "miễn khi xe nhận đang chạy").
- **G-A5-3. Không bật nhãn vượt luật trên lịch.** Sự kiện chuyển khách không mang `override_rule_code`, nên không hiện nhãn "Điều chỉnh khẩn cấp" hay "Phá lệ". Dấu phá lệ nằm ở `override_reason_code` của đề nghị, và ở khoá cam kết của B khi luật cam kết không đạt.
- **G-A5-4. Lý do Bác.**
  - Lý do Duyệt dùng nhóm `PHA_LE` (ADR :80, đã chốt).
  - Lý do Bác dùng nhóm `TU_CHOI_NHAN`, nhóm ADR đã đặt cho việc từ chối. Các dòng của nhóm này ("Xe đã đầy chỗ", "Không kịp giờ"…) hợp với việc bác. Các dòng của nhóm `PHA_LE` ("Đơn đặt gấp"…) thì không hợp.
  - Phương án khác (khuyến nghị cũ Q5 của đánh giá Đợt 5) là dùng `PHA_LE`. Đây chỉ là một hằng trong mã nên đổi lại được.
- **G-A5-5. Gieo nhóm `TU_CHOI_NHAN`.** Gieo 4 dòng: "Xe đã đầy chỗ", "Không kịp giờ", "Đang xử lý sự cố", "Khác". Theo khuôn gieo của 0076/0085 (`INSERT OR IGNORE`). Quản trị sửa được qua ô `admin.manage`. Thêm nhóm vào `NHOM_LY_DO_HIEN`. Lý do được nhúng vào DTO đề nghị.
- **G-A5-6 (✦). Mỗi nơi chỉ một đề nghị đang chờ.**
  - `STOP`: mỗi điểm nguồn tối đa một đề nghị ở trạng thái `PENDING` hoặc `ESCALATED`.
  - `ONBOARD`: mỗi chuyến nguồn tối đa một đề nghị như vậy.
  - Có `ONBOARD` đang chờ thì không gửi `STOP` được.
  - Xác nhận một `ONBOARD` thì mọi đề nghị đang chờ khác của A thành `VOID`.
  - Đây là chỗ siết. Trả lời câu cũ "một điểm chỉ một đề nghị đang chờ?" (Wave 5 HOÃN).
- **G-A5-7 (✦). `ONBOARD` chỉ tới xe đích `RUNNING`.**
  - Đây là chỗ siết, theo [TK] §5.9. Lý do: tránh suất `BOARDED` nằm trên chuyến `PLANNED`, vì như thế đụng `cap-nhat-diem`, máy đồng bộ Đ2 và cổng xuất bến.
  - Xe cứu hộ chưa xuất bến thì đi đường lượt 1.
- **G-A5-8. Xếp chỗ khi cứu hộ.** Suất `BOARDED` được đón tại nơi gặp và giữ `BOARDED`. Suất `WAITING` giữ nơi đón gốc. Theo [TK] §5.9 (`docs/superpowers/specs/2026-09-29-bang-dieu-phoi-chung-design.md:822-836`).
- **G-A5-9. Chữ nơi gặp.**
  - Qua `maskLongDigits` (`src/shared/text-guards.ts`) trước khi lưu. Trần 200 ký tự.
  - Không vào nhật ký, không vào tin. Tin chỉ ghi "có nơi gặp".
- **G-A5-10. Không thêm route trả tên khách.**
  - Sau `CONFIRMED`, tài xế B thấy tên qua route có sẵn `GET /cuoc-cua-toi/:id`, theo khung ngày chạy (LC-18). Tài xế đối tác theo khung ADR-0053 / ADR-0105.
  - `TRA_TEN` giữ 2. Hẹp hơn ADR :228 (ADR định thêm route thứ ba).
- **G-A5-11. Nơi đặt sự kiện và nhật ký.** Mọi sự kiện `TRANSFER_*` và dòng nhật ký `trip_transfer_*` đặt ở chuyến **đích**: `trip_id` = đích, `related_trip_id` = nguồn, giống `loDoi` (`dieu-phoi.ts:294`). Tin cho tài xế nguồn đi qua đường `related_trip_id` mà Đ1 CAO-2 đã dựng (`c5abe2f2`).
- **G-A5-12. Khoá phiên bản.**
  - Lệnh vòng đời (gửi, rút, không nhận, hết hạn, leo thang, bác) chỉ đặt dấu lệnh, không kiểm và không tăng `version`.
  - Xác nhận và duyệt kiểm `version` cả A và B, tự thử lại đúng một lần (ADR :76).
  - Ở T0 phải kiểm: trong 0042 có trigger nào đòi tăng `version` mỗi khi đổi `last_cmd_id` không. Nếu có, các cổng vòng đời phải tăng `version` và ghi lại.
- **G-A5-13. Tự huỷ (MQ-09).**
  - Đề nghị thành `VOID` ngay trong lô của các lệnh sau:
    - Đã tới / Bỏ qua điểm nguồn;
    - Kết thúc hoặc Kết thúc gián đoạn của A hay B;
    - Báo huỷ điểm đó;
    - Huỷ chuyến đích;
    - điều chỉnh (`CORRECTION`) đụng suất của điểm;
    - Thu hồi xuất bến của A hay B.
  - `VOID` không sinh sự kiện, nên không có tin, vì luật C38 chỉ cho một sự kiện mỗi lô. Vết nằm ở cột `closed_cmd_id`.
- **G-A5-14. Thứ tự trong lô.** Dòng `vc_transfer_check` ghi **trước** câu đổi trạng thái, để trigger `→ CONFIRMED` thấy bằng chứng của chính lô đó. Vẫn là một lô, không đổi hành vi so với thứ tự ADR :70. Ghi trong ADR mới (✦).
- **G-A5-15. Duyệt kiểm lại.** Lô duyệt chạy lại `kiemChuyen` trên dữ liệu đọc mới. Có luật tầng `LOI` không đạt thì trả 409 `luat_loi_khong_duyet` và không ghi gì.
- **G-A5-16. Bấm Nhận khi đã quá hạn.**
  - Trả 200 `{ ketQua: "HET_HAN" }`; lô ghi `EXPIRED` cùng sự kiện `TRANSFER_EXPIRED`. Nhờ vậy tin "hết hạn" theo D6.2 vẫn đi được mà không phạm D6.3 (không gửi tin khi lệnh trả 409).
  - Các lần đóng lười khác (A gửi lại, A rút) không gửi tin. Màn hình tự tính hạn lúc đọc.
- **G-A5-17. Theo đánh giá Đợt 5.** Giờ gộp vào chữ `diemSapToi`. Không chia người lớn / trẻ em, không số thứ tự đề nghị, không km (Q2-Q6a, `docs/design/van-chuyen-dot-3-7/danh-gia/dot-5.md:95-133`).
- **G-A5-18. Ai thấy hộp duyệt.** Menu và huy hiệu "Đề nghị cần duyệt" chỉ hiện cho người có `trip.override`. Người có `trip.view` xem chỉ-đọc trong chi tiết chuyến (Q7).
- **G-A5-19. Đề nghị đã leo thang.** Không hết hạn (ADR :61, Q1), không rút được (Q2d). Không có nút "Xin phá lệ" (Q2a). Dòng chữ hiện: "Văn phòng sẽ được báo" (Q2c).
- **G-A5-20. Tài xế đối tác.**
  - Danh sách xe nhận chỉ hiện tài xế công ty cho tới khi A4 gộp. Đây là bộ lọc hiển thị, giống P9 của Đợt 5.
  - Nhánh nào gộp sau thì đặt ô `DRIVER_PARTNER` của `trip.transfer` = `assigned` (ADR-0053 :46).
  - Không có mã quyền mới, nên `EXTERNAL_PERMISSIONS` và trigger LC-1 không đổi (ADR-0053 :50, CLAUDE.md §10). Ghi rõ điều này trong sổ.
- **G-A5-21. Chuyển khách tính là tiến độ.** Đã chuyển khách ra hay vào thì không thu hồi xuất bến được.
  - Dựng lại `vc_trip_revoke_no_progress` để đếm cả sự kiện có `related_trip_id = NEW.id`.
  - Sửa luôn hàm kiểm phía máy chủ của lệnh thu hồi (`lenhThuHoiXuatBen`).
  - Đây là chỗ siết.
- **G-A5-22. So mã lệnh.** Các lệnh Rút / Nhận / Không nhận / Duyệt / Bác so `request_id` theo cả mã đề nghị, để không mở lại lỗ BL-VC-MA-LENH (1) (`docs/BACKLOG.md:205`).
- **G-A5-23 (✦). "Bác" trong D6.2 gồm cả `DECLINED`.** Khi tài xế B bấm Không nhận, tin báo tới tài xế A.
- **G-A5-24. Lô kích thước hằng.**
  - Đóng, mở suất, thêm điểm, ghi manifest bằng câu tập hợp (`INSERT … SELECT`, `UPDATE … WHERE`), không viết mỗi suất một câu.
  - Số câu không phụ thuộc số khách, và nằm dưới trần câu lệnh Đ2 dùng (ADR-0104 :154).
- **G-A5-25. Tên loại sự kiện** (danh sách mở trong mã `LOAI_SU_KIEN_CHUYEN`): `TRANSFER_SENT`, `TRANSFER_WITHDRAWN`, `TRANSFER_DECLINED`, `TRANSFER_EXPIRED`, `TRANSFER_ESCALATED`, `TRANSFER_CONFIRMED`, `TRANSFER_REJECTED`.

### 1b. Việc chạm dữ liệu, quyền, tiền, hợp đồng: hộp hỏi chủ

Lượt này có 1 quyết định dữ liệu và 1 xác nhận theo yêu cầu của ADR. Từ 2 hộp trở lên phải kèm trang ghép (mục 5).

Không hỏi lại những điều ADR đã chốt: ô duyệt (ADR-0104 :101), lý do Duyệt (ADR-0052 :80), mốc 6 giờ (ADR-0052 :77 / ADR-0104 :230), ô của tài xế đối tác (ADR-0053 :46).

**Hộp 1. Tiêu đề: "Luật chuyển"**

> Khi tài xế nhờ xe khác đón khách, máy kiểm một bộ luật: còn chỗ không, có trùng giờ không, có vướng mốc 6 giờ không, giấy tờ xe còn hạn không. Anh/chị đã dặn ngày 2/10 là bộ luật này phải để dạng danh sách, muốn thêm luật thì thêm một dòng. Văn bản quyết định cũ lại khoá cứng 9 luật, nên em soạn văn bản mới thay câu đó. Anh/chị chọn cách nào?
>
> 1. **Duyệt danh sách luật, thêm luật xe riêng và luật khách đã huỷ (Recommended).**
>    - Được: sau này thêm luật không phải sửa cấu trúc. Khách đã đặt xe riêng hoặc đặt số chỗ tối thiểu mà bị chuyển sang xe khác thì phải qua Quản trị duyệt kèm lý do, không lọt êm. Khách vừa huỷ đơn bị chặn ngay từ lúc kiểm.
>    - Mất: thêm luật xe riêng nên một số đề nghị phải chờ Quản trị duyệt. Phải duyệt văn bản này trước khi bắt đầu làm phần dữ liệu.
> 2. **Duyệt danh sách luật, giữ đúng 9 luật cũ.**
>    - Được: đúng như văn bản đã duyệt, ít đề nghị phải chờ duyệt hơn.
>    - Mất: khách đặt xe riêng có thể bị chuyển sang xe đi chung mà không ai duyệt. Phần kiểm định kỳ sẽ báo lỗi sau đó và văn phòng phải gỡ tay.
> 3. **Chưa làm phần nhờ xe khác đón lúc này.**
>    - Được: không đổi gì.
>    - Mất: tài xế vẫn phải gọi văn phòng. Xe hỏng thì khách chờ lâu hơn, vì phải kết thúc chuyến rồi văn phòng mới xếp xe khác.

ADR mới (số tạm: số kế tiếp trong `docs/adr/README.md`; hôm nay mục lục ghi "kế tiếp 0111", điều phối viên xác nhận) sẽ chép kèm:
- việc tách cột suất làm hai: `transfer_id` (đề nghị đã mở suất) và `closed_transfer_id` (đề nghị đã đóng suất). Cần tách vì một suất có thể được chuyển vào rồi lại chuyển ra;
- các điểm ✦ ở mục 1a.

**Hộp 2. Tiêu đề: "Ca mẫu A/B"**

> Văn bản ngày 30/9 dặn: trước khi nghiệm thu phần chuyển khách, anh/chị xác nhận bộ ca mẫu, gồm xe A nhờ xe B đón và xe hỏng chuyển khách sang xe cứu hộ. Em soạn sẵn 10 ca. Mỗi ca nói rõ ai bấm, máy tự nhận hay chờ Quản trị, khách nào sang xe nào, ai nhận tin.
>
> 1. **Đúng, dùng bộ ca này (Recommended).**
>    - Được: làm xong là nghiệm thu được ngay.
>    - Mất: không có.
> 2. **Sửa vài ca (anh/chị ghi rõ ca nào sai).**
>    - Được: sát thực tế hơn.
>    - Mất: chưa nghiệm thu được cho tới khi sửa xong.

Hộp 2 chặn việc **nghiệm thu**, không chặn việc làm. Tệp ca mẫu soạn ở T1. 10 ca:
1. A nhờ B đang chạy đón một điểm; mọi luật đạt, máy tự xác nhận.
2. B chưa chạy, còn dưới 6 giờ; đề nghị chờ Quản trị.
3. B hết chỗ; đề nghị chờ, nhưng chỉ Bác được.
4. B không nhận, có lý do.
5. Quá giờ chờ.
6. A tới điểm trước khi B nhận; đề nghị tự huỷ.
7. Cứu hộ: 5 khách đã lên xe được C đón ở nơi gặp; 3 khách đang chờ được C đón ở nơi cũ.
8. Văn phòng bấm thay việc cứu hộ.
9. Chặng xe riêng; đề nghị chờ Quản trị.
10. Ca Mường Thanh / Alibu (spec §5.5, :766-790).

---

## 2. Tiêu chí nghiệm thu (viết trước việc)

| Mã | Tiêu chí |
|---|---|
| NT-A5-1 | **Danh mục luật.** Bảng `vc_transfer_rule` có 11 dòng gieo. Dòng kiểm mang mã luật ngoài danh mục thì bị chặn ở tầng CSDL. Dòng kiểm có tầng khác tầng trong danh mục cũng bị chặn. Không đổi được mã hay tầng của dòng danh mục, không xoá được dòng. Không route nào ghi danh mục. Hằng `TANG_LUAT` trong mã khớp từng dòng gieo. |
| NT-A5-2 | **Danh sách xe nhận.** Mỗi mục có đúng các khoá `tripId, maChuyen, tenTaiXe, choTrong, diemSapToi` (bài liệt kê khoá). Chỉ chuyến cùng ngày, `PLANNED` hoặc `RUNNING`, có tài xế mở, tài xế khác người gửi. Với `ONBOARD` chỉ chuyến `RUNNING`. Trước khi A4 gộp chỉ có tài xế công ty. Không có khách, biển số, SĐT, mã đơn. |
| NT-A5-3 | **Gửi `STOP` hợp lệ** trả 200. Đề nghị ở `PENDING` với `pax_count` đúng. Có đúng 1 sự kiện `TRANSFER_SENT` ở chuyến B (`related` = A) và 1 dòng nhật ký. Tài xế B nhận tin, tài xế A không. |
| NT-A5-4 | **Gửi bị chặn, không ghi gì, trả 409 kèm mã:** điểm không còn `PENDING`; có suất không phải `WAITING`; A không `RUNNING`; B khác ngày; B cùng tài xế; B không có tài xế mở; điểm đã có đề nghị đang chờ (`STOP` hay `ONBOARD`). Người gọi không lái A thì trả 404, kể cả Toàn quyền. |
| NT-A5-5 | **Đóng lười khi gửi lại.** Đề nghị `PENDING` đã quá hạn mà A gửi lại thì lô đóng nó thành `EXPIRED` trước, rồi mới thêm đề nghị mới. Chỉ mục ghép một phần vẫn đúng. |
| NT-A5-6 | **Nhận, máy tự xác nhận** (mọi dòng `DAT`/`CANH_BAO`, công tắc bật, còn hạn). Đề nghị `CONFIRMED`, `decided_mode = 'MAY'`. Suất ở A đóng `TRANSFERRED` với `closed_transfer_id`. Suất ở B mở với `transfer_id`, giữ trạng thái, có `added_after_departure` khi B đang chạy. Điểm đón (và điểm trả nếu B chưa có nơi đó) được tạo hoặc ghép theo `khoaNoi`. Điểm ở A thành `MOVED`. Có dòng manifest nếu B đã xuất bến. Không chụp lại mốc hẹn. Có 1 sự kiện. Tin tới A (B là người bấm nên không tự nhận tin). |
| NT-A5-7 | **Nhận, leo thang.** Gặp bất kỳ dòng `KHONG_DAT` nào (tầng nào cũng vậy), hoặc công tắc đang tắt, thì đề nghị thành `ESCALATED`; suất không đổi; tin "cần xử lý" tới người có `trip.override`. Có dòng `LOI` thì hộp duyệt chỉ cho Bác. |
| NT-A5-8 | **Không nhận.** Lý do nhóm `TU_CHOI_NHAN` là bắt buộc. Đề nghị `DECLINED`, có tin tới A. |
| NT-A5-9 | **Rút.** Chỉ rút được khi `PENDING` và chỉ tài xế A. Đề nghị `ESCALATED` thì trả 409 `da_leo_thang`. |
| NT-A5-10 | **Nhận muộn** trả 200 `{ketQua:"HET_HAN"}`, ghi `EXPIRED` và sự kiện, tin tới A. Đề nghị `ESCALATED` không bao giờ thành `EXPIRED` (có trigger chặn). |
| NT-A5-11 | **Duyệt.** Chỉ người có `trip.override`; lý do nhóm `PHA_LE` là bắt buộc. Chạy lại kiểm. Có dòng `LOI` thì 409 và không ghi. Mọi `KHONG_DAT` đều `CAU_HINH` thì đề nghị `CONFIRMED`, `decided_mode = 'NGUOI'`. Khi `CAM_KET_DICH` không đạt thì ghi khoá cam kết của B theo khuôn ADR-0056 A3. Tin tới A và B. Trigger chặn duyệt khi có dòng `LOI`, kể cả khi viết thẳng SQL. |
| NT-A5-12 | **Bác.** `trip.override`, lý do `TU_CHOI_NHAN` bắt buộc. Đề nghị `REJECTED`, tin tới A và B. Bán hàng gọi thẳng route duyệt hay bác thì nhận 403. |
| NT-A5-13 | **MQ-09.** Mỗi lệnh trong danh sách G-A5-13 làm đề nghị liên quan thành `VOID` trong cùng lô, có `closed_cmd_id`, không thêm sự kiện. |
| NT-A5-14 | **Cứu hộ `ONBOARD`.** Có đúng một trong hai: nơi gặp chọn từ địa điểm, hoặc chữ tự do (dãy từ 8 chữ số trở lên đã bị che khi lưu). Suất `BOARDED` sang B tại điểm nơi gặp, vẫn `BOARDED`. Suất `WAITING` sang B ở nơi đón gốc. Sau đó A bấm Kết thúc gián đoạn được (LC-16 không vướng vì suất đã đóng). |
| NT-A5-15 | **Văn phòng bấm thay.** `POST /chuyen/:id/cuu-ho` (`trip.progress`) chỉ nhận `ONBOARD`; gửi `STOP` thì 400. `proposed_by_staff_id` là người bấm. Văn phòng không có route Nhận. Route của văn phòng và route của tài xế gọi cùng một hàm xử lý. |
| NT-A5-16 | **Không lộ tên (LC-18).** DTO đề nghị, danh sách xe nhận, tin và nhật ký không có tên, năm sinh, SĐT, số giấy tờ, chữ nơi gặp (riêng chữ nơi gặp được hiện trong DTO đề nghị cho hai tài xế, đã che). Sau `CONFIRMED`, B thấy tên khách qua chi tiết chuyến của mình, trong khung ngày chạy. |
| NT-A5-17 | **Tin.** Đúng bảng D6.2 cộng G-A5-23. Trả 409 thì không có tin. `VOID` và `WITHDRAWN` không có tin. |
| NT-A5-18 | **Lớp CSDL.** Đóng hay mở suất trên chuyến `RUNNING` bằng đường chuyển mà đề nghị chưa `CONFIRMED` bởi chính lệnh đó thì RAISE. Gỡ nhánh mới khỏi trigger thì câu đó đi qua (vế "bỏ trigger"). |
| NT-A5-19 | **Thu hồi xuất bến.** A hay B đã có chuyển khách thì thu hồi bị chặn, ở cả tầng CSDL lẫn máy chủ. |
| NT-A5-20 | **Chạy đua.** Nhận đúng lúc A rút; nhận đúng lúc A bấm Đã tới; văn phòng thêm điểm vào B đúng lúc B nhận (tự thử lại một lần); hai đề nghị khác điểm cùng đổ vào B làm vượt chỗ (cái sau leo thang). Ca A gửi cùng một điểm cho cả B và C thì bị chỉ mục ghép chặn. |
| NT-A5-21 | **Mã lệnh dùng lại.** Cùng `request_id` và cùng đề nghị thì trả kết quả cũ. Cùng `request_id` mà khác đề nghị thì 409. |
| NT-A5-22 | **Quyền.** Ma trận ô đúng như mục 5.2. Không đổi `EXTERNAL_PERMISSIONS` hay LC-1. Bài ghim `trip.transfer`: SALES và ADMIN = `none`. |
| NT-A5-23 | **Bất biến.** R-VC-26 đến R-VC-30 xanh trên dữ liệu e2e và đỏ trên dữ liệu gieo hỏng. R-VC-16 không báo giả cho nơi gặp. |
| NT-A5-24 | **Chính sách.** Hai cột mới có mặc định (10 phút, bật); chỉ Toàn quyền sửa. Tắt công tắc thì mọi Nhận đều leo thang. |
| NT-A5-25 | **Đ2.** Sau khi chuyển khách, máy đồng bộ của Đ2 không nhắc nhầm. Chặng có suất mở ở chuyến khác vẫn tính là "đã xếp". |
| NT-A5-26 | **Lô kích thước hằng.** Số câu trong lô xác nhận như nhau khi chuyển 1 khách hay 30 khách, và nằm dưới trần của Đ2. |
| NT-A5-27 | **Hướng dẫn.** Hướng dẫn tài xế cập nhật đúng. Bài A4 của `huong-dan.test.ts` xanh. Trần chữ Bán hàng và Quản trị giữ ≤ 4500. |

---

## 3. Lát thi công: commit nhỏ, viết bài đỏ trước

Mỗi commit đi theo vòng: viết bài, thấy đỏ đúng thông báo, sửa, thấy xanh. Chạy `npm test` và `npm run typecheck`. Tệp test không được typecheck phủ, nên phải tự đọc lại.

**T0. Đo lại, không commit.** Làm sau khi Đ1, Đ2 (0089) và ADR-0105 (0090) đã gộp.
- Số migration và số ADR:
  - Quét số migration ở mọi nhánh chưa gộp (`git log --all --name-only -- 'migrations/*'`). Hôm nay: QR có 0087/0088, Đ2 có 0089, ADR-0105 có 0090, A4 có lẽ lấy 0091. Đề xuất A5 lấy **0092**, hoặc số trống kế tiếp.
  - Số ADR đọc từ `docs/adr/README.md`.
- Số dòng: đo lại số dòng route trong `index.ts`.
- Mã Đ1 phải đọc:
  - `lop-vuot.test.ts:45-60`;
  - đường tin `related_trip_id` (CAO-2);
  - `gioXetMocXep`.
- Mã Đ2 phải đọc:
  - view `v_ord_leg_commit` (G10), cột `exclusive_vehicle`, `min_vehicle_seats`;
  - ngoại lệ có tên của Đ2 trong `thu-tu-lo.test.ts`;
  - trần câu lệnh.
- Trigger 0042 phải kiểm: `vc_trip_event_after_departure` có liệt kê loại sự kiện không; `vc_trip_departed_after_plan` có bị sự kiện `TRANSFER_SENT` đặt trên chuyến `PLANNED` làm vướng không; trigger nào gắn `version` với `last_cmd_id` (G-A5-12).
- Hướng dẫn: đo lại số chữ và số phút đọc.
- Quyền và bất biến:
  - Đọc `docs/quyen-hoan.json`. Hiện có các lỗ HIGH đang mở: TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-4.2, HC-5.11. A5 không đụng tiền, không thêm cron, không thêm luồng danh tính, nên **không** xây trên lỗ nào. Nếu T0 thấy khác thì phải ghi "xây trên lỗ đang hở: <mã>".
  - Đọc mục lục ADR xem có ADR nào sau ADR-0104 sửa ADR-0052 không.

**T1. Bản thảo ADR mới, trang ghép, tệp ca mẫu.** Chỉ có tài liệu.
- Bản thảo nằm ở `docs/superpowers/specs/<ngày>-a5-chuyen-khach/`: bản thảo ADR, trang ghép (mục 5), `golden/dieu-phoi/xe-a-b-luot-2-chuyen-khach.json` với `"trang_thai": "cho_xac_nhan"`.
- Hỏi chủ Hộp 1 và Hộp 2 trong **cùng một lượt**.
- Sau khi chủ duyệt:
  - chép ADR vào `docs/adr/ADR-01xx-danh-muc-luat-chuyen-khach.md`;
  - thêm dòng mục lục ở `docs/adr/README.md`;
  - ở dòng 3 của ADR-0052, chỉ thêm câu trỏ sang ADR mới;
  - ghi vào sổ thi công nguyên văn nhãn chủ đã chọn.
- **Từ T2 trở đi chỉ làm khi Hộp 1 đã được duyệt.** Chủ chọn phương án 3 thì dừng A5.

**T2. Migration `0092_chuyen_khach_giua_xe.sql` và bài lớp CSDL.**
- **Bài viết trước:** `src/modules/van-chuyen/chuyen-khach-csdl.test.ts`, khuôn `dieu-chinh-csdl.test.ts`: dựng schema từ mọi migration bằng `node:sqlite`, biến môi trường `CHUYEN_KHACH_SQL` cho bản đột biến.
  - Ca: NT-A5-1, NT-A5-18, NT-A5-19, đồ thị trạng thái, LC-14, `confirm_core`, `confirm_may`, `escalate_has_evidence`, chỉ mục ghép đề nghị đang chờ, tầng dòng kiểm khớp danh mục, chặn xoá (`no_delete`), chặn sửa (`no_update`).
  - Mỗi ca có vế "bỏ trigger thì câu đi qua".
- **Đỏ mong đợi:** `Error: no such table: vc_transfer_rule`.
- **Đầu tệp:** khối `-- HOÀN TÁC (D1 không có Down):`, ghi lần lượt:
  - lệnh `DROP TRIGGER` cho từng trigger mới;
  - dựng lại các trigger LC-15 và `revoke_no_progress` theo thân ở 0085 và 0076 (dẫn số dòng);
  - hai bảng mới chỉ được xoá khi còn rỗng; nếu không thì để nguyên;
  - các cột thêm để nguyên vì vô hại.
- **Bảng danh mục `vc_transfer_rule`:**
  - cột: `code` (khoá chính), `label`, `tier` `CHECK IN ('LOI','CAU_HINH')`, `sort_order`, `active` `CHECK IN (0,1)`, `created_at`;
  - trigger: chặn xoá; `code` và `tier` bất biến;
  - gieo 11 dòng:
    - tầng `CAU_HINH`: `KHOANG_NGHI_DICH`, `MOC_TOI_THIEU`, `CAM_KET_DICH`;
    - tầng `LOI`: `SUC_CHUA_DICH`, `SUC_CHUA_NGUON`, `TRUNG_GIO_DICH`, `HANG_BANG_DICH`, `GIAY_TO_DICH`, `KHONG_CHEO`, `DIEM_CHUA_TOI`, `CHANG_KHACH_HIEU_LUC`.
  - Nếu chủ chọn phương án 2 thì chỉ gieo 9 dòng cũ.
- **Bảng `vc_transfer_request`:**
  - cột theo ADR :55-63, thêm `request_id`, `decided_cmd_id`, `closed_cmd_id`;
  - CHECK trên `scope`, `status`, `decided_mode` (cấu trúc, không phải danh sách mở);
  - CHECK theo phạm vi: `STOP` thì `from_stop_id` có giá trị và không có nơi gặp; `ONBOARD` thì có đúng một trong `meet_location_id` / `meet_place_text`;
  - khoá ngoại tới `vc_reason(code)` cho ba cột lý do, và tới `vc_dispatch_policy(id)`;
  - chỉ mục ghép một phần: `(from_stop_id) WHERE scope='STOP' AND status IN ('PENDING','ESCALATED')` và `(from_trip_id) WHERE scope='ONBOARD' AND status IN (…)`;
  - trigger:
    - `_no_delete`, `_identity`;
    - `_status_forward`: đúng đồ thị ADR :61;
    - `_decided_once`;
    - `_lc14`: LC-14 cộng G-A5-6 và G-A5-7;
    - `_confirm_core`: `ESCALATED → CONFIRMED` đòi `override_reason_code`, `decided_mode = 'NGUOI'`, và không có dòng kiểm `KHONG_DAT` tầng `LOI` của `decided_cmd_id`;
    - `_confirm_may`: `PENDING → CONFIRMED` đòi `MAY`, không có `KHONG_DAT`, và công tắc của `policy_id` đang bật;
    - `_escalate_has_evidence`.
- **Bảng `vc_transfer_check`:**
  - khoá ngoại `rule_code REFERENCES vc_transfer_rule(code)`, không còn `CHECK IN`;
  - cột `cmd_id`;
  - `UNIQUE(transfer_id, cmd_id, rule_code)`;
  - trigger: chặn sửa, chặn xoá; tầng phải khớp danh mục; luật phải `active = 1`.
  - `gia_tri` và `gioi_han` chỉ chứa số hoặc ngày `yyyymmdd`. Không bao giờ chứa số giấy tờ.
- **`vc_trip_allocation`:**
  - thêm cột `transfer_id` và `closed_transfer_id`, cả hai trỏ tới `vc_transfer_request(id)`;
  - dựng lại `vc_trip_allocation_identity` (bản 0085) thêm hai luật: hai cột bất biến; `close_reason = 'TRANSFERRED'` ⇔ `closed_transfer_id` có giá trị.
- **`vc_dispatch_policy`:** thêm `accept_wait_minutes INTEGER NOT NULL DEFAULT 10 CHECK (BETWEEN 1 AND 120)` và `auto_confirm_transfer INTEGER NOT NULL DEFAULT 1 CHECK IN (0,1)`.
- **Dựng lại LC-15 với nhánh chuyển khách:**
  - `alloc_ins`, `alloc_close`, `stop_ins`, các trigger cân lô;
  - điều kiện nhánh: `EXISTS (SELECT 1 FROM vc_transfer_request r WHERE r.id = NEW.transfer_id` (khi đóng thì dùng `closed_transfer_id`) `AND r.status='CONFIRMED' AND r.decided_cmd_id = t.last_cmd_id)`.
- **Dựng lại `vc_trip_revoke_no_progress`:** đếm thêm `related_trip_id = NEW.id` (G-A5-21).
- **Gieo** nhóm `TU_CHOI_NHAN`, 4 dòng.
- **Sửa ở:** tệp migration mới; `docs/data-dictionary.json` (3 bảng, 4 cột; mục `vc_trip_allocation` ở `:417`) rồi chạy `npm run dict`.

**T3. Hàm thuần `src/shared/chuyen-khach.ts` và bài `chuyen-khach.test.ts`.**
- **Bài viết trước:**
  - `kiemChuyen` luôn trả đủ bộ luật trong danh mục;
  - đích `RUNNING` thì `MOC_TOI_THIEU` = `DAT`;
  - `KHOANG_NGHI_DICH` ra `CANH_BAO` khi B có chuyến kế trong 2 lần khoảng nghỉ;
  - `quyetDinhSauKiem`, `duocDuyetThay`;
  - `hetHanDeNghi` chỉ áp cho `PENDING`;
  - `datChoOnboard` (G-A5-8);
  - `chuanNoiGap` (che số, trần độ dài);
  - `XeNhanDto` và `DeNghiDto`: bài liệt kê khoá, không có khoá nào chứa "ten"/"phone"/"so";
  - `TANG_LUAT` khớp dòng gieo của migration (đọc tệp `.sql`).
- **Đỏ mong đợi:** `ERR_MODULE_NOT_FOUND … src/shared/chuyen-khach.ts`.
- **Sửa ở:**
  - tệp mới;
  - `src/shared/dieu-phoi-kieu.ts:37` (`LOAI_SU_KIEN_CHUYEN`), `:51` (`NHAN_SU_KIEN_CHUYEN`), `:127` (`LENH_DONG_SUAT`: `TRANSFERRED` có lệnh);
  - `NHAN_LUAT_CHUYEN`: nhãn tiếng Việt.

**T4. Quyền.**
- **Bài viết trước:**
  - `src/shared/permissions.test.ts:321`, ghim hàng DRIVER: thêm `trip.transfer: assigned`;
  - bài mới: `trip.transfer` có SALES và ADMIN = `none`;
  - `:356` (DRIVER_PARTNER) giữ `none` cho tới khi A4 gộp.
- **Đỏ mong đợi:** `AssertionError … 'trip.transfer'` (ô chưa tồn tại).
- **Sửa ở:** `src/shared/permissions.ts:197`, thêm dòng `"trip.transfer": row("none","none","none","none","none","any","none","assigned","none","none")`. Kèm nhãn ô nếu bảng quyền có danh sách nhãn.
- Đây là nới có tên N1 (mục 4).

**T5. Câu SQL trong `chuyen-repo.ts`.** Câu tĩnh qua `defineSql`; bài EXPLAIN của `sql-registry`.
- **Đỏ mong đợi:** bài EXPLAIN hoặc `architecture.test.ts` báo thiếu câu.
- **Câu mới:**
  - cổng: `TRIP_GATE_CHAY_HOAC_CHO` (B `PLANNED`/`RUNNING`, không kiểm version, cùng ngày), `TRIP_GATE_DOI_CHAY` (B kiểm version, đòi A mang dấu lệnh; khuôn `TRIP_GATE_DOI` `:347`);
  - đề nghị: `TRANSFER_INSERT`, `TRANSFER_SET_STATUS`, `TRANSFER_EXPIRE_LAZY`;
  - tự huỷ: `TRANSFERS_VOID_BY_STOP`, `TRANSFERS_VOID_BY_TRIP`;
  - dòng kiểm: `TRANSFER_CHECK_INSERT`;
  - suất: `ALLOC_CLOSE_TRANSFER` (tập hợp; khuôn `ALLOC_CLOSE` `:455`), `ALLOC_OPEN_TRANSFER` (`INSERT … SELECT`, giữ trạng thái; khuôn `ALLOC_DIEU_CHINH_INSERT` `:544`; **không** dùng `ALLOC_INSERT` `:447` vì câu đó cứng `'WAITING'`);
  - điểm và manifest: `STOP_ADD_TRANSFER` (khuôn thêm điểm khi xe chạy của `loThemDiemDangChay`), `STOP_SET_MOVED`, `MANIFEST_TRANSFER` (khuôn `MANIFEST_THEM_SAU` `:520`);
  - đọc: `XE_NHAN_LIST`, `DE_NGHI_BY_ID`, `DE_NGHI_GUI_TOI`, `DE_NGHI_THEO_NGAY`.

**T6. Hàm lô `src/modules/van-chuyen/dieu-phoi-chuyen-khach.ts`.**
- **Bài viết trước:** siết `thu-tu-lo.test.ts:21` để quét thêm tệp mới. Thêm mẫu vào `MAU` (`:44`) cho `loGuiDeNghi`, `loDongDeNghi` (rút / không nhận / hết hạn), `loNhanDeNghi` (xác nhận hoặc leo thang), `loDuyetDeNghi`, `loBacDeNghi`. Thêm bài mới `chuyen-khach-lo.test.ts` cho NT-A5-26.
- **Đỏ mong đợi:** `loGuiDeNghi: hàm dựng lô không có mẫu` sau khi mở rộng phạm vi quét.
- **Thứ tự lô xác nhận:**
  1. cổng A (`TRIP_GATE_DANG_CHAY_VERSION` `:501`);
  2. cổng B (`TRIP_GATE_DOI_CHAY`);
  3. nhật ký `changes() > 0`;
  4. sự kiện (đúng 1 sự kiện, mang `requestId`);
  5. các dòng kiểm;
  6. đổi trạng thái;
  7. đóng suất ở A;
  8. mở suất ở B;
  9. thêm điểm ở B;
  10. điểm A thành `MOVED`;
  11. manifest;
  12. huỷ các đề nghị khác (khi `ONBOARD`);
  13. khoá cam kết B (khi `CAM_KET_DICH` không đạt và người duyệt);
  14. `TRIP_CHOT`.
- Mọi câu ghi đều có điều kiện `EXISTS (… last_cmd_id = cmd)`.
- Ghi nhãn tốt: cập nhật danh sách ở `ma-lenh-dung-lai.test.ts`, mỗi lệnh mới có `traLenhLap`.

**T7. Route tài xế, cổng `staff`.**
- **Bài viết trước:** `chuyen-khach-route.test.ts`, gồm NT-A5-2..10, 15, 20, 21.
  - Gác `can(trip.transfer,{assigned:true})` đứng trước mọi truy vấn.
  - Người gọi không đang lái thì 404.
  - Đề nghị không phải của mình thì 404.
- **Đỏ mong đợi:** `404 !== 200` (route chưa có).
- **Route:**
  - `GET /cuoc-cua-toi/:id/xe-nhan?pham-vi=`
  - `POST /cuoc-cua-toi/:id/de-nghi`
  - `POST /de-nghi/:rid/rut`, `/nhan`, `/khong-nhan`
  - `GET /de-nghi-gui-toi`
- **Sửa ở:** `src/modules/van-chuyen/index.ts`, nhóm route tài xế `:1458-1697`. Hàm `cuuHoTu` (`cuu-ho.ts`) tách phần lọc ra để dùng chung, thêm tham số "chỉ RUNNING".
- **Bài gác bị kéo theo:** `src/permission-enforcement.test.ts`, `src/route-write-guard.test.ts`, `src/orders-cong-bo.test.ts`. Luật `CHANG_KHACH_HIEU_LUC` đọc qua view công bố, không gọi hàm hẹp của `orders`.

**T8. Route văn phòng, cổng `office`.**
- **Bài viết trước:**
  - bài cặp trong `tien-do-mot-luat.test.ts`: `POST /chuyen/:id/cuu-ho` và `POST /cuoc-cua-toi/:id/de-nghi` gọi cùng một hàm;
  - NT-A5-11, NT-A5-12, NT-A5-15;
  - ngoại lệ có tên `DUYET_BAC_DE_NGHI` trong `lop-vuot.test.ts` NT-3(b): đúng 2 dòng `can(staff, "trip.override")` thuộc route `duyet` và `bac`, không có `"trip.urgent_adjust"`, đếm đúng 2. Đây là nới có tên N2.
- **Đỏ mong đợi:** `chuỗi ô vượt luật ngoài biểu thức đổi lớp: [ 'index.ts:NNNN', 'index.ts:MMMM' ]`.
- **Route:**
  - `POST /chuyen/:id/cuu-ho` (`trip.progress`; `ONBOARD`; khác đường dẫn với `GET /chuyen/:id/cuu-ho` của lượt 1, `:1264`)
  - `GET /chuyen/:id/cuu-ho/xe-nhan` (`trip.progress`)
  - `GET /de-nghi?ngay=` (`trip.view`, trả cả `kiem[]`)
  - `POST /de-nghi/:rid/duyet`, `/bac`
- DTO không có cờ "được duyệt". Giao diện tự hỏi `can` để ẩn hay hiện, nên không thêm dòng `"trip.override"` thứ ba vào module.

**T9. Móc MQ-09.**
- **Bài viết trước:** với mỗi lệnh trong G-A5-13, `MAU` của `thu-tu-lo` có câu `TRANSFERS_VOID_*` đứng sau `SU_KIEN`. Bài route kiểm đề nghị thành `VOID` (NT-A5-13).
- **Đỏ mong đợi:** `loDaToi: thiếu câu TRANSFERS_VOID_BY_STOP` (và tương tự cho từng lệnh).
- **Sửa ở:** `dieu-phoi.ts`: `loDaToi`, `loBoQua`, `loKetThuc`, `loKetThucGianDoan` `:688`, `loBaoHuy` `:419`, `loHuyChuyen`, thu hồi xuất bến. Thêm `dieu-phoi-dieu-chinh.ts`. Sau khi Đ1 và Đ2 gộp, đo lại tên hàm và số dòng.

**T10. Tin báo.**
- **Bài viết trước:** `tin-chuyen.test.ts`. Hàm người nhận chạy với **mọi tập con quyền** (khuôn NT-3 của ADR-0052 :229):
  - `trip_transfer_sent`: tài xế đích;
  - `_confirmed`, `_rejected`, `_declined`, `_expired`: tài xế nguồn và đích, trừ người bấm;
  - `_escalated`: người có `trip.override`;
  - không có tin `withdrawn` và `void`.
  - `architecture.test.ts`: không có cạnh `thongbao → van-chuyen`.
- **Đỏ mong đợi:** `laHanhDongTinChuyen('trip_transfer_sent') false`.
- **Sửa ở:**
  - `src/shared/tin-chuyen.ts:8` (`HANH_DONG_TIN_CHUYEN`), `:55` (nhánh trong `loaiCho`), bảng `CAU`;
  - `src/index.ts:108-127` (`baoThayDoiChuyen`), dùng lại đường `related` của CAO-2.

**T11. Nhật ký và bất biến.**
- **Bài viết trước:** `src/audit-invariants.test.ts` có ca gieo hỏng cho từng mã.
  - R-VC-26: đề nghị `CONFIRMED` mà số suất có `closed_transfer_id = r` ≠ số suất **từng** mở với `transfer_id = r`.
  - R-VC-27: suất `TRANSFERRED` không có `closed_transfer_id`, hoặc trỏ tới đề nghị chưa `CONFIRMED`.
  - R-VC-28: đề nghị `CONFIRMED` + `NGUOI` mà có `KHONG_DAT` tầng `LOI` ở `decided_cmd_id`.
  - R-VC-29: tầng dòng kiểm khác tầng danh mục.
  - R-VC-30: đề nghị `PENDING`/`ESCALATED` mà điểm nguồn không còn `PENDING` hoặc chuyến nguồn không còn `RUNNING`. Đây là lưới thứ hai cho MQ-09.
  - Mã R-VC-26..30 do điều phối viên cấp.
- **Đỏ mong đợi:** `R-VC-26 không có trong danh sách kiểm`.
- **Sửa ở:**
  - `scripts/audit-checks.mjs`, gần `:861`;
  - `:670` R-VC-16: loại trừ suất có `transfer_id` của đề nghị `ONBOARD`, đang `BOARDED`, đón tại nơi gặp. Đây là nới có tên N3;
  - `src/shared/audit-actions.ts:115-157`: 7 hành động `trip_transfer_*` có nhãn tiếng Việt. Phần `detail` chỉ gồm mã chuyến, phạm vi, số khách, mã luật không đạt.
  - Bài `giay-to-khong-lo-so.test.ts` phủ `gia_tri` của `GIAY_TO_DICH`.
  - Nếu R-VC-17 báo giả cho suất chuyển vào (vì suất không chụp lại mốc hẹn, ADR :73) thì thêm nới có tên N5.

**T12. Chính sách và lý do.**
- **Bài viết trước:** `src/modules/van-chuyen/chinh-sach.test.ts:113`, bài đủ cột: thêm hai cột; `kiemChinhSachMoi` từ chối giá trị ngoài 1-120 và ngoài {0,1}; `NHOM_LY_DO_HIEN` có `TU_CHOI_NHAN`.
- **Đỏ mong đợi:** `deepEqual` thiếu `accept_wait_minutes`.
- **Sửa ở:** `src/index.ts:677-706` (route chính sách, ô `settings.ops`), `src/shared/chinh-sach-hien-thi.ts:209`, `web/chinh-sach-dieu-phoi.ts` (2 ô nhập), `web/ly-do-dieu-phoi.ts`.

**T13. Giao diện tài xế** (`web/cuoc-chuyen.ts`).
- Mỗi điểm `PENDING` có nút "Nhờ xe khác đón". Bấm vào mở tấm chọn xe (4 trường) và nút "Gửi đề nghị".
- Thẻ trạng thái: "Đang chờ xe X nhận, còn N phút" (tính lúc đọc); nút "Rút đề nghị". Khi đã leo thang: "Văn phòng sẽ được báo", không có nút Rút.
- Khối sự cố (`:379`) thêm nút "Chuyển khách sang xe khác". Bấm vào mở chọn nơi gặp: địa điểm hoặc chữ (đã che).
- Ngăn "Đề nghị gửi tới" có hai nút Nhận / Không nhận. Không nhận phải chọn lý do lấy từ DTO.
- Chữ trên giao diện để trong `src/shared/xe-dang-chay-man.ts`. Có bài thuần cho chữ.
- Bản vẽ tham khảo: `docs/design/van-chuyen-dot-3-7/Điều phối xe đang chạy.dc.html` (V8, V9, V10, CH.1).

**T14. Giao diện văn phòng.**
- `web/chuyen.ts`:
  - `theCuuHoKhoi` `:275` và `moGianDoan(…, laCuuHo)` `:551`, `:709`: thêm "Chuyển khách sang xe cứu hộ (nơi gặp)" khi chuyến `RUNNING` và người dùng có `trip.progress`;
  - danh sách đề nghị chỉ-đọc trong chi tiết chuyến.
- Trang mới `web/de-nghi.ts` và `public/de-nghi.html` "Đề nghị cần duyệt":
  - menu và huy hiệu chỉ cho `trip.override`;
  - bảng `kiem[]` có nhãn luật;
  - Duyệt phải chọn lý do nhóm phá lệ. Khi có luật `LOI` thì nút Duyệt bị tắt và có chữ "Có luật không cho qua được — chỉ Bác";
  - Bác phải chọn lý do.
- `web/dieu-phoi-ui.ts`: nhãn sự kiện.
- Khuôn bố cục: `web/CLAUDE.md`.

**T15. Hướng dẫn.**
- **Bài:** `src/shared/huong-dan.test.ts:76` (A4) và bài trần chữ; `nutCuaNhom` phải khớp tên nút mới.
- `src/shared/huong-dan-tai-xe.ts:61`:
  - viết lại câu "Văn phòng nhận tin ngay và xếp xe cứu hộ…" thành chuyển khách sang xe khác (nơi gặp), hoặc kết thúc gián đoạn khi không xe nào nhận;
  - thêm mục ngắn "Nhờ xe khác đón" và "Nhận / Không nhận đề nghị". Hướng dẫn tài xế còn chỗ (7 phút).
- `huong-dan-quan-tri.ts` (hộp duyệt) và `huong-dan-ban-hang.ts` (văn phòng bấm thay cứu hộ): **thay câu, không thêm chữ**. Đếm lại `ceil(chữ/150)` và trần 4500.

**T16. Tài liệu.**
- `docs/SYSTEM-DESIGN.md`, mục vận chuyển: luồng đề nghị, danh mục luật, bảng người nhận tin.
- Data dictionary và `npm run dict` (đã làm ở T2).
- `CHANGELOG`: một mục cho cả nhánh.
- Sổ thi công: G-A5-1..25, nới N1-N5, lời chủ.
- `docs/BACKLOG.md:200`: đóng phần D4, V4 vẫn mở.
- `docs/SO-HANG-RAO.md`: các dòng ở mục 4.
- **Chỉ đề xuất** thêm dòng vào bảng Chrome của `web/CLAUDE.md`, không tự sửa tệp luật.

**T17. Kịch bản Chrome.**
- `docs/evidence/<ngày>-goi-a5/kich-ban/de-nghi-smoke.mjs`, mỗi bước chụp màn hình:
  - tài xế A gửi;
  - tài xế B nhận;
  - leo thang;
  - Quản trị duyệt;
  - Bán hàng không thấy menu.
- Cập nhật `docs/evidence/2026-09-29-adr-0049/kich-ban/cuu-ho-smoke.mjs` cho cứu hộ có nơi gặp.

**T18. e2e.**
- `tests/e2e/chuyen-khach.mjs`, đăng ký trong `tests/e2e/run.mjs`: 10 ca mẫu của Hộp 2, các ca chạy đua NT-A5-20, mã lệnh dùng lại.
- Chạy `audit-checks` sau e2e: R-VC-* xanh.

**T19. Kiểm độc lập một vòng.** Ba góc: quyền và lộ tên; lô và CSDL; lời chủ và ADR. Ghi phiếu kiểm vào sổ, sửa theo phiếu.

---

## 4. Hàng rào: thấy chặn thật (sửa cố ý, đỏ, hoàn nguyên) và nới có tên

Mỗi dòng dưới đây phải có một dòng trong `docs/SO-HANG-RAO.md`, ghi ngày, phép đột biến và thông báo đỏ quan sát được.

| Hàng rào | Phép đột biến | Bài phải đỏ |
|---|---|---|
| Khoá ngoại mã luật vào danh mục | Bỏ `REFERENCES` | csdl: "mã luật lạ bị chặn" |
| Tầng dòng kiểm phải khớp danh mục | Bỏ trigger | csdl: "tầng lệch bị chặn" |
| Đồ thị trạng thái | Cho phép `ESCALATED → EXPIRED` | csdl, NT-A5-10 |
| LC-14 | Bỏ điều kiện "hai tài xế khác nhau" | csdl, NT-A5-4 |
| `confirm_core` | Bỏ điều kiện "không có `LOI`" | csdl, NT-A5-11 |
| Nhánh chuyển khách của LC-15 | Bỏ `r.status='CONFIRMED'` | csdl, NT-A5-18 |
| `revoke_no_progress` đếm `related` | Trả về chỉ `trip_id` | csdl, NT-A5-19 |
| Chỉ mục ghép đề nghị đang chờ | Bỏ chỉ mục | csdl, NT-A5-20 |
| `thu-tu-lo` quét tệp mới (siết) | Đặt câu đổi trạng thái trước cổng | TC-32 |
| Lô kích thước hằng | Mỗi suất một câu | `chuyen-khach-lo.test.ts` |
| Ghim quyền | Đặt ô SALES của `trip.transfer` = `any` | `permissions.test.ts` |
| NT-3(b) ngoại lệ đúng 2 dòng | Thêm dòng `"trip.override"` thứ ba | `lop-vuot.test.ts` |
| Regex `hanh-khach-khong-lo-ten` thêm `de-nghi` (siết) | Thêm `tenKhach` vào `DeNghiDto` | `:172` |
| Bài liệt kê khoá DTO | Thêm `bienSo` vào `XeNhanDto` | `chuyen-khach.test.ts` |
| `tien-do-mot-luat` | Route cứu hộ văn phòng gọi hàm khác | bài cặp |
| `ma-lenh-dung-lai` | Bỏ `traLenhLap` ở `/nhan` | đếm |
| `permission-enforcement` | Đặt truy vấn trước `can(` | bài quét |
| `giay-to-khong-lo-so` | Ghi số giấy tờ vào `gia_tri` | bài quét |
| R-VC-26..30 | Gieo dữ liệu hỏng | `audit-invariants.test.ts` |
| A4 hướng dẫn | Thêm chữ vào Bán hàng | `huong-dan.test.ts:76` |

**Nới có tên (Điều 9.4).** Mỗi chỗ ghi ở sổ thi công và có dòng trong SO-HANG-RAO.

| Mã | Chỗ nới | Căn cứ |
|---|---|---|
| N1 | Ghim hàng DRIVER `permissions.test.ts:321`: thêm 1 ô `assigned` (`trip.transfer`) | ADR-0052 :84 và bảng câu thay; khuôn các lần nới hàng DRIVER trước (`:26`, `:29`, `:30`) |
| N2 | `lop-vuot.test.ts` NT-3(b): ngoại lệ đúng 2 route duyệt / bác | ADR-0104 :101, :244; tiền lệ G12 "nới coi là trong lời duyệt" |
| N3 | R-VC-16 `scripts/audit-checks.mjs:670`: loại trừ suất `BOARDED` của `ONBOARD` đón tại nơi gặp | ADR-0052 D5c; [TK] §5.9 |
| N4 (có điều kiện) | Ghim hàng DRIVER_PARTNER `:356`: `trip.transfer` = `assigned`, chỉ khi A4 đã gộp | ADR-0053 :46 |
| N5 (có điều kiện) | R-VC-17, nếu đo thấy báo giả | ADR-0052 :73; ADR-0051:149 |

Các chỗ **siết**, không cần lời duyệt: regex `:172`, phạm vi quét của `thu-tu-lo`, trigger thu hồi, G-A5-6, G-A5-7. `TRA_TEN` giữ 2, không nới.

---

## 5. Trang ghép

### 5.1 Bảng × loại thực thể

| Bảng / cột | Thực thể | Ghi bởi lệnh | Xoá | Ai đọc |
|---|---|---|---|---|
| `vc_transfer_rule` (mới) | Danh mục luật | Chỉ migration | Không xoá; tắt bằng `active = 0` | Máy (`kiemChuyen`), nhãn trên giao diện |
| `vc_transfer_request` (mới) | Đề nghị `STOP` / `ONBOARD` | Gửi, rút, không nhận, nhận, duyệt, bác, hết hạn lười, `VOID` (MQ-09) | Không | Tài xế A và B (của mình), văn phòng có `trip.view` |
| `vc_transfer_check` (mới) | Bằng chứng luật | Nhận, duyệt | Không, chỉ thêm | Hộp duyệt, bất biến |
| `vc_trip_allocation.transfer_id`, `.closed_transfer_id` | Suất chuyển vào / ra | Xác nhận, duyệt | Không | Bất biến R-VC-26/27 |
| `vc_trip_stop` | Điểm ở B; điểm A thành `MOVED` | Xác nhận, duyệt | Không | Lịch, tài xế |
| `vc_trip_manifest` | Dòng thêm ở B | Xác nhận, duyệt (B đã xuất bến) | Không | Manifest |
| `vc_trip.commitment_override_*` | Khoá cam kết của B | Duyệt khi `CAM_KET_DICH` không đạt | Không | R-VC-25 |
| `vc_dispatch_policy` (2 cột) | Thời gian chờ, công tắc | Route chính sách (`settings.ops`) | Theo dòng phiên bản | Máy |
| `vc_reason` nhóm `TU_CHOI_NHAN` | Lý do Không nhận / Bác | Gieo; Quản trị sửa (`admin.manage`) | Tắt | Tài xế B, hộp duyệt |
| `vc_trip_event` (7 loại mới) | Sự kiện ở chuyến đích | Mỗi lệnh một sự kiện | Không | Lịch, tin |
| `audit_log` (`trip_transfer_*`) | Nhật ký, `order_id` NULL | Mỗi lệnh một dòng | Không | Nhật ký văn phòng |

### 5.2 Bản đồ quyền

Thứ tự cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.

| Ô | Giá trị | Nghĩa trong A5 |
|---|---|---|
| `trip.transfer` (**mới**) | none, none, none, none, none, any, none, assigned, none → assigned khi A4 gộp, none | Gửi, rút, nhận, không nhận. Route còn kiểm "đang lái", áp cả Toàn quyền |
| `trip.override` (không đổi) | none, none, any, none, none, any, … | Thêm nghĩa duyệt / bác |
| `trip.urgent_adjust` (Đ1) | SALES, ADMIN, SA any | **Không** áp cho A5 |
| `trip.progress` (không đổi) | SALES, ADMIN, SA any; DRIVER assigned | Văn phòng bấm thay cứu hộ `ONBOARD` |
| `trip.view` (không đổi) | | Xem danh sách đề nghị chỉ-đọc |
| `settings.ops` (không đổi) | | Hai cột chính sách |
| `admin.manage` (không đổi) | | Lý do `TU_CHOI_NHAN` |

`EXTERNAL_PERMISSIONS = ["PARTNER","DRIVER_PARTNER"]` không đổi. Trigger LC-1 / LC-1b không đổi (ADR-0053 :50).

### 5.3 Cổng nào gác cửa nào

| Cửa | Lớp truy cập | Ô `can()` | Gác thêm ở route | Cổng lô | Trigger CSDL | Giao diện ẩn / hiện |
|---|---|---|---|---|---|---|
| `GET /cuoc-cua-toi/:id/xe-nhan` | `staff` | `trip.transfer` assigned | Đang lái A, nếu không thì 404 | — | — | Nút "Nhờ xe khác đón" khi điểm `PENDING` |
| `POST /cuoc-cua-toi/:id/de-nghi` | `staff` | `trip.transfer` | Đang lái A | `TRIP_GATE_DANG_CHAY` (A), `TRIP_GATE_CHAY_HOAC_CHO` (B) | LC-14, chỉ mục ghép | Như trên; cứu hộ ở khối sự cố |
| `POST /de-nghi/:rid/rut` | `staff` | `trip.transfer` | Là tài xế A của đề nghị | Cổng A | `status_forward` | Chỉ khi `PENDING` |
| `POST /de-nghi/:rid/nhan`, `/khong-nhan` | `staff` | `trip.transfer` | Là tài xế B đang mở | Cổng A + B (có version khi xác nhận) | `confirm_may`, `escalate_has_evidence`, LC-15, LC-01/02/09/10 | Ngăn "Đề nghị gửi tới" |
| `GET /de-nghi-gui-toi` | `staff` | `trip.transfer` | Là tài xế B | — | — | Ngăn tài xế |
| `POST /chuyen/:id/cuu-ho` | `office` | `trip.progress` | Chỉ `ONBOARD` | Như gửi | Như gửi | Nút cứu hộ khi `RUNNING` và có `trip.progress` |
| `GET /chuyen/:id/cuu-ho/xe-nhan` | `office` | `trip.progress` | — | — | — | Như trên |
| `GET /de-nghi?ngay=` | `office` | `trip.view` | — | — | — | Menu chỉ cho `trip.override`; chỉ-đọc trong chi tiết chuyến |
| `POST /de-nghi/:rid/duyet`, `/bac` | `office` | `trip.override` (ngoại lệ có tên của NT-3(b)) | `ESCALATED`; duyệt thì chạy lại kiểm | Cổng A + B có version | `confirm_core`, LC-15 | Nút Duyệt tắt khi có luật `LOI` |
| Chính sách | `office` | `settings.ops` | `kiemChinhSachMoi` | — | CHECK cột | Chỉ Toàn quyền |

---

## 6. Rủi ro, chồng lấn, thứ tự phát hành, điểm còn bất định

### Chồng lấn

| Nhánh | Chỗ đụng A5 |
|---|---|
| **Đ1** (`adr-0104-d1` @ `b3e66350`, `git diff --stat 1eb7de36 df99a773` cộng các commit sửa theo phiếu) | Sửa `dieu-phoi.ts`, `index.ts` (7 route biểu thức lớp), `tin-chuyen.ts` (CAO-2, CAO-3), `moc-toi-thieu.ts`, `huong-dan-*.ts`, `lop-vuot.test.ts`. A5 cần `gioXetMocXep`, đường tin `related` và ngoại lệ NT-3(b). **A5 phải đi sau Đ1.** |
| **Đ2** (0089) | Máy đồng bộ (chuyến `RUNNING` không ghi gì); ngoại lệ thứ tự lô `:142`; trần câu `:154`; view `v_ord_leg_commit` (G10) mà luật `CAM_KET_DICH` đọc. **A5 phải đi sau Đ2.** Hai bên cùng sửa `thu-tu-lo.test.ts`, `dieu-phoi.ts`, `tin-chuyen.ts`. Rủi ro NT-A5-25: máy Đ2 so chặng với suất mở theo chuyến, nên sẽ nhắc nhầm sau khi chuyển; phải kiểm ở T0 và viết bài. |
| **ADR-0105** (0090) | `trongKhungXemKhach` / `diaChiChiDuong` cho tài xế đối tác thấy tên sau `CONFIRMED`. Đi trước A5. |
| **A4** (song song, có lẽ 0091) | Ô DRIVER_PARTNER, bộ lọc `CONG_TY` trong `cuuHoTu`, `permissions.ts`, `permissions.test.ts:356`. Nhánh gộp sau làm N4. Nên gộp A4 trước. |
| **ADR-0109 / ADR-0110** (lượt 8c, hoá đơn) | Không đụng tệp nào chung. Không phụ thuộc. |
| **QR** (0087/0088, ADR-0108) | Chỉ ảnh hưởng số migration. |

### Thứ tự phát hành
Đ1 → Đ2 (0089) → ADR-0105 (0090) → A4 (0091) → A5 (0092). ADR-0109 đi bất kỳ lúc nào.
- Số migration và số ADR phải quét lại ngay trước khi gộp.
- Mỗi nhánh một mục CHANGELOG.

### Rủi ro
- **Leo thang nhiều.** Thực tế xe B thường còn chưa chạy và dưới 6 giờ, nên phần lớn đề nghị `STOP` sẽ chờ Quản trị. Đây là lời chủ Q-L2-B a, không phải lỗi. Hộp duyệt phải nhanh.
- **Tài xế B chưa dùng app.** Lời chủ 5/10 cho phép danh sách có tài xế công ty chưa đăng nhập. Đề nghị gửi cho họ sẽ hết hạn sau 10 phút, và danh sách xe nhận đúng 4 trường nên không thêm cờ được. Dự phòng: đường lượt 1.
- **Đề nghị tự huỷ không có tin.** `VOID` không sinh tin (C38). Tài xế B chỉ biết khi mở lại màn hình, hoặc khi bấm Nhận và nhận 409 `da_huy`.
- **Lô cứu hộ lớn.** LC-02 kiểm theo từng dòng chèn, nên `ONBOARD` nhiều khách sẽ chậm. Phải đo trên D1 local với 30 suất.
- **Thứ tự điểm thêm vào B đang chạy.** LC-19 / LC-20 (0084) ràng buộc thứ tự điểm. Theo khuôn `loThemDiemDangChay`: thêm vào cuối, đánh dấu `added_while_running`.

### Điểm còn bất định (ghi ở sổ, kiểm ở T0)
- Luật `KHOANG_NGHI_DICH` thực tế chỉ ra `CANH_BAO`, vì giờ của B không đổi.
- Nghĩa thật của `TRUNG_GIO_DICH` và `HANG_BANG_DICH` khi xe không đổi (gần như luôn `DAT`). Ghi rõ trong ADR mới.
- `vc_trip_departed_after_plan` và `vc_trip_event_after_departure` gặp sự kiện `TRANSFER_*` ở chuyến `PLANNED`.
- Cổng vòng đời không tăng `version` (G-A5-12).
- Ca mẫu lượt 1 (`xe-a-b-luot-1.json`) vẫn chờ chủ xác nhận. Nên hỏi gộp cùng Hộp 2 nếu điều phối viên đồng ý.
- Số ADR: 0111 hay 0112.

### Critical Files for Implementation
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/migrations/0085_dieu_chinh_chuyen.sql
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/dieu-phoi.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/modules/van-chuyen/index.ts
- /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/tourdaobooking-erp-assessment-34c6a7/src/shared/tin-chuyen.ts