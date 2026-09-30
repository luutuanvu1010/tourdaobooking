# Đề xuất sửa luật — Lượt 1 (ADR-0058 nhóm dịch vụ + ADR-0062)

> Người thi công KHÔNG tự sửa tệp luật (CLAUDE.md N9). Dưới đây là diff nguyên văn để chủ duyệt; điều phối áp lúc gộp. Mục B do Task B8 bổ sung.

## Mục A — ADR-0058 nhóm dịch vụ (Task A8, 2026-10-01)

### A-1. `src/CLAUDE.md` (dòng "Module nghiêm")
Lý do: `catalog` vẫn LEGACY nhưng có tệp SQL nửa nghiêm và tiền tố bảng mới `ctl_`; ai sửa module cần biết chỗ đặt câu `ctl_*` và hạn (ADR-0058).
```diff
-Module cũ (`accounts`, `audit`, `catalog`, `orders`) ở `LEGACY`: ngoại lệ có hạn, đừng coi là mẫu. Riêng `orders`: SQL mới chỉ ở tệp nửa nghiêm
+Module cũ (`accounts`, `audit`, `catalog`, `orders`) ở `LEGACY`: ngoại lệ có hạn, đừng coi là mẫu. Riêng `catalog` (tiền tố bảng `ctl_`, ADR-0058, hạn LEGACY 2027-03-31): SQL nhóm dịch vụ chỉ ở tệp nửa nghiêm `catalog/nhom-repo.ts` (`defineSql`, EXPLAIN) — không viết câu `ctl_*` thô trong `repository.ts`. Riêng `orders`: SQL mới chỉ ở tệp nửa nghiêm
```

### A-2. `web/CLAUDE.md` (bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào") — thêm hai dòng
Lý do: hai kịch bản mới của ADR-0058 chưa có dòng nào trong bảng nên sửa các tệp này sẽ không ai nhắc chạy lại.
```diff
+| Chip nhóm dịch vụ ở ô chọn dịch vụ của form đơn (ADR-0058 Đ5–Đ7): `web/catalog-picker.ts`, `src/shared/loc-danh-muc.ts`, khối `.loc-*` của `public/app.css`, phần chip của `web/order-form.ts` | `chip-nhom-smoke.mjs` ở `docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/` (1040 + 390, cần D1 local tạm) + `danh-muc-lap-don-smoke.mjs` ở `docs/evidence/2026-09-27-danh-muc-lap-don/kich-ban/` |
+| Màn Danh mục — nhóm dịch vụ (ADR-0058 Đ4, Đ8, Task A7): `web/catalog.ts`, `public/catalog.html`, `src/shared/lich-su-nhom.ts`, khối `.nhom-*` / `.chon-*` của `public/app.css` | `danh-muc-nhom-smoke.mjs` ở `docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/` (10 bước, 1040 + 390, không cần mạng ngoài) + `dot-a-smoke.mjs` (mốc bảng→thẻ + axe của `/catalog`; bước `nhat-ky` của nó đỏ sẵn từ ADR-0038, không do nhóm dịch vụ) |
```

### A-3. `docs/ARCHITECTURE.md` Phần II, mục "Bảng mới" (danh sách tiền tố)
Lý do: Phần II có liệt kê tiền tố theo migration; `ctl_` (nới `TABLE_PREFIX` đã duyệt trong câu duyệt ADR-0058) chưa có.
```diff
-(`pty_`, `loc_`, `stf_`, `dsp_` từ migration 0014, `mnt_` từ `0016_maintenance`, `fbk_` từ `0016_feedback`, `aut_` từ `0023_auth_passkey`, `ntf_` từ `0025_thong_bao`, `vc_` từ `0033_van_chuyen_xe`, `ord_` từ `0034_chang_dua_don`, sau này `bil_`)
+(`pty_`, `loc_`, `stf_`, `dsp_` từ migration 0014, `mnt_` từ `0016_maintenance`, `fbk_` từ `0016_feedback`, `aut_` từ `0023_auth_passkey`, `ntf_` từ `0025_thong_bao`, `vc_` từ `0033_van_chuyen_xe`, `ord_` từ `0034_chang_dua_don`, `ctl_` từ `0053_nhom_dich_vu` (module `catalog`, ADR-0058), sau này `bil_`)
```

### A-4. `docs/adr/README.md`
Lý do: dòng 0058 còn ghi migration `0046` giữ chỗ, mà 0050–0052 đã lên main trước nên số thật là `0053`; bảng giữ chỗ 0046–0049 đã lỗi thời sau luật "không giữ chỗ" của 1.46.
```diff
-...; `catalog` còn LEGACY hạn 2027-03-31; migration `0046` (giữ chỗ). Bổ sung ADR-0033 điều 2, ADR-0028 điều 2–3 | một chiều (bảng, dữ liệu gieo) | **accepted** 2026-09-30 (lượt duyệt 1a, phiên điều phối chung) |
+...; `catalog` còn LEGACY hạn 2027-03-31; **đã thi công**, migration `0053` (đổi từ giữ chỗ `0046` vì `0050`–`0052` lên main trước). Bổ sung ADR-0033 điều 2, ADR-0028 điều 2–3 | một chiều (bảng, dữ liệu gieo) | **accepted** 2026-09-30 (lượt duyệt 1a, phiên điều phối chung) |
```
Bảng giữ chỗ (khối các dòng "- 0040, 0041, 0042 …"):
```diff
-- 0046: ADR-0058 (nhóm dịch vụ); 0047: ADR-0062 (view báo tin); 0048: ADR-0063 (bảng đếm lượt đổi giờ, phải sau 0044); 0049: ADR-0065 (cột số khách đi xe, phải sau 0044) — giữ chỗ 2026-09-30, phiên điều phối chung;
+- (Đã bỏ giữ chỗ 0046–0049 — lịch sử: 0046 dự định cho ADR-0058 nay là `0053_nhom_dich_vu`.) Số migration = số lớn nhất trong `migrations/` của main lúc gộp + 1 (luật từ 1.46); ADR-0062 / 0063 / 0065 nếu có migration thì lấy số theo luật đó.
```
