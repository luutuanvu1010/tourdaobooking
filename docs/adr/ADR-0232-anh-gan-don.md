# ADR-0232 — Ảnh chụp lúc làm việc, gắn vào đơn (tên giao diện chờ chủ chọn); kho R2 riêng, giữ tối thiểu 5 năm theo ý luật sư

- **Trạng thái:** **proposed** 2026-11-21 — AI soạn (phiên thi công Việc 13 của kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` ở nhánh `claude/partner-features-detailed-plan-f32f89`, mục 5 «Việc 13» và phụ lục). Chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3). **Chưa có mã.** Chưa có người kiểm độc lập soát văn bản này. Dẫn chứng mã đọc trên `main` @`e3a9cf4ad`.
- **Số:** 0232 (giữ trước trong brief của phiên điều phối 21/11). Migration giữ trước: `0190`.
- **Nguồn:** lời chủ 21/11 (Việc 13 trong danh sách 16 việc): chụp ảnh bằng chứng công việc (ví dụ lúc giao vé cho khách, giao khách cho tài xế taxi) và gắn vào đơn; giữ tối thiểu 5 năm.
- **Ngày:** 2026-11-21. **Loại:** việc lớn — dữ liệu cá nhân (ảnh có mặt người), quyền (ba ô mới), triển khai (kho R2 thứ sáu do chủ tạo), pháp lý (thời hạn giữ).
- **Cửa:** hai chiều về hành vi; **một chiều mềm về dữ liệu** (bảng chỉ thêm, ảnh đã gửi không gỡ được trước hạn giữ).
- **Điều kiện trước khi thi công (chưa đủ thì không viết mã):**
  1. Luật sư trả lời các câu ở `docs/superpowers/specs/2026-11-21-viec-13-anh-gan-don/CAU-HOI-LUAT-SU.md` — nhất là câu «giữ 5 năm có thắng yêu cầu xoá của khách không» (Đ7 có hai biến thể, chọn theo câu trả lời).
  2. Phần thêm chính sách riêng tư (`…/PHAN-THEM-CHINH-SACH.md`) được luật sư soát và **đã vào một bản chính sách được đăng** (Hiến chương 5.21, 5.25). Máy chủ chặn tải ảnh khi bản chính sách đang hiệu lực chưa khai mục này (Đ10).
  3. Chủ chọn tên tính năng (Hiến chương 5.27): «Ảnh bàn giao» / «Ảnh giao việc» / «Ảnh xác nhận giao».
  4. Chủ tạo kho R2 một lần trước lần triển khai có binding (Đ3).
- **Quan hệ với ADR cũ:**
  - **Dùng lại khuôn** ADR-0196 (biên lai chuyển khoản: bảng ảnh chỉ thêm `bil_receipt_proof` migration `0158`, kho riêng, khoá ngẫu nhiên, xem qua Worker sau `can()` và nhật ký trước, gỡ có lý do) và ADR-0123/ADR-0144 (tải qua Worker, hàng chờ tệp dở dang). Không dùng chung kho nào trong năm kho đang có.
  - **Khác ADR-0196 ở ba điểm:** (1) chỉ nhận **JPEG hai cỡ** đã nén ở trình duyệt, không nhận PNG/HEIC/PDF; (2) **không gỡ được trước hạn giữ** — Toàn quyền chỉ **ẩn** có lý do; (3) người tải gồm cả người ngoài văn phòng (Hướng dẫn viên, tài xế công ty) theo phân công.
  - **Không đổi** ADR-0126 (yêu cầu xoá, ẩn danh hoá) trừ khi luật sư chọn biến thể 7A — khi đó ADR-0126 cần một dòng bổ sung nêu loại dữ liệu được giữ lại, chủ duyệt riêng.
  - **Tên:** «ảnh bằng chứng» đã dùng cho ảnh chụp màn hình kiểm giao diện của kho mã (ADR-0215, ADR-0216) ⇒ không dùng tên đó (Hiến chương 5.27).
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục, hạn 31/12): migration thêm một bảng, một kho R2 mới. Lý do xin phép: bảng chỉ thêm, không đổi dòng dữ liệu nào đang có, không chạm sổ tiền. Khoá `xay_tren_cho_phep_adr_0232` ghi vào mục `HC-5.19` của `docs/quyen-hoan.json` **sau khi chủ duyệt** (khuôn ADR-0221). Khôi phục D1 về trước một lần ẩn/xoá thì phải chạy lại lần đó (Hiến chương 5.25).
- **Hiến chương áp:** 5.1, 5.3, 5.5, 5.12, 5.20, 5.21, 5.22, 5.24, 5.25, 5.27.
- **Số quyết định chạm quyền/dữ liệu:** 1. Bảng mới, không phải bảng dùng chung nhận loại dữ liệu mới ⇒ không bắt buộc trang ghép.

## Bối cảnh

Hôm nay Nền tảng không có chỗ lưu ảnh chụp lúc làm việc. Khi khách hoặc đối tác nói «chưa nhận vé», «không ai đón», công ty chỉ có lời kể. Chủ muốn người làm việc chụp ảnh ngay tại chỗ và gắn vào đơn, giữ đủ lâu để đối chiếu khi có tranh chấp.

Có sẵn: kho biên lai (ADR-0196) làm khuôn; hàm thu nhỏ ảnh `thuNhoAnh(f, canhDai)` ở `web/thu-nho-anh.ts` (vẽ lại lên canvas nên bỏ hết thông tin ẩn, kể cả toạ độ chụp); hàm nhận loại tệp theo chữ ký `nhanLoaiTep` ở `src/shared/tep-dinh-kem.ts`; «người phụ trách» do gốc lắp ráp tiêm vào `orders` (`ctx.isAssigned`). Tài xế hôm nay **không có ô quyền nào về đơn**, chỉ các ô `trip.*`.

Ảnh có mặt khách, tài xế, hướng dẫn viên là **dữ liệu cá nhân hạng N2** (Hiến chương 5.20; ảnh mặt người không thuộc danh sách N3 «ảnh giấy tờ»). Chụp nhầm giấy tờ vào khung thì là N3 — xem Đ8.

## Quyết định

1. **Một module nghiêm mới** (tên mã nội bộ tạm `anh-don`, tiền tố bảng `adn_`, tiền tố khoá kho `adn` thêm vào `taoKhoaNgauNhien`; tên mã không hiện ra người dùng, đổi theo tên chủ chọn nếu cần). Chỉ module này ghi bảng ảnh và chạm kho ảnh. Module đọc đơn, dịch vụ, chặng qua view `v_ord_*`; «người phụ trách» và «tài xế của chuyến» do gốc lắp ráp tiêm (không import `dispatch`, `van-chuyen`).
2. **Một bảng chỉ thêm `adn_photo`** (migration `0190`), mỗi dòng một ảnh:
   - gắn **bắt buộc** một đơn (`order_id`); **tuỳ chọn** một dịch vụ trên đơn (`order_service_id`) **hoặc** một lượt đón (`transfer_leg_id`) — không cả hai; trigger kiểm dịch vụ/lượt đón thuộc đúng đơn đó;
   - loại việc: `GIAO_KHACH` (giao vé/giao dịch vụ cho khách), `GIAO_TAI_XE` (giao khách cho tài xế taxi/xe ngoài), `KHAC`; ghi chú ngắn tuỳ chọn (≤ 200 ký tự, hạng N2);
   - hai khoá kho (ảnh nhỏ, ảnh xem), hai cỡ, băm nội dung ảnh xem; người tải, giờ tải **lấy giờ máy chủ** (`toISOString()`), không nhận giờ từ máy người chụp;
   - `giu_den` = giờ tải + 5 năm, máy chủ tính, CSDL kiểm bằng `CHECK` (không ai sửa được);
   - ba mốc một chiều như khuôn `0158`: đã lưu kho, quyết gỡ (chỉ các lý do ở Đ7 và lỗi tải lên), đã xoá khỏi kho; thêm bộ cột **ẩn** (người, giờ, lý do — một chiều, không bỏ ẩn);
   - trigger chặn xoá dòng; chỉ cho sửa các cột trạng thái tệp và bộ cột ẩn; khoá kho và băm hạng N3 (khuôn ADR-0196 Đ3).
   - Không có cột tên tệp gốc, không có cột toạ độ, không có cột giờ chụp của máy.
3. **Kho R2 thứ sáu riêng:** `tourdao-sales-anh-gan-don` (tên chốt theo tên tính năng), binding riêng, chỉ module `anh-don` chạm. Thêm vào `wrangler.jsonc` (kèm kiểm `wrangler.dev.jsonc`), kiểu `Env`, cổng 1e của `npm run trien-khai` (thiếu kho thì dừng trước mọi bước ghi), `KHO_R2` ở `scripts/sao-luu-lib.mjs`. **Không bật khoá giữ của R2 (bucket lock):** khoá giữ chặn cả lệnh xoá theo yêu cầu của người trong ảnh (nếu luật sư nói phải xoá) và biến kho thành «kho tệp không xoá được» chứa dữ liệu cá nhân, trái Hiến chương 5.22. Hạn giữ được canh ở CSDL (Đ7) và chỉ một lệnh có tên mới xoá được tệp.
4. **Ba ô quyền mới** (không nới ô nào đang có):

   | Ô | Bán hàng, Quản lý bán hàng | Kế toán | Quản trị | Hướng dẫn viên | Đối tác | Toàn quyền | Thực tập sinh | Tài xế công ty | Tài xế đối tác | Nhân sự |
   |---|---|---|---|---|---|---|---|---|---|---|
   | `order.photo.upload` (tải ảnh) | any | none | any | assigned | none | any | none | assigned (theo chuyến) | none | none |
   | `order.photo.view` (xem ảnh) | any | any | any | own (ảnh mình tải) | none | any | none | own (ảnh mình tải) | none | none |
   | `order.photo.hide` (ẩn ảnh) | none | none | none | none | none | any | none | none | none | none |

   «Văn phòng» = Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền. Thực tập sinh không tải, không xem (AI tự quyết, bác được). «Tài xế công ty theo chuyến» = tài khoản giữ quyền `DRIVER` được phân công một chuyến có lượt đón của đơn đó; gốc lắp ráp tiêm hàm hỏi (khuôn `ctx.isAssigned`); tài xế **bắt buộc** chọn lượt đón khi tải. Đối tác, khách: không bao giờ thấy ảnh, không thấy cả số lượng ảnh.
5. **Tải ảnh — một yêu cầu một ảnh:** `POST /api/orders/:id/anh` (đường mã tạm). Trình duyệt dùng `thuNhoAnh` tạo **hai bản JPEG**: ảnh nhỏ cạnh dài 400 điểm ảnh, ảnh xem cạnh dài 1600 điểm ảnh. Máy chủ kiểm: cả hai là JPEG theo chữ ký thật; **từ chối JPEG còn đoạn thông tin ẩn «Exif»** (canvas không bao giờ sinh đoạn này — tệp có nó là tệp không qua bước nén, có thể còn toạ độ); ảnh nhỏ ≤ 100 KB, ảnh xem ≤ 600 KB; chặn cỡ thân yêu cầu trước khi đọc. Sai loại 415, quá cỡ 413. Thứ tự (khuôn ADR-0196 Đ2): kiểm → một lô D1 (dòng ảnh chưa lưu, nhật ký chỉ mã) → đặt R2 hai đối tượng → đánh dấu đã lưu; R2 hỏng thì dòng ở «tải dở dang», hàng chờ của Toàn quyền dọn. Đơn nháp và đơn đã huỷ không nhận ảnh (409). Trần: `TEP_MOI_GIO` mỗi tài khoản mỗi giờ, tối đa 30 ảnh còn hiện mỗi đơn (429).
6. **Xem ảnh chỉ qua Worker:** `GET /api/orders/:id/anh/:anhId?co=nho|xem` — kiểm `sec-fetch-site`, ô `order.photo.view` và phạm vi, ảnh phải thuộc đúng đơn (không thì 404), **ghi nhật ký trước** rồi mới đọc kho (Hiến chương 5.22); `Cache-Control: no-store`, `nosniff`, CSP `sandbox`; không đường dẫn ký sẵn; service worker không đệm. Danh sách ảnh của đơn (DTO) chỉ mang mã ảnh, loại việc, ghi chú, người tải, giờ tải, dịch vụ/lượt đón — không mang khoá kho. Mở danh sách ảnh nhỏ ghi **một** dòng nhật ký cho cả lượt (nêu các mã ảnh), mở ảnh xem ghi một dòng mỗi ảnh.
7. **Giữ và gỡ — không ai gỡ trước `giu_den`:**
   - Toàn quyền chỉ **ẩn** ảnh, bắt buộc lý do (lý do nằm ở dòng ảnh, nhật ký chỉ mã). Ẩn rồi: ảnh biến khỏi danh sách của mọi vai; Toàn quyền vẫn mở được (có nhật ký); tệp vẫn ở kho. Ẩn không bỏ được.
   - Trigger CSDL chặn ghi mốc «quyết gỡ» khi giờ hiện tại chưa tới `giu_den` — **trừ** đúng một ngoại lệ có tên tuỳ biến thể dưới đây. Lỗi tải lên (`TAI_LEN_LOI`) không tính là gỡ.
   - **Biến thể 7A** (luật sư xác nhận có căn cứ pháp lý giữ ảnh 5 năm kể cả khi người trong ảnh yêu cầu xoá): không có ngoại lệ. Phiếu yêu cầu xoá (ADR-0126) trả lời «ảnh … được giữ tới …, căn cứ …» (Hiến chương 5.24: phần pháp luật bắt giữ được giữ và ghi rõ trong phiếu trả lời).
   - **Biến thể 7B** (luật sư nói yêu cầu xoá phải thắng, hoặc chưa có câu trả lời rõ): ngoại lệ duy nhất là **lệnh xoá theo quyền chủ thể** đã có (ADR-0126, Hiến chương 5.24), chạy khi phiếu xoá được thực hiện và người đó có trong ảnh (Toàn quyền đánh dấu ảnh nào, vì máy không nhận diện mặt). Lệnh xoá cả hai đối tượng R2, giữ dòng với dấu ẩn danh.
   - **Khuyến nghị: thi công sẵn đường 7B** (ngoại lệ có tên, cùng khuôn đang có), chỉ tắt ngoại lệ khi luật sư xác nhận 7A bằng văn bản. Lý do: 7B không bao giờ làm công ty vi phạm quyền xoá; 7A sai thì không sửa được về sau.
   - Sau `giu_den`: máy **không tự xoá** (Hiến chương 5.25 «máy không tự ghi»); ảnh quá hạn hiện trong danh sách «chờ xoá» của Toàn quyền, người bấm xoá.
8. **Chụp nhầm giấy tờ, ảnh không đúng việc:** chỉ Toàn quyền ẩn (Đ7). Biến thể 7B: nếu luật sư cho, «ảnh giấy tờ chụp nhầm» là lý do gỡ trước hạn thứ hai (ảnh N3 không có lý do giữ theo 5.25). Văn bản này **không** tự thêm lý do đó; chờ câu trả lời.
9. **Không thu vị trí GPS** (khuyến nghị; câu hỏi 3). Nơi chụp suy ra từ lượt đón đã gắn. Giờ là giờ máy chủ.
10. **Cổng chính sách:** máy chủ từ chối tải ảnh (409, chữ tra bảng tham chiếu) khi bản chính sách riêng tư đang hiệu lực chưa đánh dấu «có mục ảnh gắn đơn» (thêm một cột cờ vào `pty_privacy_policy` theo khuôn `covers_org_data` của migration `0174`, mặc định 0). Không có chính sách thì tính năng tắt — giống cách đăng ký đối tác đang chờ chính sách.
11. **Nội dung ảnh và ghi chú** không vào nhật ký, email, câu báo lỗi, Trợ lý, đầu ra cho Đối tác.

## Phương án bị loại

- **Dùng chung kho biên lai `BIEN_LAI`:** khác chủ module (billing), khác thời hạn giữ, khác tập người xem (Hiến chương 5.22: mỗi kho một chủ, một loại dữ liệu).
- **Bật khoá giữ R2 5 năm:** chặn cả xoá theo quyền chủ thể; trái 5.22 (Đ3).
- **Nhận ảnh gốc từ máy (HEIC, PNG, PDF, video):** nặng (ảnh iPhone 3–6 MB), còn toạ độ chụp; nén ở trình duyệt đủ cho mục đích đối chiếu.
- **Cho Đối tác xem ảnh giao khách của mình:** chủ chưa yêu cầu; ảnh có mặt khách và nhân viên; mở về sau bằng quyết định riêng.
- **Lấy giờ chụp từ ảnh:** người chụp sửa được giờ máy; giờ máy chủ là giờ ghi nhận duy nhất tin được.

## Bài kiểm (đỏ trước, xanh sau)

- Ma trận ba ô mới (bài khoá giá trị và bài «route hỏi đúng ô»); tài xế không thuộc chuyến của đơn 403; Hướng dẫn viên không phụ trách 404/403; Đối tác 403 ở cả danh sách lẫn ảnh; Thực tập sinh 403.
- Tải: không phải JPEG 415; JPEG còn Exif 415; quá cỡ 413; đơn nháp/huỷ 409; vượt trần 429; chưa có chính sách có mục ảnh 409; dịch vụ/lượt đón không thuộc đơn bị trigger chặn; R2 giả lỗi ⇒ dòng «tải dở dang».
- Xem: nhật ký có trước phản hồi; `no-store`; ảnh đơn khác 404; DTO không chứa khoá kho.
- Giữ: trigger chặn quyết gỡ trước `giu_den` (đổi giờ giả lập); ẩn thiếu lý do 400; ẩn hai lần 409; biến thể 7B: lệnh xoá theo quyền chủ thể gỡ được trước hạn, lệnh khác không.
- Kiến trúc: chỉ `anh-don` ghi bảng và chạm kho; cổng 1e thiếu kho thì dừng; `KHO_R2` có kho mới (`src/sao-luu.test.ts`); bài kho `src/kho-tep-anh-gan-don.test.ts`; cột mới có hạng dữ liệu (`src/hang-du-lieu.test.ts`).
- e2e (chạm API, migration); kịch bản Chrome ở 390 và 1280: Hướng dẫn viên chụp 2 ảnh, Kế toán thấy, Đối tác không thấy.

## Người dùng sẽ thấy

Hướng dẫn viên mở đơn mình đang phụ trách, bấm «[tên tính năng]», chụp ảnh (hoặc chọn ảnh có sẵn), chọn loại việc và ghi chú ngắn nếu cần, rồi gửi. Tài xế công ty làm việc đó ngay trên lượt đón trong màn chuyến của mình. Đơn hiện hàng ảnh nhỏ kèm tên người chụp và giờ; bấm vào thì xem ảnh lớn. Văn phòng, Kế toán, Quản trị xem được; Đối tác và khách không thấy gì. Ảnh gửi nhầm không xoá được; chỉ Toàn quyền ẩn được, có ghi lý do.

## Hệ quả

- **Việc của chủ trước lần triển khai:** tạo kho bằng một lệnh (AI đưa nguyên lệnh và thư mục; lệnh có thể hỏi sửa cấu hình, trả lời «n»).
- **Sao lưu:** thêm kho vào sao lưu tuần chung (giữ 8 bản tuần + 12 bản tháng). Đủ dùng vì bản sao lưu chỉ để chống mất kho, không phải nơi giữ 5 năm: bản mới nhất luôn chứa mọi ảnh đang giữ. Hệ quả cần nói thẳng trong chính sách: ảnh đã xoá theo yêu cầu vẫn còn trong bản sao lưu tới khi bản đó bị xoay vòng (tối đa khoảng 12 tháng); khôi phục về trước một lần xoá thì phải chạy lại lần xoá đó (Hiến chương 5.25). **Dung lượng là vấn đề thật:** sao lưu hôm nay chép **toàn bộ** mỗi kho vào mỗi bản (`scripts/sao-luu.mjs`, vòng `for (const kho of KHO_R2)`), mã hoá rồi cất vào thư mục Google Drive của chủ, giữ tới 20 bản. Kho ảnh ước 27 GB sau 5 năm (50 ảnh/ngày × 300 KB — **chưa đo**) ⇒ về lâu dài tới vài trăm GB trên Google Drive. Người thi công phải chọn trước khi bật: (a) sao lưu kho ảnh theo kiểu chỉ chép ảnh mới (cộng dồn), hoặc (b) giữ ít bản hơn riêng cho kho này — trình chủ một phương án kèm con số. Bản sao lưu nằm ở Google (nhà cung cấp thứ hai) cũng phải nêu trong chính sách.
- **Gói trang:** chi tiết đơn (`web/order.ts`) thêm khối ảnh và mã nén; trần gói trang Đơn hàng đang sát — người thi công đo thật và trình chủ một con số (kế hoạch mục 3.5). Màn chuyến của tài xế thêm nút tải.
- **Chữ mới trên giao diện** (tên tính năng, ba loại việc, «Ẩn ảnh», câu lỗi): tra `docs/BANG-THAM-CHIEU.md`; chưa có thì thêm khi thi công.
- **Sổ hàng rào:** dòng cho trigger hạn giữ, cổng 1e biết kho mới, bài «chỉ `anh-don` chạm kho», kèm ngày quan sát chặn thật.
- **Phải nói thẳng:**
  - Ảnh chỉ là bằng chứng hỗ trợ, không thay chữ ký nhận hay biên bản.
  - Máy không nhận diện được ai có trong ảnh; khi có yêu cầu xoá (biến thể 7B), Toàn quyền phải tự xem và đánh dấu.
  - Nợ mang theo từ khuôn biên lai: `BL-TEP-THAN-HAI-LAN` (bộ nhớ Worker với thân lớn), `BL-TEP-PHAT-LAI-500`, `BL-BL-THU-THAT` (chưa thử thật trên iPhone).
  - **Chưa kiểm:** cỡ thật của ảnh sau nén trên iPhone; giá lưu trữ R2 cho 27 GB; Safari iPhone có mở được ảnh HEIC để thu nhỏ không (nếu không, ảnh đó bị từ chối, người dùng chụp lại bằng nút máy ảnh của trình duyệt).
