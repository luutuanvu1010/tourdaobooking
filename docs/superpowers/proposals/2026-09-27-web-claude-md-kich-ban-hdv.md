# Đề xuất sửa `web/CLAUDE.md` (bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào") cho màn "Việc của tôi" mới của hướng dẫn viên

- **Ngày:** 2026-09-27. **Trạng thái:** **CHỜ CHỦ DỰ ÁN DUYỆT** — chưa áp. `web/CLAUDE.md` là tệp luật chi phối AI: người thi công chỉ đề xuất (Hiến pháp N9; `CLAUDE.md` §3; kế hoạch `docs/superpowers/plans/2026-09-27-tu-choi-huy-hdv-thi-cong.md` mục "Ràng buộc chung", gạch "Tệp luật").
- **Nguồn:** Task 1.8 ADR-0030 (commit `a53f25a`, `55ade60`): khối "Việc của tôi" chuyển sang `web/viec-cua-toi.ts` + luật thuần `src/shared/viec-cua-toi.ts` + khối CSS `.hdv-*`, dựng theo bản thiết kế `docs/design/tour-o-booking-hdv/project/Viec cua toi - HDV v2.dc.html`. Kịch bản Chrome mới: `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/hdv-viec-cua-toi-smoke.mjs` (8 bước). Vùng `.myjob-cancel` + `confirm()` cũ đã gỡ; bước 3–6 của `va3-smoke.mjs` đã gỡ (phần giao diện DK-T4-02 chuyển sang kịch bản mới).
- **Không đổi nghĩa quy tắc nào:** chỉ cập nhật tên tệp/kịch bản cho khớp mã (dòng cũ đang trỏ tới khối CSS `.myjob-cancel` không còn tồn tại, và không nhắc tệp `web/viec-cua-toi.ts`). Cho tới khi chủ duyệt: sửa `web/viec-cua-toi.ts`, `src/shared/viec-cua-toi.ts` hay khối `.hdv-*` thì chạy `hdv-viec-cua-toi-smoke.mjs` (đã ghi ở `docs/SYSTEM-DESIGN.md` §9, danh sách kịch bản Chrome).

## Thay đổi 1 — dòng `web/account.ts` (dòng 40): thêm kịch bản mới cho phần "Việc của tôi"

```diff
-| `web/account.ts`, `public/account.html` (hồ sơ, "Việc của tôi", liên kết, đổi PIN, bố cục 2 cột máy tính — bảo trì đọc dòng riêng ở trên) | `dot-c-smoke.mjs` (xem hàng cuối bảng) + `v1-bao-tri.mjs` nếu đụng phần bảo trì |
+| `web/account.ts`, `public/account.html` (hồ sơ, liên kết, đổi PIN, bố cục 2 cột máy tính — bảo trì đọc dòng riêng ở trên) | `dot-c-smoke.mjs` (xem hàng cuối bảng) + `v1-bao-tri.mjs` nếu đụng phần bảo trì |
+| "Việc của tôi" của hướng dẫn viên: `web/viec-cua-toi.ts`, `src/shared/viec-cua-toi.ts`, khối `.hdv-*` của `public/app.css`, dòng gọi `initViecCuaToi` ở `web/account.ts` (Task 1.8 ADR-0030) | `hdv-viec-cua-toi-smoke.mjs` ở `docs/evidence/2026-09-27-tu-choi-huy-hdv/kich-ban/` (8 bước, 390 + 1040, không cần mạng ngoài) + `dot-c-smoke.mjs` nếu đụng bố cục 2 cột của trang Tôi |
```

## Thay đổi 2 — dòng `va3-smoke.mjs` (dòng 46): bỏ phần "Việc của tôi" đã chuyển đi

```diff
-| `web/staff.ts` (nút "Đặt lại PIN" không hiện ở hàng/thẻ "(bạn)" — DK-T3-02), `web/account.ts` (vùng "Huỷ đơn" của "Việc của tôi": hỏi lại, ẩn khi tour đã qua ngày đi — DK-T4-02), khối `.myjob-cancel` của `public/app.css` | `va3-smoke.mjs` ở `docs/evidence/2026-09-26-va-3-loi-kiem-toan/kich-ban/` |
+| `web/staff.ts` (nút "Đặt lại PIN" không hiện ở hàng/thẻ "(bạn)" — DK-T3-02) | `va3-smoke.mjs` ở `docs/evidence/2026-09-26-va-3-loi-kiem-toan/kich-ban/` (bước 1–2; phần DK-T4-02 của "Việc của tôi" nay ở `hdv-viec-cua-toi-smoke.mjs`, dòng trên) |
```

## Cách áp khi chủ duyệt

Áp đúng hai khối `diff` trên vào `web/CLAUDE.md` trong một commit riêng ghi "chủ duyệt <ngày>"; không đổi dòng nào khác.
