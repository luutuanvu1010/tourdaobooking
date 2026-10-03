# Đợt V0 — văn bản trình chủ duyệt (kiểm theo vai 2/10)

> Soạn 2026-10-03 theo lộ trình `docs/superpowers/plans/2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §2. Vai phiên: **soạn văn bản** — không sửa mã, không sửa ADR đã accepted, không áp bản vá nào vào tệp thật. Quyết định của chủ làm căn cứ: `docs/superpowers/specs/2026-10-02-kiem-theo-vai/NGUYEN-NHAN-GOC.md` §8 (chat 3/10).

## Lượt duyệt A (3 quyết định chạm quyền/dữ liệu — đủ trần)

| Mục | Tệp | Là gì |
|---|---|---|
| A1 | `A1-quyen-hoan-TNV-VP01.diff` | Bản vá thêm mục `TNV-VP01` (HIGH, hạn 2026-10-31, chủ dự án chịu trách nhiệm) vào `docs/quyen-hoan.json`. Áp thử: `src/phat-hien-han.test.ts` xanh. |
| A2 | `A2-adr-0092-bo-sung-D2b.diff` | Bản vá cho ADR-0092 nháp (tệp lượt duyệt 2, bản 3.3 → 3.4): thêm Đ2b, sửa Đ4, R-BIL-13 đếm dòng đảo giữ hộ, ghi lời chủ 3/10. |
| A3 | `A3-ADR-0096-thu-tu-diem-dung-va-cua-so-xuat-ben.md` | ADR-0096 proposed: LC-19 đón trước trả, LC-20 cửa sổ xuất bến 12 giờ. |
| — | `LUOT-A-TRANG-GHEP.md` | Trang ghép chung: (1) bảng, (2) quyền, (3) cổng + giao diện, (4) cặp lệnh trên cùng đối tượng. |

## Lượt duyệt B (2 quyết định)

| Mục | Tệp | Là gì |
|---|---|---|
| B1 | `B1-ADR-0097-su-kien-dieu-chinh-co-ly-do.md` | ADR-0097 proposed: điều chỉnh suất, thu hồi xuất bến — chỉ văn phòng, có lý do, chỉ-thêm. |
| B2 | `B2-ADR-0098-tra-trung-ho-so-theo-sdt.md` | ADR-0098 proposed: máy chủ tra trùng theo SĐT cho mọi vai lập đơn; thay câu ADR-0014 đ5. Có Q-98-1, Q-98-2. |
| — | `LUOT-B-TRANG-GHEP.md` | Trang ghép chung lượt B, cùng bốn mục. |

## Kèm theo

- `adr-README-giu-cho.diff` — bản vá giữ chỗ số 0096–0098 trong `docs/adr/README.md` (tệp luật: chỉ áp khi chủ đồng ý). Số đo lại 3/10 trên mọi nhánh remote: lớn nhất 0095.
- Mã nợ `BL-…`: `docs/BACKLOG.md` §21 (đã ghi thật — tài liệu mô tả).
- Bảng truy vết đủ 78 lỗi và ba câu quyền BH-06/08/09: lộ trình §10, §10.1.

## Cách áp sau khi chủ "Duyệt"

Đứng ở gốc kho (worktree của nhánh), từng bản vá:

```
git apply docs/superpowers/specs/2026-10-03-v0-luot-duyet/A1-quyen-hoan-TNV-VP01.diff
git apply docs/superpowers/specs/2026-10-03-v0-luot-duyet/A2-adr-0092-bo-sung-D2b.diff
```

`adr-README-giu-cho.diff` sửa `docs/adr/` — hàng rào "tệp luật" chặn ghi bằng dòng lệnh, nên áp bằng công cụ sửa tệp (chủ được hỏi). ADR-0096/0097/0098 khi "Duyệt" thì chép sang `docs/adr/` bằng công cụ sửa tệp, đổi dòng trạng thái sang `accepted` kèm lời chủ.

## Kiểm độc lập

Người kiểm độc lập chỉ đọc (3/10) kết luận **ĐẠT CÓ ĐIỀU KIỆN**: 1 phát hiện CAO (ADR-0098 — trang đơn và nhật ký hôm nay trả tên hồ sơ cho Đối tác/Thực tập ⇒ thêm Đ3b), 8 VỪA, 6 THẤP. Tất cả đã sửa vào văn bản cùng ngày; **chưa** có vòng kiểm lại sau khi sửa.

## Kết quả duyệt (chat 2026-10-03)

> "Duyệt A1, A2, A3 (A3: 12 giờ là mặc định trong bảng chính sách, không viết cứng, không có phá lệ). Duyệt ADR-0097 và ADR-0098. Danh bạ chặn trùng SĐT cho hồ sơ mới, hồ sơ cũ cảnh báo. SĐT nước ngoài: phương án B, ghi mã nợ chuẩn hoá số quốc tế. HT-06: chặn, gộp vào ADR-0096. BH-06: cho ghi như HDV phụ trách (ADR riêng). BH-08: Thực tập như Đối tác, chỉ giá danh mục, không giảm. BH-09: giữ như hôm nay tới ADR-0018 giai đoạn 2."

| Mục | Đã làm |
|---|---|
| A1 | áp vào `docs/quyen-hoan.json` (`TNV-VP01`) |
| A2 | áp vào bản nháp ADR-0092 (bản 3.4); **toàn văn ADR-0088, ADR-0092 vẫn chờ "Duyệt"** |
| A3 + HT-06 | `docs/adr/ADR-0096-thu-tu-diem-dung-cua-so-xuat-ben-va-gio-hen.md` (accepted, thêm Đ3 LC-21) |
| B1 | `docs/adr/ADR-0097-su-kien-dieu-chinh-co-ly-do.md` (accepted) |
| B2 + Q-98-1, Q-98-2 | `docs/adr/ADR-0098-tra-trung-ho-so-theo-sdt.md` (accepted, thêm Đ7 Danh bạ, Đ4 số nước ngoài) |
| BH-06 | `docs/adr/ADR-0099-ban-hang-phu-trach-ghi-lan-thu.md` (accepted) |
| BH-08 | `docs/adr/ADR-0100-thuc-tap-gia-danh-muc-khong-giam.md` (accepted) |
| BH-09 | không đổi; `BL-QUYEN-BH09` ghi lời chủ |
| Mục lục ADR | `docs/adr/README.md` thêm 0096–0100, số kế tiếp 0101 (bản vá `adr-README-giu-cho.diff` không còn dùng) |
| Trang ghép lượt C | `LUOT-C-TRANG-GHEP.md` (C1 = ADR-0096 Đ3, C2 = ADR-0099, C3 = ADR-0100) — viết sau lời chủ |

Các tệp A3, B1, B2 trong thư mục này là **bản nháp lịch sử**; bản có hiệu lực ở `docs/adr/`.

**Chưa làm:** dòng "thay câu" trỏ về ADR mới trong dòng trạng thái các ADR cũ (ADR-0001, 0011, 0014, 0026, 0027, 0049, 0052, 0053, 0068, 0080) — phiên V0 được giao "không sửa ADR đã duyệt"; việc này chờ chủ cho phép riêng.

## Câu hỏi gom cho chủ (lần hỏi 3/10 — đã trả lời, giữ để đối chiếu)

1. Lượt A: A1, A2, A3 — "Duyệt" hay "Sửa: …".
2. Lượt B: B1, B2 — "Duyệt" hay "Sửa: …"; kèm Q-98-1 (Danh bạ cũng chặn trùng số?) và Q-98-2 (số nước ngoài trên đơn).
3. HT-06 (`BL-GIO-HEN-SOM`): giờ hẹn đón sớm hơn giờ xuất bến có thành lý do **giữ** chuyến không. Nếu "có": soạn bổ sung ADR-0096 và duyệt ở **lượt sau** (không nhét vào lượt A để giữ trần 3).
4. BH-06, BH-08, BH-09: chọn phương án ở lộ trình §10.1.
5. ADR-0096 Đ2.4: chuyến thật sự chạy sớm thì văn phòng **sửa giờ khởi hành** cho lọt cửa sổ — đó là cửa thoát duy nhất. Sửa giờ **sớm hơn** có cần thêm lý do riêng không? Khuyến nghị: không thêm (lệnh sửa chuyến đã có nhật ký trước → sau và chạy mọi kiểm).
