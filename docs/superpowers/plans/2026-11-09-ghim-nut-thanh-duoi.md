# Kế hoạch — Tự chọn nút thanh dưới (ADR-0187 Đ2.3)

Đặc tả: `docs/superpowers/specs/2026-11-09-ghim-nut-thanh-duoi-design.md`. Nhánh `claude/adr-0187-ghim-nut-9c2e31`. Mỗi task đỏ → xanh.

| Task | Việc | Bài kiểm |
|---|---|---|
| T1 | Ô `me.favorites.write` trong `MATRIX` (viết tay, `DRIVER_PARTNER` none) | `permissions.test.ts` ghim từng ô; các bài đếm ô |
| T2 | `ghimDuoc`, `ghimHieuLuc`, `docGhim`, `thanhTab(n, ghim?)`, `luaChonGhim` ở `muc-giao-dien.ts` | `src/thanh-duoi-ghim.test.ts` (mới) |
| T3 | Migration `0153_thanh_duoi_ghim.sql`, `docs/data-dictionary.json`, `npm run dict` | `migrations-*.test.ts`, bài từ điển |
| T4 | `staff`: cột con ở `find_by_id`, `StaffProfile.thanhDuoi`, câu ghi `upsert_thanh_duoi`; `currentStaff` bỏ trường khi đóng vai | `nen-moi-yeu-cau.test.ts` (giữ 3 câu), bài kiến trúc |
| T5 | Route `PUT /api/account/thanh-duoi` + hành động nhật ký `bottom_tabs_changed` | `route-access.test.ts` SNAPSHOT, `xem-nhu-vai-khong-lo-toan-quyen.test.ts` (SO_ROUTE, MIEN), e2e `tests/e2e/thanh-duoi-ghim.mjs` |
| T6 | `web/shell.ts` dùng `thanhTab({staff}, ghimHieuLuc(staff))`; mục «Nút thanh dưới» ở `web/account.ts`; dòng Bảng tham chiếu | `giao-dien-hoi-bang-quyen.test.ts`, `bang-tham-chieu.test.ts`, `goi-trang-nhe.test.ts` |
| T7 | Nhật ký thay đổi (bước A.0), `app-info.test.ts`, dòng 5.28 bảng thi hành `docs/ARCHITECTURE.md`, `SYSTEM-DESIGN.md`/`CHANGE-GUIDE.md` nếu cần | `npm test`, `npm run typecheck` |
| T8 | Kịch bản Chrome ảnh 375 Bán hàng + Kế toán trước / sau | ảnh ở `docs/evidence/2026-11-09-ghim-nut-thanh-duoi/` |
| T9 | Kiểm độc lập `nguoi-kiem-doc-lap` | báo cáo |

Nhật ký thi công: `docs/superpowers/plans/2026-11-09-ghim-nut-thanh-duoi-thi-cong-nhat-ky.md`.
