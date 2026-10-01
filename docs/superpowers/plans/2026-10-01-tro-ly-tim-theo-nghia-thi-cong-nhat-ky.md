# Nhật ký thi công — Trợ lý Hỗ trợ tìm theo nghĩa (ADR-0082, lượt 2)

- **Kế hoạch:** `docs/superpowers/plans/2026-10-01-tro-ly-tim-theo-nghia-thi-cong.md`. **Nhánh:** `tro-ly-tim-theo-nghia`. **Mốc:** origin/main `c62ffc6d` (production 1.54).
- **Lời duyệt (nguyên văn, 2026-10-01):** ADR-0082 + đặc tả — chủ "duyệt, lập kế hoạch đi"; thi công — chủ "đồng ý, bắt đầu thi công đi" (cách "làm từng phần", subagent-driven).
- **Hộp hỏi gom 2026-10-01:** "OpenAI"; "Trộn cả hai"; "Không, đặt sẵn".

## Tra cứu OpenAI (Task 1)

Ngày tra: 2026-10-01 (người thi công mở lại bằng WebFetch; khớp số kỳ vọng).
- `https://developers.openai.com/api/docs/models/text-embedding-3-small`: giá 0,02 USD / 1 triệu token (không phân biệt batch) ⇒ `GIA_NHUNG` = 20.000 micro-USD.
- `https://developers.openai.com/api/reference/resources/embeddings/methods/create`: mảng `input` ≤ 2048 phần tử; ≤ 8192 token mỗi đầu vào; ≤ 300.000 token tổng mỗi yêu cầu; không nhận chuỗi rỗng; `dimensions` chỉ có ở `text-embedding-3` trở lên; `encoding_format` `float` | `base64`; phản hồi `data[].index` + `embedding`, `usage.prompt_tokens`.

## Số đo luật khớp mạnh (Task 2)

Đo 2026-10-01 trên kho thật (`chiaKho()`, 214 đoạn), vai `SALES`, mọi véc-tơ đoạn trực giao câu hỏi (chỉ còn đoạn khớp mạnh); lệnh: `node --test src/shared/tro-ly-van-nghia.test.ts` (bài C4) + kịch bản đo tạm gọi `khopManh` / `chonDoanTron`:
- "sao app khó dùng thế" → 1 khớp mạnh → chọn `Bán hàng › Điều phối xe — chưa dùng cho chuyến thật`.
- "đổi mã PIN thế nào" → 10 khớp mạnh → chọn đủ 10, có `Phần chung › Trang Tôi, đổi PIN, đăng xuất`.
- "lập đơn mới ra sao" → 41 khớp mạnh → RRF + trần 12 đoạn chọn 12, đầu là `Cấu trúc app › Việc: lập đơn mới`, có `Bán hàng › Lập đơn mới`.
- Khớp số kỳ vọng của kế hoạch (1 / 10 / 41) ⇒ không kích hoạt D3. Bài C4 khoá thêm tên cụ thể (ruling F7) thay cho "1 ≤ số ≤ 12" của bản kế hoạch.
- F5: điểm từ khoá × hệ số vai chỉ một chỗ (`diemTuKhoa` + `heSoVai` ở `src/shared/tro-ly.ts`); `chonDoanTron` tính BM25 MỘT lần mỗi câu (hàm nội bộ `tuKhoaVaManh` dùng chung với `khopManh`) — lệch nhỏ khỏi mã mẫu của kế hoạch (mẫu gọi `diemTuKhoa` hai lần).

## Đột biến hàng rào (sửa cố ý → đỏ → hoàn nguyên → xanh)

- Task 2, 2026-10-01: bỏ nhánh `x.coCap ||` trong luật khớp mạnh → C4 đỏ; hạ `TY_LE_DIEM_MANH * max` thành `0.3 * max` → C4 đỏ; hoàn nguyên → 45/45 xanh (`tro-ly-van-nghia.test.ts` + `tro-ly.test.ts`).
- Task 2 vòng sửa 1, 2026-10-01: điểm × vai nay chỉ ở `diemTuKhoaTheoVai` (`src/shared/tro-ly.ts`), `timDoan` và `tuKhoaVaManh` cùng gọi. Thêm bài biên (vecDoan null + khớp mạnh; véc-tơ toàn 0; vecDoan ngắn hơn kho) và bài nhánh cặp âm tiết riêng ("có hàng"). Bỏ `x.coCap ||` → C4 VÀ bài nhánh cặp đỏ; hoàn nguyên → 22/22 xanh.
- Task 4, 2026-10-01 (ruling điều phối: cấm `OR REPLACE` trên `tl_van_nghia` — REPLACE của SQLite xoá dòng xung đột mà không chạy trigger chặn DELETE): hàng rào quét chuỗi trong `src/**/*.ts` (trừ `*.test.ts`, bỏ dòng chú thích) ở `src/modules/tro-ly/van-nghia.test.ts`. Đổi câu `them-van-nghia` ở `src/modules/tro-ly/repository.ts` thành `INSERT OR REPLACE INTO tl_van_nghia …` → bài "HÀNG RÀO: không câu SQL nào…" đỏ (9/10); hoàn nguyên → 10/10 xanh (`node --test src/modules/tro-ly/van-nghia.test.ts`).

## BLOB trên D1 local thật (Task 6)

- 2026-10-01, `npm run test:e2e -- tro-ly` (wrangler dev + D1 local tạm): nhánh A, `Uint8Array` được D1 nhận làm BLOB, không cần sửa `vanNghiaStatement`.
- `vn` = `{"n":214,"b":214,"mn":2048,"mx":2048,"sc":512}` (214 dòng, cả 214 là blob, độ dài 2048 = 512 × 4).
- Lượt hỏi đầu: 2 lần gọi `/v1/embeddings`, tiền embedding 44 micro-USD, chi phí lượt 494 = 450 + 44.

## Kiểm

(điền ở Task 9)
- Đổi số ADR 0076 → 0082 ngày 2026-10-01 (main đã dùng 0076–0081); nội dung đã duyệt không đổi.
