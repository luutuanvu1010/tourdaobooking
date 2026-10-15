# Đề xuất ADR (bản nháp — KHÔNG đặt trong `docs/adr/`)

> Hồ sơ có ngày (2026-10-16). Trạng thái mọi bản dưới: **đề xuất**. **Số hiệu:** "ADR-G1", "ADR-H1…H4" là **số giữ chỗ**. Số 0118, 0119 đã bị nhánh khác dùng; lúc chủ duyệt, người chép lấy số thật còn trống (`git log --all -- docs/adr/`) và thay mọi chỗ trỏ. Không sửa ADR đã duyệt: ADR mới trỏ về câu bị thay. Mỗi lượt tối đa **3** quyết định chạm quyền/dữ liệu (CLAUDE.md §9), kèm `TRANG-GHEP.md`.

## Lượt duyệt

| Lượt | Quyết định | Điều kiện trước |
|---|---|---|
| **L1 (Gói 1)** | ADR-G1 *chỉ khi* chủ chọn bắt buộc đối tác ở README Q1. Nếu giữ tự chọn: **không cần ADR mới**, thi công theo ADR-0074 + kế hoạch Phần B, C | Task 0 email cho phần email |
| **L2 (luật)** | **Một quyết định:** bộ điều luật dữ liệu cá nhân 5.20–5.25 (`SUY-RA.md` §3). Gồm sáu điều; chủ có thể tách từng điều. Sửa theo **Hiến chương 6.4** (chỉ chủ; ghi ngày + lý do ở dòng Trạng thái). Lưu ý: 5.24 **nới** 5.5 (không phải điều siết) | — |
| **L3 (Gói 2, dữ liệu)** | ADR-H1 hồ sơ mở rộng + giấy tờ tổ chức + xác minh; ADR-H2 kho tệp hồ sơ | L2 đã duyệt |
| **L4 (Gói 2, quyền + riêng tư)** | ADR-H3 tự khai + ô quyền mới (theo Q2, có thể đảo ADR-0083 đ2); ADR-H4 quyền riêng tư, yêu cầu xoá, ẩn danh hoá, lưu giữ | L3 đã duyệt; README Q2, Q3 đã trả lời. **ADR-H4 xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục; hạn trong `docs/quyen-hoan.json` 31/10) → theo luật "dừng dây chuyền" (CLAUDE.md §3) **không được duyệt** trước khi lỗ được vá (diễn tập khôi phục xong) **hoặc** chủ gia hạn mục HC-5.19 có ghi lý do |

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
  5. **Siết đường đọc:** ngày sinh và liên hệ `ADDRESS` **không** vào DTO của ô `party.view` (Bán hàng, Kế toán = any hôm nay); chỉ trả cho chính chủ hoặc người giữ ô mới `party.personal.view` (Quản trị, Toàn quyền). `party.write` không ghi hai trường này khi không giữ ô đó (`TRANG-GHEP.md` §2).
  6. Mở rộng kiểu viết cứng `ContactKind` (`parties/rules.ts`) và `ContactPointDto.kind` (`contracts.ts`) cho `ADDRESS`; không dựng `party_site` (ADR-0010 đ2 giữ).
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
- **Quyết định:** không mở quyền sửa thẳng. Thêm phiếu tự khai `pty_self_submission`: giá trị khai không ghi đè hiện hành, không lên nhãn/chứng từ cho tới khi được xác minh; chấp nhận = một lô do `parties` ghi. Ô mới `party.self.view`, `party.self.submit` (mọi quyền, `own` theo `staff.party_id` của phiên), `party.verify`, `party.attachment.view` (Toàn quyền). Ô cho PARTNER/DRIVER_PARTNER là **nới** so với hôm nay (Ruling R4 của `party.document.view`), ghi rõ. Phạm vi thực tế của `party.document.write` rộng ra (giấy tờ đối tác cá nhân), ghi rõ.
- **Ai xác minh (theo README Q2):**
  - **Q2-A:** `party.verify` chỉ Toàn quyền — giữ ADR-0083 đ2, không câu nào bị thay. Nêu thẳng: nút cổ chai, ~1000 đối tác, 1000–3000 lượt lần đầu.
  - **Q2-B:** thêm Quản trị, xác minh **qua ảnh**, mỗi lần mở ảnh ghi nhật ký trước; Quản trị vẫn thấy số che ngoài phiếu. **Câu bị thay: ADR-0083 đ2** ("chỉ Toàn quyền xem được" số đủ — ảnh giấy tờ chứa số đủ) và câu Hệ quả "Quản trị không xem đủ số giấy tờ nữa".
  - **Q2-C:** thêm Quản trị, thấy số đủ **chỉ trong phiếu đang xử lý** (nhật ký trước). **Câu bị thay: ADR-0083 đ2** như trên.
- **Câu bị thay khác:** không thay câu nào của ADR-0013 (luật "không tự sửa" giữ); chỉ trả lời câu bỏ ngỏ bằng đường khác.
- **Hiến chương áp:** K4, 4.4 (DTO đối tác theo danh sách cho phép, tiền lệ vá D-1), 5.8, 5.23.

## ADR-H4 — Quyền riêng tư: chính sách có phiên bản, đồng ý, yêu cầu xoá, ẩn danh hoá, lưu giữ

- **Quyết định:**
  1. `pty_privacy_policy` (phiên bản, mục đích, hiệu lực; chỉ Toàn quyền đăng) + `pty_consent` chỉ-thêm. Chưa đồng ý phiên bản hiện hành thì không gửi phiếu tự khai.
  2. Phiếu `pty_erasure_request`: người dùng gửi; Quản trị (cấp bậc) / Toàn quyền xử lý **trong thời hạn luật định, không quá 30 ngày** (cách đọc lời chủ 16/10, chờ chủ xác nhận — `SUY-RA.md` X13). Thời hạn là dữ liệu chính sách, mặc định đề xuất 20 ngày (NĐ 356/2025 Điều 5 theo bản tóm tắt của công ty luật, chưa đọc bản gốc). **Con số cuối cùng là điều kiện chặn của lát H-5: không xây số thời hạn trước khi luật sư xác nhận.** Quá hạn chỉ cảnh báo, không Cron ghi (HC-5.11).
  3. Ẩn danh hoá là **một lệnh có tên** của `parties`: số → dấu ẩn danh duy nhất theo dòng + `erased_at`; liên hệ đóng + thay giá trị; ngày sinh rỗng; tên giữ nếu hồ sơ dính sổ tiền/đơn đã giao; ảnh `purged_at` rồi xoá R2. Migration chỉ thêm cột `erased_at` và tạo lại trigger `_superseded`, `_voided` với điều kiện miễn đúng chuyển này (`SUY-RA.md` X2). Từ chối hồ sơ công ty chủ.
  4. Phiếu trả lời liệt kê phần giữ lại theo `PHUONG-AN.md` §2.8 (đơn kèm bản chụp khách, danh sách hành khách ≥ 3 năm, lần thu, sổ, bản chụp yêu cầu hoá đơn, họ tên trong nhật ký thao tác, nhật ký cũ có SĐT, dòng phiên đã bỏ IP, chữ tự do không rà) — căn cứ: **chưa luật sư/kế toán xác nhận**.
  5. Dòng nhật ký của chính việc xác minh / xoá chỉ mang mã (`SUY-RA.md` X3); họ tên ở nhật ký khác là ngoại lệ đã có (5.20).
  6. Thời hạn giữ ảnh theo README Q3, là dữ liệu chính sách (5.25).
  7. Danh sách mã phiếu đã thực hiện giữ thêm một bản ngoài D1 (chỉ mã); runbook khôi phục có bước chạy lại phiếu xoá.
  8. Sổ phiên: khi phiếu thực hiện, và với phiên đã kết thúc quá thời hạn giữ, thay `aut_session.ip`, `user_agent` bằng dấu ẩn danh, giữ dòng. **Câu bị thay: ADR-0075 đ9** ("Sổ phiên không xoá") — chỉ phần IP, User-Agent. Câu ghi do `auth` cấp, ghép lô ở gốc lắp ráp (Hiến chương 5.3).
  9. `staff.phone` của tài khoản đã ngưng: có thay dấu ẩn danh hay không (vướng khoá `UNIQUE` và đăng nhập lại khi kích hoạt lại) — đề xuất **giữ** cho tới khi chủ quyết riêng; phiếu ghi rõ.
- **Lệch có chủ ý:** Hiến chương 5.5 — hợp lệ khi điều 5.24 đã được duyệt ở L2; nếu chủ không duyệt 5.24 thì ADR này phải ghi "lệch có chủ ý: điều 5.5" và chủ duyệt riêng.
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục, hạn 31/10 trong `docs/quyen-hoan.json`). Theo luật "dừng dây chuyền" (CLAUDE.md §3): ADR này **không được duyệt** trước khi lỗ được vá **hoặc** chủ gia hạn HC-5.19 có ghi lý do.
- **Nguồn pháp lý (chỉ đại ý, chưa đọc bản gốc; chưa luật sư xác nhận):** Luật Bảo vệ dữ liệu cá nhân số 91/2025/QH15, hiệu lực 1/1/2026 (quyền yêu cầu xoá; Điều 14 các trường hợp xoá/huỷ); Nghị định 356/2025/NĐ-CP (ban hành 31/12/2025, hiệu lực 1/1/2026, thay Nghị định 13/2023) — theo luatvietan.vn: Điều 5, xoá trong **20 ngày**, 30 ngày khi có bên xử lý/bên thứ ba; Nghị định 13/2023 cũ: 72 giờ (bản tin PwC 28/01/2026; hethongphapluat.com Điều 16). Bản gốc NĐ 356: `vbpl.moj.gov.vn` (chưa đọc tới điều này).
