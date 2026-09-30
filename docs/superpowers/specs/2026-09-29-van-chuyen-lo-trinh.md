# Phân hệ Vận chuyển — lộ trình và trạng thái (cập nhật 2026-09-30, sau khi bản 1.38 lên production)

> **Muốn biết phân hệ làm gì, ai dùng thế nào, cần chuẩn bị gì trước khi thử:** đọc `docs/VAN-CHUYEN.md`. Tệp này chỉ ghi lộ trình và trạng thái.

- **Loại:** tài liệu MÔ TẢ (không chuẩn tắc, không phải lời duyệt). Tên cũ của tệp giữ nguyên ngày 29/9 để các chỗ trỏ tới không gãy; nội dung là bản 30/9.
- **Nguồn:** trạng thái production `docs/HANDOFF-N1.md` (mục đầu: bản 1.38); mục lục ADR `docs/adr/README.md`; lời chủ `docs/superpowers/specs/2026-09-29-van-chuyen-hoi-dap-dieu-phoi.md` (lần 1–25); bàn giao `docs/superpowers/plans/2026-09-30-van-chuyen-ban-giao-dieu-phoi.md`; nhật ký thi công ADR-0049 mục 10.39, 10.40; kế hoạch sổ tiền `docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md`; `docs/BACKLOG.md`.
- **Tóm tắt một câu:** mọi quyết định (ADR) của phân hệ đã được chủ duyệt; phần "xe, giấy tờ, nhà xe, Bảng điều phối lượt 1" đã chạy trên production bản 1.38, nhưng **chủ quyết chưa dùng Bảng điều phối cho chuyến thật** cho tới khi có màn nhập tên khách (ADR-0047 Phần B, chờ chủ vẽ). Các lượt sau đã duyệt, chưa thi công.

## 1. Bảng trạng thái

| # | Phần | Quyết định (ADR) | Kế hoạch thi công | Thi công | Production |
|---|---|---|---|---|---|
| 1 | **Lượt 1a** — xe, giấy tờ xe, giấy tờ của người, tài xế công ty có tài khoản, danh sách giấy tờ sắp hết hạn | ADR-0040 đã duyệt | có | xong | **1.35** (28/9) |
| 2 | **Nhà xe đối tác + tài xế đối tác** (tài khoản, giấy tờ; chưa dùng chuyến) | ADR-0048 đã duyệt | có | xong | **1.37** (29/9) |
| 3a | **Chặng đưa đón + danh sách hành khách — Phần A** (máy chủ, dữ liệu; màn nhập đơn giữ như cũ) | ADR-0047 đã duyệt | có | xong | **1.38** (30/9) |
| 3b | **ADR-0047 Phần B** — màn nhập chặng đưa đón và tên hành khách (5 màn) | ADR-0047 đã duyệt | có (mục 7 của kế hoạch) | **chưa — chờ chủ vẽ** (`docs/superpowers/specs/2026-09-29-adr-0047-man-hinh-can-ve.md`) | — |
| 3c | **ADR-0047 Phần C** — phát hành 2 (thu hẹp: bỏ hẳn hai ô giờ / điểm đón cũ) | ADR-0047 đã duyệt | có (mục 8 của kế hoạch) | chưa — làm sau Phần B, khi mọi máy đã tải bản có Phần B | — |
| 4 | **Bảng điều phối lượt 1** — chuyến xe, suất, điểm dừng, lịch chung, mốc 6 giờ + "Đặt gấp", cổng xuất bến, "Cuốc của tôi" của tài xế công ty, văn phòng bấm thay, rút / chuyển khách, "Cập nhật khách theo đơn" | ADR-0049 đã duyệt | có | xong, kiểm độc lập ĐẠT (K2a–K2f, K3) | **1.38** (30/9) |
| 5 | **Kernel lượt 1** — giờ xảy ra thật khi văn phòng bấm thay; giữ chuyến khi nơi hẹn đổi + "Cập nhật điểm theo đơn"; cổng xuất bến mặc định Kiểm định + Bảo hiểm TNDS | ADR-0050 đã duyệt | gộp vào kế hoạch phần 4 | xong | **1.38** |
| 6 | **"Đã gọi báo"** — nhắc gọi báo khách khi giờ hẹn đổi sau khi xếp xe | ADR-0051 đã duyệt | gộp vào kế hoạch phần 4 | xong | **1.38** |
| 7 | **Q-L3-B** — tài xế công ty chỉ thấy tên, SĐT liên hệ của khách trong ngày chạy (bấm Xuất bến sớm tối hôm trước không mở) | ADR-0053 D7.2 (đã duyệt); điều phối làm sớm trong lượt 1 | nhật ký ADR-0049 mục 10.39 | xong, kiểm độc lập ĐẠT CÓ ĐIỀU KIỆN (điều kiện đã xử lý) | **1.38** |
| 8 | **Bảng điều phối lượt 2** — nhờ xe khác đón (máy tự xác nhận theo luật), việc văn phòng làm khi xe đang chạy (A-1); cứu hộ chuyển khách, tài xế ghi tên khách chưa có tên (A-1b) | ADR-0052 đã duyệt (30/9) | chưa | chưa | — |
| 9 | **Bảng điều phối lượt 3** — tài xế nhà xe đối tác dùng app cho chuyến, Từ chối, Báo bận (A-2) | ADR-0053 đã duyệt (30/9) | chưa | chưa (riêng Q-L3-B đã làm, dòng 7) | — |
| 10 | **Bảng điều phối lượt 4** — chiều về theo dịch vụ (A-3) | ADR-0054 đã duyệt (30/9) | chưa | chưa | — |
| 11 | **Kernel lượt 2** — lịch xe vào xưởng, giờ lái tối đa (chỉ cảnh báo), số hiệu chuyến bay (B2) | ADR-0055 đã duyệt (30/9) | chưa | chưa | — |
| 12 | **Kernel lượt 3** — cam kết "xe riêng" / số chỗ tối thiểu; mỗi loại giấy tờ xe một bản hiện hành (B3) | ADR-0056 đã duyệt (30/9) | chưa | chưa (phần "một bản giấy tờ hiện hành" — VK3-B — làm được ngay trên `main`) | — |
| 13 | **Tiền xe thuê** — bảng giá thuê theo nhà xe, chi phí chuyến chụp lúc xếp; chưa có giá thì xe thuê không xuất bến (B1; thi công hai bước T1, T2) | ADR-0057 đã duyệt (30/9) | chưa | chưa | — |
| 14 | **Sổ tiền lượt 1** (thu tiền, công nợ — dùng chung với tiền xe thuê) | ADR-0024 đ1–5, ADR-0025, ADR-0026 đã duyệt (29/9) | **có** (`docs/superpowers/plans/2026-09-29-so-tien-luot-1-ke-hoach.md`) | chưa — phiên mới; Task 0 đo lại mã sau khi 1.38 gộp `main`; giữ số migration `0044`, `0045` | — |
| 15 | **Hợp đồng vận chuyển** | để sau (chủ chọn ĐP7); công tắc "Phải có hợp đồng" khoá tắt | — | — | — |

## 2. Thứ tự thi công sau 1.38 (chủ đã chốt 30/9)

1. **ADR-0047 Phần B** (khi có bản vẽ) **và Sổ tiền lượt 1** (phiên mới) — hai việc chạy song song được. Phần B là điều kiện để bắt đầu dùng Bảng điều phối cho chuyến thật.
2. **ADR-0057 tiền xe thuê:** T1 rồi T2 (T2 là "cổng giá": xe thuê chưa có giá không xuất bến).
   - Phần T3 của ADR-0057 (dòng nợ gắn được với chuyến, sửa ADR-0026) phải có trước **Task 3 của sổ tiền** (lời chủ lần 20, Q-T2).
3. **ADR-0052 A-1b** (cứu hộ) và **ADR-0053 A-2** (tài xế đối tác dùng app) — chỉ làm **sau** bản phát hành T2 của ADR-0057.
4. **ADR-0054** (chiều về), **ADR-0055**, **ADR-0056** và **ADR-0052 A-1** — xếp theo điều phối.
5. Hợp đồng vận chuyển: để sau.

Các ADR sau chỉ đòi lượt 1 **gộp `main`** (đã xong), không đòi lên production.

## 3. Việc đang chặn — của chủ dự án

- **Vẽ 5 màn ADR-0047 Phần B** (nhập chặng đưa đón, danh sách hành khách, sửa sau xác nhận) trên Claude Design — chặn việc dùng Bảng điều phối cho chuyến thật.
- **Vẽ các màn của lượt sau** (lời chủ lần 25): V4, V8–V11, V12, V14, V15.
- **Xác nhận bộ ca mẫu xe A/B** (đáp án điều phối mẫu) trước lượt 2.
- **Hỏi luật sư / người chuyên môn:** danh sách hành khách xe hợp đồng (NĐ 158/2024); ghép khách nhiều đơn trên một xe hợp đồng (trước khi chạy chuyến ghép thật); bảng hạng bằng lái ↔ số khách; danh sách giấy tờ xe bắt buộc; con số giờ lái tối đa (Kernel lượt 2).
- **Thử trên iPhone thật** (màn tài xế "Cuốc của tôi") — chưa làm.
- **Thử tài khoản tài xế đối tác thật** trước khi báo nhà xe (lời chủ lần 25).
- **Báo nhân viên quy tắc 6 giờ** (dưới 6 giờ thì chỉ Quản trị / Toàn quyền bấm "Đặt gấp") — chưa kiểm đã báo hay chưa.

## 4. Nợ có tên còn mở

| Mã | Nội dung | Hạn / điều kiện gỡ | Nguồn |
|---|---|---|---|
| L-A1 | "Danh sách nhiều người hơn số khách" chỉ gắn cờ ở máy chủ + câu kiểm định kỳ (số khách sau sửa nằm trong JSON, cơ sở dữ liệu không tự kiểm được) | khi số khách hiệu lực thành cột có kiểu | ADR-0047 |
| L-D1 | Số chỗ mở của một chặng ≤ số người của chặng — cùng gốc L-A1 | như L-A1 | ADR-0049 |
| L-B1 | Đủ tên cho số người lúc xuất bến — cùng gốc L-A1 | như L-A1 | ADR-0049 |
| L-B2 | Hạng, hạn bằng lái; giấy tờ còn hạn tới hết chuyến — kiểm ở máy chủ, không ở cơ sở dữ liệu | chỉ khi chủ nới quy tắc 4 (không đề xuất) | ADR-0049 |
| L-R1 | (sẽ có khi làm ADR-0054) số người chặng về ≤ số khách dịch vụ | như L-A1 | ADR-0054 |
| L-T1 | (sẽ có khi làm ADR-0057) chi phí chuyến chưa có khoá kỳ | cùng hạn với khoá kỳ của sổ công nợ | ADR-0057 |
| N-T1 | (sẽ có khi làm ADR-0057) xe của nhà xe đã thôi hợp tác, nếu được xếp chuyến mới, máy chưa đòi giá | lượt duyệt kế tiếp của tiền xe thuê | ADR-0057 |
| ADR-0047 4c, mục 6, gạch "(Tuỳ chọn)" 4b | tài liệu luật cho màn chặng / hành khách; phát hành 2 | cùng Phần B / Phần C | bàn giao 30/9 mục 7 |
| BACKLOG 5 | Ô ghi chú gõ tự do trong chuyến xe | tạm gác (chủ chọn "Chưa làm") | `docs/BACKLOG.md` |
| BACKLOG 6 | Tài xế mất mạng: máy tự gửi lại thao tác | để lượt sau | `docs/BACKLOG.md` |
| BACKLOG 7 | Việc nhỏ của lượt 1: sắp lại điểm khi chuyến đang chạy (Q-B-15), hạng bằng ở ô chọn tài xế (Q-B-7), huy hiệu "Điều phối xe" (Q-B-10), giờ kết thúc dự kiến ở danh sách cuốc (Q-B-12), lệnh "trả hết" (Q-B-13), câu từ chối giờ khai lùi thiếu số phút (Q-B-17), tên khách theo thứ tự đơn… | để lượt sau | `docs/BACKLOG.md` |
| Tài liệu | dòng `nhat-ky-loc-smoke` ở `web/CLAUDE.md`; vế 8b ở dòng Trạng thái `docs/ARCHITECTURE.md`; `docs/adr/README.md` ghi "số kế tiếp 0044" mà chưa nhắc sổ tiền giữ `0044`/`0045` | khi điều phối rảnh | bàn giao 30/9 mục 7 |
