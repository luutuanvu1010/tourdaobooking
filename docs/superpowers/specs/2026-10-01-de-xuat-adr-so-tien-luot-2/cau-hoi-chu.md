# Câu hỏi cho chủ — Sổ tiền lượt 2 (đại lý, nhà cung cấp, quyết toán tháng)

> Gom **một lần**. Chỉ hỏi điều **chưa có lời chủ**; điều đã chốt ở mục cuối, không hỏi lại. Mỗi câu: phương án **khuyến nghị đứng đầu**. Chủ trả lời lúc duyệt lượt chứa câu đó (`README.md`); AI không tự chọn (tiền + dữ liệu — CLAUDE.md §3). Sửa vòng 1 theo người kiểm độc lập (2026-10-01).

| Lượt | Câu |
|---|---|
| 2a (ADR-A) | C2, C3, C4, C9, C13 |
| 2b (ADR-B) | C5, C6 |
| 2c (ADR-C) | C1, C8, C10, C11 |
| 2d (ADR-D + E) | C7, C12 |

## Lời chủ (2026-10-01)

> *"cả 13 theo khuyến nghị"* — chủ trả lời sau khi đọc bản giải nghĩa lời thường từng câu (có nhắc riêng C1: B khớp lời 25/9 + số VAT; C6: HDV có thể thấy "đang nợ" tới khi Kế toán đối chiếu).

**C1–C13 = A.** Các ADR nháp đã viết theo phương án A ⇒ không đổi nội dung. Câu trả lời **chưa** là duyệt ADR: mỗi lượt 2a → 2d vẫn trình chủ duyệt riêng (≤ 3 quyết định mỗi lượt, `CLAUDE.md` §9). C12 = A là lời duyệt nới đúng ba điểm ở `de-xuat-luat.md` mục 1–3 (Điều 9.4), có hiệu lực khi ADR-D được duyệt.

---

## C1 — Sổ ghi đơn của đại lý theo kiểu nào? *(ADR-00xx-C điều 2 — nên hỏi thêm Kế toán)*

Ví dụ của bạn: tour 5.000.000, đại lý giảm cho khách 250.000, đại lý giữ cọc 3.000.000, HDV thu 1.750.000, hoa hồng 10%. **Cả hai cách đều ra "đại lý còn trả 2.750.000"** và đều bù trừ được hoa hồng với tiền đại lý giữ — chỉ khác cách Kế toán đọc sổ.

- **A (khuyến nghị) — Ghi gọn:** "đại lý đang giữ 3.000.000", "công ty nợ đại lý hoa hồng 500.000", "đại lý chịu giảm giá 250.000". Ít dòng, khớp các ca mẫu đã soạn. **Lưu ý:** cách này **viết lại danh sách loại dòng** bạn đã duyệt ở ADR-0026 (ở đó ghi sẵn "mua giá đại lý", "thu hộ").
- **B — Ghi theo kiểu mua bán:** "đại lý mua vé của công ty 4.500.000", "công ty thu hộ đại lý 4.750.000", "đại lý đang giữ 3.000.000". **Khớp đúng lời bạn nói hôm 25/9** ("mua vé của đại lý", "HDV thu tiền hộ đại lý") và danh sách đã duyệt; con số 4.500.000 là số in hoá đơn VAT sau này. Sổ nhiều dòng hơn.

## C2 — Một dịch vụ chưa có mức hoa hồng (hoặc chưa rõ ai bán) thì sao? *(ADR-00xx-A điều 8)*

- **A (khuyến nghị) — Vẫn xác nhận được, giữ ở bước "Đã giao":** đơn hiện "Thiếu mức hoa hồng — Kế toán xử lý"; Kế toán cài mức (hoặc ghi mức tay cho đúng dòng đó, có lý do) thì HDV bấm "Đã giao" được. Không làm chậm việc với khách; không bao giờ tự lấy 0.
- **B — Chặn ngay lúc Xác nhận.** Phát hiện sớm hơn, nhưng đơn đại lý mới có thể kẹt lúc khách đang chờ.
- **C — Tự coi là 0% và cảnh báo** (cách đặc tả cũ 24/9). Trái nguyên tắc "không lấy 0 cho tiện" bạn đã duyệt trong Hiến chương — **không khuyến nghị**.

## C3 — Cộng tác viên có hưởng hoa hồng như đại lý không? *(ADR-00xx-A điều 2)*

Hôm 25/9 bạn kể "đại lý" là HDV độc lập, tài xế taxi, công ty lữ hành, lễ tân; câu gốc có nhắc cộng tác viên nhưng chưa rõ.

- **A (khuyến nghị) — Có:** cùng cách tính, mức riêng cho "Cộng tác viên" hoặc từng người.
- **B — Không:** đơn do cộng tác viên đặt tính như khách lẻ.

## C4 — Đơn **của đại lý** đã xác nhận **trước** ngày bản mới lên mà chưa "Đã giao": lấy mức hoa hồng nào? *(ADR-00xx-C điều 7b2)*

Đơn **khách lẻ** đã xác nhận: app tự ghi "Tour Đảo bán, không hoa hồng" lúc lên bản — không đơn khách lẻ nào bị giữ thêm. Câu này chỉ về đơn đại lý (hôm nay đang bị chặn "Đã giao") và đơn có dịch vụ nhập tay.

- **A (khuyến nghị) — Kế toán bấm "chụp bù" theo mức đang hiệu lực ở ngày xác nhận của đơn:** Kế toán nhập bảng mức (ngày hiệu lực lùi về trước nếu cần), rồi bấm cho cả danh sách hoặc từng đơn; có nhật ký.
- **B — Tự chụp theo bảng hôm nay ngay khi bản lên.** Không phải bấm, nhưng đơn cũ có thể nhận mức khác thoả thuận lúc đặt.
- **C — Kế toán ghi tay từng dòng.** Chính xác, tốn công nếu nhiều đơn.

## C5 — Ai được nhập/sửa **giá mua của nhà cung cấp** (ai bán, % Tour Đảo mua lại — vd i-resort 80%)? *(ADR-00xx-B)*

Bảng **hoa hồng** đã chốt: Kế toán, Quản trị, Toàn quyền. Bảng **nhà cung cấp** chưa có lời bạn.

- **A (khuyến nghị) — Kế toán, Quản trị, Toàn quyền** (giống bảng hoa hồng và giống bảng giá thuê xe bạn chọn ở phần Vận chuyển).
- **B — Chỉ Kế toán và Toàn quyền** (Quản trị không thấy, không sửa % mua vào).

## C6 — HDV tại cảng khai "khách đã trả cho đại lý" / "khách trả tại quầy i-resort" thì sổ ghi thế nào? *(ADR-00xx-B điều 8)*

Luật hiện nay: chỉ Kế toán được ghi người khác là người cầm tiền. Nếu giữ nguyên, đơn có phần khách trả cho đại lý hoặc tại quầy **không bấm "Đã giao" được** tới khi Kế toán vào ghi.

- **A (khuyến nghị) — Cho khai; số tiền tạm tính là HDV đang giữ, tới khi Kế toán xác nhận với đại lý / nhà cung cấp.** Giống hệt cách bạn đã chọn cho "Công ty thu – chuyển khoản" do HDV khai (25/9). HDV bấm "Đã giao" được ngay; HDV khai sai thì chính HDV mang nợ, không đẩy được nợ sang người khác.
- **B — Cho khai, ghi nợ ngay cho đại lý / nhà cung cấp, kèm cờ "chờ đối chiếu".** Nhanh, HDV không mang nợ treo; nhưng **HDV khai sai "khách đã trả đại lý" vẫn qua được bước "Đã giao"** và nợ treo ở người khác cho tới khi Kế toán phát hiện.
- **C — Giữ như cũ, chỉ Kế toán ghi.** Chặt nhất; HDV phải chờ Kế toán.

## C7 — Gộp "nợ nhà xe thuê" vào đợt này không? *(ADR-0057 câu Q11, Q12 — bạn hẹn "lúc trình sổ công nợ")*

- **A (khuyến nghị) — Tách, làm đợt sau:** đợt này chỉ khoá tháng cho cả chi phí xe thuê (đã hứa). Q11 (trả dư cho nhà xe), Q12 (ghi nợ nhà xe lúc xe chạy xong hay lúc Kế toán chốt) hỏi khi soạn đợt nhà xe. Đợt đại lý lên sớm hơn.
- **B — Gộp:** trả lời Q11, Q12 ngay; đợt dài hơn.

## C8 — Giảm giá trên đơn của đại lý: ai chịu, và ai bị giới hạn? *(ADR-00xx-C điều 9)*

Bạn đã nói: giảm giá cho khách của đối tác **do đối tác chịu**, đối tác giảm tối đa bằng mức chiết khấu của họ. Chưa nói: **nhân viên Tour Đảo** nhập giảm giá trên đơn đại lý thì ai chịu.

- **A (khuyến nghị) — Mọi giảm giá trên đơn đại lý là của đại lý (đại lý chịu), trần áp cho mọi người:** nhân viên chỉ nhập thay theo lời đại lý, tối đa bằng hoa hồng của đại lý trên đơn đó. Tour Đảo muốn tặng thêm thì chưa có đường ở đợt này (ý "trần giảm giá cho nhân viên" của Giám đốc đã vào sổ tồn đọng).
- **B — Tách hai loại giảm giá:** "đại lý giảm" (đại lý chịu, có trần) và "Tour Đảo giảm" (Tour Đảo chịu, không trần đại lý). Đúng hơn với thực tế, nhưng thêm một ô trên đơn (đổi dữ liệu, form, biên nhận).
- **C — Giữ như hôm nay:** chỉ tài khoản Đối tác bị trần; nhân viên giảm tự do — và phần đó vẫn tính là đại lý chịu (đại lý có thể bị lỗ mà không biết).

## C9 — Đại lý có được thấy **mức % hoa hồng của chính mình** trên app không? *(ADR-00xx-A điều 11, ADR-00xx-E điều 4)*

Ngày 24/9 bạn nói "đối tác thấy chiết khấu của mình"; ngày 1/10 bạn nói "không thấy tỷ lệ nội bộ". Lưu ý: đại lý thấy giá bán lẻ và số tiền hoa hồng nên **tự tính ra được** mức % — ẩn chỉ là bớt hiển thị.

- **A (khuyến nghị) — Ẩn mức %, chỉ hiện số tiền hoa hồng.** Đúng chữ câu 1/10; đổi lại được sau.
- **B — Hiện mức % của chính họ** (không bao giờ mức của người khác hay % mua của nhà cung cấp). Minh bạch hơn khi đại lý đối chiếu với hợp đồng.

## C10 — Chấp nhận một chỗ "chỉ máy chủ kiểm, cơ sở dữ liệu không kiểm hết" cho số tiền hoa hồng / giá vốn? *(ADR-00xx-C điều 6, lệch có tên L-C1)*

Hiến chương bạn duyệt đòi luật tiền có **hai lớp** (máy chủ + cơ sở dữ liệu). Riêng "hoa hồng đúng tỷ lệ của từng dòng" thì cơ sở dữ liệu không tự tính lại được mà không tạo **cách tính thứ hai** (Hiến chương cấm).

- **A (khuyến nghị) — Cơ sở dữ liệu kiểm một phần, phần còn lại có hạn xét lại:** cơ sở dữ liệu chặn được: mỗi dịch vụ tối đa một dòng hoa hồng / một dòng giá vốn; đúng chiều nợ; tổng hoa hồng + giá vốn không vượt giá bán; giảm giá đại lý chịu đúng bằng số giảm trên đơn. Phần "đúng tỷ lệ từng dòng" do máy chủ + ca mẫu Kế toán xác nhận + kiểm định kỳ; xét lại khi số tiền từng dòng được lưu thành cột, muộn nhất ở đợt "nợ nhà xe".
- **B — Chỉ máy chủ kiểm, không hạn** (bản nháp đầu). Ít việc hơn, chỗ hở lớn hơn, không có ngày xét lại.
- **C — Lưu luôn số tiền hoa hồng từng dòng vào đơn lúc xác nhận** để cơ sở dữ liệu kiểm đủ. Phải xử lý lại mỗi lần HDV sửa số khách sau xác nhận — phức tạp hơn nhiều.

## C11 — Trần giảm giá của đại lý vẫn chỉ kiểm ở máy chủ: gia hạn ngoại lệ cũ? *(ADR-00xx-C điều 9; ADR-0029)*

Ngày 26/9 bạn đồng ý tạm để luật giá đối tác chỉ ở máy chủ, "xem lại khi có bảng chiết khấu". Nay có bảng, nhưng trần (= tổng hoa hồng) vẫn cần máy chủ tính.

- **A (khuyến nghị) — Gia hạn có điều kiện:** giữ ở máy chủ; thêm kiểm định kỳ báo **lỗi** (không chỉ cảnh báo) với đơn xác nhận sau ngày lên bản mà giảm giá vượt hoa hồng; xét lại cùng lúc với C10.
- **B — Thêm lớp cơ sở dữ liệu gần đúng ngay** (chỉ đúng với mức %): tạo cách tính thứ hai — không khuyến nghị.

## C12 — Cho phép nới ba "hàng rào kiến trúc" để có khoá sổ tháng dùng chung? *(ADR-00xx-D; chi tiết kỹ thuật ở `de-xuat-luat.md`)*

Để khoá tháng áp được cho **cả** sổ công nợ **lẫn** chi phí xe thuê (đã hứa ở phần Vận chuyển) mà không ép trước câu Q12 về nhà xe, AI đề xuất một phần nhỏ riêng chỉ giữ "tháng nào đã khoá". Việc này phải nới ba luật kiểm tự động bạn đã duyệt: thêm một phần mới vào sơ đồ (và cho sổ tiền, phần Vận chuyển đọc nó); thêm hai tiền tố tên; cho trigger của Vận chuyển đọc thêm một danh sách.

- **A (khuyến nghị) — Đồng ý nới ba điểm đó** (chỉ đúng ba điểm, không nới gì khác; mỗi điểm phải thấy chặn thật một lần sau khi thi công).
- **B — Không nới; đặt khoá tháng trong sổ tiền.** Ít phần hơn, nhưng phần Vận chuyển phải đọc sổ tiền ⇒ coi như trả lời trước Q12 = "nhà xe ghi nợ theo sổ tiền".
- **C — Không nới; chỉ khoá sổ tiền, chưa khoá chi phí xe thuê.** Lỡ hạn bạn đã duyệt cho phần Vận chuyển (phải có ADR gia hạn).

## C13 — Đơn do đại lý tự lập: app tự ghi "bên đặt = đại lý"? Còn đơn cũ thì sao? *(ADR-00xx-A điều 3)*

Hôm nay app **chưa** gắn được công ty lữ hành làm "bên đặt", và đơn đại lý tự lập ghi "người đặt" là khách. Muốn tính hoa hồng thì bên đặt phải là chính đại lý. Đây là **đổi cách lập đơn**.

- **A (khuyến nghị) — Đơn mới: tự ghi bên đặt = đại lý; nhân viên lập hộ chọn được công ty lữ hành làm bên đặt. Đơn cũ chưa "Đã giao": app liệt kê cho Văn phòng / Kế toán chuyển bên đặt sang đại lý từng đơn** (không tự đổi hàng loạt). Khách đi tour vẫn ghi là "khách của đại lý". Đúng người, không sửa nhầm đơn cũ; đổi lại phải xử lý tay một danh sách đơn cũ.
- **B — Như A, nhưng đơn cũ do tài khoản đại lý lập được tự chuyển bên đặt sang đại lý lúc lên bản.** Nhanh, nhưng có thể sai với đơn đại lý lập hộ người quen (không hưởng hoa hồng).
- **C — Không đổi cách lập đơn; Văn phòng tự chọn bên đặt đúng mỗi lần.** Ít đổi app nhất, dễ quên ⇒ đơn đại lý bị tính như khách lẻ (mất hoa hồng) mà không ai thấy.

---

## Đã kiểm, không cần bạn trả lời

- **Có "xây trên lỗ an ninh đang mở" không?** — **Không.** Sổ phát hiện an ninh đang trống (`docs/quyen-hoan.json` mục `phat_hien` = rỗng, kiểm 1/10 trên `main` @`0c4309cd`); không ô quyền nào của đợt này đang hoãn.

## Đã chốt — áp dụng, không hỏi lại

| Điều | Nơi đã chốt |
|---|---|
| Ai nhập/sửa **bảng hoa hồng**: Kế toán, Quản trị, Toàn quyền (`partner.commission.write`) | ADR-0018 + đặc tả mô hình vai §5, §11, LC-5 |
| Hoa hồng theo vai × loại dịch vụ, mức riêng từng đối tác, ô cụ thể nhất thắng, ngày hiệu lực; % **hoặc** số tiền mỗi khách | ADR-0018 điều 11; đặc tả Hoàn tất Q5; H9 |
| Chụp mức, người bán, giá vốn **lúc Xác nhận** | H5 (25/9) — ADR-00xx-A ghi câu thay ADR-0018 điều 11 |
| Đếm "mỗi khách": người lớn + trẻ em + người cao tuổi, không em bé | H7 |
| Giá vốn tính trên giá **trước giảm** | H8 = A |
| Người hưởng = bên đặt; HDV nội bộ không hưởng | H1; Q4 (25/9) |
| HDV nội bộ thu tiền tại cảng ⇒ HDV nợ công ty | ADR-0026 điều 4 |
| Ghi nợ từng đơn lúc "Đã giao", chốt tháng, bù trừ hoa hồng với tiền đại lý giữ, khoá sổ tháng | U3 (1/10) |
| Đối tác xem sổ của mình: số dư + từng đơn, không giá vốn / tỷ lệ nội bộ | U4 (1/10) |
| Khoá tháng có cùng bản với đợt này, áp cả chi phí xe thuê | ADR-0026 (5.14), ADR-0057 L-T1 |
| Đơn khách lẻ đã "Đã giao" ở lượt 1 có vé i-resort ⇒ Kế toán bổ sung giá vốn bằng phiếu điều chỉnh | ADR-0026 M1 = A |
| Dịch vụ đưa đón do Tour Đảo điều xe không có giá vốn % | ADR-0057 X3 (Q9 a) |
| "Hoàn thành" không chờ khoản công ty còn phải trả | H2' b |
| Tháng đã khoá không mở lại; sai thì điều chỉnh vào tháng đang mở | Hiến chương 5.14 |
| Phiếu Giám đốc "đại lý trả ngay từng đơn" | không trái U3 — vẫn trả từng đơn được; ghi ở trang ghép §4 |
| VAT, giá theo mùa, trần giảm giá nhân viên | sổ tồn đọng (`docs/BACKLOG.md` mục 10) |

**Không phải điều đã chốt (bản nháp đầu ghi nhầm):** ô riêng `order.terms.override` (sửa mức một dòng trên một đơn) — đặc tả chỉ có một ô `partner.commission.write`; ADR-00xx-A đề xuất tách, chủ duyệt cùng lượt 2a.
