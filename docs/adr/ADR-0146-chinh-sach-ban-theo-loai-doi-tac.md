# ADR-0146 — Chính sách bán theo loại đối tác: luật «không bán» theo loại × nhóm hoặc dịch vụ, xét theo bên đặt; Bán hàng, Quản trị, Toàn quyền đặt luật

- **Trạng thái:** **accepted** 2026-10-28 — chủ dự án trong chat.
  - Phiên soạn hỏi «Bạn muốn duyệt lượt nào trước?» (hai nút: chặn bán trước, phí đón trước). Chủ gõ, nguyên văn: *«cả chặn bán và phí đón»*.
  - Hộp chọn cùng ngày, câu «Lượt chặn bán có 4 điều chạm quyền và dữ liệu, vượt trần 3. Ngày 25/10 bạn cho vượt trần khi chỉ Toàn quyền đặt luật; nay có thêm quyền mới cho Bán hàng. Bạn chọn cách nào?»: chủ chọn *«Giữ phép vượt trần»*.
  - Bốn điều chạm quyền / dữ liệu: Đ1, Đ3, Đ4 và Đ5 (thay ngày 28/10). Như vậy là vượt trần 3 điều mỗi lượt (`CLAUDE.md` §9). Chủ cho phép ngày 25/10 (trang ghép `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/TRANG-GHEP.md` mục 0) và xác nhận lại ngày 28/10 như trên.
  - Trang ghép 28/10 (`docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/TRANG-GHEP.md` mục 0) ghi hai lượt «không gộp». Vì vậy lần duyệt này được ghi thành **hai lần duyệt nối tiếp**: ADR này trước, ADR-0147 (phí đưa đón) sau.
  - Các chỗ đánh dấu **[người soạn]** được duyệt theo khuyến nghị của người soạn. Người soạn đã nói rủi ro «Bán hàng gỡ luật rồi đặt ngay» với chủ một lần trước khi duyệt (Hiến pháp P18; mục «Điều chủ cần biết»).
  - AI soạn và chép, không tự duyệt (Hiến pháp N3). Người kiểm độc lập chỉ đọc đã soát sự thật hai bản nguồn một vòng ngày 28/10.
- **Số và nguồn:** ADR này gồm đề xuất gốc `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/DE-XUAT-ADR-chinh-sach-ban-theo-loai-doi-tac.md` (25/10) và tờ bổ sung `docs/superpowers/specs/2026-10-28-phi-don-va-chan-ban/BO-SUNG-2026-10-28-chinh-sach-ban.md` (28/10). Hai tệp đó là hồ sơ có ngày, không sửa.
  - Số 0146 kiểm còn trống ngày 28/10: lớn nhất trên `main` là 0144; 0142 và 0145 đang được nhánh hoặc worktree khác giữ.
  - **Phần đầu** (các dòng phía trên «Bối cảnh») do người chép viết theo khuôn ADR-0136, từ dòng đầu của hai bản.
  - **Từ «Bối cảnh» trở xuống** giữ từng chữ của hai bản chủ duyệt. Mọi chữ người chép thêm đánh dấu **[chép 28/10]**, trừ tiêu đề, nhãn nguồn gốc *(gốc 25/10)* / *(bổ sung 28/10)* và phép thay số «ADR-01xx» → «ADR-0146». Những chỗ khác với hai bản:
    - Đ5 lấy theo tờ bổ sung (mục 1). Hai ý của Đ5 gốc không trái tờ bổ sung (hai hành động nhật ký; màn phát hành cùng tính năng) được giữ, có đánh dấu.
    - Đ3 nối thêm mục 2 của tờ bổ sung.
    - Thêm mục «Lời chủ 28/10», «Việc bắt buộc trước khi đặt luật đầu tiên» (mục 3 của tờ bổ sung) và «Điều chủ cần biết» của tờ bổ sung.
    - Tiêu chí 10–13 của tờ bổ sung nối sau tiêu chí 9.
    - Bỏ các nhãn số đã cũ ở dòng đầu đề xuất gốc (ADR lớn nhất 0139, nhãn 0140).
- **Ngày:** 2026-10-25 (đề xuất gốc), 2026-10-28 (bổ sung và duyệt).
- **Loại:** việc lớn (quyền, dữ liệu). **Cửa:** dữ liệu một chiều mềm (một bảng chỉ thêm, ở lại); hành vi tắt được bằng cách kết thúc mọi luật.
- **Quan hệ với ADR cũ:**
  - **ngoại lệ có tên, chỉ siết,** của ADR-0005 đ1 («loại vai trò hồ sơ … không bao giờ là điều kiện cho phép») và ADR-0018 đ3 («con đường duy nhất để vai ảnh hưởng quyền là hàm sinh quyền mặc định»). Ở đây loại đối tác của **bên đặt** được dùng để TỪ CHỐI bán, không bao giờ để cho thêm.
  - ADR-0001 mục 4 chỉ miễn cho vai làm *đầu vào của quy tắc giá* («tính giá, không phải chặn người»). Luật này **không** thuộc phần miễn đó, nên phải là ngoại lệ có tên.
  - Tiền lệ đã ghi: mã vai `OWNER_COMPANY`, chỉ siết (`src/CLAUDE.md`). Tiền lệ **chưa ghi**: luật ép bên đặt và luật K1 (`benDatChoTaiKhoan`, `benDatDoiTacBiCam`) đã đọc «vai được hưởng» để ràng buộc Đối tác.
  - Bài R-N1-12 **giữ nguyên** (ADR-0018 đ3). Bài đó chỉ bắt chữ `pty_party_role`, nên đọc qua view không bị bắt; vì vậy Đ6 dựng hàng rào riêng.
  - **thay một phần** ADR-0028 đ2, ADR-0033 đ2 (cả mục Hệ quả) và ADR-0058 Đ5: danh mục cho form lập đơn vẫn «giống hệt văn phòng», **trừ** dịch vụ bị luật chặn cho bên đặt của tài khoản Đối tác (Đ4).
  - **giữ** ADR-0117 (loại đối tác là dữ liệu, thêm trên màn hình), ADR-0061 (Đối tác không nhập tay), ADR-0058 (một dịch vụ thuộc đúng một nhóm), ADR-0068 (gộp hồ sơ; xem Đ3).
  - **bổ sung** ADR-0136: cổng luật bán đứng ở ba cửa Gửi xác nhận, Còn vé, Gửi đơn; Gửi đơn dính luật bán thì ở lại nháp, đúng Đ13.2 (Đ3 dưới đây). [chép 28/10]
- **Xây trên lỗ đang hở:** không (không chạm tiền, không chạm sổ; trang ghép 25/10 mục 4; trang ghép 28/10 mục 4 xác nhận lại).
- **Phát hành:** không phụ thuộc ADR-0147. Trước khi đặt luật đầu tiên phải làm xong mục «Việc bắt buộc trước khi đặt luật đầu tiên». Số migration lấy lúc thi công, theo luật từ bản 1.46 (`docs/adr/README.md`). [chép 28/10]

## Bối cảnh *(gốc 25/10)*
Chủ dự án 25/10 muốn cho phép hoặc không cho phép một vai đối tác đặt một dịch vụ hay một nhóm dịch vụ. Ví dụ của chủ: loại hình công ty tổ chức tour đảo «không nhìn thấy và không thể đặt được» nhóm tour đảo. Hộp chọn 25/10: luật xét theo **bên đặt của đơn**, ai lập cũng bị chặn. Hôm nay Quản trị chỉ ẩn được một dịch vụ cho **mọi người** (`PATCH /api/catalog/:code`, cờ ẩn); chưa có cách ẩn theo loại đối tác.

### Lời chủ 28/10 *(bổ sung 28/10)*
- Chủ nêu: tài khoản bên ngoài không đặt được vài dịch vụ Hòn Tằm; luật cho phép hiển thị và đặt theo nhóm tài khoản.
- Hộp chọn 28/10, câu (a) «Ai đặt và gỡ luật»: chủ gõ **«Quản trị, toàn quyền và bán hàng»** (nguyên văn), rộng hơn hai phương án được đưa ra là «Chỉ Toàn quyền» và «Quản trị và Toàn quyền».
- Câu (b) «Bên ngoài là ai»: chủ chọn **«Theo loại đối tác»**. Nghĩa giống hộp chọn 25/10: xét **bên đặt** của đơn, văn phòng đặt hộ cũng bị chặn, và người đặt luật chọn loại nào bị chặn.
- Lời 28/10 thay câu chủ viết ngày 13/10 (bảng việc yêu cầu 5, «Toàn quyền chọn nhóm dịch vụ nào hiện cho vai nào») ở hai chỗ. Thứ nhất, người đặt luật rộng hơn. Thứ hai, đối tượng bị chặn là loại đối tác, không phải mọi vai.
- Ví dụ Hòn Tằm làm như sau. Mỗi dịch vụ Hòn Tằm cần chặn là một dòng phạm vi `SERVICE`, lặp cho từng loại đối tác bị chặn. Chặn cả nhóm thì dùng một dòng phạm vi `GROUP`.

## Quyết định
1. **Đ1 — Bảng luật chỉ có dòng chặn, và một bất biến với loại.** *(gốc 25/10)*
   - Bảng mới ở phân hệ giá, tên tạm `prc_sales_block`. Mỗi dòng gồm: loại đối tác (khoá ngoại tới `prc_beneficiary_role`, như mức hoa hồng); phạm vi `GROUP` (mã nhóm) hoặc `SERVICE` (mã dịch vụ); ngày bắt đầu; ngày kết thúc (có thể trống); ghi chú ngắn; người và lúc tạo.
   - **Không có phạm vi «mọi dịch vụ»**, vì chặn một loại khỏi mọi thứ là việc của quyền, không phải luật bán. **Không có cột hay giá trị nào mang nghĩa «cho phép».**
   - Bảng chỉ thêm: trigger cấm xoá, cấm sửa mọi cột trừ việc đặt ngày kết thúc **một lần**. Bỏ luật bằng cách đặt ngày kết thúc. [người soạn: tên bảng, khoá ngoại, bỏ phạm vi «mọi dịch vụ»]
   - **Bất biến:** luật còn hiệu lực chỉ trỏ tới loại đang bật «được hưởng». Thêm luật cho loại đang tắt bị từ chối. Tắt loại (`POST /api/pricing/loai-doi-tac/:code/tat`, ô `partner.commission.write`: Kế toán, Quản trị, Toàn quyền) khi loại còn luật hiệu lực sẽ nhận **409**; phải kết thúc luật trước. Lý do: tắt loại làm máy chủ thôi ép bên đặt cho tài khoản mang loại đó; Đối tác chỉ cần để trống bên đặt là luật mất tác dụng mà không ai hay. Hai bảng cùng thuộc `pricing`, nên kiểm được ngay trong phân hệ này. [người soạn]
2. **Đ2 — Cách xét.** *(gốc 25/10)* Một dịch vụ có mã bị chặn cho một đơn khi hồ sơ **bên đặt** của đơn đang mang ít nhất một loại có luật còn hiệu lực trùng đúng mã dịch vụ đó, hoặc trùng nhóm **hiện hành** của dịch vụ. Loại và hiệu lực xét theo ngày giờ Việt Nam lúc thao tác, không theo ngày đi. Đơn không có bên đặt, hoặc bên đặt không mang loại nào, thì không bị chặn. [người soạn: ngày thao tác]
3. **Đ3 — Cổng máy chủ.** *(gốc 25/10)* Một hàm duy nhất ở `pricing` (công bố qua `index.ts`) trả các dịch vụ bị chặn. Hàm được gọi ở mọi đường ghi **thêm dịch vụ có mã hoặc đổi bên đặt**. Ba đường đầu là ba cổng đang gọi luật giá danh mục `viPhamGiaDanhMuc`:
   - lập đơn `POST /api/orders`, sửa nháp `PUT /api/orders/:id`, xác nhận `POST /api/orders/:id/status`;
   - đổi bên đặt `PUT /api/orders/:id/booker`, kể cả trên đơn đã xác nhận;
   - các route mới: Gửi xác nhận và Còn vé (đề xuất ADR-0136), Gửi đơn (Đ13 của bản bổ sung). [chép 28/10: ADR-0136 nay đã accepted, ba cửa này đã có trên `main` từ bản 2.36 — xem phần bổ sung 28/10 ngay dưới]

   Bị chặn thì máy chủ trả **409 `sales_blocked`** kèm câu tiếng Việt nêu tên dịch vụ, và không ghi gì. Không dùng 403, vì đây không phải quyền của người bấm. Nháp cũ chứa dịch vụ nay bị chặn sẽ bị chặn khi lưu, gửi hoặc xác nhận. Đơn **đã xác nhận** không bị xét lại, trừ khi đổi bên đặt qua route ở trên.

   **Không cần cổng**, vì không thêm dịch vụ và không đổi bên đặt: sửa số khách sau xác nhận (`money-edit`, chỉ đổi số của dịch vụ đã có), thông tin thương mại theo dòng, chặng đưa đón, hành khách.

   **Ba cửa khác đổi được kết quả của luật. Chấp nhận và ghi lại** [người soạn]:
   - Kết thúc hoặc đổi loại trên hồ sơ (`POST /api/parties/:id/roles/:rid/end`, ô `admin.manage`: Quản trị, Toàn quyền). Việc này đổi đối tượng của luật, đúng nghĩa «xét theo loại».
   - Gán nhóm cho dịch vụ (`PUT /api/catalog/group-assignments`, `admin.manage`). Luật nhóm theo nhóm hiện hành, nên chuyển dịch vụ ra khỏi nhóm thì luật nhóm thôi phủ. Màn gán nhóm phải cảnh báo khi nhóm cũ hoặc nhóm mới đang có luật bán hay cờ cần xác nhận.
   - Gộp hồ sơ (ADR-0068, `POST /api/parties/:id/merge`, `admin.manage`). Gộp đổi bên đặt của nhiều đơn cùng lúc mà không qua cổng. Nháp bị chặn ở lần lưu, gửi hoặc xác nhận kế tiếp. Đơn đã xác nhận giữ nguyên, như mọi đơn xác nhận trước khi có luật. Lý do: gộp là sửa danh tính (hai hồ sơ là một người), không phải một lần bán mới.

   **Các cổng ở Đ3 nay là cửa thật.** *(bổ sung 28/10, mục 2)*
   - Ba cửa Gửi xác nhận, Còn vé và Gửi đơn đã có trên `main` từ bản 2.36 (ADR-0136).
   - Còn vé, Gửi đơn và `/status` dùng chung hàm cổng xác nhận `kiemCongXacNhan`. Cổng luật bán đứng **đầu** hàm này, trước luật giá danh mục R2: dịch vụ đã «không bán» thì các cổng sau không còn nghĩa.
   - **Gửi xác nhận không đi qua hàm chung.** Mã ghi rõ điều này, và bài `orders-khong-doc-nhom-truc-tiep` khẳng định nó. Vì vậy cửa này cần **chốt luật bán riêng**, như ADR-0118 đã làm với nhóm tắt đưa đón. Không có chốt riêng thì đơn bị chặn vẫn vào được hàng chờ xác nhận, trái với trang ghép 25/10 mục 5.
   - Đối tác bấm Gửi đơn mà dính luật bán thì nhận 409 `sales_blocked` và đơn ở lại nháp (ADR-0136 Đ13.2). Đơn **không** chuyển sang «chờ xác nhận» như khi thiếu phí đón, vì văn phòng cũng không được bán dịch vụ đó cho bên đặt này.
4. **Đ4 — Danh mục cho form.** *(gốc 25/10)* `GET /api/catalog/for-order` trả danh mục **đã bỏ** dịch vụ bị chặn cho tài khoản giữ quyền Đối tác mà bên đặt bị máy chủ ép là hồ sơ của chính họ (cùng điều kiện với hàm `benDatCuaToi`). Nhóm không còn dịch vụ nào thì không hiện.
   - Hàm lọc do **gốc lắp ráp tiêm vào**, giống `benDatCuaToi`, nên `catalog` vẫn chỉ phụ thuộc `audit`.
   - Văn phòng và Thực tập vẫn thấy đủ danh mục; nếu chọn bên đặt bị chặn thì máy chủ trả 409 lúc lưu. [người soạn: không thêm cảnh báo trước trong form của văn phòng]
   - Việc lọc chỉ để giao diện gọn; chốt chặn thật là Đ3.
5. **Đ5 — Ai đặt luật.** *(bổ sung 28/10, mục 1 — thay Đ5 gốc)*
   - Bỏ ô `settings.ops`. Thêm ô quyền mới `sales.block.write` (tên tạm), phạm vi `any` cho Bán hàng, Quản trị và Toàn quyền, vì luật không có người sở hữu. Các nhóm còn lại không có ô này: Kế toán, Hiện trường, Đối tác, Thực tập, Tài xế, Tài xế đối tác, Nhân sự.
   - Route đọc, thêm và kết thúc luật đặt sau **cổng văn phòng**, vì Bán hàng không qua được cổng quản trị.
   - Màn «Luật bán» nằm trong menu văn phòng, không đặt chung màn với cờ «cần xác nhận» nữa. Cờ đó vẫn chỉ Toàn quyền đặt.
   - Nhật ký ghi tài khoản người thêm hoặc gỡ.
   - Ô này là một thao tác mới, không phải mã quyền mới. Vì vậy bài «mỗi ô được máy chủ hỏi» phải phủ nó, còn các bài tập con quyền không bị nhân đôi.

   Hai ý của Đ5 gốc không trái tờ bổ sung, giữ lại [chép 28/10]:
   - Thêm hai hành động nhật ký: thêm luật và kết thúc luật. Nhật ký ghi mã loại, mã nhóm hoặc dịch vụ, ngày; không ghi thông tin cá nhân.
   - Một màn tối thiểu phát hành **cùng** tính năng, không chờ Bảng điều khiển. [người soạn]
6. **Đ6 — Hàng rào máy cho ngoại lệ.** *(gốc 25/10)*
   - (a) Bài quét: ngoài tệp luật bán của `pricing`, mã chạy không tệp nào nhắc bảng luật bán. Tệp tài liệu và kịch bản kiểm dữ liệu được miễn.
   - (b) Bài lược đồ: bảng không có cột hay giá trị nào ngoài nghĩa «chặn».
   - (c) e2e: mỗi đường ghi ở Đ3 trả 409 khi bên đặt bị chặn; tắt loại còn luật trả 409 (Đ1).
   - (d) e2e: danh mục for-order của Đối tác bị chặn thiếu đúng các dịch vụ đó; của văn phòng thì không thiếu.
   - e2e dùng **loại riêng do bài tự tạo**, và kết thúc mọi luật bài đã tạo. Lý do: D1 local dùng chung, bảng chỉ thêm, và `tests/e2e/catalog.mjs` đang khẳng định Đối tác thấy đúng danh sách nhóm như Bán hàng.

   Mỗi hàng rào được ghi vào `docs/SO-HANG-RAO.md` sau khi đã quan sát nó chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên).

### Việc bắt buộc trước khi đặt luật đầu tiên *(bổ sung 28/10, mục 3)*
Bản 25/10 để mục này ở «Điều chưa chắc»; nay nó thành bước của runbook.
- Toàn quyền gắn loại cho hồ sơ cá nhân của **mọi** tài khoản Đối tác.
- Chủ chạy một câu đếm chỉ đọc: tài khoản Đối tác chưa gắn hồ sơ, hoặc hồ sơ chưa mang loại nào. Những tài khoản này **không bị luật nào chặn**.

## Phương án bị bác *(gốc 25/10)*
- **Làm thành quyền theo tài khoản** (ô mới, hoặc quyền theo nhóm): quyền gắn với tài khoản, nhưng chủ chọn xét theo bên đặt. Khoảng 1000 tài khoản đối tác sẽ phải chỉnh từng cái.
- **Có dòng «cho phép»** (danh sách trắng): vai sẽ thành thứ cho thêm quyền, phá luật nền rộng hơn mức cần. Dịch vụ mới cũng sẽ mặc định bị chặn với mọi loại có danh sách trắng.
- **Chỉ ẩn ở giao diện:** trái nguyên tắc mặc định từ chối, vì gọi API thẳng vẫn đặt được.
- **Phân hệ tồn kho:** Nền tảng chưa có nguồn số chỗ trống. Đếm chỗ thật là dự án riêng (BACKLOG, mã `BL-TON-KHO`).
- **Đặt luật trong `catalog`:** `catalog` không được đọc loại đối tác (cạnh phụ thuộc chỉ có `audit`).
- **Xét theo hồ sơ công ty:** tài khoản Đối tác luôn gắn hồ sơ cá nhân. Muốn xét theo công ty thì phải làm «đại lý tổ chức nhiều nhân viên» trước (BACKLOG, mã `BL-DAI-LY-TO-CHUC`; chủ để sau).
- **Cho Quản trị và Kế toán cùng giữ hiệu lực của luật** (không chặn tắt loại): bị bác, vì luật sẽ mất tác dụng bằng một thao tác ở màn khác mà người đặt luật không thấy.

## Hệ quả *(gốc 25/10)*
- Migration mới, số lấy lúc thi công (ngày 25/10, số kế tiếp là 0119). [chép 28/10: số 0119 đã dùng; số lấy theo luật từ bản 1.46, tức số lớn nhất trong `migrations/` của `main` lúc gộp + 1] Cập nhật `docs/data-dictionary.json`, rồi chạy `npm run dict`.
- Hàm ở `pricing`. Hàm tiêm đặt ở gốc lắp ráp `src/index.ts` theo kiểu `benDatCuaToi`, khai kiểu trong `src/shared/router.ts`. Thêm route đọc và ghi luật. Route tắt loại thêm 409.
- Câu lỗi tiếng Việt. Thêm Trợ giúp cho Toàn quyền. [chép 28/10: theo Đ5 mới, Trợ giúp cho cả Bán hàng và Quản trị] Màn gán nhóm có cảnh báo.
- **Dòng đề xuất thêm vào `src/CLAUDE.md` sau khi chủ duyệt** (N9: AI không tự sửa): «Ngoại lệ chỉ SIẾT thứ hai: luật bán theo loại đối tác (ADR-0146) đọc loại của hồ sơ bên đặt để TỪ CHỐI bán. Chỉ một hàm ở `pricing` làm việc này; bảng luật không có cột cho phép; loại còn luật thì không tắt được.» Có thể ghi luôn tiền lệ chưa ghi của luật ép bên đặt.

## Điều chủ cần biết (nói một lần) *(bổ sung 28/10)*
- Bán hàng gỡ được một luật rồi đặt đơn ngay cho bên đang bị chặn. Máy không ngăn việc này; chỉ nhật ký ghi tên người gỡ. Muốn ngăn thì bỏ Bán hàng khỏi ô mới: sửa một dòng mã, không cần migration.
- Lượt duyệt này vẫn có 4 điều chạm quyền hoặc dữ liệu (Đ1, Đ3, Đ4, Đ5 mới). Ngày 25/10 chủ cho lượt này vượt trần, nhưng lúc đó Đ5 còn dùng ô có sẵn. Nay Đ5 thêm một ô mới cho Bán hàng, nên **chủ cần xác nhận lại**: giữ phép vượt trần, hoặc tách Đ5 thành lượt riêng. Lượt này **không gộp** với lượt phí đón. [chép 28/10: chủ đã chọn «Giữ phép vượt trần» — dòng Trạng thái]

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)
*(gốc 25/10)*
1. Đối tác có loại X: danh mục for-order không có nhóm Y. Gọi thẳng lập đơn với dịch vụ nhóm Y thì nhận 409, và không dòng nào được ghi.
2. Văn phòng lập hộ, bên đặt mang loại X, dịch vụ nhóm Y: nhận 409. Cùng đơn với bên đặt khác: 201.
3. Đổi bên đặt sang hồ sơ loại X trên đơn có dịch vụ nhóm Y: nhận 409, ở cả đơn nháp lẫn đơn đã xác nhận.
4. Luật chặn riêng một dịch vụ: chỉ dịch vụ đó vắng; dịch vụ khác cùng nhóm vẫn đặt được.
5. Kết thúc luật: đặt lại được ngay; dòng luật cũ vẫn còn trong bảng.
6. CSDL từ chối: xoá dòng luật, sửa cột ngoài ngày kết thúc, đặt ngày kết thúc lần thứ hai.
7. Hồ sơ mang hai loại, chỉ một loại có luật: bị chặn. Hồ sơ không mang loại nào: không bị chặn.
8. Tắt «được hưởng» của loại còn luật hiệu lực: nhận 409. Kết thúc luật rồi tắt: thành công.
9. Gộp một hồ sơ không mang loại vào hồ sơ mang loại X: nháp có dịch vụ nhóm Y nhận 409 ở lần gửi kế tiếp; đơn đã xác nhận không đổi.

*(bổ sung 28/10)*

10. Bán hàng thêm luật nhận 201, kết thúc luật nhận 200, cả hai có nhật ký. Kế toán, Đối tác, Thực tập, Nhân sự làm hai việc đó thì nhận 403.
11. Luật chặn một dịch vụ Hòn Tằm cho loại X. Đối tác loại X không thấy dịch vụ đó trong danh mục lập đơn. Gọi thẳng Gửi đơn với dịch vụ đó thì nhận 409 `sales_blocked`, đơn vẫn là nháp. Dịch vụ Hòn Tằm khác vẫn đặt được.
12. Một đơn vừa dính luật bán vừa thiếu phí đón: câu trả về là `sales_blocked`, vì cổng này đứng đầu.
13. Văn phòng bấm Gửi xác nhận trên nháp có dịch vụ bị luật bán chặn cho bên đặt: nhận 409 `sales_blocked`, không có yêu cầu xác nhận nào được mở.

## Điều chưa chắc *(gốc 25/10)*
- Production đã có loại «công ty tổ chức tour đảo» chưa: **chưa kiểm**, vì AI không được đọc dữ liệu thật trên D1. Loại gần nhất có trong mã là «Công ty lữ hành». Nếu chưa có, Toàn quyền thêm loại trên màn hình (ADR-0117) rồi gắn cho hồ sơ cá nhân của từng tài khoản Đối tác.
- Loại phải gắn trên **hồ sơ cá nhân** của tài khoản Đối tác. Gắn lên hồ sơ công ty thì luật không chặn được đơn nào (thiết kế 25/10 mục 2).
- Tài khoản Đối tác **chưa gắn hồ sơ** không bị luật nào chặn, vì máy chủ không có loại để xét. CSDL hôm nay chưa bắt buộc mỗi tài khoản có hồ sơ; migration siết B5 còn chờ. Toàn quyền nên gắn hồ sơ cho mọi tài khoản Đối tác trước khi đặt luật. Production có tài khoản như vậy không: **chưa kiểm**. [chép 28/10: nay là bước bắt buộc — mục «Việc bắt buộc trước khi đặt luật đầu tiên»]
- Dịch vụ nhập tay (không có mã) không bị luật phủ; chỉ văn phòng nhập tay được (ADR-0061).
- Chưa làm luật chặn theo **một hồ sơ cụ thể** (chỉ theo loại); thêm sau nếu chủ cần.
