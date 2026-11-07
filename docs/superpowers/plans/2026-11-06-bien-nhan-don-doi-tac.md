# Biên nhận mẫu HD-02-DT cho đơn của đối tác — kế hoạch thi công

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Đơn của đối tác (tài khoản Đối tác thuần lập, hoặc bên đặt là đối tác) in biên nhận theo mẫu HD-02-DT: không logo, thương hiệu + khẩu hiệu, giá công bố, «Phải thu» = số khách còn phải trả.

**Architecture:** Máy chủ (module `receipt`) quyết mẫu và gửi thêm hai cờ trong `ReceiptDto` (danh sách trắng, không thêm số tiền). Luật thuần dùng chung `src/shared/order-confirmation.ts` dựng mô hình khối theo mẫu; bộ vẽ `web/confirmation-image.ts` chỉ thêm hai khả năng cho khối phần đầu (không logo, mã mẫu). Hộp thoại ảnh gửi khách không đổi.

**Tech Stack:** TypeScript, Cloudflare Worker + D1, `node --test` (khung thử `tests/audit/harness.mjs`), canvas trên trình duyệt, esbuild, Chrome chạy ngầm cho kịch bản ảnh.

**Spec:** `docs/superpowers/specs/2026-11-06-bien-nhan-don-doi-tac-design.md` (chủ duyệt 2026-11-06). Ảnh đã duyệt: `docs/evidence/2026-11-06-bien-nhan-doi-tac/so-sanh-mau-de-xuat.png`.

## Global Constraints

- Việc lớn (CLAUDE.md §3): thi công xong phải có người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`) trước khi báo đạt.
- Không migration, không đổi bảng. Không thêm giá danh mục, hoa hồng, giá đại lý, a%, người hưởng vào `ReceiptDto`; chép từng trường, không trải đối tượng (ADR-0026 đ11).
- Không tính thêm số tiền nào; mọi số lấy từ `ReceiptDto` hiện có (`subtotal`, `discount`, `giamTru`, `daTra`, `conLai`, `phan`).
- Chữ cố định (đúng từng ký tự): `Mẫu HD-02-DT` · `Tour Đảo Nha Trang` · `Trải nghiệm biển đảo tuyệt vời tại Khánh Hòa` · `Hotline: <hotline>` · `Họ tên khách` · `Số điện thoại` · `Địa chỉ` · `Ghi chú` · `Số lượng` · `Khởi hành` · `Giờ đón` · `Địa chỉ đón` · `Khách có mặt` · `Loại khách` · `Mô tả` · `SL` · `Giá công bố` · `Đơn giá` · `Thành tiền` · `Cộng dịch vụ` · `Tổng giá công bố` · `Tạm tính` · `Giảm giá` · `Giảm sau khi giao` · `Khách đã trả trước` · `Đã thu` · `Phải thu`.
- Mẫu nội bộ (đơn khách lẻ) KHÔNG đổi: ảnh giống từng phép vẽ trước khi sửa.
- `src/shared/` import kèm đuôi `.ts`; `web/` import `src/shared` không đuôi. Commit tiếng Việt, thân nói vì sao, kèm dòng đồng tác giả.

## Review Focus

1. Đơn đối tác đã giao (`delivered`/`completed`): dòng trả trước đổi chữ thành «Đã thu», «Phải thu» thường bằng 0 — không được mất dòng hay sai chữ.
2. `daTra` âm (trả lại khách nhiều hơn đã thu): dòng trả trước vẫn phải hiện để Tổng − Giảm giá − Giảm sau giao − Đã trả = Phải thu còn cộng khớp. Vì vậy điều kiện hiện dòng là **khác 0** (đặc tả viết «> 0»; chọn «khác 0» để giữ tiêu chí 5).
3. Đơn đối tác nhiều người bán (`phan.length ≥ 2`): các dòng «Phần …» và câu chân trang vai từng phần giữ nguyên như mẫu nội bộ.
4. Điểm đón khác nhau chỉ vì khoảng trắng/ký tự điều khiển: so sau khi làm sạch (`clean`), nên «KS A» và « KS A » là một nơi.
5. Đơn đối tác bị huỷ: thân giống hệt thông báo huỷ của mẫu nội bộ (mọi dòng hoàn, chuyển, đang đối chiếu), chỉ khác khối phần đầu.

---

### Task 1: Máy chủ quyết mẫu và gửi cờ giá

**Files:**
- Modify: `src/shared/contracts.ts` (`ReceiptDto`, `ReceiptServiceDto`)
- Modify: `src/modules/receipt/rules.ts` (`dungBienNhan`, hàm mới `mauBienNhan`)
- Modify: `src/modules/receipt/index.ts` (route `GET /api/orders/:id/receipt`)
- Modify: `src/modules/orders/xac-nhan-repo.ts` (câu SQL mới), `src/modules/orders/index.ts` (xuất hàm mới)
- Test: `src/modules/receipt/bien-nhan.test.ts`

**Interfaces:**
- Produces:
  - `export type MauBienNhan = "noi_bo" | "doi_tac";` (contracts.ts) — `ReceiptDto.mau: MauBienNhan`; `ReceiptServiceDto.giaKhacCongBo: boolean`.
  - `export function mauBienNhan(i: { bookerLaDoiTac: boolean; nguoiLapDoiTacThuan: boolean }): MauBienNhan` (receipt/rules.ts) — `"doi_tac"` khi một trong hai đúng.
  - `dungBienNhan(order, company, tien, ban, nguoiLapDoiTacThuan: boolean): ReceiptDto` — tham số thứ năm mới.
  - `export async function nguoiLapDoiTacThuan(db: D1Database, staffId: string): Promise<boolean>` (orders/index.ts).

- [ ] **Step 1: Viết bài đỏ (luật) trong `bien-nhan.test.ts`**

Sửa bài «NT-B1 (luật)»: danh sách khoá `ReceiptDto` thêm `"mau"` (17 khoá), khoá dịch vụ thêm `"giaKhacCongBo"`. Thêm:

```ts
test("HD-02-DT (luật): mauBienNhan — bên đặt là đối tác HOẶC người lập là Đối tác thuần ⇒ doi_tac", () => {
  assert.equal(mauBienNhan({ bookerLaDoiTac: false, nguoiLapDoiTacThuan: false }), "noi_bo");
  assert.equal(mauBienNhan({ bookerLaDoiTac: true, nguoiLapDoiTacThuan: false }), "doi_tac");
  assert.equal(mauBienNhan({ bookerLaDoiTac: false, nguoiLapDoiTacThuan: true }), "doi_tac");
});
test("HD-02-DT (luật): giaKhacCongBo — đơn giá ≠ giá danh mục hoặc dòng không có giá danh mục ⇒ true; khớp mọi dòng ⇒ false; DTO không mang giá danh mục", () => {
  const khop = { ...donBiMat(), services: [{ ...donBiMat().services[0]!, items: [{ ...donBiMat().services[0]!.items[0]!, unitPrice: 500_000, catalogPrice: 500_000 }] }] };
  assert.equal(dungBienNhan(khop, COMPANY, { daTra: 0, conLai: 1_000_000 }, null, false).services[0]!.giaKhacCongBo, false);
  assert.equal(dungBienNhan(donBiMat(), COMPANY, { daTra: 0, conLai: 1_000_000 }, null, false).services[0]!.giaKhacCongBo, true); // catalogPrice = 480017
  const tay = { ...khop, services: [{ ...khop.services[0]!, items: [{ ...khop.services[0]!.items[0]!, catalogPrice: null }] }] };
  assert.equal(dungBienNhan(tay, COMPANY, { daTra: 0, conLai: 1_000_000 }, null, false).services[0]!.giaKhacCongBo, true);
  assert.equal(coLo(JSON.stringify(dungBienNhan(donBiMat(), COMPANY, { daTra: 0, conLai: 1 }, null, true))), false);
  assert.equal(dungBienNhan({ ...donBiMat(), bookerLaDoiTac: false }, COMPANY, { daTra: 0, conLai: 1 }, null, false).mau, "noi_bo");
});
```

- [ ] **Step 2: Viết bài đỏ (route thật)** — `"HD-02-DT (route thật): mẫu theo người lập và bên đặt; văn phòng và đối tác mở cùng đơn ra cùng mẫu"`

Gieo bằng `seedStaff`: `SALES` (`["SALES"]`), `DT` (`["PARTNER"]`, Đối tác thuần), `LAI` (`["SALES","PARTNER"]`). Gieo hồ sơ tổ chức `DLA` mang vai `TRAVEL_AGENCY` (khuôn hàm `toChuc` ở `src/modules/orders/ben-dat-doi-tac.test.ts`). Chèn bốn đơn đã xác nhận bằng SQL như bài «NT-B1 (route thật)» (mỗi đơn một dịch vụ, một dòng tiền `unit_price = catalog_price`):

| Đơn | `staff_id` | `booker_party_id` | `mau` mong đợi |
|---|---|---|---|
| A | DT | NULL | `doi_tac` |
| B | SALES | NULL | `noi_bo` |
| C | LAI | NULL | `noi_bo` |
| D | SALES | DLA | `doi_tac` |

Khẳng định `GET /api/orders/<id>/receipt` (as SALES cho B, C, D; as DT và as SALES cho A — cùng `mau`), status 200, `json.receipt.mau` đúng bảng, `json.receipt.services[0].giaKhacCongBo === false`.

- [ ] **Step 3: Chạy cho đỏ**

Run: `node --test src/modules/receipt/bien-nhan.test.ts`
Expected: FAIL — `mauBienNhan` chưa có; danh sách khoá thiếu `mau`.

- [ ] **Step 4: Thi công**

- contracts.ts: thêm `MauBienNhan`, hai trường mới (chú thích một dòng: ai quyết, không mang số).
- receipt/rules.ts: `mauBienNhan`; trong `dungBienNhan` đặt `mau: mauBienNhan({ bookerLaDoiTac: order.bookerLaDoiTac, nguoiLapDoiTacThuan })` và cho mỗi dịch vụ `giaKhacCongBo: s.items.some((it) => it.catalogPrice === null || it.unitPrice !== it.catalogPrice)`.
- orders/xac-nhan-repo.ts, cạnh `NGUOI_LAP_GIU_DOI_TAC`:

```ts
const QUYEN_MO_NGUOI_LAP = defineSql("orders", "order_creator_open_permissions", `SELECT permission_code FROM v_stf_quyen_mo WHERE staff_id = ?1`);
```

  hàm đọc trả `string[]`; `nguoiLapDoiTacThuan` ở orders/index.ts gọi nó rồi trả `apCongTacAnKhach({ permissions })` (`src/shared/an-thong-tin-khach.ts`). Chú thích: mã quyền là điều kiện DỮ LIỆU chọn mẫu in, không phải điều kiện cho phép; đọc hiện trạng, không chụp.
- receipt/index.ts: trong `Promise.all` SAU các `can(` thêm `nguoiLapDoiTacThuan(env.DB, order.staffId)`, truyền vào `dungBienNhan`.

- [ ] **Step 5: Chạy cho xanh**

Run: `node --test src/modules/receipt/bien-nhan.test.ts src/architecture.test.ts src/orders-cong-bo.test.ts && npm run typecheck`
Expected: PASS, typecheck 0 lỗi.

- [ ] **Step 6: Commit** — `Biên nhận: máy chủ chọn mẫu đơn đối tác và gửi cờ giá khác danh mục`

---

### Task 2: Mô hình và ảnh mẫu HD-02-DT

**Files:**
- Create: `docs/evidence/2026-11-06-bien-nhan-doi-tac/kich-ban/mau-hd-02-dt.mjs` (kịch bản ảnh, khuôn theo bản dựng thử: esbuild gói bộ vẽ thật + nhúng phông/logo thành một trang, Chrome chạy ngầm `--dump-dom` và `--screenshot`)
- Create: `docs/evidence/2026-11-06-bien-nhan-doi-tac/kich-ban/noi-bo-truoc-khi-sua.json` (các phép vẽ của mẫu nội bộ, chụp TRƯỚC khi sửa)
- Modify: `src/shared/order-confirmation.ts`
- Modify: `web/confirmation-image.ts` (`headerBlock`)
- Test: `src/shared/order-confirmation.test.ts`

**Interfaces:**
- Consumes: `ReceiptDto.mau`, `ReceiptServiceDto.giaKhacCongBo` (Task 1).
- Produces: `HeaderBlock` thêm `logo: boolean` và `maMau: string | null` (mẫu nội bộ: `true`, `null`). Hằng xuất ở order-confirmation.ts: `MA_MAU_DOI_TAC = "Mẫu HD-02-DT"`, `THUONG_HIEU = "Tour Đảo Nha Trang"`, `KHAU_HIEU = "Trải nghiệm biển đảo tuyệt vời tại Khánh Hòa"`. Chữ ký `buildConfirmation(receipt, handler)` không đổi.

- [ ] **Step 1: Viết kịch bản ảnh và chụp mốc mẫu nội bộ trên mã CHƯA sửa**

Kịch bản dựng hai mô hình từ `ReceiptDto` mẫu (dữ liệu của ảnh đã duyệt): đơn nội bộ (`mau: "noi_bo"`) và đơn đối tác (`mau: "doi_tac"`), gọi `prepareConfirmation(model)` và ghi `layout.ops` ra JSON trong trang và `renderConfirmationPng` (hiện ảnh để chụp). Chế độ `MOC=1` ghi phép vẽ của mẫu nội bộ vào `noi-bo-truoc-khi-sua.json`. Ở mã chưa sửa, trường `mau` thừa bị bỏ qua nên mẫu đối tác chưa có — chỉ ghi mốc.

Run: `MOC=1 node docs/evidence/2026-11-06-bien-nhan-doi-tac/kich-ban/mau-hd-02-dt.mjs`
Expected: tệp mốc được ghi; in `✓ mốc nội bộ`.

- [ ] **Step 2: Viết bài đỏ trong `order-confirmation.test.ts`**

Thêm `buildDt(o, handler?)` = `buildConfirmation(dungBienNhan({ ...o, bookerLaDoiTac: true }, COMPANY, { daTra: o.paid, conLai: o.remaining }, null, false), handler)`. Các bài:

- `"HD-02-DT: phần đầu không logo, có mã mẫu, thương hiệu, khẩu hiệu, Hotline; không MST, không địa chỉ công ty"` — `header` deepEqual `{ kind: "header", logo: false, maMau: "Mẫu HD-02-DT", companyName: "Tour Đảo Nha Trang", lines: ["Trải nghiệm biển đảo tuyệt vời tại Khánh Hòa", "Hotline: 0845 256 256"] }`; `JSON.stringify(model)` không chứa `"4201969169"`, `"Vĩnh Điềm Trung"`, `"CÔNG TY TNHH"` (đơn một người bán).
- `"mẫu nội bộ: phần đầu giữ logo, không mã mẫu"` — `one(build(order()), "header")` có `logo: true`, `maMau: null`.
- `"HD-02-DT: khối khách — Họ tên khách, Số điện thoại, Địa chỉ (một điểm đón), Ghi chú; không email"` — nhãn rows = `["Họ tên khách", "Số điện thoại", "Địa chỉ", "Ghi chú"]`, giá trị Địa chỉ `"Khách sạn Sunrise"`.
- `"HD-02-DT: hai điểm đón khác nhau ⇒ khối khách không Địa chỉ, mỗi dịch vụ có Địa chỉ đón; « KS A » và «KS A» là một nơi"`.
- `"HD-02-DT: dịch vụ — Số lượng, Khởi hành, Giờ đón, Khách có mặt; cột Loại khách | SL | Giá công bố | Thành tiền"` — dùng `svc({ items: [item()] })` (giá khớp) → `details` nhãn `["Số lượng", "Khởi hành", "Giờ đón", "Khách có mặt"]`, Giờ đón `"07:00"`; `columns` deepEqual `{ description: "Loại khách", quantity: "SL", unitPrice: "Giá công bố", lineTotal: "Thành tiền" }`.
- `"HD-02-DT: dịch vụ có giá bị sửa ⇒ cột Đơn giá, dòng tổng đầu Tạm tính; dịch vụ theo nhóm / nhập tay ⇒ cột Mô tả"` — `svc()` mặc định (trẻ em 900.000 ≠ 950.000) → `unitPrice: "Đơn giá"`, `summary.rows[0].label === "Tạm tính"`; `unit: "per4Pax"` → `description: "Mô tả"`.
- `"HD-02-DT: tổng — Tổng giá công bố, Giảm giá (khác 0), Khách đã trả trước (khác 0), Phải thu = conLai; cộng khớp"` — dịch vụ giá khớp `svc({ items: [item()] })`, `subtotal` 2.700.000. Ba ca: (a) `discount`/`giamGiaHieuLuc` 0, `total` 2.700.000, `paid` 0, `remaining` 2.700.000 → nhãn `["Tổng giá công bố", "Phải thu"]`, Phải thu `"2.700.000 ₫"`; (b) giảm 100.000 (cả `discount` lẫn `giamGiaHieuLuc`), `total` 2.600.000, `paid` 1.000.000, `remaining` 1.600.000 → `["Tổng giá công bố", "Giảm giá", "Khách đã trả trước", "Phải thu"]`, Phải thu `"1.600.000 ₫"`, `emphasis` chỉ ở Phải thu; (c) `paid` −50.000, `remaining` 2.650.000 → dòng «Khách đã trả trước» có mặt.
- `"HD-02-DT: đã giao ⇒ dòng Đã thu thay Khách đã trả trước"` — `deliveredAt` có, `paid` 3.500.000, `remaining` 0.
- `"HD-02-DT: đơn huỷ ⇒ thân giống hệt thông báo huỷ của mẫu nội bộ, chỉ khác phần đầu"` — `status: "cancelled"`, gọi thẳng `dungBienNhan(o, COMPANY, { daTra: 300_000, conLai: 0, huy: { nhom: "KHACH_HUY", daTra: 300_000, dangDoiChieu: 0, hoanTruocHuy: 0, daDuyet: 0, daChi: 0, daChuyen: 0, daDuyetChuyen: 0, han: "2026-10-01" } }, null, false)` hai lần (`bookerLaDoiTac` false / true) rồi `buildConfirmation`; `.blocks.slice(1)` deepEqual nhau, khối đầu khác nhau.
- `"HD-02-DT: nhiều người bán ⇒ giữ các dòng Phần … và câu vai từng phần"` — lấy `ReceiptDto` của `dungBienNhan` rồi ghi đè `phan` bằng hai phần tay (một `nguoi_ban`, một `doi_tac_dat_ve`, Σ khớp `total`/`daTra`/`conLai`), dựng cả hai mẫu: các dòng summary sau «Phải thu» bằng đúng các dòng sau «Còn lại» của mẫu nội bộ; footer bằng nhau.

- [ ] **Step 3: Chạy cho đỏ**

Run: `node --test src/shared/order-confirmation.test.ts`
Expected: FAIL ở các bài HD-02-DT; 26 bài cũ vẫn xanh.

- [ ] **Step 4: Thi công `order-confirmation.ts`**

`buildConfirmation`: phần đầu = `receipt.mau === "doi_tac"` ? `headerDoiTac(company)` : `headerBlock(company)` (thêm `logo: true, maMau: null`). Thân: `status.khoa === "cancelled"` hoặc `mau === "noi_bo"` → các khối như hôm nay; ngược lại → `customerDoiTac`, `serviceDoiTac`, `summaryDoiTac`, rồi `footerBlock` cũ. Các luật:
- Địa chỉ: tập `clean(pickupPlace)` khác rỗng của mọi dịch vụ; đúng một phần tử → dòng «Địa chỉ» ở khối khách; từ hai → dòng «Địa chỉ đón» (= `clean(pickupPlace)`) ở từng dịch vụ có điểm đón, đặt sau «Giờ đón».
- Cột đầu: `parseUnit(unit).kind === "perPax"` → «Loại khách», khác → «Mô tả». Cột giá: `giaKhacCongBo` → «Đơn giá», không → «Giá công bố».
- Tổng: dòng đầu «Tổng giá công bố» khi không dịch vụ nào `giaKhacCongBo`, ngược lại «Tạm tính» (giá trị `subtotal`); «Giảm giá» khi `discount !== 0` (giá trị `-discount`, cách in như mẫu cũ); «Giảm sau khi giao» khi `giamTru`; dòng trả trước khi `daTra !== 0`, nhãn «Đã thu» khi đã giao (cùng điều kiện `daGiao` của `summaryBlock`) không thì «Khách đã trả trước»; «Phải thu» (`conLai`, emphasis); rồi `dongPhan(order)`.
- Cập nhật chú thích đầu tệp: hai mẫu, ai quyết mẫu, mẫu đối tác bỏ gì.

- [ ] **Step 5: Chạy cho xanh**

Run: `node --test src/shared/order-confirmation.test.ts`
Expected: PASS toàn bộ.

- [ ] **Step 6: Thi công `web/confirmation-image.ts` `headerBlock`**

Vẽ logo khi `c.hasLogo && b.logo`; chữ lệch theo đúng điều kiện đó. `b.maMau` khác null → một phép vẽ chữ tag `"ma-mau"`, căn phải tại `x = W - MG`, `top = y + 10`, `lh = 16`, phông thân 400 cỡ 11, màu `c.theme.muted`. Mẫu nội bộ không được sinh thêm phép vẽ nào.

- [ ] **Step 7: Chạy kịch bản ảnh**

Run: `npm run build:web && node docs/evidence/2026-11-06-bien-nhan-doi-tac/kich-ban/mau-hd-02-dt.mjs`
Expected: `✓ nội bộ giống mốc` (phép vẽ deepEqual `noi-bo-truoc-khi-sua.json`); `✓ đối tác: không phép vẽ logo, có ma-mau «Mẫu HD-02-DT», không chữ MST`; ảnh ghi ở `docs/evidence/2026-11-06-bien-nhan-doi-tac/anh/` (nội bộ, đối tác, đối tác huỷ). Mở ảnh đối tác, so mắt với ảnh đã duyệt.

- [ ] **Step 8: Commit** — `Ảnh gửi khách: mẫu HD-02-DT cho đơn đối tác (không logo, khẩu hiệu, giá công bố, phải thu)`

---

### Task 3: Chữ hướng dẫn, bảng từ, nhật ký thay đổi

**Files:**
- Modify: `src/shared/huong-dan-doi-tac.ts` (bài «Gửi biên nhận cho khách», bước 3)
- Modify: `src/shared/bang-tham-chieu-khai-niem.ts`, rồi sinh lại `docs/BANG-THAM-CHIEU.md`
- Modify: `src/shared/changelog.ts`

- [ ] **Step 1: Bài hướng dẫn** — bước 3 thành: «Hộp **Ảnh gửi khách** hiện ảnh xác nhận theo mẫu của đối tác (mã HD-02-DT): đầu ảnh là thương hiệu Tour Đảo Nha Trang, có giá công bố và dòng **Phải thu** là số khách còn phải trả. Ảnh của đối tác không có dòng người phụ trách.»
- [ ] **Step 2: Bảng từ** — thêm hai khái niệm (`trangThai: "da-chot"`, `chuChon: "2026-11-06 (đặc tả biên nhận đơn đối tác)"`): «Giá công bố» (giá danh mục, tức giá bán lẻ, in trên biên nhận mẫu HD-02-DT; `khacVoi`: khác «Giá đại lý»); «Phải thu» trên biên nhận HD-02-DT (số khách còn phải trả sau giảm giá và phần đã trả; `khacVoi`: ở sổ của Kế toán, «phải thu» là tổng đơn phải thu). Run: `npm run tham-chieu`.
- [ ] **Step 3: Nhật ký thay đổi** — thêm một mục mới ở ĐẦU `CHANGELOG`, số kế tiếp sau mục đầu hiện có, chú thích «Số và ngày tạm: bước A.0 đặt lại nếu cần», một dòng `kind: "doi"`: «Ảnh gửi khách của đơn đối tác có mẫu riêng: đầu ảnh là thương hiệu Tour Đảo Nha Trang và câu khẩu hiệu, có giá công bố và dòng Phải thu.» kèm `bai` trỏ bài «Gửi biên nhận cho khách» (id lấy từ tệp hướng dẫn).
- [ ] **Step 4: Chạy** — `node --test src/shared/changelog.test.ts && npm test` → PASS.
- [ ] **Step 5: Commit** — `Hướng dẫn, bảng từ, nhật ký thay đổi cho biên nhận mẫu HD-02-DT`

---

### Task 4: Kiểm toàn bộ và người kiểm độc lập

- [ ] **Step 1:** `npm test` và `npm run typecheck` → xanh, 0 lỗi (chạy một lần).
- [ ] **Step 2:** `npm run test:e2e -- so-tien so-dai-ly-dot-2 coc-don-huy nhap-rieng-tu` (cần mạng; các kịch bản này gọi `/receipt`) → xanh. Kịch bản nào soi danh sách khoá biên nhận thì thêm `mau`, `giaKhacCongBo`.
- [ ] **Step 3:** Gọi `nguoi-kiem-doc-lap` với đặc tả, kế hoạch và khoảng commit của nhánh; yêu cầu đọc mã thật, chạy lại Task 1 Step 5, Task 2 Step 7, và đối chiếu tám tiêu chí nghiệm thu của đặc tả. Chỉ báo đạt dựa trên báo cáo đó.
- [ ] **Step 4:** Đề xuất (không tự ghi) một dòng cho bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» của `web/CLAUDE.md`: `order-confirmation.ts`, `confirmation-image.ts` → thêm `mau-hd-02-dt.mjs` (không cần mạng, không cần D1). Chủ duyệt mới ghi.
