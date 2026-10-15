# Phương án kiến trúc hai gói

> Hồ sơ có ngày (2026-10-16), mức bảng và sơ đồ chữ, chưa có mã. Mỗi lựa chọn ghi điều luật đỡ nó (mã điều ở `SUY-RA.md`). Tên bảng, cột là **tên tạm**; số migration lấy lúc thi công (số lớn nhất mọi nhánh + 1, `CLAUDE.md` §10). Quy mô: ~30 nhân viên + ~1000 tài khoản đối tác (ADR-0014).

## GÓI 1 — Đăng nhập hai lớp (phần thay đổi so với thiết kế đã duyệt)

Gói 1 **đã được thiết kế và duyệt** ngày 1/10: ADR-0074, đặc tả `docs/superpowers/specs/2026-10-01-xac-thuc-hai-lop-dac-ta.md` (luồng §4, dữ liệu §5, quy tắc an toàn §6, tiêu chí §11, trang ghép §13), kế hoạch Phần B (ứng dụng xác thực + mã dự phòng + máy được tin) và Phần C (email, Task 0 trước). Phần A (sổ phiên) đã có trong mã (bản 1.58, `migrations/0065_aut_session.sql`; trạng thái production không kiểm ở đây — CLAUDE.md §8). **Đã có sẵn chỗ cho Phần B** (Phần A dựng trước): `issueLoginSession` (`src/modules/auth/index.ts`) nhận cách đăng nhập `PIN_MFA`, `PIN_TRUSTED` và tham số `trustedDeviceId`; cột `aut_session.method` (CHECK gồm hai mã đó) và `trusted_device_id` có trong `migrations/0065_aut_session.sql`; nhãn "PIN + mã", "PIN máy tin" có ở `session-ledger.ts`. **Chưa có**: bảng `aut_mfa_*`, `aut_trusted_device`, cột `staff.mfa_grace_until`, route `/api/auth/mfa/*`, cookie chờ, mã TOTP/email/mã dự phòng, giao diện bước 2 — tức chưa có đường nào thật sự đi vào `PIN_MFA`/`PIN_TRUSTED`. Tài liệu này không vẽ lại; chỉ ghi phần đổi.

| Hạng mục | Thiết kế đã duyệt (giữ) | Thay đổi / bổ sung do yêu cầu 16/10 |
|---|---|---|
| Khi nào hỏi | PIN đúng + máy chưa được tin → bước 2 (đặc tả §4.1) | Không đổi. "Lần đầu trên thiết bị" = máy chưa được tin (A1) |
| Mã email | 6 số, 10 phút, tối đa 5 lần nhập/mã, 3 email/15 phút/tài khoản (Phần C) | Không đổi (khớp chủ chốt 16/10) |
| Bảng | `aut_mfa_factor`, `aut_mfa_recovery_code`, `aut_mfa_email_code`, `aut_trusted_device`, cột `staff.mfa_grace_until` (đặc tả §5) | Không đổi; đánh lại số migration (đặc tả còn ghi `0058`, nhật ký thi công ghi `0062` — đều đã cũ) |
| Thứ tự phát hành | Ứng dụng xác thực + mã dự phòng trước, email sau (đặc tả §9 R1) | Giữ, vì ADR-0074 đ7 bắt ba vai lớn dùng ứng dụng xác thực (A3). Nếu Task 0 kết luận "gửi được" sớm, B và C có thể ra **cùng một bản** |
| Phạm vi | Nội bộ bắt buộc (14 ngày ân hạn), bên ngoài tự chọn | **Chủ chốt 16/10: đối tác cũng bắt buộc** → ADR-G1, bật theo đợt (mục "Bắt buộc đối tác" dưới) |
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

### Bắt buộc đối tác (~1000 tài khoản) — chủ chốt 16/10, ADR-G1

| Vấn đề | Thiết kế | Luật / lý do |
|---|---|---|
| Yếu tố của đối tác | Email (mã 6 số, 10 phút) hoặc ứng dụng xác thực; đối tác không giữ ba vai lớn nên được dùng email (ADR-0074 đ7 không chặn) | ADR-0074 đ4, đ7 |
| Đối tác chưa có email | `staff` không có cột email; email hồ sơ (`pty_contact_point`) **không** tự thành yếu tố (X5). Trong ân hạn, đối tác đang có phiên thấy dải nhắc → gõ email → nhận mã → nhập đúng mới lưu yếu tố. Có thể **gợi ý** email hồ sơ (che), vẫn bắt nhập mã | ADR-0074 đ4; đặc tả 10-01 §4.3 |
| Ân hạn | **Giả định 14 ngày** như nội bộ, tính từ lúc tài khoản được đưa vào đợt bắt buộc (`staff.mfa_grace_until` đặt trong cùng lô) | ADR-0074 đ1 (bổ sung "14 ngày từ lúc tạo/cấp") |
| Mốc bắt đầu, tránh khoá cả ngàn người | **Cờ toàn cục** "bắt buộc lớp hai cho tài khoản bên ngoài" (dữ liệu có hiệu lực, chỉ Toàn quyền đổi, Hiến chương 5.2) + **đưa vào theo đợt**: Toàn quyền chọn một nhóm (vd 5 cộng tác viên thí điểm như ADR-0014, rồi ~100/đợt) → máy chủ đặt hạn ân hạn cho đúng nhóm đó. Cờ tắt → không đối tác nào bị chặn. Chỉ bật đợt đầu khi Phần C đã chạy ổn trên production | ADR-0014 (tiền lệ thí điểm 5 CTV) |
| Hết ân hạn chưa bật | Đăng nhập PIN bị chặn, lời nhắn "Liên hệ Quản trị để mở lại việc bật bảo mật đăng nhập". Quản trị (sau khi gọi điện xác nhận đúng người) bấm "mở lại 24 giờ" → lần đăng nhập PIN kế tiếp trong 24 giờ chỉ vào được trang bật lớp hai | đặc tả 10-01 §4.5 (cơ chế 24 giờ sau khi bị tắt) |
| Mất máy / mất hộp thư | Mã dự phòng; không có thì Quản trị tắt lớp hai (ADR-0074 đ5) rồi người đó bật lại trong 24 giờ. Nhân sự **không** làm hỗ trợ đăng nhập (ADR-0071 đ1e) | ADR-0074 đ5; ADR-0042 |
| Face ID | **Giả định: vẫn miễn** (passkey đã là hai yếu tố, ADR-0074 đ3); chủ chưa nói về Face ID. Có Face ID đã đăng ký = đạt yêu cầu; nhưng hết ân hạn mà đăng nhập bằng PIN trên máy chưa tin thì bị chặn (không có yếu tố để hỏi), phải dùng Face ID | ADR-0074 đ3; ADR-G1 đ6 |
| **Đối tác không có hộp thư và không cài được ứng dụng xác thực** | **Nói thẳng:** người này hết ân hạn sẽ **bị chặn**, và nút "mở lại 24 giờ" **không giải được** — nút đó chỉ mở trang bật lớp hai, mà người này không có yếu tố nào để bật. Số đối tác rơi vào trường hợp này: **chưa kiểm** (phải truy vấn chỉ đọc trên production, việc của chủ). **Đang áp làm giả định (README M4-A):** bắt buộc ít nhất **một** yếu tố — email đã xác nhận, ứng dụng xác thực, hoặc Face ID; trong ân hạn Quản trị hỗ trợ trực tiếp (giúp tạo email, cài ứng dụng, đăng ký Face ID trên điện thoại của chính người đó); **không có ngoại lệ vĩnh viễn**; ngoại lệ **tạm thời** thời hạn ngắn (giả định ≤ 14 ngày mỗi lần), chỉ Toàn quyền đặt, nhật ký trước, tự hết hạn bằng cách so lúc đăng nhập (không Cron ghi). Phương án khác và hệ quả: (B) **chấp nhận khoá** — người đó không dùng Nền tảng, làm việc với văn phòng qua điện thoại; đơn giản, nhưng văn phòng gánh thay việc của họ; (C) **Quản trị cấp mã dự phòng hộ** — Quản trị cầm yếu tố thứ hai của người khác, tức đăng nhập thay được: chính lỗ "tự xác minh qua tài khoản giả" (ADR-H5 đ5), làm yếu bảo mật, cần ADR riêng; (D) **chờ kênh khác** như Zalo (đợt 2 của đặc tả 10-01) — cần ADR + bí mật mới + chi phí, chưa có ngày; trong lúc chờ phải hoãn người đó khỏi đợt, trái "không phân biệt" của chủ | ADR-G1 đ6, đ7; HC-5.11 |
| Bảo trì, Turnstile, sổ phiên | Không đổi: bước 2 qua `maintenanceBlock`; Turnstile ở bước 1; đối tác "nhiều máy" (ADR-0085) vẫn qua lớp hai ở mỗi máy chưa tin | đặc tả §6 |
| Tải hỗ trợ | Ước tính (chưa đo): mỗi đợt ~100 người, nếu 10–20% không tự bật kịp thì 10–20 cuộc gọi Quản trị/đợt; thư gửi: mỗi máy mới một thư, máy được tin 30 ngày → cỡ vài nghìn thư/tháng cho ~1000 tài khoản (giá, giới hạn chưa tra). **Chưa kiểm** bao nhiêu đối tác đã có email trong hồ sơ (cần truy vấn chỉ đọc trên production — chủ chạy) | — |
| Hoàn tác | Toàn quyền tắt cờ toàn cục → mọi đối tác trở lại như ADR-0074 đ1 ngay ở lần đăng nhập kế tiếp; yếu tố đã bật vẫn giữ (đã bật thì bị hỏi, như ADR-0074 đ1). Không mất dữ liệu | — |

**Phép thử (bắt buộc trước khi bật đợt đầu):** cờ tắt → đối tác chưa bật đăng nhập PIN bình thường; cờ bật, tài khoản ngoài đợt → bình thường; tài khoản trong đợt, còn ân hạn → vào được, thấy dải nhắc; hết ân hạn → 403 lời thường; tắt cờ → lại vào được. Phá thử: cho máy chủ bỏ qua cờ (luôn coi là bật) → ca "cờ tắt" đỏ.

Email là việc bên ngoài chạy **sau** lô ghi (Hiến chương 5.16): ghi dòng mã (băm) trước, gửi sau; lỗi gửi → "Chưa gửi được email, thử lại hoặc dùng cách khác", không lộ lỗi nhà cung cấp.

## GÓI 2 — Hồ sơ đầy đủ, giấy tờ, xác minh, quyền riêng tư

### 2.1 Mô hình dữ liệu (module `parties` sở hữu mọi bảng `pty_*` dưới đây)

| Thứ | Nơi ở | Loại (Hiến chương 2.2) | Vì sao ở đây |
|---|---|---|---|
| Ngày sinh | `pty_person.birth_date` (cột mới, ngày dân sự, rỗng = chưa khai) | thuộc tính thực thể | B3; một nơi |
| Giới tính | `pty_person.gender` (đã có) | thuộc tính | migration 0066 |
| SĐT, email cá nhân | `pty_contact_point` (đã có) | điểm liên hệ | B2; ADR-0001 đ5 |
| Địa chỉ cá nhân | `pty_contact_point` loại `ADDRESS` (thêm **một dòng** vào `pty_contact_kind`; mở rộng kiểu viết cứng `ContactKind` ở `parties/rules.ts` và `ContactPointDto.kind` ở `contracts.ts`; không phải `party_site` mà ADR-0010 đ2 đã loại) | điểm liên hệ | Mô hình dữ liệu lõi mục 1; không cột mới |
| Địa chỉ pháp lý, MST, email hoá đơn của tổ chức | `pty_organization.address`, `tax_code`, `invoice_email` (đã có) | thuộc tính | đã là nguồn duy nhất, `ownerCompany` dựa vào đó (N7) |
| Số CCCD, GPLX… của người | `pty_person_document` (đã có) | thực thể | B4; ADR-0040 D2 |
| Loại giấy tờ tổ chức | `pty_organization_document_type` (mới; mã, tên, có hạn hay không, thứ tự, `active`; Quản trị sửa trên màn hình) | bảng tra cứu | B5; Hiến chương 2.2 |
| Giấy tờ tổ chức (GPKD, GP lữ hành nội địa/quốc tế, GP kinh doanh lưu trú/xếp hạng, GP kinh doanh vận tải…) | `pty_organization_document` (mới; khuôn y hệt `pty_person_document`: số, `number_key`, ngày cấp, nơi cấp, hết hạn, `previous_id`, `voided_at`, `erased_at`, trigger cấm xoá / cấm sửa dòng đã gia hạn) | thực thể | B5, B6; khuôn đã có người kiểm |
| Kết quả xác minh | `pty_verification` (mới, **chỉ-thêm**: đối tượng (loại + id dòng), kết luận `DA_XAC_MINH` / `TU_CHOI` / `CAN_XAC_MINH_LAI`, lý do (chỉ danh sách đóng, không chữ tự do — ADR-H5 đ6), người xác minh, cờ "người xác minh từng tạo/chạm tài khoản" (chỉ khi Toàn quyền là chốt cuối — ADR-H5 đ5), lúc) — trạng thái hiện tại = dòng mới nhất | sự kiện | B8; 5.5; trigger 0032 cấm sửa dòng cũ |
| Phiếu tự khai | `pty_self_submission` (mới, chỉ-thêm: hồ sơ, người khai = tài khoản phiên, các trường khai có kiểu, trạng thái `CHO` → `CHAP_NHAN` / `TU_CHOI` / `RUT`, người xử lý) | đối tượng có vòng đời (K5) | X4; 5.23 |
| Tệp | `pty_attachment` (mới: khoá R2 ngẫu nhiên, loại theo nội dung thật, dung lượng, băm SHA-256 của tệp, hồ sơ chủ, người tải, lúc tải, `purged_at`, `purge_reason`) + `pty_attachment_link` (chỉ-thêm: tệp ↔ dòng giấy tờ hoặc phiếu) | thực thể + liên kết | 5.22; X8 |
| Chính sách riêng tư | `pty_privacy_policy` (mới: phiên bản, nội dung tóm tắt các mục đích, `valid_from_at`; chỉ-thêm) | chính sách có hiệu lực | 5.21; Hiến chương 5.2 |
| Đồng ý | `pty_consent` (mới, chỉ-thêm: hồ sơ, phiên bản chính sách, mục đích, đồng ý / rút, lúc, tài khoản) | sự kiện | 5.21 |
| Phiếu yêu cầu xoá | `pty_erasure_request` (mới: hồ sơ, người yêu cầu, lúc, hạn = lúc + số ngày của chính sách hiện hành (mặc định đề xuất 20, trần 30 — `SUY-RA.md` X13), trạng thái `MOI` → `DANG_XU_LY` → `XONG` / `XONG_MOT_PHAN` / `TU_CHOI`, người xử lý, danh sách phần giữ lại theo luật dạng mã) | đối tượng có vòng đời | 5.24; chủ chốt 16/10 |

Không thêm cột "đã xác minh" vào bảng giấy tờ (chỉ-thêm ở bảng riêng). Không trường mở rộng tự do (Hiến chương 5.2): trường của phiếu tự khai là cột có kiểu, không JSON tự do. Mọi cột mới có hạng N0–N4 trong `docs/data-dictionary.json` (5.20).

### 2.2 Luồng tự khai → xác minh

```
Người dùng (Tài khoản của tôi → "Hồ sơ của tôi")
  ├─ đọc chính sách riêng tư phiên bản hiện hành → bấm đồng ý (pty_consent)
  ├─ khai trường + tải ảnh giấy tờ → pty_self_submission (CHO) + pty_attachment (+link)
  │     giá trị hiện hành KHÔNG đổi; tên trên đơn/biên nhận KHÔNG đổi (X4, bài học F-01)
Người xác minh (ô party.verify — Quản trị, Nhân sự, Toàn quyền; chủ chốt 16/10, ADR-H5)
  ├─ hàng chờ: phiếu CHO, kèm cờ kiểm trùng (dưới)
  ├─ mở ảnh (stream qua Worker, nhật ký trước) → so với trường khai
  ├─ Chấp nhận: MỘT lô = ghi vào pty_person / pty_contact_point / pty_*_document
  │     (câu lệnh do parties sinh) + pty_verification DA_XAC_MINH + phiếu CHAP_NHAN + nhật ký (chỉ mã)
  └─ Từ chối: phiếu TU_CHOI + lý do (danh sách đóng) ; người khai thấy lý do, khai lại
  KHÔNG có nút sửa trường khai: chấp nhận nguyên văn hoặc từ chối (ADR-H5 đ6)
  Sau khi xử lý: người xác minh không xem lại trường khai / ảnh; chỉ thấy mã phiếu, loại, kết luận, người xử lý, lúc
Người xác minh ≠ người khai (máy chủ chặn, như ADR-0089 đ4c "người duyệt không tự chi")
Tách nhiệm vụ (ADR-H5 đ5): người xác minh ≠ người đã tạo tài khoản chủ phiếu, ≠ người đã chạm quyền truy cập
  tài khoản đó trong [lúc gửi phiếu − 30 ngày, lúc xác minh]; nguồn = audit_log qua lính gác của module audit;
  không còn ai hợp lệ → "Chuyển Toàn quyền"
Cấp bậc: Quản trị, Nhân sự không xác minh phiếu của tài khoản họ không quản được (canManageAccount: ADMIN/SUPER_ADMIN, và HR với HR khác — ADR-0071 đ1c)
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
  → pty_erasure_request MOI, hạn = + số ngày chính sách (≤ 30; số thật chờ luật sư — X13); báo Quản trị (Bảng tin, có thể thất lạc — 5.16; hàng chờ là nguồn)
Quản trị: xem trước "sẽ xoá gì / phải giữ gì vì sao" (máy chủ tính)
  → bấm Thực hiện: MỘT lô của parties:
       - pty_*_document: erased_at + số → dấu ẩn danh duy nhất + xoá nơi cấp (trigger ngoại lệ hẹp, X2)
       - pty_contact_point: đóng hiệu lực + thay giá trị bằng dấu ẩn danh (cùng lệnh có tên)
       - pty_person.birth_date → rỗng; tên: giữ nếu hồ sơ còn gắn sổ tiền / đơn đã giao, ngược lại thay bằng "Người đã xoá dữ liệu"
       - pty_attachment: purged_at + lý do
       - aut_session của tài khoản gắn hồ sơ: thay ip, user_agent bằng dấu ẩn danh, giữ dòng (X12; câu do auth cấp, ghép ở gốc lắp ráp — parties không ghi bảng auth)
       - phiếu XONG / XONG_MOT_PHAN + danh sách mã phần giữ lại
       - nhật ký party_erased: chỉ mã phiếu + party_id + số dòng theo loại (X3)
     SAU lô: xoá đối tượng R2 (việc bên ngoài, 5.16); xoá lỗi → tệp còn "chờ xoá" (purged_at có, R2 còn) hiện cho Quản trị, bấm lại
Quá hạn chưa xử lý: chỉ cảnh báo đỏ ở hàng chờ (không Cron ghi — X10)
```

**Phần giữ lại (ghi rõ trong phiếu trả lời; danh sách đầy đủ theo bảng/cột ở §2.8):** dòng đơn kèm bản chụp khách trên đơn (`orders.customer_name/phone/email/note` — trigger `orders_delivered_lock` khoá sau Đã giao), danh sách hành khách (`ord_passenger`: họ tên, năm sinh — lưu ít nhất 3 năm theo luật vận tải, ghi ở đầu `migrations/0035_hanh_khach.sql`), lần thu, sổ công nợ, bản chụp yêu cầu hoá đơn đã chép (ADR-0010 đ2); họ tên trong nhật ký thao tác (X3); SĐT trong nhật ký cũ trước 21/9; dòng phiên đăng nhập (đã bỏ IP, User-Agent — X12); tài khoản đăng nhập và SĐT đăng nhập (`staff.phone`) nếu người đó vẫn đang làm việc/hợp tác (khi đó phiếu là `XONG_MOT_PHAN`); **chữ tự do** (ghi chú đơn, góp ý, câu hỏi trợ lý, nội dung thông báo) **không được rà** — phiếu nói thẳng điều này. Căn cứ luật của từng phần giữ: **chưa luật sư/kế toán xác nhận** (`RANG_BUOC_NGOAI.md` L1 còn [C]).

**Thời hạn giữ ảnh giấy tờ (chủ chốt 16/10: "giữ khi giấy tờ còn hiệu lực"; điều đề xuất 5.25):**

| Tình huống | Ảnh |
|---|---|
| Giấy tờ còn hạn (`expiry_date` rỗng hoặc ≥ hôm nay VN), là dòng hiện hành (chưa gia hạn thay, chưa huỷ) **và** người đó còn quan hệ | giữ |
| Giấy tờ hết hạn, hoặc đã có dòng gia hạn thay, hoặc dòng bị huỷ | vào **danh sách xoá** ngay (không chờ 12 tháng) |
| Giấy tờ không có ngày hết hạn (vd giấy phép kinh doanh thường không ghi hạn) | giữ tới khi hết quan hệ (định nghĩa ở dòng dưới) |
| **Định nghĩa duy nhất (giả định):** hết quan hệ = **mọi vai** của hồ sơ (`pty_party_role`) đã đóng (`valid_to_date` đã qua theo giờ VN). Tài khoản bị ngưng **không** tính (ngưng có thể mở lại; hồ sơ không có tài khoản cũng phải tính được). Hệ quả biết trước: người đã nghỉ mà chỉ bị ngưng tài khoản, vai chưa đóng, thì ảnh còn giữ. Hồ sơ bị gộp vào hồ sơ khác thì ảnh đi theo dòng giấy tờ sang hồ sơ chính (X8) | vào danh sách xoá khi hết quan hệ |
| Phiếu tự khai bị **từ chối** hoặc **rút** | vào danh sách xoá (không còn lý do giữ) — giả định |

Danh sách xoá là **hình chiếu đọc** (tính lúc mở, không Cron ghi — X10, HC-5.11); Quản trị hoặc Toàn quyền bấm "Xoá ảnh" theo lô, máy chủ chạy lệnh có tên như phiếu xoá (chỉ phần tệp), nhật ký chỉ mã. CCCD gắn chip có ngày hết hạn (kiến thức chung, chưa tra) nên đi theo dòng đầu.

**Hồ sơ đã gộp (ADR-0068):** phiếu trên hồ sơ chính áp cả mọi hồ sơ phụ có `merged_into_id` = hồ sơ chính (một bước, không chuỗi — ADR-0068 Đ3).

**Sao lưu — nói thẳng giới hạn:** điểm khôi phục D1 Time Travel còn giữ dữ liệu đã ẩn danh trong số ngày Cloudflare giữ (**chưa kiểm**, `RANG_BUOC_NGOAI.md` C4); R2 xoá là mất ngay nếu không bật giữ phiên bản (kiến thức chung, chưa tra). Nếu phải khôi phục D1 về trước một lần xoá, sổ phiếu cũng quay lui theo → cần **danh sách mã phiếu đã thực hiện** giữ ngoài D1 (chỉ mã, không dữ liệu cá nhân) và bước "chạy lại phiếu xoá" trong runbook khôi phục. Phần này **xây trên lỗ đang hở: HC-5.19** (chưa từng diễn tập khôi phục).

### 2.6 Hoá đơn và đại lý đọc dữ liệu đã xác minh

| Nơi đọc | Cách | Luật |
|---|---|---|
| Yêu cầu xuất hoá đơn (chưa xây) | Hàm công bố mới của `parties` (tên tạm `hoSoXuatHoaDon(partyId)`) trả tên pháp lý, MST, địa chỉ, email hoá đơn + cờ "đã xác minh" từng trường; `billing` **chép** vào yêu cầu lúc tạo | ADR-0010 đ2; Hiến chương 5.3 (đọc qua hàm/view công bố); 4.4 |
| Chính sách đại lý | Nếu chủ muốn điều kiện "đã xác minh" → lý do giữ mới trong `LyDoGiu` (5.7). **Không** bật trong gói này | 5.7; ADR-0117 |
| Danh bạ / đơn | Không đổi: nhãn tên qua view `v_pty_party_label` | Phần II quy tắc 4 |

### 2.7 Ai thấy gì (tóm tắt, chi tiết ở `TRANG-GHEP.md`)

Chính chủ: thấy và khai hồ sơ của mình (số của mình hiện **che**, ảnh của mình xem được), trạng thái xác minh, phiếu xoá của mình. Người xác minh (Quản trị, Nhân sự, Toàn quyền — chủ chốt 16/10): thấy ảnh và số **chỉ của phiếu đang trong hàng chờ**, mỗi lần mở có nhật ký trước; Nhân sự không thấy Danh bạ (`party.view` vẫn `none`). Quản trị: như hiện nay (số che), xử lý phiếu xoá. Bán hàng, Kế toán: như hôm nay thấy tên/SĐT/email hồ sơ (`party.view` = any), **không** thấy ngày sinh, địa chỉ cá nhân (ô mới, `TRANG-GHEP.md` §2). Toàn quyền: mọi thứ. Đối tác: chỉ hồ sơ gắn tài khoản của mình (một tài khoản công ty lữ hành = hồ sơ tổ chức, ADR-0018 đ9).

### 2.8 Kiểm kê dữ liệu cá nhân: hạng (5.20) và số phận khi có phiếu xoá

Quét `migrations/` bằng tên cột (2026-10-15: phone, email, name, address, note, birth, ip, user_agent, document_number, account_*, body, contact). **Chưa quét**: nội dung các cột JSON (`prices_json`, `before_json`, `detail` của nhật ký…), cột chữ tự do đặt tên khác mẫu, view. Bảng này là đầu vào của lát H-0.

| Bảng.cột | Hạng đề xuất | Khi có phiếu xoá | Ghi chú |
|---|---|---|---|
| `pty_party.display_name`, `pty_person.family/middle/given_name` | N2 | giữ nếu hồ sơ dính đơn đã giao/sổ tiền; ngược lại thay "Người đã xoá dữ liệu" | tên in trên đơn cũ qua view nhãn |
| `pty_person.gender`, `birth_date` (mới) | N2 | rỗng | `gender` dùng cho trợ lý Mai (ADR-0084) |
| `pty_contact_point.value`, `value_normalized` (PHONE, EMAIL, ADDRESS) | N2 | đóng + thay dấu ẩn danh | trừ hồ sơ công ty chủ |
| `pty_organization.legal_name`, `tax_code`, `address`, `invoice_email` | N1 (doanh nghiệp) / N2–N3 (hộ kinh doanh, cá nhân) | thay dấu ẩn danh nếu là cá nhân/hộ; bản chụp đã chép vào yêu cầu hoá đơn giữ | MST của hộ kinh doanh gắn với người (kiến thức chung, chưa tra) |
| `pty_person_document.document_number`, `number_key`, `issued_place` | N3 | ẩn danh hoá (X2) | |
| `pty_organization_document.*` số, nơi cấp (mới) | N1 / N3 (hộ) | như trên | |
| `pty_attachment` + tệp R2 (mới) | N3 | `purged_at` + xoá R2 | |
| `pty_bank_account.account_number`, `account_name` (migration 0087) | N1 | **ngoài phạm vi**: trigger chỉ cho hồ sơ công ty chủ (`pty_bank_account_owner_only`) | đã cấm vào nhật ký (sổ dữ liệu) |
| `staff.phone` | N2 | giữ khi tài khoản còn dùng; tài khoản ngưng thì đề xuất thay dấu ẩn danh (cần xét khoá `UNIQUE` và đăng nhập lại) — **để ADR-H4 quyết** | SĐT đăng nhập ≠ liên hệ (ADR-0001 đ5) |
| `staff.full_name` | — | cột chết hằng `''` | CLAUDE.md §10 |
| `aut_session.ip`, `user_agent` | N2 | thay dấu ẩn danh, giữ dòng (X12) | ADR-0075 đ9 |
| `aut_passkey` (khoá công khai, nhãn máy) | N1 | gỡ khi tài khoản ngưng (đường gỡ Face ID đã có) | chưa đọc cột chi tiết |
| `login_attempt.key` (chứa SĐT dạng khoá đếm) | N2 | bộ đếm ngắn hạn; đề xuất dọn dòng quá 15 phút (đã có chỉ mục theo giờ) — **chưa kiểm** có dọn sẵn chưa | |
| `aut_mfa_factor.email` (Gói 1) | N2 | gỡ yếu tố khi tài khoản ngưng | thuộc `auth` (ADR-0074 đ4) |
| `orders.customer_name/phone/email/note` | N2 | **giữ** (bản chụp chứng từ; khoá sau Đã giao, migration 0044) | |
| `ord_passenger.full_name`, `birth_year` | N2 | **giữ** ≥ 3 năm (luật vận tải); không gắn hồ sơ nên không tự tìm theo người | |
| `ord_transfer_leg.pickup_place`, `dropoff_place`; `order_service.note`, `pickup_place` | N1–N2 (chữ tự do) | không rà | |
| `audit_log.detail` | N1 (+ họ tên — ngoại lệ X3) | **giữ** (trigger chỉ-thêm) | |
| `fbk_message.body`, `ntf_notice.noi_dung`, `tl_luot_hoi`/`tl_hoi_dap` câu hỏi, các cột `note` của `bil_*`, `vc_*`, `prc_*` | N1–N2 (chữ tự do) | không rà; phiếu nói rõ | câu hỏi trợ lý đã chặn dãy 8 chữ số (CHECK 0054) |
| `loc_location.address`, `vc_dispatch_policy.office_phone`, `company_profile.*` | N0–N1 | ngoài phạm vi (nơi chốn, số công ty, bảng chết) | |
