# Phương án kiến trúc hai gói

> Hồ sơ có ngày (2026-10-16), mức bảng và sơ đồ chữ, chưa có mã. Mỗi lựa chọn ghi điều luật đỡ nó (mã điều ở `SUY-RA.md`). Tên bảng, cột là **tên tạm**; số migration lấy lúc thi công (số lớn nhất mọi nhánh + 1, `CLAUDE.md` §10). Quy mô: ~30 nhân viên + ~1000 tài khoản đối tác (ADR-0014).

## GÓI 1 — Đăng nhập hai lớp (phần thay đổi so với thiết kế đã duyệt)

Gói 1 **đã được thiết kế và duyệt** ngày 1/10: ADR-0074, đặc tả `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (luồng §4, dữ liệu §5, quy tắc an toàn §6, tiêu chí §11, trang ghép §13), kế hoạch Phần B (ứng dụng xác thực + mã dự phòng + máy được tin) và Phần C (email, Task 0 trước). Phần A (sổ phiên) đã có trong mã (bản 1.58, `migrations/0065_aut_session.sql`; trạng thái production không kiểm ở đây — CLAUDE.md §8). **Phần B, C chưa viết dòng mã nào** (chỉ có `migrations/0065_aut_session.sql`; không có bảng `aut_mfa_*`). Tài liệu này không vẽ lại; chỉ ghi phần đổi.

| Hạng mục | Thiết kế đã duyệt (giữ) | Thay đổi / bổ sung do yêu cầu 16/10 |
|---|---|---|
| Khi nào hỏi | PIN đúng + máy chưa được tin → bước 2 (đặc tả §4.1) | Không đổi. "Lần đầu trên thiết bị" = máy chưa được tin (A1) |
| Mã email | 6 số, 10 phút, tối đa 5 lần nhập/mã, 3 email/15 phút/tài khoản (Phần C) | Không đổi (khớp chủ chốt 16/10) |
| Bảng | `aut_mfa_factor`, `aut_mfa_recovery_code`, `aut_mfa_email_code`, `aut_trusted_device`, cột `staff.mfa_grace_until` (đặc tả §5) | Không đổi; đánh lại số migration (đặc tả còn ghi `0058`, nhật ký thi công ghi `0062` — đều đã cũ) |
| Thứ tự phát hành | Ứng dụng xác thực + mã dự phòng trước, email sau (đặc tả §9 R1) | Giữ, vì ADR-0074 đ7 bắt ba vai lớn dùng ứng dụng xác thực (A3). Nếu Task 0 kết luận "gửi được" sớm, B và C có thể ra **cùng một bản** |
| Phạm vi | Nội bộ bắt buộc (14 ngày ân hạn), bên ngoài tự chọn | **Chờ chủ (README Q1)**: giữ tự chọn, hay bắt buộc đối tác qua email theo lộ trình (cần ADR mới sửa ADR-0074 đ1) |
| Chống dò | Đếm theo tài khoản `mfa:<staffId>` (5 sai/15 phút), không theo cookie chờ | Thêm ghi chú: kiểm toán 13/10 mục D-3 (người lạ gõ sai PIN 5 lần khoá đăng nhập của người khác 15 phút) — lớp hai **không** làm lỗi này nặng thêm vì bước 2 chỉ mở sau PIN đúng; vá D-3 là việc riêng |
| Email nhận mã | Thuộc `auth`, xác nhận bằng mã lúc bật | Màn bật có thể **gợi ý** email đã xác minh ở hồ sơ (sau Gói 2), vẫn bắt nhập mã gửi tới địa chỉ đó; lưu riêng (A5, X5) |
| Khôi phục | 10 mã dự phòng; Quản trị tắt cho cấp dưới, Toàn quyền tắt cho Quản trị/Toàn quyền (ADR-0074 đ5) | Không đổi |

### Luồng đăng nhập máy lạ (nhắc lại để đọc liền, nguồn đặc tả §4, §13)

```
Trang đăng nhập ─ SĐT + PIN + Turnstile
  └─ máy chủ: bảo trì? → chống dò PIN → PIN đúng?
        ├─ tài khoản không cần lớp hai, hoặc cookie "máy được tin" hợp lệ
        │     └─ issueLoginSession (một lô: đá phiên cũ nếu một máy → chèn phiên mới)
        └─ ngược lại: KHÔNG cấp phiên; trả next:"mfa" + cookie chờ 5 phút (khoá riêng)
              └─ bước 2: bảo trì? → hạn mức theo tài khoản → mã TOTP | mã email | mã dự phòng
                    ├─ đúng: issueLoginSession (+ cookie máy được tin 30 ngày nếu chọn)
                    └─ sai: 401 lời thường; quá hạn mức: 429
Face ID: không qua bước 2 (đã là hai yếu tố, ADR-0074 đ3), vẫn qua sổ phiên.
```

### Kiểm gửi email thật trước (Task 0) và dự phòng

| Bước | Ai | Nội dung |
|---|---|---|
| 0a | AI | Đọc tài liệu chính thức Cloudflare Email Service hiện hành: gửi tới **địa chỉ bất kỳ** được không, điều kiện (xác minh tên miền, DNS), giới hạn số thư/ngày, giá. Ghi thành **dòng mới đề xuất** cho `RANG_BUOC_NGOAI.md` mục 2 (AI không tự sửa tệp đó ở việc này) |
| 0b | Chủ (có hỏi trước) | Thử gửi một mã tới hộp thư của chính chủ trên bản thử (không phải production) |
| 0c | AI | Kết luận "gửi được / không". "Không" → dừng phần email, trình chủ: (a) nhà cung cấp email khác qua API (ADR mới + bí mật mới); (b) chỉ ứng dụng xác thực + mã dự phòng (Zalo ZNS ở đợt 2). Không tự chọn |

Email là việc bên ngoài chạy **sau** lô ghi (Hiến chương 5.16): ghi dòng mã (băm) trước, gửi sau; lỗi gửi → "Chưa gửi được email, thử lại hoặc dùng cách khác", không lộ lỗi nhà cung cấp.

## GÓI 2 — Hồ sơ đầy đủ, giấy tờ, xác minh, quyền riêng tư

### 2.1 Mô hình dữ liệu (module `parties` sở hữu mọi bảng `pty_*` dưới đây)

| Thứ | Nơi ở | Loại (Hiến chương 2.2) | Vì sao ở đây |
|---|---|---|---|
| Ngày sinh | `pty_person.birth_date` (cột mới, ngày dân sự, rỗng = chưa khai) | thuộc tính thực thể | B3; một nơi |
| Giới tính | `pty_person.gender` (đã có) | thuộc tính | migration 0066 |
| SĐT, email cá nhân | `pty_contact_point` (đã có) | điểm liên hệ | B2; ADR-0001 đ5 |
| Địa chỉ cá nhân | `pty_contact_point` loại `ADDRESS` (thêm **một dòng** vào `pty_contact_kind`) | điểm liên hệ | Mô hình dữ liệu lõi mục 1; không cột mới |
| Địa chỉ pháp lý, MST, email hoá đơn của tổ chức | `pty_organization.address`, `tax_code`, `invoice_email` (đã có) | thuộc tính | đã là nguồn duy nhất, `ownerCompany` dựa vào đó (N7) |
| Số CCCD, GPLX… của người | `pty_person_document` (đã có) | thực thể | B4; ADR-0040 D2 |
| Loại giấy tờ tổ chức | `pty_organization_document_type` (mới; mã, tên, có hạn hay không, thứ tự, `active`; Quản trị sửa trên màn hình) | bảng tra cứu | B5; Hiến chương 2.2 |
| Giấy tờ tổ chức (GPKD, GP lữ hành nội địa/quốc tế, GP kinh doanh lưu trú/xếp hạng, GP kinh doanh vận tải…) | `pty_organization_document` (mới; khuôn y hệt `pty_person_document`: số, `number_key`, ngày cấp, nơi cấp, hết hạn, `previous_id`, `voided_at`, `erased_at`, trigger cấm xoá / cấm sửa dòng đã gia hạn) | thực thể | B5, B6; khuôn đã có người kiểm |
| Kết quả xác minh | `pty_verification` (mới, **chỉ-thêm**: đối tượng (loại + id dòng), kết luận `DA_XAC_MINH` / `TU_CHOI` / `CAN_XAC_MINH_LAI`, lý do (danh sách đóng + chữ ngắn), người xác minh, lúc) — trạng thái hiện tại = dòng mới nhất | sự kiện | B8; 5.5; trigger 0032 cấm sửa dòng cũ |
| Phiếu tự khai | `pty_self_submission` (mới, chỉ-thêm: hồ sơ, người khai = tài khoản phiên, các trường khai có kiểu, trạng thái `CHO` → `CHAP_NHAN` / `TU_CHOI` / `RUT`, người xử lý) | đối tượng có vòng đời (K5) | X4; 5.23 |
| Tệp | `pty_attachment` (mới: khoá R2 ngẫu nhiên, loại theo nội dung thật, dung lượng, băm SHA-256 của tệp, hồ sơ chủ, người tải, lúc tải, `purged_at`, `purge_reason`) + `pty_attachment_link` (chỉ-thêm: tệp ↔ dòng giấy tờ hoặc phiếu) | thực thể + liên kết | 5.22; X8 |
| Chính sách riêng tư | `pty_privacy_policy` (mới: phiên bản, nội dung tóm tắt các mục đích, `valid_from_at`; chỉ-thêm) | chính sách có hiệu lực | 5.21; Hiến chương 5.2 |
| Đồng ý | `pty_consent` (mới, chỉ-thêm: hồ sơ, phiên bản chính sách, mục đích, đồng ý / rút, lúc, tài khoản) | sự kiện | 5.21 |
| Phiếu yêu cầu xoá | `pty_erasure_request` (mới: hồ sơ, người yêu cầu, lúc, hạn = lúc + 30 ngày, trạng thái `MOI` → `DANG_XU_LY` → `XONG` / `XONG_MOT_PHAN` / `TU_CHOI`, người xử lý, danh sách phần giữ lại theo luật dạng mã) | đối tượng có vòng đời | 5.24; chủ chốt 16/10 |

Không thêm cột "đã xác minh" vào bảng giấy tờ (chỉ-thêm ở bảng riêng). Không trường mở rộng tự do (Hiến chương 5.2): trường của phiếu tự khai là cột có kiểu, không JSON tự do. Mọi cột mới có hạng N0–N4 trong `docs/data-dictionary.json` (5.20).

### 2.2 Luồng tự khai → xác minh

```
Người dùng (Tài khoản của tôi → "Hồ sơ của tôi")
  ├─ đọc chính sách riêng tư phiên bản hiện hành → bấm đồng ý (pty_consent)
  ├─ khai trường + tải ảnh giấy tờ → pty_self_submission (CHO) + pty_attachment (+link)
  │     giá trị hiện hành KHÔNG đổi; tên trên đơn/biên nhận KHÔNG đổi (X4, bài học F-01)
Người xác minh (ô party.verify — README Q2)
  ├─ hàng chờ: phiếu CHO, kèm cờ kiểm trùng (dưới)
  ├─ mở ảnh (stream qua Worker, nhật ký trước) → so với trường khai
  ├─ Chấp nhận: MỘT lô = ghi vào pty_person / pty_contact_point / pty_*_document
  │     (câu lệnh do parties sinh) + pty_verification DA_XAC_MINH + phiếu CHAP_NHAN + nhật ký (chỉ mã)
  └─ Từ chối: phiếu TU_CHOI + lý do (danh sách đóng) ; người khai thấy lý do, khai lại
Người xác minh ≠ người khai (máy chủ chặn, như ADR-0089 đ4c "người duyệt không tự chi")
Sửa giá trị đã xác minh (kể cả Quản trị sửa ở Danh bạ) → pty_verification CAN_XAC_MINH_LAI cùng lô
```

Gánh việc ước tính: ~1030 hồ sơ, mỗi hồ sơ 1–3 giấy tờ → khoảng 1000–3000 lượt xác minh lần đầu; không cần tự động hoá, nhưng hàng chờ phải lọc được theo loại và "đối tác đang hoạt động".

### 2.3 Kiểm trùng / mạo danh (cờ cho người xác minh, không tự từ chối)

| Kiểm | Cách | Đã có gì |
|---|---|---|
| Cùng số CCCD ở hồ sơ khác | Trigger "một CCCD một người" chặn ở CSDL | migration 0032 |
| Cùng số GPKD / MST ở tổ chức khác | Trigger cùng khuôn cho `pty_organization_document` loại GPKD; MST trùng giữa hai tổ chức → cờ | mới |
| Số GPKD ≠ MST của tổ chức | So khớp ở máy chủ, cờ "lệch" | mới (B6) |
| Cùng ảnh tải cho hai hồ sơ | So băm SHA-256 của tệp | mới |
| Tên khai ≠ tên hồ sơ đã xác minh | So sau chuẩn hoá (khuôn tên của ADR-0068 Đ8: NFC, chữ thường kiểu Việt, giữ dấu) | dùng lại |
| MST sai khuôn / sai chữ số kiểm | Luật thuần có test | mới (thuật toán chữ số kiểm: kiến thức chung, chưa tra) |
| Giấy tờ hết hạn | So `expiry_date` với `vnToday` | dùng lại `src/shared/giay-to.ts` |

### 2.4 Kho tệp R2

| Quyết định | Lý do (luật) |
|---|---|
| **Bucket riêng** (tên tạm `tourdao-sales-ho-so`, binding `HO_SO`), không dùng chung bucket `TEP` của ADR-0041 | Tệp ADR-0041 không bao giờ xoá; tệp hồ sơ phải xoá được theo phiếu (5.22, 5.24). Bucket riêng cũng đáp ứng "thư mục riêng" chủ yêu cầu ở mức chặt hơn. Chủ tạo bucket bằng một lệnh (như ADR-0041 Hệ quả) |
| Khoá tên `pty/<chuỗi ngẫu nhiên 128 bit>` — không chứa `party_id`, tên, số | Lộ danh sách khoá không lộ gì (5.22) |
| Chỉ JPG, PNG, HEIC, PDF; ≤ 10 MB; kiểm chữ ký đầu tệp | ADR-0041 đ2 (bỏ DOC/DOCX/TXT/MD — giấy tờ chỉ cần ảnh/PDF, tối thiểu hoá) |
| Tải lên: đặt R2 trước, lô D1 lỗi thì gỡ tệp vừa đặt | ADR-0041 đ2 (ngoại lệ tệp mồ côi đã duyệt) |
| Tải xuống: route của `parties`, `can()` + phạm vi → **nhật ký trước** trong cùng lô với lần đọc quyền (khuôn route "xem đủ số") → stream thân tệp từ Worker | ADR-0040 D2, ADR-0083 đ2; không cấp đường dẫn ký sẵn của R2 vì đường dẫn đó qua mặt `can()` lúc tải |
| Header: `Cache-Control: no-store`, `Content-Disposition` (ảnh xem tại chỗ, PDF tải), `X-Content-Type-Options: nosniff`, không bao giờ phục vụ HTML/SVG | ADR-0041 đ3; 5.22 |
| Service worker: thêm luật "không bao giờ lưu đệm" cho đường tệp hồ sơ ở `src/shared/sw-policy.ts`, có bài kiểm | 5.22; iPhone giữ bộ đệm lâu |
| Xoá EXIF (toạ độ chụp) trước khi lưu ảnh | Tối thiểu hoá; **khả thi trên Worker chưa kiểm** (không thêm thư viện runtime — CLAUDE.md §1) → nếu không làm được thì ghi nợ |
| Quét mã độc | Cloudflare có quét cho R2 hay không: **chưa tra**. Bù bằng: chỉ ảnh/PDF, kiểm chữ ký, không phục vụ dạng chạy được |

### 2.5 Quyền riêng tư: đồng ý, mục đích, yêu cầu xoá

**Mục đích khai (đề xuất, chủ sửa chữ):** (1) xác minh danh tính, chống mạo danh; (2) điền sẵn yêu cầu xuất hoá đơn (ADR-0004, ADR-0010 đ2); (3) áp chính sách đại lý / hoa hồng (ADR-0077); (4) điều kiện được lái xe, dẫn đoàn (ADR-0040). Không tiếp thị, không bán, không chia cho bên thứ ba (tiền lệ ADR-0018 đ10).

**Phiếu yêu cầu xoá (luồng):**

```
Người dùng: "Hồ sơ của tôi" → "Yêu cầu xoá thông tin" → chọn phạm vi (ảnh giấy tờ / số giấy tờ / liên hệ / tất cả)
  → pty_erasure_request MOI, hạn = +30 ngày; báo Quản trị (Bảng tin, có thể thất lạc — 5.16; hàng chờ là nguồn)
Quản trị: xem trước "sẽ xoá gì / phải giữ gì vì sao" (máy chủ tính)
  → bấm Thực hiện: MỘT lô của parties:
       - pty_*_document: erased_at + số → dấu ẩn danh duy nhất + xoá nơi cấp (trigger ngoại lệ hẹp, X2)
       - pty_contact_point: đóng hiệu lực + thay giá trị bằng dấu ẩn danh (cùng lệnh có tên)
       - pty_person.birth_date → rỗng; tên: giữ nếu hồ sơ còn gắn sổ tiền / đơn đã giao, ngược lại thay bằng "Người đã xoá dữ liệu"
       - pty_attachment: purged_at + lý do
       - phiếu XONG / XONG_MOT_PHAN + danh sách mã phần giữ lại
       - nhật ký party_erased: chỉ mã phiếu + party_id + số dòng theo loại (X3)
     SAU lô: xoá đối tượng R2 (việc bên ngoài, 5.16); xoá lỗi → tệp còn "chờ xoá" (purged_at có, R2 còn) hiện cho Quản trị, bấm lại
Quá 30 ngày chưa xử lý: chỉ cảnh báo đỏ ở hàng chờ (không Cron ghi — X10)
```

**Phần giữ lại (ghi rõ trong phiếu trả lời):** dòng đơn, lần thu, sổ công nợ, bản chụp yêu cầu hoá đơn đã chép (ADR-0010 đ2); tên trong nhật ký thao tác (X3); SĐT trong nhật ký cũ trước 21/9; tài khoản đăng nhập nếu người đó vẫn đang làm việc/hợp tác (khi đó phiếu là `XONG_MOT_PHAN`). Căn cứ luật của từng phần giữ: **chưa luật sư/kế toán xác nhận** (`RANG_BUOC_NGOAI.md` L1 còn [C]).

**Hồ sơ đã gộp (ADR-0068):** phiếu trên hồ sơ chính áp cả mọi hồ sơ phụ có `merged_into_id` = hồ sơ chính (một bước, không chuỗi — ADR-0068 Đ3).

**Sao lưu — nói thẳng giới hạn:** điểm khôi phục D1 Time Travel còn giữ dữ liệu đã ẩn danh trong số ngày Cloudflare giữ (**chưa kiểm**, `RANG_BUOC_NGOAI.md` C4); R2 xoá là mất ngay nếu không bật giữ phiên bản (kiến thức chung, chưa tra). Nếu phải khôi phục D1 về trước một lần xoá, sổ phiếu cũng quay lui theo → cần **danh sách mã phiếu đã thực hiện** giữ ngoài D1 (chỉ mã, không dữ liệu cá nhân) và bước "chạy lại phiếu xoá" trong runbook khôi phục. Phần này **xây trên lỗ đang hở: HC-5.19** (chưa từng diễn tập khôi phục).

### 2.6 Hoá đơn và đại lý đọc dữ liệu đã xác minh

| Nơi đọc | Cách | Luật |
|---|---|---|
| Yêu cầu xuất hoá đơn (chưa xây) | Hàm công bố mới của `parties` (tên tạm `hoSoXuatHoaDon(partyId)`) trả tên pháp lý, MST, địa chỉ, email hoá đơn + cờ "đã xác minh" từng trường; `billing` **chép** vào yêu cầu lúc tạo | ADR-0010 đ2; Hiến chương 5.3 (đọc qua hàm/view công bố); 4.4 |
| Chính sách đại lý | Nếu chủ muốn điều kiện "đã xác minh" → lý do giữ mới trong `LyDoGiu` (5.7). **Không** bật trong gói này | 5.7; ADR-0117 |
| Danh bạ / đơn | Không đổi: nhãn tên qua view `v_pty_party_label` | Phần II quy tắc 4 |

### 2.7 Ai thấy gì (tóm tắt, chi tiết ở `TRANG-GHEP.md`)

Chính chủ: thấy và khai hồ sơ của mình (số của mình hiện **che**, ảnh của mình xem được), trạng thái xác minh, phiếu xoá của mình. Người xác minh: hàng chờ + ảnh + số đủ của **phiếu đang xử lý**. Quản trị: như hiện nay (số che), xử lý phiếu xoá. Toàn quyền: mọi thứ. Đối tác: chỉ hồ sơ gắn tài khoản của mình (một tài khoản công ty lữ hành = hồ sơ tổ chức, ADR-0018 đ9).
