# Checklist khắc phục kiểm toán 1–2/10 — từ giờ tới khi xong nhiệm vụ

> **Mục đích** (lời chủ 2026-10-02): *"trước khi thi công thì chúng ta lên checklist toàn bộ kế hoạch sẽ làm cho đến khi hết nhiệm vụ"*.
>
> **Cách dùng:**
> - Mỗi phiên thi công **đánh dấu `[x]`** việc của mình trong tệp này, cùng commit với việc đó, kèm mã commit hoặc ngày.
> - Không đánh dấu việc chưa có bằng chứng: test xanh, người kiểm độc lập ĐẠT, GET công khai sau triển khai.
>
> **Nguồn chi tiết:**
> - lộ trình + bảng truy vết: `2026-10-02-khac-phuc-audit-00-lo-trinh.md`;
> - Đợt 0: `…-01-dot-0-chong-ghi-trung-quyen-tien.md`;
> - Đợt 1: `…-02-dot-1-don-huy-coc.md`;
> - gốc và phương án: `docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md`.
>
> **Ký hiệu người làm:**
> - 🤖 AI thi công (phiên riêng, worktree riêng);
> - 🔍 người kiểm độc lập (chỉ đọc, phiên khác — Hiến pháp N8);
> - 👤 chủ dự án.
>
> **Mỗi lần lên production, đủ bộ:**
> - 🤖 mục nhật ký thay đổi (bước A.0);
> - 👤 `npm run day-len -- <nhánh>`;
> - 👤 `npm run trien-khai` (tự làm: cổng chỉ-đọc, kiểm phiên bản, điểm khôi phục, test + e2e, migration, deploy, `audit-invariants --db remote`, kiểm sau deploy);
> - 🤖 ghi trạng thái vào `docs/HANDOFF-N1.md`.
>
> Dưới đây viết gọn là **"🚀 phát hành"**.

## 0. Đã xong (lập kế hoạch, 2/10)
- [x] Kiểm lại hai cuộc đánh giá trên `main` (kiến trúc 8/9 CAO xác nhận; 100/100 tình huống chạy lại, 59 dòng vẫn lỗi)
- [x] Chốt 9 nguyên nhân gốc R1–R9; phương án theo Hiến chương và ADR đã duyệt
- [x] Lộ trình 8 đợt + bảng truy vết; kế hoạch chi tiết Đợt 0, Đợt 1
- [x] Người kiểm độc lập đối chiếu kế hoạch hai vòng: ĐẠT
- [x] 👤 Duyệt ADR-0094 (lớp chống ghi trùng); đồng ý (a)–(f)
- [x] 👤 Đặt khoá `LAN_GUI_SECRET` trên production (2/10)
- [x] 👤 Quyết gia hạn TNV-G1 tới 31/10 ("dữ liệu chỉ là demo")
- [ ] 👤 `npm run day-len -- gia-han-tnv-g1` (gộp toàn bộ kế hoạch + gia hạn; không cần triển khai)

## 1. Đợt 0 — chống ghi trùng chung + quyền tiền (hạn F-02: **15/10**; mục tiêu triển khai **13/10**)
Hai luồng song song, mỗi luồng một phiên.

**Luồng Q — quyền tiền chỉ Toàn quyền (ADR-0090), không cần chờ gì**
- [x] 🤖 Q0 kiểm kê, mở sổ thi công
- [x] 🤖 Q1 một hàm "có quyền tiền" suy từ bảng quyền
- [x] 🤖 Q2 cổng máy chủ ba cửa (đặt lại PIN, gán vai/quyền tiền, tạo tài khoản tiền); `ACCOUNTANT.superAdminOnly` (**không** thêm vào `SUPER_ADMIN_GRANTED`)
- [x] 🤖 Q3 cờ theo từng dòng + giao diện ẩn/hiện
- [x] 🤖 Q4 tin "Quản trị ngưng Kế toán" → Toàn quyền (một view, một migration — chủ đồng ý (f))
- [x] 🤖 Q5 e2e QT04 + dòng sổ hàng rào (thấy chặn thật)
- [ ] 🔍 Q6 kiểm độc lập (quyền): ĐẠT
- [ ] 👤 Q7 🚀 phát hành luồng Q

**Luồng L — lớp chống ghi trùng bản mở rộng (ADR-0094), đường găng**
- [ ] 🤖 L0 kiểm kê; **đo lại số migration** (mọi nhánh chưa gộp)
- [ ] 🤖 L1 migration bảng vé + bảng chính sách (gieo 365 ngày), từ điển dữ liệu
- [ ] 🤖 L2 module `lan-gui`
- [ ] 🤖 L3 khoá bí mật ở mọi nơi dựng môi trường (khung thử, e2e, `.dev.vars.example`)
- [ ] 🤖 L4a bộ bọc cơ sở dữ liệu theo từng yêu cầu
- [ ] 🤖 commit bài **đỏ trước** (L5, L11)
- [ ] 🤖 L4b router giai đoạn 1 (có vé thì áp, thiếu vé cho qua và đếm)
- [ ] 🔍 kiểm độc lập vòng 1 → **mở khoá Đợt 1**
- [ ] 🤖 L5 H1 hành vi qua router thật; bài hồi quy có vé trong `src/`
- [ ] 🤖 L6 H2 phủ route + tệp miễn
- [ ] 🤖 L7 `Location` cho route 201 + H7
- [ ] 🤖 L8 mô-đun vòng đời vé + H4 (không nuốt lần ghi thật thứ hai)
- [ ] 🤖 L9 `web/api.ts` gửi vé; sửa `dieu-phoi-ui.ts:32`; H3
- [ ] 🤖 L10 e2e tự gắn vé
- [ ] 🤖 L11 T12: kịch bản 11, 12, 13, HD10 (nhánh "Ghi lần thu"), KT03, KT04 **bản có vé** trong `tests/e2e/`
- [ ] 🤖 L12 H5 đo ghi nhiều lần; trả nợ `demThanCu` (T17)
- [ ] 🤖 L13 cổng kiểm khoá trong `npm run trien-khai`
- [ ] 🤖 L14 tài liệu (`SYSTEM-DESIGN`, `CHANGE-GUIDE`, sổ hàng rào)
- [ ] 🔍 L15 kiểm độc lập vòng 2: ĐẠT (nếu tới **12/10** chưa đạt → báo chủ)
- [ ] 👤 L16 🚀 phát hành luồng L (khoá đã có; cổng L13 xác nhận)
- [ ] 🤖 chạy lại T12 trên bản thử sau phát hành → **xoá mục F-02** khỏi sổ (đóng theo A-9) + dòng lịch sử
- [ ] 👤 gộp commit đóng F-02 (không cần triển khai)

**Để sau (A-11), trước ngày thứ 90 kể từ luồng L:**
- [ ] 🤖 màn "Thời hạn giữ vé" (Toàn quyền) + Cron dọn + ngoại lệ xoá cứng có tên + H8, H10, T7–T11 → 🔍 → 👤 🚀

**Bản siết** (thiếu vé thì trả 400), khi mọi người đã đăng nhập bằng bản mới và 7 ngày liên tiếp không còn lệnh thiếu vé:
- [ ] 🤖 bật siết; redteam R1/R2 và kịch bản gốc **không vé** chuyển PASS → 🔍 → 👤 🚀

## 2. Đợt 1 — đơn huỷ và cọc (ADR-0089; hạn TNV-G1: **31/10**)
Bắt đầu khi luồng L qua kiểm vòng 1.
- [ ] 🤖 Task 0 cổng bắt đầu (Đợt 0 đã gộp; đo lại tệp:dòng, số migration)
- [ ] 🤖 Task 1 sổ vàng 13 ca (dữ liệu)
- [ ] 👤 gửi Kế toán xác nhận 13 ca sổ vàng *(chạy song song, chặn việc đóng TNV-G1)*
- [ ] 🤖 Task 2 luật tiền đơn huỷ một nơi (`conLai` nhận cờ huỷ; "tiền còn giữ lúc huỷ" — chủ đồng ý (c))
- [ ] 🤖 Task 3 luật lý do huỷ và nhãn tiền
- [ ] 🤖 Task 5 migration A (lý do huỷ, gieo đơn cũ)
- [ ] 🤖 Task 6 huỷ có lý do (hai đường), phân loại, chặn ghi thu lên đơn huỷ ("không liên hệ được khách" = khách huỷ — (a))
- [ ] 🔍 kiểm độc lập vòng 1
- [ ] 🤖 Task 7 migration B + trigger
- [ ] 🤖 Task 8 duyệt / huỷ duyệt / chi hoàn
- [ ] 🤖 Task 9 chuyển tiền sang đơn mới
- [ ] 🤖 Task 10 hoàn ngoài hệ thống hai bước (Toàn quyền ghi, Quản trị xác nhận; bị từ chối thì ghi lại — X-4, (b)) + danh sách + ô đếm
- [ ] 🤖 Task 11 tin "Đã duyệt hoàn cọc" cho Kế toán
- [ ] 🤖 Task 12 `audit-invariants` R-BIL-C0…C6, R-ORD-H1 + sổ hàng rào H-C1…C9
- [ ] 🔍 kiểm độc lập vòng 2
- [ ] 🤖 Task 13 nhãn tiền, ảnh thông báo huỷ, điều khoản kèm đường dẫn, nút trên trang đơn, ô đếm; chạy các kịch bản Chrome
- [ ] 🔍 kiểm độc lập vòng 3
- [ ] 👤 🚀 phát hành Đợt 1; báo nhân viên "huỷ đơn nay bắt chọn lý do"
- [ ] 🤖 chạy lại kịch bản G1 (09, 26, HD06, HD08, QT05, DT04, KT01) bản có lý do huỷ → **xoá mục TNV-G1** khỏi sổ
- [ ] 👤 gộp commit đóng TNV-G1
- [ ] *(việc riêng sau Đợt 1, chủ đồng ý (d))* 🤖 luồng duyệt "giảm giá bù chênh khi dời lịch"

## 3. Đợt 2 — sổ tiền (hạn F-03, TNV-G3, TNV-G4: **31/10**)
- [ ] 👤 **"Duyệt" ADR-0088 + ADR-0092** — chặn phần (a), (b)
- [ ] 🤖 lập kế hoạch con Đợt 2 → 🔍 đối chiếu
- [ ] 🤖 (c) F-03: `subtotal = Σ line_total` ở CSDL + một hàm tính dòng; redteam D1/D2 PASS
- [ ] 🤖 (d) kiểm sổ tiền mới trong `audit-invariants`; sổ vàng chạy trên mã sổ (KT10)
- [ ] 🤖 (a) ADR-0088: "Thay lần thu", I1 đúng mọi lúc (30, KD06, DT05, 49)
- [ ] 🤖 (b) ADR-0092: không đổi dấu, trần điều chỉnh, mã giao dịch ngân hàng, cảnh báo thu tiền mặt giống nhau (KT02, KT04, KT05, KT06, KT09, 42)
- [ ] 🔍 kiểm độc lập → 👤 🚀 → 🤖 đóng F-03, TNV-G3, TNV-G4 (hoặc 👤 gia hạn có lý do)

## 4. Đợt 3 — danh tính và quyền
- [ ] 👤 **"Duyệt" ADR-0093** (PIN tạm) và **ADR-0091** (phá lệ mốc 6 giờ, QT02)
- [ ] 🤖 lập kế hoạch con → 🔍
- [ ] 🤖 PIN tạm (GD-P-01 phần PIN)
- [ ] 🤖 tài khoản trỏ hồ sơ ngưng: không đăng nhập, cắt phiên (D4) — **cùng hoặc sau** Đợt 6 phần câu xác thực
- [ ] 🤖 xác thực hai lớp (ADR-0074, GD-S-01)
- [ ] 🤖 đơn Đối tác đúng bên đặt + `CUSTOMER_OF` (ADR-0077 đ3; 45, DT02)
- [ ] 🤖 GD-P-02, DT06 (không lộ tồn tại / tên); GD-S-03 (nhật ký đăng nhập sai, xuất dữ liệu)
- [ ] 🤖 phá lệ mốc 6 giờ cho Bán hàng có nhãn (ADR-0091)
- [ ] 🔍 → 👤 🚀

## 5. Đợt 4 — đưa thông tin tới đúng người + phiên bản cho lệnh trạng thái
- [ ] 👤 quyết QT06 (sửa địa điểm làm đổi chặng tương lai)
- [ ] 🤖 lập kế hoạch con → 🔍
- [ ] 🤖 HDV "Từ chối" trả đơn về kho (ADR-0030 lượt 2; 29, HD08)
- [ ] 🤖 báo tin khi đơn đổi sau xác nhận (ADR-0062; KD08, DT08, 39, KD01, 34, HD01, KT08)
- [ ] 🤖 nhắc gọi báo khách khi giờ hẹn đổi (ADR-0051)
- [ ] 🤖 ngưng tài khoản / hồ sơ đang giữ đơn, tiền, đang là bên đặt → giữ + hiện lý do (HD09, QT03, KD09, DT09, redteam R3d)
- [ ] 🤖 R9: lệnh đổi trạng thái mang phiên bản đã thấy (15, GD-A-02, HD02)
- [ ] 🔍 → 👤 🚀

## 6. Đợt 4b — màn sổ Kế toán
- [ ] 👤 vẽ màn trên Claude Design (cần hoàn, đơn huỷ giữ cọc, sự cố tiền)
- [ ] 🤖 dựng đúng bản vẽ (KT01 phần màn, KT08 phần hiển thị, KD02/03) → 🔍 → 👤 🚀

## 7. Đợt 5 — sao lưu và khôi phục
- [ ] 🤖 *(làm ngay được)* sửa cửa khẩn cấp `create-staff` chạy bằng `--command`; chốt "luôn còn một Toàn quyền"
- [ ] 👤 duyệt đặc tả diễn tập 22/9 (nơi lưu bản sao, ai giữ khoá)
- [ ] 👤 đưa **GD-R-01** (không sao lưu ngoài) và **G6** (đơn Đối tác sai bên đặt) vào sổ dừng dây chuyền, với hạn do chủ đặt
- [ ] 🤖 sao lưu ra ngoài Cloudflare theo lịch, có bằng chứng
- [ ] 👤 + 🤖 diễn tập khôi phục trên D1 tạm, có biên bản
- [ ] 🔍 → 👤 🚀

## 8. Đợt 6 — tốc độ (sau luồng L của Đợt 0)
- [ ] 🤖 lập kế hoạch con → 🔍
- [ ] 🤖 câu xác thực không quét bảng (kể cả route Face ID) + đưa vào `query-plan.test.mjs`
- [ ] 🤖 hộp thông báo phân trang; bỏ N+1 "Việc của tôi"; Bảng tin nối lại chỉ tải phần thiếu
- [ ] 🤖 bộ nhớ đệm đọc công khai; service worker không gọi API mỗi lần đẩy; giới hạn danh sách đơn chờ; đồng hồ đo route
- [ ] 🤖 giới hạn tần suất ở route tạo đơn, hồ sơ, thu (GD-S-02, DT07)
- [ ] 🔍 → 👤 🚀

## 9. Đợt 7 — câu báo và việc nhỏ (bất kỳ lúc nào)
- [ ] 🤖 bỏ mã tiếng Anh khỏi câu báo; tìm đơn không dấu và SĐT chuẩn hoá; sửa câu báo sai (05, 08, 10, 14, 16, 22–24, 50, GD-R-08)
- [ ] 🤖 HDV có lối vào danh sách đơn (GD-D-01); báo Bán hàng khi nháp giữ giá cũ (KD04)
- [ ] 🤖 đề xuất diff luật thêm module thiếu (GD-B-06) → 👤 duyệt
- [ ] 👤 🚀

## 10. Quyết định còn chờ chủ (không chặn Đợt 0, Đợt 1)
- [ ] (i) "Duyệt" ADR-0088 + ADR-0092 → Đợt 2
- [ ] (ii) "Duyệt" ADR-0093 + ADR-0091 → Đợt 3
- [ ] (iii) QT06 → Đợt 4
- [ ] (iv) KT07 (tự thu tự nộp), đơn 0 đồng tự xác nhận (02/03): cần người thứ hai không
- [ ] (v) đặc tả sao lưu và diễn tập 22/9 → Đợt 5
- [ ] (vi) bản vẽ màn sổ Kế toán → Đợt 4b
- [ ] (vii) GD-R-01 và G6 vào sổ dừng dây chuyền
- [ ] (viii) KD05: siết việc sale khác "Nhận" đơn chưa có người phụ trách?
- [ ] (ix) KD07: đổi bên đặt của đơn đã cọc thì cọc theo ai, hoàn cho ai
- [ ] (x) ADR-0065 (số khách đi xe, GD-B-01)
- [ ] G10: trẻ em tại bến, đối chiếu năm sinh với loại khách

## 11. Cổng "XONG NHIỆM VỤ"
- [ ] Mọi dòng bảng truy vết của lộ trình có bài đỏ → xanh; kịch bản gốc chạy lại đạt; dòng "cần chủ" ghi rõ là chưa làm
- [ ] 🤖 chạy lại **toàn bộ 100 tình huống** trên bản thử; mọi dòng thuộc đợt đã làm chuyển sang ĐÃ HẾT (so `docs/superpowers/specs/2026-10-02-khac-phuc-audit/kiem-lai-ux.md`)
- [ ] 🤖 đánh giá kiến trúc: mọi phát hiện CAO/TRUNG BÌNH đã xác nhận có trạng thái "đã vá" hoặc "chủ chấp nhận"
- [ ] Sổ dừng dây chuyền: F-02, TNV-G1, F-03, TNV-G3, TNV-G4 (và GD-R-01, G6 nếu thêm) **đã đóng**
- [ ] Mỗi hàng rào mới có dòng `docs/SO-HANG-RAO.md` với ngày thấy chặn thật
- [ ] 🔍 người kiểm độc lập ký báo cáo kết thúc chương trình
- [ ] 🤖 cập nhật `docs/SYSTEM-DESIGN.md` §14 và `docs/HANDOFF-N1.md` "Việc còn treo": chương trình ĐÃ XONG
