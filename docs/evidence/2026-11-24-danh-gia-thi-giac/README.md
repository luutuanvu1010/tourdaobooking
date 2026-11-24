# Bằng chứng — đánh giá thị giác và hướng nâng cấp giao diện (24/11/2026)

Hồ sơ có ngày. Báo cáo: `docs/superpowers/specs/2026-11-24-danh-gia-thi-giac-va-huong-nang-cap/` (`BAO-CAO.md`, `PHU-LUC.md`, `DE-BAI.md`).
Bản được đo: bản chính `277fe8e12` (bản 3.42). **Không chạm bản chạy thật ngoài một lần GET công khai `/giao-dien.css`; không dữ liệu thật; không sửa mã sản phẩm.**
Ảnh, số đo thô, ghi chú tra nguồn để **ngoài kho** ở `~/tourdao-thi-giac-2026-11-24/` (kho công khai).

## Dựng máy thử (đã làm, theo thứ tự)

1. `npm ci`, `npm run build:web` trong cây làm việc của đợt.
2. Chép kho dữ liệu thử `~/tourdao-danh-gia-2026-11-20/d1` và `tai-khoan.json` (13 tài khoản thử, đủ 11 bộ quyền) sang `~/tourdao-thi-giac-2026-11-24/`; không sửa kho cũ.
3. Áp migration còn thiếu lên bản chép (`0181` tới `0192`): `CI=1 npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to ~/tourdao-thi-giac-2026-11-24/d1`.
4. Máy chủ thử: `node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs --d1 ~/tourdao-thi-giac-2026-11-24/d1 --port 8851`.
5. Bộ núm Giao diện công ty: GET công khai `/giao-dien.css` của bản chạy thật lúc 11:26 ngày 24/11 trả `:root{--font:"Noto Sans", …;--fw-regular:500;--fw-semibold:600;--fw-bold:600;--fw-heavy:600;}` (phông nội dung Noto Sans, chữ thường đậm 500, chữ nhấn đậm 600). Dựng lại trên máy thử bằng `dat-bo-num.mjs` với ba núm `phong-noi-dung`, `dam-noi-dung`, `dam-nhan`; kịch bản báo đạt khi hai tệp trùng từng ký tự.

## Kịch bản (`kich-ban/`, chạy từ gốc kho, máy chủ thử phải đang bật)

| Tệp | Việc |
|---|---|
| `dat-bo-num.mjs` | đặt bộ núm của bản chạy thật lên máy thử và so chuỗi |
| `bang-man-them.json` | 24 màn thêm vào 87 màn của bảng 20/11: trang đầu của các bộ quyền còn thiếu, hành trình đối tác (cả tài khoản lữ hành), màn không quyền |
| `chup.mjs` | với mỗi màn ở mỗi bề rộng: đo trong trang, chụp màn đầu và cả trang; `--tiem` chèn lớp kiểu của một phương án sau khi trang tải; mỗi tài khoản đăng nhập đúng một lần (giữ ở `phien.json`) |
| `do-thi-giac.js` | đoạn đo chạy trong trang: màu, cỡ chữ, độ đậm, giãn dòng, bo góc, viền, bóng, khoảng cách ngoài thang, tương phản, vùng chạm, dáng nút, thẻ, ô nhập, huy hiệu, biểu tượng, cách viết tiền, chuyển động, khung chung, tràn ngang |
| `doc-token.mjs` | đọc tên và giá trị hiệu lực của mọi token ở gốc (để trình duyệt tự giải) |
| `tong-hop.mjs` | gom số đo thành `so-lieu-may-<bộ>.md` (máy sinh) |
| `trang-thai.mjs` | chụp 39 ảnh trạng thái: đang tải, rỗng, lỗi, không quyền, bảng trượt, hộp hỏi, bàn phím (xấp xỉ), tiêu điểm, rê chuột; mọi lời gọi ghi bị chặn trong trang |
| `lap-to-anh.py` | ghép ảnh màn đầu thành tờ ảnh để nhìn xuyên các màn |
| `lop-kieu/phuong-an-a.css`, `-b.css`, `-c.css` | lớp kiểu XEM TRƯỚC của ba phương án, tiêm chồng nhau (B = A + B, C = A + B + C); **không phải mã sản phẩm** |

Các lượt đã chạy: `hien-tai` (111 màn × 390, 1.280, 1.440), `do-lai` (111 màn × 390, 1.280, thêm phép đo khung chung và màu nút theo động từ), `quet-rong` (8 màn × 13 bề rộng từ 360 tới 1.920), `phuong-an-a`, `-b`, `-c` (9 màn × 3 bề rộng).

## Điều cần biết khi chạy lại

- **Một tài khoản chỉ được đăng nhập một nơi.** Lượt đầu để mỗi luồng tự đăng nhập, Nền tảng kết thúc phiên cũ («Tài khoản vừa đăng nhập trên máy khác») và 46 màn bị đẩy về trang Đăng nhập; đã chụp lại. Kịch bản dùng chung tài khoản phải đọc `phien.json`, không đăng nhập lại.
- Màn Tạo đơn giữ một dải trống ở đầu trang tới 8 giây: kịch bản chờ 9 giây rồi mới chụp.
- Kho thử có một tin quan trọng chưa đọc và các tài khoản đang trong hạn nhắc bật bảo mật hai lớp, nên **mọi màn đều có một dải nhắc**. Tần suất dải nhắc trên bản chạy thật chưa đo.
- Màn Đăng ký chỉ chụp được ở trạng thái «tạm ngừng nhận»: kho thử không có chính sách riêng tư đang hiệu lực nên Nền tảng từ chối mở đăng ký (409). Màn Hồ sơ tổ chức chỉ chụp được ở trạng thái không có quyền.
- Bàn phím ảo là phép xấp xỉ (khung 390 × 508), không phải bàn phím thật.
