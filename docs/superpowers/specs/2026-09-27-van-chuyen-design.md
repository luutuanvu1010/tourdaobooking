# Phân hệ Vận chuyển (xe, tài xế, chuyến xe) — thiết kế

- **Ngày:** 2026-09-27.
- **Vai:** phiên điều phối soạn, sau khi động não với chủ dự án.
- **Trạng thái:** **BẢN NHÁP ĐỂ RÀ SOÁT — CHƯA DUYỆT.** Chưa có ADR. Ba người rà độc lập, chỉ đọc, đang soi bản này:
  - phá thử logic;
  - đối chiếu triết lý Oracle;
  - đối chiếu Hiến pháp, Hiến chương và các ADR.
- **Số giữ chỗ (phải kiểm lại trên mọi nhánh trước khi dùng):**
  - ADR-0037: 0036 đã dùng ở nhánh Thông báo.
  - Migration 0026: 0025 đã dùng ở nhánh Thông báo; 0019 giữ cho B5.
  - Tiền tố module `vc_`: chưa ai dùng hay giữ chỗ.
- **Nguồn:**
  - `docs/ARCHITECTURE.md` Phần I (Hiến chương) và Phần II;
  - `playbook/CONSTITUTION.md` (Hiến pháp v2.3.0);
  - các ADR được nêu tên trong bài;
  - tài liệu gốc của chủ: `CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md`, `CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`;
  - tra cứu pháp lý 27/9 (mục 10).

## 0. Điều chủ dự án đã chốt (2026-09-27, trong phiên chat)

1. **Phân hệ mới, tên "Vận chuyển"**, không nhét vào Phân công (chủ: "vô cùng quan trọng").
2. **Phạm vi:**
   - **Lượt 1:**
     - A: hồ sơ xe;
     - B: điều xe, gom lượt đón, báo thiếu chỗ hoặc trùng giờ;
     - C: tài xế xem lịch trên app.
   - **Lượt 2:** nhà xe đối tác, tài xế đối tác có tài khoản, báo khung giờ bận, từ chối chuyến, thông báo.
   - **Lượt 3:** giá thuê, chi phí, công nợ nhà xe (làm cùng sổ công nợ).
3. **Lịch đón gắn với đơn**, theo một trong hai dạng:
   - dịch vụ kèm đón, ví dụ vé Vinpearl + đón tại khách sạn 80 Trần Phú vào giờ cụ thể;
   - đơn riêng "đưa đón sân bay".
4. **Tài xế tồn tại độc lập như HDV**, có CCCD (số, ngày cấp, nơi cấp) và GPLX (số, hạng, hạn).
   - Tài xế dùng app như nhân viên.
   - Lượt 2: tài xế đối tác cũng được cấp tài khoản, báo khung giờ bận, từ chối chuyến mà đơn gắn cho họ.
5. **Xe đang chạy phải trả lời được:**
   - có hợp lệ không (đủ thủ tục xuất bến, có danh sách khách);
   - ai lái; đã đón khách nào;
   - khởi hành từ đâu, những điểm dừng nào;
   - đã kết thúc chưa, lúc mấy giờ.
6. **Lịch xe:** một xe không chạy hai chuyến cùng giờ; luôn có khoảng nghỉ.
7. **Một chuyến gom khách của nhiều đơn;** tổng người trên xe ≤ số chỗ của xe.
8. **Số chỗ tính mọi người trên xe**, không phân biệt người lớn, trẻ em hay HDV.
   - Số chỗ là **tham số khai trong hồ sơ từng xe**, không cài cứng.
   - Đã áp: hồ sơ ghi "số người được chở, KHÔNG kể tài xế". Giấy cũ ghi 16 chỗ thì nhập 15; giấy mới ghi đúng số in (mục 10).
9. **Chuyến sai điều kiện thì không cho xuất bến.**
10. **Danh mục sửa được, mở rộng bằng cấu hình** (mục 6, đã duyệt).
    - **Quản trị** sửa danh mục; **chỉ Toàn quyền** sửa bộ điều kiện xuất bến.
11. **Danh sách hành khách:** họ tên + năm sinh từng khách, **gắn với đơn**.
    - Văn phòng nhập khi lập đơn; tài xế bổ sung lúc đón.
    - Thiếu danh sách thì không xuất bến.
12. **Mọi giấy tờ của một người ở MỘT chỗ — hồ sơ người.** Chủ chất vấn: "sao CCCD và bằng lái cùng một người mà lưu hai phân hệ?"
    - Phân hệ Vận chuyển chỉ đọc sang, và chỉ giữ luật của riêng nó.
    - **Nguyên tắc: dữ liệu thuộc về người; luật thuộc về phân hệ dùng luật đó.**
13. **Giả định chủ đã đồng ý:**
    - văn phòng điều xe;
    - có cả chiều về;
    - xe đối tác thuê theo chuyến, giá theo tuyến hoặc loại xe (lượt 3).

## 1. Mục tiêu

Văn phòng nhìn một màn hình là biết mỗi lượt đón ngày mai do xe nào, tài xế nào chở; không sót khách; không xếp trùng xe. Tài xế biết lịch của mình. Xe đang chạy trả lời được năm câu ở mục 0.5. Máy **không cho xuất bến** khi thiếu điều kiện.

## 2. Bản thể — thứ gì là gì

Theo Hiến chương 2.2: xếp mỗi khái niệm vào đúng một loại (Thực thể / Vai theo ngữ cảnh / Chính sách / Luật tính) trước khi thiết kế bảng. Cột "Oracle" ghi primitive tương ứng trong Điều 3 của tệp Oracle.

| Khái niệm | Loại (Hiến chương 2.2) | Oracle | Chủ sở hữu | Ghi chú |
|---|---|---|---|---|
| Tài xế | **Vai** DRIVER của một hồ sơ người | Party + Role | `parties` | Như HDV. Mã vai DRIVER đã có sẵn (nhóm OTHER, không sinh quyền — `migrations/0011`:76), phải đưa vào nhóm có quyền (mục 7). |
| Nhà xe đối tác | **Vai** của một hồ sơ tổ chức | Party + Role (nhà cung cấp) | `parties` | Lượt 2. Cấm lập bảng "danh sách nhà cung cấp" riêng (2.1). |
| Tour Đảo (chủ xe công ty) | Hồ sơ tổ chức | Party | `parties` | **Chưa có** hồ sơ `pty_` (chỉ có `company_profile`); chờ T2b / ADR-0024. |
| Giấy tờ của người (CCCD, GPLX, khám sức khoẻ, tập huấn; sau này thẻ HDV, bằng thuyền trưởng) | **Thực thể** thuộc hồ sơ người | Identity / Party credential | `parties` | Một chỗ, một danh mục loại giấy tờ, một chỗ phân quyền (0.12). |
| Loại giấy tờ của người; danh mục hạng GPLX | Bảng tra cứu, sửa được trong app | Reference data | `parties` | Hạng là thuộc tính của giấy; *nghĩa* của hạng (chở bao nhiêu khách) là luật của Vận chuyển. |
| Xe | **Thực thể** (tài nguyên thuộc một bên chủ) | Business Object | `van-chuyen` | Số người được chở (không kể tài xế); có hiệu lực, không xoá cứng. |
| Giấy tờ xe (kiểm định, bảo hiểm, phù hiệu…) | **Thực thể** thuộc xe | Document | `van-chuyen` | Có số, ngày cấp, ngày hết hạn (hoặc không hạn). |
| Nhu cầu đưa đón | Dòng dịch vụ **đã xác nhận** có giờ và nơi hẹn đón | Business Object | `orders` (đọc qua view) | `order_service.pickup_time/pickup_place` là giờ/nơi **hẹn với khách** (ADR-0006:18). |
| Danh sách hành khách | **Thực thể nhẹ của đơn**, KHÔNG phải hồ sơ (ADR-0001 mục 7: khách lẻ trong đoàn không phải hồ sơ) | Business Object line | `orders` | Họ tên, năm sinh, loại khách; dữ liệu cá nhân. |
| Chuyến xe | **Thực thể có vòng đời** | Business Object + Workflow | `van-chuyen` | Xe, tài xế, ngày giờ, trạng thái. |
| Điểm dừng | Thực thể con của chuyến | — | `van-chuyen` | Thứ tự, loại (đón/trả), địa điểm hoặc chữ, giờ dự kiến. |
| Khách trên chuyến | **Vai theo ngữ cảnh**: lượt đón của một dòng dịch vụ trên một chuyến | — | `van-chuyen` | Số người, điểm đón, điểm trả, trạng thái đón. |
| Xuất bến, đã đón, vắng mặt, đã trả, kết thúc, huỷ | **Lệnh** (kiểm luật rồi mới ghi) → **Sự kiện** | Command/Action → Event → Audit | `van-chuyen` + `audit` | Giờ do máy chủ ghi; nhật ký chỉ-thêm. |
| Bộ điều kiện xuất bến; hạng → số khách tối đa; khoảng nghỉ; số ngày nhắc hạn | **Chính sách** (dòng có ngày hiệu lực) | Policy/Rule | `van-chuyen` | Chụp vào chuyến lúc xuất bến (5.6). |
| Kiểm hợp lệ, sức chứa, trùng giờ và nghỉ | **Luật tính** (hàm thuần có test) | Policy engine | `van-chuyen` (và `src/shared/` nếu giao diện cần) | Một hàm cho cả máy chủ và giao diện. |
| Danh sách hành khách của chuyến (in/xuất theo mẫu luật); hợp đồng vận chuyển | **Chứng từ** — hình chiếu có lọc (4.4) | Document | `van-chuyen` | Dựng từ danh sách trường được phép, ở máy chủ. |
| Chi phí thuê xe, công nợ nhà xe | Hình chiếu tiền | Accounting Projection | Lượt 3 (sổ công nợ) | Không làm ở lượt 1. |

## 3. Ranh giới module và phụ thuộc

Theo Hiến chương 5.3, ADR-0002, Phần II.
- **Module mới `van-chuyen`**, hạng STRICT, tiền tố bảng `vc_`, tiền tố view `vc`.
  - Được đọc: view công bố của `parties` (tài xế, giấy tờ, hạng), `orders` (nhu cầu đưa đón, danh sách hành khách, trạng thái và số khách của dòng dịch vụ), `locations` (điểm).
  - Được ghi: nhật ký qua `auditStatement` của `audit`.
  - Chỉ ghi bảng `vc_*`. Lượt 1 không module nào import `van-chuyen`.
- **`parties`:** thêm giấy tờ của người, danh mục loại giấy tờ, danh mục hạng GPLX, và ô quyền xem số CCCD.
- **`orders`:** thêm danh sách hành khách. Tiền tố `ord_` theo Q-AA đã chốt; ADR-0031 chưa soạn — **phụ thuộc**.
- **`locations`:** thêm loại điểm "ga cáp treo", "sân bay", "khách sạn" bằng migration. Đã có "bến tàu" (PIER) và "cảng" (PORT).
- **`dispatch`:** không đổi.
  - Phần loại nhiệm vụ PICKUP/DROPOFF của ADR-0006 (gắn theo một dòng dịch vụ — `migrations/0014`:48) **không** gom được nhiều đơn, nên với **xe đường bộ** được thay bằng Chuyến xe.
  - **BOAT (cano) giữ nguyên.** ADR-0037 ghi rõ câu nào của ADR-0006 bị thay.
- **Luật chạm dữ liệu module khác** (số khách, trạng thái đơn, giấy tờ của tài xế) **không giữ được bằng trigger chéo module** (5.3). Thay vào đó giữ ba lớp:
  1. kiểm ở máy chủ lúc ghi;
  2. kiểm lại bằng MỘT hàm thuần "trạng thái hợp lệ của chuyến" lúc xuất bến và mỗi lần đọc;
  3. câu kiểm dữ liệu định kỳ (`scripts/audit-checks.mjs`).
  - Sổ hàng rào phải ghi đúng: đây là luật chéo module, không phải rào CSDL (P16).

## 4. Luồng (lượt 1)

1. **Chuẩn bị.**
   - Quản trị nhập xe (biển số, số người được chở, chủ xe) và giấy tờ xe.
   - Văn phòng lập hồ sơ tài xế (vai DRIVER, tài khoản app) và giấy tờ của tài xế.
   - Toàn quyền đặt bộ điều kiện xuất bến.
2. **Nhu cầu.**
   - Văn phòng lập đơn có dịch vụ đưa đón (giờ, nơi hẹn đón; nơi trả) cùng danh sách hành khách.
   - Chỉ **đơn đã xác nhận** mới được xếp lên chuyến. Lý do: đơn nháp khi sửa bị xoá–tạo lại dòng dịch vụ (`src/modules/orders/repository.ts`:679, chỉ khi `status = 'draft'`).
3. **Điều xe (văn phòng).** Màn "Lịch xe ngày D":
   - bên trái: các lượt đón chưa xếp;
   - bên phải: các chuyến.
   - Tạo chuyến (xe, tài xế, giờ dự kiến bắt đầu và kết thúc) → kéo lượt đón vào → điểm dừng gợi ý theo nơi đón, sắp thứ tự (đón… → trả).
   - Máy kiểm liên tục và hiện lý do: sức chứa, trùng giờ và khoảng nghỉ, hạng bằng, giấy tờ, danh sách hành khách.
4. **Xuất bến.**
   - Bấm "Xuất bến" thì máy kiểm **toàn bộ** điều kiện:
     - **Sai:** chặn, hiện lý do. Chuyến bị **giữ** — Hiến chương 5.7, lần áp đầu tiên của nguyên tắc "giữ".
     - **Đúng:** máy chủ ghi giờ xuất bến và **chụp** bộ điều kiện đã dùng (5.6).
5. **Trên đường.** Tài xế bấm theo từng lượt đón: "Đã đón" / "Vắng mặt", rồi "Đã trả" ở điểm trả.
6. **Kết thúc.**
   - Tài xế bấm "Kết thúc chuyến"; máy chủ ghi giờ kết thúc.
   - Chuyến sau của xe chỉ xuất bến được khi đã đủ khoảng nghỉ tính từ giờ kết thúc **thật**.
7. **Huỷ, sự cố.**
   - Huỷ chuyến chỉ khi chưa xuất bến, kèm lý do.
   - Sự cố sau khi xuất bến (hỏng xe, chuyển khách sang xe khác): *để người rà đề xuất*.
8. **Đơn đổi sau khi đã xếp** (đổi số khách, huỷ): chuyến hiện cảnh báo. Xuất bến bị chặn khi vượt chỗ, hoặc khi khách đã huỷ vẫn còn trên chuyến.

## 5. Luật — bản đầu, sẽ siết sau rà soát

Nhãn tầng giữ: **[CSDL]** trigger/khoá duy nhất/CHECK · **[MC]** máy chủ kiểm lúc ghi · **[ĐL]** kiểm lại lúc xuất bến và mỗi lần đọc · **[ĐK]** câu kiểm dữ liệu định kỳ.

- **L1 — Sức chứa.** Tổng người trên xe **ở mọi đoạn đường** ≤ số người được chở của xe. Tổng người = khách mọi lứa tuổi + HDV đi cùng. [MC][ĐL]
- **L2 — Không trùng giờ, đủ khoảng nghỉ.** Không chuyến nào của cùng một xe, hay cùng một tài xế, có khoảng [bắt đầu dự kiến − nghỉ, kết thúc dự kiến + nghỉ] chồng lên nhau. Ghi bằng câu có điều kiện `NOT EXISTS` + `changes()` trong một lô (khuôn "chốt Nhận"). [MC có điều kiện nguyên tử][ĐK]
- **L3 — Hạng bằng.** Hạng GPLX của tài xế, theo bảng hạng → số khách tối đa đang hiệu lực, **≥ số người được chở của xe** (luật tính theo loại xe, không theo số khách thực tế). [MC][ĐL]
- **L4 — Giấy tờ còn hạn tới hết chuyến.** Mọi giấy tờ mà bộ điều kiện đòi (của xe và của tài xế) phải còn hạn tới **giờ kết thúc dự kiến**, không chỉ lúc xuất bến. [MC][ĐL]
- **L5 — Danh sách hành khách đủ.** Mỗi lượt đón trên chuyến: số người có tên + năm sinh = số khách của lượt đó. [ĐL]
- **L6 — Chỉ đơn đã xác nhận.** Lúc xếp lên chuyến, dòng dịch vụ phải thuộc đơn đã xác nhận. Đơn bị huỷ sau khi xếp → chặn xuất bến tới khi gỡ ra. [MC][ĐL]
- **L7 — Trạng thái chuyến chỉ đi tiến:** Lên lịch → Đã xuất bến → Đã kết thúc; Huỷ chỉ từ Lên lịch. [CSDL trigger][MC]
- **L8 — Giờ sự kiện do máy chủ ghi.** Thao tác của tài xế mang mã yêu cầu chống trùng (bấm nhiều lần, mất sóng). [MC]
- **L9 — Chụp bộ điều kiện.** Mỗi chuyến lưu kết quả kiểm lúc xuất bến: điều kiện nào, của phiên bản nào, giấy tờ nào đã dùng — dạng **dòng có kiểu, không JSON** (5.2). [MC][CSDL chỉ-thêm]
- **L10 — Không xoá cứng.** Xe, giấy tờ, tài xế đã từng gắn chuyến chỉ được đóng hiệu lực (5.5). Danh sách hành khách lưu ≥ 3 năm (mục 10). [CSDL]

*(Phần phá thử sẽ bổ sung: máy trạng thái của điểm dừng và khách trên chuyến, sự cố giữa đường, lệch giờ hẹn với giờ xe tới, chuyến qua nửa đêm, v.v.)*

## 6. Cấu hình (chủ duyệt 27/9)

**Phép thử cho chủ:** app không cần hiểu ý nghĩa của giá trị → danh mục sửa được; app phải xử lý khác nhau theo giá trị → cố định trong mã, đổi bằng ADR (Hiến chương 2.2).

- **Sửa trong app, có ngày hiệu lực, có nhật ký:**
  - loại giấy tờ xe (có hạn hay không);
  - loại giấy tờ của người (ở `parties`);
  - hạng GPLX, và bảng hạng → số khách tối đa không kể tài xế (bảng này là luật của Vận chuyển);
  - bộ điều kiện xuất bến: dòng "áp cho [mọi xe / xe từ N khách / xe công ty / xe thuê] → bắt buộc [loại giấy tờ của xe hoặc của tài xế] còn hạn", kèm hai công tắc "phải có hợp đồng vận chuyển" và "phải đủ danh sách hành khách";
  - khoảng nghỉ tối thiểu giữa hai chuyến (phút);
  - số ngày nhắc trước khi giấy tờ hết hạn.
- **Người sửa:** Quản trị (`admin.manage`) sửa danh mục; Toàn quyền (`settings.ops`) sửa bộ điều kiện xuất bến và các con số chính sách.
- **Mẫu bảng:** theo `loc_location` — cột dấu vết, `active`, khoá lạc quan, `can()` viết thẳng trong route, nhật ký cùng lô. Chính sách dùng ngày hiệu lực (ADR-0003:20-24).
  - Khác 9 bảng tra cứu hiện có (chỉ sửa bằng migration, được miễn kiểm ở `src/architecture.test.ts`:220-223), các bảng này là bảng nghiệp vụ đầy đủ.
- **Cố định trong mã, đổi bằng ADR:**
  - trạng thái và luồng của chuyến;
  - công thức kiểm (L1–L6);
  - ô quyền;
  - cách bảo vệ dữ liệu cá nhân.
- **Để sau:** danh mục "loại xe", giới hạn giờ lái (cần ghi giờ lái thật), lý do từ chối/báo bận (lượt 2 dùng danh sách chung), tự thêm loại điểm trong app.
- **Khoảng nghỉ là chính sách dữ liệu, hợp luật.** Phần II (`docs/ARCHITECTURE.md`:214) chỉ nói khoảng ngày cho phép nằm ở mã chứ không ở `CHECK` của SQL; nó không cấm chính sách có ngày hiệu lực. Phần I 2.2 và 5.2 (tầng cao hơn) đòi chính sách là dòng có ngày hiệu lực.

## 7. Quyền và dữ liệu cá nhân

- **Quyền app mới "Tài xế" (DRIVER):**
  - Tài xế chỉ thấy chuyến được giao, và chỉ những trường cần để đón khách: tên, SĐT người liên hệ, nơi/giờ đón, số khách, danh sách hành khách của chính chuyến đó. Dựng bằng DTO danh sách trường được phép, như `src/modules/orders/pool.ts`.
  - **Không** mở rộng `can(assigned)` hiện có, vì phạm vi đó hôm nay chỉ sinh từ HANDLE.
  - **Lượt 1:** tài xế công ty ở nhóm nội bộ.
  - **Lượt 2:** tài xế đối tác. Phải sửa luật LC-1 của ADR-0018, vì người ngoài hiện bị ép thành PARTNER (bên đặt) (`migrations/0024`:75-79).
- **Ô quyền dự kiến:**
  - điều xe (tạo, sửa, huỷ chuyến): văn phòng — *cần chủ chọn nhóm cụ thể*;
  - xem chuyến: văn phòng xem hết, tài xế xem chuyến được giao;
  - cập nhật tiến độ chuyến: tài xế của chuyến. Có thể thay ô chết `task.progress` trong `docs/quyen-hoan.json` (hạn 30/11);
  - quản lý xe: Quản trị;
  - cấu hình: như mục 6.
- **CCCD:** chỉ nhóm được phép xem đủ số; danh sách hiện số đã che; tài xế xem giấy của chính mình; số không bao giờ vào nhật ký (5.12).
- **Danh sách hành khách:** văn phòng; tài xế chỉ thấy khách của chuyến mình. Lưu ≥ 3 năm; không xoá cứng.
- **Không xây trên lỗ đang hở:** `docs/quyen-hoan.json` mục `phat_hien` rỗng (27/9).

## 8. Quyết định cần duyệt

Mỗi lượt duyệt tối đa 3 quyết định chạm dữ liệu/quyền, kèm trang ghép (CLAUDE.md §9).

- **ADR-0037, lượt duyệt A:**
  1. phân hệ Vận chuyển + thực thể Chuyến xe (thay PICKUP/DROPOFF đường bộ của ADR-0006);
  2. quyền app Tài xế + các ô Vận chuyển;
  3. giấy tờ của người ở `parties` + bảo vệ CCCD.
- **Lượt duyệt B:** danh sách hành khách trên đơn (`orders`), phụ thuộc ADR-0031 / tiền tố `ord_`.
- **Trang ghép cần có:**
  - `audit_log` nhận các hành động mới của chuyến;
  - `pty_*` nhận loại dữ liệu mới (giấy tờ);
  - `orders` nhận loại dữ liệu mới (hành khách);
  - mỗi dòng bản đồ quyền chạm các bảng đó áp cho loại nào.

## 9. Phụ thuộc, rủi ro, câu hỏi mở

- **Chủ xe công ty:** Tour Đảo chưa là hồ sơ tổ chức (T2b, gói dọn nền). Lượt 1 dùng cột "xe của công ty"; nối vào hồ sơ khi T2b xong.
- **Danh sách hành khách** phụ thuộc ADR-0031 (`ord_`).
- **Pháp lý chưa chắc:** ghép khách của nhiều đơn vào một xe hợp đồng. NĐ 158/2024 Đ7k3: xe hợp đồng từ 8 chỗ phải thuê cả xe kèm lái. Chủ sẽ hỏi Sở GTVT hoặc luật sư. App vẫn hỗ trợ; "có hợp đồng vận chuyển của chuyến" là một mục cấu hình xuất bến.
- **Thứ tự thi công:** sau khi lượt 1 ADR-0030 gộp (`orders`, `dispatch` đang được sửa); giao diện chờ bản vẽ Claude Design.
- **Câu hỏi mở cho người rà:**
  - một đơn có nhiều lượt đưa đón (đi + về);
  - HDV đi cùng tính vào chỗ ra sao khi HDV không có trên danh sách khách;
  - khách vắng mặt thì chuyến kết thúc thế nào;
  - xe hỏng giữa đường.

## 10. Nguồn pháp lý mặc định (tra 2026-09-27, chưa có người chuyên môn kiểm — chủ xác nhận)

- **Giấy tờ xe:**
  - kiểm định (xe kinh doanh 3–24 tháng tuỳ tuổi xe);
  - BH TNDS bắt buộc 1–3 năm (đã gồm hành khách);
  - phù hiệu "XE HỢP ĐỒNG", 1–7 năm;
  - giám sát hành trình (mọi xe);
  - camera người lái (xe ≥ 8 chỗ ngay; xe < 8 chỗ từ 1/1/2028);
  - đăng ký xe, giấy phép kinh doanh vận tải: không ghi hạn.
- **Giấy tờ tài xế:** GPLX; khám sức khoẻ 12 tháng; tập huấn nghiệp vụ vận tải 5 năm.
- **Hạng GPLX → số khách tối đa, không kể tài xế (LTT 2024 Đ57):**

  | Hạng | Số khách tối đa |
  |---|---|
  | B | 8 |
  | D1 | 16 (tài xế từ 24 tuổi) |
  | D2 | 29 |
  | D | không giới hạn |
  | Hạng cũ B2, C | 8 |
  | Hạng cũ D | 29 |
  | Hạng cũ E | không giới hạn |

- **Mỗi chuyến xe hợp đồng:**
  - hợp đồng vận chuyển (giấy hoặc điện tử);
  - danh sách hành khách (họ tên, năm sinh, số hợp đồng), lưu ≥ 3 năm;
  - chỉ đón/trả tại điểm ghi trong hợp đồng;
  - từ 1/1/2028 gửi dữ liệu hợp đồng cho Bộ Công an trước chuyến.
- **Giờ lái:** lái liên tục ≤ 4 giờ, nghỉ ≥ 15 phút.
- **Số chỗ:** giấy cũ "16 chỗ" = 15 khách + tài xế; mẫu mới ghi số không kể lái; trẻ em mỗi em một người.
- **Văn bản:** LTT 2024, Luật Đường bộ 2024, NĐ 158/2024, NĐ 218/2026, TT 36/2024/TT-BGTVT, TT 30/2026/TT-BXD. Đường dẫn ở bộ nhớ dự án `reference-quy-dinh-van-tai-khach`.
