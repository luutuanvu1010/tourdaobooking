# ADR-0224 — Đối tác dùng được Trả sau chỉ thấy «Trả sau»; máy chủ từ chối «Thanh toán ngay» từ tài khoản đó

- **Trạng thái:** **proposed** 2026-11-21 — chờ chủ dự án duyệt văn bản. Người soạn: phiên thi công Việc 2 của `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` (nhánh `claude/partner-features-detailed-plan-f32f89`, mục 4 câu 1(a), mục 5 «Việc 2»). Chủ đã đồng ý **hướng** câu 1(a)–(d) của bản kế hoạch (21/11, chuyển qua phiên điều phối, lời chủ: «còn lại áp dụng như khuyến nghị»); đó là đồng ý hướng, chưa phải duyệt văn bản này. Ba điểm người soạn thêm (Đ2.2, Đ2.3, Đ3 vượt mức) áp theo khuyến nghị vì cùng lời chủ đó. Người soạn không tự duyệt (Hiến pháp N3).
- **Loại:** việc lớn (tiền: hình thức thanh toán của đơn; điều kiện chặn ở máy chủ). **Cửa:** hai chiều — không migration, không đổi bảng, không đổi ô quyền; gỡ bằng một ADR khác là trở lại như ADR-0198 Đ2.4.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt: 1** (Đ2). Lượt duyệt câu 1 của bản kế hoạch có thể gom thêm ADR của Việc 5, 6 ⇒ người trình gom một trang ghép chung (CLAUDE.md §9); trang ghép riêng của văn bản này ở cuối tệp.
- **Xây trên lỗ đang hở:** không.
- **Quan hệ với ADR cũ:**
  - **Thay** ADR-0198 Đ2 mục 4 («Đối tác vẫn đổi được sang "Thanh toán ngay" bằng một chạm»).
  - **Sửa** ADR-0198 Đ1 mục 1 ở một ý: vị từ «đối tác» (`laDoiTacTraSau`) trước đây «chỉ đổi điều người đó nhìn thấy, không bao giờ là điều kiện cho phép». Từ văn bản này nó **là điều kiện** ở đúng một cổng: cổng lưu đơn từ chối «Thanh toán ngay» (Đ2). Mọi chỗ khác giữ như cũ.
  - **Giữ** ADR-0168, ADR-0172 (hạn mức, quá hạn, chốt ở lô xác nhận), ADR-0198 Đ1 (không hiện số hạn mức), Đ2 mục 1–3, 5–6, ADR-0213 (bên đặt theo tư cách).

## Bối cảnh

Hôm nay đối tác có Trả sau thấy hai lựa chọn, «Trả sau» được chọn sẵn nhưng đổi được sang «Thanh toán ngay»; máy chủ nhận cả hai (`congTraSauKhiLuu` bỏ qua đơn Thanh toán ngay). Chủ muốn đơn của đối tác Trả sau đi theo một đường: nhận vé trước, nộp tiền cho Tour Đảo sau.

## Đ1 — Ai, khi nào

1. **Ai:** người **gửi lệnh** là tài khoản giữ quyền Đối tác, không giữ quyền Kế toán (`laDoiTacTraSau`, cùng vị từ ADR-0198 Đ1 mục 1 đang dùng cho chữ và lựa chọn sẵn). *Người soạn chọn vị từ này, không chọn `holdsPartner`:* để chữ trên màn hình và cổng máy chủ cùng một định nghĩa; tài khoản lai Kế toán + Đối tác không được tồn tại (chủ 23/10) nên hai vị từ chỉ khác nhau ở ca không có thật.
2. **«Trả sau dùng được»** = cổng hạn mức hiện có (`kiemTraSau`, billing) nói **đạt** cho bên đặt và **tổng tiền của chính đơn này**: có hạn mức hiệu lực, không đơn quá hạn, tổng không vượt phần còn được dùng.
3. **Văn phòng lập đơn** (kể cả «Qua đối tác»): không đổi — vẫn hai lựa chọn, chọn sẵn «Thanh toán ngay».

## Đ2 — Máy chủ

1. Ở **hai** chỗ lưu đơn — lập mới và lưu nháp (cả hai đi qua `congTraSauKhiLuu`) — khi người gửi là đối tác theo Đ1.1, hình thức **sẽ lưu** là «Thanh toán ngay» (kể cả khi thân lệnh bỏ trống: lập mới coi là Thanh toán ngay, lưu nháp lấy hình thức đang lưu) và bên đặt có: máy chủ hỏi `kiemTraSau`. **Đạt ⇒ 409** mã `tra_sau_bat_buoc_doi_tac`, câu tiếng Việt không có số tiền (chữ chờ chủ chọn). **Không đạt** (không hạn mức, có đơn quá hạn, vượt mức) ⇒ cho lưu Thanh toán ngay.
2. **Không đọc được hạn mức** (`kiemTraSau` trả rỗng) ⇒ **cho lưu Thanh toán ngay**. *Khuyến nghị của người soạn, chờ chủ:* Thanh toán ngay là phía an toàn về tiền (khách trả trước), còn chặn thì đối tác không lập được đơn nào khi billing trục trặc.
3. **Không áp ở lô xác nhận.** Nháp đã lưu Thanh toán ngay lúc Trả sau đang khoá vẫn xác nhận được sau khi đối tác trả xong đơn quá hạn. Lý do: cổng lưu đã đúng ở thời điểm lưu; bắt lại lúc xác nhận làm đơn đang chờ bị bật ngược mà người lập không đổi gì.
4. Một luật thuần duy nhất trong `src/shared/` quyết định «hình thức nào được nhận» theo `{ laDoiTac, trạng thái Trả sau }`; cổng máy chủ và màn hình cùng gọi nó.
5. Đơn Thanh toán ngay của đối tác nay tốn **một** câu đọc hạn mức lúc lưu (hôm nay là không); văn phòng không đổi.

## Đ3 — Màn Tạo đơn của đối tác

| Trạng thái Trả sau | Hiện | Câu |
|---|---|---|
| Dùng được | chỉ «Trả sau», đã chọn | câu ADR-0198 Đ1.2 |
| Có đơn quá hạn | «Thanh toán ngay» (chọn được), «Trả sau» mờ | `CAU_KHOA_QUA_HAN` (đã có) |
| Máy chủ vừa trả 409 vượt mức | cả hai chọn được, đối tác tự chọn (không tự đổi để khỏi lưu nhầm) | câu ADR-0198 Đ1.4 (đã có) |
| Không có hạn mức | khối ẩn, đơn là Thanh toán ngay | — |

- **Vượt mức** do máy chủ quyết (tổng gồm phí, giảm giá chỉ máy chủ tính đúng): khi lưu gặp 409 `vuot_han_muc`, màn hiện lại «Thanh toán ngay» kèm câu Đ1.4, không so số ở trình duyệt.
- **Nháp cũ** đang lưu Thanh toán ngay mở lại lúc Trả sau dùng được ⇒ màn chuyển sang «Trả sau» **kèm câu báo** (không đổi âm thầm), vì máy chủ sẽ không nhận Thanh toán ngay.

## Chữ chờ chủ chọn (Hiến chương 5.27, ADR-0167)

| Chỗ | Khuyến nghị | Phương án khác |
|---|---|---|
| Câu 409 khi đối tác gửi Thanh toán ngay (Đ2.1) | «Bạn đang được trả sau nên đơn này lập theo Trả sau. Mở lại trang rồi lưu lại.» | «Tài khoản của bạn chỉ lập đơn Trả sau.» |
| Câu báo khi nháp cũ chuyển sang Trả sau (Đ3) | «Bạn đang được trả sau nên đơn này chuyển sang Trả sau. Kiểm lại rồi lưu.» | — |

## Phương án đã loại

- **Chỉ ẩn trên màn hình, máy chủ vẫn nhận:** đối tác (hoặc bản cài cũ trên iPhone) vẫn gửi được Thanh toán ngay; chủ yêu cầu chặn thật.
- **Chặn hẳn Thanh toán ngay kể cả khi Trả sau khoá:** đối tác quá hạn một đơn không bán được gì.
- **Chặn cả ở lô xác nhận:** xem Đ2.3.

## Hệ quả chủ cần biết

- Đối tác Trả sau không còn tự chọn trả ngay. Muốn trả ngay một đơn cụ thể thì văn phòng lập hộ («Qua đối tác»).
- Bản Nền tảng cũ còn trong bộ nhớ iPhone (trước khi tải bản mới) vẫn hiện hai nút; chọn «Thanh toán ngay» sẽ nhận câu 409 ở trên.

## Trang ghép

1. **Bảng chạm:** không (không migration; `orders.payment_term` giữ nguyên, trigger khoá hình thức sau nháp giữ nguyên).
2. **Bản đồ quyền:** không đổi ô. Điều kiện mới ở cổng lưu đơn dùng vị từ `laDoiTacTraSau` trên người gửi, áp cho đơn **mọi** bên đặt mà đối tác lập được (tư cách theo ADR-0213).
3. **Cổng:** `congTraSauKhiLuu` (lập mới `POST /api/orders`, lưu nháp `PUT /api/orders/:id`) thêm nhánh Đ2.1. Lô xác nhận không đổi. **Chỗ giao diện ẩn/hiện đổi nghĩa:** khối «Hình thức thanh toán» ở màn Tạo đơn khi người lập là đối tác (bảng Đ3). Màn văn phòng không đổi.

## Kiểm (viết trước khi thi công)

`src/tra-sau-doi-tac-chi-tra-sau.test.ts` (đỏ cho tới khi thi công): bảy ca cổng (đối tác dùng được gửi Thanh toán ngay ⇒ 409 không số; gửi Trả sau 3.000.000 đ ⇒ qua; quá hạn / vượt mức / không đọc được / không hạn mức ⇒ Thanh toán ngay qua; văn phòng ⇒ qua) và bốn ca luật thuần của màn. Sau thi công: kịch bản e2e theo «Xong khi» của Việc 2.
