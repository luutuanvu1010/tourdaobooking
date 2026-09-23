# ADR-0015 — Thêm cách đăng nhập nhanh song song PIN: passkey (Face ID/Touch ID) và Google (OIDC); Zalo để sau

- **Trạng thái:** **proposed** (AI soạn 2026-09-23, chờ chủ dự án duyệt). Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-09-23   **Người phê chuẩn:** chủ dự án (chưa duyệt)
- **Loại quyết định:** **cửa hai chiều** cho hành vi: tắt nút là quay về chỉ PIN; bảng mới chỉ thêm, không đổi bảng cũ. **Một chiều nhẹ** cho dữ liệu: migration thêm bảng đã áp remote thì không gỡ tệp (quy tắc migration), nhưng bảng có thể bỏ không dùng.
- **Liên quan:**
  - ADR-0001: danh tính là hồ sơ; tài khoản `staff` là nơi đăng nhập; số đăng nhập ≠ số liên hệ.
  - ADR-0002: ranh giới module; bảng mới thuộc module `auth`.
  - ADR-0014: có `PARTNER`, ~1000 tài khoản đối tác; một Super Admin duy nhất, chủ đã chấp nhận rủi ro tự khoá.
  - Nghiên cứu nguồn: `docs/superpowers/specs/2026-09-23-nghien-cuu-oidc.md` (§10 ghi trả lời của chủ).
  - Kiểm toán kiến trúc 2026-09-22 §14: gợi ý Cloudflare Access, bị loại ở dưới.

## Bối cảnh

Đăng nhập hiện nay là SĐT + PIN 6 số, có Turnstile, bộ chống dò và cookie phiên `td_session` tự ký (`docs/SYSTEM-DESIGN.md` §4). Chủ dự án yêu cầu nghiên cứu OIDC thay lớp đăng nhập. Sau khi đọc nghiên cứu, chủ trả lời (2026-09-23, gần nguyên văn):

1. Muốn giải cả ba (quên PIN, nhanh hơn, bảo mật), **đặc biệt là đăng nhập phải cực nhanh**. iPhone phổ biến, người dùng thích đăng nhập nhanh **bằng khuôn mặt**.
2. **Thêm lựa chọn**, không thay PIN.
3. Mọi người hầu hết dùng **Gmail**.
4. Gmail phổ biến, nhưng **mở rộng lựa chọn** cho người dùng (cả đối tác).
5. Đăng nhập bằng **Zalo là tuỳ chọn**, ý tưởng hay.

Điểm then chốt: "đăng nhập bằng khuôn mặt" **không phải** việc OIDC làm.
- OIDC/Google là "để Google xác nhận hộ". Trên iPhone vẫn phải chuyển sang trang Google, chọn tài khoản, rồi quay lại app.
- Thứ cho đúng trải nghiệm một chạm + Face ID là **passkey** (chuẩn WebAuthn). App cài từ màn hình chính (PWA) trên iPhone hỗ trợ passkey (passkeys.dev, tài liệu Apple/WebKit; **chưa thử trên iPhone của công ty**).
- Vì vậy ADR này đặt **passkey là đường nhanh chính**, **Google OIDC là lựa chọn phụ** (máy mới, Android, máy tính), đúng câu 1 và câu 4.

## Quyết định

**1. Giữ nguyên SĐT + PIN; khoá danh tính vẫn là tài khoản `staff`.** Mọi cách mới chỉ là "chìa khoá khác" mở cùng một tài khoản.
- Sau mọi cách đăng nhập, app vẫn cấp đúng cookie `td_session` hiện có.
- Nhờ vậy phân quyền, thu hồi phiên (`credentials_changed_at`, `active`), chế độ bảo trì (tra SĐT của tài khoản) và "Đăng nhập gần nhất" (`recordLogin`) áp dụng như nhau cho mọi cách.
- Token của Google **không** được dùng làm phiên của app.

**2. Passkey (Face ID/Touch ID), đường nhanh chính:**
- **Chỉ tạo khi đang đăng nhập.** Tạo bằng PIN hoặc Google, ở "Tài khoản của tôi". Sau lần đăng nhập bằng PIN đầu tiên trên máy có hỗ trợ, app mời "Bật đăng nhập bằng Face ID?" (có nút "Để sau").
- **Đăng nhập một chạm, không cần gõ SĐT.**
  - Dùng khoá tìm được trên máy (discoverable credential).
  - Bắt buộc xác minh người dùng (`userVerification: "required"`, tức Face ID/Touch ID hoặc mật mã máy).
  - `rpId` = `booking.tourdao.vn`.
  - Chấp nhận thuật toán ES256 (-7) và RS256 (-257).
  - Không yêu cầu chứng thực nhà sản xuất (`attestation: "none"`).
- **Thách thức (challenge) không lưu D1.** Nó nằm trong cookie tạm ký HMAC, dùng một lần, hạn ngắn, giống cách `session.ts` đang ký. Route xin thách thức có giới hạn theo IP.
- **Mỗi tài khoản có nhiều passkey** (iPhone, máy tính…). Người dùng xem và gỡ được. Gỡ = đặt `valid_to`, không xoá cứng.

**3. Google (OIDC), lựa chọn phụ:**
- Luồng Authorization Code + PKCE, `state` + `nonce`, `response_mode=query`, bắt đầu bằng điều hướng GET. Chi tiết và bẫy ở nghiên cứu §5.3.
- **Liên kết chỉ khi đang đăng nhập**, ghi `(issuer, sub) → staff_id`.
  - Tài khoản Google chưa liên kết ⇒ từ chối, kèm hướng dẫn.
  - **Không tự tạo tài khoản.**
  - **Không ghép theo email.**

**4. Zalo: ngoài phạm vi ADR này.** Zalo Login là OAuth 2.0 kiểu riêng, không phải OIDC (nghiên cứu §4). Khi chủ muốn làm thì viết ADR/đặc tả riêng, dùng lại đúng khung "liên kết khi đang đăng nhập" của điều 3.

**5. Dữ liệu (thuộc module `auth`; tên cụ thể chốt ở đặc tả):**
- Bảng passkey: id khoá, khoá công khai, thuật toán, bộ đếm chữ ký, nhãn thiết bị, `staff_id`, `created_at`, `last_used_at`, `valid_from`/`valid_to`.
- Bảng liên kết danh tính ngoài: issuer, subject, `staff_id`, `created_at`, `valid_from`/`valid_to`.
- Không thêm cột email vào `staff`. Số migration lấy theo quy tắc CLAUDE.md §10 lúc thi công.
- Cập nhật `docs/data-dictionary.json`.

**6. Ai đổi được gì:**
- Người dùng tự thêm hoặc gỡ passkey và liên kết Google của chính mình.
- Admin/Super Admin **gỡ được** passkey và liên kết của tài khoản họ quản lý (cùng luật "cấp dưới" của ADR-0014 điều 8). Admin **không tạo hộ** được.
- **Đề xuất mặc định (chủ xác nhận khi duyệt):** "Đặt lại PIN" và "Đình chỉ" do admin làm sẽ **gỡ luôn** mọi passkey và liên kết Google của tài khoản đó. Máy bị mất hoặc người bị nghi lộ thì chỉ cần một thao tác. Người dùng tự đổi PIN thì **không** gỡ.

**7. Super Admin luôn giữ PIN.** Đường thoát khẩn hiện có (SQL ở `docs/HANDOFF-N1.md`) giữ nguyên. Cách mới không được là cách duy nhất vào tài khoản Super Admin.

**8. Nhật ký và bảo mật:**
- Chỉ ghi sự kiện (`passkey_added`, `passkey_removed`, `identity_linked`, `identity_unlinked`) kèm `staff_id`.
- **Không** ghi email, `sub`, id khoá hay token.
- Không thêm thư viện chạy lúc runtime; tự viết bằng Web Crypto, có test cho từng bước kiểm.
- CSP chỉ mở thêm đúng nguồn cần (nếu cần) cho Google.

**9. Thứ tự giao hàng:**
- **Lát 0**, cổng đi/không đi: thử trên iPhone thật ở chế độ app cài. Passkey tạo và đăng nhập được. Google quay lại được app và giữ phiên.
- **Lát 1:** passkey.
- **Lát 2:** Google.
- **(Lát 3, tuỳ chọn):** Zalo, theo ADR riêng.
- Mỗi lát là việc lớn (dữ liệu + quyền + triển khai): có người kiểm độc lập, e2e, và kịch bản Chrome.

## Phương án bị loại

- **Thay hẳn PIN bằng Google:** khoá ngoài người không có hoặc không nhớ Gmail; Super Admin phụ thuộc Google; trái câu trả lời 2.
- **Chỉ Google OIDC, không passkey:** không cho trải nghiệm Face ID một chạm, là điều chủ nhấn mạnh nhất. Trên PWA iPhone còn có rủi ro chuyển hướng (nghiên cứu §5.4).
- **Cloudflare Access:** miễn phí tối đa 50 người. ~1030 người ≈ 7.200 USD/tháng (giá bên thứ ba, chưa đối chiếu chính thức).
- **Dịch vụ danh tính trung gian (Auth0, Clerk…):** thêm phụ thuộc, thêm nơi giữ dữ liệu cá nhân, tốn phí theo người dùng. Việc cần làm vừa đủ nhỏ để tự viết có test.
- **Ghép tài khoản Google theo email do admin nhập:** cần cột và dữ liệu mới; nhập sai là vào nhầm tài khoản.

## Hệ quả

- **Được:** người đã bật passkey đăng nhập bằng một chạm + Face ID, không gõ SĐT/PIN. Passkey không bị lừa nhập vào trang giả (gắn với tên miền). Ít phải nhờ admin mở khoá PIN.
- **Mất / phải gánh:**
  - Ba đường đăng nhập phải duy trì và kiểm.
  - Thêm hai bảng.
  - Passkey trên iPhone đồng bộ qua iCloud của **người dùng**: máy dùng chung giữa nhiều nhân viên thì chỉ người chủ Face ID dùng được. Họ vẫn đăng nhập bằng PIN như cũ.
- **Rủi ro còn mở:**
  - Hành vi thật trên iPhone chưa thử (lát 0).
  - Thử passkey cần tên miền https đúng `rpId`, nên không thử được trên IP LAN của `dev-iphone.mjs`. Cần một địa chỉ https tạm; cách làm chốt ở kế hoạch, và mọi thao tác triển khai do chủ chạy.

## Tiêu chí kiểm khi thi công (chi tiết ở đặc tả)

1. Tạo passkey khi đang đăng nhập → đăng xuất → "Đăng nhập bằng Face ID" vào đúng tài khoản, `td_session` được cấp, "Đăng nhập gần nhất" cập nhật.
2. Chữ ký sai, sai `rpId`/origin, thách thức cũ hoặc dùng lại, không có cờ xác minh người dùng, passkey đã gỡ, tài khoản `active = 0` → đều bị từ chối (test đỏ trước, xanh sau).
3. Bảo trì bật và SĐT không được phép → 503 `maintenance` qua cả passkey lẫn Google.
4. Admin đặt lại PIN hoặc đình chỉ → passkey và liên kết của tài khoản đó hết hiệu lực (nếu chủ giữ mặc định ở điều 6).
5. Toàn bộ test và e2e của luồng PIN giữ nguyên hành vi.
6. Nhật ký không chứa email, `sub`, id khoá, token.
