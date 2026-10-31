# Trang ghép — Lượt C1 (Lịch mùa) và Lượt C2 (Điều kiện bán thường trực) (đề xuất 30/10, bản sửa 2)

Trang này đi kèm `C-DE-XUAT-ADR.md` theo `CLAUDE.md` §9 «Bước ghép khi duyệt».
- **Bản sửa 2:** «nới cạnh kiến trúc» tính vào trần, theo tiền lệ chủ duyệt 30/9 (`docs/superpowers/plans/2026-09-29-adr-0049-de-xuat-luat.md:81-82`). Vì vậy C tách mặc định thành hai lượt duyệt. Trang này ghép **cả hai** (khuôn trang ghép 25/10: một trang cho hai lượt), vì C2 đọc dữ liệu của C1; mỗi dòng ghi lượt của nó.
  - **C1** = Đ1 (dữ liệu mùa) + Đ2a (`season.write`) + nới cạnh `pricing → lich-mua` ⇒ 3.
  - **C2** = Đ4 (điều kiện con) + Đ2b (`catalog.sale.condition.write`) + nới cạnh `catalog → lich-mua` ⇒ 3. Duyệt sau C1 và sau B.
  - Phương án thay thế: một lượt 6 điều có «cho vượt trần» (C-Q5 (b)).
- Đ4 (C2) thêm một **loại dữ liệu mới (điều kiện)** vào bảng «lần đóng» `ctl_sale_suspension` của lượt B.

Tên của B lấy từ `../B-dong-ban/DE-XUAT-ADR.md`, bản đọc 30/10. Tên tệp, hàm, route hiện có đúng ở HEAD `a129d3d`. Tên bảng, thao tác mới là **tên tạm**.

## 1. Bảng nào chứa loại thực thể nào

| Bảng | Chủ | Chứa | Mới? |
|---|---|---|---|
| `lm_season` | `lich-mua` (mới, nghiêm, lá) | **mùa**: mã, tên, loại (`LE_LUAT` / `KINH_DOANH`), ưu tiên, còn dùng, quy tắc gợi ý (lịch dương/âm, tháng, ngày, lệch, số ngày) | **mới** |
| `lm_season_range` | `lich-mua` | **khoảng ngày đã xác nhận** của một mùa: người + lúc xác nhận, kết thúc một lần có lý do. Không có dòng «chờ xác nhận» | **mới**, chỉ thêm |
| `v_lm_season`, `v_lm_season_day_range` | `lich-mua` | view công bố: mùa; khoảng **đang hiệu lực** | **mới** |
| `ctl_sale_suspension` | `catalog` (lượt B) | **lần đóng bán**: phạm vi `SERVICE`/`GROUP`, khoảng ngày đi, hiệu lực từ–tới, lý do bắt buộc, người đóng / mở lại | do **B** tạo. **Sau C chứa thêm một loại thực thể: «luật thường trực có điều kiện»** — một lần đóng có dòng điều kiện con, thường không có ngày kết thúc |
| `ctl_sale_suspension_condition` | `catalog` | **mới loại dữ liệu**: điều kiện (khoá, giá trị có kiểu) của một lần đóng — `NGAY_DI_TRONG_MUA`, `THU_TRONG_TUAN`, `DAT_TRUOC_DUOI`, `NGAY_DI_NGOAI_KHUNG`. Chỉ điều kiện dẫn tới **chặn** | **mới**, chỉ thêm |
| `ctl_sale_condition_kind` | `catalog` | bảng tra cứu bốn khoá; khớp danh sách đăng ký ở `src/shared/dong-ban.ts` | **mới** |
| `order_service` | `orders` | `depart_date` (đầu vào của mọi điều kiện) | không đổi |
| `audit_log` | `audit` | + `season_created`, `season_updated`, `season_range_confirmed`, `season_range_ended`. Lần đóng có điều kiện dùng `catalog_sale_suspended` / `catalog_sale_resumed` của B, `detail` thêm mã khoá | thêm 4 hành động |

**Bảng `ctl_sale_suspension` của B nhận loại dữ liệu mới.**
- Trước C, mỗi dòng là một lần đóng tạm thời, do Bán hàng/Quản trị/Toàn quyền đặt khi hết chỗ.
- Sau C, có thêm những dòng là **luật thường trực** chỉ Quản trị/Toàn quyền đặt, chẳng hạn «không chạy thứ Tư», «không bán trong Tết».
- Hai loại dòng nằm chung một bảng, chung một cổng, chung một bộ hiển thị, nhưng **khác ô quyền** (mục 2). Cách phân biệt: dòng có ít nhất một điều kiện con là luật thường trực.
- Không có dòng nào mang nghĩa «cho phép».

## 2. Dòng bản đồ quyền chạm các bảng này → áp cho loại nào

| Ô / cổng | Giá trị | Áp cho (sau lượt C) |
|---|---|---|
| `season.write` (**mới**, thao tác — C1) | ADMIN, SUPER_ADMIN `any`; còn lại `none` | ghi `lm_season`, `lm_season_range` (thêm/sửa mùa, xác nhận, kết thúc khoảng) |
| `catalog.sale.condition.write` (**mới**, thao tác — C2) | ADMIN, SUPER_ADMIN `any`; còn lại `none` | tạo **và** kết thúc lần đóng **có điều kiện** (dòng `ctl_sale_suspension` + dòng con) |
| `catalog.sale.suspend` (B) | SALES, ADMIN, SUPER_ADMIN | **chỉ** lần đóng **trơn**. Thân có điều kiện ⇒ 403 (route kiểm ô mới) |
| `catalog.sale.resume` (B) | ADMIN, SUPER_ADMIN | **chỉ** lần đóng trơn. Lần đóng có điều kiện ⇒ 409 «dùng màn Điều kiện bán» |
| `admin.manage` | ADMIN, SUPER_ADMIN | **không đổi nghĩa** (bản đầu định mở rộng — đã bỏ) |
| cổng `office` (đọc lịch mùa) | mọi tài khoản văn phòng | `GET` lịch mùa (tên tạm `/api/lich-mua`) |
| DTO danh mục lập đơn (B Đ4) | như B (mọi người lập đơn, kể cả Đối tác) | `tamNgung[].dieuKien` + khoảng mùa đã trải. Đối tác thấy **lý do và khoảng ngày**, không thấy tên người đặt |
| `PARTNER`, `INTERN`, `DRIVER`, `DRIVER_PARTNER`, `HR` | — | không đọc lịch mùa, không ghi gì của C |
| `pricing` đọc mùa (lượt D) | — | qua cạnh `pricing → lich-mua`, trong thân route đã `can()` |

Không có mã quyền mới; có hai thao tác mới. Bài «tập con quyền» không nhân đôi. Bài «mỗi ô được máy chủ hỏi» phải phủ hai thao tác này.

## 3. Cổng nào canh cửa nào

| Cửa | Cổng (thứ tự) | Đổi gì |
|---|---|---|
| ghi mùa / khoảng / kết thúc khoảng (route mới, cổng `admin`) | `season.write` → kiểm dạng → chồng ngày cùng ưu tiên (mã) → ghi + nhật ký một lô → trigger (CSDL) | mới |
| đổi ưu tiên mùa | `season.write` → khoá lạc quan → không tạo chồng ngày cùng ưu tiên → ghi + nhật ký trước→sau | mới |
| tạo lần đóng có điều kiện (route của B, cổng `office`) | thân có điều kiện ⇒ `catalog.sale.condition.write` (không có ⇒ 403) → khoá ∈ bảng tra cứu → giá trị đúng kiểu theo khoá → dòng cha + dòng con **một lô, một mốc `at`** + `catalog_sale_suspended`; trigger «cùng lô» từ chối dòng con khác `created_at`/`created_by` của dòng cha, hoặc cha đã mở lại (C-Đ4.1) | thêm nhánh vào route của B (**B+1**: thiếu ô mới ⇒ 403) |
| kết thúc lần đóng có điều kiện | `catalog.sale.condition.write` → luật mở lại của B: một lần, không kéo dài, **quá kết thúc dự kiến ⇒ 409** (ca biên B áp cả dòng có điều kiện — C-Đ4.8) | mới; route mở lại của B trả 409 cho dòng có điều kiện (**B+2**) |
| **tám cửa ghi đơn của B** (lập, lưu nháp, sửa chuyến, đổi bên đặt, `/status`, Gửi xác nhận, Gửi đơn, Còn vé) | **`congBanDuoc`** (`orders`) → `catalog.dongBanTrung` (bước 2 «đóng bán»). `dongBanTrung` đọc khoảng mùa qua `v_lm_season_day_range` rồi tính điều kiện bằng `src/shared/dong-ban.ts`. Ngày xét và mốc giờ theo bảng (c) của B; Còn vé kèm `ngayDi` xét cả hai ngày | **không thêm cổng, không thêm mã lỗi** (`sale_suspended`); chỉ thêm bộ tính vào hàm của B |
| đơn **đã xác nhận** | không xét lại, trừ đổi ngày (cửa 3 của B) | như B |
| tin «Tạm ngừng bán» (B Đ6) | `donCuaToiTrungDongBan` → `dongBanChoForm` | tự gồm lần đóng có điều kiện; không thêm loại tin |

### 3b. Giao diện ẩn/hiện bị đổi nghĩa

- **Trang «Tình trạng bán» của B**: thêm khối «Điều kiện bán». Nút thêm/kết thúc hiện khi `can(catalog.sale.condition.write)`. Bán hàng thấy khối **chỉ đọc**. Nút «Mở lại» của B **ẩn** trên dòng có điều kiện.
  - **Đổi nghĩa**: mục menu của B hiện khi giữ ô đóng **hoặc** ô mở lại; nay **hoặc** thêm ô điều kiện.
- **Thẻ dịch vụ trên form lập đơn** (luật thuần `dong-ban.ts`, B Đ4):
  - nhãn mờ có thêm lý do theo khoá («Không chạy thứ Tư», «Phải đặt trước 1 ngày», «Ngừng bán trong Tết (05/02–09/02)», «Chỉ bán 01/05–31/08»);
  - kết quả phụ thuộc **ngày đi đang chọn** và **ngày hôm nay**. Với `DAT_TRUOC_DUOI`, form có thể khác máy chủ nếu đồng hồ máy người dùng lệch ngày; máy chủ là chốt thật.
- **Menu «Lịch mùa»**: hiện khi `can(season.write)`. Trang chủ người giữ ô đó có thẻ nhắc lịch lễ năm sau.

## 4. Lỗ đang hở (`docs/quyen-hoan.json`, đọc 30/10)

Sáu mục HIGH đang mở: TNV-G1, TNV-G3, TNV-G4, HC-5.19, HC-5.11, HC-4.2. **Lượt C không xây trên lỗ nào**:
- không chạm tiền, sổ;
- không thêm Cron — gợi ý tính lúc mở màn, cố ý để khỏi chạm HC-5.11;
- migration chỉ thêm bảng (HC-5.19).

## 5. Các quyết định đụng nhau ở đâu

1. **C ↔ B: bảng và cổng.** C không có bảng luật riêng: luật thường trực là một lần đóng của B có thêm điều kiện con. Thứ tự «vì sao không đặt được» của B giữ nguyên: ẩn → luật bán → **tạm ngừng bán (gồm cả điều kiện của C)** → cần xác nhận. Khi nhiều lần đóng cùng trúng, câu báo lấy lần đóng đầu tiên trúng theo thứ tự B chọn. Kế hoạch thi công nên ưu tiên lần đóng trơn trước lần đóng có điều kiện, vì lý do «hết chỗ» cụ thể hơn [người soạn].
2. **C ↔ B: quyền (B2).** Bán hàng chỉ đóng **trơn**. Luật có điều kiện do Quản trị/Toàn quyền đặt **và** kết thúc bằng ô mới. Ô `catalog.sale.resume` của B không đổi nghĩa. Bán hàng không có cửa nào để gỡ một điều kiện thường trực.
3. **C ↔ B6, B7.**
   - B7 (lý do bắt buộc): mọi lần đóng có điều kiện mang `reason` của dòng cha, hiện cho Đối tác.
   - B6 (báo người có nháp/đơn chờ): kế thừa qua `dongBanChoForm`, không thêm loại tin.
   - Đổi hợp đồng DTO `tamNgung` (thêm `dieuKien` và khoảng mùa đã trải) là **thêm trường**, không đổi trường của B. Bài so khớp form ↔ máy chủ của B phải thêm các ca có điều kiện.
4. **C ↔ D (phụ thu).** D đọc «mùa thắng tại ngày đi» bằng **cùng** hàm `src/shared/lich-mua.ts`. Điều kiện `NGAY_DI_TRONG_MUA` **không** dùng ưu tiên. Kết thúc một khoảng mùa: đơn đã xác nhận giữ phụ thu đã chụp (D). Đổi ưu tiên mùa: chỉ ảnh hưởng nháp.
5. **C ↔ ADR-0146 (lượt A).** Không giao: C không thêm khoá «loại đối tác»; 0146 không thêm khoá «mùa». «Tết: không bán vé X cho Công ty du lịch» chưa làm được sau C; làm sau bằng ADR riêng.
6. **C ↔ A (đặc điểm).** Không giao: bảng của B chỉ có phạm vi dịch vụ/nhóm.
7. **C ↔ ADR-0147.** Hai danh sách khoá điều kiện, hai phân hệ, hai luật hợp giải: chặn thì «một lần trúng là đủ», tiền thì «dòng cụ thể nhất thắng». Lý do không dùng chung: C-Đ4.7.
8. **Nới sơ đồ phụ thuộc (Điều 9.4), tính vào trần:** đúng hai cạnh, mỗi cạnh một lượt — `pricing → lich-mua` (C1, cho D), `catalog → lich-mua` (C2). `orders` **không** được cạnh tới `lich-mua`; tiêu chí 13 canh việc này. Không vòng.
9. **Bổ sung cho lượt B** (C-DE-XUAT mục «Bổ sung cho lượt B»): B+1 route đóng ⇒ 403 khi thân có điều kiện mà thiếu ô mới; B+2 route mở lại ⇒ 409 với dòng có điều kiện (tiêu chí 2 của B chỉ đúng cho lần đóng trơn); B+3 bài quét chuỗi `ctl_sale_suspension` của B khớp cả tên bảng con — SQL bảng con ở cùng tệp nửa nghiêm của B và mẫu quét có ranh giới từ, liệt kê riêng bảng con; B+4 thêm bộ tính/trường; B+5 thêm ca so khớp. Kế hoạch thi công B và C phải đọc mục này.
10. **Tin B6 với «đặt trước tối thiểu»** (R2-C4): nháp chỉ bắt đầu trúng khi ngày trôi qua; tin mang mốc cũ nên không tăng số đỏ. Chốt thật là 409 lúc gửi/xác nhận. Ghi để chủ biết.

## 6. Bài kiểm dự kiến phải thêm / sửa

- `src/architecture.test.ts`:
  - `ALLOWED_EDGES` thêm `lich-mua` và hai cạnh; `STRICT` thêm `lich-mua`;
  - bài thử cố ý: `lich-mua → catalog` đỏ, `orders → lich-mua` đỏ.
- Bài mới:
  - `src/shared/lich-mua.test.ts`;
  - `src/shared/am-lich.test.ts` (bảng đối chiếu người xác nhận; trước đó `todo` có tên);
  - ca điều kiện trong bài luật thuần `dong-ban` của B;
  - trigger chỉ thêm + chồng ngày + hình dạng điều kiện + «cùng lô» (C2, tiêu chí 15);
  - danh sách khoá ↔ bảng tra cứu;
  - quét «không tên ngày lễ trong mã»;
  - bài quét (a) của B đổi mẫu có ranh giới từ, liệt kê riêng bảng con (B+3; tiêu chí 16).
- Quyền: `src/shared/permissions.test.ts` (hai thao tác), `src/permission-enforcement.test.ts`, `src/route-access.test.ts`, `src/route-write-guard.test.ts`, `src/shared/tro-ly-cau-truc.test.ts` (tên thao tác).
- `src/shared/audit-actions.ts` + bài tên hành động.
- e2e:
  - lịch mùa: xác nhận, chồng ngày 409, quyền 403;
  - khi B có: điều kiện chặn ở lập đơn, Bán hàng không gỡ được, Quản trị mở lại bằng route của B nhận 409.
- Mỗi hàng rào mới: quan sát chặn thật một lần rồi ghi `docs/SO-HANG-RAO.md` (P16).
