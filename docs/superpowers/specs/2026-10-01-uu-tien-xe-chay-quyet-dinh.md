# Ưu tiên "phần bắt buộc để xe chạy" — quyết định của chủ (2026-10-01)

> Tài liệu ghi lời chủ (P19: trạng thái sống trong tài liệu). Nguồn: chat + hộp chọn ngày 1/10, sau khi đọc `2026-10-01-doi-chieu-phieu-giam-doc.md`.

## Lời chủ

> *"ghi nợ vào trong backlog để làm sau. Trước hết là làm những phần bắt buộc để xe chạy được mà còn thiếu: màn hình nhập danh sách khách, điểm trả khách và phân hệ theo dõi tiền (đại lý đối tác và hdv tại cảng nợ công ty và/hoặc ngược lại)"*

Các ý khác của phiếu Giám đốc → `docs/BACKLOG.md` mục 15 (đã ghi).

## Hộp chọn 1/10 (phương án chủ chọn)

| # | Câu | Chủ chọn |
|---|---|---|
| U1 | Màn nhập danh sách khách + nơi trả chưa có bản vẽ | **Chủ vẽ Claude Design trước** (không chọn phương án AI khuyến nghị "thợ dựng theo khuôn sẵn") → thi công giao diện chờ link bản vẽ |
| U2 | Đợt này có thêm ô mới cần đổi dữ liệu không | **Thêm cả các ô mới**: "Số khách đi xe" (`pax_override`, ADR-0054 đã duyệt), mã chuyến bay (`flight_code`, ADR-0055 đã duyệt), **nơi trả tự điền theo dịch vụ** (chưa có ADR — cần ADR mới) |
| U3 | Đại lý/đối tác thanh toán với công ty thế nào | **Ghi nợ từng đơn, chốt theo tháng**: đơn "Đã giao" thì sổ ghi ngay ai nợ ai; Kế toán đối chiếu và trả/thu gộp nhiều đơn mỗi tháng, bù trừ hoa hồng với tiền đại lý đang giữ; khoá sổ tháng |
| U4 | Đại lý/đối tác có tự xem sổ của mình không | **Có, chỉ xem của mình**: số dư và từng đơn; không thấy giá vốn, tỷ lệ nội bộ |

## Hiện trạng (đọc 1/10, nhánh `main`)

- **Danh sách khách + nơi trả (ADR-0047):** máy chủ (Phần A) đã chạy từ 1.38 — bảng `ord_transfer_leg` có cột nơi trả, `ord_passenger`, API `POST/PUT /legs`, `GET/POST /passengers`. Giao diện (Phần B, kế hoạch `docs/superpowers/plans/2026-09-29-adr-0047-thi-cong.md:1028-1068`, B0–B7) chưa làm, chờ bản vẽ 5 màn. Chuyến hiện bị giữ vì `CHUA_CO_NOI_TRA` và `THIEU_TEN` (`src/shared/dieu-phoi-kiem.ts:326, :350`).
- **Ô mới:** `pax_override` và `flight_code` chưa có cột (chỉ chú thích ở `src/modules/orders/index.ts:189`) → cần migration (0056 đã bị nhánh `worktree-gop-ho-so` giữ → dự kiến **0057–0059**, chốt lúc gộp). Nơi trả mặc định theo dịch vụ: mẫu chặng `vc_leg_template` của ADR-0054 chưa có cột nơi trả.
- **Sổ tiền:** lượt 1 (1.42) đã có HDV nội bộ thu tiền → nợ công ty, Kế toán ghi nộp/trả; khung sổ hai chân, phiếu quyết toán. **Chưa có:** chiết khấu/hoa hồng/mua giá đại lý/thu hộ/giá vốn (D4/D5 của ADR-0024), khoá kỳ (hạn: đi cùng bản lượt 2 — ADR-0026, ADR-0057 L-T1), đối tác xem sổ (`ledger.view` PARTNER = none), đơn có bên đặt là đối tác bị chặn "Đã giao" (`src/modules/billing/rules.ts:179-181`). Không có đặc tả/kế hoạch lượt 2.

## Việc tiếp theo

1. Lệnh vẽ Claude Design cho 5 màn ADR-0047 + các ô mới → chủ vẽ, gửi link.
2. ADR nháp "nơi trả mặc định theo dịch vụ" + kế hoạch phần máy chủ cho `pax_override` / `flight_code` / nơi trả mặc định (migration 0057–0059, chốt lúc gộp) — làm được trước khi có bản vẽ.
3. ADR nháp sổ tiền lượt 2 (đại lý/đối tác, khoá kỳ tháng, đối tác xem sổ) + trang ghép → người kiểm độc lập → chủ duyệt (tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt duyệt).
4. Câu tiền còn mở (ai nhập bảng mức, dịch vụ thiếu mức, cộng tác viên, đơn đối tác đang kẹt, nợ nhà xe) → ghi trong ADR nháp với phương án khuyến nghị, **chủ quyết lúc duyệt ADR**, AI không tự chọn.

## Hộp chọn 1/10 lượt 2 (sau khi hai bản nháp qua người kiểm độc lập)

| # | Câu | Chủ chọn |
|---|---|---|
| Q-A | Ô "Số khách đi xe" là ô nào | **Làm ô "số người chiều về" trước** (`pax_override`, ADR-0054); ô cả đơn (`ride_pax`, ADR-0065 nháp) làm lát sau khi chủ duyệt ADR-0065 |
| Q-B | Chỉ sửa số hiệu chuyến bay / số người chiều về trên chặng đã duyệt đặt gấp | **Giữ dấu đặt gấp cũ**; đổi ngày/giờ/nơi thì vẫn bỏ dấu như hiện nay |
| Q-C | Lệch chữ ADR-0054 D10.3 (CHECK nhiều cột → CHECK một cột + trigger) | **Chấp nhận**; ghi vào `docs/SYSTEM-DESIGN.md` §16 khi thi công |
| Q-D | Nơi trả gợi ý theo dịch vụ | **Quản trị cài ở Danh mục** (phương án A) — chủ được báo rằng chọn A là duyệt bản nháp `2026-10-01-de-xuat-adr-noi-tra-mac-dinh.md`; số ADR chính thức + chép vào `docs/adr/` làm lúc gộp (cần chủ bấm cho phép sửa `docs/adr/`) |

Lệnh vẽ Claude Design (`2026-10-01-lenh-ve-claude-design-khach-noi-tra.md`) giữ cả hai đoạn tuỳ chọn (khớp Q-A lát sau và Q-D = A).

**Hệ quả:** kế hoạch `docs/superpowers/plans/2026-10-01-may-chu-o-moi-chang-ke-hoach.md` Task 0–7 làm được (Task 7 hết chờ); Task 8 vẫn chờ ADR-0065. Kiểm độc lập: kế hoạch + ADR nháp nơi trả ĐẠT CÓ ĐIỀU KIỆN vòng 2 (đã sửa 3 mục chữ); bộ ADR sổ tiền lượt 2 ĐẠT vòng 3 — 13 câu C1–C13 ở `2026-10-01-de-xuat-adr-so-tien-luot-2/cau-hoi-chu.md` chờ chủ.

## 1/10 tối

- Máy chủ ô mới của chặng **đã lên production bản 1.53** (migration 0058, 0059).
- Chủ trả lời 13 câu sổ tiền: **"cả 13 theo khuyến nghị"** (C1–C13 = A). Bước tiếp: duyệt lượt 2a → 2d.
