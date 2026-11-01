# Nhật ký thi công — Kho vé điện tử (ADR-0153)

Kế hoạch: `2026-10-31-ve-dien-tu.md`. Nhánh `claude/ve-dien-tu-thi-cong-ff85a6`. Ghi 01/11/2026 (người thi công). CHƯA gộp `main`, CHƯA lên production.

## Ruling của chủ (ngoài kế hoạch)
- Làm giao diện trước; KHÔNG làm đọc chữ AI đợt này (thêm sau được, không phải làm lại) — Task 4b hoãn.
- Đề xuất «mã vé từ bắt buộc sang tuỳ chọn, chống trùng bằng băm ảnh» — CHỜ CHỦ DUYỆT, chưa sửa schema.

## Lệch so với kế hoạch (có lý do)
- Số khách hiệu lực nằm ở JSON điều chỉnh nên không đọc được bằng view SQL: dùng hàm công bố `orders.dichVuChoVe`, không có view `v_ord_service_ve`.
- Nhãn menu «Vé điện tử» (không «Kho vé điện tử») và chữ «Số vé còn» / «Nhập lô vé»: tìm theo từ khoá của trợ lý bỏ dấu, «khó» khớp «kho», đoạn sơ đồ trang ngắn lặp «kho» làm câu than phiền rơi 17 → 0 (C4/C4b). Đổi nhãn, KHÔNG sửa số đo, luật tìm không đổi.

## Nợ / hàng rào
- `lan-gui-no.ts` thêm hai dòng nợ ghi nhiều lần: `POST /api/ve/lo/:id/ve`, `POST /api/orders/:id/status` (lý do ở chính tệp).
- Nới trần dung lượng: `web/orders.ts` (hai lần, tổng +283 byte) và gói Đơn hàng 102_554 → 102_937 — CHƯA có lời duyệt riêng của chủ.
- `wrangler.jsonc`: `run_worker_first` thêm `/ve/*` (trang khách công khai, chỉ đọc, giới hạn tốc độ theo IP).

## Chưa làm
- Task 8b: thông báo kho cạn, cấp bù tự động sau nhập lô, quét định kỳ (hiện chỉ cấp bù bằng tay `POST /api/ve/cap`).
- Task 4b: đọc chữ AI (hoãn theo chủ).
- Giao diện chưa kiểm bằng Chrome / iPhone thật (kịch bản Chrome cần `AXE_JS`).
- Mục nhật ký thay đổi (số phiên bản) — phiên phát hành gán ở bước A.0.
