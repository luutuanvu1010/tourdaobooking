# Đề xuất ADR — Luật bán theo loại đối tác là khả năng chung: không cho phép loại đối tác bất kỳ đặt dịch vụ, nhóm hoặc đặc điểm dịch vụ bất kỳ; «Đặc điểm dịch vụ» là dữ liệu (sửa một phần ADR-0146)

- **Trạng thái:** **duyệt về nội dung** 30/10 — chủ dự án, chat, lượt 4 (`../00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-4-LUAT-BAN-CHUNG.md`; nguyên văn ở mục «Chủ đã chọn 30/10»). Bản này **viết lại phần trình bày** theo L4-0 (khả năng chung; Hòn Tằm chỉ là ca vàng), **không đổi quyết định kỹ thuật nào**; chờ người kiểm soát lại là không đổi nghĩa, rồi mới chép thành ADR. Số ADR **lấy lúc chép sang `docs/adr/`**; số migration **lấy lúc thi công**. Sau khi chép thì không sửa tệp này.
- **Ngày:** 2026-10-30. **Người soạn:** AI lập kế hoạch (vai lập kế hoạch, không thi công, không tự duyệt — Hiến pháp N3, P15).
- **Lượt:** Lượt A của chuỗi việc 30/10 (`../00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-3-PHU-THU-VA-DAC-DIEM.md`, mục «Thứ tự làm»). Trang ghép bắt buộc (`CLAUDE.md` §9): `TRANG-GHEP.md` cùng thư mục.
- **Loại:** việc lớn (dữ liệu, quyền). **Không chạm tiền.** **Cửa:** dữ liệu một chiều mềm (ba bảng mới ở `catalog` chỉ thêm và ở lại; thêm cột vào bảng `prc_sales_block` **chưa tồn tại**, nên làm ngay trong migration đầu tiên của ADR-0146, không phải đổi bảng đã có). Hành vi tắt được bằng cách kết thúc mọi luật theo đặc điểm.
- **Khả năng chung (L4-0):** Bán hàng, Quản trị, Toàn quyền nhập trên bảng điều khiển các quy tắc «**loại đối tác `L` không được đặt** [một dịch vụ | một nhóm | các dịch vụ mang đặc điểm `X = x` (kèm nhóm tuỳ chọn)], từ ngày … đến ngày …». Mặc định mọi loại đặt được mọi dịch vụ; chỉ có quy tắc «không cho phép»; muốn cho phép lại thì kết thúc quy tắc (L4-1). Áp theo **loại đối tác** của bên đặt (L4-3). Mọi ví dụ cụ thể — kể cả Hòn Tằm — nằm ở mục **«Ca vàng»**, không nằm trong thân quyết định.
- **Quan hệ với ADR cũ:**
  - **sửa một phần ADR-0146** (đã duyệt 28/10, **chưa thi công**; nay trình như khả năng chung): Đ1 (thêm phạm vi `ATTRIBUTE`), Đ2 (cách xét), Đ3 (thêm bốn «cửa đổi kết quả của luật»: ba mới, một cửa có sẵn mang thêm nghĩa — Đ4 dưới), Đ6 (thêm hàng rào). Đ4, Đ5 và phần «Việc bắt buộc trước khi đặt luật đầu tiên» **giữ nguyên chữ**. ADR-0146 không bị sửa tệp; dòng trạng thái của nó ở `docs/adr/README.md` ghi thêm «Đ1, Đ2, Đ3, Đ6 bị sửa một phần bởi ADR-<số>» lúc chép (theo cách README đã ghi cho ADR-0028, ADR-0024).
  - **giữ** ADR-0058 (một dịch vụ thuộc đúng một nhóm, nhóm do Quản trị quản), ADR-0118 + ADR-0149 (đưa đón khách sạn ↔ cảng — **không đụng**, xem «Chỗ dễ nhầm»), ADR-0117 (loại đối tác là dữ liệu), ADR-0136 (cổng luật bán đứng đầu `kiemCongXacNhan` + chốt riêng ở Gửi xác nhận).
  - **không thêm** ngoại lệ mới cho ADR-0005 đ1 / ADR-0018 đ3: đặc điểm là tính chất của **dịch vụ**, không phải của người. Ngoại lệ chỉ siết duy nhất vẫn là cái ADR-0146 đã có (đọc loại của bên đặt để từ chối).
- **Hiến chương áp:** Điều 2.2 (đặc điểm, giá trị, gắn giá trị là **dữ liệu**; các kiểu phạm vi luật là **tập đóng** `CHECK` ở CSDL, đổi bằng ADR); **lệch có chủ ý, hẹp: điều 5.2** — **chủ đã duyệt 30/10** (Điều 6.1; A-C4 ở mục «Chủ đã chọn 30/10»), giới hạn ở mục «Lệch có chủ ý điều 5.2»; 5.3 (không cạnh phụ thuộc mới), 5.5 (chỉ thêm, kết thúc thay cho xoá, có dấu vết), 5.12 (nhật ký).
- **Xây trên lỗ đang hở:** **không**. Không tiền, không sổ (TNV-G1, G3, G4, HC-4.2 không chạm). HC-5.11 (Cron đồng bộ danh mục không có định danh) không chạm: lượt này **không thêm câu ghi nào** vào đường đồng bộ. HC-5.19: migration chỉ thêm bảng. Kiểm `docs/quyen-hoan.json` ngày 30/10.

## Lời chủ (nguyên văn)

- 30/10, lượt 1: «xem lại chỗ "Chặn hòn tằm" là thế nào? , ở đây chúng ta cố gắng coi logic nghiệp vụ là dữ liệu nhé, tức phải nhập tay thủ công hoặc biến nó thành tùy chọn /thao tác trong bảng điều khiển chứ không được khóa cứng trong code (tôi cực kỳ tán thành ) . ngoài ra tôi cơ bản đồng ý theo khuyến nghị của bạn.»
- 30/10, lượt 2: «1: Khác nhau, Bao gồm và không bao gồm vận chuyển là : Trên thực tế, có những vé du lịch tham quan đảo Hòn Tằm đã bao gồm vận chuyển từ cảng ra đến đảo , có những vé du lịch tham quan đảo Hòn Tằm không gồm vận chuyển từ cảng ra đến đảo. Còn Đón hay không đón là: Đưa /đón 01 chiều và/hoặc 02 chiều từ khách sạn của khách du lịch đến Cảng (Vinpearl hoặc Bến Tàu du lịch Nha Trang) , 2- Phụ thu mùa vụ (seasonal pricing) theo 02 cách : giá tiền trên dịch vụ hoặc phần trăm trên dịch vụ.»
- 30/10, lượt 3, câu 5 (trả lời câu P5 «Đặc điểm dịch vụ khai ở đâu?»): «5- Trên bảng điều khiển của nền tảng.» Câu 6 (trả lời P6 «Ai quản đặc điểm dịch vụ?», khuyến nghị «Quản trị, Toàn quyền định nghĩa đặc điểm; Bán hàng được gắn giá trị cho dịch vụ»): «6- như khuýen nghị.»
- 30/10, lượt 4: «không phải là chặn Hòn Tằm, đó hãy coi như là 1 ca vàng thôi, 1 ví dụ . Ý của tôi có thể hiểu rộng là : Cho phép đặt/không cho phép đặt dịch vụ cụ thể với vai trò cụ thể (ví dụ: lễ tân khách sạn không thể đặt dịch vụ nào của Hòn Tằm mà không gồm vận chuyển từ đất liền ra đảo và ngược lại ), bạn hiểu ý tôi chứ». Trả lời ba câu người ghi hỏi cùng bốn câu C1–C4 của bản này: «ôk tôi đồng ý».
- Các mục đã chốt mà đề xuất này thi hành (người ghi chép ghi, không phải lời chủ nguyên văn): **Đ-1** «Vận chuyển cảng ↔ đảo» khác «đưa đón», không dùng lẫn; **Đ-2** khung «Đặc điểm dịch vụ», Quản trị + Toàn quyền định nghĩa, Bán hàng gắn giá trị, khai trên bảng điều khiển, không thêm cột Sheet, có danh sách «dịch vụ chưa khai đặc điểm»; **Đ-3** luật chặn theo loại đối tác thêm phạm vi theo đặc điểm, kết hợp được với nhóm; **L4-0** đây là khả năng chung, Hòn Tằm là ca vàng; **L4-1** chỉ có quy tắc «không cho phép»; **L4-2** «và ngược lại» chưa chọn nghĩa, cả hai nghĩa là dữ liệu; **L4-3** theo loại đối tác, theo hồ sơ cụ thể để sau.

## Tóm tắt cho chủ (lời thường)

1. Trên bảng điều khiển, người có quyền đặt được quy tắc **«loại đối tác này không được đặt …»** cho: **một dịch vụ**, **cả một nhóm**, hoặc **mọi dịch vụ mang một đặc điểm** (có thể kèm «chỉ trong nhóm …»). Mỗi quy tắc có ngày bắt đầu, ngày kết thúc (ngày kết thúc có thể để trống). Không cần lập trình cho quy tắc mới.
2. Mặc định mọi loại đối tác đặt được mọi dịch vụ. Chỉ có quy tắc **không cho phép**; muốn cho phép lại thì **kết thúc** quy tắc. Không có danh sách «chỉ được đặt những thứ này», không có ngoại lệ «chặn cả nhóm trừ một vé».
3. Có thêm màn **«Đặc điểm dịch vụ»**: Quản trị, Toàn quyền tự đặt tên đặc điểm và danh sách lựa chọn. Bán hàng chọn giá trị cho từng dịch vụ; Quản trị, Toàn quyền đặt được cho cả một nhóm; **riêng thắng chung**. Dịch vụ mới chỉ cần được khai đúng giá trị là các quy tắc theo đặc điểm tự áp.
4. Dịch vụ **chưa khai** thì quy tắc theo đặc điểm **không chặn** nó. Vì vậy màn có danh sách «dịch vụ chưa khai», hiện ngay khi Sheet có vé mới.
5. Đổi giá trị đặc điểm của một dịch vụ là đổi kết quả của quy tắc. Màn cảnh báo trước khi lưu, mọi lần đổi có nhật ký; đơn đã xác nhận không bị xét lại.
6. Ví dụ cụ thể (Hòn Tằm, «và ngược lại», vé chưa khai…) ở mục **«Ca vàng»**.
7. Lượt này có **3** quyết định chạm quyền / dữ liệu, đúng trần, cộng một chỗ đi lệch có chủ ý luật kiến trúc (điều 5.2) mà chủ đã duyệt hẹp ngày 30/10.

## Chỗ dễ nhầm (trả lời trước)

| Câu | Trả lời |
|---|---|
| Một đặc điểm dịch vụ có được dựa vào cơ chế có sẵn khác nghĩa không? Ví dụ của ca vàng: «Vận chuyển cảng–đảo» có phải «đưa đón» không? | **Không** (Đ-1). Đặc điểm là dữ liệu riêng của khung này, không tái dùng cơ chế nào có sẵn. Đưa đón = chặng khách sạn ↔ cảng, ghi ở `ord_transfer_leg`, được bật/tắt bởi cờ nhóm `ctl_group.transfer_enabled` (migration 0121) và ô dịch vụ `ctl_service_transfer_rule` (migration 0127:7–26, `mode` ∈ {`ALWAYS`,`NEVER`}). Hai thứ đó là **cổng ghi chặng** mà `orders` đọc qua view `v_ctl_service_transfer` (0127:30–41). Tái dùng chúng cho «vé gồm tàu ra đảo» sẽ làm vé «Không gồm vận chuyển cảng–đảo» bị **cấm ghi chặng đưa đón** — sai nghiệp vụ (khách vẫn có thể cần xe từ khách sạn ra cảng). Đề xuất này **không đọc, không sửa** hai thứ đó. Trong mã, không đặc điểm cụ thể nào tồn tại: mọi đặc điểm chỉ là dòng dữ liệu Quản trị nhập |
| Bảng đặc điểm ở phân hệ nào? | `catalog` (tiền tố `ctl_`). Đặc điểm là tính chất của dịch vụ, cùng chỗ với nhóm. Xem Đ1 |
| Luật bán (ở `pricing`) đọc đặc điểm thế nào mà không phá luật phụ thuộc? | Qua **view công bố mới** `v_ctl_service_attribute` của `catalog`. Cạnh `pricing → catalog` **đã có** (`src/architecture.test.ts:57`), `pricing` đã đọc view `v_ctl_service_group` cùng kiểu (`src/modules/pricing/repository.ts:91`, câu `groups_of`). `catalog` giữ nguyên `["audit"]` (`src/architecture.test.ts:33`). Không cạnh mới, không vòng. Mọi khoá ngoại mới là **một cột, trỏ khoá chính** của bảng cha, vì bài «khoá ngoại xuyên module đúng chiều» (`src/architecture.test.ts:334–353`) duyệt mọi khoá ngoại của mọi bảng và đòi đúng điều đó; ràng buộc «giá trị thuộc đúng đặc điểm» nằm ở trigger. Xem Đ1, Đ2 |
| Dịch vụ chưa khai thì sao? | Luật theo đặc điểm không phủ (mặc định không chặn), giống bên đặt không mang loại ở ADR-0146 Đ2. Rủi ro và cách bù: Đ5 |
| Đổi giá trị đặc điểm có phải «cửa đổi kết quả luật» không? | Có, như gán nhóm ở ADR-0146 Đ3. Cách xử lý: Đ4 |

## Hiện trạng đã kiểm trong mã (worktree `tinh-trang-ban`, HEAD `a129d3d`, cùng `main`)

- **ADR-0146 chưa thi công:** không tệp nào trong `src/`, `migrations/`, `web/`, `tests/` nhắc `prc_sales_block`, `sales_blocked` hay `sales.block` (tìm 30/10, kết quả rỗng). `migrations/` lớn nhất là `0127_dua_don_theo_dich_vu.sql`. Trong máy chỉ có hai worktree: checkout gốc (`main`) và worktree này; nhánh khác trên máy chủ git **chưa kiểm**.
- **Cạnh phụ thuộc** (`src/architecture.test.ts:20–76`, `ALLOWED_EDGES`): `catalog: ["audit"]` (dòng 33); `orders: [... "catalog", ... "pricing"]` (54); `pricing: ["parties", "catalog", "audit"]` (57). Bài 8(b) cho module nghiêm cho phép đọc **view** của module có cạnh, cấm đọc thẳng **bảng** (`src/architecture.test.ts:446–458`). `pricing` là module nghiêm (`STRICT`, dòng 96); `catalog` còn `LEGACY` tới 2027-03-31, SQL mới của nó chỉ ở tệp nửa nghiêm `catalog/nhom-repo.ts` (dòng 113–120, 172–173). Thân trigger chỉ đọc bảng cùng module hoặc view công bố của module được phép phụ thuộc (bài ở dòng 1335, ADR-0024 điều 5). Tiền tố view `ctl` thuộc `catalog` (dòng 213).
- **Nhóm dịch vụ:** `ctl_group` (0055:10), lịch sử gán `ctl_service_group` chỉ thêm, nhóm hiện hành = `seq` lớn nhất (0055:24–43); view `v_ctl_service_group(catalog_code, group_code)` (0090:12–15). Mã nhóm mới do máy sinh ngẫu nhiên (`maNhomMoi`, `catalog/nhom-repo.ts:179`). Mười bốn mã nhóm (ví dụ `HTA` = Hòn Tằm) chỉ có trong **dữ liệu gieo** của migration 0055 (dòng 46–64), không trong mã chạy.
- **Khuôn «riêng thắng chung»:** `ctl_service_transfer_rule` — chỉ thêm, «Theo nhóm» = không có dòng mở, tối đa một dòng mở mỗi dịch vụ (chỉ mục duy nhất một phần), trigger chỉ cho đóng dòng mở (0127:7–26). Route `PUT /api/catalog/:code/transfer-rule` khoá lạc quan theo lựa chọn đang thấy, dữ liệu + nhật ký một lô (`catalog/index.ts:335–360`).
- **Đồng bộ Sheet:** `INSERT … ON CONFLICT(code) DO UPDATE SET` liệt kê từng cột của `catalog_item`, dịch vụ biến mất chỉ đặt `in_sheet = 0` (`catalog/repository.ts:112–132`). Đồng bộ không đụng bảng `ctl_*`. `catalog_item.first_seen_at` có sẵn (0006:38) — dùng được để biết dịch vụ mới. Kết quả đồng bộ trả `added` (`catalog/service.ts:7–9, 41–50`).
- **Cổng:** mọi route ghi của `catalog` khai cổng `"admin"` và hỏi `admin.manage` (`catalog/index.ts:176–413`). Cổng admin = `ADMIN`, `SUPER_ADMIN` (`permissions.ts:376`, router chặn ở `router.ts:441`). Cổng văn phòng = `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN` (`permissions.ts:387`). ⇒ Bán hàng **không** dùng được route cổng admin; route gắn giá trị phải ở cổng văn phòng (giống ô `sales.block.write` của ADR-0146 Đ5).
- **Ô quyền:** `admin.manage` = Quản trị + Toàn quyền (`permissions.ts:185`, hàm `quanTri()` dòng 58). Thứ tự cột của `row()` ở `permissions.ts:40–48`.
- **Cửa xác nhận:** `kiemCongXacNhan` (`orders/xac-nhan-chung.ts:83`) gom các cổng của Còn vé, Gửi đơn, `/status`; Gửi xác nhận **không** đi qua hàm này, có chốt riêng (`orders/xac-nhan-route.ts:100, 118`). Đúng như ADR-0146 Đ3 bổ sung 28/10 mô tả.
- **Hàm tiêm của gốc lắp ráp:** `benDatCuaToi` ở `src/index.ts:184`, kiểu ở `src/shared/router.ts:205, 358, 494`. Bộ lọc danh mục for-order của ADR-0146 Đ4 sẽ theo kiểu này; route for-order hiện ở `catalog/index.ts:167–171`.
- **Hàng rào `orders` không đọc bảng `ctl_*`:** `src/orders-khong-doc-nhom-truc-tiep.test.ts` (bài (A) quét `ctl_group|ctl_service_group|ctl_service_transfer_rule`).
- **Menu:** mục «Dịch vụ & giá» (`/catalog`) chỉ hiện cho `admin.manage` (`src/shared/muc-giao-dien.ts:71`).

## Quyết định

### Đ1 — Khung «Đặc điểm dịch vụ» là dữ liệu của `catalog` *(chạm dữ liệu — tính vào trần)*

Ba bảng mới, đều do `catalog` sở hữu và ghi, đều chỉ thêm, đều có cột dấu vết `created_at/by`, `updated_at/by` (`TEXT NULL`, không khoá ngoại tới `staff`, đúng luật bảng mới):

1. **`ctl_attribute`** — một đặc điểm. Cột: `code` (máy sinh ngẫu nhiên như `maNhomMoi`), `name` (1–40 ký tự), `sort_order`, `active`. Tên trùng chỉ cấm giữa các đặc điểm đang dùng (chỉ mục duy nhất một phần, như `ctl_group`). Không xoá (trigger); tắt = `active = 0`.
2. **`ctl_attribute_value`** — một lựa chọn của một đặc điểm. Cột: `code` (khoá chính, máy sinh, duy nhất **toàn bảng**), `attribute_code` (khoá ngoại một cột → `ctl_attribute(code)`), `name`, `sort_order`, `active`. Không xoá; tắt = `active = 0`.
3. **`ctl_attribute_assignment`** — gắn một giá trị cho **một dịch vụ** hoặc **một nhóm**. Cột: `id`, `service_code` (→ `catalog_item`) hoặc `group_code` (→ `ctl_group`) — **đúng một** trong hai (`CHECK`), `attribute_code` (→ `ctl_attribute(code)`), `value_code` (khoá ngoại **một cột** → khoá chính `ctl_attribute_value(code)`), `valid_from_at`, `valid_to_at`.
   - **«Giá trị thuộc đúng đặc điểm»** do **trigger** canh (`BEFORE INSERT`: `value_code` phải có dòng trong `ctl_attribute_value` với cùng `attribute_code`; trigger chỉ đọc bảng cùng module). Không dùng khoá ngoại hai cột: bài «khoá ngoại xuyên module đúng chiều» (`src/architecture.test.ts:334–353`) đòi mọi khoá ngoại trỏ đúng khoá chính **một cột** của bảng cha, và `migrations/` chưa có khoá ngoại nhiều cột nào. Giữ khoá ngoại hai cột sẽ là nới hàng rào (Điều 9.4) — người soạn không đề nghị. Cột `attribute_code` vẫn cần trên dòng gắn để chỉ mục «một dòng mở mỗi (đích, đặc điểm)» làm được.
   - Theo khuôn 0127: dòng mở = `valid_to_at IS NULL`; **tối đa một dòng mở** cho mỗi cặp (dịch vụ, đặc điểm) và mỗi cặp (nhóm, đặc điểm) — hai chỉ mục duy nhất một phần. Đổi = đóng dòng cũ + chèn dòng mới trong một lô; bỏ giá trị = chỉ đóng dòng. Trigger: cấm xoá; chỉ cho **đóng** dòng mở, mọi cột khác giữ nguyên; cấm chèn khi đặc điểm, giá trị hoặc nhóm đang tắt.
   - «Theo nhóm» của một dịch vụ = **không có dòng mở** của dịch vụ cho đặc điểm đó (không lưu thành giá trị), giống 0127.

**View công bố `v_ctl_service_attribute(catalog_code, attribute_code, value_code, source)`** — giá trị **hiệu lực** của mỗi dịch vụ cho mỗi đặc điểm:
- dòng mở của chính dịch vụ nếu có (`source = 'SERVICE'`); nếu không,
- dòng mở của **nhóm hiện hành** (qua `v_ctl_service_group`) nếu nhóm đang dùng (`source = 'GROUP'`) — cùng cách 0121 coi dịch vụ của nhóm tắt như «Chưa phân loại»;
- không có cả hai ⇒ **không có dòng** (= chưa khai).
- Chỉ khoá; không tên. Thêm view **`v_ctl_attribute_value(attribute_code, code, active)`** để `pricing` kiểm luật trỏ tới giá trị đang dùng (Đ2). Cả hai vào `docs/data-dictionary.json`.
- **Một nguồn sự thật cho «giá trị hiệu lực»:** mọi nơi cần (hàm luật bán, màn đặc điểm, danh sách chưa khai) đọc view này; không viết lại phép «riêng thắng chung» bằng TypeScript ở chỗ thứ hai. Đây là bài học «bẫy hai luật» của ADR-0149.

**Tắt đặc điểm / giá trị:** chỉ được khi **không còn dòng gắn mở** nào dùng nó (409 `attribute_in_use`, cùng khuôn «nhóm còn dịch vụ thì không tắt được», `catalog/index.ts:264–267`). Lý do: khi không còn dịch vụ nào mang giá trị, tắt nó **không đổi kết quả luật nào** (luật trỏ tới nó vốn đã không phủ dịch vụ nào), nên `catalog` không cần đọc `pricing`. [người soạn]

**Bật lại đặc điểm / giá trị đã tắt:** được (đặt `active = 1`, `admin.manage`, có nhật ký). Một luật bán cũ trỏ tới giá trị đó vẫn có thể còn hiệu lực (bất biến ở Đ2 chỉ canh lúc **thêm** luật), nên bật lại rồi gắn cho dịch vụ sẽ làm luật cũ **chặn lại**. Đây là một cửa đổi kết quả luật, xử lý ở Đ4 cửa (d). [người soạn: chọn liệt kê thành cửa có cảnh báo, không chọn «tắt là một chiều», vì tắt nhầm thì phải tạo giá trị mới và gắn lại toàn bộ]

**Không gieo dữ liệu.** Migration **không** chèn đặc điểm hay giá trị nào. Quản trị nhập trên màn sau khi phát hành (bước runbook). Mã chạy không biết tên, mã đặc điểm nào. (Chủ đã chọn A-C3.)

**Lệch có chủ ý, hẹp: điều 5.2 Hiến chương** (**chủ đã duyệt 30/10** — Điều 6.1; A-C4). 5.2 ghi: «**Không** dùng cơ chế "trường mở rộng tự do" (flexfield/JSON không lược đồ) cho dữ liệu nghiệp vụ» (`docs/ARCHITECTURE.md:93`). Khung này mang dấu hiệu của một flexfield: người dùng tự đặt tên thuộc tính trên màn, mỗi thuộc tính có bộ giá trị, gắn vào thực thể có sẵn, mã không biết nghĩa của thuộc tính nào; tờ bổ sung 30/10 cũng tự gọi nó là «kiểu flexfield của Oracle». Người soạn **không** tự phán «không lệch». Lý do lệch: chủ chốt Đ-2 và nguyên tắc «logic nghiệp vụ là dữ liệu». **Giới hạn của chỗ lệch** (mỗi giới hạn là một phần của quyết định này):
1. Tập đặc điểm và tập giá trị là **dòng có kiểu, có khoá** trong bảng có cột rõ kiểu; giá trị gắn cho dịch vụ chỉ chọn từ danh sách đó (khoá ngoại + trigger).
2. **Không chữ tự do**, không số tự do, **không JSON** ở bất kỳ bảng nào của khung.
3. Đặc điểm **chỉ được dùng làm điều kiện của một luật đã có ADR** (lượt này: luật bán ADR-0146). Dùng cho việc khác — đặc biệt là tiền (phụ thu, hoa hồng) — cần ADR riêng.
4. Mã không rẽ nhánh theo mã hay tên của một đặc điểm / giá trị cụ thể (bộ máy chung chỉ so khoá với khoá); hàng rào (l) ở Đ6.
5. Bảng gắn có hiệu lực theo thời gian (dòng mở / đóng) và nhật ký. Hai bảng định nghĩa chỉ có cờ `active`, không có ngày hiệu lực — giống `ctl_group` (0055:10); đây cũng là một phần của chỗ lệch, chủ duyệt cùng.

Chỗ lệch này **không** phải quyết định chạm quyền / dữ liệu thứ tư (dữ liệu đã tính ở Đ1), nhưng là **một mục chủ duyệt thêm** — đã duyệt (A-C4), ghi ở bảng «Đếm».

**Phương án bị bác (Đ1):**
- **Đặt bảng ở `pricing`:** đặc điểm sẽ dùng cho nhiều việc (luật bán; có thể đóng bán ở lượt B, phụ thu ở lượt D, hiển thị). `catalog` không đọc được `pricing` (sẽ thành vòng `catalog → pricing → catalog`), nên màn danh mục và danh sách chưa khai không đọc được đặc điểm.
- **Module mới riêng cho đặc điểm:** thêm module, thêm cạnh, thêm hạng `STRICT/LEGACY` cho ba bảng — nặng hơn nhu cầu.
- **Thêm cột vào `catalog_item`:** bảng của đồng bộ Sheet; mỗi đặc điểm mới thành một cột = sửa lược đồ = sửa mã (trái nguyên tắc chủ).
- **Dùng `catalog_override`:** bảng này còn xoá cứng (nợ ghi ở `src/architecture.test.ts:115`), không lịch sử, một dòng mỗi dịch vụ.
- **Cột trong Google Sheet:** chủ đã chọn bảng điều khiển (lượt 3 câu 5); Sheet phình theo từng đặc điểm.
- **Một cột JSON `attributes` trên dịch vụ:** trái Hiến chương 5.2; không khoá ngoại, không lịch sử.
- **Tái dùng `ctl_service_transfer_rule` hoặc `ctl_group.transfer_enabled`:** khác nghĩa (Đ-1), đã giải thích ở «Chỗ dễ nhầm».
- **Kế thừa nhiều tầng / giá trị mặc định toàn danh mục:** chỉ hai tầng nhóm → dịch vụ như ADR-0149; tầng «mọi dịch vụ» làm danh sách chưa khai mất tác dụng.

**Hệ quả (Đ1):** một migration (số lấy lúc thi công), ba bảng + hai view + trigger; `docs/data-dictionary.json` + `npm run dict`; SQL mới chỉ ở tệp nửa nghiêm của `catalog` (tệp mới cạnh `nhom-repo.ts`, đưa vào `NUA_NGHIEM`, chịu bài EXPLAIN); thêm hành động nhật ký ở `src/shared/audit-actions.ts` (nhóm `catalog`): tạo / sửa / tắt đặc điểm, tạo / sửa / tắt giá trị, đổi giá trị của dịch vụ, đổi giá trị của nhóm. Nhật ký ghi tên đặc điểm, giá trị cũ → mới, mã dịch vụ hoặc tên nhóm; không thông tin cá nhân.

### Đ2 — Quy tắc «không cho phép» theo loại đối tác, phủ dịch vụ / nhóm / đặc điểm *(chạm dữ liệu + luật — tính vào trần)*

**Khả năng chung:** một dòng của `prc_sales_block` = «loại đối tác `L` không được đặt [phạm vi], trong [hiệu lực]». Phạm vi là một trong ba kiểu dưới. Chỉ có dòng «không cho phép» (L4-1); áp theo loại đối tác của bên đặt (L4-3; theo từng hồ sơ cụ thể làm sau bằng ADR nhỏ).

**Sửa ADR-0146 Đ1 (bảng `prc_sales_block`, chưa tồn tại):** mỗi dòng có thêm **hai cột** `attribute_code` (khoá ngoại một cột → `ctl_attribute(code)`) và `value_code` (khoá ngoại một cột → khoá chính `ctl_attribute_value(code)`); hướng `pricing → catalog` đúng chiều cạnh (`src/architecture.test.ts:57`), nên bài khoá ngoại ở `:334–353` không đỏ. Cột nhóm và cột dịch vụ là cột ADR-0146 đã có. Kiểu phạm vi là **tập đóng, `CHECK` ở CSDL** (không kiểm ở mã; đổi bằng ADR — Hiến chương 2.2). Lượt B thống nhất theo cách này cho bảng của nó:

| Kiểu | Bắt buộc | Không được có | Nghĩa |
|---|---|---|---|
| `SERVICE` | mã dịch vụ | nhóm, đặc điểm | như ADR-0146 |
| `GROUP` | mã nhóm | dịch vụ, đặc điểm | như ADR-0146 |
| `ATTRIBUTE` (mới) | đặc điểm + giá trị | dịch vụ | dịch vụ có giá trị hiệu lực = giá trị đó; **nhóm tuỳ chọn**: có nhóm thì dịch vụ còn phải thuộc nhóm hiện hành đó |

- Vẫn **không có** phạm vi «mọi dịch vụ», **không có** cột hay giá trị nào mang nghĩa «cho phép» (ADR-0146 Đ1 giữ).
- Mỗi luật **một** điều kiện đặc điểm. [người soạn] Muốn «A = x **và** B = y» thì để sau, bằng ADR.
- **Bất biến thêm (hai lớp):** luật theo đặc điểm chỉ được **thêm** khi (i) giá trị **thuộc đúng** đặc điểm ghi trên dòng và (ii) giá trị đang dùng. CSDL: trigger `BEFORE INSERT` của `prc_sales_block` đọc `v_ctl_attribute_value(attribute_code, code, active)` (view công bố của module được phép phụ thuộc — hợp lệ theo ADR-0024 điều 5, bài `src/architecture.test.ts:1335`). Máy chủ: route thêm luật kiểm trước, trả 409 có câu tiếng Việt. Bất biến chỉ canh lúc thêm; luật đã có mà giá trị bị tắt rồi bật lại thì xem Đ4 cửa (d).

**Sửa ADR-0146 Đ2 (cách xét):** dịch vụ mã `D` bị chặn cho một đơn khi hồ sơ bên đặt mang ít nhất một loại `L` có luật còn hiệu lực thoả **một** trong:
1. `SERVICE` và mã = `D`;
2. `GROUP` và nhóm = nhóm hiện hành của `D`;
3. `ATTRIBUTE` và giá trị hiệu lực của `D` cho đặc điểm đó (đọc `v_ctl_service_attribute`) = giá trị của luật, **và** (luật không có nhóm **hoặc** nhóm của luật = nhóm hiện hành của `D`).

Phần còn lại của Đ2 giữ: loại và hiệu lực xét theo ngày giờ Việt Nam lúc thao tác; đơn không có bên đặt, hoặc bên đặt không mang loại nào, không bị chặn. Thêm: **dịch vụ không có giá trị hiệu lực cho đặc điểm thì vế 3 không phủ** (Đ5). Các luật cộng dồn theo kiểu «chặn thắng»: không có thứ tự ưu tiên giữa luật, vì không có dòng cho phép. «Riêng thắng chung» chỉ áp ở bước tìm **giá trị** của dịch vụ (Đ1), không áp giữa các luật chặn.

- Hệ quả cần nói rõ (chủ đã chọn L4-1): **không có ngoại lệ** «chặn cả nhóm trừ một vé». Muốn một vé trong nhóm không bị chặn thì dùng luật `ATTRIBUTE` (kèm nhóm) thay cho luật `GROUP`, rồi đặt giá trị riêng cho vé đó (ca vàng CV-3).

**Cổng:** Lượt A **không đổi** ADR-0146 Đ3, Đ4; **chỗ đặt có thể đổi theo câu C5 của Lượt B** (xem «Hệ quả» dưới). Vẫn **một hàm** ở `pricing` (công bố qua `index.ts`), gọi ở đúng các cửa ADR-0146 Đ3 liệt kê (đầu `kiemCongXacNhan`; chốt riêng ở Gửi xác nhận; lập đơn, sửa nháp, đổi bên đặt). Hàm đọc thêm view đặc điểm cho các mã của đơn, bên cạnh `v_ctl_service_group` nó đã đọc. Bộ lọc danh mục for-order (ADR-0146 Đ4) gọi cùng hàm qua gốc lắp ráp, nên tự có phạm vi mới. Câu 409 `sales_blocked` nêu tên dịch vụ; với luật theo đặc điểm thì nêu thêm «(<tên đặc điểm>: <tên giá trị>)» — chữ lấy từ dữ liệu, không viết trong mã. **Tên lấy từ đâu:** hai view công bố chỉ có khoá, `pricing` không đọc thẳng bảng `ctl_*`; hàm luật bán trả **mã** đặc điểm và giá trị trúng luật, rồi tên được lấy qua **một hàm công bố hẹp của `catalog`** (import `catalog/index.ts`, cạnh `pricing → catalog` hoặc `orders → catalog` đã có; khuôn `tenNhomHienHanh`, `catalog/index.ts:38–40`). **Không** thêm cột tên vào view (giữ chỗ dựa của hàng rào (l2)). [người soạn]

**Phương án bị bác (Đ2):**
- **Giữ chỉ `SERVICE` / `GROUP`** (khuyến nghị Q5 cũ ngày 30/10): vé mới từ Sheet mang cùng đặc điểm không tự bị chặn; chủ đã chốt Đ-3.
- **Danh sách trắng / dòng «cho phép» theo dịch vụ để miễn một vé khỏi luật nhóm:** phá ADR-0146 Đ1 (bảng chỉ có dòng chặn); chủ đã chọn L4-1 = (a). Cách miễn đúng là dùng luật theo đặc điểm và đổi giá trị đặc điểm.
- **Quy tắc theo từng hồ sơ đối tác cụ thể:** chủ để sau (L4-3), làm bằng ADR nhỏ.
- **`orders` tự đọc view đặc điểm rồi tự xét:** thành hai nơi xét luật bán, trái ADR-0146 Đ3 («một hàm duy nhất ở `pricing`»).
- **`catalog` trả «dịch vụ bị chặn»:** `catalog` không đọc được loại đối tác (cạnh chỉ có `audit`; ADR-0146 phần bác).
- **Nhiều điều kiện đặc điểm trong một luật ngay bây giờ:** chưa có ví dụ thật cần; tăng số ca kiểm. Để sau.
- **Dựng ngay «khung chính sách chung»** (`../00-dau-vao/KHUNG-CHINH-SACH-CHUNG-2026-10-30.md`, chưa duyệt): thứ tự chủ đã đồng ý là sửa ADR-0146 trước. View đặc điểm ở Đ1 dùng lại được nếu sau này dựng khung chung.

**Hệ quả (Đ2):** migration đầu tiên của ADR-0146 tạo `prc_sales_block` **đã có** hai cột đặc điểm và trigger — không cần migration thứ hai; vì vậy Đ1 phải nằm trong cùng lần phát hành hoặc lần trước (khoá ngoại trỏ `ctl_attribute`, `ctl_attribute_value`). Câu SQL mới của `pricing` qua `defineSql`, chịu EXPLAIN. Màn «Luật bán» (ADR-0146 Đ5) có thêm lựa chọn «Theo đặc điểm», chọn nhóm tuỳ chọn, đặc điểm, giá trị.

**Hệ quả cho kế hoạch thi công ADR-0146 (từ Lượt B, đang soạn ở `../B-dong-ban/`):**
- Lượt B đề xuất **hàm cổng chung ở `orders`** (tên tạm `congBanDuoc`, `B-dong-ban/DE-XUAT-ADR.md` Đ3 (a)) gọi theo thứ tự cố định (1) hàm luật bán của `pricing` → (2) đóng bán. Hàm đó **bọc**, không xét lại: luật bán vẫn chỉ xét ở một hàm của `pricing`. Kế hoạch thi công ADR-0146 phải gọi hàm luật bán qua lớp bọc này nếu Lượt B được duyệt cùng hoặc trước, để không có hai chỗ gọi khác nhau.
- Câu **C5 của Lượt B**: gọi cổng chặn (gồm luật bán) **thêm một lần trước `tinhCanXacNhan`** ở `/status` và Gửi xác nhận. Hôm nay ở `/status`, `tinhCanXacNhan` chạy trước `kiemCongXacNhan` (`src/modules/orders/index.ts:1702–1703`, đã mở tệp); ở Gửi xác nhận nó ở `xac-nhan-route.ts:116`, trước chốt nhóm tắt `:118`. Nếu chủ chọn C5 = (a), chỗ người dùng gặp `sales_blocked` ở `/status` đổi. **Kế hoạch thi công ADR-0146 phải theo câu trả lời C5 của chủ; Lượt A không quyết thay.**

### Đ3 — Ai định nghĩa, ai gắn, ai xem *(chạm quyền — tính vào trần)*

| Việc | Ô quyền | Ai | Cổng route |
|---|---|---|---|
| Thêm / đổi tên / sắp xếp / tắt **đặc điểm** và **giá trị** | `admin.manage` (có sẵn) | Quản trị, Toàn quyền | `admin` |
| Gắn / đổi / bỏ giá trị **theo nhóm** | `admin.manage` (có sẵn) | Quản trị, Toàn quyền | `admin` |
| Gắn / đổi / bỏ giá trị **cho một dịch vụ** | **ô mới** `catalog.attribute.assign` (tên tạm), phạm vi `any` | Bán hàng, Quản trị, Toàn quyền | `office` |
| Xem đặc điểm, giá trị hiệu lực, danh sách chưa khai | `catalog.attribute.assign` **hoặc** `admin.manage` | Bán hàng, Quản trị, Toàn quyền | `office` |

- Ô mới: hàng `row("any", "none", "any", "none", "none", "any", "none", "none", "none", "none")`. Các nhóm không có: Kế toán, Hiện trường, Đối tác, Thực tập, Tài xế, Tài xế đối tác, Nhân sự. Đây là **thao tác mới, không phải mã quyền mới**: bài «mỗi ô được máy chủ hỏi» phải phủ nó; bài tập con quyền không nhân đôi.
- Gắn theo nhóm để ở Quản trị, Toàn quyền vì một lần gắn đổi giá trị của cả nhóm và của mọi vé mới vào nhóm sau này. (Chủ đã chọn A-C1.)
- Route gắn giá trị cho dịch vụ: khoá lạc quan theo giá trị đang thấy (như `transfer-rule`, `catalog/index.ts:335–360`); dữ liệu + nhật ký một `db.batch`; nhật ký chỉ ghi khi câu chốt đổi dòng.
- **Hàng rào siết** [người soạn]: bài kiểm «mọi mã quyền có `catalog.attribute.assign` ≠ none thì cũng có `sales.block.write` ≠ none». Lý do: gắn giá trị đổi được kết quả luật bán (Đ4), nên người gắn không được rộng hơn người đặt luật. Nếu sau này chủ bỏ Bán hàng khỏi ô luật bán (ADR-0146 «Điều chủ cần biết»), bài này đỏ, buộc bỏ luôn ở ô gắn — không để lại cửa sau.

**Phương án bị bác (Đ3):**
- **Dùng `admin.manage` cho cả việc gắn:** trái lời chủ (lượt 3 câu 6, «Bán hàng gắn giá trị»).
- **Dùng lại `sales.block.write` cho việc gắn:** ghép hai nghĩa vào một ô. Nếu lượt D dùng đặc điểm làm điều kiện phụ thu, gắn giá trị sẽ đổi **tiền**, khi đó ô gắn phải tách và xét lại; tách ngay từ đầu rẻ hơn.
- **Đặt route gắn ở cổng `admin`:** Bán hàng không qua được cổng admin (`router.ts:441`, `permissions.ts:376`).
- **Cho Bán hàng định nghĩa đặc điểm:** trái lời chủ.

**Hệ quả (Đ3):** sửa `src/shared/permissions.ts` (một hàng), thêm tên thao tác cho trợ lý (`TEN_THAO_TAC`, bài `src/shared/tro-ly-cau-truc.test.ts`), thêm route vào ảnh chụp `src/route-access.test.ts`, `route-write-guard`, `permission-enforcement`. Trang mới cho văn phòng (khai `PAGES` ở `src/shared/sw-policy.ts`, script `build:web`, mục menu ở `src/shared/muc-giao-dien.ts` hiện theo `can()`), vì Bán hàng không vào được `/catalog`.

### Đ4 — Đổi giá trị đặc điểm là một cửa đổi kết quả của luật *(không thêm bảng, cột hay ô — không tính vào trần)*

ADR-0146 Đ3 đã liệt kê ba cửa đổi kết quả luật mà không qua cổng (kết thúc loại trên hồ sơ, gán nhóm, gộp hồ sơ) và chọn «chấp nhận và ghi lại». Lượt này thêm **bốn** cửa cùng loại — ba cửa mới (a), (b), (d) và cửa (c) có sẵn nay mang thêm nghĩa:
- (a) gắn / đổi / bỏ giá trị của **một dịch vụ** (Bán hàng, Quản trị, Toàn quyền);
- (b) gắn / đổi / bỏ giá trị của **một nhóm** (Quản trị, Toàn quyền) — đổi kết quả cho mọi dịch vụ «theo nhóm» của nhóm đó;
- (c) gán nhóm cho dịch vụ (`PUT /api/catalog/group-assignments`, đã có ở ADR-0146 Đ3) nay đổi thêm giá trị thừa hưởng **và** vế «nhóm» của luật theo đặc điểm.
- (d) **bật lại** một đặc điểm hoặc giá trị đã tắt (`admin.manage`, Đ1): luật bán cũ trỏ tới giá trị đó, nếu còn hiệu lực, sẽ chặn lại ngay khi giá trị được gắn cho dịch vụ. `catalog` không đọc được `pricing` nên máy chủ không tự kiểm được; màn bật lại hiện cảnh báo «còn N luật bán trỏ tới giá trị này, sẽ chặn [các loại] khi giá trị được gắn lại» (đọc route luật của `pricing`, như mục 2 dưới; người bật lại giữ `admin.manage`, và cảnh báo chỉ chạy được vì Quản trị, Toàn quyền cũng giữ `sales.block.write` — hàng rào (i) vế 2).

Xử lý, cùng nguyên tắc ADR-0146 [người soạn]:
1. **Không thêm cổng** vào các route này; không xét lại đơn. **Đơn đã xác nhận giữ nguyên** (không xét lại, không huỷ, không cảnh báo trên đơn). Nháp và đơn đang chờ xác nhận bị xét ở lần lưu, gửi, Còn vé hoặc xác nhận kế tiếp — đúng các cửa của ADR-0146 Đ3.
2. **Cảnh báo trước khi lưu**, trên màn đặc điểm và màn gán nhóm: khi giá trị cũ **hoặc** mới đang bị ít nhất một luật bán còn hiệu lực trỏ tới, hiện «Đổi giá trị này sẽ [bỏ chặn / bắt đầu chặn] [tên dịch vụ] cho: [các loại đối tác]». Màn lấy danh sách luật từ route đọc luật bán của `pricing` (người gắn luôn giữ `sales.block.write`, nhờ hàng rào ở Đ3). Đây là **giao diện**, máy chủ không ép: ghi là «dựa vào giao diện».
3. **Nhật ký** mỗi lần đổi (Đ1, hệ quả). Khi muốn biết «vì sao vé X hôm qua bị chặn, hôm nay không», người xem đọc nhật ký đổi giá trị của X và của nhóm X.
4. Đổi **tên** một giá trị (ví dụ sửa lỗi chính tả) không đổi mã, nên không đổi kết quả luật; nhưng đổi nghĩa chữ thì người đọc luật hiểu sai. Màn sửa tên giá trị cảnh báo khi giá trị đang có luật trỏ tới; có nhật ký tên cũ → mới.

**Đã nói một lần (Hiến pháp P18), chủ đã chọn A-C2 = (a):** Bán hàng đổi giá trị của một vé từ giá trị bị luật trỏ tới sang giá trị khác là **bỏ chặn** vé đó (ca vàng CV-8); máy không ngăn, chỉ cảnh báo và ghi nhật ký. Đây không phải quyền mới: Bán hàng vốn đã gỡ được chính luật (ADR-0146 «Điều chủ cần biết», chủ đã chấp nhận).

**Phương án bị bác (Đ4):**
- **Xét lại hoặc huỷ đơn đã xác nhận khi đổi giá trị:** trái ADR-0146 Đ3 (đơn đã xác nhận không xét lại); một thao tác danh mục không được làm đổi đơn đã bán.
- **Cấm đổi giá trị khi có luật trỏ tới:** khoá quy trình; muốn đổi phải gỡ luật, đổi, đặt lại — ba thao tác thay một, mà kết quả an toàn không hơn. Chủ đã chọn không cấm (A-C2 = (a)).
- **Cần người thứ hai duyệt mỗi lần đổi giá trị:** nặng so với rủi ro (không tiền); ADR-0146 cũng không đòi cho việc gỡ luật.
- **Chụp giá trị đặc điểm vào đơn:** không cần khi đặc điểm chỉ dùng cho luật bán (không tiền, đơn đã xác nhận không xét lại). **Nếu** lượt D dùng đặc điểm cho phụ thu, lượt đó phải tự quyết chụp (Hiến chương 5.6).

### Đ5 — Dịch vụ chưa khai và danh sách «chưa khai» *(chỉ đọc — không tính vào trần)*

**Mặc định:** dịch vụ không có giá trị hiệu lực cho đặc điểm X thì **không bị** luật `ATTRIBUTE` của X phủ (giống bên đặt không mang loại ở ADR-0146 Đ2). Lý do chọn «không chặn»: chặn khi chưa khai sẽ làm **mọi** vé mới từ Sheet biến khỏi danh mục của **mọi** loại đối tác có luật, cho tới khi có người khai — trái ý chủ ở ADR-0146 phần bác («dịch vụ mới cũng sẽ mặc định bị chặn với mọi loại có danh sách trắng»).

**Rủi ro:** một vé mới thật ra mang giá trị bị luật trỏ tới, chưa ai khai, trong khi nhóm của nó chưa có giá trị chung ⇒ loại đối tác bị chặn vẫn đặt được, cho tới khi có người khai (ca vàng CV-6). Rủi ro ngược: nhóm có giá trị chung «Gồm», vé mới thật ra «Không gồm» ⇒ vé mới **thừa hưởng** «Gồm», không nằm trong danh sách chưa khai, cũng không bị chặn.

**Cách bù:**
1. **Danh sách «chưa khai»** theo từng đặc điểm: dịch vụ đang bán (`in_sheet = 1`, không ẩn) không có dòng nào trong `v_ctl_service_attribute` cho đặc điểm đó. Danh sách tính lúc đọc (không phải ảnh chụp lúc đồng bộ), nên vé mới hiện ngay sau lần đồng bộ Sheet kế tiếp, kể cả lần đồng bộ của Cron không có người bấm.
2. **Danh sách «mới, đang theo nhóm»:** dịch vụ có `first_seen_at` trong 14 ngày gần nhất mà giá trị đang **thừa hưởng từ nhóm** (`source = 'GROUP'`), để người khai rà lại. [người soạn: 14 ngày — hằng số hiển thị trong mã, **bề mặt, đảo ngược được**, không phải luật nghiệp vụ nên không đưa lên bảng điều khiển]
3. **Số đếm** «N dịch vụ chưa khai» ở mục menu của trang đặc điểm (khuôn huy hiệu «Dịch vụ & giá», route `dem-xung-dot`, `catalog/index.ts:176–180`).
4. **Nhóm không liên quan:** Quản trị tự thêm giá trị như «Không áp dụng» và gắn **theo nhóm** cho nhóm không liên quan, để danh sách chưa khai chỉ còn vé thật sự cần khai. Đây là dữ liệu, không phải tính năng; mã không biết chữ «Không áp dụng».
5. **Runbook trước khi đặt luật theo đặc điểm đầu tiên** (nối vào mục «Việc bắt buộc» của ADR-0146): khai giá trị cho mọi vé của nhóm sẽ dùng trong luật, xem danh sách chưa khai của đặc điểm đó bằng 0 cho nhóm đó.

Danh sách chỉ đọc, dùng ô đọc ở Đ3; không thêm dữ liệu, nên không tính vào trần.

### Đ6 — Hàng rào máy *(chỉ siết — không tính vào trần)*

Nối vào ADR-0146 Đ6:
- (e) Mở rộng `src/orders-khong-doc-nhom-truc-tiep.test.ts`: `orders` không nhắc `ctl_attribute`, `ctl_attribute_value`, `ctl_attribute_assignment`.
- (f) Bài quét: ngoài tệp nửa nghiêm mới của `catalog`, mã chạy không tệp nào nhắc ba bảng trên (`pricing` đọc view; bài 8(b) đã bắt đọc thẳng bảng ở module nghiêm, bài này bắt cả module `LEGACY`).
- (g) Bài lược đồ `prc_sales_block`: `CHECK` kiểu phạm vi đúng ba giá trị; `ATTRIBUTE` thiếu giá trị hoặc kèm mã dịch vụ bị CSDL từ chối; dòng có giá trị không thuộc đặc điểm ghi trên dòng bị trigger từ chối; vẫn không có cột «cho phép». Mọi khoá ngoại mới (ba bảng `ctl_attribute*` và hai cột của `prc_sales_block`) là một cột trỏ khoá chính — bài sẵn có `src/architecture.test.ts:334–353` canh.
- (h) Bài so khớp view: với mọi tổ hợp {dịch vụ có / không dòng riêng} × {nhóm có / không dòng chung} × {nhóm đang dùng / Chưa phân loại}, `v_ctl_service_attribute` cho đúng đáp án bảng chân trị viết sẵn trong bài.
- (i) Bài quyền: tập người giữ `catalog.attribute.assign` ⊆ tập người giữ `sales.block.write` (Đ3), **và** tập người giữ `admin.manage` ⊆ tập người giữ `sales.block.write` — vì cảnh báo đổi giá trị theo nhóm và cảnh báo «bật lại» (Đ4 (b), (d), ô `admin.manage`) cũng đọc route luật của `pricing`; bỏ Quản trị khỏi ô luật bán thì hai cảnh báo này im lặng.
- (j) Bài migration: migration của lượt này không `INSERT` vào `ctl_attribute*` (không gieo đặc điểm).
- (l) Giới hạn 4 của chỗ lệch 5.2 («mã không rẽ nhánh theo đặc điểm cụ thể») — ba vế:
  - (l1) **Bài quét, kiểm được:** mã đặc điểm và mã giá trị do máy sinh với **tiền tố riêng, khác `g`** của `maNhomMoi` (`nhom-repo.ts:179`) để bài không bắt nhầm mã nhóm (ví dụ `a` cho đặc điểm, `v` cho giá trị — người thi công chốt). Bài quét bản đã che chú thích của `src/**/*.ts` (trừ `*.test.ts`) và `web/**/*.ts`, đỏ khi gặp chuỗi hằng dạng `<tiền tố>[0-9a-f]{12}`. Quan sát đỏ thật bằng cài một chuỗi mã giả rồi gỡ. Chỉ canh quên, không canh cố ý (mã đọc từ nguồn khác thì bài không thấy).
  - (l2) **Bài trên sổ `defineSql`, kiểm được:** không câu SQL đã đăng ký nào của `pricing` hay `orders` đọc cột `name` của `ctl_attribute` / `ctl_attribute_value`; hai view công bố không có cột tên (Đ1), nên bài sổ dữ liệu «cột của view đúng sổ» cũng canh việc thêm cột tên vào view. Trong `catalog`, chỉ tệp nửa nghiêm mới đọc `name`, để trả DTO hiển thị và câu báo (R2-3 dưới).
  - (l3) **Dựa vào kỷ luật** (Điều 6.2; người kiểm độc lập soát): mã không so `name` đã đọc ra với chuỗi hằng để rẽ nhánh. Tên do người nhập nên không có danh sách để quét.
- (k) e2e dùng **đặc điểm riêng do bài tự tạo** (tên kèm dấu thời gian), cuối bài đóng mọi dòng gắn và kết thúc mọi luật đã tạo rồi tắt đặc điểm — vì D1 local dùng chung và các bảng chỉ thêm.

Mỗi hàng rào ghi vào `docs/SO-HANG-RAO.md` sau khi quan sát chặn thật một lần (sửa cố ý → đỏ → hoàn nguyên).

## Đếm quyết định chạm quyền / dữ liệu

| Điều | Chạm | Tính vào trần? |
|---|---|---|
| Đ1 | dữ liệu: ba bảng mới, hai view công bố, trigger | **có** |
| Đ2 | dữ liệu + luật: hai cột đặc điểm, `CHECK` kiểu phạm vi và trigger của `prc_sales_block`, cách xét mới | **có** |
| Đ3 | quyền: ô mới `catalog.attribute.assign`; route mới ở cổng văn phòng | **có** |
| Đ4 | không bảng, không cột, không ô; cổng giữ nguyên ADR-0146; cảnh báo giao diện + nhật ký | không |
| Đ5 | chỉ đọc, dùng ô của Đ3 | không |
| Đ6 | hàng rào chỉ siết | không |
| Lệch có chủ ý, hẹp, điều 5.2 (A-C4, đã duyệt) | không thêm dữ liệu ngoài Đ1; là **mục duyệt thêm** theo Điều 6.1 | không — đã duyệt riêng (A-C4) |

**Tổng: 3, đúng trần.** Không cần tách. Ngoài 3 quyết định, chủ duyệt thêm **một mục**: chỗ lệch có chủ ý điều 5.2 — **đã duyệt 30/10** (A-C4). Sửa khoá ngoại theo báo cáo kiểm A-1 dùng trigger, **không** nới hàng rào, nên không thêm mục duyệt. Bốn điều của ADR-0146 gốc đã được duyệt riêng ngày 28/10 (kèm phép vượt trần); lượt này không duyệt lại chúng.

Chủ đã chọn A-C2 = (a), nên trường hợp «C2 = (b) làm Đ4 thành điều chạm quyền, vượt trần» không xảy ra.

## Chỗ người soạn tự chọn (chủ sửa nếu sai)

- [người soạn] Đặc điểm một lựa chọn: mỗi dịch vụ một giá trị cho mỗi đặc điểm (không chọn nhiều).
- [người soạn] Mỗi luật bán một điều kiện đặc điểm.
- [người soạn] Tắt đặc điểm / giá trị chỉ khi không còn dòng gắn mở; bật lại được nhưng là cửa đổi kết quả luật có cảnh báo (Đ4 (d)), không làm «tắt một chiều».
- [người soạn] Câu báo 409 kèm tên đặc điểm và giá trị lấy từ dữ liệu.
- [người soạn] Danh sách «mới, đang theo nhóm» dùng mốc 14 ngày.
- [người soạn] Không đưa đặc điểm vào DTO form lập đơn ở lượt này (form không cần tự xét; bộ lọc danh mục đã đi qua hàm của `pricing`). Hiện đặc điểm cho nhân viên lúc lập đơn để trả lời khách: để sau.
- [người soạn] Hàng rào «người gắn ⊆ người đặt luật».

## Chủ đã chọn 30/10

Nguồn: `../00-dau-vao/QUYET-DINH-CHU-2026-10-30-LUOT-4-LUAT-BAN-CHUNG.md`. Lời chủ nguyên văn cho cả bảng này: «ôk tôi đồng ý» (trả lời ba câu người ghi hỏi — L4-1, L4-2, L4-3 — cùng bốn câu C1–C4 của bản trước). Câu L4-0 nguyên văn: «không phải là chặn Hòn Tằm, đó hãy coi như là 1 ca vàng thôi, 1 ví dụ . Ý của tôi có thể hiểu rộng là : Cho phép đặt/không cho phép đặt dịch vụ cụ thể với vai trò cụ thể (ví dụ: lễ tân khách sạn không thể đặt dịch vụ nào của Hòn Tằm mà không gồm vận chuyển từ đất liền ra đảo và ngược lại ), bạn hiểu ý tôi chứ». Cột «Đã chọn» là cách người ghi chép ghi lại, không phải lời chủ.

| Mã | Câu đã hỏi | Đã chọn | Áp ở |
|---|---|---|---|
| L4-0 | Yêu cầu là chặn Hòn Tằm hay khả năng chung? | **Khả năng chung**: loại đối tác bất kỳ × dịch vụ / nhóm / đặc điểm (kèm nhóm tuỳ chọn) × hiệu lực, nhập trên bảng điều khiển. Hòn Tằm là ca vàng | tiêu đề, tóm tắt, Đ2, «Ca vàng» |
| L4-1 | «Cho phép / không cho phép» nghĩa là gì? | **(a)**: mặc định mọi loại đặt được mọi dịch vụ; chỉ có quy tắc «không cho phép»; cho phép lại = kết thúc quy tắc. Không danh sách trắng; không ngoại lệ «chặn nhóm trừ một vé» (giữ ADR-0146 Đ1) | Đ2 |
| L4-2 | «Và ngược lại» nghĩa là (i) chiều đảo → đất liền, hay (ii) quy tắc ngược? | **Chưa chọn.** Cả hai nghĩa là dữ liệu, mô hình không phụ thuộc; ca vàng phủ cả hai (CV-4, CV-5) | «Ca vàng» |
| L4-3 | Áp theo loại đối tác hay theo từng hồ sơ? | **Theo loại đối tác**; theo hồ sơ cụ thể làm sau bằng ADR nhỏ | Đ2 |
| A-C1 | Ai đặt giá trị đặc điểm cho cả một nhóm? | **(a)** chỉ Quản trị, Toàn quyền | Đ3 |
| A-C2 | Bán hàng đổi giá trị của vé đang bị luật trỏ tới? | **(a)** được, có cảnh báo và nhật ký | Đ4 |
| A-C3 | Đặc điểm đầu tiên tạo thế nào? | **(a)** Quản trị tự nhập trên màn; không gieo bằng migration | Đ1 |
| A-C4 | Duyệt lệch có chủ ý, hẹp, Hiến chương điều 5.2? | **(a)** duyệt, kèm năm giới hạn ở Đ1: (1) đặc điểm, giá trị là dòng có kiểu, có khoá; (2) không chữ tự do, không JSON; (3) chỉ làm điều kiện của luật đã có ADR, dùng cho tiền phải có ADR riêng; (4) mã không rẽ nhánh theo đặc điểm cụ thể (một phần có bài kiểm máy, phần còn lại dựa vào kỷ luật — Đ6 (l)); (5) bảng gắn có hiệu lực theo thời gian và nhật ký, hai bảng định nghĩa chỉ có cờ bật/tắt, không có ngày hiệu lực | Đ1, Đ6 |

## Ca vàng (ví dụ — dữ liệu nhập trên màn, không phải mã)

Mỗi ca là một bộ dữ liệu nhập trên bảng điều khiển và kết quả đúng. Tên loại, nhóm, đặc điểm dưới đây là **ví dụ**; bài kiểm dựng bằng dữ liệu tự tạo (tiêu chí nghiệm thu ghi số ca tương ứng). Ca vàng ở đây **không chạm tiền**.

| Ca | Dữ liệu trên màn | Kết quả đúng |
|---|---|---|
| **CV-1** Chặn một vé | Luật: Tài xế taxi × `SERVICE` = vé A | Bên đặt mang loại Tài xế taxi: vé A không có trong danh mục của Đối tác, lập / lưu / gửi đơn có vé A nhận 409 `sales_blocked`. Vé khác cùng nhóm đặt được. Bên đặt loại khác đặt được vé A |
| **CV-2** Chặn cả nhóm | Luật: Công ty lữ hành × `GROUP` = nhóm N | Mọi vé đang thuộc nhóm N bị chặn cho Công ty lữ hành. Chuyển một vé ra khỏi N (gán nhóm) ⇒ vé đó thôi bị chặn (cửa đổi kết quả, Đ4 (c)) |
| **CV-3** Đặc điểm kèm nhóm (ca của chủ) | Đặc điểm «Vận chuyển cảng–đảo» = {Gồm, Không gồm}. Nhóm Hòn Tằm gắn chung «Không gồm»; vé H1 đặt riêng «Gồm». Hai luật: Lễ tân khách sạn × `ATTRIBUTE`(nhóm Hòn Tằm, Vận chuyển cảng–đảo = Không gồm); Tài xế taxi × cùng phạm vi | Lễ tân khách sạn và Tài xế taxi không đặt được mọi vé Hòn Tằm «Không gồm» (kể cả vé mới vào nhóm, thừa hưởng «Không gồm»); **đặt được H1** (riêng thắng chung). Vé «Không gồm» **ngoài** nhóm Hòn Tằm không bị hai luật này chặn |
| **CV-4** «Và ngược lại» nghĩa (i): đặc điểm ba giá trị | **Bộ dữ liệu thay cho CV-3** nếu chủ chọn nghĩa (i), không cộng thêm vào CV-3 (tên đặc điểm chỉ được trùng giữa các đặc điểm đã tắt — Đ1). Cách làm trên màn: thêm giá trị «Một chiều» vào đặc điểm «Vận chuyển cảng–đảo» có sẵn, và (nếu muốn) đổi tên «Gồm» thành «Khứ hồi» — đổi tên giá trị đang bị luật trỏ tới thì màn cảnh báo (Đ4 mục 4); mã không đổi. Kết quả: «Vận chuyển cảng–đảo» = {Khứ hồi, Một chiều, Không gồm}. Hai luật cho Lễ tân khách sạn: `ATTRIBUTE`(nhóm Hòn Tằm, = Một chiều) và `ATTRIBUTE`(nhóm Hòn Tằm, = Không gồm) — mỗi luật một giá trị (Đ2) | Vé «Khứ hồi» đặt được; vé «Một chiều» và «Không gồm» bị chặn cho Lễ tân khách sạn |
| **CV-5** «Và ngược lại» nghĩa (ii): quy tắc ngược | Thêm cho một loại khác, ví dụ Công ty lữ hành: `ATTRIBUTE`(nhóm Hòn Tằm, Vận chuyển cảng–đảo = Gồm) | Công ty lữ hành không đặt được vé «Gồm», đặt được vé «Không gồm»; Lễ tân khách sạn ngược lại (theo CV-3). Hai luật độc lập, cộng dồn kiểu «chặn thắng» |
| **CV-6** Vé chưa khai không bị chặn | Vé mới H9 từ Sheet, chưa gán nhóm, chưa có giá trị; luật CV-3 đang hiệu lực | H9 **không** bị chặn (Đ5); H9 có trong danh sách «chưa khai» của đặc điểm, số đếm ở menu tăng. Khai H9 = «Không gồm» và gán vào nhóm Hòn Tằm ⇒ H9 bị chặn từ lần lưu / gửi kế tiếp |
| **CV-7** Kết thúc luật thì đặt lại được | Kết thúc luật CV-1 (đặt ngày kết thúc) | Tài xế taxi đặt được vé A ngay; dòng luật cũ vẫn còn trong bảng (chỉ thêm, kết thúc thay cho xoá) |
| **CV-8** Đổi giá trị đặc điểm đổi kết quả | Bán hàng đổi vé H2 (trong nhóm Hòn Tằm) từ «Không gồm» sang «Gồm» khi luật CV-3 đang hiệu lực | Màn cảnh báo «sẽ bỏ chặn H2 cho Lễ tân khách sạn, Tài xế taxi»; lưu được, có nhật ký. Nháp có H2 của bên đặt Lễ tân lưu được. Đơn đã xác nhận trước đó không đổi. Đổi ngược lại ⇒ nháp chứa H2 bị 409 ở lần lưu kế tiếp |

## Tiêu chí nghiệm thu (viết trước; đỏ trước, xanh sau)

Đặt tên trong ví dụ: đặc điểm `X` có giá trị `x1`, `x2`; nhóm `G`; loại đối tác `L`. Mọi tên do bài tự tạo.

*Đặc điểm và gắn giá trị (Đ1, Đ3)*
1. Quản trị tạo đặc điểm `X` với hai giá trị: 201, có hai dòng nhật ký. Bán hàng, Kế toán, Đối tác, Thực tập, Nhân sự tạo đặc điểm: 403.
2. Bán hàng đặt `X = x1` cho dịch vụ `D`: 200, nhật ký ghi `D`, «chưa khai → x1». Kế toán, Đối tác, Thực tập, Nhân sự làm cùng việc: 403. Bán hàng đặt giá trị cho **nhóm**: 403 (A-C1).
3. Nhóm `G` có `X = x2`, dịch vụ `D` thuộc `G` không có dòng riêng ⇒ view trả `x2`, nguồn `GROUP`. Đặt riêng `D: X = x1` ⇒ view trả `x1`, nguồn `SERVICE`. Đóng dòng riêng ⇒ view trả lại `x2`.
4. Hai lệnh cùng đặt giá trị cho cùng `D`, cùng giá trị đang thấy: một lệnh 200, lệnh kia 409 `stale`; bảng có đúng một dòng mở.
5. CSDL từ chối: xoá dòng gắn; sửa cột khác ngoài việc đóng; đóng dòng đã đóng; chèn dòng có giá trị thuộc đặc điểm khác (trigger, không phải khoá ngoại hai cột); chèn dòng cho đặc điểm / giá trị / nhóm đang tắt; dòng có cả mã dịch vụ lẫn mã nhóm.
6. Tắt giá trị `x1` khi còn dịch vụ mang `x1`: 409 `attribute_in_use`. Đóng hết dòng rồi tắt: 200.
7. Đồng bộ Sheet (thêm, đổi, mất dịch vụ) không đổi dòng nào của ba bảng `ctl_attribute*`.

*Luật bán theo đặc điểm (Đ2)*

8. Luật `L` × `ATTRIBUTE(X = x1)`: Đối tác loại `L` không thấy `D` (mang `x1`) trong danh mục for-order; gọi thẳng lập đơn với `D`: 409 `sales_blocked`, không dòng nào được ghi. Dịch vụ mang `x2` vẫn đặt được.
9. Luật `L` × `ATTRIBUTE(G, X = x1)`: dịch vụ mang `x1` **ngoài** `G` đặt được; trong `G` bị chặn.
10. Ca vàng CV-3, dựng bằng dữ liệu bài tự tạo: nhóm có giá trị chung `x1`, một vé đặt riêng `x2`, luật `L` × `ATTRIBUTE(G, X = x1)` ⇒ vé đó đặt được, các vé còn lại của `G` bị chặn cho `L`.
10b. Ca vàng CV-4 và CV-5: đặc điểm ba giá trị `x1`, `x2`, `x3`; hai luật của `L` chặn `x2`, `x3` ⇒ vé `x1` đặt được, vé `x2`, `x3` bị chặn; luật của `L2` chặn `x1` ⇒ `L2` không đặt được vé `x1`, đặt được vé `x2`, `x3`; bên đặt mang **cả** `L` và `L2` ⇒ không đặt được vé `x1`, `x2`, `x3` (các luật cộng dồn, «chặn thắng»).
11. Văn phòng lập hộ, bên đặt mang `L`, dịch vụ mang `x1`: 409. Gửi xác nhận trên nháp như vậy: 409, không mở yêu cầu nào (chốt riêng). Còn vé trên đơn chờ có dịch vụ vừa được đổi sang `x1`: 409.
12. Dịch vụ **chưa khai** `X` (CV-6): luật `ATTRIBUTE(X = x1)` không chặn nó; nó có trong danh sách chưa khai của `X`.
12b. Kết thúc luật (CV-7): đặt lại được ngay; dòng luật cũ vẫn còn.
13. Thêm luật trỏ tới giá trị đang tắt, hoặc giá trị không thuộc đặc điểm ghi trên dòng: máy chủ 409; chèn thẳng vào CSDL: trigger từ chối. Chèn luật với kiểu phạm vi lạ: `CHECK` từ chối.
14. CSDL từ chối luật `ATTRIBUTE` thiếu giá trị, hoặc kèm mã dịch vụ; luật `SERVICE` kèm đặc điểm.

*Cửa đổi kết quả (Đ4)*

15. Đơn **đã xác nhận** có `D`; đổi `D` sang `x1` (đang bị chặn cho bên đặt của đơn): đơn không đổi, không có nhật ký trên đơn; sửa số khách sau xác nhận vẫn 200.
16. Nháp có `D`; đổi `D` sang `x1`: lần lưu kế tiếp 409 `sales_blocked` (CV-8).
17. Màn đặc điểm hiện cảnh báo khi đổi giá trị đang có luật trỏ tới (kịch bản Chrome; máy chủ không ép).
17b. Luật `L` × `ATTRIBUTE(X = x1)` còn hiệu lực; đóng mọi dòng gắn `x1`, tắt `x1` (200), rồi **bật lại** `x1` (200, có nhật ký) và gắn lại cho `D` ⇒ `D` lại bị chặn cho `L`. Màn bật lại hiện cảnh báo «còn 1 luật bán trỏ tới giá trị này» (kịch bản Chrome; máy chủ không ép).

*Danh sách chưa khai (Đ5)*

18. Đồng bộ Sheet thêm dịch vụ mới không thuộc nhóm nào có giá trị chung ⇒ dịch vụ có trong danh sách chưa khai của mọi đặc điểm, số đếm ở menu tăng. Dịch vụ ẩn hoặc đã rời Sheet không có trong danh sách.
19. Dịch vụ mới (`first_seen_at` hôm nay) thuộc nhóm có giá trị chung ⇒ không có trong danh sách chưa khai, **có** trong danh sách «mới, đang theo nhóm».

*Hàng rào (Đ6)*

20. Mỗi bài (e)–(j), (l1), (l2) quan sát đỏ thật một lần bằng sửa cố ý, rồi hoàn nguyên; ghi ngày vào `docs/SO-HANG-RAO.md`.

## Điều chưa chắc / chưa kiểm

- **Hiến chương 5.2:** lệch có chủ ý, hẹp — chủ đã duyệt 30/10 (A-C4). Lúc chép thành ADR, ghi chỗ lệch vào bảng thi hành của `docs/ARCHITECTURE.md` là việc của chủ (Điều 6.4; AI chỉ đề xuất).
- **Nghĩa của «ngày kết thúc» luật bán** (kế thừa ADR-0146 Đ1, Đ2 — báo cáo kiểm vòng 3, R3-3): là mốc giờ, hay ngày dân sự tính trọn / không tính trọn. Nếu tính trọn ngày thì kết thúc luật «hôm nay» vẫn chặn tới hết hôm nay, và chữ «ngay» ở CV-7, tiêu chí 12b không đúng. **Kế hoạch thi công ADR-0146 chốt** một nghĩa; tiêu chí 12b theo nghĩa đó.
- **«Và ngược lại» (L4-2):** chủ chưa chọn nghĩa. Mô hình làm được cả hai (CV-4, CV-5) bằng dữ liệu; không chặn thi công.
- **Lượt D (phụ thu):** nếu dùng đặc điểm làm điều kiện tiền, việc Bán hàng gắn giá trị sẽ đổi tiền. Lượt D phải xét lại ô `catalog.attribute.assign`, quyết chụp giá trị vào đơn (5.6) và có ca vàng. Lượt này **không** cho phép dùng đặc điểm cho tiền.
- **Lượt B (đóng bán):** có thể muốn phạm vi theo đặc điểm (ví dụ «Buffet = Có»). View ở Đ1 dùng lại được; lượt này không quyết.
- **Dữ liệu thật: chưa kiểm** (AI không đọc D1 thật): production có những vé nào của ca vàng CV-3 (vé nào gồm / không gồm vận chuyển cảng–đảo); đã có loại «Lễ tân khách sạn», «Tài xế taxi» chưa (hai lệnh đếm ở `../00-dau-vao/PHIEU-CHOT-TINH-TRANG-BAN-2026-10-30.md` mục C — chủ chạy).
- **Nhánh khác đang thi công ADR-0146: chưa kiểm** ngoài hai worktree trong máy.
- **Số bài kiểm đỏ khi thêm ô mới: chưa đo.** Ước theo lần đo ô `order.submit` ngày 25/10 (4 tệp: `permissions.test.ts`, `xem-don-theo-quyen.test.ts`, `tro-ly-cau-truc.test.ts`, `permission-enforcement.test.ts` — trang ghép 25/10 mục 6); người thi công đo lại.
- **Đổi tên giá trị** chỉ được cảnh báo, không chặn; người dùng cố ý đổi tên một giá trị thành chữ khác nghĩa thì máy không bắt được, chỉ nhật ký.
- **Tên bảng, view, ô quyền, mã lỗi** đều là tên tạm.
- Việc dịch vụ nhập tay (không mã) không bị luật nào phủ: giữ như ADR-0146.

## Đề xuất cho chủ duyệt sau (N9)

AI không tự sửa `src/CLAUDE.md` (Hiến pháp N9). Câu đề xuất nối vào dòng ngoại lệ «chỉ SIẾT thứ hai» mà ADR-0146 (mục Hệ quả) đã đề xuất, nguyên văn như trang ghép mục 7:

> «luật bán có thể khoanh theo đặc điểm dịch vụ (dữ liệu của `catalog`, đọc qua `v_ctl_service_attribute`); đặc điểm không phải điều kiện cho phép, không dùng cho tiền khi chưa có ADR».

Chủ duyệt thì người thi công thêm cùng lúc với dòng ngoại lệ của ADR-0146.
