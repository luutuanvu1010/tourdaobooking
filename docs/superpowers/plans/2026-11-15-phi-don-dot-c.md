# Phí đưa đón Đợt C — đưa phí vào đơn: kế hoạch thi công

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans, làm từng task. Bước dùng ô `- [ ]`.
> **Loại việc:** việc lớn (tiền, dữ liệu). Thi công ở worktree riêng dựng từ `main`; xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3). Phiên lập kế hoạch này không thi công (P15).
> **Bản 2 (15/11/2026):** đã sửa theo vòng soát độc lập cùng ngày (4 lỗi chặn, 9 nên sửa). Danh sách sửa ở cuối tệp.

**Mục tiêu:** đơn có chặng đưa đón tự có dòng «Phí đưa đón» do máy chủ tính theo bảng phí đã có; chụp lại lúc xác nhận; thiếu mức thì không xác nhận được; phí vào công nợ đại lý và biên nhận, không vào hoa hồng, không bị giảm giá cấp đơn trừ vào.

**Kiến trúc:** `pricing` thêm MỘT hàm công khai nhận danh sách chặng đã làm phẳng, trả dòng phí hoặc «thiếu mức» kèm lý do. `orders` làm phẳng chặng (vùng đọc qua view của `locations`), ghép dòng phí vào `order_item` (loại dòng mới, `service_id` trống) trên đường lưu nháp và trong lô xác nhận. Mọi chỗ đọc dòng tiền được rà để biết loại dòng mới.

**Công nghệ:** TypeScript, Cloudflare Worker, D1 (SQLite), `node --test`, e2e `tests/e2e`.

**Nguồn (đọc trước, theo thứ tự):** ADR-0147 Đ1–Đ3; ADR-0203 ĐB1–ĐB3; trang ghép `docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md` (§1 bảng chứa gì và luật tính vào / bỏ ra ngoài, §2 quyền, §3 thứ tự cổng, §6 bài canh phải sửa có chủ đích); thiết kế `docs/superpowers/specs/2026-11-14-phi-don-theo-cap-va-dich-vu-design.md` §5, §7; sổ vàng `golden/phi-dua-don.json` (28/28 ca chủ xác nhận 14/11); nhật ký Đợt A+B `docs/superpowers/plans/2026-11-14-phi-don-thi-cong-nhat-ky.md` («Nợ cho Đợt C», «Đợt C phải đóng TRƯỚC khi bật phí»); `src/CLAUDE.md` (SQL mới của `orders` chỉ ở tệp nửa nghiêm `orders/chang-hanh-khach-repo.ts`, viết bằng `defineSql`).

## Tóm tắt cho chủ dự án (lời thường)

Hôm nay Quản trị đã đặt được mức phí đưa đón trên màn «Phí đưa đón», nhưng chưa đơn nào bị cộng phí. Kế hoạch này nối hai đầu: đơn có lượt đón thì máy tự thêm dòng phí, nhân viên không gõ số; lúc xác nhận máy chụp lại để đổi bảng phí về sau không làm đổi đơn cũ; chưa có mức thì văn phòng không xác nhận được (đơn Đối tác gửi thì chuyển sang «chờ xác nhận»). Phí cộng đủ vào số đại lý nợ công ty, in trên biên nhận ở phần của Tour Đảo (mức 0 đồng in «Miễn phí»), không tính hoa hồng, không bị giảm giá của đơn trừ vào. Phí chỉ thật sự chạy từ «ngày bắt đầu áp» Quản trị đặt.

## Câu chờ chủ — phải có lời chủ TRƯỚC task ghi rõ (gom một lần)

1. **Giảm giá của đơn có trừ vào phí đưa đón không?** Trang ghép đã duyệt ghi «bỏ ra ngoài», tức giảm giá chỉ trừ vào tiền dịch vụ, phí luôn thu đủ. Nhưng sổ vàng chưa có ca nào vừa giảm giá vừa có phí, và Hiến chương 5.17 đòi ca mẫu được xác nhận trước khi viết mã. **Khuyến nghị:** thêm ca SV-PD-29 «khách lẻ, Tắm bùn Hòn Tằm 1.000.000 đ, phí đón 140.000 đ, giảm giá 100.000 đ ⇒ phần Hòn Tằm 900.000 đ, phần Tour Đảo 140.000 đ, tổng 1.040.000 đ; giảm giá tối đa bằng 1.000.000 đ». Chặn **Task 5** (phần chia phần và trần giảm giá) và Task 4 (trần giảm giá).
2. **Trần số tiền một mức phí** (câu 4 cũ của nhật ký Đợt A+B, chủ chưa trả lời). **Khuyến nghị:** 5.000.000 đ một mức, để chặn gõ nhầm thêm số 0. Chặn **bước «trần» của Task 2**; mọi bước khác làm được. Kiểm tràn số (`Number.isSafeInteger` của đơn giá × số khách) làm ngay, không cần chờ.
3. **Hai chữ mới trên giao diện** (ADR-0203 ĐB3 đòi đưa phương án ở bước kế hoạch):
   - dòng phí 0 đồng: **«Miễn phí»** (khuyến nghị; khác: «Không thu phí», «0 đ»);
   - phí của đơn nháp chưa chụp: **«dự kiến»** (khuyến nghị; khác: «chưa chốt», «tính theo hôm nay»). Không dùng «tạm tính» vì chữ này đã là tổng trước giảm giá.
   Chặn **Task 6** phần chữ.

## Điều kiện mở (đã kiểm 15/11/2026)

- ADR-0147 và ADR-0203 **accepted**; sổ vàng 28/28 ca `da_xac_nhan`; trang ghép có sẵn và đã nêu `order_item` nhận loại dòng mới.
- Mục TNV-G1 **không còn** trong `docs/quyen-hoan.json` (chủ «ok» 15/11) ⇒ điều kiện phát hành của ADR-0147 đã đủ.
- Số migration: `0163` (nhánh ADR-0199), `0167`–`0168` (nhánh đăng ký tài khoản) đang bị giữ; `main` ở `0166`. Kế hoạch dùng **số tạm `0169_phi_don_tren_don.sql`**; người thi công liệt kê lại mọi nhánh chưa gộp trước khi đặt.

## Ràng buộc chung

- Tiền là `INTEGER` VNĐ, chỉ tính ở máy chủ; số tiền trình duyệt gửi bị bỏ qua (Hiến chương 5.4).
- Thiếu mức **không bao giờ** là 0 đồng (Hiến chương 5.7). Miễn phí chỉ là dòng mức 0 đồng được đặt rõ.
- **Ngày xét hiệu lực = ngày xác nhận theo giờ Việt Nam** (`vnToday`), kể cả so với «ngày bắt đầu áp» (sổ vàng `quy_uoc.hieu_luc`, ca SV-PD-28). Câu «so ngày đơn với `batDauAp`» trong nhật ký Đợt B hiểu theo nghĩa này. Đơn nháp tính theo hôm nay. Vì ngày luôn là hôm nay, câu treo «`docBangPhiDonChoDon` đọc vai đang mở hôm nay hay theo ngày của đơn» (điểm 2 của danh sách «phải đóng») được đóng: đọc vai đang mở hôm nay (`openRolesOf`) là đúng; ghi một dòng chú thích ở hàm.
- Vùng của chặng = vùng của **đầu khách sạn**: `pickup_location_id` ở chiều đi (`OUT`), `dropoff_location_id` ở chiều về (`RETURN`) (ADR-0147 Đ1). `v_loc_location_zone` đã tự trả `NGOAI_VUNG` cho địa điểm chưa xếp vùng; phía `orders` chỉ tự gán `NGOAI_VUNG` cho chữ gõ tay và đầu khách sạn trống. Tên khu vực đọc từ `v_loc_zone_label`.
- Chỉ chặng còn mở mới **sinh** dòng phí lúc lưu nháp và lúc xác nhận. Nhóm tắt đưa đón không có chặng nên không có phí (ADR-0118).
- Sau xác nhận, thêm/bỏ/đóng/sửa chặng, sửa `pax_override`, đổi bên đặt **không** đổi phí; chỉ «sửa số khách» (ô `order.money.edit`) tính lại phí theo khách theo đơn giá đã chụp (ADR-0147 Đ3, ADR-0203 ĐB2, ca SV-PD-22, 23, 24).
- **Giảm giá cấp đơn và trần giảm giá không tính trên phí** (trang ghép §1 «bỏ ra ngoài»; chờ câu 1 để chốt bằng ca mẫu).
- Không cạnh phụ thuộc mới: `orders → pricing`, `orders → locations` đã có; `pricing` không đọc `locations`; `van-chuyen`, `ve-dien-tu` không sửa dòng nào. Ranh giới ADR-0203 ghi `orders` truyền mã nhóm; kế hoạch để `pricing` tự tra nhóm bằng `groupsOf` (bảng `catalog` mà `pricing` đã được đọc) — cùng kết quả, ít dữ liệu đi qua ranh giới; ghi vào nhật ký thi công.
- Trigger `0081` **không nới**; chỉ được siết thêm (Điều 9.4).
- Chữ mới trên giao diện phải có trong `docs/BANG-THAM-CHIEU.md` (nguồn `src/shared/bang-tham-chieu*.ts`).

## Điểm dễ hỏng (Review Focus) — mỗi điểm có bài ở task sở hữu

1. Lưu nháp lúc phí chưa áp, rồi xác nhận sau ngày bắt đầu áp ⇒ lô xác nhận phải **tính lại** phí (không dùng dòng của nháp) — Task 4.
2. Lô xác nhận thua (mốc tối thiểu, chặng chưa có giờ, đua sửa) ⇒ tiền của đơn nháp **không được đổi** một nửa — Task 4.
3. Đối tác trả sau sát hạn mức: hạn mức và đặt cọc đọc **tổng đã gồm phí** — Task 4.
4. Đơn có giảm giá: phí không bị trừ, trần giảm giá không nới — Task 4, Task 5.
5. Sau xác nhận, sửa số người chiều về rồi sửa số khách ⇒ phí tính theo số người chiều về **đã chụp**, không theo số mới — Task 5.

---

### Task 1: Lược đồ — loại dòng phí, khoá cột chụp, cờ lý do

**Tệp:** tạo `migrations/0169_phi_don_tren_don.sql` (số tạm); sửa `docs/data-dictionary.json` rồi `npm run dict`; sửa `scripts/audit-checks.mjs`; bài migration cùng khuôn bài sẵn có.

**Tạo ra:**
- `order_item.line_kind TEXT NOT NULL DEFAULT 'SERVICE' CHECK (line_kind IN ('SERVICE','TRANSFER_FEE'))`.
- `order_item.transfer_leg_id TEXT REFERENCES ord_transfer_leg(id)`, `fee_rule_id TEXT REFERENCES prc_transfer_fee_rule(id)`, `fee_kind TEXT CHECK (fee_kind IN ('PER_PAX','PER_TRIP'))`, `fee_zone_code TEXT`, `fee_tier_code TEXT` (trống = không có cấp), `fee_return_pax INTEGER` (số người chiều về `pax_override` lúc tính, trống = theo số khách dịch vụ).
- Trigger chèn/sửa: `TRANSFER_FEE` ⇒ `service_id`, `catalog_code`, `catalog_price`, `pax_code` đều NULL và `transfer_leg_id`, `fee_rule_id`, `fee_kind`, `fee_zone_code` NOT NULL; `SERVICE` ⇒ sáu cột phí đều NULL. Chỉ mục duy nhất một phần `(transfer_leg_id) WHERE line_kind = 'TRANSFER_FEE'`.
- **Trigger siết mới** `order_item_fee_frozen_update`: khi đơn không còn nháp, cấm đổi `line_kind`, `transfer_leg_id`, `fee_rule_id`, `fee_kind`, `fee_zone_code`, `fee_tier_code`, `fee_return_pax` (trigger `0081` chỉ khoá cột tiền).
- **Chốt lô xác nhận** (dùng ở Task 4): view rỗng `v_ord_xac_nhan_phi_gac(order_id)` + trigger `INSTEAD OF INSERT` ném `ABORT 'transfer_fee_confirm_lost'` khi đơn chưa ở `confirmed`. Không lưu dòng nào. (Người thi công được chọn khuôn khác cùng tác dụng nếu D1 không nhận trigger trên view; quan sát chặn thật bằng bài.)
- `ord_confirm_request.transfer_fee_missing INTEGER NOT NULL DEFAULT 0 CHECK (… IN (0,1))` + trigger «không đổi sau khi chèn» như trigger của `pickup_time_required` ở `0133`.
- Luật kiểm dữ liệu mới `R-ORD-PD-1` (chỉ đọc): dòng phí trỏ chặng cùng đơn; `line_total = quantity × unit_price`; `PER_TRIP` ⇒ `quantity = 1`. R-ORD-15 giữ nguyên.

- [ ] Bài đỏ: dòng `TRANSFER_FEE` có `service_id` ⇒ chặn; dòng `SERVICE` có `transfer_leg_id` ⇒ chặn; hai dòng phí cùng chặng ⇒ chặn; dòng cũ có `line_kind = 'SERVICE'`; sau xác nhận đổi `fee_tier_code` hoặc `fee_rule_id` ⇒ chặn; chèn vào view chốt khi đơn còn nháp ⇒ chặn, khi đã xác nhận ⇒ qua; đổi `transfer_fee_missing` sau khi chèn ⇒ chặn.
- [ ] Viết migration, áp local, bài xanh; `audit-invariants.test.ts` có ca R-ORD-PD-1.
- [ ] Từ điển dữ liệu, commit.

### Task 2: `pricing` — hàm tính phí cho một đơn, và các điểm «phải đóng» thuộc phần giá

**Tệp:** `src/modules/pricing/phi-don-rules.ts`, `phi-don-repo.ts`, `index.ts`, `phi-don-route.ts`; bài `phi-don-rules.test.ts`, `phi-don-route.test.ts`, `src/so-vang-phi-don.test.ts`; màn `web/phi-don.ts`.

**Tạo ra (Task 3, 4, 5 dùng đúng tên này):**
```ts
export interface ChangDauVao { legKey: string; zoneCode: string; direction: "OUT" | "RETURN"; exclusive: boolean; catalogCode: string | null; soKhachTinhTien: number; paxOverride: number | null }
export interface DongPhiDon { legKey: string; ruleId: string; kind: "PER_PAX" | "PER_TRIP"; zoneCode: string; tierCode: string | null; donGia: number; soLuong: number; tien: number; returnPax: number | null }
export type LyDoThieuPhiDon = "KHONG_CO_MUC" | "XUNG_DOT" | "DAI_LY_HAI_CAP"; // trùng chữ của sổ vàng
export interface ThieuPhiDon { legKey: string; zoneCode: string; lyDo: LyDoThieuPhiDon }
export type KetQuaPhiDonDon = { apDung: false } | { apDung: true; dong: DongPhiDon[]; thieu: ThieuPhiDon[] };
export function tinhPhiDonThuan(v: { bang: BangPhiDonChoDon; nhom: ReadonlyMap<string, string | null>; ngay: string; chang: readonly ChangDauVao[] }): KetQuaPhiDonDon; // thuần
export async function tinhPhiDonChoDon(db: D1Database, v: { bookerPartyId: string | null; ngay: string; chang: readonly ChangDauVao[] }): Promise<KetQuaPhiDonDon>; // bọc I/O, nhóm tra bằng groupsOf
```
`legKey` là khoá do phía gọi đặt (id chặng đã có, hoặc chỉ số chặng trong lần ghi), để `orders` gắn dòng phí đúng chặng khi id chặng chỉ sinh lúc ghi. Luật: `batDauAp` trống hoặc `ngay < batDauAp` ⇒ `{apDung:false}`; cấp `HAI_CAP` ⇒ mọi chặng vào `thieu` với `DAI_LY_HAI_CAP` (không lùi về mức chung, SV-PD-14); số lượng 0 ⇒ không dòng, không thiếu.

- [ ] **Sổ vàng lớp 3** (đỏ trước): chạy cả 28 ca qua `tinhPhiDonThuan`, so `ap_dung`, từng chặng (`quy_tac`, `don_gia`, `so_luong`, `tien`, `cap_da_chup`, `ly_do`), `tong_phi_don` (`null` ⇔ có `thieu`), `xac_nhan_duoc` (⇔ `thieu.length === 0`). Giữ `MA_BAT_BUOC`.
- [ ] Viết hai hàm, xuất ở `index.ts`; bài xanh.
- [ ] **Thử tra = đơn thật** (tiêu chí ADR-0147, ADR-0203): `GET /api/pricing/phi-don/thu-tra` đi qua cùng `tinhPhiDonThuan`; bài: mọi ca sổ vàng ra cùng số và cùng mã quy tắc ở Thử tra và ở hàm của đơn.
- [ ] **Điểm 3**: bài so `capCuaHoSoNgay` với logic cấp ở `rules.ts` (cùng bộ gán, nhiều ngày): hồ sơ một cấp ra cùng cấp.
- [ ] **Điểm 4**: kiểm tràn `Number.isSafeInteger(donGia × soLuong)` (làm ngay). Trần số tiền: **chờ câu chủ 2**; có lời chủ thì `kiemThanMucPhiDon` từ chối mức vượt trần, bài đỏ → xanh.
- [ ] **Điểm 5**: `POST /api/pricing/phi-don` có `thayCho` mà dòng mới kết thúc sớm hơn dòng cũ (hoặc dòng cũ không có ngày kết thúc mà dòng mới có) ⇒ 409, câu nêu khoảng ngày sẽ bị bỏ trống. Đây là siết chặt, không đổi tiền của ai; bài route đỏ → xanh.
- [ ] **Điểm 1**: `GET /api/pricing/phi-don` trả `vungThieuMucChung: {code, name}[]` (tính tại hôm nay và tại `batDauAp` nếu ở tương lai); màn hiện băng báo nêu tên vùng; luật kiểm dữ liệu cảnh báo `R-PRC-PD-3`.
- [ ] Commit.

### Task 3: `orders` — làm phẳng chặng, ghép dòng phí khi tạo và lưu nháp

**Tệp:** tạo `src/modules/orders/phi-don-don.ts` (+ bài); SQL mới trong `orders/chang-hanh-khach-repo.ts` (`defineSql`); sửa `repository.ts` (`createOrder`, `updateDraftOrder`, chỗ sinh id chặng `legWriteOf`), route tạo, lưu nháp, và các route sửa chặng của đơn nháp ở `index.ts` (`PUT /api/orders/:id`, `POST /api/orders`, `PUT …/legs/:legId`, `POST …/legs`, `PUT …/trip`); `src/shared/contracts.ts`.

**Tạo ra:**
```ts
export function lamPhangChang(v: { services: readonly { ref: string; catalogCode: string | null; adult: number; child: number; senior: number }[]; legs: readonly { legKey: string; serviceRef: string; direction: "OUT" | "RETURN"; pickupLocationId: string | null; dropoffLocationId: string | null; exclusive: boolean; paxOverride: number | null; closed: boolean }[]; vung: ReadonlyMap<string, string> }): ChangDauVao[];
export async function vungCuaDiaDiem(db: D1Database, ids: readonly string[]): Promise<{ vung: Map<string, string>; ten: Map<string, string> }>; // v_loc_location_zone + v_loc_zone_label
export function dongPhiThanhItem(d: DongPhiDon, legId: string, tenVung: string): OrderItemRowPhiDon; // mô tả "Phí đưa đón — chiều đi/về, <khu vực>"
```
`OrderDto` thêm `phiDuaDon: { dong: PhiDuaDonDto[]; thieu: { legId: string; zoneName: string; lyDo: LyDoThieuPhiDon }[]; duKien: boolean } | null` (null = phí chưa áp). `PhiDuaDonDto` đọc từ `order_item` loại phí (không từ chặng mở).

- [ ] Bài đỏ `lamPhangChang`: OUT lấy vùng nơi đón, RETURN lấy vùng nơi trả; chữ gõ tay và đầu trống ⇒ `NGOAI_VUNG`; chặng đóng bị bỏ; 2 NL + 1 em bé ⇒ `soKhachTinhTien = 2`.
- [ ] Viết ba hàm; bài xanh.
- [ ] Tạo đơn và lưu nháp: phí tính ở route **trước** lô (`validateOrder` là hàm thuần, đồng bộ, không đọc CSDL), cộng vào `subtotal`/`total` truyền cho câu `UPDATE orders` đầu lô. Dòng phí dựng ở **đúng chỗ sinh id chặng, mỗi lần thử** (`createOrder` sinh lại id khi thử lại), chèn sau chặng. Thứ tự xoá của `updateDraftOrder` giữ nguyên (xoá `order_item` trước xoá chặng).
- [ ] Ba route sửa chặng của đơn nháp tính lại phí và tạm tính trong cùng lô của chúng (để số «dự kiến» không cũ). Sau xác nhận, các route này không đụng dòng phí (trigger chặn sẵn; bài kiểm SV-PD-23 ở Task 5).
- [ ] e2e mới `tests/e2e/phi-don-don.mjs` (khai `danh-sach.mjs`, `thoi-gian.json`): mức đặt quanh **ngày hôm nay** (ngày xác nhận luôn là `vnToday`, không dùng ngày của sổ vàng); `finally` tắt phí và kết thúc các mức đã thêm, như `phi-don.mjs`. Ca: lưu nháp kiểu SV-PD-02 ⇒ tạm tính tăng đúng, `duKien = true`; trước ngày áp (SV-PD-28) ⇒ không dòng phí; sửa `paxOverride` chiều về trên nháp ⇒ phí dự kiến đổi.
- [ ] Commit.

### Task 4: Xác nhận — chụp phí trong lô, cổng thiếu mức, bốn cửa xác nhận

**Tệp:** `xac-nhan-chung.ts` (`kiemCongXacNhan`, `viCuaYeuCau`), `repository.ts` (`soanXacNhan`, `daXacNhan`), `index.ts` (`POST /api/orders/:id/status`), `xac-nhan-route.ts` (`gui-xac-nhan`, `gui-don`, `quyet-dinh`), `contracts.ts` (`LyDoCanXacNhan` thêm `"PHI_DON"`), `src/shared/xac-nhan-hien-thi.ts`; bài `src/modules/orders/soan-xac-nhan.test.ts`.

**Tạo ra:** `chuanBiPhiDonXacNhan(db, don, ngay): Promise<{ ketQua: KetQuaPhiDonDon; cauLenh: D1PreparedStatement[]; subtotalMoi: number; totalMoi: number; remainingMoi: number }>` ở `phi-don-don.ts`. `kiemCongXacNhan` trả thêm trường `phiDon` (kết quả trên) để ba nơi gọi đưa `cauLenh` vào `soanXacNhan`.

**Trong `kiemCongXacNhan`:** gọi `chuanBiPhiDonXacNhan` (chỉ đọc) **ngay đầu hàm**; đưa `totalMoi` cho cổng Trả sau (`traSauChoXacNhan`, đang chạy thứ 3) và cho `cocChoXacNhan`; còn lỗi thiếu phí chỉ báo ở **vị trí 6 của trang ghép §3** (sau «chọn Đón hay Không đón», trước «mốc tối thiểu»). Cơ sở trần giảm giá R3 = tổng dòng dịch vụ (không gồm phí). Tham số `cheDoThieuPhi: "TU_CHOI" | "NHANH_A"`.

**Lô xác nhận (thứ tự bắt buộc vì trigger 0081):** các câu phí đứng **trước** `orderConfirm`, mỗi câu có điều kiện đơn còn `draft` đúng `updated_at`: (1) `DELETE` dòng `TRANSFER_FEE` cũ; (2) `INSERT … SELECT … WHERE EXISTS (…)` dòng mới; (3) `UPDATE orders` `subtotal`, `total`, `remaining_amount` — **không đổi `updated_at`**, vì `ORDER_CONFIRM` gác bằng `updated_at = ?6`. Ngay **sau** `orderConfirm`: câu chèn vào view chốt (Task 1) ⇒ lô thua thì cả lô lui, tiền nháp không đổi nửa vời. Hệ quả phải xử lý:
- Chỉ số câu đổi trạng thái đổi: `soanXacNhan` trả `chiSoXacNhan`; `daXacNhan` và chỗ đọc `kq[cauDau.length+1]` của Còn vé đọc theo chỉ số đó. Sửa chú thích «chỉ nối câu ở cuối lô».
- Lỗi `transfer_fee_confirm_lost` vào `dichLoiXacNhan` rồi `chanDoanXacNhan` như khi đổi 0 dòng hôm nay (cùng câu báo cho người dùng).
- Chỉ đơn có câu phí mới thêm câu chốt; đơn phí chưa áp chạy y như hôm nay.

Câu báo (409 `transfer_fee_missing`):
- `KHONG_CO_MUC`: «Quản trị cần đặt phí đưa đón cho khu vực <tên> trước khi xác nhận.»
- `XUNG_DOT`: «Phí đưa đón khu vực <tên> có hai mức trùng nhau; Quản trị cần kết thúc một mức trước khi xác nhận.»
- `DAI_LY_HAI_CAP`: «Cần gán cấp riêng cho đối tác <tên> trước khi xác nhận.»

Bốn cửa:
- `/status`, Còn vé (`quyet-dinh`): `TU_CHOI`.
- `gui-xac-nhan` (không đi qua `kiemCongXacNhan`): chốt riêng, cùng 409; thêm bài canh như bài canh nhóm tắt đưa đón.
- `gui-don`: `NHANH_A` — thiếu phí thì đi nhánh A, `moYeuCau` ghi `transfer_fee_missing = 1`; `viCuaYeuCau` đọc cờ trả `"PHI_DON"`. Hạn mức ở nhánh A tính trên tổng đã gồm các dòng phí tìm được (chặng thiếu chưa có tiền); chốt thật lúc văn phòng xác nhận. Văn phòng xác nhận đơn đang chờ qua **Còn vé** (`quyet-dinh`), không qua `/status` (`/status` trả 404 với nháp người khác và bị `khoaKhiCho` chặn khi đang chờ). Nhánh A gặp `chanKhoanThu`: giữ như hôm nay.

- [ ] Bài đỏ [Review Focus 1]: lưu nháp khi phí chưa áp, đặt ngày áp, xác nhận ⇒ dòng phí có, trigger `0081` không ném.
- [ ] Bài đỏ [Review Focus 2]: xác nhận thua vì mốc tối thiểu ⇒ `subtotal`, `total`, dòng `order_item` của nháp y như trước; nhật ký không có dòng mới.
- [ ] Bài đỏ [Review Focus 3]: đơn trả sau sát hạn mức, phí đẩy vượt ⇒ bị chặn; đơn có cọc ⇒ `remaining_amount` theo tổng mới.
- [ ] Bài đỏ [Review Focus 4]: đơn có giảm giá ⇒ trần giảm giá tính trên dòng dịch vụ; `total = subtotal − discount` (chờ câu chủ 1 cho con số ca mẫu).
- [ ] Bài ở `soan-xac-nhan.test.ts`: câu phí đứng trước câu đổi trạng thái, câu chốt đứng ngay sau; `daXacNhan` đọc đúng chỉ số.
- [ ] Viết mã; bài xanh.
- [ ] e2e: SV-PD-17 (`/status` ⇒ 409, ở lại nháp); văn phòng **Gửi xác nhận** thiếu mức ⇒ 409; SV-PD-14 (câu riêng; gán cấp riêng xong xác nhận được); Đối tác Gửi đơn thiếu mức ⇒ 201 nhánh A, Quản trị đặt mức, văn phòng Còn vé ⇒ xác nhận có phí; SV-PD-20/21 dựng mức quanh hôm nay (đổi mức sau xác nhận không đổi đơn cũ); SV-PD-22 (đổi cấp sau xác nhận, `fee_tier_code` giữ nguyên).
- [ ] Commit.

### Task 5: Rà mọi chỗ đọc dòng tiền

**Tệp:** `repository.ts` (`groupItems`, `buildSubtotalServices`, `computeEffectiveMoney`), `money-adjustment.ts` (`effectiveService`, `effectiveSubtotal`, `applyAdjustmentToOrder`, `planMoneyEdit`), `tra-sau-cong.ts` (cổng «sửa tăng»), `gia-dai-ly.ts` (`ghepGiaDaiLy`), `thuong-mai-repo.ts` (`docGiaDaiLyNhieu`), `src/shared/chia-phan-nguoi-ban.ts`, `receipt/rules.ts` (`chiaPhanBienNhan`, `dungBienNhan`, `dungPhieuCongNo`), `xac-nhan-chung.ts` (`viPhamGiaDanhMuc`, `summarizeDeviations`), `billing/service.ts` (gross), `billing/rules.ts` (`nhaCungCapCuaDon`); bài canh `src/cong-no-dai-ly.test.ts` và ba bài canh nguồn dòng tiền của trang ghép §6 (`buildlines-guard`, `thanh-tien-mot-ham`, `hoa-hong-mot-nguon`).

Luật từng chỗ (trang ghép §1):
- **Tính vào:** tổng đơn, phải thu, «Đã thu», QR, biên nhận, phiếu công nợ, công nợ đại lý (`ghepGiaDaiLy`: `tong = Σ giá đại lý dịch vụ + Σ dòng phí`, trường `phiDon` riêng). Bài `cong-no-dai-ly.test.ts` đang khoá «trùng `phanThuongMaiCuaDon`»: sửa có chủ đích thành «trùng `phanThuongMaiCuaDon` + Σ phí đón», ghi lý do ở đầu bài.
- **Theo luật riêng:** `chiaPhanNguoiBan` đưa dòng phí vào **phần của Tour Đảo**, và giảm giá **không** trừ vào dòng phí: giảm giá chỉ trừ vào gross dịch vụ (phần Tour Đảo trước, rồi các phần sau, luật R-81 giữ nguyên cho phần dịch vụ). Hệ quả cần đúng: trần thu tại quầy của billing (`nhaCungCapCuaDon`) không tăng vì phí. Con số ca mẫu chờ câu chủ 1.
- **Bỏ ra ngoài:** hoa hồng (`phanThuongMaiCuaDon`), R2 giá danh mục, cơ sở trần giảm giá, `summarizeDeviations`. `validateOrder` (giảm giá ≤ tạm tính) đổi thành giảm giá ≤ tổng dòng dịch vụ; `effectiveMoney` giảm giá thực dùng = min(giảm giá, tổng dòng dịch vụ).
- **Sửa số khách:** `planMoneyEdit` / `effectiveService` tính lại dòng phí `PER_PAX` của chặng thuộc dịch vụ bị sửa: số lượng mới = số khách tính tiền mới, chiều về lấy `min(fee_return_pax, số mới)` khi `fee_return_pax` có (cột chụp ở Task 1, **không** đọc `pax_override` hiện tại); đơn giá = `unit_price` đã chụp; `PER_TRIP` không đổi; chặng đã đóng sau xác nhận vẫn tính lại như chặng mở (phí đã chụp theo dòng, không theo chặng). Cổng Trả sau «sửa tăng» cộng cả phần phí tăng. Không thêm đường ghi, không thêm quyền: Bán hàng phụ trách mà không phải người lập vẫn 403.

- [ ] Bài đỏ theo sổ vàng: SV-PD-24 (2 → 3 NL ⇒ phí 300.000), SV-PD-25 (nợ 1.240.000 = 1.080.000 + 160.000; hoa hồng 120.000), SV-PD-26 (phần Hòn Tằm 1.000.000, Tour Đảo 140.000), SV-PD-01 (dòng 0 đ in chữ của câu chủ 3), SV-PD-27 (0 + 80.000), SV-PD-29 khi chủ xác nhận (giảm giá + phí).
- [ ] Bài đỏ: đơn đã có `order_money_adjustment` ⇒ `computeEffectiveMoney`, `phaiThuCua` gồm phí; SV-PD-23 (thêm chặng sau xác nhận ⇒ tổng không đổi); [Review Focus 5] sửa `pax_override` sau xác nhận rồi sửa số khách ⇒ dùng `fee_return_pax`; đóng chặng chiều về sau xác nhận ⇒ dòng phí vẫn trên trang đơn và biên nhận; đổi bên đặt sau xác nhận ⇒ phí giữ nguyên; Bán hàng phụ trách không phải người lập sửa số khách ⇒ 403.
- [ ] Sửa từng hàm; ba bài canh trang ghép §6 sửa có chủ đích (ghi lý do). Bài quét: mọi chỗ đọc `order_item` trong `src/` và `scripts/` có trong danh sách trên hoặc ghi lý do bỏ qua vào nhật ký thi công.
- [ ] e2e `cong-no-dai-ly`, `bien-lai`, `sua-so-khach`, `qr-thanh-toan`: thêm một ca có phí đón.
- [ ] Commit.

### Task 6: Giao diện, chữ, tài liệu

**Tệp:** `web/order.ts` (`tienCard`), `web/order-form.ts` (`recompute`), màn gán cấp độ đại lý (`web/cap-dai-ly.ts`), `public/phi-don.html`, bài Hướng dẫn `phi-don`, `src/shared/bang-tham-chieu*.ts`, `docs/SYSTEM-DESIGN.md` (§5, §6, §7), `docs/CHANGE-GUIDE.md` (công thức z39), `docs/HANDOFF-N1.md` («ĐANG CHỜ NHẬP»), `docs/SO-HANG-RAO.md`, kịch bản Chrome `docs/evidence/2026-11-phi-don/kich-ban/phi-don-don-smoke.mjs`.

- [ ] Trang đơn: trong thẻ tiền, dưới dòng dịch vụ, mục «Phí đưa đón» mỗi chặng một dòng (chiều, khu vực, `số khách × đơn giá` hoặc chữ 0 đồng); nháp ghi chữ «dự kiến»; có `thieu` thì băng báo đúng câu của Task 4. Chỉ hiện cho người có `money.view`.
- [ ] Form tạo đơn: không tính phí trong trình duyệt; tóm tắt ghi «Phí đưa đón tính khi lưu», sau khi lưu nháp hiện số máy chủ trả.
- [ ] Màn gán cấp độ đại lý: câu nhắc «Cấp độ đại lý cũng quyết định mức phí đưa đón; đơn đã xác nhận giữ mức cũ.» (nợ ADR-0203; chữ qua bảng tham chiếu).
- [ ] **Điểm 7**: gỡ câu «Hiện phí đưa đón chưa được cộng vào đơn…» ở `public/phi-don.html` và bài Hướng dẫn; thay bằng câu nói phí cộng vào đơn từ ngày bắt đầu áp. Không nới trần chữ.
- [ ] Chữ mới vào bảng tham chiếu theo câu chủ 3; bài chữ nút xanh.
- [ ] Kịch bản Chrome (có `AXE_JS`): lưu nháp → dòng dự kiến → xác nhận → dòng đã chụp → biên nhận có dòng 0 đồng; ảnh thật điện thoại và máy tính để chủ duyệt.
- [ ] Tài liệu mô tả cùng commit; nhật ký thi công `docs/superpowers/plans/2026-11-15-phi-don-dot-c-thi-cong-nhat-ky.md`.
- [ ] Commit.

### Task 7: Bộ kiểm đủ và người kiểm độc lập

- [ ] Chạy một lần ở cuối: `npm run typecheck` (0 lỗi), `npm test`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`. Ghi kết quả thật vào nhật ký, kể cả bài đỏ không do đợt này.
- [ ] Quan sát hàng rào chặn thật (P16), ghi `docs/SO-HANG-RAO.md`: bỏ cổng thiếu phí ⇒ e2e SV-PD-17 đỏ; đưa câu phí ra sau `orderConfirm` ⇒ `soan-xac-nhan.test.ts` đỏ; bỏ câu chốt ⇒ bài Review Focus 2 đỏ; bỏ trigger khoá cột chụp ⇒ bài Task 1 đỏ; bỏ phí khỏi `ghepGiaDaiLy` ⇒ bài SV-PD-25 đỏ.
- [ ] Giao người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`), đưa mã thật và tiêu chí thiết kế §7; chỉ báo «đạt» theo báo cáo đó.
- [ ] Phát hành do chủ theo `docs/HANDOFF-N1.md`. Phí chưa chạy tới khi Quản trị đặt đủ mức chung và «ngày bắt đầu áp» (Đợt D).

## Để sau, ngoài Đợt C (nợ nhỏ của Đợt A+B, không chặn bật phí)

Tên khu vực chưa ép duy nhất; bài đua trigger ở route khu vực; bài tự động cho luồng ghi của màn `web/phi-don.ts`; `actZone` trùng `act()`; đề xuất thêm dòng màn Phí đưa đón vào bảng kịch bản Chrome của `web/CLAUDE.md` (tệp luật, chủ duyệt). Câu chờ chủ 1–3, 6–8 của nhật ký Đợt A+B vẫn mở; câu 5 (ngày quá khứ) giữ hành vi hôm nay.

## Các chỗ đã sửa ở bản 2 (theo vòng soát độc lập 15/11)

Khoá thêm các cột chụp sau xác nhận; bài thứ tự lô đổi sang `soan-xac-nhan.test.ts` (bài `thu-tu-lo.test.ts` là của lệnh chuyến); trần 5.000.000 đ và cách trừ giảm giá chuyển thành câu chờ chủ (chạm luật tiền); giảm giá không trừ vào phí ở chia phần, `validateOrder`, `effectiveMoney`; câu chốt để lô thua không đổi tiền nháp, câu phí không đổi `updated_at`, chỉ số câu đổi trạng thái; tính phí đầu `kiemCongXacNhan` cho cổng Trả sau; văn phòng xác nhận đơn chờ qua Còn vé; chụp số người chiều về; cổng Trả sau «sửa tăng» và bài `cong-no-dai-ly` sửa có chủ đích; đường lưu nháp tính phí ở route, theo id chặng mỗi lần thử, ba route sửa chặng tính lại; Thử tra = đơn thật, SV-PD-23, đổi bên đặt, 403, e2e Gửi xác nhận, câu nhắc màn cấp, ba bài canh §6, câu treo vai hôm nay; đưa phương án chữ cho chủ; trigger cờ lý do và `viCuaYeuCau`; e2e dựng mức quanh hôm nay; `DAI_LY_HAI_CAP` trùng sổ vàng, `groupsOf`, tên vùng từ view, câu báo xung đột.
