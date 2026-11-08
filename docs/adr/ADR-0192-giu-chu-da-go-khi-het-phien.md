# ADR-0192 — Giữ chữ đã gõ ở form đơn khi hết phiên, bằng bản chụp tạm trong `sessionStorage` (phát hiện G-03, phần b)

- **Trạng thái:** proposed 2026-11-09 — AI soạn theo kế hoạch `docs/superpowers/plans/2026-11-08-sua-sau-ra-soat-lan-2.md` (chủ duyệt kế hoạch 9/11, Phần VIII mục 5.2), thuộc **ADR lượt B** (trang ghép `docs/superpowers/specs/2026-11-09-trang-ghep-adr-luot-b.md`). Người kiểm độc lập chỉ đọc kiểm một vòng bản nháp; các điểm nhỏ người kiểm nêu đã sửa. Chưa có mã. Phần (a) của G-03 (câu báo «phiên đã hết» ở trang đăng nhập) là việc chữ ở Đợt 3, không thuộc ADR này.
- **Số:** 0192 (soát như ADR-0188).
- **Nguồn:** hồ sơ rà soát `docs/superpowers/specs/2026-11-07-ra-soat-truoc-launch-lan-2/` (G-03: hết phiên giữa lúc lập đơn thì bị đưa về đăng nhập, mất hết chữ đã gõ). Dẫn chứng mã đọc lại trên `main` @`fa3fd859a`.
- **Ngày:** 2026-11-09. **Loại:** việc lớn (lưu dữ liệu cá nhân của khách trên máy, dù tạm) — người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều (chỉ mã giao diện; không route, không migration; gỡ được bằng một bản dựng).
- **Sửa / ngoại lệ có tên:** ADR-0035 Đ3 — câu «Không lưu SĐT, email, dữ liệu khách, đơn hay tiền» trên máy. ADR này là **ngoại lệ có tên** duy nhất của câu đó; bất biến Đ2 (dữ liệu `/api/*` không vào bộ nhớ đệm của service worker) giữ nguyên. Không sửa nguyên văn ADR-0035.
- **Liên quan:** ADR-0075 (lý do kết thúc phiên; mã `web/api.ts` để lời báo đó trong `sessionStorage` cho trang đăng nhập), ADR-0094 (vé chống ghi trùng), ADR-0136 Đ13 (Gửi đơn = lưu rồi gửi), Hiến chương 4.4 (tối thiểu dữ liệu cá nhân).
- **Xây trên lỗ đang hở:** không.
- **Số quyết định chạm quyền/dữ liệu:** 1.

## Bối cảnh

Khi một lời gọi API nhận 401 «unauthenticated», `api()` gọi `goLogin` (`web/api.ts`): hỏi lý do kết thúc phiên, xoá bản nhớ khung (`xoaKhungNho`, ADR-0035), rồi `location.replace("/login?next=…")`. Đăng nhập lại xong người dùng về đúng trang, nhưng form trống: mọi chữ đã gõ (tên, SĐT khách, dịch vụ, hành khách, ghi chú) mất. Với Đối tác, «Gửi đơn» là hai lời gọi (lưu rồi gửi, `web/order-form.ts`): nếu lời gọi gửi mới hết phiên thì đơn nháp đã tạo xong; mở lại form và lưu lần nữa có thể ra đơn trùng (vé chống ghi trùng ADR-0094 chỉ bảo vệ khi thân yêu cầu y hệt lần trước).

## Quyết định

1. **Phạm vi:** chỉ form lập / sửa đơn (`web/order-form.ts`, cả văn phòng lẫn Đối tác). Form khác không đổi.
2. **Chỉ ghi lúc mất phiên:** bản chụp chỉ được ghi khi `goLogin` chạy vì 401 trên trang form (không ghi định kỳ, không ghi khi rời trang thường). Kho: `sessionStorage` (mất khi đóng thẻ / ứng dụng; không chia sẻ giữa thẻ), không `localStorage`, không URL, không gửi lên máy chủ.
3. **Khoá gắn người:** khoá bản chụp mang mã nhân viên của phiên vừa hết (trang form đã có từ `initShell` lúc mở trang; bản nhớ khung của ADR-0035 không chứa mã này). Bản chụp gồm: mã nhân viên, giờ chụp, mã đơn (nếu đang sửa, kèm `updatedAt` đang mở), và giá trị các ô của form.
4. **Khôi phục một lần, khi đúng người:** sau khi đăng nhập lại và mở form, nếu bản chụp cùng mã nhân viên, chụp chưa quá **30 phút**, và (với đơn đang sửa) đơn chưa bị sửa ở nơi khác (`updatedAt` máy chủ trả bằng `updatedAt` trong bản chụp) thì điền lại form, rồi **xoá bản chụp ngay**. Không đạt điều kiện nào thì xoá, không điền.
5. **Xoá khi:** khôi phục (mục 4); lưu thành công; đăng xuất (`logout`); màn bảo trì chặn; và `initShell` của **mọi trang** xoá bản chụp mang mã nhân viên khác người đang đăng nhập hoặc đã quá 30 phút. Việc xoá **không** đặt trong `xoaKhungNho` (hàm đó chạy ngay trong `goLogin`, sẽ xoá bản vừa chụp).
6. **Đối tác, đơn đã tạo mà lời gọi gửi hết phiên:** bản chụp chỉ ghi mã đơn đã tạo, không ghi giá trị ô (mã đơn lấy từ một biến của trang đặt ngay sau khi lưu thành công — khối `catch` quanh lời gọi gửi không chạy khi 401 vì `goLogin` không bao giờ trả về); đăng nhập lại thì chuyển tới trang đơn đó (như nhánh «gửi hỏng» có sẵn), không mở lại form — tránh đơn trùng.
7. **Cách móc và trần gói:** gói trang Đơn hàng (`web/orders.ts`, danh sách đơn) có trần dung lượng, hôm dò còn khoảng 68 byte; `web/api.ts` vào mọi gói nên móc ở `goLogin` tốn chỗ ở cả gói đó (đo sơ bộ của lần dò 8/11: khoảng 38 byte cho một sự kiện «hết phiên»). Mã chụp / khôi phục nằm ở gói form (`web/order-form.ts`), không ở gói Đơn hàng. Thứ tự chọn:
   - **(a) khuyến nghị:** thử cách móc **0 byte** trên gói Đơn hàng trước (ví dụ trang form tự nghe sự kiện rời trang của trình duyệt khi `goLogin` chuyển trang, nhận biết hết phiên qua dấu mà `goLogin` đã để sẵn);
   - (b) không được thì chủ cho nới trần gói Đơn hàng **đúng số đo, tối đa 100 byte**, ghi lý do ở commit và ở chú thích trần trong `src/goi-trang-nhe.test.ts`; quá 100 byte thì dừng, hỏi lại chủ.
   Cộng với câu báo của G-03(a) ở Đợt 3, lần dò 8/11 ước vượt trần khoảng 5 byte — vì vậy câu này phải có trong lượt duyệt.

## Câu ADR bị thay (nguyên văn → mới)

| ADR | Nguyên văn | Mới |
|---|---|---|
| ADR-0035 Đ3, câu cuối | «Không lưu SĐT, email, dữ liệu khách, đơn hay tiền.» | giữ nguyên cho bản nhớ khung; thêm: «**Ngoại lệ có tên duy nhất (ADR-0192):** bản chụp form đơn lúc hết phiên, trong `sessionStorage`, gắn mã nhân viên, tối đa 30 phút, khôi phục một lần rồi xoá.» |

## Lý do

Mất cả đơn đang gõ vì hết phiên là lỗi người dùng gặp thật trên iPhone (phiên hết giữa ca). `sessionStorage` sống ngắn nhất trong các kho của trình duyệt và không sang thẻ khác; gắn mã nhân viên + hạn 30 phút + xoá ở mọi trang khi người khác đăng nhập là đủ cho trường hợp «hết phiên rồi người khác đăng nhập trên cùng máy» (kế hoạch, Review Focus mục 4).

## Phương án bị loại

- **Lưu nháp lên máy chủ khi hết phiên:** không gọi được — phiên đã hết.
- **Tự lưu nháp định kỳ lên máy chủ:** tạo đơn nháp ngoài ý người dùng, chạm luật xoá–chèn nháp (ADR-0047) và chống ghi trùng.
- **`localStorage`:** sống qua đóng ứng dụng, lâu hơn cần; rủi ro lộ cao hơn.
- **Kéo dài phiên:** đổi luật phiên và bảo mật, lớn hơn việc cần.

## Chưa kiểm

iPhone tắt hẳn Nền tảng (vuốt bỏ) có làm mất `sessionStorage` trước khi đăng nhập lại không — nếu mất thì chỉ là không khôi phục được, không lộ gì. Người thi công thử trên iPhone thật và ghi kết quả.

## Bài kiểm (đỏ trước, xanh sau)

- Bài thuần cho luật khôi phục (cùng / khác mã nhân viên, quá / chưa quá 30 phút, `updatedAt` khớp / lệch, đơn đã tạo của Đối tác ⇒ chuyển trang) và luật dọn của `initShell`.
- Bài khoá «không đặt việc xoá trong `xoaKhungNho`» và «`xoaKhungNho` vẫn chạy trong `goLogin`».
- `src/goi-trang-nhe.test.ts` xanh (trần không đổi theo (a), hoặc nới đúng số theo (b)).
- Kịch bản Chrome: gõ form → máy chủ trả 401 → đăng nhập lại cùng người ⇒ chữ còn; đăng nhập người khác ⇒ form trống và kho không còn bản chụp; Đối tác gửi đơn hết phiên ở bước gửi ⇒ về trang đơn, không đơn trùng. Ảnh 390 và 1280.

## Người dùng sẽ thấy

Đang lập hoặc sửa đơn mà phiên đăng nhập hết: đăng nhập lại (trong 30 phút, cùng tài khoản) thì về đúng form, chữ đã gõ còn nguyên. Người khác đăng nhập trên cùng máy thì không thấy gì của người trước. Đối tác bấm Gửi đơn đúng lúc hết phiên mà đơn đã lưu thì đăng nhập lại sẽ về trang đơn đó.

## Hệ quả

- Khi duyệt: dòng Trạng thái ADR-0035 thêm trỏ về ADR này.
- Trần gói trang Đơn hàng: 0 byte theo (a); tối đa +100 byte theo (b), chưa đo.
