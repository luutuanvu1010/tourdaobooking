# Sổ thi công Đợt V1 — khắc phục kiểm theo vai (2026-10-03)

> Lộ trình: `2026-10-03-khac-phuc-kiem-theo-vai-00-lo-trinh.md` mục 3. Vai phiên: **thi công** (không tự nghiệm thu — N8). Worktree `.claude/worktrees/v1`,
> nhánh `claude/blissful-goodall-qs20d6` (đã nhập 3 commit tài liệu của nhánh `claude/adoring-heisenberg-6vusxz` — bản báo cáo + lộ trình — bằng fast-forward).
> Không push, không deploy. Phạm vi cứng giữ: không chạm `src/modules/orders`, `src/modules/billing`, `migrations/`, `src/shared/permissions.ts`, `MA_GIU`.

## Việc

| # | Commit | Đỏ trước | Xanh sau | Kiểm độc lập |
|---|---|---|---|---|
| V1.1 HT-24 | `9d57f418` | `tien-do-man.test.ts` ca HT-24 (trả `[[],[],[]]`) | ✓ | — (không phải việc lớn) |
| V1.2 HT-01 | `29be5435` | `thu-tu-diem.test.ts`, `dieu-phoi-route.test.ts` (tắt `sapLaiDiem` → 3/4 đỏ), `dieu-phoi-lich-chung.test.ts` ca `TRA_TRUOC_DON`, e2e `dieu-phoi` ca (9) | ✓ | **🔍 ĐẠT** (người kiểm độc lập chỉ đọc, 3/10 — xem dưới) |
| V1.3 HT-03 | `59782d3a` | `xac-nhan-xuat-ben.test.ts`, `vn-date.test.ts` ca `ngayCoThu` | ✓ | — |
| V1.4 Kiểu A | `66f7a6f6` | `xac-nhan-tien-do.test.ts` | ✓ | — |
| V1.5 Kiểu D | `b95b15f4` | `vn-date.test.ts`, `src/ngay-mot-ham.test.ts`, `src/thanh-hanh-dong-cuoi.test.ts` (gỡ lớp → đỏ), `src/shared/pham-vi-so.test.ts`, `dieu-phoi-man.test.ts` ca qua giao thừa | ✓ | — |

## Giả định đã tự đưa (bề mặt, đảo ngược được — ghi theo CLAUDE.md §3)
- V1.1: chuyến đang chạy có ngày SAU ngày kia (xuất bến sớm) cũng vào "Hôm nay" — không chỉ ngày < hôm nay.
- V1.2: áp `sapLaiDiem` cho cả lệnh **dời** (chuyến đích) và **cập nhật điểm theo đơn** — cùng hàm dựng điểm `diemChoKhoa` nên cùng lỗi (lộ trình chỉ ghi `lenhXepLo`). Cảnh báo dùng kênh cảnh báo lịch chung (`TRA_TRUOC_DON`) vì `canhBaoXep` mang mã `MA_GIU` (cấm thêm).
- V1.3: hộp đóng ngay khi bấm xác nhận rồi gửi qua `chay` cũ (giữ đường "Chưa gửi được — Bấm lại").
- V1.4: "Đã tới" điểm đón giữ một chạm (lộ trình loại trừ); dòng "Vừa ghi" không kèm giờ.
- V1.5: nhãn tuần "Lịch xe bận" giữ đúng bản vẽ ("28/12 – 03/01/2027"); `ngayNgan` thiếu tham chiếu (chỉ bài thử cũ ngoài tsc) trả "dd/mm"; chữ nút hộp rút ngắn sau kiểm Chrome ("Vẫn xuất bến", "Vẫn ghi đã tới").

## Kiểm độc lập V1.2 (3/10) — ĐẠT, không phát hiện CAO / VỪA
Người kiểm chạy trong worktree tạm đúng `29be5435`: test 198/198, typecheck 0 lỗi, `npm test` xanh; ba lần phá có chủ ý đều đỏ (vô hiệu `sapLaiDiem`; vô hiệu
chọn điểm đủ điều kiện; đổi gác `loDoi` sang chuyến nguồn → `thu-tu-lo.test.ts` đỏ); e2e chuẩn 503 (Turnstile bị chặn), bản sao tạm tắt Turnstile 4/4 xanh.
Phát hiện NHỎ (nợ, chưa làm):
- N-V1-1: chưa có ca e2e đi qua lệnh **dời** và **cập nhật điểm** với nơi trả chung (chỉ test đơn vị + mẫu thứ tự lô).
- N-V1-2: dải nhắc `TRA_TRUOC_DON` ở `/chuyen` chưa có bước Chrome riêng (v1-smoke không dựng chuyến cũ sai thứ tự).
- Ghi chú: khi xếp đơn mới, chuyến cũ vốn sai thứ tự được sửa luôn (cả điểm của đơn khác) — đúng yêu cầu; nhật ký ghi số điểm đổi.

## Nợ / chưa làm khác
- E2E chuẩn chưa chạy được ở phiên này (mạng chặn Turnstile) — chạy lại `npm run test:e2e -- dieu-phoi tai-xe-cuoc van-chuyen` trên máy có mạng.
- Nút "Hỗ trợ" nổi vẫn có thể che MÉP một nút GIỮA danh sách khi chưa cuộn tới cuối (ảnh `4a`, nút "Đã trả") — V1.5a chỉ xử lý thanh / khối nút CUỐI trang
  như lộ trình ghi; muốn né mọi nút cần quyết thiết kế (chủ).
- Bảng "Sửa tệp nào thì chạy lại kịch bản Chrome nào" ở `web/CLAUDE.md` chưa có dòng cho `v1-smoke.mjs` — tệp luật, chỉ được ĐỀ XUẤT (N9) → gộp vào V7.
- Ba luật giao diện mới (ngày qua một hàm; số khác phạm vi phải có nhãn; thanh cuối trang mang lớp chung) mới nằm ở `docs/CHANGE-GUIDE.md` bẫy 59 — đưa vào
  `web/CLAUDE.md` là việc V7 (chủ duyệt).
