Dải trên trang `.dai[data-tong]` trong `#strips` ngay dưới thanh trên: **mỗi lúc một dải**, cao tối thiểu `h-dai-tren` 44, hình 18 + câu `.dai-cau` + một `.nut[data-cap=phu]` + nút đóng `.dai-dong` (nếu đóng được).

**Trong mã:** `web/dai.ts` (`datDai`, một chủ sở hữu), chữ và thứ tự ở `src/shared/dai-chu.ts` (`UU_TIEN`, `TONG_DAI`); CSS ở khối đợt 0 của `public/app.css`.

## Bốn loại (ưu tiên trên → dưới)
| Loại | Tông | Hình | Câu · nút |
|---|---|---|---|
| `bao-tri` | `bien` | `history` | «Đang bảo trì, dự kiến xong HH:MM» · Xem |
| `ngoai-mang` | `cat` (`c-mat-mang-bg`) | `clock` | «Đang ngoài mạng — dữ liệu lần xem gần nhất» · Thử lại |
| `thong-bao` | `cat` | `clock` | thông báo quan trọng · Xem / Đã hiểu |
| `bao-mat` | `do` | `alertCircle` | nhắc bật bảo mật hai lớp · Bật ngay + đóng |

## Hành vi
Nhắc bảo mật đóng được, nhớ theo phiên (`sessionStorage` `dai-bao-mat-da-dong`) và không hiện ở trang biểu mẫu (`body[data-khuon=bieu-mau]`). Ở ≤ 640 câu dài xuống hai dòng. Thân trang đã là khối «chưa nạp» thì dải ngoài mạng chỉ còn «Đang ngoài mạng», không nút.

## Đừng
Không xếp chồng hai dải; không dùng dải thay thông báo ngắn.
