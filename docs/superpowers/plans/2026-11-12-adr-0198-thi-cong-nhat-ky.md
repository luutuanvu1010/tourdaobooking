# Nhật ký thi công — ADR-0198 (đối tác thấy Trả sau gọn, đơn mới chọn sẵn «Trả sau»)

- **Ngày:** 2026-11-12. **Vai:** thi công (không tự nghiệm thu, CLAUDE.md §3). **Nhánh:** `claude/infallible-poincare-bcaf48` (đã gộp nhánh văn bản `claude/partner-payment-system-e3f939`, nên nhánh này mang theo cả ADR-0198 và bản sửa ADR-0182 dạng văn bản — `day-len` sẽ nhập cả hai).
- **Văn bản:** `docs/adr/ADR-0198-doi-tac-tra-sau-gon-mac-dinh-tra-sau.md` (accepted 2026-11-12). Chữ theo cột «Khuyến nghị». **Không làm** ADR-0182.
- **Không migration, không đổi quyền, không đổi route, API giữ trường hạn mức** (Đ1 mục 6).

## Đã làm, theo mục

| Mục | Ở đâu | Bài kiểm |
|---|---|---|
| Đ1 mục 1 (ai là đối tác) | `laDoiTacTraSau` — `src/shared/tra-sau.ts` (giữ `PARTNER`, không giữ `ACCOUNTING`) | `han-muc-tra-sau-hien-thi.test.ts` «ADR-0198 Đ1.4 và Đ1 mục 1» |
| Đ1.2 câu ô lập đơn | `CAU_TRA_SAU_DOI_TAC`, `cauChonTraSau({ …, laDoiTac })` — `src/shared/han-muc-tra-sau-hien-thi.ts`; `web/order-form.ts` (`napTraSau`) | «ADR-0198 Đ1.2» |
| Đ1.3 câu khoá quá hạn | giữ `CAU_KHOA_QUA_HAN` (không số) | «ADR-0198 Đ1.2», «Đ1.7» |
| Đ1.4 câu vượt hạn mức của máy chủ | `cauKhongTraSauChoNguoiGui`, `CAU_VUOT_HAN_MUC_DOI_TAC` — `src/shared/tra-sau.ts`; nối ở `kiemDon` và `congSuaTangTraSau` (`src/modules/orders/tra-sau-cong.ts`) qua trường bắt buộc `nguoiGuiLaDoiTac` (`NguoiGuiTraSau`, quên truyền ⇒ typecheck đỏ). Nơi truyền: `POST /api/orders`, `PUT /api/orders/:id` (`src/modules/orders/index.ts`), `kiemCongXacNhan` (`xac-nhan-chung.ts`, theo `actor` — phủ `/status`, `gui-don`, `quyet-dinh`), sửa số khách văn phòng (`money-edit`) và hướng dẫn viên (`handler-money-edit`, `src/modules/dispatch/index.ts`). Mã lỗi `vuot_han_muc` giữ nguyên | `src/tra-sau-xac-nhan.test.ts`: ca «gui-don nhánh B» (đối tác gửi ⇒ câu không số), «/status» và «quyet-dinh» (văn phòng gửi ⇒ câu có số); ca mới «ADR-0198 Đ1.4: lưu đơn…» (POST + PUT) |
| Đ1.5 «Trả sau của tôi» | `dongTraSauCuaToi(r, laDoiTac)` — `han-muc-tra-sau-hien-thi.ts`; `web/tra-sau-cua-toi.ts` | «ADR-0198 Đ1.5» |
| Đ1.7 không lộ số | bài «ADR-0198 Đ1.7» dùng ba số canh khác nhau (hạn mức, còn được dùng, đang nợ) | xem «Cách hiểu Đ1.7» dưới |
| Đ2 chọn sẵn | `duocChonSanTraSau` + trường `chonSan` của `quyetHinhThuc`; `web/order-form.ts`: cờ `daChonHinhThuc` (đặt khi chạm nút hoặc khi `datHinhThuc` nạp nháp / bản đang gõ dở), `donMoi = !editId`. Khi đang «chọn sẵn», `hinhThucMuon` giữ «Thanh toán ngay» nên bên đặt mất Trả sau thì ô về «Thanh toán ngay» không câu báo | «ADR-0198 Đ2 mục 6: bốn ca» |
| Bảng tham chiếu | khái niệm «Trả sau» và «Hạn mức khả dụng» ở `src/shared/bang-tham-chieu-khai-niem.ts`, sinh lại `docs/BANG-THAM-CHIEU.md` (`npm run tham-chieu`) | `src/bang-tham-chieu.test.ts` |
| Nhật ký thay đổi | mục 2.95 (số tạm) ở `src/shared/changelog.ts` | `changelog.test.ts` |

**Đỏ trước, xanh sau:** bài thuần đỏ vì chưa có hàm (lỗi nạp) rồi xanh 19/19. Ca «gui-don nhánh B» của `tra-sau-xac-nhan.test.ts` đỏ sau khi nối máy chủ (bài cũ đòi câu có số) — chứng tỏ đường xác nhận của đối tác đã đổi chữ; sửa bài theo luật mới. Ca POST mới: cố ý đặt `nguoiGuiLaDoiTac: false` ở `POST /api/orders` ⇒ đỏ; hoàn nguyên ⇒ xanh (P16).

## Cách hiểu Đ1.7 (ghi lại, không chặn)

Đ1.7 viết «mọi chữ trả về cho đối tác không chứa ký hiệu «₫»», nhưng Đ1.5 giữ dòng «Đang nợ …» (có ₫) và từng đơn nợ (`cauDonNo`, có ₫). Đọc nguyên văn thì hai mục mâu thuẫn. Người thi công hiểu: **số hạn mức và hạn mức khả dụng không bao giờ lộ** ở bất kỳ chữ nào cho đối tác (bài dùng số canh), và **ba câu mới** (câu ô lập đơn, dòng một «Trả sau của tôi», câu vượt hạn mức) không có «₫» hay số tiền. Số đang nợ vẫn hiện như Đ1.5 nói.

## Dò đường khác lộ số hạn mức cho đối tác (ADR «Chưa kiểm»)

| Đường | Đối tác tới được? | Có số hạn mức? | Kết quả |
|---|---|---|---|
| Màn «Hạn mức trả sau» (`web/han-muc-tra-sau.ts`), ô «Trả sau» ở Cấp độ đại lý (`web/o-tra-sau.ts`) | Không — ô `credit.limit.view` cột Đối tác `none` | Có | Không đổi (văn phòng) |
| Câu báo ở `billing` khi đặt hạn mức (`vuot_muc_toi_da`), nhật ký `credit_limit_set` / `credit_tier_default_set` | Không — route của Quản trị/Toàn quyền; lịch sử Đối tác ẩn `credit_limit_set`, `credit_limit_stopped` (`src/shared/lich-su-doi-tac.ts`) | Có | Không đổi |
| Nhắc hạn trả sau (`src/modules/billing/tra-sau-nhac.ts`), hộp thư / thông báo (`thongbao`), lần gửi (`lan-gui`) | Có | Không — không nhắc hạn mức | Sạch |
| Trợ lý (`src/modules/tro-ly`) | — | Không có chữ nào về Trả sau / hạn mức | Sạch |
| Email | Không có đường email nào dựng chữ Trả sau | — | Sạch |
| Câu khi đổi bên đặt (`CAU_DOI_BEN_*`), gộp hồ sơ (`parties`) | Đổi bên: có thể; gộp: văn phòng | Không — câu riêng không số | Sạch |
| Câu huỷ / đổi bên còn nợ (`CAU_HUY_CON_NO`, `CAU_DOI_BEN_CON_NO`), `cauChoDoiTacThanhToan` | Có | Có số **nợ**, không số hạn mức | Đúng Đ1.5 (vẫn thấy số đang nợ) |
| Bài Hướng dẫn «Cấp hạn mức trả sau…» (`huong-dan-bai-noi-dung.ts`) | Bài cho văn phòng | Nói cách đặt, không số của ai | Không đổi |
| Sửa số khách đơn Trả sau đã xác nhận (`congSuaTangTraSau`) | Đối tác thuần: không (ô `order.money.edit` cột Đối tác `none`); tài khoản lai Hướng dẫn viên + Đối tác hoặc Quản trị + Đối tác: có thể | Có | Đã nối `nguoiGuiLaDoiTac` cho cả hai route (phòng xa) |

## Kịch bản Chrome

`docs/evidence/2026-11-05-tra-sau/kich-ban/tra-sau-smoke.mjs` (cập nhật): P1 (trang Tôi của Đối tác: không số hạn mức, không «Hạn mức khả dụng»), P2 mới (Đối tác lập đơn mới: câu gọn, «Trả sau» chọn sẵn, không câu báo), F1 giữ «Hạn mức khả dụng» cho Bán hàng. Ảnh: `docs/evidence/2026-11-12-adr-0198/anh/` (`doi-tac-lap-don-{1440,390}.png`, `tra-sau-cua-toi-{1440,390}.png`, và ảnh của các bước văn phòng).

Kết quả 12/11: **«TRA SAU SMOKE OK»** (cần `AXE_JS`, đã có). Hai lượt đầu P2 đỏ vì vùng chạm: hai ô tròn «Thanh toán ngay / Trả sau» bị luật chung `input { display: block; width: 100% }` kéo ra cả dòng, nhãn chỉ cao ~34px — lỗi giao diện có từ ADR-0168 (bước F1 cũ có ghi «vùng chạm» trong tên nhưng không gọi `bocucSach`, nên chưa ai bắt). Sửa CSS `.tra-sau-khoi > label` (flex, cao tối thiểu `--tap-min`) và `.tra-sau-khoi > label > input` (không kéo giãn) ở `public/app.css`; hàm đo của kịch bản nay đo cả nhãn khi ô tròn / ô tích nằm trong `<label>` (bấm chữ cũng chọn). Lượt ba, bốn xanh; ảnh 390 cho thấy ô tròn nằm cạnh chữ. Ảnh chụp cả trang ở 390 có thanh tiêu đề dính đè lên câu dưới hai ô tròn (giới hạn của cách chụp cả trang); ảnh 1440 thấy đủ câu.

## Nợ / việc để sau

- Đ2 mục 5 (Trả sau theo dịch vụ, ADR-0178 Đ2) chưa thi công ở ô lập đơn: khi làm, sửa `duocChonSanTraSau` / `quyetHinhThuc` cho khớp.
- Chưa thử iPhone thật.

## Kiểm độc lập (subagent `nguoi-kiem-doc-lap`, chỉ đọc, 12/11)

**ĐẠT**, không có phát hiện mức cao hay vừa. Người kiểm tự chạy năm tệp bài liên quan (74/74 xanh), `npm run typecheck` (0 lỗi), `npm run tham-chieu` (bảng sinh lại khớp bản đã commit), và phá thử trên bản sao tạm: làm câu đối tác luôn có số ⇒ bài Đ1.7, Đ1.4 đỏ; ép `nguoiGuiLaDoiTac: false` ở `kiemCongXacNhan` ⇒ `tra-sau-xac-nhan.test.ts` đỏ. Xác nhận không có mã nào thi công ADR-0182. Ba điểm mức thấp, ghi lại, không chặn:

1. Luồng cờ ở `web/order-form.ts` (`napTraSau`, `daChonHinhThuc`) không có bài tự động riêng; chỉ kịch bản Chrome P2 canh. Có thể tách thành hàm thuần sau.
2. Khi `GET /api/tra-sau/con-duoc-dung` lỗi, `napTraSau` giữ nguyên ô (có từ trước; máy chủ vẫn kiểm lúc lưu).
3. Phần nối cho tài khoản lai ở `money-edit` / `handler-money-edit` là phòng xa, chưa có bài riêng.

## Lượt `npm test` đầy đủ đầu tiên: hai bài đỏ, đã xử lý

1. `src/giao-dien-hoi-bang-quyen.test.ts` (hàng rào «giao diện hỏi bảng quyền»): `laDoiTacTraSau` hỏi thẳng mã `ACCOUNTING`. Đây là câu hỏi DANH TÍNH mà ADR-0198 Đ1 mục 1 định nghĩa bằng mã, đúng loại ngoại lệ hàng rào cho phép; thêm một mục `CHO_PHEP` có lý do (khuôn dòng khớp nguyên văn, đổi dòng thì đỏ lại). Không đổi cách dò. **Cần người kiểm / chủ biết:** đây là một mục ngoại lệ mới của hàng rào.
2. `src/huong-dan-may-canh.test.ts`: bài Hướng dẫn «Cấp hạn mức trả sau cho đối tác» neo vào `han-muc-tra-sau-hien-thi.ts`. Đọc lại bài, thêm một câu ở «Điều dễ sai» (đối tác không thấy con số hạn mức; đơn mới chọn sẵn «Trả sau»; câu báo khi vượt mức), rồi `npm run huong-dan:xem-lai -- han-muc-tra-sau`.
3. Lượt hai: `src/shared/tro-ly-van-nghia.test.ts` (C4, số đo kho Trợ lý) đỏ 49 → 50 vì câu Hướng dẫn mới có chữ «lập»; đo lại và ghi chú theo khuôn sẵn có của bài (luật không đổi).
