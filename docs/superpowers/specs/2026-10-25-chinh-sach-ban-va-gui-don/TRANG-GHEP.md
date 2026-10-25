# Trang ghép 25/10: đề xuất ADR chính sách bán + đề xuất ADR-0136 kèm bản bổ sung 25/10 (CLAUDE.md §9 «Bước ghép khi duyệt»)

> **Thứ tự đọc:**
> 1. thiết kế `../2026-10-25-chinh-sach-ban-va-gui-don-design.md`;
> 2. trang này, mục 0;
> 3. `DE-XUAT-ADR-chinh-sach-ban-theo-loai-doi-tac.md` (viết tắt CSB);
> 4. đề xuất gốc `../2026-10-19-xac-nhan-don/DE-XUAT-ADR-0136-buoc-xac-nhan-don.md`, rồi `BO-SUNG-2026-10-25-DE-XUAT-ADR-0136.md`;
> 5. các mục còn lại của trang này.
>
> Ghi chú về trang này:
> - Trang này **thay** `../2026-10-19-xac-nhan-don/TRANG-GHEP-LUOT-2.md` cho phần ADR-0136 và tự đủ, không cần mở trang cũ. Phần «thư + QR» của trang cũ chờ một đề xuất mang số mới.
> - Trang giả định lượt 1 của bộ 19/10 đúng nguyên văn: ADR-0134 đã lên bản 2.23; ADR-0135 đã duyệt, chưa thi công.
> - Trang ghi tên tệp, tên route và tên hàm, không ghi số dòng; các tên này đúng tại bản chính `90f3079e`.
> - Người kiểm độc lập đã soát một vòng (25/10); bản này đã sửa theo kết quả đó.

## 0. Cách duyệt: đếm và chia lượt
- **Quy định:** CLAUDE.md §9 cho tối đa 3 quyết định chạm quyền hoặc dữ liệu mỗi lượt, nhưng không nói đơn vị đếm.
- **Hai trang ghép trước đếm khác nhau.** Trang 19/10 đếm theo ADR. Trang 24/10 đếm theo **điều**, theo tiền lệ ADR-0053 đã duyệt («D7, D8, D9 — đúng trần 3»).
- **Trang này đếm theo điều**, như trang mới nhất. Điều chỉ về giao diện hay hiển thị thì không tính.
- **Kết quả đếm:** tổng **14 điều**, nên một lượt sẽ vượt trần gần năm lần.
  - CSB có 4 điều: Đ1, Đ3, Đ4, Đ5.
  - ADR-0136 gốc có 9 điều: Đ1 đến Đ8, và Đ10.
  - Bản bổ sung thêm 1 điều mới là Đ13. Phần thay Đ1 đã tính trong Đ1.

**Đề nghị năm lượt, theo thứ tự.** ADR-0136 đi trước, vì ADR-0135 đã duyệt đang chờ nó để phát hành cùng (chủ chọn phương án A ngày 19/10).

| Lượt | Điều | Số |
|---|---|---|
| 1 | 0136-Đ1 cờ theo dịch vụ hoặc nhóm (kèm phần thay); 0136-Đ2 bảng yêu cầu xác nhận; 0136-Đ3 gửi, rút lại, khoá khi chờ | 3 |
| 2 | 0136-Đ4 ô `order.confirm.review`; 0136-Đ5 ai quyết định và công tắc tự xác nhận; 0136-Đ6 nới đọc có giới hạn | 3 |
| 3 | 0136-Đ7 Hết vé tự gán lý do; 0136-Đ8 sửa tiền khi chờ; 0136-Đ10 tin | 3 |
| 4 | CSB-Đ1 bảng luật và bất biến với loại; CSB-Đ3 cổng máy chủ; CSB-Đ5 ai đặt luật | 3 |
| 5 | CSB-Đ4 danh mục cho Đối tác; 0136-Đ13 Gửi đơn | 2 |

- **Cách khác, do chủ quyết:** duyệt hai lượt theo ADR, tức ADR-0136 kèm bổ sung trước, chính sách bán sau, và chủ ghi lý do vượt trần.
- Dù chọn cách nào, trang này vẫn ghép đủ cả năm lượt, vì mục 5 (chỗ hai quyết định đụng nhau) phải đọc cùng một lúc.
- **Thời điểm chép sang `docs/adr/`:**
  - ADR-0136: khi lượt 1–3 đã duyệt. Đ13 vào cùng nếu lượt 5 đã duyệt; nếu chưa thì sau này Đ13 thành ADR riêng.
  - Chính sách bán: khi lượt 4 và lượt 5 đã duyệt.

## 1. Bảng bị chạm chứa những loại thực thể nào
| Bảng | Hôm nay | Sau các lượt này |
|---|---|---|
| `prc_sales_block` (mới, tên tạm) | — | luật «không bán»: loại đối tác × (nhóm hoặc dịch vụ) × hiệu lực. Chỉ có dòng chặn; chỉ thêm |
| `prc_beneficiary_role` | loại được hưởng, bật/tắt; thêm trên màn hình (ADR-0117) | + không tắt được khi loại còn luật bán hiệu lực (CSB-Đ1) |
| `ord_service_confirm_flag` (mới) | — | cờ «cần / không cần xác nhận» theo dịch vụ HOẶC nhóm; chỉ thêm |
| `ord_confirm_request` (mới) | — | một dòng mỗi lần gửi: người gửi, lúc gửi, hạn. Khi khép: người quyết, lúc, kết quả (`XAC_NHAN` / `HUY` / `RUT_LAI`). Mỗi đơn chỉ một dòng mở; khép một lần; không xoá |
| `ord_confirm_policy` (mới) | — | công tắc «người nội bộ tự xác nhận», chỉ thêm, gieo BẬT |
| `orders` | `draft` (nháp riêng sau ADR-0135), `confirmed`, `cancelled` | `draft` có hai loại: nháp riêng và **đơn chờ xác nhận**. `confirmed` có thêm đơn do **máy chủ xác nhận lúc Đối tác gửi**. Không thêm trạng thái |
| `ord_transfer_leg` | chặng và khung giờ (ADR-0134) | người quyết định đổi được giờ đón trong lô Còn vé |
| `bil_payment_receipt` | không nhận dòng mới cho nháp (ADR-0135) | không đổi; đơn chờ vẫn là nháp nên không ghi thu được |
| vai của hồ sơ (đọc qua view `v_pty_open_role`) | loại đối tác dùng để tính hoa hồng và ép bên đặt | + đọc để **chặn bán** (ngoại lệ có tên), chỉ trong một hàm của `pricing` |
| `ctl_service_group` (đọc qua `v_ctl_service_group`) | nhóm để hiển thị, tính hoa hồng | + làm khoá cho luật bán và cờ cần xác nhận (nhóm hiện hành) |
| `audit_log` | — | Thêm các hành động mới: thêm / kết thúc luật bán; đổi cờ; gửi; rút lại; đổi công tắc. Quyết định dùng lại `confirmed` / `cancelled`, kèm chữ «Còn vé» / «Hết vé»; nhánh B ghi chú «tự xác nhận khi Đối tác gửi đơn». Sửa tiền khi chờ ghi lý do. Không ghi thông tin cá nhân |

## 2. Dòng bản đồ quyền chạm → áp cho loại nào
| Ô / luật | Giá trị | Hôm nay áp cho | Sau các lượt này |
|---|---|---|---|
| `order.submit` (mới) | PARTNER `own`, SUPER_ADMIN `any`, còn lại `none` | — | Gửi đơn: chỉ nháp của **chính người lập** (nháp riêng tư, ADR-0135) → nhánh A hoặc nhánh B |
| `order.modify` | **không đổi giá trị** | sửa, xác nhận, huỷ; Đối tác `own` | Sửa, huỷ như cũ. **Xác nhận:** người lập giữ PARTNER (kể cả tài khoản lai) bị luật route chặn bằng 409. Ma trận một mình không chặn được, vì `can()` lấy hợp các ô. Người phụ trách giữ PARTNER vẫn xác nhận đơn được giao (ADR-0009) |
| `order.confirm.review` (mới) | SALES, ACCOUNTING, ADMIN, FIELD, SUPER_ADMIN `any`; còn lại `none` | — | đọc danh sách chờ và chi tiết đơn chờ của mọi người lập; quyết định Còn vé / Hết vé / Huỷ (luật tự xác nhận ở 0136-Đ5) |
| `order.view` | không đổi | nháp: chỉ người lập | đơn chờ: người lập HOẶC người giữ `order.confirm.review`; nháp riêng như cũ |
| `money.view` | không đổi | theo `order.view` | đơn chờ: người xét duyệt thấy tiền ở dạng chỉ đọc, kể cả khi không có ô (HDV chưa phụ trách) |
| `contact.view` | không đổi | theo `order.view` | đơn chờ, người xét duyệt không phải người lập: máy chủ **bỏ** SĐT, email, liên hệ người đặt (ngoại lệ ADR-0019 đ2) |
| `order.money.edit` | SALES `own`; ACCOUNTING, ADMIN `any`; FIELD `assigned`; SUPER_ADMIN `any` | sau xác nhận | + sửa tiền trên đơn **chờ** khi không phải người lập, bắt lý do. Thực tế chỉ Kế toán, Quản trị, Toàn quyền |
| `order.cancel.classify` | ADMIN, SUPER_ADMIN | nhóm lý do «Công ty huỷ» | Hết vé tự gán `HET_CHO`, **không** hỏi ô này (ngoại lệ ADR-0089 đ8); Huỷ vì lý do khác vẫn hỏi như hộp Huỷ |
| `payment.receive` | không đổi | không áp cho nháp | đơn chờ là nháp nên vẫn không ghi thu |
| `order.pool.view`, `dispatch.claim` | không đổi | đơn đã xác nhận, chưa có người phụ trách | đơn chờ không vào hàng chờ nhận; đơn nhánh B vào, đúng như khi Đối tác tự xác nhận hôm nay |
| `order.leg.short_notice` | ADMIN, SUPER_ADMIN | — | áp lúc bấm Còn vé (409 `short_notice_required` như hôm nay) |
| `order.create` | không đổi | lập đơn; danh mục for-order đầy đủ | Đối tác: danh mục for-order **bỏ** dịch vụ bị chặn cho bên đặt bị ép |
| `order.trip.edit` | không đổi | đổi bên đặt (`PUT …/booker`) | + cổng luật bán khi bên đặt mới bị chặn |
| `settings.ops` | Toàn quyền | bảo trì, chính sách điều phối, khung giờ | + luật bán; cờ cần xác nhận theo dịch vụ / nhóm; công tắc tự xác nhận |
| `partner.commission.write` | ACCOUNTING, ADMIN, SUPER_ADMIN `any` | thêm / tắt loại đối tác | + tắt loại còn luật bán hiệu lực nhận 409 (CSB-Đ1) |
| `admin.manage` | ADMIN, SUPER_ADMIN | kết thúc vai trên hồ sơ; gán nhóm; gộp hồ sơ | đổi được kết quả của luật bán; **chấp nhận và ghi lại** (CSB-Đ3) |
| `holdsPartner` (luật theo quyền đang giữ) | — | R2 giá danh mục; K1 không chọn đại lý khác làm bên đặt; ép bên đặt | + người lập giữ PARTNER không đi đường Xác nhận / Gửi xác nhận; Gửi đơn là đường duy nhất |
| `benDatCuaToi` (gốc lắp ráp) | — | ép bên đặt của Đối tác | + điều kiện cho bộ lọc danh mục (cùng điều kiện) |
| Bảng tin, tin | — | Đối tác / Thực tập không nhận tin đơn | Đối tác / Thực tập nhận tin xác nhận / huỷ đơn mình lập, không kèm tên người làm (ADR-0131). Thêm nhãn `xet-duyet` cho người giữ ô xét duyệt |

## 3. Cổng nào canh cửa nào
| Cửa | Cổng (thứ tự) |
|---|---|
| `POST /api/orders` | … → luật giá (R2, R3) → **luật bán** (bên đặt sau khi ép) → ghi |
| `PUT /api/orders/:id` (nháp) | … → khoá khi chờ (0136-Đ3) → luật giá → **luật bán** → ghi |
| `PUT /api/orders/:id/booker` | `order.trip.edit` → K1 (`chanBenDatDoiTac`) → **luật bán với bên đặt mới** (nháp và đã xác nhận) → ghi |
| `POST /api/orders/:id/status` → `confirmed` | `order.modify` → **người lập giữ PARTNER: 409 `partner_submit_required`** → đơn cần xác nhận: 409 `confirm_request_required` → R2 → người lớn → chọn Đón → mốc → R3 trần giảm giá → **luật bán** → lô xác nhận |
| Gửi đơn (mới, Đ13) | `order.submit` `own` → chỉ người lập → đơn nháp → mọi cổng của xác nhận, kể cả luật bán → nhánh A mở yêu cầu / nhánh B chạy lô xác nhận |
| Gửi xác nhận (mới, 0136-Đ3) | chỉ người lập → người lập giữ PARTNER: 409 `partner_submit_required` → đơn nháp, cần xác nhận, đã chọn Đón, chưa có yêu cầu mở → **luật bán** → ghi |
| Rút lại (mới, 0136-Đ3) | chỉ người lập → có yêu cầu mở → khép `RUT_LAI` |
| Còn vé / Hết vé / Huỷ (mới, 0136-Đ7) | `order.confirm.review` → luật tự xác nhận (0136-Đ5) → yêu cầu còn mở → khoá lạc quan (bên thua nhận 409) → Còn vé: **luật bán xét lại** (luật có thể vừa bắt đầu) → các cổng xác nhận, mốc / đặt gấp |
| Danh sách chờ (mới) | `order.confirm.review`; dữ liệu trả về không có tên, SĐT, email khách |
| `GET /api/orders/:id` và các route đọc của ADR-0135 | thêm nhánh đọc thứ hai: đơn chờ + `order.confirm.review` thì trả 200, bỏ các trường liên hệ. Câu `can(order.view)` hiện có phải **thay**; nếu không, HDV chưa phụ trách nhận 404 trước khi tới nhánh này |
| `GET /api/catalog/for-order` | `order.create` → `money.view` → **lọc bằng hàm tiêm**, chỉ khi tài khoản giữ PARTNER có bên đặt bị ép |
| Đọc / ghi luật bán, cờ, công tắc | cổng `admin` + `settings.ops` |
| `POST /api/pricing/loai-doi-tac/:code/tat` | `partner.commission.write` → **loại còn luật bán hiệu lực: 409** → tắt |
| `POST /api/parties/:id/roles/:rid/end`, `PUT /api/catalog/group-assignments`, `POST /api/parties/:id/merge` | `admin.manage` như hôm nay; **không** thêm cổng luật bán (chấp nhận, CSB-Đ3). Màn gán nhóm hiện cảnh báo |
| Không cần cổng luật bán | `money-edit` (chỉ số khách của dịch vụ đã có), `thuong-mai/:serviceId`, các route chặng, hành khách, `chup-bu`: không thêm dịch vụ, không đổi bên đặt |
| Cạnh phụ thuộc | `catalog` giữ `["audit"]`; `orders` gọi `pricing` qua `index.ts` (cạnh đã có) |

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa
- **Nút chính của form lập đơn** (`web/order-form.ts`, hôm nay «Lưu, chờ xác nhận»): tài khoản giữ PARTNER thấy «Gửi đơn». `web/dat-gap-ui.ts` có ghi chú coi «Lưu, chờ xác nhận» là nút chính; xét lại khi đổi nhãn.
- **`orderActions`** (`src/shared/order-view.ts`): hôm nay `draft` + `canModify` cho ra `confirm`. Sau đổi:
  - người lập giữ PARTNER có `submit` (nháp) và Rút lại (đang chờ), không có `confirm`;
  - đơn cần xác nhận của người khác có `send`, `withdraw` (người lập) và `decide` (người xét duyệt);
  - `confirm` chỉ còn cho đơn không cần xác nhận.
- **Nút «Xác nhận đơn»** trên trang đơn (`web/order.ts`): ẩn với người lập giữ PARTNER.
- **Hộp ảnh tự mở** khi trang đơn có `moi=1` (`web/order.ts`): chỉ mở khi đơn đã xác nhận, tức nhánh B (0136-Đ11).
- **Danh mục trong form:** nhóm không còn dịch vụ nào thì chip nhóm không hiện.
- **Chữ «Chờ xác nhận»** hôm nay đang dùng cho số nháp: thẻ «Đơn nháp» (khoá `choXacNhan` trong `src/shared/viec-cua-ban.ts`) và ô trên Trang chủ điện thoại (`web/home.ts`). Phải đổi chữ cũ trước khi thêm thẻ đơn chờ. Thẻ mới phải hiện cả trên điện thoại và cho HDV (0136-Đ9).
- **Dải «Chờ xác nhận · còn N phút / Quá hạn»** trên trang đơn, và **trang danh sách chờ** (mới, khai `PAGES`).
- **Ô «ĐƠN NHÁP»** trên bảng điều phối (`web/dieu-phoi.ts`): nên đổi chữ thành «Chờ xác nhận».
- **Màn gán nhóm** (Danh mục của Quản trị): cảnh báo khi nhóm cũ hoặc nhóm mới đang có luật bán hay cờ cần xác nhận.
- **Trợ giúp Đối tác** (`src/shared/huong-dan-doi-tac.ts`): sửa mọi đoạn nhắc «Lưu, chờ xác nhận» và «Xác nhận đơn» (ít nhất năm đoạn).

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, kiểm 25/10)
- **Chính sách bán:** không chạm, vì không đụng tiền và không đụng sổ.
- **ADR-0136 + bổ sung: TNV-G1, có điều kiện.**
  - Hết vé là một đường huỷ. Nháp cũ đã có khoản thu sẽ thành đơn huỷ còn tiền.
  - Không xây trên lỗ khi Đợt 2 (nháp không ghi thu) lên cùng Đợt 3. Chủ đếm số nháp cũ có khoản thu trước khi phát hành, bằng lệnh ở Task 2.2 Step 0 của kế hoạch 19/10.
  - Nhánh B không mở đường mới tới TNV-G1, vì nhánh này xác nhận chứ không huỷ.
- **TNV-G3, TNV-G4, HC-4.2, HC-5.11:** không chạm.
- **HC-5.19** (diễn tập khôi phục, hạn 5/11): migration chỉ thêm bảng, không ghi đè dữ liệu cũ; hạn giữ nguyên.

## 5. Hai quyết định đụng nhau ở đâu
1. **Thứ tự:** luật bán chạy **trước** mọi nhánh của Gửi đơn và Gửi xác nhận. Đơn bị chặn không bao giờ vào hàng chờ xác nhận.
2. **Luật bắt đầu khi đơn đang chờ:** Còn vé nhận 409 `sales_blocked`; người xét duyệt chọn Huỷ với một lý do trong danh sách. Đơn đã xác nhận không bị xét lại.
3. **Cùng màn, cùng ô `settings.ops`:** luật bán và cờ cần xác nhận đều theo nhóm hiện hành. Đổi nhóm của một dịch vụ là đổi cả hai, nên màn gán nhóm phải cảnh báo.
4. **Đổi bên đặt khi đơn đang chờ:** khoá khi chờ (0136-Đ3) nên phủ cả `PUT …/booker`, vì bên đặt quyết định luật bán. [người soạn]
5. **Dịch vụ bị chặn:** Đối tác không thấy dịch vụ đó, nên không bao giờ gặp cờ cần xác nhận của nó. Văn phòng lập hộ thì nhận 409 trước khi tới bước xác nhận.
6. **Hai lượt cùng chạm `holdsPartner`:**
   - Lượt 5 (Đ13) đóng đường Xác nhận với người lập giữ PARTNER.
   - Lượt 2 (0136-Đ5) đã coi người lập giữ PARTNER là bên ngoài.
   - Tài khoản lai vẫn xét duyệt được đơn chờ của người khác qua hàng `SALES` của ô `order.confirm.review`. Việc đó đúng vai người phụ trách (ADR-0009), không phải tự xác nhận.

## 6. Bài kiểm dự kiến phải sửa / thêm
Số đo dưới đây do người kiểm độc lập đo ngày 25/10 trên bản sao tạm, không động vào cây thật.

**Thêm ô `order.submit`: đúng 4 tệp đỏ.**
- `src/shared/permissions.test.ts`: 4 bài (bảng khớp từng ô, và ba bài ghim hàng DRIVER / DRIVER_PARTNER / HR).
- `src/modules/orders/xem-don-theo-quyen.test.ts`: 1 bài ghim hàng PARTNER.
- `src/shared/tro-ly-cau-truc.test.ts`: 5 bài. Cần thêm `TEN_THAO_TAC`, để tệp sinh của trợ lý được sinh lại (`node scripts/sinh-so-do-trang.mjs`, tự chạy ở đầu `npm test`).
- `src/permission-enforcement.test.ts`: 1 bài. Bài này cần một lời gọi `can(…, "order.submit")` ghi nguyên văn trong `src/modules`, tức là route Gửi đơn.

Khi thêm route mới, `src/route-access.test.ts` (ảnh chụp mọi route) cũng phải thêm dòng.

**Cổng 409 ở `/status`: ít nhất 36 bài trong 10 tệp.** Số này đo với cổng chặn mọi người giữ PARTNER; cách chặn chỉ người lập có thể đỏ ít hơn.
- `src/so-la-doi-tac.test.ts` (10), `src/modules/orders/thuong-mai-route.test.ts` (10), `src/modules/thongbao/tin-doi-hop.test.ts` (4);
- `src/modules/orders/thuc-tap-gia-route.test.ts` (3), `src/lich-su-don-doi-tac.test.ts` (2), `src/modules/orders/ben-dat-doi-tac.test.ts` (2), `src/modules/orders/tran-giam-gia-don.test.ts` (2);
- `src/modules/orders/dat-gap.test.ts` (1), `src/modules/orders/hanh-khach-route.test.ts` (1), `src/so-la-thuong-mai-toan-nen-tang.test.ts` (1).

**e2e chắc chắn phải sửa.** Cách sửa: gọi Gửi đơn thay cho `/status`.
- `nhap-tay-va-gia-doi-tac.mjs`: các lời gọi `confirm(P…)`.
- `nhap-ke-toan.mjs`: `donXacNhan` với phiên Đối tác, lai Bán hàng + Đối tác, lai Đối tác + HDV.
- `so-dai-ly-dot-2.mjs`: Đối tác tự xác nhận; vòng lặp với phiên «Đối tác không được hưởng» và tài khoản lai đang mong 403 câu Đối tác, sau khi sửa sẽ thành 409.

Đã rà và thấy chỉ dùng phiên văn phòng: `bangtin`, `cam-ket-xe`, `dispatch`, `loai-doi-tac`, `muc-ta`, `so-dai-ly`, `thongbao`, `tai-xe-cuoc`, `xe-tren-don`, `permissions`.

**Sổ hàng rào.** Các bài đỏ ở trên đang là bằng chứng «đã quan sát chặn thật» cho nhiều dòng của `docs/SO-HANG-RAO.md`: giá Đối tác (DK-T3-01), giá Thực tập (ADR-0100), K1, lịch sử đơn Đối tác, trần giảm giá, và các dòng khác.
- Khi `/status` trả 409 trước, bài dùng phiên Đối tác không còn chạm tới cổng mà nó canh.
- Người thi công phải chuyển các bài R2, R3, K1, D-1 đang đi qua `/status` bằng phiên Đối tác sang route Gửi đơn, quan sát lại đỏ → xanh, rồi cập nhật ngày ở các dòng sổ.
- Dòng chưa có ngày quan sát mới thì coi như lời khuyên (CLAUDE.md §3).

**Bài mới.**
- e2e chính sách bán (9 ca, dùng loại riêng do bài tạo và kết thúc mọi luật bài tạo; `tests/e2e/catalog.mjs` đang khẳng định Đối tác thấy đúng danh sách nhóm như Bán hàng).
- e2e Gửi đơn (6 ca).
- Bài quét CSB-Đ6a, bài lược đồ CSB-Đ6b, bài «dịch vụ thắng nhóm» của cờ.
- `src/shared/order-view.test.ts`; đưa route mới vào `route-write-guard` / `permission-enforcement`.
- Bài R-N1-12 **giữ nguyên**.

## 7. Việc khi chép sang `docs/adr/` (sau khi chủ duyệt)
- **Số ADR của chính sách bán:** lấy số trống kế tiếp lúc chép. Không dùng 0140, vì hai chỗ đang lệch nhau:
  - `docs/adr/README.md` còn dòng «0140 giữ cho nháp đại lý tổ chức nhiều nhân viên»;
  - BACKLOG mục `BL-DAI-LY-TO-CHUC` ghi «không giữ 0140», và các nháp 24/10 dùng nhãn tạm 0140/0141.

  Chủ chốt một trong hai khi chép.
- **ADR-0136** = đề xuất gốc + bản bổ sung; chép theo mục 0.
- **Dòng lỗi thời trong `docs/adr/README.md`:** dòng «số ADR mới kế tiếp là 0136 … 0137 thư xác nhận + QR» đã sai, vì 0137–0139 đã dùng. Sửa cùng lúc chép.
- **Đề xuất «thư + QR»** cần số mới khi trình lại.
- **`src/CLAUDE.md`:** thêm dòng ngoại lệ theo mục Hệ quả của CSB.
