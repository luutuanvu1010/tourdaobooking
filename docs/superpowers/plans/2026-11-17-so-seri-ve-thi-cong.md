# Kế hoạch thi công — Số sê-ri vé, tra bằng số sê-ri, huỷ vé lẻ, huỷ lô đã cấp (ADR-0217)

> Nguồn: ADR-0217 (đề xuất), đặc tả `docs/superpowers/specs/2026-11-17-so-seri-ve-va-huy-ve.md` (chủ duyệt 17/11). Mâu thuẫn thì ADR thắng. Nhánh `claude/ticket-series-management-0cca10`. Việc lớn: có người kiểm độc lập. Nhật ký thi công ở cuối tệp.

## Phần A — Máy chủ (một trợ lý)

**A1. Migration `0177_ve_so_seri.sql`** (chỉ thêm; theo khuôn chú thích đầu tệp của 0155):
- `vdt_serial (serial TEXT PRIMARY KEY CHECK (serial GLOB 'VE_[A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z][A-Z]'), batch_id TEXT NOT NULL REFERENCES vdt_batch(id), created_at, created_by, updated_at, updated_by)`; trigger cấm xoá, cấm sửa.
- `vdt_ticket` thêm `serial TEXT`, `voided_at`, `voided_by`, `void_reason`. Gán số cho vé cũ bằng SQL (`'VE_' || char(65 + abs(random()) % 26)` × 8), chèn các số đó vào `vdt_serial`, rồi `CREATE UNIQUE INDEX vdt_ticket_serial_uq ON vdt_ticket(serial)`. Trigger: chèn vé phải có `serial` đã có trong `vdt_serial` cùng `batch_id`; `serial` không đổi; bộ ba `voided_*` chỉ ghi một lần, chỉ khi `status = 'VOID'`, `void_reason` 5–300 ký tự.
- `vdt_scan` thêm `nhap_tay INTEGER NOT NULL DEFAULT 0 CHECK (nhap_tay IN (0,1))`; DROP rồi tạo lại `vdt_scan_only_void` có thêm `nhap_tay` trong danh sách bất biến.
- Cập nhật `docs/data-dictionary.json` + `npm run dict`. Bài `migration.test.ts` của module: thêm ca cho từng trigger (đỏ trước).

**A2. Cấp số.** `TIEN_TO_MA` thêm `{ tienTo: "VE", loai: "Vé điện tử" }`; cấp bằng `sinhMa` với `crypto.getRandomValues`.
- Vé hãng ngoài: `POST /api/ve/lo/:id/ve` cấp số cho từng vé, câu chèn `vdt_serial` đứng trước câu chèn vé trong cùng `db.batch`.
- Vé Tour Đảo: `POST /api/ve/lo` với `nguon = TOUR_DAO` bắt buộc `soVeDuKien`; cấp đủ số vào `vdt_serial` trong cùng lô lệnh mở lô; phản hồi thêm `soSeri: string[]`. `POST /api/ve/lo/:id/ve` của lô Tour Đảo: mỗi vé phải mang `soSeri` thuộc lô đó, chưa dùng (sai ⇒ loại vé đó, lý do lời thường).
- Phản hồi `veDaNhap` thêm `soSeri`.

**A3. Tra bằng số sê-ri ở `POST /api/ve/quet`.** `ma` khớp `MA_DINH_DANH_RE` và tiền tố `VE` ⇒ tra theo `serial` (câu mới cạnh `DOC_VE_QUET`), đặt `nhapTay = true`. Luật thuần `src/shared/ket-qua-quet.ts`: thêm cảnh báo vàng `NHAP_TAY` (cần `xacNhan.nhapTay`), đứng sau mọi điều đỏ; Tài xế công ty vẫn chỉ `CHI_XEM`. Ghi `nhap_tay` vào lượt quét; nhật ký `ve_quet` thêm «nhập tay» và số sê-ri. Phản hồi quét thêm `soSeri`. Bài đỏ trước.

**A4. Huỷ vé lẻ** `POST /api/ve/huy-ve` thân `{ soSeri, lyDo, lenhId }`: `coQuyenLo` theo nguồn của lô; bảng kết quả ADR-0217 Đ3 mục 2; lý do theo khuôn `chuaMaHoacSdt`; một `db.batch`: (trả suất `THU_HOI` nếu có phân bổ mở, gác vé chưa dùng) → vé VOID + `voided_*` → nhật ký `ve_huy_ve` (detail: số sê-ri + lý do). Sau lô: chạy đường cấp vé thay sẵn có (`capVeSauXacNhan`/`donChoCapBu`, xem cách `/lo/:id/xac-nhan` gọi) cho đơn bị trả suất. Vé đã mở: báo người phụ trách đơn theo cách `ve_thieu` vào hộp thư (migration 0152, view `v_aud_ledger_event`, chỗ tính người nhận); nếu cách đó không đặt được người nhận là người phụ trách đơn mà không đụng hợp đồng `orders`, **dừng và báo lại** thay vì tự mở đường mới. Chống ghi trùng theo ADR-0094 như các lệnh vé khác.

**A5. Huỷ lô đã cấp.** `GET /api/ve/lo/:id/xem-truoc-huy` (con số: huỷ được, giữ nguyên vì đã dùng, giữ nguyên vì vé hãng ngoài đã mở, số đơn cấp thay, số vé đã gửi phải gửi lại). `POST /api/ve/lo/:id/bo`: lô chưa từng cấp ⇒ đường cũ không đổi; lô đã cấp ⇒ bắt buộc `lyDo`, huỷ từng vé huỷ được theo A4 trong một lô lệnh, lô ⇒ VOID, rồi cấp vé thay. Nhật ký `ve_bo_lo` ghi số vé huỷ.

**A6. Danh sách vé của lô** `GET /api/ve/lo/:id/ve-trong-lo` và tìm `GET /api/ve/tim?soSeri=`: mỗi vé số sê-ri, hạn, tình trạng (Trong kho / Đã giữ cho đơn / Đã gửi khách / Đã dùng / Đã huỷ), mã đơn chỉ khi người xem có `order.view` trên đơn đó (theo cách route quét làm). Không bao giờ mã vé, khoá kho. Quyền xem như `GET /api/ve/lo`.

**A7.** Hành động nhật ký mới ở `src/shared/audit-actions.ts` (nhãn tiếng Việt). Bài `src/giay-to-khong-lo-so.test.ts`-kiểu cho vé (nếu có bài «mã vé không lộ» của module: thêm ca cho mọi route mới). e2e `tests/e2e` kịch bản vé: thêm ca huỷ vé lẻ (trong kho, đã giữ ⇒ có vé thay, đã dùng ⇒ 409), gõ số sê-ri (vàng nhập tay ⇒ xác nhận ⇒ đã dùng), huỷ lô đã cấp.

## Phần B — Giao diện (trợ lý thứ hai, sau Phần A)

- `web/ve-tao.ts` + `web/ve-anh-tour-dao.ts`: lấy `soSeri` từ lệnh mở lô, vẽ «Số sê-ri VE_… / Serial No.» thay dòng «Số vé …»; gửi `soSeri` kèm từng vé; bài bố cục.
- `web/quet-ve.ts` + `public/quet-ve.html`: ô «Nhập số sê-ri» (16px, chữ hoa, bỏ khoảng trắng) + nút tra; kết quả dùng chung khung hiện có; cảnh báo vàng nhập tay đi qua nút «Xác nhận cho đi» sẵn có.
- `web/ve-kho.ts`: danh sách vé của lô, ô tìm số sê-ri, nút «Huỷ vé» (hộp xác nhận + lý do), «Huỷ lô» cho lô đã cấp hiện bản xem trước con số trước khi xác nhận.
- Bảng tham chiếu (`src/shared/bang-tham-chieu*.ts` → sinh `docs/BANG-THAM-CHIEU.md`): «Số sê-ri» (đã chốt 17/11), «Huỷ vé», «Nhập số sê-ri» (chờ chọn), cập nhật «Huỷ lô», «Tạo vé».
- Trần gói của trang (nếu bài trần gói đỏ): ghi số mới vào nhật ký, không tự nới — báo điều phối.
- Kịch bản Chrome của kho vé và quét vé chạy lại.

## Xong khi
Ví dụ ở mục 2 của đặc tả chạy được trên bản thử; `npm test`, `npm run typecheck`, e2e `ve-dien-tu` xanh; người kiểm độc lập ĐẠT.

## Nhật ký thi công
- 2026-11-17: đặc tả duyệt; ADR-0217 soạn (đề xuất); kế hoạch này.
- 2026-11-17 (người thi công Phần A, máy chủ): A1–A7 xong trên nhánh; typecheck, `npm test`, e2e `ve-tour-dao` + `ve-dien-tu` chạy cuối (kết quả ở báo cáo của người thi công). Quyết định nhỏ tự đặt:
  - **Vé chèn không mang số tự được cấp số bằng trigger** (`vdt_ticket_serial_fill`, AFTER INSERT) thay vì chặn: 22 chỗ bài thử chèn thẳng `vdt_ticket` không phải sửa, và mọi vé luôn có số trong sổ. Mã ứng dụng luôn truyền số do máy chủ cấp; riêng Tour Đảo bắt buộc ở route (không ở trigger).
  - **Cảnh báo vàng `NHAP_TAY` đứng SAU ba cảnh báo vàng cũ**, trước xanh (đặc tả nói «kể cả khi mọi kiểm khác xanh»). Gõ tay vé chưa giao ra đỏ `CHUA_GIAO` như quét thường.
  - **Nhật ký `ve_quet` dùng «số sê-ri VE_…» thay «số cuối»** (ADR Đ1); bài quet-route đổi theo. `ve_huy_ve` mới nằm trong danh sách ẩn của lịch sử đơn (lý do tự do) cho tới khi chủ xếp loại, như mọi hành động `ve_*` khác.
  - **Huỷ vé không đặt `purged_at`**: ảnh vé đã huỷ ở lại kho R2, chưa có việc xoá. Nợ nhỏ nếu chủ muốn dọn ảnh vé huỷ như lô huỷ.
  - **Số sê-ri đã cấp mà vé không chèn được** (chen ngang, trùng mã) ở lại sổ (sổ chỉ thêm); vé hãng ngoài chỉ gây trường hợp này khi hai máy nhập cùng lúc.
  - `lenhId` ở `POST /api/ve/huy-ve` chỉ kiểm dạng UUID; chống ghi trùng theo ADR-0094 do lớp router (tiêu đề lệnh) lo. Hai route mới ghi hai lần (huỷ rồi cấp thay) nên vào `GHI_NHIEU_LAN` ở `src/shared/lan-gui-no.ts`.
  - Cấp vé thay sau huỷ lô tối đa `TOI_DA_DON_XET_CAP_BU` (30) đơn mỗi lệnh; còn nữa thì phản hồi `conDonChuaCapThay = true` (đơn còn lại thành «thiếu vé», cấp tay bằng `POST /api/ve/cap`). Nhật ký `ve_tra_ve` theo đơn cũng chỉ ghi cho 30 đơn đầu.
  - Danh sách vé của lô, tìm vé: Bán hàng (ô `ve.kho.manage`) xem được số sê-ri lô Tour Đảo như `GET /api/ve/lo`; mã đơn chỉ khi `order.view` (qua `donChoQuet`).
- **DỪNG, chờ điều phối (A4):** «báo người phụ trách đơn gửi lại» khi huỷ vé đã mở KHÔNG làm. Lý do: hộp thư chỉ chọn người nhận theo khoá `('ve', nguồn)` cho `ve_thieu`; muốn báo đúng người phụ trách đơn phải (a) thêm hành động mới vào view `v_aud_ledger_event` (migration), (b) thêm ca vào `locHopThongBao` (`src/shared/thong-bao.ts`) và (c) tìm người phụ trách đơn từ module vé — `ve-dien-tu` chỉ có cạnh tới `orders`, không có tới `dispatch` (`v_dsp_order_handler`). Cả ba đụng hợp đồng ngoài kho vé. Tạm thời: phản hồi huỷ trả `canGuiLai = true`, nhật ký `ve_huy_ve` ghi theo đơn, vé thay hiện ở khối vé của đơn như vé mới cấp chưa gửi.
- **Còn nợ Phần B (giao diện):** `web/ve-tao.ts` đã gửi `soVeDuKien` lúc mở lô nhưng chưa dùng `soSeri` trả về và không gửi `soSeri` từng vé ⇒ với máy chủ mới, vé Tour Đảo từ giao diện bị loại («Thiếu số sê-ri đã cấp cho lô này») cho tới khi Phần B sửa.
- **Bất biến dữ liệu:** `so-seri-route.test.ts` chạy mọi bất biến `R-VDT-*` mức `fail` của `scripts/audit-checks.mjs` sau ba tình huống mới (huỷ lô Tour Đảo đã cấp có vé đã dùng giữ nguyên, huỷ lô hãng ngoài có vé đã mở giữ nguyên, huỷ vé lẻ hết kho): đều 0. e2e chạy lẻ theo tên nên KHÔNG có bước `audit-invariants` cuối — chưa chạy trên D1 e2e.
- **Việc để điều phối quyết:** (1) `GET /api/ve/lo` vẫn loại lô đã từng cấp (câu `DS_LO_BO_DUOC`), nên Phần B chưa có cách lấy `loId` của lô đã cấp để mở `ve-trong-lo`, `xem-truoc-huy` — đề xuất thêm tuỳ chọn cộng thêm (tham số truy vấn hoặc trường `daCap`), không đổi mặc định vì màn kho hiện gửi `POST …/bo` với `{}` cho mọi lô nó liệt kê; (2) lô đã cấp có > 30 đơn bị trả suất: đơn thứ 31 trở đi chỉ được trả suất, không có `ve_tra_ve`, không cấp thay, không `ve_thieu` (ADR Đ3 mục 4 «báo như hiện nay» chưa đủ) — phương án: nâng trần, hoặc cấp thay theo lượt qua Cron; (3) trigger `vdt_ticket_serial_fill` nhận vé không số (kế hoạch ghi trigger chặn) — nếu muốn siết thì phải sửa 22 chỗ bài chèn thẳng; (4) hai mục mới ở `GHI_NHIEU_LAN` là ngoại lệ H5 cần chủ duyệt (Điều 9.4).
