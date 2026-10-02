# Vận chuyển Đợt 4 — Tiền xe thuê (T1 + T2 máy chủ): NHẬT KÝ THI CÔNG

Kế hoạch: `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-04-tien-xe-thue.md`. ADR: `docs/adr/ADR-0057-van-chuyen-tien-xe-thue.md` (accepted 30/9).
Làn máy chủ (Task 0 → 12). **Không** làm Task G (giao diện) — làn khác, sau khi có bản vẽ.

## Task 0 — cổng trước thi công (2026-10-02)

- Nền: `git fetch origin` + `git merge origin/main` → "Already up to date"; sha nền **`992f7cbe`** (= origin/main lúc bắt đầu).
- **Bước 1 (chủ chạy, AI không chạy):** chủ trả lời nguyên văn: *"Trống, hiện chỉ có nhà xe là chính cty Tour Đảo và 1 xe demo"* ⇒ coi như **0 chuyến xe thuê** ở mọi trạng thái ⇒ đi tiếp như ADR: cờ `rented` `DEFAULT 0`, **không backfill**, Task 7 không có câu `UPDATE … PLANNED`.
- **Cần chủ 2:** (A) — T2 lên production CÙNG màn nhập giá (nhánh này không gộp `main` tới khi có G1–G2).
- **Cần chủ 3:** chủ chọn **"900.000đ — giá ngày chạy"** = (A) **dời ngày cũng tính lại** (đảo + chụp theo bảng giá ngày mới; giá thoả thuận bị huỷ). Thi công: `canChupLai = laTaoMoi || doiXeHoacNhaXe || doiTuyen || doiNgay`, `doiNgay` = ngày VN của giờ bắt đầu MỚI ≠ `vc_trip.service_date` (dời giờ trong cùng ngày KHÔNG tính lại). Ca RF1-g là bài thật.
- **Bước 2 — số migration:** điều phối cấp **0072** (T1, `0072_vc_bang_gia_thue.sql`) và **0073** (T2, `0073_vc_chi_phi_chuyen.sql`); `main` lớn nhất `0069`; `0070`, `0071` đã cấp cho làn khác (luật làn 6 — không tự đặt số).
- **Bước 3 — `ky-so` (ADR-0080):** `git log main --oneline -S ky_period_close -- migrations` → **rỗng** ⇒ T2 không cần trigger khoá kỳ (gộp trước lượt 2 sổ); Task 7 bước 3b bỏ qua.
- **Bước 4 — đo lại dòng ở `992f7cbe`** (lệch so với bảng §0 của kế hoạch):
  - `OFFICE_GATE` `src/shared/permissions.ts:255` (kế hoạch :252).
  - `VIEW_CHO_TRIGGER_VC` `src/architecture.test.ts:859` (kế hoạch :857); bài "không module nào import van-chuyen" ~`:844`.
  - `nhaXeDangHopTac` `src/modules/parties/index.ts:134`, `ownerCompany` `:100`, `partySummary` `:61` (khớp).
  - `kiemXuatBen` `src/shared/dieu-phoi-kiem.ts:302`, `ChuyenVao` `src/shared/dieu-phoi-kieu.ts:242`, `MA_LY_DO_HE_THONG` `:30`, `chuyenVao` `src/modules/van-chuyen/dieu-phoi-doc.ts:77` (khớp).
  - `loTaoChuyen` `dieu-phoi.ts:112`, `loSuaChuyen` `:134`, `loHuy` `:239`; `lenhSuaChuyen` `dieu-phoi-lenh.ts:37`, `lenhHuy` `:256`; route tạo chuyến dựng lô ở `src/modules/van-chuyen/index.ts:~850`.
  - `nhaXeDangHopTac` = `listCarriers` đọc đúng `v_pty_carrier` (vai `CARRIER`, `valid_to_date IS NULL`) — tập máy chủ khớp tập trigger.
  - Ca mẫu B23 (`golden/dieu-phoi/xe-a-b-luot-1.json`): cả tệp `cho_xac_nhan` (không dừng ở Task 8 bước 4).
  - `audit_log.action` không có CHECK (bỏ từ `0007`) — hành động mới chỉ thêm ở `src/shared/audit-actions.ts`.
  - Đợt 2 (`baoThayDoiChuyen`) chưa có trên `main` ⇒ Task 10 bước 3b bỏ qua.

### Theo lệnh điều phối (khác chữ kế hoạch)
- Không gọi subagent `nguoi-kiem-doc-lap` ở Task 5 bước 7 / Task 12 bước 4 (luật làn 4 cấm gọi subagent): danh sách soi ghi vào báo cáo điều phối; lát này **chưa có người kiểm độc lập**.
- Một mục nhật ký thay đổi cho cả đợt (bản tạm **1.70**), điều phối sửa lời khi gộp giao diện.
- Ca RF1-g là bài thật (Cần chủ 3 = A).

## Sổ task

