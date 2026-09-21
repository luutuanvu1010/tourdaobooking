# CONSTITUTION — Hiến pháp dự án

> Luật cao nhất, áp cho **mọi dự án** và **mọi tác nhân** (người và AI). Hiến pháp này độc lập công nghệ: nó không nhắc tới một stack, công cụ, tên file hay số bước cụ thể nào, để vẫn đúng kể cả khi mọi thứ bên dưới thay đổi. Khi bất kỳ tài liệu cấp dưới mâu thuẫn với hiến pháp, hiến pháp thắng và tài liệu kia phải sửa.

- **Phiên bản:** v2.3.0   **Hiệu lực từ:** 2026-08-22   **Người phê chuẩn:** Lưu Tuấn Vũ
- **Cách đọc:** mỗi nguyên tắc và điều cấm gồm bốn đến năm phần: phát biểu, lý do, cách áp dụng, ranh giới (cái nó không phải), và khi cần thì ví dụ độc lập công nghệ. Đọc cả phần lý do, vì khi gặp tình huống mơ hồ, chính lý do mới là thứ giúp diễn giải đúng.

---

## Điều 1 — Preamble (Mở đầu)

### 1.1 Bối cảnh tồn tại
Hiến pháp này ra đời cho một thực tế mới: tác nhân AI có thể tạo ra sản lượng nhanh hơn khả năng kiểm tra của con người gấp nhiều lần. Khi sản xuất trở nên gần như miễn phí, thứ khan hiếm không còn là code hay nội dung, mà là **phán đoán đúng, sự nhất quán, và khả năng truy vết trách nhiệm**. Nếu không có một lớp luật bất biến, tốc độ của AI sẽ khuếch đại cả cái đúng lẫn cái sai với cùng một hiệu suất, và cái sai thường rẻ để tạo nhưng đắt để gỡ.

### 1.2 Mục đích
Hiến pháp giữ cho mọi dự án ổn định ba thứ khi quy mô và tốc độ tăng: tính toàn vẹn (không tự mâu thuẫn), khả năng kế thừa (một khung dùng lại được cho nhiều dự án), và khả năng kiểm soát (con người luôn ở vị trí quyết định cuối). Nó không nhằm làm chậm công việc, mà nhằm khiến những sai lầm không thể đảo ngược (không thể sửa chữa) trở nên khó xảy ra.

### 1.3 Triết lý nền
Bốn mệnh đề nền, mọi điều khoản sau chỉ là hệ quả của chúng:
- Đặc tả là nguồn sự thật; code và nội dung là dẫn xuất của đặc tả.
- Con người giữ quyền quyết định; AI thực thi trong khuôn khổ được giao.
- Chất lượng và toàn vẹn dữ liệu được đặt trên tốc độ.
- Đi từ trừu tượng đến cụ thể, không bao giờ ngược lại.

### 1.4 Phạm vi
Áp cho mọi loại dự án (web, ứng dụng, quy trình tự động, hệ thống AI), mọi môi trường (phát triển, thử nghiệm, sản xuất), và mọi tác nhân tham gia (người và AI). Không tác nhân nào, kể cả tác nhân tạo ra nhiều giá trị nhất, được miễn trừ.

---

## Điều 2 — Definitions (Định nghĩa)

Để các điều khoản sau không bị diễn giải lệch, các thuật ngữ được hiểu thống nhất như sau, theo chức năng chứ không theo công cụ:
- **Chủ dự án:** con người giữ quyền quyết định tối cao và chịu trách nhiệm cuối cùng.
- **Tác nhân điều phối:** vai biến ý định thành đặc tả, dựng chỉ dẫn cho các tác nhân khác, và vận hành kiểm soát chất lượng. Không trực tiếp tạo ra sản phẩm cuối.
- **Tác nhân thiết kế:** vai tạo ra bề mặt (giao diện, hệ thị giác) từ một bản ánh xạ đã có.
- **Tác nhân thực thi:** vai tạo ra sản phẩm chạy được (code, cấu hình) đúng theo đặc tả đã duyệt.
- **Đặc tả (spec):** mọi artifact mô tả ý định và ràng buộc trước khi tạo sản phẩm; là nguồn sự thật.
- **Artifact:** một sản phẩm hữu hình, lưu lại được, của một bước làm việc.
- **Cổng kiểm soát:** một điểm dừng bắt buộc, tại đó công việc bị đối chiếu với đặc tả và chỉ được đi tiếp nếu đạt.
- **Quyết định cửa một chiều:** quyết định khó hoặc không thể đảo ngược. **Cửa hai chiều:** quyết định đảo ngược được với chi phí thấp.
- **DRI:** một và chỉ một người chịu trách nhiệm cuối cho một việc.

---

## Điều 3 — Precedence (Thứ tự ưu tiên tài liệu)

### 3.1 Trật tự
Khi hai tài liệu mâu thuẫn, tài liệu đứng trước trong trật tự sau thắng, và tài liệu đứng sau phải được sửa cho khớp:

**Hiến pháp → Ràng buộc cấp dự án → Bản ghi quyết định kiến trúc → Quy trình/Playbook → Đặc tả từng bước → Sản phẩm (code).**

### 3.2 Lý do
Trật tự này phản ánh độ bền: thứ ở trên thay đổi hiếm và ảnh hưởng rộng, thứ ở dưới thay đổi thường xuyên và ảnh hưởng hẹp. Một sản phẩm cụ thể không bao giờ được phép định nghĩa lại một nguyên tắc; nếu nó đòi điều đó, hoặc sản phẩm sai, hoặc nguyên tắc cần được sửa một cách chính thức qua Điều 9, chứ không phải bị lặng lẽ phá ở tầng đáy.

### 3.3 Áp dụng
Khi phát hiện mâu thuẫn, sửa ở tầng đúng rồi để thay đổi chảy xuống các tầng dưới, không vá cục bộ ở tầng sản phẩm. Vá ở đáy tạo ra hai nguồn sự thật, vi phạm Điều 5.

---

## Điều 4 — Core Principles (Nguyên tắc bất biến)

> Các nguyên tắc này độc lập công nghệ. Đổi stack, đổi nền tảng, đổi công cụ AI không làm thay đổi nội dung điều này. Chúng được nhóm theo bốn trục để dễ tra cứu.

### Nhóm A — Trình tự và cấu trúc

**P1. Trừu tượng trước cụ thể.**
- *Phát biểu:* mọi dự án đi từ "vì sao" và "cái gì" xuống "như thế nào" và "bằng gì", không bao giờ ngược.
- *Lý do:* quyết định ở tầng trừu tượng ràng buộc tầng cụ thể; nếu làm ngược, cái cụ thể sẽ áp đặt giới hạn lên cái lẽ ra phải tự do, và ta tối ưu sai chỗ.
- *Áp dụng:* định vị và phạm vi phải chốt trước kiến trúc; kiến trúc trước giao diện; giao diện trước khi tinh chỉnh chi tiết.
- *Ranh giới:* không cấm làm nguyên mẫu nhanh để học, nhưng nguyên mẫu là để học rồi vứt, không phải để leo ngược lên định nghĩa chiến lược.

**P2. Bề mặt không bao giờ đi trước cấu trúc.**
- *Phát biểu:* không tạo giao diện khi chưa có bản ánh xạ rõ ràng giữa mỗi vùng giao diện và dữ liệu nuôi nó.
- *Lý do:* giao diện vẽ trước dữ liệu sẽ buộc dữ liệu phải uốn theo cái đẹp, sinh ra trường dữ liệu giả và quan hệ gãy; đây là một trong những nguồn làm lại tốn kém nhất.
- *Áp dụng:* bản ánh xạ giao diện và dữ liệu là tiền điều kiện cứng của mọi việc thiết kế.
- *Ranh giới:* phác thảo cảm hứng thị giác thì được, nhưng sản phẩm thiết kế chính thức thì không, cho tới khi có ánh xạ.

**P3. Thứ tự các tầng không được đảo để đi nhanh.**
- *Phát biểu:* rút ngắn được, nhưng không được nhảy cóc qua một tầng rồi quay lại lấp sau.
- *Lý do:* mỗi tầng tạo ra ràng buộc cho tầng sau; bỏ qua một tầng nghĩa là tầng sau làm trên giả định chưa được kiểm, và lỗi chỉ lộ ra khi đã đắt để sửa.

### Nhóm B — Sự thật và dấu vết

**P4. Đặc tả là nguồn sự thật, không phải code.**
- *Phát biểu:* khi đặc tả và sản phẩm mâu thuẫn, đặc tả mặc định đúng và sản phẩm phải được kéo về.
- *Lý do:* code phản ánh một thời điểm và một người (hoặc một tác nhân) thực thi; đặc tả phản ánh ý định đã được duyệt. Lấy code làm chuẩn là để cho tai nạn định nghĩa ý định.
- *Áp dụng:* sai lệch giữa sản phẩm và đặc tả được ghi lại và lên kế hoạch kéo về, không được âm thầm coi sản phẩm là đúng.
- *Ranh giới:* nếu thực tế cho thấy đặc tả sai, ta sửa đặc tả một cách chính thức, rồi mới sửa sản phẩm; không đảo vai.

**P5. Mọi quyết định để lại dấu vết.**
- *Phát biểu:* một quyết định có ảnh hưởng mà không được ghi lại thì coi như chưa từng xảy ra.
- *Lý do:* trí nhớ tổ chức của một người vận hành cùng nhiều tác nhân AI là cực kỳ mong manh; quyết định không ghi sẽ bị lặp lại, bị đảo ngược vô tình, hoặc không ai biết vì sao mọi thứ thành ra như vậy.
- *Áp dụng:* mỗi quyết định kiến trúc hoặc công nghệ phải ghi bối cảnh, lựa chọn, phương án bị loại, và hệ quả.
- *Ranh giới:* quyết định tầm thường, đảo ngược tức thì thì không cần nghi thức; ngưỡng phân biệt nằm ở khả năng đảo ngược (xem Điều 7).

**P6. Một nguồn sự thật cho mỗi thứ.**
- *Phát biểu:* mỗi sự kiện, mỗi quy tắc, mỗi giá trị chỉ được sống ở đúng một nơi canonical; các nơi khác trỏ về, không sao chép.
- *Lý do:* hai bản của cùng một thứ chắc chắn sẽ lệch theo thời gian, và khi lệch thì không ai biết bản nào đúng.
- *Áp dụng:* khi cần dùng lại một thông tin, trỏ tới nguồn hoặc sinh tự động từ nguồn, không dán bản sao sửa tay.

### Nhóm C — Quyền lực giữa người và máy

**P7. Con người quyết định, AI thực thi.**
- *Phát biểu:* định hướng, chiến lược, khẩu vị, và mọi quyết định không đảo ngược thuộc về con người; AI thực thi trong khuôn khổ được giao.
- *Lý do:* AI tối ưu cho mục tiêu được phát biểu, không chịu hậu quả, và không mang trách nhiệm; trao quyền quyết định cho nó là trao quyền mà không trao trách nhiệm.
- *Áp dụng:* AI được đề xuất, phân tích, trình bày phương án, nhưng điểm chốt cuối luôn là một con người.

**P8. Khi mơ hồ, dừng hay tự quyết tùy loại mơ hồ.**
- *Phát biểu:* mơ hồ cấu trúc (chạm dữ liệu, logic, hợp đồng giữa các phần, hoặc bất biến) thì luôn dừng và leo thang, dù nhỏ tới đâu. Mơ hồ bề mặt (không chạm những thứ đó) và thuộc quyết định cửa hai chiều thì tác nhân được tự đưa giả định, ghi lại giả định, và đi tiếp.
- *Lý do:* dừng ở mọi mơ hồ nhỏ sẽ giết tốc độ và làm quá tải người quyết; nhưng mơ hồ chạm nền dữ liệu hay logic thì sai sót là không đảo ngược, phải dừng. Trục phân biệt là có chạm cấu trúc không và có đảo ngược được không, không phải kích thước câu hỏi.
- *Áp dụng:* giả định bề mặt phải được ghi lại để duyệt sau (P5); giả định không ghi là vi phạm. Mơ hồ cấu trúc được giải bằng cách bổ sung đặc tả, không để tác nhân tự lấp.
- *Ranh giới:* không được mượn nhãn "bề mặt" để tự quyết thứ thực chất là cấu trúc; khi không chắc một mơ hồ thuộc loại nào, mặc định coi là cấu trúc và dừng.

**P9. Mỗi việc có đúng một người chịu trách nhiệm cuối (DRI).**
- *Phát biểu:* không việc nào được mồ côi trách nhiệm; mỗi hoạt động có một DRI là con người.
- *Lý do:* trách nhiệm chia cho tất cả là trách nhiệm không thuộc về ai; khi có sự cố, phải có một người mà ở đó việc dừng lại.
- *Ranh giới:* DRI không có nghĩa người đó tự làm mọi thứ, mà là người chịu trách nhiệm việc đó được làm đúng.

### Nhóm D — Chất lượng và bền vững

**P10. Toàn vẹn dữ liệu hơn tính năng.**
- *Phát biểu:* khi phải chọn, một quan hệ dữ liệu đúng quan trọng hơn một tính năng thêm.
- *Lý do:* tính năng thiếu thì thấy ngay và bổ sung được; dữ liệu gãy thì lan âm thầm, làm hỏng mọi thứ phụ thuộc vào nó, và rất khó truy ngược.

**P11. Đơn giản dễ bảo trì hơn thông minh phức tạp.**
- *Phát biểu:* chọn giải pháp mà người (hoặc tác nhân) đến sau đọc hiểu được, thay vì giải pháp tinh vi mà chỉ tác giả hiểu.
- *Lý do:* trong môi trường nhiều tác nhân và nhiều dự án, chi phí đọc hiểu lặp lại lớn hơn chi phí viết một lần; phức tạp là một khoản nợ trả góp mãi.

**P12. Mỗi bước đẻ ra một artifact.**
- *Phát biểu:* không có sản phẩm hữu hình lưu lại được thì bước đó chưa hoàn thành.
- *Lý do:* công việc "làm trong đầu" không kiểm tra được, không kế thừa được, và biến mất khi phiên làm việc kết thúc.

**P13. Mỗi sản phẩm phục vụ cả người và máy.**
- *Phát biểu:* nội dung và cấu trúc phải đọc được cho cả con người lẫn hệ thống tự động.
- *Lý do:* trong kỷ nguyên mà cả người dùng lẫn máy đều tiêu thụ nội dung, một sản phẩm chỉ phục vụ một phía là tự bỏ một nửa giá trị.
- *Áp dụng:* nội dung có cấu trúc kiểm chứng được, mở đầu là mệnh đề hoàn chỉnh, có tín hiệu thẩm quyền và thời điểm.

### Nhóm E — Kỷ luật vận hành với AI

> Nhóm này trình bày theo khuôn nguồn (ketoanvn v3.1.0) — một dòng in đậm là phát biểu, một dòng nghiêng là lý do — khác Nhóm A–D. Lý do: chủ dự án duyệt theo nguyên văn; đổi khuôn là viết lại chữ.

**P14. Người chủ duyệt, không tự sửa.** Trước một sản phẩm do tác nhân tạo ra, người chủ chỉ có ba lựa chọn: duyệt, yêu cầu sửa kèm lý do, hoặc huỷ. Người chủ tự do sửa đặc tả; không tự sửa sản phẩm khi đang ở vai nghiệm thu.
*Vì tự tay sửa làm mất dấu vết nguyên nhân, khiến tác nhân không học được lỗi, và biến người phê duyệt thành người thi công, không còn ai đứng ngoài để kiểm.*

**P15. Mỗi vai một phiên.** Không tác nhân nào vừa lập kế hoạch, vừa thi công, vừa nghiệm thu chính công việc của mình.
*Vì một tác nhân luôn đánh giá sản phẩm của nó theo đúng giả định đã sinh ra sản phẩm đó; điểm mù được nhân đôi chứ không bị bắt.*

**P16. Đường ray trước, tốc độ sau.** Một ràng buộc chỉ được coi là có hiệu lực khi có cơ chế cưỡng chế được nó; ràng buộc chỉ nằm trong văn bản là lời khuyên. Điều nào chưa cưỡng chế được phải được ghi nhận là đang dựa vào kỷ luật, không được coi là đã an toàn.
*Vì tác nhân tuân theo cái chặn được nó, không tuân theo cái chỉ mô tả cho nó.*
**Và một cơ chế cưỡng chế chỉ được coi là đang có hiệu lực khi đã quan sát được nó chặn thật, ít nhất một lần, trên một ca vi phạm cố ý.** Cơ chế đã dựng nhưng chưa từng bị bắt chặn thì vẫn thuộc hạng lời khuyên và phải được khai là như vậy. Cùng đòi hỏi đó áp cho mọi thứ khác mà một tác nhân dựa vào để tin rằng mình an toàn — một cổng, một phép kiểm, một tham chiếu: chưa từng được quan sát là hoạt động thì chưa được đếm là đang hoạt động.
*Vì một hàng rào hỏng nguy hiểm hơn không có hàng rào: nó chiếm chỗ của hàng rào thật và làm mọi người thôi canh chỗ đó. Và hỏng của một hàng rào gần như luôn im lặng — nó không báo lỗi, nó chỉ ngừng chặn.*

**P17. Mỗi sai lầm phải thành luật.** Một sự cố nghiêm trọng, hoặc một lỗi lặp lại lần thứ hai, bắt buộc đẻ ra một dòng luật ở đúng tầng.
*Vì đây là cơ chế tích luỹ kinh nghiệm duy nhất của một hệ thống mà mọi phiên làm việc đều bắt đầu từ con số không.*

**P18. Nghĩa vụ cảnh báo sớm.** Thấy dấu hiệu một nguyên tắc sắp hoặc đang bị vi phạm thì phải nêu ngay lúc phát hiện, kèm số hiệu điều khoản bị chạm, không đợi tới cổng. Nêu một lần cho rõ; sau khi người chủ đã nghe và vẫn quyết, thì thi hành và không nhắc lại.
*Vì cổng chỉ bắt lỗi sau khi công đã bỏ ra; im lặng chờ cổng là chọn để lãng phí xảy ra. Cảnh báo là nghĩa vụ thông tin, không phải quyền phủ quyết.*

**P19. Vòng lặp nhỏ.** Một việc, một phiên, một mốc lịch sử. Trạng thái công việc sống trong tài liệu, không trong trí nhớ của phiên.
*Vì bộ nhớ làm việc của một phiên là tài nguyên khan hiếm nhất; phiên càng dài, tác nhân càng quên chỉ dẫn ban đầu và càng dễ sai.*

**P20. Nghiệm thu bằng hành vi, không bằng lời báo cáo.** Mỗi việc phải có tiêu chí nghiệm thu viết bằng tiếng người, kiểm được, và đặt ra trước khi bắt tay làm.
*Vì "tác nhân báo đã xong" không phải bằng chứng; chỉ hành vi quan sát được mới là. Tiêu chí đặt ra sau khi làm xong luôn có xu hướng uốn theo cái đã làm được.*

**P21. Không tin một lớp phòng thủ duy nhất.** Mọi kiểm soát trọng yếu phải có ít nhất hai lớp độc lập với nhau.
*Vì một lớp phòng thủ nào cũng có xác suất hỏng, và khi nó là lớp duy nhất thì xác suất đó chính là xác suất thảm hoạ. Bài học Therac-25: bỏ khoá an toàn phần cứng, đặt trọn niềm tin vào phần mềm, lỗi phần mềm gây chết người.*

---

## Điều 5 — Non-Negotiables (Điều cấm tuyệt đối)

> Vi phạm bất kỳ điều nào là lý do hợp lệ để chặn phát hành hoặc đảo ngược thay đổi, bất kể giá trị mà thay đổi đó mang lại.

**N1. Cấm làm bề mặt trước cấu trúc.**
- *Vì sao tuyệt đối:* đảo thứ tự này phá nền dữ liệu, hệ quả lan ra mọi thứ phía sau.
- *Dấu hiệu vi phạm:* có sản phẩm thiết kế nhưng không có bản ánh xạ giao diện và dữ liệu tương ứng.

**N2. Cấm đưa kết quả ra sản xuất khi chưa qua cổng kiểm soát.**
- *Vì sao tuyệt đối:* cổng là nơi duy nhất bắt lỗi trước khi nó chạm người dùng thật.
- *Dấu hiệu vi phạm:* phát hành mà không có bằng chứng đã đối chiếu với đặc tả và ràng buộc.

**N3. Cấm để AI tự ra quyết định kiến trúc hoặc chiến lược.**
- *Vì sao tuyệt đối:* đây là trao quyền không kèm trách nhiệm; vi phạm trực tiếp P7.
- *Dấu hiệu vi phạm:* một thay đổi kiến trúc xuất hiện trong sản phẩm mà không có bản ghi quyết định do con người duyệt.

**N4. Cấm xóa nhòa ranh giới giữa các dự án độc lập.**
- *Vì sao tuyệt đối:* trộn ranh giới làm hỏng khả năng suy luận về từng dự án và lan rủi ro chéo.
- *Dấu hiệu vi phạm:* một khái niệm, dữ liệu, hoặc cấu hình của dự án này rò sang dự án khác mà không qua một giao diện được tuyên bố.

**N5. Cấm phá vỡ bất biến dữ liệu đã tuyên bố.**
- *Vì sao tuyệt đối:* bất biến là lời hứa mà mọi thứ khác dựa vào; phá nó là phá nền móng âm thầm.
- *Dấu hiệu vi phạm:* dữ liệu tồn tại ở dạng vi phạm quy tắc đã ghi trong đặc tả ràng buộc.

**N6. Cấm bỏ qua một cổng kiểm soát để đi nhanh.**
- *Vì sao tuyệt đối:* một ngoại lệ "chỉ lần này" sẽ thành tiền lệ, và cổng mất hiệu lực.

**N7. Cấm tồn tại hai nguồn sự thật song song cho cùng một thứ.**
- *Vì sao tuyệt đối:* vi phạm P6; hai bản sẽ lệch và phá lòng tin vào toàn bộ hệ thống.

**N8. Cấm tự nghiệm thu công việc của chính mình.**
- *Vì sao tuyệt đối:* không tác nhân nào được phê duyệt sản phẩm do chính nó tạo ra. Kiểm soát viên cũng không có quyền sửa thứ mình kiểm; nó chỉ đọc và báo cáo, việc sửa thuộc về tác nhân khác. Đây là nguyên tắc bốn mắt: người làm khác người duyệt.
- *Dấu hiệu vi phạm:* báo cáo QA do chính tác nhân vừa thi công viết, hoặc kiểm soát viên có diff sửa vào thứ nó kiểm.

**N9. Cấm tác nhân sửa luật quản trị chính nó.**
- *Vì sao tuyệt đối:* không tác nhân nào được thay đổi hiến pháp hay các ràng buộc đang chi phối hành vi của chính nó. Tác nhân được đề xuất sửa theo Điều 9, không được tự tay sửa. Một tác nhân sửa luật rồi tuân theo bản đã sửa thì mọi cơ chế kiểm soát khác đều rỗng nghĩa.
- *Dấu hiệu vi phạm:* diff chạm `playbook/CONSTITUTION.md` hay `04-CONSTRAINTS.md` mà không có phê chuẩn ghi ở CHANGELOG.
- *Ranh giới:* "đề xuất" ở đây bao gồm soạn nguyên văn bản sửa đổi và, sau khi chủ dự án đã phê chuẩn và việc phê chuẩn được ghi nhận trong nhật ký thay đổi tập trung, chép nguyên văn đó vào tài liệu đích theo đường mà ràng buộc cấp dự án quy định. Dựng hoặc siết một cơ chế cưỡng chế nhằm vào chính tác nhân (hook, kiểm tra tự động, cổng) không thuộc phạm vi điều cấm này — đó là nguyên tắc bánh cóc 9.4 đang vận hành. Điều bị cấm là tác nhân **tự tay đổi nội dung luật** rồi tuân theo bản đã đổi.

**N10. Cấm để lộ bí mật.**
- *Vì sao tuyệt đối:* khoá, mật khẩu, và thông tin nhạy cảm không được đưa vào kho mã, không được ghi vào nhật ký, và không được nạp vào ngữ cảnh của tác nhân khi không thực sự cần. Rò rỉ là thiệt hại không thu hồi được: bí mật đã lộ thì phải thay, không thể gỡ xuống.
- *Dấu hiệu vi phạm:* chuỗi khoá, token, mật khẩu xuất hiện trong tệp tracked, log, hay ngữ cảnh tác nhân không cần nó.

### 5.8 Hai hạng điều cấm và Nợ hiến pháp
Không phải điều cấm nào cũng bẻ được, vì một số hậu quả không có khái niệm "trả nợ sau". Điều cấm chia hai hạng:
- **Hạng tuyệt đối (không bao giờ bẻ, kể cả chủ dự án):** N2, N3, N6, N8, N9, N10, và N5 áp trên dữ liệu đã phát hành. Đây là những lằn ranh mà vi phạm tạo ra thiệt hại không đảo ngược; quyền tối cao của con người không vượt khỏi chúng.
- **Hạng có điều kiện (được bẻ tạm trong tình huống sống còn):** N1, N4, N7, và N5 áp trên dữ liệu nội bộ trong lúc di trú. Chỉ được tạm vi phạm nếu ghi thành Nợ hiến pháp.

**Nợ hiến pháp.** Khi chủ dự án quyết định bẻ tạm một điều cấm hạng có điều kiện, phải ghi ngay một khoản nợ gồm: điều khoản bị bẻ, lý do sống còn, hạn trả, và người chịu trách nhiệm trả. Khoản nợ bắt buộc được giải quyết (đưa về đúng luật) trong chu kỳ kế tiếp; quá hạn chưa trả thì tự động leo thang và chặn mọi phát hành mới liên quan. Cơ chế này thay cho hai cực đoan đều hỏng: cấm tuyệt đối khiến dự án bế tắc, và cho qua im lặng khiến điều cấm rỗng nghĩa.

**Mẫu exception record chuẩn.** Mọi khoản nợ hiến pháp và ngoại lệ được ghi theo đúng một mẫu, để các bản ghi so sánh được với nhau và không mỗi lần ghi một kiểu (P6):

```yaml
exception_id: EXC-YYYY-NNN
dieu_khoan_bi_be: "N1 | N4 | N7 | N5-noi-bo"
ly_do_song_con: ""
pham_vi: ""
han_tra: "YYYY-MM-DD"
nguoi_duyet: ""
cach_tra_no: ""
dieu_kien_dong: ""
trang_thai: "open | closed | overdue"
```

> Các luật cấm cụ thể theo công nghệ của từng dự án nằm ở tài liệu ràng buộc cấp dự án, và phải nhất quán với các điều trên.

---

## Điều 6 — Quality Bar (Chuẩn chất lượng tối thiểu)

### 6.1 Định nghĩa "xong"
Một sản phẩm chỉ được coi là xong khi đạt **tất cả** các ngưỡng nguyên tắc sau. Ngưỡng số cụ thể (hiệu năng, thời gian phản hồi, độ phủ kiểm thử) được ủy quyền xuống tài liệu ràng buộc và danh mục kiểm thử cấp dự án; hiến pháp chỉ định nghĩa các chiều bắt buộc phải có.
- Khớp đặc tả và không vi phạm điều cấm nào.
- Dữ liệu có cấu trúc hợp lệ và kiểm chứng được.
- Nội dung phục vụ cả người và máy theo P13.
- Đạt ngưỡng hiệu năng và khả năng tiếp cận tối thiểu của dự án.
- Mọi nợ kỹ thuật được ghi chép; không có nợ ẩn.
- Tài liệu được cập nhật cùng nhịp với sản phẩm, không trễ pha.

### 6.2 Nguyên tắc ngưỡng
Ngưỡng phải là số kiểm được, không phải tính từ. "Nhanh" không phải ngưỡng; một con số thời gian phản hồi tối đa mới là ngưỡng. Việc đặt con số thuộc cấp dự án, việc bắt buộc phải có một con số thuộc hiến pháp.

---

## Điều 7 — Decision Rights & Mechanisms (Quyền và cơ chế quyết định)

### 7.1 Bảng quyền
| Loại quyết định | Người chốt | Vai hỗ trợ |
|-----------------|-----------|------------|
| Định hướng, chiến lược, khẩu vị | Chủ dự án | — |
| Kiến trúc và lựa chọn công nghệ | Chủ dự án phê chuẩn | Tác nhân điều phối đề xuất kèm bản ghi quyết định |
| Đặc tả, luật, mô hình dữ liệu | Tác nhân điều phối soạn | Chủ dự án duyệt |
| Bề mặt, thiết kế | Chủ dự án duyệt | Tác nhân thiết kế đề xuất |
| Thực thi trong khuôn khổ đặc tả | Tác nhân thực thi | — |
| Sửa hiến pháp | Chỉ chủ dự án | — |

### 7.2 Phân loại theo khả năng đảo ngược
Mỗi quyết định phải được khai là cửa một chiều hay cửa hai chiều.
- *Cửa hai chiều* (đảo ngược rẻ): quyết nhanh, không cần nghi thức nặng. Đối xử nó như nghi thức nặng là lãng phí.
- *Cửa một chiều* (khó hoặc không đảo): cần bản ghi quyết định đầy đủ và chủ dự án phê chuẩn. Đối xử nó như cửa hai chiều là liều lĩnh.
- *Lý do:* gắn độ nặng quy trình vào hậu quả, không vào thói quen, là cách giữ vừa nhanh vừa an toàn.

### 7.3 Đường leo thang khi mơ hồ
Tác nhân thực thi và tác nhân thiết kế khi gặp mơ hồ cấu trúc phải leo về tác nhân điều phối; tác nhân điều phối leo về chủ dự án. Mơ hồ bề mặt thuộc cửa hai chiều được tự xử lý có ghi log theo P8. Không tác nhân nào được tự chốt khi đặc tả hoặc kiến trúc còn mơ hồ ở tầng cấu trúc.

### 7.4 Giới hạn của quyền tối cao
Quyền của chủ dự án là tối cao trong khuôn khổ hiến pháp, không vượt ra ngoài nó. Khi một quyết định chiến lược va vào một điều cấm: nếu là hạng có điều kiện, chủ dự án dùng cơ chế Nợ hiến pháp (mục 5.8) để bẻ tạm có ghi chép; nếu là hạng tuyệt đối, không ai bẻ được, kể cả chủ dự án, vì đó chính là các lằn ranh mà hiến pháp tồn tại để bảo vệ ngay cả trước áp lực kinh doanh ngắn hạn.

---

## Điều 8 — Compliance (Kiểm tra tuân thủ)

### 8.1 Điểm kiểm bắt buộc
Hai cổng kiểm soát là điểm kiểm tuân thủ bắt buộc: cổng trước khi thực thi (đối chiếu đặc tả và chỉ dẫn đủ chặt để tác nhân không phải đoán) và cổng trước khi phát hành (đối chiếu sản phẩm với đặc tả và ràng buộc).

### 8.2 Bằng chứng thay cho lời khai
Tuân thủ của tác nhân AI không được dựa vào tự khai, vì tác nhân có xu hướng khẳng định đã tuân kể cả khi chưa. Cổng phải đòi một artifact chứng minh: thứ chỉ tồn tại nếu đã thực sự tuân. Nguyên tắc nền: bằng chứng phải khó ngụy tạo hơn làm thật. Khi vẫn dùng tự khai, nó phải kèm bằng chứng máy đối chiếu được, và mọi lệch giữa lời khai và thực tế là tín hiệu báo động, không phải chuyện nhỏ.

### 8.3 Kiểm toán
Các bất biến dữ liệu được kiểm định kỳ bằng script hoặc rà soát thủ công, không chỉ dựa vào trí nhớ.

### 8.4 Văn hóa xử lý vi phạm
Khi có vi phạm hoặc sự cố, hậu quả là chặn phát hành và truy về nguồn gốc (đặc tả thiếu hay chỉ dẫn sai), không đổ lỗi cho tác nhân. Một tác nhân làm sai theo một chỉ dẫn sai là bằng chứng chỉ dẫn cần sửa, không phải lý do trừng phạt. Mọi sự cố nghiêm trọng phải sinh ra một bài học được ghi lại.

### 8.5 Mặc định từ chối
Mặc định của mọi cổng là từ chối, không phải cho qua. Không có bằng chứng đạt thì coi như chưa đạt; im lặng là trượt. Đây là thứ khiến cổng không lách được, vì lách đòi tạo bằng chứng giả khó hơn làm thật. Cơ chế kỹ thuật hiện thực hóa nguyên tắc này nằm ở `governance/CONTROL_GATES.md`.

---

## Điều 9 — Amendment Process (Cơ chế sửa đổi)

### 9.1 Đề xuất
Bất kỳ tác nhân nào, kể cả AI, phát hiện xung đột, lỗ hổng, hoặc một khuôn mẫu mới đáng nâng lên thành luật, đều có thể đề xuất sửa. Đề xuất phải nêu điều khoản bị ảnh hưởng, lý do, và tác động dự kiến.

### 9.2 Thời gian cân nhắc
Đề xuất sửa nguyên tắc hoặc điều cấm cần một khoảng cân nhắc tối thiểu **7 ngày** kể từ khi đề xuất được ghi nhận trước khi chốt, trừ trường hợp khẩn cấp liên quan an toàn hoặc bảo mật. Mục đích là chống sửa hiến pháp trong lúc nóng vội.

### 9.3 Phê chuẩn và phân loại thay đổi
Phân loại theo hướng tác động, không chỉ theo điều khoản bị đụng:
- Thay đổi **nới lỏng hoặc đổi bản chất** một Nguyên tắc hoặc Điều cấm: thay đổi lớn, chỉ chủ dự án phê chuẩn, tăng số phiên bản chính, và phải vượt ngưỡng bánh cóc (mục 9.4).
- Thay đổi **siết chặt thêm hoặc làm rõ** một Nguyên tắc hoặc Điều cấm, hoặc sửa Quyền quyết định, Chuẩn chất lượng, thêm định nghĩa: thay đổi vừa, tăng số phiên bản phụ.
- Sửa diễn đạt, ví dụ, không đổi nghĩa: tăng số vá.

### 9.4 Nguyên tắc bánh cóc (ratchet)
Các nguyên tắc lõi và điều cấm chỉ được phép **siết chặt thêm**, không được nới lỏng. Một đề xuất làm yếu đi một điều cấm phải vượt một ngưỡng cẩn trọng cao hơn nhiều so với một đề xuất làm chặt thêm, và phải nêu rõ rủi ro mới mà việc nới lỏng tạo ra. Mục đích là chống xói mòn dần dần, kiểu mỗi lần nới một chút cho tiện cho tới khi hiến pháp rỗng nghĩa.

### 9.5 Không hồi tố
Thay đổi chỉ áp cho công việc kể từ ngày hiệu lực, không phán xét lại công việc đã làm đúng theo phiên bản cũ.

### 9.6 Ghi nhận
Mọi sửa đổi phải được ghi vào nhật ký thay đổi tập trung trước khi có hiệu lực.

### 9.7 Bánh cóc cho tầng dự án (Lớp 2)
Tài liệu ràng buộc cấp dự án (overlay) chỉ được thêm ràng buộc chặt hơn so với hiến pháp và luật thực thi dùng chung, không bao giờ được định nghĩa lại hoặc nới lỏng một điều khoản tầng trên. Nếu một dự án thực sự cần nới, đó là tín hiệu phải sửa tầng trên qua đúng quy trình điều này, không sửa trong overlay. Lý do: cho phép nới ở tầng dự án là mở một cửa sau khiến bánh cóc 9.4 rỗng nghĩa, vì mọi ngoại lệ sẽ trốn xuống tầng thấp nhất.

---

## Điều 10 — Change Log

Lịch sử sửa đổi hiến pháp được ghi tập trung tại `CHANGELOG.md` ở gốc playbook, không lưu trùng ở đây, theo P6 và N7.
