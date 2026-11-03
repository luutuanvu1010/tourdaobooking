# Chính sách chiết khấu bốn trục — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Kế toán nhập mức ngay trên bảng dịch vụ × cấp ở trang Hoa hồng; Toàn quyền đổi được giới hạn nhập; mức vượt giá bị chặn hoặc báo sớm và không còn nới trần giảm giá.

**Architecture:** Không đổi mô hình mức (`prc_commission_rule`, `chonMuc`, chụp lúc xác nhận). Thêm một bảng chỉ-thêm của `pricing`, một tệp luật thuần dùng chung máy chủ và giao diện, một cổng duy nhất `kiemSoMucMoi` cho mọi route ghi mức có số mới. Bảng nhập là `maTranCap` có thêm dữ liệu và ô bấm được, gọi các hộp có sẵn.

**Tech Stack:** TypeScript, Cloudflare Worker + D1, giao diện thuần `h()`, `node --test` trên Node 22 (`source ~/.nvm/nvm.sh; nvm use 22`), khung thử `tests/audit/harness.mjs`.

**Spec:** `docs/superpowers/specs/2026-11-03-chinh-sach-chiet-khau-bon-truc-design.md`. Quyết định: `docs/adr/ADR-0161-chinh-sach-chiet-khau-bon-truc-va-gioi-han-nhap.md` (ADR thắng khi lệch).

**Chia lần giao:** Lần 1 = Task 1–3 (máy chủ, tiền). Lần 2 = Task 4–8 (giao diện). Lần 3 = Task 9 (tài liệu, hàng rào, bộ kiểm dài). Sau đó một người kiểm độc lập đọc cả nhánh. Sổ thi công: `docs/superpowers/plans/2026-11-03-chinh-sach-chiet-khau-thi-cong-nhat-ky.md`.

## Global Constraints

- Migration mới số `0137` (đã kiểm mọi nhánh 3/11, lớn nhất là `0136`); kiểm lại bằng `ls migrations` trước khi đặt.
- Giới hạn gieo: `max_rate_bp = 5000`, `amount_step = 1000`. Không ô quyền mới. Đổi giới hạn: ô `settings.ops`.
- Chữ giao diện, đúng từng chữ: `Tính bằng`, `Áp cho`, `Phần trăm`, `Số tiền`, `Mọi khách như nhau`, `Riêng từng loại khách`, `Hoa hồng vượt thành tiền — Kế toán xem lại`, `Giới hạn nhập hoa hồng`. Gọi hệ thống là «Nền tảng». Dùng «vai trò», không viết mã thô.
- Câu máy chủ, đúng từng chữ (số định dạng bằng `nhanTyLeBp`, `nhanDong`): `Phần trăm không quá ${x}.` · `Số tiền phải chia hết cho ${y}đ (không trả thì gõ 0).` · `Hoa hồng ${a}đ của ${loai} lớn hơn giá bán ${b}đ của «${ten}».` với `loai` ∈ `người lớn`, `trẻ em`, `người cao tuổi`, `mỗi lượt` · `Hoa hồng ${a}đ lớn hơn giá bán cao nhất ${b}đ của «${ten}».`
- Giữa chừng chỉ chạy `node --test <tệp liên quan>` và `npm run typecheck`. `npm test`, e2e, Chrome chạy mỗi bộ MỘT lần ở Task 9. `typecheck` không phủ `*.test.ts`: tự đọc lại tệp test mới.
- Không sửa `playbook/`, không sửa migration cũ, không `git push`, không merge, không đụng production. Commit tiếng Việt có dấu, thân nói vì sao, kết bằng `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Không đổi số trong `golden/`. Không sửa `docs/quyen-hoan.json`, bài kiểm hạn hay tệp hàng rào để bộ kiểm xanh. Nếu đỏ duy nhất vì `HC-5.19` quá hạn (hạn 2026-11-05): ghi sổ thi công, dừng, báo điều phối. Ca sổ vàng đi qua route mà vướng giới hạn hoặc vượt giá: dừng, báo điều phối.
- Không sửa `CLAUDE.md`, `web/CLAUDE.md`, `src/CLAUDE.md`, `docs/adr/`: điều phối tự làm.
- `web/` không import `src/modules/`, không `innerHTML`, không tự tính tiền; ô gõ 16px; CSS mới đi qua token.
- Đọc nhiều đoạn trong một lượt, lấy cả khối; tệp và tên hàm đã ghi sẵn ở từng task.

## Review Focus

- Kế toán nhập liên tiếp nhiều ô: sau mỗi lần ghi trang vẽ lại, vị trí cuộn, ô tìm và bộ lọc phải giữ nguyên. Bài: Task 6 bước Chrome.
- Dịch vụ không có giá, đơn vị lạ hoặc đã rời Sheet: so vượt giá bỏ qua, nhập được, hàng vẫn hiện bằng mã. Bài: Task 2, Task 5.
- Dịch vụ tính theo lượt nhận «Riêng từng loại khách»: chỉ số người lớn được so và tính, đúng `hoaHongTheoLuot`. Bài: Task 2, Task 5.
- Hộp đang mở mà Toàn quyền vừa đổi giới hạn: máy chủ từ chối theo số mới, hộp giữ nguyên số đã gõ. Bài: Task 1 (máy chủ); hộp dùng `moHop` đã giữ mở khi lỗi.
- Cấp đã khoá: ô trống không bấm được, ô có mức chỉ còn việc mà `viecDongMuc` cho phép. Bài: Task 5.

---

### Task 1: Giới hạn nhập: bảng, luật, đường đọc và ghi

**Files:**
- Create: `migrations/0137_gioi_han_nhap_muc.sql`, `src/shared/gioi-han-nhap-muc.ts`, `src/shared/gioi-han-nhap-muc.test.ts`, `src/modules/pricing/gioi-han-nhap.test.ts`
- Modify: `src/modules/pricing/repository.ts`, `src/modules/pricing/index.ts`, `src/shared/contracts.ts`, `src/shared/audit-actions.ts`, `docs/data-dictionary.json` (rồi `npm run dict`), `src/route-access.test.ts`, `src/lan-gui-phu-route.test.ts`

**Interfaces:**
- Produces (`src/shared/gioi-han-nhap-muc.ts`): `interface GioiHanNhap { tranTyLeBp: number; buocTien: number }`; `viPhamGioiHanNhap(m: { tyLeBp: number | null; soTien: readonly number[] }, gh: GioiHanNhap): string | null`; `kiemThanGioiHan(raw: unknown): { ok: true; value: GioiHanNhap & { tuLuc: string } } | { ok: false; message: string }`.
- Produces (`contracts.ts`): `interface GioiHanNhapResponse { tranTyLeBp: number; buocTien: number; tuLuc: string }`.
- Produces (route): `GET /api/pricing/gioi-han-nhap` (access `office`, thân hỏi `partner.commission.view` và không `holdsPartner`); `POST /api/pricing/gioi-han-nhap` (access `admin`, thân hỏi `settings.ops`), thân `{ tranTyLeBp, buocTien, tuLuc }`, trả `GioiHanNhapResponse`.
- Produces (`pricing/index.ts`, không xuất): `kiemSoMucMoi(db: D1Database, m: { kind: KieuMuc; rateBp: number | null; perPaxAmount: number | null; theoLoai: MucTheoLoai | null }, pv: { scope: PhamVi; catalogCode: string | null }): Promise<Response | null>`.

- [ ] **Step 1: Viết bài thuần đỏ** ở `gioi-han-nhap-muc.test.ts`:

```ts
const GH = { tranTyLeBp: 5000, buocTien: 1000 };
assert.equal(viPhamGioiHanNhap({ tyLeBp: 5000, soTien: [] }, GH), null);
assert.match(viPhamGioiHanNhap({ tyLeBp: 5100, soTien: [] }, GH)!, /Phần trăm không quá 50%/);
assert.equal(viPhamGioiHanNhap({ tyLeBp: null, soTien: [50000, 0, 0] }, GH), null);
assert.match(viPhamGioiHanNhap({ tyLeBp: null, soTien: [123456] }, GH)!, /chia hết cho 1\.000đ/);
assert.equal(viPhamGioiHanNhap({ tyLeBp: 0, soTien: [] }, { tranTyLeBp: 1, buocTien: 7 }), null); // 0 luôn nhận
// thân: 1…10000 và 1…1.000.000, số nguyên; tuLuc bắt buộc
assert.equal(kiemThanGioiHan({ tranTyLeBp: 0, buocTien: 1000, tuLuc: "x" }).ok, false);
assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 0, tuLuc: "x" }).ok, false);
assert.equal(kiemThanGioiHan({ tranTyLeBp: 6000, buocTien: 500 }).ok, false);
```

- [ ] **Step 2: Viết bài route đỏ** ở `pricing/gioi-han-nhap.test.ts` (khuôn `muc-ta.test.ts`, `world()`, dịch vụ gieo giá 1.000.000 đ). Tên bài và khẳng định:
  - `gieo 50% và 1.000 đ`: `GET` bằng Kế toán trả `tranTyLeBp 5000`, `buocTien 1000`.
  - `51% và 123.456 đ trả 400; 50%, 50.000 đ, 0 đ nhận` qua `POST /api/pricing/muc-ta/:code/dong` phạm vi SERVICE, cùng ca đó qua `POST /api/pricing/hoa-hong` (đối tác) và `POST /hoa-hong/:id/doi`.
  - `Toàn quyền đổi 60% thì 60% nhận ngay; có nhật ký prc_entry_limit_changed; dòng và đơn cũ không đổi` (so `prc_commission_rule` và `ord_service_terms` trước và sau).
  - `Kế toán, Quản trị POST đổi giới hạn 403; Đối tác GET 403`.
  - `hạ trần dưới dòng đã có: dòng vẫn áp, Sửa chỉ đổi ngày nhận 200, Sửa đổi số vượt trần 400`.
  - `đổi giới hạn rồi Thêm mức theo số cũ trả 400 câu theo số mới` (Review Focus).
  - `tuLuc cũ 409 stale, không có nhật ký; gửi đúng số đang hiệu lực 200, không thêm dòng`.
  - `UPDATE, DELETE thẳng prc_entry_limit_policy bị trigger chặn`.

- [ ] **Step 3: Chạy cho đỏ.** `node --test src/shared/gioi-han-nhap-muc.test.ts src/modules/pricing/gioi-han-nhap.test.ts`. Mong đợi: thiếu tệp, thiếu route.

- [ ] **Step 4: Viết migration** theo khuôn `ord_confirm_policy` (migration 0119): cột `id`, `max_rate_bp INTEGER NOT NULL CHECK (max_rate_bp BETWEEN 1 AND 10000)`, `amount_step INTEGER NOT NULL CHECK (amount_step BETWEEN 1 AND 1000000)`, `valid_from_at TEXT NOT NULL UNIQUE`, `created_at`, `created_by`, `updated_at`, `updated_by`; dòng gieo `gieo-0137`; trigger chặn `UPDATE`, `DELETE`. Thêm bảng vào `docs/data-dictionary.json`, mức N1, rồi `npm run dict`.

- [ ] **Step 5: Viết `repository.ts`** bằng `defineSql("pricing", …)`: đọc dòng có `valid_from_at` lớn nhất (`ORDER BY valid_from_at DESC LIMIT 1`), câu chèn. **Viết route** theo khuôn `/api/cai-dat/an-thong-tin-khach` (`src/modules/orders/xac-nhan-route.ts`): `tuLuc` lệch dòng mới nhất ⇒ 409 `stale`; số trùng ⇒ 200 không ghi; ghi một `db.batch` gồm dòng mới và nhật ký; mốc giờ theo cách `lanSau` (chép hàm một dòng, không import từ `orders`); bắt lỗi UNIQUE ⇒ 409 `stale`. Nhật ký `prc_entry_limit_changed`, nhãn `Đổi giới hạn nhập hoa hồng`, nhóm `ledger`, chi tiết nêu số cũ và số mới.

- [ ] **Step 6: Viết `kiemSoMucMoi`** (đọc giới hạn, gọi `viPhamGioiHanNhap` với `soTien` là các số khác null của `perPaxAmount`, `theoLoai.child`, `theoLoai.senior`; vi phạm ⇒ `error(400, "invalid_input", câu)`) và gọi ở bốn route, ngay trước khi ghi: `POST /hoa-hong`, `POST /muc-ta/:code/dong`, `POST /hoa-hong/:id/doi`, `POST /hoa-hong/:id/sua`. Ở Sửa chỉ gọi khi `!cungMuc(dongMuc(row), than.value)`.

- [ ] **Step 7: Cập nhật ảnh chụp route** trong `src/route-access.test.ts` (+2 dòng, tổng +2) và số route ghi trong `src/lan-gui-phu-route.test.ts` (+1), kèm dòng chú thích ADR-0161.

- [ ] **Step 8: Chạy cho xanh.** Lệnh ở Step 3, thêm `node --test src/route-access.test.ts src/lan-gui-phu-route.test.ts src/modules/pricing/*.test.ts`. Bài cũ đỏ vì số lẻ hoặc trên 50% (đã đo: `theo-loai.test.ts`, `thuong-mai-route.test.ts`, `so-la-doi-tac.test.ts`, `so-la-thuong-mai-toan-nen-tang.test.ts`, `bien-nhan.test.ts`, các số này thường để thử làm tròn): **không đổi số đầu vào và không đổi đáp án**. Thêm helper `noiGioiHanNhap(w)` vào `tests/audit/harness.mjs` (chèn một dòng `prc_entry_limit_policy` với `max_rate_bp` 10000, `amount_step` 1) và gọi trong phần gieo của đúng bài đó. Ca cố ý gửi số sai (10001, 100000001) phải vẫn nhận câu từ chối cũ.

- [ ] **Step 9: Commit.** `Giới hạn nhập mức hoa hồng do Toàn quyền đổi được (ADR-0161 Đ3)`.

### Task 2: Chặn mức vượt giá lúc nhập, và rào quét mọi đường ghi

**Files:**
- Modify: `src/shared/gioi-han-nhap-muc.ts`, `src/shared/gioi-han-nhap-muc.test.ts`, `src/modules/pricing/index.ts`, `src/modules/pricing/gioi-han-nhap.test.ts`
- Create: `src/modules/pricing/ghi-muc-qua-cong.test.ts`

**Interfaces:**
- Consumes: `kiemSoMucMoi` (Task 1).
- Produces: `type GiaBanLe = Pick<Prices, "adult" | "child" | "senior">`; `mucVuotGiaBan(v: { unit: string; gia: GiaBanLe; moiKhach: number; theoLoai: { treEm: number; nguoiCaoTuoi: number } | null; ten: string }): string | null`.

- [ ] **Step 1: Viết bài thuần đỏ:**

```ts
const G = { adult: 1000000, child: 0, senior: null };
const v = (o) => mucVuotGiaBan({ unit: "perPax", gia: G, ten: "Vé A", theoLoai: null, moiKhach: 0, ...o });
assert.equal(v({ moiKhach: 100000 }), null);                         // «mọi khách» so giá cao nhất, không vướng trẻ em 0 đ
assert.match(v({ moiKhach: 1000001 })!, /giá bán cao nhất 1\.000\.000đ/);
assert.match(v({ moiKhach: 100000, theoLoai: { treEm: 30000, nguoiCaoTuoi: 999999 } })!, /trẻ em/); // 0 đ là có giá; null thì bỏ qua
assert.equal(v({ moiKhach: 100000, theoLoai: { treEm: 0, nguoiCaoTuoi: 999999 } }), null);
assert.equal(mucVuotGiaBan({ unit: "per5Pax", gia: { adult: 800000, child: null, senior: null }, moiKhach: 800000, theoLoai: { treEm: 9, nguoiCaoTuoi: 9 }, ten: "Phao" }), null);
assert.match(mucVuotGiaBan({ unit: "per5Pax", gia: { adult: 800000, child: null, senior: null }, moiKhach: 800001, theoLoai: null, ten: "Phao" })!, /mỗi lượt/);
assert.equal(mucVuotGiaBan({ unit: "lạ", gia: G, moiKhach: 9000000, theoLoai: null, ten: "X" }), null);
assert.equal(mucVuotGiaBan({ unit: "perPax", gia: { adult: null, child: null, senior: null }, moiKhach: 9000000, theoLoai: null, ten: "X" }), null);
```

- [ ] **Step 2: Viết bài route đỏ:** `500.000 đ cho vé 300.000 đ trả 400` qua Thêm, Đổi, Sửa; `cùng số ở phạm vi nhóm và tất cả được nhận`; `Mọi khách như nhau 100.000 đ cho dịch vụ người lớn 1.000.000 đ, trẻ em 0 đ được nhận`; `phần trăm không so giá`; `dòng đã có vượt giá vì giá giảm sau đó: Sửa chỉ đổi ngày 200`. Thêm `ghi-muc-qua-cong.test.ts`: quét mọi tệp `.ts` không phải test trong `src/modules/pricing/` trừ `repository.ts`, tách theo `route("`, mọi khúc chứa `insertRuleStatement(`, `cauDoiMuc(` hoặc `cauSuaMuc(` phải chứa `kiemSoMucMoi(`; tệp không có `route("` mà nhắc các câu đó thì cả tệp phải chứa `kiemSoMucMoi(`.

- [ ] **Step 3: Chạy cho đỏ.** `node --test src/shared/gioi-han-nhap-muc.test.ts src/modules/pricing/gioi-han-nhap.test.ts src/modules/pricing/ghi-muc-qua-cong.test.ts`.

- [ ] **Step 4: Viết `mucVuotGiaBan`** dùng `parseUnit` của `order-lines.ts`: `group` chỉ so `moiKhach` với `gia.adult`; `unknown` trả null; `perPax` theo bài. Trong `kiemSoMucMoi`, khi `pv.scope === "SERVICE"` và `kind === "PER_PAX"`: lấy dịch vụ qua `getEffectiveServices`, không có dịch vụ thì bỏ qua, gọi `mucVuotGiaBan`.

- [ ] **Step 5: Chạy cho xanh**, rồi quan sát rào quét chặn thật: tạm bỏ lời gọi ở route `/doi` ⇒ bài đỏ ⇒ hoàn nguyên ⇒ xanh; ghi kết quả vào sổ thi công cho Task 9. Bài cũ cố ý tạo mức vượt qua route (`terms_exceed_price`, kiểu vé 300.000 đ): đổi sang phạm vi nhóm hoặc tất cả, giữ nguyên đáp án.

- [ ] **Step 6: Commit.** `Chặn mức hoa hồng vượt giá bán lúc nhập, canh mọi đường ghi (ADR-0161 Đ4)`.

### Task 3: Trần giảm giá không tính dòng vượt

**Files:**
- Modify: `src/shared/hoa-hong-dong.ts`, `src/modules/orders/thuong-mai.ts`, `src/modules/orders/price-guards.ts`, `src/shared/ben-kia-hien-thi.ts`, `src/modules/orders/index.ts`, `web/order-form.ts`, `src/modules/orders/tran-giam-gia-don.test.ts`, `golden/README.md`
- Create: `golden/tran-giam-gia-dong-vuot.json`

**Interfaces:**
- Produces (`hoa-hong-dong.ts`): `dongVuotThanhTien(d: { hoaHong: number | null; thanhTien: number }): boolean` (bằng nhau là không vượt); `hoaHongTinhTran(d): number` (thiếu mức hoặc vượt ⇒ 0); `tongTinhTran(dong: readonly { hoaHong: number | null; thanhTien: number }[]): number | null` (còn dòng thiếu ⇒ null).
- Produces (`ben-kia-hien-thi.ts`): `cauTranCoDongVuot(tran: number): string`; `cauTranGiamGiaForm(tong: number | null, coDongVuot?: boolean)`.
- Produces (`thuong-mai.ts`): `coDongVuotDon(chup, dichVu): boolean`; `DonChoTran` thêm `coDongVuot: boolean`.
- Chữ: trần 0 ⇒ `Chưa giảm giá được: mức hoa hồng của dịch vụ trong đơn đang vượt giá bán — nhờ Kế toán xem lại.`; trần còn số ⇒ `Giảm tối đa ${n} ₫ (không tính dịch vụ có mức hoa hồng vượt giá bán — nhờ Kế toán xem lại).`

- [ ] **Step 1: Viết bài đỏ** ở `tran-giam-gia-don.test.ts`, số là ba ca đã trình chủ:
  - `mức 100.000 đ/khách, vé 2 × 300.000: trần 200.000 như cũ, câu cũ`: giảm 200.001 ⇒ 400 `Giảm tối đa 200.000 ₫ (bằng hoa hồng của đơn).`
  - `mức 500.000 đ/khách phạm vi tất cả: Đối tác và Bán hàng giảm 1 đ đều 400 câu vượt; giảm 0 lập được và gửi được`.
  - `đơn vé vượt + tour 2.000.000 đ hoa hồng 300.000: giảm 300.000 nhận, giảm 300.001 ⇒ 400 câu còn số`.
  - `hoa hồng đúng bằng thành tiền vẫn tính vào trần`.
  - `đổi bên đặt sang đối tác có dòng vượt, đơn đang giảm: 409 discount_exceeds_commission, câu nhắc Kế toán xem lại`.
  - `Thực tập và Đối tác không phải người hưởng giữ luật cũ` (ca hiện có giữ nguyên).
  - Ca C-5 hiện có giữ nguyên đáp án.
  - Bài cạnh `ben-kia-hien-thi`: `cauTranGiamGiaForm(300000, true)` chứa `không tính dịch vụ`; `cauTranGiamGiaForm(null, true)` là null.

- [ ] **Step 2: Chạy cho đỏ.** `node --test src/modules/orders/tran-giam-gia-don.test.ts`.

- [ ] **Step 3: Viết.** `tongHoaHongDon(…, "tinh0")` cộng theo `hoaHongTinhTran`; chế độ `"null"` giữ số gốc. `donChoTran` điền `coDongVuot`. Nhánh 400 của `viPhamTranGiamGia` chọn câu: `benDatKhongHuong` trước, rồi `coDongVuot`, rồi `CAU_TRAN_HOA_HONG`. `cauDoiBenDatVuotHoaHong` nhận thêm `coDongVuot` và nối `Mức hoa hồng của dịch vụ đang vượt giá bán — nhờ Kế toán xem lại.`. Giá trị khởi tạo `don` ở `orders/index.ts` thêm `coDongVuot: false`. `web/order-form.ts` (khối gọi `cauTranGiamGiaForm`): tính từ `dong` của phản hồi bằng `tongTinhTran` và `some(dongVuotThanhTien)`, thay `tong.hoaHong`.

- [ ] **Step 4: Thêm sổ vàng** `golden/tran-giam-gia-dong-vuot.json`: ba ca của Step 1 (đầu vào, trần đúng từng đồng), `xac_nhan.trang_thai = "cho_xac_nhan"`, mô tả ghi số do AI soạn chờ Kế toán hoặc chủ xác nhận; bài ở Step 1 đọc tệp này làm đầu vào; thêm một dòng vào bảng của `golden/README.md`.

- [ ] **Step 5: Kiểm định kỳ giữ một định nghĩa.** `scripts/audit-thuong-mai.mjs` gọi `tongHoaHongDon(…, "tinh0")` nên tự theo luật mới: không thêm chế độ thứ ba, không sửa kịch bản. Thêm ca vào `src/kiem-dinh-ky-so-dai-ly.test.ts`: đơn gieo thẳng bản chụp có dòng vượt kèm giảm giá, xác nhận sau mốc ⇒ `R-ORD-DC1` có một vi phạm; đơn dòng đúng ⇒ 0. Sửa chú thích `chenhGiamGiaSauGhiTay` ở `hoa-hong-dong.ts`: hàm cố ý cộng số gốc vì đó là số sẽ vào sổ, khác trần.

- [ ] **Step 6: Chạy cho xanh**, gồm `node --test src/modules/orders/tran-giam-gia-don.test.ts src/modules/orders/price-guards.test.ts src/so-vang.test.ts src/so-vang-so-dai-ly.test.ts src/kiem-dinh-ky-so-dai-ly.test.ts src/phai-thu-mot-ham.test.ts src/shared/ben-kia-hien-thi.test.ts`, và `npm run typecheck`. Quan sát chặn thật: tạm cho `hoaHongTinhTran` trả số gốc ⇒ bài đỏ ⇒ hoàn nguyên; ghi vào sổ thi công.

- [ ] **Step 7: Commit.** `Trần giảm giá không tính dòng hoa hồng vượt thành tiền (ADR-0161 Đ5)`.

### Task 4: Màn đơn báo dòng vượt, không hiện số âm

**Files:**
- Modify: `src/shared/phan-doi-tac-hien-thi.ts`, `src/shared/phan-doi-tac-hien-thi.test.ts`, `web/phan-doi-tac.ts`

**Interfaces:**
- Consumes: `dongVuotThanhTien` (Task 3).
- Produces: `CAU_HOA_HONG_VUOT = "Hoa hồng vượt thành tiền — Kế toán xem lại"`; `chuGiaDaiLy(d: { thanhTien: number; hoaHong: number | null; giaDaiLy: number | null }, dinhDang): string`; `chuTongGiaDaiLy(tong: { giaDaiLy: number | null }, dong: readonly { thanhTien: number; hoaHong: number | null }[], dinhDang): string`.

- [ ] **Step 1: Viết bài đỏ:** `chuGiaDaiLy({ thanhTien: 600000, hoaHong: 1000000, giaDaiLy: -400000 }, f)` bằng `CAU_HOA_HONG_VUOT`; `giaDaiLy` null ⇒ `—`; bằng nhau ⇒ `0đ`; `chuTongGiaDaiLy` có một dòng vượt ⇒ `CAU_HOA_HONG_VUOT` dù tổng dương; `giaDaiLy` null ⇒ `Chưa đủ mức`.
- [ ] **Step 2: Chạy cho đỏ.** `node --test src/shared/phan-doi-tac-hien-thi.test.ts`.
- [ ] **Step 3: Viết hàm và thay bốn chỗ `giaDaiLy` ở `web/phan-doi-tac.ts`** (dòng văn phòng, tổng văn phòng, dòng đối tác, tổng đối tác). DTO không đổi.
- [ ] **Step 4: Chạy cho xanh**, `npm run typecheck`.
- [ ] **Step 5: Commit.** `Màn đơn báo hoa hồng vượt thành tiền thay cho số âm (ADR-0161 Đ4)`.

### Task 5: Luật thuần của bảng nhập

**Files:**
- Modify: `src/shared/hoa-hong-hien-thi.ts`, `src/shared/hoa-hong-phu-muc.ts`, các bài `*.test.ts` cạnh hai tệp, `web/so-dai-ly-ui.ts`

**Interfaces:**
- Consumes: `GiaBanLe` (Task 2), `hoaHongDong`, `dongVuotThanhTien`.
- Produces:
  - `dichVuThieuCuaCap(v: { cap: CapPhu; dichVu: readonly DichVuPhu[]; homNay: string }): DichVuPhu[]`; `phuMucCap` dùng lại hàm này, kết quả không đổi.
  - `maTranCap`: tham số `dichVu` có thêm `unit: string`, `gia: GiaBanLe`. `OMaTran = { nhan: string[] | null; dong: CommissionRuleDto[] }`. `HangMaTran` thêm `unit: string | null`, `gia: GiaBanLe | null`, `groupCode: string | null`. Bỏ `.filter(coDong)`: mọi nhóm và mọi dịch vụ đều có hàng; mã lạ vẫn đứng cuối nhóm của nó.
  - `locHangMaTran(hang, bo: { tim: string; nhom: string | null; chiThieu: boolean }, v: { thieu: ReadonlySet<string>; chuan: (s: string) => string }): HangMaTran[]`.
  - `nhanGiaBanLe(gia: GiaBanLe | null, unit: string | null): string[]`.
  - `cauXemTruocGiaDaiLy(v: { unit: string; gia: GiaBanLe; kieu: "RATE" | "PER_PAX"; tyLeBp: number | null; moiKhach: number | null; theoLoai: { treEm: number; nguoiCaoTuoi: number } | null }): string | null`.
  - `cotMucCap` đổi trường `cachTinh` thành `tinhBang` (`Phần trăm` | `Số tiền`) và thêm `apCho` (`Mọi khách như nhau` | `Riêng từng loại khách`).
  - `DanhMuc.dichVu` (`web/so-dai-ly-ui.ts`) có thêm `unit`, `gia`, lấy từ `prices` của `GET /api/catalog`.

- [ ] **Step 1: Viết bài đỏ:**
  - `maTranCap`: 120 dịch vụ, 6 cấp, không dòng nào ⇒ `hang.length === 1 + số nhóm + 120`, mỗi hàng 6 ô, ô `nhan` null và `dong` rỗng; ô có dòng mang đúng `dong`; dòng đã huỷ không vào.
  - `dichVuThieuCuaCap`: cấp rỗng ⇒ mọi dịch vụ; mức «tất cả» đang áp ⇒ rỗng; mức nhóm phủ đúng nhóm; dòng sắp áp không tính; khớp `phuMucCap` ở các ca `THIEU`.
  - `locHangMaTran`: `chiThieu` ẩn hàng «Mọi dịch vụ», hàng nhóm và dịch vụ đủ; `nhom` giữ hàng nhóm đó và dịch vụ của nó; `tim` không phân biệt dấu qua `chuan`.
  - `cauXemTruocGiaDaiLy`: giá 1.050.000 / 800.000 / 800.000, số tiền 100.000, trẻ em 50.000, cao tuổi 100.000 ⇒ `Giá đại lý xem trước: người lớn 950.000đ · trẻ em 750.000đ · người cao tuổi 700.000đ`; phần trăm 18%, giá 500.000 ⇒ `người lớn 410.000đ`; vượt ⇒ `người lớn vượt giá bán`, không có dấu trừ; `per5Pax` có số theo loại ⇒ `mỗi lượt 800.000đ` theo số người lớn; mọi giá null ⇒ null.
  - `nhanGiaBanLe`: `perPax` một dòng mỗi loại có giá (`Người lớn 1.050.000đ`); `per5Pax` ⇒ `1.000.000đ/lượt`; null ⇒ `[]`.
  - Cấp đã khoá (Review Focus): ca dùng `viecDongMuc` với `capDangBat: false` chỉ còn `NGUNG`, và cột `dangBat: false` đi kèm `o` để giao diện không dựng nút thêm.

- [ ] **Step 2: Chạy cho đỏ.** `node --test src/shared/hoa-hong-hien-thi.test.ts src/shared/hoa-hong-phu-muc.test.ts`.
- [ ] **Step 3: Viết.** Xem trước đi qua `hoaHongDong`, không chép công thức. Sửa `web/hoa-hong-cap.ts` tối thiểu cho hết lỗi kiểu (`cot.cachTinh` → `cot.tinhBang`); phần còn lại ở Task 6.
- [ ] **Step 4: Chạy cho xanh**, `npm run typecheck`.
- [ ] **Step 5: Commit.** `Luật thuần cho bảng nhập hoa hồng theo dịch vụ và cấp`.

### Task 6: Bảng nhập và hộp «Tính bằng», «Áp cho»

**Files:**
- Modify: `web/hoa-hong-cap.ts`, `web/hoa-hong-hop.ts`, `web/hoa-hong.ts`, `public/app.css`, `public/hoa-hong.html` (nếu cần chỗ đặt)

**Interfaces:**
- Consumes: Task 1 `GET /api/pricing/gioi-han-nhap`, `viPhamGioiHanNhap`; Task 5 toàn bộ.
- Produces: `MoHop.themMuc(dien?: { ai: …; phamVi?: { phamVi: "ALL" | "GROUP" | "SERVICE"; code: string | null; ten: string; unit: string | null; gia: GiaBanLe | null } })`; `DuLieuHoaHong.gioiHan: GioiHanNhapResponse | null`.

- [ ] **Step 1: Viết `veMaTran` bản nhập.** Cột `Dịch vụ`, `Giá bán lẻ` (`nhanGiaBanLe`), rồi từng cấp. Người có `partner.commission.write`: ô trống của cấp đang bật là `<button>` chữ `—`, `aria-label` `Thêm hoa hồng: <tên cấp> · <tên hàng>`, gọi `mo.themMuc({ ai: { loai: "MUC", code }, phamVi })`; ô có mức là `<button>` mở `moViecKhac` với các việc từ `viecDongMuc` của từng dòng trong `o.dong`, gọi `mo.doi`, `mo.sua`, `mo.ngung(r, urlNgung(r))`; nhiều dòng thì nhãn việc kèm `nhanMucDto(r)`. Người chỉ xem và cấp đang khoá: chữ thường, như hôm nay.
- [ ] **Step 2: Thêm thanh lọc** trên bảng: ô tìm (16px), ô chọn nhóm, ô tích `Còn thiếu mức`; dùng `locHangMaTran`, `thieu` là hợp của `dichVuThieuCuaCap` trên mọi cấp đang bật, `chuan` là hàm `taoChonDichVu` đang dùng. Giữ bộ lọc ở biến cấp mô-đun như `capChon`. Lọc không gọi máy chủ.
- [ ] **Step 3: Giữ chỗ khi vẽ lại:** trong `veTheCap`, lưu `window.scrollY`, `scrollTop`, `scrollLeft` của `.hh-ma-tran-khung` và phần tử đang nhập, khôi phục sau `replaceChildren`. CSS: khung cuộn hai chiều có chiều cao giới hạn bằng token mới, đầu cột và cột dịch vụ dính (`position: sticky`), trang không cuộn ngang.
- [ ] **Step 4: Sửa hộp.** `dungCachTinh`: `Cách tính` thành `Tính bằng` với hai lựa chọn `Phần trăm`, `Số tiền`; ô tích `Tách theo loại khách` thành ô chọn `Áp cho` (`Mọi khách như nhau`, `Riêng từng loại khách`); chọn phần trăm thì `Áp cho` khoá ở `Mọi khách như nhau`; `doc().theoLoai` theo ô này. `themMuc`: có `phamVi` thì thay ba ô dịch vụ bằng dòng chữ tên hàng, `docDichVu` trả phạm vi đã chọn; khi có `gia` hiện `cauXemTruocGiaDaiLy` cập nhật theo ô, trong `aria-live`. `chuan()` của hộp gọi `viPhamGioiHanNhap` khi có `d.gioiHan`, báo dưới ô `muc`; máy chủ vẫn kiểm lại. Hộp có câu nhắc giới hạn đang áp.
- [ ] **Step 5: `web/hoa-hong.ts` nạp `gioiHan`** song song các phần khác, lỗi thì null, không chặn trang. Bảng `bangDongMuc` đổi đầu cột `Cách tính` thành `Tính bằng`, thêm cột `Áp cho`.
- [ ] **Step 6: Kiểm trên Chrome bằng D1 local tạm:** khổ 1440 và 1040, nhập liên tiếp ba ô: sau mỗi lần ghi trang giữ vị trí cuộn và bộ lọc, ô vừa nhập hiện số mới. Khổ 390 vẫn là danh sách theo cấp. Chụp ảnh thật ba khổ 1440, 1040, 390 vào `docs/evidence/2026-11-03-chiet-khau-bon-truc/anh/`; điều phối trình chủ ngay, không chờ Task 9, các task sau đi tiếp. Kết quả ghi vào sổ thi công.
- [ ] **Step 7: Commit.** `Bảng nhập hoa hồng theo hàng dịch vụ, cột cấp và hộp Tính bằng, Áp cho (ADR-0161 Đ1, Đ2)`.

### Task 7: Bỏ lối thêm mức riêng cho vai trò, chữ, gợi ý điều kiện

**Files:**
- Modify: `web/hoa-hong-loai.ts`, `web/hoa-hong-hop.ts`, `web/hoa-hong.ts`, `src/shared/hoa-hong-hien-thi.ts`, `src/shared/bang-tu-giao-dien.ts`, bài cạnh

- [ ] **Step 1: Bỏ nút** `＋ Thêm mức riêng cho vai trò này` ở `web/hoa-hong-loai.ts`. Bỏ ô chọn `Vai người dùng` trong `themMuc`: nhánh không phải cấp chỉ còn ô tìm đối tác; bỏ khỏi kiểu `dien.ai` biến thể `VAI`, xoá phần chết (`tuLoai`, `canh`, `cauCanhBaoTheoChinhSach` nếu không còn nơi dùng). Nút đầu trang và thanh đáy đổi chữ thành `＋ Thêm mức riêng cho đối tác` (giả định bề mặt, ghi ở sổ thi công). Dòng riêng đã có của vai trò vẫn hiện với đủ việc.
- [ ] **Step 2: Thêm vào `TU_DA_LOAI`:** `{ cam: /Cách tính/u, thay: "Tính bằng · Áp cho", nguon: "chủ 2026-11-03 (ADR-0161)" }`. Chạy `node --test src/bang-tu-giao-dien.test.ts`, sửa nơi còn sót.
- [ ] **Step 3: Ô ghi chú ở hộp Sửa cấp** (`suaDanhMuc`, chỉ `t.loai === "CAP"`) thêm câu `Ghi điều kiện áp dụng ở đây để mọi người đọc (doanh thu, quy mô, cam kết). Nền tảng không tự kiểm điều kiện này.`, đặt ở `hoa-hong-hien-thi.ts`.
- [ ] **Step 4: Kiểm:** route `POST /api/pricing/hoa-hong` với đích vai trò vẫn nhận (bài cũ xanh); `node --test src/shared/hoa-hong-hien-thi.test.ts src/bang-tu-giao-dien.test.ts`, `npm run typecheck`.
- [ ] **Step 5: Commit.** `Vai trò chỉ đi qua cấp trên giao diện; chữ Tính bằng, Áp cho (ADR-0161 Đ2, Đ6)`.

### Task 8: Trang «Giới hạn nhập hoa hồng» cho Toàn quyền

**Files:**
- Create: `public/hoa-hong-gioi-han.html` (khuôn `public/ve-cai-dat.html`), `web/hoa-hong-gioi-han.ts` (khuôn `web/ve-cai-dat.ts`)
- Modify: `package.json` (`build:web`), `src/shared/sw-policy.ts` (ba danh sách), `src/shared/muc-giao-dien.ts` (bảng `TRANG` khoá `hoaHongGioiHan`, đường `/hoa-hong-gioi-han`, hiện theo `settings.ops`; hai mảng menu, ngay sau dòng `veCaiDat`, nhãn `Giới hạn nhập hoa hồng`), `src/shared/muc-giao-dien-goi.ts` (`GET /api/pricing/gioi-han-nhap`), `src/shared/so-do-trang.ts`, `src/shared/huong-dan-bai-noi-dung.ts`, `src/muc-giao-dien-menu-moi.test.ts`, `src/goi-trang-nhe.test.ts`

- [ ] **Step 1: Thêm tên trang vào `src/muc-giao-dien-menu-moi.test.ts`, chạy cho đỏ.** Công thức đầy đủ: `docs/CHANGE-GUIDE.md` mục c.
- [ ] **Step 2: Viết trang.** Hai ô `Phần trăm tối đa (%)` (đọc bằng `docTyLePhanTram`) và `Số tiền phải chia hết cho (đồng)` (đọc bằng `docTienMoiKhach`), nút `Lưu`, câu `Số mới áp cho các mức nhập từ lúc này; mức đã có và đơn đã xác nhận giữ nguyên.` `POST` kèm `tuLuc` đã đọc; 409 thì hiện nguyên câu máy chủ. Không `settings.ops` ⇒ `Trang này chỉ Toàn quyền dùng được.`
- [ ] **Step 3: Khai đủ các tệp trên,** thêm mục Hướng dẫn theo mẫu dòng `veCaiDat`, nới trần gói chỉ theo số đo được, kèm chú thích ADR-0161.
- [ ] **Step 4: Chạy.** `node --test src/muc-giao-dien-menu-moi.test.ts src/shared/sw-policy.test.ts src/goi-trang-nhe.test.ts src/giao-dien-hoi-bang-quyen.test.ts`, `npm run typecheck`, `npm run build:web`.
- [ ] **Step 5: Commit.** `Trang Giới hạn nhập hoa hồng cho Toàn quyền (ADR-0161 Đ3)`.

### Task 9: Tài liệu, sổ hàng rào, kịch bản Chrome, bộ kiểm dài

**Files:**
- Create: `docs/evidence/2026-11-03-chiet-khau-bon-truc/kich-ban/bang-nhap-smoke.mjs`
- Modify: `docs/SO-HANG-RAO.md`, `docs/SYSTEM-DESIGN.md` (§5, §7, §9), `docs/CHANGE-GUIDE.md` (bẫy: giới hạn nhập áp ở route, bài gieo mức qua route phải theo giới hạn), kịch bản `hoa-hong-smoke.mjs` (ghi đầu tệp phần đã thay), sổ thi công. Dòng kịch bản mới ở `web/CLAUDE.md`: điều phối tự thêm ở cuối

- [ ] **Step 1: Sổ hàng rào, bốn dòng có ngày quan sát chặn thật:** giới hạn nhập ở `kiemSoMucMoi`; chặn vượt giá lúc nhập; rào quét `ghi-muc-qua-cong.test.ts`; trần không tính dòng vượt. Lấy bằng chứng từ sổ thi công, thiếu thì làm phép sửa cố ý rồi hoàn nguyên.
- [ ] **Step 2: Viết `bang-nhap-smoke.mjs`,** 1440, 1040, 390, cần `AXE_JS`, không cần mạng ngoài, D1 tạm 120 dịch vụ, 6 cấp: Kế toán thấy đủ hàng và giá; bấm ô trống tạo đúng một dòng đúng cấp; tìm và lọc còn thiếu; đo thời gian mở; không cuộn ngang cả trang; Bán hàng không có nút; Đối tác bị chặn; Toàn quyền đổi giới hạn; màn đơn không có số âm. Chụp ảnh thật ba khổ vào cùng thư mục để trình chủ.
- [ ] **Step 3: Chạy mỗi bộ một lần:** `npm run typecheck`; `npm test`; `npm run test:e2e -- muc-ta so-dai-ly so-dai-ly-dot-2`; `node docs/evidence/2026-11-03-chiet-khau-bon-truc/kich-ban/bang-nhap-smoke.mjs`; `hoa-hong-smoke.mjs`; `a2-smoke-form.mjs`. Mong đợi: đều xanh, ghi số vào sổ thi công. Đỏ thì sửa đúng chỗ và chỉ chạy lại bài đó, bộ dài chạy lại khi sửa chạm mã dùng chung.
- [ ] **Step 4: Commit.** `Tài liệu, sổ hàng rào và kịch bản Chrome cho chính sách chiết khấu`.

## Bảng tiêu chí của đặc tả

| Tiêu chí đặc tả mục 5 | Task |
|---|---|
| 1, 2 bảng nhập theo quyền, bấm ô đúng cấp | 5, 6, 9 |
| 3, 4, 5 giới hạn | 1 |
| 6 vượt giá | 2, 4 |
| 7 trần giảm giá | 3 |
| 8 phần trăm không riêng loại khách | 1 (route), 6 (hộp) |
| 9 bỏ lối vai trò | 7 |
| 10 bảng 720 ô | 6, 9 |
| 11 bộ kiểm | 9 |
