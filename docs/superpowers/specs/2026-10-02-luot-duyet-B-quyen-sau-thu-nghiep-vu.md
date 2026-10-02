# Lượt duyệt B — Quyền: ADR-0090 (PIN tạm) + ADR-0091 (Bán hàng phá lệ mốc 6 giờ, có nhãn ngoại lệ)

> **Trạng thái:** **NHÁP chờ chủ dự án duyệt văn bản.** Chủ đã chọn **nguyên tắc** ngày 2026-10-02: câu 4 "ok", câu 5 "cho phép (nhưng phải có nhãn hoặc ký hiệu riêng…)". AI viết điều khoản, chủ duyệt văn bản. AI không tự duyệt (Hiến pháp N3).
>
> **Số:** ADR-0090, ADR-0091. Lượt A dùng 0088 và 0089.
>
> **Bước ghép:** **2** quyết định chạm quyền, kèm trang ghép ở cuối. Lượt A (tiền) là lượt riêng.
>
> **Nguồn:** `~/Documents/danh-gia-ux/2026-10-01/BAO-CAO.md` gốc G7 (QT04, KT07) và G8 (QT02); đánh giá kiến trúc 1/10 GD-P-01.

## Lời chủ dự án (nguyên văn, chat 2026-10-02)

> "4- ok, 5- cho phép (nhưng phải có nhãn hoặc ký hiệu riêng để nhận biết đây là ngoại lệ được cho phép và/hoặc đáng chú ý, không phải đơn bình thường)"

Câu đã hỏi (báo cáo §6):
- **Câu 4:** "ADR mới về 'PIN tạm' (G7, QT04): người đặt lại PIN không được biết PIN dùng lâu dài."
- **Câu 5:** "Quản trị trực đêm (QT02) hay cho phép Điều phối 'phá lệ' mốc 6 giờ: hiện ban đêm không ai xếp được xe cho đơn gấp."

---

## ADR-0090 — PIN tạm: người đặt lại hay tạo tài khoản không dùng được PIN đó để làm việc thay

### Bối cảnh (đã chạy thật)
- **QT04:**
  - Quản trị đặt lại PIN của Kế toán (200), và **thấy PIN mới** trong phản hồi. Phiên của Kế toán thật bị đá.
  - Quản trị đăng nhập bằng SĐT Kế toán + PIN mới (200), xác nhận "Công ty đã nhận" (200), rồi **ghi hoàn 500.000** (201). Nhật ký ghi tên Kế toán.
  - Chỉ Toàn quyền thấy dấu vết qua nhật ký im lặng.
- **GD-P-01:** Nhân sự tạo tài khoản cũng biết PIN đầu tiên.
- Mã: `src/modules/accounts/index.ts:643-656` (đặt lại), route tạo tài khoản (ô `account.create`).

### Quyết định
1. **PIN do người khác đặt là PIN tạm.** Áp cho tạo tài khoản và đặt lại PIN.
   - Tài khoản mang cờ "đang dùng PIN tạm" (cột mới trên `staff`, migration thêm cột, có giá trị mặc định).
   - PIN tạm **hết hạn sau 24 giờ** nếu chưa dùng. Con số đề xuất, chủ chỉnh ở Q-B1.
2. **Đăng nhập bằng PIN tạm chỉ mở được một việc: đổi PIN.**
   - Mọi route khác trả 403 kèm câu: "Bạn đang dùng mã PIN tạm. Đổi mã PIN mới trước khi làm việc."
   - Chặn ở router (cổng chung), không rải từng route. Giao diện tự đưa về màn đổi PIN.
3. **Đổi PIN xong:**
   - gửi tin cho chính chủ tài khoản (hộp thông báo), và cho **Toàn quyền** nếu tài khoản có quyền tiền: ACCOUNTING, hoặc ô `ledger.write` / `payment.refund`;
   - nhật ký ghi "đổi PIN tạm" kèm thiết bị (không ghi PIN).
4. **Tài khoản có quyền tiền** (ACCOUNTING, SUPER_ADMIN) chỉ **Toàn quyền** được đặt lại PIN. Quản trị nhận 403.
   - Lý do: lượt đổi PIN bắt buộc ở đ2 vẫn có thể do chính người đặt làm, vì họ biết PIN tạm. Riêng đ2 chỉ làm việc mạo danh **lộ ra** (Kế toán thật bị khoá ngoài), không **chặn** được.
   - Với tài khoản giữ tiền thì phải chặn từ gốc.
5. **Phương án nhẹ hơn cho các tài khoản khác** (bán hàng, HDV, đối tác): đ1–3 là đủ. Người đặt PIN mà tự đổi PIN rồi dùng tài khoản thì chủ thật sẽ bị khoá ngoài và báo, nên mạo danh lộ ra ngay.

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0042 (Quản trị lấy lại ô đặt lại PIN, chỉ cấp dưới) | Quản trị đặt lại PIN mọi cấp dưới | Trừ tài khoản có quyền tiền: chỉ Toàn quyền (đ4) |
| ADR-0071 (Nhân sự tạo tài khoản) | PIN đầu do người tạo đặt | PIN đầu là PIN tạm (đ1–2) |

### Câu hỏi mở
- **Q-B1** — Hạn PIN tạm:
  - **(khuyến nghị)** 24 giờ;
  - hoặc 72 giờ (người ở xa, đi tour nhiều ngày).
- **Q-B2** — Đ4 áp cho những quyền nào:
  - **(khuyến nghị)** ACCOUNTING + SUPER_ADMIN;
  - hoặc thêm ADMIN, tức chỉ Toàn quyền đặt lại PIN của Quản trị.

---

## ADR-0091 — Bán hàng được "phá lệ" mốc 6 giờ khi xếp xe, có nhãn ngoại lệ riêng và người được báo

### Bối cảnh (đã chạy thật)
- **QT02:** đơn xác nhận lúc còn hơn 6 giờ; tới lúc xếp xe thì đã vào mốc.
  - Bán hàng nhận 409: "Trong mốc tối thiểu trước giờ xuất bến — cần Quản trị phá lệ."
  - Ban đêm không có Quản trị trực thì **không ai xếp được xe**, khách lỡ chuyến.
- Đặt gấp nhầm không gỡ được (DELETE 405); dấu đặt gấp tự mất khi chặng đổi.
- Hiện "đặt gấp" (`order.leg.short_notice`) và "phá lệ" (`trip.override`) chỉ có ADMIN, SUPER_ADMIN (`permissions.ts:83,171`).
- Người xếp xe hằng ngày là Bán hàng: ô `trip.dispatch` gồm Bán hàng, Quản trị, Toàn quyền. Ứng dụng **không có vai "Điều phối" riêng**. "Điều phối" trong câu hỏi gửi chủ là người đang xếp xe, tức Bán hàng.

### Quyết định
1. **Bán hàng được phá lệ mốc 6 giờ, và chỉ mốc 6 giờ**, ở hai chỗ:
   - đặt gấp chặng (xác nhận đơn);
   - xếp xe trong mốc.
   
   Các phá lệ khác (cam kết xe riêng, số chỗ tối thiểu — ADR-0056) vẫn chỉ Quản trị và Toàn quyền.
   - Thi công bằng **ô quyền mới** `order.leg.short_notice.exception`, chỉ SALES. Không mở rộng ô cũ, để giữ tách bạch "Quản trị duyệt" với "Bán hàng tự phá lệ".
   - Thêm mã ô (không phải mã quyền) **không** nhân đôi bài tập con quyền.
2. **Bắt buộc lý do**, chọn từ danh sách: "Khách đặt sát giờ", "Đơn cũ vào mốc chưa kịp xếp", "Đổi giờ theo yêu cầu khách", "Khác (ghi rõ)". Kèm ghi chú ≥ 10 ký tự khi chọn "Khác".
3. **Nhãn ngoại lệ riêng** (lời chủ: "nhãn hoặc ký hiệu riêng… không phải đơn bình thường"):
   - **Một ký hiệu thống nhất** cho mọi phá lệ do **Bán hàng** tự làm, **khác** nhãn "Đặt gấp" do Quản trị duyệt hiện có (`web/dat-gap-ui.ts`). Đề xuất nhãn: **"Ngoại lệ 6 giờ"**, màu cảnh báo riêng, có biểu tượng. Mẫu cụ thể chủ chốt trên Claude Design.
   - Nhãn hiện **ở mọi nơi đơn hoặc chặng xuất hiện**: thẻ danh sách đơn, trang đơn, bảng điều phối và lịch chung, chi tiết chuyến của văn phòng, Trang chủ.
   - **Không** hiện cho khách (ảnh xác nhận) và **không** hiện cho tài xế. Tài xế chỉ cần giờ và điểm.
   - Bấm vào nhãn thấy: ai phá lệ, lúc nào, lý do.
   - Có **bộ lọc** "Ngoại lệ 6 giờ" trên danh sách đơn và bảng điều phối, để Quản trị rà sáng hôm sau.
4. **Người được báo:** mỗi lần Bán hàng phá lệ, gửi tin (hộp thông báo) cho **Quản trị và Toàn quyền**, kèm mã đơn, giờ đón, lý do. Không gõ cửa điện thoại ban đêm; chủ chỉnh ở Q-B4.
5. **Gỡ được:** Quản trị, Toàn quyền và chính người đã phá lệ gỡ được dấu khi chuyến chưa xuất bến. Gỡ có lý do và nhật ký. Lỗ "đặt gấp nhầm không gỡ được" (405) đóng luôn cho cả đặt gấp của Quản trị.
6. **Không đổi:**
   - mốc 6 giờ vẫn không tắt được (CSDL chặn 0);
   - "khoá dính" giờ sớm nhất từng có giữ nguyên;
   - phá lệ gắn đúng chặng và chuyến, mất khi chặng đổi (như đặt gấp hiện nay).

### Thay câu nào
| Văn bản | Câu cũ | Thay bằng |
|---|---|---|
| ADR-0049 D2/D3 (mốc 6 giờ; "đặt gấp và phá lệ chỉ Quản trị, Toàn quyền") | chỉ Quản trị, Toàn quyền | + Bán hàng cho **riêng mốc 6 giờ**, có lý do, nhãn "Ngoại lệ 6 giờ", báo Quản trị và Toàn quyền (ADR-0091) |
| ADR-0051 (đặt gấp) | không có lệnh gỡ | Gỡ được trước xuất bến (đ5) |

### Câu hỏi mở
- **Q-B3** — Giới hạn giờ:
  - **(khuyến nghị)** Bán hàng phá lệ được **mọi giờ**, vì nhãn và tin báo là đủ kiểm soát;
  - hoặc chỉ ngoài giờ hành chính (18:00–07:30), ban ngày vẫn cần Quản trị.
- **Q-B4** — Báo Quản trị:
  - **(khuyến nghị)** chỉ hộp thông báo, xem sáng hôm sau;
  - hoặc gõ cửa điện thoại ngay, kể cả ban đêm.
- **Q-B5** — Đối tác, HDV có được phá lệ không:
  - **(khuyến nghị)** không;
  - hoặc có, cũng gắn nhãn.

---

## Trang ghép lượt B (bắt buộc, CLAUDE.md §9)

### 1. Bảng nào chứa loại thực thể nào
| Bảng | Thực thể | ADR chạm |
|---|---|---|
| `staff` | tài khoản đăng nhập: SĐT, PIN băm, cờ hoạt động, `credentials_changed_at`. **Mọi** loại tài khoản (nội bộ, Đối tác, tài xế đối tác) chung một bảng | 0090: thêm cờ và hạn PIN tạm. Áp cho mọi loại tài khoản |
| `stf_permission` | quyền của tài khoản (có hiệu lực) | 0090 đ4 đọc để biết "tài khoản có quyền tiền" |
| `aut_session` (0065) | sổ phiên | 0090: phiên mở bằng PIN tạm mang dấu "chỉ đổi PIN" |
| `ord_transfer_leg` | chặng đưa đón; năm cột "đặt gấp" `short_notice_*` (0040) | 0091: thêm phân biệt **ai** phá lệ (Quản trị duyệt / Bán hàng ngoại lệ), lý do, gỡ |
| `vc_trip` | chuyến; cột phá lệ cam kết (ADR-0056) | 0091 đ1: phá lệ mốc lúc xếp xe gắn chuyến, phân biệt người làm |
| thông báo (`thongbao`) | tin trong hộp | 0090 đ3, 0091 đ4: loại tin mới |

### 2. Dòng bản đồ quyền chạm các bảng trên, áp cho loại nào
| Ô quyền | Hiện tại | Sau lượt B | Áp cho |
|---|---|---|---|
| `account.access.manage` (đặt lại PIN, mở khoá, gỡ Face ID) | ADMIN, SUPER_ADMIN (chỉ cấp dưới, `mayManage`) | ADMIN **trừ** tài khoản có quyền tiền (0090 đ4) | tài khoản nội bộ và bên ngoài |
| `account.create` | HR, SUPER_ADMIN | không đổi ô; PIN đầu thành PIN tạm | mọi tài khoản mới |
| `order.leg.short_notice` (đặt gấp, Quản trị duyệt) | ADMIN, SUPER_ADMIN | không đổi; thêm lệnh **gỡ** (0091 đ5) | chặng |
| **`order.leg.short_notice.exception` (mới)** | — | **SALES** (Q-B5 có thể mở rộng) | chặng của đơn mà Bán hàng xem được |
| `order.leg.short_notice.view` | SALES, ACCOUNTING, ADMIN, SUPER_ADMIN | thêm xem nhãn "Ngoại lệ 6 giờ"; FIELD xem nhãn trên đơn được giao (đề xuất) | chặng |
| `trip.override` | ADMIN, SUPER_ADMIN | **không đổi**. Phá lệ mốc lúc xếp xe của Bán hàng đi qua ô mới, không qua ô này | chuyến |
| `trip.dispatch` | SALES, ADMIN, SUPER_ADMIN | không đổi | chuyến |

### 3. Cổng nào canh cửa nào (kể cả giao diện ẩn/hiện đổi nghĩa)
| Cửa | Cổng hiện có | Sau lượt B |
|---|---|---|
| Mọi route sau đăng nhập bằng PIN tạm | không có | **Router**: 403 trừ đổi PIN và đăng xuất (0090 đ2) |
| `POST /api/staff/:id/reset-pin` | `can(account.access.manage)` + `mayManage` | + chặn tài khoản có quyền tiền với Quản trị (0090 đ4) |
| Đặt gấp chặng | `can(order.leg.short_notice)` | + nhánh `can(order.leg.short_notice.exception)` có lý do bắt buộc |
| Xếp xe trong mốc | `kiemMocXep` → `canPhaLe` cần `trip.override` | Bán hàng có ô ngoại lệ thì phá lệ **riêng lý do MOC_TOI_THIEU**; lý do giữ khác vẫn cần `trip.override` |
| Năm cột đặt gấp trên `ord_transfer_leg` (0040) | Không có trigger kiểm mốc. Nhánh `datGap` của lệnh sửa chặng là nơi **duy nhất** ghi năm cột (I16, `migrations/0040_dat_gap_chang.sql:4`). Mốc tối thiểu > 0 do CSDL chặn ở chính sách | Ngoại lệ của Bán hàng ghi qua **cùng nhánh duy nhất** đó (thêm cột "người làm là Bán hàng / Quản trị"), không mở đường ghi thứ hai. **Mốc vẫn không tắt được** |
| **Giao diện: nút "Đặt gấp"** (`web/dat-gap-ui.ts:106`, hiện theo `order.leg.short_notice`) | Bán hàng không thấy nút, chỉ thấy dòng "cần Quản trị duyệt" | **Đổi nghĩa:** Bán hàng thấy nút **"Phá lệ (ngoại lệ 6 giờ)"**, khung khác, có danh sách lý do. Dòng 7b "Xếp xe gấp cần Quản trị duyệt" đổi chữ |
| **Giao diện: nhãn đặt gấp** (`khoiNhanDatGap`) | "Đặt gấp — lý do — người duyệt" | Hai nhãn tách biệt: "Đặt gấp" (Quản trị) và "Ngoại lệ 6 giờ" (Bán hàng) |
| **Giao diện: màn đăng nhập / vỏ trang** (`web/shell.ts`, `login.ts`) | không có trạng thái PIN tạm | Đăng nhập bằng PIN tạm thì chuyển thẳng tới màn đổi PIN; vỏ không tải trang khác |
| **Giao diện: màn Quản lý tài khoản** | hiện PIN mới sau đặt lại | Ghi rõ "PIN tạm — hết hạn sau 24 giờ — người dùng phải đổi ngay". Với tài khoản có quyền tiền, Quản trị **không thấy nút** đặt lại |

### 4. Va chạm giữa hai ADR của lượt và với lượt A
- 0090 và 0091 không chạm cùng bảng hay cùng ô.
- **Với lượt A:** 0090 đ4 khoá đường mạo danh Kế toán (QT04). Đây là điều kiện để các lệnh mới của lượt A (Thay lần thu, hoàn đơn huỷ) không bị lạm dụng qua đường đặt lại PIN. **Khuyến nghị:** thi công 0090 trước hoặc cùng đợt với lượt A.
- Bảng tin và thông báo: hai loại tin mới (đổi PIN tạm, ngoại lệ 6 giờ) theo luật ADR-0045. Không gõ cửa điện thoại trừ khi chủ chọn khác ở Q-B4.

### Loại cửa
- **0090:** migration thêm cột vào `staff` (thêm cột, an toàn). Một chiều nhẹ: cột ở lại khi hoàn tác mã.
- **0091:** thêm cột phân biệt người phá lệ trên `ord_transfer_leg` / `vc_trip`, một chiều nhẹ.
- Thi công cả hai là **việc lớn** (quyền, dữ liệu): người kiểm độc lập; thêm dòng vào `docs/SO-HANG-RAO.md` cho cổng PIN tạm ở router, có quan sát chặn thật.
