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

- Task 1: xong — luật thuần `chonDongGiaThue`, `coXeCua`, `dongChongGia` (`src/modules/van-chuyen/tien-xe.ts`), 3/3 bài.
- Task 2: xong — `migrations/0072_vc_bang_gia_thue.sql` (tuyến, cỡ xe, giá thuê) + `src/migrations-tien-xe-thue.test.ts` 5/5; từ điển dữ liệu 3 bảng.
  - P16 (2026-10-02, bản sao đã sửa qua biến `TIEN_XE_GIA_SQL`): (1) `r.route_code IS NEW.route_code` → `=` ⇒ bài "chồng hiệu lực…" ĐỎ (dòng cỡ-không-tuyến chèn trùng lọt); (2) bỏ trigger `vc_rental_rate_carrier` ⇒ bài "vai CARRIER chỉ khi THÊM…" ĐỎ. Hoàn nguyên ⇒ 5/5 xanh.
- Task 3 + 4: xong (một commit — bài "mỗi ô được máy chủ hỏi" đòi đi cùng) — ô `transport.rate.view/manage` (Quản trị = Kế toán, HR none; ghim DRIVER / DRIVER_PARTNER / HR / PARTNER + bài ghim `transport.*`), 9 route (bảng giá, kết thúc giá, tuyến, cỡ xe), khung thử thêm `nhaXeKhung`, `taiXeNhaXe`, `xeNhaXe`, `thoiHopTac`; `tien-xe-route.test.ts` 6/6; e2e `tien-xe-thue` xanh (D1 local: `typeof(amount)` = integer).
  - Theo đánh giá bản vẽ (điều phối 2/10, DANH-GIA §4 mục 4, 5, 6, 11): tuyến / cỡ xe **máy sinh mã** (`T001…`, `S001…`; nhãn cỡ mặc định "a–b khách" / "a khách"); `GET /bang-gia` trả **mọi dòng** của nhà xe + `trangThai` (DANG_AP / SAP_AP / DA_KET_THUC theo `ngay`, không lọc) + danh sách nhà xe gồm nhà xe đã thôi còn giá chưa kết thúc (`dangHopTac: false`); lỗi thêm giá cho nhà xe đã thôi: "Nhà xe này đã thôi hợp tác — không thể thêm giá mới."; `CoXeDto.soDongGiaDangAp` (null với người không xem giá).
  - Chốt: id dòng giá = `requestId` (gửi lại cùng requestId → 200 dòng cũ) — vì sao: chống bấm hai lần không cần bảng sự kiện; sai thì tốn: đổi sang cột riêng, không ảnh hưởng dữ liệu.
  - Chốt: "thay dòng X" mà X vừa bị người khác kết thúc trước ngày mới → dòng mới vẫn lưu (trigger chồng giá đã cho qua) + 409 `gia_vua_doi` "giá mới đã lưu, tải lại" — vì sao: D1 không huỷ được lô sau khi chạy; sai thì tốn: một lần tải lại.
  - Chốt: số tiền giá tối đa 1.000.000.000 đ/chuyến (chặn gõ thừa số 0) — đổi một hằng `TIEN_TOI_DA`.
  - `src/route-access.test.ts` SNAPSHOT 216 → 225 (+9 route office).
- Task 5: xong — kiểm định kỳ `R-VC-RATE-1` (warn) + bài; `docs/SO-HANG-RAO.md` 4 dòng (chồng giá, chỉ-thêm, vai nhà xe lúc thêm, ghim `transport.*`) đều có ngày thấy chặn thật 2026-10-02 (đột biến thêm: bỏ `vc_rental_rate_close_once` ⇒ bài "chỉ-thêm…" đỏ; ADMIN của `transport.rate.manage` = none ⇒ 4 bài permissions đỏ); SYSTEM-DESIGN §5 (3 bảng + 0072) §7 (6 dòng route); CHANGE-GUIDE công thức z10; nhật ký phiên bản 1.70 (một mục cho cả đợt). `npm test` 2784/2784 + bài đo giờ 1/1; typecheck 0 lỗi.
  - `node scripts/audit-invariants.mjs --db local` (sau `db:migrate:local`, 0072 áp): thoát 1 vì **R-N1-5** (D1 local của worktree mới không có quản trị viên nào — có sẵn, không do đợt này); `R-VC-RATE-1` ✓.
  - Người kiểm độc lập T1: KHÔNG gọi (luật làn) — danh sách soi ghi ở báo cáo điều phối.
- Task 6: xong — luật thuần T2 (`tongChiPhiChuyen`, `dongConHieuLuc`, `nguonGiaConHieuLuc`, `thuTuDaoTatCa`, `phanLoaiThue`, `tongBangKe`) + theo bản vẽ: `tongDieuChinh` (cột Điều chỉnh bảng kê là TIỀN — điều phối chốt), `daoDuoc` (cờ nút "Đảo dòng"); `tien-xe.test.ts` 8/8. Sổ vàng `golden/van-chuyen-chi-phi.json` 19 ca (V1…V13 + V5b, V6b, V8b, V12b + V14/V14b dời ngày theo Cần chủ 3 = A), MỌI ca `cho_xac_nhan`; `src/so-vang-chi-phi-xe.test.ts`: lớp 1 xanh, lớp 2 `todo` (0 ca xác nhận), chạy thử chẩn đoán: 19/19 KHỚP (không phải nghiệm thu).
  - `ky-so` kiểm lại trên `origin/main` sau fetch: vẫn rỗng.
- Task 7: xong — `migrations/0073_vc_chi_phi_chuyen.sql` (cột `rented` DEFAULT 0 không backfill, `route_code`; bảng `vc_trip_cost_line`; 17 trigger; 8 lý do nhóm `CHI_PHI_XE`); `src/migrations-tien-xe-thue.test.ts` thêm 13 ca CSDL (18/18). Không có `ky-so` ⇒ không trigger khoá kỳ (ca 14 bỏ).
  - Lệch kế hoạch (cần để bộ kiểm chính xanh ở commit này): câu `TRIP_INSERT` / `TRIP_UPDATE_PLAN` mang `rented`, `route_code` ngay ở Task 7 (`TripRow` + `COT_CHUYEN` thêm hai cột; route tạo chuyến + `lenhSuaChuyen` tính cờ bằng `phanLoaiThue` + `docPhanLoai` — chỉ tính lại khi đổi xe); thêm nhóm `CHI_PHI_XE` vào `NHOM_LY_DO` (nhãn "Chi phí xe thuê") + tiền tố `CPX` ở `chinh-sach-hien-thi.ts`.
  - Fixture sửa: `src/migrations-chuyen-xe.test.ts` hàm `chuyen()` tính `rented` theo chủ chụp; bài (a) thêm `vc_trip_cost_line` vào danh sách bảng `vc_trip*`; TC-13 câu đổi xe sang xe nhà xe thêm `rented = 1` để chỉ còn LC-13 chặn. `src/audit-invariants.test.ts` (`tho()` gỡ mọi trigger `vc_trip%`) KHÔNG phải sửa. Bài ghim lý do gieo (`migrations-chinh-sach-dieu-phoi.test.ts`, `chinh-sach-route.test.ts` 13 → 21, `dieu-phoi-kieu.test.ts`) thêm 8 lý do / nhóm mới.
  - Nhãn mã hệ thống theo đánh giá bản vẽ §4 mục 10 + Cần chủ 3 = A: `CPX_DOI_CHUYEN` = "Đảo do đổi chuyến (xe, nhà xe, tuyến hoặc ngày chạy)", `CPX_HUY_CHUYEN` = "Đảo do huỷ chuyến".
  - P16 (2026-10-02, bản sao qua biến `TIEN_XE_CHI_PHI_SQL`, script `p16_t7.py` ngoài kho): gỡ TỪNG trigger ⇒ đúng một bài đỏ, hoàn nguyên ⇒ 18/18: `vc_trip_thieu_gia` → ca 7; `vc_trip_insert_planned` → ca 1; `vc_trip_rented_lower` → ca 4; `vc_trip_rented_ins` → ca 2; `vc_trip_rented_change` → ca 3; `vc_trip_rented_alone` → ca 5; `vc_trip_route_locked` → ca 6; `vc_trip_cost_line_one_source` → ca 10; `vc_trip_cost_line_total` → ca 12; `vc_trip_cost_line_source_planned` + `_reverse_source_planned` → ca 11; `vc_trip_cost_line_source_carrier` + `_snapshot_rate` → ca 13; `vc_trip_cost_line_reversal` → ca 9; `vc_trip_cost_line_no_update` / `_no_delete` / `_reason` → ca 8.
  - `npm test` 2805 (2804 đạt + 1 todo sổ vàng lớp 2), 0 đỏ; typecheck 0.
