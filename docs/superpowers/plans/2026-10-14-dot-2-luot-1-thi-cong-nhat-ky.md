# Đợt 2 lượt 1 — Bật/tắt đưa đón theo nhóm và điểm chọn nhanh: Nhật ký thi công

> Sổ điều phối của người thi công (CLAUDE.md §9). Kế hoạch: `docs/superpowers/plans/2026-10-14-dot-2-luot-1-ke-hoach.md`; quyết định: `docs/adr/ADR-0118-bat-tat-dua-don-theo-nhom-va-diem-chon-nhanh.md` (accepted 2026-10-14 — thắng khi lệch). Người thi công KHÔNG tự nghiệm thu: Task 7 do người kiểm độc lập (phiên khác, chỉ đọc).

## Task 0 — Điều kiện (14/10/2026)
- **Chủ đã duyệt ADR-0118** (chat 2026-10-14: «duyệt ADR-0118», phương án A cả ba quyết định Đợt 2). ADR đã ở `docs/adr/` và `docs/adr/README.md` đã có dòng mục lục 0118 — không cần thêm.
- **Nhánh:** worktree `agent-a5efc1907cfeb6e57`, dựng trên commit `4c38b7e5` (= `main` bản 1.96 + ADR-0118 + kế hoạch).
- **Nền xanh trước khi sửa:** `npm run typecheck` 0 lỗi. `npm test` bước 1 (bộ kiểm chính, 513 tệp) **xanh: 4711 đạt, 0 đỏ**. Bước 2 (bài đo giờ của hook `src/claude-guard-thoi-gian.test.ts`) **đỏ giả**: «quá chậm: lần nhanh nhất 2099 ms CPU» — máy đang chạy nhiều phiên song song; không nới ngưỡng, chạy lại khi máy rảnh (kết quả ghi ở mục «Chạy lại cuối» bên dưới).
- **Số migration = 0098.** `ls migrations` dừng ở `0095`; quét mọi nhánh (`git log --all --name-only -- migrations/`) thấy lớn nhất là `0096_muc_ta_bang_moi.sql` (nhánh `claude/phan-loai-dai-ly-hoa-hong-66d076`); `0096`–`0097` đã giữ cho ADR-0117 lần 2 ⇒ lấy **0098**: `migrations/0098_dua_don_theo_nhom_va_diem_nhanh.sql`. Phiên phát hành kiểm lại số này (nếu ADR-0117 lần 2 hoặc nhánh khác lên `main` trước) trước khi áp.
- **Xây trên lỗ đang hở:** đọc `docs/quyen-hoan.json` ngày 2026-10-14: TNV-G1/G3/G4, HC-4.2, HC-5.19 (hạn 2026-10-31), HC-5.11 (hạn 2026-11-15). Lượt này **không ghi tiền, không đụng `billing`/`hoan-tat-repo.ts`, không tạo bút toán, không đụng Cron** ⇒ **không xây trên lỗ nào**. Cần người kiểm xác nhận bằng diff (không thấy tệp nào của các vùng đó trong danh sách tệp đổi).
- **Câu đếm chỉ-đọc trên D1 thật: KHÔNG chạy** (lệnh `wrangler d1 execute --remote` bị cấm với AI). **Chủ chạy trước phát hành** (xem lệnh ở báo cáo cuối). Migration gieo bằng `UPDATE … WHERE code = …` nên an toàn nếu thiếu mã (bài N-3 đã kiểm).

## Ruling (người thi công tự ra; chủ đọc khi duyệt)

| # | Quyết gì | Vì sao | Giá phải trả nếu sai |
|---|---|---|---|
| R-A | Số migration **0098** | 0096–0097 giữ cho ADR-0117 lần 2 (lời điều phối) | Đổi tên tệp + sửa một dòng ở bài migration; chưa áp remote nên rẻ |
| R-B | View `v_ctl_service_transfer` coi **nhóm đã ngưng dùng (`active = 0`) như Chưa phân loại → 1**, CÙNG luật với `nhomChoForm` (form) | Nếu view chỉ `COALESCE(g.transfer_enabled, 1)` thì dịch vụ ở nhóm ngưng dùng + cờ 0 làm máy chủ chặn trong khi form (đã coi là Chưa phân loại) vẫn hiện khối đưa đón ⇒ người dùng bị chặn oan. Luật ADR-0058 cấm tắt nhóm còn dịch vụ nên tình huống chỉ xảy ra với dữ liệu sửa tay; đáp án rõ ràng cho cả hai nơi | Nếu chủ muốn nhóm ngưng dùng vẫn giữ cờ: sửa một dòng CASE của view bằng migration sau + một dòng ở `choPhepDuaDon` |
| R-C | Tên nhóm trong câu lỗi lấy qua **hàm công bố của `catalog`** (`tenNhomHienHanh`, qua `catalog/index.ts`), còn **cổng** (có chặn hay không) đọc từ view đúng ADR Đ2 | ADR chốt view chỉ hai cột `(catalog_code, transfer_enabled)`; thêm cột tên nhóm là lệch ADR đã duyệt. `orders → catalog` là cạnh được phép sẵn | Nếu chủ muốn view mang tên nhóm: ADR mới + migration thêm cột (view chỉ thêm, đảo được) |
| R-D | Mã lỗi `transfer_disabled` trả **HTTP 409** | Là xung đột với cấu hình hiện hành, không phải lỗi đầu vào; khớp tiền lệ `use_order_form`, `short_notice_required`. Thêm vào `LOI_409_KHONG_CU` để màn hình không đổi thành nút «Tải lại đơn» (tải lại sẽ xoá chữ đang gõ; câu máy chủ đã nói đủ việc cần làm) | Đổi 409 → 400: sửa một hằng + một dòng test |
| R-T | **Cửa ghi chặng thứ sáu: `PUT /api/orders/:id/trip`** cũng bị chốt chặn: thao tác `insert` / `update` chặng của dịch vụ nhóm tắt → 409 `transfer_disabled`; thao tác `close` và thân không đụng chặng (ghi chú, giờ khởi hành, nơi khách có mặt) vẫn qua | `keHoachChangTrip` sinh thao tác chặng (thêm chặng chiều đi, dời ngày đón khi đổi ngày đi) nên đây là đường ghi chặng; ADR Đ3(a) nói «mọi lệnh GHI chặng». Hệ quả: đơn đã xác nhận có chặng cũ ở nhóm tắt thì **đổi ngày đi** (làm dời chặng) cũng phải đóng chặng trước — đúng chữ «muốn sửa chặng thì chỉ đóng được» của ADR. **Đây là điểm cần chủ biết**: ADR liệt kê «bốn cửa» nhưng mã có thêm cửa này | Nếu chủ muốn đổi ngày đi vẫn qua: miễn trừ thao tác `update` chỉ-dời-ngày (một điều kiện ở `kiemNhomChoPhepDuaDon` + một bài) |
| R-E | **Nhánh nháp của `PUT /legs/:legId`** (`lenhSoNguoiVeNhap` — sửa số người chiều về của chặng ở đơn nháp) cũng bị chốt chặn | Vẫn là «sửa chặng» của dịch vụ nhóm tắt; để hở thì có đường ghi chặng không qua chốt | Nhẹ: người dùng nháp phải bỏ chặng trước |
| R-F | Chốt chặn XÁC NHẬN đọc cờ **trước** lô xác nhận, không nằm trong câu `UPDATE` | Đặt vào câu cần JOIN view của module khác trong `repository.ts` cũ (LEGACY, SQL thô) — nới ranh giới kiến trúc. Khe đua rất hẹp: Quản trị tắt nhóm đúng giữa lúc đọc và lúc ghi, đơn vẫn xác nhận với chặng cũ — hậu quả bằng đơn đã xác nhận có chặng cũ (vốn được phép, ADR Đ3(c)) | Siết sau bằng cờ trong câu `confirmOrder` nếu chủ muốn |
| R-G | `PUT /api/locations/:id`: khoá `quickPickOrder` **vắng = giữ giá trị đang lưu; `null` = bỏ** | `web/locations.js` cũ trong bộ nhớ đệm PWA chưa biết khoá này; nếu vắng = bỏ thì lần lưu bất kỳ sẽ lặng lẽ xoá hai điểm chọn nhanh đã gieo | Không có (hành vi chặt hơn ADR không nói) |
| R-H | Giao diện: `transferEnabled` **KHÔNG** thêm vào `CatalogService` / `ServiceDraft`; form giữ bảng `mã dịch vụ → cờ` từ `GET /api/catalog/for-order` | Tránh đụng ~mọi chỗ dựng thẻ dịch vụ / bản chụp đơn nháp; dịch vụ không còn trong danh mục (ẩn) không có cờ → mặc định cho đưa đón, máy chủ vẫn là cổng thật | Thêm cờ vào DTO bản chụp nếu sau này cần |
| R-I | **Trợ giúp Quản trị**: thêm hai câu (công tắc «Có đưa đón»; ô «Chọn nhanh (1–99)») và BỎ hai câu cũ («Bảng ở trang quản trị có thể phải kéo ngang. Việc nhiều nên làm trên máy tính.»; rút gọn câu «Số nhỏ cạnh Dịch vụ & giá…») để tổng chữ vẫn ≤ trần 21 phút (Phần chung 9 + Quản trị 21 = 30; `huong-dan.test.ts` A4) — KHÔNG nâng trần. Câu «Điều phối… khi lập đơn» được viết lại thành «ở form Tạo đơn» vì chữ «lập đơn» đẩy số đo C4 của trợ lý (`tro-ly-van-nghia.test.ts`) từ 46 lên 47 | Giữ nguyên hai bài đo (không sửa số kỳ vọng, không nới trần) | Khôi phục hai câu bỏ nếu chủ muốn, đổi lại bằng cắt chỗ khác |
| R-J | Dời `type LenhChang` lên đầu `orders/index.ts` | Bài quét `bang-su-kien-van-chuyen` (d) suy "hàm ghi đơn" theo từng khai báo cấp cao nhất; `type` đứng sau hàm trợ giúp mới bị gộp vào chunk của hàm ấy và kéo `changeLeg` vào làm `loiViTriChang` bị tính nhầm là hàm ghi đơn. Không đổi hành vi | Không có |
| R-K | Số phiên bản **1.97** và migration **0098** là số TẠM; bài `app-info.test.ts` đã ghim 1.97 | Công thức t: thêm mục đầu thì sửa chuỗi kỳ vọng cùng commit | Phiên phát hành đổi số thì sửa hai chỗ (`changelog.ts`, `app-info.test.ts`) + tên tệp migration và bài migration |

## Tiến độ (cập nhật theo từng commit)
| # | Việc | Trạng thái |
|---|---|---|
| 0 | Điều kiện, nền xanh, số migration, sổ điều phối | xong (commit đầu) |
| 1 | Migration + từ điển dữ liệu + bài migration | xong (commit b96948d5) |
| 2 | catalog: cờ «Có đưa đón» của nhóm, DTO, nhật ký | xong (commit f1a87e57) |
| 3 | orders: chốt chặn ở mọi cửa ghi chặng + xác nhận, hai hàng rào | xong (commit 67c7af02) |
| 4 | locations: `quickPickOrder` | xong (commit b8651034) |
| 5 | Giao diện: ẩn khối theo nhóm, nút chọn nhanh, công tắc nhóm, cột Chọn nhanh | xong (commit ebc17a9c); Chrome CHƯA chạy |
| 6 | Tài liệu, sổ hàng rào, nhật ký thay đổi 1.97, Trợ giúp Quản trị, e2e | xong phần viết; e2e CHƯA chạy (máy không có `.dev.vars`) |
| 7 | Người kiểm độc lập | KHÔNG phải việc của người thi công |

## Chạy lại cuối (14/10/2026, trên nhánh `worktree-agent-a5efc1907cfeb6e57`, sau Task 6)
- `npm run typecheck`: 0 lỗi.
- `npm test` bước 1 (520 tệp): **4772 đạt, 0 đỏ**, 10 bài «TODO» có sẵn từ trước (sổ vàng lớp 2 chờ Kế toán); bước 2 (bài đo giờ của hook, chạy một mình): **đạt** (lần đầu ở nền xanh đỏ giả do máy bận, lần này máy rảnh).
- `npm run build:web`: chạy được. **e2e CHƯA chạy** (máy không có `.dev.vars`, cần mạng). **Chrome CHƯA chạy** (không dựng được kịch bản ở môi trường này) ⇒ chưa có ảnh thật hai khổ.
- Hàng rào đã quan sát chặn thật (đột biến → đỏ → hoàn nguyên) ghi ở `docs/SO-HANG-RAO.md`: (A) orders không đọc bảng catalog; (B) chốt chặn ở cửa ghi chặng + xác nhận; nối dây giao diện. Riêng CHECK từng cột của migration chưa làm đột biến.
- Việc của chủ trước phát hành: chạy câu đếm chỉ-đọc trên D1 thật cho hai mã `CANG_VINPEARL`, `BEN_TAU_NHA_TRANG`; phiên phát hành xác nhận lại số migration 0098 và số phiên bản 1.97.

## Sau kiểm độc lập (14/10/2026; kết luận «ĐỦ có điều kiện», không có mục Chặn)
- **Bài hành vi cho nhánh NHÁP của `PUT /api/orders/:id/legs/:legId`** (sửa «số người chiều về», Ruling R-E): thêm bài `N-10b` ở `src/modules/orders/dua-don-nhom-tat.test.ts` (đơn nháp, nhóm tắt → 409 `transfer_disabled`, không ghi, không nhật ký; nhóm bật lại → 200). Đã quan sát: bỏ chốt ở `planPaxOverrideNhap` ⇒ `not ok 11 - N-10b …` (trước đó 14/14 bài hành vi vẫn xanh); hoàn nguyên ⇒ 15/15. Đã sửa câu đầu tệp bài và dòng sổ hàng rào (không còn ghi sai là lớp hành vi phủ nhánh nháp từ đầu).
- **Chữ hiển thị:** nhật ký thay đổi 1.97 nói đúng hai trường hợp (đơn đã xác nhận chỉ đóng được chặng; đơn nháp bỏ chặng trong form rồi mới xác nhận) — Ruling R-L, câu cũ «phải đóng chặng trước» sai cho đơn nháp. Trợ giúp Quản trị: «Chọn nhanh (1–99)» là ô nhập nên bỏ `[[ ]]` (không nâng trần chữ).

## Dựng lại trên main (28/10/2026, nhánh `claude/service-group-pickup-setup-ae4465`)

Bối cảnh: nhánh 14/10 (`claude/tour-dao-booking-audit-bc6c77`, đầu `d7495a77`) chưa từng `day-len`; main đi thêm 792 lần lưu (2.38). Chủ 28/10: «hãy rà lại để nhập … vào bản chính». Cách làm: **merge** nhánh cũ vào một nhánh dựng từ main `60aadbf9` (không rebase — AI bị chặn rebase, và merge vẫn nối thẳng từ main cho `day-len`), gỡ 14 tệp va nhau.

| # | Ruling | Lý do | Hệ quả |
|---|---|---|---|
| R-M | Dịch vụ thuộc nhóm tắt đưa đón: form ghi «Không đón» (`chonDonTheoNhom`, `src/shared/chon-nhanh.ts`) ở ba chỗ — thêm dịch vụ, nạp nháp, sau 409 `transfer_disabled` — và ở gói gửi máy chủ | ADR-0134 Đ2 (có sau 14/10) đòi mọi cửa xác nhận có lựa chọn Đón / Không đón, mà ADR-0118 Đ5 ẩn cả khối có hai nút đó ⇒ ghép nguyên văn thì dịch vụ nhóm tắt không bao giờ xác nhận được | **Ngoại lệ hẹp của ADR-0134 Đ7** («không mặc định Không đón»), chỉ khi nhóm tắt; không migration, đảo được; máy chủ không đổi. **Chờ chủ xác nhận** (ghi trong báo cáo cuối việc). Lần lưu nhập đầu gọi tên này là «R-K» (trùng R-K cũ ở bảng trên) — đổi thành R-M ở lần lưu tài liệu |
| R-N | Chốt `congNhomTatDuaDon` đặt trong `kiemCongXacNhan` (xác nhận đơn, Còn vé, Gửi đơn hai nhánh) và gọi riêng ở Gửi xác nhận; đứng TRƯỚC cổng chọn đón | Ba cửa xác nhận của ADR-0136 ra đời sau 14/10: bốn bài mới đỏ trước (200/201) | Câu báo bốn kiểu: `luu`, `sua`, `xac-nhan`, `xet-duyet` (Còn vé: người xét duyệt không sửa được nháp người khác, ADR-0135 ⇒ câu nói người lập Rút lại) |
| R-O | Số: migration `0098` → `0121`, phiên bản 1.97 → **2.39**, mục CHANGE-GUIDE z16 → z28; ADR giữ số **0118** (main bỏ trống số này cho nhánh) | max+1 lúc dựng lại; đã quét mọi nhánh chưa gộp (không nhánh nào giữ migration > 0120 hay phiên bản > 2.38) | Vẫn là số TẠM — phiên phát hành kiểm lại ở bước A.0 |
| R-P | Chữ giao diện theo bản chính (rà soát ngôn ngữ 2.19): «lượt đưa đón», nút «Bỏ lượt», trang «Dịch vụ & giá» | Câu báo của nhánh cũ còn «chặng», «màn Danh mục» | `cauNhomTatDuaDon`, `cauBoChangNhomTat`, nhật ký thay đổi, bài kiểm câu |

Kiểm kê mọi câu GHI `ord_transfer_leg` trên main 28/10 (`chang-hanh-khach-repo.ts`, `xac-nhan-repo.ts`): chèn / sửa / số người chiều về / thay — qua các cửa có chốt của nhánh cũ; đóng lượt và dấu đặt gấp — đường được phép (Đ3 c); điền ngày khi xác nhận và đổi ngày / giờ ở Còn vé — nằm SAU `kiemCongXacNhan`. Không module nào ngoài `orders` ghi bảng này.
Hàng nút «Chọn nhanh» gắn vào `cotNoiMotO` (ô nơi một ô của màn Tạo đơn 18/10), cho cả nơi đón và nơi trả; bảng «Sửa đưa đón» vẫn không có (không truyền `diemNhanh`).
Câu «Bảng ở trang quản trị có thể phải kéo ngang.» ở Trợ giúp Quản trị bị bỏ để câu công tắc «Có đưa đón» vừa trần chữ (cách nhánh cũ đã làm).

## Kiểm độc lập sau khi dựng lại (28/10/2026; kết luận «ĐẠT CÓ ĐIỀU KIỆN», không có mục HIGH)

Người kiểm độc lập (chỉ đọc, đột biến trên bản sao `git archive`) đối chiếu MỌI đường ghi `ord_transfer_leg` và mọi cửa đưa đơn sang xác nhận: tất cả có chốt hoặc là đường thoát được phép; 15 đột biến đều đỏ đúng chỗ (báo cáo đầu của người kiểm ghi «19», người kiểm tự đếm lại 15). Xử lý từng điểm:

| Điểm | Xử lý |
|---|---|
| M-1 R-M trái chữ ADR-0134 Đ7 | Ghi vào `docs/SYSTEM-DESIGN.md` §16 «LỆCH CÓ CHỦ Ý, CHỜ CHỦ XÁC NHẬN»; trình chủ trước khi gộp. Chủ bác ⇒ đổi mã + chữ nhật ký 2.39. |
| M-2 R-T: đổi ngày đi của đơn đã xác nhận bị chặn khi nhóm tắt mà đơn còn lượt (dời ngày sinh thao tác `update` chặng) | Trình chủ: giữ cách đọc chặt (Quản trị bấm Bỏ lượt trước khi dời ngày) hay cho dời ngày lượt có sẵn. Chưa đổi mã. |
| L-1 CHANGE-GUIDE §1 trỏ z16 | Sửa thành z28 (lời khai R-O «đã đổi» trước đó sai ở hàng bảng §1). |
| L-2 mô tả cửa xác nhận thiếu | `SYSTEM-DESIGN.md` (đoạn «Đưa đón theo nhóm») + CHANGE-GUIDE z28 thêm luật «cửa xác nhận mới phải có chốt»; route xác nhận MỚI quên cổng thì bài (C) không bắt — ghi «dựa vào kỷ luật». |
| L-3 chú thích R-H sai («mọi dịch vụ kể cả ẩn») | Sửa chú thích ở `web/order-form.ts` (for-order chỉ trả dịch vụ đang hiện). |
| L-4 R-O «không nhánh nào giữ migration > 0120» đã cũ | Đúng lúc dựng lại, sai từ 15:42 cùng ngày: nhánh `claude/modest-sanderson-b148ce` (ADR-0144) có `0124_ve_ho_tro_tep.sql` và tự khai nhường `0121`; phiên bản 2.39 dễ trùng với nhánh đó — nhánh gộp SAU đổi số ở bước A.0. |
| L-5 Còn vé: mốc đặt gấp đứng trước chốt nhóm tắt | **R-Q:** thêm `congNhomTatDuaDon(…, "xet-duyet")` trước khối (0) của route `quyet-dinh` — cùng thứ tự với `/status`. Bài mới viết trước, đỏ (`short_notice_required`), xanh sau sửa. |
| L-6, L-7 | Không đổi (L-6 không phải hồi quy của nhánh; L-7 đã tự khai ở sổ hàng rào). |
| L-8 phạm vi nở | Nhánh cũ kéo theo ~12 tài liệu ngoài ADR-0118 (bảng việc, prompt kiểm toán, prompt Claude Design, đặc tả «Khách có mặt», đặc tả đợt 2 giá đưa đón, tờ đối chiếu 25 ca kèm PDF 1,7 MB…). Giữ nguyên: chủ giao «rà lại để nhập … nhánh claude/tour-dao-booking-audit-bc6c77 (đầu d7495a77) vào bản chính» — hiểu là nhập cả nhánh; báo chủ để chủ biết khi nhập. |
| L-9 cắt Hướng dẫn Quản trị không khai đủ | Năm chỗ cắt gọn để vừa trần 30 phút (nghĩa giữ nguyên): câu «Bảng ở trang quản trị có thể phải kéo ngang» (đã khai ở mục «Dựng lại trên main»), câu đặt gấp, câu giấy tờ xe (bước 3), câu giấy tờ sắp hết hạn, dòng Toàn quyền xem công nợ. Mục điểm «Chọn nhanh» bước 4 là đoạn THÊM, không phải chỗ cắt (người kiểm chỉ ra 28/10). |
| e2e đỏ khi chạy đủ bộ | `dua-don-theo-nhom.mjs` gieo ZE1 TRƯỚC lần đọc danh mục đầu tiên ⇒ lần đọc đó kéo Sheet thật, đặt `in_sheet = 0` cho ZE1. Sửa: đọc một lần trước (kèm kiểm 200) rồi mới gieo. Thông điệp commit `291754d1` ghi «khuôn `dispatch.mjs`» là viện dẫn sai — `dispatch.mjs` tránh bẫy bằng cách chạy SAU `catalog.mjs` rồi gieo lại. Tái hiện đỏ khi chạy một mình, sửa xong xanh. |

### Xem giao diện trên trình duyệt (28/10/2026, người thi công; D1 tạm 127.0.0.1, đồng bộ Sheet thật, xoá sau khi xem)

- Màn «Dịch vụ & giá»: công tắc «Có đưa đón — nhóm <tên>» ở cả 14 nhóm, mặc định Bật; bấm → «Tắt».
- Form Tạo đơn, nhóm Hòn Tằm TẮT, vé SD1 gán vào nhóm: thẻ SD1 không có khối Đưa đón (khối nằm trong phần `[hidden]`, nút «Không đón» `aria-pressed=true`); vé SD4 (Chưa phân loại) có khối Đưa đón, chưa chọn. Bấm «Đón» ở SD4: chiều đi có hàng «Chọn nhanh nơi trả: Bến cảng Vinpearl, Bến tàu du lịch Nha Trang» (đúng thứ tự 1, 2), bấm nút điền ô Nơi trả; thêm chiều về: hàng «Chọn nhanh nơi đón» cùng hai nút.
- **R-M trọn vòng:** đơn chỉ có SD1 (nhóm tắt) → «Lưu, chờ xác nhận» → máy chủ lưu `pickupChoice = KHONG_DON`, 0 lượt → «Xác nhận đơn» → `POST /status` 200, đơn `confirmed`.
- Kịch bản Chrome `a2-smoke-form.mjs` (bảng `web/CLAUDE.md` cho `web/order-form.ts`): `UI SMOKE FORM OK`.
- Chưa xem trên trình duyệt: dòng báo «đã bỏ N lượt đưa đón» khi mở lại nháp cũ có lượt của nhóm vừa tắt (chỉ có bài văn bản N-19 + luật thuần canh); iPhone thật.

## Chủ quyết (28/10/2026)

Chủ dự án trả lời câu hỏi cuối việc «Bạn đồng ý cả hai cách xử lý R-M và R-T để nhập nhánh chứ?» bằng nguyên văn: «Đồng ý cả hai».
- **R-M** (form tự ghi «Không đón» cho dịch vụ thuộc nhóm đã tắt đưa đón — lệch chữ ADR-0134 Đ7): giữ như mã; dòng `docs/SYSTEM-DESIGN.md` §16 đổi sang «CHỦ GẬT ĐẦU 2026-10-28». Chữ ADR-0134 không sửa (ADR đã duyệt; theo khuôn các dòng §16 khác).
- **R-T** (đơn đã xác nhận còn lượt của nhóm tắt thì đổi ngày đi bị chặn tới khi bấm «Bỏ lượt»): giữ cách đọc chặt, không miễn trừ thao tác dời ngày. Mã không đổi.

Kiểm ngay sau câu trả lời (lệnh chỉ đọc): `main` = `origin/main` = `714fe749` (chủ đã chạy `day-len`), `npm run trien-khai` đang chạy, production còn `version 2.38`; trạng thái production ghi ở `docs/HANDOFF-N1.md` sau khi lệnh xong, từ khối tóm tắt của lệnh và lệnh chỉ đọc.
