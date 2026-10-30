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
