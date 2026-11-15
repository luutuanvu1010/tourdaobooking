# Phụ lục 04 — Máy chủ và vận hành (Bước 4)

> Nguồn: báo cáo của trợ lý chỉ đọc số 4 (mô hình tầm trung), chép nguyên văn từ mục 1 tới mục 10; phiên điều phối đã đọc toàn bộ. Vùng này không có phát hiện CHẶN LAUNCH nên phiên điều phối không chạy lại phép dò (theo cách làm của đề bài: chỉ CHẶN LAUNCH mới phải tự chạy lại). Kịch bản dò của trợ lý nằm ngoài kho (thư mục tạm của phiên) và không lưu vào kho.
> Ghi chú của phiên điều phối: mục trạng thái mới nhất trong cây được rà là 2.73 (đúng như trợ lý đọc). Mục ghi lần triển khai 22:04 của ADR-0180 nằm ở lần lưu `984bee7d` trên `main` của máy, chưa đẩy lên `origin/main` lúc rà; xem phụ lục 00.

Mã được rà: `5f641781`. Bản thật đang chạy: GET `/api/auth/config` → `version` 2.73. Giờ máy: bắt đầu 22:08, kết thúc ~22:25 (7/11/2026).

## 1. Phạm vi và cách rà
Đã đọc: `src/index.ts` (scheduled, 296–306), `src/shared/router.ts` (bắt lỗi toàn cục 775–790), `web/api.ts`, `src/shared/trang-thai-he-thong-chu.ts`, `web/order-form.ts` (onSaveError 687–720, nhánh lỗi lưu 796–800), `src/modules/catalog/service.ts` + `repository.ts` (applySync), `src/modules/billing/tra-sau-nhac.ts`, `src/modules/ve-dien-tu/{index,kho-tep}.ts`, phần ADR-0180 trong `src/modules/auth/{index,repository}.ts` + `migrations/0145`, `src/phat-hien-han.test.ts`, `src/permission-enforcement.test.ts`, `docs/quyen-hoan.json`, `docs/HANDOFF-N1.md` (đầu tệp), `wrangler.jsonc`, `scripts/release-lib.mjs` (thứ tự migration → deploy), `tests/audit/nhat-ky-hang.mjs`, `docs/data-dictionary.json` (khoá hangDuLieu).
Lệnh đã chạy (chỉ trên D1 giả của khung thử, không mạng ngoài trừ một GET công khai):
- `curl https://booking.tourdao.vn/api/auth/config` → version 2.73 (khớp mục mới nhất của HANDOFF-N1, có điểm quay lại Worker `a93afb65`).
- `node --test` kịch bản của tôi: `explain-quet.test.mjs`, `thoi-gian.test.mjs` (gieo 1.000 hồ sơ đối tác, tới 5.000 đơn tạo qua API thật, 19.980 dòng sổ nợ, 304.001 dòng nhật ký; bắt MỌI câu SELECT mà 39 route GET chạy rồi `EXPLAIN QUERY PLAN` từng câu, đo thời gian) và `pii-nhat-ky.test.mjs`.
- grep: `.run()` ngoài bộ dựng câu, `console.*`, `detail:` có chứa SĐT/email/MST.
Không chạy `npm test`, typecheck, e2e, audit-invariants, wrangler, không sửa/ghi tệp trong repo.

## 2. Phát hiện
Kết luận trước: KHÔNG có phát hiện mức CHẶN LAUNCH ở vùng này. Hai phát hiện nhỏ ở mức tuần đầu / để sau.

### V-01 — Câu lỗi 500 hứa «kèm mã này» nhưng màn hình không hiện mã
- Mức: SỬA TRONG TUẦN ĐẦU (nhỏ). Trạng thái: ĐÃ XÁC NHẬN (đọc mã + grep).
- Chuyện gì: khi máy chủ lỗi bất ngờ, người dùng thấy «Có lỗi hệ thống. Thử lại sau; nếu còn lỗi, báo quản trị viên kèm mã này.» nhưng mã (`requestId`, lấy từ `cf-ray`) nằm trong thân JSON và không trang nào hiển thị; người dùng không có mã nào để báo.
- Ai gặp lúc nào: bất kỳ nhân viên/đối tác khi gặp 500 thật (ít gặp); quản trị viên không đối chiếu được dòng log `unhandled` (có `requestId`) với báo cáo của người dùng.
- Bằng chứng: `src/shared/router.ts:788` (câu + `requestId` trong thân); `grep -rn "requestId" web --include='*.ts'` → chỉ các chỗ là «requestId» của lệnh chuyến/vé (một thứ khác), không chỗ nào đọc `error.requestId`; `web/api.ts` dựng `ApiError(status, code, message, details)` và `message` là câu trên, không ghép mã.
- Dữ liệu đang gõ có mất không: KHÔNG. `web/order-form.ts:796-800` bắt lỗi → `onSaveError` → form giữ nguyên, banner «Không kết nối được máy chủ… Dữ liệu bạn đã nhập vẫn còn» (`src/shared/order-errors.ts:58`); hết giờ 45 giây cũng giữ (`web/api.ts` REQUEST_TIMEOUT_MS). Chỉ hết phiên → `goLogin()` chuyển trang (đã biết: T-1; có `khung-nho` ADR-0035).
- Tái hiện bằng lời: làm một route ném lỗi không phải 409 order_delivered → thấy câu trên, không có mã.
- Đã có hồ sơ cũ: không thấy.
- Đề xuất: ghép `requestId` vào `message` ở máy chủ (một dòng) hoặc hiện ở `ApiError.details`. Việc nhỏ.

### V-02 — «Không ghi SĐT/email/MST vào nhật ký» chỉ dựa kỷ luật, chưa có máy canh
- Mức: ĐỂ SAU (rủi ro còn lại). Trạng thái: ĐÃ XÁC NHẬN (phần thiếu máy canh); phần dữ liệu hiện tại: SẠCH theo phép dò của tôi.
- Chuyện gì: bộ dò `tests/audit/nhat-ky-hang.mjs` (`doNhatKyHang`) chỉ dò cột hạng N3/N4 (số giấy tờ, băm mã). SĐT (`pty_contact_point.value`, `orders.customer_phone`), email, MST (`pty_organization.tax_code`) là hạng N2 trong `docs/data-dictionary.json` nên KHÔNG được dò toàn tuyến; chỉ vài bài truyền `cotThem` cho phiếu tự khai. Nếu sau này một route mới ghi SĐT vào `detail`, không máy nào đỏ (nhật ký lại chỉ-thêm, không xoá được).
- Bằng chứng: python đọc `hangDuLieu`: `pty_contact_point.value N2`, `orders.customer_phone N2`, `pty_organization.tax_code N2`. Phép dò riêng (`pii-nhat-ky.test.mjs`): tạo tổ chức có MST + SĐT + email, thêm liên hệ, tra trùng SĐT, tạo đơn có SĐT/email khách và người đặt mới, 3 ca nhập sai → 7 dòng nhật ký, `ro ri: []`; 3 câu báo lỗi 400 không lặp lại giá trị đã gõ («Số điện thoại khách không hợp lệ.», «Email không hợp lệ.»). Phản hồi của lệnh tạo có lặp SĐT/email người VỪA gõ (đó là DTO của chính hồ sơ, không phải lỗi). Grep `detail:` có biến chứa phone/email/mst → không có ca nào.
- Giới hạn của phép dò: các lệnh sửa đơn/đổi người đặt trong kịch bản của tôi trả 400 do tôi dựng thân sai nên chưa kiểm được nhánh ghi nhật ký của chúng; phần đó dựa vào đọc mã.
- Đã có hồ sơ cũ: «Nhật ký cũ trên production còn số» (CLAUDE.md §7) là chuyện khác (dữ liệu cũ).
- Đề xuất (không tự làm): gọi `doNhatKyHang(..., [], ["pty_contact_point.value","orders.customer_phone","pty_organization.tax_code"])` ở cuối vài bài chạy cả ứng dụng (cơ chế `cotThem` đã có). Việc nhỏ, siết chính mình.

### V-03 — Tên đường dẫn có mã bí mật của khách vào log lỗi (SUY LUẬN)
- Mức: ĐỂ SAU. Trạng thái: SUY LUẬN.
- `src/shared/router.ts:787` ghi `path` của request vào log `unhandled`. Route công khai `GET /api/ve-khach/:token/anh/:slot` mang mã xem vé của khách trong đường dẫn, nên nếu route đó từng ném lỗi, mã nằm trong Workers Logs. Cloudflare tự ghi URL ở nhật ký yêu cầu nên tác dụng phụ nhỏ. Chưa tái hiện.

## 3. Bảng EXPLAIN (D1 giả = SQLite thật; gieo 1.000 hồ sơ đối tác, 5.000 đơn [1/3 đã xác nhận], 19.980 dòng nợ, 304.001 dòng nhật ký; đăng nhập Toàn quyền)
Quét toàn bộ bằng cách bắt MỌI câu SELECT của từng route. Bảng nhỏ (`staff` 30 dòng, `stf_permission`, view nhãn) bị SCAN ở hầu hết route — bỏ qua.
| Câu/trang | Kế hoạch | Số dòng gieo | Đánh giá |
|---|---|---|---|
| Danh sách đơn `GET /api/orders` (kể cả `?q=`, `?status=`) | SEARCH/SCAN chỉ mục `idx_orders_created`, LIMIT 31; 3–5 ms | 5.000 đơn | Tốt. `q` dùng LIKE `%x%` nên quét bảng nhưng 4 ms ở 5.000 đơn; ĐÃ ghi nhận ở khung `query-plan.test.mjs` |
| Trang chủ `/api/orders/dashboard` (`SELECT id FROM orders WHERE status='confirmed'`) | SCAN orders | 5.000 (1.667 xác nhận) | Đã biết (`getDashboard`, E-05). 1–3 ms; còn rẻ ở vài nghìn đơn |
| `/api/ledger/unpaid-summary` | SCAN orders (`status='confirmed' AND delivered_at IS NULL`) | 5.000 | 1 ms; tăng tuyến tính theo số đơn xác nhận chưa giao |
| «Việc của bạn»: `/api/orders/pool`, `/chua-co-ban-hang`, `/cho-chup-bu`, `/cho-xac-nhan`, `/dem-nhap` | SCAN orders + EXISTS dịch vụ | 5.000 | 1–3 ms (lần đầu 12–51 ms do khởi động) |
| Sổ công nợ `/api/ledger`, `/ledger/coc`, `/ledger/coc/dem` | SCAN `bil_debt_line` qua view `v_bil_party_balance` (GROUP BY cả bảng, UNION ALL hai chân) | 19.980 dòng nợ | 37–40 ms/route; tăng tuyến tính theo số dòng nợ (100.000 dòng ≈ 200 ms). Chấp nhận được lúc ra mắt; theo dõi sau 3 tháng. CHƯA đo với dữ liệu thật |
| Hạn mức trả sau `/api/tra-sau/han-muc`, `/goi-y`, `/cua-toi` | SEARCH chỉ mục; SCAN `bil_credit_setting` (1 dòng) | 1.000 hồ sơ, không có hạn mức gieo | 1–2 ms; CHƯA kiểm với ~1.000 hạn mức đã cấp |
| Danh bạ `/api/parties`, `?q=`, `/lookup` | SCAN `pty_party` (LIKE) | 1.000 | 2 ms; chấp nhận được (1.000 dòng). `lookup?q=` trả 400 do tôi sai tham số |
| `/api/parties/duplicates` | SCAN pty_party + NOT EXISTS | 1.000 | 22 ms ở 60 đơn, 2 ms ở 5.000 (bộ đệm) — chỉ Quản trị |
| Hộp thư thông báo `/api/thong-bao`, `/tom-tat`, `/moi-nhat` | SEARCH audit_log qua `idx_audit_created`/`idx_audit_target`; không SCAN audit_log | 304.001 dòng nhật ký | `/thong-bao` 93 ms lần đầu, `/tom-tat` 10 ms. Không đáng lo; không có SCAN bảng lớn |
| Nhật ký `/api/audit` | SEARCH idx_audit_created | 304.001 | 2 ms |
| Vé `/api/ve/kho`, `/ve/lo` | SEARCH; SCAN lô (ít) | không gieo vé | 1–4 ms; CHƯA kiểm với hàng chục nghìn vé |
| Tìm khách theo tên/SĐT trong đơn | LIKE `%x%` quét `orders` | 5.000 | OK ở quy mô này |
Kết luận: không có câu nào chậm quá ngưỡng ở quy mô 1.000 đối tác / vài nghìn đơn. Điều chưa đo được: độ trễ thật của D1 (mỗi câu một lượt mạng; các route gọi 8–16 câu), và bảng vé/thông báo/nợ lớn hơn.

## 4. Tác vụ định kỳ (`wrangler.jsonc`: `"triggers": {"crons": ["*/15 * * * *"]}`; `scheduled` ở `src/index.ts:302-306` chạy ba việc song song bằng `ctx.waitUntil`)
| Tác vụ | Lịch | Lỗi giữa chừng thì sao | Ai biết |
|---|---|---|---|
| `runScheduledSync` đồng bộ danh mục từ Google Sheet (`catalog/service.ts`) | 15 phút | Lỗi Sheet (không vào được, đổi quyền, thiếu cột, `sync_guard` chặn ẩn >50%) ghi `catalog_sync.last_error*`, KHÔNG đổi danh mục. Ghi các dịch vụ theo lô 40 câu (`applySync`, `CHUNK=40`) nên nếu D1 hỏng giữa các lô thì cập nhật dở, `last_success_at` chỉ ghi cuối ⇒ lần sau tự tính lại (upsert lặp được). Lỗi D1 ở `markAttempt/recordFailure` bị ném ra (comment ở `catalog/index.ts:464` nói «không ném ra» là chưa đúng cho trường hợp D1 hỏng) nhưng ba việc độc lập nhau nên không kéo việc khác | Quản trị xem trên màn danh mục (`sync.error`); không có chuông/thư. Nhật ký ghi «Hệ thống» (staff_id rỗng) — HC-5.11 |
| `donHangChoXoaVe` xoá ảnh vé hết hạn lưu ở R2 | 15 phút | Bọc try/catch, không ném (`kho-tep.ts`); lỗi ghi log `ve_dien_tu_don_hang_cho_loi`; chạy lại an toàn | Chỉ Workers Logs; có bất biến `R-VDT-5` (audit) |
| `nhacHanTraSauAnToan` nhắc hạn Trả sau | 15 phút | Bọc try/catch, ghi `console.warn tra_sau_nhac_loi` (chỉ tên lỗi). Mỗi tin nhắc ghi cả lô (`INSERT OR IGNORE` + nhật ký có điều kiện), hai lượt chồng nhau không gửi lặp; lỗi giữa chừng → lượt sau gửi tiếp | Chỉ Workers Logs (không chuông). Đại lý chưa có tài khoản thì không có người nhận phía đại lý (đã ghi trong tệp) |
Ghi chú: `observability.enabled = true` (log có, không có cảnh báo). Cron không có «nhịp tim» (không ai biết nếu cả Cron ngừng chạy) — đã biết (T-9). Chưa kiểm trên bản thật: cấu hình Workers Logs, vì không có quyền chạy wrangler.

## 5. Việc theo lịch
- `src/phat-hien-han.test.ts`: điều kiện đỏ là `han < today` (so chuỗi ISO, `today = vnToday(new Date())`). HC-5.11 có `han = 2026-11-15` ⇒ hết ngày 15/11 vẫn XANH; `npm test` ĐỎ từ 00:00 giờ Việt Nam ngày **16/11/2026** (= 17:00 UTC ngày 15/11) cho tới khi vá hoặc chủ gia hạn. Vì `npm run day-len` và `npm run trien-khai` chạy `npm test`, hai lệnh phát hành cũng bị chặn từ lúc đó.
- Hạn 30/11/2026 gồm: `phat_hien`: **TNV-G1** (đơn huỷ còn tiền đã thu), **HC-4.2** (duyệt hai lớp bút toán điều chỉnh); `thao_tac`: **task.progress**, **dispatch.guides.view** (`src/permission-enforcement.test.ts:98` cũng dùng `<`). Cả bốn đỏ từ 00:00 ngày **1/12/2026**.
- Hạn tiếp theo: 31/12/2026 (`HC-5.19`, `invoice.request`, `invoice.issue`) ⇒ đỏ từ 1/1/2027.
- Các mục `cua_ghi` không có hạn.

## 6. Đối chiếu mục cũ
- T-1 (mất số vừa gõ khi hết phiên): CÒN. Chỉ trường hợp hết phiên (`goLogin` chuyển trang); lỗi mạng/500/hết giờ thì form giữ nguyên (`web/order-form.ts:796`, banner `NETWORK_BANNER`). Không kiểm lại bằng trình duyệt.
- T-9 (không cảnh báo chủ động, không lịch audit hằng ngày): CÒN. `.github/workflows/` chỉ có `kiem.yml`, không có `schedule`/`cron`; Cron của Worker không chạy audit.
- E-06 (đồng bộ Sheet không chặn đổi giá hàng loạt): CÒN, và đã xác nhận phần không-hại: `applySync` chỉ ghi `catalog_item`/`catalog_sync` (`catalog/repository.ts:114-147`); đơn lưu `unit_price` ở dòng riêng (`migrations/0003`), nên ĐƠN ĐÃ XÁC NHẬN KHÔNG đổi tiền khi Sheet đổi giá; đơn nháp hiện `catalogStatus` (`orders/service.ts:488-496`) và `catalogPriceSeen` chặn 409 `catalog_changed`. `syncGuard` chỉ chặn việc ẩn >50% dịch vụ, không chặn đổi giá.
- E-08 (thông báo khi deploy lỗi sau migration): CÒN; thứ tự `npm run trien-khai` là điểm khôi phục → migration → deploy ngay (`scripts/release-lib.mjs:820-862`); nếu deploy hỏng sau migration, 0145 chỉ thêm cột nên mã cũ vẫn chạy.
- E-05/getDashboard quét toàn bảng: CÒN, đo ở trên (1–3 ms).
- HC-5.11, HC-5.19, TNV-G1, HC-4.2: còn trong sổ; ngày ở mục 5.
- Ba cảnh báo audit R-ORD-9, R-CTL-1, R-VC-14: không kiểm (không được chạy audit).
- Sổ trạng thái: mục mới nhất của `docs/HANDOFF-N1.md` (2.73, Worker `9a8d9923…`, điểm quay lại `a93afb65`) KHỚP bản đang chạy (`version` 2.73); chưa đối chiếu Worker ID thật vì không được chạy wrangler.
- ADR-0180 / migration 0145: bản mã mới đọc cột `aut_session.acting_role` ở MỌI request đã đăng nhập (`auth/repository.ts`, câu `SS_FIND_LIVE`). Triển khai bằng `npm run trien-khai` (migration trước, deploy sau) an toàn; nếu ai chạy `wrangler deploy` tay trước khi áp 0145 thì mọi request đăng nhập lỗi 500. Quy trình đã che (không phải phát hiện); chỉ nhắc chủ đừng deploy tay.

## 7. Vùng đã kiểm, sạch (cách kiểm)
- Ghi nhiều bảng trong một lô: `grep -rn "\.run()" src` loại bộ dựng câu → billing, receipt, pricing, dispatch, ve-dien-tu (route) KHÔNG có `.run()` lẻ; mọi route ghi đi `env.DB.batch([...])` (vd `ve-dien-tu/index.ts:137,192,244,309…`, `tra-sau-nhac.ts` một `db.batch` mỗi đơn × loại). `.run()` còn lại là câu đơn một bảng (đánh dấu đã lưu/đã xoá R2, `recordLogin`, tắt máy thông báo) hoặc chủ ý tách riêng để chống dò PIN (`auth/index.ts:417,595,647`, `mfa-*.ts`: bộ đếm lần thử phải ghi dù lô chính hỏng — có chú thích T17).
- Ghi kho R2 + D1 (nhập lô vé): lô D1 ghi trước, đặt R2 sau, lỗi không ném, vé chưa lưu được thì rút (VOID) — `ve-dien-tu/kho-tep.ts:46-78`. Mỗi đợt ≤10 ảnh ≤3 MB (`shared/ve-nhap-lo.ts:4-5`) nên không vượt bộ nhớ Worker.
- Nhật ký/câu lỗi/phản hồi lệnh ghi: phép dò `pii-nhat-ky.test.mjs` sạch (mục V-02); `console.*` không ghi SĐT/email (chỉ tên lỗi, mã sự kiện); `turnstile` log không chứa token/IP; `mfa` log không chứa khoá.
- Lỗi 500: `router.ts:775-790` bắt toàn cục, trả JSON tiếng Việt không lộ stack; `console.error` ghi stack/message ở log phía máy chủ, không ra người dùng. `order_delivered` race → 409 câu cố định.
- Hộp thư/thông báo, danh sách đơn, Danh bạ ở quy mô 1.000 đối tác/5.000 đơn/304.000 dòng nhật ký: không chậm (mục 3).
- Thứ tự phát hành: migration trước deploy, có Time Travel bookmark (đã nêu).

## 8. Vùng chưa rà và vì sao
- Độ trễ/CPU thật của D1 và giới hạn thời gian mỗi request: khung thử là SQLite trong tiến trình, không có độ trễ mạng; không có quyền gọi bản thật.
- `getDashboard()` ở dữ liệu thật vài nghìn đơn có tiền, sổ nợ nhiều năm: chỉ gieo dòng nợ giả đều (không phản ánh phân bố thật).
- Bảng vé điện tử lớn (hàng chục nghìn vé), hạn mức trả sau cho ~1.000 đối tác, thông báo/đẩy: chưa gieo (chỉ route kiểm cú pháp/kế hoạch).
- Cấu hình thật của Workers Logs, secret `FEEDBACK_NOTIFY_EMAIL`/`FEEDBACK_MAIL_FROM` đã đặt trên production chưa, và ai thật sự đọc hộp thư Góp ý: không kiểm được (cần wrangler/đọc bản thật). Mã có sẵn hàng đợi «chưa gửi được email» khi thiếu cấu hình (`feedback/notify.ts`), nên Góp ý vẫn vào hàng đợi trong Nền tảng.
- Ai chạy `audit-invariants --db remote` và bao lâu một lần: không thấy lịch trong mã/tài liệu (`.github/workflows/kiem.yml` không có lịch) ⇒ hiện chỉ chạy trong `npm run trien-khai` — quy ước chưa viết.
- Nhánh sửa đơn/đổi người đặt với dữ liệu thật trong phép dò nhật ký (do tôi dựng thân sai nên nhận 400).
- Giao diện trong trình duyệt (không mở).

## 9. Lệnh bị bộ chặn từ chối
Không có lệnh nào bị từ chối. (Ban đầu một lệnh dùng `timeout` không có trên máy này; chạy lại không cần `timeout`.)

## 10. Câu cần chủ quyết (tối đa 3)
1. Có thêm máy canh «SĐT, email, MST không vào nhật ký» (V-02)? Khuyến nghị: Có — việc nhỏ, chỉ siết (dùng `cotThem` có sẵn).
2. Có hiện mã lỗi trên câu 500 (V-01) trong tuần đầu? Khuyến nghị: Có — một dòng ở máy chủ.
3. Ai là người đọc Workers Logs/Góp ý và chạy `audit-invariants --db remote` định kỳ (hiện không có lịch)? Khuyến nghị: chủ giao một người, chạy tay mỗi sáng tuần đầu; chưa cần dựng chuông (đã là T-9).


## 11. Kịch bản dò
Không có phát hiện CHẶN LAUNCH. Ba kịch bản dò chạy trên khung thử `tests/audit/harness.mjs` (D1 giả): quét `EXPLAIN QUERY PLAN` mọi câu SELECT của 39 route GET ở 1.000 đối tác / 5.000 đơn; đo thời gian với 19.980 dòng nợ và 304.001 dòng nhật ký; dò SĐT, email, MST trong nhật ký và câu báo lỗi. Kịch bản không lưu vào kho.
