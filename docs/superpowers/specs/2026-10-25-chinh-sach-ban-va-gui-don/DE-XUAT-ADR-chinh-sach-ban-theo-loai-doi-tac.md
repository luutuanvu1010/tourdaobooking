# Đề xuất ADR — Chính sách bán theo loại đối tác: luật «không bán» theo loại × nhóm hoặc dịch vụ, xét theo bên đặt

**Trạng thái: đề xuất, chờ chủ duyệt.** AI soạn, không tự duyệt (N3). **Số tạm 0140**: ngày 25/10 đã kiểm còn trống trên bản chính (`90f3079e`, ADR lớn nhất là 0139) và trên mọi nhánh chưa gộp. Số chính thức cấp theo thứ tự chủ duyệt.

- **Ngày:** 2026-10-25. **Lượt duyệt:** cùng bản bổ sung 25/10 của đề xuất ADR-0136; trang ghép `TRANG-GHEP.md` cùng thư mục. Nguồn lời chủ: thiết kế `../2026-10-25-chinh-sach-ban-va-gui-don-design.md` mục 1 và 2 (chủ duyệt hướng ngày 25/10).
- **Loại:** việc lớn (quyền, dữ liệu). **Cửa:** dữ liệu một chiều mềm (một bảng chỉ thêm, ở lại); hành vi tắt được bằng cách kết thúc mọi luật.
- **Quan hệ với ADR cũ:**
  - **ngoại lệ có tên, chỉ siết,** của ADR-0005 đ1 («loại vai trò hồ sơ … không bao giờ là điều kiện cho phép») và ADR-0018 đ3 («con đường duy nhất để vai ảnh hưởng quyền là hàm sinh quyền mặc định»). Ở đây loại đối tác của **bên đặt** được dùng để TỪ CHỐI bán, không bao giờ để cho thêm.
  - ADR-0001 mục 4 chỉ miễn cho vai làm *đầu vào của quy tắc giá* («tính giá, không phải chặn người»). Luật này **không** thuộc phần miễn đó, nên phải là ngoại lệ có tên. Tiền lệ cùng kiểu: mã vai `OWNER_COMPANY`, chỉ siết (`src/CLAUDE.md`).
  - Bài R-N1-12 **giữ nguyên** (ADR-0018 đ3). Bài đó chỉ bắt chữ `pty_party_role`, nên đọc qua view không bị bắt; Đ6 dựng hàng rào riêng cho ngoại lệ này.
  - **thay một phần** ADR-0028 đ2, ADR-0033 đ2 (cả mục Hệ quả) và ADR-0058 Đ5: danh mục cho form lập đơn vẫn «giống hệt văn phòng», **trừ** dịch vụ bị luật chặn cho bên đặt của tài khoản Đối tác (Đ4).
  - **giữ** ADR-0117 (loại đối tác là dữ liệu, thêm trên màn hình), ADR-0061 (Đối tác không nhập tay), ADR-0058 (một dịch vụ thuộc đúng một nhóm), luật ép bên đặt của sổ đại lý đợt 1 (`benDatChoTaiKhoan`, `benDatDoiTacBiCam`).
- **Xây trên lỗ đang hở:** không (không chạm tiền, không chạm sổ; trang ghép mục 4).

## Bối cảnh
Chủ dự án 25/10 muốn cho phép hoặc không cho phép một vai đối tác đặt một dịch vụ hay một nhóm dịch vụ; ví dụ của chủ: loại hình công ty tổ chức tour đảo «không nhìn thấy và không thể đặt được» nhóm tour đảo. Hộp chọn 25/10: luật xét theo **bên đặt của đơn**, ai lập cũng bị chặn. Hôm nay Quản trị chỉ ẩn được một dịch vụ cho **mọi người** (`PATCH /api/catalog/:code`, cờ ẩn); không có cách ẩn theo loại đối tác.

## Quyết định
1. **Đ1 — Bảng luật chỉ có dòng chặn.** Bảng mới ở phân hệ giá, tên tạm `prc_sales_block`. Mỗi dòng gồm: loại đối tác (khoá ngoại tới `prc_beneficiary_role`, như mức hoa hồng), phạm vi `GROUP` (mã nhóm) hoặc `SERVICE` (mã dịch vụ), ngày bắt đầu, ngày kết thúc (có thể trống), ghi chú ngắn, người và lúc tạo. **Không có phạm vi «mọi dịch vụ»**, vì chặn một loại khỏi mọi thứ là việc của quyền, không phải luật bán. **Không có cột hay giá trị nào mang nghĩa «cho phép».** Bảng chỉ thêm: trigger cấm xoá, cấm sửa mọi cột trừ việc đặt ngày kết thúc **một lần**; bỏ luật bằng cách đặt ngày kết thúc. [người soạn: tên bảng, khoá ngoại, bỏ phạm vi «mọi dịch vụ»]
2. **Đ2 — Cách xét.** Một dịch vụ có mã bị chặn cho một đơn khi hồ sơ **bên đặt** của đơn đang mang (theo ngày giờ Việt Nam lúc thao tác) ít nhất một loại có luật còn hiệu lực, trùng đúng mã dịch vụ đó hoặc trùng nhóm **hiện hành** của dịch vụ đó. Đơn không có bên đặt, hoặc bên đặt không mang loại nào, thì không bị chặn. Hiệu lực xét theo **ngày thao tác**, không theo ngày đi. [người soạn: ngày thao tác]
3. **Đ3 — Cổng máy chủ.** Một hàm duy nhất ở `pricing` (công bố qua `index.ts`) trả các dịch vụ bị chặn. Hàm được gọi ở mọi đường ghi **thêm dịch vụ có mã hoặc đổi bên đặt**, theo đúng các chỗ đang gọi luật giá danh mục `viPhamGiaDanhMuc`:
   - lập đơn `POST /api/orders`, sửa nháp `PUT /api/orders/:id`, xác nhận `POST /api/orders/:id/status`;
   - đổi bên đặt `PUT /api/orders/:id/booker`, kể cả trên đơn đã xác nhận;
   - các route mới: Gửi xác nhận và Còn vé (đề xuất ADR-0136), Gửi đơn (Đ13 của bản bổ sung).

   Bị chặn thì máy chủ trả **409 `sales_blocked`** kèm câu tiếng Việt nêu tên dịch vụ, và không ghi gì. Không dùng 403, vì đây không phải quyền của người bấm. Nháp cũ chứa dịch vụ nay bị chặn sẽ bị chặn khi lưu, gửi hoặc xác nhận. Đơn **đã xác nhận** không bị xét lại, trừ khi đổi bên đặt. Các đường không thêm dịch vụ và không đổi bên đặt thì **không cần cổng**: sửa số khách sau xác nhận (`money-edit`, chỉ đổi số của dịch vụ đã có), thông tin thương mại theo dòng, chặng đưa đón, hành khách.
4. **Đ4 — Danh mục cho form.** `GET /api/catalog/for-order` trả danh mục **đã bỏ** dịch vụ bị chặn cho tài khoản giữ quyền Đối tác mà bên đặt bị máy chủ ép là hồ sơ của chính họ (cùng điều kiện với hàm `benDatCuaToi`). Nhóm không còn dịch vụ nào thì không hiện. Hàm lọc do **gốc lắp ráp tiêm vào**, giống `benDatCuaToi`, nên `catalog` vẫn chỉ phụ thuộc `audit`. Văn phòng và Thực tập vẫn thấy đủ danh mục; chọn bên đặt bị chặn thì máy chủ trả 409 lúc lưu. Việc lọc chỉ để giao diện gọn; chốt chặn thật là Đ3. [người soạn: không thêm cảnh báo trước trong form của văn phòng]
5. **Đ5 — Ai đặt luật.** Chỉ ô `settings.ops` (Toàn quyền), cổng `admin`, cùng màn với cờ «cần xác nhận» của ADR-0136. Thêm hai hành động nhật ký: thêm luật và kết thúc luật (ghi mã loại, mã nhóm hoặc dịch vụ, ngày; không thông tin cá nhân). Một màn tối thiểu phát hành **cùng** tính năng, không chờ Bảng điều khiển. [người soạn]
6. **Đ6 — Hàng rào máy cho ngoại lệ.**
   - (a) Bài quét: ngoài hàm của Đ3, không tệp nào nhắc bảng luật bán.
   - (b) Bài lược đồ: bảng không có cột hay giá trị nào ngoài nghĩa «chặn».
   - (c) e2e: mỗi đường ghi ở Đ3 trả 409 khi bên đặt bị chặn.
   - (d) e2e: danh mục for-order của Đối tác bị chặn thiếu đúng các dịch vụ đó, còn của văn phòng thì không thiếu.

   Mỗi hàng rào được ghi vào `docs/SO-HANG-RAO.md` sau khi đã quan sát nó chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên).

## Phương án bị bác
- **Làm thành quyền theo tài khoản** (ô mới, hoặc quyền theo nhóm): quyền gắn với tài khoản, nhưng chủ chọn xét theo bên đặt; khoảng 1000 tài khoản đối tác sẽ phải chỉnh từng cái.
- **Có dòng «cho phép»** (danh sách trắng): vai sẽ thành thứ cho thêm, phá luật nền rộng hơn mức cần; dịch vụ mới sẽ mặc định bị chặn với mọi loại có danh sách trắng.
- **Chỉ ẩn ở giao diện:** trái nguyên tắc mặc định từ chối, vì gọi API thẳng vẫn đặt được.
- **Phân hệ tồn kho:** Nền tảng chưa có nguồn số chỗ trống; đếm chỗ thật là dự án riêng (BACKLOG §48).
- **Đặt luật trong `catalog`:** `catalog` không được đọc loại đối tác (cạnh phụ thuộc chỉ có `audit`).
- **Xét theo hồ sơ công ty:** tài khoản Đối tác luôn gắn hồ sơ cá nhân; muốn vậy phải làm «đại lý tổ chức nhiều nhân viên» trước (BACKLOG §44, chủ để sau).

## Hệ quả
- Migration mới; số lấy lúc thi công (ngày 25/10, số kế tiếp là 0119). Cập nhật `docs/data-dictionary.json`, rồi chạy `npm run dict`.
- Hàm ở `pricing`. Hàm tiêm ở gốc lắp ráp `src/index.ts`, theo kiểu `benDatCuaToi`, và khai kiểu trong `src/shared/router.ts`. Thêm route đọc/ghi luật.
- Câu lỗi tiếng Việt; Trợ giúp cho Toàn quyền.
- **Dòng đề xuất thêm vào `src/CLAUDE.md` sau khi chủ duyệt** (N9: AI không tự sửa): «Ngoại lệ thứ hai, chỉ SIẾT: luật bán theo loại đối tác (ADR-0140) đọc loại của hồ sơ bên đặt để TỪ CHỐI bán; chỉ một hàm ở `pricing`; bảng luật không có cột cho phép.»

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)
1. Đối tác có loại X: danh mục for-order không có nhóm Y. Gọi thẳng lập đơn với dịch vụ nhóm Y thì nhận 409, và không dòng nào được ghi.
2. Văn phòng lập hộ, bên đặt mang loại X, dịch vụ nhóm Y: nhận 409. Cùng đơn với bên đặt khác: 201.
3. Đổi bên đặt sang hồ sơ loại X trên đơn có dịch vụ nhóm Y: nhận 409, ở cả đơn nháp lẫn đơn đã xác nhận.
4. Luật chặn riêng một dịch vụ: chỉ dịch vụ đó vắng; dịch vụ khác cùng nhóm vẫn đặt được.
5. Kết thúc luật: đặt lại được ngay; dòng luật cũ vẫn còn trong bảng.
6. CSDL từ chối xoá dòng luật, sửa cột ngoài ngày kết thúc, và đặt ngày kết thúc lần thứ hai.
7. Hồ sơ mang hai loại, chỉ một loại có luật: bị chặn. Hồ sơ không mang loại nào: không bị chặn.

## Điều chưa chắc
- Production đã có loại «công ty tổ chức tour đảo» chưa: **chưa kiểm**, vì AI không được đọc dữ liệu thật trên D1. Loại gần nhất có trong mã là «Công ty lữ hành». Nếu chưa có, Toàn quyền thêm loại trên màn hình (ADR-0117) rồi gắn cho hồ sơ cá nhân của từng tài khoản Đối tác.
- Loại phải gắn trên **hồ sơ cá nhân** của tài khoản Đối tác. Gắn lên hồ sơ công ty thì luật không chặn được đơn nào (thiết kế 25/10 mục 2).
- Nếu một loại thôi được tính là «được hưởng», máy chủ thôi ép bên đặt cho tài khoản mang loại đó. Khi ấy Đối tác có thể để trống bên đặt, và luật không áp. [người soạn: ghi lại, chưa chặn]
- Dịch vụ nhập tay (không có mã) không bị luật phủ; chỉ văn phòng nhập tay được (ADR-0061).
- Chưa làm luật chặn theo **một hồ sơ cụ thể** (chỉ theo loại); thêm sau nếu chủ cần.
