# ADR-0099: Bán hàng đang phụ trách đơn được ghi lần thu, như Hướng dẫn viên phụ trách

- **Trạng thái:** **accepted** — chủ dự án trả lời trong chat 2026-10-03: *"BH-06: cho ghi như HDV phụ trách (ADR riêng)."* (chọn phương án (A) của câu hỏi ở `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §10.1). AI soạn và ghi lại, không tự duyệt (Hiến pháp N3, Điều 7.2); chi tiết thi hành dưới đây là cách áp đúng khuôn HDV phụ trách đã có, không thêm luật mới. Trang ghép (lượt C, cùng ADR-0096 Đ3 và ADR-0100): `docs/superpowers/specs/2026-10-03-v0-luot-duyet/LUOT-C-TRANG-GHEP.md`. Chưa có người kiểm độc lập đọc văn bản này. Từ mốc này chỉ sửa dòng trạng thái; đổi nội dung = ADR mới trỏ về ADR này.
- **Ngày:** 2026-10-03
- **Phạm vi:** một ô của bản đồ quyền (`src/shared/permissions.ts`, dòng `payment.receive`, cột `SALES`); không bảng mới, không cột mới, không route mới.
- **Gỡ lỗi:** BH-06 — Bán hàng là người phụ trách đơn đồng nghiệp lập: xác nhận đơn được (200) nhưng ghi lần thu khách đưa tại quầy bị 403 "Tài khoản này không được ghi tiền cho đơn này." (`docs/superpowers/specs/2026-10-02-kiem-theo-vai/BAO-CAO-LOI-DAY-DU.md` mục 11).

## Bối cảnh

- `payment.receive` hôm nay (`src/shared/permissions.ts:103`): Bán hàng `own`, Kế toán `any`, Quản trị `any`, **HDV `assigned`**, Đối tác `own`, Toàn quyền `any`, Thực tập `own`. Ô này đặt ở ADR-0026 đ10 (`:83`): *"hướng dẫn viên đang phụ trách ghi được tiền mình thu trước chuyến"*; Bán hàng giữ `own`.
- Route ghi lần thu đã hỏi đủ ngữ cảnh `{ ownerId, assigned }` (`src/modules/billing/index.ts:65, :83`) ⇒ đổi ô là đủ, route không đổi.
- Sổ giữ hộ (ADR-0026 đ4, `src/modules/billing/rules.ts:92-97`): người ghi lần thu mà không phải Kế toán ⇒ dòng "giữ hộ" (`HELD`) trên chính người đó; hoàn thành đơn bị chặn tới khi người giữ nộp về công ty. Luật này áp đúng như với HDV phụ trách.

## Quyết định

1. Ô `payment.receive` của **Bán hàng** đổi `own` → **`ownOrAssigned`**: Bán hàng ghi được lần thu trên đơn mình lập **hoặc** đơn mình đang là người phụ trách — giống HDV phụ trách (lời chủ).
2. Mọi luật khác của lần thu giữ nguyên: trước "Đã giao" mới ghi được; người ghi không phải Kế toán ⇒ dòng giữ hộ trên người ghi; khoản "Công ty thu – chuyển khoản" do người khác khai vẫn cần Kế toán xác nhận (ADR-0026 đ4; ADR-0092 Đ2b); lớp vé chống ghi trùng (ADR-0094).
3. Không đổi `payment.refund`, `ledger.*`, `order.complete` (ADR-0090 — quyền tiền chỉ Toàn quyền cấp — không chạm: `payment.receive` không thuộc `O_GHI_TIEN`, `permissions.ts:199`).

## Bấm nhầm thì sao

Như mọi lần thu: Kế toán đảo lần thu (ADR-0026, ADR-0088 sau "Đã giao"); lớp vé chặn gửi lặp.

## Thay câu nào (ghi dòng trỏ ở dòng trạng thái văn bản cũ, không sửa thân)

| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0026 đ10 (`:83`) | `payment.receive`: "`SALES` `own` (giữ)" | `SALES` `ownOrAssigned` (ADR-0099) |
| ADR-0007 điều 1, dòng "Ghi thu tiền" (đã được ADR-0026 thay) | thu: SALES của mình | SALES của mình hoặc đơn mình phụ trách |

## Cửa một chiều / hai chiều

Hai chiều (một ô quyền, không đổi dữ liệu). Lần thu đã ghi là chỉ-thêm như mọi lần thu.

## Hệ quả

- Bài đỏ trước: route test — Bán hàng B phụ trách đơn A lập ghi lần thu → 201 (hôm nay 403); Bán hàng C không phụ trách → 403; sổ của B có dòng giữ hộ. Bài "tập con quyền" và bảng sinh tài liệu vai & quyền cập nhật cùng commit; e2e `so-tien` thêm ca.
- Trang đơn: nút "Ghi lần thu" tự hiện cho Bán hàng phụ trách (`coTheGhiThu` đã hỏi cùng ô, `billing/index.ts:51`).
- Việc lớn (quyền + tiền): người kiểm độc lập khi thi công. Xây trên lỗ đang hở: **TNV-G4, TNV-VP01, F-03** (chạm sổ giữ hộ) — làm sau V2 hoặc cùng V2.
