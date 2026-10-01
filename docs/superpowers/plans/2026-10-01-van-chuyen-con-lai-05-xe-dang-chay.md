# Vận chuyển Đợt 5 — Xe đang chạy: chuyển điểm giữa hai xe, văn phòng thêm điểm / báo huỷ, tài xế bổ sung tên, cứu hộ — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Thi công ADR-0052 D4, D5 (gồm D5.3, D5.3a), D5b, D5c — nới khoá "xe đang chạy" (LC-15) đúng bốn đường có tên, có đề nghị chuyển giữa hai tài xế máy tự xác nhận — thành hai bản phát hành: **A-1** (D4 + D5) và **A-1b** (D5b + D5c, sau Đợt 4 T2).

**Architecture:** Mọi dữ liệu mới thuộc `van-chuyen` (`vc_transfer_request`, `vc_transfer_check`, cột mới trên `vc_trip_allocation`, `vc_trip_stop`, `vc_dispatch_policy`). Luật lõi ở CẢ trigger (migration mới) lẫn máy chủ (luật thuần ở `src/shared/`). Mỗi lệnh là MỘT `db.batch` theo khuôn cổng → nhật ký → sự kiện → ghi → trạng thái cuối; lệnh chạm hai chuyến dùng cổng đôi như `loDoi`. Riêng D5b: dòng `ord_passenger` do câu lệnh chưa chạy của `orders` cấp (gác bằng id nhật ký — khuôn `legInsertGuarded`), `van-chuyen` chạy trong lô của mình.

**Tech Stack:** Cloudflare Worker + D1 (SQLite), TypeScript, `node --test`, e2e `tests/e2e/*.mjs`, giao diện thuần `web/*.ts` (`h()`), kịch bản Chrome.

**Spec:** `docs/adr/ADR-0052-dieu-phoi-luot-2-chuyen-diem-va-xe-dang-chay.md` (accepted 30/9 — đọc TOÀN BỘ, 290 dòng); lộ trình mẹ `docs/superpowers/plans/2026-10-01-van-chuyen-con-lai-00-lo-trinh.md`; trang ghép quyết định `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md`; bổ sung ADR-0053 (cột `DRIVER_PARTNER` của hai ô mới — **Đợt 6**, KHÔNG làm ở đây); ADR-0057 T2 (cổng `THIEU_GIA`, ô `transport.cost.adjust` — Đợt 4).

**Mức chi tiết (lộ trình L3):** mức GIAO DIỆN — bảng, cột, trigger, chữ ký hàm, route, ô quyền, test bắt buộc. Không viết thân hàm. **Mọi `tệp:dòng` dưới đây đo ở HEAD `0ba370d6` (2026-10-01); ADR trích số dòng của nhánh `thi-cong-adr-0049-tiep` (cũ). Người thi công ĐO LẠI lúc nhận (Đợt 1–4 sẽ đổi các tệp này).**

---

## Phạm vi

**Trong:**

| Lát | Quyết định | Nội dung |
|---|---|---|
| A-1 | D4 | Đề nghị chuyển cụm đón (`scope = 'STOP'`) giữa hai tài xế; máy tự xác nhận (`kiemChuyen`); leo thang `ESCALATED`; Quản trị / Toàn quyền duyệt (chỉ luật cấu hình) / bác; hết giờ chờ (đóng lười); tự huỷ khi hết hợp lệ; ô `trip.transfer`; hai cột chính sách |
| A-1 | D5.1, D5.2, D5.3, D5.3a | Văn phòng thêm điểm / khách vào xe đang chạy; báo huỷ điểm (cờ, không đóng suất); LC-15 mới; cập nhật điểm theo đơn trên xe đang chạy (đóng → mở → câu chốt) |
| A-1 | D6 (điểm cắm) | Gọi `ctx.baoThayDoiChuyen` sau lô thành công; thêm dòng sự kiện D4/D5 vào hàm người nhận **của Đợt 2** — KHÔNG dựng lại D6 |
| A-1b | D5b | Tài xế bổ sung tên khách chưa có tên (ô `trip.passenger.add`; `ord_passenger.source = 'DRIVER'` qua hàm công bố mới của `orders`) |
| A-1b | D5c | Cứu hộ: đề nghị `scope = 'ONBOARD'` (tài xế xe hỏng, hoặc văn phòng bấm thay qua `trip.progress`); xe cứu hộ nhà xe phải có giá (cổng `THIEU_GIA` của Đợt 4) |

**Ngoài:** D6 thân (Đợt 2); cột `DRIVER_PARTNER` của `trip.transfer` / `trip.passenger.add` (ADR-0053, Đợt 6 — ở Đợt 5 giữ `none`); tiền xe thuê (Đợt 4); mọi đổi mốc 6 giờ.

## Tự chốt khi lập kế hoạch (ghi lại, không hỏi chủ)

| # | Điều | Chốt | Vì sao |
|---|---|---|---|
| P1 | ADR-0052:116, :282 sửa `0042` tại chỗ hay migration mới | **migration mới** (bỏ và tạo lại trigger) | lộ trình L1; `0042` đã áp remote bản 1.38 — T0 kiểm lại bằng lệnh chỉ đọc |
| P2 | `scope = 'ONBOARD'` ở A-1 | Bảng định trọn tập `STOP`/`ONBOARD` ngay (cửa một chiều, ADR-0052:210), nhưng **route A-1 chỉ nhận `STOP`** (gửi `ONBOARD` → 400) | ADR-0052:135 khuyến nghị cứu hộ thi công sau T2; giữ một đường cứu hộ (lượt 1: Kết thúc gián đoạn) tới A-1b |
| P3 | Ô `trip.passenger.add` | Chỉ thêm vào `MATRIX` ở bản A-1b, cùng route hỏi nó | Global Constraint lộ trình "mỗi ô mới phải được một route máy chủ hỏi trong cùng bản phát hành" |
| P4 | Xác nhận đề nghị làm điểm nguồn `MOVED` | Cùng lô: mọi đề nghị `PENDING`/`ESCALATED` KHÁC có cùng `from_stop_id` → `VOID` | áp MQ-09 ("tự huỷ khi hết hợp lệ") cho trường hợp điểm nguồn đã chuyển đi; **người kiểm soi** (chạm logic — nếu người kiểm thấy đây là luật mới thì dừng, hỏi chủ) |
| P5 | Hai cột chính sách mới có `DEFAULT` (bắt buộc với `ALTER TABLE … ADD COLUMN … NOT NULL`) — lệch khuôn "không DEFAULT" `0041:21-22` | Giữ DEFAULT cho dòng cũ; **siết bù**: bài "câu chèn chính sách ghi ĐỦ mọi cột tường minh" | SQLite không cho thêm cột NOT NULL không DEFAULT |
| P6 | Tên route | Dùng đúng tên ADR-0052:217-220 | ADR "tên đề xuất, kế hoạch chốt" — chốt nguyên |
| P7 | Câu ghi `ord_passenger` của tài xế (D5b) | Gác bằng id nhật ký (khuôn `legInsertGuarded(db, l, auditId)` — `src/modules/orders/chang-hanh-khach-repo.ts:167`), KHÔNG đọc `vc_trip` | `orders` không đọc `van-chuyen` (`src/architecture.test.ts:840`); hệ quả: cần ngoại lệ có tên ở bài thứ tự lô ⇒ mục đề xuất luật (T15) |

## Global Constraints

- Tiếng Việt CÓ DẤU ở mọi chữ người dùng thấy, commit, tài liệu; không lộ mã thô (`PENDING`, `ESCALATED`, `TRANSFERRED`, `ONBOARD`, `THIEU_GIA`…) — nhãn ở `src/shared/dieu-phoi-kieu.ts`.
- Không đụng tiền (ADR-0052:20); riêng D5c đọc cổng `THIEU_GIA` của Đợt 4, không tính tiền.
- Dấu thời gian ISO UTC, MỘT mốc giờ mỗi request (`toISOString()` của máy chủ); "trong ngày chạy" = `trongNgayChay` (`src/shared/dieu-phoi-kiem.ts:420`).
- Không xoá cứng; `vc_transfer_request`: chỉ đổi `status` đi tiến + cột quyết định đặt MỘT lần; `vc_transfer_check`: chỉ-thêm.
- Migration chỉ thêm tệp mới; số = lớn nhất ở `main` **và mọi nhánh chưa gộp** + 1 (lộ trình L2); bảng/cột mới → `docs/data-dictionary.json` + `npm run dict`.
- `van-chuyen` là module nghiêm: SQL qua `defineSql` trong `chuyen-repo.ts`; không module nào import `van-chuyen`; `thongbao` không import `van-chuyen` (hàm tiêm).
- Lệnh chuyến MỘT `db.batch`; mọi hàm `export function lo…` mới phải có mẫu ở `MAU` của `src/modules/van-chuyen/thu-tu-lo.test.ts` (thiếu → đỏ).
- Mọi lệnh mang `request_id`; lệnh lặp → kết quả cũ; chuyến / đề nghị không phải của mình → **404**; tài xế: `can(…, { assigned })` TRƯỚC mọi truy vấn.
- Nhật ký, tin, Bảng tin, phản hồi lệnh: KHÔNG tên, năm sinh, SĐT, số giấy tờ, `place_key`, dãy ≥ 8 chữ số; chỉ mã chuyến, mã đơn, số người, nhãn nơi đã che.
- Thêm ô vào hàng ghim `DRIVER` = NỚI bài ghim ⇒ chỉ qua tệp đề xuất luật, chủ duyệt; tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt duyệt.
- Cổng / trigger mới ⇒ dòng `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật (sửa cố ý → đỏ → hoàn nguyên).
- Màn / hộp mới CHỜ bản vẽ Claude Design của chủ (Phụ lục B); máy chủ không chờ.
- Mỗi lát: `npm test`, `npm run typecheck` 0 lỗi, `npm run test:e2e` đủ bộ, `node scripts/audit-invariants.mjs --db local`, mục `src/shared/changelog.ts` + `src/shared/app-info.test.ts`, người kiểm độc lập chỉ đọc ĐẠT.
- Lệnh cấm AI tự chạy (CLAUDE.md §8) giữ nguyên.

## Review Focus

1. **Văn phòng thêm điểm đúng lúc tài xế bấm Kết thúc** ⇒ một bên thắng (cổng `version`/dấu lệnh), bên kia 409 câu dễ hiểu; không có điểm mới trên chuyến đã kết thúc, không suất mồ côi. Bài: T6.
2. **"Hai xe cùng nhận"** — một đề nghị chỉ có MỘT `to_trip_id`, nên ca thật là: A gửi cùng điểm cho B và cho C (hai đề nghị), B và C bấm Nhận gần như cùng lúc (cả hai thứ tự) ⇒ đúng một `CONFIRMED`, cái kia `VOID` (P4) hoặc 409; điểm A `MOVED` một lần; không suất nửa chuyển. Kèm: Nhận đúng lúc A Rút; Nhận đúng lúc A bấm "Đã tới" điểm đó; văn phòng thêm điểm vào B đúng lúc B Nhận (tự thử lại một lần — ADR-0052:242). Bài: T6.
3. **Đề nghị hết giờ không có cron** ⇒ B Nhận sau `accept_wait_minutes` thấy "đã hết hạn" (dòng thành `EXPIRED` trong lô của chính lệnh đó), không bao giờ xác nhận. Bài: T4, T5.
4. **Cập nhật điểm theo đơn trên xe đang chạy bị cắt giữa chừng** (lô thiếu câu mở, SQL tay) ⇒ `RAISE` ở câu chốt; không bao giờ gỡ được khách khỏi xe đang chạy. Bài: T1, T5, T8.
5. **Tên khách lọt** qua DTO đề nghị chưa `CONFIRMED`, nhật ký `trip_stops_synced` có nơi đón chữ tự do chứa số điện thoại, hoặc phản hồi route ghi tên của tài xế ⇒ không có. Bài: T7, T15.

---

## Bản đồ tệp

| Tệp | Trách nhiệm | Lát |
|---|---|---|
| `migrations/<N>_xe_dang_chay.sql` (mới) | hai bảng, cột mới, trigger LC-14, LC-15 mới, LC-04 dựng lại, câu chốt D5.3a, `ESCALATED → CONFIRMED` | A-1 |
| `src/shared/dieu-phoi-kieu.ts` | mã trạng thái / phạm vi / luật / sự kiện / lý do đóng, nhãn tiếng Việt | A-1 |
| `src/shared/dieu-phoi-chuyen-diem.ts` (mới) | luật thuần `kiemChuyen`, `hetHanDeNghi`, `quyetDinhSauKiem`, DTO xe khác — một nguồn cho màn hình và máy chủ | A-1 |
| `src/modules/van-chuyen/chuyen-repo.ts` | SQL mới (cổng đôi chạy/chưa chạy, câu đề nghị, câu kiểm, câu báo huỷ, câu chốt) | A-1 |
| `src/modules/van-chuyen/dieu-phoi.ts` | hàm dựng lô mới + MQ-09 trong lô cũ | A-1 |
| `src/modules/van-chuyen/chuyen-diem-lenh.ts` (mới) | lệnh đề nghị (gửi, rút, nhận, không nhận, duyệt, bác) | A-1 |
| `src/modules/van-chuyen/dieu-phoi-lenh.ts` | `lenhThemDiemDangChay`, `lenhBaoHuy`, nhánh RUNNING của `lenhCapNhatDiem` | A-1 |
| `src/modules/van-chuyen/index.ts` | route mới | A-1, A-1b |
| `src/shared/permissions.ts`, `permissions.test.ts` | ô `trip.transfer` (A-1), `trip.passenger.add` (A-1b) | A-1, A-1b |
| `src/modules/orders/chang-hanh-khach-repo.ts`, `orders/index.ts` | câu ghi hành khách do tài xế (chưa chạy) | A-1b |
| `scripts/audit-checks.mjs`, `src/audit-invariants.test.ts` | câu kiểm định kỳ mới; thay R-ORD-11 | A-1, A-1b |
| `web/cuoc-chuyen.ts`, `web/chuyen.ts`, `web/dieu-phoi.ts` | giao diện — CHỜ bản vẽ | A-1, A-1b |

---

# LÁT A-1 (D4 + D5) — không phụ thuộc tiền

### Task 0: Đo nền, chốt số, kiểm điều kiện vào

**Files:** chỉ đọc; ghi kết quả vào `docs/superpowers/plans/<ngày>-van-chuyen-dot-5-nhat-ky.md` (mới).

- [ ] **Step 1:** Số migration: `ls migrations` + `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh/worktree chưa gộp (lộ trình L2). Ghi `N`.
- [ ] **Step 2:** `0042`, `0043` đã áp remote: `npx wrangler d1 migrations list tourdao-sales-db --remote` (lệnh CHỈ ĐỌC). Nếu `0042` CHƯA áp → dừng, báo điều phối (P1 đổi).
- [ ] **Step 3:** Đo lại mọi `tệp:dòng` của kế hoạch này ở HEAD nhận việc; ghi bảng "đo lại" vào nhật ký. Ghi rõ Đợt 1 đã đổi gì ở `index.ts` (route văn phòng `…/chuyen/:id/thu-tu` có ở `index.ts:1387` hôm nay), `0042` trigger LC-15 (Đợt 1 có thể đã thêm migration đổi thứ tự điểm khi xe chạy — đọc nó trước khi dựng lại trigger, KHÔNG làm mất luật của nó).
- [ ] **Step 4:** Đợt 2 đã CHỐT danh sách hành động nhật ký sinh tin chưa (ADR-0052 D6.1 "chốt trước dòng đầu — một chiều")? Có → dùng ĐÚNG tên đó ở T2–T5. Chưa → T2 chốt tên (danh sách ở Task 2), ghi vào nhật ký Đợt 5 VÀ báo người giữ Đợt 2 trước khi ghi dòng đầu.
- [ ] **Step 5:** Kiểm trên `node:sqlite`: `ALTER TABLE vc_trip_allocation ADD COLUMN office_cancel_at TEXT CHECK (…ba cột cùng có/vắng…)` có nhận CHECK nhắc cột khác không. Không nhận → luật "ba cột cùng có / cùng vắng" chuyển sang trigger `BEFORE UPDATE` (ghi vào nhật ký).
- [ ] **Step 6:** Commit nhật ký: `git commit -m "Đợt 5 xe đang chạy: đo nền, chốt số migration"`.

### Task 1: Migration A-1 — bảng, cột, trigger

**Files:**
- Create: `migrations/<N>_xe_dang_chay.sql`
- Modify: `docs/data-dictionary.json` (+ `npm run dict`)
- Test: `src/modules/van-chuyen/xe-dang-chay-csdl.test.ts` (mới; khung `node:sqlite` như `src/modules/van-chuyen/dieu-phoi.test.ts`)

**Interfaces (DDL — tên cột chốt theo ADR-0052 D4.1, D5.2, D5.3a):**

```sql
-- vc_transfer_request (một chiều: CHECK định trọn ngay)
id TEXT PK, from_trip_id, to_trip_id REFERENCES vc_trip(id) CHECK(from_trip_id <> to_trip_id),
scope TEXT NOT NULL CHECK (scope IN ('STOP','ONBOARD')),
from_stop_id REFERENCES vc_trip_stop(id), meet_location_id, meet_place_text,   -- CHECK theo scope (ADR-0052:58)
pax_count INTEGER NOT NULL CHECK (pax_count BETWEEN 1 AND 1000),
proposed_by_party_id NOT NULL, proposed_by_staff_id NOT NULL, proposed_at NOT NULL, request_id UNIQUE,
status TEXT NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','WITHDRAWN','DECLINED','EXPIRED','VOID','CONFIRMED','ESCALATED','REJECTED')),
decided_mode CHECK (IN ('MAY','NGUOI')), decided_by, decided_at, policy_id REFERENCES vc_dispatch_policy(id) NOT NULL,
decline_reason_code, override_reason_code, reject_reason_code REFERENCES vc_reason(code), created_*/updated_*
-- vc_transfer_check (chỉ-thêm, không JSON)
id PK, transfer_id NOT NULL REFERENCES vc_transfer_request(id), cmd_id NOT NULL,
rule_code CHECK IN ('SUC_CHUA_DICH','SUC_CHUA_NGUON','TRUNG_GIO_DICH','KHOANG_NGHI_DICH','MOC_TOI_THIEU','HANG_BANG_DICH','GIAY_TO_DICH','KHONG_CHEO','DIEM_CHUA_TOI'),
ket_qua CHECK IN ('DAT','KHONG_DAT','CANH_BAO'), gia_tri INTEGER, gioi_han INTEGER, policy_row_id, rule_tier CHECK IN ('LOI','CAU_HINH'), created_*
-- cột thêm
vc_trip_allocation: transfer_id, office_cancel_at, office_cancel_by, office_cancel_reason_code, opened_cmd_id, closed_cmd_id
vc_trip_stop: added_while_running INTEGER NOT NULL DEFAULT 0 CHECK IN (0,1)
vc_dispatch_policy: accept_wait_minutes INTEGER NOT NULL DEFAULT 10 CHECK BETWEEN 1 AND 120, auto_confirm_transfer INTEGER NOT NULL DEFAULT 1 CHECK IN (0,1)
```

**Trigger (mỗi cái một tên, câu RAISE có tiền tố mã luật):**

| Tên | Luật | Nguồn |
|---|---|---|
| `vc_transfer_request_no_delete`, `…_identity` (cấm đổi mọi cột trừ `status`, cột quyết định, `updated_*`), `…_status_forward` (đúng đồ thị ADR-0052:61, không `ESCALATED → EXPIRED`), `…_decided_once` | LC-04 | D4.1 |
| `vc_transfer_check_no_delete`, `…_no_update` | chỉ-thêm | D4.1 |
| `vc_transfer_request_lc14` (BEFORE INSERT) | nguồn `RUNNING`; đích `PLANNED`/`RUNNING` cùng `service_date`; `proposed_by_party_id` = tài xế đang mở của nguồn; tài xế đích mở và khác; `STOP` ⇒ điểm nguồn `PENDING` + mọi suất mở của điểm `WAITING` | D4.2 LC-14 |
| `vc_transfer_request_confirm_core` (BEFORE UPDATE OF status) | `ESCALATED → CONFIRMED` đòi `override_reason_code` NOT NULL **và** không dòng `vc_transfer_check` `KHONG_DAT` + `LOI` | D4.2 ĐP4 |
| Bỏ + tạo lại `vc_trip_allocation_identity` (`0042:296-302`) | thêm `transfer_id`, `opened_cmd_id` vào danh sách cột bất biến; `office_cancel_*`, `closed_cmd_id` chỉ đặt một lần | LC-04 |
| `vc_trip_allocation_office_cancel_once` | đặt `office_cancel_*` một lần, chỉ khi `status = 'WAITING'` và suất mở | D5.2 |
| Bỏ + tạo lại `vc_trip_running_locked_alloc_ins` (`0042:529`) | RUNNING: mở suất chỉ khi `added_after_departure = 1` VÀ (sự kiện dấu lệnh hiện hành ∈ {thêm điểm D5.1} HOẶC `transfer_id` trỏ đề nghị đang được xác nhận trong lô HOẶC `opened_cmd_id` = dấu lệnh và cùng lô đã đóng `STOP_CHANGED` cùng chặng/người) | D5.3 |
| Bỏ + tạo lại `vc_trip_running_locked_alloc_close` (`0042:532`) | RUNNING: đóng chỉ với `TRIP_INTERRUPTED` (giữ nguyên), `TRANSFERRED` + `transfer_id`, `STOP_CHANGED` khi suất `WAITING`, điểm `PENDING`, sự kiện dấu lệnh = `ALLOCATION_STOP_CHANGED`, `closed_cmd_id` = dấu lệnh | D5.3 |
| Bỏ + tạo lại `vc_trip_running_locked_stop_ins` (`0042:539`) | RUNNING: thêm điểm chỉ khi `added_while_running = 1` | D5.3 |
| `vc_trip_stop_changed_balance` (AFTER UPDATE OF version ON vc_trip) | câu chốt D5.3a: với dấu lệnh hiện hành, mỗi (chặng, `passenger_key`) đóng `STOP_CHANGED` = mở cùng dấu lệnh, **cùng `trip_id`**; suất chưa tên đếm riêng theo chặng | D5.3a |

- [ ] **Step 1: Viết test đỏ** (`xe-dang-chay-csdl.test.ts`), tối thiểu các ca:
  - `lc14`: nguồn `PLANNED` → RAISE; đích khác ngày → RAISE; người gửi không lái nguồn → RAISE; điểm nguồn `ARRIVED` → RAISE; cùng một tài xế hai chuyến → RAISE.
  - `confirm_core`: `UPDATE … SET status='CONFIRMED'` từ `ESCALATED` có dòng `KHONG_DAT`+`LOI` → RAISE; không lý do → RAISE; chỉ `CAU_HINH` + lý do → được.
  - `status_forward`: `ESCALATED → EXPIRED` → RAISE; `CONFIRMED → VOID` → RAISE.
  - LC-15 mới: chèn suất vào RUNNING không cờ → RAISE; đóng `REMOVED` trên RUNNING → RAISE; đóng `STOP_CHANGED` suất `BOARDED` → RAISE; đóng `STOP_CHANGED` không có sự kiện mang dấu lệnh → RAISE; đổi xe / tài xế RUNNING → RAISE (giữ).
  - Câu chốt: lô đúng đóng → mở → `UPDATE vc_trip SET version = version WHERE id=? AND last_cmd_id=?` → được; lô bỏ câu mở → RAISE; đóng ở chuyến A, mở ở chuyến B cùng dấu → RAISE; đóng suất chưa tên, mở suất có tên → RAISE; **câu cổng của mọi lệnh khác (`version = version + 1`) KHÔNG bị câu chốt bắt nhầm** (chạy lại một lô xếp / tiến độ cũ → được); mở trước đóng cùng người → UNIQUE LC-01 (ghi rõ thông điệp).
  - `office_cancel_once`: đặt lần hai → RAISE; đặt trên suất `BOARDED` → RAISE.
  - Bài `0041`: câu chèn chính sách của máy chủ ghi tường minh MỌI cột của `vc_dispatch_policy` (đọc `PRAGMA table_info`, so với cột trong câu `defineSql`) — siết bù P5.
- [ ] **Step 2:** `node --test src/modules/van-chuyen/xe-dang-chay-csdl.test.ts` → ĐỎ (bảng chưa có).
- [ ] **Step 3:** Viết migration; cập nhật `data-dictionary.json`, `npm run dict`.
- [ ] **Step 4:** Chạy lại → XANH; `npm test` (bài cũ của `0042` vẫn xanh); `npm run db:migrate:local`.
- [ ] **Step 5:** Quan sát chặn thật: bỏ vế `LOI` ở `confirm_core` → bài đỏ → hoàn nguyên; bỏ câu chốt → bài "bỏ câu mở" đỏ → hoàn nguyên. Ghi ngày + kết quả vào nhật ký.
- [ ] **Step 6:** Commit `"Đợt 5: migration đề nghị chuyển, LC-14, LC-15 mới, câu chốt cập nhật điểm"`.

### Task 2: Kiểu + luật thuần chuyển điểm

**Files:**
- Modify: `src/shared/dieu-phoi-kieu.ts` (`LOAI_SU_KIEN_CHUYEN` :34-39 + nhãn :41-63; `LENH_DONG_SUAT` :111-119; thêm tập mới)
- Create: `src/shared/dieu-phoi-chuyen-diem.ts`, `src/shared/dieu-phoi-chuyen-diem.test.ts`
- Modify: `src/shared/audit-actions.ts` (khối `trip_*` :96-123)

**Interfaces:**

```ts
// dieu-phoi-kieu.ts
export const PHAM_VI_DE_NGHI = ["STOP", "ONBOARD"] as const;
export const TRANG_THAI_DE_NGHI = ["PENDING","WITHDRAWN","DECLINED","EXPIRED","VOID","CONFIRMED","ESCALATED","REJECTED"] as const;
export const MA_LUAT_CHUYEN = ["SUC_CHUA_DICH","SUC_CHUA_NGUON","TRUNG_GIO_DICH","KHOANG_NGHI_DICH","MOC_TOI_THIEU","HANG_BANG_DICH","GIAY_TO_DICH","KHONG_CHEO","DIEM_CHUA_TOI"] as const;
export const TANG_LUAT: Readonly<Record<MaLuatChuyen, "LOI" | "CAU_HINH">>; // KHOANG_NGHI_DICH, MOC_TOI_THIEU = CAU_HINH; còn lại LOI
export const NHAN_TRANG_THAI_DE_NGHI: Readonly<Record<TrangThaiDeNghi, string>>;
// LOAI_SU_KIEN_CHUYEN thêm: TRANSFER_PROPOSED, TRANSFER_WITHDRAWN, TRANSFER_DECLINED, TRANSFER_EXPIRED, TRANSFER_VOIDED, TRANSFER_CONFIRMED,
//   TRANSFER_ESCALATED, TRANSFER_REJECTED, STOP_ADDED_RUNNING, ALLOCATION_OFFICE_CANCELLED   (tên chốt ở T0 Step 4 nếu Đợt 2 đã đặt khác)
// LENH_DONG_SUAT thêm: CHUYEN_DIEM: "TRANSFERRED"

// dieu-phoi-chuyen-diem.ts — một nguồn cho màn hình và máy chủ
export interface KiemChuyenVao { nguon: ChuyenVao; dich: ChuyenVao; suatChuyen: SuatVao[]; diemNguon: DiemVao | null; suatMoDich: SuatVao[];
  chuyenKeCuaDich: KhungChuyen | null; chinhSach: ChinhSachVao & { acceptWaitMinutes: number; autoConfirmTransfer: boolean }; hangBang: HangBangVao[]; bayGioMs: number }
export interface DongKiem { luat: MaLuatChuyen; ketQua: "DAT" | "KHONG_DAT" | "CANH_BAO"; giaTri: number | null; gioiHan: number | null; tang: "LOI" | "CAU_HINH" }
export function kiemChuyen(v: KiemChuyenVao): DongKiem[];                       // luôn trả ĐỦ bộ mã (đích RUNNING: MOC_TOI_THIEU = DAT không kiểm)
export function quyetDinhSauKiem(d: readonly DongKiem[], tuXacNhan: boolean): "CONFIRMED" | "ESCALATED";
export function duocDuyetThay(d: readonly DongKiem[]): boolean;                 // mọi KHONG_DAT đều CAU_HINH
export function hetHanDeNghi(r: { status: string; proposedAtMs: number }, acceptWaitMinutes: number, bayGioMs: number): boolean; // chỉ PENDING
export interface XeNhanDto { maChuyen: string; tenTaiXe: string; choTrong: number; diemSapToi: string | null } // ĐÚNG bốn khoá (ĐP9)
export function xeNhanDto(...): XeNhanDto;
```

**Nhật ký (`audit-actions.ts`, nhóm `trip`):** `trip_transfer_proposed`, `trip_transfer_withdrawn`, `trip_transfer_declined`, `trip_transfer_expired`, `trip_transfer_voided`, `trip_transfer_confirmed`, `trip_transfer_escalated`, `trip_transfer_rejected`, `trip_stop_added_running`, `trip_allocation_office_cancelled` (+ `trip_stops_synced` có sẵn :102). Tên chốt ở T0 Step 4.

- [ ] **Step 1: Test đỏ** — `dieu-phoi-chuyen-diem.test.ts`:
  - đủ chỗ, không trùng giờ → mọi `DAT`, `quyetDinhSauKiem(…, true)` = `CONFIRMED`; công tắc tắt → `ESCALATED`;
  - vượt chỗ đích → `SUC_CHUA_DICH` `KHONG_DAT` `LOI`, `duocDuyetThay` = false;
  - chỉ thiếu khoảng nghỉ → `KHONG_DAT` `CAU_HINH`, `duocDuyetThay` = true;
  - đích `PLANNED` trong mốc → `MOC_TOI_THIEU` `KHONG_DAT` `CAU_HINH`; đích `RUNNING` → `MOC_TOI_THIEU` `DAT` (Q-L2-B);
  - chuyến kế của B trong 2 × khoảng nghỉ → `CANH_BAO` (không chặn);
  - `SUC_CHUA_NGUON` luôn `DAT`;
  - `hetHanDeNghi`: `PENDING` quá hạn → true; `ESCALATED` quá hạn → false;
  - `Object.keys(xeNhanDto(…)).sort()` = `["choTrong","diemSapToi","maChuyen","tenTaiXe"]`; `diemSapToi` chữ tự do có dãy ≥ 8 số → đã che;
  - bài khoá: `TANG_LUAT` phủ đủ `MA_LUAT_CHUYEN` và khớp tập `CHECK` trong migration (đọc tệp migration).
- [ ] **Step 2:** chạy → ĐỎ. **Step 3:** viết. **Step 4:** chạy → XANH; `npm run typecheck`.
- [ ] **Step 5:** Commit `"Đợt 5: luật thuần kiemChuyen — một nguồn cho màn hình và máy chủ"`.

### Task 3: SQL + hàm dựng lô (D4, D5) + MQ-09 trong lô cũ

**Files:**
- Modify: `src/modules/van-chuyen/chuyen-repo.ts` (cạnh `TRIP_GATE` :280, `TRIP_GATE_DOI` :289, `TRIP_GATE_DANG_CHAY` :407)
- Modify: `src/modules/van-chuyen/dieu-phoi.ts` (`NhanCau` :22; `loDaToi` :371, `loKetThuc` :421, `loKetThucGianDoan` :439, `loCapNhatDiem` :261)
- Test: `src/modules/van-chuyen/thu-tu-lo.test.ts` (`MAU`), `src/modules/van-chuyen/chuyen-diem.test.ts` (mới)

**Interfaces (SQL — `defineSql("van-chuyen", …)`):**

| Hằng | Việc |
|---|---|
| `TRIP_GATE_CHAY_HOAC_CHO` | cổng một chuyến: `version` đúng, `status IN ('PLANNED','RUNNING')` |
| `TRIP_GATE_DANG_CHAY_VERSION` | cổng chuyến RUNNING có `version` (D5.1, D5.2, D5.3a — khác `TRIP_GATE_DANG_CHAY` không kiểm version) |
| `TRIP_GATE_DOI_CHAY` | cổng thứ hai: đích `PLANNED`/`RUNNING`, đòi nguồn mang dấu lệnh (khuôn `TRIP_GATE_DOI`) |
| `TRANSFER_INSERT`, `TRANSFER_SET_STATUS` (`WHERE status = ?cu`, gác dấu lệnh), `TRANSFERS_VOID_BY_STOP`, `TRANSFERS_VOID_BY_TRIP`, `TRANSFER_CHECK_INSERT` | đề nghị + dòng kiểm |
| `ALLOC_OFFICE_CANCEL` | đặt `office_cancel_*` (gác dấu lệnh, `status='WAITING'`) |
| `TRIP_CHOT` | câu chốt `UPDATE vc_trip SET version = version WHERE id = ?1 AND last_cmd_id = ?2` |
| `ALLOC_INSERT` / `ALLOC_CLOSE` mở rộng | thêm `transfer_id`, `opened_cmd_id`, `closed_cmd_id`; `STOP_INSERT` thêm `added_while_running` |

**Interfaces (hàm dựng lô — `dieu-phoi.ts`):**

```ts
export interface LenhGuiDeNghi extends LenhChung { nguon: { tripId: string; version: number }; deNghi: { id: string; toTripId: string; scope: "STOP"|"ONBOARD"; fromStopId: string|null;
  meetLocationId: string|null; meetPlaceText: string|null; paxCount: number; proposedByPartyId: string; policyId: string }; detail: string }
export function loGuiDeNghi(db, l: LenhGuiDeNghi): CauCoNhan[];       // cổng nguồn → nhật ký → sự kiện TRANSFER_PROPOSED → INSERT đề nghị
export interface LenhDongDeNghi extends LenhChung { tripId: string; version: number; deNghiId: string; tu: "PENDING"|"ESCALATED"; den: "WITHDRAWN"|"DECLINED"|"EXPIRED"|"REJECTED";
  lyDo: string|null; detail: string }
export function loDongDeNghi(db, l: LenhDongDeNghi): CauCoNhan[];     // rút / không nhận / hết hạn (đóng lười) / bác
export interface LenhXacNhanChuyen extends LenhChung { nguon: {tripId; version}; dich: {tripId; version}; deNghiId: string; tu: "PENDING"|"ESCALATED";
  ketQua: "CONFIRMED"|"ESCALATED"; cachQuyet: "MAY"|"NGUOI"; lyDoPhaLe: string|null; kiem: DongKiem[]; policyId: string;
  cap: { dongId: string; mo: SuatMoi & { trangThai: "WAITING"|"BOARDED" } }[]; diemMoiDich: (DiemMoi & { themKhiChay: boolean })[];
  diemNguonMoved: string|null; manifestMoi: { allocationId: string; passengerRowId: string|null }[]; deNghiKhacVoid: string[]; detail: string }
export function loXacNhanChuyen(db, l: LenhXacNhanChuyen): CauCoNhan[];
//   cổng nguồn → CONG_DOI đích → nhật ký → sự kiện (trên đích, related = nguồn) → TRANSFER_SET_STATUS → dòng kiểm (mỗi DongKiem một câu)
//   → [chỉ khi CONFIRMED] đóng suất nguồn TRANSFERRED → mở suất đích (giữ trạng thái) → điểm đích → điểm nguồn MOVED → manifest → VOID đề nghị khác (P4)
export interface LenhThemDiemDangChay extends LenhChung { tripId; version; diemMoi: DiemMoi[]; suatMoi: SuatMoi[]; mocXep: {legId; ngay; gio}[];
  manifestMoi: {...}[]; phaLe: PhaLe|null; policyId: string|null; detail: string }
export function loThemDiemDangChay(db, l): CauCoNhan[];               // D5.1 — chụp vc_leg_appt_ack XEP khi chặng chưa có (trigger 0043)
export interface LenhBaoHuy extends LenhChung { tripId; version; suatId: string; lyDo: string; deNghiVoid: string[]; detail: string }
export function loBaoHuy(db, l): CauCoNhan[];                         // D5.2 + MQ-09
// loCapNhatDiem: thêm tham số `dangChay: boolean` — true ⇒ cổng TRIP_GATE_DANG_CHAY_VERSION, suất mở added_after_departure=1, opened/closed_cmd_id = dấu lệnh,
//   điểm mới added_while_running=1, câu TRIP_CHOT đứng CUỐI (nhãn TRANG_THAI_CUOI), KHÔNG bỏ qua điểm (diemBoQua rỗng — khách vẫn trên xe)
// loDaToi, loKetThuc, loKetThucGianDoan: thêm `deNghiVoid: string[]` — VOID đề nghị PENDING/ESCALATED liên quan trong cùng lô (MQ-09)
```

- [ ] **Step 1: Test đỏ:** thêm vào `MAU` của `thu-tu-lo.test.ts` mẫu cho `loGuiDeNghi`, `loDongDeNghi`, `loXacNhanChuyen` (đủ nhánh: CONFIRMED có điểm mới, đích RUNNING có manifest, có đề nghị khác bị VOID), `loThemDiemDangChay`, `loBaoHuy`, `loCapNhatDiem` nhánh `dangChay`; bài chạy → đỏ vì hàm chưa có. Bài `chuyen-diem.test.ts` (D1 thật trên `node:sqlite`, gieo chuyến A RUNNING, B PLANNED/RUNNING): lô xác nhận → `CONFIRMED`, suất A `TRANSFERRED` + `transfer_id`, suất B mở cùng `transfer_id`, A `MOVED`, `version` hai chuyến tăng, đủ dòng kiểm có `rule_tier`; lô `ESCALATED` → không suất nào đổi; `loDaToi` trên điểm có đề nghị chờ → đề nghị `VOID` cùng lô.
- [ ] **Step 2:** `node --test src/modules/van-chuyen/thu-tu-lo.test.ts src/modules/van-chuyen/chuyen-diem.test.ts` → ĐỎ.
- [ ] **Step 3:** Viết SQL + hàm. Câu chốt `TRIP_CHOT` dùng nhãn `TRANG_THAI_CUOI` (có sẵn :22, luật 4 "đứng cuối, nhiều nhất một") — KHÔNG thêm nhãn mới; nếu bài thứ tự lô từ chối (câu chốt không phải "trạng thái") → DỪNG, ghi mục đề xuất luật (T10), không tự nới bài.
- [ ] **Step 4:** XANH; `npm test`, `npm run typecheck`.
- [ ] **Step 5:** Commit `"Đợt 5: lô đề nghị chuyển (cổng đôi), thêm điểm, báo huỷ khi xe chạy; MQ-09 trong lô cũ"`.

### Task 4: Lệnh đề nghị + ô `trip.transfer` + route tài xế (D4)

**Files:**
- Create: `src/modules/van-chuyen/chuyen-diem-lenh.ts`
- Modify: `src/modules/van-chuyen/dieu-phoi-than.ts` (bộ đọc thân), `src/modules/van-chuyen/index.ts` (khối `cuoc-cua-toi` :1027-1237), `src/modules/van-chuyen/chinh-sach.ts` (+ route `…/chinh-sach-dieu-phoi` :501-529: hai cột mới, `settings.ops`), `src/shared/permissions.ts` (:169-179), `src/shared/permissions.test.ts` (:26-29 bảng; :310-336 ghim DRIVER; :341 ghim DRIVER_PARTNER)
- Test: `src/modules/van-chuyen/chuyen-diem-route.test.ts` (mới), `tests/e2e/chuyen-diem.mjs` (mới)

**Ô quyền (cột theo thứ tự `row(SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR)`):**
`"trip.transfer": row("none","none","none","none","none","any","none","assigned","none","none")` — route chốt thêm "đang lái chuyến nguồn / đích", **áp cả Toàn quyền**. Ghim DRIVER thêm `"trip.transfer": "assigned"` (NỚI — chỉ commit SAU khi chủ duyệt T10; trước đó để trên nhánh với chú thích "CHỜ CHỦ DUYỆT"); ghim DRIVER_PARTNER thêm `"trip.transfer": "none"`.

**Route (cổng `staff`; `can(staff, "trip.transfer", { assigned })` TRƯỚC mọi truy vấn; `assigned` = đang có dòng lái mở — tính trong `van-chuyen`, KHÔNG `ctx.isAssigned`):**

| Route | Lệnh | Trả |
|---|---|---|
| `GET /api/van-chuyen/cuoc-cua-toi/:id/xe-nhan` | danh sách `XeNhanDto[]` (chuyến cùng ngày `PLANNED`/`RUNNING` có tài xế mở, trừ chuyến mình) | 200 / 404 |
| `POST /api/van-chuyen/cuoc-cua-toi/:id/de-nghi` | thân `{ requestId, version, denChuyenId, diemId, scope: "STOP" }` → `lenhGuiDeNghi`; `ONBOARD` → 400 (P2) | 201 / 400 / 404 / 409 |
| `POST /api/van-chuyen/de-nghi/:rid/rut` | chỉ người gửi; `PENDING` → `WITHDRAWN` | 200 / 404 / 409 |
| `POST /api/van-chuyen/de-nghi/:rid/nhan` | chỉ tài xế đích; hết hạn → ghi `EXPIRED` + 409 `de_nghi_het_han`; còn hạn → `kiemChuyen` → `loXacNhanChuyen`; thua cổng `version` → **tự thử lại ĐÚNG MỘT lần** với dữ liệu đọc lại | 200 (`CONFIRMED`/`ESCALATED`) / 404 / 409 |
| `POST /api/van-chuyen/de-nghi/:rid/khong-nhan` | thân `{ requestId, lyDo }` (nhóm `TU_CHOI_NHAN`) | 200 / 400 / 404 |
| `GET /api/van-chuyen/de-nghi-gui-toi` | đề nghị `PENDING` gửi tới chuyến mình đang lái: mã chuyến nguồn, tên tài xế A, điểm, `pax_count`, nơi trả, "sau khi nhận x/y chỗ" — **không tên khách** | 200 |

```ts
// chuyen-diem-lenh.ts
export async function lenhGuiDeNghi(db: D1Database, nen: NenChuyen, b: GuiDeNghiThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | { id: string }>;
export async function lenhNhanDeNghi(db: D1Database, rid: string, b: { requestId: string }, nguoi: NguoiBam, bayGioMs: number): Promise<Response | { trangThai: "CONFIRMED" | "ESCALATED" }>;
export async function lenhDongDeNghi(db: D1Database, rid: string, loai: "RUT" | "KHONG_NHAN" | "BAC", b: DongDeNghiThan, nguoi: NguoiBam, bayGioMs: number): Promise<Response | null>;
export async function lenhDuyetDeNghi(db: D1Database, rid: string, b: { requestId: string; lyDo: string }, staff: StaffProfile, bayGioMs: number): Promise<Response | null>;
// MQ-08 đóng lười: mọi lệnh chạm đề nghị đọc hetHanDeNghi(...) trước; hết hạn ⇒ lô loDongDeNghi(den: "EXPIRED") rồi trả 409.
```

- [ ] **Step 1: Test đỏ** (`chuyen-diem-route.test.ts`, khung route như `cuoc-cua-toi.test.ts`):
  - Mường Thanh của chủ (bộ ca mẫu — **chờ chủ xác nhận**, xem "Cần chủ" 1): A gửi, B nhận → 200 `CONFIRMED`, `decided_mode='MAY'`, nhật ký có mã luật, KHÔNG tên;
  - vượt chỗ → `ESCALATED`, không suất đổi; công tắc tắt → `ESCALATED`;
  - người gửi không lái nguồn → 404; Toàn quyền không lái → 404; Bán hàng / Quản trị gọi → 403;
  - B nhận sau `accept_wait_minutes` → 409 + dòng `EXPIRED`; nhận lại lần hai → 409 (không xác nhận);
  - `scope: "ONBOARD"` → 400;
  - điểm nguồn đã tới → 409 / đề nghị `VOID`;
  - lệnh lặp cùng `requestId` → kết quả cũ, không ghi thêm;
  - `GET …/xe-nhan` mỗi phần tử đúng bốn khoá; `GET …/de-nghi-gui-toi` không có `fullName`/`birthYear`/SĐT/mã đơn khách.
  - `permissions.test.ts`: dòng `trip.transfer` trong bảng :20-35; ghim DRIVER có `trip.transfer: "assigned"`; ghim DRIVER_PARTNER `none`; bài "mỗi ô được máy chủ hỏi" thấy `trip.transfer`.
  - Chính sách: POST thêm dòng có `accept_wait_minutes`, `auto_confirm_transfer`; chỉ Toàn quyền (`settings.ops`) — Quản trị → 403.
- [ ] **Step 2:** ĐỎ. **Step 3:** viết. **Step 4:** XANH + `npm run typecheck`; e2e `tests/e2e/chuyen-diem.mjs` (tiêu chí ADR-0052:238-240, 244) → `npm run test:e2e -- chuyen-diem`.
- [ ] **Step 5:** Commit `"Đợt 5: đề nghị chuyển điểm giữa hai tài xế — máy tự xác nhận, hết giờ chờ, ô trip.transfer"`.

### Task 5: Route văn phòng — duyệt / bác, danh sách đề nghị, thêm điểm, báo huỷ, cập nhật điểm khi xe chạy (D4 ĐP4, D5.1–D5.3a)

**Files:**
- Modify: `src/modules/van-chuyen/index.ts` (khối văn phòng `…/chuyen/:id/*` :808-1000), `src/modules/van-chuyen/dieu-phoi-lenh.ts` (`lenhCapNhatDiem` :279 — chặn ở `khongConKeHoach` :284), `src/modules/van-chuyen/dieu-phoi-than.ts`
- Test: `src/modules/van-chuyen/xe-dang-chay-route.test.ts` (mới), `tests/e2e/xe-dang-chay.mjs` (mới)

**Route (cổng `office`):**

| Route | Ô | Việc |
|---|---|---|
| `GET /api/van-chuyen/de-nghi?ngay=` | `trip.view` | đề nghị trong ngày (mọi trạng thái), không tên khách |
| `POST /api/van-chuyen/de-nghi/:rid/duyet` | `trip.override` | chỉ `ESCALATED` và `duocDuyetThay` = true; lý do bắt buộc (nhóm `PHA_LE`) → `CONFIRMED` `NGUOI`; có luật lõi `KHONG_DAT` → 409 |
| `POST /api/van-chuyen/de-nghi/:rid/bac` | `trip.override` | `ESCALATED` → `REJECTED`, lý do bắt buộc |
| `POST /api/van-chuyen/chuyen/:id/them-diem` | `trip.dispatch` (+ `trip.override` khi phá lệ mốc) | chuyến RUNNING; thân như `docXep` (`dieu-phoi-than.ts:95`); mốc 6 giờ đúng dòng "Xếp" ADR-0049 D2: chặng đặt gấp qua; chặng khác → 409 "cần Quản trị" trừ khi `phaLe` + `trip.override` |
| `POST /api/van-chuyen/chuyen/:id/phan-bo/:aid/bao-huy` | `trip.dispatch` | thân `{ requestId, version, lyDo }` (nhóm `BAO_HUY_DIEM`) |
| `POST /api/van-chuyen/chuyen/:id/cap-nhat-diem` (có sẵn :975) | `trip.dispatch` | nay chạy cả RUNNING: chỉ suất `WAITING` ở điểm `PENDING`; suất khác lệch → bỏ qua, trả `boQua` (số); không phá lệ thêm |

```ts
export async function lenhThemDiemDangChay(db, nen: NenChuyen, lich: readonly ChangLichChung[], b: XepThan, staff: StaffProfile, bayGioMs: number): Promise<Response | null>;
export async function lenhBaoHuy(db, nen: NenChuyen, suatId: string, b: { version: number; requestId: string; lyDo: string }, staff: StaffProfile, bayGioMs: number): Promise<Response | null>;
// lenhCapNhatDiem: nhánh nen.trip.status === "RUNNING" gọi loCapNhatDiem({ ..., dangChay: true })
```

- [ ] **Step 1: Test đỏ** (tiêu chí ADR-0052:240, 243, 246, 247):
  - Duyệt: chỉ thiếu khoảng nghỉ, Quản trị không lý do → 400; có lý do → 200 `NGUOI`, suất đổi; Bán hàng → 403; có `SUC_CHUA_DICH` `KHONG_DAT` → 409 VÀ SQL `UPDATE status='CONFIRMED'` thẳng → RAISE; đích `PLANNED` trong mốc → `ESCALATED` dòng `MOC_TOI_THIEU`, duyệt có lý do → `CONFIRMED`.
  - Thêm điểm: RUNNING, chặng đặt gấp → 200 + `vc_leg_appt_ack` XEP nếu chưa có + manifest dòng `added_after_departure`; chặng thường, Bán hàng → 409 "cần Quản trị"; Bán hàng gửi `phaLe` → 403; Quản trị phá lệ có lý do → 200 + sự kiện có `override_rule_code`; chặng quay về "chưa xếp" sau gián đoạn → như chặng thường; suất thêm có giờ sự kiện ≥ `valid_from_at`.
  - Báo huỷ: suất vẫn chiếm chỗ (LC-02 đếm); tài xế "Khách đã huỷ" → hết chiếm; lần hai → 409 + RAISE; đề nghị chờ cho điểm đó → `VOID`.
  - Cập nhật điểm RUNNING: `WAITING`/`PENDING` → 200, số chỗ không đổi, `trip_stops_synced` detail không chứa `L:`/`T:`/dãy ≥ 8 số; suất `BOARDED` hoặc điểm đã tới → không đổi (`boQua`), SQL tay → RAISE.
  - Văn phòng đóng suất RUNNING qua `…/rut` hay `…/doi` → 409 (giữ) VÀ RAISE.
- [ ] **Step 2:** ĐỎ. **Step 3:** viết. **Step 4:** XANH; e2e `tests/e2e/xe-dang-chay.mjs`.
- [ ] **Step 5:** Commit `"Đợt 5: văn phòng thêm điểm, báo huỷ, cập nhật điểm trên xe đang chạy; duyệt/bác đề nghị leo thang"`.

### Task 6: Chạy đua (Review Focus 1–2)

**Files:**
- Modify: `tests/e2e/dieu-phoi-chay-dua.mjs` (có sẵn — bài chạy đua ADR-0049 chỉ phủ MỘT chuyến; ADR-0052:287 "chưa kiểm cổng đôi")
- Test: `src/modules/van-chuyen/chuyen-diem-chay-dua.test.ts` (mới; hai lô dựng sẵn chạy xen kẽ trên `node:sqlite`)

- [ ] **Step 1: Viết các ca (đỏ trước khi T3–T5 xong; nếu viết sau thì quan sát chặn bằng cách bỏ cổng đôi → đỏ → hoàn nguyên):**
  1. Văn phòng `them-diem` và tài xế `ket-thuc` cùng `version` → đúng một 200, một 409 (`stale`/`xe_da_ket_thuc`, câu tiếng Việt); không điểm `added_while_running` trên chuyến `ENDED`; audit-invariants sạch.
  2. A gửi cùng điểm cho B và C; B nhận rồi C nhận → B `CONFIRMED`, C `VOID` (P4) hoặc 409; **đảo thứ tự** C rồi B → đối xứng; điểm A `MOVED` đúng một lần; số suất `TRANSFERRED` = số suất mở có cùng `transfer_id`.
  3. B nhận đúng lúc A rút → một thắng: `CONFIRMED` (rút → 409) hoặc `WITHDRAWN` (nhận → 409); không suất nửa chuyển.
  4. B nhận đúng lúc A bấm "Đã tới" điểm đó → `VOID` hoặc `CONFIRMED`, không cả hai.
  5. Văn phòng thêm điểm vào B đúng lúc B nhận → nhận tự thử lại MỘT lần, kết quả theo dữ liệu mới (đủ chỗ → `CONFIRMED`, hết chỗ → `ESCALATED`); không thử lần ba.
  6. Hai đề nghị khác điểm cùng đổ vào B, tổng vượt chỗ → đề nghị sau `ESCALATED` (ADR-0052:242).
- [ ] **Step 2:** chạy → XANH sau T3–T5; `npm run test:e2e -- dieu-phoi-chay-dua`.
- [ ] **Step 3:** Commit `"Đợt 5: bài chạy đua cổng đôi — hai xe cùng nhận, thêm điểm khi kết thúc"`.

### Task 7: Hàng rào "không lộ" + kiến trúc + cổng ghi

**Files:**
- Modify: `src/hanh-khach-khong-lo-ten.test.ts` (regex route điều phối; `TRA_TEN` :166), `src/giay-to-khong-lo-so.test.ts`, `src/route-write-guard.test.ts`, `src/architecture.test.ts`

- [ ] **Step 1:** Mở rộng `hanh-khach-khong-lo-ten.test.ts`: regex chọn route điều phối thêm nhóm `de-nghi`, `xe-nhan`, `them-diem`, `bao-huy`; `TRA_TEN` **chưa** thêm route thứ ba ở A-1 (chi tiết đề nghị trả tên khi `CONFIRMED` — ADR-0052:90 — đi qua `GET …/cuoc-cua-toi/:id` có sẵn, vì khách đã ở trên xe B); thêm ca `trip_stops_synced` với nơi chữ tự do "Nhà riêng gọi 0905123456" + tên mẫu → `audit_log.detail` không chứa dãy số, tên, `L:`/`T:`. Nếu người thi công chọn trả tên ở route đề nghị riêng → đó là route thứ ba trong `TRA_TEN` = NỚI ⇒ mục đề xuất luật T10, không tự thêm.
- [ ] **Step 2:** `giay-to-khong-lo-so.test.ts` thêm ca cho mọi route mới; `route-write-guard.test.ts` phủ route ghi mới ở cổng `staff` (`/de-nghi/*` nằm ngoài `cuoc-cua-toi` — kiểm danh sách tiền tố của bài có bắt không, thiếu thì SIẾT bài).
- [ ] **Step 3:** `architecture.test.ts`: không cạnh mới (`ALLOWED_EDGES["van-chuyen"]` :60 giữ nguyên); SQL mới qua `defineSql` trong `chuyen-repo.ts`.
- [ ] **Step 4:** Chạy `npm test` → XANH; quan sát chặn: thêm tạm `fullName` vào `XeNhanDto` → đỏ → hoàn nguyên.
- [ ] **Step 5:** Commit `"Đợt 5: hàng rào không lộ tên cho đề nghị chuyển và lệnh xe đang chạy"`.

### Task 8: Kiểm định kỳ (audit-invariants) A-1

**Files:** `scripts/audit-checks.mjs` (sau `R-VC-20` :562 — đo lại số lớn nhất), `src/audit-invariants.test.ts`

Câu mới (ADR-0052:221; mức `fail`):
- `R-VC-<k+1>`: đề nghị `CONFIRMED` mà số suất `TRANSFERRED` ≠ số suất mở ở đích cùng `transfer_id`;
- `R-VC-<k+2>`: suất `TRANSFERRED` không `transfer_id` / trỏ đề nghị không `CONFIRMED`;
- `R-VC-<k+3>`: đề nghị `CONFIRMED` + `NGUOI` có dòng kiểm `KHONG_DAT` + `LOI`;
- `R-VC-<k+4>`: suất có `office_cancel_*` mà trạng thái lúc đặt không `WAITING` (theo sự kiện `ALLOCATION_OFFICE_CANCELLED`);
- `R-VC-<k+5>`: điểm `added_while_running = 1` trên chuyến chưa từng `RUNNING` (`departed_at IS NULL`);
- `R-VC-<k+6>` (lưới thứ hai D5.3a): suất đóng `STOP_CHANGED` trên chuyến có `departed_at` mà không có suất mở cùng chuyến, chặng, `passenger_key` với `opened_cmd_id = closed_cmd_id`.

- [ ] **Step 1:** Test đỏ mỗi câu: ca sạch → 0; ca gieo lỗi (gỡ trigger trong bài) → 1. **Step 2:** viết câu. **Step 3:** XANH; quan sát chặn (bỏ một vế → đỏ → hoàn nguyên). **Step 4:** Commit `"Đợt 5: kiểm định kỳ đề nghị chuyển, báo huỷ, cập nhật điểm khi xe chạy"`.

### Task 9: Điểm cắm D6 (tin báo — Đợt 2 sở hữu)

**Files:** `src/modules/van-chuyen/index.ts` (route mới T4–T5), hàm người nhận của Đợt 2 (tên đo ở T0 — ADR-0052 D6.2 "một hàm thuần duy nhất"), bài của nó.

**Interfaces (ADR-0052 D6.3, chữ ký theo Đợt 2 — `…-02-tin-bao-chuyen.md` đã đổi, ADR xếp hàm tiêm là hai chiều):** `ctx.baoThayDoiChuyen({ tripId, requestId })` — gọi **sau** lô thành công, bắn-và-quên; không gọi khi 409/lệnh lặp.

Dòng người nhận cần có (ADR-0052:157-160) — thêm vào bảng của Đợt 2 nếu chưa có:

| Hành động | Người nhận |
|---|---|
| `trip_stop_added_running`, `trip_allocation_office_cancelled`, `trip_stops_synced` (chuyến RUNNING) | tài xế có dòng lái mở lúc sự kiện |
| `trip_transfer_proposed` | tài xế đích |
| `trip_transfer_confirmed` / `_rejected` / `_expired` / `_declined` / `_withdrawn` / `_voided` | tài xế nguồn + đích |
| `trip_transfer_escalated` | người có `trip.override` |

- [ ] **Step 1:** Test đỏ: hàm người nhận với mọi tập con quyền — leo thang chỉ tới `trip.override`; tài xế bị gỡ không nhận tin sau; chỉ-`DRIVER_PARTNER` không nhận gì; route gọi `baoThayDoiChuyen` đúng một lần sau 200, không gọi khi 409 (gián điệp `ctx`). **Step 2–4:** viết, XANH. **Step 5:** Commit `"Đợt 5: nối tin báo cho đề nghị chuyển và thay đổi khi xe chạy"`.
- Nếu Đợt 2 chưa gộp: dừng task này, ghi nợ có hạn trong nhật ký; A-1 KHÔNG phát hành thiếu tin báo đề nghị (tài xế đích không biết có đề nghị — 10 phút hết hạn) ⇒ báo điều phối.

### Task 10: Đề xuất luật A-1 + sổ hàng rào + tài liệu + nhật ký phiên bản

**Files:**
- Create: `docs/superpowers/plans/<ngày>-adr-0052-a1-de-xuat-luat.md` (khuôn `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md`: Tóm tắt cho chủ lời thường; mỗi mục: nguyên văn → mới, vì sao, căn cứ ADR)
- Modify: `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts`, `src/shared/app-info.test.ts`

**Mục của tệp đề xuất A-1 (tối đa 3 — trần §9):**
1. NỚI bài ghim hàng `DRIVER` (`src/shared/permissions.test.ts:310-336`): thêm `"trip.transfer": "assigned"` (ADR-0052 bảng "Câu ADR bị thay" dòng 3 — chủ duyệt ADR là duyệt việc nới, nhưng sửa hàng rào vẫn qua tệp này).
2. Sửa `src/CLAUDE.md:22` ("Quyền `DRIVER` … chỉ có `trip.view`, `trip.progress`") → thêm `trip.transfer`; thêm câu "đề nghị chuyển, thêm điểm, báo huỷ trên xe đang chạy — bốn đường LC-15 có tên".
3. (Chỉ khi T3 Step 3 / T7 Step 1 buộc phải) ngoại lệ bài thứ tự lô hoặc route thứ ba của `TRA_TEN`. Nếu cả hai cùng cần → vượt trần ⇒ tách lượt, hỏi chủ.

**Sổ hàng rào (mỗi dòng: chặn gì — cơ chế — ngày thấy chặn thật ở T1/T7/T8):** trigger LC-14; LC-15 mới (ba trigger dựng lại); câu chốt D5.3a; `ESCALATED → CONFIRMED`; chỉ-thêm hai bảng; `office_cancel_once`; bài ghim DRIVER (4 ô — 3 ô ở A-1); bài liệt kê khoá `XeNhanDto`; bài chạy đua cổng đôi (T6); sáu câu `R-VC` mới; bài "câu chèn chính sách đủ cột" (P5).

- [ ] **Step 1:** Soạn tệp đề xuất; KHÔNG sửa `src/CLAUDE.md`, ghim DRIVER trước khi chủ duyệt (ghim để nhãn "CHỜ CHỦ DUYỆT" trên nhánh như tiền lệ ADR-0049).
- [ ] **Step 2:** Dòng sổ hàng rào; `SYSTEM-DESIGN.md` §5/§6/§7; `CHANGE-GUIDE.md` (công thức z3: bốn đường LC-15, thứ tự lô đóng → mở → chốt, bẫy "mở trước đóng = UNIQUE LC-01").
- [ ] **Step 3:** Mục `changelog.ts` (lời thường: "Tài xế nhờ xe khác đón; văn phòng thêm điểm / báo huỷ khi xe đang chạy"), số phiên bản theo L2; `app-info.test.ts`.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local` → xanh/0. Commit từng tệp tài liệu.

### Task 11: Giao diện A-1 — CHỜ BẢN VẼ (Phụ lục B: V4, V8, V9, V10, V11, thẻ V6)

**Files:** `web/cuoc-chuyen.ts` (màn tài xế), `web/chuyen.ts` (chi tiết chuyến văn phòng), `web/dieu-phoi.ts` (bảng điều phối), `src/shared/dieu-phoi-man.ts` (hàm thuần màn hình — gọi `kiemChuyen` để hiện "sau khi nhận x/y chỗ"), `public/app.css` (chỉ token).

- [ ] **Step 1:** Chỉ nhận khi chủ đã gửi bản vẽ; làm đúng 100%. Ẩn/hiện bằng `can(staff, "trip.transfer" | "trip.override" | "trip.dispatch")` (`src/giao-dien-hoi-bang-quyen.test.ts`).
- [ ] **Step 2:** Đếm ngược hết hạn tính từ `proposedAt` + `acceptWaitMinutes` do máy chủ trả (không đồng hồ máy khách làm chuẩn — máy chủ quyết).
- [ ] **Step 3:** Kịch bản Chrome 390 + 1040 theo bảng `web/CLAUDE.md` "Sửa tệp nào…"; ảnh vào `docs/evidence/`. Tài khoản tài xế mở SAU CÙNG (chung cookie).
- [ ] **Step 4:** Commit theo màn.

### Task 12: Kiểm độc lập A-1 + nhật ký

- [ ] **Step 1:** Gọi `nguoi-kiem-doc-lap` (chỉ đọc) với: ADR-0052, kế hoạch này, nhánh; trọng tâm "Điểm cho người kiểm soi kỹ" ADR-0052:277-283 + P4 + Review Focus.
- [ ] **Step 2:** Ghi kết quả vào nhật ký thi công Đợt 5; chỉ báo "đạt" dựa trên báo cáo + test.
- [ ] **Step 3:** Đưa chủ lệnh `npm run day-len -- <nhánh>` và `npm run trien-khai` (đổi app ⇒ cần triển khai). Không tự chạy.

---

# LÁT A-1b (D5b + D5c) — CHỈ SAU Đợt 4 T2

### Task 13: Cổng vào A-1b + trang ghép thi công D5b

**Files:**
- Create: `docs/superpowers/specs/<ngày>-trang-ghep-d5b-tai-xe-ghi-hanh-khach.md`

- [ ] **Step 1: Cổng vào (dừng nếu thiếu):** A-1 đã lên `main`; Đợt 4 T2 đã lên `main` — có cổng xuất bến `THIEU_GIA` và ô `transport.cost.adjust` (`grep -n "THIEU_GIA\|transport.cost.adjust" src/shared/*.ts`). Thiếu → dừng, báo điều phối (ADR-0052:135).
- [ ] **Step 2: Trang ghép** (CLAUDE.md §9 — đường ghi MỚI vào bảng của `orders`; bảng dùng chung nhận người ghi mới). Ba phần bắt buộc, đo trên mã THẬT lúc đó (dựa trang ghép quyết định `docs/superpowers/specs/2026-09-30-trang-ghep-luot-duyet-a-dieu-phoi.md` §(1)–(3), không chép lại):
  1. `ord_passenger` chứa loại thực thể nào (một loại: khách của đơn; `source` ∈ OFFICE, DRIVER — cùng thực thể, khác người nhập); ai đọc dòng DRIVER (mọi người xem được đơn; tài xế qua DTO chuyến trong ngày chạy).
  2. Mọi dòng bản đồ quyền chạm `ord_passenger`: `order.view`, `order.passenger.write` (:88), `contact.view`, `trip.view`, `trip.passenger.add` (mới) — đủ 10 cột, áp cho loại nào.
  3. Cổng nào canh cửa nào: route tài xế (cổng `staff`, `can(trip.passenger.add, {assigned})` + `trongNgayChay` + đơn có chặng trên chuyến mình); câu ghi của `orders` (không tự kiểm quyền — chỉ gọi sau `can`, bài `orders-cong-bo.test.ts`); trigger `ord_passenger_frozen_update` (`0035`), LC-10 (gắn tên đúng đơn); **chỗ giao diện ẩn/hiện** nút "Bổ sung tên" (`web/cuoc-chuyen.ts`) và màn đơn hiện dòng tài xế nhập; R-ORD-11 đổi nghĩa (T15).
  - Mỗi lượt duyệt ≤ 3 quyết định: trang ghép đi CÙNG tệp đề xuất A-1b (T17).
- [ ] **Step 3:** Commit `"Đợt 5 A-1b: trang ghép đường ghi hành khách của tài xế"`.

### Task 14: Hàm công bố mới của `orders` — câu ghi hành khách do tài xế (chưa chạy)

**Files:**
- Modify: `src/modules/orders/chang-hanh-khach-repo.ts` (tệp DUY NHẤT được nhắc `full_name` — `src/CLAUDE.md:15`; khuôn `legInsertGuarded` :167), `src/modules/orders/index.ts` (xuất), `src/orders-cong-bo.test.ts` (thêm vào danh sách hàm hẹp chỉ gọi sau `can`), `src/modules/orders/ham-cong-bo.test.ts`
- Test: `src/modules/orders/hanh-khach-tai-xe.test.ts` (mới)

**Interfaces:**

```ts
// orders/index.ts — KHÔNG tự kiểm quyền; nơi gọi đứng sau can(trip.passenger.add, { assigned }) + trongNgayChay
export interface HanhKhachTaiXeVao { id: string; orderId: string; fullName: string; birthYear: number; paxCode: "adult"|"child"|"senior"|"infant"|null; at: string; by: string }
export function cauThemHanhKhachTaiXe(db: D1Database, v: HanhKhachTaiXeVao, auditId: string): D1PreparedStatement;
//  INSERT ord_passenger (…, person_key = id, previous_id NULL, source = 'DRIVER') SELECT … WHERE EXISTS (SELECT 1 FROM audit_log WHERE id = ?auditId)
//  AND đơn đã xác nhận, chưa huỷ AND số người hiện hành của đơn < số khách hiệu lực (không thêm quá số khách — L-A1)
export function kiemHanhKhachTaiXe(body: unknown, namNay: number): { ok: true; value: Omit<HanhKhachTaiXeVao, "id"|"orderId"|"at"|"by"> } | { ok: false; message: string }; // dùng src/shared/hanh-khach.ts
```

- [ ] **Step 1: Test đỏ:** câu chèn đúng `source = 'DRIVER'`, `person_key = id`; không có dòng nhật ký `auditId` → 0 dòng; đơn nháp / huỷ → 0 dòng; đủ người → 0 dòng; `orders-cong-bo.test.ts` bắt nơi gọi `cauThemHanhKhachTaiXe` ngoài thân route sau `can(` → đỏ (thử bằng tệp mẫu); câu SQL không nhắc `vc_` (bài EXPLAIN ranh giới).
- [ ] **Step 2–4:** ĐỎ → viết → XANH, `npm run typecheck`.
- [ ] **Step 5:** Commit `"Đợt 5 A-1b: câu ghi hành khách do tài xế nhập (orders cấp, chưa chạy)"`.

### Task 15: Ô `trip.passenger.add` + route tài xế bổ sung tên + thay R-ORD-11 (D5b)

**Files:**
- Modify: `src/shared/permissions.ts`, `src/shared/permissions.test.ts`, `src/modules/van-chuyen/dieu-phoi.ts` (+ `loBoSungTen`), `src/modules/van-chuyen/index.ts`, `src/modules/van-chuyen/thu-tu-lo.test.ts`, `src/hanh-khach-khong-lo-ten.test.ts`, `scripts/audit-checks.mjs` (R-ORD-11 :772), `src/audit-invariants.test.ts` (:1015)
- Test: `src/modules/van-chuyen/bo-sung-ten.test.ts` (mới), `tests/e2e/tai-xe-cuoc.mjs` (thêm ca)

**Kiểu + nhật ký thêm ở lát này:** `LOAI_SU_KIEN_CHUYEN` thêm `PASSENGER_NAMED` (nhãn "Tài xế bổ sung tên khách"); `audit-actions.ts` thêm `trip_passenger_named` (detail: mã chuyến, mã đơn, số người — không tên) — đối chiếu danh sách Đợt 2 như T0 Step 4.

**Ô quyền:** `"trip.passenger.add": row("none","none","none","none","none","any","none","assigned","none","none")` — SALES `none` (ĐP13), ADMIN `none` (không route văn phòng). Ghim DRIVER thêm `assigned` (NỚI — chờ duyệt T17); ghim DRIVER_PARTNER `none`.

**Route:** `POST /api/van-chuyen/cuoc-cua-toi/:id/hanh-khach` (cổng `staff`) — thân `{ requestId, suatId, fullName, birthYear, paxCode }`. Thứ tự: `can(trip.passenger.add, {assigned})` → chuyến mình đang lái → `trongNgayChay` → suất chưa tên, mở, đúng chuyến → đơn của chặng. Ngoài phạm vi → 404; suất đã có tên → 409. Phản hồi: chỉ `{ ok, soNguoi }` — KHÔNG tên.

```ts
export interface LenhBoSungTen extends LenhChung { tripId: string; suatId: string; hanhKhach: D1PreparedStatement /* từ cauThemHanhKhachTaiXe */; personKey: string; maDon: string; detail: string }
export function loBoSungTen(db, l: LenhBoSungTen): CauCoNhan[];
//  cổng TRIP_GATE_DANG_CHAY (hoặc cổng PLANNED nếu trong ngày chạy chưa xuất bến) → nhật ký trip_passenger_named → sự kiện PASSENGER_NAMED
//  → câu orders (nhãn GHI_NGOAI — gác bằng id nhật ký, không last_cmd_id) → ALLOC_GAN_TEN (:447) → manifest dòng mới nếu đã xuất bến
```

- [ ] **Step 1: Test đỏ** (ADR-0052:249): đơn không có trên chuyến mình → 404; ngoài ngày chạy → 404; tên thêm `source='DRIVER'` gắn đúng suất chưa tên đúng chặng; suất đã có tên → 409; Bán hàng, Quản trị gọi → 403; nhật ký: số người, mã chuyến, mã đơn, không tên/năm sinh; bài ghim DRIVER có ĐÚNG 4 ô `assigned`; `thu-tu-lo.test.ts` mẫu `loBoSungTen`.
- [ ] **Step 2: Bài thứ tự lô** — luật (3) đòi mọi câu sau nhật ký gác `last_cmd_id`; câu của `orders` gác id nhật ký (P7). Thêm ngoại lệ HẸP có tên (khuôn `HO_LENH_MOC`): chỉ hàm `loBoSungTen`, chỉ nhãn `GHI_NGOAI`, chỉ khi câu chứa `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với tham số = dấu lệnh. Đây là NỚI ⇒ để nhãn "CHỜ CHỦ DUYỆT", mục 2 tệp đề xuất A-1b.
- [ ] **Step 3: R-ORD-11** hôm nay `fail` khi CÓ dòng `source='DRIVER'` (`scripts/audit-checks.mjs:772`; sổ `docs/SO-HANG-RAO.md:248`) ⇒ dòng đầu tiên tài xế nhập sẽ làm kiểm định kỳ đỏ. Thay vế DRIVER bằng: "dòng `source='DRIVER'` không có sự kiện `PASSENGER_NAMED` + suất mang `passenger_key` đó trên chuyến tương ứng" (ADR-0052:221). Đổi nghĩa câu kiểm đã ghim = NỚI ⇒ mục 3 tệp đề xuất A-1b; viết lại dòng sổ :248 sau duyệt. Test: dòng DRIVER có sự kiện → 0; dòng DRIVER mồ côi → 1.
- [ ] **Step 4:** `hanh-khach-khong-lo-ten.test.ts`: route ghi tên nằm dưới `cuoc-cua-toi` (đã phủ) — thêm ca phản hồi không chứa tên vừa gửi.
- [ ] **Step 5:** XANH; e2e; commit `"Đợt 5 A-1b: tài xế bổ sung tên khách chưa có tên (trip.passenger.add)"`.

### Task 16: Cứu hộ (D5c)

**Files:** `src/modules/van-chuyen/chuyen-diem-lenh.ts`, `src/modules/van-chuyen/index.ts`, `src/modules/van-chuyen/dieu-phoi-than.ts`; test `src/modules/van-chuyen/cuu-ho.test.ts` (mới), `tests/e2e/chuyen-diem.mjs` (thêm ca).

**Route / luật:**
- `POST /api/van-chuyen/cuoc-cua-toi/:id/de-nghi` nay nhận `scope: "ONBOARD"` (tài xế xe hỏng, `trip.transfer`): mọi suất mở `WAITING` + `BOARDED` của A; nơi gặp `meetLocationId` hoặc `meetPlaceText` (che dãy số khi hiển thị).
- `POST /api/van-chuyen/chuyen/:id/cuu-ho` (cổng `office`, ô `trip.progress`): CHỈ `ONBOARD`; ghi `proposed_by_staff_id` = người bấm, `proposed_by_party_id` = tài xế đang mở của A. Văn phòng gửi `STOP` → 403; văn phòng bấm Nhận thay → 403 (route `…/nhan` chỉ cổng `staff` + "đang lái đích").
- Nhận: MQ-02/03 như D4; suất `BOARDED` sang C vẫn `BOARDED`.
- Giá: chuyến cứu hộ MỚI bằng xe nhà xe → xuất bến qua cổng `THIEU_GIA` của Đợt 4 (không code mới; chỉ e2e).

- [ ] **Step 1: Test đỏ** (ADR-0052:245, 248): A gửi `ONBOARD` → C nhận → `BOARDED` giữ; Bán hàng bấm thay → 201 + `proposed_by_staff_id`; Kế toán bấm thay → 403; văn phòng `STOP` → 403; văn phòng nhận thay → 403; không đủ chỗ → `ESCALATED`, đường lượt 1 (A kết thúc gián đoạn → chặng về "chưa xếp") vẫn chạy; xe nhà xe chưa có giá → xuất bến 409 `THIEU_GIA`, Quản trị phá lệ → vẫn 409; Quản trị / Kế toán nhập giá thoả thuận → 200.
- [ ] **Step 2–4:** ĐỎ → viết → XANH. **Step 5:** Commit `"Đợt 5 A-1b: cứu hộ chuyển khách trên xe sang xe khác"`.

### Task 17: Đề xuất luật A-1b + sổ + giao diện + kiểm độc lập

**Files:** `docs/superpowers/plans/<ngày>-adr-0052-a1b-de-xuat-luat.md` (mới, khuôn như T10), `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md`, `src/shared/changelog.ts`, `web/cuoc-chuyen.ts` (nút "Bổ sung tên", "Gửi cứu hộ" — CHỜ BẢN VẼ), `web/chuyen.ts` (nút "Cứu hộ" + bước "nhập giá thoả thuận" cạnh "tạo chuyến cứu hộ" — ADR-0052:134).

**Mục đề xuất A-1b (3 — đúng trần):** (1) ghim DRIVER thêm `trip.passenger.add: assigned` + `src/CLAUDE.md:22`; (2) ngoại lệ `GHI_NGOAI` ở bài thứ tự lô (T15 Step 2); (3) đổi nghĩa R-ORD-11 + dòng sổ :248 (T15 Step 3). Kèm trang ghép T13.

- [ ] **Step 1:** Soạn tệp đề xuất + dòng sổ (bài quét "nơi gọi `cauThemHanhKhachTaiXe` đứng sau `can(trip.passenger.add)`", ngoại lệ GHI_NGOAI, R-ORD-11 mới — mỗi dòng có ngày thấy chặn thật).
- [ ] **Step 2:** Giao diện khi có bản vẽ; Chrome 390 + 1040; ảnh `docs/evidence/`.
- [ ] **Step 3:** `npm test`, typecheck, e2e đủ bộ, audit local; changelog.
- [ ] **Step 4:** `nguoi-kiem-doc-lap` chỉ đọc; nhật ký; đưa chủ `day-len` + `trien-khai`.

---

## Cần chủ (gom một lần hỏi — ≤ 3)

1. **Bộ ca mẫu xe A/B** (ví dụ Mường Thanh — ADR-0052:274, [TK] `:1232`): xác nhận đáp án từng ca (đủ chỗ → tự xác nhận; thiếu chỗ → chỉ bác; thiếu giờ nghỉ → Quản trị duyệt) **trước khi nhận T4**. T0–T3 làm trước được.
2. **Duyệt hai tệp đề xuất luật** (T10 cho A-1, T17 cho A-1b): nới bài ghim tài xế (thêm "nhờ xe khác đón", "bổ sung tên"), sửa luật thư mục `src/CLAUDE.md`, ngoại lệ hẹp cho câu ghi tên khách, đổi nghĩa kiểm định kỳ R-ORD-11.
3. **Bản vẽ Claude Design** (Phụ lục B): V4, V8–V11, thẻ V6, nút "Bổ sung tên", "Cứu hộ". Máy chủ làm trước, không chờ.

## Điều chưa chắc

- **Một điểm chỉ một đề nghị đang chờ?** ADR không nói. Kế hoạch KHÔNG thêm chỉ mục duy nhất; dựa vào cổng `version` của chuyến nguồn + P4 (xác nhận thì VOID đề nghị khác cùng điểm). Nếu người kiểm / chủ muốn chặn ngay từ lúc gửi → luật mới, cần chủ.
- **CHECK "ba cột cùng có/vắng" qua `ADD COLUMN`** — kiểm ở T0 Step 5; không được thì chuyển sang trigger.
- **Tên hành động nhật ký** phải trùng danh sách Đợt 2 chốt (một chiều) — T0 Step 4.
- **Đợt 4 T2 đã lên `main` chưa** — cổng vào A-1b (T13 Step 1).
- Câu chốt dùng nhãn `TRANG_THAI_CUOI` có qua bài thứ tự lô không — T3 Step 3 (không qua → thêm mục đề xuất).
- Đợt 1 có thể đã thêm migration chạm trigger LC-15 (đổi thứ tự điểm khi xe chạy) — T0 Step 3 đọc trước khi dựng lại.

---

## Phụ lục B — Lệnh vẽ Claude Design (chép nguyên cho chủ)

> Vẽ cho app "Tour Đảo Booking" (PWA iPhone + máy tính 1040px), theo hệ thiết kế hiện có (token trong `public/app.css`, phông Be Vietnam Pro, tông hiện hành). Chữ tiếng Việt có dấu, không tên khách / số điện thoại trên mọi hộp đề nghị.
>
> **V8 — Tài xế: "Nhờ xe khác đón"** (màn chuyến của tài xế, iPhone): chạm một điểm đón chưa tới → nút "Nhờ xe khác đón" → danh sách xe cùng ngày (mỗi dòng: mã chuyến, tên tài xế, số chỗ trống, điểm sắp tới) → chọn → xem lại (điểm, số khách, nơi trả) → "Gửi". Sau gửi: thẻ "Đang chờ … nhận" có đồng hồ đếm ngược 10 phút và nút "Rút lại". Trạng thái: đã nhận / không nhận / hết hạn / chờ văn phòng duyệt.
> **V9 — Tài xế: "Đề nghị gửi tới tôi"**: thẻ nổi đầu màn: chuyến nguồn, tài xế A, điểm đón, số khách, nơi trả, "sau khi nhận: x/y chỗ", đếm ngược; hai nút "Nhận" / "Không nhận" (Không nhận mở chọn lý do). Sau Nhận: "Đã nhận — khách đã vào chuyến của bạn" hoặc "Chờ văn phòng duyệt".
> **V10 — Văn phòng: hộp đề nghị cần duyệt** (bảng điều phối, máy tính): danh sách đề nghị chờ duyệt; mở một đề nghị thấy bảng kết quả kiểm từng luật (đạt / không đạt / cảnh báo, giá trị so giới hạn); nếu chỉ luật cấu hình không đạt: nút "Duyệt" (bắt chọn lý do) và "Bác"; nếu luật lõi không đạt: chỉ "Bác" kèm lời giải thích.
> **V11 — Văn phòng: xe đang chạy**: trên chi tiết chuyến đang chạy, hai việc: "Thêm điểm đón / thêm khách" (chọn chặng chờ xếp, cảnh báo "cần Quản trị phá lệ" khi trong mốc) và trên từng khách đang chờ: "Báo huỷ" (chọn lý do; thẻ vẫn chiếm chỗ, nhãn "Văn phòng đã báo huỷ").
> **V6 (bổ sung)** — màn chuyến của tài xế: thẻ "Văn phòng vừa thêm điểm" / "Văn phòng đã báo huỷ — vẫn tới điểm"; nút "Bổ sung tên" trên suất chưa có tên (ô họ tên + năm sinh, 16px).
> **Cứu hộ** — tài xế: nút "Xe hỏng — chuyển khách" (chọn xe cứu hộ, nơi gặp); văn phòng: nút "Cứu hộ" trên chuyến đang chạy, cạnh đó bước "nhập giá thoả thuận" khi chọn xe nhà xe.
> **V4** — sơ đồ dòng dữ liệu cho chủ: phễu chặng → chuyến; hành trình một chặng (xếp → xuất bến → chuyển xe → trả); nhật ký "máy quyết theo luật nào".
> Mỗi màn: iPhone 390 và máy tính 1040; trạng thái trống, đang tải, lỗi (409 "người khác vừa đổi — tải lại").
