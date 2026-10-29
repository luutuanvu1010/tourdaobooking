# Đề xuất (chờ chủ duyệt) — thêm một dòng vào bảng kịch bản Chrome của `web/CLAUDE.md`

> 28/10/2026. `web/CLAUDE.md` là tệp luật: AI không tự sửa (CLAUDE.md §3, N9), chỉ đề xuất. Chủ đồng ý thì một phiên chép dòng dưới vào cuối bảng «Sửa tệp nào thì chạy lại kịch bản Chrome nào» bằng công cụ sửa tệp.

**Vì sao:** việc đóng dần TNV-G1 thêm khối mới ở Trang chủ Kế toán, dòng tiền mới ở trang đơn huỷ và một loại tin mới. Bảng hiện hành chỉ trỏ `web/home.ts` tới `trang-chu-smoke.mjs` (chỉ mở bằng Quản trị và Bán hàng, không kiểm Kế toán), nên người sửa sau không biết phải chạy kịch bản mới.

**Dòng đề xuất:**

```
| Tiền của đơn huỷ (ADR-0089 đ9c, NT-V7; TNV-G1): khối «Thu trước của đơn huỷ» và dòng thu trước ở «Cần xem lại» của Trang chủ Kế toán (`src/shared/thu-truoc-hien-thi.ts`, `taiThuTruoc` / `layCoc` của `web/home.ts`, `#dash-thu-truoc` của `public/index.html`), dòng «Đã trả lại khách trước khi huỷ» / «Đã hoàn trả» của `khoiCoc` ở `web/order.ts`, loại tin `duyet_hoan` của `web/thong-bao-ui.ts` | `thu-truoc-smoke.mjs` ở `docs/evidence/2026-10-28-dong-tnv-g1/kich-ban/` (5 bước, 1040 + 390, cần `AXE_JS`, không cần mạng ngoài; axe bỏ riêng `#strips` — nợ có sẵn `.mfa-strip`) + `coc-don-huy-smoke.mjs` ở `docs/evidence/2026-10-05-nam-loi-tien/kich-ban/` (đặt `OUT=` để không ghi đè ảnh 5/10) + `trang-chu-smoke.mjs` |
```

**Được / mất:** được — người sửa Trang chủ hay trang đơn huỷ biết chạy đúng kịch bản; mất — bảng dài thêm một dòng. Không đổi nghĩa dòng nào đang có.
