# ADR-0188 — Đơn Trả sau đã xác nhận chỉ đổi bên đặt sang bên có hạn mức trả sau còn hiệu lực (phát hiện T-03)

- **Trạng thái:** **accepted** 2026-11-09 — chủ dự án, nguyên văn: *«Duyệt cả A và B»* (nút ở khung bước tiếp theo, trả lời câu «Bạn duyệt lượt nào?»), ngay sau khi được báo: duyệt thì AI đổi trạng thái và ghi lời «Cho phép, có ghi lý do» vào sổ — lượt A cho lỗi HC-4.2. Người chép (AI) hiểu lời duyệt theo câu duyệt mẫu ở trang trình lượt A: theo khuyến nghị, **kể cả chặn cửa gộp hồ sơ (4a)**; ADR-0188 được xây trên HC-4.2 (khoá `xay_tren_cho_phep_adr_0188`). Chủ nói khác thì bỏ khoá và đưa ADR về chờ duyệt. Lịch sử: proposed 2026-11-09 — AI soạn theo kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt kế hoạch 9/11, Phần V mục 2.1), thuộc **ADR lượt A** (trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-a.md`, trang trình `docs/superpowers/specs/2026-11-09-trinh-chu-adr-luot-a.md`). Người kiểm độc lập chỉ đọc kiểm một vòng bản nháp: ĐẠT. Chưa có mã. Duyệt kế hoạch không thay cho duyệt ADR này.
- **Số:** 0188. Đã soát ngày 9/11: `main` (`fa3fd859a`), mọi nhánh cục bộ và trên GitHub, mọi thư mục `.claude/worktrees/*/docs/adr` — số lớn nhất đang dùng 0187. Giữ chỗ 0188–0193 ở thư mục ghi chú chung của nhóm phiên.
- **Nguồn:** hồ sơ rà soát `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/` (phát hiện T-03); lời chủ lượt 1 ngày 8/11, nguyên văn phương án chọn trong hộp hỏi: «Soạn ADR chặn» (kế hoạch Phụ lục A). Dẫn chứng mã đọc lại trên `main` @`fa3fd859a`.
- **Ngày:** 2026-11-09. **Loại:** việc lớn (tiền, quyền ghi) — thi công xong phải có người kiểm độc lập chỉ đọc (`CLAUDE.md` §3).
- **Cửa:** hai chiều. Chỉ thêm điều kiện từ chối ở cổng; không migration, không sửa dòng dữ liệu nào, không sinh dòng sổ.
- **Sửa:** ADR-0168 Đ2 mục 6 (câu nguyên văn ở bảng «Câu ADR bị thay»). Không sửa nguyên văn ADR-0168.
- **Liên quan:** ADR-0168 Đ1 mục 3–4, Đ2 mục 3–5; ADR-0172 (hạn trả, ân hạn); ADR-0181 (hạn mức chỉ dùng được khi hồ sơ còn vai); ADR-0068 (gộp hồ sơ); Hiến chương 4.2.
- **Xây trên lỗ đang hở: HC-4.2** (`docs/quyen-hoan.json`, hạn 30/11: bút toán điều chỉnh chưa có người duyệt thứ hai). Đọc lại ADR-0115 điều 3 ngày 9/11: bước người thứ hai chỉ phủ lệnh `dieu_chinh` của công nợ và lệnh điều chỉnh chi phí chuyến; việc đảo lần thu (trên màn là «Huỷ khoản thu») được ghi rõ là KHÔNG áp, «dựa vào kỷ luật». ADR này chạm cùng vùng vì đơn Trả sau đổi bên đặt là một đường làm nợ đổi chủ, và một lần đảo khoản thu sau đó có thể làm nợ hiện lại ở bên mới. **Lý do xin phép:** ADR chỉ siết (thêm điều kiện từ chối), không thêm đường ghi sổ nào, không nới luật nào của lỗi. Khoá đề xuất ghi vào mục `HC-4.2` sau khi chủ duyệt (không ghi trước):
  `"xay_tren_cho_phep_adr_0188": "ĐỔI BÊN ĐẶT ĐƠN TRẢ SAU (ADR-0188) — chủ dự án <ngày> (<nơi>): «<nguyên văn, kèm Cho phép, có ghi lý do>». Lý do: chỉ siết cổng đổi bên đặt (và cổng gộp hồ sơ nếu chủ chọn), không thêm đường ghi sổ. Điều kiện: phần còn lại của lỗ giữ hạn cũ."`
  Các mục khác còn mở (`TNV-G1`, `HC-5.19`, hai ô quyền hoãn) không thuộc vùng này: ADR không đụng đơn huỷ, không migration.
- **Số quyết định chạm quyền/dữ liệu/tiền của ADR này:** 1 (luật đổi bên đặt), có một lựa chọn con (cửa gộp hồ sơ, mục 4).

## Bối cảnh

Hôm nay (`congDoiBenDatTraSau` ở `src/modules/orders/tra-sau-cong.ts`, gọi từ `PUT /api/orders/:id/booker` ở `src/modules/orders/index.ts`): đơn Trả sau đã xác nhận mà **còn nợ** thì không đổi được bên đặt (409 `tra_sau_con_no_doi_ben_dat`). Hết nợ thì đổi sang **bất kỳ** bên nào, kể cả bên không có hạn mức và kể cả khách lẻ không hồ sơ (bên đặt mới là `null`); lô chỉ gác phiên bản của bên đặt CŨ. Hệ quả: một đơn Trả sau nằm dưới tên một bên không được cấp hạn mức. Nếu sau đó khoản thu bị đảo (sửa sai, không bị chặn — ADR-0168 Đ2 mục 5), nợ hiện lại ở bên không có hạn mức, không ai cấp, cổng hạn mức không bao giờ xét tới. Hình thức thanh toán đã khoá sau xác nhận nên câu cũ «Hãy chọn trả trước» không làm được.

Cửa gộp hồ sơ (`tinhGop` ở `src/modules/parties/index.ts`, chỉ Quản trị, Toàn quyền) có cùng kẽ: hồ sơ phụ chỉ bị chặn gộp khi còn đơn Trả sau đang nợ (`conNoTraSau`); đơn Trả sau đã hết nợ được dời sang hồ sơ chính dù hồ sơ chính không có hạn mức.

## Quyết định

1. **Cổng đổi bên đặt của đơn Trả sau đã xác nhận** (chỉ khi bên đặt đổi thật; đơn nháp và đơn Thanh toán ngay không đổi gì) đòi thêm, theo thứ tự, sau điều kiện «hết nợ» đang có:
   1. bên đặt mới không được rỗng — 409 `tra_sau_thieu_ben_dat` với câu riêng của đường đổi bên (mục 3, câu c);
   2. bên đặt mới có hạn mức trả sau còn hiệu lực và không có đơn Trả sau quá hạn còn nợ — gọi cùng hàm `kiemTraSau` của `billing` với `soTienDon: 0` (đơn đã hết nợ nên không cộng thêm nợ) và loại mới `"doi_ben"`; hàm trả `null` thì 503 như các cổng Trả sau khác; không đạt thì 409 với mã có sẵn (`khong_co_han_muc`, `co_don_qua_han`) và câu riêng của đường đổi bên (mục 3, câu a, b). Mã `vuot_han_muc` không xảy ra với số 0.
2. **Hai câu gác phiên bản trong cùng lô đổi** (nối cuối lô như hôm nay): giữ câu gác bên đặt CŨ (đọc từ `traSauCuaDon`, như hôm nay) và thêm câu gác bên đặt MỚI bằng đúng `version` mà `kiemTraSau` vừa đọc (không dùng số của bên cũ). Lệnh khác chen giữa làm đổi phiên bản của một trong hai bên thì cả lô thua, dịch thành 409 `credit_version_stale` như mọi đường Trả sau. Mỗi bên tăng đúng một phiên bản khi lô qua.
3. **Câu báo** (phương án (1) của phiếu chữ, kế hoạch Phụ lục B mục B-8; mỗi câu một hằng ở `tra-sau-cong.ts`, bài kiểm khẳng định mã lỗi, chỉ bài của hằng so nguyên câu):
   - a. không có hạn mức: «Đơn trả sau đã xác nhận chỉ đổi được sang bên đặt có hạn mức trả sau còn hiệu lực. Nhờ Quản trị hoặc Toàn quyền cấp hạn mức cho bên mới, hoặc giữ bên đặt cũ.» (Đúng với bảng quyền hôm nay: ô `credit.limit.write` = Quản trị, Toàn quyền.)
   - b. bên mới có đơn quá hạn: «Bên đặt mới còn đơn trả sau quá hạn chưa thanh toán nên chưa nhận thêm đơn trả sau.»
   - c. bên mới rỗng (khách lẻ): «Đơn trả sau đã xác nhận phải có bên đặt là đối tác có hạn mức trả sau — không đổi sang khách lẻ được.»
   Câu cũ của cửa lưu đơn (`CAU_TRA_SAU_THIEU_BEN_DAT`) và câu của `lyDoKhongTraSau` cho xác nhận không đổi.
4. **Cửa gộp hồ sơ — lựa chọn con, khuyến nghị (a):**
   - **(a) Chặn (khuyến nghị):** hồ sơ phụ có đơn Trả sau đã xác nhận (kể cả đã hết nợ, chưa huỷ) chỉ gộp được vào hồ sơ chính có hạn mức trả sau còn hiệu lực và không có đơn quá hạn — cùng hàm `kiemTraSau`, cùng câu a/b ở trên đổi chữ «bên đặt mới» thành «hồ sơ chính» (một hằng riêng); route gộp dùng `ctx.kiemTraSau` có sẵn và lô gộp mang câu gác phiên bản của hồ sơ chính như lô đổi bên đặt. Lý do: cùng một kẽ, cùng một cách vá; gộp hồ sơ hiếm và chỉ Quản trị, Toàn quyền làm.
   - (b) Ghi ngoài phạm vi: để nguyên, ghi vào `docs/BACKLOG.md`. Rẻ hơn nhưng để lại đường vòng cho đúng việc mà mục 1 chặn.
5. **Ngoài phạm vi, chỉ ghi lại:** ngưng tài khoản Đối tác, bỏ quyền Đối tác hay gỡ vai đối tác của bên đặt đang có đơn Trả sau — ADR-0181 đã đóng hạn mức khi gỡ vai được hưởng cuối cùng; đơn cũ giữ bên đặt, không đổi gì. ADR này không sửa các đường đó.
6. **Không đổi:** cách tính nợ (ADR-0168 Đ2 mục 2), luật «còn nợ không đổi bên đặt», luật chụp lại mức hoa hồng khi đổi bên đặt (ADR-0077 điều 8), luật chặn bán theo bên đặt (ADR-0146 Đ3), quyền của route.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0168 Đ2 mục 6 | «Đơn `CREDIT` đã xác nhận còn nợ không đổi được bên đặt, và hồ sơ đang có đơn như vậy không gộp vào hồ sơ khác được.» | «Đơn `CREDIT` đã xác nhận còn nợ không đổi được bên đặt, và hồ sơ đang có đơn như vậy không gộp vào hồ sơ khác được. **Hết nợ thì chỉ đổi được sang bên đặt có hạn mức trả sau còn hiệu lực và không có đơn quá hạn; không đổi sang khách lẻ. [Nếu chủ chọn 4(a):] Hồ sơ có đơn `CREDIT` đã xác nhận chỉ gộp vào hồ sơ có hạn mức như vậy.** (ADR-0188)» |

## Lý do

Đơn Trả sau là lời hứa nợ của một bên được cấp hạn mức. Để đơn nằm dưới tên bên không có hạn mức là tạo ra nợ mà cổng hạn mức không canh. Dùng lại `kiemTraSau` giữ một chỗ quyết «bên này nhận đơn Trả sau được không», cùng câu gác phiên bản như xác nhận và sửa tăng.

## Phương án bị loại

- **Cho đổi bên đặt thì tự đổi đơn sang Thanh toán ngay:** đổi hình thức sau xác nhận phá khoá cột (ADR-0168 Đ2 mục 1), đổi cả hạn trả và cách mở vé đã áp dụng.
- **Chặn mọi lần đổi bên đặt của đơn Trả sau đã xác nhận:** chặn cả việc sửa nhầm giữa hai đối tác đều có hạn mức — việc văn phòng cần.
- **Chỉ gác phiên bản bên mới, bỏ gác bên cũ:** mất bảo vệ đang có (đảo khoản thu chen giữa làm nợ hiện lại ở bên cũ trong lúc đổi).

## Bài kiểm (đỏ trước, xanh sau)

- Sửa hai bài cũ ở `src/tra-sau-duong-ghi.test.ts` (bài «hết nợ thì đổi được» và bài đua phiên bản bên cũ) cho bên mới có hạn mức.
- Thêm T3-a…T3-f: (a) bên mới không có hạn mức → 409 `khong_co_han_muc`, đơn không đổi; (b) bên mới rỗng → 409 `tra_sau_thieu_ben_dat`; (c) bên mới có đơn quá hạn → 409 `co_don_qua_han`; (d) bên mới có hạn mức → 200, phiên bản bên cũ và bên mới mỗi bên tăng đúng 1; (e) có lệnh làm đổi phiên bản bên MỚI chen giữa lúc kiểm và lúc ghi → lô thua 409 `credit_version_stale`, bên đặt không đổi; (f) đơn nháp và đơn Thanh toán ngay đổi sang bên không hạn mức vẫn 200, không câu gác nào.
- Nếu chủ chọn 4(a): bài gộp hồ sơ — hồ sơ phụ có đơn Trả sau đã hết nợ, hồ sơ chính không hạn mức → bị chặn; có hạn mức → gộp được.
- `npm run typecheck` (chữ ký `congDoiBenDatTraSau`, kiểu `loai` ở `src/shared/tra-sau.ts` và `billing`), `npm test`, e2e (chạm API).

## Người dùng sẽ thấy

Nhân viên văn phòng đổi bên đặt của một đơn trả sau đã xác nhận, đã thu đủ: nếu bên mới chưa được cấp hạn mức trả sau (hoặc đang có đơn quá hạn, hoặc là khách lẻ) thì lệnh bị từ chối, kèm một trong ba câu ở mục 3; đơn giữ bên đặt cũ. Đổi giữa hai đối tác đều có hạn mức vẫn làm được như hôm nay. Đơn nháp và đơn thanh toán ngay không đổi gì. [Nếu 4(a):] Quản trị gộp hai hồ sơ mà hồ sơ phụ có đơn trả sau thì hồ sơ chính phải có hạn mức.

## Hệ quả

- Hôm nay lời cấm cấp hạn mức trả sau thật vẫn còn (luật vận hành ở `docs/HANDOFF-N1.md`), nên theo lời cấm đó trên bản thật chưa có đơn Trả sau nào (chưa kiểm bằng lệnh chỉ đọc); ADR này là điều kiện trước của «Quyết định 3 — gỡ lời cấm» (kế hoạch Phần III).
- Khi duyệt: ghi khoá `xay_tren_cho_phep_adr_0188` vào mục `HC-4.2` (nguyên văn lời chủ); dòng Trạng thái ADR-0168 thêm trỏ về ADR này.
- Trần gói trang Đơn hàng: không đổi (mã ở máy chủ; chữ câu báo không vào gói trình duyệt). Chưa đo.
