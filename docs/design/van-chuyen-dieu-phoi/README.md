# Bản vẽ Bảng điều phối lượt 1 (Claude Design) — người thi công ĐỌC TRƯỚC

- **Nguồn:** chủ dự án vẽ trên Claude Design, trong dự án có sẵn "Tour Đảo Booking Design System" (`https://claude.ai/design/p/34f284df-c97a-4672-bb66-d7df03a0d97a`). Xuất ra Desktop (`Tourdao-vanchuyen-module/`) lúc 2026-09-29 19:54; người thi công Phần B chép vào đây **nguyên văn, không sửa** (so bằng `shasum`).
- **Căn cứ:** ADR-0049 (`docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md`), ADR-0050 (`docs/adr/ADR-0050-van-chuyen-kernel-luot-1.md`), danh sách màn `docs/superpowers/specs/2026-09-29-bang-dieu-phoi-luot-1-man-hinh-can-ve.md` [MH], kế hoạch `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` §7 (Phần B) [KH], hỏi đáp `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` [HĐ].
- **Bản đối chiếu bản vẽ ↔ ADR** (phiên kiểm riêng của điều phối, chỉ đọc, 29/9 tối): chép **toàn văn** ở `DOI-CHIEU-2026-09-29.md` cạnh tệp này — bằng chứng cho người kiểm. Kết luận: dùng được làm khung bố cục, **KHÔNG thi công nguyên trạng**.
- **Làm đúng bản vẽ** ở mọi chỗ bản đối chiếu không nói khác (tiền lệ Đăng nhập, Vận chuyển 1a): dựng lại bằng `h()` của `web/`, token ở `public/app.css`, khối `.vc-*` sẵn có. Không chép cấu trúc nội bộ của bản mẫu (`support.js`, `<x-dc>`, `sc-for`, `dc-import`… là công cụ vẽ, không phải mã app).
- Người thi công ghi cách xử lý từng điểm ở nhật ký giao diện `docs/superpowers/plans/2026-09-29-adr-0049-giao-dien-nhat-ky.md`.

## Có gì trong thư mục

- `project/` — 8 màn, 3 khối `dp-*`, 2 vỏ, `github.md`, `support.js` (giống từng byte bản 1a), `assets/logo-96.png` (để mở bản vẽ không vỡ ảnh), `_ds/…/` gồm `readme.md`, `_ds_manifest.json`, `styles.css`, `tokens/*.css` và `_ds_bundle.js` (nơi duy nhất ghi biến thể thành phần Button / Chip / Banner / Sheet / Field / Sidebar / TabBar / MobileBar).
- **Không đưa** (theo bản đối chiếu mục 6): `_ds/…/assets/fonts/*.woff2`, `_adherence.oxlintrc.json`, `.thumbnail`, `screenshots/`, `.zip`.

## Đọc theo thứ tự

1. `DOI-CHIEU-2026-09-29.md` (bản đối chiếu — việc phải sửa theo căn cứ, ruling, câu chờ chủ).
2. Các màn (mỗi màn có cỡ 390 và 1040):
   - `01 Dieu phoi xe` (V1) — ba khối `dp-chua-xep`, `dp-dong-thoi-gian`, `dp-can-xu-ly`;
   - `02 Chi tiet chuyen` (V2); `03 Tao sua chuyen` (V3); `04 Cuoc cua toi` (V5); `05 Chuyen dang chay` (V6); `06 Xuat ben` (V7);
   - `07 Bieu mau don - chang don` (V12 — phần mốc 6 giờ, đặt gấp; **không** phải bản vẽ biểu mẫu ADR-0047 — bản đối chiếu mục 5);
   - `08 Chinh sach dieu phoi` (V13 — Chính sách điều phối, Lý do điều phối).
3. Vỏ `vo-may-tinh`, `vo-dien-thoai`: **giữ vỏ thật của app** (`web/shell.ts`), chỉ thêm mục mới — ba mục con dưới "Vận chuyển": "Điều phối xe", "Chính sách điều phối" (chỉ Toàn quyền), "Lý do điều phối" (Quản trị, Toàn quyền).

## Tóm tắt bản đối chiếu (chi tiết và `tệp:dòng` ở `DOI-CHIEU-2026-09-29.md`)

**Sửa theo căn cứ (mục 2 — chủ không phải vẽ lại):**
1. Chặng đã đặt gấp KHÔNG bị đòi phá lệ khi xếp (giữ nhãn quá mốc, bỏ nút phá lệ / dòng khoá).
2. Tạo chuyến mới trong 6 giờ KHÔNG báo "cần phá lệ".
3. Dời giờ chuyến KHÔNG báo phá lệ; câu "Trong 6 giờ — cần Quản trị phá lệ" chỉ khi đổi xe / tài xế của chuyến đã vào vùng khoá; câu hạng bằng lấy từ bảng hạng.
4. Danh mục lý do: bỏ nhóm "Đặt gấp", "Bỏ chặng" (hằng trong mã); thêm "Đổi giờ xe tới", "Bỏ qua điểm"; nhãn "Phá lệ" (không "Phá lệ mốc 6 giờ").
5. Màn tài xế không hiện hạn giấy tờ — chỉ điều kiện CÒN THIẾU kèm "(văn phòng lo)"; đạt hết → "Đủ điều kiện".
6. Dữ liệu mẫu sai (tài xế công ty lái xe nhà xe) — không dùng làm ca thử.
7. "Kết thúc gián đoạn" chỉ khi xe đang chạy; "Xuất bến thay" khoá khi chuyến bị giữ.
8. Không có "máy tự gửi lại khi có mạng" — chỉ "Chưa gửi được — bấm lại".
9. Bỏ tên người lập ở mục đơn nháp.
12. "…sẽ báo về văn phòng" → "…trở về cột Chưa xếp".
13. Bỏ nút "Phá lệ" đứng riêng; phá lệ là trường của chính lệnh bị 409 `can_pha_le`.

**Chờ chủ (không dựng tới khi điều phối nhắn):** Q1 ô ghi chú tự do trong chuyến; Q2 "Đã gọi báo" + giờ hẹn cũ ("Gọi tài xế" bỏ hẳn); Q3 ô "Ngày hiệu lực" + dòng "Đang soạn" ở Chính sách (tạm: hiệu lực ngay khi lưu, không ô ngày, không "Đang soạn"); H4 / N-14 nhãn "Đặt gấp — lý do — người duyệt" trên chi tiết đơn (tạm: chỉ hiện kết quả trả về ngay của lệnh đặt gấp).

**Điều phối đã chốt:** Q4 thẻ "Xe" trên điện thoại theo bản vẽ (dòng thời gian cuộn ngang, sửa chữ bị cắt); Q5 tài xế theo bản vẽ (tab "Cuốc của tôi" làm trang mở đầu). Ruling hợp đồng dữ liệu R-P12…R-P18 (mục 3): máy chủ làm trên nhánh máy chủ, gộp sang nhánh giao diện sau.

**Luật giao diện (mục 4):** số đo không phải token → thêm token nhóm "Riêng" (tiền lệ 1a); cỡ chữ 11px và 8px của dòng thời gian nhỏ hơn `--fs-badge` (12px) — ghi rõ khi thêm token; sửa các chỗ tràn đã liệt kê; khoảng giờ dòng thời gian lấy theo dữ liệu, không cố định 06–21 giờ.

## Dữ liệu mẫu trong bản vẽ (soát 2026-09-29)

- Biển số `79B-123.45`, `79B-678.90`, `79B-555.66`; mã đơn `TD-2026…`, mã chuyến `CX-3009-…`: hư cấu theo đoạn yêu cầu ở [MH].
- Hai số điện thoại dạng thật ở màn 05 (người liên hệ của đơn): `0913 552 108`, `0935 118 640` — coi là **hư cấu**; không đưa vào dữ liệu gieo, test, ảnh bằng chứng.
- `_ds_bundle.js` có bảy số dạng thật: sáu số của khách mẫu / ô mẫu trong bộ giao diện mẫu (hư cấu), và `0989 929 373` ở dòng "Hỗ trợ kỹ thuật" của màn đăng nhập mẫu — **số này đã có sẵn trong repo** (`src/migrations-maintenance.test.ts`, số được phép lúc bảo trì). Repo private; ghi để người sau biết.
- Tên người: "Nguyễn Văn An", "Trần Văn Tuấn" (tài xế), "Phạm Thu Hoa" (Quản trị), "Lê Thị Trang" (Bán hàng), "Đỗ Minh Châu" (Kế toán) là tên mẫu (chưa đối chiếu danh sách nhân viên thật). **"Lưu Tuấn Vũ" là tên thật của chủ dự án**, làm tên mẫu tài khoản Toàn quyền ở `vo-may-tinh`, `vo-dien-thoai` và lịch sử bản chính sách của `08`. Chấp nhận (bản đối chiếu mục 6); không dùng tên này trong kịch bản kiểm.
