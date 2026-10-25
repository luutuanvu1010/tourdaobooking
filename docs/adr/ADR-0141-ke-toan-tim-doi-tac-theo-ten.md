# ADR-0141 — Kế toán tìm được đối tác theo tên ở trang Hoa hồng (nới cổng `GET /api/pricing/nguoi-huong`)

- **Trạng thái:** **accepted** 2026-10-25 — chủ dự án trong chat, nguyên văn: «duyệt đề xuất ADR».
- **Ngày:** 2026-10-25.
- **Loại:** việc lớn (quyền). **Cửa:** hai chiều — chỉ đổi mã, không dữ liệu; hoàn tác bằng `wrangler rollback` hoặc một commit đảo.
- **Nguồn:** bàn giao `docs/superpowers/specs/2026-10-25-hoa-hong-ho-tro-thiet-ke-lai/BAN-GIAO.md` mục 3 và 5.1 (chủ bấm chọn «mở đường tìm đối tác theo tên cho người có quyền đặt mức» 25/10, rồi «ok duyệt» cả bàn giao gồm lựa chọn «nới chứ không thay»). Nháp: `…/DE-XUAT-ADR-cong-tim-nguoi-huong.md` cùng thư mục; trang ghép: `…/TRANG-GHEP.md`.
- **Số:** 0141 — 0139 là số lớn nhất ở mọi nhánh (25/10), 0140 đang giữ cho nháp «đại lý tổ chức nhiều nhân viên» (`README.md`).
- **Sửa/bổ sung:** bổ sung ADR-0077 (ai tra được người hưởng); thay «Ruling 26» của sổ thi công sổ đại lý đợt 1. Không đổi `src/shared/permissions.ts`, không thêm ô quyền.
- **Xây trên lỗ đang hở:** không — `docs/quyen-hoan.json` 25/10 có sáu mục HIGH đang mở, không mục nào ở bảng mức hoa hồng hay đường tìm người hưởng (HC-4.2, TNV-G4 ở vùng sổ tiền; ADR này không chạm đường ghi sổ).

## Bối cảnh

Ô «Một đối tác» và ô «Tra nhanh» ở trang Hoa hồng gọi `GET /api/pricing/nguoi-huong?q=`. Route gác bằng `can(order.create) && !holdsPartner`. Kế toán giữ `partner.commission.write` (đặt mức) nhưng không giữ `order.create`, nên người đặt mức không tìm được đối tác để đặt mức riêng hay tra mức. Route cũng nuôi ô «Đặt qua đối tác» của form lập đơn, nên không thể *thay* cổng mà không làm Bán hàng, Thực tập mất ô đó.

## Quyết định

**Đ1 — Cổng mới của route (nới):** `(can(order.create) || can(partner.commission.write)) && !holdsPartner`, viết thành **một** hàm dùng chung ở `src/shared/` (`coTheTimDoiTac`, `src/shared/hoa-hong-hien-thi.ts`); máy chủ và trang Hoa hồng cùng gọi.

| Quyền | Trước | Sau |
|---|---|---|
| Bán hàng, Thực tập, Quản trị, Toàn quyền | tìm được | tìm được |
| **Kế toán** | 403 | **tìm được** |
| Đối tác, tài khoản lai có quyền Đối tác | 403 | 403 |
| HDV, Tài xế, Tài xế đối tác, Nhân sự | 403 | 403 |

`access` của route giữ `"orders"` (cổng đó đã gồm Kế toán).

**Đ2 — Ô «Đặt qua đối tác» KHÔNG đổi.** `coODatQuaDoiTac` (`src/shared/phan-doi-tac-hien-thi.ts`) giữ `order.create && !holdsPartner`: hàm này quyết ô trên form lập đơn **và** trang chi tiết đơn; Kế toán mở được trang đơn, gộp với cổng mới thì Kế toán thấy ô đổi bên đặt — ngoài ý chủ.

**Đ3 — Kế toán thấy thêm:** tên hiển thị và loại hồ sơ (cá nhân / tổ chức) của bên được hưởng khớp chữ gõ, tối đa 20 dòng một lần. Kế toán đã xem được mọi hồ sơ khách/đại lý qua `party.view` (`any`), nên không lộ thêm dữ liệu. Không trả SĐT, email, MST.

## Tiêu chí nghiệm thu

1. Kế toán `GET /api/pricing/nguoi-huong?q=<tên>` → 200; Đối tác, lai → 403; HDV, Tài xế, Nhân sự → 403.
2. Bán hàng, Thực tập vẫn dùng ô «Đặt qua đối tác» (kịch bản form đơn xanh).
3. Kế toán mở trang đơn và form sửa đơn: không có ô «Đặt qua đối tác».
4. Hàng rào `src/modules/pricing/o-dat-qua-noi-cong.test.ts` **không nới** thành «⇒»: vế phải đổi thành «`nguoi-huong` trả 200 **và** giữ `order.create`», thêm ca có tên «Kế toán: route 200, ô ẩn»; ghi lại ngày quan sát chặn thật ở `docs/SO-HANG-RAO.md`.
5. Máy chủ và trang dùng cùng hàm (`src/modules/pricing/co-the-tim-doi-tac.test.ts` xanh); sửa cố ý hàm (bỏ vế `partner.commission.write`) → đỏ → hoàn nguyên.
6. `docs/SYSTEM-DESIGN.md` §7 (route `nguoi-huong`) và §9 (dòng «Hoa hồng đối tác», dòng «Ô «Đặt qua đối tác»») sửa cùng commit.

## Hệ quả

- Kế toán đặt được mức riêng cho một đối tác và tra mức theo tên mà không cần quyền lập đơn.
- Hai cổng từng khớp nhau (ô «Đặt qua đối tác» ⇔ route) nay khác nhau có chủ đích ở đúng một quyền (Kế toán); bài hàng rào giữ chặt bằng vế «và giữ `order.create`».
