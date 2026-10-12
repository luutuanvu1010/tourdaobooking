# ADR-0113 — Chặn "Từ chối chuyến" khi chuyến có khách đã được chuyển sang từ xe khác

- **Trạng thái:** **accepted** 2026-10-12 — chủ dự án trả lời nguyên văn "ok duyệt ADR-0113" sau khi đọc trang trình `docs/superpowers/specs/2026-10-12-adr-0113-chan-tu-choi-chuyen-co-khach-chuyen-vao/00-trang-trinh.md` (đề xuất `de-xuat-adr-0113.md` cùng thư mục, hồ sơ có ngày, đóng băng). Duyệt gồm Đ1–Đ4; **Đ5 (danh sách xe nhận) chưa được quyết** — giữ nguyên hôm nay. AI soạn bản chép, không tự duyệt (Hiến pháp N3, Điều 7.2). Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-12.
- **Nguồn lời chủ:** 2026-10-12, về điều kiện còn lại VỪA-A của người kiểm A5 (`docs/superpowers/plans/2026-10-08-van-chuyen-goi-a-c-danh-sach-viec.md`, dòng việc 8): chủ chọn **CHẶN** ("Chặn, soạn quyết định mới (Recommended)"). Hai chữ dưới đây là cách đọc của AI, chủ duyệt cùng ADR: (i) "có khách chuyển vào" = còn ít nhất một **suất đang mở** mang `transfer_id` (suất đã rút / dời đi rồi thì không chặn); (ii) điều kiện đặt sau kiểm hạn.
- **Mốc đo mã:** nhánh `claude/van-chuyen-goi-a-c` @ `a9772924`. Số 0113 đã quét mọi nhánh lúc chép (2026-10-12): chưa nhánh nào dùng.
- **Cửa:** **hai chiều** (một điều kiện ở máy chủ, một khoá DTO thêm, không migration; gỡ = bỏ điều kiện). **Một quyết định** chạm hợp đồng giữa các phần (API / DTO tài xế): không vượt trần 3 của `CLAUDE.md` §9; không bảng dùng chung nào nhận loại dữ liệu mới nên không cần trang ghép.
- **Xây trên lỗ đang hở:** không. Sáu mục HIGH ở `docs/quyen-hoan.json` (TNV-G1, G3, G4, HC-4.2, HC-5.19, HC-5.11) không mục nào chạm lệnh Từ chối hay chuyển khách.

## Bối cảnh (hiện trạng @ `a9772924`, đọc mã, chưa chạy thử)

- **Từ chối chuyến** (ADR-0053 D8.4; `src/modules/van-chuyen/tu-choi.ts`, `lyDoKhongDuoc`): chỉ khi chuyến còn `PLANNED`, người gọi đang lái, và chưa quá hạn của cặp (mặc định 12 giờ trước giờ chạy dự kiến; Toàn quyền chỉnh được). Lệnh chỉ đóng **dòng lái** (`REFUSED`); không đụng suất khách.
- **Chuyển khách** (ADR-0111, `chuyen-khach-lenh.ts`): xe nhờ phải đang `RUNNING`; xe nhận `PLANNED` hoặc `RUNNING` cùng ngày. Khi đề nghị được xác nhận, trong một lô: suất ở xe nhờ **đóng** (`TRANSFERRED`, `closed_transfer_id`), suất mới **mở** ở xe nhận mang `transfer_id`. Không có lệnh "huỷ chuyển" hay đưa khách về xe nhờ; đề nghị ngược lại cần xe nhờ `RUNNING`, trong khi xe nhận còn `PLANNED`.
- **Ô quyền:** `trip.transfer` của tài xế đối tác (`DRIVER_PARTNER`) là `assigned` (ADR-0053 D7.1), nên tài xế đối tác Nhận được đề nghị gửi cho mình. Danh sách xe nhận ở màn hình (`xeNhanChoDeNghi`, `cuu-ho.ts`) hôm nay chỉ liệt kê xe có tài xế công ty, nên tài xế đối tác thành "xe nhận" chỉ qua: gọi API trực tiếp; hoặc văn phòng đổi cả xe lẫn tài xế của chuyến đã nhận khách (trigger LC-13 buộc tài xế cùng chủ với xe); hoặc sau khi mở danh sách (Đ5). Chưa chạy thử hai đường đầu.

**Nếu không chặn**, tài xế đối tác Nhận khách rồi bấm Từ chối trong hạn thì: chuyến nhận vẫn `PLANNED`, không còn tài xế, bị giữ ở cổng xuất bến ("chưa có tài xế"); khách chuyển vào vẫn nằm ở chuyến đó, tài xế xe nhờ không còn thấy họ và **không có tin nào** báo xe nhận đã từ chối; người có `trip.dispatch` nhận tin "tài xế đã từ chối … cần xếp người khác" nhưng tin không nói chuyến này có khách vừa được xe khác giao sang. Cửa sổ xảy ra hẹp theo mặc định (xe nhờ đã chạy nhưng xe nhận còn trước hạn từ chối) và rộng ra nếu Toàn quyền giảm số giờ hạn. Hậu quả xấu nhất là khách bị bỏ sót nếu văn phòng chưa kịp xếp người. Đây là mức Vừa, không mất dữ liệu.

## Quyết định

**Đ1. Điều kiện chặn.** Lệnh Từ chối chuyến trả **409** khi chuyến còn ít nhất một suất **đang mở** (`valid_to_at` trống) có `transfer_id` khác rỗng — bất kể khách đến bằng đường nào (kể cả tài xế được xếp vào sau đó). Thứ tự kiểm trong `lyDoKhongDuoc`: không còn kế hoạch → không đang lái → quá hạn → **khách chuyển vào** (đặt sau quá hạn để mọi bài và câu hiện có giữ nguyên). Lệnh lặp của chính mình (mã yêu cầu cũ) vẫn trả 200 như cũ. Hai lớp ở máy chủ, không trigger: kiểm trước, và thêm `NOT EXISTS` vào câu cổng `TRIP_GATE_TU_CHOI` để lô xác nhận chuyển chen giữa lúc đọc và lúc ghi không lọt (lô đó cũng tăng `version` chuyến nhận nên cổng đã thua → đọc lại → ra đúng 409 mới, không ra `stale`).

**Đ2. Thân 409.** Mã `refuse_blocked_transferred_in` (chữ không dấu như `refuse_deadline_passed`), câu: "Chuyến này đang có khách được chuyển từ xe khác sang nên chưa từ chối được — hãy gọi văn phòng để đổi người." Không chi tiết, không số khách, không mã chuyến nguồn, không tên, không mã đơn; nên an toàn với tài xế đối tác ngoài khung xem khách (cờ `chiCauGoc`, A4 CAO-1). Không ghi nhật ký, không sinh sự kiện, không tin (như các 409 khác của lệnh này).

**Đ3. Màn tài xế.** DTO chi tiết cuốc thêm khoá tuỳ chọn `chanTuChoi: "KHACH_CHUYEN_VAO"` (không tên, không số); khi có, `tuChoiDuoc` = false và `lyDoTuChoi` vắng. Nếu chỉ để `tuChoiDuoc` = false thì dải hạn sẽ hiện nhầm "Đã quá hạn từ chối" (`daiHanTuChoi`), nên `daiHanTuChoi` thêm nhánh thứ ba "Chuyến có khách chuyển từ xe khác sang — không từ chối được, gọi văn phòng"; `loiTuChoi` ánh xạ mã mới sang `doc_lai`. Khung xem khách (ADR-0053 D7.2) **không đổi**: cờ mới không mở thêm dữ liệu khách.

**Đ4. Lối ra cho tài xế** (chỉ nêu lệnh đã có). Tài xế gọi văn phòng; văn phòng có thể đổi người lái bằng **Sửa chuyến** (tài xế phải cùng chủ với xe, LC-13), hoặc **Dời / Rút** khách chuyển vào khỏi chuyến (dưới mốc 6 giờ dùng điều chỉnh khẩn cấp, ADR-0104). Hết suất mở mang `transfer_id` thì chặn tự hết (Đ1). **Không** có lệnh "huỷ chuyển"; nếu chủ muốn thì là phạm vi mới, phải có ADR riêng.

**Đ5. Danh sách xe nhận (CHỜ CHỦ — ngoài quyết định đã duyệt).** Hai bộ lọc có căn cứ khác nhau. `cuuHoTu` (`cuu-ho.ts` khoảng dòng 19, xe nhận của cứu hộ đơn giản) dựa lời chủ 5.2b "xe nhà xe đi đường Tạo chuyến mới": **giữ**. `xeNhanChoDeNghi` (khoảng dòng 48) ghi là tạm "trước khi A4 gộp" (G-A5-20) và A4 đã gộp 12/10, trong khi ADR-0053 D7.4 đã duyệt nhờ đón qua lại công ty ↔ nhà xe "như nhau". Hai phương án: **(a)** bỏ lọc công ty ở `xeNhanChoDeNghi`, danh sách khớp ADR-0053 D7.4; cần kiểm màn Nhận của tài xế đối tác trước (chưa kiểm). **(b)** đóng ở máy chủ (`kiemGui` từ chối xe nhận có tài xế đối tác); khớp danh sách hôm nay nhưng trái chữ D7.4 nên cần văn bản thay. **Khuyến nghị (a)**, sau khi ADR-0113 chạy. Chủ chưa quyết thì **giữ nguyên hôm nay** (không mở, không đóng); Đ1–Đ4 đứng độc lập vì vẫn cần cho đường API trực tiếp và đường đổi xe + tài xế.

## Hệ quả

- **Bảng sự kiện** (`src/shared/bang-su-kien-van-chuyen.ts`, dòng `tu-choi`): chỉ chữ — `luat` thêm "chuyến không có suất đang mở nhận chuyển vào (ADR-0113)", `nguon` thêm "ADR-0113". Cột bảng bị ghi, sự kiện, nhật ký, tin không đổi (lệnh bị chặn không ghi gì). Mục `N-TU-CHOI` giữ.
- **Ô quyền:** không đổi. **Migration:** không. **Nhật ký / tin:** không đổi.
- **Sổ hàng rào** (`docs/SO-HANG-RAO.md`): một dòng mới, ghi rõ "dựa vào máy chủ, không có trigger" (làm bằng trigger là migration + cửa một chiều, đã cân và không chọn).

## Câu ADR bị thay (không sửa thân ADR cũ)

| Chỗ | Nguyên văn → mới |
|---|---|
| ADR-0053 D8.4 bước 3 (`:110`) | "quá hạn → 409 …; chuyến đã xuất bến / kết thúc / huỷ → 409" → thêm: "chuyến có suất đang mở nhận chuyển vào (ADR-0111) → 409 `refuse_blocked_transferred_in` (ADR-0113)" |

## Kế hoạch mã (làm sau khi duyệt; bài đỏ trước)

1. **Bài đỏ:** (a) route: tài xế đối tác Nhận qua API trực tiếp rồi Từ chối trong hạn → 409 mới, dòng lái vẫn mở, không nhật ký / sự kiện; (b) đua: xác nhận chuyển chen giữa đọc và ghi (khuôn `chenGiuaDocVaGhi`) → 409 mới, không `stale`; (c) suất chuyển vào đã đóng → vẫn Từ chối được; (d) thuần: `daiHanTuChoi` nhánh mới, `loiTuChoi`; (e) quét rò rỉ: thêm ca vào khối "vế hạn NGOÀI khung" của `src/hanh-khach-khong-lo-ten.test.ts`; (f) nếu dựng được đường đổi xe + tài xế: bài riêng.
2. **Mã:** truy vấn `coSuatChuyenVao` (không thêm `transfer_id` vào `COT_SUAT`), `lyDoKhongDuoc`, mệnh đề cổng `TRIP_GATE_TU_CHOI`, `khungCuaNguoiGoi` + DTO + hợp đồng + dải, bảng sự kiện.
3. **Đột biến chặn thật:** bỏ mệnh đề cổng → bài đua đỏ; bỏ kiểm trước → bài route đỏ; bỏ nhánh dải → bài thuần đỏ. Chép nguyên dòng đỏ vào sổ hàng rào kèm ngày; hoàn nguyên → xanh. Chạy cả e2e (đổi đầu ra API).
4. Người kiểm độc lập chỉ-đọc cho phần quyền / hợp đồng (CLAUDE.md §3).

## Điều chưa chắc / ngoài quyết định

- Chưa chạy thử hai đường tài xế đối tác thành xe nhận (API trực tiếp; đổi xe + tài xế); đã đọc mã và trigger.
- Lệnh Từ chối **không** tự huỷ đề nghị chuyển còn chờ (`PENDING` / `ESCALATED`) hướng tới chuyến đó, trong khi lệnh huỷ chuyến có (`tuHuyDeNghi`). Chưa kiểm hậu quả; không nằm trong ADR này, ghi vào nợ.
- Mục `TAI-XE-DOI-TAC` trong bảng sự kiện còn câu "chưa có ô chuyển khách", đã cũ vì A5 mở ô; sửa chữ khi chạm bảng.
