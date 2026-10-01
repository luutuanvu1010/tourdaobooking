# ADR-0070: Trợ lý Hỗ trợ hiểu cấu trúc app và tự cập nhật theo giao diện

- **Trạng thái:** accepted — chủ dự án duyệt 2026-10-01 qua hộp hỏi. Nguyên văn các lựa chọn:
  - "Hiểu cấu trúc, trả lời lời thường (Recommended)"
  - "Tự sinh mỗi lần triển khai (Recommended)"

  Yêu cầu trong chat: "mở rộng phạm vi kiến thức của Bot với việc đọc trực tiếp sơ đồ thiết kế (để nó hiểu được cấu trúc các module), và thêm gì nữa để nó hiểu và tự động cập nhật khi phần mềm đổi theo về mặt giao diện, thị giác. Bot phải giống như 1 kỹ sư phần mềm, đọc ở phạm vi tổng quát để có thể hướng dẫn người dùng."
- **Sửa / bổ sung:**
  - ADR-0066 điều 3: thêm kho tri thức (d) và (e); (c) trở thành tự sinh lúc build.
  - Luật lõi số 2 của lời nhắc: nới phần "cách hệ thống được xây" ở mức khái niệm.
  - Các điều khác của ADR-0066 và toàn bộ ADR-0069 giữ nguyên.
- **Đặc tả lời thường:** `docs/superpowers/specs/2026-10-01-tro-ly-hieu-cau-truc-dac-ta.md`.

## Quyết định

1. **Kho (d): bản đồ cấu trúc bằng lời thường.** Máy tự sinh từ nguồn có cấu trúc trong mã. Nguồn và cách dùng:

   | Nguồn | Dùng để |
   |---|---|
   | danh sách module + cạnh phụ thuộc (`ALLOWED_EDGES`) | biết phân hệ nào dựa vào phân hệ nào |
   | `PAGES` | danh sách trang |
   | menu thanh bên (`web/shell.ts`) | trang nằm ở menu nào |
   | bảng quyền (`MATRIX` của `src/shared/permissions.ts`) | vai nào làm được việc gì |

   Tên kỹ thuật không đi ra ngoài. Mỗi module và mỗi ô quyền được dịch sang **tên + mô tả lời thường** qua MỘT bảng viết tay (`src/shared/tro-ly-cau-truc-ten.ts`). Nếu thêm module hoặc ô quyền mới mà thiếu tên lời thường, **bộ sinh báo lỗi** và `npm test` đỏ, nên không thể quên.

   Kết quả gồm các đoạn sau, mỗi đoạn một mục trong kho tìm đoạn:
   - các phân hệ, mỗi phân hệ lo việc gì;
   - phân hệ nào dựa vào phân hệ nào ("Điều phối xe lấy khách từ đơn đã xác nhận");
   - luồng chính: đơn → xác nhận → phụ trách → xếp xe → tiền → hoàn tất;
   - mỗi vai làm được / không làm được gì.

   Sơ đồ `docs/so-do-kien-truc/README.md` là **nguồn để người soạn bảng tên lời thường tham khảo**. Nó **không được gửi nguyên văn** sang OpenAI, vì chứa tên bảng, route, hạ tầng.
2. **Kho (e): bố cục trang.** Bộ sinh đọc thêm thứ tự các khối trên từng trang (tiêu đề mục `h2`/`h3`, nhóm nút) để trợ lý nói được vị trí, ví dụ "nút Lưu nháp ở cuối biểu mẫu, dưới phần Dịch vụ", và trang nằm ở nhóm menu nào. Chỉ lấy nhãn chữ và thứ tự, không lấy màu, không lấy ảnh. **Không dùng ảnh chụp màn hình** (chủ đã loại vì chi phí và nguy cơ lộ dữ liệu).
3. **Tự sinh mỗi lần triển khai:**
   - Kho (c) sơ đồ trang, (d) và (e) được sinh lại **tự động trong bước build** mà `wrangler deploy`, `npm run dev` và e2e đều chạy.
   - Kho cũng được sinh lại **trước `npm test`**, nên bài kiểm luôn chạy trên bản mới.
   - Không ai phải nhớ chạy lệnh. Tệp sinh ra không cần viết tay.
   - Cách lưu tệp sinh ra (có theo dõi trong git hay chỉ sinh lúc build) do người thi công chọn và ghi lý do, nhưng không được để bản production lệch mã đang deploy.
4. **Luật lõi số 2 nới ở mức khái niệm:**
   - Trợ lý **được** giải thích như kỹ sư ở mức tổng quát: phân hệ nào lo việc gì, vì sao phải làm bước A trước bước B, vì sao một vai không thấy một nút.
   - Trợ lý **vẫn từ chối**: mã nguồn, tên bảng / cột / hàm / tệp / đường dẫn API, máy chủ và hạ tầng, bí mật, cấu hình, cách lách quyền, giá và tiền của đơn cụ thể, dữ liệu khách.

   Câu từ chối giữ nguyên. Luật lõi vẫn đứng trước lời dặn tuỳ chỉnh (ADR-0069 điều 4).
5. **Hàng rào:** mọi chữ của kho (d), (e) phải qua `viPhamChu`, cộng thêm một bộ lọc **tên kỹ thuật**. Bộ lọc chặn:
   - tiền tố bảng (`ord_`, `vc_`, `bil_`, `pty_`, `stf_`, `tl_`, `ntf_`…);
   - `/api/`, đuôi `.ts` / `.mjs` / `.sql`;
   - tên module tiếng Anh viết thường đứng riêng;
   - `SELECT`, `D1`, `Worker`, `Cloudflare`.

   Có vi phạm thì bộ sinh báo lỗi (không âm thầm bỏ). Hàng rào này phải được quan sát chặn thật bằng đột biến trước khi phát hành.
6. **Chi phí:** giữ ngân sách đoạn gửi đi (khoảng 6.000 token vào). Kho lớn hơn thì **tìm đoạn** chọn lọc, không gửi hết. Trần 5 USD/tháng giữ nguyên.

## Hệ quả
- Kho (d) có thể tiết lộ cách tổ chức app ở mức khái niệm (tên phân hệ tiếng Việt, luồng). Mức này chấp nhận được: nhân viên vốn thấy các phân hệ đó trên menu.
- Thêm module hoặc ô quyền mới nay có thêm một bước bắt buộc: viết tên lời thường cho trợ lý. Máy chặn nếu quên.
