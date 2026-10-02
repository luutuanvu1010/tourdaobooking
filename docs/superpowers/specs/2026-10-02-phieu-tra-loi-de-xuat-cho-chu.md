# Phiếu trả lời đề xuất cho chủ dự án — bản 2.1 (2026-10-02, sau phiếu kiểm độc lập bản 3)

> **Phiếu này để làm gì:** gom mọi câu còn mở vào **một lần trả lời**. Mỗi câu có đề xuất kèm lý do; chi tiết và phương án khác nằm ở văn bản từng lượt.
>
> **Đề xuất** đến từ người duyệt độc lập và nghiên cứu khung Oracle. Quyết định chỉ có hiệu lực khi chủ trả lời (Hiến pháp N3).
>
> **Cách trả lời nhanh:** "Đồng ý tất cả đề xuất, trừ: …".

## Đã có lời chủ (chat 2026-10-02) — đã viết vào văn bản

| Câu | Lời chủ (nguyên văn) | Đã làm |
|---|---|---|
| Cọc khi khách huỷ (Q-A3 cũ) | "Khi khách huỷ, mặc định tiền cọc không được bồi hoàn. Tuy nhiên trên thực tế, công ty có thể hoàn tiền lại cho khách nhưng không bắt buộc, thời gian hoàn cọc tối đa là 60 ngày sau ngày khởi hành đã được lên kế hoạch" | **ADR-0089 viết lại (bản 3):** "còn lại" về 0; cọc mặc định giữ lại; hoàn tuỳ chọn hai bước (một người duyệt, Kế toán chi); quá hạn 60 ngày thì máy chặn |
| Thiếu tiền hoặc bồi thường sau "Đã giao" (Q-A5 cũ) | "ai làm ngươì đó phải chịu, phân định rạch ròi trách nhiệm trong các trường hợp cụ thể" | **ADR-0088 đ9:** bảng 11 trường hợp, mỗi trường hợp một bên chịu; khoản thiếu thành nợ của bên đó với công ty |
| Chống gửi trùng (Q-F02) | "Đồng ý, đều phải có cơ chế chống trùng, truy ngược lại khung của Oracle xem nên làm kiểu gì" | Đặc tả 22/9 ghi **đã duyệt**; mọi lệnh ghi đều chống trùng, kể cả màn Hồ sơ; viết **đặc tả mở rộng theo Oracle** (`2026-10-02-chong-trung-moi-lenh-ghi-theo-oracle.md`) |
| Cho Bán hàng phá lệ mốc 6 giờ | "cho phép (nhưng phải có nhãn…)" | Đã nhắc một lần (P18) rằng câu này đảo ngược lựa chọn ngày 29/9. Văn bản thi hành theo lời chủ, không nhắc lại |

**Cách AI hiểu lời chủ, chủ sửa nếu sai:**
- "Ai làm người đó chịu" được hiểu là: khoản thiếu hoặc bồi thường chuyển thành **nợ của bên gây ra với công ty**, có thể là nhân viên, nhà xe, nhà cung cấp hay đối tác.
- **Bất khả kháng** (thời tiết, cấm biển) thì không có ai "làm", nên **công ty chịu**.
- App chỉ ghi công nợ; **trừ lương** làm theo luật lao động và quy chế, ngoài app.
- "Đều phải có cơ chế chống trùng" được hiểu là áp cho **mọi lệnh ghi**, kể cả nút "Tạo hồ sơ" ở màn Hồ sơ. Phiếu trước đề xuất "chưa" cho màn này.
- **Cách hạch toán** cọc giữ lại (tạm giữ trong hạn 60 ngày, sau đó là thu nhập khác) là suy luận của AI; **Kế toán chốt**.

---

## Còn chờ chủ trả lời

### Lượt 1a — Đơn huỷ và cọc (ADR-0089) — **gấp, hạn 15/10**
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **QH1** | "Cọc" là gì, khi app không có "% cọc"? | **Toàn bộ số khách đã trả trước khi huỷ**, kể cả khi đã trả đủ | Đúng chữ "mặc định không hoàn"; công ty vẫn hoàn tuỳ ý được; không phải thêm cài đặt tỉ lệ |
| **QH2** | **Công ty huỷ** (thời tiết, cấm biển, hết chỗ, lỗi công ty) thì sao? | **Hoàn toàn bộ hoặc dời lịch**, theo lựa chọn của khách | Khách không có lỗi; đây là chỗ dễ tranh chấp nhất. Ở Nha Trang, huỷ vì thời tiết là chuyện thường |
| **QH3** | Ai **duyệt** hoàn cọc? | **Quản trị (Giám đốc, Điều hành) hoặc Toàn quyền duyệt; Kế toán chi** | Hoàn cọc là quyết định giảm thu, tách khỏi người ghi sổ (lỗ G7 đã thấy khi một người làm cả hai) |
| (đ7) | Ai được ghi thu lên đơn **đã huỷ**? | **Chỉ Kế toán, Toàn quyền** | Ca thật là khách chuyển khoản muộn, việc của Kế toán đối chiếu ngân hàng |
| (đ4) | Nhắc Kế toán | Khoản đã duyệt mà chưa chi quá **7 ngày**; còn ≤ **10 ngày** tới hạn 60 ngày. Hiện ở danh sách, không đẩy tin | Báo trước khi hết hạn |
| **QH4** | Huỷ vì **nhập sai, lập lại đơn** hoặc **khách đặt trùng** | Tiền **chuyển sang đơn mới** (hoặc hoàn), **không giữ cọc** | Nếu giữ thì khách bị thu hai lần cho cùng một chuyến |
| **QH5** | Đơn cũ **đã hoàn tay** trước khi có sổ | Toàn quyền **ghi bù một lần**, có lý do, **không áp hạn 60 ngày** | Sổ phải ghi đúng việc đã xảy ra |
| **QH6** | Hạn 60 ngày chặn gì | Chặn **duyệt mới** sau hạn; khoản **đã duyệt trước hạn** vẫn chi được. Đơn nháp huỷ chưa có ngày đi thì tính từ ngày huỷ | Khách đã được hứa hoàn thì không bị mất. Phương án khác: chặn cả chi, đúng chữ "tối đa 60 ngày" hơn |
| **QH7** | Đơn của **đối tác mà đại lý cầm cọc** | Cọc là của công ty; đại lý **nộp về** hoặc **bù trừ** ở kỳ đối soát đại lý | Thống nhất với cách tính hoa hồng sắp làm |
| **QH8** | In **điều khoản huỷ** lên ảnh **xác nhận đơn** lúc đặt | **Có**, một dòng "Khi khách huỷ, tiền cọc không được hoàn lại" (bạn chốt chữ) | Thông báo huỷ in "không hoàn" mà lúc đặt khách chưa được báo thì dễ tranh chấp |

### Lượt 1b — Chỉ Toàn quyền cấp quyền tiền (ADR-0090)
Không có câu hỏi. **Đề xuất: duyệt văn bản.** Chỉ Toàn quyền được đặt lại PIN, gán quyền Kế toán, tạo tài khoản Kế toán và tắt lớp hai của tài khoản Kế toán. Lý do: thử thật cho thấy Quản trị đội tên Kế toán hoàn được 500.000.

### Chống trùng — đặc tả mở rộng theo Oracle (§3.5)
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **CT1** | Cùng mã lần gửi nhưng **khác nội dung**, ở lệnh tiền | **Báo lỗi 409** "lần gửi trước đã ghi với nội dung khác, tải lại để xem" | Không lặng lẽ bỏ số mới, không ghi hai lần. Oracle không ghi rõ cách này, đây là lựa chọn an toàn của app |
| **CT2** | Thứ tự phát hành | **(a)** Giao diện gửi mã trước, máy chủ nhận tuỳ chọn; khi mọi người đã lên bản mới thì **bắt buộc** | Máy còn bản app cũ sẽ không bị báo lỗi bất ngờ |
| **CT3** | Cảnh báo lần thu **tiền mặt** giống nhau (cùng đơn, số tiền, ngày) | **Có**, chỉ cảnh báo; người ghi bấm "vẫn ghi" kèm lý do | Hai lần thu thật cùng số vẫn có thể xảy ra |
| **CT4** | Ai được bỏ qua cảnh báo trùng | **Người đang ghi** bỏ qua được, **lý do bắt buộc**, ghi nhật ký; Kế toán thấy danh sách đã bỏ qua | Cách của Oracle với hồ sơ khả nghi trùng: người nhập tự quyết, nhưng có dấu vết |
| **CT5** | Đối tác, HDV thấy gì khi SĐT khách **đã có đơn của người khác** | Chỉ thấy **"Khách này có thể đã có đơn — liên hệ văn phòng"**, không thấy mã đơn, tên người lập hay giá | Không lộ khách và giá của công ty cho người ngoài |
| **CT6** | (Đặc tả "cảnh báo đơn trùng", câu 1) "1 tuần" tính theo ngày nào | **Ngày khởi hành** của hai dịch vụ cách nhau ≤ 7 ngày | Cái hại thật là hai lần đón cho cùng một chuyến |
| **CT7** | (Câu 2) Đổi ngày hay đổi khách của đơn đã xác nhận có cảnh báo không | **Có** | Đổi phút cuối là lúc dễ trùng nhất |
| **CT8** | (Câu 3) **Dịch vụ nhập tay** có đem ra so trùng không | **Không**, chỉ so dịch vụ có mã danh mục | Dịch vụ nhập tay đã mở lại cho nội bộ bằng công tắc (ADR-0061, mặc định tắt). So theo tên gõ tay dễ báo nhầm |

### Lượt 2a — Sửa sai sau "Đã giao" và phân định trách nhiệm (ADR-0088)
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **QT1** | Bảng 11 trường hợp (ADR-0088 đ9). Tóm tắt: ghi nhầm mà tiền có thật thì sửa, không ai mất; khai thu mà không thu thì người khai chịu; lỗi nhân viên, nhà xe, nhà cung cấp, đối tác thì bên đó chịu; bất khả kháng thì công ty chịu; chưa rõ thì công ty tạm chịu trong 7 ngày | **Duyệt bảng** | Đúng lời chủ "ai làm người đó chịu"; không ghi "khách còn nợ" mà chủ đã bác |
| **QT2** | Ai **phân định** trách nhiệm | **Quản trị hoặc Toàn quyền**; Kế toán ghi theo phân định; người ghi khác người phân định | Phân định là quyết định về người, cần thẩm quyền; tách khỏi người ghi sổ |
| **QT3** | Người bị gán có bao lâu để phản hồi | **3 ngày làm việc** | Đủ để giải thích, không treo lâu |
| **QT4** | Quá 7 ngày mà chưa phân định | Công ty **tiếp tục tạm chịu**, khoản hiện đỏ ở danh sách; **không** tự gán cho ai | Tự gán là trái "phân định rạch ròi" |

### Lượt 2b — Sổ không đổi dấu, điều chỉnh, mã giao dịch (ADR-0092)
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **Q-A1** | Trần phiếu điều chỉnh | Giảm nợ của ai thì không quá số người đó đang nợ; tăng nợ không quá số lớn hơn giữa phải thu và đã thu; lý do ≥ 10 ký tự; **người bị đổi số nhận tin báo** | Lần thử mất tiền là xoá 100.000 tiền mặt với lý do một dấu chấm |
| **Q-A2** | Ô mã giao dịch ngân hàng | **Có**: chặn trùng trong cùng đơn; cảnh báo khi trùng ở đơn khác; tổng các lần thu gắn cùng mã ≤ số tiền chuyển | Theo cách Oracle chặn biên lai trùng. Lần thử: hai người khai cùng một khoản chuyển, công ty mất 100.000 |

### Lượt 3 — PIN tạm (ADR-0093) và ngoại lệ 6 giờ (ADR-0091)
| Mã | Câu hỏi | Đề xuất | Lý do |
|---|---|---|---|
| **Q-B1** | Hạn PIN tạm | Đặt lại **24 giờ**; tạo tài khoản mới **7 ngày** | Đặt lại thì người dùng đang chờ dùng ngay; người mới hay đối tác chưa chắc cài app ngay |
| **Q-B6** | Tài khoản cũ có PIN do người khác đặt | **Có**: khoảng 30 tài khoản nội bộ đổi PIN một lần; đối tác không bắt | Nếu không, PIN cũ vẫn nằm trong tay người đặt |
| **Q-B3** | Giờ được phá lệ | **Mọi giờ**, chỉ khi đơn **đang thật sự** bị mốc chặn; Quản trị có ô đếm theo người | Ban ngày Quản trị cũng hay vắng |
| **Q-B4** | Báo Quản trị | **Chỉ hộp thông báo**, không đẩy ra điện thoại | Phá lệ sinh ra để không phải đánh thức Quản trị |
| **Q-B5** | Ai **không** được phá lệ | Đối tác, HDV, Thực tập, Kế toán | HDV không xếp xe; Đối tác là bên ngoài |
| **Q-B7** | Lệnh nào được phá lệ | Xác nhận đơn, sửa giờ hoặc nơi dưới mốc, **đưa khách chưa có xe lên xe**, thêm điểm khi xe chạy. **Chưa** cho đổi xe hay tài xế | Đổi xe hay tài xế sát giờ là chỗ tài xế không được báo |
| **Q-B8** | Đối tác thấy nhãn không | Thấy **loại** nhãn, không thấy ai làm, vì sao | Giống "Đặt gấp" hôm nay |
| **Q-B9** | Toàn quyền nhận tin ở đâu | Ngăn **"Tất cả"** | Toàn quyền là vai kỹ thuật |

---

## Sau khi chủ trả lời
1. **Chuyển văn bản vào `docs/adr/`:** AI chép lời chủ nguyên văn, đổi trạng thái sang đã duyệt. Bước này cần chủ bấm đồng ý khi máy hỏi quyền sửa ADR.
2. **Thi công theo thứ tự:**
   - **lượt 1a + 1b**, cùng chống trùng cho **mọi lệnh ghi đang có**: lập đơn và hồ sơ, thu tiền, Đã giao kèm thu, Công ty đã nhận, hoàn, nộp/trả, điều chỉnh, và hai lệnh mới duyệt hoàn, chi hoàn. Hạn 15/10 của lỗi gửi lặp gồm tất cả các lệnh này; không kịp thì bạn gia hạn có lý do;
   - rồi **2a, 2b** (hạn 31/10);
   - rồi **3**.
3. Mỗi lượt có người kiểm độc lập. Kịch bản thử thật đêm 1→2/10 chuyển thành bài kiểm tự động.
4. **F-03** (tiền đơn đã xác nhận mới chỉ được mã khoá) là việc siết theo luật đã có, không cần câu hỏi; hạn 31/10.
