# Đề xuất ADR (bản nháp — KHÔNG đặt trong `docs/adr/`)

> Hồ sơ có ngày (2026-10-16). Trạng thái mọi bản dưới: **đề xuất**. Số ADR lấy lúc chép vào `docs/adr/` (README ghi kế tiếp 0118, nhưng nhánh khác có thể đã giữ — kiểm `git log --all` lúc chép). Không sửa ADR đã duyệt: ADR mới trỏ về câu bị thay. Mỗi lượt tối đa **3** quyết định chạm quyền/dữ liệu (CLAUDE.md §9), kèm `TRANG-GHEP.md`.

## Lượt duyệt

| Lượt | Quyết định (≤ 3) | Điều kiện trước |
|---|---|---|
| **L1 (Gói 1)** | (1) ADR-G1 *chỉ khi* chủ chọn bắt buộc đối tác ở README Q1. Nếu giữ tự chọn: **không cần ADR mới**, thi công theo ADR-0074 + kế hoạch Phần B, C | Task 0 email cho phần email |
| **L2a (Gói 2, luật nền)** | (1) Sửa Hiến chương Phần I: thêm 5.20–5.25 (`SUY-RA.md` §3); (2) ADR-H1 dữ liệu hồ sơ mở rộng + giấy tờ tổ chức + xác minh; (3) ADR-H2 kho tệp hồ sơ | Hiến pháp 9.2: điều mới chạm nguyên tắc nên chờ 7 ngày cân nhắc **nếu** chủ xếp nó vào "sửa nguyên tắc"; nếu xếp là thêm điều siết (9.3 "vừa") thì không |
| **L2b (Gói 2, quyền)** | (1) ADR-H3 tự khai + ô quyền mới (sửa câu ADR-0013); (2) ADR-H4 quyền riêng tư: đồng ý, yêu cầu xoá, ẩn danh hoá, lưu giữ | L2a đã duyệt; README Q2, Q3 đã trả lời |

---

## ADR-G1 — Lớp hai qua email cho tài khoản đối tác (sửa ADR-0074 đ1, chỉ khi chủ chọn)

- **Bối cảnh:** chủ yêu cầu 16/10 "bật 2FA khi đăng nhập lần đầu trên thiết bị, gửi về email". ADR-0074 đ1 cho tài khoản bên ngoài tự chọn. ~1000 tài khoản đối tác; phần lớn không quen ứng dụng xác thực.
- **Quyết định (đề xuất):** tài khoản chỉ có quyền bên ngoài (`EXTERNAL_PERMISSIONS`) phải có lớp hai sau ân hạn 30 ngày **kể từ khi Phần C (email) chạy ổn định trên production 14 ngày**; yếu tố mặc định là email (ADR-0074 đ4: email thuộc `auth`, xác nhận bằng mã). Ô cấu hình "bắt buộc đối tác" là dữ liệu có hiệu lực, chỉ Toàn quyền đổi (Hiến chương 5.2). Ứng dụng xác thực vẫn chọn được.
- **Hệ quả:** số thư gửi tăng (mỗi máy mới của đối tác một thư); chi phí, giới hạn chưa tra; đối tác mất hộp thư phải nhờ Quản trị (ADR-0074 đ5). ADR-0085 Q2 đ10 ("đối tác đặt nhiều máy không bắt lớp hai") phải sửa câu theo.
- **Câu bị thay:** ADR-0074 đ1 câu "Tài khoản chỉ có quyền bên ngoài được tự bật"; ADR-0085 đ10.
- **Hiến chương áp:** K1, 5.2, 5.16.

## ADR-H1 — Hồ sơ mở rộng, giấy tờ tổ chức là dữ liệu, xác minh theo từng dòng

- **Bối cảnh:** chủ cần đủ thông tin để lập hoá đơn, áp chính sách đại lý, chống mạo danh. Hồ sơ thiếu ngày sinh, địa chỉ cá nhân, giấy tờ tổ chức; không có "đã xác minh".
- **Quyết định:**
  1. Ngày sinh = cột `pty_person.birth_date`; địa chỉ cá nhân = loại liên hệ `ADDRESS` (một dòng dữ liệu). Địa chỉ pháp lý, MST tổ chức giữ ở `pty_organization` (một nơi, N7).
  2. Bảng tra cứu `pty_organization_document_type` (Quản trị sửa) + bảng `pty_organization_document` theo đúng khuôn `pty_person_document` (ADR-0040 D2): gia hạn = dòng mới, huỷ dòng nhầm, không xoá, trigger "một số GPKD một tổ chức", ngày cấp/nơi cấp trên dòng. Số GPKD lệch MST → cờ cho người xác minh.
  3. Kết quả xác minh là bảng chỉ-thêm `pty_verification` theo từng dòng (giấy tờ, liên hệ, thuộc tính); sửa giá trị đã xác minh ghi `CAN_XAC_MINH_LAI` cùng lô. Người xác minh ≠ người khai (máy chủ + điều kiện câu ghi).
  4. Mọi cột mới mang hạng N0–N4 trong sổ dữ liệu (5.20); bài kiểm đỏ khi thiếu.
- **Hiến chương áp:** 2.1, 2.2, 4.1, 5.1, 5.2, 5.5, 5.12, 5.20, 5.23. **Lệch có chủ ý:** không.
- **Xây trên lỗ đang hở:** không (không có mục HIGH ở `parties`).
- **Loại cửa:** một chiều (bảng chỉ-thêm có dữ liệu thật).

## ADR-H2 — Kho tệp hồ sơ trên R2

- **Quyết định:** bucket riêng (không dùng `TEP` của ADR-0041); khoá ngẫu nhiên; chỉ JPG/PNG/HEIC/PDF ≤ 10 MB kiểm theo chữ ký; tải xuống chỉ qua Worker sau `can()`, nhật ký trước, `no-store`, `nosniff`, không HTML/SVG, không đường dẫn ký sẵn; service worker không lưu đệm; bảng `pty_attachment` + `pty_attachment_link` (chỉ-thêm); gộp hồ sơ (ADR-0068 Đ1 bước 4) thêm dòng nối cho ảnh sang dòng giấy tờ mới; ảnh bị xoá khi phiếu xoá thực hiện hoặc hết hạn lưu (ngoại lệ 5.24).
- **Bổ sung:** ADR-0041 (khuôn kiểm tệp dùng lại; không sửa ADR-0041).
- **Hiến chương áp:** 5.3, 5.12, 5.16 (xoá R2 sau lô, "chờ xoá" thấy được), 5.22, 5.24.
- **Việc của chủ:** tạo bucket bằng một lệnh trước khi triển khai mã có binding.

## ADR-H3 — Người dùng tự khai hồ sơ của mình (trả lời câu bỏ ngỏ của ADR-0013)

- **Bối cảnh:** ADR-0013 "Phương án bị loại" ghi "Cho nhân viên tự sửa hồ sơ của chính mình: chủ chưa yêu cầu… Để chủ quyết riêng nếu cần". Nay chủ đã yêu cầu thu thập.
- **Quyết định:** không mở quyền sửa thẳng. Thêm phiếu tự khai `pty_self_submission`: giá trị khai không ghi đè hiện hành, không lên nhãn/chứng từ cho tới khi được xác minh; chấp nhận = một lô do `parties` ghi. Ô mới `party.self.view`, `party.self.submit` (mọi quyền, `own` theo `staff.party_id` của phiên), `party.verify` (theo README Q2), `party.attachment.view` (Toàn quyền). Ô cho PARTNER/DRIVER_PARTNER là **nới** so với hôm nay, ghi rõ.
- **Câu bị thay:** không thay câu nào của ADR-0013 (luật "không tự sửa" giữ); chỉ trả lời câu bỏ ngỏ bằng đường khác.
- **Hiến chương áp:** K4, 4.4 (DTO đối tác theo danh sách cho phép, tiền lệ vá D-1), 5.8, 5.23.

## ADR-H4 — Quyền riêng tư: chính sách có phiên bản, đồng ý, yêu cầu xoá, ẩn danh hoá, lưu giữ

- **Quyết định:**
  1. `pty_privacy_policy` (phiên bản, mục đích, hiệu lực; chỉ Toàn quyền đăng) + `pty_consent` chỉ-thêm. Chưa đồng ý phiên bản hiện hành thì không gửi phiếu tự khai.
  2. Phiếu `pty_erasure_request`: người dùng gửi; Quản trị (cấp bậc) / Toàn quyền xử lý trong 30 ngày (chủ chốt 16/10); quá hạn chỉ cảnh báo, không Cron ghi (HC-5.11).
  3. Ẩn danh hoá là **một lệnh có tên** của `parties`: số → dấu ẩn danh duy nhất theo dòng + `erased_at`; liên hệ đóng + thay giá trị; ngày sinh rỗng; tên giữ nếu hồ sơ dính sổ tiền/đơn đã giao; ảnh `purged_at` rồi xoá R2. Migration chỉ thêm cột `erased_at` và tạo lại trigger `_superseded`, `_voided` với điều kiện miễn đúng chuyển này (`SUY-RA.md` X2). Từ chối hồ sơ công ty chủ.
  4. Phiếu trả lời liệt kê phần giữ lại theo luật (đơn, lần thu, sổ, bản chụp yêu cầu hoá đơn, tên trong nhật ký thao tác, nhật ký cũ có SĐT) — căn cứ: **chưa luật sư/kế toán xác nhận**.
  5. Nhật ký xác minh / xoá chỉ mang mã (`SUY-RA.md` X3).
  6. Thời hạn giữ ảnh theo README Q3, là dữ liệu chính sách (5.25).
  7. Danh sách mã phiếu đã thực hiện giữ thêm một bản ngoài D1 (chỉ mã); runbook khôi phục có bước chạy lại phiếu xoá.
- **Lệch có chủ ý:** Hiến chương 5.5 — hợp lệ khi điều 5.24 đã được duyệt ở L2a; nếu chủ không duyệt 5.24 thì ADR này phải ghi "lệch có chủ ý: điều 5.5" và chủ duyệt riêng.
- **Xây trên lỗ đang hở:** **HC-5.19** (chưa diễn tập khôi phục) cho mục 7.
- **Nguồn pháp lý (chỉ đại ý, chưa đọc bản gốc):** Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, hiệu lực 1/1/2026 (quyền yêu cầu xoá; Điều 14 các trường hợp xoá/huỷ); Nghị định 356/2025/NĐ-CP hướng dẫn, thay Nghị định 13/2023/NĐ-CP. Thời hạn luật định trả lời yêu cầu: **không tìm thấy** trong nguồn đã tra → 30 ngày là lựa chọn của chủ.
