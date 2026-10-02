# Phiếu trả lời đề xuất cho chủ dự án — sau duyệt độc lập (2026-10-02)

> **Phiếu này để làm gì:** gom mọi câu hỏi mở của ba lượt duyệt vào **một lần trả lời**. Mỗi câu có đề xuất, lý do và phương án khác.
>
> **Nguồn đề xuất:** hai người duyệt độc lập. Đây chỉ là đề xuất. Quyết định có hiệu lực khi chủ trả lời (Hiến pháp N3).
>
> **Cách trả lời:**
> - "Đồng ý tất cả theo đề xuất, trừ … ", kèm ba câu ở mục 0; hoặc
> - trả lời từng mã.
>
> **Tệp đi kèm:**
> - văn bản ba lượt: `2026-10-02-luot-duyet-1-…`, `2026-10-02-luot-duyet-2-…`, `2026-10-02-luot-duyet-3-…`;
> - hai phiếu duyệt: `2026-10-02-phieu-duyet-doc-lap-luot-A-tien.md`, `…-B-quyen.md`.

## Kết luận của người duyệt
- **Lượt tiền (bản 1): chưa nên duyệt.** Ba chỗ làm theo sẽ không chạy:
  - giữ cọc làm phí huỷ không làm số "cần hoàn" giảm;
  - khi khách chưa trả sau chuyến, bản 1 đưa lại kiểu "khách còn nợ" mà bạn đã bác;
  - sau chuyến không hoàn hay bồi thường được nữa.
  
  Thêm nữa, giấy báo huỷ có thể hứa hoàn cả khoản chuyển khoản chưa chắc đã về.
- **Lượt quyền (bản 1): duyệt được sau khi sửa 9 chỗ.**
  - Quản trị vẫn cấp thêm quyền Kế toán cho người khác được; Nhân sự tạo được tài khoản Kế toán mới.
  - Bán hàng có thể đóng dấu "ngoại lệ" trước nhiều ngày để né mốc 6 giờ.
- **Đã làm:** viết lại thành **bản 2**, chia lượt cho đúng luật "tối đa 3 quyết định mỗi lượt".
- **Người kiểm thứ ba** soát bản 2: "trình được sau khi sửa 11 chỗ nhỏ", không có lỗi nghiêm trọng. **Đã sửa cả 11 chỗ.**

## Ba lượt mới
| Lượt | Gồm | Vì sao thứ tự này |
|---|---|---|
| **1 (gấp)** | ADR-0089 đơn huỷ còn tiền (hiện "cần hoàn" ở biên nhận, trang đơn, màn sổ); ADR-0090 chỉ Toàn quyền cấp quyền Kế toán, tạo tài khoản Kế toán, đặt lại PIN của họ | Lỗi đơn huỷ có hạn 15/10. ADR-0090 nhỏ, không đổi dữ liệu, chặn Quản trị đội tên Kế toán **trước khi** thêm lệnh tiền mới |
| **2a** | ADR-0088 sửa sai sau "Đã giao" bằng lệnh "Thay lần thu", quy tắc tiền đúng mọi lúc, cách ghi khi khách chưa trả hay cần bồi thường (Q-A5) | Hạn 31/10. Tách 2a và 2b vì đếm theo từng quyết định con thì gộp lại sẽ vượt trần 3 |
| **2b** | ADR-0092 sổ không ra số sai dấu, điều chỉnh có kiểm soát, ô mã giao dịch ngân hàng, phí huỷ | Hạn 31/10 |
| **3** | ADR-0093 PIN tạm; ADR-0091 Bán hàng phá lệ mốc 6 giờ có nhãn "Ngoại lệ 6 giờ" | Không được làm chậm hai lượt tiền; phá lệ phải khớp lộ trình Vận chuyển |

---

## 0. Ba câu **bạn phải trả lời trước** (hai câu máy không đoán được, một đặc tả đang treo)

**Q-A3 — Công ty có giữ cọc khi khách huỷ không?**
- Nếu có, cho biết:
  - mốc bao nhiêu ngày trước ngày đi;
  - có khác theo dịch vụ không (ví dụ vé cano, vé tham quan không hoàn được);
  - ai thoả thuận với khách;
  - khách có được báo điều kiện huỷ trước không.
- Trong tài liệu dự án **chưa có** chính sách này.
- **Nếu có giữ cọc:** lượt này Kế toán ghi tay số giữ lại, bằng một loại ghi riêng, có lý do. Bảng mốc tự tính để sau, giống cách bạn đã chọn cho phí huỷ nhà xe.
- **Nếu không giữ cọc:** bỏ phần phí huỷ, văn bản gọn hơn.

**Q-A5 — Sau "Đã giao", khách thực sự chưa trả (do có người ghi nhầm), hoặc công ty phải hoàn hay bồi thường cho khách: ghi thế nào, ai chịu?**
- **Đề xuất (A):**
  - thêm hai loại ghi: "phải đòi sau Đã giao" và "giảm trừ sau Đã giao";
  - Kế toán theo dõi danh sách phải đòi; không đòi được thì Toàn quyền ghi "thất thu" có lý do;
  - **mặc định công ty chịu** khoản thất thu; xử lý người làm sai theo quy chế nhân sự, ngoài app;
  - **hoàn tiền sau "Đã giao"** (ví dụ khách phàn nàn sau tour) đi kèm một dòng "giảm trừ". Nếu bạn chưa chọn (A), hoàn sau "Đã giao" **tạm bị chặn**, vì để nguyên thì bộ kiểm báo đỏ và chặn phát hành.
- **Lý do:**
  - giữ được quy tắc tiền "luôn luôn" bạn đã chọn;
  - không quay lại kiểu "khách còn nợ" bạn đã bác ngày 29/9;
  - không đẩy rủi ro sang nhân viên khi chưa có quy chế.
- **Phương án khác:**
  - (A') khoản thiếu treo trên người ghi nhầm: dùng cơ chế sẵn có, nhưng là chính sách để nhân viên gánh, cần quy chế rõ;
  - (B) ghi "khách còn nợ": đảo ngược lựa chọn ngày 29/9;
  - (C) làm ngoài app: sổ sẽ ghi sai sự thật.

**Q-F02 — Duyệt đặc tả "chống gửi trùng" ngày 22/9 (đang treo).** Lỗi gửi lặp (F-02) có hạn **15/10** trong sổ dừng dây chuyền và chỉ sửa được khi đặc tả này được duyệt. Đặc tả có 3 câu:
- **Câu 1:** làm trước "cảnh báo đơn trùng". **Đề xuất:** (a) làm trước.
- **Câu 2:** áp cho nút "Tạo hồ sơ" ở màn Hồ sơ. **Đề xuất:** (a) chưa.
- **Câu 3:** nay **lỗi thời**, vì sổ thu tiền đã chạy. **Đề xuất:** cho AI **mở rộng đặc tả** sang ghi lần thu, hoàn, nộp và lệnh "Thay lần thu" rồi trình lại phần mở rộng. Thử thật đêm 1→2/10 đã cho thấy cả bốn lệnh này đều ghi hai lần khi gửi lặp.

**Ghi chú F-03** (tiền đơn đã xác nhận mới chỉ được mã khoá, cơ sở dữ liệu chưa khoá): việc này là **siết theo luật tiền đã có**, không cần quyết định mới. AI làm như một việc thi công riêng, có người kiểm độc lập, hạn 31/10.

## 1. Nhắc một lần (P18)
Ngày 29/9 bạn đã **loại** phương án "Bán hàng tự phá lệ mốc 6 giờ", chỉ cho Quản trị và Toàn quyền (ADR-0049, ĐP3). Câu 5 ngày 2/10 ("cho phép") **đảo ngược** lựa chọn đó. Nếu chọn "mọi giờ" ở Q-B3 thì đảo ngược trọn vẹn, không chỉ vá ban đêm. Bạn xác nhận vẫn giữ "cho phép" thì văn bản thi hành, không nhắc lại.

## 2. Lượt 1
| Mã | Đề xuất | Lý do chính | Phương án khác |
|---|---|---|---|
| **Q-A4** | Nhắc khi đơn chờ hoàn quá **7 ngày** (tô màu ở danh sách "Cần hoàn") | Công ty nhỏ đối soát theo tuần; báo trước khi khoá sổ tháng | 3 ngày: nhắc nhiều, dễ bị lờ đi. 15–30 ngày: trễ |
| **Ghi thu lên đơn huỷ** (mới) | Chỉ **Kế toán, Toàn quyền** | Ca thật là khách chuyển khoản muộn, việc của Kế toán; tránh Bán hàng hay Đối tác ghi tiền vào đơn đã huỷ | Giữ như hôm nay: ai cũng ghi được |
| **Chỉ Toàn quyền cấp quyền tiền** (Q-B2 cũ) | Bốn việc chỉ Toàn quyền làm với tài khoản Kế toán: đặt lại PIN, gán quyền Kế toán, tạo tài khoản Kế toán, tắt lớp hai | Thử thật cho thấy Quản trị đội tên Kế toán hoàn được 500.000. Công ty chỉ 1–2 Kế toán nên việc dồn lên Toàn quyền rất ít. Đúng nguyên tắc "tách nhiệm vụ" bạn duyệt ở ADR-0072 | Chỉ chặn đặt lại PIN và báo Toàn quyền khi có người được cấp quyền Kế toán: phát hiện sau, không chặn trước |

## 3. Lượt 2 (2a và 2b)
| Mã | Đề xuất | Lý do chính | Phương án khác |
|---|---|---|---|
| **Q-A1** — trần điều chỉnh tiền | Giảm nợ của ai thì không quá số người đó đang nợ; tăng nợ không quá số lớn hơn giữa phải thu và đã thu; lý do ≥ 10 ký tự; **người bị đổi số nhận tin báo** | Lần thử mất tiền là xoá 100.000 tiền mặt Bán hàng đang cầm, lý do một dấu chấm. Trần "≤ phải thu" của bản 1 vẫn để lọt. Báo cho người bị đổi là kiểm soát rẻ nhất | Một con số cố định (vd 5 triệu): không chặn được xoá nợ nhỏ. Toàn quyền duyệt mọi điều chỉnh: chặt nhất nhưng thành nút thắt |
| **Q-A2** — ô mã giao dịch ngân hàng | **Có**: ô riêng, cảnh báo khi trùng mã (không chặn) | Thử thật: hai người khai cùng một khoản chuyển khoản, công ty mất 100.000. Mã giao dịch là bằng chứng đối chiếu duy nhất. Hiện ghi chú đang **chặn** đúng chuỗi số này | Không thêm ô; màn xác nhận liệt kê các khoản cùng số tiền, cùng ngày: rẻ nhưng dò đoán |

## 4. Lượt 3
| Mã | Đề xuất | Lý do chính | Phương án khác |
|---|---|---|---|
| **Q-B1** — hạn PIN tạm | Đặt lại PIN: **24 giờ**. Tạo tài khoản mới: **7 ngày** | Đặt lại thì người dùng đang chờ, dùng ngay. Người mới hay đối tác chưa chắc cài app ngay; Nhân sự không cấp lại được PIN | 72 giờ cho cả hai: đơn giản hơn, cửa hở lâu hơn |
| **Q-B6** — tài khoản cũ có PIN do người khác đặt | **Có**: khoảng 30 tài khoản nội bộ phải đổi PIN một lần; đối tác không bắt | Nếu không, PIN cũ vẫn nằm trong tay người đặt, đăng nhập lặng lẽ được. Câu này chạm dữ liệu thật; trước khi làm sẽ đếm bằng lệnh chỉ đọc | Không bắt: rủi ro cũ còn nguyên |
| **Q-B3** — giờ phá lệ | **Mọi giờ**, kèm hai chốt: chỉ phá lệ được khi đơn **đang thật sự** bị mốc chặn; Quản trị có ô đếm "ngoại lệ 7 ngày qua, theo người" | Ban ngày Quản trị cũng hay vắng; khung giờ cần thêm cài đặt "giờ trực" | Chỉ ngoài giờ hành chính: ban ngày giữ đúng lựa chọn 29/9, nhưng ban ngày Quản trị vắng thì lại kẹt |
| **Q-B4** — báo Quản trị | **Chỉ hộp thông báo**, không đẩy thông báo ra điện thoại | Ngoại lệ sinh ra để không phải đánh thức Quản trị; việc đã làm xong | Đẩy thông báo ngay: đánh thức người vì việc đã xong, dễ khiến họ tắt thông báo luôn |
| **Q-B5** — ai không được phá lệ | Đối tác, HDV, Thực tập, Kế toán đều **không** | HDV không xếp xe; Đối tác là bên ngoài (khoảng 1.000 tài khoản) và đã tự xác nhận được đơn | Cho Đối tác: hàng nghìn người ngoài mở được lối này, nhãn nhiều đến mất nghĩa |
| **Q-B7** — lệnh nào được phá lệ | Xác nhận đơn; sửa giờ hoặc nơi dưới mốc; **đưa khách chưa có xe lên xe**; thêm điểm khi xe đang chạy. **Chưa** cho đổi xe, đổi tài xế, rút khách, huỷ chuyến | Đổi xe hay tài xế sát giờ chính là chỗ thử thật cho thấy tài xế không được báo. Mở sau khi làm xong phần báo tài xế | Mở hết: nhanh hơn, nhưng dễ lỡ khách |
| **Q-B8** — Đối tác có thấy nhãn không | Thấy **loại** nhãn trên đơn của mình, không thấy ai làm, vì sao | Giống "Đặt gấp" hôm nay; đối tác biết đơn mình là ca đặc biệt | Ẩn với đối tác |
| **Q-B9** — Toàn quyền nhận tin ở đâu | Ngăn **"Tất cả"**; Quản trị nhận ở "Của tôi" | Toàn quyền là vai kỹ thuật, ngoại lệ là việc kinh doanh | Cả hai cùng nhận ở "Của tôi" |

## 5. Sau khi bạn trả lời
1. AI chép câu trả lời nguyên văn vào văn bản, đổi trạng thái thành accepted, chuyển vào `docs/adr/`. Việc này cần bạn bấm đồng ý khi được hỏi quyền sửa ADR.
2. Lập kế hoạch thi công **lượt 1** trước, kèm điều kiện: làm phần chống gửi lặp cho lệnh hoàn tiền cùng đợt.
3. Mỗi lượt thi công xong có người kiểm độc lập. Các kịch bản thử thật đêm 1→2/10 được chuyển thành bài kiểm tự động.
