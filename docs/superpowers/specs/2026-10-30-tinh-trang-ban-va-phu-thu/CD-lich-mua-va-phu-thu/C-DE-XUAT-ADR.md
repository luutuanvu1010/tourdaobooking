# Đề xuất ADR — Lượt C: Lịch mùa (ngày lễ theo luật + mùa kinh doanh) và điều kiện khả dụng theo mùa, thứ trong tuần, đặt trước tối thiểu, khung bán

- **Trạng thái:** đề xuất, **chưa duyệt**. AI soạn, không tự duyệt (Hiến pháp N3). **Số ADR lấy lúc chép vào `docs/adr/`**; số migration lấy lúc thi công.
- **Ngày:** 2026-10-30. **Bản sửa 1** (cùng ngày) theo báo cáo kiểm độc lập `../KIEM-C-D/BAO-CAO.md` (C-1 chặn; C-2, C-3, C-4 nên sửa; C-7…C-10 ghi nhận). **Bản sửa 2** (cùng ngày) theo mục «Vòng 2» của báo cáo đó: R2-C1 (chặn — đếm trần), R2-C2, R2-C3, R2-C4. **Loại:** việc lớn (dữ liệu, quyền, nới hàng rào). **Không chạm tiền.** Hồ sơ có ngày: duyệt xong thì không sửa tệp này.
- **Người soạn / vai:** lập kế hoạch (P15). Đọc mã ở worktree `.claude/worktrees/tinh-trang-ban`, nhánh `claude/tinh-trang-ban-va-phu-thu`, HEAD `a129d3d`.
- **Chia hai lượt duyệt (mặc định, bản sửa 2)** — vì «nới cạnh kiến trúc» **tính vào trần** theo tiền lệ chủ duyệt 30/9 (`docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:81-82`, nguyên văn: «Tính: mục 1 (nới cạnh kiến trúc — dữ liệu), mục 2 …, mục 3 … ⇒ 3 = đúng trần»):
  - **Lượt C1 — Lịch mùa:** Đ1 (phân hệ, dữ liệu mùa) + Đ2a (thao tác `season.write`) + nới cạnh **`pricing → lich-mua`** ⇒ **3**. Đ3 (gợi ý âm lịch) đi cùng C1, không tính.
  - **Lượt C2 — Điều kiện bán:** Đ4 (bảng điều kiện con) + Đ2b (thao tác `catalog.sale.condition.write`) + nới cạnh **`catalog → lich-mua`** ⇒ **3**. C2 duyệt sau C1 (cần bảng mùa) và sau khi B được duyệt (cần bảng `ctl_sale_suspension`).
  - Phương án thay thế: duyệt C1 + C2 **một lượt** (6 điều) với câu «cho vượt trần» của chủ, như tiền lệ ADR-0146 (25/10, 28/10). Câu C-Q5.
- **Đi cùng:** `C-TRANG-GHEP.md` (bắt buộc, `CLAUDE.md` §9) — một trang có phần riêng cho C1 và C2, theo khuôn trang ghép 25/10 (một trang cho hai lượt). Lượt D (`D-DE-XUAT-ADR.md`) **dựa trên** C1.
- **Dựa trên lượt B** (`../B-dong-ban/DE-XUAT-ADR.md`, bản đọc ngày 30/10 — đang được sửa song song; tên dưới đây lấy từ bản đó, người chép đối chiếu lại khi B duyệt):
  - bảng **`ctl_sale_suspension`** ở `catalog` (B Đ1), phạm vi `SERVICE` / `GROUP`;
  - luật thuần **`src/shared/dong-ban.ts`**, hàm công bố **`dongBanTrung`**, **`dongBanChoForm`** của `catalog` (B Đ2);
  - hàm cổng chung **`congBanDuoc`** ở `orders`, mã lỗi **`sale_suspended`** (B Đ3);
  - trường **`tamNgung`** của DTO danh mục lập đơn (B Đ4);
  - ô **`catalog.sale.suspend`** (Bán hàng, Quản trị, Toàn quyền) và **`catalog.sale.resume`** (Quản trị, Toàn quyền) (B Đ5);
  - tin «Tạm ngừng bán» là hình chiếu lúc đọc (B Đ6).
- **Quan hệ với ADR cũ:**
  - **giữ** ADR-0021 (một ngày đi cho cả đơn); ADR-0136 (không thêm điều kiện mùa vào cờ cần xác nhận);
  - **giữ** ADR-0146 (chặn theo loại đối tác; lượt A đang sửa) — lượt này **không** thêm điều kiện mùa vào luật 0146;
  - **theo khuôn** ADR-0147 Đ2 (điều kiện là dòng *(khoá, giá trị)*, khoá lấy từ bảng tra cứu có khoá ngoại, mỗi khoá một bộ tính trong một danh sách đăng ký ở mã, bài kiểm hai danh sách khớp).
- **Hiến chương áp:** 2.2, 5.2 (không JSON tự do), 5.3 (module mới nghiêm, đọc xuyên qua view), 5.5, 5.12, K10/K11.
- **Nới hàng rào đã duyệt (Hiến pháp Điều 9.4) — phải duyệt đích danh, tính vào trần:** thêm cạnh vào `ALLOWED_EDGES` (`src/architecture.test.ts:20-60`): **`pricing → lich-mua`** (lượt C1) và **`catalog → lich-mua`** (lượt C2). Chi tiết ở Đ1.1.
- **Xây trên lỗ đang hở:** **không**. Lượt này không chạm tiền, sổ hay Cron. Đã đọc `docs/quyen-hoan.json` ngày 30/10: sáu mục HIGH đang mở (TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2), không mục nào nằm trên đường của lượt C. Migration chỉ thêm bảng (HC-5.19).

## Lời chủ (nguyên văn, không hỏi lại)

- 30/10, lượt 1: «xem lại chỗ "Chặn hòn tằm" là thế nào? , ở đây chúng ta cố gắng coi logic nghiệp vụ là dữ liệu nhé, tức phải nhập tay thủ công hoặc biến nó thành tùy chọn /thao tác trong bảng điều khiển chứ không được khóa cứng trong code (tôi cực kỳ tán thành ) . ngoài ra tôi cơ bản đồng ý theo khuyến nghị của bạn.»
- 30/10 (yêu cầu gốc): «quản lý Availability, Seasonal pricing (thường là các ngày nghỉ lớn trong năm với các ngày lễ được nghỉ theo luật lao động) của từng Danh mục dịch vụ và/hoặc dịch vụ cụ thể theo từng vai đối tác (ví dụ như công ty du lịch), và độ khả dụng của từng danh mục hoặc dịch vụ theo thời gian»
- 30/10, câu chốt: «ok chốt , bạn có muốn hỏi thêm gì cho tôi hay không hoặc những lưu ý nào hay không»

**Đã chốt áp cho lượt này** (`00-dau-vao/QUYET-DINH-CHU-2026-10-30-TINH-TRANG-BAN-VA-GIA-MUA.md`):
- L1: hai lớp (lễ theo luật + mùa kinh doanh).
- L2: lễ theo lịch Nhà nước công bố hằng năm; Nền tảng gợi ý trước, Quản trị xác nhận.
- L3: Quản trị, Toàn quyền quản lịch mùa.
- K1: khả dụng thêm thứ trong tuần, đặt trước tối thiểu, khung bán theo mùa (số khách tối thiểu/tối đa để sau).
- G3: mùa theo **ngày đi**.
- B2: Bán hàng chỉ đóng; mở lại do Quản trị, Toàn quyền.
- B7: lý do bắt buộc.
- Nguyên tắc lượt 3: mã chỉ giữ bộ máy chung, tập loại điều kiện/hiệu ứng đóng, rào an toàn; **không tên dịch vụ, nhóm, loại đối tác, ngày lễ nào trong mã**.

## Hiện trạng (đã kiểm trong mã)

| Điều | Bằng chứng |
|---|---|
| Nền tảng **chưa có** khái niệm mùa, ngày lễ, âm lịch | `grep -ril "âm lịch\|lunar\|holiday"` trên `src/`, `web/`, `scripts/`: rỗng. Migration lớn nhất `0127_dua_don_theo_dich_vu.sql` |
| Kho không có dependency runtime | `CLAUDE.md` §1; `package.json` không có khoá `dependencies` |
| Ngày đi lưu **theo từng dịch vụ**, máy chủ ép một ngày cho cả đơn khi lập/sửa | `migrations/0008_order_service.sql:17`; `src/modules/orders/rules.ts:153`, `service-rules.ts:366` (`src/shared/trip-rules.ts:12-30`). Đơn cũ trước 1.11 có thể lệch ngày (`trip-rules.ts:18-20`) |
| Ngày đi đổi được trên nháp **và** đơn đã xác nhận qua `PUT /api/orders/:id/trip`; Còn vé cũng đổi được ngày đi trong lô xác nhận | `orders/index.ts:1289-1344`; `xac-nhan-route.ts:263-268`, `:313-316` |
| Khuôn «điều kiện (khoá, giá trị) + bảng tra cứu + danh sách đăng ký» mới ở mức ADR, chưa có mã | ADR-0147 Đ2 (accepted 28/10, chưa thi công) |
| Đồ thị phụ thuộc do bài máy canh: `catalog: ["audit"]`, `orders: [… "catalog" …, "pricing"]`, `pricing: ["parties", "catalog", "audit"]` | `src/architecture.test.ts:33`, `:54`, `:57` |
| Bảng mang tiền tố `ctl_` phải thuộc `catalog` | `src/architecture.test.ts:212` (dẫn ở B dòng 75) |
| Ô quyền Quản trị + Toàn quyền có sẵn: `admin.manage` | `src/shared/permissions.ts:185` — **không dùng** (Đ2) |
| Hiệu ứng «chặn bán» theo thời gian: **chưa có trong mã**; đã có **đề xuất B** (tên ở dòng đầu tệp) | `../B-dong-ban/DE-XUAT-ADR.md` Đ1–Đ6 |

## Tóm tắt cho chủ (lời thường)

1. Nền tảng có màn **Lịch mùa**. Mỗi mùa có tên, loại («Lễ theo luật» hoặc «Mùa kinh doanh»), **độ ưu tiên**, và các **khoảng ngày theo từng năm** (ví dụ Tết 2027: 05/02–09/02).
2. Với ngày lễ theo luật, Nền tảng **tự gợi ý** ngày chính lễ của năm sau, tính cả âm lịch (Tết, Giỗ Tổ). Quản trị hoặc Toàn quyền sửa theo thông báo nghỉ chính thức (nghỉ bù, hoán đổi) rồi bấm **Xác nhận**. Chưa xác nhận thì ngày đó **không** được coi là mùa.
3. Danh sách ngày lễ là **dữ liệu**: thêm ngày lễ mới (như 24/11) là thêm một dòng trên màn hình, không sửa mã.
4. Hai mùa **cùng ưu tiên** không được chồng ngày (máy chặn). Nơi cần chọn **một** mùa (phụ thu ở lượt D) thì mùa ưu tiên cao hơn thắng.
5. Ở màn «Tình trạng bán» của lượt B, Quản trị/Toàn quyền đặt thêm được **điều kiện bán thường trực**:
   - chỉ chạy các thứ đã chọn;
   - phải đặt trước tối thiểu N ngày;
   - không bán trong mùa X;
   - chỉ bán cho ngày đi trong khung từ–đến.

   Gặp điều kiện thì dịch vụ **tạm ngừng bán** đúng như lượt B: hiện mờ kèm lý do, máy chủ chặn.

## Quyết định

### Đ1 — Phân hệ lịch mùa và dữ liệu mùa (DỮ LIỆU; kèm một mục nới hàng rào)

1. **Phân hệ mới, nghiêm, lá** [người soạn]: tên tạm `lich-mua`, tiền tố bảng tạm `lm_`, chỉ phụ thuộc `["audit"]`, xếp vào `STRICT` (`defineSql`, câu tĩnh, EXPLAIN).
   - Công bố hai view chỉ đọc: `v_lm_season` (mã, tên, loại, ưu tiên, còn dùng) và `v_lm_season_day_range` (mã mùa, từ ngày, đến ngày — **chỉ khoảng đã xác nhận, chưa kết thúc**).
   - Công bố hàm thuần ở `src/shared/` (tên tạm `src/shared/lich-mua.ts`): «ngày D thuộc những mùa nào», «mùa nào thắng tại D».
   - **Nới hàng rào (Điều 9.4), chủ duyệt đích danh — hai cạnh mới, không cạnh nào khác, mỗi cạnh ở một lượt:**
     - **`pricing → lich-mua`** (lượt **C1**): cho lượt D (phụ thu) — khoá ngoại `prc_surcharge_rule.season_code → lm_season` và `pricing` đọc `v_lm_season_day_range`. Bài kiến trúc đòi khoá ngoại xuyên phân hệ đi đúng chiều cạnh (`src/architecture.test.ts:334`, người kiểm vòng 2 đã mở). Phương án không cần cạnh: bỏ khoá ngoại, để gốc lắp ráp tiêm danh sách khoảng mùa (khuôn `ctx.mocToiThieu`); bị bác vì mất ràng buộc CSDL cho mã mùa.
     - **`catalog → lich-mua`** (lượt **C2**): `catalog` đọc `v_lm_season_day_range` để bộ tính điều kiện trong `dongBanTrung` (cổng) và `dongBanChoForm` (DTO `tamNgung`, tin «Tạm ngừng bán») biết khoảng mùa. `catalog` là phân hệ `LEGACY`, nên câu SQL đọc view này nằm ở **tệp nửa nghiêm** của B (`catalog/dong-ban-repo.ts`, B Đ1 «Hệ quả»).
     - **Không cần `orders → lich-mua`**: `congBanDuoc` (ở `orders`) gọi `catalog.dongBanTrung` qua cạnh `orders → catalog` có sẵn, và việc tính điều kiện nằm trọn trong `catalog`.
     - `lich-mua` chỉ phụ thuộc `audit`, nên không thể sinh vòng (bài «đồ thị không có vòng» canh).
   - **Đếm vào trần: CÓ** (bản sửa 2). Tiền lệ chủ duyệt 30/9 (`docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:81-82`) tính «nới cạnh kiến trúc» là một quyết định chạm dữ liệu. Bản sửa 1 viết «không tính» và dẫn ghi nhận C-5 của người kiểm vòng 1; người kiểm đã rút lại ghi nhận đó ở vòng 2 (R2-C1). Vì vậy lượt C tách mặc định thành C1 và C2 (dòng đầu tệp).
2. **Bảng mùa** `lm_season` (bảng tra cứu, khoá `code TEXT`):
   - `code`, `name`, `priority INTEGER NOT NULL` (số lớn hơn thắng), `active` (0 = ngưng, một chiều).
   - `kind`: tập đóng ở mã, `LE_LUAT` / `KINH_DOANH`. Kiểm ở **mã**, không `CHECK` liệt kê, theo `src/CLAUDE.md` «Dữ liệu».
   - **Quy tắc gợi ý** (chỉ cho `LE_LUAT`, xem Đ3): `goi_y_lich` (`DUONG` / `AM` / NULL), `goi_y_thang`, `goi_y_ngay`, `goi_y_lech_ngay` (có thể âm), `goi_y_so_ngay`.
   - Dấu vết `created_at/by`, `updated_at/by`.
   - Đổi tên / ưu tiên: `UPDATE` có khoá lạc quan + nhật ký trước→sau [người soạn]. Đây là bảng tra cứu như `ctl_group`, không mang số tiền. **Hệ quả cho lượt D:** dòng phụ thu truy được quy tắc và tên mùa đã chụp, nhưng **không** truy được độ ưu tiên tại lúc tính. Muốn biết, phải đọc nhật ký `season_updated` (báo cáo kiểm C-7).
   - Đổi ưu tiên bị **từ chối** khi làm hai mùa cùng ưu tiên có khoảng đang hiệu lực chồng nhau.
3. **Bảng khoảng ngày** `lm_season_range` — **chỉ thêm**:
   - `id`, `season_code` (khoá ngoại), `date_from`, `date_to` (`YYYY-MM-DD`, `CHECK date_from <= date_to`).
   - `source` (`GOI_Y` / `NHAP_TAY`), `confirmed_at`, `confirmed_by` (bắt buộc).
   - `ended_at`, `ended_by`, `end_reason` (đặt **một lần**), `note`.
   - **Không có trạng thái «gợi ý» trong CSDL** [người soạn]: gợi ý tính lúc mở màn (Đ3); chỉ khoảng **đã xác nhận** mới được ghi.
   - Trigger: cấm `DELETE`; cấm `UPDATE` trừ đặt `ended_*` một lần. «Sửa» = kết thúc + thêm, trong **một** `db.batch`.
4. **Bất biến chồng ngày**, hai lớp:
   - Hai khoảng đang hiệu lực của hai mùa **cùng `priority`** không được giao nhau; một mùa không có hai khoảng giao nhau.
   - Lớp CSDL: trigger trên `lm_season_range` đọc chính bảng `lm_*` (5.3). Lớp mã: hàm thuần kiểm trước, trả câu tiếng Việt nêu tên mùa và khoảng bị chồng.
   - Khác ưu tiên thì được chồng.
5. **Ngày D thuộc mùa M** ⇔ có khoảng đang hiệu lực của M chứa D. «Mùa thắng tại D» = mùa có `priority` lớn nhất trong các mùa chứa D. Mã chỉ có hai hàm này; không hàm nào biết tên mùa.
6. **Gieo dữ liệu ban đầu** [người soạn]. Gieo bằng migration, là dữ liệu và sửa được trên màn hình. Theo Bộ luật Lao động 2019 Điều 112 và Nghị quyết 28/2026/QH16; theo đầu vào chủ đã chốt, **người soạn chưa tự kiểm văn bản luật**. Các mùa `LE_LUAT`:

| Mùa | Lịch | Neo | Lệch | Số ngày |
|---|---|---|---:|---:|
| Tết Dương lịch | dương | 1/1 | 0 | 1 |
| Tết Nguyên đán | âm | 1/1 | −1 | 5 |
| Giỗ Tổ Hùng Vương | âm | 10/3 | 0 | 1 |
| 30/4 | dương | 30/4 | 0 | 1 |
| 1/5 | dương | 1/5 | 0 | 1 |
| Quốc khánh | dương | 2/9 | −1 | 2 (ngày liền kề Nhà nước chọn hằng năm; Quản trị sửa) |
| Ngày Văn hóa Việt Nam | dương | 24/11 | 0 | 1 |

   - Mọi mùa lễ gieo ưu tiên 50.
   - **Không gieo** mùa kinh doanh và **không gieo khoảng ngày nào**.

### Đ2 — Quyền trên lịch mùa (Đ2a, lượt C1) và trên điều kiện bán thường trực (Đ2b, lượt C2) (QUYỀN)

Bản sửa 1: bỏ việc mở rộng nghĩa `admin.manage` (báo cáo kiểm C-2; B cũng bác dùng ô này vì nó gom quá nhiều việc). Bản sửa 2: tách thành Đ2a / Đ2b theo hai lượt.

1. **Hai thao tác mới** (thao tác, **không** phải mã quyền mới, nên không nhân đôi bài tập con quyền), tên tạm. Cả hai cấp phạm vi `any` cho ADMIN và SUPER_ADMIN (Quản trị, Toàn quyền — đúng L3); các quyền còn lại `none`:
   - **Đ2a — `season.write`** (lượt C1): thêm/sửa mùa, xác nhận khoảng ngày, kết thúc khoảng.
   - **Đ2b — `catalog.sale.condition.write`** (lượt C2): thêm và kết thúc một lần đóng **có điều kiện** (Đ4).
   - Lý do không dùng `catalog.sale.resume` cho Đ2b: tên ô nói «mở lại», còn ở đây là «đặt luật thường trực». Hai việc cùng tập người nhưng khác nghĩa; tách hôm nay rẻ hơn tách sau.
2. **Phân việc với các ô của B** (lượt C2; các hành vi đặt lên route của B được gom lại ở mục «Bổ sung cho lượt B» dưới Đ4):
   - Lần đóng **trơn** (không có dòng điều kiện): giữ nguyên ô của B — đóng bằng `catalog.sale.suspend` (Bán hàng cũng đóng được), mở lại bằng `catalog.sale.resume`.
   - Lần đóng **có điều kiện**: tạo **và** kết thúc chỉ bằng `catalog.sale.condition.write`.
   - Route mở lại của B **từ chối** (409, câu «dùng màn Điều kiện bán») khi lần đóng có dòng điều kiện. Như vậy Bán hàng không thêm, không gỡ được điều kiện thường trực, và một ô của B không đổi nghĩa.
3. **Đọc** lịch mùa: route cổng `office` (mọi tài khoản văn phòng). Đối tác, Thực tập, Tài xế, Nhân sự **không** có route đọc lịch; họ chỉ thấy hệ quả: dịch vụ mờ «Tạm ngừng bán» kèm lý do (B Đ4), dòng phụ thu (D).
4. **Nhật ký** (tên tạm, khai ở `src/shared/audit-actions.ts`), chỉ mã, tên mùa, ngày, không thông tin cá nhân (5.12):
   - `season_created`, `season_updated` (trước→sau), `season_range_confirmed`, `season_range_ended`;
   - lần đóng có điều kiện dùng **hành động của B** (`catalog_sale_suspended`, `catalog_sale_resumed`), `detail` thêm mã khoá điều kiện. Không thêm hành động mới.

### Đ3 — Gợi ý ngày lễ, kể cả âm lịch (không chạm quyền/dữ liệu riêng — dữ liệu gợi ý là cột của Đ1)

1. **Ngày lễ nào có, neo ngày nào: là dữ liệu** (cột `goi_y_*` của `lm_season`). Mã chỉ biết hai loại lịch `DUONG`, `AM` (tập đóng, đổi bằng ADR).
2. **Đổi âm lịch → dương lịch: thuật toán thuần, có test** [người soạn, khuyến nghị].
   - Một tệp `src/shared/am-lich.ts` (tên tạm) cài thuật toán thiên văn công khai của Hồ Ngọc Đức, **theo múi giờ +7**.
   - Không thư viện, không I/O; dùng chung máy chủ và màn hình.
   - **Test**: bảng đối chiếu mùng 1 Tết và 10/3 âm cho nhiều năm, **do người xác nhận từ nguồn chính thức**. Trước khi có người xác nhận, bài để `todo` có tên.
   - Người soạn đã chạy thử bản nháp ngoài kho và so với trí nhớ của mình. Khớp: Tết 10/02/2024, 29/01/2025, 17/02/2026; Giỗ Tổ 18/04/2024, 07/04/2025. Bản nháp cho: Tết 2027 = 06/02/2027, 2028 = 26/01/2028; Giỗ Tổ 2026 = 26/04/2026, 2027 = 16/04/2027. **Chưa kiểm với nguồn chính thức.**
   - Lỗi thuật toán không gây hại im lặng: mọi gợi ý phải qua người xác nhận.
3. **Màn «Lịch mùa»** cho năm Y:
   - Với mỗi mùa `LE_LUAT` chưa có khoảng nào giao năm Y, hiện gợi ý `[neo + lệch, neo + lệch + số ngày − 1]`.
   - Người dùng sửa rồi bấm Xác nhận ⇒ một dòng `source = GOI_Y`.
4. **Nhắc** [người soạn; bề mặt; mốc **hằng trong mã**, đổi bằng mã]: từ 1/10 năm Y−1, Trang chủ của người giữ `season.write` có thẻ «Lịch lễ năm Y: còn N ngày lễ chưa xác nhận». Lượt D thêm cảnh báo cho mùa có quy tắc phụ thu mà chưa có khoảng ngày.

### Đ4 — Điều kiện bán thường trực, gắn vào «lần đóng» của lượt B (DỮ LIỆU — lượt C2)

**Chỉ định nghĩa phần ĐIỀU KIỆN.** Những phần sau thuộc lượt B, lượt C không định nghĩa lại:
- hiệu ứng (tạm ngừng bán);
- tám cửa và thứ tự xét trong `congBanDuoc` (B Đ3 (b), (c));
- mã `sale_suspended`;
- hiển thị mờ `tamNgung`;
- tin «Tạm ngừng bán».

1. **Một luật có điều kiện = một dòng `ctl_sale_suspension` của B + các dòng điều kiện con:**
   - **Bảng con mới của `catalog`** (tên tạm `ctl_sale_suspension_condition`):
     - `id`; `suspension_id` (khoá ngoại → `ctl_sale_suspension.id`); `condition_code` (khoá ngoại → bảng tra cứu `ctl_sale_condition_kind.code`);
     - **cột giá trị có kiểu** theo khoá: `season_code`, `weekdays_blocked` (số 7 bit), `min_days`, `window_from`, `window_to`;
     - `CHECK` hình dạng theo khoá (đúng các cột của khoá có giá trị); không JSON (5.2);
     - dấu vết `created_at/by`.
   - **Chỉ thêm**, trigger cấm xoá và sửa. Muốn đổi điều kiện thì kết thúc lần đóng (cột mở lại `reopened_*` của B) rồi tạo lần mới.
   - **«Điều kiện chỉ chèn cùng lô với dòng cha» — dạng kiểm được ở CSDL** (bản sửa 2, R2-C2; trigger không thấy được «lô», nên kiểm bằng **mốc chung** của lô): trigger `BEFORE INSERT ON ctl_sale_suspension_condition` từ chối khi:
     - dòng cha không tồn tại; hoặc
     - dòng cha đã mở lại (`reopened_at IS NOT NULL`); hoặc
     - `NEW.created_at <> cha.created_at` hoặc `NEW.created_by IS NOT cha.created_by` (dòng con phải mang **đúng mốc `at` và người** của lô tạo dòng cha).
   - Lớp mã: route tạo dòng cha và dòng con trong **một** `db.batch` với **một** mốc `at` (khuôn «MỘT mốc mỗi request»). Lô tạo lần đóng của B phải ghi `created_at` bằng đúng mốc đó (kế hoạch thi công B đối chiếu).
   - Nhờ vậy, một lần đóng **trơn** do Bán hàng tạo không thể bị gắn điều kiện về sau, kể cả bằng SQL chạy tay. Nếu gắn được, ô quyền áp cho dòng đó sẽ đổi từ `catalog.sale.resume` sang `catalog.sale.condition.write` mà không ai duyệt.
   - Giới hạn (lưới chống nhầm/quên, không chống cố ý lách — khuôn ghi giới hạn của các hàng rào khác):
     - hai lô khác nhau cùng người, cùng mốc mili-giây thì trigger không phân biệt được (dựa vào `nextStamp` / mốc request, coi như không xảy ra);
     - SQL chạy tay **cố ý** chép đúng `created_at` / `created_by` của dòng cha vẫn qua trigger.
   - Ràng buộc lên phần thi công B: lô đóng của B ghi `created_at` = mốc `at` của request (dòng **B+6** dưới đây); nếu không, trigger của C chặn nhầm lô hợp lệ.
   - Lần đóng **khớp** khi các vế của B (phạm vi, hiệu lực, khoảng ngày đi của chính dòng đó) **và mọi** điều kiện con đều đúng (VÀ). Không có điều kiện con = lần đóng trơn của B, không đổi gì.
   - **Kế thừa B7:** dòng cha mang `reason` bắt buộc (1–200 ký tự) như mọi lần đóng. Màn «Điều kiện bán» gợi ý câu lý do theo khoá (ví dụ «Không chạy thứ Tư»), người đặt sửa được. Lý do hiện cho Đối tác (B Đ4 «Hệ quả»).
2. **Tập khoá điều kiện lượt này** (đóng, đổi bằng ADR). Mỗi khoá có một bộ tính thuần đặt trong **`src/shared/dong-ban.ts`** của B. Một danh sách đăng ký; bài kiểm bắt danh sách mã ↔ bảng tra cứu khớp:

| Khoá (tên tạm) | Giá trị | Đúng khi | Ví dụ dữ liệu (không có trong mã) |
|---|---|---|---|
| `NGAY_DI_TRONG_MUA` | `season_code` | ngày đi ∈ mùa đó (Đ1.5; **không xét ưu tiên**) | «Không bán vé X trong mùa Tết» |
| `THU_TRONG_TUAN` | `weekdays_blocked` | thứ của ngày đi (lịch VN) ∈ tập | Tour chạy thứ Ba, thứ Năm ⇒ màn chọn «chạy thứ 3, 5», lưu tập **bù** |
| `DAT_TRUOC_DUOI` | `min_days` (≥ 1) | (ngày đi − ngày VN của mốc request) < N | «Phải đặt trước 1 ngày» |
| `NGAY_DI_NGOAI_KHUNG` | `window_from`, `window_to` | ngày đi < từ **hoặc** > đến | «Chỉ bán cho ngày đi 01/05–31/08» |

   - **Chỉ có điều kiện dẫn tới chặn**; không dòng nào nghĩa «cho phép» (giữ B Đ1, ADR-0005, ADR-0146). «Chỉ chạy thứ…», «chỉ bán trong khung…» chỉ là **cách hiển thị** của điều kiện chặn phần bù.
   - **Đặt trước tính theo ngày dân sự** [người soạn]: `depart_time` có thể trống (`migrations/0008_order_service.sql:18`). Mốc là **mốc của request** mà B truyền vào cổng (B Đ2 «Đồng hồ», `nowMs` một lần mỗi request), nên nháp lưu sớm vẫn bị chặn nếu tới lúc xác nhận đã quá hạn. Câu C-Q3.
   - Dòng chưa có ngày đi (nháp): mọi điều kiện của C **không** trúng. Theo B Đ2, nháp chưa ngày chỉ trúng lần đóng «mọi ngày đi» **không** điều kiện.
   - **Còn vé kèm `ngayDi`**: B xét cả ngày đã lưu lẫn ngày mới (B Đ3 (a)); các điều kiện của C được xét theo đúng hai ngày đó.
   - **Đơn đã xác nhận không bị xét lại**, trừ khi đổi ngày đi (cửa 3 của B).
3. **Đọc khoảng mùa** — đặt trong `catalog`, qua cạnh mới:
   - `dongBanTrung` và `dongBanChoForm` (của B) đọc `v_lm_season_day_range` qua cạnh mới `catalog → lich-mua`, rồi truyền danh sách khoảng mùa vào bộ tính thuần. Không đọc bảng `lm_*` trực tiếp (5.3).
   - **DTO `tamNgung`** (B Đ4) có thêm mảng `dieuKien` cho mỗi lần đóng.
   - Riêng `NGAY_DI_TRONG_MUA` được **trải sẵn ở máy chủ** thành các khoảng ngày đã xác nhận (ví dụ «Tết: 05/02–09/02/2027»). Nhờ vậy form làm mờ được theo ngày đang chọn bằng **cùng** luật thuần `dong-ban.ts`, không cần gọi thêm route. Đây là cùng cách B làm với khoảng ngày (B Đ4, «Phương án bị bác» thứ hai).
   - Nhãn mờ theo khoá: «Không chạy thứ Tư», «Phải đặt trước 1 ngày», «Ngừng bán trong Tết (05/02–09/02)», «Chỉ bán 01/05–31/08».
4. **Tin «Tạm ngừng bán» (B6, B Đ6) kế thừa tự nhiên.** Hàm `donCuaToiTrungDongBan` của B gọi `dongBanChoForm` (B Đ6.1), nên nháp hoặc đơn chờ trúng một điều kiện (ví dụ ngày đi rơi vào thứ Tư) sẽ hiện tin cho người lập, kèm lý do của dòng cha. Lượt C **không** thêm loại tin, không thêm cách gửi. Tin chỉ xuất hiện khi lần đóng có điều kiện được tạo hoặc khi đơn được lưu (mốc của tin theo B Đ6.2), không lặp mỗi ngày.
   - **Mặt trái cần chủ biết** (R2-C4): với `DAT_TRUOC_DUOI`, một nháp chỉ bắt đầu «trúng» khi ngày trôi qua. Lúc đó mốc của tin là mốc cũ (lúc tạo lần đóng hoặc lúc lưu đơn), có thể sớm hơn mốc «đã đọc» của người lập. Tin vẫn có trong hộp nhưng **không làm tăng số đỏ**, nên người lập có thể không biết. Chốt thật vẫn là máy chủ: tới lúc gửi hoặc xác nhận, người lập nhận 409 kèm lý do. Muốn báo chủ động thì cần đổi luật mốc tin của B — việc riêng, không làm ở lượt này.
5. **Không theo loại đối tác.** Điều kiện lượt này áp cho **mọi bên đặt**. Luật theo loại đối tác là ADR-0146 (lượt A sửa nó).
6. **Không theo đặc điểm dịch vụ.** Bảng của B chỉ có phạm vi `SERVICE` / `GROUP` (B Đ1); đặc điểm của lượt A chỉ gắn vào luật bán ADR-0146. Lượt C không thêm phạm vi theo đặc điểm (bỏ câu «đặc điểm nếu A duyệt» của bản đầu — báo cáo kiểm C-9).
7. **Vì sao không dùng chung danh sách khoá của ADR-0147** (phí đón, cũng dự kiến khoá «mùa» — báo cáo kiểm C-10). Danh sách của 0147 thuộc `pricing` và chọn **mức tiền** («dòng cụ thể nhất thắng», đếm số điều kiện). Danh sách của C thuộc `catalog` và chỉ **chặn** («một lần trúng là đủ»). Hai luật hợp giải khác nhau thì không nên dùng chung một bảng tra cứu. Gom về «một ngữ pháp» (`KHUNG-CHINH-SACH-CHUNG`) là ADR khung riêng, chưa có.
8. **Kết thúc một lần đóng có điều kiện dùng đúng luật mở lại của B**, kể cả ca biên của B (B Đ1 «Quy tắc mở lại ở hai ca biên»):
   - lần đóng có điều kiện **chưa bắt đầu**: kết thúc được (lần đóng rỗng);
   - lần đóng có điều kiện **đã quá kết thúc dự kiến** (`valid_to_at` có và ≤ lúc bấm): **409** «Lần đóng này đã hết hiệu lực, không cần mở lại», như dòng trơn; trigger của B vẫn là lưới (không kéo dài, mở lại một lần).

### Bổ sung cho lượt B (để kế hoạch thi công B và C cùng thấy)

Lượt C2 đặt **thêm hành vi lên route và hàng rào của B**. Văn bản B (bản 30/10, không đổi từ 08:59 lúc người kiểm soát vòng 3) chưa ghi những điều này; **nếu B sửa tiếp, phải đối chiếu lại B+1…B+6**. Người thi công B và C phải đọc cả hai, và nếu chủ duyệt C2 thì chúng thành phần sửa của B:

| # | Chỗ của B | Hành vi C2 thêm | Ghi chú |
|---|---|---|---|
| B+1 | route **đóng** của B (ô `catalog.sale.suspend`) | thân có **điều kiện** mà người gọi không giữ `catalog.sale.condition.write` ⇒ **403**, không ghi gì | Bán hàng vẫn đóng trơn được (B2) |
| B+2 | route **mở lại** của B (ô `catalog.sale.resume`) | lần đóng **có điều kiện** ⇒ **409** «dùng màn Điều kiện bán»; không ghi gì | Tiêu chí 2 của B («Quản trị, Toàn quyền mở lại → 200») chỉ đúng cho lần đóng **trơn** |
| B+3 | hàng rào (a) của B: quét chuỗi `ctl_sale_suspension` ngoài tệp SQL của lần đóng | chuỗi này **khớp cả** tên bảng con `ctl_sale_suspension_condition` (bảng tra cứu `ctl_sale_condition_kind` không chứa chuỗi đó) | Đề nghị [người soạn]: mọi SQL của bảng con nằm **cùng tệp nửa nghiêm** của B (`catalog/dong-ban-repo.ts`). Mẫu quét đổi thành **có ranh giới từ** (`\bctl_sale_suspension\b` và `\bctl_sale_suspension_condition\b` liệt kê riêng), để bài vẫn bắt `orders` nhắc bảng con |
| B+4 | luật thuần `src/shared/dong-ban.ts`, DTO `tamNgung`, `dongBanTrung` / `dongBanChoForm` | thêm bộ tính bốn khoá, trường `dieuKien`, khoảng mùa trải sẵn | Thêm trường, không đổi trường của B |
| B+5 | bài so khớp form ↔ máy chủ của B (B Đ4 tiêu chí 2) | thêm ca có điều kiện | — |
| B+6 | lô đóng của B (`ctl_sale_suspension`) | `created_at` (và `created_by`) của dòng đóng = **mốc `at` của request** và người gọi, cùng giá trị ghi vào dòng điều kiện con | Không có thì trigger «cùng lô» của C (Đ4.1) chặn nhầm lô hợp lệ (R3-C1) |

## Phương án bị bác

- **Lịch lễ viết cứng trong mã**: mỗi năm phải phát hành lại; danh sách lễ vừa đổi năm 2026.
- **Bảng ngày âm lịch dựng sẵn nhiều năm** (migration gieo, người xác nhận) [người soạn]:
  - phải đối chiếu hàng trăm dòng;
  - hết năm phải gieo thêm;
  - vẫn cần người xác nhận khoảng nghỉ thực tế.

  Thuật toán thuần + bảng đối chiếu **trong test** an toàn ngang vậy. Phương án tối thiểu nếu chủ không muốn thuật toán: Quản trị tự gõ Tết, Giỗ Tổ mỗi năm.
- **Thư viện âm lịch npm**: kho không có dependency runtime.
- **Lưu gợi ý thành dòng «chờ xác nhận» bởi Cron**: thêm tác vụ tự động ghi dữ liệu, đúng chỗ đang hở HC-5.11.
- **Đặt lịch mùa trong `catalog`** (`ctl_season*`): đỡ hai cạnh mới, nhưng `catalog` là `LEGACY` có hạn (2027-03-31) và gắn với đồng bộ Sheet; lịch không phải tính chất của dịch vụ. Câu C-Q5.
- **Dùng `admin.manage`** (bản đầu): ô này đã gom tài khoản, quyền, địa điểm, danh mục, vai hồ sơ, gộp hồ sơ; B đã bác dùng nó cho mở lại.
- **Dùng ô của B cho luật có điều kiện**: `catalog.sale.suspend` có Bán hàng (trái C-Q2); `catalog.sale.resume` mang nghĩa «mở lại».
- **Bảng luật khả dụng riêng của C, song song với `ctl_sale_suspension`**: hai bảng cùng nghĩa «tạm ngừng bán», hai bộ hiển thị, hai cách mở lại — đúng điều `KHUNG-CHINH-SACH-CHUNG` cảnh báo.
- **Thêm điều kiện «trong mùa» vào luật theo loại đối tác (ADR-0146) ngay lượt này**: vượt trần; 0146 đang được lượt A sửa.

## Hệ quả

- **Migration mới** (số lấy lúc thi công), một tệp mỗi lượt:
  - C1: `lm_season`, `lm_season_range`, trigger, hai view, gieo mùa lễ;
  - C2 (ghi sau migration của B vì có khoá ngoại tới `ctl_sale_suspension`): `ctl_sale_condition_kind` (gieo bốn khoá), `ctl_sale_suspension_condition` + trigger (chỉ thêm, hình dạng, «cùng lô» Đ4.1).
  - Cập nhật `docs/data-dictionary.json` rồi `npm run dict`.
- `src/architecture.test.ts`: thêm `lich-mua` (`["audit"]`, `STRICT`) và cạnh `pricing → lich-mua` (C1); cạnh `catalog → lich-mua` (C2). Thêm vào mảng `modules` ở `src/index.ts`.
- `src/shared/lich-mua.ts`, `src/shared/am-lich.ts` (mới) kèm test; bộ tính điều kiện thêm vào `src/shared/dong-ban.ts` của B.
- `src/shared/permissions.ts`: `season.write` (C1), `catalog.sale.condition.write` (C2).
- Trang «Lịch mùa» (khai `PAGES`, `build:web`, menu Quản trị); khối «Điều kiện bán» trong trang «Tình trạng bán» của B. Trợ giúp cho Quản trị.
- `docs/SYSTEM-DESIGN.md` §5, §17; `docs/CHANGE-GUIDE.md` (công thức «thêm khoá điều kiện bán»).

## Tiêu chí nghiệm thu (viết trước; đỏ trước, xanh sau)

**Theo lượt:** C1 = 1 (vế lịch), 3, 4 (vế `lm_season_range`), 5, 6, 7, 8 (vế `season.write`), 13 (cạnh `pricing → lich-mua`). C2 = phần còn lại (1 vế lần đóng, 2, 4 vế điều kiện, 8 vế điều kiện, 9–12, 13 vế `catalog → lich-mua`, 14, 15, 16).
**Làm ngay được, không cần B:** mọi tiêu chí của C1, và phần **hàm thuần** của 2, 9, 10, 11. **Cần B đã thi công:** phần e2e của 2, 9, 10, 11 và 14, 15, 16.

1. Mùa M chưa có khoảng nào ⇒ «ngày D thuộc mùa nào» rỗng với mọi D. Một lần đóng có điều kiện `NGAY_DI_TRONG_MUA = M` không trúng dòng nào (bài hàm thuần).
2. Xác nhận khoảng Tết 2027 05/02–09/02.
   - Hàm thuần: dòng ngày đi 07/02/2027 trúng điều kiện «không bán trong Tết»; 10/02/2027 không trúng.
   - e2e (khi B có): lập đơn ngày 07/02/2027 ⇒ 409 `sale_suspended`, câu có lý do của dòng cha; 10/02 ⇒ 201.
3. Thêm khoảng của mùa P (ưu tiên 50) giao khoảng đang hiệu lực của mùa Q (ưu tiên 50) ⇒ 409 nêu tên Q và khoảng. Chèn thẳng bằng SQL ⇒ trigger từ chối. Khác ưu tiên ⇒ chèn được.
4. CSDL từ chối: xoá / sửa ngày của `lm_season_range`; đặt `ended_at` lần thứ hai; xoá / sửa `ctl_sale_suspension_condition`; chèn điều kiện có cột giá trị sai hình dạng theo khoá.
5. Gợi ý 2027 cho mùa neo âm 1/1, lệch −1, 5 ngày ⇒ 05/02/2027–09/02/2027; neo âm 10/3 ⇒ 16/04/2027. Chỉ được tính là xanh **khi** bảng đối chiếu trong test đã có người xác nhận; trước đó là `todo` có tên.
6. Thêm mùa `LE_LUAT` neo dương 24/11 **qua route**; hàm gợi ý trả khoảng 24/11 năm sau; bài quét ở tiêu chí 7 vẫn xanh (không có hằng ngày lễ nào trong mã chạy).
7. Bài quét: không tệp mã chạy nào (trừ migration gieo) chứa tên mùa / ngày lễ cố định. Danh sách chữ cần quét do kế hoạch chốt.
8. Quyền:
   - `season.write` và `catalog.sale.condition.write`: Quản trị, Toàn quyền ⇒ được, có nhật ký; Bán hàng, Kế toán, Hiện trường, Đối tác, Thực tập, Nhân sự, Tài xế ⇒ 403.
   - Bán hàng gọi route «đóng» của B kèm điều kiện ⇒ 403.
   - Quản trị gọi route «mở lại» của B trên lần đóng có điều kiện ⇒ 409.
   - Bài «mỗi ô được máy chủ hỏi» đỏ khi xoá cố ý lời gọi `can(…)` của mỗi ô.
9. `THU_TRONG_TUAN` chặn {2,4,6,7,CN}: thứ Ba qua, thứ Tư chặn; thứ tính theo lịch VN.
10. `DAT_TRUOC_DUOI = 1`, mốc request dừng bằng `mock.timers`:
    - hôm nay cho ngày đi hôm nay ⇒ chặn; cho ngày mai ⇒ qua;
    - nháp lưu hôm qua cho hôm nay, xác nhận hôm nay ⇒ chặn ở cổng xác nhận.
11. `NGAY_DI_NGOAI_KHUNG 01/05–31/08`: 30/04 và 01/09 chặn; 01/05 và 31/08 qua.
12. Danh sách mã khoá ↔ bảng tra cứu lệch ⇒ bài đỏ (quan sát chặn thật một lần, P16, rồi ghi `docs/SO-HANG-RAO.md`).
13. `src/architecture.test.ts` xanh với hai cạnh mới; cố ý cho `lich-mua` import `catalog` ⇒ đỏ; cố ý cho `orders` import `lich-mua` ⇒ đỏ (cạnh không được nới).
14. Bài so khớp form ↔ máy chủ của B (B Đ4 tiêu chí 2) thêm các ca có điều kiện: luật thuần ở giao diện và cổng máy chủ cho cùng đáp án, kể cả `NGAY_DI_TRONG_MUA` đã trải khoảng.
15. «Cùng lô» (Đ4.1): chèn thẳng bằng SQL một dòng điều kiện vào lần đóng trơn đã có (khác `created_at`), hoặc vào lần đóng đã mở lại ⇒ trigger từ chối. Quan sát chặn thật một lần (P16).
16. Ca biên của B áp cho dòng có điều kiện (Đ4.8): lần đóng có điều kiện có kết thúc dự kiến 18:00, bấm kết thúc lúc 19:00 (dừng giờ bằng `mock.timers`) ⇒ 409 «đã hết hiệu lực», không dòng nhật ký. Bài quét (a) của B (đã sửa ranh giới từ — B+3) vẫn đỏ khi `orders` nhắc `ctl_sale_suspension_condition`.

## Không làm ở lượt này [người soạn]

- Hiệu ứng, cổng, mã lỗi, hiển thị, tin của «tạm ngừng bán» (lượt B).
- Điều kiện mùa cho cờ «cần xác nhận» (ADR-0136) và cho luật theo loại đối tác (ADR-0146).
- Phạm vi theo đặc điểm dịch vụ (lượt A).
- Số khách tối thiểu/tối đa. Lịch theo giờ.
- Phụ thu (lượt D).

## Câu hỏi cho chủ (mỗi câu một khuyến nghị)

| # | Câu | Khuyến nghị |
|---|---|---|
| C-Q1 | Âm lịch: Nền tảng tự tính gợi ý hay Quản trị tự gõ ngày Tết, Giỗ Tổ mỗi năm? | **Tự tính gợi ý**; mọi gợi ý vẫn phải bấm Xác nhận. Một người đối chiếu bảng ngày Tết/Giỗ Tổ 2025–2040 với lịch chính thức một lần |
| C-Q2 | Ai đặt điều kiện bán thường trực (thứ, đặt trước, mùa, khung bán)? | **Quản trị, Toàn quyền**, bằng một ô riêng. Bán hàng vẫn «Đóng» nhanh theo lượt B, nhưng không gỡ được điều kiện |
| C-Q3 | «Đặt trước tối thiểu» tính theo ngày hay giờ? | **Theo ngày** |
| C-Q4 | Mọi ngày lễ theo luật gieo cùng ưu tiên 50? | **Có**; đổi được trên màn hình |
| C-Q5 | Lịch mùa là phân hệ riêng, phải nới sơ đồ phụ thuộc đúng hai cạnh (giá → lịch; danh mục → lịch). Theo lệ bạn duyệt 30/9, mỗi lần nới cạnh tính là một quyết định, nên lượt C có 6 điều. Duyệt thế nào: (a) **hai lượt** — C1 lịch mùa (3 điều), C2 điều kiện bán (3 điều, sau B); hay (b) **một lượt, cho vượt trần**, như bạn đã cho ở chính sách bán 25/10 và 28/10? | **(a) Hai lượt.** C1 trước vì phụ thu (D) cần nó; C2 duyệt sau khi B được duyệt |

## Điều chưa chắc / chưa kiểm

- **Chưa kiểm** văn bản Bộ luật Lao động 2019 Điều 112 và Nghị quyết 28/2026/QH16.
- **Chưa kiểm** ngày Tết/Giỗ Tổ với nguồn chính thức.
- Tên của B lấy từ bản đọc ngày 30/10 (B đang sửa song song). Đổi tên bảng / hàm / ô ở B thì Đ2, Đ4 và trang ghép đổi theo; **thiết kế** không đổi miễn là B giữ «một bảng lần đóng ở `catalog`, một hàm xét ở `catalog`, một hàm cổng ở `orders`».
- Đơn cũ lệch ngày: điều kiện xét theo ngày đi của từng dòng (như B Đ2); số đơn như vậy **chưa kiểm**.
- Tên bảng, phân hệ, thao tác, cột đều là tên tạm.

## Đếm quyết định chạm quyền / dữ liệu (`CLAUDE.md` §9, trần 3)

Cách đếm theo **điều**, và **nới cạnh kiến trúc tính vào trần** theo tiền lệ chủ duyệt 30/9 (`docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:81-82`).

| Lượt | Mục | Chạm | Tính vào trần |
|---|---|---|:-:|
| C1 | Đ1 phân hệ + bảng mùa, khoảng ngày, bất biến chồng | dữ liệu | ✔ |
| C1 | Đ2a thao tác `season.write` | quyền | ✔ |
| C1 | Nới cạnh `pricing → lich-mua` (Điều 9.4) | dữ liệu (nới cạnh kiến trúc) | ✔ |
| C1 | Đ3 gợi ý ngày lễ, thuật toán âm lịch | mã thuần; dữ liệu gợi ý là cột của Đ1 | ✘ |
| C2 | Đ4 bảng điều kiện con của lần đóng (B) + bảng tra cứu khoá | dữ liệu | ✔ |
| C2 | Đ2b thao tác `catalog.sale.condition.write` (+ hai hành vi đặt lên route của B — B+1, B+2) | quyền | ✔ |
| C2 | Nới cạnh `catalog → lich-mua` (Điều 9.4) | dữ liệu (nới cạnh kiến trúc) | ✔ |

**C1 = 3, C2 = 3 — mỗi lượt đúng trần.** Gộp một lượt = 6, chỉ hợp lệ khi chủ ghi «cho vượt trần» (C-Q5 (b)). Không chạm tiền.
Bản sửa 1 ghi «3, không tính cạnh» — sai theo tiền lệ 30/9 (báo cáo kiểm R2-C1); đã bỏ.
