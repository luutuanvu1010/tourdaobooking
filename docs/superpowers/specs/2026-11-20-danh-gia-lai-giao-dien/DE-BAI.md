ĐỀ BÀI: ĐÁNH GIÁ LẠI TOÀN BỘ GIAO DIỆN NỀN TẢNG BẰNG TRỢ LÝ ĐÁNH GIÁ GIAO DIỆN

Tôi là chủ dự án. Tôi dán đề bài này là đã duyệt phạm vi và cách làm, nên bạn không cần hỏi lại, không soạn đặc tả mới, không mở lượt hỏi đáp trước khi làm. Giữa chừng cũng không hỏi tôi: điều bề mặt thì tự quyết và ghi lại; điều chạm dữ liệu thật, quyền, tiền hoặc luật thì không làm, ghi vào mục «Cần bạn quyết» của báo cáo.

1. VIỆC, MỤC ĐÍCH, VAI CỦA BẠN
- Việc: dùng trợ lý `nguoi-danh-gia-giao-dien` để đánh giá lại toàn bộ giao diện của Nền tảng trên bản chính hiện tại, gồm thị giác, bố cục, cấu trúc chung và riêng, trải nghiệm người dùng.
- Mục đích: tôi muốn giao diện mạch lạc, logic, không lỗi thị giác. Tôi sẽ dùng kết quả để chọn sửa họ màn nào trước, và sửa chỗ dùng chung nào để nhiều màn cùng tốt lên.
- «Chung» là thứ dùng lại ở nhiều màn: khung (thanh bên, thanh trên, thanh tab), lưới bố cục, các thành phần dùng chung (nút, ô nhập, bảng, thẻ, huy hiệu trạng thái, trạng thái rỗng) và khuôn của từng loại màn. «Riêng» là nội dung và trình tự của từng màn cho đúng việc của màn đó.
- Đây là lượt đo lại của bước 0 trong kế hoạch đã chốt 13/11, không phải lộ trình mới. Mọi đề nghị sửa gắn vào bước 3 (sửa theo họ màn) của kế hoạch đó.
- Vai của phiên này: điều phối và kiểm. Chỉ chụp, đo, chấm, báo cáo. Không sửa giao diện, kể cả lỗi dễ sửa: người sửa không được tự chấm, và mỗi đợt sửa phải qua ảnh xem trước để tôi duyệt.

2. ĐỌC TRƯỚC (đọc đúng mục, đừng đọc hết)
- Kế hoạch: `docs/superpowers/plans/2026-11-13-kiem-giao-dien-toan-dien-ke-hoach.md`, mục 2, 3 và 5.
- Lượt đo trước: `docs/superpowers/specs/2026-11-13-kiem-giao-dien/BAO-CAO.md` và `PHAT-HIEN.md` cùng thư mục; cách dựng máy thử có dữ liệu: `docs/evidence/2026-11-13-kiem-giao-dien/README.md`.
- Lưới bố cục tôi duyệt 15/11: `docs/superpowers/plans/2026-11-14-buoc-2-luoi-bo-cuc.md`, mục «Lưới».
- Tiêu chí chấm: `docs/TIEU-CHI-GIAO-DIEN.md`. Trợ lý: `.claude/agents/nguoi-danh-gia-giao-dien.md`. Lệnh chụp và đo: `scripts/giao-dien/README.md`.
- Kết quả thử trợ lý và giới hạn của nó: `docs/superpowers/specs/2026-11-20-tro-ly-danh-gia-giao-dien-ket-qua.md`.
- Họ màn Lập đơn đang có đợt sửa đã duyệt, chưa thi công: `docs/superpowers/specs/2026-11-20-toi-uu-giao-dien-tao-don-va-xac-nhan.md`. Vẫn chấm hiện trạng, ghi chú là đang có đợt sửa.

3. TRƯỚC KHI BẮT ĐẦU
- Kiểm không có phiên khác đang làm cùng việc (danh sách nhánh, danh sách thư mục làm việc, đọc lại MEMORY.md). Có thì dừng và báo tôi.
- Làm trong thư mục làm việc riêng, cắt từ bản chính mới nhất; ghi mã lần lưu được chấm vào báo cáo.
- Kiểm trong danh sách trợ lý của phiên có `nguoi-danh-gia-giao-dien`. Không có thì dừng và báo tôi, không thay bằng trợ lý khác: cả đợt dựa trên trợ lý đã được thử.

4. CÁC CHẶNG (mỗi chặng có «xong khi»)

Chặng 1. Bảng phủ, cũng là bảng việc.
- Lập bảng mọi trang trong `PAGES` (`src/shared/sw-policy.ts`) và bộ quyền nào mở được trang nào, sinh từ mã theo cách của `docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/ma-tran-quyen.mjs`, không chép tay.
- Chọn màn để chấm: mỗi trang một lần với bộ quyền dùng trang đó nhiều nhất; chấm thêm bộ quyền khác chỉ khi trang hiện khác đi theo quyền (ví dụ Tạo đơn của Bán hàng và của Đối tác, Đơn hàng của Kế toán). Màn đầu tiên sau đăng nhập thì chấm đủ 11 bộ quyền, vì đó là nơi thấy khung và menu của từng vai. Thêm người chưa đăng nhập cho Đăng nhập, Đăng ký, trang không tìm thấy, trang ngoài mạng; và một màn «không có quyền». Trang không chấm thì ghi lý do.
- Xếp màn vào tám họ màn của lượt 13/11 (bảng T18 trong `PHAT-HIEN.md`); trang chưa thuộc họ nào thì xếp vào họ gần nhất hoặc lập họ mới.
- Thứ tự làm: màn đầu của từng vai; rồi Lập đơn, Đơn hàng, Chi tiết đơn; rồi Tài xế và Vận chuyển; rồi Tiền; rồi Quản trị và Danh mục; rồi màn của đối tác bên ngoài; rồi phần còn lại.
- Trần: 110 màn (một màn là một bộ quyền với một trang, đủ hai khổ). Vượt trần thì cắt từ cuối thứ tự và ghi phần bị cắt.
- Cập nhật trạng thái từng dòng khi làm (chưa chụp, đã chụp, đã chấm), để mất ngữ cảnh vẫn làm tiếp được. Tin báo tiến độ cho tôi: một hai câu, dạng «xong x trên n màn».
Xong khi: mỗi trang trong `PAGES` có một dòng «chấm với bộ quyền …» hoặc «không chấm vì …».

Chặng 2. Chụp một lần, có dữ liệu thử.
- Bạn chụp trước cho mọi màn, trợ lý chỉ chấm trên ảnh có sẵn. Lý do: không chạy hai lệnh chụp cùng lúc, còn chấm trên ảnh có sẵn thì chạy song song được, và đó đúng là cách trợ lý đã được thử.
- Mỗi màn một thư mục bằng chứng riêng có `tom-tat.md` và `anh/`, ở hai khổ 390 và 1280, tạo bằng `doVaGhi` (`scripts/giao-dien/do-lib.mjs`). Mẫu ghép sẵn: `scripts/giao-dien/chay-vi-du.mjs`.
- Lệnh chụp có sẵn chỉ gieo vài đơn hàng, chỉ tự mở được Chi tiết đơn, và chưa áp bộ màu, cỡ chữ công ty đang đặt trên bản chạy thật. Để không chấm trên màn rỗng và sai màu: dựng máy thử theo README của lượt 13/11 (chép kho dữ liệu thử cũ ra bản mới rồi áp các migration còn thiếu, như bước 2 đã làm; không sửa kho cũ), áp tệp giao diện công ty giống bản chạy thật (đọc bằng GET công khai, chỉ đọc), và mở trang chi tiết (xe, chuyến…) bằng mã của dữ liệu trong kho thử. Cách cũ không dùng được thì gieo lại qua API thật bằng `tests/e2e/lib.mjs`.
- Viết phần này thành kịch bản chụp của đợt, đặt ở thư mục bằng chứng của đợt (mục 5). Không sửa gì trong `scripts/giao-dien/`, tài liệu tiêu chí và tệp trợ lý: đổi thước giữa lúc đo thì kết quả không so được; thấy thước sai thì ghi vào mục nợ công cụ.
- Họ màn nào thử hai lần vẫn không có dữ liệu thì chụp màn rỗng và ghi «chấm trên màn rỗng» ở bảng phủ.
- Ảnh và số đo để ngoài kho (ví dụ `~/tourdao-danh-gia-<ngày>/`), vì kho công khai. Kiểm trước và sau khi chụp rằng không để lại tiến trình thử; tiến trình của phiên khác thì chỉ ghi lại, không tắt.
Xong khi: mọi dòng «chấm» của bảng phủ có thư mục bằng chứng; ô nào máy đo báo hỏng hoặc «đo thiếu» được ghi đúng như vậy, không tính là đạt.

Chặng 3. Chấm từng màn bằng trợ lý.
- Giao `nguoi-danh-gia-giao-dien`, mỗi lượt một màn (mức đã thử). Riêng các màn danh mục và thiết lập đơn giản được gộp tối đa ba màn cùng họ một lượt. Tối đa sáu lượt chạy cùng lúc.
- Đề bài mỗi lượt gồm: đường dẫn thư mục bằng chứng; màn nào, bộ quyền nào; người dùng vai đó tới màn này để làm việc gì; màn có dữ liệu thử hay rỗng; mã lần lưu; câu «chấm trên thư mục này, không chụp lại». Không kèm nhận định của bạn về màn đó, để trợ lý không bị dẫn trước.
- Nhận báo cáo nào thì lưu nguyên văn ra tệp ngoài kho ngay, rồi gom các dòng `PHÁT HIỆN` thành một bảng (hàm đọc có sẵn: `docPhatHien` trong `scripts/giao-dien/cham-vi-du.mjs`). Làm việc trên bảng gộp.
- Báo cáo sai khuôn thì giao lại đúng màn đó một lần; vẫn sai thì ghi «chưa chấm được».
- Không tự bỏ hay hạ mức phát hiện của trợ lý. Nghi báo nhầm thì đánh dấu «nghi báo nhầm» kèm lý do và đưa vào mục nợ công cụ.
Xong khi: mỗi màn đã chụp có một báo cáo đúng khuôn, hoặc được ghi tên là chưa chấm được kèm lý do.

Chặng 4. So chéo các màn (phần «chung»).
Trợ lý chấm từng màn riêng và được dặn không báo phần khung tôi đã duyệt, nên phần này bạn tự làm trên bảng gộp, số đo của máy và ảnh (mỗi màn xem nhiều nhất hai ảnh đầu; được giao trợ lý chỉ đọc cho từng câu). Trả lời bốn câu:
a) Lối đi theo vai. Với từng bộ quyền: menu và màn đầu có gom đúng việc của vai đó không, thứ tự có theo việc làm thường xuyên không, tên mục có trùng tiêu đề trang nó mở không.
b) Khuôn theo loại màn. Xếp mọi màn vào vài loại (danh sách, chi tiết, biểu mẫu, thiết lập và danh mục, bảng điều khiển). Trong mỗi loại: tiêu đề, ô tìm và bộ lọc, nút chính, trạng thái rỗng, mức bề rộng (hẹp, vừa, rộng theo lưới đã duyệt) có cùng một khuôn không. Nêu khuôn chiếm đa số và tên các màn lệch khuôn.
c) Một nghĩa, một tên, một hình. Trạng thái, số tiền, ngày giờ, số khách, các nút cùng việc (lưu, huỷ, thêm, sửa) có được gọi và vẽ giống nhau trên mọi màn không. Tên chuẩn tra ở `docs/BANG-THAM-CHIEU.md`; không tự đặt tên mới.
d) Việc đi qua nhiều màn. Chọn năm việc chính (gợi ý: Bán hàng lập đơn, xác nhận, thu tiền; Đối tác tự lập đơn và theo dõi đơn; Kế toán soát và thu tiền; điều phối xếp chuyến xe; tài xế nhận và chạy chuyến). Xếp ảnh các màn theo thứ tự làm rồi trả lời: người dùng có biết bước kế ở đâu không, có phải nhập lại điều đã nhập không, tên và trạng thái có giữ nguyên qua các màn không. Chỉ xét màn vừa tải; điều xảy ra sau khi bấm ghi «chưa kiểm». Kịch bản `hanh-trinh.mjs` của lượt 13/11 còn chạy được thì chạy một lần sau khi đã chụp xong (nó ghi dữ liệu vào kho thử) và ghi kết quả; hỏng thì ghi «chưa kiểm», không sửa kịch bản trong đợt này.
- Mỗi nhận định mang mã C1, C2…, dẫn ít nhất hai màn kèm tên tệp ảnh, và ghi rõ là «nhận định của phiên điều phối», tách khỏi phát hiện của trợ lý (trợ lý đã được thử; phần so chéo thì chưa).
- Trước khi gọi một điểm là lỗi, tra xem đó có phải điều tôi đã duyệt không (khung chung, lưới 15/11, ADR, đặc tả). Nếu phải thì xếp vào mục riêng «quyết định cũ nên xem lại» kèm lý do, không gọi là lỗi.
Xong khi: cả bốn câu có câu trả lời và mỗi nhận định dẫn được bằng chứng.

Chặng 5. Kiểm lại, viết báo cáo.
- So với lượt 13/11: từng mã cũ ghi «đã hết», «còn» hoặc «không kiểm lại được bằng công cụ đợt này». Mã S của lượt 13/11 là số thứ tự phát hiện Nhỏ, khác nghĩa với tiêu chí S1 đến S10 hiện nay; khi nhắc mã cũ thì viết kiểu «13/11-S4».
- Phát hiện lặp lại trên nhiều màn do cùng một nguyên nhân thì gộp thành một dòng kèm số màn.
- Xếp hạng theo ba điều: mức của phát hiện, số người dùng gặp (họ màn nhiều người dùng trước), và số màn cùng được lợi khi sửa.
- Bạn tự mở ảnh xác nhận mọi phát hiện có mặt trong trang báo cáo cho tôi.
- Kiểm lại độc lập: giao `nguoi-kiem-doc-lap` (chỉ đọc) tự chọn mười phát hiện, trong đó ít nhất năm mức Nặng và ba nhận định so chéo, mở đúng tệp ảnh được dẫn để xác nhận; và đối chiếu bảng phủ với thư mục bằng chứng thật. Mục bị bác thì sửa báo cáo trước khi gửi tôi. Ghi «x trên 10 xác nhận» vào báo cáo.
- Phải dừng giữa chừng thì vẫn viết báo cáo cho phần đã xong và ghi rõ phần còn lại.
Xong khi: báo cáo đã sửa theo kết quả kiểm lại.

5. HỒ SƠ ĐỂ LẠI
- Trong kho, chỉ chữ: thư mục `docs/superpowers/specs/<ngày chạy>-danh-gia-lai-giao-dien/` gồm `DE-BAI.md` (chép nguyên văn đề bài này), `BAO-CAO.md`, `PHAT-HIEN.md` (phát hiện theo họ màn, nhận định so chéo, bảng so với 13/11) và `BANG-PHU.md`. Kịch bản chụp ở `docs/evidence/<ngày chạy>-danh-gia-lai-giao-dien/kich-ban/`.
- Ngoài kho: ảnh, số đo, báo cáo từng màn; ghi đường dẫn vào `BAO-CAO.md`.
- Tài liệu sống: chỉ sửa đúng một dòng, là dòng của trợ lý này trong `docs/SO-HANG-RAO.md` (đang ghi «chưa chạy bằng đúng tên»): cập nhật theo sự thật của đợt này.
- `BAO-CAO.md` dài một trang, lời thường, gồm: (1) kết luận ba đến năm câu; (2) mười điểm đáng sửa nhất, mỗi điểm một dòng: người dùng thấy gì, ở màn nào, ảnh số mấy; (3) các điểm sửa một chỗ mà nhiều màn tốt lên; (4) bảng họ màn: số phát hiện mức Chặn việc và Nặng, một câu nhận định, thứ tự đề nghị sửa; (5) so với 13/11; (6) độ tin: kết quả kiểm lại độc lập, màn nào chấm trên màn rỗng, điều chưa kiểm (sau khi bấm, hộp thoại, iPad, iPhone thật, tốc độ, chữ cỡ lớn); (7) nợ công cụ: chỗ trợ lý hoặc máy đo báo nhầm, bỏ sót, hay còn thiếu; (8) tối đa ba điều cần tôi quyết, mỗi điều có khuyến nghị.

6. GỬI TÔI KHI XONG
- Trả lời ngắn theo luật trả lời của kho: bốn mục Đã làm, Đã kiểm, Chưa làm hoặc chưa kiểm, Cần bạn quyết; khoảng 15 dòng, lời thường, không tên tệp hay mã trong thân câu trả lời.
- Gửi ảnh thật của mười điểm đáng sửa nhất bằng tệp đính kèm trong phiên, đánh số 1 đến 10, mỗi ảnh một câu «nhìn vào đâu». Tôi sẽ trả lời theo số: đúng, sai, hoặc không quan trọng. Câu trả lời của tôi dùng để bổ sung bộ ví dụ thử của trợ lý ở một việc sau; đừng tự sửa bộ ví dụ trong đợt này.
- Chạy `npm test` và `npm run typecheck` một lần ở cuối, rồi đưa lệnh nhập bản chính đúng một lần, kèm câu «không cần triển khai».

7. KHÔNG LÀM
- Không sửa `web/`, `public/`, `src/`, `scripts/giao-dien/`, `docs/TIEU-CHI-GIAO-DIEN.md`, `CLAUDE.md`, `.claude/`.
- Không ghi gì lên bản chạy thật; mọi thứ chạy trên máy này với dữ liệu thử.
- Không đưa ảnh hay số đo vào kho.
- Không viết lộ trình mới, không đề xuất tên nút hay nhãn mới, không chấm gu màu sắc.

8. XONG KHI (tôi nghiệm thu theo đúng các dòng này)
1. Mỗi trang trong `PAGES` có một dòng trong bảng phủ.
2. Mỗi màn đã chấm có báo cáo của trợ lý; không ô «đo thiếu» nào được tính là đạt.
3. Mỗi phát hiện dẫn được tới một tệp ảnh và một chỗ trên màn; mỗi nhận định so chéo dẫn ít nhất hai màn.
4. Có kết quả kiểm lại độc lập trên mười mẫu, và báo cáo đã sửa theo kết quả đó.
5. Báo cáo một trang trả lời được ba câu: giao diện yếu nhất ở đâu, nên sửa họ màn nào trước, chỗ dùng chung nào sửa một lần mà nhiều màn tốt lên.
6. Từng mã của lượt 13/11 có trạng thái.
