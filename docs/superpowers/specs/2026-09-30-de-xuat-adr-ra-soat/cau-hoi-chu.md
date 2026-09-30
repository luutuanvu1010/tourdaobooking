# Câu hỏi cho chủ dự án — gom một lần (bản nháp ADR 0058, 0062–0065, 2026-09-30)

Tám câu (câu 3 có hai vế: 3 và 3b). Mỗi câu có phương án khuyến nghị đứng đầu. Trả lời "theo khuyến nghị" cho câu nào là đủ cho câu đó.

Các câu này **không** hỏi lại điều bạn đã chốt ngày 30/9 (ai được sửa số khách, ai được đổi giờ, tối đa 2 lần, ai nhận tin, số khách đi xe do Bán hàng nhập, HDV phụ trách thấy xe của đơn mình, sửa số khách làm ngay sau Sổ tiền…); chúng chỉ hỏi những chi tiết mà lời chốt chưa nói tới.

Số hiệu ADR mới: 0058 (nhóm dịch vụ), 0062 (báo tin khi đơn đổi), 0063 (sửa đơn sau xác nhận), 0064 (HDV thấy ghi chú đơn), 0065 (số khách đi xe). Số 0059–0061 đã dùng cho ba ADR bạn duyệt ở buổi khác (biển số xe trên đơn, dấu đã nhập phần mềm kế toán, mở lại dịch vụ nhập tay).

---

## Nhóm dịch vụ (ADR-0058)

**Câu 1. Gieo bao nhiêu nhóm, và ATV thuộc nhóm nào?**
Bảng giá trên Google Sheet hôm nay có **14 nhóm**, 110 dịch vụ (lời chọn ghi 15, nhưng danh sách cũng chỉ có 14 tên). Dịch vụ ATV (lái xe địa hình trong rừng) bị ghi nhầm mã của Tháp Bà.
- **(Khuyến nghị)** Gieo đúng 14 nhóm như Sheet; ATV vào **Kong Forest** (cùng khu với Zipline). Muốn thêm nhóm thứ 15 thì Quản trị tự thêm trong app sau khi phát hành.
- Khác: bạn cho biết tên nhóm thứ 15 và những dịch vụ thuộc nó.

**Câu 2. Hạn dọn phần cũ của mục Danh mục.**
Phần cũ của mục Danh mục trong app chưa được viết theo cách kiểm chặt hiện nay; phần nhóm dịch vụ mới thì viết theo cách chặt, để riêng. Cần một hạn để dọn nốt phần cũ.
- **(Khuyến nghị)** Hạn **31/3/2027** (trùng hạn một việc dọn dẹp khác đã có lịch).
- Khác: không đặt hạn, dọn khi có việc đụng tới.

## Báo tin và đổi giờ (ADR-0062, ADR-0063)

**Câu 3. "Giờ" gồm những gì?** *(Một câu trả lời dùng cho **cả hai** việc: đổi cái gì thì tiêu một trong 2 lần được đổi giờ, **và** đổi cái gì thì HDV + người lập nhận tin.)*
- **(Khuyến nghị) A:** mọi ngày, giờ trên đơn — ngày/giờ khởi hành, giờ đón, ngày/giờ check-in, ngày/giờ đón của chặng xe; **thêm một chặng đón mới** cũng tính. Đổi **nơi** (đón, trả, check-in) thì **không** tiêu lượt. (Riêng đổi **nơi đón** vẫn có tin, vì bạn đã chọn báo khi đổi nơi đón.)
- B: chỉ ngày/giờ **đón** (của dịch vụ và của chặng) + thêm chặng. Đổi giờ khởi hành, giờ check-in thì không tiêu lượt, không có tin.
- C: như A, thêm cả đổi nơi đón / nơi trả vào lượt — chặt hơn, Bán hàng hết lượt nhanh hơn.

**Câu 3b. Đổi giờ vì xe có tính vào 2 lần không?** Khi điều phối xe cần dời giờ đón, việc đó làm bằng cách sửa giờ trên đơn (đã chốt ở phần gọi báo khách). Máy chủ không phân biệt được "đổi vì xe" với "đổi vì khách".
- **(Khuyến nghị)** Có tính. Hết 2 lần thì nhờ Toàn quyền đổi tiếp.
- Khác: không tính — cần làm thêm một nút riêng "đổi giờ vì xe" cho người điều phối (việc thêm, cần quyết định riêng).

**Câu 4. Những lần đổi giờ trước ngày phát hành có tính vào 2 lần không?**
- **(Khuyến nghị)** Không — mọi đơn bắt đầu đếm từ 0 khi phát hành. Lịch sử cũ không có ghi chú và không tách được "đổi giờ" với "đổi nơi".
- Khác: có — đếm lại từ lịch sử cũ; chép một lần, không chính xác.

**Câu 5. Đối tác / Thực tập tự lập đơn có nhận tin khi đơn đó bị đổi sau xác nhận không?**
Hôm nay họ không nhận tin nào về đơn.
- **(Khuyến nghị)** Có — chỉ loại tin này, chỉ đơn **họ** lập, ở chuông và màn hình khoá (không hiện bảng nổi). Lý do: họ vốn xem được giờ đón / số khách đơn mình và phải báo lại khách của họ.
- Khác: không — văn phòng tự gọi báo đối tác như hôm nay.

*Lưu ý:* khi bạn chưa trả lời, bản nháp tạm để **không nhận** (giữ như hôm nay, vì đây là chuyện ai được thấy tin về đơn nên máy không tự chọn). Nếu bạn trả lời theo khuyến nghị (**Có**) thì mặc định tạm này **đổi thành Có**, và ADR-0062 thêm các câu sửa kèm theo đã soạn sẵn.

**Câu 6. Tin có ghi nơi đón mới không?**
- **(Khuyến nghị)** Không — tin chỉ ghi "đổi nơi đón"; bấm vào xem đơn. Lý do: nơi đón là chữ gõ tay, có thể có tên hoặc địa chỉ nhà khách, mà màn hình khoá ai cầm máy cũng đọc được.
- Khác: ghi tên nơi chỉ khi nơi đón được chọn từ danh bạ địa điểm (khách sạn, bến); vẫn không ghi chữ gõ tay.

## Số khách đi xe (ADR-0065)

**Câu 7. Xe giữ bao nhiêu chỗ cho từng chặng, và người bán không sửa ô thì máy lưu gì?**
(a) Mỗi chặng xe gắn với một dịch vụ. Ví dụ đơn có tour 4 người + mô tô 2 người, số khách đi xe 4.
- **(Khuyến nghị) A:** mỗi chặng giữ số **nhỏ nhất** giữa số khách đi xe và số khách của dịch vụ chặng đó (tour 4 chỗ, mô tô 2 chỗ). Xe không bao giờ giữ thừa.
- B: mọi chặng giữ đúng số khách đi xe (mô tô cũng 4 chỗ — thừa 2).

(b) Người bán không sửa ô "Số khách đi xe":
- **(Khuyến nghị) A:** để **trống** = theo gợi ý; sau này tăng khách thì số đi xe tự tăng theo. Chỉ khi người bán gõ số khác gợi ý mới lưu cố định.
- B: luôn lưu con số lúc bấm lưu; tăng khách mà quên sửa ô thì xe thiếu chỗ (máy chỉ cảnh báo).

**Câu 8. Kế toán có sửa được "Số khách đi xe" không?**
Kế toán (và HDV) sửa được số khách **dịch vụ** (vì liên quan tiền), nhưng ô số khách đi xe hôm nay chỉ Bán hàng (đơn mình / đang phụ trách), Quản trị, Toàn quyền sửa. Khi họ **giảm** khách làm tổng khách nhỏ hơn số đi xe đã gõ cố định, cần một cách xử lý.
- **(Khuyến nghị) A:** Kế toán **không** sửa ô này. Khi giảm khách làm vượt, máy **tự hạ** số khách đi xe bằng tổng mới và ghi lịch sử. Lý do: số khách dịch vụ là chuyện tiền (Kế toán giữ), số đi xe là chuyện xe (người bán / Quản trị giữ); tự hạ tránh bị kẹt mà không mở thêm quyền.
- B: Kế toán sửa được cả hai con số trong cùng hộp "Sửa số khách dịch vụ".
- C: không cho lưu khi vượt, bắt người có quyền sửa ô số khách đi xe trước — HDV và Kế toán sẽ bị kẹt.

---

*Đã bỏ hai câu của bản nháp trước:* "tin ban đêm có rung không" (luật giờ yên lặng đã duyệt trả lời rồi: hiện, không rung) và "giữ hay sửa cách viết tên 14 nhóm" (Quản trị đổi tên trong app bất cứ lúc nào).

---

## Chủ đã trả lời (2026-09-30, hộp hỏi phiên điều phối chung — lượt duyệt 1)
- Duyệt lượt 1a (ADR-0058) và 1b (ADR-0062) — hai tệp đã chuyển vào `docs/adr/` với trạng thái accepted.
- Câu 1 = 14 nhóm, ATV → Kong Forest. Câu 2 = hạn 2027-03-31.
- Câu 3 = A (mọi ngày / giờ trên đơn + thêm chặng đón; đổi nơi không tiêu lượt). Câu 3b = đổi giờ vì xe **có** tính lượt.
- Câu 5 = **Có** (Đối tác / Thực tập nhận tin về đơn họ lập). Câu 6 = tin **không** ghi nơi đón mới.
- **Còn chờ (lượt 2a/2b):** câu 4 (lần đổi giờ trước phát hành), câu 7 (xe giữ chỗ từng chặng; không sửa ô thì lưu gì), câu 8 (Kế toán và số khách đi xe).
