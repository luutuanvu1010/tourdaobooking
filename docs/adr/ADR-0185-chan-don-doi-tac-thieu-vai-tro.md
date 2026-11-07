# ADR-0185 — Đơn của tài khoản Đối tác chưa gán vai trò đối tác (phát hiện T-01): chặn ở bước xác nhận, đóng đường tạo tài khoản kiểu cũ, soát tài khoản đang có

- **Trạng thái:** **proposed** 2026-11-08 — AI soạn theo yêu cầu của phiên rà soát trước ngày dùng thật lần 2; chủ dự án chưa duyệt, chưa có mã. Việc chạm quyền và tiền nên AI chỉ đề xuất, không tự quyết (Hiến pháp N3, P8).
- **Số:** 0185. Đã soát ngày 8/11: `main`, mọi nhánh cục bộ và nhánh trên GitHub, mọi thư mục trong `.claude/worktrees/` — số lớn nhất đang dùng là 0184. Giữ chỗ ở thư mục ghi chú chung của nhóm phiên.
- **Nguồn:** hồ sơ rà `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/` (README; phụ lục 01 mục T-01, phần «phiên điều phối tự kiểm lại», câu đọc ở mục 10). Ngày 8/11 hồ sơ còn ở nhánh `claude/kind-wu-98f2cd`, chưa nhập `main`. Mọi dẫn chứng mã dưới đây đọc lại trên `main` @`984bee7d`.
- **Ngày:** 2026-11-08. **Loại:** việc lớn (quyền, tiền) — thi công xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Cửa:** hai chiều. Không sửa dòng dữ liệu nào đang có, không đổi bản chụp hoa hồng hay mốc chụp. Cổng và hàm từ chối gỡ được; trigger là migration chỉ thêm, bỏ được bằng migration mới.
- **Hiến chương áp dụng (Phần I, đã duyệt):** 2.3 (điều khoản thương mại gắn vào vai trò, hồ sơ, không gắn vào tài khoản), 5.1 (bất biến hai lớp), 5.6 (giữ nguyên mốc chụp lúc xác nhận), **5.7** (thiếu cài đặt thì giữ ở bước hiện tại, nói lý do và ai xử lý, không bao giờ lấy 0), 5.27 (chữ câu báo do chủ chọn), 6.1–6.2.
- **Quan hệ với ADR cũ:** không thay câu nào của ADR đã duyệt.
  - Bổ sung ADR-0077 điều 3 (i). Lời chủ 2026-10-08 thu hẹp việc ép bên đặt (chỉ ép khi hồ sơ mang vai được hưởng) để lại đúng chỗ hở ADR-0077 đã cảnh báo: «đơn đại lý bị tính như khách lẻ (không hoa hồng) một cách lặng lẽ». ADR này lấp chỗ đó ở bước xác nhận, không đổi luật ép bên đặt.
  - Thêm một cổng cho «Gửi đơn» (ADR-0136 Đ13); Đ13.5 giữ nguyên. Giữ ADR-0146 R-7: luật bán vẫn đứng đầu cổng xác nhận, cổng mới đứng ngay sau.
  - Mở rộng ADR-0083 điều 1b: đường kiểu cũ không chỉ chặn tài khoản lai mà từ chối hẳn quyền bên ngoài.
  - Khớp ADR-0180 Đ1.5 (Toàn quyền đóng vai Đối tác bị từ chối ghi vì không có hồ sơ đối tác là hành vi đúng). Giữ ADR-0117 Q1 = A, ADR-0155 C3.
- **Xây trên lỗ đang hở:** không. Đã đọc `docs/quyen-hoan.json`: mục phát hiện `TNV-G1`, `HC-5.19`, `HC-5.11`, `HC-4.2`; mục thao tác `task.progress`, `dispatch.guides.view`, `invoice.request`, `invoice.issue`. ADR này không chạm sổ tiền, điều chỉnh công nợ, khôi phục hay Cron. Riêng ca hiếm: nếu soát thấy đơn đã qua «Khách đã trả đủ» mà hoa hồng ghi «không người hưởng», đường sửa duy nhất là điều chỉnh công nợ, thuộc vùng `HC-4.2`; ADR này không quyết ca đó, gặp thì trình chủ riêng.
- **Phát hành:** từ 0 giờ ngày 16/11, mục `HC-5.11` quá hạn làm `npm test` đỏ, nên `npm run day-len` dừng cho tới khi chủ quyết mục đó. Câu kiểm mới của Đ3 chỉ lên sau khi chủ soát xong tài khoản.
- **Số quyết định chạm quyền, dữ liệu trong lượt duyệt:** 3 (Đ1, Đ2, Đ3); trang ghép ở cuối tệp (`CLAUDE.md` §9).

## Tóm tắt cho chủ (lời thường)

Tài khoản Đối tác tạo theo kiểu cũ chỉ mang quyền Đối tác, còn hồ sơ của họ không có vai trò đối tác nào (Công ty lữ hành, Cộng tác viên…). Vì vậy máy không biết họ là đại lý, và đơn họ tự lập được tính như khách lẻ: hoa hồng 0, đơn không bị giữ, không ai được báo. Hồ sơ rà 7/11 xếp đây là lỗi duy nhất chặn việc mở cho Đối tác tự lập đơn.

Đề xuất gồm ba việc, mỗi việc có một phương án khuyến nghị:

1. **Đ1:** máy chủ không cho đơn như vậy qua bước «Gửi đơn». Đơn ở lại dạng nháp, không mất gì, và câu báo nói rõ phải nhờ Tour Đảo gán vai trò.
2. **Đ2:** đóng ba đường còn sinh ra tài khoản kiểu này và thêm một lớp chặn ở cơ sở dữ liệu. Đường cũ vẫn dùng được cho tài khoản nhân viên.
3. **Đ3:** chủ soát một lần các dòng «Đối tác (chưa gán vai trò)» ở màn Quản lý tài khoản và gán đúng vai trò; sau đó máy tự kiểm sau mỗi lần triển khai.

Đối tác tạo đúng cách và đơn do văn phòng lập không đổi gì. Cái giá chính: đối tác bị cấu hình sai sẽ không gửi được đơn cho tới khi được gán vai trò (việc khoảng một phút), và dữ liệu thử của bộ kiểm phải gieo lại tài khoản Đối tác cho đúng.

## Hiện trạng (đọc từ mã, `main` @`984bee7d`, 8/11)

1. **Ai được hưởng hoa hồng.** `nguoiHuongCua` (`src/modules/pricing/rules.ts`) xét vai trò của **bên đặt**: mang vai được hưởng thì tính hoa hồng; mang vai bên ngoài không được hưởng thì giữ đơn (ADR-0117 Q1 = A); không có cả hai thì «không người hưởng» — hoa hồng 0, không giữ, không báo (ADR-0077 điều 3: đúng cho khách lẻ).
2. **Bên đặt của đơn Đối tác tự lập.** Máy chủ chỉ ép bên đặt là hồ sơ của tài khoản khi hồ sơ đó mang vai được hưởng (`benDatChoTaiKhoan`, `src/shared/booker.ts`; gọi lúc lập đơn và lưu nháp qua `benDatCuaTaiKhoan`, `src/modules/orders/index.ts`). Tài khoản kiểu cũ không thoả, nên form hiện ô tra khách theo số điện thoại (`khoiBenDatForm` kiểu `tra-sdt`); bên đặt là khách hoặc trống, và bản chụp ra «không người hưởng».
3. **Một cổng cho mọi đường xác nhận.** `kiemCongXacNhan` (`src/modules/orders/xac-nhan-chung.ts`) chạy ở Gửi đơn (trước khi chia nhánh A mở yêu cầu kiểm vé và nhánh B xác nhận ngay), ở Còn vé (`POST /api/orders/:id/quyet-dinh`) và ở xác nhận thường (`/status`). Cổng này tính bản chụp hoa hồng; luật bán đứng đầu (ADR-0146 R-7). Người lập giữ quyền Đối tác chỉ còn nút Gửi đơn (ADR-0136 Đ13.5, `phaiGuiDon`). Đơn nháp không ghi được khoản thu (ADR-0135). Form chỉ tự «lưu rồi gửi» với đơn mới; đơn nháp đã có thì bấm Gửi đơn ở trang đơn, không lưu lại.
4. **Ba đường sinh tài khoản kiểu cũ:**
   - (a) nhánh «Đường CŨ … danh sách quyền» của `POST /api/staff` (`src/modules/accounts/index.ts`): không nút nào dùng, chỉ tới được bằng gọi thẳng máy chủ;
   - (b) khối «Quyền cũ» của màn Quản lý tài khoản (`web/staff.ts`, biến `quyenCu`; chỉ Toàn quyền thấy, với tài khoản chưa gán vai trò), gọi `PUT /api/staff/:id/permissions`;
   - (c) `insertStaffSql` (`scripts/staff-lib.mjs`, luôn gieo vai `STAFF`), dùng ở cửa khẩn cấp `scripts/create-staff.mjs`, ở `lam-moi-dev.mjs`, `dev-iphone.mjs` và hàm gieo của bộ thử toàn luồng `gieoTaiKhoanLai`.

   Màn tạo tài khoản mới luôn gửi vai trò nên không dính. Ô «Đặt qua đối tác» chỉ liệt kê người được hưởng (`find_beneficiaries`), nên Bán hàng không chọn nhầm hồ sơ kiểu cũ.
5. **Đã soát, không có đường thứ tư.** Chỉ năm vai trò đối tác «Có sẵn» sinh quyền Đối tác (`ROLES`, `src/shared/roles.ts`). Năm vai này không tắt được qua màn hình (`doiTrangThaiLoai` chỉ nhận vai trò do Kế toán thêm). Cộng tay quyền Đối tác vào vai nội bộ hay Tài xế đối tác đã bị chặn (ADR-0083 1e, LC-1b). Vai trò do Kế toán thêm không gắn được lên hồ sơ đang có vai `STAFF` (trigger migration 0095). Muốn rơi vào ca này bằng đường khác thì phải sửa dữ liệu bằng SQL tay.
6. **Lớp CSDL hiện có chỉ canh một chiều.** LC-1 (`lc1_stf_permission_external_partner_only`, migration 0037): hồ sơ có vai bên ngoài thì tài khoản chỉ giữ quyền bên ngoài. Chiều ngược «giữ quyền Đối tác thì hồ sơ phải có vai trò đối tác» chưa có ở CSDL lẫn máy kiểm bất biến (`scripts/audit-checks.mjs`: R-LC-1, R-LC-1b, R-LC-3 canh chỗ khác).
7. **Đơn đã lỡ chụp «không người hưởng».** «Ghi mức tay» bị từ chối (409 `khong_nguoi_huong` — không có người hưởng để ghi); «Chụp bù» chỉ áp đơn chưa có bản chụp. ADR-0077 điều 9: đổi bên đặt thì máy chụp lại mọi dòng — chưa ai chạy thử đường này với đơn đã chụp «không người hưởng».
8. **Số tài khoản như vậy trên bản thật: CHƯA KIỂM** (AI không đọc bản thật).
9. **Dữ liệu thử đang có đúng hình dạng lỗi.** `gieoTaiKhoanLai` (`tests/e2e/lib.mjs`) gieo tài khoản qua `insertStaffSql`; khoảng 23 tệp kịch bản toàn luồng có quyền Đối tác trong danh sách gieo, một số kèm Bán hàng (tài khoản lai). Theo hồ sơ rà, nền `setup()` của khung thử `tests/audit/harness.mjs` có hai tài khoản Đối tác không vai trò. Khung thử của bài kiểm thường: chưa đo. Các số này đếm bằng tìm chữ; kế hoạch phải đo lại.

## Quyết định cần chủ chốt

### Đ1 — Máy chủ làm gì khi đơn do tài khoản Đối tác lập không xác định được người hưởng

**Điều kiện, dùng chung cho mọi phương án:** người lập đơn giữ quyền Đối tác **và** người hưởng tính ở bước xác nhận ra «không người hưởng». Xét trên **kết quả** nên bắt được mọi nguyên nhân: tài khoản kiểu cũ, tài khoản chưa gắn hồ sơ, đơn nháp lưu lúc chưa có vai trò rồi mới được gán (bên đặt đã lưu vẫn là khách), dữ liệu sửa tay. Xét theo **người lập**, không theo người bấm, vì ở Còn vé người bấm là văn phòng.

- **(a) Khuyến nghị — từ chối có câu báo, đơn ở lại dạng nháp.**
  - Cổng mới trong `kiemCongXacNhan`, đứng **ngay sau cổng luật bán** (giữ câu «luật bán đứng đầu» của ADR-0146 R-7) và trước mọi cổng khác, vì nhiều cổng sau (hạn mức Trả sau, trần giảm giá) đọc bên đặt, mà bên đặt lúc này đang sai. Luật bán xét vai trò của bên đặt; ở các đơn này bên đặt là khách hoặc trống nên luật bán không có gì để chặn (suy từ mã). Cổng cần biết người hưởng sớm hơn chỗ đang tính bản chụp; kế hoạch chọn cách (đọc bảng chụp lên trước, hoặc dùng hàm công bố của `pricing`).
  - Trả 409 (mã đề xuất `doi_tac_chua_co_vai_tro`) và không ghi gì: không xác nhận, không mở yêu cầu kiểm vé, không bản chụp, không nhật ký. Đơn nháp còn nguyên. Vì đơn nháp không ghi được khoản thu, giữ ở nháp không làm lệch tiền.
  - Đây là cách áp Hiến chương 5.7: đơn bị giữ ở bước hiện tại, câu báo nói lý do và ai xử lý, xử lý xong thì gửi lại được.
  - Câu báo, mỗi ca một câu (chữ chờ chủ chọn theo 5.27):
    - Đối tác, tài khoản chưa có vai trò: «Tài khoản của bạn chưa được gán vai trò đối tác nên chưa gửi được đơn. Đơn vẫn được giữ ở dạng nháp. Vui lòng báo Tour Đảo, rồi bấm Gửi đơn lại.»
    - Đối tác đã được gán, nhưng đơn nháp lưu từ trước: «Đơn nháp này lưu khi tài khoản chưa có vai trò đối tác. Bấm Sửa, lưu lại đơn rồi Gửi đơn.» (Lưu lại thì máy chủ ép lại bên đặt.)
    - Văn phòng ở Còn vé: «Người lập đơn là tài khoản Đối tác chưa gán vai trò đối tác. Quản trị, Nhân sự hoặc Toàn quyền gán vai trò ở màn Quản lý tài khoản; người lập Rút lại, lưu lại đơn rồi gửi lại.»
  - Không chặn lập và lưu nháp. Form lập đơn hiện dải báo ngay khi tài khoản giữ quyền Đối tác mà máy chủ không ép bên đặt (trường `benDatCuaToi` của `/api/auth/me` rỗng), để đối tác biết trước khi gõ.
  - Cách biết «người lập giữ quyền Đối tác» (ADR-0180 Đ1.4 đòi ghi rõ): ở Gửi đơn, người bấm là người lập, xét theo bộ quyền hiệu lực của phiên, nên Toàn quyền đang «xem như» Đối tác cũng bị áp; ở Còn vé, xét theo quyền thật của người lập (hàm tiêm từ gốc lắp ráp theo id người lập, khuôn `cauCocKhiXacNhan`).
  - **Được:** không đơn Đối tác nào ra hoa hồng 0 im lặng, dù tài khoản sai vì đường nào; một chỗ kiểm cho mọi đường xác nhận; không thêm việc cho Kế toán; không migration, không đổi bản chụp; gỡ được.
  - **Mất:** đối tác bị cấu hình sai không gửi được đơn cho tới khi được gán vai trò; đơn nháp cũ phải lưu lại một lần; Toàn quyền đóng vai Đối tác không gửi được đơn nữa (đúng ADR-0180 Đ1.5, nhưng đổi cách chủ đang thử: muốn thử trọn luồng thì dùng một tài khoản đối tác thử có vai trò, hoặc bản Development); tài khoản lai Bán hàng + Đối tác (chỉ còn trong dữ liệu thử) cũng bị từ chối; bộ thử phải gieo vai trò đối tác cho mọi tài khoản Đối tác, và kịch bản đi tới «Khách đã trả đủ» phải gieo thêm mức hoa hồng, nếu không đơn sẽ bị giữ như T-02.
- **(b) Cho qua, giữ đơn ở «Khách đã trả đủ» chờ Kế toán.** Đơn vẫn xác nhận, khách vẫn đi; bản chụp ghi «thiếu mức» thay vì «không người hưởng», và hai lớp giữ có sẵn chặn bước «Khách đã trả đủ».
  - **Được:** không chặn bán.
  - **Mất:** cột lý do thiếu mức của bảng bản chụp bị khoá danh sách ở CSDL (`CHECK`, migration 0090), nên thêm lý do mới là dựng lại một bảng tiền chỉ-thêm (một chiều, nặng); mượn lý do «bên đặt không thuộc danh sách được hưởng» thì sai nghĩa vì bên đặt là khách, và câu giữ sẽ chỉ sai việc. «Ghi mức tay» không chạy vì không có người hưởng, nên mỗi đơn phải gán vai trò rồi văn phòng «Đổi khách» sang hồ sơ đối tác. Đối tác có thể đã thu tiền khách trong lúc đơn bị giữ. Nhiều đối tác sai cùng lúc thì việc dồn về Kế toán.
- **(c) Không chặn ở đơn**, chỉ làm Đ2 và Đ3.
  - **Được:** không đụng luồng đơn và tiền.
  - **Mất:** tài khoản sai chưa soát tới, tài khoản sửa bằng SQL tay, đơn nháp lưu trước khi gán vai trò vẫn ra hoa hồng 0 im lặng; chỉ phát hiện sau, khi máy kiểm chạy hoặc đối tác khiếu nại.

**Về luật kiến trúc:** cổng không mở thêm việc gì cho ai theo vai trò; nó chỉ từ chối khi điều khoản thương mại của đơn (gắn vào vai trò, hồ sơ — Hiến chương 2.3) chưa xác định được, cùng khuôn các cổng «thiếu cài đặt» khác. `orders` chỉ đọc kết quả của `pricing` (bản chụp, `nguoiHuongCuaHoSo` / `laNguoiHuong`), không đọc bảng vai trò (`src/architecture.test.ts`). Vì `src/CLAUDE.md` mới liệt kê hai chỗ dùng vai trò để «chỉ siết» (công ty chủ, luật bán), khi thi công AI đề xuất thêm dòng thứ ba; đó là sửa tệp luật nên AI chỉ đưa diff, chủ duyệt (Hiến pháp N9).

### Đ2 — Đường tạo, sửa tài khoản bằng danh sách quyền

- **(a) Khuyến nghị — đóng với quyền bên ngoài, thêm lớp CSDL, giữ cho quyền nội bộ.**
  1. Một hàm thuần mới ở `src/shared/roles.ts` (cạnh `laiNoiBoBenNgoaiProblem` của ADR-0083): danh sách quyền gửi theo đường kiểu cũ có quyền bên ngoài (Đối tác, Tài xế đối tác) thì từ chối 400, câu đề xuất «Tài khoản Đối tác hoặc Tài xế đối tác phải tạo bằng cách chọn vai trò.» (chờ chủ chọn câu). Áp ở nhánh không vai trò của `POST /api/staff` và ở `PUT /api/staff/:id/permissions`. `insertStaffSql` nhận thêm vai trò đối tác; có quyền Đối tác mà không kèm vai trò thì ném lỗi, nên cửa khẩn cấp không còn tạo được tài khoản đối tác thiếu vai trò.
  2. Giao diện: khối «Quyền cũ» bỏ hai ô Đối tác và Tài xế đối tác.
  3. Lớp CSDL (Hiến chương 5.1, khuôn LC-1): trigger mới trên `stf_permission` (tên đề xuất `lc1c_stf_permission_partner_needs_role`). Mở dòng quyền Đối tác mà hồ sơ của tài khoản không mở vai nhóm bên ngoài và không mang vai trò do Kế toán thêm thì từ chối. Đọc qua view của `parties` (`v_pty_open_role_group`, `v_pty_party_partner_label`) như LC-1. Lô tạo tài khoản theo vai trò ghi vai trò trước quyền nên không vướng. Trigger chỉ canh lúc mở quyền, không thấy vai trò bị đóng về sau: cổng Đ1 là lưới cuối, trigger là phòng ngừa.
  4. Phạm vi: hàm ở mục 1 từ chối cả Tài xế đối tác (cùng nghĩa «quyền bên ngoài»); trigger chỉ áp cho quyền Đối tác. Chiều «giữ quyền Tài xế đối tác thì phải có vai Tài xế đối tác» ngoài phạm vi vì không chạm tiền.
  - **Được:** không còn đường nào sinh tài khoản Đối tác thiếu vai trò, kể cả SQL tay; tài khoản nhân viên cũ chưa gán vai trò vẫn đổi quyền như nay.
  - **Mất:** dữ liệu thử phải gieo vai trò đối tác (việc Đ1 cũng buộc); không gieo được tài khoản lai Bán hàng + Đối tác nữa (bản thật đã cấm từ ADR-0083). Một ca hiếm phải xếp lại: đổi thẳng tài khoản đang giữ Quản trị sang vai trò đối tác thì `PUT /api/staff/:id/roles` chạy lô quyền trước lô vai trò (nhánh gỡ Quản trị), trigger sẽ chặn; kế hoạch xếp lại thứ tự hoặc từ chối có câu.
- **(b) Như (a) nhưng không có trigger.** Rẻ hơn một chút (dữ liệu thử vẫn phải sửa vì Đ1). Mất: SQL tay và kịch bản cũ còn tạo được tài khoản sai; chỉ cổng Đ1 và câu kiểm Đ3 bắt.
- **(c) Bỏ hẳn đường danh sách quyền** (trả lời câu «có bỏ hẳn không»): `POST /api/staff` không kèm vai trò trả 400, `PUT …/permissions` ngừng, kịch bản khẩn cấp phải ghi vai trò.
  - **Được:** chỉ còn một cách cấp quyền.
  - **Mất:** khoảng 14 kịch bản toàn luồng tạo tài khoản bằng danh sách quyền và khoảng 8 kịch bản dùng `PUT …/permissions` phải viết lại; tài khoản nhân viên «chưa gán vai trò» phải chuyển sang vai trò trước khi đổi quyền (số trên bản thật chưa kiểm).
  - **Khuyến nghị:** chưa làm lần này; làm khi màn Quản lý tài khoản không còn dòng «(chưa gán vai trò)» nào.

### Đ3 — Tài khoản kiểu cũ đang có, và máy tự kiểm về sau

- **Khuyến nghị:**
  1. **Soát một lần, trước khi mở cho Đối tác tự lập đơn** (cũng là mục 2 của danh sách «dữ liệu phải có» trong hồ sơ rà). Lối chính là màn hình: ở Quản lý tài khoản, tìm dòng «Đối tác (chưa gán vai trò)» (nhãn do `accessLabel` ghi), bấm Sửa, chọn đúng vai trò (Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi (giới thiệu khách), Cộng tác viên), lưu. Không có migration tự gán, vì máy không biết người đó là loại đại lý nào (5.7: không đoán). Muốn chính xác hơn, chủ tự chạy câu đọc của hồ sơ rà (chỉ đọc; đã thử đúng trên khung thử ngày 7/11; AI không chạy trên bản thật, `CLAUDE.md` §8):

     ```sql
     SELECT s.id, s.party_id FROM staff s JOIN stf_permission p ON p.staff_id = s.id AND p.permission_type_code = 'PARTNER' AND p.valid_to_at IS NULL WHERE s.active = 1 AND NOT EXISTS (SELECT 1 FROM v_pty_open_role_group g WHERE g.party_id = s.party_id AND g.role_group = 'EXTERNAL') AND NOT EXISTS (SELECT 1 FROM v_pty_open_role r JOIN v_pty_role_type t ON t.code = r.role_type_code WHERE r.party_id = s.party_id AND t.role_group = 'OTHER' AND t.is_partner_label = 1);
     ```

  2. **Đơn của các tài khoản đó.** Đơn nháp: sau khi gán vai trò, đối tác mở đơn, Sửa, lưu lại (máy chủ ép lại bên đặt), rồi Gửi đơn. Đơn đã xác nhận, chưa «Khách đã trả đủ», hoa hồng «không người hưởng»: văn phòng dùng «Đổi khách» chọn hồ sơ đối tác làm bên đặt; theo ADR-0077 điều 9 máy sẽ chụp lại hoa hồng (chưa chạy thử với ca này; kế hoạch phải có ca thử). Đơn đã «Khách đã trả đủ»: ngoài phạm vi (xem dòng «Xây trên lỗ đang hở»). Kế hoạch soạn thêm câu đọc liệt kê các đơn này, thử trên dữ liệu thử trước khi đưa chủ chạy.
  3. **Câu kiểm bất biến mới** (mã đề xuất `R-LC-1c`, mức `fail`): «tài khoản đang hoạt động giữ quyền Đối tác mà hồ sơ không mở vai nhóm bên ngoài và không mang vai trò do Kế toán thêm» — cùng điều kiện với câu đọc ở mục 1 và với trigger Đ2. Câu chạy sau mỗi lần `npm run trien-khai` (báo «KHÔNG ĐẠT» ở bản tóm tắt; không gỡ bản vừa triển khai) và ở cuối `npm run test:e2e`. Vì vậy thứ tự là: sửa dữ liệu thử, chủ soát xong tài khoản, rồi mới phát hành bản có câu này.
- **Phương án khác:** để câu kiểm ở mức `warn` — không đỏ khi còn tài khoản sai, nhưng dễ bị bỏ qua. Không khuyến nghị, vì đây là lỗi tiền im lặng.

## Máy canh: chứng minh lớp chặn hoạt động

Hàng rào chỉ được tin khi đã thấy nó chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên → xanh) và có dòng ở `docs/SO-HANG-RAO.md` (Hiến chương 6.2, Hiến pháp P16); tới lúc đó ghi «dựa vào kỷ luật». Bài viết đỏ trước, xanh sau.

| Hàng rào | Chặn cái gì | Bài kiểm (đề xuất) | Phép phá để thấy đỏ |
|---|---|---|---|
| H1 — cổng Đ1 | Đơn do tài khoản Đối tác lập được xác nhận, hoặc được mở yêu cầu kiểm vé, với người hưởng «không người hưởng» | Bài đường thật trên khung thử: Gửi đơn nhánh A và nhánh B, Còn vé của văn phòng, đơn nháp lưu trước khi gán vai trò | Bỏ dòng gọi cổng trong `kiemCongXacNhan` |
| H2 — hàm Đ2 | Đường kiểu cũ cấp quyền bên ngoài | Bài route `POST /api/staff`, `PUT …/permissions`; bài `insertStaffSql` | Bỏ lời gọi hàm ở từng đường, mỗi đường một lần |
| H3 — trigger Đ2 | Dòng quyền Đối tác mở cho hồ sơ thiếu vai trò đối tác, kể cả SQL tay | Bài CSDL thật (SQLite + migration), khuôn bài của LC-1 | Bỏ trigger trên bản sao tạm |
| H4 — câu kiểm Đ3 | Tài khoản sai đã nằm trong dữ liệu mà không ai biết | Ca trong `src/audit-invariants.test.ts`: gieo một tài khoản sai → đếm 1; gán vai trò → 0 | Đổi điều kiện của câu |
| H5 — bộ thử toàn luồng | Dữ liệu thử còn gieo tài khoản sai | Một kịch bản Đối tác không vai trò bị từ chối Gửi đơn; `audit-invariants` cuối bộ thử ĐẠT | Xanh ở cuối là bằng chứng dữ liệu thử đã đúng |

## Tiêu chí nghiệm thu (hành vi kiểm được)

1. Tài khoản Đối tác có hồ sơ chỉ mang vai `STAFF` lập nháp không cần kiểm vé, bấm Gửi đơn → 409 câu ca 1; đơn vẫn nháp; không có dòng bản chụp, không có nhật ký `confirmed`.
2. Như trên với đơn cần kiểm vé → 409; không mở yêu cầu kiểm vé.
3. Gán vai trò Công ty lữ hành cho tài khoản đó, bấm Gửi đơn ngay ở trang đơn → 409 câu ca 2; Sửa, lưu lại, Gửi đơn → qua; bản chụp có người hưởng là hồ sơ đối tác.
4. Yêu cầu kiểm vé đã mở từ trước (gieo thẳng) cho đơn của tài khoản như vậy; văn phòng bấm Còn vé → 409 câu cho văn phòng; đơn không xác nhận.
5. Toàn quyền đang «xem như» Đối tác bấm Gửi đơn → 409; Toàn quyền không đóng vai gửi nháp của mình → như hôm nay.
6. Đơn văn phòng lập cho khách lẻ, và đơn văn phòng «Đặt qua đối tác» → xác nhận như hôm nay.
7. `POST /api/staff {permissions:["PARTNER"]}` → 400; `PUT …/permissions` thêm Đối tác → 400; `insertStaffSql` với Đối tác không kèm vai trò → ném lỗi; khối «Quyền cũ» không còn ô Đối tác, Tài xế đối tác (kịch bản Chrome của màn Quản lý tài khoản).
8. Chèn thẳng dòng quyền Đối tác cho tài khoản mà hồ sơ không có vai trò đối tác → CSDL từ chối; tạo tài khoản Công ty lữ hành ở màn tạo → qua.
9. `R-LC-1c` đếm 1 với tài khoản sai đã gieo, 0 sau khi gán vai trò; `npm run test:e2e` chạy tới `audit-invariants` cuối cùng ĐẠT.
10. H1–H4 có dòng ở `docs/SO-HANG-RAO.md` kèm ngày thấy chặn thật; `npm test`, `npm run typecheck`, e2e xanh; người kiểm độc lập chỉ đọc ĐẠT.

## Kế hoạch thi công (sau khi chủ duyệt)

1. Đo trước: liệt kê mọi bài kiểm và kịch bản gieo tài khoản Đối tác không vai trò hoặc tài khoản lai; ghi số vào kế hoạch.
2. Sửa dữ liệu thử trước: `insertStaffSql` và `gieoTaiKhoanLai` gieo vai trò đối tác khi có quyền Đối tác; kịch bản cần «Khách đã trả đủ» gieo mức hoa hồng; bỏ hoặc đổi các ca tài khoản lai.
3. Đ1: cổng, câu báo, dải báo ở form lập đơn. Đ2: hàm thuần, khối «Quyền cũ», trigger (migration số = lớn nhất trong `migrations/` của `main` lúc gộp + 1; hôm nay `main` tới 0146). Đ3: câu kiểm, câu đọc đơn.
4. Tài liệu: `docs/SYSTEM-DESIGN.md` (luồng Gửi đơn, tài khoản), `docs/CHANGE-GUIDE.md`, `docs/SO-HANG-RAO.md`, `docs/BANG-THAM-CHIEU.md` (câu chủ chọn); đề xuất dòng thứ ba cho danh sách «chỉ siết» ở `src/CLAUDE.md`.
5. Người kiểm độc lập chỉ đọc; chủ soát tài khoản (Đ3 mục 1); rồi phát hành theo `docs/HANDOFF-N1.md`.

## Việc không đổi

Đơn do văn phòng lập (khách lẻ hay «Đặt qua đối tác»); tài khoản Đối tác tạo đúng cách (vẫn bị ép bên đặt là chính họ, hoa hồng tính như nay); luật ép bên đặt (lời chủ 2026-10-08); mốc chụp lúc xác nhận; LC-1 và R-LC-1; ADR-0117 Q1 = A. T-02 (đơn đại lý xác nhận lúc chưa có mức hoa hồng) là việc riêng.

## Trang ghép (`CLAUDE.md` §9)

1. **Bảng chạm và loại thực thể trong đó.**
   - `stf_permission` (quyền của tài khoản): chứa quyền của tài khoản nội bộ, Đối tác, Tài xế đối tác. Đ2 thêm trigger chỉ chặn mở dòng quyền Đối tác khi hồ sơ thiếu vai trò đối tác; đường ghi kiểu cũ từ chối quyền bên ngoài. Không sửa dòng nào đang có.
   - `pty_party_role` (chỉ đọc qua view của `parties`): chứa vai nội bộ (nhóm INTERNAL), vai cũ `STAFF`/`SALES` (nhóm OTHER, đã ngưng — đúng hình dạng tài khoản kiểu cũ), năm vai trò đối tác «Có sẵn» và Tài xế đối tác (nhóm EXTERNAL), vai trò do Kế toán thêm (nhóm OTHER có cờ), các vai phân loại khác. ADR này không ghi gì vào đây; việc soát ở Đ3 gán vai trò qua đường có sẵn (`PUT /api/staff/:id/roles`).
   - `ord_service_terms` (bản chụp hoa hồng): không thêm loại dòng, không đổi cột. Đ1 (a) chỉ làm lô xác nhận không chạy, nên không còn bản chụp «không người hưởng» cho đơn của Đối tác. Chỉ Đ1 (b) mới đổi bảng này.
   - `orders` và bảng yêu cầu kiểm vé: không đổi; đơn bị từ chối ở lại nháp.
2. **Dòng bản đồ quyền chạm tới.** Không thêm ô, không đổi giá trị ô nào, nên các bài «tập con quyền» không phải nhân đôi.
   - `order.submit` (Đối tác `own`, Toàn quyền `any`): cổng mới đứng sau `can()`; áp khi người lập giữ quyền Đối tác theo bộ quyền hiệu lực, gồm Toàn quyền đang «xem như» Đối tác. Toàn quyền không đóng vai gửi nháp của mình thì không bị áp.
   - `order.confirm.review` (Còn vé, văn phòng): cổng áp theo quyền thật của người lập.
   - `order.modify` (`/status`): ADR-0136 Đ13.5 đã đóng đường này với người lập giữ quyền Đối tác; cổng chung vẫn chạy như lưới.
   - `account.create`, `account.edit`, `admin.manage.superadmin` (`POST /api/staff`, `PUT …/permissions`): đường kiểu cũ từ chối quyền bên ngoài với mọi người gọi, kể cả Toàn quyền.
3. **Cổng nào canh cửa nào (kể cả giao diện).**
   - Gửi đơn, Còn vé, xác nhận thường: `kiemCongXacNhan` → luật bán → **cổng mới** → các cổng cũ. Máy chủ quyết.
   - Tạo, sửa tài khoản kiểu cũ: hàm thuần mới (máy chủ) + trigger (CSDL); `insertStaffSql` ném lỗi.
   - Giao diện (chỉ ẩn, hiện; máy chủ vẫn quyết): khối «Quyền cũ» (`web/staff.ts`, `quyenCu`) bỏ hai ô quyền bên ngoài — **đổi nghĩa:** từ nay khối này chỉ dành cho quyền nội bộ. Form lập đơn (`web/order-form.ts`, `khoiBenDatForm`) thêm dải báo khi tài khoản giữ quyền Đối tác mà `benDatCuaToi` rỗng. Trang đơn hiện câu lỗi Gửi đơn như các lỗi Gửi đơn khác. Nhãn «… (chưa gán vai trò)» ở danh sách tài khoản giữ nguyên, vì đó là lối soát chính của Đ3.

## Điều chưa chắc (ghi lại, không tự hoà giải)

- Số tài khoản kiểu cũ và số đơn đã lỡ chụp «không người hưởng» trên bản thật: chưa kiểm. Sau lần xoá dữ liệu thử ngày 2/11 và khi chưa mở cho Đối tác, có thể là 0.
- Đường «Đổi khách» chụp lại hoa hồng cho đơn đã chụp «không người hưởng»: suy từ ADR-0077 điều 9, chưa chạy thử.
- Mức ảnh hưởng tới bộ kiểm: mới đếm bằng tìm chữ; khung thử của bài kiểm thường chưa đo.
- Chữ ba câu báo, dải báo và câu của đường kiểu cũ: chờ chủ chọn (5.27). Mã lỗi, tên trigger, mã câu kiểm là đề xuất; người thi công kiểm số trống.
- Ai gán được vai trò đối tác (Quản trị, Nhân sự, Toàn quyền) viết theo luật cấp dưới hiện hành, chưa chạy lại từng ca.
