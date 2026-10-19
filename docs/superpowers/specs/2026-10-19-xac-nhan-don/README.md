# Hồ sơ quyết định — bước Xác nhận đơn (19/10/2026)

**Trạng thái: chờ chủ duyệt.** Bốn đề xuất ADR do AI soạn (Task 0.1 của `docs/superpowers/plans/2026-10-19-xac-nhan-don.md`), chưa có hiệu lực. Nguồn lời chủ: `../2026-10-19-xac-nhan-don-design.md` (mục 5b, 5c thắng phần trên) và `../2026-10-19-xac-nhan-don-luong-thuc-te.md`. Dòng nào là lựa chọn của người soạn ghi **[người soạn]** — chủ đọc kỹ các dòng đó.

## Thứ tự duyệt (mỗi lượt ≤ 3 quyết định chạm quyền / dữ liệu — CLAUDE.md §9)

| Lượt | Tệp | Mở việc gì |
|---|---|---|
| 1 | `DE-XUAT-ADR-0133-don-khong-don-khung-gio.md`, `DE-XUAT-ADR-0134-nhap-rieng-tu-khong-thu.md`, trang ghép `TRANG-GHEP-LUOT-1.md` | Đợt 1 (Đón / Không đón, khung giờ), Đợt 2 (nháp riêng tư, nháp không thu, bỏ ô Thanh toán trước) |
| 2 | `DE-XUAT-ADR-0135-buoc-xac-nhan-don.md`, `DE-XUAT-ADR-0136-thu-xac-nhan-va-qr-may-chu.md`, trang ghép `TRANG-GHEP-LUOT-2.md` | Đợt 3 (bước xác nhận), Đợt 4 (thư kèm QR, thư huỷ) |

Lượt 2 chỉ trình sau khi lượt 1 đã duyệt; lượt 1 đổi thì trang ghép lượt 2 phải soát lại.

## Câu hỏi chủ cần trả lời khi duyệt lượt 1
1. **Đặt gấp cho nháp của người khác** (ADR-0134 Q1): nháp riêng tư làm Quản trị hết đường thấy đơn sát giờ của Bán hàng / Đối tác để bấm Đặt gấp. Khuyến nghị: nháp có chặng dưới mốc cũng phải "Gửi xác nhận", và không phát hành Đợt 2 trước Đợt 3.
2. **"Chỉ người tạo đọc" có gồm "chỉ người tạo ghi"** (ADR-0134 Q2). Khuyến nghị: có.
3. **Nháp cũ đã có khoản thu**: chủ đếm bằng lệnh ở Task 2.2 Step 0 của kế hoạch trước khi phát hành (lỗ TNV-G1).

## Số hiệu
0133–0136 còn trống ngày 19/10 (đã kiểm `git log --all`, `docs/adr/`, mọi worktree). Số cấp **theo thứ tự chủ duyệt**: đề xuất cũ `../2026-10-18-tao-don-thiet-ke-lai/DE-XUAT-ADR-0130.md` còn mang số tạm đã bị dùng (0130 nay là ADR khác), nên có thể tranh số 0133 trở đi.

## Sau khi chủ duyệt
Chủ (hoặc AI theo lệnh chủ, có hỏi quyền) chép từng tệp sang `docs/adr/ADR-01xx-*.md`, đổi dòng Trạng thái sang accepted kèm nguyên văn lời duyệt, thêm dòng vào `docs/adr/README.md`. Các tệp trong thư mục này là hồ sơ có ngày, đóng băng.
