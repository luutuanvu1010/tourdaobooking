# ADR-0016 — Thêm cách đăng nhập nhanh song song PIN: passkey (Face ID/Touch ID) và Google (OIDC); Zalo để sau

- **Trạng thái:** **proposed** (AI soạn 2026-09-23, chờ chủ dự án duyệt). Sau khi accepted chỉ sửa trạng thái; thay đổi nội dung = ADR mới trỏ về ADR này.
  - Bản nháp đầu mang số 0015. Chủ dự án chốt số 0015 cho ADR "khung điều hướng dọc" (nhánh Trang chủ mới), nên ADR này đổi sang 0016 (2026-09-23).
  - Bản sửa 2026-09-23 (chiều) đã áp 5 câu trả lời của chủ ở **vòng nhận xét ADR**, khác với 5 câu trả lời vòng nghiên cứu ghi ở Bối cảnh. Chi tiết kỹ thuật đi kèm (bộ chống dò, "lần ký passkey mới", mục lưu ý ở điều 8) là AI suy ra cho khớp mã hiện có; chủ xác nhận khi duyệt: nhập lại PIN trước khi thêm chìa khoá (điều 2a); gỡ chìa khoá thì đăng xuất mọi máy (điều 6); lời mời có cảnh báo máy riêng (điều 2); đặt PIN mới bằng Face ID (điều 2b); số ADR.
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
- **Chỉ tạo khi đang đăng nhập, và phải nhập lại PIN ngay trước khi tạo** (xem điều 2a), ở "Tài khoản của tôi".
- **Lời mời sau lần đăng nhập bằng PIN đầu tiên** trên máy có hỗ trợ: app mời "Bật đăng nhập bằng Face ID?" (có nút "Để sau").
  - Lời mời ghi rõ **"Chỉ bật trên điện thoại riêng của bạn"**.
  - Lý do: passkey lưu vào tài khoản Apple của **chủ máy** và mở được bằng mật mã máy. Bật trên máy dùng chung thì ai biết mật mã máy cũng vào được tài khoản này.
  - Bấm "Bật" vẫn phải nhập lại PIN như điều 2a.
- **Đăng nhập một chạm, không cần gõ SĐT.**
  - Dùng khoá tìm được trên máy (discoverable credential).
  - Bắt buộc xác minh người dùng (`userVerification: "required"`, tức Face ID/Touch ID hoặc mật mã máy).
  - `rpId` = `booking.tourdao.vn`.
  - Chấp nhận thuật toán ES256 (-7) và RS256 (-257).
  - Không yêu cầu chứng thực nhà sản xuất (`attestation: "none"`).
- **Thách thức (challenge) không lưu D1.** Nó nằm trong cookie tạm ký HMAC, dùng một lần, hạn ngắn, giống cách `session.ts` đang ký. Route xin thách thức có giới hạn theo IP.
- **Mỗi tài khoản có nhiều passkey** (iPhone, máy tính…). Người dùng xem và gỡ được. Gỡ = đặt `valid_to`, không xoá cứng, **và đăng xuất mọi máy** (điều 6).

**2a. Thêm chìa khoá mới phải nhập lại PIN (chủ chốt 2026-09-23).**
- Áp cho cả "bật passkey" lẫn "liên kết Google".
- Lý do: nếu chỉ cần phiên đang mở, ai cầm được máy đang đăng nhập của người khác có thể gắn chìa khoá của mình. Người đó vẫn vào được sau khi nạn nhân đổi PIN.
- PIN nhập lại đi qua đúng bộ chống dò của đăng nhập (cùng bộ đếm theo SĐT và IP). Như vậy bước này không thành đường vòng để dò PIN.
- Ai quên PIN nhưng còn passkey thì đặt PIN mới theo điều 2b trước, rồi mới thêm chìa khoá.

**2b. Đặt PIN mới bằng Face ID, không cần PIN cũ (chủ chốt 2026-09-23).**
- Người có passkey còn hiệu lực đặt được PIN mới ở "Tài khoản của tôi" mà không cần PIN cũ, nếu **xác nhận Face ID ngay lúc đặt**.
- "Ngay lúc đặt" nghĩa là một lần ký passkey mới, với thách thức riêng cho việc đặt PIN. Chỉ "phiên hiện tại đã đăng nhập bằng passkey" là **không đủ**.
- Đây là cách giải "quên PIN" mà không phải nhờ admin.
- Đặt PIN mới như vậy cũng là đổi PIN (đẩy `credentials_changed_at`), nên các máy khác bị đăng xuất, còn máy hiện tại vẫn giữ đăng nhập (như đổi PIN hiện nay).

**3. Google (OIDC), lựa chọn phụ:**
- Luồng Authorization Code + PKCE, `state` + `nonce`, `response_mode=query`, bắt đầu bằng điều hướng GET. Chi tiết và bẫy ở nghiên cứu §5.3.
- **Liên kết chỉ khi đang đăng nhập và đã nhập lại PIN** (điều 2a), ghi `(issuer, sub) → staff_id`.
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
- **Gỡ chìa khoá thì đăng xuất mọi máy (chủ chốt 2026-09-23).**
  - Mọi lần gỡ passkey hoặc gỡ liên kết Google, do người dùng hay admin làm, đều đẩy `credentials_changed_at` của tài khoản.
  - Lý do: mất máy mà chỉ gỡ passkey thì máy đó vẫn còn phiên đăng nhập tới 7 ngày.
  - Người dùng tự gỡ thì máy đang thao tác được cấp phiên mới, giữ đăng nhập (như đổi PIN hiện nay).
- **"Đặt lại PIN" và "Đình chỉ" do admin làm sẽ gỡ luôn mọi passkey và liên kết Google** của tài khoản đó (chủ chốt 2026-09-23). Máy bị mất hoặc người bị nghi lộ thì chỉ cần một thao tác.
- **Người dùng tự đổi PIN thì không tự gỡ.** Sau khi đổi, app hiện danh sách passkey và liên kết Google, kèm nút "Gỡ tất cả" để người dùng tự quyết.

**7. Super Admin luôn giữ PIN.** Đường thoát khẩn hiện có (SQL ở `docs/HANDOFF-N1.md`) giữ nguyên. Cách mới không được là cách duy nhất vào tài khoản Super Admin.

**8. Nhật ký và bảo mật:**
- Chỉ ghi sự kiện (`passkey_added`, `passkey_removed`, `identity_linked`, `identity_unlinked`) kèm `staff_id`.
- **Không** ghi email, `sub`, id khoá hay token.
- Không thêm thư viện chạy lúc runtime; tự viết bằng Web Crypto, có test cho từng bước kiểm.
- CSP chỉ mở thêm đúng nguồn cần (nếu cần) cho Google. Dự kiến không cần: WebAuthn không tải gì ngoài; luồng Google bắt đầu bằng điều hướng GET. Kiểm lại với `public/_headers` lúc thi công.
- **Tách khoá ký.** Cookie tạm của thách thức (passkey) và của `state`/PKCE (Google) **không** được ký cùng khoá, cùng dạng với `td_session`.
  - Lý do: phiên hiện là `staffId.<thời điểm>.<chữ ký HMAC(SESSION_SECRET)>`. Một cookie tạm cùng khoá, cùng dạng ba phần có thể được chấp nhận như phiên đăng nhập.
  - Cách làm: khoá dẫn xuất riêng, hoặc tiền tố mục đích trong dữ liệu ký. Có test chứng minh token tạm bị `verifySessionToken` từ chối.
- **Không dùng Turnstile và bộ chống dò PIN** cho đăng nhập bằng passkey hoặc Google (không có PIN để dò). Route xin thách thức có giới hạn theo IP (điều 2). Bước nhập lại PIN ở điều 2a vẫn đi qua bộ chống dò.
- **Bộ đếm chữ ký.** Passkey đồng bộ iCloud thường luôn báo 0. Không từ chối khi bộ đếm là 0; chỉ coi là bất thường khi cả hai giá trị khác 0 mà giá trị mới không tăng.
- **`rpId` cố ý là `booking.tourdao.vn`, không phải `tourdao.vn`.** Website công khai là repo và Worker khác (CLAUDE.md §1); dùng tên miền gốc thì trang đó cũng xin ký passkey được.
- **Tên hiển thị của passkey không chứa SĐT** (hiện trong danh sách passkey của máy). `user.id` là giá trị ngẫu nhiên, không lộ thông tin cá nhân.
- **"Đăng nhập gần nhất" không còn chỉ ghi ở route đăng nhập PIN.** Khi thi công phải sửa cùng lúc `docs/SYSTEM-DESIGN.md` §4, `docs/CHANGE-GUIDE.md` công thức q và các chú thích trong mã nói điều tương tự (hiện ở `src/modules/staff/index.ts`, `src/modules/accounts/index.ts`).
- **Đẩy `credentials_changed_at` khi gỡ chìa khoá (điều 6)** cần một câu lệnh ghi mới trên bảng `staff`. Câu lệnh đó thuộc module `staff` (chỉ module chủ ghi bảng của mình, ADR-0002); module `auth` gọi qua `index.ts`. Câu tương ứng ở `CLAUDE.md` §10 chỉ được **đề xuất** sửa, chủ duyệt (N9).

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
  - Passkey trên iPhone lưu và đồng bộ qua tài khoản Apple của **chủ máy**, và mở được bằng Face ID **hoặc mật mã máy**. Nhân viên khác bật passkey trên máy dùng chung thì ai biết mật mã máy cũng vào được tài khoản đó.
    - Giảm nhẹ: cảnh báo "chỉ bật trên điện thoại riêng" cộng nhập lại PIN (điều 2, 2a).
    - Không chặn được bằng mã, nên phần còn lại **dựa vào kỷ luật**. Người dùng máy chung vẫn đăng nhập bằng PIN như cũ.
    - **Chuỗi rủi ro nặng hơn "vào được" (người kiểm độc lập nêu 2026-09-23):** passkey đã lỡ bật trên máy dùng chung thì người biết mật mã máy có thể:
      1. đặt PIN mới qua điều 2b mà không cần PIN cũ;
      2. dùng chính PIN mới đó để vượt bước nhập lại PIN ở điều 2a;
      3. gắn passkey hoặc Google của mình, tức **chiếm hẳn tài khoản**.
    - Điều 2a không chặn được chuỗi này vì kẻ đó biết PIN hợp lệ. Dấu hiệu duy nhất với nạn nhân là PIN của họ không còn đúng. Khi đó admin "Đặt lại PIN" gỡ hết chìa khoá và đăng xuất mọi máy (điều 6).
    - Chủ đã chấp nhận hai điều 2a và 2b; ghi ở đây để duyệt khi biết đủ. Muốn siết thêm thì cần quyết định mới, ví dụ báo cho người dùng khi PIN bị đặt lại qua Face ID.
  - Thêm một bước nhập PIN khi bật Face ID hoặc gắn Google (một lần mỗi chìa khoá).
- **Rủi ro còn mở:**
  - Hành vi thật trên iPhone chưa thử (lát 0).
  - Thử passkey cần tên miền https đúng `rpId`, nên không thử được trên IP LAN của `dev-iphone.mjs`. Cần một địa chỉ https tạm; cách làm chốt ở kế hoạch, và mọi thao tác triển khai do chủ chạy.

## Tiêu chí kiểm khi thi công (chi tiết ở đặc tả)

1. Tạo passkey khi đang đăng nhập → đăng xuất → "Đăng nhập bằng Face ID" vào đúng tài khoản, `td_session` được cấp, "Đăng nhập gần nhất" cập nhật.
2. Chữ ký sai, sai `rpId`/origin, thách thức cũ hoặc dùng lại, không có cờ xác minh người dùng, passkey đã gỡ, tài khoản `active = 0` → đều bị từ chối (test đỏ trước, xanh sau).
3. Bảo trì bật và SĐT không được phép → 503 `maintenance` qua cả passkey lẫn Google.
4. Admin đặt lại PIN hoặc đình chỉ → passkey và liên kết của tài khoản đó hết hiệu lực.
5. Toàn bộ test và e2e của luồng PIN giữ nguyên hành vi.
6. Nhật ký không chứa email, `sub`, id khoá, token.
7. Thêm passkey hoặc liên kết Google khi không nhập lại PIN, hoặc nhập sai PIN → bị từ chối. Nhập sai tính vào cùng bộ đếm chống dò của đăng nhập.
8. Gỡ passkey hoặc liên kết Google (người dùng hoặc admin) → phiên trên các máy khác của tài khoản đó bị từ chối ở request kế tiếp. Người dùng tự gỡ thì máy đang thao tác vẫn đăng nhập.
9. Đặt PIN mới không cần PIN cũ: thành công với một lần xác nhận passkey mới, đúng thách thức "đặt PIN". Sau đó các máy khác bị đăng xuất, máy hiện tại vẫn đăng nhập. Bị từ chối nếu chỉ có phiên mà không có lần xác nhận đó, hoặc nếu dùng lại thách thức của lần đăng nhập.
   - Người dùng tự đổi PIN: passkey và liên kết Google **vẫn còn hiệu lực**; màn hình hiện danh sách kèm "Gỡ tất cả", bấm thì gỡ hết và áp tiêu chí 8.
   - Lời mời "Bật đăng nhập bằng Face ID?" có câu "Chỉ bật trên điện thoại riêng của bạn" (kịch bản Chrome kiểm chữ).
10. Cookie tạm (thách thức, `state`) đặt vào chỗ `td_session` → không được coi là phiên đăng nhập.
11. Passkey báo bộ đếm 0 ở mọi lần ký vẫn đăng nhập được.
