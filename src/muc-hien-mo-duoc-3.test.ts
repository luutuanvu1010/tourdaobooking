// BÀI RÀO "MỤC HIỆN ⇔ TRANG MỞ ĐƯỢC" — phần 3/4 (bước K-c sổ đại lý đợt 1; chia theo đường gọi chính để các tệp chạy song song, cân theo giá gọi từ 25/11/2026).
// Luật, danh sách "được mà ẩn" chờ chủ (DUOC_MA_AN), quy ước "bị từ chối", giới hạn: tests/audit/muc-hien-mo-duoc-khung.mjs. Bảng mục: src/shared/muc-giao-dien.ts.
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { kiemPhan } from "../tests/audit/muc-hien-mo-duoc-khung.mjs";

await kiemPhan(2);
