# Luật mã định danh + nút «Sửa» cho Loại đối tác và Cấp đại lý — đặc tả

> Ngày: 2026-10-31. Trạng thái: **BẢN NHÁP, chờ chủ duyệt** (ba quyết định ở §5).
> Nguồn: trò chuyện với chủ dự án 31/10. Phần chủ đã nói ghi «chủ:»; phần AI đề xuất ghi «đề xuất».
> Nối tiếp: ADR-0117 lần 1 (loại đối tác là dữ liệu: thêm / tắt / bật) và lần 2 (cấp đại lý = mức TA dùng chung). Đặc tả này không đổi hai ADR đó, chỉ thêm việc sửa.

## 1. Vì sao

- **Chủ:** loại đối tác cần sửa được (tên và thông tin liên quan), không xoá. **Chủ:** áp luôn cho Cấp đại lý.
- **Chủ:** mỗi bản ghi dữ liệu (thực thể, giao dịch, lịch sử…) phải có một mã định danh, theo **một quy tắc thống nhất** — tránh cảnh «DL-Cap1» cho TA1 nhưng «dailyc-Caphai» cho TA2.
- **Chủ:** mã định danh đưa ra màn hình; cho đổi tên, **không** đổi mã.
- Luật nền đã có gốc: Mô hình dữ liệu lõi mục 0 — «mã nội bộ do hệ thống cấp, không đổi suốt đời thực thể, không mang nghĩa nghiệp vụ». Việc ở đây là **cụ thể hoá** câu đó thành khuôn kiểm được.

## 2. Điều luật đề xuất (Hiến chương `docs/ARCHITECTURE.md` Phần I, điều mới 5.26)

> **5.26 Mã định danh: máy cấp, một khuôn, không đổi.** Mỗi bản ghi nghiệp vụ có một mã định danh do **máy chủ cấp** lúc tạo; người dùng không gõ, không sửa mã. Mã **không mang nghĩa nghiệp vụ** (không chứa tên, cấp, ngày, số thứ tự có nghĩa) — nghĩa nằm ở tên và ghi chú, là thứ sửa được. Khuôn cho **loại bản ghi mới từ ngày điều này được duyệt**: `<TIỀN TỐ>_<8 chữ hoa ngẫu nhiên A–Z>`, tiền tố 2–3 chữ hoa cố định theo loại bản ghi, khai ở **đúng một** bảng tiền tố trong mã; hai loại không trùng tiền tố (bài kiểm bắt). Mã hiện được trên màn hình để xem và chép, không có ô sửa. Đổi tên không đổi mã; nhật ký về một bản ghi ghi **mã** của bản ghi đó. **Không thuộc điều này:** mã của tập đóng mà mã chương trình rẽ nhánh theo (trạng thái, mã quyền, loại bên — HC 2.2), và khoá tự nhiên từ bên ngoài (mã số thuế, mã tour từ Google Sheet — HC 2.1a). Các khuôn cũ là **nợ có tên**, rà riêng, không đổi mã đã cấp: chuỗi ngẫu nhiên 36 ký tự (đơn, hồ sơ, nhật ký…), mã đơn `TD-YYYYMMDD-NNNN` (mang ngày và số thứ tự), mã địa điểm do người gõ, năm loại đối tác có sẵn mang mã tiếng Anh (`TRAVEL_AGENCY`…).

Hai loại bản ghi đã theo đúng khuôn này từ trước: Loại đối tác tự thêm `LD_…`, Cấp đại lý `MT_…`. Không mã nào phải đổi.

## 3. Ô «Sửa» — chung cho hai loại

Ở trang Hoa hồng đối tác, mỗi **loại đối tác** (thẻ «Loại đối tác») và mỗi **cấp đại lý** (thẻ «Các cấp đại lý») có nút **Sửa** cho người có ô `partner.commission.write` (Kế toán, Quản trị, Toàn quyền — như ADR-0117, **không thêm ô quyền**).

| Phần | Loại đối tác | Cấp đại lý |
|---|---|---|
| Mã định danh | Hiện, có nút chép, không sửa | Như bên trái |
| Tên | Sửa được — **chỉ loại tự thêm** (§5 câu 2) | Sửa được |
| Ghi chú (ô mới, ≤ 500 chữ, để trống được) | Sửa được — mọi loại | Sửa được |
| Ai tạo, lúc nào; ai sửa gần nhất, lúc nào | Chỉ xem | Chỉ xem |
| Đang dùng ở đâu | Số hồ sơ đang mang loại | Số loại và số đối tác đang theo cấp |

Bật/Tắt, gắn cấp cho loại, mức hoa hồng: giữ ở chỗ cũ, không vào ô Sửa. Mã cũng hiện mờ dưới tên ở thẻ.

Hành vi chung:
- Tên: 2–60 chữ, không trùng tên khác **cùng loại**, không chứa SĐT / số tài khoản / email (luật đang dùng lúc thêm). Ghi chú: cấm như tên.
- Đổi tên đổi chữ ở mọi màn hình **tra tên theo mã** lúc hiển thị (thẻ, ô chọn, hồ sơ trong Danh bạ, ô Kiểm tra hoa hồng). Dòng nhật ký **cũ** giữ tên lúc ghi (nhật ký chỉ-thêm). Bản chụp của đơn đã xác nhận giữ nguyên tiền (ADR-0117 Đ7); nếu bản chụp có chép chữ tên thì giữ tên cũ — người thi công kiểm và ghi rõ.
- Hai người sửa cùng lúc: người lưu sau nhận «… vừa được người khác sửa, mở lại để xem bản mới», không ghi đè âm thầm. Tắt / Bật cũng tính là một lần sửa (mở ô Sửa trước khi người khác tắt rồi bấm lưu ⇒ nhận câu trên).
- Lưu mà không đổi gì: không ghi, không có dòng nhật ký.
- Nhật ký: thêm bốn hành động — «Đổi tên loại đối tác», «Sửa ghi chú loại đối tác», «Đổi tên cấp đại lý», «Sửa ghi chú cấp đại lý». Đổi tên ghi `tên cũ → tên mới`; sửa ghi chú **không** chép nội dung (§5 câu 3). Từ bản này **mọi** dòng nhật ký về loại đối tác và cấp đại lý (kể cả thêm, tắt, bật đã có) ghi mã ở ô đối tượng của nhật ký.

Khác nhau về dấu vết:
- **Cấp đại lý** đã có sẵn cột ai tạo / lúc nào / ai sửa / lúc nào trên chính bảng ⇒ hiện đủ cho mọi cấp.
- **Loại đối tác** chưa có các cột đó ⇒ thêm vào; loại tạo trước bản này để trống và hiện «Tạo trước 31/10/2026 — chưa có dấu vết». Không đoán theo tên trong nhật ký cũ (đổi tên làm đoán sai).

## 3b. Trang ghép (CLAUDE.md §9 — lượt duyệt có ≥ 2 quyết định chạm dữ liệu)

**Bảng vai `pty_role_type` chứa những loại dòng nào:** vai nội bộ (nhóm INTERNAL: Bán hàng, Kế toán, Tài xế công ty…); vai bên ngoài dùng để đăng nhập (nhóm EXTERNAL, trong đó năm loại «Có sẵn» được hưởng hoa hồng, và Tài xế đối tác); dòng nhóm OTHER (Công ty chủ, Nhà xe đối tác, các mã vai cũ đã ngưng); và **loại đối tác tự thêm** (nhóm OTHER, cờ `is_partner_label = 1`). Đặc tả này thêm vào bảng: một cột ghi chú và bốn cột dấu vết, **không** thêm loại dòng mới.

**Bảng cấp `prc_rate_tier`:** chỉ chứa cấp đại lý do người dùng tạo. Thêm một cột ghi chú.

**Dòng bản đồ quyền chạm hai bảng và áp cho loại dòng nào:**

| Ô quyền | Việc | Áp cho |
|---|---|---|
| `partner.commission.write` (Kế toán, Quản trị, Toàn quyền; trừ tài khoản giữ quyền Đối tác) | Đổi tên loại | **Chỉ** loại tự thêm |
| như trên | Sửa ghi chú loại | Năm loại Có sẵn + loại tự thêm (dòng có trong danh sách được hưởng) |
| như trên | Đổi tên, sửa ghi chú cấp | Mọi cấp |
| `partner.commission.view` | Xem mã, ghi chú, dấu vết, số nơi dùng | Như danh sách hiện xem được hôm nay |
| quyền gắn vai ở Danh bạ (Quản trị, Toàn quyền — ADR-0117 Đ3) | Gắn loại cho hồ sơ | **Không đổi** |

Vai nội bộ, vai đăng nhập khác, dòng OTHER không phải loại đối tác: không lệnh nào ở đây ghi được (máy chủ trả 404).

**Cổng nào canh cửa nào:**
- Máy chủ: route PATCH kiểm `can(partner.commission.write)` + `holdsPartner` (như route Tắt/Bật hiện có), rồi kiểm loại dòng. Câu SQL đổi tên tự giới hạn `is_partner_label = 1`; câu sửa ghi chú tự giới hạn dòng có trong danh sách được hưởng. Hai lớp: bỏ kiểm ở route thì câu SQL vẫn không đổi được dòng ngoài phạm vi (0 dòng ⇒ 404).
- Giao diện (chỉ ẩn/hiện, máy chủ kiểm lại): nút **Sửa** hiện khi người xem có `partner.commission.write`. Trong ô Sửa, ô **Tên** chỉ gõ được với loại tự thêm; với loại Có sẵn, ô Tên hiện chữ chỉ đọc. Không chỗ ẩn/hiện nào khác đổi nghĩa.

## 4. Ngoài phạm vi

- Rà và thống nhất khuôn mã của toàn Nền tảng (nợ ở §2) — việc riêng, phiên riêng.
- Nút xoá đơn hàng cho Toàn quyền — đang bàn riêng.
- Đổi tên các vai nội bộ, nhà cung cấp và mọi dòng khác cùng bảng vai — không đụng.

## 5. Ba quyết định cần chủ

1. **Duyệt điều 5.26 ở §2** (áp cho loại bản ghi mới; khuôn cũ là nợ rà riêng). Khuyến nghị: duyệt.
2. **Năm loại «Có sẵn»** (Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên — cũng là vai đăng nhập của đối tác) **chỉ sửa ghi chú, không đổi tên**, vì đổi tên sẽ đổi chữ trên màn tài khoản. Mã cũ của chúng là chữ tiếng Anh nên ô mã hiện «Loại gốc của hệ thống — mã cố định» thay cho mã thô (luật cấm chữ Anh lộ ra người dùng). Khuyến nghị: đồng ý.
3. **Nội dung ghi chú không vào nhật ký** (chỉ ghi «đã sửa ghi chú»), vì ghi chú là chữ tự do, dễ lọt thông tin cá nhân. Khuyến nghị: đồng ý.

## 6. Tiêu chí nghiệm thu (kiểm được)

- A1. Kế toán đổi tên một loại tự thêm và một cấp đại lý → tên mới hiện ở thẻ, ô chọn loại ở Danh bạ, ô Kiểm tra hoa hồng; mã không đổi; một dòng nhật ký có mã.
- A2. Đổi tên trùng tên khác cùng loại → 409, không ghi gì. Tên hoặc ghi chú có SĐT → 400.
- A3. Đổi tên loại «Có sẵn» → máy chủ từ chối (không chỉ ẩn nút); sửa ghi chú loại «Có sẵn» → được. Mã vai nội bộ / mã lạ → 404.
- A4. Tài khoản không có `partner.commission.write`, và tài khoản giữ quyền Đối tác → 403 cho mọi lệnh sửa.
- A5. Hai lệnh sửa cùng gửi trên cùng bản cũ → một thắng, một 409, nhật ký đúng một dòng. Mở ô sửa → người khác Tắt → lưu → 409.
- A6. Dòng nhật ký «Sửa ghi chú» không chứa nội dung ghi chú.
- A7. Mọi dòng nhật ký mới về loại đối tác / cấp đại lý có mã ở ô đối tượng.
- A8. Bài kiểm bảng tiền tố: thêm cố ý một tiền tố trùng → đỏ → hoàn nguyên (ghi vào `docs/SO-HANG-RAO.md`).
- A9. Đơn đã xác nhận trước khi đổi tên giữ nguyên tiền hoa hồng (e2e).

## Phụ lục kỹ thuật (cho người thi công — các điểm AI đã tự chốt)

- **Migration `0130`** (kiểm lại mọi nhánh trước khi đặt số): `pty_role_type` thêm `note`, `created_at`, `created_by`, `updated_at`, `updated_by` (đều NULL được — dòng cũ để NULL); `prc_rate_tier` thêm `note`. Trigger `prc_rate_tier_update_scope` đã cho đổi cột ngoài mã / người-giờ tạo ⇒ không phải sửa. `docs/data-dictionary.json` (hạng N1) + `npm run dict`.
- **Khoá lạc quan bằng `updated_at`** (luật Phần II), không thêm cột `version`: câu cập nhật có điều kiện `updated_at IS ?` (so được cả NULL của dòng cũ) → nhật ký `changes() > 0`. Câu Tắt/Bật loại đối tác (`partner_label_set_active`) sửa để cũng đặt `updated_at/updated_by`; câu Tắt/Bật cấp đã đặt sẵn. Câu thêm loại đặt `created_*` + `updated_*`.
- **Route** (cạnh các route `…/tat`, `…/bat` hiện có): `PATCH /api/pricing/loai-doi-tac/:code` và `PATCH /api/pricing/muc-ta/:code`, thân `{ ten?, ghiChu?, updatedAt }`. Vắng trường = giữ nguyên; `ghiChu: ""` = xoá ghi chú; vắng cả hai → 400. Lệnh GET danh sách trả thêm `ghiChu`, `taoLuc/taoBoi`, `suaLuc/suaBoi`, `updatedAt`, số nơi đang dùng.
- Ghi `pty_role_type` chỉ qua câu chưa chạy do `parties/index.ts` công bố (như `themLoaiDoiTacStatement`). Đổi tên: chỉ dòng `is_partner_label = 1`; ghi chú: dòng có trong danh sách được hưởng (`prc_beneficiary_role`) — đúng năm loại có sẵn + loại tự thêm.
- **Luật tên**: `kiemTenLoaiDoiTac(raw, daCo)` nhận danh sách tên ⇒ nơi gọi lọc bỏ chính loại đang sửa theo mã; `kiemTenMucTa` + chỉ mục duy nhất `name_key` cho cấp. Luật ghi chú: một hàm thuần mới ở `src/shared/` (dùng chung hai module), có test.
- **Bảng tiền tố**: `src/shared/ma-dinh-danh.ts` (`LD`, `MT`) + hàm sinh mã chung; `maLoaiDoiTac` (parties) và `maMucTa` (pricing) gọi hàm này. `src/shared` không import module ⇒ hợp luật kiến trúc; xác nhận bằng `architecture.test.ts`.
- **Nhật ký**: `targetType = "ledger"` (nhóm sẵn có của các hành động `prc_partner_type_*`, `prc_rate_tier_*`), `targetId = mã`. Bốn hành động mới khai ở `src/shared/audit-actions.ts`, thêm vào danh sách lịch sử ở `src/shared/lich-su-doi-tac.ts` / `lich-su-noi-bo.ts` như các hành động cùng nhóm.
- **Giao diện**: `web/hoa-hong-loai.ts`, `web/hoa-hong-cap.ts` (nút), `web/hoa-hong-hop.ts` (một hộp sửa dùng chung hai loại). Thêm chữ vào hướng dẫn Kế toán và một mục nhật ký thay đổi.
- Việc lớn (dữ liệu + luật): thi công xong phải có người kiểm độc lập chỉ đọc (CLAUDE.md §3).
