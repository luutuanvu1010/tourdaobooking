# ADR-0153 — Vé điện tử: kho vé, tự giữ chỗ vé cho đơn, đường dẫn riêng cho khách, hai ô quyền mới

- **Trạng thái:** **Đề xuất** (2026-10-31) — chờ chủ dự án duyệt. AI soạn, không tự duyệt (Hiến pháp N3). Chưa có dòng mã nào của Đ1–Đ3 được viết ngoài phần không chạm luật (khung module, bảng `vdt_*`, luật thuần).
- **Nguồn:** đặc tả `docs/superpowers/specs/2026-10-31-ve-dien-tu-design.md` (chủ duyệt 31/10), kế hoạch `docs/superpowers/plans/2026-10-31-ve-dien-tu.md`, tiêu chí nghiệm thu `docs/superpowers/specs/2026-10-31-ve-dien-tu-muc-tieu-nghiem-thu.md`.
- **Số:** 0153 kiểm còn trống ngày 31/10 trong `docs/adr/` của `main` và của mọi nhánh trong máy (lớn nhất là 0152).
- **Loại:** việc lớn (dữ liệu, quyền, kho tệp). **Chạm tiền ở mức đọc** (chỉ đọc số đã thu và số phải thu, không ghi). **Cửa:** một chiều mềm — bảng `vdt_*` chỉ thêm và ở lại; đường dẫn công khai thu hồi được nên hai chiều.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 3** (Đ1, Đ2, Đ3), đúng trần của CLAUDE.md §9. Nhà cung cấp đọc ảnh (mục «Đã chốt») không tính là quyết định mới: chủ đã chốt 31/10, ADR chỉ ghi lại và nêu phát hiện về điều khoản.
- **Xây trên lỗ đang hở:** không (không có mục `docs/quyen-hoan.json` nào chạm kho tệp, thanh toán hay đường dẫn công khai; kiểm 31/10).
- **Quan hệ với ADR cũ:** **nới một phần** ADR-0123 đ3 và ADR-0144 đ4 (không có đường dẫn công khai cho tệp): chỉ cho đúng một đường, ở Đ2. **Giữ** ADR-0136 (xác nhận), ADR-0094 (chống ghi trùng), ADR-0104 (đồng bộ chuyến trong lô huỷ/sửa), ADR-0063 (sửa số khách), ADR-0146/0152 (luật bán). **Không đổi** luật tiền; **không** thêm ngoại lệ cho ADR-0005 đ1 / ADR-0018 đ3.

## Bối cảnh

Nhân viên hiện tải thủ công khoảng 50 vé ảnh VinWonders/Vinpearl, lưu vào Zalo, nhìn từng đơn để gửi và bấm «like»: chậm, dễ gửi thiếu/thừa/trùng. Vé là ảnh có mã QR, ai cầm cũng dùng được (đặc tả §2), nên ảnh vé và mã vé có giá trị như tiền. Mục tiêu: kho vé trong Nền tảng, vé tự giữ chỗ đúng loại/nhóm khách/ngày, mỗi vé chỉ thuộc một chỗ, chỉ xem/giao khi đơn thu đủ 100%.

## Đã chốt (chủ, 31/10) — ghi lại, không phải quyết định mới

- Thu đủ = số đã thu ròng ≥ số phải thu và số phải thu > 0; không có mức cọc mở khoá. Hạn đường dẫn khách = ngày dùng cuối của vé + 7 ngày, thu hồi được. Làm cả Vinpearl Harbour (VHB, VHBT, VHBTB). Giữ nguyên mã huỷ đơn hiện có; vé đã lộ thì vô hiệu và cảnh báo (Đ1 mục 6).
- **Cách đọc chữ trên ảnh vé: dùng dịch vụ bên ngoài. Nhà cung cấp: Anthropic (chính), OpenAI (dự phòng).** Thứ tự: Anthropic → lỗi/hết giờ → OpenAI → lỗi → nhân viên nhập tay (nhập lô không bao giờ bị chặn). Khoá ở bí mật của Worker (`ANTHROPIC_API_KEY`, `OPENAI_API_KEY`; chủ tự chạy `wrangler secret put`; thiếu khoá thì bỏ bậc đó). `OPENAI_API_KEY` **đã tồn tại** (Trợ lý Hỗ trợ, ADR-0066/0073): ảnh vé dùng **chung** khoá này, không tạo khoá thứ hai; `ANTHROPIC_API_KEY` là bí mật mới.
- Giới hạn bắt buộc: chỉ gửi ảnh vé của lô đang nhập (không tên khách, mã đơn, giá); qua kết nối mã hoá; khoá chỉ ở bí mật của Worker; mã vé/nội dung QR không vào nhật ký, kể cả khi gọi dịch vụ ngoài.

### Phát hiện về điều khoản hai nhà cung cấp (tra ngày 31/10/2026, **cần chủ đọc**)

Người soạn tra bằng tìm kiếm; trang chính thức đọc được chỉ một phần, nên chủ (hoặc người được chủ giao) nên mở lại hai trang gốc trước khi bật khoá thật.

| | Dùng ảnh để huấn luyện? | Lưu ảnh mặc định? | Xoá ngay (ZDR) |
|---|---|---|---|
| Anthropic API (khoá thương mại) | Không (điều khoản thương mại cấm huấn luyện trên nội dung khách; chưa xác nhận từ trang gốc) | Hai trang của Anthropic nói khác nhau: trang trợ giúp ghi tự xoá trong **30 ngày**; trang tài liệu ghi không lưu sau khi trả kết quả (áp cho khách có ZDR). Coi như **có thể lưu tới 30 ngày** | Có, phải **xin và được Anthropic duyệt** theo tổ chức |
| OpenAI API | Không (mặc định không huấn luyện từ 1/3/2023) | **Tới 30 ngày** để phát hiện lạm dụng | Có, phải **xin và được OpenAI duyệt** |

Nguồn: https://platform.claude.com/docs/build-with-claude/api-and-data-retention ; https://privacy.claude.com/en/articles/8956058-i-have-a-commercial-account-how-do-you-handle-my-data ; https://developers.openai.com/docs/guides/your-data .

**Hệ quả:** điều kiện «nhà cung cấp không lưu» của kế hoạch **không đạt theo mặc định** cho cả hai. Không huấn luyện thì có; không lưu thì chỉ khi có thoả thuận xoá ngay. **Chủ chọn một:** (a) chấp nhận bên kia có thể lưu ảnh tới 30 ngày (ảnh vé không có tên khách; rủi ro là một vé bị lộ trước khi dùng); hoặc (b) xin thoả thuận xoá ngay trước khi bật khoá thật (mã vẫn làm được bằng nhập tay trong lúc chờ). Khuyến nghị **(b) nếu xin được nhanh, nếu không thì (a) kèm bắt buộc nhân viên đối chiếu ở màn xem lại**. Task 4b (đọc chữ) **không bắt đầu** cho tới khi chủ chọn.

## Đ1 — Kho vé và giữ chỗ vé tách khỏi lô xác nhận; hợp đồng giữa các phần

1. **Module mới `ve-dien-tu`**, tiền tố bảng `vdt_`, module nghiêm. Bảng: `vdt_batch`, `vdt_ticket`, `vdt_allocation`, `vdt_delivery`, `vdt_guest_link` (cột ở migration `0131`). `vdt_ticket` không xoá; trạng thái đi một chiều `AVAILABLE→ALLOCATED→VOID`; `ALLOCATED→AVAILABLE` chỉ khi trả vé còn hạn **và chưa lộ**. `vdt_allocation` và `vdt_delivery` chỉ thêm (chỉ `released_at`/`release_reason` ghi một lần; `revealed_at` ghi một lần). Chỉ mục duy nhất một phần chặn một vé thuộc hai chỗ và hai vé cùng một vị trí.
2. **Cạnh phụ thuộc mới** (`ALLOWED_EDGES`, nới theo Điều 9.4 — xin duyệt tại đây): `ve-dien-tu → audit` (ghi nhật ký), `→ staff` (nhãn nhân viên, quyền), `→ thongbao` (báo kho cạn), `→ catalog` (đọc danh mục dịch vụ qua view công bố), `→ orders` **chỉ đọc** view công bố mới `v_ord_service_ve` (migration riêng do `orders` sở hữu, ở Task 5), `→ billing` **không có**: số tiền đi bằng tiêm (mục 4). **Chiều `orders → ve-dien-tu` KHÔNG có cạnh.**
3. **Cấp (giữ chỗ) vé là một lô riêng SAU lô xác nhận**, không nằm trong lô đó và không dùng `ctx.baoThayDoi`. Thiếu kho hoặc cấp lỗi không làm xác nhận thất bại. «Thiếu vé» là **suy ra lúc đọc** (số cần theo số khách hiệu lực, em bé = 0, trừ số đang giữ), không lưu cờ. Cấp lặp lại không cấp thừa. Đơn bị sót (tiến trình chết giữa chừng) được cấp bù khi nhập lô mới, khi đơn mở khoá, khi nhân viên bấm «Cấp vé», hoặc khi quét định kỳ (có Cron Trigger thì dùng; chưa có thì **báo chủ**, vì thêm Cron là đổi cấu hình triển khai).
4. **Hợp đồng `src/shared/router.ts` (đổi hợp đồng giữa các phần — xin duyệt):** thêm vào `injected`/ctx các thành viên do gốc lắp ráp `src/index.ts` tiêm, theo khuôn `isAssigned`/`dongBoChuyen`/`daThuCuaDon`: (a) `capVeSauXacNhan(orderId)` — gọi sau lô xác nhận ở cả ba đường (`POST /api/orders/:id/status`, `…/quyet-dinh` CON_VE, `…/gui-don` nhánh Đối tác); (b) `traVe` — nối câu trả vé vào `huy.cau` của cả **ba đường huỷ** và vào `rut-xac-nhan`, và `sauSuaSoKhach` của `money-edit` cùng sửa số khách của HDV (`handler-money-edit`); (c) `tienDonVe(orderId): Promise<{daThu:number; phaiThu:number}|null>` — dựa `tienNhieuDon` của billing, để máy chủ so «thu đủ» ở **một** hàm thuần có test (`daThu >= phaiThu && phaiThu > 0`; null hoặc phải thu 0 ⇒ không mở). `daThuCuaDon` hiện trả `number|null` (đã thu ròng), không đủ để so. Thành viên thiếu trong khung thử ⇒ hành vi an toàn: không cấp, không mở khoá.
5. **Nhật ký** chỉ ghi số lượng và mã nội bộ của lô/đơn; **mã vé, nội dung QR, khoá kho không bao giờ vào nhật ký, phản hồi lệnh ghi, câu báo lỗi, URL**. Mỗi route mới thêm một ca vào bài khoá «không lộ mã vé» (mẫu `src/giay-to-khong-lo-so.test.ts`).
6. **Luật «đơn chỉ huỷ khi chưa thanh toán» hiện máy chủ chưa thi hành** (có cọc đơn huỷ, ADR-0089). Đ1 không đổi luật huỷ; chốt phòng thủ: vé đã `revealed_at` (đã đọc/giao ảnh một lần) **không bao giờ về lại kho** kể cả khi đơn huỷ hoặc khoản thu bị đảo: đánh `VOID` và hiện cảnh báo trên đơn. Giảm số khách khi vé đã giao còn thừa: trả vé chưa giao trước, rồi hiện cảnh báo «vé đã giao còn thừa», không tự thu hồi.
7. **Kho tệp:** kho R2 **mới, riêng** (binding `VE_DIEN_TU`, bucket `tourdao-sales-ve-dien-tu`; chủ tự chạy `wrangler r2 bucket create`, trả lời «n» nếu lệnh hỏi sửa cấu hình). Khoá ngẫu nhiên không mang tên tệp gốc; tải qua Worker, không URL ký; lô D1 chạy **trước** khi đặt tệp vào kho; đọc kho chỉ sau khi hỏi quyền và ghi nhật ký.

## Đ2 — Đường dẫn riêng cho khách (nới ADR-0123 đ3 và ADR-0144 đ4)

Hiện không có đường dẫn công khai nào cho tệp hay dữ liệu. Đ2 cho **đúng hai route công khai chỉ đọc** (`access: "public"`): `GET /ve/:token` (trang) và `GET /api/ve-khach/:token/anh/:slot` (ảnh). Giới hạn cứng:

- Token ngẫu nhiên ≥ 32 byte, **chỉ lưu băm**, so băm hằng thời gian; chỉ trả token **một lần** lúc tạo; chỉ tạo được khi đơn thu đủ. Hạn = ngày dùng cuối của vé + 7 ngày; thu hồi được (nhân viên có `ve.cap.send`); sai, hết hạn, đã thu hồi **cùng một kiểu 404** (cùng thân, cùng độ dài).
- Chỉ `GET`, không có đường ghi; ghi nhận duy nhất là đếm lượt mở (lớp chống ghi trùng ADR-0094 không áp). Đầu phản hồi như `dauPhanHoiTepChung` (nosniff, CSP sandbox, no-store). Trang chỉ có ảnh vé, nhãn nhóm khách, khoảng ngày; không tên khách, mã đơn, giá, dịch vụ khác. Đường dẫn không chứa mã đơn hay tên.
- **Giới hạn tốc độ chống dò token** theo địa chỉ và theo tổng số lần sai (khuôn bộ chống dò PIN của đăng nhập; người thi công xác nhận dùng lại được trước khi viết). Route công khai này **chưa có tiền lệ cho dữ liệu tệp**, nên lỗ hổng chính là dò token; hai lớp (độ ngẫu nhiên + giới hạn tốc độ) đều bắt buộc.
- Ảnh vé trong đường này là **lộ ra ngoài vĩnh viễn** (khách có thể lưu); cho nên cũng ghi `revealed_at` ngay lần đầu mở.
- Task 7 (đường dẫn khách) **không bắt đầu** khi ADR còn «Đề xuất».

## Đ3 — Hai ô quyền mới

Thêm vào `MATRIX` của `src/shared/permissions.ts` (sửa bài ghim cả hàng ở `permissions.test.ts`; mọi route khai `access`, mặc định từ chối):

| Ô | Việc | SUPER_ADMIN | ADMIN | SALES | ACCOUNTING | Khác |
|---|---|---|---|---|---|---|
| `ve.kho.manage` | nhập lô, xem kho và thống kê, sửa mã tour của lô chưa giữ chỗ, thu hồi vé, nhận báo kho cạn | có | có | có | không | không |
| `ve.cap.send` | nút Cấp vé, xem ảnh, gửi Zalo, tạo/thu hồi đường dẫn khách | có | có | của mình hoặc được giao | chỉ xem danh sách vé (không ảnh, không mã) | không |

Ghi chú: quyền xem ảnh còn bị chặn bởi cổng thanh toán (Đ1 mục 4), không chỉ bởi ô quyền. Bán hàng nhập lô được là chủ chốt 31/10; vì kho vé giữ vật có giá trị tiền, nhật ký nhập lô/thu hồi và bài khoá hàng quyền là bắt buộc. Cột ACCOUNTING và «của mình hoặc được giao» là **đề xuất của người soạn**, chủ sửa nếu khác. Mã quyền bên ngoài (Đối tác, Tài xế…) không có hai ô này; không thêm mã quyền mới nên không nhân đôi bài «tập con quyền».

## Trang ghép (CLAUDE.md §9)

**(1) Bảng nào chứa loại thực thể nào**

| Bảng | Chứa | Chủ ghi |
|---|---|---|
| `vdt_batch` | một lô nhập (một dịch vụ + một nhóm khách) | `ve-dien-tu` |
| `vdt_ticket` | một vé (ảnh + mã + khoảng ngày) — không chứa tên khách | `ve-dien-tu` |
| `vdt_allocation` | vé nào thuộc dòng dịch vụ nào của đơn nào; `revealed_at` | `ve-dien-tu` |
| `vdt_delivery` | lần giao (Zalo / đường dẫn), ai, lúc nào | `ve-dien-tu` |
| `vdt_guest_link` | đường dẫn khách (chỉ băm) | `ve-dien-tu` |
| `v_ord_service_ve` (view) | dòng dịch vụ đã xác nhận: mã tour, ngày đi, số khách hiệu lực bốn nhóm | `orders` công bố |
| Không bảng nào của `parties`, `billing`, `catalog` bị ghi | | |

**(2) Dòng quyền nào áp cho loại nào**

| Dòng | Áp cho |
|---|---|
| `ve.kho.manage` | `vdt_batch`, `vdt_ticket` (nhập, xem kho, thu hồi, thống kê) |
| `ve.cap.send` | `vdt_allocation` (cấp, xem ảnh), `vdt_delivery`, `vdt_guest_link` |
| `order.view` / `order.modify` hiện có | **không đổi**; danh sách vé của đơn dùng cổng `ve.cap.send` cộng quyền xem đơn |
| Dòng quyền hiện có của `billing` | không đổi; chỉ đọc số tiền qua `tienDonVe` |

**(3) Cổng nào canh cửa nào (kể cả giao diện ẩn/hiện)**

| Cửa | Cổng máy chủ | Chỗ giao diện ẩn/hiện |
|---|---|---|
| Nhập lô, kho, thống kê | `ve.kho.manage` | mục «Kho vé» ở menu chỉ hiện khi có ô này |
| Danh sách vé của đơn, nhãn «Thiếu vé» | `ve.cap.send` + quyền xem đơn | nhãn hiện cho người xem đơn có ô; **số lượng không phải bí mật, ảnh/mã thì phải thu đủ** |
| Xem ảnh vé | `ve.cap.send` **và** thu đủ (`tienDonVe`) → ghi nhật ký → mới đọc kho | nút «Xem / Gửi Zalo» ẩn khi chưa thu đủ; **máy chủ vẫn chặn**, ẩn nút không phải cổng |
| Tạo / thu hồi đường dẫn khách | `ve.cap.send` + thu đủ | nút «Sao chép đường dẫn» như trên |
| Trang khách `GET /ve/:token` | token băm + hạn + chưa thu hồi + giới hạn tốc độ | không có đăng nhập; không dẫn tới trang nào khác |
| Cấp bù tự động | không có người; chạy trong tiến trình nhập lô / quét | — |
| Đơn xác nhận / huỷ / sửa số khách | cổng hiện có của `orders`, **không đổi**; vé nối vào cùng lô huỷ/sửa | nhãn «Vé đã giao còn thừa» chỉ hiện cho người có `ve.cap.send` |

**Chỗ dễ nhầm:** (i) «thu đủ» là số của sổ tiền tại thời điểm xem, không phải cờ lưu; khoản thu bị đảo sau khi vé đã lộ không thu hồi được vé (Đ1 mục 6). (ii) Ẩn nút không thay cho cổng máy chủ. (iii) Bảng `vdt_ticket` chứa mã có giá trị tiền, không chứa tên khách; không có bảng nào ở đây chứa dữ liệu cá nhân của khách.

## Hệ quả và việc sau khi duyệt

- Task 5 (nối `orders`), 6 (xem/giao), 7 (đường dẫn khách), 8a (ô quyền) và 4b (đọc chữ) chỉ bắt đầu sau khi chủ duyệt ADR này (4b còn chờ chủ chọn (a)/(b) ở phần điều khoản).
- Hàng rào mới (chỉ mục duy nhất, trigger một chiều, bài khoá không lộ mã vé, hàng rào tĩnh kho tệp, giới hạn tốc độ token) ghi vào `docs/SO-HANG-RAO.md` kèm ngày quan sát chặn thật.
- Ngoài phạm vi: tự gửi Zalo, mua vé tự động, nhà cung cấp vé khác, đối soát tiền mua vé, đổi luật huỷ đơn đã thu (cần ADR riêng).
