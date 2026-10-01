# Kiến trúc — tourdao-sales (Hiến chương kiến trúc lõi + luật thi hành)

> **Vị trí trong hệ thống luật.** Tệp này là `ARCHITECTURE.md` của bộ tài liệu nền (`playbook/FRAMEWORK.md` Phần 4, tầng 2 "Định hình"): đứng **dưới** Hiến pháp chung (`playbook/CONSTITUTION.md`, bản chép chỉ-đọc từ Core, ADR-0012) và **trên** mọi ADR, quy trình, đặc tả và mã (Hiến pháp Điều 3.1). Theo Hiến pháp 9.7, tệp này **chỉ được siết thêm**, không định nghĩa lại hay nới một điều của Hiến pháp. Nó **không** phải "văn bản chuẩn mực cao nhất": cao nhất là Hiến pháp chung.
>
> **Hai phần, hai tính chất:**
> - **Phần I — Hiến chương kiến trúc lõi** (chuẩn tắc): các nguyên tắc về *mô hình dữ liệu, lõi dùng chung và ranh giới* mà mọi ADR, đặc tả, mã của dự án phải tuân. Mã lệch là lỗi, sửa mã. Mỗi điều có dòng **Hiện trạng / Cưỡng chế / Nguồn** ở bảng thi hành cuối Phần I; điều nào ghi "dựa vào kỷ luật" là **lời khuyên có cam kết**, chưa phải rào chắn (Hiến pháp P16).
> - **Phần II — Luật thi hành** (chuẩn tắc, chi tiết): tầng, chiều phụ thuộc, chuẩn dữ liệu, nơi đặt code — nội dung đã có từ 2026-09-19, giữ nguyên.
>
> **Bản đồ hiện trạng** (lõi nào đang nằm ở module/bảng nào, đạt hay lệch) là tài liệu **mô tả**, thua mã: `docs/SYSTEM-DESIGN.md` §17.
>
> **Nguồn cảm hứng:** bản mẫu "Hiến chương kiến trúc hệ sinh thái ERP doanh nghiệp (tư duy hệ Oracle)" của chủ dự án (`/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/hien-chuong-kien-truc-erp-Oracle.md`) khung "Enterprise OS" của chủ dự án (`/Users/tuanbao/Documents/Projects/CHUNGCATKIENTHUC/ENTERPRISE_FRAMEWORK.md`), và đối chiếu Oracle TCA (`docs/superpowers/specs/2026-09-21-doi-chieu-oracle-tca.md`). Bảng "áp dụng / điều chỉnh / hoãn" từng phần của bản mẫu cho Tour Đảo: `docs/superpowers/specs/2026-09-25-hien-chuong-doi-chieu-ban-mau.md`.
>
> **Cách dùng (cho người và AI):** gặp một câu hỏi thiết kế mới, **tra Phần I trước** (chỉ các điều dòng Trạng thái ghi **đã duyệt**). Điều đã duyệt trả lời được **nguyên tắc** → áp dụng, ghi "theo Hiến chương điều X", **không hỏi lại chủ dự án về nguyên tắc đó**. Áp nguyên tắc vào một quyết định cụ thể chạm dữ liệu, quyền, tiền, hợp đồng giữa các phần hay bất biến **vẫn phải qua ADR/đặc tả do chủ dự án duyệt** (Hiến pháp P8, N3; `CLAUDE.md` §3) — một dòng commit không thay được bản ghi quyết định. Ngoài ra chỉ mang tới chủ dự án khi (a) một điều khoản không đủ để quyết, (b) muốn lệch khỏi một điều khoản (phải có ADR ghi "lệch có chủ ý" + chủ duyệt), hoặc (c) câu hỏi thuộc chiến lược kinh doanh. Sửa Phần I: chỉ chủ dự án; AI chỉ đề xuất bằng diff (Hiến pháp N9).
>
> **Trạng thái:** **ĐÃ DUYỆT** (chủ dự án, phiên chat 2026-09-25 → 2026-09-26): nguyên tắc chung và vị trí (phần **riêng Tour Đảo** ở tệp này; phần **dùng chung mọi dự án** sẽ chuyển vào kho luật gốc `Master-Project-Framework` — Hiến pháp · Hiến chương hệ thống · Mô hình dữ liệu lõi, ba văn bản; điều ở đây chỉ rút thành "theo … điều X" **trong chính commit nâng ghim** lên bản kho luật chứa điều đó (commit do chủ dự án duyệt) — **tới lúc đó Phần I này chi phối dự án này**; khi rút gọn, đối chiếu **từng điều** của Phần I với đúng bản được ghim lúc đó — vế nào của Phần I chặt hơn thì giữ lại làm lớp siết (Hiến pháp 9.7), không giới hạn ở một danh sách điều định sẵn); 5.7, 5.8; 5.9 kèm điều chỉnh kế toán "phải trả khác / thu nhập khác"; **5.14–5.17** (2026-09-26); cho phép sửa `CLAUDE.md` (đã áp, rồi siết lại để không nới P8); dòng "Cưỡng chế bằng" của điều 5.3 ở bảng thi hành — thêm hạng module `KHONG_DB` (2026-09-26, chủ duyệt trong kế hoạch Bảng tin/ADR-0022, không đổi câu chữ điều 5.3); vế "rút gọn" ở trên sửa từ "khi kho đó có điều tương ứng" thành "chỉ trong commit nâng ghim, tới lúc đó Phần I chi phối" (2026-09-27, chủ duyệt Q2 của `docs/superpowers/specs/2026-09-26-ra-soat-ke-hoach-luat-goc.md`); chữ điều **5.12** thêm "số giấy tờ tuỳ thân (căn cước, bằng lái…)" vào những thứ nhật ký không chứa, và bảng thi hành dòng 5.1, 5.12 ghi cơ chế cho giấy tờ của người (2026-09-28, chủ duyệt "Duyệt tất cả, có mục Hiến chương" — `docs/superpowers/plans/2026-09-28-van-chuyen-1a-de-xuat-luat.md` mục 2d, 2e, 2f); bảng thi hành dòng 5.5 (lệch hẹp đơn nháp), 5.3 (tệp nửa nghiêm của `orders`), 5.1 (L-A1) — ADR-0047, chủ duyệt 2026-09-29, `docs/superpowers/plans/2026-09-29-adr-0047-de-xuat-luat.md` mục 2–4.

---

# PHẦN I — HIẾN CHƯƠNG KIẾN TRÚC LÕI

## Điều 1 — Tư tưởng cốt lõi

**1.1 App là sổ trạng thái của công ty, không phải tập màn hình.** Việc của hệ thống là giữ một bản số **đúng và bền** về những gì đã thật sự xảy ra ở Tour Đảo — ai đặt gì, ai lo đơn nào, ai đang giữ tiền của ai — qua thời gian dài, dù nhiều người thao tác cùng lúc.

**1.2 Đơn vị hành vi là một lần chuyển trạng thái hợp lệ.** Mọi thay đổi đi theo đúng một khuôn: **lệnh** (ai muốn làm gì) → **kiểm luật và quyền** → **một lô ghi nguyên khối** (tất cả hoặc không có gì) → **trạng thái mới + dấu vết** ghi cùng lô. Màn hình, API, Cron, trợ lý AI chỉ là nơi **phát lệnh**; không nơi nào được ghi dữ liệu nghiệp vụ bằng đường khác.

**1.3 Mô hình dữ liệu là tài sản; mã là thứ thay được.** Viết mã ngày càng rẻ; cái khó đổi và đáng giữ là cách hệ thống định nghĩa **đối tượng, vai, ranh giới, bất biến và quyền**. Quyết định mô hình dữ liệu vì thế được cân nhắc kỹ hơn quyết định mã.

**1.4 Chuỗi bảy lớp.** Mọi tính năng đi qua đúng chuỗi:
**Thực tế → Bên & đối tượng nghiệp vụ → Lệnh → Luật & chính sách → Giao dịch nguyên khối → Trạng thái bền + nhật ký → Hình chiếu** (sổ tiền, biên nhận, báo cáo, Bảng tin, màn hình).
Không được đi tắt: hình chiếu không bao giờ là nơi *tạo ra* sự thật; màn hình không bao giờ là nơi *tính* tiền.

## Điều 2 — Bản thể: thứ gì là gì

**2.1 Bên trước vai (ADR-0001).** Mỗi con người hoặc tổ chức ngoài đời là **một hồ sơ** (`pty_party`), tồn tại trước và độc lập với mọi vai. Khách hàng, đối tác, nhà cung cấp, nhân viên chỉ là **vai** hồ sơ đó đóng trong một khoảng thời gian. Cấm tạo bảng "danh sách khách", "danh sách nhà cung cấp"… riêng làm trùng một người/tổ chức. **Chính Tour Đảo cũng là một hồ sơ tổ chức** (bên bán, bên được nợ trong sổ); không viết cứng định danh công ty trong mã — tra qua **một** hàm công bố.

**2.2 Bốn loại thứ, bốn chỗ ở.** Mỗi khái niệm mới phải được xếp vào đúng một loại trước khi thiết kế bảng:

| Loại | Là gì | Ví dụ ở Tour Đảo | Ở đâu |
|---|---|---|---|
| **Thực thể** | tồn tại độc lập, có mã riêng, sống lâu | hồ sơ, đơn, dòng dịch vụ, mã dịch vụ, lần thu tiền, dòng sổ | bảng của module chủ |
| **Vai theo ngữ cảnh** | "ai đứng ở vị trí nào trong việc này" | bên đặt, người phụ trách, người bán ghi trên biên nhận, nhà cung cấp của dòng, người thu tiền | khoá ngoại tới hồ sơ trên đối tượng, hoặc bảng vai có hiệu lực |
| **Chính sách** | con số / lựa chọn đổi theo thời gian | mức chiết khấu, tỷ lệ giá vốn, người bán theo dịch vụ, hình thức thu | dòng dữ liệu có **ngày hiệu lực** |
| **Luật tính** | cách từ dữ liệu ra kết quả | chọn mức cụ thể nhất, làm tròn, sinh dòng sổ, bất biến cân đối | hàm thuần trong mã, có test |

Phép thử: **thêm một giá trị mới mà không phải sửa mã → là dữ liệu** (bảng tra cứu, dòng chính sách). Mã phải rẽ nhánh theo giá trị → tập đóng (`CHECK`) và đổi bằng ADR.

**2.3 Điều khoản thương mại gắn vào vai/hồ sơ, không bao giờ gắn vào tài khoản đăng nhập** (ADR-0018 điều 1). Tài khoản là **cách đăng nhập** của một người; con người là hồ sơ; việc họ làm là vai (ADR-0013, ADR-0018).

**2.4 Tổ chức.** Tour Đảo hôm nay là **một pháp nhân**. Trục đơn vị kinh doanh / phòng ban **chưa dựng**; khi cần, dựng thành vai/quan hệ của hồ sơ tổ chức, không thành cây thư mục cứng. Nơi chốn (văn phòng, quầy, bến) là **địa điểm** (`loc_location`), vai được gắn với nơi khi cần (ADR-0008).

## Điều 3 — Lõi dùng chung (kernel)

Lõi là "hệ điều hành" của app: các khái niệm **mọi module dùng chung, không module nào tự làm lại**. Tour Đảo có 16 khái niệm lõi (điều chỉnh từ 18 của bản mẫu):

| # | Khái niệm lõi | Ở Tour Đảo nghĩa là |
|---|---|---|
| K1 | **Định danh** | tài khoản, phiên, Face ID. Mọi tác nhân tự động ghi thay người dùng (kể cả AI) có **tài khoản riêng**, đi qua API có phiên như người (ADR-0010 điều 3) |
| K2 | **Bên** | hồ sơ người/tổ chức + vai + quan hệ + điểm liên hệ (ADR-0001) |
| K3 | **Tổ chức & địa điểm** | Tour Đảo là hồ sơ tổ chức; địa điểm (ADR-0008) |
| K4 | **Quyền = Ai × Thao tác × Phạm vi** | một bản đồ (`src/shared/permissions.ts`), phạm vi `any / own / assigned / ownOrAssigned`; **mọi route hỏi bản đồ bằng `can()`** (ADR-0007, ADR-0019) |
| K5 | **Đối tượng nghiệp vụ có vòng đời** | đơn, phân công, ticket Góp ý… — mỗi thứ có tập trạng thái và luật chuyển |
| K6 | **Chứng từ** | bản trình bày một phiên bản đối tượng cho người ngoài (biên nhận gửi khách) — dựng từ **danh sách trường được phép** |
| K7 | **Lệnh + kiểm luật** | route nhận lệnh, kiểm quyền và luật **trước** khi ghi |
| K8 | **Ranh giới giao dịch** | **một `db.batch()`** = tất cả hoặc không; câu phụ thuộc mang điều kiện "câu chính đã thắng" |
| K9 | **Luồng trạng thái, giữ, duyệt** | bước của luồng, **giữ đối tượng** khi thiếu điều kiện, cổng duyệt |
| K10 | **Chính sách & luật** | chính sách có ngày hiệu lực; **chụp** vào đối tượng tại mốc cố định |
| K11 | **Danh mục tham chiếu** | danh mục dịch vụ (đồng bộ Sheet), bảng tra cứu, địa điểm |
| K12 | **Nhật ký kiểm toán / sự kiện** | `audit_log` chỉ-thêm: ai, làm gì, lúc nào, lý do; bản trước→sau khi có |
| K13 | **Hình chiếu tiền** | sổ công nợ **sinh từ sự kiện theo luật**, mỗi dòng trỏ về nguồn |
| K14 | **Hợp đồng tích hợp** | Google Sheet, Cloudflare, email — chạy lại không sinh trùng (lặp an toàn) |
| K15 | **Báo cáo** | đọc qua view công bố / hình chiếu, không đọc bảng gốc module khác |
| K16 | **Thông báo** | Bảng tin (ADR-0022, đã duyệt 2026-09-25) — hình chiếu cho màn hình, **không bao giờ là nguồn sự thật hay nơi kích hoạt tiền** |

Mỗi khái niệm lõi có **đúng một chỗ sống** (module hoặc `src/shared/`). Module nghiệp vụ dùng lõi qua `index.ts`, không làm bản riêng.

## Điều 4 — Sự thật và các hình chiếu

**4.1 Sự thật = trạng thái bền + nhật ký ghi cùng lô.** Không dựng "event sourcing" (dựng lại trạng thái từ chuỗi sự kiện). Trạng thái hiện hành nằm trong bảng; mỗi lần chuyển trạng thái ghi **dòng nhật ký chỉ-thêm trong cùng lô**, đủ để truy ai/lúc nào/vì sao.

**4.2 Tiền là hình chiếu của sự kiện nghiệp vụ.** Sổ công nợ **không** phải nơi người dùng "nhập tiền tay"; nó được **sinh** từ sự kiện (đã giao, đã thu, hoàn, điều chỉnh) bằng luật cố định, trong cùng lô với sự kiện. Mỗi con số truy ngược được trọn chuỗi: **báo cáo → dòng sổ → chứng từ (đơn, lần thu) → sự kiện → quy tắc đã áp (mã quy tắc + bản chụp) → người làm/duyệt**. Sai → **ghi dòng đảo**, không sửa, không xoá. Bất biến cân đối kiểm bằng `audit-invariants`.

**4.3 Một sổ.** Tour Đảo giữ **một sổ quản trị nội bộ**. Sổ thuế / chuẩn mực kế toán nhà nước, nhiều sổ song song: **chưa làm** (ADR-0004 loại thuế); khi cần, thêm thành hình chiếu mới từ cùng sự kiện, không sửa sổ cũ.

**4.4 Chứng từ gửi ra ngoài là hình chiếu có lọc.** Biên nhận/phiếu gửi khách dựng từ **danh sách trường được phép**, ở máy chủ; không nhận cả đối tượng rồi "bỏ bớt". Không bao giờ chứa giá vốn, chiết khấu, hoa hồng, công nợ nội bộ.

**4.5 Nhân sự.** Con người (hồ sơ) tách khỏi tài khoản đăng nhập và khỏi vai làm việc; nghỉ việc = đóng vai + ngưng tài khoản, không xoá người (ADR-0013).

## Điều 5 — Nguyên tắc kỹ thuật và rào chắn

**5.1 Bất biến nằm sát dữ liệu, và có hai lớp.** Luật "phải luôn đúng" (toàn vẹn, trạng thái chỉ đi tiến, tiền đã chốt không đổi) được giữ ở **cơ sở dữ liệu** (khoá, `CHECK`, trigger, điều kiện trong câu ghi) **và** ở mã — không bao giờ chỉ ở giao diện (Hiến pháp P21).

**5.2 Cấu hình bằng dữ liệu có kiểu, không bằng mã, không bằng JSON tự do.** Điều doanh nghiệp hay đổi (mức, tỷ lệ, người bán, loại hình) là **dòng dữ liệu có ngày hiệu lực** trong bảng có cột rõ kiểu (ADR-0003). **Không** dùng cơ chế "trường mở rộng tự do" (flexfield/JSON không lược đồ) cho dữ liệu nghiệp vụ.

**5.3 Modular monolith (ADR-0002).** Mỗi module sở hữu bảng của mình, chỉ nó ghi; module khác đọc qua **view công bố**, gọi qua `index.ts`; ghi chung giao dịch bằng **câu lệnh chưa chạy** do module chủ cấp. Đồ thị phụ thuộc chỉ đi xuống, không vòng — **kể cả ở tầng SQL**: trigger của một module chỉ đọc bảng của chính nó hoặc view công bố. Chi tiết: Phần II.

**5.4 Tiền: một nguồn tính duy nhất.** Tiền là `INTEGER` VNĐ, **chỉ tính ở máy chủ**, không tin số từ trình duyệt. Mỗi con số dẫn xuất có **đúng một hàm** tính nó, mọi đường (lập, sửa, đọc, chứng từ) đi qua hàm đó, có hàng rào chặn đường tính thứ hai. (Bài học DK-T2-01, 2026-09-25: hai đường tính cho cùng dòng tiền → mất giá thoả thuận.)

**5.5 Chỉ-thêm và đảo; mọi bảng có dấu vết.** Bảng sổ, nhật ký, điều chỉnh là **chỉ-thêm**, sai thì ghi dòng đảo. **Mọi dòng dữ liệu nghiệp vụ truy được ai tạo / lúc nào** — bằng cột dấu vết trên chính bảng (bảng chỉ-thêm ghi phần "sửa" bằng phần "tạo" và bị trigger cấm sửa), **hoặc** bằng nối một-một với dòng `audit_log` qua khoá chung khi ADR đã chọn như vậy (ADR-0007 điều 2: `order_money_adjustment`); không `CASCADE`; không xoá cứng — đóng hiệu lực hoặc `active = 0` (ADR-0003). Bảng cũ lệch điều này là **nợ có tên**, sửa khi được chạm.

**5.6 Chụp tại mốc.** Chính sách áp cho một đối tượng được **chụp** (lưu bản sao con số + nguồn quy tắc) vào đối tượng tại **một mốc cố định do ADR của nghiệp vụ đó quy định**; đổi chính sách sau mốc không đổi đối tượng đã chụp. Hiến chương **không** tự đặt mốc cho nghiệp vụ nào; đổi mốc đã ghi trong một ADR đã duyệt (vd ADR-0018 điều 11: chiết khấu chụp "lúc gửi đơn") phải bằng ADR mới ghi rõ câu bị thay.

**5.7 Giữ đối tượng khi thiếu điều kiện** *(nguyên tắc mới — chủ dự án duyệt riêng; áp vào nghiệp vụ cụ thể bằng ADR có trang ghép)*. Một đối tượng thiếu cài đặt bắt buộc cho bước kế tiếp (vd chưa có mức chiết khấu cho bên đặt, chưa có người bán cho dịch vụ) **không bị chặn im lặng và không được đoán**: nó bị **giữ** ở bước hiện tại, hiện rõ lý do giữ và ai phải xử lý; xử lý xong thì được thả. Không bao giờ "lấy 0 cho tiện" với số tiền.

**5.8 Bước của luồng gắn với vai trên đối tượng** *(nguyên tắc mới — chủ dự án duyệt riêng; ô quyền cụ thể vẫn quyết ở ADR)*. Quyền làm một bước (nhận đơn, xác nhận, đã giao, hoàn thành) được xét theo **vai của người đó trên chính đối tượng** (người lập, người phụ trách, bên đặt…) kết hợp mức quyền (K4), không theo loại tài khoản đơn thuần.

**5.9 Trả dư thành khoản chờ hoàn** *(nguyên tắc mới — chủ dự án duyệt riêng; luồng hoàn tiền cụ thể quyết ở ADR của sổ tiền)*. Khi đối tượng giảm giá trị sau khi đã thu tiền (khách bớt người, huỷ), hệ thống **không chặn** thao tác phản ánh thực tế; phần dư được ghi vào sổ theo góc độ kế toán là **phải trả khác** hoặc **thu nhập khác** (chủ dự án 2026-09-25: "Có thể đưa vào thu nhập khác hoặc phải trả khác (theo góc độ kế toán)"). *Đề xuất của AI, chờ chủ xác nhận ở ADR sổ tiền (ADR-0026):* mặc định "phải trả khác" cho tới khi hoàn, chỉ chuyển "thu nhập khác" bằng dòng sổ có lý do — theo nguyên tắc thận trọng chủ đã chọn cho sổ tiền; điều kiện chuyển và ai được làm (ô quyền) quyết ở ADR đó.

**5.10 Thông báo không bao giờ kích hoạt tiền.** Ghi tiền xảy ra **trong cùng lô** với sự kiện sinh ra nó; thông báo (Bảng tin, email) chỉ chạy **sau** khi lô đã thành công. Được phép thất lạc hay phải giữ để gửi lại: theo 5.16.

**5.11 Tác nhân tự động và AI.** Có tài khoản riêng, quyền riêng, gọi qua route có kiểm quyền như người; không ghi thẳng vào cơ sở dữ liệu; không tự chạy lệnh ghi lên hệ thống thật (ADR-0010 điều 3; `CLAUDE.md` §8).

**5.12 Kiểm toán là tính năng lõi.** Mọi thay đổi dữ liệu nghiệp vụ để lại: ai (người hay tác nhân), làm gì, lúc nào, lý do (khi luật đòi), bản trước→sau (khi có). Nhật ký không chứa số điện thoại, email, mã số thuế, **số giấy tờ tuỳ thân (căn cước, bằng lái…)**.

**5.13 Nền trước, tính năng sau.** Thứ tự xây: định danh & quyền → bên & tổ chức → danh mục & chính sách → đối tượng nghiệp vụ & luồng → hình chiếu tiền → báo cáo & thông báo. Tính năng không được xây trên một lõi còn hở mà không ghi "xây trên lỗ đang hở" (CLAUDE.md §3).

**5.14 Hai trục thời gian; khoá kỳ.** Mọi dòng tiền ghi **ngày phát sinh** (ngày dân sự VN, khi việc xảy ra) tách khỏi **thời điểm ghi nhận** (UTC, khi hệ thống ghi). Sổ tiền có **kỳ**; kỳ đã khoá thì không ghi thêm vào kỳ đó — sai sót ghi vào kỳ đang mở bằng dòng điều chỉnh/đảo. *(từ Enterprise OS)*

**5.15 Lõi tất định tính tiền; AI không bao giờ tính tiền.** Số tiền, chiết khấu, công nợ chỉ do **mã tất định có test** tính. AI (trợ lý, tác nhân) chỉ đề xuất, trích xuất, giải thích; không tự ra con số tài chính và không ghi số tiền trừ khi đi qua đúng lệnh + luật như người (5.11). *(từ Enterprise OS)*

**5.16 Việc bên ngoài chạy sau giao dịch (hộp thư đi).** Gọi hệ thống ngoài (email, thông báo, sau này hoá đơn điện tử, ngân hàng) **không nằm trong lô ghi**; lỗi bên ngoài không làm hỏng giao dịch nội bộ. Việc bên ngoài **quan trọng** phải để lại trạng thái chờ trong CSDL (vd `notified_at` NULL = chưa gửi) để **thấy được và gửi lại được** (hôm nay: hiện cờ "chưa gửi được" cho người xử lý, gửi lại bằng tay — chưa có hàng đợi tự thử lại); việc **không quan trọng** (Bảng tin) được phép thất lạc. *(từ Enterprise OS: transactional outbox)*

**5.17 Sổ vàng cho mọi luật tiền.** Mỗi luật sinh ra tiền (giá dòng, chiết khấu, giá vốn, công nợ, hoàn) có **bộ ca mẫu** đầu vào + đáp án **đúng đến từng đồng**, do chủ dự án hoặc Kế toán xác nhận, chạy trong `npm test`. Mã tiền chỉ được nhận khi qua **100%** ca sổ vàng. *(từ Enterprise OS: golden dataset)*

## Điều 6 — Thi hành và sửa đổi

**6.1** Mỗi ADR/đặc tả mới ghi **điều nào của Hiến chương nó áp** và, nếu lệch, ghi "lệch có chủ ý: điều X, vì …" — chỉ hợp lệ khi chủ dự án duyệt.

**6.2** Mỗi điều có một dòng ở **bảng thi hành** dưới đây. Điều chưa có cơ chế cưỡng chế ghi "dựa vào kỷ luật" và có hướng dựng rào (P16). Rào mới chỉ được coi là hoạt động khi đã **thấy chặn thật một lần** và có dòng ở `docs/SO-HANG-RAO.md`.

**6.3** Chỗ mã hiện lệch Hiến chương (cột "Lệch hiện có") là **nợ có tên**: không làm mới thêm lệch cùng loại; sửa khi chạm vùng đó hoặc theo lịch trong `docs/quyen-hoan.json`.

**6.4** Sửa Phần I: chỉ chủ dự án; AI đề xuất bằng diff trên nhánh (Hiến pháp N9, Điều 9). Mỗi lần sửa ghi ngày và lý do ở dòng "Trạng thái" đầu tệp.

### Bảng thi hành (Hiện trạng / Cưỡng chế / Nguồn) — cập nhật 2026-09-25

| Điều | Cưỡng chế bằng | Lệch hiện có (nợ có tên) | Nguồn |
|---|---|---|---|
| 1.2 Lệnh → một lô ghi | `route-write-guard.test.ts` (đường ghi hỏi quyền); còn lại dựa vào kỷ luật | — | ADR-0002 |
| 1.4 Không đi tắt chuỗi | dựa vào kỷ luật | biên nhận hôm nay dựng ở trình duyệt từ cả đơn (`src/shared/order-confirmation.ts:220`) | — |
| 2.1 Bên trước vai; Tour Đảo là hồ sơ | `architecture.test.ts` (tiền tố, khoá ngoại); hồ sơ công ty chủ (vai `OWNER_COMPANY`, migration 0030): bốn trigger "đúng một, không lúc nào trống, đổi được, ngày bắt đầu = hôm nay" (ADR-0043) + kiểm `R-PTY-1` + hàm công bố `ownerCompany` + test route `src/modules/parties/cong-ty-chu.test.ts` | địa chỉ ở chân trang đăng nhập vẫn là chữ tĩnh (6.2 duyệt hai trường); `company_profile` chưa thu hồi (cột pháp lý đã chết, còn câu giữ chỗ `find_logo` — nợ R1/D4); lớp CSDL KHÔNG canh "ai được đổi công ty chủ" (chỉ route) | ADR-0001, ADR-0024 điều 6 (+ ADR-0043) |
| 2.2 Bốn loại thứ | dựa vào kỷ luật (rà ở kiểm độc lập) | — | ADR-0003 |
| 2.3 Điều khoản trên vai, không trên tài khoản | dựa vào kỷ luật | — | ADR-0018 đ1 |
| K4 / 5.8 Quyền qua `can()` | `permission-enforcement.test.ts`, `route-write-guard.test.ts` + sổ hoãn `quyen-hoan.json` | các ô/route còn hoãn trong `docs/quyen-hoan.json` (hạn 15/10, 30/11, 31/12); hàng rào canh theo ô, chưa theo route GET (phát hiện DK-T3-04, mức MEDIUM, `docs/AUDIT-2026-09-24-DIEM-KHUAT.md` trên nhánh `claude/tourdao-sales-audit-62ea81`) | ADR-0007, ADR-0019 |
| 4.2 / 5.5 Chỉ-thêm, đảo | trigger `audit_log_no_update/delete` (0017), trigger chặn sửa/xoá `order_money_adjustment` (0021) | `order_money_adjustment` có `ON DELETE CASCADE` (0021:7) — lệch 5.5; (không có cột dấu vết là **cố ý**, nối `audit_log` theo ADR-0007 điều 2 — đạt); sổ công nợ chưa có; **lệch có chủ ý hẹp (ADR-0047, chủ duyệt 2026-09-29):** chặng đưa đón và danh sách hành khách của **đơn nháp** xoá–chèn lại khi lưu nháp — ngoại lệ có tên `XOA_CUNG_NHAP` (`src/architecture.test.ts`), trigger `ord_*_no_delete` cấm xoá khi đơn không còn nháp | ADR-0003, ADR-0007, ADR-0047 |
| 4.4 Chứng từ danh sách trắng | dựa vào kỷ luật | như 1.4 | — |
| 5.1 Bất biến sát dữ liệu | trigger 0008 (khoá dịch vụ), 0017 (trạng thái chỉ đi tiến), `audit-invariants` | khoá tiền đơn đã xác nhận **chỉ ở mã** (đặc tả 2026-09-22 bước B chưa làm); sửa sai giấy tờ phải có lý do (ADR-0040) chỉ ở mã — lý do nằm trong nhật ký, CSDL không có cột để kiểm; danh sách hành khách nhiều hơn số khách hiệu lực chỉ gắn cờ ở mã + kiểm định kỳ `R-ORD-9` (L-A1 của ADR-0047 — số khách sau sửa nằm trong JSON) | ADR-0003 |
| 5.3 Modular monolith | `architecture.test.ts` (import, cạnh, view, `EXPLAIN` SQL module nghiêm; từ 2026-09-26 quét thêm hạng `KHONG_DB` — module không dùng cơ sở dữ liệu, hôm nay chỉ `bangtin`) | module `LEGACY` (`accounts`, `audit`, `catalog`, `orders`) — riêng `orders` có tệp "nửa nghiêm" `orders/chang-hanh-khach-repo.ts` (ADR-0047) chịu bài EXPLAIN, trừ lính gác đọc `audit_log` (nợ có hạn `DOC_AUDIT_LOG_WONGUARD`); trigger đọc chéo module **chưa có bài kiểm**; riêng trigger `vc_` của 0041/0042 có bài "thân trigger chỉ đọc `vc_` + view công bố" (ADR-0049) | ADR-0002, ADR-0008, ADR-0047 |
| 5.4 Một nguồn tính tiền | `buildlines-guard.test.ts` (thấy chặn 2026-09-25) + test hành vi | — | DK-T2-01 |
| 5.6 Chụp tại mốc | giá dịch vụ chụp lúc lập (`order_item.catalog_price/unit_price`) | mức chiết khấu/giá vốn chưa có | ADR-0018 đ11 |
| 5.7 Giữ đối tượng | lần áp đầu: chuyến xe (ADR-0049) — kiểu `LyDoGiu` (`src/shared/ly-do-giu.ts`) một chỗ + `kiemXuatBen` dùng chung máy chủ/màn hình + trigger LC-05 | — | *(mới)* |
| 5.9 Trả dư → chờ hoàn | **chưa có** | giảm khách dưới tiền trả trước hôm nay để "còn lại" âm, không có chỗ ghi hoàn (`docs/CHANGE-GUIDE.md` §4 mục 32) | *(mới)* |
| 5.10 Thông báo không kích hoạt tiền | dựa vào kỷ luật (hàng rào khi thi công Bảng tin) | — | ADR-0022 |
| 5.11 Tác nhân tự động | hook `guard-remote.mjs` + `permissions.deny` (lệnh ghi hệ thống thật) | tác nhân ghi thay người chưa tồn tại | ADR-0010 đ3 |
| 5.12 Kiểm toán | `audit-actions.ts` (một nguồn tên hành động); không ghi SĐT: dựa vào kỷ luật; **không ghi số giấy tờ của người** (ADR-0040 D2): `src/giay-to-khong-lo-so.test.ts` (chạy mọi route giấy tờ rồi quét nhật ký) + kiểm `R-PTY-4` sau triển khai | nhật ký cũ trên production còn SĐT (`staff_updated` trước 21/9) | Hiến pháp P5, ADR-0040 |
| 5.13 Nền trước | luật "dừng dây chuyền" (`phat-hien-han.test.ts`, `quyen-hoan.json`) | — | CLAUDE.md §3 |
| 5.14 Hai trục thời gian; khoá kỳ | **chưa có** | sổ tiền chưa có; bảng hiện có dùng `created_at` + ngày dân sự riêng lẻ | Enterprise OS |
| 5.15 Lõi tất định | tiền chỉ tính ở máy chủ (`buildlines-guard.test.ts`); AI không tính tiền: trợ lý Hỗ trợ chỉ đọc hướng dẫn, không đọc dữ liệu nghiệp vụ (ADR-0066 điều 3) + **máy chủ ẩn số tiền ở mọi câu trả lời của trợ lý trước khi trả và lưu** (`anSoTien`, `src/shared/tro-ly-loc-tien.ts` — ADR-0073 Đ7a, từ 2026-10-01; hàng rào (e) ở `docs/SO-HANG-RAO.md`) | lọc theo mẫu nhận diện: số kèm đơn vị tiền và dãy nhiều nhóm nghìn; số trần không đơn vị, số viết bằng chữ không bắt; phạm vi chỉ trợ lý | Enterprise OS, ADR-0073 |
| 5.16 Hộp thư đi | Góp ý: email trong `waitUntil` + `notified_at` NULL làm hàng chờ (dựa vào kỷ luật) | — | Enterprise OS, ADR-0022 |
| 5.17 Sổ vàng | `golden/` + `src/so-vang.test.ts` (kiểm **nhất quán nội tại** của từng ca: tổng thu = giá bán, nợ mỗi bên = đã thu − được hưởng, phần Tour Đảo giữ = giá bán − giá vốn − hoa hồng); test hành vi tiền hiện có (`gia-thoa-thuan.test.ts`…) | các ca **chờ chủ/Kế toán xác nhận**; **chưa chạy trên mã sổ** (sổ công nợ chưa có) | Enterprise OS |

---

# PHẦN II — LUẬT THI HÀNH (ranh giới, dữ liệu, nơi đặt code)

> Từ phiên rà soát 2026-09-19 (`docs/AUDIT-FINDINGS.md`), đã thi công theo `docs/REFACTOR-PLAN.md` (chủ dự án duyệt 2026-09-19). Mô tả **hiện trạng**; mã lệch khỏi đây là lỗi cần sửa.
>
> **Bộ tài liệu nền (2026-09-21):** `CLAUDE.md` (cổng vào, quy tắc bắt buộc) · **tệp này = LUẬT kiến trúc** (Phần I: hiến chương; Phần II: ranh giới, dữ liệu, nơi đặt code) · `docs/SYSTEM-DESIGN.md` = thiết kế hệ thống (topology, luồng, API, quyền, dữ liệu, giao diện; §17 bản đồ lõi) · `docs/CHANGE-GUIDE.md` = cẩm nang "muốn đổi X thì sửa những đâu". Sửa cấu trúc → cập nhật cả bốn nơi liên quan trong cùng commit.

## Các tầng và chiều phụ thuộc (chỉ đi xuống, không vòng)

```
src/index.ts            gốc lắp ráp: danh sách module, nối auth vào router, Cron
   │
src/modules/<tên>/      module nghiệp vụ: accounts, orders, catalog, audit, locations, parties (kể cả HỒ SƠ CÔNG TY CHỦ — Tour Đảo, vai `OWNER_COMPANY`, hàm công bố `ownerCompany`; nhà xe đối tác — vai `CARRIER`, quan hệ `DRIVES_FOR`, luật "tài xế thuộc nhà xe" công bố một lần ở view `v_pty_carrier_driver` và hàm `nhaXeDangHopTac` (ADR-0048); tài xế cho điều phối xe — hàm `taiXeChoDieuPhoi` (loại công ty / nhà xe, nhà xe đang thuộc, giấy tờ hiện hành KHÔNG số, không nơi cấp; "vai đang mở" = chưa kết thúc, cùng cách với quyền tài khoản — ADR-0049); nằm DƯỚI `auth`, `staff`, `company` trong đồ thị), company (route `GET /api/company` = danh sách trắng năm trường cho biên nhận, đọc định danh qua `parties.ownerCompany`; bảng `company_profile` chỉ còn `logo_url`, chờ thu hồi), dispatch (người phụ trách đơn — bảng `dsp_*`; `orders` KHÔNG import nó, gốc lắp ráp tiêm hàm vào `ctx`), maintenance (chế độ bảo trì chỉ chủ dự án dùng được — bảng `mnt_setting`, route `/api/maintenance`; `auth` và `accounts` chỉ đọc trạng thái của nó, router nhận cổng chặn do gốc lắp ráp tiêm — `AppOptions.injected.maintenanceBlock`), feedback (Góp ý / Báo lỗi — bảng `fbk_*`, route `/api/feedback*`, trang `/feedback`; chỉ import `staff` (nhãn) và `audit`), van-chuyen (Vận chuyển lượt 1a, ADR-0040; nhà xe, ADR-0048; Bảng điều phối, ADR-0049, ADR-0050 — bảng `vc_*` (xe, giấy tờ xe, danh mục, ngưỡng; chuyến, ai lái, điểm dừng, suất, sự kiện nối 1-1 `audit_log` có giờ ghi nhận + giờ xảy ra, bản chụp xuất bến, bản chốt danh sách; chính sách điều phối, điều kiện xuất bến, hạng bằng, lý do), route `/api/van-chuyen/*`; lịch chung là HÌNH CHIẾU dựng lúc đọc (không bảng); đọc `orders` qua hàm hẹp `lichChungChang` (kèm khoá so sánh nơi, không hiển thị), `hanhKhachChoChuyen`, `lienHeChoTaiXe` (chỉ trong thân route sau `can()`) và view `v_ord_leg_key`, `v_ord_order_flag`, `v_ord_passenger_key`, `v_ord_passenger_row` (trigger); `locations` qua khoá ngoại + `v_loc_location_label`; `parties` qua `ownerCompany`, `expiringDriverDocuments`, `nhaXeDangHopTac`, `taiXeChoDieuPhoi` và view `v_pty_*`; công bố `mocToiThieuHienHanh` cho gốc lắp ráp tiêm vào `orders`; không module nào import nó)
   │   ↳ chỉ import module khác qua index.ts của nó
src/modules/auth, staff năng lực nền: phiên, đăng nhập, tài khoản + quyền app (accounts dùng trực tiếp); staff không có route. Cả hai đọc `parties` (staff: hồ sơ của tài khoản; auth: tên + MST công ty chủ cho `GET /api/auth/config`)
   │
src/shared/             router, http, contracts (kiểu API), audit-actions, order-lines… — không import module nào; web/ được import
```

1. **Module khác chỉ import `index.ts`** của module đó. Không chạm `repository.ts`, `rules.ts`… của module khác. Cạnh `orders → catalog` chỉ qua hàm công khai `getEffectiveServices` (giá hiệu lực + cờ `visible`); `GET /api/catalog` dùng cùng nguồn `toEffective` để lọc "đang hiện" — không có hai nguồn "giá hiệu lực". Đồ thị vẫn không vòng (`catalog` không import `orders`).
2. **Kiểm quyền không phải là phụ thuộc**: route khai `access: "public" | "staff" | "office" | "admin"` (`office` = mọi quyền trừ chỉ-FIELD; `admin` = quyền ADMIN); router ở gốc lắp ráp xác thực rồi đưa `ctx.staff` (có `permissions`) vào handler. Bản đồ quyền → thao tác (ADR-0007) nằm ở MỘT nơi: `src/shared/permissions.ts` (`can(staff, op, ctx)`). Module không import `auth` chỉ để lấy `requireStaff/requireAdmin`. Nhờ vậy `audit` không còn phụ thuộc gì và `auth` sau này ghi nhật ký được mà không tạo vòng. Phạm vi "được giao" (`assigned`) đi cùng cách đó: `dispatch` cung cấp hàm, gốc lắp ráp `src/index.ts` tiêm vào `ctx` (`AppOptions.injected` → `ctx.isAssigned(orderId)`, `ctx.newOrderHandler(staffId)`), `orders` gọi mà không import `dispatch` (dispatch → orders là chiều được phép; chiều ngược lại là vòng) và truyền kết quả vào `can(who, op, { ownerId, assigned })`.
3. **Ghi dữ liệu**: chỉ module chủ ghi bảng của mình. Module khác muốn ghi cùng giao dịch thì nhận **câu lệnh D1 chưa chạy** từ `index.ts` của module chủ (`auditStatement`, `createAccountStatements`…) rồi gộp vào một `db.batch()`.
4. **Đọc xuyên module**: chỉ để lấy nhãn hiển thị (tên nhân viên, mã đơn, tên hồ sơ, tên nơi) và **chỉ qua view công bố** `v_<tiền tố>_<tên>` của module chủ (`v_stf_staff_label`, `v_pty_party_label`, `v_loc_location_label`, `v_ord_order_label`, `v_dsp_order_handler`) — chỉ-đọc, chỉ khoá + nhãn + cờ, danh sách cột nằm trong sổ dữ liệu. Không JOIN thẳng bảng gốc của module khác, không ghi, không dựa vào cột nội bộ. Ngoại lệ có hạn: `wonGuard` của `orders` đọc `audit_log` (tới N2).
5. **`src/shared/`** không import từ `src/modules/`. Kiểu/hằng dùng chung giữa server và `web/` nằm ở `src/shared/contracts.ts` và `src/shared/audit-actions.ts` — một nguồn, không chép tay.

## Chuẩn dữ liệu và kiểm máy (ADR-0002, ADR-0003, N1)

- **Sổ dữ liệu** `docs/data-dictionary.json` là nguồn sự thật: mọi bảng/view, module chủ, cột chết, cột của view, "cạnh toàn vẹn". `docs/DATA-DICTIONARY.md` được **sinh** (`npm run dict`); bài kiểm báo lỗi nếu lệch.
- **`src/architecture.test.ts`** (chạy trong `npm test`) kiểm: import chỉ qua `index.ts` và đúng chiều `ALLOWED_EDGES`, không vòng; `shared/` và `web/` không import module; sổ ↔ schema; tiền tố bảng ↔ module; khoá ngoại xuyên module đúng chiều (hoặc là cạnh toàn vẹn khai báo); view công bố đúng cột, không `INSTEAD OF`; bảng mới có cột kiểm toán, cột WHO `TEXT NULL` không khoá ngoại, không `CASCADE`, bảng tra cứu khoá `code`; R-N1-14 (không đọc cột chết `staff.role`/`staff.full_name`).
- **Ranh giới SQL của module nghiêm** (`auth`, `company`, `dispatch`, `feedback`, `locations`, `maintenance`, `parties`, `staff`, `thongbao`, `van-chuyen`): mọi câu SQL của `repository.ts` đi qua `defineSql` (`src/shared/sql-registry.ts`) và **tĩnh** (tham số tuỳ chọn viết `?N IS NULL OR …`); bài kiểm hỏi CHÍNH SQLite (`EXPLAIN` trên schema "ranh giới", view công bố thay bằng bảng rỗng) câu đó đọc/ghi bảng nào — ghi bảng module khác, hay đọc thẳng bảng gốc module khác, đều đỏ. `repository.ts` của module nghiêm import bằng đuôi `.ts`. Module cũ (`accounts`, `audit`, `catalog`, `orders`) còn ở `LEGACY` (ngoại lệ có hạn, gỡ khi được chạm). Riêng `orders` có **tệp nửa nghiêm** `orders/chang-hanh-khach-repo.ts` (hằng `NUA_NGHIEM`, ADR-0047): mọi câu SQL mới của `orders` nằm ở tệp đó, đăng ký bằng `defineSql`, chịu bài `EXPLAIN` và bài chuỗi thô; hai ngoại lệ có tên ở `src/architecture.test.ts` (`XOA_CUNG_NHAP`, `DOC_AUDIT_LOG_WONGUARD` có hạn).
- **`KHONG_DB`** ("module không dùng cơ sở dữ liệu", ADR-0022 — chủ duyệt 2026-09-25/26, kế hoạch Bảng tin): nghiêm hơn `STRICT` — không bảng, không câu SQL, không `env.DB`/`.prepare(`/`.batch(`/`DB.exec(` ở BẤT KỲ tệp `.ts` không phải test (`*.test.ts`) nào trong thư mục module (không chỉ `repository.ts` — module hạng này còn không có `repository.ts`). Hôm nay chỉ có `bangtin` (bảng tin: thông báo tức thì qua WebSocket, không lưu tin, không ghi CSDL). Cưỡng chế bằng `src/architecture.test.ts`.
- **Bảng mới**: tiền tố module (`pty_`, `loc_`, `stf_`, `dsp_` từ migration 0014, `mnt_` từ `0016_maintenance`, `fbk_` từ `0016_feedback`, `aut_` từ `0023_auth_passkey`, `ntf_` từ `0025_thong_bao`, `vc_` từ `0033_van_chuyen_xe`, `ord_` từ `0034_chang_dua_don`, `ctl_` từ `0055_nhom_dich_vu` (module `catalog`, ADR-0058), sau này `bil_`); tra cứu dùng khoá mã `TEXT code`; tập giá trị mở là bảng tra cứu, không `CHECK` liệt kê; hiệu lực `valid_from/to_date` (ngày dân sự VN) hoặc `valid_from/to_at` (UTC); không xoá cứng — đóng hiệu lực hoặc `active = 0` (ngoại lệ có tên duy nhất: dòng `ord_*` của **đơn nháp** xoá–chèn lại khi lưu nháp — ADR-0047, `XOA_CUNG_NHAP`); khoá ngoại `NO ACTION`; khoá lạc quan bằng `updated_at` — trừ bảng gốc của một lô nhiều câu ở module nghiêm: cột `version INTEGER` tăng ở câu cổng (ADR-0049 D1, `vc_trip`).
- **`scripts/audit-invariants.mjs`** kiểm bất biến dữ liệu (`R-N1-*`, `R-DSP-*`) trên D1 local/remote, chỉ đọc; `npm run test:e2e` chạy nó cuối bộ (`--strict`). Danh sách kiểm ở `scripts/audit-checks.mjs` (tệp thuần) để `src/audit-invariants.test.ts` chạy đúng các câu SQL trên schema đầy đủ; mức `fail` / `warn-unless-strict` / `warn`; thoát mã 2 = không chạy được (D1 chưa có `0014`…), không phải dữ liệu sạch.
- **Lệch ADR-0003 điều 7 có chủ ý (`dsp_assignment`, migration 0014):** không có trigger chống chồng lấn khoảng đã đóng, vì đổi người đóng dòng cũ và mở dòng mới cùng một thời điểm mà vị từ mẫu của ADR coi hai đầu mút trùng là chồng lấn. Lưới thay thế là kiểm `R-DSP-3` (khoảng nửa mở `[từ, đến)`) của `audit-invariants`. Chi tiết: `docs/SYSTEM-DESIGN.md` §5 và §16.

## Nơi đặt code trong một module

| File | Chứa | Được import |
|---|---|---|
| `index.ts` | `routes` (khai bằng `route(method, path, access, handler)`) + API công khai của module | module khác, gốc lắp ráp |
| `rules.ts` | luật thuần (không I/O), có `*.test.ts` bên cạnh | chỉ trong module |
| `repository.ts` | SQL của các bảng module sở hữu | chỉ trong module |
| `service.ts` | điều phối nhiều bước có I/O (vd đồng bộ Sheet) | chỉ trong module |
| `sheet.ts`… | bộ đọc thuần cho nguồn ngoài | chỉ trong module (scripts được import) |

File thuần (`rules.ts`, `sheet.ts`, các file trong `shared/` mà `node --test` hoặc `scripts/*.mjs` nạp trực tiếp) import bằng đuôi `.ts` tường minh để chạy trực tiếp. Ngoại lệ duy nhất: `src/shared/router.ts` chỉ chạy trong Worker (esbuild/wrangler) nên MỘT dòng — `import type { StaffProfile } from "./contracts"` (chỉ nạp kiểu, không sinh mã) — không có đuôi; hai import còn lại của tệp này (`./http.ts`, `./permissions.ts`) vẫn có đuôi như bình thường.

## Luật dữ liệu

- Tiền: `INTEGER` VNĐ. Số dẫn xuất (`line_total`, `subtotal`, `total`, `remaining_amount`) chỉ tính ở server: `line_total` sinh ở `orders/service-rules.ts` (`validateService`, dùng `buildLines` của `shared/order-lines.ts`); `orders/rules.ts` chỉ cộng tổng đơn (`subtotal`, `total`, `remaining_amount`).
- Thời gian: `TEXT` ISO-8601 UTC cho dấu thời gian người đọc; `INTEGER` mili-giây **chỉ** cho mốc máy so sánh số học (`staff.credentials_changed_at` so với thời điểm phát hành phiên, `login_attempt.at`).
- Ngày/giờ **dân sự** (ngày khởi hành, giờ đón, check-in): `TEXT` `YYYY-MM-DD` / `HH:MM` theo **giờ Việt Nam**, không phải UTC. "Hôm nay" luôn là `vnToday(new Date())` (`src/shared/vn-date.ts`) truyền vào SQL làm tham số; không dùng `date('now')` (UTC, sai ngày trong 00:00–07:00 giờ VN). `CHECK` chỉ kiểm khuôn dạng (bất biến); khoảng cho phép (không quá khứ, ≤ 365 ngày) là luật đổi được nên nằm ở code.
- Batch ghi nhiều bảng sau một `UPDATE` điều kiện (vd sửa đơn nháp): các câu sau mang `EXISTS (SELECT 1 FROM audit_log WHERE id = ?)` với id nhật ký do request tự sinh (`AuditInput.id`) — dòng chỉ được chèn khi `changes() > 0`, nên có mặt ⇔ UPDATE của chính request đó đã thắng. Không so mốc thời gian để suy ra ai thắng.
  Module NGHIÊM không đọc `audit_log`: câu cổng đặt **dấu lệnh** (`last_cmd_id` = id riêng của request) lên chính dòng gốc (`UPDATE … SET version = version + 1, last_cmd_id = ? WHERE id = ? AND version = ?`), nhật ký `changes() > 0` đứng ngay sau, mọi câu sau mang `EXISTS (SELECT 1 FROM <bảng gốc> WHERE id = ? AND last_cmd_id = ?)`; câu đổi sang trạng thái cuối đứng cuối lô (ADR-0049 D1 "Thứ tự lô"; bài `src/modules/van-chuyen/thu-tu-lo.test.ts`).
- Tên bảng: số ít, trừ `orders` (`ORDER` là từ khoá SQL). Không đổi tên bảng đã có.
- Danh sách giá trị mở rộng theo thời gian (hành động nhật ký, loại đối tượng) kiểm ở **code**, không `CHECK` trong SQL. `CHECK` dành cho bất biến không bao giờ đổi (trạng thái đơn, vai trò, tiền không âm).
- Migration: chỉ thêm file mới, không sửa file đã áp remote. Thử local → e2e xanh → hỏi chủ dự án → remote. Thay đổi phá vỡ theo **expand–contract** trong HAI lần phát hành: migration "mở rộng" (chỉ thêm) trước, mã mới chạy, rồi migration "siết" (trigger bắt buộc…) ở lần sau — vì `wrangler d1 migrations apply` áp MỌI migration chưa áp nên migration siết KHÔNG được có mặt trong `migrations/` ở lần phát hành đầu (N1: B5 `staff_party_required`, xem `docs/HANDOFF-N1.md`; nhận biết theo tên tệp, không theo số thứ tự).
- Mọi đường XOÁ đơn trong tương lai phải tự chặn đơn không còn nháp: `ON DELETE CASCADE` từ `orders` xoá cả dịch vụ mà trigger `order_service_frozen_delete` KHÔNG chặn được (đã kiểm trên SQLite: xoá thẳng dịch vụ của đơn đã xác nhận bị chặn, nhưng xoá chính đơn đó thì dịch vụ đi theo). Hiện mã không có đường xoá đơn.
- **Trạng thái đơn chỉ đi tiến** (`draft → confirmed → cancelled`, không quay lại), kể cả SQL chạy tay: trigger `orders_status_transition` (`migrations/0017_order_status_audit_guards.sql`) chặn ở tầng CSDL, không chỉ ở `orders/rules.ts`.
- **`audit_log` chỉ-thêm**: trigger `audit_log_no_update` và `audit_log_no_delete` (cùng `0017`) chặn mọi `UPDATE`/`DELETE` trên bảng này, kể cả SQL chạy tay. Dựng lại `audit_log` (vd đổi cấu trúc theo expand–contract) phải tạo lại cả hai trigger trong cùng migration, không được bỏ sót.

## Thêm một module mới (vd M4 `exports`, M5 `company`)

1. Tạo `src/modules/<tên>/` với `index.ts` export `<tên>Module: AppModule = { name, routes: [route("GET", "/api/<tên>/:id", "staff", async (ctx) => …)] }`. Handler nhận `ctx.staff` (đã xác thực), `ctx.params`, `ctx.exec` (`waitUntil`).
2. Bảng mới → migration mới; module mới là chủ duy nhất của bảng đó.
3. Hành động nhật ký mới → thêm một dòng vào `src/shared/audit-actions.ts` (kèm nhãn tiếng Việt, nhóm). Không cần migration.
4. DTO trả cho giao diện → khai trong `src/shared/contracts.ts`; `web/` import từ đó.
5. Thêm một dòng vào mảng `modules` trong `src/index.ts`.
6. Luật thuần có test `node --test`; hành vi API có kịch bản trong `tests/e2e/` (khai kịch bản trong `run.mjs`).
7. **Bài kiểm kiến trúc ÉP thêm** (`src/architecture.test.ts` đỏ nếu thiếu): khai cạnh phụ thuộc của module trong `ALLOWED_EDGES`; đưa module vào `STRICT` (SQL đi qua `defineSql`), `LEGACY` (kèm lý do), hoặc `KHONG_DB` (module không dùng cơ sở dữ liệu — không bảng, không SQL, không `env.DB`/`.prepare(`/`.batch(`/`DB.exec(`); có bảng/view mới thì thêm vào `modules`/`tables` của `docs/data-dictionary.json` rồi `npm run dict`.

## Giao diện đơn (A2)

Logic của form/trang đơn là luật THUẦN ở `src/shared/` (kiểm bằng `node --test`, dùng chung với máy chủ khi có thể): `trip-rules.ts` (hằng trần và cửa sổ xác nhận — máy chủ `orders/service-rules.ts` import lại), `trip-form.ts`, `service-form.ts` (bản nháp dịch vụ, dòng tiền xem trước bằng đúng `buildLines`, lỗi chặn Lưu, `ServiceInput`), `order-errors.ts` (ma trận lỗi → banner), `order-view.ts` (mô hình hiển thị trang đơn, nút theo quyền); bản v1.0 thêm cùng khuôn `handler-view.ts` (người phụ trách: ai thấy nút đổi/nhận, câu báo lỗi), `order-confirmation.ts` + `text-wrap.ts` (nội dung và ngắt dòng của ảnh xác nhận PNG; bộ vẽ canvas ở `web/`) và `app-info.ts` (tên/số phiên bản hiện ở màn đăng nhập). `web/` chỉ dựng DOM bằng `h()` (không `innerHTML`) và gọi API; `web/tsconfig.json` bật `allowImportingTsExtensions` vì các tệp thuần import nhau bằng đuôi `.ts`. Bằng chứng giao diện thật: `docs/evidence/2026-09-20-a2/`.

## Ứng dụng iPhone (PWA)

Giao diện tĩnh là PWA: `manifest` + icon + service worker (`web/sw/sw.ts` → `public/sw.js`). Quy tắc bất biến: `/api/*` không bao giờ qua cache của service worker (`src/shared/sw-policy.ts`, có test). Chi tiết, danh sách kiểm trên máy thật và cách tăng `CACHE_VERSION`: `docs/PWA-IPHONE.md`.

## Góp ý / Báo lỗi (module `feedback`)

Ticket một chiều-thành-hai-chiều: `fbk_ticket` + `fbk_message`. Luật chuyển trạng thái ở `src/shared/feedback-catalog.ts` (dùng chung với `web/`). Chống spam bằng MỘT câu `INSERT … SELECT … WHERE (đếm) < trần` (không có bước đếm-rồi-chèn tách rời). Email báo admin đi qua `notifyAdmins()` trong `waitUntil`, lỗi không làm hỏng yêu cầu (`notified_at` NULL → hàng đợi hiện "chưa gửi được email"). Thiết kế: `docs/superpowers/specs/2026-09-21-gop-y-bao-loi-design.md`; triển khai: `docs/HANDOFF-FEEDBACK.md`.
