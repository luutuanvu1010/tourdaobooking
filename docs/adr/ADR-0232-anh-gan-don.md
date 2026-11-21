# ADR-0232 — Ảnh chụp lúc làm việc, gắn vào đơn (tên giao diện chờ chủ chọn); kho R2 riêng, giữ theo hạn của chính sách riêng tư (đề xuất 5 năm, chờ luật sư)

- **Trạng thái:** **accepted** 2026-11-22 — chủ dự án, trong phiên điều phối (hồ sơ `docs/superpowers/plans/2026-11-22-quyet-dinh-chu-ke-hoach-16-viec.md` ở nhánh `claude/partner-features-detailed-plan-f32f89`), trả lời câu 5 của lượt hỏi, nguyên văn: *«Theo đề xuất của bạn, cứ làm, không cần hỏi luật sư; mục đích là lưu bằng chứng công việc.»* Người chép (AI) hiểu: duyệt văn bản này theo mọi khuyến nghị — tên giao diện **«Ảnh bàn giao»**; không thu GPS; kho ảnh giữ ít bản sao lưu riêng; **không chờ luật sư** (bỏ điều kiện trước số 1), thi công **biến thể 7B** với cả hai lối vào (lối của khách không có tài khoản chủ không nêu ý kiến riêng — giữ như thiết kế, coi là duyệt cùng văn bản); bổ sung ADR-0126 như mục «Quan hệ»; cho phép xây trên HC-5.19 (khoá `xay_tren_cho_phep_adr_0232`). Chủ nói khác thì sửa lại. **Điều phải nói thẳng:** không có ý kiến luật sư thì hạn giữ 5 năm **không thắng** quyền xoá theo luật của người trong ảnh — vì vậy đường xoá theo yêu cầu (7B) và xoá ngay ảnh giấy tờ (Đ8) vẫn giữ. Điều kiện trước còn lại: chính sách riêng tư phiên bản mới có số năm giữ ảnh (Đ10, chủ đăng), chủ tạo kho R2. Lịch sử: **proposed** 2026-11-21 — AI soạn (phiên thi công Việc 13 của kế hoạch `docs/superpowers/plans/2026-11-21-ke-hoach-16-viec.md` ở nhánh `claude/partner-features-detailed-plan-f32f89`, mục 5 «Việc 13» và phụ lục). Chờ chủ duyệt; người soạn không tự duyệt (Hiến pháp N3). **Chưa có mã.** Người kiểm độc lập chỉ đọc soát một vòng 21/11 (lần lưu `6b5b6c7dd`): 2 CAO (biến thể 7B không phủ khách không có tài khoản; ảnh giấy tờ chụp nhầm giữ 5 năm trái 5.25), 6 VỪA (ADR-0126 phải bổ sung ở cả hai biến thể; thiếu ô xoá; tài xế bị cổng đơn chặn; hạn giữ cứng trong CHECK; phương án sao lưu cộng dồn trái lời hứa 12 tháng; cờ chính sách tự tắt ở bản sau) — đã sửa ở Đ2, Đ4, Đ5, Đ7, Đ8, Đ10, Hệ quả; thiết kế lõi không đổi. Dẫn chứng mã đọc trên `main` @`e3a9cf4ad`.
- **Số:** 0232 (giữ trước trong brief của phiên điều phối 21/11). Migration giữ trước: `0190`.
- **Nguồn:** lời chủ 21/11 (Việc 13 trong danh sách 16 việc): chụp ảnh bằng chứng công việc (ví dụ lúc giao vé cho khách, giao khách cho tài xế taxi) và gắn vào đơn; giữ tối thiểu 5 năm.
- **Ngày:** 2026-11-21. **Loại:** việc lớn — dữ liệu cá nhân (ảnh có mặt người), quyền (bốn ô mới), triển khai (kho R2 thứ sáu do chủ tạo), pháp lý (thời hạn giữ).
- **Cửa:** hai chiều về hành vi; **một chiều mềm về dữ liệu** (bảng chỉ thêm, ảnh đã gửi không gỡ được trước hạn giữ trừ các ngoại lệ có tên ở Đ7–Đ8).
- **Điều kiện trước khi thi công (chưa đủ thì không viết mã):**
  1. ~~Luật sư trả lời các câu ở `docs/superpowers/specs/2026-11-21-viec-13-anh-gan-don/CAU-HOI-LUAT-SU.md`~~ — **chủ bỏ điều kiện này 22/11** («không cần hỏi luật sư»); thi công biến thể 7B. Bản câu hỏi giữ làm hồ sơ, dùng khi chủ muốn hỏi sau.
  2. Phần thêm chính sách riêng tư (`…/PHAN-THEM-CHINH-SACH.md`) được luật sư soát và **đã vào một bản chính sách được đăng** (Hiến chương 5.21, 5.25). Máy chủ chặn tải ảnh khi bản chính sách đang hiệu lực chưa ghi hạn giữ ảnh (Đ10).
  3. ~~Chủ chọn tên tính năng~~ — **đã chọn «Ảnh bàn giao»** 22/11 (Hiến chương 5.27).
  4. Chủ chọn cách sao lưu kho này (Hệ quả, mục Sao lưu) và tạo kho R2 một lần trước lần triển khai có binding (Đ3).
- **Quan hệ với ADR cũ:**
  - **Dùng lại khuôn** ADR-0196 (biên lai chuyển khoản: bảng ảnh chỉ thêm `bil_receipt_proof` migration `0158`, kho riêng, khoá ngẫu nhiên, xem qua Worker sau `can()` và nhật ký trước, gỡ có lý do, ô gỡ riêng `payment.proof.purge`) và ADR-0123/ADR-0144 (tải qua Worker, hàng chờ tệp dở dang). Không dùng chung kho nào trong năm kho đang có.
  - **Khác ADR-0196 ở ba điểm:** (1) chỉ nhận **JPEG hai cỡ** đã nén ở trình duyệt, không nhận PNG/HEIC/PDF; (2) **không gỡ được trước hạn giữ** trừ ngoại lệ có tên — Toàn quyền chỉ **ẩn** có lý do; (3) người tải gồm cả người ngoài văn phòng (Hướng dẫn viên, tài xế công ty) theo phân công.
  - **Bổ sung ADR-0126** ở **cả hai** biến thể của Đ7 (chủ duyệt cùng văn bản này): 7A — phiếu trả lời yêu cầu xoá phải nêu ảnh được giữ tới ngày nào, căn cứ gì; 7B — lệnh ẩn danh hoá có tên của `parties` (ADR-0126 điều 3) gọi thêm lệnh xoá ảnh của module `anh-don` qua `index.ts` của nó (Đ7). Hiến chương 5.24 vẫn là «một lệnh có tên» nhìn từ người dùng; mỗi module ghi bảng và kho của mình.
  - **Tên:** «ảnh bằng chứng» đã dùng cho ảnh chụp màn hình kiểm giao diện của kho mã (ADR-0215, ADR-0216) ⇒ không dùng tên đó (Hiến chương 5.27).
- **Xây trên lỗ đang hở: HC-5.19** (chưa diễn tập khôi phục, hạn 31/12): migration thêm một bảng, một cột vào bảng chính sách, một kho R2 mới. Lý do xin phép: bảng chỉ thêm, không đổi dòng dữ liệu nào đang có, không chạm sổ tiền. Khoá `xay_tren_cho_phep_adr_0232` ghi vào mục `HC-5.19` của `docs/quyen-hoan.json` **sau khi chủ duyệt** (khuôn ADR-0221). Khôi phục D1 về trước một lần ẩn/xoá thì phải chạy lại lần đó (Hiến chương 5.25).
- **Hiến chương áp:** 5.1, 5.3, 5.5, 5.12, 5.20, 5.21, 5.22, 5.24, 5.25, 5.27.
- **Số quyết định chạm quyền/dữ liệu:** 1 (bốn ô quyền và một bảng của cùng một tính năng). Bảng mới, không phải bảng dùng chung nhận loại dữ liệu mới; riêng bảng chính sách `pty_privacy_policy` nhận thêm một cột (không thêm loại thực thể) ⇒ không bắt buộc trang ghép.

## Bối cảnh

Hôm nay Nền tảng không có chỗ lưu ảnh chụp lúc làm việc. Khi khách hoặc đối tác nói «chưa nhận vé», «không ai đón», công ty chỉ có lời kể. Chủ muốn người làm việc chụp ảnh ngay tại chỗ và gắn vào đơn, giữ đủ lâu để đối chiếu khi có tranh chấp.

Có sẵn: kho biên lai (ADR-0196) làm khuôn; hàm thu nhỏ ảnh `thuNhoAnh(f, canhDai)` ở `web/thu-nho-anh.ts` (vẽ lại lên canvas nên bỏ hết thông tin ẩn, kể cả toạ độ chụp; không giải được thì trả `null`); hàm nhận loại tệp theo chữ ký `nhanLoaiTep` ở `src/shared/tep-dinh-kem.ts`. Tài xế hôm nay **không có ô quyền nào về đơn** (mọi ô `order.*` cột `DRIVER` là `none`), chỉ các ô `trip.*`; cổng `ORDERS_GATE` (`src/shared/permissions.ts`) không cho tài xế vào đường `/api/orders/*`.

Ảnh có mặt khách, tài xế, hướng dẫn viên là **dữ liệu cá nhân hạng N2** (Hiến chương 5.20; ảnh mặt người không thuộc danh sách N3 «ảnh giấy tờ»). Phần lớn khách mua qua đại lý và **không có tài khoản** trên Nền tảng. Chụp nhầm giấy tờ vào khung thì là N3 — xem Đ8.

## Quyết định

1. **Một module nghiêm mới** (tên mã nội bộ tạm `anh-don`, tiền tố bảng `adn_`, tiền tố khoá kho `adn` thêm vào `taoKhoaNgauNhien`; tên mã không hiện ra người dùng). Chỉ module này ghi bảng ảnh và chạm kho ảnh. Module đọc đơn, dịch vụ, chặng qua view `v_ord_*`; «người phụ trách» và «tài xế của chuyến» do gốc lắp ráp tiêm (không import `dispatch`, `van-chuyen`). Route của module nằm dưới **`/api/anh-gan-don/…`** (đường mã tạm), **ngoài** `ORDERS_GATE`, mỗi route khai `access` bằng ô của Đ4 — vì tài xế phải vào được mà không mở cổng đơn cho tài xế.
2. **Một bảng chỉ thêm `adn_photo`** (migration `0190`), mỗi dòng một ảnh:
   - gắn **bắt buộc** một đơn (`order_id`); **tuỳ chọn** một dịch vụ trên đơn (`order_service_id`) **hoặc** một lượt đón (`transfer_leg_id`) — không cả hai; trigger kiểm dịch vụ/lượt đón thuộc đúng đơn đó;
   - loại việc: `GIAO_KHACH` (giao vé/giao dịch vụ cho khách), `GIAO_TAI_XE` (giao khách cho tài xế taxi/xe ngoài), `KHAC`; ghi chú ngắn tuỳ chọn (≤ 200 ký tự, hạng N2);
   - hai khoá kho (ảnh nhỏ, ảnh xem), hai cỡ, băm nội dung ảnh xem; người tải, giờ tải **lấy giờ máy chủ** (`toISOString()`), không nhận giờ từ máy người chụp;
   - `giu_den`: máy chủ tính lúc tải = giờ tải + **số năm giữ đọc từ bản chính sách đang hiệu lực** (Đ10), chụp vào dòng; CSDL chỉ kiểm `giu_den > created_at` và cấm sửa. Con số không nằm trong mã (khuôn ADR-0126 điều 2). Đổi hạn bằng bản chính sách mới chỉ áp cho ảnh tải sau đó;
   - ba mốc một chiều như khuôn `0158`: đã lưu kho, quyết gỡ (kèm mã lý do: `TAI_LEN_LOI`, `HET_HAN`, `GIAY_TO_CHUP_NHAM`, `XOA_THEO_YEU_CAU`), đã xoá khỏi kho; thêm bộ cột **ẩn** (người, giờ, lý do — một chiều, không bỏ ẩn);
   - trigger chặn xoá dòng; chỉ cho sửa các cột trạng thái tệp và bộ cột ẩn;
   - **hạng dữ liệu** (`src/hang-du-lieu.test.ts`): hai khoá kho, băm, cột lý do gỡ/ẩn → **N3** (khuôn ADR-0196 Đ3, và lý do có thể nhắc giấy tờ); ghi chú → N2; còn lại N1.
   - Không có cột tên tệp gốc, không có cột toạ độ, không có cột giờ chụp của máy.
3. **Kho R2 thứ sáu riêng:** `tourdao-sales-anh-gan-don` (tên chốt theo tên tính năng), binding riêng, chỉ module `anh-don` chạm. Thêm vào `wrangler.jsonc` (kèm kiểm `wrangler.dev.jsonc`), kiểu `Env`, cổng 1e của `npm run trien-khai` (thiếu kho thì dừng trước mọi bước ghi), `KHO_R2` ở `scripts/sao-luu-lib.mjs`. **Không bật khoá giữ của R2 (bucket lock):** khoá giữ chặn cả các lệnh xoá có tên ở Đ7–Đ8 và biến kho thành «kho tệp không xoá được» chứa dữ liệu cá nhân, trái Hiến chương 5.22. Hạn giữ được canh ở CSDL (Đ7).
4. **Bốn ô quyền mới** (không nới ô nào đang có). Bảng dưới ghi theo vai; trong mã là 11 cột theo thứ tự `PERMISSION_CODES` (`SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER, HR, SALES_MANAGER`) — `SALES_MANAGER` phải ghi tường minh, không để mặc định `none`:

   | Ô | SALES | SALES_MANAGER | ACCOUNTING | ADMIN | FIELD | PARTNER | SUPER_ADMIN | INTERN | DRIVER | DRIVER_PARTNER | HR |
   |---|---|---|---|---|---|---|---|---|---|---|---|
   | `order.photo.upload` (tải ảnh) | any | any | none | any | assigned | none | any | none | assigned (theo chuyến) | none | none |
   | `order.photo.view` (xem ảnh) | any | any | any | any | own (ảnh mình tải) | none | any | none | own (ảnh mình tải) | none | none |
   | `order.photo.hide` (ẩn ảnh) | none | none | none | none | none | none | any | none | none | none | none |
   | `order.photo.purge` (xoá ảnh khỏi kho theo Đ7–Đ8, dọn hàng chờ) | none | none | none | none | none | none | any | none | none | none | none |

   «Văn phòng» = Bán hàng, Quản lý bán hàng, Quản trị, Toàn quyền. Thực tập sinh không tải, không xem (AI tự quyết, bác được). «Tài xế công ty theo chuyến» = tài khoản giữ quyền `DRIVER` được phân công một chuyến có lượt đón của đơn đó; gốc lắp ráp tiêm hàm hỏi (khuôn `ctx.isAssigned`); tài xế **bắt buộc** chọn lượt đón khi tải. Các ô này **không** theo luật «⊆ `order.view`» của các ô `order.*` khác (vì cột tài xế), nên bài canh tập con nào đang ép luật đó phải liệt kê chúng là ngoại lệ có tên. Đối tác, khách: không bao giờ thấy ảnh, không thấy cả số lượng ảnh; sự kiện ảnh không vào lớp lịch sử đơn rút gọn mà Đối tác xem (ô `order.history.view`).
5. **Tải ảnh — một yêu cầu một ảnh:** `POST /api/anh-gan-don/don/:orderId` (đường mã tạm). Trình duyệt dùng `thuNhoAnh` tạo **hai bản JPEG**: ảnh nhỏ cạnh dài 400 điểm ảnh, ảnh xem cạnh dài 1600 điểm ảnh; ảnh xem vượt trần thì trình duyệt tự nén lại ở chất lượng thấp hơn trước khi gửi (không bắt người dùng chụp lại). Máy chủ kiểm: cả hai là JPEG theo chữ ký thật; **từ chối JPEG còn đoạn thông tin ẩn «Exif»** (canvas không sinh đoạn này — tệp có nó là tệp không qua bước nén, có thể còn toạ độ); ảnh nhỏ ≤ 100 KB, ảnh xem ≤ 600 KB (con số chốt sau khi đo trên iPhone thật); chặn cỡ thân yêu cầu trước khi đọc. Sai loại 415, quá cỡ 413. Thứ tự (khuôn ADR-0196 Đ2): kiểm → một lô D1 (dòng ảnh chưa lưu, nhật ký chỉ mã) → đặt R2 hai đối tượng → đánh dấu đã lưu; R2 hỏng thì dòng ở «tải dở dang», Toàn quyền dọn bằng hàng chờ (ô `order.photo.purge`). Đơn nháp và đơn đã huỷ không nhận ảnh (409). Trần: `TEP_MOI_GIO` mỗi tài khoản mỗi giờ, tối đa 30 ảnh còn hiện mỗi đơn (429).
6. **Xem ảnh chỉ qua Worker:** `GET /api/anh-gan-don/anh/:anhId?co=nho|xem` — kiểm `sec-fetch-site`, ô `order.photo.view` và phạm vi, **ghi nhật ký trước** rồi mới đọc kho (Hiến chương 5.22); `Cache-Control: no-store`, `nosniff`, CSP `sandbox`; không đường dẫn ký sẵn; service worker không đệm. Danh sách ảnh của đơn (DTO) chỉ mang mã ảnh, loại việc, ghi chú, người tải, giờ tải, dịch vụ/lượt đón — không mang khoá kho. Mở danh sách ảnh nhỏ ghi **một** dòng nhật ký cho cả lượt (nêu các mã ảnh), mở ảnh xem ghi một dòng mỗi ảnh.
7. **Giữ và gỡ — không ai gỡ trước `giu_den`, trừ ngoại lệ có tên:**
   - Toàn quyền chỉ **ẩn** ảnh, bắt buộc lý do (lý do nằm ở dòng ảnh, nhật ký chỉ mã). Ẩn rồi: ảnh biến khỏi danh sách của mọi vai; Toàn quyền vẫn mở được (có nhật ký); tệp vẫn ở kho. Ẩn không bỏ được.
   - Trigger CSDL chặn ghi mốc «quyết gỡ» trước `giu_den` với mọi mã lý do **trừ** `TAI_LEN_LOI` (tệp chưa từng lưu xong), `GIAY_TO_CHUP_NHAM` (Đ8) và — chỉ ở biến thể 7B — `XOA_THEO_YEU_CAU` kèm mã yêu cầu hợp lệ.
   - **Biến thể 7A** (luật sư xác nhận có căn cứ pháp lý giữ ảnh kể cả khi người trong ảnh yêu cầu xoá): không có ngoại lệ `XOA_THEO_YEU_CAU`. Phiếu trả lời yêu cầu xoá (ADR-0126) nêu «ảnh … được giữ tới …, căn cứ …» (Hiến chương 5.24: phần pháp luật bắt giữ được giữ và ghi rõ trong phiếu trả lời).
   - **Biến thể 7B** (luật sư nói yêu cầu xoá phải thắng, hoặc chưa có câu trả lời rõ): ngoại lệ `XOA_THEO_YEU_CAU`, một lệnh có tên của `anh-don` (ô `order.photo.purge`), xoá cả hai đối tượng R2 và giữ dòng với dấu ẩn danh (ghi chú bị xoá). Lệnh có **hai lối vào**:
     - người **có tài khoản** (nhân viên, tài xế, đối tác): khi phiếu xoá của ADR-0126 được thực hiện, Toàn quyền đánh dấu ảnh nào có người đó (máy không nhận diện mặt), lệnh ẩn danh hoá của `parties` gọi lệnh xoá ảnh qua `index.ts` của `anh-don`, mã yêu cầu = mã phiếu;
     - **khách không có tài khoản** (đa số người trong ảnh): khách yêu cầu qua kênh liên hệ ghi trong chính sách (mục 1 của bản nháp); Toàn quyền mở đơn, chọn ảnh, bấm xoá với lý do bắt buộc ghi nguồn yêu cầu (mã yêu cầu = mã một dòng «yêu cầu xoá ảnh» chỉ thêm của `anh-don`). **Lối này là quyết định riêng trong văn bản này — chủ duyệt hoặc bỏ.** Bỏ thì phải nói thẳng: với khách, 7B cho kết quả giống 7A.
   - **Khuyến nghị: thi công 7B với cả hai lối vào**, chỉ tắt `XOA_THEO_YEU_CAU` khi luật sư xác nhận 7A bằng văn bản. Lý do: 7B có thể dừng lại thành 7A bằng một migration siết trigger; 7A sai thì ảnh đã giữ trái luật không xoá được bằng đường thường.
   - Sau `giu_den`: máy **không tự xoá** (Hiến chương 5.25 «máy không tự ghi»); ảnh quá hạn hiện trong danh sách «chờ xoá» của Toàn quyền, người bấm xoá (mã `HET_HAN`, ô `order.photo.purge`).
8. **Ảnh giấy tờ chụp nhầm là ngoại lệ có tên mặc định** (sửa sau kiểm độc lập, CAO số 2): ảnh lọt căn cước, hộ chiếu, bằng lái là dữ liệu N3 không gắn với hồ sơ giấy tờ nào, nên không có lý do giữ theo Hiến chương 5.25. Toàn quyền xoá ngay bằng mã `GIAY_TO_CHUP_NHAM`, lý do bắt buộc, ở **cả hai** biến thể. Ảnh không đúng việc khác: chỉ ẩn.
9. **Không thu vị trí GPS** (khuyến nghị; câu hỏi 3). Nơi chụp suy ra từ lượt đón đã gắn. Giờ là giờ máy chủ.
10. **Cổng chính sách:** thêm cột `photo_retention_years` (số nguyên ≥ 1, mặc định trống) vào `pty_privacy_policy`, **tạo lại hai view** `v_pty_privacy_current`, `v_pty_privacy_effective` cho có cột này (khuôn `covers_org_data` của migration `0174`, cũng DROP + CREATE view). Bản chính sách đang hiệu lực để trống ô này ⇒ máy chủ từ chối tải ảnh (409, chữ tra bảng tham chiếu); ô vừa là cờ «bản này có mục ảnh» vừa là con số dùng ở Đ2. Form đăng chính sách **chép sẵn số của bản trước** vào ô (người đăng sửa được, xoá được) — để một lần đăng bản mới không vô tình tắt tính năng (khác `covers_org_data`, ô đó không kéo từ bản cũ).
11. **Nội dung ảnh và ghi chú** không vào nhật ký, email, câu báo lỗi, Trợ lý, đầu ra cho Đối tác.

## Phương án bị loại

- **Dùng chung kho biên lai `BIEN_LAI`:** khác chủ module (billing), khác thời hạn giữ, khác tập người xem (Hiến chương 5.22: mỗi kho một chủ, một loại dữ liệu).
- **Bật khoá giữ R2:** chặn cả các lệnh xoá có tên; trái 5.22 (Đ3).
- **Đặt route dưới `/api/orders/…` và mở `ORDERS_GATE` cho tài xế:** cho tài xế vào cổng đơn, nới hàng rào «cổng ⊆ `order.view`» chỉ để tải ảnh.
- **Ghi cứng 5 năm trong CHECK:** đổi con số phải ra migration; trái 5.25 «thời hạn ghi trong chính sách».
- **Nhận ảnh gốc từ máy (HEIC, PNG, PDF, video):** nặng (ảnh iPhone 3–6 MB), còn toạ độ chụp; nén ở trình duyệt đủ cho mục đích đối chiếu.
- **Cho Đối tác xem ảnh giao khách của mình:** chủ chưa yêu cầu; ảnh có mặt khách và nhân viên; mở về sau bằng quyết định riêng.
- **Lấy giờ chụp từ ảnh:** người chụp sửa được giờ máy; giờ máy chủ là giờ ghi nhận duy nhất tin được.

## Bài kiểm (đỏ trước, xanh sau)

- Ma trận bốn ô mới (bài khoá giá trị, bài «route hỏi đúng ô», ngoại lệ có tên ở bài tập con `order.view`); tài xế không thuộc chuyến của đơn 403; Hướng dẫn viên không phụ trách 403; Đối tác 403 ở cả danh sách lẫn ảnh, lịch sử đơn rút gọn không có sự kiện ảnh; Thực tập sinh 403.
- Tải: không phải JPEG 415; JPEG còn Exif 415; quá cỡ 413; đơn nháp/huỷ 409; vượt trần 429; chính sách đang hiệu lực trống `photo_retention_years` 409; dịch vụ/lượt đón không thuộc đơn bị trigger chặn; R2 giả lỗi ⇒ dòng «tải dở dang»; `giu_den` lấy đúng số năm của chính sách.
- Xem: nhật ký có trước phản hồi; `no-store`; DTO không chứa khoá kho.
- Giữ: trigger dùng giờ hệ thống của SQLite nên bài **chèn thẳng dòng có `created_at`/`giu_den` trong quá khứ** (không giả lập đồng hồ máy chủ): dòng chưa tới hạn bị chặn quyết gỡ với `HET_HAN`, cho với `GIAY_TO_CHUP_NHAM`, `TAI_LEN_LOI`, và (7B) `XOA_THEO_YEU_CAU` có mã yêu cầu hợp lệ; thiếu mã yêu cầu bị chặn; ẩn thiếu lý do 400; ẩn hai lần 409.
- Kiến trúc: chỉ `anh-don` ghi bảng và chạm kho; `parties` chỉ gọi qua `index.ts`; cổng 1e thiếu kho thì dừng; `KHO_R2` có kho mới (`src/sao-luu.test.ts`); bài kho `src/kho-tep-anh-gan-don.test.ts`; cột mới có hạng dữ liệu (`src/hang-du-lieu.test.ts`).
- e2e (chạm API, migration); kịch bản Chrome ở 390 và 1280: Hướng dẫn viên chụp 2 ảnh, Kế toán thấy, Đối tác không thấy.

## Người dùng sẽ thấy

Hướng dẫn viên mở đơn mình đang phụ trách, bấm «[tên tính năng]», chụp ảnh (hoặc chọn ảnh có sẵn), chọn loại việc và ghi chú ngắn nếu cần, rồi gửi. Tài xế công ty làm việc đó ngay trên lượt đón trong màn chuyến của mình. Đơn hiện hàng ảnh nhỏ kèm tên người chụp và giờ; bấm vào thì xem ảnh lớn. Văn phòng, Kế toán, Quản trị xem được; Đối tác và khách không thấy gì. Ảnh gửi nhầm không xoá được; chỉ Toàn quyền ẩn được, có ghi lý do. Ảnh lọt giấy tờ tuỳ thân thì Toàn quyền xoá hẳn.

## Hệ quả

- **Việc của chủ trước lần triển khai:** tạo kho bằng một lệnh (AI đưa nguyên lệnh và thư mục; lệnh có thể hỏi sửa cấu hình, trả lời «n»).
- **Sao lưu:** sao lưu hôm nay chép **toàn bộ** mỗi kho vào mỗi bản (`scripts/sao-luu.mjs`, vòng `for (const kho of KHO_R2)`), mã hoá rồi cất vào thư mục Google Drive của chủ, giữ tối đa 20 bản (8 bản tuần + 12 bản tháng). Bản sao lưu chỉ để chống mất kho, không phải nơi giữ 5 năm: bản mới nhất luôn chứa mọi ảnh đang giữ. Cách chép toàn bộ này là điều kiện của câu trong chính sách «ảnh đã xoá còn trong sao lưu tối đa khoảng 12 tháng»; kiểu sao lưu cộng dồn (chỉ chép ảnh mới) **bị loại** vì giữ ảnh đã xoá vô thời hạn, trái 5.24. **Dung lượng là vấn đề thật:** kho ảnh ước 27 GB sau 5 năm (50 ảnh/ngày × 300 KB — **chưa đo**) ⇒ 20 bản chép toàn bộ có thể tới vài trăm GB trên Google Drive. Chủ chọn trước khi thi công: (a) giữ ít bản hơn riêng cho kho ảnh (ví dụ 4 bản tuần, khi đó câu chính sách đổi thành «khoảng 1 tháng»), hoặc (b) giữ lịch chung và chấp nhận dung lượng. Bản sao lưu nằm ở Google (nhà cung cấp thứ hai) cũng phải nêu trong chính sách.
- **Gói trang:** chi tiết đơn (`web/order.ts`) thêm khối ảnh và mã nén; trần gói trang Đơn hàng đang sát — người thi công đo thật và trình chủ một con số (kế hoạch mục 3.5). Màn chuyến của tài xế thêm nút tải.
- **Chữ mới trên giao diện** (tên tính năng, ba loại việc, «Ẩn ảnh», «Xoá ảnh giấy tờ chụp nhầm», câu lỗi): tra `docs/BANG-THAM-CHIEU.md`; chưa có thì thêm khi thi công.
- **Vận hành chính sách:** mỗi lần đăng bản chính sách mới, người đăng kiểm ô «Số năm giữ ảnh gắn đơn» (form chép sẵn số cũ). Xoá trống ô là tắt tính năng tải ảnh ngay.
- **Sổ hàng rào:** dòng cho trigger hạn giữ, cổng chính sách, cổng 1e biết kho mới, bài «chỉ `anh-don` chạm kho», kèm ngày quan sát chặn thật.
- **Phải nói thẳng:**
  - Ảnh chỉ là bằng chứng hỗ trợ, không thay chữ ký nhận hay biên bản.
  - Máy không nhận diện được ai có trong ảnh; khi có yêu cầu xoá (biến thể 7B), Toàn quyền phải tự xem và đánh dấu.
  - Nợ mang theo từ khuôn biên lai: `BL-TEP-THAN-HAI-LAN` (bộ nhớ Worker với thân lớn), `BL-TEP-PHAT-LAI-500`, `BL-BL-THU-THAT` (chưa thử thật trên iPhone).
  - **Chưa kiểm:** cỡ thật của ảnh sau nén trên iPhone (trần 600 KB có thể phải đổi); giá lưu trữ R2 cho 27 GB; Safari iPhone có mở được ảnh HEIC để thu nhỏ không (nếu không, `thuNhoAnh` trả `null`, ảnh bị từ chối, người dùng chụp lại bằng nút máy ảnh của trình duyệt); số 0232 và 0190 chỉ đối chiếu nhánh này và nhánh kế hoạch — người thi công quét mọi nhánh trước khi đặt số.
