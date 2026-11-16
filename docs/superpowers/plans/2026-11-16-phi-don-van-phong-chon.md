# Phí đưa đón do văn phòng chọn (ADR-0214) — kế hoạch thi công

> **Cho người thi công (AI):** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans. Bước dùng ô `- [ ]`.
> **Loại việc:** việc lớn (tiền, dữ liệu). Worktree riêng dựng từ `main` mới nhất; xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3). Phiên lập kế hoạch không thi công (P15).

**Mục tiêu:** thay phần «máy tra bảng phí theo khu vực/cấp/dịch vụ» của Đợt C bằng «mỗi lượt đón văn phòng chọn một mức»; giữ nguyên mọi phần khác của Đợt C (dòng `TRANSFER_FEE`, chụp lúc xác nhận, câu chốt lô, cổng 409, nhánh A của Đối tác, công nợ đại lý, biên nhận, giảm giá không trừ vào phí, sửa số khách).

**Kiến trúc:** một tệp thuần mới ở `src/shared/` giữ danh sách mức, trần, luật kiểm và công thức tiền (dùng chung máy chủ và giao diện). `orders` thay chỗ gọi `tinhPhiDonChoDon` bằng hàm thuần này; mức chọn đi vào thân lưu nháp / Còn vé và được lưu trong chính dòng phí `order_item` (không thêm cột tiền vào chặng, giữ ADR-0047). `pricing` chỉ còn cung cấp «ngày bắt đầu áp» làm công tắc.

**Nguồn:** ADR-0214 (accepted 16/11); đặc tả `docs/superpowers/specs/2026-11-16-phi-don-nhan-vien-chon.md`; sổ vàng `golden/phi-dua-don-chon.json` (15 ca, chủ xác nhận 16/11) và bài lớp 1 `src/so-vang-phi-don-chon.test.ts`; kế hoạch và nhật ký Đợt C (`docs/superpowers/plans/2026-11-15-phi-don-dot-c*.md`) để biết mã đang có.

## Tóm tắt cho chủ (lời thường)
Sau khi làm xong, mỗi lượt đón trên đơn có ô chọn phí: Miễn phí, 5.000 đến 100.000 đ, hoặc Số khác (tối đa 5.000.000 đ). Nhân viên văn phòng chọn; Đối tác không chọn, đơn của họ vào «chờ xác nhận» để văn phòng chọn lúc xác nhận. Chưa chọn thì không xác nhận được. Phí chỉ chạy sau «ngày bắt đầu áp»; phát hành xong mà chưa đặt ngày thì Nền tảng chạy như hôm nay.

## Ràng buộc chung
- Danh sách mức **chỉ ở một chỗ**: `src/shared/phi-don-chon.ts` — `DANH_SACH_PHI_DON = [0, 5000, 10000, 15000, 20000, 30000, 50000, 100000]`, `TRAN_PHI_DON = 5_000_000`. «Số khác» = số nguyên 1–5.000.000. Máy chủ kiểm lại mọi giá trị trình duyệt gửi.
- Tiền một lượt = mức × số khách tính tiền (người lớn + trẻ em + cao tuổi; chiều về có số người riêng thì lấy số nhỏ hơn) hoặc × 1 nếu xe riêng. Dùng lại `payingGuests` (một công thức với dòng tiền).
- Lượt đón còn mở chưa chọn ⇒ «chưa chọn», không bao giờ 0 đồng (Hiến chương 5.7). «Miễn phí» là lựa chọn rõ, mức 0.
- Công tắc: `ngày bắt đầu áp` của `pricing` (đọc qua `index.ts`). Trước ngày đó: ô chọn không hiện, không sinh dòng phí, không cổng nào chặn — y như hôm nay.
- Tài khoản Đối tác gửi mức phí ⇒ **400** `transfer_fee_not_allowed`, không lặng lẽ bỏ.
- Nhật ký đơn ghi lượt đón (chiều, dịch vụ), mức, kiểu chọn; không ghi tên khách.
- Bảng phí theo khu vực, màn «Phí đưa đón», «Thử tra»: **không xoá**, không còn tác dụng với đơn. Màn ghi một câu nói điều này (ADR-0214).
- Migration mới, số tạm **`0173_phi_don_chon.sql`** (main đang ở `0172`); liệt kê mọi nhánh chưa gộp trước khi đặt.
- Chữ mới qua `docs/BANG-THAM-CHIEU.md`: «Phí đưa đón», «Miễn phí» (đã có từ Đợt C), «Số khác», câu báo «Chọn phí đưa đón cho lượt đón …», «Mức phí tối đa 5.000.000 đ.».

## Điểm dễ hỏng (mỗi điểm có bài ở task sở hữu)
1. Sửa chặng trên đơn nháp (`PUT …/legs/:legId`, `PUT …/trip`) không được làm **mất mức đã chọn** của chặng còn lại; chặng mới thêm thì «chưa chọn» — Task 3.
2. Đổi số khách trên nháp ⇒ tiền phí tính lại theo mức đã chọn, không giữ số cũ — Task 3.
3. Đơn Đối tác ở «chờ xác nhận»: văn phòng chọn mức trong Còn vé và xác nhận trong **cùng một lô** (không có bước lưu nháp riêng vì nháp là của Đối tác) — Task 4.
4. Lưu nháp lúc chưa tới ngày áp rồi xác nhận sau ngày áp ⇒ chặn vì chưa chọn (không tự 0) — Task 4.
5. Gõ «Số khác» có dấu chấm, chữ, số âm ⇒ giao diện và máy chủ cùng từ chối, cùng câu — Task 2, Task 6.

---

### Task 1: Lược đồ — dòng phí mang mức chọn
**Tệp:** `migrations/0173_phi_don_chon.sql` (số tạm), `docs/data-dictionary.json` + `npm run dict`, `scripts/audit-checks.mjs` (R-ORD-PD-1).
- Thêm `order_item.fee_source TEXT CHECK (fee_source IN ('BANG_PHI','CHON'))` và `order_item.fee_choice TEXT CHECK (fee_choice IN ('DANH_SACH','SO_KHAC'))`.
- Tạo lại hai trigger hình dạng của `0169` (DROP + CREATE trong tệp mới, không sửa `0169`): `TRANSFER_FEE` + `CHON` ⇒ `fee_choice`, `transfer_leg_id`, `fee_kind` NOT NULL, `fee_rule_id`, `fee_zone_code`, `fee_tier_code` NULL; `TRANSFER_FEE` + `BANG_PHI` (hoặc NULL — dòng cũ) giữ luật `0169`; `SERVICE` ⇒ mọi cột phí NULL. `fee_choice = 'DANH_SACH'` ⇒ `unit_price` thuộc danh sách (liệt kê trong trigger; giá trị đổi thì migration mới — chấp nhận, ghi ở chú thích).
- Tạo lại `order_item_fee_frozen_update` có thêm hai cột mới.
- R-ORD-PD-1 nhận dòng `CHON` (không đòi mã quy tắc).
- [ ] Bài đỏ → xanh: dòng `CHON` thiếu `fee_choice` ⇒ chặn; `DANH_SACH` với 12.000 ⇒ chặn; `SO_KHAC` 12.000 ⇒ qua; dòng `BANG_PHI` của Đợt C vẫn chèn được; đổi `fee_choice` sau xác nhận ⇒ chặn. Commit.

### Task 2: Luật thuần dùng chung
**Tệp:** tạo `src/shared/phi-don-chon.ts` + `phi-don-chon.test.ts`; mở rộng `src/so-vang-phi-don-chon.test.ts` thêm **lớp 2**.
```ts
export type MucChon = { loai: "DANH_SACH" | "SO_KHAC"; soTien: number };
export function kiemMucChon(v: unknown): { ok: true; muc: MucChon } | { ok: false; loi: "VUOT_TRAN" | "KHONG_HOP_LE" };
export function tinhPhiChon(v: { muc: MucChon; xeRieng: boolean; direction: "OUT" | "RETURN"; soKhachTinhTien: number; paxOverride: number | null }): { donGia: number; soLuong: number; tien: number } | null; // số lượng 0 ⇒ null
```
- [ ] Lớp 2: chạy cả 15 ca qua `kiemMucChon` + `tinhPhiChon`, so từng lượt (`ket_qua`, `don_gia`, `so_luong`, `tien`), tổng, `xac_nhan_duoc`. Chỉ đếm ca `da_xac_nhan`; danh sách mã bắt buộc canh không rơi ca.
- [ ] Viết hàm; bài xanh. Commit.

### Task 3: Lưu nháp và sửa chặng — mức chọn đi vào dòng phí
**Tệp:** `src/shared/contracts.ts` (thân chặng thêm `phiDon?: MucChon | null`; DTO `PhiDuaDonDto` thêm `loaiChon`), `src/modules/orders/rules.ts` (`validateOrder` kiểm `phiDon` bằng `kiemMucChon`), `service.ts` (`tinhPhiNhap`, `dichVuDangLuuChoPhi`, `cauPhiNhap`), `phi-don-don.ts` (`dauVaoLamPhang`, `dongPhiThanhItem` nhận `MucChon`), `chang-hanh-khach-repo.ts` (câu đọc mức đã lưu theo id chặng), route tạo / lưu nháp / sửa chặng ở `index.ts`.
- `tinhPhiNhap` không gọi `tinhPhiDonChoDon` nữa: đọc `ngày bắt đầu áp` (hàm nhỏ xuất ở `pricing/index.ts`, ví dụ `ngayBatDauApPhiDon(db)`); mỗi chặng mở lấy mức từ thân (lưu nháp) hoặc từ dòng phí đã lưu theo id chặng (sửa chặng); có mức ⇒ `tinhPhiChon`; không ⇒ vào `thieu` với lý do mới `CHUA_CHON`. Không còn `vungCuaDiaDiem` trên đường đơn.
- Người gửi là tài khoản Đối tác (theo quyền, không theo vai hồ sơ) mà thân có `phiDon` ⇒ 400 `transfer_fee_not_allowed`.
- [ ] Bài đỏ: [Điểm 1] sửa nơi đón một chặng trên nháp ⇒ mức của các chặng giữ nguyên, chặng thêm mới «chưa chọn»; [Điểm 2] đổi 2 → 3 người lớn trên nháp ⇒ phí 15.000 × 3; Đối tác gửi `phiDon` ⇒ 400; trước ngày áp ⇒ không dòng phí dù thân có `phiDon`.
- [ ] Viết mã; bài xanh. e2e `tests/e2e/phi-don-don.mjs` viết lại theo cách chọn (ca SV-PC-01, 03, 04, 06, 07, 14), mức quanh hôm nay, `finally` tắt công tắc. Commit.

### Task 4: Xác nhận — dùng mức đã chọn, Còn vé nhận mức
**Tệp:** `service.ts` (`chuanBiPhiDonXacNhan`), `xac-nhan-chung.ts`, `xac-nhan-route.ts` (`quyet-dinh` nhận `phiDon` theo id chặng; `gui-don`, `gui-xac-nhan`), `src/shared/phi-don-hien-thi.ts` (`cauThieuPhiDon` cho `CHUA_CHON`).
- `chuanBiPhiDonXacNhan` lấy mức từ dòng phí đã lưu (nay mức là dữ liệu người chọn, không còn «không tin dòng dự kiến»), tính lại số lượng theo số khách hiện tại, giữ nguyên thứ tự lô và câu chốt của Đợt C.
- Còn vé: văn phòng gửi kèm mức cho các chặng đang thiếu; máy chủ kiểm bằng `kiemMucChon`, ghép vào cùng lô xác nhận (câu phí trước câu đổi trạng thái, câu chốt sau — như Đợt C). Người bấm phải qua ô `order.modify` như hôm nay.
- Câu báo `CHUA_CHON`: «Chọn phí đưa đón cho lượt đón <chiều> của dịch vụ <tên> trước khi xác nhận.» Các lý do `KHONG_CO_MUC`, `XUNG_DOT`, `DAI_LY_HAI_CAP` không còn sinh ra trên đường đơn.
- [ ] Bài đỏ: SV-PC-09 (`/status` và Gửi xác nhận ⇒ 409); [Điểm 3] SV-PC-10 (Đối tác Gửi đơn ⇒ nhánh A; văn phòng Còn vé kèm 30.000 ⇒ xác nhận, phí 60.000 trong cùng lô; Còn vé thiếu mức ⇒ 409); [Điểm 4] nháp trước ngày áp, xác nhận sau ngày áp ⇒ 409; lô thua vẫn không đổi tiền nháp (bài Đợt C giữ xanh).
- [ ] Viết mã; e2e `xac-nhan-don`, `gui-don` thêm ca chọn. Commit.

### Task 5: Tiền sau xác nhận — kiểm lại, không viết mới
Đợt C đã xử lý sửa số khách, công nợ đại lý, biên nhận, chia phần, giảm giá theo dòng `TRANSFER_FEE`; các hàm đọc `unit_price`/`fee_kind` nên không phụ thuộc nguồn mức.
- [ ] Bài theo sổ vàng: SV-PC-11 (sửa 2 → 3 người lớn ⇒ 45.000), SV-PC-12 (nợ 1.140.000, hoa hồng 120.000), SV-PC-13 (Hòn Tằm 900.000, Tour Đảo 100.000, giảm tối đa 1.000.000), SV-PC-02 (biên nhận «Miễn phí»), SV-PC-15 (thêm chiều về sau xác nhận ⇒ tổng không đổi). Đỏ thì sửa đúng hàm hỏng, ghi vào nhật ký. Commit.

### Task 6: Giao diện, chữ, tài liệu
**Tệp:** `web/khoi-dua-don.ts` (ô chọn mỗi lượt đón), `web/order.ts` (hiện mức, «chưa chọn»), màn Còn vé `web/cho-xac-nhan.ts` (ô chọn cho chặng thiếu), `public/phi-don.html` + bài Hướng dẫn `phi-don`, `src/shared/bang-tham-chieu*.ts`, `docs/SYSTEM-DESIGN.md`, `docs/CHANGE-GUIDE.md` (công thức z39), `docs/HANDOFF-N1.md`, `docs/SO-HANG-RAO.md`, kịch bản Chrome `docs/evidence/2026-11-phi-don/kich-ban/phi-don-chon-smoke.mjs`.
- Ô chọn: Miễn phí, 5.000 … 100.000 đ, Số khác (hiện ô gõ số 16px, `inputMode="numeric"`); chỉ hiện từ ngày áp và chỉ cho tài khoản văn phòng; tài khoản Đối tác thấy câu «Văn phòng sẽ chọn phí đưa đón khi xác nhận.» Không tự tính tiền trong trình duyệt; số tiền hiện là số máy chủ trả sau khi lưu.
- [Điểm 5] giao diện kiểm bằng cùng `kiemMucChon` của `src/shared/`, cùng câu với máy chủ.
- Màn «Phí đưa đón» của Quản trị: câu «Từ ADR-0214 phí trên đơn do văn phòng chọn; bảng này không còn dùng cho đơn.» (không nới trần chữ).
- [ ] Kịch bản Chrome (có `AXE_JS`): văn phòng chọn mức → lưu → thấy dòng dự kiến → xác nhận; Đối tác gửi → văn phòng Còn vé chọn mức → xác nhận; ảnh thật điện thoại và máy tính cho chủ duyệt.
- [ ] Tài liệu mô tả cùng commit; nhật ký thi công `docs/superpowers/plans/2026-11-16-phi-don-van-phong-chon-thi-cong-nhat-ky.md`. Commit.

### Task 7: Bộ kiểm đủ, sổ vàng cũ, người kiểm độc lập
- [ ] Sổ vàng cũ `golden/phi-dua-don.json`: giữ (còn dùng cho «Thử tra» của màn Quản trị), sửa `_mo_ta` ghi «không còn là luật của đơn từ ADR-0214»; bài lớp 3 của bộ cũ chạy trên đường đơn thì gỡ có chủ đích, ghi lý do.
- [ ] Chạy một lần: `npm run typecheck` (0 lỗi), `npm test`, `npm run test:e2e`, `node scripts/audit-invariants.mjs --db local`; ghi kết quả thật vào nhật ký.
- [ ] Quan sát chặn thật (P16), ghi `docs/SO-HANG-RAO.md`: bỏ cổng «chưa chọn» ⇒ e2e SV-PC-09 đỏ; bỏ kiểm Đối tác ⇒ bài 400 đỏ; bỏ kiểm danh sách ở máy chủ ⇒ bài 12.000/«Danh sách» đỏ.
- [ ] Người kiểm độc lập chỉ đọc (`nguoi-kiem-doc-lap`); chỉ báo «đạt» theo báo cáo đó. Đưa chủ lệnh `npm run day-len`; phát hành do chủ theo `docs/HANDOFF-N1.md`. Sau phát hành, phí vẫn chưa chạy tới khi Quản trị đặt «ngày bắt đầu áp».
