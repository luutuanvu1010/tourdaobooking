# Đặc tả: Mô hình người – vai – quyền (11 vai), luồng nhận đơn và tiền của đơn đối tác

- **Ngày:** 2026-09-24 · **Trạng thái:** BẢN NHÁP VÒNG 3 — đã cập nhật theo câu trả lời của chủ ở vòng 1 (4 phần thiết kế), vòng 2 (10 điểm + 4 câu) và vòng 3 (8 điểm + 3 câu), cùng ngày. Chờ chủ dự án duyệt bản viết.
- **Người soạn:** AI (phiên "mô hình người–vai–quyền"). AI **không tự duyệt** (N3, Điều 7.2).
- **Nguồn quyết định:** câu trả lời của chủ dự án trong phiên chat 2026-09-24 (mục 3). Tài liệu tham chiếu triết lý: `docs/Ref/Oracle-crm-triet-ly-va-checklist.md`, `docs/Ref/thiet-ke-party-relationship-tca.md`.
- **Liên quan:** ADR-0001 (danh tính Party–Role–Relationship), ADR-0005 (quyền app đa trị), ADR-0007 (bản đồ quyền), ADR-0009 (người phụ trách), ADR-0010 (hoá đơn là bản chụp), ADR-0011 (khách trên đơn), ADR-0013 (proposed), ADR-0014 (đối tác, Super Admin), **ADR-0017** (accepted 2026-09-24 — HDV nội bộ xem mọi đơn kể cả tiền; **tệp chỉ đang nằm trên nhánh chưa gộp `dot-e-the-don-gon-va-bieu-tuong`**; bàn giao: `docs/superpowers/specs/2026-09-24-adr-0017-ban-giao-cho-mo-hinh-vai.md` cùng nhánh đó).
- **ADR mới dự kiến:** bắt đầu từ **ADR-0018** (kiểm 2026-09-24 trên mọi nhánh chưa gộp: lớn nhất trên `main` là 0016, 0017 đã dùng ở nhánh Đợt E). Có thể tách 3 ADR theo chủ đề: (a) người–vai–quyền + luật cứng, (b) luồng nhận đơn + hạn nhận, (c) đối tác là bên đặt, khách của đối tác, chiết khấu. Migration mới bắt đầu từ **0024** (lớn nhất trên `main`: `0023_auth_passkey.sql`; số `0019` để dành cho B5).

---

## 0. Tóm tắt (cho chủ dự án)

Mỗi **người hoặc công ty** có **một hồ sơ**. Hồ sơ mang **vai** với Tour Đảo (11 vai, 2 nhóm nội bộ / bên ngoài), có ngày bắt đầu – kết thúc. **Vai sinh ra bộ quyền mặc định**; quản trị chỉnh thêm/bớt được từng người nhưng **không phá được luật cứng** (tài khoản bên ngoài không bao giờ làm người phụ trách, chỉ thấy đơn của mình). Bảng vai → quyền **cố định trong hệ thống**, hiện ở trang "Vai & quyền", trang Tôi, màn tạo tài khoản và tài liệu tự sinh — một nguồn.

**Mọi đối tác bên ngoài là bên đặt**: bán cho khách theo giá của họ, được giảm giá cho khách; phiếu gửi khách luôn theo giá bán lẻ. Tour Đảo tính **chiết khấu** cho đối tác trên giá bán lẻ, **khác nhau theo từng dịch vụ và từng đối tác** (bảng cấu hình có nhóm đối tác, loại dịch vụ; ô cụ thể nhất thắng); đợt này ghi và hiện "đối tác phải trả Tour Đảo", công nợ và hoá đơn VAT làm ở đợt thu tiền. Khách của đối tác là **một hồ sơ người nối quan hệ "khách của <đối tác>"** — không thành khách hàng của Tour Đảo.

**Mọi đơn đều có một người nhận của Tour Đảo** — người đó xác nhận và chăm sóc đơn. Nội bộ lập đơn thì mặc định tự nhận; chọn người khác thì người đó phải **bấm "Nhận"**. Đơn chờ nhận có **hạn 15 phút làm việc** (06:15–21:00, mọi ngày) — quá hạn thì nổi đỏ cho mọi người, đối tác thấy "quá hạn", và (giai đoạn cuối) báo đẩy tới Điều hành.

## 1. Tiêu chí thành công (hành vi kiểm được)

1. Trang "Vai & quyền" hiện đủ 11 vai đúng bảng trong mã; `docs/VAI-VA-QUYEN.md` tự sinh từ cùng nguồn — lệch thì `npm test` đỏ.
2. Chọn vai → màn tạo/sửa tài khoản hiện trước bộ quyền sẽ cấp. Cố cấp quyền nội bộ cho tài khoản bên ngoài → **cơ sở dữ liệu từ chối**.
3. Tài khoản bên ngoài **không bao giờ** thành người phụ trách (qua giao, nhận, mặc định) và chỉ thấy đơn của chính mình.
4. Nội bộ lập đơn → **tự thành người nhận ngay** (mốc tiếp nhận = lúc lập). Chọn người khác → người đó thấy đề nghị và phải **bấm "Nhận"** trong hạn; chưa bấm thì đơn vẫn "chờ nhận". Kế toán và Thực tập sinh chỉ nhận đơn mình lập hoặc đơn Giám đốc / Điều hành chung giao.
5. Đổi người phụ trách của đơn đã có người: người cũ **vẫn phụ trách** cho tới khi người mới bấm "Nhận" — đơn không bao giờ rơi vào khoảng trống.
6. Đối tác bấm **"Gửi đơn hàng"** (có thể kèm HDV đề xuất) → hạn nhận = 15 phút làm việc sau lúc gửi, **chốt vào đơn**. Gửi 21:30 hoặc 05:00 → hạn 06:30; gửi 20:50 → hạn 06:20.
7. Đơn quá hạn: đỏ và xếp đầu ở khối "Chờ tiếp nhận" (Trang chủ, mọi người trong công ty) và bộ lọc "Chờ tiếp nhận" (Đơn hàng); đối tác thấy "Quá hạn tiếp nhận".
8. Đơn đã nhận: đối tác thấy **tên, SĐT công việc của người phụ trách và giờ nhận**.
9. **Ví dụ đại lý A tính đúng ở máy chủ:** tạm tính 5.000.000, giảm giá 250.000, cọc 3.000.000 do đại lý giữ, chiết khấu 10% → khách còn trả tại cảng **1.750.000**; đại lý phải trả Tour Đảo **4.500.000**; dự kiến đại lý còn phải trả **2.750.000**. Phiếu gửi khách **không** có dòng chiết khấu hay số đại lý phải trả.
10. Tài khoản công ty lữ hành gắn vào **hồ sơ công ty**; đơn của mọi tài khoản bên ngoài đứng tên **đối tác đó** là bên đặt.
11. **Không tài khoản hiện có nào bị đổi quyền** cho tới khi chủ duyệt bảng đối chiếu từng người (mục 14).
12. Có nhật ký cho: gán/gỡ vai, chỉnh quyền tay, đổi cài đặt vận hành, sửa cấu hình chiết khấu, sửa tỷ lệ trên một đơn, gửi đơn, đề nghị nhận, bấm nhận.
13. **Chọn tỷ lệ chiết khấu đúng ô cụ thể nhất** (ví dụ nhiều dòng ở mục 11): vé Hòn Tằm của đại lý A → 12% (ô riêng), du thuyền → 15% (nhóm + loại), tour đảo → 10% (nhóm + mọi dịch vụ); đại lý A phải trả **5.210.000**. Không khớp ô nào → 0% và Kế toán thấy cảnh báo.
14. **Khách của đối tác** là hồ sơ người nối quan hệ "khách của <đối tác>"; cùng SĐT → cùng một hồ sơ; không hiện trong danh sách khách hàng của Tour Đảo; đối tác không thấy khách đó ở đối tác khác hay ở đơn trực tiếp của Tour Đảo.

## 2. Nguyên tắc: sáu lớp tách riêng (theo checklist Oracle / TCA)

| Lớp | Là gì | Lưu ở đâu (hiện có / mới) |
|---|---|---|
| 1. **Hồ sơ** | Người (`PERSON`) hoặc tổ chức (`ORGANIZATION`) — có trước mọi vai | `pty_party`, `pty_person`, `pty_organization` (có) |
| 2. **Vai với Tour Đảo** | Ngữ cảnh quan hệ của hồ sơ với công ty, **hiệu lực theo ngày** | `pty_party_role` + `pty_role_type` (có; thêm mã vai và cột nhóm) |
| 3. **Vai trên từng đơn** | Người lập, bên đặt, khách đi tour, người phụ trách (người nhận), HDV được đề xuất | cột của `orders`, `dsp_assignment` (một phần có; thêm HDV đề xuất, đề nghị nhận); khách của đối tác = hồ sơ + quan hệ `CUSTOMER_OF` (mới) |
| 4. **Tài khoản đăng nhập** | Cửa vào ứng dụng, trỏ đúng một hồ sơ | `staff` (`staff.party_id`, tối đa một tài khoản mỗi hồ sơ — có) |
| 5. **Quyền** | Việc được làm, **sinh từ vai** + chỉnh tay | `stf_permission` (có) + bảng chỉnh tay (mới) |
| 6. **Quan hệ thương mại** | Chiết khấu, công nợ, điều khoản thanh toán, hoá đơn — gắn với **quan hệ với đối tác**, không gắn vào tài khoản đăng nhập | **Đợt này: nhóm đối tác, loại dịch vụ, bảng chiết khấu** (mới, cấu hình). Công nợ, đối soát, hoá đơn: đợt thu tiền |

Hệ quả thiết kế:
- **Vai không trực tiếp làm cổng chặn** (giữ ADR-0001 điều 4, ADR-0005): vai sinh ra quyền, **quyền** là cổng — trừ **luật cứng** (mục 6), là bất biến theo **nhóm**, đặt gần dữ liệu.
- Tài khoản chung của công ty lữ hành chỉ thuộc lớp 4; chiết khấu của công ty đó thuộc lớp 6 — không bao giờ ghi lên tài khoản đăng nhập.
- Thêm vai sau này (nhà cung cấp cano/xe/nhà hàng, khách hàng…) = thêm **dữ liệu**, không sửa lõi. Một công ty có thể vừa là đối tác vừa là nhà cung cấp.
- **Khách của đối tác là hồ sơ người** (định danh trước vai), nối quan hệ `CUSTOMER_OF` tới đối tác — **không** mang vai `CUSTOMER` của Tour Đảo. Một người vừa là khách của đại lý A vừa tự đặt với Tour Đảo = **một hồ sơ, hai quan hệ**.

## 3. Quyết định chủ dự án đã chốt (2026-09-24, phiên chat)

**Vòng 1 (bốn phần thiết kế):**

| # | Quyết định |
|---|---|
| Q1 | Mỗi người/tổ chức một hồ sơ; 11 vai: **nội bộ** (Giám đốc, Điều hành chung, Hướng dẫn viên nội bộ, Nhân viên kinh doanh, Thực tập sinh, Kế toán), **bên ngoài** (Công ty lữ hành, Hướng dẫn viên độc lập, Lễ tân khách sạn, Tài xế taxi, Cộng tác viên); ai cũng có thể được cấp tài khoản. |
| Q2 | Người phụ trách: **HDV nội bộ là chính**, nội bộ khác thay khi cần; **HDV độc lập không nhận đơn** (bỏ "xin nhận" của ADR-0014 điều 10). |
| Q3 | **Mọi vai nội bộ lên đơn được**, kể cả Kế toán, HDV nội bộ, Thực tập sinh. |
| Q4 | Công ty lữ hành: **một tài khoản chung** cho cả công ty. |
| Q5 | Thu tiền mặt tại cảng (ghi sổ thu): **đợt sau**. |
| Q6 | **Cách A:** vai quyết định bộ quyền mặc định; quản trị chỉnh thêm/bớt từng người. |
| Q7 | **Giám đốc = Toàn quyền**, Điều hành chung = Quản trị; mức mới **Thực tập**; nhãn "Super Admin" → **"Toàn quyền"**. Nhiều vai = hợp quyền; 5 vai bên ngoài cùng quyền Đối tác. *(Hai giả định khác của phần này — "Kế toán không thay người phụ trách" và "chỉ HDV nội bộ lập đơn mới tự thành người phụ trách" — đã được Q20 thay.)* |
| Q8 | Hiển thị bảng: một nguồn duy nhất, hiện ở nhiều nơi. |
| Q9 | Luồng một đơn; HDV nội bộ tự nhận đơn chưa có người; không thêm trạng thái "đã hoàn thành" đợt này; đơn của đối tác cần Tour Đảo tiếp nhận trong thời hạn, đối tác thấy đã có người nhận và giờ nhận. |
| Q10 | Hạn tiếp nhận **15 phút**, **Toàn quyền đổi được**; ngoài giờ tính từ giờ mở cửa hôm sau; quá hạn: **nổi đỏ Trang chủ + đối tác thấy "quá hạn" + báo đẩy tới điện thoại Điều hành**; đối tác thấy **tên + SĐT người phụ trách + giờ nhận**. |
| Q11 | Tài khoản chung công ty lữ hành gắn **hồ sơ công ty**. |
| Q12 | **Có luật cứng** theo nhóm, quản trị cũng không chỉnh tay phá được. |
| Q13 | Đồng hồ của đơn đối tác bắt đầu khi bấm **"Gửi đơn hàng"**. |
| Q14 | *(Đã được Q28 thay: không còn ô "người giới thiệu".)* |
| Q15 | Bảng vai → quyền **cố định**, đổi qua duyệt + phát hành; chỉ thời hạn và giờ làm việc chỉnh trong ứng dụng. |
| Q16 | Trang "Vai & quyền": **điện thoại dạng thẻ, máy tính dạng bảng** (có nút chuyển), cùng một nguồn. |

**Vòng 2 (trả lời 10 điểm + 4 câu hỏi):**

| # | Quyết định |
|---|---|
| Q17 | **Mọi thực thể bên ngoài là bên đặt**, bán theo giá của họ, được giảm giá cho khách; **phiếu xác nhận khách nhận luôn theo giá bán lẻ**. Ví dụ của chủ: đại lý A — tổng 5.000.000, khuyến mại 250.000, đã thu 3.000.000 → HDV thu tại cảng 1.750.000; đại lý hưởng chiết khấu 10% → phải trả Tour Đảo 4.500.000, trừ 1.750.000 Tour Đảo đã thu → trả thêm 2.750.000; Tour Đảo xuất VAT 4.500.000 cho đại lý. |
| Q18 | Đối tác được **đề xuất HDV** từ danh sách — **không bắt buộc**, giúp chọn HDV quen. |
| Q19 | Đối tác gửi đơn, nhưng **người nhận của Tour Đảo** mới là người **xác nhận và chịu trách nhiệm chăm sóc** đơn. |
| Q20 | Người lập nội bộ **mặc định tự nhận và xác nhận đơn của chính mình**; được **chọn người khác nhận thay** (bận, vắng). Áp dụng mọi vai nội bộ, kể cả Kế toán và Thực tập sinh. |
| Q21 | Người được chọn nhận thay **phải bấm "Nhận"** trong hạn. |
| Q22 | Kinh doanh lập đơn: được chọn HDV/người nhận (cùng cơ chế Q20–Q21). |
| Q23 | HDV nội bộ **xem được lịch sử sửa đơn**. |
| Q24 | **Chỉ Toàn quyền** gán vai Giám đốc và Điều hành chung. |
| Q25 | Hạn nhận **áp cho mọi đơn**, tính trong giờ làm việc. |
| Q26 | Giờ làm việc **06:15–21:00**, mọi đơn **+15 phút làm việc**; gửi sau 21:00 → hạn 06:30 hôm sau; **không phân biệt ngày lễ Tết**. |
| Q27 | Khối "Chờ tiếp nhận" trên Trang chủ **hiện cho mọi người** trong công ty để cùng biết. |
| Q28 | Chiết khấu: **ghi dữ liệu gốc + hiện số** đợt này; công nợ, đối soát, VAT **đợt thu tiền**. **Bỏ ô "người giới thiệu"** — đối tác luôn là bên đặt. |

**Vòng 3 (trả lời 8 điểm + 3 câu hỏi):**

| # | Quyết định |
|---|---|
| Q29 | Kế toán và Thực tập sinh **không nhận đơn người khác lập** (không nhận đơn chung), nhưng **Giám đốc và Điều hành chung giao đơn cho họ được** (họ vẫn bấm "Nhận"). |
| Q30 | "Người lập vẫn phụ trách khi người được chọn chưa bấm Nhận" **chỉ áp cho đơn do nhân viên Tour Đảo lập**. *Cách hiểu của AI, chủ xác nhận khi duyệt:* đơn đối tác trước lần nhận đầu chưa có người phụ trách (chờ nhận có hạn); đổi người sau khi đã nhận thì người cũ vẫn giữ tới khi người mới nhận — áp mọi đơn, vì người phụ trách luôn là nhân viên Tour Đảo. |
| Q31 | Chỉ người nhận xác nhận đơn; Quản trị/Toàn quyền xác nhận thay được. |
| Q32 | Khách đi tour của đơn đối tác = **hồ sơ người + quan hệ "khách của <đối tác>"**, không mang vai khách hàng của Tour Đảo. |
| Q33 | Chiết khấu **khác nhau theo dịch vụ và theo đối tác**: bảng cấu hình có **nhóm đối tác** và **loại dịch vụ**, **ô cụ thể nhất thắng** (6 mức), chụp theo từng dòng dịch vụ lúc gửi đơn; con số nằm trong cấu hình. |
| Q34 | Đơn đối tác lập: mặc định **đối tác giữ tiền cọc**; nội bộ đổi được. |
| Q35 | Nội bộ có quyền xem tiền (kể cả HDV nội bộ) **thấy chiết khấu**; đối tác thấy của mình; khách không bao giờ. |
| Q36 | Đối tác thấy **danh sách HDV nội bộ kèm SĐT công việc** để đề xuất và liên lạc trực tiếp khi cần. |

Và **ADR-0017** (accepted 2026-09-24) được hấp thụ nguyên vẹn vào vai HDV nội bộ: xem mọi đơn kể cả tiền (số hiện hành sau điều chỉnh), mở `/orders` + Trang chủ cho `FIELD`, `PARTNER` không nới thêm. Rủi ro "HDV nghỉ việc đã kịp xem toàn bộ khách và tiền" chủ đã nghe và vẫn quyết (P18 — không nhắc lại).

## 4. Danh mục vai (11 vai)

Mã vai là **dữ liệu** trong `pty_role_type` (thêm cột `role_group`: `INTERNAL` / `EXTERNAL` / `OTHER`). Bộ quyền mặc định nằm **trong mã** (mục 13), không trong cơ sở dữ liệu (Q15).

| Nhóm | Vai | Mã đề xuất | Mức quyền mặc định | Nhận (phụ trách) đơn |
|---|---|---|---|---|
| Nội bộ | Giám đốc | `DIRECTOR` | Toàn quyền (`SUPER_ADMIN`) | Đơn mình lập; nhận đơn chung / được đề nghị (thay khi cần) |
| Nội bộ | Điều hành chung | `OPERATIONS_MANAGER` | Quản trị (`ADMIN`) | như Giám đốc |
| Nội bộ | Hướng dẫn viên nội bộ | `GUIDE_INTERNAL` | Hướng dẫn viên (`FIELD`) | **Chính**: đơn mình lập, đơn chung, đơn được đề nghị/đề xuất |
| Nội bộ | Nhân viên kinh doanh | `SALES_STAFF` | Kinh doanh (`SALES`) | như Giám đốc |
| Nội bộ | Thực tập sinh | `INTERN` | Thực tập (`INTERN`, **mức mới**) | **Đơn mình lập**, hoặc đơn **Giám đốc / Điều hành chung giao** (bấm Nhận); không nhận đơn chung (Q29) |
| Nội bộ | Kế toán | `ACCOUNTANT` (có sẵn) | Kế toán (`ACCOUNTING`) | **Đơn mình lập**, hoặc đơn **Giám đốc / Điều hành chung giao** (bấm Nhận); không nhận đơn chung (Q29) |
| Bên ngoài | Công ty lữ hành | `TRAVEL_AGENCY` | Đối tác (`PARTNER`) — tài khoản gắn hồ sơ **công ty** | Không (luật cứng) |
| Bên ngoài | Hướng dẫn viên độc lập | `GUIDE_FREELANCE` | Đối tác | Không (luật cứng) |
| Bên ngoài | Lễ tân khách sạn | `HOTEL_RECEPTION` | Đối tác | Không (luật cứng) |
| Bên ngoài | Tài xế taxi | `TAXI_DRIVER` | Đối tác | Không (luật cứng) |
| Bên ngoài | Cộng tác viên | `COLLABORATOR` | Đối tác | Không (luật cứng) |

**Mã vai cũ** (`migrations/0011_parties.sql`): `STAFF`, `SALES`, `ACCOUNTANT`, `GUIDE`, `BOAT_CAPTAIN`, `DRIVER`, `AGENT`, `CUSTOMER`.
- `ACCOUNTANT` dùng lại. `CUSTOMER`, `BOAT_CAPTAIN`, `DRIVER` (tài xế đưa đón — **khác** tài xế taxi đối tác) giữ, nhóm `OTHER` (không sinh quyền).
- `STAFF`, `SALES`, `GUIDE`, `AGENT` mơ hồ: không xoá; ngưng dùng cho gán mới; dòng đang mở được đóng khi gán vai mới qua bước chuyển đổi (mục 14), không tự động.

Một hồ sơ có thể giữ **nhiều vai** cùng lúc (quyền = hợp các bộ mặc định); không giữ cùng lúc vai nội bộ và vai bên ngoài (LC-3).

## 5. Mức quyền và bảng thao tác

Bảy mã quyền: `SALES` (Kinh doanh), `ACCOUNTING` (Kế toán), `ADMIN` (Quản trị), `FIELD` (Hướng dẫn viên), **`INTERN` (Thực tập — mới)**, `PARTNER` (Đối tác), `SUPER_ADMIN` (**Toàn quyền**).

Phạm vi như `src/shared/permissions.ts`: `none` / `own` (đơn mình lập) / `assigned` (đơn mình đang phụ trách) / `ownOrAssigned` / `any`. **Δ** = đổi so với `main` hôm nay; nguồn ghi trong ngoặc.

**Nguyên tắc người nhận (Q19, Q20):** người nhận nội bộ làm được **trọn việc chăm sóc đơn mình đang nhận** — sửa nháp, xác nhận, sửa thông tin chuyến, cập nhật tiến độ; sửa tiền sau xác nhận và huỷ đơn đã xác nhận theo mức quyền của mình.

| Thao tác | SALES | ACCOUNTING | ADMIN | FIELD | INTERN (mới) | PARTNER | SUPER_ADMIN |
|---|---|---|---|---|---|---|---|
| `order.view` | any | any | any | **any** Δ (0017) | **ownOrAssigned** (Q29) | own | any |
| `money.view` | any | any | any | **any** Δ (0017) | **ownOrAssigned** (Q29) | own | any |
| `order.history.view` | ownOrAssigned | any | any | **any** Δ (0017, Q23) | **ownOrAssigned** (Q29) | own | any |
| `contact.view` | any | any | any | **any** Δ (0017) | **ownOrAssigned** (Q29) | **own** Δ (LC-1) | any |
| `order.create` | any | **any** Δ (Q3) | any | **any** Δ (Q3) | any | any | any |
| `order.modify` (sửa/huỷ nháp — **không còn gồm xác nhận**) | ownOrAssigned | **ownOrAssigned** Δ (Q3, Q20) | any | **ownOrAssigned** Δ (Q20) | ownOrAssigned | own | any |
| **`order.confirm`** (xác nhận — **tách mới**; chỉ người nhận, Q19) | **assigned** Δ | **assigned** Δ | any | **assigned** Δ | assigned | **none** Δ | any |
| **`order.submit`** ("Gửi đơn hàng" — **mới**) | none | none | none | none | none | own | any |
| `order.trip.edit` | ownOrAssigned | **assigned** Δ | any | **assigned** Δ | assigned | none | any |
| `task.progress` | **assigned** Δ | **assigned** Δ | any | assigned | assigned | **none** Δ (LC-1) | any |
| `order.money.edit` (sau xác nhận) | own | any | any | assigned | none | none | any |
| `order.cancel` (huỷ hẹp của người phụ trách) | none | none | none | assigned | none | none | any |
| `dispatch.assign` (chọn/đổi người nhận — nay là **đề nghị**, người được chọn phải bấm Nhận) | ownOrAssigned | **own** Δ | any | **ownOrAssigned** Δ | own | none | any |
| `dispatch.claim` (nhận đơn chung) | any | none | any | **any** Δ (Q9) | none | none | any |
| **`dispatch.accept`** (bấm "Nhận" đề nghị gửi cho mình — **mới**) | any | any (Q29) | any | any | any (Q29) | none | any |
| `dispatch.guides.view` (danh sách **tên + SĐT công việc** HDV nội bộ để đề xuất — Q36) | none | none | none | none | none | any (Q18) | any |
| `dispatch.request` | **bỏ** Δ (Q2 — chưa từng có route) | | | | | | |
| **`partner.list`** (danh sách đối tác để chọn làm bên đặt — **mới**) | any | any | any | any | any | none | any |
| **`partner.commission.write`** (cấu hình nhóm đối tác, loại dịch vụ, bảng chiết khấu; sửa tỷ lệ một dòng trên một đơn kèm lý do — **mới**) | none | any | any | none | none | none | any |
| `payment.receive` | own | any | any | none | none | none | any |
| `payment.refund`, `invoice.issue` | none | any | any | none | none | none | any |
| `invoice.request` | own | any | any | none | none | none | any |
| `party.view`, `party.write` | any | any | any | none | none | none | any |
| `admin.manage` | none | none | any (có `canManageAccount` + LC-4) | none | none | none | any |
| `admin.manage.superadmin` | none | none | none | none | none | none | any |
| **`settings.ops`** (thời hạn nhận, giờ làm việc — **mới**) | none | none | none | none | none | none | any |
| `feedback.submit` | any | any | any | any | any | any | any |
| `feedback.view` | own | own | any | own | own | own | any |
| `feedback.triage` | none | none | any | none | none | none | any |

Ghi chú:
- Kế toán và Thực tập sinh nhận **đơn mình lập** hoặc **đơn Giám đốc / Điều hành chung giao** (mục 4, Q29): luật "ai được làm người nhận, ai được giao cho ai" ở `dispatch` (mở rộng `checkAssignee`), không phải ô mới của bảng.
- `INTERN` không phải "văn phòng" (`order.view` = ownOrAssigned: đơn mình lập, đơn mình đang nhận — Q29 — và đơn đang được đề nghị cho mình, xem mục 8) → dùng trang Đơn hàng như Đối tác; `canAccessOrders` phải gồm `INTERN`; `homeRedirect` (`src/shared/start-page.ts`) tự đưa sang `/orders`.
- Với ADR-0017, `FIELD` trở thành "văn phòng" → vào Trang chủ; mục "Đơn hàng" hiện trong menu; mục quản trị vẫn không.
- `SUPER_ADMIN` = any ở mọi dòng (giữ ADR-0014 điều 2). Quản trị/Toàn quyền xác nhận thay được khi cần (`order.confirm` = any).

## 6. Luật cứng (bất biến — không ai chỉnh tay phá được)

Đặt **gần dữ liệu** (trigger D1 như `0017_order_status_audit_guards.sql`), ở tầng miền, **và** có câu kiểm chỉ-đọc trong `scripts/audit-invariants.mjs` (hoặc test, với LC-7).

| Mã | Luật | Chặn ở |
|---|---|---|
| **LC-1** | Tài khoản có vai **bên ngoài** chỉ giữ được mức **Đối tác** — không bao giờ `SALES`/`ACCOUNTING`/`ADMIN`/`FIELD`/`INTERN`/`SUPER_ADMIN`. Hệ quả: chỉ thấy đơn của mình, không bao giờ làm người phụ trách. | trigger `stf_permission` + miền + audit |
| **LC-2** | Người phụ trách (dòng `HANDLE` đang mở) và người được đề nghị nhận phải là hồ sơ có **vai nội bộ đang hiệu lực**, tài khoản đang hoạt động. | trigger `dsp_assignment` + `checkAssignee` + audit |
| **LC-3** | Một hồ sơ không giữ **cùng lúc** vai nội bộ và vai bên ngoài (theo khoảng hiệu lực); theo thời gian thì được. | trigger `pty_party_role` + miền |
| **LC-4** | Chỉ **Toàn quyền** gán/gỡ vai mang mức Quản trị trở lên (Giám đốc, Điều hành chung) và mức Toàn quyền (Q24); Quản trị chỉ gán vai cho tài khoản "cấp dưới" (mở rộng `canManageAccount`, ADR-0014 điều 8). | miền + nhật ký |
| **LC-5** | **Hạn nhận chốt lúc bắt đầu chờ; tỷ lệ chiết khấu chốt theo từng dòng dịch vụ** (mục 11): không đổi theo cài đặt hay bảng chiết khấu sau này. Tỷ lệ một dòng trên một đơn chỉ sửa qua `partner.commission.write`, bắt buộc lý do. Bảng chiết khấu không được có hai dòng cùng mức ưu tiên, cùng đối tượng, trùng hiệu lực. | trigger + miền |
| **LC-6** | Có nhật ký cho mọi thay đổi ở tiêu chí 12 (ai, khi nào, trước → sau, lý do nếu có), trong cùng `db.batch()` với thay đổi. | miền |
| **LC-7** | **Phiếu xác nhận gửi khách không bao giờ chứa** tỷ lệ chiết khấu, giá trị đối tác phải trả, hay số đối tác còn phải trả. | test trên bộ dựng phiếu (`src/shared/order-confirmation.ts`) |
| **LC-8** | **Sau lần tiếp nhận đầu, đơn luôn có người phụ trách**: đổi người chỉ hoàn tất khi người mới bấm "Nhận"; tới lúc đó người cũ vẫn phụ trách. | miền (`dispatch`) + audit |

## 7. Quyền hiệu lực của một tài khoản

- **Quyền hiệu lực** = (hợp bộ mặc định của các vai **đang hiệu lực**) **+ cộng tay − bớt tay**, rồi lọc theo luật cứng (LC-1).
- **Chỉnh tay lưu riêng** (mỗi dòng: tài khoản, mã quyền, cộng/bớt, lý do, ai, khi nào, hiệu lực) — đổi vai không làm mất phần chỉnh tay; luôn biết quyền nào từ vai, quyền nào do người chỉnh.
- `stf_permission` là **bản hiện thực hoá** của quyền hiệu lực để `can()` và cách nạp quyền theo phiên không đổi (đề xuất kỹ thuật; người lập kế hoạch chốt). Một hàm duy nhất tính lại khi vai/chỉnh tay đổi và khi một vai **hết hạn theo ngày**.
- **Tài khoản chưa được gán vai mới giữ nguyên quyền hiện tại** (coi như toàn bộ là chỉnh tay).

## 8. Luồng nhận đơn

**Khái niệm:**
- **Người nhận** = người phụ trách của đơn (Q19): xác nhận và chăm sóc đơn.
- **Đề nghị nhận** = một lời mời gửi tới **một người cụ thể**, chờ người đó bấm "Nhận".
- **Đơn chung** = đơn chờ nhận không gửi riêng ai: ai được nhận đơn chung (HDV nội bộ, Kinh doanh, Điều hành, Giám đốc) bấm "Nhận".
- **Tiếp nhận** = lần đầu đơn có người nhận (bấm "Nhận", hoặc người lập nội bộ tự nhận lúc lập). Mốc này được ghi và dùng để đo đúng hạn.
- **Chờ nhận** = đơn có đề nghị nhận hoặc đơn chung chưa ai nhận, hoặc đơn đang chờ người mới nhận thay (đổi người).
- Người được đề nghị nhận **xem được đơn đó** (kể cả tiền và liên lạc khách) trước khi bấm "Nhận", để quyết định nhận — với Thực tập sinh đây là phần mở rộng phạm vi "được đề nghị" (các vai nội bộ khác vốn đã xem mọi đơn).

**Đơn do nội bộ lập** (mọi vai nội bộ, Q20):
1. Mặc định **tự nhận**: người lập thành người nhận ngay lúc lập (tiếp nhận ngay, không tính hạn).
2. Hoặc **chọn người nhận thay** (bận, vắng — Q20, Q22): gửi đề nghị nhận tới HDV nội bộ / Kinh doanh / Điều hành / Giám đốc (HDV nội bộ xếp đầu danh sách); Giám đốc và Điều hành chung chọn được cả Kế toán / Thực tập sinh (Q29). Người đó phải bấm "Nhận" trong hạn (Q21). Chưa ai nhận thì **người lập vẫn là người nhận** — đơn không rơi vào khoảng trống (LC-8 áp từ lúc lập; quy tắc này **chỉ áp cho đơn do nhân viên Tour Đảo lập** — Q30).
3. Hoặc **để chung** (người lập không tự nhận, không chọn ai): đơn chờ nhận, có hạn, ai được nhận đơn chung bấm "Nhận".

**Đơn do đối tác lập** (Q13, Q17–Q19):
1. **Nháp riêng**: chỉ đối tác thấy; danh sách nội bộ không hiện nháp chưa gửi của đối tác.
2. **"Gửi đơn hàng"**, kèm **HDV đề xuất** nếu muốn (Q18, không bắt buộc; đối tác thấy danh sách HDV nội bộ đang hoạt động kèm SĐT công việc — Q36). Gửi → ghi mốc gửi, **chốt hạn nhận**, nhật ký.
   - Có HDV đề xuất → đề nghị nhận tới HDV đó; những người được nhận đơn chung **cũng thấy** đơn (kèm "Đối tác đề xuất: <tên>") và nhận được nếu HDV đó không nhận kịp.
   - Không đề xuất → đơn chung.
3. **Tiếp nhận**: ai đó bấm "Nhận" → thành người nhận; đối tác thấy tên, SĐT công việc, giờ nhận.

**Sau khi đã có người nhận:**
- **Xác nhận** (`order.confirm`): chỉ người nhận (Quản trị/Toàn quyền xác nhận thay được khi cần). Đơn của đối tác **luôn do Tour Đảo xác nhận** (Q19).
- **Chăm sóc đơn**: gọi xác nhận khách đi tour, đón khách, cập nhật tiến độ, sửa thông tin chuyến; sửa số khách/tiền sau xác nhận và huỷ theo mức quyền (ADR-0014 điều 6/11). Thu tiền: đợt sau (Q5).
- **Đổi người nhận**: người đang nhận (hoặc Điều hành/Kinh doanh theo `dispatch.assign`; riêng Kế toán / Thực tập sinh chỉ do Giám đốc / Điều hành chung giao — Q29) gửi đề nghị tới người mới; người mới bấm "Nhận" trong hạn; tới lúc đó **người cũ vẫn phụ trách** (LC-8). Đối tác thấy người phụ trách **hiện tại** và giờ người đó nhận.
- **Đối tác sửa đơn sau khi gửi**: được sửa tới khi đơn được xác nhận; sửa sau khi đã có người nhận thì người nhận được báo (chấm đếm trong ứng dụng, cùng khuôn ADR-0014 điều 12) và thấy phần đã sửa.
- **Huỷ**: nháp hoặc đã xác nhận, kèm lý do; không quay lại (như hiện nay).

Trạng thái đơn vẫn là `draft` / `confirmed` / `cancelled` — **không thêm trạng thái mới** (Q9). "Đã gửi", "chờ nhận", "đã tiếp nhận" là **mốc thời gian / trạng thái của lời đề nghị**, không phải trạng thái đơn (tránh dựng lại bảng `orders` và trigger 0017).

## 9. Hạn nhận

- **Cài đặt vận hành** (trang mới, chỉ Toàn quyền — `settings.ops`): thời hạn nhận (mặc định **15 phút**), giờ làm việc (mặc định **06:15–21:00**, giờ Việt Nam, **mọi ngày kể cả lễ Tết** — Q26). Mỗi lần đổi ghi nhật ký.
- **Áp cho mọi lần chờ nhận** (Q25): đơn đối tác vừa gửi, đơn nội bộ để chung, mọi đề nghị nhận (chọn người nhận thay, đổi người).
- **Cách tính:** hạn = lúc bắt đầu chờ + 15 **phút làm việc**. Bắt đầu ngoài giờ → tính từ 06:15 kế tiếp. Còn thiếu phút cuối ngày thì phần còn lại tính sang sáng hôm sau.

  | Bắt đầu chờ | Hạn |
  |---|---|
  | 10:00 | 10:15 |
  | 20:50 | 06:20 hôm sau (10 phút tối + 5 phút sáng) |
  | 21:30 | 06:30 hôm sau |
  | 05:00 | 06:30 cùng ngày |

- **Chốt vào đơn / vào đề nghị** lúc bắt đầu chờ (LC-5).
- **Quá hạn** (vẫn chờ nhận khi đã qua hạn):
  - **Nội bộ:** khối **"Chờ tiếp nhận"** trên Trang chủ cho **mọi người** trong công ty (Q27) — quá hạn màu đỏ, xếp đầu; trang Đơn hàng có bộ lọc "Chờ tiếp nhận".
  - **Đối tác:** thấy "Quá hạn tiếp nhận" kèm số tổng đài công ty.
  - **Báo đẩy** tới điện thoại Điều hành — **giai đoạn cuối** (mục 15); trên iPhone chỉ nhận khi ứng dụng đã thêm vào màn hình chính.
- **Đối tác thấy trên đơn của mình:** "Nháp — chưa gửi" → "Đang chờ tiếp nhận — hạn HH:MM" → ("Quá hạn tiếp nhận — vui lòng gọi <tổng đài>") → "Đã tiếp nhận lúc HH:MM — Người phụ trách: <tên>, <SĐT>" → "Đã xác nhận lúc HH:MM".
- **SĐT người phụ trách** = số **liên hệ công việc** trong hồ sơ (ADR-0001: khác số đăng nhập); chưa có thì hiện số tổng đài công ty. Việc vận hành: nhập số công việc cho mỗi người có thể nhận đơn.

## 10. Vai trên đơn

| Vai trên đơn | Là ai | Lưu ở |
|---|---|---|
| Người lập | Tài khoản đã lập | `orders.staff_id` (có) |
| **Bên đặt** | **Khách lẻ** (đặt trực tiếp) hoặc **đối tác** (mọi vai bên ngoài — Q17) | `orders.booker_party_id` (có; hôm nay chỉ nhận `PERSON` — mở cho `ORGANIZATION`, ADR-0001 điều 7 đã cho phép) |
| Khách đi tour | Người HDV gọi xác nhận và đón | tên + SĐT trên đơn (có) **và** hồ sơ người: đơn khách lẻ — chính là bên đặt; đơn đối tác — hồ sơ người nối quan hệ **"khách của <đối tác>"** (mới, Q32) |
| Người phụ trách (người nhận) | Hồ sơ nội bộ đang lo đơn | `dsp_assignment` `HANDLE` (có) |
| HDV được đề xuất | HDV nội bộ đối tác gợi ý (Q18) | **mới** |
| Người được đề nghị nhận | Người đang được mời nhận (Q21) | **mới** (đề nghị có hạn, trạng thái chờ / đã nhận / hết hiệu lực) |

- **Đơn lập từ tài khoản bên ngoài:** bên đặt = **hồ sơ của đối tác đó** (người hoặc công ty), tự động, không sửa.
- **Nội bộ lập đơn thay đối tác** (đối tác gọi điện): chọn đối tác làm bên đặt (`partner.list`) — thay cho ô "người giới thiệu" đã bỏ (Q28).
- **Nội bộ lập đơn cho khách lẻ:** bên đặt = khách (như hôm nay, ADR-0011).
- **Khách đi tour của đơn đối tác** (Q32): tìm hồ sơ người theo SĐT (có sẵn thì dùng lại — một người một hồ sơ), chưa có thì tạo; nối **quan hệ `CUSTOMER_OF` tới hồ sơ đối tác** (loại quan hệ mới, hiệu lực theo ngày). Hồ sơ này **không** mang vai `CUSTOMER` của Tour Đảo: không hiện trong danh sách khách hàng của Tour Đảo, không dùng để chăm sóc/tiếp thị trực tiếp (quy tắc sử dụng — xem §17). Người chăm sóc đơn vẫn thấy tên, SĐT để gọi và đón. Đối tác chỉ thấy đơn của mình — không thấy khách đó từng đi với đối tác khác hay đặt thẳng với Tour Đảo.

## 11. Tiền của đơn đối tác (chiết khấu) — Q17, Q28, Q33

**Phía khách (đã có, không đổi):** tạm tính (giá bán lẻ, `subtotal`) − giảm giá (`discount`) = tổng khách trả (`total`); − cọc đã thu (`deposit_amount`) = **còn thu tại cảng** (`remaining_amount`). Phiếu gửi khách in đúng các dòng này, theo giá bán lẻ (LC-7).

**Phía đối tác (mới) — mô hình chiết khấu (Q33):**

Ba danh mục **cấu hình** (Kế toán / Quản trị / Toàn quyền sửa trong ứng dụng — `partner.commission.write`; mọi lần sửa ghi nhật ký; con số không nằm trong mã):

| Danh mục | Là gì | Ví dụ |
|---|---|---|
| **Nhóm đối tác** | Mỗi đối tác thuộc **một** nhóm; khi tạo tài khoản, nhóm được gợi ý theo vai, đổi được | Đại lý cấp 1, Đại lý cấp 2, Cộng tác viên, Lễ tân khách sạn |
| **Loại dịch vụ** | Mỗi dịch vụ thuộc **một** loại, ánh xạ theo tiền tố mã danh mục (sửa được); mã không khớp → "Khác" | TD1 tour đảo, TD2 vé vui chơi, TD3 du thuyền, TTB dịch vụ lẻ |
| **Bảng chiết khấu** | Mỗi dòng: **áp cho** (một đối tác **hoặc** một nhóm) × **dịch vụ** (một mã **hoặc** một loại **hoặc** mọi dịch vụ) → **tỷ lệ**, **hiệu lực từ ngày … đến ngày** | "Đại lý cấp 1 · mọi dịch vụ · 10%"; "Đại lý A · vé Hòn Tằm · 12%" |

**Chọn tỷ lệ cho một dòng dịch vụ — ô cụ thể nhất thắng** (thoả thuận riêng với đối tác luôn thắng bảng của nhóm); chỉ xét dòng bảng **đang hiệu lực** ở ngày chụp:
1. Đối tác + dịch vụ
2. Đối tác + loại dịch vụ
3. Đối tác + mọi dịch vụ
4. Nhóm + dịch vụ
5. Nhóm + loại dịch vụ
6. Nhóm + mọi dịch vụ

Không khớp ô nào → **0%** và đơn hiện cảnh báo "chưa có chiết khấu" cho Kế toán. Hai dòng cùng mức, cùng đối tượng, trùng hiệu lực bị **cấm** (LC-5) — không thể có hai ô mâu thuẫn.

**Chụp tỷ lệ vào đơn — theo từng dòng dịch vụ** (LC-5):
- Đơn đối tác lập: mọi dòng chụp lúc **"Gửi đơn hàng"**; dòng thêm/đổi dịch vụ sau khi gửi chụp tại lúc thêm/đổi.
- Đơn nội bộ lập cho đối tác (bên đặt là đối tác): chụp lúc chọn đối tác làm bên đặt, và lúc thêm/đổi dòng sau đó.
- Điều chỉnh số khách của HDV sau xác nhận **giữ tỷ lệ đã chụp** của dòng, áp lên thành tiền mới.
- Đổi bảng sau đó **không** đổi đơn cũ. Kế toán / Quản trị / Toàn quyền sửa tỷ lệ của **một dòng trên một đơn**, bắt buộc lý do, có nhật ký.
- Mỗi dòng lưu cả **nguồn** của tỷ lệ (ô nào của bảng) để Kế toán tra lại.
- Giao diện: trang cấu hình **"Chiết khấu đối tác"** (nhóm, loại, bảng) có ô **"thử tra"**: chọn đối tác + dịch vụ → xem tỷ lệ và ô nào thắng.

**Người giữ tiền cọc:** **đối tác** hay **Tour Đảo** — mặc định **đối tác** với đơn đối tác lập (Q34), **Tour Đảo** với đơn khách lẻ; nội bộ sửa được (cột trên `orders`).

**Số dẫn xuất (chỉ tính ở máy chủ; tỷ lệ lưu dạng số nguyên phần vạn, vd. 1000 = 10%; tiền làm tròn tới đồng theo từng dòng):**
- **Đối tác phải trả Tour Đảo** = tổng các dòng [thành tiền dòng hiện hành × (1 − tỷ lệ dòng)]. Tính trên **giá bán lẻ trước giảm giá**: giảm giá cho khách do đối tác chịu. "Hiện hành" = sau điều chỉnh số khách của HDV (như ADR-0017 điều 5).
- **Tour Đảo thu trực tiếp từ khách** = còn thu tại cảng + (cọc, nếu Tour Đảo giữ cọc).
- **Dự kiến đối tác còn phải trả** = đối tác phải trả − Tour Đảo thu trực tiếp. **Âm** nghĩa là Tour Đảo phải trả lại đối tác (vd. khách chuyển cọc thẳng cho Tour Đảo).

**Ví dụ của chủ (thành test chấp nhận):**

| | Số |
|---|---|
| Tạm tính (giá bán lẻ) | 5.000.000 |
| Giảm giá cho khách (đối tác chịu) | 250.000 |
| Cọc — đối tác giữ | 3.000.000 |
| **Khách còn trả tại cảng** (HDV thu) | **1.750.000** |
| Chiết khấu đối tác | 10% |
| **Đối tác phải trả Tour Đảo** (= giá trị hoá đơn VAT, đợt sau) | **4.500.000** |
| Tour Đảo thu trực tiếp | 1.750.000 |
| **Dự kiến đối tác còn phải trả** | **2.750.000** |

**Ví dụ nhiều dòng (test chấp nhận của cách chọn tỷ lệ):** cấu hình "Đại lý cấp 1 · mọi dịch vụ · 10%", "Đại lý cấp 1 · loại du thuyền · 15%", "Đại lý A (thuộc cấp 1) · vé Hòn Tằm · 12%". Đơn của đại lý A:

| Dòng | Thành tiền | Ô thắng | Tỷ lệ | Đối tác phải trả |
|---|---|---|---|---|
| Vé Hòn Tằm | 2.000.000 | 1. đối tác + dịch vụ | 12% | 1.760.000 |
| Du thuyền | 3.000.000 | 5. nhóm + loại | 15% | 2.550.000 |
| Tour đảo | 1.000.000 | 6. nhóm + mọi dịch vụ | 10% | 900.000 |
| **Cộng** | 6.000.000 | | | **5.210.000** |

**Ai thấy:** nội bộ có `money.view` (kể cả HDV nội bộ, ADR-0017) thấy phần đối tác của mọi đơn; đối tác thấy phần của **đơn mình**; khách **không bao giờ** (LC-7).

**Đợt này KHÔNG làm:** sổ công nợ đối tác, đối soát, ghi nhận HDV đã thu tiền tại cảng, xuất hoá đơn VAT — đợt thu tiền (N3). Vì vậy số "còn phải trả" là **dự kiến** (giả định HDV thu đủ tại cảng).

## 12. Công ty lữ hành — tài khoản chung

- Hồ sơ **công ty** (`ORGANIZATION`: tên, MST, địa chỉ) mang vai `TRAVEL_AGENCY`; **một tài khoản** trỏ thẳng vào hồ sơ công ty (hôm nay mã tạo tài khoản luôn tạo hồ sơ `PERSON`).
- SĐT đăng nhập = số của công ty; dùng chung PIN; mỗi người bật Face ID trên máy riêng.
- **Khi một nhân viên công ty nghỉ:** quản trị **"Đặt lại PIN"** → gỡ hết Face ID của tài khoản (quy tắc hiện có, ADR-0016). *Đính chính lời nói trong phiên chat:* nếu công ty **tự đổi PIN** thì Face ID trên máy cũ **vẫn còn** — phải bấm "Gỡ tất cả" ở trang Tôi.
- Nhật ký ghi "Công ty X" — không biết người nào trong công ty đã bấm (hệ quả Q4, chủ đã chọn).
- Công ty chỉ thấy đơn của tài khoản công ty. Người liên hệ của công ty có thể ghi là hồ sơ người nối `CONTACT_OF` tới công ty (không tài khoản) — cửa mở nếu sau này mỗi người một tài khoản (ngưỡng ADR-0014 điều 5).
- **Tìm hồ sơ có sẵn trước khi tạo** (mọi tài khoản): theo SĐT, và theo MST với công ty. Có sẵn → gắn tài khoản vào hồ sơ đó. Hôm nay tạo tài khoản **luôn** sinh hồ sơ mới (`src/modules/staff/index.ts`).

## 13. Hiển thị bảng vai & quyền — một nguồn, bốn nơi (Q8, Q16)

- **Nguồn duy nhất trong mã** (đề xuất `src/shared/roles.ts`): 11 vai (mã, tên, nhóm, mức quyền mặc định, nhận đơn: chính / thay / chỉ đơn mình lập / không, mô tả) + **nhãn lời thường** cho từng thao tác của `MATRIX`. Mức quyền dùng chung `MATRIX` — không chép tay.
- **Nơi 1 — trang "Vai & quyền"** (nhóm "Tôi" ở menu, mọi tài khoản): điện thoại dạng **thẻ theo vai**; máy tính dạng **bảng việc × vai** + nút "Dạng thẻ". Nội bộ thấy đủ 11 vai; tài khoản bên ngoài **chỉ thấy thẻ vai của mình**. Cuối trang: **"Luật cứng"** bằng lời thường.
- **Nơi 2 — trang Tôi:** khối "Vai của bạn": vai đang giữ + ngày bắt đầu, việc được làm, phần quản trị đã chỉnh riêng (nếu có).
- **Nơi 3 — màn tạo/sửa tài khoản:** chọn vai → xem trước bộ quyền → chỉnh cộng/bớt trong giới hạn luật cứng (kèm lý do) → lưu. Với vai bên ngoài: ô **nhóm đối tác** (gợi ý theo vai) và các **ngoại lệ chiết khấu riêng** của đối tác đó (Kế toán/Quản trị/Toàn quyền).
- **Nơi 4 — tài liệu tự sinh** `docs/VAI-VA-QUYEN.md` (khuôn `npm run dict`); **test so tệp đã commit với nguồn**.

## 14. Chuyển đổi dữ liệu hiện có (~30 tài khoản)

1. AI soạn **truy vấn chỉ-đọc** liệt kê tài khoản + quyền hiện tại; **chủ tự chạy** trên D1 thật (AI không được `d1 execute` remote — CLAUDE.md §8).
2. AI lập **bảng đối chiếu từng người**: vai đề xuất · quyền hiện tại · quyền theo vai · khác biệt · đề xuất chỉnh tay để giữ nguyên nếu cần. Với đối tác: nhóm và các mức chiết khấu đang áp dụng ngoài hệ thống (chủ cung cấp) → nhập vào bảng chiết khấu.
3. **Chủ duyệt từng dòng.** Không gieo SĐT/tên thật vào migration.
4. Gán vai bằng **màn quản trị mới** sau phát hành (Toàn quyền làm), không bằng migration; trước lúc đó mọi tài khoản giữ nguyên quyền.
5. `audit-invariants` thêm câu kiểm: vi phạm LC-1/LC-2/LC-3/LC-8; tài khoản chưa gán vai mới (thông tin, cho tới khi chuyển đổi xong).

## 15. Giai đoạn thi công (mỗi giai đoạn phát hành riêng, có người kiểm độc lập — việc lớn; mỗi lần phát hành thêm một mục nhật ký thay đổi theo công thức t)

| GĐ | Nội dung | Phụ thuộc |
|---|---|---|
| **0** | ADR-0017 vào `main`; soạn **ADR-0018…** từ đặc tả này, chủ duyệt. (Vá "người lập được gán phụ trách không kiểm điều kiện" đã xong — nhánh `sua-phu-trach-1-5`, bản 1.5.) | — |
| **1** | Danh mục vai (mã + nhóm), `roles.ts`, mức `INTERN`, nhãn "Toàn quyền", chỉnh tay cộng/bớt, quyền hiệu lực, LC-1/LC-3/LC-4/LC-6, tìm hồ sơ có sẵn khi tạo tài khoản, màn gán vai có xem trước. Tài khoản cũ giữ nguyên quyền. | GĐ0 |
| **2** | Bảng thao tác mới (mục 5): ADR-0017 cho `FIELD`, Q3 lên đơn, tách `order.confirm`, người lập nội bộ tự nhận (mọi vai nội bộ), HDV nhận đơn chung, bỏ `dispatch.request`, LC-2. **Chuyển đổi 30 tài khoản** ngay sau phát hành. | GĐ1 |
| **3** | Hiển thị: trang "Vai & quyền", khối Tôi, tài liệu tự sinh + test lệch. | GĐ1 (song song GĐ2 được) |
| **4** | Đối tác là bên đặt (người hoặc công ty), tài khoản công ty lữ hành, `partner.list`, khách của đối tác (hồ sơ + quan hệ `CUSTOMER_OF`), **chiết khấu** (nhóm đối tác, loại dịch vụ, bảng + trang cấu hình, chụp theo dòng, người giữ cọc, số dẫn xuất, hiển thị cho nội bộ/đối tác), LC-7. Có thể tách 4a (bên đặt + khách) và 4b (chiết khấu). | GĐ1 |
| **5** | Luồng nhận: đề nghị nhận + bấm "Nhận", đơn chung, đổi người không khoảng trống (LC-8), "Gửi đơn hàng" + HDV đề xuất, cài đặt vận hành, hạn nhận (LC-5), hiển thị cho đối tác, khối/bộ lọc "Chờ tiếp nhận". | GĐ2, GĐ4 |
| **6** | Báo đẩy tới điện thoại Điều hành khi quá hạn. | GĐ5 |

## 16. Ngoài phạm vi

Sổ công nợ đối tác, đối soát, xuất hoá đơn VAT, ghi nhận HDV đã thu tiền tại cảng (đợt thu tiền, N3); vai nhà cung cấp; trạng thái "đã hoàn thành"; nhiều tài khoản cho một công ty; báo đẩy cho đối tác; chiết khấu theo số lượng, theo mùa hay theo kênh; AI như một tác nhân có định danh.

## 17. Điểm AI suy ra ở vòng 3 — chờ chủ xác nhận khi duyệt đặc tả (kèm khuyến nghị)

*(8 điểm của vòng 2 đã được chủ trả lời — ghi ở Q29–Q36.)*

1. **Dòng dịch vụ thêm/đổi sau khi gửi đơn** chụp tỷ lệ tại lúc thêm/đổi; **điều chỉnh số khách giữ tỷ lệ cũ** của dòng. *Khuyến nghị: đồng ý.*
2. **Làm tròn tới đồng theo từng dòng** rồi cộng. *Khuyến nghị: đồng ý* — khớp cách ghi hoá đơn theo dòng sau này.
3. **Khách của đối tác: SĐT trùng hồ sơ có sẵn nhưng tên khác** → giữ hồ sơ cũ, ghi tên đối tác nhập lên đơn, **không tự đổi tên hồ sơ**. *Khuyến nghị: đồng ý* — tránh đối tác vô tình sửa hồ sơ người khác.
4. **"Không dùng khách của đối tác để chăm sóc/tiếp thị trực tiếp" là quy tắc sử dụng** (ẩn khỏi danh sách khách hàng của Tour Đảo, ghi trong tài liệu), không phải khoá kỹ thuật tuyệt đối. *Khuyến nghị: đồng ý.*
5. **Đơn khách lẻ** (bên đặt là khách, không có đối tác): không có phần đối tác, chiết khấu 0. *Khuyến nghị: đồng ý.*
6. **Giám đốc / Điều hành chung giao đơn cho Kế toán / Thực tập sinh** cũng theo **đề nghị + bấm Nhận có hạn** như mọi người. *Khuyến nghị: đồng ý* (Q21, Q25).
7. **Nhóm đối tác gợi ý theo vai** khi tạo tài khoản (vd. Công ty lữ hành → "Đại lý", Cộng tác viên → "Cộng tác viên"); danh sách nhóm do Kế toán/Quản trị lập. *Khuyến nghị: đồng ý.*
8. **Đổi người phụ trách một đơn của đối tác** (sau khi đã có người nhận): người cũ vẫn giữ tới lúc người mới bấm "Nhận" — như đơn nội bộ. Đây là **cách AI hiểu** câu trả lời điểm 2 (Q30), chủ chưa nói trực tiếp. *Khuyến nghị: đồng ý* — đơn không bao giờ vô chủ.

## 18. Rủi ro và điều chưa chắc

- **Chuyển đổi quyền 30 tài khoản:** gán sai vai = thừa/thiếu quyền. Giảm: giữ nguyên quyền tới khi gán vai; bảng đối chiếu chủ duyệt; nhật ký.
- **LC-2 dựa trên dữ liệu vai:** bật chỉ sau khi chuyển đổi xong.
- **Lộ chiết khấu cho khách** là sự cố thương mại: LC-7 phải có test trên bộ dựng phiếu, và kịch bản Chrome chụp phiếu của một đơn đối tác.
- **Số tiền phía đối tác** chỉ tính ở máy chủ, dùng số hiện hành sau điều chỉnh; làm tròn một quy tắc duy nhất.
- **Bảng chiết khấu cấu hình sai** (thiếu ô, gõ nhầm tỷ lệ) → sai số đối tác phải trả. Giảm: ô "thử tra" khi cấu hình, cảnh báo 0% cho Kế toán, nhật ký mọi lần sửa, lưu nguồn tỷ lệ theo dòng.
- **SĐT hướng dẫn viên hiện cho mọi đối tác** (Q36): nên là số công việc.
- **Báo đẩy trên iPhone** chỉ khi đã thêm ứng dụng vào màn hình chính (iOS 16.4+); chưa kiểm máy thật.
- **Chỉ một tài khoản Toàn quyền** (ADR-0014 điều 8, chủ đã chấp nhận): nay giữ thêm cài đặt vận hành và gán vai cấp cao.
- **Người trực 06:15:** hạn sớm nhất trong ngày là 06:30 — cần người nhận đơn từ 06:15 mỗi ngày, kể cả lễ Tết (Q26).
- **ADR-0017 chưa có trên `main`** — gộp trước (GĐ0).
- Chưa kiểm: module `company` có sẵn số tổng đài để hiện cho đối tác khi quá hạn hay chưa.

## 19. Hệ quả kỹ thuật (cho người lập kế hoạch)

- **Đảo test đã ghim hành vi cũ, có chủ đích (đỏ → xanh):** `src/shared/start-page.test.ts` ("chỉ FIELD → không chuyển") và bước C/D-1 của `trang-chu-smoke.mjs` (banner của `FIELD`); test ghim `PARTNER` tự xác nhận đơn; e2e `tests/e2e/dispatch.mjs` về người nhận mặc định (nay Kế toán/Thực tập cũng tự nhận đơn mình lập).
- **Tách `order.confirm` khỏi `order.modify`:** `POST /api/orders/:id/status` (confirmed) hỏi `order.confirm`.
- **`dispatch`:** giao/đổi người phụ trách nay là **đề nghị** chờ bấm "Nhận" (thay ADR-0009: gán có hiệu lực ngay); cần nơi lưu đề nghị (người được đề nghị, hạn chốt, trạng thái); `checkAssignee` mở rộng theo mục 4 (Kế toán/Thực tập chỉ đơn mình lập hoặc đề nghị từ Giám đốc/Điều hành chung); `defaultHandlerPartyId` (bản 1.5) mở rộng cho mọi vai nội bộ.
- **Tài khoản trỏ hồ sơ `ORGANIZATION`:** rà đường mặc định `PERSON` — tạo tài khoản (`src/modules/staff/index.ts`), `resolveBooker` (`src/shared/booker.ts:47`, `orders/repository.ts:503`), nhãn tài khoản, "Việc của tôi".
- **Tiền đối tác:** bảng cấu hình (nhóm đối tác + gán đối tác vào nhóm, ánh xạ loại dịch vụ theo tiền tố mã, bảng chiết khấu có hiệu lực + ràng buộc không trùng ô); cột tỷ lệ (phần vạn) + nguồn tỷ lệ theo **dòng dịch vụ** (`order_service`/`order_item`); người giữ cọc trên `orders`; hàm thuần **chọn tỷ lệ 6 mức** và **tính số dẫn xuất** ở `src/shared/` (test ví dụ đại lý A và ví dụ nhiều dòng); bộ dựng phiếu (`order-confirmation.ts`) có test LC-7.
- **Khách của đối tác:** loại quan hệ mới `CUSTOMER_OF` trong `pty_relationship_type`; `resolveBooker` và ngoại lệ ADR-0011 đổi cho đơn đối tác (bên đặt = đối tác; khách đi tour = hồ sơ người + quan hệ); danh sách khách hàng của Tour Đảo lọc theo vai `CUSTOMER`.
- **`canAccessOrders`** gồm `INTERN`; **`isOffice`** tự đúng cho `FIELD`.
- **`INTERN`:** bộ lọc danh sách đơn = mình lập **∪** mình đang phụ trách **∪** đang được đề nghị cho mình (không chỉ lọc `staff_id` như Đối tác); xem chi tiết một đơn cũng theo ba điều kiện đó.
- **`src/shared/contracts.ts`:** chú thích `MyAssignmentDto` lỗi thời sau ADR-0017 — sửa.
- **Đợt E:** chế độ thẻ `"no-total"` (`web/order-card.ts`) có thể thừa — quyết khi gộp.
- **Trang mới** ("Vai & quyền", "Cài đặt vận hành"): khai `PAGES` + script `build:web`; đăng ký kịch bản Chrome trong `web/CLAUDE.md` (đề xuất, chủ duyệt — N9).
- **Bảng/cột mới** → `docs/data-dictionary.json` + `npm run dict`; migration từ 0024, chỉ thêm.
- **Báo đẩy (GĐ6):** Cron hiện 15 phút/lần — hạn 15 phút cần lịch kiểm mỗi phút hoặc hẹn giờ; khoá VAPID là bí mật (chủ tự `wrangler secret put`).
- Mỗi giai đoạn: `npm test`, `npm run typecheck`, `npm run test:e2e` đủ bộ, kịch bản Chrome liên quan, `audit-invariants`, mục nhật ký thay đổi mới; người kiểm độc lập chỉ-đọc.
