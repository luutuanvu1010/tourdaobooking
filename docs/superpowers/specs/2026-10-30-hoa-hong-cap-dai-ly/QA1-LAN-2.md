# QA1 lần 2 — đặc tả bản 2 + ADR-0151 (2026-10-30)

Hồ sơ có ngày, không sửa. Người kiểm độc lập (subagent), chỉ đọc, HEAD 353230c2.

### Verdict: KHÔNG ĐẠT

Bản 2 đã gỡ cả bốn điểm Chặn và tám điểm Sửa của lần 1, và hầu hết những gì đặc tả nói về mã đều đúng. Tôi dò khoảng 45 chỗ trích tệp:dòng và không thấy số dòng nào sai. Các số đếm ở §4.4 tôi tự tính lại đều khớp. Dù vậy cổng vẫn chưa qua, vì còn một chỗ hai phần của đặc tả chọi nhau. Phần chữ mới cấm ở §6.2 sẽ làm bài kiểm bảng từ đỏ trên đúng những dòng nhật ký mà §6.1 và §12 câu 2 nói là giữ nguyên, nên người thi công buộc phải tự đoán. Ngoài ra còn bảy chỗ cần sửa nhỏ, liệt kê bên dưới.

### Chặn

1. **Mẫu chữ cấm của §6.2 đụng vào chuỗi nhật ký mà đặc tả nói giữ nguyên.**
   - Bài `src/bang-tu-giao-dien.test.ts` (dòng 2) quét mọi chuỗi trong `src/modules/**/*.ts`.
   - §6.2 thêm mục cấm «chính sách» đứng trước tên một cấp. §6.1 lại ghi «Không đổi ở lượt này» cho chi tiết nhật ký, gồm `index.ts:129` (`chính sách ${r.tier_name ?? …}`) và `:535` (`doiTuong: \`chính sách ${muc.name}\``). §12 câu 2 phương án A cũng giữ khuôn này.
   - Hai chuỗi đó, sau khi bài cắt ở `${`, ra đúng «chính sách ». Mẫu mới vì thế làm `npm test` đỏ.
   - Mục cấm này mới chỉ viết bằng lời, chưa có biểu thức chính quy, nên cũng không kiểm được.
   - **Sửa:** viết nguyên văn ba biểu thức của lượt mới. Sau đó chọn một trong hai cách, và ghi rõ trong đặc tả:
     - (a) mẫu không bắt `chính sách ${…}` của nhật ký, kèm một ca kiểm âm cho hai chuỗi này;
     - (b) đưa `:129`/`:535` vào §12 câu 2. Khi đó phương án A phải kèm một ngoại lệ có tên trong bài bảng từ.

### Sửa

2. **«Lượt 4» đã có rồi.** `bang-tu-giao-dien.ts:40` là «Lượt 4 — hỗ trợ», còn `:43` là «Lượt 5 — Trang chủ». Lượt mới phải là lượt 6. Cần sửa ở §6.2, và ở §12 câu 1 («tên mới thứ ba của bảng từ lượt 4»).
   - Phần `thay` của lượt 3 còn một dòng nữa phải viết lại: `:39` («Ngừng · Áp dụng chính sách cho loại · …»). Đặc tả mới kể `:37` và `:53`. Dòng `:39` cũng trái với Q-12 («Áp dụng cấp cho loại»).
3. **Tiêu chí 8 đòi «tiêu điểm vào nút đầu của bảng», nhưng `moBangTruot` không làm vậy.** Hàm này đặt tiêu điểm vào chính khung bảng (`web/bang-truot.ts:70` `dialog.focus()`, khung có `tabindex: -1`). §3.2 lại nói đây là «hành vi sẵn có».
   - **Sửa:** hoặc đổi tiêu chí thành «tiêu điểm vào khung bảng, Tab tới nút đầu», hoặc ghi rằng mã menu tự chuyển tiêu điểm sang nút đầu (hành vi mới, có bài kiểm).
4. **§12 câu 1 phương án B chưa có câu cố định cho hộp hỏi lại.** Câu dự phòng mới có cho `:72`/`:221`. Còn tiêu đề «Khoá cấp «<tên>»?», câu hậu quả («Sau khi khoá…»), `nhanNguyHiem`, chữ huy hiệu và nhãn nhật ký `prc_rate_tier_off/_on` thì chưa có bản «Tắt/Bật». Nếu chủ chọn B thì tiêu chí 4 không kiểm được.
   - **Sửa:** viết nguyên văn bản B cho từng chuỗi.
5. **Chữ huy hiệu cấp khoá «Đã khoá — vẫn áp cho loại đang theo» bỏ sót đối tác có cấp riêng trong cấp đó**, trong khi câu hậu quả ở §5.2 nói «loại và đối tác». Đây đúng là loại rủi ro chữ tiền mà §11 nêu.
   - **Sửa:** «Đã khoá — vẫn áp cho loại và đối tác đang theo».
6. **Bài đối chiếu của §4.4 thiếu dữ liệu vào cho L1, nên người thi công phải đoán.** `nguoiHuongCua` chỉ trả `KHONG_HUONG` khi `vaiMo` có `nhanDoiTac: true` hoặc `roleGroup: "EXTERNAL"` (`rules.ts:72`). Thiếu thì hàm trả `NONE`, và `chonMuc` cũng trả `NONE`, không phải `MISSING/BOOKER_NOT_BENEFICIARY`.
   - Ca «nhóm tắt» (dịch vụ E) cũng chưa nói E có thêm vào tập dịch vụ chung S hay không. Nếu thêm thì L4/L5/L6/L12/L14 thành thiếu 5, không phải 4.
   - **Sửa:** ghi rõ `vaiMo` của L1, và ghi rằng E thuộc một bộ mẫu riêng.
7. **ADR-0151 còn bốn chỗ sai hoặc thiếu.**
   - (a) Đ6 trỏ «đặc tả bản 2 §7». §7 là Quyền; câu hỏi về chi tiết nhật ký nằm ở §12 câu 2.
   - (b) Đ3 đề xuất thêm tham số chữ cho `kiemDoi` (`rules.ts:332`). Nhưng danh sách tệp của phần 2 ở tiêu chí 9 (`pricing/index.ts`, `pricing/repository.ts`, bài mới, bài số đếm route) không có `rules.ts`. Danh sách đó cũng thiếu các tệp giao diện của nút «Đổi cấp» (`web/hoa-hong*.ts`, có thể cả `src/shared/hoa-hong-hien-thi.ts`). Bản thân ADR cũng chưa có danh sách tệp nào. **Sửa:** ghi một danh sách tệp duy nhất trong ADR, rồi để đặc tả trỏ tới đó.
   - (c) Tiêu chí 3 của ADR thiếu HDV và tài khoản lai Kế toán + Đối tác. Bài anh em đều có hai ca này (`src/so-dai-ly-quyen-route.test.ts:176–183`). **Sửa:** thêm vào danh sách ca 403.
   - (d) Đ8, cách gỡ một lần đổi bấm nhầm: bấm «Sửa» và chọn lại cấp cũ sẽ hỏng nếu cấp cũ đang khoá. Lý do là `prc_party_tier_tier_ok` (0118:32) chặn câu chèn, mà đổi ra khỏi cấp khoá lại chính là ca ADR quảng bá. **Sửa:** ghi giới hạn này ra.
8. **Câu của `kiemDoi` không chỉ khác chữ «Mức», mà còn chỉ sai đường cho cấp riêng.** Các câu «Thêm mức mới bắt đầu sau ngày ngừng» và «Dùng Ngừng cho mức cũ, rồi Thêm mức mới» (`rules.ts:335`, `:339`) bảo người dùng làm một việc không có ở cấp riêng.
   - **Sửa:** ghi ở ADR Đ3 rằng tham số chữ phải phủ cả câu chỉ đường («dùng Sửa» hoặc «Ngừng rồi Đặt cấp riêng»). Nếu chủ chọn B ở §12 câu 3 thì ghi đây là chỗ lệch có tên.

### Ghi

- §3.3: trả toast khi không thấy dòng là hành vi mới. Hôm nay `cuonToiDong` lặng lẽ thoát (`hoa-hong-bang.ts:271`). Đặc tả đã nói rõ, nên không chặn.
- Tập dịch vụ S chỉ gồm dịch vụ đang hiện. Một dịch vụ đã ẩn vẫn có thể có đơn bị giữ mà dải cảnh báo không báo. Đây là chỗ lệch thứ hai, câu «lệch một chiều» ở §4.1 chưa nói tới.
- Đếm bản 2 ở DOI-CHIEU («35 A · 1 B») chỉ tính T31 là B, dù phần đặt, sửa, ngừng của T31 là A. Cần ghi rõ cách đếm.
- `src/shared/changelog.ts` chưa có mục cho lần phát hành này. Tệp này được bài bảng từ miễn quét.
- Câu `:73` chỉ bắt lỗi NOT NULL của `prc_role_tier`. Câu chèn của route mới đi qua `:76` (`prc_party_tier.valid_from_date`, đáp 409 «Dòng này vừa được người khác sửa hoặc ngừng»). ADR nói `loiBang` đã dịch lỗi này là đúng.

### Checks run

- **Những chỗ đã sửa từ lần 1:** đọc `git diff 57a401a1 353230c2`, đọc trọn DAC-TA bản 2, ADR-0151, phần «Bổ sung bản 2» của DOI-CHIEU, dòng README, QA1-LAN-1 và hai tệp quyết định của chủ.
- **Trigger chặn cấp khoá:** `prc_role_tier_tier_ok` (0096:47), `prc_commission_rule_target_tier` (0097:77), `prc_party_tier_tier_ok` (0118:32) đều chỉ chặn BEFORE INSERT. Câu đóng (`*_close_only`, 0126:28–53) không bị chặn. Sau 0097 không migration nào DROP các bảng hay trigger này (0097 tự dựng lại trigger của nó).
- **Đọc mức lúc chụp không lọc cờ bật của cấp:** `docBangChoChup` (`index.ts:38–45`), `rules_on` (`repository.ts:30`), `GAN_RIENG_HO_SO` (`repository.ts:128`, có chú thích N-23). Vì thế L11 ra `DU` là đúng.
- **Nhóm dịch vụ đang tắt:** view `v_ctl_service_group` (0090:12) lấy dòng gán mới nhất, không xét nhóm bật hay tắt. Thử tra lấy nhóm từ `groups_of` qua view này (`repository.ts:91`). `/api/catalog` thì qua `nhomChoForm`, trả null cho dịch vụ thuộc nhóm tắt (`nhom-rules.ts:53–58`; `catalog/index.ts:137`). `taiDanhMuc` bỏ trường `groupCode` (`web/so-dai-ly-ui.ts:67–72`).
- **Hướng dẫn Kế toán:** dòng 228 nói Kế toán không tìm được đối tác theo tên. Câu này trái dòng 123 cùng tệp và trái ADR-0141, đặc tả nói đúng. `huong-dan-quan-tri.ts` chỉ có «chính sách điều phối» và «chính sách đăng nhập», nên không phải đổi.
- **Dùng lại `kiemDoi` cho cấp riêng:** chữ ký hàm là `{cu:{validFrom,validTo,daHuy}, tuNgay, homNay, ngayChup}` (`rules.ts:332`). `dongCoNgay` và `qGanRieng` đã dùng được với dòng cấp riêng (`index.ts:93–94`). `nutDoiNgung` (`hoa-hong-hien-thi.ts:193–199`) chỉ hiện nút cho dòng đang áp, chưa huỷ, chưa có ngày ngừng, tức khớp đúng các ca `kiemDoi` cho qua.
- **Hai mã nhật ký dùng lại:** `prc_party_tier_set` và `prc_party_tier_closed` có ở `audit-actions.ts:105–106`.
- **Không migration, không đổi contracts:** `party_tier_close` có khoá lạc quan (`repository.ts:144`). Khuôn `role_tier_change_insert` và `cauDoiChinhSach` ở `:114`, `:232`. `defineSql` tự ghi danh câu SQL (`src/shared/sql-registry.ts:14`). `HoaHongHoSoResponse` có `vai`, `xungDot`, `mucRieng.id`, `ganRieng[].{conHieuLuc, daHuy}` (`contracts.ts:2812–2830`).
- **Route và khuôn của route Đổi:** dò đủ 30 route pricing, mọi route ở bảng §3.1 đều có thật. Đọc thân route `/muc-ta/gan/:id/doi` (`index.ts:442–471`): thứ tự kiểm khớp ADR Đ3, đi trong một `db.batch` qua `chayLo`, và không kiểm cờ bật của cấp cũ, nên đổi ra khỏi cấp khoá làm được.
- **Số dòng ở §6.1:** khớp từng dòng, gồm `index.ts` 67, 69, 70, 72, 73, 190, 221, 424, 438, 446, 454, 467, 477, 485, 508, 570, 582, 591, 599, 620 và `rules.ts` 374, 375, 377, 386, 395, 402. Grep chuỗi trong `src/modules` không thấy câu báo lỗi nào bị bỏ sót. Các bài kiểm có ghim câu chữ đều đã nằm trong danh sách §6.3.
- **Số ADR 0151 còn trống:** `git ls-tree` và `git grep "0151"` trên mọi `refs/heads` và `refs/remotes` (tôi không fetch, vì việc này chỉ đọc), cộng thư mục `docs/adr` của 21 worktree. Chỉ nhánh này có 0151.
- **Thành phần giao diện:** `.nut` bắt đầu ở `app.css:3943`. `.huy-hieu` có các tông `bien/la/cat/do/xam` (3977–3982), `.dai` có `cat` (4010), `.tab-phu[data-kieu="vien"]` có (4003). `hoiXacNhan` có các tham số `tieuDe/hauQua/nhanNguyHiem` (`bang-truot.ts:85`). `moBangTruot` lo việc Esc, làm trơ nền (`inert`) và trả tiêu điểm (52–70).
- **Tính tay §4.4** (D = 2026-11-01; S = A/G1, B/G1, C/G2, D'/null):
  - L9: A ăn ở bậc 4 nhờ dòng SERVICE A; B, C, D' rơi xuống bậc 9 nhờ dòng ALL của T1, nên `DU`.
  - L10: G1 phủ A, B; SERVICE C phủ C; D' không nhóm, mà dòng GROUP cần nhóm khác null (`rules.ts:84`), nên `THIEU` 1.
  - L11: cờ khoá không được lọc, nên `DU`.
  - L13: `hieuLuc` tính cả ngày kết thúc (`denNgay ≥ D`), nên `DU`.
  - L14: lần xếp đã huỷ bị bỏ khỏi `gan`, nên `NO_RULE`, tức `KHONG_CO` 4.
  - L5: dòng của T3 chưa tới ngày, và lần xếp không phải sắp áp, nên `KHONG_CO`, không phụ chú. L6: lần xếp sắp áp, nên có phụ chú.
  - Câu nhắc cấp: T4 ra «1 dịch vụ…: D'», T6 có dòng đã hết và không dòng sắp áp, ra «Hôm nay cấp này chưa áp mức nào.»
  - Tổng: `KHONG_CO` 5 + `THIEU` 3 = 8 loại thiếu; `TAT` 1; `DU` 5 (L2, L3, L9, L11, L13); cộng 14. Khớp đặc tả.
- **Câu hậu quả tắt loại:** khớp `nguoiHuongCua` (`rules.ts:61–74`). Bản chụp không bị chụp lại (`orders/index.ts:957`).
- Không sửa tệp nào, không đổi trạng thái git, không gọi tác nhân con.