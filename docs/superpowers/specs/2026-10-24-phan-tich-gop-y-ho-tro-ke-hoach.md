# Phân tích góp ý màn Hỗ trợ → kế hoạch (2026-10-24)

> Hồ sơ có ngày, **mô tả / nháp**, không chuẩn tắc; một mục ở đây không phải lời duyệt. Nối tiếp `2026-09-30-phan-tich-gop-y-nguoi-dung.md` (đã xử lý YC-0001…0012; không lặp lại).
> Riêng tư: chỉ gọi theo mã `YC-xxxx` và diễn giải.

## 0. Nguồn và độ tin cậy

- Nguồn: bản xuất chỉ-đọc từ D1 production do chủ chạy 24/10: **22 phiếu**, 32 dòng. YC-0001…0012 đều «Đã xong» (đã phân tích 30/9). **Mười phiếu mới YC-0013…0022, cùng gửi 20–23/10**, trạng thái: ba phiếu «Đã tiếp nhận» (YC-0014, 0015, 0019), bảy phiếu còn lại «Mới». Tất cả vào nhóm Kỹ thuật, mức Thường, chưa gắn đơn.
- Đối chiếu mã trên nhánh `claude/user-feedback-analysis-3be3a7` (gốc bản 2.28). **Chưa chạy giao diện, chưa kiểm production**: cột «hiện trạng» dưới đây là đọc mã/ADR, ghi "chưa kiểm" ở chỗ không chắc.
- Không có phiếu nào làm Nền tảng ngừng chạy. Một phiếu có thể là lỗi thật (YC-0016, vế 2).

## 1. Phân loại mười phiếu mới

Nhóm: (a) đã có chỗ · (b) việc nhỏ bề mặt · (c) cần chủ quyết/ADR (chạm tiền, quyền, dữ liệu) · (d) cần xác minh/lỗi.

| Mã | Người dùng muốn (diễn giải) | Hiện trạng | Nhóm |
|---|---|---|---|
| YC-0013 | Danh sách đơn: lọc «còn công nợ»; **bỏ** lọc dịch vụ; lọc «đã nhập phần mềm kế toán»; lọc «chưa có người phụ trách» | Bộ lọc nhiều điều kiện đã có (trạng thái, dịch vụ, người lập, ngày) ở `web/orders.ts`, luật `src/shared/loc-don.ts`. Chưa có 3 điều kiện mới. «Người phụ trách» từng hoãn vì `orders` không đọc được `dispatch` (spec 30/9 §7.4). ADR-0060 điều A-6 có ghi «lọc bắt buộc kèm khoảng ngày» cho lọc kế toán | (b)+(c) |
| YC-0014 | Tạo đơn: chọn «Đón» thì **cộng thêm tiền đón vào giá**; thêm ô ghi chú giờ đón | «Đón/Không đón» bắt buộc + khung giờ đã ADR-0134 (đã duyệt, kiểm nhánh xác nhận đơn). Tiền đón cộng vào giá: chưa thấy ở mã; giá đưa đón là «đợt 2 lớp giá» (bộ nhớ: chờ ADR-0117 lần 2 + sổ vàng Kế toán). Ô ghi chú giờ đón: chưa có ô riêng (chưa kiểm sâu) | (c) tiền |
| YC-0015 | Tài xế: chi tiết chuyến thêm chi tiết sản phẩm, SĐT khách, SĐT HDV phụ trách | DTO tài xế hiện có SĐT người liên hệ và SĐT văn phòng (`tai-xe-dto.test.ts`); SĐT HDV: chưa kiểm. Tên/năm sinh khách chỉ trong ngày chạy (ADR-0053, cửa một chiều) | (c) quyền dữ liệu |
| YC-0016 | (1) Thêm chọn HDV phụ trách khi tạo đơn; (2) **đơn không có ngày vẫn lưu được** | (1) Đơn nhận chọn HDV khi tạo đã có (`web/order-form.ts` chip HDV, ADR-0020) — có thể người gửi chưa thấy; chưa kiểm. (2) Chưa tìm thấy luật bắt buộc ngày ở `orders/rules.ts`; **chưa tái hiện** | (a)? + (d) |
| YC-0017 | Đại lý thuộc tổ chức: nhiều nhân viên cùng nhập đơn cho tổ chức đó | Đợt 1 sổ đại lý chỉ đại lý cá nhân (bộ nhớ); đại lý tổ chức và nhiều tài khoản/tổ chức là việc mô hình người–vai (ADR-0018, ADR-0137 sau rà soát). Chưa kiểm ADR-0137 nói gì | (c) quyền+dữ liệu |
| YC-0018 | Nút nhận biết «đã nhập phần mềm kế toán» | **Đã làm**: ADR-0060, bảng `bil_accounting_entry`, nhãn trên thẻ đơn (`web/order-card.ts`, `web/nhap-ke-toan-ui.ts`), cùng ý với YC-0011 (đã đóng). Người dùng vẫn xin lại ⇒ nghi: chưa lên production, hoặc nút bị ẩn với người gửi (chỉ Kế toán/Toàn quyền ghi) | (a) + (d) |
| YC-0019 | Dịch vụ không cần xác nhận: lưu là duyệt luôn và hiện QR thanh toán | Đúng đặc tả `2026-10-19-xac-nhan-don-design.md` (đơn không có dịch vụ «cần xác nhận» giữ luồng cũ; QR sau xác nhận, ADR-0108). Chưa kiểm đã lên production chưa; nhánh `worktree-xac-nhan-don` còn trên máy | (a) |
| YC-0020 | Đại lý/CTV chưa có mục «Áp giá TA 1, 2…»; sửa hoa hồng đối tác | ADR-0117 lần 2 (mức TA, gắn cấp cho đại lý) **đã lên bản 2.4**, màn «Mức TA» ở `web/hoa-hong.ts`. Có thể là chưa tìm ra màn, hoặc cần gắn mức ngay trên hồ sơ đại lý. Bộ nhớ: còn «nhãn tiền» và ca vàng SV-TA chờ chủ | (a)+(d) |
| YC-0021 | Tài khoản đăng ký bằng SĐT **có Zalo** để nhận vé online | Gửi vé/OTP qua Zalo là hạng mục Zalo ZNS (BACKLOG §16) chờ Zalo OA doanh nghiệp. «Đăng ký tài khoản» tự do chưa có (tài khoản do Quản trị/Nhân sự tạo) — cần hỏi lại ý | (c) + hỏi lại |
| YC-0022 | Danh mục: sản phẩm đóng/mở khi cần | **Nhóm** dịch vụ có bật/tắt (`catalog/index.ts`); **từng sản phẩm**: danh mục đồng bộ từ Google Sheet, chưa thấy công tắc riêng — có thể đã có trên Sheet (chưa kiểm). Đụng nguồn sự thật danh mục | (c) dữ liệu |

## 2. Điểm chung rút ra (gốc, không phải từng phiếu)

1. **Người dùng không tìm thấy thứ đã có** (YC-0016.1, 0018, 0019, 0020 có thể): ba phiếu hỏi lại đúng thứ đã làm. Trước khi làm mới, cần xác minh *đã lên production chưa* và *người gửi có thấy nút không* — nếu chưa lên thì việc là phát hành, nếu có rồi mà không thấy thì là việc dẫn đường (nhãn, vị trí, Trợ giúp).
2. **Danh sách đơn đang thành màn làm việc của kế toán/điều hành** (YC-0013, 0018): ba trục lọc mới đều xoay quanh «đơn này cần tôi làm gì»: còn nợ, chưa nhập kế toán, chưa có người phụ trách. Nên làm thành *bộ lọc nhanh có sẵn* thay vì thêm từng ô.
3. **Tiền đón** (YC-0014) và **mức TA / hoa hồng** (YC-0020) cùng thuộc lớp giá chưa xong: làm chung một lượt duyệt, không tách.
4. **Mô hình đại lý–tổ chức–nhiều nhân viên** (YC-0017) là nền cho 0020: đặt quyết định này trước.

## 3. Kế hoạch

Nguyên tắc: tối đa **3** quyết định chạm quyền/dữ liệu mỗi lượt duyệt (CLAUDE.md §9); mọi việc chạm tiền/quyền/dữ liệu cần ADR chủ duyệt + người kiểm độc lập.

### Bước 0 — Xác minh (làm ngay, không đổi gì; ~nửa ngày)
- 0.1 Kiểm production đã chạy bản nào và có ADR-0060 (dấu kế toán), ADR-0134/xác nhận đơn, QR sau xác nhận chưa: dùng `docs/HANDOFF-N1.md` mục TRẠNG THÁI + `wrangler deployments list` (chỉ đọc, chủ chạy).
- 0.2 Tái hiện YC-0016.2: thử lưu đơn nháp **và** gửi/xác nhận khi không chọn ngày, ở bản chạy thật. Nếu lưu nháp được còn xác nhận chặn → không phải lỗi, chỉ cần báo rõ cho người gửi. Nếu xác nhận cũng lọt → lỗi thật, sửa theo CHANGE-GUIDE (test đỏ trước).
- 0.3 Hỏi lại người gửi YC-0016/0018/0020/0021 (4 câu ngắn, ví dụ ở §5) qua phản hồi trên phiếu — *do Quản trị/chủ trả lời, AI không ghi production*.

### Lượt A — Việc nhỏ, làm gọn (bề mặt, đảo ngược được; một nhánh)
- A1 YC-0013: thêm chip lọc nhanh «Còn công nợ», «Đã nhập kế toán / Chưa nhập», «Chưa có người phụ trách». «Còn công nợ» và «đã nhập» đọc qua view đã công bố của `billing`; «chưa phụ trách» cần cổng đọc mới giữa `orders` và `dispatch` (hợp đồng giữa module ⇒ **dừng hỏi chủ trước**, xem câu Q1). Về «bỏ lọc dịch vụ»: gỡ ô lọc dịch vụ khỏi bảng lọc — giả định bề mặt, ghi lại.
- A2 YC-0016.1 / 0018 / 0019 / 0020 (nếu 0.1 cho thấy đã có): thêm dẫn đường — mục Trợ giúp theo vai + nhãn nút rõ hơn; không đổi luật.
- A3 YC-0014 (vế ghi chú giờ đón): ô ghi chú ngắn trên chặng đón, không đổi tiền. Nếu chặng đã có ô ghi chú thì chỉ làm rõ.

### Lượt B — Cần ADR (trình chủ một lượt, 3 quyết định + trang ghép)
- B1 **Tiền đón** (YC-0014 vế tiền) + **áp mức TA / hoa hồng ngay trên hồ sơ đại lý** (YC-0020) → một ADR «lớp giá đưa đón và mức TA»; điều kiện: ADR-0117 lần 2 và sổ vàng Kế toán đã ký (xem câu Q2).
- B2 **Đại lý tổ chức, nhiều nhân viên nhập đơn** (YC-0017) → ADR mô hình người–vai (ADR-0018/0137): ai là «chủ tổ chức», ai được xem đơn của nhau.
- B3 **SĐT HDV + chi tiết sản phẩm cho tài xế** (YC-0015) → sửa đổi ADR-0053: tài xế thấy SĐT HDV *của chuyến mình chạy* và trong ngày chạy; SĐT khách đã có.
- Tách ra lượt sau: YC-0022 (đóng/mở từng sản phẩm — cần quyết nguồn sự thật Sheet hay app) và YC-0021 (đăng ký bằng SĐT Zalo — phụ thuộc Zalo OA).

### Thứ tự và điều kiện
1. Bước 0 → 2. Lượt A (song song với soạn ADR lượt B) → 3. Duyệt lượt B → 4. Thi công B1→B2→B3 (B1 trước vì chạm tiền) → 5. YC-0022, YC-0021 khi chủ chốt hướng.
Mỗi bước thi công xong: test đỏ→xanh, e2e, người kiểm độc lập cho phần tiền/quyền/dữ liệu; sau phát hành ghi nhật ký thay đổi và trả lời người gửi.

## 4. Câu chờ chủ (chạm dữ liệu/quyền/tiền — AI không tự quyết)

- **Q1 (YC-0013)** Cho `orders` đọc «đã có người phụ trách chưa» từ `dispatch` bằng hợp đồng mới (view/hàm tiêm), hay chỉ lọc theo trạng thái đơn «chờ HDV nhận» (đã có sẵn, không đổi cấu trúc)? Khuyến nghị: cách thứ hai trước.
- **Q2 (YC-0014, 0020)** Tiền đón cộng vào giá khách trả, hay là khoản riêng trên đơn? Và hoa hồng/mức TA do ai được sửa (chỉ Toàn quyền hay cả Kế toán)? Khuyến nghị: khoản riêng trên đơn, sửa chỉ Toàn quyền (khớp ADR-0090 quyền tiền).
- **Q3 (YC-0015)** Tài xế thấy SĐT HDV phụ trách chuyến: được/không? Khuyến nghị: được, chỉ trong ngày chạy.
- **Q4 (YC-0017)** «Nhiều nhân viên của một đại lý» nhập đơn: mỗi người có tài khoản riêng (đối tác) hay dùng chung một tài khoản? Khuyến nghị: tài khoản riêng, thấy đơn của nhau trong tổ chức.
- **Q5 (YC-0021)** «Đăng ký tài khoản» tự do hay vẫn do Quản trị tạo, chỉ đổi SĐT thành số có Zalo? Khuyến nghị: giữ Quản trị tạo, thêm ô «SĐT Zalo» — cần xác nhận với người gửi.

## 5. Câu hỏi lại người gửi (ngắn, để Quản trị trả lời trên phiếu)

- YC-0016: «Anh/chị lưu đơn nháp hay bấm Xác nhận khi chưa chọn ngày? Đơn nào (mã) ạ?»
- YC-0018: «Đơn đã có dòng "Đã nhập kế toán" ở danh sách, do Kế toán bấm trong chi tiết đơn. Anh/chị muốn bấm ngay ở danh sách hay thấy nút ở chỗ khác?»
- YC-0020: «Anh/chị đã mở Quản lý giá → Mức TA chưa? Muốn gắn mức ngay trên hồ sơ đại lý đúng không?»
- YC-0021: «Số có Zalo dùng để nhận vé hay để đăng nhập?»

## 6. Chưa làm / chưa kiểm

Chưa chạy giao diện; chưa kiểm production; các dòng «chưa kiểm» ở §1 cần Bước 0 trước khi dựa vào. Không đổi trạng thái phiếu nào (ghi production là việc của chủ/Quản trị).

## 7. Cập nhật sau lời chủ và hai lượt kiểm độc lập (24/10)

### 7.1 Chủ đã trả lời
- **YC-0016:** là lưu đơn nháp (chưa chọn ngày thì không gửi/xác nhận được) ⇒ **không phải lỗi**. Việc còn lại: báo rõ cho người gửi, và nếu giao diện cho phép lưu nháp thiếu ngày mà không nói gì thì thêm một dòng nhắc «chưa chọn ngày — chưa gửi được».
- **YC-0018:** phân biệt bằng **một nhãn / thẻ / màu**, ít đụng mã nhất. Nhãn «Đã nhập kế toán» đã có trên thẻ đơn (`web/order-card.ts`, ADR-0060) ⇒ việc là *làm nhãn nổi bật hơn* (màu, vị trí) và xác minh đã lên production (Bước 0.1). Không thêm nút, không thêm quyền.
- **YC-0020:** Mức TA «vô cùng quan trọng»; muốn **gán ngay trong hồ sơ đại lý và/hoặc bảng điều khiển Admin**; khách hàng/đối tác và mức TA là hai trục độc lập, chỉ cần gán mức.
- **YC-0021:** Zalo dùng để **đăng nhập**; nhận vé qua Zalo chỉ là tính năng kèm theo. (Đăng nhập bằng Zalo phụ thuộc Zalo OA, BACKLOG §16 — cần ADR riêng; không thuộc lượt A.)
- Thêm yêu cầu: kiểm lại Mức TA và hạch toán công nợ giữa công ty và đối tác theo từng đơn ⇒ kết quả ở 7.2, 7.3.

### 7.2 Kiểm Mức TA (người kiểm độc lập, chỉ đọc; 65 bài xanh, typecheck 0 lỗi, không chạy e2e/production)
- **Đạt:** hai trục độc lập có thật — *loại đối tác* (lữ hành, HDV, lễ tân khách sạn, tài xế taxi, cộng tác viên…) và *mức TA*; chiết khấu theo nhóm dịch vụ / mã dịch vụ / mọi dịch vụ, theo % hoặc đồng/khách; gán mức cho loại có ngày hiệu lực, một mức một thời điểm. **Ví dụ của chủ (lữ hành 10% Tour đảo / 7% Vinwonders; HDV 8% / 5%) đã chạy thật ra đúng số.** Tính tiền ở máy chủ, làm tròn nửa lên, giá chụp lúc Xác nhận nên đổi mức sau không làm đổi đơn cũ.
- **Thiếu:** (1) hồ sơ đại lý (`web/parties.ts`) **không hiện và không gán** mức, không có liên kết sang trang gán; chỗ gán duy nhất là trang «Hoa hồng đối tác» (`/hoa-hong`, nhóm THIẾT LẬP). (2) Mức chỉ gán theo **loại** đối tác, không gán riêng từng đại lý.
- **Cần biết (an toàn nhưng gây vướng):** hồ sơ mang hai vai gắn hai mức khác nhau ⇒ đơn bị giữ (`RULE_CONFLICT`); dịch vụ «chưa phân loại» không có hoa hồng nếu không có dòng «mọi dịch vụ»; dòng riêng của loại luôn thắng dòng mức TA (chỉ cảnh báo vàng).
- **Tài liệu lệch (Minor):** `docs/SO-HANG-RAO.md` dòng ~455 còn ghi hai ca vàng SV-TA-03/06 «chờ xác nhận», trong khi sổ vàng đã ghi xác nhận 17/10 ⇒ sửa chữ khi có dịp. «Nhãn tiền» (bộ nhớ nhắc) không tìm thấy ở ADR/BACKLOG — chủ nhắc lại nghĩa nếu còn cần.
- **Đề xuất cho YC-0020 (không cần ADR về tiền):** thêm vào hồ sơ đại lý một khối **chỉ-đọc «Hoa hồng hiện hành»** (mức TA của các vai đang mở + liên kết sang `/hoa-hong`), và một đường vào rõ trong bảng điều khiển Admin. **Không** cho gán trực tiếp ngay trên hồ sơ: ADR-0117 ghi «Kế toán đặt mức nhưng không tự gắn loại cho hồ sơ». Gán *mức riêng từng đại lý* là quyết định kiến trúc mới (bảng mới + ADR) ⇒ câu Q6 bên dưới.

### 7.3 Kiểm công nợ theo từng đơn (người kiểm độc lập; 130 bài xanh; phá thử hàm «còn lại» thì 3 bài đỏ đúng chỗ; không chạy e2e/audit-invariants/production)
- **Đạt:** phải thu một hàm, tính ở máy chủ, không bao giờ âm; đã thu / còn lại / dư theo đơn (có huỷ, hoàn khách); đối tác giữ tiền ghi thành dòng nợ «giữ hộ» chỉ-thêm; hoa hồng, giá vốn, giảm giá bên đặt tính từ bản chụp lúc Xác nhận và ghi sổ lúc «Đã giao»; sau «Đã giao» khoá (409 + trigger); điều chỉnh sổ cần người thứ hai duyệt; kiểm định kỳ `R-BIL-*` phủ rộng (chưa chạy trên dữ liệu thật).
- **Thiếu (đã duyệt hoặc chưa làm, xác minh bằng tìm mã):**
  1. Màn **«Sổ công nợ theo đối tác»** cho Kế toán/Quản trị: có route, chưa có màn (chờ chủ xem ảnh phác).
  2. **Đối tác tự xem sổ theo đơn** (ADR-0081, đã duyệt): chưa dựng.
  3. **Hoàn tiền sau «Đã giao»** (ADR-0116, đã duyệt): chưa dựng, hiện chỉ trả 409.
  4. **Lọc «còn công nợ»** ở danh sách đơn (YC-0013): chưa có.
- **Chưa chứng minh:** tổng sổ theo đối tác bằng tổng các đơn — khớp theo cấu tạo (cùng một bảng dòng nợ) nhưng chưa có bài riêng nói thẳng điều đó.
- **Rủi ro nhỏ đã ghi:** kiểm định R-BIL-2 không cộng phiếu điều chỉnh (chờ chủ duyệt ADR-0137 Đ2); đổi bên đặt sau xác nhận thay mức ghi tay bằng mức tự động (BACKLOG); lệnh đảo / «Sửa khoản thu» chưa qua duyệt người thứ hai.
- **Không phát hiện lỗi tính tiền cụ thể.**

### 7.4 Kế hoạch điều chỉnh
- **Bước 0:** thêm 0.4 — chủ (hoặc tôi, theo lệnh) chạy `node scripts/audit-invariants.mjs --db remote` chỉ-đọc để có bằng chứng thật cho `R-BIL-*`; thêm 0.5 — viết **một bài kiểm** «Σ số dư theo đối tác = Σ dòng nợ các đơn» (đóng chỗ chưa chứng minh).
- **Lượt A:** A1 (3 bộ lọc nhanh; «còn công nợ» đọc qua view `billing` đã công bố ⇒ không cần hợp đồng mới), A2 (nhãn «Đã nhập kế toán» nổi bật hơn — YC-0018), A3 (nhắc «chưa chọn ngày» ở đơn nháp — YC-0016), **A4 (mới, YC-0020):** khối chỉ-đọc «Hoa hồng hiện hành» + liên kết trong hồ sơ đại lý, và đường vào ở bảng điều khiển Admin; kèm sửa chữ `SO-HANG-RAO.md`.
- **Lượt B (ADR, tối đa 3 quyết định):** B1 lớp giá đưa đón + (nếu chủ chọn) gán mức riêng từng đại lý; B2 đại lý tổ chức nhiều nhân viên; B3 SĐT HDV cho tài xế. **Việc đã duyệt chưa dựng đưa vào hàng chờ thi công, không cần duyệt lại:** màn Sổ công nợ cho Kế toán, ADR-0081 đối tác xem sổ, ADR-0116 hoàn tiền sau giao — thứ tự gợi ý: màn Sổ công nợ → ADR-0081 → ADR-0116 (đều chạm tiền ⇒ có người kiểm độc lập).
- **Câu mới Q6 (YC-0020):** Cần gán mức **riêng cho từng đại lý** (ví dụ cùng là lữ hành nhưng đại lý A mức TA1, đại lý B mức TA2), hay gán theo loại là đủ? Khuyến nghị: theo loại là đủ giai đoạn này; đại lý đặc biệt dùng «dòng riêng của một đối tác» đã có. Chủ trả lời 24/10 «gán ngay trong hồ sơ đại lý» có thể hiểu là xem+vào nhanh (làm ngay ở A4) hoặc gán riêng (cần ADR) — cần chủ chốt.

## 8. Kế hoạch CHỐT (chủ ra lệnh «chốt kế hoạch để thực hiện đầy đủ toàn bộ», 24/10)

Chủ chưa trả lời riêng Q1–Q5 nên **theo khuyến nghị đã ghi ở mục 4** (ghi nhận: chủ chốt kế hoạch theo khuyến nghị). Điều này đủ cho việc bề mặt; **không thay lời duyệt ADR** — mọi việc chạm tiền, quyền, dữ liệu vẫn cần chủ duyệt ADR (Hiến pháp N3) trước khi thi công.

| Câu | Chốt |
|---|---|
| Q1 lọc «chưa phụ trách» | Lọc theo trạng thái đơn «chờ HDV nhận» (đã có), **không** mở hợp đồng `orders`↔`dispatch` mới |
| Q2 tiền đón, hoa hồng | Tiền đón là khoản riêng trên đơn; sửa mức/hoa hồng chỉ người giữ `partner.commission.write` (Kế toán, Quản trị, Toàn quyền) — **chờ ADR** |
| Q3 SĐT HDV cho tài xế | Có, chỉ chuyến mình chạy và trong ngày chạy — **chờ ADR (sửa ADR-0053)** |
| Q4 đại lý tổ chức | Mỗi nhân viên một tài khoản riêng, thấy đơn của nhau trong tổ chức — **chờ ADR, lượt duyệt sau** |
| Q5 đăng ký/Zalo | Quản trị vẫn tạo tài khoản; thêm ô «SĐT Zalo»; đăng nhập Zalo chờ Zalo OA — **chờ ADR** |
| Q6 mức TA riêng đại lý | Làm khối chỉ-đọc trước (đã xong, commit 33c92b66); ADR 0138 chờ duyệt |

### Thực hiện (ba phiên song song, không đụng cùng tệp; phiên này giữ tài liệu)
1. **Lượt A (mã):** A1 ba bộ lọc nhanh danh sách đơn (còn công nợ, đã/chưa nhập kế toán, chờ HDV nhận) + gỡ ô lọc dịch vụ; A2 nhãn «Đã nhập kế toán» nổi bật; A3 nhắc «chưa chọn ngày» ở đơn nháp; ô ghi chú giờ đón nếu chưa có. Đỏ trước xanh sau, kiểm độc lập, kịch bản Chrome.
2. **Bộ ADR lượt duyệt kế tiếp (chỉ tài liệu):** nháp ADR «tiền đón + sửa mức» và «SĐT HDV cho tài xế», cùng trang ghép với ADR 0138 (đã có) — tối đa 3 quyết định chạm tiền/quyền/dữ liệu một lượt; nháp «đại lý tổ chức» cho lượt sau.
3. **Sổ công nợ (kiểm + test, không giao diện):** bài khoá «Σ số dư theo đối tác = Σ dòng nợ các đơn», rà `quyen-hoan.json`, soạn kế hoạch thi công cho ba phần đã duyệt chưa dựng (màn Sổ công nợ Kế toán, ADR-0081 đối tác xem sổ, ADR-0116 hoàn tiền sau giao). Hai màn sổ cần ảnh phác của chủ trước khi dựng.

### Chưa thi công trong đợt này (cần chủ)
Duyệt ADR 0138 + hai nháp mới; ảnh phác hai màn sổ; Zalo OA; chạy `audit-invariants --db remote`; day-len/trien-khai (lệnh do chủ chạy).

## 9. Kế hoạch CHỐT, làm LẦN LƯỢT trong MỘT phiên (thay phần «Thực hiện» của mục 8; chủ 24/10)

Ba phiên song song ở mục 8 đã dừng giữa chừng: không phiên nào commit; phần sửa dở nằm trong thư mục làm việc của từng phiên, **không dùng lại** (làm lại từ test đỏ ở đây).

**Nguyên tắc thứ tự:** việc cần chủ duyệt đi TRƯỚC (soạn nhanh, chủ đọc trong lúc AI làm mã) → việc không cần duyệt, rủi ro thấp → lưới an toàn cho tiền → việc chạm tiền/quyền chỉ sau khi ADR được duyệt. Mỗi bước: test đỏ → xanh, `npm test` + `typecheck` xanh, commit riêng; bước chạm tiền/quyền/dữ liệu có người kiểm độc lập (subagent chỉ đọc). Báo «xong bước x / tổng 9».

| Bước | Việc | Cần chủ trước? | Xong khi |
|---|---|---|---|
| 1 | **Xác minh hiện trạng** (chỉ đọc): production đang chạy bản nào, đã có dấu kế toán (ADR-0060), xác nhận đơn/QR chưa — `docs/HANDOFF-N1.md` + `wrangler deployments list` | Không | Bảng «đã lên / chưa lên» trong tệp này |
| 2 | **Soạn bộ ADR lượt duyệt 1**: nháp «tiền đón là khoản riêng» (YC-0014) + «SĐT HDV cho tài xế» (YC-0015, sửa ADR-0053) + trang ghép chung với nháp 0138; nháp lượt 2 «đại lý tổ chức nhiều nhân viên» (YC-0017) | Không (chỉ tài liệu) | Bốn tệp nháp + trang ghép; người kiểm soi sự thật; **trình chủ duyệt** |
| 3 | **Lượt A1** bộ lọc nhanh danh sách đơn: còn công nợ (qua view `billing`), đã/chưa nhập kế toán, chờ HDV nhận; gỡ ô lọc dịch vụ | Không — trừ khi cần view/migration mới thì dừng hỏi | Bài đỏ→xanh, e2e lọc đơn, kiểm độc lập |
| 4 | **Lượt A2–A4**: nhãn «Đã nhập kế toán» nổi bật; nhắc «chưa chọn ngày» ở đơn nháp; kiểm ô ghi chú giờ đón | Không (màu mới thì hỏi) | Ảnh thật hai khổ cho chủ duyệt một lượt |
| 5 | **Lưới an toàn sổ công nợ**: bài khoá «Σ số dư theo đối tác = Σ dòng nợ các đơn»; sửa chữ `SO-HANG-RAO.md` (SV-TA-03/06) | Không | Bài xanh + phá thử đỏ đúng chỗ |
| 6 | **Kế hoạch thi công sổ đối tác**: màn Sổ công nợ Kế toán → ADR-0081 đối tác xem sổ → ADR-0116 hoàn tiền sau giao | Ảnh phác hai màn sổ (chủ vẽ) | Tệp kế hoạch có tiêu chí nghiệm thu |
| 7 | **Thi công ADR lượt 1 đã duyệt**, lần lượt: 0138 gắn mức TA riêng → SĐT HDV cho tài xế → tiền đón | **Có: ADR duyệt** | Mỗi ADR một commit, kiểm độc lập, ca vàng nếu chạm tiền |
| 8 | **Thi công sổ đối tác** theo kế hoạch bước 6 | **Có: ảnh phác** | Như bước 7 |
| 9 | **Lượt 2**: đại lý tổ chức (sau duyệt); đăng nhập Zalo (sau khi có Zalo OA) | **Có** | — |

**Điểm dừng tự nhiên:** sau bước 2 (chủ duyệt ADR), sau bước 4 (chủ xem ảnh, quyết phát hành bằng `npm run day-len` + `npm run trien-khai`), sau bước 6 (chủ vẽ ảnh phác). Trong lúc chờ duyệt, AI làm tiếp bước không phụ thuộc (3 → 4 → 5 → 6), không ngồi chờ.
**Phát hành:** gom bước 3–5 thành một lần phát hành (có mục nhật ký thay đổi; bước 3 có thể thêm view ⇒ migration ⇒ cần triển khai); bước 7, 8 mỗi ADR một lần phát hành.

## 10. Kết quả bước 1 — xác minh hiện trạng (24/10, chỉ đọc)

Nguồn: `docs/HANDOFF-N1.md` mục TRẠNG THÁI (chủ dán kết quả `kiem-phien-ban.mjs --sau-deploy` → «ĐẠT: production đang chạy đúng bản 2.28», `main` `ed174142`); nhánh này chứa `ed174142`; đối chiếu `src/shared/changelog.ts`. AI không gọi được production từ máy phiên (chưa kiểm trực tiếp lần nữa).

| Góp ý | Tính năng | Production 2.28? | Hệ quả cho kế hoạch |
|---|---|---|---|
| YC-0018, YC-0013 (vế kế toán) | Dấu «Đã nhập phần mềm kế toán» + số hoá đơn, nhãn trên thẻ đơn **và lọc đã nhập / chưa nhập** (ADR-0060) | **Đã lên từ bản 1.46** (30/9) | Bộ lọc «đã/chưa nhập kế toán» **đã có** ⇒ bỏ khỏi bước 3. YC-0018 chỉ còn làm nhãn nổi bật (bước 4) + trả lời người gửi chỗ bấm |
| YC-0016 | Đón/Không đón bắt buộc, khung giờ đón, nháp chưa chọn vẫn lưu (ADR-0134, migration 0115) | **Đã lên** (2.2x) | Bước 4 nhắc «chưa chọn ngày» vẫn cần (khác «chưa chọn đón») |
| YC-0019 | Đơn chỉ cần xác nhận khi có dịch vụ «cần xác nhận»; QR sau xác nhận (đặc tả 19/10 Phần A, C; ADR dự kiến 0136, 0137 cũ) | **Chưa** (chỉ Đợt 1 = ADR-0134 lên) | Đã có đặc tả + nhánh `worktree-xac-nhan-don*`; không làm lại ở đây, chỉ trả lời người gửi «đang làm» |
| YC-0020 | Mức TA (ADR-0117 lần 2) | **Đã lên bản 2.4** | Đúng như kiểm 7.2 |
| YC-0014 | Đưa đón theo nhóm + điểm chọn nhanh (**ADR-0118 đã duyệt 14/10, thi công + kiểm độc lập xong**) | **CHƯA — nhánh `claude/tour-dao-booking-audit-bc6c77` (đầu `d7495a77`) bị bỏ quên 10 ngày, hơn nhánh này 23 commit, chưa `day-len`** | Phát hiện quan trọng: phải đưa vào bản chính trước khi làm tiền đón. Có thể vướng xung đột với ADR-0134 (khung giờ) đã lên sau |
| YC-0014 (vế tiền) | **Lớp giá đưa đón (lượt 2)**: chủ đã chốt hướng 14/10 (đặc tả `2026-10-14-dot-2-gia-dua-don.md` bản 2, trên nhánh trên): phụ thu theo người, giá xe riêng theo chuyến, quy tắc là dữ liệu do **Quản trị** đặt, có hiệu lực từ ngày, đơn đã xác nhận không đổi, **phụ thu không tính hoa hồng đại lý**, nơi tự gõ tính mức «ngoài vùng», Bán hàng không sửa giá trên đơn | Chưa có ADR | **Sửa câu Q2 ở mục 8:** khuyến nghị «sửa chỉ người giữ partner.commission.write» MÂU THUẪN lời chủ 14/10 («Quản trị đặt; chỉ Quản trị / Toàn quyền điều chỉnh, có lý do») ⇒ theo lời chủ 14/10 (không hỏi lại). Nháp ADR lớp giá dựng trên đặc tả bản 2, không thiết kế lại |

**Thay đổi thứ tự sau bước 1:** bước 3 chỉ còn «còn công nợ», «chờ HDV nhận», gỡ ô lọc dịch vụ. Thêm một việc cho chủ: quyết số phận nhánh đưa đón ADR-0118 (`day-len` sau khi AI kiểm xung đột với `main`, hay làm lại trên `main` mới). Lượt duyệt 1 = {0138 gắn mức TA riêng, SĐT HDV cho tài xế}; ADR lớp giá đưa đón là lượt riêng, sau khi nhánh ADR-0118 vào bản chính.
