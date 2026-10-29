Khung xương giữ chỗ khi đang tải: vỏ `.trang-thai-xuong[aria-busy=true]` chứa các thanh `.xuong` (cao `skel-dong` 16, nền `c-surface-alt`, nhịp `skeleton-pulse` 1,2 s; máy «Giảm chuyển động» thì đứng yên); `data-khuon="so"` cao `skel-so` 26, `data-khuon="vien"` rộng `skel-vien` 96 bo tròn.

**Trong mã:** `trangThaiHeThong("dang-tai", { khuon })` ở `web/trang-thai-he-thong.ts` dựng 4–6 thanh theo khuôn (`danh-sach` 6, `chi-tiet` 5, `bieu-mau` 5, `bang-dieu-khien` 4, `thiet-lap` 4); CSS ở khối «Thành phần chung v2». 14 token `skel-*` cũ: ba cái bằng giá trị là bí danh, mười cái khác giữ (BACKLOG).

## Đừng
Không vòng quay toàn trang; không chữ «Đang tải…» rời; mất mạng thì khung xương nhường cho dải ngoài mạng.
