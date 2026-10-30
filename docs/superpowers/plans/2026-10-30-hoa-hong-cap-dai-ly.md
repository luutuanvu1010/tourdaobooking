# Trang «Hoa hồng đối tác» xếp theo cấp đại lý — Kế hoạch thi công (phần 1 + phần 2)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Mỗi task đỏ → xanh (superpowers:test-driven-development).

**Goal:** Dựng lại trang Hoa hồng thành ba thẻ «Các cấp đại lý · Loại đối tác · Riêng từng đối tác», sửa các câu nói sai luật tiền, đổi tên «chính sách» → «cấp» trên mọi màn và ở máy chủ (phần 1); thêm nút «Đổi cấp» một lô cho cấp riêng của đối tác (phần 2, ADR-0151).

**Architecture:** Phần 1 chỉ đổi giao diện (`web/hoa-hong*.ts`, `public/hoa-hong.html`), luật thuần mới ở `src/shared/` (luật phủ mức, ma trận, luật việc của dòng, câu chữ), và chuỗi chữ ở máy chủ. Không route mới, không đổi DTO. Phần 2 thêm đúng một route `POST /api/pricing/muc-rieng/:id/doi` ghép hai câu ghi có sẵn trong một `db.batch`, có bước xét trước X1/X2 ngay trước `kiemDoi`.

**Tech Stack:** TypeScript, giao diện thuần (`h()` ở `web/dom.ts`), esbuild, D1/SQLite, `node --test`; kịch bản Chrome qua CDP cho bằng chứng giao diện.

**Spec:** `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/DAC-TA.md` (bản 5, chủ duyệt — quyết định 10–12) và `docs/adr/ADR-0151-doi-cap-rieng-cua-doi-tac-mot-lo.md` (accepted). QA1: `QA1-LAN-4.md`, `QA1-LAN-5.md` (cùng thư mục, cả hai ĐẠT). Kế hoạch trỏ về mục của đặc tả thay vì chép câu dài: **mọi câu cố định lấy nguyên văn từ đặc tả/ADR ở mục được trỏ**. Đặc tả được vá sau này thì task chỉ đọc lại đúng mục đó.

- **Ngày soạn:** 30/10/2026, trên nhánh `dac-ta-hoa-hong-cap-dai-ly` (HEAD `20ffe9ad`, gốc `main` a129d3dd). Người soạn KHÔNG thi công (P15/N8).
- **Loại:** việc lớn (chữ tiền ở phần 1, route ghi tiền ở phần 2) ⇒ người kiểm độc lập chỉ đọc ở Task 18 trước khi báo đạt (đặc tả §8 đoạn cuối, ADR-0151 tiêu chí 7).
- **Cổng còn lại trước khi viết mã:** chủ duyệt kế hoạch này (quyết định 10).
- **Xây trên lỗ đang hở:** không (đặc tả §0). Task 1 kiểm lại `docs/quyen-hoan.json`.

## Global Constraints

Mọi task ngầm gồm các dòng dưới đây.

- **Cấm** (`CLAUDE.md` §8): không merge vào `main`, không `git push`, không `wrangler deploy`/`rollback`/`secret`, không `--remote` dưới mọi dạng (kể cả `wrangler dev --remote`, `d1 execute --remote`), không `--force`, không `--no-verify`.
- **Không** migration, **không** sửa `src/shared/contracts.ts`, **không** sửa `src/shared/permissions.ts`, **không** thêm quyền, **không** thêm dependency (đặc tả §0, §8 tiêu chí 9; ADR-0151 Đ2, Đ7).
- **Không đụng `kiemDoi`** (`src/modules/pricing/rules.ts`): không đổi chữ, không thêm tham số (quyết định 9, 12). Phần 2 không chạm `rules.ts` chút nào. Phần 1 ở `rules.ts` chỉ đổi sáu chuỗi của §6.1.
- Phần 1, dưới `src/modules/`: mọi dòng đổi (trừ `*.test.ts`) chỉ khác nhau **bên trong một chuỗi chữ** (tiêu chí 9).
- Mỗi task kết thúc bằng `npm test` thoát 0 **và** `npm run typecheck` 0 lỗi, rồi **đúng một commit**. `npm test` tự sinh lại `src/shared/so-do-trang.ts`; tệp đó đổi thì `git add` nó vào cùng commit và chạy lại `npm test` cho tới khi thoát 0.
- Sửa cố ý để thấy rào đỏ (P16) **không** phải một commit: sửa → chạy → chép dòng đỏ vào nhật ký → hoàn nguyên → chạy xanh, rồi mới commit task.
- **Hồ sơ có ngày đóng băng**: không sửa đặc tả, ADR, QA1-LAN-*, QUYET-DINH-*, BIEN-BAN-*, DOI-CHIEU-MOCKUP. Mọi lệch so với kế hoạch, mọi lựa chọn tự áp, mọi kết quả P16 ghi vào **nhật ký thi công** `docs/superpowers/plans/2026-10-30-hoa-hong-cap-dai-ly-thi-cong-nhat-ky.md` (tạo ở Task 1). Không sửa `CLAUDE.md`, `web/CLAUDE.md`, `src/CLAUDE.md`, `playbook/`, `docs/adr/` (N9).
- Xây trên `main` hôm nay (quyết định 4): đợt 0b không có trong `main`; không dùng `web/html/`, `scripts/dung-web.mjs`, `data-khung`, `khuon-trang.ts`.
- Giao diện (`web/CLAUDE.md`): không `innerHTML`; không `confirm(`/`alert(` mới (dùng `hoiXacNhan`, `moBangTruot`); ẩn/hiện bằng `can(…)`/`coQuyenSua`; giá trị CSS chỉ là token sẵn có (không thêm màu, đặc tả Q-10); ô gõ 16px; chữ tiếng Việt có dấu, không mã thô; thành phần đợt 0 (`.nut`, `.huy-hieu`, `.dai`, `.tab-phu`, `.bang`).
- Không hàm nào ở `web/` chọn mức hay suy con số (đặc tả Q-1, tiêu chí 1). `src/shared/` và `web/` không nhập `src/modules/`.
- Trước khi đổi một câu: grep nguyên câu trên `src/`, `tests/`, `docs/evidence/*/kich-ban/` (đặc tả §6.3 đoạn cuối).

## Nhãn nút tự chốt (bề mặt, đảo ngược được; người thi công ghi vào nhật ký nếu đổi)

Đặc tả chốt «Khoá cấp» / «Mở lại cấp», «Đặt cấp riêng cho đối tác», «Áp dụng cấp cho loại», «Đổi cấp», «Ngừng áp dụng» (Q-7, Q-8, Q-12). Kế hoạch chốt thêm theo luật đổi §6: «＋ Thêm cấp đại lý», «＋ Thêm mức vào cấp», nút loại giữ «Tắt» / «Bật» (hộp dùng «Tắt loại» theo §5.2), «＋ Thêm loại» giữ nguyên, tiêu đề hộp «Đổi cấp riêng» cho phần 2.

## Review Focus

Năm loại đầu vào đặc tả ngầm có mà dễ cắn người dùng nhất; mỗi dòng có bài ở task được ghi.

1. Giá trị cũ trong `sessionStorage` (`ap-dung`, `thiet-lap`, rác) ⇒ mở thẻ «Các cấp đại lý», không thẻ trống (Task 7, `docThe`).
2. Danh mục lỗi hoặc rỗng ⇒ dải chỉ ghi câu «chưa kiểm được», không số nào, không huy hiệu loại (Task 2 + Task 7).
3. Hơn 5 cấp: khổ 1040 cuộn ngang **trong khung bảng**, khổ 390 thành danh sách theo cấp; trang không cuộn ngang (Task 8 + Task 14 bước khổ màn).
4. «Xem dòng ↓» cho bậc 10–12, dòng bị bộ lọc giấu, và dòng không còn trên trang (toast mới) (Task 11 + Task 14).
5. Cấp đang khoá: dòng mức chỉ còn «Ngừng» ở cả nút lẫn «⋯»; lần xếp và cấp riêng trỏ cấp đó vẫn còn «Đổi» sang cấp khác (Task 8 `viecDongMuc` + Task 14).

---

## Phần 1 — giao diện và chữ

### Task 1: Mở nhật ký thi công + dòng sổ lệch ADR-0077

**Files:**
- Create: `docs/superpowers/plans/2026-10-30-hoa-hong-cap-dai-ly-thi-cong-nhat-ky.md`
- Modify: `docs/SYSTEM-DESIGN.md` §16 «Sai lệch tài liệu ↔ mã» (một dòng)

- [ ] **Step 1:** Grep `docs/quyen-hoan.json` tìm mục chạm `pricing`, `prc_`, hoa hồng. Có thì ghi «xây trên lỗ đang hở: <mã>» vào đầu nhật ký và **dừng hỏi chủ**.
- [ ] **Step 2:** Tạo nhật ký với các mục: «Gốc» (HEAD lúc bắt đầu và `git merge-base main HEAD` — gọi là GỐC; mọi so sánh với `main` ở kế hoạch này dùng GỐC hoặc ba chấm `main...`, không hai chấm, để commit mới của `main` không lẫn vào), «Lựa chọn tự áp», «P16 (sửa cố ý → đỏ → hoàn nguyên)», «Lệch so với kế hoạch», «Mốc cuối phần 1» (để trống, Task 14 điền), «Việc treo». Chép bốn khe hở đặc tả ở cuối kế hoạch này vào «Việc treo».
- [ ] **Step 3:** Thêm vào §16 một dòng theo đặc tả §10 gạch đầu: tóm tắt ADR-0077 (mục 4 và ví dụ A-4) nói «cài mức» thả đơn bị giữ, nhưng điều 9 và mã (`orders/index.ts`, chụp bù 409 khi đơn đã có bản chụp) chỉ thả bằng «Ghi mức tay». Mã đúng; ADR không sửa; chờ chủ ra dòng lịch sử.
- [ ] **Step 4:** `npm test` thoát 0, `npm run typecheck` 0 lỗi.
- [ ] **Step 5:** Commit `docs(hoa-hong): nhật ký thi công cấp đại lý + sổ lệch ADR-0077 điều 9`.

### Task 2: Luật phủ mức thuần (đặc tả §4)

**Files:**
- Create: `src/shared/hoa-hong-phu-muc.ts`, `src/shared/hoa-hong-phu-muc.test.ts`

**Interfaces:**
- Produces (tệp này **không chứa chữ cho người dùng**; câu nằm ở `hoa-hong-hien-thi.ts`, Task 7, để luật cấm theo tệp §6.2 phủ được):
  ```ts
  export interface DichVuPhu { code: string; groupCode: string | null; ten: string }
  type DongPhu = Pick<CommissionRuleDto, "doiTuong" | "phamVi" | "catalogCode" | "groupCode" | "tuNgay" | "denNgay" | "daHuy">;
  type GanPhu = Pick<GanLoaiMucDto, "loai" | "tuNgay" | "denNgay" | "daHuy">;
  export interface CapPhu { code: string; dangBat: boolean; dong: readonly DongPhu[]; gan: readonly GanPhu[] }
  export const conApNgay: (d: { tuNgay: string; denNgay: string | null; daHuy: boolean }, ngay: string) => boolean;
  export const khopDichVu: (r: Pick<DongPhu, "phamVi" | "catalogCode" | "groupCode">, s: DichVuPhu) => boolean;
  export type KetQuaPhu = { kieu: "TAT" } | { kieu: "DU" } | { kieu: "KHONG_CO"; thieu: DichVuPhu[] } | { kieu: "THIEU"; thieu: DichVuPhu[] } | { kieu: "CHUA_KIEM" };
  export function phuMucLoai(v: { loai: { code: string; dangBat: boolean }; dong: readonly DongPhu[]; muc: readonly CapPhu[]; dichVu: readonly DichVuPhu[] | null; homNay: string }): { ketQua: KetQuaPhu; sapApTu: string | null };
  export type KetQuaCap = { kieu: "RONG" } | { kieu: "CHUA_AP"; sapApTu: string | null } | { kieu: "THIEU"; thieu: DichVuPhu[] } | { kieu: "DU" } | { kieu: "CHUA_KIEM" };
  export function phuMucCap(v: { cap: CapPhu; dichVu: readonly DichVuPhu[] | null; homNay: string }): KetQuaCap;
  export function xepTheoPhu<T extends { ten: string; ketQua: KetQuaPhu }>(ds: readonly T[]): T[];
  export function demDai(ds: readonly KetQuaPhu[]): { thieu: number; khongCo: number; thieuMot: number; tat: number; chuaKiem: boolean };
  ```
- Luật đúng §4.1: `dong` chỉ xét dòng `doiTuong.loai === "VAI"` mã `loai.code`; nhánh (b) xét `gan` của mọi `CapPhu` có `gan.loai.code === loai.code`, rồi dòng của chính cấp đó; `dangBat` của cấp **không** ảnh hưởng; dòng/lần xếp sắp áp không tính; `dichVu === null` hoặc rỗng ⇒ `CHUA_KIEM` (loại tắt vẫn `TAT`). `sapApTu` = `tuNgay` sớm nhất `> homNay` trong dòng đích loại L và lần xếp của L, chưa huỷ (không xét dòng của cấp — ca L5). `xepTheoPhu`: `KHONG_CO`, `THIEU`, `DU`, `CHUA_KIEM`, `TAT`; trong nhóm theo `ten.localeCompare(…, "vi")` (`CHUA_KIEM` đứng sau `DU`: lựa chọn tự áp, ghi nhật ký).

- [ ] **Step 1: Bài đỏ** — dựng bộ mẫu §4.4 (D = `2026-11-01`; S = A/G1, B/G1, C/G2, D'/null; T1–T6; L1–L14) bằng hàm dựng nhỏ trong tệp test. Các bài:
  - `test("§4.4: L1–L14 ra đúng kết quả và dịch vụ thiếu")` — một bảng mong đợi chép từ §4.4, mỗi dòng `assert.deepEqual({ kieu, thieu: mã thiếu }, …)`; ví dụ L7 ⇒ `THIEU` với `["B","C","D'"]`, L10 ⇒ `THIEU` `["D'"]`, L4/L5/L6/L12/L14 ⇒ `KHONG_CO` 4 dịch vụ, L11 ⇒ `DU`, L13 ⇒ `DU`.
  - `test("§4.4: phụ chú sắp áp")` — L6 ⇒ `sapApTu === "2026-11-02"`; L5 ⇒ `null`.
  - `test("§4.4: câu nhắc cấp")` — `phuMucCap`: T1, T5 ⇒ `DU`; T2 ⇒ `RONG`; T3 ⇒ `CHUA_AP` `sapApTu "2026-11-02"`; T4 ⇒ `THIEU` `["D'"]`; T6 ⇒ `CHUA_AP` `sapApTu null`.
  - `test("§4.4: đếm dải 8 thiếu (5 KHONG_CO, 3 THIEU), 1 tắt")` — `demDai` trên L1–L14.
  - `test("CHUA_KIEM khi danh mục lỗi hoặc rỗng")` — `dichVu: null` và `[]` ⇒ mọi loại bật `CHUA_KIEM`, `demDai(...).chuaKiem === true`, `thieu === 0`.
  - `test("xếp: KHONG_CO, THIEU, DU, CHUA_KIEM, TAT rồi theo tên")`.
- [ ] **Step 2:** `node --test src/shared/hoa-hong-phu-muc.test.ts` ⇒ đỏ (tệp chưa có).
- [ ] **Step 3:** Viết `src/shared/hoa-hong-phu-muc.ts` theo Interfaces (nhập kiểu từ `./contracts.ts` bằng `import type`, đuôi `.ts`).
- [ ] **Step 4:** Chạy lại ⇒ xanh. `npm test`, `npm run typecheck`.
- [ ] **Step 5:** Commit `feat(hoa-hong): luật phủ mức theo từng dịch vụ (đặc tả §4)`.

### Task 3: Bài đối chiếu với `chonMuc` + bài thứ tự áp mức + câu §5.3

**Files:**
- Create: `src/modules/pricing/phu-muc-doi-chieu.test.ts`, `src/modules/pricing/thu-tu-ap-muc.test.ts`
- Modify: `src/shared/hoa-hong-hien-thi.ts` (thêm `CAU_THU_TU_AP_MUC`), `src/shared/hoa-hong-hien-thi.test.ts` (một ca ghim)

**Interfaces:**
- Consumes: Task 2 (`phuMucLoai`, bộ mẫu — **chép** hàm dựng bộ mẫu sang tệp này; không nhập từ tệp `*.test.ts` khác, vì `node:test` sẽ đăng ký lại bài của tệp đó). `chonMuc`, `nguoiHuongCua`, `DongMuc`, `GanLoaiMuc` từ `./rules.ts`.
- Produces: `export const CAU_THU_TU_AP_MUC: string` = nguyên văn §5.3.

- [ ] **Step 1: Bài đỏ đối chiếu** (đặc tả §4.4 đoạn «Bài đối chiếu với `chonMuc`» và «Bộ mẫu riêng cho ca nhóm tắt»):
  - `test("phủ ⇔ chonMuc SET cho L2–L14 × mọi dịch vụ")` — với mỗi (L, s): `phuMucLoai` nói phủ s (s không nằm trong `thieu`, hoặc `DU`) ⇔ `chonMuc({ nguoiHuong: { loai: "HUONG", partyId: X, vai: [L] }, catalogCode: s.code, groupCode: s.groupCode, ngay: D, dong: <bộ mẫu chưa huỷ đổi sang DongMuc>, gan: <lần xếp chưa huỷ>, ganRieng: [] }).trangThai === "SET"`.
  - `test("L1 đã tắt: nguoiHuongCua KHONG_HUONG, chonMuc MISSING BOOKER_NOT_BENEFICIARY")` — dữ liệu vào đúng §4.4 (`vaiMo` có `nhanDoiTac: true`, `vaiDuocHuong` bỏ L1, `congTyChuId` khác X).
  - `test("nhóm tắt: luật phủ nói thiếu E, chonMuc vẫn SET (lệch biết trước §4.1)")` — S' = {E}, danh mục `groupCode null`, `chonMuc` nhận `G3`, L15 chỉ có dòng GROUP G3.
- [ ] **Step 2: Bài đỏ thứ tự** (tiêu chí 2), tệp `thu-tu-ap-muc.test.ts`, ba ca `chonMuc`: (a) đối tác có cấp riêng với dòng ALL và loại có dòng riêng ALL ⇒ `bac` 12 (10–12 thắng 4–6); (b) đối tác có cấp riêng **không có dòng khớp**, loại xếp vào cấp có dòng ALL ⇒ `MISSING` lý do `NO_RULE`; (c) đối tác mang hai loại, hai dòng riêng ALL khác số ⇒ `MISSING` `RULE_CONFLICT`. Thêm ca ghim `assert.equal(CAU_THU_TU_AP_MUC, "<nguyên văn §5.3>")` vào `hoa-hong-hien-thi.test.ts`.
- [ ] **Step 3:** Chạy ⇒ bài đối chiếu xanh ngay (luật đã có từ Task 2), bài ghim câu đỏ. Thêm `CAU_THU_TU_AP_MUC` ⇒ xanh.
- [ ] **Step 4: P16** — (i) bỏ nhánh (b) của `phuMucLoai` ⇒ bài đối chiếu đỏ; (ii) cho dòng sắp áp tính là còn áp ⇒ đỏ; (iii) tạm đảo hai vòng 10–12 và 4–6 trong `chonMuc` (`rules.ts`, không đụng `kiemDoi`) ⇒ bài thứ tự (a) đỏ. Hoàn nguyên từng cái (`git diff -- src/modules/pricing/rules.ts` rỗng trước khi commit), chép dòng đỏ vào nhật ký. Không commit trạng thái sửa.
- [ ] **Step 5:** `npm test`, `npm run typecheck`; commit `test(hoa-hong): đối chiếu luật phủ với chonMuc + thứ tự áp mức (tiêu chí 2, 3)`.

### Task 4: Chữ máy chủ §6.1 + bài ghim §6.3

**Files:**
- Modify: `src/modules/pricing/index.ts` (chỉ chuỗi), `src/modules/pricing/rules.ts` (chỉ sáu chuỗi `kiemTenMucTa`, `kiemThanGan`, `kiemThanDoiChinhSach`, `kiemThanGanRieng`), `src/modules/pricing/muc-ta.test.ts`, `src/modules/pricing/gan-rieng-route.test.ts`, `src/modules/pricing/doi-chinh-sach.test.ts`, mọi bài khác mà bước grep tìm ra, `tests/e2e/sua-muc.mjs` (nếu ghim câu đổi)

- [ ] **Step 1:** Với mỗi «câu hôm nay» của bảng §6.1: grep nguyên câu trên `src/`, `tests/`, `docs/evidence/*/kich-ban/`; liệt kê chỗ ghim vào nhật ký.
- [ ] **Step 2: Bài đỏ** — sửa các bài ghim đã liệt kê sang «câu mới» của §6.1 (từng chữ). Thêm vào `muc-ta.test.ts` ca mới `test("khoá cấp đang khoá / mở lại cấp đang mở ⇒ 409 đúng câu (§6.1 :221)")`: tắt một cấp hai lần ⇒ lần hai 409, `json.message` = câu mới «…đã khoá rồi…»; bật một cấp đang bật ⇒ 409 câu mới «…đang mở rồi…».
- [ ] **Step 3:** Chạy các tệp bài ⇒ đỏ.
- [ ] **Step 4:** Đổi đúng các chuỗi §6.1 ở `index.ts` và `rules.ts`. **Không** đổi: hai chuỗi nhật ký `chính sách ${…}` (`tenDoiTuongNhatKy`, `prc_commission_rule_added`), các chi tiết nhật ký «mức riêng …», mọi câu của `kiemDoi`, `kiemSua` (quyết định 8, 9).
- [ ] **Step 5:** Kiểm tiêu chí 9 phần máy chủ: `git diff HEAD -- src/modules/ ':!*.test.ts'` — đọc từng dòng, mọi dòng chỉ khác trong một chuỗi chữ; `git diff HEAD -- src/modules/pricing/rules.ts` không chạm dòng nào của `kiemDoi`. Ghi kết quả vào nhật ký.
- [ ] **Step 6:** `npm test`, `npm run typecheck`; commit `fix(hoa-hong): câu báo của máy chủ theo chữ «cấp đại lý» (đặc tả §6.1, quyết định 6)`.

### Task 5: Chữ ở `src/shared/` (trừ hướng dẫn) + giữ `groupCode` của danh mục

**Files:**
- Modify: `src/shared/so-dai-ly-nhap.ts` (+ `.test.ts`), `src/shared/audit-actions.ts` (+ `.test.ts`), `src/shared/hoa-hong-hien-thi.ts` (+ `.test.ts`), `web/so-dai-ly-ui.ts` (`DanhMuc`, `taiDanhMuc`)

**Interfaces:**
- Produces: `DanhMuc.dichVu: readonly { code: string; name: string; groupCode: string | null }[]` (giữ `CatalogServiceDto.groupCode`, đặc tả §2).

- [ ] **Step 1: Bài đỏ** — sửa ca ghim của ba tệp bài sang chữ mới (§6.2 gạch 1, 2; `prc_rate_tier_off`/`_on` ⇒ «Khoá cấp đại lý» / «Mở lại cấp đại lý»). Với `hoa-hong-hien-thi.ts`: đổi 18 chuỗi «chính sách» theo luật đổi §6 (đầu §6), giữ nguyên tên hàm và mã nội bộ; `nhanMucTa(...).nut` đổi nhãn thành «Khoá cấp» / «Mở lại cấp» (quyết định 7). Ca cũ chỉ được đổi chữ (tiêu chí 6).
- [ ] **Step 2:** Chạy ⇒ đỏ; đổi chuỗi ⇒ xanh.
- [ ] **Step 3:** `taiDanhMuc` giữ `groupCode`; mọi nơi dùng `dm.dichVu` vẫn typecheck.
- [ ] **Step 4:** Nếu một chuỗi đổi là `[[Tên nút]]` trong `src/shared/huong-dan-ke-toan.ts`, sửa câu hướng dẫn tương ứng trong cùng commit (bài A2 `src/shared/huong-dan.test.ts`).
- [ ] **Step 5:** `npm test` (stage `so-do-trang.ts` nếu đổi), `npm run typecheck`; commit `fix(hoa-hong): chữ «cấp đại lý» ở luật hiển thị, nhật ký, nhập liệu (§6.2)`.

### Task 6: Câu chữ cố định của trang + luật việc của dòng (thuần)

**Files:**
- Modify: `src/shared/hoa-hong-hien-thi.ts`, `src/shared/hoa-hong-hien-thi.test.ts`

**Interfaces — Produces** (mọi câu nguyên văn đặc tả; bài ghim trích «nguyên văn §x»):
```ts
export const cauTieuDeDai: (n: number) => string;            // §5.1 Tiêu đề
export const CAU_THAN_DAI: string;                           // §5.1 Thân
export function cauDongLoaiDai(ten: string, kq: KetQuaPhu, sapApTu: string | null): string; // §5.1 «Mỗi loại một dòng» + phụ chú §4.2
export const cauLoaiTatDai: (m: number) => string;           // §5.1 Loại đã tắt
export const CAU_DAI_CHUA_KIEM: string;                      // §5.1 Chưa kiểm được
export function cauNhacCap(kq: KetQuaCap): string | null;    // §4.3 (tối đa 3 tên, «và <k> dịch vụ khác»)
export const CAU_O_TRONG: string;                            // §5.4
export const hopKhoaCap: (ten: string) => { tieuDe: string; hauQua: string; nhanNguyHiem: string }; // §5.2
export const hopTatLoai: (ten: string) => { tieuDe: string; hauQua: string; nhanNguyHiem: string }; // §5.2
export const NHAN_CAP_DA_KHOA: string;                       // §5.2 huy hiệu cấp khoá
export const CAU_XUNG_DOT: string;  export const NHAN_XUNG_DOT = "Xung đột mức"; // §3 bảng vùng, dòng «mở một đối tác»
export const CAU_DUOI_DS_DOI_TAC: string;                    // §3 đoạn dưới bảng vùng
export const CAU_KHONG_THAY_DONG: string;                    // §3.3 toast
export type Viec = "DOI" | "SUA" | "NGUNG";
export function viecDongMuc(d: CommissionRuleDto, v: { homNay: string; capDangBat: boolean | null; ghi: boolean; sua: boolean }): Viec[];
export function viecLanGan(g: { tuNgay: string; denNgay: string | null; conHieuLuc: boolean; daHuy?: boolean }, v: { homNay: string; ghi: boolean; sua: boolean; coDoi: boolean }): Viec[];
export const thuTuMenu: (viec: readonly Viec[], dienThoai: boolean) => Viec[]; // điện thoại: DOI đầu
export type TheHoaHong = "cap" | "loai" | "doi-tac";
export const docThe: (gia: string | null) => TheHoaHong;     // giá trị lạ / cũ ⇒ "cap"
```
`viecDongMuc`: «Đổi»/«Ngừng» theo `nutDoiNgung`, «Sửa» theo `nutSua` và `v.sua`; `ghi === false` ⇒ `[]`; `capDangBat === false` (dòng của cấp đang khoá) ⇒ bỏ `DOI`, `SUA` (§3.1 «Cấp đang khoá»). `viecLanGan` dùng chung cho lần xếp loại (`coDoi: true`) và cấp riêng (`coDoi: false` ở phần 1, `true` ở phần 2); không lọc theo cấp khoá.

- [ ] **Step 1: Bài đỏ** — một ca ghim nguyên văn cho mỗi hằng/hàm câu; `cauDongLoaiDai` hai dạng (chưa có mức nào / thiếu n có «và k dịch vụ khác» khi n > 3) và phụ chú; `cauNhacCap` ra năm câu của bảng §4.4 «Câu nhắc cấp» (T2, T3, T4, T6; T1 ⇒ `null`); `assert.ok(!/mở khoá|tự động/u.test(...))` trên mọi câu §5.1; `viecDongMuc`: dòng cấp khoá đang áp ⇒ `["NGUNG"]`; Bán hàng ⇒ `[]`; dòng sắp áp ⇒ `["SUA"]`; `viecLanGan` lần xếp đang áp ⇒ `["DOI","SUA","NGUNG"]`; `thuTuMenu(["SUA","NGUNG","DOI"], true)[0] === "DOI"`; `docThe("ap-dung") === "cap"`, `docThe("thiet-lap") === "cap"`, `docThe(null) === "cap"`, `docThe("doi-tac") === "doi-tac"`.
- [ ] **Step 2:** Chạy ⇒ đỏ; viết ⇒ xanh. Ca cũ của tệp bài không đổi.
- [ ] **Step 3:** `npm test`, `npm run typecheck`; commit `feat(hoa-hong): câu cố định §5 và luật việc của dòng (thuần)`.

### Task 7: Khung ba thẻ + dải cảnh báo

**Files:**
- Modify: `public/hoa-hong.html` (thân: ba `role="tab"` của `.tab-phu`, ba `tabpanel` `#hh-the-cap`, `#hh-the-loai`, `#hh-the-doi-tac`, vùng dải `#hh-dai`), `web/hoa-hong.ts` (`THE`, `docThe`, phím mũi tên/Home/End như hôm nay, `sessionStorage` khoá `hh-the`), `src/shared/huong-dan-ke-toan.ts` (bỏ chữ thẻ «Mức đang áp dụng», «Thiết lập»)
- Create: `web/hoa-hong-dai.ts`

**Interfaces:**
- Consumes: Task 2 `phuMucLoai`, `demDai`, `DichVuPhu`; Task 6 câu §5.1.
- Produces: `export function veDai(goc: HTMLElement, d: DuLieuHoaHong): void` (`.dai[data-tong="cat"]`, ẩn hẳn khi không có gì để báo). `DuLieuHoaHong` thêm `dichVuPhu: DichVuPhu[] | null` (null khi `dm.loi !== null`).
- Tạm (ghi nhật ký): thẻ «Các cấp đại lý» vẽ `veThietLap`, thẻ «Loại đối tác» vẽ `veBangApDung`, thẻ «Riêng từng đối tác» vẽ mục «đối tác» cũ của `hoa-hong-bang.ts`; Task 8–10 thay từng thẻ. Tra nhanh đứng trên ba thẻ.

- [ ] **Step 1:** Bài thuần cho phần quyết định đã có ở Task 2/6 (`docThe`, `demDai`). Thêm ca `test("dải: danh mục lỗi ⇒ chỉ câu chưa kiểm, không số")` nếu `veDai` gọi một hàm thuần chọn câu — đặt hàm đó (`cauDai(ds): string[]`) ở `hoa-hong-hien-thi.ts` cùng bài.
- [ ] **Step 2:** Dựng khung và `veDai`; cập nhật hướng dẫn cho khớp ba thẻ.
- [ ] **Step 3:** `npm run build:web` thành công.
- [ ] **Step 4:** `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(hoa-hong): khung ba thẻ và dải cảnh báo phủ mức`.

### Task 8: Thẻ «Các cấp đại lý» — ma trận, chi tiết cấp, «⋯», Khoá cấp

**Files:**
- Create: `web/hoa-hong-cap.ts`, `web/hoa-hong-menu.ts`
- Modify: `src/shared/hoa-hong-hien-thi.ts` (+ `.test.ts`: `maTranCap`), `web/hoa-hong.ts`, `web/hoa-hong-hop.ts` (nhãn, tiêu đề hộp theo chữ mới), `web/hoa-hong-thiet-lap.ts` (bỏ phần cấp), `public/app.css` (khối `.hh-*` mới, chỉ token), `src/shared/huong-dan-ke-toan.ts` (mục «Chính sách hoa hồng» viết lại theo §6.2 gạch 3 và nút mới)

**Interfaces:**
- Produces:
  ```ts
  // src/shared/hoa-hong-hien-thi.ts
  export interface OMaTran { nhan: string[] | null }       // null ⇒ «—»
  export function maTranCap(v: { muc: readonly MucTaDto[]; dichVu: readonly { code: string; name: string; groupCode: string | null }[]; nhom: readonly { code: string; name: string }[]; homNay: string }):
    { cot: { code: string; ten: string; dangBat: boolean }[]; hang: { phamVi: "ALL" | "GROUP" | "SERVICE"; code: string | null; ten: string; o: OMaTran[] }[] };
  // web/hoa-hong-menu.ts
  export function nutViecKhac(tenDong: string, mo: () => void): HTMLButtonElement; // «⋯», aria-haspopup="dialog", aria-label="Việc khác: <tên dòng>"
  export function moViecKhac(o: { tenDong: string; viec: { nhan: string; chay: () => void }[]; opener: HTMLElement }): void; // moBangTruot, nút .nut[data-cap="phu"]
  // web/hoa-hong-cap.ts
  export function veTheCap(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void;
  export function moChiTietCap(code: string): HTMLElement | null; // Task 11 dùng
  ```
- `maTranCap`: cột xếp theo tên `localeCompare(…, "vi", { numeric: true })`; ô = dòng còn áp **hoặc** sắp áp của cấp đúng phạm vi đó (`nhanMucDto`, kèm «từ <ngày>» khi sắp áp), không có dòng ⇒ `null`, **không kế thừa** từ phạm vi rộng hơn (Q-4, T8). Hàng: «Mọi dịch vụ» luôn có; hàng nhóm, rồi hàng dịch vụ, chỉ hiện khi ít nhất một cấp có dòng ở hàng đó (lựa chọn tự áp, ghi nhật ký).
- Chi tiết một cấp (đặc tả §3 bảng vùng, §3.1, §4.3, §5.2): tên, huy hiệu (`la` «Đang áp dụng» / `cat` `NHAN_CAP_DA_KHOA`), câu `cauNhacCap`, số loại và số đối tác theo cấp (đếm `ganRieng` theo mã cấp), bảng «Mức của cấp» (dịch vụ · cách tính · mức NL · TE · NCT khi có `theoLoai` · «Từ … · đến …» của **dòng**), lần xếp loại (khối lịch sử có sẵn `khoiLichSuGan`), nút «Áp dụng cấp cho loại», «＋ Thêm mức vào cấp», «Khoá cấp»/«Mở lại cấp» (hộp `hoiXacNhan(hopKhoaCap(ten))`; mở lại không hỏi). Cấp khoá: không «Áp dụng cấp cho loại», không «Thêm mức»; ô chọn cấp ở hộp Sửa/Đổi chỉ liệt kê cấp đang mở. Nút việc: máy tính «Đổi» thấy sẵn + «⋯» cho phần còn lại; điện thoại chỉ «⋯» (Q-6, §3.2). Câu `CAU_THU_TU_AP_MUC` và `CAU_O_TRONG` dưới ma trận.
- Khổ (Q-11): ≥ 900 ma trận đủ cột, bọc khung cuộn ngang riêng khi > 5 cấp; < 900 (gồm 641–899) danh sách theo từng cấp, chọn cấp bằng `.tab-phu[data-kieu="vien"]`.

- [ ] **Step 1: Bài đỏ `maTranCap`** — `test("tiêu chí 1: cấp chỉ có dòng nhóm G1 ⇒ ô Mọi dịch vụ và ô dịch vụ của G1 là null")`; `test("cột theo tên, so số tự nhiên: Cấp 2 trước Cấp 10")`; `test("dòng sắp áp có nhãn từ ngày; dòng đã ngừng, đã huỷ không vào ô")`.
- [ ] **Step 2:** Chạy ⇒ đỏ; viết `maTranCap` ⇒ xanh.
- [ ] **Step 3:** Dựng `web/hoa-hong-menu.ts`, `web/hoa-hong-cap.ts`; thay phần tạm của thẻ cấp ở `web/hoa-hong.ts`; đổi nhãn trong `hoa-hong-hop.ts` («Đổi cấp», «Áp dụng cấp cho loại», «＋ Thêm cấp đại lý», «＋ Thêm mức vào cấp»); hướng dẫn mục «Chính sách hoa hồng» viết lại (tiêu đề mới «Cấp đại lý»), mọi `[[…]]` khớp nhãn mới.
- [ ] **Step 4:** `npm run build:web`; `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(hoa-hong): thẻ Các cấp đại lý — ma trận, chi tiết cấp, Khoá cấp, menu việc khác`.

### Task 9: Thẻ «Loại đối tác»

**Files:**
- Create: `web/hoa-hong-loai.ts`
- Modify: `web/hoa-hong.ts`, `web/hoa-hong-bang.ts` / `web/hoa-hong-thiet-lap.ts` (bỏ phần đã chuyển), `public/app.css` (nếu cần, chỉ token), `src/shared/huong-dan-ke-toan.ts` (mục «Thêm loại đối tác» nếu nhãn/chỗ đổi)

**Interfaces:**
- Consumes: `phuMucLoai`, `xepTheoPhu` (Task 2); `cauDongLoaiDai`, `hopTatLoai`, `viecDongMuc`, `viecLanGan` (Task 6); `nutViecKhac`, `moViecKhac` (Task 8); `chinhSachCuaLoai`, `nhanLoaiDoiTac` có sẵn.
- Produces: `export function veTheLoai(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void`; mỗi cụm loại mang `data-loai="<code>"` và dòng mức mang `data-dong-id` (Task 11 dùng).
- Mỗi loại: tên + «Có sẵn» khi `coSan`; huy hiệu theo bảng §4.2 (`TAT` xam «Đã tắt», `DU` la «Đang áp dụng», `KHONG_CO` do «Chưa có mức», `THIEU` cat «Thiếu mức n dịch vụ», `CHUA_KIEM` không huy hiệu); phụ chú sắp áp; cấp đang theo + «Áp dụng từ» (`chinhSachCuaLoai`) với nút «Áp dụng cấp cho loại» / «Đổi cấp» / «Ngừng áp dụng» / «Sửa»; mức riêng của loại (dòng đích VAI) với Đổi · Sửa · Ngừng; nút «Tắt» qua `hoiXacNhan(hopTatLoai(ten))`, «Bật» không hỏi; loại `coSan` không nút, có `CAU_LOAI_CO_SAN`. Thứ tự `xepTheoPhu` (thay `xepLoai`; **không xoá** `xepLoai` và bài của nó — tiêu chí 6). Loại tắt mà không còn dòng riêng thì vẫn hiện (trạng thái `TAT`), khác hôm nay.

- [ ] **Step 1:** Phần quyết định đã có bài ở Task 2/6. Nếu cần hàm thuần mới (ví dụ chọn huy hiệu theo `KetQuaPhu`: `huyHieuPhu(kq): { tong: "xam"|"la"|"do"|"cat"; chu: string } | null`), thêm vào `hoa-hong-hien-thi.ts` kèm bài đỏ trước: năm kết quả ⇒ đúng tông và chữ §4.2.
- [ ] **Step 2:** Dựng `veTheLoai`, thay phần tạm; `npm run build:web`.
- [ ] **Step 3:** `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(hoa-hong): thẻ Loại đối tác theo luật phủ mức, hộp Tắt loại`.

### Task 10: Thẻ «Riêng từng đối tác» + «Đặt cấp riêng cho đối tác»

**Files:**
- Create: `web/hoa-hong-doi-tac.ts`
- Modify: `web/hoa-hong.ts`, `web/hoa-hong-hop.ts` (`MoHop` thêm ba hộp), `web/hoa-hong-bang.ts` (bỏ phần đã chuyển), `src/shared/huong-dan-ke-toan.ts` (câu đặt cấp riêng ngay trên trang; dòng 228 lệch ADR-0141 bỏ hoặc viết lại — §6.2 gạch 3, §10), `docs/SYSTEM-DESIGN.md` §9 (trang `/hoa-hong` nay gọi thêm `GET /api/pricing/nguoi-huong`, `GET /api/pricing/ho-so/:id/hoa-hong` và ba route ghi cấp riêng)

**Interfaces:**
- Produces:
  ```ts
  // web/hoa-hong-hop.ts — MoHop thêm
  datCapRieng(dien?: { partyId: string; ten: string }): void;            // POST /api/pricing/ho-so/:id/muc-rieng, tìm bằng taoTimDoiTac({ choPhep: coTheTimDoiTac(nguoiDung) })
  suaCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void;          // GET rồi POST /api/pricing/muc-rieng/:id/sua (khuôn suaApDung)
  ngungCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void;        // POST /api/pricing/muc-rieng/:id/ket-thuc
  // web/hoa-hong-doi-tac.ts
  export function veTheDoiTac(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void;
  export function moDoiTac(partyId: string): Promise<HTMLElement | null>; // Task 11 dùng; mở cụm và nạp GET /ho-so/:id/hoa-hong
  ```
- Danh sách: `ghepDoiTacRieng` (tên, có mức riêng, tên cấp riêng), **không** cột loại, **không** nhãn xung đột (Q-9); câu `CAU_DUOI_DS_DOI_TAC` dưới danh sách; nút chính «Đặt cấp riêng cho đối tác» (chỉ `can(…, "partner.commission.write")`). Mở một đối tác: gọi `GET /api/pricing/ho-so/:id/hoa-hong` mỗi lần mở; hiện các loại kèm cấp (`vai`), huy hiệu `do` `NHAN_XUNG_DOT` + `CAU_XUNG_DOT` khi `xungDot`, dòng mức riêng (lấy từ `d.dong`, đích `DOI_TAC`), cấp riêng hiện hành và lịch sử `ganRieng` (`khoiLichSuGan`), nút theo `viecLanGan(g, { coDoi: false, … })` trên `HoaHongHoSoResponse.ganRieng[]` (§3.1 đoạn cuối). Ghi xong: vẽ lại từ `HoaHongHoSoResponse` route trả và `napLai()`. Câu lỗi 400/409 hiện nguyên văn trong hộp (tiêu chí 5).

- [ ] **Step 1:** Nếu thêm hàm thuần (ví dụ chọn cấp hiện hành từ `ganRieng`), bài đỏ trước ở `hoa-hong-hien-thi.test.ts`.
- [ ] **Step 2:** Dựng thẻ và ba hộp; sửa hướng dẫn và `SYSTEM-DESIGN.md` §9; `npm run build:web`.
- [ ] **Step 3:** `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(hoa-hong): thẻ Riêng từng đối tác, đặt / sửa / ngừng cấp riêng ngay trên trang`.

### Task 11: «Xem dòng ↓» theo ba thẻ + dọn mã cũ

**Files:**
- Modify: `web/hoa-hong-tra-nhanh.ts`, `web/hoa-hong.ts`, `web/hoa-hong-bang.ts` (bỏ `cuonToiDong` và phần đã chuyển; giữ `dongMuc`, `urlNgung`, `dauBang` nếu còn dùng), `web/hoa-hong-thiet-lap.ts` (xoá nếu không còn dùng)
- Modify: `src/shared/hoa-hong-hien-thi.ts` (+ `.test.ts`): `theChoKetQua`

**Interfaces:**
- Produces: `export function theChoKetQua(k: ThuTraResponse["ketQua"]): { the: TheHoaHong; dongId: string; doiTuong: { loai: "DOI_TAC"; partyId: string } | { loai: "VAI" | "MUC"; code: string }; capRieng: boolean } | null` — `null` khi `trangThai !== "SET"`; `capRieng` true khi `bac` 10–12 (§3.3 bảng). `web/hoa-hong.ts` xuất `nhayToiDong(k)`: chuyển thẻ (ghi `sessionStorage`), mở cụm/chi tiết (`moDoiTac`, cụm `data-loai`, `moChiTietCap`), đưa bộ lọc về mặc định và thử lại khi dòng bị giấu, đặt tiêu điểm vào dòng; không thấy ⇒ `hienBaoNgan(CAU_KHONG_THAY_DONG, { tong: "bien" })`. Bậc 10–12 thêm dòng chữ «— cấp riêng của đối tác đang tra».

- [ ] **Step 1: Bài đỏ** — `theChoKetQua`: bậc 2 ⇒ `doi-tac`; bậc 5 ⇒ `loai`; bậc 8 ⇒ `cap`, `capRieng false`; bậc 11 ⇒ `cap`, `capRieng true`; `MISSING` ⇒ `null`.
- [ ] **Step 2:** Chạy ⇒ đỏ; viết ⇒ xanh; nối Tra nhanh (nút «Xem dòng ↓» chỉ khi `SET`).
- [ ] **Step 3:** Xoá mã chết; `grep -n "coMuc\|cuonToiDong" web/` không còn chỗ dùng (hàm `xepLoai` ở `src/shared` và bài của nó giữ nguyên).
- [ ] **Step 4:** `npm run build:web`; `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(hoa-hong): Xem dòng nhảy đúng thẻ, toast khi không thấy dòng`.

### Task 12: Danh bạ + hướng dẫn còn lại + bảng từ lượt 6 (luật cấm theo tệp)

Task này đi **cuối** phần đổi chữ vì luật mới chỉ xanh khi chuỗi «chính sách» cuối cùng đã đi.

**Files:**
- Modify: `web/parties.ts` (30 chuỗi, chỉ chữ), `src/shared/huong-dan-ke-toan.ts` (chuỗi còn lại), `src/shared/bang-tu-giao-dien.ts`, `src/bang-tu-giao-dien.test.ts`, kịch bản `docs/evidence/2026-09-28-t2b/kich-ban/t2b-danh-ba-smoke.mjs`, `docs/evidence/2026-09-22-buoc-2-dot-a/kich-ban/dot-a-smoke.mjs` và mọi kịch bản khác mà grep thấy ghim chữ cũ của Danh bạ

**Interfaces:**
- Produces (đặc tả §6.2 gạch «bang-tu-giao-dien.ts»):
  ```ts
  export interface CamTheoTep { tep: readonly RegExp[]; cam: RegExp; thay: string; nguon: string }   // tep: mẫu đường dẫn
  export const CAM_THEO_TEP: readonly CamTheoTep[];
  export const CHO_PHEP_THEO_TEP: readonly { tep: string; manh: string; soLan: number; ly_do: string }[];
  // src/bang-tu-giao-dien.test.ts
  export function viPhamTheoTep(duongDan: string, noiDung: string): { dong: number; chu: string }[]; // mảnh khớp `cam` không nằm trong danh sách cho phép; dùng chuoiTrongMa
  ```
- Bộ tệp, biểu thức, mục cho phép, chú thích cạnh `CAM_THEO_TEP`: **nguyên văn §6.2 (2)**. Hai mục 6a, 6b thêm vào `TU_DA_LOAI` nguyên văn §6.2 (1). Viết lại `thay` của ba dòng lượt 3 theo §6.2 gạch «Viết lại `thay` của lượt 3».

- [ ] **Step 1:** Đổi 30 chuỗi ở `web/parties.ts` theo luật đổi §6 (Danh bạ không thêm nút — ADR-0151 «Tệp được chạm»); sửa kịch bản ghim chữ cũ; hướng dẫn: mọi chuỗi «chính sách» còn lại.
- [ ] **Step 2: Bài đỏ** — trong `bang-tu-giao-dien.test.ts`:
  - `test("lượt 6 ca âm")` — các câu ca âm §6.2 không khớp 6a/6b; hai mảnh «chính sách » đọc thật từ `src/modules/pricing/index.ts` qua `chuoiTrongMa` đi qua đúng danh sách cho phép.
  - `test("lượt 6 ca dương")` — mỗi «câu hôm nay» có chữ «chính sách» của bảng §6.1, đặt trong nội dung giả `const x = "<câu>";` với đường dẫn giả `web/hoa-hong-gia.ts`, ⇒ `viPhamTheoTep(...)` khác rỗng. Ba câu không chứa «chính sách» (`:69`, `:221`, `:454`) không vào ca này (đã ghim ở Task 4).
  - `test("lượt 6: bộ tệp hoa hồng không còn «chính sách» theo nghĩa cấp")` — mọi tệp thật khớp `CAM_THEO_TEP` ⇒ `[]`, báo `tệp:dòng` khi đỏ; rồi đếm mảnh cho phép: đúng `soLan` (2).
- [ ] **Step 3:** Chạy ⇒ đỏ; viết `CAM_THEO_TEP`, `CHO_PHEP_THEO_TEP`, 6a, 6b, `viPhamTheoTep` ⇒ xanh. Bài toàn cục cũ (`TU_DA_LOAI`) cũng xanh: 6a, 6b bắt 0 chuỗi trên mọi tệp.
- [ ] **Step 4: P16** — (i) trả một chuỗi «Chính sách riêng» vào `web/parties.ts` ⇒ hai bài đỏ (theo tệp và 6b); (ii) thêm chỗ thứ ba `` `chính sách ${x}` `` vào `pricing/index.ts` ⇒ bài đếm đỏ; (iii) xoá một trong hai chỗ ⇒ đỏ. Hoàn nguyên; ghi nhật ký. Ghi thêm `docs/SO-HANG-RAO.md` một dòng cho luật cấm theo tệp (chặn gì, cơ chế, ngày quan sát chặn thật).
- [ ] **Step 5:** `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(bang-tu): lượt 6 — cấm «chính sách» theo bộ tệp hoa hồng; Danh bạ và hướng dẫn theo chữ mới`.

### Task 13: Nhật ký thay đổi phần 1

**Files:**
- Modify: `src/shared/changelog.ts` (mục mới ở đầu, số **2.48 tạm**, ngày tạm), `src/shared/app-info.test.ts` (dòng ghim phiên bản)

- [ ] **Step 1:** Sửa bài ghim `app-info.test.ts` sang «Phiên bản 2.48 · …» ⇒ đỏ.
- [ ] **Step 2:** Thêm mục, lời thường, chữ mới (không «chính sách»): ba thẻ; dải báo loại thiếu mức theo từng dịch vụ; đặt cấp riêng ngay trên trang; «Khoá cấp» kèm hộp nói rõ vẫn chi; đổi tên «Chính sách hoa hồng» thành «Cấp đại lý». Chú thích: số và ngày tạm, phiên phát hành kiểm lại ở bước A.0 (`docs/HANDOFF-N1.md`); nếu phần 2 phát hành cùng lần thì Task 17 thêm dòng vào **chính mục này**.
- [ ] **Step 3:** `npm test`, `npm run typecheck`; commit `docs(changelog): mục 2.48 (tạm) — trang Hoa hồng theo cấp đại lý`.

### Task 14: Bằng chứng giao diện phần 1

**Files:**
- Modify: `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` (sửa có chủ đích; đầu tệp kể tên từng bước đổi và vì sao)
- Create: `docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/` (ảnh, `ket-qua-phan-1.md` ghi lệnh + dòng kết quả)
- Modify: nhật ký (mục «Mốc cuối phần 1» = hash của commit Task 13)

- [ ] **Step 1:** Viết lại các bước của `hoa-hong-smoke.mjs` theo trang mới, mỗi bước chạy ở 390 và 1040:
  - Kế toán: ba thẻ, phím mũi tên; dải đếm đúng trên dữ liệu dựng bằng API (ít nhất một loại `KHONG_CO`, một `THIEU`, một tắt); câu dải nguyên văn §5.1.
  - Ma trận: có hàng nhóm; ô trống «—» + câu §5.4; > 5 cấp ⇒ 1040 cuộn trong khung bảng, 390 danh sách theo cấp.
  - Khoá cấp: hộp đúng nguyên văn §5.2, huy hiệu `cat`; dòng mức của cấp khoá chỉ «Ngừng» ở nút và trong «⋯»; lần xếp của cấp đó «Đổi cấp» sang cấp khác ⇒ 200 (tiêu chí 4).
  - Tắt loại: hộp §5.2, huy hiệu `xam`.
  - «⋯»: Tab tới nút, Enter mở, tiêu điểm vào khung, Tab tới nút đầu; Esc đóng, tiêu điểm về «⋯»; `aria-haspopup="dialog"`; nền `inert` khi mở (tiêu chí 8).
  - Đặt, sửa, ngừng cấp riêng ngay trên trang; một ca 409 chồng ngày hiện câu mới §6.1 nguyên văn (tiêu chí 5).
  - «Xem dòng ↓» ba ca §3.3 (kể cả bậc 10–12) và toast khi dòng không còn (xoá dòng bằng API giữa chừng).
  - Bán hàng: thấy trang, không nút ghi nào (kể cả trong «⋯»); Đối tác mở **sau cùng** ⇒ 403 (tiêu chí 7).
  - Mọi bước: `scrollWidth ≤ innerWidth`, vùng chạm ≥ 44px, ô gõ ≥ 16px, axe không lỗi critical/serious, không chữ Anh/mã thô, không «chính sách» trong chữ nhìn thấy.
- [ ] **Step 2:** Chạy, mỗi lệnh ghi dòng cuối vào `ket-qua-phan-1.md`:
  - `npm run build:web`
  - `npm run test:e2e -- pwa` (quét token CSS) và `npm run test:e2e -- sua-muc` (cần mạng; không có mạng ⇒ ghi «chưa kiểm», không ghi đạt)
  - `AXE_JS=… CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/anh node docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` ⇒ «HOA HONG SMOKE OK»
  - `a2-smoke-form.mjs` (`docs/evidence/2026-09-20-a2/kich-ban/`), `t2b-danh-ba-smoke.mjs`, `dot-a-smoke.mjs` (ghi rõ bước «nhat-ky» đỏ sẵn từ ADR-0038, theo `web/CLAUDE.md`)
  - `node scripts/chup-muc-giao-dien.mjs --so-sanh 20ffe9ad` ⇒ kỳ vọng không khác (trang này không đổi menu). Khác ⇒ dừng, ghi nhật ký, làm theo đầu tệp `src/muc-giao-dien-hien-trang.test.ts`; không `--ghi` mù.
  - `node scripts/sinh-so-do-trang.mjs` ⇒ `git status` không còn thay đổi ở `src/shared/so-do-trang.ts`.
  - Bài Hướng dẫn và Trợ lý: `node --test src/shared/huong-dan.test.ts` và các bài `src/tro-ly*.test.ts` (đã nằm trong `npm test`).
- [ ] **Step 3:** P16 của kịch bản: chạy một lần với `HH_PHA=lo-nut` ⇒ bước Bán hàng đỏ; ghi nhật ký.
- [ ] **Step 4:** Thiếu Chrome hoặc `AXE_JS` ⇒ ghi «chưa kiểm» từng bước bị thiếu, không giả đạt.
- [ ] **Step 5:** `npm test`, `npm run typecheck`; commit `test(hoa-hong): kịch bản Chrome và bằng chứng giao diện phần 1`.

---

## Phần 2 — «Đổi cấp» cho cấp riêng (ADR-0151)

Danh sách tệp **duy nhất** của phần 2 là ADR-0151 mục «Tệp được chạm». Tệp ngoài danh sách mà task buộc phải chạm (tệp sinh, `app-info.test.ts`, nhật ký, bằng chứng) ghi vào nhật ký mục «Lệch so với kế hoạch».

### Task 15: Route `POST /api/pricing/muc-rieng/:id/doi` + bài route + bài ghim hai phía

**Files:**
- Modify: `src/modules/pricing/repository.ts`, `src/modules/pricing/index.ts`, `src/route-access.test.ts`, `src/lan-gui-phu-route.test.ts`
- Create: `src/modules/pricing/doi-cap-rieng.test.ts` (khuôn `doi-chinh-sach.test.ts`, khung thử `tests/audit/harness.mjs`)

**Interfaces:**
- Produces:
  ```ts
  // repository.ts — cạnh cauDoiChinhSach
  const GAN_RIENG_DOI_THEM = defineSql("pricing", "party_tier_change_insert", /* khuôn GAN_DOI_THEM: valid_from_date = CASE WHEN changes() > 0 THEN ?4 END, valid_to_date NULL, không replaces_id, không lý do */);
  export const cauDoiCapRieng: (db: D1Database, cuId: string, moiId: string, denNgayCu: string, partyId: string, tierCode: string, tuNgay: string, at: string, by: string) => D1PreparedStatement[];
  //   = [db.prepare(GAN_RIENG_DONG).bind(cuId, denNgayCu, at, by, null), db.prepare(GAN_RIENG_DOI_THEM).bind(moiId, partyId, tierCode, tuNgay, at, by)]
  // index.ts — KHÔNG xuất
  function xetTruocDoiCapRieng(cu: { validFrom: string; validTo: string | null; daHuy: boolean }, tuNgay: unknown, homNay: string): string | null; // X1 / X2 / null
  ```
- `index.ts` thêm `ngayDayDu` vào dòng nhập `../../shared/vn-date` (hôm nay chỉ nhập `vnToday` — QA1-LAN-5).
- Thứ tự route đúng ADR-0151 Đ3: quyền (`can(staff, "partner.commission.write") && !holdsPartner(staff)`, ngược lại `FORBIDDEN()`) → `PARTY_RE` + `partyTierById` (không có ⇒ 404 câu mới §6.1 «Không tìm thấy cấp riêng này.») → `kiemThanDoiChinhSach` (400) → `ngayChupCua(hoiDaChup, qGanRieng(row))` (503 khi vắng) → **`xetTruocDoiCapRieng`** (400 `invalid_input`, câu X1/X2 nguyên văn ADR-0151 Đ3) → `kiemDoi({ cu: dongCoNgay(row), tuNgay, homNay, ngayChup })` (400 câu của luật) → cấp trùng (400) → `timMuc` (404 `MUC_KHONG_CO`) → `chayLo([...cauDoiCapRieng(...), nhật ký prc_party_tier_closed, nhật ký prc_party_tier_set])`, hai nhật ký điều kiện `"changes() > 0"`, chi tiết khuôn Đ6 (`mức riêng <tên> · đến <ngày>` / `· từ <ngày>`) → lưới dự phòng `dongDaDong(res)` ⇒ 409 `stale` → 200 `json(await hoaHongHoSo(env.DB, row.party_id))`. Không thêm nhánh nào ở `loiBang`.
- X1/X2 chép đúng điều kiện bảng ADR-0151 Đ3. **Ghi chú cho người đọc (QA1-LAN-5):** gộp ba điều kiện `cu.validFrom <= homNay`, `tuNgay >= homNay`, `cu.validFrom >= tuNgay` thì X2 chỉ bắn khi `validFrom = tuNgay = homNay`. Ghi một dòng chú thích ngay trên `xetTruocDoiCapRieng`.

- [ ] **Step 1: Bài đỏ** trong `doi-cap-rieng.test.ts` (ADR-0151 tiêu chí 1; H = `vnToday(new Date())`, dựng ngày bằng `addDays`):
  - `test("đổi từ hôm nay: cũ ngừng hôm qua, mới mở từ hôm nay; Thử tra ra bậc 10–12 của cấp mới; 200 HoaHongHoSoResponse")`.
  - `test("cấp trùng 400; cấp khoá 409 muc_tat đúng câu mới §6.1 :72; cấp không có 404; thân sai 400; không ghi gì")`.
  - `test("hồ sơ thôi mang loại được hưởng ⇒ 400, không ghi gì")`.
  - `test("đã có đơn chụp tới X ⇒ tuNgay ≤ X bị chặn, câu nguyên văn kiemDoi")` (tiêm ngày chụp theo khuôn `sua-muc-route.test.ts`).
  - `test("thiếu hàm tiêm đã chụp chưa ⇒ 503 chua_kiem_chup")`.
  - `test("cấp cũ đang khoá: đổi sang cấp khác 200; Sửa dòng mới về cấp cũ đang khoá ⇒ 409 muc_tat (giới hạn Đ8)")`.
  - `test("ghim hai phía X1/X2 ⇔ kiemDoi")` — **một bảng ca chung**, mỗi ca chạy cả `kiemDoi` (nhập từ `./rules.ts`) lẫn route trên một dòng cấp riêng dựng đúng ngày đó; đòi: `kiemDoi` ra câu «đã có ngày ngừng» ⇔ route ra X1; `kiemDoi` ra câu khuôn «Mức cũ bắt đầu từ …» ⇔ route ra X2; mọi ca khác route ra đúng câu của `kiemDoi`, hoặc 200 khi `kiemDoi` cho qua. Các ca tối thiểu:
    | Ca | Dòng cũ | `tuNgay` | `ngayChup` | Mong đợi route |
    |---|---|---|---|---|
    | a | đã huỷ, không ngày ngừng | H | null | câu `CAU_DA_HUY` |
    | b | đã huỷ, có ngày ngừng | H | null | câu `CAU_DA_HUY` |
    | c | từ H−5, ngừng H+10 | H+1 | null | X1 |
    | d | từ H+3 (chưa tới ngày) | H+5 | null | câu «chưa tới ngày» |
    | **e (ca giao nhau)** | **từ H+3 (chưa tới ngày)** | **H+1 (H ≤ tuNgay ≤ validFrom)** | null | **câu «chưa tới ngày», KHÔNG phải X2** |
    | e2 | từ H+3 | H+3 | null | câu «chưa tới ngày» |
    | f | từ H−5 | `"abc"` | null | câu «không được trước hôm nay» |
    | g | từ H−5 | H−1 | null | câu «không được trước hôm nay» |
    | h | từ H | H | null | X2 (ca duy nhất X2 bắn) |
    | i | từ H | H+1 | null | 200 |
    | j | từ H−5 | H | null | 200 |
    | k | từ H−5 | H | H | câu «Đã có đơn dùng mức này…» |
    | l | từ H−5 | H+1 | H | 200 |
  - Ca **e** là ca bắt lỗi khi bỏ `cu.validFrom <= homNay` khỏi bước xét trước: thiếu nó thì sửa cố ý đó vẫn xanh (QA1-LAN-5).
- [ ] **Step 2:** Thêm dòng `{ method: "POST", path: "/api/pricing/muc-rieng/:id/doi", access: "office" }` vào `SNAPSHOT` của `route-access.test.ts`, số 393 ⇒ 394 kèm chú thích «2026-10-30 (ADR-0151): + POST /api/pricing/muc-rieng/:id/doi (office) = 394.»; `lan-gui-phu-route.test.ts` 234 ⇒ 235, nối vào chuỗi lý do «ADR-0151 (Đổi cấp riêng, 30/10): +1 POST /api/pricing/muc-rieng/:id/doi = 235 (đi qua lớp vé, không miễn; MỘT db.batch)». Chạy ⇒ đỏ.
- [ ] **Step 3:** Viết `GAN_RIENG_DOI_THEM`, `cauDoiCapRieng`, `xetTruocDoiCapRieng`, route. Nếu một bài sổ SQL (`sql-registry`, `architecture.test.ts`, EXPLAIN) đếm câu, cập nhật có chủ đích và ghi nhật ký.
- [ ] **Step 4:** Chạy ⇒ xanh. **P16:** (i) bỏ `cu.validFrom <= homNay` khỏi X2 ⇒ ca e đỏ; (ii) bỏ `cu.validTo !== null` khỏi X1 ⇒ đỏ. Hoàn nguyên; chép dòng đỏ vào nhật ký.
- [ ] **Step 5:** `git diff HEAD -- src/modules/pricing/rules.ts` rỗng. `npm test`, `npm run typecheck`; commit `feat(pricing): route Đổi cấp riêng một lô, xét trước X1/X2 (ADR-0151)`.

### Task 16: Quyền, đua thật, sổ hàng rào, tài liệu route

**Files:**
- Modify: `src/so-dai-ly-quyen-route.test.ts`, `src/modules/pricing/doi-cap-rieng.test.ts`, `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` (bảng route pricing)

- [ ] **Step 1: Bài** — `so-dai-ly-quyen-route.test.ts`: một `test(...)` **mới** (không thêm vào mảng `muoiHaiRoute`, giữ `ds.length === 12`), khuôn bài «tìm người hưởng (ADR-0141)»: Tài xế công ty, Tài xế đối tác, Nhân sự, HDV (`FIELD`), Đối tác, lai `["ACCOUNTING","PARTNER"]`, Bán hàng ⇒ 403 `forbidden`, đếm `prc_party_tier` và `audit_log` không đổi; Kế toán ⇒ 200.
- [ ] **Step 2: Bài đua** trong `doi-cap-rieng.test.ts`, khuôn «Đua thật qua route» của `doi-chinh-sach.test.ts`: dòng cũ bị ngừng ngay trước lô ⇒ 409 `stale`, không dòng mới, không nhật ký; sau cùng hồ sơ có đúng một cấp riêng hiệu lực ở mỗi ngày. Thêm ca đổi hai lần tuần tự: lần hai 400 câu X1 (dòng cũ đã có ngày ngừng).
- [ ] **Step 3: P16** — đổi `CASE WHEN changes() > 0 THEN ?4 END` thành `?4` ở `GAN_RIENG_DOI_THEM` ⇒ bài đua đỏ ⇒ hoàn nguyên. Ghi giờ và dòng đỏ vào nhật ký.
- [ ] **Step 4:** `docs/SO-HANG-RAO.md` thêm một dòng khuôn dòng «Đổi chính sách: câu chèn gắn mới có điều kiện `changes() > 0`», cho `cauDoiCapRieng` / `party_tier_change_insert`, ngày quan sát chặn thật = ngày ở Step 3. `docs/SYSTEM-DESIGN.md`: thêm route vào bảng route pricing.
- [ ] **Step 5:** `npm test`, `npm run typecheck`; commit `test(pricing): quyền và đua thật của Đổi cấp riêng; sổ hàng rào`.

### Task 17: Nút «Đổi cấp» ở thẻ một đối tác + hướng dẫn + bằng chứng phần 2

**Files:**
- Modify: `web/hoa-hong-hop.ts` (`MoHop.doiCapRieng`), `web/hoa-hong-doi-tac.ts`, `src/shared/hoa-hong-hien-thi.ts` (+ `.test.ts`), `src/shared/huong-dan-ke-toan.ts` (một câu về «Đổi cấp»), `src/shared/changelog.ts` (+ `src/shared/app-info.test.ts` nếu đổi số), `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` (bước «Đổi cấp»)
- Không chạm `web/parties.ts` (ADR-0151).

**Interfaces:**
- Consumes: route Task 15; `viecLanGan(g, { coDoi: true, … })` (Task 6); `nutViecKhac`/`moViecKhac` (Task 8).
- Produces: `doiCapRieng(g: Api.GanRiengLichSuDto, partyId: string): void` — hộp «Đổi cấp riêng», ô cấp chỉ liệt kê cấp đang mở và khác cấp cũ, ô «Từ» mặc định và sớm nhất theo `ngayDoiSomNhat(g.tuNgay, homNay)`, gửi `{ muc, tuNgay }` tới `POST /api/pricing/muc-rieng/:id/doi`, vẽ lại từ `HoaHongHoSoResponse`; câu lỗi máy chủ hiện nguyên văn trong hộp. Khi `g.muc.dangBat === false`, hộp hiện `cauCapCuDangKhoa(g.muc.ten)` = nguyên văn ADR-0151 Đ8 («Cấp cũ «<tên>» đang khoá. …»), thêm vào `hoa-hong-hien-thi.ts`.
- Nút hiện khi `coQuyenSua(nguoiDung)` và `nutDoiNgung` trên `HoaHongHoSoResponse.ganRieng[]` cho hiện (ADR-0151 «Trang ghép» hàng 3).

- [ ] **Step 1: Bài đỏ** — `cauCapCuDangKhoa("Cấp 3")` nguyên văn Đ8; `viecLanGan` của cấp riêng đang áp chưa có ngày ngừng với `coDoi: true` ⇒ có `"DOI"`; có ngày ngừng ⇒ không `"DOI"`.
- [ ] **Step 2:** Dựng nút + hộp; hướng dẫn thêm một câu «Đổi cấp» (`[[Đổi cấp]]` khớp nhãn có thật); changelog: thêm dòng vào mục 2.48 tạm của Task 13 (cùng lần phát hành), hoặc mục mới nếu phiên phát hành tách — ghi lựa chọn vào nhật ký.
- [ ] **Step 3:** Kịch bản: thêm bước «Đổi cấp» (390 + 1040): Kế toán đổi cấp riêng từ hôm nay ⇒ lịch sử có lần cũ ngừng hôm qua, lần mới; cấp cũ khoá ⇒ hộp có câu Đ8; lần có ngày ngừng không có nút «Đổi» (câu X1/X2 do bài route Task 15 ghim); một ca 409 (đổi sang cấp đang khoá bằng API chen giữa lúc mở hộp) hiện câu máy chủ nguyên văn trong hộp; Bán hàng không thấy nút. Chạy `npm run build:web`, kịch bản Chrome, ghi `docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/ket-qua-phan-2.md`.
- [ ] **Step 4:** `git diff <mốc cuối phần 1> --stat` (mốc ghi ở nhật ký) chỉ gồm tệp trong ADR-0151 «Tệp được chạm» + các lệch đã ghi; ghi kết quả vào nhật ký.
- [ ] **Step 5:** `npm test` (stage `so-do-trang.ts`), `npm run typecheck`; commit `feat(hoa-hong): nút Đổi cấp cho cấp riêng của đối tác (ADR-0151)`.

---

### Task 18: QA2 — người kiểm độc lập, chỉ đọc

Một phiên **khác** phiên thi công (N8), không sửa mã. Ghi mọi kết quả vào `docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/QA2.md` (và ảnh cùng thư mục); commit duy nhất của task chỉ gồm tệp bằng chứng. Mặc định **KHÔNG ĐẠT** khi thiếu bằng chứng.

- [ ] **Step 1:** Chạy lại `npm test`, `npm run typecheck`, `npm run build:web`, `npm run test:e2e -- pwa`, `npm run test:e2e -- sua-muc` (không mạng ⇒ «chưa kiểm»), `hoa-hong-smoke.mjs`, `a2-smoke-form.mjs`, `t2b-danh-ba-smoke.mjs`, `dot-a-smoke.mjs`, `node scripts/chup-muc-giao-dien.mjs --so-sanh 20ffe9ad`. Chép dòng kết quả.
- [ ] **Step 2:** Đối chiếu **từng** tiêu chí, mỗi dòng ĐẠT / KHÔNG ĐẠT / CHƯA KIỂM kèm bằng chứng (tệp:dòng, lệnh, ảnh):
  - Đặc tả §8 tiêu chí 1–9 (tiêu chí 9 theo hai phần: `git diff main...HEAD --stat` không chạm `migrations/`, `src/shared/permissions.ts`, `src/shared/contracts.ts`; phần 1 `git diff main...<mốc cuối phần 1> -- src/modules/ ':!*.test.ts'` chỉ khác trong chuỗi chữ; phần 2 `git diff <mốc cuối phần 1>..HEAD --stat` chỉ tệp ADR-0151).
  - ADR-0151 tiêu chí 1–8, gồm đọc ca **e** của bảng ghim và tự làm lại một P16 (bỏ `cu.validFrom <= homNay` ⇒ đỏ ⇒ hoàn nguyên, không commit).
  - `git diff main...HEAD -- src/modules/pricing/rules.ts` không chạm `kiemDoi`.
  - Mục nhật ký thay đổi có (§8 «Nhật ký thay đổi»); bài Hướng dẫn và Trợ lý xanh.
  - Nhật ký thi công có đủ dòng P16 đã hứa ở Task 3, 12, 15, 16 và kịch bản.
- [ ] **Step 3:** Kết luận riêng cho phần 1 và phần 2 (đặc tả §8 đoạn cuối). Danh sách «Chặn / Sửa / Ghi».
- [ ] **Step 4:** Commit `docs(hoa-hong): biên bản QA2 cấp đại lý`. Cổng phát hành (bộ đo Chặng 1 trước và sau, chủ duyệt) **không** thuộc kế hoạch này.

## Khe hở đặc tả gặp khi soạn (không đoán; chép vào «Việc treo» của nhật ký)

1. **Danh sách tệp phần 2 thiếu tệp buộc phải chạm.** ADR-0151 «Tệp được chạm» không có `src/shared/app-info.test.ts` (nếu phần 2 đổi số phiên bản), `src/shared/so-do-trang.ts` (tệp sinh, đổi khi thêm nhãn «Đổi cấp»), nhật ký thi công và tệp bằng chứng. Đọc đúng chữ tiêu chí 8 của ADR thì sẽ trượt. Kế hoạch coi các tệp này là lệch có ghi; chủ hoặc QA2 quyết.
2. **Gốc so sánh của «`git diff main --stat` phần 2» không định nghĩa** khi phần 1 chưa vào `main`. Kế hoạch dùng hash «Mốc cuối phần 1» ghi ở nhật ký (Task 14).
3. **Một hay hai lần phát hành** cho hai phần chưa chốt, nên chưa biết một hay hai mục nhật ký thay đổi. Kế hoạch mặc định một mục 2.48 tạm; phiên phát hành quyết.
4. **Tệp mới `src/shared/hoa-hong-phu-muc.ts` nằm ngoài bộ tệp của luật cấm theo tệp** (đặc tả §6.2 liệt kê tệp `src/shared/` theo tên). Kế hoạch giữ mọi chữ cho người dùng ở `hoa-hong-hien-thi.ts` để khe này không thành lỗ; không tự nới hay siết danh sách.
5. Kịch bản Chrome cần Chrome và `AXE_JS` ngoài repo; e2e cần mạng. Thiếu thì ghi «chưa kiểm», không tính đạt.
