# HANDOFF — N1 (nền danh tính: hồ sơ, địa điểm, quyền app)

Đặc tả: `docs/superpowers/specs/2026-09-20-n1-nen-danh-tinh-data-model.md` (đã duyệt 2026-09-20). ADR: `docs/adr/ADR-0001…0008`. Kế hoạch: `docs/superpowers/plans/2026-09-20-n1-a-nen-du-lieu.md` và `…-n1-b-chuyen-quyen.md`.

## TRẠNG THÁI TRIỂN KHAI — lần phát hành 1 ĐÃ LÊN PRODUCTION (2026-09-21, theo lệnh của chủ dự án)
A1 + N1 (lần 1) + A2 đi cùng MỘT lần phát hành, đúng điều kiện ở mục "Điều kiện TRƯỚC khi triển khai". Không còn việc "triển khai lần 1" nào phải làm; các mục bên dưới giữ lại để tra cứu và cho lần 2.
- **Mã:** `main` @ `9b4ad33`. **Worker:** phiên bản `a625adc4-43df-4e67-ac8e-f619aa98732b` tại `booking.tourdao.vn` (phiên bản ngay trước đó: `0b13b279-b0c2-4032-8cb1-5a3c1c83b593`, 2026-09-19). **D1:** đã áp `0008…0012` (trước đó `0001…0007`); `migrations list --remote` báo "No migrations to apply".
- **Cổng đã chạy TRƯỚC khi áp:** D1 có 3 đơn, 10 tài khoản, 8 dòng tiền; cổng chỉ-đọc `full_name`/`created_at` (mục "Cổng bổ sung" §1) trả **0 dòng**; điểm khôi phục Time Travel đã ghi: `000000ca-00000000-000050ec-d2515812ba718f70d7ec57f18973c50a` (lệnh khôi phục: `npx wrangler d1 time-travel restore tourdao-sales-db --bookmark=<điểm này>`); trên `9b4ad33`: `npm test` 236/236, `npm run typecheck` mã thoát 0, `npm run test:e2e` 10/10 + `audit-invariants` xanh.
- **Kết quả SAU khi deploy (chỉ đọc):** `node scripts/audit-invariants.mjs --db remote` — mọi bất biến đạt (kể cả `PRAGMA foreign_key_check` chạy được trên remote); backfill: 8 địa điểm, 10 hồ sơ = 10 tài khoản (0 tài khoản thiếu `party_id`), 10 quyền đang hiệu lực (1 ADMIN), 3 đơn còn nguyên; `order_service` có 8 dòng vì `0008` chuyển MỖI dòng tiền cũ thành một dịch vụ "nhập tay" (đơn cũ vẫn hiển thị đúng); các trang `/`, `/order-form`, `/order`, `/parties`, `/locations`, `/staff`, `/catalog` trả 200; `/sw.js` là `no-store`; `/api/auth/me` chưa đăng nhập trả 401.
- **CHƯA làm / còn mở:**
  1. Bước "Thử tay" (mục Triển khai, bước 4) và §3 "gọi API thật" — cần đăng nhập ADMIN, việc của chủ dự án (kèm tạo một hồ sơ thử: đó là thao tác GHI, chỉ làm khi đã chắc không hoàn tác).
  2. **Cửa sổ đóng băng thao tác tài khoản/quyền/hồ sơ VẪN HIỆU LỰC** cho tới khi chủ dự án chắc không hoàn tác (mục "Hoàn tác"). Hoàn tác Worker về `0b13b279-…` chỉ an toàn nếu chưa có tài khoản/quyền/hồ sơ nào được tạo hay sửa dưới mã mới.
  3. Quyết định 4(a)/(b)/(c) chưa được chọn. Vì `0011` ĐÃ áp lên remote, phương án 4(a)(ii) (trigger) nay cần MỘT MIGRATION MỚI (không tái sinh `0011` được nữa); (i) và (iii) không đổi.
  4. Chữ ký duyệt thị giác A2 chưa được ghi vào `docs/evidence/2026-09-20-a2/README.md` (chủ dự án ra lệnh triển khai nhưng chưa ghi ngày/người ký/điểm cần sửa).
  5. ~~Gói Workers~~ — **ĐÃ GIẢI QUYẾT 2026-09-21:** chủ dự án xác nhận Cloudflare Worker đang ở gói **trả phí**. Đơn cỡ tối đa (`MAX_SERVICES` 20 × `MAX_LINES_PER_ORDER` 50) cần khoảng 78 câu D1 trong một request tạo và khoảng 83 khi sửa (đếm cả request; xem `docs/SYSTEM-DESIGN.md` §12) — nằm xa giới hạn của gói trả phí, không cần hạ hằng nào.

## Đã có sau N1 (lần phát hành 1)
- Migration `0009…0012` (chỉ thêm — mã cũ vẫn chạy): `v_ord_order_label`, `loc_*` (8 địa điểm), `pty_*` (hồ sơ, liên hệ, vai trò theo nơi, quan hệ), `stf_*` + `staff.party_id` + backfill hồ sơ/quyền cho tài khoản có sẵn.
- API: `/api/parties*`, `/api/locations*`, `PUT /api/staff/:id/permissions`; `POST /api/staff` nhận `permissions[]` (thay `role`).
- Quyền theo bản đồ ADR-0007 ở `src/shared/permissions.ts`; router có `access: "office"`. Tài khoản chỉ-FIELD bị chặn mọi route đơn/tiền/hồ sơ (màn hình "việc của tôi" của họ thuộc N2 — hiện họ đăng nhập được nhưng không có mục nào).
- Trang web: `/parties` (Hồ sơ), `/locations` (Địa điểm), `/staff` (chọn quyền thay vai trò). Vào được từ thanh điều hướng trên (máy tính) và từ mục liên kết của tab Tôi (điện thoại); chưa có thiết kế điện thoại riêng cho hai trang mới (thuộc A2/N2). Hai trang mới đã khai trong `PAGES` của `src/shared/sw-policy.ts` (service worker chỉ cache khung tĩnh, không bao giờ cache `/api`).
- Kiểm máy: `src/architecture.test.ts`, `docs/data-dictionary.json`, `scripts/audit-invariants.mjs` (xem `docs/ARCHITECTURE.md`).

## Đã có trong nhánh bản v1.0 (CHƯA lên production — đi sau lần phát hành 1)
- Migration `0013_company_email` (chỉ dữ liệu: điền email công ty) và `0014_dispatch` (`dsp_*`, view `v_dsp_order_handler`, backfill người phụ trách = người lập cho mọi đơn hiện có). Cả hai chỉ THÊM — mã cũ vẫn chạy (không đọc `dsp_*`).
- Module `company` (`GET /api/company`, công khai, chỉ đọc); màn đăng nhập hiện khối thông tin công ty và dòng phiên bản (`src/shared/app-info.ts`).
- Cloudflare Turnstile ở đăng nhập: máy chủ (`src/modules/auth/turnstile.ts`, `GET /api/auth/config`, 403 `turnstile_failed` / 503 `turnstile_unavailable`, kiểm TRƯỚC bộ chống dò PIN), widget ở `web/login.ts`, CSP cho Cloudflare ở `public/_headers`. BẬT khi có `TURNSTILE_SECRET_KEY`, TẮT khi vắng.
- Module `dispatch` (phía máy chủ): người phụ trách đơn — `GET /api/dispatch/handlers`, `GET /api/dispatch/assignees`, `PUT /api/orders/:id/handler`; người phụ trách sửa được đơn (`ctx.isAssigned`), thao tác `dispatch.claim`; `audit-invariants` thêm R-DSP-1/2a/2b/3. (Giao diện người phụ trách: xem `CLAUDE.md` §9.)
- Xác nhận đơn dạng PNG: mô hình chữ thuần (`src/shared/order-confirmation.ts`), bộ vẽ canvas và hộp thoại ở trình duyệt (`web/confirmation-*.ts`), hiện sau khi tạo đơn.
- e2e 13 kịch bản (thêm `company`, `turnstile`, `dispatch` so với 10 của lần phát hành 1).

## Điều kiện TRƯỚC khi triển khai
- **A2 (giao diện đơn) đã xong về mã (2026-09-20): `tsc -p web` = 0 lỗi; bằng chứng ở `docs/evidence/2026-09-20-a2/`.** Còn MỘT cổng: chủ dự án ký duyệt thị giác (mục "Ký duyệt thị giác" trong `docs/evidence/2026-09-20-a2/README.md`) — **chưa ký thì chưa triển khai**. Nhánh chứa A1 (đơn có `services[]`): triển khai chỉ N1 mà thiếu A2 thì giao diện đơn hỏng trên production, nên A1, N1 và A2 đi cùng một lần phát hành. `web/trip-sheet.ts`, `web/order-form.ts` và `web/order.ts` KHÔNG có kiểm tự động trong repo — sửa các tệp này thì PHẢI chạy lại ba kịch bản `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`.
- Chủ dự án chạy (chỉ đọc) và ghi lại kết quả: `npx wrangler d1 migrations list tourdao-sales-db --remote` (xem `0008` đã áp chưa) và `npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT count(*) AS orders FROM orders"`.
- Ghi điểm khôi phục D1 Time Travel trước khi áp: `npx wrangler d1 time-travel info tourdao-sales-db`.

## Triển khai — HAI lần phát hành (expand–contract)
`wrangler d1 migrations apply` áp MỌI migration chưa áp, nên migration siết B5 (`staff_party_required`) KHÔNG được nằm trong `migrations/` ở lần 1 — và chưa được có mặt ở lần phát hành v1.0 (mục "Lần phát hành v1.0" bên dưới). **Số của B5 là số KẾ TIẾP sau `0014` (dự kiến `0015`)**: `0013` = `company_email` và `0014` = `dispatch` đã có trong nhánh v1.0 (cả hai chỉ THÊM). Trước khi đặt tên migration mới, kiểm lại `migrations/` và `docs/superpowers/plans/`.

**Lần 1 (mở rộng):**
1. Chạy BA lệnh riêng, ghi lại kết quả của từng lệnh (không nối bằng `&&`): (a) `npm test` — kỳ vọng toàn bộ đạt; (b) `npm run typecheck` — **phải là 0 lỗi lúc triển khai** (A2 đã đưa lỗi của `tsc -p web` về 0); (c) `npm run test:e2e` (cần mạng) — kỳ vọng `E2E: 13/13 kịch bản xanh` (số kịch bản THẬT của bản hiện tại: `platform`, `pwa`, `orders`, `trip`, `admin`, `turnstile`, `catalog`, `dispatch`, `admin-race`, `locations`, `parties`, `permissions`, `company`; ba kịch bản `turnstile`, `dispatch`, `company` là của bản v1.0 — lúc lần 1 lên production con số là 10/10, xem "TRẠNG THÁI TRIỂN KHAI") và bước cuối `audit-invariants --strict` xanh.
2. `npm run db:migrate:remote` (áp `0008` nếu chưa, rồi `0009…0012`), **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc (khoảng giữa chỉ tính bằng phút: tài khoản do mã cũ tạo lúc đó chưa có hồ sơ/quyền — hiện nhãn "(chưa có hồ sơ)", đơn của họ không biến mất, họ bị từ chối theo mặc định cho tới khi B5 `staff_party_required` — số kế tiếp SAU `0014`, dự kiến `0015` — backfill). Trong khoảng giữa này — **và tiếp tục sau khi triển khai, cho tới khi chắc chắn không hoàn tác nữa** — KHÔNG tạo tài khoản, KHÔNG đổi tên / SĐT đăng nhập / ngưng / kích hoạt tài khoản, KHÔNG đổi quyền, KHÔNG tạo-sửa hồ sơ (lý do và hệ quả: mục "Hoàn tác" ngay dưới).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`: còn cảnh báo "chưa có hồ sơ" là đúng nếu có tài khoản khoảng giữa). Mọi dòng `✗` là vi phạm thật. Lệnh này chỉ chạy được SAU khi đã áp `0009…0014` (bản hiện tại của script kiểm cả `pty_*`/`stf_*` của `0009…0012` lẫn bảng `dsp_*` của `0014`): trên một D1 chưa có bảng nào trong số đó — vd production còn ở `0012` — script **thoát mã 2** ("Không chạy được truy vấn trên D1"), mã 2 nghĩa là KHÔNG chạy được chứ KHÔNG phải dữ liệu sạch (mã 1 = có bất biến bị vi phạm). Dùng nó ở bước kiểm SAU khi áp, không phải để kiểm "hiện trạng trước".
4. Thử tay: đăng nhập bằng tài khoản admin; `/staff` hiện cột Quyền; `/parties`, `/locations` mở được; tạo thử một hồ sơ.

**Lần 2 (siết) — chỉ sau khi lần 1 chạy ổn:** làm Task B5 của kế hoạch N1-B (thêm `staff_party_required` với số KẾ TIẾP sau `0014` — dự kiến `0015_staff_party_required.sql`, KHÔNG phải `0013`, số đó đã là `company_email` — + test), rồi `npm run db:migrate:remote`, `node scripts/audit-invariants.mjs --db remote --strict`, và kiểm `SELECT count(*) FROM sqlite_master WHERE type='trigger' AND name LIKE 'staff_party_required_%'` = 2.

**Hoàn tác:** migration không có `down`, và "triển khai lại Worker cũ" CHỈ an toàn trong một cửa sổ hẹp — đọc hết ba gạch đầu dòng trước khi dùng.
- **Chưa tạo/sửa tài khoản, quyền hay hồ sơ nào dưới mã mới** → triển khai lại phiên bản Worker trước là đủ: `0009…0012` chỉ thêm nên mã cũ vẫn đọc/ghi bình thường (đã kiểm trên SQLite: mã cũ vẫn `INSERT staff` không `party_id`, vẫn `UPDATE role`/`full_name`, vẫn đếm quản trị viên theo `role`).
- **Đã có dù chỉ một thay đổi dưới mã mới** → hoàn tác CHỈ Worker sẽ sai LẶNG LẼ (không sập, nên càng khó thấy): mã mới ghi hằng `staff.role = 'sales'` và `staff.full_name = ''`, đặt tên ở hồ sơ (`pty_*`) và quyền ở `stf_permission`; mã cũ chỉ đọc `staff.role`/`staff.full_name`. Hệ quả (đã chứng minh bằng SQLite): (i) tài khoản tạo dưới mã mới — kể cả ADMIN — sau khi hoàn tác thành `sales` và TÊN TRỐNG trên mọi màn hình, kể cả cột người lập đơn; (ii) mọi lần cấp/thu hồi quyền và mọi lần đổi tên dưới mã mới biến mất; (iii) ngược lại, quản trị viên đã bị THU HỒI quyền dưới mã mới lại "sống dậy" vì `staff.role` vẫn là `'admin'`. Hoàn tác đúng trong trường hợp này = khôi phục **D1 Time Travel về điểm đã ghi trước khi áp** + triển khai lại Worker cũ; đánh đổi phải nói rõ với chủ dự án: **mất MỌI dữ liệu ghi sau điểm đó** — đơn mới, sửa đơn, thu tiền, tài khoản mới. Chủ dự án quyết, và nên quyết trước khi áp chứ không phải lúc đang sự cố.
- **Vì vậy — cửa sổ đóng băng thao tác tài khoản:** từ lúc chạy `npm run db:migrate:remote`, qua khoảng giữa tới `npx wrangler deploy`, và tiếp tục **cho tới khi chắc chắn không hoàn tác nữa**: KHÔNG tạo tài khoản, KHÔNG sửa tài khoản (tên, SĐT đăng nhập, ngưng/kích hoạt), KHÔNG đổi quyền, KHÔNG tạo/sửa hồ sơ. Mỗi thao tác như vậy loại bỏ dần phương án hoàn tác rẻ (chỉ Worker) và đẩy về phương án Time Travel (mất dữ liệu).

## Lần phát hành v1.0 (đăng nhập Turnstile + thông tin công ty · người phụ trách · xác nhận đơn PNG) — RUNBOOK

Chỉ khi chủ dự án ra lệnh trong phiên đó (`CLAUDE.md` §6). Đặc tả NHÁP: `docs/superpowers/specs/2026-09-21-v1-0-dang-nhap-xac-nhan-phu-trach-design.md` (chưa được chủ dự án duyệt; không phải ADR). Migration của lần này: `0013` (email công ty) + `0014` (dispatch) — cả hai chỉ THÊM, áp CÙNG một lệnh `npm run db:migrate:remote`. Cửa sổ đóng băng thao tác tài khoản/quyền/hồ sơ (mục "Hoàn tác") vẫn hiệu lực nếu chưa được chủ dự án gỡ.

**A. TRƯỚC khi deploy**
1. Chủ dự án tạo widget Turnstile cho `booking.tourdao.vn` ở dashboard Cloudflare (Turnstile → thêm widget, tên miền `booking.tourdao.vn`, chế độ Managed) và lấy hai khoá: khoá site (CÔNG KHAI) và khoá bí mật. Claude không tự tạo widget/khoá thật.
2. Ghi khoá site vào `vars` của `wrangler.jsonc` (`"TURNSTILE_SITE_KEY": "<khoá site>"`; commit được vì công khai). KHÔNG ghi khoá bí mật vào tệp nào và KHÔNG đặt nó ở bước này.
3. **Đối chiếu ngưỡng token:** `MAX_TOKEN_LENGTH = 2048` ở `src/modules/auth/turnstile.ts` là ngưỡng GIẢ ĐỊNH từ tài liệu Cloudflare, chưa được đối chiếu (khi viết không có mạng). Đối chiếu với trang tài liệu hiện hành của Turnstile (xác thực phía máy chủ) — token thật dài hơn ngưỡng này thì MỌI lần đăng nhập bị 403 mà không gọi Cloudflare (khoá thử của Cloudflare cấp token ngắn nên e2e không bắt được).
4. Cổng thường lệ (`CLAUDE.md` §6): ghi điểm khôi phục `npx wrangler d1 time-travel info tourdao-sales-db`; chạy RIÊNG `npm test`, `npm run typecheck`, `npm run test:e2e` (kỳ vọng 13/13 + `audit-invariants --strict` xanh); chạy kịch bản Chrome: ba `docs/evidence/2026-09-20-a2/kich-ban/a2-smoke-*.mjs`, `docs/evidence/2026-09-21-v1-0/kich-ban/v1-dang-nhap.mjs` và `v1-xac-nhan-png.mjs` (cách chạy: `tests/e2e/README.md`).

**B. THỨ TỰ deploy — deploy MÃ TRƯỚC khi đặt secret** (không "cùng lượt", không secret trước): service worker phục vụ `/login` và `login.js` từ cache (stale-while-revalidate), nên iPhone đã cài PWA có thể còn chạy `login.js` CŨ (không gửi token) ở lần mở đầu; bật kiểm ngay sẽ khiến họ bị 403.
1. `npm run db:migrate:remote` (áp `0013` + `0014`), rồi **ngay sau đó** `npx wrangler deploy` trong cùng lượt làm việc. Lúc này Turnstile còn TẮT vì chưa có `TURNSTILE_SECRET_KEY`: `GET /api/auth/config` trả `{"turnstileSiteKey":null}`, đăng nhập như cũ; máy chủ ghi cảnh báo `turnstile_disabled` mỗi lần đăng nhập — bình thường ở bước này.
2. Đối chiếu người phụ trách sau khi áp `0014` (chỉ đọc):
   ```
   npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT (SELECT count(*) FROM orders) AS don, (SELECT count(*) FROM dsp_assignment WHERE task_kind_code = 'HANDLE' AND valid_to_at IS NULL) AS phu_trach"
   ```
   Hai số bằng nhau nếu mọi người lập đơn đều có hồ sơ. Đơn do MÃ CŨ tạo trong khoảng giữa lúc áp `0014` và lúc deploy KHÔNG có dòng HANDLE — hợp lệ (đơn không người phụ trách là một trạng thái đúng), nhận bằng "Nhận phụ trách" (`dispatch.claim`); từ khi deploy mọi đơn mới tự có người phụ trách. Muốn liệt kê: đơn nào chưa có HANDLE đang mở (`… WHERE NOT EXISTS (SELECT 1 FROM dsp_assignment a WHERE a.order_id = o.id AND a.task_kind_code = 'HANDLE' AND a.valid_to_at IS NULL)`).
3. `node scripts/audit-invariants.mjs --db remote` (không `--strict`), CHẠY SAU khi đã áp `0014`: script kiểm cả bảng `dsp_*`, nên trên D1 chưa có `0014` nó **thoát mã 2** (không chạy được ≠ dữ liệu sạch); mã 1 = có bất biến bị vi phạm (kể cả R-DSP-3 chồng lấn).
4. Kiểm sau deploy (chỉ đọc, ngoài các trang tĩnh): `GET /api/company` (công khai) → 200 với đủ tên, MST, địa chỉ, hotline, email; và MỘT lời gọi `GET /api/dispatch/handlers?orderIds=<id của một đơn có thật>` (cần đăng nhập) → 200 với tên người phụ trách — câu SQL của nó dùng `json_each`, mới chỉ chạy trên miniflare/SQLite, CHƯA từng chạy trên D1 production. `curl -sI https://booking.tourdao.vn/login` phải có `Content-Security-Policy` cho phép `https://challenges.cloudflare.com`.
5. **Để nhân viên mở app MỘT lần** (mở khi có mạng, để service worker nạp `login.js` mới); hoặc tự mở trang đăng nhập trên vài thiết bị đã cài PWA để chắc.
6. Bật Turnstile: `npx wrangler secret put TURNSTILE_SECRET_KEY` (dán khoá bí mật; KHÔNG cần deploy lại). Rồi kiểm: `GET /api/auth/config` phải KHÁC `{"turnstileSiteKey":null}` (phải trả đúng khoá site — nếu vẫn `null` thì secret/khoá site chưa vào); mở `/login` bằng trình duyệt THẬT (widget hiện, không chỉ curl) và đăng nhập thử bằng một tài khoản thật (kể cả một máy iPhone đã cài PWA); xem log (`wrangler tail` hoặc Logs của Worker): `turnstile_failed` (kèm `detail`) là 403, `turnstile_unavailable`/`turnstile_misconfigured` phải KHÔNG có. 403 hàng loạt ngay sau khi bật: thường là máy khách còn `login.js` cũ (đóng-mở app) hoặc ngưỡng `MAX_TOKEN_LENGTH` sai (mục A.3).
7. Ghi trạng thái (mã, phiên bản Worker, điểm Time Travel, kết quả các kiểm trên) vào mục "TRẠNG THÁI TRIỂN KHAI" ở đầu tệp này và cập nhật `CLAUDE.md` §9.

**C. Hoàn tác Turnstile** (khi chủ dự án ra lệnh): `npx wrangler secret delete TURNSTILE_SECRET_KEY` tắt lại kiểm ngay (không cần deploy; đăng nhập quay về không token). `0013`/`0014` chỉ thêm nên hoàn tác Worker về bản trước vẫn chạy được, với cùng lưu ý ở mục "Hoàn tác" phía trên về dữ liệu ghi dưới mã mới.

## Cổng bổ sung trước/sau khi áp lần phát hành 1 (rà soát độc lập, 2026-09-20)

Mục này được THÊM sau một lần rà soát độc lập; nó bổ sung chứ không thay bước nào của mục "Triển khai" ở trên.

### 1. Cổng chỉ-đọc TRƯỚC khi áp `0009…0012` lên remote — kỳ vọng 0 dòng
Chạy (chỉ đọc), ghi lại kết quả cùng điểm khôi phục Time Travel (`npx wrangler d1 time-travel info tourdao-sales-db`) TRƯỚC khi áp:

```
npx wrangler d1 execute tourdao-sales-db --remote --command "<câu dưới>"
```

```sql
SELECT id, length(trim(full_name)) AS len, instr(trim(full_name), '  ') AS double_space, date(created_at, '+7 hours') AS vn_date,
       length(given) AS given_len,
       CASE WHEN instr(head, ' ') > 0 THEN instr(head, ' ') - 1 ELSE length(head) END AS family_len,
       CASE WHEN instr(head, ' ') > 0 THEN length(trim(substr(head, instr(head, ' ') + 1))) ELSE 0 END AS middle_len
FROM (SELECT id, full_name, created_at,
             trim(substr(trim(full_name), length(rtrim(trim(full_name), replace(trim(full_name), ' ', ''))) + 1)) AS given,
             trim(rtrim(trim(full_name), replace(trim(full_name), ' ', ''))) AS head
      FROM staff)
WHERE trim(full_name) = '' OR length(trim(full_name)) > 200 OR date(created_at, '+7 hours') IS NULL
   OR instr(trim(full_name), '  ') > 0 OR instr(full_name, char(9)) > 0 OR instr(full_name, char(10)) > 0 OR instr(full_name, char(13)) > 0 OR instr(full_name, char(160)) > 0
   OR given_len > 60 OR family_len > 60 OR middle_len > 100;
```

Giải thích: mỗi dòng ra là một tài khoản mà bước backfill hồ sơ của `0012` sẽ (a) làm migration ABORT giữa chừng, hoặc (b) chạy xong nhưng tách/ghép tên sai. Truy vấn con `given`/`head` sao chép ĐÚNG cách `0012` (mục 4.2) tách tên: tên (`given`) = từ cuối; `head` = phần còn lại; họ = từ đầu của `head` (nếu `head` có dấu cách, nếu không họ = cả `head`); đệm = phần sau từ đầu của `head`. Ba cột `given_len`, `family_len`, `middle_len` in độ dài từng phần để tự nhìn.
- **(a) ABORT (vi phạm `CHECK`):** `full_name` rỗng/toàn khoảng trắng hoặc dài hơn 200 ký tự (`display_name`); họ dài hơn 60, tên đệm dài hơn 100, tên (từ cuối) dài hơn 60 ký tự (`CHECK` từng phần của `pty_person` — vd một từ 70 ký tự, hoặc họ 70 ký tự, dù tổng còn dưới 200); hoặc `created_at` không phải ISO (`date(...)` trả NULL → cột `valid_from_date` NOT NULL bị vi phạm).
- **(b) SAI LẶNG LẼ:** khoảng trắng đôi, TAB, xuống dòng, NBSP bên trong `full_name`. Backfill bằng SQL chỉ tách theo dấu cách ASCII đơn. Chỉ khoảng trắng ĐÔI làm R-N1-3 của `audit-invariants` đỏ (`display_name` giữ nguyên còn ba phần đã gộp khoảng trắng). Với TAB / xuống dòng / NBSP, `display_name` vẫn khớp tên ghép nên R-N1-3 VẪN XANH, nhưng họ/đệm/tên bị tách sai lặng lẽ (vd `"Nguyễn<TAB>Văn An"` → họ `"Nguyễn<TAB>Văn"`, đệm NULL, tên `"An"`) và không công cụ nào bắt được sau khi áp — vì vậy cổng TRƯỚC KHI ÁP là cơ hội duy nhất.

Cách xử lý dòng ra: sửa `staff.full_name` cho sạch TRƯỚC khi áp (chủ dự án quyết; đây là một `UPDATE` trên remote), hoặc — chỉ với nhóm (b) — chấp nhận và sửa tay hồ sơ ở trang Hồ sơ. Nhóm (a) không thể "chấp nhận": không sửa trước thì migration dừng giữa chừng (khi đó kiểm `npx wrangler d1 migrations list tourdao-sales-db --remote` và dữ liệu trước khi thử lại; khôi phục bằng điểm Time Travel đã ghi nếu cần).

### 2. Số câu trong một `db.batch()` — kiểm TRƯỚC lần nạp nhân viên đầu tiên qua Sheet
- Tạo một tài khoản = **6 câu** trong một batch: hồ sơ (`pty_party`), cá nhân (`pty_person`), vai trò STAFF (`pty_party_role`), tài khoản (`staff`), quyền (`stf_permission`), nhật ký (`audit_log`) — với một quyền (SALES); mỗi quyền thêm là thêm một câu.
- `POST /api/staff/sheet/apply` gộp TẤT CẢ ứng viên vào MỘT `db.batch()`: **6N + 1 câu** (N tài khoản + một dòng nhật ký `staff_synced`); 9 nhân viên ≈ 55 câu. Cùng request còn thêm khoảng N câu tra SĐT trùng và các truy vấn xác thực nằm NGOÀI batch.
- Đối chiếu con số 6N + 1 này với giới hạn HIỆN HÀNH của D1 và của gói Workers đang dùng (số truy vấn D1 mỗi lần gọi Worker; kích thước/số tham số của một câu và một batch) trên trang giới hạn D1 của Cloudflare TRƯỚC lần nạp đầu tiên — các con số đổi theo gói và theo thời gian, và tài liệu này không chép lại con số nào để tránh tin nhầm. Nếu vượt: nạp từng phần (API nhận danh sách `phones`, chọn một phần ứng viên mỗi lần) hoặc dùng `scripts/import-staff.mjs`.

### 3. Sau khi áp lần 1 trên remote — kiểm nhanh bằng một lượt gọi API thật
Các câu SQL của module `parties` dùng tham số đánh số `?NNN` và mới chỉ được kiểm trên D1 cục bộ; cần một lượt gọi thật trên remote:
1. Đăng nhập bằng tài khoản ADMIN.
2. `GET /api/locations` (8 địa điểm).
3. `POST /api/parties` (tạo một hồ sơ thử, kèm một liên hệ), rồi `GET /api/parties` và `GET /api/parties/:id`.
4. Đóng liên hệ thử vừa tạo: `POST /api/parties/:id/contacts/:cid/end`.
5. `node scripts/audit-invariants.mjs --db remote` (không `--strict` ở lần 1). Nếu `PRAGMA foreign_key_check` lỗi trên remote thì script thoát mã 2: chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`, tạm bỏ dòng kiểm `R-N1-10` khỏi mảng `CHECKS` (chỉ sửa cục bộ, không commit) rồi chạy lại các kiểm còn lại — như mục "Việc còn treo / nợ" bên dưới đã nêu. Nếu remote từ chối cả lệnh NHIỀU CÂU trong một `--command` (thiết kế "một lần gọi wrangler cho mọi kiểm" hỏng theo cả hai cách), chạy từng câu bất biến một bằng `npx wrangler d1 execute tourdao-sales-db --remote --command "<một câu>"` và đọc kết quả bằng mắt (mỗi câu kỳ vọng 0 dòng / đếm 0).

### 4. Ba quyết định cần chủ dự án
Ghi ngắn, kèm chi phí; chưa sửa gì (không sửa ADR/đặc tả đã duyệt trong bước này).

**(a) Liên hệ chính có thể chồng lấn — và có ĐƯỜNG THẬT qua API hôm nay. CHỐT TRƯỚC KHI ÁP `0011` lên remote.**
`pty_contact_point` chỉ có chỉ mục duy nhất một phần `pty_contact_primary_uq` (`WHERE is_primary = 1 AND valid_to_date IS NULL`: tối đa một liên hệ chính ĐANG MỞ mỗi hồ sơ mỗi loại) — đặc tả đã duyệt chỉ đòi tối đa một liên hệ chính ĐANG MỞ mỗi loại; đặc tả im lặng về ngày kết thúc tương lai. Nhưng ADR-0003 điều 7 nói chống chồng lấn khoảng đã đóng bắt buộc dùng trigger (đã làm cho `pty_party_role`, `pty_party_relationship`), còn liên hệ thì chưa — và đây không phải chuyện giả định: `POST /api/parties/:id/contacts/:cid/end` với `{"validTo":"2099-12-31"}` (mọi ngày tương lai ≥ `valid_from_date` đều được: `validateEndDate` chỉ kiểm định dạng, câu `END_CONTACT` chỉ kiểm `validTo >= valid_from_date`) đóng liên hệ chính bằng một ngày TƯƠNG LAI → dòng rời khỏi chỉ mục một phần NGAY → thêm liên hệ chính mới → hai liên hệ chính cùng hiệu lực hôm nay. Hiển thị không sai (mọi chỗ đọc chỉ lấy dòng `valid_to_date IS NULL`), nhưng lịch sử vi phạm ADR-0003 điều 7 và không kiểm nào bắt.
Lưu ý khi chọn: từ đợt sửa sau rà soát toàn nhánh, khi hồ sơ không còn liên hệ chính ĐANG MỞ (kể cả vì liên hệ chính đã đóng bằng ngày TƯƠNG LAI — dòng đó có `valid_to_date` khác NULL nên bị coi là không còn chính), thêm một liên hệ mới cùng loại sẽ TỰ ĐỘNG thành liên hệ chính (mã ghi đè cả `isPrimary: false`). Vì vậy kịch bản chồng lấn ở trên nay xảy ra chỉ với hai thao tác (đóng bằng ngày tương lai rồi thêm số mới), không cần client yêu cầu `isPrimary: true`.

Ba phương án, chủ dự án chọn một (chưa chọn thay):
- **(i) Chặn ở mã:** từ chối `validTo > hôm nay (giờ Việt Nam)` ở route đóng liên hệ. Chi phí thấp nhất, làm ngay được, không đụng DDL và không cần duyệt lại gì; đổi hành vi nhỏ (không còn hẹn trước ngày kết thúc trong tương lai cho liên hệ).
- **(ii) Trigger, đúng ADR-0003 điều 7 nhất:** thêm 2 trigger `pty_contact_primary_no_overlap_{ins,upd}` vào DDL tham chiếu (`docs/superpowers/specs/2026-09-20-n1-schema-reference.sql`) và TÁI SINH `0011`. Rẻ nếu làm TRƯỚC khi áp `0011` lên remote (sau khi áp thì phải thêm một migration mới); cần chủ dự án duyệt lại DDL đã duyệt.
- **(iii) Chấp nhận, chỉ giám sát:** thêm một kiểm "hai liên hệ chính chồng lấn" vào `scripts/audit-invariants.mjs`. Không đổi schema, không đổi hành vi; chỉ phát hiện SAU khi đã xảy ra chứ không chặn.

**(b) Nhật ký `staff_updated` đang ghi SĐT.** `src/modules/accounts/index.ts` (route `PATCH /api/staff/:id`) ghi `SĐT ${t.phone} → ${patch.phone}` vào nhật ký, trái ràng buộc "nhật ký không ghi SĐT, email, MST". Lỗi có từ trước N1. Sửa (chỉ ghi "đổi SĐT đăng nhập", không ghi số; một dòng mã, không test nào đang kiểm chuỗi này) hay giữ (nhật ký chỉ admin xem, SĐT đăng nhập của nhân viên nội bộ)? Nếu giữ, cần ghi rõ ngoại lệ trong đặc tả.

**(c) ADR-0005 mục Quyết định 2 lệch DDL đã duyệt — ghi errata.** ADR viết `stf_permission(staff_id, permission_type_code, created_at, created_by)`, khoá duy nhất `(staff_id, permission_type_code)`; DDL đã duyệt và `0012` thực tế có `id`, `valid_from_at`/`valid_to_at`, đủ bốn cột kiểm toán và chỉ mục duy nhất MỘT PHẦN `stf_permission_open_uq … WHERE valid_to_at IS NULL` (đóng/mở lại quyền giữ lịch sử, đúng "không xoá cứng" của ADR-0003 điều 8). Mã theo DDL; chỉ cần chủ dự án đồng ý ghi errata vào ADR-0005 (chi phí: chỉ tài liệu).

## Việc còn treo / nợ
- `staff.role` (ghi hằng `'sales'`) và `staff.full_name` (ghi `''`) là cột chết có chủ đích; gỡ khi lần đầu phải dựng lại `staff` (ADR-0003 điều 10). `docs/data-dictionary.json` ghi `deprecatedColumns`.
- Module `accounts`, `audit`, `auth`, `catalog`, `orders` còn ở `LEGACY` của `src/architecture.test.ts` (SQL chưa đăng ký); `wonGuard` của `orders` đọc `audit_log` (ngoại lệ tới N2).
- Sắp xếp danh sách nhân sự/hồ sơ theo `sort_key` dùng `COLLATE NOCASE` — chữ có dấu chưa theo chuẩn tiếng Việt (danh sách chỉ vài chục dòng; nếu cần sắp lại ở mã bằng `Intl.Collator('vi')`).
- `PRAGMA foreign_key_check` trong `audit-invariants` chưa kiểm được trên D1 remote từ máy này; nếu lệnh lỗi trên remote thì chạy riêng `npx wrangler d1 execute tourdao-sales-db --remote --command "PRAGMA foreign_key_check"`.
- Tiếp theo: N2 (người đặt/khách đi tour trên đơn, gộp hồ sơ, phân công, `updateDraftOrder` theo id bền — ADR-0006), N3 (sổ thu tiền, hoá đơn, sửa sau xác nhận), N4 (giá net HDV).
