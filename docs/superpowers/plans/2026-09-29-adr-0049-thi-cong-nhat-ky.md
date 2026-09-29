# Nhật ký thi công ADR-0049 (Bảng điều phối chung, lượt duyệt 1) — nhánh song song từ `main`

- **Kế hoạch:** `docs/superpowers/plans/2026-09-29-adr-0049-thi-cong.md` (đỉnh tài liệu `386c786`; mục 0.1 ruling R-P1…R-P5).
- **Đề xuất sửa luật:** `docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md` (mục 4 chủ duyệt 29/9 — (a); mục 0–3, 5–8 chờ chủ lúc gộp). Nhánh này **không** đụng mục nào của tệp đó.
- **Nguồn chuẩn tắc:** `docs/adr/ADR-0049-bang-dieu-phoi-chung-luot-1.md` (accepted 29/9). Lời chủ: `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (ĐP2(i)–(v), ĐP3, ĐP6–8; Trả lời lần 6: Q1 = (a), Q2 = (a), Q3 = "Chỉ Quản trị, Toàn quyền"; lần 7: mục 4 = (a)).
- **Nhánh thi công:** `thi-cong-adr-0049-song-song` (worktree `.claude/worktrees/agent-a8f5e320df631069a`), tách từ `main` @ `ce831f8` (bản 1.36 đang chạy production); gộp nhánh tài liệu `worktree-agent-ac68c5ff0d389ca6c` @ `386c786` (fast-forward — chỉ tài liệu).
- **Phạm vi phiên (điều phối giao 29/9):** chỉ các task làm được từ `main`, song song với nền — **A0 (phần làm được trên main), A1, A2, A3, A4, A6, A7, A8** (lát 1.1 trừ A5; lát 1.3). **Không** A5 (cần nền ADR-0048), **không** A9 trở đi.
- **Vai:** người thi công (P15). **Không tự nghiệm thu** (N8) — điều phối gọi người kiểm độc lập.

## 1. Mốc ban đầu (Task A0 — phần làm được trên `main`)

| Bước | Kết quả (2026-09-29, đo trên `386c786` = `ce831f8` + tài liệu) |
|---|---|
| 1. ADR accepted | `sed -n 3p docs/adr/ADR-0049-…` → "**accepted**". |
| 2. Nền | `git log --oneline main -- migrations/0035_hanh_khach.sql migrations/0039_chu_xe_nha_xe.sql` → **rỗng**: hai nền ADR-0047, ADR-0048 CHƯA lên `main`. Theo kế hoạch mục 2.1: chỉ làm nhóm 1.1 (trừ A5) và 1.3 — khớp phạm vi điều phối giao. |
| 3. Dừng dây chuyền | `docs/quyen-hoan.json` → `phat_hien` = `[]`. |
| 4. Số migration | `ls migrations` → lớn nhất `0033_van_chuyen_xe.sql`. `git log --all --diff-filter=A --name-only -- migrations/` lọc `00(3[4-9]\|4[0-9])` → chỉ `0034_chang_dua_don` (ba95870), `0035_hanh_khach` (dd8dee4), `0037_tai_xe_doi_tac` (5543d9c), `0038_nha_xe_doi_tac` (706afa7), `0039_chu_xe_nha_xe` (2b1368d). `find .claude/worktrees -maxdepth 3 -path '*/migrations/*' -name '004[0-9]_*.sql'` → rỗng. **Không nhánh / worktree nào có số ≥ 0040** ⇒ `0041` (số đã giữ chỗ) dùng được. Khoảng trống 0034–0040 trên nhánh này là bình thường (nền chưa gộp). |
| 5. Chưa ai thêm trước | `grep -rn 'trip\.view\|trip\.dispatch\|vc_trip\|short_notice\|lichChungChang\|taiXeChoDieuPhoi\|vc_dispatch_policy\|mocToiThieu\|vc_reason\|vc_license_capacity\|vc_departure_rule' src migrations web scripts tests` → rỗng. |
| 6. Mốc test | `npm ci` thoát 0. `npm test` thoát **0**: **1313/1313** (0 đỏ, kể cả ca CPU `claude-guard`; `uptime`: tải 1.92 1.67 2.22). `npm run typecheck` thoát **0** (0 lỗi). Node v22.22.3. |
| 7. Mốc e2e | Không chạy ở A0 (điều phối giao: A0 = mốc test, typecheck, số route + R-P4). e2e chạy ở cuối cho phần route mới (A7) — xem mục 9. |
| 8. Soát số | Số route thật: `cat src/modules/*/index.ts \| grep -c 'route("'` → **109** (khớp `src/route-access.test.ts` 109; kế hoạch ghi 115 là con số SAU khi gộp hai nền). `BANG_STAFF` ở `src/tai-xe-cong.test.ts:45`; `DRIVER_ROW` ở `src/shared/permissions.test.ts:268`; `confirmOrder` ở `src/modules/orders/repository.ts:774` (kế hoạch trích `:914-932@6bb67c8` — trên nền 0047). `ALLOWED_EDGES["van-chuyen"]` = `["parties", "audit"]` (`src/architecture.test.ts:47`). Các số dòng này chỉ dùng cho task sau (A9+), không dùng ở phiên này. |
| 9–10. Bài vỡ vì mốc / mốc Chrome | Thuộc A10 / Phần B — ngoài phạm vi phiên. |
| 11. Mở nhật ký | Tệp này. |
| 12. R-P4 (i) | Mục 2.1 dưới. **Nhánh chọn: CÁCH 1** (một `CHECK` trên cột thêm sau cùng). |
| 13. R-P4 (ii) | Mục 2.2 dưới. **Nhánh chọn: HAI TỆP** (`repository.ts` + `chuyen-repo.ts`). |

## 2. Hai phép thử THẬT của R-P4

### 2.1 R-P4 (i) — `CHECK` nhiều cột khi `ADD COLUMN` (cho 0040 sau này)

- **Tệp nháp** (ngoài `migrations/`, đã xoá sau khi thử): `/tmp/adr49-rp4/nhap-0040.sql`. Bảng giả `thu_transfer_leg` chép **đúng** cột + `CHECK` của `ord_transfer_leg` (`migrations/0034_chang_dua_don.sql` @`7b0e2ae`), **bỏ `REFERENCES`** tới `orders`/`order_service`/`loc_location` (để thử độc lập với dữ liệu đơn — ghi rõ ở đây). Chèn một dòng CŨ (`cu-1`) **trước** khi `ADD COLUMN`. Rồi năm câu `ALTER TABLE … ADD COLUMN`; cột thêm sau cùng `short_notice_lead_minutes` mang `CHECK` tham chiếu bốn cột thêm trước:
  ```sql
  ALTER TABLE thu_transfer_leg ADD COLUMN short_notice_lead_minutes INTEGER CHECK (
    (short_notice_reason IS NULL AND short_notice_note IS NULL AND short_notice_by IS NULL AND short_notice_at IS NULL AND short_notice_lead_minutes IS NULL)
    OR (short_notice_reason IS NOT NULL AND short_notice_by IS NOT NULL AND short_notice_at IS NOT NULL AND short_notice_lead_minutes IS NOT NULL AND short_notice_lead_minutes BETWEEN 0 AND 2880)
  );
  ```
- **Ba ca, mỗi ca cả `INSERT` lẫn `UPDATE`** (đặt gấp thật là một `UPDATE` lên chặng có sẵn); mỗi ca `UPDATE` dùng một dòng cũ riêng để các ca không dính nhau:
  - (a) dòng cũ sau `ADD COLUMN` giữ nguyên, năm cột mới NULL;
  - (b) có lý do mà thiếu người / thiếu số phút / thiếu lúc; chỉ ghi chú mà không lý do → phải ABORT;
  - (c) đủ năm cột → được.
- **node:sqlite** (`node /tmp/adr49-rp4/thu-node.mjs <worktree>` — schema = mọi `migrations/*.sql` của nhánh + tệp nháp; SQLite 3.51.3):
  ```
  (a) dòng cũ sau ADD COLUMN: {"id":"cu-1","short_notice_reason":null,"short_notice_note":null,"short_notice_by":null,"short_notice_at":null,"short_notice_lead_minutes":null}
  (b) INSERT có lý do, thiếu người: ABORT — CHECK constraint failed: (short_notice_reason IS NULL AND …
  (b) UPDATE có lý do, thiếu người: ABORT — CHECK constraint failed: …
  (b) INSERT có lý do, thiếu số phút: ABORT — CHECK constraint failed: …
  (b) UPDATE có lý do, thiếu số phút: ABORT — CHECK constraint failed: …
  (b) UPDATE có lý do, thiếu lúc: ABORT — CHECK constraint failed: …
  (b) UPDATE chỉ ghi chú, không lý do: ABORT — CHECK constraint failed: …
  (c) INSERT đủ năm cột: ĐƯỢC
  (c) UPDATE đủ năm cột: ĐƯỢC
  ```
- **D1 local tạm** (`ps aux | grep -i wrangler` rỗng trước khi chạy; không `--remote`):
  ```
  CI=1 npx wrangler d1 migrations apply tourdao-sales-db --local --persist-to /tmp/adr49-rp4/d1tam   → 0001…0033 ✅
  CI=1 npx wrangler d1 execute tourdao-sales-db --local --persist-to /tmp/adr49-rp4/d1tam --file /tmp/adr49-rp4/nhap-0040.sql   → success
  --command "SELECT … FROM thu_transfer_leg"   → (a) cu-1: năm cột null
  --command "INSERT … ('b-ins', …, 'KHACH_DAT_SAT_GIO', <lúc>, 360)"        → {"error":{"text":"CHECK constraint failed: (short_notice_reason IS NULL AND …
  --command "UPDATE … SET reason, at, lead_minutes WHERE id = 'u-b1'"        → CHECK constraint failed
  --command "UPDATE … SET reason, by, at WHERE id = 'u-b2'" (thiếu số phút)  → CHECK constraint failed
  --command "UPDATE … SET reason, by, lead_minutes WHERE id = 'u-b3'" (thiếu lúc) → CHECK constraint failed
  --command "INSERT … ('b-ins2', reason, by, at)" (thiếu số phút)            → CHECK constraint failed
  --command "UPDATE … SET short_notice_note = 'khách gọi muộn' WHERE id = 'u-b4'" → CHECK constraint failed
  --command "INSERT … ('c-ins', đủ năm cột)"                                → success
  --command "UPDATE … đủ năm cột WHERE id = 'u-c'"                          → success
  --command "SELECT … WHERE short_notice_reason IS NOT NULL …"               → chỉ c-ins, u-c (360)
  ```
  (`SELECT sqlite_version()` bị D1 local từ chối: "not authorized to use function: sqlite_version" — không đo được số phiên bản SQLite của D1.)
- **Bẫy thấy được khi thử (ghi cho A9):** bản nháp lần 1 viết vế sau là `… AND short_notice_lead_minutes BETWEEN 0 AND 2880` (thiếu `IS NOT NULL`). Trên node:sqlite, "có lý do, thiếu số phút" **LỌT** (`ĐƯỢC` cả INSERT lẫn UPDATE): `NULL BETWEEN …` = NULL ⇒ `CHECK` nhận NULL là "không sai" ⇒ cho qua. Sửa bằng `short_notice_lead_minutes IS NOT NULL AND …`. A9 phải có ca "có lý do, thiếu số phút → ABORT" cho CẢ `INSERT` và `UPDATE`.
- **Kết luận: CHỌN CÁCH 1** — cả node:sqlite và D1 local đều nhận cú pháp và đều chặn đúng ba ca. Dọn: đã xoá `/tmp/adr49-rp4/d1tam`; tệp nháp và kịch bản thử xoá cuối phiên.

### 2.2 R-P4 (ii) — bài kiến trúc có nhận hai tệp SQL cho một module `STRICT` không

- Bản sao cục bộ, **không commit**: thêm tạm `{ module: "van-chuyen", file: "modules/van-chuyen/chuyen-repo.ts" }` vào `STRICT` (`src/architecture.test.ts:51-62`); tạo tạm `src/modules/van-chuyen/chuyen-repo.ts` có một câu `defineSql("van-chuyen", "thu_chuyen", "SELECT id FROM vc_vehicle")`.
- `node --test src/architecture.test.ts` → thoát **0**, **25/25** (bài EXPLAIN, bài "mọi tệp trong thư mục module nghiêm", bài chuỗi thô đều xanh với hai mục cùng module).
- **Phép thử ngược** (câu tạm đặt trong CHÍNH `chuyen-repo.ts`, không phải `repository.ts`): `ord_transfer_leg` chưa có trên `main` (nền 0047 chưa gộp), nên đọc thẳng một bảng khác module CÓ THẬT trên `main`: `defineSql("van-chuyen", "thu_nguoc", "SELECT id, pickup_time FROM order_service")` → thoát **1**, 24/25, dòng đỏ nguyên văn:
  ```
  not ok 12 - ADR-0002 điều 8(b): SQL đã đăng ký của module nghiêm chỉ chạm bảng của mình / view công bố / khoá ngoại được phép
  'van-chuyen.thu_nguoc: đọc TRỰC TIẾP bảng order_service của module orders (chỉ được đọc qua view công bố v_*)'
  ```
  ⇒ tệp thứ hai **thật sự bị soi**.
- Hoàn nguyên: xoá `chuyen-repo.ts`, `git checkout -- src/architecture.test.ts`; `git status --short` → sạch.
- **Kết luận: DÙNG HAI TỆP** (`repository.ts` + `chuyen-repo.ts`) như kế hoạch mục 1.1 / mục 5 — không phải gộp một tệp. (Việc thêm `chuyen-repo.ts` vào `STRICT` là của A12, không làm ở phiên này.)

## 3. Bảng từng task

| Task | Việc | Commit | Kết quả |
|---|---|---|---|
| A0 | mốc, R-P4 (i)(ii), mở nhật ký | `6e4615f` | xong |
| A1 | `migrations/0041_chinh_sach_dieu_phoi.sql` (bốn bảng, gieo, 7 trigger) + `src/migrations-chinh-sach-dieu-phoi.test.ts` (9 bài) + sổ dữ liệu (`vc_reason` = `lookup`) + `npm run dict` | `b7d6216` | Đỏ trước: 9/9 đỏ — `phải có đúng một tệp *_chinh_sach_dieu_phoi.sql, thấy: []`, `no such table: vc_dispatch_policy`, `no such table: vc_license_capacity`. Xanh: 9/9; `node --test src/migrations-chinh-sach-dieu-phoi.test.ts src/architecture.test.ts` 34/34; `npm test` thoát 0, **1322/1322** (không bài nào đòi số migration liền mạch — khoảng trống 0034–0040 không làm đỏ gì). D1 local tạm (`--persist-to`, không `--remote`): `d1 migrations apply` → `0041_chinh_sach_dieu_phoi.sql ✅`; đếm gieo 1 / 8 / 13 / 0; `UPDATE vc_dispatch_policy` → `vc_policy_append_only: …: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_TRIGGER)`; chèn `require_contract = 1` → `CHECK constraint failed: require_contract = 0: SQLITE_CONSTRAINT (extended: SQLITE_CONSTRAINT_CHECK)`. |
| A2 | `src/shared/dieu-phoi-kieu.ts` (hằng `NHOM_LY_DO`, `LOAI_SU_KIEN_CHUYEN`, `MA_LUAT_PHA_LE`, tập đóng bốn máy trạng thái, kiểu vào/ra của luật thuần) + **`src/shared/ly-do-giu.ts`** (kiểu `LyDoGiu`, bộ mã đóng `MA_GIU`, `lyDoGiu()`) + hai tệp test (9 bài) | (commit A2) | Đỏ trước: `ERR_MODULE_NOT_FOUND … dieu-phoi-kieu.ts`. Xanh 9/9; `tsc --noEmit` thoát 0. `ly-do-giu.ts` dựng ở A2 (kế hoạch xếp ở A4) vì kiểu ra của A2 (`KetQuaKiem`, `KetQuaXuatBen`) cần `LyDoGiu`; không đổi nội dung A4. |

## 4. P16 — hàng rào mới (sửa cố ý → đỏ → hoàn nguyên)

Mọi phép sửa cố ý làm trên bản sao cục bộ, hoàn nguyên bằng bản lưu, rồi chạy lại xanh (`git status` không còn thay đổi ngoài ý muốn).

| Hàng rào | Sửa cố ý | Dòng đỏ nguyên văn | Ngày |
|---|---|---|---|
| `vc_dispatch_policy_no_update` (0041) | xoá trigger | `not ok 3 - (b) TC-1 chính sách điều phối CHỈ THÊM …` / `error: 'Missing expected exception.'` | 2026-09-29 |
| `CHECK (require_contract = 0)` (0041, ĐP7) | bỏ `CHECK` | `not ok 3 - (b) TC-1 chính sách điều phối CHỈ THÊM …` / `error: 'Missing expected exception.'` | 2026-09-29 |
| gieo bảng hạng bằng (0041) | gieo `D2` thành 30 | `not ok 2 - (c) dữ liệu gieo …` và `not ok 5 - (b) TC-1 bảng hạng bằng CHỈ THÊM …` | 2026-09-29 |
| `vc_departure_rule_close_once` (0041) | bỏ các vế "không đổi cột nội dung" | `not ok 7 - (b) TC-1 điều kiện xuất bến …` / `error: 'Missing expected exception: đóng kèm đổi cỡ xe'` | 2026-09-29 |
| `vc_reason_identity` (0041, siết thêm) | xoá trigger | `not ok 8 - (b) TC-1 danh mục lý do …` / `error: 'Missing expected exception: đổi nhóm'` | 2026-09-29 |
| `ly-do-giu.test.ts` — "ai xử lý đúng vai" | `GPLX_HET_HAN.aiXuLy` → `VAN_PHONG` | `not ok 2 - ai xử lý đúng vai …` / `expected: 'QUAN_TRI'` `actual: 'VAN_PHONG'` | 2026-09-29 |
| `dieu-phoi-kieu.test.ts` — nhóm lý do + đối chiếu gieo 0041 | bỏ `BO_QUA_DIEM` khỏi `NHOM_LY_DO` | `not ok 1 - NHOM_LY_DO: đúng bảy nhóm …`; `not ok 2 - mọi mã lý do gieo …` / `error: 'BO_QUA_KHONG_CON_KHACH: nhóm lạ BO_QUA_DIEM'` | 2026-09-29 |

## 5. Giả định (P8 — bề mặt, đảo ngược được)

- **GA-1 (A1) — siết thêm ngoài kế hoạch:** `vc_reason_identity` (không đổi mã, nhóm, mốc tạo của lý do) — khuôn `vc_vehicle_document_identity` (0033). Lý do: máy rẽ nhánh theo NHÓM; đổi nhóm của một mã đã được sự kiện trỏ tới sẽ đổi nghĩa quá khứ. `vc_departure_rule_close_once` cũng chặn đổi mọi cột nội dung (không chỉ "đóng lần hai"). Cả hai là SIẾT; bỏ được bằng migration mới nếu điều phối không muốn.
- **GA-2 (A1):** `vc_departure_rule` thêm `CHECK (valid_to_at IS NOT NULL OR closed_by IS NULL)` và `CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at)`; `closed_by` được NULL khi đã đóng (NULL = hệ thống, như cột WHO). `vc_reason.reason_group` có `CHECK` KHUÔN (chữ HOA, 2–40 ký tự) — không phải liệt kê giá trị (Phần II "Luật dữ liệu" chỉ cấm `CHECK` liệt kê).
- **GA-3 (A1):** nhãn lý do gieo (G4): "Sự cố vận hành", "Đơn đặt gấp", "Gộp vào chuyến khác", "Không còn khách", "Xe hỏng", "Tai nạn", "Xe tới sớm hơn giờ hẹn", "Không còn khách ở điểm", mỗi nhóm một "Khác" (thứ tự 99). Quản trị đổi được trong app.

## 6. Nợ (không chặn)

## 7. Sự cố

## 8. Câu hỏi cho điều phối (không tự quyết)

## 9. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)
