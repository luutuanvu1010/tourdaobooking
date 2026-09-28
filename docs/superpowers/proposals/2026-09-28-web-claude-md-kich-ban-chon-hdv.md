# Đề xuất sửa `web/CLAUDE.md` (bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào") cho khối chọn người phụ trách trong form lập đơn

- **Ngày:** 2026-09-28. **Trạng thái:** **CHỜ CHỦ DỰ ÁN DUYỆT** — chưa áp. `web/CLAUDE.md` là tệp luật chi phối AI: người thi công chỉ đề xuất (Hiến pháp N9; `CLAUDE.md` §3; cùng cách làm với `docs/superpowers/proposals/2026-09-27-web-claude-md-kich-ban-hdv.md`).
- **Nguồn:** Task 1.8 phần b ADR-0030 — khối "Người phụ trách" ở cuối form lập đơn (`web/order-form.ts`, `#owner-card` ở `public/order-form.html`) + bảng chọn mới `web/assignee-picker.ts` + luật thuần `src/shared/assignee-pick.ts` + khối CSS `.owner-*`/`.assignee-*`, dựng theo bản thiết kế "Nguoi phu trach - Form lap don.dc.html" (phương án 1b). Kịch bản Chrome mới: `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/chon-hdv-lap-don-smoke.mjs` (12 bước).
- **Không đổi nghĩa quy tắc nào:** chỉ thêm MỘT dòng trỏ tệp → kịch bản cho khớp mã. Cho tới khi chủ duyệt: sửa các tệp trên thì chạy `chon-hdv-lap-don-smoke.mjs` (đã ghi ở `docs/SYSTEM-DESIGN.md` §9 danh sách kịch bản Chrome và `docs/CHANGE-GUIDE.md` §3).

## Thay đổi — thêm một dòng ngay SAU dòng `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` (dòng đầu bảng)

```diff
 | `web/order-form.ts`, `web/order.ts`, `web/trip-sheet.ts` | ba `a2-smoke-*.mjs` ở `docs/evidence/2026-09-20-a2/kich-ban/` |
+| Khối "Người phụ trách" trong form lập đơn: `web/assignee-picker.ts`, `src/shared/assignee-pick.ts`, phần chọn người phụ trách của `web/order-form.ts` / `#owner-card` của `public/order-form.html`, khối `.owner-*`/`.assignee-*` của `public/app.css` (Task 1.8 phần b ADR-0030) | `chon-hdv-lap-don-smoke.mjs` ở `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/` (12 bước, 390 + 1040, không cần mạng ngoài) + ba `a2-smoke-*.mjs` ở dòng trên |
 | `web/login.ts`, `public/login.html`, CSP ở `public/_headers` | `v1-dang-nhap.mjs` ở `docs/evidence/2026-09-21-v1-0/kich-ban/` (15 bước, ước ~9 phút, cần mạng) + `dot-c-smoke.mjs` (cột thương hiệu máy tính, xem hàng cuối bảng) |
```

## Cách áp khi chủ duyệt

Áp đúng khối `diff` trên vào `web/CLAUDE.md` trong một commit riêng ghi "chủ duyệt <ngày>"; không đổi dòng nào khác. Có thể áp cùng commit với đề xuất `2026-09-27-web-claude-md-kich-ban-hdv.md` nếu chủ duyệt cả hai một lần.
