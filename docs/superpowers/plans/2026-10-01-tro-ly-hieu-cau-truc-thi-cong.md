# Thi công ADR-0070: trợ lý hiểu cấu trúc app, tự cập nhật theo giao diện

- **Quyết định:** `docs/superpowers/specs/2026-10-01-adr-0070-tro-ly-hieu-cau-truc-tu-cap-nhat.md` (accepted 1/10) + đặc tả lời thường `…-tro-ly-hieu-cau-truc-dac-ta.md`. Không sửa hai tệp đó.
- **Nhánh:** `worktree-agent-a4f769f19246673b1` (từ main 9c0ff6c9 = production 1.47, gộp tiến thẳng 47a4a530).
- **Vai phiên này:** THI CÔNG. Không tự nghiệm thu (N8): việc chạm luật lõi lời nhắc gửi ra ngoài ⇒ cần người kiểm độc lập chỉ đọc sau khi xong.
- **Song song:** phiên khác sửa `web/tro-ly.ts`, CSS `.tl-*`, `changelog.ts` (1.48) — phiên này KHÔNG đụng ba chỗ đó.

## Tiêu chí nghiệm thu (viết TRƯỚC khi code — P20)

Mỗi điều có ít nhất một bài kiểm; bài viết trước, chạy thấy ĐỎ, rồi mới viết mã cho XANH.

| Điều ADR-0070 | Hành vi kiểm được | Bài |
|---|---|---|
| 1. Bảng tên lời thường | (a) Mỗi thư mục `src/modules/*` VÀ mỗi nút của `ALLOWED_EDGES` có `{ ten, moTa }` tiếng Việt ở `src/shared/tro-ly-cau-truc-ten.ts`; mỗi ô của `MATRIX` có `{ ten, moTa }`. (b) Bộ sinh gặp module / ô thiếu tên ⇒ NÉM LỖI, câu tiếng Việt nêu ĐÚNG mã còn thiếu. (c) Tên thừa (module / ô không còn) ⇒ ném lỗi. | `src/shared/tro-ly-cau-truc.test.ts` ca "Đ1 …" |
| 2. Bộ sinh kho (d), (e) | (a) Kho (d) có: một đoạn tổng quan các phân hệ; mỗi phân hệ một đoạn (lo việc gì, dựa vào phân hệ nào, được phân hệ nào dựa vào — từ `ALLOWED_EDGES`, bỏ cạnh tới Nhật ký); luồng chính 6 bước (đơn → xác nhận → phụ trách → xếp xe → tiền → hoàn tất), mỗi bước ghi ai làm được (tính từ `MATRIX`) và trang / nút (lấy từ kho (e)); mỗi vai một đoạn "làm được / không làm được" (từ `MATRIX` + `PERMISSION_CODES`, dịch qua bảng tên); mỗi việc (ô quyền) một đoạn "ai làm được". (b) Ô chưa có máy chủ nào hỏi (`can(`/`MATRIX[` trong `src/modules`, cùng cách đếm của `src/permission-enforcement.test.ts`) KHÔNG vào danh sách "làm được" (bài học 24/9). (c) Kho (e): mỗi trang có nhóm menu (BÁN HÀNG / QUẢN TRỊ / QUẢN TRỊ › Vận chuyển / TÔI, từ `navGroups` của `web/shell.ts`) và bố cục theo thứ tự: mục `h2`/`h3`, nút thuộc mục nào, thanh nút cuối trang (`.form-actions`). (d) Trang Tạo đơn: thứ tự mục Chọn ngày → Dịch vụ → Thanh toán → Thông tin khách hàng → Tóm tắt → Thanh nút cuối trang chứa "Lưu, chờ xác nhận". (e) Đổi tên một nút trong dữ liệu vào ⇒ kho ra tên MỚI, không còn tên cũ (đặc tả mục 5 dòng 4). | `tro-ly-cau-truc.test.ts` ca "Đ2 …" |
| 3. Tự sinh lúc build + trước `npm test` | (a) Script `build:web` BẮT ĐẦU bằng `node scripts/sinh-so-do-trang.mjs`. (b) `scripts/chay-test.mjs` gọi bộ sinh TRƯỚC bước 1; bộ sinh lỗi ⇒ `npm test` đỏ; tệp sinh vừa đổi ⇒ vẫn chạy bài trên bản mới rồi thoát ≠ 0 kèm câu "đã sinh lại … — commit". (c) Chạy lại bộ sinh ra ĐÚNG hai tệp đang có (`so-do-trang.ts`, `tro-ly-cau-truc.ts`). (d) Bộ sinh chỉ ghi khi nội dung khác (ghi tạm rồi đổi tên) — lần chạy thứ hai không ghi gì. | `tro-ly-cau-truc.test.ts` ca "Đ3 …" + `tro-ly.test.ts` ca "chạy lại bộ sinh" |
| 4. Luật lõi số 2 | (a) Lời nhắc CHO PHÉP giải thích mức khái niệm: phân hệ nào lo việc gì, vì sao bước trước bước sau, vì sao một vai không thấy nút. (b) Vẫn TỪ CHỐI (câu `CAU_TU_CHOI` nguyên văn): mã nguồn; tên bảng / cột / hàm / tệp / đường dẫn API; máy chủ, hạ tầng, cơ sở dữ liệu; bí mật, mật khẩu, PIN, khoá; cấu hình; cách lách quyền; giá, số tiền của đơn cụ thể; dữ liệu khách; luật nội bộ ngoài tài liệu. (c) Bài hàng rào ADR-0069 giữ nguyên (luật lõi đứng trước, "luật 1–6 ở trên luôn thắng"). | `tro-ly.test.ts` ca "Đ4 …" + `tro-ly-bang-dieu-khien.test.ts` (không đổi) |
| 5. Bộ lọc tên kỹ thuật | (a) Hàm thuần `viPhamKyThuat` bắt: tiền tố bảng (`ord_`, `vc_`, `bil_`, `pty_`, `stf_`, `tl_`, `ntf_`, …) và mọi tên dạng `a_b`; `/api/`; đuôi `.ts` `.mjs` `.sql` `.js`; tên module tiếng Anh viết thường đứng riêng; `SELECT`/`INSERT`/`UPDATE`/`DELETE`; `D1`; `Worker`; `Cloudflare`; mã quyền (`SUPER_ADMIN`…); mã ô quyền (`order.view`…). Chữ tiếng Việt thường KHÔNG bị bắt. (b) Bộ sinh gặp vi phạm ⇒ ném lỗi (không âm thầm bỏ). (c) `viPhamKho` áp CẢ `viPhamChu` LẪN bộ lọc này cho MỌI đoạn của kho (a)–(e) — `viPhamKho()` = `[]`. | `tro-ly-cau-truc.test.ts` ca "Đ5 …", `tro-ly.test.ts` ca A3 |
| 6. Chi phí / tìm đoạn | (a) `chiaKho` có đoạn "Cấu trúc app › …" và trang có bố cục. (b) Ngân sách `chonDoan` ≤ 6.000 token ước. (c) "Vì sao tôi không xác nhận được đơn?" (Bán hàng) ⇒ đoạn được chọn có "Cách app vận hành › Mốc 6 giờ và Đặt gấp" và đoạn luồng chính bước Xác nhận. (d) "Nút Lưu nháp ở đâu?" ⇒ được chọn có đoạn luồng bước Lập đơn (chứa "Lưu, chờ xác nhận" + thanh nút cuối trang Tạo đơn) và đoạn "Sơ đồ trang › Tạo đơn". (e) "App dùng cơ sở dữ liệu gì?" ⇒ không đoạn được chọn nào vi phạm bộ lọc kỹ thuật; lời nhắc có luật từ chối "cơ sở dữ liệu". (Máy giả không chấm được câu trả lời của mẫu — chỉ kiểm lời nhắc và đoạn chọn.) (f) Các bài `timDoan` cũ vẫn xanh. | `tro-ly-cau-truc.test.ts` ca "Đ6 …" + `tro-ly.test.ts` |

Hàng rào ghi vào `docs/SO-HANG-RAO.md` (mỗi dòng phải có ngày quan sát đột biến đỏ → hoàn nguyên): bộ lọc tên kỹ thuật; thiếu tên lời thường ⇒ đỏ; tự sinh lúc build.

Kiểm cuối: `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- tro-ly pwa` (+ đủ bộ nếu máy cho phép), Chrome `tro-ly-smoke.mjs` + `bang-dieu-khien-tro-ly-smoke.mjs`.

## Quyết định của người thi công (bề mặt, đảo ngược được — P8)

1. **Tệp sinh GIỮ trong git** (`src/shared/so-do-trang.ts`, `src/shared/tro-ly-cau-truc.ts`). Lý do: (i) chữ gửi sang OpenAI hiện trong diff để người duyệt đọc được; (ii) `tsc` / `node --test` chạy được ngay trên bản clone mới; (iii) cùng khuôn `npm run dict`. Bảo đảm "production không lệch mã": `build:web` (mà `wrangler deploy` chạy qua khoá `build` của `wrangler.jsonc` TRƯỚC khi đóng gói Worker) luôn sinh lại ⇒ Worker luôn đóng gói bản khớp mã, kể cả khi ai đó quên commit tệp sinh. Bài "chạy lại ra đúng tệp" + bước trước của `npm test` bắt tệp trong git bị cũ. Hoàn tác: thêm hai tệp vào `.gitignore` + `git rm --cached`.
2. **Không chuyển `ALLOWED_EDGES` ra khỏi `src/architecture.test.ts`** (đó là hàng rào; di chuyển = sửa hàng rào). Bộ sinh ĐỌC TĨNH khối đó; khoá đọc được phải phủ mọi thư mục `src/modules/*`, không thì ném lỗi.
3. **"Làm được" chỉ gồm ô có máy chủ hỏi** — ô chỉ có trên bảng (hôm nay: `task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`, ghi hoãn ở `docs/quyen-hoan.json`) không vào danh sách, để trợ lý không hứa việc app chưa có.
4. **Cạnh tới Nhật ký bị bỏ** khỏi câu "dựa vào" (gần như mọi phân hệ ghi nhật ký — lặp vô ích); mô tả phân hệ Nhật ký nói chung "mọi phân hệ ghi dấu vết vào đây".
5. **Kho (c) và (e) chung một đoạn mỗi trang** ("Sơ đồ trang › <tiêu đề>"): dữ liệu giữ cả danh sách nhãn phẳng (c) lẫn bố cục (e); đoạn gửi đi dựng từ bố cục (đỡ gửi trùng chữ).
6. **Bố cục từ mã giao diện (`web/*.ts`) là xấp xỉ**: nút gán cho tiêu đề mục gần nhất ĐỨNG TRƯỚC trong mã; đoạn gửi đi ghi rõ "dựng khi trang chạy, có thể nằm trong hộp thoại". Bố cục từ HTML tĩnh là chính xác theo thứ tự tệp.

## Nhật ký

(điền khi làm)
