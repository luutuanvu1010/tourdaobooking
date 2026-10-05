# Sổ thi công — năm lỗi tiền (TNV-G1, F-03, TNV-G3, TNV-G4, TNV-VP01), 2026-10-05

- **Lệnh:** chủ dự án 2026-10-05 ("sửa năm lỗi tiền trước 31/10"); tệp giao việc `~/Documents/kiem-toan-danh-muc/2026-09-28/PROMPT-crm-nam-loi-tien.md`.
- **Kế hoạch:** lộ trình `2026-10-02-khac-phuc-audit-00-lo-trinh.md`; Đợt 1 `2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md`; V2 `2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` §4; checklist `2026-10-02-khac-phuc-audit-checklist.md`.
- **Căn cứ chuẩn tắc (accepted):** ADR-0089 (đơn huỷ, cọc), ADR-0088 (Thay lần thu), ADR-0092 kèm Đ2b (sổ không đổi dấu, VP-01). Kế hoạch Đợt 1 §3.2/NT-H2 còn ghi "duyệt ≤ đã trả" — **cũ**; theo ADR-0089 đ4a/đ15 sau lời chủ (c): "≤ tiền còn giữ lúc huỷ".
- **Nhánh / worktree:** `worktree-agent-a705a660a33db03ca` (`.claude/worktrees/agent-a705a660a33db03ca`), đặt về `origin/main` @ `a43480b5`.
- **Vai phiên:** thi công. Không tự nghiệm thu (N8); kiểm độc lập do `nguoi-kiem-doc-lap` (chỉ đọc).
- **Xây trên lỗ đang hở:** TNV-G1, F-03, TNV-G3, TNV-G4, TNV-VP01 (chính là việc vá).

## Mốc (2026-10-05)
- `main` = `origin/main` @ `a43480b5`. Luồng L (ADR-0094) và luồng Q (ADR-0090) đã lên production (1.76, 1.74); F-02 đã đóng ⇒ cổng Task 0 của Đợt 1 đạt.
- Migration lớn nhất trên mọi nhánh (`git log --all --name-only --diff-filter=A -- migrations`): `0077_cam_ket_chang.sql` ⇒ số kế tiếp `0078`. Đo lại ngay trước khi tạo từng tệp và sau lần rebase cuối.
- `npm run typecheck` 0 lỗi; `npm test` 3214 bài (3213 đạt, 1 todo) + bài đo giờ 1/1.

## Quyết định bề mặt tự áp (đảo được)
_(ghi dần)_

## Câu hỏi chờ chủ (tối đa 3)
_(ghi dần)_

## Nhật ký từng mục

### Đợt 1 — Task 2: luật tiền đơn huỷ một nơi (2026-10-05)
- `billing/rules.ts`: `conLai(receipts, phaiThu, trangThai)` — tham số trạng thái **bắt buộc** (H-C8: mọi nơi gọi phải tự trả lời "đơn huỷ chưa"; đơn huỷ ⇒ còn lại 0, dư 0). Thêm `khoanChoXacNhan` (MỘT định nghĩa "Công ty thu – CK chờ xác nhận", nay `tienCuaDon.choXacNhan` cũng gọi nó), `soTienCoc`, `conLaiCuaKhoan`, `hoanNgoaiTrangThai`, `hanHoanCoc`, `kiemDuyet`, `kiemHuyDuyet`, `kiemChi`, `kiemGhiHoanNgoai`, `kiemXacNhanHoanNgoai`, `nhacCoc`.
- **Trần duyệt theo ADR (không theo kế hoạch):** "tiền còn giữ lúc huỷ" = đã trả − lần trả lại khách còn hiệu lực **không gắn khoản duyệt** (sau phát hành đơn huỷ chỉ hoàn qua khoản duyệt — H-C7 — nên lần trả lại không khoản duyệt chính là hoàn trước huỷ; không cần mốc giờ, biểu thức TS và SQL trùng nhau). Đơn huỷ cũ có lần hoàn tự do SAU khi huỷ (trước bản này) cũng bị tính là "đã trả lại" ⇒ trần thấp hơn, an toàn (không duyệt hoàn khoản đã trả khách).
- **Đỏ trước:** `src/modules/billing/coc-don-huy.test.ts` trên `rules.ts` cũ — `does not provide an export named 'conLaiCuaKhoan'`; `src/modules/billing/don-huy-route.test.ts` (NT-1, route thật) trên `service.ts` cũ — trang đơn trả `conLai` 1.500.000. **Xanh:** cả hai; `rules.test.ts`, `so-vang.test.ts` cập nhật tham số (`"confirmed"`).
- `receipt/index.ts`: bỏ dự phòng `conLai: order.total` ⇒ thiếu số tiền trả 503 `money_unavailable` (NT-5).
- Bài chập chờn có sẵn (không do việc này): `src/modules/orders/lich-chung-chang.test.ts` TC-20 đỏ một lần vì chuỗi "1911" trùng ngẫu nhiên trong mã/ngày sinh ra; chạy lại 3/3 xanh.

### Đợt 1 — Task 3: luật lý do huỷ và nhãn tiền (2026-10-05)
- `src/shared/ly-do-huy.ts`: danh sách đóng (mã lưu `KHACH_DOI_Y`, `KHACH_DAT_TRUNG`, `SAI_THONG_TIN`, `THOI_TIET`, `HET_CHO`, `SU_CO_NCC`, `LOI_CONG_TY`, `OTHER`; HDV `KHACH_YEU_CAU`, `KHONG_LIEN_HE`; gieo `LEGACY`), `luaChonLyDo`, `docLyDoHuy` (400/403, ghi chú "Khác" ≤ 300 ký tự, `hasLongDigitRun`), `lyDoHuyCuaHdv` (lời chủ (a): "không liên hệ được" = khách huỷ), `docPhanLoai`. Hàm nhận cờ, không tự hỏi quyền. Kiểu `NhomHuy` một nơi (billing/rules.ts dùng lại).
- `src/shared/nhan-tien.ts`: `nhanTienDaTra` (NT-V1). Thiếu nhóm/hạn thì không đoán "giữ cọc".
- Đỏ trước: `ly-do-huy.test.ts` — `ERR_MODULE_NOT_FOUND` (chưa có tệp); `nhan-tien.ts` viết cùng lượt với bài (đỏ cùng lý do thiếu tệp, không chạy riêng). Xanh 4 + 2 bài.
- **GĐ (bề mặt):** mã lý do dạng chữ hoa không dấu như trên; ghi chú tối đa 300 ký tự.
