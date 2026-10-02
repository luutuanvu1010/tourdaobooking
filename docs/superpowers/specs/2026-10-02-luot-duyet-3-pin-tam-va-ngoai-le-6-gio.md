# Lượt duyệt 3 — ADR-0093 PIN tạm + ADR-0091 Bán hàng phá lệ mốc 6 giờ (nhãn "Ngoại lệ 6 giờ")

> **Trạng thái:** **NHÁP bản 2.1, chờ chủ nói "Duyệt" văn bản ADR-0093, ADR-0091.**
> - Q-B1, Q-B3…Q-B9 **áp theo khuyến nghị** (mục "Câu hỏi mở" của từng ADR), theo lời chủ 2/10: *"đừng hỏi tôi những câu hỏi mà tôi nên đồng ý nữa,"*. Chủ bác câu nào thì sửa câu đó.
>   - Q-B1: đặt lại PIN 24 giờ, tạo mới 7 ngày.
>   - Q-B6: tài khoản nội bộ cũ phải đổi PIN một lần; đối tác không bắt.
>   - Q-B3: mọi giờ.
>   - Q-B4: chỉ hộp thông báo.
>   - Q-B5: Đối tác, HDV, Thực tập, Kế toán không phá lệ.
>   - Q-B7: như đ3.
>   - Q-B8: Đối tác thấy loại dấu.
>   - Q-B9: ngăn "Tất cả".
> - Chủ đã chọn nguyên tắc ngày 2026-10-02 (câu 4 "ok"; câu 5 "cho phép (nhưng phải có nhãn hoặc ký hiệu riêng…)").
> - Bản 1 bị người duyệt độc lập kết luận "duyệt được sau khi sửa 9 chỗ" (`2026-10-02-phieu-duyet-doc-lap-luot-B-quyen.md`). Bản này sửa đủ 9 chỗ; mã sửa ghi trong ngoặc, ví dụ (B-C1).
> - Phần "chỉ Toàn quyền cấp quyền tiền" (Q-B2 cũ) đã tách thành **ADR-0090 ở lượt 1**.
>
> **Đánh số:** PIN tạm đổi từ 0090 (bản 1) sang **0093**, vì 0090 nay là phần quyền tiền đi gấp.
>
> **Bước ghép:** 2 ADR chạm quyền và dữ liệu, kèm trang ghép ở cuối.
>
> **Thứ tự thi công** (B-D):
> - ADR-0093 có migration, cổng router, vỏ trang. Nó **không được chặn** lượt 1 và lượt 2 (hạn 15/10, 31/10).
> - ADR-0091 lập kế hoạch trên `main`, phối hợp lộ trình Vận chuyển (đợt 1 vừa chạm `van-chuyen`, `dat-gap-ui`, lịch chung).
>
> **Sửa sự thật so với bản 1** (B-B0):
> - route đặt lại PIN ở `accounts/index.ts:655`;
> - **không có bảng `thongbao`**: hộp thông báo đọc từ nhật ký;
> - `vc_trip` **chưa có** cột phá lệ của ADR-0056;
> - bản 1 ghi đảo nhãn dòng 7a/7b của `web/dat-gap-ui.ts`;
> - ADR-0051 không nói về đặt gấp, nên đã bỏ khỏi bảng "Thay câu nào";
> - câu "thêm ADMIN" ở Q-B2 cũ đã đúng sẵn từ hôm nay, vì luật cấp bậc.
>
> **Số dòng mã** trích theo `968ecfdb`.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)

> "4- ok, 5- cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"

> **Nhắc một lần (P18):** ADR-0049 ghi ở phần phương án bị loại (`ADR-0049:365`): "**Bán hàng tự phá lệ mốc 6 giờ:** chủ chọn chỉ Quản trị, Toàn quyền (ĐP3)". Câu 5 ngày 2/10 **đảo ngược** lựa chọn ngày 29/9. Nếu chọn "mọi giờ" (Q-B3) thì đảo ngược trọn vẹn, không chỉ vá ban đêm. Chủ đã nghe điều này và vẫn quyết thì ADR-0091 thi hành, không nhắc lại.

---

## ADR-0093 — PIN do người khác đặt là PIN tạm: chỉ dùng để đổi PIN, người đặt không giữ được PIN dài hạn

### Bối cảnh
- **QT04:** người đặt lại PIN thấy PIN mới và dùng được nó.
- **GD-P-01:** người tạo tài khoản biết PIN đầu.
- **Lượt 1 (ADR-0090)** đã chặn phần nguy hiểm nhất: tài khoản có quyền tiền. Phần còn lại là mọi tài khoản khác, trong đó có khoảng 1.000 tài khoản đối tác.
- Giá trị thật của PIN tạm là **người đặt không giữ được PIN dài hạn**, để chặn kiểu đăng nhập lặng lẽ về sau. Việc "chủ thật bị khoá ngoài nên mạo danh lộ ra" thì đã đúng từ hôm nay (B-B5).

### Quyết định
1. **Một nguồn** (B-B4): hai cột trên `staff`, đều chỉ ở bảng này.
   - `pin_tam` (0/1): đang dùng PIN tạm hay không;
   - `pin_tam_het_han_luc`: NULL nghĩa là **không hạn**. Dùng cho tài khoản cũ ở đ6 (phiếu kiểm bản 2, M2).
   
   Router đọc cờ qua hồ sơ người dùng ở mỗi yêu cầu.
   - Không đặt cờ trên sổ phiên. Cờ theo tài khoản chặn được mọi kiểu đăng nhập: PIN, Face ID, Google sau này.
2. **Tạo tài khoản và đặt lại PIN** đều sinh PIN tạm. **Hạn** (Q-B1): **đặt lại PIN 24 giờ; tạo tài khoản mới 7 ngày.** Hạn tính tới lúc **đổi PIN**, không tính tới lần đăng nhập đầu (B-B8).
3. **Phiên PIN tạm** (B-B3, B-B12) chỉ mở ba đường:
   - `GET /api/auth/me`;
   - `POST /api/account/change-pin`;
   - đăng xuất.
   
   Mọi đường khác trả 403 với mã riêng `pin_tam_phai_doi` và câu "Bạn đang dùng mã PIN tạm. Đổi mã PIN mới trước khi làm việc." Vỏ trang chuyển màn theo mã lỗi.
   - **Ghi rõ là bị chặn:** bật Face ID (`accounts/index.ts:228`) và đặt PIN bằng Face ID. Route bật Face ID chỉ đòi "PIN hiện tại", và PIN tạm thoả điều đó.
   - Có bài kiểm **đỏ trước**.
   - **Lưới an toàn:** đổi PIN tạm thành công thì gỡ mọi Face ID còn hiệu lực. Bình thường số này là 0, vì `reset-pin` đã gỡ hết.
4. **Báo tới người thật** (B-B5): ngay sau khi chủ tài khoản tự đặt PIN mới, màn hình hiện:

   > "Tài khoản được đặt lại PIN lúc … Từ đó tới nay có N lần đăng nhập hoặc đổi PIN trên các máy: … Không phải bạn thì báo người phụ trách hệ thống."

   Màn này đọc sổ phiên của chính mình (`GET /api/account/sessions`). Tin cho Toàn quyền chỉ gửi khi tài khoản có quyền tiền (định nghĩa ở ADR-0090 đ0); cần dòng ADR-0034 điều 1, 4 ở bảng "Thay câu nào".
5. **PIN tạm hết hạn:**
   - đúng PIN nhưng đã hết hạn → câu riêng "Mã PIN tạm đã hết hạn — nhờ người quản lý cấp lại";
   - sai PIN vẫn tính vào bộ chống dò;
   - câu riêng chỉ hiện khi PIN đúng, nên không lộ việc tài khoản tồn tại (B-B8).
6. **Tài khoản cũ** (Q-B6, B-B2; chạm dữ liệu thật):
   - Lúc phát hành, **tài khoản nội bộ** nào chưa tự đổi PIN sau lần `staff_created` / `pin_reset` gần nhất thì bị đánh dấu `pin_tam = 1`, `pin_tam_het_han_luc = NULL` (không hạn). Lần đăng nhập tới phải đổi.
   - Tài khoản **đối tác không bắt**.
   - Trước khi phát hành, chủ chạy lệnh chỉ đọc (AI soạn) để đếm. Nhật ký thời nạp ban đầu có đủ không: **chưa kiểm**.
7. **Danh sách tài khoản:** người hỗ trợ thấy trạng thái "Đang chờ đổi PIN tạm" hoặc "Đã đổi lúc …", không thấy thiết bị hay IP (B-B10).
8. **Với ADR-0074** (lớp hai, đã duyệt, chưa làm) (B-B9):
   - thứ tự lần đầu: PIN tạm → đổi PIN → đăng ký lớp hai;
   - hướng về sau: khi có Zalo ZNS thì gửi PIN tạm thẳng cho người dùng, người đặt không thấy. Cách này đóng hẳn GD-P-01.

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0071 (Nhân sự tạo tài khoản, `:33`: máy chủ sinh PIN và hiện cho người tạo; 1e: Nhân sự không hỗ trợ đăng nhập) | PIN đầu do máy chủ sinh, người tạo biết và PIN dùng lâu dài | PIN đầu là PIN tạm, hạn 7 ngày; hết hạn thì Quản trị cấp lại (Toàn quyền nếu tài khoản có quyền tiền) |
| ADR-0042 (Quản trị đặt lại PIN cấp dưới) | PIN mới dùng lâu dài | PIN tạm 24 giờ |
| ADR-0016 (Face ID; 2b đặt PIN bằng Face ID) | bật Face ID cần PIN hiện tại | phiên PIN tạm không bật được Face ID và không đặt PIN bằng Face ID |
| ADR-0042 đ2 (kẽ hở đổi SĐT, tiền đề "Quản trị vốn đặt lại PIN được") | — | ghi chú: với tài khoản quyền tiền tiền đề này không còn (B-B13) |
| ADR-0034 điều 1, 4 | — | + tin "tài khoản có quyền tiền vừa đổi PIN tạm" vào "Của tôi" của Toàn quyền (đ4) |

### Câu hỏi mở
- **Q-B1 — hạn PIN tạm.**
  - **Khuyến nghị:** đặt lại 24 giờ, tạo mới 7 ngày.
  - Phương án khác: 72 giờ cho cả hai.
- **Q-B6 — tài khoản cũ.**
  - **Khuyến nghị:** có. Khoảng 30 tài khoản nội bộ phải đổi một lần; đối tác không bắt.

---

## ADR-0091 — Bán hàng được phá lệ mốc 6 giờ khi thật sự bị chặn, có nhãn "Ngoại lệ 6 giờ"

### Bối cảnh
- **QT02:** đơn xác nhận lúc còn hơn 6 giờ; tới lúc xếp xe thì đã vào mốc. Bán hàng nhận 409 "cần Quản trị phá lệ". Ban đêm không có Quản trị thì không ai xếp được xe.
- Đặt gấp nhầm không gỡ được (405).
- Ô hiện tại: `order.leg.short_notice` và `trip.override` chỉ có ADMIN, SUPER_ADMIN (`permissions.ts:83, 171`).
- Người xếp xe hằng ngày là Bán hàng, qua ô `trip.dispatch` (Bán hàng, Quản trị, Toàn quyền).
- Không có vai "Điều phối" riêng; vai "Điều hành chung" thì mang quyền Quản trị. "Điều phối" trong câu hỏi gửi chủ được hiểu là người đang xếp xe, tức **Bán hàng**.

### Quyết định
1. **Ô mới `order.leg.short_notice.exception`** (B-C3):
   - SALES `any`, SUPER_ADMIN `any` (bắt buộc: SUPER_ADMIN là `any` ở mọi ô, `permissions.test.ts:91-93`), các vai khác `none`;
   - **không** cho Đối tác, HDV, Thực tập, Kế toán (Q-B5);
   - phạm vi `any`, vì người trực đêm lo cả đơn của người khác và đơn đối tác;
   - thêm ô (không thêm mã quyền), nên số ca bài kiểm tăng tuyến tính; phải sửa khoảng 7 chỗ trong bộ kiểm.
   
   **Luật ưu tiên:** người gửi giữ `order.leg.short_notice` (Quản trị, Toàn quyền, kể cả tài khoản kiêm Bán hàng) thì luôn ghi là "Đặt gấp". Chỉ người có ô ngoại lệ mà **không** có ô đặt gấp mới ra nhãn "Ngoại lệ 6 giờ".
2. **Chỉ nhận ngoại lệ khi lệnh đang thật sự bị mốc chặn, ngay lúc gửi** (B-C1). Ngoài các trường hợp dưới, máy chủ trả 409:
   - xác nhận đơn hoặc sửa chặng: giờ đón < bây giờ + mốc (`kiemMocDat`);
   - xếp xe: chuyến đích trong mốc, tính theo giờ xuất bến sớm nhất từng có (`kiemMocXep`);
   - hai phép đo dùng hai đồng hồ khác nhau (tới giờ đón và tới giờ xuất bến); kế hoạch phải thử cả hai.
   
   Lý do: dấu đặt gấp trên chặng **miễn mốc lúc xếp** (`moc-toi-thieu.ts:67`). Nếu đóng dấu được trước vài ngày thì bỏ qua mốc hoàn toàn.
3. **Cổng được mở** (Q-B7, B-C2):
   - (a) xác nhận đơn;
   - (b) sửa ngày, giờ, nơi của chặng đã xác nhận khi dưới mốc (I14);
   - (c) **chỉ lệnh XEP**, tức đưa chặng chưa có xe lên xe;
   - (d) thêm điểm đón khi xe đang chạy (ADR-0052).
   
   **Chưa mở:** RUT, DOI_DI, DOI_DEN, DOI_XE, DOI_TAI_XE, HUY_CO_KHACH (`moc-toi-thieu.ts:65`), và đổi xe hay tài xế khi sửa chuyến. Các lệnh này để sau khi việc **báo tài xế** (G8) làm xong, vì đổi xe hay tài xế sát giờ chính là chỗ tài xế không được báo (KD08).
4. **Lý do bắt buộc**, chọn từ **một danh sách dùng chung** cho mọi điểm phá lệ, ưu tiên dạng dữ liệu có kiểu (Hiến chương 5.2) (B-C8):
   - hôm nay có hai danh sách, `LY_DO_DAT_GAP` trong mã và nhóm `PHA_LE` của `vc_reason`; gộp lại, thêm mã mới "Khách đặt sát giờ", "Đơn vào mốc chưa kịp xếp", "Đổi giờ theo yêu cầu khách";
   - chọn "Khác" thì ghi chú ≥ 10 ký tự, che dãy số, không vào nhật ký (I18).
5. **Một dấu duy nhất trên chặng** (B-C6):
   - dùng năm cột đặt gấp sẵn có của `ord_transfer_leg`, cộng **một cột "loại dấu"** (Đặt gấp / Ngoại lệ 6 giờ) và người làm;
   - lệnh xếp kèm ngoại lệ ghi dấu chặng **trong cùng lô**, câu ghi do `orders` cấp (Hiến chương 5.3);
   - **luật miễn mốc theo loại dấu** (phiếu kiểm bản 2, M3). Hôm nay dấu đặt gấp miễn mốc cho cả XEP và DOI_DEN (`moc-toi-thieu.ts:67`). Sau ADR này:
     - dấu "Đặt gấp" (Quản trị duyệt): giữ như hôm nay, miễn cho XEP và DOI_DEN;
     - dấu "Ngoại lệ 6 giờ": **chỉ miễn cho XEP**. DOI_DEN của chặng mang dấu này vẫn cần `trip.override`, đúng đ3;
   - **không** thêm cột vào `vc_trip`, không đổi `trip.override`;
   - hôm nay đã có **hai** lối ghi năm cột đặt gấp: nhánh `datGap` của lệnh sửa chặng và route đặt gấp (`orders/index.ts:887`; `0040:3-4`). Lệnh gỡ (đ8) là lối **thứ ba**, lệnh xếp kèm ngoại lệ là lối **thứ tư**. Cả hai phải ghi vào I16 và chú thích migration 0040.
6. **Nhãn "Ngoại lệ 6 giờ"** (lời chủ; B-C4, B-C10; Q-B8):
   - **Một ký hiệu riêng, khác nhãn "Đặt gấp"**: màu cảnh báo riêng, có biểu tượng. Mẫu cụ thể chủ chốt trên Claude Design.
   - **Hiện ở:** thẻ danh sách đơn, trang đơn, bảng điều phối và lịch chung, chi tiết chuyến của văn phòng, Trang chủ của Quản trị.
   - Ghi thêm **"tự duyệt"** khi người phá lệ cũng là người lập hoặc phụ trách đơn.
   - **Ai thấy gì:**
     - người có ô xem đủ (`order.leg.short_notice.view`: Bán hàng, Kế toán, Quản trị, Toàn quyền) bấm vào nhãn thấy ai, lúc nào, lý do;
     - **HDV, Đối tác, Thực tập** thấy **loại dấu**, không thấy người làm hay lý do. Câu "Quản trị đã duyệt" (`dat-gap.ts:95, :107`) chỉ dùng cho loại "Đặt gấp";
     - **không** hiện cho tài xế và **không** in lên ảnh gửi khách.
   - **Bộ lọc** theo loại dấu và theo người, trên danh sách đơn và bảng điều phối.
   - **Ô đếm** "Ngoại lệ 6 giờ trong 7 ngày: N — theo người" trên Trang chủ của Quản trị.
7. **Tin báo** (Q-B4): hộp thông báo, ngăn "Của tôi" của **Quản trị**; Toàn quyền thấy ở "Tất cả" (Q-B9). **Không đẩy thông báo ra điện thoại.** Chi tiết có mã đơn, giờ đón, lý do; không có tên, SĐT khách.
   - ADR-0034 điều 4 định nghĩa "Của tôi" theo **quan hệ với đơn**. Đưa tin vào "Của tôi" của Quản trị (không liên quan đơn) là **sửa điều 4**; xem bảng "Thay câu nào" (phiếu kiểm bản 2, M4).
8. **Gỡ dấu** (B-C7):
   - chỉ gỡ dấu trên chặng, khi chặng **chưa có suất mở trên xe nào**;
   - gỡ không đưa đơn về nháp: sau khi gỡ, xác nhận, sửa và xếp dưới mốc lại bị chặn như thường;
   - Bán hàng chỉ gỡ ngoại lệ **của chính mình**; Quản trị và Toàn quyền gỡ được cả hai loại;
   - nhật ký giữ dòng cũ, lịch sử vẫn còn nhãn.
   
   Lỗ "đặt gấp nhầm không gỡ được" đóng luôn.
9. **Giờ áp dụng** (Q-B3): **mọi giờ**, kèm đ2 và ô đếm ở đ6. Sau 2–4 tuần xem lại: phần lớn ngoại lệ rơi vào giờ hành chính, hoặc có sự cố, thì chuyển sang chỉ ngoài giờ.
10. **Chữ phải đổi theo** (B-C9):
    - câu báo máy chủ: `orders/index.ts:79` (CANNOT_SHORT_NOTICE), `:84` (SUA_DUOI_MOC), câu 409 lúc xác nhận; `van-chuyen/dieu-phoi-route.ts:28` (CAN_PHA_LE, "Ai xử lý: Quản trị");
    - giao diện: `web/dat-gap-ui.ts` (dòng phụ 7a/7b, nút "Đặt gấp"), `web/trip-sheet.ts`, `web/order-form.ts:599`, lịch chung (`van-chuyen/index.ts:805` truyền `can(order.leg.short_notice)`);
    - Trợ lý Mai: tên ô quyền (`tro-ly-cau-truc-ten.ts:73-74, :169`), hướng dẫn theo vai;
    - ADR-0062: hàm đọc đuôi nhật ký phải biết đuôi mới, kèm bài khứ hồi.
11. Nếu ADR-0063 (đổi giờ tối đa 2 lần mỗi đơn) được duyệt, ngoại lệ "Đổi giờ theo yêu cầu khách" vẫn tính vào số lượt (B-C14).

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0049 `:365` (phương án bị loại) | "Bán hàng tự phá lệ mốc 6 giờ: chủ chọn chỉ Quản trị, Toàn quyền (ĐP3)" | Chủ đảo ngược ngày 2026-10-02 (câu 5), có điều kiện ở ADR-0091 |
| ADR-0049 `:30` (tóm tắt), `:161-162` (dòng Đặt, Xếp), `:201` (ô quyền), `:266` (câu thay ADR-0047 A1 "chỉ Quản trị, Toàn quyền sửa") | chỉ Quản trị, Toàn quyền | + Bán hàng theo đ1–3 |
| ADR-0052 `:29`, `:246` ("Bán hàng gọi phá lệ → 403" khi thêm điểm xe đang chạy) | 403 | mở cho cổng (d) |
| ADR-0034 điều 1 (`:21`, hành động nguồn của hộp thông báo) | — | + hành động "ngoại lệ 6 giờ" |
| ADR-0034 điều 4 (`:24`, "Của tôi" theo quan hệ với đơn) | — | + Quản trị nhận tin "ngoại lệ 6 giờ" ở "Của tôi" dù không liên quan đơn (đ7) |
| Luật miễn mốc "xếp chính chặng đã đặt gấp thì qua" (`moc-toi-thieu.ts:67`, ĐP2(ii)) | dấu miễn XEP và DOI_DEN | dấu "Ngoại lệ 6 giờ" chỉ miễn XEP (đ5) |
| ADR-0050 `:260` (`lichChungChang` mang cờ đặt gấp) | cờ | cờ + loại dấu |
| I16 (kế hoạch ADR-0049) + chú thích migration 0040 | (hôm nay thực tế đã có hai lối ghi) | + lệnh gỡ (lối thứ ba), lệnh xếp kèm ngoại lệ (lối thứ tư) |

### Câu hỏi mở
- **Q-B3 — giờ.**
  - **Khuyến nghị:** mọi giờ (đ9).
  - Phương án khác: chỉ ngoài giờ hành chính. Cái giá: thêm cài đặt "giờ trực"; ban ngày Quản trị vắng thì lại kẹt.
- **Q-B4 — báo Quản trị.**
  - **Khuyến nghị:** chỉ hộp thông báo, không đẩy thông báo ra điện thoại.
  - Lý do: ngoại lệ sinh ra để **không phải đánh thức** Quản trị, và việc đã làm xong.
- **Q-B5 — ai không được phá lệ.**
  - **Khuyến nghị:** Đối tác, HDV, Thực tập, Kế toán đều không.
  - Lý do: HDV không xếp xe; Đối tác là bên ngoài (khoảng 1.000 tài khoản) và đã tự xác nhận được đơn.
- **Q-B7 — lệnh nào được mở.** **Khuyến nghị:** như đ3.
- **Q-B8 — Đối tác có thấy nhãn trên đơn mình không.**
  - **Khuyến nghị:** thấy **loại** dấu, như hôm nay với "Đặt gấp".
- **Q-B9 — Toàn quyền nhận tin ở đâu.**
  - **Khuyến nghị:** ngăn "Tất cả", vì Toàn quyền là vai kỹ thuật và ngoại lệ là việc kinh doanh.

---

## Trang ghép lượt 3 (CLAUDE.md §9)

### 1. Bảng nào chứa loại thực thể nào
| Bảng | Thực thể | ADR chạm |
|---|---|---|
| `staff` | mọi tài khoản (nội bộ, đối tác, tài xế đối tác; chung một bảng) | 0093: hai cột `pin_tam`, `pin_tam_het_han_luc` (migration thêm cột); đ6 đánh dấu tài khoản nội bộ cũ |
| `aut_session` (0065) | sổ phiên | 0093 đ4 **chỉ đọc** (màn "từ lần đặt lại tới nay"); không đổi |
| `audit_log` | nhật ký; hộp thông báo đọc từ đây (không có bảng `thongbao`) | 0093 đ4, 0091 đ7: thêm loại hành động |
| `ord_transfer_leg` | chặng đưa đón; năm cột đặt gấp (0040) | 0091 đ5: thêm cột loại dấu, người làm; lệnh gỡ |
| `vc_reason` | danh sách lý do (nhóm `PHA_LE`) | 0091 đ4: gộp danh sách, thêm mã |

### 2. Dòng bản đồ quyền chạm các bảng trên
| Ô | Hôm nay | Sau lượt 3 |
|---|---|---|
| (mọi ô) | — | **phiên PIN tạm: router chặn mọi ô** trừ ba đường ở 0093 đ3 |
| `account.access.manage` (ADMIN, SUPER_ADMIN) | đặt lại PIN | đặt lại sinh PIN tạm (lượt 1 đã chặn tài khoản quyền tiền) |
| `account.create` (HR, SUPER_ADMIN) | tạo | sinh PIN tạm 7 ngày |
| `order.leg.short_notice` (ADMIN, SUPER_ADMIN) | đặt gấp | + gỡ (0091 đ8) |
| **`order.leg.short_notice.exception` (mới)** | — | SALES `any`, SUPER_ADMIN `any` |
| `order.leg.short_notice.view` (SALES, ACCOUNTING, ADMIN, SUPER_ADMIN) | xem đủ dấu | không đổi ô. HDV, Đối tác, Thực tập thấy loại dấu qua cờ hẹp, **không** mở ô `.view` cho HDV (giữ lời chủ H4/N-14, `permissions.test.ts:406`) |
| `trip.override`, `trip.dispatch` | — | không đổi |

### 3. Cổng nào canh cửa nào (kể cả giao diện đổi nghĩa)
| Cửa | Hôm nay | Sau lượt 3 |
|---|---|---|
| Mọi route khi phiên PIN tạm | không có | router: 403 `pin_tam_phai_doi` |
| Bật Face ID, đặt PIN bằng Face ID | đòi PIN hiện tại | chặn khi PIN tạm (bài đỏ trước) |
| Đặt gấp chặng | `can(order.leg.short_notice)`, **không** kiểm chặng có dưới mốc | + nhánh ngoại lệ: `can(…exception)` **và** chặng đang dưới mốc lúc gửi |
| Xếp xe trong mốc (lệnh XEP) | `kiemMocXep` → cần `trip.override` | Bán hàng có ô ngoại lệ phá được **riêng XEP**; lý do giữ khác vẫn cần `trip.override` |
| Thêm điểm khi xe đang chạy | Bán hàng 403 | mở theo cổng (d) |
| **Giao diện `web/dat-gap-ui.ts`** (dòng phụ "Xếp xe gấp cần Quản trị duyệt", nút "Đặt gấp" hiện theo ô) | Bán hàng chỉ thấy dòng "cần Quản trị" | **đổi nghĩa:** Bán hàng thấy nút "Ngoại lệ 6 giờ" (khung khác, lý do bắt buộc) **chỉ khi** chặng hoặc chuyến đang dưới mốc |
| **Nhãn** (`khoiNhanDatGap`; `dat-gap.ts` `datGapTheoVai`, `lichSuTheoVai`) | "Đặt gấp — Quản trị đã duyệt" cho mọi người | hai loại nhãn; câu "Quản trị đã duyệt" chỉ cho loại Đặt gấp |
| **Vỏ trang, đăng nhập** (`web/shell.ts`, `login`) | — | phiên PIN tạm chuyển thẳng màn đổi PIN |
| **Màn Quản lý tài khoản** | hiện PIN mới | ghi "PIN tạm — hết hạn sau 24 giờ / 7 ngày"; cột trạng thái đổi PIN |

### 4. Va chạm
- 0093 và 0091 không chạm cùng bảng hay cùng ô.
- **Với lượt 1:** 0093 dùng định nghĩa "quyền tiền" của ADR-0090 đ0 (tin cho Toàn quyền); không đổi luật của 0090.
- **Với lộ trình Vận chuyển:** 0091 chạm `dat-gap-ui`, `dieu-phoi-route`, lịch chung, mà đợt 1 vừa sửa trên `main`. Lập kế hoạch trên `main`.

### Loại cửa
- 0093: thêm cột vào `staff`, một chiều nhẹ.
- 0091: thêm cột vào `ord_transfer_leg` và mã lý do, một chiều nhẹ.
- **Việc lớn** (quyền, dữ liệu): người kiểm độc lập. Thêm dòng `docs/SO-HANG-RAO.md` cho cổng PIN tạm ở router và cổng "ngoại lệ chỉ khi đang dưới mốc", mỗi cổng có quan sát chặn thật.
