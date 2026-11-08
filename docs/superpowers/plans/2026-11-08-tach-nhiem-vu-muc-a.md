# Kế hoạch thi công — Tách nhiệm vụ mức (a) (ADR-0187 Đ3)

Đặc tả: `docs/superpowers/specs/2026-11-08-tach-nhiem-vu-muc-a-design.md`. Mỗi task: test đỏ trước, xanh sau; một lần lưu. Nhật ký thi công ghi ruling và việc chờ chủ.

| # | Task | Tệp chính | Xong khi |
|---|---|---|---|
| 1 | Hàm thuần `tuGhiDonMinhLap`, chữ dùng chung; cờ `ghiTien` trên hành động nhật ký + `HANH_DONG_GHI_TIEN` | `src/shared/tach-nhiem-vu.ts` (+test), `src/shared/audit-actions.ts`, `audit-actions.test.ts` | bài thuần xanh; danh sách hành động khớp bảng kỳ vọng |
| 2 | Migration `0150_tach_nhiem_vu_tu_ghi.sql`: hai cột dấu, view `v_aud_tu_ghi`, bảng `bil_soat_tu_ghi` + trigger; từ điển dữ liệu | `migrations/`, `docs/data-dictionary.json`, `npm run dict` | bài migration (SQLite thật) xanh: trigger chặn cùng người, chặn dòng không dấu, chặn sửa/xoá |
| 3 | `insertStatement` điền dấu nhật ký; `bindPosting` điền dấu phiếu (`ai.ghiTien`) | `src/modules/audit/repository.ts` (+test cạnh `acting-role.test.ts`), `src/modules/billing/repository.ts`, `service.ts` `NguoiGoi` | bài khung thử: dấu đúng / không dấu đúng |
| 4 | Route: gọi hàm chung sau `can()`, trả cờ; bài quét tĩnh `src/tach-nhiem-vu-route.test.ts` | `src/modules/billing/index.ts` | bỏ một lời gọi → bài quét đỏ |
| 5 | Route soát: `GET /api/ledger/tu-ghi`, `/dem`, `POST …/:auditId/da-soat`; DTO; SNAPSHOT route; số route ghi | `billing/index.ts`, `billing/tu-ghi.ts`, `src/shared/contracts.ts`, `src/route-access.test.ts`, `src/lan-gui-phu-route.test.ts` | bài route khung thử: 403 tự soát, 201, 409 |
| 6 | Giao diện Sổ công nợ: bộ lọc + nút «Đã soát»; chữ ở `so-cong-no-hien-thi.ts`; Bảng tham chiếu | `web/so-cong-no.ts`, `src/shared/so-cong-no-hien-thi.ts`, `src/shared/bang-tham-chieu-viec.ts` | `npm run tham-chieu` sạch; bài bảng tham chiếu xanh |
| 7 | Trang chủ: thẻ «Cần người thứ hai soát» | `src/shared/viec-cua-ban.ts`, `pham-vi-so.ts`, `web/home.ts` | bài `viec-cua-ban.test.ts` cập nhật xanh; trần gói đo lại |
| 8 | E2E `tests/e2e/tach-nhiem-vu.mjs` + đăng ký `danh-sach.mjs` | `tests/e2e/` | kịch bản xanh trên API thật |
| 9 | Nhật ký thay đổi 2.76 + `app-info.test.ts`; sổ hàng rào; nhật ký thi công | `src/shared/changelog.ts`, `docs/SO-HANG-RAO.md`, `docs/superpowers/plans/…-thi-cong-nhat-ky.md` | `npm test`, `npm run typecheck` xanh |
| 10 | Kiểm độc lập `nguoi-kiem-doc-lap`; sửa theo báo cáo | — | báo cáo ĐẠT |

Lệnh chủ chạy sau khi đạt: `npm run day-len -- claude/keen-ishizaka-248ee0`, rồi `npm run trien-khai` (có migration 0150).
