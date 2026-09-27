# Rà soát cấu trúc dự án tourdao-sales theo triết lý Oracle "như đã bàn"

- **Ngày:** 2026-09-27. **Vai:** phiên điều phối tổng hợp; ba người rà **độc lập, chỉ đọc**, chia theo loại bằng chứng: **dữ liệu** (Phụ lục A), **đường ghi** (Phụ lục B), **chỗ đặt** (Phụ lục C). **Bản tổng hợp này chưa có người kiểm độc lập.**
- **Mã được rà:** `main` dc4b4f9 = bản 1.18 đang chạy production (sau ADR-0019).
- **Chuẩn = những gì đã quyết**, không phải tệp Oracle thô: `docs/ARCHITECTURE.md` Phần I (Hiến chương kiến trúc lõi + bảng thi hành), `docs/superpowers/specs/2026-09-25-hien-chuong-doi-chieu-ban-mau.md` (áp dụng / điều chỉnh / hoãn), `docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md`, các ADR. Tham chiếu gốc: `CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md`.
- **Tài liệu do chính phiên điều phối viết bị coi là khẳng định cần kiểm:** `docs/SYSTEM-DESIGN.md` §17 (bản đồ lõi) và cột "Hiện trạng / Cưỡng chế / Lệch" của bảng thi hành Phần I.
- **Ngăn:** (1) đã làm, đúng · (2) lệch có ADR/"hoãn" che · (3) lệch không quyết định · (4) đã quyết, chưa làm · (5) không quyết, không kế hoạch · (+) tài liệu nói khác mã. **Nhóm:** A = nên làm trước sổ công nợ (Hoàn tất lượt 1, ADR-0024–0026); B = để sau; C = đã chọn có ý thức.

## 1. Kết luận

1. **Khung đúng hướng Oracle.**
   - Bản thể: Bên → vai có hiệu lực → tài khoản → quyền tách lớp (0011, 0012, 0024; LC-1/LC-3 có trigger).
   - Tiền là số nguyên, dẫn xuất ở máy chủ, trigger giữ công thức của số đã lưu (0007).
   - Giá có một nguồn (Sheet → `catalog_item`, một hàm `toEffective`, đơn chụp giá lúc lập).
   - Nhật ký chỉ-thêm và trạng thái đơn chỉ đi tiến, giữ ở CSDL (0017).
   - 13 module chia theo miền; đồ thị phụ thuộc khai báo một chiều; import chỉ qua `index.ts`; `shared/`, `web/` không import module; 8 module STRICT sạch; thân trigger đều trong module.
   - Mọi route ghi sau cổng đều hỏi bảng quyền; 42/45 route ghi dữ liệu + nhật ký trong đúng một `db.batch()`.
   - Trong app không có AI; tác nhân tự động duy nhất là Cron danh mục (ADR-0010 đ3).
2. **Chưa đủ ở mối nối đơn hàng ↔ hồ sơ ↔ tiền** — đúng nơi sổ công nợ sắp đặt lên: đơn Đối tác chưa ghi bên đặt; số tiền "hiện hành" sau điều chỉnh không có một hàm/cột đáng tin; xác nhận đơn không gắn phiên bản; khối đơn hàng (LEGACY, quá hạn) đọc ngược sang khối phân công.
3. **Tài liệu tự khai quá tay:** §17 còn ghi bản 1.13 và "Bảng tin chưa gộp"; bảng thi hành Phần I ghi "Lệch: —" ở nhiều điều đang lệch; "Cưỡng chế bằng `architecture.test.ts`" ở 2.1/5.3 chưa từng được thấy chặn thật (SO-HANG-RAO.md:29).
4. **Đếm:** dữ liệu (1) 4 · (2) 9 · (3) 9 · (4) 5 · (5) 2 · (+) 4; đường ghi theo route (1) 26 · (2) 9 · (3) 8 · (4) 1 · (5) 1, thêm 3 điểm (5) xuyên suốt và 9 (+); chỗ đặt (1) 7 · (2) 9 · (3) 8 · (4) 6 · (5) 4 · (+) 6. Test chỉ đọc do người rà chạy: `architecture.test.ts` 23/23, `route-write-guard` 9/9, `buildlines-guard` 2/2; điều phối chạy `npm test` 938/938.

### Chuỗi 9 lớp của Oracle, đối chiếu nhanh
| Lớp Oracle | Ở dự án | Ngăn |
|---|---|---|
| Thực tại → Bên (Parties) | module `parties` (`pty_`), vai có hiệu lực | (1); lỗ ở đơn Đối tác (mục 3, T2a) |
| Sự kiện | không có kho sự kiện riêng: nhật ký chỉ-thêm + dòng điều chỉnh (QĐ C05) | (2) |
| Giao dịch có kiểm soát | route → `can()` → luật → một `db.batch()` | (1); thiếu khoá phiên bản ở xác nhận/huỷ HDV (T1b, T1d) |
| Trạng thái bền | D1, trigger chỉ đi tiến | (1) |
| Luật / chính sách | `rules.ts` từng module, MATRIX quyền; pricing chưa có (ADR-0024) | (1)/(4) |
| Hình chiếu | view `v_*`, Trang chủ, biên nhận (dựng ở trình duyệt — ADR-0026 sẽ sửa) | (2)/(3) (Trang chủ đọc ngược chiều — T3a) |
| Quyết định · Vận hành | bỏ khỏi chữ (QĐ C01 — chủ đã chọn) | (2) |

## 2. Phát hiện hội tụ (≥ 2 người rà cùng thấy)
- **H1 — `orders` đọc view `v_dsp_order_handler`** (orders/repository.ts:478): vòng orders⇄dispatch ở tầng SQL, trái ADR-0006 đ8, ADR-0007 đ4(a), `ALLOWED_EDGES`, Hiến chương 5.3; lọt vì `orders` LEGACY; đặc tả đơn tự do (dòng 156) định làm thêm một chỗ y hệt. [dữ liệu #18, chỗ đặt A1]
- **H2 — cửa `legacy: true` mở cho bảng mới:** test không khoá danh sách bảng cũ của ADR-0002 điều 2; `order_money_adjustment` (0021) lọt qua, cờ tắt mọi kiểm ADR-0003 (nên CASCADE, thiếu cột WHO lọt theo). [dữ liệu #14, chỗ đặt (5)1]
- **H3 — số tiền dẫn xuất chưa có "đúng một hàm":** tổng/còn lại ở 3 hàm; thành tiền nhân tay ở 6 chỗ; `subtotal = Σ line_total` chỉ ở mã (không trigger, không trong audit-invariants); sau điều chỉnh, cột tiền đã lưu đứng yên và không có cột/hàm "phải thu hiện hành" được nêu tên (ADR-0026:56 trỏ một cột không tồn tại). [đường ghi A4 + phần tiền, chỗ đặt A3, dữ liệu #16]
- **H4 — tài liệu tự khai quá tay** (§17 và bảng thi hành Phần I). [cả ba]
- **H5 — định danh Tour Đảo nhiều chỗ:** `company_profile` (chưa là hồ sơ), `pty_organization` có cột pháp lý, `public/login.html:44` chép cứng tên + MST; chưa quyết nguồn duy nhất (ADR-0024 để ngỏ). [dữ liệu #28, chỗ đặt K3]

## 3. Gói "dọn nền trước sổ công nợ" (nhóm A) — cần chủ duyệt

**Lưu ý loại việc:** mục có ghi **[lệch ADR đã duyệt]** là mã đang trái một quyết định đã duyệt ⇒ theo `CLAUDE.md` §2 là lỗi, sửa mã, không cần quyết định mới về nguyên tắc; vẫn là việc lớn (dữ liệu/tiền/quyền) ⇒ kế hoạch + người kiểm độc lập. Mục còn lại cần chủ duyệt cách làm.

**T1 — Tiền một nguồn**
- **T1a** Một hàm cho mỗi số tiền (H3): `buildLines` sinh sẵn `lineTotal`; một hàm tổng/còn lại ở `shared/` cho cả máy chủ và web; ADR-0026 nêu tên đúng MỘT hàm "phải thu hiện hành" và sửa dòng 56; ghi chú/đưa cột tiền đứng yên vào `deprecatedColumns`; thêm kiểm `subtotal = Σ line_total` vào audit-invariants (rẻ).
- **T1b** Xác nhận gắn phiên bản: thêm `expectedUpdatedAt` vào lệnh xác nhận và điều kiện `updated_at` vào `confirmOrder` (web/order.ts:343; orders/repository.ts:698-703). Lý do: chủ đã chọn chụp chính sách "lúc Xác nhận" (H5), ADR-0024–0026 gắn sổ vào mốc này. [đường ghi A1]
- **T1c** Route HDV sửa số khách (`POST …/handler-money-edit`, đang chạy):
  - (i) **Cờ "chênh với tiền đã thu" cho Kế toán** — **[ADR đã duyệt đòi, chưa làm]**: ADR-0007 điều 2(c) và ADR-0014 điều 6 (Cấp hẹp FIELD) đòi "tiền tự tính lại ở máy chủ và mọi chênh lệch với tổng đã thu được đánh dấu cho ACCOUNTING" như một bất biến của đường sửa sau xác nhận. **Nơi ghi cờ chưa có** — sổ công nợ/lần thu đang soạn ở ADR-0026 (proposed; người rà dữ liệu xếp #24 ngăn 4). ⇒ Chủ chọn: làm cờ tạm ngay (vd một dòng đánh dấu cho Kế toán khi tổng mới < tiền cọc đã thu), hay chờ ADR-0026. Liên quan việc mở ở `docs/CHANGE-GUIDE.md` §4 mục 32 (luật "chặn còn lại âm" đã gỡ).
  - (ii) Kiểm lại đơn còn `confirmed` và người gọi còn phụ trách **ngay trong câu ghi** (hiện chỉ kiểm trước, không nguyên tử; không trigger đòi `confirmed`) — sửa lỗi tranh chấp, không cần quyết định mới.
  ADR-0023 sẽ mở rộng đường này. [đường ghi A3; dữ liệu #24]
- **T1d** Huỷ của HDV: thêm `updated_at` vào điều kiện huỷ (orders/repository.ts:719) — hoặc sửa chú thích đang khẳng định có khoá (dispatch/index.ts:163; orders/index.ts:61, 88) — trước ADR-0030 (mở huỷ cho đơn chưa chốt). [đường ghi A5]
- **T1e** Chống gửi trùng: duyệt đặc tả nháp `2026-09-22-chong-gui-trung.md` (lập đơn, hồ sơ); ADR-0026 thêm điều khoản lặp an toàn cho "lần thu" (hiện không có). [đường ghi A2, (5)1]

**T2 — Đơn phải biết ai đặt**
- **T2a** Đơn Đối tác: máy chủ từ chối tạo hồ sơ khách mới (`newBooker`) từ tài khoản có quyền Đối tác cho tới GĐ4a **[lệch ADR đã duyệt: ADR-0001 mục 8, ADR-0018 đ10 — đọc mã, chưa chạy thử]**; làm GĐ4a (bên đặt = hồ sơ đối tác) trước lượt 1, hoặc ADR-0026 ghi luật bù tất định "đơn do tài khoản Đối tác lập → bên đặt = hồ sơ của người lập". Không làm thì lượt 1 coi đơn đối tác là đơn khách lẻ ⇒ khoá "Đã giao" với hoa hồng 0; dữ liệu sai hình tăng theo mỗi đơn đối tác. [dữ liệu #17, #23]
- **T2b** Định danh Tour Đảo một nơi (H5): chủ quyết trong ADR-0024 nơi giữ tên/MST/địa chỉ; nơi kia (và trang đăng nhập) đọc qua hàm/view.

**T3 — Ranh giới và sổ sách dữ liệu**
- **T3a** Bỏ việc `orders` đọc view của `dispatch` (H1): đưa câu đếm sang hàm công bố của `dispatch` hoặc tiêm qua `ctx`; ADR-0030 không lặp lại. **[lệch ADR đã duyệt: ADR-0006 đ8 — "`orders` … không có SQL đọc bảng `dsp_*`; việc `orders` cần biết … đi qua hàm do `dispatch` cung cấp"; ADR-0007 đ4 và phần "phương án đã loại" (vòng); Hiến chương 5.3]** Ghi chú minh bạch: đặc tả Trang chủ `2026-09-23-trang-chu-moi-design.md` §4 cho là hợp lệ theo quy tắc chung "đọc xuyên module qua view công bố"; đặc tả đó **không ghi dòng trạng thái duyệt**, còn tệp quyết định của chủ (`…-quyet-dinh.md`) để ngỏ "đặt ở module nào"; theo thứ bậc `CLAUDE.md` §2 (ADR trên đặc tả), ADR-0006 đ8 cụ thể hơn và thắng. Chủ xác nhận khi duyệt gói.
- **T3b** Khoá danh sách bảng `legacy` trong test = danh sách ADR-0002 điều 2 + một ngoại lệ có tên (H2); đăng ký tiền tố `ord_` (Q-AA đã chốt 26/9). Là siết — AI đề xuất được.
- **T3c** `orders` còn LEGACY quá "hạn trước N2" mà không có còi: đưa hạn vào `docs/quyen-hoan.json`, lập lộ trình lên STRICT; làm `audit.wonGuardSql()` (ADR-0002 đ4) trước khi `billing` (STRICT) cần khuôn đó. [chỗ đặt A2, A4]
- **T3d** Lý do gõ chữ tự do đi thẳng vào nhật ký chỉ-thêm, không lọc SĐT/email/MST (lỡ ghi thì không gỡ được): danh sách lý do đóng (hướng ADR-0023) hoặc lọc ở máy chủ + dòng sổ hàng rào. [dữ liệu #19]
- **T3e** Sổ dữ liệu thiếu nghĩa từng cột (ADR-0003 đ9): ghi nghĩa các cột mang nghĩa (`customer_*`, `booker_party_id`, cột tiền đứng yên, `after_json`) trước sổ công nợ, hoặc chủ ghi lệch đ9. [dữ liệu #20]
- **Có điều kiện (B → A):** số khách hiện hành chỉ nằm trong JSON `after_json` (SQL/báo cáo không đọc được) — quyết JSON có lược đồ hay bảng dòng có kiểu **trước ADR-0023 lượt 2**. [dữ liệu #15]

## 4. Để sau (nhóm B)
- Đường ghi: `/unlock` ghi nhật ký ngoài lô; ghi đè giá danh mục không khoá lạc quan; 5 hành động "sửa" thiếu trước→sau (sửa đơn nháp — tiền/cọc, hồ sơ, địa điểm, bỏ ghi đè giá, đổi người xử lý Góp ý); `POST …/status` đọc thân trước `can()` (chưa ghi gì); `POST /api/parties` gửi lặp → 2 hồ sơ; Turnstile không đối chiếu `hostname`; chưa có kiểm "mỗi dòng `order_money_adjustment` có đúng một dòng `audit_log` cùng id".
- Dữ liệu: tên/SĐT khách trên `orders` là ảnh chụp có chủ ý nhưng là dữ liệu khách duy nhất khi đơn không gắn hồ sơ (đo tỉ lệ `booker_party_id` NULL); luật giá Đối tác xét theo quyền tài khoản, không theo bên đặt (ADR-0029 che tạm, chưa nêu điều 2.3); giá ghi đè lưu JSON, không lịch sử có kiểu; `stf_permission`, `stf_permission_adjustment`, `aut_passkey` không có trigger chống chồng lấn khoảng (ADR-0003 đ7); B5 (`staff.party_id` còn NULL được); N2 lát 2; hai định nghĩa "đang hiệu lực" (ADR mới chọn một quy ước — khuyến nghị nửa mở).
- Chỗ đặt: **web tự định nghĩa lại cổng quản trị** (`hasPermission("ADMIN")` ở 8 chỗ, khác `ADMIN_GATE` — đây là gốc của lệch nút bảo trì `web/account.ts:329`); máy trạng thái đơn chép sang `shared/order-view.ts`; định dạng giờ VN tự làm ở web (`web/feedback.ts:21` không ép múi giờ); LEGACY không lối ra cho `accounts`, `audit`; không bài kiểm nào kiểm cạnh trong thân VIEW; tệp luật miền ở `src/shared/` không ghi module chủ (rủi ro đường tính chiết khấu thứ hai khi làm pricing).

## 5. Đã chọn có ý thức (nhóm C)
Bảng tên cũ không tiền tố, cột chết `staff.role/full_name` (ADR-0002, ADR-0005); xoá cứng/CASCADE ở bảng cũ; `audit` là sink đọc view nhãn (ADR-0002 đ6); đơn vị tính là chuỗi Sheet; đồng bộ danh mục chia lô (upsert tự lành, giá đã chụp vào đơn); đổi vai hai lô (R22); nhóm tự phục vụ `/api/account/*` (ngoại lệ ADR-0019); hai GET có ghi phụ; `scripts/staff-lib.mjs` là cửa khẩn cấp ghi tài khoản không nhật ký (chưa có tên ở bảng thi hành 1.2); `tram.ts` + đuôi `.ts` ở web (tự khai §16, chờ chủ); K1 chia 3 module (ADR-0002); biên nhận dựng ở trình duyệt (ADR-0026 sẽ sửa); sáu QĐ rời chuẩn Oracle có ý thức (C01, C03, C04, C05, C14, M02 — xem báo cáo rà luật gốc).

## 6. Tài liệu nói khác mã
- **§17 (tài liệu mô tả — sửa tài liệu):** đầu mục ghi "main eec8d18, bản 1.13"; K16 "Bảng tin CHƯA gộp main, CHƯA phát hành" (đã phát hành 1.16); K1 thiếu `accounts`, B5; K2 bỏ sót bên đặt đối tác, `CUSTOMER_OF`, gộp hồ sơ; K7/K8/K12 "đạt" dù có ngoại lệ (unlock, đổi vai hai lô, đồng bộ chia lô, thiếu trước→sau, status đọc thân trước; K8 bỏ sót khuôn `changes()`); K10 xếp `catalog_override` là chính sách; K13 bỏ sót cột tiền đứng yên; K14 thiếu nhập Sheet nhân viên; K15 "đạt" (sai vì H1). §5 cũng cũ (7 quyền không phải 6; thiếu `aut_passkey`, `order_money_adjustment`, migration 0020–0023).
- **Bảng thi hành Phần I (chuẩn tắc — ĐỀ XUẤT cho chủ, không tự sửa):** 5.4 "Lệch: —" (sai — H3); 5.3 không nêu vòng SQL orders→dispatch và LEGACY quá hạn; 1.2 "Lệch: —" (unlock, chia lô, đổi vai, 2 GET có ghi, `staff-lib.mjs`); 5.1 thêm "`subtotal = Σ` chỉ ở mã" và ADR-0029; 2.3 chưa nêu ADR-0029; 5.5 thiếu hai chỗ xoá cứng ở module LEGACY và CASCADE; 5.12 thiếu các chỗ thiếu trước→sau; 5.10 ghi "dựa vào kỷ luật" nhưng `bang-tin-guard.test.ts` đã thấy chặn 26/9 (nâng lên); K4/5.8 còn ghi "chưa theo route GET" dù luật (1b) đã có và thấy chặn 26/9; 2.1/5.3 "Cưỡng chế bằng `architecture.test.ts`" nhưng sổ hàng rào ghi "chưa ghi nhận" chặn thật ⇒ hạ xuống "dựa vào kỷ luật" (trừ KHONG_DB); thiếu dòng cho 2.4, 4.1, 4.3, 4.5, 5.2 (6.2 đòi mỗi điều một dòng; 4.1/4.5/5.2 đang lệch thật).
- **Tệp luật khác (đề xuất):** Phần II — sơ đồ tầng thiếu `bangtin`, quy tắc 2 ghi 4 cổng (mã có 5 cổng tường minh); `src/CLAUDE.md` liệt 12 module, thiếu hạng KHONG_DB; chú thích mã huỷ HDV (T1d).
- **Ghi chú cho người soạn ADR-0030:** đặc tả đơn tự do §11 nói ADR-0019 "chưa thi công" — nay đã lên production (bản 1.18); đặc tả §6 dòng 156 định lặp lại H1 — không làm.

## 7. Chủ dự án quyết
1. **Duyệt gói "dọn nền trước sổ công nợ" (mục 3: T1–T3), làm TRƯỚC lượt 1 Hoàn tất.** Khuyến nghị: có — lập kế hoạch rồi thi công như việc lớn (người kiểm độc lập). Các mục **[lệch ADR đã duyệt]** (T2a phần chặn — đọc mã, chưa chạy thử; T3a) và T1c(ii) là sửa lỗi; T1c(i) là **ADR đã duyệt đòi nhưng chưa có nơi ghi** — chủ chọn làm cờ tạm hay chờ ADR-0026; các mục còn lại (T1b, T1e, T2a phần GĐ4a/luật bù, T2b, T3d, T3e) cần chủ chọn cách khi trình kế hoạch.
2. **Sửa tài liệu:** AI tự sửa §17 và §5 (tài liệu mô tả, thua mã); soạn đề xuất sửa bảng thi hành Phần I, Phần II, `src/CLAUDE.md` (chủ duyệt, N9).
3. **(Tuỳ chọn) Đo dữ liệu thật trước khi làm T2a/T3d:** năm truy vấn chỉ đọc ở Phụ lục A (đơn đối tác chưa gắn bên đặt, hồ sơ CUSTOMER do Đối tác tạo, SĐT trùng, tài khoản chưa gắn hồ sơ, nhật ký có dãy số giống SĐT). **Chưa chạy thử trên máy** — AI thử trên D1 cục bộ trước khi đưa chủ chạy trên hệ thống thật.

## 8. Không kiểm
Dữ liệu production (không truy vấn remote); e2e, kịch bản Chrome, typecheck (người rà không chạy; điều phối chạy `npm test` 938/938); các kết luận tranh chấp (T1b, T1c, T1d) và luồng đối tác (T2a) suy từ đọc mã/SQL, chưa chạy thử; `web/`, `scripts/` rà bằng grep theo mẫu; nhánh chưa gộp; `docs/Ref/` (TCA gốc) không có trong git. Dọn dẹp (không thuộc Oracle): 10 tệp `AUDIT-*`/`HANDOFF-*` ở tầng ngoài `docs/`.

---

## Phụ lục A — Người rà dữ liệu (tóm tắt báo cáo gốc)


Mã ở nhánh ra-soat-luat-goc (= main dc4b4f9). `node --test src/architecture.test.ts` 23/23. Không sửa tệp.

### Tổng kết
- Bản thể đúng triết lý đã chọn: Bên → vai có hiệu lực → tài khoản → quyền; bảng chỉ-thêm; tiền số nguyên; giá một nguồn. Lệch dồn vào **mối nối đơn hàng ↔ Bên và ↔ tiền** — đúng nơi sổ công nợ sắp đặt lên.
- Đếm: (1) 4 · (2) 9 · (3) 9 · (4) 5 · (5) 2 · (+) 4 — 33 dòng.
- Kiểm kê 34 bảng + 6 view: parties `pty_` (K2 ~ HZ_PARTIES/CONTACT_POINTS/party usage/RELATIONSHIPS), staff `stf_` + `staff` cũ (K1/K4), auth `aut_` + `login_attempt` cũ (K1), locations `loc_` (K3 — nơi dịch vụ), dispatch `dsp_` (vai theo ngữ cảnh trên đơn), orders LEGACY (`orders`, `order_service`, `order_item` cũ; `order_money_adjustment` 0021 KHÔNG có trong ADR-0002:15; view `v_ord_order_label`; bảng không có tiền tố đăng ký — `ord` chỉ ở VIEW_PREFIX), catalog LEGACY (K11/K14), audit LEGACY (`audit_log`, K12), company (`company_profile`, K3 pháp nhân chưa là Bên), maintenance `mnt_`, feedback `fbk_`, bangtin KHONG_DB (K16). `bil_` đã đăng ký (chưa có bảng); `prc_` chưa (ADR-0024 proposed).

### Nhóm A (sửa trước sổ công nợ; đúng cho cả hai hướng: tự làm sổ hay để pmbh giữ sổ)
- **#23 (ngăn 4) + #17 (ngăn 3) — Đơn Đối tác:** đơn do Đối tác lập chưa ghi Đối tác làm "bên đặt" (đã quyết GĐ4a — ADR-0018:39-41, đặc tả vai — chưa làm); tài khoản Đối tác tạo hồ sơ khách không qua danh sách trùng SĐT (tra cứu 403 vì ngoài OFFICE_GATE nhưng UI vẫn hiện "Tạo hồ sơ mới" — web/booker-picker.ts:61-66; parties/index.ts:168-169; orders/service.ts:72-82), hồ sơ nhận vai CUSTOMER của Tour Đảo — trái ADR-0001 mục 8, ADR-0018 đ10 (**đọc mã, chưa chạy thử**). Lượt 1 tìm "người hưởng" qua `booker_party_id` ⇒ đơn đối tác hôm nay bị coi là đơn khách lẻ: "Đã giao" khoá được với hoa hồng 0; dữ liệu sai hình tăng theo mỗi đơn đối tác. Sửa: máy chủ từ chối `newBooker` từ tài khoản `holdsPartner` tới GĐ4a; làm GĐ4a trước lượt 1, hoặc ADR-0026 ghi backfill tất định (đơn do tài khoản Đối tác lập → bên đặt = `staff.party_id` người lập).
- **#16 (3) — cột tiền đã lưu không phải số hiện hành:** sau điều chỉnh, `orders.subtotal/total/remaining_amount` đứng yên (trigger 0007 chỉ canh các cột này); `subtotal_before/after` không ai đọc, dòng lịch sử có thể sai (R-ORD-6a/6b chỉ "warn"); ADR-0026:56 viết "số đã lưu (sau điều chỉnh)" — không có cột đó. Sửa: `deprecatedColumns` + ghi chú; bài kiểm cấm đọc `subtotal_*`; ADR-0026 nêu tên đúng MỘT hàm "phải thu hiện hành" (ADR-0025:83), sửa dòng 56.
- **#15 (3; B, lên A nếu ADR-0023 lượt 2 thêm/bớt dịch vụ qua bảng này) — số khách hiện hành** chỉ nằm trong JSON `after_json`, đọc bằng hàm "bỏ qua phần hỏng" (money-adjustment.ts:60-73); SQL/báo cáo không đọc được; lệch 4.1/5.2 chưa ghi. Quyết trước ADR-0023 lượt 2: JSON có lược đồ (ghi lệch) hay bảng dòng có kiểu.
- **#14 (3) — cờ `legacy` tự khai cho bảng MỚI:** 0021 mang `legacy:true` dù không trong ADR-0002:15; sổ ghi sai "tên cũ (ADR-0002 điều 2)"; cờ tắt bài kiểm bảng mới ⇒ #8 lọt; danh sách legacy không bị khoá (data-dictionary.json:110-115; architecture.test.ts:172-180, 213-236). Sửa: khoá danh sách legacy trong test = ADR-0002:15 + một ngoại lệ có tên (siết). Khác Q-AA (Q-AA chỉ chọn tiền tố).
- **#20 (3) — sổ dữ liệu không có nghĩa từng cột** (chỉ tên/module/loại/legacy; ADR-0003 đ9 đòi mô tả, khoá, bất biến, cách kiểm; CLAUDE.md §6 trỏ "từng cột" tới đó). Sửa trước sổ: ghi chú các cột mang nghĩa (`customer_*`, `booker_party_id`, cột tiền đứng yên, `after_json`), hoặc chủ ghi lệch đ9.
- **#18 (3) — `orders` đọc `v_dsp_order_handler`** (Trang chủ, orders/repository.ts:478) — ngược chiều phụ thuộc, trái ADR-0007 đ4(a) (phương án đã loại vì tạo vòng); `orders` LEGACY nên bài EXPLAIN không bắt; đặc tả đơn tự do (dòng 156) đề xuất nhân bản kiểu này. Sửa: chuyển câu đếm sang hàm công bố của `dispatch` hoặc tiêm qua ctx; ADR-0030 không lặp lại.
- **#19 (3) — lý do gõ chữ tự do vào `audit_log` chỉ-thêm** không lọc SĐT/email/MST (HDV sửa số khách: ô 300 ký tự, máy chủ không giới hạn — web/account.ts:353, money-adjustment.ts:86, orders/repository.ts:906; lý do chỉnh quyền accounts/index.ts:357, 571); trigger 0017 cấm sửa/xoá ⇒ lỡ ghi SĐT thì không gỡ được. Sửa: danh sách lý do đóng (hướng ADR-0023) hoặc lọc ở máy chủ + dòng SO-HANG-RAO.
- **#28 (5) — chưa quyết nguồn duy nhất cho tên/MST/địa chỉ Tour Đảo:** ADR-0024 tạo hồ sơ nhưng giữ `company_profile`; `pty_organization` cũng có cột pháp lý; biên nhận đọc `company`, sổ trỏ hồ sơ. Chủ quyết trong ADR-0024: một nơi giữ, nơi kia đọc qua hàm/view.
- Liên quan (2/A): #7 Tour Đảo chưa là hồ sơ (`company_profile` không `party_id`) — làm trong lượt 1; #8 `order_money_adjustment` ON DELETE CASCADE, không cột WHO — chủ chọn cách xử lý khi lượt 1 thêm trigger chặn INSERT (ADR-0025:56); #12 khoá tiền đơn đã xác nhận + ba luật ADR-0027 chỉ ở mã — trigger khoá của ADR-0025; #24 (4) trả dư/chênh lệch chưa có chỗ ghi, `deposit_method` CHECK liệt kê tập mở — đã trong ADR-0026; #25 (4) tiền tố `ord_` — Q-AA đã chốt, làm cùng #14.

### Nhóm B
##5 (2) tên/SĐT khách trên `orders` là "bản chụp lúc đặt" có chủ ý (0018:4; đặc tả N2 lát 1; ADR-0011:18) — đơn không gắn hồ sơ thì đây là dữ liệu khách duy nhất: ghi nghĩa cột vào sổ, đo tỉ lệ `booker_party_id` NULL. #13 (2) luật giá Đối tác xét theo quyền tài khoản (`holdsPartner`) không theo bên đặt — trái 2.3, ADR-0029 đ2 che tạm (ghi lệch 5.8, không nêu 2.3). #21 (3) `catalog_override` giá ghi đè JSON, ghi đè tại chỗ, bỏ = xoá cứng — không lịch sử giá có kiểu. #22 (3) `stf_permission`, `stf_permission_adjustment`, `aut_passkey` có khoảng hiệu lực nhưng không trigger chống chồng lấn (ADR-0003 đ7 "bắt buộc") — chỉ `dsp_assignment` được ghi lệch. #26 (4) B5: `staff.party_id` còn NULL được; trigger giữ quản trị viên cuối chưa có. #27 (4) N2 lát 2 (backfill đơn cũ, gộp hồ sơ `merged_into_id`, bắt buộc người đặt, `traveller_party_id`) — ADR riêng, không chặn lượt 1. #29 (5) chưa có định nghĩa duy nhất "vai hiệu lực ngày X" (quyền/LC dùng "đang mở"; danh sách hồ sơ dùng [từ, đến] cả hai đầu; vị từ đóng ADR-0003 buộc "mở lại" dòng đã đóng cùng ngày) — ADR mới chọn một quy ước (khuyến nghị nửa mở như R-DSP-3).

### Nhóm C (đã chọn có ý thức)
##6 bảng tên cũ không tiền tố + cột chết `staff.role/full_name` (ADR-0002, ADR-0005); #9 xoá cứng/CASCADE cũ (xoá–chèn lại dòng đơn nháp, bỏ ghi đè = DELETE, `login_attempt`, CASCADE `order_item`/`order_service`); #10 `audit` đọc view nhãn dù `ALLOWED_EDGES.audit=[]`; #11 đơn vị tính là chuỗi Sheet (`perPax`/`perNPax`), chưa bảng tra cứu.

### Đạt (ngăn 1)
##1 người–vai–tài khoản–quyền tách lớp (0011, 0012, 0024; LC-1/LC-3 trigger + R-LC; route quyền cũ từ chối tài khoản đã có vai); #2 tiền INTEGER, dẫn xuất ở máy chủ, trigger giữ công thức, một hàm tính lại dịch vụ đã lưu; #3 danh mục/giá một nguồn (Sheet → `catalog_item`, `in_sheet=0` thay xoá; `toEffective` một hàm; đơn chụp tên/đơn vị/giá lúc lập; địa điểm là danh mục, ADR-0008); #4 nhật ký chỉ-thêm và trạng thái đơn chỉ đi tiến ở CSDL (0017).

### (+) Tài liệu nói khác mã
##30 §17 (SYSTEM-DESIGN.md:800–819): ghi "bản 1.13, eec8d18"; K16 "Bảng tin CHƯA gộp main" (main đã có); K1/K2 "đạt" bỏ sót B5, bên đặt đối tác, `CUSTOMER_OF`, gộp hồ sơ; K10 xếp `catalog_override` là chính sách; K13 bỏ sót #16; K15 "đạt" dù có #18 — sửa tài liệu. #31 Phần I dòng 2.1 "Cưỡng chế bằng architecture.test.ts" — bài kiểm không chặn được một bảng "danh sách khách" riêng có tiền tố → ĐỀ XUẤT hạ "dựa vào kỷ luật". #32 Phần I thiếu dòng cho 2.4, 4.1, 4.3, 4.5, 5.2 (6.2 đòi mỗi điều một dòng; 4.1/4.5/5.2 đang lệch thật) → ĐỀ XUẤT thêm. #33 cột "Lệch hiện có" thiếu: 5.4 (#16), 5.3 (#18, #10), 4.2/5.5 (CASCADE, #14), 5.1 và 2.3 (ADR-0029) → ĐỀ XUẤT cập nhật.

### Truy vấn chỉ đọc chủ có thể tự chạy (không in SĐT)
- Đơn đối tác và số chưa gắn bên đặt: `SELECT count(*), sum(o.booker_party_id IS NULL) FROM orders o WHERE EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id=o.staff_id AND p.permission_type_code='PARTNER')`
- Hồ sơ CUSTOMER do tài khoản Đối tác tạo: `SELECT count(*) FROM pty_party_role r WHERE r.role_type_code='CUSTOMER' AND EXISTS (SELECT 1 FROM stf_permission p WHERE p.staff_id=r.created_by AND p.permission_type_code='PARTNER')`
- SĐT trùng giữa các hồ sơ: `SELECT count(*) FROM (SELECT value_normalized FROM pty_contact_point WHERE contact_kind_code='PHONE' AND valid_to_date IS NULL GROUP BY value_normalized HAVING count(DISTINCT party_id)>1)`
- Tài khoản chưa gắn hồ sơ: `SELECT count(*) FROM staff WHERE party_id IS NULL`
- Nhật ký lý do có dãy số giống SĐT: `SELECT count(*) FROM audit_log WHERE action='order_money_adjusted_by_field' AND detail GLOB '*[0-9][0-9][0-9][0-9][0-9][0-9][0-9][0-9]*'`
(cộng `node scripts/audit-invariants.mjs --db remote`, `npx wrangler d1 migrations list tourdao-sales-db --remote`). Người rà chưa kiểm tên cột/bảng bằng chạy thật — cần thử local trước khi chủ chạy remote.

### Không kiểm được
Số liệu production; `npm test` đủ bộ, typecheck, e2e, Chrome; luồng đối tác #17/#23 chỉ đọc mã; ADR đọc một phần; `docs/Ref/` (TCA gốc) không có trong git.

Phụ lục (dọn dẹp): SYSTEM-DESIGN §5 cũ (dòng 200 "6 quyền" — thực 7; dòng 210 mô tả sai `v_pty_open_role_group`; thiếu `aut_passkey`, `order_money_adjustment`, migration 0020–0023; ghi 0018, 0024 "CHƯA lên production").

## Phụ lục B — Người rà đường ghi (tóm tắt báo cáo gốc)


### Tổng kết
- 45 route ghi (POST/PUT/PATCH/DELETE; grep `route("` ngoài index.ts: không có route khác) + 2 GET có ghi phụ + 7 tích hợp/tác nhân.
- Đếm theo route: (1) 26 · (2) 9 · (3) 8 · (4) 1 · (5) 1; thêm 3 điểm (5) xuyên suốt và 9 khẳng định (+) tài liệu/chú thích nói khác mã.
- Test chỉ đọc: architecture.test.ts 23/23, route-write-guard.test.ts 9/9; gộp 4 tệp (thêm buildlines-guard, permission-enforcement) 37/37 xanh.
- Nhận định: khuôn "lệnh → can() → một db.batch() → nhật ký cùng lô" đã thành nếp; mọi route ghi sau cổng hỏi bảng quyền; 42/45 route ghi dữ liệu + nhật ký trong đúng một lô. Chỗ hở không ở quyền mà ở: phiên bản & lặp an toàn; lớp CSDL cho tiền; trước→sau trong nhật ký; tài liệu tự khai "đạt".
- Trong app KHÔNG có AI (không binding AI, không gọi API mô hình). Tác nhân tự động duy nhất: Cron danh mục (ngoại lệ ADR-0010 đ3).

### Nhóm A — nên sửa trước khi sổ công nợ vào
1. **A1 Xác nhận không gắn phiên bản:** trình duyệt chỉ gửi `{status}` (web/order.ts:343); `confirmOrder` không có `updated_at` trong WHERE (orders/repository.ts:698-703). Chủ đã chọn chụp chính sách "lúc Xác nhận" (H5); ADR-0024–0026 sẽ gắn chụp/sổ vào mốc này ⇒ thêm `expectedUpdatedAt`.
2. **A2 Không có lặp an toàn** cho lập đơn/hồ sơ (chỉ đặc tả nháp specs/2026-09-22-chong-gui-trung.md chờ chủ); ADR-0026 không có điều khoản lặp an toàn cho "lần thu".
3. **A3 Route HDV sửa số khách** (`POST …/handler-money-edit`): thiếu cờ "chênh với tiền đã thu" cho Kế toán mà ADR-0007 đ2c và ADR-0014 đ6 (accepted) đòi; câu INSERT không kiểm lại đơn còn `confirmed`/còn phụ trách; không trigger đòi `confirmed`. ADR-0023 sẽ mở rộng đường này.
4. **A4 `subtotal = Σ line_total`** chỉ có ở mã: không trigger (0007:29 tự ghi bỏ qua), không có trong audit-invariants ⇒ thêm một kiểm R-ORD (rẻ).
5. **A5 Huỷ của HDV** (`POST …/handler-cancel`): `cancelOrder` chỉ `WHERE id = ? AND status = ?` (orders/repository.ts:719) trong khi chú thích (dispatch/index.ts:163; orders/index.ts:61, 88) khẳng định khoá theo `updated_at` ⇒ thêm điều kiện hoặc sửa chú thích trước ADR-0030 (mở huỷ cho đơn chưa chốt). Lưu ý ADR-0030: `audit_log` chỉ có `detail` chữ tự do — đếm "Từ chối"/nhãn "Aborted" từ nhật ký là đọc chữ tự do (đặc tả đã tự nêu "căng với 4.1").

### Nhóm B — để sau
`POST /api/staff/:id/unlock` xoá bộ đếm rồi `.run()` nhật ký riêng (accounts/index.ts:643-644) — ngoài lô; PATCH /api/catalog/:code ghi đè giá không khoá lạc quan (ghi sau thắng); 5 hành động "sửa" thiếu trước→sau (sửa đơn nháp — tiền/cọc; sửa hồ sơ parties/index.ts:240; sửa địa điểm; bỏ ghi đè giá; đổi người xử lý Góp ý); `POST …/status` đọc thân (:327) trước `can()` (:332) (chưa ghi gì; huỷ ở văn phòng không đòi lý do); `POST /api/parties` gửi lặp → 2 hồ sơ; Turnstile không đối chiếu `hostname`/`action` (auth/turnstile.ts:83-88).

### Nhóm C — đã chọn có ý thức
Đồng bộ danh mục chia lô 40 câu, nhật ký chỉ ở lô cuối (catalog/repository.ts:106-146) — upsert tự lành, giá đã chụp vào `order_item`; đổi vai hai lô khi gỡ Quản trị (ruling R22, plans/2026-09-24-mo-hinh-vai-gd0-gd1.md:48); nhóm tự phục vụ `/api/account/*` (ngoại lệ vĩnh viễn ADR-0019, cổng thay = PIN/Face ID); Cron là tác nhân hệ thống (ADR-0010 đ3); hai GET có ghi phụ (GET /api/catalog đồng bộ lần đầu — catalog/index.ts:87; GET /api/feedback/:id ghi "đã xem" — feedback/index.ts:138).

### Tiền (Hiến chương 5.4)
- Đạt: subtotal/total/remaining tính ở máy chủ (orders/rules.ts:92-128); đơn giá thoả thuận, giảm giá, cọc là đầu vào có kiểm; trigger 0007 giữ phép tính của số đã lưu (line_total = q×p; total = subtotal − discount; remaining = total − deposit ≥ 0).
- Hở: `subtotal = Σ line_total` (A4).
- Một phần: total/remaining có hai hàm (rules.ts:101,128 và `effectiveMoney` money-adjustment.ts:223 cho số hiệu lực không lưu, không trigger); `buildlines-guard` chỉ canh nguồn đơn giá của buildLines.

### (4) Đã quyết/đang soạn, chưa làm
ADR-0025 (khoá "Đã giao" bằng trigger, khoá lạc quan chống bấm hai lần); ADR-0026 (sổ công nợ, lần thu, ReceiptDto); ADR-0023; ADR-0020; ADR-0030 (lý do huỷ bắt buộc, Từ chối); đặc tả "khoá tiền đơn đã xác nhận" bước B; đặc tả nháp chống gửi trùng (chờ chủ).

### (5) Không quyết, không kế hoạch
1. Lặp an toàn cho "lần thu" (ADR-0026 không có điều khoản; đặc tả chống gửi trùng chỉ phủ lập đơn dù tự ghi "phải có trước N3") — A.
2. Turnstile không đối chiếu hostname — B.
3. Chưa có kiểm bất biến "mỗi dòng order_money_adjustment có đúng một dòng audit_log cùng id" (cơ chế truy vết 5.5 đã chọn) — B.

### (+) Tài liệu/chú thích nói khác mã
1. §17 đầu mục và K16 (SYSTEM-DESIGN.md:800, 819): ghi "bản 1.13", "Bảng tin CHƯA gộp main, CHƯA phát hành" — thực tế đã phát hành 1.16 (9e0fb88).
2. §17 K7, K8, K12 ghi "đạt" dù có ngoại lệ (unlock, đổi vai hai lô, đồng bộ chia lô, 5 hành động thiếu trước→sau, status đọc thân trước).
3–8. Bảng thi hành Phần I (ĐỀ XUẤT cho chủ): 1.2 "Lệch: —" → ghi 3 nợ + 2 GET có ghi; 5.4 "Lệch: —" → hàng rào chỉ canh nguồn đơn giá, hai hàm total/remaining, số hiệu lực không lưới CSDL; 5.1 thêm "subtotal = Σ chỉ ở mã"; 5.10 ghi "dựa vào kỷ luật" nhưng đã có bang-tin-guard.test.ts (SO-HANG-RAO dòng 47, thấy chặn 26/9) → cập nhật mạnh hơn; 5.5 thiếu hai chỗ xoá cứng ở module LEGACY (catalog_override; xoá–chèn lại dòng của đơn nháp orders/repository.ts:678-680) → nợ có tên; 5.12 thiếu các chỗ ◐ trước→sau.
9. Chú thích mã dispatch/index.ts:163, orders/index.ts:61, 88: khẳng định khoá updated_at cho huỷ HDV, mã chỉ so status.

### Không kiểm được
Dữ liệu production (không chạy audit-invariants remote); e2e (A1, A3, A5 suy từ SQL, chưa chạy đua thật); dịch vụ thật (Email, Turnstile, DO); giao diện ngoài web/order.ts:343; nội dung luật trong rules.ts.

## Phụ lục C — Người rà chỗ đặt (tóm tắt báo cáo gốc)


Nhánh ra-soat-luat-goc (mã = main dc4b4f9, bản 1.18). Không sửa tệp. `node --test src/architecture.test.ts` 23/23; `buildlines-guard.test.ts` 2/2.

### Tổng kết
- Khung đúng hướng Oracle: 13 module chia theo miền; đồ thị phụ thuộc KHAI BÁO một chiều, không vòng. Nhưng máy chỉ chứng "đúng chỗ" cho 8 module STRICT + bangtin; 4 module LEGACY ngoài kiểm SQL — trong đó `orders` (lõi đơn/tiền) đang giấu một vòng phụ thuộc thật.
- Đếm: (1) 7 · (2) 9 · (3) 8 · (4) 6 · (5) 4 · (+) 6 (+ 2 dòng "tệp luật, chỉ đề xuất").

### Nặng nhất
- **A1 (3)** `orders` đọc view `v_dsp_order_handler` (orders/repository.ts:478) ⇒ vòng dispatch⇄orders ở tầng SQL; trái Hiến chương 5.3 ("kể cả ở tầng SQL"), ADR-0006 điều 8, ALLOWED_EDGES; lọt vì `orders` LEGACY; đặc tả Trang chủ (2026-09-23-trang-chu-moi-design.md:55) cho là hợp lệ, văn bản quyết định (…-quyet-dinh.md:22) để ngỏ; không ai duyệt lệch. Đặc tả đơn tự do §6 (dòng 156) định làm thêm một chỗ y hệt.
- **A2 (2, quá hạn)** `orders` còn LEGACY quá "hạn trước N2" (đặc tả N1:213; N2 vào main 21–22/9 — be25da6, 10a23c2); hạn này không có trong quyen-hoan.json ⇒ không test nào đỏ. Hệ quả: tiêu chí ADR-0024 điều 4 ("bài kiểm 8(b) của orders/billing không thấy câu nào của orders chạm bil_*") không kiểm bằng máy được.
- **A3 (3)** Hiến chương 5.4 ("mỗi số dẫn xuất đúng một hàm") mới phủ `buildLines`: "tổng / còn lại" ở 3 hàm (orders/rules.ts:101,128; money-adjustment.ts:223-225; shared/service-form.ts:390-394); "thành tiền = SL × đơn giá" nhân tay ở 6 chỗ (service-rules.ts:210; money-adjustment.ts:28,123; service-form.ts:284,331; web/service-card.ts:173) vì `GeneratedLine` không có `lineTotal` (order-lines.ts:60-73); tổng từng dịch vụ tự cộng ở order-view.ts:62, order-confirmation.ts:187. Sửa: `buildLines` sinh sẵn `lineTotal`; một hàm tổng/còn lại ở shared cho máy chủ + web.
- **A4 (4)** ADR-0024 điều 4 định dùng khuôn `wonGuard` qua `audit_log` cho billing; billing STRICT tự viết `EXISTS … audit_log` sẽ bị 8(b) chặn (architecture.test.ts:301); `audit.wonGuardSql()` (ADR-0002 điều 4) chưa có.
- **B1 (3)** Web tự định nghĩa lại cổng "quản trị": `hasPermission("ADMIN")` ở 8 chỗ (web/shell.ts:333; account.ts:42,43,329; audit.ts:109; catalog.ts:219; locations.ts:142; parties.ts:325; + shared/dashboard-review.ts:44 tự ghi nhận lệch :41-43) — khác `ADMIN_GATE`/`can("admin.manage")`. (Đây là gốc của lệch nút bảo trì web/account.ts:329.)
- **C1 (3)** `scripts/staff-lib.mjs:40-45` là đường ghi tài khoản thứ hai, không ghi nhật ký ("cửa khẩn cấp" có ý thức, chưa có tên ở bảng thi hành 1.2).

### Module (architecture.test.ts:18-62)
accounts LEGACY ("chuyển STRICT khi có SQL mới" — không thể: không sở hữu bảng, STRICT đòi ≥1 defineSql, KHONG_DB cấm .batch ⇒ không lối ra); audit LEGACY (sink, đọc 4 view — ADR-0002 điều 6; lên STRICT sẽ đỏ vì vòng); auth STRICT; bangtin KHONG_DB (tram.ts chỉ src/index.ts:24 nạp); catalog LEGACY (11 câu SQL chỉ chạm catalog_* — lên STRICT được ngay); company STRICT; dispatch STRICT (cạnh staff không có trong ADR-0006 điều 8); feedback STRICT; locations STRICT; maintenance STRICT (cạnh auth/accounts→maintenance chỉ ở Phần II, không ADR); orders LEGACY (A1, A2); parties STRICT; staff STRICT (`v_stf_staff_label` JOIN thẳng pty_party — nợ đã ghi N1:213). Đồ thị thật tính cả SQL có hai vòng: orders⇄dispatch (không quyết định) và audit⇄{staff, parties, locations, orders} qua view (ADR-0002 điều 6 cho phép). Thân trigger đều trong module.

### K1–K16 — nơi sống thật
K1 staff+auth+accounts (ADR-0002) + staff-lib.mjs (3); K2 parties (1); K3 company, locations; tên + MST chép cứng public/login.html:44 (3); K4 shared/permissions.ts một chỗ ở máy chủ, web dựng lại (3), cấp bậc ở staff/rules.ts:10 (2); K5 máy trạng thái đơn chép 2 chỗ (orders/rules.ts:155-163 + shared/order-view.ts:83-88) (3); K6 biên nhận dựng ở trình duyệt (2, ADR-0026 sẽ sửa); K7 (1); K8 hai khuôn wonGuard / changes()>0 (4, ADR-0002 điều 4); K9 chưa có "giữ" (4); K10 catalog + chụp giá (2, ADR-0029); K11 (1); K12 (1); K13 chưa sổ, công thức rải (4)+(3); K14 (1); K15 đọc ngược chiều (3)=A1; K16 (1).

### (5) Lỗ thật
1. **A** Cửa `legacy: true` mở cho bảng mới: test chỉ đòi "không tiền tố ⇒ phải đánh dấu legacy" (architecture.test.ts:153-161), không khoá danh sách 10 bảng cũ ADR-0002 điều 2; `order_money_adjustment` (0021) lọt qua, cờ tắt mọi kiểm ADR-0003; bảng mới của orders ở §9A đặc tả đơn tự do có thể lọt tiếp nếu chưa có `ord_`.
2. **B** LEGACY không lối ra cho accounts, audit; hạn LEGACY không nằm trong quyen-hoan.json ⇒ không còi.
3. **B** Không bài kiểm nào kiểm cạnh trong thân VIEW (ADR-0024 điều 5 chỉ thêm kiểm thân trigger).
4. **B** Tệp luật miền ở src/shared/ không ghi module chủ (luật orders, feedback, maintenance, bangtin); pricing sắp tới chưa có quy ước "luật chiết khấu xem trước ở web thuộc đâu" ⇒ nguy cơ đường tính thứ hai (5.4).

### (3) khác (B/C)
Máy trạng thái đơn chép sang order-view.ts (B); login.html:44 chép tên + MST (B — chủ quyết nội dung 97b2f22, chép tĩnh là lựa chọn thi công); định dạng giờ VN tự làm ở web (web/format.ts:21, audit.ts:43,47, home.ts:265; feedback.ts:21 không ép múi giờ) (B); tram.ts + đuôi .ts ở web (tự khai §16, chưa duyệt) (C).

### (4) Đã quyết, chưa làm
A4 audit.wonGuardSql(); ADR-0024 (pricing/billing/receipt, KHONG_BANG, luật thân trigger, v_ord_order_state); ADR-0025/0026; Hiến chương 5.7 "giữ đối tượng" (chờ ADR áp); ADR-0030/0031 và Q-AA (tiền tố ord_); Q-A2 (nhãn "Nháp" → "Chờ xác nhận").

### (+) Tài liệu nói khác mã
§17 K16 "CHƯA gộp main, CHƯA phát hành" (main có 6051058; changelog 1.16); §17 K15 "đạt" (sai vì A1), K8 bỏ sót khuôn changes(); §17 đầu mục "main eec8d18, bản 1.13", K1 thiếu accounts, K14 thiếu nhập Sheet nhân viên; bảng thi hành 5.4 "Lệch: —" (sai, A3); 5.3 không nêu vòng SQL orders→dispatch và LEGACY quá hạn; 1.2 không nêu staff-lib.mjs; K4/5.8 (ARCHITECTURE.md:144) còn ghi "chưa theo route GET" dù luật (1b) đã có và thấy chặn 26/9 (SO-HANG-RAO.md:12). Chỉ đề xuất cho chủ: 5.3/2.1 "Cưỡng chế bằng architecture.test.ts" nhưng SO-HANG-RAO.md:29 ghi "Chưa ghi nhận" chặn thật (trừ KHONG_DB đã thấy chặn 26/9); Phần II sơ đồ tầng thiếu bangtin, quy tắc 2 ghi 4 cổng (mã có 5 cổng tường minh — permissions.ts:118-122, router.ts:173-175); src/CLAUDE.md liệt 12 module, thiếu KHONG_DB. Ghi chú cho ADR-0030: đặc tả đơn tự do §11 nói ADR-0019 "chưa thi công" — main đã có phần B.

### Cây thư mục
src/index.ts gốc lắp ráp (đúng tầng); src/modules/ 13 miền, nền (parties, locations, staff, auth) → nghiệp vụ (orders, catalog, dispatch) → audit là sink; src/shared/ 34 tệp thuần trộn hạ tầng lõi + luật miền dùng chung với web + mô hình màn hình (không ghi module chủ); src/*.test.ts hàng rào xuyên module; web/ chỉ import shared (máy kiểm) nhưng còn vài luật tự dựng lại; public/ trang tĩnh + token CSS, chép cứng định danh công ty; migrations/ chỉ-thêm (0019 để dành B5); tests/ e2e + redteam (ngoài bài kiểm kiến trúc); scripts/ công cụ (staff-lib.mjs ghi dữ liệu); golden/ sổ vàng (5.17); docs/; playbook/ bản chép Hiến pháp chỉ-đọc.

### Không kiểm được
Production/dữ liệu thật; npm test đủ bộ, typecheck, e2e; hành vi trigger chỉ đọc bằng mắt; nhánh chưa gộp, MPF; web/ và scripts/ rà bằng grep theo mẫu; biên bản duyệt cho các cạnh maintenance, feedback, dispatch→staff.

Phụ lục (không thuộc Oracle): 10 tệp AUDIT-*/HANDOFF-* ở tầng ngoài docs/.
