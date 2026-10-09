# Đề xuất: khuôn ba luật xuyên suốt (2026-10-09)

**Trạng thái:** đề xuất, đã qua một vòng kiểm sự thật (người kiểm độc lập, 2026-10-09), chờ chủ dự án duyệt từng điều. Đây là đề xuất thêm điều vào Hiến chương (`docs/ARCHITECTURE.md` Phần I, Điều 5); AI không tự sửa Phần I (Điều 6.4). Số điều bắt đầu từ **5.20** vì kho luật gốc đã dùng 5.18, 5.19 với nghĩa khác (nhiều khách thuê, sao lưu).

## Vì sao
Lời chủ 2026-10-09: *"dường như chúng ta đang đi làm lắt nhắt từng việc mà không phải là ép hệ thống vào 1 khuôn khổ rồi tự suy ra những quy tắc hay việc cần làm?"* Đến hết việc 12, người kiểm độc lập tìm ra **11 lỗi nặng** ở sổ đại lý đợt 1; **ít nhất 6** thuộc hai nhóm lặp lại: (1) tài khoản có quyền Đối tác — cả Đối tác thường lẫn tài khoản vừa là nhân viên vừa là đối tác — thấy hoặc chọn được tiền của bên khác (việc 3, việc 5 hai lần, việc 6); (2) dữ liệu đổi giữa lúc máy đọc và lúc máy ghi (việc 4, việc 6; việc 1 cũng gần loại này). Con số chưa chốt: việc 10, 11, 13, 14 chưa làm.
Hiện trạng luật: Phần I **chưa có** điều nào về "ai thấy tiền của ai" trong Nền tảng (4.4 chỉ nói chứng từ gửi khách). Nhóm "đọc rồi ghi" **đã có luật** ở Phần II (khoá lạc quan, lô có điều kiện) nhưng **không có rào máy chung**, nên việc 4 và việc 6 vẫn lọt. Nhóm giao diện đã có luật "ẩn/hiện phải hỏi bảng quyền" và một rào, nhưng rào đó không đối chiếu với đường gọi của máy chủ; đợt 1 chưa có lỗi nặng nào thuộc nhóm này — điều 5.22 là phòng trước, vì việc 10–11 thêm mục menu và khối hiện tiền.

## Ba điều đề xuất

**5.20 Ai thấy tiền của ai.** Mọi số tiền thương mại chỉ ra khỏi máy chủ qua **một hàm quyết định góc nhìn** cho mỗi loại đối tượng: *văn phòng* / *của mình* / *không có*. Tài khoản giữ quyền Đối tác (kể cả tài khoản lai) nhiều nhất chỉ được *của mình*: số tiền mà người hưởng là chính hồ sơ của nó. Đối tượng cụ thể không phải của mình ⇒ "không tìm thấy"; màn chỉ dành cho văn phòng ⇒ giữ "không có quyền" như hôm nay.
*Phạm vi — bạn chọn (quyết định 1):* **(a) hẹp** — tiền thương mại trên đơn và bảng mức (hoa hồng, giá đại lý, giá vốn, tỷ lệ mua lại); sổ tiền tổng giữ nguyên như ADR-0081 điều 1–2 đã duyệt (tài khoản lai có quyền xem sổ vẫn xem được), xét lại ở đợt 3 khi làm sổ cho đối tác. **(b) rộng** — gồm cả sổ tiền; tài khoản lai mất quyền xem sổ tổng, tức sửa ADR-0081 điều 1–2 bằng ADR mới.
*Rào máy:* bài **"số lạ toàn Nền tảng"** dựng tiếp từ bài tiền xe đang chạy (máy tự liệt kê mọi đường đọc GET, nên đường mới tự vào bài): gieo số lạ vào dữ liệu của bên khác; tài khoản có quyền Đối tác (thường và lai) **không được thấy**; tài khoản văn phòng **phải thấy** (chứng minh bài không rỗng). Đường có tham số cần bảng điền tham số, và mỗi đường đọc phải trả thành công cho ít nhất một tài khoản hoặc nằm trong danh sách miễn có lý do; đường đọc bằng POST, nhật ký, Bảng tin, thông báo phải khai thêm vào bài.

**5.21 Đọc rồi ghi phải gác.** Nâng luật Phần II lên Phần I: lô ghi dựa vào dữ liệu đã đọc trong cùng yêu cầu phải kiểm lại dữ liệu đó ngay trong câu quyết định của lô (`updated_at` hoặc cột `version`, hoặc điều kiện trong câu ghi); thua thì cả lô không ghi gì và người dùng nhận câu "vừa được người khác sửa — tải lại". Người dùng sẽ gặp câu này thường hơn một chút ở chỗ trước đây máy ghi sai lặng lẽ.
*Rào máy:* mỗi chỗ ghi lô **khai** một trong ba cách gác (phiên bản / điều kiện trong câu ghi / không phụ thuộc dữ liệu đã đọc, kèm lý do); bài quét toàn mã đỏ khi có chỗ chưa khai. Đây là rào **chống quên khai** — không tự chứng minh cách gác đúng; mỗi chỗ gác vẫn cần bài chen giữa (mẫu `chenTruocLo`, sẽ gom thành hàm chung). Hiện có **118 chỗ ghi lô ở 28 tệp** phải phân loại một lần.

**5.22 Hiện khi và chỉ khi mở được.** Mục menu, dòng ở trang "Tôi", nút dẫn sang trang khác chỉ hiện cho người mà máy chủ cho mở trang đó; nút ghi chỉ hiện cho người được ghi.
*Rào máy:* gom khai báo menu (hôm nay rải ở hai tệp giao diện) thành **một bảng dùng chung**, mỗi mục khai đường gọi chính của trang; bài duyệt đủ **1024 kiểu ghép quyền**: mục hiện ⇔ đường gọi đó cho phép. Bài phủ quyền, không phủ trạng thái (vd tháng đã khoá).

**Luật sửa khi rào báo đỏ (áp cho cả ba):** chỉ được siết máy chủ hoặc ẩn giao diện; muốn mở thêm gì thì hỏi chủ. **Không bao giờ nới quyền máy chủ cho khớp giao diện.** Sửa chỗ "máy chủ cho mà menu giấu" có thể làm hiện thêm mục cho vài vai — không mở quyền mới, nhưng sẽ báo bạn trước.

## Trang ghép (CLAUDE.md §9)
| Điều | Loại thực thể / dữ liệu | Ô quyền chạm | Cổng canh |
|---|---|---|---|
| 5.20 | bản chụp mức trên đơn, mức hoa hồng, điều khoản người bán; (b) thêm: dòng sổ, số dư từng bên | `order.terms.view`*, `partner.commission.view`, `supply.terms.view`, `money.view`; (b) thêm `ledger.view` | cổng đường gọi + hàm góc nhìn + khối ẩn/hiện giao diện |
| 5.21 | mọi bảng có lô ghi nhiều câu | không đổi quyền | câu quyết định của lô + chuỗi `changes() > 0` |
| 5.22 | không dữ liệu | mọi ô có trang giao diện | cổng đường gọi ⇔ điều kiện hiện mục |
\* ô của việc 5, đang ở bản sửa chưa nhập. Không điều nào mở quyền máy chủ mới. 5.20 xét theo quyền của người xem **cộng** vai của họ trên đơn (người hưởng) nên khớp 5.8; nó không đụng lệch tạm ADR-0029 (luật giá Đối tác xét theo người thao tác — vẫn chờ gỡ theo đúng ADR đó). Mỗi điều được duyệt sẽ có dòng ở bảng thi hành (Điều 6.2) và ở `docs/SO-HANG-RAO.md` khi rào đã thấy chặn thật.

## Hệ quả và thứ tự (đề nghị)
1. Rào 5.20 và rào 5.22 làm **trước việc 10–11** (hai việc này hiện tiền và thêm mục menu). Rào 5.20 có sẵn khuôn chạy được nên nhanh; rào 5.22 phải gom lại khai báo menu.
2. Rào 5.21 (phân loại 118 chỗ) làm song song, xong **trước đợt 2** (đợt 2 ghi sổ nhiều nhất).
3. Đợt 2–3 lập kế hoạch từ một **bảng "sự kiện → dòng sổ"** sẽ lập (Điều 4.2 mới có nguyên tắc, bảng đang rải ở các ADR) cộng ba điều này.
*Chi phí:* chưa ước chắc được — chưa tính phần phải sửa ở những chỗ rào báo đỏ. Tôi sẽ báo lại sau khi dựng xong rào 5.20 (rào nhỏ nhất).

## Bạn quyết
1. Điều 5.20 — duyệt phạm vi **(a) hẹp** (khuyến nghị: không đụng quyết định đã duyệt, xét lại ở đợt 3) / **(b) rộng** / sửa / bỏ.
2. Điều 5.21 — duyệt / sửa / bỏ.
3. Điều 5.22 — duyệt / sửa / bỏ.
