# Nhật ký thi công ADR-0061 — Dịch vụ nhập tay có công tắc (2026-09-30)

> Người thi công: AI (phiên con của điều phối). Nhánh `worktree-agent-a63f3b1ecb4b16db8`. Chuẩn tắc: `docs/adr/ADR-0061-mo-lai-dich-vu-nhap-tay-noi-bo.md`; hồ sơ + trang ghép: `docs/superpowers/specs/2026-09-30-de-xuat-adr-gop-y-d1-d3.md` (D3).

## Số migration
- Ban đầu 0051 (điều phối cấp) → đổi **0052** theo điều phối (0051 = ADR-0060; 0050 = tro_ly trên main). Kiểm `origin/main` trước khi báo: số lớn nhất 0050.

## Điểm thi công ngoài văn bản ADR / trang ghép (chờ chủ biết — bề mặt, đảo ngược được)
1. **`GET /api/cai-dat/nhap-tay` hỏi `order.create`.** Trang ghép §3 ghi "đọc: không cần ô"; hàng rào 2 luật (1b) (`src/route-write-guard.test.ts`, ADR-0019 điều 6) buộc mọi route sau cổng `orders` hỏi bảng trong thân. Không thêm tên vào `GUARDS` (= nới hàng rào). Hệ quả: chỉ-HDV, Kế toán nhận 403 — cả hai không lập đơn nên không cần biết công tắc. Hoàn tác: đổi câu hỏi ô (vẫn phải có một `can()`).
2. **Trường thêm `doiDuoc`** (= `can(settings.ops)`) trong phản hồi GET/POST — để trang Tôi biết hiện khối bật/tắt. ADR điều 6 chỉ nêu `{ batNhapTay, duocDung }`.
3. **Gửi cùng trạng thái** đang hiệu lực: 200, không ghi dòng, không nhật ký.
4. **Mốc dòng mới** = max(bây giờ, dòng mới nhất + 1 ms) — không lùi, không trùng UNIQUE khi đổi liên tiếp.
5. **Câu lỗi R1 theo lý do** (`NHAP_TAY_MESSAGE`): "đang tắt" / "tài khoản này không được dùng" / "tài khoản có quyền Đối tác không dùng được" (ADR "Mã": câu chốt ở kế hoạch — chưa có kế hoạch riêng, AI đặt).
6. **Hai lệnh đổi cùng lúc** (kiểm độc lập VỪA-2): lệnh thua va UNIQUE `valid_from_at` → 409 `stale` "Công tắc vừa được đổi — tải lại rồi thử lại." (lô không áp). Bài đua trên khung thử ép cả hai request đọc TẮT rồi mới ghi.

## Kiểm độc lập vòng 1 (d110d656): ĐẠT CÓ ĐIỀU KIỆN — đã sửa
- VỪA-1: `src/modules/billing/nhap-tay-so-tien.test.ts` — đơn danh mục + nhập tay chạy thật: biên nhận, còn lại sau một lần thu, HDV sửa số khách (phải thu qua `effectiveSubtotal` gồm dòng nhập tay), Đã giao chặn khi thiếu / qua khi đủ, phiếu chụp 2.200.000. Phá: `buildSubtotalServices` bỏ dịch vụ `catalog_code` NULL → đỏ; hoàn nguyên → xanh.
- VỪA-2: xem điểm 6 ở trên. Đỏ trước (500 `internal`), xanh sau (200 + 409).
- THẤP-2: `docs/SYSTEM-DESIGN.md` §7 ghi điểm 1–2; tệp này.

## Còn mở
- Tiêu chí 6: sổ vàng SV-SC-05 chờ chủ / Kế toán xác nhận (AI không tự xác nhận).
- Đề xuất dòng bảng Chrome cho `web/CLAUDE.md` (AI không tự sửa): `web/nhap-tay-cai-dat.ts`, phần nhập tay của `web/order-form.ts` / `web/service-card.ts` / `web/catalog-picker.ts`, `isFrozenManual` → `docs/evidence/2026-09-30-adr-0061/kich-ban/nhap-tay-smoke.mjs` + ba `a2-smoke-*.mjs` + `dot-c-smoke.mjs`.
- Số phiên bản "1.44" là tạm — người gộp chốt số.
