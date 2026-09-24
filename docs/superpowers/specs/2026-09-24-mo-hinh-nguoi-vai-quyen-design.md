# Đặc tả: Mô hình người – vai – quyền (11 vai) và luồng đơn của đối tác

- **Ngày:** 2026-09-24 · **Trạng thái:** BẢN NHÁP — chờ chủ dự án duyệt bản viết (brainstorming đã qua 4 phần, chủ duyệt từng phần trong phiên chat 2026-09-24).
- **Người soạn:** AI (phiên "mô hình người–vai–quyền"). AI **không tự duyệt** (N3, Điều 7.2).
- **Nguồn quyết định:** câu trả lời của chủ dự án trong phiên chat 2026-09-24 (mục 3). Tài liệu tham chiếu triết lý: `docs/Ref/Oracle-crm-triet-ly-va-checklist.md`, `docs/Ref/thiet-ke-party-relationship-tca.md`.
- **Liên quan:** ADR-0001 (danh tính Party–Role–Relationship), ADR-0005 (quyền app đa trị), ADR-0007 (bản đồ quyền), ADR-0009 (người phụ trách), ADR-0011 (khách trên đơn), ADR-0013 (proposed — hồ sơ nhân viên chỉ quản trị sửa), ADR-0014 (đối tác, Super Admin), **ADR-0017** (accepted 2026-09-24 — HDV nội bộ xem mọi đơn kể cả tiền; **tệp chỉ đang nằm trên nhánh chưa gộp `dot-e-the-don-gon-va-bieu-tuong`**). Bàn giao ADR-0017: `docs/superpowers/specs/2026-09-24-adr-0017-ban-giao-cho-mo-hinh-vai.md` (cùng nhánh đó).
- **ADR mới dự kiến:** **ADR-0018** (số đã kiểm trên mọi nhánh chưa gộp 2026-09-24: ADR lớn nhất trên `main` là 0016, 0017 đã dùng ở nhánh Đợt E). Migration mới bắt đầu từ **0024** (lớn nhất trên `main`: `0023_auth_passkey.sql`; không nhánh chưa gộp nào thêm migration; số `0019` vẫn để dành cho B5).

---

## 0. Tóm tắt (cho chủ dự án)

Mỗi **người hoặc công ty** có **một hồ sơ**. Hồ sơ mang **vai** với Tour Đảo (11 vai, 2 nhóm: nội bộ / bên ngoài), vai có ngày bắt đầu – kết thúc. **Vai sinh ra bộ quyền mặc định** cho tài khoản đăng nhập; quản trị chỉnh thêm/bớt được từng người, nhưng **không phá được "luật cứng"** (tài khoản bên ngoài không bao giờ làm người phụ trách, chỉ thấy đơn của mình). Bảng vai → quyền là **tài liệu cốt lõi, cố định trong hệ thống**, hiện ở trang "Vai & quyền", trang Tôi, màn tạo tài khoản và tài liệu tự sinh — một nguồn duy nhất. Đơn của đối tác đi theo luồng **Gửi đơn hàng → nội bộ tiếp nhận trong 15 phút làm việc → xác nhận**, đối tác thấy ai nhận, số điện thoại và giờ nhận; quá hạn thì nổi đỏ, đối tác thấy "quá hạn", và (giai đoạn cuối) báo đẩy tới Điều hành.

## 1. Tiêu chí thành công (hành vi kiểm được)

1. Trang "Vai & quyền" hiện đủ 11 vai đúng bảng trong mã; tài liệu `docs/VAI-VA-QUYEN.md` tự sinh từ cùng nguồn — sửa bảng mà quên sinh lại tài liệu thì `npm test` đỏ.
2. Tạo/sửa tài khoản: chọn vai → màn hình hiện trước bộ quyền sẽ cấp. Cố cấp quyền nội bộ cho tài khoản bên ngoài → **cơ sở dữ liệu từ chối** (không chỉ giao diện).
3. Tài khoản bên ngoài **không bao giờ** thành người phụ trách — qua giao việc, tự nhận, hay mặc định lúc lập đơn — và chỉ thấy đơn của chính mình.
4. Hướng dẫn viên nội bộ thấy mọi đơn kể cả tiền (ADR-0017); lập đơn thì tự phụ trách; tự nhận được đơn chưa có người; xác nhận được đơn mình phụ trách.
5. Đối tác bấm **"Gửi đơn hàng"** → đơn có **hạn tiếp nhận** = 15 phút làm việc sau lúc gửi (chốt vào đơn). Nội bộ thấy đơn ở mục "Chờ tiếp nhận"; quá hạn thì đỏ và xếp đầu; đối tác thấy "Quá hạn tiếp nhận".
6. Đơn đã tiếp nhận: đối tác thấy **tên, số điện thoại công việc của người phụ trách và giờ nhận**.
7. Đơn ghi được **người giới thiệu**.
8. Tài khoản công ty lữ hành gắn vào **hồ sơ công ty**; đơn của nó đứng tên công ty là bên đặt.
9. **Không tài khoản hiện có nào bị đổi quyền** cho tới khi chủ dự án duyệt bảng đối chiếu từng người (mục 13).
10. Mọi lần gán/gỡ vai, chỉnh quyền tay, đổi cài đặt vận hành, gửi đơn, tiếp nhận đều có dòng nhật ký (ai, khi nào, trước → sau, lý do nếu có).

## 2. Nguyên tắc: sáu lớp tách riêng (theo checklist Oracle / TCA)

| Lớp | Là gì | Lưu ở đâu (hiện có / mới) |
|---|---|---|
| 1. **Hồ sơ** | Người (`PERSON`) hoặc tổ chức (`ORGANIZATION`) — có trước mọi vai | `pty_party`, `pty_person`, `pty_organization` (có) |
| 2. **Vai với Tour Đảo** | Ngữ cảnh quan hệ của hồ sơ với công ty, **có hiệu lực theo ngày** | `pty_party_role` + `pty_role_type` (có; thêm mã vai và cột nhóm) |
| 3. **Vai trên từng đơn** | Người lập, bên đặt, khách đi tour, người giới thiệu, người phụ trách | cột/bảng của `orders`, `dsp_assignment` (một phần có; thêm người giới thiệu) |
| 4. **Tài khoản đăng nhập** | Cửa vào ứng dụng, trỏ đúng một hồ sơ | `staff` (`staff.party_id`, tối đa một tài khoản mỗi hồ sơ — có) |
| 5. **Quyền** | Việc được làm, gắn với tài khoản, **sinh từ vai** + chỉnh tay | `stf_permission` (có, đa trị, có hiệu lực) + bảng chỉnh tay (mới) |
| 6. **Tài khoản giao dịch** | Hoa hồng, công nợ, điều khoản thanh toán — gắn với **quan hệ**, không gắn vào tài khoản đăng nhập | **đợt sau** (ngoài phạm vi) |

Hệ quả thiết kế:
- **Vai không trực tiếp làm cổng chặn** (giữ ADR-0001 điều 4, ADR-0005): vai sinh ra quyền, **quyền** mới là cổng — trừ các **luật cứng** ở mục 6, là bất biến theo **nhóm** (nội bộ / bên ngoài), đặt gần dữ liệu.
- Tài khoản chung của công ty lữ hành chỉ là chuyện **lớp 4**; điều khoản thương mại của công ty đó (khi có) thuộc **lớp 6**, không bao giờ ghi lên tài khoản đăng nhập.
- Thêm vai mới sau này (nhà cung cấp cano/xe/nhà hàng, khách hàng…) = thêm **dữ liệu** vào danh mục vai, không sửa lõi. Một công ty có thể vừa là đối tác vừa là nhà cung cấp (hai vai trên cùng một hồ sơ).

## 3. Quyết định chủ dự án đã chốt (2026-09-24, phiên chat)

| # | Quyết định |
|---|---|
| Q1 | Mỗi người/tổ chức một hồ sơ; 11 vai chia hai nhóm **nội bộ** (Giám đốc, Điều hành chung, Hướng dẫn viên nội bộ, Nhân viên kinh doanh, Thực tập sinh, Kế toán) và **bên ngoài** (Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên); ai cũng có thể được cấp tài khoản. |
| Q2 | Người phụ trách: **HDV nội bộ là chính**, nội bộ khác (Giám đốc, Điều hành, Kinh doanh) thay khi cần; **HDV độc lập không nhận đơn** (bỏ "xin nhận" của ADR-0014 điều 10). |
| Q3 | **Mọi vai nội bộ lên đơn được**, kể cả Kế toán, HDV nội bộ, Thực tập sinh. |
| Q4 | Công ty lữ hành: **một tài khoản chung** cho cả công ty. |
| Q5 | Thu tiền mặt tại cảng: **đợt sau**. |
| Q6 | **Cách A:** vai quyết định bộ quyền mặc định; quản trị chỉnh thêm/bớt từng người. |
| Q7 | Phần 1 đã sửa: **Giám đốc = Toàn quyền**, Điều hành chung = Quản trị (bảng mục 4); mức mới **Thực tập**; nhãn "Super Admin" đổi thành **"Toàn quyền"**. Kèm 4 giả định đã duyệt: nhiều vai = hợp quyền; Kế toán không thay người phụ trách; 5 vai bên ngoài cùng quyền Đối tác; **chỉ HDV nội bộ lập đơn mới tự thành người phụ trách**. |
| Q8 | Hiển thị bảng: **cách A** — một nguồn duy nhất, hiện ở nhiều nơi. |
| Q9 | Phần 2 (luồng một đơn) duyệt, kèm hai giả định: HDV nội bộ tự nhận đơn chưa có người; không thêm trạng thái "đã hoàn thành" đợt này. Đơn của đối tác **cần nội bộ tiếp nhận trong thời hạn**, đối tác phải thấy đã có người nhận và giờ nhận. |
| Q10 | Thời hạn tiếp nhận **15 phút**, **Toàn quyền đổi được**; ngoài giờ làm việc tính từ giờ mở cửa hôm sau; quá hạn: **nổi đỏ Trang chủ nội bộ + đối tác thấy "quá hạn" + báo đẩy tới điện thoại Điều hành**; đối tác thấy **tên + SĐT người phụ trách + giờ nhận**. |
| Q11 | Phần 3 (tài khoản chung công ty lữ hành gắn hồ sơ công ty) duyệt. |
| Q12 | **Có luật cứng** theo nhóm, cả quản trị cũng không chỉnh tay phá được. |
| Q13 | Đồng hồ bắt đầu khi đối tác bấm nút **"Gửi đơn hàng"**. |
| Q14 | **Ghi "người giới thiệu" trên đơn ngay đợt này** (chưa tính hoa hồng). |
| Q15 | Bảng vai → quyền **cố định**, đổi qua duyệt + phát hành; chỉ thời hạn tiếp nhận và giờ làm việc chỉnh trong ứng dụng. |
| Q16 | Trang "Vai & quyền": **điện thoại dạng thẻ, máy tính dạng bảng** (có nút chuyển sang thẻ), cùng một nguồn. |

Và **ADR-0017** (accepted 2026-09-24) phải được hấp thụ nguyên vẹn vào bộ quyền của vai HDV nội bộ: xem mọi đơn kể cả tiền (số hiện hành sau điều chỉnh), mở `/orders` + Trang chủ cho `FIELD`, `PARTNER` không nới thêm ô nào. Rủi ro "HDV nghỉ việc đã kịp xem toàn bộ khách và tiền" chủ đã nghe và vẫn quyết (P18 — không nhắc lại).

## 4. Danh mục vai (11 vai)

Mã vai là **dữ liệu** trong `pty_role_type` (thêm cột `role_group`: `INTERNAL` / `EXTERNAL` / `OTHER`). Bộ quyền mặc định của từng vai nằm **trong mã** (mục 12), không trong cơ sở dữ liệu (Q15).

| Nhóm | Vai | Mã đề xuất | Mức quyền mặc định | Được phụ trách đơn |
|---|---|---|---|---|
| Nội bộ | Giám đốc | `DIRECTOR` | Toàn quyền (`SUPER_ADMIN`) | Thay khi cần |
| Nội bộ | Điều hành chung | `OPERATIONS_MANAGER` | Quản trị (`ADMIN`) | Thay khi cần |
| Nội bộ | Hướng dẫn viên nội bộ | `GUIDE_INTERNAL` | Hướng dẫn viên (`FIELD`) | **Chính** |
| Nội bộ | Nhân viên kinh doanh | `SALES_STAFF` | Kinh doanh (`SALES`) | Thay khi cần |
| Nội bộ | Thực tập sinh | `INTERN` | Thực tập (`INTERN`, **mức mới**) | Không |
| Nội bộ | Kế toán | `ACCOUNTANT` (có sẵn) | Kế toán (`ACCOUNTING`) | Không |
| Bên ngoài | Công ty lữ hành | `TRAVEL_AGENCY` | Đối tác (`PARTNER`) — tài khoản gắn hồ sơ **công ty** | Không (luật cứng) |
| Bên ngoài | Hướng dẫn viên độc lập | `GUIDE_FREELANCE` | Đối tác | Không (luật cứng) |
| Bên ngoài | Lễ tân khách sạn | `HOTEL_RECEPTION` | Đối tác | Không (luật cứng) |
| Bên ngoài | Tài xế taxi | `TAXI_DRIVER` | Đối tác | Không (luật cứng) |
| Bên ngoài | Cộng tác viên | `COLLABORATOR` | Đối tác | Không (luật cứng) |

**Mã vai cũ** (`migrations/0011_parties.sql`): `STAFF`, `SALES`, `ACCOUNTANT`, `GUIDE`, `BOAT_CAPTAIN`, `DRIVER`, `AGENT`, `CUSTOMER`.
- `ACCOUNTANT` dùng lại cho Kế toán. `CUSTOMER`, `BOAT_CAPTAIN`, `DRIVER` (tài xế đưa đón — **khác** tài xế taxi giới thiệu khách) giữ, nhóm `OTHER` (không thuộc 11 vai, không sinh quyền).
- `STAFF`, `SALES`, `GUIDE`, `AGENT` là mã mơ hồ (vd. `GUIDE` không nói nội bộ hay độc lập). Không xoá (không xoá cứng); đánh dấu ngưng dùng cho gán mới; dòng đang mở được **đóng lại khi gán vai mới** qua bước chuyển đổi (mục 13), không tự động.

Một hồ sơ có thể giữ **nhiều vai** cùng lúc (vd. Giám đốc kiêm HDV nội bộ) — quyền = hợp các bộ mặc định. Không giữ cùng lúc vai nội bộ và vai bên ngoài (luật cứng LC-3).

## 5. Mức quyền và bảng thao tác

Bảy mã quyền: `SALES` (Kinh doanh), `ACCOUNTING` (Kế toán), `ADMIN` (Quản trị), `FIELD` (Hướng dẫn viên), **`INTERN` (Thực tập — mới)**, `PARTNER` (Đối tác), `SUPER_ADMIN` (**Toàn quyền** — đổi nhãn).

Ký hiệu phạm vi như `src/shared/permissions.ts`: `none` / `own` (đơn mình lập) / `assigned` (đơn mình đang phụ trách) / `ownOrAssigned` / `any`. **Δ** = đổi so với `main` hôm nay; nguồn của thay đổi ghi trong ngoặc.

| Thao tác | SALES | ACCOUNTING | ADMIN | FIELD | INTERN (mới) | PARTNER | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|
| `order.view` (xem đơn) | any | any | any | **any** Δ (0017) | own | own | any |
| `money.view` (xem tiền, bảng giá) | any | any | any | **any** Δ (0017) | own | own | any |
| `order.history.view` (lịch sử sửa đơn) | ownOrAssigned | any | any | **any** Δ (0017, xem §16-6) | own | own | any |
| `contact.view` (tên/SĐT khách, điểm đón, giờ) | any | any | any | **any** Δ (0017) | own | **own** Δ (LC-1) | any |
| `order.create` (lập đơn) | any | **any** Δ (Q3) | any | **any** Δ (Q3) | any | any | any |
| `order.modify` (sửa/huỷ đơn nháp — **không còn gồm xác nhận**) | ownOrAssigned | **own** Δ (Q3) | any | **ownOrAssigned** Δ (§16-3) | own | own | any |
| **`order.confirm`** (xác nhận đơn — **tách mới** khỏi `order.modify`) | ownOrAssigned | none | any | assigned | none | **none** Δ (§16-4) | any |
| **`order.submit`** ("Gửi đơn hàng" — **mới**) | none | none | none | none | none | own | any |
| `order.trip.edit` | ownOrAssigned | none | any | none | none | none | any |
| `task.progress` | none | none | any | assigned | none | **none** Δ (LC-1) | any |
| `order.money.edit` (sau xác nhận) | own | any | any | assigned | none | none | any |
| `order.cancel` (huỷ hẹp của người phụ trách) | none | none | none | assigned | none | none | any |
| `dispatch.assign` (giao/đổi người phụ trách) | ownOrAssigned | none | any | none | none | none | any |
| `dispatch.claim` (tự nhận đơn chưa có người) | any | none | any | **any** Δ (Q9) | none | none | any |
| `dispatch.guides.view`, `dispatch.request` | **bỏ** Δ (Q2 — ADR-0014 điều 9/10 bị thay; chưa từng có route) | | | | | | |
| `payment.receive` | own | any | any | none | none | none | any |
| `payment.refund`, `invoice.issue` | none | any | any | none | none | none | any |
| `invoice.request` | own | any | any | none | none | none | any |
| `party.view`, `party.write` | any | any | any | none | none | none | any |
| `admin.manage` | none | none | any (có `canManageAccount` + LC-4) | none | none | none | any |
| `admin.manage.superadmin` | none | none | none | none | none | none | any |
| **`settings.ops`** (cài đặt vận hành: thời hạn, giờ làm việc — **mới**) | none | none | none | none | none | none | any |
| `feedback.submit` | any | any | any | any | any | any | any |
| `feedback.view` | own | own | any | own | own | own | any |
| `feedback.triage` | none | none | any | none | none | none | any |

Ghi chú:
- `INTERN` lập đơn tạo hồ sơ khách qua ngoại lệ ADR-0011 như `PARTNER` (không cần `party.view`). `INTERN` không phải "văn phòng" (`order.view` = own) → dùng trang Đơn hàng như Đối tác; `canAccessOrders` phải gồm `INTERN`; `homeRedirect` (đã có, `src/shared/start-page.ts`) tự đưa họ sang `/orders`.
- Với ADR-0017, `FIELD` trở thành "văn phòng" (`order.view` = any) → vào Trang chủ; mục "Đơn hàng" hiện trong menu của họ; các mục quản trị vẫn không.
- `SUPER_ADMIN` = any ở mọi dòng, không ngoại lệ (giữ ADR-0014 điều 2).

## 6. Luật cứng (bất biến theo nhóm — không ai chỉnh tay phá được)

Đặt **gần dữ liệu** (trigger D1 như `0017_order_status_audit_guards.sql`) **và** ở tầng miền, **và** có câu kiểm chỉ-đọc trong `scripts/audit-invariants.mjs`.

| Mã | Luật | Chặn ở |
|---|---|---|
| **LC-1** | Tài khoản có vai **bên ngoài** đang hiệu lực chỉ giữ được mức quyền **Đối tác** — không bao giờ giữ `SALES`/`ACCOUNTING`/`ADMIN`/`FIELD`/`INTERN`/`SUPER_ADMIN`. Hệ quả: chỉ thấy đơn của mình, không bao giờ làm người phụ trách. | trigger trên `stf_permission` + miền + audit |
| **LC-2** | Người phụ trách (dòng `HANDLE` đang mở) phải là hồ sơ có **vai nội bộ đang hiệu lực** và tài khoản đang hoạt động đủ điều kiện `checkAssignee`. | trigger trên `dsp_assignment` + `checkAssignee` + audit |
| **LC-3** | Một hồ sơ không giữ **cùng lúc** vai nội bộ và vai bên ngoài (theo khoảng hiệu lực). Theo thời gian thì được (lễ tân sau vào làm nội bộ: đóng vai cũ, mở vai mới). | trigger trên `pty_party_role` + miền |
| **LC-4** | Chỉ **Toàn quyền** gán/gỡ vai mang mức **Quản trị trở lên** (Giám đốc, Điều hành chung) và mức Toàn quyền; Quản trị chỉ gán vai cho tài khoản "cấp dưới" (mở rộng `canManageAccount`, ADR-0014 điều 8). | miền (cần biết người thực hiện) + nhật ký |
| **LC-5** | **Hạn tiếp nhận chốt lúc gửi**: đã đặt thì không đổi, kể cả khi cài đặt 15 phút đổi sau đó. | trigger trên cột hạn |
| **LC-6** | Có nhật ký cho: gán/gỡ vai, chỉnh quyền tay, đổi cài đặt vận hành, gửi đơn, tiếp nhận (ai, khi nào, trước → sau). | miền (cùng `db.batch()` với thay đổi) |

## 7. Quyền hiệu lực của một tài khoản

- **Quyền hiệu lực** = (hợp bộ quyền mặc định của các vai **đang hiệu lực** của hồ sơ) **+ cộng tay − bớt tay**, rồi lọc theo luật cứng (LC-1).
- **Chỉnh tay lưu riêng** (bảng mới, mỗi dòng: tài khoản, mã quyền, cộng/bớt, lý do, ai, khi nào, hiệu lực) — **đổi vai không làm mất phần chỉnh tay**, và luôn biết quyền nào đến từ vai, quyền nào do người chỉnh.
- `stf_permission` giữ vai trò **bản hiện thực hoá** của quyền hiệu lực để `can()` và cách nạp quyền theo phiên hiện có không đổi (đề xuất kỹ thuật; người lập kế hoạch chốt). Một hàm duy nhất tính lại khi vai/chỉnh tay đổi, và khi một vai **hết hạn theo ngày**.
- **Tài khoản chưa được gán vai mới giữ nguyên quyền hiện tại** (coi như toàn bộ là chỉnh tay) — để phát hành không đổi quyền của ai (tiêu chí 9).

## 8. Luồng một đơn

```
Lập đơn (nháp) ──► [chỉ đơn của tài khoản bên ngoài] Gửi đơn hàng ──► Tiếp nhận ──► Xác nhận ──► Người phụ trách làm việc
      │                                                  (có người phụ trách)   (chốt với khách)   (gọi, đón, tiến độ; sửa số khách, huỷ có lý do)
      └──────────────────────────────── Huỷ (nháp hoặc đã xác nhận, kèm lý do; không quay lại) ◄──────────────┘
```

1. **Lập đơn:** mọi vai nội bộ và mọi đối tác (Q3). Trạng thái vẫn là `draft` / `confirmed` / `cancelled` — **không thêm trạng thái mới** (Q9); "đã gửi" và "đã tiếp nhận" là **mốc thời gian** trên đơn nháp (tránh dựng lại bảng `orders` và trigger 0017).
2. **Người phụ trách mặc định:** chỉ khi người lập là **HDV nội bộ** (đủ điều kiện LC-2) — người khác lập thì đơn **chưa có người phụ trách** (Q7; thay ADR-0009 điều 4 và ADR-0014 điều 9).
3. **Gửi đơn hàng** (chỉ đơn của tài khoản bên ngoài, Q13): trước khi gửi, nháp **chỉ đối tác thấy** (danh sách nội bộ không hiện nháp chưa gửi của đối tác). Bấm "Gửi đơn hàng" → ghi mốc gửi + **chốt hạn tiếp nhận** (mục 9) + nhật ký.
4. **Tiếp nhận** = đơn có người phụ trách lần đầu: Điều hành/Kinh doanh **giao** (`dispatch.assign`) cho HDV nội bộ, hoặc người được phụ trách **tự nhận** (`dispatch.claim`: HDV nội bộ, Kinh doanh, Điều hành, Giám đốc). Ghi mốc tiếp nhận (lần đầu) — đo đúng hạn theo mốc này. Đổi người sau đó: đối tác thấy người phụ trách **hiện tại** và giờ người đó nhận.
5. **Xác nhận** (`order.confirm`): người phụ trách (hoặc người lập nội bộ có quyền) chốt với khách. Đơn của Đối tác và Thực tập sinh **luôn do nội bộ xác nhận** (Q9).
6. **Người phụ trách làm việc:** gọi xác nhận khách đi tour, đón khách, cập nhật tiến độ; sửa số khách (`order.money.edit`), huỷ kèm lý do (`order.cancel`) — như ADR-0014 điều 6/11. Thu tiền: đợt sau (Q5).
7. **Đối tác sửa đơn sau khi gửi:** được sửa tới khi đơn được xác nhận; sửa sau khi đã tiếp nhận thì người phụ trách được báo (chấm đếm trong ứng dụng, cùng khuôn ADR-0014 điều 12) và thấy phần đã sửa.

## 9. Hạn tiếp nhận

- **Cài đặt vận hành** (trang mới, chỉ Toàn quyền — `settings.ops`): thời hạn tiếp nhận (mặc định **15 phút**), giờ làm việc (mặc định **07:00–21:00 mỗi ngày**, giờ Việt Nam). Mỗi lần đổi ghi nhật ký (LC-6).
- **Cách tính:** hạn = lúc gửi + N **phút làm việc**. Gửi ngoài giờ → bắt đầu tính từ giờ mở cửa kế tiếp. Còn thiếu phút cuối ngày thì phần còn lại tính sang sáng hôm sau (gửi 20:55 với 15 phút → hạn 07:10 hôm sau). **Không tính ngày lễ** đợt này.
- **Chốt vào đơn lúc gửi** (LC-5).
- **Chỉ áp cho đơn từ tài khoản bên ngoài.** Đơn của Thực tập sinh cần nội bộ xác nhận nhưng không tính hạn (xem §16-8).
- **Quá hạn** (chưa tiếp nhận và đã qua hạn):
  - **Nội bộ:** Trang chủ có khối **"Chờ tiếp nhận"** cho mọi người được nhận/giao (HDV nội bộ, Kinh doanh, Điều hành, Giám đốc) — đơn quá hạn màu đỏ, xếp đầu; trang Đơn hàng có bộ lọc "Chờ tiếp nhận".
  - **Đối tác:** thấy "Quá hạn tiếp nhận" kèm số tổng đài công ty để gọi.
  - **Báo đẩy** tới điện thoại Điều hành — **giai đoạn cuối** (mục 14), vì hệ thống chưa có báo đẩy; trên iPhone chỉ nhận được khi ứng dụng đã được thêm vào màn hình chính.
- **Đối tác thấy trên đơn của mình:**
  - Chưa gửi: "Nháp — chưa gửi".
  - Đã gửi: "Đang chờ tiếp nhận — hạn HH:MM".
  - Quá hạn: "Quá hạn tiếp nhận — vui lòng gọi <tổng đài>".
  - Đã tiếp nhận: "Đã tiếp nhận lúc HH:MM — Người phụ trách: <tên>, <SĐT>".
  - Đã xác nhận: "Đã xác nhận lúc HH:MM".
- **SĐT người phụ trách** = số **liên hệ công việc** trong hồ sơ (ADR-0001: khác số đăng nhập). Chưa có số công việc → hiện số tổng đài công ty. Việc vận hành: nhập số công việc cho mỗi HDV.

## 10. Vai trên đơn

| Vai trên đơn | Là ai | Lưu ở |
|---|---|---|
| Người lập | Tài khoản đã lập | `orders.staff_id` (có) |
| Bên đặt | Người hoặc công ty đặt dịch vụ | `orders.booker_party_id` (có; hôm nay chỉ nhận `PERSON` — mở cho `ORGANIZATION`, ADR-0001 điều 7 đã cho phép) |
| Khách đi tour | Người HDV gọi xác nhận và đón | liên hệ khách trên đơn (tên + SĐT, có) |
| **Người giới thiệu** | Hồ sơ có vai bên ngoài đã giới thiệu khách | **mới** — cột trên `orders` (Q14) |
| Người phụ trách | Hồ sơ nội bộ đang lo đơn | `dsp_assignment` `HANDLE` (có) |

Quy tắc theo loại đối tác (đề xuất — xem §16-1):
- **Công ty lữ hành ("bán lại"):** đơn lập từ tài khoản công ty → **bên đặt = hồ sơ công ty** (tự động, không sửa); khách đi tour = người công ty nhập.
- **Cá nhân bên ngoài ("giới thiệu": HDV độc lập, lễ tân, tài xế taxi, CTV):** bên đặt = khách (như hôm nay, ADR-0011); **người giới thiệu = hồ sơ của tài khoản đó** (tự động, không sửa).
- **Nội bộ lập đơn:** bên đặt = khách hoặc một công ty lữ hành (chọn); người giới thiệu **tuỳ chọn**, chọn trong các hồ sơ có vai bên ngoài đang hiệu lực (tìm theo tên/SĐT).

Chưa tính hoa hồng; chỉ ghi để không mất lịch sử.

## 11. Công ty lữ hành — tài khoản chung

- Hồ sơ **công ty** (`ORGANIZATION`: tên, MST, địa chỉ) mang vai `TRAVEL_AGENCY`; **một tài khoản** trỏ thẳng vào hồ sơ công ty (`staff.party_id` → hồ sơ `ORGANIZATION`; hôm nay mã tạo tài khoản luôn tạo hồ sơ `PERSON`).
- SĐT đăng nhập = số của công ty; mọi người trong công ty dùng chung PIN; mỗi người bật Face ID trên máy riêng.
- **Khi một nhân viên công ty nghỉ:** quản trị **"Đặt lại PIN"** → hệ thống gỡ hết Face ID của tài khoản (quy tắc hiện có, ADR-0016). **Đính chính so với lời nói trong phiên chat:** nếu chính công ty **tự đổi PIN** thì Face ID trên các máy cũ **vẫn còn** (đúng quy tắc hiện có) — phải bấm "Gỡ tất cả" ở trang Tôi.
- Nhật ký ghi "Công ty X" — hệ thống không biết người nào trong công ty đã bấm (hệ quả của Q4, chủ đã chọn).
- Công ty chỉ thấy đơn của tài khoản công ty. Người liên hệ của công ty có thể ghi là hồ sơ người nối `CONTACT_OF` tới công ty (không có tài khoản) — cửa mở nếu sau này muốn mỗi người một tài khoản (ngưỡng ADR-0014 điều 5).
- **Tìm hồ sơ có sẵn trước khi tạo** (mọi tài khoản, không riêng công ty): tìm theo SĐT, và theo MST với công ty. Có sẵn → gắn tài khoản vào hồ sơ đó; tránh một lễ tân vốn là khách cũ bị hai hồ sơ. Hôm nay tạo tài khoản **luôn** sinh hồ sơ mới (`src/modules/staff/index.ts`).

## 12. Hiển thị bảng vai & quyền — một nguồn, bốn nơi (Q8, Q16)

- **Nguồn duy nhất trong mã** (đề xuất `src/shared/roles.ts`): danh mục 11 vai (mã, tên, nhóm, mức quyền mặc định, được phụ trách: chính/thay/không, mô tả ngắn) + **nhãn lời thường** cho từng thao tác của `MATRIX`. Mức quyền dùng chung `MATRIX` hiện có — không chép tay.
- **Nơi 1 — trang "Vai & quyền"** (mục trong nhóm "Tôi" ở menu, mọi tài khoản mở được): điện thoại dạng **thẻ theo vai** (nhóm, phụ trách, ✓ được làm, ✗ không được làm); máy tính dạng **bảng việc × vai** có nút "Dạng thẻ". Nội bộ thấy đủ 11 vai; tài khoản bên ngoài **chỉ thấy thẻ vai của mình**. Cuối trang: mục **"Luật cứng"** (mục 6, lời thường).
- **Nơi 2 — trang Tôi:** khối "Vai của bạn": vai đang giữ + ngày bắt đầu, danh sách việc được làm, và phần quản trị đã chỉnh riêng (nếu có).
- **Nơi 3 — màn tạo/sửa tài khoản:** chọn vai → xem trước bộ quyền sẽ cấp → chỉnh cộng/bớt trong giới hạn luật cứng → lưu (kèm lý do nếu chỉnh tay).
- **Nơi 4 — tài liệu tự sinh** `docs/VAI-VA-QUYEN.md` (lệnh sinh cùng khuôn `npm run dict`); **test so tệp đã commit với nguồn** — lệch thì đỏ.

## 13. Chuyển đổi dữ liệu hiện có (~30 tài khoản)

1. AI soạn **truy vấn chỉ-đọc** liệt kê tài khoản + quyền hiện tại; **chủ dự án tự chạy** trên D1 thật (AI không được `d1 execute` remote — CLAUDE.md §8).
2. AI lập **bảng đối chiếu từng người**: vai đề xuất · quyền hiện tại · quyền theo vai · khác biệt (thêm/mất quyền gì) · đề xuất chỉnh tay để giữ nguyên nếu cần.
3. **Chủ duyệt từng dòng.** Không gieo SĐT/tên thật vào migration (bài học chế độ bảo trì).
4. Gán vai bằng **màn quản trị mới** sau khi phát hành (Toàn quyền làm), không bằng migration. Trước lúc đó mọi tài khoản giữ nguyên quyền (mục 7).
5. `audit-invariants` thêm câu kiểm: tài khoản vi phạm LC-1/LC-3, người phụ trách vi phạm LC-2, tài khoản còn chưa gán vai mới (thông tin, không phải lỗi, cho tới khi chuyển đổi xong).

## 14. Giai đoạn thi công (mỗi giai đoạn phát hành được riêng, mỗi giai đoạn có người kiểm độc lập — việc lớn)

| GĐ | Nội dung | Phụ thuộc |
|---|---|---|
| **0** | ADR-0017 vào `main` (nhánh Đợt E hoặc tách riêng tệp ADR); **ADR-0018** soạn từ đặc tả này, chủ duyệt. (Vá "người lập được gán phụ trách không kiểm điều kiện" đang làm riêng, nhánh `sua-phu-trach-mac-dinh`.) | — |
| **1** | Danh mục vai (mã + nhóm), nguồn duy nhất `roles.ts`, mức `INTERN`, nhãn "Toàn quyền", chỉnh tay cộng/bớt, quyền hiệu lực, luật cứng LC-1/LC-3/LC-4/LC-6, tìm hồ sơ có sẵn khi tạo tài khoản, màn gán vai có xem trước. Tài khoản cũ giữ nguyên quyền. | GĐ0 |
| **2** | Bảng thao tác mới (mục 5): ADR-0017 cho `FIELD`, Q3 lên đơn, tách `order.confirm`, người phụ trách mặc định mới, HDV tự nhận, bỏ `dispatch.guides.view`/`dispatch.request`, LC-2. **Chuyển đổi 30 tài khoản** (mục 13) ngay sau phát hành. | GĐ1 |
| **3** | Hiển thị: trang "Vai & quyền", khối Tôi, tài liệu tự sinh + test lệch. | GĐ1 (có thể song song GĐ2) |
| **4** | Công ty lữ hành (tài khoản gắn hồ sơ công ty, bên đặt công ty) + người giới thiệu trên đơn. | GĐ1 |
| **5** | "Gửi đơn hàng", cài đặt vận hành, hạn tiếp nhận (LC-5), tiếp nhận, hiển thị cho đối tác, khối "Chờ tiếp nhận" + bộ lọc. | GĐ2, GĐ4 |
| **6** | Báo đẩy tới điện thoại Điều hành khi quá hạn (đăng ký thông báo trên ứng dụng, lịch kiểm mỗi phút). | GĐ5 |

## 15. Ngoài phạm vi

Sổ thu tiền mặt / hoàn tiền (N3); hoa hồng và tài khoản giao dịch (lớp 6); vai nhà cung cấp; trạng thái "đã hoàn thành"; ngày lễ trong giờ làm việc; nhiều tài khoản cho một công ty; báo đẩy cho đối tác; AI như một tác nhân có định danh.

## 16. Điểm chủ dự án cần xác nhận khi duyệt đặc tả (AI suy ra từ các quyết định — kèm khuyến nghị)

1. **Hai kiểu đối tác:** Công ty lữ hành là **bên đặt** (bán lại cho khách của họ); bốn vai cá nhân là **người giới thiệu** (bên đặt là khách). *Khuyến nghị: đồng ý* — khớp câu "đơn đứng tên công ty" ở phần 3 và câu "ghi người giới thiệu" (Q14).
2. **Đối tác không chọn HDV lúc lập đơn** (bỏ ADR-0014 điều 9) — nội bộ tiếp nhận theo hạn. *Khuyến nghị: đồng ý* — hai cách cùng lúc làm mốc "tiếp nhận" mất nghĩa.
3. **HDV nội bộ sửa được nháp và xác nhận được đơn mình phụ trách** — thêm vào ADR-0017 (ADR-0017 chỉ mở quyền xem). *Khuyến nghị: đồng ý* — HDV là người phụ trách chính (Q2), phải chốt được với khách.
4. **Đối tác mất quyền tự xác nhận đơn của mình** (hôm nay tự xác nhận được); **Kế toán lập đơn nhưng không tự xác nhận**; Thực tập không xác nhận. *Khuyến nghị: đồng ý* — đúng "đơn của đối tác/thực tập cần nội bộ xác nhận".
5. **Kinh doanh lập đơn không còn tự thành người phụ trách** (đã duyệt ở Q7) — đơn vào hàng "chưa có người"; Kinh doanh muốn lo thì bấm tự nhận. Nêu để chủ thấy hệ quả với thói quen hiện tại.
6. **HDV nội bộ xem được lịch sử sửa đơn** — ADR-0017 đảo ngược cả dòng ADR-0007 điều 3 ("xem tiền, bảng giá, nhật ký/lịch sử"), nhưng bản bàn giao chỉ liệt kê `contact.view`. *Khuyến nghị: đồng ý mở*, cho nhất quán với "xem mọi đơn kể cả tiền".
7. **Chỉ Toàn quyền gán vai Giám đốc và Điều hành chung** (LC-4). *Khuyến nghị: đồng ý* — tránh Quản trị tự tạo thêm Quản trị.
8. **Hạn tiếp nhận chỉ áp cho đơn từ tài khoản bên ngoài**; đơn Thực tập sinh cần nội bộ xác nhận nhưng không tính giờ. *Khuyến nghị: đồng ý.*
9. **Hạn tính theo phút làm việc** (gửi 20:55 → hạn 07:10 hôm sau); **không tính ngày lễ** đợt này. *Khuyến nghị: đồng ý.*
10. **Khối "Chờ tiếp nhận" trên Trang chủ hiện cho mọi người được nhận/giao** (HDV nội bộ, Kinh doanh, Điều hành, Giám đốc), không chỉ quản trị. *Khuyến nghị: đồng ý* — người nhận đơn phải thấy đơn chờ.

## 17. Rủi ro và điều chưa chắc

- **Chuyển đổi quyền 30 tài khoản:** gán sai vai = thừa/thiếu quyền. Giảm: tài khoản giữ nguyên quyền tới khi được gán vai; bảng đối chiếu chủ duyệt từng người; nhật ký mọi lần gán.
- **Luật cứng dựa trên dữ liệu vai:** LC-2 cần người phụ trách có vai nội bộ — **bật LC-2 chỉ sau khi chuyển đổi xong**, nếu không đơn đang mở của người chưa gán vai sẽ không đổi được người phụ trách.
- **Báo đẩy trên iPhone** chỉ chạy khi ứng dụng đã thêm vào màn hình chính (iOS 16.4 trở lên); chưa kiểm trên máy thật.
- **Chỉ một tài khoản Toàn quyền** (ADR-0014 điều 8, chủ đã chấp nhận): nay Toàn quyền còn giữ cài đặt vận hành và gán vai cấp cao — nếu tài khoản đó bị khoá thì chỉ còn SQL theo runbook.
- **ADR-0017 chưa có trên `main`** — phải gộp trước (GĐ0), tránh hai phiên bản `permissions.ts`.
- Chưa kiểm: công ty module có sẵn "số tổng đài" để hiện cho đối tác khi quá hạn hay chưa (kiểm lúc lập kế hoạch).

## 18. Hệ quả kỹ thuật (cho người lập kế hoạch — không phải việc của chủ)

- **Đảo test đã ghim hành vi cũ, có chủ đích (đỏ → xanh):** `src/shared/start-page.test.ts` ("chỉ FIELD → không chuyển") và bước C/D-1 của `docs/evidence/2026-09-23-trang-chu-moi/kich-ban/trang-chu-smoke.mjs` ghim banner lỗi của `FIELD` — sau ADR-0017 `FIELD` là văn phòng. Test ghim `PARTNER` tự xác nhận đơn, và e2e `tests/e2e/dispatch.mjs` ghim "người lập = người phụ trách" cho `SALES` — đổi theo §16-4/§16-5.
- **Tách `order.confirm` khỏi `order.modify`:** route `POST /api/orders/:id/status` (confirmed) đổi sang hỏi `order.confirm`; huỷ nháp vẫn qua `order.modify`.
- **Tài khoản trỏ hồ sơ `ORGANIZATION`:** rà các đường mặc định là `PERSON` — tạo tài khoản (`src/modules/staff/index.ts`), `resolveBooker` (`src/shared/booker.ts:47`, `orders/repository.ts:503`), nhãn tài khoản, "Việc của tôi", người phụ trách mặc định.
- **`canAccessOrders`** phải gồm `INTERN`; **`isOffice`** tự đúng cho `FIELD` khi `order.view` = any.
- **`src/shared/contracts.ts`:** chú thích `MyAssignmentDto` ("không để tiền lọt vào") lỗi thời sau ADR-0017 — sửa cho đúng (tài liệu mô tả thua mã).
- **Đợt E:** chế độ thẻ đơn `"no-total"` (`web/order-card.ts`, nhánh `dot-e-the-don-gon-va-bieu-tuong`) có thể thừa vì HDV nay thấy tổng — quyết khi gộp.
- **Trang mới** ("Vai & quyền", "Cài đặt vận hành"): khai `PAGES` (`src/shared/sw-policy.ts`) + script `build:web`; đăng ký kịch bản Chrome trong `web/CLAUDE.md` (đề xuất, chủ duyệt — N9).
- **Bảng/cột mới** → `docs/data-dictionary.json` + `npm run dict`; migration từ 0024, chỉ thêm (expand–contract).
- **Báo đẩy (GĐ6):** Cron của Worker hiện chạy 15 phút/lần (đồng bộ danh mục) — hạn 15 phút cần lịch kiểm mỗi phút hoặc cơ chế hẹn giờ; khoá VAPID là bí mật (`wrangler secret put`, chủ tự chạy).
- Mọi giai đoạn: `npm test`, `npm run typecheck`, `npm run test:e2e` đủ bộ, kịch bản Chrome liên quan, `audit-invariants`; người kiểm độc lập chỉ-đọc (việc lớn: dữ liệu + quyền).
