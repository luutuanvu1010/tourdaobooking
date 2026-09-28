# Đề xuất ADR — Vận chuyển lượt 3: giá thuê xe, chi phí chuyến, công nợ nhà xe

- **Ngày:** 2026-09-28. **Vai:** người soạn thiết kế (chỉ tài liệu, không mã). **Trạng thái:** **BẢN ĐỀ XUẤT — CHƯA DUYỆT, CHƯA CÓ SỐ ADR.** Không lấy số (ngày 28/9 đã trùng số hai lần; một nhánh đang chờ gộp đã dùng số kế tiếp mà `docs/adr/README.md` ghi). Điều phối đặt số khi chủ duyệt.
- **Phạm vi:** lượt 3 của phân hệ Vận chuyển theo điều chủ đã chốt (thiết kế `2026-09-27-van-chuyen-design.md` §0.2, §0.13): *giá thuê, chi phí, công nợ nhà xe (làm cùng sổ công nợ)*; *xe đối tác thuê theo chuyến, giá theo tuyến hoặc loại xe*. Chủ: "để sau, đi cùng sổ công nợ".
- **Số quyết định:** **3** (D1, D2, D3), đúng trần của một lượt duyệt (`CLAUDE.md` §9). **D3 có điều kiện**: chỉ quyết được sau khi ADR-0026 và ADR-0024 điều 1–5 (hiện **proposed**) được duyệt — xem §0.
- **Xây trên lỗ đang hở:** kiểm 2026-09-28 trên nhánh này (gốc `3bb73f0`): `docs/quyen-hoan.json` mục `phat_hien` **rỗng**. Mục `thao_tac` còn 6 ô hoãn; hai ô liên quan tới tiền là `payment.receive`, `payment.refund` (hạn **2026-12-31**, "để dành cho N3", chưa có route) — D3 dùng sổ của ADR-0026, nơi hai ô này được thi hành. D1, D2 không xây trên ô hoãn nào. **Phải kiểm lại ngày trình duyệt.**
- **Điều Hiến chương áp** (Hiến chương 6.1): 1.4 (chuỗi bảy lớp), 2.1 (bên trước vai — nhà xe là vai), 2.2 (bốn loại), 4.2 (tiền là hình chiếu của sự kiện), 4.3 (một sổ), 4.4 (chứng từ danh sách trắng), 5.1 (bất biến hai lớp), 5.2 (chính sách có kiểu, có ngày hiệu lực), 5.3 (ranh giới module), 5.4 (một nguồn tính), 5.5 (chỉ-thêm, đảo), 5.6 (chụp tại mốc), 5.7 (giữ khi thiếu điều kiện), 5.9 (trả dư — **chỉ áp tương tự**, xem D3), 5.12 (kiểm toán), 5.14 (hai trục thời gian), 5.15 (lõi tất định), 5.17 (sổ vàng). Lệch có chủ ý: **không đề xuất lệch nào**; chỗ có nguy cơ lệch ghi ở §7.

## 0. Tóm tắt cho người duyệt

| | Làm gì | Phụ thuộc | Có chờ sổ công nợ? |
|---|---|---|---|
| **D1** | Bảng giá thuê xe (theo tuyến và/hoặc loại xe, theo nhà xe, có ngày hiệu lực) + danh mục **tuyến**, **loại xe** + luật "dòng giá nào thắng" + ô quyền sửa giá | Lượt 2 (nhà xe là hồ sơ có vai) | **Không** |
| **D2** | **Chi phí chuyến** chụp giá tại một mốc cố định, chỉ-thêm, điều chỉnh có lý do, thiếu giá thì **giữ** (không lấy 0), một hàm tính tổng, bảng kê chi phí theo nhà xe | Lượt 1b (chuyến xe) + lượt 2 (bên vận chuyển trên chuyến) | **Không** |
| **D3** *(có điều kiện)* | Đưa chi phí chuyến vào **sổ công nợ** thành "Tour Đảo phải trả nhà xe"; trả nhà xe; trả dư/ứng trước | ADR-0026 + ADR-0024 điều 1–5 **accepted và đã thi công lượt 1** | **Có** |

**Khuyến nghị (chủ quyết — câu Q1):** duyệt và làm **D1 + D2 trước**, không chờ sổ công nợ; D3 trình lại khi sổ công nợ đã duyệt. Lý do: D1 + D2 là **sự thật chi phí** (thuộc Vận chuyển, như giá dịch vụ chụp trên đơn thuộc `orders`); sổ công nợ chỉ là **hình chiếu** của sự thật đó (Hiến chương 4.2). Có D1 + D2, Kế toán đã in được bảng kê "chuyến nào, nhà xe nào, bao nhiêu tiền" để trả tay ngoài hệ thống như cách tiền cọc đang làm. **Không** làm một "sổ nợ nhà xe" riêng trong Vận chuyển — hai sổ trái Hiến chương 4.3 ("một sổ").

## 1. Mã hiện có (đã tra, chỉ đọc)

- **Tiền của đơn:** một hàm `buildLines` (`src/shared/order-lines.ts:85`), máy chủ gọi qua `recomputeService` (`src/modules/orders/service-rules.ts:154-165`) với đơn giá đã thoả thuận lưu trên đơn; hàng rào `buildlines-guard.test.ts` chặn đường tính thứ hai (sổ hàng rào, Hiến chương bảng thi hành dòng 5.4). Chụp giá: `order_item.catalog_price/unit_price` (bảng thi hành dòng 5.6). Sau xác nhận, sửa tiền đi qua dòng điều chỉnh chỉ-thêm `order_money_adjustment` (`src/modules/orders/money-adjustment.ts`).
- **Vận chuyển 1a:** `src/modules/van-chuyen/` (STRICT, phụ thuộc `parties`, `audit`; không ai import), bảng `vc_vehicle` (chủ xe = `owner_party_id` khoá tới `pty_party`), `vc_vehicle_document`, `vc_vehicle_document_type`, `vc_expiry_policy` (chính sách **chỉ-thêm**, dòng hiệu lực = `valid_from_at` mới nhất — khuôn tốt để dùng lại cho bảng giá), `migrations/0033_van_chuyen_xe.sql`. **Chưa có** chuyến, tuyến, loại xe, nhà xe.
- **`billing` / `pricing` / `receipt`:** **chưa có mã**. Chỉ có: tiền tố `bil_`/`bil` khai sẵn ở `src/architecture.test.ts:79-80`; `prc_` **chưa** khai; ô `payment.receive`, `payment.refund`, `invoice.*` trong `src/shared/permissions.ts:66-69` đang hoãn trong `docs/quyen-hoan.json`. Sổ vàng: `golden/hoan-tat-cong-no.json` + `src/so-vang.test.ts` (chỉ kiểm nhất quán nội tại, chưa chạy trên mã sổ).
- **Vai hồ sơ:** không có mã vai "nhà cung cấp"/"nhà xe" (`migrations/0011:75-76` chỉ có `DRIVER`, `AGENT`, `CUSTOMER`…); `DRIVER` cũ nhóm không sinh quyền, ADR-0040 D3 để dành cho lượt 2 quyết.
- **Bản đồ quyền:** cột `SALES, ACCOUNTING, ADMIN, FIELD, PARTNER, SUPER_ADMIN, INTERN, DRIVER` (`permissions.ts:29`); `FIELD` có `money.view = assigned` (tiền đơn mình phụ trách, ADR-0030 S23-5); cột `DRIVER` mọi ô nghiệp vụ = `none`, có bài ghim cả hàng; `vehicle.manage` = Quản trị + Toàn quyền.

## 2. Giả định về lượt 1b và lượt 2 (đang soạn song song)

Mỗi giả định có **phương án dự phòng** và ghi rõ lát nào bị kẹt nếu giả định sai. Khi 1b/2 được duyệt, người soạn kế hoạch lượt 3 đối chiếu lại từng dòng.

| # | Giả định | Nguồn gợi ý | Nếu sai thì | Lát kẹt |
|---|---|---|---|---|
| G1 | 1b có thực thể **chuyến** (`vc_` — tên chốt ở 1b) có id bền, trạng thái chỉ đi tiến *Lên lịch → Đã xuất bến → Đã kết thúc*, *Huỷ* chỉ từ *Lên lịch* (thiết kế L7) | thiết kế §4, §5 L7 | Lượt 3 không có "đối tượng" để gắn chi phí — không có dự phòng; phải chờ | 3a-2, 3b |
| G2 | Giờ **kết thúc thật** và giờ xuất bến do **máy chủ** ghi (L8), kèm ngày dân sự VN của chuyến | thiết kế L8, rà soát H9 | Nếu 1b chỉ có giờ máy tài xế: lượt 3 lấy **ngày dân sự của giờ bắt đầu dự kiến** làm ngày phát sinh (5.14), ghi rõ ở kế hoạch | 3a-2 (nhẹ) |
| G3 | Chuyến ghi **bên vận chuyển** (`carrier_party_id` hoặc tương đương) = hồ sơ công ty chủ (xe công ty) **hoặc** hồ sơ nhà xe; được **chụp lúc xuất bến** (rà soát phụ lục C mục 10: "chụp bên vận chuyển và loại xe lúc xuất bến") | rà soát §3 (C), phụ lục C.10 | Nếu 1b/2 không có cột này: lượt 3 thêm cột bằng `ALTER TABLE … ADD COLUMN` trên bảng chuyến (chỉ thêm) — nhưng khi đó **lượt 3 sửa bảng của 1b**, phải đi cùng người soạn 1b | 3a-2 |
| G4 | Có **một mốc** "chuyến được giao cho nhà xe" (điều xe gán nhà xe) và lượt 2 có "nhà xe/tài xế đối tác **từ chối**" **trước** mốc chụp giá của D2 | chủ §0.2 lượt 2: "từ chối chuyến" | Nếu lượt 2 có thêm bước "nhà xe **nhận**": đề xuất dời mốc chụp sang lúc nhận (câu Q4) | 3a-2 |
| G5 | Xe thuê: **hoặc** đã khai trong `vc_vehicle` với `owner_party_id` = nhà xe (ADR-0040 D1 "chủ xe = khoá tới hồ sơ"), **hoặc** chuyến chỉ ghi **loại xe yêu cầu** khi nhà xe tự điều xe | ADR-0040 D1 | Loại xe dùng để tra giá lấy theo thứ tự: loại xe của xe cụ thể (nếu có) → loại xe yêu cầu trên chuyến. Nếu 1b không có "loại xe yêu cầu", D1 thêm cột đó (như G3) | 3a-1, 3a-2 |
| G6 | **Nhà xe** là hồ sơ (người hoặc tổ chức, rà soát C.7 "nhà xe có thể là cá nhân") mang một **vai nhóm bên ngoài**, `handles: "never"`; lượt 2 sửa LC-1 (ADR-0018) để người ngoài không bị ép thành bên đặt | ADR-0040 D3 "lượt 2" | Nếu lượt 2 chưa có vai này: D1 **không** tự tạo vai (tránh hai nơi định nghĩa nhà xe); 3a-1 kẹt | 3a-1 |
| G7 | Lượt 1b có **tuyến** hay không là **chưa chắc**. Đề xuất: **tuyến là danh mục của lượt 3** (D1), chuyến chỉ nhận thêm một khoá tới tuyến (chọn khi điều xe) | — | Nếu 1b đã có tuyến: D1 dùng lại, bỏ phần danh mục tuyến | 3a-1 (thu nhỏ) |
| G8 | Tài xế đối tác (lượt 2) có tài khoản nhưng **không** mở ô tiền nào; cột `DRIVER` giữ mọi ô nghiệp vụ = `none` ngoài "xem cuốc của mình" | ADR-0040 D3 | — | — |

## 3. Quyết định

### D1. Bảng giá thuê xe theo nhà xe × tuyến và/hoặc loại xe, có ngày hiệu lực

**Dữ liệu** (Hiến chương 2.2: *chính sách* — dòng dữ liệu có ngày hiệu lực; 5.2: cột có kiểu, không JSON):
- **Danh mục loại xe** (bảng nghiệp vụ sửa được trong app, khuôn `vc_vehicle_document_type`: mã, tên, `active`, thứ tự, dấu vết, khoá lạc quan, nhật ký cùng lô). Gieo mặc định do chủ đưa (vd "7 chỗ", "16 chỗ", "29 chỗ", "45 chỗ"). Xe (`vc_vehicle`) nhận thêm cột loại xe (chỉ thêm, rỗng được cho xe cũ). ADR-0040 thiết kế §6 đã để "danh mục loại xe" cho sau — lượt 3 là lúc cần.
- **Danh mục tuyến** (cùng khuôn): mã, tên ("Nha Trang – sân bay Cam Ranh"), điểm đầu / điểm cuối **tuỳ chọn** là khoá tới `loc_location` (rà soát C.9: điểm chuẩn là `loc_location`), `active`. Tuyến là **nhãn thương mại để tra giá**, không phải lộ trình (lộ trình là điểm dừng của chuyến, 1b).
- **Dòng giá thuê** (bảng chỉ-thêm, khuôn `vc_expiry_policy`): nhà xe (`party_id`, bắt buộc), tuyến (rỗng được), loại xe (rỗng được) — **ít nhất một trong hai có giá trị**; đơn vị **"mỗi chuyến"** (tập đóng `CHECK` một giá trị hôm nay — chủ chốt "thuê theo chuyến"; thêm "theo giờ/km" = ADR mới); số tiền `INTEGER` VNĐ `> 0`; `valid_from_date` / `valid_to_date` (ngày dân sự VN); dấu vết đủ bốn cột; ghi chú ngắn.
  - **Đổi giá = đóng dòng cũ + thêm dòng mới** trong cùng một lô; không sửa số tiền hay khoá của dòng đã có.
- **Luật "dòng nào thắng"** (Hiến chương 2.2 *luật tính* — hàm thuần một nơi trong `van-chuyen/rules.ts`, có test): trong các dòng **đang hiệu lực vào ngày của chuyến** của **đúng nhà xe** đó: (1) khớp cả tuyến **và** loại xe; (2) khớp tuyến, loại xe rỗng; (3) khớp loại xe, tuyến rỗng. Không có dòng nào → **"không có giá"** (D2 xử lý bằng *giữ*, không lấy 0). Thứ tự (2) và (3) là **câu Q3** cho chủ. Hai dòng cùng bậc cùng khoá chồng thời gian là **không thể** (bất biến dưới).
- **Không** có "giá mặc định không theo nhà xe" ở lượt này (giá thuê là thoả thuận với từng nhà xe).

**Ai xem / sửa** (ô mới, tên là đề xuất):
- `transport.rate.manage` — thêm/đóng dòng giá, sửa danh mục tuyến và loại xe: **Quản trị + Toàn quyền** (khuyến nghị; giá thuê là việc kinh doanh — ADR-0038 điều 6; khớp `vehicle.manage`). Phương án khác ở câu Q5.
- `transport.rate.view` — xem bảng giá: Quản trị, Kế toán, Toàn quyền = `any`; **mọi cột khác = `none`**, gồm `FIELD` (HDV — ADR-0019 điều 3 cấm HDV đọc bảng giá; giá thuê là giá vốn), `DRIVER`, `PARTNER`, `INTERN`, `SALES`.
- Nhà xe **không** xem bảng giá trong app ở lượt này (G8).

**Bất biến hai lớp** (Hiến chương 5.1):
| Luật | CSDL | Máy chủ |
|---|---|---|
| Số tiền nguyên dương | `CHECK (amount > 0)` | kiểm trước khi ghi, lỗi tiếng Việt |
| Có ít nhất tuyến hoặc loại xe | `CHECK (route_code IS NOT NULL OR vehicle_type_code IS NOT NULL)` | như trên |
| Không chồng hiệu lực cùng khoá (nhà xe, tuyến, loại xe) | trigger chèn/sửa `…_overlap` (khuôn `pty_party_role_overlap`, `migrations/0011:97-104`) | kiểm trước, mã lỗi riêng |
| Chỉ-thêm: không đổi tiền/khoá; chỉ được đặt `valid_to_date` **một lần** từ rỗng | trigger `BEFORE UPDATE` (khuôn `vc_vehicle_document_identity`) + trigger cấm `DELETE` | route không có đường sửa tiền |
| Nhà xe phải đang mang vai nhà xe | trigger đọc **view công bố** `v_pty_…` (Hiến chương 5.3 cho phép; ADR-0024 điều 5 nếu được duyệt) | kiểm qua hàm công bố của `parties` |

**Route** (cổng văn phòng, hỏi `can()` đầu thân route, 403 trước 400 — khuôn `van-chuyen/index.ts`):
- `GET /api/van-chuyen/bang-gia?nha-xe=&ngay=` (`transport.rate.view`)
- `POST /api/van-chuyen/bang-gia` (thêm dòng; tuỳ chọn "thay dòng X" = đóng X + thêm mới trong một lô) (`transport.rate.manage`)
- `POST /api/van-chuyen/bang-gia/:id/ket-thuc` (đóng hiệu lực) (`transport.rate.manage`)
- `GET|POST|PUT /api/van-chuyen/tuyen`, `/api/van-chuyen/loai-xe` (`transport.rate.manage` ghi; đọc: mọi ai có `vehicle.manage` hoặc `transport.rate.view`)

**Hạch toán (khái niệm):** không có bút toán — bảng giá là **chính sách**, chưa phát sinh tiền.

**Cửa một chiều:** **chủ sở hữu bảng giá** (`vc_` hay `prc_` — câu **Q2**, xung đột X1 ở §7) và tiền tố bảng; đơn vị "mỗi chuyến" là tập đóng. **Hai chiều:** ô quyền, danh mục tuyến/loại xe (dữ liệu), thứ tự ưu tiên (mã luật, có test — đổi bằng ADR).

### D2. Chi phí chuyến: chụp giá tại mốc cố định, chỉ-thêm, giữ khi thiếu giá

**Dữ liệu** (thực thể *dòng chi phí chuyến*, chỉ-thêm — Hiến chương 5.5; chụp — 5.6):
- **Chỉ chuyến có bên vận chuyển ≠ công ty chủ** mới có chi phí thuê. Chi phí xe công ty (xăng, lương tài xế, khấu hao) **ngoài phạm vi** lượt 3 (câu Q8 xác nhận).
- Bảng **dòng chi phí chuyến** (tên chốt ở kế hoạch), mỗi dòng: chuyến, nhà xe, **loại dòng** (tập đóng `CHECK`: *chụp giá*, *điều chỉnh*, *đảo*), số tiền `INTEGER` (có dấu: *chụp giá* `> 0`; *điều chỉnh* `≠ 0`; *đảo* = âm đúng dòng gốc), **nguồn quy tắc** (id dòng giá đã dùng + bản sao tuyến, loại xe, đơn giá — Hiến chương 5.6 "lưu bản sao con số + nguồn quy tắc"), lý do (danh sách đóng + chữ ngắn, **bắt buộc** với *điều chỉnh*/*đảo*; lý do mẫu: phụ thu chờ thêm giờ, phí cầu đường/bến bãi, phí huỷ muộn, nhập sai), `reverses_id`, **ngày phát sinh** (ngày dân sự VN của chuyến) tách khỏi **thời điểm ghi** (`created_at` UTC) — Hiến chương 5.14; đủ bốn cột dấu vết.
- **Mốc chụp** (câu **Q4**): *khuyến nghị* — **lúc chuyến được giao cho nhà xe** (G4), trong **cùng lô** với câu gán nhà xe của 1b/2. Trước khi xuất bến, nếu điều xe **đổi** nhà xe / tuyến / loại xe, máy **tự đảo dòng chụp cũ và chụp lại** trong cùng lô (không cần lý do — chưa có gì xảy ra). **Từ lúc xuất bến**, không chụp lại nữa: chỉ *điều chỉnh* có lý do.
- **Chi phí thành "đã phát sinh"** khi chuyến **Đã kết thúc**. Chuyến **huỷ trước xuất bến** → máy đảo dòng chụp trong cùng lô huỷ (chi phí về 0); phí huỷ nếu có = *điều chỉnh* có lý do (lượt 3 **không** có chính sách "mốc huỷ", câu Q7).
- **Thiếu giá** (Hiến chương 5.7): không có dòng giá thắng → **không ghi 0**; chuyến vẫn chạy (không chặn vận hành vì chuyện tiền — câu **Q6**), nhưng chi phí ở trạng thái **"thiếu giá — chờ Quản trị nhập giá"** (suy ra: chuyến giao nhà xe mà không có dòng *chụp giá* còn hiệu lực), hiện rõ trên bảng kê và ai phải xử lý; Quản trị thêm dòng giá rồi bấm "chụp lại" (route dưới) → được thả. Chuyến còn thiếu giá **không chốt vào sổ** được (D3).
- **Một nguồn tính** (Hiến chương 5.4): **một hàm** `tongChiPhiChuyen(dòng[])` (tên đề xuất) trong `van-chuyen/rules.ts` — mọi đường (màn chuyến, bảng kê, D3 đưa vào sổ) đi qua hàm đó; hàm "dòng giá nào thắng" (D1) là hàm thứ hai, riêng việc tra giá. Hàng rào kiểu `buildlines-guard`: bài quét thấy biểu thức cộng tiền chi phí ở chỗ khác → đỏ.
- **Không phân bổ chi phí chuyến vào từng đơn** ở lượt 3 (chuyến gom nhiều đơn; phân bổ theo đầu người/theo đơn là luật tiền mới) — câu **Q9**, xung đột X3.

**Ai xem / sửa** (ô mới):
- `transport.cost.view` — xem chi phí chuyến, bảng kê theo nhà xe: Quản trị, Kế toán, Toàn quyền = `any`; mọi cột khác `none`.
- `transport.cost.adjust` — ghi *điều chỉnh*/*đảo*, bấm "chụp lại": **Kế toán + Toàn quyền** (khuyến nghị — người đối chiếu bảng kê với nhà xe; thận trọng như ADR-0026 H4). Quản trị chỉ **nhập giá** (D1), không sửa chi phí đã chụp. Phương án khác ở Q5.
- **HDV (`FIELD`), tài xế (`DRIVER`), đối tác (`PARTNER`), thực tập (`INTERN`), bán hàng (`SALES`): không bao giờ thấy.** Chi phí chuyến là **giá vốn**: Hiến chương 4.4 (chứng từ không chứa giá vốn), ADR-0026 điều 11 (`OrderDetailDto` không mang giá vốn — proposed), ADR-0019 điều 3 (HDV không đọc bảng giá). Vì `FIELD` có `money.view = assigned`, chi phí chuyến **không bao giờ đi kèm tiền của đơn** trên bất kỳ DTO nào của `orders`. DTO chuyến cho tài xế (1b) dựng từ danh sách trắng không có trường tiền.

**Bất biến hai lớp:**
| Luật | CSDL | Máy chủ |
|---|---|---|
| Chỉ-thêm | trigger cấm `UPDATE`/`DELETE` (khuôn `0017`, `0021`, `vc_expiry_policy_no_update`) | không có đường sửa |
| Dấu theo loại dòng; lý do bắt buộc với điều chỉnh/đảo | `CHECK` theo `kind` | kiểm trước, lỗi tiếng Việt |
| Dòng đảo = âm đúng dòng gốc, mỗi gốc đảo tối đa một lần | trigger chèn + chỉ mục duy nhất một phần trên `reverses_id` | — |
| Mỗi chuyến tối đa **một** dòng *chụp giá* chưa bị đảo | trigger chèn `NOT EXISTS` (chỉ đọc bảng `vc_`) | kiểm trong lô, câu có điều kiện |
| Tổng chi phí chuyến ≥ 0 | trigger chèn (tổng hiện có + dòng mới ≥ 0) | hàm tổng + kiểm trước |
| Chỉ ghi chi phí cho chuyến có bên vận chuyển ≠ công ty chủ | trigger đọc bảng chuyến (`vc_`) + view công bố công ty chủ của `parties` | hàm `ownerCompany` |
| Không ghi *điều chỉnh* cho chuyến đã **chốt vào sổ** trừ qua lô của D3 | trigger (dấu "đã chốt" nằm ở bảng `vc_`, xem D3) | route từ chối 409 |
| Bất biến dữ liệu định kỳ | `audit-invariants`: `R-VC-COST-1` chuyến giao nhà xe có đúng một dòng chụp còn hiệu lực **hoặc** được liệt kê "thiếu giá"; `R-VC-COST-2` dòng đảo khớp gốc; `R-VC-COST-3` không chuyến nào của công ty chủ có dòng chi phí | — |

**Route:**
- *(không có route chụp riêng)* — chụp/đảo nằm **trong lô** của route giao nhà xe / đổi nhà xe / huỷ chuyến của 1b/2; mỗi route đó phải gọi **câu lệnh chưa chạy** do phần chi phí trong cùng module `van-chuyen` cấp.
- `GET /api/van-chuyen/chuyen/:id/chi-phi` (`transport.cost.view`)
- `POST /api/van-chuyen/chuyen/:id/chi-phi/dieu-chinh` (`transport.cost.adjust`, lý do bắt buộc, khoá lạc quan)
- `POST /api/van-chuyen/chuyen/:id/chi-phi/chup-lai` (`transport.cost.adjust`; chỉ khi đang "thiếu giá" hoặc chưa xuất bến)
- `GET /api/van-chuyen/chi-phi?tu=&den=&nha-xe=&trang-thai=` — **bảng kê** chi phí theo nhà xe (hình chiếu đọc, không phải sổ) (`transport.cost.view`)

**Nhật ký** (5.12): mỗi lần chụp/đảo/điều chỉnh một dòng `audit_log` cùng lô: chuyến, nhà xe (id), số tiền trước→sau, lý do mã; không chứa tên/SĐT khách, không chữ tự do dài.

**Hạch toán (khái niệm):** D2 **chưa ghi sổ**. Về nghĩa kế toán, chi phí chuyến đã kết thúc là **chi phí dịch vụ mua ngoài** (giá vốn) mà Tour Đảo **đã chịu** nhưng chưa ghi vào sổ công nợ — bảng kê cho Kế toán thấy "đang có bao nhiêu tiền phải trả nhà xe chưa vào sổ".

**Cửa một chiều:** bảng chỉ-thêm (có dữ liệu thì không đổi cấu trúc dễ); **mốc chụp** (đổi mốc sau này = ADR mới, Hiến chương 5.6). **Hai chiều:** ô quyền, danh mục lý do.

### D3 *(có điều kiện — chỉ quyết khi ADR-0026 và ADR-0024 điều 1–5 đã accepted)*. Công nợ nhà xe trong sổ chung; trả nhà xe

**Điều kiện:** module `billing` và sổ hai chân (`bil_posting`, `bil_debt_line`) của ADR-0026 **đã duyệt và đã thi công lượt 1**. Trước đó D3 chỉ là hướng, không duyệt.

**Dữ liệu** (dùng sổ của ADR-0026, **không** tạo sổ thứ hai — Hiến chương 4.3):
- **Loại dòng nợ mới** (bảng tra cứu của ADR-0026, thêm dòng dữ liệu): *chi phí vận chuyển* — **Tour Đảo nợ nhà xe** (bên nợ = hồ sơ công ty chủ, bên được nợ = nhà xe), số = tổng chi phí chuyến theo hàm của D2.
- **Loại phiếu mới:** *chốt chi phí vận chuyển*.
- **Nguồn của dòng nợ là chuyến, không phải đơn** — ADR-0026 hôm nay đặt `order_id` trên dòng nợ và phân bổ quyết toán **theo đơn** (điều 3, điều 5). Chuyến gom nhiều đơn nên không có "một đơn". Đề xuất **sửa ADR-0026 trước khi nó được duyệt** (nó còn proposed): dòng nợ có **nguồn tổng quát** (loại nguồn + id nguồn) hoặc `order_id` **tuỳ chọn** + cột nguồn chuyến — xung đột X2, câu **Q10**.
- **Dấu "đã chốt"** nằm ở bảng `vc_` (vd cột/bảng "lần chốt chi phí" của `van-chuyen`) để trigger của `vc_` khoá chi phí đã chốt **mà không đọc `bil_`** (Hiến chương 5.3; ADR-0024 điều 4 là tiền lệ `orders` không đọc `bil_`).
- **Trả nhà xe** = phiếu *quyết toán* "công ty đã trả X số Y" của ADR-0026 điều 5, do Kế toán ghi, **phân bổ theo chuyến** (một lần trả nhiều chuyến = nhiều dòng một phiếu).
- **Trả dư / ứng trước cho nhà xe:** Hiến chương 5.9 chỉ nói **khách trả dư**. Trường hợp Tour Đảo trả nhà xe nhiều hơn chi phí (ứng trước, trả nhầm) là **áp dụng mới theo tinh thần 5.9**: không chặn, số dư bên nhà xe nợ lại Tour Đảo hiện rõ là "nhà xe còn nợ lại / trả trước cho nhà xe", xử lý bằng phiếu Kế toán. **Chủ quyết** (câu Q11); không tự mở rộng 5.9.

**Mốc ghi nợ vào sổ** (câu **Q12** — hai hướng, mỗi hướng buộc một chiều phụ thuộc giữa module, **cả hai là cửa một chiều**):
| | (A) Ghi nợ **ngay khi chuyến kết thúc** | (B) Ghi nợ khi **Kế toán chốt** bảng kê (theo kỳ, theo nhà xe) |
|---|---|---|
| Đúng Hiến chương 4.2 "trong cùng lô với sự kiện" | trực tiếp | sự kiện là "Kế toán chốt" (tiền lệ ADR-0026 H3: "Công ty đã nhận" do Kế toán xác nhận) |
| Thận trọng kế toán | **thận trọng hơn**: nợ phải trả ghi sớm, khi gần như chắc chắn phát sinh | nợ vào sổ muộn hơn; nhưng bảng kê D2 vẫn hiện phần "chưa chốt" |
| Sai sót | nhập sai nhà xe/giá → phải ghi dòng đảo trong sổ | Kế toán xem trước, ít dòng đảo |
| Ai bấm | tài xế (có thể là tài xế đối tác) bấm "Kết thúc" sinh ra tiền trong sổ | chỉ Kế toán (`ledger.write`) |
| Chiều module | `van-chuyen → billing` (Vận chuyển lấy câu lệnh chưa chạy của `billing`); `billing` **không** được có khoá ngoại tới bảng chuyến | `billing → van-chuyen` (Kế toán chốt trong `billing`, lấy câu "đánh dấu đã chốt" chưa chạy của `van-chuyen` — đúng khuôn ADR-0024 điều 4); cho phép khoá ngoại từ dòng nợ tới chuyến |
| Chuyến thiếu giá | kết thúc vẫn không ghi được nợ (giữ) → cần đường ghi bù | không chốt được tới khi có giá — tự nhiên |

**Khuyến nghị: (B)** — vì Kế toán là người đối chiếu với bảng kê của nhà xe, sai sót ít đi vào sổ, và tài xế đối tác không bao giờ là người "sinh tiền". **Cái mất** phải nói thẳng: (B) **kém thận trọng hơn** về thời điểm ghi nợ; bù lại bằng bảng kê "chi phí đã phát sinh, chưa chốt" luôn hiện và bất biến `R-VC-COST-4` (dưới) cảnh báo chuyến kết thúc quá N ngày chưa chốt.

**Ai xem / sửa:** `ledger.write` (ADR-0026: Kế toán + Toàn quyền) cho chốt, trả, điều chỉnh sau chốt; `ledger.view` như ADR-0026. **Nhà xe không có "Sổ của tôi"** ở lượt 3 (ADR-0026 để `PARTNER` = `none` lượt 1; tài xế đối tác G8).

**Bất biến hai lớp:** chỉ-thêm của sổ theo ADR-0026 điều 6; thêm vào `audit-invariants`: `R-BIL-VC-1` với mỗi chuyến đã chốt, **tổng dòng nợ *chi phí vận chuyển* của chuyến = `tongChiPhiChuyen` của chuyến**; `R-BIL-VC-2` không chuyến nào chốt hai lần; `R-VC-COST-4` chuyến kết thúc quá N ngày chưa chốt → cảnh báo (không phải vi phạm).

**Route** (nếu B): `GET /api/billing/nha-xe/:id/chua-chot?tu=&den=` (`ledger.view` any); `POST /api/billing/nha-xe/:id/chot` (`ledger.write`; danh sách chuyến + khoá lạc quan); trả nhà xe = route quyết toán của ADR-0026 điều 5, thêm phân bổ theo chuyến.

**Hạch toán (khái niệm, sổ quản trị một sổ — Hiến chương 4.3, không phải sổ thuế):**
- Chốt: **tăng chi phí dịch vụ vận chuyển** (giá vốn) / **tăng phải trả nhà xe**.
- Trả: **giảm phải trả nhà xe** / **giảm tiền** (tiền mặt hoặc ngân hàng).
- Trả dư: phần dư là **khoản trả trước cho nhà xe** (nhà xe còn nợ lại) cho tới khi trừ vào chuyến sau hoặc nhà xe hoàn lại (Q11).

**Cửa một chiều:** chiều phụ thuộc `billing ↔ van-chuyen` (Q12); loại dòng/phiếu đã ghi trong sổ chỉ-thêm; cấu trúc "nguồn" của dòng nợ (Q10).

## 4. Trang ghép (`CLAUDE.md` §9)

**(1) Bảng nào chứa những loại thực thể nào (sau lượt 3):**
| Bảng | Hôm nay chứa | Lượt 3 thêm |
|---|---|---|
| `vc_vehicle` | xe công ty (chủ = công ty chủ); lượt 2 có thể thêm xe nhà xe (G5) | cột **loại xe** (khoá tới danh mục mới) |
| bảng chuyến (1b) | chuyến | khoá **tuyến** (nếu 1b chưa có — G7), có thể **loại xe yêu cầu** (G5), dấu **đã chốt** (D3) |
| danh mục loại xe, danh mục tuyến *(mới, `vc_`)* | — | nhãn tra giá |
| dòng giá thuê *(mới, `vc_` hoặc `prc_` — Q2)* | — | **chính sách tiền** (giá vốn) theo nhà xe |
| dòng chi phí chuyến *(mới, `vc_`)* | — | **tiền đã chụp** (giá vốn) của chuyến thuê |
| `pty_party` / `pty_party_role` | người, tổ chức, công ty chủ, tài xế, đối tác… | *(lượt 2)* vai **nhà xe** — lượt 3 chỉ đọc |
| `bil_debt_line` / `bil_posting` *(ADR-0026, chưa có)* | *(dự kiến)* nợ theo **đơn**: tiền giữ hộ, quyết toán, hoàn khách; lượt 2 hoa hồng, giá vốn nhà cung cấp | **loại mới: nợ theo chuyến** "Tour Đảo nợ nhà xe" + phiếu *chốt chi phí vận chuyển* — **bảng dùng chung nhận một loại dữ liệu mới không gắn đơn** (X2) |
| `audit_log` | mọi hành động | hành động mới: thêm/đóng giá, chụp/đảo/điều chỉnh chi phí, chốt |

**(2) Từng dòng bản đồ quyền chạm các bảng này áp cho loại nào:**
| Ô | Bảng/loại | SALES | ACC | ADMIN | FIELD | PARTNER | SUPER | INTERN | DRIVER |
|---|---|---|---|---|---|---|---|---|---|
| `transport.rate.view` *(mới)* | dòng giá thuê, danh mục tuyến/loại xe | none | any | any | none | none | any | none | none |
| `transport.rate.manage` *(mới)* | như trên (ghi) | none | none | any | none | none | any | none | none |
| `transport.cost.view` *(mới)* | dòng chi phí chuyến, bảng kê | none | any | any | none | none | any | none | none |
| `transport.cost.adjust` *(mới)* | dòng chi phí (điều chỉnh/đảo/chụp lại) | none | any | none | none | none | any | none | none |
| `vehicle.manage` *(có)* | xe (gồm cột loại xe mới) | none | none | any | none | none | any | none | none |
| `ledger.view` *(ADR-0026, chưa có)* | dòng nợ **kể cả loại theo chuyến** | own | any | own | own | none | any | own | **cần quyết** — ADR-0026 chưa có cột `DRIVER`; đề xuất `none` |
| `ledger.write` *(ADR-0026, chưa có)* | chốt, trả nhà xe | none | any | none | none | none | any | none | none |
| `money.view` *(có)* | tiền **đơn** — **không** áp cho chi phí chuyến (bài quét số lạ, §6) | — | — | — | — | — | — | — | — |

- Dòng `ledger.view` = `own` của SALES/ADMIN/FIELD/INTERN (ADR-0026 điều 10) **không** lộ chi phí chuyến vì bên nợ của dòng *chi phí vận chuyển* là **công ty chủ**, không phải hồ sơ của nhân viên nào; nhưng phải có test khẳng định "Sổ của tôi" của mọi nhân viên không trả dòng loại này.
- Cột `DRIVER`: mọi ô mới = `none` — bài ghim cả hàng của ADR-0040 phải vẫn xanh.

**(3) Cổng nào canh cửa nào:**
- Route `/api/van-chuyen/bang-gia*`, `/tuyen`, `/loai-xe`, `/chuyen/:id/chi-phi*`, `/chi-phi`: **cổng văn phòng** (như route 1a), `DRIVER`/`PARTNER`/`FIELD` không qua cổng; thân route hỏi đúng ô ở trên, 403 trước 400.
- Route tài xế của 1b (cổng riêng của tài xế — 1b quyết): DTO danh sách trắng **không** trường tiền.
- Route của `orders` (chi tiết đơn, hàng chờ, biên nhận): **không** đọc bảng chi phí/giá thuê; `orders` không phụ thuộc `van-chuyen`.
- Route `billing` (D3): `ledger.*` trong thân route; chọn A/B ở Q12 quyết cạnh module.

## 5. Chia lát và thứ tự

| Lát | Nội dung | Chờ gì | Việc lớn? |
|---|---|---|---|
| **3a-1** | Danh mục loại xe + tuyến; cột loại xe trên `vc_vehicle`; bảng giá thuê + luật "dòng nào thắng"; ô `transport.rate.*`; màn bảng giá (vẽ trên Claude Design theo ADR-0040) | Lượt 2 có vai nhà xe (G6); Q2, Q3, Q5 | Có (dữ liệu, tiền, quyền) → người kiểm độc lập |
| **3a-2** | Dòng chi phí chuyến, chụp trong lô của route 1b/2, huỷ → đảo, thiếu giá → giữ, điều chỉnh, bảng kê; ô `transport.cost.*`; sổ vàng chi phí | 1b có chuyến + kết thúc (G1–G3); lượt 2 có giao nhà xe/từ chối (G4); 3a-1; Q4, Q6, Q7 | Có |
| **3b** | Chốt vào sổ công nợ, trả nhà xe, trả dư | ADR-0026 + ADR-0024 điều 1–5 accepted **và** thi công lượt 1 của sổ; Q10, Q11, Q12 | Có |
| *(ngoài lượt 3)* | Phân bổ chi phí chuyến vào đơn / lợi nhuận đơn; chi phí xe công ty; giá theo giờ/km; nhà xe tự xem sổ | Q8, Q9 | — |

**Ước lượng: 3 lát** (3a-1, 3a-2, 3b). 3a-1 có thể thi công ngay khi lượt 2 có vai nhà xe, song song với phần chuyến của 1b.

## 6. Tiêu chí nghiệm thu (kiểm được bằng máy; đỏ trước, xanh sau)

1. **Bài số lạ:** gieo số `480.017` vào một dòng giá thuê và một dòng chi phí chuyến; gọi **mọi** route GET mà tài khoản `FIELD`, `DRIVER`, `PARTNER`, `INTERN`, `SALES` vào được (kể cả chi tiết đơn, hàng chờ, biên nhận, "việc của tôi", cuốc xe của tài xế) → JSON không chứa `480017`. Phải thấy đỏ một lần khi thêm tạm trường chi phí vào DTO chuyến của tài xế (P16), rồi ghi dòng `docs/SO-HANG-RAO.md`.
2. **Bài ghim hàng `DRIVER`** (`permissions.test.ts`) vẫn xanh; bốn ô `transport.*` có cột `DRIVER` = `none`.
3. **Mỗi ô mới được máy chủ hỏi** (`permission-enforcement.test.ts`) — không mục hoãn mới trong `docs/quyen-hoan.json`.
4. **Chồng giá:** thêm hai dòng giá cùng (nhà xe, tuyến, loại xe) chồng ngày → route 409 **và** câu `INSERT` chạy tay bị trigger chặn.
5. **Chỉ-thêm:** `UPDATE`/`DELETE` chạy tay trên dòng giá (trừ đặt `valid_to_date` một lần) và trên dòng chi phí → trigger chặn (test migration).
6. **Dòng nào thắng:** bộ ca test thuần cho ba bậc + "không có giá" + ranh ngày hiệu lực (ngày chuyến = `valid_to_date`, ngày chuyến = `valid_from_date`).
7. **Chụp tại mốc:** chụp xong, thêm dòng giá mới có hiệu lực cùng ngày → chi phí chuyến **không đổi**; chụp lại chỉ khi bấm "chụp lại" hoặc đổi nhà xe/tuyến/loại xe trước xuất bến.
8. **Thiếu giá:** giao chuyến cho nhà xe không có giá → không có dòng `amount = 0` nào; chuyến hiện "thiếu giá"; `R-VC-COST-1` liệt kê đúng chuyến đó.
9. **Huỷ trước xuất bến:** dòng chụp bị đảo trong **cùng lô** với câu huỷ (làm hỏng câu huỷ → không còn dòng đảo lẻ).
10. **Một nguồn tính:** hàng rào kiểu `buildlines-guard` — chèn tạm một phép cộng chi phí ngoài `tongChiPhiChuyen` → đỏ.
11. **Hai trục thời gian:** mọi dòng chi phí có ngày phát sinh (ngày VN, `date(x) = x`) và `created_at` UTC; chuyến qua nửa đêm VN lấy ngày VN của giờ bắt đầu (test).
12. **Sổ vàng (5.17):** tệp `golden/van-chuyen-chi-phi.json` (tên đề xuất) — ca tra giá, chụp, điều chỉnh, đảo, huỷ; lát 3b thêm ca "chốt → nợ nhà xe → trả → trả dư". Mọi ca `cho_xac_nhan` cho tới khi chủ/Kế toán xác nhận; `src/so-vang.test.ts` thêm tệp vào `FILES`. Mã tiền chỉ nhận khi qua 100% ca **đã xác nhận**.
13. **Kiến trúc:** `architecture.test.ts` xanh với cạnh mới đúng lựa chọn Q2/Q12, không vòng; không câu SQL nào của `orders` chạm bảng chi phí/giá thuê (EXPLAIN 8(b)); trigger mới chỉ đọc bảng `vc_` hoặc view công bố.
14. **(3b)** `audit-invariants` có `R-BIL-VC-1`, `R-BIL-VC-2`; chèn tạm một dòng nợ lệch tổng chi phí → thoát 1.
15. **Nhật ký:** mọi route ghi tiền của lượt 3 để lại đúng một dòng `audit_log` cùng lô (bài quét nhật ký hiện có mở rộng).

## 7. Tự rà: chỗ mơ hồ, chỗ đụng ADR đã duyệt / đang chờ (chỉ nêu, không tự hoà giải)

- **X1 — Ai sở hữu điều khoản nhà cung cấp.** ADR-0024 điều 1 (**proposed**) giao cho `pricing` (`prc_`) "chính sách có hiệu lực theo ngày: … **điều khoản cung ứng (người bán, nhà cung cấp, a%)**". Giá thuê xe là một điều khoản cung ứng. Đề xuất D1 đặt ở `vc_` → **trái chữ** của ADR-0024 điều 1 (chưa duyệt nên chưa là lệch với văn bản chuẩn tắc, nhưng hai bản đề xuất phải khớp trước khi cùng duyệt). Hai phương án ở Q2.
- **X2 — Sổ của ADR-0026 giả định mọi dòng nợ thuộc một đơn** (`order_id` trên `bil_debt_line`, quyết toán phân bổ theo đơn). Nợ nhà xe thuộc **chuyến gom nhiều đơn**. Đây đúng là trường hợp "bảng dùng chung nhận loại dữ liệu mới" của `CLAUDE.md` §9 (bài học F-01). Khuyến nghị sửa ADR-0026 **trước khi duyệt** (Q10).
- **X3 — Nguy cơ tính chi phí vận chuyển hai lần** (Hiến chương 5.4). Danh mục có dịch vụ "đưa đón sân bay"; lượt 2 của Hoàn tất (D5, `pricing`) có thể gán **giá vốn nhà cung cấp** (a%) cho dòng dịch vụ đó, đồng thời D2 ghi **chi phí thuê** cho chuyến chở chính khách đó. Hai nguồn cho một sự thật. Ảnh hưởng cả `R-BIL-2` ("phần Tour Đảo = giá bán − giá vốn − hoa hồng") và ca `tour_dao_giu` của `golden/hoan-tat-cong-no.json`. Khuyến nghị: dịch vụ đưa đón **không** có giá vốn a% ở D5 khi Tour Đảo tự điều xe; chi phí xe là **chi phí chuyến**, không phải giá vốn của dòng dịch vụ; không phân bổ ở lượt 3 (Q9).
- **X4 — Thời điểm ghi nợ và nguyên tắc thận trọng** (D3, Q12): phương án khuyến nghị (B) **kém thận trọng hơn** (A). Đã nói thẳng ở D3.
- **X5 — Hiến chương 5.9** chỉ nói khách trả dư. Trả dư cho nhà xe là **áp dụng mới** — trình chủ (Q11), không tự mở rộng.
- **X6 — Hiến chương 5.7 (giữ)** chưa có chỗ sống chung (bảng thi hành: "chưa có khái niệm giữ"; rà soát §3 (B) đề nghị một chỗ sống duy nhất cho K9). Lượt 3 dùng "giữ" dạng **suy ra** (không có dòng chụp còn hiệu lực), không tạo cơ chế giữ riêng — nếu 1b dựng cơ chế giữ chung cho xuất bến thì lượt 3 dùng lại.
- **X7 — Mốc chụp:** Hiến chương 5.6 để ADR nghiệp vụ đặt mốc. Đề xuất "lúc giao nhà xe" phụ thuộc G4; nếu lượt 2 có bước "nhà xe nhận", mốc hợp lý hơn là lúc nhận (Q4).
- **X8 — ADR-0026 chưa có cột `DRIVER`** (soạn trước ADR-0040): khi duyệt ADR-0026 phải bổ sung cột này cho mọi ô `ledger.*`/`payment.*` (đề xuất `none`) — không thuộc lượt 3 nhưng lượt 3 chạm.
- **X9 — ADR-0024 điều 5 (trigger chỉ đọc bảng cùng module hoặc view công bố)** còn proposed; Hiến chương 5.3 (đã duyệt) đã nói cùng ý — các trigger D1/D2 tuân theo 5.3, không chờ ADR-0024.
- **Mơ hồ còn lại:** "tuyến" có phải có hai chiều riêng (đi/về giá khác) không — đề xuất coi mỗi chiều là một tuyến riêng (dữ liệu, không cần mã); chuyến chạy nhiều tuyến trong một ngày (thuê xe cả ngày) — ngoài phạm vi "thuê theo chuyến", ghi nhận là **điều chỉnh** tới khi có đơn vị giá mới.

## 8. Câu hỏi cho chủ dự án (gom một lần)

> Giải nghĩa một câu: **"phải trả nhà xe"** là số tiền Tour Đảo **đang nợ** nhà xe cho những chuyến họ đã chạy mà công ty chưa trả; **"trả trước cho nhà xe"** là tiền công ty đã đưa nhà xe **nhiều hơn** số đang nợ, nhà xe coi như còn nợ lại công ty.

**Q1. Có làm phần giá và chi phí xe trước, không chờ sổ công nợ?**
- (a) *Khuyến nghị:* làm trước bảng giá thuê + chi phí từng chuyến (Kế toán in được bảng kê để trả tay); phần "nợ nhà xe trong sổ" làm khi có sổ công nợ. Được: có số chi phí sớm. Mất: tạm thời vẫn trả nhà xe ngoài hệ thống.
- (b) Chờ sổ công nợ, làm cả một lần. Được: một lần duyệt. Mất: chưa có số chi phí xe tới khi sổ xong.

**Q2. Bảng giá thuê xe đặt ở đâu?**
- (a) *Khuyến nghị:* ở phân hệ **Vận chuyển** — giá tra theo tuyến và loại xe, là khái niệm của Vận chuyển. Được: Vận chuyển tự đủ, không phải chờ phân hệ "chính sách giá" (chưa có). Mất: bản đề xuất "đồ thị module" đang chờ duyệt phải sửa một câu (nó định để mọi điều khoản nhà cung cấp ở phân hệ chính sách giá).
- (b) Ở phân hệ **chính sách giá** (chưa xây). Được: mọi giá vốn một chỗ. Mất: phải xây phân hệ đó trước; phân hệ giá phải "biết" tuyến/loại xe của Vận chuyển.

**Q3. Khi nhà xe có cả giá theo tuyến và giá theo loại xe, giá nào thắng?** (giá khớp cả tuyến và loại xe luôn thắng trước)
- (a) *Khuyến nghị:* **giá theo tuyến** thắng giá chỉ theo loại xe (tuyến cụ thể hơn: ví dụ "sân bay Cam Ranh" có giá riêng).
- (b) **Giá theo loại xe** thắng.

**Q4. Chụp giá vào chuyến lúc nào?** (sau lúc đó, đổi bảng giá không đổi tiền của chuyến)
- (a) *Khuyến nghị:* lúc **giao chuyến cho nhà xe** (nếu lượt 2 có bước "nhà xe bấm nhận" thì lúc nhận). Đổi nhà xe/tuyến/loại xe trước khi xe chạy thì máy tự tính lại.
- (b) Lúc **xe xuất bến**. Được: sát thực tế. Mất: nhà xe nhận chuyến mà chưa "chốt" giá.
- (c) Lúc **kết thúc chuyến**.

**Q5. Ai được nhập giá thuê, ai được sửa tiền của một chuyến?**
- (a) *Khuyến nghị:* **Quản trị + Toàn quyền** nhập bảng giá; **Kế toán + Toàn quyền** sửa tiền từng chuyến (có lý do). Kế toán xem được bảng giá; bán hàng, hướng dẫn viên, tài xế, đối tác không thấy gì.
- (b) Kế toán làm cả hai.
- (c) Quản trị làm cả hai.

**Q6. Chuyến thuê xe mà chưa có giá trong bảng: có cho xe chạy không?**
- (a) *Khuyến nghị:* **cho chạy**, chuyến hiện "thiếu giá — chờ nhập giá", không tính 0 đồng; chưa đưa vào sổ nợ được cho tới khi có giá.
- (b) **Không cho giao/xuất bến** tới khi có giá. Được: không bao giờ thiếu. Mất: chặn vận hành vì chuyện giấy tờ tiền.

**Q7. Phí huỷ chuyến với nhà xe:** lượt này ghi tay (Kế toán ghi "phí huỷ muộn", có lý do) — đồng ý? Hay cần bảng "huỷ trước bao nhiêu giờ thì mất bao nhiêu" ngay?
- *Khuyến nghị:* ghi tay trước; làm bảng mốc huỷ sau khi thấy tần suất.

**Q8. Chi phí xe của chính công ty** (xăng, lương tài xế, bảo dưỡng) có thuộc lượt này không?
- *Khuyến nghị:* **không** — lượt 3 chỉ xe thuê ngoài.

**Q9. Tiền xe thuê có cần chia vào từng đơn** (để biết lãi từng đơn) không? Và dịch vụ "đưa đón sân bay" trên đơn: tiền xe tính là chi phí của **chuyến** hay giá vốn của **dịch vụ trên đơn**? (không được tính cả hai)
- (a) *Khuyến nghị:* lượt này **chỉ tính theo chuyến, không chia vào đơn**; tiền xe luôn là chi phí chuyến, dịch vụ đưa đón **không** có thêm giá vốn nhà cung cấp riêng khi Tour Đảo tự điều xe. Chia vào đơn làm sau (cần luật chia: theo đầu người hay theo đơn).
- (b) Chia ngay theo số người của mỗi đơn trên chuyến.

**Q10. Sổ công nợ (bản đề xuất đang chờ duyệt) hiện chỉ cho mỗi dòng nợ gắn với một đơn.** Nợ nhà xe gắn với **chuyến** (một chuyến chở khách của nhiều đơn). Đồng ý sửa bản đề xuất sổ công nợ **trước khi duyệt** để dòng nợ gắn được với chuyến?
- *Khuyến nghị:* **đồng ý** — sửa một lần lúc chưa có dữ liệu thì rẻ; sau khi có dữ liệu là cửa một chiều.

**Q11. Công ty trả nhà xe nhiều hơn số nợ** (ứng trước, trả nhầm): ghi thành "nhà xe còn nợ lại công ty", trừ vào chuyến sau hoặc nhà xe trả lại, do Kế toán ghi — đồng ý? (Luật hiện có chỉ nói trường hợp **khách** trả dư.)
- *Khuyến nghị:* đồng ý.

**Q12. Nợ nhà xe vào sổ lúc nào?**
- (a) Ngay khi chuyến **kết thúc** (máy tự ghi). Được: sổ luôn đủ nợ, thận trọng hơn theo kế toán. Mất: sai giá/sai nhà xe thì phải ghi dòng sửa trong sổ; tài xế bấm "kết thúc" là sinh tiền.
- (b) *Khuyến nghị:* khi **Kế toán chốt** bảng kê của nhà xe (vd cuối tuần/tháng). Được: Kế toán soát trước, sổ sạch. Mất: giữa hai lần chốt, nợ chỉ hiện ở bảng kê "chưa chốt", chưa vào sổ.
- Lưu ý: chọn một trong hai là **quyết định khó đổi** (quyết định chiều phụ thuộc giữa phần Vận chuyển và phần sổ).

## 9. Việc tiếp theo (sau khi chủ trả lời)

1. Điều phối đặt số ADR, chép quyết định đã duyệt vào `docs/adr/` (chủ duyệt), kèm trang ghép §4.
2. Nếu Q10 = đồng ý: người soạn ADR-0026 sửa bản đề xuất đó (dòng nợ có nguồn tổng quát) trước lượt duyệt Hoàn tất; nếu Q2 = (a): sửa câu "điều khoản cung ứng" của ADR-0024 điều 1.
3. Kế hoạch 3a-1 khi lượt 2 đã chốt vai nhà xe; kế hoạch 3a-2 khi 1b và lượt 2 đã duyệt; đối chiếu lại bảng giả định §2.
