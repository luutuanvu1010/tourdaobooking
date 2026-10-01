# Vận chuyển còn lại — Đợt 6: Tài xế đối tác dùng app, Từ chối chuyến, Báo bận (ADR-0053) — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Mức chi tiết: GIAO DIỆN (interface)** theo lộ trình mẹ `2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` L3 — bảng, cột, trigger, chữ ký hàm, route, ô quyền, test bắt buộc; **không** viết thân hàm. Người thi công **đo lại mã thật lúc nhận** (Đợt 3, 4, 5 sẽ đổi tệp, số dòng dưới đây đo ở HEAD `0ba370d6` ngày 2026-10-01).

> ⚠ **CỬA MỘT CHIỀU** (ADR-0053 "Cửa một chiều"): mỗi lần tài xế đối tác — người NGOÀI công ty — đã thấy tên, năm sinh, SĐT khách thì không lấy lại được. **Người kiểm độc lập chỉ-đọc BẮT BUỘC** (CLAUDE.md §3: quyền + dữ liệu cá nhân + dữ liệu mới) trước khi chủ `day-len`; chủ thử bằng **một tài khoản tài xế đối tác thật trên iPhone** trước khi báo nhà xe dùng.

**Goal:** Tài xế nhà xe đối tác dùng "Cuốc của tôi" như tài xế công ty (thấy khách chỉ trong khung D7.2), được Từ chối chuyến trước hạn 12 giờ (khoá dính theo cặp), được tự Báo bận; văn phòng thấy khung bận khi xếp.

**Architecture:** Mọi dữ liệu mới thuộc `van-chuyen` (`vc_`): hai cột trên `vc_trip_driver`, bảng `vc_refuse_deadline`, cột chính sách `refuse_lead_minutes`, mở dòng `subject='DRIVER'` của `vc_unavailability` (bảng Đợt 3 tạo). Luật lõi ở cả trigger lẫn máy chủ; lệnh Từ chối là MỘT `db.batch` (cổng → nhật ký → sự kiện → đóng dòng lái). Khung thấy khách là MỘT hàm thuần ở `src/shared/`. Mở cho tài xế đối tác **chỉ bằng ô quyền** — không route tài xế mới (trừ Từ chối, Báo bận), không đổi cổng.

**Tech Stack:** Cloudflare Worker + D1, TypeScript, `web/*.ts` dựng bằng `h()`, `node --test`, e2e `tests/e2e/*.mjs`, kịch bản Chrome.

**Spec:** `docs/adr/ADR-0053-dieu-phoi-luot-3-tai-xe-doi-tac.md` (accepted 2026-09-30) — đọc kèm ADR-0052 D4.3/D5b/D6.2, ADR-0055 VK2-A, ADR-0057 T2, ADR-0048 D2, ADR-0049 D1–D3; trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`.

---

## 0. Phụ thuộc cứng (KHÔNG nhận đợt này khi chưa đủ)

| Cần | Từ | Vì sao | Kiểm lúc nhận |
|---|---|---|---|
| Cổng `THIEU_GIA`, lô đổi xe/nhà xe/tuyến **tự đảo + chụp lại giá** (`keHoachChiPhiKhiDoi` + `cauChiPhi`, `src/modules/van-chuyen/tien-xe.ts` — kế hoạch 04 :997, :1002), route `POST …/chuyen/:id/chi-phi/chup-lai`, `…/chi-phi/gia-thoa-thuan` (04 :1071-1072), ô `transport.cost.*` | **Đợt 4 T2** (ADR-0057 T2) | D8.5a chỉ KIỂM hành vi giá khi giao lại; không tự viết luật giá (ADR-0053:129) | `grep -rn "THIEU_GIA\|keHoachChiPhiKhiDoi" src/` có; e2e `tests/e2e/tien-xe-thue.mjs` xanh trên `main` |
| Bảng `vc_unavailability(id, subject, vehicle_id, driver_party_id, start_ms, end_ms, start_at, end_at, reason_code, withdrawn_at, withdrawn_by, version, WHO)` (kế hoạch 03 :138); trigger chặn ghi `DRIVER` **`vc_unavailability_driver_closed`** (03 :378); trigger chỉ-thêm `vc_unavailability_append_only`; ánh xạ lỗi CSDL `loiRangBuocKhungBan` + thân route `kiemKhungBanMoi`, `KHUNG_XE_TOI_DA_NGAY = 31` (`src/modules/van-chuyen/khung-ban.ts`, 03 :926-933); hàm thuần `chongNuaMo`, `nhanKhoangGio`, `khungTrongNgay` (`src/shared/khung-ban.ts`, 03 :462-467); `KiemTaoSuaChuyenVao.khungBan?: KhungBanVao[]` với `doiTuong: "VEHICLE" \| "DRIVER"` → `TRUNG_GIO_TAI_XE` (03 :469, :568-573); `NHOM_LY_DO` tám nhóm có `BAN_XE` (03 :576); cột chính sách `duty_day_max_minutes`, `trip_no_break_max_minutes` + bài "câu chèn chính sách đủ cột" (03 :878) | **Đợt 3 VK2-A** | D9 dùng CHUNG bảng — **cấm hai bảng khung bận** (ADR-0053 D9.1) | `grep -n "vc_unavailability_driver_closed" migrations/*.sql` |
| Ô `trip.transfer` (kế hoạch 05 :266 — cột `DRIVER_PARTNER` = `none`), đề nghị nhờ đón (`vc_transfer_request`, LC-14), các sự kiện `TRANSFER_*` đã nối vào `LOAI_SU_KIEN_CHUYEN` (05 :176) | **Đợt 5 A-1** (ADR-0052 D4) | D7.1 mở ô này cho `DRIVER_PARTNER`; D7.4 nhờ đón chéo | `grep -n '"trip.transfer"' src/shared/permissions.ts` |
| Ô `trip.passenger.add` (05 :472 — `DRIVER_PARTNER` = `none`) + route tài xế bổ sung tên, sự kiện `PASSENGER_NAMED` (05 :470) | **Đợt 5 A-1b** (ADR-0052 D5b) — **phụ thuộc cứng** cùng A-1 | D7.1 "chỉ mở nếu A-1b đã duyệt" — A-1b đã duyệt; ô và route chưa có thì không mở được. Nếu buộc phát hành trước A-1b: bỏ ô này khỏi Task 4, ghi nợ có hạn, mở ở bản sau A-1b | `grep -n '"trip.passenger.add"' src/shared/permissions.ts` |
| Hàm tiêm `ctx.baoThayDoiChuyen({ tripId, requestId })` (kế hoạch 02 :38, :779); `src/shared/tin-chuyen.ts`: `HANH_DONG_TIN_CHUYEN`, `loaiCho`, `tinChuyenCho`, `LoaiTinChuyen` (02 :97-107, :265-309); bài quét "mọi route POST/PUT lệnh chuyến gọi `baoThayDoiChuyen`" (02 :980-984) | **Đợt 2** (ADR-0052 D6.2) | D7.5 tin tự tới tài xế đối tác; D8.4 bước 5 tin Từ chối | `grep -n "baoThayDoiChuyen" src/router.ts` |

Tên ở bảng trên và các khối "Consumes" lấy từ kế hoạch con 02, 03, 04, 05 (cùng thư mục, đối chiếu 2026-10-01). Đó là tên **kế hoạch**, chưa phải mã đã gộp: người thi công `grep` lại trên `main` lúc nhận; lệch thì sửa tên trong tệp này (một commit tài liệu) trước Task 1.

**Bài của đợt trước sẽ đổi có chủ đích ở đợt này** (sửa trong CÙNG task, ghi vào tệp đề xuất luật):
- `dieu-phoi-kieu.test.ts` "đúng tám nhóm" (03 :576) → **mười nhóm** (Task 1).
- Bài người nhận tin "chỉ `DRIVER_PARTNER` không nhận" (02 :150-153) và "chỉ-`DRIVER_PARTNER` không nhận gì" (05 :390) → tài xế đối tác đang lái **có** nhận (Task 4).
- Ghim `DRIVER_PARTNER` `trip.transfer`/`trip.passenger.add` = `none` (05 :266, :472) → `assigned` (Task 4).
- Bài "câu chèn chính sách liệt kê đủ cột" (03 :878, `chinh-sach.test.ts`) — thêm `refuse_lead_minutes` vào `INSERT_DISPATCH_POLICY` + `kiemChinhSachMoi` (Task 2).
- `MAU` của `thu-tu-lo.test.ts` (dựng lại sau Đợt 4, 5) — thêm mẫu `loTuChoi` và nhánh có `REFUSE_DEADLINE_INSERT` (Task 3, 5).

## 1. Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao / loại |
|---|---|---|---|
| P6-1 | Q-L3-B (tài xế công ty "trong ngày chạy", vế xuất bến từ ngày chạy) | **ĐÃ CÓ trong mã** — `trongNgayChay` `src/shared/dieu-phoi-kiem.ts:420`, bài TC-18/Q-L3-B `dieu-phoi-kiem.test.ts:313-336`. Đợt này **chỉ thêm vế hạn Từ chối** cho tài xế đối tác, giữ nguyên hành vi `DRIVER` | đo mã |
| P6-2 | Biên đúng-bằng-hạn: D8.4 cho Từ chối khi `bây giờ ≤ hạn`; D7.2 cho thấy khách khi `bây giờ ≥ hạn` ⇒ tại **đúng mili-giây hạn** cả hai đúng = kẽ "xem rồi trả" mà Q1(a) chặn | **Siết:** thấy khách khi `bây giờ > hạn` (nghiêm); Từ chối khi `bây giờ ≤ hạn`. Hai khoảng rời nhau | siết (Điều 9.4 cho phép); báo chủ một dòng ở "Cần chủ"-thông tin, không chặn |
| P6-3 | Hàng ghim `DRIVER_PARTNER` | Ma trận nay **10 cột** (có `HR`); hàng đã có **4** ngoại lệ (`feedback.submit`, `feedback.view`, `party.document.view`, `assistant.ask`). Ghim mới = **6 ô mở mới + 4 cũ = 10 ô có tên** (ADR ghi "9" vì lúc soạn chưa có `assistant.ask`) | đo mã `permissions.test.ts:336-360` |
| P6-4 | Hai ô mới `trip.refuse`, `unavailability.self` | Thêm vào **mọi** bài ghim cả hàng: `DRIVER` (= `none`), `DRIVER_PARTNER` (`assigned`/`own`), `HR` (= `none`) | bài ghim liệt kê từng ô — quên là đỏ |
| P6-5 | Ghi hạn Từ chối cho **mọi** cặp (cả tài xế công ty) | `van-chuyen` không biết quyền của hồ sơ; hàm khung bỏ qua vế hạn với `DRIVER`. Ghi đồng loạt = một luật, migration gieo cũng đồng loạt | đơn giản, đúng G3-7 |
| P6-6 | Độ dài tối đa một khung bận | **Mở rộng** `kiemKhungBanMoi` + hằng của Đợt 3 (`src/modules/van-chuyen/khung-ban.ts`, 03 :929-930, K7 "14 ngày là việc Đợt 6 — sửa hằng") theo `subject`: thêm `KHUNG_TAI_XE_TOI_DA_NGAY = 14` cạnh `KHUNG_XE_TOI_DA_NGAY = 31`; không bắt đầu trong quá khứ. **Không** tạo hàm/hằng thứ hai | một hàm, hai hằng có tên |
| P6-7 | `EXTERNAL_PERMISSIONS`, trigger LC-1/LC-1b | **KHÔNG đổi** — không thêm mã quyền (ADR-0053 D7.1; CLAUDE.md §10 chỉ áp khi thêm mã quyền bên ngoài) | đọc ADR |
| P6-8 | Mốc "thấy khách từ …" hiện trên màn | Máy chủ trả khoá `thayKhachTu` (giờ VN) cùng `hanTuChoi`, `tuChoiDuoc` — màn không tự tính | một hàm khung |
| P6-9 | Giờ hiện tại của trigger B8.3 | Máy chủ là nguồn (một `bayGioMs` mỗi request, so trong câu ghi có điều kiện); trigger so giờ CSDL chỉ là lưới thứ hai | Global Constraints; Task 0 kiểm khả thi |

## Global Constraints

(Chép từ lộ trình mẹ, đúng nguyên văn áp cho đợt này — mọi task ngầm kèm mục này.)

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`PLANNED`, `REFUSED`, `TU_CHOI_CHUYEN`, `BAN_TAI_XE`…).
- Tiền: tài xế đối tác **không bao giờ** thấy số tiền nào (ADR-0048 D2) — bài ghim: mọi ô tiền cột `DRIVER_PARTNER` = `none`.
- Ngày dân sự giờ Việt Nam (`vnToday`); dấu thời gian ISO UTC; MỘT mốc giờ mỗi request (`toISOString()` của máy chủ).
- Không xoá cứng; `vc_refuse_deadline`, `vc_unavailability` không `DELETE`; khung bận đổi = rút + ghi mới.
- Migration chỉ thêm tệp mới; số = lớn nhất trong `migrations/` của `main` **và mọi nhánh chưa gộp** + 1 (L2 lộ trình); bảng/cột mới → `docs/data-dictionary.json` + `npm run dict`.
- Module chỉ import qua `index.ts`; `src/shared/` và `web/` không import `src/modules/`; `orders` KHÔNG import `van-chuyen`.
- Lệnh chuyến là MỘT `db.batch`: cổng → nhật ký → câu có dấu lệnh → trạng thái cuối (`src/modules/van-chuyen/thu-tu-lo.test.ts`).
- Mỗi ô `MATRIX` mới phải được một route máy chủ hỏi **trong cùng bản phát hành**; thêm ô vào hàng ghim `DRIVER_PARTNER` = **NỚI** ⇒ tệp đề xuất luật, chủ duyệt (Điều 9.4). ADR-0053 đã duyệt NỘI DUNG nới; việc **sửa bài ghim/sổ hàng rào** vẫn trình chủ theo khuôn (tiền lệ ADR-0048/0049).
- Hàng rào mới (trigger B8.2–B8.4, B9.2–B9.4, bài khung thấy khách, bài ghim mới) → dòng `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- Tên, năm sinh khách chỉ ở chi tiết chuyến văn phòng + DTO tài xế trong khung; SĐT liên hệ chỉ DTO tài xế; nhật ký/tin/Bảng tin không ghi tên, SĐT, biển số trong `detail`; `place_key` không hiển thị.
- Giao diện: không `innerHTML`; CSS chỉ token; ô gõ 16px; ẩn/hiện theo `can()`; kịch bản Chrome 390 + 1040; **màn mới (V15) chờ bản vẽ Claude Design**.
- Mỗi đợt: `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, mục nhật ký phiên bản `src/shared/changelog.ts` + `src/shared/app-info.test.ts`.
- Lệnh cấm AI tự chạy (CLAUDE.md §8) giữ nguyên; chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai`.

## Review Focus

1. **Từ chối đúng lúc văn phòng đổi tài xế** (lộ trình dòng 1) ⇒ đúng một bên 200, bên kia 409 `stale`, đúng MỘT dòng nhật ký, không dòng lái mở thừa, hạn của cặp không bị tạo đôi. Bài: Task 5 (route, tiêm chen giữa) + Task 8 (e2e song song).
2. **Ranh giới giờ VN quanh nửa đêm + hạn = xuất bến − 720 phút** (lộ trình dòng 3): đủ ca tiêu chí 3 ADR (06:00 / 14:00 / 23:30 qua nửa đêm / xuất bến sớm / xuất bến trong ngày trước hạn / tài xế công ty) + ca **đúng mili-giây hạn** (P6-2) + hạn rơi sang ngày hôm trước (chuyến 06:00 ⇒ hạn 18:00 D−1, không lệch 7 giờ UTC). Bài: Task 1 (hàm thuần, mốc ms cố định theo `+07:00`).
3. **Dời chuyến muộn hơn sau khi đã qua hạn** ⇒ lệnh dời 200, hạn không tăng, Từ chối vẫn 409, khung thấy khách không đổi (khoá dính). Bài: Task 2 (trigger) + Task 5 (route).
4. **Tài xế đối tác dò id** (chuyến người khác, khung bận người khác, đề nghị nhờ đón) ⇒ 404, không lộ dữ liệu. Bài: Task 5, 6, 8.
5. **Báo bận thành đường vòng qua hạn Từ chối** (ghi khung chồng chuyến đang xếp) ⇒ 409 + `RAISE`. Bài: Task 2 + Task 6.

---

## Bản đồ tệp

| Tệp | Việc |
|---|---|
| Create `migrations/00NN_tai_xe_doi_tac_chuyen.sql` | cột `vc_trip_driver`, `vc_refuse_deadline` + trigger + gieo, `refuse_lead_minutes`, lý do 2 nhóm, bỏ trigger chặn `DRIVER` của Đợt 3, trigger B9.2–B9.4 |
| Create `src/migrations-tu-choi-ban.test.ts` | bài lớp CSDL (schema thật, `node:sqlite`) |
| Modify `src/shared/dieu-phoi-kiem.ts` (+ `.test.ts`) | `hanTuChoiMoi`, `trongKhungXemKhach`, `tuChoiDuoc`, `mocThayKhach`; `kiemXep` nhận `khungBan` (`doiTuong: "DRIVER"`) |
| Modify `src/modules/van-chuyen/khung-ban.ts` (Đợt 3) (+ `.test.ts`) | `kiemKhungBanMoi` theo `subject`, `KHUNG_TAI_XE_TOI_DA_NGAY`; nhánh tài xế trong `loiRangBuocKhungBan` |
| Modify `src/shared/tin-chuyen.ts` (Đợt 2) (+ test) | `trip_driver_refused` vào `HANH_DONG_TIN_CHUYEN`, nhánh `loaiCho`, dòng câu |
| Modify `src/shared/dieu-phoi-kieu.ts` (+ `dieu-phoi-kieu.test.ts`) | `NHOM_LY_DO` nối thêm `TU_CHOI_CHUYEN`, `BAN_TAI_XE` (mười nhóm); `LOAI_SU_KIEN_CHUYEN` nối thêm `DRIVER_REFUSED` |
| Modify `src/shared/permissions.ts` (+ `permissions.test.ts`, `cong-quyen.test.ts`) | mở cột `DRIVER_PARTNER` (Task 4); ô `trip.refuse` (Task 5), `unavailability.self` (Task 6) — mỗi ô vào cùng task với route hỏi nó |
| Modify `src/shared/start-page.ts` (+ test) | `coCuocCuaToi` gồm `DRIVER_PARTNER` |
| Modify `src/modules/van-chuyen/chuyen-repo.ts`, `dieu-phoi.ts`, `tai-xe-dto.ts`, `index.ts`, `chinh-sach.ts` | ghi hạn ở mọi đường xếp; nạp hạn; DTO; route Từ chối, Báo bận; `repository.ts` `INSERT_DISPATCH_POLICY` + `chinh-sach.ts` `kiemChinhSachMoi` thêm `refuse_lead_minutes` |
| Modify `src/shared/contracts.ts` | DTO mới |
| Modify `src/tai-xe-cong.test.ts`, `src/hanh-khach-khong-lo-ten.test.ts`, `src/giay-to-khong-lo-so.test.ts` | bảng `BANG_STAFF`, regex route, ca `DRIVER_PARTNER` |
| Modify `scripts/audit-invariants.mjs` (+ test) | 4 câu mới |
| Modify `tests/e2e/tai-xe-doi-tac.mjs`, `tests/e2e/dieu-phoi-chay-dua.mjs` | e2e |
| Modify `web/tai-xe.ts`, `web/cuoc.ts`, `web/cuoc-chuyen.ts`, `web/shell.ts`; Create (sau bản vẽ) `web/ban.ts` + `public/ban.html` | giao diện |
| Create `docs/superpowers/plans/<ngày>-adr-0053-de-xuat-luat.md` | đề xuất nới bài ghim / sổ hàng rào / `web/CLAUDE.md` |
| Modify `docs/SO-HANG-RAO.md`, `docs/data-dictionary.json`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts` | tài liệu |

---

### Task 0: Thử khả thi trigger so giờ CSDL (B8.3) — CỔNG DỪNG

ADR-0053 "Chưa kiểm" + D8.5: **không có phương án dự phòng duyệt sẵn**. Làm trước mọi việc khác.

**Files:**
- Create (tạm, không commit vào mã chạy): `src/spike-b83.test.ts`

- [ ] **Step 1:** Viết trigger thử `BEFORE UPDATE ON vc_trip_driver WHEN NEW.close_reason='REFUSED' AND (SELECT deadline_ms FROM vc_refuse_deadline …) < CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER) → RAISE(ABORT,'lc_refuse_after_deadline')` trên schema thật (`0042` + migration nháp).
- [ ] **Step 2:** Chạy trên `node:sqlite` với `planned_start_ms` gieo **tương đối** `Date.now()` (hạn đã qua → `RAISE`; còn hạn → qua).
- [ ] **Step 3:** Chạy cùng ca trên **D1 local** (`wrangler d1 execute --local`, không remote).
- [ ] **Step 4:** Kết quả:
  - Cả hai đúng ⇒ ghi vào nhật ký thi công (câu dùng, kết quả), xoá tệp thử, sang Task 1.
  - Một trong hai sai ⇒ **DỪNG đợt này, quay lại chủ** (lệch Hiến chương 5.1 mới cần chủ duyệt riêng — ADR-0053 D8.5). Phần không phụ thuộc (Task 1 hàm thuần, lệnh vẽ V15) vẫn làm được.

---

### Task 1: Hàm thuần — hạn Từ chối, khung thấy khách, kiểm khung bận

**Files:**
- Modify: `src/shared/dieu-phoi-kiem.ts:414-422` (cạnh `trongNgayChay`), `src/shared/dieu-phoi-kieu.ts:14,34`
- Test: `src/shared/dieu-phoi-kiem.test.ts`

**Interfaces — Produces:**
```ts
// Hạn Từ chối của một cặp xếp LẦN ĐẦU (D8.1). Không đọc chính sách hiện hành lúc khác.
export function hanTuChoiMoi(gioXuatBenDuKienMs: number, leadMinutes: number): number;
// D8.2/D8.4: được Từ chối ⇔ chuyến PLANNED và bayGioMs <= hanMs (biên ≤).
export function tuChoiDuoc(v: { trangThai: TrangThaiChuyen; hanMs: number }, bayGioMs: number): boolean;
// D7.2 — MỘT hàm cho mọi tài xế. loai 'CONG_TY': = trongNgayChay (không vế hạn). loai 'DOI_TAC': bayGioMs > hanMs (nghiêm — P6-2) VÀ trongNgayChay.
export type LoaiTaiXe = "CONG_TY" | "DOI_TAC";
export function trongKhungXemKhach(
  chuyen: { ngayChay: string; trangThai: TrangThaiChuyen; xuatBenMs: number | null },
  taiXe: { loai: LoaiTaiXe; hanMs: number | null },
  bayGioMs: number,
): boolean;
// Mốc sớm nhất màn hiện "Thấy danh sách khách từ …" (P6-8): max(hạn+1ms, 00:00 VN ngày chạy) với DOI_TAC; 00:00 VN ngày chạy với CONG_TY. Trả ms.
export function mocThayKhach(chuyen: { ngayChay: string }, taiXe: { loai: LoaiTaiXe; hanMs: number | null }): number;
```
- **Không** viết hàm kiểm khung bận mới ở `dieu-phoi-kiem.ts` — độ dài 14 ngày làm ở Task 6 trong `kiemKhungBanMoi` của Đợt 3 (P6-6). So chồng giờ dùng `chongNuaMo` của `src/shared/khung-ban.ts` (Đợt 3), không viết phép so thứ hai.
- `trongNgayChay` **giữ nguyên chữ ký** (đang được 10 chỗ gọi ở `index.ts:1046-1230`); `trongKhungXemKhach` gọi nó. Task 4 đổi mọi chỗ gọi sang `trongKhungXemKhach`.
- `dieu-phoi-kieu.ts`: `NHOM_LY_DO` **nối thêm cuối** `"TU_CHOI_CHUYEN"`, `"BAN_TAI_XE"` sau `BAN_XE` của Đợt 3 (+ nhãn lời thường ở `NHAN_NHOM_LY_DO`: "Lý do từ chối chuyến", "Lý do tài xế bận"); sửa bài `dieu-phoi-kieu.test.ts` "đúng tám nhóm" → "đúng mười nhóm — TU_CHOI_CHUYEN, BAN_TAI_XE từ ADR-0053" trong cùng task. `LOAI_SU_KIEN_CHUYEN` **nối thêm cuối** `"DRIVER_REFUSED"` sau các phần tử Đợt 5 (`TRANSFER_*`, `PASSENGER_NAMED`; luôn `MAY_CHU` theo luật hai trục giờ) + nhãn "Tài xế từ chối chuyến".

- [ ] **Step 1: Viết bài đỏ** — mốc ms cố định bằng `Date.parse("…+07:00")`, `lead = 720`:
  - `hanTuChoiMoi(06:00 D, 720)` = 18:00 D−1 (VN) — so đúng chuỗi `+07:00`, không lệch 7 giờ.
  - Tiêu chí 3 ADR, tài xế đối tác: chuyến 06:00 D — 18:30 D−1 vắng, 00:05 D có; chuyến 14:00 D — 01:00 D vắng, 02:05 D có; chuyến 23:30 D — 11:00 D vắng, 12:00 D có, 00:30 D+1 `RUNNING` (xuất bến 23:20 D) có, 00:30 D+1 `ENDED` vắng; xuất bến sớm 18:30 D−1 → vắng tới 00:00 D; xuất bến 00:05 D chuyến 14:00 → vắng tới 02:00 D.
  - **Biên P6-2:** `bayGio = hanMs` → `tuChoiDuoc` true, `trongKhungXemKhach(DOI_TAC)` **false**; `bayGio = hanMs + 1` → ngược lại. Hai khoảng rời nhau (bài lặp ±1 ms quanh 3 hạn).
  - Tài xế công ty: chuyến 06:00 D, xuất bến 18:30 D−1 → vắng tới 00:00 D; chuyến 23:30 `RUNNING` 00:30 D+1 → có; `hanMs` bất kỳ không ảnh hưởng (đột biến "dùng vế hạn cho CONG_TY" → đỏ).
  - `tuChoiDuoc`: `RUNNING`/`ENDED`/`CANCELLED` → false dù còn hạn.
  - `mocThayKhach`: chuyến 06:00 D → 00:00 D; chuyến 14:00 D → 02:00:00.001 D (hiển thị 02:00).
  - `dieu-phoi-kieu.test.ts`: đúng mười nhóm theo thứ tự; `LOAI_SU_KIEN_CHUYEN` chứa `DRIVER_REFUSED` ở cuối, mọi phần tử cũ giữ vị trí.
- [ ] **Step 2:** `node --test src/shared/dieu-phoi-kiem.test.ts src/shared/dieu-phoi-kieu.test.ts` → FAIL (hàm chưa có, còn tám nhóm).
- [ ] **Step 3:** Thi công tối thiểu.
- [ ] **Step 4:** Chạy lại → PASS; đột biến `>` thành `>=` trong vế hạn → đỏ ca biên → hoàn nguyên (ghi nhật ký cho sổ hàng rào).
- [ ] **Step 5:** Commit `Hàm thuần hạn Từ chối và khung thấy khách của tài xế đối tác (ADR-0053 D7.2, D8.2)`.

---

### Task 2: Migration — Từ chối + mở Báo bận tài xế (lớp CSDL)

**Files:**
- Create: `migrations/00NN_tai_xe_doi_tac_chuyen.sql` (số theo L2 lộ trình; đứng **sau** migration Đợt 3, 4, 5 trên cùng nhánh phát hành)
- Create: `src/migrations-tu-choi-ban.test.ts`
- Modify: `docs/data-dictionary.json` → `npm run dict`

**Interfaces — Consumes (từ Đợt 3, kế hoạch 03):** bảng `vc_unavailability` (03 :138), trigger chặn ghi `DRIVER` `vc_unavailability_driver_closed` (03 :378), trigger chỉ-thêm `vc_unavailability_append_only` (03 :376), câu báo xe `lc03_unavailable:` (→ `trip_rule` qua `loiRangBuocChuyen`, `src/modules/van-chuyen/rules.ts:148`, regex `lc0[1-9]_`), `unavailability_overlaps_trip:` (→ `khung_ban_chong_chuyen_csdl` qua `loiRangBuocKhungBan`, 03 :1131).

**Produces (schema):**
- `ALTER TABLE vc_trip_driver ADD COLUMN refuse_reason_code TEXT REFERENCES vc_reason(code)`; `ADD COLUMN closed_by_party_id TEXT REFERENCES pty_party(id)`. Không `CHECK` thêm bằng `ALTER` được ⇒ B8.4 phần "có ⇔ REFUSED" bằng **trigger** `BEFORE INSERT/UPDATE` (`RAISE … 'refuse_reason_iff_refused'`), và lý do phải thuộc nhóm `TU_CHOI_CHUYEN` đang `active`.
- `CREATE TABLE vc_refuse_deadline (id TEXT PK, trip_id TEXT NOT NULL REFERENCES vc_trip(id), driver_party_id TEXT NOT NULL REFERENCES pty_party(id), deadline_ms INTEGER NOT NULL, lead_minutes INTEGER NOT NULL CHECK (lead_minutes BETWEEN 0 AND 2880), created_at, created_by, updated_at, updated_by, UNIQUE (trip_id, driver_party_id))`.
- Trigger: `vc_refuse_deadline_no_delete`; `vc_refuse_deadline_only_down` (`BEFORE UPDATE … WHEN NEW.deadline_ms >= OLD.deadline_ms OR NEW.trip_id <> OLD.trip_id OR NEW.driver_party_id <> OLD.driver_party_id OR NEW.lead_minutes <> OLD.lead_minutes` → `RAISE`); `vc_trip_refuse_deadline_follow` (`AFTER UPDATE OF planned_start_ms ON vc_trip` — câu nguyên văn ADR-0053 D8.1, **chỉ** chạm dòng thật sự giảm).
- B8.2 `vc_trip_driver_refused_by_self` (`BEFORE UPDATE … WHEN NEW.close_reason='REFUSED' AND (NEW.closed_by_party_id IS NULL OR NEW.closed_by_party_id <> OLD.driver_party_id)`).
- B8.3 `vc_trip_driver_refused_in_time` (`… WHEN NEW.close_reason='REFUSED' AND ((SELECT status FROM vc_trip WHERE id=OLD.trip_id) <> 'PLANNED' OR <hạn của cặp> < <giờ CSDL đã chứng ở Task 0>)`).
- B8.1 có sẵn (`vc_trip_driver_close_once` `0042:285`) — chỉ thêm bài.
- `ALTER TABLE vc_dispatch_policy ADD COLUMN refuse_lead_minutes INTEGER NOT NULL DEFAULT 720 CHECK (refuse_lead_minutes BETWEEN 0 AND 2880)` — `DEFAULT` chỉ để `ALTER` lấp dòng cũ; khuôn I43 "không cột nào sống nhờ DEFAULT" vẫn giữ: **`INSERT_DISPATCH_POLICY` (`repository.ts`) liệt kê thêm cột + bind**, `kiemChinhSachMoi` (`chinh-sach.ts`) bắt buộc `refuseLeadMinutes` (0–2880), bài "câu chèn chính sách liệt kê ĐỦ mọi cột" (03 :878, `src/modules/van-chuyen/chinh-sach.test.ts`) xanh lại. Dựng trên bản đã gộp Đợt 3 **và** Đợt 5 (thứ tự `?N` theo bản cuối).
- Gieo `vc_reason`: nhóm `TU_CHOI_CHUYEN` ("Bận lịch khác", "Ốm / việc riêng", "Xe không chạy được", "Khác"); nhóm `BAN_TAI_XE` ("Việc riêng", "Ốm", "Khác").
- Gieo hạn (G3-7): `INSERT INTO vc_refuse_deadline … SELECT … FROM vc_trip_driver d JOIN vc_trip t … WHERE d.valid_to_at IS NULL` với `deadline_ms = t.planned_start_ms − 720×60000`, `lead_minutes = 720`.
- `DROP TRIGGER vc_unavailability_driver_closed;` (03 :378). B9.2 `vc_unavailability_driver_overlaps_trip` (`BEFORE INSERT … WHEN NEW.subject='DRIVER' AND EXISTS (dòng lái MỞ của NEW.driver_party_id trên chuyến PLANNED/RUNNING chồng [start_ms,end_ms) nửa mở)` → `RAISE(ABORT, 'unavailability_driver_overlaps_trip: …')` — chữ KHÁC câu xe để `loiRangBuocKhungBan` tách được; regex `\bunavailability_overlaps_trip` của xe không khớp nhầm). B9.3 `vc_trip_driver_unavailable_ins` (`BEFORE INSERT ON vc_trip_driver`) và `vc_trip_driver_unavailable_upd` (`BEFORE UPDATE OF planned_start_ms, planned_end_ms ON vc_trip`, đọc dòng lái mở) → `RAISE(ABORT, 'lc03_driver_unavailable: …')` — **cố ý** khớp regex `lc0[1-9]_` của `loiRangBuocChuyen` ⇒ lớp CSDL trả `trip_rule` như mọi luật lõi chuyến (lớp máy chủ chặn trước bằng `TRUNG_GIO_TAI_XE` — Task 6). B9.4 dùng `vc_unavailability_append_only` + trigger cấm xoá của Đợt 3 — chỉ thêm bài cho `subject='DRIVER'`.

- [ ] **Step 1: Bài đỏ** (`src/migrations-tu-choi-ban.test.ts`, khuôn `src/migrations-tai-xe-doi-tac.test.ts`): tiêu chí 5, 6, 8 ADR ở lớp SQL:
  - `REFUSED` với `closed_by_party_id` ≠ tài xế → `RAISE`; `REFUSED` khi chuyến `RUNNING` → `RAISE`; `REFUSED` sau hạn (gieo tương đối `Date.now()`) → `RAISE`; còn hạn, đúng người → qua; mở lại dòng đã đóng → `RAISE`; `refuse_reason_code` khi `REASSIGNED` → `RAISE`; lý do nhóm khác → `RAISE`.
  - `UPDATE vc_refuse_deadline` tăng / giữ nguyên → `RAISE`; `DELETE` → `RAISE`.
  - `UPDATE vc_trip SET planned_start_ms` **muộn hơn** → câu thành công, hạn không đổi; **sớm hơn** → hạn giảm đúng `planned − lead`; sớm rồi dời lại → hạn giữ mốc sớm.
  - Gieo: chuyến có dòng lái mở lúc áp → đúng một dòng hạn = xuất bến − 720 phút.
  - `vc_unavailability_driver_closed` không còn (`sqlite_master`); khung `DRIVER` chồng chuyến đang xếp → `RAISE` chứa `unavailability_driver_overlaps_trip`; chèn dòng lái vào khung → lỗi chứa `lc03_driver_unavailable` **và** `loiRangBuocChuyen(msg)` trả `trip_rule`; chồng chuyến `CANCELLED`/`ENDED` → qua; chèn dòng lái vào chuyến chồng khung còn hiệu lực → `RAISE`; khung đã rút → qua; dời chuyến chồng khung → `RAISE`; hai khung cùng tài xế chồng nhau → **qua** (B9.5); sửa giờ / xoá khung → `RAISE`.
- [ ] **Step 2:** `node --test src/migrations-tu-choi-ban.test.ts src/modules/van-chuyen/chinh-sach.test.ts` → FAIL.
- [ ] **Step 3:** Viết migration; sửa `INSERT_DISPATCH_POLICY` + `kiemChinhSachMoi` (+ fixture `GOC` của `chinh-sach.test.ts` thêm `refuseLeadMinutes: 720`, ca 2881 → lỗi); cập nhật `data-dictionary.json` (2 cột, 1 bảng, 1 cột chính sách) + `npm run dict`.
- [ ] **Step 4:** PASS; `npm run db:migrate:local`; mỗi trigger mới: xoá khối → đỏ → hoàn nguyên (ghi tên bài đỏ cho sổ hàng rào).
- [ ] **Step 5:** Commit `Migration Từ chối chuyến và Báo bận tài xế: hạn khoá dính theo cặp, trigger hai lớp (ADR-0053 D8.1, D9.1)`.

---

### Task 3: Ghi hạn ở mọi đường xếp + khung thấy khách trong DTO tài xế

**Files:**
- Modify: `src/modules/van-chuyen/chuyen-repo.ts:326-340` (cạnh `DRIVER_INSERT`), `src/modules/van-chuyen/dieu-phoi.ts:118,144`, `src/modules/van-chuyen/tai-xe-dto.ts:36-77`, `src/modules/van-chuyen/index.ts:78,1027-1230`, `src/modules/van-chuyen/chinh-sach.ts`, `src/shared/contracts.ts:1471`
- Test: `src/modules/van-chuyen/tai-xe-dto.test.ts`, `src/modules/van-chuyen/cuoc-cua-toi.test.ts`, `src/modules/van-chuyen/thu-tu-lo.test.ts`, mới `src/modules/van-chuyen/mot-ham-khung.test.ts`

**Interfaces — Produces:**
```ts
// chuyen-repo.ts — đứng NGAY SAU mỗi DRIVER_INSERT trong cùng lô, cùng dấu lệnh.
// ?1 id, ?2 chuyến, ?3 tài xế, ?4 dấu lệnh, ?5 lúc, ?6 người, ?7 lead_minutes (chính sách hiện hành lúc xếp)
export const REFUSE_DEADLINE_INSERT: Sql; // INSERT … SELECT … (planned_start_ms − ?7*60000) … WHERE EXISTS(last_cmd_id = ?4) ON CONFLICT(trip_id, driver_party_id) DO NOTHING
export const REFUSE_DEADLINE_GET: Sql;    // (trip_id, driver_party_id) → { deadline_ms, lead_minutes } | null
// index.ts — loại tài xế suy từ quyền người gọi (CONG_TY nếu có DRIVER, DOI_TAC nếu có DRIVER_PARTNER; LC-1b bảo đảm không lẫn)
function loaiTaiXe(staff: StaffProfile): LoaiTaiXe;
// tai-xe-dto.ts: cuocChiTietDto nhận thêm { trongKhung: boolean; hanTuChoi: string | null; tuChoiDuoc: boolean; thayKhachTu: string }
// contracts.ts CuocChiTietResponse thêm: hanTuChoi?: string (giờ VN "HH:mm dd/MM", CHỈ khi DOI_TAC); tuChoiDuoc: boolean; thayKhachTu: string
```
- Mọi đường mở dòng lái (đo lại: hôm nay `dieu-phoi.ts:118` tạo chuyến kèm tài xế, `:144` đổi tài xế; cộng đường của Đợt 4/5 nếu có) phải đẩy `REFUSE_DEADLINE_INSERT` **sau** `DRIVER_INSERT` **và sau mọi câu đổi `planned_start_ms` trong cùng lô** (câu đọc `vc_trip.planned_start_ms` lúc chạy — lô vừa đổi tài xế vừa dời giờ mà chèn trước thì tài xế mới nhận hạn theo giờ cũ). Xếp lại đúng tài xế cũ ⇒ `DO NOTHING` = dùng lại hạn cũ (D8.2).
- 10 chỗ `trongNgayChay(...)` ở `index.ts:1046-1230` đổi sang `trongKhungXemKhach(..., { loai: loaiTaiXe(staff), hanMs }, bayGioMs)`; nạp `hanMs` cùng lúc nạp `nen` (một truy vấn thêm).
- Câu ghi tên của tài xế (`trip.passenger.add`, Đợt 5) và `lienHeChoTaiXe` cũng hỏi `trongKhungXemKhach` (ADR D7.2 "không nơi nào tự tính khung").

- [ ] **Step 1: Bài đỏ:**
  - `thu-tu-lo.test.ts` (`MAU` dựng lại trên bản đã gộp Đợt 4, 5; `REFUSE_DEADLINE_INSERT` mang đúng chuỗi lính gác `EXISTS (SELECT 1 FROM vc_trip WHERE id = ?N AND last_cmd_id = ?M)` — `LINH_GAC` 04 :28): lô tạo chuyến / đổi tài xế chứa `REFUSE_DEADLINE_INSERT` sau `DRIVER_INSERT` và sau câu sửa giờ chuyến (nếu có), trước câu trạng thái cuối; ca lô "đổi tài xế + dời sớm" ⇒ hạn của tài xế mới = giờ MỚI − lead.
  - `cuoc-cua-toi.test.ts`: đổi người A→B→A ⇒ đúng một dòng hạn cho (chuyến, A), hạn không đổi; Toàn quyền hạ `refuse_lead_minutes` rồi xếp cặp cũ ⇒ hạn cũ; cặp mới ⇒ hạn mới.
  - `tai-xe-dto.test.ts` (bài liệt kê khoá — gọi `cuocChiTietDto` trực tiếp với `loai: "DOI_TAC"`, vì ô `trip.view` của tài xế đối tác CHƯA mở ở task này): trước hạn ⇒ không khoá `hoTen`, `namSinh`, `lienHe`; có `hanTuChoi`, `tuChoiDuoc: true`, `thayKhachTu`; sau hạn trong ngày chạy ⇒ có ba khoá; không khoá tiền nào; `loai: "CONG_TY"` ⇒ **không** có `hanTuChoi`, `tuChoiDuoc: false`.
  - `mot-ham-khung.test.ts`: quét `src/modules/**/*.ts` (trừ test) — không chuỗi `service_date === ` / `ngayChay ===` / `vnToday(` so ngày chạy ngoài `src/shared/dieu-phoi-kiem.ts`; không gọi `trongNgayChay(` ngoài hàm khung. Đột biến: chép lại một phép so ở `index.ts` → đỏ.
- [ ] **Step 2:** Chạy các bài → FAIL.
- [ ] **Step 3:** Thi công tối thiểu.
- [ ] **Step 4:** PASS; `npm run typecheck` 0 lỗi.
- [ ] **Step 5:** Commit `Ghi hạn Từ chối ở mọi đường xếp; DTO tài xế dùng một hàm khung thấy khách (ADR-0053 D7.2, D8.1)`.

> **Thứ tự bắt buộc (cửa một chiều):** Task 3 phải vào nhánh **trước** commit mở ô `trip.view` cho tài xế đối tác (Task 4). Không được có commit nào trên nhánh mà tài xế đối tác thấy khách ngoài khung D7.2.

---

### Task 4: Mở bốn ô chuyến cho tài xế đối tác + tệp đề xuất luật (NỚI — chủ duyệt)

Chỉ mở các ô **đã có route**: `trip.view`, `trip.progress`, `trip.transfer` (Đợt 5 A-1), `trip.passenger.add` (Đợt 5 A-1b). Ô `trip.refuse` thêm ở Task 5, `unavailability.self` ở Task 6 — cùng route của chúng, để bài "mỗi ô được máy chủ hỏi" và `tai-xe-cong` (tự quét route `staff`) **xanh cuối mỗi task**.

**Files:**
- Modify: `src/shared/permissions.ts:169,175` + hàng `trip.transfer`, `trip.passenger.add` (Đợt 5); chú thích đầu `MATRIX` (`:68`) đoạn ADR-0053
- Modify: `src/shared/permissions.test.ts:336-360` (ghim `DRIVER_PARTNER`); `src/shared/cong-quyen.test.ts` (giữ: `DRIVER_PARTNER` ∉ `office/orders/admin`)
- Modify: `src/tai-xe-cong.test.ts:90-99` — `BANG_STAFF` dòng `cuoc-cua-toi*` của `DRIVER_PARTNER`: 403 → như `DRIVER` (200 danh sách rỗng / 404 chuyến lạ); dòng route nhờ đón, bổ sung tên của Đợt 5 tương tự
- Modify: `src/hanh-khach-khong-lo-ten.test.ts` — thêm ca tài khoản `DRIVER_PARTNER` trong / ngoài khung D7.2 ở `GET …/cuoc-cua-toi/:id`
- Modify: `tests/e2e/tai-xe-doi-tac.mjs:36` nếu danh sách 403 chứa route `cuoc-cua-toi` (hôm nay không chứa — đo lại)
- Modify: bài người nhận tin của Đợt 2 "hết quyền: … (hoặc chỉ DRIVER_PARTNER) không nhận dù có dòng lái" (kế hoạch 02 :150-153, tệp test của `src/shared/tin-chuyen.ts`) — tách: mất `DRIVER` vẫn không nhận; **chỉ `DRIVER_PARTNER` đang có dòng lái → NHẬN** (D7.5); và bài Đợt 5 "chỉ-`DRIVER_PARTNER` không nhận gì" (05 :390) → nhận tin đề nghị nhờ đón như tài xế công ty. Hai bài này đỏ ngay khi `trip.view` mở — sửa trong CÙNG task (mục 6 tệp đề xuất luật).
- Create: `docs/superpowers/plans/<ngày>-adr-0053-de-xuat-luat.md` (khuôn `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md`: "Tóm tắt cho chủ" bảng `# | Việc | Loại | Nếu bạn KHÔNG duyệt`, rồi từng mục có diff)

**Produces (cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR):**
```ts
"trip.view":     row("any","any","any","none","none","any","none","assigned","assigned","none"),
"trip.progress": row("any","none","any","none","none","any","none","assigned","assigned","none"),
// trip.transfer, trip.passenger.add: chỉ đổi cột DRIVER_PARTNER none → assigned (cột khác giữ như Đợt 5)
```
- Ghim `DRIVER_PARTNER` sau task này: 4 ô `assigned` + 4 ngoại lệ cũ (`feedback.submit` `any`, `feedback.view` `own`, `party.document.view` `own`, `assistant.ask` `any`); mọi ô tiền `none`. Sau Task 5–6: đủ **10 ô có tên** (P6-3).
- **Không** đổi `EXTERNAL_PERMISSIONS`, LC-1, LC-1b (P6-7).

**Tệp đề xuất luật — các mục (mỗi mục: căn cứ ADR, diff, "Nếu chủ KHÔNG duyệt" = hoàn nguyên phần mã nào):**
1. NỚI bài ghim hàng `DRIVER_PARTNER` (6 ô: 4 ở task này, `trip.refuse` Task 5, `unavailability.self` Task 6) + dòng `docs/SO-HANG-RAO.md:142` viết lại.
2. NỚI `src/tai-xe-cong.test.ts` `BANG_STAFF` — `DRIVER_PARTNER` ở `cuoc-cua-toi*` 403 → 200/404; thêm route `tu-choi`, `ban*` (dòng sổ `:132`).
3. NỚI `start-page` — `homeRedirect(DRIVER_PARTNER)` `/tai-xe` → `/cuoc` (bài `start-page.test.ts:59,68-69`; dòng sổ `:148`) — thi công ở Task 9.
4. SIẾT (ghi để chủ thấy): ghim `trip.refuse`/`unavailability.self` cột `DRIVER`, `HR` = `none`; regex `src/hanh-khach-khong-lo-ten.test.ts:164` thêm `ban|ban-tai-xe` + ca `DRIVER_PARTNER`; biên P6-2.
5. `web/CLAUDE.md`: dòng kịch bản Chrome cho màn tài xế đối tác (ADR-0053 "Tài liệu").
6. NỚI hai bài người nhận tin (02 :150-153, 05 :390): tài xế đối tác đang lái nhận tin chuyến của mình — hệ quả trực tiếp D7.5, không luật mới.
7. `CLAUDE.md` §10 bẫy giấy tờ/`DRIVER`: thêm một câu "tài xế đối tác dùng chuyến (ADR-0053): khung thấy khách = `trongKhungXemKhach`, hạn Từ chối khoá dính theo cặp" — chỉ đề xuất.

- [ ] **Step 1:** Sửa bài ghim (gồm `trip.transfer`/`trip.passenger.add` cột `DRIVER_PARTNER` `none` → `assigned` của 05 :266, :472) + `BANG_STAFF` + ca `hanh-khach-khong-lo-ten` + hai bài người nhận tin theo giá trị MỚI → `node --test src/shared/permissions.test.ts src/tai-xe-cong.test.ts src/hanh-khach-khong-lo-ten.test.ts src/shared/tin-chuyen.test.ts` đỏ (tên tệp bài tin đo lại).
- [ ] **Step 2:** Sửa `MATRIX` → xanh; đột biến một ô `DRIVER_PARTNER` (vd `money.view` → `own`) → đỏ → hoàn nguyên.
- [ ] **Step 3:** Ghi chú "CHỜ CHỦ DUYỆT (đề xuất luật mục N)" cạnh từng hàng nới trong mã (khuôn ADR-0049).
- [ ] **Step 4:** Soạn tệp đề xuất luật. **Không** sửa `CLAUDE.md`, `web/CLAUDE.md`, `docs/adr/`. **Không gộp** khi chủ chưa duyệt.
- [ ] **Step 5:** `npm test` + typecheck xanh; commit `Mở ô chuyến cho tài xế đối tác (ADR-0053 D7.1) — chờ chủ duyệt nới hàng rào`.

---

### Task 5: Route Từ chối chuyến

**Files:**
- Modify: `src/modules/van-chuyen/index.ts` (cạnh `cuoc-cua-toi/:id/thu-tu` `:1217`), `src/modules/van-chuyen/dieu-phoi.ts` (lô), `src/modules/van-chuyen/chuyen-repo.ts`, `src/modules/van-chuyen/dieu-phoi-than.ts` (kiểm thân), `src/shared/tin-chuyen.ts` (Đợt 2), `src/shared/audit-actions.ts` (`trip_driver_refused`)
- Test: mới `src/modules/van-chuyen/tu-choi.test.ts`; `thu-tu-lo.test.ts` (`MAU` thêm mẫu `loTuChoi`); bài tin của `tin-chuyen.ts`; bài quét route Đợt 2 (02 :980) tự phủ route mới

**Interfaces:**
- Route: `POST /api/van-chuyen/cuoc-cua-toi/:id/tu-choi` — cổng `staff`, thân `{ lyDo: string; requestId: string }`, `Origin` cùng site.
- Thêm ô `"trip.refuse": row("none","none","none","none","none","any","none","none","assigned","none")` CÙNG task này; ghim `DRIVER_PARTNER` (`assigned`), `DRIVER` và `HR` (`none`) trong `permissions.test.ts`; dòng `BANG_STAFF` của route (`DRIVER` 403, `DRIVER_PARTNER` 404 chuyến lạ).
- Consumes: `tuChoiDuoc` (Task 1), `REFUSE_DEADLINE_GET` (Task 3), `ctx.baoThayDoiChuyen({ tripId, requestId })` (Đợt 2, 02 :38, :779) — gọi **đúng một lần sau 200**, nằm SAU `if (!r.ok) return r.res` (bài quét 02 :980-984 quét mọi `POST /api/van-chuyen/(chuyen|cuoc-cua-toi)…`, không ngoại lệ ⇒ thiếu lời gọi là đỏ); không gọi khi 409.
- Tin (Đợt 2, `src/shared/tin-chuyen.ts`): nối `"trip_driver_refused"` vào `HANH_DONG_TIN_CHUYEN` (02 :269); `LoaiTinChuyen` thêm `"tu_choi"`; nhánh mới trong `loaiCho` (02 :290): người nhận ⇔ `can(n, "trip.dispatch")` phạm vi `any` (Bán hàng, Quản trị, Toàn quyền — D8.4 bước 5, G3-5), **không** tài xế (kể cả người vừa từ chối); dòng câu "Tài xế từ chối chuyến <mã> — cần xếp người khác" (không tên khách, không biển số).
- Produces:
```ts
export const DRIVER_REFUSE: Sql; // UPDATE vc_trip_driver SET valid_to_at=?lúc, close_reason='REFUSED', refuse_reason_code=?, closed_by=?staffId, closed_by_party_id=?partyId …
                                 // WHERE trip_id=? AND driver_party_id=?partyId AND valid_to_at IS NULL AND EXISTS(last_cmd_id=?cmd)
                                 //   AND ?bayGioMs <= (SELECT deadline_ms FROM vc_refuse_deadline WHERE trip_id=? AND driver_party_id=?partyId)
export function loTuChoi(db: D1Database, v: { tripId: string; partyId: string; staffId: string; lyDo: string; cmd: string; lucIso: string; bayGioMs: number }): D1PreparedStatement[];
// thứ tự: cổng UPDATE vc_trip SET version+1,last_cmd_id WHERE status='PLANNED' → nhật ký trip_driver_refused (changes()>0; detail = mã chuyến + mã lý do)
//         → sự kiện DRIVER_REFUSED → DRIVER_REFUSE (trạng thái cuối)
```
- Thứ tự kiểm (MỘT luật, D8.3): `can(trip.refuse,{assigned:true})` sai → **403** (tài xế công ty, mọi vai không ô); `can` đúng nhưng người gọi không lái chuyến (`dangLai` `index.ts:78` sai, hoặc chuyến không tồn tại) → **403** nếu phạm vi ô của người gọi là `any` (Toàn quyền — không Từ chối thay), ngược lại **404**; thân sai / lý do ngoài nhóm `TU_CHOI_CHUYEN` đang `active` → 400; lô.
- Cổng thua → đọc lại: quá hạn → 409 `refuse_deadline_passed` "Đã quá hạn từ chối, hãy gọi văn phòng để đổi người"; chuyến không `PLANNED` → 409 "Chuyến đã xuất bến / kết thúc / huỷ"; dòng lái không còn của mình → 409 `stale`.
- Văn phòng đọc "Tài xế <tên> đã từ chối lúc … — <lý do>" từ dòng đã đóng (DTO văn phòng chi tiết chuyến); chuyến không dòng lái mở ⇒ cổng xuất bến "chưa có tài xế — văn phòng" (có sẵn ADR-0049 D2 — chỉ thêm bài).

- [ ] **Step 1: Bài đỏ** (`tu-choi.test.ts`, khung thử van-chuyen hiện có). **Gieo `planned_start_ms` TƯƠNG ĐỐI `Date.now()` thật** (như Task 0): trigger B8.3 so giờ CSDL, đồng hồ tiêm của khung thử không tới được trigger — gieo theo giờ giả thì cổng máy chủ và trigger lệch nhau:
  - Tiêu chí 4 ADR: lý do ngoài danh sách → 400; sau hạn → 409; `RUNNING` → 409; Toàn quyền không lái → 403; tài xế công ty → 403; chuyến người khác → 404; sau Từ chối mở lại chuyến → 404.
  - Tiêu chí 5: hạn đã qua, văn phòng dời muộn 1 ngày (route dời thật → 200) → Từ chối vẫn 409.
  - Tiêu chí 7: chuyến bị giữ "chưa có tài xế"; `baoThayDoiChuyen` được gọi đúng một lần (gián điệp `ctx`) sau 200, không gọi khi 409; `tinChuyenCho` với hành động `trip_driver_refused`: Bán hàng/Quản trị/Toàn quyền → `tu_choi`, Kế toán → null, tài xế (công ty, đối tác, người từ chối) → null; câu không tên khách/SĐT/biển số.
  - **Review Focus 1 — chen giữa:** tiêm hàm chạy lệnh "văn phòng đổi tài xế" giữa lúc đọc và lô Từ chối ⇒ Từ chối 409 `stale`; đếm `trip_driver_refused` = 0, dòng lái mở = 1 (tài xế mới), dòng hạn của tài xế mới = 1. Ngược lại (Từ chối thắng trước) ⇒ đổi tài xế 409 `stale` theo khuôn có sẵn.
  - `thu-tu-lo.test.ts`: lô Từ chối đúng thứ tự cổng → nhật ký → sự kiện → trạng thái cuối.
- [ ] **Step 2:** FAIL. **Step 3:** thi công. **Step 4:** PASS + typecheck.
- [ ] **Step 5:** Commit `Route Từ chối chuyến của tài xế đối tác — một lô, khoá dính, 409 dễ hiểu (ADR-0053 D8.3–D8.6)`.

---

### Task 6: Báo bận — route tài xế, văn phòng xem, LC-03 với tài xế

**Files:**
- Modify: `src/modules/van-chuyen/index.ts`, `src/modules/van-chuyen/khung-ban.ts` (Đợt 3 — `kiemKhungBanMoi`, `loiRangBuocKhungBan`, hằng), repo khung bận của Đợt 3, `src/shared/dieu-phoi-kiem.ts` (`kiemXep` nhận `khungBan`), nạp khung `DRIVER` ở `dungLichNgay` / nơi dựng `KiemTaoSuaChuyenVao` (03 :13), `src/shared/contracts.ts`
- Test: mới `src/modules/van-chuyen/ban-tai-xe.test.ts`; `src/modules/van-chuyen/khung-ban.test.ts`; `src/shared/dieu-phoi-kiem.test.ts`

**Interfaces — Produces:**
```
GET  /api/van-chuyen/ban/cua-toi          staff  can(unavailability.self,{ownerId: staff.id}) → { khung: KhungBanDto[] } (chỉ của mình, còn hiệu lực + đã rút 30 ngày gần nhất)
POST /api/van-chuyen/ban                  staff  thân { batDau: "YYYY-MM-DDTHH:mm"(giờ VN), ketThuc, lyDo, requestId } → 201 { khung }
POST /api/van-chuyen/ban/:id/rut          staff  thân { requestId } → 200; khung người khác → 404
GET  /api/van-chuyen/ban-tai-xe?tu=&den=  office can(trip.dispatch) → { khung: KhungBanTaiXeDto[] } (tên tài xế + giờ + nhãn lý do; Kế toán → 403)
```
```ts
interface KhungBanDto { id: string; batDau: string; ketThuc: string; lyDo: string /* nhãn */; daRut: boolean }
interface KhungBanTaiXeDto extends KhungBanDto { taiXeId: string; tenTaiXe: string }
```
- Route luôn dùng `staff.partyId` của người gọi (Toàn quyền cũng chỉ ghi cho chính mình — D9.2). Thiếu `partyId` → 403.
- Thân: `kiemKhungBanMoi` của Đợt 3 mở rộng theo `subject` — chữ ký đề xuất `kiemKhungBanMoi(body, bayGioMs, subject: "VEHICLE" | "DRIVER" = "VEHICLE")`; hằng mới `KHUNG_TAI_XE_TOI_DA_NGAY = 14` cạnh `KHUNG_XE_TOI_DA_NGAY = 31` (P6-6, K7 của 03); `DRIVER` cấm bắt đầu trong quá khứ; lý do thuộc nhóm `BAN_TAI_XE`. Chồng giờ dùng `chongNuaMo`, hiển thị giờ dùng `nhanKhoangGio` (`src/shared/khung-ban.ts`).
- Ghi chồng chuyến đang xếp — **họ mã `khung_ban_chong_chuyen*`** của Đợt 3 (03 K11): lớp route 409 `khung_ban_chong_chuyen_tai_xe` "Bạn đang có chuyến <mã> lúc …, hãy Từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng" kèm `chuyen: { ma, gio }[]` (không tên khách); lớp CSDL: thêm nhánh vào `loiRangBuocKhungBan` (03 :1130) — `/\bunavailability_driver_overlaps_trip/` → `{ status: 409, code: "khung_ban_chong_chuyen_tai_xe_csdl", message: "Bạn vừa được xếp chuyến trùng giờ này — tải lại để xem chuyến." }`, đặt TRƯỚC nhánh xe; bài `khung-ban.test.ts` thêm ca (khuôn 03 :986-987).
- Xếp / dời của văn phòng: `kiemXep` (và `kiemTaoSuaChuyen` đã có từ Đợt 3) nhận `KiemTaoSuaChuyenVao.khungBan?: KhungBanVao[]` với phần tử `doiTuong: "DRIVER"`, `taiXePartyId` — Đợt 3 đã viết nhánh `TRUNG_GIO_TAI_XE` (03 :572) trong `kiemTaoSuaChuyen`; đợt này **chỉ** (a) nạp khung `DRIVER` còn hiệu lực vào `khungBan` ở nơi dựng đầu vào, (b) thêm cùng vòng lặp cho `kiemXep`. Không thêm trường `khungBanTaiXe`. Máy chủ trả 409 theo `TRUNG_GIO_TAI_XE` ("lịch tài xế bận: <lý do> <khoảng giờ>"); lớp CSDL `lc03_driver_unavailable:` → `trip_rule` qua `loiRangBuocChuyen` (Task 2).
- Không thông báo (D9.4).
- Thêm ô `"unavailability.self": row("none","none","none","none","none","any","none","none","own","none")` CÙNG task này; ghim `DRIVER_PARTNER` (`own`), `DRIVER`, `HR` (`none`); dòng `BANG_STAFF` cho ba route `ban*` (`DRIVER` 403; `DRIVER_PARTNER` 200 / 400 thân rỗng / 404 id lạ) và `ban-tai-xe` (403 cổng office); regex `src/hanh-khach-khong-lo-ten.test.ts:164` thêm `ban|ban-tai-xe`.

- [ ] **Step 1: Bài đỏ** — tiêu chí 8 ADR ở lớp route: chồng chuyến → 409 `khung_ban_chong_chuyen_tai_xe`; `loiRangBuocKhungBan("unavailability_driver_overlaps_trip: …").code` = `khung_ban_chong_chuyen_tai_xe_csdl` và câu xe vẫn ra `khung_ban_chong_chuyen_csdl`; văn phòng xếp vào khung → 409 lý do `TRUNG_GIO_TAI_XE`; dời chuyến vào khung → 409 `TRUNG_GIO_TAI_XE`; `kiemXep` với `khungBan` `DRIVER` chồng → chặn, khung đã rút (không nạp) → qua; `kiemKhungBanMoi(…, "VEHICLE")` 31 ngày vẫn qua (không đổi hành vi Đợt 3); khung người khác (xem/rút) → 404; tài xế công ty ghi → 403; Kế toán `GET ban-tai-xe` → 403; quá 14 ngày → 400; bắt đầu quá khứ → 400; rút lại cùng `requestId` → trả đúng kết quả lần đầu; rút khung đã rút bằng `requestId` khác → 409.
- [ ] **Step 2–4:** đỏ → thi công → xanh + typecheck.
- [ ] **Step 5:** Commit `Báo bận của tài xế đối tác: tự ghi, tự rút; văn phòng thấy khi xếp (ADR-0053 D9)`.

---

### Task 7: Hàng rào không lộ + bất biến + sổ hàng rào

**Files:**
- Modify: `src/hanh-khach-khong-lo-ten.test.ts:163-164`, `src/giay-to-khong-lo-so.test.ts`, `src/tai-xe-cong.test.ts:56-99`, `scripts/audit-invariants.mjs` (+ bài của nó), `docs/SO-HANG-RAO.md`

- [ ] **Step 1:** `hanh-khach-khong-lo-ten` (regex, ca `DRIVER_PARTNER` đã thêm ở Task 4, 6): thêm ca route Từ chối, Báo bận, `ban-tai-xe` không trả tên khách/SĐT/dãy ≥ 8 chữ số (tiêu chí 10).
- [ ] **Step 2:** `giay-to-khong-lo-so`: thêm `tu-choi`, `ban*`, `ban-tai-xe` với dữ liệu mẫu có số bằng lái.
- [ ] **Step 3:** Rà `tai-xe-cong` `BANG_STAFF` đủ mọi route mới (đã thêm ở Task 4–6); không còn dòng `DRIVER_PARTNER` ghi lý do cũ "chưa dùng app cho chuyến".
- [ ] **Step 4:** `audit-invariants` 4 câu (ADR "Hệ quả"): `R-VC-TC-1` dòng `REFUSED` người đóng ≠ tài xế; `R-VC-TC-2` `REFUSED` sau giờ xuất bến thật / sau hạn; `R-VC-BAN-1` khung `DRIVER` còn hiệu lực chồng chuyến chưa huỷ đang xếp cho người đó; `R-VC-48H` chuyến 48 giờ tới chưa có tài xế (**cảnh báo**, không làm thoát 1). Bài gieo lỗi → thoát 1; sạch → 0.
- [ ] **Step 5:** Mỗi hàng rào mới một dòng `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật (từ Step 4 các Task 1, 2, 3, 4): trigger B8.2–B8.4, B9.2–B9.4, bài khung (đột biến `>`→`>=`), bài một hàm khung, ghim hàng mới. Ba dòng nới (`:132`, `:142`, `:148`) ghi "CHỜ CHỦ DUYỆT (đề xuất luật mục 1–3)".
- [ ] **Step 6:** `npm test` xanh; commit `Hàng rào không lộ, bất biến và sổ hàng rào cho tài xế đối tác trên chuyến (ADR-0053)`.

---

### Task 8: E2E trên D1 local

**Files:**
- Modify: `tests/e2e/tai-xe-doi-tac.mjs`, `tests/e2e/dieu-phoi-chay-dua.mjs`

- [ ] **Step 1:** `tai-xe-doi-tac.mjs` thêm bước (mọi chuyến gieo giờ **tương đối giờ thật** — trigger B8.3 so giờ CSDL) (đăng nhập qua `login()`/`session()` của `tests/e2e/lib.mjs`):
  - Cổng (tiêu chí 11): 403 ở `/api/orders`, `/api/orders/dashboard`, `/api/parties`, `/api/catalog`, `/api/van-chuyen/lich`, `/api/van-chuyen/xe`; `GET /api/van-chuyen/cuoc-cua-toi` → 200 chỉ chuyến mình.
  - IDOR (tiêu chí 2): tài xế đối tác A mở / Từ chối / bổ sung tên / báo bận trên chuyến của B → 404.
  - Từ chối trước hạn → 200; chuyến về "chưa có tài xế"; tin tới Bán hàng.
  - D8.5a (tiêu chí 4, giá — **dựa Đợt 4 T2**; luật ở `keHoachChiPhiKhiDoi` + `cauChiPhi` `src/modules/van-chuyen/tien-xe.ts`, kế hoạch 04 :997, :1002 — đợt này KHÔNG viết luật giá): chuyến xe thuê, tài xế đối tác Từ chối, văn phòng giao lại xe nhà xe khác (lệnh sửa chuyến có sẵn) → `GET /api/van-chuyen/chi-phi` (04 :1073) thấy nguồn giá cũ bị đảo (`CPX_DOI_CHUYEN`) và `SNAPSHOT` mới; nguồn cũ `AGREED` → chuyến ở trạng thái `THIEU_GIA`, xuất bến 409, rồi Quản trị `POST …/chuyen/:id/chi-phi/gia-thoa-thuan` (04 :1072) → xuất bến được; nhánh chưa có giá bảng: `POST …/chuyen/:id/chi-phi/chup-lai` (04 :1071) → 409 "Chưa có giá bảng…"; chỉ đổi tài xế cùng nhà xe cùng xe → không dòng chi phí mới. Tài xế đối tác gọi mọi route `…/chi-phi*` → 403; GET chi tiết cuốc: không khoá tiền. (Đo lại đường dẫn route `chi-phi` đầy đủ trong kế hoạch 04 lúc nhận.)
  - Nhờ đón chéo (tiêu chí 9 — **dựa Đợt 5 A-1**): đối tác → xe công ty, công ty → xe nhà xe, xác nhận như nhau.
  - Báo bận: ghi, xem của mình, rút; Kế toán `ban-tai-xe` → 403; Bán hàng thấy.
- [ ] **Step 2:** `dieu-phoi-chay-dua.mjs` (Review Focus 1): `Promise.all([Từ chối, văn phòng đổi tài xế])` lặp 10 lần trên chuyến mới ⇒ mỗi lần đúng một 2xx, một 409, `audit_log` `trip_driver_refused` ≤ 1, dòng lái mở = 1.
- [ ] **Step 3:** `npm run test:e2e -- tai-xe-doi-tac dieu-phoi-chay-dua` rồi đủ bộ; `node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Step 4:** Commit `E2E tài xế đối tác trên chuyến: cổng, IDOR, Từ chối, giá giao lại, chạy đua (ADR-0053)`.

---

### Task 9: Giao diện dùng lại "Cuốc của tôi" (không cần bản vẽ)

ADR: "Màn tài xế cho tài xế đối tác dùng lại V5–V9 (không vẽ riêng nếu giống); thêm dòng 'Thấy danh sách khách từ …'" — nhãn bề mặt.

**Files:**
- Modify: `src/shared/start-page.ts:35` (+ `start-page.test.ts:50-69`), `web/tai-xe.ts:20-23`, `web/cuoc-chuyen.ts`, `web/shell.ts`
- Kịch bản Chrome: `docs/evidence/<ngày>-van-chuyen-dot-6/kich-ban/tai-xe-doi-tac-cuoc.mjs`

**Interfaces:** `coCuocCuaToi(who) = hasPermission(who,"DRIVER") || hasPermission(who,"DRIVER_PARTNER")` (bài ghim mục 3 đề xuất luật). Màn đọc `thayKhachTu`, `hanTuChoi`, `tuChoiDuoc` từ máy chủ, **không tự tính**.

- [ ] **Step 1:** Bài đỏ `start-page.test.ts`: `homeRedirect(DRIVER_PARTNER) === TRANG_CUOC`; `coCuocCuaToi(DRIVER_PARTNER) === true`; bài 512 tập con vẫn xanh.
- [ ] **Step 2:** Thi công; `web/tai-xe.ts` bỏ nhánh "chưa dùng chuyến"; `web/cuoc-chuyen.ts`: khi không có khoá `hoTen` và có `thayKhachTu` ⇒ dòng "Thấy danh sách khách từ <giờ>" (chữ lời thường, token CSS có sẵn). Chưa thêm nút Từ chối (chờ V15).
- [ ] **Step 3:** `npm run build:web`; kịch bản Chrome 390 + 1040 bằng tài khoản `DRIVER_PARTNER` (mở trang của tài khoản đó **sau cùng** — cookie chung): "/" → `/cuoc`; không lời gọi `/api/orders*`; trước khung không hiện tên; không lỗi console. Ảnh vào `docs/evidence/`.
- [ ] **Step 4:** Commit `Tài xế đối tác vào Cuốc của tôi; nhãn "Thấy danh sách khách từ …" (ADR-0053 D7.3)`.

---

### Task 10: Màn V15 — Từ chối + Báo bận (CHỜ BẢN VẼ)

Máy chủ (Task 5, 6) **không** chờ. Màn chỉ làm khi chủ gửi bản vẽ; làm đúng 100% bản vẽ.

**Lệnh vẽ Claude Design (chủ dán nguyên văn):**

> Vẽ màn điện thoại (390 px, kèm bản máy tính 1040 px) cho app "Island Booking System" của Tour Đảo, dùng đúng hệ thiết kế hiện có (phông Be Vietnam Pro, màu/khoảng cách theo token của `public/app.css`, phong cách màn "Cuốc của tôi" và chi tiết chuyến của tài xế đã vẽ ở Bảng điều phối 04). Người dùng: **tài xế của nhà xe đối tác** (người ngoài công ty), không thấy tiền, không thấy đơn hàng.
> **Màn A — Từ chối chuyến** (trong chi tiết một chuyến của tôi):
> 1. Trạng thái **còn hạn**: dòng "Bạn có thể từ chối chuyến này đến 18:00 hôm nay" + nút phụ "Từ chối chuyến" (không nổi bật hơn nút chính "Xuất bến"). Bấm → tấm chọn lý do (bắt buộc một: "Bận lịch khác", "Ốm / việc riêng", "Xe không chạy được", "Khác"; không có ô gõ chữ) + câu nhắc "Từ chối xong bạn không xem lại được chuyến này" + nút xác nhận đỏ.
> 2. Trạng thái **đã qua hạn**: không có nút; dòng "Đã quá hạn từ chối — muốn đổi người hãy gọi văn phòng" + nút gọi văn phòng.
> 3. Chưa tới khung xem khách: dòng "Thấy danh sách khách từ 00:00 ngày 02/10" thay chỗ danh sách tên.
> 4. Báo lỗi "Văn phòng vừa đổi tài xế chuyến này" (khi bấm đúng lúc văn phòng đổi người).
> **Màn B — Báo bận của tôi** (mục mới trong menu tài xế đối tác):
> 1. Danh sách khung bận của tôi (từ … đến …, lý do), khung đã rút mờ đi; trống thì câu hướng dẫn.
> 2. Nút "Báo bận" → biểu mẫu: bắt đầu, kết thúc (ngày + giờ, tối đa 14 ngày, không chọn quá khứ), lý do ("Việc riêng", "Ốm", "Khác"). Ô gõ cỡ chữ 16 px.
> 3. Nút "Rút" trên từng khung còn hiệu lực (hỏi lại một lần).
> 4. Lỗi "Bạn đang có chuyến TR-0123 lúc 06:00 02/10 — hãy Từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng", có liên kết sang chuyến đó.
> **Màn C (văn phòng, nhỏ)**: trên lịch điều phối, dải "Tài xế bận" cho tài xế đối tác (tên + giờ, KHÔNG hiện lý do cho người không xếp xe) và câu chặn khi kéo xếp vào khung bận.
> Không chữ tiếng Anh, không mã kỹ thuật.

- [ ] **Step 1:** Chờ bản vẽ (ghi ở "Cần chủ").
- [ ] **Step 2:** Khi có: trang mới `public/ban.html` + `web/ban.ts` (khai `PAGES` ở `src/shared/sw-policy.ts`, script `build:web`), nút Từ chối trong `web/cuoc-chuyen.ts` hiện theo `tuChoiDuoc` của máy chủ và `can(trip.refuse)`; dải bận ở màn điều phối theo `can(trip.dispatch)`.
- [ ] **Step 3:** Kịch bản Chrome 390 + 1040 (tài xế đối tác + Bán hàng), ảnh `docs/evidence/`.
- [ ] **Step 4:** Commit `Màn Từ chối chuyến và Báo bận theo bản vẽ V15 (ADR-0053)`.

---

### Task 11: Tài liệu, nhật ký phiên bản, kiểm độc lập

- [ ] **Step 1:** `docs/SYSTEM-DESIGN.md` (§5 bảng mới, §7 route, §8 quyền), `docs/CHANGE-GUIDE.md` công thức y thêm dòng "tài xế đối tác trên chuyến"; `docs/adr/README.md` — **không sửa** (điều phối/chủ cập nhật; chỉ ghi đề xuất ở tệp đề xuất luật).
- [ ] **Step 2:** Mục nhật ký phiên bản `src/shared/changelog.ts` (số = lớn nhất ở `origin/main` + 1 lúc gộp) + `src/shared/app-info.test.ts`; lời thường: "Tài xế nhà xe đối tác dùng app cho chuyến mình lái; Từ chối chuyến trước 12 giờ; Báo bận".
- [ ] **Step 3:** Nhật ký thi công `docs/superpowers/plans/<ngày>-van-chuyen-dot-6-nhat-ky.md` (Task 0 kết quả, các đột biến đỏ→xanh, nợ).
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e` đủ bộ, `node scripts/audit-invariants.mjs --db local`.
- [ ] **Step 5:** Gọi **người kiểm độc lập chỉ-đọc** (`nguoi-kiem-doc-lap`): đối chiếu từng tiêu chí 1–12 ADR-0053, P6-1…P6-9, cửa một chiều, ba mục nới. Chỉ báo "đạt" từ báo cáo đó.
- [ ] **Step 6:** Trình chủ: tệp đề xuất luật (chưa duyệt thì không gộp) + lệnh `npm run day-len -- <nhánh>` rồi `npm run trien-khai`; sau deploy `node scripts/kiem-phien-ban.mjs --sau-deploy`; chủ thử bằng **tài khoản tài xế đối tác thật trên iPhone** trước khi báo nhà xe.

---

## Cần chủ (≤ 3)

1. **Bản vẽ V15** (lệnh vẽ ở Task 10): Từ chối chuyến, Báo bận, dải bận trên lịch. Máy chủ làm trước, không chờ.
2. **Duyệt tệp đề xuất luật** (Task 3): nới ghim hàng Tài xế đối tác, bảng route tài xế, trang đầu `/cuoc`; kèm `web/CLAUDE.md`, `CLAUDE.md` §10. Chưa duyệt thì không gộp. *(Thông tin, không cần quyết: biên đúng-bằng-hạn được siết — đúng giây hạn vẫn Từ chối được nhưng chưa thấy khách — P6-2.)*
3. **Thử bằng một tài khoản tài xế đối tác thật trên iPhone** trước khi báo nhà xe (cửa một chiều). Nếu Task 0 thất bại: thay mục này bằng "chọn cách xử lý trigger so giờ CSDL" — đợt dừng tới khi chủ quyết.

## Chưa chắc (người thi công kiểm lúc nhận)

- Tên lấy từ kế hoạch con 02–05 (mục 0, các khối Consumes) là tên KẾ HOẠCH — `grep` lại trên `main` sau khi các đợt đó gộp; số dòng `0N :xxx` là dòng của tệp kế hoạch con ngày 2026-10-01.
- Chữ ký mở rộng `kiemKhungBanMoi(body, bayGioMs, subject)` là đề xuất; nếu Đợt 3 đã đổi chữ ký, giữ nguyên tắc "một hàm, hằng theo `subject`".
- Trigger so giờ CSDL trên D1 local (Task 0).
- D8.3: Toàn quyền không lái → 403 (ADR) trong khi người khác không lái → 404 — thi công giữ đúng chữ ADR; nếu khung route chung chỉ cho một mã, nêu ở nhật ký.
- Pháp lý đưa danh sách hành khách cho tài xế nhà xe (ADR "Chưa kiểm") — chưa có người chuyên môn kiểm.
