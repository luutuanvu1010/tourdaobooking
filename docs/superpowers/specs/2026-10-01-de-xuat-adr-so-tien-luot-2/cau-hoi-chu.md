# Câu hỏi cho chủ — Sổ tiền lượt 2 (đại lý, nhà cung cấp, quyết toán tháng)

> Gom **một lần**. Chỉ hỏi điều **chưa có lời chủ**. Điều đã chốt ghi ở mục cuối, không hỏi lại. Mỗi câu: phương án **khuyến nghị đứng đầu**. Chủ trả lời lúc duyệt các ADR nháp (`README.md`), AI không tự chọn (tiền + dữ liệu — CLAUDE.md §3).

---

## C1 — Sổ ghi đơn của đại lý theo kiểu nào? *(ADR-00xx-C điều 2 — nên hỏi thêm Kế toán)*

Ví dụ của bạn: tour 5.000.000, đại lý giảm cho khách 250.000, đại lý giữ cọc 3.000.000, HDV thu 1.750.000, hoa hồng 10%. Cả hai cách đều ra **đại lý còn trả 2.750.000** — chỉ khác cách Kế toán đọc sổ.

- **A (khuyến nghị) — Ghi gọn:** "đại lý đang giữ 3.000.000", "công ty nợ đại lý hoa hồng 500.000", "đại lý chịu giảm giá 250.000". Khớp đúng câu bạn chọn hôm 1/10 ("bù trừ hoa hồng với tiền đại lý đang giữ") và các ca mẫu đã soạn.
- **B — Ghi theo kiểu mua bán:** "đại lý mua vé của công ty 4.500.000", "công ty thu hộ đại lý 4.750.000", "đại lý đang giữ 3.000.000". Khớp cách nói ban đầu ("mua vé của đại lý", "HDV thu hộ đại lý") và con số 4.500.000 sẽ in hoá đơn VAT sau này; sổ nhiều dòng hơn.

## C2 — Một dịch vụ chưa có mức hoa hồng (hoặc chưa rõ ai bán) thì sao? *(ADR-00xx-A điều 8; ADR-00xx-B điều 5)*

- **A (khuyến nghị) — Vẫn xác nhận được, giữ ở bước "Đã giao":** đơn hiện "Thiếu mức hoa hồng — Kế toán xử lý"; Kế toán cài mức (hoặc ghi mức tay cho đúng dòng đó, có lý do) thì HDV bấm "Đã giao" được. Không làm chậm việc với khách; không bao giờ tự lấy 0.
- **B — Chặn ngay lúc Xác nhận:** chưa có mức thì không xác nhận được. Phát hiện sớm hơn, nhưng đơn của đại lý mới có thể kẹt lúc khách đang chờ.
- **C — Tự coi là 0% và cảnh báo** (cách đặc tả cũ 24/9). Nhanh, nhưng trái nguyên tắc "không lấy 0 cho tiện" bạn đã duyệt trong Hiến chương — **không khuyến nghị**.

## C3 — Cộng tác viên có hưởng hoa hồng như đại lý không? *(ADR-00xx-A điều 2)*

Hôm 25/9 bạn kể "đại lý" là HDV độc lập, tài xế taxi, công ty lữ hành, lễ tân; câu gốc của bạn có nhắc cả cộng tác viên, nhưng chưa nói rõ.

- **A (khuyến nghị) — Có:** cùng cách tính, mức riêng cho nhóm "Cộng tác viên" hoặc từng người.
- **B — Không:** đơn do cộng tác viên đặt tính như khách lẻ (không hoa hồng).

## C4 — Đơn **của đại lý** đã xác nhận **trước** ngày bản mới lên mà chưa "Đã giao" thì lấy mức hoa hồng nào? *(ADR-00xx-C điều 7b2)*

Đơn **khách lẻ** đã xác nhận: app tự ghi "Tour Đảo bán, không hoa hồng" lúc lên bản — không đơn khách lẻ nào bị giữ thêm. Câu này chỉ về **đơn của đại lý** (hôm nay đang bị chặn "Đã giao") và đơn có **dịch vụ nhập tay**: chúng chưa được "chụp" mức nên sẽ bị giữ ở "Đã giao" tới khi xử lý.

- **A (khuyến nghị) — Kế toán bấm "chụp bù" theo mức đang hiệu lực ở ngày xác nhận của đơn:** Kế toán nhập bảng mức (ngày hiệu lực lùi về trước nếu cần), rồi bấm "chụp bù" cho cả danh sách hoặc từng đơn; có nhật ký. Đúng nguyên tắc "chụp tại ngày xác nhận".
- **B — Tự chụp theo bảng hôm nay ngay khi bản mới lên.** Không phải bấm, nhưng đơn cũ có thể nhận mức mới hơn thoả thuận lúc đặt.
- **C — Kế toán ghi tay từng dòng.** Chính xác từng đơn, tốn công nếu nhiều đơn.

## C5 — Ai được nhập/sửa **giá mua của nhà cung cấp** (ai bán, % Tour Đảo mua lại — vd i-resort 80%)? *(ADR-00xx-B)*

Bảng **hoa hồng** đã chốt: Kế toán, Quản trị, Toàn quyền. Bảng **nhà cung cấp** chưa có lời bạn.

- **A (khuyến nghị) — Kế toán, Quản trị, Toàn quyền** (giống bảng hoa hồng và giống bảng giá thuê xe bạn chọn hôm 30/9).
- **B — Chỉ Kế toán và Toàn quyền** (Quản trị không thấy, không sửa % mua vào).

## C6 — HDV tại cảng ghi được "khách đã trả cho đại lý" / "khách trả tại quầy i-resort" không? *(ADR-00xx-B điều 8)*

Luật hiện nay: chỉ Kế toán được ghi người khác là người cầm tiền. Nếu giữ nguyên, đơn có phần khách trả cho đại lý hoặc tại quầy nhà cung cấp **không bấm "Đã giao" được** cho tới khi Kế toán vào ghi.

- **A (khuyến nghị) — Cho ghi, có cờ "chờ Kế toán đối chiếu":** HDV (hoặc văn phòng) ghi được, nhưng chỉ cho **đúng đại lý của đơn** hoặc **đúng nhà cung cấp của dịch vụ trên đơn**, không quá phần tiền của họ. Kế toán đối chiếu cuối tháng; sai thì đảo.
- **B — Giữ như cũ, chỉ Kế toán ghi.** Chặt hơn; HDV phải chờ Kế toán mới "Đã giao" được.
- **C — Không ghi tiền tại quầy nhà cung cấp; coi phần đó nằm ngoài số HDV phải thu.** Đơn giản hơn cho HDV, nhưng sổ không biết nhà cung cấp đã thu bao nhiêu (đổi một quyết định đã duyệt).

## C7 — Gộp "nợ nhà xe thuê" vào đợt này không? *(ADR-0057 câu Q11, Q12 — bạn hẹn "lúc trình sổ công nợ")*

- **A (khuyến nghị) — Tách, làm đợt sau:** đợt này chỉ khoá tháng cho cả chi phí xe thuê (đã hứa). Q11 (trả dư cho nhà xe) và Q12 (ghi nợ nhà xe lúc xe chạy xong hay lúc Kế toán chốt) hỏi khi soạn đợt nhà xe. Đợt đại lý lên sớm hơn.
- **B — Gộp:** một đợt có cả đại lý lẫn nhà xe; trả lời Q11, Q12 ngay bây giờ; đợt dài hơn.

## C8 — Trần giảm giá trên đơn của đại lý có áp cho **nhân viên** sửa đơn đó không? *(ADR-00xx-C điều 9; ADR-0029 để câu này cho "ADR lúc có bảng chiết khấu")*

Giảm giá trên đơn đại lý **do đại lý chịu**. Hôm nay trần chỉ áp khi người gõ là tài khoản Đối tác.

- **A (khuyến nghị) — Áp cho mọi người:** trên đơn có đại lý, ai sửa cũng chỉ giảm tối đa bằng hoa hồng của đại lý trên đơn đó. Không ai làm đại lý chịu quá hoa hồng của họ. Đơn khách lẻ không đổi.
- **B — Giữ như hôm nay:** chỉ tài khoản Đối tác bị trần; nhân viên giảm tự do — phần nhân viên giảm vẫn tính vào đại lý chịu (có thể làm đại lý lỗ).

---

## Đã kiểm, không cần bạn trả lời

- **Có "xây trên lỗ an ninh đang mở" không?** — **Không.** Sổ phát hiện an ninh đang trống (`docs/quyen-hoan.json` mục `phat_hien` = rỗng, kiểm 1/10 trên `main` @`0c4309cd`); không ô quyền nào của đợt này đang hoãn.

## Đã chốt — áp dụng, không hỏi lại

| Điều | Nơi đã chốt |
|---|---|
| Ai nhập/sửa **bảng hoa hồng**: Kế toán, Quản trị, Toàn quyền; sửa mức một dòng trên một đơn có lý do | ADR-0018 + đặc tả mô hình vai §11 |
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
