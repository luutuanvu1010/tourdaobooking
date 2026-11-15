# ADR-0208 — Tệp của phiếu đăng ký, và việc máy tự dọn phiếu đã kết thúc

- **Trạng thái:** **proposed** 2026-11-15 — AI soạn theo khung đã được chủ duyệt **hướng** ngày 15/11 (`docs/superpowers/specs/2026-11-15-dang-ky-va-duyet-tai-khoan/`). Chờ chủ duyệt; AI không tự duyệt (Hiến pháp N3). Trang trình chủ: `docs/superpowers/specs/2026-11-15-dang-ky-dot-1-luot-a/TRINH-CHU.md`.
- **Số:** 0208 (số lớn nhất trên mọi nhánh và worktree lúc cấp là 0205; 0206, 0207 cấp cùng lượt). Tên giữ chỗ trong khung: `ĐK-3`.
- **Nguồn:** lời chủ 15/11: «Các tệp được đính kèm sẽ lưu ở trong kho R2 (Cloudflare), có thể xem lại - xóa - ẩn .. trong bảng điều khiển của Super Admin». ADR này chỉ lo phần **tệp của phiếu** và việc dọn; màn xem lại, ẩn, xoá của Toàn quyền là đợt 3, ADR riêng.
- **Ngày:** 2026-11-15. **Loại:** việc lớn — dữ liệu (bảng mới, tệp của người ngoài, một lệnh ẩn danh), quyền (một tác nhân tự động mới), triển khai (cùng kho R2 `HO_SO`, không kho mới). Người kiểm độc lập chỉ đọc sau thi công.
- **Cửa:** hai chiều về hành vi; **một chiều** với việc xoá tệp và ẩn danh (không lấy lại được).
- **Quan hệ với ADR cũ:**
  - **ADR-0123** (kho tệp hồ sơ): dùng lại kho `HO_SO`, khuôn kiểm tệp, luật «tải qua máy chủ, nhật ký trước, không lưu đệm», luật «xoá kho chạy sau lô ghi». **Không sửa** bảng `pty_attachment`.
  - **ADR-0125 đ1:** người xác minh mở ảnh của phiếu đang chờ bằng ô `party.verify.attachment`, nhật ký ghi trước.
  - **ADR-0186 Đ1** («ba việc định giờ dựng tác nhân»): thêm **việc thứ tư**. ADR này sửa con số đó; khuôn tác nhân (mã cố định, đúng một ô quyền, không ô tiền, không `admin.manage`, nhật ký mang mã tác nhân) giữ nguyên.
  - **ADR-0126 điều 2, điều 6 và Hiến chương 5.25** («máy không tự ghi», người có quyền bấm xoá): ADR này mở **một ngoại lệ có tên**, chỉ cho dữ liệu của phiếu **chưa bao giờ thành hồ sơ**. Ảnh của hồ sơ vẫn theo luật cũ. Câu chữ ngoại lệ nằm trong điều Hiến chương đề xuất.
  - **ADR-0126 điều 3 và Hiến chương 5.24:** ẩn danh nội dung phiếu theo đúng khuôn «một lệnh có tên, một chiều, nhật ký chỉ mang mã».
  - **Việc đã gác `BL-TEP-PHAT-LAI-500`, `BL-TK-ANH`, `BL-XM-ANH`:** ADR này **không** mở các việc đó. Chúng thuộc đường tải ảnh của người đã đăng nhập (đợt 5).
- **Xây trên lỗ đang hở: HC-5.19** — cùng dòng với ADR-0206. Riêng cho tệp: khôi phục D1 về trước một lần xoá tệp thì dòng tệp quay lại «đã lưu» mà kho không còn đối tượng; route mở trả 404 và ghi lỗi, không lộ gì (cùng giới hạn ADR-0144, ADR-0196 đã nêu). Sau khi khôi phục phải chạy lại việc dọn, và việc dọn chạy lại được vì là tác nhân định giờ.
- **Hiến chương áp:** 5.3, 5.5, 5.11, 5.12, 5.16, 5.20, 5.22, 5.24, 5.25; điều mới đề xuất. **Lệch có chủ ý:** ngoại lệ có tên của 5.25 nói trên, chỉ hợp lệ khi chủ duyệt điều Hiến chương đề xuất.
- **Số quyết định chạm quyền/dữ liệu:** 1 (cùng lượt với ADR-0206, ADR-0207 — tổng 3).

## Bối cảnh

Người đăng ký phải gửi ảnh giấy tờ trước khi có hồ sơ. Bảng tệp hôm nay không chứa được ảnh đó: mỗi dòng `pty_attachment` bắt buộc thuộc một hồ sơ có thật (`party_id` không rỗng), trigger cấm đổi hồ sơ của một dòng, và trigger của dòng nối đòi dòng giấy tờ thuộc đúng hồ sơ của tệp. Trong khi đó ADR-0206 cấm sinh hồ sơ trước khi duyệt.

Hôm nay đường tải lên và mở xem tệp hồ sơ chỉ Toàn quyền dùng được và chưa có màn hình nào gọi. Máy chủ không tự bỏ được toạ độ chụp trong ảnh (`BL-TEP-EXIF`); đã có sẵn hàm thu nhỏ ảnh ở trình duyệt (`web/thu-nho-anh.ts`), hàm nhận loại tệp theo chữ ký, và khuôn «lô D1 trước, đặt kho sau, đánh dấu đã lưu».

Phiếu bị từ chối, bị rút, bỏ dở sẽ để lại ảnh căn cước của người **không** trở thành đối tác. Giữ các ảnh đó tới khi có người bấm xoá là giữ dữ liệu không còn mục đích.

## Quyết định

**Đ1 — Một bảng «tệp chờ» riêng, do `parties` giữ** (tên giữ chỗ `pty_registration_attachment`; chỉ `parties` ghi bảng và chỉ `parties` chạm kho `HO_SO`). Bộ cột chép `pty_attachment`, với ba khác biệt: không có cột hồ sơ; có **mã phiếu** (một chuỗi do `dang-ky` truyền vào, không khoá ngoại sang bảng của module khác) và **ô** của tệp trong phiếu (ví dụ căn cước mặt trước, mặt sau); có thêm mốc **«đã chuyển»**. Khoá kho cùng dạng `pty/` + 32 ký tự hex với `pty_attachment`, để lúc duyệt dùng lại được. Không lưu tên tệp gốc. Khoá kho và băm nội dung hạng N3. Trigger: không xoá dòng; các mốc đi một chiều; chỉ sửa được cột trạng thái.

**Đ2 — Tải lên** (cổng `dang-ky`, tên giữ chỗ `POST /api/dang-ky/phieu/tep`):

- Chỉ khi phiếu ở `ĐANG ĐIỀN` hoặc `CẦN BỔ SUNG`. Thân là JSON mang nội dung base64 (khuôn sẵn có; luật «thân phải là JSON» của router giữ nguyên).
- Chỉ JPG, PNG, HEIC, PDF, nhận theo chữ ký thật. Chặn cỡ thân yêu cầu trước khi đọc.
- Trần (dữ liệu chính sách của ADR-0206; mặc định đề xuất): **5 MB mỗi tệp**, **8 tệp mỗi phiếu** kể cả tệp đã thay, **20 tệp mỗi giờ mỗi địa chỉ mạng**. Trần 5 MB thấp hơn 10 MB của ADR-0123 vì chưa ai đo bộ nhớ của máy chủ với một thân yêu cầu lớn (`BL-TEP-THAN-HAI-LAN`).
- Thứ tự: kiểm tệp → một lô D1 (dòng tệp chờ ở «chưa lưu», dòng lịch sử phiếu) → đặt kho → đánh dấu đã lưu. Đặt kho hỏng thì không trả 5xx: dòng ở «tải dở dang», người đăng ký thấy «chưa tải xong, hãy gửi lại».
- Thay một tệp là thêm dòng mới cho cùng ô; dòng cũ nhận quyết gỡ trong cùng lô và bị xoá khỏi kho sau lô.
- Route này không đi qua lớp chống ghi trùng (ADR-0206 Đ7), nên **không** mắc lỗi «bấm lại thì báo đã ghi dù ảnh chưa lưu» của `BL-TEP-PHAT-LAI-500`. Chống bấm hai lần bằng băm nội dung: cùng phiếu, cùng ô, cùng băm thì nhận lại dòng đã có.

**Đ3 — Người đăng ký không tải lại được tệp đã gửi.** Trang trạng thái chỉ hiện «đã gửi» hay «chưa tải xong» cho từng ô. Không có route đọc tệp cho cổng `dang-ky`. Cướp được phiên đăng ký cũng không lấy được ảnh giấy tờ.

**Đ4 — Người xác minh mở ảnh** (cổng `accounts`): hỏi `party.verify`, `party.verify.attachment` và `party.view` (ADR-0207 Đ1). Chỉ tệp của phiếu đang ở `CHỜ XÁC MINH`, chỉ dòng đã lưu và chưa quyết gỡ. Ghi nhật ký **trước** khi đọc kho (chỉ mã phiếu và mã tệp). Trả về với `Cache-Control: no-store`, `nosniff`, CSP `sandbox`; không đường dẫn ký sẵn; service worker không đệm. Phiếu rời `CHỜ XÁC MINH` thì route này trả 404 cho mọi tệp của phiếu.

**Đ5 — Lúc duyệt, tệp chờ thành tệp của hồ sơ** (trong lô của ADR-0207 Đ5, do `parties` cấp câu lệnh): với mỗi tệp chờ đã lưu của bản khai được duyệt, chèn một dòng `pty_attachment` cho hồ sơ kết quả, **dùng lại đúng khoá kho** (không chép tệp trong kho), người tạo là người duyệt; chèn dòng nối tới dòng giấy tờ vừa tạo; ghi mốc «đã chuyển» trên dòng tệp chờ. Tệp chờ không thuộc bản khai được duyệt (tệp đã bị thay) nhận quyết gỡ. Bất biến mới: một khoá kho không bao giờ vừa nằm ở một dòng tệp chờ chưa chuyển, vừa nằm ở một dòng `pty_attachment`.

**Đ6 — Ẩn danh nội dung phiếu: một lệnh có tên của `dang-ky`** (khuôn Hiến chương 5.24): thay mọi giá trị cá nhân trong các bản khai của một phiếu (họ tên, số điện thoại, ngày sinh, địa chỉ, số giấy tờ, nơi cấp, chữ ở ô người giới thiệu) và giá trị danh tính (email) bằng dấu ẩn danh; ghi mốc đã ẩn danh. Giữ lại: mã phiếu, loại, trạng thái, loại đối tác xin, các mốc giờ, người xử lý, mã lý do, mã hồ sơ và tài khoản kết quả. Trigger «bản khai bất biến» có điều kiện miễn hẹp cho đúng lệnh này (khuôn migration `0108`). Lệnh chạy:

- **ngay trong lô duyệt** với phiếu `ĐÃ DUYỆT`: từ lúc đó giá trị cá nhân chỉ còn sống ở bảng hồ sơ (mỗi sự thật một nơi);
- **sau số ngày ghi trong chính sách** (mặc định đề xuất: 30 ngày) với phiếu `TỪ CHỐI`, `ĐÃ RÚT`, `HẾT HẠN`: để trong 30 ngày người đăng ký còn vào xem được lý do, và công ty còn trả lời được khi họ hỏi lại.

**Đ7 — Phiếu kết thúc mà không được duyệt thì tệp bị gỡ ngay.** Lô chuyển phiếu sang `TỪ CHỐI`, `ĐÃ RÚT` hay `HẾT HẠN` ghi luôn quyết gỡ cho mọi tệp chờ của phiếu (do `parties` cấp câu lệnh); xoá khỏi kho chạy sau lô. Xoá kho hỏng thì dòng ở «chờ xoá», thấy được và chạy lại được (Hiến chương 5.16).

**Đ8 — Một tác nhân tự động mới** (khuôn ADR-0186; mã giữ chỗ `DON_PHIEU_DANG_KY`), giữ đúng **một** ô quyền mới (tên giữ chỗ «dọn phiếu đăng ký»). Với người, chỉ Toàn quyền có ô này trên bảng, và không có nút hay route nào cho người. Mỗi lượt Cron, tác nhân làm bốn việc, mỗi việc qua `can()` và gọi đúng hàm lệnh của nó:

1. cho hết hạn phiếu `ĐANG ĐIỀN` và `CẦN BỔ SUNG` quá số ngày của chính sách (kèm Đ7);
2. chạy lệnh ẩn danh (Đ6) cho phiếu đã kết thúc quá hạn;
3. chạy lại việc xoá kho cho tệp chờ đang ở «chờ xoá» và «tải dở dang» quá hạn;
4. xoá dòng mã email đã hết hạn.

Mỗi lượt có làm gì thì ghi **một** dòng nhật ký mang mã tác nhân, chỉ gồm các số đếm; không mã phiếu, không khoá kho. Lỗi không ném ra ngoài (ADR-0186 Đ6). Chế độ bảo trì không chặn tác nhân (ADR-0186 Đ7).

**Đ9 — Toạ độ chụp và thông tin kèm ảnh.** Trang đăng ký thu nhỏ ảnh ngay trên máy người đăng ký trước khi gửi (hàm sẵn có): cạnh dài không quá 2000 điểm ảnh, lưu JPG, bỏ thông tin kèm ảnh. Ảnh HEIC mà trình duyệt không mở được, và PDF, gửi nguyên: **máy chủ không bỏ được thông tin kèm trong các tệp đó**.

**Đ10 — Hàng chờ của tệp lỗi.** Toàn quyền có một route xem và chạy lại hàng «tải dở dang / chờ xoá» của tệp chờ (khuôn `GET /api/parties/tep-cho-xoa`, hỏi `party.attachment.view`), chỉ hiện mã. Màn liệt kê mọi tệp, ẩn, xoá theo ý Toàn quyền là đợt 3.

**Đ11 — Nội dung tệp** không vào nhật ký, thư, câu báo lỗi, DTO của phiếu (DTO chỉ mang «đã gửi / chưa tải xong» theo ô), Trợ lý.

## Phương án bị loại

- **Dựng lại `pty_attachment` cho phép chưa có hồ sơ:** bảng chỉ-thêm đang có dữ liệu và trigger khoá định danh; dựng lại là cửa một chiều trên bảng đang chạy, và làm mờ nghĩa «tệp của hồ sơ».
- **Tạo một hồ sơ giữ chỗ cho người đăng ký:** trái Luật 2 của ADR-0206; hồ sơ giữ chỗ sẽ hiện ở Danh bạ.
- **Một kho R2 riêng cho tệp của phiếu:** thêm một kho chủ phải tạo, trong khi tệp được duyệt phải nằm ở `HO_SO` và phải chép sang; dùng chung kho thì lúc duyệt không phải chép.
- **Giữ ảnh của phiếu không duyệt cho tới khi có người bấm xoá:** giữ ảnh căn cước của người không thành đối tác mà không còn mục đích; với lượng phiếu từ internet, việc bấm tay sẽ không theo kịp.
- **Máy chủ tự bỏ thông tin kèm ảnh:** chưa làm được khi không thêm thư viện chạy (`BL-TEP-EXIF`).

## Bài kiểm (đỏ trước, xanh sau)

- Tải lên: sai chữ ký, SVG, HTML: 415. Quá 5 MB: 413. Tệp thứ chín của một phiếu: từ chối. Phiếu không ở `ĐANG ĐIỀN` hay `CẦN BỔ SUNG`: từ chối. Bấm hai lần cùng tệp: một dòng. Kho giả lỗi: dòng «tải dở dang», không 5xx, chạy lại thì xong.
- Sau khi tải lên: không dòng nào mới ở `pty_attachment`, `pty_party`.
- Không có route đọc tệp cho cổng `dang-ky` (ảnh chụp cổng); phiên đăng ký gọi route mở ảnh của người xác minh: 401.
- Mở ảnh: Nhân sự 403; Quản trị 200 khi phiếu `CHỜ XÁC MINH`, 404 khi phiếu đã rời trạng thái đó; có dòng nhật ký trước phản hồi; nhật ký không ghi được thì không trả tệp; phản hồi có `no-store`, `nosniff`.
- Duyệt: mỗi tệp chờ của bản khai được duyệt có đúng một dòng `pty_attachment` cùng khoá kho và một dòng nối; tệp chờ mang mốc «đã chuyển»; kho không có thêm đối tượng nào.
- Từ chối, rút, hết hạn: mọi tệp chờ nhận quyết gỡ trong cùng lô; kho giả lỗi thì dòng ở «chờ xoá», tác nhân chạy lại thì xoá xong.
- Ẩn danh: sau lô duyệt, bản khai không còn giá trị cá nhân; phiếu không duyệt quá hạn thì tác nhân ẩn danh; lệnh chạy lần hai không đổi gì; mọi đường ghi khác vào bản khai vẫn bị trigger chặn.
- Tác nhân: `src/tac-nhan-tu-dong.test.ts` nhận đúng bốn tác nhân, tác nhân mới có đúng một ô, không ô tiền, không `admin.manage`; chỉ mã định giờ dựng tác nhân. Người gọi việc dọn qua bất kỳ route nào: không có route.
- Bất biến mới ở `scripts/audit-checks.mjs`: không phiếu đã kết thúc nào còn tệp chờ chưa quyết gỡ; không khoá kho nào nằm ở hai nơi (Đ5); không dòng «tải dở dang / chờ xoá» quá hạn.
- Bài kiến trúc: chỉ `parties` chạm `HO_SO` (bài `src/kho-tep-ho-so.test.ts` sửa số đếm có chủ đích); chỉ `parties` ghi bảng tệp chờ. e2e cho tải lên → duyệt, và tải lên → rút. Thử iPhone thật: chụp bằng máy ảnh, ảnh HEIC.

## Người dùng sẽ thấy

Người đăng ký bấm vào từng ô để chụp hoặc chọn ảnh; ảnh được thu nhỏ rồi gửi, ô chuyển thành «đã gửi». Họ thay ảnh được khi phiếu còn đang điền, nhưng không xem lại được ảnh đã gửi. Quản trị mở từng ảnh ngay trên màn phiếu. Khi phiếu được duyệt, ảnh nằm ở hồ sơ của đối tác. Khi phiếu bị từ chối, bị rút, hoặc bỏ dở quá hạn, ảnh bị xoá mà không cần ai bấm; ba mươi ngày sau, phần chữ của phiếu cũng được ẩn danh.

## Hệ quả

- Migration số kế tiếp lúc thi công; `docs/data-dictionary.json` + `npm run dict`; cột N3 mới vào tập ghim của `src/hang-du-lieu.test.ts`.
- Sửa có chủ đích: `src/kho-tep-ho-so.test.ts`, `src/tac-nhan-tu-dong.test.ts`, bảng mã tác nhân và quyền của tác nhân ở `src/shared/permissions.ts`, `docs/SO-HANG-RAO.md`. Không kho R2 mới, nên cổng 1e của `npm run trien-khai` không đổi.
- Chính sách riêng tư phải nói rõ: ảnh của phiếu không được duyệt bị xoá ngay; chữ của phiếu giữ thêm số ngày đã định; bản sao lưu của nhà cung cấp còn giữ dữ liệu đã xoá trong số ngày của họ (Hiến chương 5.25).
- **Phải nói thẳng:**
  - Đây là lần đầu **máy tự xoá dữ liệu cá nhân** mà không có người bấm. Phạm vi chỉ là phiếu chưa bao giờ thành hồ sơ; sai luật hết hạn thì mất phiếu của người đang chờ, không lấy lại được ảnh.
  - Người xác minh thấy ảnh căn cước của người **chưa** là đối tác; mỗi lần mở có nhật ký.
  - Ảnh HEIC không thu nhỏ được và PDF vẫn có thể mang toạ độ chụp hay tên tác giả.
  - Chưa có trần tổng dung lượng của kho; chỉ có trần theo tệp, theo phiếu, theo địa chỉ mạng.
  - Phiếu yêu cầu xoá dữ liệu cá nhân (ADR-0126) chưa quét bảng phiếu; người đăng ký dùng «Rút phiếu». Sau khi được duyệt thì dữ liệu đã ở hồ sơ và đi theo ADR-0126.
  - **Chưa kiểm:** bộ nhớ của máy chủ với thân yêu cầu khoảng 7 MB; iPhone chụp HEIC có thu nhỏ được trên Safari không; thời hạn 30 ngày chưa có luật sư xác nhận.
