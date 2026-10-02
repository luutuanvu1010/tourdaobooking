# Khắc phục kiểm toán 1–2/10 — Lộ trình thi công (2026-10-02)

> **Nguồn:** `docs/superpowers/specs/2026-10-02-khac-phuc-audit-goc-va-phuong-an.md`. Tài liệu đó kiểm lại hai cuộc đánh giá, chốt 8 gốc R1–R8 và nêu phương án.
>
> **Vai:** phiên này **lập kế hoạch**. Mỗi đợt thi công ở **phiên riêng**, worktree riêng, có **người kiểm độc lập** sau mỗi phần việc lớn (Hiến pháp N8, P15; CLAUDE.md §3).
>
> **Kế hoạch con chi tiết** (task, đỏ → xanh):
> - Đợt 0: `2026-10-02-khac-phuc-audit-01-dot-0-chong-ghi-trung-quyen-tien.md`
> - Đợt 1: `2026-10-02-khac-phuc-audit-02-dot-1-don-huy-coc.md`
> - Các đợt sau: kế hoạch con lập khi điều kiện "cần chủ" được gỡ.

## 1. Các đợt và thứ tự

| Đợt | Gốc | Việc | Căn cứ | Hạn sổ dừng dây chuyền | Điều kiện bắt đầu | Thời lượng ước |
|---|---|---|---|---|---|---|
| **0** | R1, R5a | Lớp chống ghi trùng chung (bản mở rộng) + quyền tiền chỉ Toàn quyền | ADR-0094, ADR-0090 (accepted) | **F-02: 15/10** | Không. **Bắt đầu ngay.** Chủ đặt khoá HMAC **trước** khi triển khai | lớn |
| **1** | R3 (+R4e phần máy chủ) | Đơn huỷ và cọc: "còn lại" = 0, hoàn hai bước, hạn 60 ngày, chuyển tiền, đơn cũ hoàn tay; route + ô đếm cho Kế toán | ADR-0089 (accepted) | **TNV-G1: 15/10** | Đợt 0 xong phần router (mọi lệnh ghi mới đi qua lớp vé) | lớn |
| **2** | R2 | (c) F-03: `subtotal = Σ line_total` ở CSDL + một hàm tính dòng; (d) kiểm sổ tiền mới trong `audit-invariants` + sổ vàng chạy trên mã sổ; (a) ADR-0088; (b) ADR-0092 | (c), (d): luật cũ 5.1, 5.4, 4.2, 5.17. (a), (b): **proposed** | F-03, TNV-G3, TNV-G4: **31/10** | (c), (d): sau Đợt 1. (a), (b): **chủ "Duyệt" ADR-0088 + ADR-0092** | lớn |
| **3** | R5b–d, R6 | PIN tạm; một cờ "đang hoạt động" (D4); xác thực hai lớp; đơn Đối tác đúng bên đặt | ADR-0093 (**proposed**), ADR-0013, ADR-0074, ADR-0077 đ3 (accepted) | — | ADR-0093: **chủ "Duyệt"**. Phần còn lại không chờ | vừa–lớn |
| **4** | R4a–d | HDV "Từ chối"; báo tin khi đơn đổi; nhắc gọi khách khi giờ hẹn đổi; ngưng tài khoản thì giữ và hiện đơn, tiền đang giữ | ADR-0030 lượt 2, ADR-0062, ADR-0051 (accepted); ADR-0013 + Hiến chương 5.7 | — | Không chờ, trừ QT06 (sửa địa điểm làm đổi chặng tương lai): **cần chủ** | lớn |
| **4b** | R4e | Màn sổ Kế toán (cần hoàn, đơn huỷ giữ cọc, sự cố tiền) | ADR-0089 đ9c | — | **Bản vẽ Claude Design** của chủ | vừa |
| **5** | R7 | Sao lưu ra ngoài Cloudflare theo lịch, diễn tập khôi phục có biên bản, sửa cửa khẩn cấp `create-staff` dùng `--command`, chốt "luôn còn một Toàn quyền" | đặc tả `2026-09-22-dien-tap-khoi-phuc.md` (**bản thảo**) | — | **Chủ duyệt đặc tả 22/9** (nơi lưu bản sao, ai giữ khoá). Phần sửa cửa khẩn cấp và chốt Toàn quyền làm được ngay | vừa |
| **6** | R8 | Câu xác thực theo khoá (không quét bảng), phân trang hộp thông báo, bỏ N+1 "Việc của tôi", Bảng tin nối lại chỉ tải phần thiếu; câu xác thực vào `query-plan.test.mjs` | Không cần ADR | — | Sau Đợt 0 (router đổi) | vừa |
| **7** | G12 | Câu báo lộ mã tiếng Anh, tìm đơn không dấu và SĐT chuẩn hoá, sửa các câu báo sai | Việc nhỏ | — | Bất kỳ lúc nào | nhỏ |

**Song song được:**
- Đợt 5 (phần không chờ) và Đợt 7 chạy song song với Đợt 0–1, khác vùng mã.
- Đợt 6 chờ Đợt 0, vì cùng chạm router.
- Đợt 3 và 4 sau Đợt 1, để tránh đụng `orders` và `billing` cùng lúc.

**Cần chủ quyết** (không phải câu "nên đồng ý"):
- (i) "Duyệt" ADR-0088 + ADR-0092 (Đợt 2a, 2b);
- (ii) "Duyệt" ADR-0093 (Đợt 3);
- (iii) QT06: sửa tên hay địa chỉ một điểm đón có giữ chuyến và nhắc gọi khách không;
- (iv) KT07 (tự thu tự nộp) và đơn 0 đồng tự xác nhận (02/03): có cần người thứ hai không;
- (v) duyệt đặc tả sao lưu và diễn tập 22/9;
- (vi) bản vẽ màn sổ Kế toán.
- **G10** (trẻ em tại bến, năm sinh / loại khách) cũng cần quyết; xếp sau Đợt 4.

## 2. Bảng truy vết: lỗi → gốc → đợt → cách chứng minh đã hết
Cột "Chứng minh" là **tiêu chí nghiệm thu**. Mỗi dòng phải có bài **đỏ trước** (tái hiện lỗi) rồi **xanh sau**, và chạy lại kịch bản gốc.

| Lỗi / phát hiện | Gốc | Đợt | Chứng minh đã hết |
|---|---|---|---|
| 11 (2 đơn khi gửi lặp), 13 (2 hồ sơ), redteam R1/R2 | R1 | 0 | ADR-0094 T2, T3, H1; redteam R1/R2 đổi từ FINDING sang PASS; e2e trong `tests/e2e/` gắn cùng vé |
| 12, HD10 (thu lặp), KT03 (hoàn lặp), KT04 (nộp lặp) | R1 | 0 | ADR-0094 T1, T4 (hai lần thu thật vẫn ra 2 dòng), T12; kịch bản 12, HD10, KT03, KT04 chạy lại |
| 15 (đồng thời) | R1 | 0 | H1 ca "đồng thời ⇒ 1 dòng" |
| QT04 (Quản trị đặt lại PIN Kế toán, đăng nhập thay) | R5a | 0 | ADR-0090: Quản trị đặt lại PIN / gán quyền tiền / tạo tài khoản tiền ⇒ 403; kịch bản QT04 chạy lại |
| GD-P-01 phần quyền tiền | R5a | 0 | như trên |
| 09, 26, HD06, QT05, KT01, DT04 (đơn huỷ còn "còn lại") | R3 | 1 | ADR-0089 đ1, đ9: sổ trả còn lại 0; biên nhận là "thông báo huỷ" không có dòng "Còn lại"; ca sổ vàng khách huỷ giữ cọc |
| 09, 26 (ghi lần thu vào đơn huỷ ⇒ 201) | R3 | 1 | đ13: Bán hàng/HDV ⇒ 409; Kế toán/Toàn quyền ⇒ 201 |
| HD08 (huỷ nhận = huỷ đơn khách) | R4a (+R3 phần tiền) | 4 (+1) | ADR-0030 lượt 2 "Từ chối" trả đơn về kho; đơn khách không đổi trạng thái |
| 30, KD06, DT05, 49 (sửa sai sau Đã giao) | R2a | 2 | ADR-0088: "Thay lần thu" ghi lại được; I1 đúng mọi lúc; Hoàn thành bị chặn khi còn thiếu |
| KT06 (đã thu âm), KT04 (số dư âm), KT05, KT09, 42 | R2b | 2 | ADR-0092: trigger không đổi dấu + máy chủ; trần điều chỉnh; R-BIL-13 mức lỗi |
| KT02 (hai người khai cùng một chuyển khoản) | R2b | 2 | ADR-0092 đ6 mã giao dịch; cảnh báo khác đơn |
| KT10 (`audit-invariants` thoát 0 khi sổ âm) | R2d | 2 | kiểm R-BIL mới đỏ trên dữ liệu sai (D1 tạm) ⇒ thoát 1 |
| F-03, GD-B-02, redteam D1/D2 (SQL sửa tiền đơn đã xác nhận) | R2c | 2 | trigger `subtotal = Σ line_total`; redteam D1/D2 sang PASS |
| Cảnh báo thu tiền mặt giống nhau (CT3/CT4) | R2b | 2 | ADR-0092 đ6a: 409 "có thể trùng" + "Vẫn ghi" có lý do |
| D4 (hồ sơ ngưng vẫn đăng nhập) | R5d | 3 | redteam D4 sang PASS; đăng nhập ⇒ 401/403 |
| GD-P-01 phần PIN (người đặt biết PIN dùng lâu dài) | R5b | 3 | ADR-0093: PIN tạm phải đổi ở lần đăng nhập đầu |
| GD-S-01 (dò PIN) | R5c | 3 | ADR-0074 tiêu chí |
| 45, DT02, GD-A-01 (đơn Đối tác sai bên đặt) | R6 | 3 | ADR-0077 đ3: bên đặt = hồ sơ Đối tác, `CUSTOMER_OF`; kịch bản 45, DT02 |
| KD08, DT08, 39, KD01, 34 (đổi giờ/điểm không tới người cần biết) | R4b, R4c | 4 | ADR-0062, ADR-0051: giữ chuyến, tin tài xế/đối tác, nhắc gọi khách; ảnh xác nhận in đủ chặng |
| QT06 (sửa địa điểm im lặng) | R4 | 4 | **cần chủ** trước |
| HD09, QT03, KD09, DT09 (ngưng tài khoản đang giữ đơn/tiền) | R4d | 4 | ngưng ⇒ đơn và tiền hiện ở danh sách "cần chuyển"; không im lặng |
| HD01, HD02 (đổi người phụ trách im lặng, ghi đè) | R4b | 4 | tin cho HDV bị đổi; lệnh nhận có điều kiện phiên bản |
| KT01, KT08, KD02/03 (Kế toán không thấy sự cố tiền) | R4e | 1 (máy chủ) + 4b (màn) | route danh sách + ô đếm Trang chủ Kế toán (Đợt 1); màn theo bản vẽ (4b) |
| GD-R-01, R-02, R-06, cửa khẩn cấp | R7 | 5 | sao lưu chạy theo lịch có bằng chứng; biên bản diễn tập; `create-staff` chạy được bằng `--command` trên D1 tạm |
| GD-L-01, L-02, L-03, L-05, L-07, L-15 | R8 | 6 | `EXPLAIN` không còn SCAN ở câu xác thực (bài `query-plan`); số truy vấn mỗi request đếm được giảm |
| 08, 16, 05, 22–24, 14, 50, GD-D-02 (câu báo) | G12 | 7 | kịch bản chạy lại; không còn mã tiếng Anh lộ ra |
| 10 (tìm hụt khi gõ không dấu) | G12 | 7 | tìm không dấu, `+84`, 6 số cuối ra đúng đơn |

**Nằm ngoài lộ trình này (đã có quyết định hoặc cần quyết):**
- G10 (HD03, HD05, DT10, 06): cần chủ.
- G11 (04, KD04, QT01): đúng ADR-0027, chỉ cần thông báo rõ cho Bán hàng → Đợt 7.
- 17 (cảnh báo đơn trùng): đặc tả `canh-bao-don-trung` chờ chủ.

## 3. Cổng "xong" cho cả chương trình
1. Mọi dòng bảng truy vết có bài đỏ → xanh và kịch bản gốc chạy lại đạt. Riêng dòng "cần chủ" ghi rõ là chưa làm.
2. Chạy lại **toàn bộ 100 tình huống** trên bản thử. Kết quả so với `docs/superpowers/specs/2026-10-02-khac-phuc-audit/kiem-lai-ux.md`: dòng thuộc đợt đã làm phải chuyển sang ĐÃ HẾT.
3. Các mục F-02, TNV-G1, F-03, TNV-G3, TNV-G4 trong `docs/quyen-hoan.json` được **đóng** (xoá mục kèm dòng lịch sử), không phải gia hạn.
4. Mỗi hàng rào mới có dòng ở `docs/SO-HANG-RAO.md` với ngày quan sát chặn thật.
5. Người kiểm độc lập ký từng đợt.
