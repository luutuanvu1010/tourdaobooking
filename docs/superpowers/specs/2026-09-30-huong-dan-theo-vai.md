# Hướng dẫn người dùng theo vai (trong app + Google Docs) — đặc tả ngắn

- **Ngày:** 2026-09-30. **Trạng thái:** thi công lượt 1 (đủ 6 nhóm vai). Bản mô tả, không phải ADR.
- **Nguồn quyết định:** rà soát 30/9 (`2026-09-30-ra-soat-luong-giao-dien-phan-loai-huong-dan.md` §4, §6: chủ chọn "Trong app + bản đọc ngoài, từ 1 nguồn"). Chủ giao thêm 30/9 (chat): làm **toàn diện, phân theo vai: Quản trị, Bán hàng, Kế toán, Hướng dẫn viên, Đối tác, Tài xế**, "chỉ trong 30 phút là đọc hiểu và sử dụng được". Hộp hỏi 30/9 (nguyên văn lựa chọn):
  - Câu quyền "chữ hướng dẫn của mọi vai nằm trên mọi máy": **"Chấp nhận, có luật"** — chỉ tên nút và cách làm, không giá, không số liệu, không tên / SĐT thật; có bài kiểm canh.
  - Trợ lý AI hỏi đáp: **"Hướng dẫn trước, AI sau"** — AI soạn thành đề xuất quyết định riêng; nhà cung cấp ưu tiên **OpenAI**.
  - Bản đọc ngoài app: **Google Docs**.

## 1. Làm gì

1. **Một nguồn:** nội dung hướng dẫn nằm ở `src/shared/huong-dan.ts` + `src/shared/huong-dan-<nhóm>.ts` (mỗi nhóm vai một tệp phẳng, kiểu `changelog.ts`), viết bằng một tập con markdown nhỏ: `###` tiêu đề, đoạn văn, danh sách `1.` / `-`, `**đậm**`, `[[Tên nút]]` (tên nút / menu nguyên văn trong mã), dòng `> ` (ví dụ / lưu ý).
2. **Trong app:** trang **Trợ giúp** thêm khối "Hướng dẫn cho bạn" ở đầu: hiện các nhóm vai mà tài khoản đang giữ; mỗi nhóm có "Bắt đầu nhanh" mở sẵn + các mục chi tiết thu gọn. Có "Phần chung" (đăng nhập, cài app, thông báo, Góp ý) cho mọi người. Không `innerHTML`; dựng bằng `h()`.
3. **Ngoài app:** kịch bản `scripts/xuat-huong-dan.mjs` sinh một tệp HTML (mục lục theo vai) để đưa lên Google Docs; bản Google Docs là bản chụp có ngày, mỗi lần phát hành đổi hướng dẫn thì xuất lại.
4. **Nhật ký thay đổi:** thêm mục phiên bản mới (số chốt lúc gộp).

Nhóm vai ↔ quyền: Phần chung (mọi quyền) · Quản trị (`ADMIN`, `SUPER_ADMIN` — mục riêng "Chỉ Toàn quyền") · Bán hàng (`SALES`, `INTERN` — mục "Thực tập sinh") · Kế toán (`ACCOUNTING`) · Hướng dẫn viên (`FIELD`) · Đối tác (`PARTNER`) · Tài xế (`DRIVER`, `DRIVER_PARTNER`).

## 2. Tiêu chí nghiệm thu (viết trước khi làm)

- **A1** Mỗi mã quyền trong `PERMISSION_CODES` thuộc ít nhất một nhóm hướng dẫn (bài kiểm đỏ khi thêm quyền mới mà quên hướng dẫn).
- **A2** Mọi `[[Tên nút]]` trong hướng dẫn xuất hiện nguyên văn trong mã giao diện (`web/*.ts`, `public/*.html`, `src/shared/*.ts`) — bài kiểm đỏ khi đổi tên nút mà quên hướng dẫn. Giới hạn đã biết: chỉ biết "chữ còn tồn tại", không biết "vai đó có thấy nút đó".
- **A3** Luật nội dung (câu quyền của chủ): hướng dẫn không chứa số tiền (`\d+.\d{3} đ`, "VNĐ", "đồng"), chuỗi ≥ 9 chữ số (SĐT), địa chỉ email — bài kiểm đỏ.
- **A4** Ước lượng thời gian đọc: Phần chung + nhóm vai dài nhất ≤ 30 phút ở tốc độ 150 chữ/phút (bài kiểm tính số chữ).
- **A5** Trang Trợ giúp: tài khoản chỉ Bán hàng thấy Phần chung + Bán hàng, không thấy khối Quản trị; tài khoản Quản trị thấy Quản trị; tài xế thấy Tài xế (kiểm bằng hàm thuần chọn nhóm theo quyền + kịch bản Chrome).
- **A6** `npm test` xanh, `npm run typecheck` 0 lỗi, `npm run build:web` được.
- **A7** Người kiểm độc lập (chỉ đọc) đối chiếu nội dung từng vai với mã bản đang gộp: không có bước sai tên nút / sai quyền.
- **A8** Các bài A1–A3 đã **thấy chặn thật một lần** (sửa cố ý → đỏ → hoàn nguyên) và có dòng trong `docs/SO-HANG-RAO.md`.

## 3. Ngoài phạm vi / để sau

- **Trợ lý AI hỏi đáp** (OpenAI ưu tiên): đề xuất quyết định riêng — dữ liệu nào được gửi ra ngoài (chỉ bộ hướng dẫn + sơ đồ, KHÔNG mã nguồn vì kho chứa mã Sheet và SĐT thật), khoá bí mật qua `wrangler secret`, tài khoản riêng cho AI (Hiến chương 5.11), giới hạn chi phí, AI không tính tiền (5.15).
- Sinh "Menu của bạn" tự động từ mô hình menu (tách khỏi `web/shell.ts`) — lượt sau.
- Hướng dẫn theo từng màn (nút "?" trên từng trang) — lượt sau.
