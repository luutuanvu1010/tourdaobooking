# Vận chuyển Đợt 4 — Tiền xe thuê (ADR-0057 T1 + T2): KẾ HOẠCH THI CÔNG

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Bảng giá thuê xe theo nhà xe (T1) và chi phí từng chuyến xe thuê chụp lúc xếp, chỉ-thêm, thiếu giá thì không xuất bến (T2) — đủ hai lớp (CSDL + máy chủ), có bảng kê cho Kế toán.

**Architecture:** Mọi bảng mới thuộc module `van-chuyen` (tiền tố `vc_`), không cạnh module mới. Luật tiền là hàm thuần trong `src/modules/van-chuyen/tien-xe.ts` (một nguồn tính); chụp / đảo chi phí đi **trong cùng lô** của lệnh chuyến (ADR-0049 D1: cổng → nhật ký → câu có dấu lệnh → trạng thái cuối). Cổng `THIEU_GIA` hai lớp: `kiemXuatBen` (máy chủ) + trigger `thieu_gia` (CSDL). Giao diện theo bản vẽ Claude Design đã nhận 2/10 (Task G1–G5).

**Tech Stack:** Cloudflare Worker + D1 (SQLite), TypeScript, `node --test` + `node:sqlite`, khung thử `tests/audit/dieu-phoi-khung.mjs`, e2e `tests/e2e/*.mjs`, giao diện thuần `web/*.ts` (`h()`).

**Spec:** `docs/adr/ADR-0057-van-chuyen-tien-xe-thue.md` (accepted 30/9 — đọc đủ 364 dòng); trang ghép `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-b-kernel-tien.md`; lộ trình mẹ `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md` (Đợt 4); ADR-0080 điều 3 (L-T1); ADR-0049 D1–D3; ADR-0071 (cột `HR`).

---

## Cập nhật 2026-10-02 — theo bản vẽ Claude Design + lời chủ

- **Máy chủ Task 0–12 ĐÃ THI CÔNG** trên nhánh `worktree-agent-a76ababaa4a5b3183` @ `8094df2b`. Nhánh đã gộp sẵn Đợt 2 (`271b7687`). Người kiểm độc lập kiểm 2 vòng, ĐẠT. T1 = `ad3cdf89..b3a94e6f`. Commit từng task ghi ở nhật ký thi công `docs/superpowers/plans/2026-10-02-van-chuyen-dot-4-nhat-ky.md` trên nhánh đó. Số liệu: `npm test` 2873 (1 todo là sổ vàng lớp 2), typecheck 0, e2e 43/43. Migration `0072`/`0073`, nhật ký phiên bản 1.70 (đánh số lại lúc gộp).
- **Cần chủ 1/2/3 cũ đã trả lời:** 0 chuyến xe thuê cũ (cờ `DEFAULT 0`); T2 chờ có màn (A); dời ngày cũng tính lại giá (A, ca RF1-g là bài thật).
- **Yêu cầu từ bản vẽ đã có trong DTO** (`src/shared/contracts.ts` trên nhánh): `BangGiaDto.trangThai`, `NhaXeBangGiaDto.dangHopTac`, `CoXeDto.soDongGiaDangAp`. Máy tự sinh mã tuyến/cỡ (`T001`/`S001`). `DongChiPhiDto.{daoDuoc, tuDong, lyDo{ma,nhan}}`; `ChiPhiChuyenDto.{coTheNhapThoaThuan, coTheChupLai, lyDoChon}`. Bảng kê có `BangKeResponse.{tongCong, soChuyen, soNhaXe, soThieuGia}`, `BangKeNhomDto.{soChuyen, tongNhom}`, `BangKeDongDto.{nhomTrangThai, tongDieuChinh}`. Route `dieu-chinh` trả 409 `tong_am`. Nhãn `CPX_DOI_CHUYEN` = "Đảo do đổi chuyến (xe, nhà xe, tuyến hoặc ngày chạy)".
- **Chưa làm (chờ chủ):** trường `giaBangCoThe` (câu 4.3 → **Task 13** mới); nút "Tải bảng kê" (câu 4.1, khuyến nghị chưa làm).
- **Giao diện:** mục "Giao diện" viết lại thành **Task G1–G5** theo bản vẽ. G5 mới: nền thanh bên toàn app (câu 4.5).
- **Mục "Lúc gộp" mới** (cuối kế hoạch): kiểm lại khoá kỳ ADR-0080, đánh số phiên bản, số migration, lệnh đếm Task 0, sổ vàng.
- **Bản vẽ:** `docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html` (3 màn × 1040/390). Dự án Claude Design: `f0f47482-c51a-4232-b5c0-d924871ce294`. Câu hỏi chung: `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md` (mã 4.1–4.8).

---

## 0. Đo lại ở HEAD (`0ba370d6`, 2026-10-01) — ADR trích `@49` cũ, số dòng dưới đây là số THẬT hôm nay

| Điều ADR nói | Thật ở HEAD | Hệ quả cho kế hoạch |
|---|---|---|
| T3 (`bil_debt_line.trip_id`, `CHECK` đúng một nguồn, trigger chặn) | **ĐÃ CÓ**: `migrations/0045_billing_so_cong_no.sql:124-125` (cột), `:135` (`CHECK ((order_id IS NULL) <> (trip_id IS NULL))`), `:137`, `:219-221` (`bil_debt_line_trip_not_yet`) | **Không lập task.** Không chạm `billing`. |
| ADR:218 khoá ngoại `billing → van-chuyen`, `architecture.test.ts:259-277 @49` | `ALLOWED_EDGES` ở `src/architecture.test.ts:20` (`"van-chuyen": ["parties","audit","orders","locations"]` `:60`); bài khoá ngoại theo `integrityEdges` `:265`, `:299-316`; bài "KHÔNG module nào import van-chuyen" `:840`; `VIEW_CHO_TRIGGER_VC` `:857`; bài thân trigger hỏi SQLite `:952-1018` | T1/T2 chỉ có khoá ngoại `vc_ → vc_` và `vc_ → pty_party` (cạnh `van-chuyen → parties` có sẵn) ⇒ **không** cạnh mới, **không** `integrityEdges` mới. ADR:218 chỉ thuộc T3/T4 — ngoài phạm vi. |
| `vc_trip` "chưa lên `main` / remote" (C2a — lý do `DEFAULT 0` không backfill) | **SAI hôm nay**: `0042` đã lên production 30/9 bản 1.38 (`docs/HANDOFF-N1.md:58`, `:66`) | **Task 0 là cổng dừng** — đếm chuyến xe nhà xe đang có (Cần chủ 1). ADR C2a tự dặn: "phát hiện đã có chuyến xe thuê cần giữ → dừng, hỏi". |
| ADR-0080 không cần cho T1/T2 | **Đúng có điều kiện.** ADR-0080 điều 3 (`docs/adr/ADR-0080-quyet-toan-thang-va-khoa-ky.md:61`): nếu module `ky-so` gộp `main` **trước** T2 thì migration T2 **phải có sẵn** trigger `vc_trip_cost_line_period_closed` đọc `v_ky_closed_period`. Hôm nay chưa nhánh nào có `ky_period_close` (`git log --all -S ky_period_close` chỉ ra commit tài liệu) | Task 6 bước 1 kiểm lại `main`; có `ky-so` thì thêm trigger + `R-KY-1` mở rộng vào Task 7 (khuôn ở Task 7 bước 3b). |
| `MATRIX` 9 cột (`permissions.ts:5 @49`) | **10 cột** — `HR` thêm cuối (`src/shared/permissions.ts:5`, `:44-48`) | Bốn ô mới: `HR = none` (ADR-0071: mọi ô nghiệp vụ ngoài tài khoản = none). |
| `kiemXuatBen` `dieu-phoi-kiem.ts:252`; `MA_GIU` `ly-do-giu.ts:18` | `src/shared/dieu-phoi-kiem.ts:302`; `MA_GIU` `src/shared/ly-do-giu.ts:18-62`; ba nơi gọi: `src/modules/van-chuyen/dieu-phoi-tien-do.ts:77,99`, `dieu-phoi-route.ts:192`, `src/shared/dieu-phoi-lich-chung.ts:155` | Thêm hai trường vào `ChuyenVao` (`src/shared/dieu-phoi-kieu.ts:242`), dựng ở `chuyenVao` (`dieu-phoi-doc.ts:77`) — mọi nơi gọi tự có. |
| `vc_trip_carrier_ins` `0042:497`, `vc_trip_final_frozen` `:412`, `vc_trip_identity` `:281`, `vc_trip_running_requires_check` `:396` | Đúng số dòng ở `migrations/0042_chuyen_xe.sql` | Trigger mới theo khuôn. |
| `nhaXeDangHopTac` `parties/index.ts:103` | `src/modules/parties/index.ts:134`; `ownerCompany` `:100`; `partySummary` `:61` | Phân loại xe thuê ở máy chủ dùng hai hàm này (không thêm hàm "isCarrier"). |
| Fixture phải đổi (`audit-invariants.test.ts:1075`, `migrations-chuyen-xe.test.ts:115`, `:683`) | `src/migrations-chuyen-xe.test.ts:115` (hàm `chuyen()` — **phải** tính `rented`), `:624` (chèn xe nhà xe với chủ chụp = công ty chủ — mong `lc13_carrier`; giữ được nếu trigger mới phân loại theo `NEW.carrier_party_id`), `:683` (xe công ty — không đổi); `src/audit-invariants.test.ts:1126` (`chuyenTho` — `tho()` `:1110` gỡ MỌI trigger `vc_trip%` ⇒ dự kiến **không** phải sửa; đo lại) | Task 7 bước 4. |
| Bài thứ tự lô | `src/modules/van-chuyen/thu-tu-lo.test.ts`: tự quét mọi `export function` của `dieu-phoi.ts`; lính gác `LINH_GAC = /EXISTS \(SELECT 1 FROM vc_trip WHERE id = \?(\d+) AND last_cmd_id = \?(\d+)\)/` | Mọi câu chi phí trong lô mang **đúng** chuỗi đó (điều kiện thêm đặt SAU, bằng `AND`). Lô mới / nhánh mới → thêm mẫu vào `MAU`. |
| Route chỉ được bài hàng rào 2 thấy khi khai ở `src/modules/<m>/index.ts` | `src/route-write-guard.test.ts:33`, `:153-179` | Route mới khai ở `src/modules/van-chuyen/index.ts` (thân mỏng), xử lý ở tệp riêng. |
| Cổng `office` | `OFFICE_GATE = ["SALES","ACCOUNTING","ADMIN","SUPER_ADMIN"]` (`src/shared/permissions.ts:252`) | Kế toán qua được cổng — route tiền đặt cổng `office`. |
| Sổ vàng | `src/so-vang.test.ts:18` `FILES` chỉ hiểu khuôn sổ công nợ; tiền lệ khuôn riêng: `golden/dieu-phoi/xe-a-b-luot-1.json` + `src/dieu-phoi-ca-mau.test.ts` | Tệp `golden/van-chuyen-chi-phi.json` + bài riêng `src/so-vang-chi-phi-xe.test.ts` (tự chốt TC-3). |
| `docs/quyen-hoan.json` | `phat_hien = []`; `thao_tac` = `task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue` | Không xây trên lỗ đang hở. Không thêm mục hoãn. |

---

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`THIEU_GIA`, `SNAPSHOT`, `AGREED`, `PER_TRIP`, `carrier_inactive`…) trên màn.
- Tiền = `INTEGER` VNĐ (`CHECK (amount = round(amount))` — repo chưa có tiền lệ `typeof(...) = 'integer'` với giá trị bind từ D1, nên không dùng; e2e Task 4/9 khẳng định `SELECT typeof(amount)` = `integer` trên D1 local), chỉ tính ở máy chủ, **chỉ qua `tongChiPhiChuyen` / `chonDongGiaThue`** (5.4); không tin số tiền từ trình duyệt ngoài ô người có quyền nhập (giá bảng, giá thoả thuận, điều chỉnh).
- Ngày dân sự giờ Việt Nam (`vnToday`, `service_date`); dấu thời gian ISO UTC, MỘT mốc giờ mỗi request (`toISOString()` của máy chủ).
- Không xoá cứng; `vc_rental_rate`, `vc_trip_cost_line` chỉ-thêm; đổi giá = đóng dòng cũ + thêm dòng mới; sai tiền = dòng đảo / điều chỉnh có lý do.
- Migration chỉ thêm tệp mới, số = lớn nhất trong `migrations/` của `main` **và mọi nhánh chưa gộp** + 1 (lộ trình L2); không sửa `0042`.
- Trigger `vc_` chỉ đọc bảng `vc_` + view trong `VIEW_CHO_TRIGGER_VC` (`v_pty_carrier`, `v_pty_owner_company` đã có) — bài `src/architecture.test.ts:952-1018`.
- Lệnh chuyến là MỘT `db.batch`: cổng → nhật ký → (đảo âm → đảo dương) → ghi chuyến → … → chụp mới → trạng thái cuối; mọi câu sau nhật ký mang `EXISTS (SELECT 1 FROM vc_trip WHERE id = ?a AND last_cmd_id = ?b)`.
- Chi phí chuyến là **giá vốn**: không bao giờ vào DTO của `orders`, DTO tài xế, lịch chung, chi tiết chuyến, phản hồi lệnh xếp/sửa, biên nhận. Chỉ route hỏi `transport.cost.*`.
- `ADMIN = ACCOUNTING` ở cả bốn ô `transport.*` (chủ lần 18 "Hai vai giống hệt"); `DRIVER`, `DRIVER_PARTNER`, `HR`, `FIELD`, `PARTNER`, `INTERN`, `SALES` = `none`.
- `transport.rate.*` vào `MATRIX` cùng bản phát hành có route T1 hỏi; `transport.cost.*` chỉ vào ở bản phát hành T2 (ADR Hệ quả :280).
- Nhật ký (`audit_log.detail`) chỉ: mã chuyến, biển số, tên nhà xe, tên tuyến, số tiền trước→sau, nhãn lý do; không tên/SĐT khách.
- Giao diện: không `innerHTML`; CSS chỉ token; ô gõ 16px; ẩn/hiện bằng `can()`; trang mới khai `PAGES` (`src/shared/sw-policy.ts:16`, `:25`, `:30`) + script `build:web`; kịch bản Chrome 390 + 1040; màn làm đúng bản vẽ 2/10 (`docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html`); **web không cộng, không đếm tiền**, chỉ định dạng số máy chủ trả bằng `vnd()` (`web/format.ts`).
- Việc TIỀN + DỮ LIỆU + QUYỀN ⇒ người kiểm độc lập chỉ-đọc (`nguoi-kiem-doc-lap`) sau **mỗi lát** (T1, T2 máy chủ, T2 giao diện); người thi công không tự nghiệm thu.
- Lệnh cấm AI tự chạy (CLAUDE.md §8) giữ nguyên — chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai`; mọi câu SQL trên D1 remote (kể cả chỉ đọc) do chủ chạy bằng `--command`, không `--file` (lỗi OAuth 10000).

## Review Focus

1. **Đổi xe / nhà xe / tuyến SAU khi đã chụp giá** (lộ trình dòng 2) ⇒ đúng một lần đảo + một lần chụp lại trong cùng lô; nguồn cũ là giá thoả thuận thì không tự chuyển; nhà xe của chuyến đã thôi ⇒ cả lệnh 409 `carrier_inactive`, không dòng đảo lẻ. Bài: Task 9 bước 1 (ca RF1-a…RF1-f).
2. **Kế toán ghi điều chỉnh đúng lúc văn phòng huỷ / đổi chuyến** ⇒ một bên thắng, bên kia 409 "thử lại", không bao giờ còn điều chỉnh chưa đảo trên chuyến đã huỷ. Bài: Task 9 bước 1 ca RF2 + Task 10 bước 1 ca "phiên bản chi phí cũ".
3. **Ranh ngày hiệu lực + chuyến qua nửa đêm** ⇒ giá tra theo `service_date` (ngày VN của giờ bắt đầu), dòng giá hết hạn đúng `valid_to_date` vẫn áp, hôm sau không. Bài: Task 1 (bảng ca), Task 9 ca RF3.
4. **Số tiền lộ cho người không có ô** (Bán hàng xếp xe gây chụp; HDV có `money.view = assigned`; tài xế; Đối tác) ⇒ không thấy `480017` ở bất kỳ phản hồi nào. Bài: Task 11 bước 1 (bài số lạ, có đỏ một lần).
5. **Bấm hai lần cùng `requestId` / mạng gửi lại** lệnh tạo / sửa chuyến xe nhà xe ⇒ không có hai `SNAPSHOT`. Bài: Task 9 ca RF5 (lệnh lặp trả kết quả cũ; trigger một nguồn giá là lưới thứ hai).

---

## Cần chủ (câu đang mở — mã ở `docs/superpowers/plans/2026-10-02-van-chuyen-cau-hoi-ban-ve.md`)

Mỗi câu đã có khuyến nghị. Kế hoạch đang làm theo khuyến nghị, đánh dấu `[chờ chủ xác nhận câu 4.x — đang theo khuyến nghị]` ở đúng task.

- **4.1** Nút "Tải bảng kê": khuyến nghị **chưa làm** lượt này. G4 không có nút; lượt sau làm cùng sổ công nợ nhà xe (ADR-0057 T4).
- **4.2** Cột "Điều chỉnh" ở bảng kê = **số tiền** do máy chủ tính (`tongDieuChinh`, đã có trên nhánh). Chọn "số lần" thì G4 hiện `soDieuChinh`.
- **4.3** Gợi ý "Bảng giá vừa có giá …" cần trường máy chủ mới `giaBangCoThe` → **Task 13**. Chủ chọn B thì bỏ Task 13; G2 hiện nút "Lấy lại giá bảng" theo `coTheChupLai`, không kèm số.
- **4.4** Bán hàng **không** thấy dải "chưa có giá". Họ chỉ thấy lý do giữ trong thẻ "Điều kiện xuất bến" có sẵn, không số tiền (G2).
- **4.5** Nền thanh bên toàn app = `--c-surface-alt` + viền phải (G5). Đây là việc bề mặt chủ đã dặn; chỉ hỏi để chủ xác nhận bằng mắt.
- **4.6** Sổ vàng 19 ca (`golden/van-chuyen-chi-phi.json`) chờ Kế toán / chủ ghi tên + ngày xác nhận. **Chặn phát hành**: chưa có ca xác nhận thì chưa nhận mã tiền.
- **4.7** Phí cho nhà xe cũ trên chuyến đã đổi sang xe công ty (chưa huỷ): khuyến nghị **chặn** như nhánh đang làm (409 "Chuyến này không còn là xe thuê"). ~~G2 ẩn nút "Điều chỉnh" khi `!thue`.~~ **Đã thay bởi ADR-0095 Q5** (chủ trả lời 4.7 "có"): Kế toán ghi được "Phí huỷ muộn" cho nhà xe cũ ⇒ nút "Điều chỉnh" hiện khi chuyến có dòng chi phí, kể cả `!thue`; máy chủ chỉ nhận lý do Phí huỷ muộn khi `rented = 0`.
- **4.8** Ghi dòng trạng thái ADR-0057 trỏ lời chủ 2/10 "dời ngày chạy cũng tính lại giá" (C4 chỉ liệt kê đổi nhà xe / xe / tuyến). Kèm lời `carrier_inactive` theo ca dời ngày. Chủ / điều phối làm, người thi công không sửa ADR.

<details><summary>Ba câu cũ (1/10) — ĐÃ TRẢ LỜI, giữ để tra</summary>

Đã trả lời (lộ trình mẹ, lời chủ 1/10): câu 1 = 0 chuyến (cờ `DEFAULT 0`); câu 2 = A; câu 3 = A (đã thi công, RF1-g là bài thật).

1. **Chuyến xe nhà xe đã có trên production từ 30/9.** ADR viết lúc bảng chuyến chưa lên, nên tính "không có chuyến xe thuê cũ". Chủ chạy một lệnh **chỉ đếm** (Task 0 bước 1) rồi chọn:
   - **(A) Khuyến nghị — để nguyên chuyến cũ là "không thuê" (cờ 0):** chuyến cũ không bị đòi giá; cảnh báo định kỳ `R-VC-COST-6` liệt kê để Kế toán ghi tay. Được: không chuyến nào bị giữ đột ngột ngày triển khai. Mất: các chuyến đó không có chi phí trong bảng kê.
   - **(B) Đánh dấu "thuê" cho chuyến CHƯA chạy (`PLANNED`):** chúng bị giữ "thiếu giá" từ ngày triển khai tới khi Kế toán nhập giá. Chuyến đã chạy / kết thúc / huỷ **không** sửa được (trigger khoá chuyến đã kết thúc; chuyến đang chạy sẽ thành vi phạm `R-VC-COST-5`).
   - Nếu lệnh đếm ra 0 ở mọi trạng thái: không cần chọn, đi tiếp như ADR.
2. **Đưa phần chi phí chuyến (T2) lên production khi nào.** Khi T2 chạy, chuyến xe nhà xe **không xuất bến được** nếu chưa có giá — mà chưa có màn để nhập giá thì mọi chuyến xe nhà xe bị giữ.
   - **(A) Khuyến nghị:** đưa **bảng giá (T1, chỉ máy chủ)** lên ngay (vô hại); phần **chi phí chuyến (T2)** giữ trên nhánh, chỉ gộp + triển khai **cùng lúc** với màn "Bảng giá thuê xe" và ô "Giá thoả thuận" trên chuyến (cần bản vẽ). Được: không ngày nào chuyến bị giữ mà không có cách gỡ. Mất: phải chờ bản vẽ; **kéo theo** Đợt 5 A-1b (bổ sung tên, cứu hộ) và Đợt 6 (tài xế đối tác) cũng chờ (lộ trình xếp chúng sau T2); nhánh T2 sống lâu sẽ phải gộp lại nhiều lần với các đợt song song cùng sửa tệp điều phối.
   - (B) Đưa T2 lên trước, Kế toán nhập giá bằng công cụ tạm (không có màn): rủi ro chặn xe thật — **không khuyến nghị**.
   - (C) Làm màn tạm không qua bản vẽ: trái bài học "màn mới chờ bản vẽ".
3. **Đổi NGÀY chạy (dời giờ sang hôm khác) sau khi đã chụp giá.** ADR chỉ liệt kê đổi xe / nhà xe / tuyến là lúc tính lại; giá lại tra theo ngày chạy và dòng chi phí mang ngày chạy lúc chụp.
   - **(A) Khuyến nghị — dời ngày cũng tính lại** (đảo + chụp theo bảng giá của ngày mới; giá thoả thuận bị huỷ, nhập lại như đổi tuyến). Được: bảng kê theo tháng đúng ngày chạy, giá đúng mùa. Mất: dời giờ qua nửa đêm cũng làm mất giá thoả thuận.
   - (B) Giữ giá đã chụp (đúng chữ ADR), chỉ ngày trên dòng chi phí lệch ngày chạy mới.
   - Đây là quyết định về tiền ⇒ AI không tự chọn. Task 9 làm sẵn đường (B) (đúng chữ ADR) và **đánh dấu bài chờ** ca RF1-g; chủ chọn (A) thì đổi một điều kiện (Task 9 bước 3, `canChupLai`) + bài.

(Lệnh vẽ đã dùng; bản vẽ đã nhận 2/10. Việc xác nhận "ví dụ vàng" nay là câu 4.6.)

</details>

## Tự chốt khi lập kế hoạch (bề mặt, đảo ngược được — ghi lại, không hỏi)

| # | Điều | Chốt | Vì sao / cách đổi |
|---|---|---|---|
| TC-1 | Tên bảng / cột / route / mã lý do (G-T2) | như mục "Cấu trúc tệp" và các task | ADR giao kế hoạch chốt; đổi trước khi migration lên remote |
| TC-2 | Luật tiền đặt ở đâu | `src/modules/van-chuyen/tien-xe.ts` (không `src/shared/`) | `web/` không được tính tiền; `src/shared` không cần; module-local giữ "một nguồn tính" dễ rào |
| TC-3 | Sổ vàng | `golden/van-chuyen-chi-phi.json` + bài riêng `src/so-vang-chi-phi-xe.test.ts` (ADR C12 nói "thêm vào `FILES` của `so-vang.test.ts`") | `so-vang.test.ts` chỉ hiểu khuôn sổ công nợ; tiền lệ `dieu-phoi-ca-mau.test.ts`. Ghi vào `golden/README.md` |
| TC-4 | Cột `HR` bốn ô mới | `none` | ADR-0071 đã duyệt nguyên tắc "mọi ô nghiệp vụ ngoài tài khoản = none"; ADR-0057 soạn trước khi có cột này |
| TC-5 | Hàng ghim `DRIVER`/`DRIVER_PARTNER`/`HR`/`PARTNER` | thêm bốn ô với giá trị `none` | Là **siết** (khai báo none), không nới ⇒ **không cần tệp đề xuất luật** (Điều 9.4). Nếu người thi công thấy cần giá trị khác `none` ở các hàng đó → DỪNG |
| TC-6 | Mã lý do hệ thống cho đảo tự động | `CPX_DOI_CHUYEN` ("Đảo do đổi chuyến (xe, nhà xe, tuyến hoặc ngày chạy)" — sửa 2/10 theo bản vẽ + lời chủ dời ngày, đã có ở `0073` trên nhánh), `CPX_HUY_CHUYEN` ("Đảo do huỷ chuyến") vào `MA_LY_DO_HE_THONG` (`src/shared/dieu-phoi-kieu.ts:30`) | ADR nói một mã hệ thống; lô huỷ cũng cần lý do cho `REVERSAL` (CHECK) ⇒ thêm mã thứ hai; không ngưng được (R-P22) |
| TC-7 | Lý do người ghi, nhóm `CHI_PHI_XE` | `CPX_PHU_THU_CHO` (Phụ thu chờ thêm giờ), `CPX_CAU_DUONG` (Phí cầu đường / bến bãi), `CPX_HUY_MUON` (Phí huỷ muộn), `CPX_NHAP_SAI` (Nhập sai), `CPX_GIA_THOA_THUAN` (Giá thoả thuận trước), `CPX_KHAC` (Khác) | Danh mục là dữ liệu, Quản trị sửa ở màn Lý do có sẵn |
| TC-8 | Khoá chống ghi chồng của route Kế toán (ADR C9 "kế hoạch chốt") | `phienBanChiPhi` = `count(*)` dòng chi phí của chuyến; câu ghi `… WHERE (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?) = ?` | Không chạm `vc_trip` (bị `vc_trip_final_frozen` khoá sau kết thúc); lô chuyến chèn dòng đảo làm số đếm đổi ⇒ hai bên loại trừ nhau |
| TC-9 | Trigger cờ `rented` | ba trigger một-việc: (a) lúc chèn khớp phân loại theo `NEW.carrier_party_id`; (b) lúc đổi xe/chủ: chủ mới là công ty chủ ⇒ 0, đang là nhà xe ⇒ 1, còn lại không ràng; (c) cấm hạ `1→0` khi chủ mới không phải công ty chủ; (d) cấm đổi riêng `rented` | Mỗi hàng rào một phép đột biến (khuôn 0038 B1.2); phân loại theo chủ chụp để `lc13_carrier` (`:624`) vẫn báo trước |
| TC-10 | `R-VC-COST-3` | "chuyến `rented = 0` có **nguồn giá chưa đảo** hoặc **tổng ≠ 0**" (không phải "có dòng") | Chuyến đổi từ xe nhà xe sang xe công ty giữ các dòng đã đảo (tổng 0) — chữ ADR "không có dòng" sẽ báo nhầm. **Người kiểm soi.** |
| TC-11 | `ADJUSTMENT` cho chuyến nào | chỉ chuyến đã từng có dòng chi phí (≥ 1 dòng) | Phí huỷ muộn cho chuyến đã đổi sang xe công ty vẫn ghi được; chuyến xe công ty thuần không có đường |
| TC-12 | Ngày hiệu lực giá | `valid_to_date` **tính cả ngày đó** (ADR tiêu chí 1: ngày chạy = `valid_to_date` → áp); "thay dòng X" đóng X ở `valid_from_date(mới) − 1 ngày`, dòng mới phải bắt đầu sau ngày bắt đầu của X | Khuôn `vc_vehicle` (`valid_to_date >= valid_from_date`) |
| TC-13 | Cỡ xe đổi | danh mục `vc_vehicle_size` khoảng **không chồng** giữa các cỡ đang dùng; đổi khoảng = thêm cỡ mới + ngưng cỡ cũ; mã, khoảng bất biến | ADR B1 "đổi bằng thêm dòng / ngưng dùng" |
| TC-14 | Giới hạn bảng kê | khoảng `tu..den` ≤ 92 ngày | chống quét lớn; đổi một hằng |

---

## Ví dụ vàng (cho Kế toán đọc TRƯỚC khi thi công — đáp án do Kế toán / chủ xác nhận, AI không tự xác nhận)

Bảng giá của **Nhà xe Hùng Phát** (tuyến **NT-CR** = "Nha Trang – sân bay Cam Ranh", tuyến **NT-DL** = "Nha Trang – Đà Lạt"; cỡ **C16** = 10–16 khách, cỡ **C29** = 17–29 khách; khách không kể tài xế):

| Dòng | Tuyến | Cỡ | Giá mỗi chuyến | Hiệu lực |
|---|---|---|---|---|
| G1 | NT-CR | C16 | 1.200.000 | 01/10/2026 – 31/10/2026 |
| G2 | NT-CR | (trống) | 1.000.000 | 01/10/2026 – 31/10/2026 |
| G3 | (trống) | C16 | 900.000 | từ 01/10/2026 |
| G4 | NT-CR | (trống) | 1.100.000 | từ 01/11/2026 (thay G2) |

| Ca | Chuyện xảy ra | Các dòng chi phí sinh ra (theo thứ tự) | Tổng | Xuất bến? |
|---|---|---|---|---|
| V1 | Chuyến 15/10, xe 16 chỗ của Hùng Phát, tuyến NT-CR | Giá bảng **+1.200.000** (G1 — khớp tuyến + cỡ) | 1.200.000 | Được |
| V2 | 15/10, xe 29 chỗ, tuyến NT-CR | Giá bảng **+1.000.000** (G2 — khớp tuyến, cỡ trống) | 1.000.000 | Được |
| V3 | 15/10, xe 16 chỗ, chưa chọn tuyến | Giá bảng **+900.000** (G3 — khớp cỡ) | 900.000 | Được |
| V4 | 15/10, xe 16 chỗ, tuyến NT-DL (không có giá theo tuyến này) | Giá bảng **+900.000** (G3) | 900.000 | Được |
| V5a | **31/10**, xe 29 chỗ, NT-CR | **+1.000.000** (G2 — còn hiệu lực đúng ngày cuối) | 1.000.000 | Được |
| V5b | **01/11**, xe 29 chỗ, NT-CR | **+1.100.000** (G4) | 1.100.000 | Được |
| V6 | 15/10, xe 29 chỗ, chưa chọn tuyến (không dòng nào khớp) | (không dòng nào — **không bao giờ ghi 0 đồng**) | 0 | **Không** — bị giữ "chưa có giá" |
| V6b | Tiếp V6: Kế toán nhập **giá thoả thuận** 1.350.000 (lý do "Giá thoả thuận trước", ghi chú "đã chốt với anh Hùng 14/10") | **+1.350.000** (thoả thuận) | 1.350.000 | Được |
| V7 | V1 rồi Kế toán ghi **+150.000** "Phụ thu chờ thêm giờ"; sau đó văn phòng **đổi tuyến sang NT-DL** trước xuất bến | +1.200.000; +150.000; (lô đổi) **−150.000** (đảo phụ thu), **−1.200.000** (đảo giá cũ), **+900.000** (G3) | 900.000 | Được; bảng kê hiện "1 điều chỉnh bị đảo do đổi chuyến" |
| V8 | V1 rồi Kế toán ghi **−200.000** "Nhập sai"; sau đó văn phòng **huỷ chuyến** | +1.200.000; −200.000; (lô huỷ, âm trước) **+200.000**, **−1.200.000** | **0** | — (đã huỷ) |
| V8b | Tiếp V8: Kế toán ghi **+300.000** "Phí huỷ muộn" | … +300.000 | 300.000 | — |
| V9 | V1 + (−200.000); Kế toán **tự đảo giá bảng** | bị từ chối: "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước" | 1.000.000 (không đổi) | — |
| V10 | V1, xe hỏng giữa đường (kết thúc gián đoạn); Kế toán ghi **−400.000** "Khác" | +1.200.000; −400.000 | 800.000 | (đã chạy) |
| V11 | V1 đã chụp; **sau đó** Quản trị thêm giá mới cùng tuyến/cỡ áp từ hôm nay | không đổi | 1.200.000 | Được |
| V12 | V6b (thoả thuận 1.350.000) rồi đổi tuyến sang NT-CR | **−1.350.000** (đảo thoả thuận), **+1.000.000** (G2) — thoả thuận **không** tự chuyển | 1.000.000 | Được |
| V12b | V6b rồi đổi tuyến sang tuyến không có giá, xe 29 chỗ | −1.350.000 | 0 | **Không** — thiếu giá, nhập lại thoả thuận |
| V13 | V1 rồi đổi sang **xe công ty** | −1.200.000; chuyến thành "không thuê" | 0 | Được (xe công ty không cần giá) |

Ca V1–V13 vào `golden/van-chuyen-chi-phi.json` (Task 6), trạng thái `cho_xac_nhan` cho tới khi Kế toán / chủ ghi tên + ngày.

---

## Cấu trúc tệp

| Tệp | Làm gì | Task |
|---|---|---|
| `src/modules/van-chuyen/tien-xe.ts` (mới) | Luật tiền thuần: cỡ xe, chọn dòng giá, chồng giá, phân loại xe thuê, tổng chi phí, nguồn giá, thứ tự đảo, kế hoạch chụp/đảo | 1, 6 |
| `src/modules/van-chuyen/tien-xe.test.ts` (mới) | Bảng ca của luật thuần | 1, 6 |
| `migrations/<N>_vc_bang_gia_thue.sql` (mới) | `vc_route`, `vc_vehicle_size`, `vc_rental_rate` + trigger | 2 |
| `migrations/<N+1>_vc_chi_phi_chuyen.sql` (mới) | cột `rented`, `route_code` trên `vc_trip`; `vc_trip_cost_line`; lý do `CHI_PHI_XE`; trigger | 7 |
| `src/migrations-tien-xe-thue.test.ts` (mới) | Hai lớp CSDL (khuôn `src/migrations-chuyen-xe.test.ts`) | 2, 7 |
| `src/modules/van-chuyen/tien-xe-repo.ts` (mới) | SQL `defineSql` cho giá, tuyến, cỡ, dòng chi phí, bảng kê | 4, 9, 10 |
| `src/modules/van-chuyen/tien-xe-lenh.ts` (mới) | Xử lý route bảng giá / chi phí (đọc → luật → lô → `chayLo`) | 4, 10 |
| `src/modules/van-chuyen/tien-xe-than.ts` (mới) | Đọc thân JSON (khuôn `dieu-phoi-than.ts`) | 4, 10 |
| `src/modules/van-chuyen/tien-xe-dto.ts` (mới) | DTO bảng giá, chi phí chuyến, bảng kê | 4, 10 |
| `src/modules/van-chuyen/tien-xe-route.test.ts` (mới) | Route trên khung thử (`tests/audit/dieu-phoi-khung.mjs`) | 4, 9, 10 |
| `src/modules/van-chuyen/index.ts` | Khai route (thân mỏng) | 4, 10 |
| `src/modules/van-chuyen/dieu-phoi.ts`, `dieu-phoi-lenh.ts`, `dieu-phoi-than.ts`, `chuyen-repo.ts`, `dieu-phoi-doc.ts`, `rules.ts` | Lô tạo / sửa / huỷ mang chụp-đảo; cột mới; mã lỗi | 8, 9 |
| `src/shared/ly-do-giu.ts`, `src/shared/dieu-phoi-kieu.ts`, `src/shared/dieu-phoi-kiem.ts` | `THIEU_GIA`, `ChuyenVao.thue/coNguonGia`, mã lý do hệ thống | 8 |
| `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/orders/xem-don-theo-quyen.test.ts`, `src/shared/tro-ly-cau-truc-ten.ts` | Bốn ô `transport.*` | 3, 10 |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | `R-VC-RATE-1`, `R-VC-COST-1…6` | 5, 11 |
| `src/tien-xe-mot-nguon.test.ts` (mới) | Hàng rào một nguồn tính | 11 |
| `src/tien-xe-so-la.test.ts` (mới) | Bài số lạ 480017 | 11 |
| `golden/van-chuyen-chi-phi.json`, `src/so-vang-chi-phi-xe.test.ts` (mới), `golden/README.md` | Sổ vàng | 6 |
| `tests/e2e/tien-xe-thue.mjs` (mới), `tests/e2e/run.mjs` | e2e | 4, 11 |
| `docs/data-dictionary.json` → `npm run dict`; `docs/SO-HANG-RAO.md`; `docs/SYSTEM-DESIGN.md` §5/§7; `docs/CHANGE-GUIDE.md`; `src/shared/changelog.ts` | Tài liệu | 5, 12 |
| `web/bang-gia-xe.ts`, `web/bang-ke-xe.ts`, `public/bang-gia-xe.html`, `public/bang-ke-xe.html` (mới) | Hai màn mới theo bản vẽ 2/10 | G0, G1, G4 |
| `web/shell.ts`, `web/account.ts`, `src/shared/sw-policy.ts`, `package.json` | Menu + khai trang | G0 |
| `web/chuyen.ts`, `web/chuyen-sua.ts`, `ChuyenChiTietResponse` (`src/shared/contracts.ts`) | Khối Chi phí chuyến; ô tuyến (+ trường `tuyen` chi tiết chuyến) | G2, G3 |
| `public/app.css`, `src/shared/giao-dien.ts` | Token vai mới, khối `.bg-*`/`.cp-*`/`.bk-*`; nền + viền thanh bên | G1–G5 |

## Lát, bản phát hành, người kiểm

| Lát | Task | Phát hành | Người kiểm độc lập (chỉ đọc, `nguoi-kiem-doc-lap`) soi |
|---|---|---|---|
| **T1 máy chủ** | 0–5 | được gộp + triển khai riêng (vô hại: chưa ai bị chặn) | trigger chồng giá dùng `IS` + `COALESCE`; **đóng** giá của nhà xe đã thôi vai vẫn được; `ADMIN = ACCOUNTING`; HR/DRIVER/DRIVER_PARTNER = none; ví dụ vàng V1–V5b chạy qua `chonDongGiaThue` |
| **T2 máy chủ** | 6–12 | **giữ trên nhánh** tới khi có giao diện (Cần chủ 2) | thứ tự lô (đảo âm → dương; chụp sau ghi chuyến); `thieu_gia` hai lớp; không phá lệ; cờ `rented` + cấm hạ; luật vai chỉ áp `SNAPSHOT`/`AGREED`; tổng ≥ 0 canh mọi dòng; bài số lạ có đỏ một lần; `R-VC-COST-3` (TC-10); ADR-0080 điều kiện |
| **Task 13** (máy chủ nhỏ, chờ câu 4.3) | 13 | cùng bản với T2 | `giaBangCoThe` chỉ trong phản hồi `transport.cost.view`; bài số lạ có ca mới |
| **T2 giao diện** | G1–G5 | cùng bản với T2 máy chủ (G5 tách được, xem G5) | `can()` ẩn/hiện; không số tiền ở màn của Bán hàng; web không cộng; kịch bản Chrome |

---

## Task 0: Cổng trước thi công (không viết mã)

**Files:** chỉ đọc; ghi kết quả vào `docs/superpowers/plans/2026-10-0X-van-chuyen-dot-4-nhat-ky.md` (nhật ký thi công).

- [ ] **Bước 1: Nhờ chủ đếm chuyến xe nhà xe trên production** (AI KHÔNG chạy). Đưa chủ nguyên lệnh, đứng ở thư mục gốc repo:

```bash
CI=1 npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT t.status, count(*) AS so_chuyen FROM vc_trip t WHERE t.carrier_party_id IN (SELECT party_id FROM v_pty_carrier) AND t.carrier_party_id NOT IN (SELECT party_id FROM v_pty_owner_company) GROUP BY t.status"
```

Kỳ vọng: bảng nhỏ (trạng thái, số). Ghi nguyên kết quả vào nhật ký.
- 0 dòng ⇒ đi tiếp như ADR (cờ `DEFAULT 0`, không backfill).
- Có `PLANNED` ⇒ **Cần chủ 1** quyết A/B trước Task 7 (Task 1–6 không phụ thuộc, làm song song). Chọn B ⇒ Task 7 bước 3 thêm câu `UPDATE vc_trip SET rented = 1 WHERE status = 'PLANNED' AND …` **trước** khi tạo trigger `vc_trip_rented_alone` (trigger đó chặn đổi riêng cờ). Không bao giờ backfill `RUNNING`/`ENDED*`/`CANCELLED`.

- [ ] **Bước 2: Lấy số migration.** Chạy `ls migrations | tail -3` và với mỗi nhánh trong `git branch --no-merged main` chạy `git ls-tree --name-only <nhánh> migrations/ | tail -3` (từng lệnh riêng). `<N>` = lớn nhất + 1. Ghi vào nhật ký.

- [ ] **Bước 3: Kiểm `ky-so` (ADR-0080).** `git log main --oneline -S ky_period_close -- migrations` — rỗng ⇒ ghi "T2 không cần trigger khoá kỳ (gộp trước lượt 2 sổ)"; có ⇒ Task 7 bước 3b bắt buộc.

- [ ] **Bước 4: Đo lại dòng** trong bảng §0 (đợt 1–3, 5 có thể đã sửa `dieu-phoi*.ts`, `0042`-kế, `ly-do-giu.ts`). Lệch thì sửa số dòng trong nhật ký, không sửa kế hoạch này.

---

## Task 1: Luật thuần tra giá (`chonDongGiaThue`, `coXeCua`, `kiemChongGia`)

**Files:**
- Create: `src/modules/van-chuyen/tien-xe.ts`
- Test: `src/modules/van-chuyen/tien-xe.test.ts`

**Interfaces:**
- Produces:
```ts
export interface CoXe { code: string; min: number; max: number; active: boolean }
export interface DongGiaThue { id: string; carrierPartyId: string; routeCode: string | null; sizeCode: string | null; amount: number; validFrom: string; validTo: string | null }
export function coXeCua(soKhach: number, coXe: readonly CoXe[]): string | null;
export function chonDongGiaThue(v: { carrierPartyId: string; routeCode: string | null; sizeCode: string | null; ngayChay: string }, dong: readonly DongGiaThue[]): DongGiaThue | null;
export function dongChongGia(moi: Omit<DongGiaThue, "id" | "amount">, dong: readonly DongGiaThue[], boQuaId?: string): DongGiaThue | null;
```

- [ ] **Bước 1: Viết test bảng ca (đỏ)** — `src/modules/van-chuyen/tien-xe.test.ts`:

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { chonDongGiaThue, coXeCua, dongChongGia, type CoXe, type DongGiaThue } from "./tien-xe.ts";

const HP = "p-hung-phat";
const CO: CoXe[] = [
  { code: "C16", min: 10, max: 16, active: true },
  { code: "C29", min: 17, max: 29, active: true },
  { code: "C45CU", min: 30, max: 45, active: false },
];
const G: DongGiaThue[] = [
  { id: "G1", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: "C16", amount: 1_200_000, validFrom: "2026-10-01", validTo: "2026-10-31" },
  { id: "G2", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, amount: 1_000_000, validFrom: "2026-10-01", validTo: "2026-10-31" },
  { id: "G3", carrierPartyId: HP, routeCode: null, sizeCode: "C16", amount: 900_000, validFrom: "2026-10-01", validTo: null },
  { id: "G4", carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, amount: 1_100_000, validFrom: "2026-11-01", validTo: null },
  { id: "KHAC", carrierPartyId: "p-khac", routeCode: "NT-CR", sizeCode: "C16", amount: 5_000_000, validFrom: "2026-01-01", validTo: null },
];
const ca = (routeCode: string | null, so: number, ngayChay: string) => chonDongGiaThue({ carrierPartyId: HP, routeCode, sizeCode: coXeCua(so, CO), ngayChay }, G)?.id ?? null;

test("coXeCua: khoảng tính cả hai đầu; cỡ ngưng dùng không áp; ngoài mọi khoảng → null", () => {
  assert.equal(coXeCua(10, CO), "C16");
  assert.equal(coXeCua(16, CO), "C16");
  assert.equal(coXeCua(17, CO), "C29");
  assert.equal(coXeCua(35, CO), null);
  assert.equal(coXeCua(9, CO), null);
});

test("chonDongGiaThue — ví dụ vàng V1–V6: tuyến+cỡ > tuyến > cỡ; ranh ngày; không dòng → null; đúng nhà xe", () => {
  assert.equal(ca("NT-CR", 16, "2026-10-15"), "G1"); // V1
  assert.equal(ca("NT-CR", 29, "2026-10-15"), "G2"); // V2
  assert.equal(ca(null, 16, "2026-10-15"), "G3"); // V3
  assert.equal(ca("NT-DL", 16, "2026-10-15"), "G3"); // V4
  assert.equal(ca("NT-CR", 29, "2026-10-31"), "G2"); // V5a ngày cuối vẫn áp
  assert.equal(ca("NT-CR", 29, "2026-11-01"), "G4"); // V5b
  assert.equal(ca("NT-CR", 29, "2026-09-30"), null); // trước ngày bắt đầu
  assert.equal(ca(null, 29, "2026-10-15"), null); // V6 thiếu giá
  assert.equal(chonDongGiaThue({ carrierPartyId: "p-la", routeCode: "NT-CR", sizeCode: "C16", ngayChay: "2026-10-15" }, G), null);
});

test("dongChongGia: cùng khoá (nhà xe, tuyến, cỡ — so cả trống) giao ngày → chồng; khác khoá hoặc ngày rời → không", () => {
  const moi = { carrierPartyId: HP, routeCode: "NT-CR", sizeCode: null, validFrom: "2026-10-31", validTo: null };
  assert.equal(dongChongGia(moi, G)?.id, "G2"); // 31/10 chạm G2 (tính cả ngày cuối)
  assert.equal(dongChongGia({ ...moi, validFrom: "2026-11-01" }, G)?.id, "G4");
  assert.equal(dongChongGia({ ...moi, validFrom: "2026-11-01" }, G, "G4"), null); // bỏ qua dòng đang thay
  assert.equal(dongChongGia({ carrierPartyId: HP, routeCode: null, sizeCode: "C29", validFrom: "2026-10-01", validTo: null }, G), null);
  assert.equal(dongChongGia({ carrierPartyId: HP, routeCode: null, sizeCode: "C16", validFrom: "2027-01-01", validTo: null }, G)?.id, "G3"); // G3 mở
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** Run: `node --test src/modules/van-chuyen/tien-xe.test.ts` — Expected: FAIL "Cannot find module './tien-xe.ts'".

- [ ] **Bước 3: Viết mã tối thiểu** — `src/modules/van-chuyen/tien-xe.ts`:

```ts
// LUẬT TIỀN XE THUÊ (ADR-0057 T1 B2, T2 C6) — MỘT nguồn tính (Hiến chương 5.4). Thuần, không I/O, không import module khác. Mọi đường (lô chuyến, route
// chi phí, bảng kê, sổ vàng) đi qua các hàm ở đây; hàng rào src/tien-xe-mot-nguon.test.ts đỏ khi cộng tiền chi phí ở chỗ khác.
export interface CoXe { code: string; min: number; max: number; active: boolean }
export interface DongGiaThue { id: string; carrierPartyId: string; routeCode: string | null; sizeCode: string | null; amount: number; validFrom: string; validTo: string | null }

const HET = "9999-12-31";
const conHieuLuc = (d: { validFrom: string; validTo: string | null }, ngay: string) => d.validFrom <= ngay && ngay <= (d.validTo ?? HET);

/** Cỡ xe suy từ số khách (không kể tài xế — `vc_vehicle.passenger_capacity`), chỉ cỡ đang dùng. Khoảng không chồng (CSDL giữ) ⇒ nhiều nhất một. */
export function coXeCua(soKhach: number, coXe: readonly CoXe[]): string | null {
  return coXe.find((c) => c.active && c.min <= soKhach && soKhach <= c.max)?.code ?? null;
}

/** ADR-0057 B2: dòng đang hiệu lực vào ngày chạy, đúng nhà xe; (1) khớp tuyến VÀ cỡ, (2) khớp tuyến – cỡ trống, (3) khớp cỡ – tuyến trống. Không có → null. */
export function chonDongGiaThue(v: { carrierPartyId: string; routeCode: string | null; sizeCode: string | null; ngayChay: string }, dong: readonly DongGiaThue[]): DongGiaThue | null {
  const cua = dong.filter((d) => d.carrierPartyId === v.carrierPartyId && conHieuLuc(d, v.ngayChay));
  const bac1 = v.routeCode !== null && v.sizeCode !== null ? cua.find((d) => d.routeCode === v.routeCode && d.sizeCode === v.sizeCode) : undefined;
  const bac2 = v.routeCode !== null ? cua.find((d) => d.routeCode === v.routeCode && d.sizeCode === null) : undefined;
  const bac3 = v.sizeCode !== null ? cua.find((d) => d.routeCode === null && d.sizeCode === v.sizeCode) : undefined;
  return bac1 ?? bac2 ?? bac3 ?? null;
}

/** Dòng (khác `boQuaId`) cùng khoá (nhà xe, tuyến, cỡ — trống so với trống) có khoảng ngày giao với dòng mới (hai đầu tính cả). Lớp máy chủ của trigger chồng giá. */
export function dongChongGia(moi: Omit<DongGiaThue, "id" | "amount">, dong: readonly DongGiaThue[], boQuaId?: string): DongGiaThue | null {
  return dong.find((d) => d.id !== boQuaId && d.carrierPartyId === moi.carrierPartyId && d.routeCode === moi.routeCode && d.sizeCode === moi.sizeCode
    && d.validFrom <= (moi.validTo ?? HET) && moi.validFrom <= (d.validTo ?? HET)) ?? null;
}
```

- [ ] **Bước 4: Chạy, thấy xanh.** `node --test src/modules/van-chuyen/tien-xe.test.ts` — PASS 3/3.
- [ ] **Bước 5: Commit.** `git add src/modules/van-chuyen/tien-xe.ts src/modules/van-chuyen/tien-xe.test.ts && git commit` — tiêu đề "Tiền xe thuê T1: luật thuần chọn dòng giá (tuyến thắng cỡ)", thân nói vì sao (ADR-0057 B2, một nguồn tính).

---

## Task 2: Migration T1 — tuyến, cỡ xe, bảng giá thuê (hai lớp CSDL)

**Files:**
- Create: `migrations/<N>_vc_bang_gia_thue.sql`
- Create: `src/migrations-tien-xe-thue.test.ts`
- Modify: `docs/data-dictionary.json` (+ `npm run dict`)

**Interfaces:**
- Produces: bảng `vc_route(code PK, name, active, sort_order, WHO)`, `vc_vehicle_size(code PK, label, min_passengers, max_passengers, active, sort_order, WHO)`, `vc_rental_rate(id, carrier_party_id, route_code, vehicle_size_code, unit, amount, valid_from_date, valid_to_date, note, replaces_id, WHO)`; tiền tố lỗi `vc_route_`, `vc_size_`, `vc_rate_`.

- [ ] **Bước 1: Viết test CSDL (đỏ)** — `src/migrations-tien-xe-thue.test.ts`. Chép phần đầu khuôn của `src/migrations-chuyen-xe.test.ts:1-60` (`openDb`, `run`, `one`, `loi`, `nid`, `hoSo`, `moVai`, `congTyChu`, `nhaXe`, `xe`) — không import chéo tệp test. Các bài:

```ts
const tuyen = (db: Db, code: string) => run(db, "INSERT INTO vc_route (code, name, created_at, updated_at) VALUES (?, ?, ?, ?)", code, `Tuyến ${code}`, AT, AT);
const co = (db: Db, code: string, min: number, max: number, active = 1) =>
  run(db, "INSERT INTO vc_vehicle_size (code, label, min_passengers, max_passengers, active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)", code, code, min, max, active, AT, AT);
const gia = (db: Db, o: { nx: string; tuyen?: string | null; co?: string | null; tien?: number; tu?: string; den?: string | null; id?: string }) => {
  const id = o.id ?? nid("rate");
  run(db, `INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, vehicle_size_code, amount, valid_from_date, valid_to_date, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`, id, o.nx, o.tuyen ?? null, o.co ?? null, o.tien ?? 1_000_000, o.tu ?? "2026-10-01", o.den ?? null, AT, AT);
  return id;
};

test("vc_route / vc_vehicle_size: không xoá, không đổi mã; cỡ đang dùng không chồng khoảng; bật lại cỡ chồng → chặn; khoảng bất biến", () => {
  const db = openDb();
  tuyen(db, "NT-CR");
  loi(() => run(db, "DELETE FROM vc_route WHERE code = 'NT-CR'"), /vc_route_no_delete/);
  loi(() => run(db, "UPDATE vc_route SET code = 'X' WHERE code = 'NT-CR'"), /vc_route_identity/);
  run(db, "UPDATE vc_route SET name = 'NT – Cam Ranh', active = 0 WHERE code = 'NT-CR'"); // nhãn, ngưng dùng: được
  co(db, "C16", 10, 16);
  loi(() => co(db, "C20", 15, 20), /vc_size_overlap/);
  co(db, "C20CU", 15, 20, 0); // cỡ ngưng dùng không tính chồng
  loi(() => run(db, "UPDATE vc_vehicle_size SET active = 1 WHERE code = 'C20CU'"), /vc_size_overlap/);
  loi(() => run(db, "UPDATE vc_vehicle_size SET max_passengers = 18 WHERE code = 'C16'"), /vc_size_identity/);
  loi(() => co(db, "CSAI", 20, 19), /CHECK constraint failed/);
});

test("vc_rental_rate: tiền nguyên dương; có tuyến hoặc cỡ; unit chỉ PER_TRIP; ngày hợp lệ", () => {
  const db = openDb();
  const nx = nhaXe(db);
  tuyen(db, "NT-CR");
  co(db, "C16", 10, 16);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tien: 0 }), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tien: 1.5 }), /CHECK constraint failed/);
  loi(() => gia(db, { nx }), /CHECK constraint failed/, "thiếu cả tuyến lẫn cỡ");
  loi(() => run(db, `INSERT INTO vc_rental_rate (id, carrier_party_id, route_code, unit, amount, valid_from_date, created_at, updated_at)
     VALUES ('u', ?, 'NT-CR', 'PER_KM', 1000, '2026-10-01', ?, ?)`, nx, AT, AT), /CHECK constraint failed/);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-05", den: "2026-10-04" }), /CHECK constraint failed/);
  gia(db, { nx, tuyen: "NT-CR", co: "C16" });
});

test("chồng hiệu lực cùng khoá (so trống bằng IS, ngày mở = 9999-12-31) → trigger; khác khoá → được", () => {
  const db = openDb();
  const nx = nhaXe(db);
  tuyen(db, "NT-CR");
  co(db, "C16", 10, 16);
  gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-01", den: "2026-10-31" });
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2026-10-31" }), /vc_rate_overlap/, "chạm đúng ngày cuối");
  gia(db, { nx, tuyen: "NT-CR", tu: "2026-11-01" });
  gia(db, { nx, tuyen: "NT-CR", co: "C16", tu: "2026-10-01" }); // khoá khác (cỡ không trống)
  gia(db, { nx, co: "C16", tu: "2026-10-01" });
  loi(() => gia(db, { nx, co: "C16", tu: "2027-01-01" }), /vc_rate_overlap/, "dòng mở chồng mọi ngày sau");
});

test("chỉ-thêm: không xoá, không đổi tiền/khoá/ngày bắt đầu; valid_to_date đặt MỘT lần", () => {
  const db = openDb();
  const nx = nhaXe(db);
  tuyen(db, "NT-CR");
  const id = gia(db, { nx, tuyen: "NT-CR" });
  loi(() => run(db, "DELETE FROM vc_rental_rate WHERE id = ?", id), /vc_rate_append_only/);
  loi(() => run(db, "UPDATE vc_rental_rate SET amount = 2 WHERE id = ?", id), /vc_rate_append_only/);
  loi(() => run(db, "UPDATE vc_rental_rate SET route_code = NULL WHERE id = ?", id), /vc_rate_append_only/);
  run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-10-31', updated_at = ? WHERE id = ?", AT, id);
  loi(() => run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-11-30' WHERE id = ?", id), /vc_rate_append_only/);
});

test("vai CARRIER chỉ khi THÊM; ĐÓNG giá của nhà xe đã thôi vai vẫn được (người kiểm soi)", () => {
  const db = openDb();
  tuyen(db, "NT-CR");
  const caNhan = hoSo(db, "ORGANIZATION", "Không phải nhà xe");
  loi(() => gia(db, { nx: caNhan, tuyen: "NT-CR" }), /vc_rate_carrier/);
  const nx = nhaXe(db);
  const id = gia(db, { nx, tuyen: "NT-CR" });
  run(db, "UPDATE pty_party_role SET valid_to_date = '2026-10-02' WHERE party_id = ? AND role_type_code = 'CARRIER'", nx);
  loi(() => gia(db, { nx, tuyen: "NT-CR", tu: "2027-01-01", co: null }), /vc_rate_carrier|vc_rate_overlap/);
  run(db, "UPDATE vc_rental_rate SET valid_to_date = '2026-10-31', updated_at = ? WHERE id = ?", AT, id); // đóng: được
});
```

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/migrations-tien-xe-thue.test.ts` — FAIL "no such table: vc_route".

- [ ] **Bước 3: Viết migration** — `migrations/<N>_vc_bang_gia_thue.sql`:

```sql
-- Migration <N> — ADR-0057 T1 (accepted 2026-09-30): BẢNG GIÁ THUÊ XE theo nhà xe, trong module van-chuyen (chủ chọn Tiền Q2 a). CHỈ THÊM.
-- Tuyến = NHÃN để tra giá (không phải lộ trình; không khoá tới loc_location — giả định G-T1). Cỡ xe = khoảng số khách KHÔNG kể tài xế, máy suy từ
-- vc_vehicle.passenger_capacity (chủ chọn Q-T1 lần 17). Dòng giá CHỈ-THÊM: đổi giá = đóng dòng cũ + thêm dòng mới (một lô). valid_to_date TÍNH CẢ NGÀY ĐÓ.
-- Trigger chỉ đọc bảng vc_ + view công bố v_pty_carrier (Hiến chương 5.3; src/architecture.test.ts VIEW_CHO_TRIGGER_VC). Mã lỗi: vc_route_, vc_size_, vc_rate_.
CREATE TABLE vc_route (
  code        TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 30),
  name        TEXT NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 120),
  active      INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order  INTEGER NOT NULL DEFAULT 0,
  created_at  TEXT NOT NULL,
  created_by  TEXT,
  updated_at  TEXT NOT NULL,
  updated_by  TEXT
);
CREATE TRIGGER vc_route_no_delete BEFORE DELETE ON vc_route
BEGIN SELECT RAISE(ABORT, 'vc_route_no_delete: tuyến không xoá — ngưng dùng'); END;
CREATE TRIGGER vc_route_identity BEFORE UPDATE ON vc_route
WHEN NEW.code IS NOT OLD.code OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_route_identity: không đổi mã, mốc tạo của tuyến'); END;

CREATE TABLE vc_vehicle_size (
  code            TEXT PRIMARY KEY CHECK (code = upper(code) AND length(code) BETWEEN 2 AND 20),
  label           TEXT NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 60),
  min_passengers  INTEGER NOT NULL CHECK (min_passengers BETWEEN 1 AND 100),
  max_passengers  INTEGER NOT NULL CHECK (max_passengers BETWEEN 1 AND 100),
  active          INTEGER NOT NULL DEFAULT 1 CHECK (active IN (0, 1)),
  sort_order      INTEGER NOT NULL DEFAULT 0,
  created_at      TEXT NOT NULL,
  created_by      TEXT,
  updated_at      TEXT NOT NULL,
  updated_by      TEXT,
  CHECK (max_passengers >= min_passengers)
);
CREATE TRIGGER vc_vehicle_size_no_delete BEFORE DELETE ON vc_vehicle_size
BEGIN SELECT RAISE(ABORT, 'vc_size_no_delete: cỡ xe không xoá — ngưng dùng'); END;
CREATE TRIGGER vc_vehicle_size_identity BEFORE UPDATE ON vc_vehicle_size
WHEN NEW.code IS NOT OLD.code OR NEW.min_passengers IS NOT OLD.min_passengers OR NEW.max_passengers IS NOT OLD.max_passengers
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_size_identity: không đổi mã, khoảng số khách của cỡ xe — thêm cỡ mới, ngưng cỡ cũ'); END;
CREATE TRIGGER vc_vehicle_size_overlap_ins BEFORE INSERT ON vc_vehicle_size
WHEN NEW.active = 1 AND EXISTS (SELECT 1 FROM vc_vehicle_size s WHERE s.active = 1 AND s.min_passengers <= NEW.max_passengers AND NEW.min_passengers <= s.max_passengers)
BEGIN SELECT RAISE(ABORT, 'vc_size_overlap: khoảng số khách chồng với cỡ xe đang dùng'); END;
CREATE TRIGGER vc_vehicle_size_overlap_upd BEFORE UPDATE OF active ON vc_vehicle_size
WHEN NEW.active = 1 AND OLD.active = 0 AND EXISTS (
  SELECT 1 FROM vc_vehicle_size s WHERE s.code <> NEW.code AND s.active = 1 AND s.min_passengers <= NEW.max_passengers AND NEW.min_passengers <= s.max_passengers)
BEGIN SELECT RAISE(ABORT, 'vc_size_overlap: khoảng số khách chồng với cỡ xe đang dùng'); END;

CREATE TABLE vc_rental_rate (
  id                 TEXT PRIMARY KEY,
  carrier_party_id   TEXT NOT NULL REFERENCES pty_party(id),
  route_code         TEXT REFERENCES vc_route(code),
  vehicle_size_code  TEXT REFERENCES vc_vehicle_size(code),
  unit               TEXT NOT NULL DEFAULT 'PER_TRIP' CHECK (unit IN ('PER_TRIP')),
  amount             INTEGER NOT NULL CHECK (amount > 0 AND amount = round(amount)),
  valid_from_date    TEXT NOT NULL CHECK (date(valid_from_date) IS valid_from_date),
  valid_to_date      TEXT CHECK (valid_to_date IS NULL OR (date(valid_to_date) IS valid_to_date AND valid_to_date >= valid_from_date)),
  note               TEXT CHECK (note IS NULL OR length(note) <= 200),
  replaces_id        TEXT REFERENCES vc_rental_rate(id),
  created_at         TEXT NOT NULL,
  created_by         TEXT,
  updated_at         TEXT NOT NULL,
  updated_by         TEXT,
  CHECK (route_code IS NOT NULL OR vehicle_size_code IS NOT NULL)
);
CREATE INDEX vc_rental_rate_carrier_ix ON vc_rental_rate(carrier_party_id, valid_from_date);
CREATE TRIGGER vc_rental_rate_no_delete BEFORE DELETE ON vc_rental_rate
BEGIN SELECT RAISE(ABORT, 'vc_rate_append_only: dòng giá không xoá'); END;
-- Chỉ một kiểu UPDATE: đặt valid_to_date MỘT lần (trống → có); updated_* được đổi theo.
CREATE TRIGGER vc_rental_rate_close_once BEFORE UPDATE ON vc_rental_rate
WHEN OLD.valid_to_date IS NOT NULL OR NEW.valid_to_date IS NULL
  OR NEW.id IS NOT OLD.id OR NEW.carrier_party_id IS NOT OLD.carrier_party_id OR NEW.route_code IS NOT OLD.route_code
  OR NEW.vehicle_size_code IS NOT OLD.vehicle_size_code OR NEW.unit IS NOT OLD.unit OR NEW.amount IS NOT OLD.amount
  OR NEW.valid_from_date IS NOT OLD.valid_from_date OR NEW.note IS NOT OLD.note OR NEW.replaces_id IS NOT OLD.replaces_id
  OR NEW.created_at IS NOT OLD.created_at OR NEW.created_by IS NOT OLD.created_by
BEGIN SELECT RAISE(ABORT, 'vc_rate_append_only: dòng giá chỉ đóng một lần, không sửa tiền / khoá / ngày bắt đầu'); END;
-- Khuôn pty_party_role_overlap (0011:97-104): khoá có thể trống so bằng IS; khoảng mở = '9999-12-31'.
CREATE TRIGGER vc_rental_rate_overlap BEFORE INSERT ON vc_rental_rate
WHEN EXISTS (SELECT 1 FROM vc_rental_rate r WHERE r.carrier_party_id = NEW.carrier_party_id AND r.route_code IS NEW.route_code
  AND r.vehicle_size_code IS NEW.vehicle_size_code
  AND r.valid_from_date <= COALESCE(NEW.valid_to_date, '9999-12-31') AND NEW.valid_from_date <= COALESCE(r.valid_to_date, '9999-12-31'))
BEGIN SELECT RAISE(ABORT, 'vc_rate_overlap: nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này'); END;
-- CHỈ lúc THÊM: view phản ánh HIỆN TẠI — đóng dòng của nhà xe đã thôi vai phải luôn làm được.
CREATE TRIGGER vc_rental_rate_carrier BEFORE INSERT ON vc_rental_rate
WHEN NOT EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
BEGIN SELECT RAISE(ABORT, 'vc_rate_carrier: chỉ thêm giá cho nhà xe đang hợp tác'); END;
```

- [ ] **Bước 4: Chạy, thấy xanh.** `node --test src/migrations-tien-xe-thue.test.ts` — PASS 5/5. Rồi `node --test src/architecture.test.ts` — PASS (bài thân trigger `:952-1018` hỏi SQLite: trigger chỉ đọc `vc_` + `v_pty_carrier`).

- [ ] **Bước 5: P16 — thấy chặn thật.** Tạm đổi `r.route_code IS NEW.route_code` thành `r.route_code = NEW.route_code` trong tệp migration → chạy bài "chồng hiệu lực" → **đỏ** (dòng cỡ-không-tuyến chèn trùng lọt) → hoàn nguyên → xanh. Tạm xoá trigger `vc_rental_rate_carrier` → bài "vai CARRIER" đỏ → hoàn nguyên. Ghi hai phép đột biến + ngày vào nhật ký (dùng cho `SO-HANG-RAO` ở Task 5).

- [ ] **Bước 6: Từ điển dữ liệu.** Thêm vào `docs/data-dictionary.json` mảng `tables`: `{"name":"vc_route","module":"van-chuyen","kind":"lookup"}`, `{"name":"vc_vehicle_size","module":"van-chuyen","kind":"lookup"}`, `{"name":"vc_rental_rate","module":"van-chuyen","kind":"table"}` (đúng khuôn mục `vc_reason`/`vc_trip` hiện có; thêm mô tả cột nếu tệp có trường đó cho bảng cùng loại). Chạy `npm run dict`. Chạy `node --test src/architecture.test.ts` (bài khoá ngoại đọc module từ đây).

- [ ] **Bước 7: Commit** — "Tiền xe thuê T1: bảng tuyến, cỡ xe, giá thuê theo nhà xe (chỉ-thêm, không chồng, vai nhà xe lúc thêm)".

---

## Task 3: Ô quyền `transport.rate.view`, `transport.rate.manage`

**Files:**
- Modify: `src/shared/permissions.ts` (sau `"vehicle.manage"` ~`:164`)
- Modify: `src/shared/permissions.test.ts` (hàng ghim DRIVER `:312`, DRIVER_PARTNER `:341`, HR `:369`; bài mới ADMIN = ACCOUNTING)
- Modify: `src/modules/orders/xem-don-theo-quyen.test.ts:297` (hàng ghim PARTNER)
- Modify: `src/shared/tro-ly-cau-truc-ten.ts` (`TEN_THAO_TAC`)

**Interfaces:**
- Produces: `OperationCode` có `"transport.rate.view" | "transport.rate.manage"`.
- Lưu ý: bài "mỗi ô được máy chủ hỏi" (`src/permission-enforcement.test.ts:71`) sẽ **đỏ** cho tới Task 4 — làm Task 3 và Task 4 trong **cùng một nhánh, gộp cùng commit cuối Task 4** nếu cổng xanh đòi; không thêm mục hoãn.

- [ ] **Bước 1: Viết bài ghim mới (đỏ)** — cuối `src/shared/permissions.test.ts`:

```ts
// ADR-0057 B3, C7 (chủ lần 18 "Hai vai giống hệt"): Quản trị = Kế toán ở MỌI ô transport.*; Toàn quyền any; mọi cột khác none (kể cả HR — ADR-0071).
test("ADR-0057: ô transport.* — ADMIN = ACCOUNTING = any, SUPER_ADMIN any, mọi cột khác none", () => {
  const ops = (Object.keys(MATRIX) as OperationCode[]).filter((op) => op.startsWith("transport."));
  assert.ok(ops.length >= 2, "chống bài rỗng");
  for (const op of ops) {
    const r = MATRIX[op];
    assert.equal(r.ADMIN, r.ACCOUNTING, `${op}: Quản trị phải ngang Kế toán`);
    assert.deepEqual(r, { SALES: "none", ACCOUNTING: "any", ADMIN: "any", FIELD: "none", PARTNER: "none", SUPER_ADMIN: "any", INTERN: "none", DRIVER: "none", DRIVER_PARTNER: "none", HR: "none" }, op);
  }
});
```

Thêm vào ba hàng ghim (DRIVER, DRIVER_PARTNER, HR) và hàng PARTNER (`xem-don-theo-quyen.test.ts`): `"transport.rate.view": "none", "transport.rate.manage": "none",` (chú thích: "ADR-0057 B3 — tiền xe thuê: không").

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts` — FAIL (ô chưa có; hàng ghim thừa khoá).
- [ ] **Bước 3: Thêm ô** vào `MATRIX`:

```ts
  // ADR-0057 T1 B3 (accepted 2026-09-30): BẢNG GIÁ THUÊ XE theo nhà xe (giá vốn). Xem: Kế toán, Quản trị, Toàn quyền. Thêm / đóng giá, sửa danh mục tuyến,
  // cỡ xe: cùng ba vai — Quản trị = Kế toán (chủ lần 18 "Hai vai giống hệt"). Bán hàng chọn tuyến qua trip.dispatch (đọc TÊN tuyến, không giá). HDV không bao
  // giờ đọc giá (ADR-0019 điều 3). Route: /api/van-chuyen/bang-gia*, /tuyen*, /co-xe* (cổng office).
  "transport.rate.view": row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
  "transport.rate.manage": row("none", "any", "any", "none", "none", "any", "none", "none", "none", "none"),
```

và `TEN_THAO_TAC`:

```ts
  "transport.rate.view": { ten: "xem bảng giá thuê xe", moTa: "Xem giá thuê xe theo chuyến của từng nhà xe." },
  "transport.rate.manage": { ten: "nhập bảng giá thuê xe", moTa: "Thêm, kết thúc giá thuê xe; sửa danh mục tuyến và cỡ xe." },
```

- [ ] **Bước 4: Chạy, thấy xanh** (trừ `permission-enforcement` — xanh sau Task 4). `node --test src/shared/permissions.test.ts src/modules/orders/xem-don-theo-quyen.test.ts src/shared/tro-ly-cau-truc.test.ts`.
- [ ] **Bước 5: Không commit riêng** — đi cùng Task 4 (bộ kiểm chính phải xanh ở mỗi commit).

---

## Task 4: Route bảng giá, tuyến, cỡ xe (+ nhật ký, khung thử, e2e)

**Files:**
- Create: `src/modules/van-chuyen/tien-xe-repo.ts`, `tien-xe-than.ts`, `tien-xe-lenh.ts`, `tien-xe-dto.ts`, `tien-xe-route.test.ts`
- Create: `tests/e2e/tien-xe-thue.mjs`; Modify: `tests/e2e/run.mjs` (`ALL` sau `"dieu-phoi"`, mức giờ ước lượng)
- Modify: `src/modules/van-chuyen/index.ts` (khai route), `src/shared/contracts.ts` (kiểu phản hồi), `src/modules/audit/*` (thêm `AuditAction`: `rental_rate_added`, `rental_rate_closed`, `route_saved`, `vehicle_size_saved` — theo khuôn khai hành động hiện có)

**Interfaces:**
- Consumes: `chonDongGiaThue`, `dongChongGia`, `coXeCua` (Task 1); `nhaXeDangHopTac(db)` (`src/modules/parties/index.ts:134`); `auditStatement` (khuôn `dieu-phoi.ts:45`).
- Produces (route — tên chốt):
  - `GET /api/van-chuyen/bang-gia?nha-xe=<partyId>&ngay=<YYYY-MM-DD>` — `can(transport.rate.view)`; trả `{ dong: BangGiaDto[], tuyen: TuyenDto[], coXe: CoXeDto[], nhaXe: {partyId, ten}[] }`.
  - `POST /api/van-chuyen/bang-gia` — `can(transport.rate.manage)`; thân `{ requestId, nhaXePartyId, tuyen: string|null, coXe: string|null, soTien: number, tuNgay, denNgay: string|null, ghiChu: string|null, thayDongId: string|null }`; 201 `{ dong }`.
  - `POST /api/van-chuyen/bang-gia/:id/ket-thuc` — `can(transport.rate.manage)`; thân `{ denNgay }`; 200.
  - `GET /api/van-chuyen/tuyen` — `can(trip.dispatch) || can(transport.rate.view)` (chỉ TÊN, không giá).
  - `POST /api/van-chuyen/tuyen` (thân `{ ma, ten, thuTu? }`, mã viết hoa 2–30 ký tự), `PUT /api/van-chuyen/tuyen/:code` (thân `{ ten?, dangDung?, thuTu? }`) — `can(transport.rate.manage)`; `GET` trả `{ tuyen: { ma, ten, dangDung }[] }`. Cỡ xe: `POST` thân `{ ma, nhan, tuSoKhach, denSoKhach }`, `PUT` thân `{ nhan?, dangDung? }`.
  - `GET /api/van-chuyen/co-xe`, `POST /api/van-chuyen/co-xe`, `PUT /api/van-chuyen/co-xe/:code` — như tuyến.
  - Mã lỗi: 403 trước 400; 409 `gia_chong` ("Nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này"), 409 `nha_xe_khong_hop_tac` ("Chỉ thêm giá cho nhà xe đang hợp tác"), 409 `co_xe_chong`, 400 tiếng Việt cho thân sai.

- [ ] **Bước 1: Viết test route (đỏ)** — `src/modules/van-chuyen/tien-xe-route.test.ts` trên khung thử (`setup`, `SALES`, `ACC`, `ADM`, `SUP`, `FIELD`, `DRIVER`, `PARTNER`, `INTERN`, `uuid` từ `tests/audit/dieu-phoi-khung.mjs`). Thêm vào khung (`tests/audit/dieu-phoi-khung.mjs`) hai hàm gieo: `nhaXeKhung(w)` (hồ sơ tổ chức + vai `CARRIER`, trả partyId) và `xeNhaXe(w, carrierId, cho = 16)` (khuôn `xe()` `:52`, chủ = nhà xe, có Kiểm định + Bảo hiểm). Ca:

```ts
test("T1 route: Kế toán VÀ Quản trị thêm giá (201); Bán hàng / HDV / tài xế / Đối tác / Thực tập → 403 cả đọc lẫn ghi; 403 đứng trước 400", async () => {
  const w = setup();
  const nx = nhaXeKhung(w);
  for (const as of [ACC, ADM]) {
    const r = await w.call("POST", "/api/van-chuyen/tuyen", { as, body: { ma: `NT-${as.slice(0, 2)}`, ten: "Nha Trang – Cam Ranh" } });
    assert.equal(r.status, 201, r.text);
  }
  const t = (await w.call("GET", "/api/van-chuyen/tuyen", { as: ACC })).json.tuyen[0].ma;
  const them = (as: string, body: Record<string, unknown>) => w.call("POST", "/api/van-chuyen/bang-gia", { as, body: { requestId: uuid(), nhaXePartyId: nx, tuyen: t, coXe: null, soTien: 1_200_000, tuNgay: "2026-10-01", denNgay: null, ghiChu: null, thayDongId: null, ...body } });
  assert.equal((await them(ADM, {})).status, 201);
  for (const as of [SALES, FIELD, DRIVER, PARTNER, INTERN]) {
    assert.equal((await them(as, { soTien: "sai" })).status, 403, `${as} ghi`);
    assert.equal((await w.call("GET", "/api/van-chuyen/bang-gia", { as })).status, 403, `${as} đọc`);
  }
  assert.equal((await w.call("GET", "/api/van-chuyen/tuyen", { as: SALES })).status, 200, "Bán hàng đọc TÊN tuyến để chọn khi xếp");
  assert.ok(!JSON.stringify((await w.call("GET", "/api/van-chuyen/tuyen", { as: SALES })).json).includes("1200000"));
});

test("T1 route: chồng giá → 409 gia_chong; 'thay dòng X' đóng X ngày trước + thêm mới trong MỘT lô; thay bằng ngày ≤ ngày bắt đầu của X → 409", async () => { /* khuôn trên */ });
test("T1 route: nhà xe thôi hợp tác → thêm giá 409 nha_xe_khong_hop_tac; KẾT THÚC giá cũ của nhà xe đó → 200", async () => { /* đóng vai CARRIER bằng route parties rồi gọi */ });
test("T1 route: mỗi lần thêm / kết thúc giá có MỘT dòng audit_log cùng lô — detail có tên nhà xe, tuyến, số tiền; không SĐT", async () => { /* đọc audit_log */ });
test("T1 route: cỡ xe chồng khoảng → 409 co_xe_chong; số tiền không phải số nguyên dương → 400 câu tiếng Việt", async () => { /* … */ });
```

(Người thi công viết đủ thân các ca có `/* … */` theo khuôn ca đầu — mỗi ca một `setup()`.)

- [ ] **Bước 2: Chạy, thấy đỏ.** `node --test src/modules/van-chuyen/tien-xe-route.test.ts` — 404.

- [ ] **Bước 3: Viết mã.**
  - `tien-xe-repo.ts`: `defineSql("van-chuyen", …)` (khuôn `chuyen-repo.ts:272`): `RATE_LIST` (theo nhà xe, ngày), `RATE_BY_ID`, `RATE_INSERT`, `RATE_CLOSE` (`UPDATE vc_rental_rate SET valid_to_date = ?2, updated_at = ?3, updated_by = ?4 WHERE id = ?1 AND valid_to_date IS NULL`), `ROUTE_LIST/INSERT/UPDATE`, `SIZE_LIST/INSERT/UPDATE`. Thêm tệp vào danh sách tệp SQL siết của `src/architecture.test.ts:79-80` (khuôn `chuyen-repo.ts` — bài EXPLAIN).
  - `tien-xe-than.ts`: `docThemGia(body): KetQua<ThemGiaThan>` — `soTien` phải `Number.isSafeInteger && > 0`; `tuNgay`/`denNgay` qua `isISODate`; `tuyen`/`coXe` chuỗi hoặc null, ít nhất một; `ghiChu` ≤ 200 ký tự.
  - `tien-xe-lenh.ts`: `lenhThemGia(db, b, staff, bayGioMs)`: kiểm nhà xe ∈ `nhaXeDangHopTac` → 409; tuyến/cỡ đang dùng → 400; đọc dòng cùng nhà xe; `dongChongGia(moi, dong, b.thayDongId ?? undefined)` → 409; nếu `thayDongId`: dòng X phải mở, cùng khoá, `X.validFrom < b.tuNgay`; lô = `[RATE_CLOSE(X, tuNgay−1) , RATE_INSERT, audit]` (khi không thay: `[RATE_INSERT, audit]`), audit dùng `changes() > 0`. Lỗi CSDL `vc_rate_overlap` → 409 `gia_chong`, `vc_rate_carrier` → 409 `nha_xe_khong_hop_tac` (bắt trong hàm chạy lô riêng của tệp này, không đụng `loiRangBuocChuyen`).
  - `index.ts`: khai route cổng `office`, mỗi thân: `if (!can(staff, "transport.rate.manage")) return CAN_GIA();` đầu tiên, rồi đọc thân, rồi gọi `tien-xe-lenh`.

- [ ] **Bước 4: Chạy, thấy xanh** + bộ liên quan: `node --test src/modules/van-chuyen/tien-xe-route.test.ts src/permission-enforcement.test.ts src/route-write-guard.test.ts src/architecture.test.ts src/shared/permissions.test.ts`.

- [ ] **Bước 5: e2e** — `tests/e2e/tien-xe-thue.mjs` (khuôn `tests/e2e/dieu-phoi.mjs:1-30`): tạo nhà xe qua `/api/parties` + vai `CARRIER`, tuyến, cỡ, giá bằng tài khoản Kế toán; Bán hàng đọc `/api/van-chuyen/tuyen` 200, `/bang-gia` 403; thêm giá chồng 409; `sqlRows("SELECT typeof(amount) t FROM vc_rental_rate …")` = `integer`. Thêm `"tien-xe-thue"` vào `ALL` (`tests/e2e/run.mjs:42`) sau `"dieu-phoi"`. Chạy `npm run test:e2e -- tien-xe-thue`.

- [ ] **Bước 6: Commit** (gồm Task 3) — "Tiền xe thuê T1: ô quyền bảng giá (Quản trị = Kế toán) + route bảng giá, tuyến, cỡ xe".

---

## Task 5: Kiểm định kỳ `R-VC-RATE-1`, sổ hàng rào, tài liệu, nhật ký phiên bản T1 — rồi NGƯỜI KIỂM T1

**Files:** `scripts/audit-checks.mjs` (sau `R-VC-20` ~`:568`), `src/audit-invariants.test.ts`, `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` §5 + §7, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts` + `src/shared/app-info.test.ts`.

- [ ] **Bước 1: Test (đỏ)** trong `src/audit-invariants.test.ts`: gieo nhà xe + dòng giá mở, đóng vai `CARRIER` → `R-VC-RATE-1` báo 1 (mức `warn`); đóng dòng giá → 0.
- [ ] **Bước 2: Thêm kiểm**:

```js
  // R-VC-RATE-1 (ADR-0057 B4, mức warn): dòng giá ĐANG hiệu lực (hôm nay theo giờ VN) của hồ sơ không còn vai Nhà xe — Kế toán / Quản trị kết thúc dòng giá.
  {
    code: "R-VC-RATE-1",
    what: "dòng giá thuê xe còn hiệu lực của hồ sơ đã thôi vai nhà xe",
    sql: `SELECT count(*) FROM vc_rental_rate r WHERE COALESCE(r.valid_to_date, '9999-12-31') >= date('now', '+7 hours')
          AND r.carrier_party_id NOT IN (SELECT party_id FROM v_pty_carrier)`,
    level: "warn",
    note: "cảnh báo, không chặn phát hành: nhà xe đã thôi hợp tác mà còn giá — Kế toán / Quản trị bấm Kết thúc dòng giá",
  },
```

- [ ] **Bước 3:** `node --test src/audit-invariants.test.ts` xanh; `npm run db:migrate:local && node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Bước 4: `docs/SO-HANG-RAO.md`** — ba dòng: trigger chồng giá (`vc_rental_rate_overlap`), trigger chỉ-thêm giá (`vc_rental_rate_close_once` + `_no_delete`), trigger vai nhà xe lúc thêm (`vc_rental_rate_carrier`); cột "Đã thấy chặn thật" = ngày + phép đột biến của Task 2 bước 5. Thêm dòng bài ghim `ADMIN = ACCOUNTING` ở `transport.*` (đột biến: đổi `ADMIN` của `transport.rate.manage` thành `none` → đỏ → hoàn nguyên).
- [ ] **Bước 5: Tài liệu mô tả** — `SYSTEM-DESIGN.md` §5 (ba bảng mới), §7 (route, ô); `CHANGE-GUIDE.md` thêm công thức "thêm / đổi giá thuê xe" (đóng + thêm một lô; không sửa tiền). Mục nhật ký phiên bản (số = lớn nhất ở `origin/main` + 1 lúc gộp) lời thường: "Kế toán, Quản trị lưu được bảng giá thuê xe theo nhà xe (theo tuyến hoặc cỡ xe). Chưa có màn hình — sẽ có cùng phần chi phí chuyến." Cập nhật `app-info.test.ts` theo khuôn.
- [ ] **Bước 6:** `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` đủ bộ. Commit "Tiền xe thuê T1: kiểm định kỳ, sổ hàng rào, tài liệu".
- [ ] **Bước 7: Người kiểm độc lập T1** (subagent `nguoi-kiem-doc-lap`, chỉ đọc). Giao: ADR-0057 T1 + mục "Lát" của kế hoạch này + diff nhánh. Đòi báo cáo có tệp:dòng, lệnh đã tự chạy lại. Chỉ báo "đạt" khi báo cáo ĐẠT + test xanh. Chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai` (đổi app — có route mới).

---

## Task 6: Luật thuần chi phí chuyến + sổ vàng

**Files:**
- Modify: `src/modules/van-chuyen/tien-xe.ts`, `tien-xe.test.ts`
- Create: `golden/van-chuyen-chi-phi.json`, `src/so-vang-chi-phi-xe.test.ts`; Modify: `golden/README.md`

**Interfaces:**
- Produces:
```ts
export type LoaiDongChiPhi = "SNAPSHOT" | "AGREED" | "ADJUSTMENT" | "REVERSAL";
export interface DongChiPhi { id: string; kind: LoaiDongChiPhi; amount: number; reversesId: string | null; reasonCode: string | null; createdAt: string }
export function tongChiPhiChuyen(dong: readonly DongChiPhi[]): number;
export function dongConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi[];          // không phải REVERSAL, chưa bị đảo
export function nguonGiaConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi | null;  // SNAPSHOT | AGREED chưa đảo
export function thuTuDaoTatCa(dong: readonly DongChiPhi[]): DongChiPhi[];             // âm trước, dương sau; trong nhóm: mới nhất trước
export function phanLoaiThue(v: { chuXePartyId: string; congTyChuId: string | null; nhaXeDangMo: ReadonlySet<string>; cuRented: 0 | 1 | null }): 0 | 1;
export function tongBangKe(chuyen: readonly { tong: number }[]): number;              // tổng của các tổng đã qua tongChiPhiChuyen
```

- [ ] **Bước 1: Kiểm `ky-so`** (lặp Task 0 bước 3 trên `main` mới nhất). Ghi kết quả vào nhật ký.

- [ ] **Bước 2: Test thuần (đỏ)** thêm vào `tien-xe.test.ts`:

```ts
const D = (id: string, kind: LoaiDongChiPhi, amount: number, reversesId: string | null = null, t = id) => ({ id, kind, amount, reversesId, reasonCode: kind === "SNAPSHOT" ? null : "X", createdAt: t });

test("tongChiPhiChuyen / nguồn giá / còn hiệu lực — V7, V8", () => {
  const v7 = [D("s", "SNAPSHOT", 1_200_000), D("a", "ADJUSTMENT", 150_000), D("ra", "REVERSAL", -150_000, "a"), D("rs", "REVERSAL", -1_200_000, "s"), D("s2", "SNAPSHOT", 900_000)];
  assert.equal(tongChiPhiChuyen(v7), 900_000);
  assert.equal(nguonGiaConHieuLuc(v7)?.id, "s2");
  assert.deepEqual(dongConHieuLuc(v7).map((d) => d.id), ["s2"]);
  assert.equal(tongChiPhiChuyen([]), 0);
});

test("thuTuDaoTatCa: âm trước, dương sau — tổng không bao giờ âm giữa lô (V8)", () => {
  const dong = [D("s", "SNAPSHOT", 1_200_000, null, "1"), D("a1", "ADJUSTMENT", -200_000, null, "2"), D("a2", "ADJUSTMENT", 50_000, null, "3")];
  const thuTu = thuTuDaoTatCa(dong);
  assert.deepEqual(thuTu.map((d) => d.id), ["a1", "a2", "s"]); // trong mỗi nhóm dấu: MỚI NHẤT trước ("gỡ ngược")
  let tong = tongChiPhiChuyen(dong);
  for (const d of thuTu) { tong -= d.amount; assert.ok(tong >= 0, `âm sau khi đảo ${d.id}`); }
  assert.equal(tong, 0);
});

test("phanLoaiThue: nhà xe đang mở, không phải công ty chủ ⇒ 1; công ty chủ ⇒ 0; hồ sơ đã thôi vai: chuyến mới 0, đổi xe từ chuyến thuê giữ 1 (cấm hạ)", () => {
  const nx = new Set(["p-nx"]);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-nx", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: null }), 1);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cty", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: 1 }), 0);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cu", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: null }), 0);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cu", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: 1 }), 1);
  assert.equal(phanLoaiThue({ chuXePartyId: "p-cu", congTyChuId: "p-cty", nhaXeDangMo: nx, cuRented: 0 }), 0);
});
```

- [ ] **Bước 3: Mã** (thêm vào `tien-xe.ts`):

```ts
export type LoaiDongChiPhi = "SNAPSHOT" | "AGREED" | "ADJUSTMENT" | "REVERSAL";
export interface DongChiPhi { id: string; kind: LoaiDongChiPhi; amount: number; reversesId: string | null; reasonCode: string | null; createdAt: string }

/** MỘT nguồn tính tổng chi phí chuyến (ADR-0057 C6). Dòng đảo là số có dấu ngược ⇒ tổng = cộng mọi dòng. */
export function tongChiPhiChuyen(dong: readonly DongChiPhi[]): number {
  let t = 0;
  for (const d of dong) t += d.amount;
  return t;
}
const daBiDao = (dong: readonly DongChiPhi[]) => new Set(dong.filter((d) => d.kind === "REVERSAL").map((d) => d.reversesId));
export function dongConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi[] {
  const dao = daBiDao(dong);
  return dong.filter((d) => d.kind !== "REVERSAL" && !dao.has(d.id));
}
export function nguonGiaConHieuLuc(dong: readonly DongChiPhi[]): DongChiPhi | null {
  return dongConHieuLuc(dong).find((d) => d.kind === "SNAPSHOT" || d.kind === "AGREED") ?? null;
}
/** Mới nhất trước (createdAt giảm dần, rồi id giảm dần) — "gỡ ngược" theo thời gian trong mỗi nhóm dấu. */
const sapXep = (a: DongChiPhi, b: DongChiPhi) => (a.createdAt === b.createdAt ? (a.id < b.id ? 1 : -1) : a.createdAt < b.createdAt ? 1 : -1);
/** ADR-0057 C8 "thứ tự đảo": các dòng ÂM trước (đảo ⇒ tổng tăng), rồi DƯƠNG (tổng giảm dần về 0) ⇒ trigger "tổng ≥ 0" canh được từng dòng. Trong
 *  mỗi nhóm: mới nhất trước (khớp ví dụ vàng V7: đảo phụ thu rồi mới đảo giá bảng). */
export function thuTuDaoTatCa(dong: readonly DongChiPhi[]): DongChiPhi[] {
  const con = dongConHieuLuc(dong);
  return [...con.filter((d) => d.amount < 0).sort(sapXep), ...con.filter((d) => d.amount > 0).sort(sapXep)];
}
/** Cờ xe thuê (ADR C2a): chủ là công ty chủ ⇒ 0; chủ đang mở vai nhà xe ⇒ 1; còn lại (đã thôi vai) ⇒ giữ cờ cũ khi đổi xe (cấm hạ), 0 khi tạo mới. */
export function phanLoaiThue(v: { chuXePartyId: string; congTyChuId: string | null; nhaXeDangMo: ReadonlySet<string>; cuRented: 0 | 1 | null }): 0 | 1 {
  if (v.chuXePartyId === v.congTyChuId) return 0;
  if (v.nhaXeDangMo.has(v.chuXePartyId)) return 1;
  return v.cuRented === 1 ? 1 : 0;
}
export const tongBangKe = (chuyen: readonly { tong: number }[]): number => chuyen.reduce((t, c) => t + c.tong, 0);
```

- [ ] **Bước 4: Sổ vàng** — `golden/van-chuyen-chi-phi.json`, một ca mỗi dòng V1–V13 của "Ví dụ vàng":

```json
{
  "luat": "ADR-0057 T1 B2 + T2 C4/C8 — giá thuê xe theo chuyến, chi phí chuyến",
  "bang_gia": [
    { "id": "G1", "nha_xe": "HP", "tuyen": "NT-CR", "co": "C16", "tien": 1200000, "tu": "2026-10-01", "den": "2026-10-31" },
    { "id": "G2", "nha_xe": "HP", "tuyen": "NT-CR", "co": null, "tien": 1000000, "tu": "2026-10-01", "den": "2026-10-31" },
    { "id": "G3", "nha_xe": "HP", "tuyen": null, "co": "C16", "tien": 900000, "tu": "2026-10-01", "den": null },
    { "id": "G4", "nha_xe": "HP", "tuyen": "NT-CR", "co": null, "tien": 1100000, "tu": "2026-11-01", "den": null }
  ],
  "co_xe": [{ "code": "C16", "min": 10, "max": 16 }, { "code": "C29", "min": 17, "max": 29 }],
  "cac_ca": [
    {
      "ma": "SV-CPX-07",
      "mo_ta": "V7: chụp NT-CR 16 chỗ, phụ thu +150.000, đổi tuyến sang NT-DL trước xuất bến",
      "xac_nhan": { "trang_thai": "cho_xac_nhan", "nguoi": null, "ngay": null },
      "chuyen": { "nha_xe": "HP", "so_cho": 16, "tuyen": "NT-CR", "ngay": "2026-10-15" },
      "su_kien": [
        { "loai": "CHUP" },
        { "loai": "DIEU_CHINH", "tien": 150000, "ly_do": "CPX_PHU_THU_CHO" },
        { "loai": "DOI_TUYEN", "tuyen": "NT-DL" }
      ],
      "dap_an": { "dong": [["SNAPSHOT", 1200000], ["ADJUSTMENT", 150000], ["REVERSAL", -150000], ["REVERSAL", -1200000], ["SNAPSHOT", 900000]], "tong": 900000, "thieu_gia": false }
    }
  ]
}
```

(Đủ 14 ca V1…V13 + V5b, V6b, V8b, V12b theo bảng; mã `SV-CPX-01…`; sự kiện dùng tập đóng `CHUP`, `GIA_THOA_THUAN`, `DIEU_CHINH`, `DAO`(id dòng), `DOI_TUYEN`, `DOI_XE`(so_cho, nha_xe|"CONG_TY"), `HUY`, `KET_THUC_GIAN_DOAN`, `THEM_GIA`.)

- [ ] **Bước 5: Bài sổ vàng** — `src/so-vang-chi-phi-xe.test.ts`: (lớp 1, mọi ca) `dap_an.tong` = cộng `dap_an.dong`; mỗi `REVERSAL` đối dấu một dòng trước nó chưa bị đảo; tiền nguyên; xác nhận `da_xac_nhan` phải có người + ngày. (lớp 2, chỉ ca `da_xac_nhan`) chạy một bộ mô phỏng thuần dùng `chonDongGiaThue`, `coXeCua`, `thuTuDaoTatCa`, `nguonGiaConHieuLuc`, `tongChiPhiChuyen` qua chuỗi sự kiện, so `dap_an` từng đồng; in "chưa áp dụng" cho ca chờ; **khi chưa có ca nào xác nhận thì bài lớp 2 báo `todo`, không xanh vì rỗng** (khuôn `golden/README.md` "Hai lớp kiểm"). Thêm hàng vào bảng "Tệp" của `golden/README.md`.
- [ ] **Bước 6:** `node --test src/modules/van-chuyen/tien-xe.test.ts src/so-vang-chi-phi-xe.test.ts` xanh. Commit "Tiền xe thuê T2: luật thuần chi phí chuyến + sổ vàng (chờ Kế toán xác nhận)".

---

## Task 7: Migration T2 — cờ xe thuê, tuyến trên chuyến, dòng chi phí, cổng thiếu giá (CSDL)

**Files:**
- Create: `migrations/<N+1>_vc_chi_phi_chuyen.sql`
- Modify: `src/migrations-tien-xe-thue.test.ts`, `src/migrations-chuyen-xe.test.ts:110-117` (hàm `chuyen()`), `docs/data-dictionary.json`

**Interfaces:**
- Produces: `vc_trip.rented INTEGER NOT NULL DEFAULT 0`, `vc_trip.route_code TEXT NULL`; bảng `vc_trip_cost_line`; lý do nhóm `CHI_PHI_XE`; tiền tố lỗi `vc_rented_`, `vc_route_locked`, `vc_trip_insert_planned`, `thieu_gia`, `vc_cost_`.

- [ ] **Bước 1: Test CSDL (đỏ)** — thêm vào `src/migrations-tien-xe-thue.test.ts` (hàm gieo chuyến: chép `chuyen()`/`laiXe()` của `migrations-chuyen-xe.test.ts:110-120` nhưng có cột `rented` truyền vào; `xuatBen(db, trip)` = chèn `vc_trip_departure_check` ĐẠT với `cmd_id = last_cmd_id` rồi `UPDATE vc_trip SET status='RUNNING', departed_at=?, departed_ms=?`). Ca bắt buộc (mỗi ca một `test`):
  1. Chèn chuyến `status = 'RUNNING'` thẳng → `vc_trip_insert_planned`.
  2. Chèn chuyến xe nhà xe với `rented = 0` → `vc_rented_mismatch`; xe công ty với `rented = 1` → `vc_rented_mismatch`; chủ chụp = công ty chủ trên xe nhà xe → vẫn `lc13_carrier` (thứ tự cũ giữ).
  3. Đổi xe sang xe nhà xe khác đang hợp tác mà để `rented = 0` → `vc_rented_change`; sang xe công ty để `rented = 1` → `vc_rented_change`.
  4. Nhà xe thôi vai; đổi chuyến `rented = 1` sang xe khác của chính nhà xe đó với `rented = 0` → `vc_rented_lower`; giữ `1` → được.
  5. `UPDATE vc_trip SET rented = 1` riêng → `vc_rented_alone`.
  6. Đổi `route_code` khi `RUNNING` → `vc_route_locked`; khi `PLANNED` → được.
  7. Chuyến `rented = 1` không nguồn giá: `xuatBen` → `thieu_gia`; có `SNAPSHOT` → được; có `AGREED` → được; `SNAPSHOT` đã đảo → `thieu_gia`. Chuyến `rented = 0` → xuất bến được không cần giá.
  8. Dòng chi phí: `UPDATE`/`DELETE` → `vc_cost_append_only`; `SNAPSHOT` 0 / `AGREED` âm / `ADJUSTMENT` 0 → CHECK; `SNAPSHOT` thiếu `rate_id` → CHECK; `AGREED` thiếu lý do → CHECK; lý do không thuộc nhóm `CHI_PHI_XE` → `vc_cost_reason`.
  9. `REVERSAL` sai số / sai chuyến / đảo dòng đảo → `vc_cost_reversal`; đảo cùng gốc hai lần → `UNIQUE constraint failed: vc_trip_cost_line.reverses_id`.
  10. Hai nguồn giá chưa đảo (`SNAPSHOT` rồi `AGREED`) → `vc_cost_one_source`.
  11. `SNAPSHOT`/`AGREED` khi chuyến `RUNNING`/`ENDED`/`CANCELLED` → `vc_cost_planned_only`; đảo `SNAPSHOT` khi `RUNNING` → `vc_cost_planned_only`; đảo `ADJUSTMENT` khi `ENDED` → được (tổng ≥ 0).
  12. Tổng âm: `SNAPSHOT` 1.200.000 + `ADJUSTMENT` −200.000, chèn `REVERSAL` của `SNAPSHOT` → `vc_cost_total_negative` (V9); đảo âm trước rồi dương → được, tổng 0 (V8).
  13. `SNAPSHOT` cho chuyến `rented = 0` → `vc_cost_source_carrier`; cho nhà xe khác `carrier_party_id` của chuyến → `vc_cost_source_carrier`; `SNAPSHOT` với `rate_id` của nhà xe khác hoặc `amount` khác giá dòng → `vc_cost_snapshot_rate`. Nhà xe thôi vai: `ADJUSTMENT` và `REVERSAL` vẫn được (luật vai chỉ áp nguồn giá — **người kiểm soi**).
  14. (Nếu Task 0 bước 3 / Task 6 bước 1 thấy `ky-so`) dòng chi phí `occurred_date` thuộc tháng đã khoá → `period_closed`.

- [ ] **Bước 2: Chạy, thấy đỏ.**

- [ ] **Bước 3: Migration** — `migrations/<N+1>_vc_chi_phi_chuyen.sql`:

```sql
-- Migration <N+1> — ADR-0057 T2 (accepted 2026-09-30, chủ lần 18 "chưa có giá thì không được chạy"): CHI PHÍ CHUYẾN XE THUÊ. CHỈ THÊM.
-- (1) vc_trip.rented: cờ xe thuê CHỤP lúc xếp / đổi xe (phân loại theo chủ chụp carrier_party_id); không đọc "công ty chủ hiện tại" lúc xuất bến (ADR-0043).
--     DEFAULT 0, KHÔNG backfill (Cần chủ 1 của kế hoạch Đợt 4 — chủ chọn A) [nếu chủ chọn B: câu UPDATE PLANNED đặt NGAY SAU ADD COLUMN, TRƯỚC trigger].
-- (2) vc_trip.route_code: nhãn tuyến để tra giá, đổi được khi PLANNED. (3) vc_trip_cost_line: chỉ-thêm, dấu có nghĩa (dòng đảo = số đối dấu gốc).
-- (4) thieu_gia: chuyến rented = 1 chỉ sang RUNNING khi có SNAPSHOT/AGREED chưa đảo — không ai phá lệ. (5) siết: không chèn chuyến khác PLANNED.
-- Trigger chỉ đọc bảng vc_ + v_pty_carrier, v_pty_owner_company (đã trong VIEW_CHO_TRIGGER_VC).
ALTER TABLE vc_trip ADD COLUMN rented INTEGER NOT NULL DEFAULT 0 CHECK (rented IN (0, 1));
ALTER TABLE vc_trip ADD COLUMN route_code TEXT REFERENCES vc_route(code);

CREATE TRIGGER vc_trip_insert_planned BEFORE INSERT ON vc_trip
WHEN NEW.status <> 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_trip_insert_planned: chuyến mới phải ở trạng thái lập kế hoạch'); END;
CREATE TRIGGER vc_trip_rented_ins BEFORE INSERT ON vc_trip
WHEN NEW.rented IS NOT (CASE WHEN EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
                              AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id) THEN 1 ELSE 0 END)
BEGIN SELECT RAISE(ABORT, 'vc_rented_mismatch: cờ xe thuê phải khớp chủ xe lúc xếp'); END;
CREATE TRIGGER vc_trip_rented_change BEFORE UPDATE OF vehicle_id, carrier_party_id ON vc_trip
WHEN (NEW.vehicle_id IS NOT OLD.vehicle_id OR NEW.carrier_party_id IS NOT OLD.carrier_party_id)
  AND NEW.rented IS NOT (CASE WHEN EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id) THEN 0
                              WHEN EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id) THEN 1
                              ELSE NEW.rented END)
BEGIN SELECT RAISE(ABORT, 'vc_rented_change: cờ xe thuê phải khớp chủ xe mới'); END;
-- Bịt kẽ tái phân loại (ADR C2a): chỉ hạ 1 → 0 khi chủ xe mới là CÔNG TY CHỦ.
CREATE TRIGGER vc_trip_rented_lower BEFORE UPDATE OF rented ON vc_trip
WHEN OLD.rented = 1 AND NEW.rented = 0 AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id)
BEGIN SELECT RAISE(ABORT, 'vc_rented_lower: chuyến xe thuê chỉ thôi là xe thuê khi đổi sang xe công ty'); END;
CREATE TRIGGER vc_trip_rented_alone BEFORE UPDATE OF rented ON vc_trip
WHEN NEW.rented IS NOT OLD.rented AND NEW.vehicle_id IS OLD.vehicle_id AND NEW.carrier_party_id IS OLD.carrier_party_id
BEGIN SELECT RAISE(ABORT, 'vc_rented_alone: không đổi riêng cờ xe thuê'); END;
CREATE TRIGGER vc_trip_route_locked BEFORE UPDATE OF route_code ON vc_trip
WHEN NEW.route_code IS NOT OLD.route_code AND OLD.status <> 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_route_locked: chuyến đã chạy — không đổi tuyến'); END;

CREATE TABLE vc_trip_cost_line (
  id                           TEXT PRIMARY KEY,
  trip_id                      TEXT NOT NULL REFERENCES vc_trip(id),
  carrier_party_id             TEXT NOT NULL REFERENCES pty_party(id),
  kind                         TEXT NOT NULL CHECK (kind IN ('SNAPSHOT', 'AGREED', 'ADJUSTMENT', 'REVERSAL')),
  amount                       INTEGER NOT NULL CHECK (amount = round(amount)),
  rate_id                      TEXT REFERENCES vc_rental_rate(id),
  route_code_snapshot          TEXT,
  vehicle_size_code_snapshot   TEXT,
  passenger_capacity_snapshot  INTEGER,
  unit_amount_snapshot         INTEGER,
  reason_code                  TEXT REFERENCES vc_reason(code),
  note                         TEXT CHECK (note IS NULL OR length(note) <= 300),
  reverses_id                  TEXT UNIQUE REFERENCES vc_trip_cost_line(id),
  occurred_date                TEXT NOT NULL CHECK (date(occurred_date) IS occurred_date),
  cmd_id                       TEXT NOT NULL CHECK (length(cmd_id) = 36),
  created_at                   TEXT NOT NULL,
  created_by                   TEXT,
  updated_at                   TEXT NOT NULL,
  updated_by                   TEXT,
  CHECK (kind <> 'SNAPSHOT' OR amount > 0),
  CHECK (kind <> 'AGREED' OR amount > 0),
  CHECK (kind <> 'ADJUSTMENT' OR amount <> 0),
  CHECK ((kind = 'SNAPSHOT') = (rate_id IS NOT NULL)),
  CHECK (kind <> 'SNAPSHOT' OR (passenger_capacity_snapshot IS NOT NULL AND unit_amount_snapshot = amount)),
  CHECK (kind = 'SNAPSHOT' OR reason_code IS NOT NULL),
  CHECK ((kind = 'REVERSAL') = (reverses_id IS NOT NULL))
);
CREATE INDEX vc_trip_cost_line_trip_ix ON vc_trip_cost_line(trip_id, created_at);
CREATE INDEX vc_trip_cost_line_date_ix ON vc_trip_cost_line(occurred_date);
CREATE TRIGGER vc_trip_cost_line_no_update BEFORE UPDATE ON vc_trip_cost_line
BEGIN SELECT RAISE(ABORT, 'vc_cost_append_only: dòng chi phí không sửa — ghi dòng đảo hoặc điều chỉnh'); END;
CREATE TRIGGER vc_trip_cost_line_no_delete BEFORE DELETE ON vc_trip_cost_line
BEGIN SELECT RAISE(ABORT, 'vc_cost_append_only: dòng chi phí không xoá'); END;
CREATE TRIGGER vc_trip_cost_line_reason BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.reason_code IS NOT NULL AND NOT EXISTS (SELECT 1 FROM vc_reason r WHERE r.code = NEW.reason_code AND r.reason_group = 'CHI_PHI_XE')
BEGIN SELECT RAISE(ABORT, 'vc_cost_reason: lý do phải thuộc nhóm chi phí xe'); END;
CREATE TRIGGER vc_trip_cost_line_reversal BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind = 'REVERSAL' AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line g WHERE g.id = NEW.reverses_id AND g.trip_id = NEW.trip_id
  AND g.kind <> 'REVERSAL' AND g.amount = -NEW.amount AND g.carrier_party_id = NEW.carrier_party_id)
BEGIN SELECT RAISE(ABORT, 'vc_cost_reversal: dòng đảo phải đối dấu đúng dòng gốc cùng chuyến'); END;
-- MỘT trigger đếm chung hai loại nguồn giá (ADR C8).
CREATE TRIGGER vc_trip_cost_line_one_source BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind IN ('SNAPSHOT', 'AGREED') AND EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = NEW.trip_id AND l.kind IN ('SNAPSHOT', 'AGREED')
  AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))
BEGIN SELECT RAISE(ABORT, 'vc_cost_one_source: chuyến đã có giá — đảo giá cũ trước'); END;
CREATE TRIGGER vc_trip_cost_line_source_planned BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind IN ('SNAPSHOT', 'AGREED') AND (SELECT t.status FROM vc_trip t WHERE t.id = NEW.trip_id) IS NOT 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_cost_planned_only: chỉ đặt giá khi chuyến chưa xuất bến'); END;
CREATE TRIGGER vc_trip_cost_line_reverse_source_planned BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind = 'REVERSAL' AND (SELECT g.kind FROM vc_trip_cost_line g WHERE g.id = NEW.reverses_id) IN ('SNAPSHOT', 'AGREED')
  AND (SELECT t.status FROM vc_trip t WHERE t.id = NEW.trip_id) IS NOT 'PLANNED'
BEGIN SELECT RAISE(ABORT, 'vc_cost_planned_only: giá đã chụp không đảo được sau khi xe chạy — dùng điều chỉnh'); END;
-- Tổng ≥ 0 SAU MỌI DÒNG, không miễn dòng nào (ADR C8 — lô đảo âm trước, dương sau).
CREATE TRIGGER vc_trip_cost_line_total BEFORE INSERT ON vc_trip_cost_line
WHEN (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = NEW.trip_id) + NEW.amount < 0
BEGIN SELECT RAISE(ABORT, 'vc_cost_total_negative: tổng chi phí chuyến sẽ âm'); END;
-- Luật vai CHỈ cho SNAPSHOT / AGREED (đảo, điều chỉnh của nhà xe đã thôi vai luôn làm được).
CREATE TRIGGER vc_trip_cost_line_source_carrier BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind IN ('SNAPSHOT', 'AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip t WHERE t.id = NEW.trip_id AND t.rented = 1 AND t.carrier_party_id = NEW.carrier_party_id
  AND EXISTS (SELECT 1 FROM v_pty_carrier c WHERE c.party_id = NEW.carrier_party_id)
  AND NOT EXISTS (SELECT 1 FROM v_pty_owner_company o WHERE o.party_id = NEW.carrier_party_id))
BEGIN SELECT RAISE(ABORT, 'vc_cost_source_carrier: giá chỉ đặt cho chuyến xe thuê của nhà xe đang hợp tác'); END;
CREATE TRIGGER vc_trip_cost_line_snapshot_rate BEFORE INSERT ON vc_trip_cost_line
WHEN NEW.kind = 'SNAPSHOT' AND NOT EXISTS (SELECT 1 FROM vc_rental_rate r WHERE r.id = NEW.rate_id AND r.carrier_party_id = NEW.carrier_party_id AND r.amount = NEW.amount)
BEGIN SELECT RAISE(ABORT, 'vc_cost_snapshot_rate: giá chụp phải đúng dòng giá của nhà xe'); END;
-- Cổng xuất bến lớp CSDL (khuôn vc_trip_running_requires_check, 0042:396). Chỉ đọc bảng vc_ của chính chuyến.
CREATE TRIGGER vc_trip_thieu_gia BEFORE UPDATE OF status ON vc_trip
WHEN NEW.status = 'RUNNING' AND OLD.status = 'PLANNED' AND NEW.rented = 1 AND NOT EXISTS (
  SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = NEW.id AND l.kind IN ('SNAPSHOT', 'AGREED')
    AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))
BEGIN SELECT RAISE(ABORT, 'thieu_gia: chuyến xe thuê chưa có giá — không xuất bến'); END;

INSERT INTO vc_reason (code, reason_group, label, sort_order, created_at, updated_at) VALUES
  ('CPX_PHU_THU_CHO', 'CHI_PHI_XE', 'Phụ thu chờ thêm giờ', 1, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_CAU_DUONG', 'CHI_PHI_XE', 'Phí cầu đường, bến bãi', 2, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_HUY_MUON', 'CHI_PHI_XE', 'Phí huỷ muộn', 3, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_NHAP_SAI', 'CHI_PHI_XE', 'Nhập sai', 4, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_GIA_THOA_THUAN', 'CHI_PHI_XE', 'Giá thoả thuận trước', 5, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_DOI_CHUYEN', 'CHI_PHI_XE', 'Đổi nhà xe, xe hoặc tuyến trước xuất bến', 90, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_HUY_CHUYEN', 'CHI_PHI_XE', 'Huỷ chuyến trước xuất bến', 91, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z'),
  ('CPX_KHAC', 'CHI_PHI_XE', 'Khác', 99, '2026-10-01T00:00:00.000Z', '2026-10-01T00:00:00.000Z');
```

(Mốc cố định theo khuôn `0041:118`. Hai mã `CPX_DOI_CHUYEN`, `CPX_HUY_CHUYEN` là mã HỆ THỐNG — `MA_LY_DO_HE_THONG`, Task 8 — route điều chỉnh / đảo của Kế toán từ chối dùng chúng.)

- [ ] **Bước 3b (chỉ khi `ky-so` đã ở `main`):** thêm trigger theo ADR-0080 điều 3:

```sql
CREATE TRIGGER vc_trip_cost_line_period_closed BEFORE INSERT ON vc_trip_cost_line
WHEN substr(NEW.occurred_date, 1, 7) IN (SELECT period FROM v_ky_closed_period)
BEGIN SELECT RAISE(ABORT, 'period_closed: tháng đã khoá sổ — ghi vào tháng đang mở'); END;
```

và thêm `v_ky_closed_period` vào `VIEW_CHO_TRIGGER_VC` (`src/architecture.test.ts:857`) — **đây là nới hàng rào** ⇒ ghi tệp đề xuất luật `docs/superpowers/plans/<ngày>-dot-4-de-xuat-luat.md`, chủ duyệt trước khi gộp (Điều 9.4). Nếu ADR-0080 đã tự thêm view đó vào danh sách khi thi công `ky-so` thì chỉ ghi "đã có".

- [ ] **Bước 4: Sửa fixture** `src/migrations-chuyen-xe.test.ts:110-117` hàm `chuyen()`: tính `rented` theo chủ chụp rồi truyền vào INSERT:

```ts
  const rented = one<{ r: number }>(db, `SELECT CASE WHEN ? IN (SELECT party_id FROM v_pty_carrier) AND ? NOT IN (SELECT party_id FROM v_pty_owner_company) THEN 1 ELSE 0 END r`, chu, chu).r;
```

Thêm cột `rented` vào câu INSERT `:115`. `:624` (mong `lc13_carrier`) và `:683` (xe công ty) giữ nguyên — chạy để chứng minh. Đo `src/audit-invariants.test.ts:1110-1126` (`tho()` gỡ trigger `vc_trip%`, gồm cả `vc_trip_cost_line_*`): chạy bộ; chỉ sửa nếu đỏ.

- [ ] **Bước 5: Chạy xanh:** `node --test src/migrations-tien-xe-thue.test.ts src/migrations-chuyen-xe.test.ts src/audit-invariants.test.ts src/architecture.test.ts`.
- [ ] **Bước 6: P16** — mỗi trigger dưới đây: xoá tạm (hoặc đổi điều kiện) → ca tương ứng đỏ → hoàn nguyên → xanh; ghi nhật ký (phép đột biến + thông báo đỏ): `vc_trip_thieu_gia` (bỏ ⇒ `UPDATE status='RUNNING'` tay qua được — ADR Hệ quả 4), `vc_trip_insert_planned`, `vc_trip_rented_lower`, `vc_trip_cost_line_one_source`, `vc_trip_cost_line_total` (hai ca V9 và "đảo điều chỉnh dương làm tổng âm"), `vc_trip_cost_line_source_planned`, `vc_trip_cost_line_source_carrier`, `vc_trip_cost_line_reversal`, `vc_trip_cost_line_no_update`.
- [ ] **Bước 7:** `docs/data-dictionary.json`: thêm `vc_trip_cost_line` (`table`), ghi hai cột mới của `vc_trip` (theo khuôn tệp). `npm run dict`. Commit "Tiền xe thuê T2: dòng chi phí chuyến chỉ-thêm, cờ xe thuê, cổng thiếu giá ở CSDL".

---

## Task 8: Cổng `THIEU_GIA` ở máy chủ (luật thuần + đọc nguồn giá)

**Files:**
- Modify: `src/shared/ly-do-giu.ts` (`MA_GIU`), `src/shared/dieu-phoi-kieu.ts:242` (`ChuyenVao`), `:30` (`MA_LY_DO_HE_THONG`), `src/shared/dieu-phoi-kiem.ts:302` (`kiemXuatBen`), `src/modules/van-chuyen/chuyen-repo.ts:10-35` (`TripRow`, `COT_CHUYEN`), `src/modules/van-chuyen/dieu-phoi-doc.ts:77` (`chuyenVao`)
- Modify: mọi chỗ dựng `ChuyenVao` thủ công trong test (`grep -rn "nghiPhaLe:" src tests --include=*.ts` — gồm `src/dieu-phoi-ca-mau.test.ts`, `src/shared/dieu-phoi-*.test.ts`)
- Test: `src/shared/dieu-phoi-kiem.test.ts` (hoặc tệp bài `kiemXuatBen` hiện có — `grep -ln "kiemXuatBen" src/shared/*.test.ts`)

**Interfaces:**
- Produces: `ChuyenVao.thue: boolean` (= `rented = 1`), `ChuyenVao.coNguonGia: boolean`; `TripRow.rented: 0|1`, `TripRow.route_code: string|null`, `TripRow.co_nguon_gia: 0|1`; mã giữ `THIEU_GIA`.

- [ ] **Bước 1: Test (đỏ):**

```ts
test("ADR-0057 C5: kiemXuatBen — chuyến xe thuê không nguồn giá → giữ THIEU_GIA (Quản trị); có nguồn giá hoặc không thuê → không; KHÔNG trong MA_LUAT_PHA_LE", () => {
  const vao = khungDat(); // dựng KiemXuatBenVao ĐẠT theo khuôn bài kiemXuatBen hiện có
  assert.deepEqual(kiemXuatBen({ ...vao, chuyen: { ...vao.chuyen, thue: true, coNguonGia: false } }).lyDo.map((l) => l.ma), ["THIEU_GIA"]);
  assert.equal(kiemXuatBen({ ...vao, chuyen: { ...vao.chuyen, thue: true, coNguonGia: true } }).dat, true);
  assert.equal(kiemXuatBen({ ...vao, chuyen: { ...vao.chuyen, thue: false, coNguonGia: false } }).dat, true);
  assert.equal(MA_GIU.THIEU_GIA.aiXuLy, "QUAN_TRI");
  assert.match(MA_GIU.THIEU_GIA.loiNhan, /Kế toán/);
  assert.ok(!(MA_LUAT_PHA_LE as readonly string[]).includes("THIEU_GIA"));
});
```

- [ ] **Bước 2: Đỏ.** **Bước 3: Mã:**
  - `MA_GIU` (nhóm "Giấy tờ (Quản trị)"): `THIEU_GIA: { loiNhan: "Chuyến xe thuê chưa có giá — Quản trị hoặc Kế toán nhập giá bảng hoặc giá thoả thuận", aiXuLy: "QUAN_TRI" },` (G-T5: không thêm `KE_TOAN` vào `AI_XU_LY`).
  - `ChuyenVao`: thêm `/** Cờ xe thuê chụp lúc xếp (ADR-0057 C2a). */ thue: boolean; /** Có SNAPSHOT/AGREED chưa đảo — CHỈ cờ, không số tiền (bài số lạ). */ coNguonGia: boolean;`
  - `kiemXuatBen` ngay sau kiểm xe/tài xế: `if (c.thue && !c.coNguonGia) lyDo.push(lyDoGiu("THIEU_GIA", c.ma));`
  - `COT_CHUYEN` thêm: `t.rented, t.route_code, EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = t.id AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id)) AS co_nguon_gia` (một truy vấn, không N+1, không tiền).
  - `chuyenVao`: `thue: t.rented === 1, coNguonGia: t.co_nguon_gia === 1`.
  - `MA_LY_DO_HE_THONG = ["BO_QUA_KHONG_CON_KHACH", "CPX_DOI_CHUYEN", "CPX_HUY_CHUYEN"] as const`.
  - `rules.ts` `loiRangBuocChuyen` (`:148`) — thêm TRƯỚC dòng `CHECK constraint failed`:

```ts
  if (/\bthieu_gia:/.test(message)) return { status: 409, code: "thieu_gia", message: MA_GIU.THIEU_GIA.loiNhan };
  if (/\bvc_cost_total_negative:/.test(message)) return { status: 409, code: "tong_am", message: "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước." };
  if (/\bvc_cost_source_carrier:/.test(message)) return { status: 409, code: "carrier_inactive", message: CAU_NHA_XE_THOI };
  if (/\bvc_cost_(one_source|planned_only|reversal|append_only|reason|snapshot_rate):|\bvc_rented_|\bvc_route_locked|\bvc_trip_insert_planned|UNIQUE constraint failed: vc_trip_cost_line\.reverses_id/.test(message)) {
    return { status: 409, code: "chi_phi_vua_doi", message: "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại." };
  }
```

với `const CAU_NHA_XE_THOI = "Nhà xe này đã thôi hợp tác nên máy không tính lại giá được. Hãy chọn xe của nhà xe khác, hoặc giữ tuyến cũ.";` (nguyên văn ADR C4).
- [ ] **Bước 4:** sửa mọi chỗ dựng `ChuyenVao` trong test (thêm `thue: false, coNguonGia: false`; ca mẫu B23 xe nhà xe trong `golden/dieu-phoi/xe-a-b-luot-1.json` — **không đổi đáp án** đã có: đưa `coNguonGia: true` vào đầu vào ca đó và ghi chú lý do trong nhật ký; nếu ca đó đã `da_xac_nhan`, DỪNG hỏi điều phối).
- [ ] **Bước 5:** `npm test` + `npm run typecheck` xanh. Commit "Tiền xe thuê T2: lý do giữ 'chưa có giá' ở cổng xuất bến (không phá lệ)".

---

## Task 9: Chụp / đảo chi phí trong lô tạo, sửa, huỷ chuyến (Review Focus 1, 2, 3, 5)

**Files:**
- Modify: `src/modules/van-chuyen/dieu-phoi.ts` (`LenhTaoChuyen` `:105`, `loTaoChuyen` `:112`, `LenhSuaChuyen` `:123`, `loSuaChuyen` `:134`, `LenhHuy` `:229`, `loHuy` `:239`)
- Modify: `src/modules/van-chuyen/chuyen-repo.ts` (`TRIP_INSERT` `:272`, `TRIP_UPDATE_PLAN` `:312`) ; `tien-xe-repo.ts` (câu chi phí)
- Modify: `src/modules/van-chuyen/dieu-phoi-lenh.ts` (`lenhSuaChuyen` `:37-98`, `lenhHuy` `:256`), `src/modules/van-chuyen/index.ts:817-866` (route tạo chuyến), `dieu-phoi-than.ts:33`, `:58` (thân có `tuyen`)
- Create: `src/modules/van-chuyen/tien-xe-lo.ts` (dựng câu chi phí cho lô — thuần, nhận dữ liệu đã đọc)
- Test: `src/modules/van-chuyen/thu-tu-lo.test.ts` (`MAU`), `tien-xe-route.test.ts`, `tests/e2e/tien-xe-thue.mjs`

**Interfaces:**
- Consumes: `chonDongGiaThue`, `coXeCua`, `thuTuDaoTatCa`, `phanLoaiThue` (Task 1, 6); `nhaXeDangHopTac`, `ownerCompany`.
- Produces:
```ts
// tien-xe-lo.ts
export interface ChupMoi { id: string; rateId: string; amount: number; carrierPartyId: string; routeCode: string | null; sizeCode: string | null; soCho: number; ngayChay: string }
export interface DaoMot { id: string; goc: { id: string; amount: number; carrierPartyId: string }; lyDo: "CPX_DOI_CHUYEN" | "CPX_HUY_CHUYEN"; ngay: string }
export interface KeHoachChiPhi { dao: DaoMot[]; chup: ChupMoi | null; phienBan: number /* dong.length — số dòng đọc trước lô; câu cổng so count(*) */; daoDieuChinh: number /* số ADJUSTMENT bị đảo — trả cho phản hồi, không tiền */ }
export function keHoachChiPhiKhiDoi(v: {
  dong: readonly DongChiPhi[]; rentedMoi: 0 | 1; chuXeMoi: string; congTyChuId: string | null; nhaXeDangMo: ReadonlySet<string>;
  doiXeHoacNhaXe: boolean; doiTuyen: boolean; doiNgay: boolean; laTaoMoi: boolean;
  tuyenMoi: string | null; soChoMoi: number; ngayChayMoi: string; gia: readonly DongGiaThue[]; coXe: readonly CoXe[]; homNay: string;
}): { ok: true; kh: KeHoachChiPhi } | { ok: false; loi: "carrier_inactive" };
export function cauChiPhi(db: D1Database, l: LenhChung, tripId: string, kh: KeHoachChiPhi): { dao: CauCoNhan[]; chup: CauCoNhan[] };
```
- Thứ tự lô (bài `thu-tu-lo.test.ts` luật 1–4):
  - **Tạo:** `TRIP_INSERT` (cổng, có `rented`, `route_code`) → nhật ký → sự kiện → tài xế → **chụp** (nếu có).
  - **Sửa:** cổng → nhật ký → sự kiện → **đảo âm → đảo dương** → `TRIP_UPDATE_PLAN` (đặt `rented`, `route_code`) → tài xế → điểm → **chụp**.
  - **Huỷ:** cổng → nhật ký → sự kiện → đóng suất → đóng tài xế → bỏ điểm → **đảo âm → đảo dương** → `TRIP_CANCEL` (trạng thái cuối, CUỐI lô).
- Câu chi phí (đều qua lính gác đúng chuỗi `LINH_GAC`):

```sql
-- COST_REVERSE (?1 id, ?2 trip, ?3 cmd, ?4 gốc, ?5 số tiền = −gốc, ?6 nhà xe của gốc, ?7 lý do hệ thống, ?8 ngày, ?9 lúc, ?10 người)
-- Phiên bản chi phí KHÔNG đặt ở đây mà ở câu cổng TRIP_GATE_CHI_PHI (xem dưới — lý do).
INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, reverses_id, reason_code, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
SELECT ?1, ?2, ?6, 'REVERSAL', ?5, ?4, ?7, ?8, ?3, ?9, ?10, ?9, ?10
 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)
-- COST_SNAPSHOT (?1 id, ?2 trip, ?3 cmd, ?4 nhà xe, ?5 tiền, ?6 rate, ?7 tuyến, ?8 cỡ, ?9 số chỗ, ?10 ngày chạy, ?11 lúc, ?12 người)
INSERT INTO vc_trip_cost_line (id, trip_id, carrier_party_id, kind, amount, rate_id, route_code_snapshot, vehicle_size_code_snapshot, passenger_capacity_snapshot,
  unit_amount_snapshot, occurred_date, cmd_id, created_at, created_by, updated_at, updated_by)
SELECT ?1, ?2, ?4, 'SNAPSHOT', ?5, ?6, ?7, ?8, ?9, ?5, ?10, ?3, ?11, ?12, ?11, ?12
 WHERE EXISTS (SELECT 1 FROM vc_trip WHERE id = ?2 AND last_cmd_id = ?3)
```

  Vì sao phiên bản ở câu cổng: câu `INSERT … SELECT … WHERE <điều kiện>` mà điều kiện sai thì **lặng lẽ chèn 0 dòng** (không ném) — D1 vẫn chạy tiếp lô, để lại "đảo một nửa". Đặt điều kiện "phiên bản chi phí" ở **câu cổng** (biến thể `TRIP_GATE_CHI_PHI` của `TRIP_GATE` `chuyen-repo.ts:280`):

```sql
UPDATE vc_trip SET version = version + 1, last_cmd_id = ?3, updated_at = ?4, updated_by = ?5
 WHERE id = ?1 AND version = ?2 AND status = 'PLANNED'
   AND (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?1) = ?6
```

  (đếm MỌI dòng ở thời điểm cổng — trước khi lô chèn gì). Có dòng chen giữa lúc đọc và lúc ghi ⇒ cổng 0 dòng ⇒ `chayLo` trả 409 `stale` như hôm nay, mọi câu sau không chạy (lính gác dấu lệnh). Câu đảo khi đó chỉ cần lính gác dấu lệnh. **Người kiểm soi** điểm này: khác chữ ADR ("điều kiện ở mọi câu đảo") nhưng mạnh hơn (cả lô thua tại cổng) — ghi vào nhật ký như một ruling của người lập kế hoạch, đổi được.

- [ ] **Bước 1: Test route (đỏ)** — `tien-xe-route.test.ts` (khung thử; `xeNhaXe`, `nhaXeKhung` từ Task 4; gieo giá G1–G4 qua route Kế toán). Ca:
  - **RF1-a** tạo chuyến xe nhà xe 16 chỗ tuyến NT-CR ngày 2027-03-11 (giá hiệu lực) ⇒ đúng một `SNAPSHOT` 1.200.000, `cmd_id` = id sự kiện CREATED; phản hồi **không** chứa `1200000`.
  - **RF1-b** đổi tuyến sang NT-DL ⇒ thêm đúng một `REVERSAL −1.200.000` + một `SNAPSHOT 900.000` cùng `cmd_id` lệnh sửa.
  - **RF1-c** (V7) có `ADJUSTMENT +150.000` (chèn bằng route Task 10, hoặc SQL khung thử) rồi đổi tuyến ⇒ thứ tự dòng: `REVERSAL −150.000`, `REVERSAL −1.200.000`, `SNAPSHOT 900.000`; tổng 900.000.
  - **RF1-d** (V12) nguồn là `AGREED` ⇒ đổi tuyến: `AGREED` bị đảo, chụp giá bảng nếu có; không có ⇒ chi tiết chuyến có lý do giữ `THIEU_GIA`.
  - **RF1-e** đổi sang xe **công ty** ⇒ đảo hết, `rented = 0`, tổng 0, xuất bến được không cần giá.
  - **RF1-f** nhà xe đã thôi vai (đóng vai `CARRIER` sau khi chụp) ⇒ đổi tuyến ⇒ **409 `carrier_inactive`** với câu nguyên văn ADR; **không** dòng chi phí mới; đổi sang xe nhà xe khác có giá ⇒ 200, chụp giá nhà xe mới; đổi sang xe khác **cùng** nhà xe đã thôi ⇒ 409 `carrier_inactive` (máy chủ) — ca CSDL `vc_rented_lower` đã ở Task 7.
  - **RF1-g** (chờ Cần chủ 3) dời giờ bắt đầu sang ngày hôm sau ⇒ đường (B): không dòng mới; `test.todo` cho đường (A) ghi rõ "chờ chủ".
  - **RF2** huỷ chuyến có `SNAPSHOT` + `ADJUSTMENT −200.000` ⇒ lô qua, thứ tự `+200.000`, `−1.200.000`, tổng 0, trạng thái `CANCELLED`. Biến thể chen giữa: gọi `lenhHuy` với `phienBan` đọc trước, chèn một `ADJUSTMENT` bằng SQL trước khi chạy lô (dùng điểm móc thử: hàm `docChiPhi` truyền vào được) ⇒ 409, không dòng đảo nào, chuyến vẫn `PLANNED`.
  - **RF3** chuyến 23:30 → 01:30 giờ VN ngày 31/10 ⇒ ngày chạy 31/10 ⇒ G2 áp; chuyến bắt đầu 00:30 ngày 01/11 ⇒ G4.
  - **RF5** gửi lại cùng `requestId` lệnh tạo / lệnh sửa ⇒ 200 kết quả cũ, vẫn đúng một `SNAPSHOT`.
  - **RF6** chuyến xe nhà xe có sẵn với `rented = 0` (gieo thẳng trên khung thử — mô phỏng chuyến trước T2, Cần chủ 1 (A)) ⇒ sửa **chỉ giờ** ⇒ 200, cờ vẫn 0, không dòng chi phí; đổi tuyến trên chuyến đó ⇒ 200, không chụp (chuyến không thuê).
  - **Thiếu giá** (V6) tạo chuyến xe 29 chỗ không tuyến ⇒ không dòng nào, không dòng 0 đồng; chi tiết chuyến giữ `THIEU_GIA`; `POST …/xuat-ben` (văn phòng và tài xế) ⇒ 409 `chua_du_dieu_kien_xuat_ben` có `THIEU_GIA`; Quản trị gửi kèm phá lệ ⇒ vẫn 409 (không đường phá lệ).
  - **Bán hàng xếp + chọn tuyến** ⇒ 200, phản hồi không mang tiền (`JSON.stringify` không chứa `1200000`).
- [ ] **Bước 2: Đỏ.**
- [ ] **Bước 3: Mã.**
  - `dieu-phoi-than.ts`: `TaoChuyenThan.tuyen: string | null` (vắng = null); `SuaChuyenThan.tuyen: string | null | undefined` (vắng = giữ). Chuỗi phải là mã tuyến đang dùng — kiểm ở lệnh (đọc `ROUTE_LIST`), 400 "Tuyến không có hoặc đã ngưng dùng."
  - Lệnh (tạo / sửa / huỷ) đọc thêm, **sau** `can()` và trước dựng lô: `dongChiPhi(db, tripId)` (`tien-xe-repo.ts`), `giaCuaNhaXe(db, chuXeMoi)`, `coXeDangDung(db)`, `ownerCompany(db)`, `nhaXeDangHopTac(db)`.
  - `keHoachChiPhiKhiDoi`: `canChupLai = laTaoMoi || doiXeHoacNhaXe || doiTuyen` (đường (B) của Cần chủ 3; đường (A) thêm `|| doiNgay`). Không `canChupLai` ⇒ kế hoạch rỗng. Có ⇒ `dao = thuTuDaoTatCa(dong)` (lý do `CPX_DOI_CHUYEN`, ngày = ngày chạy MỚI), rồi nếu `rentedMoi === 1`: chủ xe mới ∉ `nhaXeDangMo` ⇒ `{ ok: false, loi: "carrier_inactive" }`; ngược lại `chonDongGiaThue` → có thì `chup`, không thì `chup = null` (thiếu giá — chuyến sẽ bị giữ). Huỷ: `dao = thuTuDaoTatCa(dong)` lý do `CPX_HUY_CHUYEN`, `chup = null`.
  - `lenhSuaChuyen`: điều kiện "không đổi gì" (`dieu-phoi-lenh.ts:72`) thêm `&& !doiTuyen`; cờ: `rented = doiXe ? phanLoaiThue({ chuXePartyId: xeRow.owner_party_id, congTyChuId, nhaXeDangMo, cuRented: t.rented }) : t.rented` — **chỉ tính lại khi đổi xe** (trigger `vc_trip_rented_alone` chặn đổi riêng cờ; chuyến cũ cờ 0 của nhà xe — Cần chủ 1 (A) — hay chuyến kẽ C2a mà nhà xe mở lại vai, sửa giờ phải vẫn 200).
  - `loTaoChuyen`/`loSuaChuyen`/`loHuy` nhận thêm `chiPhi: KeHoachChiPhi` + `phienBanChiPhi: number` và dùng `TRIP_GATE_CHI_PHI` thay `TRIP_GATE` (tạo chuyến: cổng là `TRIP_INSERT`, không cần phiên bản).
  - `thu-tu-lo.test.ts` `MAU`: thêm vào mẫu `loTaoChuyen`, `loSuaChuyen`, `loHuy` trường `chiPhi` có ĐỦ nhánh (một `dao` âm, một `dao` dương, một `chup`) và `phienBanChiPhi: 2`; bài phải xanh với lính gác hiện có (không sửa luật bài).
- [ ] **Bước 4:** `node --test src/modules/van-chuyen/` + `npm test` + `npm run typecheck` xanh.
- [ ] **Bước 5: e2e** bổ sung `tests/e2e/tien-xe-thue.mjs`: tạo chuyến xe nhà xe (giá có) → xuất bến được; chuyến xe nhà xe không giá → xuất bến 409 có lý do "Chuyến xe thuê chưa có giá"; đổi tuyến → `SELECT kind, amount FROM vc_trip_cost_line` đúng V7 rút gọn. `npm run test:e2e -- tien-xe-thue dieu-phoi tai-xe-cuoc dua-don-dau-cuoi`.
- [ ] **Bước 6:** Commit "Tiền xe thuê T2: chụp giá lúc xếp xe nhà xe, đảo + chụp lại khi đổi xe / nhà xe / tuyến, đảo hết khi huỷ (một lô)".

---

## Task 10: Ô `transport.cost.*` + route chi phí chuyến và bảng kê

**Files:** `src/shared/permissions.ts` (+ bốn hàng ghim + `TEN_THAO_TAC`), `src/modules/van-chuyen/index.ts`, `tien-xe-lenh.ts`, `tien-xe-than.ts`, `tien-xe-dto.ts`, `tien-xe-repo.ts`, `src/shared/contracts.ts`, `tien-xe-route.test.ts`, kiểu `AuditAction` (`trip_cost_snapshot`, `trip_cost_reversed`, `trip_cost_adjusted`, `trip_cost_agreed`).

**Interfaces:**
- Ô (cùng khuôn Task 3): `"transport.cost.view": row("none","any","any","none","none","any","none","none","none","none")`, `"transport.cost.adjust": row(…như trên…)`. Bài ghim `transport.*` (Task 3) tự phủ.
- Route (cổng `office`, `can()` đầu thân, 403 trước 400; tên chốt):
  - `GET /api/van-chuyen/chuyen/:id/chi-phi` — `transport.cost.view`; trả `ChiPhiChuyenDto { tripId, ma, trangThai, thue, nhaXe: {partyId, ten} | null, tuyen, nguonGia: "BANG" | "THOA_THUAN" | null, tong /* tongChiPhiChuyen */, phienBanChiPhi /* count(*) */, dong: { id, loai, soTien, lyDo, ghiChu, ngay, daDao: boolean, daoDoDoiChuyen: boolean, nguoi, luc }[] }`.
  - `POST …/chi-phi/dieu-chinh` — `transport.cost.adjust`; thân `{ requestId, phienBanChiPhi, soTien (≠0, nguyên), lyDo (nhóm CHI_PHI_XE, không phải mã hệ thống), ghiChu, ngay? (mặc định vnToday) }`; chuyến phải có ≥ 1 dòng (TC-11); mọi trạng thái (chuyến kết thúc vẫn ghi được — Q-T6).
  - `POST …/chi-phi/dao` — `transport.cost.adjust`; `{ requestId, phienBanChiPhi, dongId, lyDo, ghiChu }`; đảo nguồn giá chỉ khi `PLANNED` (409 "Giá đã chụp không đảo được sau khi xe chạy — dùng điều chỉnh"); tổng sẽ âm ⇒ 409 `tong_am` (V9).
  - `POST …/chi-phi/chup-lai` — `transport.cost.adjust`; chỉ `PLANNED`, `rented = 1`, chưa có nguồn giá; không có dòng giá khớp ⇒ 409 "Chưa có giá bảng cho chuyến này — nhập giá thoả thuận"; nhà xe thôi vai ⇒ 409 `carrier_inactive`.
  - `POST …/chi-phi/gia-thoa-thuan` — `transport.cost.adjust`; `{ requestId, phienBanChiPhi, soTien (>0), ghiChu (bắt buộc, ≤ 300) }`, lý do = `CPX_GIA_THOA_THUAN`; chỉ `PLANNED`, `rented = 1`, chưa có nguồn giá (có giá bảng ⇒ 409 "Chuyến đã có giá bảng — đảo giá bảng trước nếu muốn dùng giá thoả thuận").
  - `GET /api/van-chuyen/chi-phi?tu=&den=&nha-xe=&trang-thai=` — `transport.cost.view`; **bảng kê** (hình chiếu đọc): mỗi chuyến `rented = 1` hoặc có dòng chi phí trong khoảng ngày chạy: mã, ngày chạy, nhà xe (tên qua `partySummary` / `nhaXeDangHopTac`), biển số, tuyến, trạng thái, nguồn giá, `tong` (qua `tongChiPhiChuyen`), `soDieuChinh`, `soDieuChinhBiDao`; nhóm theo nhà xe với `tongBangKe`. `trang-thai` ∈ `DA_PHAT_SINH` (ENDED, ENDED_INTERRUPTED — "chi phí đã phát sinh", C4) | `CHUA_CHAY` | `DANG_CHAY` | `DA_HUY` | `THIEU_GIA`; khoảng ≤ 92 ngày (TC-14).
- Khoá ghi chồng (TC-8): mỗi route ghi = lô `[INSERT … WHERE (SELECT count(*) FROM vc_trip_cost_line WHERE trip_id = ?) = ?phienBan, audit changes() > 0]`; 0 dòng ⇒ 409 `chi_phi_vua_doi`. Không chạm `vc_trip`.
- **Câu SQL RIÊNG, không dùng lại `COST_SNAPSHOT` / `COST_REVERSE` của Task 9**: hai câu đó gác bằng `vc_trip.last_cmd_id` — route Kế toán không đổi dấu lệnh của chuyến (và không đổi được sau khi chuyến kết thúc: `vc_trip_final_frozen`), dùng lại sẽ lặng lẽ chèn 0 dòng. Bốn câu mới trong `tien-xe-repo.ts`: `COST_ADJUST_KT`, `COST_REVERSE_KT`, `COST_SNAPSHOT_KT`, `COST_AGREED_KT` — chỉ gác bằng điều kiện `count(*)` ở trên, `cmd_id` = một UUID mới mỗi request (= id dòng nhật ký). Câu chụp-lại / thoả thuận thêm điều kiện `AND EXISTS (SELECT 1 FROM vc_trip WHERE id = ?trip AND status = 'PLANNED' AND rented = 1)` (lớp máy chủ; CSDL đã có trigger).

- [ ] **Bước 1: Test (đỏ)** — `tien-xe-route.test.ts`:
  - Quyền: Kế toán **và** Quản trị làm được cả năm route (201/200); Bán hàng, HDV, tài xế, tài xế đối tác, Đối tác, Thực tập ⇒ 403 cả năm.
  - V6b: chuyến thiếu giá, Kế toán nhập thoả thuận 1.350.000 ⇒ hết `THIEU_GIA`, xuất bến được. Nhập khi đã có `SNAPSHOT` ⇒ 409; khi `RUNNING` ⇒ 409.
  - "Chụp lại": Quản trị thêm giá rồi Kế toán chụp lại ⇒ `SNAPSHOT`, xuất bến được (ADR tiêu chí 4).
  - V9: tự đảo `SNAPSHOT` khi còn −200.000 ⇒ 409 `tong_am` câu tiếng Việt, không dòng mới.
  - V10: chuyến `ENDED_INTERRUPTED`, Kế toán điều chỉnh −400.000 ⇒ tổng 800.000; đảo `SNAPSHOT` sau xuất bến ⇒ 409.
  - V8b: chuyến huỷ, ghi "Phí huỷ muộn" 300.000 ⇒ tổng 300.000.
  - Phiên bản cũ: hai Kế toán cùng đọc `phienBanChiPhi = 1`, người thứ nhất điều chỉnh ⇒ 201; người thứ hai ⇒ 409 `chi_phi_vua_doi`.
  - `occurred_date` (tiêu chí 8): `SNAPSHOT`/`AGREED`/đảo tự động = ngày chạy; `ADJUSTMENT` mặc định `vnToday()`, Kế toán chọn được; `date(x) = x`.
  - Nhật ký: mỗi ghi một dòng `audit_log` cùng lô, `detail` có mã chuyến, tên nhà xe, "1.200.000 → 1.350.000", nhãn lý do; không SĐT, không tên khách.
  - Bảng kê: ba chuyến (đã kết thúc 1.200.000; huỷ có phí 300.000; thiếu giá) ⇒ dòng đúng, tổng nhà xe 1.500.000 (lọc `DA_PHAT_SINH` chỉ 1.200.000).
- [ ] **Bước 2: Đỏ. Bước 3: Mã** (theo Interfaces).
- [ ] **Bước 3b (CHỈ khi Đợt 2 — `…-02-tin-bao-chuyen.md` — đã gộp `main` lúc thi công; chưa gộp thì bỏ qua bước này):** bài quét của Đợt 2 ("MỌI route POST/PUT lệnh chuyến của van-chuyen gọi baoThayDoiChuyen" — regex `/api/van-chuyen/(chuyen|cuoc-cua-toi)…`, trong tệp test của Đợt 2 cạnh `src/modules/van-chuyen/index.ts`) sẽ ĐỎ với bốn route `POST /api/van-chuyen/chuyen/:id/chi-phi/{dieu-chinh,dao,chup-lai,gia-thoa-thuan}`. Thêm vào bài đó một **danh sách ngoại lệ CÓ TÊN** (không lọc chung chung):

```ts
// Ngoại lệ có tên (kế hoạch Đợt 4, ADR-0057 C9): route chi phí chuyến — Kế toán / Quản trị ghi TIỀN, không đổi chuyến (xe, tài xế, giờ, khách, trạng thái)
// ⇒ không báo tài xế / Bảng tin. Chụp / đảo giá do đổi chuyến đi trong lô tạo / sửa / huỷ chuyến — các route đó vẫn gọi baoThayDoiChuyen.
const KHONG_BAO = new Set(["/api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh", "/api/van-chuyen/chuyen/:id/chi-phi/dao", "/api/van-chuyen/chuyen/:id/chi-phi/chup-lai", "/api/van-chuyen/chuyen/:id/chi-phi/gia-thoa-thuan"]);
const lenh = routes.filter((m) => !/\/chang\//.test(m[2]!) && !KHONG_BAO.has(m[2]!));
```

  Kèm một khẳng định chống thừa: mỗi đường trong `KHONG_BAO` phải thật sự có trong `routes` (route đổi tên thì đỏ). Ngưỡng `lenh.length >= 27` giữ nguyên. Đây là thêm ngoại lệ vào một bài kiểm (không phải tệp luật) — ghi lý do trên vào thân commit và nhật ký thi công; người kiểm T2 soi rằng không route nào khác lọt vào danh sách. **Bước 4:** `npm test`, typecheck xanh; `permission-enforcement` xanh (hai ô mới được hỏi).
- [ ] **Bước 5:** e2e bổ sung: Kế toán nhập thoả thuận → xuất bến; bảng kê có chuyến. Commit "Tiền xe thuê T2: ô chi phí chuyến (Quản trị = Kế toán) + điều chỉnh, đảo, chụp lại, giá thoả thuận, bảng kê".

---

## Task 11: Hàng rào — bài số lạ, một nguồn tính, kiểm định kỳ `R-VC-COST-*`, sổ hàng rào

**Files:** Create `src/tien-xe-so-la.test.ts`, `src/tien-xe-mot-nguon.test.ts`; Modify `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts`, `docs/SO-HANG-RAO.md`.

- [ ] **Bước 1: Bài số lạ (Review Focus 4)** — `src/tien-xe-so-la.test.ts` (khuôn `src/modules/receipt/bien-nhan.test.ts:13` `LA = "480017"`), trên khung thử: gieo dòng giá `480017` và chuyến xe nhà xe có `SNAPSHOT 480017` + `ADJUSTMENT 480017`… (giá trị khác nhau để tổng không trùng: 480017 và 1480017); một đơn có HDV `FIELD` phụ trách, tài xế `DRIVER` lái chuyến đó. Gọi **mọi** route GET mà `SALES`, `FIELD`, `PARTNER`, `INTERN`, `DRIVER`, `DRIVER_PARTNER` vào được — tối thiểu: `/api/orders`, `/api/orders/:id`, `/api/orders/:id/receipt`, `/api/orders/dashboard`, `/api/dispatch/mine`, `/api/van-chuyen/lich?ngay=`, `/api/van-chuyen/chuyen/:id`, `/api/van-chuyen/xe-cua-don/:orderId`, `/api/van-chuyen/cuoc-cua-toi`, `/api/van-chuyen/cuoc-cua-toi/:id`, `/api/van-chuyen/tuyen`, `/api/bang-tin` — và phản hồi lệnh xếp / sửa / tạo chuyến của Bán hàng ⇒ chuỗi phản hồi không chứa `480017`. Danh sách route lấy tự động: quét `route("GET", …)` của `src/modules/*/index.ts` có cổng mà các mã đó qua, trừ route trả 403 cho mã đó (khuôn hàng rào 2) — để route mới tự vào bài. **P16:** thêm tạm `tong` vào DTO lịch chung (`dungLichNgay`) ⇒ đỏ ⇒ hoàn nguyên.
- [ ] **Bước 2: Một nguồn tính** — `src/tien-xe-mot-nguon.test.ts` (khuôn `src/buildlines-guard.test.ts`, dùng `maskSource`): (1) không chuỗi SQL nào trong `src/**`, `web/**` (trừ test, trừ `migrations/`) chứa `vc_trip_cost_line` cùng `sum(` / `total(`; (2) `tongChiPhiChuyen` chỉ định nghĩa ở `src/modules/van-chuyen/tien-xe.ts`; (3) mọi gán trường `tong:` / `tongChiPhi:` trong `tien-xe-dto.ts`, `tien-xe-lenh.ts` có vế phải bắt đầu bằng `tongChiPhiChuyen(` hoặc `tongBangKe(`; (4) `web/**` không có `amount +` / `soTien +`. **P16:** viết tạm `SELECT sum(amount) FROM vc_trip_cost_line` trong repo ⇒ đỏ ⇒ hoàn nguyên.
- [ ] **Bước 3: Kiểm định kỳ** — `scripts/audit-checks.mjs` (sau `R-VC-RATE-1`), mỗi kiểm một test gieo-vi-phạm ở `src/audit-invariants.test.ts` (dùng `tho()` gỡ trigger):

```js
  { code: "R-VC-COST-1", what: "chuyến xe thuê chưa huỷ có nhiều hơn một nguồn giá còn hiệu lực",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 1 AND t.status <> 'CANCELLED' AND (SELECT count(*) FROM vc_trip_cost_line l WHERE l.trip_id = t.id
          AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id)) > 1`, level: "fail" },
  { code: "R-VC-COST-1b", what: "chuyến xe thuê chưa xuất bến đang thiếu giá (thông tin cho Kế toán)",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 1 AND t.status = 'PLANNED' AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = t.id
          AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))`, level: "warn",
    note: "thông tin: các chuyến này đang bị giữ 'chưa có giá' — Kế toán / Quản trị nhập giá" },
  { code: "R-VC-COST-2", what: "dòng đảo không đối dấu đúng dòng gốc cùng chuyến",
    sql: `SELECT count(*) FROM vc_trip_cost_line r LEFT JOIN vc_trip_cost_line g ON g.id = r.reverses_id
          WHERE r.kind = 'REVERSAL' AND (g.id IS NULL OR g.trip_id <> r.trip_id OR g.amount <> -r.amount OR g.kind = 'REVERSAL')`, level: "fail" },
  { code: "R-VC-COST-3", what: "chuyến không phải xe thuê còn nguồn giá chưa đảo hoặc tổng chi phí khác 0",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 0 AND t.status <> 'CANCELLED' AND (
            EXISTS (SELECT 1 FROM vc_trip_cost_line l WHERE l.trip_id = t.id AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))
            OR (SELECT COALESCE(sum(amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = t.id) <> 0)`, level: "fail" },
  { code: "R-VC-COST-4", what: "chuyến đã huỷ có tổng chi phí khác tổng các dòng phí huỷ ghi sau lúc huỷ",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.status = 'CANCELLED'
          AND (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = t.id)
           <> (SELECT COALESCE(sum(l.amount), 0) FROM vc_trip_cost_line l WHERE l.trip_id = t.id AND l.kind = 'ADJUSTMENT' AND l.reason_code = 'CPX_HUY_MUON'
                AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id)
                AND l.created_at > (SELECT e.created_at FROM vc_trip_event e WHERE e.trip_id = t.id AND e.kind = 'CANCELLED'))`, level: "fail" },
  { code: "R-VC-COST-5", what: "chuyến xe thuê đã xuất bến mà không có nguồn giá còn hiệu lực",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 1 AND t.status IN ('RUNNING','ENDED','ENDED_INTERRUPTED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line l
          WHERE l.trip_id = t.id AND l.kind IN ('SNAPSHOT','AGREED') AND NOT EXISTS (SELECT 1 FROM vc_trip_cost_line r WHERE r.reverses_id = l.id))`, level: "fail" },
  { code: "R-VC-COST-6", what: "chuyến chưa huỷ không đánh dấu xe thuê mà chủ xe không phải công ty chủ hiện tại (kẽ C2a — nợ N-T1)",
    sql: `SELECT count(*) FROM vc_trip t WHERE t.rented = 0 AND t.status <> 'CANCELLED' AND t.carrier_party_id NOT IN (SELECT party_id FROM v_pty_owner_company)`,
    level: "warn", note: "cảnh báo (chấp nhận ồn): có thể là xe của nhà xe đã thôi hợp tác bị xếp như xe công ty, hoặc xe của công ty chủ cũ — Quản trị xem" },
```

  (Câu `sum(` ở đây là kiểm định kỳ ngoài `src/**` — hàng rào một nguồn tính chỉ quét `src/**`, `web/**`; ghi rõ ngoại lệ có tên trong chú thích bài.) `R-VC-COST-4` cần mốc huỷ: đo `vc_trip_event` có loại `CANCELLED` (`dieu-phoi.ts:243`) — đúng.

  **4c (ADR):** bài `R-VC-COST-5`: trong DB thử, **gỡ tạm** `vc_trip_thieu_gia` và `vc_trip_insert_planned`, đưa chuyến `rented = 1` không nguồn giá sang `RUNNING`, chạy câu kiểm ⇒ 1 (thoát 1 ở script); khôi phục trigger trong cùng bài.
- [ ] **Bước 4:** `npm run db:migrate:local && node scripts/audit-invariants.mjs --db local` thoát 0.
- [ ] **Bước 5: `docs/SO-HANG-RAO.md`** — một dòng mỗi hàng rào ADR Hệ quả :287-295: (1) bài số lạ; (2) bài ghim `transport.*` + hàng DRIVER/DRIVER_PARTNER/HR; (3) "mỗi ô được máy chủ hỏi" (không mục hoãn mới — dòng có sẵn, ghi chú thêm); (4) **cổng `THIEU_GIA`** = trigger `vc_trip_thieu_gia` + `kiemXuatBen` (đột biến: bỏ trigger ⇒ `UPDATE status='RUNNING'` tay qua; bỏ dòng `THIEU_GIA` trong `kiemXuatBen` ⇒ bài Task 8 đỏ), trigger một nguồn giá, tổng ≥ 0, chỉ-thêm, vai nhà xe khi đặt giá, cờ `rented` (bốn trigger), chèn chuyến chỉ `PLANNED`; (5) một nguồn tính; (6) bài thân trigger `vc_` xanh; (8) sổ vàng chi phí xe. Mỗi dòng có ngày + phép đột biến đã quan sát.
- [ ] **Bước 6:** Commit "Tiền xe thuê T2: bài số lạ, hàng rào một nguồn tính, kiểm định kỳ chi phí chuyến, sổ hàng rào".

---

## Task 12: Tài liệu, nhật ký phiên bản T2 — rồi NGƯỜI KIỂM T2 (máy chủ)

- [ ] **Bước 1:** `docs/SYSTEM-DESIGN.md` §5 (bảng chi phí, hai cột `vc_trip`), §6 (luồng xếp xe nhà xe → chụp; thiếu giá → giữ), §7 (route, ô); `docs/CHANGE-GUIDE.md`: công thức "lệnh chuyến mới đổi xe / nhà xe → gọi `keHoachChiPhiKhiDoi` trong cùng lô" (cho Đợt 5 A-1b, Đợt 6 Từ chối — ADR-0052 tạm, ADR-0053 tạm) + bẫy "đừng cộng tiền chi phí ngoài `tien-xe.ts`".
- [ ] **Bước 2:** mục nhật ký phiên bản (lời thường, viết sẵn — chỉ gộp cùng giao diện, Cần chủ 2): "Chuyến xe của nhà xe đối tác nay có chi phí: máy tự lấy giá trong bảng giá lúc xếp xe. Chưa có giá thì xe chưa được xuất bến — Kế toán hoặc Quản trị nhập giá bảng hoặc giá thoả thuận. Kế toán có bảng kê chi phí theo nhà xe."
- [ ] **Bước 3:** `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` **đủ bộ**, `node scripts/audit-invariants.mjs --db local`. Ghi số liệu vào nhật ký thi công.
- [ ] **Bước 4: Người kiểm độc lập T2** (`nguoi-kiem-doc-lap`, chỉ đọc) — giao danh sách soi ở mục "Lát" + ba ruling của người lập kế hoạch (TC-8 phiên bản ở câu cổng thay vì từng câu đảo; TC-10 `R-VC-COST-3`; TC-11 điều chỉnh chỉ cho chuyến đã có dòng) + kết quả Task 0 + Cần chủ 1/3 đã chọn. Chỉ báo "đạt" dựa trên báo cáo + test.
- [ ] **Bước 5:** Nhánh T2 **không** gộp `main` cho tới khi G1–G2 xong (Cần chủ 2 = A).

---

## Task 13: Trường `giaBangCoThe` cho gợi ý "Bảng giá vừa có giá …" `[chờ chủ xác nhận câu 4.3 — đang theo khuyến nghị]`

Việc máy chủ nhỏ, làm trên nhánh T2 trước G2. Chủ chọn B ở câu 4.3 thì **bỏ cả task**; G2 vẫn chạy, chỉ thiếu dòng gợi ý có số.

**Files:** `src/shared/contracts.ts` (`ChiPhiChuyenDto`), hàm dựng DTO chi phí chuyến trong `src/modules/van-chuyen/` (đo lại; trên nhánh route gọi `docChiPhiChuyen`), `src/modules/van-chuyen/tien-xe-route.test.ts`, `src/tien-xe-so-la.test.ts`, `src/tien-xe-mot-nguon.test.ts`.

**Interfaces:**
- `ChiPhiChuyenDto.giaBangCoThe: number | null` là số tiền của dòng giá **sẽ** được chụp nếu bấm "Lấy lại giá bảng" ngay lúc đọc. Máy chủ tra bằng `chonDongGiaThue`, với đúng đầu vào lệnh `chup-lai` dùng (nhà xe, tuyến, cỡ theo số chỗ, ngày chạy). Ngoài ca chụp lại được thì luôn `null`.
- `coTheChupLai` đổi nghĩa: điều kiện cũ (`PLANNED`, `thue`, chưa nguồn giá, nhà xe còn hợp tác) **và** `giaBangCoThe !== null`. Nút chỉ hiện khi có giá để lấy; web không tự suy.
- Trường chỉ nằm trong `GET /api/van-chuyen/chuyen/:id/chi-phi` và phản hồi các lệnh ghi chi phí, tức sau cổng `transport.cost.view`. Không đưa vào DTO nào khác.

- [ ] **Bước 1: Test (đỏ)** — `tien-xe-route.test.ts`:
  - chuyến thiếu giá, Quản trị thêm dòng giá khớp 450.000 ⇒ `giaBangCoThe = 450000`, `coTheChupLai = true`;
  - không dòng khớp ⇒ `null`, `coTheChupLai = false`;
  - chuyến `RUNNING`, hoặc đã có `SNAPSHOT` ⇒ `null`;
  - nhà xe đã thôi hợp tác ⇒ `null`.

  `src/tien-xe-so-la.test.ts`: thêm ca dòng giá `480017` khớp một chuyến **chưa** chụp.
  - Gọi `/api/van-chuyen/chuyen/:id` và mọi GET khác **bằng Bán hàng** ⇒ không phản hồi nào chứa `480017`.
  - Kế toán gọi `/chi-phi` ⇒ có `480017`. Đây là ca dương, để bài không xanh giả.
- [ ] **Bước 2: Đỏ đúng lý do.**
- [ ] **Bước 3: Mã.** Dựng `giaBangCoThe` trong hàm đọc chi phí chuyến bằng `chonDongGiaThue`, không thêm câu SQL cộng. Sửa `coTheChupLai` dùng chính giá trị này.
- [ ] **Bước 4: Hàng rào một nguồn tính.** `src/tien-xe-mot-nguon.test.ts` ý 3 thêm luật: gán `giaBangCoThe:` có vế phải là `null` hoặc giá trị lấy từ `chonDongGiaThue(`. P16: gán tạm `giaBangCoThe: 1` ⇒ đỏ ⇒ hoàn nguyên.
- [ ] **Bước 5:** `npm test`, typecheck, e2e `tien-xe-thue` xanh. Commit "Tiền xe thuê: gợi ý giá bảng có thể lấy cho chuyến thiếu giá (chỉ Kế toán, Quản trị)". Người kiểm T2 soi lại bài số lạ.

---

## Giao diện — Bản vẽ đã nhận 2/10 (Task G0–G5)

**Bản vẽ:** `docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html`. Gồm màn 1a Bảng giá, 1b Chi phí chuyến, 1c Bảng kê; mỗi màn có bản 1040px và 390px. Dự án Claude Design `f0f47482-c51a-4232-b5c0-d924871ce294`.

Phần **bề mặt** (chữ, thứ tự, nút, chip, bố cục) làm đúng bản vẽ 100%. Phần chạm dữ liệu, quyền, tiền làm theo câu 4.x ở mục "Cần chủ".

**Luật chung cho mọi task G:**
- Làm trên nhánh T2 (`worktree-agent-a76ababaa4a5b3183` hoặc nhánh nối tiếp).
- **Bước 0 mỗi task: đo lại số dòng** trên nhánh đó. Số dòng dưới đây đo ở `origin/main` ngày 2/10, còn nhánh đã gộp Đợt 2 nên có thể lệch.
- Web **không cộng, không đếm, không so ngày** để ra số hoặc trạng thái. Màn chỉ hiện các trường máy chủ trả: `tong`, `tongNhom`, `tongCong`, `tongDieuChinh`, `soTien`, `soChuyen`, `soNhaXe`, `soThieuGia`, `trangThai`, `nhomTrangThai`, `daoDuoc`, `coThe…`.
  - Tiền định dạng bằng `vnd()` (`web/format.ts:10`).
  - Dấu "+ " / "− " đặt theo dấu của `soTien`. Đó là định dạng, không phải tính.
  - Ô nhập tiền chỉ đọc số người gõ để gửi lên.
- Dựng bằng `h()`, không `innerHTML`; CSS chỉ dùng token; ô gõ 16px (`--fs-step-5`), cao `--tap-min`; ẩn/hiện bằng `can()`.
- Mọi lệnh ghi gửi `requestId` (UUID mới mỗi lần mở form). Route chi phí gửi thêm `phienBanChiPhi`.
- Form ở điện thoại dùng tấm đáy `moBangTruot` (`web/bang-truot.ts:19`); ở máy tính dùng thẻ nội tuyến như bản vẽ.
- Ánh xạ màu bản vẽ → token theo bảng §5 của đánh giá bản vẽ:
  - số tiền `--c-accent-strong`;
  - chip `.vc-chip-ok/-warn/-danger/-muted`;
  - dải `.banner.banner-warning` / `.banner-danger`;
  - `#334155` → `--c-text`; `#E6EDF3` → `.vc-chip-muted`.
- **Hai chỗ màu đậm của bản vẽ:** tab viên thuốc đang chọn (nền `--c-primary`, chữ trắng) và khối "TỔNG CỘNG" (nền `--c-primary`, số `--c-sand`). App đã chuyển sang hướng sáng: nút chính và mục chọn dùng nền nhạt (nhóm "MÀU THEO VAI", `public/app.css:314`).
  - **Chốt bề mặt:** làm **đúng bản vẽ** bằng **token vai mới** trong nhóm đó; luật CSS không trỏ thẳng `--c-primary`. Năm token: `--c-pill-on-bg: var(--c-primary)`, `--c-pill-on-text: var(--c-on-dark)`, `--c-total-bg: var(--c-primary)`, `--c-on-total: var(--c-on-dark)`, `--c-total-num: var(--c-sand)`.
  - Thêm cặp tương phản vào `src/token-giao-dien.test.ts`.
  - Muốn theo hướng sáng thì chỉ đổi giá trị năm token về `--c-selected-*` / `--c-band-*` + `--c-accent-strong`, không sửa luật CSS. Đảo ngược được; ghi ở Tự rà.
- Bề rộng cột bảng (140/130/120/110/150/96px) chưa có token: thêm `--w-bg-*` (bảng giá) và `--w-bk-*` (bảng kê) vào nhóm "Riêng của Tour Đảo Booking" của `public/app.css`.
- Kịch bản Chrome:
  - mỗi task một kịch bản, chạy ở 390 và 1040, ảnh vào `docs/evidence/2026-10-0X-tien-xe-thue/`;
  - tài khoản Kế toán, Quản trị, Bán hàng; các trang dùng chung kho cookie, nên trang của tài khoản nào phải mở **sau cùng**;
  - thêm dòng vào bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" của `web/CLAUDE.md`.

### Task G0: Menu + khai trang (làm trước G1, G4)

**Files:** `web/shell.ts`, `web/account.ts`, `src/shared/sw-policy.ts`, `package.json`, `public/bang-gia-xe.html` và `public/bang-ke-xe.html` (mới, khuôn `public/loai-giay-to-xe.html`), `src/shared/sw-policy.test.ts`.

- [ ] **Bước 1: Test (đỏ).** `src/shared/sw-policy.test.ts` đối chiếu `PAGES` với script `build:web`. Thêm `/bang-gia-xe`, `/bang-ke-xe` vào danh sách mong đợi ⇒ đỏ.
- [ ] **Bước 2: Khai trang.**
  - Thêm hai trang vào `PAGES` (`src/shared/sw-policy.ts:16`) và danh sách trang (`:25`); thêm `/js/bang-gia-xe.js`, `/js/bang-ke-xe.js` vào danh sách js (`:30`).
  - Thêm `web/bang-gia-xe.ts web/bang-ke-xe.ts` vào `build:web` (`package.json:11`).
  - `data-title`: "Bảng giá thuê xe" / "Bảng kê chi phí xe thuê". Thanh trên theo khuôn app (`web/shell.ts:362`), không dựng lại "Quản trị › …" của bản vẽ.
- [ ] **Bước 3: Thanh bên (máy tính).** Bản vẽ có nhóm "Quản trị" gồm "Chuyến xe, Bảng giá thuê xe, Bảng kê chi phí xe". Trong app, "Chuyến xe" chính là mục con **"Điều phối xe"** đã có ⇒ **không vẽ menu mới**.
  - Thêm hai cờ `bangGia = can(staff, "transport.rate.view")`, `bangKe = can(staff, "transport.cost.view")` cạnh các cờ ở `web/shell.ts:506`. Truyền qua `addNav` (`:428`) → `sidebar` (`:330`) → `navGroups` (`:220`), theo đúng khuôn cờ vị trí `dieuPhoi`.
  - Mục cha "Vận chuyển": `if (vehicle || dieuPhoi)` (`:245`) → `if (vehicle || dieuPhoi || bangGia || bangKe)`. Thêm hai đường vào `active()` của mục cha (`:248`).
  - Ngay sau "Điều phối xe" (`:250`), theo thứ tự bản vẽ:
    - `{ href: "/bang-gia-xe", label: "Bảng giá thuê xe", kind: "sub" }` khi `bangGia`;
    - `{ href: "/bang-ke-xe", label: "Bảng kê chi phí xe", kind: "sub" }` khi `bangKe`.

    Không biểu tượng, không huy hiệu.
  - Thêm hai đường vào danh sách làm sáng tab "Tôi" (`web/shell.ts:71`): ở điện thoại hai trang mở từ trang Tôi.
- [ ] **Bước 4: Trang Tôi (điện thoại).** `web/account.ts`, nhóm "VẬN CHUYỂN": thêm hai dòng `row-link` ngay sau "Điều phối xe" (`:83`), cùng điều kiện `can()`. Nếu nhóm đang ẩn khi thiếu `trip.view` / `vehicle.manage`, nới điều kiện hiện nhóm như bước 3.
- [ ] **Bước 5: Kịch bản đếm mục.** Đo lại rồi sửa số đếm mục thanh bên ở:
  - `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` (dự kiến Quản trị 17 → 19, trang `/audit` 20 → 22, Kế toán +2);
  - `docs/evidence/2026-10-01-han-che-quan-tri-hcns/kich-ban/quyen-thieu-quan-tri-smoke.mjs`;
  - thứ tự mục ở `docs/evidence/2026-09-28-van-chuyen-1a/kich-ban/xe-smoke.mjs`.

  Kịch bản khẳng định Bán hàng **không** thấy hai mục. `src/giao-dien-hoi-bang-quyen.test.ts` xanh.
- [ ] **Bước 6:** `npm test`, typecheck, `npm run build:web`. Commit "Tiền xe thuê: khai trang và mục menu Bảng giá thuê xe, Bảng kê chi phí xe".

### Task G1: Trang Bảng giá thuê xe `/bang-gia-xe` + tab Tuyến / Cỡ xe (bản vẽ màn 1a)

**Files:** `web/bang-gia-xe.ts` (mới), `public/bang-gia-xe.html`, `public/app.css` (khối `.bg-*` mới), kịch bản `docs/evidence/2026-10-0X-tien-xe-thue/kich-ban/bang-gia-xe-smoke.mjs` (mới). Khuôn trang danh mục: `web/loai-giay-to-xe.ts`.

**Dữ liệu** (đo lại tên trường thân ở `src/modules/van-chuyen/tien-xe-than.ts`):
- `GET /api/van-chuyen/bang-gia?nha-xe=&ngay=` → `BangGiaResponse { ngay, nhaXePartyId, dong: BangGiaDto[], tuyen, coXe, nhaXe: NhaXeBangGiaDto[] }`;
- `POST /api/van-chuyen/bang-gia`, thân `{ requestId, nhaXePartyId, tuyen, coXe, soTien, tuNgay, denNgay, ghiChu, thayDongId }`;
- `POST …/bang-gia/:id/ket-thuc { denNgay }`;
- `POST /tuyen { ten }`, `PUT /tuyen/:code { ten?, dangDung?, thuTu? }`;
- `POST /co-xe { tuSoKhach, denSoKhach }`, `PUT /co-xe/:code { nhan?, dangDung? }`.

- [ ] **Bước 1: Kịch bản Chrome (đỏ, vì trang chưa có).**
  - Kế toán mở `/bang-gia-xe` ⇒ h1 "Bảng giá thuê xe" + phụ đề "Giá thuê mỗi chuyến của từng nhà xe đối tác.".
  - Thêm giá theo tuyến; "Đổi giá" thấy gợi ý ngày; "Kết thúc".
  - Tab Tuyến: thêm "Nha Trang – Đà Lạt". Tab Cỡ xe: thêm 4–7 ⇒ nhãn "4–7 khách".
  - Nhà xe đã thôi hợp tác ⇒ không có "Thêm giá" / "Đổi giá", vẫn "Kết thúc" được.
  - Bán hàng mở thẳng `/bang-gia-xe` ⇒ câu không có quyền, không bảng.
- [ ] **Bước 2: Khung trang.**
  - Đầu trang: h1 + phụ đề + nút accent "Thêm giá" (`--c-accent`). Nút hiện khi `can(staff, "transport.rate.manage")` **và** nhà xe đang chọn có `dangHopTac`; ẩn ở tab Tuyến / Cỡ xe.
  - Thẻ lọc, ô "Nhà xe" ▾: lấy từ `nhaXe[]`. Nhà xe `dangHopTac = false` ghi "<tên> (đã thôi hợp tác)".
  - Thẻ lọc, ô "Giá đang áp ngày": mặc định `ngay` máy chủ trả. Ô này **chỉ gắn nhãn**; máy chủ vẫn trả mọi dòng.
  - Ghi chú nhỏ: "Có cả giá theo tuyến và giá theo cỡ xe thì giá theo tuyến được dùng."
- [ ] **Bước 3: Ba tab viên thuốc** "Giá thuê / Tuyến / Cỡ xe". Tab đang chọn `--c-pill-on-bg` / `--c-pill-on-text`; tab chưa chọn `--c-primary-soft`. Có `role="tablist"` và đi bằng phím mũi tên.
- [ ] **Bước 4: Tab Giá thuê.**
  - **Máy tính:** bảng 6 cột:
    - TUYẾN (ghi chú ở dòng dưới, `--c-text`);
    - CỠ XE;
    - SỐ TIỀN / CHUYẾN (`vnd(soTien)`, `--c-accent-strong`);
    - HIỆU LỰC ("01/07/2026 – đang áp" khi `denNgay = null`);
    - TRẠNG THÁI;
    - nút.
  - **Chip trạng thái** theo `trangThai`: `DANG_AP` "Đang áp" `.vc-chip-ok`; `SAP_AP` "Sắp áp" `.vc-chip-warn`; `DA_KET_THUC` "Đã kết thúc" `.vc-chip-muted`.
  - **Nút "Đổi giá", "Kết thúc"** ẩn khi `DA_KET_THUC` hoặc thiếu `transport.rate.manage`. Riêng "Đổi giá" ẩn với nhà xe đã thôi.
  - Tuyến trống ghi "Mọi tuyến", cỡ trống ghi "Mọi cỡ xe" (chữ mờ `--c-text-muted`).
  - **Điện thoại:** thẻ dọc, nút viên "Đổi giá" và viên đỏ "Kết thúc".
  - **Trống:** "Nhà xe này chưa có giá" + "Thêm giá theo tuyến hoặc theo cỡ xe để chuyến xe thuê tự lấy giá bảng." + nút "Thêm giá".
- [ ] **Bước 5: Form "Thêm giá" / "Đổi giá — <tuyến>".**
  - Ô:
    - Tuyến ▾ (tuyến đang dùng, có "Mọi tuyến");
    - Cỡ xe ▾ (cỡ đang dùng, có "Mọi cỡ xe");
    - Số tiền *, Từ ngày *;
    - Đến ngày (gợi ý "Để trống nếu đang áp"), Ghi chú.

    Nút "Lưu giá mới".
  - "Đổi giá": điền sẵn, **khoá** Tuyến và Cỡ xe (chỉ đọc) vì dòng thay phải cùng khoá; gửi `thayDongId`.
  - Gợi ý dưới ô Từ ngày: "Dòng cũ sẽ kết thúc ngày <Từ ngày − 1>, dòng mới bắt đầu ngày <Từ ngày>…". Đây là định dạng ngày người gõ, không phải luật: máy chủ quyết.
  - Lỗi hiện **nguyên văn** câu máy chủ, gồm "Nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này" và "Nhà xe này đã thôi hợp tác — không thể thêm giá mới".
  - Máy tính: thẻ nội tuyến nền `--c-soft-hover`. Điện thoại: `moBangTruot`.
- [ ] **Bước 6: Hộp "Kết thúc"** (bản vẽ thiếu, theo khuôn form trên). Một ô "Đến ngày", điền sẵn hôm nay; nút "Kết thúc giá"; gọi `…/:id/ket-thuc`.
- [ ] **Bước 7: Tab Tuyến.**
  - Tiêu đề + gợi ý "Thêm, đổi tên hoặc ngưng dùng. Tuyến ngưng dùng vẫn giữ trong giá cũ."
  - Mỗi dòng: tên, chip "Đang dùng" (`.vc-chip-ok`) / "Ngưng dùng" (`.vc-chip-muted`), nút "Đổi tên", nút "Ngưng dùng" / "Dùng lại".
  - Chân: ô **"Tên tuyến mới"** + "Thêm". **Không ô mã**: máy sinh `T001…`, mã không hiện.
- [ ] **Bước 8: Tab Cỡ xe.**
  - Gợi ý "Nhập khoảng số khách, không kể tài xế."
  - Chân: ô "Từ (khách)", "Đến (khách)" + "Thêm". Nhãn do máy chủ sinh ("4–7 khách", "45 khách"). "Đổi tên" đổi `nhan`.
  - "Ngưng dùng" khi `soDongGiaDangAp > 0`: hỏi xác nhận trước, N lấy từ máy chủ. Câu: "Cỡ này còn N dòng giá đang áp. Ngưng dùng thì xe cùng số chỗ sẽ không còn khớp giá theo cỡ — vẫn ngưng?"
- [ ] **Bước 9: Trạng thái bản vẽ thiếu**, theo khuôn `.vc-*` của `web/loai-giay-to-xe.ts`:
  - đang tải;
  - lỗi tải, có nút "Thử lại";
  - 409 `co_xe_chong` / `gia_chong`, 400: hiện câu máy chủ;
  - 403 khi mở thẳng mà không có quyền.
- [ ] **Bước 10:** `npm run build:web`; kịch bản bước 1 xanh ở 390 + 1040; axe 0 lỗi; ảnh vào `docs/evidence/`. Commit "Tiền xe thuê: màn Bảng giá thuê xe (giá, tuyến, cỡ xe) theo bản vẽ 2/10".

### Task G2: Khối "Chi phí chuyến" trong Chi tiết chuyến (bản vẽ màn 1b)

**Files:** `web/chuyen.ts`, `public/app.css` (khối `.cp-*` mới), kịch bản mới `docs/evidence/2026-10-0X-tien-xe-thue/kich-ban/chi-phi-chuyen-smoke.mjs`. Chạy lại `docs/evidence/2026-09-29-adr-0049/kich-ban/chuyen-smoke.mjs`.

**Dữ liệu:**
- `GET /api/van-chuyen/chuyen/:id/chi-phi` → `ChiPhiChuyenResponse { chiPhi: ChiPhiChuyenDto }`.
- Bốn lệnh ghi trả lại chi phí chuyến mới (`phanHoiChiPhi`, đo lại kiểu trả). Màn vẽ lại từ phản hồi, không tự cộng.
- Thân `dieu-chinh`: `{ requestId, phienBanChiPhi, soTien, lyDo, ghiChu, ngay }`.
- Thân `dao`: `{ requestId, phienBanChiPhi, dongId, lyDo, ghiChu, ngay }`.
- Thân `chup-lai`: `{ requestId, phienBanChiPhi }`.
- Thân `gia-thoa-thuan`: `{ requestId, phienBanChiPhi, soTien, ghiChu }`.

- [ ] **Bước 1: Kịch bản Chrome (đỏ).**
  - Kế toán, chuyến xe thuê thiếu giá (V6): thấy dải cảnh báo → "Nhập giá thoả thuận" 1.350.000 → khối hiện nguồn "Giá thoả thuận", tổng 1.350.000 → thẻ "Điều kiện xuất bến" hết lý do giữ → xuất bến được (V6 → V6b).
  - Điều chỉnh −700.000 trên tổng 600.000 ⇒ form hiện "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước".
  - "Đảo dòng" một điều chỉnh ⇒ dòng mờ, có chip "đã đảo".
  - Chuyến đã huỷ có phí huỷ ⇒ 5 dòng như trạng thái 3 của bản vẽ.
  - Hai tab cùng phiên bản, tab 2 ghi ⇒ dải đỏ 409.
  - **Bán hàng** mở cùng chuyến:
    - **không** có khối, **không** có dải;
    - **không** có yêu cầu mạng tới `/chi-phi` (đọc nhật ký mạng);
    - vẫn thấy lý do giữ "Chuyến xe thuê chưa có giá" trong thẻ "Điều kiện xuất bến", không số tiền.
- [ ] **Bước 2: Chỗ đặt.**
  - Khối là `section.vc-card` đặt **cuối** cột chính `dp-ct-main`, sau `theKhach()` (`web/chuyen.ts:206`). Điện thoại: cuối trang.
  - Đầu trang, thẻ 4 ô và các khối hiện có **giữ nguyên**. Khung gạch đứt trong bản vẽ chỉ là chỗ giữ.
  - Chỉ dựng khối **và** chỉ gọi `GET …/chi-phi` khi `can(staff, "transport.cost.view")`.
  - Gọi song song với `nap()` (`:39`). Lỗi tải chi phí không làm hỏng trang chuyến.
- [ ] **Bước 3: Khi nào hiện khối.**
  - Ẩn hẳn khi `!thue && dong.length === 0` (xe công ty thuần; bản vẽ thiếu trạng thái này).
  - `!thue && dong.length > 0` (V13: đổi sang xe công ty, mọi dòng đã đảo): hiện dòng, không nút giá; **có** "Điều chỉnh" (ADR-0095 Q5 — chỉ Phí huỷ muộn cho nhà xe cũ, máy chủ chặn lý do khác).
- [ ] **Bước 4: Dải cảnh báo** `[chờ chủ xác nhận câu 4.4 — đang theo khuyến nghị]`.
  - Hiện khi `thue && trangThai === "PLANNED" && nguonGia === null`, chỉ với người có `transport.cost.view`.
  - Dùng `.banner.banner-warning`. `.banner-title`: "Chuyến xe thuê chưa có giá — chưa được xuất bến". Lời: "Nhập giá thoả thuận với nhà xe, hoặc bổ sung giá vào Bảng giá thuê xe rồi lấy lại giá bảng."
  - Nút "Nhập giá thoả thuận" trong `.banner-actions` khi `coTheNhapThoaThuan && can(staff, "transport.cost.adjust")`.
  - Không đổi thẻ "Điều kiện xuất bến" có sẵn.
- [ ] **Bước 5: Đầu khối + tóm tắt.**
  - Tiêu đề "Chi phí chuyến" + chip "Chỉ Kế toán · Quản trị" (`--c-primary-soft`).
  - Lưới 4 ô:
    - NHÀ XE: `nhaXe.ten`;
    - TUYẾN: `tuyen.ten`, hoặc "Chưa chọn tuyến";
    - NGUỒN GIÁ: chip `BANG` "Giá bảng" `.vc-chip-ok`; `THOA_THUAN` "Giá thoả thuận" `.vc-chip-ok`; `null` "Chưa có giá" `.vc-chip-warn`;
    - TỔNG CHI PHÍ: `vnd(tong)`, cỡ `--fs-stat-*`, màu `--c-accent-strong`; ghi "—" khi `nguonGia === null && tong === 0`.
- [ ] **Bước 6: Danh sách dòng** (giữ thứ tự máy chủ trả).
  - **Chip loại:**
    - `SNAPSHOT` "Giá bảng" `.vc-chip-ok`;
    - `AGREED` "Giá thoả thuận" `.vc-chip-ok`;
    - `ADJUSTMENT` "Điều chỉnh" (`--c-primary-soft`); riêng `lyDo.ma === "CPX_HUY_MUON"` là "Điều chỉnh · phí huỷ" `.vc-chip-danger`;
    - `REVERSAL` "Đảo" `.vc-chip-muted`.
  - **Chip phụ:** "đã đảo" khi `daDao`; "đảo do đổi chuyến" `.vc-chip-warn` khi `daoDoDoiChuyen`.
  - **Số:** "+ 450.000 ₫" / "− 400.000 ₫"; số âm `--c-danger`.
  - Dòng `daDao`: mờ (token mới `--o-dong-dao: .55` ở nhóm "Riêng") và gạch ngang.
  - **Dưới số:** `lyDo.nhan`, `ghiChu`, "<người> · <lúc>". Người = "Hệ thống" khi `tuDong`, không thì `nguoi`.
  - **Nút liên kết "Đảo dòng":** khi `daoDuoc && can(staff, "transport.cost.adjust")`. Web không tự suy luật đảo.
  - **Trống:** "Chưa có dòng chi phí nào."
- [ ] **Bước 7: Hàng nút cuối khối**, chỉ khi `can(staff, "transport.cost.adjust")`:
  - "Nhập giá thoả thuận" (nút chính) khi `coTheNhapThoaThuan`.
  - "Lấy lại giá bảng" khi `coTheChupLai` `[chờ chủ xác nhận câu 4.3 — đang theo khuyến nghị]`. Kèm gợi ý "Bảng giá vừa có giá <vnd(giaBangCoThe)> cho tuyến này — bấm 'Lấy lại giá bảng' để dùng." Chủ chọn B (không làm Task 13) thì có nút, không có dòng gợi ý.
  - "Điều chỉnh" khi chuyến có dòng chi phí (`dong.length > 0`), kể cả `!thue` — ADR-0095 Q5 thay khuyến nghị 4.7 cũ. Gợi ý: "Điều chỉnh cộng hoặc trừ vào tổng; ghi sai thì 'Đảo dòng'." Chuyến đã huỷ thêm: "Chuyến đã huỷ vẫn ghi được phí huỷ."
- [ ] **Bước 8: Ba form + một hộp.** Máy tính: thẻ nội tuyến nền `--c-soft-hover`. Điện thoại: `moBangTruot` (bản vẽ không vẽ form 390px).
  - **"Nhập giá thoả thuận":** Số tiền (₫) *, Ghi chú thoả thuận * (ô nhiều dòng, tối đa 300). Nút "Lưu giá thoả thuận".
  - **"Điều chỉnh chi phí":**
    - Số tiền (+ hoặc −) *;
    - Lý do * ▾: **từ `lyDoChon`**, không viết cứng, không có "Giá thoả thuận trước";
    - Ngày phát sinh *: điền sẵn hôm nay, ghi "(hôm nay)";
    - Ghi chú.

    Nút "Lưu điều chỉnh".
  - **Hộp "Đảo dòng"** (bản vẽ thiếu): Lý do * ▾ (`lyDoChon`), Ghi chú. Nút "Đảo dòng". Lỗi `tong_am` hiện ngay trong hộp.
  - Lỗi ở form hiện **nguyên văn** câu máy chủ (`tong_am`, `carrier_inactive`, 400).
- [ ] **Bước 9: Các trạng thái lỗi và tải.**
  - 409 `chi_phi_vua_doi` ⇒ dải `.banner.banner-danger` "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại." + nút "Tải lại" (đọc lại `/chi-phi`, giữ chỗ cuộn).
  - Đang tải; lỗi tải.
- [ ] **Bước 10:** kịch bản bước 1 xanh ở 390 + 1040; `chuyen-smoke.mjs` vẫn xanh; axe 0 lỗi. Commit "Tiền xe thuê: khối Chi phí chuyến (giá thoả thuận, lấy lại giá bảng, điều chỉnh, đảo dòng) theo bản vẽ 2/10".

### Task G3: Ô chọn tuyến ở Tạo / sửa chuyến (không có trong bản vẽ — theo khuôn ô chọn xe)

**Files:**
- `web/chuyen-sua.ts`;
- `src/shared/contracts.ts` (`ChuyenChiTietResponse`, `:1288` ở main);
- hàm dựng chi tiết chuyến trong `src/modules/van-chuyen/` (đo lại; trên nhánh `chuyen-repo.ts` đã đọc `route_code`);
- test route chi tiết chuyến;
- `docs/evidence/2026-09-29-adr-0049/kich-ban/chuyen-sua-smoke.mjs`.

- [ ] **Bước 1: Trường máy chủ nhỏ (đỏ trước).** Trên nhánh, `ChuyenChiTietResponse["chuyen"]` **chưa có** tuyến, nên form sửa không điền sẵn được.
  - Thêm `tuyen: { ma: string; ten: string } | null`. Chỉ có **tên** tuyến, không có tiền.
  - Test: chuyến có tuyến trả đúng `{ma, ten}`; chuyến không tuyến ⇒ `null`.
  - Bài số lạ (Task 11) vẫn xanh.
- [ ] **Bước 2: Ô chọn.**
  - Đặt sau ô chọn xe (`cx-xe`, `web/chuyen-sua.ts:95`), cùng khuôn `select.vc-input` + gợi ý + lỗi. Nhãn "Tuyến"; lựa chọn đầu "Chưa chọn tuyến".
  - Danh sách lấy từ `GET /api/van-chuyen/tuyen`: chỉ dòng `dangDung`, xếp theo `thuTu`.
  - Route này cho người có `trip.dispatch`, tức đúng người dùng trang này. Lỗi tải danh mục thì ẩn ô, không chặn form.
- [ ] **Bước 3: Gửi.**
  - Tạo: gửi `tuyen: <mã> | null`.
  - Sửa: gửi `tuyen` **chỉ khi đổi**, như `xeId` ở `web/chuyen-sua.ts:189`. Tuyến cũ đã ngừng dùng vẫn hiện là lựa chọn đang chọn (lấy từ `chuyen.tuyen`), không bị xoá lặng lẽ.
  - Lỗi 400 "Tuyến không có hoặc đã ngừng dùng." và 409 `carrier_inactive` hiện nguyên văn.
  - Đổi tuyến trên chuyến xe thuê làm máy chủ đảo + chụp lại giá; màn **không** báo số tiền nào.
- [ ] **Bước 4:** `chuyen-sua-smoke.mjs` thêm các bước: chọn tuyến → tạo chuyến → mở sửa, thấy tuyến đã chọn. Xanh ở 390 + 1040. Commit "Tiền xe thuê: ô chọn tuyến ở tạo / sửa chuyến".

### Task G4: Trang Bảng kê chi phí xe thuê `/bang-ke-xe` (bản vẽ màn 1c)

**Files:** `web/bang-ke-xe.ts` (mới), `public/bang-ke-xe.html`, `public/app.css` (khối `.bk-*`), kịch bản mới `docs/evidence/2026-10-0X-tien-xe-thue/kich-ban/bang-ke-xe-smoke.mjs`. Khuôn trống / lỗi: `web/dieu-phoi.ts`.

**Dữ liệu:** `GET /api/van-chuyen/chi-phi?tu=&den=&nha-xe=&trang-thai=` → `BangKeResponse { tu, den, nhaXePartyId, trangThai, tongCong, soChuyen, soNhaXe, soThieuGia, nhom: BangKeNhomDto[] }`.

- [ ] **Bước 1: Kịch bản Chrome (đỏ).**
  - Kế toán, ba chuyến: đã kết thúc 1.200.000; huỷ có phí 300.000; thiếu giá. Kỳ vọng: nhóm nhà xe có "TỔNG NHÓM 1.500.000 ₫"; dòng thiếu giá nổi bật; "TỔNG CỘNG" = `tongCong`.
  - Lọc "Đã phát sinh" ⇒ 1.200.000.
  - Khoảng > 92 ngày ⇒ câu lỗi máy chủ.
  - Bấm dòng ⇒ mở `/chuyen?id=…`.
  - Bán hàng mở thẳng ⇒ câu không có quyền.
- [ ] **Bước 2: Đầu trang + lọc.**
  - h1 "Bảng kê chi phí xe thuê" + phụ đề "Chuyến nào, nhà xe nào, bao nhiêu — để trả tay cho nhà xe."
  - Thẻ lọc:
    - Từ ngày, Đến ngày: mặc định đầu tháng → hôm nay;
    - Nhà xe ▾;
    - Trạng thái ▾: Đã phát sinh / Chưa chạy / Đang chạy / Đã huỷ / Chưa có giá, ứng với `DA_PHAT_SINH`/`CHUA_CHAY`/`DANG_CHAY`/`DA_HUY`/`THIEU_GIA`.
  - Chú thích: "Lọc theo ngày chạy, tối đa khoảng 3 tháng. Trạng thái: Đã phát sinh (đã chạy xong) · Chưa chạy · Đang chạy · Đã huỷ · Chưa có giá."
  - **Nguồn danh sách "Nhà xe"** (chốt bề mặt, đảo ngược được): `nhom[].nhaXe` của lần tải **không lọc nhà xe** gần nhất, cùng khoảng ngày.
    - Lý do: `BangKeResponse` không có danh sách nhà xe. Gọi `/bang-gia` thì buộc thêm ô `transport.rate.view`; hôm nay cùng vai, nhưng là hai ô khác nhau.
    - Danh sách này đúng nghĩa "nhà xe có chuyến trong khoảng".
    - Lọc nhà xe gửi `nha-xe=`. Đổi khoảng ngày thì tải lại không lọc để dựng lại danh sách.
- [ ] **Bước 3: Dòng tóm tắt** "<soChuyen> chuyến · <soNhaXe> nhà xe · <soThieuGia> chuyến chưa có giá" (bỏ vế cuối khi bằng 0). Số do máy chủ trả. **Không có nút "Tải bảng kê"** `[chờ chủ xác nhận câu 4.1 — đang theo khuyến nghị]`.
- [ ] **Bước 4: Nhóm nhà xe.** Đầu nhóm nền `--c-band-bg`, chữ `--c-on-band`: tên + "<soChuyen> chuyến"; "TỔNG NHÓM" + `vnd(tongNhom)` màu `--c-accent-strong`.
- [ ] **Bước 5: Dòng.**
  - **Máy tính:** lưới 5 cột:
    - MÃ CHUYẾN;
    - NGÀY CHẠY / BIỂN SỐ;
    - TUYẾN / TRẠNG THÁI;
    - NGUỒN GIÁ / ĐIỀU CHỈNH;
    - SỐ TIỀN.
  - **Chip trạng thái** theo `nhomTrangThai`: Đã phát sinh `.vc-chip-ok`; Chưa chạy `.vc-chip-muted`; Đang chạy `.vc-chip-warn`; Đã huỷ `.vc-chip-danger`; Chưa có giá `.vc-chip-warn`.
  - **Phần ĐIỀU CHỈNH** `[chờ chủ xác nhận câu 4.2 — đang theo khuyến nghị]`:
    - hiện `tongDieuChinh` dạng "+ 150.000 ₫" / "− …" (âm `--c-danger`); "—" khi `soDieuChinh === 0`;
    - thêm dòng phụ "<soDieuChinhBiDao> điều chỉnh bị đảo do đổi chuyến" khi > 0.
  - **Dòng `THIEU_GIA`:** nền `--c-sand-soft`; ô số ghi chữ "Chưa có giá" (`--c-sand-text`).
  - Cả dòng là liên kết tới Chi tiết chuyến.
  - **Điện thoại:** thẻ dọc: mã + số tiền cùng hàng; "ngày · biển số · tuyến"; chip; dòng điều chỉnh.
- [ ] **Bước 6: Khối "TỔNG CỘNG"** cuối trang.
  - Nền `--c-total-bg`, chữ `--c-on-total`.
  - Số `vnd(tongCong)`, cỡ `--fs-stat-*`, màu `--c-total-num`.
  - Lời "Chuyến chưa có giá chưa được tính."
  - Web **không** cộng các nhóm.
- [ ] **Bước 7: Trạng thái bản vẽ thiếu:**
  - trống: "Không có chuyến xe thuê nào trong khoảng này.";
  - đang tải; lỗi tải;
  - lỗi khoảng ngày: câu máy chủ;
  - 403.
- [ ] **Bước 8:** kịch bản xanh ở 390 + 1040, axe 0 lỗi. Commit "Tiền xe thuê: màn Bảng kê chi phí xe thuê theo bản vẽ 2/10".

### Task G5: Nền thanh bên toàn app = màu nền trang + viền phải `[chờ chủ xác nhận câu 4.5 — đang theo khuyến nghị]`

Lời chủ khi gửi bản vẽ: "nhớ đổi lại nền cho thanh bên trái … thành màu nền toàn trang".
- Việc bề mặt, áp cho toàn app ở khổ ≥ 641px; không chạm dữ liệu.
- **Tách được:** G5 không phụ thuộc T2. Điều phối muốn thì đưa lên trước bằng bản phát hành riêng.
- Đã kiểm 2/10: production **không có** ghi đè "Nền thanh bên" ở màn Giao diện công ty (ADR-0087), nên giá trị mặc định mới sẽ hiện ngay. Như vậy ý cuối §4.1 của đánh giá bản vẽ đã giải.

**Files:** `public/app.css`, `src/shared/giao-dien.ts`, `src/giao-dien-mac-dinh.test.ts`, `src/token-giao-dien.test.ts`, `src/shared/changelog.ts` (+ `src/shared/app-info.test.ts`).

- [ ] **Bước 1: Test (đỏ).** Ở `src/giao-dien-mac-dinh.test.ts`, đổi mong đợi `"nen-thanh-ben"`: mặc định `"#eaf2f8"`, cha `"nen-trang"`. Chạy ⇒ đỏ.
- [ ] **Bước 2: Mã.**
  - `public/app.css:320`: `--c-sidebar-bg: var(--c-surface-alt);`. Đây đúng màu nền trang `#eaf2f8`. **Không** dùng `#EEF2F6` của bản vẽ vì nó không phải token.
  - `#sidebar` trong khối máy tính (`public/app.css:918`): thêm `border-right: 1px solid var(--c-sidebar-border);` (bản vẽ: `border-right:1px solid #D3E1EC`).
  - `src/shared/giao-dien.ts`:
    - `CHA["nen-thanh-ben"]` (`:53`): `"nen-the"` → `"nen-trang"`;
    - `MAC_DINH["nen-thanh-ben"]` (`:62`): `"#ffffff"` → `"#eaf2f8"`;
    - khoá `"nen-trang"` đã có sẵn (`:18`, `:60`).
  - Giữ nguyên `--c-sidebar-active` (`--c-primary-soft`), dù trên nền mới sẽ nhạt. Bản vẽ cũng nhạt tương tự, và mục đang chọn có chữ màu chính.
- [ ] **Bước 3: Tương phản và chỗ dùng chung.**
  - `src/token-giao-dien.test.ts` phải xanh: tương phản của `--c-sidebar-item`, `--c-sidebar-title`, `--c-sidebar-text-on` (#475569, #0c4a6e) trên #eaf2f8 đạt. Bài chưa phủ cặp nào thì thêm.
  - `.gd-xem-ben` (`public/app.css:2752`, ô xem trước ở màn Giao diện công ty) cũng dùng `--c-sidebar-bg`, nên đổi theo. Đúng ý: xem trước khớp với thật.
- [ ] **Bước 4: Kịch bản Chrome** (ảnh 1040, chụp trước / sau để chủ xem):
  - `docs/evidence/2026-10-02-giao-dien/kich-ban/giao-dien-smoke.mjs`;
  - `docs/evidence/2026-09-22-thiet-ke-lai-giao-dien-dot-c/kich-ban/dot-c-smoke.mjs`;
  - `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs`.
- [ ] **Bước 5:** mục nhật ký phiên bản (lời thường): "Thanh menu bên trái trên máy tính nay cùng màu nền trang, có đường viền mảnh." Ghi chung bản với T2, hoặc riêng nếu tách. Commit "Thanh bên máy tính: nền theo màu nền trang + viền phải (lời chủ 2/10)".

### Người kiểm lát giao diện + phát hành

- [ ] Người kiểm độc lập (`nguoi-kiem-doc-lap`, chỉ đọc) kiểm lát G0–G5 + Task 13. Soi:
  - web không cộng / đếm: grep `web/bang-*.ts`, `web/chuyen.ts` tìm `+` trên trường tiền, `reduce`, `.length` dùng làm số hiển thị;
  - Bán hàng không gọi `/chi-phi`;
  - `can()` có ở mọi nút;
  - ảnh 390 + 1040 khớp bản vẽ.
- [ ] Gộp T2 máy chủ + Task 13 + G0–G5 thành **một** bản phát hành, theo mục "Lúc gộp" bên dưới.
  - Chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai`.
  - Sau đó: `node scripts/kiem-phien-ban.mjs --sau-deploy` ĐẠT; `audit-invariants --db remote` (chủ chạy, theo `npm run trien-khai`).

<details><summary>Lệnh vẽ Claude Design cũ (1/10) — đã dùng, giữ để tra</summary>

**Lệnh vẽ 1 — Bảng giá thuê xe (G1):**

> Vẽ màn "Bảng giá thuê xe" cho app nội bộ Tour Đảo Booking (PWA iPhone + máy tính; theo đúng hệ thống thiết kế hiện có của app: phông Be Vietnam Pro, token màu/khoảng cách của app). Người dùng: Kế toán, Quản trị. Mục đích: lưu giá thuê xe MỖI CHUYẾN của từng nhà xe đối tác, theo tuyến (ví dụ "Nha Trang – sân bay Cam Ranh") và/hoặc theo cỡ xe (ví dụ "10–16 khách"), có ngày bắt đầu, ngày kết thúc (có thể để trống = đang áp). Nội dung màn: (1) ô chọn nhà xe + ô chọn ngày xem ("giá đang áp ngày …"); (2) danh sách dòng giá của nhà xe: tuyến, cỡ xe, số tiền (VNĐ, có dấu chấm ngàn), từ ngày – đến ngày, ghi chú, trạng thái (đang áp / sắp áp / đã kết thúc); (3) nút "Thêm giá" mở form: tuyến (có thể trống), cỡ xe (có thể trống, nhưng phải có ít nhất một trong hai), số tiền, từ ngày, đến ngày (tuỳ chọn), ghi chú; (4) trên mỗi dòng: "Đổi giá" (= kết thúc dòng này hôm trước ngày mới và thêm dòng mới — form điền sẵn) và "Kết thúc"; (5) hai mục phụ "Tuyến" và "Cỡ xe" để thêm / đổi tên / ngưng dùng (cỡ xe nhập khoảng số khách, không kể tài xế). Giải thích nhỏ trên màn: "Có cả giá theo tuyến và giá theo cỡ xe thì giá theo tuyến được dùng." Báo lỗi tiếng Việt khi trùng ngày ("Nhà xe đã có giá cùng tuyến, cùng cỡ trong khoảng ngày này") và khi nhà xe đã thôi hợp tác. Vẽ cả bản điện thoại (390px) và máy tính (1040px), trạng thái trống ("Nhà xe này chưa có giá").

**Lệnh vẽ 2 — Chi phí chuyến + giá thoả thuận (G2):**

> Vẽ thêm khối "Chi phí chuyến" vào trang Chi tiết chuyến xe hiện có của Tour Đảo Booking (giữ nguyên các khối khác). Chỉ Kế toán, Quản trị thấy khối này; Bán hàng không thấy số tiền. Khối gồm: (1) dòng tóm tắt: nhà xe, tuyến, "Nguồn giá: Giá bảng / Giá thoả thuận / Chưa có giá", TỔNG chi phí (VNĐ); (2) danh sách các dòng chi phí theo thời gian: loại (Giá bảng, Giá thoả thuận, Điều chỉnh, Đảo), số tiền có dấu + / −, lý do, ghi chú, người ghi, lúc ghi; dòng đã bị đảo hiện mờ, có nhãn "đã đảo"; dòng bị đảo vì đổi xe / tuyến có nhãn "đảo do đổi chuyến"; (3) các nút: "Nhập giá thoả thuận" (chỉ khi chuyến chưa xuất bến và chưa có giá — form: số tiền, ghi chú thoả thuận bắt buộc), "Lấy lại giá bảng" (khi chưa có giá và bảng giá vừa có), "Điều chỉnh" (số tiền + hoặc −, lý do chọn từ danh sách: phụ thu chờ thêm giờ, phí cầu đường / bến bãi, phí huỷ muộn, nhập sai, khác; ngày phát sinh mặc định hôm nay), "Đảo dòng" trên từng dòng. Khi chuyến bị giữ vì chưa có giá: thẻ cảnh báo màu cảnh báo "Chuyến xe thuê chưa có giá — chưa được xuất bến" kèm nút "Nhập giá thoả thuận". Báo lỗi tiếng Việt: "Tổng chi phí chuyến sẽ âm — đảo điều chỉnh giảm trước", "Chi phí chuyến vừa thay đổi — tải lại rồi thử lại". Vẽ bản 390px và 1040px, ba trạng thái: chưa có giá, có giá bảng + một điều chỉnh, chuyến đã huỷ có phí huỷ.

**Lệnh vẽ 3 — Bảng kê chi phí xe (G4):**

> Vẽ màn "Bảng kê chi phí xe thuê" cho Kế toán (Tour Đảo Booking). Mục đích: biết "chuyến nào, nhà xe nào, bao nhiêu" để trả tay cho nhà xe (chưa nối sổ công nợ). Bộ lọc: từ ngày – đến ngày (ngày chạy, tối đa khoảng 3 tháng), nhà xe, trạng thái (Đã phát sinh = đã chạy xong / Chưa chạy / Đang chạy / Đã huỷ / Chưa có giá). Nội dung: nhóm theo nhà xe, mỗi nhóm có tổng tiền; trong nhóm mỗi chuyến một dòng: mã chuyến, ngày chạy, biển số, tuyến, trạng thái, nguồn giá, số tiền, số điều chỉnh (và "x điều chỉnh bị đảo do đổi chuyến" nếu có); bấm dòng mở Chi tiết chuyến. Tổng cộng cuối trang. Dòng "Chưa có giá" nổi bật. Vẽ 390px (thẻ xếp dọc) và 1040px (bảng).

</details>

---

## Tự rà kế hoạch theo ADR (đối chiếu tiêu chí nghiệm thu ADR :298-316)

| Tiêu chí ADR | Task / bài |
|---|---|
| 1 ba bậc + không giá + ranh ngày | Task 1 |
| 2 chồng giá hai lớp; vai nhà xe; đóng giá nhà xe đã thôi | Task 2, Task 4 |
| 3 chụp cùng lô, không dòng lẻ; đổi tuyến đảo + chụp; giá mới sau chụp không đổi | Task 9 RF1-a/b, RF5; Task 6 V11 (sổ vàng) |
| 4 thiếu giá: không dòng 0, giữ hai lớp, không phá lệ, chụp lại / thoả thuận | Task 7 ca 7, Task 8, Task 9 "Thiếu giá", Task 10 |
| 4b huỷ có nguồn + điều chỉnh; xe công ty chủ cũ; chèn RUNNING; thoả thuận khi đã có giá / sau xuất bến; đổi tuyến khi nguồn AGREED | Task 7 ca 1, 10, 11; Task 9 RF1-d, RF2; Task 10 |
| 4c `R-VC-COST-5` gỡ tạm trigger | Task 11 bước 3 |
| 4d nhà xe thôi vai: đổi cùng nhà xe / xe công ty / nhà xe khác | Task 7 ca 4; Task 9 RF1-e, RF1-f |
| 4e chèn / đảo nguồn khi không PLANNED | Task 7 ca 11 |
| 5, 5b huỷ còn điều chỉnh âm; phí huỷ; đảo SNAPSHOT khi còn âm | Task 7 ca 12; Task 9 RF2; Task 10 V9, V8b |
| 6 xe công ty không dòng | Task 7 ca 13; `R-VC-COST-3` (TC-10) |
| 7 ADMIN = ACCOUNTING; SALES 403; SALES chọn tuyến không thấy số | Task 3, Task 4, Task 9, Task 10 |
| 8 `occurred_date` / `created_at`; qua nửa đêm | Task 9 RF3; Task 10 |
| 9 bài số lạ; bộ kiểm đủ | Task 11; Task 12 |
| 10 (T3) | **đã có** (`0045`) — ngoài phạm vi |
| 11 `carrier_inactive`; đảo điều chỉnh âm → dòng dương | Task 9 RF1-f; Task 7 ca 12 |

## Điều chưa chắc (ghi cho người thi công / người kiểm)

- **Câu 4.1–4.8** chưa có trả lời. Task 13, G2 bước 3/4/7, G4 bước 3/5, G5 đang theo khuyến nghị (xem mục "Cần chủ"). Câu 4.6 (sổ vàng) chặn phát hành.
- **TC-8** đặt điều kiện "phiên bản chi phí" ở câu cổng (`count(*)` mọi dòng), thay vì ở từng câu đảo như chữ ADR C4.
  - Lý do: câu `INSERT … SELECT … WHERE` thiếu điều kiện thì lặng lẽ chèn 0 dòng giữa lô (không huỷ lô), để lại "đảo một nửa".
  - Người kiểm T2 đã soi (ĐẠT). Giữ ghi chú cho người kiểm lát giao diện.
- **TC-10** định nghĩa `R-VC-COST-3` khác chữ ADR ("không có dòng"), vì chuyến đổi sang xe công ty giữ các dòng đã đảo.
- **Kẽ C2a / nợ N-T1:** xe nhà xe đã thôi hợp tác được xếp chuyến MỚI sẽ có `rented = 0`. Giữ nguyên như ADR, chỉ có lưới `R-VC-COST-6`. Hạn: lượt duyệt kế tiếp của tiền xe thuê.
- **Ca mẫu điều phối B23** (`golden/dieu-phoi/xe-a-b-luot-1.json`): đầu vào luật thuần nay cần `coNguonGia`. Nhánh đã làm ở Task 8 (đo lại khi gộp).
- **Màu đậm của bản vẽ** (tab đang chọn, khối TỔNG CỘNG) đang làm đúng bản vẽ bằng 5 token vai mới. Nếu chủ thấy lệch hướng sáng của app, chỉ đổi giá trị 5 token (xem "Luật chung" của mục Giao diện).
- Số dòng mã trong mục Giao diện đo ở `origin/main` 2/10; nhánh T2 đã gộp Đợt 2 nên có thể lệch. Mỗi task G đo lại ở bước 0.

---

## Lúc gộp (T2 máy chủ + Task 13 + G0–G5 vào `main`) — làm ngay trước khi đưa chủ lệnh `day-len`

- [ ] **1. Khoá kỳ ADR-0080 (điều 3).** Chạy `git log main --oneline -S ky_period_close -- migrations`.
  - Rỗng: ghi "T2 không cần trigger khoá kỳ" vào nhật ký thi công, đi tiếp.
  - **Có kết quả: DỪNG.** Migration chi phí phải kèm trigger `vc_trip_cost_line_period_closed` đọc `v_ky_closed_period`, theo khuôn Task 7 bước 3b, và mở rộng `R-KY-1`. Việc này nới `VIEW_CHO_TRIGGER_VC` (`src/architecture.test.ts`), nên **chủ duyệt** trước.
- [ ] **2. Số phiên bản.**
  - Nhánh đang ghi 1.70 (trên 1.69 của Đợt 2); `main` lúc viết là 1.68.
  - Lấy số lớn nhất của `src/shared/changelog.ts` trên `main` **lúc gộp** + 1.
  - **Một** mục nhật ký phiên bản cho cả T2 + Task 13 + G0–G4. Lời thường, viết sẵn ở Task 12 bước 2, thêm câu về hai màn mới. G5 ghi chung, hoặc riêng nếu đã tách lên trước.
  - Sửa `src/shared/app-info.test.ts` theo số mới. Nếu Đợt 2 đã lên `main` trước thì mục 1.69 của nhánh trùng nội dung: lấy bản của `main`.
- [ ] **3. Số migration (L2).** Nhánh dùng `0072`, `0073`. Đo lại số lớn nhất trên `main` và mọi nhánh chưa gộp (`git branch --no-merged main`, mỗi nhánh `git ls-tree --name-only <nhánh> migrations/`). Trùng thì đổi tên tệp, sửa mọi chỗ trích, chạy lại `npm test` + e2e đủ bộ. Migration chưa lên remote nên đổi được.
- [ ] **4. Lệnh đếm Task 0** (lộ trình mẹ: dữ liệu có thể đổi từ 1/10). Đưa chủ chạy lại đúng lệnh chỉ-đọc ở Task 0 bước 1. Có chuyến xe nhà xe `PLANNED` thì dừng, hỏi chủ trước khi triển khai (Cần chủ 1 cũ, phương án A/B).
- [ ] **5. Sổ vàng (câu 4.6).** `golden/van-chuyen-chi-phi.json` phải có ca đã xác nhận (tên + ngày của Kế toán / chủ). Bài lớp 2 hết `todo`. Chưa có thì **không** phát hành.
- [ ] **6. ADR-0057** có dòng trạng thái trỏ lời chủ 2/10 về dời ngày (câu 4.8). Chủ / điều phối ghi; người thi công nhắc.
- [ ] **7.** `npm test`, typecheck, `npm run test:e2e` **đủ bộ**, `node scripts/audit-invariants.mjs --db local`, mọi kịch bản Chrome của G0–G5 xanh trên nhánh đã gộp `main` mới nhất. Rồi đưa chủ **một lần**: `npm run day-len -- <nhánh>` kèm dòng "chạy `npm run trien-khai`" (đổi app + migration).

---

## Tự rà sau cập nhật 2/10 (đối chiếu §4 của đánh giá bản vẽ Đợt 4)

| §4 | Nội dung | Đã áp ở đâu / vì sao không |
|---|---|---|
| 1 | Nền thanh bên toàn app + viền phải + `CHA`/`MAC_DINH`, kiểm ghi đè production | **Task G5.** Ghi đè production: đã kiểm 2/10, không có |
| 2 | Hai mục con dưới "Vận chuyển" sau "Điều phối xe"; `account.ts`; tab "Tôi"; sửa đếm kịch bản | **Task G0** bước 3–5 |
| 3 | Khai `PAGES` + js + `build:web`; `data-title` | **Task G0** bước 1–2 |
| 4 | `nhaXe` gồm nhà xe đã thôi còn giá, `dangHopTac` | **Máy chủ đã làm** (`NhaXeBangGiaDto`). Màn: G1 bước 2, 4 |
| 5 | `BangGiaDto.trangThai`; `ngay` chỉ gắn nhãn | **Máy chủ đã làm.** Màn: G1 bước 2, 4 |
| 6 | Máy sinh mã tuyến / cỡ, nhãn mặc định | **Máy chủ đã làm** (`T001`/`S001`). Màn: G1 bước 7–8 |
| 7 | `daoDuoc`, `tuDong`, `lyDo{ma,nhan}`, `coTheNhapThoaThuan`/`coTheChupLai`; `giaBangCoThe` nếu câu 4.3 = A | **Máy chủ đã làm** (thêm `lyDoChon`). `giaBangCoThe` → **Task 13** (chờ 4.3). Màn: G2 bước 5–8 |
| 8 | `dieu-chinh` trả 409 `tong_am` | **Máy chủ báo đã làm** (`TONG_AM` ở `tien-xe-chi-phi.ts`). G2 bước 1 kiểm lại bằng kịch bản (−700.000 trên 600.000) |
| 9 | Bảng kê `tongCong`, `soChuyen`, `soNhaXe`, `soThieuGia`, `tongNhom`, `nhomTrangThai`; `tongDieuChinh` nếu câu 4.2 = A | **Máy chủ đã làm**, gồm `tongDieuChinh` (theo khuyến nghị 4.2). Màn: G4 bước 3–6. Web không cộng |
| 10 | Nhãn TC-6 | **Máy chủ báo đã làm** (`0073`): "Đảo do đổi chuyến (xe, nhà xe, tuyến hoặc ngày chạy)". Chữ thêm "ngày chạy" theo lời chủ dời ngày. G2 kiểm lại trên màn. TC-6 trong bảng tự chốt đã sửa |
| 11 | Câu lỗi `nha_xe_khong_hop_tac` theo bản vẽ | **Máy chủ đã làm.** G1 bước 5 hiện nguyên văn |
| 12 | G1 khoá Tuyến/Cỡ khi Đổi giá, hộp Kết thúc; G2 hộp Đảo dòng, chỉ dựng khi `can(cost.view)`, cuối `dp-ct-main` | **G1** bước 5–6; **G2** bước 2, 8 |
| 13 | Bài số lạ: route trang mới tự vào; ca `giaBangCoThe` 480017 với Bán hàng | Quét tự động đã có (Task 11). Ca mới ở **Task 13** bước 1 |

**Không theo §5 của đánh giá ở hai chỗ (chốt bề mặt):** tab đang chọn và khối TỔNG CỘNG. §5 đề xuất nền nhạt (`--c-selected-*`, `--c-band-*` + `--c-accent-strong`); kế hoạch làm **đúng màu đậm của bản vẽ** qua 5 token vai mới. Lý do: đề bài "bề mặt đúng bản vẽ 100%" và bài học Đợt D (chủ chê lệch mockup). Đổi lại: chỉ sửa giá trị 5 token.

**Câu chung không thuộc §4 nhưng đã đưa vào kế hoạch:** 4.6 (sổ vàng) và 4.8 (ADR) ở mục "Lúc gộp"; 4.7 ở G2 bước 3, 7.

**Bản vẽ thiếu trạng thái (§2), đã thêm theo khuôn có sẵn:**
- G1 bước 6, 9: hộp Kết thúc; tải, lỗi, 403.
- G1 bước 8: cảnh báo ngưng cỡ.
- G2 bước 3, 8, 9: xe công ty / V13; hộp Đảo; form 390px; tải, lỗi.
- G2 bước 5–6: chip "Giá thoả thuận".
- G3: cả task.
- G4 bước 7: trống, tải, lỗi, 403.
