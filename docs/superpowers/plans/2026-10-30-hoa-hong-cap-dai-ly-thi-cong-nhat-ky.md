# Nhật ký thi công: Hoa hồng cấp đại lý (kế hoạch 18 việc)

Kiểm quyen-hoan.json 30/10: chỉ khớp HC-4.2 dòng 115 (ghi chú của Sổ đại lý đợt 2, đường điều chỉnh có duyệt). Kế hoạch này không chạm đường điều chỉnh sổ tiền ⇒ không xây trên lỗ đang hở (phán quyết người điều phối; khớp đặc tả §0).

Kế hoạch: `docs/superpowers/plans/2026-10-30-hoa-hong-cap-dai-ly.md`. Đặc tả: `docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/DAC-TA.md` bản 5.

## Gốc

Mọi so sánh với `main` ở kế hoạch này dùng GỐC hoặc ba chấm `main...`, không hai chấm, để commit mới của `main` không lẫn vào.

- HEAD lúc bắt đầu: `4a915b057420d4d8aba40d8d333ec52ee3dad6eb`
- GỐC (`git merge-base main HEAD`): `a129d3dd074abce4cfd1e745869d975136777d0e`

## Lựa chọn tự áp

- Task 2, thứ tự xếp loại ở `xepTheoPhu`: `KHONG_CO`, `THIEU`, `DU`, `CHUA_KIEM`, `TAT` (đặc tả §4.2 chưa có `CHUA_KIEM`; đặt sau `DU`, trước `TAT`). Đảo ngược được, chỉ là thứ tự hiển thị.
- Task 2, `phuMucCap` kiểm `RONG` và `CHUA_AP` trước `CHUA_KIEM`: hai kết quả đó không cần danh mục nên vẫn báo được khi danh mục lỗi; chỉ ca «còn áp, cần đối chiếu dịch vụ» mới ra `CHUA_KIEM`.
- Task 2, `demDai`: `thieu` = `KHONG_CO` + `THIEU`; `thieuMot` = số loại `THIEU` (thiếu một phần); `chuaKiem` = có ít nhất một loại `CHUA_KIEM`. Loại `TAT` vẫn là `TAT` khi danh mục lỗi.
- Task 2, `sapApTu` tính cả cho loại `TAT` và `CHUA_KIEM` (phụ chú không đổi kết quả).

## P16 (sửa cố ý → đỏ → hoàn nguyên)

### Task 3 (đối chiếu với chonMuc, thứ tự áp mức)

Mỗi lần sửa cố ý rồi hoàn nguyên; chạy ba tệp `phu-muc-doi-chieu.test.ts`, `thu-tu-ap-muc.test.ts`, `hoa-hong-phu-muc.test.ts` (15 bài, xanh 15/15 trước và sau).

- (i) Bỏ nhánh (b) của `phuMucLoai` (`dongCap = []`): ĐỎ 3 bài, gồm `not ok 1 - phủ ⇔ chonMuc SET cho L2–L14 × mọi dịch vụ`, `not ok 7 - §4.4: L1–L14 ra đúng kết quả…`, `not ok 10 - §4.4: đếm dải 8 thiếu…`.
- (ii) Cho dòng sắp áp tính là còn áp (bỏ `tuNgay <= ngay` trong `conApNgay`): ĐỎ 6 bài, gồm `not ok 1 - phủ ⇔ chonMuc SET…` (bài đối chiếu), `not ok 7`, `not ok 9 - câu nhắc cấp`, `not ok 10`, `not ok 13 - conApNgay…`, `not ok 14 - loại chỉ có dòng riêng SERVICE A từ 2026-11-02…`.
- (iii) Đảo vòng 10–12 với vòng 4–6 trong `chonMuc` (`rules.ts`, không đụng `kiemDoi`): ĐỎ `not ok 4 - (a) cấp riêng có dòng ALL thắng dòng riêng của loại: bậc 12` (`expected: 12`, `actual: 6`). `git diff -- src/modules/pricing/rules.ts` rỗng sau hoàn nguyên.
- (iv) Theo yêu cầu điều phối: bỏ lọc `conApNgay` trên dòng VAI (`dongApLoai = dongLoai`): ĐỎ đúng một bài, `not ok 14 - loại chỉ có dòng riêng SERVICE A từ 2026-11-02 (sắp áp): KHONG_CO và sapApTu`.

## Lệch so với kế hoạch

- Task 3, thêm tệp ngoài danh sách của kế hoạch: `src/bang-tu-giao-dien.test.ts`. Câu §5.3 (ghim nguyên văn) chứa «mức riêng của loại đối tác», trùng mục bảng từ ADR-0130 `/[Dd]òng riêng|[Rr]iêng của loại/u`, nên bài «bảng từ: chữ đã loại…» (số 335) đỏ ngay khi thêm `CAU_THU_TU_AP_MUC`. Cách xử lý: thêm đúng hằng đó vào `CHUOI_GIU_NGUYEN` (cơ chế có sẵn «chuỗi có tên được giữ nguyên văn»), không đổi câu, không đổi bảng từ. Người điều phối cần biết khi viết lượt 6 của bảng từ: câu này phải còn được miễn.

## Mốc cuối phần 1

(để trống, Task 14 điền)

## Việc treo

Bốn khe hở đặc tả gặp khi soạn kế hoạch, kèm phán quyết của người điều phối ghi ở `BIEN-BAN-DUYET-KE-HOACH-2026-10-30.md` (quyết định 14 và đoạn phán quyết các khe).

1. Danh sách tệp phần 2 thiếu tệp buộc phải chạm (`src/shared/app-info.test.ts`, `src/shared/so-do-trang.ts`, nhật ký, tệp bằng chứng). Phán quyết: danh sách «Tệp được chạm» của ADR-0151 tính tệp sản phẩm; tệp phụ trợ ghi vào nhật ký thi công, không coi là lệch.
2. Gốc so sánh của «`git diff main --stat` phần 2» không định nghĩa khi phần 1 chưa vào `main`. Phán quyết: phần 2 lấy lần lưu cuối của phần 1 làm gốc, ghi ở «Mốc cuối phần 1».
3. Một hay hai lần phát hành cho hai phần. Phán quyết (quyết định 14): phát hành một lần, bản 2.48; phần 1 và phần 2 nhập main và phát hành chung sau QA2; chỉ một mục nhật ký thay đổi.
4. Tệp mới `src/shared/hoa-hong-phu-muc.ts` nằm ngoài bộ tệp của luật cấm theo tệp (đặc tả §6.2). Phán quyết: tệp này không chứa chữ người dùng thấy; mọi chữ nằm ở `hoa-hong-hien-thi.ts`.

Ghi thêm từ kế hoạch (không phải khe đặc tả): kịch bản Chrome cần Chrome và `AXE_JS` ngoài repo, e2e cần mạng; thiếu thì ghi «chưa kiểm», không tính đạt.

## Task 4 (chữ máy chủ §6.1, bài ghim §6.3)

Mười bảy «câu hôm nay» của §6.1 đều có nguyên văn trong `index.ts` và `rules.ts`; không câu nào thiếu.

**Chỗ ghim tìm được** (grep trên `src/`, `tests/`, `web/`, `scripts/`, `docs/evidence/*/kich-ban/`; đã sửa sang câu mới):
- `muc-ta.test.ts`: «Không tìm thấy chính sách» (4 ca, bảng kiểm đầu vào), «đã theo một chính sách trong khoảng ngày này», «Chọn loại đối tác và chính sách», «Đã có chính sách với tên này.», «Chính sách này đã tắt» (N-23), và **một chỗ ghim ngoài danh sách §6.3**: ca «bật mức đang bật» khớp `/đang bật/` vào câu `:221` cũ «Mức này đang bật rồi»; đổi thành `/đang mở rồi/`.
- `gan-rieng-route.test.ts:187`: câu chồng ngày của cấp riêng.
- `doi-chinh-sach.test.ts`: «Mức mới giống hệt mức đang gắn.», «Chính sách này đã tắt — …», «Lần áp dụng chính sách này vừa được người khác ngừng hoặc đổi…».
- `tests/e2e/*`, `docs/evidence/*/kich-ban/`, `web/`, `scripts/`: không có kịch bản nào ghim các câu này (`sua-muc.mjs` chỉ có nhãn kiểm «chính sách riêng» trong `assert`, không phải câu máy chủ; không đổi). Chuỗi `hoa-hong-hien-thi.ts:170` «ngừng áp dụng chính sách cũ» là chữ giao diện, thuộc task khác.
- Không tìm thấy bài nào ghim: «Không tìm thấy lần áp dụng…», «Không tìm thấy chính sách riêng này», «Chính sách riêng này vừa…», «Tên chính sách…», «Chọn chính sách.», `:221` (nên thêm ca mới).
- Chi tiết nhật ký không đổi: `muc-ta.test.ts:125,166` ghim `chính sách TA1 · …` (khuôn cũ, quyết định 8); `gan-rieng-route.test.ts:124` ghim `mức riêng TA2 · …`.

**Bài đỏ trước khi sửa mã**: ba tệp (`muc-ta`, `gan-rieng-route`, `doi-chinh-sach`) 27 xanh / 7 đỏ (trong đó ca mới `khoá cấp đang khoá / mở lại cấp đang mở ⇒ 409 đúng câu (§6.1 :221)`). Sau khi đổi chuỗi: `npm test` thoát 0, 6735 xanh / 0 đỏ (bộ chính) + 1/1 (bài đo giờ); `npm run typecheck` 0 lỗi. Bảng-từ giao diện (`src/bang-tu-giao-dien.test.ts`) không đỏ trên câu mới nào.

**Tiêu chí 9 phần máy chủ**: đã đọc từng dòng `git diff HEAD -- src/modules/ ':!*.test.ts'` (20 dòng đổi ở `index.ts`, 6 ở `rules.ts`): mọi dòng đổi chỉ khác bên trong một chuỗi chữ; phần mã, biểu thức chính quy, chú thích cuối dòng (dòng `:73`, «câu chèn của Đổi chính sách») giữ nguyên. `rules.ts` đổi đúng 6 dòng (`kiemTenMucTa` ×3, `kiemThanGan`, `kiemThanDoiChinhSach`, `kiemThanGanRieng`); không hunk nào chạm `kiemDoi` hay `kiemSua`. Hai chuỗi nhật ký `chính sách ${…}` (`index.ts:129`, `:535`) và các chi tiết «mức riêng …» (`:561`, `:579`, `:615`, `:617`) không đổi.

### Task 5 — chữ ở `src/shared/` (trừ hướng dẫn) + `groupCode`

- Đổi chữ ở `hoa-hong-hien-thi.ts` (kể cả chú thích cùng nghĩa), `audit-actions.ts`, `so-dai-ly-nhap.ts` và ba tệp bài; nhãn nút `nhanMucTa` thành «Khoá cấp» / «Mở lại cấp» (quyết định 7); `prc_rate_tier_off`/`_on` thành «Khoá cấp đại lý» / «Mở lại cấp đại lý». Chữ trước `nhanLoaiDoiTac` («Tắt»/«Bật» loại) giữ nguyên theo kế hoạch.
- Lựa chọn tự áp: `prc_rate_tier_added` → «Thêm cấp đại lý»; `prc_party_tier_*` → «… cấp riêng …»; `nhanDoiTuong` loại MUC → «Cấp đại lý»; hai câu chứa «chính sách» trơn trong ghi chú hộp Sửa (`cai`) đổi thành «cấp đại lý này».
- `web/so-dai-ly-ui.ts`: `DanhMuc.dichVu` giữ `groupCode`; typecheck 0 lỗi nên mọi nơi dùng `dm.dichVu` vẫn khớp.
- `huong-dan-ke-toan.ts`: không có `[[Tên nút]]` nào trùng chuỗi đã đổi (nó dùng `[[Tắt]]`, `[[Bật]]` của loại và các nút chính sách của Task 6); không sửa. `huong-dan.test.ts` xanh. Bảng từ không đỏ. `so-do-trang.ts` không đổi.
- Phát hiện cho task sau: `web/hoa-hong-thiet-lap.ts:127` còn nhãn «Tắt»/«Bật» + «Đã tắt chính sách.» của nút mức TA, chưa đồng bộ nhãn «Khoá cấp»/«Mở lại cấp» (thuộc task giao diện).

## Task 6 — câu cố định §5 và luật việc của dòng

**Lựa chọn tự áp**
- `cauDongLoaiDai`: phụ chú §4.2 nối sau dòng bằng « — Có thay đổi sắp áp dụng từ <dd/mm/yyyy>» (đặc tả không nói dấu nối); ngày qua `ngayVN`. Loại không thiếu mức (TAT, DU, CHUA_KIEM) trả chuỗi rỗng.
- «<tối đa 3 tên>[ và <k> dịch vụ khác]»: ba tên nối bằng «, », rồi « và k dịch vụ khác» nếu hơn ba (một dạng cho cả §4.2 và §4.3).
- `cauNhacCap`: ca `CHUA_AP` với `sapApTu = null` ra «Hôm nay cấp này chưa áp mức nào.» (dòng thứ ba của bảng §4.3).
- `thuTuMenu`: khổ máy tính giữ nguyên thứ tự đầu vào; điện thoại đưa `DOI` lên đầu.
- `docThe`: chỉ «loai» và «doi-tac» mở đúng thẻ; mọi giá trị khác (kể cả «cap») ra «cap».

**Lệch so với kế hoạch**
- Miễn bảng từ: thêm `CAU_O_TRONG` vào `CHUOI_GIU_NGUYEN` (`src/bang-tu-giao-dien.test.ts`). Luật `/[Dd]òng riêng|…/` bắt «dòng riêng» trong câu §5.4 nguyên văn («cấp không có dòng riêng cho ô này»); ở đây nghĩa là dòng của riêng cấp cho ô đó, không phải «mức riêng của loại», nên là báo nhầm.

## Task 7 — khung ba thẻ và dải cảnh báo phủ mức

**Nội dung tạm (Task 8–10 thay từng thẻ)**
- Thẻ «Các cấp đại lý» (`#hh-the-cap`) vẽ `veThietLap` (cả «Loại đối tác» lẫn «Chính sách» cũ của `hoa-hong-thiet-lap.ts`). Thẻ «Loại đối tác» (`#hh-the-loai`) vẽ phần «Theo loại đối tác» của `veBangApDung`; thẻ «Riêng từng đối tác» (`#hh-the-doi-tac`) vẽ phần «Đối tác có mức riêng hoặc chính sách riêng». Tra nhanh đứng trên ba thẻ (`#hh-tra-nhanh`), dải ở `#hh-dai`.
- Lựa chọn tự áp: `veBangApDung(g, d, mo, phan, chuyenThe)` thêm tham số `phan` ("loai" | "doi-tac"), trạng thái module thành `Map` theo phần; id hàng lọc đổi `hh-loc-tim`/`hh-loc-tt` thành `…-loai`/`…-doi-tac` (tránh trùng id). Bộ lọc dùng chung: gõ ở thẻ này thì thẻ kia lọc theo. Nút «sửa ở Thiết lập ›» đổi chữ thành «sửa ở Các cấp đại lý ›» và chuyển về thẻ «cap».
- «Xem dòng ↓» của Tra nhanh: `hoa-hong.ts` mở thẻ «doi-tac» (dòng của đối tác) hoặc «loai» (còn lại) rồi gọi `cuonToiDong`. Task 11 thay bằng luật bậc 10–12 và toast.
- Chữ: `hoa-hong-hop.ts` «Ngừng các mức riêng đó ở thẻ «Mức đang áp dụng»» đổi thành «…thẻ «Loại đối tác»» (mức riêng của loại hiện ở thẻ đó). Hướng dẫn kế toán: bỏ tên hai thẻ cũ; «＋ Thêm loại» không nêu tên thẻ vì Task 9 mới chuyển nó sang thẻ «Loại đối tác» (hiện còn ở thẻ «Các cấp đại lý»).
- `cauDai(ds)` (thuần, `hoa-hong-hien-thi.ts`) trả `{tieuDe, than, dong[], tat, chuaKiem}` hoặc `null` (ẩn hẳn); có loại `CHUA_KIEM` thì chỉ `chuaKiem`. Bài đỏ trước (4 ca `cauDai is not a function`), xanh sau.
- `docThe`: đã có bài ở Task 6; thêm ca gộp khoá cũ `ap-dung`, `thiet-lap`, rác, rỗng, null ⇒ «cap».
- Nợ cho Task 14: kịch bản `docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs` còn id `hh-loc-tt`, `hh-tab-ap-dung` cũ (hồ sơ có ngày, không sửa; kịch bản mới viết ở Task 14).

## Task 8 — thẻ «Các cấp đại lý»: ma trận, chi tiết cấp, «⋯», Khoá cấp

**Bài đỏ trước**: sáu ca mới ở `hoa-hong-hien-thi.test.ts` (ba ca của kế hoạch + dòng trỏ mã không còn trong danh mục + `cotMucCap` + đếm/nhãn việc) đỏ 6/6 (`maTranCap is not a function`…), rồi xanh 48/48 sau khi viết hàm. Ca tiêu chí 1 có cấp thứ hai mang dòng dịch vụ S1 (thuộc G1) và dòng «Mọi dịch vụ», để hai hàng đó có thật mà ô của cấp chỉ có dòng nhóm G1 vẫn là `null` (không kế thừa).

**Lựa chọn tự áp**
- `maTranCap`: hàng «Mọi dịch vụ» luôn có; rồi hàng nhóm (thứ tự danh mục), rồi hàng dịch vụ (thứ tự danh mục), chỉ hàng có ít nhất một cấp có dòng đang hoặc sắp áp. Dòng trỏ nhóm/dịch vụ không còn trong danh mục vẫn có hàng (tên = mã, như `nhanPhamVi`), đứng cuối nhóm hàng của nó — giấu đi là giấu mức có thật. Tên hàng: «Mọi dịch vụ», «Nhóm <tên>», tên dịch vụ. Ô khớp đúng phạm vi (mã nhóm / mã dịch vụ), không dùng `khopDichVu`. Ô có thể nhiều nhãn (dòng đang áp + dòng sắp áp); nhãn sắp áp: «<mức> từ dd/mm/yyyy» (`ngayVN`).
- Đếm ở chi tiết cấp (`demTheoCap`): số loại = lần xếp đang áp hôm nay; số đối tác = `ganRieng` của cấp đã bắt đầu và chưa hết hôm nay (không đếm lần sắp áp). Câu `cauDemCap`: «Đang áp dụng cho n loại đối tác và m đối tác có cấp riêng.» (bản đầu viết «Đang áp cho…» bị bảng từ bắt — chữ của mình, sửa câu, không miễn).
- Câu/nhãn mới ở `hoa-hong-hien-thi.ts`: `cotMucCap` (PER_PAX không theo loại khách ⇒ trẻ em, người cao tuổi «—», không chép số người lớn), `nhanViec` (dòng: Đổi · Sửa · Ngừng; lần xếp: Đổi cấp · Sửa · Ngừng áp dụng — Q-12), `nhanViecKhac`, `CAU_DA_KHOA_CAP` «Đã khoá cấp.», `CAU_DA_MO_LAI_CAP` «Đã mở lại cấp.», `NHAN_CAP_KHOA_NGAN` «Đã khoá» (đầu cột ma trận, chip), `CAU_CAP_CHUA_AP_LOAI`.
- Khổ: ngưỡng 899/900 (Q-11), đọc `matchMedia("(max-width: 899px)")` lúc bấm «⋯». ≥ 900: ma trận trong `.hh-ma-tran-khung` (`overflow-x: auto`; hơn 5 cấp thì bảng `width: max-content` ⇒ cuộn trong khung), bấm tên cấp ở đầu cột (`aria-pressed`) để mở chi tiết. < 900: ma trận ẩn, chọn cấp bằng `.tab-phu[data-kieu="vien"]` (`role="tablist"`, mũi tên / Home / End); «danh sách theo từng cấp» chính là chi tiết cấp đang chọn (bảng «Mức của cấp» xếp thành dòng bằng CSS), không vẽ thêm một danh sách trùng.
- Nút việc: ≥ 900 nút «Đổi» / «Đổi cấp» thấy sẵn + «⋯» cho phần còn lại («⋯» không còn việc nào ở khổ này thì mang `data-chi-dien-thoai`, CSS ẩn từ 900); < 900 chỉ «⋯», «Đổi» đứng đầu (`thuTuMenu`). Bấm một việc trong «⋯»: `bang.close()` CÓ trả tiêu điểm về «⋯» rồi mới mở hộp (hộp lấy phần tử đang có tiêu điểm làm nút mở; `moBangTruot`/`hoiXacNhan` không mở khi còn bảng). «⋯» là `.nut[data-cap="loi"]`, rộng tối thiểu `--h-control`.
- Bảng «Mức của cấp»: chỉ dòng đang và sắp áp (như ma trận); cột Trẻ em / Người cao tuổi chỉ có khi ít nhất một dòng khai theo loại khách (khi đó cột mức đổi tên «Người lớn»); thêm cột Trạng thái (huy hiệu sẵn có). Lần xếp loại: đang áp, sắp áp, rồi `khoiLichSuGan`.
- Nút cấp dùng `.nut[data-cap="phu"]`; «Khoá cấp» qua `hoiXacNhan(hopKhoaCap(ten))`, «Mở lại cấp» không hỏi; lỗi máy chủ hiện nguyên câu dưới hàng nút. Huy hiệu: `la` + `checkCircle` «Đang áp dụng» / `cat` + `lock` `NHAN_CAP_DA_KHOA`.
- Khối loại cũ (`hoa-hong-thiet-lap.ts`, Tắt/Bật loại, «＋ Thêm loại», Đổi cấp / Ngừng áp dụng / Sửa của loại) giữ lại, nay vẽ trong thẻ «Loại đối tác» dưới bảng cũ (hai khung con của `#hh-the-loai`), tới khi Task 9 thay. Phần cấp của tệp đó (bảng cấp, nút «Tắt»/«Bật» cấp, «Đã tắt/bật chính sách.», «＋ Thêm chính sách») bỏ hẳn — món mang sang từ Task 5 đã xử lý bằng cách bỏ. Chữ «chính sách» còn lại trong tệp (nút «Đổi chính sách», «Chính sách <tên> · áp dụng từ», «Chưa áp dụng chính sách nào», «Sửa áp dụng chính sách») đổi theo chữ mới.
- `hoa-hong-hop.ts`: mọi chuỗi «chính sách» nghĩa cấp đổi theo §6 (tiêu đề «Đổi cấp», «Áp dụng cấp cho loại», «Thêm mức vào cấp», «Sửa áp dụng cấp», «Thêm cấp đại lý»; ô chọn «Cấp đại lý», «— Chọn cấp đại lý —», «Cấp mới», «Chọn cấp đại lý.»; các câu báo xong; câu «Cấp cũ … sẽ ngừng»). Đếm sau sửa: 0 chuỗi chứa «chính sách» trong tệp (chỉ còn trong chú thích: 0). Ô chọn cấp ở hộp Sửa / Đổi cấp vẫn chỉ liệt kê cấp đang mở (`dangBat`).
- Hướng dẫn kế toán: mục «Chính sách hoa hồng» → «Cấp đại lý», `[[…]]` = «＋ Thêm cấp đại lý», «＋ Thêm mức vào cấp», «Áp dụng cấp cho loại», «Đổi cấp», «Ngừng áp dụng», «Khoá cấp», «Mở lại cấp» (A2 xanh). Bài A4 (đọc ≤ 30 phút) đỏ ở bản đầu: nhóm Kế toán chạm 22 phút; viết gọn lại tới 3149 chữ (trần 3150) — **còn đúng 1 chữ dư**, task sau thêm chữ vào hướng dẫn Kế toán (Task 9, 10, 12, 17) phải bớt chữ chỗ khác.

**Lệch so với kế hoạch**
- Không có miễn bảng từ mới.
- `web/hoa-hong-bang.ts` (ngoài danh sách tệp của task) không sửa: nút «Đổi chính sách» của cụm loại ở bảng cũ còn tới Task 9.
- CSS: bản đầu thêm khối `.hh-cap*` ở cuối `public/app.css` ⇒ `src/bo-v2-khop-ma.test.ts` đỏ («phần CHÉP TỪ MÃ khác public/app.css»), vì từ dấu mốc «Thành phần chung v2» tới cuối tệp được chép sang bộ thiết kế v2. Chuyển khối lên ngay TRƯỚC dấu mốc đó (vẫn sau mốc PWA, chỉ token); vì luật v2 khai sau nên chọn lọc ghép lớp gốc (`.bang.hh-ma-tran`, `.nut.hh-viec-doi`, `.tab-phu.hh-cap-chon`…) để thắng. Không chạy lại `sinh-bundle-bo-v2.mjs`, bộ v2 không đổi.
- Bảng «Mức của cấp» bọc trong `.hh-muc-cap-khung` (`overflow-x: auto`) để tám cột (có loại khách) ở khổ 900–1040 kèm thanh bên không đẩy cả trang cuộn ngang; dưới 900 ô số (`td[data-so]`) canh trái trong dòng xếp chồng (luật v2 `.bang td[data-so]` khai sau).
- Sau duyệt (commit sửa riêng): câu «—» chỉ hiện cùng ma trận (vùng `.hh-ma-tran-vung` ẩn dưới 900); câu thứ tự áp mức giữ ở mọi khổ (luật chung), dưới 900 đứng trước dải chọn cấp; khung chi tiết là `role="tabpanel"` gắn nhãn bằng chip đang chọn; luật ẩn chip từ 900 chọn lọc dưới `.hh-cap`; hướng dẫn: «Mức riêng được ưu tiên hơn cấp.» (sai với §5.3 — cấp riêng của đối tác đứng trên mức riêng của loại) thay bằng «Cấp của loại xét sau cùng.»; nhóm Kế toán 3149 → 3148 chữ.

## Task 9 — thẻ «Loại đối tác»

**Bài đỏ trước**: `huyHieuPhu` + `cauSapApLoai` (một ca năm kết quả §4.2 + phụ chú) đỏ `HT.huyHieuPhu is not a function`, rồi xanh 49/49.

**Lựa chọn tự áp**
- `web/hoa-hong-loai.ts` (`veTheLoai`) thay hẳn phần loại của bảng cũ và `web/hoa-hong-thiet-lap.ts` (xoá tệp; mọi nút của nó đã chuyển sang). Mỗi loại một `article.the[data-loai]`, luôn mở (không còn dòng gập); thứ tự `xepTheoPhu`; `xepLoai` và bài của nó giữ nguyên, chỉ không còn nơi gọi ở web.
- Dùng lại, không chép: `oViec` (xuất từ `hoa-hong-cap.ts`) cho việc của lần xếp loại (máy tính «Đổi cấp» + «⋯», điện thoại chỉ «⋯»); bảng mức riêng của loại = `bangDongMuc` (tách từ `bangMucCap`, `capDangBat = null`), nên dòng mức có `data-dong-id` và cùng Đổi / «⋯» như thẻ cấp.
- Loại chưa theo cấp nào + có cấp đang mở: nút «Áp dụng cấp cho loại» mở bảng chọn cấp (`moViecKhac`, tên cấp là nút), chọn xong mở hộp có sẵn với ô «Loại đối tác» chọn sẵn loại (thêm tham số tuỳ chọn `loaiCode` cho `apDungChinhSach` ở `hoa-hong-hop.ts`). Không có hộp chọn-cấp riêng.
- Bộ lọc/ô tìm của bảng cũ không còn ở thẻ này (brief không nêu); dòng mức riêng hiện đang + sắp áp (như thẻ cấp), không có dòng đã ngừng/huỷ ở thẻ này. Bộ lọc vẫn còn ở thẻ «Riêng từng đối tác» (tạm tới Task 10).
- Chữ mới ở `src/shared`: `huyHieuPhu`, `cauSapApLoai`, `cauLoaiTheoCap` («Đang theo cấp <tên> · áp dụng từ <ngày>»), `CAU_LOAI_CHUA_THEO_CAP`, `CAU_LOAI_CHUA_CO_MUC_RIENG`, `CAU_XEP_LOAI` (chuyển từ thiết lập). Tiêu đề phụ «Mức riêng» (không «Mức riêng của loại»: bảng từ ADR-0130 bắt, test đỏ lần đầu rồi sửa chữ). Hình huy hiệu: `ban` (xám), `checkCircle` (lá), `alertCircle` (đỏ, cát); cấp đã khoá thêm huy hiệu cát `lock` «Đã khoá».
- Câu «Đơn của loại này sẽ bị giữ…» chỉ hiện khi kết quả phủ là `KHONG_CO`.
- «Xem dòng ↓» của dòng loại (bậc 4–6): `cuonToiDongLoai` tạm trong `hoa-hong-loai.ts`; Task 11 thay bằng luật đầy đủ. Bậc 7–12 (cấp) chưa xử ở đây (Task 11). `cuonToiDong` của bảng cũ chỉ còn phần đối tác.
- Hướng dẫn Kế toán: KHÔNG đổi (nhãn «＋ Thêm loại», «Tắt», «Bật» giữ nguyên; mục không nêu tên thẻ). Số chữ Phần chung + nhóm Kế toán: trước 3148, sau 3148.
- CSS: khối `.hh-loai-*` ngay trước dấu mốc v2 (như khối `.hh-cap`), chỉ token.
- Chữ «chính sách» của cụm loại cũ đi theo phần bị xoá; phần còn lại trong `hoa-hong-bang.ts` (đối tác, `cuonToiDong`, chú thích) để Task 10–11.

**Lệch so với kế hoạch**: có sửa `hoa-hong-hop.ts` (một tham số tuỳ chọn) và `hoa-hong-cap.ts` (xuất `oViec`, tách `bangDongMuc`) — ngoài danh sách tệp, cần để không chép hàm. Chưa kiểm bằng Chrome (kịch bản khổ màn ở Task 14).

**Task 9 — sửa sau duyệt**
- Trả hàng lọc cho thẻ «Loại đối tác» (ô tìm + «Đang và sắp áp dụng» / «Tất cả», id `hh-loc-tim-loai` / `hh-loc-tt-loai`) bằng `locBangLoai` + `BoLoc`; không dùng lại `veBangApDung`. «Tất cả» hiện dòng đã ngừng, đã huỷ kèm huy hiệu `trangThaiDong`. `bangDongMuc` thêm tham số `chiConHieuLuc` (mặc định true: thẻ cấp không đổi; thẻ loại truyền false vì `locBangLoai` đã lọc).
- Thêm «Xem lịch sử (n)» các lần xếp loại vào cấp đã ngừng/huỷ (`khoiLichSuGan`, từ `d.mucTa.muc[*].gan` lọc theo mã loại).
- `cuonToiDongLoai`: không thấy dòng thì `datLaiLocLoai()` (xuất, cho Task 11) rồi thử lại.
- Tiêu đề «Mức của loại»; biến `capMo`.
- Bài: ca `locBangLoai` «Tất cả ⇒ dòng đã ngừng/huỷ hiện» ở `hoa-hong-hien-thi.test.ts` (bài bảo vệ hành vi có sẵn nên xanh ngay, không có bước đỏ). Phần giao diện (lọc đổi → vẽ lại, nhảy dòng sau reset) để bước Chrome Task 14.
- Giải thích `coSan` (chủ điều phối chốt): loại có sẵn không có Tắt/Bật nhưng vẫn có việc cấp và mức; §3.1 chỉ cấm khoá/tắt. Giữ hành vi hiện tại.

## Task 10 — thẻ «Riêng từng đối tác», đặt / sửa / ngừng cấp riêng ngay trên trang

**Bài đỏ trước**: `docThanGanRieng` (`so-dai-ly-nhap.test.ts`, `docThanGanRieng is not a function`) và ca chữ thẻ đối tác (`hoa-hong-hien-thi.test.ts`, `HT.nhanCapRieng is not a function`) đỏ 2/63, rồi xanh 63/63.

**Lựa chọn tự áp**
- `web/hoa-hong-doi-tac.ts` (`veTheDoiTac`, `moDoiTac`, `datLaiLocDoiTac`, `nhanHoSoMoi`) thay phần đối tác của bảng cũ. Danh sách theo `ghepDoiTacRieng`: tên + «Mức riêng» / «Cấp riêng: <tên>», không cột loại, không nhãn xung đột (Q-9); câu `CAU_DUOI_DS_DOI_TAC` dưới danh sách; hàng lọc (ô tìm + «Đang và sắp áp dụng» / «Tất cả», id `hh-loc-tim-doi-tac` / `hh-loc-tt-doi-tac`) chuyển từ bảng cũ, không chép.
- Mở một đối tác: GET `/ho-so/:id/hoa-hong` mỗi lần mở, và GET lại các cụm đang mở khi trang vẽ lại sau một lần ghi khác (trừ cụm vừa nhận phản hồi của hộp cấp riêng). Phản hồi về muộn của lần cũ bị bỏ (số lần nạp theo hồ sơ). Lỗi GET hiện nguyên câu trong cụm. Nội dung: huy hiệu `do` «Xung đột mức» (hình `alertCircle`) + `CAU_XUNG_DOT`; «Loại đối tác» từ `vai` (`cauVaiHoSo`, cấp khoá thêm huy hiệu «Đã khoá»); câu «Đối tác có cấp riêng nên không xét cấp của loại.» khi có `mucRieng` (§5.3); «Mức riêng của đối tác» = `bangDongMuc` trên `dongRiengDoiTac` (từ `d.dong`); «Cấp riêng» = `chiaLanGan(ganRieng)` đang / sắp áp, việc theo `viecLanGan(…, { coDoi: false })` qua `oViec` (chỉ «⋯»: Sửa, Ngừng áp dụng), «Xem lịch sử (n)»; liên kết Danh bạ giữ.
- Nút chính «Đặt cấp riêng cho đối tác» (`.nut[data-cap="chinh"]`) ở đầu thẻ, và nút cùng tên (điền sẵn đối tác) trong cụm khi đối tác chưa có cấp riêng đang / sắp áp. Cả hai chỉ khi `can(…, "partner.commission.write")` VÀ có ít nhất một cấp đang mở (§3.1 «không có nút Đặt cấp riêng trỏ vào cấp khoá»).
- `MoHop` thêm `datCapRieng`, `suaCapRieng`, `ngungCapRieng` (khuôn `suaApDung` / `hopNgay`). Ô cấp chỉ liệt kê cấp đang mở. Ô tìm `taoTimDoiTac({ choPhep: coTheTimDoiTac(nguoiDung) })`. Lỗi 400/409 hiện nguyên văn trong hộp (khuôn `moHop` có sẵn).
- Thứ tự «vẽ lại từ phản hồi rồi `napLai`»: `moHop` (và `hopNgay`) thêm tham số tuỳ chọn `truocNap(r)` chạy sau khi đóng hộp, TRƯỚC `napLai`; `NguCanhHop` thêm `hoSoMoi(partyId, r)`, `hoa-hong.ts` nối vào `nhanHoSoMoi` (hộp không nhập mô-đun thẻ). Các hộp cũ không truyền `truocNap` nên không đổi hành vi.
- Hàm thuần mới: `docThanGanRieng` ở `so-dai-ly-nhap.ts` (nhà của các hàm đọc ô, không ở `hoa-hong-hien-thi.ts` như ví dụ của brief); phần cấp + hai ngày tách thành hàm riêng dùng chung với `docThanGan` (bài cũ của `docThanGan` xanh, không sửa). Chữ mới ở `hoa-hong-hien-thi.ts`: `CAU_KHONG_CO_DOI_TAC_RIENG`, `CAU_DT_CHUA_CO_MUC_RIENG`, `CAU_DT_CHUA_CO_CAP_RIENG`, `CAU_CAP_RIENG_BO_CAP_LOAI`, `CAU_DAT_CAP_RIENG`, `nhanCapRieng`, `cauVaiHoSo`, `cauDaDatCapRieng`, `CAU_DA_SUA_CAP_RIENG`, `cauNgungCapRieng`, `cauDaNgungCapRieng`.
- `web/hoa-hong-bang.ts`: bỏ `cumDoiTac`, `veNoiDung`, `veBangApDung` (cùng mọi chuỗi «chính sách» của chúng). Giữ `urlNgung` (thẻ cấp dùng), `dongMuc`, `dauBang` và `cuonToiDong` cho Task 11 dọn. `cuonToiDong` nay là mã chết (không khối nào ghi vào `cac`); «Xem dòng ↓» của dòng đối tác đi qua `cuonToiDongDoiTac` tạm trong `hoa-hong-doi-tac.ts` (dựng trên `moDoiTac`), khuôn `cuonToiDongLoai` của Task 9. Task 11 thay bằng `nhayToiDong`.
- Hướng dẫn Kế toán: bỏ dòng «Đặt mức riêng cho một đối tác, thử tra mức: chưa, vì tài khoản Kế toán không tìm được đối tác theo tên…» (lệch ADR-0141, §6.2 gạch 3, §10; grep nguyên câu trên `src/`, `tests/`, `docs/evidence/*/kich-ban/`: chỉ có ở tệp hướng dẫn). Thêm vào mục «Cấp đại lý»: «Cấp riêng cho một đối tác: thẻ **Riêng từng đối tác**, bấm [[Đặt cấp riêng cho đối tác]]; mở đối tác để sửa hoặc ngừng.» Số chữ nhóm Kế toán (trần 3150): trước 3148, sau 3144 (Phần chung 1346 không đổi). A2, A4 xanh.
- CSS: chỉ nới một bộ chọn sẵn có (`.hh-cap .hh-tl-gan li > span` thêm `.hh-dt .hh-tl-gan li > span`), không giá trị mới.
- `docs/SYSTEM-DESIGN.md` §9 dòng «Hoa hồng đối tác»: thêm GET `/ho-so/:id/hoa-hong`, `/nguoi-huong` và ba route ghi cấp riêng của thẻ mới.

**Lệch so với kế hoạch**: sửa thêm `src/shared/so-dai-ly-nhap.ts` (+ bài) và `public/app.css` (một bộ chọn) — ngoài danh sách tệp, cần cho hàm đọc ô chung và chữ không tràn. Kịch bản `hoa-hong-smoke.mjs` (bước 322–339 dựa vào `.hh-dt`, «Mức riêng», `.hh-tom-tat`) chưa chạy; vỏ `.hh-dt[data-party]` và `.hh-tom-tat` giữ nguyên tên. Chưa kiểm bằng Chrome (tiêu chí 5, 7: Task 14).

## Task 11 — «Xem dòng ↓» theo ba thẻ, dọn mã cũ

**Bài đỏ trước**: ca `theChoKetQua` (`hoa-hong-hien-thi.test.ts`, `HT.theChoKetQua is not a function`) đỏ 1/52, rồi xanh 52/52. Năm ca của brief: bậc 2 ⇒ `doi-tac`, bậc 5 ⇒ `loai`, bậc 8 ⇒ `cap` + `capRieng false`, bậc 11 ⇒ `cap` + `capRieng true`, `MISSING` ⇒ `null`; thêm một dòng khoá chữ `CAU_CAP_RIENG_DANG_TRA`.

**Lựa chọn tự áp**
- `theChoKetQua` chọn thẻ theo `bac` (1–3 / 4–6 / 7–12), trả nguyên `muc.doiTuong` (đã có `ten`), `capRieng` = `bac >= 10`. Chữ «— cấp riêng của đối tác đang tra» ở `src/shared` (`CAU_CAP_RIENG_DANG_TRA`); giao diện thêm một dòng `<p class="hint hh-cap-rieng-tra">` «<tên cấp> — cấp riêng của đối tác đang tra» đầu khung chi tiết cấp khi nhảy tới bậc 10–12 (mất khi trang vẽ lại, có chủ đích: gợi ý một lần).
- `nhayToiDong(k)` (xuất từ `web/hoa-hong.ts`): `chonThe` (ghi `sessionStorage`) ⇒ đối tác: `moDoiTac`, không thấy thì `datLaiLocDoiTac()` rồi `moDoiTac` lại; loại: tìm trong `[data-loai]`, không thấy thì `datLaiLocLoai()`; cấp: `moChiTietCap(code)` (thẻ cấp không có bộ lọc dòng nên không có bước đặt lại). Vẫn không thấy ⇒ `hienBaoNgan(CAU_KHONG_THAY_DONG, { tong: "bien" })`. Thấy ⇒ cuộn, tô `hh-nhay`, `tabindex=-1` + `focus({ preventScroll })`.
- Tra nhanh chỉ dựng nút «Xem dòng ↓» khi `theChoKetQua(k) !== null`; truyền nguyên `ketQua` cho `nhayToiDong` (bỏ tham số `loai`).
- Mã chết đã xoá: `cuonToiDong`, `dongMuc`, `dauBang`, các biến `loc` / `cac` / `duHienTai` ở `hoa-hong-bang.ts` (chỉ còn `urlNgung`, thẻ cấp dùng — tệp không rỗng nên giữ); `cuonToiDongDoiTac`, `cuonToiDongLoai`. `web/hoa-hong-thiet-lap.ts` không còn trong cây (đã đi từ trước), không có gì để xoá. `xepLoai` và bài của nó giữ nguyên.
- `grep "coMuc\|cuonToiDong" web/`: hết `cuonToiDong`; còn `coMucGiayToCuaToi` ở `web/account.ts`, `web/tai-xe.ts` (không liên quan hoa hồng, có từ trước) — tiêu chí hiểu là không còn chỗ dùng tên cũ.

**Sửa mang sang từ review Task 10**: `web/hoa-hong-hop.ts`, `moHop`: `truocNap` nay nằm trong try/catch riêng (lỗi ghi `console.error`, không chạm hộp), nên lỗi vẽ trước không bị hiện như lỗi ghi sau khi ghi đã thành công; `napLai()` vẫn luôn chạy.

**Lệch so với kế hoạch**: `docs/SYSTEM-DESIGN.md` §9 còn nhắc `hoa-hong-bang.ts` / `hoa-hong-thiet-lap.ts` là mô tả cũ — không sửa ở task này (dòng tự ghi là của giao diện cũ). Chưa kiểm bằng Chrome (Task 14).
