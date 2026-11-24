# Bằng chứng — đánh giá lại giao diện (20/11/2026)

Hồ sơ có ngày. Báo cáo: `docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/BAO-CAO.md` (cùng thư mục có `PHAT-HIEN.md`, `BANG-PHU.md`, `DE-BAI.md`).
Bản được chấm: bản chính `31d4c0174`. **Không chạm bản chạy thật, không dữ liệu thật.** Ảnh, số đo, báo cáo từng màn để **ngoài kho** ở `~/tourdao-danh-gia-2026-11-20/` (kho công khai).

## Dựng máy thử (đã làm, theo thứ tự)

1. `npm ci`, `npm run build:web` trong cây làm việc của đợt.
2. Chép kho dữ liệu thử của bước 2 (`~/tourdao-ux-2026-11-14-buoc-2/d1`, vốn chép từ kho bước 0 ngày 13/11) sang `~/tourdao-danh-gia-2026-11-20/d1`; không sửa kho cũ. Chép kèm `tai-khoan.json` (13 tài khoản thử, đủ 11 bộ quyền).
3. Áp các migration còn thiếu lên bản chép: `CI=1 npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to ~/tourdao-danh-gia-2026-11-20/d1` (từ `0163` tới `0180`).
4. Máy chủ thử: `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-danh-gia-2026-11-20/d1 --port 8835`.
5. Tệp giao diện công ty: GET công khai `https://booking.tourdao.vn/giao-dien.css` ngày 20/11 vẫn là `--c-text:#000000;--fs-h1:20px;--fs-label:16px;--fs-step-5:17px`; bản chép kho thử đã mang đúng giá trị này từ lượt 13/11 (`/giao-dien.css` của máy thử trùng từng ký tự), nên không phải áp lại.
6. Dữ liệu: 48 đơn, 6 xe, 8 chuyến (có chuyến ngày 20/11 và 23/11), 5 khoản thu, 3 dòng công nợ, 6 vé hỗ trợ. Không gieo thêm. Các trang về phiếu đăng ký, vé điện tử, cấp độ đại lý, luật bán không có dữ liệu: chấm trên màn rỗng (ghi ở bảng phủ).

## Kịch bản (`kich-ban/`, chạy từ gốc kho)

| Tệp | Việc |
|---|---|
| `bang-man.json` | 87 màn của đợt: bộ quyền, trang (kèm mã bản ghi giả của kho thử), việc người dùng tới làm, lượt gộp |
| `chup.mjs` | chụp mọi màn bằng đúng lõi `doVaGhi` của `scripts/giao-dien/do-lib.mjs` trên máy chủ thử đang chạy; mỗi màn một thư mục `bang-chung/man-NNN/` |
| `luu-bao-cao.mjs` | lưu nguyên văn báo cáo cuối của từng lượt trợ lý ra `bao-cao/` (đọc bản ghi lượt chạy; cần biến `TASKS_DIR`) |
| `gom-phat-hien.mjs` | gom các dòng `PHÁT HIỆN` bằng hàm có sẵn `docPhatHien` thành `phat-hien-gop.json` và `.md` |
| `lap-bang-phu.mjs` | sinh `BANG-PHU.md` từ ma trận quyền, bảng màn, trạng thái chụp, bảng gộp |
| `chen-bang-nang.mjs` | chèn bảng mục Chặn việc và Nặng vào `PHAT-HIEN.md` |

Ma trận quyền sinh bằng `docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/ma-tran-quyen.mjs` (không sửa), ghi ra `~/tourdao-danh-gia-2026-11-20/ma-tran-quyen.json`.
Kịch bản hành trình cũ `docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/hanh-trinh.mjs` chạy một lần sau khi chụp xong (`--base http://127.0.0.1:8835 --kho 390 --bo <10 bộ> --anh … --tk …`); tệp kết quả đã chuyển ra ngoài kho.

Không sửa gì trong `scripts/giao-dien/`, tài liệu tiêu chí và tệp trợ lý.

## Giới hạn

Chỉ chụp màn vừa tải, hai khổ 390 và 1280, Chrome giả lập. Lõi chụp dừng ở 10 ảnh mỗi khổ nên năm trang dài chưa chụp hết. Mã lần lưu ghi trong `tom-tat.md` của từng màn là mã nhánh của đợt (chỉ thêm tài liệu so với bản chính).
Một Chrome ẩn bật lúc 12:26 ngày 20/11 (trước phiên này, hồ sơ `tourdao-a2-chrome-…`) là của phiên khác: chỉ ghi lại, không tắt.
