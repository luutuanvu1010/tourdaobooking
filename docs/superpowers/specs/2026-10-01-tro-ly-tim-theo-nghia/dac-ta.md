# Đặc tả — Trợ lý Hỗ trợ: tìm đoạn theo nghĩa trộn từ khoá (lượt 2)

- **Trạng thái:** bản nháp, chờ chủ dự án duyệt **cùng** ADR-0076 (cùng thư mục).
- **Ngày:** 2026-10-01. **Mốc mã:** `origin/main` = `c62ffc6d` (production 1.54). **Nhánh:** `tro-ly-tim-theo-nghia`.
- **Xây trên lỗ đang hở:** không có.
- **Ngoài phạm vi:** ô chỉnh cách tìm trong Bảng điều khiển (chủ chọn "đặt sẵn"); đổi lời nhắc; đổi ngân sách 6.000 token.

## 1. Vì sao

Tìm từ khoá kéo đoạn lạc đề khi câu hỏi diễn đạt khác chữ trong hướng dẫn (ví dụ "sao app khó dùng thế" → 12 đoạn không liên quan). Tìm theo nghĩa chọn đoạn gần ý câu hỏi; trộn với từ khoá để tên nút chính xác vẫn tìm đúng.

## 2. Tiêu chí nghiệm thu (viết trước khi làm, P20)

**Dấu vân nghĩa của đoạn (Đ2)**
- V1. Khoá đoạn = SHA-256 hex của (nội dung đoạn đã định dạng + "|" + mã mẫu + "|" + số chiều) — hàm thuần, có test (cùng nội dung → cùng khoá; đổi 1 ký tự → khoá khác; đổi mẫu → khoá khác).
- V2. Câu hỏi đầu tiên khi bảng rỗng: máy chủ gọi Embeddings **một lần** cho mọi đoạn thiếu (lô ≤ giới hạn của API; quá thì chia lô) + một lần cho câu hỏi; ghi đủ dòng `tl_van_nghia`. Câu hỏi thứ hai: **không** gọi lại cho đoạn (chỉ gọi cho câu hỏi) — đếm lần gọi API giả.
- V3. Thêm / sửa một đoạn "Ngữ cảnh bổ sung" → câu hỏi kế tiếp chỉ tính bù **đúng** đoạn đó.
- V4. `tl_van_nghia` chỉ-thêm: trigger cấm UPDATE / DELETE; CHECK số chiều > 0, độ dài BLOB = số chiều × 4.
- V5. Véc-tơ đã đọc được giữ trong bộ nhớ isolate theo khoá; lần hỏi kế tiếp trong cùng isolate không đọc lại D1 cho khoá đã có (đếm truy vấn trong bài).

**Chọn đoạn trộn (Đ3)**
- C1. Hàm thuần `chonDoanTron(cauHoi, vecCauHoi, kho, vecDoan, perms)`: RRF của thứ hạng BM25 và thứ hạng cô-sin; bỏ đoạn có cô-sin < ngưỡng **và** không khớp từ khoá; giữ trọng số vai, ngân sách 6.000 token, tối đa 12 đoạn — có test với véc-tơ giả đặt tay.
- C2. Đoạn khớp tên nút chính xác (từ khoá) vẫn được chọn dù cô-sin thấp (test).
- C3. Câu hỏi không khớp từ khoá nào nhưng gần nghĩa một đoạn → đoạn đó được chọn (test).
- C4. Câu "sao app khó dùng thế" với kho thật + véc-tơ giả mô phỏng: không còn chọn đủ 12 đoạn chỉ vì chữ "dùng" (bài thuần chứng minh ngưỡng cô-sin cắt đoạn lạc đề).
- C5. Truy vấn tìm = câu hỏi hiện tại + câu hỏi lượt trước gần nhất (giữ ADR-0073 N5); embedding tính trên chuỗi đã che.

**Lùi về từ khoá (Đ4)**
- L1. Embeddings trả lỗi / quá giờ / thiếu khoá → chọn đoạn bằng từ khoá như hôm nay; câu trả lời vẫn 200; log chỉ `{"event":"tro_ly_van_nghia_loi"}` (không nội dung).
- L2. Lỗi khi đang tính bù đoạn → không ghi dòng dở; lần sau tính lại.

**Tiền và trần (Đ5)**
- P1. `chi_phi_micro_usd` của lượt = tiền mẫu trả lời + tiền embedding (câu hỏi + lô bù nếu có), làm tròn lên micro-USD; có test số.
- P2. Kiểm trần trước khi gọi cộng chi phí tối đa embedding (câu hỏi + số đoạn thiếu × token ước) — hết trần → 429 như hiện nay, không gọi API nào.
- P3. Ô thử (`POST /api/tro-ly/thu`) dùng cùng đường tìm, tiền tính như P1, `la_thu = 1`.

**Hiển thị (Đ6)**
- H1. Phản hồi ô thử thêm `doanDaChon: [{ ten, theoNghia: boolean, theoTuKhoa: boolean }]`; Bảng điều khiển hiện danh sách này dưới kết quả thử (tiếng Việt: "Đoạn đã dùng", nhãn "khớp nghĩa" / "khớp từ khoá").

**Giữ nguyên (hồi quy)**
- G1. Mọi hàng rào ADR-0073 (che câu hỏi, chữ người dùng chỉ ở `input`, lọc số tiền, nhớ theo `staff_id`, kiểm trần trước khi gọi, `settings.ops`) vẫn xanh.
- G2. Thân yêu cầu Embeddings không có `user` / định danh; chỉ chữ đã che (câu hỏi) hoặc nội dung đoạn kho.

## 3. Dữ liệu

- Migration mới số tạm **`0062`** (main tới `0060`; `0061_aut_session` giữ ở nhánh đăng nhập; gộp sau thì đổi tên): bảng `tl_van_nghia` (`khoa` TEXT PRIMARY KEY, `mau` TEXT NOT NULL, `so_chieu` INTEGER NOT NULL CHECK > 0, `vec` BLOB NOT NULL CHECK `length(vec) = so_chieu * 4`, `created_at`); trigger chỉ-thêm.
- `docs/data-dictionary.json` + `npm run dict`.
- Không đổi `tl_luot_hoi` (tiền embedding cộng vào `chi_phi_micro_usd` sẵn có).

## 4. Mã (chỗ đặt)

- `src/shared/tro-ly-van-nghia.ts` (thuần): khoá đoạn, cô-sin, RRF, `chonDoanTron`, chi phí embedding, giá + mẫu embedding (hằng, ngày tra giá).
- `src/modules/tro-ly/`: gọi `/v1/embeddings` (cùng khung gọi OpenAI, hạn giờ), repository `tl_van_nghia`, bộ nhớ isolate, nối vào route hỏi + route thử qua **một** hàm dùng chung (không chép khối).
- Giao diện: `web/tro-ly-cai-dat.ts` hiện "Đoạn đã dùng" ở kết quả thử.

## 5. Kiểm thử và hàng rào

- Bài thuần V1, C1–C5, P1 (đỏ trước).
- Route với OpenAI giả (đếm lần gọi `/v1/embeddings` và `/v1/responses`): V2, V3, V5, L1, L2, P2, P3, H1, G1, G2.
- Migration test V4. e2e `tro-ly` mở rộng (OpenAI giả có `/v1/embeddings`). Kịch bản Chrome bảng điều khiển: thấy "Đoạn đã dùng".
- Sổ hàng rào: (a) lùi về từ khoá khi embedding lỗi; (b) tiền embedding vào lượt + kiểm trần trước khi gọi — mỗi dòng có ngày quan sát chặn thật.
- Kiểm độc lập (tiền + dữ liệu).

## 6. Giả định và điều chưa chắc

- **Chưa kiểm:** giá + tham số `dimensions` của mẫu embedding — tra trang OpenAI lúc thi công, ghi ngày; giới hạn số đầu vào một lô.
- **Giả định (bề mặt, đổi được trong mã):** mẫu `text-embedding-3-small`, 512 chiều, ngưỡng cô-sin và hằng RRF chọn bằng bài thuần + 12 câu mẫu.
- Đánh giá thật: chạy lại bộ 12 câu mẫu (`docs/evidence/2026-10-01-tro-ly-thong-minh/bo-cau-mau.md`) sau triển khai, so với trước.

## 7. Trang ghép (`CLAUDE.md` §9)

**(1) Bảng chứa gì:** `tl_van_nghia` (mới) — chỉ véc-tơ của **nội dung kho tri thức** (hướng dẫn, kiến trúc lời thường, sơ đồ trang, ngữ cảnh bổ sung đã lọc); **không** câu hỏi, không dữ liệu khách / nhân viên. `tl_luot_hoi` — không đổi cột; tiền gồm cả embedding.

**(2) Dòng bản đồ quyền:** không ô mới. `assistant.ask` (vai được bật) và `settings.ops` (Toàn quyền, ô thử) gián tiếp làm máy chủ ghi `tl_van_nghia` khi tính bù; không route nào đọc / ghi bảng này trực tiếp.

**(3) Cổng canh cửa:** route hỏi / thử như ADR-0073 (không đổi); embedding chỉ gửi chữ đã che hoặc nội dung kho; tiền → cộng vào lượt + kiểm trần trước khi gọi; CSDL → trigger chỉ-thêm + CHECK độ dài; **giao diện:** chỉ thêm danh sách "Đoạn đã dùng" ở ô thử (trang `/tro-ly-cai-dat` vẫn chỉ hiện với `settings.ops`) — không đổi chỗ ẩn/hiện nào.

## 8. Việc tiếp theo

1. Chủ duyệt ADR-0076 + đặc tả.
2. Kế hoạch thi công → thi công từng phần → kiểm độc lập → `npm run day-len` + `npm run trien-khai` (chủ chạy) → chạy lại 12 câu mẫu.
