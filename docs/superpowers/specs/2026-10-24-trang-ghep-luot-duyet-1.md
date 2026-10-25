# Trang ghép — các lượt duyệt góp ý Hỗ trợ (24/10, bản 2)

> CLAUDE.md §9: lượt duyệt ≥ 2 quyết định phải có trang ghép; **tối đa 3 quyết định chạm quyền/dữ liệu một lượt**.
> **Cách đếm** (theo tiền lệ ADR-0053 «ba quyết định chạm dữ liệu/quyền: D7, D8, D9 — đúng trần 3»): mỗi **điều D** chạm quyền hoặc dữ liệu tính là một; điều chỉ về giao diện không tính. Bản 1 của trang này đếm theo số ADR nên vượt trần mà không nói — đã sửa.

| Lượt | Nháp | Điều chạm quyền / dữ liệu | Số |
|---|---|---|---|
| **1** | **0139** SĐT người đi kèm + tên dịch vụ cho tài xế công ty (`2026-10-24-de-xuat-adr-sdt-hdv-cho-tai-xe.md`) | D1 (số của ai — dữ liệu cá nhân), D2 (ai thấy — quyền); D3 = phạm vi chữ của D1/D2 | 2 |
| **2** | **0138** gắn mức TA riêng từng đại lý (`…-gan-muc-ta-rieng-tung-dai-ly.md`) | D1 (bảng mới + thứ tự bậc, sửa ADR-0117 điều 6 — dữ liệu, tiền), D2 (ai gắn — quyền); D3 giao diện | 2 |
| **3** | **0140** đại lý tổ chức nhiều nhân viên (`…-dai-ly-to-chuc-nhieu-nhan-vien.md`) | D1 (bảng thành viên), D2 + D2b (phạm vi `org`, các ô cùng bảng), D2c (bật/tắt) — **phải tách thêm** khi soạn bản chính | ≥ 3 |
| riêng | Lớp giá đưa đón (YC-0014 vế tiền) | Hướng chủ chốt 14/10; chỉ soạn sau khi nhánh đưa đón ADR-0118 vào bản chính | — |

Ba lượt **độc lập**: không chung bảng, không chung ô quyền, không chung hàm tính tiền ⇒ chủ duyệt theo thứ tự nào cũng được. Thứ tự khuyến nghị: 0139 (nhỏ, không tiền) → 0138 (tiền) → 0140 (cần chủ xác nhận có ca dùng thật).

## Lượt 1 — 0139

1. **Bảng chạm tới:** không bảng mới. Đọc suất `CREW` của chuyến (`van-chuyen`, bảng của chính nó) và SĐT hồ sơ người đi kèm qua **hàm hẹp mới của `parties`** (cạnh `van-chuyen → parties` đã có). Nếu chủ chọn «người phụ trách đơn» thay vì «người đi kèm» thì **thêm một quyết định**: nới cạnh `van-chuyen → dispatch` hoặc hàm tiêm ở gốc lắp ráp — lúc đó lượt 1 thành 3 quyết định.
2. **Ô quyền:** `trip.view` phạm vi `assigned` của `DRIVER` — thấy thêm trong ngày chạy. `DRIVER_PARTNER` không đổi (phương án A).
3. **Cổng:** máy chủ — route `…/cuoc-cua-toi*` (chỉ chuyến đang lái, khác 404) + `trongNgayChay`; DTO một hàm khung, tách theo dấu «không có vế hạn» (tài xế công ty). Giao diện — màn chi tiết cuốc của tài xế công ty hiện thêm hai dòng (chỗ ẩn/hiện mới). Bài «số lạ»: tài xế đối tác không bao giờ có hai khoá mới.

## Lượt 2 — 0138

1. **Bảng:** `prc_party_tier` (MỚI) — chỉ «mức TA gắn cho một hồ sơ đối tác»; `prc_commission_rule`, `prc_rate_tier`, `prc_role_tier` không đổi cấu trúc.
2. **Ô quyền:** `partner.commission.view` (Bán hàng, Kế toán, Quản trị, Toàn quyền) thấy thêm «mức riêng» — Bán hàng vốn đã xem mọi mức qua «Thử tra», nên không lộ mới; `partner.commission.write` (Kế toán, Quản trị, Toàn quyền — phương án A) thêm việc «gắn mức riêng». Không thêm ô, không thêm phạm vi.
3. **Cổng:** máy chủ — route ghi mới trong `pricing` (`can` + `holdsPartner`); `chonMuc` thêm bậc, `ThuTraResponse.bac` mở rộng. CSDL — trigger chống chồng / người hưởng / mức bật. Giao diện — khối «Hoa hồng hiện hành» trên hồ sơ (đã có, chỉ đọc) **đổi nghĩa**: có nút ghi cho người giữ ô write. Kiểm định kỳ mới `R-PRC-…`.
4. **Xây cạnh lỗ đang hở:** HC-4.2, TNV-G4 (gần vùng tiền, không cùng đường ghi).

## Lượt 3 — 0140 (bổ sung 24/10, theo bản tách `2026-10-24-de-xuat-adr-0140-ban-tach.md`)

1. **Bảng chạm tới:** bảng thành viên MỚI (tài khoản ↔ hồ sơ tổ chức, chỉ một loại: «nhân viên của đại lý»). Bảng `orders`: cột bên đặt nay chứa thêm **hồ sơ tổ chức đại lý** cho đơn do Đối tác lập (hôm nay chỉ hồ sơ cá nhân của chính tài khoản) — đây là câu «bảng này nay chứa ai» của bài học F-01. Bảng hoa hồng / công nợ: người hưởng nay có thể là tổ chức (0140a D2).
2. **Từng ô của cột `PARTNER` chạm bảng `orders`** (đọc `src/shared/permissions.ts` 24/10):

| Ô | Hôm nay | Đề xuất 0140b | Ghi chú |
|---|---|---|---|
| `order.view` | own | own hoặc org | chỉ xem |
| `order.history.view` | own | own hoặc org | chạy lại bài D-1 với hai tài khoản cùng tổ chức |
| `contact.view` | ownOrAssigned | ownOrAssigned hoặc org | vế `assigned` (xin nhận, ADR-0014 điều 10) giữ nguyên |
| `money.view` | own | own hoặc org | giá đơn, không phải hoa hồng |
| `order.terms.view` | own | **giữ own** | hoa hồng — nhân viên không thấy hoa hồng của tổ chức |
| `order.modify`, `order.passenger.write`, `payment.receive` | own | **giữ own** | sửa / huỷ / khách / thu tiền chỉ đơn mình lập |
| `order.create` | any | any | bên đặt bị ép = tổ chức khi là thành viên (0140a D2) |
| `task.progress` | assigned | không đổi | |

3. **Cổng canh cửa nào:** máy chủ — câu SQL lọc danh sách và từng route `GET /api/orders/:id*` hỏi phạm vi `org` (thành viên đang hiệu lực + tổ chức đã bật); route ghi vẫn `own`. CSDL — trigger bảng thành viên (không chồng, không tài khoản lai). **Giao diện, chỗ ẩn/hiện bị đổi nghĩa** (chưa đọc mã từng chỗ): danh sách đơn của Đối tác (thêm đơn đồng nghiệp — cần nhãn «người lập»); trang đơn (nút sửa / huỷ / thêm khách / thu tiền phải ẩn với đơn không phải mình lập, dù trang mở được); khối thương mại trên trang đơn (hoa hồng ẩn với đơn đồng nghiệp); form lập đơn (ô bên đặt khoá = tổ chức); Trang chủ Đối tác (số đếm đơn). Bài «số lạ»: hai tổ chức, mỗi bên hai tài khoản.
4. **Số quyết định:** 0140a = 3, 0140b = 3 ⇒ hai lượt duyệt riêng. Thứ tự: ADR-0081 → 0140a → 0140b.

## Câu chủ cần trả lời

- **Lượt 1:** (a) SĐT của người **đi kèm chuyến** (khuyến nghị) hay **người phụ trách đơn**? (b) chỉ **tài xế công ty** (khuyến nghị) hay cả đối tác?
- **Lượt 2:** duyệt 0138? Người gắn mức riêng: **Kế toán, Quản trị, Toàn quyền** (khuyến nghị) hay chỉ Toàn quyền?
- **Lượt 3:** đại lý nào cần, mấy người? (để biết đã tới ngưỡng ADR-0014 điều 5 chưa)
