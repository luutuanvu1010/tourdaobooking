# Trang ghép — lượt duyệt «Hoa hồng + Hỗ trợ thiết kế lại» (25/10/2026)

Theo `CLAUDE.md` §9 (bước ghép khi duyệt). Lượt này có **ba** quyết định chạm quyền/dữ liệu — đúng trần ba:

| # | Quyết định | Tệp |
|---|---|---|
| Q-1 | Nới cổng tìm người hưởng: thêm Kế toán (quyền) | `DE-XUAT-ADR-cong-tim-nguoi-huong.md` |
| Q-2 | Máy chủ: tra theo loại, «Đổi» một bước cho dòng mức và gắn chính sách, liệt kê chính sách riêng; hỗ trợ: sự kiện, hàng đợi, mã nhóm, `mailPending` | `DAC-TA-MAY-CHU.md` |
| Q-3 | Giao diện hai trang, hai lượt bảng từ | `DAC-TA.md` |

## 1. Bảng bị chạm chứa những loại thực thể nào

Không bảng nào nhận thêm loại dữ liệu mới (không migration).

| Bảng | Chứa | Đợt này làm gì |
|---|---|---|
| `prc_commission_rule` | dòng mức hoa hồng với **ba loại đích**: một đối tác (`target_party_id`), một loại đối tác (`target_role_code`), một chính sách / mức TA (`target_tier_code`) | «Đổi» = đóng một dòng + chèn một dòng cùng đích, cùng phạm vi (A3) — áp cho cả ba loại đích |
| `prc_role_tier` | gắn loại đối tác ↔ chính sách | «Đổi chính sách» = đóng + chèn (A4) |
| `prc_party_tier` | gắn một đối tác ↔ chính sách (ADR-0138) | chỉ đọc (A5) |
| `v_pty_party_label` (view) | tên hiển thị của hồ sơ | đọc thêm cho `ganRieng` |
| `fbk_ticket_event` | sự kiện CLAIMED / ASSIGNED / TEAM_CHANGED | chỉ đọc (B1) |
| `fbk_ticket`, `fbk_message`, `fbk_team` | yêu cầu, tin, nhóm | đọc thêm số đếm, lọc (B2); chèn nhóm với mã máy sinh (B3) |

## 2. Dòng bản đồ quyền chạm các bảng này

| Ô quyền | Ai giữ | Áp cho | Đổi gì |
|---|---|---|---|
| `order.create` | Bán hàng, Quản trị, Đối tác, Toàn quyền, Thực tập | cổng `nguoi-huong` (một trong hai vế) và ô «Đặt qua đối tác» | **không đổi** ô; ô «Đặt qua đối tác» vẫn chỉ theo ô này |
| `partner.commission.write` | Kế toán, Quản trị, Toàn quyền | thêm/ngừng/đổi mọi loại đích ở `prc_commission_rule`, gắn/đổi `prc_role_tier` | **thêm** làm vế thứ hai của cổng `nguoi-huong`; cổng hai route «Đổi» mới |
| `partner.commission.view` | Bán hàng, Kế toán, Quản trị, Toàn quyền | xem bảng mức, tra (kể cả tra theo loại), `ganRieng` | không đổi ô; thêm dữ liệu đọc |
| `holdsPartner` (chặn thêm) | mọi tài khoản có quyền Đối tác, kể cả lai | mọi route pricing và `nguoi-huong` | không đổi |
| `quyenPhieu(...).doc` / `.xuLy` (feedback) | người gửi, thành viên nhóm, Toàn quyền | đọc `suKien`; `mailPending` ở chi tiết | `mailPending` ở chi tiết từ `feedback.triage` → `xuLy` (bằng nhóm người đã thấy nó ở hàng đợi) |
| `feedback.team.manage` | Toàn quyền | tạo nhóm | không đổi |

## 3. Cổng nào canh cửa nào

| Cửa | Cổng máy chủ | Cổng CSDL | Chỗ giao diện ẩn/hiện |
|---|---|---|---|
| tìm người hưởng theo tên | hàm cổng dùng chung (Q-1) | — | `coTheTimDoiTac` gọi **cùng** hàm → ô «Một đối tác», ô tên ở «Tra nhanh». **Đổi nghĩa:** với Kế toán, từ ẩn thành hiện |
| ô «Đặt qua đối tác» (form đơn, trang đơn) | `nguoi-huong` (nay rộng hơn) | — | `coODatQuaDoiTac` **giữ** `order.create` — chỗ dễ đổi nghĩa ngoài ý nếu gộp hàm; tiêu chí 3 của đề xuất ADR khoá lại |
| «Đổi» dòng mức / gắn chính sách | `can(partner.commission.write) && !holdsPartner`; điều kiện ngày; câu chèn `WHERE changes() > 0` | `close_only`, chống chồng, `target_*` của 0090/0096/0097 | nút Đổi/Ngừng chỉ ở dòng đang áp dụng, bắt đầu trước hôm nay, chưa có ngày ngừng, và theo `can(partner.commission.write)` |
| tra theo loại | `partner.commission.view && !holdsPartner`; loại phải đang được hưởng | — | danh sách loại hiện cho mọi người vào được trang |
| sự kiện của yêu cầu | `quyenPhieu.doc` (404 nếu không); chỉ người `xuLy` nhận `suKien`, người gửi nhận rỗng (Q2, mặc định an toàn) | bảng chỉ-thêm | dòng hệ thống trong luồng |
| `ganRieng` (chính sách riêng theo đối tác) | `partner.commission.view && !holdsPartner` — Bán hàng cũng thấy tên đối tác có chính sách riêng; không lộ thêm vì Bán hàng đã thấy mọi dòng mức theo đối tác ở `GET /hoa-hong` | — | mục «Đối tác có mức riêng hoặc chính sách riêng» |
| ghi chú nội bộ | `TIN_CHO_NGUOI_XEM` (không đổi) | — | chế độ «Ghi chú nội bộ» theo `perms.xuLy` |
| `mailPending` | `q.xuLy` | — | dòng email báo nhóm trong «Chi tiết» — **đổi nghĩa:** thành viên nhóm nay thấy (trước chỉ Toàn quyền) |
| tạo nhóm | `feedback.team.manage` | `NOT EXISTS code` | bảng «Nhóm hỗ trợ» chỉ Toàn quyền |

**Điểm nghi ngờ phải có bài chạy thật:** (a) Kế toán mở trang đơn sau khi nới cổng — không có ô «Đặt qua đối tác»; (b) hai người bấm «Đổi» cùng dòng — đúng một dòng mới; (c) người gửi — nhất là tài khoản bên ngoài — sau một lần chuyển nhóm và một lần giao lại: theo mặc định Q2 nhận `suKien` rỗng, không thấy tên người/nhóm cũ, không thấy lý do (QA1 25/10 bắt: sự kiện mang người và nhóm *trước đó*, nhiều hơn `assigneeName` / `teamName` hiện tại).
