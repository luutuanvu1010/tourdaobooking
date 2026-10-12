// BÀI RÀO "MỤC HIỆN ⇔ TRANG MỞ ĐƯỢC" — phần 1/3 (bước K-c sổ đại lý đợt 1, vòng sửa 1: chia theo đường gọi chính để ba tệp chạy song song).
// Luật, danh sách "được mà ẩn" chờ chủ (DUOC_MA_AN), quy ước "bị từ chối", giới hạn: tests/audit/muc-hien-mo-duoc-khung.mjs. Bảng mục: src/shared/muc-giao-dien.ts.
// Phần 1 chạy thêm các kiểm tĩnh (không gọi máy chủ): chia đường đủ và không trùng, chưa khai đường gọi, PAGES, chốt chặn trình duyệt, khung tạm, href viết tay.
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { kiemPhan } from "../tests/audit/muc-hien-mo-duoc-khung.mjs";

await kiemPhan(0);
