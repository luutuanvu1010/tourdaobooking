# Phân tích góp ý người dùng → kế hoạch thi công (2026-09-30)

> Tài liệu **mô tả / nháp**, không chuẩn tắc. Một mục ở đây không phải lời duyệt.
> Riêng tư: nội dung góp ý là chữ tự do, có thể chứa tên/SĐT khách. Ở đây chỉ gọi theo mã `YC-xxxx` và **diễn giải**, không chép nguyên văn.

## 0. Trạng thái

- Dữ liệu góp ý (bảng `fbk_ticket`, `fbk_message`) chỉ có trên D1 production. AI không được đọc D1 remote (CLAUDE.md §8, hàng rào `d1-remote-write` chặn mọi `d1 execute` không kèm `--local`). Chrome và Gmail chưa kết nối được trong phiên này.
- **Đang chờ chủ** chạy lệnh chỉ-đọc ở mục 5 rồi báo lại. Mục 2 điền sau khi có dữ liệu.

## 1. "Hoàn tất đơn hàng": đã thiết kế + đã duyệt, CHƯA thi công

- Giao diện hiện **không có** nút "Đã giao" / "Hoàn thành" (đo 30/9: `grep` trong `web/*.ts` rỗng).
- Luật đã duyệt 29/9: ADR-0024 điều 1–5, **ADR-0025** (hai bước), ADR-0026 (sổ công nợ).
  - **"Đã giao – đã thu đủ"** (ô `order.handover`): HDV đang phụ trách, Quản trị, Toàn quyền; từ ngày đi; chỉ khi đã thu = phải thu. Khoá mọi sửa/huỷ đơn.
  - **"Hoàn thành"** (ô `order.complete`): Kế toán, Toàn quyền; khi không còn ai nợ công ty vì đơn.
  - **Bán hàng (`SALES`) không có nút nào trong hai bước.** Nếu chủ muốn nhân viên bán hàng tự bấm thì đó là quyết định quyền mới → ADR mới (không sửa ADR-0025 đã duyệt).
- Kế hoạch thi công: `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md` (13 task, đã kiểm độc lập, 4 câu Q1–Q4 chủ đã trả lời 30/9).
- Điều kiện bắt đầu (Task 0) nay **đã thoả**: ADR-0049 lượt 1 đã lên `main` (bản 1.38, migration tới `0043`); ADR-0057 (nợ gắn chuyến, điều kiện của Task 3) đã duyệt 30/9. Số migration dự kiến `0044`, `0045` (kiểm lại lúc bắt đầu).
- 30/9: không có worktree/nhánh nào đang thi công sổ tiền (`git worktree list`, `git branch -a`).
- Việc cho phiên thi công (đã ghi ở bộ nhớ, chưa vào kế hoạch): mở rộng định dạng sổ vàng trước khi thêm ca lượt 1 (Task 5).

## 2. Phân loại góp ý (điền khi có dữ liệu)

Mỗi `YC-xxxx` vào đúng **một** nhóm:

| Nhóm | Nghĩa | Việc tiếp |
|---|---|---|
| (a) Đã có chỗ | Trùng ADR / kế hoạch / sổ tồn đọng | Trỏ tới chỗ đó, không thêm việc |
| (b) Việc nhỏ | Chữ, CSS, lỗi hiển thị (công thức `docs/CHANGE-GUIDE.md`) | Gom một nhánh, làm gọn |
| (c) Cần đặc tả/ADR | Chạm dữ liệu, quyền, tiền, luồng | Chủ quyết |
| (d) Câu hỏi / đã xử lý / từ chối | Trả lời hoặc đóng | Không thi công |

_(bảng chi tiết: chưa có)_

## 3. Danh sách đối chiếu (để xếp nhóm a)

- Sổ tồn đọng `docs/BACKLOG.md` mục 1–7 (đính kèm tệp thông báo; báo Quản trị mọi đơn; chuông khi HDV từ chối; Quản trị với giấy tờ cấp trên; ghi chú chuyến; gửi lại khi mất mạng; việc nhỏ điều phối lượt 1).
- Sổ tiền lượt 1 (mục 1 ở trên).
- ADR đã duyệt chưa thi công: ADR-0052 (điều phối lượt 2), 0053 (tài xế đối tác), 0054 (chiều về theo dịch vụ), 0055, 0056 (kernel lượt 2–3), 0057 (tiền xe thuê).

## 4. Đề xuất thứ tự thi công (nháp, chờ dữ liệu)

1. Lỗi đang chặn người dùng (nếu có trong góp ý) — nhánh việc nhỏ.
2. Sổ tiền lượt 1 = "Hoàn tất đơn" (đã duyệt, sẵn sàng) — phiên thi công riêng.
3. Các nhóm (c) theo thứ tự chủ chọn.

## 5. Lệnh chỉ-đọc để chủ lấy góp ý

Chạy trong **Terminal riêng** (hàng rào của AI chặn lệnh này), đứng ở thư mục `tourdao-sales`:

```
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --json --command "SELECT t.seq, t.kind_code, t.status_code, t.title, t.created_at, t.resolved_in, m.internal, m.created_at AS msg_at, m.body FROM fbk_ticket t LEFT JOIN fbk_message m ON m.ticket_id = t.id ORDER BY t.seq, m.created_at" > /Users/tuanbao/.claude/jobs/96ce0902/tmp/gop-y.json
```

Lệnh chỉ `SELECT`, không ghi gì. Ghi chú nội bộ (`internal = 1`) giữ lại để biết Quản trị đã quyết gì.
