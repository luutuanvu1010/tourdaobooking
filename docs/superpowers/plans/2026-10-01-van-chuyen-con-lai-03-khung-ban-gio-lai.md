# Đợt 3 — Lịch xe vào xưởng (khung bận) + cảnh báo giờ lái: Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Quản trị ghi được "xe X bận từ … tới …" (vào xưởng, đăng kiểm…); máy không cho xếp chuyến vào khung đó và không cho ghi khung chồng lên chuyến đã xếp; lịch và lệnh xếp cảnh báo (không chặn) khi tài xế lái quá 8 giờ/ngày hoặc một chuyến dài quá 4 giờ.

**Architecture:** Một bảng mới `vc_unavailability` của module `van-chuyen`, định trọn cho hai đối tượng (`VEHICLE`, `DRIVER`) theo đúng hình ADR-0053 D9.1 — đợt này chỉ mở `VEHICLE`, trigger chặn ghi `DRIVER`. Luật lõi hai lớp: trigger (đọc chỉ bảng `vc_`) + MỘT hàm thuần `kiemTaoSuaChuyen` nhận khung bận như khoảng chặn. Giờ lái là luật thuần MỘT hàm `gioLaiTaiXe` (src/shared) dùng cho lệnh tạo/sửa chuyến lẫn lịch chung; hai con số là hai cột mới của `vc_dispatch_policy`.

**Tech Stack:** Cloudflare Worker + D1 (SQLite), TypeScript, `node --test` (node:sqlite), e2e `tests/e2e/*.mjs`, giao diện thuần `web/*.ts`.

**Spec:** `docs/adr/ADR-0055-van-chuyen-kernel-luot-2.md` (VK2-A, VK2-B, mục "Hệ quả của ADR-0057", tiêu chí 1–4 và 8); `docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md` §D9.1–D9.3 (hình bảng dùng chung); lộ trình mẹ `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md`. VK2-C (số hiệu chuyến bay) **ĐÃ CÓ** (`migrations/0058_chang_so_nguoi_chuyen_bay.sql`, `src/migrations-chang-o-moi.test.ts`) — ngoài phạm vi đợt này.

**Đo mã thật** (worktree `doi-chieu-phieu-giam-doc` @ `0ba370d6`, 2026-10-01): `kiemTaoSuaChuyen` `src/shared/dieu-phoi-kiem.ts:79-130`; `kiemXep` trả `canhBao` (`:198-232`, có từ 1.62); `KhungChuyen` `src/shared/dieu-phoi-kieu.ts:220-231` (CHƯA có giờ xuất bến); `ChinhSachVao` `:123-130`; `LOAI_CANH_BAO_LICH` `src/shared/dieu-phoi-lich-chung.ts:44-49`; `vc_dispatch_policy` `migrations/0041:13-33` (KHÔNG DEFAULT, trigger cấm sửa — khuôn I43); trigger LC-03 `migrations/0042:352-381`; `loiRangBuocChuyen` `src/modules/van-chuyen/rules.ts:148` (regex `lc0[1-9]_` → `trip_rule`); route chính sách `src/modules/van-chuyen/index.ts:501-528`; route xe `:318-497`; route lịch `:798-806`; `dungLichNgay` `src/modules/van-chuyen/dieu-phoi-lenh.ts:376-424`; `chiTietChuyen` `src/modules/van-chuyen/dieu-phoi-route.ts:131-185`; mapper `khungChuyen`/`chuyenVao` `src/modules/van-chuyen/dieu-phoi-doc.ts:75-81`; bài thân trigger `src/architecture.test.ts:873-879` (quét chuỗi `vc_*`) và `:951+` (EXPLAIN — bảng phải có trong `docs/data-dictionary.json`); bài khoá DTO tài xế `src/modules/van-chuyen/tai-xe-dto.test.ts:9-15`; màn: `web/chinh-sach-dieu-phoi.ts:144-145`, `web/xe-chi-tiet.ts`, `web/dieu-phoi.ts`. Người thi công **đo lại** lúc nhận (Đợt 1, 2 chạy song song có thể đổi dòng).

## Cập nhật 2026-10-02 — theo bản vẽ Claude Design + lời chủ

Bản vẽ đã nhận 2/10: `docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html` (dự án Claude Design `f0f47482-c51a-4232-b5c0-d924871ce294`). Đo lại trên `origin/main` 992f7cbe. Đổi so với bản 1/10:
- **Màn mới là TRANG LỊCH TUẦN RIÊNG** `/lich-xe-ban` (hàng = xe, cột = 7 ngày, form "Thêm lịch bận" mở tại chỗ), mục con "Lịch xe bận" sau "Xe" ở thanh bên + trang Tôi. **Bỏ** khối trong Chi tiết xe (`web/xe-chi-tiet.ts` không còn sửa) — Task 10.
- **Route đọc tuần mới** `GET /api/van-chuyen/ban-xe?tu=` (ô `vehicle.manage`, 403 trước 400; tuần theo `vnWeekRange` — MỘT hàm với màn); trả kèm chuyến đã xếp **chỉ mã `CX-…` + giờ**, chỉ khi `can(trip.view)` — Task 6 Step 3b.
- Form có ô **"Đến ngày"** (3.3); **Lý do = ô chọn** danh mục `BAN_XE` ở đúng chỗ ô gõ của bản vẽ (3.2 — cổng trước migration, Task 1 Step 3).
- Nút ✕ của bản vẽ giữ hình nhưng = **"Rút" có hỏi + gửi `version`** (ADR-0055 A1, không hỏi chủ).
- Dải bận trên Điều phối xe + hai cảnh báo giờ lái: bản vẽ không vẽ ⇒ **làm theo khuôn có sẵn, không chờ vẽ**.
- Thanh bên thêm một mục ⇒ `trang-chu-smoke.mjs`: Quản trị 17 → 18, Toàn quyền 23 → 24.
- Migration số **`0071`** (đã cấp). Phần máy chủ bảng `vc_unavailability` (Task 1) **giữ đúng ADR-0053 D9.1** — không đổi.
- "Đúng bản vẽ 100%" ở bề mặt, **trừ hai lệch có chủ đích**: phông Be Vietnam Pro (quyết định 30/9, bản vẽ Nunito) và nút "Lưu" `.btn-primary` theo luật "màu theo vai" 2/10 (bản vẽ nền navy đặc).
- Câu 3.1–3.4: chủ đồng ý khuyến nghị (2/10 tối); Lượt III câu 7: không trả lời ⇒ theo chữ ADR — xem "Cần chủ".

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`VEHICLE`, `BAN_XE`, `GIO_LAI_VUOT`…) ra màn hình.
- Ngày dân sự giờ Việt Nam (`vnToday`, `vnLocalToMs`, `msToVnLocal`); dấu thời gian ISO UTC; MỘT mốc giờ mỗi request (`new Date().toISOString()` của máy chủ).
- Không xoá cứng; khung bận chỉ-thêm, chỉ một kiểu sửa: rút một lần. Đổi giờ = rút + ghi khung mới.
- Migration chỉ thêm tệp mới; **không sửa `0041`, `0042`** (L1 lộ trình — đã áp remote bản 1.38). Bảng mới → `docs/data-dictionary.json` + `npm run dict`.
- Số migration: **`0071`** (điều phối đã cấp 2026-10-02 theo L2; `main` hiện tới `0069`). Task 0 chỉ kiểm lại rằng `0071` còn trống trên mọi nhánh.
- Thân trigger `vc_*` chỉ đọc bảng `vc_` (Hiến chương 5.3; `src/architecture.test.ts:873`, `:951`).
- Luật lõi ở **cả** trigger lẫn máy chủ; máy chủ nói trước bằng lời (mã lớp route), CSDL là lưới thứ hai (mã lớp CSDL KHÁC — khuôn R15).
- Mọi câu đọc khung bận đợt này lọc **`subject = 'VEHICLE'`** tường minh (D9.2: Kế toán không được thấy khung bận tài xế khi Đợt 6 mở).
- Không ô quyền mới (ADR-0055 A4): ghi/rút = `vehicle.manage`; xem = `vehicle.manage` (trang tuần "Lịch xe bận", route `GET /ban-xe` + `GET /xe/:id/ban`) và `trip.view` (lịch chung — dải bận). DTO tài xế **không** có khung bận.
- Không thêm mã vào `MA_LUAT_PHA_LE`; không thêm mã vào `MA_GIU` (ADR-0055 mục "Hệ quả của ADR-0057") — xem "Cần chủ" câu 1.
- Giờ lái **chỉ cảnh báo**: không vào `kiemXuatBen`, không chặn, không cột trên `vc_trip`.
- Nhật ký `vehicle_unavailability_added` / `_withdrawn`: biển số + khung giờ + nhãn lý do; không dữ liệu cá nhân.
- Giao diện: không `innerHTML`; CSS chỉ token; ô gõ 16px; ẩn/hiện theo `can()`; kịch bản Chrome 390 + 1040. Bản vẽ trang mới **đã nhận 2/10** (`docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html`) — bề mặt làm đúng bản vẽ; phần bản vẽ thiếu (dải bận Điều phối xe, cảnh báo giờ lái, lỗi, trống, 403, khổ 390) theo khuôn có sẵn.
- Việc lớn (dữ liệu + luật lõi) ⇒ người kiểm độc lập chỉ đọc cuối đợt; người thi công không tự nghiệm thu.
- Xong đợt: `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, `node scripts/audit-invariants.mjs --db local` không vi phạm, mục nhật ký phiên bản `src/shared/changelog.ts` + `src/shared/app-info.test.ts`.

## Review Focus

1. **Ranh giới nửa đêm giờ VN** (lộ trình dòng 3): chuyến 06:00 VN (= 23:00 UTC hôm trước) tính cho ngày VN; chuyến 23:30 VN ngày D qua nửa đêm tính trọn cho D (không chia sang D+1); khung bận 23:00 D → 07:00 D+1 hiện trên lịch **cả** D và D+1; khoảng ngày của lịch chặn bằng nửa đêm VN, không nửa đêm UTC. Sở hữu: Task 3 (giờ lái), Task 2 + Task 7 (khung bận trên lịch).
2. **Hai người bấm cùng lúc**: Quản trị ghi khung bận đúng lúc người xếp xe tạo chuyến cùng xe cùng giờ ⇒ một bên thắng, bên kia 409 câu dễ hiểu, không dữ liệu nửa vời. Cả hai thứ tự đều bị trigger chặn. Sở hữu: Task 1 (CSDL cả hai thứ tự), Task 6 (ánh xạ mã lớp CSDL).
3. **Rút hai lần / hai người cùng rút** ⇒ người sau 409 "vừa có người đổi", không ghi nhật ký thừa. Sở hữu: Task 1 (trigger), Task 6 (route + e2e).
4. **Lọt khung bận của tài xế** cho người không được thấy: lịch chung (Kế toán có `trip.view`) và DTO tài xế không được có dòng `DRIVER` hay khoá khung bận. Sở hữu: Task 7.
5. **Màn chính sách cũ (PWA chưa cập nhật) gửi thân thiếu hai con số mới** ⇒ 400 câu "tải lại trang", không tự điền mặc định im lặng (khuôn I43). Sở hữu: Task 5.

## Tự chốt khi lập kế hoạch (bề mặt, đảo ngược được — ghi lại, không hỏi)

| # | Điều | Chốt | Cách hoàn tác |
|---|---|---|---|
| K1 | Thêm hai cột chính sách | ADR B1 đường **(2)**: migration mới `ADD COLUMN … NOT NULL DEFAULT 480 / 240 CHECK` (lệch khuôn I43 có ghi) + bài "câu chèn liệt kê đủ cột" + thân yêu cầu BẮT BUỘC hai số | migration mới |
| K2 | Đơn vị ô trong màn chính sách | **giờ** (thập phân được, như ô mốc tối thiểu); máy chủ lưu phút | sửa `chinh-sach-hien-thi.ts` |
| K3 | Hạt thời gian khung bận | phút tròn (`CHECK start_ms % 60000 = 0`) — ô nhập là `HH:MM` | migration mới |
| K4 | Khung bắt đầu trong quá khứ | **được** nếu kết thúc sau bây giờ (xe đã vào xưởng từ sáng); khung đã kết thúc → 400 | sửa `kiemKhungBanMoi` |
| K5 | Rút khung đã kết thúc | **không** (409 "khung đã qua") — lịch sử giữ nguyên | sửa route |
| K6 | Khung chồng khung cùng xe | **cho phép** (khớp D9 B9.5) — màn gộp hiển thị | — |
| K7 | Độ dài tối đa | xe 31 ngày (ADR G-A1) ở mã; tài xế 14 ngày là việc Đợt 6 | sửa hằng |
| K8 | Chuyến đang chạy quá giờ kết thúc dự kiến | trigger khung bận so với `planned_end_ms` (như LC-03 hiện có); lưới thứ hai R-VC-21 | migration mới |
| K9 | Số cảnh báo `GIO_LAI_VUOT` | **một mỗi chuyến chưa kết thúc** của tài xế trong ngày đó (`tripId` = chuyến) — thẻ chuyến nào cũng thấy; tổng vẫn cộng cả chuyến đã kết thúc | sửa `canhBaoGioLai` |
| K10 | Ngưỡng | "quá" = **lớn hơn hẳn** (8 giờ đúng không cảnh báo; 8 giờ 1 phút có) | sửa so sánh |
| K11 | Tên route / mã lỗi / hành động nhật ký | `GET\|POST /api/van-chuyen/xe/:id/ban`, `POST /api/van-chuyen/xe/:id/ban/:bid/rut`, `GET /api/van-chuyen/ban-xe?tu=` (trang tuần — thêm 2/10); trang `/lich-xe-ban`; route 409 `khung_ban_chong_chuyen`, CSDL 409 `khung_ban_chong_chuyen_csdl`; `vehicle_unavailability_added` / `_withdrawn` (ADR G-A2) | đổi tên trước phát hành |
| K12 | Ghi chú tự do trên khung | **không có cột** (không lối vào dữ liệu cá nhân) | migration mới thêm cột |
| K14 | "Dùng lại `canhBao` của 1.62" | dùng lại **khuôn** (cảnh báo không chặn, lệnh vẫn chạy, route gắn vào phản hồi như `canhBaoXep`) nhưng **không cùng kiểu**: `kiemXep.canhBao` là `LyDoGiu[]` (cần mã `MA_GIU`, ADR cấm thêm) ⇒ `kiemTaoSuaChuyen` trả trường tên khác `nhacGioLai: CanhBaoGioLai[]`; lịch chung dùng `LOAI_CANH_BAO_LICH` như ADR B3 | đổi tên trường |
| K15 | Tệp SQL mới `khung-ban-repo.ts` | đăng ký vào danh sách tệp SQL của module ở `src/architecture.test.ts:79-80` (siết: thêm tệp được EXPLAIN) — hoặc đặt câu vào `chuyen-repo.ts` nếu bài đó không nhận tệp thứ ba | gộp tệp |
| K13 | Mã lý do gieo | nhóm `BAN_XE`: `BAN_XE_BAO_DUONG` "Bảo dưỡng", `BAN_XE_DANG_KIEM` "Đăng kiểm", `BAN_XE_SUA_CHUA` "Sửa chữa", `BAN_XE_KHAC` "Khác" (Quản trị sửa được nhãn) | dữ liệu |

## Cần chủ — ĐÃ TRẢ LỜI (chủ 2/10 tối: "Đồng ý 18 câu theo khuyến nghị")

1. **Câu báo khi xếp chuyến vào giờ xe bận** (Lượt III câu 7 — mã riêng "Xe có lịch bận trùng giờ"): chủ KHÔNG trả lời ⇒ theo đúng chữ ADR-0055 — dùng lại mã "Xe trùng giờ với chuyến khác" (`TRUNG_GIO_XE`) kèm chi tiết "lịch xe bận: Bảo dưỡng 08:00 03/10 → 17:00 03/10". Đổi sau = 3 dòng ở Task 2 (ghi chú cuối Step 3).
2. Bốn câu bản vẽ (tệp chung `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`) — chủ đồng ý cả bốn khuyến nghị:
   - **3.1** chuyến đã xếp hiện trên lưới tuần, chỉ mã `CX-…` + giờ (không mã đơn / tên khách); chuyến không lưu vào lịch bận.
   - **3.2** lý do chọn từ danh mục `BAN_XE`, không ô ghi chú / gara / tiền sửa (K12 giữ nguyên).
   - **3.3** có ô "Đến ngày".
   - **3.4** trang "Lịch xe bận" chỉ Quản trị + Toàn quyền (ô `vehicle.manage`).

---

## Cấu trúc tệp

| Tệp | Việc |
|---|---|
| Tạo `migrations/0071_khung_ban_gio_lai.sql` | bảng `vc_unavailability` + 7 trigger + gieo nhóm lý do `BAN_XE` + hai cột chính sách |
| Tạo `src/migrations-khung-ban.test.ts` | lớp CSDL (tiêu chí 1–3, hai thứ tự đua, P16 qua biến `KHUNG_BAN_SQL`) |
| Tạo `src/shared/khung-ban.ts` (+ `.test.ts`) | luật thuần khung bận: chồng nửa mở, chuyến vướng khung, khung trong ngày VN, nhãn giờ |
| Tạo `src/shared/gio-lai.ts` (+ `.test.ts`) | luật thuần giờ lái: `thoiLuongChuyenMs`, `gioLaiTaiXe`, `canhBaoGioLai` |
| Sửa `src/shared/dieu-phoi-kieu.ts` | `KhungBanVao`; `xuatBenMs` vào `KhungChuyen`, `ChuyenVao`; hai số vào `ChinhSachVao`; nhóm `BAN_XE` |
| Sửa `src/shared/dieu-phoi-kiem.ts` | `kiemTaoSuaChuyen` nhận `khungBan`, trả `nhacGioLai` (giờ lái) |
| Sửa `src/shared/dieu-phoi-lich-chung.ts` | hai loại cảnh báo `GIO_LAI_VUOT`, `CHUYEN_DAI_CAN_NGHI` |
| Tạo `src/modules/van-chuyen/khung-ban.ts` (+ `.test.ts`) | thân route, chi tiết nhật ký, ánh xạ lỗi CSDL `loiRangBuocKhungBan` |
| Tạo `src/modules/van-chuyen/khung-ban-repo.ts` | SQL (`defineSql`) đọc/ghi `vc_unavailability` |
| Tạo `src/modules/van-chuyen/khung-ban-route.test.ts` | route chạy cả ứng dụng trên SQLite (`tests/audit/dieu-phoi-khung.mjs`) |
| Tạo `src/modules/van-chuyen/dieu-phoi-doc.test.ts` | ghim mapper `xuatBenMs`, hai số chính sách, `khungBanVao` (gói esbuild) |
| Sửa `src/modules/van-chuyen/index.ts` | 3 route khung bận + `GET /ban-xe` (tuần); nối khung bận vào tạo/sửa chuyến; `khungBanXe` của `GET /lich` |
| Sửa `src/modules/van-chuyen/dieu-phoi-doc.ts`, `dieu-phoi-lenh.ts`, `dieu-phoi-route.ts` | mapper `xuatBenMs`; khung bận vào lệnh sửa; chính sách hai số |
| Sửa `src/modules/van-chuyen/chinh-sach.ts`, `repository.ts` | hai con số mới (kiểm thân, câu chèn, nhật ký) |
| Sửa `src/shared/contracts.ts` | DTO khung bận, `khungBanXe` của lịch, hai số chính sách, `canhBaoLenh` |
| Sửa `src/shared/audit-actions.ts` | hai hành động nhật ký |
| Sửa `src/shared/chinh-sach-hien-thi.ts`, `web/chinh-sach-dieu-phoi.ts` | hai ô mới theo khuôn (không cần vẽ) |
| Tạo `src/shared/khung-ban-hien-thi.ts` (+ `.test.ts`) | luật hiển thị: tuần (`vnWeekRange`), lưới xe × 7 ngày, form, dải bận, câu hỏi rút |
| Tạo `public/lich-xe-ban.html`, `web/lich-xe-ban.ts` | trang tuần "Lịch xe bận" theo bản vẽ 2/10 (Task 10) |
| Sửa `src/shared/sw-policy.ts`, `package.json` (`build:web`), `web/shell.ts`, `web/account.ts` | khai trang mới; mục con "Lịch xe bận" sau "Xe" |
| Sửa `web/dieu-phoi.ts`, `web/chuyen-sua.ts`, `public/app.css` | dải bận + dòng "Xe bận" (khuôn có sẵn); dải `canhBaoLenh`; token mới + `.xb-*` |
| Sửa `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`, `web/CLAUDE.md`; tạo `docs/evidence/<ngày>-dot-3/kich-ban/lich-xe-ban-smoke.mjs` | số mục thanh bên 17→18 / 23→24; kịch bản Chrome mới |
| ~~Sửa `web/xe-chi-tiet.ts`~~ | **bỏ** (2/10 — bản vẽ thay khối Chi tiết xe bằng trang tuần) |
| Sửa `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | R-VC-21 (warn) |
| Tạo `tests/e2e/khung-ban-xe.mjs`; sửa `tests/e2e/run.mjs`, `tests/e2e/chinh-sach-dieu-phoi.mjs` | e2e |
| Sửa `docs/data-dictionary.json` (+ `npm run dict`), `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts` | tài liệu |

---

### Task 0: Nhận việc — số migration, đo lại, sổ thi công

**Files:**
- Create: `docs/superpowers/plans/<ngày>-van-chuyen-dot-3-nhat-ky.md`

- [ ] **Step 1: Lấy số migration** (L2 lộ trình). Chạy ở thư mục worktree thi công:

```bash
git fetch origin
for b in $(git for-each-ref --format='%(refname:short)' refs/heads refs/remotes/origin); do git ls-tree --name-only "$b" migrations/ 2>/dev/null; done | sed 's#migrations/##' | grep -E '^[0-9]{4}_' | sort -u | tail -5
```

Số migration đã cấp: **`0071`** (2026-10-02). Kiểm: không nhánh nào đã có tệp `0071_*` khác tệp của đợt này — có thì DỪNG, báo điều phối xin số mới (không tự lấy số). Ghi vào sổ thi công. Cũng kiểm mã kiểm định kỳ kế tiếp: `for b in …; do git show "$b":scripts/audit-checks.mjs 2>/dev/null | grep -o 'R-VC-[0-9]*'; done | sort -t- -k3 -n -u | tail -1` → R-VC-`<M>` = lớn nhất + 1 (đo hôm nay: R-VC-20 ⇒ R-VC-21).

- [ ] **Step 2: Đo lại các dòng ở mục "Đo mã thật"** bằng `grep -n` (tên hàm), ghi chênh lệch vào sổ.

- [ ] **Step 3: Thử `ALTER TABLE … ADD COLUMN … NOT NULL DEFAULT … CHECK` trên cả hai nền** (ADR mục "Chưa kiểm"):

```bash
node -e "const {DatabaseSync}=require('node:sqlite');const d=new DatabaseSync(':memory:');d.exec('CREATE TABLE p(id TEXT PRIMARY KEY, a INTEGER NOT NULL)');d.exec(\"INSERT INTO p VALUES ('x',1)\");d.exec('ALTER TABLE p ADD COLUMN m INTEGER NOT NULL DEFAULT 480 CHECK (m BETWEEN 60 AND 1440)');console.log(d.prepare('SELECT * FROM p').all());try{d.exec(\"INSERT INTO p (id,a,m) VALUES ('y',1,10)\")}catch(e){console.log('CHECK chặn:',e.message)}"
```

Expected: `[ { id: 'x', a: 1, m: 480 } ]` và `CHECK chặn: CHECK constraint failed`. Sau Task 1 chạy `npm run db:migrate:local` để thử trên D1 local; ghi kết quả vào sổ.

- [ ] **Step 4: Commit sổ**

```bash
git add docs/superpowers/plans/*-van-chuyen-dot-3-nhat-ky.md
git commit -m "Đợt 3 Vận chuyển: mở sổ thi công khung bận + giờ lái"
```

---

### Task 1: Migration — bảng khung bận, trigger, nhóm lý do, hai cột chính sách (lớp CSDL)

**Files:**
- Create: `migrations/0071_khung_ban_gio_lai.sql`
- Create: `src/migrations-khung-ban.test.ts`
- Modify: `docs/data-dictionary.json` (bảng `vc_unavailability`, module `van-chuyen`; hai cột mới của `vc_dispatch_policy` trong `note` bảng đó) rồi `npm run dict`

**Interfaces:**
- Produces: bảng `vc_unavailability(id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, withdrawn_at, withdrawn_by, version, created_at, created_by, updated_at, updated_by)`; câu báo CSDL: `lc03_unavailable:` (bắt bởi `loiRangBuocChuyen` có sẵn → `trip_rule`), `unavailability_overlaps_trip:`, `unavailability_driver_closed:`, `unavailability_reason_group:`, `vc_unavailability_append_only:`; cột `vc_dispatch_policy.duty_day_max_minutes`, `.trip_no_break_max_minutes`.

- [ ] **Step 1: Viết test đỏ** `src/migrations-khung-ban.test.ts`. Khung thử chép khuôn `src/migrations-chuyen-xe.test.ts:1-120` (hàm `openDb`, `hoSo`, `xe`, `chuyen`, `ms`, `iso`); tìm tệp theo đuôi tên; biến `KHUNG_BAN_SQL` cho P16.

```ts
// Kiểm migration *_khung_ban_gio_lai.sql (ADR-0055 VK2-A A1–A2, VK2-B B1; ADR-0053 D9.1 hình bảng dùng chung) — lớp CSDL, chèn/sửa THẲNG SQL.
import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";

const DIR = new URL("../migrations/", import.meta.url);
const files = readdirSync(DIR).filter((f) => f.endsWith(".sql")).sort();
const MATCHES = files.filter((f) => f.endsWith("_khung_ban_gio_lai.sql"));
const SQL_SUA = process.env.KHUNG_BAN_SQL ? readFileSync(process.env.KHUNG_BAN_SQL, "utf8") : null; // P16: bản sao đã sửa cố ý
const sqlOf = (f: string) => (MATCHES.includes(f) && SQL_SUA !== null ? SQL_SUA : readFileSync(new URL(f, DIR), "utf8"));
const AT = "2026-10-01T03:00:00.000Z";
const DAY = "2026-10-05";
const H = 3_600_000;
const ms = (hhmm: string, d = 0) => Date.parse(`${DAY}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const iso = (m: number) => new Date(m).toISOString();
let n = 0;
const nid = (p: string) => `${p}-${++n}`;
type Db = DatabaseSync;
function openDb(): Db {
  const db = new DatabaseSync(":memory:");
  db.exec("PRAGMA foreign_keys = ON");
  for (const f of files) db.exec(sqlOf(f));
  return db;
}
const run = (db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).run(...a);
const one = <T>(db: Db, sql: string, ...a: (string | number | null)[]) => db.prepare(sql).get(...a) as T;
const congTyChu = (db: Db) => one<{ party_id: string }>(db, "SELECT party_id FROM v_pty_owner_company").party_id;
function xe(db: Db): string {
  const id = nid("xe");
  const bien = `79B${String(n).padStart(5, "0")}`;
  run(db, `INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, 'Xe thử', 2020, 15, ?, 'active', '2026-09-01', ?, ?)`, id, bien, bien, `KHUNG${n}`, `KHUNG${n}`, congTyChu(db), AT, AT);
  return id;
}
/** Chuyến PLANNED (ADR-0057: fixture chèn PLANNED rồi UPDATE nếu cần trạng thái khác). */
function chuyen(db: Db, x: string, tu: number, den: number): string {
  const id = nid("tr");
  const ngay = new Date(tu + 7 * H).toISOString().slice(0, 10);
  run(db, `INSERT INTO vc_trip (id, code, vehicle_id, carrier_party_id, service_date, planned_start_ms, planned_end_ms, earliest_start_ms, rest_minutes_snapshot, last_cmd_id,
     created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 30, ?, ?, ?)`, id, `CX-${id}`, x, congTyChu(db), ngay, tu, den, tu, randomUUID(), AT, AT);
  return id;
}
const huy = (db: Db, t: string) => run(db, "UPDATE vc_trip SET status = 'CANCELLED', cancel_reason_code = 'HUY_KHAC' WHERE id = ?", t);
/** Chèn khung bận; trả id. `o.subject` mặc định VEHICLE. */
function khung(db: Db, o: { xe?: string | null; taiXe?: string | null; tu: number; den: number; lyDo?: string; subject?: string }): string {
  const id = nid("kb");
  run(db, `INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 's1', ?, 's1')`,
    id, o.subject ?? "VEHICLE", o.xe ?? null, o.taiXe ?? null, o.tu, o.den, iso(o.tu), iso(o.den), o.lyDo ?? "BAN_XE_BAO_DUONG", AT, AT);
  return id;
}
const rut = (db: Db, id: string, v = 1) =>
  run(db, "UPDATE vc_unavailability SET withdrawn_at = ?, withdrawn_by = 's1', version = ?, updated_at = ?, updated_by = 's1' WHERE id = ?", AT, v + 1, AT, id);

test("đúng MỘT tệp 0071_khung_ban_gio_lai.sql (số đã cấp); chỉ-thêm (không DROP, không dựng lại bảng cũ)", () => {
  assert.equal(MATCHES.length, 1, `cần đúng một tệp, có ${MATCHES.length}`);
  assert.equal(MATCHES[0], "0071_khung_ban_gio_lai.sql");
  assert.doesNotMatch(sqlOf(MATCHES[0]!), /DROP\s+(TABLE|TRIGGER)|vc_dispatch_policy_new|vc_trip_new/i);
});

test("TC-K1 (ADR tiêu chí 1): ghi khung 08:00–17:00 cho xe có chuyến 09:00 chưa huỷ → trigger chặn; chuyến đó huỷ → ghi được", () => {
  const db = openDb();
  const x = xe(db);
  const t = chuyen(db, x, ms("09:00"), ms("11:00"));
  assert.throws(() => khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") }), /unavailability_overlaps_trip/);
  huy(db, t);
  assert.doesNotThrow(() => khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") }));
});

test("TC-K1b: khoảng nửa mở — khung bắt đầu đúng lúc chuyến kết thúc dự kiến → được; kết thúc đúng lúc chuyến bắt đầu → được", () => {
  const db = openDb();
  const x = xe(db);
  chuyen(db, x, ms("09:00"), ms("11:00"));
  assert.doesNotThrow(() => khung(db, { xe: x, tu: ms("11:00"), den: ms("12:00") }), "[11:00, 12:00) không chồng [09:00, 11:00)");
  assert.doesNotThrow(() => khung(db, { xe: x, tu: ms("07:00"), den: ms("09:00") }), "[07:00, 09:00) không chồng [09:00, 11:00)");
});

test("TC-K2 (ADR tiêu chí 2): tạo chuyến / dời giờ / đổi xe vào khung còn hiệu lực → trigger lc03_unavailable; khung đã rút → không chặn", () => {
  const db = openDb();
  const x = xe(db);
  const x2 = xe(db);
  const k = khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") });
  assert.throws(() => chuyen(db, x, ms("09:00"), ms("10:00")), /lc03_unavailable/, "tạo chuyến vào khung");
  const t = chuyen(db, x, ms("18:00"), ms("19:00"));
  // Cô lập: hạ cả earliest_start_ms (CHECK earliest ≤ planned_start của 0042) — để chỉ trigger khung bận còn lý do chặn.
  assert.throws(() => run(db, "UPDATE vc_trip SET planned_start_ms = ?, planned_end_ms = ?, earliest_start_ms = ?, service_date = ? WHERE id = ?", ms("16:00"), ms("17:30"), ms("16:00"), DAY, t), /lc03_unavailable/, "dời giờ");
  const t2 = chuyen(db, x2, ms("09:00"), ms("10:00"));
  assert.throws(() => run(db, "UPDATE vc_trip SET vehicle_id = ? WHERE id = ?", x, t2), /lc03_unavailable/, "đổi xe");
  rut(db, k);
  assert.doesNotThrow(() => chuyen(db, x, ms("09:00"), ms("10:00")), "khung đã rút không chặn");
});

test("TC-K3 (ADR tiêu chí 3): UPDATE giờ / đối tượng / lý do, DELETE, rút lần hai → chặn; ghi khung DRIVER → chặn", () => {
  const db = openDb();
  const x = xe(db);
  const k = khung(db, { xe: x, tu: ms("08:00"), den: ms("17:00") });
  for (const sql of [
    "UPDATE vc_unavailability SET start_ms = start_ms + 60000 WHERE id = ?",
    "UPDATE vc_unavailability SET reason_code = 'BAN_XE_KHAC' WHERE id = ?",
    "UPDATE vc_unavailability SET withdrawn_at = '2026-10-01T03:00:00.000Z', withdrawn_by = 's1' WHERE id = ?", // không tăng version
  ]) assert.throws(() => run(db, sql, k), /vc_unavailability_append_only/, sql);
  assert.throws(() => run(db, "DELETE FROM vc_unavailability WHERE id = ?", k), /vc_unavailability_append_only/);
  rut(db, k);
  assert.throws(() => rut(db, k, 2), /vc_unavailability_append_only/, "rút lần hai");
  // Cô lập hàng rào: dòng DRIVER hợp lệ ở MỌI luật khác (lý do nhóm BAN_TAI_XE có thật) — chỉ driver_closed được phép chặn (thứ tự trigger không bảo đảm).
  run(db, "INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES ('BAN_TAI_XE_THU', 'BAN_TAI_XE', 'Thử', 1, ?, ?)", AT, AT);
  const p = congTyChu(db);
  assert.throws(() => khung(db, { subject: "DRIVER", taiXe: p, tu: ms("08:00"), den: ms("17:00"), lyDo: "BAN_TAI_XE_THU" }), /unavailability_driver_closed/);
});

test("TC-K4: CHECK hình dạng — đúng một đối tượng; kết thúc > bắt đầu; phút tròn; *_at khớp *_ms; lý do đúng nhóm theo đối tượng; chèn đã rút → chặn", () => {
  const db = openDb();
  const x = xe(db);
  assert.throws(() => khung(db, { xe: x, taiXe: congTyChu(db), tu: ms("08:00"), den: ms("09:00") }), /CHECK constraint failed/, "hai đối tượng");
  assert.throws(() => khung(db, { xe: null, tu: ms("08:00"), den: ms("09:00") }), /CHECK constraint failed/, "VEHICLE thiếu xe");
  assert.throws(() => khung(db, { xe: x, tu: ms("09:00"), den: ms("09:00") }), /CHECK constraint failed/, "kết thúc = bắt đầu");
  assert.throws(() => khung(db, { xe: x, tu: ms("09:00") + 1000, den: ms("10:00") }), /CHECK constraint failed/, "không tròn phút");
  assert.throws(() => run(db, `INSERT INTO vc_unavailability (id, subject, vehicle_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, updated_at)
     VALUES ('kb-lech', 'VEHICLE', ?, ?, ?, '2026-10-05T00:00:00.000Z', ?, 'BAN_XE_KHAC', ?, ?)`, x, ms("08:00"), ms("09:00"), iso(ms("09:00")), AT, AT), /CHECK constraint failed/, "start_at lệch start_ms");
  assert.throws(() => khung(db, { xe: x, tu: ms("08:00"), den: ms("09:00"), lyDo: "HUY_KHAC" }), /unavailability_reason_group/, "lý do nhóm khác");
  assert.throws(() => run(db, `INSERT INTO vc_unavailability (id, subject, vehicle_id, start_ms, end_ms, start_at, end_at, reason_code, withdrawn_at, withdrawn_by, created_at, updated_at)
     VALUES ('kb-rut', 'VEHICLE', ?, ?, ?, ?, ?, 'BAN_XE_KHAC', ?, 's1', ?, ?)`, x, ms("08:00"), ms("09:00"), iso(ms("08:00")), iso(ms("09:00")), AT, AT, AT), /vc_unavailability_append_only/, "chèn dòng đã rút");
});

test("TC-K5 (Review Focus 2 — hai người bấm cùng lúc): cả hai thứ tự — chuyến trước rồi khung, khung trước rồi chuyến — bên sau bị chặn, bên trước còn nguyên", () => {
  const a = openDb();
  const xa = xe(a);
  chuyen(a, xa, ms("09:00"), ms("10:00"));
  assert.throws(() => khung(a, { xe: xa, tu: ms("08:00"), den: ms("12:00") }), /unavailability_overlaps_trip/);
  assert.equal(one<{ c: number }>(a, "SELECT count(*) c FROM vc_unavailability").c, 0);
  const b = openDb();
  const xb = xe(b);
  khung(b, { xe: xb, tu: ms("08:00"), den: ms("12:00") });
  assert.throws(() => chuyen(b, xb, ms("09:00"), ms("10:00")), /lc03_unavailable/);
  assert.equal(one<{ c: number }>(b, "SELECT count(*) c FROM vc_trip WHERE vehicle_id = ?", xb).c, 0);
});

test("TC-K6 (Review Focus 1): khung 23:00 D → 07:00 D+1 chặn chuyến 06:00 D+1 (= 23:00 UTC ngày D) và chuyến 23:30 D; không chặn chuyến 07:00 D+1", () => {
  const db = openDb();
  const x = xe(db);
  khung(db, { xe: x, tu: ms("23:00"), den: ms("07:00", 1) });
  assert.throws(() => chuyen(db, x, ms("06:00", 1), ms("06:30", 1)), /lc03_unavailable/);
  assert.throws(() => chuyen(db, x, ms("23:30"), ms("01:00", 1)), /lc03_unavailable/);
  assert.doesNotThrow(() => chuyen(db, x, ms("07:00", 1), ms("08:00", 1)));
});

test("TC-K7 (VK2-B B1): hai cột chính sách — dòng gieo nhận 480 / 240; ngoài khoảng → CHECK chặn; bảng vẫn chỉ-thêm", () => {
  const db = openDb();
  const r = one<{ d: number; b: number }>(db, "SELECT duty_day_max_minutes d, trip_no_break_max_minutes b FROM vc_dispatch_policy ORDER BY valid_from_at LIMIT 1");
  assert.deepEqual({ ...r }, { d: 480, b: 240 });
  const chen = (d: number, b: number) => run(db, `INSERT INTO vc_dispatch_policy (id, min_lead_minutes, warn_lead_minutes, rest_minutes, require_manifest, require_contract,
     proxy_backdate_max_minutes, duty_day_max_minutes, trip_no_break_max_minutes, valid_from_at, created_at, updated_at) VALUES (?, 360, 120, 30, 1, 0, 180, ?, ?, ?, ?, ?)`,
    nid("cs"), d, b, `2026-10-02T00:00:0${n % 10}.000Z`, AT, AT);
  assert.throws(() => chen(59, 240), /CHECK constraint failed/);
  assert.throws(() => chen(480, 721), /CHECK constraint failed/);
  assert.doesNotThrow(() => chen(600, 300));
  assert.throws(() => run(db, "UPDATE vc_dispatch_policy SET duty_day_max_minutes = 500"), /vc_policy_append_only/);
});

test("gieo nhóm lý do BAN_XE: bốn mã, có 'Khác'", () => {
  const db = openDb();
  const rows = db.prepare("SELECT code, label FROM vc_reason WHERE reason_group = 'BAN_XE' ORDER BY sort_order").all() as { code: string; label: string }[];
  assert.deepEqual(rows.map((r) => r.code), ["BAN_XE_BAO_DUONG", "BAN_XE_DANG_KIEM", "BAN_XE_SUA_CHUA", "BAN_XE_KHAC"]);
  assert.equal(rows.at(-1)!.label, "Khác");
});
```

> Ca "chuyến ĐANG CHẠY vướng khung → chặn; chuyến ĐÃ KẾT THÚC → không chặn" cần chuyến qua cổng xuất bến thật (dòng kiểm ĐẠT mang dấu lệnh — LC-05) ⇒ đặt ở bài route chạy trên SQLite (`src/modules/van-chuyen/khung-ban-route.test.ts`, Task 6 Step 1b) bằng `chuyenSan` + `tienDo(w, "van-phong", id, "xuat-ben")` của `tests/audit/dieu-phoi-khung.mjs`, rồi chèn khung bằng `w.sqlite` — không dựng tay ở đây.

- [ ] **Step 2: Chạy, xác nhận đỏ**

Run: `node --test src/migrations-khung-ban.test.ts`
Expected: FAIL "cần đúng một tệp, có 0".

- [ ] **Step 3: Viết migration** `migrations/0071_khung_ban_gio_lai.sql`:

> **CỔNG trước bước này** (chủ đồng ý 2/10 — câu 3.2): lý do bận là **ô chọn** từ danh mục `BAN_XE` (bản vẽ vẽ ô gõ tự do — chỉ giữ vị trí/cỡ ô), **không cột ghi chú** (K12). Hình bảng giữ ĐÚNG ADR-0053 D9.1 như dưới. Nếu chủ muốn ô ghi chú tự do ⇒ **DỪNG Task 1**, soạn ADR bổ sung (cột mới, che dãy số, không vào nhật ký) trước khi viết migration — quyết sau khi áp là tốn thêm một migration.

```sql
-- Migration 0071 — ADR-0055 VK2-A (khung bận của xe) + VK2-B B1 (hai con số giờ lái) (accepted 2026-09-30); hình bảng DÙNG CHUNG với ADR-0053 D9.1
-- (Báo bận của tài xế đối tác — Đợt 6). Module van-chuyen (tiền tố vc_). CHỈ THÊM. Không dữ liệu cá nhân (không cột ghi chú tự do — K12).
-- Kế hoạch docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-03-khung-ban-gio-lai.md, Task 1. Không sửa 0041/0042 (đã áp remote — L1).
-- Trigger CHỈ đọc bảng vc_ (Hiến chương 5.3). Câu báo mang tiền tố để máy chủ đổi mã: lc03_unavailable (→ trip_rule, rules.ts có sẵn),
-- unavailability_overlaps_trip / unavailability_driver_closed / unavailability_reason_group / vc_unavailability_append_only (→ loiRangBuocKhungBan).

-- Khung bận: subject định trọn MỘT lần (cửa một chiều); DRIVER bị chặn ghi bằng trigger tới ADR-0053 D9 (bỏ trigger bằng migration mới).
-- start_ms/end_ms để so (nửa mở [start, end)); start_at/end_at = ISO UTC của cùng mốc (khuôn toISOString, phút tròn — K3). version = khoá lạc quan (D9.1).
CREATE TABLE vc_unavailability (
  id               TEXT PRIMARY KEY,
  subject          TEXT NOT NULL CHECK (subject IN ('VEHICLE', 'DRIVER')),
  vehicle_id       TEXT REFERENCES vc_vehicle(id),
  driver_party_id  TEXT REFERENCES pty_party(id),
  start_ms         INTEGER NOT NULL CHECK (start_ms % 60000 = 0),
  end_ms           INTEGER NOT NULL CHECK (end_ms % 60000 = 0),
  start_at         TEXT NOT NULL,
  end_at           TEXT NOT NULL,
  reason_code      TEXT NOT NULL REFERENCES vc_reason(code),
  withdrawn_at     TEXT,
  withdrawn_by     TEXT,
  version          INTEGER NOT NULL DEFAULT 1 CHECK (version >= 1),
  created_at       TEXT NOT NULL,
  created_by       TEXT,
  updated_at       TEXT NOT NULL,
  updated_by       TEXT,
  CHECK (end_ms > start_ms),
  CHECK ((subject = 'VEHICLE' AND vehicle_id IS NOT NULL AND driver_party_id IS NULL)
      OR (subject = 'DRIVER' AND driver_party_id IS NOT NULL AND vehicle_id IS NULL)),
  CHECK (start_at = strftime('%Y-%m-%dT%H:%M:00.000Z', start_ms / 1000, 'unixepoch')),
  CHECK (end_at = strftime('%Y-%m-%dT%H:%M:00.000Z', end_ms / 1000, 'unixepoch')),
  CHECK ((withdrawn_at IS NULL) = (withdrawn_by IS NULL))
);
CREATE INDEX vc_unavailability_vehicle_ix ON vc_unavailability(vehicle_id, start_ms) WHERE subject = 'VEHICLE';
CREATE INDEX vc_unavailability_driver_ix ON vc_unavailability(driver_party_id, start_ms) WHERE subject = 'DRIVER';

-- Nhóm lý do mới BAN_XE (danh sách mở — kiểm ở MÃ NHOM_LY_DO). BAN_TAI_XE do ADR-0053 D9 gieo.
INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('BAN_XE_BAO_DUONG', 'BAN_XE', 'Bảo dưỡng', 1, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('BAN_XE_DANG_KIEM', 'BAN_XE', 'Đăng kiểm', 2, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('BAN_XE_SUA_CHUA', 'BAN_XE', 'Sửa chữa', 3, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('BAN_XE_KHAC', 'BAN_XE', 'Khác', 99, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');

-- Chỉ-thêm: không xoá; chèn phải là dòng MỞ, version 1; chỉ một kiểu UPDATE — rút MỘT lần (withdrawn_* trống → có, version + 1), không đổi nội dung.
CREATE TRIGGER vc_unavailability_no_delete BEFORE DELETE ON vc_unavailability
BEGIN SELECT RAISE(ABORT, 'vc_unavailability_append_only: khung bận không xoá — rút khung'); END;
CREATE TRIGGER vc_unavailability_insert_open BEFORE INSERT ON vc_unavailability
WHEN NEW.withdrawn_at IS NOT NULL OR NEW.version <> 1
BEGIN SELECT RAISE(ABORT, 'vc_unavailability_append_only: khung mới phải còn hiệu lực, phiên bản 1'); END;
CREATE TRIGGER vc_unavailability_withdraw_once BEFORE UPDATE ON vc_unavailability
WHEN OLD.withdrawn_at IS NOT NULL OR NEW.withdrawn_at IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.subject IS NOT OLD.subject OR NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.driver_party_id IS NOT OLD.driver_party_id
  OR NEW.start_ms IS NOT OLD.start_ms OR NEW.end_ms IS NOT OLD.end_ms OR NEW.start_at IS NOT OLD.start_at OR NEW.end_at IS NOT OLD.end_at
  OR NEW.reason_code IS NOT OLD.reason_code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
  OR NEW.version IS NOT OLD.version + 1
BEGIN SELECT RAISE(ABORT, 'vc_unavailability_append_only: khung bận chỉ rút một lần, không sửa giờ, đối tượng, lý do'); END;
-- Chưa mở khung của tài xế (ADR-0055 A1, G-A3) — ADR-0053 D9 bỏ trigger này bằng migration mới.
CREATE TRIGGER vc_unavailability_driver_closed BEFORE INSERT ON vc_unavailability
WHEN NEW.subject = 'DRIVER'
BEGIN SELECT RAISE(ABORT, 'unavailability_driver_closed: chưa mở báo bận của tài xế'); END;
-- Lý do đúng nhóm theo đối tượng (D9.3 B9.1 — không viết được bằng CHECK vì phải đọc vc_reason).
CREATE TRIGGER vc_unavailability_reason_group BEFORE INSERT ON vc_unavailability
WHEN NOT EXISTS (SELECT 1 FROM vc_reason r WHERE r.code = NEW.reason_code
                  AND r.reason_group = CASE NEW.subject WHEN 'VEHICLE' THEN 'BAN_XE' ELSE 'BAN_TAI_XE' END)
BEGIN SELECT RAISE(ABORT, 'unavailability_reason_group: lý do không thuộc nhóm lý do bận'); END;
-- Q-L2-1 = a: không ghi khung chồng chuyến CHƯA huỷ, CHƯA kết thúc của xe (nửa mở, so với giờ kết thúc dự kiến — K8).
CREATE TRIGGER vc_unavailability_overlaps_trip BEFORE INSERT ON vc_unavailability
WHEN NEW.subject = 'VEHICLE' AND EXISTS (
  SELECT 1 FROM vc_trip t
   WHERE t.vehicle_id = NEW.vehicle_id AND t.status IN ('PLANNED', 'RUNNING')
     AND t.planned_start_ms < NEW.end_ms AND NEW.start_ms < t.planned_end_ms)
BEGIN SELECT RAISE(ABORT, 'unavailability_overlaps_trip: xe đang có chuyến trùng khung bận — dời hoặc đổi xe chuyến đó trước'); END;
-- LC-03 mở rộng (ADR-0055 A2 (i)): chuyến chưa huỷ không chồng khung bận còn hiệu lực của xe. Trigger MỚI, không sửa vc_trip_overlap_* của 0042.
CREATE TRIGGER vc_trip_unavailable_ins BEFORE INSERT ON vc_trip
WHEN NEW.status <> 'CANCELLED' AND EXISTS (
  SELECT 1 FROM vc_unavailability u
   WHERE u.subject = 'VEHICLE' AND u.vehicle_id = NEW.vehicle_id AND u.withdrawn_at IS NULL
     AND u.start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < u.end_ms)
BEGIN SELECT RAISE(ABORT, 'lc03_unavailable: xe có lịch bận trùng giờ chuyến'); END;
CREATE TRIGGER vc_trip_unavailable_upd BEFORE UPDATE OF planned_start_ms, planned_end_ms, vehicle_id ON vc_trip
WHEN NEW.status <> 'CANCELLED'
  AND (NEW.planned_start_ms IS NOT OLD.planned_start_ms OR NEW.planned_end_ms IS NOT OLD.planned_end_ms OR NEW.vehicle_id IS NOT OLD.vehicle_id)
  AND EXISTS (
  SELECT 1 FROM vc_unavailability u
   WHERE u.subject = 'VEHICLE' AND u.vehicle_id = NEW.vehicle_id AND u.withdrawn_at IS NULL
     AND u.start_ms < NEW.planned_end_ms AND NEW.planned_start_ms < u.end_ms)
BEGIN SELECT RAISE(ABORT, 'lc03_unavailable: xe có lịch bận trùng giờ chuyến'); END;

-- VK2-B B1 đường (2) — 0041 đã áp remote: thêm cột có DEFAULT. LỆCH khuôn I43 có ghi (dòng chèn quên cột được điền mặc định thay vì bị chặn); bù bằng bài
-- "câu chèn chính sách liệt kê đủ cột" (src/modules/van-chuyen/chinh-sach.test.ts) và thân yêu cầu BẮT BUỘC hai số (kiemChinhSachMoi).
ALTER TABLE vc_dispatch_policy ADD COLUMN duty_day_max_minutes INTEGER NOT NULL DEFAULT 480 CHECK (duty_day_max_minutes BETWEEN 60 AND 1440);
ALTER TABLE vc_dispatch_policy ADD COLUMN trip_no_break_max_minutes INTEGER NOT NULL DEFAULT 240 CHECK (trip_no_break_max_minutes BETWEEN 30 AND 720);
```

- [ ] **Step 4: Sổ dữ liệu.** Thêm vào `docs/data-dictionary.json` mục `tables`:

```json
{ "name": "vc_unavailability", "module": "van-chuyen", "kind": "table",
  "note": "KHUNG BẬN (ADR-0055 VK2-A; hình dùng chung ADR-0053 D9.1): subject VEHICLE (xe vào xưởng, đăng kiểm…) | DRIVER (Báo bận tài xế đối tác — CHƯA MỞ, trigger chặn tới Đợt 6). Đúng một đối tượng theo subject. start_ms/end_ms nửa mở, phút tròn; start_at/end_at ISO UTC cùng mốc. Chỉ thêm; một kiểu sửa: rút một lần (withdrawn_*, version + 1). Lý do: vc_reason nhóm BAN_XE (xe) / BAN_TAI_XE (tài xế). Trigger hai chiều với vc_trip: chuyến chưa huỷ không chồng khung còn hiệu lực; khung không chồng chuyến PLANNED/RUNNING. Không cột ghi chú tự do. Đọc đợt này luôn lọc subject = 'VEHICLE'." }
```

và bổ sung câu vào `note` của `vc_dispatch_policy`: "`duty_day_max_minutes` (480, 60–1440) tổng giờ lái một ngày chạy; `trip_no_break_max_minutes` (240, 30–720) chuyến dài hơn → nhắc nghỉ — chỉ cảnh báo (ADR-0055 VK2-B); thêm bằng ADD COLUMN có DEFAULT (lệch I43 có ghi)." Chạy `npm run dict`.

- [ ] **Step 5: Chạy, xác nhận xanh**

Run: `node --test src/migrations-khung-ban.test.ts src/architecture.test.ts src/migrations-chuyen-xe.test.ts src/migrations-chinh-sach-dieu-phoi.test.ts`
Expected: PASS hết (bài thân trigger `vc_*` xanh vì bảy trigger mới chỉ đọc `vc_unavailability`, `vc_trip`, `vc_reason`). Rồi `npm run db:migrate:local` → áp được (ghi sổ: kết quả bước 3 Task 0 trên D1 local).

> **Luật viết bài hàng rào (cả kế hoạch):** đầu vào của một ca chặn phải HỢP LỆ với mọi luật khác, chỉ vi phạm đúng luật đang kiểm — không thì bỏ hàng rào đi vẫn "đỏ đúng" vì luật khác, P16 thành giả (bài học "KIỂM GIẢ" Đợt E). Mỗi ca `assert.throws` khớp đúng tiền tố câu báo của hàng rào đó, không khớp chung `/constraint/`.

- [ ] **Step 6: P16 — thấy chặn thật** (mỗi dòng một lần, ghi sổ thi công + `docs/SO-HANG-RAO.md` ở Task 9): chép migration ra `/tmp/kb.sql`, xoá lần lượt (a) `vc_trip_unavailable_ins` (ca "tạo chuyến vào khung" đỏ), (a′) chỉ `vc_trip_unavailable_upd` (ca "dời giờ", "đổi xe" đỏ), (b) `vc_unavailability_overlaps_trip`, (c) `vc_unavailability_driver_closed`, (d) `vc_unavailability_withdraw_once`, (e) dòng `CHECK ((subject = 'VEHICLE' …`; mỗi lần:

Run: `KHUNG_BAN_SQL=/tmp/kb.sql node --test src/migrations-khung-ban.test.ts`
Expected: đúng bài tương ứng ĐỎ (TC-K2 / TC-K1 / TC-K3 / TC-K3 / TC-K4); hoàn nguyên → xanh.

- [ ] **Step 7: Commit**

```bash
git add migrations/*_khung_ban_gio_lai.sql src/migrations-khung-ban.test.ts docs/data-dictionary.json docs/DATA-DICTIONARY.md
git commit -m "Khung bận của xe + hai con số giờ lái: migration, trigger hai chiều với chuyến

Vì sao: ADR-0055 VK2-A/B — xe vào xưởng thì không xếp chuyến, và không ghi lịch xưởng chồng chuyến đã xếp; bảng định trọn cho tài xế (ADR-0053 D9) nhưng chưa mở."
```

---

### Task 2: Luật thuần khung bận + `kiemTaoSuaChuyen` nhận khung bận (lớp máy chủ, MỘT hàm)

**Files:**
- Create: `src/shared/khung-ban.ts`, `src/shared/khung-ban.test.ts`
- Modify: `src/shared/dieu-phoi-kieu.ts` (thêm `KhungBanVao`; `NHOM_LY_DO` thêm `"BAN_XE"` + nhãn "Lý do xe bận")
- Modify: `src/shared/dieu-phoi-kieu.test.ts:14-17` (bài "đúng bảy nhóm" → tám nhóm)
- Modify: `src/shared/dieu-phoi-kiem.ts:62-130`
- Test: `src/shared/dieu-phoi-kiem.test.ts`

**Interfaces:**
- Produces (`src/shared/dieu-phoi-kieu.ts`):
  ```ts
  /** Khung bận CÒN HIỆU LỰC (`vc_unavailability`, withdrawn_at IS NULL). Đúng một trong xeId / taiXePartyId theo doiTuong. */
  export interface KhungBanVao { id: string; doiTuong: "VEHICLE" | "DRIVER"; xeId: string | null; taiXePartyId: string | null; batDauMs: number; ketThucMs: number; lyDoNhan: string }
  ```
- Produces (`src/shared/khung-ban.ts`):
  ```ts
  export const chongNuaMo = (a0: number, a1: number, b0: number, b1: number): boolean
  export function nhanKhoangGio(batDauMs: number, ketThucMs: number): string            // "08:00 03/10 → 17:00 03/10" (giờ VN)
  export function chuyenVuongKhung(k: { xeId: string; batDauMs: number; ketThucMs: number }, chuyen: readonly KhungChuyen[]): KhungChuyen[] // PLANNED/RUNNING cùng xe, chồng nửa mở (so với ketThucMs dự kiến — khớp trigger)
  export function khungTrongNgay<T extends { batDauMs: number; ketThucMs: number }>(ds: readonly T[], ngay: string): T[] // giao [00:00 VN ngày, 00:00 VN ngày+1)
  ```
- Produces: `KiemTaoSuaChuyenVao.khungBan?: KhungBanVao[]` — vắng = không khung (fixture cũ giữ xanh).

- [ ] **Step 1: Test đỏ** `src/shared/khung-ban.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { chongNuaMo, chuyenVuongKhung, khungTrongNgay, nhanKhoangGio } from "./khung-ban.ts";
import type { KhungChuyen } from "./dieu-phoi-kieu.ts";

const D = "2026-10-05";
const ms = (hhmm: string, d = 0) => Date.parse(`${D}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const kc = (o: Partial<KhungChuyen> & { id: string }): KhungChuyen => ({ ma: `CX-${o.id}`, xeId: "xe1", taiXePartyId: null, batDauMs: ms("09:00"), ketThucMs: ms("10:00"), ketThucThatMs: null, trangThai: "PLANNED", ...o });

test("chongNuaMo: chạm mép không chồng; lồng nhau chồng", () => {
  assert.equal(chongNuaMo(1, 2, 2, 3), false);
  assert.equal(chongNuaMo(1, 3, 2, 4), true);
  assert.equal(chongNuaMo(1, 10, 2, 3), true);
});

test("chuyenVuongKhung: chỉ chuyến PLANNED/RUNNING cùng xe chồng khung; huỷ, đã kết thúc, xe khác bị bỏ; so với giờ kết thúc DỰ KIẾN (khớp trigger)", () => {
  const k = { xeId: "xe1", batDauMs: ms("08:00"), ketThucMs: ms("17:00") };
  const ds = [
    kc({ id: "a" }), kc({ id: "b", trangThai: "CANCELLED" }), kc({ id: "c", trangThai: "ENDED", ketThucThatMs: ms("10:00") }),
    kc({ id: "d", xeId: "xe2" }), kc({ id: "e", trangThai: "RUNNING" }), kc({ id: "f", batDauMs: ms("17:00"), ketThucMs: ms("18:00") }),
  ];
  assert.deepEqual(chuyenVuongKhung(k, ds).map((c) => c.id), ["a", "e"]);
});

test("Review Focus 1 — khungTrongNgay chặn bằng nửa đêm VN: khung 23:00 D → 07:00 D+1 thuộc cả D và D+1; khung 00:00–07:00 D+1 KHÔNG thuộc D (dù 00:00 VN = 17:00 UTC ngày D)", () => {
  const qua = { id: "q", batDauMs: ms("23:00"), ketThucMs: ms("07:00", 1) };
  const sang = { id: "s", batDauMs: ms("00:00", 1), ketThucMs: ms("07:00", 1) };
  assert.deepEqual(khungTrongNgay([qua, sang], D).map((x) => x.id), ["q"]);
  assert.deepEqual(khungTrongNgay([qua, sang], "2026-10-06").map((x) => x.id), ["q", "s"]);
});

test("nhanKhoangGio: giờ VN, không phải UTC", () => {
  assert.equal(nhanKhoangGio(ms("23:00"), ms("07:00", 1)), "23:00 05/10 → 07:00 06/10");
});
```

Thêm vào `src/shared/dieu-phoi-kiem.test.ts` (dùng hàm dựng có sẵn của tệp cho `XeVao`, `TaiXeVao`, `ChinhSachVao`; người thi công đo tên hàm dựng — ví dụ `xeMau()`, `taiXeMau()`, `chinhSachMau()`):

```ts
test("VK2-A A2 (i) lớp máy chủ: tạo / dời giờ / đổi xe vào khung bận còn hiệu lực của xe → chặn TRUNG_GIO_XE kèm chi tiết 'lịch xe bận'; khung xe khác → không", () => {
  const khung: KhungBanVao = { id: "kb1", doiTuong: "VEHICLE", xeId: XE.id, taiXePartyId: null, batDauMs: ms("08:00"), ketThucMs: ms("17:00"), lyDoNhan: "Bảo dưỡng" };
  const kq = kiemTaoSuaChuyen({ lenh: "TAO", chuyen: { id: null, batDauMs: ms("09:00"), ketThucMs: ms("10:00"), xe: XE, taiXe: TX, nghiPhaLe: false },
    chuyenKhac: [], khungBan: [khung], chinhSach: CS, hangBang: HB, bayGioMs: ms("00:00", -2) });
  assert.equal(kq.ok, false);
  assert.ok(kq.chan.some((l) => l.ma === "TRUNG_GIO_XE" && /lịch xe bận: Bảo dưỡng 08:00 05\/10 → 17:00 05\/10/.test(l.loiNhan)), JSON.stringify(kq.chan));
  const khac = kiemTaoSuaChuyen({ lenh: "TAO", chuyen: { id: null, batDauMs: ms("09:00"), ketThucMs: ms("10:00"), xe: XE, taiXe: TX, nghiPhaLe: false },
    chuyenKhac: [], khungBan: [{ ...khung, xeId: "xe-khac" }], chinhSach: CS, hangBang: HB, bayGioMs: ms("00:00", -2) });
  assert.equal(khac.chan.some((l) => l.ma === "TRUNG_GIO_XE"), false);
});

test("D9 B9.3 (MỘT hàm cho xe và tài xế — chuẩn bị Đợt 6): khung DRIVER của tài xế được gán → chặn TRUNG_GIO_TAI_XE kèm 'lịch tài xế bận'", () => {
  const khung: KhungBanVao = { id: "kb2", doiTuong: "DRIVER", xeId: null, taiXePartyId: TX.partyId, batDauMs: ms("08:00"), ketThucMs: ms("12:00"), lyDoNhan: "Việc riêng" };
  const kq = kiemTaoSuaChuyen({ lenh: "TAO", chuyen: { id: null, batDauMs: ms("09:00"), ketThucMs: ms("10:00"), xe: XE, taiXe: TX, nghiPhaLe: false },
    chuyenKhac: [], khungBan: [khung], chinhSach: CS, hangBang: HB, bayGioMs: ms("00:00", -2) });
  assert.ok(kq.chan.some((l) => l.ma === "TRUNG_GIO_TAI_XE" && /lịch tài xế bận/.test(l.loiNhan)));
});
```

- [ ] **Step 2: Chạy đỏ**

Run: `node --test src/shared/khung-ban.test.ts src/shared/dieu-phoi-kiem.test.ts`
Expected: FAIL "Cannot find module './khung-ban.ts'" / ca mới đỏ.

- [ ] **Step 3: Cài đặt** `src/shared/khung-ban.ts`:

```ts
// LUẬT THUẦN khung bận (ADR-0055 VK2-A; hình dùng chung ADR-0053 D9) — một nguồn cho máy chủ và màn hình. Không I/O, không import module; import kèm đuôi .ts.
// - Khoảng NỬA MỞ [bắt đầu, kết thúc). Chuyến vướng khung so với giờ kết thúc DỰ KIẾN — khớp trigger vc_unavailability_overlaps_trip (K8).
// - "Ngày" là ngày dân sự giờ VN: [00:00 VN ngày, 00:00 VN ngày + 1) — không bao giờ nửa đêm UTC (Review Focus 1).
import type { KhungChuyen } from "./dieu-phoi-kieu.ts";
import { addDays, msToVnLocal, vnLocalToMs } from "./vn-date.ts";

export const chongNuaMo = (a0: number, a1: number, b0: number, b1: number): boolean => a0 < b1 && b0 < a1;
const ngan = (ms: number): string => {
  const { date, time } = msToVnLocal(ms);
  return `${time} ${date.slice(8, 10)}/${date.slice(5, 7)}`;
};
export const nhanKhoangGio = (batDauMs: number, ketThucMs: number): string => `${ngan(batDauMs)} → ${ngan(ketThucMs)}`;
export function chuyenVuongKhung(k: { xeId: string; batDauMs: number; ketThucMs: number }, chuyen: readonly KhungChuyen[]): KhungChuyen[] {
  return chuyen.filter((c) => c.xeId === k.xeId && (c.trangThai === "PLANNED" || c.trangThai === "RUNNING") && chongNuaMo(c.batDauMs, c.ketThucMs, k.batDauMs, k.ketThucMs));
}
export function khungTrongNgay<T extends { batDauMs: number; ketThucMs: number }>(ds: readonly T[], ngay: string): T[] {
  const tu = vnLocalToMs(ngay, "00:00");
  const den = vnLocalToMs(addDays(ngay, 1), "00:00");
  if (tu === null || den === null) return [];
  return ds.filter((k) => chongNuaMo(k.batDauMs, k.ketThucMs, tu, den));
}
```

Trong `src/shared/dieu-phoi-kiem.ts`: import `chongNuaMo`, `nhanKhoangGio`; thêm `khungBan?: KhungBanVao[]` vào `KiemTaoSuaChuyenVao`; trong `kiemTaoSuaChuyen`, ngay sau vòng `for (const k of v.chuyenKhac)`:

```ts
  // ADR-0055 VK2-A A2 (i) + ADR-0053 D9 B9.3: khung bận còn hiệu lực là KHOẢNG CHẶN như chuyến khác — MỘT hàm cho xe và tài xế (không luật thứ hai).
  // Mã: dùng lại TRUNG_GIO_XE / TRUNG_GIO_TAI_XE (ADR-0055 "không thêm mã vào MA_GIU") — chi tiết nói rõ là lịch bận. Xem "Cần chủ" câu 1 của kế hoạch.
  for (const k of v.khungBan ?? []) {
    if (!chongNuaMo(c.batDauMs, c.ketThucMs, k.batDauMs, k.ketThucMs)) continue;
    const gio = `${k.lyDoNhan} ${nhanKhoangGio(k.batDauMs, k.ketThucMs)}`;
    if (k.doiTuong === "VEHICLE" && k.xeId === c.xe.id) chan.push(lyDoGiu("TRUNG_GIO_XE", `lịch xe bận: ${gio}`));
    if (k.doiTuong === "DRIVER" && c.taiXe !== null && k.taiXePartyId === c.taiXe.partyId) chan.push(lyDoGiu("TRUNG_GIO_TAI_XE", `lịch tài xế bận: ${gio}`));
  }
```

`NHOM_LY_DO` thêm `"BAN_XE"` (cuối mảng), `NHAN_NHOM_LY_DO.BAN_XE = "Lý do xe bận"`; sửa bài `dieu-phoi-kieu.test.ts:14-17` thành tám nhóm (đổi tên bài: "đúng tám nhóm — BAN_XE từ ADR-0055").

> Nếu chủ duyệt "Cần chủ" câu 1: thêm `XE_BAN: { loiNhan: "Xe có lịch bận trùng giờ", aiXuLy: "VAN_PHONG" }` vào `MA_GIU`, đổi `lyDoGiu("TRUNG_GIO_XE", …)` thành `lyDoGiu("XE_BAN", gio)`, thêm `XE_BAN: "xe_ban"` vào `MA_LOI_THEO_GIU` + `THONG_BAO_409.xe_ban` (`dieu-phoi-route.ts:35,57`); sửa regex test cho khớp.

- [ ] **Step 4: Chạy xanh**

Run: `node --test src/shared/khung-ban.test.ts src/shared/dieu-phoi-kiem.test.ts src/shared/dieu-phoi-kieu.test.ts src/shared/ly-do-giu.test.ts`
Expected: PASS.

- [ ] **Step 5: P16:** xoá vòng `for (const k of v.khungBan …)` → ca VK2-A đỏ → hoàn nguyên → xanh. Ghi sổ.

- [ ] **Step 6: Commit**

```bash
git add src/shared/khung-ban.ts src/shared/khung-ban.test.ts src/shared/dieu-phoi-kiem.ts src/shared/dieu-phoi-kiem.test.ts src/shared/dieu-phoi-kieu.ts src/shared/dieu-phoi-kieu.test.ts
git commit -m "Luật thuần khung bận: kiemTaoSuaChuyen coi khung bận là khoảng chặn

Vì sao: luật lõi hai lớp (ADR-0055 A2) — máy chủ nói trước bằng lời; một hàm cho xe và tài xế để Đợt 6 chỉ cấp dữ liệu (ADR-0053 B9.3)."
```

---

### Task 3: Luật thuần giờ lái `gioLaiTaiXe` + ranh giới ngày VN

**Files:**
- Create: `src/shared/gio-lai.ts`, `src/shared/gio-lai.test.ts`
- Modify: `src/shared/dieu-phoi-kieu.ts` (`KhungChuyen.xuatBenMs?`, `ChuyenVao.xuatBenMs?`, `ChinhSachVao.dutyDayMaxMinutes`, `.tripNoBreakMaxMinutes`)
- Modify: `src/modules/van-chuyen/dieu-phoi-doc.ts:59-81` (mapper `chinhSachVao`, `khungChuyen`, `chuyenVao`)
- Modify: `src/modules/van-chuyen/repository.ts:222-249` (`DispatchPolicyRow` + `COT_CHINH_SACH` thêm hai cột — đọc thôi; câu chèn ở Task 5)
- Create: `src/modules/van-chuyen/dieu-phoi-doc.test.ts` (bài mapper, gói esbuild)

**Interfaces:**
- Produces (`src/shared/gio-lai.ts`):
  ```ts
  export interface ChinhSachGioLai { dutyDayMaxMinutes: number; tripNoBreakMaxMinutes: number }
  export type ChuyenGioLai = Pick<KhungChuyen, "id" | "ma" | "taiXePartyId" | "batDauMs" | "ketThucMs" | "ketThucThatMs" | "trangThai"> & { xuatBenMs?: number | null };
  export function thoiLuongChuyenMs(c: ChuyenGioLai, bayGioMs: number): number
  export function gioLaiTaiXe(taiXePartyId: string, chuyen: readonly ChuyenGioLai[], ngayChay: string, cs: ChinhSachGioLai | null, bayGioMs: number): { tongMs: number; vuot: boolean; chuyenIds: string[] }
  export type LoaiCanhBaoGioLai = "GIO_LAI_VUOT" | "CHUYEN_DAI_CAN_NGHI";
  export interface CanhBaoGioLai { loai: LoaiCanhBaoGioLai; tripId: string; taiXePartyId: string; tongPhut: number }
  export const NHAN_CANH_BAO_GIO_LAI: Readonly<Record<LoaiCanhBaoGioLai, string>>
  export function canhBaoGioLai(chuyen: readonly ChuyenGioLai[], cs: ChinhSachGioLai | null, bayGioMs: number, chiChuyen?: ReadonlySet<string>): CanhBaoGioLai[]
  ```
  `KhungChuyen` thoả `ChuyenGioLai` khi có `xuatBenMs` — không kiểu thứ hai cho chuyến.

- [ ] **Step 1: Test đỏ** `src/shared/gio-lai.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { canhBaoGioLai, gioLaiTaiXe, thoiLuongChuyenMs, type ChuyenGioLai } from "./gio-lai.ts";

const D = "2026-10-05";
const ms = (hhmm: string, d = 0) => Date.parse(`${D}T${hhmm}:00.000+07:00`) + d * 86_400_000;
const CS = { dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240 };
const c = (o: Partial<ChuyenGioLai> & { id: string }): ChuyenGioLai =>
  ({ ma: `CX-${o.id}`, taiXePartyId: "tx1", batDauMs: ms("08:00"), ketThucMs: ms("10:00"), ketThucThatMs: null, trangThai: "PLANNED", xuatBenMs: null, ...o });

test("thoiLuongChuyenMs: chưa chạy = dự kiến; đang chạy = bây giờ − xuất bến; đã kết thúc = kết thúc thật − xuất bến (GIỜ XẢY RA — ADR-0050)", () => {
  assert.equal(thoiLuongChuyenMs(c({ id: "a" }), ms("12:00")), 2 * 3600e3);
  assert.equal(thoiLuongChuyenMs(c({ id: "b", trangThai: "RUNNING", xuatBenMs: ms("08:30") }), ms("09:00")), 30 * 60e3);
  assert.equal(thoiLuongChuyenMs(c({ id: "c", trangThai: "ENDED", xuatBenMs: ms("08:10"), ketThucThatMs: ms("11:40") }), ms("23:00")), 210 * 60e3);
});

test("ADR tiêu chí 4: ba chuyến tổng 8 giờ 10 phút cùng ngày chạy → vượt; đúng 8 giờ → KHÔNG vượt (K10); chuyến huỷ, chuyến tài xế khác không tính", () => {
  const ds = [
    c({ id: "1", batDauMs: ms("05:00"), ketThucMs: ms("08:00") }),
    c({ id: "2", batDauMs: ms("09:00"), ketThucMs: ms("12:00") }),
    c({ id: "3", batDauMs: ms("13:00"), ketThucMs: ms("15:10") }),
    c({ id: "h", batDauMs: ms("16:00"), ketThucMs: ms("20:00"), trangThai: "CANCELLED" }),
    c({ id: "k", taiXePartyId: "tx2", batDauMs: ms("16:00"), ketThucMs: ms("20:00") }),
  ];
  const r = gioLaiTaiXe("tx1", ds, D, CS, ms("00:00"));
  assert.equal(r.tongMs, 490 * 60e3);
  assert.equal(r.vuot, true);
  assert.deepEqual(r.chuyenIds, ["1", "2", "3"]);
  assert.equal(gioLaiTaiXe("tx1", ds.slice(0, 2).concat(c({ id: "4", batDauMs: ms("13:00"), ketThucMs: ms("15:00") })), D, CS, 0).vuot, false);
});

test("Review Focus 1: chuyến 23:30 D qua nửa đêm tính TRỌN cho D; chuyến 06:00 VN ngày D+1 (= 23:00 UTC ngày D) tính cho D+1, không cho D", () => {
  const dem = c({ id: "dem", batDauMs: ms("23:30"), ketThucMs: ms("03:30", 1) });
  const sang = c({ id: "sang", batDauMs: ms("06:00", 1), ketThucMs: ms("07:00", 1) });
  assert.equal(new Date(sang.batDauMs).toISOString().slice(0, 10), D, "tiền đề: 06:00 VN ngày D+1 là ngày D theo UTC");
  assert.equal(gioLaiTaiXe("tx1", [dem, sang], D, CS, 0).tongMs, 4 * 3600e3);
  assert.equal(gioLaiTaiXe("tx1", [dem, sang], "2026-10-06", CS, 0).tongMs, 3600e3);
});

test("trùng id (cùng chuyến ở hai danh sách) chỉ cộng một lần", () => {
  const a = c({ id: "a", batDauMs: ms("05:00"), ketThucMs: ms("10:00") });
  assert.equal(gioLaiTaiXe("tx1", [a, { ...a }], D, CS, 0).tongMs, 5 * 3600e3);
});

test("canhBaoGioLai (K9): GIO_LAI_VUOT gắn MỖI chuyến chưa kết thúc của tài xế-ngày vượt; chuyến > 4 giờ (chưa kết thúc) → CHUYEN_DAI_CAN_NGHI; chính sách rỗng → []", () => {
  const ds = [
    c({ id: "xong", trangThai: "ENDED", xuatBenMs: ms("04:00"), ketThucThatMs: ms("08:00"), batDauMs: ms("04:00"), ketThucMs: ms("08:00") }),
    c({ id: "dai", batDauMs: ms("09:00"), ketThucMs: ms("13:30") }),
  ];
  const cb = canhBaoGioLai(ds, CS, ms("08:30"));
  assert.deepEqual(cb.map((x) => `${x.loai}:${x.tripId}`).sort(), ["CHUYEN_DAI_CAN_NGHI:dai", "GIO_LAI_VUOT:dai"]);
  assert.equal(cb.find((x) => x.loai === "GIO_LAI_VUOT")!.tongPhut, 510);
  assert.deepEqual(canhBaoGioLai(ds, null, 0), []);
  assert.deepEqual(canhBaoGioLai(ds, CS, ms("08:30"), new Set(["khac"])), [], "chiChuyen lọc chuyến được gắn cảnh báo");
});
```

Bài mapper (Review: "mapper quên `departed_ms`" là rủi ro thật vì `xuatBenMs` tuỳ chọn) — tạo `src/modules/van-chuyen/dieu-phoi-doc.test.ts`; `dieu-phoi-doc.ts` import không đuôi ⇒ gói bằng esbuild rồi nạp (khuôn `src/modules/van-chuyen/chinh-sach.test.ts:11-15`):

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";

const built = await esbuild.build({ entryPoints: [new URL("./dieu-phoi-doc.ts", import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false, logLevel: "silent" });
const doc = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as any;
const ROW = { id: "t1", code: "CX-1", vehicle_id: "xe1", carrier_party_id: "p", service_date: "2026-10-05", planned_start_ms: 1, planned_end_ms: 2, earliest_start_ms: 1,
  rest_minutes_snapshot: 30, rest_override_reason_code: null, status: "ENDED", departed_at: "x", departed_ms: 123, ended_at: "y", ended_ms: 456, cancel_reason_code: null,
  end_reason_code: null, version: 3, last_cmd_id: "c", updated_at: "u", driver_party_id: "tx1" };

test("mapper chuyến mang giờ XẢY RA xuất bến (departed_ms) — gioLaiTaiXe cần nó cho chuyến đã chạy", () => {
  assert.equal(doc.khungChuyen(ROW).xuatBenMs, 123);
  assert.equal(doc.chuyenVao(ROW, { id: "xe1" }, null).xuatBenMs, 123);
});
test("mapper chính sách mang hai con số giờ lái", () => {
  const cs = doc.chinhSachVao({ id: "p", min_lead_minutes: 360, warn_lead_minutes: 120, rest_minutes: 30, require_manifest: 1, require_contract: 0, proxy_backdate_max_minutes: 180,
    duty_day_max_minutes: 500, trip_no_break_max_minutes: 200, valid_from_at: "a", created_at: "a", created_by: null });
  assert.equal(cs.dutyDayMaxMinutes, 500);
  assert.equal(cs.tripNoBreakMaxMinutes, 200);
});
```

- [ ] **Step 2: Chạy đỏ** — `node --test src/shared/gio-lai.test.ts src/modules/van-chuyen/dieu-phoi-doc.test.ts` → FAIL (thiếu tệp / thiếu khoá).

- [ ] **Step 3: Cài đặt** `src/shared/gio-lai.ts`:

```ts
// LUẬT THUẦN giờ lái (ADR-0055 VK2-B) — CHỈ CẢNH BÁO: không vào kiemXuatBen, không chặn, không MA_GIU. MỘT nguồn cho lệnh tạo/sửa chuyến và lịch chung.
// - Ngày chạy của chuyến = ngày VN của giờ bắt đầu dự kiến (= vc_trip.service_date, CHECK của 0042) — chuyến qua nửa đêm tính trọn cho ngày bắt đầu.
// - Thời lượng: đã kết thúc = kết thúc thật − xuất bến (giờ XẢY RA, ADR-0050 VK1-A); đang chạy = bây giờ − xuất bến; chưa chạy = dự kiến. Chuyến huỷ không tính.
// - Người lái: dòng lái đang mở (TripRow.driver_party_id; LC-15 cấm đổi khi đang chạy nên là người lái lúc xuất bến). Áp mọi tài xế (công ty và nhà xe).
// - "Quá" = lớn hơn hẳn (K10). Chính sách rỗng → không cảnh báo (CHINH_SACH_RONG đã báo ở lịch).
import type { KhungChuyen } from "./dieu-phoi-kieu.ts";
import { msToVnLocal } from "./vn-date.ts";

export interface ChinhSachGioLai { dutyDayMaxMinutes: number; tripNoBreakMaxMinutes: number }
export type ChuyenGioLai = Pick<KhungChuyen, "id" | "ma" | "taiXePartyId" | "batDauMs" | "ketThucMs" | "ketThucThatMs" | "trangThai"> & { xuatBenMs?: number | null };
const PHUT = 60_000;
const ngayChayCua = (c: ChuyenGioLai): string => msToVnLocal(c.batDauMs).date;
const chuaKetThuc = (c: ChuyenGioLai): boolean => c.trangThai === "PLANNED" || c.trangThai === "RUNNING";

export function thoiLuongChuyenMs(c: ChuyenGioLai, bayGioMs: number): number {
  // xuatBenMs thiếu ở chuyến đã chạy là KHÔNG THỂ (CHECK 0042) — mapper bị ghim bằng bài dieu-phoi-doc.test.ts; dùng giờ dự kiến chỉ để hàm tổng quát.
  const xb = c.xuatBenMs ?? c.batDauMs;
  if (c.trangThai === "RUNNING") return Math.max(0, bayGioMs - xb);
  if (c.trangThai === "ENDED" || c.trangThai === "ENDED_INTERRUPTED") return Math.max(0, (c.ketThucThatMs ?? c.ketThucMs) - xb);
  return Math.max(0, c.ketThucMs - c.batDauMs);
}
const khongTrungId = (ds: readonly ChuyenGioLai[]): ChuyenGioLai[] => [...new Map(ds.map((c) => [c.id, c])).values()];

export function gioLaiTaiXe(taiXePartyId: string, chuyen: readonly ChuyenGioLai[], ngayChay: string, cs: ChinhSachGioLai | null, bayGioMs: number): { tongMs: number; vuot: boolean; chuyenIds: string[] } {
  const cua = khongTrungId(chuyen).filter((c) => c.taiXePartyId === taiXePartyId && c.trangThai !== "CANCELLED" && ngayChayCua(c) === ngayChay);
  const tongMs = cua.reduce((s, c) => s + thoiLuongChuyenMs(c, bayGioMs), 0);
  return { tongMs, vuot: cs !== null && tongMs > cs.dutyDayMaxMinutes * PHUT, chuyenIds: cua.map((c) => c.id).sort() };
}

export type LoaiCanhBaoGioLai = "GIO_LAI_VUOT" | "CHUYEN_DAI_CAN_NGHI";
export const NHAN_CANH_BAO_GIO_LAI: Readonly<Record<LoaiCanhBaoGioLai, string>> = {
  GIO_LAI_VUOT: "Tài xế lái quá giờ tối đa trong ngày",
  CHUYEN_DAI_CAN_NGHI: "Chuyến dài — nhớ cho tài xế nghỉ giữa chuyến",
};
export interface CanhBaoGioLai { loai: LoaiCanhBaoGioLai; tripId: string; taiXePartyId: string; tongPhut: number }

/** Cảnh báo cho các chuyến CHƯA kết thúc có tài xế (lọc thêm bằng `chiChuyen` khi chỉ cần chuyến đang xét). Tổng tính trên MỌI chuyến truyền vào. */
export function canhBaoGioLai(chuyen: readonly ChuyenGioLai[], cs: ChinhSachGioLai | null, bayGioMs: number, chiChuyen?: ReadonlySet<string>): CanhBaoGioLai[] {
  if (!cs) return [];
  const ds = khongTrungId(chuyen);
  const out: CanhBaoGioLai[] = [];
  for (const c of ds) {
    if (!chuaKetThuc(c) || c.taiXePartyId === null || (chiChuyen && !chiChuyen.has(c.id))) continue;
    const g = gioLaiTaiXe(c.taiXePartyId, ds, ngayChayCua(c), cs, bayGioMs);
    if (g.vuot) out.push({ loai: "GIO_LAI_VUOT", tripId: c.id, taiXePartyId: c.taiXePartyId, tongPhut: Math.floor(g.tongMs / PHUT) });
    const dai = thoiLuongChuyenMs(c, bayGioMs);
    if (dai > cs.tripNoBreakMaxMinutes * PHUT) out.push({ loai: "CHUYEN_DAI_CAN_NGHI", tripId: c.id, taiXePartyId: c.taiXePartyId, tongPhut: Math.floor(dai / PHUT) });
  }
  return out;
}
```

> Ghi chú cho người thi công: `CHUYEN_DAI_CAN_NGHI` xét thời lượng **dự kiến** của chuyến chưa chạy (`ketThucMs − batDauMs`) — đúng ý "chuyến dài hơn 4 giờ thì nhắc lúc xếp".

`dieu-phoi-kieu.ts`: thêm `xuatBenMs?: number | null` (chú thích: "giờ XẢY RA xuất bến `departed_ms`; mapper `khungChuyen`/`chuyenVao` luôn đặt") vào `KhungChuyen` và `ChuyenVao`; thêm `dutyDayMaxMinutes: number; tripNoBreakMaxMinutes: number` vào `ChinhSachVao`. `dieu-phoi-doc.ts`: `khungChuyen` thêm `xuatBenMs: t.departed_ms`; `chuyenVao` thêm `xuatBenMs: t.departed_ms`; `chinhSachVao` thêm `dutyDayMaxMinutes: r.duty_day_max_minutes, tripNoBreakMaxMinutes: r.trip_no_break_max_minutes`. `repository.ts`: `DispatchPolicyRow` thêm `duty_day_max_minutes: number; trip_no_break_max_minutes: number`; `COT_CHINH_SACH` thêm hai cột.

- [ ] **Step 4: Chạy xanh** — `node --test src/shared/gio-lai.test.ts src/modules/van-chuyen/dieu-phoi-doc.test.ts && npm run typecheck` → PASS, 0 lỗi (typecheck sẽ chỉ ra mọi nơi dựng `ChinhSachVao` trong mã không-test — điền từ dòng chính sách).

- [ ] **Step 5: P16:** đổi `ngayChayCua` thành `new Date(c.batDauMs).toISOString().slice(0, 10)` (ngày UTC) → bài Review Focus 1 ĐỎ → hoàn nguyên. Ghi sổ.

- [ ] **Step 6: Commit**

```bash
git add src/shared/gio-lai.ts src/shared/gio-lai.test.ts src/shared/dieu-phoi-kieu.ts src/modules/van-chuyen/dieu-phoi-doc.ts src/modules/van-chuyen/repository.ts src/modules/van-chuyen/dieu-phoi-doc.test.ts
git commit -m "Luật thuần giờ lái: cộng giờ theo ngày chạy giờ VN, giờ xảy ra khi đã chạy

Vì sao: ADR-0055 VK2-B — chỉ cảnh báo; một hàm cho lệnh xếp và lịch chung; ranh giới nửa đêm VN có bài."
```

---

### Task 4: Hai loại cảnh báo trên lịch chung + kết quả kiểm tạo/sửa chuyến

**Files:**
- Modify: `src/shared/dieu-phoi-lich-chung.ts:44-62, 85-167`
- Modify: `src/shared/dieu-phoi-kiem.ts` (`kiemTaoSuaChuyen` trả `nhacGioLai`)
- Modify: `src/shared/dieu-phoi-man.ts:143-145` (biểu tượng `clock` cho hai loại mới; tone `warn`)
- Test: `src/shared/dieu-phoi-lich-chung.test.ts`, `src/shared/dieu-phoi-kiem.test.ts`, `src/shared/dieu-phoi-man.test.ts`

**Interfaces:**
- Consumes: `canhBaoGioLai`, `NHAN_CANH_BAO_GIO_LAI`, `ChinhSachGioLai` (Task 3).
- Produces: `LOAI_CANH_BAO_LICH` thêm `"GIO_LAI_VUOT", "CHUYEN_DAI_CAN_NGHI"`; `NHAN_CANH_BAO_LICH` lấy nhãn từ `NHAN_CANH_BAO_GIO_LAI` (một chỗ chữ); `export type KetQuaTaoSua = KetQuaKiem & { nhacGioLai: CanhBaoGioLai[] }`; `kiemTaoSuaChuyen(v): KetQuaTaoSua`. (Tên KHÁC `kiemXep.canhBao` có chủ đích — K14.)

- [ ] **Step 1: Test đỏ.** Trong `dieu-phoi-lich-chung.test.ts` (dùng hàm dựng có sẵn của tệp — `chuyenMau`, `vaoMau`…, người thi công đo tên):

```ts
test("VK2-B B3: tài xế ba chuyến tổng 8 giờ 10 phút cùng ngày → GIO_LAI_VUOT gắn từng chuyến chưa kết thúc của tài xế; chuyến > 4 giờ → CHUYEN_DAI_CAN_NGHI; lyDoGiu (kiemXuatBen) KHÔNG đổi", () => {
  // ba chuyến của TX: 05:00–08:00, 09:00–12:00, 13:00–15:10 (một chuyến nằm ở chuyenKhac — phải gộp, khử trùng id)
  const ra = dungLichChung(vaoVoi3ChuyenCungTaiXe());
  const gl = ra.canhBao.filter((w) => w.loai === "GIO_LAI_VUOT").map((w) => w.tripId).sort();
  assert.deepEqual(gl, ["t1", "t2"], "chuyến ở chuyenKhac góp vào tổng nhưng không sinh mục (không thuộc lịch ngày)");
  const truoc = dungLichChung({ ...vaoVoi3ChuyenCungTaiXe(), chinhSach: { ...CS, dutyDayMaxMinutes: 1440 } });
  assert.deepEqual(ra.chuyen.map((c) => c.lyDoGiu), truoc.chuyen.map((c) => c.lyDoGiu), "chỉ cảnh báo — không đổi giữ");
});
test("nhãn hai loại mới có chữ, không lộ mã", () => {
  for (const l of ["GIO_LAI_VUOT", "CHUYEN_DAI_CAN_NGHI"] as const) assert.doesNotMatch(NHAN_CANH_BAO_LICH[l], /[A-Z]{2,}_/);
});
```

Trong `dieu-phoi-kiem.test.ts`:

```ts
test("VK2-B B3: kiemTaoSuaChuyen trả canhBao giờ lái cho CHÍNH chuyến đang tạo/gán (không đổi ok); chuyến mới 4 giờ 30 → CHUYEN_DAI_CAN_NGHI", () => {
  const khac = [{ id: "k1", ma: "CX-1", xeId: "xe-khac", taiXePartyId: TX.partyId, batDauMs: ms("05:00"), ketThucMs: ms("09:00"), ketThucThatMs: null, trangThai: "PLANNED" as const, xuatBenMs: null }];
  const kq = kiemTaoSuaChuyen({ lenh: "TAO", chuyen: { id: null, batDauMs: ms("10:00"), ketThucMs: ms("14:30"), xe: XE, taiXe: TX, nghiPhaLe: false },
    chuyenKhac: khac, chinhSach: CS, hangBang: HB, bayGioMs: ms("00:00", -2) });
  assert.equal(kq.ok, true);
  assert.deepEqual(kq.nhacGioLai.map((x) => x.loai).sort(), ["CHUYEN_DAI_CAN_NGHI", "GIO_LAI_VUOT"]);
});
```

- [ ] **Step 2: Chạy đỏ** — `node --test src/shared/dieu-phoi-lich-chung.test.ts src/shared/dieu-phoi-kiem.test.ts` → FAIL.

- [ ] **Step 3: Cài đặt.**
  - `dieu-phoi-lich-chung.ts`: thêm hai loại vào `LOAI_CANH_BAO_LICH`; `NHAN_CANH_BAO_LICH.GIO_LAI_VUOT = NHAN_CANH_BAO_GIO_LAI.GIO_LAI_VUOT` (tương tự loại kia). Trong `dungLichChung`, sau khối `chuyen`:

    ```ts
      // ADR-0055 VK2-B B3: giờ lái — CHỈ cảnh báo. Gộp chuyến của lịch + chuyến khác (khử trùng id trong canhBaoGioLai); chỉ gắn mục cho chuyến của lịch này.
      const csGioLai = v.chinhSach ? { dutyDayMaxMinutes: v.chinhSach.dutyDayMaxMinutes, tripNoBreakMaxMinutes: v.chinhSach.tripNoBreakMaxMinutes } : null;
      for (const w of canhBaoGioLai([...v.chuyen.map(khung), ...v.chuyenKhac], csGioLai, v.bayGioMs, new Set(v.chuyen.map((c) => c.id)))) cb(w.loai, null, w.tripId, null);
    ```
    và `khung(c)` thêm `xuatBenMs: c.xuatBenMs ?? null`.
  - `dieu-phoi-kiem.ts`: `export type KetQuaTaoSua = KetQuaKiem & { nhacGioLai: CanhBaoGioLai[] };` cuối `kiemTaoSuaChuyen`:

    ```ts
      const id = c.id ?? "__moi__";
      const ung: ChuyenGioLai = { id, ma: "", taiXePartyId: c.taiXe?.partyId ?? null, batDauMs: c.batDauMs, ketThucMs: c.ketThucMs, ketThucThatMs: null, trangThai: "PLANNED", xuatBenMs: null };
      const cs = v.chinhSach ? { dutyDayMaxMinutes: v.chinhSach.dutyDayMaxMinutes, tripNoBreakMaxMinutes: v.chinhSach.tripNoBreakMaxMinutes } : null;
      const nhacGioLai = canhBaoGioLai([ung, ...v.chuyenKhac.filter((k) => k.id !== c.id)], cs, v.bayGioMs, new Set([id]));
      return { ...ketQua(khongTrung(chan), khongTrung(canPhaLe)), nhacGioLai };
    ```
  - `dieu-phoi-man.ts`: `ICON_CANH_BAO` thêm `GIO_LAI_VUOT: "clock", CHUYEN_DAI_CAN_NGHI: "clock"` (tone mặc định — không `danger`). Thêm ca vào `dieu-phoi-man.test.ts`: lịch có `GIO_LAI_VUOT` → `viecCanXuLy` có mục với `loai` là nhãn tiếng Việt.

- [ ] **Step 4: Chạy xanh** — `node --test src/shared/dieu-phoi-lich-chung.test.ts src/shared/dieu-phoi-kiem.test.ts src/shared/dieu-phoi-man.test.ts && npm run typecheck`.

- [ ] **Step 5: P16:** bỏ `.filter`/khử trùng id (`khongTrungId` trả nguyên mảng) → bài "trùng id" và bài lịch chung ĐỎ → hoàn nguyên. Ghi sổ.

- [ ] **Step 6: Commit** — `git commit -m "Cảnh báo giờ lái trên lịch chung và lệnh tạo/sửa chuyến (không chặn)"` (thân: "Vì sao: ADR-0055 B3 — chủ chọn chỉ cảnh báo; con số luật chưa có người chuyên môn kiểm.").

---

### Task 5: Chính sách — hai con số mới (máy chủ + ô trong màn có sẵn)

**Files:**
- Modify: `src/modules/van-chuyen/chinh-sach.ts:24-55`, `src/modules/van-chuyen/repository.ts:244-264`, `src/modules/van-chuyen/index.ts:135-148, 506-528`
- Modify: `src/shared/contracts.ts:1055-1081`
- Modify: `src/shared/chinh-sach-hien-thi.ts:25-95`, `web/chinh-sach-dieu-phoi.ts:82, 140-150`
- Test: `src/modules/van-chuyen/chinh-sach.test.ts`, `src/modules/van-chuyen/chinh-sach-route.test.ts`, `src/shared/chinh-sach-hien-thi.test.ts`, `tests/e2e/chinh-sach-dieu-phoi.mjs`

**Interfaces:**
- Produces: `ChinhSachMoi` + `DispatchPolicyDto` + `DispatchPolicyCreateRequest` thêm `dutyDayMaxMinutes: number` (60–1440), `tripNoBreakMaxMinutes: number` (30–720) — BẮT BUỘC; `FormChinhSach` thêm `gioLaiGio: string`, `chuyenDaiGio: string`.

- [ ] **Step 1: Test đỏ.** `chinh-sach.test.ts`:

```ts
test("VK2-B B1 (khuôn I43): thân THIẾU dutyDayMaxMinutes hoặc tripNoBreakMaxMinutes → 400 câu 'tải lại trang' (Review Focus 5); ngoài khoảng → 400; đủ → ok", () => {
  const GOC = { minLeadMinutes: 360, warnLeadMinutes: 120, restMinutes: 30, requireManifest: true, proxyBackdateMaxMinutes: 180, dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240 };
  assert.equal(kiemChinhSachMoi(GOC).ok, true);
  for (const k of ["dutyDayMaxMinutes", "tripNoBreakMaxMinutes"] as const) {
    const { [k]: _bo, ...thieu } = GOC;
    const r = kiemChinhSachMoi(thieu);
    assert.equal(r.ok, false);
    assert.match((r as { message: string }).message, /tải lại trang/);
  }
  for (const sai of [{ dutyDayMaxMinutes: 59 }, { dutyDayMaxMinutes: 1441 }, { tripNoBreakMaxMinutes: 29 }, { tripNoBreakMaxMinutes: 721 }]) assert.equal(kiemChinhSachMoi({ ...GOC, ...sai }).ok, false, JSON.stringify(sai));
});

test("bù lệch I43: câu chèn chính sách liệt kê ĐỦ mọi cột của vc_dispatch_policy (không cột nào sống nhờ DEFAULT)", () => {
  const cotBang = (openDbThat().prepare("PRAGMA table_info(vc_dispatch_policy)").all() as { name: string }[]).map((c) => c.name).sort();
  const m = /INSERT INTO vc_dispatch_policy \(([^)]+)\)/.exec(sqlCuaTen("van-chuyen", "insert_dispatch_policy"))!;
  assert.deepEqual(m[1]!.split(",").map((s) => s.trim()).sort(), cotBang);
});
```

> `openDbThat()` = dựng schema từ mọi `migrations/*.sql` bằng node:sqlite (khuôn `src/migrations-chuyen-xe.test.ts:openDb`); `sqlCuaTen` = đọc chữ SQL đã đăng ký bằng `defineSql` (người thi công đo bộ đăng ký trong `src/shared/` — vd `sqlRegistry`; nếu không có hàm tra, `import` hằng `INSERT_DISPATCH_POLICY` bằng cách xuất nó khỏi `repository.ts`).

`chinh-sach-hien-thi.test.ts`: form có `gioLaiGio: "8"`, `chuyenDaiGio: "4"` → thân có `dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240`; `"0,5"` ở ô giờ lái → lỗi ô "Giờ lái tối đa một ngày là số giờ từ 1 đến 24."; `thayDoiChinhSach` có dòng "Giờ lái tối đa một ngày 8 giờ → 9 giờ"; `tomTatChinhSach` thêm "lái tối đa 8 giờ/ngày · nhắc nghỉ chuyến trên 4 giờ".

- [ ] **Step 2: Chạy đỏ** — `node --test src/modules/van-chuyen/chinh-sach.test.ts src/shared/chinh-sach-hien-thi.test.ts`.

- [ ] **Step 3: Cài đặt.**
  - `chinh-sach.ts` `kiemChinhSachMoi`: sau kiểm `proxyBackdateMaxMinutes`:

    ```ts
      if (body.dutyDayMaxMinutes === undefined || body.tripNoBreakMaxMinutes === undefined) return fail("Thiếu giờ lái tối đa / nhắc nghỉ — tải lại trang rồi lưu lại.");
      if (!soNguyen(body.dutyDayMaxMinutes, 60, 1440)) return fail("Giờ lái tối đa một ngày là số phút nguyên từ 60 đến 1440.");
      if (!soNguyen(body.tripNoBreakMaxMinutes, 30, 720)) return fail("Chuyến dài cần nhắc nghỉ là số phút nguyên từ 30 đến 720.");
    ```
    `ChinhSachMoi` + giá trị trả thêm hai khoá; `chiTietChinhSach` thêm `phan("giờ lái tối đa", …)` và `phan("nhắc nghỉ chuyến trên", …)`.
  - `repository.ts` `INSERT_DISPATCH_POLICY`: thêm `duty_day_max_minutes, trip_no_break_max_minutes` vào danh sách cột và `?9, ?10` vào VALUES; `insertDispatchPolicyStatement` bind thêm `v.dutyDayMaxMinutes, v.tripNoBreakMaxMinutes`.
  - `index.ts` `toPolicyDto` thêm hai khoá; route POST `truoc` thêm hai khoá.
  - `contracts.ts`: hai khoá vào `DispatchPolicyDto` và `DispatchPolicyCreateRequest` (chú thích "BẮT BUỘC (I43)").
  - `chinh-sach-hien-thi.ts`: `FormChinhSach` + `TruongChinhSach` thêm `gioLaiGio`, `chuyenDaiGio` (đơn vị GIỜ — K2, dùng `phutTuO`); `docFormChinhSach` kiểm 60–1440 / 30–720 phút; `formTuChinhSach` điền bằng `gioTuPhut`; `tomTatChinhSach`, `thayDoiChinhSach` thêm dòng.
  - `web/chinh-sach-dieu-phoi.ts:144-145` thêm hai ô theo khuôn `taoO(...)`: `taoO("gioLaiGio", "Giờ lái tối đa một ngày (giờ)", "Vượt thì chỉ cảnh báo, không chặn. Mặc định 8.", false)`, `taoO("chuyenDaiGio", "Nhắc nghỉ khi chuyến dài hơn (giờ)", "Chỉ nhắc. Mặc định 4.", false)`; dòng `:82` (đọc riêng ô sát mốc) bổ sung `gioLaiGio: "8", chuyenDaiGio: "4"`.
  - `src/modules/van-chuyen/chinh-sach-route.test.ts:37` hằng `CS` thêm `dutyDayMaxMinutes: 600, tripNoBreakMaxMinutes: 300` (không thì mọi ca 201 của tệp thành 400); thêm ca: thân thiếu hai số → 400 + không chèn dòng + không nhật ký; bản mới có `current.dutyDayMaxMinutes === 600`.
  - `tests/e2e/chinh-sach-dieu-phoi.mjs`: `GOC` thêm `dutyDayMaxMinutes: 480, tripNoBreakMaxMinutes: 240`; mọi thân POST trong tệp (bản 240 phút ở bước 2) thêm hai khoá; thêm ca "thiếu dutyDayMaxMinutes → 400" vào vòng `for (const body of [...])`; khẳng định `r.body.current.dutyDayMaxMinutes === 480` sau khôi phục. `grep -rn "chinh-sach-dieu-phoi" tests/e2e src --include=*.mjs --include=*.ts` để không sót thân POST nào khác.

- [ ] **Step 4: Chạy xanh** — `node --test src/modules/van-chuyen/chinh-sach.test.ts src/modules/van-chuyen/chinh-sach-route.test.ts src/shared/chinh-sach-hien-thi.test.ts && npm run typecheck && npm run build:web`; rồi `npm run test:e2e -- chinh-sach-dieu-phoi`.

- [ ] **Step 5: P16:** bỏ `duty_day_max_minutes` khỏi câu chèn → bài "liệt kê đủ cột" ĐỎ → hoàn nguyên. Ghi sổ.

- [ ] **Step 6: Kịch bản Chrome** màn `/chinh-sach-dieu-phoi` ở 390 và 1040: hai ô mới hiện, nhập 9 → lưu → lịch sử bản có "lái tối đa 9 giờ/ngày". Ảnh vào `docs/evidence/<ngày>-dot-3/`.

- [ ] **Step 7: Commit** — `git commit -m "Chính sách điều phối: thêm giờ lái tối đa và nhắc nghỉ (bắt buộc trong thân)"`.

---

### Task 6: Route khung bận của xe (ghi, rút, xem) + nhật ký + ánh xạ lỗi CSDL

**Files:**
- Create: `src/modules/van-chuyen/khung-ban.ts`, `src/modules/van-chuyen/khung-ban.test.ts`, `src/modules/van-chuyen/khung-ban-repo.ts`, `src/modules/van-chuyen/khung-ban-route.test.ts`
- Modify: `src/modules/van-chuyen/index.ts` (3 route sau khối giấy tờ xe, trước chính sách + route tuần `GET /api/van-chuyen/ban-xe` — Step 3b), `src/shared/audit-actions.ts:82-90`, `src/shared/contracts.ts` (+ `LichXeBanResponse`, `ChuyenXeBanDto`), `src/route-access.test.ts:237`, `:272`
- Create: `tests/e2e/khung-ban-xe.mjs`; Modify: `tests/e2e/run.mjs:28-65`

**Interfaces:**
- Produces (`khung-ban.ts`):
  ```ts
  export interface KhungBanMoi { batDauMs: number; ketThucMs: number; lyDo: string }
  export const KHUNG_XE_TOI_DA_NGAY = 31;
  export function kiemKhungBanMoi(body: Record<string, unknown> | null, bayGioMs: number): Result<KhungBanMoi>   // thân { batDau: {ngay, gio}, ketThuc: {ngay, gio}, lyDo }
  export function kiemRutKhung(body: Record<string, unknown> | null): Result<{ version: number }>
  export function chiTietNhatKyKhung(bienSo: string, k: { batDauMs: number; ketThucMs: number }, lyDoNhan: string, rut?: boolean): string
  export function loiRangBuocKhungBan(message: string): { status: number; code: string; message: string } | null
  ```
- Produces (`khung-ban-repo.ts`): `khungBanCuaXe(db, xeId): Promise<KhungBanRow[]>`, `khungBanXeTrongKhoang(db, tuMs, denMs): Promise<KhungBanRow[]>` (CHỈ `subject = 'VEHICLE'`, còn hiệu lực), `khungBanTheoId(db, id, xeId)`, `insertKhungBanStatement(db, id, xeId, k, at, actorId)`, `rutKhungBanStatement(db, id, version, at, actorId)`; `KhungBanRow { id, vehicle_id, start_ms, end_ms, reason_code, reason_label, withdrawn_at, version, created_at, updated_at }`.
- Produces (`contracts.ts`):
  ```ts
  export interface KhungBanXeDto { id: string; xeId: string; batDau: string; ketThuc: string; batDauMs: number; ketThucMs: number; lyDoMa: string; lyDo: string; daRut: boolean; daQua: boolean; version: number }
  export interface KhungBanXeListResponse { dangCo: KhungBanXeDto[]; lichSu: KhungBanXeDto[]; lyDo: { code: string; label: string }[] }
  export interface KhungBanChongChuyenLoi { error: { code: "khung_ban_chong_chuyen"; message: string; chuyen: { ma: string; gio: string }[] } }
  ```
  (`batDau`/`ketThuc` = ISO UTC; màn đổi giờ VN bằng hàm có sẵn.)

- [ ] **Step 1: Test đỏ** `src/modules/van-chuyen/khung-ban.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { chiTietNhatKyKhung, kiemKhungBanMoi, kiemRutKhung, loiRangBuocKhungBan } from "./khung-ban.ts";

const ms = (d: string, hhmm: string) => Date.parse(`${d}T${hhmm}:00.000+07:00`);
const NOW = ms("2026-10-05", "10:00");
const than = (tu: [string, string], den: [string, string], lyDo = "BAN_XE_BAO_DUONG") => ({ batDau: { ngay: tu[0], gio: tu[1] }, ketThuc: { ngay: den[0], gio: den[1] }, lyDo });

test("kiemKhungBanMoi: giờ VN → mốc máy; qua nửa đêm được; bắt đầu trong quá khứ được nếu kết thúc sau bây giờ (K4)", () => {
  const r = kiemKhungBanMoi(than(["2026-10-05", "23:00"], ["2026-10-06", "07:00"]), NOW);
  assert.deepEqual(r, { ok: true, value: { batDauMs: ms("2026-10-05", "23:00"), ketThucMs: ms("2026-10-06", "07:00"), lyDo: "BAN_XE_BAO_DUONG" } });
  assert.equal(kiemKhungBanMoi(than(["2026-10-05", "08:00"], ["2026-10-05", "17:00"]), NOW).ok, true);
});

test("kiemKhungBanMoi: kết thúc ≤ bắt đầu, khung đã kết thúc, quá 31 ngày, sai khuôn giờ, thiếu lý do → 400 câu lời thường", () => {
  for (const b of [
    than(["2026-10-05", "17:00"], ["2026-10-05", "08:00"]),
    than(["2026-10-04", "08:00"], ["2026-10-05", "09:00"]),
    than(["2026-10-05", "11:00"], ["2026-11-06", "11:00"]),
    { batDau: { ngay: "2026-10-05", gio: "8h" }, ketThuc: { ngay: "2026-10-05", gio: "17:00" }, lyDo: "BAN_XE_KHAC" },
    { ...than(["2026-10-05", "11:00"], ["2026-10-05", "12:00"]), lyDo: "" },
  ]) {
    const r = kiemKhungBanMoi(b, NOW);
    assert.equal(r.ok, false, JSON.stringify(b));
    assert.doesNotMatch((r as { message: string }).message, /[A-Z]{2,}_/);
  }
});

test("kiemRutKhung: cần version nguyên ≥ 1", () => {
  assert.deepEqual(kiemRutKhung({ version: 2 }), { ok: true, value: { version: 2 } });
  assert.equal(kiemRutKhung({}).ok, false);
});

test("nhật ký: biển số + khung giờ VN + nhãn lý do; không SĐT/số giấy tờ", () => {
  assert.equal(chiTietNhatKyKhung("79B-012.34", { batDauMs: ms("2026-10-05", "08:00"), ketThucMs: ms("2026-10-05", "17:00") }, "Bảo dưỡng"),
    "xe 79B-012.34: bận 08:00 05/10 → 17:00 05/10 · Bảo dưỡng");
  assert.match(chiTietNhatKyKhung("79B-012.34", { batDauMs: 0, ketThucMs: 60000 }, "Khác", true), /^xe 79B-012\.34: rút khung bận/);
});

test("loiRangBuocKhungBan: mã lớp CSDL KHÁC mã lớp route (khuôn R15); lỗi lạ → null", () => {
  assert.equal(loiRangBuocKhungBan("unavailability_overlaps_trip: …")!.code, "khung_ban_chong_chuyen_csdl");
  assert.equal(loiRangBuocKhungBan("vc_unavailability_append_only: …")!.code, "khung_ban_vua_doi");
  assert.equal(loiRangBuocKhungBan("unavailability_reason_group: …")!.status, 400);
  assert.equal(loiRangBuocKhungBan("FOREIGN KEY constraint failed")!.status, 400);
  assert.equal(loiRangBuocKhungBan("something else"), null);
});
```

- [ ] **Step 1b: Bài route chạy CẢ ứng dụng trên SQLite** `src/modules/van-chuyen/khung-ban-route.test.ts` (khuôn `chinh-sach-route.test.ts` + `tests/audit/dieu-phoi-khung.mjs`: `batDongHo`, `setup`, `xe`, `taoChuyen`, `chuyenSan`, `tienDo`, `vnMs`, `NGAY`, `ADM`, `SALES`, `ACC`). Mọi ca từ chối khẳng định ĐÚNG MÃ + KHÔNG ghi + KHÔNG nhật ký:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ACC, ADM, NGAY, SALES, batDongHo, chuyenSan, setup, taoChuyen, tienDo, xe } from "../../../tests/audit/dieu-phoi-khung.mjs";

const than = (tu: string, den: string, ngayDen = NGAY, lyDo = "BAN_XE_BAO_DUONG") => ({ batDau: { ngay: NGAY, gio: tu }, ketThuc: { ngay: ngayDen, gio: den }, lyDo });
const dem = (w: any, bang: string) => w.q(`SELECT count(*) n FROM ${bang}`)[0].n;

test("cổng + ô: Bán hàng, Kế toán → 403 (vehicle.manage) ở cả ba route; không ghi, không nhật ký", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    for (const as of [SALES, ACC]) {
      assert.equal((await w.call("GET", `/api/van-chuyen/xe/${x}/ban`, { as })).status, 403);
      assert.equal((await w.call("POST", `/api/van-chuyen/xe/${x}/ban`, { as, body: than("08:00", "17:00") })).status, 403);
    }
    assert.equal(dem(w, "vc_unavailability"), 0);
  } finally { tat(); }
});

test("ADR tiêu chí 1 lớp route: khung chồng chuyến PLANNED → 409 khung_ban_chong_chuyen liệt kê mã chuyến (không tên khách); không ghi", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const c = await chuyenSan(w); // chuyến 13:00 có khách có tên
    const r = await w.call("POST", `/api/van-chuyen/xe/${c.xeId}/ban`, { as: ADM, body: than("12:00", "17:00") });
    assert.equal(r.status, 409);
    assert.equal(r.json.error.code, "khung_ban_chong_chuyen");
    assert.equal(r.json.error.chuyen[0].ma, c.ma);
    assert.doesNotMatch(JSON.stringify(r.json), /Khách Dò Tìm|09\d{8}/);
    assert.equal(dem(w, "vc_unavailability"), 0);
  } finally { tat(); }
});

test("chuyến ĐANG CHẠY vướng khung → 409; chuyến ĐÃ KẾT THÚC không vướng (lịch sử) — cả lớp route lẫn trigger", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const c = await chuyenSan(w);
    assert.equal((await tienDo(w, "van-phong", c.id, "xuat-ben")).status, 200);
    assert.equal((await w.call("POST", `/api/van-chuyen/xe/${c.xeId}/ban`, { as: ADM, body: than("12:00", "17:00") })).status, 409);
    // Người thi công: đưa chuyến tới ENDED bằng các lệnh tiến độ có sẵn (khuôn tien-do-mot-luat.test.ts), rồi khung 12:00–17:00 → 201.
  } finally { tat(); }
});

test("Review Focus 3 — rút: version sai → 409; rút đúng → 200 + đúng một nhật ký; rút lần hai → 409, không nhật ký thừa", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    const ghi = await w.call("POST", `/api/van-chuyen/xe/${x}/ban`, { as: ADM, body: than("08:00", "17:00") });
    assert.equal(ghi.status, 201);
    const k = ghi.json.dangCo[0];
    const soRut = () => w.q("SELECT count(*) n FROM audit_log WHERE action = 'vehicle_unavailability_withdrawn'")[0].n;
    const url = `/api/van-chuyen/xe/${x}/ban/${k.id}/rut`;
    assert.equal((await w.call("POST", url, { as: ADM, body: { version: k.version + 1 } })).status, 409);
    assert.equal(soRut(), 0);
    const r = await w.call("POST", url, { as: ADM, body: { version: k.version } });
    assert.equal(r.status, 200);
    assert.equal(r.json.lichSu.find((x2: { id: string }) => x2.id === k.id).daRut, true);
    assert.equal(soRut(), 1);
    assert.equal((await w.call("POST", url, { as: ADM, body: { version: k.version } })).status, 409);
    assert.equal(soRut(), 1);
  } finally { tat(); }
});

test("ADR tiêu chí 2 lớp máy chủ: tạo chuyến / dời giờ vào khung → 409 có lý do 'lịch xe bận'; khung đã rút → tạo được", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const x = xe(w);
    assert.equal((await w.call("POST", `/api/van-chuyen/xe/${x}/ban`, { as: ADM, body: than("08:00", "17:00") })).status, 201);
    const r = await taoChuyen(w, { xeId: x, bd: "09:00", kt: "10:00" });
    assert.equal(r.status, 409);
    assert.ok(r.json.error.lyDo.some((l: { loiNhan: string }) => /lịch xe bận/.test(l.loiNhan)), JSON.stringify(r.json));
  } finally { tat(); }
});
```

> Tên trường trả của `chuyenSan` (`xeId`, `ma`, `id`) và tham số `taoChuyen` người thi công đo ở `tests/audit/dieu-phoi-khung.mjs:79-110`; hai ca có thân rút gọn ở trên phải viết đủ theo khuôn ca liền trước (không để trống khi giao task).

Thêm vào `src/route-access.test.ts` (cạnh dòng 237):

```ts
  { method: "GET", path: "/api/van-chuyen/xe/:id/ban", access: "office" }, // ADR-0055 A5: khung bận của xe; thân hỏi vehicle.manage
  { method: "POST", path: "/api/van-chuyen/xe/:id/ban", access: "office" }, // ghi khung (chồng chuyến → 409 khung_ban_chong_chuyen)
  { method: "POST", path: "/api/van-chuyen/xe/:id/ban/:bid/rut", access: "office" }, // rút một lần (version)
```

- [ ] **Step 2: Chạy đỏ** — `node --test src/modules/van-chuyen/khung-ban.test.ts src/route-access.test.ts`.

- [ ] **Step 3: Cài đặt `khung-ban.ts`:**

```ts
// Luật thuần THÂN ROUTE khung bận của xe (ADR-0055 VK2-A A5–A6). Không I/O. Giờ nhập là giờ VN ("ngay" + "gio") → mốc máy bằng vnLocalToMs (MỘT hàm đổi giờ
// VN của cả dự án). KHÔNG import dieu-phoi-than.ts: tệp đó import không đuôi → `node --test` không nạp được (bài thuần phải import kèm đuôi .ts).
import { nhanKhoangGio } from "../../shared/khung-ban.ts";
import { vnLocalToMs } from "../../shared/vn-date.ts";

const NGAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const GIO_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function docGioVn(v: unknown): number | null {
  if (!v || typeof v !== "object") return null;
  const { ngay, gio } = v as Record<string, unknown>;
  return typeof ngay === "string" && typeof gio === "string" && NGAY_RE.test(ngay) && GIO_RE.test(gio) ? vnLocalToMs(ngay, gio) : null;
}

export type Result<T> = { ok: true; value: T } | { ok: false; message: string };
const fail = (message: string): { ok: false; message: string } => ({ ok: false, message });
export interface KhungBanMoi { batDauMs: number; ketThucMs: number; lyDo: string }
export const KHUNG_XE_TOI_DA_NGAY = 31; // ADR-0055 G-A1 (mã, khoảng cho phép — Phần II)
const MA_LY_DO_RE = /^[A-Z][A-Z0-9_]{1,39}$/;

export function kiemKhungBanMoi(body: Record<string, unknown> | null, bayGioMs: number): Result<KhungBanMoi> {
  if (!body) return fail("Dữ liệu không hợp lệ.");
  const batDauMs = docGioVn(body.batDau);
  const ketThucMs = docGioVn(body.ketThuc);
  if (batDauMs === null || ketThucMs === null) return fail("Giờ bắt đầu, giờ kết thúc: ngày YYYY-MM-DD và giờ HH:MM.");
  if (ketThucMs <= batDauMs) return fail("Giờ kết thúc phải sau giờ bắt đầu.");
  if (ketThucMs <= bayGioMs) return fail("Khung này đã qua — chỉ ghi khung còn tới hoặc đang diễn ra.");
  if (ketThucMs - batDauMs > KHUNG_XE_TOI_DA_NGAY * 86_400_000) return fail(`Một khung bận dài tối đa ${KHUNG_XE_TOI_DA_NGAY} ngày — xe nằm xưởng lâu hơn thì đổi trạng thái xe sang Bảo dưỡng.`);
  if (typeof body.lyDo !== "string" || !MA_LY_DO_RE.test(body.lyDo)) return fail("Chọn lý do xe bận.");
  return { ok: true, value: { batDauMs, ketThucMs, lyDo: body.lyDo } };
}
export function kiemRutKhung(body: Record<string, unknown> | null): Result<{ version: number }> {
  const v = body?.version;
  return typeof v === "number" && Number.isInteger(v) && v >= 1 ? { ok: true, value: { version: v } } : fail("Thiếu phiên bản khung (version) — tải lại trang rồi làm lại.");
}
export const chiTietNhatKyKhung = (bienSo: string, k: { batDauMs: number; ketThucMs: number }, lyDoNhan: string, rut = false): string =>
  `xe ${bienSo}: ${rut ? "rút khung bận" : "bận"} ${nhanKhoangGio(k.batDauMs, k.ketThucMs)} · ${lyDoNhan}`;
export const CAU_KHUNG_VUA_DOI = "Khung bận vừa được người khác rút hoặc lịch xe vừa đổi — tải lại rồi làm lại.";
export function loiRangBuocKhungBan(message: string): { status: number; code: string; message: string } | null {
  if (/\bunavailability_overlaps_trip/.test(message)) return { status: 409, code: "khung_ban_chong_chuyen_csdl", message: "Xe vừa được xếp chuyến trùng giờ này — tải lại để xem chuyến, dời hoặc đổi xe chuyến đó trước." };
  if (/vc_unavailability_append_only/.test(message)) return { status: 409, code: "khung_ban_vua_doi", message: CAU_KHUNG_VUA_DOI };
  if (/\bunavailability_reason_group|FOREIGN KEY constraint failed/.test(message)) return { status: 400, code: "invalid_input", message: "Lý do không có trong danh mục lý do xe bận." };
  return null;
}
```

`khung-ban-repo.ts` (mọi câu `defineSql("van-chuyen", …)`, mọi câu đọc lọc `subject = 'VEHICLE'`):

```ts
const COT = `u.id, u.vehicle_id, u.start_ms, u.end_ms, u.reason_code, r.label AS reason_label, u.withdrawn_at, u.version, u.created_at, u.updated_at`;
const KHUNG_CUA_XE = defineSql("van-chuyen", "khung_ban_cua_xe",
  `SELECT ${COT} FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code WHERE u.subject = 'VEHICLE' AND u.vehicle_id = ?1 ORDER BY u.start_ms DESC LIMIT 200`);
const KHUNG_XE_TRONG_KHOANG = defineSql("van-chuyen", "khung_ban_xe_trong_khoang",
  `SELECT ${COT} FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code
   WHERE u.subject = 'VEHICLE' AND u.withdrawn_at IS NULL AND u.start_ms < ?2 AND u.end_ms > ?1 ORDER BY u.vehicle_id, u.start_ms`);
const KHUNG_THEO_ID = defineSql("van-chuyen", "khung_ban_theo_id", `SELECT ${COT} FROM vc_unavailability u JOIN vc_reason r ON r.code = u.reason_code WHERE u.subject = 'VEHICLE' AND u.id = ?1 AND u.vehicle_id = ?2`);
const KHUNG_INSERT = defineSql("van-chuyen", "khung_ban_insert",
  `INSERT INTO vc_unavailability (id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, created_at, created_by, updated_at, updated_by)
   VALUES (?1, 'VEHICLE', ?2, NULL, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?8, ?9)`);
const KHUNG_RUT = defineSql("van-chuyen", "khung_ban_rut",
  `UPDATE vc_unavailability SET withdrawn_at = ?3, withdrawn_by = ?4, version = version + 1, updated_at = ?3, updated_by = ?4
   WHERE id = ?1 AND version = ?2 AND withdrawn_at IS NULL AND subject = 'VEHICLE'`);
```

Hàm bind tương ứng; `insertKhungBanStatement` truyền `start_at = new Date(batDauMs).toISOString()` (phút tròn do ô `HH:MM`).

Route trong `index.ts` (thứ tự: 403 ô → 404 xe → 409 xe đã ngừng (chỉ ghi) → 400 thân → 400 lý do ngoài nhóm/ngưng → 409 chồng chuyến (lớp route, liệt kê) → lô ghi + nhật ký → lỗi CSDL):

```ts
    route("GET", "/api/van-chuyen/xe/:id/ban", "office", async ({ env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      return xe ? respondKhungBan(env.DB, id) : NOT_FOUND();
    }),
    route("POST", "/api/van-chuyen/xe/:id/ban", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      if (xe.status === "retired") return RETIRED();
      const now = new Date();
      const parsed = kiemKhungBanMoi(await readJson(request), now.getTime());
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const k = parsed.value;
      const lyDo = (await lyDoDangDung(env.DB)).find((r) => r.code === k.lyDo && r.reason_group === "BAN_XE");
      if (!lyDo) return error(400, "invalid_input", "Lý do không có trong danh mục lý do xe bận.");
      // Q-L2-1 = a (lớp route): chuyến chưa huỷ, chưa kết thúc của xe chồng khung → 409 liệt kê mã chuyến + giờ (không tên khách).
      const vuong = chuyenVuongKhung({ xeId: id, ...k }, (await tripsTouching(env.DB, k.batDauMs, k.ketThucMs)).map(khungChuyen));
      if (vuong.length > 0) {
        const dau = vuong[0]!;
        return json({ error: { code: "khung_ban_chong_chuyen", message: `Xe đang có chuyến ${dau.ma} lúc ${nhanKhoangGio(dau.batDauMs, dau.ketThucMs)} — dời hoặc đổi xe chuyến đó trước.`,
          chuyen: vuong.map((c) => ({ ma: c.ma, gio: nhanKhoangGio(c.batDauMs, c.ketThucMs) })) } } satisfies KhungBanChongChuyenLoi, 409);
      }
      const at = now.toISOString();
      try {
        await env.DB.batch([
          insertKhungBanStatement(env.DB, crypto.randomUUID(), id, k, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_unavailability_added", at, targetType: "vehicle", targetId: id, detail: chiTietNhatKyKhung(xe.plate_number, k, lyDo.label) }),
        ]);
      } catch (e) {
        const p = loiRangBuocKhungBan(e instanceof Error ? e.message : "");
        if (p) return error(p.status, p.code, p.message);
        throw e;
      }
      return respondKhungBan(env.DB, id, 201);
    }),
    route("POST", "/api/van-chuyen/xe/:id/ban/:bid/rut", "office", async ({ request, env, params, staff }) => {
      if (!can(staff, "vehicle.manage")) return FORBIDDEN();
      const id = params.id ?? "";
      const xe = UUID_RE.test(id) ? await findVehicle(env.DB, id) : null;
      if (!xe) return NOT_FOUND();
      const bid = params.bid ?? "";
      const k = UUID_RE.test(bid) ? await khungBanTheoId(env.DB, bid, id) : null;
      if (!k) return error(404, "not_found", "Không có khung bận này.");
      const parsed = kiemRutKhung(await readJson(request));
      if (!parsed.ok) return error(400, "invalid_input", parsed.message);
      const now = new Date();
      if (k.withdrawn_at !== null || k.version !== parsed.value.version) return error(409, "khung_ban_vua_doi_route", CAU_KHUNG_VUA_DOI);
      if (k.end_ms <= now.getTime()) return error(409, "khung_ban_da_qua", "Khung này đã qua — giữ trong lịch sử, không rút.");
      const at = now.toISOString();
      let kq: D1Result[];
      try {
        kq = await env.DB.batch([
          rutKhungBanStatement(env.DB, bid, parsed.value.version, at, staff.id),
          auditStatement(env.DB, { staffId: staff.id, action: "vehicle_unavailability_withdrawn", at, targetType: "vehicle", targetId: id,
            detail: chiTietNhatKyKhung(xe.plate_number, { batDauMs: k.start_ms, ketThucMs: k.end_ms }, k.reason_label, true) }, "changes() > 0"),
        ]);
      } catch (e) {
        const p = loiRangBuocKhungBan(e instanceof Error ? e.message : "");
        if (p) return error(p.status, p.code, p.message);
        throw e;
      }
      if ((kq[0]!.meta.changes ?? 0) === 0) return error(409, "khung_ban_vua_doi_route", CAU_KHUNG_VUA_DOI);
      return respondKhungBan(env.DB, id);
    }),
```

> `lyDoDangDung` của `chuyen-repo.ts` trả lý do ĐANG DÙNG (`active = 1`) — lý do đã ngưng bị từ chối ở route. `respondKhungBan(db, xeId, status)` dựng `KhungBanXeListResponse`: `dangCo` = chưa rút và `end_ms > now` (sắp theo giờ bắt đầu tăng), `lichSu` = phần còn lại (mới trước), `lyDo` = lý do đang dùng nhóm `BAN_XE`. `audit-actions.ts` thêm:

```ts
  vehicle_unavailability_added: { label: "Ghi lịch xe bận", group: "vehicle" },
  vehicle_unavailability_withdrawn: { label: "Rút lịch xe bận", group: "vehicle" },
```

- [ ] **Step 3b (thêm 2026-10-02 — bản vẽ trang tuần): route đọc tuần `GET /api/van-chuyen/ban-xe?tu=YYYY-MM-DD`** (tên theo khuôn `ban-tai-xe` của Đợt 6). Trang "Lịch xe bận" là màn đọc nhiều xe một lúc — `GET /xe/:id/ban` (một xe) và `khungBanXe` của `GET /lich` (một ngày) không đủ.
  - Cổng `office`; **`can(staff, "vehicle.manage")` đầu thân, 403 trước 400** (chủ đồng ý 2/10 — câu 3.4). Vắng `tu` ⇒ `vnWeekRange(vnToday(now)).from`; có `tu` ⇒ `isISODate` sai → 400 "Tuần xem: YYYY-MM-DD."; đúng ⇒ chuẩn về thứ Hai bằng `vnWeekRange(tu).from` (MỘT hàm tuần với màn — `src/shared/vn-date.ts:69`).
  - Khoảng `[vnLocalToMs(tu, "00:00"), vnLocalToMs(addDays(tu, 7), "00:00"))` — nửa đêm VN, KHÔNG `Date.parse(\`${tu}T00:00:00Z\`)`.
  - Đọc: `xeDieuPhoi(env.DB)` (đã bỏ xe `retired`, `chuyen-repo.ts:197`) map như `xeChon` (`dieu-phoi-dto.ts:52`); `khungBanXeTrongKhoang(db, tuMs, denMs)` (Task 6 — câu `khung_ban_xe_trong_khoang` đã lọc `subject = 'VEHICLE'`, không thêm câu SQL mới); `lyDo` = lý do đang dùng nhóm `BAN_XE`; `chuyen` = `tripsTouching(db, tuMs, denMs)` bỏ `CANCELLED`, **chỉ khi `can(staff, "trip.view")`** (vắng ô ⇒ `[]`) (chủ đồng ý 2/10 — câu 3.1).
  - `contracts.ts` thêm:
    ```ts
    /** Chuyến đã xếp trên lưới tuần Lịch xe bận — DANH SÁCH TRẮNG: không mã đơn, không tên khách, không tài xế (câu 3.1). */
    export interface ChuyenXeBanDto { id: string; ma: string; xeId: string; batDauMs: number; ketThucMs: number; trangThai: "PLANNED" | "RUNNING" | "ENDED" | "ENDED_INTERRUPTED" } // trạng thái thô chỉ để màn chọn nhãn — không hiện mã
    export interface LichXeBanResponse { tu: string; den: string; xe: XeChonDto[]; khung: KhungBanXeDto[]; chuyen: ChuyenXeBanDto[]; lyDo: { code: string; label: string }[] }
    ```
    (`den` = `addDays(tu, 6)`, hai đầu bao gồm như `vnWeekRange`.) Mapper `khungBanXeDto(row, bayGioMs)` dùng chung với `respondKhungBan` (một chỗ dựng `KhungBanXeDto`).
  - Test thêm vào `khung-ban-route.test.ts` (SQLite, đỏ trước): (1) Bán hàng, Kế toán → 403, kể cả khi `tu=abc` (403 trước 400); (2) Quản trị, vắng `tu` → `tu` là thứ Hai của tuần hiện tại theo ngày VN (đồng hồ giả `batDongHo(ms)` — `tests/audit/dieu-phoi-khung.mjs:31` — đặt 00:30 VN thứ Hai = 17:30 UTC Chủ nhật ⇒ vẫn tuần MỚI); `tu=2026-10-07` (thứ Tư) → `tu: "2026-10-05"`; (3) khung 23:00 CN → 07:00 T2 có trong `khung` của CẢ tuần trước và tuần sau; (4) **khoá DTO**: mỗi phần tử `chuyen` có ĐÚNG các khoá `id, ma, xeId, batDauMs, ketThucMs, trangThai`; `JSON.stringify(r.json)` không khớp `/Khách Dò Tìm|09\d{8}|TD-\d/` (chuyến dựng bằng `chuyenSan` — có khách có tên); (5) chuyến đã huỷ không có trong `chuyen`.
  - `src/route-access.test.ts` thêm (cạnh dòng `/api/van-chuyen/lich`, `:272`):
    ```ts
      { method: "GET", path: "/api/van-chuyen/ban-xe", access: "office" }, // trang tuần Lịch xe bận; thân hỏi vehicle.manage (câu 3.4)
    ```
  - P16 (ghi sổ, Task 9 dòng "+"): (a) dựng `chuyen` bằng `{ ...row }` (trải nguyên `TripRow`) hoặc thêm khoá `maDon` → ca (4) khoá DTO ĐỎ; (b) bỏ dòng `can(staff, "vehicle.manage")` → ca (1) ĐỎ (Kế toán `tu=abc` ra 400 thay 403). Hoàn nguyên cả hai → xanh.

- [ ] **Step 4: E2E** `tests/e2e/khung-ban-xe.mjs` (khuôn nền của `tests/e2e/dieu-phoi.mjs:1-40`: tài xế công ty + xe 15 chỗ có Kiểm định + Bảo hiểm; dữ liệu theo `Date.now()`; ngày `vnDate(3)`). Kịch bản:
  1. Bán hàng, Kế toán `GET|POST /xe/:id/ban` và `GET /ban-xe` → 403; Quản trị `GET` → 200 có `lyDo` 4 dòng.
  2. Tạo chuyến 09:00–11:00 (route `POST /api/van-chuyen/chuyen`), rồi Quản trị ghi khung 08:00–17:00 → 409 `khung_ban_chong_chuyen`, `chuyen[0].ma` là mã chuyến, thân lỗi không có `fullName`/`phone` (khẳng định `doesNotMatch(JSON.stringify(body), /Khách|09\d{8}/)`). (ADR tiêu chí 1, lớp route.)
  3. Huỷ chuyến → ghi lại → 201; nhật ký `vehicle_unavailability_added` có biển số, không có `09\d{8}`.
  4. `INSERT` tay (`sql()`) một chuyến chồng khung → lỗi chứa `lc03_unavailable` (ADR tiêu chí 2, CSDL trên D1 thật). Tạo chuyến qua route vào khung → 409 có lý do "lịch xe bận". Dời giờ (`PUT /chuyen/:id`) một chuyến khác vào khung → 409.
  5. Khung 23:00 D → 07:00 D+1 ghi được (nửa đêm VN).
  6. Rút với `version` sai → 409 `khung_ban_vua_doi_route`; rút đúng → 200, `daRut: true`; rút lần hai → 409 (Review Focus 3); nhật ký `_withdrawn` đúng một dòng mới.
  7. `UPDATE vc_unavailability SET start_ms = …` / `DELETE` bằng `sql()` → bị chặn; chèn `subject = 'DRIVER'` → `unavailability_driver_closed`.
  7b. (thêm 2/10) `GET /api/van-chuyen/ban-xe?tu=<thứ Hai tuần chứa D>` bằng Kế toán → 403; bằng Quản trị → 200, `khung` có khung 08:00–17:00 của xe thử, thêm một khung 23:00 CN → 07:00 T2 (CN = Chủ nhật đầu tiên từ `vnDate(3)` trở đi) có ở CẢ hai tuần; `chuyen` (nếu câu 3.1 giữ khuyến nghị) chỉ có khoá trong danh sách trắng, không `TD-…`, không `09\d{8}`.
  8. Khôi phục: rút mọi khung còn mở của xe thử ở `finally` (khung là dữ liệu của xe dùng một lần — không ảnh hưởng kịch bản khác).

  Đăng ký `"khung-ban-xe"` trong `ALL` của `tests/e2e/run.mjs` ngay sau `"dieu-phoi"` (cùng nền tài xế/xe dùng một lần) + ước lượng thời gian (bảng `:64-65`, ~15) + dòng chú thích thứ tự.

- [ ] **Step 5: Chạy xanh** — `node --test src/modules/van-chuyen/khung-ban.test.ts src/modules/van-chuyen/khung-ban-route.test.ts src/route-access.test.ts src/architecture.test.ts && npm run typecheck && npm run test:e2e -- khung-ban-xe`.

- [ ] **Step 6: P16:** bỏ khối "lớp route" (`vuong.length > 0`) → e2e bước 2 ra `khung_ban_chong_chuyen_csdl` thay vì `khung_ban_chong_chuyen` → ĐỎ (chứng minh hai lớp thấy được riêng) → hoàn nguyên.

- [ ] **Step 7: Commit** — `git commit -m "Route khung bận của xe: ghi, rút một lần, xem; nhật ký; mã lỗi hai lớp"`.

---

### Task 7: Nối khung bận vào lệnh tạo/sửa chuyến; dải bận trong `GET /lich`; DTO tài xế không có khung bận

**Files:**
- Modify: `src/modules/van-chuyen/index.ts:817-885` (tạo chuyến), `src/modules/van-chuyen/dieu-phoi-lenh.ts:36-92` (sửa chuyến), `:376-424` (`dungLichNgay`)
- Modify: `src/shared/contracts.ts` (`LichChungResponse.khungBanXe: KhungBanLichDto[]`; `ChuyenChiTietResponse.canhBaoLenh?: CanhBaoLichDto[]`)
- Test: `src/modules/van-chuyen/dieu-phoi-doc.test.ts`, `src/modules/van-chuyen/khung-ban-route.test.ts`, `src/modules/van-chuyen/tai-xe-dto.test.ts:15`, `tests/e2e/khung-ban-xe.mjs` (thêm bước)

**Interfaces:**
- Consumes: `khungBanXeTrongKhoang` (Task 6), `KhungBanVao` (Task 2), `KetQuaTaoSua` (Task 4), `khungTrongNgay` (Task 2).
- Produces: `export const khungBanVao = (r: KhungBanRow): KhungBanVao` trong `dieu-phoi-doc.ts`; `export interface KhungBanLichDto { id: string; xeId: string; bienSo: string; batDau: string; ketThuc: string; lyDo: string }`.

- [ ] **Step 1: Test đỏ.**
  - `tai-xe-dto.test.ts`: mở rộng `CAM_KHOA` thêm `khungBan\w*|unavailab\w*|lyDoBan` (A4 + Review Focus 4) và thêm ca: DTO tài xế dựng trên chuyến có xe đang có khung bận → `JSON.stringify(dto)` không khớp `CAM_KHOA`.
  - `dieu-phoi-doc.test.ts` (gói esbuild như Task 3): `khungBanVao(row)` → `doiTuong: "VEHICLE"`, `lyDoNhan` = nhãn; bài nguồn: chữ SQL `khung_ban_xe_trong_khoang` chứa `subject = 'VEHICLE'` (khoá Review Focus 4 — Kế toán có `trip.view` không thấy dòng `DRIVER` khi Đợt 6 mở):

    ```ts
    test("Review Focus 4: mọi câu đọc khung bận đợt 3 lọc subject = 'VEHICLE' tường minh", () => {
      const src = readFileSync(new URL("./khung-ban-repo.ts", import.meta.url), "utf8");
      const cau = [...src.matchAll(/defineSql\("van-chuyen", "(khung_ban_[a-z_]+)",\s*`([^`]+)`/g)];
      assert.ok(cau.length >= 5);
      for (const [, ten, sql] of cau) if (!/^\s*INSERT/i.test(sql!)) assert.match(sql!, /subject = 'VEHICLE'/, ten);
    });
    ```
  - E2E (thêm vào `khung-ban-xe.mjs`): `GET /api/van-chuyen/lich?ngay=D` bằng **Kế toán** → `khungBanXe` có khung 08:00–17:00 của xe thử (A4: `trip.view` xem được); khung 23:00 D → 07:00 D+1 có ở `?ngay=D` **và** `?ngay=D+1`, không có ở `?ngay=D+2` (Review Focus 1). Mỗi phần tử `khungBanXe` có ĐÚNG các khoá `id, xeId, bienSo, batDau, ketThuc, lyDo` (danh sách trắng — không `createdBy`, không `driverPartyId`). Cùng các ca này viết ở `khung-ban-route.test.ts` (SQLite, nhanh) — e2e chỉ nhắc lại trên D1 thật. Tạo chuyến 10 giờ… bằng tài xế đã có 2 chuyến 5 giờ cùng ngày → phản hồi 201 có `canhBaoLenh` chứa nhãn "Tài xế lái quá giờ tối đa trong ngày"; `GET /chuyen/:id` có `canhBao` cùng loại; `GET /cuoc-cua-toi/:id` của tài xế không đổi (không khoá giờ lái).

- [ ] **Step 2: Chạy đỏ.**

- [ ] **Step 3: Cài đặt.**
  - Tạo chuyến (`index.ts` ~`:833`): đọc `const khung = (await khungBanXeTrongKhoang(env.DB, t.batDauMs, t.ketThucMs)).map(khungBanVao);` truyền `khungBan: khung` vào `kiemTaoSuaChuyen`; sau khi chạy lô thành công, gắn `...(kq.nhacGioLai.length ? { canhBaoLenh: kq.nhacGioLai.map((w) => ({ loai: w.loai, nhan: NHAN_CANH_BAO_GIO_LAI[w.loai], legId: null, tripId: id, maDon: null })) } : {})` vào phản hồi (khuôn `canhBaoXep` `:896-907`; lần gửi lại cùng `requestId` không có).
  - Sửa chuyến (`dieu-phoi-lenh.ts` `lenhSuaChuyen`): đọc khung trong `[batDauMs, ketThucMs)` mới, truyền `khungBan`; đổi chữ ký trả `Promise<Response | null | { nhacGioLai: CanhBaoGioLai[] }>` — route `PUT /chuyen/:id` gắn `canhBaoLenh` như trên. (Người thi công: giữ nguyên thứ tự lô — không thêm câu ghi.)
  - `dungLichNgay`: `const tuMs = vnLocalToMs(ngay, "00:00")!, denMs = vnLocalToMs(addDays(ngay, 1), "00:00")!;` → `khungBanXeTrongKhoang(db, tuMs, denMs)` → `khungBanXe: rows.map((r) => ({ id: r.id, xeId: r.vehicle_id, bienSo: chung.xe.find((x) => x.id === r.vehicle_id)?.plate_number ?? "", batDau: new Date(r.start_ms).toISOString(), ketThuc: new Date(r.end_ms).toISOString(), lyDo: r.reason_label }))`. KHÔNG dùng `Date.parse(\`${ngay}T00:00:00Z\`)`.
  - `chuyenVao`/`khungChuyen` đã có `xuatBenMs` (Task 3) → `chiTietChuyen` tự có cảnh báo giờ lái qua `dungLichChung` (lọc theo `tripId` ở `dieu-phoi-route.ts:151` — giữ nguyên).

- [ ] **Step 4: Chạy xanh** — `node --test src/modules/van-chuyen/*.test.ts && npm run typecheck && npm run test:e2e -- khung-ban-xe dieu-phoi tai-xe-cuoc`.

- [ ] **Step 5: P16:** bỏ `khungBan: khung` ở route tạo chuyến → e2e bước 4 (tạo qua route vào khung) ra `trip_rule` (lớp CSDL) thay vì 409 có lý do "lịch xe bận" → ĐỎ → hoàn nguyên. Bỏ `subject = 'VEHICLE'` khỏi một câu → bài Review Focus 4 ĐỎ → hoàn nguyên.

- [ ] **Step 6: Commit** — `git commit -m "Khung bận chặn tạo/sửa chuyến ở máy chủ; lịch chung trả dải bận theo ngày giờ VN"`.

---

### Task 8: Câu kiểm định kỳ R-VC-21 (lưới thứ hai, warn)

**Files:**
- Modify: `scripts/audit-checks.mjs` (sau R-VC-20, `:560-570`), `src/audit-invariants.test.ts` (sau `:1831`)

- [ ] **Step 1: Test đỏ** (khuôn R-VC-20, `one("R-VC-21")`, `violations(db, c)`):

```ts
test("R-VC-21 (ADR-0055 hệ quả 10): chuyến chưa huỷ, CHƯA kết thúc chồng khung bận còn hiệu lực của xe → đếm (warn); chuyến đã kết thúc / khung đã rút / khung DRIVER → không đếm", () => {
  const c = one("R-VC-21");
  assert.equal(c.level, "warn");
  const db = build();
  // Dựng: xe + khung 08:00–17:00 + chuyến 18:00–19:00 (hợp lệ) → 0. Rồi THẢ hai trigger vc_trip_unavailable_* (khuôn thaTrigSuat :1056) để giả "lọt lưới",
  // dời chuyến vào 09:00–10:00 → 1. Rút khung → 0. Cho chuyến ENDED (khuôn gieo của tệp) → 0.
});
```

- [ ] **Step 2: Chạy đỏ** — `node --test src/audit-invariants.test.ts --test-name-pattern R-VC-21`.

- [ ] **Step 3: Cài đặt** trong `CHECKS`:

```js
  // R-VC-21 (ADR-0055 VK2-A, hệ quả 10 — lưới thứ hai của hai trigger khung bận): chuyến PLANNED/RUNNING chồng khung bận CÒN HIỆU LỰC của xe (nửa mở, so với
  // giờ kết thúc dự kiến). Chuyến đã kết thúc là lịch sử — không báo. Gặp: chuyến đang chạy quá giờ dự kiến lấn vào khung ghi sau (K8 của kế hoạch). Chỉ đếm.
  {
    code: "R-VC-21",
    what: "chuyến chưa kết thúc chồng lịch xe bận còn hiệu lực",
    sql: `SELECT count(*) FROM vc_trip t JOIN vc_unavailability u ON u.subject = 'VEHICLE' AND u.vehicle_id = t.vehicle_id AND u.withdrawn_at IS NULL
          WHERE t.status IN ('PLANNED', 'RUNNING') AND t.planned_start_ms < u.end_ms AND u.start_ms < t.planned_end_ms`,
    level: "warn",
    note: "cảnh báo: văn phòng dời hoặc đổi xe chuyến, hoặc Quản trị rút khung bận",
  },
```

- [ ] **Step 4: Chạy xanh** — `node --test src/audit-invariants.test.ts && node scripts/audit-invariants.mjs --db local` (thoát 0; R-VC-21 = 0 trên D1 local).

- [ ] **Step 5: Commit** — `git commit -m "Kiểm định kỳ R-VC-21: chuyến chưa kết thúc chồng lịch xe bận (cảnh báo)"`.

---

### Task 9: Sổ hàng rào — mười dòng, mỗi dòng có ngày thấy chặn thật

**Files:**
- Modify: `docs/SO-HANG-RAO.md`

- [ ] **Step 1:** Thêm mười dòng (ADR-0055 "Hệ quả" 1–10; mục 7 số hiệu chuyến bay **đã có dòng** từ kế hoạch ô mới — chỉ trỏ tới, không thêm), mỗi dòng: hàng rào — chặn gì — cơ chế (tệp:bài) — "Đã thấy chặn thật: <ngày> + phép đột biến + thông báo đỏ" (lấy từ sổ thi công, bước P16 của Task 1–8):

| # | Hàng rào | Phép đột biến (đã làm ở) |
|---|---|---|
| 1 | trigger `vc_trip_unavailable_ins` và `_upd` (hai dòng riêng) | xoá `_ins` → ca tạo đỏ (6a); xoá `_upd` → ca dời giờ / đổi xe đỏ (6a′) |
| 2 | trigger `vc_unavailability_overlaps_trip` | xoá → TC-K1, TC-K5 đỏ (6b) |
| 3 | trigger `vc_unavailability_driver_closed` | xoá → TC-K3 đỏ (6c) |
| 4 | trigger `vc_unavailability_withdraw_once` + `_no_delete` + `_insert_open`; `CHECK` một đối tượng | xoá → TC-K3/TC-K4 đỏ (6d, 6e) |
| 5 | bài "một hàm chồng giờ" (`kiemTaoSuaChuyen` khung bận) | bỏ vòng khung → ca VK2-A đỏ (Task 2 Step 5); route tạo bỏ `khungBan` → e2e đỏ (Task 7 Step 5) |
| 6 | bài `gioLaiTaiXe` ranh giới VN + khử trùng | ngày UTC → đỏ (Task 3 Step 5); bỏ khử trùng → đỏ (Task 4 Step 5) |
| 7 | (đã có) `CHECK` số hiệu chuyến bay | — trỏ dòng có sẵn |
| 8 | bài khoá DTO tài xế không khung bận (`tai-xe-dto.test.ts` `CAM_KHOA`) | thêm khoá `khungBan` vào DTO tài xế → đỏ → hoàn nguyên (làm ở bước này) |
| 9 | bài thân trigger `vc_*` (`architecture.test.ts:873`, `:951`) với 7 trigger mới | thêm tạm `JOIN orders` vào thân `vc_trip_unavailable_ins` trong bản sao `KHUNG_BAN_SQL` → bài kiến trúc đỏ (chạy `KHUNG_BAN_SQL=… node --test src/architecture.test.ts` nếu bài đọc migration qua biến; nếu không, sửa tạm tệp migration trong worktree rồi `git checkout` lại — **chỉ bằng công cụ sửa tệp, ghi sổ**) |
| 10 | R-VC-21 (warn) | bỏ `u.withdrawn_at IS NULL` → ca "khung đã rút" đỏ (Task 8) |
| + | bài "câu chèn chính sách liệt kê đủ cột" (bù lệch I43) | Task 5 Step 5 |
| + | bài "mọi câu đọc khung bận lọc VEHICLE" | Task 7 Step 5 |
| + | route tuần `GET /ban-xe`: cổng `vehicle.manage` (403 trước 400) + danh sách trắng `ChuyenXeBanDto` (thêm 2/10) | Task 6 Step 3b P16 (a), (b) |
| + | luật tuần một hàm `tuanXem` → `vnWeekRange` (không giờ máy) | Task 10 Step 1 P16 (lượt `TZ=America/Los_Angeles`) |

- [ ] **Step 2: Commit** — `git commit -m "Sổ hàng rào: mười hai dòng khung bận + giờ lái, có ngày thấy chặn thật"`.

---

### Task 10: Giao diện — trang "Lịch xe bận" (lưới tuần, theo bản vẽ 2/10) + dải bận trên Điều phối xe + cảnh báo giờ lái (khuôn có sẵn)

> **Đổi 2026-10-02:** bản vẽ "Quản lý lịch xe bận" thay Màn A (khối trong Chi tiết xe) bằng **một trang tuần riêng** (hàng = xe, cột = 7 ngày). `web/xe-chi-tiet.ts` **không còn sửa**. Màn B (dải bận) và hai cảnh báo giờ lái bản vẽ không vẽ ⇒ làm theo khuôn có sẵn, không chờ vẽ. Bản vẽ: `docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html` (dự án Claude Design `f0f47482-c51a-4232-b5c0-d924871ce294`).

**Files:**
- Create: `src/shared/khung-ban-hien-thi.ts`, `src/shared/khung-ban-hien-thi.test.ts`
- Create: `public/lich-xe-ban.html`, `web/lich-xe-ban.ts` (công thức trang mới của `docs/CHANGE-GUIDE.md`: `initShell()`, khai `PAGES`, thêm vào `build:web`)
- Create: `docs/evidence/<ngày>-dot-3/kich-ban/lich-xe-ban-smoke.mjs`
- Modify: `src/shared/sw-policy.ts:16` (`PAGES` thêm `"/lich-xe-ban"` — bài đối chiếu `PAGES` ↔ `build:web` ở `:22`), `package.json:11` (`build:web` thêm `web/lich-xe-ban.ts`)
- Modify: `web/shell.ts` — hằng `TRANG_LICH_XE_BAN = "/lich-xe-ban"` cạnh `TRANG_XE` (`:18`); mục cha "Vận chuyển" `active()` (`:248`) và tab "Tôi" `active()` (`:71`) nhận đường dẫn mới; mục con `{ href: TRANG_LICH_XE_BAN, label: "Lịch xe bận", kind: "sub" }` **ngay sau "Xe", trước "Sắp hết hạn"** trong khối `if (vehicle)` (`:252-256`) (chủ đồng ý 2/10 — câu 3.4)
- Modify: `web/account.ts:87` — dòng "Lịch xe bận" ngay sau dòng "Xe" của nhóm VẬN CHUYỂN, cùng điều kiện `quanLyXe` (ô `vehicle.manage`) (chủ đồng ý 2/10 — câu 3.4)
- Modify: `web/dieu-phoi.ts:186-200` (dải bận trên "Dòng thời gian theo xe") + thẻ xe khổ điện thoại; nơi `web/chuyen-sua.ts` nhận phản hồi lưu (người thi công đo) — dải `canhBaoLenh`
- Modify: `public/app.css` — token mới nhóm "Riêng" + khối `.xb-*` (trang tuần) + `.dp-tl-ban` (dải bận) sau dấu mốc PWA, chỉ token (bài quét `tests/e2e/pwa.mjs`)
- Modify: `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` — `ADMIN_NAV` (`:627-631`, `deepEqual` ⇒ chèn "Lịch xe bận" giữa "Xe" và "Sắp hết hạn"); số mục Quản trị **17 → 18** ở `:642`, `:643`, `:984`, `:1000` và chữ thông báo `:1122`; Toàn quyền **23 → 24** ở `:1010` (Toàn quyền giữ `vehicle.manage` — chú thích `:976`: "20 mục = 17 của Quản trị + …"; người thi công đo lại ô trước khi sửa số). Đợt khác thêm mục thanh bên (Đợt 4, 6) ⇒ số đếm cộng dồn lúc gộp.
- Modify: `web/CLAUDE.md` (bảng kịch bản Chrome: hàng `web/lich-xe-ban.ts` → `lich-xe-ban-smoke.mjs`)
- KHÔNG sửa: `web/xe-chi-tiet.ts` (bỏ Màn A — gỡ đụng độ với Đợt 1)

**Interfaces:**
- `src/shared/khung-ban-hien-thi.ts` (thuần, có test, không import `src/modules/`):
  ```ts
  /** Form "Thêm lịch bận" của bản vẽ + ô "Đến ngày" (câu 3.3). */
  export interface FormKhungBan { xeId: string; ngay: string; denNgay: string; tuGio: string; denGio: string; lyDo: string }
  export type KetQuaFormKhungBan =
    | { ok: true; xeId: string; value: { batDau: { ngay: string; gio: string }; ketThuc: { ngay: string; gio: string }; lyDo: string } }
    | { ok: false; loi: Partial<Record<keyof FormKhungBan, string>> };
  export function docFormKhungBan(f: FormKhungBan, bayGioMs: number): KetQuaFormKhungBan   // biên khớp kiemKhungBanMoi (máy chủ vẫn quyết); lỗi theo ô
  /** Tuần hiển thị: MỘT luật với máy chủ — gọi `vnWeekRange` (src/shared/vn-date.ts:69), không `new Date(y, m, d)` của trình duyệt. */
  export function tuanXem(tu: string | null, homNay: string): { tu: string; den: string; truoc: string; sau: string; nhan: string } // nhan "28/09 – 04/10/2026"
  export interface MucO { loai: "BAN" | "CHUYEN"; id: string; gio: string; nhan: string; rutDuoc: boolean; version: number | null; href: string | null }
  export function luoiTuanXeBan(v: LichXeBanResponse, homNay: string, bayGioMs: number): {
    ngay: { k: string; thu: string; nhan: string; homNay: boolean }[];                      // "THỨ 2" … "CN", "28/09"
    hang: { xeId: string; bienSo: string; soChoNhan: string; trangThaiNhan: string | null; o: MucO[][] }[]; // "Xe 16 chỗ"; "Bảo dưỡng" khi trangThai = maintenance
    soLichBan: number;                                                                         // số KHUNG giao tuần (không đếm chuyến) — dòng "N lịch bận"
  }
  export function cauHoiRut(m: MucO, ngay: string): string   // "Rút lịch bận Bảo dưỡng 08:00–17:00 03/10? Xe sẽ xếp chuyến được trong giờ này."
  export function daiBanTrenLich(ds: readonly KhungBanLichDto[], ngay: string): { xeId: string; tuPhut: number; denPhut: number; nhan: string }[] // phút trong ngày VN, kẹp [0, 1440]
  export function cauLoiChongChuyen(e: KhungBanChongChuyenLoi["error"]): string // "Xe đang có 2 chuyến trùng: CX-0510-01 (09:00 05/10 → 11:00 05/10), …"
  ```
  Luật `gio` của một mục trong ô ngày D (cắt khung theo `[00:00 D, 00:00 D+1)` giờ VN): phủ trọn ngày → `"Cả ngày"`; bắt đầu trước D, kết thúc trong D → `"đến 07:00"`; bắt đầu trong D, kết thúc sau D → `"từ 23:00"`; cả hai trong D → `"06:30–16:00"`. Khung nhiều ngày hiện ở MỌI ô nó phủ. `rutDuoc = loai === "BAN" && !daRut && ketThucMs > bayGioMs`. Mục `CHUYEN`: `rutDuoc: false`, `href = /chuyen?id=<id>`, `nhan` = mã chuyến `CX-…` (không mã đơn, không tên khách) (chủ đồng ý 2/10 — câu 3.1).
  Bài test bắt buộc (`khung-ban-hien-thi.test.ts`, chạy cả `TZ=UTC node --test …` và `TZ=Asia/Ho_Chi_Minh node --test …`):
  - `tuanXem(null, "2026-10-02")` → `tu: "2026-09-28"`, `den: "2026-10-04"`, `nhan: "28/09 – 04/10/2026"`; `tuanXem("2026-10-04", …)` (Chủ nhật) → cùng tuần; `truoc`/`sau` lệch đúng 7 ngày.
  - Khung 23:00 CN 04/10 → 07:00 T2 05/10: tuần 28/09 có `"từ 23:00"` ở ô 04/10; tuần 05/10 có `"đến 07:00"` ở ô 05/10 (Review Focus 1 ở tầng màn).
  - Khung 00:00 D → 00:00 D+1 → `"Cả ngày"`, chỉ ở ô D. Khung 3 ngày → 3 ô (giữa là `"Cả ngày"`), `soLichBan` đếm 1.
  - Khung đã qua → `rutDuoc: false`; mục `CHUYEN` không có khoá `maDon`/`ten` (danh sách trắng).
  - `daiBanTrenLich` khung 23:00 D → 07:00 D+1: `ngay = D` → `{ tuPhut: 1380, denPhut: 1440 }`, `D+1` → `{ tuPhut: 0, denPhut: 420 }`.
  - `docFormKhungBan`: `denNgay` vắng/rỗng ⇒ lấy `ngay` (người chỉ ghi một ngày không phải làm gì thêm); `denNgay < ngay` → lỗi ô `denNgay`; thiếu `lyDo` → lỗi ô `lyDo`; khung đã qua → lỗi ô `denGio`.

**Màn — trang "Lịch xe bận" (`web/lich-xe-ban.ts`), làm ĐÚNG bản vẽ ở phần bề mặt:**
- Gọi `GET /api/van-chuyen/ban-xe?tu=` (Task 6 Step 3b). 403 ⇒ khối chặn + câu tiếng Việt theo khuôn trang Xe (bản vẽ thiếu — theo khuôn). Đang tải / chưa có xe / lỗi tải ⇒ khuôn `vc-empty` (bản vẽ thiếu).
- Đầu trang: tiêu đề "Lịch xe bận" (24px — `--fs-step-11`, `--font-display`) + dòng phụ `"<tuanXem.nhan> · <soLichBan> lịch bận"`; nút `‹` / "Tuần này" / `›` (`.btn` viền) đổi `?tu=` (dùng `tuanXem`, cập nhật URL bằng `history.replaceState`); nút **"Thêm lịch bận"** `.btn-accent` (san hô, như bản vẽ — tiền lệ "+ Chuyến mới"), chỉ khi `can(staff, "vehicle.manage")`.
- Form mở tại chỗ (bản vẽ trạng thái 2), lưới `auto-fit minmax(var(--w-xb-o), 1fr)` (khổ 390 tự xếp một cột): **Xe** (chọn, từ `xe[]`, nhãn `"<bienSo> · Xe <soCho> chỗ"`) · **Ngày** · **Đến ngày** (mặc định = Ngày) (chủ đồng ý 2/10 — câu 3.3) · **Từ** · **Đến** · **Lý do** = ô **chọn** từ `lyDo[]` (danh mục `BAN_XE`), giữ đúng vị trí/cỡ ô của bản vẽ (chủ đồng ý 2/10 — câu 3.2); nút **"Lưu"** `.btn-primary` + **"Đóng"** `.btn`. Ô gõ 16px. Lưu ⇒ `docFormKhungBan` → `POST /api/van-chuyen/xe/:xeId/ban` → thành công: đóng form, tải lại tuần. Lỗi (bản vẽ thiếu — theo khuôn khung lỗi đỏ `--c-danger-*`): 409 `khung_ban_chong_chuyen` → `cauLoiChongChuyen` + mỗi chuyến một dòng; 409 `khung_ban_chong_chuyen_csdl` / `khung_ban_vua_doi` → câu máy chủ + tải lại; 400 → lỗi theo ô.
- Lưới (thẻ trắng, cuộn ngang trong thẻ, `min-width: var(--w-xb-luoi)`; cột XE `var(--w-xb-xe)` **dính trái** khi cuộn — khổ 390 bản vẽ thiếu, theo khuôn `.dp-tl-nhan`): đầu cột "XE" + 7 cột `"THỨ 2"`/`"28/09"`; ô hôm nay nền `--c-surface-alt`. Hàng xe: biển số đậm + `"Xe 16 chỗ"`; xe `maintenance` thêm chip "Bảo dưỡng" (bản vẽ thiếu — chip có sẵn, tone `warn`).
- Thẻ mục `BAN` (nền `--c-xe-ban-bg`): dòng giờ (`gio`) + dòng lý do; nút ✕ chỉ khi `rutDuoc && can(vehicle.manage)`, `aria-label="Rút lịch bận <lý do> <giờ>"`. **Bấm ✕ = RÚT có hỏi, không xoá thẳng** (ADR-0055 A1: chỉ-thêm, rút một lần, khoá lạc quan — không hỏi chủ): mở `moBangTruot` (`web/bang-truot.ts:19`, khuôn hỏi xác nhận như `web/giay-to-ui.ts:211`) với `cauHoiRut`; xác nhận → `POST …/xe/:id/ban/:bid/rut { version }`; 409 `khung_ban_vua_doi_route` / `khung_ban_da_qua` → dải báo + tải lại tuần.
- Thẻ mục `CHUYEN` (chuyến đã xếp — chỉ có khi máy chủ trả `chuyen[]`): nền khác khung bận (`--c-surface-alt` + viền `--c-border`), dòng giờ + mã `CX-…`, là liên kết `/chuyen?id=`, **không ✕** (chủ đồng ý 2/10 — câu 3.1).
- Chú thích cuối thẻ: ô màu `--c-xe-ban-bg` "Xe bận · ô trống là xe rảnh" (+ ô "Chuyến đã xếp" khi có `chuyen[]` — câu 3.1).
- **Khác bản vẽ có chủ đích (ghi để chủ xem khi duyệt ảnh, không chặn):** phông nội dung Be Vietnam Pro thay Nunito (quyết định 30/9); "Lưu" dùng `.btn-primary` (nền nhạt + chữ navy, luật "MÀU THEO VAI" 2/10 ở `public/app.css`) thay nền navy đặc; dòng lý do dùng `--c-text` thay `#334155`; độ đậm theo `--fw-*` (ADR-0087). Nếu chủ muốn nút "Lưu" đặc như bản vẽ ⇒ thêm vai màu "nút chốt đặc" vào nhóm MÀU THEO VAI.
- Token (ánh xạ bản vẽ → app, DANH-GIA §5): dùng token có sẵn cho mọi màu/cỡ khớp (`--c-surface-alt`, `--c-text`, `--c-primary`, `--c-border`, `--c-surface`, `--c-text-muted`, `--c-accent`, `--fs-step-*`, `--s1…--s5`, `--radius-sm/md`, `--tap-min`, `--w-main`, `--ls-eyebrow`). Token MỚI nhóm "Riêng" (ghi "theo bản vẽ Quản lý lịch xe bận 2/10 — bản vẽ = duyệt màu"): `--c-xe-ban-bg: #fef3c7`, `--gap-xb-the: 6px`, `--gap-xb-xe: 2px`, `--pad-xb-btn: 20px`, `--radius-xb-lg: 4px`, `--w-xb-xe: 150px`, `--w-xb-luoi: 860px`, `--h-xb-o: 72px`, `--w-xb-o: 160px`, `--xb-x: 24px` (nút ✕ — vùng chạm mở rộng bằng `::after` tới `--tap-min` nếu axe báo, không đổi hình), `--xb-lg-o: 14px`. Không nhập CSS `_ds` của bản vẽ.

**Màn — "Điều phối xe" (`web/dieu-phoi.ts`), theo khuôn có sẵn, KHÔNG chờ vẽ:**
- Máy tính: trên `.dp-tl-duong` của hàng mỗi xe (`:193`), thêm khối `.dp-tl-ban` từ `daiBanTrenLich(l.khungBanXe, l.ngay)` đặt bằng `viTri(…)` có sẵn (`:188`) — nền `--c-xe-ban-bg` (cùng màu "Xe bận" của trang tuần) + nhãn lý do; nằm dưới khối chuyến (`z-index` token có sẵn), `aria-label` "Xe bận <giờ> · <lý do>".
- Điện thoại (thẻ xe): một dòng "Xe bận 08:00–17:00 · Bảo dưỡng" với biểu tượng `ban` có sẵn trong `web/icons.ts` (không có biểu tượng cờ lê — không vẽ biểu tượng mới).
- Hai cảnh báo `GIO_LAI_VUOT`, `CHUYEN_DAI_CAN_NGHI`: KHÔNG DOM mới — tự vào "Cần xử lý" qua `viecCanXuLy` với biểu tượng `clock` (Task 4 Step 3, `ICON_CANH_BAO` `src/shared/dieu-phoi-man.ts:145`). Sau tạo/sửa chuyến có `canhBaoLenh` ⇒ dải `dai("warning", …)` theo khuôn `canhBaoXep` (`web/dieu-phoi.ts:454-455`), chỉ nhắc.
- Kế toán / Bán hàng (`trip.view`, không `vehicle.manage`): thấy dải bận, không nút, không mục thanh bên "Lịch xe bận" (câu 3.4).

- [ ] **Step 1:** Test đỏ `src/shared/khung-ban-hien-thi.test.ts` (các ca bắt buộc ở trên) → `TZ=UTC node --test src/shared/khung-ban-hien-thi.test.ts` ĐỎ → cài `khung-ban-hien-thi.ts` → xanh ở cả `TZ=UTC`, `TZ=Asia/Ho_Chi_Minh` và `TZ=America/Los_Angeles`. P16: đổi `tuanXem` sang `new Date(homNay)` + `getDay()` (giờ máy) → lượt `TZ=America/Los_Angeles node --test src/shared/khung-ban-hien-thi.test.ts` ĐỎ (`"2026-10-05"` thành 17:00 Chủ nhật giờ máy ⇒ sai tuần; hai lượt UTC/VN vẫn xanh — vì vậy BẮT BUỘC chạy lượt múi âm) → hoàn nguyên. Commit `"Lịch xe bận: luật hiển thị lưới tuần, form, dải bận (thuần)"`.
- [ ] **Step 2:** Trang `public/lich-xe-ban.html` + `web/lich-xe-ban.ts` theo các gạch đầu dòng ở trên; `PAGES`, `build:web`, `web/shell.ts`, `web/account.ts`, token + `.xb-*` trong `public/app.css`. Chạy `npm run typecheck && npm run build:web && node --test src/shared/sw-policy.test.ts` (bài `PAGES` ↔ `build:web`) và `npm run test:e2e -- pwa` (trang mới + quét token). Commit.
- [ ] **Step 3:** Dải bận + dòng "Xe bận" + dải `canhBaoLenh` trên Điều phối xe / sửa chuyến. `npm run build:web`. Commit.
- [ ] **Step 4: Kịch bản Chrome** `lich-xe-ban-smoke.mjs` (khuôn `trang-chu-smoke.mjs`: `startEnv`, `ACCOUNTS`), khổ **1040 + 390**, thứ tự **Kế toán trước** (mở `/lich-xe-ban` → khối chặn tiếng Việt, thanh bên không có "Lịch xe bận"; `/dieu-phoi` thấy dải bận, không nút) **rồi Quản trị** (cookie chung): tuần có khung 23:00 CN → 07:00 T2 hiện "từ 23:00" / "đến 07:00" ở hai tuần; Thêm lịch bận (chọn lý do, Đến ngày) → thẻ hiện; ghi chồng chuyến → khung lỗi liệt kê `CX-…`; ✕ → hộp hỏi → Rút → thẻ mất; cột XE dính trái khi cuộn ở 390; axe không lỗi mới. Ảnh vào `docs/evidence/<ngày>-dot-3/`. Chạy lại `trang-chu-smoke.mjs` (thanh bên 18 / 24) và `dot-c-smoke.mjs` (trang Tôi — `web/account.ts`, theo `docs/CHANGE-GUIDE.md:910`). Thêm hàng vào bảng của `web/CLAUDE.md`. Commit.

**Bản vẽ đã nhận 2/10:** `docs/design/van-chuyen-dot-3-7/Quản lý lịch xe bận.dc.html` (dự án Claude Design `f0f47482-c51a-4232-b5c0-d924871ce294`; đánh giá đối chiếu: bảng lệch + token ở mục "Tự rà sau cập nhật 2/10").

<details><summary>LỆNH VẼ cũ (1/10 — đã thay bằng bản vẽ 2/10, giữ để tra)</summary>

> Vẽ cho app "Island Booking System" (Công ty TNHH Tour Đảo, PWA trên iPhone + máy tính), dùng đúng hệ thiết kế hiện có (phông Be Vietnam Pro, token màu của app). Hai khung: **điện thoại 390px** và **máy tính 1040px**. Chữ tiếng Việt có dấu, không chữ tiếng Anh.
>
> **Màn A — "Chi tiết xe" (đã có), thêm khối "Lịch xe bận"** đặt dưới khối Giấy tờ xe. Người dùng: Quản trị.
> - Trạng thái 1 — có lịch: mỗi dòng "Bảo dưỡng · 08:00 03/10 → 17:00 03/10" kèm chip trạng thái "Đang bận" (đỏ) / "Sắp tới" (vàng); nút "Rút" ở cuối dòng. Dưới cùng "Lịch sử (5)" thu gọn — mở ra các dòng "Đã rút" / "Đã qua" màu xám.
> - Trạng thái 2 — chưa có lịch: một dòng nhạt "Xe chưa có lịch bận." và nút "Ghi lịch bận".
> - Trạng thái 3 — hộp "Ghi lịch bận": ô "Từ ngày", "Từ giờ", "Đến ngày", "Đến giờ", chọn "Lý do" (Bảo dưỡng, Đăng kiểm, Sửa chữa, Khác); nút "Lưu" và "Huỷ". Dòng nhắc nhỏ: "Trong giờ này máy không cho xếp chuyến cho xe."
> - Trạng thái 4 — lỗi trùng chuyến: trong hộp hiện khung đỏ "Xe đang có chuyến CX-0310-02 lúc 09:00 03/10 → 11:00 03/10 — dời hoặc đổi xe chuyến đó trước." (có thể nhiều chuyến, mỗi chuyến một dòng bấm được).
> - Trạng thái 5 — hỏi xác nhận rút: "Rút lịch bận Bảo dưỡng 08:00–17:00 03/10? Xe sẽ xếp chuyến được trong giờ này."
> - Xe đã ngừng dùng: khối chỉ xem, không nút.
>
> **Màn B — "Điều phối xe" (đã có), thêm DẢI BẬN trên dòng thời gian theo xe.**
> - Máy tính: trên hàng của xe, một dải nền gạch chéo từ 08:00 tới 17:00, chữ "Bảo dưỡng" trong dải; khối chuyến không bao giờ nằm đè dải. Khung qua nửa đêm (23:00 hôm nay → 07:00 mai): dải chạy tới mép phải ngày hôm nay, và hôm sau bắt đầu từ mép trái.
> - Điện thoại (thẻ "Xe"): trong thẻ mỗi xe một dòng "Xe bận 08:00–17:00 · Bảo dưỡng" có biểu tượng cờ lê.
> - Cột "Cần xử lý": hai loại nhắc mới màu vàng, biểu tượng đồng hồ: "Tài xế lái quá giờ tối đa trong ngày — Nguyễn Văn A: 8 giờ 10 phút (CX-0310-03)" và "Chuyến dài — nhớ cho tài xế nghỉ giữa chuyến (CX-0310-04, 4 giờ 30 phút)". Đây chỉ là nhắc, không có nút chặn.
> - Kế toán xem cùng màn (chỉ xem): thấy dải bận, không nút.

</details>

---

### Task 11: Tài liệu, nhật ký phiên bản, kiểm độc lập

**Files:**
- Modify: `docs/SYSTEM-DESIGN.md` (§5 bảng `vc_unavailability`; §6 luồng ghi lịch xe bận; §7 ba route), `docs/CHANGE-GUIDE.md` (bẫy: "đọc khung bận phải lọc `subject`"; "thêm cột chính sách = sửa câu chèn + thân bắt buộc + e2e GOC"), `src/shared/changelog.ts` + `src/shared/app-info.test.ts` (bản `<X.YY>` = lớn nhất ở `origin/main` + 1 lúc gộp — L2), sổ thi công

- [ ] **Step 1:** Mục nhật ký phiên bản (lời thường): "Trang mới Vận chuyển › Lịch xe bận: Quản trị xem lịch bận của mọi xe theo tuần, thêm lịch xe vào xưởng (bảo dưỡng, đăng kiểm, sửa chữa) — trong giờ đó máy không cho xếp chuyến cho xe; rút lịch bận khi xe ra xưởng sớm. Điều phối xe hiện dải 'Xe bận' trên hàng của xe. Lịch điều phối nhắc khi tài xế lái quá 8 giờ một ngày hoặc chuyến dài quá 4 giờ (chỉ nhắc, không chặn); Toàn quyền đổi hai con số ở Chính sách điều phối." (Câu chữ theo chủ trả lời câu 3.1–3.4: nếu 3.1 = có ⇒ thêm "trang tuần hiện cả chuyến đã xếp".)
- [ ] **Step 2:** Chạy đủ: `npm test` · `npm run typecheck` · `npm run test:e2e` · `node scripts/audit-invariants.mjs --db local`. Ghi số liệu vào sổ.
- [ ] **Step 3:** Gọi **người kiểm độc lập chỉ đọc** (`nguoi-kiem-doc-lap`) với: kế hoạch này, ADR-0055, ADR-0053 D9.1–D9.3, sổ thi công, danh sách commit. Yêu cầu kiểm riêng: (a) hình bảng khớp D9.1 (cột, `CHECK`, khoá lạc quan, nhóm lý do theo đối tượng); (b) mọi câu đọc lọc `VEHICLE` (kể cả câu tuần của `GET /ban-xe`); (b′) `GET /ban-xe`: 403 trước 400 cho người thiếu `vehicle.manage`, `chuyen[]` chỉ danh sách trắng (không mã đơn, tên khách, tài xế) và chỉ khi `can(trip.view)`; (c) ADR tiêu chí 1–4, 8 chạy lại được; (d) không mã mới trong `MA_GIU`/`MA_LUAT_PHA_LE` (trừ khi chủ duyệt "Cần chủ" câu 1); (e) không sửa `0041`/`0042`; (f) sổ hàng rào có ngày cho cả mười dòng. Chỉ báo "đạt" dựa trên báo cáo đó + test.
- [ ] **Step 4:** Commit tài liệu; báo điều phối nhánh + lệnh cho chủ: `npm run day-len -- <nhánh>` rồi `npm run trien-khai` (đổi app, có migration).

---

## Self-review (đã chạy khi viết)

- **Phủ đặc tả:** A1 bảng (Task 1) · A2 (i) hai lớp (Task 1 trigger, Task 2 + 7 máy chủ) · A2 (ii) hai lớp (Task 1, Task 6) · A3 không tự đổi `status` (không task nào ghi `vc_vehicle.status`) · A4 quyền (Task 6 route `vehicle.manage`; Task 7 `/lich` `trip.view`; DTO tài xế Task 7) · A5 route (Task 6, 7) · A6 nhật ký (Task 6) · B1 (Task 1, 5) · B2 (Task 3) · B3 (Task 4, 7) · B4 việc ngoài app (không phải mã — nhắc trong nhật ký phiên bản "chỉ nhắc") · hệ quả 1–10 (Task 9) · tiêu chí 1–4, 8 (Task 1, 6, 7, 3, 11); tiêu chí 5–7 thuộc VK2-C (đã có). D9.1: `driver_party_id`, `version`, `CHECK` một đối tượng, nhóm lý do theo đối tượng (Task 1); B9.3 một hàm (Task 2).
- **Tên thống nhất:** `KhungBanVao`/`khungBan`/`khungBanVao`; `canhBaoGioLai`/`CanhBaoGioLai`/`NHAN_CANH_BAO_GIO_LAI`; `KetQuaTaoSua.nhacGioLai`; `khungBanXeTrongKhoang`; `loiRangBuocKhungBan`; DTO `KhungBanXeDto`, `KhungBanLichDto`.
- **Điều chưa chắc (người thi công đo lại):** tên hàm dựng mẫu trong `dieu-phoi-kiem.test.ts` / `dieu-phoi-lich-chung.test.ts`; bộ tra chữ SQL của `defineSql` (Task 5 Step 1); cách dựng chuyến RUNNING trong test migration (TC-K1b); bài kiến trúc có đọc migration qua biến môi trường hay không (Task 9 mục 9).

## Tự rà sau cập nhật 2/10

Đối chiếu từng mục §4 của bản đánh giá bản vẽ Đợt 3 (S1–S10):

| Mục | Nội dung | Áp ở | Ghi chú |
|---|---|---|---|
| S1 | Route tuần `GET /api/van-chuyen/ban-xe?tu=`, `vehicle.manage` 403 trước 400, `LichXeBanResponse`, `ChuyenXeBanDto` danh sách trắng, dòng `route-access`, bài khoá DTO, e2e khung qua nửa đêm CN→T2 | Task 6 Step 3b (+ e2e bước 1, 7b; Files) | Không thêm câu SQL mới: dùng `khung_ban_xe_trong_khoang` (đã lọc `VEHICLE`, bài Review Focus 4 vẫn phủ) + `tripsTouching` + `xeDieuPhoi`. Tuần chuẩn về thứ Hai thay vì 400 khi `tu` không phải thứ Hai (tự chốt bề mặt). Dấu 3.1, 3.4 |
| S2 | Bỏ khối Chi tiết xe; trang mới `public/lich-xe-ban.html` + `web/lich-xe-ban.ts`; `PAGES`, `build:web`; mục thanh bên + trang Tôi; số đếm `trang-chu-smoke` | Task 10 Files, Step 2, Step 4; Cấu trúc tệp | Số dòng đo lại trên mã thật (DANH-GIA ghi `:541/:557/:873`, "/audit 20→21" — sai): `ADMIN_NAV :627-631`, `:642`, `:643`, `:984`, `:1000`, `:1122` (17→18), `:1010` Toàn quyền 23→24. Không làm liên kết "Xem lịch bận" ở Chi tiết xe (bản vẽ không có) |
| S3 | Hàm thuần `luoiTuanXeBan`, `MucO`, cắt khung theo ngày VN, "Cả ngày", `rutDuoc`, `soLichBan`; test `TZ=UTC`; `FormKhungBan` theo 3.3 | Task 10 Interfaces + Step 1 | Thêm `tuanXem` gọi `vnWeekRange` (có sẵn) để màn và máy chủ dùng MỘT luật tuần. Bỏ nhãn "Cả ngày (tiếp)" (thừa — ô giữa đã là "Cả ngày"). Bỏ `dongKhungBan` (chỉ phục vụ Màn A). Phương án một-ngày (23:59 → 00:00 hôm sau) chỉ áp nếu chủ bác 3.3 — không viết sẵn |
| S4 | ✕ = Rút có hỏi, `aria-label`, chỉ khi `rutDuoc` + `can`, gửi `version`, 409 → tải lại; thẻ chuyến không ✕, bấm mở `/chuyen?id=` | Task 10 (thẻ `BAN`, thẻ `CHUYEN`) | Hộp hỏi dùng `moBangTruot` (`web/bang-truot.ts:19`, khuôn `web/giay-to-ui.ts:211`) — không có thành phần `confirmation-dialog` trong mã |
| S5 | Dải bận Điều phối xe + dòng "Xe bận" điện thoại + hai cảnh báo giờ lái theo khuôn, bỏ "dừng DOM chờ vẽ" | Task 10 mục "Điều phối xe", Step 3 | `web/icons.ts` không có cờ lê ⇒ dùng `ban` có sẵn. `ICON_CANH_BAO` `clock` đã có ở Task 4 Step 3. `canhBaoLenh` hiện theo khuôn `canhBaoXep` |
| S6 | Lý do: khuyến nghị giữ nguyên (không cột ghi chú); chủ muốn ghi chú ⇒ dừng Task 1, soạn ADR | Task 1 Step 3 (cổng 3.2) | Bảng giữ đúng D9.1 |
| S7 | `kiemKhungBanMoi` thân `{batDau, ketThuc}` giữ nguyên | Task 6 (không đổi) | Máy chủ đã nhận khung nhiều ngày; chỉ form đổi |
| S8 | Chữ: "Thêm lịch bận", "Đóng", tiêu đề "Lịch xe bận", chú thích "Xe bận · ô trống là xe rảnh" (+ "Chuyến đã xếp") | Task 10 | Lệnh vẽ cũ thu vào khối `<details>`; câu hỏi rút giữ làm `cauHoiRut` |
| S9 | Màu nút: "Thêm lịch bận" `.btn-accent`, "Lưu" `.btn-primary`, ‹ › Tuần này Đóng `.btn` viền | Task 10 + mục Cập nhật 2/10 | Ghi rõ lệch bản vẽ ở "Lưu" (luật màu theo vai) để chủ xem khi duyệt ảnh |
| S10 | Kịch bản Chrome `lich-xe-ban-smoke.mjs` 1040 + 390, Kế toán (403) trước Quản trị; hàng `web/CLAUDE.md` | Task 10 Step 4 | Thêm chạy lại `trang-chu-smoke.mjs` và `dot-c-smoke.mjs` (trang Tôi đổi — `docs/CHANGE-GUIDE.md:910`) + `npm run test:e2e -- pwa` (Step 2) |
| §5 | Ánh xạ token | Task 10 mục "Token" | 11 token mới nhóm "Riêng", khối `.xb-*` sau dấu mốc PWA |

Không áp: không có mục nào bị bỏ. Ngoài §4: Task 11 Step 1 (câu nhật ký phiên bản) và Step 3 (b′ — người kiểm soi route tuần) đã sửa theo trang mới.
