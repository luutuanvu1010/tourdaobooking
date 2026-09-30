# Nhật ký thi công — Gộp hồ sơ cá nhân trùng (ADR-0068)

Kế hoạch: `docs/superpowers/plans/2026-09-30-gop-ho-so-thi-cong.md`. Nhánh: `worktree-gop-ho-so`. Cách thi công: subagent-driven (chủ chọn "làm từng phần").

## Lời duyệt

- 2026-09-30: chủ chọn "1, làm chức năng gộp hồ sơ"; hộp hỏi gom: "Gộp tay + danh sách gợi ý", "Không có nút hoàn tác", "Quản trị + Toàn quyền", "Làm luôn, phần nhỏ"; đồng ý thiết kế trình trong trò chuyện ("đồng ý, viết đặc tả và ADR đi").
- 2026-09-30: sau khi AI trình ADR + đặc tả, chủ trả lời "lập đi" → AI lập kế hoạch (AI KHÔNG tự ghi "accepted" từ câu này — máy phân loại chặn, đúng).
- **2026-10-01, hộp hỏi gom (nguyên văn lựa chọn):**
  - "Bạn duyệt bản quyết định gộp hồ sơ (ADR-0068) chưa, và thi công theo cách nào?" → **"Duyệt, làm từng phần (Recommended)"**.

## Trả lời Q1–Q5 (2026-10-01)

- Q2 "Hồ sơ phụ là nhà xe cá nhân đang đứng tên xe thì sao?" → **"Từ chối gộp (Recommended)"**.
- Q5 "Hồ sơ phụ có công việc/quan hệ bắt đầu từ ngày trong tương lai thì sao?" → **"Từ chối gộp (Recommended)"**.
- Q1 + Q3 + Q4 "Đồng ý 3 điểm kỹ thuật nhỏ theo khuyến nghị không? (số migration tạm 0054; thêm 2 hàm đọc nội bộ cho vận chuyển + công nợ; thêm 1 đường đọc để ô Thêm tài khoản hiện hồ sơ khớp ngay khi gõ)" → **"Đồng ý cả ba (Recommended)"**.

## Ruling / nợ

- Task 0 do điều phối làm trực tiếp (chỉ tài liệu; ghi `docs/adr/**` bật hộp hỏi quyền của chủ — trợ lý phụ sẽ kẹt ở hộp hỏi).
- Ruling: migration số tạm **0055_gop_ho_so.sql** theo luật 1.46 của `docs/adr/README.md` (không giữ chỗ; số lớn nhất main + 1 = 0055; nhánh gộp sau đổi tên — `0055_nhom_dich_vu` của nhánh thi-cong-luot-1 cũng đang dùng 0055, ai gộp sau đổi) — nếu sai: đổi tên tệp, test tìm theo đuôi.
