# Đặc tả: đăng nhập nhanh bằng Face ID (passkey), lát 0 + lát 1 của ADR-0016

- **Ngày:** 2026-09-23 · **Trạng thái:** **ĐÃ DUYỆT** (chủ dự án duyệt 2026-09-23, cùng kế hoạch). Chủ trả lời (gần nguyên văn):
  1. duyệt;
  2. chủ tự chạy bước thử iPhone (Task 0, đường hầm cloudflared);
  3. đồng ý phần Google ở lát 0 chỉ **mô phỏng** chuyển hướng, và kết quả **không chặn** lát 1. Đây là cách hiểu ADR-0016 điều 9 đã được chủ chấp nhận;
  4. chữ trên nút: "Giữ theo đúng thông lệ để mang đến sự quen thuộc", tức giữ nguyên các chữ ở §3;
  5. thi công ở phiên mới.
- **Căn cứ:** `docs/adr/ADR-0016-dang-nhap-nhanh-passkey-google-oidc.md` (**accepted** 2026-09-23). Đặc tả này chỉ chốt những gì ADR để lại cho đặc tả (tên bảng, route, hợp đồng, chữ trên màn hình). Chỗ nào lệch ADR là lỗi của đặc tả.
- **Phạm vi:**
  - **Lát 0:** thử trên iPhone thật: passkey, cộng mô phỏng chuyển hướng kiểu Google.
  - **Lát 1:** passkey đầy đủ.
  - **Google (lát 2) và Zalo:** ngoài phạm vi. Mỗi việc một đặc tả và kế hoạch riêng.
- **Kế hoạch thi công:** `docs/superpowers/plans/2026-09-23-passkey.md`.

## 1. Kết quả mong đợi (người dùng thấy gì)

1. **Lời mời bật Face ID.**
   - Đăng nhập bằng PIN trên máy có Face ID/vân tay và tài khoản chưa có passkey ⇒ app mời "Bật đăng nhập bằng Face ID?".
   - Lời mời có dòng **"Chỉ bật trên điện thoại riêng của bạn."**, một ô nhập lại PIN, và hai nút "Bật" / "Để sau".
   - "Để sau" ⇒ máy này không mời lại tài khoản đó nữa (lưu trong trình duyệt).
2. **Trang đăng nhập** có nút **"Đăng nhập bằng Face ID / vân tay"**. Bấm, nhìn vào máy ⇒ vào app, không gõ SĐT hay PIN.
3. **Trang "Tôi"** (`/account`) có mục **"Đăng nhập bằng Face ID"**:
   - danh sách máy đã bật (tên máy, ngày bật, lần dùng gần nhất), mỗi dòng có nút "Gỡ";
   - "Bật trên máy này" (nhập lại PIN);
   - "Gỡ tất cả";
   - "Quên PIN? Đặt PIN mới bằng Face ID".
4. **Sau khi tự đổi PIN**, mục trên hiện danh sách cùng câu "Face ID vẫn còn bật trên các máy dưới đây. Nếu nghi lộ PIN, bấm Gỡ tất cả."
5. **Trang quản lý nhân viên** có nút "Gỡ Face ID (n)" cho tài khoản đang có passkey. Đặt lại PIN hoặc ngưng tài khoản ⇒ tự gỡ hết.
6. **Gỡ bất kỳ passkey nào** ⇒ các máy khác của tài khoản đó bị đăng xuất. Máy đang thao tác vẫn đăng nhập.

## 2. Quyết định kỹ thuật

### 2.1 Vị trí mã (ranh giới module, ADR-0002)
- **Module `auth`** sở hữu bảng passkey và chứa phần kiểm WebAuthn thuần:
  - `cbor.ts`, `webauthn.ts`, `challenge.ts`, `device-label.ts`;
  - SQL ở `repository.ts`.
  - Hai route **công khai** đăng nhập bằng passkey nằm ở `auth`. Chúng **không** ghi nhật ký, giống đăng nhập PIN hiện nay.
- **`auth` chuyển từ diện LEGACY sang STRICT** (đây là siết, không nới). Mọi SQL của `auth`, kể cả `login_attempt` cũ, đi qua `defineSql`.
- **Các route cần đăng nhập** (bật, gỡ, gỡ tất cả, đặt PIN bằng Face ID, và nút admin) nằm ở **module `accounts`**:
  - `accounts` đã được import cả `auth` lẫn `audit`, và đang chứa `/api/account/change-pin`.
  - `auth` chỉ xuất hàm kiểm và câu lệnh **chưa chạy**; `accounts` gộp chúng cùng câu nhật ký vào một `db.batch()`.
  - Nhờ vậy **không** thêm cạnh phụ thuộc `auth → audit`. Thêm cạnh là nới hàng rào, tiền lệ ADR-0008 đòi phải có ADR.
- **Module `staff`** thêm hai thứ:
  - câu lệnh `touchCredentialsStatement` (đẩy `credentials_changed_at`, chỉ module chủ ghi bảng `staff`);
  - luật `validateFreshPin` (PIN mới khi không có PIN cũ, vẫn chặn PIN yếu).
- **Tiền tố bảng mới là `aut_`**, căn cứ ADR-0016 điều 5 (bảng thuộc `auth`). Danh sách tiền tố của ADR-0002 là danh sách mở: `mnt_` và `fbk_` đã được thêm theo cùng cách.

### 2.2 Dữ liệu: migration `0023_auth_passkey.sql`
Số 0019 giữ cho B5; 0020–0022 đã dùng. Trước khi đặt số, kiểm lại mọi nhánh chưa gộp.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | TEXT PK | UUID |
| `staff_id` | TEXT NOT NULL → `staff(id)` | khoá ngoại `NO ACTION` (cạnh `auth → staff` đã được phép) |
| `credential_id` | TEXT NOT NULL UNIQUE | base64url, dài 16–1400 ký tự |
| `public_key` | TEXT NOT NULL | khoá công khai dạng SPKI DER, base64url |
| `algorithm` | INTEGER NOT NULL | -7 (ES256) hoặc -257 (RS256); kiểm ở mã, không bằng CHECK liệt kê |
| `user_handle` | TEXT NOT NULL | base64url của 16 byte ngẫu nhiên. Mỗi tài khoản một giá trị: lần bật sau dùng lại giá trị của dòng cũ nhất (kể cả dòng đã gỡ). **Không** tính từ `SESSION_SECRET`, vì đổi bí mật sẽ làm lệch |
| `sign_count` | INTEGER NOT NULL DEFAULT 0 | ≥ 0 |
| `label` | TEXT NOT NULL | "iPhone", "iPad", "Máy Mac", "Android", "Máy Windows", "Thiết bị khác". Không chứa SĐT |
| `last_used_at` | TEXT NULL | ISO UTC; cũng là chốt "dùng một lần" (mục 2.4) |
| `valid_from_at` / `valid_to_at` | TEXT | gỡ = đặt `valid_to_at`, không xoá cứng |
| `created_at`, `updated_at` | TEXT NOT NULL | cột kiểm toán ADR-0003 |
| `created_by`, `updated_by` | TEXT NULL | không khoá ngoại |

Chỉ mục `aut_passkey_staff_ix (staff_id, valid_to_at)`. Cập nhật `docs/data-dictionary.json` (module `auth`) rồi chạy `npm run dict`.

### 2.3 Cấu hình
- Hai biến `vars` (không phải bí mật):
  - `PASSKEY_RP_ID`: production `booking.tourdao.vn`, **không** dùng `tourdao.vn` (ADR-0016 điều 8);
  - `PASSKEY_ORIGIN`: production `https://booking.tourdao.vn`.
- Thiếu một trong hai, hoặc hostname của origin khác rp id ⇒ **TẮT**:
  - `GET /api/auth/config` trả `passkey: false`;
  - mọi route passkey trả **503 `passkey_unavailable`** "Đăng nhập bằng Face ID chưa được bật.";
  - log `passkey_misconfigured` hoặc `passkey_disabled`, giống cách làm với Turnstile.
- Ở máy local: `.dev.vars` đặt `localhost` / `http://localhost:8787`. e2e truyền bằng `--var`.
- **Không có bí mật mới.** Khoá ký cookie thách thức được **dẫn xuất** từ `SESSION_SECRET` bằng nhãn mục đích (mục 2.4).

### 2.4 Thách thức (challenge) và "dùng một lần"
- **Cookie `td_webauthn`:** `Path=/api; Max-Age=300; HttpOnly; SameSite=Strict`, thêm `Secure` khi chạy https.
  - `Path=/api` để phủ cả `/api/auth/*` lẫn `/api/account/*`.
  - Hạn 5 phút để trang đăng nhập **lấy sẵn** thách thức lúc mở trang. iPhone có thể đòi lệnh gọi Face ID nằm ngay trong lần chạm, không sau một `await fetch`; lát 0 xác nhận điều này.
- **Dạng token:** `w1.<mục đích>.<staffId|->.<ms phát hành>.<challenge b64url>.<phụ|->.<chữ ký>` (7 phần).
  - Mục đích là `login`, `register` hoặc `pin`.
  - "Phụ" chứa `user_handle` cho `register`.
  - Chữ ký là HMAC-SHA256 bằng khoá `HMAC(SESSION_SECRET, "td-webauthn-challenge-v1")`.
  - Vì khác số phần **và** khác khoá, `verifySessionToken` không bao giờ nhận token này làm phiên. Có test cho điều này.
- **Đọc lại token phải khớp đủ:** mục đích, staffId (`-` với `login`), còn hạn, và chữ ký.
  - Mỗi route chỉ nhận đúng mục đích của nó. Thách thức của đăng nhập đem sang đặt PIN ⇒ bị từ chối.
- **Dùng một lần mà không lưu D1:**
  - Đăng nhập và đặt PIN chạy `UPDATE aut_passkey SET last_used_at = now … WHERE id = ? AND valid_to_at IS NULL AND (last_used_at IS NULL OR last_used_at < <giờ phát hành thách thức>)`.
  - Bắt buộc `changes = 1` trước khi cấp phiên hoặc đổi PIN.
  - Gửi lại cùng một cặp cookie + chữ ký ⇒ `last_used_at` đã ≥ giờ phát hành ⇒ bị từ chối.
  - Đăng ký: gửi lại ⇒ `credential_id` UNIQUE chặn.
- **Hạn mức lấy thách thức theo IP:** 120 lần / 15 phút. Dùng lại bảng `login_attempt` với khoá `webauthn:<ip>`.
  - Danh sách "đang bị khoá" của admin chỉ lọc khoá `phone:`, nên không lẫn.

### 2.5 Kiểm WebAuthn (tự viết bằng Web Crypto, không thư viện)
- **`clientDataJSON`:**
  - `type` = `webauthn.create` hoặc `webauthn.get`;
  - `challenge` khớp;
  - `origin` = `PASSKEY_ORIGIN`;
  - `crossOrigin` không phải `true`.
- **`authenticatorData`:**
  - `rpIdHash` = SHA-256(`PASSKEY_RP_ID`);
  - cờ UP (0x01) **và** UV (0x04) bắt buộc;
  - đăng ký cần AT (0x40);
  - nếu có cờ ED (0x80) thì phần mở rộng được giải và bỏ qua;
  - đọc xong phải hết đúng số byte.
- **Đăng ký:**
  - giải `attestationObject` (CBOR) và **bỏ qua** `fmt`/`attStmt` (`attestation: "none"`);
  - khoá COSE EC2 P-256/-7 hoặc RSA/-257 (n ≥ 2048 bit) được đổi sang SPKI.
- **Đăng nhập:**
  - chữ ký trên `authData ‖ SHA-256(clientDataJSON)`;
  - ES256 phải đổi chữ ký DER sang dạng r‖s 64 byte.
- **Bộ đếm:** không từ chối khi bằng 0. Chỉ từ chối khi cả cũ lẫn mới > 0 mà mới ≤ cũ.
- **Không ghi** id khoá, email hay token ra log. Log chỉ ghi mã lý do ngắn (`bad_origin`, `bad_signature`…).

### 2.6 API

| Phương thức | Đường dẫn | Truy cập | Module | Việc |
|---|---|---|---|---|
| POST | `/api/auth/passkey/options` | public | auth | thách thức `login` (hạn mức IP) → `{ publicKey: RequestOptionsJson }` |
| POST | `/api/auth/passkey/login` | public | auth | `{ credential }` → kiểm → cổng bảo trì theo SĐT → dùng một lần → `recordLogin` → `td_session` → `{ staff }` |
| POST | `/api/account/passkeys/options` | staff | accounts | `{ pin }` → `verifyPinThrottled` (cùng bộ đếm với đăng nhập) → thách thức `register` → `{ publicKey: CreationOptionsJson }` |
| POST | `/api/account/passkeys` | staff | accounts | `{ credential }` → kiểm → thêm dòng + nhật ký `passkey_added` → 201 `{ passkey }` |
| GET | `/api/account/passkeys` | staff | accounts | `{ passkeys: PasskeyDto[] }` của chính mình |
| DELETE | `/api/account/passkeys/:id` | staff | accounts | gỡ một passkey của mình + đẩy `credentials_changed_at` + nhật ký `passkey_removed` + cookie phiên mới |
| POST | `/api/account/passkeys/remove-all` | staff | accounts | như trên cho mọi passkey của mình |
| POST | `/api/account/pin-by-passkey/options` | staff | accounts | thách thức `pin` với `allowCredentials` = passkey của mình (hạn mức IP) |
| POST | `/api/account/pin-by-passkey` | staff | accounts | `{ credential, newPin }` → `validateFreshPin` → kiểm (passkey phải của chính người gọi) → dùng một lần → đặt PIN + nhật ký `pin_set_by_passkey` → cookie phiên mới |
| POST | `/api/staff/:id/passkeys/remove-all` | admin | accounts | `mayManage` (luật "cấp dưới" ADR-0014) → gỡ hết + đẩy `credentials_changed_at` + nhật ký |

- **Sửa hai route admin có sẵn:**
  - `POST /api/staff/:id/reset-pin`: cùng batch gỡ hết passkey, kèm nhật ký `passkey_removed` nếu có dòng bị gỡ.
  - `PATCH /api/staff/:id` với `active: false`: tương tự.
- **Sửa hai hợp đồng có sẵn:**
  - `GET /api/staff` thêm `passkeyCount` vào `StaffAccountDto` (DTO của `accounts`, không sửa `StaffAccount` của `staff`);
  - `GET /api/auth/config` thêm `passkey: boolean`.
- **Mốc thời gian:** mọi chỗ đẩy `credentials_changed_at` rồi cấp phiên mới dùng **cùng một** `at` (mili-giây). Phép so ở `getActiveStaff` là `>`, nên bằng nhau thì phiên mới vẫn hợp lệ. Cần thêm tham số `issuedAt` cho `newSessionCookie` và `at` cho `setPinStatement`.
- **Mã lỗi mới (chữ tiếng Việt):**

| HTTP | Mã | Chữ |
|---|---|---|
| 400 | `passkey_expired` | "Phiên xác nhận Face ID đã hết hạn. Hãy bấm lại." |
| 401 | `passkey_unknown` | "Face ID này đã bị gỡ hoặc không thuộc tài khoản nào. Hãy đăng nhập bằng số điện thoại và PIN." |
| 401 | `passkey_invalid` | "Không xác nhận được Face ID. Hãy thử lại hoặc đăng nhập bằng PIN." |
| 400 | `passkey_invalid` (khi bật) | "Không bật được Face ID. Hãy thử lại." |
| 403 | `passkey_not_yours` | "Face ID này không thuộc tài khoản đang đăng nhập." (đặt PIN bằng passkey của người khác) |
| 409 | `passkey_exists` | "Máy này đã bật Face ID cho tài khoản." |
| 409 | `passkey_none` | "Tài khoản chưa bật Face ID trên máy nào." |
| 503 | `passkey_unavailable` | "Đăng nhập bằng Face ID chưa được bật." |

  Tài khoản đã ngưng: `passkey_unknown` (passkey đã bị gỡ khi ngưng).
- **Nhật ký:** ba mã mới trong nhóm `staff`, không chứa id khoá:
  - `passkey_added` "Bật đăng nhập Face ID";
  - `passkey_removed` "Gỡ đăng nhập Face ID";
  - `pin_set_by_passkey` "Đặt PIN mới bằng Face ID".

### 2.7 Giao diện (theo `web/CLAUDE.md`: dựng bằng `h()`, ô gõ 16px, token CSS)
- **Tệp mới `web/passkey.ts`** (không phải trang, không thêm vào `build:web`) chứa:
  - đổi base64url ⇄ `ArrayBuffer`;
  - `getAssertion(options)` và `createCredential(options)` trả dạng JSON gửi máy chủ;
  - `passkeyErrorMessage(e)`:
    - `NotAllowedError`/`AbortError` (người dùng huỷ) ⇒ `null`, không hiện lỗi đỏ;
    - `InvalidStateError` ⇒ "Máy này đã bật Face ID cho tài khoản.";
    - loại khác ⇒ "Không dùng được Face ID trên máy này. Hãy đăng nhập bằng PIN.".
- **Trang đăng nhập:**
  - nút `#passkey-login` ẩn sẵn (`hidden`), chỉ hiện khi `config.passkey` và trình duyệt có `PublicKeyCredential`;
  - thách thức lấy sẵn lúc mở trang và sau mỗi lần thử, nên lần chạm gọi Face ID ngay;
  - thách thức quá 4 phút thì lấy lại, và hiện "Bấm lại nút Face ID".
- **Bật Face ID (lời mời và trang "Tôi") đi hai bước:**
  - bước 1: nhập PIN → "Bật" (máy chủ kiểm PIN, trả thách thức);
  - bước 2: nút **"Tiếp tục với Face ID"**, lần chạm này gọi `create` ngay.
  - Đặt PIN bằng Face ID cũng hai bước: nhập PIN mới → "Xác nhận bằng Face ID".
  - Lý do: tránh iPhone chặn vì Face ID không nằm trong lần chạm. Lát 0 cho kết quả ổn định thì có thể rút còn một bước, nhưng đó là việc sau.
- **Trang quản lý nhân viên:** "Gỡ Face ID (n)" theo đúng mẫu nút "Đặt lại PIN" có sẵn.

## 3. Giả định bề mặt (tự đặt, ghi lại, chủ đổi được mà không đụng cấu trúc)
- Chữ nút: "Đăng nhập bằng Face ID / vân tay"; "Bật"; "Để sau"; "Tiếp tục với Face ID"; "Gỡ"; "Gỡ tất cả"; "Quên PIN? Đặt PIN mới bằng Face ID".
- Tên máy lấy từ User-Agent, không cho người dùng tự đặt tên.
- Lời mời hiện ở trang đăng nhập ngay sau khi đăng nhập PIN thành công, trước khi chuyển trang.
- Hạn thách thức 5 phút; hạn mức 120 lần / 15 phút / IP.

## 4. Tiêu chí nghiệm thu
Ánh xạ tiêu chí 1–11 của ADR-0016, trừ phần Google. Mỗi tiêu chí có test: đơn vị (`*.test.ts`), e2e `tests/e2e/passkey.mjs`, hoặc kịch bản Chrome.

1. Bật passkey (có PIN) → đăng xuất → Face ID → vào đúng tài khoản; `td_session` được cấp; `last_login_at` cập nhật. *(e2e, Chrome)*
2. Bị từ chối trong các trường hợp:
   - chữ ký sai; `rpIdHash` sai; origin sai;
   - thách thức hết hạn, dùng lại, hoặc sai mục đích;
   - thiếu cờ UV;
   - passkey đã gỡ; tài khoản đã ngưng. *(đơn vị + e2e)*
3. Bảo trì bật và SĐT không được phép → 503 `maintenance` qua đăng nhập passkey. *(e2e)*
4. Admin đặt lại PIN, ngưng tài khoản, hoặc bấm "Gỡ Face ID" → passkey của tài khoản đó bị từ chối (`passkey_unknown`). *(e2e)*
5. Toàn bộ test hiện có và e2e `turnstile`, `admin`, `platform`, `maintenance` vẫn xanh, sau cả bước chuyển `auth` sang STRICT.
6. `audit_log` của ba mã mới không chứa `credential_id`. *(e2e)*
7. Bật passkey không có PIN hoặc sai PIN → 400/403. Sai PIN tính vào **cùng** bộ đếm (đủ 5 lần sai thì đăng nhập PIN của SĐT đó bị 429). *(e2e)*
8. Gỡ passkey hoặc "Gỡ tất cả" → phiên cũ trên máy khác 401 ở request kế tiếp; máy đang thao tác vẫn 200. *(e2e)*
9. Đặt PIN bằng Face ID:
   - thành công thì PIN cũ sai, PIN mới đúng, máy khác bị đăng xuất, máy hiện tại vẫn đăng nhập;
   - dùng thách thức `login` hoặc gửi lại lần hai → bị từ chối;
   - PIN yếu → 400;
   - passkey của người khác → bị từ chối. *(e2e)*
   - Tự đổi PIN thì passkey vẫn còn, trang "Tôi" hiện "Gỡ tất cả". *(Chrome)*
   - Lời mời có đúng chữ "Chỉ bật trên điện thoại riêng của bạn." *(Chrome)*
10. Cookie `td_webauthn` đặt vào chỗ `td_session` → 401. *(đơn vị + e2e)*
11. Passkey luôn báo bộ đếm 0 vẫn đăng nhập được nhiều lần. *(e2e)*

## 5. Điều chưa chắc (lát 0 trả lời)
- iPhone ở chế độ app cài có tạo và dùng được passkey không (cả khi passkey tạo ở tab Safari)?
- Có đòi Face ID nằm ngay trong lần chạm không?
- Cờ UV, `userHandle`, và giá trị bộ đếm thực tế trên iPhone.
- Mô phỏng chuyển hướng kiểu Google (ra khỏi app sang tên miền khác rồi về) có quay lại đúng cửa sổ app và giữ cookie không? Phần này chỉ ảnh hưởng lát 2.
