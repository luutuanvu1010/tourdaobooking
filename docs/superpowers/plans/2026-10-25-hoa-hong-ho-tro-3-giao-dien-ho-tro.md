# Hoa hồng + Hỗ trợ — PR 3: giao diện «Hỗ trợ» + bảng từ lượt 2 — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng lại trang `/feedback` với ba thẻ (Yêu cầu của tôi · Việc của nhóm · Nhóm hỗ trợ), hai cột 320px + phần còn lại ở máy tính, luồng một yêu cầu có ba chip và ô trả lời dính đáy; đổi «Hàng đợi nhóm» → «Việc của nhóm», «Trợ giúp» → «Hướng dẫn».

**Architecture:** Luật hiển thị thuần ở `src/shared/ve-ho-tro-hien-thi.ts` và hàm thời gian tương đối mới ở `src/shared/thoi-gian-tuong-doi.ts` (có bài kiểm); trang tách thành `web/feedback.ts` (vào trang) + bốn tệp `web/ho-tro-*.ts` theo khối. Máy chủ đã có `suKien`, `dem`, `status` danh sách, `q`, `code` tuỳ chọn (PR 1). Độc lập với PR 2.

**Tech Stack:** TypeScript thuần, esbuild, CSS token, kịch bản Chrome CDP (khuôn `docs/evidence/2026-10-16-ve-ho-tro-2a/kich-ban/ve-ho-tro-2a-smoke.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA.md` mục B, C, E + `BAN-GIAO.md` mục 6, 7, 9; bản vẽ `docs/design/hoa-hong-ho-tro-2026-10-25/ho-tro-ban-2.html`.

## Global Constraints

- Điều kiện bắt đầu: PR 1 đã lên production.
- `web/CLAUDE.md` như PR 2; huy hiệu đếm «Việc của nhóm» và chấm chưa đọc dùng `--c-danger`, không `--c-accent`; ô trả lời 16px.
- Quyền chỉ đọc từ máy chủ: `FeedbackDetailResponse.perms` (`xuLy`, `giaoViec`, `chuyenNhom`), `GET /api/feedback/teams` (`mine`, `isSuper`); không tự suy từ mã quyền.
- Chip không có quyền: hiện, `disabled`, không bấm được.
- Dòng hệ thống chỉ ba loại từ `suKien`; người gửi không xử lý không có dòng hệ thống (Q2 = A, chủ 25/10).
- «yêu cầu», không «phiếu», ở mọi chữ người dùng thấy.
- Làm mới 5 s / 30 s và bản nháp trong bộ nhớ: giữ như nay (`LAM_MOI_*`, `banNhap`).
- Lối vào `/feedback?new=1&from=<trang>` vẫn tự mở hộp «Gửi yêu cầu».

## Review Focus

1. Từ chối: gửi lý do xong, đổi trạng thái lỗi, bấm lại → đúng một tin lý do trong luồng (Task 4).
2. Đóng một yêu cầu đang mở ở điện thoại (nút quay lại, phím Esc, nút «‹») → thanh tab hiện lại (Task 3).
3. Người gửi trả lời yêu cầu đã xong/từ chối → dòng «Gửi sẽ mở lại yêu cầu này» hiện TRƯỚC khi bấm (Task 3).
4. Danh sách > 50 yêu cầu, đổi nút lọc rồi «Tải thêm» → không lặp dòng, số trên ba nút đổi theo bộ lọc trạng thái và chữ tìm (Task 2).
5. Chuỗi thiết bị lạ hoặc rỗng → «Thiết bị khác», nút «chuỗi gốc» không vỡ bố cục (Task 1, Task 3).

---

### Task 1: Hàm thuần — thời gian, thiết bị, gom tin, dòng hệ thống, điền sẵn đơn, tuần này

**Files:**
- Create: `src/shared/thoi-gian-tuong-doi.ts`, `src/shared/thoi-gian-tuong-doi.test.ts`
- Modify: `src/shared/ve-ho-tro-hien-thi.ts`, `src/shared/ve-ho-tro-hien-thi.test.ts`

**Interfaces:**
- Produces:
  - `thoiGianTuongDoi(iso: string, now: Date): string` — theo giờ Việt Nam: < 1 phút «vừa xong»; < 60 phút «N phút trước»; cùng ngày «HH:mm»; ngày liền trước «hôm qua»; cùng năm «dd/mm»; khác năm «dd/mm/yyyy». Ca biên: 23:59 hôm qua lúc 00:01 hôm nay (giờ VN) → «hôm qua»; mốc UTC 17:30 = 00:30 VN hôm sau.
  - `tomTatThietBi(ua: string | null): string` — «iPhone · Safari», «iPad · Safari», «Android · Chrome», «Mac · Chrome|Safari|Firefox|Edge», «Windows · Chrome|Edge|Firefox»; rỗng/lạ → «Thiết bị khác». (Thứ tự nhận: Edg trước Chrome; CriOS = Chrome trên iPhone.)
  - `gomTin(ds: readonly FeedbackMessageDto[], cuaToi: string): CumTin[]`, `interface CumTin { tacGia: string; cuaToi: boolean; noiBo: boolean; luc: string; tin: FeedbackMessageDto[] }` — tin liền nhau cùng tác giả, cùng `internal`, cách nhau ≤ 5 phút ⇒ một cụm.
  - `chenSuKien(cum: readonly CumTin[], suKien: readonly FeedbackEventDto[]): (CumTin | { suKien: FeedbackEventDto; cau: string })[]` theo thời gian; `cauSuKien(e)`: CLAIMED «<nguoi> đã nhận việc», ASSIGNED «<nguoi> giao cho <den>», TEAM_CHANGED «Chuyển sang nhóm <den>».
  - `donDienSan(from: string | null, donCuaToi: readonly { id: string }[]): string | null` — `from` dạng `/order?id=<id>` (có thể kèm tham số khác) và `<id>` có trong danh sách → `<id>`; không thì `null`.
  - `demTuanNay(stats: FeedbackQueueResponse["stats"], now: Date): { tu: string; den: string; so: number }` — tuần thứ Hai – Chủ nhật giờ VN, cộng mọi `kind`/`status`; `cauTuanNay(v)` = `` `Tuần này (${dd}–${dd/mm}): ${so} yêu cầu mới gửi tới nhóm` ``.
  - `buocChoPhep(status: FeedbackStatus): FeedbackStatus[]` = `FEEDBACK_TRANSITIONS[status]` (dùng lại `canTransition`, `nhanNutChuyen`).
  - `CAU_MO_LAI = "Gửi sẽ mở lại yêu cầu này"`, `CAU_KHONG_CON_TRONG_NHOM = "Yêu cầu này không còn trong nhóm của bạn."`, `CAU_DA_CHUYEN_NHOM = "Yêu cầu vừa được chuyển sang nhóm khác."`, `NHAN_TAI_LAI = "Tải lại yêu cầu"`, `CAU_TU_CHOI_LOI_BUOC_2 = "Đã gửi lý do nhưng chưa đổi được trạng thái. Bấm Từ chối lại."`, `NHAN_TAB = { mine: "Yêu cầu của tôi", queue: "Việc của nhóm", teams: "Nhóm hỗ trợ" }`.
- [ ] **Step 1:** Bài đỏ: mỗi hàm các ca trên (giá trị nguyên văn); `gomTin` ba tin cùng người 0′/3′/9′ → hai cụm; tin công khai rồi ghi chú nội bộ cùng người cùng phút → hai cụm; `donDienSan("/order?id=a&x=1",[{id:"a"}]) === "a"`, `donDienSan("/order?id=b",[{id:"a"}]) === null`, `donDienSan(null, …) === null`.
- [ ] **Step 2:** `node --test src/shared/thoi-gian-tuong-doi.test.ts src/shared/ve-ho-tro-hien-thi.test.ts` → FAIL. **Step 3:** viết. **Step 4:** → PASS.
- [ ] **Step 5: Commit** `Hỗ trợ: hàm thuần cho trang thiết kế lại (thời gian, thiết bị, gom tin, dòng hệ thống)`.

### Task 2: Khung, ba thẻ, «Việc của nhóm», «Yêu cầu của tôi»

**Files:**
- Modify: `public/feedback.html` (tiêu đề + nút «＋ Gửi yêu cầu» `#ht-gui`, thanh thẻ, khung hai cột `.ht-hai-cot` gồm `#ht-danh-sach` + `#ht-luong`), `web/feedback.ts` (vào trang: nạp `GET /api/feedback/teams`, chọn thẻ, `?new=1` mở hộp, giữ `?id=` mở yêu cầu)
- Create: `web/ho-tro-danh-sach.ts`
- Modify: `public/app.css` (`--w-ht-cot-trai: 320px` và khối `.ht-*`)

**Interfaces:**
- Consumes: Task 1; `duongHangDoi` (PR 1 đã nhận `status[]`, `q`); `hienNhanViec`, `nutNhanViec` hiện có.
- Produces: `veDanhSach(goc: HTMLElement, o: { the: "mine" | "queue"; nhom: { id: string; name: string }[]; moYeuCau: (id: string) => void }): { napLai(): void }`.
- [ ] **Step 1:** Thẻ «Việc của nhóm» chỉ khi `mine.length > 0`, kèm huy hiệu đếm (`GET /api/feedback/badge` `queue`) màu `--c-danger`; «Nhóm hỗ trợ» chỉ khi `isSuper`. Nút «＋ Gửi yêu cầu»: lớp nút chính ở «Yêu cầu của tôi», nút viền ở thẻ khác.
- [ ] **Step 2:** Hàng lọc «Việc của nhóm»: Nhóm ▾ (ẩn khi chỉ một nhóm) · ba nút [Chưa ai nhận N | Tôi đang xử lý N | Tất cả] (N từ `dem`; `aria-pressed`) · Trạng thái ▾ (mặc định «Đang mở» = `NEW,ACK,IN_PROGRESS`; thêm «Đã xong», «Từ chối», «Tất cả») · ô tìm (`q`, trễ 300 ms). Đổi bộ lọc ⇒ `offset` về 0.
- [ ] **Step 3:** Dòng: tiêu đề (đậm + chấm đỏ khi `unread`) + huy hiệu ưu tiên; `code` · `submitterName` · `orderCode`; `statusName` · `assigneeName` («(tôi)» khi là mình); `thoiGianTuongDoi(lastActivityAt)`; nút «Nhận việc» khi `hienNhanViec`. Chân: `cauTuanNay(demTuanNay(stats))`; «Tải thêm» khi trang vừa tải đủ 50.
- [ ] **Step 4:** Máy tính (≥ 900px, khớp `wide()` hiện có): hai cột; điện thoại: danh sách, chạm dòng mở luồng toàn màn.
- [ ] **Step 5:** `npm run build:web && npm run typecheck` → 0 lỗi. **Step 6: Commit** `Hỗ trợ: khung ba thẻ, Việc của nhóm có đếm và lọc`.

### Task 3: Luồng một yêu cầu

**Files:**
- Create: `web/ho-tro-luong.ts` (chuyển `loadThread`, `vongLamMoi`, `henLamMoi`, `veTin`, `dungDau`, `khoiUuTien`, `khoiNguoiXuLy`, `nutGiaoViec`, `khoiChuyenNhom` từ `web/feedback.ts`, dựng lại theo bố cục mới)
- Modify: `web/shell.ts` (thêm `export function datThanhTab(hien: boolean): void` — bật/tắt lớp `body.tabbar-an`; CSS ẩn `.tabbar` và bỏ khoảng đệm đáy khi có lớp), `public/app.css`
- Test: `src/thanh-hanh-dong-cuoi.test.ts` (ô trả lời dính đáy có lớp `thanh-hanh-dong-cuoi`)

**Interfaces:**
- Consumes: Task 1; `FeedbackDetailResponse` (`ticket`, `messages`, `suKien`, `perms`), `FeedbackMessagesSinceResponse.suKien`.
- Produces: `moLuong(goc: HTMLElement, id: string, o: { dong(): void }): void`; `datThanhTab` (shell).
- [ ] **Step 1: Đầu yêu cầu** — `code` · tiêu đề; ba chip: trạng thái (bấm khi `perms.xuLy` → menu `buocChoPhep`; chọn «Từ chối» → Task 4), ưu tiên (`perms.xuLy`), người xử lý («Nhận việc» / «Giao cho…» theo `perms`); dòng phụ: Nhóm ▾ (`perms.chuyenNhom` → hộp chuyển nhóm, lý do 1–300 ký tự bắt buộc), «Đơn <mã> ›», «Chi tiết ▾» (người gửi, loại, giờ gửi, từ trang, `tomTatThietBi` + nút «chuỗi gốc», email báo nhóm khi `ticket.mailPending` — «Email báo nhóm: chưa gửi được»). Người gửi không xử lý: không chip quyền, thanh bước bốn mốc (`buocGopY`) thu một dòng; `DECLINED` → «Đã từ chối».
- [ ] **Step 2: Luồng** — mốc ngày; `chenSuKien(gomTin(messages, me.id), suKien)`; cụm của mình bên phải; ghi chú nội bộ nền cát + khoá «người gửi không thấy»; làm mới nối `messages` và `suKien` mới.
- [ ] **Step 3: Ô trả lời dính đáy** — [Trả lời người gửi | Ghi chú nội bộ] (chế độ ghi chú chỉ khi `perms.xuLy`; ô đổi nền cát), ô chữ 16px, «Gửi»; người gửi & `statusAfterSubmitterReply(status) !== status` → `CAU_MO_LAI` hiện trên ô. Thanh có lớp `thanh-hanh-dong-cuoi`.
- [ ] **Step 4: Điện thoại** — mở luồng ⇒ `datThanhTab(false)`; mọi đường đóng (nút «‹», `popstate`, Esc) ⇒ `datThanhTab(true)`. 404/403 khi làm mới ⇒ `CAU_KHONG_CON_TRONG_NHOM` / `CAU_DA_CHUYEN_NHOM` + `NHAN_TAI_LAI`.
- [ ] **Step 5:** `npm run build:web && npm run typecheck` → 0 lỗi; `node --test src/thanh-hanh-dong-cuoi.test.ts src/token-giao-dien.test.ts` → PASS.
- [ ] **Step 6: Commit** `Hỗ trợ: luồng một yêu cầu (ba chip, dòng hệ thống, ô trả lời dính đáy)`.

### Task 4: Từ chối có lý do + hộp «Gửi yêu cầu»

**Files:**
- Create: `web/ho-tro-gui.ts` (chuyển `openForm`, `teamHint`, `napDonCuaToi`, `collectContext` từ `web/feedback.ts`)
- Modify: `web/ho-tro-luong.ts`

**Interfaces:**
- Produces: `moHopGui(o: { from: string | null }): void`; `tuChoi(ticket, lyDoDaGui: Set<string>)` trong `ho-tro-luong.ts`.
- [ ] **Step 1: Từ chối** — `moBangTruot` hỏi «Lý do từ chối (người gửi sẽ đọc)», bắt buộc; xác nhận: nếu `!lyDoDaGui.has(id)` → `POST /api/feedback/:id/messages` (công khai) → thành công thì `lyDoDaGui.add(id)`; rồi `PATCH /api/feedback/:id/xu-ly { status: "DECLINED" }`; bước 1 lỗi → không làm bước 2, hiện câu máy chủ; bước 2 lỗi → `CAU_TU_CHOI_LOI_BUOC_2`, lần bấm lại bỏ qua bước 1 (hộp ghi «Lý do đã gửi»).
- [ ] **Step 2: Gửi yêu cầu** — nhóm nhận (ẩn khi chỉ một; tài khoản bên ngoài máy chủ chỉ trả Kỹ thuật) → loại (Báo lỗi / Đề xuất / Câu hỏi) → tiêu đề → đơn liên quan (`GET /api/feedback/my-orders`, chọn sẵn `donDienSan(from, orders)`, không thì «Không gắn đơn») → mô tả → câu «Sẽ đính kèm tự động: trang, phiên bản, thiết bị» giữ nguyên → «Gửi». Giữ `clientRequestId` qua lần thử lại như nay.
- [ ] **Step 3:** `npm run build:web && npm run typecheck` → 0 lỗi. **Step 4: Commit** `Hỗ trợ: từ chối bắt điền lý do; hộp Gửi yêu cầu điền sẵn đơn của mình`.

### Task 5: «Nhóm hỗ trợ» (Toàn quyền)

**Files:**
- Create: `web/ho-tro-nhom.ts` (chuyển `loadTeamsAdmin`, `ghiNhom`, `theNhom`, `formTaoNhom`)

**Interfaces:**
- Produces: `veNhomHoTro(goc: HTMLElement): void`.
- [ ] **Step 1:** Bảng: Nhóm · Phụ trách (trưởng nhóm) · Thành viên (ảnh đại diện chữ tắt + «trưởng nhóm: …», hoặc huy hiệu «Chưa có thành viên») · Nhạy cảm (công tắc lưu ngay `PATCH …/teams/:id {sensitive}`; chú thích «email báo chung và nhật ký chỉ ghi mã yêu cầu, không ghi tiêu đề») · «Sửa». Điện thoại: thẻ thay bảng.
- [ ] **Step 2:** Hộp «Sửa»: tên, mô tả, công tắc nhạy cảm, thành viên (Trưởng nhóm ↔ Thành viên, Gỡ), thêm người (gõ tên; danh sách tài khoản nội bộ như nay), «Ngưng nhóm» (không hiện ở nhóm Kỹ thuật `fbk-team-ky-thuat`). Hộp «Thêm nhóm»: tên + mô tả, **không** ô mã. Cuối: «Nhóm đã ngưng: N» + «Dùng lại».
- [ ] **Step 3:** `npm run build:web && npm run typecheck`. **Step 4: Commit** `Hỗ trợ: màn Nhóm hỗ trợ dạng bảng, thêm nhóm không cần mã`.

### Task 6: Bảng từ lượt 2 + đổi chữ

**Files:**
- Modify: `src/shared/bang-tu-giao-dien.ts` (khối «Lượt 4 — hỗ trợ (chủ 2026-10-25)»), `src/shared/muc-giao-dien.ts` (mục `troGiup` thanh bên và trang Tôi: `nhan: "Hướng dẫn"`), `public/help.html`, `src/shared/trang-chu-o.ts`, `web/home.ts` (`aria-label`), `src/shared/so-do-trang.ts`, `src/shared/tro-ly.ts`, `src/shared/tro-ly-kien-truc.ts`, tám tệp `src/shared/huong-dan-*.ts`, `web/feedback.ts`/`web/ho-tro-*.ts` («Hàng đợi nhóm»)
- Test: `src/bang-tu-giao-dien.test.ts`, `src/shared/trang-chu-o.test.ts`, `src/shared/huong-dan.test.ts`, `src/shared/tro-ly.test.ts`, `src/shared/tro-ly-van-nghia.test.ts`; bộ sinh `scripts/sinh-so-do-trang.mjs`

**Interfaces:**
- Produces: hai dòng `TU_DA_LOAI`: `cam: /Hàng đợi nhóm/u` → `"Việc của nhóm"`; `cam: /[Tt]rợ giúp|TRỢ GIÚP/u` → `"Hướng dẫn"` (`changelog.ts` đã ở `NGOAI_LE`). Nguồn `"chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ)"`. Chú thích trỏ `BACKLOG BL-VE-TRUNG-TEN` cho trùng tên «Hỗ trợ».
- [ ] **Step 1:** Thêm hai dòng → `node --test src/bang-tu-giao-dien.test.ts` FAIL, đọc từng chỗ khớp. **Step 2:** sửa chữ; Trợ lý: câu tri thức nói «trang Hướng dẫn», từ khoá tìm vẫn nhận «trợ giúp» người dùng gõ (bài `tro-ly-van-nghia` — thêm ca «trợ giúp» → trả trang Hướng dẫn). **Step 3:** `node scripts/sinh-so-do-trang.mjs` → sơ đồ trang sinh lại. **Step 4:** quan sát chặn thật (chèn tạm «Trợ giúp» vào một nhãn → đỏ → hoàn nguyên). **Step 5:** `npm test` → xanh. **Step 6: Commit** `Bảng từ lượt 4: Việc của nhóm, Hướng dẫn`.

### Task 7: Kịch bản Chrome, ảnh thật, tài liệu, PR

**Files:**
- Create: `docs/evidence/2026-10-2x-ho-tro-thiet-ke-lai/kich-ban/ho-tro-smoke.mjs` (khuôn `ve-ho-tro-2a-smoke.mjs`; `HT_KHO`, `HT_DUNG`, `HT_PHA`), ảnh `…/anh/`
- Modify (đỏ có chủ đích): `dot-c-smoke.mjs`, `v1-bao-tri.mjs`, `docs/evidence/2026-10-15-ve-ho-tro/kich-ban/ve-ho-tro-smoke.mjs`, `docs/evidence/2026-10-16-ve-ho-tro-2a/kich-ban/ve-ho-tro-2a-smoke.mjs`, `help-smoke.mjs`, `trang-chu-smoke.mjs`, `quyen-thieu-quan-tri-smoke.mjs`
- Modify: `web/CLAUDE.md` (bảng kịch bản: `web/feedback.ts`, `web/ho-tro-*.ts` → `ho-tro-smoke.mjs`), `docs/SYSTEM-DESIGN.md` §9 dòng Hỗ trợ, `src/shared/changelog.ts`

- [ ] **Step 1:** Kịch bản, mỗi khổ 390 + 1040, mỗi bước: không tràn ngang, ô gõ ≥ 16px, không chữ Anh/mã thô, không chữ «phiếu», axe, ảnh:
  1. Bán hàng gửi yêu cầu từ trang đơn của mình (`/feedback?new=1&from=/order?id=<đơn mình>`) → đơn điền sẵn; từ đơn người khác → «Không gắn đơn».
  2. Bán hàng mở yêu cầu của mình: không chip quyền, không chế độ ghi chú nội bộ, không dòng hệ thống (dù đã có nhận việc + giao).
  3. Kế toán (thành viên): «Việc của nhóm» với 60 yêu cầu dựng sẵn → số trên ba nút đúng; «Tải thêm» không lặp; «Nhận việc» → chip «Đã tiếp nhận»; ba dòng hệ thống đúng thứ tự; ghi chú nội bộ nền cát; «Chi tiết» có dòng email báo nhóm.
  4. Từ chối: `HT_PHA=loi-buoc-2` (bọc `fetch` cho `PATCH …/xu-ly` trả 500 lần đầu) → câu `CAU_TU_CHOI_LOI_BUOC_2`; bấm lại → thành công; luồng có **đúng một** tin lý do; người gửi thấy «Đã từ chối» + lý do.
  5. Người gửi trả lời yêu cầu đã từ chối → `CAU_MO_LAI` hiện trước khi gửi; gửi → trạng thái «Đã tiếp nhận».
  6. Trưởng nhóm giao việc; chuyển nhóm (lý do bắt buộc: để trống → không gửi); thành viên nhóm mới không thấy ghi chú cũ.
  7. Toàn quyền: bảng nhóm; gạt nhạy cảm → tải lại vẫn giữ; «Thêm nhóm» không có ô mã → tạo được; nhóm Kỹ thuật không có «Ngưng nhóm».
  8. Điện thoại 390: mở yêu cầu → thanh tab ẩn; đóng → hiện lại; hit-test tâm «Gửi», «Nhận việc», «＋ Gửi yêu cầu» không trúng `.tl-fab`; `getComputedStyle(ô trả lời).fontSize === "16px"`.
  9. Chuỗi cấm không có trong `innerText`: «Hàng đợi nhóm», «Trợ giúp», «Phiếu», «Mozilla/5.0» (khi «chuỗi gốc» chưa mở).
- [ ] **Step 2:** Phá thử: `HT_PHA=lo-noi-bo` (hiện chế độ ghi chú cho người gửi) → bước 2 đỏ; `HT_PHA=tab` (bỏ `datThanhTab(true)` khi đóng) → bước 8 đỏ. Hoàn nguyên.
- [ ] **Step 3:** `npm run build:web` rồi `AXE_JS=… CHROME_BIN=… node docs/evidence/2026-10-2x-ho-tro-thiet-ke-lai/kich-ban/ho-tro-smoke.mjs` → `HO TRO SMOKE OK`; chạy lại bảy kịch bản cũ đã sửa → xanh.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e` → xanh.
- [ ] **Step 5:** Ảnh 390 + 1040 gửi chủ duyệt một lượt.
- [ ] **Step 6:** Người kiểm độc lập chỉ đọc; PR dạng thường; lệnh `npm run day-len` rồi `npm run trien-khai` cho chủ.
