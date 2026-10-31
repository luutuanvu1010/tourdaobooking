# Đề xuất ADR — Đóng bán: tạm ngừng bán một dịch vụ hoặc một nhóm cho MỌI bên đặt, theo ngày đi và theo thời điểm thao tác

- **Trạng thái:** đề xuất, **chưa duyệt**. AI soạn, không tự duyệt (Hiến pháp N3). **Số ADR lấy lúc chép** sang `docs/adr/`; số migration lấy lúc thi công (luật từ bản 1.46, `docs/adr/README.md`).
- **Ngày:** 2026-10-30. **Lượt duyệt:** Lượt B của chuỗi «tình trạng bán và phụ thu» (thứ tự ở `00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-3-PHU-THU-VA-DAC-DIEM.md`). **Không gộp** với Lượt A (sửa ADR-0146), Lượt C, Lượt D.
- **Loại:** việc lớn (dữ liệu, quyền). Không chạm tiền. **Cửa:** dữ liệu một chiều mềm (một bảng chỉ thêm, ở lại mãi); hành vi tắt được bằng cách mở lại mọi lần đóng.
- **Đi kèm:** `TRANG-GHEP.md` cùng thư mục (bắt buộc theo `CLAUDE.md` §9 vì lượt này có ≥ 2 quyết định).
- **Vòng kiểm:** người kiểm độc lập (chỉ đọc) đã soát bản đầu ngày 30/10 (`../KIEM-A-B/BAO-CAO.md`, mục B-1 … B-10). Bản này đã sửa theo B-1 (bỏ lối Còn vé kèm đổi ngày, đúng B4), B-2, B-3 (8 cửa), B-4 (C6 nêu tiền lệ, phương án tách), B-5 (`CHECK` cho `scope`), B-6 (quy tắc mở lại hai ca biên), B-7 (mốc tin), B-8, B-9. Vòng 2 (cùng ngày): ĐẠT; đã sửa thêm R2B-1 (trigger `BEFORE INSERT` cho cột mở lại, `CHECK` `valid_to_at = reopened_at`, tiêu chí 1d), R2B-2 (chữ hàng rào tiêu chí 15), R2B-3 (định nghĩa «đang / sắp», tiêu chí Đ4.5, Đ6.6), R2B-4 (trang ghép 5.1). Phần sửa vòng 2 chưa được soát lại.
- **Bản đối chiếu mã:** worktree `tinh-trang-ban`, HEAD `a129d3d` (trùng `main` trong máy ngày 30/10). Mọi «tệp:dòng» dưới đây đúng tại bản này. Điều không đọc trong mã ghi **chưa kiểm**.

## Lời chủ (nguyên văn)

- Yêu cầu gốc, 30/10: «tôi cần thiết lập một số dịch vụ không khả dụng với một số vai trò đối tác cụ thể, dịch vụ có sẵn hay không có sẵn ở một khoảng thời gian cụ thể. Ví dụ vé Hòn Tằm không bao gồm vận chuyển thì không cho phép đối tác là Lễ tân hoặc Tài xế Taxi đặt. Vé Vinwonders gồm buffet, có thể hết sau 5 giờ nữa hoặc hết trong phạm vi một số ngày cụ thể, có thể tắt/mở thủ công bởi bán hàng hoặc quản trị hoặc toàn quyền»
- Chốt cả gói khuyến nghị, 30/10: «ok chốt , bạn có muốn hỏi thêm gì cho tôi hay không hoặc những lưu ý nào hay không». Người ghi hiểu thành bảng B1–B7 (`00-dau-vao/QUYET-DINH-CHU-2026-10-30-TINH-TRANG-BAN-VA-GIA-MUA.md`).
- Nguyên tắc chi phối, 30/10 (lượt 1 của tệp LUOT-3): «ở đây chúng ta cố gắng coi logic nghiệp vụ là dữ liệu nhé, tức phải nhập tay thủ công hoặc biến nó thành tùy chọn /thao tác trong bảng điều khiển chứ không được khóa cứng trong code (tôi cực kỳ tán thành )».

### Điều đã chốt mà đề xuất này áp dụng, không hỏi lại

| Mã | Đã chốt (bảng B1–B7 ngày 30/10) | Ở đây |
|---|---|---|
| B1 | «Hết sau X giờ»: người đóng chọn mọi ngày đi hay chỉ hôm nay; mặc định chỉ hôm nay | Đ1, Đ2 |
| B2 | Bán hàng chỉ đóng; mở lại do Quản trị, Toàn quyền | Đ5 |
| B3 | Không ai bán vượt khi dịch vụ đang đóng | Đ3 (không có cửa vượt) |
| B4 | Đơn chờ xác nhận gặp dịch vụ đang đóng: không cho «Còn vé» | Đ3 |
| B5 | Đối tác thấy dịch vụ đang đóng ở dạng mờ, kèm nhãn «Tạm ngừng bán» | Đ4 |
| B6 | Báo người có nháp hoặc đơn chờ xác nhận chứa dịch vụ bị đóng | Đ6 |
| B7 | Lý do đóng bắt buộc | Đ1 |
| — | Không phải tồn kho (BACKLOG mục 49, `BL-TON-KHO` vẫn để sau) | Phạm vi |

## Quan hệ với ADR cũ

- **Bổ sung ADR-0136** (bước xác nhận đơn): thêm một cổng ở Gửi xác nhận, Gửi đơn, Còn vé, `/status`. Không đổi luồng, không đổi trạng thái đơn.
- **Đứng cạnh ADR-0146** (luật bán theo loại đối tác, accepted 28/10, **chưa thi công** — không có bảng, migration hay mã nào nhắc `prc_sales_block`, kiểm bằng `git grep` 30/10): dùng **chung chỗ đặt cổng** và **chung một hàm cổng** ở `orders` (Đ3). Không sửa chữ nào của ADR-0146. Đóng bán luôn xét **sau** luật bán. **Bổ sung ADR-0146 Đ3 về chỗ đặt** nếu chủ chọn C5 = (a): luật bán được gọi thêm một lần trước `tinhCanXacNhan` ở `/status` và Gửi xác nhận. Việc này đổi chỗ người dùng gặp `sales_blocked` ở `/status`, nên phải ghi vào kế hoạch thi công ADR-0146 (Lượt A).
- **Giữ ADR-0028 đ2 / ADR-0033** («danh mục cho form lập đơn giống hệt văn phòng»): Đối tác và văn phòng nhận **cùng** danh mục, cùng cờ tạm ngừng (Đ4). Ngoại lệ duy nhất vẫn là ADR-0146 Đ4.
- **Giữ cờ ẩn** của `catalog_override.hidden` (`PATCH /api/catalog/:code`, `src/modules/catalog/index.ts:371-396`) nguyên nghĩa; đóng bán là cơ chế **khác**, không thay cờ ẩn (Đ3, bảng thứ tự).
- **Giữ ADR-0058** (một dịch vụ thuộc đúng một nhóm; nhóm hiện hành), **ADR-0021** (một ngày đi cho cả đơn), **ADR-0135** (nháp riêng tư của người lập), **ADR-0118/0149** (cổng đưa đón — thứ tự ở Đ3).
- **Không** dùng vai/loại hồ sơ làm điều kiện: đóng bán áp cho mọi bên đặt, nên **không** là ngoại lệ của ADR-0005 đ1 / ADR-0018 đ3 (khác ADR-0146).

## Hiến chương áp dụng (Điều 6.1)

- **2.2** — lần đóng là **chính sách** (dòng có hiệu lực, nhập trên màn hình); cách xét là **luật tính** (hàm thuần có test). Tập phạm vi {dịch vụ, nhóm} và hiệu ứng duy nhất «chặn» là **tập đóng**, đổi bằng ADR.
- **5.1** — bất biến «chỉ thêm, mở lại một lần» ở **cả** trigger lẫn mã.
- **5.3** — bảng của `catalog`, chỉ `catalog` ghi; `orders` gọi qua `catalog/index.ts` (cạnh đã có).
- **5.5** — chỉ thêm, kết thúc thay xoá, có dấu vết người/lúc.
- **5.10, K16** — thông báo là hình chiếu, không phải nguồn sự thật (Đ6).
- **5.11** — **không** có Cron: hiệu lực «sau X giờ» tính bằng phép so với giờ của request, không có tác vụ tự động nào ghi dữ liệu.
- **5.12** — nhật ký ghi ai đóng, ai mở; không ghi chữ tự do (Đ5).
- **Không lệch điều nào.**

## Xây trên lỗ đang hở

**Không.** Đối chiếu `docs/quyen-hoan.json` mục `phat_hien` ngày 30/10 (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2):
- Không chạm tiền, không chạm sổ (TNV-G1/G3/G4, HC-4.2 không liên quan).
- Không thêm Cron hay tác vụ tự động (HC-5.11 là Cron đồng bộ danh mục; đề xuất này không đụng tới).
- Hết vé trên đơn chờ là đường huỷ **đã có**; đơn chờ không có khoản thu (Gửi xác nhận và Gửi đơn nhánh A đều chặn khoản thu — `chanKhoanThu`, `src/modules/orders/xac-nhan-route.ts:123,154`), nên không mở đường mới tới TNV-G1.
- HC-5.19: migration chỉ thêm bảng, không ghi đè dữ liệu cũ.

---

## Tóm tắt cho chủ (lời thường)

1. Mỗi lần **đóng bán** ghi: dịch vụ hay cả nhóm; **những ngày đi** bị đóng (để trống là mọi ngày); **từ lúc nào** (ngay bây giờ, hoặc sau X giờ); **tới lúc nào** (để trống là tới khi có người mở lại); và **lý do** (bắt buộc).
2. Bán hàng, Quản trị, Toàn quyền đóng được. Chỉ Quản trị, Toàn quyền mở lại được. Không ai bán vượt.
3. Khi đang đóng: không ai thêm dịch vụ đó vào đơn được, kể cả lưu nháp; không ai gửi hay xác nhận đơn chứa nó; đơn đang chờ xác nhận không bấm được «Còn vé». Đơn **đã xác nhận** giữ nguyên, trừ khi đổi ngày đi sang ngày bị đóng.
4. Danh mục lập đơn vẫn hiện dịch vụ, nhưng **mờ**, kèm nhãn «Tạm ngừng bán…» và lý do, cho cả văn phòng lẫn Đối tác.
5. Người có nháp hoặc đơn chờ chứa dịch vụ vừa bị đóng thấy tin trong hộp thông báo và nhãn trên chính đơn đó.
6. Đây **không** phải đếm chỗ trống (tồn kho). Nền tảng chỉ ghi «đang ngừng bán», không biết còn bao nhiêu chỗ.

---

## Hiện trạng đã kiểm trong mã (30/10, HEAD `a129d3d`)

| # | Điều | Bằng chứng |
|---|---|---|
| H1 | `catalog` chỉ được phụ thuộc `audit`; `orders` → `catalog` và `pricing` → `catalog` là cạnh đã có | `src/architecture.test.ts:33` (`catalog: ["audit"]`), `:54` (`orders: [… "catalog" …, "pricing"]`), `:57` (`pricing: ["parties", "catalog", "audit"]`) |
| H2 | `orders` đang gọi `catalog` qua `index.ts` ở hai tệp: `getEffectiveServices`, `maDatKhongDon`, `tenNhomHienHanh` | `src/modules/orders/service.ts:12`, `src/modules/orders/xac-nhan-route.ts:18` |
| H3 | Bảng mới của `catalog` phải mang tiền tố `ctl_` (tên tạm `cat_stop_sale` ở đề xuất 30/10 sẽ làm bài kiến trúc đỏ) | `src/architecture.test.ts:212` (`TABLE_PREFIX`: `ctl_` → `catalog`) |
| H4 | SQL mới của `catalog` chỉ ở tệp «nửa nghiêm» (`defineSql`, EXPLAIN); `catalog` còn LEGACY tới 2027-03-31 | `src/modules/catalog/nhom-repo.ts:1-6`, `src/architecture.test.ts:113-119,160-172`; ADR-0149 đã theo khuôn này (bảng `ctl_service_transfer_rule`, migration `0127`) |
| H5 | Cờ ẩn: cột `hidden` của `catalog_override` (có thể xoá cứng — `DELETE /api/catalog/:code/override`), không có hạn, không lý do, chỉ ô `admin.manage` | `migrations/0006_catalog.sql:44-51`; `src/modules/catalog/index.ts:371-396, 413-420` |
| H6 | Cờ ẩn **không chặn nháp giữ nguyên**: dòng đã lưu trên CHÍNH nháp, cùng mã **và cùng số khách**, giữ bản chụp, không tra danh mục, nên vẫn lưu và xác nhận được (Q11). Cờ ẩn **chặn** (400 `catalog_unavailable`) khi: thêm dòng mới có dịch vụ đang ẩn, **hoặc** đổi số khách của một dòng đã lưu mà dịch vụ đang ẩn (khi đó không giữ bản chụp, phải tra danh mục). Câu báo nêu **mã** chứ không nêu tên | `src/modules/orders/service-rules.ts:201-210`; `kiemCongXacNhan` không xét `visible` (`src/modules/orders/xac-nhan-chung.ts:83-121`) |
| H7 | Danh mục lập đơn (`GET /api/catalog` văn phòng và `GET /api/catalog/for-order`) dùng **một** hàm `catalogForOrderForm`, chỉ lọc `visible` | `src/modules/catalog/index.ts:126-147, 156-171` |
| H8 | Hàm cổng xác nhận chung `kiemCongXacNhan` (R2 → người lớn → nhóm tắt đưa đón → chọn đón → mốc → chụp → R3) dùng ở `/status`, Gửi đơn, Còn vé; **Gửi xác nhận không qua hàm này**, có chốt riêng | `src/modules/orders/xac-nhan-chung.ts:83-121`; `src/modules/orders/index.ts:1703`; `xac-nhan-route.ts:118` (chốt riêng), `:150`, `:309` |
| H9 | Ở `/status`, kiểm «cần xác nhận» (`tinhCanXacNhan` → 409 `confirm_request_required`) chạy **trước** `kiemCongXacNhan` | `src/modules/orders/index.ts:1702-1703` |
| H10 | Gửi đơn đã để sẵn chỗ móc cho «luật bán»: «chỗ móc: ngay trước phân nhánh» | `src/modules/orders/xac-nhan-route.ts:131-134` |
| H11 | **Còn vé đổi được ngày đi** (`body.ngayDi`) trong cùng lô xác nhận; chốt nhóm tắt đưa đón đứng trước kiểm mốc | `xac-nhan-route.ts:262-268` (ngày), `:296` (chốt), `:309` |
| H12 | Ngày đi lưu **theo từng dòng dịch vụ** (`order_service.depart_date`); máy chủ ép mọi dịch vụ cùng một ngày khi lập/lưu và khi sửa chuyến | `migrations/0008_order_service.sql`; `src/modules/orders/rules.ts:153`, `service-rules.ts:366` |
| H13 | Đường **đổi ngày đi**: lưu nháp `PUT /api/orders/:id`, sửa chuyến `PUT /api/orders/:id/trip` (nháp **và** đơn đã xác nhận, câu `UPDATE order_service SET depart_date…` ở `repository.ts:1385`), Còn vé (`xac-nhan-repo.ts:83`). Không module nào khác ghi `order_service` | `src/modules/orders/index.ts:1225, 1289`; `git grep "depart_date"` |
| H14 | Cờ «cần xác nhận» ADR-0136 là bảng của **`orders`** (`ord_service_confirm_flag`, phạm vi `SERVICE`/`GROUP`, chỉ thêm, chỉ Toàn quyền đặt qua `settings.ops`); nó **không chặn**, chỉ rẽ đơn sang bước xác nhận | `migrations/0119_yeu_cau_xac_nhan.sql:49-63`; `src/shared/permissions.ts:202`; `xac-nhan-route.ts:352-356` |
| H15 | **Không có đồng hồ tiêm** vào `ctx`. Mốc 6 giờ tiêm **chính sách** (số phút) qua `ctx.mocToiThieu`, còn giờ là `Date.now()` / `vnToday(new Date())` gọi thẳng. Bài thử dừng giờ bằng `mock.timers.enable({ apis: ["Date"] })` của `node:test`. `kiemCongXacNhan` tự đọc giờ lần nữa (`vnToday(new Date())`) ngoài `nowMs` của route | `src/shared/router.ts:157-161, 339-342`; `src/modules/pricing/sua-muc-route.test.ts:33`; `src/modules/van-chuyen/chinh-sach-route.test.ts:157`; `xac-nhan-chung.ts:88` |
| H16 | Hộp thông báo là **hình chiếu của nhật ký** qua view có tập hành động đóng (`HANH_DONG_TIN_DON`, view `v_aud_order_event`; thêm loại tin = migration dựng lại view). Đánh dấu đã đọc là **một mốc** mỗi người (`ntf_read_mark.doc_den_luc`). `thongbao` được gọi `orders` (cạnh có sẵn), **không** được gọi `catalog` | `src/shared/thong-bao.ts:10-14, 160-168`; `src/modules/thongbao/repository.ts:88-89, 139-140`; `src/architecture.test.ts:62` |
| H17 | Không có đường sẵn để báo «dịch vụ X vừa bị đóng» tới người có nháp: sự kiện danh mục không có `order_id`; `bangtin` chỉ làm mới màn hình theo đơn (`baoThayDoi`) | như H16; `src/modules/bangtin/index.ts:1-3`; `src/shared/router.ts:133` |
| H18 | Màn «Dịch vụ & giá» (`/catalog`) chỉ cho `admin.manage` (Quản trị, Toàn quyền): Bán hàng **không vào được** | `web/catalog.ts:838`; `src/shared/muc-giao-dien.ts:71` |
| H19 | Cổng văn phòng gồm Bán hàng, Kế toán, Quản trị, Toàn quyền; Bán hàng không qua cổng `admin` | `src/shared/permissions.ts:376, 387` |
| H20 | Hàng rào văn bản sẵn có để bắt «cửa mới quên chốt»: `src/orders-khong-doc-nhom-truc-tiep.test.ts` (A: `orders` không đọc thẳng bảng `ctl_*`; C: mọi cửa xác nhận có chốt nhóm tắt, kể cả Gửi xác nhận) | tệp đó, dòng 1-6, 24-31, 82-100 |

---

## Quyết định

### Đ1 — Bảng «lần đóng bán» ở phân hệ danh mục, chỉ thêm, mở lại một lần *(chạm dữ liệu)*

**Điều.**
- Bảng mới của `catalog`, tên tạm **`ctl_sale_suspension`** [người soạn: tên; sửa tiền tố `cat_` của đề xuất 30/10 thành `ctl_` theo H3]. Mỗi dòng là **một lần đóng**:

| Cột | Nghĩa | Ràng buộc |
|---|---|---|
| `id` | khoá | TEXT |
| `scope` | `SERVICE` hoặc `GROUP` | tập đóng: `CHECK (scope IN ('SERVICE','GROUP'))` theo Hiến chương 2.2 («mã phải rẽ nhánh theo giá trị → tập đóng (`CHECK`)»), thống nhất với Lượt A. Khác tiền lệ 0119 (kiểm ở mã): thêm phạm vi mới sau này (ví dụ đặc điểm — C2) phải dựng lại bảng bằng migration, chấp nhận vì đổi tập phạm vi vốn cần ADR |
| `code` | mã dịch vụ hoặc mã nhóm | trigger kiểm có trong `catalog_item` / `ctl_group` theo `scope` (cả hai là bảng của `catalog`, không đọc chéo phân hệ) [người soạn] |
| `depart_from`, `depart_to` | khoảng **ngày đi** bị đóng (`YYYY-MM-DD`, giờ VN) | cả hai trống = mọi ngày đi; có thì đủ cả hai và `from ≤ to` (`CHECK`) |
| `valid_from_at` | bắt đầu hiệu lực (ISO UTC) | `≥ created_at` (`CHECK`); máy chủ không nhận lùi về quá khứ |
| `valid_to_at` | kết thúc hiệu lực (ISO UTC) | trống = tới khi mở lại. `CHECK (valid_to_at IS NULL OR reopened_at IS NOT NULL OR valid_to_at > valid_from_at)`: lúc tạo, kết thúc dự kiến phải sau lúc bắt đầu; sau khi mở lại thì được phép `≤ valid_from_at` (lần đóng rỗng — ca mở lại lần đóng chưa bắt đầu) |
| `reason` | lý do | bắt buộc, 1–200 ký tự (`CHECK`) — B7 |
| `created_at`, `created_by` | người, lúc đóng | |
| `reopened_at`, `reopened_by`, `reopen_note` | người, lúc mở lại; ghi chú tuỳ chọn ≤ 200 ký tự | trống cho tới khi mở lại |
| `updated_at`, `updated_by` | cột dấu vết theo khuôn chung | |

- **Không có cột hay giá trị nào mang nghĩa «cho phép bán».** Không có dòng ngoại lệ (không miễn một dịch vụ khỏi lần đóng của nhóm).
- **Chỉ thêm.** Trigger: cấm xoá; cấm sửa mọi cột trừ đúng một lần **mở lại**, khi `reopened_at` còn trống. Lần mở lại điền `reopened_at`, `reopened_by`, `reopen_note`, và đặt `valid_to_at = reopened_at`. Mở lại lần thứ hai bị từ chối.
- **Quy tắc mở lại ở hai ca biên** [người soạn]:
  - *Lần đóng **chưa bắt đầu*** (ví dụ «đóng sau 5 giờ», mở lại sau 1 giờ): **được mở lại**. `valid_to_at = reopened_at < valid_from_at` ⇒ lần đóng rỗng, không bao giờ có tác dụng. Đây cũng là cách Quản trị/Toàn quyền huỷ một lần đóng đặt nhầm trước khi nó chạy.
  - *Lần đóng đã **quá kết thúc dự kiến*** (`valid_to_at` có và `≤` lúc bấm): **không mở lại được**. Máy chủ trả 409 «Lần đóng này đã hết hiệu lực, không cần mở lại»; trigger là lưới: từ chối mọi lần mở lại có `NEW.valid_to_at > OLD.valid_to_at` (tức không bao giờ kéo dài). Lý do: lần đóng đã hết thì không còn gì để mở; ghi thêm người mở lại chỉ làm nhật ký sai nghĩa.
  - Tóm lại, mở lại chỉ đi khi `reopened_at IS NULL` **và** (`valid_to_at IS NULL` **hoặc** `valid_to_at > lúc bấm`). Khi đó luôn có `reopened_at < valid_to_at` cũ, nên `valid_to_at` mới = `reopened_at` chỉ làm lần đóng **ngắn lại**.
- Ràng buộc nào ở đâu: `CHECK` cấp bảng cho `scope`, khoảng ngày, lý do, `valid_from_at ≥ created_at`, vế `valid_to_at` ở trên, và **`CHECK (reopened_at IS NULL OR valid_to_at = reopened_at)`** (luật «`valid_to_at = reopened_at`» đặt ở cấp bảng); **trigger** cho cấm xoá, chỉ cột mở lại được đổi, mở lại một lần, không kéo dài, mã tồn tại theo `scope` (lúc chèn), và **`BEFORE INSERT`: `reopened_at`, `reopened_by`, `reopen_note` phải NULL** — không dòng nào «sinh ra đã mở lại», nên ngoại lệ «đã mở lại» của `CHECK` ở cột `valid_to_at` chỉ đạt được qua đúng một lần mở lại (người kiểm độc lập vòng 2, R2B-1).
- **Bốn thao tác của người dùng ghi thành:**

| Thao tác | `depart_from..to` | `valid_from_at` | `valid_to_at` |
|---|---|---|---|
| Đóng ngay | trống | bây giờ | trống |
| Đóng sau X giờ, «chỉ ngày đi hôm nay» (mặc định, B1) | hôm nay..hôm nay | bây giờ + X giờ | trống |
| Đóng sau X giờ, «mọi ngày đi» | trống | bây giờ + X giờ | trống |
| Đóng các ngày đi 01–03/11 | 01/11..03/11 | bây giờ (hoặc sau X giờ) | trống |
| Mở lại | — | — | = lúc mở lại (cùng `reopened_*`) |

- «Hôm nay» = ngày VN của **lúc bấm** (`vnToday` của mốc request). Nếu «sau X giờ» rơi sang ngày VN hôm sau mà người dùng chọn «chỉ hôm nay», máy chủ trả 400 vì lần đóng sẽ không bao giờ có tác dụng [người soạn].
- Người tạo có thể đặt **kết thúc dự kiến** ngay lúc đóng (ví dụ «tới 18:00») [người soạn: lời chốt «kết thúc trống = tới khi mở lại» ngầm cho phép điền]. Kết thúc dự kiến **không phải** mở lại: nó không cần ô mở lại, vì nó chỉ làm lần đóng **ngắn hơn**, không cho bán vượt một lần đóng khác.
- Nhiều lần đóng được phép chồng nhau; một lần trúng là đủ chặn.

**Phương án bị bác.**
- *Thêm cột vào `catalog_override` (cạnh cờ ẩn):* bảng đó một dòng mỗi mã, sửa đè và xoá cứng được (H5) — không có lịch sử, không có hai trục thời gian, trái 5.5.
- *Thêm cột vào `catalog_item`:* bảng của đồng bộ Sheet; cần lịch sử chỉ thêm và người đặt (lý do giống ADR-0149 Đ1).
- *Đặt bảng ở `orders` như cờ cần xác nhận (H14):* đóng bán là tính chất của dịch vụ, không của đơn; danh mục lập đơn (`catalog`) phải làm mờ dịch vụ mà `catalog` không đọc được bảng `orders` (H1) — sẽ phải tiêm hàm từ gốc lắp ráp chỉ để hiển thị.
- *Đặt bảng ở `pricing` cạnh luật bán ADR-0146:* luật bán ở `pricing` vì nó cần loại đối tác (`parties`); đóng bán không cần, và `pricing` không phải nơi «dịch vụ có bán không» cho mọi người.
- *Một bảng «chính sách chung» cho cả luật bán, đóng bán, cần xác nhận (khung 30/10, `00-dau-vao/KHUNG-CHINH-SACH-CHUNG-2026-10-30.md`):* chưa có ADR khung được duyệt; ADR-0146 đã duyệt bảng riêng. Làm khung trước sẽ chặn Lượt B sau một quyết định lớn hơn. Đóng bán vẫn **viết theo đúng ngữ pháp** của khung (áp cho · khi · thì · trong · do), để sau này gộp được.
- *Dòng «cho phép» / danh sách trắng:* dịch vụ mới sẽ mặc định bị chặn; và một dòng «cho phép» đè lần đóng của nhóm là cửa bán vượt, trái B3.
- *Chỉ một trục thời gian:* «hết sau 5 giờ» (thời điểm đặt) và «hết các ngày 1–3/11» (ngày đi) là hai nghĩa khác nhau; một trục không biểu diễn được cả hai.
- *Cron tự đóng/mở theo giờ:* thêm một tác vụ tự động ghi dữ liệu (HC-5.11 đang hở), trong khi phép so với giờ request đã đủ.

**Hệ quả.**
- Migration mới (số lấy lúc thi công), một bảng, các trigger (cấm xoá; chỉ cột mở lại đổi, một lần, không kéo dài; mã tồn tại theo phạm vi) và các `CHECK` ở Đ1. Cập nhật `docs/data-dictionary.json` rồi `npm run dict`.
- SQL ở một tệp nửa nghiêm mới của `catalog` (tên tạm `catalog/dong-ban-repo.ts`) thêm vào `NUA_NGHIEM` (siết, Điều 9.4) [người soạn]; hoặc nối vào `nhom-repo.ts` như ADR-0149 — người thi công chọn.
- Muốn bán một dịch vụ trong nhóm đang đóng thì phải mở lại lần đóng nhóm rồi đóng riêng từng dịch vụ còn lại. Đây là cái giá của «không có dòng cho phép».
- Bán hàng đóng nhầm thì không tự sửa được; phải nhờ Quản trị/Toàn quyền mở lại (hệ quả của B2; xem câu hỏi C4).

**Tiêu chí nghiệm thu (đỏ trước, xanh sau).**
1. CSDL từ chối: xoá dòng; sửa `code`, `scope`, khoảng ngày, `valid_from_at`, `reason`; mở lại lần thứ hai; mở lại mà `valid_to_at ≠ reopened_at`; mở lại kéo dài `valid_to_at` đã có.
1b. CSDL từ chối chèn `scope` ngoài `SERVICE`/`GROUP` (ví dụ `ALL`); route đóng trả 400 với `scope` lạ.
1c. Ca biên mở lại: lần đóng bắt đầu sau 5 giờ, mở lại sau 1 giờ (dừng giờ bằng `mock.timers`) → 200; dòng có `valid_to_at < valid_from_at`; sau 5 giờ lập đơn vẫn được. Lần đóng có kết thúc dự kiến 18:00, bấm mở lại lúc 19:00 → 409 «đã hết hiệu lực», không dòng nhật ký; chèn thẳng câu mở lại vào CSDL → trigger từ chối.
1d. CSDL từ chối **chèn** dòng có `reopened_at` (hoặc `reopened_by`, `reopen_note`) khác NULL, kể cả khi `valid_to_at = reopened_at ≤ valid_from_at`; CSDL từ chối mở lại với `valid_to_at ≠ reopened_at` (bắt bởi `CHECK`, không chỉ trigger).
2. CSDL từ chối: lý do rỗng hoặc dài hơn 200 ký tự; `depart_from` có mà `depart_to` trống; `depart_from > depart_to`; `valid_from_at < created_at`.
3. CSDL từ chối `scope = SERVICE` với mã không có trong `catalog_item`, `scope = GROUP` với mã không có trong `ctl_group`.
4. Bài lược đồ: bảng không có cột nào ngoài danh sách ở trên (không có cột «cho phép»).
5. Mở lại xong, dòng cũ còn nguyên với người và lúc đóng, người và lúc mở.

**Điều chưa chắc.**
- Độ dài 200 ký tự của lý do là đoán [người soạn].
- Chưa kiểm production có bao nhiêu dịch vụ, nhóm; không ảnh hưởng thiết kế.

---

### Đ2 — Cách xét và hàm công bố của `catalog` *(luật tính; không tính vào trần)*

**Điều.**
- Một dịch vụ có mã **đang tạm ngừng bán cho một dòng của đơn** khi có ít nhất một lần đóng thoả **cả ba**:
  1. `scope = SERVICE` và trùng mã dịch vụ, **hoặc** `scope = GROUP` và trùng **nhóm hiện hành** của dịch vụ (ADR-0058, cùng nghĩa ADR-0146 Đ2);
  2. `valid_from_at ≤ bây giờ < valid_to_at` (hoặc `valid_to_at` trống); «bây giờ» là **mốc của request**;
  3. lần đóng áp cho mọi ngày đi, **hoặc** ngày đi của dòng nằm trong `[depart_from, depart_to]`. Dòng **chưa có ngày đi** (nháp) chỉ trúng lần đóng «mọi ngày đi».
- Dịch vụ nhập tay (không mã) không bao giờ trúng (chỉ văn phòng nhập tay — ADR-0061).
- **Luật thuần một chỗ**: tệp `src/shared/dong-ban.ts` [người soạn: tên], dùng ở máy chủ (cổng) và giao diện (làm mờ theo ngày đã chọn), theo luật «một tệp thuần trong `src/shared/`» của `src/CLAUDE.md`. Hàm nhận lần đóng, **mốc giờ** và **ngày đi** làm tham số; không tự đọc giờ.
- **Hàm công bố** ở `catalog/index.ts` (tên tạm):
  - `dongBanTrung(db, { dong: { ma, ngayDi }[], bayGio })` → các lần trúng, kèm tên dịch vụ, phạm vi, khoảng ngày, kết thúc, lý do. Dùng cho cổng (Đ3).
  - `dongBanChoForm(db, bayGio)` → lần đóng **đang** và **sắp** hiệu lực của từng mã (đã quy nhóm về mã), cho DTO danh mục (Đ4) và cho hình chiếu thông báo (Đ6).
  - **Định nghĩa** [người soạn]: *đang* = `valid_from_at ≤ bayGio` **và** (`valid_to_at IS NULL` **hoặc** `valid_to_at > bayGio`); *sắp* = `valid_from_at > bayGio` **và** (`valid_to_at IS NULL` **hoặc** `valid_to_at > valid_from_at`); *đã kết thúc* = mọi dòng còn lại. Vế cuối của *sắp* loại **lần đóng rỗng** — tức lần đóng chưa bắt đầu đã được mở lại (`valid_to_at = reopened_at < valid_from_at`). Lần đóng đã mở lại nào cũng có `valid_to_at = reopened_at ≤ bayGio`, nên không bao giờ là *đang* hay *sắp*. Cùng một định nghĩa (một hàm thuần ở `src/shared/dong-ban.ts`) dùng cho DTO danh mục, trang «Tình trạng bán» (Đang / Sắp / Đã kết thúc) và tin hình chiếu ở Đ6.
  - Câu SQL so chuỗi với **tham số** giờ (`?bayGio` ISO UTC, ngày `YYYY-MM-DD`), **không** `date('now')` / `datetime('now')` (`src/CLAUDE.md` «Dữ liệu»).
- **Đồng hồ** [người soạn]: theo khuôn kho đang dùng (H15), **không** thêm đồng hồ tiêm vào `ctx`. Mỗi request đọc giờ **đúng một lần** (`const nowMs = Date.now()`, khuôn «MỘT mốc mỗi request» của TC-26) rồi truyền xuống cổng đóng bán, `tinhCanXacNhan` và `kiemCongXacNhan`. Đề nghị cho `kiemCongXacNhan` nhận `nowMs` thay cho lần đọc riêng ở `xac-nhan-chung.ts:88`, để mọi cổng của một lần bấm cùng một mốc (tránh lệch đúng lúc lần đóng bắt đầu, hoặc đúng nửa đêm).
  - Bài thử luật thuần: truyền mốc tuỳ ý.
  - Bài thử route «sau X giờ»: dừng giờ bằng `mock.timers.enable({ apis: ["Date"], now })` rồi `mock.timers.tick(…)` hoặc bật lại với mốc mới (khuôn `src/modules/pricing/sua-muc-route.test.ts:33`).
  - e2e chạy trên Worker thật không dừng giờ được: e2e chỉ kiểm «bắt đầu trong tương lai thì chưa chặn» và «bắt đầu bây giờ thì chặn»; phép vượt mốc kiểm ở bài route.

**Phương án bị bác.**
- *Thêm `ctx.bayGio()` do gốc lắp ráp tiêm:* chạm router và mọi khung thử, trong khi kho đã có khuôn `mock.timers` ở ít nhất sáu tệp thử. Có thể làm sau thành một ADR riêng cho cả Nền tảng nếu cần.
- *Xét theo ngày đi của cả đơn thay vì từng dòng:* dữ liệu lưu theo dòng (H12); đơn cũ có thể lệch ngày. Xét theo dòng cho đúng cả đơn cũ, và với đơn mới thì hai cách cho cùng kết quả.
- *Xét theo nhóm lúc đóng (chụp danh sách dịch vụ của nhóm vào lần đóng):* dịch vụ mới thêm vào nhóm sẽ không bị đóng; trái nghĩa «đóng cả nhóm».

**Hệ quả.**
- Chuyển một dịch vụ ra khỏi nhóm đang đóng thì nó thôi bị đóng (cùng hệ quả ADR-0146 Đ3 với gán nhóm). Màn gán nhóm phải cảnh báo khi nhóm cũ hoặc mới đang có lần đóng (mở rộng cảnh báo ADR-0146 đã đòi).
- `orders` không đọc bảng của `catalog` (giữ H20 (A)).

**Tiêu chí nghiệm thu.**
1. Luật thuần: bảng ca phủ đủ tổ hợp {dịch vụ, nhóm} × {trước, trong, sau hiệu lực; đã mở lại} × {mọi ngày; trong khoảng; ngoài khoảng; dòng chưa có ngày}.
2. Dịch vụ X thuộc nhóm G, đóng G: X trúng. Chuyển X sang nhóm H: X không trúng.
3. Bài quét: không câu SQL nào trong tệp của lần đóng dùng `date('now')`/`datetime('now')`; `orders` không nhắc `ctl_sale_suspension` (mở rộng bài (A) của `src/orders-khong-doc-nhom-truc-tiep.test.ts`).

**Điều chưa chắc.** Chưa đo chi phí truy vấn khi danh mục và số lần đóng lớn; hôm nay danh mục khoảng vài chục dòng (chú thích `service.ts:36`).

---

### Đ3 — Cổng 409 ở mọi đường ghi đơn, thứ tự xét chung với ba cơ chế «không đặt được», và bộ câu báo *(chạm dữ liệu: hành vi ghi đơn)*

**Điều.**

**(a) Một hàm cổng chung ở `orders`** [người soạn: tên tạm `congBanDuoc`], nhận danh sách dòng có mã (mã, tên, ngày đi), bên đặt, `nowMs`, và **bước nào cần xét** (luật bán, đóng bán, hoặc cả hai — theo bảng (c)). Thứ tự **cố định** trong hàm: (1) luật bán ADR-0146 (khi đã thi công) → (2) đóng bán. Dòng đầu tiên trúng quyết định câu báo. Chưa thi công ADR-0146 thì hàm chỉ có bước (2). Máy chủ **không ghi gì** khi chặn.
- **Ngày đi đưa vào hàm** [người soạn]: ở cửa lưu/sửa (lập đơn, lưu nháp, sửa chuyến) là ngày **sau khi áp lệnh** (ngày trong thân / ngày mới). Ở các cửa gửi và xác nhận (`/status`, Gửi xác nhận, Gửi đơn, Còn vé) là ngày **đã lưu** của `order` đã nạp — `kiemCongXacNhan` nhận `order` đã nạp, nên lời gọi bên trong nó luôn xét ngày đã lưu.
- **Riêng Còn vé có thân `ngayDi`** (Còn vé đổi được ngày đi trong cùng lô — H11): hàm xét **cả** ngày đã lưu **lẫn** ngày mới; trúng ở một trong hai là 409. Lý do: B4 chặn Còn vé khi đơn đang gặp dịch vụ bị đóng (ngày đã lưu), và không để Còn vé **đổi ngày vào** khoảng đang đóng mà lọt qua cổng. Như vậy không có lối «Còn vé kèm đổi sang ngày không bị đóng»: đơn chờ đã trúng ở ngày đã lưu thì chỉ còn Hết vé hoặc Huỷ, đúng B4.

**(b) Thứ tự xét đầy đủ của «vì sao không đặt được»:**

| Thứ tự | Cơ chế | Ai đặt | Nơi xét hôm nay / sau | Hiệu ứng | Mã, câu báo |
|---|---|---|---|---|---|
| 1 | **Ẩn** (`catalog_override.hidden`) | Quản trị, Toàn quyền | `validateOrder`, với dòng **thêm mới** và dòng đã lưu **đổi số khách** (H6) | chặn hai trường hợp đó; nháp giữ nguyên dòng đã lưu vẫn đi tiếp (giữ nguyên, Q11) | 400 `catalog_unavailable` (không đổi mã) |
| 2 | **Không bán cho loại đối tác** (ADR-0146) | Bán hàng, Quản trị, Toàn quyền | hàm cổng chung, bước (1) | chặn | 409 `sales_blocked` (ADR-0146) |
| 3 | **Tạm ngừng bán** (mới) | đóng: Bán hàng, Quản trị, Toàn quyền; mở lại: Quản trị, Toàn quyền | hàm cổng chung, bước (2) | chặn | 409 **`sale_suspended`** [người soạn: tên mã] |
| 4 | **Cần xác nhận** (ADR-0136) | Toàn quyền | `tinhCanXacNhan` | **không chặn**: rẽ đơn sang Gửi xác nhận | 409 `confirm_request_required` ở `/status` (như hôm nay) |

Lý do thứ tự: cơ chế đứng trước làm cơ chế sau mất nghĩa — dịch vụ đã không bán cho bên đặt này thì «tạm ngừng tới khi nào» vô ích với họ; dịch vụ đã không bán được thì «cần gửi xác nhận» là chỉ đường sai.

**(c) Điểm gọi — 8 cửa.** Hợp 7 cửa của ADR-0146 Đ3 (lập đơn, sửa nháp, `/status`, đổi bên đặt, Gửi xác nhận, Còn vé, Gửi đơn) với 7 cửa đóng bán cần (thêm sửa chuyến, bỏ đổi bên đặt) thành **8 cửa**. Mỗi cửa gọi **một** hàm cổng chung, xét đúng các bước ghi dưới đây:

| # | Cửa | Bước luật bán (ADR-0146) | Bước đóng bán | Gọi ở đâu | Ngày đi xét đóng bán |
|---|---|:-:|:-:|---|---|
| 1 | Lập đơn `POST /api/orders` (`index.ts:1110`) | có | có | sau `validateOrder` + luật giá, trước ghi (cùng chỗ ADR-0146 Đ3) | ngày trong thân |
| 2 | Lưu nháp `PUT /api/orders/:id` (`index.ts:1225`) | có | có — **mọi** dòng có mã của thân, kể cả dòng đã lưu (chốt «nháp bị chặn ở lần lưu kế tiếp») | như trên | ngày trong thân |
| 3 | Sửa chuyến `PUT /api/orders/:id/trip` (`index.ts:1289`), nháp **và** đã xác nhận | **không** (không thêm dịch vụ, không đổi bên đặt) | có — chỉ khi lệnh **đổi ngày đi**, chỉ các dòng đổi ngày [người soạn] | sau `validateTripUpdate`, trước chốt nhóm tắt đưa đón | ngày **mới** |
| 4 | Đổi bên đặt `PUT /api/orders/:id/booker` (`index.ts:1595`) | có (ADR-0146 Đ3, kể cả đơn đã xác nhận) | **không** (đóng bán không phụ thuộc bên đặt, không đổi ngày) | như ADR-0146 | — |
| 5 | Xác nhận `POST /api/orders/:id/status` → `confirmed` (`index.ts:1664`) | có | có | **trước** `tinhCanXacNhan` (`:1702`) [người soạn — xem (d)]; lời gọi ở đầu `kiemCongXacNhan` (`:1703`) lặp lại, vô hại | ngày đã lưu |
| 6 | Gửi xác nhận `POST …/gui-xac-nhan` (`xac-nhan-route.ts:100`) — **không qua `kiemCongXacNhan`** | có | có | chốt riêng, **trước** `tinhCanXacNhan` (`:116`), tức trước chốt nhóm tắt (`:118`) | ngày đã lưu |
| 7 | Gửi đơn `POST …/gui-don` (`xac-nhan-route.ts:135`) | có | có | ở đầu `kiemCongXacNhan` (`:150`), trước phân nhánh A/B — đúng chỗ móc H10. Dính chặn ⇒ đơn ở lại nháp | ngày đã lưu |
| 8 | Còn vé `POST …/quyet-dinh` `CON_VE` (`xac-nhan-route.ts:254`) | có | có | gọi tường minh **trước** chốt nhóm tắt (`:296`) và trước kiểm mốc, để người xét duyệt không bị đẩy đi «đặt gấp» cho dịch vụ đang đóng; lời gọi ở đầu `kiemCongXacNhan` (`:309`, ngày đã lưu) lặp lại, vô hại | ngày đã lưu; nếu thân có `ngayDi` thì **thêm** ngày mới (xem (a)) |

**Không cần cổng nào của hàm chung** (không thêm dịch vụ, không đổi ngày đi, không đổi bên đặt): sửa số khách `money-edit`, thông tin thương mại theo dòng, chặng đưa đón (`…/legs*`), hành khách, Rút lại, Hết vé, Huỷ, `chup-bu`.

**(d) Chỗ dễ sai ở `/status` và Gửi xác nhận.** ADR-0146 (bổ sung 28/10) đặt luật bán «đứng đầu `kiemCongXacNhan`». Nhưng ở `/status`, `tinhCanXacNhan` chạy **trước** hàm đó (H9). Nếu chỉ móc trong `kiemCongXacNhan`, đơn vừa có dịch vụ cần xác nhận vừa bị chặn sẽ nhận «hãy bấm Gửi xác nhận», người dùng bấm rồi mới nhận «đang tạm ngừng bán». Vì vậy đề xuất gọi hàm cổng chung **thêm một lần trước `tinhCanXacNhan`** ở `/status` và Gửi xác nhận [người soạn]. Việc này không trái chữ ADR-0146 (cổng vẫn đứng đầu `kiemCongXacNhan`), nhưng đổi chỗ người dùng gặp `sales_blocked` ở `/status`; phải ghi vào kế hoạch thi công ADR-0146 (Lượt A) để hai người thi công không đặt hai chỗ khác nhau (câu hỏi C5).

**(e) Theo trạng thái đơn:**

| Đơn đang ở | Khi dịch vụ bị đóng |
|---|---|
| Nháp | bị chặn ở lần lưu, gửi, xác nhận kế tiếp; bỏ dịch vụ, hoặc đổi ngày sang ngày không bị đóng, thì lưu được |
| Chờ xác nhận | bị khoá sửa sẵn (`khoaKhiCho`, ADR-0136 Đ3). Người xét duyệt **không bấm Còn vé được (409)**, kể cả khi kèm đổi ngày; chỉ còn **Hết vé** hoặc **Huỷ** (B4). Người lập muốn giữ đơn thì Rút lại, sửa ngày hoặc bỏ dịch vụ trên nháp, rồi gửi lại |
| Đã xác nhận | **không xét lại**; chỉ xét khi đổi ngày đi qua `PUT …/trip` |

**(f) Bộ câu báo thống nhất** [người soạn]. Khuôn: «*Dịch vụ “{tên}”* {tình trạng} {phạm vi}{ (lý do: …)}. {Việc làm tiếp}.» — luôn nêu **tên** (không nêu mã), luôn có việc làm tiếp.

| Mã | Câu (mẫu) |
|---|---|
| `sale_suspended` (lưu, gửi, xác nhận) | «Dịch vụ “Vé Vinwonders kèm buffet” đang tạm ngừng bán cho ngày đi 02/11 (lý do: hết suất buffet). Chọn ngày đi khác hoặc bỏ dịch vụ này; muốn bán lại thì nhờ Quản trị mở bán.» |
| `sale_suspended`, mọi ngày đi | «Dịch vụ “…” đang tạm ngừng bán (lý do: …). Bỏ dịch vụ này khỏi đơn; muốn bán lại thì nhờ Quản trị mở bán.» |
| `sale_suspended` ở Còn vé | «Dịch vụ “…” đang tạm ngừng bán cho ngày đi 02/11 (lý do: …). Không bấm Còn vé được: chọn Hết vé hoặc Huỷ.» |
| nhiều dịch vụ trúng | câu nêu dịch vụ đầu tiên «… và 2 dịch vụ khác»; thân lỗi kèm `details` liệt kê đủ (mã, tên, ngày đi, lý do, kết thúc) để giao diện tô đúng thẻ |
| `sales_blocked` (ADR-0146, chỉ gợi ý khuôn) | «Dịch vụ “…” không bán cho {loại đối tác} của bên đặt. Chọn dịch vụ khác hoặc đổi bên đặt.» |
| `catalog_unavailable` (cờ ẩn, gợi ý đổi chữ — tuỳ chủ, không đổi hành vi) | «Dịch vụ “…” không còn trong danh mục. Chọn dịch vụ khác.» (hôm nay câu nêu mã — H6) |

Câu báo cho **Đối tác** không nêu tên người đóng [người soạn].

**Phương án bị bác.**
- *403:* đây không phải quyền của người bấm (cùng lý do ADR-0146 Đ3).
- *Cho Quản trị/Toàn quyền vượt khi ghi lý do:* chủ chốt B3 «không ai bán vượt».
- *Chỉ chặn ở bước xác nhận, cho lưu nháp:* chủ chốt «nháp bị chặn ở lần lưu kế tiếp»; ngoài ra để nháp lưu được thì người lập tưởng đơn ổn tới lúc gửi.
- *Xét lại cả đơn đã xác nhận:* chủ chốt «đơn đã xác nhận không xét lại trừ khi đổi ngày đi»; xét lại sẽ chặn cả sửa ghi chú của đơn đã bán.
- *Gắn cổng vào `validateOrder` (thuần) như cờ ẩn:* `validateOrder` không có I/O và không có giờ; và cờ ẩn không xét dòng đã lưu giữ nguyên số khách (H6), trong khi đóng bán phải xét cả dòng đó.
- *Một cổng riêng cho đóng bán, tách khỏi hàm của luật bán:* hai lần đặt chỗ móc ở 8 cửa, dễ lệch thứ tự; một hàm chung giữ thứ tự 2 → 3 ở một chỗ.
- *Cho Còn vé kèm đổi sang ngày không bị đóng:* chủ chốt B4 «không cho bấm Còn vé, chỉ Hết vé hoặc Huỷ».

**Hệ quả.**
- Nháp cũ chứa dịch vụ vừa bị đóng không lưu được tới khi bỏ dịch vụ hoặc đổi ngày. Đây là ý chủ chốt; có thông báo ở Đ6 để người lập biết trước.
- Đơn chờ xác nhận chứa dịch vụ bị đóng chỉ còn Hết vé hoặc Huỷ; Hết vé tự gán lý do `HET_CHO` như hôm nay (ADR-0089 đ8, ngoại lệ có tên).
- Nhiều bài thử route hiện có lập/gửi/xác nhận đơn **không** đỏ, vì bảng rỗng thì không gì bị chặn (chưa đo — xem trang ghép mục 6).

**Tiêu chí nghiệm thu (đỏ trước, xanh sau).**
1. Đóng X cho ngày đi 01–03/11. Lập đơn X ngày 02/11 → 409 `sale_suspended`, không dòng nào được ghi (đếm `orders`, `audit_log` trước/sau). Ngày 04/11 → 201.
2. Đóng X bắt đầu sau 5 giờ: trước mốc lập đơn → 201; dừng giờ qua mốc (`mock.timers`) → 409.
3. Đóng «chỉ hôm nay, sau 2 giờ»: sau mốc, đơn ngày đi hôm nay → 409; đơn ngày đi ngày mai → 201.
4. Mở lại: lập đơn ngay được; dòng đóng cũ còn, có người và lúc mở.
5. Đóng nhóm G: mọi dịch vụ trong G bị chặn; chuyển một dịch vụ ra khỏi G thì nó lập đơn được.
6. Nháp có X ngày 02/11 lưu trước khi đóng. Sau khi đóng 01–03/11: lưu nháp → 409; lưu nháp đổi ngày sang 04/11 → 200; lưu nháp bỏ X → 200.
7. Nháp **chưa có ngày** có X: đóng 01–03/11 không chặn lưu; đóng «mọi ngày đi» chặn lưu.
8. Đơn đã xác nhận có X ngày 02/11; đóng 01–03/11: sửa ghi chú chuyến → 200; `PUT …/trip` đổi ngày sang 03/11 → 409; đổi sang 05/11 → 200.
9. Đơn chờ xác nhận có X ngày 02/11; đóng X 01–03/11: Còn vé → 409 `sale_suspended`, yêu cầu vẫn mở; Còn vé kèm `ngayDi` 05/11 (ngoài khoảng đóng) → **vẫn 409**; Hết vé → 200; Huỷ → 200.
9b. Đơn chờ xác nhận có X ngày 05/11 (không bị đóng); đóng X 01–03/11: Còn vé kèm `ngayDi` 02/11 → 409 `sale_suspended` (không đổi ngày vào khoảng đóng được); Còn vé không đổi ngày → 200.
10. Gửi xác nhận trên nháp có X đang đóng → 409 `sale_suspended`, **không** mở yêu cầu nào.
11. Gửi đơn (Đối tác) có X đang đóng → 409 `sale_suspended`, đơn vẫn nháp, không nhánh A cũng không nhánh B.
12. `/status` trên nháp vừa có dịch vụ cần xác nhận (cờ ADR-0136) vừa có X đang đóng → 409 `sale_suspended` (không phải `confirm_request_required`).
13. Một đơn vừa dính luật bán (ADR-0146) vừa dính đóng bán → câu trả về là `sales_blocked` (chỉ chạy khi ADR-0146 đã thi công).
14. Còn vé trên đơn có X đang đóng **và** chặng dưới mốc 6 giờ → 409 `sale_suspended`, không phải `short_notice_required`.
15. Hàng rào văn bản (mới, khuôn `src/orders-khong-doc-nhom-truc-tiep.test.ts`), canh đủ **8 cửa** của bảng (c):
    - mọi thân route của `orders` có lời gọi `createOrder(` / `updateDraftOrder(` / `updateTrip(` / `confirmOrder(` / `soanXacNhan(` / `moYeuCau(` phải có lời gọi hàm cổng chung **hoặc `kiemCongXacNhan(`** đứng trước (Gửi đơn chỉ đi qua `kiemCongXacNhan` — `xac-nhan-route.ts:150` trước `:156`, `:162`; vế «`kiemCongXacNhan` có lời gọi hàm cổng chung ở đầu thân» dưới đây giữ cho lưới kín);
    - route `PUT …/booker` có lời gọi hàm cổng chung với bước luật bán (khi ADR-0146 đã thi công);
    - ở `/status` và `gui-xac-nhan` lời gọi đứng trước `tinhCanXacNhan(`; ở `quyet-dinh` đứng trước `congNhomTatDuaDon(`;
    - `kiemCongXacNhan` có lời gọi hàm cổng chung ở đầu thân;
    - ở `quyet-dinh`, lời gọi tường minh nhận cả ngày mới khi thân có `ngayDi` (vế canh B4 không bị lách bằng đổi ngày).
    Quan sát bài đỏ một lần bằng cách xoá cố ý một lời gọi, rồi ghi `docs/SO-HANG-RAO.md`.

**Điều chưa chắc.**
- Tên mã `sale_suspended` và câu chữ là đề xuất [người soạn]; chủ có thể sửa câu mà không đổi thiết kế.
- `PUT …/trip` trên đơn đã xác nhận: chỉ xét dòng đổi ngày. Với đơn mới (một ngày cho cả đơn) mọi dòng đổi cùng lúc, nên khác biệt chỉ có ở đơn cũ lệch ngày.
- *Gợi ý cho sau, không thuộc quyết định này:* cho người xét duyệt bấm «Còn vé kèm đổi sang ngày không bị đóng» (khách đồng ý đi ngày khác) sẽ đỡ một vòng Rút lại – sửa – gửi lại. Lối này trái chữ B4 đã chốt, nên chỉ làm nếu chủ đổi B4 bằng một quyết định mới.

---

### Đ4 — Danh mục lập đơn: dịch vụ đang đóng hiện mờ cho mọi người lập đơn *(hiển thị; tính vào trần hay không: câu C6 — hai cách nhìn ở cuối mục)*

**Điều.**
- `catalogForOrderForm` (`catalog/index.ts:126`) — một nguồn cho `GET /api/catalog` và `GET /api/catalog/for-order` — **vẫn trả** dịch vụ đang đóng, thêm trường `tamNgung`: danh sách lần đóng **đang** và **sắp** hiệu lực của dịch vụ (phạm vi dịch vụ/nhóm, khoảng ngày đi hoặc «mọi ngày», từ lúc, tới lúc hoặc «tới khi mở lại», lý do). Không kèm người đóng.
- Giao diện form dùng luật thuần `src/shared/dong-ban.ts` với **ngày đi đang chọn** và giờ máy: trúng thì thẻ dịch vụ **mờ, không chọn được**, nhãn «Tạm ngừng bán · tới khi mở lại» / «Ngừng các ngày 01–03/11» / «Ngừng bán từ 15:00 hôm nay». Ngày đi ngoài khoảng thì chọn bình thường.
- **Cùng một DTO cho văn phòng và Đối tác** (khác ADR-0146 Đ4 vốn bỏ hẳn dịch vụ khỏi danh mục của Đối tác bị chặn). Một dịch vụ vừa bị luật bán chặn với Đối tác vừa đang đóng: luật bán thắng, dịch vụ vắng (thứ tự Đ3 (b)).
- Thẻ đơn nháp: trạng thái danh mục của dòng (`catalogStatusOf`, `service-rules.ts:301`) thêm giá trị «tạm ngừng bán» để trang đơn nháp/chờ hiện nhãn đỏ trên đúng dịch vụ [người soạn].
- Danh sách chờ xác nhận (`GET /api/orders/cho-xac-nhan`, `xac-nhan-route.ts:76`) thêm cờ «có dịch vụ đang tạm ngừng bán» mỗi đơn; trang đơn chờ làm mờ nút Còn vé và nêu lý do (B4 — máy chủ vẫn là chốt thật).
- **Màn thao tác** [người soạn]: Bán hàng không vào được `/catalog` (H18). Thêm một trang văn phòng «Tình trạng bán» (khai `PAGES`, `build:web`, mục menu hiện khi giữ ô đóng **hoặc** ô mở lại), liệt kê lần đóng Đang / Sắp / Đã kết thúc, có nút **Đóng ngay**, **Đóng sau… giờ** (kèm chọn «chỉ ngày đi hôm nay» mặc định / «mọi ngày đi»), **Đóng các ngày…**, và **Mở lại** (chỉ hiện với Quản trị, Toàn quyền). Màn `/catalog` của Quản trị có thêm khối «Tình trạng bán» trỏ cùng route. Một màn tối thiểu phát hành **cùng** tính năng (khuôn ADR-0146 Đ5).
- Trang chủ của Bán hàng, Quản trị: một dòng «3 dịch vụ đang tạm ngừng bán» dẫn tới trang trên [người soạn].

**Phương án bị bác.**
- *Ẩn hẳn với Đối tác như ADR-0146:* chủ chốt B5 «hiện mờ kèm nhãn».
- *Máy chủ tự tính «mờ» theo ngày đi rồi trả cờ đúng/sai:* form đổi ngày liên tục mà không gọi lại máy chủ; trả khoảng và lý do để form tự xét bằng **cùng** luật thuần là cách kho đã làm với cờ đưa đón (ADR-0149, `choPhepDuaDon`).
- *Đặt nút đóng ngay trong form lập đơn:* dễ bấm nhầm khi đang lập đơn; một trang riêng có lý do bắt buộc an toàn hơn [người soạn].

**Hệ quả.**
- Lý do đóng **hiện cho Đối tác**. Người đóng phải viết lý do nói được với bên ngoài (form ghi rõ «Lý do sẽ hiện cho Đối tác và mọi người lập đơn»). Xem câu hỏi C1.
- `tests/e2e/catalog.mjs` (Đối tác thấy đúng danh sách nhóm như Bán hàng — trích ADR-0146 Đ6) không đổi, vì dịch vụ đang đóng vẫn có mặt (chưa chạy lại bài này — chưa kiểm).

**Tiêu chí nghiệm thu.**
1. Danh mục for-order của Đối tác và của Bán hàng cùng có X, cùng `tamNgung` (khoảng, lý do, kết thúc), không có tên người đóng.
2. Bài so khớp form ↔ máy chủ: với mọi ca của bảng tiêu chí Đ2.1, luật thuần ở giao diện cho cùng đáp án với cổng máy chủ (khuôn bài so khớp của ADR-0149).
3. Kịch bản Chrome: chọn ngày 02/11 thì thẻ X mờ, có nhãn; đổi sang 04/11 thì chọn được.
4. Danh sách chờ có cờ trên đúng đơn chứa X; nút Còn vé mờ.
5. Đóng X bắt đầu sau 5 giờ, Quản trị mở lại sau 1 giờ (dừng giờ bằng `mock.timers`): `tamNgung` của X trong danh mục **rỗng** (thẻ không mờ, kể cả sau mốc 5 giờ); trang «Tình trạng bán» xếp lần đóng vào **Đã kết thúc**; không còn tin «Tạm ngừng bán» nào cho người có nháp chứa X (Đ6).

**Điều chưa chắc.** Chỗ đặt dòng trên Trang chủ và tên trang là đề xuất bề mặt, đảo ngược được.

**Đếm vào trần hay không — hai cách nhìn, chủ chọn ở C6.**
- *Cách của người soạn (không tính):* không đổi ai thấy được dịch vụ nào so với hôm nay (dịch vụ vẫn hiện, Đối tác và văn phòng vẫn nhận cùng danh mục — giữ ADR-0028 đ2), không thêm bảng, không thêm ô quyền; máy chủ vẫn chặn ở Đ3.
- *Theo tiền lệ ADR-0146 (tính):* ADR-0146 **có** tính Đ4 «Danh mục cho form» là điều chạm quyền/dữ liệu (`docs/adr/ADR-0146-…md`, dòng Trạng thái: «Bốn điều chạm quyền / dữ liệu: Đ1, Đ3, Đ4 và Đ5»). Đ4 ở đây cũng đổi DTO danh mục mà Đối tác và Thực tập nhận, và đưa ra ngoài một nội dung trước đây không lộ: **lý do là chữ tự do** do nhân viên gõ. Theo tiền lệ này lượt B có **4** điều.
- Nếu chủ chọn C1 = (c) (Đối tác chỉ thấy «Tạm ngừng bán», không thấy lý do), Đ4 không còn đưa nội dung mới ra ngoài, và lý do để tính nó yếu đi; nhưng B7 có gốc «câu báo cho người đặt cần lý do», nên C1 = (a) cũng có cơ sở. Phương án tách ở mục «Đếm».

---

### Đ5 — Hai thao tác quyền mới: đóng bán và mở lại *(chạm quyền)*

**Điều.**
- Thêm **hai ô thao tác** vào `src/shared/permissions.ts` (không thêm mã quyền), tên tạm:

| Ô | Bán hàng | Kế toán | Quản trị | Hiện trường | Đối tác | Toàn quyền | Thực tập | Tài xế | Tài xế đối tác | Nhân sự |
|---|---|---|---|---|---|---|---|---|---|---|
| `catalog.sale.suspend` (đóng) | any | none | any | none | none | any | none | none | none | none |
| `catalog.sale.resume` (mở lại) | none | none | any | none | none | any | none | none | none | none |

- Phạm vi `any` vì lần đóng không có người sở hữu (khuôn ADR-0146 Đ5).
- Route đọc danh sách lần đóng (kèm người đóng, người mở), đóng, mở lại: cổng **`office`** (Bán hàng không qua cổng `admin` — H19), thân hỏi `can()` **dòng đầu**:
  - đọc danh sách đầy đủ: giữ ô đóng **hoặc** ô mở lại [người soạn];
  - đóng: `catalog.sale.suspend`; mở lại: `catalog.sale.resume`.
- Mọi người lập đơn thấy trạng thái tạm ngừng (khoảng, lý do) qua DTO danh mục (Đ4), dưới ô sẵn có của route danh mục (`order.create` + `money.view`); không cần ô mới.
- Đóng và mở lại là **một lô** `db.batch`: câu ghi + nhật ký. Mở lại có khoá lạc quan (chỉ đổi khi `reopened_at IS NULL`; `changes = 0` → 409 «vừa có người mở lại»).
- Hai hành động nhật ký mới (`src/shared/audit-actions.ts`, nhóm `catalog`), tên tạm `catalog_sale_suspended` «Tạm ngừng bán dịch vụ», `catalog_sale_resumed` «Mở bán lại dịch vụ». `detail` ghi id lần đóng, phạm vi, mã, khoảng ngày, hiệu lực từ/tới. **Không chép lý do** vào nhật ký [người soạn]: lý do là chữ tự do, có thể vô tình chứa số điện thoại; nó đã nằm trên dòng của bảng (5.12).
- **Nói một lần (Hiến pháp P18):** B2 đã chặn đúng rủi ro ADR-0146 còn để ngỏ («Bán hàng gỡ luật rồi đặt ngay»). Rủi ro còn lại ngược chiều: Bán hàng đóng được **mọi** dịch vụ, kể cả cả nhóm, cho mọi bên đặt, ngay lập tức, và không tự mở lại được. Máy chỉ ghi nhật ký người đóng.

**Phương án bị bác.**
- *Một ô cho cả đóng và mở lại:* không biểu diễn được B2.
- *Dùng `admin.manage` cho mở lại:* `admin.manage` gom nhiều việc khác (tài khoản, danh mục, gộp hồ sơ); ô riêng cho phép đổi người mở lại mà không đụng những việc đó, và bài «mỗi ô được máy chủ hỏi» phủ được.
- *Dùng `settings.ops` như cờ cần xác nhận:* chỉ Toàn quyền, trái lời chủ.
- *Thêm mã quyền mới:* nhân đôi mọi bài «tập con quyền» (`CLAUDE.md` §10, bẫy giấy tờ) mà không cần.
- *Cho người tạo tự huỷ lần đóng của chính mình:* xem câu hỏi C4.

**Hệ quả.**
- Ô mới phải được hỏi nguyên văn trong `src/modules` (`src/permission-enforcement.test.ts`), có tên tiếng Việt cho trợ lý (`src/shared/tro-ly-cau-truc-ten.ts`, bài `src/shared/tro-ly-cau-truc.test.ts`), và cập nhật bảng khớp ô ở `src/shared/permissions.test.ts`. Ba route mới vào ảnh chụp `src/route-access.test.ts` và `src/route-write-guard.test.ts`. Số bài đỏ **chưa đo**.
- Trợ giúp cho Bán hàng, Quản trị, Toàn quyền: một đoạn «Tạm ngừng bán».

**Tiêu chí nghiệm thu.**
1. Bán hàng, Quản trị, Toàn quyền đóng → 201, có một dòng nhật ký `catalog_sale_suspended`. Kế toán, Hiện trường, Đối tác, Thực tập, Nhân sự, Tài xế, Tài xế đối tác → 403 (hoặc bị cổng `office` chặn), không dòng nào.
2. Quản trị, Toàn quyền mở lại → 200, một dòng `catalog_sale_resumed`. **Bán hàng mở lại → 403.**
3. Hai người mở lại cùng lúc: một 200, một 409; chỉ một dòng nhật ký.
4. Đóng thiếu lý do → 400; nhóm đang tắt → 409; mã không có → 404 [người soạn].
5. Dòng nhật ký không chứa chuỗi lý do (bài quét nhật ký sau khi đóng với lý do có dãy số).
6. `src/permission-enforcement.test.ts` đỏ khi xoá cố ý lời gọi `can(…, "catalog.sale.resume")` khỏi route, rồi xanh lại.

**Điều chưa chắc.** Kế toán có cần **xem** danh sách lần đóng không (để trả lời khách khi được hỏi). Đề xuất: không, vì họ vẫn thấy nhãn trên danh mục văn phòng [người soạn].

---

### Đ6 — Thông báo cho người có nháp hoặc đơn chờ: hình chiếu lúc đọc, không ghi thêm dữ liệu *(không tính vào trần — lý do ở cuối mục)*

**Điều.**
- **Đã kiểm: không có đường sẵn** (H16, H17). Hộp thông báo dựng từ nhật ký theo một tập hành động đóng gắn với đơn; lần đóng bán là sự kiện của danh mục, không có `order_id`; và `catalog` không được biết đơn nào chứa dịch vụ (H1).
- **Đề xuất** [người soạn]: thông báo là **hình chiếu tính lúc đọc**:
  1. `orders` có một hàm công bố hẹp, tên tạm `donCuaToiTrungDongBan(db, staffId, bayGio)`: các **nháp** và **đơn chờ xác nhận** do **chính người hỏi lập**, có dòng trúng một lần đóng **đang hoặc sắp** hiệu lực (gọi `catalog.dongBanChoForm` qua cạnh `orders` → `catalog` có sẵn). Trả mã đơn, tên dịch vụ, khoảng, lý do, lúc tạo lần đóng.
  2. `thongbao` gọi hàm đó (cạnh `thongbao` → `orders` có sẵn — H16) và thêm vào hộp «Của tôi» các tin loại mới **«Tạm ngừng bán»**: «Đơn ABC: dịch vụ “…” tạm ngừng bán cho ngày đi 02/11 (lý do: …). Mở đơn để đổi ngày hoặc bỏ dịch vụ.» Mốc của tin = **muộn nhất** trong ba mốc: lúc tạo lần đóng; lúc lần đóng bắt đầu hiệu lực (nếu đã qua); và lúc đơn được lưu/gửi lần cuối (`orders.updated_at`) [người soạn]. Như vậy nháp lập **sau** lần đóng, hoặc nháp đổi ngày vào khoảng đóng sau khi người lập đã mở hộp thư, vẫn có tin mới hơn mốc «đã đọc» (`ntf_read_mark`), nên số đỏ tăng. Nếu chỉ lấy lúc tạo lần đóng, các tin đó có thể không bao giờ hiện là «chưa đọc» (người kiểm độc lập, B-7).
  3. Tin **tự mất** khi lần đóng hết hiệu lực / được mở lại, hoặc đơn không còn là nháp/đơn chờ — vì nó là hình chiếu, không có gì phải dọn.
  4. Nhãn trên trang đơn và cờ trên danh sách chờ (Đ4) là lớp thứ hai.
  5. **Người xét duyệt** đơn chờ không nhận tin trong hộp; họ thấy cờ trên danh sách chờ và trang đơn chờ (Đ4).
- Người nhận đúng bằng người **đã thấy** đơn đó hôm nay (người lập của nháp riêng tư — ADR-0135; người lập của đơn chờ). Không mở thêm ai.
- **Không** trong lượt này: gõ cửa màn hình khoá (Web Push) khi vừa đóng. Muốn có thì phải ghi mỗi đơn bị ảnh hưởng một dòng nhật ký có `order_id` ngay trong lô đóng (gốc lắp ráp tiêm hàm tìm đơn vào route của `catalog`, như ADR-0146 Đ4 tiêm bộ lọc), thêm hành động vào `HANH_DONG_TIN_DON` và dựng lại view `v_aud_order_event` bằng migration. Đó là một quyết định chạm dữ liệu thứ tư → lượt riêng nếu chủ cần (câu hỏi C3).

**Phương án bị bác.**
- *Ghi nhật ký theo từng đơn lúc đóng (đường gõ cửa ở trên):* thêm dữ liệu và migration view; đơn chỉ bị ảnh hưởng **theo ngày đi** nên danh sách đơn đúng lúc đóng có thể sai khi người lập đổi ngày sau đó; lần đóng «sau X giờ» chưa có tác dụng lúc ghi. Hình chiếu luôn đúng ở thời điểm xem.
- *Tin thủ công (`POST /api/thong-bao`) gửi theo quyền:* chỉ nhắm theo nhóm quyền, không theo người có nháp; và chỉ Quản trị gửi được (cổng `admin`).
- *Không báo, chỉ hiện mờ trên danh mục:* chủ chốt B6 (b).

**Hệ quả.**
- Mỗi lần mở hộp thông báo / số đỏ thêm vài câu đọc (đơn nháp/chờ của chính người hỏi, rồi lần đóng của các mã đó). Chưa đo.
- Thêm một giá trị loại tin vào hợp đồng `TinDto` / `LoaiTin` và cách vẽ ở giao diện hộp thư.
- Hàm hẹp của `orders` chỉ trả đơn của chính người hỏi. Bài `src/orders-cong-bo.test.ts` canh một **danh sách tên cố định** (`CONG_BO`, dòng 67) nên hàm mới không tự rơi vào; đề xuất thêm tên hàm vào danh sách đó (siết) và cho route của `thongbao` gọi nó sau một `can()` [người soạn].

**Tiêu chí nghiệm thu.**
1. A có nháp chứa X ngày 02/11; B đóng X 01–03/11 → hộp «Của tôi» của A có đúng một tin «Tạm ngừng bán» cho đơn đó; số đỏ tăng 1. C (không có nháp chứa X) không có tin.
2. Người xét duyệt không nhận tin trong hộp về đơn chờ của A; danh sách chờ có cờ.
3. A đổi ngày nháp sang 04/11 → tin biến mất. Quản trị mở lại X → tin biến mất.
4. Lần đóng «sau 3 giờ» → tin hiện ngay với chữ «sẽ ngừng bán từ …».
5. Người đóng (B) không nhận tin về lần đóng của chính mình (khuôn «bỏ người làm» của hộp thư) [người soạn].
6. Lần đóng chưa bắt đầu đã được mở lại (lần đóng rỗng) không sinh tin; lần đóng có kết thúc dự kiến đã qua cũng không sinh tin (cùng định nghĩa «đang / sắp» ở Đ2).

**Điều chưa chắc.** Chủ có coi «tin trong hộp thông báo, không rung máy» là đủ nghĩa «báo» không (câu hỏi C3).

**Vì sao không tính vào trần.** Không bảng, không cột, không migration, không ô quyền, không mở thêm người nhận: người nhận đúng bằng người đã xem được đơn. Nếu chủ chọn đường gõ cửa (C3) thì đó là quyết định chạm dữ liệu riêng.

---

### Đ7 — Hàng rào máy *(không tính vào trần)*

- (a) Bài quét: ngoài tệp SQL của lần đóng trong `catalog`, không tệp mã chạy nào nhắc `ctl_sale_suspension` (mở rộng bài (A) của `src/orders-khong-doc-nhom-truc-tiep.test.ts`).
- (b) Bài lược đồ: bảng không có cột ngoài danh sách Đ1; không cột «cho phép».
- (c) Bài thứ tự cổng (Đ3 tiêu chí 15).
- (d) Bài so khớp form ↔ máy chủ (Đ4 tiêu chí 2).
- (e) e2e: mỗi cửa ở Đ3 (c) trả 409 khi dịch vụ đang đóng; danh mục for-order của Đối tác và văn phòng cùng có cờ. e2e dùng **dịch vụ/nhóm do bài tự chọn** và **mở lại mọi lần đóng bài đã tạo** (D1 local dùng chung, bảng chỉ thêm — khuôn ADR-0146 Đ6).
- (f) Không có tên dịch vụ, tên nhóm, tên loại đối tác nào trong mã chạy (nguyên tắc chủ 30/10): mọi mã trong bài thử do bài tự sinh. **Chưa có máy kiểm** điều này — dựa vào kỷ luật và người kiểm độc lập.
- Mỗi hàng rào ghi vào `docs/SO-HANG-RAO.md` **sau** khi đã quan sát nó chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên).

---

## Đếm quyết định chạm quyền / dữ liệu / tiền

| Điều | Chạm | Tính vào trần? |
|---|---|---|
| Đ1 Bảng lần đóng | dữ liệu (bảng, trigger, migration) | **có** |
| Đ2 Cách xét, hàm công bố | luật tính, hợp đồng `catalog` → `orders` | không (tiền lệ: ADR-0146 không tính Đ2) |
| Đ3 Cổng ở đường ghi đơn | dữ liệu (đổi hành vi ghi của 8 cửa; đóng bán xét ở 7 trong số đó) | **có** |
| Đ4 Danh mục mờ | DTO danh mục của Đối tác/Thực tập thêm trường, có lý do chữ tự do | **tuỳ C6**: người soạn không tính; **tiền lệ ADR-0146 tính** (ADR-0146 tính Đ4 «Danh mục cho form») |
| Đ5 Hai ô quyền | quyền | **có** |
| Đ6 Thông báo hình chiếu | không bảng, không quyền | không |
| Đ7 Hàng rào | — | không |

**Tổng: 3 điều nếu không tính Đ4; 4 điều nếu theo tiền lệ ADR-0146. 0 điều chạm tiền.** Cách đếm theo **điều**, như trang ghép 25/10 và 28/10. Tiền lệ ADR-0146 chỉ đúng một nửa cho cách của người soạn: ADR-0146 **không** tính Đ2 (luật tính) nhưng **có** tính Đ4 (danh mục form). Chọn thông báo gõ cửa ở C3 cũng thêm một điều.

**Phương án nếu chủ tính 4 (C6 = b hoặc c):**
- **Tách (khuyến nghị nếu tính 4):** *Lượt B-lõi* = Đ1, Đ3, Đ5 (cùng Đ2, Đ7 không tính) — 3 điều. *Lượt B-hiển thị* = Đ4 (cùng Đ6 không tính) — 1 điều, duyệt ngay sau, **phát hành cùng** B-lõi để Đối tác không gặp 409 mà danh mục không báo trước. Lượt B-hiển thị không cần bảng hay ô quyền mới; nó đọc hàm `dongBanChoForm` của Đ2.
- **Xin phép vượt trần một lần**, như chủ đã cho ADR-0146 ngày 25/10 và 28/10: giữ một lượt 4 điều.
- Lưu ý: dù chọn cách nào, **lý do** vẫn ra tới Đối tác qua câu báo 409 của Đ3 và tin của Đ6 nếu C1 = (a). Muốn lý do không lộ thì chọn C1 = (c), không phụ thuộc cách đếm.

---

## Câu hỏi cho chủ (gom một lượt, kèm khuyến nghị)

| # | Câu | Phương án | Khuyến nghị |
|---|---|---|---|
| C1 | Lý do đóng có hiện cho **Đối tác** không? | (a) Một ô lý do, hiện cho mọi người lập đơn; form nhắc «lý do sẽ hiện cho Đối tác» · (b) Hai ô: lý do nội bộ và nhãn cho bên ngoài · (c) Đối tác chỉ thấy «Tạm ngừng bán», không thấy lý do | **(a)**: B7 chọn «bắt buộc» chính vì câu báo cho người đặt cần lý do; một ô đơn giản nhất |
| C2 | Có cho đóng theo **đặc điểm dịch vụ** (ví dụ «Buffet = Có») không, khi Lượt A đã có đặc điểm? | (a) Chưa; chỉ dịch vụ và nhóm. Thêm phạm vi đặc điểm bằng một ADR nhỏ sau khi Lượt A duyệt · (b) Chờ Lượt A rồi làm cùng | **(a)**: Lượt B không phải chờ Lượt A; tập phạm vi là tập đóng, thêm sau được |
| C3 | «Báo» người có nháp/đơn chờ đến mức nào? | (a) Tin trong hộp thông báo + nhãn trên đơn, không rung máy (Đ6) · (b) Thêm gõ cửa màn hình khoá ngay lúc đóng — thêm một quyết định chạm dữ liệu, lượt riêng | **(a)** trước; (b) nếu sau một thời gian thấy người lập bỏ lỡ |
| C4 | Bán hàng **đóng nhầm** thì sao? | (a) Nhờ Quản trị/Toàn quyền mở lại (đúng B2) · (b) Người tạo được tự huỷ lần đóng của mình khi nó **chưa bắt đầu** hiệu lực | **(a)**: giữ B2 đơn giản; nhật ký ghi người đóng |
| C5 | Đơn vừa có dịch vụ «cần xác nhận» vừa có dịch vụ bị chặn: bấm Xác nhận thì báo gì trước? | (a) Báo chặn ngay (gọi cổng chặn trước bước «cần xác nhận»; áp cho cả luật bán ADR-0146 khi thi công) · (b) Báo «hãy Gửi xác nhận» trước, bấm Gửi mới báo chặn | **(a)**: người dùng không phải bấm hai lần; ghi vào kế hoạch thi công ADR-0146 |
| C6 | Đếm «danh mục hiện mờ kèm lý do» (Đ4) thế nào? Theo tiền lệ ADR-0146 (đã tính Đ4 «Danh mục cho form») thì lượt này là **4** điều, vượt trần | (a) Không tính → 3 điều, một lượt · (b) Tính → tách: B-lõi (Đ1, Đ3, Đ5) duyệt trước, B-hiển thị (Đ4) duyệt ngay sau, phát hành cùng · (c) Tính → giữ một lượt, cho vượt trần một lần như ADR-0146 | **(b)**: theo đúng tiền lệ đã có, không phải xin vượt trần; hai lượt nhỏ vẫn lên cùng một lần phát hành |

---

## Điều chưa kiểm

- **Dữ liệu thật:** chưa đọc D1 production (AI không được). Không cần cho thiết kế; e2e tự tạo dữ liệu.
- **Số bài thử đỏ** khi thêm hai ô quyền và ba route: chưa đo (ADR-0146 trang ghép 25/10 mục 6 có số đo cho một ô khác, không áp thẳng được).
- **Chi phí truy vấn** của hình chiếu thông báo và của cổng ở 8 cửa: chưa đo.
- `tests/e2e/catalog.mjs` vẫn xanh khi dịch vụ đóng vẫn hiện: suy luận từ mô tả ở ADR-0146 Đ6, chưa chạy.
- Route nào của `thongbao` (hộp thư, số đỏ `tom-tat`, `moi-nhat`) phải gọi hàm hình chiếu, và ô `can()` nào đứng trước: chưa đọc kỹ thân các route đó.
- Không có nhánh nào khác trong máy đang làm ADR-0146 hay đóng bán (kiểm `git branch -a` 30/10: chỉ `main` và nhánh này); nhánh trên máy khác của chủ: chưa kiểm.
- Thư mục `A-…` và `CD-…` (Lượt A, C, D) đang được soạn cùng lúc; đề xuất này chưa đối chiếu với chúng — chỗ chạm dự kiến ghi ở trang ghép mục 5.

## Tách: điều đã kiểm trong mã và điều suy luận

- **Đã kiểm** (đọc mã, tệp:dòng ở bảng «Hiện trạng» H1–H20): cạnh phụ thuộc; tiền tố bảng; tệp nửa nghiêm; nghĩa thật của cờ ẩn (chặn dòng thêm mới và dòng đổi số khách, không chặn nháp giữ nguyên); một nguồn danh mục lập đơn; tám cửa ghi và thứ tự cổng hiện có ở từng cửa; Còn vé đổi được ngày; các đường ghi `depart_date`; cờ cần xác nhận là bảng của `orders`; không có đồng hồ tiêm, khuôn `mock.timers`; hộp thông báo là hình chiếu nhật ký với tập hành động đóng và mốc đã đọc; trang `/catalog` chỉ cho Quản trị; cổng văn phòng; hàng rào văn bản sẵn có.
- **Suy luận / đề xuất** (đánh dấu [người soạn] trong bài): tên bảng, tên ô, tên mã lỗi, câu báo; chi tiết trigger; chỗ gọi thêm trước `tinhCanXacNhan`; chỉ xét dòng đổi ngày ở `PUT …/trip`; thông báo bằng hình chiếu; trang «Tình trạng bán»; không chép lý do vào nhật ký; e2e vẫn xanh; chi phí truy vấn chấp nhận được.
