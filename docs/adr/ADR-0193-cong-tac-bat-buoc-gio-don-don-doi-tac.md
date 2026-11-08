# ADR-0193 — Công tắc của Toàn quyền: đơn có đón của Đối tác có bắt buộc chốt giờ đón trước khi xác nhận hay không (yêu cầu mới N2)

- **Trạng thái:** proposed 2026-11-09 — AI soạn theo kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt kế hoạch 9/11, Phần VIII mục 5.3), thuộc **ADR lượt B** (trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-b.md`). Người kiểm độc lập chỉ đọc kiểm một vòng bản nháp; lỗi người kiểm nêu ở câu (ii) (bản nháp đổi nghĩa cổng hạn chốt, sót câu SQL, đòi Đặt gấp cho chặng chưa giờ mà Đặt gấp không dựng được dấu) đã sửa ở bản này bằng cách đổi (ii) thành «chặn tới khi có giờ». Chưa có mã.
- **Số:** 0193 (soát như ADR-0188).
- **Nguồn:** yêu cầu của chủ 8/11 (kế hoạch Phụ lục A, nguyên văn): «Nới điều kiện về việc bắt buộc lượt đưa đón phải có giờ đóng cụ thể, hãy biến đấy là 1 tùy chọn có thể thực hiện việc thiết lập trong bảng điều khiển của Super Admin», và câu trả lời trong hộp hỏi: «Đổi luôn mốc 6 giờ thành 1 giờ (biến thành tuỳ chọn trong Dashboard của Super Admin) . Đơn được phép tiếp tục kể cả khi không có giờ đón (có báo lỗi vàng)». Cách hiểu: «Super Admin» = Toàn quyền; «giờ đóng» = giờ đón. Phần «mốc 6 giờ → 1 giờ» chủ tự làm ở màn Chính sách điều phối (kế hoạch Đợt 0, không thuộc ADR này). Dẫn chứng mã đọc lại trên `main` @`fa3fd859a`.
- **Ngày:** 2026-11-09. **Loại:** việc lớn (dữ liệu: migration bảng mới; luồng xác nhận; quyền cài đặt) — người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về hành vi (Toàn quyền bật lại được); một chiều mềm về dữ liệu (bảng chính sách chỉ thêm ở lại; đơn đã xác nhận khi Tắt giữ nguyên).
- **Sửa:** ADR-0154 Đ1.2 và Đ1.3 (thêm «khi công tắc Bật»); mục (ii) dưới đây thêm một điều chặn xác nhận riêng cho chặng Đón chưa giờ mà ngày đón đã vào hạn chốt (không đổi nghĩa cổng hạn chốt của ADR-0049 / ADR-0107 / ADR-0128), đóng phần còn hở của ADR-0154 Đ1.7. Không sửa nguyên văn các ADR đó.
- **Liên quan:** ADR-0154 Đ2 (khuôn bảng công tắc ẩn thông tin khách `ord_partner_customer_policy`, nút trên trang Tôi), ADR-0136 Đ13 (nhánh A / B của Gửi đơn), ADR-0049 D2 và chặn `CHUA_CO_GIO` khi xếp xe, ADR-0047 (chặng đưa đón).
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục dữ liệu, hạn 31/12). Kế hoạch ghi lượt B «không xây trên lỗ đang hở», nhưng công tắc cần một bảng mới (migration; `orders` không có bảng cài đặt chung, và chỉ phân hệ chủ ghi bảng của mình). Thực hành chưa đồng nhất: ADR-0154 (migration `0133`) và ADR-0186 (migration `0148`, `0149`) ghi «không» xây trên lỗ nào dù có migration; còn ADR-0178 (khoá `xay_tren_cho_phep_adr_0178` ở mục `HC-5.19`) và chính kế hoạch ở việc N1 (Phần IX mục 6.1) coi migration khi chưa diễn tập là chạm lỗi này. ADR này chọn hướng thận trọng. **Lý do xin phép:** bảng chỉ thêm, một dòng mặc định giữ đúng hành vi hôm nay, không đổi dòng dữ liệu nào đang có, không chạm sổ tiền. Khoá đề xuất ghi vào mục `HC-5.19` sau khi chủ duyệt: `"xay_tren_cho_phep_adr_0193": "CÔNG TẮC GIỜ ĐÓN ĐƠN ĐỐI TÁC (ADR-0193) — chủ dự án <ngày> (<nơi>): «<nguyên văn, kèm Cho phép, có ghi lý do>». Lý do: migration chỉ thêm một bảng chính sách, mặc định giữ hành vi hôm nay. Điều kiện: <phát hành trước hay sau diễn tập, theo lời chủ>; phần còn lại của lỗ giữ hạn cũ."` Các mục khác (`TNV-G1`, `HC-4.2`, hai ô hoãn) không thuộc vùng này.
- **Số quyết định chạm quyền/dữ liệu:** 1, với hai câu con (i), (ii).

## Bối cảnh

Từ ADR-0154, Đối tác không nhập giờ đón (ghi vào Ghi chú); đơn có đón của Đối tác mà chặng đầu chưa có giờ thì luôn vào nhánh A (văn phòng xét), máy chủ chụp cờ «cần chốt giờ» vào yêu cầu xác nhận, và bảng Còn vé từ chối (409) tới khi văn phòng điền giờ (`canChotGioCuaNguoiLap` ở `src/modules/orders/xac-nhan-chung.ts`). Với nhân viên văn phòng, giờ đón vốn không bắt buộc lúc xác nhận.

Điều phối đã chịu được chặng chưa giờ: xếp xe bị giữ bằng lý do `CHUA_CO_GIO` («Lượt đưa đón chưa chốt giờ đón», `src/shared/ly-do-giu.ts`), bảng điều phối hiện «Chưa chốt giờ». Đường lách «xác nhận khi chưa giờ rồi điền giờ sát giờ chạy» đã bị chặn ở các lệnh sửa chặng (`duoiMocKhiSua`, `src/shared/moc-toi-thieu.ts`).

Còn hở: cổng hạn chốt trả «không xét» khi chặng chưa có giờ — cả hàm thuần `kiemMocDat` (`KHONG_GIO`) lẫn câu SQL của lô xác nhận (`ORDER_CONFIRM` ở `src/modules/orders/chang-hanh-khach-repo.ts`, điều kiện `pickup_time IS NOT NULL`; hai nơi phải cùng một luật, có bài khoá) — nên đơn đón ngay trong ngày mà chưa giờ vẫn xác nhận thẳng. Đặt gấp cũng không dựng được dấu cho chặng chưa giờ (`xetDatGapSua` trả `KHONG_CAN_DAT_GAP`; ADR-0154 Đ1.4). Hôm nay chỉ gặp ở văn phòng và ở ca ngoại lệ của ADR-0154 Đ1.7 (kiểm định kỳ `R-ORD-17w` mức cảnh báo); khi công tắc Tắt, đơn Đối tác cũng rơi vào đó.

## Quyết định

1. **Công tắc** «đơn có đón của Đối tác phải chốt giờ đón trước khi xác nhận», thuộc phân hệ `orders`:
   - Bảng chính sách **chỉ thêm** mới theo khuôn `ord_partner_customer_policy` (trigger chặn sửa, chặn xoá; dòng hiện hành là dòng mới nhất). Migration gieo một dòng **Bật** = hành vi hôm nay, nên phát hành không đổi gì cho tới khi Toàn quyền tắt.
   - Ô `settings.ops` (chỉ Toàn quyền). Nút trên trang Tôi, cạnh «Ẩn thông tin khách» (Nền tảng chưa có trang bảng điều khiển chung của Toàn quyền). Đổi công tắc có nhật ký.
   - Chụp tại mốc: luật đọc công tắc **lúc Gửi đơn** (lúc chụp cờ «cần chốt giờ»); đổi công tắc sau đó không đổi cờ đã chụp của yêu cầu đang chờ.
   - `canChotGioCuaNguoiLap` hôm nay là hàm thuần đồng bộ, dùng ở hai nơi: route Gửi đơn (`xac-nhan-route.ts`) và khối «xác nhận» của chi tiết đơn (`xac-nhan-chung.ts`). Cả hai nơi phải nhận giá trị công tắc (đọc trước, truyền vào hàm), để nút trên trang đơn và route nói cùng một điều. Khi Tắt, lý do `CHOT_GIO` không hiện cho người xét.
2. **Khi Bật:** y như hôm nay (ADR-0154 Đ1.2, Đ1.3).
3. **Khi Tắt — câu (i), khuyến nghị an toàn:** đơn có đón của Đối tác mà chặng đầu chưa có giờ **vẫn vào nhánh A** (văn phòng xét như hôm nay), nhưng cờ «cần chốt giờ» chụp bằng 0, nên bảng Còn vé **không** từ chối vì thiếu giờ; văn phòng xác nhận được và điền giờ sau. Đơn mang nhắc vàng «Chưa chốt giờ» ở trang đơn và bảng điều phối (nhắc đã có).
   - Phương án khác của (i): khi Tắt, thiếu giờ không còn là lý do đi nhánh A — đơn đi theo luật thường (dịch vụ không cần xét thì tự xác nhận ngay, nhánh B). Nhanh hơn cho Đối tác, nhưng không người nào nhìn đơn trước khi xác nhận.
4. **Câu (ii), khuyến nghị an toàn — áp mọi cửa xác nhận, mọi người lập:** chặng có Đón mà chưa có giờ, nếu ngày đón đã vào hạn chốt — tức bây giờ ≥ (00:00 ngày đón, giờ VN) − hạn chốt ở Chính sách điều phối — thì **không xác nhận được cho tới khi có giờ** (409, câu đề xuất «Lượt đón ngày ‹ngày› chưa có giờ mà đã sát giờ đón — điền giờ đón trước khi xác nhận.»; chủ sửa được). Điền giờ xong thì đơn đi cổng hạn chốt và Đặt gấp như mọi đơn. Với hạn chốt 60 phút: đơn đón ngày mai chưa giờ xác nhận thẳng được tới 23:00 hôm nay; đơn đón hôm nay chưa giờ phải điền giờ trước. Không dùng con số «6 giờ» cố định — luôn đọc hạn chốt hiện hành.
   - **Cách làm:** một hàm thuần riêng ở `src/shared/moc-toi-thieu.ts` (ví dụ «chặng đón chưa giờ đã vào hạn chốt»), cùng một luật ở câu SQL của lô xác nhận (`ORDER_CONFIRM`) và ở hàm thuần, có bài khoá hai phía như cặp `kiemMocDat` / SQL hôm nay. **Không** đổi nghĩa `KHONG_GIO` của `kiemMocDat`, vì hàm đó còn dùng ở `duoiMocKhiSua`, cảnh báo dưới mốc (`dat-gap.ts`, `dat-gap-hien-thi.ts`) và lịch điều phối (`dieu-phoi-lich-chung.ts`) — đổi nó sẽ làm mọi chặng chưa giờ hiện cảnh báo «dưới mốc». Không cần dấu Đặt gấp cho chặng chưa giờ.
   - Phương án khác của (ii): chỉ áp cho đơn của Đối tác (văn phòng giữ như hôm nay). Hẹp hơn nhưng để nguyên đường vòng của văn phòng.
5. **Không đổi:** điều phối (chặng chưa giờ vẫn không xếp được xe — `CHUA_CO_GIO`; bộ lọc «Chưa chốt giờ»); `kiemMocDat`, `duoiMocKhiSua` và mọi cảnh báo dưới mốc; luật Đặt gấp; `tinhCanXacNhan`; đơn của văn phòng ngoài câu (ii); công tắc ẩn thông tin khách.
6. **Kiểm định kỳ `R-ORD-17w`** sẽ báo liên tục khi Tắt (đơn Đối tác xác nhận khi chặng đầu chưa giờ trở thành hợp lệ). Sửa trong cùng đợt: chỉ đếm đơn xác nhận khi công tắc Bật (đọc dòng chính sách hiệu lực tại giờ xác nhận), giữ mức cảnh báo.
7. **Tên công tắc** là chữ mới trên giao diện (Hiến chương 5.27, ADR-0167): chủ chọn một — (1) «Bắt buộc giờ đón cho đơn đối tác» (khuyến nghị; nút «Tắt bắt buộc giờ đón» / «Bật bắt buộc giờ đón»), (2) «Đơn đối tác phải có giờ đón», (3) «Chốt giờ đón trước khi xác nhận». Hết giờ không chọn thì dùng (1).

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0154 Đ1 câu dẫn | «Áp cho mọi tài khoản giữ quyền Đối tác, không công tắc.» | «Áp cho mọi tài khoản giữ quyền Đối tác. **Đ1.2 (vế cờ) và Đ1.3 chỉ áp khi công tắc của ADR-0193 Bật** (mặc định Bật).» |
| ADR-0154 Đ1.2 | «… thì luôn vào nhánh A … Lúc gửi, máy chủ chụp cờ «cần chốt giờ» vào `ord_confirm_request`.» | «… thì luôn vào nhánh A … Lúc gửi, máy chủ chụp cờ «cần chốt giờ» vào `ord_confirm_request` **khi công tắc Bật; Tắt thì cờ = 0** [nếu chủ chọn phương án khác của (i): «khi Tắt, thiếu giờ không còn là lý do vào nhánh A»] (ADR-0193).» |
| ADR-0154 Đ1.3 | «Máy chủ từ chối Còn vé (409, câu tiếng Việt) chỉ với yêu cầu mang cờ mà chặng đó còn thiếu giờ.» | giữ nguyên (yêu cầu chụp khi Tắt không mang cờ nên không bị từ chối). |
| Cổng xác nhận (thêm điều mới, không thay câu cũ) | — (chặng chưa giờ ⇒ cổng hạn chốt «không xét», giữ nguyên) | thêm: chặng có Đón chưa giờ mà ngày đón đã vào hạn chốt ⇒ không xác nhận tới khi có giờ [phạm vi theo câu (ii)] (ADR-0193). |

## Lý do

Chủ muốn Đối tác gửi đơn có đón được mà không phải chờ ai chốt giờ, nhưng vẫn giữ quyền bật lại. Giữ nhánh A khi Tắt (i) đổi ít nhất: chỉ gỡ đúng điều chặn, người văn phòng vẫn nhìn đơn. Câu (ii) cần vì khi bỏ bắt buộc giờ, đơn đón ngay trong ngày chưa giờ sẽ lọt qua cổng hạn chốt; chặn tới khi có giờ là cách chặt nhất mà không phải dựng cơ chế Đặt gấp mới cho chặng không giờ.

## Phương án bị loại

- **Công tắc riêng từng đối tác:** chủ nói một tuỳ chọn chung; làm sau nếu cần.
- **Đặt công tắc ở màn Chính sách điều phối (`vc_dispatch_policy`):** bảng đó thuộc `van-chuyen`; luật nhánh xác nhận thuộc `orders` — chỉ phân hệ chủ ghi bảng của mình.
- **Bỏ hẳn luật ADR-0154 Đ1.2–1.3, không công tắc:** trái lời chủ «biến thành tuỳ chọn».
- **Câu (ii) bằng cách coi giờ đón là 00:00 ngày đón trong `kiemMocDat` rồi đòi Đặt gấp:** đổi nghĩa hàm dùng ở nhiều nơi (cảnh báo dưới mốc hiện cho mọi chặng chưa giờ) và Đặt gấp không dựng được dấu cho chặng chưa giờ.

## Bài kiểm (đỏ trước, xanh sau)

- Bài thuần luật nhánh và cờ (Bật / Tắt × có đón chưa giờ / đã giờ / không đón × Đối tác / văn phòng), chụp tại mốc (đổi công tắc sau khi gửi không đổi cờ).
- Bài cho câu (ii): đơn đón ngày mai chưa giờ lúc 22:00 (qua) và 23:30 (409) với hạn chốt 60 phút; đơn đón hôm nay chưa giờ (409); điền giờ rồi xác nhận (đi cổng hạn chốt như thường); đơn đã có giờ (không đổi). Bài khoá hàm thuần và SQL `ORDER_CONFIRM` cùng một luật. Bài khoá `kiemMocDat` không đổi kết quả với chặng chưa giờ.
- Bài migration (trigger chỉ thêm, dòng gieo Bật), bài route công tắc (`settings.ops`, `Origin`, nhật ký), bài kiến trúc (chỉ `orders` ghi bảng mới).
- Sửa `R-ORD-17w` + bài canh `src/audit-invariants.test.ts`.
- e2e (chạm API, migration). Kịch bản Chrome: trang Tôi của Toàn quyền (nút), Đối tác gửi đơn có đón chưa giờ khi Tắt, bảng Còn vé không đòi giờ; ảnh 390 và 1280.

## Người dùng sẽ thấy

Toàn quyền có thêm một nút trên trang Tôi để tắt hoặc bật việc bắt buộc giờ đón cho đơn đối tác (mặc định đang bật, như hôm nay). Khi tắt: Đối tác gửi đơn có đón mà chưa ghi giờ vẫn gửi được; văn phòng vẫn xét đơn như hôm nay nhưng bấm «Còn vé, xác nhận» được mà không phải điền giờ; đơn hiện nhắc vàng «Chưa chốt giờ», và xe chưa xếp được cho tới khi văn phòng điền giờ. [Câu (ii):] Mọi đơn có đón mà chưa có giờ, nếu ngày đón đã nằm trong hạn chốt (ví dụ đón ngay hôm nay), phải điền giờ đón trước rồi mới xác nhận được (sau đó sát giờ thì Đặt gấp như thường).

## Hệ quả

- Migration số kế tiếp lúc thi công (hôm soạn: lớn nhất 0150 trên `main`; liệt kê mọi nhánh trước khi đặt số). `docs/data-dictionary.json` + `npm run dict`.
- Khi duyệt: ghi khoá `xay_tren_cho_phep_adr_0193` vào mục `HC-5.19`; dòng Trạng thái ADR-0154 thêm trỏ về ADR này.
- Trần gói trang Đơn hàng: nút ở trang Tôi (gói khác); chữ «Chưa chốt giờ» đã có. Chưa đo.
