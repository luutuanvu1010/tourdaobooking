# Đề xuất ADR-0037 — Phân hệ Vận chuyển, lượt 1a: hồ sơ xe, giấy tờ, tài xế, nhắc hạn

- **Ngày:** 2026-09-27.
- **Người soạn:** phiên điều phối.
- **Trạng thái:** **ĐỀ XUẤT — CHỜ CHỦ DUYỆT.** Nháp ngoài `docs/adr/`; chép vào `docs/adr/ADR-0037-*.md` khi chủ duyệt. Số 0037 kiểm còn trống trên mọi nhánh ngày 27/9 — kiểm lại lúc chép.
- **Nguồn:**
  - chủ chốt 27/9: `docs/superpowers/specs/2026-09-27-van-chuyen-design.md` §0; `2026-09-27-van-chuyen-ra-soat.md` §6 ("1b, 2i", "T2b chọn a");
  - ba báo cáo rà độc lập: phụ lục của `2026-09-27-van-chuyen-ra-soat.md`.
- **Điều kiện trước:**
  - **T2b** (`2026-09-27-de-xuat-t2b-ho-so-tour-dao.md`) được duyệt và gộp TRƯỚC, vì xe công ty có chủ là hồ sơ Tour Đảo;
  - ô quyền trỏ tới cách chia `admin.manage` của **ADR-0038** (phiên siết quyền Quản trị).

## Bối cảnh

Chủ yêu cầu phân hệ quản lý xe đúng Hiến chương / Oracle. Rà sâu (ba người độc lập) thấy phần **điều xe và chuyến xe (1b)** đứng trên ba nền chưa có:
- số khách hiệu lực một nguồn;
- chặng đưa đón + danh sách hành khách ở `orders`;
- tiền tố `ord_`.

Chủ chọn làm trước **lượt 1a** — phần không cần Đơn hàng: hồ sơ xe, giấy tờ xe, tài xế, giấy tờ của người, danh mục, và danh sách giấy tờ sắp hết hạn.

## Quyết định (3 — tối đa một lượt duyệt)

### D1. Phân hệ Vận chuyển, lượt 1a: xe + giấy tờ xe + danh mục + danh sách sắp hết hạn

- **Module mới `van-chuyen`**, hạng STRICT, tiền tố bảng `vc_`, tiền tố view `vc`.
  - Bổ sung ADR-0002 điều 2 (tiền tố) và đồ thị: `van-chuyen → parties` (đọc view/hàm công bố), `→ audit` (`auditStatement`).
  - Không module nào import `van-chuyen`.
- **Xe** (thực thể có vòng đời; Hiến chương 2.2):
  - biển số (duy nhất trong các xe đang dùng), **số khung** (định danh bền), tên/đời xe;
  - **số người được chở, không kể tài xế** — tham số từng xe, INTEGER > 0 (chủ chốt; giấy cũ ghi 16 chỗ thì nhập 15);
  - **chủ xe** = khoá tới hồ sơ (lượt 1a: hồ sơ Tour Đảo — hàm công bố của T2b);
  - trạng thái vòng đời: *đang dùng / bảo dưỡng / ngừng* — tập đóng `CHECK`, đổi bằng ADR;
  - có ngày hiệu lực; không xoá cứng (5.5); cột dấu vết; khoá lạc quan.
- **Giấy tờ xe** (thực thể do bên ngoài cấp, thuộc xe):
  - loại (danh mục), số, ngày cấp, ngày hết hạn (rỗng = không hạn).
  - **Gia hạn = thêm dòng mới, không sửa đè.** Sửa sai phải có lý do (danh sách đóng) và nhật ký trước→sau.
- **Danh mục sửa được trong app** (mẫu `loc_location`: cột dấu vết, `active`, khoá lạc quan, nhật ký cùng lô):
  - "loại giấy tờ xe": mã, tên, có hạn hay không, thứ tự.
  - Giá trị mặc định là dữ liệu tra ngày 27/9, **chủ xác nhận**, sửa được trong app:
    - Đăng ký (không hạn);
    - Kiểm định;
    - Bảo hiểm TNDS;
    - Phù hiệu xe hợp đồng;
    - Giám sát hành trình;
    - Camera người lái.
- **Danh sách "giấy tờ sắp hết hạn"** (xe + tài xế) trong phân hệ Vận chuyển:
  - Giấy tờ tài xế đọc qua view công bố của `parties`, không số.
  - Ngưỡng "sắp hết hạn" (số ngày) là **chính sách có ngày hiệu lực**. Chỉ Toàn quyền sửa (`settings.ops`, theo 2a). Mặc định 30 ngày.
  - **Chưa lên chuông** — hộp thông báo hôm nay chỉ chiếu sự kiện nhật ký và tin tay. Nhắc theo thời gian là cơ chế mới, để sau.
- **Để sang lượt 1b** (không có gì đọc chúng ở 1a):
  - bộ điều kiện xuất bến;
  - khoảng nghỉ;
  - bảng hạng GPLX → số khách tối đa;
  - chuyến, điểm dừng, phân bổ khách;
  - quyền app tài xế.

### D2. Giấy tờ của người ở hồ sơ người (`parties`), bảo vệ CCCD, ô ghi giấy tờ

- **Một chỗ cho mọi giấy tờ của một người** (chủ chốt 27/9: "dữ liệu thuộc về người"):
  - loại (danh mục "loại giấy tờ của người": CCCD, GPLX, Khám sức khoẻ, Tập huấn nghiệp vụ vận tải; sau này thẻ HDV, bằng thuyền trưởng);
  - số, ngày cấp, nơi cấp, ngày hết hạn;
  - **hạng** (cột có kiểu; chỉ dùng với GPLX; danh mục hạng B, D1, D2, D, và hạng cũ B2, C, D, E).
  - Gia hạn = thêm dòng mới. Sửa sai có lý do.
  - Số CCCD là duy nhất trên các hồ sơ đang mở (một số — một người, OR:32).
- **Nghĩa của hạng** (chở tối đa bao nhiêu khách) là **luật của Vận chuyển**, làm ở 1b — không nằm ở `parties`.
- **Bảo vệ dữ liệu cá nhân:**
  - Số CCCD và số GPLX **che** trong mọi danh sách.
  - "Xem đủ số" cần ô quyền riêng; mỗi lần xem ghi nhật ký **không kèm số**.
  - Nhật ký, Bảng tin, thông báo **không bao giờ** chứa số giấy tờ, tên kèm năm sinh, hay chữ tự do của giấy tờ. Siết Hiến chương 5.12 theo 9.7.
  - Có hàng rào kiểm và dòng sổ hàng rào (P16).
  - View `parties` cho Vận chuyển chỉ có: loại, hạng, hạn, trạng thái — không số.
- **Ô quyền mới, có tên** — người giữ khớp cách chia `admin.manage` của ADR-0038:
  - "ghi giấy tờ của người": khuyến nghị Quản trị + Toàn quyền. **Không** cho người chỉ điều xe, vì ai sửa hạn là mở khoá xuất bến (1b).
  - "xem đủ số giấy tờ": khuyến nghị Quản trị + Toàn quyền.
  - Danh mục "loại giấy tờ của người" và "hạng": Quản trị sửa (theo 2a).

### D3. Tài xế ở lượt 1a là vai hồ sơ "Tài xế" (đưa đón) có sẵn, không tài khoản

- Dùng lại mã vai `DRIVER` "Tài xế (đưa đón ≠ taxi)" đang có ở nhóm không sinh quyền (`migrations/0011`:76). Gán ở màn Hồ sơ, **không cần tài khoản** (vai nhóm nội bộ/ngoài buộc gán qua màn Tài khoản và sinh quyền đăng nhập — `parties/index.ts`:54-55, `roles.ts`:27-37).
- **Được lái hay không xét bằng giấy tờ** (GPLX còn hạn, đúng hạng — 1b), **không** xét bằng vai (ADR-0001:21).
- **Lượt 1b:**
  - thêm vai tài khoản "Tài xế công ty" (nhóm nội bộ) + quyền app "Tài xế" — tài xế xem chuyến của mình qua danh sách trường được phép;
  - ADR của 1b quyết việc chuyển người đang mang `DRIVER` sang vai tài khoản.
- **Lượt 2:** "Tài xế đối tác" (nhóm ngoài) + sửa LC-1 (ADR-0018) để người ngoài không bị ép thành bên đặt.

## Hệ quả

- **Dữ liệu:** migration chỉ-thêm, số trống kế tiếp (0026 đã có chủ). `docs/data-dictionary.json` + `npm run dict`.
- **Hàng rào mới** (mỗi cái có dòng sổ hàng rào và ngày thấy chặn):
  - trigger cấm sửa đè giấy tờ đã có dòng mới;
  - trigger không xoá;
  - bài "nhật ký không chứa số giấy tờ";
  - che số trong DTO;
  - kiểm quyền "xem đủ số".
- **Giao diện:** màn Xe (danh sách, thêm, sửa, ngừng), giấy tờ xe, giấy tờ trong hồ sơ người, danh mục, danh sách sắp hết hạn — theo khuôn màn Địa điểm/Danh mục hiện có. Chủ muốn đẹp theo thiết kế riêng thì vẽ Claude Design trước.
- **Việc lớn** (dữ liệu + quyền + dữ liệu cá nhân) ⇒ người kiểm độc lập ở cuối.
- **Thứ tự:** T2b gộp → ADR-0038 chốt ô → thi công 1a (phiên riêng).
- **Thay/sửa quyết định cũ:**
  - ADR-0002 (thêm module, tiền tố) — bổ sung;
  - ADR-0013:21 (`party.staff.write`) — giấy tờ theo ô mới của D2;
  - không đụng ADR-0006 và ADR-0018 ở lượt 1a (để 1b và lượt 2).

## Trang ghép (CLAUDE.md §9)

| Hỏi | Trả lời |
|---|---|
| Bảng nào nhận loại dữ liệu mới? | `pty_*` nhận **giấy tờ của người** (loại mới; có số CCCD — dữ liệu cá nhân nhạy cảm); `vc_*` là bảng mới. `audit_log` nhận hành động mới của xe/giấy tờ — không số. |
| Dòng bản đồ quyền chạm các bảng đó áp cho loại nào? | `party.view`/`party.write` hiện có **không** mở giấy tờ; giấy tờ chỉ qua hai ô mới của D2. Ô quản lý xe (Quản trị + Toàn quyền, khớp ADR-0038). Chính sách "ngưỡng sắp hết hạn": `settings.ops`. |
| Cổng nào canh? | Route Vận chuyển sau cổng văn phòng (danh sách mã cổng chốt ở kế hoạch, khớp ADR-0019); route giấy tờ ở `parties` hỏi ô D2 trong thân route; DTO che số; view `parties` cho Vận chuyển không có số. |

## Phương án bị loại
- **Gắn giấy tờ tài xế ở Vận chuyển:** chủ bác, vì CCCD và bằng lái cùng một người thì phải một chỗ.
- **Vai tài xế nội bộ ngay ở 1a:** vai nội bộ buộc sinh quyền đăng nhập, kéo quyền app vào 1a trong khi chưa có chuyến.
- **Nhắc hạn trên chuông ở 1a:** cần cơ chế nhắc theo thời gian mới; danh sách trong phân hệ là đủ cho 1a.
