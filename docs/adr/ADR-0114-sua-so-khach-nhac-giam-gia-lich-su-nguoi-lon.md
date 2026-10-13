# ADR-0114 — Sửa số khách: nhắc giảm giá khi bớt khách, lịch sử đủ dòng từ lúc khởi tạo, mỗi đơn có ít nhất một người lớn

- **Trạng thái:** **accepted** 2026-10-13 — chủ dự án trả lời trong chat: "duyệt ADR-0114, kèm điều kiện Kế toán xem lại hai khoá mới". Điều kiện nằm ở mục "Điều kiện của chủ".
- **Ngày:** 2026-10-13.
- **Văn bản trình duyệt:** `docs/superpowers/specs/2026-10-13-sua-so-khach-adr-0114/01-de-xuat-adr-0114.md`; trang ghép cùng thư mục (`00-trang-ghep.md`); trang trình cho chủ `docs/superpowers/specs/2026-10-13-adr-0114-trang-trinh-cho-chu.md`. Kế hoạch thi công: `docs/superpowers/plans/2026-10-13-sua-so-khach-adr-0114-ke-hoach.md`.
- **Thuộc lượt:** một lượt duyệt, ba quyết định (D1, D2, D3), dưới trần 3 của `CLAUDE.md` §9.
- **Sửa:** phiếu kiểm 5b của lượt duyệt 8c (ADR-0109) về ca sổ vàng "tạm tính về 0" — xem mục "Câu bị thay".
- **Mốc đo mã:** `origin/main` @ `f9cb4ce3`. Không ghi số dòng; tên hàm và tên tệp.
- **Xây trên lỗ đang hở:** không. ADR này không đổi cách tính phải thu (ADR-0109 giữ nguyên) nên không dựa vào TNV-G1, TNV-G3, TNV-G4 trong `docs/quyen-hoan.json`. Người kiểm độc lập đối chiếu lại điểm này khi thi công.
- **Cửa:** hai chiều. Chỉ thêm một câu cảnh báo, một khối dòng lịch sử và một điều kiện từ chối; không bảng mới, không cột mới, không migration. Muốn đảo lại thì bỏ điều kiện từ chối và hai khoá hiển thị.

## Lời chủ dự án

- 2026-10-13, khi xem sổ vàng `golden/sua-so-khach-van-phong.json` (nguyên văn): "nếu giảm số lượng thì nhớ hiện nhắc nhở phần khuyến mại. Ví dụ: 10 người giá 50, nhưng giảm chỉ còn 2 người mà cũng giá 50 là phải báo đỏ"; "Đối với SV-SK-07, cần phải thể hiện đầy đủ tất cả các số dòng trước-trong-sau điều chỉnh (hiện tại đang bị thiếu dòng lúc khởi tạo)"; "SV-SK-10: số người lớn luôn phải lớn hơn 1 trong bất kỳ đơn nào, lý do là trẻ em phải đi kèm với người lớn."
- Bốn lựa chọn chủ đã trả lời trong chat cùng ngày: nhắc mỗi lần bớt khách trên đơn có giảm giá; sửa cả sổ vàng lẫn màn hình lịch sử đơn; ít nhất một người lớn, tính trên cả đơn; soạn ADR và kế hoạch trước, chưa sửa mã.
- 2026-10-13, duyệt: "duyệt ADR-0114, kèm điều kiện Kế toán xem lại hai khoá mới".

## Bối cảnh

- Sửa số khách sau xác nhận đã có hai đường dùng chung một luật tiền (`planMoneyEdit`): văn phòng `POST /api/orders/:id/money-edit` và hướng dẫn viên `handler-money-edit`. Giảm giá lưu trên đơn không đổi sau xác nhận (ADR-0063 D1.4); ADR-0109 chốt phải thu không âm và chỉ cảnh báo khi giảm giá lớn hơn tạm tính hiện hành.
- Khoảng trống: bớt khách mà giảm giá vẫn nhỏ hơn tạm tính thì máy im lặng, dù khuyến mại có thể không còn hợp lý; trang đơn chỉ hiện các lần sửa, không có dòng số khách lúc xác nhận; và máy cho bớt tới 0 người lớn (ca SV-SK-10). Máy chỉ đòi "ít nhất 1 khách không phải em bé" cho từng dịch vụ ở form, và đòi tổng số khách ≥ 1 ở cột lưu.
- Ở dịch vụ tính theo nhóm hoặc nhập tay, ô "số khách" lưu ở cột `adult`, không phân tuổi.

## Quyết định

**D1 — Nhắc màu đỏ khi bớt khách trên đơn có giảm giá.**
- Điều kiện (tính từ trạng thái hiện hành, không lưu cờ): giảm giá của đơn > 0 **và** số khách trả tiền (người lớn + trẻ em + người cao tuổi, mọi dịch vụ danh mục; hàm `payingGuests`) hiện hành nhỏ hơn số lúc xác nhận.
- Câu nhắc, không có chữ số: "Đơn có giảm giá nhưng số khách đã giảm so với lúc xác nhận, giảm giá vẫn giữ nguyên. Kế toán xem lại khuyến mại."
- Chỉ là cảnh báo: không đổi số tiền, không chặn. Chạy độc lập với cảnh báo cũ "giảm giá lớn hơn tiền dịch vụ" (hai câu có thể cùng hiện). Một hàm thuần ở `src/shared/so-khach-van-phong.ts`; máy chủ gửi khoá `canhBaoKhuyenMai` ở phản hồi cả hai đường sửa và ở chi tiết đơn; giao diện dùng màu nguy hiểm (câu cũ vẫn màu vàng).
- Đơn bớt từ 10 xuống 2 rồi tăng lên 3 vẫn còn nhắc, cho tới khi đủ lại số lúc xác nhận.
- Không phải giảm giá co theo số khách: số tiền giữ nguyên như ADR-0109.

**D2 — Lịch sử số khách hiện đủ dòng, kể cả dòng lúc khởi tạo.**
- Khối "Lịch sử" của trang đơn thêm: dòng lúc xác nhận (số khách và tạm tính), từng lần sửa (trước và sau), kết quả hiện hành. SV-SK-07 ra ba dòng: 4 người lớn (2.000.000), 3 (1.500.000), 5 (2.500.000).
- Dòng đầu suy ra từ số khách đã chụp lúc xác nhận (hoặc `before_json` của lần sửa đầu); không đọc chữ nhật ký, không migration. Tên dịch vụ nhập tay không vào dòng (cùng quy tắc với `doanSoKhach`).
- Máy chủ chỉ trả khoá `lichSuSoKhach` khi người xem có `order.history.view`; còn lại `null`. Không đổi ai được xem gì.

**D3 — Mỗi đơn có ít nhất một người lớn, tính trên cả đơn.**
- Máy chủ từ chối ở lập đơn, lưu nháp, chuyển sang xác nhận và sửa số khách (cả hai đường). Câu: "Đơn cần ít nhất một người lớn đi cùng; trẻ em và em bé không đi một mình."
- Ba điều khoản kèm theo (chủ duyệt cùng ADR):
  1. **Người cao tuổi tính là người đi kèm:** người đi kèm = người lớn + người cao tuổi. Đơn toàn người cao tuổi lập được. Nếu sau này muốn đúng chữ "người lớn" thì đổi một hằng số.
  2. **Dịch vụ tính theo nhóm hoặc nhập tay** (ô "số khách" ở `adult`) được tính là người lớn; hệ thống không phân biệt được trẻ em ở đó. Giới hạn đã biết.
  3. **Đơn cũ không có người lớn** không bị chặn thêm: lần sửa số khách chỉ bị từ chối khi nó đưa số người đi kèm từ ≥ 1 xuống 0. Bất biến dữ liệu mới là **cảnh báo** (thoát 0), không phải lỗi, vì thoát 1 sẽ dừng `trien-khai`.
- Từ chối bằng mã `thieu_nguoi_lon` (409) ở sửa số khách và chuyển trạng thái; ở lập đơn và lưu nháp theo khuôn thông báo lỗi nhập liệu hiện có.
- Câu gốc của chủ là "lớn hơn 1"; chủ đã chọn "ít nhất 1 người lớn" trong chat, nên ADR theo cách hiểu đó.

## Điều kiện của chủ

Kế toán xem lại hai khoá đáp án mới (`canh_bao_khuyen_mai`, `lich_su_so_khach`) trên sổ vàng sửa số khách.
- Hai khoá được thêm vào đáp án mọi ca. Số tiền ở các ca đã xác nhận (SV-SK-01, 02, 03, 05, 06) **không đổi**; chủ đã duyệt việc thêm hai khoá vào các ca đó (sửa đáp án ca đã xác nhận cần chủ duyệt — `golden/README.md`).
- Mỗi ca có thêm trường `xac_nhan_khoa_moi` (`trang_thai`, `nguoi`, `ngay`), ban đầu `cho_xac_nhan`. Ca đã xác nhận giữ `da_xac_nhan` cho phần tiền; hai khoá mới chỉ tính đã xem lại khi Kế toán ghi người và ngày. AI không tự xác nhận.
- Việc thi công ADR này chưa coi là xong cho tới khi danh sách xem lại được đưa cho Kế toán; bản phát hành không phụ thuộc vào việc Kế toán đã xem xong.

## Câu bị thay (nguyên văn → mới; không sửa thân ADR cũ)

| Nguồn | Nguyên văn | Mới |
|---|---|---|
| Phiếu kiểm 5b, lượt duyệt 8c (ADR-0109), và cờ bắt buộc `tamTinh0` trong `src/so-vang-sua-so-khach.test.ts` | Sổ vàng sửa số khách phải có ca "tạm tính về 0" | Ca đó (SV-SK-10) nay bị D3 cấm. Thay cờ `tamTinh0` bằng cờ `tuChoiKhongNguoiLon`: sổ vàng phải có ca bị từ chối vì không còn người lớn. Không bỏ cờ lặng lẽ. Đây là đổi hàng rào, chủ duyệt cùng ADR. Tạm tính về 0 chỉ còn khi giá người lớn bằng 0 |
| ADR-0063 D1.12 / ADR-0109 quyết định 6 | "Không chặn thao tác" | Giữ nguyên cho cảnh báo giảm giá. D3 là **chặn riêng** theo số người lớn, không phải thêm trần giảm giá |

**Không đổi:** cách tính tạm tính, phải thu, còn lại, dư (ADR-0109); hoa hồng và giá vốn (ADR-0077/0078); câu "Cần ít nhất 1 khách không phải em bé" của từng dịch vụ ở form.

## Hệ quả và rủi ro

- **Được:** Kế toán không bỏ sót khuyến mại khi bớt khách; lịch sử đọc được từ đầu đến cuối; trẻ em không còn lập được đơn một mình.
- **Mất:** thêm một dòng đỏ ở những đơn mà khuyến mại có khi vẫn hợp lý; một số đơn nhập tay hoặc đơn cũ có thể bị vướng ở D3.
- **Bài và dữ liệu mẫu phải sửa theo:** sổ vàng `golden/sua-so-khach-van-phong.json` (hai khoá mới ở mọi ca; SV-SK-07 ba dòng; SV-SK-10 thành ca bị từ chối; thêm SV-SK-12 đúng ví dụ chủ: 10 người lớn × 500.000, giảm giá 50.000, bớt còn 2 — tạm tính 1.000.000, phải thu 950.000, nhắc đỏ, không cảnh báo giảm giá vượt; số đồng do người soạn chọn cho tròn), bài `src/so-vang-sua-so-khach.test.ts`, các bài và e2e đang dùng đơn 0 người lớn (thi công kê danh sách bằng cách chạy bộ kiểm), Trợ giúp và nhật ký thay đổi.
- **Việc lớn (tiền, luật đơn):** mỗi task đỏ → xanh; người kiểm độc lập chỉ đọc; cần phát hành bản mới (có triển khai).

## Bài kiểm / hàng rào

Mỗi rào quan sát chặn thật: sửa cố ý → đỏ → hoàn nguyên, có dòng `docs/SO-HANG-RAO.md` kèm ngày.
1. D3 ở bốn cửa: lập đơn, lưu nháp, xác nhận, sửa số khách (hai đường); đơn toàn người cao tuổi qua; dịch vụ nhóm / nhập tay qua; đơn cũ 0 người lớn chỉ bị chặn khi sửa từ ≥ 1 xuống 0.
2. D1: ví dụ chủ (SV-SK-12) nhắc, giảm giá bằng 0 không nhắc, tăng khách không nhắc, 10 → 2 → 3 vẫn nhắc; câu không có chữ số.
3. D2: SV-SK-07 ra ba dòng; người không có `order.history.view` nhận `null`.
4. Sổ vàng lớp 1 tự cân, lớp 2 chạy hàm thật cho cả hai khoá mới.
5. Bất biến dữ liệu mới (cảnh báo): đơn đã xác nhận có tổng người đi kèm bằng 0.
6. `npm test`, `npm run typecheck`, `npm run test:e2e`, kịch bản Chrome sửa số khách và lập đơn.

## Phương án loại

- **Ít nhất 2 người lớn:** chặt hơn nhiều, chủ đã chọn 1.
- **Ít nhất 1 người lớn cho từng dịch vụ:** quá chặt với đơn nhiều dịch vụ.
- **Chỉ cảnh báo thiếu người lớn, không chặn:** không đáp ứng lời chủ "luôn phải".
- **Nhắc theo từng lần bớt, lưu cờ:** cần cột mới; so với lúc xác nhận cho cùng ý và không cần lưu.
- **Giảm giá co theo số khách:** chủ đã không chọn ở ADR-0109.

## Chưa kiểm

- Số đơn đã xác nhận có 0 người đi kèm trên production: chưa biết, tôi không đọc được dữ liệu thật. Muốn biết thì chủ chạy một lệnh đọc, hoặc bất biến mới sẽ in số này sau lần triển khai.
- Cách câu nhắc đỏ đứng cạnh câu cảnh báo vàng trên màn hình: chưa xem ảnh.
- Có đơn nhập tay lập từ trước chỉ có người cao tuổi hay chỉ có trẻ em hay không: chưa kiểm.
