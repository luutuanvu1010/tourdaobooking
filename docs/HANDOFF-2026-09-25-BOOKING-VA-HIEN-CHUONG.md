# BÀN GIAO 2026-09-25 — Nghiệp vụ Booking Tour Đảo · Hiến chương Enterprise OS · Hiện thực theo tài liệu Anthropic

> **Đọc tệp này trước khi làm tiếp** bất kỳ việc nào dưới đây. Tệp là **mục lục + trạng thái + quyết định đã chốt**; chi tiết nằm ở các tệp được trỏ tới (đừng chép lại). Mọi câu "chủ dự án đã quyết" có nguyên văn trong tài liệu nguồn ghi bên cạnh. Điều gì chưa kiểm ghi rõ "chưa kiểm".
>
> Phiên soạn: phiên nền 2026-09-25 (điều phối, vai **lập kế hoạch**; bản vá DK-T2-01 do subagent thi công + người kiểm độc lập). Người quyết: chủ dự án.

---

## 0. Trạng thái lúc bàn giao (đã kiểm bằng lệnh, 2026-09-25 tối)

| Nơi | Trạng thái | Kiểm bằng |
|---|---|---|
| **Production** | bản **1.13**, bảo trì TẮT | `GET https://booking.tourdao.vn/api/auth/config` → `"version":"1.13"` |
| **`origin/main`** | `eec8d18` — đã có bản vá DK-T2-01 + sổ `phat_hien` | `git log origin/main` |
| Nhánh **`thong-bao-tuc-thi`** | `d44aa47` — **ĐÃ GỘP `main` (2026-09-26)**, chỉ tài liệu | ADR-0020/0022/0023/0024/0025/0026, đặc tả Hoàn tất, tổng hợp phản biện, kế hoạch Bảng tin, trang ghép |
| Nhánh **`hien-chuong-kien-truc`** | chờ gộp (đã đưa `main` mới vào 2026-09-26 để gộp tiến thẳng được), tài liệu + `CLAUDE.md` + `RANG_BUOC_NGOAI.md` + Sổ vàng | Hiến chương (`docs/ARCHITECTURE.md` Phần I), `SYSTEM-DESIGN.md` §17, đối chiếu bản mẫu + Enterprise OS, **tệp này** |
| Nhánh `va-gia-thoa-thuan` | đã gộp `main`, đã xoá | — |

**Chủ chạy để đưa tài liệu lên bản chính** (Terminal, thư mục gốc dự án; *không cần triển khai* — chỉ tài liệu):
```
cd /Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales
```
```
npm run day-len -- thong-bao-tuc-thi
```
```
npm run day-len -- hien-chuong-kien-truc
```
(Đã kiểm `git diff --name-only`: hai nhánh **không sửa chung tệp nào**. Nếu `day-len` vẫn báo xung đột, dừng và gửi thông báo cho AI.)

---

## 1. Nghiệp vụ phần mềm Booking Tour Đảo — đã chốt trong phiên

### 1.1 Người phụ trách đơn, "Nhận" đơn — ADR-0020 (*proposed*)
Nguồn: `docs/adr/ADR-0020-don-moi-cho-huong-dan-vien-nhan.md` (nhánh `thong-bao-tuc-thi`).
- Đơn mới (mọi người lập) **chưa có người phụ trách** cho tới khi có người **bấm "Nhận"** hoặc được giao. Nhận được: HDV nội bộ, Bán hàng, Quản trị, Toàn quyền. Không: Kế toán, Thực tập, Đối tác.
- Trạng thái "chưa có / đã có người phụ trách" **suy ra** từ dòng `HANDLE` đang mở — **không** thêm cột trạng thái. Chữ trên màn hình tiếng Việt.
- **Biên nhận:** ghi "Chưa có người phụ trách" **chỉ khi máy chủ xác nhận** chưa ai nhận; lỗi tải tên → **bỏ dòng** (giả định của AI, đảo được).
- Ô **"Chưa phụ trách"** ở Trang chủ đếm **cả đơn nháp** (M1 = A).
- Chỉ phát hành **sau** ADR-0019 + ADR-0017 và khi HDV bấm "Nhận" được.

### 1.2 Bảng tin (thông báo tức thì) — ADR-0022 (**accepted 2026-09-25**)
Nguồn: `docs/adr/ADR-0022-bang-tin-thong-bao-tuc-thi.md`, nghiên cứu `docs/superpowers/specs/2026-09-25-thong-bao-tuc-thi-nghien-cuu.md`, kế hoạch 15 task `docs/superpowers/plans/2026-09-25-bang-tin-ke-hoach.md` (nhánh `thong-bao-tuc-thi`).
- Chủ **loại** cách hỏi máy chủ theo chu kỳ. Chọn: **một Durable Object `BangTin` + WebSocket ngủ đông** (không tin → không tốn tiền; ước tính ~0 đồng, chưa đo).
- Nhóm nhận suy từ ô `order.view` (+ nhóm "chờ nhận" theo `dispatch.claim`); **sự kiện không mang tiền/SĐT**, màn hình tự tải lại qua API có kiểm quyền; kết nối hạn 15 phút + đóng khi tài khoản/bảo trì đổi; kiểm `Origin`.
- **Thông báo nổi**: đơn mới chưa có người (chỉ người bấm Nhận được), có người nhận/đổi người phụ trách, xác nhận, huỷ. Sửa nội dung → chỉ làm mới. **Đối tác:** chỉ làm mới + chấm đếm (giữ ADR-0014 điều 12).
- Làm **trước** ADR-0020. Chủ **duyệt** thêm loại module `KHONG_DB` vào luật kiến trúc.
- **Bảng tin không bao giờ kích hoạt ghi tiền.**

### 1.3 HDV thấy và sửa đơn — ADR-0023 (*proposed*)
Nguồn: `docs/adr/ADR-0023-huong-dan-vien-thay-don-cho-nhan-va-sua-don-da-nhan.md`.
- HDV **chỉ thấy**: đơn **chưa có người phụ trách** (chỉ đủ để quyết nhận — ngày, dịch vụ, số khách, nơi đón; **không** SĐT, **không** tiền) + đơn **mình đang phụ trách** (đủ). Kinh doanh, Kế toán, Quản trị, Toàn quyền (= Giám đốc) thấy tất cả. *(Đảo một phần ADR-0017 — đã nhắc chủ, chủ vẫn quyết.)*
- HDV **sửa** đơn mình phụ trách (số khách, **thêm/bớt dịch vụ**) ở mọi trạng thái trừ huỷ; **chọn lý do trước khi lưu** (chọn nhanh: thêm người / bớt người / đổi dịch vụ / khác) **kể cả đơn nháp**; hệ thống tự ghi lịch sử.
- **Lịch sử chỉnh sửa** ghi tăng/giảm so với bản **đã xác nhận** ("Người lớn: 4 (tăng 2)"); **biên nhận chỉ con số hiện hành**. Nhãn **"Đã sửa"** (không phải trạng thái) + thông báo nổi cho **người lập và Kế toán**.
- Xây trên lỗ đang hở `money.view`, `contact.view` → chỉ duyệt sau ADR-0019.

### 1.4 Hoàn tất đơn + sổ công nợ + chiết khấu + biên nhận — đặc tả + ADR-0024/0025/0026 (*proposed*)
Nguồn: `docs/superpowers/specs/2026-09-25-hoan-tat-don-va-so-ke-toan.md` (§10), **`docs/superpowers/specs/2026-09-25-hoan-tat-phan-bien-tong-hop.md` (§10 — bản thay thế các chỗ sai của đặc tả gốc)**, `docs/adr/ADR-0024…0026`, trang ghép `docs/superpowers/specs/2026-09-25-luot1-hoan-tat-trang-ghep.md`.

**Luồng đơn (chủ chốt):**
```
Chờ xác nhận ──Xác nhận──▶ Đã xác nhận ──Đã giao – đã thu đủ──▶ (khoá + ghi sổ) ──Hoàn thành──▶ Hoàn thành
     └─────────────── Huỷ ───────────────┘
```
- **Xác nhận** (chốt với khách, khoá giá): người lập, Quản trị, HDV đang phụ trách.
- **Đã giao – đã thu đủ**: người đang phụ trách (+ Quản trị/Toàn quyền); **chỉ từ ngày đi trở đi**; **chỉ khi đã thu = phải thu** (giảm giá tại chỗ / bớt khách → sửa đơn trước); **khoá mọi thứ** (sửa, huỷ, điều chỉnh, đổi người phụ trách) và **ghi sổ trong cùng một lô**.
- **Hoàn thành** (Kế toán/Toàn quyền): khi mọi khoản **người khác nợ công ty** về đơn đã về đủ; khoản **công ty còn phải trả** (hoa hồng, nhà cung cấp) theo dõi riêng, **không chặn**.
- Sai sau Hoàn thành: **không mở lại**; Kế toán/Toàn quyền ghi bút toán điều chỉnh có lý do.

**Tiền:**
- Mỗi lần ghi tiền khách trả: bắt buộc **người thu** (HDV tiền mặt, HDV chuyển khoản, Công ty chuyển khoản, đại lý, nhà cung cấp) + **hình thức**. HDV chỉ nợ công ty **phần HDV thu**. "Công ty thu – chuyển khoản" do HDV khai **cần Kế toán xác nhận** mới trừ nợ.
- Đợt 1 có **nộp tiền / trả đối tác–nhà cung cấp / hoàn khách** mức tối thiểu, theo **nguyên tắc thận trọng**.
- **Người hưởng hoa hồng = bên đặt đơn** (không thêm ô "Người giới thiệu" — ADR-0018 đã loại). "Đại lý" = tên gọi chung: **HDV độc lập, Tài xế taxi, Công ty lữ hành, Lễ tân khách sạn** (Cộng tác viên: *giả định* cùng cơ chế, chưa chủ xác nhận). HDV nội bộ không hưởng giá đại lý.
- Mức chiết khấu: mỗi ô **một kiểu** — % trên giá bán **hoặc** số tiền cố định mỗi khách/vé; "mỗi khách" đếm người lớn + trẻ em + người cao tuổi, **không đếm em bé**; dịch vụ theo nhóm 5 người tính theo **lượt**. Mỗi vai bên ngoài tự là một nhóm; gắn được mức riêng cho từng đối tác.
- **Chụp** mức chiết khấu, giá vốn, người bán vào đơn **lúc Xác nhận** (H5) — **trái ADR-0018 điều 11 "lúc gửi đơn"** → ADR-0024…0026 phải ghi rõ là thay câu đó.
- Giảm giá: giá vốn nhà cung cấp tính trên **giá gốc** (Tour Đảo chịu phần mình giảm); đối tác tự giảm thì đối tác chịu (ADR-0018 §11).
- **Loại biên nhận = vai người bán** theo dịch vụ: "Tour Đảo bán" (Vé Hòn Tằm, Tour đảo Nha Trang) / "Tour Đảo làm đại lý" (vé bùn i-resort; phần còn lại i-resort thu). Quyết toán với nhà cung cấp **tự tính, không lên biên nhận**; biên nhận dựng theo **danh sách trắng**; đơn trộn → **một biên nhận chia phần theo người bán**.
- Khách trả dư (bớt khách/huỷ sau khi đã thu): **không chặn**; ghi **phải trả khác** hoặc **thu nhập khác** (lời chủ). Mặc định "phải trả khác" + ai chuyển = *đề xuất của AI*, chờ ADR-0026.

**Ví dụ số đã kiểm cân đối** (đặc tả §5): Hòn Tằm do CTV bán N = 1.000.000, chiết khấu 15% → Tour Đảo giữ 850.000; i-resort N = 600.000, giá vốn 80% = 480.000, hoa hồng lễ tân 100.000, trả trước 200.000 → Tour Đảo giữ **20.000** dù lễ tân hay HDV thu trước. Luật: *phần Tour Đảo giữ = N − giá vốn − hoa hồng*, tính bằng **số đã lưu**.

**Kiến trúc đã chốt về hướng (ba subagent phản biện độc lập):** "đơn đóng băng" thuộc module `orders` (không đặt ở `billing` — tránh vòng phụ thuộc mà test hiện không bắt); module mới `pricing` (chính sách giá), `billing` (sổ), `receipt` (biên nhận); sổ **nợ hai chân** (ai nợ ai) + dòng đảo; ghi sổ **cùng một `db.batch()`** với "Đã giao"; Tour Đảo **phải có hồ sơ** trong Danh bạ (hiện chưa có).

**Còn mở (hỏi chủ khi trình lượt 1):** M1 đợt 1 đơn nào được "Đã giao" (khuyến nghị: chặn đơn có người hưởng tới lượt 2); "Đã giao" có cho **Bán hàng** đang phụ trách không; Cộng tác viên; bảng `order_money_adjustment` có `CASCADE` (thiếu cột dấu vết là **cố ý** theo ADR-0007). **Lượt 1 (ADR-0024…0026) chỉ trình sau khi ADR-0019 lên production.**

### 1.5 Kiểm toán điểm khuất 24/9 — trạng thái
Nguồn: `docs/AUDIT-2026-09-24-DIEM-KHUAT.md` (nhánh `claude/tourdao-sales-audit-62ea81`), `docs/quyen-hoan.json` mục `phat_hien` (trên `main`).
- **DK-T2-01 (CRITICAL)** — HDV lưu số khách làm mất giá thoả thuận: **ĐÃ VÁ, lên production 1.13** (một nguồn tính tiền `storedServiceLines` + hàng rào `src/buildlines-guard.test.ts`, kiểm độc lập ĐẠT, e2e 19/19).
- **Còn mở, hạn 2026-10-05** (quá hạn → `npm test` đỏ): DK-T3-01 (đối tác gọi thẳng API tạo dịch vụ giá tự gõ), DK-T3-02 (Quản trị tự đặt lại PIN không cần PIN cũ), DK-T4-02 (HDV huỷ đơn 2 chạm, không hỏi lại).
- DK-T3-04 (MEDIUM): hàng rào quyền canh theo ô, chưa theo route GET.
- **Luật "chặn còn lại âm" do AI tự thêm nhầm đã GỠ** (chủ chưa duyệt) → việc mở `docs/CHANGE-GUIDE.md` §4 mục 32, xử lý ở sổ/hoàn tiền.

### 1.6 Việc nhỏ được phiên khác bàn giao sang (chưa làm)
- Nhánh `dang-nhap-sat-day-cho-gop` (`af38ba5`): thông tin công ty sát đáy màn Đăng nhập, hết lẹm iPhone 15/16 — chưa lên production; cần đưa lên `main` mới + mục nhật ký.
- `docs/HANDOFF-N1.md` "TRẠNG THÁI TRIỂN KHAI" ghi sai bản (production thật: 1.13).
- 3 lỗi giao diện (nhánh `worktree-kiem-tra-giao-dien`): thiếu nút Quay lại ở `parties.html`/`locations.html`; `web/catalog.ts` không khoá nút khi ghi; `web/feedback.ts:21` thiếu `timeZone`.

### 1.7 Câu hỏi nhỏ đã trả lời
- `/api/locations` = danh mục **địa điểm** dùng chung (lá của đồ thị module); gắn vai với nơi làm việc (ADR-0008) để trả lời "ai giữ vai gì ở đâu"; chủ đã bỏ "HDV theo bến" (ADR-0018) nên ô "Công việc tại đâu" còn cần hay không — **chưa rà**.

---

## 2. Hiến chương kiến trúc lõi (Enterprise OS) — bản của Tour Đảo

Nguồn: **`docs/ARCHITECTURE.md` Phần I** (nhánh `hien-chuong-kien-truc`); đối chiếu từng phần bản mẫu: `docs/superpowers/specs/2026-09-25-hien-chuong-doi-chieu-ban-mau.md`; bản mẫu của chủ: `/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md`, `/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`.

**Vị trí:** `ARCHITECTURE.md` (tầng "Định hình" của bộ 9 tài liệu), **dưới** Hiến pháp chung, **trên** mọi ADR; chỉ được **siết** (Hiến pháp 9.7). Phần II giữ nguyên luật kiến trúc cũ. Bản đồ hiện trạng (mô tả, thua mã): `SYSTEM-DESIGN.md` §17.

**Nội dung (tóm):**
- **Điều 1 — Tư tưởng:** app là sổ trạng thái của công ty; đơn vị hành vi = lệnh → kiểm luật → **một lô ghi nguyên khối** → trạng thái + dấu vết; mô hình dữ liệu là tài sản; chuỗi 7 lớp *Thực tế → Bên & đối tượng → Lệnh → Luật → Giao dịch → Trạng thái + nhật ký → Hình chiếu*.
- **Điều 2 — Bản thể:** bên trước vai (Tour Đảo cũng là một hồ sơ); **bốn loại thứ**: thực thể / vai theo ngữ cảnh / chính sách có ngày hiệu lực / luật tính (phép thử: thêm giá trị không sửa mã → là dữ liệu); điều khoản thương mại gắn vai, không gắn tài khoản; một pháp nhân.
- **Điều 3 — 16 khái niệm lõi K1–K16:** định danh, bên, tổ chức & địa điểm, quyền (Ai × Thao tác × Phạm vi), đối tượng có vòng đời, chứng từ, lệnh, ranh giới giao dịch, luồng/giữ/duyệt, chính sách & chụp, danh mục, nhật ký, hình chiếu tiền, tích hợp, báo cáo, thông báo.
- **Điều 4 — Sự thật & hình chiếu:** trạng thái bền + nhật ký cùng lô (không event sourcing); **tiền là hình chiếu của sự kiện**, truy ngược *báo cáo → dòng sổ → chứng từ → sự kiện → quy tắc → người duyệt*; một sổ quản trị; chứng từ gửi ra ngoài lọc danh sách trắng.
- **Điều 5 — 17 nguyên tắc:** bất biến sát dữ liệu (hai lớp); cấu hình = dữ liệu có kiểu (không flexfield/JSON tự do); modular monolith kể cả tầng SQL; **một nguồn tính tiền**; chỉ-thêm + đảo; chụp tại mốc; **5.7 giữ đối tượng khi thiếu điều kiện**; **5.8 bước của luồng gắn vai trên đối tượng**; **5.9 trả dư → phải trả khác / thu nhập khác**; thông báo không kích hoạt tiền; tác nhân tự động/AI có tài khoản riêng; kiểm toán; nền trước; **5.14 hai trục thời gian + khoá kỳ**; **5.15 lõi tất định, AI không tính tiền**; **5.16 hộp thư đi**; **5.17 sổ vàng**.
- **Điều 6 — Thi hành:** ADR phải ghi điều áp/lệch; **bảng thi hành** mỗi điều: cưỡng chế bằng gì / lệch hiện có (nợ có tên) / nguồn; sửa chỉ do chủ.

**Trạng thái duyệt (cập nhật 2026-09-26):** **ĐÃ DUYỆT toàn bộ** — nguyên tắc, vị trí (phần riêng Tour Đảo ở `ARCHITECTURE.md`; phần chung chuyển vào kho luật gốc `Master-Project-Framework`), 5.7, 5.8, 5.9 (kèm điều chỉnh kế toán), **5.14–5.17**, cho phép sửa `CLAUDE.md` (đã áp). Hai vòng kiểm độc lập (phần siết lại câu P8 làm **sau** vòng hai — **chưa được kiểm lại**); lỗi đã sửa: thay âm thầm ADR-0018 đ11, dẫn nguồn sai nhánh, gọi nhầm "nợ" bảng 0021, **câu `CLAUDE.md` lỡ nới Hiến pháp P8** (đã siết lại: chỉ miễn hỏi lại *nguyên tắc đã duyệt*; áp vào quyết định cụ thể chạm dữ liệu/quyền/tiền/hợp đồng/bất biến **vẫn dừng và hỏi / qua ADR**).

---

## 3. Cấu trúc luật cho mọi dự án & cách hiện thực theo tài liệu Anthropic

Nguồn: đối chiếu §7–§8 (`docs/superpowers/specs/2026-09-25-hien-chuong-doi-chieu-ban-mau.md`).

### 3.1 Hiện trạng trên máy (đo, chỉ đọc)
- **Ba dòng Hiến pháp** cùng tự nhận "áp cho mọi dự án": `Master-Project-Framework` **v2.2.0**; `CoreSchemaProject/playbook` **v2.3.0** (tourdao-sales, pt-hdv ghim; nhatrangtravel, Aquanova còn ghim v2.2.0); `ketoanvn` **v3.1.0** (rẽ nhánh từ v2.2.0, cùng số hiệu P1–P21/N1–N10). ⇒ vi phạm chính N7.
- `Projects/` không phải kho git; chưa có `Projects/CLAUDE.md`, chưa có `~/.claude/CLAUDE.md`. `Master-Project-Framework` **là kho git chỉ chứa luật** (đúng hình dạng làm nguồn).

### 3.2 Đề xuất (chủ quyết; làm ở phiên mở tại kho luật — N4)
```
Projects/
├─ Master-Project-Framework/        kho luật gốc DUY NHẤT (có phiên bản)
│   ├─ CONSTITUTION.md              1. Hiến pháp — CÁCH LÀM VIỆC — mọi dự án
│   ├─ HIEN-CHUONG-HE-THONG.md      2. Hiến chương hệ thống ghi nhận (Enterprise OS) — dự án có dữ liệu/tiền
│   └─ MO-HINH-DU-LIEU-LOI.md       3. Mô hình dữ liệu lõi (khái niệm, độc lập công nghệ)
├─ CLAUDE.md                        vài dòng trỏ kho luật (Claude tự nạp CLAUDE.md thư mục cha)
└─ <dự án>/
    ├─ playbook/                    bản chép CHỈ-ĐỌC, ghim phiên bản + băm
    ├─ docs/ARCHITECTURE.md         chiếu (2)+(3) vào module/bảng của dự án — chỉ siết
    ├─ RANG_BUOC_NGOAI.md      luật, thuế, giới hạn nền tảng (có nguồn, hạn kiểm lại)
    ├─ docs/data-dictionary.json    mô hình dữ liệu CỤ THỂ (test ép khớp schema)
    ├─ migrations/                  schema thật
    └─ CLAUDE.md                    ngắn (< 200 dòng): bản đồ + lệnh + điều cấm
```
- **Không trộn** Hiến chương vào Hiến pháp: hai câu hỏi khác nhau (*làm việc thế nào* / *hệ thống ghi nhận xây thế nào*); trộn thì dự án website mang luật sổ tiền, văn bản dài làm AI kém tuân thủ. **Cùng một kho, ba văn bản, phạm vi ghi rõ.**
- Hợp nhất v2.3.0 + v3.1.0 về `Master-Project-Framework`, thêm nguyên tắc chung của Enterprise OS; các dự án nâng ghim.
- Khi Hiến pháp/Hiến chương chung có điều tương ứng, `ARCHITECTURE.md` của Tour Đảo rút gọn thành "theo … điều X" (tránh hai nguồn).

### 3.3 Hiện thực hoá bằng cơ chế chính thức của Claude Code (tra 2026-09-25)
Tài liệu: memory https://code.claude.com/docs/en/memory.md · best practices https://code.claude.com/docs/en/best-practices.md · settings https://code.claude.com/docs/en/settings.md · plugins https://code.claude.com/docs/en/plugins/overview.md

**Nguyên lý nền (nguyên văn tài liệu):** `CLAUDE.md` là **lời khuyên** — *"Claude treats them as context, not enforced configuration. To block an action regardless of what Claude decides, use a PreToolUse hook instead."*; *"Unlike CLAUDE.md instructions which are advisory, hooks are deterministic."* ⇒ khớp Hiến pháp P16 và Enterprise OS III.3 "lời dặn ≠ cưỡng chế".

| Cơ chế Claude Code | Tầng / phạm vi | Dùng cho điều gì của Hiến pháp/Hiến chương |
|---|---|---|
| `CLAUDE.md` thư mục cha (`Projects/CLAUDE.md`) | tự nạp cho mọi phiên mở **trong** `Projects/` trên máy này | trỏ tới kho luật; lưới an toàn cho dự án mới |
| `~/.claude/CLAUDE.md` | mọi dự án trên máy | (tuỳ chọn) thay cho `Projects/CLAUDE.md` |
| `./CLAUDE.md` của dự án (commit git) | dự án; **thấy cả ở phiên cloud/web** | bản đồ, lệnh, điều cấm; < ~200 dòng |
| `CLAUDE.md` thư mục con / `.claude/rules/` | nạp khi chạm tệp khớp | luật chi tiết theo vùng (`src/CLAUDE.md`, `web/CLAUDE.md` đã làm) |
| **Bản chép ghim** `playbook/` + test băm | trong repo | Hiến pháp/Hiến chương chung — **cần** vì phiên cloud/web không thấy thư mục cha, và để biết đúng phiên bản |
| **Hook `PreToolUse`** (`.claude/hooks/`) | chắc chắn chạy | chặn lệnh ghi hệ thống thật (`guard-remote.mjs`), chặn tự sửa luật (N9) |
| `permissions.deny/ask` (`settings.json`) | gộp theo tầng; `~/.claude/settings.json` áp mọi dự án | lớp 2 của rào lệnh nguy hiểm; rào **dùng chung** có thể đặt cấp máy |
| **Subagent** (`.claude/agents/`) | theo dự án hoặc người dùng | **người kiểm độc lập chỉ đọc** (N8, P15; Enterprise OS "tách người viết và người chấm") |
| Skill | theo dự án/người dùng | quy trình lặp ≥ 3 lần (phát hành, kiểm độc lập) |
| Plugin | đóng gói skill/agent/hook dùng lại nhiều repo | chia sẻ rào + agent giữa các dự án — **không** chứa `CLAUDE.md`, **không nạp ở phiên cloud/web** |
| Test trong `npm test` / trigger CSDL / `audit-invariants` | máy chặn thật | bất biến dữ liệu, một nguồn tính tiền, **sổ vàng** (5.17), "dừng dây chuyền" (`phat-hien-han.test.ts`) |

**Ánh xạ nhanh nguyên tắc → cưỡng chế:** AI không tự duyệt → subagent kiểm độc lập + hook `ask` khi sửa luật · không ghi production → hook + `permissions.deny` · một nguồn tính tiền → `buildlines-guard.test.ts` · bất biến dữ liệu → trigger + `audit-invariants` · sổ vàng → bộ test ca mẫu do chủ/Kế toán xác nhận · trạng thái công việc → tài liệu/nhật ký, không trí nhớ phiên (P19) · rào mới chỉ tính khi **thấy chặn thật một lần** + dòng ở `docs/SO-HANG-RAO.md`.

---

## 4. Bài học của phiên (để không lặp)
1. **Chuyển worktree giữa chừng làm subagent đang chạy bị khoá theo** (mất phần ghi) — chờ subagent xong rồi mới `EnterWorktree`.
2. **AI tự thêm luật chưa được duyệt** vào việc được giao ("chặn còn lại âm") → người kiểm bắt; đã gỡ. Brief thi công chỉ chứa điều chủ đã duyệt.
3. **AI lỡ nới Hiến pháp P8** khi viết câu "không hỏi lại chủ" trong `CLAUDE.md` → người kiểm bắt; đã siết. Mọi câu kiểu "tự áp dụng" phải giữ tiêu chí cấu trúc của P8.
4. **Tài liệu trích trạng thái nhánh cũ** ("chưa lên main" khi đã lên) → luôn kiểm bằng lệnh tại thời điểm viết.
5. **Bẫy "tài liệu thay cho giao hàng"** (Enterprise OS VI.1): phiên này nhiều tài liệu, một bản vá lên production → sau khi chốt Hiến chương, ưu tiên **lát đầu–cuối có sổ vàng**.
6. Bài đo tốc độ `guard-remote` đỏ khi máy bận (load ~9.5) — không phải lỗi mã; chạy lại khi máy rảnh.

---

## 5. Việc tiếp theo (thứ tự khuyến nghị) và câu hỏi đang chờ chủ

**Câu hỏi đã trả lời (chủ dự án 2026-09-26):** (1) **dùng `Master-Project-Framework` làm kho luật gốc duy nhất, hợp nhất phiên bản**; (2) **có** — ba văn bản trong một kho; (3) **duyệt 5.14–5.17**; (4) **có** — đã tạo `RANG_BUOC_NGOAI.md` (gốc repo, 17 dòng, 4 nhóm chưa khảo sát) và Sổ vàng (`golden/hoan-tat-cong-no.json` 7 ca **chờ chủ/Kế toán xác nhận** + `src/so-vang.test.ts`, đã thấy chặn thật). **Còn chờ:**
- Lượt 1 Hoàn tất: M1, "Đã giao" có cho Bán hàng, Cộng tác viên — hỏi khi trình ADR-0024…0026 (sau ADR-0019).
- **Xác nhận 7 ca Sổ vàng** (`golden/hoan-tat-cong-no.json`) — chủ hoặc Kế toán xem từng con số; luật cân đối trong ca là AI đề xuất từ ví dụ của đặc tả.

**Thứ tự làm (sau khi chủ trả lời):**
1. Chủ `day-len` hai nhánh tài liệu (§0).
2. Phiên riêng tại `Master-Project-Framework`: hợp nhất Hiến pháp + soạn Hiến chương hệ thống + Mô hình dữ liệu lõi (dán lời dặn §6).
3. Tour Đảo — **thi công Bảng tin** (ADR-0022, kế hoạch 15 task; việc lớn → kiểm độc lập).
4. Song song: **vá DK-T3-01, DK-T3-02, DK-T4-02 trước 2026-10-05**.
5. **ADR-0019** (tách cổng + route hỏi bảng quyền) → ADR-0017/0023 + ADR-0020.
6. Chủ/Kế toán xác nhận Sổ vàng + phiên khảo sát riêng cho `RANG_BUOC_NGOAI.md` (trước hết L1: sổ công nợ có phải lưu 10 năm) → trình lượt 1 Hoàn tất (ADR-0024…0026, trang ghép) → thi công lát mỏng "Tour Đảo bán" không chiết khấu → lượt 2 (chính sách giá, người bán, nhà cung cấp).
7. Việc nhỏ §1.6 gộp vào một lần phát hành.

---

## 6. Lời dặn để dán vào phiên mới mở tại `Master-Project-Framework`

> Đọc `/Users/tuanbao/Documents/Projects/ctytnhhtourdao/tourdao-sales/.claude/worktrees/hien-chuong-kien-truc/docs/HANDOFF-2026-09-25-BOOKING-VA-HIEN-CHUONG.md` §3 (hoặc bản trên `main` sau khi gộp: `tourdao-sales/docs/HANDOFF-2026-09-25-BOOKING-VA-HIEN-CHUONG.md`). Vai: **lập kế hoạch**, chỉ tài liệu. **Chủ dự án đã duyệt 2026-09-26:** `Master-Project-Framework` là **kho luật gốc duy nhất** cho mọi dự án trong `Projects/`, **hợp nhất phiên bản**; **ba văn bản trong một kho** (Hiến pháp · Hiến chương hệ thống · Mô hình dữ liệu lõi), không trộn — không hỏi lại hai điều này. Việc: (1) so sánh ba dòng Hiến pháp — `Master-Project-Framework/CONSTITUTION.md` v2.2.0, `CoreSchemaProject/playbook/CONSTITUTION.md` v2.3.0, `ketoanvn/CONSTITUTION.md` v3.1.0 — lập bảng khác biệt từng điều và đề xuất **một bản hợp nhất** (chủ duyệt từng điểm khác nhau, không tự chọn); (2) soạn `HIEN-CHUONG-HE-THONG.md` từ `CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md` + `CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`, chỉ phần **dùng chung mọi dự án có dữ liệu/tiền**, độc lập công nghệ, ghi phạm vi áp dụng; lấy Phần I `tourdao-sales/docs/ARCHITECTURE.md` làm ví dụ đã thử; (3) soạn `MO-HINH-DU-LIEU-LOI.md` (khái niệm: Bên–Vai–Quan hệ–Điểm liên hệ–Địa điểm; đối tượng có vòng đời; chính sách có hiệu lực + chụp; nhật ký; sổ hai chân + đảo; chứng từ; bảng tra cứu); (4) đề xuất cách chép bản chỉ-đọc về từng dự án (lệnh chép + băm) và nội dung `Projects/CLAUDE.md`. Không sửa dự án nào khác. Người kiểm độc lập chỉ đọc trước khi trình. Trả lời chủ bằng tiếng Việt có dấu, ngắn, kết luận trước.
