# Đặc tả: Xác thực hai lớp (2FA) khi đăng nhập

- **Trạng thái:** BẢN NHÁP — chờ chủ dự án duyệt. Chưa viết mã.
- **Ngày:** 2026-10-01 · **Gốc nhánh:** `main` @ `fd77987a` (đã có `0056_gop_ho_so`) · **Nhánh:** `worktree-dac-ta-2fa`
- **Quyết định kiến trúc đi kèm:** bản nháp ADR-0071 ở `docs/superpowers/specs/2026-10-01-adr-0071-xac-thuc-hai-lop.md` (chưa đưa vào `docs/adr/`).
- **Xây trên lỗ đang hở:** không — `docs/quyen-hoan.json` mục `phat_hien` rỗng ngày 2026-10-01.
- **Loại việc:** việc lớn (quyền truy cập + dữ liệu + bí mật + chi phí gửi tin) → thi công xong phải có người kiểm độc lập chỉ đọc (CLAUDE.md §3).

## 1. Chủ dự án đã chốt (2026-10-01)

| Câu | Chủ chọn |
|---|---|
| Ai phải dùng | **Bắt buộc với nhân viên nội bộ**; tài khoản bên ngoài (Đối tác, Tài xế đối tác) **tự chọn bật** |
| Hỏi mã lúc nào | **Chỉ khi đăng nhập bằng PIN trên máy chưa được tin**; máy được tin **30 ngày**; **Face ID được miễn** |
| Kênh | **Đợt 1: ứng dụng xác thực (Google Authenticator và tương tự) + Email; Đợt 2: Zalo ZNS** |
| Khôi phục | **10 mã dự phòng dùng một lần + Quản trị/Toàn quyền tắt lớp hai cho người đó** (có nhật ký) |

## 2. Hiện trạng (đọc mã 2026-10-01)

- Mọi tài khoản (≈30 nhân viên, ≈1000 tài khoản bên ngoài) là một dòng `staff`, đăng nhập bằng SĐT + PIN 6 số (`POST /api/auth/login`, `src/modules/auth/index.ts:120`) hoặc Face ID (`/api/auth/passkey/login`, `:140`; passkey bắt `userVerification: "required"` — tức đã là hai yếu tố: máy + sinh trắc).
- Chống dò: bảng `login_attempt`, 5 lần/15 phút theo SĐT, 30 theo IP (`throttle.ts`). Turnstile trước PIN. Bảo trì chặn trước PIN.
- Phiên: cookie `td_session` = `staffId.iat.HMAC(SESSION_SECRET)`, 7 ngày, không có bảng phiên; thu hồi qua `staff.credentials_changed_at`.
- **Nơi cấp phiên MỚI** (từ trạng thái chưa đăng nhập): chỉ 2 — đăng nhập PIN (`auth/index.ts:136`) và Face ID (`:176`). Bốn nơi khác (`accounts/index.ts:192, 275, 291, 328`) chỉ **cấp lại** cho người đã có phiên (đổi PIN, gỡ Face ID, đặt PIN bằng Face ID).
- Gửi email: binding `EMAIL` (Cloudflare Email Service, beta) đang dùng cho Góp ý; **chưa từng kiểm trên production** gửi tới địa chỉ bất kỳ được không (xem §9, R1).
- Không có gì về OTP/TOTP/Zalo. `staff` không có cột email; email liên hệ nằm ở `pty_contact_point` (hồ sơ).

## 3. Định nghĩa

- **Nhân viên nội bộ** = tài khoản đang giữ **ít nhất một quyền không thuộc `EXTERNAL_PERMISSIONS`** (`src/shared/permissions.ts:29`). Không viết danh sách tay: thêm quyền nội bộ mới thì tự động thuộc diện bắt buộc.
- **Yếu tố thứ hai** (đợt 1): `TOTP` (ứng dụng xác thực, RFC 6238, 6 số, bước 30 giây, cho lệch ±1 bước) và `EMAIL` (mã 6 số gửi email, sống 10 phút).
- **Máy được tin**: trình duyệt/app đã qua lớp hai thành công và chọn "tin máy này"; được bỏ qua **chỉ lớp hai**, **không bao giờ bỏ qua PIN**.
- **Mã dự phòng**: 10 mã, mỗi mã dùng một lần, thay cho yếu tố thứ hai.

## 4. Luồng

### 4.1 Đăng nhập PIN
1. Như cũ: kiểm dữ liệu → Turnstile → bảo trì → PIN có chống dò.
2. PIN đúng. Nếu tài khoản **không cần lớp hai** (bên ngoài, chưa bật) **hoặc** cookie máy được tin hợp lệ → cấp phiên như cũ.
3. Ngược lại → **không cấp `td_session`**; trả `200 { next: "mfa", factors: ["TOTP","EMAIL"], emailMask: "t***@gmail.com" }` + cookie chờ `td_mfa_pending` (5 phút).
4. Trang đăng nhập hiện ô nhập mã (ô 16px, `inputmode=numeric`, `autocomplete=one-time-code`), nút "Gửi mã qua email" (nếu có yếu tố email), liên kết "Dùng mã dự phòng", ô chọn "Tin máy này 30 ngày" (mặc định bật).
5. `POST /api/auth/mfa/verify` → đúng: cấp `td_session` (+ `td_trusted` nếu chọn), xoá cookie chờ; sai: 401 lời thường; quá hạn mức: 429.

### 4.2 Đăng nhập Face ID
Không đổi, không hỏi lớp hai (đã là hai yếu tố). **Bật Face ID chỉ làm được khi đã có phiên** — tức đã qua lớp hai — nên Face ID không thành đường vòng.

### 4.3 Bật lớp hai (trang "Tài khoản của tôi" → "Bảo mật đăng nhập")
- **TOTP**: máy chủ sinh khoá bí mật → hiện mã QR (dựng phía trình duyệt từ chuỗi `otpauth://`, không gọi dịch vụ ngoài) + chuỗi để gõ tay → người dùng nhập mã đúng một lần mới lưu.
- **Email**: người dùng gõ địa chỉ → máy chủ gửi mã → nhập đúng mới lưu. Địa chỉ này thuộc module `auth`, **không** đọc từ liên hệ hồ sơ (xem ADR-0071 điều 4).
- Bật yếu tố đầu tiên → hiện **10 mã dự phòng một lần duy nhất** (nút Chép / Tải tệp .txt); có nút "Tạo bộ mới" (huỷ bộ cũ).
- Đổi hoặc gỡ một yếu tố khi đã có yếu tố khác → phải nhập mã của một yếu tố hiện có. Nhân viên nội bộ không gỡ được yếu tố cuối cùng.

### 4.4 Đưa vào dùng (nhân viên đang chạy app) — **chờ chủ chọn (Q1)**
Khuyến nghị: **ân hạn 14 ngày**. Trong ân hạn, nhân viên đã đăng nhập thấy dải nhắc ở Trang chủ và tự bật khi **đang trong phiên cũ** (không ai cầm PIN lạ chen vào được). Sau hạn, nhân viên chưa bật mà đăng nhập PIN → bị chặn, lời nhắn "Liên hệ Quản trị để bật bảo mật đăng nhập"; Quản trị bật giúp bằng luồng §4.5 (người đó ngồi cạnh, quét QR trên máy mình).

### 4.5 Quản trị tắt / khởi tạo lại lớp hai cho người khác
- Mở rộng màn đặt lại PIN hiện có (ADR-0042): nút "Tắt bảo mật hai lớp" → huỷ mọi yếu tố, mã dự phòng, máy được tin của người đó; đặt `credentials_changed_at` (đá mọi phiên); ghi nhật ký `mfa_reset` (chỉ id người làm, id người bị đặt lại — không email, không mã).
- Sau khi bị tắt, nhân viên nội bộ có **24 giờ** để bật lại ở lần đăng nhập PIN kế tiếp (chỉ được vào trang bật lớp hai, không vào app); quá 24 giờ phải nhờ Quản trị lần nữa.
- **Ai được tắt của ai — chờ chủ chọn (Q2).**

## 5. Dữ liệu (migration `0057_aut_xac_thuc_hai_lop.sql`, chỉ thêm bảng)

| Bảng | Cột chính | Ghi chú |
|---|---|---|
| `aut_mfa_factor` | `id`, `staff_id`, `kind` (`TOTP`/`EMAIL`, CHECK), `secret_enc` (TOTP: khoá mã hoá AES-GCM), `email` (EMAIL), `last_totp_step` (chống dùng lại), `valid_from_at`, `valid_to_at`, `created_at` | Không xoá cứng; gỡ = đặt `valid_to_at`. Tối đa một dòng hiệu lực mỗi `kind` mỗi người (chỉ mục duy nhất có điều kiện). |
| `aut_mfa_recovery_code` | `id`, `staff_id`, `code_hash` (SHA-256 + muối), `batch_id`, `used_at`, `revoked_at` | Tạo bộ mới = đặt `revoked_at` cho bộ cũ. |
| `aut_mfa_email_code` | `id`, `staff_id`, `factor_id` hoặc `pending_email_hash`, `code_hash`, `expires_at`, `attempts`, `used_at` | Mã email; sống 10 phút, tối đa 5 lần nhập. |
| `aut_trusted_device` | `id`, `staff_id`, `token_hash`, `label` (vd "iPhone · Safari", từ User-Agent rút gọn), `created_at`, `last_used_at`, `expires_at`, `revoked_at` | Cookie `td_trusted` mang token ngẫu nhiên 32 byte; DB chỉ giữ băm. |
| `staff` (cột mới) | `mfa_grace_until` (TEXT ISO, null) | Hạn ân hạn / 24 giờ sau khi bị tắt. Cột thêm, không phá vỡ. |

- Bí mật mới: `MFA_ENCRYPTION_KEY` (32 byte, base64) — chủ tự đặt bằng `npx wrangler secret put MFA_ENCRYPTION_KEY`; local ở `.dev.vars`. Thiếu khoá → máy chủ **từ chối bật TOTP** (503 lời thường), không lưu khoá thô.
- Cập nhật `docs/data-dictionary.json` + `npm run dict`.

## 6. Quy tắc an toàn (bắt buộc, có test)

1. **Cookie chờ không phải phiên.** `td_mfa_pending` ký bằng khoá dẫn xuất riêng (HMAC với nhãn mục đích `"mfa-pending"`), định dạng khác `td_session`; `verifySessionToken` phải từ chối nó (test). TTL 5 phút. Chỉ mở được `/api/auth/mfa/*`.
2. **Hạn mức theo tài khoản, không theo cookie chờ** (người có PIN tự tạo được cookie chờ mới): dùng `login_attempt` với khoá `mfa:<staffId>` — 5 lần sai/15 phút thì 429; khoá `mfa-mail:<staffId>` — tối đa 3 email/15 phút. Mã TOTP đã dùng (≤ `last_totp_step`) bị từ chối.
3. **Máy được tin bị thu hồi** khi: đổi PIN, Quản trị đặt lại PIN, Quản trị tắt lớp hai, người dùng bấm "Quên mọi máy", hoặc hết 30 ngày. Kiểm cả `credentials_changed_at > created_at`.
4. **Hai nơi cấp phiên mới** (PIN, Face ID) đi qua một hàm duy nhất `issueLoginSession(...)` có cổng lớp hai; test kiến trúc quét `src/` để mọi lời gọi `newSessionCookie` mới ngoài danh sách cho phép (4 nơi cấp lại đã có phiên + Face ID + hàm cổng) làm đỏ — kiểu `src/giay-to-khong-lo-so.test.ts`.
5. **Không lộ:** mã, khoá TOTP, email đầy đủ, mã dự phòng không vào nhật ký, câu báo lỗi, DTO (email chỉ hiện dạng che `t***@gmail.com`). Thêm ca vào test không-lộ.
6. **Bảo trì:** `/api/auth/mfa/verify` và `/api/auth/mfa/email` là route công khai → tự gọi `maintenanceBlock` như Face ID.
7. **Chống dò tài khoản:** câu trả lời của bước lớp hai giống nhau cho mọi lỗi mã (không nói "mã email hết hạn" khác "mã sai" ra ngoài ý cần thiết cho người dùng — chấp nhận nói "Mã đã hết hạn, gửi lại mã mới" vì người hỏi đã qua PIN).
8. **Email đi ngoài lô ghi** (Hiến chương 5.16): ghi dòng mã trước, gửi sau; gửi lỗi → báo "Chưa gửi được email, thử lại hoặc dùng cách khác", không lộ lỗi nhà cung cấp.

## 7. Giao diện (theo `web/CLAUDE.md`)

- Trang đăng nhập: bước 2 "Nhập mã xác thực" thay form PIN, cùng khung; dựng bằng `h()`, token CSS, ô 16px; mọi chữ tiếng Việt có dấu.
- "Tài khoản của tôi" → khối "Bảo mật đăng nhập": trạng thái (đã bật / chưa bật / hạn bật), danh sách yếu tố, mã dự phòng còn lại (số lượng), danh sách máy được tin + "Quên máy này" / "Quên mọi máy".
- Màn quản lý tài khoản (Quản trị): cột/nhãn "Hai lớp: Đã bật / Chưa bật (hạn dd/mm)"; nút tắt lớp hai trong hộp đặt lại.
- Thư viện QR: **không thêm dependency runtime** — viết bộ mã QR nhỏ trong `web/` hoặc nhúng mã nguồn một bộ mã QR giấy phép MIT đã đọc (quyết định ở kế hoạch, bề mặt).
- Trợ giúp + hướng dẫn theo vai: thêm mục "Bật bảo mật hai lớp" (cách cài Google Authenticator, cất mã dự phòng).

## 8. Đợt 2 — Zalo ZNS (chỉ điều kiện tiên quyết, chưa thiết kế mã)

Việc **phía chủ** trước khi làm:
1. Có Zalo Official Account của Công ty TNHH Tour Đảo, đã xác minh doanh nghiệp.
2. Đăng ký ZNS, tạo và chờ Zalo duyệt **mẫu tin OTP** (mẫu loại xác thực).
3. Nạp tiền / chấp nhận phí mỗi tin (giá theo bảng của Zalo tại thời điểm đăng ký — chưa kiểm).
4. Cấp ứng dụng Zalo + khoá truy cập (token làm mới định kỳ) → bí mật đặt qua `wrangler secret put`.

Lưu ý thiết kế cho đợt 2: SĐT đăng nhập **có thể không phải** SĐT Zalo của người đó (ADR-0001) → yếu tố `ZALO` phải được xác nhận bằng mã lúc bật giống email; ZNS chỉ gửi được tới SĐT có Zalo. Một ADR/sửa ADR riêng khi làm.

## 9. Rủi ro và điều chưa kiểm

- **R1 — Email có gửi tới địa chỉ bất kỳ không: CHƯA KIỂM.** Binding Cloudflare kiểu cũ chỉ gửi tới địa chỉ đã xác minh trong Email Routing; Email Service mới gửi rộng sau khi xác minh tên miền. Kế hoạch phải có **task 0** kiểm điều này (trên máy local/staging, không ghi production). Để email không chặn cả đợt, **thứ tự phát hành: TOTP + mã dự phòng trước, email sau** (cùng đợt 1, có thể khác bản).
- **R2 — Mạnh bằng yếu tố yếu nhất:** ai bật cả TOTP lẫn email thì kẻ chiếm được hộp thư là đủ. Câu Q4.
- **R3 — Phiên cũ 7 ngày** vẫn sống sau phát hành, không qua lớp hai. Câu Q3.
- **R4 — Lệch đồng hồ điện thoại:** cho ±1 bước (±30 giây); lời nhắc "kiểm giờ tự động trên điện thoại" khi sai nhiều lần.
- **R5 — Quản trị vừa đặt lại PIN vừa tắt lớp hai** = chiếm được tài khoản người khác (đã đúng với PIN hôm nay). Câu Q2.

## 10. Câu hỏi chờ chủ (đụng quyền truy cập — không tự chọn)

- **Q1 — Đưa vào dùng:** (A, khuyến nghị) ân hạn 14 ngày tự bật trong phiên, sau hạn chặn và nhờ Quản trị · (B) bắt bật ngay ở lần đăng nhập PIN kế tiếp (nhanh, nhưng ai cầm PIN lúc đó sẽ bật được Authenticator của họ) · (C) chỉ Quản trị bật giúp từng người.
- **Q2 — Ai tắt lớp hai của ai:** (A, khuyến nghị) Quản trị tắt cho người không giữ Quản trị/Toàn quyền; chỉ Toàn quyền tắt cho Quản trị và Toàn quyền khác; không ai tự tắt của mình qua đường này · (B) Quản trị và Toàn quyền tắt cho mọi người (giống đặt lại PIN hôm nay).
- **Q3 — Phiên đang mở lúc phát hành:** (A, khuyến nghị) giữ nguyên, hết 7 ngày tự đăng nhập lại (kèm ân hạn Q1) · (B) đá mọi phiên nhân viên nội bộ ngay khi hết ân hạn.
- **Q4 — Email cho Quản trị/Toàn quyền:** (A, khuyến nghị) Quản trị, Toàn quyền, Kế toán chỉ dùng ứng dụng xác thực (email không được làm yếu tố của họ) · (B) ai cũng được dùng email.

## 11. Tiêu chí nghiệm thu (hành vi kiểm được)

1. Nhân viên nội bộ đã bật lớp hai, đăng nhập PIN đúng trên máy lạ → **không** nhận `td_session`; nhận `next:"mfa"`. (e2e)
2. Nhập mã TOTP đúng → có phiên; nhập lại chính mã đó lần nữa (bước cũ) → 401. (thuần + e2e)
3. 5 lần mã sai trong 15 phút → 429, kể cả khi mỗi lần dùng cookie chờ mới. (e2e)
4. Cookie `td_mfa_pending` đưa vào route cần phiên → 401. (thuần)
5. Chọn "tin máy này" → lần đăng nhập PIN sau trên máy đó không hỏi mã; sau khi đổi PIN → lại hỏi. (e2e)
6. Face ID đăng nhập không bị hỏi mã. (e2e)
7. Tài khoản chỉ có `PARTNER` chưa bật → đăng nhập như cũ; tự bật được; đã bật thì bị hỏi mã. (e2e)
8. Mã dự phòng dùng được đúng một lần. (thuần + e2e)
9. Quản trị tắt lớp hai → mọi phiên + máy được tin của người đó mất hiệu lực; nhật ký có `mfa_reset` không chứa email/mã. (e2e)
10. Nhật ký, câu lỗi, DTO không chứa khoá TOTP, mã, email đầy đủ. (test không-lộ)
11. Thêm một lời gọi `newSessionCookie` mới ngoài danh sách cho phép → test kiến trúc đỏ. (đã quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, ghi ngày)
12. Bảo trì bật → `/api/auth/mfa/verify` trả 503 cho SĐT ngoài danh sách. (e2e)
13. `docs/SO-HANG-RAO.md` có dòng cho hàng rào lớp hai và hàng rào "nơi cấp phiên", kèm ngày quan sát chặn thật.
14. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` xanh; kịch bản Chrome: bật TOTP, đăng nhập 2 bước, mã dự phòng.
15. Người kiểm độc lập (chỉ đọc) báo ĐẠT.

## 12. Ngoài phạm vi

Zalo ZNS (đợt 2), SMS, khoá bảo mật phần cứng riêng (đã có passkey), đăng nhập Google (ADR-0016 lát 2 — chỉ ghi luật áp dụng trong ADR-0071 điều 6), tự khôi phục PIN.

## 13. Trang ghép (CLAUDE.md §9 — lượt duyệt này có 3 quyết định chạm quyền/dữ liệu)

**Các quyết định trong lượt:** (1) ADR-0071 luật lớp hai + yếu tố + máy được tin; (2) mở rộng ADR-0042: đặt lại có thêm "tắt lớp hai"; (3) ghi luật cho ADR-0016 lát 2: đăng nhập Google chịu lớp hai như PIN.

**(1) Bảng nào chứa gì:**
| Bảng | Loại thực thể |
|---|---|
| `aut_mfa_factor`, `aut_mfa_recovery_code`, `aut_mfa_email_code`, `aut_trusted_device` | Chỉ thuộc **tài khoản đăng nhập** (`staff`), cả nội bộ lẫn bên ngoài. Không chứa hồ sơ khách/đối tác. |
| `staff` (+`mfa_grace_until`) | Tài khoản đăng nhập (như cũ). |
| `login_attempt` (+khoá `mfa:`, `mfa-mail:`) | Bộ đếm lần thử (như cũ, thêm tiền tố). |

**(2) Dòng bản đồ quyền chạm các bảng này:**
| Thao tác | Ai | Áp cho loại tài khoản |
|---|---|---|
| Bật/gỡ yếu tố, tạo mã dự phòng, quên máy — **của chính mình** | Mọi tài khoản có phiên (tự phục vụ, ngoại lệ có ghi trong `docs/quyen-hoan.json` như các route `/api/account/*` hiện có) | Nội bộ + bên ngoài |
| Xem trạng thái "đã bật/chưa bật" của người khác | Người có quyền xem quản lý tài khoản hiện nay | Theo phạm vi màn quản lý tài khoản hiện có |
| Tắt lớp hai của người khác | Theo Q2 | Theo Q2 |
| Xác minh mã lúc đăng nhập | Công khai (có cookie chờ) | Mọi tài khoản đang ở bước 2 |

**(3) Cổng nào canh cửa nào:**
| Cửa | Cổng |
|---|---|
| Cấp phiên mới bằng PIN | Turnstile → bảo trì → chống dò PIN → **cổng lớp hai** (máy được tin hoặc mã) |
| Cấp phiên mới bằng Face ID | bảo trì → hạn mức thách thức → passkey `userVerification: required` (không cổng lớp hai) |
| Cấp lại phiên (đổi PIN, gỡ Face ID, đặt PIN bằng Face ID) | Phiên hiện có (đã qua lớp hai hoặc Face ID) |
| Bước 2 (`/api/auth/mfa/*`) | bảo trì → cookie chờ (khoá riêng, 5 phút) → hạn mức theo tài khoản |
| Đăng nhập Google (tương lai) | như PIN: **cổng lớp hai** |
