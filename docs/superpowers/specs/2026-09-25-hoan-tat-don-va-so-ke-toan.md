# Đặc tả (bản nháp): Hoàn tất đơn, sổ công nợ, chiết khấu theo vai, loại biên nhận theo dịch vụ

- **Ngày:** 2026-09-25. **Vai:** lập kế hoạch (không thi công). **Trạng thái:** **bản nháp — chờ chủ trả lời câu hỏi §8**, chưa trình duyệt.
- **Việc lớn:** chạm dữ liệu (trạng thái mới, bảng sổ), tiền (công nợ, chiết khấu), quyền (ai hoàn tất, ai xem sổ) → mọi phần thi công có người kiểm độc lập (CLAUDE.md §3).
- **Xây trên lỗ đang hở: `money.view`, `contact.view`** (`docs/quyen-hoan.json`) — hướng dẫn viên xem công nợ của mình, màn sổ của Kế toán đều dựa vào hai ô này → **không quyết định nào ở đây được duyệt trước khi ADR-0019 lên production** (luật "dừng dây chuyền").
- **Không duyệt một lần được:** phạm vi sinh ít nhất 5 quyết định chạm dữ liệu/quyền; CLAUDE.md §9 cho tối đa 3 mỗi lượt, mỗi lượt kèm trang ghép. Đề xuất chia lượt ở §7.

## 0. Nguồn (chủ dự án, phiên chat 2026-09-25, nguyên văn rút gọn)

> "Hướng dẫn viên sau khi thay đổi đơn có thể bấm xác nhận để CHUYỂN TRẠNG THÁI ĐƠN LÀ HOÀN THÀNH. Lúc này đơn không thể thay đổi bất cứ thông tin nào, và là bất biến. … Lúc HDV bấm Hoàn tất nghĩa là đang nợ công ty đúng bằng số tiền đã thu của khách. Khách không còn nợ công ty nữa. Theo đúng triết lý Modular monolith thì lúc này lập tức kích hoạt lại luồng tính toán (nếu chưa có thì phải làm). Có đồng thời 2 giao dịch: (1) mua vé của đại lý với công ty Tour Đảo (nếu người đặt thuộc nhóm Bên ngoài) — giá đại lý xử lý theo vai trò: hướng dẫn viên, đại lý, cộng tác viên, lữ hành; (2) mua vé của khách hàng với đại lý (HDV của Tour Đảo lúc này thu tiền hộ đại lý). Việc quản lý mức chiết khấu tương tự việc tách vai trò và tài khoản để gắn từng mức (% và/hoặc cố định theo từng loại dịch vụ) cho từng vai. Đồng thời quản lý hình thức của biểu mẫu xác nhận (Cty Tour Đảo bán, Cty Tour Đảo làm đại lý bán) để gắn cho từng loại dịch vụ. Ví dụ: Tour Đảo đứng tên người bán trên biên lai với Vé Hòn Tằm, Tour đảo Nha Trang, nhưng chỉ hiện là đối tác với vé tắm bùn i-resort. Khách đặt vé i-resort có thể đã trả trước một phần cho nhân viên Tour Đảo hoặc đại lý, phần còn lại do i-resort thu. Phát sinh 3 luồng: (01) khách mua vé i-resort của Tour Đảo giá N; (02) Tour Đảo mua vé đó của i-resort giá a% × N; (03) lễ tân, taxi, lữ hành hưởng b đồng hoa hồng (trừ số đã thu trước của khách là số thực nhận; âm thì phải trả chênh lệch cho Tour Đảo, dương thì Tour Đảo còn phải trả họ)."
>
> C2: "Chọn lý do trước khi bấm xác nhận. Và ghi lịch sử tự động bởi hệ thống sau khi bấm xác nhận."

## 1. Đã quyết từ trước — áp dụng, không hỏi lại

| Điều | Nguồn |
|---|---|
| Chiết khấu đối tác theo **nhóm đối tác × loại dịch vụ** (tiền tố mã), ô cụ thể nhất thắng, hiệu lực theo ngày; **chụp tỷ lệ theo từng dòng lúc gửi đơn**; tính trên giá bán lẻ; **làm tròn tới đồng theo dòng**; lưu phần vạn; không khớp ô nào → 0% + cảnh báo Kế toán | ADR-0018 điều 11; đặc tả mô hình vai §11 |
| Phiếu/biên nhận gửi khách **không bao giờ** hiện chiết khấu | đặc tả mô hình vai LC-5, LC-7 |
| Điều khoản thương mại gắn **vai/hồ sơ**, không bao giờ gắn tài khoản đăng nhập | ADR-0018 điều 1 |
| Sổ thu tiền **chỉ-thêm, sai thì ghi dòng đảo**; module `billing`, tiền tố `bil_` (đã khai, chưa có bảng) | ADR-0004; ADR-0003 điều 7 |
| Tiền `INTEGER` VNĐ; tập mở (hình thức thu) = bảng tra cứu; không `CASCADE`; không xoá cứng | ADR-0003 |
| Mọi sửa sau xác nhận: lý do bắt buộc, bản ghi trước→sau chỉ-thêm, tiền tính lại ở máy chủ, chênh lệch với tiền đã thu đánh dấu Kế toán | ADR-0007 điều 2 |
| Tiền dẫn xuất chỉ tính ở máy chủ, không tin số từ trình duyệt | CLAUDE.md §7 |

**Chủ đang đảo (đã nhắc một lần — P18):** đặc tả mô hình vai Q9 (24/9) "không thêm trạng thái 'đã hoàn thành' đợt này"; ADR-0004 "hoãn công nợ đại lý và giá net cho đại lý"; đặc tả mô hình vai §ngoài phạm vi "vai nhà cung cấp". Yêu cầu hôm nay mở cả ba → cần ADR mới ghi rõ là thay các câu đó.

## 2. Luồng trạng thái đề xuất (lời thường)

```
Chờ xác nhận ──Xác nhận (chốt với khách)──▶ Đã xác nhận ──Hoàn tất (sau chuyến)──▶ Hoàn thành  [bất biến]
      │                                          │
      └────────────── Huỷ ──────────────────────┴──▶ Đã huỷ
```

- **Xác nhận** = chốt đơn với khách (khoá giá). **Hoàn tất** = chuyến đã xong, tiền đã thu xong → **ghi sổ**, đơn **không sửa được nữa**. Nhãn "Đã sửa" (ADR-0023) vẫn là nhãn.
- Sai sót phát hiện sau Hoàn thành: **đơn không mở lại**; Kế toán/Toàn quyền ghi **bút toán đảo/điều chỉnh** trong sổ (câu hỏi Q6).
- **Kỹ thuật (không cần chủ quyết, ghi để người kiểm):** cột `orders.status` đang bị khoá bằng `CHECK (status IN ('draft','confirmed','cancelled'))` (`migrations/0003_orders.sql:6`) và trigger chuyển trạng thái (`0017:8-12`). Thêm giá trị mới vào `CHECK` buộc **dựng lại bảng `orders`** đang bị nhiều bảng tham chiếu (ADR-0003 điều 10 tránh tuyệt đối). **Đề xuất:** không đụng `CHECK`; "Hoàn thành" = đơn `confirmed` **có bản ghi hoàn tất** (bảng mới chỉ-thêm, một dòng mỗi đơn, của module `billing`); trigger mới khoá mọi sửa đơn/dịch vụ/tiền khi bản ghi đó tồn tại. Chỉ **thêm** bảng/trigger (expand), không dựng lại. Quyết định dữ liệu riêng (D1, §7) + runbook.

## 3. Kiến trúc: ghi sổ nguyên khối, không qua Bảng tin

- Bấm **Hoàn tất** → **một** lô ghi D1 duy nhất: bản ghi hoàn tất + mọi bút toán công nợ của đơn. Hoặc tất cả được lưu, hoặc không gì cả. Không có trạng thái "đơn hoàn thành mà sổ chưa ghi".
- **Bảng tin (ADR-0022) chỉ báo màn hình, có thể lỡ tin** → **không bao giờ** là thứ kích hoạt ghi tiền. Nó chỉ báo "Đơn TD-… đã hoàn thành" **sau khi** lô ghi đã thành công. ("Lắng nghe sự kiện rồi tính tiền" của chủ được hiện thực bằng **gọi thẳng trong cùng lô ghi**, đúng tinh thần modular monolith: module `billing` sở hữu luật tiền, module `orders` sở hữu đơn.)
- Route **Hoàn tất** đặt ở module `billing` (cạnh phụ thuộc tự nhiên `billing → orders`: sổ cần biết đơn, đơn không cần biết sổ); đọc đơn qua view công bố của `orders`, lấy câu khoá đơn qua `orders/index.ts`. **Không** dùng kiểu "gốc lắp ráp tiêm câu lệnh vào lô ghi của orders" (ADR-0020 vừa gỡ kiểu đó vì một hàm "không làm gì" trên đường ghi dễ bị bật lại lặng lẽ).
- Cài đặt (mức chiết khấu, loại biên nhận, tỷ lệ nhà cung cấp) **lưu trong app**, theo mã dịch vụ — **không** ở Google Sheet (Sheet chỉ đọc, dùng chung với website, bị ghi đè mỗi lần đồng bộ). *Giả định của AI, bề mặt vận hành, đổi được.*

## 4. Các khái niệm mới

| Khái niệm | Lời thường | Ghi ở đâu (đề xuất) |
|---|---|---|
| **Loại biên nhận của dịch vụ** | "Tour Đảo bán" (Tour Đảo đứng tên người bán) hoặc "Tour Đảo làm đại lý" (người bán là nhà cung cấp, Tour Đảo hiện là đối tác) | cài đặt theo mã dịch vụ, hiệu lực theo ngày |
| **Nhà cung cấp + tỷ lệ giá vốn a%** | với dịch vụ "làm đại lý": ai bán thật (i-resort) và Tour Đảo mua lại bằng a% giá bán | cài đặt theo mã dịch vụ; nhà cung cấp là **hồ sơ** trong Danh bạ (vai mới "Nhà cung cấp") |
| **Mức chiết khấu/hoa hồng theo vai** | % và/hoặc số tiền cố định, theo vai bên ngoài × loại dịch vụ | mở rộng bảng của ADR-0018 điều 11 thêm kiểu "số tiền cố định" (Q5) |
| **Người hưởng (đại lý/người giới thiệu) của đơn** | ai mua giá đại lý / hưởng hoa hồng trên đơn này | Q4 |
| **Bản ghi hoàn tất** | ai bấm Hoàn tất, lúc nào, số tiền thực thu, thu bằng gì, ai đang giữ | bảng `bil_` chỉ-thêm |
| **Sổ công nợ** | mỗi dòng: ai nợ ai, bao nhiêu, vì đơn nào, vì lý do gì | bảng `bil_` chỉ-thêm, sai thì dòng đảo |

## 5. Ví dụ bằng số (có kiểm cân đối)

**Luật cân đối (tiêu chí nghiệm thu + bất biến cho `audit-invariants`):** với mỗi đơn hoàn thành, **phần Tour Đảo thực giữ = giá bán − giá vốn nhà cung cấp − chiết khấu/hoa hồng**, bất kể ai đã cầm tiền của khách.

### 5.1 "Tour Đảo bán" — Vé Hòn Tằm, đơn do Cộng tác viên (CTV) lập

2 người lớn × 500.000 = **N = 1.000.000**. Chiết khấu CTV cho nhóm vé này 15% → **150.000**; giá CTV mua = 850.000. HDV Tour Đảo thu của khách tại bến **1.000.000** tiền mặt.

| Giao dịch | Ghi sổ |
|---|---|
| GD1 — CTV mua vé của Tour Đảo 850.000 | CTV nợ Tour Đảo 850.000 |
| GD2 — Khách mua vé của CTV 1.000.000; HDV thu hộ CTV | Khách hết nợ. HDV nợ Tour Đảo 1.000.000. Tour Đảo nợ CTV 1.000.000 (tiền thu hộ) |
| Bù trừ với CTV | Tour Đảo **còn trả CTV 150.000** |

Kiểm: Tour Đảo nhận 1.000.000 từ HDV − trả CTV 150.000 = **850.000** = 1.000.000 − 0 − 150.000 ✓.
*Biến thể:* CTV đã thu cọc 300.000, HDV thu 700.000 → HDV nợ 700.000; CTV nợ 850.000 − 700.000 = **150.000** (CTV đang cầm 300.000, nộp 150.000, giữ 150.000 = đúng hoa hồng). Tour Đảo: 700.000 + 150.000 = 850.000 ✓.

### 5.2 "Tour Đảo làm đại lý" — Vé tắm bùn i-resort, khách do lễ tân khách sạn giới thiệu

2 vé × 300.000 = **N = 600.000**. Tỷ lệ giá vốn i-resort a = 80% → **480.000**. Hoa hồng lễ tân b = 50.000/vé → **100.000**. Khách trả trước **P = 200.000**; phần còn lại **400.000 trả tại quầy i-resort**.

**Trường hợp A — lễ tân thu trước 200.000:**

| Luồng | Ghi sổ |
|---|---|
| (01) Khách mua vé của Tour Đảo 600.000 | khách: đã trả lễ tân 200.000 + trả i-resort 400.000 → hết nợ |
| (02) Tour Đảo mua vé của i-resort 480.000 | Tour Đảo nợ i-resort 480.000 |
| (03) Lễ tân: hoa hồng 100.000 − đã thu 200.000 = **−100.000** | lễ tân **nợ Tour Đảo 100.000** |
| **(04) — chủ chưa nêu, AI bổ sung, xem Q3** — i-resort thu hộ 400.000 | i-resort nợ Tour Đảo 400.000 → bù trừ (02): **Tour Đảo còn trả i-resort 80.000** |

Kiểm: Tour Đảo nhận 100.000 (lễ tân) − trả 80.000 (i-resort) = **20.000** = 600.000 − 480.000 − 100.000 ✓.

**Trường hợp B — nhân viên Tour Đảo (HDV) thu trước 200.000:** HDV nợ Tour Đảo 200.000; Tour Đảo nợ lễ tân 100.000 (hoa hồng − 0 đã thu = +100.000); Tour Đảo còn trả i-resort 80.000. Tour Đảo: 200.000 − 100.000 − 80.000 = **20.000** ✓.

**Lưu ý:** số Tour Đảo còn trả nhà cung cấp = a·N − (N − P) có thể **âm** (nhà cung cấp thu nhiều hơn giá vốn → nhà cung cấp nợ Tour Đảo), ví dụ P = 0: 480.000 − 600.000 = −120.000.

**Biên nhận gửi khách (5.2):** người bán **i-resort**, Tour Đảo hiện "đối tác đặt vé"; "Đã trả trước 200.000 ₫ — Còn lại 400.000 ₫ thanh toán tại quầy i-resort". **Không** hiện a%, hoa hồng (LC-5). Đơn có cả Hòn Tằm và i-resort: biên nhận chia **hai phần** theo người bán (giả định, Q7).

## 6. Hướng dẫn viên khi bấm "Hoàn tất"

Nhập **số tiền thực thu của khách** và **thu bằng gì** (tiền mặt / chuyển khoản vào tài khoản công ty / khác). Máy chủ tính các dòng sổ; màn xác nhận hiện cho HDV: "Bạn đang giữ 1.000.000 ₫ của công ty". Chuyển khoản thẳng vào tài khoản công ty → HDV **không** nợ phần đó. Lý do sửa (ADR-0023 C2) chọn **trước khi lưu**, lịch sử tự ghi.

## 7. Chia quyết định và lượt duyệt (đề xuất)

| # | Quyết định (ADR riêng) | Chạm |
|---|---|---|
| D1 | Trạng thái **Hoàn thành**, bất biến, cách ghi không dựng lại bảng; ai được Hoàn tất | dữ liệu + quyền |
| D2 | **Sổ công nợ** (N3): bản ghi hoàn tất, dòng nợ, bút toán đảo, ai xem/ghi; số thực thu của HDV; số phận ba cột cọc cũ (ADR-0004 đòi gỡ cùng lúc thêm sổ thu) | dữ liệu + tiền + quyền |
| D3 | **Người hưởng** trên đơn (đại lý/người giới thiệu) | dữ liệu + quyền |
| D4 | **Mức chiết khấu/hoa hồng** theo vai × dịch vụ, thêm kiểu số tiền cố định (mở rộng ADR-0018 điều 11) | tiền |
| D5 | **Loại biên nhận + nhà cung cấp + a%** theo dịch vụ; vai "Nhà cung cấp" | dữ liệu + tiền + giao diện gửi khách |

**Lượt 1:** D1 + D2 + D3 (khung sổ, chạy được cho đơn "Tour Đảo bán" không chiết khấu). **Lượt 2:** D4 + D5. Mỗi lượt một trang ghép. **Cả hai lượt chỉ sau khi ADR-0019 lên production.** Thứ tự thi công chung: Bảng tin (ADR-0022) → ADR-0019 → ADR-0017/0023 + ADR-0020 → lượt 1 → lượt 2.

## 8. Câu hỏi cho chủ (gom một lần)

- **Q1 — Ai bấm gì.** Khuyến nghị: *Xác nhận* (chốt với khách): người lập, Quản trị, hoặc HDV đang phụ trách. *Hoàn tất*: HDV đang phụ trách, Quản trị/Toàn quyền. **Không** nhảy thẳng từ Chờ xác nhận sang Hoàn thành.
- **Q2 — HDV nhập gì khi Hoàn tất:** số tiền thực thu + thu bằng gì; chuyển khoản thẳng công ty thì HDV không nợ. Khuyến nghị: **đúng vậy**.
- **Q3 — Quyết toán với nhà cung cấp phần họ thu hộ** (luồng 04 ở 5.2): máy tự tính "Tour Đảo còn trả / được nhận của i-resort" = a·N − số i-resort đã thu. Khuyến nghị: **có**.
- **Q4 — Ai là "người hưởng" của đơn** và đối chiếu tên vai. Khuyến nghị: tài khoản đối tác lập đơn là người hưởng; nhân viên Tour Đảo lập hộ thì chọn ô **"Người giới thiệu"** từ Danh bạ. Tên vai bạn dùng → 11 vai đã duyệt: "lữ hành" = *Công ty lữ hành*; "cộng tác viên" = *Cộng tác viên*; "lễ tân" = *Lễ tân khách sạn*; "taxi" = *Tài xế taxi*; "hướng dẫn viên" = *Hướng dẫn viên độc lập* (HDV **nội bộ** không hưởng giá đại lý); **"đại lý" chưa có trong 11 vai** — là *Công ty lữ hành* hay một vai mới?
- **Q5 — Mức "% và/hoặc cố định":** khuyến nghị mỗi ô (vai × loại dịch vụ) chọn **một** kiểu: % trên giá bán, **hoặc** số tiền cố định **mỗi khách/vé**. Không cộng hai kiểu trong cùng một ô.
- **Q6 — Sai sau Hoàn thành:** khuyến nghị đơn **không mở lại**; Kế toán hoặc Toàn quyền ghi bút toán điều chỉnh có lý do.
- **Q7 — Đơn có cả dịch vụ "Tour Đảo bán" và "Tour Đảo làm đại lý":** khuyến nghị **một** biên nhận chia hai phần theo người bán.
- **Mang từ trước:** (a) C2 — lý do bắt buộc áp cả khi HDV sửa **đơn nháp**? (giả định hiện tại: có); (b) duyệt thêm **một loại module mới "không dùng cơ sở dữ liệu"** vào luật kiến trúc cho Bảng tin (chặt hơn loại hiện chặt nhất)?

## 9. Giả định và điều chưa chắc

- Cài đặt tiền lưu trong app, không ở Sheet (§3).
- Làm tròn a%·N theo đúng luật chiết khấu đã duyệt: tới đồng, theo dòng.
- Chưa xác minh: kế toán có cần xuất báo cáo công nợ theo kỳ (tuần/tháng) không — để kế hoạch lượt 1 hỏi.
- Phần "Dự kiến đối tác còn phải trả" và "người giữ cọc" của đặc tả mô hình vai §11 sẽ được **gộp** vào D2/D3 (không làm hai lần).
