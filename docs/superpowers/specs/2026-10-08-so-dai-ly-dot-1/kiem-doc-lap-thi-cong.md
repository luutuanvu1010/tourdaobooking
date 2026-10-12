# Kiểm độc lập cuối nhánh `claude/so-tien-luot-2-dai-ly` @ `fde7989f` (trên `main` = `1c177e51`) — 2026-10-12

Người kiểm: trợ lý kiểm chỉ-đọc (không thi công phần nào của nhánh này; không sửa tệp nào trong kho). Mọi lệnh chạy trên bản sao `git archive HEAD | tar -x` ở `/private/tmp/claude-501/final` (chạy kiểm) và `/private/tmp/claude-501/final-mut` (phép phá cố ý, mỗi phép sao lưu → sửa → chạy bài → hoàn nguyên → `cmp` với bản gốc). Không `--remote`, không chạm production, không ghi `.dev.vars`; chỉ D1 LOCAL tạm.

## Kết luận

**Sẵn sàng `npm run day-len`: CÓ.** Không có phát hiện Critical hay Important. Toàn bộ bộ kiểm tự tay chạy lại đều xanh: typecheck 0 lỗi, build:web xanh, `npm test` hai bước xanh (một bài đỏ duy nhất là lỗi của bản sao không phải kho git, xanh 9/9 khi chạy ngay trong worktree thật), **e2e ĐỦ BỘ 54/54 kịch bản xanh trong 367 giây (3 nhóm), `audit-invariants --strict` đạt ở cả ba nhóm**, hai kịch bản Chrome xanh (sổ đại lý 80/80, a2-smoke-order 11/11 với câu 409 mới), và 14 phép phá cố ý của tôi đều làm đúng bài đỏ rồi hoàn nguyên sạch. Phần còn lại là các điểm nhỏ (Minor) và các việc chủ đã quyết «để sau» — ghi ở cuối, không chặn gộp. Sau khi gộp, bước phát hành theo runbook `docs/HANDOFF-N1.md` (mục sổ đại lý đợt 1): đổi số 1.87 nếu `main` đã có số đó, không khoá tháng ngày phát hành, deploy ngay sau migration (ân hạn `R-ORD-T1` 60 phút).

## Bằng chứng tự chạy (không tin lời khai)

| Lệnh / việc | Nơi chạy | Kết quả thật |
|---|---|---|
| `git diff 1c177e51 fde7989f --stat -- CLAUDE.md .claude playbook docs/adr web/CLAUDE.md` + `docs/ARCHITECTURE.md` Phần I | worktree thật (chỉ đọc) | rỗng — nhánh không đụng tệp luật |
| `git ls-tree --name-only <nhánh> migrations/` cho mọi nhánh `claude/*` | worktree thật | `0090` chỉ có ở nhánh này; `van-chuyen-goi-a-c` giữ 0089/0091/0092; `main` tới 0088 — không trùng |
| `npm run typecheck` | bản sao | EXIT=0, 0 lỗi (`final-typecheck.log`) |
| `npm run build:web` | bản sao | EXIT=0 (`final-build.log`) |
| `npm test` | bản sao | Bước 1: 3799 bài, 3789 đạt, **1 đỏ = `src/standards.test.ts` «.gitattributes … git check-attr»** (bản sao `git archive` không phải kho git ⇒ `fatal: not a git repository`), 9 todo, 50,9 s. Bước 2 (đo giờ hook, một mình): 1/1, 1,6 s. Kiểm lại `node --test src/standards.test.ts` ngay trong worktree thật: 9/9 xanh ⇒ đỏ là artifact của bản sao, không phải lỗi mã |
| `npm run test:e2e` ĐỦ BỘ | bản sao, có mạng | **54/54 kịch bản xanh, 367 giây, 3 nhóm song song**; `audit-invariants --strict` cuối mỗi nhóm: «Mọi bất biến đạt» (4 / 5 / 4 cảnh báo, D1 local). Có `so-dai-ly` (35,5 s) và `khoa-thang` (10,0 s). uptime đầu 09:22 tải 2,33 → cuối 09:28 tải 4,84 (`final-e2e.log`) |
| Chrome `so-dai-ly-smoke.mjs` (một lần, `OUT` tạm, `AXE_JS` + `CHROME_BIN` như yêu cầu) | bản sao | **SMOKE OK — 80 bước**, EXIT=0, 09:33:38 → 09:35:42, tải 1,10 → 2,95; axe 0 critical/serious; 4 minor `empty-table-header` (th:nth-child(7) ở /hoa-hong, /nguoi-ban — đã ghi BACKLOG) (`chrome-sdl.log`) |
| Chrome `a2-smoke-order.mjs` (regex 409 đã đổi, chưa ai chạy lại) | bản sao | **UI SMOKE ORDER OK — 11 ✓**, EXIT=0, 09:35:54 → 09:36:21; bước «409 ở trang đơn» khớp câu mới «Đơn đã ở trạng thái …» (`chrome-a2.log`) |
| 14 phép phá cố ý (P16) | bản sao thứ hai | mỗi phép đúng bài đỏ, hoàn nguyên «giống gốc», `diff -rq src` rỗng, migration và `audit-checks.mjs` giống gốc (`pha.log`; bảng ở Phụ lục) |
| Tiến trình mồ côi | máy | `pgrep workerd` = 0 trước và sau Chrome |

## Mười hai mục phải kiểm

### (1) Tiêu chí nghiệm thu §12 của đặc tả — ✅ (12/12 có bài hoặc bằng chứng thật)
| §12 | Bài / bằng chứng (tệp thật đã đọc) | Kết quả |
|---|---|---|
| 1 `chonMuc` sáu bậc, ranh ngày, mức 0, NO_RULE, RULE_CONFLICT, MANUAL_LINE, BOOKER_NOT_BENEFICIARY, NONE | `src/modules/pricing/rules.test.ts:55,66,78,169` | ✅ xanh trong `npm test` |
| 2 A-1…A-5, B-3, nửa đồng 1.000.004 ⇒ 125.001 | `rules.test.ts` bài «làm tròn nửa lên (điều A1)», `src/so-vang-so-dai-ly.test.ts` lớp 1 | ✅; phép phá C (làm tròn xuống) ⇒ 2 bài đỏ |
| 3 Xác nhận ⇒ bản chụp cùng lô; câu chụp hỏng ⇒ vẫn nháp | `src/modules/orders/chup-xac-nhan.test.ts:49,66,76` | ✅; phép phá A (bỏ `WHERE changes() > 0`) ⇒ 5 bài đỏ |
| 4 Mỗi trigger chặn thật một lần | `src/migrations-so-dai-ly.test.ts` (prc_*, ord_service_terms_*, ky_*, 4 `*_period_closed`); sổ hàng rào ghi «gỡ lần lượt từng trigger ⇒ đúng một bài đỏ» | ✅; phép phá E (`WHEN 0` ở `bil_posting_period_closed`) ⇒ bài 15 đỏ |
| 5 Đổi bên đặt sau xác nhận ⇒ chụp mới, bản cũ còn | `src/modules/orders/ben-dat-doi-tac.test.ts:371–459` (4b–4e, tranh chấp i/iii) | ✅ |
| 6 Ghi tay: thiếu lý do 400; nháp 409; Đã giao 409; Bán hàng/HDV/Đối tác 403 | `src/modules/orders/thuong-mai-route.test.ts:433` (6), 492–641 (6b–7e) | ✅ |
| 7 1024 tập quyền; Đối tác đơn người khác 404; DRIVER/DRIVER_PARTNER/HR 403; khoá ⊆ | `thuong-mai.test.ts` (1024 tập), `src/so-dai-ly-quyen-route.test.ts:72,90`, `src/shared/permissions.test.ts` | ✅; phép phá G, H đỏ đúng |
| 8 Số lạ 480.017; DTO Đối tác không `rate/perPax/cost/ruleId` | `src/so-la-doi-tac.test.ts:85,149,192` (lọc khoá dòng 139, 188); `src/so-la-thuong-mai-toan-nen-tang.test.ts` (104 GET × 18 tài khoản) | ✅; phép phá B, I đỏ đúng |
| 9 Bên đặt: Đối tác gửi bên đặt khác ⇒ ghi hồ sơ mình; tổ chức có vai ⇒ được, không vai ⇒ 400; nhãn «Bên đặt (đối tác)» | `ben-dat-doi-tac.test.ts:129–264`; `web/order.ts:1178` + `src/shared/phan-doi-tac-hien-thi.ts:63`; Chrome bước 33/35 | ✅ (biên nhận: e2e `so-dai-ly` + bài số lạ quét `/receipt`) |
| 10 Khoá tháng: hiện tại/tương lai 400; không liền kề 409; ghi lùi 409 tiếng Việt; đảo/điều chỉnh xe mang ngày hôm nay; Quản trị 403 | `src/modules/billing/khoa-thang.test.ts` ca 1–6b, `src/modules/ky-so/rules.test.ts`, `src/modules/van-chuyen/khoa-thang-xe.test.ts` ca 1,2,6 | ✅; phép phá D, J, N đỏ đúng |
| 11 Kiểm định kỳ: mỗi mã ca đỏ + ca xanh; `audit-invariants` sau e2e | `src/audit-invariants.test.ts` (133 bài); e2e --strict đạt 3/3 nhóm | ✅; phép phá F (ân hạn 60→180 phút) ⇒ 3 bài đỏ |
| 11b Sổ vàng `cho_xac_nhan` | `golden/so-cong-no-luot-2.json` 6 ca đều `cho_xac_nhan`; `golden/README.md` thêm dòng | ✅ |
| 11c Khoá tháng trong e2e chỉ tháng không ai ghi | `tests/e2e/khoa-thang.mjs` chỉ khoá 2025-01/02 | ✅ |
| 12 test/typecheck/e2e xanh; Chrome §11 chạy được | bảng bằng chứng ở trên | ✅ |

### (2) Đường ghi tiền chưa dịch lỗi khoá tháng — ✅ không còn
Đọc mọi `INSERT` vào bốn bảng có trigger: `bil_payment_receipt` (`billing/repository.ts:194–210`, `coc-repo.ts:173,189`, `thay-lan-thu-repo.ts:20,32`), `bil_posting` (`billing/repository.ts:240–254`), `bil_outside_refund` (`coc-repo.ts:200,207`), `vc_trip_cost_line` (`van-chuyen/tien-xe-repo.ts:153–240`, đúng sáu câu). Mọi lô gọi chúng đều có `loiKhoaKy` (billing: `service.ts`, `coc.ts`, `thay-lan-thu.ts` — bài nguồn `lo-dich-khoa-ky.test.ts` đếm `db.batch(` = số chỗ dịch) hoặc `loiKhoaThangXe` (van-chuyen: `chayGhi`/`chayLoChiPhiXe`). Lời kiểm trước lô (`ngayPhatSinh` nhận `kyDaKhoa`; `ngayGhiDao`/`ngayDieuChinhMacDinh` bắt buộc `kyDaKhoa`) là lớp thứ hai — phép phá D và J chứng minh lớp này có bài riêng. `bil_debt_line` (`repository.ts:278`) không có `occurred_date`, ngoài bốn bảng của ADR-0080 điều 3 — đúng thiết kế.

### (3) DTO Đối tác lộ khoá — ✅
`dungThuongMai` (`src/modules/orders/thuong-mai.ts`) dựng nhánh `doiTac` bằng danh sách trắng (`serviceId, ten, thanhTien, hoaHong, giaDaiLy, tong, duKien, choCongTyCaiMuc`); `cheDoThuongMai` cho 404 trước mọi phép hợp quyền với tài khoản lai và khi người hưởng khác mình (phép phá H ⇒ 6 bài đỏ). Lịch sử đơn lọc `laDongThuongMai` khi `holdsPartner`; `GET /api/audit` lọc trong SQL (`hideThuongMai`, phép phá I ⇒ bài toàn Nền tảng đỏ); tám route `pricing` đều `|| holdsPartner(staff)` (phép phá B). Trợ lý Mai, thông báo, Bảng tin, Web Push: bài tĩnh trong `so-la-thuong-mai-toan-nen-tang.test.ts` và `so-la-doi-tac.test.ts:192` («không hành động `order_terms_*` nào nằm trong danh sách sinh tin»). FIELD được giao / INTERN đơn mình nhận DTO văn phòng có tỷ lệ — đúng bảng đặc tả §6 (`order.terms.view` = assigned/own).

### (4) Ô quyền và ma trận — ✅
Bảy ô mới ở `src/shared/permissions.ts:126–137` khớp từng cột bảng đặc tả §6 (Bán hàng xem mức nhưng KHÔNG xem tỷ lệ mua lại; `ledger.period.close` chỉ Kế toán + Toàn quyền; DRIVER/DRIVER_PARTNER/HR = none). Mỗi ô có route hỏi: `partner.commission.*` và `supply.terms.*` ở `pricing/index.ts:85–108…`, `order.terms.view` ở `GET …/thuong-mai`, `order.terms.override` ở `POST …/thuong-mai/:serviceId`, `ledger.period.close` ở `POST /api/ledger/ky/:period/khoa`. Hai hàng rào chung (`permission-enforcement`, `route-write-guard`) vẫn xanh. Phép phá G (mở `ledger.period.close` cho Quản trị) ⇒ 3 bài `permissions.test.ts` đỏ.

### (5) Migration 0090 — ✅
Chỉ thêm (bảng/view/trigger mới, không `ALTER` bảng cũ), expand-only; số không trùng nhánh nào; bốn trigger `*_period_closed` đọc `v_ky_closed_period` (view công bố của `ky-so`, cạnh `billing → ky-so`, `van-chuyen → ky-so` đã duyệt C12, `src/architecture.test.ts` canh); gieo `prc-st-goc-all` từ `v_pty_owner_company LIMIT 1` với `valid_from_date '2025-01-01'`; `ord_audit_cutoff` gieo `R-ORD-T1` = giờ áp migration; `scripts/audit-checks.mjs:84` cộng `'+60 minutes'` bằng `julianday`. Runbook `docs/HANDOFF-N1.md` (dòng ~764) khớp mã: deploy ngay sau migration, hoàn tác Worker ⇒ `R-ORD-T1` đỏ là tín hiệu đúng, không khoá tháng ngày phát hành, 1.87 là số tạm, đợt 1 chỉ đại lý cá nhân.

### (6) Bảy thay đổi Task 14 — ✅ đúng ý, bài có răng
`1101c176` hằng `MOI_KHACH_TOI_DA` (`src/shared/so-dai-ly-nhap.ts`) dùng ở `pricing/rules.ts:170` và `orders/thuong-mai.ts`, bài quét cấm số ≥ 1 triệu viết thẳng (phép phá K ⇒ 2 bài đỏ, kể cả khi chỉ viết lại cùng giá trị); `f8c166c9` `docTienMoiKhach` `^\d+$` rồi so trần; `a16e22b9` `/api/auth/me` bọc `benDatCuaToi()` — hỏng ⇒ `null` + log `ben_dat_cua_toi_failed` không PII, KHÔNG mở thêm dữ liệu (phép phá L ⇒ 5 bài đỏ, trong đó bài «/me vẫn 200»); `e461a5d9` cờ ô «Đặt qua đối tác» tới bảng đổi khách; `2d0a2150` `TIEU_DE_LOI = "Hoa hồng"` cho nhánh lỗi; `f10f5558` `cauKhongDoiDuocTrangThai` (phép phá M lộ `${tu}` ⇒ 3 bài đỏ) + regex Chrome đã chạy lại xanh.

### (7) Tiền — ✅ (một điểm đã biết)
`lamTronNuaLen(tu, mau) = Math.floor((2*tu + mau) / (2*mau))` đúng nửa lên với số nguyên không âm; `hoaHongDong`/`giaVonDong` dùng nó theo dòng; PER_PAX ≤ `MOI_KHACH_TOI_DA` ở cả hai nơi; tỷ lệ ≤ 10.000 phần vạn. `giaDaiLy = thanhTien − hoaHong` có thể âm khi PER_PAX × khách > thành tiền — đã ghi trong đặc tả/BACKLOG, không đổi. Chuỗi `changes() > 0`: `CHUP_CHUOI` (`thuong-mai-repo.ts:9`) nối từ `ORDER_CONFIRM` (`chang-hanh-khach-repo.ts:366–380`, có `updated_at = ?6`); `changeBooker` có vế `? IS NULL OR BOOKER_VALUE IS NOT NULL` và câu chụp lại trải cuối lô. Đua xác nhận/lưu nháp/đổi bên đặt có bài «xác định» (chen lệnh thật giữa lúc đọc và lúc chạy lô) — phép phá A chứng minh.

### (8) Hàng rào K-a, K-c, sổ hàng rào — ✅
Đọc đủ diff `docs/SO-HANG-RAO.md` (21 dòng mới): mỗi dòng có ngày quan sát và nguyên văn `not ok`; tôi lặp lại độc lập 14 phép ở Phụ lục (chọn khác với người thi công ở E, F, K, L, M, N) — tất cả đỏ đúng. K-a: 104 route GET × 18 tài khoản, 2.178 lần gọi, ~2,2 s. K-c: ba tệp `muc-hien-mo-duoc-{1,2,3}`; `npm test` bước 1 chỉ 50,9 s trên bản sao (tải ~2–5) — không làm chậm. Bài đo giờ hook chạy một mình 1,6 s.

### (9) Chạy thật — ✅ (bảng bằng chứng)

### (10) Dừng dây chuyền — ✅
Tôi không có phát hiện HIGH trở lên, nên không cần mục mới ở `docs/quyen-hoan.json` (hiện 10 mục, 6 phát hiện HIGH cũ với hạn 31/10 và 15/11, không quá hạn — `npm test` xanh).

### (11) Phạm vi và luật — ✅
Diff tệp luật rỗng; đề xuất luật ở `docs/superpowers/specs/2026-10-08-so-dai-ly-dot-1/de-xuat-luat-dot-1.md` (6 đề xuất, chỉ đề xuất); sổ vàng 6 ca `cho_xac_nhan`; nhật ký 1.87 (`src/shared/changelog.ts:21–32`, 5 mục tiếng Việt có dấu; mục «doi» về «chưa bấm Đã giao» đúng với luật hiện có `booker_partner` ở `billing/rules.ts:460` + mệnh đề `EXTERNAL` ở `hoan-tat-repo.ts:72–77`, câu báo đã đổi chữ đúng đặc tả §6 dòng 177); Trợ giúp Kế toán/Quản trị/Bán hàng có mục Hoa hồng đối tác, Người bán dịch vụ, Khoá sổ tháng, Phần đối tác (`src/shared/huong-dan-ke-toan.ts:23,106–130`, `huong-dan-quan-tri.ts:19`, `huong-dan-ban-hang.ts:22,50`).

### (12) Tám điều đã quyết — ✅ mô tả khớp mã
(i) tổ chức chưa mang vai: `POST /api/parties/:id/roles` vẫn 409 `role_via_account` — BACKLOG `BL-SDL-TO-CHUC`; (ii) đổi bên đặt đè mức tay: `changeBooker` chụp lại mọi dòng, e2e bước 8 khoá hành vi — `BL-SDL-TAY-BI-DE`; (iii) luật 5.21 chưa rào — chỉ trong đề xuất luật; (iv) `DUOC_MA_AN` 5 dòng chờ chủ (`tests/audit/muc-hien-mo-duoc-khung.mjs:91–126`), dòng 5 ghi «lỗ thật, nên quyết» (tài xế công ty kiêm HDV/Đối tác/Thực tập không có lối vào «Cuốc của tôi» ở điện thoại) — không thuộc nhánh này sinh ra; (v) Kế toán chưa tra đối tác: `nguoi-huong` đòi `order.create` — `BL-SDL-KE-TOAN-TRA`; (vi) `docGhiChuKy` từ chối «30.09.2026» — `BL-SDL-GHI-CHU-NGAY`; (vii) ba route tiền xe đọc chưa chặn `holdsPartner` — BACKLOG mục 27; (viii) BACKLOG mục 26 có 8 dòng `BL-SDL-*`, mục 27 có.

## Phát hiện

### Critical — không có.
### Important — không có.

### Minor (không chặn gộp; không tự sửa)
1. **Bài `src/standards.test.ts` đỏ trên bản sao `git archive`** (không phải kho git ⇒ `git check-attr` thoát 128). Không phải lỗi mã (9/9 xanh trong worktree). Đề xuất: người kiểm sau dùng `git worktree`/bản sao có `.git`, hoặc ghi chú ở bài rằng nó cần kho git.
2. **Ân hạn `R-ORD-T1` 60 phút và bước deploy** (`scripts/audit-checks.mjs:84`): `npm run trien-khai` áp migration rồi deploy ngay nên bình thường không sao; nhưng nếu deploy hỏng (ví dụ lỗi 7403) và chạy lại SAU hơn 60 phút, bước `audit-invariants --db remote` sẽ đỏ vì đơn xác nhận bằng mã cũ không có bản chụp. Runbook đã ghi tín hiệu này là đúng; đề xuất chủ chạy phát hành lúc ít người xác nhận đơn và không để quá 60 phút giữa hai bước.
3. **`docs/SO-HANG-RAO.md` dòng «Câu 409 … Kịch bản Chrome `a2-smoke-order.mjs` đã đổi theo câu mới nhưng CHƯA chạy lại»** — nay tôi đã chạy lại xanh (11 ✓, 09:36). Đề xuất điều phối cập nhật câu đó khi gộp (bề mặt, tài liệu sống).
4. **axe minor `empty-table-header`** (th thứ 7 ở `/hoa-hong`, `/nguoi-ban`, khổ 1040) — đã ở BACKLOG; không làm đỏ.
5. Các điểm đã biết, đã ghi nợ, nhắc để chủ không bất ngờ: `giaDaiLy` có thể âm khi đ/khách × khách > thành tiền; `R-PRC-4` không phủ phạm vi `ALL` (`BL-SDL-R-PRC-4`); `earliestLedgerMonth` chỉ xét ba bảng billing (`BL-SDL-KHOA-DAU-TIEN`); số 1.87 là số tạm (bước A.0 runbook); dòng 5 của `DUOC_MA_AN` («lỗ thật, nên quyết»: tài xế công ty kiêm HDV/Đối tác/Thực tập không có lối vào «Cuốc của tôi» ở điện thoại) là việc cũ chờ chủ, không do nhánh này sinh ra.

### Điều làm tốt (ghi nhận)
Mọi lô ghi tiền đều đi qua một chỗ dịch lỗi khoá tháng và có bài NGUỒN đếm lô; bản chụp lúc xác nhận nối bằng `changes() > 0` + khoá `updated_at` có bài «xác định» thật sự chen lệnh; DTO Đối tác là danh sách trắng và được quét số lạ trên toàn bộ 104 route GET × 18 tài khoản; mỗi dòng sổ hàng rào mới đều có nguyên văn `not ok`; runbook khớp mã.

## Những gì tôi KHÔNG kiểm được (và vì sao)
- Production / D1 remote: không chạy `audit-invariants --db remote`, không `wrangler d1 migrations list --remote` (cấm `--remote`; chưa có dữ liệu đợt 1 trên production).
- iPhone thật, mạng điện thoại thật: chỉ Chrome headless hai khổ 390/1040 trên D1 tạm với danh mục giả.
- Khoá lạc quan `updated_at` ở xác nhận chưa được e2e chứng minh (`wrangler dev` chạy hai yêu cầu tuần tự) — chỉ bài khung thử; giới hạn đã ghi ở sổ hàng rào.
- Ngày quan sát lịch sử của 21 dòng sổ hàng rào: tôi không chứng minh lại từng dòng; tôi tái hiện độc lập 14 phép (Phụ lục), chọn một số phép khác với người thi công.
- Sổ vàng A-1…A-5, B-3: đáp án do AI soạn, chờ chủ/Kế toán xác nhận — lớp 2 chưa chặn gì thật (đúng N8, không tự xác nhận).
- Hiệu năng `npm test` dưới tải cao (tôi đo ở tải 2–5: bước 1 50,9 s); Time Travel/HC-5.19 chưa diễn tập (lỗ cũ, có hạn ở `quyen-hoan.json`).

## Phụ lục — 14 phép phá cố ý trên `/private/tmp/claude-501/final-mut` (`pha.log`)
| # | Sửa cố ý (tệp:dòng) | Bài chạy | Kết quả | Hoàn nguyên |
|---|---|---|---|---|
| A | bỏ `WHERE changes() > 0` ở `CHUP_CHUOI` (`orders/thuong-mai-repo.ts:9`) | `chup-xac-nhan.test.ts` | 11 đạt / **5 đỏ** (RF1 xác định; Task 4b ca A, B, «chỉ đẩy updated_at») | giống gốc |
| B | bỏ `|| holdsPartner(staff)` ở `GET /api/pricing/hoa-hong` (`pricing/index.ts:85`) | `so-la-doi-tac`, `pricing/route.test` | 16 / **1 đỏ** («tài khoản lai … bảy route văn phòng») | giống gốc |
| C | `lamTronNuaLen` → làm tròn xuống (`shared/hoa-hong-dong.ts:10`) | `pricing/rules.test`, `so-vang-so-dai-ly.test` | 20 / **2 đỏ** (A-5 125.000; sổ vàng lớp 2 có răng) | giống gốc |
| D | `ngayPhatSinh` bỏ kiểm tháng khoá (`billing/rules.ts:511`) | `khoa-thang.test`, `billing/rules.test` | 20 / **2 đỏ** (ca 3; `ngayPhatSinh`) | giống gốc |
| E | trigger `bil_posting_period_closed` thành `WHEN 0` (`migrations/0090:264`) | `migrations-so-dai-ly.test` | 14 / **1 đỏ** («bốn bảng tiền từ chối…») | giống gốc |
| F | `'+60 minutes'` → `'+180 minutes'` (`scripts/audit-checks.mjs:84`) | `audit-invariants.test` | 130 / **3 đỏ** (119, 126, 127) | giống gốc |
| G | `ledger.period.close` cột Quản trị `none` → `any` (`permissions.ts:126`) | `permissions.test` | 28 / **3 đỏ** (bản đồ, `can()`, ADMIN_NONE_OPS) | giống gốc |
| H | `cheDoThuongMai` bỏ luật người hưởng khác (`orders/thuong-mai.ts:85`) | `thuong-mai.test`, `so-la-doi-tac`, `thuong-mai-route.test` | 39 / **6 đỏ** (3b2, 3d2, 3f, 3h…) | giống gốc |
| I | `hideThuongMai: false` (`audit/index.ts:43`) | `so-la-thuong-mai-toan-nen-tang.test` | 1 / **1 đỏ** | giống gốc |
| J | `ngayGhiDao` bỏ `kyDaKhoa` (`van-chuyen/tien-xe.ts:102`) | `khoa-thang-xe.test` | 12 / **3 đỏ** (ca 1, 2, 6) | giống gốc |
| K | `pricing/rules.ts:170` viết thẳng `200_000_000` | `tran-moi-khach.test` | 0 / **2 đỏ** | giống gốc |
| L | `/me` ném lỗi thay vì gọi `benDatCuaToi()` (`auth/index.ts:356`) | `ben-dat-cua-toi.test` | 2 / **5 đỏ** | giống gốc |
| M | câu 409 lộ `${tu}` (`shared/order-status-label.ts:16`) | `trang-thai-409.test`, `order-status-label.test` | 2 / **3 đỏ** | giống gốc |
| N | `kiemKhoaKy` cho khoá tháng hiện tại (`ky-so/rules.ts:31`) | `ky-so/rules.test`, `khoa-thang.test` | 14 / **2 đỏ** | giống gốc |

Sau cả loạt: `diff -rq final-mut/src final/src` rỗng; migration 0090 và `audit-checks.mjs` giống gốc. Worktree thật không bị chạm (chỉ `git diff`/`git ls-tree`/`node --test src/standards.test.ts`).

## Tệp log
`/private/tmp/claude-501/final-typecheck.log`, `final-build.log`, `final-npm-test.log`, `final-e2e.log`, `chrome-sdl.log`, `chrome-a2.log`, `pha.log`, `pha.sh`.
