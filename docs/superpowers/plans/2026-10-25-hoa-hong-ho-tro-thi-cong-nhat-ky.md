# Sổ điều phối — Hoa hồng + Hỗ trợ thiết kế lại (từ 25/10/2026)

Đặc tả: `docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/`. Kế hoạch: ba tệp `2026-10-25-hoa-hong-ho-tro-{1-may-chu,2-giao-dien-hoa-hong,3-giao-dien-ho-tro}.md` cùng thư mục.

## Bảng việc

| # | Việc | Xong khi | Trạng thái |
|---|---|---|---|
| 0 | Chủ duyệt hai đặc tả + đề xuất ADR; cấp số ADR, chuyển vào `docs/adr/` | chủ nói «duyệt» | ADR **xong**: ADR-0141 accepted 25/10 («duyệt đề xuất ADR»); hai đặc tả **đã duyệt** 25/10 («duyệt luôn hai đặc tả») |
| 1 | PR 1 máy chủ | PR gộp + `trien-khai` + kiểm độc lập đạt | **thi công xong 26/10**, 9/9 task; kiểm độc lập cả nhánh ĐẠT CÓ ĐIỀU KIỆN → sửa I2, m1–m3, I3 → kiểm lại ĐẠT; đã gộp `main` (chủ cho phép 26/10); npm test, typecheck, e2e 72/72 xanh. **ĐÃ LÊN PRODUCTION bản 2.33** (26/10 16:22, Worker `bf53dd8e`); nghiệm thu độc lập ĐẠT CÓ ĐIỀU KIỆN — còn chủ/Kế toán thử chỉ-đọc trên production |
| 2 | PR 2 giao diện Hoa hồng + bảng từ lượt 3 | như trên + chủ duyệt ảnh | **thi công xong 26/10** (4 đợt, mỗi đợt kiểm đạt); kiểm cả nhánh ĐẠT CÓ ĐIỀU KIỆN → sửa (R25 mục đối tác mở được, hướng dẫn Kế toán) → kiểm lại ĐẠT; npm test, typecheck, e2e 72/72, HOA HONG SMOKE OK hai khổ. Chờ chủ duyệt ảnh + `day-len` + `trien-khai` (nhật ký 2.34 tạm) |
| 3 | PR 3 giao diện Hỗ trợ + bảng từ lượt 4 | như trên + chủ duyệt ảnh | **thi công xong 27/10** (4 đợt, ba đợt đầu kiểm đạt; đợt 4 tạm dừng theo lệnh chủ rồi làm tiếp gọn — R46); kiểm cả nhánh ĐẠT CÓ ĐIỀU KIỆN (lỗ phủ kiểm giao diện, xem «Nợ PR 3»); npm test 6256/0, typecheck 0, HO TRO SMOKE OK hai khổ, e2e 72/72 (pwa sau sửa token). Chờ chủ duyệt ảnh + quyết lỗ phủ + `day-len` + `trien-khai` (nhật ký 2.35 tạm) |

## Ruling (quyết định trong lúc làm)

- R1 (25/10, chủ): Q1 = đổi họ từ hiệu lực ở mọi màn cùng nghĩa; Q2 = người gửi không thấy dòng hệ thống.
- R2 (25/10, người lập kế hoạch): bàn giao gọi hai lượt bảng từ là «lượt 1, lượt 2» của đợt này; trong `src/shared/bang-tu-giao-dien.ts` đã có lượt 1 và lượt 2 (18/10), nên ghi là **lượt 3** (hoa hồng) và **lượt 4** (hỗ trợ).
- R3 (25/10, người lập kế hoạch): bài hàng rào `o-dat-qua-noi-cong.test.ts` không nới thành «⇒»; đổi vế phải thành «route 200 và giữ `order.create`» + ca có tên Kế toán (đề xuất ADR tiêu chí 3b).
- R4 (25/10, người lập kế hoạch): bỏ ca kiểm «Đổi chồng một dòng sắp áp dụng khác» (QA1 mục 6) vì không xảy ra được — dòng cũ đang mở thì trigger chống chồng đã cấm dòng cùng khoá phía sau.

## Nợ / để sau

- «Lịch sử» của một dòng mức / một loại (cần nhật ký có mã đích; ADR-0131).
- Sự kiện đổi trạng thái / ưu tiên trong luồng hỗ trợ (cần ADR mới).
- «Đổi» cho chính sách riêng của đối tác (màn Danh bạ).
- Trùng tên «Hỗ trợ»: `BACKLOG BL-VE-TRUNG-TEN`.

## Ruling của lượt thi công PR 1 (26/10)

- R5: câu chèn Đổi dùng `INSERT … VALUES (… CASE WHEN changes() > 0 THEN ? END …)` thay `INSERT … SELECT … WHERE changes() > 0` của đặc tả A3/A4 (architecture.test chặn INSERT…SELECT trên bảng pricing có bảng con); tương đương, đã quan sát bằng phá; ghi `docs/SYSTEM-DESIGN.md` §16, chờ chủ ghi nhận.
- R6: không thêm `coTheTimDoiTac` vào GUARDS của `route-write-guard.test.ts` (sẽ nới hàng rào); route gọi `can` trực tiếp.
- R7: Task 6 làm bước quan sát đỏ thật trước khi xanh.
- R9: 10 bước đỏ của kịch bản Chrome so-dai-ly-smoke có sẵn từ 4dea95da (người kiểm chứng minh); sửa ở PR 2.
- Tiêu chí 5 ADR-0141 không đạt theo nghĩa đen: `co-the-tim-doi-tac.test.ts` không đỏ khi phá chính hàm dùng chung (bài khác đỏ thay) — báo chủ, không chặn.
- Nhật ký thay đổi: dòng nhánh lần lượt nằm ở 2.31 → 2.32 (chung với «hai chỗ lệch màn chuyến xe») → **2.33 tạm**, vì production lên 2.32 trong lúc nhánh chờ gộp (GET /api/auth/config 26/10). day-len lần đầu dừng vì main tiến; gộp main lần ba.
- Sang PR 2: không in `nguoiHuong.vai` (là mã); xét lại `CAU_CHUA_TIM_DUOC_DOI_TAC`; sửa so-dai-ly-smoke.

## Ruling của lượt thi công PR 2 (26/10)

Sổ chi tiết R10–R25 ở `.superpowers/sdd/2026-10-25-hoa-hong-ho-tro-2-giao-dien-hoa-hong/progress.md` (không theo dõi bằng git); tóm tắt:
- R15: bài trợ lý Đ6 đỏ trung gian khi sơ đồ trang co lại; xanh lại nhờ câu mở đúng sự thật ở `src/shared/tro-ly-kien-truc.ts`, không nới bài.
- R19: ô dịch vụ dùng `taoChonDichVu` (hai điều khiển) thay «một ô» của bản vẽ — chủ xem ở lượt duyệt ảnh.
- R22 → R25: mục «Đối tác có mức riêng…» ban đầu chỉ một dòng tên (mất Đổi/Ngừng mức riêng của một đối tác so với trang cũ — người kiểm cả nhánh bắt); sửa theo bản vẽ ban-2: mở từng đối tác, có số, Đổi/Ngừng.
- R23: dòng mức riêng không vừa là nút vừa chứa nút (axe); vùng chạm riêng chỉ ở điện thoại.
- R24: chữ cũ sót ở câu báo máy chủ và nhãn nhật ký «Ngừng điều khoản người bán».

## Nợ PR 2

- Bước 5 cũ của `loai-doi-tac-smoke` (hậu tố « (đối tác)» ở Danh bạ) không còn kịch bản canh.
- Kịch bản Chrome các màn đổi chữ theo Q1 (bảng giá xe, điều kiện cho xe chạy, người bán) chưa chạy lại — chỉ e2e API.
- `so-dai-ly-smoke` còn 10 bước đỏ có sẵn từ trước PR 1 (4-a/b/c, 5-a/b hai khổ).
- `src/modules/tro-ly/bang-dieu-khien-route.test.ts` thỉnh thoảng đỏ ngẫu nhiên (khoá thử trùng) — ngoài PR.
- Bước 2c của `hoa-hong-smoke` gieo dịch vụ tên dài bằng `INSERT` thẳng `catalog_item` trên D1 tạm.

## Ruling của lượt thi công PR 3 (27/10)

Sổ chi tiết R30–R46 ở `.superpowers/sdd/2026-10-25-hoa-hong-ho-tro-3-giao-dien-ho-tro/progress.md`; tóm tắt:
- R35: thẻ «Việc của nhóm» hiện cho thành viên nhóm HOẶC Toàn quyền (chữ kế hoạch «mine.length > 0» làm Toàn quyền ngoài nhóm mất hàng đợi).
- R37: bảng thống kê tuần × loại cũ thay bằng câu «Tuần này …» (kế hoạch T2); dòng «Việc của nhóm» không còn hiện loại yêu cầu (đúng bản vẽ).
- R38: bộ lọc mặc định «Chưa ai nhận» theo bản vẽ; nhãn huy hiệu «N yêu cầu chưa đọc».
- R39: chip trạng thái / ưu tiên / người xử lý mở hộp trượt (2 lần bấm).
- R43: cột «Phụ trách» ở bảng nhóm là mô tả nhóm (bản vẽ).
- R46 (chủ chê chậm): bảy kịch bản cũ chỉ ghi «thay bằng ho-tro-smoke» (không chuyển bước, không chạy lại); bộ kiểm dài chạy một lần.
- Lệch chữ ADR-0066 điều 6 («xem Trợ giúp» → «xem Hướng dẫn») ghi `docs/SYSTEM-DESIGN.md` §16, chờ chủ ghi nhận.

## Nợ PR 3

- **Lỗ phủ kiểm giao diện (người kiểm cả nhánh I-1, DỰA VÀO KỶ LUẬT — chưa có máy canh):** khi bỏ `ve-ho-tro-smoke`, `ve-ho-tro-2a-smoke`, phần `/feedback` của `dot-c-smoke`, các ca sau không còn kịch bản Chrome nào chạy: (a) người ngoài nhóm mở thẳng yêu cầu ⇒ báo lỗi, không lộ tiêu đề; (b) Đối tác không có ô «Gửi tới nhóm»; (c) thành viên thường không có «Giao cho người khác»; (d) đang mở luồng mà yêu cầu bị chuyển nhóm ⇒ «không còn trong nhóm», ẩn ô trả lời, dừng làm mới; (e) qua vòng tự làm mới: ghi chú nội bộ không tới người gửi, bản nháp giữ, ẩn thẻ trình duyệt thì không gọi; (f) khoá tài khoản người giữ ⇒ «Chưa ai nhận» kèm tên mờ; (g) máy tính 1040: danh sách và luồng cùng hiện. Máy chủ vẫn chặn (a)(b)(c)(e) — bài `src/modules/feedback/*.test.ts` + e2e; phần giao diện chỉ đọc mã thấy đúng.
- `help-smoke`, `trang-chu-smoke`, `quyen-thieu-quan-tri-smoke` đã đổi chữ «Trợ giúp» → «Hướng dẫn» trong phép kiểm nhưng chưa chạy lại.
- `demTuanNay` khoá tuần giờ VN, máy chủ gom theo UTC — lệch tới 7 giờ sát nửa đêm Chủ nhật.
- Danh sách nhóm trong hộp «Gửi yêu cầu» nạp lúc vào trang; công tắc «Nhạy cảm» ở hộp Sửa lưu theo nút Lưu còn ở bảng lưu ngay.
- Hàng rào tệp luật (`guard-tep.mjs`) không chặn ghi tệp luật bằng trình thông dịch (python): người thi công đợt 3 đã sửa được `web/CLAUDE.md` rồi tự hoàn nguyên (không vào commit) — báo chủ.

## Ruling sau phát hành (28/10)

- R-28.10-a (chủ dự án 28/10, bấm «Cho hiện ngay»: «Cho nút Đổi hiện ngay với mức tạo hôm nay, mức mới áp từ ngày mai»): đổi `BAN-GIAO.md` §4 (dòng 43 «chỉ ở dòng … bắt đầu trước hôm nay»; dòng 48 «ô Từ mặc định hôm nay»). Dòng mức bắt đầu hôm nay, chưa có ngày ngừng, nay có «Đổi» / «Ngừng» (`nutDoiNgung`); hộp Đổi của dòng đó mặc định và sớm nhất là ngày mai (`ngayDoiSomNhat`, bài đối chiếu với `kiemDoi` ở `pricing/doi-muc.test.ts`) kèm câu `cauDoiTuNgayMai`. Máy chủ không đổi. Lý do: chủ không tìm thấy nút, chỉ thấy chữ xám «đổi hoặc ngừng từ ngày mai».
- R-28.10-b (người thi công tự quyết, đảo ngược được): «Ngừng» hiện cùng «Đổi» (chung một hàm, chung hộp hai việc ở điện thoại); Ngừng dòng bắt đầu hôm nay = mức chạy hết hôm nay. Người kiểm độc lập khuyến nghị giữ. Bài `pricing/rules.test.ts` ghim máy chủ nhận ngày đóng = ngày bắt đầu (quan sát đỏ khi siết `<` thành `<=`, 28/10).
- Kịch bản Chrome `hoa-hong-smoke.mjs` thêm bước 5b. Lần chạy đầu 28/10: 390 đạt cả 13 bước; 1040 đỏ ở 5b vì axe đo tương phản đầu hộp lúc hộp còn trượt (kéo bước 6 đỏ theo vì hộp còn mở); chạy lại riêng 1040 đạt 12/12. Nợ nhỏ: axe trong kịch bản không chờ hộp trượt xong — có thể chập chờn ở bước khác.
