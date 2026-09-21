# Mẫu báo cáo QA

> **Thư mục này chỉ giữ khuôn.** Báo cáo thật của QA agent độc lập nằm ở **`docs/qa-reports/`** — vị trí và quy ước tên do `ADR-0024` quy định (`task-<N>-<hash>.md` cho báo cáo gắn một task; đợt không gắn task thì `<tên-đợt>-<hash>.md`). Một file cho một commit được audit.
>
> Dòng `Kết luận` dùng bốn trạng thái, nghĩa ở `FRAMEWORK.md` Phần 9 (`ADR-0024`). Suy từ số lỗi: có lỗi Cao → `SỬA` (hoặc `LEO THANG` nếu lỗi Cao nằm ngoài thẩm quyền phiên); 0 lỗi Cao còn lỗi Nhẹ hoặc vùng chưa kiểm → `ĐẠT CÓ ĐIỀU KIỆN`; 0 lỗi → `ĐẠT`.
>
> **Đọc `WORKFLOW.md` §3b trước khi dùng.** Cơ chế này không chống giả. Nó chỉ có giá trị khi nội dung tái lập được và khi Cowork thật sự đối chiếu. Một báo cáo chỉ ghi kết luận là rác, phải bị reject y như khi không có báo cáo.

Chép phần dưới đây, xoá mọi hướng dẫn trong ngoặc vuông.

---

# QA — [tên đợt] — commit `[hash đầy đủ]`

- **Branch:** `[tên branch]`
- **Spec đối chiếu:** `[đường dẫn prompt hoặc spec]`
- **Ngày:** [YYYY-MM-DD]
- **Kết luận:** ĐẠT / TRƯỢT — [số] lỗi Cao, [số] lỗi Nhẹ

## Phạm vi đã kiểm

[Liệt kê file trong commit, lấy từ `git show --stat [hash]`. Dán output thật, không mô tả lại.]

## Lệnh đã chạy

[Mỗi lệnh một khối, kèm output thật đã cắt gọn. Không viết "đã chạy và pass" mà không có output. Ví dụ:]

```
$ grep -rn "langPrefix" src/ | wc -l
19
```

## Từng ràng buộc

[Một dòng cho mỗi ràng buộc trong spec (R1, R2, ...). Mỗi dòng phải trỏ `file:dòng` cụ thể hoặc lệnh đã chạy ở trên. "Đã kiểm, đạt" không kèm bằng chứng thì không tính.]

| Ràng buộc | Kết quả | Bằng chứng |
|---|---|---|
| R1 — [tóm tắt] | đạt / không đạt | `[file]:[dòng]` hoặc lệnh số [n] |

## Lỗi phát hiện

[Mỗi lỗi: mức (Cao / Nhẹ), `file:dòng`, mô tả sai ở đâu, và vì sao nó sai theo spec nào. Nếu không có lỗi, ghi "Không có" — nhưng chỉ sau khi bảng trên đã đầy bằng chứng.]

## Điều chưa kiểm được

[Bắt buộc có mục này. Ghi thẳng thứ không xác minh được và lý do: thiếu dữ liệu, thiếu mạng, cần chạy trên production, ngoài phạm vi. Báo cáo không có mục này bị nghi là chưa kiểm kỹ, vì mọi lần audit thật đều có vùng mù.]
