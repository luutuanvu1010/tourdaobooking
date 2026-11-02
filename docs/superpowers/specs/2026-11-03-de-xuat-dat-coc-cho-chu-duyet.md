# Đề xuất cho chủ duyệt: hai dòng đi kèm «Khách đặt cọc trước» (2026-11-03)

Hai chỗ dưới đây là tệp luật hoặc sổ hạn, AI không tự sửa (CLAUDE.md §3). Chưa có hiệu lực cho tới khi chủ duyệt. Hồ sơ có ngày, duyệt xong không sửa lại.

## 1. Thêm một hàng vào bảng «sửa gì → chạy kịch bản nào» ở `web/CLAUDE.md`

Đặt ngay sau hàng «Bước xác nhận đơn và "Gửi đơn"». Vì sao: không có hàng này thì lần sau sửa ô đặt cọc, người sửa không biết phải chạy kịch bản nào.

```
| Ô «Khách đặt cọc trước» (ADR-0159): `web/order-form.ts`, `#dat-coc-o` và `[data-dat-coc]` của `public/order-form.html`, dòng chờ xác nhận ở `web/order.ts`, `src/shared/dat-coc-truoc.ts` | `dat-coc-smoke.mjs` ở `docs/evidence/2026-11-02-dat-coc/kich-ban/` (390 + 1040, cần `AXE_JS`) + `xac-nhan-smoke.mjs` |
```

## 2. Nối thêm vào `xay_tren_cho_phep` trong `docs/quyen-hoan.json`

ADR-0159 ghi rõ: duyệt ADR là cho phép xây trên các mục này, còn dòng trong sổ do chủ duyệt. Nối vào cuối chuỗi đã có của từng mục, ngăn bằng ` | `. Phần đầu chung cho cả bốn mục:

> ĐẶT CỌC (ADR-0159) — chủ dự án 2026-11-02 (hộp hỏi): «Duyệt ô đặt cọc». Điều kiện: chỉ phát hành sau diễn tập khôi phục (HC-5.19); phần còn lại của lỗ giữ hạn cũ.

Phần riêng từng mục, viết tiếp sau phần đầu:

| Mục | Đặt cọc chạm gì |
|---|---|
| `TNV-G1` | Khoản khai của đơn huỷ đi luồng thu trước của đơn huỷ; còn đơn huỷ giữ tiền thì không khai được số mới. Ca sổ vàng của chủ và Kế toán được phép còn mở khi làm. |
| `TNV-G3` | Lệnh sửa khoản thu giữ dấu khoản khai, kể cả khi gộp. |
| `TNV-G4` | Dòng tiền đang giữ hộ sinh ngay trong lô xác nhận; cảnh báo trùng dùng chung. |
| `HC-5.19` | Lần phát hành này sinh khoản thu tự động trên đơn thật. |

Không đóng `TNV-G3`, `TNV-G4` ở đề xuất này: mã mới chưa lên production, nên đóng khi đã phát hành và người kiểm đối chiếu lại.
