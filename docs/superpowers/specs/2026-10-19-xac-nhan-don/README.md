# Hồ sơ quyết định — bước Xác nhận đơn (19/10/2026)

**Trạng thái: chờ chủ duyệt.** Bốn đề xuất ADR do AI soạn (Task 0.1 của `docs/superpowers/plans/2026-10-19-xac-nhan-don.md`), chưa có hiệu lực. Nguồn lời chủ: `../2026-10-19-xac-nhan-don-design.md` (mục 5b, 5c thắng phần trên) và `../2026-10-19-xac-nhan-don-luong-thuc-te.md`. Dòng nào là lựa chọn của người soạn ghi **[người soạn]** — chủ đọc kỹ các dòng đó.

## Thứ tự duyệt (mỗi lượt ≤ 3 quyết định chạm quyền / dữ liệu — CLAUDE.md §9)

| Lượt | Tệp | Mở việc gì |
|---|---|---|
| 1 | `DE-XUAT-ADR-0134-don-khong-don-khung-gio.md`, `DE-XUAT-ADR-0135-nhap-rieng-tu-khong-thu.md`, trang ghép `TRANG-GHEP-LUOT-1.md` | Đợt 1 (Đón / Không đón, khung giờ), Đợt 2 (nháp riêng tư, nháp không thu, bỏ ô Thanh toán trước) |
| 2 | `DE-XUAT-ADR-0136-buoc-xac-nhan-don.md`, `DE-XUAT-ADR-0137-thu-xac-nhan-va-qr-may-chu.md`, trang ghép `TRANG-GHEP-LUOT-2.md` | Đợt 3 (bước xác nhận), Đợt 4 (thư kèm QR, thư huỷ) |

Lượt 2 chỉ trình sau khi lượt 1 đã duyệt; lượt 1 đổi thì trang ghép lượt 2 phải soát lại.

**Cách đếm "≤ 3 quyết định":** mỗi ADR là một quyết định; mỗi lượt có **hai** ADR. Để chủ thấy hết phần chạm quyền / dữ liệu bên trong, các điều khoản đó liệt kê dưới đây:

| ADR | Điều khoản chạm dữ liệu | Điều khoản chạm quyền / tiền |
|---|---|---|
| 0133 | Đ1 cột `pickup_choice`; Đ3 cột `pickup_slot_end`; Đ5 bảng chính sách khung giờ | Đ6 đổi khung chỉ Toàn quyền (ô có sẵn) |
| 0134 | không đổi bảng | Đ1 đọc nháp chỉ người lập; Đ2 ghi nháp chỉ người lập; Đ4 hàng chờ nhận chỉ đơn đã xác nhận; Đ5 người phụ trách chọn sẵn; Đ6 tin; Đ7 nháp không ghi thu (cả chuyển cọc); Đ8 QR chỉ đơn đã xác nhận, bỏ ô Thanh toán trước; Đ9 lịch chung điều phối |
| 0135 | Đ1 bảng cờ dịch vụ; Đ2 bảng yêu cầu xác nhận; Đ5 bảng công tắc | Đ4 ô mới `order.confirm.review`; Đ5 ai quyết định; Đ6 nới đọc có giới hạn; Đ7 Hết vé tự gán lý do; Đ8 sửa tiền khi chờ; Đ10 tin cho Đối tác / Thực tập |
| 0136 | không bảng (nếu chọn Đ5 phương án b) | Đ1–Đ3 gửi dữ liệu ra ngoài (email, số tài khoản, số tiền); Đ4 mã bên thứ ba chạy ở máy chủ |

## Câu hỏi chủ cần trả lời khi duyệt lượt 1
1. **ĐÃ CHỐT — chủ chọn A (19/10).** **Đặt gấp cho nháp của người khác** (ADR-0135 Q1): nháp riêng tư làm Quản trị hết đường thấy đơn sát giờ của Bán hàng / Đối tác để bấm Đặt gấp. Khuyến nghị: nháp có chặng dưới mốc cũng phải "Gửi xác nhận", và không phát hành Đợt 2 trước Đợt 3.
2. **ĐÃ CHỐT — chủ đồng ý (19/10).** **"Chỉ người tạo đọc" có gồm "chỉ người tạo ghi"** (ADR-0135 Q2).
3. **Nháp cũ đã có khoản thu**: chủ đếm bằng lệnh ở Task 2.2 Step 0 của kế hoạch trước khi phát hành (lỗ TNV-G1).

## Số hiệu
**Đổi số 19/10 lúc chủ duyệt lượt 1:** bản soạn đầu dùng 0133–0136; ngay trước khi cấp, số 0133 đã bị nhánh chiết khấu theo loại khách (worktree optimistic-wu, chưa gộp) lấy, nên cả bốn lùi một số thành **0134–0137**. Migration cũng lùi: 0112, 0113 đã bị nhánh sổ đại lý đợt 2 (objective-euclid) giữ → việc này dùng **0114, 0115**. Số cấp **theo thứ tự chủ duyệt**: đề xuất cũ `../2026-10-18-tao-don-thiet-ke-lai/DE-XUAT-ADR-0130.md` còn mang số tạm đã bị dùng (0130 nay là ADR khác), nên có thể tranh số 0133 trở đi.

## Sau khi chủ duyệt
Chủ (hoặc AI theo lệnh chủ, có hỏi quyền) chép từng tệp sang `docs/adr/ADR-01xx-*.md`, đổi dòng Trạng thái sang accepted kèm nguyên văn lời duyệt, thêm dòng vào `docs/adr/README.md`. Các tệp trong thư mục này là hồ sơ có ngày, đóng băng.
