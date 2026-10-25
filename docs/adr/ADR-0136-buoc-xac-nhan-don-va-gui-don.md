# ADR-0136 — Bước Xác nhận đơn cho dịch vụ «cần xác nhận» (theo dịch vụ hoặc nhóm): Gửi / Rút lại / Còn vé – Hết vé, ô quyền `order.confirm.review`; nút «Gửi đơn» của Đối tác, ô quyền `order.submit`

- **Trạng thái:** **accepted** 2026-10-25 — chủ dự án trong chat, nguyên văn: *«Duyệt lượt 1 (ADR-0136 gốc + bản bổ sung 25/10) theo mọi khuyến nghị của người soạn, kể cả hai câu còn mở.»* Cách chia lượt chủ chốt cùng ngày, nguyên văn: *«Cho phép vượt trần: duyệt hai lượt theo ADR (bước xác nhận kèm Gửi đơn trước, chính sách bán sau).»* Lượt 1 = ADR này (10 điều chạm quyền / dữ liệu: Đ1–Đ8, Đ10, Đ13); trang ghép `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/TRANG-GHEP.md` (mục 0: cách đếm; mục 1–6: ghép).
- **Số và nguồn:** ADR này = đề xuất gốc `docs/superpowers/specs/2026-10-19-xac-nhan-don/DE-XUAT-ADR-0136-buoc-xac-nhan-don.md` (19/10) + bản bổ sung `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/BO-SUNG-2026-10-25-DE-XUAT-ADR-0136.md` (25/10); hai tệp đó là hồ sơ có ngày, không sửa. Số 0136 kiểm còn trống trên bản chính ngày 25/10. Các mục dưới đây giữ từng chữ của hai bản chủ duyệt, trừ những chỗ sau; chữ người chép thêm đánh dấu **[chép 25/10]**:
  - Đ1 lấy theo bản bổ sung, nối phần Đ1 gốc mà bản bổ sung ghi «giữ nguyên»;
  - thêm Đ13 và mục «Làm rõ 25/10» của bản bổ sung; gộp «Quan hệ với ADR cũ», «Hệ quả», «Tiêu chí nghiệm thu» của hai bản;
  - hai câu còn mở ở mục cuối chuyển thành câu đã chốt theo khuyến nghị, đúng lời duyệt; Đ3, Đ7 có một câu trỏ tới đó;
  - bỏ các số đã cũ của bộ 19/10: «cùng ADR-0137», trang ghép lượt 2 cũ, «số 0135 đã kiểm còn trống», migration «số tạm 0115»;
  - hai chỗ nhắc «luật bán» kèm điều kiện (Đ13.2, tiêu chí nghiệm thu 5); một dòng quan hệ kèm vế giới hạn theo Đ13.5; dòng «Cửa» kèm một câu về Đ13.
- **Đứng một mình:** duyệt ADR này **không** kéo theo duyệt đề xuất ADR chính sách bán theo loại đối tác (lượt 2, `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don/DE-XUAT-ADR-chinh-sach-ban-theo-loai-doi-tac.md`), cũng không kéo theo đề xuất «thư xác nhận + QR máy chủ» của bộ 19/10 (số tạm 0137 nay đã là ADR sổ đại lý; cần số mới khi trình lại).
- **Phát hành:** cùng ADR-0135 — Đợt 2 + Đợt 3 của kế hoạch `docs/superpowers/plans/2026-10-19-xac-nhan-don.md` (chủ chọn A ngày 19/10). Kế hoạch viết trước bản bổ sung nên phải sửa trước khi thi công (nhật ký thi công `docs/superpowers/plans/2026-10-19-xac-nhan-don-thi-cong-nhat-ky.md`, mục «Ruling», dòng 25/10).
- **Ngày:** 2026-10-19 (đề xuất gốc), 2026-10-25 (bản bổ sung; duyệt). Mở Đợt 3 của kế hoạch.
- **Loại:** việc lớn (quyền, dữ liệu, tiền). **Cửa:** dữ liệu một chiều mềm (ba bảng chỉ thêm, ở lại); hành vi tắt được bằng cách bỏ mọi cờ "cần xác nhận". **[chép 25/10]** Bỏ mọi cờ thì bước xét duyệt chỉ còn cho đơn có chặng dưới mốc (Đ1), và Gửi đơn của Đối tác đi nhánh B (Đ13.4); nút Gửi đơn và ô `order.submit` là mã, đảo được.
- **Quan hệ với ADR cũ:**
  - **ngoại lệ có tên** của ADR-0019 đ2 ("sai thì 403, không cắt bớt trường"): người xét duyệt nhận chi tiết đơn đang chờ **đã bỏ** SĐT, email, liên hệ người đặt (Đ6);
  - **thay một phần** ADR-0023 đ1 và ADR-0030 S23-1, S23-4: Hướng dẫn viên đọc được đơn **đang chờ** dù chưa phụ trách (Đ6);
  - **ngoại lệ có tên** của ADR-0089 đ8: chọn "Hết vé" thì máy chủ tự gán lý do `HET_CHO` (nhóm Công ty huỷ), không cần ô `order.cancel.classify` (Đ7);
  - **thay một phần** ADR-0022 (Q-C) và ADR-0014 đ12: Đối tác, Thực tập nhận tin xác nhận / huỷ **của đơn mình lập** (Đ10); tên người làm vẫn theo ADR-0131 đ3;
  - **mở rộng** ADR-0135 Đ1, Đ6: thêm nhánh đọc cho người xét duyệt và nhãn tin `xet-duyet`;
  - ADR-0007 / ADR-0009 (`order.modify` gồm xác nhận) **giữ** cho đơn không cần xác nhận **[chép 25/10: trừ khi người lập đơn giữ quyền Đối tác — họ xác nhận bằng Gửi đơn (Đ13.5); người phụ trách vẫn xác nhận đơn được giao, xem dòng ADR-0009 bên dưới]**; ADR-0049 Đ5 (đặt gấp) **giữ**, áp lúc bấm Còn vé;
  - *(từ bản bổ sung 25/10)* **thay một phần** ADR-0014 câu 6: Đối tác không tự xác nhận nữa; đơn không cần xác nhận do máy chủ xác nhận lúc gửi. Phần «sửa, huỷ đơn của chính mình» giữ nguyên;
  - **giữ** ADR-0009: người phụ trách xác nhận đơn được giao, kể cả khi tài khoản đó giữ thêm quyền Đối tác;
  - **đóng** `BL-QUYEN-BH09`: ngày 3/10 chủ tạm gác, «giữ như hôm nay tới ADR-0018 giai đoạn 2»; lời chủ 25/10 là quyết định mới;
  - **thay** Q19 của đặc tả 24/9 (`2026-09-24-mo-hinh-nguoi-vai-quyen-design.md`) cho đơn không cần xác nhận: máy chủ xác nhận, sau đó người nhận của Tour Đảo chăm sóc đơn;
  - **thực hiện một phần** ADR-0018 đ6 (thêm `order.submit`) và đ9 (nút «Gửi đơn hàng»). Phần «đồng hồ bắt đầu» (hạn nhận, đ8) và việc tách ô `order.confirm` để giai đoạn sau.
- **Xây trên lỗ đang hở:** không, cùng điều kiện TNV-G1 như lượt 1 (ADR-0135): Đợt 2 (ADR-0135) phát hành cùng Đợt 3; chủ đã chọn phương án A ngày 19/10. Chi tiết: trang ghép 25/10 mục 4.

## Bối cảnh
Chủ dự án 19/10 (đặc tả Phần A mục 1–8; lượt 3; lượt 4 mục 5b.3): chỉ đơn có dịch vụ được Toàn quyền đánh dấu **"cần xác nhận"** mới qua bước này; người lập bấm **"Gửi xác nhận"**; người xác nhận chọn **Xác nhận** hoặc **Huỷ (kèm lý do)**; mọi vai nội bộ xác nhận được (Bán hàng, Kế toán, Quản trị, Toàn quyền, Hướng dẫn viên); người nội bộ tự xác nhận đơn mình theo **một công tắc**; sửa được ngày đi, giờ đón, tình trạng vé, **sửa tiền phải ghi lý do** và chỉ người đang có quyền sửa tiền; người xác nhận **không thấy SĐT/email khách**; Hết vé = huỷ và báo người lập; hạn **15 phút**, **22:00–06:00 không tính**, quá hạn chỉ cảnh báo Trang chủ, không tự huỷ; mốc tối thiểu giữ, áp lúc bấm Xác nhận.

**[chép 25/10 — lời chủ theo mục «Nguồn lời chủ» của bản bổ sung]** Chủ dự án 25/10 (thiết kế `docs/superpowers/specs/2026-10-25-chinh-sach-ban-va-gui-don-design.md` mục 1, 3, 4; chủ «Duyệt hướng thiết kế 25/10»): đánh dấu xác nhận theo **nhóm** dịch vụ — vé Hòn Tằm không cần xác nhận thủ công, vé Vinpearl kèm buffet thì cần vì phụ thuộc ghế còn trống lúc đặt; đơn của Đối tác kết thúc ở **«Gửi đơn»** — đơn có dịch vụ cần xác nhận thì báo «Đơn của bạn đã được gửi và chờ xác nhận», đơn không có thì báo «Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên». Hộp chọn 25/10: (b) «Gửi đơn» áp cho mọi tài khoản Đối tác; (c) «chuyên viên phụ trách» là văn phòng nói chung — đơn vào hàng chờ nhận như hôm nay, không thêm dữ liệu mới.

## Quyết định
1. **Đ1 — Cờ theo dịch vụ HOẶC theo nhóm** *(bản bổ sung 25/10, thay Đ1 gốc)*. Bảng `ord_service_confirm_flag` (chỉ thêm, có hiệu lực) có thêm phạm vi: `SERVICE` (mã dịch vụ) hoặc `GROUP` (mã nhóm). Mỗi dòng mang giá trị **cần** hoặc **không cần**. Máy chủ đọc lúc bấm như sau:
   - dịch vụ có dòng riêng còn hiệu lực thì theo dòng đó;
   - không có thì theo dòng của nhóm **hiện hành** (đọc qua `v_ctl_service_group`);
   - không có cả hai thì **không cần**.

   Ví dụ: nhóm Vinwonders «không cần», riêng vé kèm buffet «cần». [chủ 25/10: đánh dấu theo nhóm; người soạn: dòng dịch vụ thắng dòng nhóm, giá trị «không cần» ghi tường minh] Phần còn lại của Đ1 giữ nguyên: đơn có chặng dưới mốc chưa đặt gấp cũng phải qua bước; chỉ ô `settings.ops` đổi được cờ.

   *Phần giữ nguyên của Đ1 gốc (19/10):* Đơn có ≥ 1 dịch vụ đang bật cờ (đọc lúc bấm) **HOẶC có chặng đón mở dưới mốc tối thiểu chưa đặt gấp** (chủ chọn A 19/10, đặc tả mục 5f.1) phải qua bước; còn lại giữ luồng hôm nay. Đơn đi vào bước chỉ vì chặng dưới mốc: danh sách chờ gắn nhãn "Cần Quản trị đặt gấp"; người xét duyệt không giữ ô Đặt gấp thấy đơn nhưng nút Xác nhận báo cần Quản trị; Quản trị / Toàn quyền đặt gấp và xác nhận ngay trong bảng xác nhận. **[chép 25/10]** «Dịch vụ đang bật cờ» nay hiểu là «dịch vụ có giá trị cần» theo ba bước đọc ở trên.
2. **Đ2 — "Chờ xác nhận" không phải trạng thái mới.** Đơn vẫn `draft`; "chờ" = có một dòng `ord_confirm_request` còn mở. Một dòng mở mỗi đơn (chỉ mục duy nhất có điều kiện); dòng chỉ khép được một lần, không xoá. Kết quả: `XAC_NHAN` | `HUY` | `RUT_LAI`. [người soạn]
3. **Đ3 — Gửi, rút lại, khoá.** Chỉ người lập gửi (đơn nháp, cần xác nhận, đã chọn đón theo ADR-0134 Đ2, chưa có yêu cầu mở) và rút lại. Đang chờ thì người lập không sửa được (409 `confirm_pending_locked`). Đơn cần xác nhận mà bấm "Xác nhận" cũ ⇒ 409 `confirm_request_required`. [người soạn: khoá khi chờ, Rút lại] **[chép 25/10]** Thêm điều kiện «đơn chưa có khoản thu»: câu đã chốt ở mục cuối.
4. **Đ4 — Ô quyền mới `order.confirm.review`:** SALES, ACCOUNTING, ADMIN, FIELD, SUPER_ADMIN = `any`; PARTNER, INTERN, DRIVER, DRIVER_PARTNER, HR = `none`. [người soạn: năm vai "không" — chủ không nhắc tới]
5. **Đ5 — Ai quyết định.** Người giữ ô VÀ (không phải người lập, HOẶC người lập là nội bộ — không giữ PARTNER/INTERN — và công tắc tự xác nhận đang bật). Công tắc ở bảng chỉ thêm `ord_confirm_policy`, chỉ `settings.ops` đổi, **mặc định BẬT**. [người soạn: mặc định]
6. **Đ6 — Nới đọc có giới hạn.** Người giữ ô đọc được danh sách chờ và chi tiết đơn **đang chờ** của bất kỳ ai, kể cả HDV chưa phụ trách: dịch vụ, ngày, số khách, giờ đón, tiền (chỉ đọc nếu không có quyền sửa tiền). Máy chủ **không gửi** SĐT, email khách và liên hệ người đặt cho người xét duyệt không phải người lập. Danh sách chờ không có tên khách.
7. **Đ7 — Quyết định.** Còn vé ⇒ một lô: đổi ngày / giờ đón (nếu có) → khép yêu cầu → các câu xác nhận hiện có (mốc tối thiểu, đặt gấp giữ nguyên). Hết vé ⇒ khép → huỷ với `HET_CHO` [người soạn]. Huỷ lý do khác ⇒ danh sách lý do như hộp Huỷ hiện có. Hai người cùng quyết ⇒ đúng một người thắng, người kia 409. **[chép 25/10]** Luật giá danh mục lúc bấm Còn vé: câu đã chốt ở mục cuối.
8. **Đ8 — Sửa tiền khi chờ.** Người không phải người lập sửa được tiền khi đơn đang chờ VÀ qua ô `order.money.edit` (hôm nay: Kế toán, Quản trị, Toàn quyền mọi đơn). Tổng đổi mà thiếu lý do (≤ 300 ký tự) ⇒ 400; nhật ký ghi lý do. [người soạn: chọn ô `order.money.edit` — câu 4.5 bản luồng thực tế]
9. **Đ9 — Hạn.** 15 phút làm việc kể từ lúc gửi, bỏ 22:00–06:00 giờ VN. Quá hạn chỉ hiện ở "Việc của bạn" trên Trang chủ của người giữ ô, **cả điện thoại**; không tự huỷ, không nhắc lần hai (5c.4).
10. **Đ10 — Tin.** Lúc gửi: mọi người giữ ô (tin trong Nền tảng, giờ yên lặng giữ nguyên). Lúc xác nhận / huỷ: người lập (kể cả Đối tác, Thực tập) và người bấm. [người soạn: tin lúc gửi — 5b.6]
11. **Đ11 — Ảnh "XÁC NHẬN ĐƠN DỊCH VỤ".** Tự bật sau khi lập chỉ với đơn không cần xác nhận; đơn cần xác nhận chỉ có ảnh sau khi đã xác nhận (5b.4).
12. **Đ12 — Bỏ cờ khi đang chờ.** Yêu cầu đang mở vẫn quyết định được; nháp mới của dịch vụ đó không còn phải gửi.
13. **Đ13 — «Gửi đơn» cho mọi tài khoản giữ quyền Đối tác** *(bản bổ sung 25/10)*.
    1. **Một nút.** Với đơn họ lập, tài khoản giữ quyền Đối tác chỉ còn nút **«Gửi đơn»**, thay cho cặp «Lưu, chờ xác nhận» rồi «Xác nhận đơn». [chủ (b)] Tài khoản lai cũng áp, cùng kiểu với luật giá danh mục R2. [người soạn]
       - Form lập mới: bấm Gửi đơn là lưu rồi gửi.
       - Form sửa nháp giữ nút «Lưu thay đổi»; trang đơn nháp có nút Gửi đơn. [người soạn]
    2. **Cổng lúc gửi.** Máy chủ chạy mọi cổng của Xác nhận ngay lúc gửi, ở cả hai nhánh:
       - luật bán (đề xuất ADR chính sách bán) **[chép 25/10: cổng này chỉ có khi ADR chính sách bán (lượt 2) đã được chủ duyệt và thi công; trước đó không có cổng này, các cổng còn lại vẫn chạy đủ]**;
       - giá danh mục và trần giảm giá, xét theo người gửi như hôm nay;
       - người lớn, chọn Đón/Không đón, mốc tối thiểu.

       Có cổng từ chối thì đơn **ở lại nháp** (đã lưu) và hiện câu lỗi tiếng Việt của máy chủ; không có câu báo thứ ba.
    3. **Nhánh A — cần xác nhận.** Áp khi đơn có dịch vụ cần xác nhận theo Đ1, hoặc có chặng dưới mốc chưa đặt gấp. Máy chủ mở yêu cầu xác nhận như Đ3, và giao diện báo **«Đơn của bạn đã được gửi và chờ xác nhận»**. Đối tác Rút lại được (Đ3).
    4. **Nhánh B — các đơn còn lại.** Máy chủ **xác nhận ngay** trong cùng lần gửi, qua đủ lô xác nhận hôm nay (chụp mức, mốc tối thiểu).
       - Đơn vào hàng chờ nhận; tin và Bảng tin như khi Đối tác tự xác nhận hôm nay. [chủ (c)]
       - Nhật ký `confirmed` có ghi chú «tự xác nhận khi Đối tác gửi đơn».
       - Giao diện báo **«Đơn của bạn đã được chuyển đến chuyên viên phụ trách & chờ hướng dẫn viên»**.
    5. **Đường cũ đóng với người lập.** Khi **người lập đơn** giữ quyền Đối tác, gọi Xác nhận (`POST /api/orders/:id/status` với `confirmed`) hoặc Gửi xác nhận đều nhận **409 `partner_submit_required`**. Cổng này đặt ngay sau `can()`, trước các cổng khác của nhánh xác nhận.
       - Phải là luật ở route, vì `can()` lấy **hợp** các ô của mọi quyền đang giữ. Tài khoản lai Bán hàng + Đối tác sẽ lọt qua hàng `SALES` của ô `order.modify`; dữ liệu thử e2e có sẵn tài khoản lai như vậy.
       - Chỉ chặn **người lập**. Người phụ trách giữ quyền Đối tác (chỉ có ở tài khoản lai) vẫn xác nhận được đơn được giao như hôm nay (ADR-0009). Cách này khớp Đ5 gốc: người lập giữ PARTNER bị coi là bên ngoài. [người soạn; người kiểm độc lập cũng nghiêng về cách này. Hai cách khác: chặn mọi người giữ PARTNER ở mọi đơn; hoặc chỉ chặn tự xác nhận nháp của chính mình]
       - **Huỷ giữ như hôm nay**: phần «huỷ đơn của chính mình» của ADR-0014 câu 6 không đổi. [người soạn]
    6. **Ô quyền mới `order.submit`** («Gửi đơn»): PARTNER `own`, SUPER_ADMIN `any`, mọi mã khác `none`.
       - Giá trị này đúng hàng đích của đặc tả 24/9 (ADR-0018 đ6). Riêng Toàn quyền `any` thì bài «Toàn quyền = any ở mọi thao tác» cũng bắt buộc.
       - Route vẫn chỉ cho **người lập** gửi nháp của chính mình, vì nháp là riêng tư (ADR-0135). Ô `any` không cho Toàn quyền gửi nháp của người khác.
       - **Chưa tách** ô `order.confirm`. Ô `order.modify` giữ giá trị; chỉ đổi chú thích và tên lời thường (`TEN_THAO_TAC`, hôm nay là «sửa, xác nhận, huỷ đơn»), để nói rõ người lập giữ quyền Đối tác xác nhận bằng Gửi đơn.
    7. **Ảnh «XÁC NHẬN ĐƠN DỊCH VỤ»** chỉ có sau khi đơn đã xác nhận (Đ11). Nhánh B có ảnh ngay; nhánh A có sau khi người xét duyệt chọn Còn vé. Ở nhánh B, câu báo hiện trước, rồi hộp ảnh tự mở như hôm nay. [người soạn: thuộc bề mặt, đổi được]

## Làm rõ 25/10 các điều khác của đề xuất gốc *(bản bổ sung)*
- Đ3 «chỉ người lập gửi»: với người lập giữ quyền Đối tác, Gửi đơn thay cho Gửi xác nhận.
- Mục «Điều chưa chắc — giá danh mục»: với đơn của Đối tác, Đ13.2 đã trả lời (giá danh mục xét theo người gửi, ngay lúc gửi). Với đơn của Thực tập, người soạn **đổi khuyến nghị** thành giữ như hôm nay (xét theo người bấm Còn vé). Lý do: nháp của Thực tập đã qua luật giá danh mục lúc lập và lúc lưu; xét theo người lập sẽ chặn chính các lần sửa giá có lý do mà Đ8 cho phép. [người soạn 25/10]
- Đ10: tin xác nhận và huỷ gửi tới người lập là Đối tác giữ nguyên. Ở nhánh B, người gửi không nhận tin «đã xác nhận» về việc chính mình vừa làm, vì họ đã thấy câu B. [người soạn]

## Phương án bị bác
- **Thêm giá trị `pending` vào `orders.status`:** phải dựng lại bảng `orders` và trigger (điều `0018` cố tránh), mọi chỗ đọc trạng thái phải sửa.
- **Dùng `order.modify` để xét duyệt:** Kế toán, HDV không có ô này, Bán hàng chỉ đơn mình — trái lời chủ "mọi vai nội bộ".
- **Tự huỷ khi quá hạn:** chủ nói không tự huỷ.
- **Cho người xét duyệt đọc đủ (kể cả SĐT):** chủ nói không thấy SĐT/email.

## Hệ quả
Migration mới (số lấy lúc thi công): ba bảng + trigger. Ô mới ở `MATRIX`, bài ghim hàng DRIVER/DRIVER_PARTNER/HR, `TEN_THAO_TAC`, `tests/e2e/permissions.mjs`. Route mới: gửi, rút lại, quyết định, danh sách chờ, cài đặt cờ / công tắc. Route đổi: `/status`, `PUT /:id`, mọi route đọc của ADR-0135 Đ1. Hành động nhật ký mới (gửi, rút lại, đổi cờ, đổi công tắc). Giao diện: nút Gửi xác nhận / Rút lại / bảng Xác nhận đơn, thẻ chờ trên Trang chủ, trang danh sách chờ.

*Hệ quả thêm (bản bổ sung 25/10):*
- Ô `order.submit`: `MATRIX`, `TEN_THAO_TAC` và tệp sinh của trợ lý, các bài ghim hàng, `tests/e2e/permissions.mjs`. Danh sách bài đỏ đo được ở trang ghép mục 6.
- Route Gửi đơn (mới). Route `/status` và route Gửi xác nhận thêm luật 409.
- `orderActions` (`src/shared/order-view.ts`) thêm hành động Gửi đơn. Đổi nút ở form (`web/order-form.ts`) và ở trang đơn (`web/order.ts`).
- Trợ giúp Đối tác (`src/shared/huong-dan-doi-tac.ts`): sửa **mọi** đoạn nhắc «Lưu, chờ xác nhận» và «Xác nhận đơn» (ít nhất năm đoạn).
- Các bài kiểm và e2e đang cho phiên Đối tác hoặc tài khoản lai tự xác nhận phải chuyển sang Gửi đơn, rồi quan sát lại đỏ → xanh cho các dòng sổ hàng rào liên quan (trang ghép mục 6).

**[chép 25/10]** *Từ hai câu đã chốt:* chặn mở yêu cầu khi đơn đã có khoản thu cần một hàm do gốc lắp ráp tiêm vào, vì `orders` không đọc bảng `bil_` (ADR-0024 đ4). Kế hoạch 19/10 chưa có điều kiện này, cũng chưa có phạm vi nhóm của Đ1 và toàn bộ Đ13; phải sửa kế hoạch trước khi thi công (nhật ký thi công, mục «Ruling», dòng 25/10).

## Tiêu chí nghiệm thu (đỏ trước, xanh sau)
- **Đ1–Đ12:** các bài đỏ của kế hoạch 19/10, Task 3.1–3.4, sau khi kế hoạch được sửa theo ADR này (đề xuất gốc không có mục tiêu chí riêng).
- **Thêm (bản bổ sung 25/10):**
  1. Đối tác gửi đơn có dịch vụ thuộc nhóm «cần»: máy chủ mở yêu cầu, đơn vẫn nháp, phản hồi báo nhánh A.
  2. Đối tác gửi đơn không có dịch vụ cần xác nhận và không có chặng dưới mốc: đơn thành `confirmed` và có trong hàng chờ nhận; phản hồi báo nhánh B; nhật ký ghi «tự xác nhận khi Đối tác gửi đơn».
  3. Dòng dịch vụ «không cần» thắng dòng nhóm «cần», và ngược lại.
  4. Phân biệt người lập và người phụ trách:
     - Người lập giữ quyền Đối tác (Đối tác thuần, hoặc tài khoản lai Bán hàng + Đối tác) gọi `/status` với `confirmed` cho đơn mình lập: nhận 409 `partner_submit_required`.
     - Tài khoản lai xác nhận đơn **được giao** do người khác lập: vẫn như hôm nay.
     - Đối tác huỷ đơn của mình (kèm lý do): vẫn như hôm nay.
  5. Gửi đơn khi một cổng hỏng (thiếu chọn Đón, giá danh mục vừa đổi, luật bán chặn): nhận đúng lỗi của cổng đó; đơn vẫn nháp; không mở yêu cầu. **[chép 25/10: ca «luật bán chặn» chỉ thử khi ADR chính sách bán đã duyệt và có mã]**
  6. Thực tập không có nút Gửi đơn. Ô `order.submit` của INTERN là `none`; gọi route thì nhận 403. Toàn quyền gửi nháp của người khác cũng bị từ chối.
- **[chép 25/10] Từ hai câu đã chốt:**
  7. Nháp đã có khoản thu: Gửi xác nhận, và Gửi đơn rơi vào nhánh A, đều bị máy chủ từ chối (409, câu tiếng Việt; mã lỗi đặt lúc thi công); không mở yêu cầu; đơn vẫn nháp. Gửi đơn rơi vào nhánh B vẫn xác nhận như hôm nay.
  8. Kế toán sửa giá một dòng của đơn Thực tập đang chờ (có lý do, Đ8) rồi bấm Còn vé: đơn được xác nhận; luật giá danh mục không chặn, vì luật xét theo người bấm như hôm nay.

## Điều chưa chắc — câu hỏi cho chủ (đã chốt 25/10)
- **Đơn đã có khoản thu từ thời nháp — ĐÃ CHỐT 25/10, theo khuyến nghị.** Đơn có khoản thu (trước ngày phát hành lượt 1) mà gửi xác nhận rồi Hết vé thì thành đơn huỷ còn tiền (TNV-G1), nên máy chủ **không mở yêu cầu xác nhận** cho đơn đã có khoản thu. Câu này áp cho Gửi xác nhận (Đ3) và nhánh A của Gửi đơn (Đ13.3). Nhánh B (Đ13.4) xác nhận ngay, không mở yêu cầu, nên không thuộc câu này (trang ghép 25/10 mục 4: nhánh B không mở đường mới tới TNV-G1). Cách làm: hàm do gốc lắp ráp tiêm vào (mục «Hệ quả»). Ca này chỉ gặp ở nháp cũ; chủ đếm số nháp đó trước khi phát hành (ADR-0135, câu Q3).
- **Giá danh mục — ĐÃ CHỐT 25/10, theo khuyến nghị của bản bổ sung.** Hôm nay Đối tác / Thực tập chỉ tự xác nhận được đơn đúng giá danh mục. Với đơn của Đối tác: Đ13.2 (xét theo người gửi, ngay lúc gửi). Với đơn của Thực tập: **giữ như hôm nay** — xét theo người bấm Còn vé (lý do ở mục «Làm rõ 25/10»). Khuyến nghị 19/10 «xét theo người lập» **không dùng**.
- Dịch vụ nhập tay không có mã nên không gắn cờ được. [người soạn]
- Chủ đã chọn phương án A cho câu Q1 của ADR-0135 (19/10): đã đưa vào Đ1.
