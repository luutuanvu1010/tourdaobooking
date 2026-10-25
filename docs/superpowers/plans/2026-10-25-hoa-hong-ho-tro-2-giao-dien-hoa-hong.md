# Hoa hồng + Hỗ trợ — PR 2: giao diện «Hoa hồng đối tác» + bảng từ lượt 1 — Kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Dựng lại trang `/hoa-hong` thành hai thẻ «Mức đang áp dụng» / «Thiết lập» với Tra nhanh ở đầu, bảng «ai hưởng gì» theo người hưởng, mọi biểu mẫu là hộp trượt; đổi chữ theo bảng từ lượt 1 trên toàn Nền tảng.

**Architecture:** Chữ và luật hiển thị thuần ở `src/shared/hoa-hong-hien-thi.ts` (có bài kiểm); trang tách thành vài tệp `web/hoa-hong-*.ts` theo khối, dựng bằng `h()`, hộp trượt bằng `moBangTruot`. Không đổi máy chủ ngoài chữ câu báo (PR 1 đã lên production trước).

**Tech Stack:** TypeScript thuần (không React), esbuild (`npm run build:web`), CSS token ở `public/app.css`, kịch bản Chrome qua CDP (`docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs`, khuôn `docs/evidence/2026-10-15-muc-ta/kich-ban/muc-ta-smoke.mjs`).

**Spec:** `docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA.md` mục A, C, E + `BAN-GIAO.md` mục 4, 7, 9; bản vẽ `docs/design/hoa-hong-ho-tro-2026-10-25/hoa-hong-*.html`.

## Global Constraints

- Điều kiện bắt đầu: PR 1 (máy chủ) đã lên production (`npm run trien-khai` xong, kiểm bằng `GET /api/auth/config` phiên bản).
- `web/CLAUDE.md`: `h()`, không `innerHTML`; ẩn/hiện theo `can(me, …)`; mọi giá trị mới là token ở `:root` của `public/app.css`; vùng chạm ≥ 44px; ô gõ 16px; huy hiệu cảnh báo/đếm dùng `--c-danger`/`--c-warn` có sẵn, không `--c-accent`; hộp trượt `moBangTruot` (`web/bang-truot.ts`), bề rộng `--w-sheet` (≤ 520px); phông tự chứa (không Google Fonts).
- Giao diện không tính tiền, không chọn mức; câu «mức nào áp» chỉ từ `cauThuTra`.
- Không có nút «Lịch sử» / «Lịch sử áp dụng»; không dòng in mờ «có mức riêng»; không nêu số dòng về nhì.
- Chữ người dùng thấy: tiếng Việt có dấu, «Nền tảng» không «App», không mã thô (`MT_…`, `LD_…`, `prc_*`).
- Chữ chốt (nguyên văn): «Chính sách hoa hồng», «Mức riêng», «Đang áp dụng · Sắp áp dụng · Đã ngừng», nút «Ngừng», «Áp dụng chính sách cho loại», «Ngừng áp dụng», «Ai được hưởng», «Dịch vụ», «Theo», «Cách tính», «Hiệu lực: Từ / Đến: không thời hạn», «Tra nhanh», «Loại gốc».
- Q1 = A (chủ 25/10): họ từ hiệu lực đổi ở mọi màn cùng nghĩa.

## Review Focus

1. Dòng đang áp dụng nhưng đã có ngày ngừng tương lai → không Đổi/Ngừng, chữ «ngừng sau <ngày>» (Task 1, Task 3).
2. Bán hàng mở trang → không một nút ghi nào, kể cả trong hộp chạm dòng ở điện thoại (Task 6 kịch bản).
3. Tên dịch vụ rất dài ở dòng tóm tắt → số vẫn đứng trước, cắt sau một dòng, không tràn ngang ở 390 (Task 1 `tomTatMuc`, Task 6).
4. Hộp trượt đang mở ở điện thoại → nút Trợ lý ẩn; thanh «＋ Thêm mức» dính đáy → nút Trợ lý không che (hit-test) (Task 6).
5. Máy chủ trả 400/409 khi Đổi (dòng vừa bị người khác ngừng) → hộp giữ mở, hiện nguyên câu máy chủ, nút bấm lại được (Task 4, kịch bản bước «Đổi bị từ chối»).

---

### Task 1: Chữ và luật hiển thị thuần

**Files:**
- Modify: `src/shared/hoa-hong-hien-thi.ts`
- Test: `src/shared/hoa-hong-hien-thi.test.ts`

**Interfaces:**
- Produces (thêm/đổi):
  - `NHAN_TRANG_THAI = { DANG_AP: "Đang áp dụng", SAP_AP: "Sắp áp dụng", DA_DONG: "Đã ngừng" }`.
  - `NHAN_LOAI_GOC = "Loại gốc"` (thay `NHAN_LOAI_CO_SAN`, `NHAN_LOAI_DO_KE_TOAN`; `nhanLoaiDoiTac` trả `nguon: "Loại gốc" | ""`, `trangThai` chỉ khác rỗng khi đã tắt: `"Đã tắt"`).
  - `nutDoiNgung(d: CommissionRuleDto | GanLoaiMucDto-dạng { tuNgay; denNgay; conHieuLuc }, homNay: string): { hien: true } | { hien: false; ghiChu: string }` — hiện khi `conHieuLuc && tuNgay < homNay && denNgay === null`; không hiện: sắp áp dụng → `"chưa tới ngày"`, có `denNgay` ≥ hôm nay → `` `ngừng sau ${ngayVN(denNgay)}` ``, đã ngừng → `""`, bắt đầu hôm nay → `""`.
  - `tomTatMuc(dong: readonly CommissionRuleDto[], ten: TenDanhMuc): string` — các dòng đang áp dụng, mỗi phần `` `${nhanMucDto(d)} ${nhanPhamVi(d, ten)}` `` (số trước), nối bằng « · »; rỗng → `""`.
  - `CAU_CHUA_CO_MUC_LOAI = "Đơn của loại này sẽ bị giữ ở bước Đã giao cho tới khi có mức"`, `NHAN_CHUA_CO_MUC = "Chưa có mức"`.
  - `CAU_NHAC_UU_TIEN = "Mức riêng được ưu tiên hơn chính sách. Mức nào áp cho một đối tác cụ thể: dùng Tra nhanh."`.
  - `CAU_TRA_THEO_LOAI = "Đang tra theo loại. Một đối tác cụ thể của loại này có thể có mức riêng hoặc chính sách riêng — gõ tên đối tác để chắc."`.
  - `cauMucCuSeNgung(mucCu: string, tuNgay: string): string` = `` `Mức cũ ${mucCu} sẽ ngừng, đến hết ${ngayVN(addDays(tuNgay, -1))}.` ``.
  - `cauSeTao(v: { ai: string; dichVu: string; muc: string; tu: string; den: string | null }): string` = `` `Sẽ tạo: ${ai} · ${dichVu} · ${muc} · từ ${ngayVN(tu)}${den ? ` đến ${ngayVN(den)}` : ", không thời hạn"}.` ``.
  - `cauCanhBaoTheoChinhSach(tenChinhSach: string): string` = `` `Loại này đang theo chính sách ${tenChinhSach}. Mức riêng được ưu tiên hơn chính sách.` ``.
  - `xepLoai<T extends { ten: string; coMuc: boolean }>(ds: readonly T[]): T[]` — chưa có mức lên đầu, rồi `localeCompare(…, "vi")`.
  - `ghepDoiTacRieng(dong: readonly CommissionRuleDto[], ganRieng: MucTaListResponse["ganRieng"]): { partyId: string; ten: string; mucRieng: boolean; chinhSach: string | null }[]` — mỗi đối tác một dòng, xếp theo tên.
  - `cauDoiMucTrongNgay` / `CAU_DOI_MUC_TRONG_NGAY`, `cauCanhBaoDongRieng`, `CAU_KHONG_CO_MUC_TA`: viết lại chữ theo bảng từ («chính sách», «mức riêng», «Ngừng»), giữ nghĩa.
- [ ] **Step 1:** Bài đỏ cho từng hàm/hằng (giá trị nguyên văn ở trên; `nutDoiNgung` đủ năm ca; `tomTatMuc` với tên dịch vụ 120 ký tự vẫn bắt đầu bằng số; `xepLoai` với «Bé», «An» (có mức), «Cò» (chưa) → «Cò», «An», «Bé»). Sửa bài cũ khoá `NHAN_TRANG_THAI`, `NHAN_LOAI_*`.
- [ ] **Step 2:** `node --test src/shared/hoa-hong-hien-thi.test.ts` → FAIL. **Step 3:** viết. **Step 4:** → PASS.
- [ ] **Step 5: Commit** `Hoa hồng: chữ và luật hiển thị cho trang thiết kế lại`.

### Task 2: Khung trang, hai thẻ, token

**Files:**
- Modify: `public/hoa-hong.html` (thay năm khối bằng: tiêu đề + nút «＋ Thêm mức» `#hh-them-muc` + thanh thẻ `role="tablist"` hai thẻ + hai `role="tabpanel"` `#hh-the-ap-dung`, `#hh-the-thiet-lap` + thanh dính đáy điện thoại `.thanh-hanh-dong-cuoi`)
- Modify: `web/hoa-hong.ts` (chỉ còn: nạp dữ liệu song song `GET /hoa-hong`, `/muc-ta`, `/loai-doi-tac`, `/api/catalog`; chuyển thẻ; ghi nhớ thẻ đang mở trong `sessionStorage` bọc try/catch; truyền dữ liệu cho các khối ở Task 3–5; trạng thái đang tải / lỗi mạng «Không kết nối được máy chủ.» / 403 `CAU_KHONG_CO_QUYEN_XEM`)
- Modify: `public/app.css` (token mới trong `:root`, khối `.hh-*`)

**Interfaces:**
- Produces: `interface DuLieuHoaHong { homNay: string; dong: CommissionRuleDto[]; vai: {code;ten}[]; mucTa: MucTaListResponse; loai: LoaiDoiTacDto[]; ten: TenDanhMuc }` và `napLai(): Promise<void>` truyền cho mọi khối (ghi xong gọi `napLai`).
- [ ] **Step 1:** Viết khung; nút «＋ Thêm mức» và thanh đáy chỉ dựng khi `can(me,"partner.commission.write")`. Thẻ dùng phím mũi tên trái/phải theo khuôn tab có sẵn trong `web/` (nếu có; không thì `aria-selected` + `tabindex`).
- [ ] **Step 2:** `npm run build:web && npm run typecheck` → 0 lỗi; `node --test src/token-giao-dien.test.ts src/thanh-hanh-dong-cuoi.test.ts` → PASS.
- [ ] **Step 3: Commit** `Hoa hồng: khung hai thẻ`.

### Task 3: Thẻ «Mức đang áp dụng» — Tra nhanh, hàng lọc, bảng ai hưởng gì

**Files:**
- Create: `web/hoa-hong-tra-nhanh.ts`, `web/hoa-hong-bang.ts`
- Modify: `src/shared/hoa-hong-hien-thi.ts` (nếu cần hàm lọc `locBang(…)` mở rộng `locMuc` cho ô tìm chung loại/đối tác/dịch vụ + trạng thái mặc định «Đang và sắp áp dụng») + bài kiểm

**Interfaces:**
- Consumes: `DuLieuHoaHong`, `napLai` (Task 2); hàm Task 1; `coTheTimDoiTac(me)`; `taoTimDoiTac` (`web/so-dai-ly-ui.ts`).
- Produces: `veTraNhanh(goc: HTMLElement, d: DuLieuHoaHong, cuonToi: (dongId: string) => void): void`; `veBangApDung(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void` (`MoHop` từ Task 4).
- [ ] **Step 1: Tra nhanh** — một ô «Đối tác hoặc loại đối tác»: gợi ý loại (từ `d.loai` đang bật, mọi người) + tìm tên (chỉ khi `coTheTimDoiTac(me)`, trễ 300 ms); ô dịch vụ gõ-để-lọc rồi chọn; ngày (mặc định hôm nay); nút «Tra». Gọi `thu-tra?doiTac=` hoặc `?loai=`; kết quả: số to (`nhanMucDto` của `ketQua.muc`, MISSING thì không số) + `cauThuTra(r)` + `CAU_TRA_THEO_LOAI` khi có `theoLoai` + «Xem dòng ↓» (cuộn tới dòng `ketQua.muc.id`, mở cụm chứa nó). Điện thoại (< 641px): nút «Tra nhanh» mở hộp trượt cùng nội dung.
- [ ] **Step 2: Bảng** — mục «Theo loại đối tác»: mỗi loại một dòng (tên, huy hiệu «Chính sách: <tên>» nếu có gắn đang áp dụng, `tomTatMuc` mức riêng của loại, huy hiệu «Chưa có mức» + `CAU_CHUA_CO_MUC_LOAI` khi không có mức riêng lẫn chính sách), `xepLoai`; mở dòng (nút có `aria-expanded`) thấy hai cụm: «Mức riêng của loại này» (bảng Dịch vụ · Mức · Hiệu lực · Trạng thái · cột nút theo `nutDoiNgung`) và «Theo chính sách <tên> · áp dụng từ <ngày>» (chỉ xem + liên kết «sửa ở Thiết lập ›» chuyển thẻ) + `CAU_NHAC_UU_TIEN` + nút «＋ Thêm mức riêng cho loại này», «Đổi chính sách» (chỉ người ghi). Mục «Đối tác có mức riêng hoặc chính sách riêng»: `ghepDoiTacRieng`, mỗi dòng là liên kết tới hồ sơ ở Danh bạ (đường hồ sơ hiện dùng ở `web/parties.ts`).
- [ ] **Step 3: Hàng lọc** — ô tìm + chọn trạng thái («Đang và sắp áp dụng» mặc định / «Tất cả»), lọc trên máy, «Không có dòng nào khớp bộ lọc.» khi rỗng.
- [ ] **Step 4: Điện thoại** — cụm gập; chạm một dòng mức riêng (người ghi, dòng có `nutDoiNgung.hien`) mở hộp trượt hai nút «Đổi», «Ngừng»; không nút nhỏ trong dòng.
- [ ] **Step 5:** `npm run build:web && npm run typecheck` → 0 lỗi; bài thuần → PASS.
- [ ] **Step 6: Commit** `Hoa hồng: thẻ Mức đang áp dụng (Tra nhanh, bảng ai hưởng gì)`.

### Task 4: Hộp trượt Thêm mức / Đổi / Ngừng / Đổi chính sách

**Files:**
- Create: `web/hoa-hong-hop.ts`

**Interfaces:**
- Produces: `interface MoHop { themMuc(dien?: { ai: { loai: "VAI"; code: string } | { loai: "DOI_TAC"; partyId: string; ten: string } | { loai: "MUC"; code: string } }): void; doi(d: CommissionRuleDto): void; ngung(d: CommissionRuleDto, url: string): void; doiChinhSach(gan: GanLoaiMucDto): void; apDungChinhSach(muc: MucTaDto): void }` — mỗi hàm mở `moBangTruot`, gửi xong gọi `napLai`, lỗi máy chủ hiện nguyên câu trong hộp (`.sheet-warn`), hộp giữ mở.
- [ ] **Step 1: Thêm mức** — thứ tự ô đúng bàn giao mục 4 («Ai được hưởng» [Loại đối tác | Một đối tác — chỉ khi `coTheTimDoiTac(me)`] → «Dịch vụ» [Tất cả dịch vụ | Một nhóm | Một dịch vụ] → «Cách tính» [Phần trăm | Số tiền mỗi khách] + công tắc «Tách theo loại khách» (ba ô bắt buộc, câu dưới ô nguyên văn bàn giao) → «Hiệu lực: Từ / Đến: không thời hạn ▾» → Ghi chú → `cauSeTao` → `cauCanhBaoTheoChinhSach` khi loại đang có chính sách → «Thêm mức» / «Huỷ»). Đích «MUC» (mở từ thẻ chính sách) gửi `POST /api/pricing/muc-ta/:code/dong`; còn lại `POST /api/pricing/hoa-hong`. Đọc ô bằng `src/shared/so-dai-ly-nhap.ts` như nay.
- [ ] **Step 2: Đổi** — cùng khuôn, «Ai được hưởng» và «Dịch vụ» hiện chữ, không sửa; điền sẵn mức cũ; «Từ» mặc định hôm nay, `min` hôm nay; dòng `cauMucCuSeNgung` cập nhật theo ô «Từ»; gửi `POST /api/pricing/hoa-hong/:id/doi`.
- [ ] **Step 3: Ngừng** — chọn ngày cuối (`min` = ngày bắt đầu của dòng), gửi route `/dong` hoặc `/muc-ta/gan/:id/ket-thuc` như nay; nút «Ngừng».
- [ ] **Step 4: Đổi chính sách / Áp dụng chính sách cho loại** — chọn chính sách (bỏ mức đang gắn) + «Từ»; gửi `/muc-ta/gan/:id/doi` hoặc `/muc-ta/gan`; khung vàng `cauCanhBaoDongRieng` khi `dongRieng.length > 0` (giữ sau khi đóng hộp, như nay).
- [ ] **Step 5:** `npm run build:web && npm run typecheck` → 0 lỗi.
- [ ] **Step 6: Commit** `Hoa hồng: hộp trượt Thêm mức, Đổi, Ngừng, Đổi chính sách`.

### Task 5: Thẻ «Thiết lập»

**Files:**
- Create: `web/hoa-hong-thiet-lap.ts`

**Interfaces:**
- Consumes: `DuLieuHoaHong`, `MoHop`, Task 1.
- Produces: `veThietLap(goc: HTMLElement, d: DuLieuHoaHong, mo: MoHop): void`.
- [ ] **Step 1:** (a) «Loại đối tác được hưởng hoa hồng»: mỗi loại tên + `nhanLoaiDoiTac` («Loại gốc» xám, không nút; loại thêm có «Tắt»/«Bật»; huy hiệu chỉ khi «Đã tắt») + dòng chính sách đang áp dụng hoặc «Chưa áp dụng chính sách nào»; câu «Xếp một đối tác vào loại: làm ở hồ sơ của đối tác trong Danh bạ (Quản trị, Toàn quyền)»; «＋ Thêm loại» (hộp chỉ hỏi tên → `POST /api/pricing/loai-doi-tac`).
- [ ] **Step 2:** (b) «Chính sách hoa hồng dùng chung»: mỗi chính sách một thẻ: tên, «Đang áp dụng cho N loại: …» hoặc «Chưa áp dụng cho loại nào · N đối tác dùng riêng» (N từ `ganRieng`), bảng mức (Dịch vụ · Mức · Hiệu lực · Trạng thái · nút theo `nutDoiNgung`), «＋ Thêm mức vào chính sách» (`mo.themMuc({ai:{loai:"MUC",code}})`), «Áp dụng cho loại…», «Tắt»/«Bật» (route `/muc-ta/:code/tat|bat`); «＋ Thêm chính sách» (hộp chỉ tên → `POST /api/pricing/muc-ta`). Trạng thái rỗng: `CAU_KHONG_CO_MUC_TA` mới, `CAU_KHONG_CO_LOAI`.
- [ ] **Step 2b:** Mọi nút ghi chỉ dựng khi `can(me,"partner.commission.write")`.
- [ ] **Step 3:** `npm run build:web && npm run typecheck` → 0 lỗi. **Step 4: Commit** `Hoa hồng: thẻ Thiết lập`.

### Task 6: Bảng từ lượt 1 + đổi chữ toàn Nền tảng

**Files:**
- Modify: `src/shared/bang-tu-giao-dien.ts` (khối «Lượt 3 — hoa hồng (chủ 2026-10-25), hồ sơ docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/DAC-TA.md mục C»)
- Modify (chữ): `src/modules/pricing/{index,rules,repository}.ts` (câu báo), `src/shared/audit-actions.ts` (nhãn `prc_commission_rule_closed` «Ngừng mức hoa hồng», `prc_role_tier_set` «Áp dụng chính sách hoa hồng cho loại», `prc_role_tier_closed` «Ngừng áp dụng chính sách hoa hồng cho loại», nhãn `prc_party_tier_*` tương ứng), `src/shared/contracts.ts` (chú thích không bị quét — chỉ chuỗi), `src/shared/so-dai-ly-nhap.ts`, `src/shared/so-do-trang.ts`, `src/shared/huong-dan-ke-toan.ts`, `web/parties.ts` (phần chính sách riêng: «Gắn mức riêng» → «Áp dụng chính sách riêng», «Kết thúc» → «Ngừng áp dụng», «dòng riêng» → «mức riêng»), và theo Q1 = A: `src/shared/tien-xe-hien-thi.ts` (`DANG_AP` «Đang áp dụng», `SAP_AP` «Sắp áp dụng», «Đã kết thúc» → «Đã ngừng»), `web/dieu-kien-xuat-ben.ts`, `web/han-muc-tu-choi-the.ts`, `web/nguoi-ban.ts`, `public/nguoi-ban.html`, `public/hoa-hong.html`
- Test: `src/bang-tu-giao-dien.test.ts` (không sửa thân bài; chỉ chạy), các bài khoá chữ cũ (`audit-actions.test.ts`, `muc-ta.test.ts`, `gan-rieng.test.ts`, `ho-so-hoa-hong.test.ts`, `so-dai-ly-nhap.test.ts`, bài của `tien-xe-hien-thi`, `huong-dan.test.ts`)

**Interfaces:**
- Produces: ba dòng `TU_DA_LOAI` (nguồn `"chủ 2026-10-25 (bàn giao Hoa hồng + Hỗ trợ, «chọn A cả ba»)"`):
  1. `cam: /[Mm]ức TA|MỨC TA/u` → `thay: "Chính sách hoa hồng (chính sách <tên>, chính sách riêng)"`;
  2. `cam: /[Dd]òng riêng|[Rr]iêng của loại/u` → `thay: "Mức riêng"`;
  3. `cam: /Đóng mức|Đóng dòng|[Kk]ết thúc gắn|Gắn mức|Đang áp(?! dụng)|Sắp áp(?! dụng)|Đã đóng(?! sổ| tiền)/u` → `thay: "Ngừng · Áp dụng chính sách cho loại · Ngừng áp dụng · Đang áp dụng · Sắp áp dụng · Đã ngừng"`.
- [ ] **Step 1:** Thêm ba dòng; chạy `node --test src/bang-tu-giao-dien.test.ts` → FAIL, in danh sách chỗ khớp — **đọc từng chỗ**: chỗ khác nghĩa (vd. «đóng sổ», «khoá sổ tháng», «gắn loại cho hồ sơ», «Đã đóng» nghĩa đóng tiền) → thu hẹp biểu thức hoặc thêm vào `CHUOI_GIU_NGUYEN` kèm chú thích lý do; chỗ cùng nghĩa → sửa chữ.
- [ ] **Step 2:** Sửa chữ ở các tệp trên cho tới khi bài xanh; sửa các bài khoá chữ cũ theo chữ mới (đỏ có chủ đích, ghi trong commit).
- [ ] **Step 3: Quan sát chặn thật:** thêm tạm chuỗi `"Mức TA"` vào một nhãn ở `web/hoa-hong-bang.ts` → bài đỏ → hoàn nguyên.
- [ ] **Step 4:** `npm test` → xanh; `npm run typecheck` → 0 lỗi.
- [ ] **Step 5: Commit** `Bảng từ lượt 3: Chính sách hoa hồng, Mức riêng, họ từ hiệu lực (toàn Nền tảng)`.

### Task 7: Kịch bản Chrome, ảnh thật, tài liệu, PR

**Files:**
- Create: `docs/evidence/2026-10-2x-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` (khuôn `muc-ta-smoke.mjs`: `startEnv`, `ACCOUNTS`, `docAxe`; biến `HH_KHO=390|1040`, `HH_DUNG`, `HH_PHA`), ảnh vào `…/anh/`
- Modify (đỏ có chủ đích): `docs/evidence/2026-10-08-so-dai-ly-dot-1/kich-ban/so-dai-ly-smoke.mjs`, `docs/evidence/2026-10-14-loai-doi-tac/kich-ban/loai-doi-tac-smoke.mjs`, `docs/evidence/2026-10-15-muc-ta/kich-ban/muc-ta-smoke.mjs` (đưa bước nào còn giá trị sang chữ/chỗ mới, hoặc ghi ở đầu tệp «thay bằng hoa-hong-smoke.mjs từ <ngày>» và bỏ khỏi bảng `web/CLAUDE.md`), `tests/e2e/pwa.mjs`, kịch bản các màn đổi chữ theo Q1 (bảng giá xe, điều kiện cho xe chạy, người bán) nếu khoá chữ cũ
- Modify: `web/CLAUDE.md` (bảng «Sửa tệp nào thì chạy lại kịch bản nào»: thêm `web/hoa-hong*.ts` → `hoa-hong-smoke.mjs`), `docs/SYSTEM-DESIGN.md` §9 dòng «Hoa hồng đối tác», `src/shared/changelog.ts` (mục mới)

- [ ] **Step 1:** Kịch bản, mỗi khổ 390 và 1040, mỗi bước: không tràn ngang, ô gõ ≥ 16px, không chữ Anh/mã thô, axe (critical/serious ⇒ đỏ), chụp ảnh:
  1. Kế toán: hai thẻ hiện; Tra nhanh theo **tên** đối tác (cổng mới) → số + câu máy chủ; theo **loại** → có `CAU_TRA_THEO_LOAI`; «Xem dòng ↓» cuộn tới dòng.
  2. Kế toán: «＋ Thêm mức» → «Một đối tác» → tạo → dòng hiện ở mục đối tác.
  3. Kế toán: «Đổi» một dòng mức riêng bắt đầu trước hôm nay, «Từ» = hôm nay → dòng cũ «Đã ngừng» đến hôm qua, dòng mới «Đang áp dụng»; lần nữa với «Từ» = hôm nay + 5 → dòng cũ ngừng hôm nay + 4.
  4. «Đổi bị từ chối»: `HH_PHA=dong-truoc` — ngừng dòng bằng API giữa lúc mở hộp và lúc bấm → hộp còn mở, câu 409 của máy chủ hiện, bấm «Huỷ» được.
  5. Dòng sắp áp dụng: không nút Đổi/Ngừng, chữ «chưa tới ngày»; dòng có ngày ngừng tương lai: «ngừng sau <ngày>».
  6. Thẻ Thiết lập: «Loại gốc» không nút; thêm loại; thêm chính sách; «Áp dụng cho loại…» với loại còn mức riêng → khung vàng.
  7. Bán hàng: cùng trang, `document.querySelectorAll` không thấy nút ghi nào (Thêm mức, Đổi, Ngừng, Tắt, Bật, Thêm loại, Thêm chính sách, Áp dụng); Tra nhanh theo tên chạy.
  8. Đối tác: 403 → câu `CAU_KHONG_CO_QUYEN_XEM`.
  9. Điện thoại 390: hit-test `document.elementFromPoint` tại tâm nút «＋ Thêm mức» (thanh đáy) trả đúng nút đó, không phải `.tl-fab`; hộp mở → `.tl-fab` ẩn.
  10. Chuỗi cấm không có trong `document.body.innerText`: «Mức TA», «Đóng mức», «Kết thúc gắn», «Đang áp » (khoảng trắng sau), «Có sẵn», «Do Kế toán thêm».
- [ ] **Step 2:** Phá thử: `HH_PHA=lo-nut` (bọc `can` trả true cho Bán hàng) → bước 7 đỏ; `HH_PHA=fab` (bỏ lớp `thanh-hanh-dong-cuoi`) → bước 9 đỏ. Hoàn nguyên.
- [ ] **Step 3:** Chạy: `npm run build:web` rồi `AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh node docs/evidence/2026-10-2x-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` → in `HOA HONG SMOKE OK`. Chạy lại ba kịch bản cũ đã sửa và kịch bản form đơn có ô «Đặt qua đối tác» (`a2-smoke-form.mjs`) → xanh.
- [ ] **Step 4:** `npm test`, `npm run typecheck`, `npm run test:e2e` → xanh.
- [ ] **Step 5:** Gửi chủ ảnh 390 + 1040 (một lượt duyệt thị giác, theo thói quen «xem trước bằng ảnh thật»).
- [ ] **Step 6:** Người kiểm độc lập chỉ đọc; PR dạng thường; lệnh `npm run day-len` rồi `npm run trien-khai` cho chủ.
