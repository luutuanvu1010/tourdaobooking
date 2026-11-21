# Bản dùng thử — đặc tả ngắn và kết quả bước 0 (Việc 1, kế hoạch 16 việc 21/11)

> Hồ sơ có ngày 2026-11-21. Bước 0 là thử kỹ thuật **ở máy**, không tạo tài nguyên Cloudflare nào. Kế hoạch gốc: `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` (nhánh `claude/partner-features-detailed-plan-f32f89`), mục 5 «Việc 1». Quyết định kèm theo: `docs/adr/ADR-0223-ban-dung-thu.md` (đề xuất).

## 1. Việc gì, cho ai, vì sao

Chủ muốn có một tài khoản để người ngoài (đối tác mới, nhân viên mới, người đang cân nhắc) tự bấm thử Nền tảng mà không chạm dữ liệu thật. Không làm được trên bản chính: cơ sở dữ liệu thật có 155 trigger cấm xoá, sổ tiền chỉ-thêm và luật «không xoá cứng» (Hiến pháp N5), nên dữ liệu thử để trong đó thì không bao giờ dọn được và sẽ lẫn vào công nợ, lượt soát tiền 7 giờ sáng. Vì vậy dựng một **bản dùng thử riêng**: Worker, cơ sở dữ liệu và kho ảnh riêng, chạy đúng mã đang phát hành, tự về trạng thái sạch mỗi 2 giờ.

## 2. Kết quả bước 0

### 2.1 Cách làm sạch mỗi 2 giờ: chọn «xoá hết – nạp lại bản mẫu» ngay trong Worker

Tôi thử ở máy bằng đúng lớp D1 mà Worker dùng (`getPlatformProxy` của wrangler, D1 chạy bằng SQLite thật). Kịch bản: `thu-lam-moi.mjs` cùng thư mục. Cách làm: lúc dựng bản dùng thử, máy sinh một **bản mẫu sạch** (toàn bộ lược đồ sau 162 migration + dữ liệu mẫu); mỗi 2 giờ, lịch chạy của chính Worker xoá mọi bảng và view rồi nạp lại bản mẫu, **trong một lô duy nhất** (`db.batch`, tính là một truy vấn và chạy như một giao dịch).

| Đo được ở máy (21/11) | Kết quả |
|---|---|
| Lược đồ sau 162 migration | 209 bảng, 757 trigger (155 trigger cấm xoá), 508 chỉ mục, 72 view; khoảng 519 KB chữ |
| Bản mẫu chỉ có danh mục gieo sẵn (489 dòng) | 1.765 câu, 576 KB; một lần làm mới **2,2–3,3 giây** |
| Bản mẫu thêm 8.000 dòng giả (cặp bảng cha–con có khoá ngoại và trigger cấm xoá), nạp từng dòng một câu | 9.769 câu; **16–22 giây** (sát trần 30 giây) |
| Cùng bản mẫu đó, gộp nhiều dòng vào một câu (mỗi câu ≤ 60 KB) | 1.353 câu, 951 KB; **1,6–2,8 giây** |
| Bảng có dữ liệu và trigger cấm xoá | `DELETE` bị chặn (đúng); `DROP TABLE` vẫn xoá được, kể cả bảng cha khi để kiểm khoá ngoại tới cuối giao dịch |
| Sau làm mới | Dòng người thử thêm và bảng lạ đều mất; đủ 1.546 đối tượng, đủ 162 dòng `d1_migrations` |
| Lô hỏng giữa chừng | Không mất gì (cả lô quay về trạng thái trước) |

**Chưa kiểm trên D1 thật** (chỉ kiểm được khi chủ đã tạo bản dùng thử): một lô thật có nhận khoảng 1.400 câu và gần 1 MB không; giới hạn 30 giây áp cho cả lô hay từng câu. Đây là bước nghiệm thu đầu tiên. Đường lui nếu lô thật bị từ chối: chia thành vài lô, kèm một cờ «đang làm mới» ở nơi giữ trạng thái khoá (đăng nhập dùng thử báo «đang làm mới, thử lại sau một phút»); khi đó **không còn nguyên tử**, hỏng giữa chừng thì lần chạy sau làm lại từ đầu.

### 2.2 Vì sao không chọn Time Travel

Time Travel (quay cơ sở dữ liệu về một mốc) không tốn tiền, nhưng có ba vướng:
1. Chỉ gọi được bằng `wrangler` hoặc API của Cloudflare, nên cần một **khoá API** đặt trong Worker dùng thử hoặc ở một máy chạy suốt ngày. Tôi **chưa xác minh** khoá API D1 có giới hạn được vào một cơ sở dữ liệu hay không. Nếu chỉ cấp được cho cả tài khoản, một khoá nằm trong Worker dùng thử với tới được cả cơ sở dữ liệu thật — đúng điều bản dùng thử sinh ra để tránh.
2. Mốc đã lưu cũ đi sau mỗi migration mới: quay về mốc là quay luôn lược đồ về bản trước, lệch mã đang chạy. Phải chụp mốc lại sau mỗi lần phát hành.
3. Có giới hạn 10 lần quay mỗi 10 phút và mốc chỉ giữ 30 ngày, nên cần thêm việc «chụp lại mốc» định kỳ.

Cách «xoá – nạp lại» trong Worker không cần khoá API nào: Worker dùng thử chỉ có đường nối tới cơ sở dữ liệu của chính nó.

### 2.3 Chi phí

Chủ đã xác nhận ngày 21/9/2026 tài khoản Cloudflare đang ở **gói trả phí** (5 USD/tháng, đã trả cho bản chính). Bảng giá đọc 21/11: gói trả phí gồm sẵn 50 triệu dòng ghi D1/tháng, 25 tỉ dòng đọc, 5 GB lưu trữ, 10 triệu lượt gọi Worker; R2 miễn phí 10 GB. Ước lượng thận trọng cho bản dùng thử: mỗi lần làm mới ghi khoảng 15–25 nghìn dòng (tính cả ghi chỉ mục), 12 lần/ngày, cộng đồng bộ danh mục 15 phút một lần ⇒ dưới 10 triệu dòng ghi/tháng, khoảng 1/5 phần gồm sẵn. **Chi phí thêm ước 0 đồng/tháng**; nếu vượt, giá là 1 USD mỗi triệu dòng ghi thêm. Tên miền phụ của `tourdao.vn` không tốn thêm. Nếu một ngày tài khoản về gói miễn phí, bản dùng thử **không chạy được** (trần 100 nghìn dòng ghi/ngày và 10 ms CPU mỗi lần chạy lịch).

## 3. Xong khi

1. Mở địa chỉ dùng thử, đăng nhập tài khoản dùng thử, chọn vai «Đối tác», lập đơn ⇒ đơn có ở bản dùng thử, bản chính không có.
2. Qua mốc làm mới, đơn đó biến mất; danh mục, tài khoản mẫu, hồ sơ đối tác mẫu còn nguyên; dải trên cùng ghi đúng giờ làm mới kế tiếp (giờ Việt Nam).
3. Toàn quyền bấm «Khoá» ⇒ đăng nhập dùng thử báo «đang tạm khoá»; bấm «Mở» ⇒ vào lại được; trạng thái khoá không mất sau mốc làm mới.
4. Không thư, thông báo đẩy, Zalo nào đi ra ngoài từ bản dùng thử.
5. Trên bản chính, lệnh làm mới **từ chối chạy** (bài kiểm máy, quan sát chặn thật một lần); bản chính không có màn chọn vai, vẫn một máy, vẫn bảo mật hai lớp.

## 4. Không làm lần này

Không chép dữ liệu thật (khách, đơn, nhân viên) sang. Không cho chọn vai Toàn quyền. Không nối bản dùng thử với bản chính (trừ khi chủ chọn cách (ii) ở câu 1). Không dùng chung với bản Development (ADR-0162): bản đó chạy nhánh đang thử, bản dùng thử chạy mã đang phát hành.

## 5. Loại việc

Việc lớn (triển khai, quyền) ⇒ có người kiểm độc lập. Cần ADR: có — ADR-0223 (ngoại lệ chỉ trên bản dùng thử của ADR-0187 Đ1 và các luật đăng nhập).

## 6. Câu hỏi cho chủ (gửi qua phiên điều phối)

1. **Khoá / mở bản dùng thử ở đâu?** Khuyến nghị: ngay trên bản dùng thử, bằng tài khoản Toàn quyền của chủ ở đó. Lý do: hai hệ thống vẫn độc lập hoàn toàn, không phải mở đường nối nào từ bản chính; cách kia cần ADR riêng và một khoá bí mật dùng chung giữa hai bản.
2. **Địa chỉ của bản dùng thử?** Khuyến nghị: `thu.tourdao.vn`. Lý do: ngắn, đọc là hiểu, cùng họ với `dev.tourdao.vn` đã duyệt; không dùng tên con của `booking.tourdao.vn` để khỏi nhầm với bản chính và để Face ID tách bạch.
3. **Chấp nhận chi phí?** Khuyến nghị: chấp nhận. Lý do: ước 0 đồng/tháng vì nằm trong phần gói trả phí đã trả; trường hợp xấu nhất vài chục nghìn đồng/tháng.

## 7. Điều AI tự quyết (chủ bác được)

- Trạng thái khoá giữ ở một cơ sở dữ liệu D1 nhỏ thứ hai của bản dùng thử (không phải KV, vì KV có độ trễ tới khoảng một phút sau khi bấm Khoá).
- Giờ làm mới: 0, 2, 4, …, 22 giờ **giờ Việt Nam**; dải trên cùng tính giờ từ cùng một hằng.
- Mọi người đang dùng thử bị đăng xuất ở mỗi mốc làm mới; dải báo trước.
- Bản mẫu không chứa mã PIN hay băm PIN: PIN tài khoản dùng thử và tài khoản Toàn quyền của chủ đặt từ bí mật sau mỗi lần nạp.
- Kho ảnh của bản dùng thử cũng được dọn ở mỗi mốc.
- Tên gọi trên giao diện chờ chủ chọn ở kế hoạch mục 7: «Bản dùng thử» / «Bản trải nghiệm»; tạm dùng «Bản dùng thử».
