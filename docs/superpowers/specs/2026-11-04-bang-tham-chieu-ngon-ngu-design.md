# Bảng tham chiếu ngôn ngữ: đặc tả (2026-11-04)

**Trạng thái:** chờ chủ dự án duyệt, chưa dựng gì. Chủ đã chọn phạm vi A: ghi các việc quan trọng, trạng thái đơn và từ chuyên ngành, không ghi cả 874 nút.

## Vì sao

Lời chủ, nguyên văn: *«tạo và cố định 1 bảng tham chiếu ngôn ngữ chuẩn, cả từ chuyên ngành cũng như các nút lệnh, giải thích, các khái niệm để toàn hệ thống nhìn vào đó, và AI khi viết, đọc, sửa giao diện không bị nhầm lẫn hoặc suy diễn (Nguyên tắc sự thật duy nhất); giống như lấy giá từ 1 nguồn, lấy từ vựng từ 1 nguồn, có giảng hoặc chú thích ngữ nghĩa»*.

Rà soát nút bấm 4/11 cho thấy gốc lỗi: một lệnh mang ba tên (cấp riêng), một tên chỉ nhiều việc («Đóng»), và AI chép lại chữ cũ từ các quyết định cũ. Hôm nay từ ngữ được định nghĩa ở năm nơi: bảng từ (`src/shared/bang-tu-giao-dien.ts`), `docs/SYSTEM-DESIGN.md` §15, phụ lục B của `playbook/FRAMEWORK.md`, nhãn nhật ký (`src/shared/audit-actions.ts`) và Hướng dẫn. Bảng từ chỉ nói chữ nào cấm, chưa nói chữ nào nghĩa gì.

## Làm và không làm

**Làm:** mỗi khái niệm một tên, mỗi tên một nghĩa, có giải nghĩa; người và AI tra một nơi; máy báo đỏ khi lệch.

**Không làm:**
- Không viết lại 874 nút để đọc chữ từ bảng: tốn mà không an toàn hơn, và làm nặng các trang. Máy so từng nút với bảng, chữ lệch thì không nhập được vào bản chính, nên kết quả vẫn như lấy từ một nguồn.
- Không đổi thêm tên nào ngoài tên chủ đã chọn; không đổi mã nội bộ (`data-action`, đường API, tên cột, mã nhật ký); không migration; không đụng `playbook/` và kho luật gốc.
- Lượt này chưa làm trang giải nghĩa cho nhân viên và chưa nối với Trợ lý Mai.

**Coi là hỏng nếu:** bảng thành thêm một tài liệu không ai mở; nút phụ nào cũng phải xin tên; máy báo sai nhiều tới mức người ta tắt đi.

## Bảng gồm gì

Bảng nằm trong mã, cạnh bảng từ, để máy đọc được; giao diện không nạp nó nên không trang nào nặng thêm. Bản đọc cho người do máy sinh, theo khuôn `npm run dict` sinh `docs/DATA-DICTIONARY.md`. Bảng từ hiện có giữ nguyên vai trò chữ đã loại. Cách kiểm hai chiều theo khuôn bảng sự kiện Vận chuyển chủ đã duyệt 9/10 (`src/shared/bang-su-kien-van-chuyen.ts`).

1. **Khái niệm** (từ chuyên ngành, trạng thái đơn, vai): tên chuẩn · giải nghĩa một câu · khác với khái niệm gần nó thế nào · chữ đã loại · mã nội bộ · chủ chọn ngày nào.
2. **Việc quan trọng** (298 hàng của rà soát, sau khi đổi 12 tên): tên nút chuẩn · thật sự làm gì · đường lệnh và mã nhật ký · có hỏi lại không · hoàn tác được không · nơi đặt nút (tệp và chữ) · tên khác được phép, nếu một việc có hai lối vào · trạng thái *đã chốt* hoặc *chờ chọn*.
3. **Chữ dùng chung:** các chữ theo ngữ cảnh như «Lưu», «Sửa», «Huỷ», «Thêm», được dùng lại vì tiêu đề hộp đã nói đối tượng. Rà soát đếm 43 tên xuất hiện ở hơn một nhóm việc (có lẫn ghi chú trong tên hàng, số thật ít hơn); mỗi tên phải được xếp vào một trong hai loại: chữ dùng chung, hoặc lỗi thật cần đặt tên riêng.

## Máy báo đỏ khi nào (`npm test`)

1. Nút đã khai không mang đúng tên trong bảng.
2. Một tên đã khai, không thuộc chữ dùng chung, xuất hiện trên nút ở chỗ chưa khai. Bài này quét cả 874 nút.
3. Có nút mới mang dấu hiệu ghi dữ liệu, nguy hiểm hoặc nút chính mà chưa có dòng trong bảng hay trong danh sách bỏ qua có lý do. Khai dòng *chờ chọn* là qua, để không chặn việc; danh sách chờ được trình chủ ở lần kế tiếp.
4. Đường lệnh hoặc mã nhật ký khai trong bảng không còn có trong mã.
5. Hướng dẫn gọi nút bằng `[[tên]]` mà tên đó đã loại hoặc không có thật.
6. Bản đọc cho người lệch với bảng.

Cơ chế quét dựa trên `docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/liet-ke-nut.mjs`. Tệp đó là hồ sơ có ngày, nên chép sang chỗ của kịch bản rồi mới sửa.

**Giới hạn phải nói thẳng.** Máy kiểm tên có nhất quán, không kiểm tên có đúng sự thật: cột «thật sự làm gì» dựa vào người đọc mã, và hành vi đổi mà bảng không đổi thì máy không biết. Có 85 nút chữ ghép từ mã: máy đọc được tới đâu thì so tới đó, phần còn lại ghi tên ra và đọc tay. Lời AI trả lời chủ trong trò chuyện thì máy không canh được, phần đó dựa vào kỷ luật.

## «Cố định» nghĩa là gì

Thêm hay đổi tên chỉ khi chủ đã chọn, AI đưa 2–3 tên (luật có sẵn ở ADR-0130). Tệp bảng vào danh sách hỏi quyền như `docs/adr/`: AI sửa bằng công cụ thì chủ được hỏi, sửa bằng dòng lệnh thì bị chặn. Máy không biết chủ có chọn thật hay không, nên phần này vẫn dựa vào kỷ luật.

## AI đọc thế nào

Thêm một dòng ở `web/CLAUDE.md`, `src/CLAUDE.md` và `CLAUDE.md` §6, §7: viết, sửa chữ giao diện thì tra bảng; không có thì đưa tên cho chủ, không tự đặt. `docs/SYSTEM-DESIGN.md` §15 chuyển thành chỗ trỏ về bảng. Các tệp luật này do chủ duyệt khi sửa.

## Luật

Một ADR mới ghi quyết định này và đề xuất điều Hiến chương 5.27: *Mỗi khái niệm một tên, mỗi tên một nghĩa, tra từ một nguồn*. Chủ duyệt đặc tả này thì ADR ghi lại lời duyệt. Ghi điều này ở phần riêng Tour Đảo; có tốt thì đề nghị đưa lên kho luật gốc sau.

## Làm theo đợt

- **Trước đó:** xong việc đổi 12 tên, vì cùng các tệp đó.
- **Đợt 1:** dựng bảng và máy canh, nạp việc quan trọng từ `nut-quan-trong.json`, nạp khái niệm đợt đầu gồm các tên ở cột `thay` của bảng từ, trạng thái đơn, mười vai và các khái niệm tiền (chưa đếm, tôi đoán 40–60 dòng). Chủ chỉ đọc phần giải nghĩa khái niệm; 298 việc thì không phải đọc, chúng đã có tệp:dòng. Ước chừng nửa ngày, chưa chắc. Việc này đụng luật nên có một người kiểm độc lập, một vòng ở cuối.
- **Đợt 2:** trình chủ theo lô các tên còn *chưa rõ* (99 hàng, nhiều hàng chỉ thiếu ý nhỏ), trả lời «theo khuyến nghị» được.
- **Để sau:** trang giải nghĩa cho nhân viên, Trợ lý Mai đọc bảng.

## Tiêu chí nghiệm thu

Mỗi điều phải quan sát thật một lần rồi hoàn nguyên, ghi vào `docs/SO-HANG-RAO.md`:

1. Đổi chữ một nút đã khai thì `npm test` đỏ và nêu đúng nút, đúng tên chuẩn.
2. Thêm nút mang tên đã khai ở chỗ chưa khai thì đỏ; thêm nút «Lưu» ở chỗ mới thì không đỏ.
3. Thêm nút mới có gọi lệnh ghi mà không khai thì đỏ; khai dòng *chờ chọn* thì xanh.
4. Khai sai đường lệnh hoặc mã nhật ký thì đỏ.
5. Bài trần dung lượng `src/goi-trang-nhe.test.ts` vẫn xanh, không nới trần.
6. Mọi khái niệm *đã chốt* có giải nghĩa và có nguồn ghi ngày chủ chọn.

## Để người thi công tự quyết

Tên tệp và cách chia tệp bảng; cách nhận diện một nút ổn định khi số dòng đổi; khuôn cụ thể của bản đọc; cách đánh dấu nút chữ ghép. Giữ đúng các điều trên là đủ.
