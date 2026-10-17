# Màn Tạo đơn thiết kế lại: kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đổi cách vẽ và thao tác màn Tạo đơn (và bảng "Đổi khách") theo bản vẽ Claude Design 18/10/2026, không đổi luật nghiệp vụ, dữ liệu, quyền hay thân gửi lên máy chủ.

**Architecture:** Luật thuần mới (nhóm chọn một, chia mục, chữ dòng gập, phát hiện đối tác trùng số) đặt ở `src/shared/` có test `node --test`; giao diện `web/` chỉ dựng DOM bằng `h()` và gọi các hàm đó. `CatalogPicker`, `ServiceCard`, `BookerPicker` giữ nguyên giao diện công khai để `web/order-form.ts` đổi ít nhất.

**Tech Stack:** TypeScript, giao diện thuần (không React), esbuild, CSS token ở `public/app.css`, `node --test`, kịch bản Chrome `.mjs`.

**Spec:** `docs/superpowers/specs/2026-10-18-tao-don-thiet-ke-lai/DAC-TA.md` (kèm `PROMPT-CLAUDE-DESIGN.md`, `DE-XUAT-ADR-0130.md`); bản vẽ `docs/design/tao-don-2026-10-18/`.

## Global Constraints

- Tiếng Việt CÓ DẤU ở giao diện, thông báo, commit, tài liệu; gọi hệ thống là "Nền tảng"; không chữ Anh lộ ra người dùng, không mã trạng thái thô.
- Không `innerHTML` (dựng bằng `h()`); giá trị CSS đi vào token; **không đổi giá trị token có sẵn**, chỉ thêm token mới vào nhóm "Riêng của Tour Đảo Booking" của `public/app.css`; ô gõ 16px; vùng chạm ≥ 44px; trang khai `PAGES` nếu thêm trang (kế hoạch này không thêm trang).
- Không đổi: tiền tính ở server (`buildLines`), thân POST/PUT, `id`/`data-*` mà bài kiểm và kịch bản đang dùng (trừ chỗ task nói rõ), `coODatQuaDoiTac`, `GET /api/parties/lookup`, `GET /api/pricing/nguoi-huong`. Không migration. Không sửa `playbook/`, ADR đã duyệt, hồ sơ cũ.
- Tệp trong `src/shared/` import nhau **kèm đuôi `.ts`**; không import `src/modules/`.
- Nút: chính (nền xanh đậm) chỉ "Lưu, chờ xác nhận"; phụ (viền 1px); lối nhỏ (chữ xanh). San hô không dùng cho lỗi/xoá; cát không làm nền nút; không dark mode.
- Mỗi task: test đỏ trước, xanh sau; commit nhỏ, thân nói VÌ SAO, kết bằng dòng `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`. **Không `git push`, không merge** (chủ tự chạy `npm run day-len`).
- Thi công trong worktree riêng. Việc lớn (hiển thị tiền): người kiểm độc lập (`nguoi-kiem-doc-lap`) sau Task 8; người thi công không tự nghiệm thu.
- Số phiên bản changelog là số tạm; phiên phát hành quyết ở bước A.0.

## Review Focus

- Danh mục rỗng hoặc chưa đồng bộ được: khung danh sách hiện thông báo, không ném lỗi, hàng nhóm ẩn.
- Bộ nhớ trình duyệt bị chặn hoặc chứa JSON hỏng/nhóm đã xoá: về "Tất cả", không lỗi (Task 1).
- Gõ chữ không khớp dịch vụ nào: mọi nhóm mờ, khung nói "Không có dịch vụ nào khớp", vẫn xoá được bằng ✕ (Task 2).
- Hai hồ sơ trùng số điện thoại, một là đối tác một là khách: chỉ cảnh báo đối tác; `nguoi-huong` trả 403 hoặc lỗi mạng: không cảnh báo, không chặn lập đơn (Task 4).
- Mất mạng hoặc lỗi 400 khi Lưu: thẻ lỗi bị ép mở, lỗi hiện ngay trên nút Lưu, bản nháp không mất (Task 5, 8).

---

### Task 1: Luật thuần nhóm chọn một, chia mục, nhãn đếm

**Files:**
- Modify: `src/shared/loc-danh-muc.ts`
- Test: `src/shared/loc-danh-muc.test.ts`

**Interfaces:**
- Produces (dùng ở Task 2):
  - `docNhoMotNhom(raw: string | null, groups: readonly { code: string }[]): string` — `""` = Tất cả; lấy phần tử hợp lệ đầu của kết quả `docNhoNhom`.
  - `ghiNhoMotNhom(ma: string): string[]` — `ma === "" ? [] : [ma]` (giữ dạng mảng).
  - `interface TrangThaiNhom { nhom: string; truocKhiTim: string | null; daThuHep: boolean }`
  - `chamNhom(tt: TrangThaiNhom, ma: string, dangTim: boolean): TrangThaiNhom` — đặt `nhom = ma`; nếu `dangTim` thì `daThuHep = true`.
  - `doiChuTim(tt: TrangThaiNhom, chuCu: string, chuMoi: string): TrangThaiNhom` — trống→có chữ: `truocKhiTim = tt.nhom`, `nhom = ""`, `daThuHep = false`; có→có: giữ nguyên; có→trống: `nhom = tt.truocKhiTim ?? tt.nhom`, `truocKhiTim = null`, `daThuHep = false`.
  - `interface MucDanhMuc<T> { khoa: string; tieuDe: string; dong: T[] }`
  - `chiaMuc<T extends { code: string; groupCode: string | null }>(ds: readonly T[], groups: readonly { code: string; name: string }[], hayDung: readonly string[] | null): MucDanhMuc<T>[]` — `hayDung` khác `null`: mục đầu `{ khoa: "hay-dung", tieuDe: "★ Hay dùng" }` chứa dịch vụ có mã trong `hayDung`, các dịch vụ đó **không lặp** ở mục nhóm của chúng; mục nhóm theo thứ tự `groups`, "Chưa phân loại" (`CHUA_PHAN_LOAI`) cuối cùng nếu có; mục rỗng bỏ.
  - `nhomConKetQua(ds: readonly { groupCode: string | null }[]): ReadonlySet<string>` — mã nhóm (kể cả `CHUA_PHAN_LOAI`) có ít nhất một dòng.
  - `nhanDem(n: number, tenNhom: string | null): string` — `"114 dịch vụ"` hoặc `"23 dịch vụ · Thể thao biển"`.

- [ ] **Step 1: Viết test đỏ** trong `loc-danh-muc.test.ts`, mỗi ca một `test`: `docNhoMotNhom` với mảng ba nhóm → nhóm hợp lệ đầu; với chuỗi đơn `"\"TTB\""`; JSON hỏng, `null`, nhóm đã xoá → `""`. `ghiNhoMotNhom("")` → `[]`. Chuỗi trạng thái: `doiChuTim` ("" → "hòn") từ `nhom="TTB"` cho `nhom=""`, `truocKhiTim="TTB"`; `chamNhom(…, "HT", true)` rồi `doiChuTim("hòn", "hòn t")` giữ `nhom="HT"`; `doiChuTim("hòn t", "")` trả `nhom="TTB"`. `chiaMuc` với dịch vụ sao `TD2` thuộc "Tour đảo": mục đầu "★ Hay dùng" có TD2 và mục "Tour đảo" không còn TD2. `nhanDem(114, null) === "114 dịch vụ"`, `nhanDem(23, "Thể thao biển") === "23 dịch vụ · Thể thao biển"`.
- [ ] **Step 2:** `node --test src/shared/loc-danh-muc.test.ts` → FAIL (hàm chưa có).
- [ ] **Step 3:** Cài các hàm theo Interfaces, tái dùng `docNhoNhom`, `CHUA_PHAN_LOAI`. Đừng xoá `doiNhom`, `locTheoNhom`, `demTheoNhom` ở task này.
- [ ] **Step 4:** Chạy lại → PASS; `npm run typecheck` → 0 lỗi.
- [ ] **Step 5: Commit** `src/shared/loc-danh-muc.ts src/shared/loc-danh-muc.test.ts` — "Luật thuần cho hàng nhóm chọn một và chia mục danh mục".

### Task 2: Ô chọn dịch vụ: hàng nhóm, khung luôn mở, "✓ đã thêm"

**Files:**
- Modify: `web/catalog-picker.ts`, `public/app.css`, `web/icons.ts` (không đổi `search`; chỉ dùng)
- Rewrite: `docs/evidence/2026-09-30-nhom-dich-vu/kich-ban/chip-nhom-smoke.mjs` (có chủ đích: bỏ ca bảng tick)
- Test: `src/shared/loc-danh-muc.test.ts` (đã ở Task 1); kịch bản Chrome

**Interfaces:**
- Consumes: toàn bộ hàm Task 1. `CatalogPicker` (`root`, `setItems`, `setNotice`, `setDisabled`, `setSelected`, `setNhapTay`, `focus`, `setGroups`, `setTaiKhoan`) **giữ nguyên chữ ký**; `createCatalogPicker(o: { onPick })` giữ nguyên.
- Produces: token mới `--h-danh-sach` (cao khung: điện thoại ~7 dòng, máy tính ~8 dòng, qua `@media`) và `--mep-mo` (bề rộng mép mờ) trong nhóm "Riêng của Tour Đảo Booking".

- [ ] **Step 1: Viết lại kịch bản Chrome đỏ trước** (390 + 1040): hàng nhóm có "Tất cả" đầu và cuộn được; "Thể thao biển" chạm một lần → khung lọc, đầu khung "N dịch vụ · Thể thao biển"; chạm dòng Jetski → dòng hiện "✓ đã thêm", khung không cuộn nhảy, thẻ mới ở dưới; gõ "hòn tằm" → mục chia theo nhóm, nhóm không kết quả `aria-disabled`/mờ; xoá chữ → về nhóm cũ; tải lại trang → nhớ nhóm đúng tài khoản; đơn đủ 20 → ô và khung khoá. Chạy trên mã cũ → đỏ.
- [ ] **Step 2:** Dựng lại `createCatalogPicker`: trạng thái `TrangThaiNhom`; khung luôn mở, cao `var(--h-danh-sach)`, cuộn bên trong; dòng = nút sao `.catalog-ghim` + nút chọn `.catalog-pick` (anh em, không lồng), tên tách phần trước dấu `:` màu `--c-text-muted`, mã ở dòng phụ, giá thẳng cột không ký hiệu ₫, đơn vị nhóm dưới giá; dòng không chọn được `aria-disabled="true"`; vùng `aria-live="polite"` đọc "Đã thêm <tên>"; ghi nhớ bằng `ghiNhoMotNhom` qua `khoaNhoNhom`. Bỏ nút xổ, bảng tick, nút "Đóng", "Bỏ chọn hết".
- [ ] **Step 3:** CSS trong khối sau dấu mốc app iPhone chỉ dùng token (không hex/px lạ); hàng nhóm `overflow-x: auto`, mép phải mờ + dấu "›" bằng token `--mep-mo`; ≥ 960px hiện nút ‹ › khi rê chuột và đi được bằng phím mũi tên. `npm run build:web`.
- [ ] **Step 4:** Chạy kịch bản Chrome mới + `a2-smoke-form.mjs` + `danh-muc-lap-don-smoke.mjs` → PASS; quét class mồ côi trong `app.css` (các `.catalog-nhom-*`) bằng `grep` rồi xoá.
- [ ] **Step 5: Commit** — "Ô chọn dịch vụ: hàng nhóm chọn một, khung luôn mở, báo đã thêm tại chỗ".

### Task 3: Khối khách và công tắc "Đơn của"

**Files:**
- Modify: `public/order-form.html`, `web/dat-qua-doi-tac.ts`, `web/booker-picker.ts`, `web/order-form.ts`, `src/shared/booker.ts`, `src/shared/phan-doi-tac-hien-thi.ts`
- Test: `src/shared/booker.test.ts`, `src/shared/phan-doi-tac-hien-thi.test.ts`, `src/ben-dat-doi-tac-noi-day-giao-dien.test.ts`

**Interfaces:**
- Produces: `nhanTenKhach(daChonDoiTac: boolean): string` (`"Tên khách đi tour *"`), `nhanSdtKhach(daChonDoiTac: boolean): string` (`"Số điện thoại *"` khi `false`, `"Số điện thoại khách *"` khi `true`) trong `phan-doi-tac-hien-thi.ts`; hằng `NO_BOOKER_TEXT` đổi giá trị thành `"Hồ sơ khách: chưa liên kết (không bắt buộc)"`. `oDatQuaDoiTac` giữ chữ ký; chữ hai nút thành `"Khách lẻ"` / `"Qua đối tác"`, nhãn hàng `"Đơn của"`, `data-action` (`dat-qua-mo`, `dat-qua-huy`) và `id` giữ nguyên.

- [ ] **Step 1: Test đỏ:** `nhanSdtKhach(false) === "Số điện thoại *"`, `nhanSdtKhach(true) === "Số điện thoại khách *"`; `NO_BOOKER_TEXT` mới; sửa `ben-dat-doi-tac-noi-day-giao-dien.test.ts` và `phan-doi-tac-hien-thi.test.ts` đòi chữ mới (đỏ trước).
- [ ] **Step 2:** Cài hàm nhãn; đổi chữ trong `dat-qua-doi-tac.ts`; HTML: dòng "Ngày khởi hành" riêng với chữ phụ "Áp cho mọi dịch vụ trong đơn", tiêu đề khối "Khách hàng", liên kết "Điền thông tin của tôi" (giữ `id="use-mine"`), dòng đối tác đã chọn "<tên> · cá nhân|tổ chức · được hưởng hoa hồng" + liên kết "Đổi" (mọi đối tác tìm được qua `nguoi-huong` đều được hưởng, nên chữ này luôn đúng). Nhãn tên/SĐT đổi theo trạng thái chọn đối tác qua nhãn nổi sẵn có (`web/o-nhan-noi.ts`). Công tắc cao 44px, rộng hết khối; dùng `aria-pressed`.
- [ ] **Step 3:** `npm test` → xanh; `a2-smoke-form.mjs`, `doi-tac-lap-don-smoke.mjs` → PASS (Đối tác thuần vẫn thấy dòng chỉ đọc; tài khoản lai không có công tắc). **Xác minh bằng kịch bản** tài khoản Thực tập có/không thấy công tắc rồi ghi kết quả vào nhật ký thi công (đặc tả mục 6, dòng "Đối tác, Thực tập").
- [ ] **Step 4: Commit** — "Khối khách: công tắc Đơn của, nhãn tên/SĐT khách, dòng hồ sơ khách".

### Task 4: Lớp chặn nhầm "Số này là của đối tác …"

**Files:**
- Modify: `src/shared/booker.ts`, `web/booker-picker.ts`, `web/order-form.ts`, `web/booker-sheet.ts`
- Test: `src/shared/booker.test.ts`; kịch bản `a2-smoke-form.mjs`, `a2-smoke-order.mjs`

**Interfaces:**
- Produces (`booker.ts`): `doiTacTrungSo(matches: readonly { id: string; displayName: string }[], nguoiHuong: readonly { partyId: string; ten: string }[]): { partyId: string; ten: string } | null` — trả đối tác đầu tiên có `id` nằm trong `nguoiHuong`, ngược lại `null`.
- Produces (`booker-picker.ts`): thêm vào `createBookerPicker` tuỳ chọn `traDoiTac?: (ten: string) => Promise<readonly { partyId: string; ten: string }[]>` và `onDoiTacTrung?: (d: { partyId: string; ten: string; loai: "PERSON" | "ORGANIZATION" } | null) => void`. Gọi `traDoiTac` chỉ khi `coODatQuaDoiTac` và công tắc đang "Khách lẻ"; lỗi/403 → coi như `null`.

- [ ] **Step 1: Test đỏ** (`booker.test.ts`): trùng số, hai hồ sơ, một trong `nguoiHuong` → trả đúng đối tác đó; không hồ sơ nào trong `nguoiHuong` → `null`; `matches` rỗng → `null`.
- [ ] **Step 2:** Cài `doiTacTrungSo`. Trong `order-form.ts` cấp `traDoiTac` bằng `api<NguoiHuongTimResponse>("/api/pricing/nguoi-huong?q=…")` cho từng `displayName` hồ sơ trùng (tối đa 3 hồ sơ đầu); khung nền cát dưới ô SĐT: "Số này là của đối tác <tên>. Đơn này đặt qua đối tác đó?", nút phụ "Đúng, qua <tên>" và "Không". "Đúng": gọi đúng hàm chọn đối tác của công tắc (`datBenDat`), xoá trống hai ô khách, `focus()` ô tên. Chữ cảnh báo là chữ tĩnh của đặc tả; không chép lỗi máy chủ.
- [ ] **Step 3:** Làm tương tự trong `booker-sheet.ts` (bảng "Đổi khách", cùng câu cảnh báo bản cũ "Bản xác nhận đã gửi khách trước đó có thể lỗi thời — cần gửi lại." giữ nguyên).
- [ ] **Step 4:** Kịch bản Chrome: SĐT của đối tác dữ liệu thử → hiện khung, "Đúng" chuyển công tắc; SĐT khách thường → không hiện; Đối tác/tài khoản lai → không hiện; gọi `nguoi-huong` bị giả lập 403 → không hiện, không chặn lưu.
- [ ] **Step 5: Commit** — "Lớp chặn nhầm khi số điện thoại trùng đối tác (không đổi hợp đồng API)".

### Task 5: Thẻ dịch vụ: một thẻ mở, dòng gập, chip, thùng rác

**Files:**
- Modify: `web/service-card.ts`, `web/order-form.ts` (danh sách thẻ), `web/icons.ts` (thêm `trash`, cùng luật nét: lưới 24, nét 1,8, không tô), `public/app.css`
- Create: `src/shared/dong-gap-the.ts`, `src/shared/dong-gap-the.test.ts`
- Test: kịch bản `a2-smoke-order.mjs`, `dat-gap-smoke.mjs`

**Interfaces:**
- Produces (`dong-gap-the.ts`): `soKhachGon(s: { nl: number; te: number; nc: number; eb: number }): string` — chỉ loại có người, `"2 NL · 1 TE · 1 EB"`; `donGon(gio: string | null, noi: string | null): string | null` — `"đón 07:30 KS Biển Xanh"`, thiếu giờ → chip riêng, không ghép; `chipThieu(v: { coGioDon: boolean; coNoiDon: boolean }): string[]` — `"Chưa chốt giờ đón"`, `"Chưa có nơi đón"`.
- Produces (`ServiceCard`, thêm): `setOpen(open: boolean): void`, `isOpen(): boolean`, `mustStayOpen(): boolean` (thẻ có lỗi chặn lưu, kể cả "Tối đa 50 khách.").

- [ ] **Step 1: Test đỏ** cho ba hàm với đúng ví dụ trên và ca không khách/chỉ người lớn.
- [ ] **Step 2:** Cài ba hàm. Trong `service-card.ts`: thân thẻ chỉ hiện khi mở; dòng gập = tên · `soKhachGon` · `donGon` · thành tiền bên phải (cho phép 2–3 dòng ở 390, tên không cắt), kèm chip thiếu và các cảnh báo hiện có (giá danh mục đã đổi, ngày đã qua, đặt gấp); nút xoá = biểu tượng `trash` với `aria-label` `"Xoá dịch vụ <tên>"`, `onRemove` giữ nguyên. Đầu thẻ mở: tên, mã.
- [ ] **Step 3:** `order-form.ts`: thêm dịch vụ mới hoặc mở thẻ khác thì gập thẻ đang mở, **trừ** thẻ `mustStayOpen()`. Khi Lưu bị từ chối, giữ cơ chế mở-và-cuộn tới ô lỗi của đợt bốn bước (`showIssues`).
- [ ] **Step 4:** Chạy kịch bản; kiểm thân POST/PUT cùng thao tác khớp từng byte với bản `main` (khuôn `than-gui-truoc.json`/`than-gui-sau.json` của `docs/evidence/2026-10-14-tao-don-bon-buoc/kich-ban/`).
- [ ] **Step 5: Commit** — "Thẻ dịch vụ gập một dòng, chỉ một thẻ mở, thùng rác thay chữ Xoá".

### Task 6: Số khách lưới 2 cột và dòng tiền

**Files:**
- Modify: `web/service-card.ts`, `web/counter.ts` (chỉ nếu cần nhãn phụ), `public/app.css`
- Test: `src/shared/order-lines.test.ts` (giữ xanh), kịch bản `doi-tac-lap-don-smoke.mjs`, `a2-smoke-order.mjs`

**Interfaces:**
- Consumes: công thức thành tiền ở `src/shared/order-lines.ts` (một công thức; không tính lại ở web).
- Produces: dòng tiền hiển thị `"<n> <nhãn loại> × <đơn giá> = <thành tiền>"` canh phải; dòng "Thành tiền dịch vụ" chỉ khi từ hai dòng; liên kết "Sửa giá" mở ô đơn giá từng dòng; dòng đã sửa hiện nhãn "Khác giá danh mục" và giá danh mục gạch ngang (chữ và logic `retailOnly` giữ nguyên: Đối tác/Thực tập không có "Sửa giá").

- [ ] **Step 1: Test đỏ bằng kịch bản Chrome:** TD2 với 2 NL, 1 TE, 1 EB → bốn ô trong lưới 2 cột, ba dòng tiền (EB 0 đ có dòng riêng), có dòng "Thành tiền dịch vụ"; Jetski chỉ một ô, không dòng tổng; Phao chuối một ô "Số khách", chữ "7 khách = 2 lượt".
- [ ] **Step 2:** Dựng lưới (`display: grid` hai cột, token khoảng cách), mỗi ô: tên loại, dòng phụ giá·điều kiện, bộ đếm (nút 44px, ô số 48px). Đọc số liệu từ cấu trúc thẻ đang có; **không** đổi `structKey` ngoài cần thiết.
- [ ] **Step 3:** So tổng thẻ với tổng máy chủ trả sau lưu nháp trên ba dịch vụ mẫu (9.300.000 trong dữ liệu thử nếu có giá tương ứng; nếu không, so từng số với `buildLines`); kịch bản PASS.
- [ ] **Step 4: Commit** — "Thẻ dịch vụ: lưới số khách và dòng tiền rõ từng loại khách".

### Task 7: Đưa đón: một ô "Nơi đón", một ô "Nơi trả"

**Files:**
- Modify: `web/khoi-dua-don.ts`, `public/app.css`
- Test: kịch bản `a2-smoke-order.mjs`, `dat-gap-smoke.mjs`, `chon-hdv-lap-don-smoke.mjs`; bài `src/shared/` hiện có về chặng (giữ xanh)

**Interfaces:**
- Consumes: `DiemChon` và `taoKhoiDuaDon` hiện có; thân gửi lên (`legs`) không đổi.
- Produces: mỗi chặng một ô "Nơi đón" và một ô "Nơi trả": chạm → ô gõ + danh sách gợi ý ngay dưới (`tên điểm · loại điểm`), dòng cuối "Gõ tự do…" (khi đang gõ: `Gõ tự do: "…"`); không còn ô lọc + ô chọn riêng. Giữ "Giờ đón"/"Chưa chốt giờ", "Đón khác ngày", "+ Chiều về", "+ Chặng", "Xe riêng, số chỗ", "Thông tin chuyến".

- [ ] **Step 1: Test đỏ bằng kịch bản:** chọn điểm danh mục → thân `legs` mang `placeId` đúng; "Gõ tự do…" → thân mang chữ tự do như bản trước; so thân gửi từng byte với bản `main` cho cả hai nhánh.
- [ ] **Step 2:** Thay hai ô bằng một ô có gợi ý (type="search" hoặc ô gõ, `autocomplete="off"`, `aria-controls`), không phụ thuộc rê chuột.
- [ ] **Step 3:** Kịch bản PASS, lỗi "thiếu nơi đón" vẫn nhận focus (tiêu chí T4 đợt bốn bước).
- [ ] **Step 4: Commit** — "Đưa đón: một ô nơi đón và một ô nơi trả có gợi ý".

### Task 8: Thang nút, thanh toán, thanh dính, bỏ Tóm tắt điện thoại, lỗi lưu (việc lớn: tiền)

**Files:**
- Modify: `public/order-form.html`, `web/order-form.ts`, `public/app.css`
- Test: `src/shared/order-lines.test.ts`, kịch bản `a2-smoke-form|order|sheet`, `v1-nguoi-phu-trach.mjs`, `dat-gap-smoke.mjs`

**Interfaces:**
- Consumes: `#mobile-count`, `#mobile-total`, `#mobile-prepaid-row`, `#sum-*`, `#save`, `#save-error` (giữ id).
- Produces: thanh dính cuối trang: dòng "N dịch vụ · Tổng X ₫" (+ "Trả trước Y ₫"), chạm mở bảng chi tiết trên thanh (Tạm tính, Giảm giá, Tổng cộng, Thanh toán trước "ghi sau khi lưu", câu "Số này chỉ để xem trước; hệ thống tính lại khi lưu."); khối `.summary-card` ẩn ở điện thoại, giữ ở ≥ 960px (cột phải dính: Tóm tắt, Người phụ trách, Lưu, Quay lại); cảnh báo tiền (`#sum-warning`) và `#save-error` nằm ngay trên nút Lưu; "Hình thức" và "Người nhận tiền" cùng câu ghi sổ chỉ hiện khi đã nhập số trả trước; thang nút ba cấp áp cho cả màn (không còn nút viên thuốc, nền xanh nhạt, nét đứt); không thông báo nổi che thanh bước.

- [ ] **Step 1: Test đỏ bằng kịch bản:** ở 390 không thấy `.summary-card`; chạm dòng tổng → bảng chi tiết, tổng bằng `#sum-total`; nhập trả trước 2.000.000 → hai ô hiện, xoá số → ẩn; quét `app.css`/DOM: đúng một `.btn-primary` trong form; lưu lỗi → `#save-error` kề trên `#save`.
- [ ] **Step 2:** Cài theo Interfaces, chỉ đổi cách hiện; **không** đổi công thức. Văn bản cảnh báo tiền và lỗi mất mạng dùng chữ máy chủ/`order-errors.ts`, không chữ của bản vẽ.
- [ ] **Step 3:** Chạy `npm run typecheck`, `npm test`, `npm run test:e2e`, mọi kịch bản Chrome trong bảng `web/CLAUDE.md` cho các tệp đã chạm; kiểm axe và console.
- [ ] **Step 4: Commit** — "Thanh dính cuối trang, thang nút ba cấp, thanh toán chỉ hiện ô khi có trả trước".
- [ ] **Step 5: Gọi `nguoi-kiem-doc-lap`** (chỉ đọc): đọc mã thật, chạy lại lệnh, so thân POST/PUT cũ–mới từng byte và tổng thanh dính với `buildLines`; chỉ báo "đạt" dựa trên báo cáo đó.

### Task 9: Biến thể theo vai, bảng "Đổi khách", chữ kéo theo, tài liệu

**Files:**
- Modify: `web/booker-sheet.ts`, `web/dat-qua-doi-tac.ts`, `web/so-dai-ly-ui.ts`, `src/shared/huong-dan-ban-hang.ts`, `huong-dan-doi-tac.ts`, `huong-dan-quan-tri.ts`, `so-do-trang.ts`, `changelog.ts`, `docs/SYSTEM-DESIGN.md` §9, `docs/CHANGE-GUIDE.md` (nếu công thức đổi)
- Test: `src/shared/changelog.test.ts`, `src/shared/huong-dan.test.ts`, `src/shared/tro-ly-van-nghia.test.ts`, `src/shared/loc-danh-muc.test.ts` (xoá hàm không còn dùng)

- [ ] **Step 1: Test đỏ:** `grep -rn "Khách tự đặt\|Nhóm dịch vụ\|Chọn từ danh mục" src web` còn chỗ nào hiển thị chữ cũ thì đổi (mỗi chỗ có bài kiểm hoặc kịch bản chạm); sửa bài khoá chữ cũ để đòi chữ mới, thấy đỏ.
- [ ] **Step 2:** Đổi chữ ở các tệp liệt kê; bảng "Đổi khách": cùng khối "Đơn của" và hai ô khách. Mục nhật ký thay đổi mới ở `changelog.ts` (số phiên bản tạm); kho trợ lý đo lại (`tro-ly-van-nghia.test.ts`). Xoá `doiNhom`, `locTheoNhom`, `demTheoNhom` nếu `grep` cho thấy không còn nơi dùng.
- [ ] **Step 3:** Biến thể vai bằng kịch bản: Đối tác (dòng chỉ đọc, đơn giá khoá, giảm giá khoá + một dòng giải thích ngắn, không "+ Dịch vụ nhập tay" nếu không được phép), tài khoản lai (không công tắc), bảng "Đổi khách".
- [ ] **Step 4:** `npm test` xanh, `npm run typecheck` 0 lỗi, `a2-smoke-order.mjs` + `v1-nguoi-phu-trach.mjs` PASS.
- [ ] **Step 5: Commit** — "Chữ kéo theo, hướng dẫn, sơ đồ trang, nhật ký thay đổi cho màn Tạo đơn mới".

### Task 10: Nghiệm thu và mở PR

**Files:**
- Create: `docs/evidence/2026-10-18-tao-don-thiet-ke-lai/` (ảnh thật 390 + 1040 cho Bán hàng, Đối tác, Thực tập, Toàn quyền), `docs/superpowers/plans/2026-10-18-tao-don-thiet-ke-lai-thi-cong-nhat-ky.md`

- [ ] **Step 1:** Chạy đủ: `npm run typecheck` (0 lỗi), `npm test`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`, mọi kịch bản Chrome đã nêu (có `AXE_JS` — thiếu biến này là xanh giả một phần). Ba kịch bản đỏ sẵn từ đợt 1 (`a2-smoke-sheet`, `v1-xac-nhan-png`, `dat-gap-smoke` bước 4) so với bản gốc, không tính lỗi mới.
- [ ] **Step 2:** Đo chiều cao trang (390, đơn mẫu ba dịch vụ) trước/sau bằng kịch bản chụp đợt bốn bước; ghi số vào nhật ký (ngưỡng giảm chốt ở đây theo số đo thật của `main`).
- [ ] **Step 3:** Ghi nhật ký thi công: số đo, kết quả xác minh Thực tập, lựa chọn đã áp (đặc tả mục 10), nợ còn lại. Hàng rào mới (nếu có) ghi vào `docs/SO-HANG-RAO.md` chỉ khi đã quan sát chặn thật.
- [ ] **Step 4:** Mở PR dạng thường (không nháp) **chỉ khi chủ đã ra lệnh push** (AI không tự `git push`); bản PR kèm dòng "cần `npm run trien-khai`, không migration" và "ADR-0130 chờ chủ duyệt".
