# Gieo dữ liệu giả cho cuộc đánh giá UX — 27/10/2026

Hồ sơ có ngày (đóng băng). Toàn bộ dữ liệu là **giả**, chỉ nằm trong kho D1 cục bộ `~/tourdao-ux-2026-10-27/`. Không lệnh nào gọi `booking.tourdao.vn` hay `--remote`. Mọi lệnh ghi đi qua API thật của máy chủ thử (`may-chu.mjs`, cổng 8790) dưới đúng tài khoản có quyền; SQL chỉ dùng để **đọc** kiểm (`sqlRows`, `dem-ban-chup.mjs`, `audit-invariants`). Danh mục dịch vụ là bản CSV chỉ đọc của Google Sheet dịch vụ thật (118 dòng, 113 dịch vụ theo người có giá người lớn), máy chủ tự tải ở lần gọi `/api/catalog` đầu tiên.

## Ba bản chụp

Thư mục `~/tourdao-ux-2026-10-27/`. Cả ba chụp khi máy chủ ĐÃ TẮT (không còn `workerd` giữ kho). `d1` hiện = `d1-nhieu`.

| Đếm (SQL đọc, `dem-ban-chup.mjs`) | `d1-tai-khoan` | `d1-it` | `d1-nhieu` |
|---|---|---|---|
| Tài khoản (`staff`) | 12 | 12 | 12 |
| Đơn tổng | 0 | 5 | 45 |
| — nháp | 0 | 1 | 9 |
| — chờ xác nhận (nháp có yêu cầu mở) | 0 | 1 | 4 |
| — đã xác nhận (chưa giao) | 0 | 3 | 21 |
| — đã giao, chưa hoàn thành | 0 | 0 | 1 |
| — hoàn thành | 0 | 0 | 2 |
| — đã huỷ | 0 | 0 | 8 |
| Số người lập đơn khác nhau | 0 | 2 | 5 |
| Ngày đi (sớm nhất → muộn nhất) | — | 27/10 → 01/11 | 14/10 → 09/11 |
| Hồ sơ (`pty_party`, tất cả / không gắn tài khoản) | 13 / 1 | 20 / 8 | 38 / 26 |
| Xe | 0 | 3 | 6 |
| Chuyến (theo trạng thái) | 0 | 1 (kế hoạch) | 8 (6 kế hoạch, 2 đang chạy) |
| Dòng sổ duyệt điều chỉnh công nợ | 0 | 0 | 3 (2 yêu cầu, 1 duyệt) |
| Đề nghị chuyển khách | 0 | 0 | 1 (đang chờ) |
| Báo bận tài xế | 0 | 0 | 1 |
| Vé Hỗ trợ / Góp ý | 0 | 1 | 6 |
| Thông báo hệ thống | 0 | 1 | 2 |
| Mức hoa hồng | 0 | 2 | 2 |

**d1-tai-khoan** (trạng thái RỖNG cho mọi vai): 12 tài khoản, mỗi bộ quyền một cái (bảng ở mục Tài khoản), hồ sơ người đầy đủ do gán vai khi tạo; Toàn Quyền Thử đã gán vai IT. Không có đơn, xe, chuyến.

**d1-it** (dữ liệu ÍT): cờ «cần xác nhận» cho dịch vụ `DTE1` (Tour du thuyền Emperor) — **cờ này đổi hành vi**: mọi đơn có DTE1 phải «Gửi xác nhận» / «Gửi đơn» chứ không xác nhận thẳng được. Mức hoa hồng 10% vai Cộng tác viên, 12% vai Công ty lữ hành (Kế toán đặt, mọi dịch vụ, từ 27/10). Danh bạ: 5 khách lẻ, 1 đại lý tổ chức «Đại lý Biển Xanh Thử» (KHÔNG mang vai — xem chỗ không làm được), 1 nhà xe «Nhà xe Hải Âu Thử» (vai Nhà xe đối tác, Tài Xế Đối Tác Thử «Tài xế của» nhà xe này). Bằng lái: tài xế công ty hạng D1, tài xế đối tác hạng D2. Xe: 79B-123.45 (16 chỗ), 79B-234.56 (29 chỗ) đủ Kiểm định + Bảo hiểm; 79B-345.67 (7 chỗ) Kiểm định hết hạn sau 9 ngày, Bảo hiểm sau 20 ngày — cả hai nằm trong ngưỡng cảnh báo 30 ngày (`vc_expiry_policy.warn_days = 30`, đọc SQL trên `d1-nhieu`). Đơn: 1 nháp (BCT4, 30/10), 1 chờ xác nhận (DTE1, 31/10), 1 đã xác nhận BA dịch vụ (BCT4 có chặng đón 08:00 ngày 28/10 + ATV + BFN1, 3 hành khách có tên, gán Hướng Dẫn Thử), 1 đã xác nhận chạy HÔM NAY 27/10 (BFN1, đón 21:40 tại Novotel — ngoài mốc 6 giờ lúc chạy, không cần đặt gấp, 4 hành khách) xếp lên chuyến hôm nay xe 79B-123.45 + Tài Xế Công Ty Thử, 1 đơn do Cộng Tác Thử lập và «Gửi đơn» (nhánh B → đã xác nhận, BCT24, 01/11). 1 vé Hỗ trợ (Bán Hàng Thử → nhóm Điều hành), 1 thông báo (Toàn quyền → mọi vai nội bộ).

**d1-nhieu** (dữ liệu NHIỀU, = `d1` hiện tại): thêm 16 khách lẻ, khách sạn «Sao Biển Thử», công ty lữ hành «Phương Nam Thử» (chưa tài khoản); 3 xe nữa: 79B-456.78 (45 chỗ), 79H-567.89 (16 chỗ, xe của nhà xe Hải Âu), 79B-678.90 (16 chỗ, CHƯA có giấy tờ — cố ý, để xem cảnh báo). 40 đơn mới do Bán Hàng Thử, Bán Hàng Hai, Thực Tập Thử, Cộng Tác Thử, Lữ Hành Thử lập: 8 nháp; 3 chờ xác nhận (DTE1: hai «Gửi xác nhận» của Bán hàng / Thực tập, một «Gửi đơn» nhánh A của Lữ hành); 12 đã xác nhận rải 28/10 → 08/11 (4 có chặng đón + hành khách, 2 gán HDV); 4 đơn Đối tác «Gửi đơn» nhánh B; 4 đơn ngày đi đã qua (14–25/10) — không xác nhận được nên huỷ; 4 đơn huỷ khác (2 huỷ sau khi xác nhận); 3 đơn hôm nay để Hoàn thành (Kế toán ghi công ty thu đủ tiền mặt → HDV «Đã giao» → Kế toán «Hoàn thành» hai đơn, đơn thứ ba dừng ở Đã giao); 2 đơn gấp hôm nay (đặt gấp «Khách đoàn gọi gấp»). Chuyến: ngày mai 07:30 (đơn ba dịch vụ, xe 16 chỗ, tài xế công ty); 28/10, 03/11 (xe nhà xe + tài xế đối tác, CHƯA có giá — bị giữ «chưa có giá»); 31/10, 06/11 (xe 16 chỗ, tài xế công ty); hai chuyến gấp hôm nay ~16:00–17:50 ĐANG CHẠY (tài xế công ty xe 16 chỗ; tài xế đối tác xe nhà xe, Kế toán nhập giá thoả thuận 900.000 đ), tài xế công ty gửi một đề nghị chuyển một điểm đón sang xe nhà xe (trạng thái chờ lúc gieo; chính sách tự đồng ý sau 10 phút có thể đã đổi nó). Báo bận: Tài Xế Đối Tác Thử 31/10 06:00–12:00. Công nợ đối tác: Cộng Tác Thử tự ghi đã thu 500.000 đ của khách ở đơn của mình (đối tác nợ công ty); Kế toán gửi hai điều chỉnh giảm nợ (50.000 đ chờ duyệt; 30.000 đ Quản Trị Thử đã duyệt — luật hai người). HDV thu cọc 200.000 đ tiền mặt ở một đơn mình phụ trách. 5 vé Hỗ trợ nữa (HDV, Thực tập, Kế toán → nhóm Kế toán, Cộng tác viên, Tài xế công ty → Điều hành), 1 thông báo quan trọng (Bán hàng + Đối tác).

Dữ liệu «hôm nay» gắn với ngày 27/10/2026 (giờ Việt Nam): đánh giá vào ngày khác thì chuyến hôm nay thành chuyến cũ, hai chuyến đang chạy vẫn «đang chạy».

## Tài khoản

PIN do máy chủ sinh khi tạo (route tạo tài khoản không cho chọn PIN; bộ sinh đã loại PIN dễ đoán). Chi tiết + id: `tai-khoan.json`.

| Bộ quyền | Vai | Tên | SĐT | PIN | Đăng nhập thử |
|---|---|---|---|---|---|
| ADMIN + SUPER_ADMIN | IT (gán được, 200) | Toàn Quyền Thử | 0900000900 | 739184 | 200 |
| SALES | SALES_STAFF | Bán Hàng Thử | 0900000901 | 701119 | 200 |
| SALES | SALES_STAFF | Bán Hàng Hai | 0900000902 | 072479 | 200 |
| INTERN | INTERN | Thực Tập Thử | 0900000903 | 716503 | 200 |
| ACCOUNTING | ACCOUNTANT | Kế Toán Thử | 0900000904 | 215162 | 200 |
| ADMIN | DIRECTOR | Quản Trị Thử | 0900000905 | 939026 | 200 |
| FIELD | GUIDE_INTERNAL | Hướng Dẫn Thử | 0900000906 | 745709 | 200 |
| PARTNER | COLLABORATOR | Cộng Tác Thử | 0900000907 | 166698 | 200 |
| PARTNER | TRAVEL_AGENCY (hồ sơ CÁ NHÂN) | Lữ Hành Thử | 0900000908 | 470219 | 200 |
| DRIVER | DRIVER_INTERNAL | Tài Xế Công Ty Thử | 0900000909 | 252821 | 200 |
| DRIVER_PARTNER | DRIVER_EXTERNAL | Tài Xế Đối Tác Thử | 0900000910 | 857929 | 200 |
| HR | HR_STAFF | Nhân Sự Thử | 0900000911 | 248330 | 200 |

Không tài khoản nào bị bắt đổi PIN hay bật bảo mật hai lớp ở lần đăng nhập đầu. Mọi tài khoản NỘI BỘ mới có hạn ân hạn bảo mật hai lớp 14 ngày (`mfa_grace_until` ≈ 10/11/2026); ba tài khoản bên ngoài (2 Đối tác, Tài xế đối tác) không có. Nghĩa là giao diện có thể nhắc «bật bảo mật hai lớp» cho người nội bộ — đáng xem khi đánh giá; sau 10/11 nhắc này thành chặn (403) nếu bản chụp còn dùng.

## Lệnh đã chạy (từ gốc kho)

```
UX_SESSION_SECRET=<chuỗi cố định> node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/may-chu.mjs   # chạy nền
node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/gieo-du-lieu.mjs --chang tai-khoan   # kho phải chỉ có 1 tài khoản
#  tắt máy chủ; cp -R d1 d1-tai-khoan; bật lại
node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/gieo-du-lieu.mjs --chang it           # kho phải = d1-tai-khoan
#  tắt; cp -R d1 d1-it; bật lại
node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/gieo-du-lieu.mjs --chang nhieu        # kho phải = d1-it (5 đơn); đọc du-lieu-gieo-it.json
#  tắt; cp -R d1 d1-nhieu
node docs/evidence/2026-10-27-danh-gia-ux-tong-the/kich-ban/dem-ban-chup.mjs ~/tourdao-ux-2026-10-27/d1-nhieu
node scripts/audit-invariants.mjs --db local --persist-to ~/tourdao-ux-2026-10-27/d1
```

Chặng `nhieu` chạy BỐN lần, mỗi lần chép lại `d1-it` → `d1` trước (lần 1–3 vướng luật: 83 lệnh/28 từ chối, 127/5, 141/10; sửa kịch bản theo luật rồi chạy lại); bản `d1-nhieu` là lần thứ tư. Chặng `it` chạy MỘT lần với bản kịch bản cũ hơn (trước hai thay đổi: bỏ giá `null` khi gửi giá đã xem, đổi tên tệp trạng thái); `du-lieu-gieo-it.json` được dựng lại bằng tay từ tệp trạng thái của lần `nhieu` đầu (cắt về đúng phần của `it`). Chạy lại `--chang it` từ `d1-tai-khoan` bằng kịch bản hiện tại: **chưa kiểm**. Mỗi chặng ghi `nhat-ky-gieo-<chặng>.json` (mọi lệnh ghi + mã trả + câu lỗi nguyên văn) và `du-lieu-gieo-<chặng>.json` (id đơn, xe, chuyến, hồ sơ). Lần chạy cuối của `nhieu`: 143 lệnh ghi, 4 bị từ chối (4 lần thử xác nhận đơn ngày đi đã qua — cố ý giữ để ghi lại luật).

`audit-invariants.mjs` NHẬN `--persist-to` (đọc đầu tệp): chạy trên đúng kho, **thoát 0 — mọi bất biến đạt**, 3 cảnh báo đúng dự kiến: R-VC-14 (xe 79B-678.90 cố ý chưa có giấy tờ — 2 loại thiếu), R-VC-COST-1b (2 chuyến xe nhà xe 28/10, 03/11 chưa có giá), R-CTL-1 (118 dịch vụ danh mục chưa gán nhóm — dữ liệu Sheet thật, không gieo nhóm).

## Chỗ không làm được (đã thử đường hợp lệ, không lách bằng SQL)

1. **Vai Công ty lữ hành cho đại lý TỔ CHỨC**: `POST /api/parties/:id/roles {TRAVEL_AGENCY}` → 409 `role_via_account` «Vai trò này quyết định quyền đăng nhập nên chỉ gán hoặc gỡ ở màn Quản lý tài khoản.» — nhưng màn Quản lý tài khoản chỉ tạo tài khoản trên hồ sơ CÁ NHÂN, nên tổ chức không có đường nào mang vai được hưởng (lỗ đã ghi ở `tests/e2e/so-dai-ly.mjs`). Đã thay bằng tài khoản Đối tác cá nhân «Lữ Hành Thử». Hồ sơ «Đại lý Biển Xanh Thử» tồn tại nhưng không có vai.
2. **Đơn ngày đi đã qua không xác nhận được**: 409 `incomplete_trip` «Chưa đủ thông tin chuyến để xác nhận đơn.» (lý do `past_date`). Nên không có đơn đã xác nhận / hoàn thành ở QUÁ KHỨ; đơn quá khứ chỉ có dạng đã huỷ. Đơn hoàn thành dùng ngày đi hôm nay.
3. **Tài xế công ty không tự báo bận**: `POST /api/van-chuyen/ban` → 403 «Tài khoản này không báo bận được.» (ô `unavailability.self` chỉ mở cho Tài xế đối tác; văn phòng cũng không ghi thay). Chỉ có báo bận của tài xế đối tác.
4. **Tài xế công ty bằng D1 không lái được xe 29 / 45 chỗ**: 409 `khong_du_dieu_kien_lai` «Hạng bằng lái không đủ chở số chỗ của xe». Mọi chuyến của tài xế công ty dùng xe 16 chỗ; xe 29 và 45 chỗ không có chuyến.
5. **Thực tập sinh không chọn được HDV khi lập đơn**: 403 «Tài khoản này không được chọn người phụ trách khi lập đơn. Bỏ chọn hướng dẫn viên rồi lưu lại.» — đơn của Thực tập không gán HDV.
6. «Đề nghị chuyển khách» gửi được (200, chờ), nhưng danh sách «xe nhận» (`GET …/xe-nhan?phamVi=STOP`) trả rỗng ngay trước đó dù xe nhà xe đang chạy cùng giờ — chưa tìm hiểu vì sao (chưa kiểm).

## Khó khăn / câu lỗi liên quan UX gặp khi gieo

- Câu 409 ở mục 1 chỉ người dùng tới «màn Quản lý tài khoản» — nơi KHÔNG làm được việc đó với hồ sơ tổ chức: câu dẫn sai đường.
- «Chưa đủ thông tin chuyến để xác nhận đơn.» cho đơn ngày đi đã qua: câu không nói lý do thật (ngày đi đã qua); lý do chỉ có trong mã `past_date`.
- Ghi khoản thu chuyển khoản bắt buộc mã giao dịch + số tiền theo sao kê (400 `bank_txn_required` «Nhập mã giao dịch ngân hàng và số tiền thực chuyển theo sao kê.») — câu rõ, nhưng là bước thêm Kế toán phải biết trước.
- «Đã giao» khi chưa thu đủ: 409 «Còn thiếu 800.000 ₫ — ghi thêm khoản thu hoặc sửa đơn trước.» — câu rõ, có số tiền.
- Chuyến xe thuê thiếu giá: tài xế đối tác bấm xuất bến nhận 409 «Chuyến xe thuê chưa có giá — Quản trị hoặc Kế toán nhập giá bảng hoặc giá thoả thuận: CX-2710-03» — tài xế bị chặn vì việc của văn phòng; câu có nói ai xử lý.
- Gửi giá đã xem `null` cho hạng khách không có giá → 400 «Dịch vụ 1: giá danh mục đã xem trẻ em phải là số nguyên.» (lỗi của kịch bản, form thật không gửi; ghi để biết câu này lộ chữ «giá danh mục đã xem» nếu có lúc lọt ra).
- Mã `{h7}` (201 thiếu Location) không gặp lần nào.

## Ghi chú cho người điều phối

- Lúc bắt đầu đã có MỘT máy chủ khác (`wrangler dev`, PID 17930) đang chạy trên cổng 8790 cùng kho `d1` (không phải tôi bật, khoá phiên ngẫu nhiên) — trong lúc gieo có hai máy chủ cùng trỏ một kho; tôi đã tắt cả hai khi chụp bản đầu. Số đếm khớp đúng những gì kịch bản tạo và `audit-invariants` thoát 0, nên chưa thấy dấu hỏng kho. Trong lúc tôi chạy, thư mục `kich-ban/` có thêm tệp của phiên khác (`cdp.mjs`, `do-trang.mjs`, `ma-tran-quyen.mjs`…). Ngoài ra có một máy chủ `may-chu.mjs --port 8791 --d1 ~/.claude/jobs/a45f9ae5/tmp/d1-thu` của phiên khác — không đụng.
- Các bản chụp chứa phiên đăng nhập sống ký bằng khoá phiên cố định của lần gieo; bật máy chủ với khoá khác thì cookie cũ vô hiệu, chỉ cần đăng nhập lại (luật một máy: đăng nhập lại sẽ đá phiên cũ).
- `dem-ban-chup.mjs` và `audit-invariants` gọi `wrangler d1 execute --local` lên thư mục bản chụp: chỉ đọc dữ liệu, nhưng wrangler có thể tạo tệp phụ `-shm`/`-wal` trong thư mục.
- Kết thúc: máy chủ cổng 8790 ĐÃ TẮT.
