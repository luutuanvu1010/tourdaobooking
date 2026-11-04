# Trang ghép — ADR-0162 (bản Development) và ADR-0163 (xoá dữ liệu để thử nghiệm)

> Trạng thái: **NHÁP, CHỜ CHỦ DUYỆT**, cùng hai ADR. Bắt buộc theo `CLAUDE.md` §9 vì lượt duyệt có 2 quyết định. Hồ sơ có ngày: khi đã duyệt thì không sửa lại cho khớp hiện trạng.

## (1) Những bảng này chứa loại thực thể nào

ADR-0163 chạm **mọi bảng dữ liệu**, nên điều cần ghép là: cùng một lệnh xoá gặp những loại rất khác nhau.

| Nhóm (tiền tố bảng) | Thực thể | Điều đặc biệt khi xoá |
|---|---|---|
| Đơn: `orders`, `order_*`, `ord_*` | đơn của khách, dòng dịch vụ, hành khách, điều khoản đã chụp | gốc của sổ tiền, chuyến, vé |
| Tiền: `bil_*`, `ky_*`, `prc_*` | phiếu thu, công nợ, bút toán, kỳ khoá, hoa hồng, cấp đại lý, luật bán | sổ chỉ-thêm; xoá một vế là lệch sổ nên phải xoá cả chuỗi |
| Vận chuyển: `vc_*`, `dsp_*` | xe, chuyến, chi phí, phân công | có luật «sự kiện chuyến đi đôi với nhật ký» (`R-VC-6`) |
| Vé: `vdt_*` | lô, vé, đường dẫn khách | vé đã mở thì không nhập lại được; đường dẫn đã gửi khách sẽ chết |
| Người: `pty_*`, `loc_*`, `stf_*`, `staff`, `aut_*`, `login_*` | hồ sơ khách, đại lý, nhân viên, tài khoản, Face ID, phiên, địa điểm | **một hồ sơ có thể vừa là khách vừa là nhân viên hay đối tác**; xoá hồ sơ kéo theo mọi đơn và sổ của họ |
| Danh mục: `ctl_*`, `catalog_*`, `company_*`, `mnt_*` | dịch vụ, nhóm, hồ sơ công ty, chế độ bảo trì | hồ sơ công ty chủ không xoá được |
| Tin: `ntf_*`, `fbk_*` | thông báo, vé hỗ trợ, tệp kèm | có thể trỏ tới bản ghi đã xoá |
| Nhật ký: `audit*` | nhật ký thao tác | xoá thì mất dấu vết việc cũ |
| **Mới:** sổ xoá | ai đã xoá gì | không bao giờ xoá được |

ADR-0162 không thêm loại thực thể nào. Development có cùng cấu trúc bảng nhưng cơ sở dữ liệu riêng.

## (2) Dòng bản đồ quyền chạm vào

Thứ tự 10 cột: SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR.

| Ô | Giá trị | Ghép với ADR-0163 |
|---|---|---|
| **`data.hard_delete` (MỚI, đề xuất)** | `chiToanQuyen()`: chỉ SUPER_ADMIN là `any` | xem trước, xoá và đọc sổ xoá |
| `admin.manage.superadmin` | `chiToanQuyen()` | đây là cổng gián tiếp: ai được gán Toàn quyền thì có quyền xoá mọi thứ |
| `audit.view` | `chiToanQuyen()` | sổ xoá dùng ô mới, không mở rộng ô này |
| Mọi ô `order.*`, `bil*`, `party.*`, … | không đổi | quyền xoá không đi qua ô nghiệp vụ nào; Quản trị và Kế toán không được thêm gì |

Quyền trên Development dùng cùng bản đồ, nhưng tài khoản Toàn quyền ở đó là tài khoản thử riêng. **Chưa kiểm:** hôm nay có bao nhiêu tài khoản đang giữ Toàn quyền trên bản chính thức; ghi nhớ 27/9 nói việc bớt quyền của một tài khoản «chưa xác nhận đã làm». Chủ cần kiểm trước khi bật ADR-0163.

## (3) Cổng nào canh cửa nào

| Cửa | Cổng | Ghi chú |
|---|---|---|
| Mục «Xoá dữ liệu» trên menu | ẩn với mọi người trừ Toàn quyền | chỉ để gọn màn hình, **không phải cổng** |
| Route xem trước | `can(data.hard_delete)`, còn hạn, đang bật | không ghi gì |
| Route xoá | như trên + `Origin` + xác nhận lại danh tính + lớp chống ghi trùng (ADR-0094) + số đếm khớp lúc xem trước | một lô, sổ xoá cùng lô |
| Câu `DELETE` ở cơ sở dữ liệu | trigger + vé xoá trong cùng lô | lớp giữ thật, kể cả khi mã có lỗi |
| SQL gõ tay trên bản chính thức | trigger vẫn chặn; hook AI vẫn chặn ghi remote | chặn nhầm, không chống người cố ý |
| Sổ xoá | trigger chỉ-thêm, không nhường cho vé xoá | |
| Đưa mã lên Development | `len-dev` + bài so cấu hình | AI được chạy (ADR-0162 Đ5, **nới hàng rào**) |
| Đưa mã lên bản chính thức | `len-chinh-thuc` chủ tự gõ; so bản với Development + đủ cổng cũ | AI không được chạy |
| Dữ liệu giữa hai bản | không có đường nào; khác cơ sở dữ liệu | một lần xoá trên Development không thể chạm bản chính thức |

**Chỗ giao diện bị đổi nghĩa khi bản ghi có thể biến mất** (trước đây không có ca này, vì dữ liệu chỉ đóng chứ không mất):

- Trang đơn, trang hồ sơ, đường dẫn trong thông báo và trong hộp thư có thể gặp mã không còn. Phải hiện câu «Dữ liệu này đã bị xoá», không được hiện lỗi thô.
- Lịch sử đơn, Bảng tin và báo cáo có thể mất dòng. Số trên báo cáo đã xuất trước đó sẽ không khớp nữa.
- Đường dẫn vé và biên nhận đã gửi khách trả về «không tìm thấy».
- Trợ lý Mai có thể trả lời theo chỉ mục cũ tới lần cập nhật sau (chưa kiểm).

## Ghép hai quyết định

ADR-0163 chỉ lên bản chính thức sau ADR-0162, vì chính tính năng xoá phải được thử trên Development trước (ADR-0163 Đ7). Hai quyết định không phụ thuộc ngược: ADR-0162 đứng được một mình nếu chủ không duyệt ADR-0163.

Xoá là đường đi một chiều, và điểm khôi phục chưa từng được diễn tập (HC-5.19). Development là nơi có thể tập khôi phục trước mà không đụng dữ liệu thật; việc tập trên đó có được tính là đạt HC-5.19 hay không thì chủ quyết sau.
