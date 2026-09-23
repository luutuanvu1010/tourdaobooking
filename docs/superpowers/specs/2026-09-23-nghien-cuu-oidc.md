# Nghiên cứu: đăng nhập bằng OpenID Connect (OIDC) thay cho SĐT + PIN

- **Ngày:** 2026-09-23 · **Trạng thái:** NGHIÊN CỨU (chưa phải đặc tả, chưa phải ADR). Không có mã nào được viết.
- **Yêu cầu của chủ dự án (nguyên văn):** "nghiên cứu tích hợp OpenID Connect - OIDC (lớp xác thực danh tính nằm trên OAuth 2.0). thay cho lớp đăng nhập hiện tại".
- **Vì sao chỉ nghiên cứu:** thay lớp đăng nhập là quyết định kiến trúc, đụng dữ liệu (bảng mới), quyền (ai vào được) và triển khai (bí mật mới, cấu hình nhà cung cấp) → cần ADR mới do chủ duyệt (N3, Điều 7.2). Tài liệu này chỉ nêu dữ kiện, phương án, khuyến nghị và câu hỏi.

## 1. Tóm tắt một đoạn

OIDC làm được trên Cloudflare Worker mà không cần thư viện ngoài. Có hai vướng lớn, cả hai thuộc nghiệp vụ chứ không phải kỹ thuật:
- **(a) Danh tính trong app là SỐ ĐIỆN THOẠI.** Nhà cung cấp OIDC phổ biến (Google, Microsoft, Apple) trả về một mã người dùng và email, **không trả SĐT**. Vì vậy phải có bước "liên kết" tài khoản.
- **(b) Khoảng 1000 tài khoản đối tác** (lái xe, lễ tân, CTV) chưa chắc ai cũng có và nhớ tài khoản Google.

Khuyến nghị: **thêm** "Đăng nhập bằng Google" song song, **giữ PIN** làm đường dự phòng. Liên kết tài khoản khi người dùng đang đăng nhập bằng PIN. Thí điểm với nhân viên trước. Việc bỏ hẳn PIN để thành quyết định riêng, sau khi có số liệu dùng thật.

## 2. Hiện trạng (đã đọc mã, 2026-09-23)

| Thành phần | Hiện nay | Nơi |
|---|---|---|
| Chứng minh danh tính | SĐT + PIN 6 số, băm PBKDF2 100k vòng | `src/modules/staff/password.ts`, `src/modules/auth/index.ts` |
| Chống bot / dò PIN | Turnstile trước; 5 lần/SĐT, 30 lần/IP trong 15 phút | `auth/turnstile.ts`, `auth/throttle.ts` |
| Phiên | cookie `td_session` tự ký HMAC, 7 ngày, `HttpOnly; SameSite=Lax; Secure` | `auth/session.ts` |
| Thu hồi phiên | `staff.credentials_changed_at` > thời điểm phát hành ⇒ từ chối | `staff/index.ts#getActiveStaff` |
| Khoá danh tính | `staff.phone` (UNIQUE, NOT NULL); bảng `staff` **không có cột email** | `migrations/0001_staff.sql` |
| Phụ thuộc vào SĐT | chế độ bảo trì (`allowed_phones`), bộ chống dò, liên kết hồ sơ, đường thoát khẩn của Super Admin | `src/modules/maintenance/`, `docs/HANDOFF-N1.md` |
| Ghi nhận đăng nhập | chỉ `POST /api/auth/login` gọi `recordLogin` | `docs/CHANGE-GUIDE.md` công thức q |
| CSP | `form-action 'self'`, `connect-src 'self' https://challenges.cloudflare.com` | `public/_headers` |
| Quy mô | ~30 nhân viên + tới ~1000 đối tác (thí điểm 5 CTV) | ADR-0014 |

Kiểm toán kiến trúc 2026-09-22 (`docs/AUDIT-2026-09-22-KIEN-TRUC.md` §14) đã gợi ý: *"cân nhắc Cloudflare Access (OIDC Google Workspace) nếu công ty có tài khoản Google cho nhân viên"*. Mục 4 cho thấy gợi ý này chỉ khả thi nếu giới hạn cho nhân viên.

**Điểm cần giữ nguyên:** OIDC chỉ thay bước "chứng minh bạn là ai". Sau bước đó app **vẫn cấp cookie `td_session` của chính mình**. Nhờ vậy các phần sau giữ nguyên hoặc chỉ nối thêm: phân quyền, thu hồi phiên, bảo trì, "Đăng nhập gần nhất". Không dùng token của Google làm phiên của app.

## 3. OIDC là gì, gọn

- **OAuth 2.0** là cách cấp quyền: "cho app X đọc Y của tôi".
- **OIDC** thêm một lớp danh tính lên trên. Sau khi người dùng đăng nhập ở nhà cung cấp (IdP), app nhận một **`id_token`** (JWT) nói: "người này là `sub` = …, do `iss` = … xác nhận, cấp cho `aud` = app của bạn, hết hạn lúc …".
- Luồng phù hợp cho app có máy chủ là **Authorization Code + PKCE**:

```mermaid
sequenceDiagram
  participant B as Trình duyệt / PWA
  participant W as Worker (booking.tourdao.vn)
  participant G as IdP (ví dụ Google)
  B->>W: GET /api/auth/oidc/start
  W-->>B: 302 tới G, kèm state, nonce, code_challenge; cookie tạm (state, verifier, nonce)
  B->>G: người dùng đăng nhập, đồng ý
  G-->>B: 302 /api/auth/oidc/callback?code=…&state=…
  B->>W: GET callback (cookie tạm đi kèm vì SameSite=Lax + điều hướng GET)
  W->>G: POST token endpoint (code, code_verifier, client_secret)
  G-->>W: id_token
  W->>W: kiểm iss/aud/exp/nonce → tra (iss, sub) → staff_id → cổng bảo trì → recordLogin
  W-->>B: set-cookie td_session, 302 về trang trước
```

## 4. So sánh nhà cung cấp danh tính

| Phương án | Là OIDC? | Trả SĐT? | Chi phí ở quy mô ~1030 người | Ghi chú |
|---|---|---|---|---|
| **Google (tài khoản cá nhân Gmail)** | Có (discovery, JWKS chuẩn) | Không | Miễn phí | Phổ biến ở VN; công ty **không** khoá được tài khoản Gmail của người nghỉ việc, nhưng khoá được `staff.active` trong app, đủ dùng |
| **Google Workspace (@tourdao.vn)** | Có | Không | Trả phí/người ở phía Google (chưa kiểm giá hiện hành) | Công ty tự quản tài khoản, tắt là mất quyền. Chỉ hợp lý cho nhân viên, không cho 1000 đối tác. **Chưa biết công ty có Workspace không** |
| **Cloudflare Access** (đặt trước Worker, IdP phía sau là Google/OTP email) | Có (Access làm trung gian) | Không | Miễn phí **tối đa 50 người**; vượt thì người thứ 51 bị chặn, hoặc ~7 USD/người/tháng ≈ **7.200 USD/tháng** cho 1030 người (nguồn: trang giá bên thứ ba, **chưa đối chiếu trang chính thức**) | Loại cho đối tác. Chỉ khả thi nếu tách riêng phần của nhân viên (tên miền/đường dẫn riêng) |
| **Zalo Login** | **Không**: OAuth 2.0 kiểu riêng (`oauth.zaloapp.com/v4`, hồ sơ qua `graph.zalo.me`), theo tài liệu công khai không có `id_token`/discovery | Chưa kiểm (có thể cần duyệt quyền riêng) | Miễn phí (chưa kiểm điều khoản) | Người VN dùng nhiều nhất, nhưng **không phải OIDC**: phải viết lớp riêng, và rủi ro phụ thuộc chính sách một công ty |
| **Apple** | Có | Không | Miễn phí nhưng cần tài khoản Apple Developer (trả phí năm) | Hợp iPhone; ẩn email có thể làm liên kết khó hơn |
| **Microsoft** | Có | Không | Miễn phí | Ít người dùng ở bối cảnh này |
| **Dịch vụ IdP trung gian** (Auth0, Clerk, Logto, Zitadel…) | Có | Tuỳ (một số có SMS OTP, tốn phí SMS) | Thường tính theo người dùng hoạt động/tháng; chưa kiểm giá | Đẩy phần khó cho bên thứ ba; thêm một nơi giữ dữ liệu người dùng (cân nhắc NĐ 13/2023) |
| *(Để so sánh, không phải OIDC)* **Passkey (WebAuthn)** | Không | Không cần (gắn vào tài khoản đã có) | Miễn phí | Mạnh hơn PIN, không phụ thuộc bên thứ ba, iPhone hỗ trợ sẵn (Face ID). Chỉ nêu để chủ biết có lựa chọn này |

## 5. Vướng chính và cách xử lý nếu làm

### 5.1 Liên kết danh tính (vướng lớn nhất)
- Thêm bảng mới, ví dụ `auth_identity(issuer, subject, staff_id, created_at, valid_to)`, UNIQUE `(issuer, subject)`. Đây là **migration + đổi dữ liệu** nên là việc lớn, cần người kiểm độc lập.
- **Cách liên kết khuyến nghị:** người dùng đang đăng nhập bằng PIN vào "Tài khoản của tôi", bấm "Liên kết Google", đi qua luồng OIDC, app ghi `(iss, sub) → staff_id` của **phiên hiện tại**.
  - Không phải đoán ai là ai.
  - Không cần cột email.
  - Không phụ thuộc `email_verified`.
- **Cách không khuyến nghị:** admin nhập sẵn email cho từng người rồi ghép theo email khi đăng nhập lần đầu. Cách này cần cột mới, nhập liệu thật, và nếu nhập sai email thì có người vào nhầm tài khoản.
- Đăng nhập Google với `sub` chưa liên kết ⇒ từ chối, kèm hướng dẫn "đăng nhập bằng PIN rồi liên kết". **Không tự tạo tài khoản.**
- Gỡ liên kết: đặt `valid_to` (không xoá cứng), và đẩy `credentials_changed_at` để đăng xuất mọi thiết bị.

### 5.2 Giữ các cơ chế đang có
- **Chế độ bảo trì:** sau khi ra `staff_id` thì lấy SĐT của nhân viên đó, rồi dùng đúng `maintenanceBlock`. Không phải đổi luật bảo trì.
- **"Đăng nhập gần nhất":** route callback OIDC cũng phải gọi `recordLogin`. Câu "chỉ `POST /api/auth/login` ghi" ở CHANGE-GUIDE công thức q và SYSTEM-DESIGN §4 phải sửa cùng lúc.
- **Turnstile và bộ chống dò PIN:** không cần cho luồng OIDC (IdP tự chống bot). Vẫn giữ cho luồng PIN.
- **Đường thoát khẩn của Super Admin:** hiện dựa vào SĐT + PIN và một câu SQL. Bỏ PIN thì Super Admin phụ thuộc Google. Google khoá tài khoản hoặc sự cố ⇒ chủ bị khoá ngoài. Đây là lý do mạnh để **giữ PIN ít nhất cho Super Admin**.

### 5.3 Bẫy kỹ thuật đã thấy trước
1. **Không thêm thư viện chạy lúc runtime** (ràng buộc dự án). Tự viết bằng Web Crypto (như `session.ts` đang làm), gồm `state`, `nonce`, PKCE S256.
   - OIDC Core §3.1.3.7 điểm 6: `id_token` nhận **trực tiếp** từ token endpoint qua TLS thì được dùng kiểm TLS thay cho kiểm chữ ký. Nhờ vậy không cần viết phần xác minh RS256/JWKS.
   - **Vẫn phải kiểm** `iss`, `aud`, `exp`, `iat` và `nonce`.
   - Muốn kiểm chữ ký cho chắc thì dùng `crypto.subtle.verify` với RSASSA-PKCS1-v1_5, khoảng vài chục dòng, cache JWKS.
2. **Dùng `response_mode=query`, KHÔNG dùng `form_post`.** Cookie tạm (`state`/`verifier`/`nonce`) là `SameSite=Lax` nên không được gửi kèm POST từ trang khác. Dùng `form_post` thì callback luôn thất bại.
3. **Bắt đầu luồng bằng điều hướng GET** (`location.href = "/api/auth/oidc/start"`), không bằng form POST. CSP `form-action 'self'` sẽ chặn chuyển hướng 302 sang `accounts.google.com` sau một form POST.
4. **Kiểm `Origin`:** route start/callback là GET nên không vướng `checkWriteRequest`. Chống CSRF dựa vào `state` gắn với cookie tạm; phải so khớp chính xác và cookie chỉ dùng một lần.
5. **Service worker:** route `/api/auth/oidc/*` không được cache hay trả trang offline. Phải kiểm trong `src/shared/sw-policy.ts` và test.
6. **Bí mật mới:** `OIDC_CLIENT_SECRET` qua `wrangler secret put`, **chủ tự chạy** (§8). `client_id` và redirect URI (`https://booking.tourdao.vn/api/auth/oidc/callback`, cộng một URI cho local) khai ở Google Cloud Console.
7. **Nhật ký:** không ghi email, `sub` hay token (N10, quy tắc PII). Chỉ ghi sự kiện `identity_linked` / `identity_unlinked` kèm `staff_id`.
8. **Màn hình "cấp quyền" của Google:** app ở chế độ "Testing" chỉ cho tối đa một số người thử. Cho ~1000 người thì phải "publish" app. Chỉ xin `openid email profile` thì thường không cần Google thẩm định (**chưa kiểm quy định hiện hành**).

### 5.4 iPhone ở chế độ app cài (PWA): rủi ro chưa kiểm
- Nhiều báo cáo cũ (iOS 11–13) cho thấy luồng OAuth trong PWA mở ra cửa sổ Safari riêng và **không quay lại app**, hoặc treo sau khi xác thực. Một số nguồn mới hơn nói luồng chuyển hướng (không popup) chạy được.
- **Chưa kiểm trên iPhone thật của công ty. Phải thử trước khi quyết.** Đây là điều kiện đi/không đi, vì nhân viên chủ yếu dùng PWA trên iPhone.
- Thử tối thiểu:
  - PWA đã cài, chưa có cookie, bấm "Đăng nhập bằng Google": có quay lại PWA và **còn đăng nhập** không?
  - Làm lại khi iPhone đang đăng nhập sẵn Google trong Safari, và khi chưa.
  - Chạy trên bản iOS mà nhân viên đang dùng.
- Có thể thử trước **không đụng production** bằng `node scripts/dev-iphone.mjs` cộng một OAuth client thử. Lưu ý Google đòi redirect URI là `https` hoặc `localhost`, nên thử trên LAN có thể cần đường hầm; **chưa kiểm**.

## 6. Ba phương án cho chủ chọn

| | Làm gì | Được | Mất |
|---|---|---|---|
| **A (khuyến nghị)** | Thêm "Đăng nhập bằng Google" song song PIN; liên kết khi đang đăng nhập bằng PIN; thí điểm với nhân viên | Nhân viên không phải nhớ PIN; không khoá ngoài đối tác; lùi được (tắt nút là xong) | Hai đường đăng nhập phải duy trì; PIN vẫn còn làm điểm yếu |
| **B** | Bỏ PIN, bắt buộc Google cho mọi người | Một đường duy nhất; không còn dò PIN | Đối tác không có/không nhớ Gmail thì không vào được; Super Admin phụ thuộc Google; khó lùi |
| **C** | Cloudflare Access trước riêng phần nhân viên | Gần như không viết mã xác thực | Chỉ tối đa 50 người miễn phí; phải tách tên miền/đường dẫn cho nhân viên và đối tác; thêm độ phức tạp vận hành |

*(Ngoài OIDC: passkey trên iPhone giải được "mạnh hơn PIN, không phụ thuộc bên thứ ba". Chỉ nêu để chủ biết, không đề xuất thay OIDC.)*

## 7. Tiêu chí nghiệm thu dự kiến (nếu chủ chọn A; viết trước theo P20)
1. Nhân viên đã liên kết bấm "Đăng nhập bằng Google" → vào app, `td_session` mới được cấp, "Đăng nhập gần nhất" cập nhật.
2. Tài khoản Google chưa liên kết → bị từ chối, thông báo tiếng Việt hướng dẫn liên kết; **không** tạo tài khoản.
3. `state` sai hoặc thiếu, `nonce` sai, `aud` sai, `id_token` hết hạn → bị từ chối (có test đỏ trước, xanh sau).
4. Bảo trì bật, SĐT không được phép → 503 `maintenance` qua cả đường Google.
5. Nhân viên `active = 0` hoặc đã gỡ liên kết → đăng nhập Google bị từ chối; phiên cũ bị đăng xuất.
6. Luồng PIN không đổi hành vi (toàn bộ test/e2e hiện có xanh).
7. Trên iPhone thật, PWA đã cài: đăng nhập Google quay lại app và giữ phiên.
8. Nhật ký không chứa email, `sub`, token.

## 8. Câu hỏi cho chủ dự án (gom một lần)
1. **Nỗi đau cần giải là gì?** Người dùng quên PIN / muốn đăng nhập nhanh hơn / lo bảo mật / không muốn tự giữ mật khẩu? Câu trả lời quyết định A, B hay passkey.
2. **Thay hẳn hay thêm lựa chọn?** Khuyến nghị: thêm (A).
3. **Công ty có Google Workspace (email @tourdao.vn) cho nhân viên không?** Hay nhân viên dùng Gmail cá nhân?
4. **Đối tác (CTV, lái xe, lễ tân) có được dùng đăng nhập Google không**, hay chỉ nhân viên nội bộ trước?
5. **Có cần Zalo không?** Zalo không phải OIDC; làm thì là một việc riêng, lớn hơn.

## 9. Việc tiếp theo nếu chủ duyệt hướng A
1. Thử luồng Google trên iPhone thật ở chế độ PWA (mục 5.4). Đây là cổng đi/không đi.
2. Soạn ADR mới (lớp danh tính liên kết, không thay khoá SĐT), chủ duyệt.
3. Đặc tả + kế hoạch, thi công theo task (migration bảng liên kết, route start/callback, màn liên kết, test, e2e). Có người kiểm độc lập (việc lớn: dữ liệu + quyền + triển khai).
4. Chủ tạo OAuth client ở Google Cloud Console và tự đặt bí mật.

## Nguồn
- OpenID Connect Core 1.0, §3.1.3.7 (ID Token Validation): https://openid.net/specs/openid-connect-core-1_0.html
- Giá Cloudflare Zero Trust (bên thứ ba, chưa đối chiếu trang chính thức): https://costbench.com/software/business-vpn/cloudflare-zero-trust/free-plan/ ; https://zerometric.net/research/cloudflare-zero-trust-free-plan-limits-2026/
- Điểm cuối OAuth của Zalo: https://logto.io/oauth-providers-explorer/zalo ; https://developers.zalo.me/docs/social-api/tham-khao/user-access-token-v4
- OAuth trong PWA iOS: https://developer.apple.com/forums/thread/100407 ; https://developer.apple.com/forums/thread/649699 ; https://intercom.help/progressier/en/articles/9519381-google-oauth2-is-not-working-in-my-pwa-on-ios-why
- Mã đã đọc: `src/modules/auth/index.ts`, `src/modules/auth/session.ts`, `public/_headers`, `migrations/0001_staff.sql`, `docs/SYSTEM-DESIGN.md` §4/§6(a)/§11, ADR-0014, `docs/AUDIT-2026-09-22-KIEN-TRUC.md` §14.

## 10. Trả lời của chủ dự án (2026-09-23) và khuyến nghị cập nhật

Trả lời (gần nguyên văn):
1. Giải cả ba, **đặc biệt đăng nhập phải cực nhanh**; iPhone phổ biến, người dùng thích **đăng nhập nhanh bằng khuôn mặt**.
2. **Thêm lựa chọn** (không thay PIN).
3. Hầu hết dùng **Gmail**.
4. Gmail phổ biến nhưng **mở rộng lựa chọn** cho người dùng.
5. **Zalo là tuỳ chọn**, ý tưởng hay.

**Khuyến nghị cập nhật:** yêu cầu "nhanh bằng khuôn mặt" thuộc về **passkey (WebAuthn)**, không phải OIDC.
- Google/OIDC trên iPhone vẫn phải chuyển trang, chọn tài khoản rồi quay lại app.
- Passkey là một chạm + Face ID, và app cài trên màn hình chính iPhone hỗ trợ (passkeys.dev, progressier.com; **chưa thử trên iPhone của công ty**).

Do đó:
- **Passkey là đường nhanh chính.**
- **Google OIDC là lựa chọn phụ** (máy mới, Android, máy tính).
- **PIN giữ nguyên** (đường dự phòng, và là cách duy nhất chắc chắn cho Super Admin).
- **Zalo để lát sau**, ADR riêng.

Đã soạn thành `docs/adr/ADR-0016-dang-nhap-nhanh-passkey-google-oidc.md` (nháp đầu mang số 0015, đổi số 2026-09-23 vì 0015 dành cho ADR khung điều hướng dọc) (**proposed**, chờ chủ duyệt).

Bẫy kỹ thuật riêng của passkey (bổ sung §5.3):
- Đăng ký phải lấy khoá công khai. `getPublicKey()` của trình duyệt có báo cáo không đồng nhất giữa các trình duyệt, nên an toàn hơn là tự giải mã `attestationObject`: một bộ giải CBOR tối thiểu, có test.
- Đăng nhập chỉ cần `authenticatorData` (nhị phân cố định), `clientDataJSON` và chữ ký. Chữ ký ES256 ở dạng DER phải đổi sang `r||s` trước khi đưa vào `crypto.subtle.verify`.
- WebAuthn chỉ chạy ở ngữ cảnh an toàn (https) và đúng tên miền `rpId`. Không thử được qua IP LAN của `dev-iphone.mjs`; cần một địa chỉ https tạm.

Nguồn bổ sung:
- https://passkeys.dev/docs/reference/ios/
- https://progressier.com/pwa-capabilities/biometric-authentication-with-passkeys
- https://developer.mozilla.org/en-US/docs/Web/API/AuthenticatorAttestationResponse/getPublicKey
- https://github.com/Ortham/passkeys-relying-party/
