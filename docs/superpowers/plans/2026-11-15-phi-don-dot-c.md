# Phí đưa đón Đợt C — đưa phí vào đơn: kế hoạch thi công

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans, làm từng task. Bước dùng ô `- [ ]`.
> **Loại việc:** việc lớn (tiền, dữ liệu). Thi công ở worktree riêng dựng từ `main`; xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3). Phiên lập kế hoạch này không thi công (P15).

**Mục tiêu:** đơn có chặng đưa đón tự có dòng «Phí đưa đón» do máy chủ tính theo bảng phí đã có; chụp lại lúc xác nhận; thiếu mức thì không xác nhận được; phí vào công nợ đại lý và biên nhận, không vào hoa hồng.

**Kiến trúc:** `pricing` thêm MỘT hàm công khai nhận danh sách chặng đã làm phẳng, trả dòng phí hoặc «thiếu mức» kèm lý do. `orders` làm phẳng chặng (vùng đọc qua view của `locations`), ghép dòng phí vào `order_item` (loại dòng mới, `service_id` trống) trên đường lưu nháp và trong lô xác nhận. Mọi chỗ đọc dòng tiền được rà để biết loại dòng mới.

**Công nghệ:** TypeScript, Cloudflare Worker, D1 (SQLite), `node --test`, e2e `tests/e2e`.

**Nguồn (đọc trước, theo thứ tự):** ADR-0147 Đ1–Đ3; ADR-0203 ĐB1–ĐB3; trang ghép `docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md` (mục 1–3: bảng chứa gì, ai đọc, cổng nào canh cửa nào); thiết kế `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md` §5, §7; sổ vàng `golden/phi-dua-don.json` (28/28 ca chủ xác nhận 14/11); nhật ký Đợt A+B `docs/superpowers/plans/2026-11-14-phi-don-thi-cong-nhat-ky.md` (mục «Nợ cho Đợt C», «Đợt C phải đóng TRƯỚC khi bật phí»).

## Tóm tắt cho chủ dự án (lời thường)

Hôm nay Quản trị đã đặt được mức phí đưa đón trên màn «Phí đưa đón», nhưng chưa đơn nào bị cộng phí. Kế hoạch này nối hai đầu: đơn có lượt đón thì máy tự thêm dòng phí, nhân viên không gõ số; lúc xác nhận máy chụp lại để đổi bảng phí về sau không làm đổi đơn cũ; chưa có mức thì văn phòng không xác nhận được (đơn Đối tác gửi thì chuyển sang «chờ xác nhận»). Phí cộng đủ vào số đại lý nợ công ty, in trên biên nhận ở phần của Tour Đảo (mức 0 đồng in «Miễn phí»), không tính hoa hồng. Phí chỉ thật sự chạy từ «ngày bắt đầu áp» Quản trị đặt, nên phát hành xong mà chưa đặt ngày thì Nền tảng chạy y như hôm nay.

## Điều kiện mở (đã kiểm 15/11/2026)

- ADR-0147 và ADR-0203 **accepted**; sổ vàng 28/28 ca `da_xac_nhan`; trang ghép có sẵn và đã nêu `order_item` nhận loại dòng mới.
- Mục TNV-G1 **không còn** trong `docs/quyen-hoan.json` (chủ «ok» 15/11) ⇒ điều kiện phát hành của ADR-0147 đã đủ.
- Số migration: `0163` (nhánh ADR-0199), `0167`–`0168` (nhánh đăng ký tài khoản) đang bị giữ. Kế hoạch dùng **số tạm `0169_phi_don_tren_don.sql`**; người thi công liệt kê lại mọi nhánh chưa gộp (`git ls-tree --name-only <nhánh> migrations/`) trước khi đặt.

## Ràng buộc chung

- Tiền là `INTEGER` VNĐ, chỉ tính ở máy chủ; số tiền trình duyệt gửi bị bỏ qua (Hiến chương 5.4).
- Thiếu mức **không bao giờ** là 0 đồng (Hiến chương 5.7). Miễn phí chỉ là dòng mức 0 đồng được đặt rõ.
- **Ngày xét hiệu lực = ngày xác nhận theo giờ Việt Nam** (`vnToday`), kể cả so với «ngày bắt đầu áp» (sổ vàng `quy_uoc.hieu_luc`, ca SV-PD-28). Câu «so ngày đơn với `batDauAp`» trong nhật ký Đợt B hiểu theo nghĩa này. Đơn nháp tính theo hôm nay và hiện «dự kiến».
- Vùng của chặng = vùng của **đầu khách sạn**: `pickup_location_id` ở chiều đi (`OUT`), `dropoff_location_id` ở chiều về (`RETURN`) (ADR-0147 Đ1). Chữ gõ tay, địa điểm chưa xếp vùng, đầu khách sạn trống ⇒ `NGOAI_VUNG` (COALESCE ở phía `orders`, vì chữ gõ tay không có dòng trong `v_loc_location_zone`).
- Chỉ chặng còn mở (`closed_at IS NULL`) mới có phí. Nhóm tắt đưa đón không có chặng nên không có phí (ADR-0118).
- Sau xác nhận, thêm/bỏ/sửa chặng và sửa `pax_override` **không** đổi phí; chỉ «sửa số khách» (ô `order.money.edit`) tính lại phí theo khách theo đơn giá đã chụp (ADR-0147 Đ3, ca SV-PD-23, 24).
- Không cạnh phụ thuộc mới: `orders → pricing`, `orders → locations` đã có; `pricing` không đọc `locations`; `van-chuyen`, `ve-dien-tu` không sửa dòng nào.
- Trigger `0081` (khoá dòng tiền sau nháp, tạm tính = tổng mọi dòng lúc xác nhận) **không nới**.
- Chữ mới trên giao diện phải có trong `docs/BANG-THAM-CHIEU.md` (nguồn `src/shared/bang-tham-chieu*.ts`): «Phí đưa đón», «Miễn phí», «dự kiến», lý do «thiếu phí đưa đón». Tên chưa có thì khai `cho-chon` và ghi vào «Câu chờ chủ», không chặn thi công.

## Giả định người lập kế hoạch tự chọn (đảo ngược được, ghi để chủ bác nếu muốn)

1. **Trần một mức phí: 5.000.000 đ** (điểm 4 của danh sách «phải đóng»). Máy chủ từ chối mức lớn hơn; tiền một chặng kiểm `Number.isSafeInteger`. Đổi trần = đổi một hằng số.
2. **`thayCho` mà ngày kết thúc mới sớm hơn dòng cũ: từ chối** (điểm 5), không chỉ cảnh báo — an toàn hơn vì không để mất phủ lặng lẽ.
3. **Đơn nháp thiếu mức vẫn lưu được**, hiện cảnh báo trên đơn; chỉ chặn lúc xác nhận.
4. Lý do «thiếu phí đưa đón» của yêu cầu xác nhận lưu bằng **cột cờ** `ord_confirm_request.transfer_fee_missing` (cùng khuôn `pickup_time_required`), mã lý do `PHI_DON` thêm vào `LyDoCanXacNhan`.
5. Giảm giá cấp đơn và trần giảm giá **không** tính trên phí đón (trang ghép mục 1: «bỏ ra ngoài»): cơ sở trần giảm giá = tổng các dòng dịch vụ.

## Điểm dễ hỏng (Review Focus) — mỗi điểm có bài ở task sở hữu

1. Lưu nháp lúc phí chưa áp, rồi xác nhận sau ngày bắt đầu áp ⇒ lô xác nhận phải **tính lại** phí (không dùng dòng của nháp) — bài ở Task 4.
2. Đối tác trả sau sát hạn mức: hạn mức và đặt cọc phải đọc **tổng đã gồm phí** ⇒ phí tính TRƯỚC `cocChoXacNhan` và cổng hạn mức — bài ở Task 4.
3. Đơn có giảm giá: thêm phí không được làm nới trần giảm giá, và `total = subtotal − discount` vẫn đúng trigger `0007` — bài ở Task 4.
4. Đơn đã sửa số khách (có `order_money_adjustment`): trang đơn, «phải thu», QR vẫn gồm phí — bài ở Task 5.
5. Chặng chiều về đóng sau xác nhận: phí đã chụp vẫn tính, dòng không mất khỏi trang đơn và biên nhận — bài ở Task 5.

---

### Task 1: Lược đồ — loại dòng phí và cờ lý do

**Tệp:** tạo `migrations/0169_phi_don_tren_don.sql` (số tạm); sửa `docs/data-dictionary.json` rồi `npm run dict`; sửa `scripts/audit-checks.mjs`; bài `src/migrations-phi-don-tren-don.test.ts` (hoặc thêm vào bài migration sẵn có cùng khuôn).

**Tạo ra:**
- `order_item.line_kind TEXT NOT NULL DEFAULT 'SERVICE' CHECK (line_kind IN ('SERVICE','TRANSFER_FEE'))`.
- `order_item.transfer_leg_id TEXT REFERENCES ord_transfer_leg(id)`, `fee_rule_id TEXT REFERENCES prc_transfer_fee_rule(id)`, `fee_kind TEXT CHECK (fee_kind IN ('PER_PAX','PER_TRIP'))`, `fee_zone_code TEXT`, `fee_tier_code TEXT` (trống = không có cấp).
- Trigger chèn/sửa: `TRANSFER_FEE` ⇒ `service_id`, `catalog_code`, `catalog_price`, `pax_code` đều NULL và `transfer_leg_id`, `fee_rule_id`, `fee_kind`, `fee_zone_code` NOT NULL; `SERVICE` ⇒ năm cột phí đều NULL. Chỉ mục duy nhất một phần: `(transfer_leg_id) WHERE line_kind = 'TRANSFER_FEE'`.
- `ord_confirm_request.transfer_fee_missing INTEGER NOT NULL DEFAULT 0 CHECK (… IN (0,1))`.
- Luật kiểm dữ liệu mới `R-ORD-PD-1` (chỉ đọc): dòng phí trỏ chặng cùng đơn; `line_total = quantity × unit_price`; `PER_TRIP` ⇒ `quantity = 1`. R-ORD-15 giữ nguyên (đã cộng mọi dòng).

- [ ] Viết bài đỏ: chèn dòng `TRANSFER_FEE` có `service_id` ⇒ bị chặn; chèn dòng `SERVICE` có `transfer_leg_id` ⇒ bị chặn; hai dòng phí cùng chặng ⇒ bị chặn; dòng cũ sau migration có `line_kind = 'SERVICE'`; sửa dòng phí sau xác nhận ⇒ trigger `0081` vẫn chặn.
- [ ] Viết migration, áp local (`npm run db:migrate:local`), chạy bài: xanh. Bài `audit-invariants.test.ts` có ca cho R-ORD-PD-1 (một dòng sai ⇒ thoát 1).
- [ ] Cập nhật từ điển dữ liệu, commit.

### Task 2: `pricing` — hàm tính phí cho một đơn, và năm điểm «phải đóng» thuộc phần giá

**Tệp:** `src/modules/pricing/phi-don-rules.ts`, `phi-don-repo.ts`, `index.ts`, `phi-don-route.ts`; bài `phi-don-rules.test.ts`, `phi-don-route.test.ts`, `src/so-vang-phi-don.test.ts`; màn `web/phi-don.ts`.

**Tạo ra (Task 3, 4 dùng đúng tên này):**
```ts
export interface ChangDauVao { legId: string; zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean; catalogCode: string | null; soKhachTinhTien: number; paxOverride: number | null }
export interface DongPhiDon { legId: string; ruleId: string; kind: "PER_PAX" | "PER_TRIP"; zoneCode: string; tierCode: string | null; donGia: number; soLuong: number; tien: number }
export interface ThieuPhiDon { legId: string; zoneCode: string; lyDo: "KHONG_CO_MUC" | "XUNG_DOT" | "HAI_CAP" }
export type KetQuaPhiDonDon = { apDung: false } | { apDung: true; dong: DongPhiDon[]; thieu: ThieuPhiDon[] };
// thuần, không I/O — sổ vàng chạy qua hàm này:
export function tinhPhiDonThuan(v: { bang: BangPhiDonChoDon; nhom: ReadonlyMap<string, string>; ngay: string; chang: readonly ChangDauVao[] }): KetQuaPhiDonDon;
// bọc I/O — orders gọi hàm này qua index.ts:
export async function tinhPhiDonChoDon(db: D1Database, v: { bookerPartyId: string | null; ngay: string; chang: readonly ChangDauVao[] }): Promise<KetQuaPhiDonDon>;
```
Luật của `tinhPhiDonThuan`: `batDauAp` trống hoặc `ngay < batDauAp` ⇒ `{apDung:false}`; cấp `HAI_CAP` ⇒ MỌI chặng vào `thieu` với `lyDo: "HAI_CAP"` (không bao giờ lùi về mức chung, ca SV-PD-14); `groupCode` tra từ `nhom` theo `catalogCode` (`pricing` tự đọc qua `docBangChoChup`, `orders` không truyền); chặng ra số lượng 0 thì không sinh dòng và không thiếu (`tinhPhiChang` trả null).

- [ ] **Sổ vàng lớp 3** (đỏ trước): ở `src/so-vang-phi-don.test.ts` chạy cả 28 ca qua `tinhPhiDonThuan`, so `ap_dung`, từng chặng (`quy_tac`, `don_gia`, `so_luong`, `tien`, `cap_da_chup`, `ly_do`), `tong_phi_don`, `xac_nhan_duoc` (= `thieu.length === 0`). Giữ `MA_BAT_BUOC` để ca không rơi lặng lẽ.
- [ ] Viết `tinhPhiDonThuan` + `tinhPhiDonChoDon`, xuất ở `index.ts`; bài xanh.
- [ ] **Điểm 2 (hợp đồng `HAI_CAP`)**: bài «hai vai trò hai cấp ⇒ `thieu[].lyDo === "HAI_CAP"`».
- [ ] **Điểm 3**: bài so `capCuaHoSoNgay` với logic cấp đang dùng ở `rules.ts` (cùng bộ gán, nhiều ngày) — hai nơi phải ra cùng cấp với hồ sơ một cấp.
- [ ] **Điểm 4 (trần)**: `kiemThanMucPhiDon` từ chối `amount > 5_000_000` với câu «Mức phí tối đa 5.000.000 đ.»; bài đỏ → xanh.
- [ ] **Điểm 5**: `POST /api/pricing/phi-don` có `thayCho` mà `validTo` mới sớm hơn `validTo` dòng cũ (hoặc dòng cũ không có ngày kết thúc mà dòng mới có) ⇒ 409 với câu nói rõ sẽ bỏ trống khoảng ngày nào; bài route đỏ → xanh.
- [ ] **Điểm 1**: `GET /api/pricing/phi-don` trả thêm `vungThieuMucChung: {code, name}[]` tính bằng `vungThieuDongChung` tại ngày hôm nay **và** tại `batDauAp` (nếu ở tương lai); màn `web/phi-don.ts` hiện băng báo nêu tên vùng; luật kiểm dữ liệu cảnh báo `R-PRC-PD-3` (vùng đang bật thiếu mức chung khi phí đang áp).
- [ ] Commit.

### Task 3: `orders` — làm phẳng chặng và ghép dòng phí khi tạo, lưu nháp

**Tệp:** tạo `src/modules/orders/phi-don-don.ts` (+ `phi-don-don.test.ts`); sửa `src/modules/orders/repository.ts` (`serviceInserts`, `createOrder`, `updateDraftOrder`), `src/modules/orders/rules.ts` (`validateOrder`: tạm tính), `src/modules/orders/index.ts` (route tạo, lưu nháp), `src/shared/contracts.ts`.

**Tạo ra:**
```ts
// thuần: từ dịch vụ + chặng đã kiểm + bản đồ vùng ⇒ ChangDauVao[] (chỉ chặng mở)
export function lamPhangChang(v: { services: readonly { tempId: string; catalogCode: string | null; adult: number; child: number; senior: number }[]; legs: readonly { legId: string; serviceRef: string; direction: "OUT" | "RETURN"; pickupLocationId: string | null; dropoffLocationId: string | null; exclusive: boolean; paxOverride: number | null; closed: boolean }[]; vung: ReadonlyMap<string, string> }): ChangDauVao[];
// I/O: đọc v_loc_location_zone cho các id địa điểm
export async function vungCuaDiaDiem(db: D1Database, ids: readonly string[]): Promise<Map<string, string>>;
// thuần: DongPhiDon ⇒ hàng order_item loại TRANSFER_FEE (description "Phí đưa đón — chiều đi/về, <tên khu vực>")
export function dongPhiThanhItem(d: DongPhiDon, tenVung: string): OrderItemRowPhiDon;
```
`OrderDto` thêm `phiDuaDon: { dong: PhiDuaDonDto[]; thieu: { legId: string; zoneName: string; lyDo: string }[]; duKien: boolean } | null` (null = phí chưa áp). Số khách tính tiền = người lớn + trẻ em + người cao tuổi (không em bé).

- [ ] Bài đỏ `lamPhangChang`: OUT lấy vùng nơi đón, RETURN lấy vùng nơi trả; chữ gõ tay ⇒ `NGOAI_VUNG`; chặng đóng bị bỏ; dịch vụ 2 NL + 1 em bé ⇒ `soKhachTinhTien = 2`.
- [ ] Viết ba hàm; bài xanh.
- [ ] Nối vào tạo đơn và lưu nháp: tính bằng `tinhPhiDonChoDon(ngay = vnToday())`; dòng phí chèn **sau** chặng trong lô (khoá ngoại), tạm tính `validateOrder` cộng dòng phí; `DELETE order_item` cũ đã đứng trước xoá chặng (giữ nguyên thứ tự lô của `updateDraftOrder`). Thiếu mức: không sinh dòng cho chặng đó, trả `thieu`.
- [ ] e2e (`tests/e2e/phi-don-don.mjs`, khai ở `danh-sach.mjs`, `thoi-gian.json`): đặt bảng phí mẫu với ngày quá khứ xa (khuôn `phi-don.mjs`), lưu nháp đơn ca SV-PD-02 ⇒ tạm tính tăng 300.000, `phiDuaDon.duKien = true`; ca SV-PD-28 (trước ngày áp) ⇒ không dòng phí.
- [ ] Commit.

### Task 4: Xác nhận — chụp phí trong lô, cổng thiếu mức, bốn cửa xác nhận

**Tệp:** `src/modules/orders/xac-nhan-chung.ts` (`kiemCongXacNhan`), `repository.ts` (`soanXacNhan`), `index.ts` (`POST /api/orders/:id/status`), `xac-nhan-route.ts` (`gui-xac-nhan`, `gui-don`, `quyet-dinh`), `src/shared/contracts.ts` (`LyDoCanXacNhan` thêm `"PHI_DON"`), `src/shared/xac-nhan-hien-thi.ts` (nhãn).

**Tạo ra:** `chuanBiPhiDonXacNhan(db, don, ngay): Promise<{ ketQua: KetQuaPhiDonDon; cauLenh: D1PreparedStatement[]; subtotalMoi: number; totalMoi: number }>` ở `phi-don-don.ts`.

Thứ tự lô xác nhận (bắt buộc, vì ba trigger): mọi câu phí đứng **trước** `orderConfirm` và đều có điều kiện `status = 'draft' AND updated_at = ?`: (1) `DELETE` dòng `TRANSFER_FEE` cũ; (2) `INSERT` dòng phí mới (`INSERT … SELECT … WHERE EXISTS (đơn còn nháp đúng updated_at)`); (3) `UPDATE orders` `subtotal`, `total`, `remaining_amount` theo cùng công thức của `updateDraftOrder`. Sau đó mới tới `legFillDateOnConfirm` → `orderConfirm` → nhật ký → chụp hoa hồng → cọc → trả sau. Nhật ký `confirmed` (hoặc `order_terms_captured`) ghi thêm mã quy tắc và mã cấp đã dùng, không ghi tên khách.

Cổng (đúng trang ghép mục 3): đứng sau «chọn Đón hay Không đón», trước «mốc tối thiểu». Câu báo:
- `KHONG_CO_MUC`/`XUNG_DOT`: 409 `transfer_fee_missing`, «Quản trị cần đặt phí đưa đón cho khu vực <tên> trước khi xác nhận.»
- `HAI_CAP`: 409 `transfer_fee_missing`, «Cần gán cấp riêng cho đối tác <tên> trước khi xác nhận.»

- [ ] Bài đỏ (khung thử route): lưu nháp khi phí chưa áp, đặt ngày áp, xác nhận ⇒ dòng phí có, tạm tính = tổng mọi dòng (trigger `0081` không ném) [Review Focus 1].
- [ ] Bài đỏ: đơn trả sau sát hạn mức, phí đẩy vượt ⇒ bị chặn hạn mức; đơn có cọc ⇒ `remaining_amount` tính trên tổng mới [Review Focus 2].
- [ ] Bài đỏ: đơn có giảm giá ⇒ trần giảm giá tính trên dòng dịch vụ, `total = subtotal − discount` [Review Focus 3].
- [ ] Viết `chuanBiPhiDonXacNhan`, gọi TRƯỚC `cocChoXacNhan` và cổng hạn mức, truyền `totalMoi` cho hai cổng đó; thêm cổng vào `kiemCongXacNhan` với tham số `cheDoThieuPhi: "TU_CHOI" | "NHANH_A"`.
- [ ] `/status` và Còn vé (`quyet-dinh`): `TU_CHOI`. `gui-xac-nhan` (không đi qua `kiemCongXacNhan`): chốt riêng, cùng 409. `gui-don`: `NHANH_A` — thiếu phí thì đi nhánh A, `moYeuCau` ghi `transfer_fee_missing = 1`, `vi` có `"PHI_DON"`; văn phòng xác nhận sau qua `/status` (tính lại).
- [ ] e2e: SV-PD-17 (thiếu mức ⇒ 409, đơn ở lại nháp), SV-PD-14 (hai cấp ⇒ câu riêng; gán cấp riêng xong xác nhận được), Đối tác Gửi đơn thiếu mức ⇒ 201 nhánh A, SV-PD-20/21 (đổi mức sau xác nhận không đổi đơn cũ), SV-PD-22 (đổi cấp sau xác nhận, `fee_tier_code` giữ nguyên). Bài `thu-tu-lo.test.ts` thêm ràng buộc vị trí câu phí.
- [ ] Commit.

### Task 5: Rà mọi chỗ đọc dòng tiền

**Tệp:** `src/modules/orders/repository.ts` (`groupItems`, `buildSubtotalServices`, `computeEffectiveMoney`), `money-adjustment.ts` (`effectiveService`, `effectiveSubtotal`, `applyAdjustmentToOrder`, `planMoneyEdit`), `gia-dai-ly.ts` (`ghepGiaDaiLy`, `DongGiaDaiLy`), `thuong-mai-repo.ts` (`docGiaDaiLyNhieu`), `src/shared/chia-phan-nguoi-ban.ts`, `src/modules/receipt/rules.ts` (`chiaPhanBienNhan`, `dungBienNhan`, `dungPhieuCongNo`), `xac-nhan-chung.ts` (`viPhamGiaDanhMuc`, `summarizeDeviations`), `billing/service.ts` (gross), `billing/rules.ts` (`nhaCungCapCuaDon`).

Luật từng chỗ (trang ghép mục 1):
- **Tính vào:** tổng đơn, phải thu, «Đã thu», QR, biên nhận, phiếu công nợ, công nợ đại lý (`ghepGiaDaiLy`: `tong = Σ giá đại lý dịch vụ + Σ dòng phí`; thêm trường `phiDon` riêng, không nhét vào `dong` của dịch vụ).
- **Theo luật riêng:** `chiaPhanNguoiBan` đưa dòng phí vào **phần của Tour Đảo** (công ty chủ), không vào người bán của dịch vụ có chặng.
- **Bỏ ra ngoài:** hoa hồng (`phanThuongMaiCuaDon`), R2 giá danh mục, cơ sở trần giảm giá, `summarizeDeviations`.
- **Sửa số khách:** `planMoneyEdit` / `effectiveService` tính lại dòng phí `PER_PAX` của chặng thuộc dịch vụ bị sửa: số lượng mới = số khách tính tiền mới (chiều về: `min(pax_override, số mới)`), đơn giá = `unit_price` đã chụp; `PER_TRIP` không đổi. Không thêm đường ghi, không thêm quyền.

- [ ] Bài đỏ cho từng ca sổ vàng tiền đơn: SV-PD-24 (sửa 2 → 3 NL ⇒ phí 300.000), SV-PD-25 (đại lý cấp 3 trả sau: nợ 1.240.000 = 1.080.000 + 160.000; hoa hồng 120.000 không đổi), SV-PD-26 (biên nhận: phần Hòn Tằm 1.000.000, phần Tour Đảo 140.000), SV-PD-01 (dòng 0 đ in «Phí đưa đón — Miễn phí»), SV-PD-27 (hai dịch vụ, 0 + 80.000).
- [ ] Bài đỏ [Review Focus 4]: đơn đã có `order_money_adjustment` ⇒ `computeEffectiveMoney` và `phaiThuCua` vẫn gồm phí.
- [ ] Bài đỏ [Review Focus 5]: đóng chặng chiều về sau xác nhận ⇒ dòng phí đã chụp vẫn trong `OrderDto.phiDuaDon.dong` và trên biên nhận (đọc theo `order_item`, không theo chặng mở).
- [ ] Sửa từng hàm; bài xanh. Bài quét: `grep` mọi chỗ đọc `order_item` trong `src/` và `scripts/` có trong danh sách trên hoặc ghi lý do bỏ qua vào nhật ký thi công.
- [ ] e2e: `cong-no-dai-ly`, `bien-lai`, `sua-so-khach`, `qr-thanh-toan` thêm một ca có phí đón.
- [ ] Commit.

### Task 6: Giao diện, chữ, tài liệu

**Tệp:** `web/order.ts` (`tienCard`), `web/order-form.ts` (`recompute`), `public/phi-don.html`, bài Hướng dẫn `phi-don`, `src/shared/bang-tham-chieu*.ts`, `docs/SYSTEM-DESIGN.md` (§5, §6, §7), `docs/CHANGE-GUIDE.md` (công thức z39 thêm phần đơn), `docs/HANDOFF-N1.md` (mục «ĐANG CHỜ NHẬP»), `docs/SO-HANG-RAO.md`, kịch bản Chrome `docs/evidence/2026-11-phi-don/kich-ban/phi-don-don-smoke.mjs`.

- [ ] Trang đơn: trong thẻ tiền, dưới các dòng dịch vụ, mục «Phí đưa đón» mỗi chặng một dòng (chiều, khu vực, `số khách × đơn giá` hoặc «Miễn phí»); nháp ghi «(dự kiến)»; có `thieu` thì băng báo đúng câu của Task 4. Chỉ hiện cho người có `money.view` (như tiền khác).
- [ ] Form tạo đơn: không tự tính phí trong trình duyệt; dòng tóm tắt ghi «Phí đưa đón tính khi lưu» và sau khi lưu nháp hiện số máy chủ trả.
- [ ] **Điểm 7**: gỡ câu «Hiện phí đưa đón chưa được cộng vào đơn…» ở `public/phi-don.html` và bài Hướng dẫn; thay bằng câu nói phí cộng vào đơn từ ngày bắt đầu áp. Giữ trần chữ của trang (không nới).
- [ ] Chữ mới vào bảng tham chiếu; `npm test` bài chữ nút xanh.
- [ ] Kịch bản Chrome (có `AXE_JS`): lưu nháp → thấy dòng dự kiến → xác nhận → thấy dòng đã chụp → biên nhận có «Miễn phí»; ảnh thật điện thoại và máy tính để chủ duyệt.
- [ ] Cập nhật tài liệu mô tả trong cùng commit; ghi nhật ký thi công `docs/superpowers/plans/2026-11-15-phi-don-dot-c-thi-cong-nhat-ky.md`.
- [ ] Commit.

### Task 7: Bộ kiểm đủ và người kiểm độc lập

- [ ] Chạy một lần ở cuối: `npm run typecheck` (0 lỗi), `npm test`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`. Ghi kết quả thật vào nhật ký, kể cả bài đỏ không do đợt này.
- [ ] Quan sát hàng rào chặn thật (P16), ghi `docs/SO-HANG-RAO.md`: bỏ cổng thiếu phí ⇒ e2e SV-PD-17 đỏ; đảo thứ tự câu phí sau `orderConfirm` ⇒ `thu-tu-lo.test.ts` đỏ; bỏ dòng phí khỏi `ghepGiaDaiLy` ⇒ bài SV-PD-25 đỏ.
- [ ] Giao người kiểm độc lập chỉ đọc (vai `nguoi-kiem-doc-lap`), đưa mã thật và danh sách tiêu chí ở thiết kế §7; chỉ báo «đạt» theo báo cáo đó.
- [ ] Phát hành do chủ theo `docs/HANDOFF-N1.md`. Phát hành xong, phí **chưa chạy** tới khi Quản trị đặt đủ mức chung cho mọi vùng và đặt «ngày bắt đầu áp» (Đợt D: chủ chạy câu đếm chỉ đọc nơi đón gõ tay trước).

## Câu chờ chủ (không chặn thi công)

Các câu 1–3, 6–8 của nhật ký Đợt A+B (tên nút tạm, ô «Chưa xếp»/«Ngoài khu vực», bố cục điện thoại, nút sửa ngày kết thúc, đuôi câu cảnh báo, tệp `sc-nangluc`) vẫn mở. Câu 4 (trần) và câu 5 (ngày quá khứ) được kế hoạch này trả lời tạm bằng giả định 1 và giữ nguyên hành vi hôm nay.
