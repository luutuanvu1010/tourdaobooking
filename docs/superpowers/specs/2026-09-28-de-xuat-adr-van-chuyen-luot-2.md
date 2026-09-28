# Đề xuất ADR — Vận chuyển lượt 2: nhà xe đối tác, tài xế đối tác, báo bận, từ chối chuyến, thông báo

- **Ngày:** 2026-09-28.
- **Vai:** người soạn thiết kế (lập kế hoạch). Không viết mã, không tự duyệt (Hiến pháp N3, P15).
- **Trạng thái:** **BẢN ĐỀ XUẤT — CHƯA DUYỆT, CHƯA CÓ NGƯỜI KIỂM ĐỘC LẬP.**
  - **Chưa lấy số ADR.** Tệp không nằm trong `docs/adr/`. Số ADR đặt lúc chủ duyệt, theo bảng giữ chỗ ở `docs/adr/README.md`. Lưu ý: nhánh `thong-bao-tat-dung-may` (chưa gộp) đã dùng số 0046, nên số kế tiếp trên main chưa chắc là 0046.
  - **Chưa lấy số migration.** Số đặt sau khi lượt 1b có số. Lúc đó kiểm mọi nhánh và worktree chưa gộp (`CLAUDE.md` §10).
- **Nguồn đã đọc (chỉ đọc):**
  - `CLAUDE.md` §2, §3, §9;
  - `docs/ARCHITECTURE.md` Phần I;
  - ADR-0040 (lượt 1a, accepted, đã lên production bản 1.35);
  - `docs/adr/README.md`;
  - bản nháp `docs/superpowers/specs/2026-09-27-van-chuyen-design.md` và bản rà `…-van-chuyen-ra-soat.md`;
  - ADR-0014, ADR-0018, ADR-0019, ADR-0030, ADR-0034, ADR-0036;
  - ADR-0046 (accepted, **chỉ có ở nhánh `thong-bao-tat-dung-may`, chưa gộp main**);
  - mã tại main `3bb73f0`: `src/shared/roles.ts`, `src/shared/permissions.ts`, `src/shared/thong-bao.ts`, `src/modules/van-chuyen/`, `src/modules/parties/index.ts`, `src/modules/thongbao/`, `src/architecture.test.ts`, `migrations/0011`, `0024`, `0025`, `0031`, `0033`.
- **Không xây trên lỗ an ninh đang hở.** `docs/quyen-hoan.json` mục `phat_hien` rỗng (kiểm 2026-09-28 trên `3bb73f0`). Mục `thao_tac` còn 6 ô hoãn (`task.progress`, `dispatch.guides.view`, `payment.*`, `invoice.*`); không ô nào thuộc đề xuất này.
- **Xây trên nền chưa có (Hiến chương 5.13): lượt 1b** (chuyến xe, phân bổ khách, xuất bến), đang được soạn song song. D3, D4, D5 và một phần D2 phụ thuộc 1b (mục 3). Hai quyết định không phụ thuộc 1b (D1, D2 phần vai và quyền) được tách thành một lượt duyệt riêng, duyệt và thi công trước được.

---

## 0. Tóm tắt cho chủ (lời thường)

- **Nhà xe đối tác** là một hồ sơ (công ty hoặc cá nhân) mang công việc "Nhà xe đối tác". Xe thuê của họ nhập vào cùng danh sách xe, chủ xe là nhà xe đó. Tài xế của nhà xe nối với nhà xe bằng quan hệ "Tài xế của", có ngày bắt đầu và kết thúc.
- **Tài xế đối tác có tài khoản riêng, loại quyền riêng "Tài xế đối tác"**, tách khỏi "Tài xế công ty" và khỏi "Đối tác" (bên đặt đơn). Họ chỉ thấy chuyến được xếp cho mình. Không thấy tiền, đơn hàng, danh mục giá, hồ sơ người khác, và không nhận tin gửi "Toàn công ty".
- **Từ chối chuyến:** tài xế bấm Từ chối, chọn lý do có sẵn, trước một hạn chót. Chuyến quay về "chưa có tài xế", văn phòng nhận thông báo và xếp người khác. Qua hạn chót thì gọi văn phòng. Cách làm giống hướng dẫn viên Từ chối đơn.
- **Báo bận:** tài xế tự ghi khung giờ bận. Văn phòng không xếp được chuyến vào khung đó. Không báo bận được đè lên chuyến đã nhận; muốn bỏ chuyến thì phải Từ chối.
- **Thông báo:** tài xế nhận tin khi được xếp, bị gỡ, hoặc chuyến của mình đổi giờ hay bị huỷ. Văn phòng điều xe nhận tin khi tài xế Từ chối. Tin không chứa tên khách, số điện thoại hay số giấy tờ.
- **Giá thuê xe để lượt 3.** Lượt 2 chỉ ghi lại "chuyến này do nhà xe nào chở", đủ để lượt 3 gắn giá vào.
- **Bạn cần:** trả lời 7 câu ở mục 6 (mỗi câu có khuyến nghị), rồi duyệt hai lượt:
  - lượt I: D1, D2 — duyệt được ngay;
  - lượt II: D3, D4, D5 — duyệt sau khi thiết kế lượt 1b đã duyệt.

---

## 1. Điều chủ đã chốt (không hỏi lại)

Nguồn: bản nháp thiết kế §0 (2026-09-27); lời giao việc của điều phối 2026-09-28; ADR-0040 D3.

1. **Lượt 2** gồm: nhà xe đối tác, tài xế đối tác, báo bận, từ chối chuyến, thông báo.
2. Có thể thuê xe của nhà xe đối tác, nhiều xe. Xe đối tác thuê **theo chuyến**, giá theo tuyến hoặc loại xe. **Giá thuộc lượt 3**; lượt 2 chỉ để chỗ gắn.
3. **Tài xế đối tác** được cấp tài khoản, được báo khung giờ bận, được **Từ chối** chuyến gắn cho họ, giống luồng Từ chối của hướng dẫn viên (ADR-0030).
4. **Văn phòng điều xe.**
5. ADR-0040 D3: "Lượt 2: Tài xế đối tác (nhóm bên ngoài) + sửa LC-1 (ADR-0018) để người ngoài không bị ép thành bên đặt." Mã vai hồ sơ cũ `DRIVER` "giữ để lượt 2 quyết; không gán mới".
6. **Dữ liệu thuộc về người; luật thuộc về phân hệ dùng luật đó** (bản nháp §0.12). Giấy tờ của tài xế đối tác ở `parties`, cùng chỗ với tài xế công ty.
7. Giao diện: chủ vẽ trên Claude Design, rồi làm đúng bản vẽ (tiền lệ ADR-0040).

**Chủ nói thêm 2026-09-28 tối** (điều phối chuyển lời, nguyên ý). Yêu cầu: "đúng Hiến pháp và triết lý Oracle (TCA: Bên / vai / tài sản tách bạch)".

8. **Vận chuyển vừa là dịch vụ độc lập** (chuyến lẻ ngoài tour), **vừa là thành phần trong chuỗi dịch vụ** (vé Hòn Tằm kèm đón từ khách sạn ra cảng, một hoặc hai chiều). Lượt 1b soạn mô hình chặng/chuyến chung cho cả hai; **lượt 2 dùng lại mô hình đó**. Mọi luật lượt 2 (Từ chối, báo bận, thông báo, nhà xe) áp cho **mọi chuyến**, bất kể chuyến sinh từ đâu (giả định G1b-11).
9. **Phương tiện là thực thể độc lập**, là tài sản của công ty **hoặc** của đối tác (nhà xe).
   - Xe của nhà xe có **hồ sơ xe riêng** như xe công ty.
   - Chủ xe là hồ sơ nhà xe mang vai phù hợp.
   - ADR-0040 D1 hiện ghi chủ xe = công ty chủ. Mở cho đối tác là **quyết định mới của lượt 2 (D1)**; đề xuất này nêu rõ, không sửa ADR-0040.
10. **Xe và tài xế đều có hồ sơ riêng.** Tài xế đối tác là **hồ sơ người**, giấy tờ ở hồ sơ người (dùng lại mô hình giấy tờ của lượt 1a), gắn với nhà xe qua quan hệ và vai.

Các điểm 8–10 đã được áp vào D1, D2 và mục 3; không hỏi lại.

---

## 2. Hiện trạng mã liên quan (tra ở `3bb73f0`, chỉ đọc)

| Điều | Ở đâu | Hệ quả cho lượt 2 |
|---|---|---|
| Vai tài khoản: 8 nội bộ + 5 bên ngoài; mọi vai bên ngoài sinh đúng quyền `PARTNER` | `src/shared/roles.ts:7-43` | Chưa có vai "Tài xế đối tác". `TAXI_DRIVER` "Tài xế taxi" là **bên đặt** (mang khách tới), không phải người lái chuyến của Tour Đảo. |
| LC-1 ở mã: `EXTERNAL_ALLOWED = ["PARTNER"]` | `src/shared/roles.ts:49`; `effectivePermissions` `:75`; `roleAssignmentProblem` `:130` | Tài khoản bên ngoài hôm nay chỉ giữ được `PARTNER`. |
| LC-1 ở CSDL: trigger `lc1_stf_permission_external_partner_only`, chỉ chạy khi CHÈN quyền | `migrations/0024:75-79` | Muốn cho người ngoài giữ quyền tài xế thì phải **bỏ và tạo lại** trigger bằng migration mới. Không sửa tệp 0024. |
| LC-3: một hồ sơ không giữ cùng lúc vai nội bộ và vai bên ngoài | trigger `pty_party_role_group_conflict_*`, `migrations/0024:33-46` | Tài xế đối tác (bên ngoài) không thể đồng thời là nhân viên. Đạt sẵn. |
| Quyền app: 8 mã, `DRIVER` thêm cuối | `src/shared/permissions.ts:5` | Mã mới phải thêm **cuối** (cột thứ 9) để thứ tự cũ không đổi. |
| Cột `DRIVER`: mọi ô nghiệp vụ `none`; ngoại lệ có tên là `feedback.*` và `party.document.view = own` | `permissions.ts:52-104` | Ô `party.document.view` mở "mọi tài khoản nội bộ" theo Ruling R5 ("Mọi nhân viên"). |
| Định nghĩa "Toàn công ty": `laNoiBo = có ít nhất một quyền khác PARTNER` | `src/shared/thong-bao.ts:45-46` (ADR-0034 điều 6) | **Nếu tài xế đối tác mang `DRIVER`, họ nhận mọi tin "Toàn công ty"** của Tour Đảo. Đây là lý do chính phải có mã quyền riêng (D2). |
| `can()` chỉ đọc mã quyền, không đọc vai | `permissions.ts:148`; R-N1-12; ADR-0018 điều 3 | Mọi khác biệt giữa tài xế công ty và tài xế đối tác phải nằm ở **cột quyền**, không ở vai. |
| `holdsPartner`: đường quản trị cũ gán được `PARTNER` kèm quyền nội bộ mà LC-1 không chạy | `permissions.ts:195` | Luật "tài khoản lai" phải viết theo **mã quyền**, ở cả CSDL, không chỉ ở hàm gán vai. |
| Xe: `vc_vehicle.owner_party_id` là khoá tới `pty_party`; lượt 1a chỉ nhận công ty chủ | `migrations/0033:29-53`; `van-chuyen/index.ts` (`NO_OWNER`) | Mở cho nhà xe **không cần đổi cột**, chỉ đổi luật và thêm lớp CSDL. |
| Quan hệ giữa hai hồ sơ: bảng có hiệu lực, cấm chồng lấn, `CHECK (from_party_id <> to_party_id)`; hiện chỉ có loại `CONTACT_OF` | `migrations/0011:106-135` | "Tài xế của nhà xe" là một **loại quan hệ mới**. Nhà xe cá nhân tự lái xe mình không nối được với chính mình (xem D1). |
| Mã vai hồ sơ cũ `DRIVER` "Tài xế", nhóm OTHER, đã ngưng | `migrations/0011:76`, `0031:12` | Lượt 2 phải chốt số phận (D1). Production có dòng nào mang mã này hay không: **chưa kiểm** (mục 8). |
| Giấy tờ sắp hết hạn của tài xế: hàm công bố `expiringDriverDocuments` lọc theo vai "Tài xế công ty" | `src/modules/parties/index.ts:82-91` | Thêm tài xế đối tác = **đổi hợp đồng công bố** của `parties` (D1). |
| `thongbao` chỉ phụ thuộc `audit`, `orders`, `dispatch`, `staff`; ADR-0040 D1 ghi "không module nào import `van-chuyen`"; đọc view cũng tính là cạnh | `src/architecture.test.ts:19-42`, `:294-316` | `thongbao` không đọc được dữ liệu chuyến trực tiếp. `van-chuyen` cũng không import được `thongbao` nếu sau này `thongbao` cần chuyến (sẽ thành vòng). |
| Gõ cửa màn hình khoá cho tin đơn: route gọi `ctx.baoThayDoi` → **gốc lắp ráp** đọc `orders` + `dispatch` rồi gọi `dayGoCua` của `thongbao`. `parties` biết tài khoản của hồ sơ qua hàm tiêm `partyAccount` | `src/index.ts:1-11`, `:52-100` | D5 dùng đúng khuôn **hàm tiêm từ gốc lắp ráp**, không thêm cạnh module. |
| Quyền tài khoản là dòng có hiệu lực: đóng bằng `valid_to_at`, không xoá | `src/modules/staff/repository.ts:34`, `:80-81` | Trigger tài khoản lai (D2) chỉ được đếm dòng **đang mở**; thứ tự "đóng cũ → mở mới" khi đổi vai phải kiểm. |
| Nhật ký: `audit_log(order_id, staff_id, action, target_type, target_id, detail, created_at)`; tin về đơn là hình chiếu qua view `v_aud_order_event` | `migrations/0007:6-15`, `0025:53-56` | Không lấy người nhận từ chữ trong `detail` (ADR-0030 điều 3: không phân tích chữ chi tiết). |
| Chuyến xe, phân công tài xế, danh sách hành khách | **chưa có** (lượt 1b) | Mục 3. |

---

## 3. Giả định về lượt 1b và chỗ phải chờ 1b

Mỗi giả định có hai phần: điều lượt 2 cần, và việc phải đổi nếu 1b chốt khác. Tên bảng, tên ô dưới đây là **tên giả định**; tên thật theo 1b.

| # | Giả định về 1b | Nếu 1b làm khác |
|---|---|---|
| G1b-1 | **"Ai lái chuyến" là một DÒNG PHÂN CÔNG có hiệu lực** (giả định `vc_trip_driver`): chuyến, hồ sơ tài xế, mở lúc, đóng lúc, người đóng, **mã lý do đóng** (tập đóng `CHECK`). Mỗi chuyến tối đa một dòng mở (chỉ mục duy nhất một phần). Đổi tài xế = đóng dòng cũ, mở dòng mới. (Bản rà C4: "tài xế gắn thẳng vào chuyến thì đổi người sẽ ghi đè 'ai lái'".) | Nếu 1b để một cột "tài xế" trên chuyến: Từ chối mất lịch sử, trigger D3 không có chỗ đặt. Lượt 2 phải thêm bảng này và di trú dữ liệu, thành việc lớn riêng. **Đề nghị 1b dùng dòng phân công ngay từ đầu.** |
| G1b-2 | Chuyến (giả định `vc_trip`) có trạng thái tập đóng, ít nhất *lên lịch / đã xuất bến / đã kết thúc / đã huỷ*, chỉ đi tiến. Giờ bắt đầu và kết thúc **dự kiến** lưu được dạng so sánh số (Phần II: mốc so sánh số học lưu INTEGER), có một hàm đổi giờ VN ↔ UTC có test. | Hạn chót Từ chối (D3) và luật chồng lịch bận (D4) phải đổi theo cột thật. Nếu giờ chỉ là chữ giờ VN thì trigger D3, D4 không so được: lùi về lớp máy chủ và khai lệch 5.1. |
| G1b-3 | **Bên vận chuyển = chủ xe của chuyến, được chụp vào chuyến.** Chụp ở cột riêng lúc xếp xe, hoặc trong bản chụp lúc xuất bến (L9). Đây là **chỗ gắn duy nhất** lượt 3 cần để gắn giá thuê. | Nếu 1b không chụp: lượt 2 thêm cột `carrier_party_id` vào chuyến (migration chỉ-thêm) và chụp lúc xếp xe. Giá không bao giờ suy lại từ chủ xe **hiện tại**, vì xe có thể đổi chủ (ADR-0040 D1). |
| G1b-4 | Ô "xem chuyến" (giả định `trip.view`) có phạm vi `assigned` nghĩa là **"đang có dòng lái mở trên chuyến này"**, tính trong `van-chuyen`. Không nới `can(assigned)` của `HANDLE` (bản nháp §7). Chuyến không phải của mình → 404, không lộ là chuyến có tồn tại (khuôn ADR-0030 S23-4). | Lượt 2 chỉ thêm cột `DRIVER_PARTNER` vào đúng ô 1b đặt, không đổi cách tính phạm vi. |
| G1b-5 | Ô "điều xe" (giả định `trip.dispatch`: tạo, sửa, xếp xe và tài xế, huỷ chuyến). Nhóm văn phòng được giữ ô này do 1b chốt. | Lượt 2 dùng đúng nhóm này cho "quản lý lịch bận" (D4) và cho người nhận tin Từ chối (D5). |
| G1b-6 | Tài xế xem chuyến qua **DTO danh sách trắng dựng ở máy chủ** (Hiến chương 4.4). Tên, năm sinh khách và SĐT người liên hệ lấy qua **hàm phần hẹp của `orders`** (bản rà C7), không qua view. | Mốc "mở danh sách khách" của D2/D3 áp vào đúng DTO đó. Nếu 1b cho tài xế công ty thấy ngay khi xếp, lượt 2 chỉ đổi cho cột `DRIVER_PARTNER`. |
| G1b-7 | Route của tài xế nằm sau cổng `staff` + `can()` trong thân route, hoặc sau một **cổng mới khai tường minh** (ADR-0019 điều 1). | Nếu 1b lập cổng mới thì lượt 2 thêm `DRIVER_PARTNER` vào danh sách cổng đó, và sửa bài khoá cổng trong cùng commit. |
| G1b-8 | Luật chồng lịch L2 (xe và tài xế) nằm ở **một hàm thuần** + trigger trên dữ liệu `vc_` (bản rà H6). | D4 thêm "khung bận" như một khoảng chặn vào cùng hàm và cùng trigger. Nếu 1b chỉ kiểm ở máy chủ, D4 vẫn thêm trigger riêng cho phần khung bận. |
| G1b-9 | Chuyến có **mã hiển thị cho người** (không phải uuid). Nhật ký của chuyến ghi `target_type = 'trip'`, `target_id = <id chuyến>`, `detail` không có tên, SĐT, năm sinh (bản rà H8). | D5 cần mã hiển thị để viết tin; cần `target_type` để dựng view sự kiện. |
| G1b-10 | Tài xế công ty (`DRIVER`) ở 1b đã có ô xem chuyến của mình. Chưa có Từ chối, báo bận, thông báo. | Nếu 1b đã làm thông báo xếp chuyến cho tài xế công ty, D5 chỉ mở rộng sang `DRIVER_PARTNER`. |
| G1b-11 | **Một mô hình chặng/chuyến chung** cho vận chuyển độc lập (chuyến lẻ) và vận chuyển là thành phần của dịch vụ khác (vé kèm đón một hoặc hai chiều) — chủ nói 28/9 tối. Chuyến không phân biệt nguồn ở mức dòng lái, xe, trạng thái. | Nếu 1b tách hai loại chuyến thành hai bảng, D3–D5 phải áp cho cả hai: hai trigger, hai nguồn sự kiện. Đề nghị 1b giữ một bảng chuyến. |
| G1b-12 | **Xe đối tác** (chủ xe là nhà xe) dùng chung bảng xe và luật xếp xe của 1b; 1b không giả định "mọi xe là của công ty" (điều phối cũng đang báo 1b điểm này). | Nếu 1b có luật chỉ đúng với xe công ty (vd bộ điều kiện xuất bến "xe công ty / xe thuê"), lượt 2 phải bổ sung nhánh xe đối tác. |

**Người soạn 1b cần xác nhận G1b-1 trước tiên**: dòng phân công tài xế có hiệu lực. D3, D4, D5 đều đứng trên nó. Sau đó tới G1b-3 (chụp bên vận chuyển) và G1b-11, G1b-12 (một mô hình chuyến; xe đối tác dùng chung luật xe).

**Chỗ phải chờ 1b:**
- **Chờ ADR 1b được duyệt:** D3, D4, D5 và phần D2 về ô xem chuyến/DTO. Lượt duyệt II trình sau đó.
- **Chờ 1b thi công xong:** lát 3–6 (mục 9).
- **Không chờ:** D1 và D2 phần vai, quyền, LC-1, tài khoản lai, "Toàn công ty". Lượt duyệt I trình và thi công ngay được (lát 1–2).

---

## 4. Chia lượt duyệt (tối đa 3 quyết định chạm quyền/dữ liệu mỗi lượt — `CLAUDE.md` §9)

| Lượt duyệt | Quyết định | Phụ thuộc | Trang ghép |
|---|---|---|---|
| **I** | D1 Nhà xe đối tác, xe đối tác, tài xế thuộc nhà xe · D2 Vai + quyền "Tài xế đối tác", sửa LC-1, chặn tài khoản lai, sửa nghĩa "Toàn công ty" | không chờ 1b | mục 5.I |
| **II** | D3 Từ chối chuyến · D4 Báo bận · D5 Thông báo chuyến | chờ ADR 1b duyệt | mục 5.II |

---

## D1. Nhà xe đối tác, xe đối tác, tài xế thuộc nhà xe

**Hiến chương áp:** 2.1 (Bên trước vai: nhà xe là vai của hồ sơ, cấm bảng "danh sách nhà cung cấp" riêng), 2.2, 5.1, 5.3 (trigger của `van-chuyen` đọc view công bố của `parties`), 5.5, 5.6 (chụp bên vận chuyển, G1b-3), 5.12.

### Dữ liệu
- **Vai hồ sơ mới "Nhà xe đối tác"** (mã đề xuất `CARRIER`) trong `pty_role_type`, **nhóm `OTHER`**: không sinh quyền, không gắn tài khoản. Gắn cho hồ sơ tổ chức (công ty vận tải) **hoặc** hồ sơ người (nhà xe cá nhân). Nhà xe có đăng nhập hay không: câu Q5.
- **Loại quan hệ mới "Tài xế của"** (mã đề xuất `DRIVES_FOR`) trong `pty_relationship_type`: từ hồ sơ **người** (tài xế) tới hồ sơ **nhà xe**, có ngày bắt đầu và kết thúc (bảng `pty_party_relationship` sẵn có, sẵn luật cấm chồng lấn). Một tài xế thuộc được **nhiều** nhà xe cùng lúc (tài xế tự do chạy cho nhiều nơi).
- **Nhà xe cá nhân tự lái xe mình:** bảng quan hệ cấm nối một hồ sơ với chính nó. Luật: *tài xế T thuộc nhà xe X* ⇔ **T = X** (hồ sơ người đó vừa mở vai Nhà xe, vừa mở vai tài khoản Tài xế đối tác) **hoặc** T có quan hệ "Tài xế của" đang mở tới X. Luật này công bố **một lần** ở `parties`, bằng hàm công bố và view (đề xuất `v_pty_carrier_driver`: khoá nhà xe, khoá tài xế). Nơi khác không tự viết lại.
- **Xe đối tác** (chủ đã chốt, mục 1 điểm 9–10: phương tiện là thực thể độc lập, tài sản của công ty hoặc của nhà xe; Bên / vai / tài sản tách bạch theo TCA):
  - mỗi xe của nhà xe có **hồ sơ xe riêng** trong cùng bảng `vc_vehicle`, cùng giấy tờ xe `vc_vehicle_document`, cùng luật biển số, số khung, số người chở;
  - `owner_party_id` trỏ tới **công ty chủ** hoặc **hồ sơ đang mở vai Nhà xe**. Không thêm cột;
  - đây là **quyết định mới** so với ADR-0040 D1 ("chủ xe = công ty chủ"); không sửa ADR-0040, ADR lượt 2 ghi "bổ sung".
- **Tài xế đối tác** là **hồ sơ người** (không phải bảng tài xế riêng). Giấy tờ ở hồ sơ người. Gắn với nhà xe bằng quan hệ "Tài xế của" (hoặc chính là hồ sơ nhà xe cá nhân) và mang vai tài khoản "Tài xế đối tác" (D2).
- **Chuyển chủ xe** (xe công ty bán cho nhà xe, hoặc ngược lại): **không làm ở lượt 2** (ADR-0040 D1: "chuyển chủ xe là việc riêng").
- **Nhà xe thôi hợp tác** = đóng vai Nhà xe. Không tự đóng quan hệ, không tự đổi trạng thái xe. Xe và tài xế của nhà xe đã thôi **không xếp được lên chuyến mới** (luật ở D1 bất biến B1.4, áp khi 1b có chuyến).
- **Giấy tờ của tài xế đối tác:** cùng bảng giấy tờ của người (`pty_person_document`, ADR-0040 D2), cùng luật che số và nhật ký không số. Không bảng mới.
- **Danh sách giấy tờ sắp hết hạn:** mở rộng hàm công bố `expiringDriverDocuments` sang tài xế đang mở vai tài khoản "Tài xế đối tác" (**đổi hợp đồng công bố** của `parties`; đổi hàm và test trong cùng commit). Giấy tờ xe đối tác đã tự có trong danh sách (cùng bảng xe). Mỗi dòng thêm nhãn chủ xe hoặc nhà xe để văn phòng biết gọi ai.
- **Mã vai hồ sơ cũ `DRIVER` "Tài xế"** (nhóm OTHER, đã ngưng ở 0031): **giữ ngưng vĩnh viễn, không dùng lại cho nghĩa nào**. Không migration đổi dòng cũ. Nếu production có hồ sơ mang mã này (**chưa kiểm**, mục 8), Quản trị gán lại vai đúng bằng tay rồi đóng dòng cũ. Không đổi tự động, vì không biết người đó là tài xế công ty, tài xế đối tác hay tài xế taxi.
- **Không có cột tiền, không danh mục "loại xe", không "tuyến"** ở lượt 2. Đó là dữ liệu của lượt 3 (mục 7).

### Ô quyền
- **Không thêm ô mới.**
  - Quản lý xe đối tác và giấy tờ xe đối tác: `vehicle.manage` (Quản trị + Toàn quyền, như xe công ty).
  - Tạo hồ sơ nhà xe: `party.write`.
  - Gán vai "Nhà xe", mở/đóng quan hệ "Tài xế của": route vai/quan hệ của hồ sơ, **cổng `admin`** (ADR-0019 điều 1) + `admin.manage`.
  - Giấy tờ của tài xế đối tác: `party.document.write` / `party.document.reveal` (Quản trị + Toàn quyền; Quản trị theo luật cấp bậc với hồ sơ gắn tài khoản, Ruling R8 của 1a).

### Bất biến hai lớp
| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B1.1 | Chủ xe ∈ {công ty chủ, hồ sơ đang mở vai Nhà xe} lúc thêm xe và lúc đổi `owner_party_id` | trigger `BEFORE INSERT` / `BEFORE UPDATE OF owner_party_id` trên `vc_vehicle`, đọc view công bố mới của `parties` (hồ sơ đang mở vai Nhà xe; công ty chủ đang hiệu lực). Cạnh `van-chuyen → parties` đã có | route xe trả **409** mã riêng (vd `vehicle_owner_not_carrier`), khác mã lỗi của lớp CSDL (tiền lệ R15 của 1a) |
| B1.2 | Quan hệ "Tài xế của": đầu *từ* là hồ sơ **người**, đầu *tới* đang mở vai Nhà xe lúc mở quan hệ | trigger `BEFORE INSERT` trên `pty_party_relationship` khi loại là `DRIVES_FOR` (bảng của chính `parties`) | route quan hệ trả 409 |
| B1.3 | Không xoá cứng xe, quan hệ, vai | sẵn có (trigger 1a, bảng quan hệ không có đường xoá) | sẵn có |
| B1.4 | Xe đối tác chỉ lên chuyến khi chủ xe **còn** mở vai Nhà xe vào ngày chạy; tài xế đối tác chỉ lái xe của nhà xe mà họ đang thuộc (luật "thuộc" ở trên; Q6) | trigger trên dòng phân công xe/tài xế của 1b (G1b-1), đọc `v_pty_carrier_driver` | hàm thuần kiểm chuyến của 1b (thêm hai điều kiện) |
| B1.5 | (phát hiện) Chuyến tương lai còn dùng xe hoặc tài xế của nhà xe đã thôi | — | câu kiểm mới ở `audit-invariants` (báo, không chặn) |

### Route
- `POST /api/van-chuyen/xe`, `PUT /api/van-chuyen/xe/:id`: nhận thêm `ownerPartyId`, mặc định là công ty chủ như hôm nay.
- `GET /api/van-chuyen/xe`: thêm lọc theo chủ xe.
- `GET /api/van-chuyen/nha-xe` (mới, cổng `office` + `can(vehicle.manage)`): danh sách nhà xe đang hợp tác, số xe, số tài xế. Dữ liệu nhà xe lấy qua **hàm công bố** của `parties`, không đọc bảng `pty_`.
- Vai và quan hệ: route sẵn có `POST /api/parties/:id/roles`, `POST /api/parties/:id/relationships` (cổng `admin`).

### Thông báo
Không có.

### Cửa
- **Hai chiều:** mã vai `CARRIER`, loại quan hệ `DRIVES_FOR` (là dòng danh mục, ngưng được), luật "thuộc".
- **Một chiều (nhẹ):** xe đối tác và quan hệ đã ghi không xoá được (5.5), chỉ đóng.

### Câu của ADR đã duyệt bị thay hoặc bổ sung
- ADR-0040 D1, gạch "chủ xe": "Lượt 1a: hồ sơ công ty chủ" → **thêm** "hoặc hồ sơ đang mở vai Nhà xe đối tác".
- ADR-0040 D1, gạch "một hàm công bố" về giấy tờ của người: hàm mở rộng sang tài xế đối tác (vẫn không số).
- ADR-0040 D3, gạch mã vai cũ `DRIVER`: **chốt** "ngưng vĩnh viễn".

---

## D2. Tài xế đối tác: vai, quyền app riêng, sửa LC-1, chặn tài khoản lai, sửa nghĩa "Toàn công ty"

**Hiến chương áp:** 2.3 (điều khoản trên vai, không trên tài khoản), K4 (quyền qua `can()`), 4.4 (DTO danh sách trắng), 5.1, 5.12. Hiến pháp 8.2, 8.5 (mặc định từ chối).

### Dữ liệu
- **Vai tài khoản mới "Tài xế đối tác"** (mã đề xuất `DRIVER_EXTERNAL`), **nhóm `EXTERNAL`**, `handles: "never"`, `superAdminOnly: false`, bộ quyền mặc định `["DRIVER_PARTNER"]`. Quản trị gán ở màn Quản lý tài khoản như các vai bên ngoài khác.
- **Quyền app mới "Tài xế đối tác"** (mã đề xuất `DRIVER_PARTNER`), thêm **cuối** bản đồ quyền (cột thứ 9), cùng một dòng trong `stf_permission_type`.
- **Vì sao không dùng lại `DRIVER`** (quyết định, không phải câu hỏi):
  1. `laNoiBo` coi mọi quyền khác `PARTNER` là "Toàn công ty", nên tài xế đối tác sẽ nhận tin nội bộ.
  2. Ô `party.document.view` của `DRIVER` mở theo lời chủ "Mọi nhân viên" (Ruling R5); dùng lại là kéo giãn một ô chủ chỉ duyệt cho nhân viên.
  3. `can()` không đọc vai (ADR-0018 điều 3, R-N1-12), nên chỗ nào hai loại tài xế khác nhau thì phải khác nhau ở cột quyền: mốc mở SĐT khách (Q1), tin nội bộ.
  4. Lớp CSDL của LC-1 chỉ thấy mã quyền. Muốn chặn "người ngoài giữ quyền nhân viên" thì mã quyền phải khác.
- **Phương án bị loại:**
  - dùng lại `DRIVER` rồi kiểm vai trong route: trái ADR-0018 điều 3;
  - dùng lại `PARTNER`: `PARTNER` là bên đặt (lập đơn, xem tiền đơn của mình, ADR-0018 điều 9), sai nghĩa và mở quá rộng.

### Ô quyền (cột `DRIVER_PARTNER`)
- **Mọi ô nghiệp vụ hiện có = `none`**, trừ các ngoại lệ có tên:
  - `feedback.submit = any`, `feedback.view = own` (như mọi tài khoản);
  - `party.document.view = own`: xem giấy tờ **của chính mình**, số che, để tự biết hạn bằng lái. Đây là **mở rộng** ô ADR-0040 D2 ra ngoài "mọi tài khoản nội bộ"; chủ duyệt D2 là duyệt điểm này;
  - ô xem chuyến của 1b (G1b-4) = `assigned`;
  - ô mới của D3, D4 (xem ở đó).
- **Bài ghim cả hàng** như hàng Đối tác và hàng `DRIVER`: sau này thêm ô mới thì cột này mặc định `none`, muốn mở phải sửa bài ghim trong cùng commit.
- **Cổng:** `DRIVER_PARTNER` **không** vào `office`, `orders`, `admin`. Chỉ vào `staff` (tự phục vụ: đổi PIN, Face ID, thông báo, góp ý, giấy tờ của mình) và cổng tài xế của 1b nếu có (G1b-7). Bài khoá cổng (`src/shared/cong-quyen.test.ts`) thêm khẳng định này.
- **Tài xế đối tác THẤY** (DTO danh sách trắng ở máy chủ, chỉ cho chuyến mình đang có dòng lái mở):
  - mã chuyến, ngày, giờ dự kiến bắt đầu và kết thúc, trạng thái chuyến;
  - biển số và tên xe của chuyến;
  - điểm dừng: thứ tự, loại (đón/trả), tên địa điểm. Nơi đón chữ tự do **che mọi dãy từ 8 chữ số** (khuôn Q-N, ADR-0030 S23-2);
  - số người mỗi điểm;
  - **từ mốc mở danh sách (Q1) tới hết ngày kết thúc chuyến (giờ VN):** họ tên + năm sinh hành khách (luật bắt buộc xe mang danh sách), tên + SĐT người liên hệ của từng lượt đón;
  - giấy tờ của chính mình, số che.
- **Tài xế đối tác KHÔNG THẤY:**
  - mọi con số tiền: giá đơn, tiền thu, chiết khấu, và giá thuê xe của lượt 3, **kể cả của chuyến mình**;
  - đơn hàng, Trang chủ, mã và chi tiết đơn, tên bên đặt hay đại lý, ghi chú nội bộ;
  - danh mục dịch vụ và giá;
  - hồ sơ người khác; số giấy tờ đầy đủ, kể cả của mình;
  - chuyến của tài xế khác, kể cả cùng nhà xe; lịch bận của người khác;
  - danh sách khách và SĐT **ngoài** khung thời gian ở trên;
  - tin "Toàn công ty".
- **Dữ liệu đi vào máy tài xế:** hàng đợi ngoại tuyến chỉ giữ lệnh, không giữ danh sách khách (bản rà A mục 4; bất biến "không lưu đệm `/api/*`").

### LC-1 mới và luật tài khoản lai
- **LC-1 (thay ADR-0018 điều 5, vế LC-1):** tài khoản mang vai bên ngoài **chỉ giữ quyền bên ngoài** = tập `{PARTNER, DRIVER_PARTNER}`. Tập này là **một hằng** dùng chung, thay `EXTERNAL_ALLOWED`. Vai "Tài xế đối tác" sinh `DRIVER_PARTNER`; mọi vai bên ngoài khác vẫn sinh `PARTNER`.
- **LC-1b, tài khoản lai (mới):** tài khoản giữ `DRIVER_PARTNER` thì **không giữ quyền nào khác**, cả `PARTNER` lẫn quyền nội bộ.
  - Tiền lệ: ADR-0030 chặn tài khoản lai Đối tác khỏi hàng chờ và khỏi Nhận đơn.
  - Lý do: tài khoản vừa là bên đặt vừa là người lái sẽ thấy danh sách khách của đơn người khác trên cùng một chuyến, và nhận được cả luật giá lẫn luật chuyến. Chặn bây giờ rồi nới sau thì rẻ; cho phép bây giờ rồi siết sau thì phải tách tài khoản đang có.
  - Chủ chọn ở **Q4**.
- **Hai lớp:**

| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B2.1 | LC-1 mới: tài khoản có vai bên ngoài đang mở chỉ giữ `PARTNER` hoặc `DRIVER_PARTNER` | migration mới: **bỏ** `lc1_stf_permission_external_partner_only` và **tạo lại** với tập mới. Không sửa tệp 0024 | `effectivePermissions`, `roleAssignmentProblem` (`roles.ts`) |
| B2.2 | LC-1b: `DRIVER_PARTNER` đứng một mình | trigger mới `BEFORE INSERT ON stf_permission`, hai chiều, **chỉ đếm dòng đang mở** (`valid_to_at IS NULL`): chèn `DRIVER_PARTNER` khi đang có quyền khác → ABORT; chèn quyền khác khi đang có `DRIVER_PARTNER` → ABORT. Lô đổi quyền phải **đóng dòng cũ trước, mở dòng mới sau**; kế hoạch kiểm thứ tự câu ở module `staff` | một hàm thuần kiểm cho **mọi** đường ghi quyền: gán vai; `POST /api/staff` không kèm vai; `PUT /api/staff/:id/permissions`. Đây là đường cũ mà `holdsPartner` nêu. `roleAssignmentProblem` từ chối **trước** trigger, với câu dễ hiểu, khi một hồ sơ được gán cùng lúc "Tài xế đối tác" và một vai bên ngoài khác (vd "Tài xế taxi") |
| B2.3 | (phát hiện) Không tồn tại tài khoản vi phạm B2.1, B2.2 | — | câu kiểm mới ở `audit-invariants` |

- **Thứ tự phát hành:**
  - migration nới LC-1 chỉ **cho phép thêm** `DRIVER_PARTNER`, mã cũ chưa cấp mã này nên an toàn;
  - migration và mã lên cùng lần phát hành, migration chạy trước (quy trình `npm run trien-khai`).

### Sửa nghĩa "Toàn công ty" (ADR-0034 điều 6)
- `laNoiBo` = có **ít nhất một quyền không thuộc tập quyền bên ngoài** (cùng hằng với LC-1), thay cho "khác `PARTNER`".
- Hệ quả:
  - tài xế công ty (`DRIVER`) vẫn nhận tin "Toàn công ty";
  - tài xế đối tác không nhận.
- Tin thủ công gửi riêng cho mọi tài xế đối tác được, bằng nhóm `quyen:DRIVER_PARTNER` (cơ chế sẵn có).
- **Bảng tin (ADR-0022):** `DRIVER_PARTNER` không có `order.view` hay `dispatch.claim`, nên kết nối chỉ mang nhãn `nguoi:<id>`, không `tat-ca`, không `cho-nhan`. Không đổi luật Bảng tin.
- **Thông báo màn hình khoá (ADR-0036 điều 1):** "mọi tài khoản" bật được, gồm tài xế đối tác. ADR-0046 (accepted, nhánh chưa gộp): đổi vai hay quyền không tắt máy. Nội dung tin tính lúc đọc theo quyền hiện tại, nên tài xế bị đóng vai không đọc thêm được gì. Ngưng tài khoản vẫn tắt mọi máy.

### Route
- Không route mới riêng cho D2.
- `GET /api/auth/me` trả mã quyền mới.
- `GET /api/parties/documents/mine` (cổng `staff`) mở cho `DRIVER_PARTNER` nhờ ô `party.document.view = own`.
- Route xem chuyến của 1b mở theo G1b-4, G1b-7.

### Thông báo
Không có. Phần sửa `laNoiBo` là luật người nhận, nằm ở D2 vì nó là luật quyền.

### Cửa
- **Một chiều:** mã quyền `DRIVER_PARTNER` và mã vai `DRIVER_EXTERNAL`, **một khi đã có tài khoản mang chúng**: đổi tên hay gộp phải di trú dữ liệu quyền.
- **Hai chiều:** từng ô của cột (đổi được bằng ADR + phát hành), LC-1b (nới được sau), nghĩa `laNoiBo`.

### Câu của ADR đã duyệt bị thay
| Nguồn | Câu cũ | Mới |
|---|---|---|
| ADR-0018 điều 2 | "Mười một vai … Bên ngoài: Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên" | thêm vai bên ngoài **"Tài xế đối tác"**. ADR-0040 đã thêm "Tài xế công ty" ở nhóm nội bộ |
| ADR-0018 điều 5, LC-1 | "tài khoản bên ngoài chỉ giữ quyền Đối tác" | "… chỉ giữ quyền bên ngoài (Đối tác **hoặc** Tài xế đối tác); Tài xế đối tác đứng một mình" |
| ADR-0018 điều 9 | "Mọi thực thể bên ngoài là **bên đặt**" | "Mọi thực thể bên ngoài là bên đặt, **trừ Tài xế đối tác** (người lái chuyến, không đặt đơn)" |
| ADR-0034 điều 6 | `noi-bo` = "có ít nhất một quyền khác `PARTNER`" | "… có ít nhất một quyền **không thuộc tập quyền bên ngoài**" |
| ADR-0040 D2, ô "xem giấy tờ của chính mình" | "mọi tài khoản nội bộ" | thêm Tài xế đối tác (của mình, số che) |
| ADR-0040 D3, gạch "Lượt 2" | "sửa LC-1 để người ngoài không bị ép thành bên đặt" | thi hành bằng D2 này |

---

## D3. Tài xế Từ chối chuyến

**Hiến chương áp:** 1.2 (một lô), 5.1, 5.5, 5.7 (chuyến mất tài xế thì bị **giữ** ở bước xuất bến), 5.8 (quyền Từ chối theo **vai trên chính chuyến**: đang lái chuyến đó), 5.12.

**Khuôn: ADR-0030 điều 1–2, chép từng điểm.**

### Dữ liệu
- Không bảng mới. Dòng phân công tài xế của 1b (G1b-1) có:
  - **mã lý do đóng** (tập đóng `CHECK`): `REFUSED` (tài xế từ chối), `REASSIGNED` (văn phòng đổi), `TRIP_CANCELLED`, và các mã 1b cần;
  - **mã lý do Từ chối** (tập đóng, **không ô chữ**, ADR-0030 điều 2):
    - "Bận lịch khác";
    - "Ốm / việc riêng";
    - "Xe không chạy được" (chỉ có nghĩa với xe đối tác, hiện cho mọi tài xế cho gọn);
    - "Khác";
  - **hồ sơ người đóng dòng**.
- Nếu 1b chưa có hai cột lý do, lượt 2 thêm bằng migration chỉ-thêm.
- Hạn chót Từ chối là **chính sách có ngày hiệu lực** (bảng chính sách `vc_`, khuôn `vc_expiry_policy` của 1a), Toàn quyền sửa (`settings.ops`). Giá trị mặc định: câu Q2.
- **Không đếm, không hạn mức số lần Từ chối.** Hạn mức cho hướng dẫn viên thuộc ADR-0032, chưa soạn; lượt 2 không làm bản thứ hai. Nhật ký đủ để đếm sau.

### Ô quyền
- **Ô mới `trip.refuse`:**
  - `DRIVER_PARTNER = assigned`;
  - `DRIVER = assigned` hoặc `none` (câu Q3);
  - `SUPER_ADMIN = any` (ADR-0014 điều 2);
  - mọi cột khác `none`.
- Route thêm **chốt riêng "người gọi đang lái chuyến này"**, áp cả Toàn quyền, không đạt thì 403. Tiền lệ ADR-0030 điều 1: Toàn quyền không Từ chối thay; muốn đổi người thì văn phòng dùng điều xe.
- Chuyến không phải của mình: **404**, không lộ chuyến có tồn tại (G1b-4).

### Luồng (một lô ghi)
1. Kiểm ô và chốt "đang lái". Lý do thiếu hoặc ngoài danh sách → **400**.
2. Một `db.batch`:
   - (a) câu đóng dòng lái **có điều kiện**: đúng chuyến; đúng hồ sơ người gọi; dòng còn mở; chuyến còn "lên lịch"; bây giờ ≤ giờ bắt đầu dự kiến − hạn chót. Ghi lý do đóng `REFUSED`, mã lý do Từ chối, người đóng = người gọi;
   - (b) nhật ký `trip_driver_refused` với điều kiện `changes() > 0` của câu (a). Chi tiết chỉ gồm mã chuyến và mã lý do; không tên, không biển số khách, không SĐT.
3. `changes() = 0` thì đọc lại để trả đúng lỗi:
   - đã quá hạn → **409** "Đã quá hạn từ chối, hãy gọi văn phòng để đổi người";
   - chuyến đã xuất bến, kết thúc hoặc huỷ → **409**;
   - vừa bị văn phòng đổi người → **409 `stale`**.
   Lệnh tới trước thắng; không dòng nào đổi.
4. Sau lô: chuyến **không có tài xế**, suy từ việc không có dòng lái mở, **không thêm cột trạng thái** (tiền lệ ADR-0030 điều 3). Văn phòng thấy "Tài xế <tên> đã từ chối lúc … — <lý do>", đọc từ dòng đã đóng (dữ liệu có cột, không phân tích chữ nhật ký). Chuyến bị **giữ** ở bước xuất bến tới khi có tài xế (5.7; cổng xuất bến của 1b đã đòi có tài xế, G1b-2).
5. Thông báo văn phòng (D5), phát **sau** khi lô thành công (5.10).
6. Sau khi Từ chối, tài xế mở lại chuyến → 404 như chuyến người khác.

### Bất biến hai lớp
| # | Bất biến | Lớp CSDL (mọi dữ liệu là `vc_`, cùng module) | Lớp máy chủ |
|---|---|---|---|
| B3.1 | Dòng lái chỉ đi tiến: mở → đóng; không mở lại; không sửa dòng đã đóng; không xoá | trigger `BEFORE UPDATE` / `BEFORE DELETE` | câu ghi có điều kiện |
| B3.2 | Đóng với lý do `REFUSED` thì người đóng = tài xế của dòng | trigger `BEFORE UPDATE` so `NEW.closed_by_party_id = OLD.driver_party_id` khi `NEW.close_reason = 'REFUSED'` | chốt "đang lái" |
| B3.3 | Đóng với lý do `REFUSED` chỉ khi chuyến còn "lên lịch" và chưa qua hạn chót | trigger đọc trạng thái chuyến + giờ bắt đầu dự kiến + chính sách hạn chót đang hiệu lực, so với `datetime('now')` | câu ghi có điều kiện (bước 2a) + hàm thuần tính hạn chót có test |
| B3.4 | Mã lý do Từ chối có khi và chỉ khi lý do đóng là `REFUSED` | `CHECK` trên dòng | hàm kiểm thân yêu cầu |
| B3.5 | (phát hiện) Chuyến trong 48 giờ tới chưa có tài xế | — | câu kiểm định kỳ (khuôn "khách bị bỏ quên" của bản rà A) |

**Rủi ro kỹ thuật của B3.3:** trigger dùng giờ hiện tại của CSDL, khó giả lập giờ trong test. Nếu thi công chứng minh không kiểm được bằng test, vế "hạn chót" lùi về lớp máy chủ và **khai lệch có chủ ý 5.1, phạm vi hẹp** (mẫu ADR-0029/ADR-0030 điều 4), điều kiện gỡ ghi rõ. Chủ duyệt D3 là duyệt luôn phương án dự phòng này.

### Route
- `POST /api/van-chuyen/chuyen/:id/tu-choi` — thân `{ lyDo }`. Cổng theo G1b-7, rồi `can(trip.refuse, { assigned })` + chốt "đang lái". Ghi cần `Origin` cùng site.
- Danh sách lý do là **hằng trong mã dùng chung** (khuôn `CANCEL_REASONS`), không route, không bảng.

### Thông báo
Văn phòng điều xe (D5).

### Cửa
- **Một chiều:**
  - mỗi lần Từ chối (dòng đóng không mở lại, nhật ký chỉ-thêm);
  - **dữ liệu khách tài xế đã xem trước khi Từ chối**. Q1 khuyến nghị mở danh sách khách **sau** hạn chót Từ chối, để không có kiểu "xem rồi trả" (bài học ADR-0030).
- **Hai chiều:** danh sách lý do, giá trị hạn chót (chính sách), ô `trip.refuse` của `DRIVER`.

---

## D4. Báo bận của tài xế (khung không sẵn sàng)

**Hiến chương áp:** 2.2 (khung bận là thực thể có vòng đời), 5.1, 5.5, 5.12.

**Phạm vi gọn** (chủ giao "tài xế báo bận"; ghi nhớ dự án: "đơn giản, không cầu kỳ"): chỉ **tài xế tự báo, tự rút**; văn phòng **chỉ xem**. **Để sau, không làm ở lượt 2:** khung bận của **xe** (xe đã có trạng thái "bảo dưỡng" từ lượt 1a), văn phòng ghi thay hay rút thay. Bảng được thiết kế để thêm hai việc đó sau bằng migration chỉ-thêm, không dựng lại.

### Dữ liệu
- **Bảng mới của `van-chuyen`** (đề xuất `vc_unavailability`). Cột:
  - hồ sơ tài xế;
  - bắt đầu, kết thúc: mốc so sánh số học, và giờ VN để hiện;
  - lý do, tập đóng, **không ô chữ**:
    - "Việc riêng";
    - "Ốm";
    - "Khác";
  - rút lúc, rút bởi;
  - đủ cột dấu vết, khoá lạc quan.
- **Không sửa giờ.** Đổi giờ = rút khung cũ + ghi khung mới. Không xoá cứng.
- **Vì sao ở `van-chuyen`:** luật dùng nó (xếp chuyến) thuộc Vận chuyển. Dữ liệu thuộc người là **giấy tờ**; còn khung bận là lịch vận hành. Nếu sau này hướng dẫn viên cũng cần báo bận thì đó là việc của Phân công, ADR riêng. Chủ chọn chỗ ở tại **Q7**; chủ bảng là cửa một chiều.
- Giới hạn: một khung ≤ 14 ngày; không bắt đầu trong quá khứ (đề xuất; kế hoạch chốt số).

### Ô quyền
- **Ô mới `unavailability.self`** (báo và rút khung **của chính mình**):
  - `DRIVER_PARTNER = own`;
  - `DRIVER = own` hoặc `none` (câu Q3);
  - `SUPER_ADMIN = any`;
  - cột khác `none`.
- **Văn phòng xem** lịch bận của mọi tài xế bằng **ô điều xe của 1b** (G1b-5). Không thêm ô: người điều xe cần thấy lịch bận để xếp, và chỉ họ cần.
- Tài xế chỉ thấy khung của mình.

### Bất biến hai lớp
| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B4.1 | Kết thúc > bắt đầu; lý do trong tập đóng | `CHECK` | hàm kiểm thân yêu cầu |
| B4.2 | **Không ghi khung bận chồng lên chuyến mà tài xế đang được xếp** (chuyến chưa kết thúc, chưa huỷ). Không để báo bận thành đường vòng qua hạn chót Từ chối | trigger `BEFORE INSERT` trên `vc_unavailability`, đọc dòng lái và chuyến (cùng module) | **409** "Bạn đang có chuyến <mã> lúc …, hãy Từ chối chuyến (nếu còn hạn) hoặc gọi văn phòng" |
| B4.3 | **Không xếp tài xế vào chuyến chồng lên khung bận đang hiệu lực** | trigger `BEFORE INSERT` trên dòng phân công của 1b (G1b-8) | hàm thuần chồng lịch của 1b nhận thêm khung bận như khoảng chặn; 409 kèm lý do |
| B4.4 | Khung chỉ đi tiến: hiệu lực → đã rút; không sửa giờ, người; không xoá | trigger `BEFORE UPDATE` / `BEFORE DELETE` | câu rút có điều kiện |
| B4.5 | Khung chồng khung của cùng tài xế | **cho phép** (không hại; hiện gộp) | — |

### Route
- `GET /api/van-chuyen/ban/cua-toi`, `POST /api/van-chuyen/ban`, `POST /api/van-chuyen/ban/:id/rut`: cổng theo G1b-7, `can(unavailability.self, { ownerId })`. Khung của người khác → 404.
- `GET /api/van-chuyen/ban?tu=&den=` (văn phòng xem): cổng `office` + ô điều xe của 1b.

### Thông báo
Không gửi ai. Văn phòng thấy trên màn điều xe.

### Cửa
- **Một chiều:** chủ bảng và tiền tố (`vc_`); chuyển sang module khác sau này phải di trú (Q7).
- **Hai chiều:** lý do, giới hạn độ dài, ô quyền.

---

## D5. Thông báo chuyến cho tài xế và cho văn phòng điều xe

**Hiến chương áp:** K16, 4.1 (tin là hình chiếu của nhật ký), 5.3 (không vòng phụ thuộc), 5.10 (thông báo chạy sau lô, không kích hoạt tiền), 5.12, 5.16 (được phép thất lạc: tin chuyến là việc không quan trọng theo nghĩa 5.16; người điều xe vẫn thấy trạng thái thật trên màn chuyến).

### Dữ liệu
- **Không bảng mới.** Tin về chuyến là **hình chiếu của `audit_log`**, khuôn ADR-0034 điều 1.
- View công bố mới của `audit` (đề xuất `v_aud_trip_event`: id, `target_id` = chuyến, `staff_id` người làm, `action`, `created_at`). Lọc `target_type = 'trip'` và danh sách hành động dưới đây. `thongbao → audit` là cạnh đã có.
- **Hành động nhật ký** (mã chốt ở kế hoạch; ghi bởi `van-chuyen` qua `auditStatement`, chi tiết **không** tên khách, SĐT, năm sinh, số giấy tờ):

| Hành động | Ghi khi | Ai nhận tin (ngăn "Của tôi") |
|---|---|---|
| `trip_driver_assigned` | văn phòng xếp tài xế | tài xế được xếp |
| `trip_driver_removed` | văn phòng gỡ hoặc đổi tài xế | tài xế bị gỡ ("Bạn không còn lái chuyến …") |
| `trip_driver_refused` | D3 | **mọi tài khoản có ô điều xe phạm vi `any`** (G1b-5) |
| `trip_schedule_changed` | đổi giờ hoặc điểm dừng của chuyến có tài xế | tài xế đang lái |
| `trip_cancelled` | huỷ chuyến có tài xế | tài xế đang lái lúc huỷ |

- **Người nhận tính lúc đọc** (khuôn ADR-0034 điều 3). Với sự kiện của chuyến C lúc t, tài xế nhận tin = hồ sơ có dòng lái trên C **mở lúc ≤ t và (còn mở hoặc đóng lúc ≥ t)**. Tài xế cũ vì thế thấy tin "bị gỡ" của chính mình, giống "người phụ trách cũ + mới" của ADR-0034.
- **Không lấy người nhận từ chữ `detail`** (ADR-0030 điều 3).
- **Nội dung tin:** "Chuyến <mã> ngày <dd/mm> lúc <hh:mm>: bạn được xếp lái xe <biển số>". Không tên khách, không SĐT. Bấm vào mở chuyến; nếu người đó không còn quyền xem chuyến thì gặp 404 như thường.
- Thông báo màn hình khoá (ADR-0036): cú gõ cửa không nội dung, **người nhận tính lúc gửi** theo cùng luật; giờ yên lặng theo ADR-0039. **Không có tin "quan trọng"** ở lượt 2 (gọn nhất).
- Tin chuyến **không bao giờ** gắn nhãn `tat-ca` hay "Toàn công ty". Tài xế không thấy ngăn "Tất cả" của đơn (không có `order.view`).
- **Bảng tin tức thì (ADR-0022) cho màn chuyến: KHÔNG làm ở lượt 2.** Màn chuyến tải lại khi mở hoặc khi kéo xuống. Hàng rào Bảng tin hôm nay chỉ canh `/api/orders*`; mở sang chuyến là việc riêng, cần ADR.

### Nối module: hàm tiêm từ gốc lắp ráp, KHÔNG thêm cạnh module
Khuôn sẵn có: tin đơn đi `ctx.baoThayDoi` → gốc lắp ráp (`src/index.ts`) → `dayGoCua` của `thongbao`; `parties` biết tài khoản qua hàm tiêm `partyAccount` (ADR-0007 điều 4(b)). Lượt 2 làm đúng như vậy:

1. **Gõ cửa sau khi ghi.** Hàm tiêm mới (đề xuất `ctx.baoThayDoiChuyen(env, actor, { tripId, action })`). Route của `van-chuyen` gọi **sau** khi lô thành công. Gốc lắp ráp:
   - đọc tài xế liên quan của chuyến qua **hàm công bố** của `van-chuyen` (đề xuất `taiXeCuaSuKien(db, tripId, luc)`, theo luật "mở ≤ t, đóng ≥ t" ở trên);
   - đổi hồ sơ → tài khoản qua hàm công bố của `staff` hoặc `parties`;
   - gọi `dayGoCua` của `thongbao`.
   Gọi kiểu bắn-và-quên, lỗi không làm hỏng thao tác ghi (khuôn `baoThayDoi`).
2. **Hộp thông báo đọc lúc mở.** Hàm tiêm mới cho `thongbao` (đề xuất `chuyenLienQuan(env, staffId, tuLuc)` → danh sách (chuyến, khoảng mở–đóng) mà tài khoản này từng lái trong 30 ngày giữ tin). Gốc lắp ráp nối nó vào hàm công bố của `van-chuyen`. `thongbao` lọc sự kiện của `v_aud_trip_event` theo danh sách đó. Người điều xe nhận tin Từ chối theo **quyền hiện có** (ô điều xe), `thongbao` tự biết.

**Hệ quả:**
- **Không thêm cạnh module.** `thongbao` không import `van-chuyen` và không đọc `v_vc_*`; `van-chuyen` không import `thongbao`. Không vòng. Câu "không module nào import `van-chuyen`" của ADR-0040 D1 **giữ nguyên**: gốc lắp ráp không phải module.
- **Hai hàm tiêm và hai hàm công bố mới là hợp đồng giữa các phần** (`van-chuyen` ↔ gốc lắp ráp ↔ `thongbao`). Chúng được ghi vào ADR, có test đổi hợp đồng (đỏ trước) như `isAssigned`.
- **Bổ sung** ADR-0034 điều 1, 5: nguồn tin thứ hai (sự kiện chuyến) ngoài sự kiện đơn; `thongbao` nhận thêm một hàm tiêm.

### Ô quyền
Không ô mới. Hộp thông báo ở cổng `staff` (ADR-0034 điều 7).

### Bất biến hai lớp
| # | Bất biến | Lớp CSDL | Lớp máy chủ |
|---|---|---|---|
| B5.1 | Nhật ký chuyến không chứa SĐT, tên khách, năm sinh, số giấy tờ | trigger nhật ký chỉ-thêm (sẵn có, 0017) giữ không sửa được; **không** chặn nội dung ở CSDL | danh sách trường chi tiết cố định trong mã; bài quét "nhật ký không lộ" (khuôn `src/giay-to-khong-lo-so.test.ts`) chạy mọi route mới rồi quét `audit_log` |
| B5.2 | Tin chuyến chỉ tới tài xế của chuyến (đúng khoảng) và văn phòng điều xe | — | **một** hàm thuần lọc người nhận, dùng chung cho hộp và cho gõ cửa; test theo mọi tập con quyền (khuôn NT-3, ADR-0030 S20-9) |
| B5.3 | Tin phát sau lô thành công, lỗi gửi không làm hỏng lô | — | hàm tiêm `baoThayDoiChuyen` gọi sau `db.batch`, bắn-và-quên (khuôn `baoThayDoi`, `src/index.ts`) |

### Route
- Không route mới. Hộp `GET /api/thong-bao…` sẵn có đọc thêm nguồn tin chuyến. `GET /api/thong-bao/moi-nhat` (cho máy) dùng cùng hàm lọc.

### Cửa
- **Một chiều:** mỗi dòng nhật ký mới (chỉ-thêm). Vì vậy **danh sách trường của chi tiết phải chốt trước khi ghi dòng đầu tiên**.
- **Hai chiều:** luật người nhận (hình chiếu tính lúc đọc), nội dung chữ, hai hàm tiêm (đổi được cùng một commit có test).

---

## 5. Trang ghép (`CLAUDE.md` §9)

### 5.I — Lượt duyệt I (D1 + D2)

**(1) Bảng nào chứa những loại thực thể nào sau lượt I**

| Bảng | Trước | Sau lượt I |
|---|---|---|
| `pty_role_type` | vai nội bộ, vai bên ngoài (bên đặt), vai OTHER (công ty chủ, mã cũ đã ngưng) | + **Nhà xe đối tác** (OTHER, không sinh quyền) + **Tài xế đối tác** (EXTERNAL, sinh `DRIVER_PARTNER`) |
| `pty_party_role` | hồ sơ ↔ vai | + hồ sơ nhà xe (tổ chức **hoặc người**) mang vai Nhà xe; hồ sơ người mang vai Tài xế đối tác. Nhà xe cá nhân tự lái mang **cả hai** (OTHER + EXTERNAL, không vướng LC-3) |
| `pty_relationship_type` / `pty_party_relationship` | "Người liên hệ của" | + **"Tài xế của"** (người → nhà xe) |
| `pty_person_document` | giấy tờ nhân viên (tài xế công ty, HDV…) | + giấy tờ **người ngoài** (tài xế đối tác). Cùng luật che số |
| `stf_permission_type` / `stf_permission` | 8 mã; tài khoản bên ngoài chỉ `PARTNER` | + `DRIVER_PARTNER`; tài khoản bên ngoài giữ `PARTNER` **hoặc** `DRIVER_PARTNER`, không cả hai, không kèm quyền nội bộ |
| `vc_vehicle` / `vc_vehicle_document` | xe của công ty chủ | + **xe của nhà xe đối tác** (`owner_party_id` trỏ hồ sơ nhà xe) |
| `audit_log` | … | + các hành động gán vai/quan hệ mới (hành động sẵn có), thêm/sửa xe đối tác (hành động sẵn có của 1a) |

**(2) Từng dòng bản đồ quyền chạm các bảng đó áp cho loại nào**

| Ô | Áp cho | Cột `DRIVER_PARTNER` |
|---|---|---|
| `vehicle.manage` (Quản trị + Toàn quyền) | **mọi xe**: công ty và đối tác; giấy tờ xe; danh sách sắp hết hạn gồm xe đối tác và tài xế đối tác | none |
| `party.view` / `party.write` (văn phòng) | mọi hồ sơ, kể cả hồ sơ nhà xe và hồ sơ tài xế đối tác **chưa gắn tài khoản**. **Không** mở giấy tờ | none |
| `party.staff.write` (Quản trị + Toàn quyền, cấp bậc) | hồ sơ **gắn tài khoản**, gồm tài xế đối tác đã có tài khoản | none |
| `admin.manage` (cổng `admin`) | gán vai Nhà xe, vai Tài xế đối tác, quan hệ "Tài xế của"; tạo tài khoản tài xế đối tác | none |
| `party.document.view` | của chính mình, số che: mọi nhân viên (ADR-0040) **+ tài xế đối tác** | **own** |
| `party.document.write` / `.reveal` (Quản trị + Toàn quyền) | giấy tờ mọi người, kể cả tài xế đối tác | none |
| `order.*`, `money.view`, `contact.view`, `dispatch.*`, `payment.*`, `invoice.*`, `settings.ops`, `notice.send`, `company.legal.write`, `audit.view`, `staff.sheet.sync`, `account.access.manage` | không đổi | **none** (bài ghim cả hàng) |
| `feedback.submit` / `feedback.view` | mọi tài khoản | any / own |
| Tin "Toàn công ty" (`noi-bo`, ADR-0034) | tài khoản có ít nhất một quyền **không thuộc** `{PARTNER, DRIVER_PARTNER}` | không nhận |

**(3) Cổng nào canh cửa nào**

| Cổng | Danh sách mã (sau lượt I) | Cửa liên quan | `DRIVER_PARTNER` |
|---|---|---|---|
| `admin` | `ADMIN`, `SUPER_ADMIN` | vai, quan hệ của hồ sơ; tài khoản; danh mục loại giấy tờ | không |
| `office` | `SALES`, `ACCOUNTING`, `ADMIN`, `SUPER_ADMIN` | `/api/van-chuyen/*` quản lý xe, nhà xe, sắp hết hạn; `/api/parties*`, giấy tờ người khác | không |
| `orders` | `SALES`, `ACCOUNTING`, `ADMIN`, `FIELD`, `PARTNER`, `SUPER_ADMIN`, `INTERN` | đơn, Trang chủ | **không** (bài khoá cổng) |
| `staff` | mọi tài khoản hoạt động | tự phục vụ; `GET /api/parties/documents/mine`; hộp thông báo | có; thân route hỏi `can()` |
| cổng tài xế của 1b (nếu có, G1b-7) | do 1b khai | xem chuyến của mình | thêm vào ở lượt II |

Lớp CSDL canh thêm: trigger LC-1 mới, trigger tài khoản lai, trigger chủ xe, trigger quan hệ "Tài xế của".

### 5.II — Lượt duyệt II (D3 + D4 + D5)

**(1) Bảng nào chứa những loại thực thể nào sau lượt II**

| Bảng | Nhận thêm |
|---|---|
| Dòng phân công tài xế của 1b (G1b-1) | lý do đóng `REFUSED` + mã lý do Từ chối + người đóng (nếu 1b chưa có) |
| Bảng chính sách `vc_` | dòng chính sách **hạn chót Từ chối** (có ngày hiệu lực) |
| `vc_unavailability` (mới) | khung bận của **tài xế** (đối tác; công ty nếu Q3 = (a)). **Không** có khung của xe ở lượt 2 |
| `audit_log` | hành động chuyến mới (bảng D5); view `v_aud_trip_event` |
| `ntf_*` | **không** thêm dòng: tin chuyến là hình chiếu. `ntf_read_mark` và `ntf_push_sub` dùng như cũ |
| Hợp đồng giữa các phần (không phải bảng) | hai hàm tiêm từ gốc lắp ráp (`baoThayDoiChuyen` cho route `van-chuyen`, `chuyenLienQuan` cho `thongbao`) + hàm công bố mới của `van-chuyen` (tài xế của một sự kiện chuyến; các chuyến một tài xế từng lái). Không cạnh module mới |

**(2) Từng dòng bản đồ quyền chạm các bảng đó áp cho loại nào**

| Ô | Công ty (`DRIVER`) | Đối tác (`DRIVER_PARTNER`) | Văn phòng | Toàn quyền |
|---|---|---|---|---|
| xem chuyến (1b) | assigned | assigned | theo 1b | any |
| `trip.refuse` (mới) | Q3 | assigned | none | any, **nhưng** route đòi "đang lái" (không Từ chối thay) |
| `unavailability.self` (mới) | Q3 | own | none | any |
| điều xe (1b) | none | none | theo 1b; **thêm nghĩa: xem lịch bận của mọi tài xế**; bị chặn bởi khung bận (B4.3) và luật nhà xe (B1.4) | any |
| DTO chuyến: danh sách khách + SĐT liên hệ | theo 1b | **chỉ trong khung Q1** | theo 1b + `contact.view` | any |

**(3) Cổng nào canh cửa nào**

| Cửa | Cổng | Ô trong thân route | Lớp CSDL |
|---|---|---|---|
| `POST …/chuyen/:id/tu-choi` | cổng tài xế của 1b / `staff` | `trip.refuse` + chốt "đang lái" | B3.1–B3.4 |
| `…/ban/cua-toi`, `POST …/ban`, `…/rut` | cổng tài xế / `staff` | `unavailability.self` (ownerId = chính mình) | B4.1, B4.2, B4.4 |
| `GET …/ban?…` (văn phòng xem) | `office` | ô điều xe của 1b | — (chỉ đọc) |
| xếp tài xế / xe (1b) | theo 1b | điều xe | **B4.3**, **B1.4** |
| hộp thông báo | `staff` | lọc người nhận (hàm thuần B5.2), dữ liệu chuyến qua hàm tiêm `chuyenLienQuan` | — |
| gõ cửa sau Từ chối / xếp / gỡ / đổi / huỷ chuyến | (không phải route) gốc lắp ráp qua `baoThayDoiChuyen` | cùng hàm thuần B5.2 | — |

---

## 6. Câu hỏi cho chủ (gom một lần, mỗi câu có khuyến nghị)

> Các câu dưới đây chạm dữ liệu hoặc quyền nên phải hỏi (P8). Câu nào chủ trả "theo khuyến nghị" thì người soạn áp nguyên như khuyến nghị.

**Q1. Tài xế đối tác thấy tên khách, năm sinh và số điện thoại người liên hệ từ lúc nào?**
- (a) Chỉ từ lúc **hết hạn Từ chối** (xem Q2) tới hết ngày chạy chuyến. Được: không có kiểu "xem số rồi từ chối". Mất: tài xế được xếp sớm phải chờ mới thấy danh sách. (Nếu Q2 chọn (c), "hết hạn Từ chối" là lúc xe xuất bến, tức tài xế chỉ thấy danh sách khi đã lên đường — khi đó nên chọn (b) hoặc đổi Q2.)
- (b) Ngay khi được xếp. Được: tiện. Mất: xem rồi từ chối vẫn giữ được số, không rút lại được (giống điều đã chấp nhận với hướng dẫn viên nhận rồi trả đơn).
- (c) Không bao giờ thấy số điện thoại, chỉ thấy tên + năm sinh (từ mốc (a)); cần gọi khách thì gọi qua văn phòng. Được: kín nhất. Mất: văn phòng phải trực máy lúc đón.
- **Khuyến nghị: (a).**

**Q2. Tài xế được Từ chối chuyến tới lúc nào?**
- (a) Tới **12 giờ trước giờ chạy**; bạn (tài khoản quản trị cao nhất) đổi được con số này. Được: tài xế còn từ chối được chuyến sáng mai tới tối hôm trước. Mất: thêm một con số cài đặt.
- (b) Như hướng dẫn viên: không Từ chối khi chuyến chạy hôm nay hoặc ngày mai. Được: một luật chung. Mất: chuyến thường được xếp trước một ngày, nên gần như không bao giờ Từ chối được.
- (c) Lúc nào cũng được trước khi xe xuất bến. Được: linh hoạt. Mất: văn phòng có thể mất tài xế sát giờ.
- **Khuyến nghị: (a).**

**Q3. Tài xế công ty (nhân viên) có được Từ chối chuyến và Báo bận như tài xế đối tác không?** Bạn mới giao hai việc này cho tài xế đối tác.
- (a) Có cả hai, cùng luật. Được: một cách làm, giống hướng dẫn viên nội bộ đang được Từ chối đơn; làm thêm gần như không tốn (cùng nút, cùng máy chủ, chỉ mở thêm một cột quyền). Mất: nhân viên có thể trả chuyến qua app.
- (b) Báo bận: có; Từ chối: không (nhân viên gọi văn phòng).
- (c) Không cả hai; chỉ tài xế đối tác. Được: đúng phạm vi đã giao, nhỏ nhất; mở cho nhân viên sau chỉ là đổi một ô quyền. Mất: tài xế công ty nghỉ phải gọi văn phòng.
- **Khuyến nghị: (c)** — gọn nhất; mở sau dễ.

**Q4. Một người vừa là "đối tác đặt đơn" (ví dụ Tài xế taxi mang khách tới) vừa lái xe cho nhà xe: có được giữ cả hai không?**
- (a) **Không.** Mỗi người chọn một: hoặc là đối tác đặt đơn, hoặc là tài xế đối tác. Không có cách lách (vai gắn với hồ sơ của người, không gắn với số điện thoại, và mỗi người chỉ có một hồ sơ). Được: không lẫn giá đơn với danh sách khách của chuyến; giống cách đã chặn tài khoản lai ở hướng dẫn viên; nới sau dễ. Mất: vài người phải chọn một việc trên app.
- (b) Có. Mỗi màn chỉ theo đúng quyền của nó. Được: tiện. Mất: khó rà; siết lại sau phải tách tài khoản đang dùng.
- **Khuyến nghị: (a).**

**Q5. Nhà xe có tài khoản đăng nhập không** (để tự xem chuyến của xe mình, quản tài xế của mình)?
- (a) **Không ở lượt 2.** Văn phòng nhập xe, tài xế thay nhà xe. Được: gọn, không thêm loại quyền. Mất: văn phòng làm thay.
- (b) Có, thêm loại quyền "Nhà xe". Được: nhà xe tự làm. Mất: thêm một lượt duyệt quyền (nhà xe thấy chuyến của mọi tài xế mình, có thể thấy giá ở lượt 3).
- **Khuyến nghị: (a)**; xét lại khi làm lượt 3 (giá, công nợ nhà xe).

**Q6. Xe và tài xế có được "chéo" nhau không?**
- (a) **Không.** Xe của nhà xe chỉ do tài xế của chính nhà xe đó lái. Tài xế đối tác chỉ lái xe của nhà xe mình, không lái xe công ty. Tài xế công ty chỉ lái xe công ty. Được: đúng kiểu "thuê cả xe kèm lái" của quy định xe hợp đồng (**chưa có người chuyên môn kiểm**); luật đơn giản. Mất: không thuê xe không kèm lái được.
- (b) Cho phép: tài xế công ty lái xe thuê, hoặc tài xế đối tác lái xe công ty. Được: linh hoạt. Mất: thêm luật về bảo hiểm, hợp đồng; cần hỏi pháp lý.
- **Khuyến nghị: (a)**; nới sau khi có nhu cầu thật.

**Q7. Lịch bận của tài xế lưu ở đâu?**
- (a) Trong **phân hệ Vận chuyển**. Được: gọn, luật xếp chuyến dùng trực tiếp. Mất: nếu sau này hướng dẫn viên cần báo bận thì làm riêng, hoặc chuyển dữ liệu.
- (b) Ở **hồ sơ người**, dùng chung cho mọi người (tài xế, hướng dẫn viên) ngay từ đầu. Được: một chỗ. Mất: lượt 2 làm rộng hơn cần.
- **Khuyến nghị: (a).**

---

## 7. Phụ thuộc lượt 3 (giá, chi phí, công nợ nhà xe)

- **Chỗ gắn lượt 2 để lại:**
  - khoá chuyến;
  - **bên vận chuyển chụp trên chuyến** (G1b-3);
  - xe (và qua xe: nhà xe) của chuyến.
  Lượt 3 thêm bảng giá (theo tuyến hoặc loại xe, có ngày hiệu lực, 5.2) và dòng chi phí thuê trỏ về chuyến (4.2: tiền là hình chiếu của sự kiện "chuyến đã chạy").
- **Lượt 2 KHÔNG:**
  - thêm cột tiền;
  - thêm danh mục "loại xe", "tuyến";
  - thêm ô chữ "giá". Cột rỗng chờ sẵn là đoán trước thiết kế.
- **Cột `DRIVER_PARTNER` mọi ô tiền = none.** Bài ghim cả hàng sẽ đỏ nếu lượt 3 lỡ mở. Tài xế đối tác không thấy giá thuê kể cả của chuyến mình, trừ khi lượt 3 có ADR riêng.
- Nếu Q5 = (b) ở lượt 3 (nhà xe đăng nhập xem giá của mình), đó là quyết định quyền mới của lượt 3.
- Hợp đồng vận chuyển là thực thể (bản rà C8): thuộc 1b hoặc lượt 3, **không** ở lượt 2. Nếu 1b đưa vào, "bên vận chuyển" của hợp đồng phải trùng bên vận chuyển chụp trên chuyến.

---

## 8. Việc chủ tự làm (chỉ đọc, không bắt buộc trước lượt duyệt I)

Kiểm production có hồ sơ nào còn mang mã vai cũ "Tài xế" (`DRIVER`) không, để D1 biết có dòng cần gán lại bằng tay.

1. Mở Terminal, đứng ở thư mục repo:

```
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales
```

2. Chạy (chỉ đọc, dùng `--command`, không dùng `--file`):

```
npx wrangler d1 execute tourdao-sales-db --remote --command "SELECT COUNT(*) AS so_dong, SUM(valid_to_date IS NULL) AS dang_mo FROM pty_party_role WHERE role_type_code = 'DRIVER'"
```

3. Gửi lại hai con số. Cả hai bằng 0 thì không cần làm gì.

---

## 9. Chia lát thi công (ước lượng 6 lát)

| Lát | Nội dung | Chờ | Việc lớn? | Người kiểm độc lập |
|---|---|---|---|---|
| 1 | **Máy chủ + CSDL lượt I.** Trước khi viết trigger tài khoản lai: đọc thứ tự câu trong lô đổi quyền của `staff` (đóng cũ trước mở mới?). Migration: vai `CARRIER`, `DRIVER_EXTERNAL`; quan hệ `DRIVES_FOR`; quyền `DRIVER_PARTNER`; bỏ/tạo lại trigger LC-1; trigger tài khoản lai; view `v_pty_carrier_driver` + view nhà xe đang mở; trigger chủ xe, trigger quan hệ. Mã: `roles.ts`, `permissions.ts` cột 9 + bài ghim cả hàng, `laNoiBo`, hàm kiểm tài khoản lai trên mọi đường ghi quyền, route xe nhận chủ là nhà xe, `GET /api/van-chuyen/nha-xe`, mở rộng `expiringDriverDocuments`, `audit-invariants`, `data-dictionary.json` | duyệt lượt I | có (dữ liệu + quyền) | có |
| 2 | **Giao diện lượt I:** màn nhà xe; chọn chủ xe; gán vai/quan hệ; trang đầu của tài xế đối tác (giấy tờ của mình; "chuyến sẽ hiện ở đây") | bản vẽ Claude Design | không (giao diện) | gom kiểm giao diện |
| 3 | **Từ chối (D3)** + mốc mở danh sách khách trong DTO (Q1) | 1b thi công xong; duyệt lượt II | có | có |
| 4 | **Báo bận (D4)** + nối vào hàm/trigger chồng lịch của 1b | lát 3 (hoặc song song nếu 1b xong) | có | có |
| 5 | **Thông báo chuyến (D5):** view `v_aud_trip_event`, hai hàm tiêm (`baoThayDoiChuyen`, `chuyenLienQuan`) + hai hàm công bố của `van-chuyen`, hàm lọc người nhận | lát 3 | có (quyền đọc) | có — **gộp một người kiểm cho lát 3–5** nếu phát hành cùng lần |
| 6 | **Giao diện tài xế:** nút Từ chối, màn báo bận; màn văn phòng: lịch bận, nhãn "đã từ chối" | bản vẽ | không | gom kiểm giao diện |

Lát 1–2 làm được **trong lúc 1b đang soạn**. Lát 3–5 có thể gộp thành một lần phát hành.

---

## 10. Tiêu chí nghiệm thu (kiểm bằng máy)

Mỗi hàng rào mới có một dòng ở `docs/SO-HANG-RAO.md`, kèm ngày **thấy chặn thật**: sửa cố ý → đỏ → hoàn nguyên (P16).

**Lượt I (lát 1):**
1. `src/shared/permissions.test.ts`: **ghim cả hàng `DRIVER_PARTNER`**: mọi ô `none` trừ `feedback.submit = any`, `feedback.view = own`, `party.document.view = own`. Đổi một ô → đỏ.
2. `src/shared/cong-quyen.test.ts`: `DRIVER_PARTNER` ∉ `OFFICE_GATE`, `ORDERS_GATE`, `ADMIN_GATE`.
3. `src/roles-schema.test.ts`: nhãn `DRIVER_PARTNER`, `DRIVER_EXTERNAL`, `CARRIER`, `DRIVES_FOR` khớp giữa migration và mã.
4. Test trên CSDL tạm, lớp CSDL, chèn thẳng SQL:
   - (a) tài khoản đang có `PARTNER`, chèn `DRIVER_PARTNER` → ABORT;
   - (b) ngược lại → ABORT;
   - (c) `DRIVER_PARTNER` + `SALES` → ABORT;
   - (d) tài khoản vai bên ngoài chèn `DRIVER_PARTNER` → được;
   - (e) tài khoản vai bên ngoài chèn `SALES` → ABORT (LC-1 cũ vẫn chặn);
   - (f) tài khoản vai bên ngoài chèn `DRIVER` → ABORT.
5. Lớp máy chủ: `roleAssignmentProblem` và đường quản trị cũ (`POST /api/staff` không vai, `PUT /api/staff/:id/permissions`) trả 400 cho mỗi ca ở mục 4 (e2e). Gán cùng lúc "Tài xế taxi" + "Tài xế đối tác" → 400 với câu dễ hiểu, **trước** khi chạm CSDL.
5b. **Đổi vai hợp lệ không bị trigger chặn nhầm:** tài khoản đang "Tài xế taxi" (`PARTNER`) đổi sang "Tài xế đối tác" (`DRIVER_PARTNER`) bằng màn Quản lý tài khoản → thành công; sau đó đúng một quyền mở là `DRIVER_PARTNER`. Kèm ca ngược lại. (Kiểm thứ tự "đóng cũ → mở mới" trong lô đổi quyền của `staff`; trigger chỉ đếm dòng `valid_to_at IS NULL`.)
6. `src/shared/thong-bao.test.ts`:
   - `laNoiBo(["DRIVER_PARTNER"]) = false`;
   - `laNoiBo(["DRIVER"]) = true`;
   - `laNoiBo(["PARTNER"]) = false`;
   - tin `noi-bo` không tới tài khoản chỉ-`DRIVER_PARTNER`.
7. Chủ xe:
   - route thêm xe với chủ là hồ sơ không mở vai Nhà xe → 409 mã route;
   - chèn thẳng SQL → trigger ABORT (mã khác);
   - chủ là nhà xe đang mở vai → 201.
8. Quan hệ "Tài xế của" tới hồ sơ không mở vai Nhà xe, hoặc từ hồ sơ tổ chức → ABORT ở CSDL, 409 ở route.
9. e2e cho tài khoản chỉ-`DRIVER_PARTNER`:
   - `GET /api/orders`, `/api/orders/dashboard`, `/api/parties`, `/api/catalog`, `/api/van-chuyen/xe` → 403;
   - `GET /api/parties/documents/mine` → 200, số che;
   - `POST /api/feedback` → 201.
10. Danh sách sắp hết hạn có giấy tờ tài xế đối tác, **không số** (bài `giay-to-khong-lo-so` mở rộng).
11. `audit-invariants --db local`: câu mới (tài khoản lai = 0; chuyến tương lai dùng xe/tài xế nhà xe đã thôi) chạy được, thoát 0 trên dữ liệu sạch, thoát 1 trên dữ liệu gieo lỗi.
12. `npm test`, `npm run typecheck` (0 lỗi), `npm run test:e2e` xanh.

**Lượt II (lát 3–5):**

13. IDOR: tài xế A mở, Từ chối, xem danh sách khách của chuyến tài xế B → **404**; đổi id trong đường dẫn không lộ gì.
14. DTO (G1b-6):
    - trước mốc Q1: khoá `hanhKhach`, `soDienThoaiLienHe` **vắng mặt** (không phải chuỗi rỗng);
    - trong khung: có;
    - sau hết ngày chuyến: vắng;
    - mọi lúc: không có khoá tiền nào (so với danh sách trắng).
15. Từ chối:
    - lý do ngoài danh sách → 400;
    - sau hạn chót → 409;
    - chuyến đã xuất bến → 409;
    - Toàn quyền không lái → 403;
    - **hai lệnh song song** (Từ chối + văn phòng đổi tài xế): đúng một thắng, bên kia 409 `stale`, đúng một dòng nhật ký.
16. Lớp CSDL của Từ chối, chèn thẳng SQL:
    - đóng `REFUSED` với người đóng ≠ tài xế → ABORT;
    - mở lại dòng đã đóng → ABORT;
    - đóng `REFUSED` khi chuyến đã xuất bến → ABORT;
    - (nếu B3.3 lùi về máy chủ: dòng sổ hàng rào ghi "lệch có chủ ý 5.1, dựa vào kỷ luật + câu kiểm định kỳ").
17. Báo bận:
    - chồng chuyến đang xếp → 409 **và** chèn thẳng SQL → ABORT;
    - văn phòng xếp tài xế vào khung bận → 409 **và** ABORT;
    - sửa giờ hoặc xoá khung → ABORT;
    - tài xế xem khung người khác → 404.
18. Thông báo (hàm thuần, mọi tập con quyền như NT-3):
    - tin xếp chuyến chỉ tới tài xế được xếp;
    - tài xế bị gỡ thấy tin gỡ nhưng không thấy tin đổi giờ **sau** khi bị gỡ;
    - tin Từ chối tới mọi người có ô điều xe `any`, không tới tài xế khác;
    - tài xế đối tác không bao giờ nhận `tat-ca` / `noi-bo`.
19. Bài quét nhật ký (khuôn `src/giay-to-khong-lo-so.test.ts`): chạy mọi route mới của lượt II với dữ liệu mẫu (tên khách, năm sinh, SĐT, số bằng lái), rồi quét `audit_log.detail`. Không có dãy ≥ 8 chữ số, không có tên hay năm sinh mẫu.
20. `src/architecture.test.ts` **không đổi `ALLOWED_EDGES`**: `thongbao` không import `van-chuyen`, không đọc `v_vc_*`; `van-chuyen` không import `thongbao`; vẫn không vòng. Test hợp đồng hai hàm tiêm: route Từ chối gọi `baoThayDoiChuyen` đúng một lần **sau** lô thành công, không gọi khi 409.

---

## 11. Tự rà: chỗ mơ hồ, chỗ đụng ADR đã duyệt (chỉ nêu, không sửa ADR cũ)

**Đụng ADR đã duyệt** (mỗi dòng phải ghi "thay câu …" trong ADR mới):

| ADR | Điểm đụng | Ở quyết định |
|---|---|---|
| ADR-0018 điều 2 | số vai và danh sách vai bên ngoài | D2 |
| ADR-0018 điều 5 (LC-1) | tập quyền của tài khoản bên ngoài | D2 |
| ADR-0018 điều 9 | "mọi thực thể bên ngoài là bên đặt" | D2 |
| ADR-0034 điều 6 | nghĩa `noi-bo` / "Toàn công ty" | D2 |
| ADR-0034 điều 1, 5 | nguồn tin thứ hai (sự kiện chuyến); `thongbao` nhận thêm một hàm tiêm. **Không** thêm cạnh | D5 |
| ADR-0040 D1 | chủ xe chỉ là công ty chủ (→ thêm nhà xe, quyết định mới theo lời chủ 28/9 tối); một hàm công bố giấy tờ (mở rộng); `van-chuyen` thêm hàm công bố cho gốc lắp ráp. Câu "không module nào import `van-chuyen`" **giữ nguyên** | D1, D5 |
| ADR-0040 D2 | ô "xem giấy tờ của mình" chỉ cho nội bộ | D2 |
| ADR-0040 D3 | mã vai cũ `DRIVER` "lượt 2 quyết" | D1 |
| ADR-0007 điều 4(b) | khuôn hàm tiêm từ gốc lắp ráp: thêm hai hàm (`baoThayDoiChuyen`, `chuyenLienQuan`). Đồ thị ADR-0002 **không đổi** | D5 |
| ADR-0019 điều 1 | không đổi danh sách cổng; chỉ thêm khẳng định khoá. Nếu 1b lập cổng tài xế thì **1b** sửa điều này | D2 |

**Không đụng, chỉ dùng làm khuôn:**
- ADR-0030 (Từ chối, lý do đóng, chặn tài khoản lai, 404 cho chuyến không phải của mình);
- ADR-0036, ADR-0039, ADR-0046 (thông báo màn hình khoá — ADR-0046 accepted nhưng **chưa gộp main** lúc soạn);
- ADR-0014 điều 2 (Toàn quyền `any` mọi ô).

**Chỗ mơ hồ đã tự đưa giả định (bề mặt hoặc chờ chủ bác):**
1. "Từ chối chuyến **mà đơn gắn cho họ**": hiểu là **chuyến được xếp cho họ** (một chuyến gom nhiều đơn; tài xế không gắn với đơn). Nếu chủ muốn nghĩa "đơn chỉ định đích danh một tài xế" thì là tính năng khác, cần hỏi lại.
2. **Độ mịn của khung bận:** theo giờ:phút, không chỉ theo ngày. Giới hạn 14 ngày một khung là đề xuất, kế hoạch chốt.
3. **Tên mã** (`CARRIER`, `DRIVES_FOR`, `DRIVER_EXTERNAL`, `DRIVER_PARTNER`, `trip.refuse`, `unavailability.*`, tên bảng, tên view, tên hành động): đề xuất; kế hoạch chốt, khớp tên 1b.
4. **Nhãn tiếng Việt:** "Nhà xe đối tác", "Tài xế đối tác", "Tài xế của". Nhãn lộ ra người dùng: chủ đổi được lúc duyệt.
5. **Tài xế đối tác nghỉ hợp tác:** đóng vai "Tài xế đối tác" làm mất quyền (cơ chế ADR-0018 điều 3); ngưng tài khoản tắt mọi máy nhận thông báo (ADR-0036/0046). Quan hệ "Tài xế của" đóng riêng. Chuyến tương lai đã xếp cho họ bị bắt ở câu kiểm B1.5, **không tự gỡ**.
6. **Người nhận tin Từ chối** = mọi người có ô điều xe `any`, không riêng người đã xếp. Nhóm điều xe nhỏ; tin Từ chối cần người xử lý ngay. Chủ bác thì đổi thành "người đã xếp tài xế lần cuối".
7. **Không có tin "quan trọng"** (rung trong giờ yên lặng) cho chuyến đổi sát giờ ở lượt 2. Nếu chủ muốn, đó là một dòng luật trong D5.
8. **Đã cắt khỏi lượt 2 cho gọn:** khung bận của **xe** (trùng một phần với trạng thái "bảo dưỡng" của lượt 1a), văn phòng ghi thay hay rút thay khung bận của tài xế. Làm sau được bằng migration chỉ-thêm (thêm cột xe có `CHECK` đúng một đối tượng; thêm ô "quản lý lịch bận").

**Giới hạn đã biết của bản đề xuất:**
- Chưa có người kiểm độc lập. Đề xuất chạm quyền và dữ liệu nên phải có người kiểm trước khi trình chủ (`CLAUDE.md` §3).
- Chưa đối chiếu với bản nháp 1b thật (đang soạn song song). Mọi giả định ở mục 3 phải được người soạn 1b xác nhận hoặc bác.
- Pháp lý (Nghị định 158: xe hợp đồng thuê cả xe kèm lái; danh sách hành khách): **chưa có người chuyên môn kiểm**.
- Không chạy lệnh kiểm nào (chỉ soạn tài liệu). Số dòng mã dẫn ở mục 2 là ở commit `3bb73f0`.
