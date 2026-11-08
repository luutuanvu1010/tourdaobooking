# Nhật ký thi công ADR-0184 — kế hoạch: docs/superpowers/plans/2026-11-07-adr-0184-thi-cong.md

Nhánh `claude/adr-0184-thi-cong`, tách từ `main` 5f641781 (đã có ADR-0184 và ADR-0180 «Xem như vai khác»). Trạng thái sống ở bảng việc của kế hoạch; tệp này ghi phán quyết, câu trả lời của chủ, mốc từng việc, nợ.

## Câu trả lời của chủ (chat 2026-11-07)

- «thi công ADR-0184».
- Ba câu hỏi chữ giao diện, chủ chọn cả ba phương án khuyến nghị: nút «Cho chạy dù thiếu giấy tờ»; nhãn vàng «Xe thiếu <giấy> — đã cho chạy»; lý do «Giấy đang gia hạn / Xe thay thế khẩn cấp / Khác (gõ rõ ít nhất 10 chữ cái)».
- Ba câu hỏi hành vi người dùng thấy (hỏi trước khi giao việc 3–5), chủ chọn cả ba phương án khuyến nghị: cho chạy **từng loại giấy** (P4); ghi chú «Khác» **chỉ lưu ở chuyến**, không vào nhật ký hệ thống (P5); **chưa cần** nút rút lại sự cho phép — ghi `docs/BACKLOG.md` ở việc 6.

## Câu trả lời của chủ (chat 2026-11-08, sau kiểm độc lập lượt 1)

- «Ai xử lý» khi xe thiếu Kiểm định / Bảo hiểm (câu hỏi nêu rõ ADR và ca vàng 16/10 ghi «Quản trị», điều phối đã lỡ làm «Toàn quyền»): chủ tự gõ **«Quản trị và toàn quyền»** — thay P3 (xem P10).
- Chữ thẻ Trang chủ: giữ **«Xem chuyến»** (nút) và **«Xe chạy hôm nay dù thiếu giấy tờ»** (dòng phụ) — hai chữ trợ lý đặt nay là chữ chủ chọn.
- Lý do và ghi chú khi cho chạy: **«Có, làm luôn lần này»** — hiện dưới nhãn vàng ở chi tiết chuyến cho văn phòng, không vào nhật ký (xem P12).

## Phán quyết

P1–P8 ghi ở mục «Phán quyết của điều phối» của kế hoạch (một nơi). Cái giá nếu sai:
- P1 (bảng cho phép riêng thay giá trị `DAT_PHA_LE`): nếu chủ muốn đúng chữ ADR thì phải thêm một migration dựng lại bảng bản chụp — tốn, rủi ro trên CSDL thật; dữ liệu đã ghi theo P1 vẫn đọc được.
- P2 (ô `trip.override.giay_to_cung`): nếu chủ muốn dùng chung `trip.override` thì không thực hiện được lựa chọn D2 của chủ.
- P4 (cho phép từng loại): nếu chủ muốn «một lần cho tất cả» thì giao diện chỉ cần chọn sẵn mọi loại; máy chủ giữ nguyên.
- P5 (ghi chú không vào nhật ký): nếu chủ muốn thấy ghi chú trong nhật ký, thêm vào chi tiết nhật ký sau — chiều ngược lại (gỡ chữ đã ghi) không làm được.

Phán quyết thêm ngày 2026-11-08 (sau kiểm độc lập lượt 1):
- **P10 — thay P3 theo lời chủ:** lý do giữ của xe thiếu Kiểm định / Bảo hiểm hiện «Ai xử lý: Quản trị, Toàn quyền» (cách ghép bằng dấu phẩy như chỗ đang ghép nhiều người xử lý); bốn loại giấy kia vẫn «Quản trị»; chuyến có cả hai loại thì chữ ghép không lặp tên. Vẫn trong tập đóng «ai xử lý» (không chữ tự do). Hai ca vàng B23, VC-12 đổi kỳ vọng và chữ đáp án, ghi lời chủ + ngày 2026-11-08. Cái giá nếu sai: đổi lại một nhãn, không đụng quyền (nhãn không quyết ai bấm được nút nào).
- **P11 — sửa thẳng migration 0147** (chưa có trên `main`, chưa áp production) để trigger so cả loại giấy của điều kiện (lỗi L1 của người kiểm), thay vì thêm migration mới. Cái giá nếu sai: máy nào đã áp 0147 cũ ở D1 local phải dựng lại D1 local; production không ảnh hưởng.
- **P12 — lý do + ghi chú ở chi tiết chuyến:** chỉ DTO chi tiết chuyến của văn phòng (`GET /api/van-chuyen/chuyen/:id` và các lệnh trả cùng DTO), gom theo lô cho phép, đúng những dòng cho phép đang tạo nhãn vàng. Không vào DTO tài xế, lịch chung Điều phối xe, tin, Bảng tin, nhật ký. Cái giá nếu sai: bỏ một khối hiện ra màn.

## Mốc

- Việc 1 — xong `0bb96c3d` (≈ 10 phút). Migration 0147 đúng kế hoạch; 15 bài CSDL xanh; năm phép phá mỗi phép làm đúng một bài đỏ rồi hoàn nguyên (2026-11-07). Khác kế hoạch: `created_by` để NULL được (bài ADR-0003 cấm cột WHO NOT NULL), trigger dùng `NOT EXISTS` nên người ghi NULL không lọt — chấp nhận.
  - **Chờ chủ duyệt (gộp vào báo cáo cuối):** `src/architecture.test.ts` thêm cạnh `van-chuyen → staff` và view `v_stf_toan_quyen` vào danh sách view trigger Vận chuyển được đọc. Đây là nới hàng rào (Điều 9.4) dù đi đúng lối «đọc xuyên module qua view công bố». Không duyệt thì đổi sang: máy chủ chặn + R-VC-17 bắt sau (trigger không còn biết ai là Toàn quyền).

- Việc 2 — xong `699e9901` (≈ 9 phút). Chữ ký cuối: `docChung` đọc một lần mọi dòng cho phép chưa dùng của chuyến `PLANNED` (dòng hiếm), `choPhepCuaChuyen(chung, tripId)` lọc; `LichChungVao.choPhepThieu` bắt buộc. Mẫu vàng B23 (thiếu Bảo hiểm) và VC-12 (Kiểm định hết hạn) đổi kỳ vọng sang mã giữ `DIEU_KIEN_GIAY_TO_XE_TOAN_QUYEN` — đúng P3, người kiểm xem lại.
  - **P9 (điều phối, 7/11):** luật chuyển khách giữa hai xe (`src/shared/chuyen-khach.ts`, dòng kiểm `GIAY_TO_DICH`) KHÔNG nối dòng cho phép: chuyển khách sang xe thiếu giấy tờ vẫn bị chặn như cũ, kể cả xe đang chạy nhờ «Cho chạy dù thiếu giấy tờ». Lý do: ADR ghi hiệu lực «một chuyến, một lần xuất bến — không "xe này được miễn"»; nhận thêm khách là rủi ro mới. Hành vi người dùng không đổi so với hôm nay. Cái giá nếu sai: một lệnh nhỏ nối thêm sau.

- Việc 3 — xong `40e46b64` (mã + bài, 14 bài route) và `3377ecf6` (e2e `cho-chay-thieu-giay`: 5 bước, 4/4 xanh, một lần) (≈ 22 phút). Ba phép phá ở máy chủ làm đỏ đúng chỗ; bài 403/400 thường vẫn xanh khi gỡ lớp máy chủ vì trigger 0147 bắt — đúng thiết kế hai lớp, có bài riêng gỡ trigger.
  - **Chủ quyết (chat 2026-11-08): CÓ báo tài xế** («Có, báo tài xế»). Kế hoạch ghi «không gửi tin» bị thay; trợ lý việc 3 đã mở hai ngoại lệ QT1 (bài quét `baoThayDoiChuyen` + mục `CHO_LECH` `N-CHO-CHAY-THIEU` khai nhầm `DA_DUYET`) — giao gỡ cả hai, làm tin cho tài xế đang giao theo QT1.
  - Sửa thêm `8a7fce7c` (≈ 5 phút): gỡ hai ngoại lệ QT1; tài xế đang giao nhận tin loại mới `cho_chay_thieu` («Chuyến <mã>: Xe thiếu <tên loại> — đã cho chạy»); Bảng tin dùng loại có sẵn `sua`; tên loại giấy cho tin đọc theo `cmd_id` của dòng cho phép (chỉ tên, không số, không ghi chú). e2e chạy lại 4/4 xanh.
  - **Chờ chủ duyệt (gộp báo cáo cuối):** `lop-vuot.test.ts` nới N3 — route mới hỏi thẳng ô `trip.override` (không qua tầng hạn chốt 6 giờ). Hệ quả trực tiếp của ADR (trang ghép dùng lại `trip.override` cho bốn loại giấy).
  - Phát sinh nhỏ đã chấp nhận: số lý do trong `chinh-sach-route.test.ts` 44 → 47 (từ migration 0147); `trip_departure_waived` xếp vào danh sách ẩn của lịch sử đơn (nhật ký `trip_*` không lộ cho Đối tác); sinh lại `tro-ly-cau-truc.ts`.

- Việc 4 — xong `1108e402` (DTO `giayToThieu`, `choChayThieu`; hàm đọc `choChayThieuDaDung(db, tripIds)` ở `chuyen-repo.ts`, `choChayThieuDangAp` ở `dieu-phoi-dto.ts`; nút ở «Cần xử lý»; dòng nhật ký chuyến) và `ac60bca1` (màn chi tiết chuyến, Điều phối xe, CSS, bảng tham chiếu, `chuyen-smoke` 16 bước xanh có `AXE_JS`, 5 ảnh) (≈ 50 phút, phần lớn là kịch bản Chrome). Điều phối đã sửa lại lần lưu cuối để bỏ 19 ảnh phụ (≈ 5 MB) của bước cũ và của kịch bản vốn đỏ, chỉ giữ 5 ảnh `adr0184-*`.
  - `chinh-sach-dieu-phoi-smoke` đỏ 6/14 **từ trước** việc này (thanh bên, chữ «Đang áp dụng», quyền xem chính sách) — không sửa ở đây, ghi nợ; chỉ thêm nhóm lý do mới vào danh sách kỳ vọng.
  - Điều phối xem ảnh thật, thấy hai chỗ nên sửa (giao việc 5): khung «Điều kiện cho xe chạy» vẫn hiện dấu xanh ở «Giấy tờ xe» khi xe đang chạy nhờ cho phép (dễ hiểu là đủ giấy); dòng nhật ký chuyến chỉ ghi «1 loại giấy tờ», chưa có tên loại. Thêm: `dieu-phoi-smoke` dòng kỳ vọng «Ai xử lý: Quản trị» của T2 phải đổi theo P3.
  - Chữ do trợ lý viết, chờ chủ xem (gửi ảnh 8/11): hộp chọn có khung vàng «Xe <biển số> đang thiếu giấy tờ» + «Chuyến này được cho xe chạy một lần. Tài xế nhận tin báo. Nhãn vàng ở chuyến cho mọi người thấy xe chạy dù thiếu giấy.»; gợi ý ghi chú «Bắt buộc khi chọn lý do "Khác" (từ 10 ký tự). Tối đa 200 ký tự. Không ghi số giấy tờ.»; thông báo xong «Đã cho chạy dù thiếu giấy tờ <mã chuyến>».

- Việc 6 — xong `8e65dac7` (kiểm định kỳ + bài), `2839d615` (sổ hàng rào + BACKLOG mục 65), `a79e442e` (SYSTEM-DESIGN, CHANGE-GUIDE, VAN-CHUYEN) (≈ 7 phút, song song việc 5). **Mã kiểm mới là R-VC-36, không phải R-VC-17** như kế hoạch ghi: R-VC-17 đã là kiểm mốc giờ hẹn (ADR-0051), số lớn nhất lúc đó R-VC-35. Ba phép phá câu R-VC-36 đỏ rồi hoàn nguyên (2026-11-08). R-VC-36 xét Toàn quyền HIỆN TẠI của người ghi (người mất quyền sau đó cũng bị báo, mức `warn`); D1 chưa áp 0147 thì «no such table» → thoát mã 2 — đúng khuôn các bảng mới khác, `npm run trien-khai` chạy kiểm SAU khi áp migration nên không vướng.
  - Sổ hàng rào có ba dòng mới: trigger 0147 (2026-11-07), ô `trip.override.giay_to_cung` (2026-11-07), R-VC-36 (2026-11-08); dòng điều kiện gieo VK1-C và LC-12 đổi mô tả. Sổ ghi đúng là phần nới bài kiến trúc còn chờ chủ duyệt.

- Việc 5 — xong `bcb52833` (mã + bài), `4156f0b9` (dấu cảnh báo có `role=img`), `a3d2b451` (kịch bản Chrome + ảnh) (≈ 24 phút). Cuốc tài xế có nhãn vàng (danh sách + chi tiết, trước và sau xuất bến); thẻ Trang chủ lấy số từ route mới `GET /api/van-chuyen/cho-chay-thieu/dem` (cổng office, chỉ người có ô `trip.override`), dùng đúng hai hàm đọc của nhãn nên số khớp nhãn; ô «Giấy tờ xe» hiện vàng khi đã cho chạy; nhật ký chuyến có tên loại. Chrome có `AXE_JS`: `cuoc-smoke` 19 bước xanh, `chuyen-smoke` 16 bước xanh, kịch bản riêng `trang-chu-the-smoke.mjs` xanh (số trên thẻ là trả lời giả tiêm vào trang; số thật do bài route kiểm; khối «Đang chờ bạn» chỉ có ở máy tính nên chỉ có ảnh 1040).
  - Kịch bản cũ đỏ TỪ TRƯỚC (không do nhánh này): `dieu-phoi-smoke` đỏ từ dòng 62 (menu Vận chuyển ở thanh bên rỗng; bước 3, 4, 5, 7, 8) — dòng 73 đã đổi kỳ vọng theo P3 nhưng chưa xác minh được bằng chính kịch bản đó (`chuyen-smoke` kiểm cùng khẳng định); hai bản `trang-chu-smoke.mjs` đỏ trước chỗ thêm bước. `cuoc-smoke` có hai chỗ đỏ cũ đã sửa (Quản trị lập đơn thay Bán hàng; tab thứ tư «Hỗ trợ»).
  - Hai bài đỏ do việc 3 để sót (trợ lý việc 5 phát hiện): `src/hanh-khach-khong-lo-ten.test.ts` thiếu ca cho route mới; `src/bang-tu-giao-dien.test.ts` bắt chữ «xuất bến» ở mô tả ô quyền (`tro-ly-cau-truc-ten.ts`, tệp máy sinh `tro-ly-cau-truc.ts`). Giao trợ lý việc 5 sửa, rồi chạy `npm test` + e2e đầy đủ một lần.
  - **Người kiểm cần xét:** route đếm hỏi quyền qua hàm `thaySoChoChayThieu` (ở `src/shared/cho-chay-thieu-giay.ts`) vì bài NT-3(b) của `lop-vuot.test.ts` cấm chuỗi `"trip.override"` mới trong tệp Vận chuyển. Một luật «ai thấy số» ở một chỗ (thẻ và route cùng dùng) là đúng khuôn, nhưng lý do trợ lý nêu là tránh bài quét — cần người kiểm xem có phải lách hàng rào không.
  - Chữ do trợ lý đặt: nút «Xem chuyến» và dòng phụ «Xe chạy hôm nay dù thiếu giấy tờ» trên thẻ Trang chủ («Chuyến hôm nay» bị bảng từ cấm nên đổi) — **chủ chọn giữ cả hai (8/11)**.
  - Đợt cuối `8e6a53bbf`: sửa tám bài đỏ của bộ kiểm đầy đủ (gồm hai bài trên), bỏ chữ «xuất bến» ở chữ người dùng thấy («cho xe chạy», «được chạy»). e2e đầy đủ đang chạy lúc ghi dòng này.

- Kiểm độc lập lượt 1 (việc 1–4, 6; HEAD `a79e442ed`) — **CHƯA ĐẠT: Cao 0, Trung 2, Thấp 7** (báo cáo trong thư mục nháp của phiên, `adr0184-kiem-doc-lap.md`). Người kiểm tự chạy lại 514 bài liên quan + typecheck, tự làm 5 + 3 + 1 phép phá đã khai, thêm phép phá của riêng mình.
  - T1: vế «đúng chuyến» của dòng cho phép không có bài canh ở cả trigger lẫn máy chủ (bỏ cả hai vế: 97 bài vẫn xanh, xe chạy được chuyến khác nhờ cho phép của chuyến trước); dòng sổ hàng rào 0147 ghi «khớp chuyến» quá điều đã thấy.
  - T2: P3 lệch tiêu chí 1 của ADR và ca vàng VC-12 → hỏi chủ, chủ quyết P10.
  - Thấp: L1 trigger + R-VC-36 không so loại giấy của điều kiện; L2 NT-3 không đếm ô `trip.override.giay_to_cung`; L3 thiếu ca đổi xe đi đường lệnh thật; L4 bảng tham chiếu thiếu dòng nhãn vàng, ba lý do, câu «hoàn tác» chưa đúng hẳn; L5 sai đường tệp ở sổ hàng rào; L6 câu báo «tối đa 200» nhưng cổng đầu nhận 2000; L7 lý do + ghi chú lưu mà không ai xem được → chủ quyết làm luôn (P12).
  - Người kiểm chỉ ra cạnh kiến trúc `van-chuyen → staff` rộng hơn lời chú thích «chỉ trigger» (cho cả `import ../staff` và đọc mọi view `v_stf_*`) — đề nghị kèm một bài siết.
- Đợt sửa 1 (giao sau khi e2e của việc 5 xong): T1, P10, P11 (L1), L2–L7 với P12, bài siết cho cạnh kiến trúc; gộp thêm phát hiện của kiểm độc lập lượt 2 (việc 5 + đợt cuối, đang chạy) nếu kịp. Sau đó chạy lại `npm test`, typecheck, e2e, ba kịch bản Chrome một lần; kiểm độc lập lượt 3 theo dải sửa.

## Nợ (không chặn phát hành)

- Chưa có nút «bỏ cho phép» trước giờ chạy.
- Đổi xe rồi đổi về xe cũ: dòng cho phép cũ áp lại (Trọng tâm 3).
- Rủi ro pháp lý Kiểm định / Bảo hiểm: ADR ghi «cần luật sư xác nhận»; chủ đã nghe và chọn D1=b.
