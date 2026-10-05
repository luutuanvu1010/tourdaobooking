# Đặc tả ngắn: đ9 phân định trách nhiệm sau "Đã giao" (ADR-0088)

> Bắt nguồn từ ba câu hỏi chủ đồng ý 2026-10-06, sau khi nhánh năm lỗi tiền báo cáo.

**Xây trên lỗ đang hở:** TNV-G3, TNV-G4, TNV-VP01 (sổ dừng dây chuyền `docs/quyen-hoan.json`, mức HIGH, hạn 2026-10-31 — cả ba đang hở).

**Bối cảnh:** trên nhánh năm lỗi tiền (`worktree-agent-a705a660a33db03ca`, chưa gộp `main`), AI thi công đã làm xong đ1–đ5, đ7, đ8 của ADR-0088 (I1 xét mọi lúc, lệnh "Thay lần thu", chặn đảo đơn lẻ, chặn Hoàn thành khi lệch) nhưng **dừng ở đ9 — phân định trách nhiệm**, ghi rõ đây là "việc lớn riêng". Nội dung bảng và quy trình dưới đây **chép lại đúng những gì ADR-0088 đã quyết** (chủ duyệt 2026-10-02, câu "7- ok"), không thêm trường hợp nào ngoài ADR.

## Nguyên tắc

Ai gây ra, người đó chịu. Khoản thiếu hoặc khoản bồi thường sau "Đã giao" được chuyển thành **nợ của bên chịu trách nhiệm với công ty**, không ghi "khách còn nợ". Đơn của khách khép đúng sự thật bằng một khoản **"giảm trừ đã phân định"**: phần khách không phải trả hoặc được bồi thường thành giảm trừ trên đơn; cùng lô, ghi dòng nợ "bên chịu → công ty" đúng số đó (trừ T10: bên chịu là công ty, không có dòng nợ). "Đã thu ròng = phải thu" (I1) so với `due_snapshot` trừ giảm trừ này.

## Bảng phân định T1–T11 (chép đúng từ ADR-0088 đ9, đã chủ duyệt)

| # | Trường hợp | Bên chịu (mặc định) | Ghi thế nào |
|---|---|---|---|
| T1 | Ghi lần thu nhầm đơn / nhầm số / nhầm hình thức, tiền có thật | Không ai mất tiền | "Thay lần thu" |
| T2 | Khai đã thu tiền mặt mà thực tế không thu, hoặc thu thiếu | Người khai | Người khai đang giữ hộ số khai (H3), phải nộp |
| T3 | Khai "Công ty thu – CK" mà tiền không về | Người khai | H3: không đảo; Hoàn thành bị chặn tới khi nộp |
| T4 | Ghi nhầm làm sổ báo đủ, HDV chốt Đã giao không thu khách thật | Người ghi nhầm (nếu không đòi lại được khách) | "Thay lần thu" đưa về đúng đơn trước; khoản khách chưa trả thành giảm trừ đã phân định + nợ người ghi nhầm → công ty; đòi được khách thì đảo phần giảm trừ + nợ |
| T5 | Thu đúng nhưng mất hoặc thiếu tiền mặt khi nộp | Người giữ tiền | Số đang giữ chưa nộp (đã có) |
| T6 | Bồi thường khách do lỗi nhân viên (HDV, Bán hàng, tài xế công ty) | Nhân viên gây lỗi, mức do người phân định quyết | Công ty trả khách (giảm trừ sau Đã giao + chi hoàn), đồng thời ghi nợ nhân viên → công ty |
| T7 | Bồi thường do lỗi xe / nhà xe / tài xế đối tác | Nhà xe | Công ty trả khách (giảm trừ + chi hoàn), ghi nợ nhà xe → công ty, gắn theo đơn |
| T8 | Bồi thường do lỗi nhà cung cấp (cano, đảo, nhà hàng) | Nhà cung cấp | Công ty trả khách, ghi nợ nhà cung cấp → công ty (bên nợ là hồ sơ tổ chức nhà cung cấp) |
| T9 | Bồi thường do đối tác / đại lý (sai thông tin khách, hứa sai) | Đối tác | Trừ vào hoa hồng / bù trừ, hoặc nợ đối tác → công ty |
| T10 | Bất khả kháng (thời tiết, cấm biển, sự cố không ai gây ra) | Công ty (không ai "làm") | "Giảm trừ sau Đã giao", lý do "bất khả kháng" |
| T11 | Chưa xác định ngay được ai gây ra | Tạm: công ty, trạng thái "chờ phân định", hạn 7 ngày | Phân định xong thì chuyển sang bên chịu. Quá 7 ngày: vẫn "công ty tạm chịu", hiện đỏ ở danh sách "chờ phân định" của Quản trị và Kế toán; **không tự gán cho ai** |

## Quy trình — hai bước, hai người, có phản hồi (chép từ ADR-0088 đ9)

1. **Phân định:** Quản trị hoặc Toàn quyền chọn trường hợp T1–T11, bên chịu, số tiền, lý do.
2. **Ghi:** Kế toán ghi theo quyết định, trong **một lô**: giảm trừ phần khách (nếu bồi thường) + dòng nợ "bên chịu → công ty", hoặc chuyển khoản thiếu sang bên chịu. **Người ghi khác người phân định.**
3. **Báo và phản hồi:** bên chịu là nhân viên hay đối tác **có tài khoản** thì nhận tin ngay, có **3 ngày làm việc** để phản hồi; phản hồi vào nhật ký của khoản đó, người phân định xem lại. Đây là loại tin thứ ba trong bốn loại mà ADR-0034 đã ghi là "bổ sung" — **đặc tả này làm chủ cho nó** (không lặp ở đặc tả tin báo sổ tiền cùng ngày). Người nhận là một bên cụ thể của một dòng phân định (không phải thuộc tính bền của đơn), nên vướng và cách chọn hướng làm **giống hệt** mục 1/2 của đặc tả tin báo sổ tiền: cần gán id bên chịu lên chính dòng nhật ký phân định (hướng a′), hoặc đọc qua một cạnh `thongbao → billing` mới (hướng b) — không thiết kế lại ở đây, dùng chung lựa chọn với hai mục đó.
4. **Thu hồi:** khoản nợ của bên chịu hiện ở "Sổ của tôi" (nhân viên, đối tác) hoặc sổ công nợ (nhà xe, nhà cung cấp); trả bằng lệnh "nộp" như tiền đang giữ.
5. **Ghi chú pháp lý (ADR đã ghi, cần chuyên gia nhân sự/pháp lý xác nhận riêng):** Nền tảng chỉ ghi nhận trách nhiệm và công nợ; **không tự trừ lương**. Khấu trừ lương (nếu công ty chọn làm) phải theo Bộ luật Lao động 2019 và quy chế công ty, ngoài phạm vi Nền tảng.

**Không đổi:** "khách còn nợ" vẫn không tồn tại (H2 đã bác). Bên chịu luôn là một hồ sơ có thật (nhân viên, nhà xe, nhà cung cấp, đối tác, hoặc công ty).

## Đã kiểm, không phải điểm hở

- **QT2 ("Quản trị hoặc Toàn quyền phân định") không mâu thuẫn với ADR-0090** (Quản trị không có quyền ghi tiền trực tiếp): "phân định" là một **quyết định phân loại**, không phải lệnh ghi tiền — dòng nợ và khoản hoàn vẫn do Kế toán ghi (bước 2). ADR-0088 tự ghi rõ điều này ở bảng "Thay câu nào", nên không phải hỏi lại.

## Chưa chắc — cần chủ xác nhận trước khi chuyển sang kế hoạch

1. **Cách đếm ngày cho cả hai mốc** — T11 "quá 7 ngày" (chữ ADR không ghi "làm việc", nên đề xuất hiểu là ngày lịch — **giả định, xin chủ xác nhận**) và bước 3 "3 ngày làm việc" (có loại trừ thứ Bảy, Chủ nhật, ngày lễ không; Nền tảng hôm nay chưa có lịch nghỉ lễ nào được định nghĩa ở nơi khác). Hai mốc cho hai việc khác nhau (T11: thời hạn giữ trạng thái "chờ phân định" trước khi phân định; bước 3: thời hạn bên chịu phản hồi sau khi đã phân định) nên cần chốt cả hai trước khi viết thành luật cứng.
2. **T7, T8 (nhà xe, nhà cung cấp) không có tài khoản đăng nhập.** ADR chỉ nói "bên chịu là nhân viên hay đối tác **có tài khoản** thì nhận tin ngay, có 3 ngày phản hồi" — vậy nhà xe/nhà cung cấp phân định xong có cần một kênh báo ngoài hệ thống (gọi điện, ghi chú) hay chỉ ghi vào sổ công nợ của họ mà không có bước "phản hồi 3 ngày"? Cần chủ xác nhận trước khi lập kế hoạch, vì ảnh hưởng quy trình chứ không chỉ chữ.

## Sự thật vận hành cần biết trước khi quyết thứ tự làm

Trên nhánh năm lỗi tiền, **hoàn sau "Đã giao" hôm nay bị chặn cứng** (409, theo đúng chữ ADR-0088 đ4 (iv): "trước khi đ9 có mã, hoàn sau Đã giao bị chặn") cho tới khi đ9 có mã. Vì vậy nếu nhánh đó gộp vào `main` trước khi đ9 được lập kế hoạch và thi công, **mọi ca hoàn/bồi thường sau khi đã giao hàng** (ví dụ khách phàn nàn sau tour — KT09) sẽ không ghi được, kể cả qua Kế toán hay Toàn quyền (Quản trị vốn không ghi lệnh hoàn, theo ADR-0026 đ10). Chủ cần biết điều này để quyết thứ tự: gộp nhánh năm lỗi tiền trước rồi làm đ9 sau (chấp nhận giai đoạn chặn hoàn sau giao), hay làm đ9 trước khi gộp.

## Ghi chú cho người lập kế hoạch (không phải câu hỏi cho chủ)

Việc này chạm dữ liệu mới ("giảm trừ đã phân định", trạng thái "chờ phân định" của T11) và `bil_debt_line` nhận thêm loại bên nợ mới (nhà xe, nhà cung cấp) — theo CLAUDE.md §9, lượt duyệt kế hoạch này cần kèm **một trang ghép** (bảng này chứa loại thực thể nào, dòng quyền nào chạm bảng này áp cho loại nào, cổng nào canh cửa nào). Bảng T1–T11 ở trên là **bản chép**; nguồn chuẩn là ADR-0088 đ9 — lệch thì ADR thắng.
