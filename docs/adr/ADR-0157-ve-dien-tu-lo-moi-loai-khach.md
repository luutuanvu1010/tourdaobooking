# ADR-0157 — Vé điện tử: lô «Mọi loại khách» cho vé không phân biệt người lớn, trẻ em, người cao tuổi

- **Trạng thái:** **accepted** 2026-11-02 — chủ dự án trong chat, nguyên văn: *«Duyệt»*, sau khi đọc báo cáo nêu rõ điều người thi công tự đổi (lô đúng loại ra trước lô dùng chung, kèm ví dụ) và rủi ro chọn nhầm. Trước đó chủ chọn hướng, nguyên văn: *«Làm trước»*, sau khi đọc hai phương án (làm trước khi triển khai, hay triển khai rồi thêm sau).
- **Nguồn:** lời chủ 2026-11-02: *«Vé harbour tiêu chuẩn chỉ có 1 loại , dành cho cả người lớn, trẻ em và người cao tuổi (không phân biệt)»*. Mẫu của chủ: vé in «Vé tiêu chuẩn», khách cao từ 100 cm. Sheet dịch vụ có giá ba loại khách cho mã `VHB`.
- **Loại:** việc lớn (dữ liệu, cách giữ vé). **Không chạm tiền.** **Không thêm route, không đổi quyền.**
- **Cửa:** hai chiều khi chưa có lô dùng chung nào; đã có thì bỏ giá trị này phải có migration chuyển dữ liệu.
- **Số quyết định chạm quyền/dữ liệu trong lượt duyệt này: 2** (Đ1, Đ2).
- **Xây trên lỗ đang hở:** không (`docs/quyen-hoan.json` không có mục chạm `ve-dien-tu`, kiểm 2026-11-02).
- **Quan hệ với ADR cũ:** **thay** câu «mỗi lô một dịch vụ, một loại khách» của ADR-0153 ở một điểm: lô được khai «mọi loại khách». Các phần khác của ADR-0153, ADR-0156 giữ nguyên. Số 0157: 0154, 0155 đã dùng ở nhánh đặt vé của đối tác.

## Bối cảnh

Mỗi lô vé hiện bắt khai đúng một loại khách, và máy chỉ giữ vé của lô đúng loại đó. Vé Harbour tiêu chuẩn chỉ có một loại dùng cho mọi khách, nên nhân viên phải đoán trước tỉ lệ để chia lô. Đoán lệch thì đơn có trẻ em bị báo thiếu vé trong khi lô người lớn còn dư, dù vé đó dùng được.

## Đ1 — Loại khách của lô có thêm giá trị «Mọi loại khách»

`vdt_batch.pax_group` nhận thêm `ALL`, nhãn trên giao diện và nhật ký là «Mọi loại khách». Chọn một lần lúc tạo lô, không đổi sau đó, như ba giá trị cũ. `vdt_allocation.pax_group` vẫn chỉ nhận ba giá trị cũ, vì mỗi suất luôn thuộc về một khách có loại thật.

Vì SQLite không sửa được `CHECK` tại chỗ, migration dựng lại `vdt_batch` theo trình tự ADR-0003 điều 10, giữ nguyên mọi dòng và mọi trigger. Không dùng cột cờ riêng, vì cột cờ bắt `pax_group` mang một giá trị giả mà câu truy vấn nào quên xét cờ sẽ đọc sai.

## Đ2 — Giữ vé: lô đúng loại trước, lô dùng chung sau

Khi giữ vé cho một loại khách, máy lấy vé từ lô đúng loại đó trước, hết mới sang lô `ALL` của cùng dịch vụ; trong mỗi nhóm vẫn xếp theo hạn dùng gần nhất như hiện nay. Lý do: chỉ xếp theo hạn thì đơn 1 người lớn, 1 trẻ em có thể để người lớn lấy mất vé dùng chung, trẻ em bị báo thiếu vé trong khi lô người lớn còn vé. Đổi lại, vé dùng chung sắp hết hạn có thể chưa được dùng trước; lô đúng loại và lô dùng chung cùng một dịch vụ là trường hợp ít gặp. Em bé vẫn không có vé. Trả vé, huỷ lô, mở ảnh, chống trùng không đổi. Trigger phân bổ ở CSDL nhận lô đúng loại hoặc lô `ALL`, từ chối mọi trường hợp khác.

## Rủi ro còn lại (chủ cần đọc)

Máy không biết một vé có thật sự dùng chung hay không, vì QR không chứa loại khách. Nhân viên chọn nhầm «Mọi loại khách» cho vé chỉ dành cho người lớn thì trẻ em có thể nhận vé người lớn, và máy không phát hiện được. Đây là cùng loại rủi ro với khai nhầm loại khách hôm nay, chủ đã chấp nhận ở ADR-0156.

## Tiêu chí nghiệm thu

1. Tạo lô «Mọi loại khách» được; nhãn đúng ở kho, danh sách lô, khối lô đã huỷ, nhật ký; không lộ chữ `ALL` trên giao diện.
2. Đơn 2 người lớn, 1 trẻ em, 1 người cao tuổi giữ đủ 4 vé từ một lô dùng chung; chạy lại không giữ thừa; mỗi suất mang đúng loại khách.
3. Lô người lớn vẫn không cấp vé cho trẻ em.
4. Có cả lô đúng loại và lô dùng chung thì lô đúng loại ra trước, trong mỗi nhóm vé hạn gần nhất ra trước; đơn 1 người lớn, 1 trẻ em không bị báo thiếu oan.
5. Vé trả về lô dùng chung cấp lại được cho loại khách khác.
6. CSDL từ chối suất mang `ALL`, từ chối phân bổ lệch loại khi lô không phải `ALL`, từ chối đổi loại khách của lô.
7. Migration giữ nguyên mọi dòng đã có của `vdt_batch` và vé con; `sqlite_master` chỉ khác ở `CHECK` của `vdt_batch` và trigger phân bổ.

## Trang ghép (`CLAUDE.md` §9)

| Bảng | Chứa | Thay đổi | Chủ ghi |
|---|---|---|---|
| `vdt_batch` | một lô | `pax_group` nhận thêm `ALL`; dựng lại bảng | `ve-dien-tu` |
| `vdt_allocation` | một suất của khách | không đổi cột; trigger phân bổ nhận lô `ALL` | `ve-dien-tu` |

| Dòng quyền | Áp cho | Thay đổi |
|---|---|---|
| `ve.kho.manage` | nhập lô, đọc kho, huỷ lô, mở ảnh | không đổi; áp cho lô `ALL` như mọi lô |

| Cửa | Cổng máy chủ | Giao diện ẩn/hiện |
|---|---|---|
| Tạo lô `ALL` | `ve.kho.manage`, `kiemLo` | ô «Loại khách» thêm một dòng; không có chỗ ẩn/hiện nào đổi nghĩa |

## Hoàn tác

Chưa có lô `ALL`: bỏ dòng khỏi giao diện, câu giữ vé trả về một loại. Đã có lô `ALL`: phải quyết định từng lô thuộc loại nào trước khi bỏ. Giá trị thừa trong `CHECK` không ảnh hưởng mã cũ.
