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
- **Kết luận: CHỌN CÁCH 1** — cả node:sqlite và D1 local đều nhận cú pháp và đều chặn đúng ba ca. Dọn: đã xoá `/tmp/adr49-rp4/d1tam`, rồi cả thư mục `/tmp/adr49-rp4` (tệp nháp, kịch bản thử, log) cuối phiên.

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
| A3 | `src/shared/moc-toi-thieu.ts` (`nguongMocVn`, `kiemMocDat`, `kiemMocXep`, `LENH_XEP`, `LENH_KHOA_THEO_MOC`, `mucMoc`) + `src/shared/vn-date.ts` (`vnLocalToMs` CHÉP NGUYÊN VĂN từ nhánh ADR-0047 @`7b0e2ae` — `diff` với bản 0047 → giống hệt; `msToVnLocal` đặt CUỐI tệp) + `src/shared/moc-toi-thieu.test.ts` (7 bài) + `src/shared/vn-date-mili-giay.test.ts` (3 bài — tệp riêng, xem GA-4) | `bb4b88b` | Đỏ trước: `The requested module './vn-date.ts' does not provide an export named 'msToVnLocal'`; `moc-toi-thieu.ts` chưa có. Xanh 20/20 (kể cả `vn-date.test.ts` cũ). Bài tương đương chuỗi ↔ luật: > 10 000 ca, bây giờ có giây lẻ, giờ đón 00:00–07:00 VN, qua nửa đêm. `git merge-tree --write-tree --name-only HEAD worktree-agent-aa4ba1b121f98db87` → chỉ in OID cây (`835f1be…`) — **gộp sạch** với nhánh ADR-0047 (bản sao `vnLocalToMs` giống hệt không va). |
| A4 | `src/shared/dieu-phoi-kiem.ts` (`kiemTaoSuaChuyen`, `kiemXep`, `kiemXuatBen`, `kiemKetThuc`, `trongNgayChay`, `kiemLai`, `khongCheo`, `conHanToiHet`), `src/shared/dieu-phoi-trang-thai.ts` (`trangThaiChang`), `src/shared/dieu-phoi-lich-chung.ts` (`dungLichChung`) + ba tệp test (19 + 4 + 5 bài) | `dda314a` | Đỏ trước: `ERR_MODULE_NOT_FOUND … dieu-phoi-kiem.ts`, `… dieu-phoi-lich-chung.ts`; riêng `dieu-phoi-trang-thai` viết test + mã cùng một bước → chứng minh đỏ bằng cách dời tệp mã đi (`ERR_MODULE_NOT_FOUND … dieu-phoi-trang-thai.ts`) rồi trả lại, và bằng P16 (mục 4). Xanh 28/28. `npm test` thoát 0, **1369/1369**; `tsc --noEmit` thoát 0. |
| A6 | `src/modules/van-chuyen/index.ts` hàm công bố **`mocToiThieuHienHanh(db) → MocToiThieu \| null`** (kiểu `MocToiThieu` ở `src/shared/moc-toi-thieu.ts` để `router.ts` dùng ở A10); SQL `defineSql` bốn nhóm bảng mới thêm ở CUỐI `repository.ts`; luật thuần `src/modules/van-chuyen/chinh-sach.ts` (`kiemChinhSachMoi`, `kiemDieuKienMoi`, `kiemHangBangMoi`, `kiemLyDoMoi`, `kiemSuaLyDo`, `chiTiet*`) + `chinh-sach.test.ts` (4 bài; TC-4 chạy MÃ THẬT của `index.ts` gói bằng esbuild như `route-access.test.ts`) | `33590b3` | Đỏ trước: `ERR_MODULE_NOT_FOUND … chinh-sach.ts`. Xanh 4/4; `npm test` thoát 0, **1373/1373**; `tsc --noEmit` thoát 0. |
| A7 | 10 route (mục 1.7 route 9–18) trong `src/modules/van-chuyen/index.ts` (chèn GIỮA mảng route, trước khối "Danh mục loại giấy tờ xe" — chỗ nhánh ADR-0048 không sửa); 6 hành động nhật ký mới + nhóm mới **`trip` "Điều phối xe"** (`src/shared/audit-actions.ts`); DTO cuối `src/shared/contracts.ts`; `src/route-access.test.ts` 109 → **119**; `src/modules/van-chuyen/chinh-sach-route.test.ts` (8 bài, harness); e2e mới `tests/e2e/chinh-sach-dieu-phoi.mjs` (+ `run.mjs` ALL, `README.md`) | `5267ad1` | Đỏ trước: 8/8 đỏ — `expected: 403` `actual: 404` (route chưa có). Sau khi viết: 6/8 xanh, 2 đỏ do CHÍNH bài thử (so `deepEqual` với đối tượng `null prototype` của `w.q`) → sửa bài (bọc `{ ...x }`), không sửa mã → 8/8. `npm test` lần đầu thoát 1: `not ok 894 - mức truy cập của 109 route …` (đúng mong đợi) → cập nhật SNAPSHOT + số 119 → thoát 0, **1381/1381**; `npm run typecheck` thoát 0. e2e `npm run test:e2e -- chinh-sach-dieu-phoi van-chuyen` thoát **0** ("E2E: 3/3 kịch bản xanh"): khoá ngoại hạng bằng / loại giấy tờ của người do D1 THẬT giữ → 400; lớp CSDL chặn sửa / xoá chính sách, hợp đồng = 1, sửa hạng bằng, đóng điều kiện lần hai, xoá / đổi nhóm lý do; `finally` khôi phục 360/120/30/có, D2 = 29, đóng điều kiện đã thêm (kiểm lại sau khôi phục). |
| A8 | `golden/dieu-phoi/xe-a-b-luot-1.json` (16 bước: tạo CX-3009-07 / CX-3009-04 (hạng D1 chặn, D2 qua) / xe nhà xe + tài xế công ty (chéo), xếp 3 chặng 12/15, xếp thêm vượt chỗ, giữ thiếu tên, nhập tên → đạt + gắn 7 tên, mốc 6 giờ (chặng thường cần phá lệ, chặng đặt gấp qua), vắng, đón muộn, xe hỏng → gợi ý gián đoạn, phần chưa đi về "Chưa xếp" + quá mốc, tạo chuyến cứu hộ trong mốc qua (Q2 = (a)), xếp vào cứu hộ cần phá lệ) + `src/dieu-phoi-ca-mau.test.ts` (18 bài) + dòng `golden/README.md` | `eecc5d0` | Đáp án tính TAY theo luật trước khi chạy; bản nháp đầu ghi B07 "gắn 2 tên" — tính lại theo I19b (tên của đơn đã dùng hết) → 0, sửa TRƯỚC khi chạy lần đầu (không sửa theo mã). Chạy lần đầu 18/18. Đầu tệp test ghi "ĐÁP ÁN CHỜ CHỦ XÁC NHẬN"; `xac_nhan.trang_thai = "cho_xac_nhan"`. |
| Sổ | `docs/SO-HANG-RAO.md` — chín dòng hàng rào mới (mỗi dòng có ngày + dòng đỏ thấy thật, ghi "CHƯA gộp") | `55cb5ff` | `npm test` thoát 0, 1399/1399 |

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
| `moc-toi-thieu.test.ts` — ranh giới 359/360 | `<` → `<=` trong `kiemMocDat` | `not ok 2 - TC-16 kiemMocDat ranh giới ĐÚNG mốc …`; `not ok 4 - MỘT luật, hai cách nói …` | 2026-09-29 |
| `moc-toi-thieu.test.ts` — bài tương đương chuỗi ↔ luật | `Math.ceil` → `Math.floor` trong `nguongMocVn` | `not ok 1 - nguongMocVn: … làm tròn LÊN phút …`; `not ok 4 - MỘT luật, hai cách nói …` | 2026-09-29 |
| `moc-toi-thieu.test.ts` — TC-42 (Q2 = (a)) phần luật thuần | (a) bỏ ngoại lệ `TAO`; (b) bỏ điều kiện `datGap` | (a) `not ok 6 - TC-42 (Q2 = (a)) kiemMocXep: TẠO chuyến trong mốc không cần phá lệ …`; (b) cùng dòng `not ok 6` | 2026-09-29 |
| `dieu-phoi-kiem.test.ts` — sàn cứng "hạng đủ chở" (kế hoạch A4 bước 3a) | `kiemLai` bỏ so `maxPassengers >= soCho` | `not ok 2 - TC-17 LC-12 lúc gán tài xế: hạng B với xe 15 chỗ …`; `not ok 14 - TC-17 kiemXuatBen: mỗi ca giữ ra đúng mã …` | 2026-09-29 |
| `dieu-phoi-kiem.test.ts` — `trongNgayChay` (A4 bước 3b) | trả `true` luôn | `not ok 19 - TC-18 trongNgayChay: … ngày mai → không …` | 2026-09-29 |
| `dieu-phoi-kiem.test.ts` / `dieu-phoi-lich-chung.test.ts` — giữ "thiếu tên" | bỏ điều kiện `requireManifest && thieu > 0` | `not ok 14 - TC-17 kiemXuatBen …`; `not ok 17 - kiemXuatBen: câu lý do …`; `not ok 21 - MQ-05 giữ: thiếu tên, chưa có tài xế …` | 2026-09-29 |
| `dieu-phoi-trang-thai.test.ts` — trạng thái "chờ đón" | bỏ nhánh `CHO_DON` | `not ok 1 - TC-16 mỗi trạng thái của [TK] §2.5 …`; `not ok 4 - xếp một phần …` | 2026-09-29 |
| `chinh-sach.test.ts` — TC-4 (dòng tương lai chưa hiệu lực) | câu `current_dispatch_policy` bỏ vế `valid_from_at <= ?1` | `not ok 1 - TC-4 mocToiThieuHienHanh: … dòng TƯƠNG LAI chưa có hiệu lực …` | 2026-09-29 |
| `chinh-sach.test.ts` — hợp đồng chỉ nhận false | bỏ kiểm `requireContract` trong `kiemChinhSachMoi` | `not ok 2 - kiemChinhSachMoi: … hợp đồng chỉ nhận false …` | 2026-09-29 |
| Hàng rào 2 (1b) + TC-2 cho route `POST /api/van-chuyen/chinh-sach-dieu-phoi` (kế hoạch A7 bước 4) | bỏ `if (!can(staff, "settings.ops"))` đầu thân | `not ok 9 - hàng rào 2: mọi đường ghi (access ≠ public) hỏi bảng quyền …` / `'POST /api/van-chuyen/chinh-sach-dieu-phoi (van-chuyen, access "office")'`; `not ok 1 - TC-2 quyền route 9–15 …` (Quản trị nhận 201) | 2026-09-29 |
| Hàng rào cổng quản trị (luật 4) cho `GET /api/van-chuyen/ly-do` | đổi thành biến trung gian `const duoc = can(staff, "admin.manage"); if (!duoc) return …` | `not ok 7 - hàng rào cổng quản trị (ADR-0019): …` / `'GET /api/van-chuyen/ly-do (van-chuyen)'` | 2026-09-29 |
| `dieu-phoi-ca-mau.test.ts` — đáp án bộ ca mẫu | (a) B07 `so_gan_ten` 0 → 2; (b) đáp án `CAN_PHA_LE` → `CHO_QUA` | (a) `not ok 9 - ca mẫu xe-a-b-luot-1.json / B07-GIU-THIEU-TEN …`; (b) `not ok 11 - … / B09-MOC-XEP-CHANG-THUONG …`, `not ok 18 - … / B16-XEP-VAO-CUU-HO-CAN-PHA-LE …` | 2026-09-29 |

## 5. Giả định (P8 — bề mặt, đảo ngược được)

> **Hai nhóm giả định.** (A) BỀ MẶT, đảo ngược được: GA-2 (một phần — `CHECK` khuôn), GA-3, GA-4, GA-6, GA-7 (nhãn / "ai xử lý"), GA-11 (cách hiển thị), GA-15, GA-16, GA-17, GA-18. (B) **CHẶT HƠN CHỮ KẾ HOẠCH — chạm bất biến dữ liệu hoặc logic, điều phối / người kiểm độc lập CHẤP NHẬN trước khi gộp** (sau khi 0041 áp remote, gỡ trigger phải bằng migration mới): **GA-1** (`vc_reason_identity`; khoá nội dung trong `vc_departure_rule_close_once`), **GA-5** (mốc 0 = tắt hẳn, kể cả giờ đã qua), **GA-8** (xe ngừng dùng chặn ngay lúc lên kế hoạch), **GA-9** (công thức "thiếu tên" có thêm vế "suất chưa tên trên chuyến này − tên còn rảnh" — lệch chữ I12 "tính từ số tên trên đơn, không từ suất"; vế thêm chỉ THÊM giữ, không bao giờ bỏ giữ; lý do: tránh cho xuất bến mà lô gắn tên I19b không gắn đủ được), **GA-10** (chặng không có dữ liệu → giữ `CHANG_DA_DONG`), **GA-12** (mốc khi sửa xét theo giờ sớm hơn của cũ / mới), **GA-13** (thêm trạng thái chặng `DA_BO`), **GA-14** (mã lạ trỏ danh mục parties chặn bằng khoá ngoại — chọn thay cho "kiểm trước" vì TC-3 chỉ cho parties xuất đúng một hàm mới; e2e thấy D1 thật trả 400).

- **GA-1 (A1) — siết thêm ngoài kế hoạch:** `vc_reason_identity` (không đổi mã, nhóm, mốc tạo của lý do) — khuôn `vc_vehicle_document_identity` (0033). Lý do: máy rẽ nhánh theo NHÓM; đổi nhóm của một mã đã được sự kiện trỏ tới sẽ đổi nghĩa quá khứ. `vc_departure_rule_close_once` cũng chặn đổi mọi cột nội dung (không chỉ "đóng lần hai"). Cả hai là SIẾT; bỏ được bằng migration mới nếu điều phối không muốn.
- **GA-2 (A1):** `vc_departure_rule` thêm `CHECK (valid_to_at IS NOT NULL OR closed_by IS NULL)` và `CHECK (valid_to_at IS NULL OR valid_to_at >= valid_from_at)`; `closed_by` được NULL khi đã đóng (NULL = hệ thống, như cột WHO). `vc_reason.reason_group` có `CHECK` KHUÔN (chữ HOA, 2–40 ký tự) — không phải liệt kê giá trị (Phần II "Luật dữ liệu" chỉ cấm `CHECK` liệt kê).
- **GA-3 (A1):** nhãn lý do gieo (G4): "Sự cố vận hành", "Đơn đặt gấp", "Gộp vào chuyến khác", "Không còn khách", "Xe hỏng", "Tai nạn", "Xe tới sớm hơn giờ hẹn", "Không còn khách ở điểm", mỗi nhóm một "Khác" (thứ tự 99). Quản trị đổi được trong app.

- **GA-4 (A3):** bài `msToVnLocal` / `vnLocalToMs` đặt ở tệp MỚI `src/shared/vn-date-mili-giay.test.ts` thay vì thêm vào `src/shared/vn-date.test.ts` như kế hoạch A3 bước 1 — vì nhánh ADR-0047 sửa đúng dòng `import` đầu `vn-date.test.ts`; tệp riêng thì gộp không va. Nội dung ca đúng TC-18.
- **GA-5 (A3):** mốc 0 = TẮT hẳn (G2): `nguongMocVn` trả `null` (câu SQL so với NULL không bao giờ đúng ⇒ không chặn), `kiemMocDat` trả `TAT_MOC` kể cả giờ đã qua, `kiemMocXep` không khoá gì. Lý do: G2 ghi "khung thử dùng 0 cho các bài cũ cần xác nhận đơn cùng ngày" — nếu mốc 0 vẫn chặn giờ đã qua thì bài cũ đón "hôm nay" lúc sáng vẫn đỏ khi chạy buổi chiều.
- **GA-6 (A3):** `LENH_XEP` tách `DOI_DI` (dời suất RA khỏi chuyến) / `DOI_DEN` (dời VÀO); `HUY_CO_KHACH` / `HUY_KHONG_KHACH` (kế hoạch route 8: "+ `trip.override` khi còn khách và trong mốc"). Cờ đặt gấp chỉ miễn cho `XEP` / `DOI_DEN` (ĐP2(ii) "xếp CHÍNH chặng đã đặt gấp").
- **GA-7 (A4):** `ly-do-giu.ts` dựng ở A2 (xem bảng task). Bộ mã `MA_GIU` 31 mã; "ai xử lý": giấy tờ (GPLX thiếu / thiếu hạng / hết hạn, giấy tờ theo điều kiện) → Quản trị; chính sách rỗng, không dòng hạng bằng, hợp đồng → Toàn quyền; xếp, tên, chặng, xe, tài xế, **hạng bằng không đủ** (gỡ bằng đổi tài xế / xe) → văn phòng; mốc, khoảng nghỉ, nghỉ thiếu lúc xuất bến → Quản trị (chỉ Quản trị, Toàn quyền phá lệ — ĐP3).
- **GA-8 (A4):** xe **bảo dưỡng** được lên kế hoạch (`kiemTaoSuaChuyen` không chặn; chỉ GIỮ lúc xuất bến — [TK] §5.9, kế hoạch mục 4 điểm 17); xe **ngừng dùng** bị chặn ngay.
- **GA-9 (A4):** "thiếu tên" = max(số người − số tên của đơn, số suất chưa tên trên CHUYẾN NÀY − số khoá người của đơn chưa có suất mở nào ở chặng) (I12 + khả năng gắn tên lúc xuất bến I19b). `kiemXuatBen` trả luôn danh sách `ganTen` (suất chưa tên ← khoá người rảnh, theo thứ tự khoá / mã suất) — lô xuất bến A15 dùng đúng danh sách này (một luật). Không bắt đủ danh sách thì vẫn gắn được bao nhiêu gắn bấy nhiêu, không giữ.
- **GA-10 (A4):** suất mở trỏ chặng KHÔNG có trong dữ liệu vào → giữ `CHANG_DA_DONG` (không đoán). Route A13/A15 phải nạp đủ cờ của MỌI chặng mà suất mở trỏ tới (qua view `v_ord_leg_key` / `v_ord_order_flag`), không chỉ chặng `lichChungChang` trả.
- **GA-11 (A4):** `dungLichChung` dự phóng giữ theo "xuất bến đúng giờ" (mốc = max(bây giờ, giờ bắt đầu)); tại lúc bấm xuất bến route gọi `kiemXuatBen` với bây giờ thật. "Giờ hẹn đổi sau khi xếp" (MQ-04) lượt 1 nhận ra bằng "giờ hẹn nằm ngoài khung giờ chuyến chưa chạy" (luật thuần không có lịch sử sự kiện).
- **GA-12 (A4):** `kiemTaoSuaChuyen` xét mốc khi SỬA đổi xe / đổi tài xế theo giờ SỚM HƠN của cũ / mới (không lách mốc bằng cách dời giờ trong CÙNG lệnh) — xem câu hỏi Q-A4-1 cho trường hợp dời giờ bằng lệnh RIÊNG.
- **GA-13 (A4):** trạng thái chặng thêm `DA_BO` (đơn huỷ / chặng đã bỏ, không còn khách trên xe) ngoài sơ đồ [TK] §2.5 — để hàm luôn trả một trạng thái; lịch chung bình thường không trả chặng loại này.

- **GA-14 (A6/A7):** mã lạ trỏ danh mục của PARTIES (hạng bằng, loại giấy tờ của người) được chặn bằng KHOÁ NGOẠI của CSDL (lỗi `FOREIGN KEY constraint failed` → 400; cả lô huỷ, không nhật ký), KHÔNG bằng một hàm đọc mới của parties — vì A5 khoá "parties xuất ĐÚNG MỘT hàm mới (`taiXeChoDieuPhoi`)" (TC-3). Loại giấy tờ XE (danh mục của chính van-chuyen) kiểm trước bằng `findVehicleDocumentType`. D1 thật giữ khoá ngoại (e2e thấy 400).
- **GA-15 (A7):** thân chính sách phải đủ bốn giá trị (thay cả bản); khoá kiểu ngày hiệu lực (`valid*`, `effective*`, `hieuLuc*`, `tuNgay*`) → 400; khoá lạ khác bị bỏ qua (như các route khác). `requireContract` chỉ nhận `false` hoặc vắng.
- **GA-16 (A7):** nhóm nhật ký mới `trip` nhãn **"Điều phối xe"** — sáu hành động chính sách / lý do không có `order_id`, không `target` (khuôn `expiry_policy_changed`); `trip_*` của A13 vào cùng nhóm. Đây là thay đổi NHÌN THẤY ĐƯỢC ở bộ lọc trang Nhật ký (`web/audit.ts` đọc `AUDIT_GROUPS`) — không sửa tệp web nào; đã chạy `npm run build:web` (mục 9). Chưa chạy kịch bản Chrome trang Nhật ký (xem mục "Chưa làm").
- **GA-17 (A7):** `GET` của chính sách / điều kiện / hạng bằng cũng chỉ Toàn quyền (ô `settings.ops`, kế hoạch mục 1.7). Câu từ chối: "Chỉ người phụ trách hệ thống xem và đổi được chính sách điều phối xe." Đóng điều kiện đã đóng → 409 `rule_closed`; id lạ → 404.
- **GA-18 (A7):** route mới đặt GIỮA mảng route; khối import mới đặt SAU khối import cũ; hàm phụ đặt sau các hằng lỗi — để khỏi va các khúc nhánh ADR-0048 sửa (`git merge-tree` ở mục 9).

## 6. Nợ (không chặn)

- **N-1:** kịch bản Chrome trang Nhật ký (`dot-a-smoke.mjs`, bảng `web/CLAUDE.md` dòng `web/audit.ts`) CHƯA chạy lại sau khi thêm nhóm nhật ký `trip` "Điều phối xe" (GA-16) — `web/audit.ts` dựng bộ lọc từ `AUDIT_GROUPS` nên sẽ có thêm một mục lọc. Không sửa tệp web nào; `npm run build:web` thoát 0.
- ~~**N-2:** tài liệu mô tả `docs/SYSTEM-DESIGN.md` và `docs/CHANGE-GUIDE.md` chưa cập nhật~~ — **ĐÃ LÀM 2026-09-29** theo lệnh điều phối (sau kiểm độc lập giữa chừng): `SYSTEM-DESIGN.md` §5 (bốn bảng 0041, dòng bất biến 0041, dòng migration 0041), §7 (109 → 119 route, mười dòng route mới, câu "route van-chuyen hỏi ô nào" tách `vehicle.manage` / `settings.ops` / `admin.manage`), §8 (dòng `admin.manage`, `settings.ops`, `vehicle.manage`), §9 (sáu tệp thuần mới, `vn-date.ts`, nhóm nhật ký `trip` "Điều phối xe" ở `audit-actions.ts`), §14, §15 (ba thuật ngữ), §17 K10; `CHANGE-GUIDE.md` §1 (dòng tra nhanh), công thức f điểm 4 (nhóm `trip`, nhắc Chrome `dot-a-smoke`), công thức MỚI **z2** (tên `z2` để khỏi va công thức `z` của nhánh ADR-0047), §3 (dòng ma trận), §4 bẫy **51** (NULL trong `CHECK` — bẫy R-P4 (i); bảng chỉ-thêm + e2e dùng chung; hạn theo ngày VN; `w.q` null prototype — số 50 để cho hai nhánh nền). Chỉ tài liệu, không chạy wrangler / e2e / Chrome.
- **N-3:** gộp với hai nền — `git merge-tree` (mục 9): va 3 tệp với ADR-0047 (`docs/SO-HANG-RAO.md`, `src/route-access.test.ts`, `tests/e2e/run.mjs`) và 4 tệp với ADR-0048 (thêm `tests/e2e/README.md`) — đều là chỗ hai bên cùng THÊM dòng (giải = giữ cả hai). `src/modules/van-chuyen/{index,repository}.ts`, `src/shared/{contracts,audit-actions,vn-date}.ts`, `docs/data-dictionary.json` gộp SẠCH. Sau gộp: `route-access` = 119 + 5 + 1 = **125**; chú thích của bài đã ghi sẵn con số này.
- **N-4 (bàn giao A10):** câu SQL xác nhận phải dùng ĐÚNG `nguongMocVn` (tham số chuỗi; `null` khi mốc tắt ⇒ không chặn — GA-5) — không tính lại ngưỡng ở `orders`. `ctx.mocToiThieu` trả `null` (bảng rỗng) ⇒ 503 `moc_toi_thieu_chua_co` (I25). Kiểu `MocToiThieu` đã ở `src/shared/moc-toi-thieu.ts`; hàm công bố `mocToiThieuHienHanh` đã ở `src/modules/van-chuyen/index.ts`.
- **N-5 (bàn giao A13/A15):** route phải nạp cờ đơn / chặng của MỌI chặng mà suất mở trỏ tới (GA-10), gọi `kiemXuatBen` với bây giờ THẬT lúc bấm xuất bến và dùng đúng danh sách `ganTen` + `chup` nó trả (GA-9); `dungLichChung` cho `GET /lich`. Câu hỏi Q-A4-1 cần trả lời trước khi viết route 4.
- **N-6:** e2e đủ bộ lần đầu có 2 kịch bản đỏ do Google Sheet (mục 7) — chạy lại riêng thì xanh; tần suất chập chờn chưa đo.

- **N-7 (người gộp):** chú thích đầu `src/modules/van-chuyen/index.ts` (dòng 3: "KHÔNG module nào import van-chuyen (không có gì xuất ra ngoài ngoài AppModule)") nay SAI một nửa — tệp xuất thêm hàm công bố `mocToiThieuHienHanh` (chỉ gốc lắp ráp gọi). Không sửa ở nhánh này vì nhánh ADR-0048 sửa đúng dòng đó; người gộp sửa lúc giải xung đột.
- **N-8 (bàn giao A13):** chưa có bảng đổi mã `MA_GIU` → mã lỗi route của kế hoạch mục 1.1 (vd `CHUYEN_KHONG_CON_LEN_KE_HOACH` phải tách thành `xe_dang_chay` / `chuyen_da_ket_thuc` theo trạng thái; `GPLX_THIEU`, `GPLX_THIEU_HANG`, `GPLX_HET_HAN`, `HANG_BANG_KHONG_DU`, `KHONG_CO_HANG_BANG` → `khong_du_dieu_kien_lai`; `MOC_TOI_THIEU` → `can_pha_le`; `KHOANG_NGHI` → `chua_du_nghi`…). Đề nghị đặt bảng đó ở `src/shared/ly-do-giu.ts` (một chỗ, tránh "hai luật").

## 7. Sự cố

- **SC-1 (A0, R-P4 i):** bản nháp CHECK đầu tiên thiếu `IS NOT NULL` cho số phút → "có lý do, thiếu số phút" LỌT trên node:sqlite (NULL trong `CHECK` = không sai). Thấy nhờ chạy thật; đã sửa bản nháp, ghi mục 2.1 để A9 có ca riêng.
- **SC-2 (A7):** hai ca bài route đỏ vì bài so `deepEqual` với đối tượng `[Object: null prototype]` do `w.q` trả — lỗi của BÀI, không của mã; sửa bài (bọc `{ ...x }`).
- **SC-3 (cuối phiên):** e2e đủ bộ `npm run test:e2e` thoát 1 — 23/25 xanh: `admin` đỏ `{"error":{"code":"sheet_unreachable","message":"Không kết nối được tới Google Sheet, thử lại sau."}}` `502 !== 200` (`tests/e2e/admin.mjs:211`); `catalog` đỏ `undefined !== 1` (`tests/e2e/catalog.mjs:129`, lần đồng bộ Sheet không trả kết quả). Chạy lại `npm run test:e2e -- admin catalog`: `admin` XANH, `catalog` đỏ ở `catalog.mjs:188` (`'QTV Test' !== 'Hệ thống (tự động)'` — đúng lỗi chập chờn Cron đã ghi ở nhật ký ADR-0047 mục 5, lúc máy tải 4,26); chạy lại riêng `npm run test:e2e -- catalog` → **2/2 xanh**. `git diff --stat ce831f8 HEAD -- src/modules/catalog src/index.ts tests/e2e/catalog.mjs tests/e2e/lib.mjs tests/e2e/admin.mjs src/modules/accounts src/modules/staff` → **rỗng** (nhánh này không đụng danh mục, tài khoản, Sheet). Xếp: mạng Google Sheet + chập chờn đã biết, không phải hồi quy.
- **SC-4 (quy trình):** hook của worktree từ chối lệnh Bash ghép dài / heredoc có chữ "git" trong nội dung Python — tách thành tệp script + lệnh đơn. Không ảnh hưởng mã.

## 8. Câu hỏi cho điều phối (không tự quyết)

- **Q-A4-1 (logic mốc lúc xếp — P8, không tự quyết):** ADR-0049 D2 khoá trong mốc đúng ba việc: đổi "ai đi xe nào", đổi xe, đổi tài xế; đổi thứ tự điểm và giờ xe tới vẫn làm được. ADR KHÔNG nói về **đổi giờ xuất bến dự kiến** của chuyến. Hiện `kiemMocXep` / `kiemTaoSuaChuyen` KHÔNG khoá lệnh chỉ đổi giờ xuất bến (theo chữ ADR). Hệ quả: trong 6 giờ, người xếp (Bán hàng) có thể dời giờ xuất bến ra ngoài 6 giờ bằng một lệnh, đổi tài xế bằng lệnh thứ hai, rồi dời giờ về bằng lệnh thứ ba — lách mốc mà không cần Quản trị. Trong CÙNG một lệnh thì đã chặn (GA-12). Hỏi điều phối: (a) giữ như chữ ADR (lách được, dựa vào nhật ký); (b) khoá luôn đổi giờ xuất bến trong mốc (siết — nhưng là quyết định logic mới, có thể cần chủ); (c) cách khác. Không chặn A13 bắt đầu; A13 phải có câu trả lời trước khi viết route 4.
  - **Người kiểm độc lập giữa chừng (29/9) mở rộng:** `kiemXep` (lệnh `XEP`, `RUT`, `DOI_DI`, `DOI_DEN`, `HUY_CO_KHACH`) cũng chỉ dùng giờ HIỆN TẠI của chuyến — chuỗi "dời giờ ra ngoài mốc → xếp / rút khách → dời về" lách được như đổi xe / tài xế. Điều phối sẽ hỏi chủ SAU khi chủ triển khai xong 1.37; người thi công KHÔNG sửa chỗ này, KHÔNG làm A9 / A13.
- **GA-5 (mốc 0 = tắt hẳn):** chưa có lời chủ — điều phối sẽ hỏi cùng lượt với Q-A4-1.

### Kiểm độc lập giữa chừng (điều phối gọi, đỉnh `18bd7db`, 2026-09-29)

- Kết quả: **ĐẠT CÓ ĐIỀU KIỆN**. Người kiểm tự chạy lại `npm test` 1399/1399, typecheck / build thoát 0, `tests/audit` 36/36; tự tái hiện P16 4/4 (trigger chỉ-thêm, `CHECK (require_contract = 0)`, mốc `<`, `can(settings.ops)`); ranh giới luật rỗng, không nới hàng rào. **Chấp nhận GA-1, GA-8, GA-9, GA-10, GA-13, GA-14.** Chưa chạy e2e (chủ đang triển khai production).
- Điều kiện / câu mở (điều phối hỏi chủ sau khi triển khai 1.37): Q-A4-1 mở rộng (mục 8); GA-5.
- Việc giao ngay: N-2 (đã làm — mục 6). N-1 (`dot-a-smoke`) để SAU, điều phối báo khi máy rảnh.

## 9. Kết quả kiểm của người thi công (tự khai, chưa phải kiểm độc lập)

Đỉnh nhánh lúc kiểm: `55cb5ff` (+ commit nhật ký này). Node v22.22.3.

| Lệnh | Kết quả |
|---|---|
| `npm test` | thoát **0** — **1399/1399** (mốc A0: 1313; +86 bài mới của phiên) |
| `npm run typecheck` | thoát **0** (0 lỗi) |
| `npm run build:web` | thoát **0** |
| `node --test "tests/audit/*.test.mjs"` | thoát **0** — 36/36 |
| `npm run test:e2e -- chinh-sach-dieu-phoi van-chuyen` | thoát **0** — "E2E: 3/3 kịch bản xanh" (kịch bản mới + kịch bản Vận chuyển 1a cạnh nó) |
| `npm run test:e2e` (ĐỦ BỘ, có đuôi `audit-invariants --db local --persist-to <D1 tạm> --strict`) | thoát **1** — 23/25 xanh; đỏ `admin`, `catalog` do Google Sheet (SC-3); **`audit-invariants` ✔: "Mọi bất biến đạt, 2 cảnh báo (D1 local, --strict)"** — hai cảnh báo sẵn có ở mốc (R-ORD-6a 1, R-ORD-6b 2). Chạy lại: `admin` xanh; `catalog` riêng 2/2 xanh |
| `git merge-tree --write-tree --name-only HEAD worktree-agent-aa4ba1b121f98db87` (ADR-0047) | va: `docs/SO-HANG-RAO.md`, `src/route-access.test.ts`, `tests/e2e/run.mjs` (N-3) |
| `git merge-tree --write-tree --name-only HEAD worktree-agent-ae0f600ceaab6d8b4` (ADR-0048) | va: `docs/SO-HANG-RAO.md`, `src/route-access.test.ts`, `tests/e2e/README.md`, `tests/e2e/run.mjs` (N-3) |

- **Không nới hàng rào nào** (Điều 9.4): không sửa `ALLOWED_EDGES`, `STRICT`, `LEGACY`, `GUARDS`, `ADMIN_OPS`, `DOC_AUDIT_LOG_WONGUARD`, bài ghim quyền, `docs/quyen-hoan.json`; không thêm ô quyền; không sửa tệp luật (`CLAUDE.md`, `src/CLAUDE.md`, `web/CLAUDE.md`, `.claude/`, `playbook/`, `docs/adr/`, `docs/ARCHITECTURE.md`). Chỉ SIẾT: GA-1 (`vc_reason_identity`, `vc_departure_rule_close_once` chặn đổi nội dung).
- **Không** push, không merge vào `main`, không deploy, không `--remote`, không đọc `.dev.vars` / tệp bí mật. D1 chỉ `--local --persist-to` thư mục tạm (đã xoá).
- **Chưa làm (ngoài phạm vi phiên):** A5 (cần nền ADR-0048), A9 trở đi; kịch bản Chrome (N-1); tài liệu mô tả (N-2); điền số dòng tệp đề xuất luật (A20).
