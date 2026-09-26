# Phản biện và thiết kế tổng hợp: Hoàn tất đơn + sổ công nợ (ba góc nhìn)

- **Ngày:** 2026-09-25. **Vai:** lập kế hoạch. **Theo yêu cầu chủ:** "chạy subagent để (1) xem lại spec, (2) nên đưa vào hệ thống thế nào để đúng với kiến trúc Modular Monolith, (3) tách biệt thực thể với vai trò và/hoặc thuộc tính, để sau này sửa logic sẽ dễ. Bàn thật kỹ."
- **Đầu vào:** đặc tả `2026-09-25-hoan-tat-don-va-so-ke-toan.md` (kể cả §10 trả lời của chủ). Ba subagent **chỉ đọc**, độc lập: (P) phản biện đặc tả; (K) kiến trúc module; (D) mô hình dữ liệu. Tài liệu này là **tổng hợp của điều phối**; chỗ ba bên lệch nhau ghi rõ lựa chọn và lý do. Chưa trình duyệt.

## 1. Kết luận

1. **Số học của §5 đúng** (P tính lại; D tính lại bằng mô hình sổ đề xuất — cùng kết quả). Nhưng **luật cân đối chỉ đúng khi** tổng tiền đã thu = số phải thu **và** giá vốn/hoa hồng là **số đã lưu theo dòng** (không tính lại từ cài đặt hiện hành).
2. **Đặc tả có một lỗi kiến trúc:** đặt "bản ghi hoàn tất" ở `billing` rồi cho trigger của `orders` đọc bảng `bil_` ⇒ **vòng phụ thuộc** `orders ⇄ billing` ở tầng SQL, và test kiến trúc hiện **không bắt được** (chỉ soi `INSTEAD OF`, `src/architecture.test.ts:201-202`). **Sửa:** "đơn đã đóng băng" là sự thật của **`orders`**; `billing` giữ tiền và trỏ về nó. (Cả ba bên cùng kết luận.)
3. **Tách lớp** (D, được K và P xác nhận): **thực thể** (hồ sơ, đơn, dòng dịch vụ, mã dịch vụ, lần thu, phiếu sổ, dòng nợ) — **vai trong ngữ cảnh** (bên đặt/người hưởng, người phụ trách, **người bán trên biên nhận**, nhà cung cấp của dòng, **người thu tiền**) — **chính sách có hiệu lực theo ngày** (tỷ lệ, a%, người bán theo dịch vụ, hình thức thu) — **luật tính** (hàm thuần). Hệ quả: **đa số thay đổi kinh doanh = thêm dòng dữ liệu, không sửa mã** (§5).
4. **Năm điểm phải chốt trước khi soạn ADR lượt 1** (P): cơ sở N; thu thiếu/dư; thời điểm chụp tỷ lệ; nộp tiền/trả nợ/hoàn tiền; số phận ba cột cọc cũ. Đều có khuyến nghị ở §7.

## 2. Điểm then chốt về tách lớp (trả lời câu (3) của chủ)

**Nguyên tắc bằng lời thường:**
- Cái gì **tồn tại độc lập** → *thực thể* (có mã riêng, sống lâu): i-resort, Tour Đảo, lễ tân Hương, đơn TD-0123, vé Hòn Tằm.
- Cái gì là **"ai đứng ở vị trí nào trong việc này"** → *vai*: i-resort *là nhà cung cấp* của dòng vé bùn; lễ tân Hương *là người hưởng* của đơn TD-0123; HDV Nam *là người thu* lần thu 200.000.
- Cái gì là **con số/lựa chọn đổi theo thời gian** → *chính sách*: "lễ tân hưởng 10% vé đảo từ 1/10", "i-resort bán cho Tour Đảo 80% giá lẻ từ 1/10". Lưu thành **dòng có ngày hiệu lực**, và **chụp vào đơn** lúc xác nhận — đổi chính sách không làm đổi đơn cũ.
- **Cách từ dữ liệu ra tiền** → *luật*, nằm trong mã, một nơi duy nhất, có test.

**Phát hiện quan trọng (D):** "loại biên nhận" **không phải thuộc tính** mà là **vai**: "Tour Đảo bán" = *người bán ghi trên biên nhận là hồ sơ Tour Đảo*; "làm đại lý" = *người bán là hồ sơ i-resort*. Lưu **người bán** theo dịch vụ, loại biên nhận **suy ra**. Thêm hình thức thứ ba sau này vẫn chỉ là dữ liệu.

**Không làm (phản ví dụ):** cờ `is_agent`/`is_supplier` trên hồ sơ (mất ngày hiệu lực, trái ADR-0001); chiết khấu trên tài khoản đăng nhập (trái ADR-0018 điều 1); cột loại biên nhận / a% trên bảng danh mục (bị Sheet ghi đè mỗi lần đồng bộ, `migrations/0006`); viết cứng mã hay id i-resort trong mã; cột "người giữ cọc" trên đơn (đó là vai của **từng lần thu**).

**Việc nền phải làm:** **Tour Đảo chưa là một hồ sơ** — `company_profile` là bảng một dòng, không có `party_id` (`migrations/0002`). Cần tạo hồ sơ tổ chức Tour Đảo và tra id qua **một** hàm công bố (không viết cứng).

## 3. Bản đồ module (trả lời câu (2))

| Module | Sở hữu | Ghi chú |
|---|---|---|
| `orders` (có sẵn) | + cột `orders.completed_at` (chỉ thêm cột) + view `v_ord_order_state` (trạng thái suy ra, có cờ hoàn tất) + trigger khoá đơn đã hoàn tất; + **cột chụp** trên `order_service` (người bán, nhà cung cấp, a%, chiết khấu + nguồn quy tắc, lúc chụp) | "Hoàn thành" = `confirmed` + `completed_at` — **không đụng `CHECK`**, không dựng lại bảng |
| `pricing` (**mới**, nghiêm, tiền tố `prc_`) | nhóm đối tác, loại dịch vụ, **quy tắc chiết khấu**, **điều khoản cung ứng** (người bán, nhà cung cấp, a%) — đều theo ngày hiệu lực | tách khỏi `catalog` (catalog đồng bộ Sheet, phục vụ trình duyệt → dễ lộ a%). **Lệch ADR-0002** (xếp "quy tắc giá theo vai" vào `catalog`) → cần ADR bổ sung (như ADR-0008 đã làm) |
| `billing` (**mới**, nghiêm, `bil_`) | lần thu tiền, phiếu sổ, dòng nợ, hình thức thu; route **Hoàn tất**, ghi thu, sổ, nộp/trả | đúng ADR-0004 (`bil_` đã khai) |
| `receipt` (**mới**, không dùng CSDL) | dựng **ReceiptDto theo danh sách trắng** ở máy chủ | biên nhận không bao giờ nhận cả đơn rồi "bỏ bớt" |
| `parties` | + dữ liệu vai "Nhà cung cấp", hồ sơ Tour Đảo | chỉ dữ liệu |
| `bangtin` | (ADR-0022) | chỉ báo **sau** khi lô ghi thành công |

**Đồ thị phụ thuộc (mọi mũi tên đi xuống, không vòng):**
```
receipt ─▶ billing ─▶ orders ─▶ pricing ─▶ catalog, parties ─▶ locations
   └─▶ company      └─▶ staff, parties, audit
dispatch ─▶ orders (có sẵn)
```
Cạnh mới: `orders→pricing`, `pricing→{parties,catalog,audit}`, `billing→{orders,parties,staff,audit}`, `receipt→{orders,billing,parties,company}`. Vì sao `orders→pricing` (không ngược lại): tỷ lệ phải **chụp trong luồng của đơn** lúc xác nhận (ADR-0018 điều 11).

**Giao dịch "Hoàn tất" — một lô ghi, đúng quyền sở hữu (K chọn phương án a):**
1. `billing` (route) lấy câu lệnh **chưa chạy** từ `orders/index.ts`: `UPDATE orders SET completed_at=… WHERE id=? AND status='confirmed' AND completed_at IS NULL AND updated_at=?` (khoá lạc quan, chống hoàn tất hai lần, chống "đang có người sửa").
2. Câu nhật ký `audit_log` (`order_completed`).
3. Các câu của `billing`: lần thu lúc hoàn tất, phiếu sổ, dòng nợ — mỗi câu có điều kiện `EXISTS (… v_ord_order_state … completed_at = <mốc do request sinh>)` (đọc **qua view công bố**) làm lưới thứ hai.
- Không tiêm câu lệnh qua gốc lắp ráp (ADR-0020 vừa gỡ kiểu đó); không phát sự kiện rồi mới tính tiền (Bảng tin có thể lỡ tin). **Chưa kiểm:** "một câu hỏng thì cả lô D1 huỷ" — phải có e2e cố ý làm hỏng câu thứ 3 trước khi dựa vào.

**Biên nhận an toàn (K + P):** hôm nay `buildConfirmation(order: OrderDetailDto…)` (`src/shared/order-confirmation.ts:220`) nhận **cả đơn** — đúng kiểu chủ cấm ở Q3. Đổi sang `ReceiptDto` chỉ gồm trường được phép, dựng ở máy chủ; số giá vốn/chiết khấu **không bao giờ** nằm trong `OrderDetailDto` (đi ở route sổ, quyền riêng). Test: đưa số lạ (vd 480.017) vào mọi ô bí mật → quét biên nhận không thấy.

## 4. Mô hình sổ (D, chọn thay cho "số có dấu" của K)

- **Dòng nợ hai chân:** mỗi dòng = *ai nợ* (`debtor`) — *ai được nợ* (`creditor`) — *số tiền > 0* — *loại* (mua giá đại lý, hoa hồng, giá vốn nhà cung cấp, tiền đang giữ hộ, tiền thu hộ, quyết toán) — *đơn / dòng dịch vụ* — gom dưới một **phiếu sổ** (hoàn tất / điều chỉnh / đảo / quyết toán). Chỉ-thêm; **dòng đảo** = cùng số, đổi chỗ hai bên. Số dư mỗi hồ sơ là **view**, không lưu cột.
- **Vì sao chọn cách này** (thay cho "số có dấu theo góc Tour Đảo" của K): ghi được nợ **giữa hai bên không phải Tour Đảo** nếu sau này cần, dòng đảo rõ ràng, và đủ cho công ty 30 người mà **chưa cần hệ thống tài khoản kế toán** (sau này suy ra từ "loại dòng").
- **Lần thu tiền:** số tiền, **người thu** (hồ sơ cụ thể — không phải "HDV đang phụ trách"), **vai người thu** (công ty / nhân viên / người hưởng / nhà cung cấp), **hình thức** (bảng tra cứu — ADR-0003 gọi đích danh "hình thức thu" là tập mở), **thu cho ai**, giai đoạn (trả trước / lúc hoàn tất), dòng đảo.
- **Luật sinh dòng khi Hoàn tất** và **5 bất biến** (I1: tổng thu = phải thu; I2: phần Tour Đảo = N − giá vốn − hoa hồng, theo **số đã lưu**; I3: dòng đảo khớp dòng gốc; I4: đơn hoàn thành có đúng một phiếu hoàn tất; I5: dòng dịch vụ có người bán) → vào `audit-invariants` (mã `R-BIL-*`). D đã chạy lại §5.1 và §5.2A bằng luật này: khớp.

## 5. Thay đổi sau này: sửa dữ liệu hay sửa mã

| Thay đổi | Cách |
|---|---|
| Lễ tân 10% → 12% từ tháng sau | **dữ liệu** (đóng dòng cũ, mở dòng mới); đơn cũ giữ số đã chụp |
| i-resort đổi a% | **dữ liệu** |
| Một dịch vụ chuyển "Tour Đảo bán" → "làm đại lý" | **dữ liệu** (người bán mới từ ngày X) |
| Thêm hình thức thu | **dữ liệu** |
| Thêm nhà cung cấp thứ hai cho một dịch vụ | dữ liệu + **giao diện** chọn nhà cung cấp |
| Thêm vai đối tác mới | dữ liệu + bộ quyền mặc định (đang trong mã, ADR-0018) |
| Hoa hồng theo mùa/số lượng; VAT | **ADR + mã** (ngoài phạm vi; ADR-0004 loại thuế) |

## 6. Lỗ hổng / luồng thiếu mà đặc tả chưa có (P)

- **Khoá "Hoàn thành" chưa đủ:** hôm nay đơn đã xác nhận vẫn **huỷ được** (`migrations/0017:10-11`), vẫn sửa thông tin chuyến, vẫn **thêm** dòng điều chỉnh (`0021` chỉ khoá sửa/xoá), vẫn đổi người phụ trách. Khoá tiền sau xác nhận hôm nay **chỉ ở mã** (bước B của đặc tả khoá tiền 22/9 chưa làm). ⇒ D1 cần trigger mới trên ≥ 5 bảng (kể cả của `dispatch`, qua view công bố).
- **Tiền còn thu có thể âm ngay hôm nay:** giảm khách xuống dưới tiền cọc không bị chặn (`src/modules/orders/money-adjustment.ts:215-218`; **chưa chạy thử**, mới đọc mã) ⇒ công ty nợ khách mà không có chỗ ghi.
- **Người thu cũ:** HDV A thu tiền rồi đơn chuyển sang HDV B → người Hoàn tất phải chọn đúng A; A phải **luôn thấy nợ của mình** kể cả khi không còn thấy đơn (sửa ADR-0023 điều 1: nợ hiện ở "Sổ của tôi", không qua đơn).
- **"Công ty thu – chuyển khoản" do HDV tự khai** làm giảm nợ chính HDV ⇒ cần Kế toán xác nhận.
- **Nộp tiền / trả đối tác / hoàn tiền khách** chưa có ⇒ sổ chỉ tăng, "Bạn đang giữ…" không bao giờ về 0.
- **Hoàn tất trước ngày đi**, **khách không đến mà nhà cung cấp vẫn tính**, **đơn có người hưởng hoàn tất khi chưa có bảng tỷ lệ (lượt 2)** ⇒ hoa hồng 0 vĩnh viễn trên đơn bất biến.
- **Đơn trộn người bán:** tiền trả trước phải phân bổ theo người bán (còn lại tại quầy i-resort chỉ phần của i-resort).
- **Bảng tin:** hàng rào "mọi route ghi đơn đều báo" phải mở rộng sang route Hoàn tất ở `billing`.

## 7. Câu hỏi cho chủ (gom một lần, có khuyến nghị)

| # | Câu | Khuyến nghị |
|---|---|---|
| H1 | **Người hưởng hoa hồng ghi ở đâu?** A: chính là **bên đặt** của đơn (lễ tân/taxi đặt hộ khách thì ghi là bên đặt) — đúng mô hình ADR-0018 đã duyệt, không thêm ô. B: ô "Người giới thiệu" riêng — ADR-0018 đã **loại** đúng ô này, chọn B phải ra quyết định mới. **Tiền ra giống hệt nhau** (D tính lại) | **A** |
| H2 | **Khách trả khác số phải thu lúc Hoàn tất?** | Chỉ Hoàn tất được khi **đã thu = phải thu**. Giảm giá tại chỗ / khách bớt người → sửa đơn (có lý do) **trước** khi Hoàn tất. Không ghi "khách còn nợ" |
| H3 | **"Công ty thu – chuyển khoản"** do HDV khai có cần Kế toán xác nhận? | **Có** — trước khi xác nhận vẫn tính vào nợ của người khai |
| H4 | **Nộp tiền, trả đối tác/nhà cung cấp, hoàn tiền khách** có vào đợt 1? | **Có, mức tối thiểu:** Kế toán ghi "HDV đã nộp", "đã trả CTV/i-resort", "đã hoàn khách" |
| H5 | **Chụp người bán, a%, chiết khấu lúc nào?** | Lúc **Xác nhận** (và khi thêm dịch vụ sau đó). Hoàn tất **không** tra lại cài đặt |
| H6 | **Hoàn thành khoá những gì?** | Khoá **tất cả**: sửa, huỷ, thêm điều chỉnh, **đổi người phụ trách**. Chỉ Hoàn tất được **từ ngày đi trở đi** |
| H7 | **Hoa hồng cố định "mỗi khách" đếm ai?** | Người lớn + trẻ em + người cao tuổi; **không** đếm em bé; dịch vụ tính theo nhóm 5 người → tính theo **lượt** |
| H8 | **Giảm giá do ai chịu, a% tính trên giá nào?** | Đơn đối tác: đối tác chịu (đã quyết, ADR-0018 §11). Đơn khách lẻ: Tour Đảo chịu. a% tính trên **giá lẻ trước giảm** |
| H9 | **Mức chiết khấu gắn theo nhóm hay theo vai?** | Mỗi vai bên ngoài **tự động là một nhóm**; gắn được mức riêng cho **từng đối tác** khi cần (khớp cả ADR-0018 lẫn lời chủ) |

**Điều phối tự quyết (kỹ thuật, ghi để người kiểm):** "đơn đã đóng băng" thuộc `orders` (cột `completed_at`); sổ hai chân; module `pricing` + `receipt` (cần ADR bổ sung ADR-0002 — chủ duyệt cùng lượt 1); bảng chỉ-thêm vẫn có đủ 4 cột WHO (không nới test — Điều 9.4); ba cột cọc: **ngừng đọc/ghi trong cùng lần triển khai** thêm sổ thu, cột vật lý giữ và khai "không dùng nữa" (đáp ứng ADR-0004 mà không phải dựng lại bảng), cọc cũ chuyển thành lần thu "người thu: chưa rõ" và đơn đó **không Hoàn tất được** cho tới khi Kế toán ghi lại đúng.

**Mâu thuẫn giữa hai ADR đã duyệt (không tự hoà giải — trình khi soạn D2):** ADR-0003 (mọi bảng có cột WHO, không `CASCADE`) và bảng điều chỉnh `0021` (cố ý không WHO theo ADR-0007, có `CASCADE`).

## 8. Chia lượt duyệt (cập nhật)

- **Lượt 1** (sau khi ADR-0019 lên production): **D0** đồ thị module (`pricing`, `receipt`, tiền tố) — **D1** Hoàn thành + khoá — **D2** sổ công nợ + lần thu + nộp/trả/hoàn + ba cột cọc. Người hưởng (H1 = A) **không cần quyết định riêng** (dùng lại bên đặt). Trang ghép bắt buộc.
- **Lượt 2:** **D4** chính sách chiết khấu — **D5** điều khoản cung ứng (người bán, nhà cung cấp, a%, vai Nhà cung cấp).
- Đơn có người hưởng **không Hoàn tất được** cho tới lượt 2 (tránh hoa hồng 0 vĩnh viễn) — hoặc Kế toán nhập tay có lý do (chọn khi soạn D2).

## 9. Hàng rào mới đề xuất (mỗi cái phải thấy chặn thật một lần)

1. **Trigger chỉ đọc bảng cùng module** hoặc view công bố (bắt đúng lỗi vòng ở §1.2 — cài tạm trigger đọc `bil_` để thấy đỏ).
2. **Biên nhận không chứa số bí mật** (thêm tạm trường giá vốn vào ReceiptDto để thấy đỏ).
3. **Bảng sổ chỉ-thêm** (trigger cấm sửa/xoá + test migration).
4. **Bảng tin phủ route Hoàn tất.**
5. **Bất biến cân đối `R-BIL-*`** trong `audit-invariants`.

## 10. Trả lời của chủ (2026-09-25, phiên chat)

- **H1:** đúng — *"người hưởng hoa hồng chính là bên đặt của đơn"* → không thêm ô "Người giới thiệu" (giữ ADR-0018 điều 9); Q4 của đặc tả gốc được thay bằng câu này.
- **H2:** đúng, và chủ **tách hai bước**: *"việc HDV bấm Hoàn tất và Kế toán xác nhận đơn hoàn tất là khác nhau. Vì HDV giao vé và thu đủ số còn lại từ khách thì HDV đã hoàn tất, nhưng đơn chỉ thực sự hoàn tất khi công ty thu đủ tiền về."* → luồng mới: Đã xác nhận → (HDV) **Đã giao – đã thu đủ của khách** → (Kế toán) **Hoàn thành**. Chi tiết chờ câu làm rõ H2' (dưới).
- **H3:** đúng. **H4:** đồng ý — *"theo đúng nguyên tắc thận trọng của kế toán"* (khoản chưa được Kế toán xác nhận thì chưa ghi là đã thu/đã trả). **H6, H7, H9:** đồng ý theo khuyến nghị.
- **H5:** chủ hỏi lại nghĩa của "chụp". **H8:** chủ thấy khó hiểu → hỏi lại bằng ví dụ.

### Câu làm rõ (lượt sau)
- **H2'** — (a) khoá sửa đơn và ghi sổ ở bước HDV (khuyến nghị) hay bước Kế toán; (b) "Hoàn thành" = mọi khoản **người khác nợ công ty** của đơn đã về đủ (khuyến nghị), khoản **công ty còn phải trả** (hoa hồng, i-resort) theo dõi riêng, không chặn.
- **H5** (giải thích lại): "chụp" = lưu **bản sao** mức tỷ lệ/giá vốn/người bán vào chính đơn lúc Xác nhận; đổi cài đặt sau đó không làm đổi đơn đã xác nhận.
- **H8** (hỏi lại): giảm giá cho khách thì giá vốn trả nhà cung cấp tính trên giá **trước** hay **sau** giảm (khuyến nghị: trước).
- **H5 (2026-09-25):** chủ đồng ý — chụp mức chiết khấu, giá vốn, người bán vào đơn lúc Xác nhận (và khi thêm dịch vụ); đổi cài đặt sau không đổi đơn đã xác nhận.
- **H8 (2026-09-25):** **A** — giá vốn nhà cung cấp tính trên **giá gốc trước giảm**; Tour Đảo chịu phần giảm giá của mình (ví dụ: vé 300.000 giảm 30.000 → trả i-resort 80% × 300.000 = 240.000). Đối tác tự giảm thì đối tác chịu (đã quyết, ADR-0018 §11).
- **H2' — chưa trả lời.**
- **H2' (2026-09-25):** chủ đồng ý theo khuyến nghị — (a) **khoá đơn và ghi sổ ngay khi HDV bấm "Đã giao – đã thu đủ"**; (b) **Kế toán bấm "Hoàn thành"** khi mọi khoản người khác nợ công ty của đơn đã về đủ; khoản công ty còn phải trả (hoa hồng, nhà cung cấp) theo dõi riêng trong sổ, **không chặn**. → Mọi câu H1–H9, H2' đã trả lời; bước tiếp: soạn ADR lượt 1 (D0–D2) + trang ghép.
