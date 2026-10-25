# Trang ghép lượt 25/10 — đề xuất ADR chính sách bán + đề xuất ADR-0136 kèm bổ sung 25/10 (CLAUDE.md §9 «Bước ghép khi duyệt»)

> **Thứ tự đọc:**
> 1. thiết kế `../2026-10-25-chinh-sach-ban-va-gui-don-design.md`;
> 2. `DE-XUAT-ADR-chinh-sach-ban-theo-loai-doi-tac.md`;
> 3. đề xuất gốc `../2026-10-19-xac-nhan-don/DE-XUAT-ADR-0136-buoc-xac-nhan-don.md`, rồi `BO-SUNG-2026-10-25-DE-XUAT-ADR-0136.md`;
> 4. trang này.
>
> Lượt có hai quyết định chạm quyền / dữ liệu (≤ 3).
> - Trang này **thay** `../2026-10-19-xac-nhan-don/TRANG-GHEP-LUOT-2.md` cho phần ADR-0136. Phần «thư + QR» của trang cũ chờ một đề xuất mang số mới.
> - Giả định lượt 1 đúng nguyên văn: ADR-0134 đã lên bản 2.23; ADR-0135 đã duyệt, chưa thi công.
> - Trang ghi tên tệp, route và hàm, không ghi số dòng; tên đúng tại bản chính `90f3079e`.

## 1. Bảng bị chạm chứa những loại thực thể nào
| Bảng | Hôm nay | Sau lượt này |
|---|---|---|
| `prc_sales_block` (mới, tên tạm) | — | luật «không bán»: loại đối tác × (nhóm hoặc dịch vụ) × hiệu lực. Chỉ có dòng chặn; chỉ thêm |
| `ord_service_confirm_flag` (mới) | — | cờ «cần / không cần xác nhận» theo dịch vụ HOẶC nhóm; chỉ thêm |
| `ord_confirm_request`, `ord_confirm_policy` (mới) | — | như đề xuất gốc, không đổi |
| `orders` | `draft` (nháp riêng sau ADR-0135), `confirmed`, `cancelled` | `draft` có hai loại: nháp riêng và **đơn chờ xác nhận**. `confirmed` có thêm đơn do **máy chủ xác nhận lúc Đối tác gửi**. Không thêm trạng thái |
| vai của hồ sơ (đọc qua view `v_pty_open_role`) | loại đối tác dùng để tính hoa hồng và ép bên đặt | + đọc để **chặn bán** (ngoại lệ có tên), chỉ trong một hàm của `pricing` |
| `ctl_service_group` (đọc qua `v_ctl_service_group`) | nhóm để hiển thị, tính hoa hồng | + dùng làm khoá cho luật bán và cờ cần xác nhận (nhóm hiện hành) |
| `audit_log` | — | + thêm / kết thúc luật bán; đổi cờ (dịch vụ hoặc nhóm); `confirmed` kèm ghi chú «tự xác nhận khi Đối tác gửi đơn». Không thông tin cá nhân |

## 2. Dòng bản đồ quyền chạm → áp cho loại nào
| Ô / luật | Giá trị | Hôm nay áp cho | Sau lượt này |
|---|---|---|---|
| `order.submit` (mới) | PARTNER `own`, SUPER_ADMIN `any`, còn lại `none` | — | Gửi đơn: nháp của mình → nhánh A hoặc nhánh B |
| `order.modify` | **không đổi giá trị** | sửa, xác nhận, huỷ; Đối tác `own` | sửa, huỷ như cũ. Riêng **xác nhận**: tài khoản giữ PARTNER (kể cả lai) bị luật route chặn bằng 409. Ma trận một mình không chặn được, vì `can()` lấy hợp các ô và tài khoản lai lọt qua hàng `SALES` |
| `order.confirm.review` (mới, đề xuất gốc Đ4) | như đề xuất gốc | — | xét đơn chờ của mọi người lập, kể cả đơn Đối tác gửi ở nhánh A |
| `order.create` | không đổi | lập đơn; danh mục for-order đầy đủ | Đối tác: danh mục for-order **bỏ** dịch vụ bị chặn cho bên đặt bị ép |
| `order.trip.edit` | không đổi | đổi bên đặt (`PUT …/booker`) | + cổng luật bán khi bên đặt mới bị chặn |
| `settings.ops` | Toàn quyền | bảo trì, chính sách điều phối, khung giờ | + luật bán; cờ cần xác nhận theo dịch vụ / nhóm |
| `order.pool.view`, `dispatch.claim` | không đổi | đơn đã xác nhận, chưa có người phụ trách | + đơn nhánh B, đúng như khi Đối tác tự xác nhận hôm nay |
| `holdsPartner` (luật theo quyền đang giữ) | — | R2 giá danh mục; K1 không chọn đại lý khác làm bên đặt | + đóng đường xác nhận; Gửi đơn là đường duy nhất |
| `benDatCuaToi` (gốc lắp ráp) | — | ép bên đặt của Đối tác | + điều kiện cho bộ lọc danh mục (cùng điều kiện) |

Các dòng `order.view`, `money.view`, `contact.view`, `order.money.edit`, `order.cancel.classify`, `payment.receive`, `order.leg.short_notice` và Bảng tin trong mục 2 của trang ghép lượt 2 cũ **giữ nguyên nội dung**. Số dòng mã ghi ở trang cũ đã lỗi thời.

## 3. Cổng nào canh cửa nào
| Cửa | Cổng (thứ tự) |
|---|---|
| `POST /api/orders` | … → luật giá (R2, R3) → **luật bán** (bên đặt sau khi ép) → ghi |
| `PUT /api/orders/:id` (nháp) | … → khoá khi chờ (đề xuất gốc Đ3) → luật giá → **luật bán** → ghi |
| `PUT /api/orders/:id/booker` | `order.trip.edit` → K1 (`chanBenDatDoiTac`) → **luật bán với bên đặt mới** (nháp và đã xác nhận) → ghi |
| `POST /api/orders/:id/status` → `confirmed` | `order.modify` → **giữ PARTNER ⇒ 409 `partner_submit_required`** → cần xác nhận ⇒ 409 `confirm_request_required` → R2 → người lớn → chọn Đón → mốc → **luật bán** → lô xác nhận |
| Gửi đơn (mới, Đ13) | `order.submit` `own` → đơn nháp → mọi cổng của xác nhận, kể cả luật bán → nhánh A mở yêu cầu / nhánh B chạy lô xác nhận |
| Gửi xác nhận (mới, đề xuất gốc Đ3) | + giữ PARTNER ⇒ 409 `partner_submit_required` → … → **luật bán** |
| Còn vé (mới, đề xuất gốc Đ7) | `order.confirm.review` → … → **luật bán xét lại** (luật có thể vừa bắt đầu) → các cổng xác nhận |
| `GET /api/catalog/for-order` | `order.create` → `money.view` → **lọc bằng hàm tiêm** (chỉ khi tài khoản giữ PARTNER có bên đặt bị ép) |
| Đọc / ghi luật bán và cờ | cổng `admin` + `settings.ops` |
| Không cần cổng luật bán | `money-edit` (chỉ số khách của dịch vụ đã có), `thuong-mai/:serviceId`, các route chặng, hành khách, `chup-bu`: không thêm dịch vụ, không đổi bên đặt |
| Cạnh phụ thuộc | `catalog` giữ `["audit"]`; `orders` gọi `pricing` qua `index.ts` (cạnh đã có) |

### 3b. Chỗ giao diện ẩn/hiện bị đổi nghĩa
- **Nút chính của form lập đơn** (`web/order-form.ts`, hôm nay «Lưu, chờ xác nhận»): tài khoản giữ PARTNER thấy «Gửi đơn». `web/dat-gap-ui.ts` có ghi chú coi «Lưu, chờ xác nhận» là nút chính; xét lại khi đổi nhãn.
- **`orderActions`** (`src/shared/order-view.ts`): hôm nay `draft` + `canModify` ⇒ `confirm`. Sau: người giữ PARTNER có `submit` (nháp) và Rút lại (đang chờ); không bao giờ có `confirm`.
- **Nút «Xác nhận đơn»** trên trang đơn (`web/order.ts`): ẩn với người giữ PARTNER.
- **Hộp ảnh tự mở** khi trang đơn có `moi=1` (`web/order.ts`): chỉ khi đơn đã xác nhận, tức nhánh B (đề xuất gốc Đ11).
- **Danh mục trong form:** nhóm không còn dịch vụ nào thì chip nhóm không hiện.
- **Chữ «Chờ xác nhận»** đang dùng cho số nháp (thẻ «Đơn nháp», ô trên Trang chủ điện thoại): trang ghép cũ đã nêu và điều đó vẫn đúng; đổi chữ cũ trước khi thêm thẻ đơn chờ.
- **Trợ giúp Đối tác** (`src/shared/huong-dan-doi-tac.ts`): hai chỗ nhắc «Lưu, chờ xác nhận» và «Xác nhận đơn».

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, kiểm 25/10)
- **Chính sách bán:** không chạm, vì không đụng tiền và không đụng sổ.
- **ADR-0136 + bổ sung: TNV-G1, có điều kiện.** Hết vé là một đường huỷ; nháp cũ đã có khoản thu sẽ thành đơn huỷ còn tiền. Không xây trên lỗ khi Đợt 2 (nháp không ghi thu) lên cùng Đợt 3. Nhánh B không mở đường mới tới TNV-G1, vì nhánh này xác nhận chứ không huỷ.
- **TNV-G3, TNV-G4, HC-4.2, HC-5.11:** không chạm. **HC-5.19** (diễn tập khôi phục, hạn 5/11): migration chỉ thêm bảng, không ghi đè dữ liệu cũ; hạn giữ.

## 5. Hai quyết định đụng nhau ở đâu
1. **Thứ tự:** luật bán chạy **trước** mọi nhánh của Gửi đơn và Gửi xác nhận. Đơn bị chặn không bao giờ vào hàng chờ xác nhận.
2. **Luật bắt đầu khi đơn đang chờ:** Còn vé nhận 409 `sales_blocked`; người xét duyệt chọn Huỷ với một lý do trong danh sách. Đơn đã xác nhận không bị xét lại.
3. **Cùng màn, cùng ô `settings.ops`:** luật bán và cờ cần xác nhận đều theo nhóm hiện hành. Đổi nhóm của một dịch vụ là đổi cả hai, nên màn phải nói rõ điều này.
4. **Đổi bên đặt khi đơn đang chờ:** khoá khi chờ (đề xuất gốc Đ3) nên phủ cả `PUT …/booker`, vì bên đặt quyết định luật bán. [người soạn]
5. **Dịch vụ bị chặn:** Đối tác không thấy dịch vụ đó nên không bao giờ gặp cờ cần xác nhận của nó. Văn phòng lập hộ thì nhận 409 trước khi tới bước xác nhận.

## 6. Bài kiểm dự kiến phải sửa / thêm (ước lượng)
- `src/shared/permissions.test.ts`: hàng `order.submit`, ba bài ghim hàng, tên thao tác. `src/architecture.test.ts`: bài quét bảng luật bán (Đ6a), bài «nơi gọi duy nhất» của hàm tiêm. R-N1-12 **giữ nguyên**.
- `src/shared/order-view.test.ts` (hành động Gửi đơn); bài lược đồ bảng luật (Đ6b); bài «dịch vụ thắng nhóm» của cờ.
- e2e mới: chính sách bán (7 ca), Gửi đơn (6 ca). Sửa `tests/e2e/permissions.mjs`. Đưa route mới vào `route-write-guard` / `permission-enforcement`.
- e2e đang cho phiên Đối tác hoặc tài khoản lai tự xác nhận. **Chắc chắn phải sửa:**
  - `nhap-tay-va-gia-doi-tac.mjs`: các lời gọi `confirm(P…)`;
  - `nhap-ke-toan.mjs`: `donXacNhan` với phiên Đối tác, lai Bán hàng + Đối tác, lai Đối tác + HDV.

  Cách sửa máy móc: gọi Gửi đơn thay cho `/status`. **Rà thêm** `bangtin`, `cam-ket-xe`, `dispatch`, `loai-doi-tac`, `muc-ta`; các dòng xác nhận tìm thấy ngày 25/10 trong những tệp này đều dùng phiên văn phòng.

## 7. Việc khi chép sang `docs/adr/` (sau khi chủ duyệt)
- Đề xuất chính sách bán thành `ADR-0140-*.md`, hoặc số trống kế tiếp lúc đó. ADR-0136 = đề xuất gốc + bản bổ sung.
- `docs/adr/README.md` còn dòng «số ADR mới kế tiếp là 0136 … 0137 thư xác nhận + QR», đã lỗi thời vì 0137–0139 đã dùng. Sửa dòng đó cùng lúc chép.
- Đề xuất «thư + QR» cần số mới khi trình lại.
- Thêm dòng ngoại lệ vào `src/CLAUDE.md` theo mục Hệ quả của đề xuất chính sách bán.
