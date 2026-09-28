# Tách "Danh mục giấy tờ" theo chủ dữ liệu — đề xuất sửa luật (CHỜ CHỦ DUYỆT)

- **Ngày:** 2026-09-28.
- **Người soạn:** người thi công việc "Tách theo chủ dữ liệu" (nhánh `worktree-agent-afbeda3cc36823996`, tách từ `origin/main` @ `3bb73f0` = bản 1.35; mã ở commit `8db6357`). Nhật ký việc: `docs/superpowers/plans/2026-09-28-tach-danh-muc-giay-to-nhat-ky.md`.
- **Vì sao có tệp này:** Hiến pháp N9 — AI không tự sửa luật chi phối chính mình; `web/CLAUDE.md` là luật (CLAUDE.md gốc §3). Người thi công chỉ **đề xuất**; chủ duyệt thì người được giao áp nguyên văn, một commit.
- **Căn cứ:** chủ dự án chọn 2026-09-28 (trực tiếp với điều phối) "Tách theo chủ dữ liệu": "Loại giấy tờ xe" thuộc Vận chuyển; "Loại giấy tờ người" (loại giấy tờ của người + hạng giấy phép lái xe) là danh mục chung trong nhóm Quản trị; bỏ dòng "Danh mục giấy tờ" ở trang "Của tôi".
- **Tính chất:** chỉ sửa CHỮ trong bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" cho khớp tên tệp, đường dẫn và số đếm mới. **Không nới, không siết** hàng rào nào: kịch bản Chrome giữ TÊN `danh-muc-giay-to-smoke.mjs` (vì thế bảng hiện tại vẫn trỏ đúng tệp tới khi chủ duyệt), chỉ đổi nội dung kiểm.
- **Đã soát các tệp luật khác** (`grep -n "Danh mục giấy tờ\|danh-muc-giay-to\|Quản trị nay 13\|:538"` trên `CLAUDE.md`, `src/CLAUDE.md`, `docs/ARCHITECTURE.md`): không nhắc trang này → không cần sửa.
- **Trạng thái:** **CHỜ CHỦ DUYỆT.** Chưa áp.

## Mục 1 — `web/CLAUDE.md` dòng 51 (trang Danh mục giấy tờ)

Nguyên văn cũ → mới (số dòng đo trên `3bb73f0`; nhánh này không sửa `web/CLAUDE.md`):

```diff
-| Trang Danh mục giấy tờ (khuôn sẵn trang Địa điểm — bản vẽ Vận chuyển không vẽ màn này): `web/danh-muc-giay-to.ts`, `public/danh-muc-giay-to.html`, dòng "Danh mục giấy tờ" ở `web/account.ts` (ADR-0040) | `danh-muc-giay-to-smoke.mjs` ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/` (6 bước: Quản trị ba khối 6 / 4 / 8 dòng, thêm, sửa, ngưng loại hệ thống cần → câu tiếng Việt; Bán hàng không thấy; 390 + 1040, không cần mạng ngoài) + `dot-c-smoke.mjs` (bố cục trang Tôi) |
+| Hai trang danh mục giấy tờ (khuôn sẵn trang Địa điểm — bản vẽ Vận chuyển không vẽ; tách theo chủ dữ liệu 2026-09-28): `web/loai-giay-to-xe.ts`, `web/loai-giay-to-nguoi.ts`, khối dùng chung `web/danh-muc-giay-to-khoi.ts`, `public/loai-giay-to-xe.html`, `public/loai-giay-to-nguoi.html`, trang chuyển hướng `public/danh-muc-giay-to.html`, dòng "Loại giấy tờ người" / "Loại giấy tờ xe" ở `web/account.ts`, mục "Loại giấy tờ người" / mục con "Loại giấy tờ xe" ở `web/shell.ts` (ADR-0040) | `danh-muc-giay-to-smoke.mjs` ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/` (10 bước: lối vào ở trang Tôi và thanh bên; trang người hai khối 4 / 8 dòng, trang xe một khối 6 dòng; thêm, sửa, ngưng loại hệ thống cần → câu tiếng Việt; đường dẫn cũ tự chuyển sang trang người; Bán hàng không thấy, mở thẳng bị từ chối; 390 + 1040, không cần mạng ngoài) + `xe-smoke.mjs` (thứ tự mục thanh bên / nhóm VẬN CHUYỂN) + `trang-chu-smoke.mjs` (đếm mục thanh bên) + `dot-c-smoke.mjs` (bố cục trang Tôi) |
```

**Lý do:** trang `/danh-muc-giay-to` không còn mã (chỉ chuyển hướng); ba tệp mới thay `web/danh-muc-giay-to.ts`; lối vào nay ở cả thanh bên (`web/shell.ts`) nên sửa phải chạy thêm hai kịch bản khoá thanh bên (`xe-smoke`, `trang-chu-smoke`); kịch bản nay 10 bước.

## Mục 2 — `web/CLAUDE.md` dòng 53 (Xe — đếm mục thanh bên)

```diff
-| Xe (bản vẽ 00–02): `web/xe.ts`, `web/xe-sua.ts`, `public/xe.html`, `public/xe-sua.html`, mục "Vận chuyển" của `web/shell.ts`, nhóm VẬN CHUYỂN của `web/account.ts`, huy hiệu `web/vc-dem.ts` | `xe-smoke.mjs` (13 bước) + `trang-chu-smoke.mjs` (đếm mục thanh bên — Quản trị nay 13 mục, thêm 3 mục Vận chuyển; kịch bản còn khoá 14 ở `:538` / `:964` — nợ ADR-0038, đỏ sẵn, không do 1a) + `dot-c-smoke.mjs` (bố cục trang Tôi) |
+| Xe (bản vẽ 00–02): `web/xe.ts`, `web/xe-sua.ts`, `public/xe.html`, `public/xe-sua.html`, mục "Vận chuyển" của `web/shell.ts`, nhóm VẬN CHUYỂN của `web/account.ts`, huy hiệu `web/vc-dem.ts` | `xe-smoke.mjs` (13 bước) + `trang-chu-smoke.mjs` (đếm mục thanh bên — Quản trị nay 15 mục: thêm 3 mục Vận chuyển 1a và 2 mục tách danh mục giấy tờ 2026-09-28; kịch bản khoá 16 ở `:540` / `:966` — thiếu "Nhật ký" là nợ ADR-0038, đỏ sẵn, không do 1a hay việc tách) + `danh-muc-giay-to-smoke.mjs` nếu chạm mục con "Loại giấy tờ xe" + `dot-c-smoke.mjs` (bố cục trang Tôi) |
```

**Lý do:** số mục thật của Quản trị đổi 13 → 15 ("Loại giấy tờ người", "Loại giấy tờ xe"); dòng khoá trong `trang-chu-smoke.mjs` dời xuống `:540` / `:966` (thêm hai dòng chú thích) và khoá 16 (chỉ cộng phần của việc này, như tiền lệ Ruling R23 — không chữa nợ ADR-0038).

## Tóm tắt để chủ duyệt

| Mục | Tệp | Việc | Nới / siết |
|---|---|---|---|
| 1 | `web/CLAUDE.md` dòng 51 | đổi tên tệp, lối vào, mô tả kịch bản (6 → 10 bước), thêm hai kịch bản khoá thanh bên | không (sửa chữ cho khớp mã) |
| 2 | `web/CLAUDE.md` dòng 53 | số mục thanh bên 13 → 15, dòng khoá `:538` / `:964` → `:540` / `:966` (khoá 16) | không (sửa chữ cho khớp mã) |

Chủ duyệt thì: áp nguyên văn hai dòng trên trong MỘT commit; ghi "ĐÃ DUYỆT <ngày giờ> — ĐÃ ÁP <commit>" vào dòng Trạng thái của tệp này.
