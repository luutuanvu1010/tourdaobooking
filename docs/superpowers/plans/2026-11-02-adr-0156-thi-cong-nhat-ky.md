# Nhật ký thi công — Mã QR chống trùng và trần lô vé điện tử (ADR-0156)

ADR: `docs/adr/ADR-0156-ve-dien-tu-ma-qr-chong-trung-va-tran-lo.md`. Nhánh `claude/ve-dien-tu-qr-tran-lo`, cắt từ `main` sau khi ADR-0153 nhập. Ghi 02/11/2026 (người thi công). CHƯA gộp `main`, CHƯA lên production.

## Ruling của chủ
- Không gõ mã từng vé vì số vé rất lớn; không dùng người soát ở số lượng lớn (2/11).
- Trần mỗi lô 50, đặt ở màn của Toàn quyền; cần một lớp chống trùng chính xác ngoài dấu vân tệp (2/11).
- «ok tạm thế đã, tiếp tục nào, nếu có đề xuất tốt hơn thì báo tôi» (2/11): người thi công hiểu là chấp nhận ADR-0156, gồm rủi ro lẫn loại vé, luật không đọc được QR thì loại ảnh, Bán hàng dùng được Bỏ lô; đã nói rõ cách hiểu này với chủ.

## Lệch so với ADR (có lý do)
- Thư viện đặt tên `jsqr.cjs`, không phải `.js`: kho khai `"type": "module"`, đuôi `.js` bị esbuild coi là ESM và báo không có export. Bài trần gói bắt được lỗi này.
- ADR nói thêm hai tệp vào `web/vendor/`; thực tế ba tệp, vì giữ giấy phép Apache-2.0 ở tệp riêng.
- `soVeDuKien` ở `POST /api/ve/lo` là tuỳ chọn, vì route thêm vé vẫn kiểm trần.
- Thêm ngoài ADR: lô không còn vé nào thì trang tự bỏ, để danh sách «Lô có thể bỏ» không đầy rác; câu nhắc mỗi lô một sản phẩm, một loại khách, một ngày dùng ngay trên trang.
- Sổ nợ `GHI_NHIEU_LAN` thêm `POST /api/ve/lo/:id/bo` vì kho R2 nằm giữa, không gộp một lô được. Dòng `POST /api/ve/lo/:id/ve` sửa cho đúng sự thật như ADR yêu cầu.

## Bằng chứng
- Trình duyệt: `ve-qr-smoke.mjs` hai khổ 390 và 1040, cần `AXE_JS`. Ảnh ở `docs/evidence/2026-11-02-ve-qr-tran-lo/anh/`, chỉ có dữ liệu thử.
- 50 ảnh cỡ 1170×2532 (khoảng 13 MB tổng) trên Chrome của máy Mac: 4,0 giây, khoảng đứng hình lâu nhất 80 mili giây.
- 7 ảnh vé thật trên máy (khối `VE_ANH_THAT`, chặn mọi lời gọi ghi trong trang, không chụp, không in chuỗi): đọc được 7, khác nhau 7, đúng dạng 7.
- Phá thử: từng dòng ở `docs/SO-HANG-RAO.md`.

## Bài học
- Dữ liệu thử ban đầu dùng nhầm `S/N` thật của một vé trong ba tệp bài kiểm; phát hiện trước khi commit, đã thay số giả, `git log` xác nhận chưa từng vào commit.
- Bước 50 ảnh treo im lặng mất nhiều lần chạy: công cụ thử (CDP `Network.enable`) ghi cả thân yêu cầu vài MB nên kết nối đứt, mọi lời gọi vào trang không bao giờ trả lời. Không phải lỗi của trang. Đã giới hạn `maxPostDataSize` và thêm giờ giới hạn riêng trong kịch bản, đã ghi ở công thức z31.

## Nợ
- iPhone thật chưa kiểm (tiêu chí 9).
- Hai điều kiện trước khi phát hành ở `docs/HANDOFF-N1.md`: tải cùng một vé hai lần; ảnh vé Vinpearl Harbour.
- Chờ chủ duyệt con số trần gói Đơn hàng 103.178 byte.
- **Đề xuất chưa áp, chủ quyết (N9):** thêm một dòng vào bảng kịch bản Chrome ở `web/CLAUDE.md`:
  `| Trang Vé điện tử và cài đặt (ADR-0156): web/ve-kho.ts, web/ve-cai-dat.ts, web/qr-doc-ve.ts, public/ve-kho.html, public/ve-cai-dat.html, src/shared/ve-nhap-lo.ts | ve-qr-smoke.mjs ở docs/evidence/2026-11-02-ve-qr-tran-lo/kich-ban/ (10 bước, 390 + 1040, cần AXE_JS, không cần mạng ngoài; phá thử LB_PHA=qr-gia) |`
