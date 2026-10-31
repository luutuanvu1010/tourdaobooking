# Báo cáo kiểm độc lập (chỉ đọc) — Kế hoạch thi công ADR-0146 + ADR-0151, 30/10/2026

- **Tệp được kiểm:** `docs/superpowers/plans/2026-10-30-adr-0146-va-dac-diem-dich-vu-ke-hoach.md` (667 dòng). Đối chiếu với `docs/adr/ADR-0146-…md`, `docs/adr/ADR-0151-…md` (đã có ở commit `16466c3`) và mã tại HEAD `16466c3`; mã nguồn trùng `a129d3d`.
- **Cách kiểm:** chỉ đọc (`sed`, `grep`, `git show`, một đoạn `python3` đọc `docs/quyen-hoan.json`). Không chạy lệnh ghi, không chạm remote.
- **Kết luận: ĐẠT CÓ ĐIỀU KIỆN.** Có **1 phát hiện CHẶN** (K-1, trùng mã kiểm `R-CTL-1`), 4 NÊN SỬA, 5 GHI NHẬN. Sửa K-1 xong thì giao thi công được.

## 1. Phát hiện

### K-1 — CHẶN — `R-CTL-1` đã có trong mã; kế hoạch đặt kiểm mới trùng tên và ghi sai kỳ vọng ở runbook
- **Vị trí trong kế hoạch:**
  - R-8 và bảng 4.3, dòng «`R-PRC-8`, `R-CTL-1` kiểm định kỳ»;
  - T1 bước «`R-CTL-1` (mức `fail`): dòng gắn mở trỏ đặc điểm / giá trị / nhóm đang tắt»;
  - mục 9 bước 3: «`R-CTL-1`, `R-PRC-8` phải 0 (bảng mới rỗng)».
- **Bằng chứng (đã mở tệp):**
  - `scripts/audit-checks.mjs:1891–1895` đã có `code: "R-CTL-1"` (ADR-0058, NT-A11): đếm dịch vụ đang hiện mà chưa phân loại nhóm, mức `warn`.
  - `src/audit-invariants.test.ts:44–47`: hàm `one(code)` đòi **đúng một** kiểm cho mỗi mã. Thêm một kiểm thứ hai cùng mã thì bài này đỏ.
  - `docs/HANDOFF-N1.md:85` ghi production từng có «R-CTL-1 9 dịch vụ chưa phân nhóm». Kỳ vọng «`R-CTL-1` phải 0» ở runbook vì vậy sai với dữ liệu thật: chủ sẽ thấy số khác 0 và tưởng phát hành lỗi.
- **Câu sửa đề nghị:** đổi tên kiểm mới thành `R-CTL-2` ở R-8, T1, bảng 4.3, T10 và runbook bước 3. Runbook bước 3 sửa thành: «`R-CTL-2`, `R-PRC-8` phải 0 (bảng mới rỗng). `R-CTL-1` (cảnh báo dịch vụ chưa phân nhóm) giữ như trước, không phải lỗi».

### K-2 — NÊN SỬA — Q-5 / HC-5.19: quá hạn làm đỏ cả **thi công**, không chỉ phát hành; mốc ngày nói lệch một ngày
- **Bằng chứng (đã mở tệp):**
  - `docs/quyen-hoan.json`: HC-5.19 có `han: 2026-11-05`.
  - `src/phat-hien-han.test.ts:36–38`: bài đỏ khi `han < hôm nay` (giờ VN). Như vậy ngày 05/11 vẫn xanh, **06/11** mới đỏ.
- **Kế hoạch nói gì:** mục 1.2 và Q-5 có nói «npm test đỏ», nhưng đóng khung là «chặn phát hành» (mục 9 bước 0, cột «Chặn» của Q-5 = «phát hành»).
- **Hệ quả bị nói thiếu:** mọi bước «`npm test` → PASS / xanh» của T1–T15, và ba điểm dừng KĐL-1/2/3 (người kiểm phải chạy lại `npm test`), đều đỏ từ 06/11. Như vậy thi công kéo qua 05/11 thì không task nào nghiệm thu đúng chữ kế hoạch được.
- **Câu sửa đề nghị:**
  - Q-5: «Hạn 05/11 (từ **06/11** `npm test` đỏ ở **mọi** task và điểm kiểm, không riêng phát hành).»
  - Đổi cột «Chặn» thành «thi công sau 05/11 và phát hành».
  - Phương án (c) sửa thành «phát hành **trước hoặc trong ngày** 05/11».
  - Thêm hướng dẫn ghi sổ thi công: bài `phat-hien-han` đỏ chỉ vì HC-5.19 thì không tính là đỏ của task, nhưng KĐL phải ghi rõ.
- **Không xây trên lỗ đang hở:** đồng ý. Kế hoạch không chạm tiền, sổ, đường đồng bộ; migration chỉ thêm. Cách nhìn này khớp các lượt trước.

### K-3 — NÊN SỬA — Số dòng ở `POST /api/orders` và `PUT /api/orders/:id` lệch
- **Kế hoạch ghi:**
  - mục 1.1: `benDatCuaTaiKhoan` `:1133`, `resolveBooker` `:1135`, `tranGiamGiaNhap` `:1137`;
  - R-4: «ngay sau `resolveBooker` (`index.ts:1135`), trước `tranGiamGiaNhap` (`:1137`)»;
  - PUT: `benDatCuaTaiKhoan` `:1258`, nhánh giữ bên đặt `:1255`.
- **Mã thật** (`src/modules/orders/index.ts`):
  - `benDatCuaTaiKhoan` ở `:1131`, `resolveBooker` ở `:1133`, `tranGiamGiaNhap` ở `:1135`;
  - `:1137` là `const coChang`;
  - ở PUT: `:1255` là dòng chú thích, `:1258` là `noBookerKeys`, `benDatCuaTaiKhoan` ở `:1260`, nhánh giữ bên đặt ở `:1262–1264`.
- **Thứ tự hàm kế hoạch mô tả là đúng.** Nhưng người thi công đặt theo số dòng `:1135` thì sẽ đặt **sau** `tranGiamGiaNhap`.
- **Sửa:** đổi số dòng như trên, hoặc chỉ ghi theo tên hàm.
- **Các tệp:dòng khác đã mở và đúng:**
  - `index.ts`: `:1110`, `:1123`, `:1225`, `:1289`, `:1595`, `:1610`, `:1612`, `:1616`, `:1621`, `:1664`, `:1702–1703`;
  - `xac-nhan-chung.ts`: `:83`, `:91`, `:96`;
  - `xac-nhan-route.ts`: `:100`, `:116`, `:117`, `:118`, `:131–133`, `:150`, `:296`, `:309`;
  - `catalog/index.ts`: `:126–146`, `:167–171`, `:174–175`;
  - `pricing/index.ts`: `:150` (`doiTrangThaiLoai`), `:368`, `:255`, `:399`;
  - `pricing/rules.ts:58`; `pricing/repository.ts`: `:32`, `:66`, `:75–76`, `:88–90`;
  - `permissions.test.ts`: `:27–28`, `:281`, `:364`/`:371`, `:415`/`:422`, `:472`/`:476`, `:572`;
  - `xem-don-theo-quyen.test.ts:305–306`; `tro-ly-cau-truc-ten.ts:75–76`; `tro-ly-cau-truc.test.ts:38–39`;
  - `architecture.test.ts`: `:160–174` (NUA_NGHIEM), `:334–353`, `:355`, `:1335`;
  - `muc-giao-dien.ts`: `:58`, `:71`, `:197`; `sw-policy.ts`: `:18`, `:26`;
  - `0090:6–9`, `0096:35–46`, `0097:25, 52–55`; `parties/loai-doi-tac-noi-bo.test.ts:189`.
  - Lệch nhỏ: STRICT nằm ở `:79–106` chứ không phải `:84–99`; dòng `pricing` ở `:96`.

### K-4 — NÊN SỬA — Nguồn ADR-0151 trong kế hoạch đã cũ
- Mục 0, mục 10 và T0 ghi «ADR-0151 chưa có tệp; dùng A». Thực tế tệp `docs/adr/ADR-0151-dac-diem-dich-vu-va-luat-ban-theo-dac-diem.md` đã có (commit `16466c3`).
- Tôi đã đối chiếu: số điều Đ1–Đ6 và tiêu chí 1–20, 10b, 12b, 17b của ADR-0151 (dòng 294–328) **khớp** A. ADR-0151 đã có bản sửa R3-1 (CV-4 «bộ dữ liệu thay cho CV-3», dòng 283).
- **Sửa:** trỏ thẳng ADR-0151 ở mục 0. Bỏ câu «chưa có tệp» ở mục 10. T0 chỉ còn bước ghi số khớp.

### K-5 — NÊN SỬA — Hàng rào (l2) không đỏ được trước khi làm, và đột biến chồng với bài 8(b)
- T2 ghi bài (l2) duyệt `registeredSql()`: câu của `pricing` / `orders` không chứa `ctl_attribute` kèm `name`. Trước khi làm, `pricing` chưa có câu nào chạm bảng này, nên bài **xanh ngay**. Đột biến «thêm `name` vào câu đã đăng ký của `pricing`» cũng đồng thời làm đỏ bài 8(b) (`pricing` đọc thẳng bảng `ctl_*`). Quan sát đỏ thật vẫn được, nhưng không chứng minh (l2) bắt được điều mà 8(b) bỏ sót.
- **Sửa:** ghi rõ trong sổ hàng rào rằng (l2) chồng với 8(b) và (e), (f); lớp riêng của nó là canh «view không thêm cột tên». Hoặc đột biến thêm cột `name` vào `v_ctl_service_attribute` trong bản dựng thử: cả bài sổ «cột view đúng sổ» lẫn (l2) phải đỏ.

### K-6 — GHI NHẬN — Bảng tiêu chí → task: đủ
- **ADR-0146 tiêu chí 1–13:** mỗi tiêu chí có task và bài đỏ trước. Bài ở T4, T6, T8 viết khi tệp / route chưa có, nên đỏ thật.
  - Tiêu chí 12 thay «thiếu phí đón» (ADR-0147 chưa có mã — đã kiểm: `grep` rỗng) bằng bốn cổng có sẵn của `kiemCongXacNhan` (R-7). Cách thay hợp lý, có ghi nợ cho kế hoạch ADR-0147. Đây là đổi phép thử, không phải đổi tiêu chí; nên nói một dòng với chủ ở báo cáo cuối.
  - Đ5, Đ6 (a)(b)(c)(d), «Việc bắt buộc», Hệ quả: có task.
- **ADR-0151 tiêu chí 1–20, 10b, 12b, 17b:** có task. 10b chỉ ở mức thuần (T4), có thêm ca R3-2. 17b có phần máy chủ (T7) và phần giao diện (T12, Chrome).
- **T14 e2e:** chạy sau T8 nên «đỏ trước» làm bằng đột biến (bỏ `congLuatBan` ở Gửi xác nhận). Chấp nhận được, kế hoạch đã nói.

### K-7 — GHI NHẬN — R-1 («ngày kết thúc» tính trọn): khớp khuôn `pricing`, và tiêu chí «đặt lại được ngay» đạt
- **Khớp khuôn có sẵn (đã mở tệp):**
  - `prc_commission_rule` (`0097:25`) và `prc_role_tier` (`0096:25`): `valid_to_date >= valid_from_date`;
  - trigger `*_close_only` chỉ cho đặt ngày kết thúc một lần (`0097:54–55`, `0096:35–36`);
  - `hieuLuc` tính cả hai đầu (`rules.ts:58`), SQL cũng vậy (`repository.ts:32, 66`);
  - «ngừng hôm qua» là cách thôi áp từ hôm nay (`doi-chinh-sach.test.ts:199`, `doi-muc-route.test.ts:40`).
- **Tiêu chí «kết thúc luật thì đặt lại được ngay»** (ADR-0146 tiêu chí 5, ADR-0151 12b): **đạt**. «Kết thúc ngay» ghi `valid_to_date = max(hôm qua, valid_from − 1)`, nên `hieuLuc(hôm nay)` là sai ⇒ **hôm nay đặt được ngay**.
  - Luật bắt đầu hôm nay ⇒ ngày kết thúc = hôm qua = from − 1, `CHECK` cho qua.
  - Luật bắt đầu tương lai ⇒ ngày kết thúc = from − 1 ≥ hôm nay, không bao giờ áp.
  - Bài T4 có đủ ba ca, e2e T14 thử `date()` trong `CHECK` trên D1.
- **Một ca dễ nhầm, nên nói ở giao diện và Trợ giúp:** nếu người dùng **hẹn** kết thúc «đến hôm nay», luật vẫn chặn tới hết hôm nay, vì tính trọn ngày. Nút «Kết thúc» (ngay) và ô «Đến ngày» phải nói khác nhau.
- **Hệ quả ghi sổ:** luật đã chặn đơn sáng nay rồi bị «kết thúc ngay» sẽ hiển thị «đến hôm qua», trông như chưa từng áp hôm nay. Khi tra «vì sao sáng nay bị chặn» thì phải đọc nhật ký kết thúc luật. Chấp nhận được, giống màn Hoa hồng; nên ghi một câu ở Trợ giúp.
- **Khác khuôn có lý do:** dùng khoảng rỗng thay cột `voided_at`, vì ADR-0146 Đ1 chỉ cho «đặt ngày kết thúc một lần». Hợp ADR.

### K-8 — GHI NHẬN — R-2 / R-3: luật phụ thuộc
- `orders/cong-ban.ts` gọi `pricing.kiemLuatBan` qua `index.ts`: cạnh `orders → pricing` có (`architecture.test.ts:54`). Tệp mới không có SQL nên không cần NUA_NGHIEM.
- `pricing` gọi `catalog.tenDacDiemTheoMa` và `getEffectiveServices`: cạnh `pricing → catalog` có (`:57`). `luat-ban-repo.ts` đọc view `v_ctl_*`, `v_pty_open_role`: cạnh `pricing → parties, catalog` có. Tệp này **phải** vào STRICT (kế hoạch đã ghi).
- Bộ lọc for-order dùng hàm tiêm `dichVuBiChanChoToi` qua `src/index.ts`, nên `catalog` vẫn chỉ phụ thuộc `audit`. Đúng ADR-0146 Đ4.
- Trigger `prc_sales_block_value_ok` đọc `v_ctl_attribute_value`: hợp bài thân trigger (đã kiểm ở báo cáo KIEM-A-B vòng 2). `prc_sales_block_role_ok` đọc bảng cùng module. Khoá ngoại `group_code`, `attribute_code`, `value_code` đều một cột, trỏ khoá chính, theo chiều `pricing → catalog`.
- **Không thấy vi phạm.**
- Ghi thêm: bộ quét (a) `\bprc_sales_block\b` không bắt nhầm tên hành động nhật ký `prc_sales_block_added`, vì `_` là ký tự chữ. Bộ quét (f) cũng vậy với `ctl_attribute_created`. Đúng ý, nhưng nên có một ca tự kiểm bộ quét cho tên hành động.

### K-9 — GHI NHẬN — Hàng rào mới: mỗi cái có đột biến và dòng sổ
- Bảng 4.3 ghi cho từng hàng rào (a), (b), (e), (f), (g), (h), (i), (j), (l1), (l2), lưới mọi cửa, `R-PRC-8` và kiểm mới (tên phải đổi theo K-1) một **đột biến cụ thể**.
- T10 bắt mỗi hàng rào có dòng `docs/SO-HANG-RAO.md` (ngày, đột biến, câu đỏ). (l3) ghi «dựa vào kỷ luật». (k) không phải hàng rào. Đủ.
- Lưới «mọi cửa» khai `/status`, Còn vé, Gửi đơn đi qua `kiemCongXacNhan(`. Như vậy đã tránh lỗi đỏ oan mà báo cáo KIEM-A-B (R2B-2) nêu với bản B.
- (l1): mẫu `["'\`][av][0-9a-f]{12}["'\`]` có thể bắt nhầm chuỗi hằng sẵn có trong `web/` hay `src/`; chưa quét. Bước đỏ trước của T2 sẽ lộ ra.

### K-10 — GHI NHẬN — Runbook và lệnh đếm R-9: đúng
- Runbook đúng khuôn `docs/HANDOFF-N1.md`:
  - chủ chạy `npm run day-len -- <nhánh>` rồi `npm run trien-khai` (`scripts/day-len.mjs:2–10` nhận đúng một tên nhánh);
  - Time Travel và hai cổng phiên bản do `trien-khai` làm; mục nhật ký thay đổi (A.0) ở T15 và bước 1;
  - sau đó `audit-invariants --db remote` (thoát 2 ≠ sạch), `d1 migrations list --remote` do chủ chạy.
- Ghi rõ AI không chạy `--remote`, `day-len`, `trien-khai`; mục 6 cấm `git push`, deploy, ghi D1 remote. Đúng `CLAUDE.md` §8.
- **Lệnh đếm 1 bản sửa (R-9) đúng với cách máy xét:**
  - `v_pty_open_role` chỉ có dòng vai `valid_to_date IS NULL` (`0090:6–9`);
  - `JOIN prc_beneficiary_role b … b.active = 1` trùng điều kiện câu `beneficiary_of_party` mà `benDatCuaToi` dùng (`pricing/repository.ts:88–90`).
  - Lệnh 1 cũ (`PHIEU-CHOT` mục C) đếm cả vai hẹn kết thúc tương lai và loại `is_partner_label` không được hưởng là «có loại». Nhận xét của kế hoạch đúng.
  - Lưu ý: luật bán chỉ trỏ được loại đang bật (bất biến Đ1), nên hồ sơ chỉ mang loại đã tắt cũng không bị chặn. Lệnh sửa đếm họ vào «chưa mang loại», tức nói đúng sự thật.
- Kế hoạch chưa chạy lệnh trên dữ liệu thật và đã nói rõ điều đó.

## 2. Tách: đã mở tệp kiểm và suy luận
- **Đã mở tệp kiểm:**
  - mọi tệp:dòng ở K-1, K-2, K-3, K-4, K-7, K-10;
  - sự có mặt của mọi tệp kế hoạch định sửa (`muc-giao-dien-goi.ts`, `muc-hien-mo-duoc-*.test.ts`, `tests/e2e/permissions.mjs`, `order-errors.ts`, `tests/audit/harness.mjs`, `pricing/route.test.ts`, `loai-doi-tac.test.ts`, `audit-actions.test.ts`, `lich-su-noi-bo.test.ts`, `lich-su-don-doi-tac.test.ts`, `danh-muc-lap-don.test.ts`, `router.test.ts`, `lich-su-doi-tac.ts`, `migrations-dua-don-dich-vu.test.ts`, `ratchet-confirm-alert.test.ts`, `hang-du-lieu.test.ts`, `scripts/sinh-so-do-trang.mjs`): đều có;
  - `src/phat-hien-han.test.ts` (luật quá hạn); `scripts/audit-checks.mjs` (mã kiểm hiện có: `R-CTL-1`, `R-PRC-1…7`).
- **Suy luận, chưa chạy:**
  - `date()` trong `CHECK` chạy trên D1 (kế hoạch tự để e2e bắt);
  - (l1) có bắt nhầm hay không;
  - số bài đỏ khi thêm hai ô;
  - các bước Chrome.
