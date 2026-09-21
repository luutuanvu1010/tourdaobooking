# Nguyên mẫu bài quét PII chung trong nhật ký (chưa phải test)

> **Trạng thái: NGUYÊN MẪU do người kiểm độc lập E (chỉ đọc) dựng ngày 2026-09-21, CHƯA được duyệt, CHƯA chạy trong `npm test`.** Giữ ở đây để việc T3 của đặc tả (`docs/superpowers/specs/2026-09-21-bo-tieu-chuan-nen-tang-design.md` mục 4I) dùng làm điểm xuất phát. Người thi công T3 phải viết lại thành test có đỏ→xanh và có người kiểm khác.

## Nó làm gì
`route-scan.nguyen-mau.mjs` gói module thật bằng esbuild, dựng D1 giả trên `node:sqlite` với migration thật, chạy **9 route ghi nhật ký**, gieo SĐT/email/MST/địa chỉ vào các trường đầu vào rồi quét `audit_log.detail`. Người kiểm E báo: quét được đúng 0 dòng lộ trên mã đã sửa và 1 dòng lộ trên bản hoàn nguyên (`staff_updated`). **Không cần mạng** → làm được ở Bậc A (đơn vị), không bắt buộc e2e.

## Kiểm kê nơi ghi nhật ký (người kiểm E)
Mọi ghi đều đi qua `src/modules/audit/repository.ts:35`. `auth`, `company` không ghi nhật ký.
- **Sạch (cấu trúc):** accounts (sau khi sửa), catalog, dispatch (tên người phụ trách), locations (`mã — tên`), maintenance (không ghi `allowed_phones`), orders `summarizeDeviations`, parties (số/email/MST/địa chỉ đưa vào không lọt sang nhật ký).
- **Có thể chứa PII nếu người dùng gõ vào chữ tự do:** `feedback` (tiêu đề người gửi nguyên văn, cắt 100 ký tự), `orders` `trip_updated` (tên dịch vụ tự nhập ≤ 300 ký tự), `parties` (tên người/đơn vị).
- Không nơi nào ghi SĐT/email/MST **theo cấu trúc**.

## Cách so đúng (bài học từ bài kiểm `staff_updated`)
Đừng dò bằng regex trên chữ đã định dạng. Bỏ mọi ký tự không phải chữ số ở chi tiết nhật ký và ở giá trị đã gieo, rồi so phần số quốc gia không có số 0 đầu (`901000099`), cộng kiểm "không có dãy ≥ 9 chữ số". Regex `(?:\+84|0)[3-9]\d{8}` bỏ lọt `84901000099`, `0901 000 099`, `0901.000.099`, `+84 901…`, số máy bàn, MST không bắt đầu bằng 0, email.

## Điều chờ chủ quyết trước khi viết bài quét thật
1. Chữ tự do người dùng gõ (tiêu đề góp ý, tên hồ sơ, tên dịch vụ tự nhập): **chấp nhận** vì chỉ admin xem nhật ký (đề xuất; bài quét chỉ kiểm phần có cấu trúc, ghi giới hạn vào overlay), hay phải cắt/che.
2. Dòng `staff_updated` cũ còn số trên production: **giữ nguyên** (nhật ký chỉ-thêm; đề xuất) hay làm migration che số.
