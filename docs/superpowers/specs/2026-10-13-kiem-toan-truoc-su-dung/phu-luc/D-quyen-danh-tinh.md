# Phụ lục D — Quyền và danh tính

> Mốc `483b3aa0`. Người kiểm dựng script esbuild nạp 19 mô-đun để dump route, và chạy ma trận thật trên khung thử `tests/audit/harness.mjs` (tệp ở thư mục tạm). D-1 và D-2 tôi (điều phối) đã tự chạy lại: kết quả trùng.

## Phát hiện

### D-1 — High (đã xác minh hai lần)

Đối tác đọc được nội dung kế toán nội bộ của chính đơn mình.

- **Tái hiện**: Đối tác lập đơn và xác nhận → Kế toán ghi lần thu và xác nhận → Quản trị huỷ lý do "Thời tiết" (Công ty huỷ) → chủ duyệt hoàn cọc, lý do nội bộ "Khách quen của giám đốc, hoàn thêm dù quá hạn, đừng báo đối tác". Đối tác gọi `GET /api/orders/:id`: `history` trả `ledger_company_received` (tên Kế toán), `cancelled` (tên Chủ) và `deposit_refund_approved` kèm đúng câu lý do. `GET /api/orders/:id/payments`: `coc.khoanDuyet[]` trả `lyDo` và `nguoiDuyet` = "Chủ". Bài thử riêng còn cho thấy Đối tác đọc `ledger_adjustment` (có "số dư trước → sau"), `ledger_reversal`, `ledger_receipt_replaced`, kèm tên người làm và chữ tự do.
- **Mã**: `src/modules/orders/index.ts:941-946` — `history` trả mọi dòng `getAuditTrail`, chỉ lọc `laDongNhapKeToan` (cần ô `accounting.entry.view`), `laDongThuongMai` và `lichSuTheoVai` (chỉ rút gọn dòng đặt gấp, `orders/dat-gap.ts:91`). `src/modules/billing/coc.ts:120,125` cùng `src/shared/contracts.ts` (`KhoanDuyetDto`, `HoanNgoaiDto`, `CocDonDto`) luôn trả `lyDo`, `nguoiDuyet`, `nguoiGhi`, không phụ thuộc quyền người xem.
- **Gốc lỗi**: lọc kiểu danh sách CHẶN — mỗi loại dòng nhật ký thêm sau tự lộ cho Đối tác. Ô `order.history.view` của Đối tác = `own` chỉ trả lời "được xem lịch sử đơn của mình", chưa nói được xem dòng nào.
- **Mức**: High theo thang của yêu cầu (đường bấm bình thường, không máy canh). Không phải Critical vì không lộ SĐT/giấy tờ khách, chỉ lộ nội dung nội bộ và tên nhân sự.
- **Xử lý**: với người giữ quyền Đối tác đổi sang danh sách CHO PHÉP; DTO cọc bỏ `lyDo`, `nguoiDuyet`, `nguoiGhi`; thêm bài kiểm duyệt mọi hành động trong `src/shared/audit-actions.ts`, gieo mỗi hành động một dòng, khẳng định Đối tác chỉ thấy danh sách cho phép. Việc lớn (quyền + tiền).

### Các phát hiện khác

| Mã | Mức | Chuyện gì | Tái hiện | Xử lý |
|---|---|---|---|---|
| D-2 | Medium (cần chủ quyết) | ADR-0071 mục 1e: HCNS "không xem đơn/giá/tiền", nhưng 1f cho HCNS tạo tài khoản và gán vai thường, và máy chủ trả PIN thô một lần cho người tạo. | **Đã chạy lại**: HR `GET /api/orders` → 403; HR `POST /api/staff` tạo tài khoản vai `SALES` → 201, nhận PIN 6 chữ số; đăng nhập bằng tài khoản đó → 200; `GET /api/orders` → 200, thấy tên khách và SĐT; `GET payments` → 200. HR tự thêm SALES cho chính mình → 403; HR reset-pin → 403; nhưng HR đổi SĐT Kế toán và ngưng Kế toán đều 200. ADR-0090/0094 nhận khoảng hở PIN và đẩy sang ADR-0093 "PIN tạm" (đang proposed); đường "tạo tài khoản Bán hàng để xem đơn" thì không thấy ghi nhận. | Hoàn tất ADR-0093 (PIN tạm + buộc đổi PIN lần đầu) hoặc HR chỉ gán vai không mở đơn/tiền. |
| D-3 | Medium (nợ đã biết ADR-0014 D-04) | Người lạ khoá được đăng nhập của người khác. | Đã chạy (không Turnstile): 5 lần `POST /api/auth/login` sai PIN với SĐT nạn nhân → khoá 15 phút, lặp lại thì khoá mãi. Throttle theo SĐT (5/15 phút) và IP (30/15 phút). Production có bật Turnstile không: chưa kiểm. | Khoá theo cặp SĐT+IP hoặc đòi Turnstile sau lần sai đầu. Quản trị mở khoá đã có. Nhỏ. |
| D-4 | Low | Phiên 7 ngày, không hạn nhàn rỗi; PIN yếu chỉ chặn số lặp và dãy tăng/giảm (`staff/rules.ts` `isWeakPin`), PIN kiểu ngày sinh vẫn qua; `public/_headers` không có HSTS (Cloudflare có thể đặt ở cấp tên miền, chưa kiểm); thân JSON route công khai không giới hạn kích thước (`shared/http.ts` `readJson`). | Đọc mã. | Ghi nhận. |

## Nghi ngờ

`wrangler.jsonc` có `observability.enabled: true`. Nếu route nào nhận SĐT hoặc tên qua query (ví dụ `lookup` ở `parties/index.ts:556`) thì chuỗi truy vấn có thể nằm trong Workers Logs. Chưa kiểm log thật; chủ cần xem cấu hình và thời gian giữ log.

## Trạng thái mục đã biết (vùng D)

K-B-1: đã vá ở chỗ lập/sửa/xác nhận (`orders/index.ts:254`, `:1374`; `price-guards.ts`). K-B-4: **còn hở** — trigger `lc1_*` (`0037:11`) chỉ chạy khi INSERT và chỉ khi hồ sơ có vai bên ngoài; R-LC-1 dùng cùng điều kiện. HC-5.11: **còn hở**, có **hai** chỗ gọi `syncCatalog(env, null)`: `catalog/index.ts:365` (Cron) và `catalog/service.ts:58` (`bootstrapIfNeverSynced`, do request của người dùng bất kỳ kích hoạt), nhật ký `staff_id` rỗng. Các ô chưa có route (`task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`): chỉ thấy trong sổ hoãn, hạn 30/11 và 31/12.

## Đã kiểm, sạch (kèm cách kiểm)

- **Bản đồ route**: 288 route (9 công khai, 54 staff, 131 office, 52 admin, 35 orders, 7 accounts); 0 route bị che khuất; 0 ô bản đồ quyền chết ngoài sổ hoãn. `node --test src/permission-enforcement.test.ts` → 3/3. Bài này chỉ chứng minh mỗi ô được hỏi, không chứng minh đúng phạm vi từng ô (bài học 24/9).
- **Ma trận thật trên khung thử**: PARTNER, INTERN, DRIVER_PARTNER, DRIVER, HR, FIELD, ACCOUNTING, SALES — 1.808 lượt GET và 1.038 lượt ghi: không IDOR, không đường ghi trái phép ngoài D-1 và D-2.
- **Phiên**: cookie `td_session` HMAC; quyền đọc lại từ D1 mỗi request (`getActiveStaff`) nên đổi quyền/khoá có hiệu lực ngay; kiểm Origin/content-type khi ghi; WebAuthn tự viết (rpId/origin từ env, challenge cookie HMAC dùng một lần, signCount); PBKDF2 100k (đọc mã, không chạy hết).
- **Quyền nội bộ**: `canManageAccount` (ADMIN/HR không quản ADMIN/SUPER_ADMIN/HR) đã đọc và thử qua route; không thấy leo thang.
- **Trợ lý AI**: không có công cụ ghi (đọc mã). Dữ liệu gửi ra ngoài: xem phụ lục F.
- **Chưa kiểm**: từng trang `web/` về ẩn/hiện nút (chỉ dựa `giao-dien-hoi-bang-quyen.test.ts`, nằm trong `npm test` xanh); giá trị `nguoiGhi`/`ghiChu` trong `lanThu` cho Đối tác (thấy tên trường, chưa in giá trị); BACKLOG mục 28.
