# ADR-0150 — Service worker trả trang «Đang ngoài mạng» khi điều hướng hết bộ đệm

- **Trạng thái:** **proposed** — AI soạn 2026-10-28 trong đợt 0 khung chung; chủ duyệt cùng cổng phát hành đợt 0. Chưa có hiệu lực cho tới khi chủ duyệt.
- **Ngày:** 2026-10-28.
- **Số:** soạn dưới số 0146; đổi thành 0150 ngày 2026-10-29 khi nhập `main` vào nhánh `dot-0-khung-chung` (chủ duyệt), vì `main` đã cấp 0146–0148 và 0149 đang dùng ở nhánh chưa gộp.
- **Loại:** service worker (chạm mọi trang). **Cửa:** hai chiều — không migration, không đổi API, quyền, dữ liệu hay cách tính tiền; gỡ bằng một commit đảo và một lần triển khai (service worker `no-store`, máy nhận bản gỡ ở lần mở kế tiếp).
- **Liên quan:** không đổi điều 1 và điều 2 của ADR-0035 (nạp sẵn mọi trang; dữ liệu `/api/*` không bao giờ vào bộ đệm của service worker). Đặc tả: `docs/superpowers/specs/2026-10-28-dot-0-khung-chung/DAC-TA.md` mục 6.

## Bối cảnh

Khi mất mạng mà một lượt điều hướng không có trong bộ đệm của service worker (trang chưa từng nạp, hoặc bộ đệm bị trình duyệt dọn), service worker cũ trả về một câu chữ trơn với mã 503. Người dùng thấy trang trắng, không có thanh điều hướng và không biết làm gì tiếp.

## Quyết định

1. Khi một lượt điều hướng (không phải `/api/*`) hết bộ đệm và không có mạng, service worker trả trang `/ngoai-mang` (có sẵn trong bộ nạp sẵn của mỗi bản dựng, có vỏ và nút «Thử lại»), thay cho câu 503 chữ trơn. Chỉ khi cả `/ngoai-mang` cũng không có trong bộ đệm thì mới còn 503 chữ như cũ.
2. Không đổi điều 1 và điều 2 của ADR-0035: tệp tĩnh vẫn nạp sẵn theo bản dựng; dữ liệu `/api/*` vẫn không bao giờ vào bộ đệm của service worker, nên trang đã vẽ khi mất mạng giữ nội dung đã có và chỉ hiện dải «Đang ngoài mạng», không hiện số liệu mới.
3. Ghi chú vị trí nút Trợ lý: theo cổng 1 câu 4 (`QUYET-DINH-CONG-1.md`), nút Trợ lý chuyển lên thanh trên cùng. Việc này không đổi quyết định của ADR-0084 (ai được dùng Trợ lý, Trợ lý làm gì); chỉ đổi chỗ đặt nút. ADR-0084 không bị sửa.

## Hệ quả

- Người dùng mất mạng ở trang chưa nạp thấy hướng dẫn thử lại thay vì trang trắng.
- Thêm một trang tĩnh vào bộ nạp sẵn (nhỏ); danh sách khớp `build:web` do bài `src/shared/sw-policy.test.ts` canh.
- Kịch bản Chrome `mat-mang-smoke.mjs` (đợt 0) phải xoá mục `/ngoai-mang` khỏi bộ đệm một lần để kiểm nhánh 503 chữ còn lại.

## Cách gỡ

Đảo commit của đợt này (nhánh bắt điều hướng trong `web/sw/sw.ts` và trang `/ngoai-mang`) rồi triển khai lại.
