# Nhật ký thi công: Vé hỗ trợ đợt 2a (16–17/10/2026)

Kế hoạch: `docs/superpowers/plans/2026-10-16-ve-ho-tro-dot-2a.md` · đặc tả `docs/superpowers/specs/2026-10-16-ve-ho-tro-dot-2a-design.md` (bản 2) · ADR-0127. Nhánh `claude/support-ticket-module-eb6445`, BASE `7b46da8d`. Chép gọn từ sổ điều phối (`.superpowers/sdd/2026-10-16-ve-ho-tro-dot-2a/progress.md`) và báo cáo từng việc; kế hoạch và ADR là hồ sơ có ngày, không sửa.

## Lệch số so với hồ sơ đã duyệt

- **Migration thật là `0106_ve_ho_tro_2a.sql`**, không phải `0104` như ADR-0127 và kế hoạch ghi «dự kiến». Lúc thi công Việc 1 (2026-10-17), số lớn nhất trên mọi nhánh là `0105_ho_so_tu_khai.sql` (nhánh hồ sơ riêng tư có `0103`–`0105`, chưa gộp). Không sửa ADR đã duyệt. Bài migration tìm tệp theo đuôi `_ve_ho_tro_2a.sql`, không gắn cứng số. Nếu nhánh này gộp trước nhánh hồ sơ riêng tư, `main` nhảy `0102` → `0106` (wrangler theo tên, chấp nhận được).
- **Số phiên bản nhật ký thay đổi: 2.10 là số TẠM** (Việc 6): `main` và production đều 2.9 lúc kiểm (2026-10-17); nhánh này chưa có mục 2.9 của `main`. Phiên gộp / phát hành kiểm lại số kế tiếp (bước A.0 của `docs/HANDOFF-N1.md`).

## Ruling của điều phối

| Mã | Quyết định | Loại |
|---|---|---|
| R1 | Số migration / ADR / phiên bản kiểm lại ở Việc 1 và Việc 6, không tin số trong kế hoạch | quy trình |
| R2 | Tên ô quyền «xem đơn của chính mình» để Việc 3 xác định từ `MATRIX`; không có ô hợp thì dừng hỏi, không tự thêm ô | quyền |
| R3 | Cạnh `feedback → orders` siết chỉ ba view `v_ord_order_owner` / `_label` / `_state` và cấm import `../orders` — hàng rào ở `src/architecture.test.ts` (Việc 3) + dòng sổ hàng rào (Việc 6) | kiến trúc, siết |
| R4 | Đặt lại cùng mức ưu tiên vẫn ghi nhật ký; đổi mức trên phiếu đã đóng được; hàng đợi Toàn quyền (`LIST_QUEUE`) cũng sắp theo mức | bề mặt, đảo ngược được |
| R5 | Ô quyền của `my-orders` = `order.view` với `{ ownerId: staff.id }`; `POST /api/feedback` kèm `orderId` cũng hỏi ô này (an toàn hơn kế hoạch: tài khoản bị rút quyền xem đơn không gắn được đơn cũ) | quyền, siết |
| R6 | Lỗ đợt 1 (giao phiếu cho tài khoản bên ngoài còn dòng thành viên cũ ⇒ 200, phiếu kẹt) nằm trong phạm vi vì đặc tả 2.4 đã duyệt đòi 400 ⇒ vá ở vòng sửa Việc 4, cả `/xu-ly` lẫn tuyến cũ | quyền, theo đặc tả |
| R7 | Người giữ không hợp lệ hiện «(đã nghỉ hoặc rời nhóm)»; phiếu đổi nhóm mà người xem vẫn đọc được thì hiện nút «Tải lại phiếu» (không tự nạp chi tiết để khỏi ghi «đã xem») | bề mặt, đảo ngược được |

## Dựa vào kỷ luật (chưa có hàng rào máy)

Ghi cùng nội dung ở dòng cuối các dòng «Vé hỗ trợ đợt 2a» của `docs/SO-HANG-RAO.md`; việc còn mở ở `docs/BACKLOG.md` mục «Vé hỗ trợ — nợ đợt 1».

1. Luật (1)/(1b)/(1c) của `src/route-write-guard.test.ts` chỉ xét lời gọi hàm quyền không đứng trơ làm một câu lệnh; «gọi rồi bỏ kết quả» (`const q = quyenPhieu(…); void q;`) vẫn xanh — đã thấy lọt thật ở Việc 4 (phép phá 9). Bài đường thật của từng route canh.
2. Hơn 100 tin cùng một mili giây ở bước «gọi tiếp ngay» có thể bỏ sót tin 101 ở lần đó; vòng thường kế tiếp bắt lại trừ khi trong 30 giây có hơn 100 tin (`BL-VE-CUNG-MILI-GIAY`).
3. Khoảng hở kiểm-rồi-ghi khi giao việc: quyền bên ngoài được thêm đúng giữa `nguoiNhanNgoai` và lô ghi thì lệnh vẫn qua (`PATCH_TICKET` không biết quyền bên ngoài vì R6 không cho chép mã quyền vào SQL).
4. Phiếu đã kẹt từ trước bản vá R6 không tự lành: `nguoiGiuHopLe` / `assigneeActive` vẫn coi người giữ bên ngoài còn dòng cũ là hợp lệ. Gỡ tay: Trưởng nhóm / Toàn quyền giao lại hoặc bỏ gán. Vá đụng R6 nên chờ chủ (`BL-VE-PHIEU-KET-NGOAI`).

## Từng việc (commit trên nhánh)

- **Việc 1** `ea4e0f21`, `0c4791c1` (lưu tệp sinh): migration `0106`, hằng `PRIORITIES`, DTO, hành động nhật ký `feedback_priority_changed`, cạnh `feedback → orders`, từ điển dữ liệu.
- **Việc 2** `9eb9bb53`: mức ưu tiên qua `PATCH …/xu-ly`, sắp hàng đợi, `POST` bỏ qua `priority`, khoá kiểu `PATCH_BODY_KEYS_KHOP`.
- **Việc 3** `a281ec1a`, `f9e45851`: `GET /api/feedback/my-orders`, gắn đơn khi gửi (một câu lỗi cho mọi cách hỏng), hàng rào R3.
- **Việc 4** `775df99a`, `dde837fc`, `c89ace6e`, vòng sửa 1 `c4955405`: tuyến làm mới `…/:id/messages` (không ghi mốc đã xem), tuyến thành viên `…/teams/:id/members`, vá R6 ở hai route giao việc, `assigneeActive` trong đầu phiếu.
- **Việc 5** `daa3cac6`, `db4ddcb7`, `5c47f32d`, `a41dec03`: luật thuần làm mới, giao diện bong bóng tự làm mới, mức ưu tiên, đơn liên quan, «Giao cho người khác», Trợ giúp, kịch bản Chrome.
- **Việc 6**: dồn sửa nhỏ của người kiểm Việc 4–5 (ca đối chứng R6 «gửi lại đúng người giữ bên ngoài», ẩn khối đầu phiếu / chuyển nhóm khi phiếu rời nhóm, dựng lại khối chuyển nhóm khi trạng thái đổi, chú thích lạc ở token CSS); vá bài «tuyến làm mới KHÔNG ghi gì» đỏ chập chờn (trùng mili giây với mốc đã xem); khối e2e đợt 2a; sổ hàng rào; tài liệu mô tả; nhật ký thay đổi 2.10 (số tạm). Người kiểm độc lập cả nhánh và bàn giao lệnh: điều phối làm.
