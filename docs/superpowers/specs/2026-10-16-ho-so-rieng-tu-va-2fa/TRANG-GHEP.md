# Trang ghép (CLAUDE.md §9 "Bước ghép khi duyệt")

> Hồ sơ có ngày (2026-10-16). Áp cho các lượt duyệt ở `DE-XUAT-ADR.md`. Câu kiểm bắt buộc từ bài học F-01: **"bảng hồ sơ nay chứa ai?"** Cột quyền theo thứ tự `src/shared/permissions.ts` `PERMISSION_CODES`: SALES · ACCOUNTING · ADMIN · FIELD · PARTNER · SUPER_ADMIN · INTERN · DRIVER · DRIVER_PARTNER · HR. Ô quyền mới là **đề xuất** chờ duyệt ADR; người xác minh theo lời chủ chốt 2026-10-16 (Quản trị + Nhân sự).

## 1. Mỗi bảng chứa loại thực thể nào

| Bảng | Hôm nay chứa | Sau gói này chứa thêm | Ghi chú F-01 |
|---|---|---|---|
| `pty_party`, `pty_person`, `pty_organization` | Nhân viên, khách, khách của đối tác, đại lý (người và công ty), HDV/tài xế ngoài, nhà xe, **chính Tour Đảo** (vai `OWNER_COMPANY`) | `pty_person.birth_date` | Bảng chứa **cả người có tài khoản lẫn người không**. Mọi đường tự khai chỉ chạm hồ sơ `staff.party_id` của **phiên**; hồ sơ công ty chủ không bao giờ tự khai được (chỉ `company.legal.write`) |
| `pty_contact_point` | SĐT, email của mọi hồ sơ trên | loại `ADDRESS` | Liên hệ **"Hotline"** của công ty chủ đang được biên nhận đọc (CLAUDE.md §10) → lệnh ẩn danh hoá phải từ chối hồ sơ công ty chủ |
| `pty_person_document` | Giấy tờ của nhân viên, tài xế công ty, tài xế đối tác (ADR-0048) | Giấy tờ tự khai của **đối tác cá nhân** và khách có tài khoản | Hôm nay ô `party.document.view` cột PARTNER = `none`: đối tác chưa từng thấy giấy tờ → mở `own` là **nới**, ghi rõ ở ADR |
| `pty_organization_document` (mới) | — | Giấy phép của đại lý công ty, nhà xe, khách sạn đối tác; **không** của Tour Đảo (giấy tờ công ty chủ để ngoài phạm vi) | Một tài khoản công ty lữ hành gắn **hồ sơ tổ chức** (ADR-0018 đ9) → "hồ sơ của mình" của tài khoản đó là tổ chức |
| `pty_verification`, `pty_self_submission`, `pty_attachment(_link)`, `pty_consent`, `pty_erasure_request` (mới) | — | Chỉ gắn hồ sơ **có tài khoản** (tự khai), trừ `pty_verification` (cả hồ sơ không tài khoản khi Quản trị nhập hộ) | Hồ sơ khách không tài khoản không có đường tự khai, không có phiếu xoá tự gửi (yêu cầu qua điện thoại → Quản trị lập phiếu thay, ô `party.erasure.process`) |
| `aut_mfa_*`, `aut_trusted_device` (Gói 1) | — | Chỉ tài khoản đăng nhập (`staff`), nội bộ + bên ngoài | Như trang ghép đặc tả 10-01 §13; không chứa hồ sơ |

## 2. Dòng bản đồ quyền chạm các bảng này → áp cho loại nào

| Thao tác (tên tạm) | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER | DRV_P | HR | Áp cho | Ghi chú |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `party.self.view` — xem hồ sơ của mình (số che, ảnh của mình, trạng thái xác minh) | own | own | own | own | own | own | own | own | own | own | hồ sơ = `staff.party_id` của phiên | mới; `own` lấy từ phiên, không từ id đường dẫn |
| `party.self.submit` — khai, tải ảnh, rút phiếu của mình; đồng ý chính sách | own | own | own | own | own | own | own | own | own | own | như trên | mới; **nới** cho PARTNER, DRIVER_PARTNER |
| `party.erasure.request` — gửi phiếu xoá của mình | own | own | own | own | own | own | own | own | own | own | như trên | mới |
| `party.view` (**đã có**, `permissions.ts`) — xem hồ sơ khách/đại lý | any | any | any | none | none | any | none | none | none | none | **mọi hồ sơ trong bảng**, kể cả hồ sơ đối tác có tài khoản | Hôm nay DTO hồ sơ (`GET /api/parties`, `/:id`, `/lookup`) trả tên + liên hệ (SĐT, email). Thêm `ADDRESS` và ngày sinh vào cùng DTO nghĩa là **Bán hàng, Kế toán thấy N2 mới của mọi người** → **siết**: hai trường này không vào DTO của ô này |
| `party.personal.view` (mới) — xem ngày sinh, địa chỉ cá nhân của người khác | none | none | any | none | none | any | none | none | none | none | mọi hồ sơ cá nhân; Quản trị theo cấp bậc | mới; DTO trả hai trường **chỉ** khi người xem giữ ô này hoặc là chính chủ. Nếu Kế toán cần địa chỉ cho hoá đơn: địa chỉ **tổ chức** (`pty_organization.address`) vẫn ở `party.view`, không cần ô này |
| `party.write` (**đã có**) — tạo/sửa hồ sơ KHÔNG gắn tài khoản | any | any | any | none | none | any | none | none | none | none | hồ sơ không có tài khoản (khách, đại lý chưa có tài khoản) | Không đổi ô; nhưng `party.write` **không** được ghi `birth_date`/`ADDRESS` của người không tài khoản trừ khi giữ `party.personal.view` (đề xuất siết, ghi ở ADR-H1). Sửa trường đã xác minh → `CAN_XAC_MINH_LAI` cùng lô |
| `party.staff.write` (**đã có**) — sửa hồ sơ GẮN tài khoản | none | none | any | none | none | any | none | none | none | none | hồ sơ có tài khoản, **kể cả ~1000 đối tác** (ADR-0013 đ1) | Không đổi ô; chấp nhận phiếu tự khai đi qua ô xác minh, không qua ô này |
| `party.verify` (mới) — hàng chờ, chấp nhận/từ chối phiếu; thấy trường khai (N2) của **phiếu trong hàng chờ** | none | none | any | none | none | any | none | none | none | **any** | mọi hồ sơ có phiếu (gồm đối tác — **giả định** phạm vi của HR), trừ hồ sơ của chính mình và tài khoản người xác minh không quản được (`canManageAccount`) | **Chủ chốt 16/10** (ADR-H5): Quản trị + Nhân sự. Với HR: **thêm** ô thứ tư ngoài ba ô tài khoản (đảo ADR-0071 đ1e cho ô này) |
| `party.verify.attachment` (mới) — mở ảnh và thấy số đủ **của phiếu đang xử lý** | none | none | any | none | none | any | none | none | none | **any** | chỉ tệp/dòng gắn phiếu trạng thái `CHO` | Nhật ký **trước** mỗi lần mở (khuôn route "xem đủ số"). Với ADMIN: **đảo ADR-0083 đ2**. HR không có `party.document.reveal` chung, không có `party.view` |
| `party.document.write` (đã có) — ghi giấy tờ, xem danh sách giấy tờ (số che) của người khác | none | none | any | none | none | any | none | none | none | none | **đổi phạm vi thực tế**: bảng nay chứa thêm giấy tờ tự khai của đối tác cá nhân và khách có tài khoản; Quản trị theo cấp bậc khi hồ sơ gắn tài khoản (Ruling R8) | Ô không đổi giá trị, nhưng **loại hồ sơ** nó chạm rộng ra → ghi ở ADR-H3. Sửa giá trị đã xác minh → `CAN_XAC_MINH_LAI` cùng lô |
| `party.document.view` (đã có) — giấy tờ của chính mình (số che) | own | own | own | own | **none → own** | any | own | own | own | own | chính mình | Đối tác hôm nay `none` (Ruling R4) → nới cho đối tác, gộp vào `party.self.view` hoặc đổi ô này — chọn một, không hai đường (N7) |
| `party.document.reveal` (đã có) | none | none | none | none | none | any | none | none | none | none | không đổi | ADR-0083 đ2 |
| `party.attachment.view` — xem ảnh giấy tờ người khác ngoài hàng chờ | none | none | none | none | none | any | none | none | none | none | mọi hồ sơ | mới; nhật ký trước |
| `party.erasure.process` — xem trước, thực hiện, từ chối phiếu xoá; lập phiếu thay khách không tài khoản | none | none | any | none | none | any | none | none | none | none | mọi hồ sơ trừ công ty chủ; Quản trị theo cấp bậc | mới; chủ chốt 16/10 "Quản trị xử lý" |
| `party.privacy.policy` — đăng phiên bản chính sách riêng tư mới | none | none | none | none | none | any | none | none | none | none | dữ liệu chính sách | mới |
| Bật/tắt lớp hai của mình; tắt của người khác; xem/gỡ phiên | — | — | — | — | — | — | — | — | — | — | như đặc tả 10-01 §13 bảng (2) | Gói 1; đối tác nay **bắt buộc** (ADR-G1) nhưng không đổi ô nào |
| Cờ "bắt buộc lớp hai cho tài khoản bên ngoài" + đưa đợt đối tác vào ân hạn (mới, ADR-G1) | none | none | none | none | none | any | none | none | none | none | mọi tài khoản bên ngoài | chỉ Toàn quyền, như `auth.session.policy` (ADR-0085) |
| "Mở lại 24 giờ để bật lớp hai" cho người hết ân hạn (mở rộng ô `account.access.manage`) | none | none | any | none | none | any | none | none | none | none | tài khoản cấp dưới (`mayManage`) | Nhân sự **không** (ADR-0071 đ1e) |

**DTO hiện trả hồ sơ cho người trong công ty (phải rà khi thêm trường N2/N3):** `GET /api/parties`, `/api/parties/:id`, `/api/parties/lookup` (ô `party.view`); `GET /api/parties/:id/documents…` (ô `party.document.write`, số che); `GET /api/parties/documents/mine` (ô `party.document.view`); `GET /api/staff` và chi tiết tài khoản (ô `account.view` — Quản trị, Toàn quyền, Nhân sự); hàm công bố `taiXeChoDieuPhoi`, `expiringDriverDocuments` (không số); `GET /api/company` (danh sách trắng năm trường của công ty chủ). Trường mới chỉ được vào DTO nào đã có dòng ở bảng trên.

Bước kiểm "bảng hồ sơ nay chứa ai" cho từng ô mới: không ô nào ở dạng `any` cho SALES/ACC/FIELD/PARTNER/INTERN/DRIVER/DRV_P trên dữ liệu N3; mọi ô cho đối tác là `own` theo phiên. **Ngoại lệ có tên (chủ chốt 16/10): HR `any` ở `party.verify`, `party.verify.attachment`**.

**Bài học F-01 — Nhân sự thấy N2/N3 của ai?** Hôm nay HR thấy tên, SĐT đăng nhập của tài khoản qua `account.view` (màn Quản lý tài khoản), **không** thấy Danh bạ (`party.view = none`), không giấy tờ người khác. Sau ADR-H5: HR thấy thêm trường khai, ảnh, số của **phiếu đang chờ** — tức của bất kỳ ai có tài khoản và đã gửi phiếu, **kể cả ~1000 đối tác và khách có tài khoản** (giả định phạm vi), trừ tài khoản HR không quản được. HR **không** thấy hồ sơ không có phiếu, không thấy ngày sinh/địa chỉ ngoài phiếu, không thấy ảnh sau khi phiếu đã xử lý. Nếu chủ muốn HR chỉ xác minh **nhân viên**, phạm vi đổi thành "phiếu của tài khoản giữ quyền nội bộ" (một điều kiện ở máy chủ) — câu hỏi mới ở README.

**Hàng rào máy phải sửa / thêm cho HR:** (1) bài ghim nguyên dòng HR `src/shared/permissions.test.ts` ("ADR-0071: MỌI ô của Nhân sự (HR) — ghim nguyên dòng, chỉ ba ô tài khoản") — sửa cùng commit, đổi tên thành "ba ô tài khoản + hai ô xác minh" và dòng sổ hàng rào tương ứng ở `docs/SO-HANG-RAO.md`; (2) bài mới "HR chỉ có đúng năm ô khác `none` ngoài các ô của mọi tài khoản nội bộ" (danh sách tên ô cố định) — phá thử: mở thêm `party.view` cho HR → đỏ; (3) bài route: HR gọi `GET /api/parties` → 403; HR mở ảnh của phiếu đã chấp nhận → 403; HR xác minh phiếu của tài khoản Quản trị → 403; (4) các bài "tập con quyền" có ghép HR (vd ảnh chụp tập `…+HR` ở `permissions.test.ts`) chạy lại, không nới.

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (theo thứ tự) |
|---|---|
| `GET /api/me/ho-so` (hồ sơ của tôi) | phiên → `can(party.self.view)` → hồ sơ = `staff.party_id` → DTO danh sách cho phép (số che) |
| `POST /api/me/ho-so/phieu` (khai) | phiên → vé chống ghi trùng (ADR-0094) → `can(party.self.submit)` → đồng ý phiên bản hiện hành phải có → luật thuần kiểm trường → một lô (phiếu + link + nhật ký chỉ mã) |
| `POST /api/me/ho-so/tep` (tải ảnh) | như trên → kích thước ≤ 10 MB → chữ ký đầu tệp → đặt R2 → lô D1 (lỗi thì gỡ R2) |
| `GET …/tep/:id` (xem ảnh) | phiên → `can(party.self.view)` với chủ tệp = mình, **hoặc** `can(party.verify.attachment)` + tệp gắn phiếu đang `CHO` + người xem quản được tài khoản chủ phiếu, **hoặc** `can(party.attachment.view)` → nhật ký trước (một lô) → stream, `no-store` |
| Hàng chờ xác minh, chấp nhận / từ chối | phiên → `can(party.verify)` → người xác minh ≠ người khai (máy chủ + điều kiện trong câu ghi) → cấp bậc `canManageAccount` (Quản trị: không với ADMIN/SUPER_ADMIN; Nhân sự: không với ADMIN/SUPER_ADMIN/HR) → khoá lạc quan trên phiếu → một lô |
| Phiếu xoá: gửi / xử lý | gửi: `can(party.erasure.request)` own; xử lý: `can(party.erasure.process)` → từ chối hồ sơ công ty chủ → xem trước do máy chủ tính → một lô ẩn danh hoá (trigger ngoại lệ hẹp là lớp thứ hai, P21) → xoá R2 sau lô |
| Lớp CSDL | trigger chỉ-thêm cho `pty_verification`, `pty_consent`, `pty_attachment_link`; trigger ẩn danh hoá chỉ một chiều; trigger "một GPKD một tổ chức" |
| Service worker | `sw-policy` loại đường tệp hồ sơ khỏi bộ đệm |

### 3b. Chỗ giao diện ẩn/hiện theo quyền

| Chỗ | Hiện khi | Hỏi ở đâu |
|---|---|---|
| Mục "Hồ sơ của tôi" ở Tài khoản của tôi | mọi tài khoản có hồ sơ | máy chủ trả cờ trong `/api/auth/me` |
| Nút "Gửi xác minh" | đã đồng ý phiên bản hiện hành | máy chủ trả `canSubmit` |
| Hàng chờ "Xác minh hồ sơ" ở thanh bên / Trang chủ | giữ ô `party.verify` | giao diện hỏi bảng quyền (luật bản 1.52), không suy từ mã quyền |
| Nút "Xem ảnh" ở Danh bạ (ngoài hàng chờ) | giữ `party.attachment.view` | máy chủ trả cờ theo dòng |
| Mục "Yêu cầu xoá dữ liệu" (xử lý) | giữ `party.erasure.process` | như trên |
| Nhãn "Đã xác minh / Chờ / Bị từ chối" trên hồ sơ ở Danh bạ | người xem được hồ sơ đó hôm nay (`party.view`) | máy chủ tính, không lộ lý do từ chối cho người không xử lý |
| Ô gợi ý email ở màn bật lớp hai (Gói 1) | hồ sơ có email đã xác minh | máy chủ trả email **đã che**; vẫn bắt nhập mã |
