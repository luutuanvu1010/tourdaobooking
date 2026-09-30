# Trang ghép — lượt duyệt 1 (ADR-0058 nhóm dịch vụ; ADR-0062 báo tin khi đơn đổi sau xác nhận)

- **Loại:** trang ghép theo `CLAUDE.md` §9 "Bước ghép khi duyệt". Bản nháp của người soạn, 2026-09-30, **đã sửa lần 1 theo báo cáo người kiểm độc lập** cùng ngày; sửa lần 2 theo người kiểm độc lập vòng 2 (khai trước `order_money_adjusted`; bản sửa này chưa được kiểm lại).
- **Mốc mã:** `origin/main` = `1db777f4` (bản 1.38). Cột "Nguồn" trỏ `tệp:dòng` ở mốc đó.
- **Xây trên lỗ đang hở:** không. `docs/quyen-hoan.json` `phat_hien = []`.

## 0. Đếm trần 3 — chia hai lượt

Mỗi lượt duyệt tối đa **3** quyết định chạm quyền hoặc dữ liệu. Hai ADR gộp lại có **5** quyết định như vậy ⇒ **chia hai lượt**, khuôn ADR-0052 (A-1 / A-1b).

| Lượt | ADR | Quyết định chạm quyền / dữ liệu | Số |
|---|---|---|---|
| **1a** | ADR-0058 | (1) hai bảng mới `ctl_group`, `ctl_service_group` + tiền tố `ctl_` (nới `TABLE_PREFIX`) + gieo dữ liệu thật (Đ1, Đ2, Đ7); (2) DTO danh mục mở thêm tên nhóm cho mọi người lập đơn, kể cả Đối tác / Thực tập (Đ5); (3) ô ghi nhóm = `admin.manage` (Đ3 — không ô mới, nhưng là quyết định quyền) | **3** |
| **1b** | ADR-0062 | (4) view công bố mới `v_aud_order_change` lộ `detail` nhật ký **chỉ** cho module thông báo + đổi khuôn `detail` của hành động mang cờ `doiSoKhach` (Đ1, Đ2); (5) tập người nhận tin (người lập, người phụ trách; Đối tác / Thực tập theo câu 5; chống trùng MQ-07) (Đ3) | **2** |

Không quyết định nào của lượt 1b phụ thuộc lượt 1a (không bảng, route, ô chung) ⇒ duyệt theo thứ tự nào cũng được.

**Chỗ nối với lượt 2:** ADR-0062 **định nghĩa** hằng "giờ" `TRUONG_GIO_TINH_LUOT` (Đ1); ADR-0063 (lượt 2a) dùng lại hằng đó để đếm lượt đổi giờ — câu 3 của `cau-hoi-chu.md` quyết cho cả hai; lượt 2a chậm hay bị bác thì hằng vẫn đứng một mình cho tin; ADR-0062 Đ1 **khai sẵn** hành động `order_money_adjusted` (ADR-0063 là nơi ghi đầu tiên) trong `src/shared/audit-actions.ts`, tập nguồn và danh sách hành động của view `v_aud_order_change` (`0047`); đoạn "số khách đi xe" (ADR-0065, lượt 2b) đi trong hai hành động đã có trong tập nguồn. Vì vậy duyệt lượt 2 sau **không** phải sửa ADR-0062 và **không** cần migration tạo lại view. Lượt 2a bị bác thì hành động khai sẵn chết nhưng vô hại (không dòng nào ghi).

---

## 1. Bảng bị chạm chứa những loại thực thể nào

| Bảng / view | Module chủ | Chứa | ADR chạm | Chạm thế nào |
|---|---|---|---|---|
| `catalog_item` | `catalog` | dịch vụ bán cho khách (bản sao Sheet); **một loại** thực thể | 0058 | chỉ **được trỏ tới** (khoá ngoại cùng module từ `ctl_service_group`); không đổi cột, không đổi dòng |
| `catalog_override`, `catalog_sync` | `catalog` | ghi đè giá / ẩn; trạng thái đồng bộ | 0058 | **không** chạm |
| **`ctl_group`** (mới) | `catalog` | nhóm dịch vụ (bảng tra cứu) — **một loại** | 0058 | tạo + gieo 14 dòng |
| **`ctl_service_group`** (mới) | `catalog` | nhóm hiện hành / lịch sử nhóm của **dịch vụ** — **một loại** (không người, không đơn, không tiền); dòng hiện hành = `seq` lớn nhất | 0058 | tạo + gieo ≤ 110 dòng (`seq` = 1) |
| `audit_log` | `audit` | nhật ký chung: sự kiện của **đơn, tài khoản, danh mục, hồ sơ, chuyến, thông báo…** (nhiều loại, phân biệt bằng `target_type` + `order_id`) | 0058, 0062 | 0058: thêm dòng `catalog_*` (ghi qua `auditStatement`). 0062: **đọc** qua view mới (view liệt kê sẵn cả `order_money_adjusted` chưa có dòng); ghi thêm đoạn đầu "số khách: …" vào `detail` của mọi hành động mang cờ `doiSoKhach` (hôm nay `order_money_adjusted_by_field`; sau ADR-0063 thêm `order_money_adjusted`) |
| **`v_aud_order_change`** (view mới) | `audit` | **chỉ** dòng nhật ký **của đơn** (`order_id IS NOT NULL`) thuộc tập hành động "đổi sau xác nhận" — không dòng tài khoản, hồ sơ, chuyến | 0062 | tạo; **chỉ `thongbao` được đọc** (bài kiến trúc mới) |
| `v_aud_order_event` | `audit` | sáu hành động vòng đời đơn | 0062 | **không** sửa; thêm một **cách đọc**: dòng `confirmed` của đúng các đơn có dòng nguồn (không giới hạn 30 ngày) để quyết "sau xác nhận" |
| `order_money_adjustment` | `orders` | dòng điều chỉnh số khách / tiền chỉ-thêm | 0062 | **không** đổi bảng; đường ghi dùng `before`/`after` sẵn có để viết đoạn "số khách …" vào `detail` nhật ký |
| `ntf_*` | `thongbao` | tin thủ công, đã hiểu, mốc đã đọc, địa chỉ máy | 0062 | **không** chạm (tin mới là hình chiếu, không bảng) |
| `dsp_assignment` | `dispatch` | người phụ trách đơn (`HANDLE`; `PICKUP`/`DROPOFF`/`BOAT` chưa dùng) | 0062 | chỉ đọc "người phụ trách hiện tại" qua đường sẵn có (`handlerOf`, gốc lắp ráp) |

**Câu hỏi "bảng này nay chứa ai" (bài học F-01):**
- `ctl_service_group` chỉ nói về **mã dịch vụ**, không chứa người.
- `v_aud_order_change` chỉ lọc dòng **có `order_id`**, nên không kéo nhật ký tài khoản / hồ sơ (có SĐT cũ trước 21/9) vào hộp thông báo. `staff_updated` không có `order_id`, không lọt.
- Trường `detail` lộ cho module thông báo (và **chỉ** module này — bài kiến trúc), nhưng **chỉ** hàm `phanDoiCuaTin` đọc nó, và hàm này chỉ nhận đoạn có khuôn (bài khứ hồi + bài quét chữ tự do). Tên dịch vụ nhập tay (chữ người dùng gõ) **không** vào tin.

---

## 2. Dòng bản đồ quyền nào chạm bảng này, áp cho loại nào

Giá trị ô theo thứ tự `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER, DRIVER_PARTNER` (`src/shared/permissions.ts:5`).

| Ô (`MATRIX`) | Giá trị hôm nay | Áp cho loại thực thể | ADR | Đổi? |
|---|---|---|---|---|
| `admin.manage` (`:100`) | none, none, **any**, none, none, **any**, none, none, none | **ghi** `ctl_group`, `ctl_service_group` (nhóm, gán nhóm); xem lịch sử nhóm | 0058 | **không đổi** |
| `order.create` (`:76`) | any, none, any, none, any, any, any, none, none | chốt chặn thật của `GET /api/catalog/for-order` ⇒ ai đọc được **tên nhóm** ở form đơn | 0058 | không đổi. Hệ quả mới: Đối tác, Thực tập thấy tên nhóm |
| `money.view` (`:73`) | any, any, any, assigned, own, any, own, none, none | hỏi ngữ cảnh "của mình" ở hai route danh mục (giá); không liên quan nhóm | 0058 | không đổi |
| `order.view` (`:72`) | any, any, any, assigned, own, any, own, none, none | `any` ⇒ nhãn `tat-ca` ⇒ thấy tin **đơn đổi** ở ngăn "Tất cả" | 0062 | không đổi |
| `order.money.edit` (`:88`) | own, any, any, assigned, none, any, none, none, none | ghi `order_money_adjustment` ⇒ hành động mang cờ `doiSoKhach` ⇒ nguồn tin | 0062 (đọc), 0063 (route văn phòng) | không đổi |
| `order.history.view` (`:74`) | ownOrAssigned, any, any, assigned, own, any, own, none, none | tin kèm **tên người sửa** hay không (ADR-0034 điều 3) | 0062 | không đổi. HDV phụ trách thấy tên (luật đã có) |
| `dispatch.claim` (`:91`) | any, none, any, any, none, any, none, none, none | tin đơn đổi **bỏ** nhãn `cho-nhan` ⇒ ô này không mở thêm tin nào | 0062 | không đổi |
| `trip.call_ack` (`:146`) | ownOrAssigned, none, any, none, none, any, none, none, none | luật chống trùng với MQ-07 (ADR-0052 D6.2): ai qua ô này cho chặng có suất mở nhận tin MQ-07 thay tin đơn đổi | 0062 | không đổi |
| `trip.view` (`:136`) | any, any, any, none, none, any, none, assigned, none | tin chuyến của ADR-0052 D6 (tài xế); tin đơn đổi **không** tới tài xế | 0062 | không đổi |
| *(ngoài MATRIX)* `duocThayTinDon` (`src/shared/bang-tin.ts:117-121`) | văn phòng + HDV; Đối tác / Thực tập không | ai được thấy tin về đơn | 0062 | **đổi hẹp chỉ khi câu 5 = Có** (chỉ loại tin đổi, chỉ đơn họ lập); kéo theo "Câu thay" ADR-0014 điều 12, ADR-0022 Q-C, ADR-0034 điều 3 |

**Không thêm ô mới, không đổi giá trị ô nào** ở cả hai ADR.

---

## 3. Cổng nào canh cửa nào

| Cửa | Cổng lọc thô | Chốt chặn thật (trong thân, trước mọi truy vấn) | ADR | Ảnh chụp / bài |
|---|---|---|---|---|
| `GET /api/catalog/for-order` (thêm `groupCode`, `groups`) | `orders` | `can(order.create)` rồi `can(money.view, của mình)` (`src/modules/catalog/index.ts:110-113`) | 0058 | `route-access.test.ts` (không đổi mức); bài liệt kê khoá DTO |
| `GET /api/catalog` (thêm `groupCode`, `groups`) | `office` | `can(money.view, của mình)` (`:99-101`) | 0058 | như trên |
| `GET/POST /api/catalog/groups`, `PATCH /api/catalog/groups/:code`, `PUT /api/catalog/group-assignments`, `GET /api/catalog/:code/group-history` (mới) | `admin` | `can(admin.manage)` | 0058 | `route-access.test.ts` thêm dòng; `route-write-guard.test.ts` thấy hỏi bảng quyền; `Origin` cùng site cho ghi |
| Các route đổi đơn: `PUT /api/orders/:id/trip`, `POST/PUT /api/orders/:id/legs…`, `POST /api/orders/:id/handler-money-edit` | như hiện có | ô hiện có (`order.trip.edit`; route hẹp HDV `order.money.edit = assigned` + đang phụ trách, hoặc Toàn quyền) | 0062 | **không đổi cửa**; chỉ thêm việc sau lô: gọi `baoThayDoi` kèm tham số nội bộ |
| `GET /api/thong-bao`, `/tom-tat`, `/moi-nhat` (hộp, số đỏ, màn hình khoá) | `staff` | hàm lọc một nguồn `locHopThongBao` (người lập / phụ trách, bỏ người sửa, `duocThayTinDon`, `order.history.view` cho tên) | 0062 | bảng ca `thong-bao.test.ts`; `nguoiNhanDay` dùng cùng hàm |
| Sự kiện Bảng tin (WebSocket) | nhãn `nhanKetNoi` | đúng 5 khoá (`laSuKienHopLe`) | 0062 | **không đổi** — tham số mới không vào sự kiện |
| Migration `0046` (0058), `0047` (0062) | — | **chủ tự áp remote** theo runbook (`CLAUDE.md` §8) | cả hai | bảng số chung: 0046 = ADR-0058, 0047 = ADR-0062, 0048 = ADR-0063, 0049 = ADR-0065; ADR-0054…0057, ADR-0060, ADR-0061 ≥ 0050; quét lại mọi nhánh lúc lập kế hoạch |

---

## 4. Câu duyệt ngắn cho chủ (lời thường)

**Lượt 1a — Nhóm dịch vụ (ADR-0058):**
> "Duyệt ADR-0058: app có danh sách nhóm dịch vụ riêng, gieo một lần theo Sheet hôm nay. Quản trị sửa nhóm ở màn Danh mục, có lịch sử. Người lập đơn (kể cả Đối tác, Thực tập) thấy chip nhóm để lọc khi chọn dịch vụ. App không đọc cột nhóm của Sheet nữa."
>
> **Duyệt lượt này cũng là gật đầu rõ cho các điểm sau** (mỗi điểm phải được chủ đồng ý, không ngầm định):
> - **Nới một hàng rào máy** (Điều 9.4): thêm tiền tố tên bảng mới `ctl_` cho module danh mục vào danh sách tiền tố được phép (`TABLE_PREFIX`). Không có dòng này thì bài kiến trúc đỏ.
> - **Một lệch có hạn:** module danh mục vẫn ở hạng cũ (chưa chuyển hạng chặt) — mã mới đặt ở một tệp chặt riêng; hạn gỡ theo câu 2.
> - **Gieo dữ liệu thật** lên production (14 nhóm, 110 dịch vụ) bằng migration chủ tự áp.

Kèm hai câu ở `cau-hoi-chu.md`: **câu 1** (14 nhóm; ATV thuộc Kong Forest), **câu 2** (hạn gỡ lệch 2027-03-31).

**Lượt 1b — Báo tin khi đơn đổi (ADR-0062):**
> "Duyệt ADR-0062: đơn đã xác nhận mà đổi giờ, nơi đón hoặc số khách thì người lập và người phụ trách (HDV) nhận tin ở chuông và màn hình khoá. Tin chỉ có mã đơn và phần đổi (vd 'giờ đón 07:00 → 06:30'), không SĐT, không tên khách, không tiền, không tên dịch vụ gõ tay. Người vừa sửa không nhận. Tài xế nhận tin riêng theo ADR-0052, không trùng. Tin ban đêm theo luật giờ yên lặng đã có."
>
> **Duyệt lượt này cũng là gật đầu rõ cho** (mỗi điểm phải được chủ đồng ý, không ngầm định):
> - **Nới luật kiến trúc** (`docs/ARCHITECTURE.md` Phần II §4, dòng 185: "cửa đọc chéo phần chỉ có khoá + nhãn + cờ"): cửa đọc mới `v_aud_order_change` có thêm **chữ mô tả nhật ký** (`detail`), vì phần thông báo cần chữ đó để dựng câu "giờ đón 07:00 → 06:30". Hàng rào bù: chỉ phần thông báo được đọc cửa này (bài kiểm), và hàm đọc chỉ lấy đoạn có khuôn máy viết, không bao giờ in chữ tự do. (ADR-0052 cùng loại việc đã chọn "không lấy chữ" — ở đây không làm vậy được.)
> - **Ngoại lệ hẹp với ADR-0034 điều 1** ("không sửa lô ghi nào của `orders`"): lần sửa số khách ghi thêm một đoạn đầu có khuôn vào chữ nhật ký ("số khách: … · lý do: …"). Hệ quả thấy được: dòng Lịch sử trên trang đơn đổi cách ghi; hai bài kiểm tự động hiện có (`tests/e2e/dispatch.mjs:502,510`) phải sửa theo.
> - **Khai trước một loại nhật ký chưa có nơi ghi** (`order_money_adjusted` — nơi ghi đầu tiên là ADR-0063): nếu lượt 2a bị bác thì loại này nằm im, vô hại (có hiện trong bộ lọc trang Nhật ký).

Kèm ba câu ở `cau-hoi-chu.md`: **câu 3** ("giờ" gồm những gì — dùng chung với lượt 2a), **câu 5** (Đối tác / Thực tập là người lập có nhận tin — khuyến nghị Có, chỉ đơn họ lập), **câu 6** (tin không ghi nơi đón mới).
