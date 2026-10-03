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

## Câu hỏi gom cho chủ (một lần hỏi)

1. Lượt A: A1, A2, A3 — "Duyệt" hay "Sửa: …".
2. Lượt B: B1, B2 — "Duyệt" hay "Sửa: …"; kèm Q-98-1 (Danh bạ cũng chặn trùng số?) và Q-98-2 (số nước ngoài trên đơn).
3. HT-06 (`BL-GIO-HEN-SOM`): giờ hẹn đón sớm hơn giờ xuất bến có thành lý do **giữ** chuyến (gộp vào ADR-0096) không.
4. BH-06, BH-08, BH-09: chọn phương án ở lộ trình §10.1.
