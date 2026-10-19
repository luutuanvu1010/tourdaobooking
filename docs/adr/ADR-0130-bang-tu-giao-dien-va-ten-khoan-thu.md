# ADR-0130 — Bảng từ giao diện: một nơi ghi chữ đã loại, máy chặn chữ cũ quay lại; đổi tên «lần thu», «Thay lần thu», «Đảo»

- **Trạng thái:** **accepted** — chủ dự án chọn trong hộp hỏi ngày 2026-10-18, cả ba câu đều chọn phương án khuyến nghị: (1) nút «Đảo» đổi thành **«Huỷ khoản thu»** (dòng gốc ghi «đã huỷ», dòng ngược hiện dấu trừ; chi phí xe: «Huỷ dòng»); (2) **bảng từ chuẩn + bài kiểm tự quét**; (3) **chia nhiều lượt**, lượt này chỉ chữ tiền trên trang Đơn hàng cùng các lỗi rõ ràng. Tên «khoản thu» do chủ chọn ngày 2026-10-08 (`docs/BACKLOG.md` §25), áp ở đây, không hỏi lại. AI soạn và ghi lại, không tự duyệt (Hiến pháp N3, N9).
- **Ngày:** 2026-10-18. **Số:** 0130 (0129 là số lớn nhất ở mọi nhánh khi soạn).
- **Hồ sơ rà soát:** `docs/superpowers/specs/2026-10-18-ra-soat-ngon-ngu-giao-dien.md` (nghĩa thật của ba nút, toàn bộ phát hiện, việc để lượt sau).
- **Thay câu của:** ADR-0088 (tên lệnh «Thay lần thu» và câu báo «Dùng 'Thay lần thu'» ở điều 8), ADR-0025/0026 (chữ «lần thu», «dòng đảo» khi hiện cho người dùng), ADR-0095 (nút «Đảo dòng» chi phí xe). **Chỉ thay CHỮ hiện cho người dùng; cơ chế không đổi**: sổ vẫn chỉ-thêm, huỷ vẫn là ghi một dòng ngược trỏ về dòng gốc, sửa vẫn là một lô huỷ + ghi mới. Không sửa thân các ADR cũ.

## Bối cảnh

Chủ dự án, nguyên văn: *"kiểm tra lại ngữ nghĩa, giải thích trong Đơn hàng đối với "Thay lần thu", "Đảo", Ghi lần thu. Đây là những cụm từ rất tối nghĩa và không phổ thông."* Ngày 8/10 chủ đã chê «Ghi lần thu» và chọn tên «khoản thu», nhưng việc đổi chưa ai làm, nên chữ cũ vẫn còn và còn được thêm mới. Đây là lỗi lặp cùng loại, nên theo cách làm «khuôn trước, việc sau»: có luật chung kèm máy chặn rồi mới sửa từng chỗ.

## Quyết định

1. **Bảng từ giao diện là tài liệu sống, ở đúng một nơi:** `src/shared/bang-tu-giao-dien.ts` (mỗi dòng: chữ đã loại, chữ dùng thay, chủ chọn ngày nào). Thêm dòng chỉ khi chủ đã chọn tên (AI đưa 2–3 tên, không tự đặt).
2. **Máy chặn:** `src/bang-tu-giao-dien.test.ts` quét chuỗi (không quét chú thích, tên biến) trong `web/`, `src/shared/`, `src/modules/` (trừ tệp test) và chữ của `public/*.html`. Chữ đã loại quay lại thì `npm test` đỏ. Ngoại lệ có tên: `src/shared/changelog.ts` (mục cũ là hồ sơ có ngày). Không phủ: câu báo của trigger trong migration đã áp (không sửa được; máy chủ đổi sang câu tiếng Việt trước khi tới người dùng), kịch bản kiểm thử.
3. **Tên mới (lượt 1):**

| Chữ cũ | Chữ mới |
|---|---|
| Ghi lần thu | Ghi khoản thu |
| Thay lần thu (nút ghi: «Ghi lần thu đúng») | Sửa khoản thu đã ghi (nút ghi: «Lưu khoản thu đúng») |
| Ghi bù lần thu | Ghi bù khoản thu |
| lần thu / lần hoàn | khoản thu / khoản hoàn |
| Đảo (nút ghi: «Ghi dòng đảo») | Huỷ khoản thu (nút ghi: «Huỷ khoản này»); với khoản trả lại khách: «Huỷ khoản trả lại» |
| (đã đảo) / (dòng đảo) | (đã huỷ) / (dòng huỷ), dòng huỷ một khoản thu hiện **dấu trừ** |
| Đảo dòng (chi phí xe thuê) | Huỷ dòng |
| Nhật ký «Ghi dòng đảo sổ» | «Huỷ một dòng sổ tiền» |
| app / App (chỉ chính hệ thống) | Nền tảng (luật chủ 2026-10-02; «App Store» giữ nguyên) |
| Đơn đã Đã giao | Đơn đã ở bước Đã giao / Đơn đã giao |
| Bỏ dấu (đã nhập phần mềm kế toán) | Bỏ đánh dấu |
| Giữ đơn (nút trong hộp huỷ đơn, nghĩa là không huỷ) | Không huỷ |

4. **Mã nội bộ không đổi:** tên hàm, `data-action` (`thay-lan-thu`, `dao-lan-thu`…), đường API, mã lỗi, cột CSDL, mã nhật ký giữ nguyên, để không phá kịch bản, dữ liệu và nhật ký cũ.

## Hệ quả

- Người dùng thấy chữ quen thuộc; Kế toán biết khi nào «Sửa» (sai số tiền, hình thức, người thu) và khi nào «Huỷ» (ghi nhầm hẳn), vì câu xác nhận của nút Huỷ nói rõ điều đó.
- Chữ trong mục nhật ký thay đổi cũ (`changelog.ts`) giữ nguyên như lúc phát hành.
- Các tên khái niệm lớn còn lại (chặng, mốc, xuất bến, vai, phiên, giữ hộ…) trình chủ ở các lượt sau, tối đa ba tên mỗi lượt; mỗi tên được chọn thì thêm một dòng vào bảng từ.
