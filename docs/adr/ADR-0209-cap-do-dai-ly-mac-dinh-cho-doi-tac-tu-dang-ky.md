# ADR-0209 — Cấp độ đại lý mặc định cho đối tác tự đăng ký

- **Trạng thái:** **accepted** 2026-11-15 — chủ dự án, nút trả lời «Duyệt theo câu mẫu», ngay sau trang trình `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-b/TRINH-CHU.md`. Câu mẫu nguyên văn: «Duyệt ADR-0209 và ADR-0210, chữ theo khuyến nghị. Cho phép xây trên lỗi HC-5.19, có lý do: chỉ thêm hai bảng cài đặt và hai cách đọc dữ liệu, mỗi lần duyệt chỉ ghi cấp riêng cho đúng người vừa được duyệt.» Khoá cho phép ở `docs/quyen-hoan.json`: `xay_tren_cho_phep_adr_0209_0210`. Lịch sử: **proposed** 2026-11-15 — AI soạn theo khung đã duyệt hướng ngày 15/11 (`docs/superpowers/specs/2026-11-15-dang-ky-va-duyet-tai-khoan/THIET-KE.md` mục 5.6). Chờ chủ duyệt; AI không tự duyệt (Hiến pháp N3). Trang trình: `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-b/TRINH-CHU.md`.
- **Số:** 0209 (lúc cấp, 0203–0205 đang ở ba nhánh khác, 0206–0208 cấp cho lượt A). Tên giữ chỗ trong khung: `ĐK-7`.
- **Nguồn:** lời chủ 15/11, nguyên văn: «Cho phép tài khoản đăng ký mặc định được hưởng chính sách đại lý cụ thể (Ví dụ là TA1), tùy chỉnh trong bảng điều khiển của Quản lý bán hàng, Quản trị và Toàn quyền (Super Admin).»
- **Ngày:** 2026-11-15. **Loại:** việc lớn — tiền (cấp quyết mức hoa hồng), quyền (ô mới cho Quản lý bán hàng), dữ liệu (bảng chính sách mới). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về luật (bỏ cấp mặc định là thôi ghi cấp riêng lúc duyệt); một chiều mềm về dữ liệu (cấp riêng đã ghi cho đối tác ở lại, đổi bằng «Đổi cấp riêng» sẵn có).
- **Quan hệ với ADR cũ:**
  - **ADR-0138, ADR-0151:** dùng nguyên bảng cấp riêng `prc_party_tier`, thứ tự tính hoa hồng, và nút «Đổi cấp riêng». Không đổi luật tính.
  - **ADR-0169 Đ2:** «muốn chuyển việc nào lên Quản lý thì ADR sau». ADR này là ô đầu tiên cho Quản lý bán hàng chạm điều khoản thương mại.
  - **ADR-0207 Đ5:** thêm một câu vào lô duyệt, đứng sau câu mở vai trò.
  - **ADR-0117, ADR-0090:** ô `partner.commission.write` (Kế toán, Quản trị, Toàn quyền) không đổi; Quản lý bán hàng **không** nhận ô đó.
- **Xây trên lỗ đang hở: HC-5.19** — lý do xin phép: chỉ thêm một bảng chính sách; không đổi dòng cấp riêng hay sổ tiền nào đang có; chỉ áp cho đối tác duyệt từ phiếu đăng ký về sau.
- **Hiến chương áp:** 2.2, 2.3, 4.2, 5.2, 5.4, 5.6, 5.12, 5.17, 5.28, 5.29. **Lệch có chủ ý:** không.
- **Số quyết định chạm quyền/dữ liệu/tiền:** 1 (cùng lượt với ADR-0210 — tổng 2).

## Bối cảnh

Cấp độ đại lý (TA1, TA2…) là dữ liệu do Kế toán tạo. Hôm nay một đối tác nhận cấp theo hai đường: cấp của cả vai trò («Gán cho vai trò»), hoặc cấp riêng của đối tác («Gán cho đối tác»), do Kế toán, Quản trị, Toàn quyền làm. Cấp riêng được tính trước cấp của vai trò. Chưa có khái niệm «cấp cho đối tác mới vào». Quản lý bán hàng (ADR-0169) xem được hoa hồng nhưng không có ô nào chạm cấp.

## Quyết định

**Đ1 — Cấp mặc định là chính sách theo từng loại đối tác.** Một bảng mới của `pricing` (tên giữ chỗ `prc_signup_tier_policy`), chỉ thêm dòng, có ngày hiệu lực (khuôn `ord_pickup_time_policy`): mỗi dòng gồm loại đối tác (một vai trò trong danh sách được hưởng), cấp (một dòng `prc_rate_tier`), hoặc «không đặt». Dòng hiệu lực là dòng có mốc lớn nhất không sau lúc xét. Đặt cùng một cấp cho mọi loại thì là nhiều dòng cùng cấp. Trigger: không sửa, không xoá; cấp phải đang bật lúc đặt; loại phải đang được hưởng.

**Đ2 — Ai đặt:** một hàng quyền mới (tên giữ chỗ `partner.signup_tier.write`) theo khuôn `quanLyBanHang()` sẵn có: **Quản lý bán hàng, Quản trị, Toàn quyền**. Người đặt chỉ chọn trong các cấp đang bật; không tạo cấp, không sửa mức, không đổi cấp của đối tác đang có. Kế toán **không** có ô này (đúng lời chủ), nhưng vẫn đổi được cấp riêng từng đối tác bằng ô sẵn có. Xem chính sách: dùng lại ô sẵn có `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền; Quản lý bán hàng qua được nhờ mã Bán hàng đi kèm theo ADR-0169 — cột riêng của Quản lý bán hàng ở ô này là `none`). Bán hàng thường vì thế xem được chính sách nhưng không đặt được.

**Đ3 — Áp lúc duyệt, chụp lúc duyệt** (Hiến chương 5.6). Lô duyệt của ADR-0207 thêm **một câu** do `pricing` cấp, đứng **sau** câu mở vai trò: chèn một dòng `prc_party_tier` cho hồ sơ kết quả, cấp = cấp mặc định đang hiệu lực của **vai trò người duyệt đã chọn** (Đ4), từ ngày duyệt (giờ Việt Nam, truyền vào làm tham số). Câu dùng dạng `INSERT … SELECT … WHERE`, và **mệnh đề WHERE lặp đúng mọi điều kiện của các trigger trên `prc_party_tier`**, để câu này **bỏ qua** (chèn 0 dòng) thay vì làm hỏng cả lô duyệt:
- có dòng chính sách hiệu lực cho vai trò đó và dòng đó không phải «không đặt»;
- cấp đang bật (`prc_rate_tier.active = 1`, khớp trigger `prc_party_tier_tier_ok`);
- vai trò còn trong danh sách được hưởng và đang bật (đọc view công bố `v_prc_beneficiary_role`, khớp trigger `prc_party_tier_party_ok`);
- hồ sơ **không có dòng cấp riêng nào chưa huỷ có khoảng ngày giao với [ngày duyệt, mãi mãi)** — tức `voided_at IS NULL AND COALESCE(valid_to_date, '9999-12-31') >= ngày duyệt`, đúng điều kiện của trigger chồng ngày (bản `0126`). Nhờ vậy cấp riêng bắt đầu từ ngày mai, hay cấp riêng đóng vào một ngày sắp tới, đều được **giữ nguyên** thay vì làm lô thất bại.

Thiếu một điều kiện thì không ghi cấp riêng, đối tác theo cấp của vai trò như hôm nay; màn của người xác minh và lô duyệt báo rõ lý do («loại này chưa đặt cấp», «cấp mặc định đang tắt», «hồ sơ đã có cấp riêng»). Trigger vẫn là lưới cuối.

Đổi cấp mặc định về sau chỉ áp cho phiếu duyệt về sau; đối tác đã duyệt giữ cấp đã nhận.

**Đ4 — Ai thấy gì, và cấp theo vai trò nào.** Cấp theo **vai trò người duyệt chọn cuối cùng** (ADR-0207 Đ4: mặc định là loại người đăng ký xin, Nhân sự đổi được). Người xác minh (Quản trị) thấy «cấp sẽ áp» theo loại người đăng ký xin. Nhân sự không thấy tên cấp (không giữ ô xem hoa hồng); khi Nhân sự đổi vai trò khác loại đã xin, màn duyệt báo «cấp hoa hồng sẽ theo chính sách của vai trò mới». Dòng cấp riêng ghi người tạo là người duyệt; đây là **ghi thay mặt chính sách** do người giữ ô đặt cấp mặc định đã quyết, không phải Nhân sự tự chọn mức, và được chấp nhận có tên (Nhân sự không giữ `partner.commission.write`). Nhật ký của lệnh duyệt ghi thêm mã cấp đã áp; mỗi lần đổi chính sách có một dòng nhật ký mang loại đối tác, mã cấp cũ và mới.

**Đ5 — Màn hình.** Ở màn Hoa hồng đối tác (thẻ Cấp độ đại lý) thêm khối «Cấp cho đối tác tự đăng ký»: mỗi loại đối tác một dòng, chọn cấp hoặc «không đặt». Quản lý bán hàng vào được màn này nhờ mã Bán hàng đi kèm (ô `partner.commission.view`); nút lưu của khối chỉ hiện cho người giữ ô đặt cấp mặc định. Tên khối, tên nút chờ chủ chọn (phụ lục trang trình).

**Đ6 — Ranh giới.** `pricing` là chủ duy nhất của bảng mới và cấp câu lệnh chưa chạy cho lô duyệt (Hiến chương 5.3); `dang-ky` không đọc bảng của `pricing`.

## Phương án bị loại

- **Một cấp mặc định chung cho mọi loại:** cộng tác viên và lễ tân khách sạn thường hưởng khác nhau; theo loại vẫn đặt chung được khi muốn.
- **Gán cấp cho cả vai trò** («Gán cho vai trò» sẵn có): đổi luôn cấp của mọi đối tác cũ cùng vai trò, không phải điều chủ muốn.
- **Tính cấp mặc định lúc lập đơn thay vì ghi cấp riêng:** thêm một bậc mới vào thứ tự tính hoa hồng, đổi luật tiền và sổ vàng.
- **Cho Quản lý bán hàng giữ `partner.commission.write`:** mở luôn việc sửa mức, rộng hơn lời chủ.

## Bài kiểm (đỏ trước, xanh sau)

- Bảng quyền: Quản lý bán hàng, Quản trị, Toàn quyền đặt được; Kế toán, Bán hàng, Nhân sự, Đối tác: 403.
- Trigger: không sửa, không xoá dòng chính sách; cấp đang tắt hay loại không được hưởng thì không đặt được.
- Lô duyệt: hồ sơ mới có đúng một dòng cấp riêng bằng cấp mặc định lúc duyệt; loại chưa đặt hoặc «không đặt»: không có dòng; hồ sơ có sẵn đã có cấp riêng: dòng cũ nguyên, không dòng mới; câu cấp riêng đứng sau câu mở vai trò (trigger không chặn).
- **Lô duyệt không bao giờ hỏng vì câu cấp riêng:** hồ sơ có sẵn có cấp riêng bắt đầu từ ngày mai; có cấp riêng đóng vào một ngày sắp tới; cấp mặc định bị tắt sau khi đặt; vai trò bị tắt khỏi danh sách được hưởng sau khi đặt — cả bốn ca: lô duyệt thành công, không dòng cấp riêng mới.
- Nhân sự đổi vai trò lúc duyệt: cấp theo chính sách của vai trò mới.
- Đổi chính sách sau khi duyệt: cấp riêng của đối tác đã duyệt không đổi.
- Đơn đầu tiên của đối tác vừa duyệt tính hoa hồng đúng cấp đã áp (đi đường xác nhận thật); mọi ca sổ vàng hiện có xanh nguyên, không sửa đáp án.
- Nhật ký không chứa dữ liệu cá nhân.

## Người dùng sẽ thấy

Quản lý bán hàng, Quản trị, Toàn quyền có một khối đặt «cấp cho đối tác tự đăng ký» theo từng loại đối tác. Đối tác được duyệt từ phiếu đăng ký vào Nền tảng đã có sẵn cấp đó, đơn đầu tiên tính hoa hồng theo cấp đó. Kế toán vẫn đổi cấp riêng từng đối tác như hôm nay.

## Hệ quả

- Migration số kế tiếp lúc thi công; `docs/data-dictionary.json` + `npm run dict`; `src/shared/permissions.test.ts` (ảnh chụp bảng quyền, hàng mới); dòng ở `docs/SO-HANG-RAO.md`.
- Mỗi lần duyệt có thể ghi thêm một dòng vào bảng cấp riêng đang dùng để tính hoa hồng (đây là điều mới của ADR, không phải «chỉ thêm bảng cài đặt»).
- **Phải nói thẳng:** đây là ô đầu tiên cho một vai bán hàng quyết mức hoa hồng của người mới vào. Ba lớp giữ: chỉ áp về sau; mọi lần đổi có nhật ký; người đặt không tạo được cấp, không sửa được mức. Nếu Kế toán chưa tạo cấp nào trên bản chính thức thì khối đặt trống và không đối tác nào nhận cấp mặc định.
- **Chưa kiểm:** bản chính thức đang có những cấp nào.
