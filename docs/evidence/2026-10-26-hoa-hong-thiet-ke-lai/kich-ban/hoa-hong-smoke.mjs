// VIẾT LẠI CHO TRANG XẾP THEO CẤP ĐẠI LÝ (đợt «hoa-hong-cap-dai-ly», Task 14, 2026-10-30; đặc tả docs/superpowers/specs/2026-10-30-hoa-hong-cap-dai-ly/DAC-TA.md §3, §5, §8).
// Trang cũ có hai thẻ («Mức đang áp dụng» / «Thiết lập»); trang mới có BA thẻ «Các cấp đại lý» (`cap`) / «Loại đối tác» (`loai`) / «Riêng từng đối tác» (`doi-tac`), khoá nhớ thẻ
// `sessionStorage['hh-the']`. Sửa có chủ đích, từng bước và vì sao:
//   - Khung chung: `choTrang` chờ `#hh-the-cap .hh-cap` (bảng cũ `#hh-the-ap-dung .hh-bang` không còn); `chuyenThe` nhận `cap|loai|doi-tac` (id `hh-tab-ap-dung`/`hh-tab-thiet-lap` cũ đã bỏ);
//     dòng mức nay là `tr[data-dong-id]` của `bangDongMuc` (không còn `li`); nút việc: máy tính thấy sẵn «Đổi»/«Đổi cấp» (`.hh-viec-doi`), còn lại trong «⋯» (`.hh-viec-khac`, bảng
//     `.sheet .hh-viec-nut`); điện thoại chỉ «⋯» (vùng chạm cả dòng `.hh-m-vung` và nút `aria-label^="Ngừng:"`/`"Sửa:"` đã bỏ) ⇒ mọi câu hỏi «dòng có việc gì» đi qua `viecCua`
//     (đọc nút thấy sẵn + mở «⋯» đọc danh sách + Esc), mọi lần bấm việc đi qua `chayViec`. Bộ lọc `hh-loc-tt` ⇒ `hh-loc-tt-loai` / `hh-loc-tt-doi-tac` (cùng `hh-loc-tim-*`).
//     Cụm loại luôn mở (`article.hh-loai-the[data-loai]`), `.hh-loai-nut` chỉ còn ở cụm đối tác ⇒ `moLoai` bỏ. Ghi chú «chưa tới ngày» / «ngừng sau <ngày>» của `nutDoiNgung` không
//     còn hiện trong dòng (dòng mới hiện `nhanHieuLuc` + huy hiệu trạng thái) ⇒ bước 3, 5, 5b kiểm huy hiệu «Sắp áp dụng» / «đến <ngày>» + không Đổi / Ngừng.
//   - `bocucSach`: phần tử nằm trong khung tự cuộn ngang (`.hh-ma-tran-khung`, `.hh-muc-cap-khung`, mọi tổ tiên `overflow-x` auto/scroll/hidden) không tính là «vượt mép phải»
//     (khung đã cắt nó; điều cần đo là `scrollWidth ≤ innerWidth` của trang — giữ, nay so KHÔNG dung sai); thêm vùng chạm ≥ 44px (nút, thẻ, ô chọn, ô gõ đang hiện trong trang và hộp; dung sai 0,5px cho số lẻ của trình duyệt; phần tử lọt nhờ dung sai được in ở mục «ghi nhận» cuối lượt);
//     thêm cấm «chính sách» trong chữ của `main` và hộp (không quét thanh bên: mục «Chính sách điều phối» là của trang khác, đặc tả §6 không đụng).
//   - Bước 1: hai thẻ ⇒ ba thẻ + phím mũi tên / Home / End + giá trị cũ của `hh-the` (`ap-dung`, `thiet-lap`, rác) mở thẻ «Các cấp đại lý» (Review Focus 1); Tra nhanh giữ.
//   - Bước 1d (mới): dải §5.1 — thân nguyên văn, mỗi loại thiếu một dòng nguyên văn (một `KHONG_CO`, một `THIEU` với tên dịch vụ lấy từ /api/catalog), số ở tiêu đề = số dòng = số cụm
//     `data-phu` KHONG_CO/THIEU ở thẻ «Loại đối tác»; dòng loại đã tắt = số loại `dangBat=false` của máy chủ. Bước 1e (mới): /api/catalog hỏng ⇒ chỉ câu «chưa kiểm được» (Review Focus 2).
//   - Bước 1m (mới): ma trận — hàng nhóm, ô «—» + câu §5.4, hơn 5 cấp ⇒ 1040 cuộn trong khung; khổ 900 và 1040 có thanh bên, cấp có dòng NL/TE/NCT: trang không cuộn ngang, bảng
//     «Mức của cấp» cuộn trong `.hh-muc-cap-khung`; dưới 900 (899 và 390) ma trận ẩn, hiện chip chọn cấp, câu ô «—» không có trong chữ nhìn thấy (Review Focus 3).
//   - Bước 1x (mới, thay phần «Xem dòng ↓» của bước 1): bốn đích §3.3 (bậc 1–3 ⇒ thẻ đối tác, 4–6 ⇒ thẻ loại, 7–9 và 10–12 ⇒ thẻ cấp + câu «— cấp riêng của đối tác đang tra»),
//     dòng bị bộ lọc giấu ⇒ bộ lọc về mặc định rồi thấy, dòng không có trên trang ⇒ toast (Review Focus 4). Cách dựng ca toast: «xoá dòng bằng API giữa chừng» KHÔNG chạm được toast
//     (trang giữ dữ liệu cũ tới `napLai`, mà `napLai` vẽ lại cả Tra nhanh nên mất kết quả) ⇒ dòng mức của một cấp đã bị ngừng bằng API TRƯỚC khi mở trang, Tra nhanh hỏi ngày cũ
//     (dòng đó thắng), thẻ cấp không vẽ dòng đã ngừng ⇒ không thấy dòng ⇒ toast.
//   - Bước K (mới): Khoá cấp — hộp §5.2 nguyên văn, huy hiệu `cat`; dòng mức của cấp khoá chỉ còn «Ngừng» ở nút lẫn «⋯»; lần xếp loại vào cấp đó «Đổi cấp» sang cấp khác ⇒ POST 200
//     (tiêu chí 4; Review Focus 5). Bước T (mới): Tắt loại — hộp §5.2 nguyên văn, huy hiệu `xam` «Đã tắt», dải thêm một loại đã tắt.
//   - Bước 8k (mới): «⋯» bằng bàn phím thật (CDP) — Tab tới nút, Enter mở, tiêu điểm vào khung, Tab tiếp, Esc đóng về «⋯», `aria-haspopup="dialog"`, nền `inert` (tiêu chí 8).
//   - Bước CR (mới): đặt, sửa, ngừng cấp riêng ngay trên thẻ «Riêng từng đối tác»; 409 chồng ngày hiện câu §6.1 nguyên văn trong hộp (tiêu chí 5).
//   - Bước DC (ADR-0151, Task 17, 2026-10-30): «Đổi cấp» ở thẻ một đối tác. Kế toán đổi cấp riêng từ hôm nay ⇒ lần cũ ngừng hôm qua + lần mới từ hôm nay; cấp cũ khoá ⇒ hộp có câu Đ8;
//     lần có ngày ngừng không có nút «Đổi cấp»; đổi sang cấp bị khoá chen giữa lúc mở hộp ⇒ 409 hiện NGUYÊN câu máy chủ trong hộp. Bước CR đổi theo: cấp riêng nay có «Đổi cấp»
//     (nút ở khổ máy tính, đầu «⋯» ở điện thoại). Bán hàng: bước 7 (mọi cụm mở) đã đòi 0 nút «Đổi».
//   - Bước 2, 2b, 2c: mục «Đối tác có mức riêng…» của thẻ cũ ⇒ thẻ «Riêng từng đối tác» (vỏ `.hh-dt[data-party]`, `.hh-tom-tat` giữ tên). Bước 3, 4, 5, 5b, 11: dòng mức riêng của loại
//     ⇒ thẻ «Loại đối tác»; «Tất cả» của thẻ loại hiện dòng đã ngừng / đã huỷ (bước 3, 11).
//   - Bước 6 (Thiết lập) ⇒ «＋ Thêm loại» ở thẻ loại, «＋ Thêm cấp đại lý» ở thẻ cấp, «Áp dụng cấp cho loại» ở chi tiết cấp; khung vàng nay nói thẻ «Loại đối tác».
//     Bước 13: lần áp dụng sắp tới nằm ở chi tiết cấp («Loại đối tác theo cấp này»). Bước 9 (390): thẻ `ap-dung` ⇒ `cap`; nút nổi `#tl-fab` không còn (đợt 0 đưa Trợ lý lên thanh trên) ⇒ đo «không còn nút nổi» + tâm «＋ Thêm mức» không bị che. Bước 10: quét ba thẻ.
//   - Bước 7 (Bán hàng): quét ba thẻ (mở mọi cụm đối tác), đòi KHÔNG có «⋯» / «Đổi» nào (việc rỗng ⇒ không dựng «⋯»); chữ nút ghi thêm «Khoá», «Mở lại», «Đặt». Phá thử `lo-nut` chỉ gắn
//     vào trang của Bán hàng (để chỉ bước Bán hàng đỏ).
//   - Bước 8 (Đối tác): chuyển ra NGOÀI vòng khổ, chạy SAU CÙNG cho cả hai khổ (tiêu chí 7). Trang 403 nay là trạng thái toàn trang (`.trang-thai[data-loai="403"]`, `body[data-trang-thai]`)
//     của đợt 0, không còn `#error`; kèm fetch trong trang ⇒ 403.
//   - Bước 14b: câu báo đổi «chính sách riêng» ⇒ «cấp riêng».
//   - Mọi trang ghi `window.__hhGhi` (phương thức, đường dẫn, mã trả về của mọi lần gọi không phải GET) để đòi đúng mã 200 (tiêu chí 4). Thư mục ảnh mặc định chuyển sang bằng chứng mới.
// ĐỔI CHỮ DANH BẠ (đợt cấp đại lý, Task 12, 2026-10-30): các câu ghim của hồ sơ Danh bạ (`web/parties.ts`) đổi theo luật «chính sách» → «cấp đại lý» / «cấp riêng»:
// «Chính sách riêng: …» → «Cấp riêng: …», «Áp dụng chính sách riêng» → «Áp dụng cấp riêng», «Đã sửa chính sách riêng của đại lý này.» → «Đã sửa cấp riêng của đại lý này.»,
// câu xem trước sửa của Danh bạ nói «cấp riêng này» (hằng CAU_SUA_RIENG_HUY_THAY). Bài `src/bang-tu-giao-dien.test.ts` (lượt 6) canh chữ cũ không quay lại.
// Kịch bản Chrome — trang «Hoa hồng đối tác». Đây là rào DUY NHẤT cho phần GIAO DIỆN của trang: `npm test` canh luật thuần (src/shared/hoa-hong-*.ts) và máy chủ, `npm run test:e2e`
// canh HTTP, nhưng không bài nào mở trang. Mỗi bước chạy ở 390 và 1040 (bước 9 chỉ 390); Danh bạ 12, 14, 14b giữ như trước.
// Mỗi bước: không tràn ngang, vùng chạm ≥ 44px, ô gõ ≥ 16px, không chữ Anh / mã thô, không «chính sách», axe-core (critical / serious ⇒ đỏ; thiếu AXE_JS ⇒ dừng ngay), chụp ảnh.
// Môi trường: D1 tạm + wrangler dev + Chrome headless qua CDP (docs/evidence/2026-09-20-a2/kich-ban/a2-cdp.mjs) — Turnstile TẮT, không --remote, không gọi production.
// Quy tắc ADR-0074/0075: dữ liệu dựng bằng API TRƯỚC khi mở trang; mỗi lúc chỉ một trang mở cho mỗi tài khoản; trong lúc trang mở thì đọc / ghi bằng chính trang (fetch trong trang) —
// gọi `call()` của tài khoản đang mở trang là đăng nhập lại, đá phiên của trang ra «/login» («Tài khoản vừa đăng nhập trên máy khác»).
// Chạy (sau `npm run build:web`):
//   AXE_JS=<…/axe.min.js> CHROME_BIN=$PWD/docs/evidence/2026-09-20-a2/kich-ban/chrome-wrap.sh OUT=docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/anh node docs/evidence/2026-10-26-hoa-hong-thiet-ke-lai/kich-ban/hoa-hong-smoke.mjs
// Cuối: "HOA HONG SMOKE OK" hoặc danh sách bước đỏ (thoát 1).
// PHÁ THỬ (P16, KHÔNG sửa mã sản phẩm): HH_PHA=lo-nut — lớp bọc `fetch` thêm quyền Kế toán vào phản hồi /api/auth/me của Bán hàng ⇒ giao diện dựng nút ghi ⇒ bước 7 ĐỎ;
// HH_PHA=fab — (cũ, không còn tác dụng từ đợt 0: không còn nút nổi Trợ lý để nâng) gỡ lớp `thanh-hanh-dong-cuoi` khỏi thanh đáy ngay khi trang dựng.
// HH_KHO=390|1040 chạy một khổ; HH_DUNG=<mã bước> dừng sau bước đó.
import assert from "node:assert/strict";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { ACCOUNTS, docAxe, goiApi, ok, setInput, sleep, startEnv, vnDate } from "../../2026-10-08-qr-thanh-toan/kich-ban/qr-chung.mjs";

const AXE = docAxe();
const OUT = process.env.OUT ?? join(process.cwd(), "docs/evidence/2026-10-30-hoa-hong-cap-dai-ly/anh");
mkdirSync(OUT, { recursive: true });
const MOB = { width: 390, height: 844, mobile: true };
const DESK = { width: 1040, height: 900, mobile: false };
const KHO = [["390", MOB], ["1040", DESK]].filter(([ten]) => !process.env.HH_KHO || process.env.HH_KHO === ten);
const DUNG = process.env.HH_DUNG ?? "";
const PHA = process.env.HH_PHA ?? "";

// Chữ phải KHỚP NGUYÊN VĂN với src/shared/hoa-hong-hien-thi.ts, src/modules/pricing/index.ts và web/hoa-hong*.ts (viết lại có chủ đích: đổi chữ mà quên kịch bản ⇒ đỏ).
const CAU_TRA_THEO_LOAI = "Đang tra theo loại. Một đối tác cụ thể của loại này có thể có mức riêng hoặc cấp riêng — gõ tên đối tác để chắc.";
const CAU_KHONG_CO_QUYEN_XEM = "Bạn không có quyền xem trang này.";
const CAU_DOI_TU_NGAY_MAI = "Mức cũ bắt đầu hôm nay nên mức mới áp dụng sớm nhất từ ngày mai; đơn xác nhận trong hôm nay vẫn tính theo mức cũ.";
const CAU_THONG_BAO_DONG_RIENG = "Ngừng các mức riêng đó ở thẻ «Loại đối tác».";
// §5.1
const CAU_THAN_DAI = "Đối tác chỉ thuộc loại này và chưa có mức riêng hay cấp riêng sẽ bị chờ ở bước «Đã giao» nếu đơn xác nhận từ hôm nay có dịch vụ chưa có mức. Đối tác thuộc thêm loại khác có mức thì vẫn tính theo loại đó. Đơn đã xác nhận trước đó không tự tính lại khi thêm mức: Kế toán dùng «Ghi mức tay» cho từng đơn.";
const cauTieuDeDai = (n) => `Có ${n} loại đối tác còn thiếu mức hôm nay`;
const cauLoaiTatDai = (m) => `${m} loại đã tắt: đối tác chỉ mang loại đã tắt không được hưởng hoa hồng, đơn của họ bị giữ ở bước Đã giao.`;
const CAU_DAI_CHUA_KIEM = "Chưa kiểm được loại nào thiếu mức vì không tải được danh mục dịch vụ. Tải lại trang.";
// §5.2
const HOP_KHOA_CAP = (ten) => ({ tieuDe: `Khoá cấp «${ten}»?`, hauQua: "Sau khi khoá: không thêm được loại, đối tác hay mức mới vào cấp; các mức đang có chỉ Ngừng được, không Đổi hay Sửa; loại và đối tác đang theo cấp vẫn được tính hoa hồng như cũ. Muốn một loại thôi theo cấp: «Thôi theo cấp này». Muốn chuyển sang cấp khác: «Đổi cấp». Mở lại bất cứ lúc nào bằng «Mở lại cấp».", nut: "Khoá cấp" });
const NHAN_CAP_DA_KHOA = "Đã khoá — vẫn áp cho loại và đối tác đang theo";
const HOP_TAT_LOAI = (ten) => ({ tieuDe: `Tắt loại «${ten}»?`, hauQua: "Đối tác chỉ thuộc loại này sẽ không được hưởng hoa hồng. Đơn của họ xác nhận từ lúc tắt sẽ chờ ở bước «Đã giao» tới khi Kế toán nhập tay («Ghi mức tay»). Đơn đã xác nhận trước lúc tắt giữ nguyên hoa hồng.", nut: "Tắt loại" });
// §5.3, §5.4
const CAU_THU_TU_AP_MUC = "Khi tính hoa hồng cho một đơn, Nền tảng thử lần lượt: 1) mức riêng của đối tác, 2) cấp riêng của đối tác, 3) mức riêng của loại, 4) cấp của loại. Gặp mức nào trước thì dùng mức đó. Trong mỗi bước, xét dịch vụ đó trước, rồi cả nhóm, rồi mọi dịch vụ. Đối tác có cấp riêng thì không xét cấp của loại. Muốn biết chắc một đối tác: dùng «Kiểm tra hoa hồng».";
const CAU_O_TRONG = "Ô «—» nghĩa là cấp chưa đặt mức riêng cho dịch vụ hoặc nhóm này; đơn sẽ theo mức rộng hơn của cấp (cả nhóm hoặc mọi dịch vụ) nếu có. Muốn biết mức chắc chắn: dùng «Kiểm tra hoa hồng».";
// §3.3
const CAU_KHONG_THAY_DONG = "Không thấy mục này trên trang — tải lại trang.";
const CAU_CAP_RIENG_DANG_TRA = "— cấp riêng của đối tác đang tra";
// §6.1 (pricing/index.ts:69)
const CAU_409_CAP_RIENG = "Hồ sơ này đã có một cấp riêng trong khoảng ngày này — ngừng cấp riêng cũ trước.";
const CAU_DA_SUA_CAP_RIENG = "Đã sửa cấp riêng.";
const cauDaDatCapRieng = (cap, dt, tu) => `«${dt}» đã theo cấp riêng «${cap}» từ ngày ${ngayVi(tu)}.`;
const cauDaNgungCapRieng = (cap, dt) => `«${dt}» đã thôi theo cấp riêng «${cap}».`;
const CHU_ANH = /\b(MT_[A-Z]{8}|LD_[A-Z]{8}|muc_trung|muc_tat|prc_tier_\w+|prc_\w+|stale|invalid_input|forbidden|undefined|null|NaN|Internal Server Error)\b|\[object/;
// 28/10: chủ chọn quay lại «Có sẵn» (bỏ khỏi danh sách cấm), «Loại gốc» thành chữ cấm.
const CHU_CAM = [/Mức TA/, /Đóng mức/, /Kết thúc gắn/, /Đang áp(?! dụng)/, /Sắp áp(?! dụng)/, /Đã đóng/, /[Ll]oại gốc/, /Do Kế toán thêm/];
/** Đặc tả §6 (luật đổi): không còn «chính sách» trong chữ nhìn thấy của trang (trừ các cụm §6 không đụng). Chỉ quét `main` và hộp. */
const CHINH_SACH = /[Cc]hính sách(?! (riêng tư|điều phối|đăng nhập|nhập tay|khung giờ đón|huỷ))/;
// Nút ghi mà Bán hàng KHÔNG được thấy (chữ đầu của nút).
const NUT_GHI = /^(＋|Thêm|Đổi|Ngừng|Sửa|Tắt|Bật|Áp dụng|Khoá|Mở lại|Đặt|Chọn cấp cho loại|Chọn cấp riêng|Thôi theo cấp)/;
const CAU_SUA_HUY_THAY = "Chưa có đơn nào dùng mức này — sửa sẽ thay hẳn.";
const NHAN_DA_HUY = "Đã thay bằng mức mới";
const CAU_SUA_CS_HUY_THAY = "Chưa có đơn nào dùng cấp đại lý này — sửa sẽ thay hẳn.";
const CAU_SUA_RIENG_HUY_THAY = "Chưa có đơn nào dùng cấp riêng này — sửa sẽ thay hẳn."; // Danh bạ và hộp Sửa cấp riêng
/** 2026-11-03 ⇒ 03/11/2026 (ngayDayDu / ngayVN của src/shared). */
const ngayVi = (iso) => iso.split("-").reverse().join("/");

// Ghi mọi lần gọi không phải GET (để đòi đúng mã trả về). Luôn bật, không đổi hành vi trang.
const GHI_FETCH = `{ window.__hhGhi = []; const f0 = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f0(u, o); const m = (o && o.method) || 'GET'; if (m !== 'GET') window.__hhGhi.push({ m, u: String(u), s: r.status }); return r; }; }`;
const PHA_LO_NUT = `{ const f = window.fetch.bind(window);
  window.fetch = async (u, o) => { const r = await f(u, o);
    if (String(u).includes('/api/auth/me') && r.ok) { const b = await r.clone().json(); const s = b.staff ?? b; if (Array.isArray(s.permissions) && !s.permissions.includes('ACCOUNTING')) s.permissions = [...s.permissions, 'ACCOUNTING'];
      return new Response(JSON.stringify(b), { status: 200, headers: { 'content-type': 'application/json' } }); }
    return r; }; }`;
const PHA_FAB = `setInterval(() => { const b = document.getElementById('hh-thanh-cuoi'); if (b && b.classList.contains('thanh-hanh-dong-cuoi')) b.classList.remove('thanh-hanh-dong-cuoi'); }, 20);`;
/** Bước 1e: /api/catalog hỏng (500) ⇒ danh mục lỗi. */
const HONG_DANH_MUC = `{ const f = window.fetch.bind(window);
  window.fetch = async (u, o) => /^\\/api\\/catalog(\\?|$)/.test(String(u)) ? new Response(JSON.stringify({ error: { code: 'internal', message: 'Máy chủ đang bận.' } }), { status: 500, headers: { 'content-type': 'application/json' } }) : f(u, o); }`;

const loi = [];
const axeNhe = [];
/** Trang đang chạy bước (để in trạng thái trang khi bước đỏ). */
let trangHienTai = null;
const anh = [];
async function buoc(id, ten, fn) {
  try {
    await fn();
    ok(`${id}) ${ten}`);
  } catch (e) {
    const msg = String(e?.message ?? e).split("\n").slice(0, 12).join("\n    ");
    loi.push(`${id}) ${ten}: ${msg.split("\n")[0]}`);
    console.log(`✗ ${id}) ${ten}\n    ${msg}`);
    if (trangHienTai) {
      const tt = await trangHienTai.ev("JSON.stringify({ url: location.pathname + location.search, trangThai: document.body.dataset.trangThai ?? null, hop: document.querySelector('.sheet .sheet-title')?.textContent ?? null, main: (document.querySelector('main')?.innerText ?? '').slice(0, 300) })").catch((x) => String(x));
      console.log(`    trang lúc đỏ: ${tt}`);
      await trangHienTai.ev("document.querySelector('.sheet-root') && document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true").catch(() => undefined);
    }
  }
  if (id === DUNG) throw new Error("DUNG");
}
/** Chụp ảnh. `toanTrang` false khi có hộp trượt mở (hộp là phần tử cố định, chụp cả trang sẽ lệch). */
async function chup(p, ten, toanTrang = true) {
  await sleep(700);
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.dataset.anTam = e.style.display; e.style.display = 'none'; } return true; })()");
  const r = await p.send("Page.captureScreenshot", { format: "png", captureBeyondViewport: toanTrang });
  if (toanTrang) await p.ev("(() => { for (const e of document.querySelectorAll('#tabbar, .tl-fab')) { e.style.display = e.dataset.anTam ?? ''; } return true; })()");
  writeFileSync(join(OUT, `${ten}.png`), Buffer.from(r.result.data, "base64"));
  anh.push(ten);
}
async function axeKiem(p, nhan) {
  if (!(await p.ev("typeof axe !== 'undefined'"))) await p.ev(`${AXE}\n;true`);
  // Đo màu ở trạng thái CUỐI: hộp ở khổ máy tính hiện dần bằng opacity (app.css `.sheet`), và trong lượt chạy dài Chrome headless có lúc dừng hiệu ứng giữa chừng
  // (29/10: hộp Sửa [1040] đứng ở opacity 0,85 ⇒ axe đo nền xám #eaebed, tỷ lệ 4,19). Kết thúc mọi hiệu ứng có hồi kết trước khi đo; hiệu ứng lặp vô hạn bỏ qua.
  await p.ev("document.getAnimations().forEach((a) => { try { a.finish(); } catch {} }); true");
  const vi = await p.ev(`axe.run(document, { runOnly: ['wcag2a', 'wcag2aa', 'best-practice'], rules: { 'meta-viewport': { enabled: false } } }).then((r) => r.violations.map((v) => ({ impact: v.impact, id: v.id, nodes: v.nodes.slice(0, 4).map((n) => n.target.join(' ')) })))`);
  const nang = vi.filter((v) => v.impact === "critical" || v.impact === "serious");
  for (const v of vi.filter((x) => !nang.includes(x))) axeNhe.push(`${nhan}: ${v.impact} ${v.id} — ${v.nodes.join(" | ")}`);
  assert.deepEqual(nang, [], `axe nghiêm trọng (${nhan}): ${JSON.stringify(nang)}`);
}
/**
 * Không tràn ngang (scrollWidth ≤ innerWidth, không dung sai); không phần tử vượt mép phải (trừ phần tử nằm trong khung tự cuộn ngang); vùng chạm ≥ 44px; ô gõ đang hiện ≥ 16px
 * (cả trong hộp trượt); không chữ Anh / mã thô; không chuỗi cấm; không «chính sách» trong `main` và hộp.
 */
async function bocucSach(p, nhan) {
  const m = await p.ev(`(() => {
    const hien = (e) => e.offsetParent !== null || getComputedStyle(e).position === 'fixed';
    const nho = [...document.querySelectorAll('main input, main select, main textarea, .sheet input, .sheet select, .sheet textarea')].filter((e) => hien(e) && e.type !== 'hidden' && e.type !== 'radio' && e.type !== 'checkbox' && parseFloat(getComputedStyle(e).fontSize) < 16)
      .map((e) => (e.id || e.tagName) + ':' + getComputedStyle(e).fontSize);
    const trongKhungCuon = (e) => { for (let a = e.parentElement; a && a !== document.body; a = a.parentElement) { if (['auto', 'scroll', 'hidden'].includes(getComputedStyle(a).overflowX)) return true; } return false; };
    const ra = [...document.querySelectorAll('main *')].filter((e) => e.offsetParent !== null && e.getBoundingClientRect().right > innerWidth + 1 && !trongKhungCuon(e)).map((e) => e.tagName + '.' + (e.className || e.id || '')).slice(0, 5);
    const cham = [...document.querySelectorAll('main button, main [role=tab], main select, main input:not([type=hidden]):not([type=radio]):not([type=checkbox]), main a.nut, .sheet button, .sheet select, .sheet input:not([type=hidden]):not([type=radio]):not([type=checkbox])')]
      .filter((e) => hien(e) && !e.closest('[hidden]')).map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0 && (x.r.height < 43.5 || x.r.width < 43.5))
      .map((x) => (x.e.id || x.e.className || x.e.tagName) + '«' + (x.e.textContent || x.e.getAttribute('aria-label') || '').trim().slice(0, 24) + '» ' + Math.round(x.r.width) + '×' + Math.round(x.r.height)).slice(0, 6);
    const satNguong = [...document.querySelectorAll('main button, main [role=tab], main select, main input, .sheet button, .sheet select, .sheet input')].filter((e) => hien(e) && !e.closest('[hidden]') && e.type !== 'hidden' && e.type !== 'radio' && e.type !== 'checkbox')
      .map((e) => ({ e, r: e.getBoundingClientRect() })).filter((x) => x.r.width > 0 && ((x.r.height >= 43.5 && x.r.height < 44) || (x.r.width >= 43.5 && x.r.width < 44))).map((x) => (x.e.id || x.e.className || x.e.tagName) + ' ' + x.r.width.toFixed(2) + '×' + x.r.height.toFixed(2));
    const chuTrang = (document.querySelector('main')?.innerText ?? '') + '\\n' + [...document.querySelectorAll('.sheet')].map((s) => s.innerText).join('\\n');
    return { sw: document.documentElement.scrollWidth, iw: innerWidth, nho, ra, cham, satNguong, chu: document.body.innerText, chuTrang };
  })()`);
  assert.ok(m.sw <= m.iw, `${nhan}: tràn ngang (scrollWidth ${m.sw} > innerWidth ${m.iw}; phần tử ra ngoài: ${m.ra.join(", ")})`);
  assert.deepEqual(m.ra, [], `${nhan}: phần tử vượt mép phải`);
  assert.deepEqual(m.cham, [], `${nhan}: vùng chạm nhỏ hơn 44px`);
  for (const x of m.satNguong) axeNhe.push(`vùng chạm sát 44px (lọt nhờ dung sai 0,5px): ${x}`);
  assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
  assert.ok(!CHU_ANH.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
  for (const re of CHU_CAM) assert.ok(!re.test(m.chu), `${nhan}: còn chữ cũ «${re.exec(m.chu)?.[0]}»`);
  const iCs = m.chuTrang.search(CHINH_SACH);
  assert.ok(iCs < 0, `${nhan}: còn chữ «chính sách»: …${m.chuTrang.slice(Math.max(0, iCs - 40), iCs + 40)}…`);
}

const PHIM = {
  Tab: { key: "Tab", code: "Tab", windowsVirtualKeyCode: 9 },
  Enter: { key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r" },
  Escape: { key: "Escape", code: "Escape", windowsVirtualKeyCode: 27 },
  ArrowRight: { key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 },
  ArrowLeft: { key: "ArrowLeft", code: "ArrowLeft", windowsVirtualKeyCode: 37 },
  Home: { key: "Home", code: "Home", windowsVirtualKeyCode: 36 },
  End: { key: "End", code: "End", windowsVirtualKeyCode: 35 },
};
/** Phím thật qua CDP (JS `dispatchEvent` không dời tiêu điểm khi Tab). */
async function phim(p, ten) {
  const k = PHIM[ten];
  await p.send("Input.dispatchKeyEvent", { type: "keyDown", ...k });
  const { text: _t, ...len } = k;
  await p.send("Input.dispatchKeyEvent", { type: "keyUp", ...len });
  await sleep(120);
}

const env = await startEnv();
try {
  const { call } = goiApi(env);
  const CHU = String(Date.now()).slice(-6).replace(/\d/g, (d) => "ABCDEGHKLM"[d]);
  const HOM_NAY = vnDate(0);
  const phai = (r, status, nhan) => { assert.equal(r.status, status, `${nhan}: ${r.status} ${JSON.stringify(r.json)}`); return r.json; };

  // Tài khoản Đối tác (chỉ quyền PARTNER): gieo thẳng bằng staff-lib (Quản trị không còn tạo được tài khoản — ADR-0071), như doi-tac-lap-don-smoke.mjs.
  const PARTNER = { name: "Đối Tác Hoa Hồng", phone: "0900000281", pin: "246881", permissions: ["PARTNER"] };
  const { insertStaffSql } = await import(pathToFileURL(join(process.cwd(), "scripts", "staff-lib.mjs")).href);
  for (const stmt of (await insertStaffSql(PARTNER)).split("\n")) env.sql(stmt);

  // Danh mục chung cho cả hai khổ: thêm một dịch vụ tên rất dài và MỘT nhóm («Tour đảo» = TD101 + TDLONG1) để ma trận có hàng nhóm.
  const TEN_DAI = "Tour khám phá trọn gói bốn đảo vịnh Nha Trang kèm lặn ngắm san hô, tắm biển, ăn trưa hải sản, xe đưa đón khách sạn nội thành và hướng dẫn viên tiếng Việt";
  assert.ok(TEN_DAI.length >= 120, "tên dịch vụ dài ≥ 120 ký tự");
  env.sql(`INSERT OR IGNORE INTO catalog_item (code, name, unit, price_adult, first_seen_at, updated_at, in_sheet) VALUES ('TDLONG1', '${TEN_DAI}', 'khách', 1000000, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z', 1)`);
  const TEN_NHOM = `Tour đảo ${CHU}`;
  const NHOM = phai(await call(ACCOUNTS.admin, "POST", "/api/catalog/groups", { name: TEN_NHOM }), 201, "nhóm dịch vụ").group.code;
  phai(await call(ACCOUNTS.admin, "PUT", "/api/catalog/group-assignments", { codes: ["TD101", "TDLONG1"], groupCode: NHOM }), 200, "gán nhóm");
  const DM = phai(await call(ACCOUNTS.accounting, "GET", "/api/catalog"), 200, "danh mục").items;
  /** Tên dịch vụ theo thứ tự trang dùng (`taiDanhMuc`: xếp theo tên tiếng Việt). */
  const TEN_DV = DM.map((i) => ({ code: i.code, name: i.name })).sort((a, b) => a.name.localeCompare(b.name, "vi"));

  const moTrang = async (account, path, vp, { them = "" } = {}) => {
    const p = await env.openPage(vp);
    p.vp = vp;
    trangHienTai = p;
    await p.send("Page.addScriptToEvaluateOnNewDocument", { source: `window.confirm = () => true; window.alert = () => {}; ${GHI_FETCH} ${PHA === "fab" ? PHA_FAB : ""} ${them}` });
    const c = await env.login(account);
    await p.send("Network.setCookie", { name: c.name, value: c.value, url: env.base, httpOnly: true });
    await p.send("Page.navigate", { url: env.base + path });
    await p.waitFor("document.readyState === 'complete'", `trang ${path} tải xong`);
    return p;
  };
  const choTrang = (p) => p.waitFor("(() => { const nd = document.getElementById('hh-noi-dung'); return !!nd && !nd.hidden && !!document.querySelector('#hh-the-cap .hh-cap'); })()", "trang Hoa hồng đã vẽ");
  const clickTrong = (p, scope, chu) => p.ev(`(() => { const b = [...document.querySelectorAll(${JSON.stringify(scope)} + ' button')].find((x) => x.textContent.trim() === ${JSON.stringify(chu)} && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`);
  const bam = (p, selector) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(selector)}); if (!e) return false; e.click(); return true; })()`);
  const choOk = (p, chu) => p.waitFor(`(() => { const e = document.getElementById('ok'); return !e.hidden && e.textContent === ${JSON.stringify(chu)}; })()`, `câu «${chu}»`);
  const goiTrongTrang = (p, method, path, body) => p.ev(`fetch(${JSON.stringify(path)}, { method: ${JSON.stringify(method)}, headers: { 'content-type': 'application/json' }, body: ${body === undefined ? "undefined" : JSON.stringify(JSON.stringify(body))} }).then(async (r) => ({ status: r.status, json: await r.json().catch(() => null) }))`);
  const choHop = (p, sel) => p.waitFor(`!!document.querySelector(${JSON.stringify(sel)})`, `hộp có ${sel}`);
  const choDongHop = (p) => p.waitFor("!document.querySelector('.sheet')", "hộp đã đóng");
  const chuyenThe = async (p, the) => { assert.equal(await bam(p, `#hh-tab-${the}`), true, `nút thẻ ${the}`); await p.waitFor(`!document.getElementById('hh-the-${the}').hidden`, `thẻ ${the} hiện`); };
  /** Chọn cấp: đầu cột ma trận (≥ 900) hoặc chip (< 900) — cái nào đang hiện. */
  const chonCap = async (p, code) => {
    assert.equal(await p.ev(`(() => { const b = [...document.querySelectorAll('[data-chon-cap="${code}"]')].find((x) => x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`), true, `nút chọn cấp ${code}`);
    await p.waitFor(`!!document.querySelector('#hh-cap-ct[data-cap="${code}"]')`, `chi tiết cấp ${code}`);
  };
  const locLoai = async (p, giaTri) => p.ev(`(() => { const s = document.getElementById('hh-loc-tt-loai'); s.value = ${JSON.stringify(giaTri)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
  const cuonToi = (p, sel) => p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return false; e.scrollIntoView({ block: 'center' }); return true; })()`);
  /** Dòng mức (tr) theo id: chữ, các nút ĐANG HIỆN (bỏ «⋯»). */
  const hang = (p, id) => p.ev(`(() => { const tr = document.querySelector('tr[data-dong-id="${id}"]'); if (!tr) return null; return { chu: tr.innerText, nut: [...tr.querySelectorAll('button')].filter((b) => b.offsetParent !== null && !b.classList.contains('hh-viec-khac')).map((b) => b.textContent.trim()), khac: !!tr.querySelector('.hh-viec-khac') }; })()`);
  const cacDong = async (p) => (await goiTrongTrang(p, "GET", "/api/pricing/hoa-hong")).json.dong;
  /**
   * Việc của một dòng (`sel` = dòng mức `tr[data-dong-id]` hoặc lần xếp `li[data-gan-id]`): `nut` = nút thấy sẵn (bỏ «⋯»), `menu` = danh sách trong «⋯» (mở, đọc, Esc). «⋯» đang ẩn
   * theo khổ (`data-chi-dien-thoai` ở máy tính) không mở được ⇒ `menu` rỗng.
   */
  const viecCua = async (p, sel) => {
    const r = await p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return null; const hienNut = [...e.querySelectorAll('button')].filter((b) => b.offsetParent !== null);
      return { nut: hienNut.filter((b) => !b.classList.contains('hh-viec-khac')).map((b) => b.textContent.trim()), coKhac: hienNut.some((b) => b.classList.contains('hh-viec-khac')) }; })()`);
    if (!r) return null;
    let menu = [];
    if (r.coKhac) {
      await p.ev(`(() => { const b = [...document.querySelector(${JSON.stringify(sel)}).querySelectorAll('.hh-viec-khac')].find((x) => x.offsetParent !== null); b.click(); return true; })()`);
      await choHop(p, ".sheet .hh-viec-ds");
      menu = await p.ev("[...document.querySelectorAll('.sheet .hh-viec-nut')].map((b) => b.textContent.trim())");
      await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
      await choDongHop(p);
    }
    return { nut: r.nut, menu, coKhac: r.coKhac };
  };
  /** Bấm một việc của dòng: nút thấy sẵn nếu có (máy tính: «Đổi»/«Đổi cấp»), không thì mở «⋯» rồi bấm việc trong danh sách. */
  const chayViec = async (p, sel, nhan) => {
    const thay = await p.ev(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); if (!e) return 'khong-dong'; const b = [...e.querySelectorAll('button')].find((x) => x.offsetParent !== null && !x.classList.contains('hh-viec-khac') && x.textContent.trim() === ${JSON.stringify(nhan)}); if (b) { b.click(); return 'nut'; }
      const k = [...e.querySelectorAll('.hh-viec-khac')].find((x) => x.offsetParent !== null); if (!k) return 'khong-viec'; k.click(); return 'menu'; })()`);
    assert.notEqual(thay, "khong-dong", `không có dòng ${sel}`);
    assert.notEqual(thay, "khong-viec", `dòng ${sel} không có «${nhan}» lẫn «⋯»`);
    if (thay === "menu") {
      await choHop(p, ".sheet .hh-viec-ds");
      assert.equal(await clickTrong(p, ".sheet .hh-viec-ds", nhan), true, `«${nhan}» trong «⋯» của ${sel}`);
    }
  };
  const moDoi = async (p, id) => { await chayViec(p, `tr[data-dong-id="${id}"]`, "Đổi"); await choHop(p, "#hh-doi-tu-ngay"); };
  /** Gõ vào Tra nhanh (khối nằm sẵn ở máy tính, hộp trượt ở điện thoại), chọn gợi ý, chọn dịch vụ, (ngày), bấm Tra. */
  const traNhanh = async (p, tenKho, { q, goiY, dichVu = "TD101", ngay = null }) => {
    if (tenKho === "390") {
      assert.equal(await bam(p, "#hh-tra-nhanh-nut"), true, "nút Tra nhanh");
      await choHop(p, ".sheet input[aria-label='Đối tác hoặc loại đối tác']");
    }
    const scope = tenKho === "390" ? ".sheet" : ".hh-tra-nhanh";
    await p.ev(setInput(`document.querySelector(${JSON.stringify(scope + " input[aria-label='Đối tác hoặc loại đối tác']")})`, q));
    await p.waitFor(`[...document.querySelectorAll(${JSON.stringify(scope + " [data-goi-y]")})].some((b) => b.textContent.includes(${JSON.stringify(goiY)}))`, `gợi ý «${goiY}»`);
    await p.ev(`[...document.querySelectorAll(${JSON.stringify(scope + " [data-goi-y]")})].find((b) => b.textContent.includes(${JSON.stringify(goiY)})).click(), true`);
    await p.ev(`(() => { const s = document.querySelector(${JSON.stringify(scope + " select[aria-label='Dịch vụ']")}); s.value = ${JSON.stringify(dichVu)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
    if (ngay) await p.ev(setInput(`document.querySelector(${JSON.stringify(scope + " .hh-tn-form input[type=date]")})`, ngay));
    await p.ev(`document.querySelector(${JSON.stringify(scope + " form.hh-tn-form")}).requestSubmit(), true`);
    await p.waitFor(`!!document.querySelector(${JSON.stringify(scope + " .hh-tn-kq")})`, "kết quả Tra nhanh");
    return scope;
  };
  /** Bấm «Xem dòng ↓» của kết quả Tra nhanh đang hiện (điện thoại: hộp tự đóng). */
  const xemDong = async (p, tenKho, scope) => {
    assert.equal(await p.ev(`(() => { const b = document.querySelector(${JSON.stringify(scope + " [data-xem-dong]")}); if (!b) return false; b.click(); return true; })()`), true, "nút «Xem dòng ↓»");
    if (tenKho === "390") await choDongHop(p);
  };
  const daNhay = (p, sel, nhan) => p.waitFor(`(() => { const e = document.querySelector(${JSON.stringify(sel)}); return !!e && e.classList.contains('hh-nhay') && document.activeElement === e; })()`, nhan);
  const theDangMo = (p) => p.ev("[...document.querySelectorAll('[role=tab][data-the]')].find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.the ?? null");
  const ghiCuoi = (p, duong) => p.ev(`(window.__hhGhi || []).filter((x) => x.u.includes(${JSON.stringify(duong)})).map((x) => x.s)`);
  const dongTra = async (p, tenKho) => { if (tenKho === "390" && (await p.ev("!!document.querySelector('.sheet')"))) { await clickTrong(p, ".sheet .sheet-foot", "Đóng"); await choDongHop(p); } };

  const homQua = vnDate(-1);
  try {
    for (const [tenKho, vp] of KHO) {
      const kho = `[${tenKho}]`;
      const D = tenKho === "390" ? "M" : "D";
      // ---- dựng dữ liệu bằng API (chưa mở trang nào) ----
      const loaiMoi = async (nhan) => phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/loai-doi-tac", { ten: `${nhan} ${CHU} ${D}` }), 201, `loại ${nhan}`).loai;
      const ruleMoi = async (loai, tuNgay, phamVi = { phamVi: "SERVICE", catalogCode: "TD101" }) =>
        phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: loai.code }, ...phamVi, kieu: "RATE", tyLeBp: 1000, tuNgay }), 201, `mức riêng ${loai.ten}`);
      const capMoi = async (ten) => ({ code: phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta", { ten }), 201, `cấp ${ten}`).muc.code, ten });
      const dongCap = async (cap, than) => phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${cap.code}/dong`, { tuNgay: "2026-01-01", ...than }), 201, `dòng của ${cap.ten}`);
      const xep = async (loai, cap, tuNgay) => phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta/gan", { loai: loai.code, muc: cap.code, tuNgay }), 201, `xếp ${loai.ten} vào ${cap.ten}`).gan;

      // Cấp (hơn 5 trong MỖI lượt, để HH_KHO=1040 chạy riêng vẫn có ma trận cuộn): Vàng có dòng nhóm + dòng theo loại khách (NL/TE/NCT); Khoá sẽ bị khoá bằng trang (bước K);
      // Hết: dòng duy nhất đã ngừng trước khi mở trang (ca toast của bước 1x).
      const C_A = await capMoi(`Vàng ${CHU} ${D}`);
      await dongCap(C_A, { phamVi: "ALL", kieu: "RATE", tyLeBp: 1000 });
      await dongCap(C_A, { phamVi: "GROUP", groupCode: NHOM, kieu: "RATE", tyLeBp: 1200 });
      await dongCap(C_A, { phamVi: "SERVICE", catalogCode: "TTB03", kieu: "PER_PAX", moiKhach: 100000, theoLoai: { treEm: 50000, nguoiCaoTuoi: 70000 } });
      const C_B = await capMoi(`Bạc ${CHU} ${D}`);
      await dongCap(C_B, { phamVi: "ALL", kieu: "RATE", tyLeBp: 800 });
      for (const [ten, bp] of [["Đồng", 700], ["Sắt", 600], ["Gỗ", 500]]) await dongCap(await capMoi(`${ten} ${CHU} ${D}`), { phamVi: "ALL", kieu: "RATE", tyLeBp: bp });
      const C_K = await capMoi(`Thép ${CHU} ${D}`);
      await dongCap(C_K, { phamVi: "ALL", kieu: "RATE", tyLeBp: 900 });
      const C_X = await capMoi(`Hết hạn ${CHU} ${D}`);
      await dongCap(C_X, { phamVi: "ALL", kieu: "RATE", tyLeBp: 400, tuNgay: vnDate(-30) });
      const R_X = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/muc-ta"), 200, "danh sách cấp").muc.find((m) => m.code === C_X.code).dong[0];
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/hoa-hong/${R_X.id}/dong`, { denNgay: homQua }), 200, "ngừng dòng của cấp Hết hạn (hết hôm qua)");

      const L_A = await loaiMoi("Lễ tân");
      const L_B = await loaiMoi("Hướng dẫn");
      const L_C = await loaiMoi("Tài xế taxi");
      const L_D = await loaiMoi("Khách sạn");
      const L_E = await loaiMoi("Nhà hàng");
      const L_F = await loaiMoi("Cửa hàng");
      const L_G = await loaiMoi("Cộng tác");
      for (const l of [L_A, L_B, L_C, L_D]) await ruleMoi(l, vnDate(-10));
      await ruleMoi(L_E, vnDate(10)); // sắp áp dụng
      await ruleMoi(L_F, vnDate(-10)); // sẽ bị ngừng sau
      await ruleMoi(L_G, HOM_NAY, { phamVi: "ALL" }); // còn mức riêng khi một cấp được áp dụng cho loại (bước 6)
      const L_H = await loaiMoi("Đại lý vé");
      await ruleMoi(L_H, HOM_NAY); // dòng bắt đầu hôm nay: có «Đổi», đổi từ ngày mai (bước 5b)
      const [TU_I, DEN_I] = HOM_NAY < "2027-01-01" ? ["2027-01-01", "2028-01-01"] : [vnDate(30), vnDate(395)];
      const L_I = await loaiMoi("Đại lý tàu");
      const R_I = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "VAI", code: L_I.code }, phamVi: "SERVICE", catalogCode: "TD101", kieu: "RATE", tyLeBp: 1000, tuNgay: TU_I, denNgay: DEN_I }), 201, "mức 2027 → 2028").dong;
      // Phủ mức (bước 1d): một loại KHONG_CO (không gì), một THIEU (chỉ TD101), một DU qua cấp Vàng, một theo cấp Khoá (bước K), một sẽ tắt bằng trang (bước T), một đã tắt bằng API.
      const L_KC = await loaiMoi("Chưa mức");
      const L_TH = await loaiMoi("Thiếu một phần");
      await ruleMoi(L_TH, vnDate(-10));
      const L_DU = await loaiMoi("Theo cấp Vàng");
      await xep(L_DU, C_A, vnDate(-10));
      const L_K = await loaiMoi("Theo cấp khoá");
      const G_K = await xep(L_K, C_K, vnDate(-10));
      const L_X = await loaiMoi("Theo cấp hết hạn");
      await xep(L_X, C_X, vnDate(-30));
      const L_TAT = await loaiMoi("Sẽ tắt");
      await ruleMoi(L_TAT, vnDate(-10), { phamVi: "ALL" });
      const L_TAT0 = await loaiMoi("Đã tắt sẵn");
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/loai-doi-tac/${L_TAT0.code}/tat`), 200, "tắt loại sẵn");

      const ds = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/hoa-hong"), 200, "danh sách mức").dong;
      const dongCua = (l) => ds.find((r) => r.doiTuong.loai === "VAI" && r.doiTuong.code === l.code);
      const [R_A, R_B, R_C, R_D, R_E, R_F, R_H] = [L_A, L_B, L_C, L_D, L_E, L_F, L_H].map(dongCua);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/hoa-hong/${R_F.id}/dong`, { denNgay: vnDate(7) }), 200, "ngừng sau cho dòng cửa hàng");
      const orgMoi = async (ten, loai) => {
        const o = phai(await call(ACCOUNTS.accounting, "POST", "/api/parties", { kind: "ORGANIZATION", displayName: ten }), 201, `hồ sơ ${ten}`).party;
        phai(await call(ACCOUNTS.admin, "POST", `/api/parties/${o.id}/roles`, { roleTypeCode: loai.code }), 201, "gắn loại cho hồ sơ");
        return { ...o, ten };
      };
      const ORG = await orgMoi(`Khách sạn Biển Xanh ${CHU} ${D}`, L_A);
      const ORG2 = await orgMoi(`Nhà hàng Hải Sản ${CHU} ${D}`, L_A);
      const ORG3 = await orgMoi(`Công ty Lữ hành Sao Biển ${CHU} ${D}`, L_A);
      const mucDt = async (phamVi, tyLeBp) =>
        phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/hoa-hong", { doiTuong: { loai: "DOI_TAC", partyId: ORG3.id }, ...phamVi, kieu: "RATE", tyLeBp, tuNgay: vnDate(-10) }), 201, "mức riêng của đối tác");
      await mucDt({ phamVi: "SERVICE", catalogCode: "TD101" }, 1200);
      await mucDt({ phamVi: "ALL" }, 500);
      await mucDt({ phamVi: "SERVICE", catalogCode: "TDLONG1" }, 800);
      const dsDt = phai(await call(ACCOUNTS.accounting, "GET", "/api/pricing/hoa-hong"), 200, "danh sách mức").dong.filter((r) => r.doiTuong.loai === "DOI_TAC" && r.doiTuong.partyId === ORG3.id);
      const R3_DOI = dsDt.find((r) => r.catalogCode === "TD101");
      const R3_NGUNG = dsDt.find((r) => r.phamVi === "ALL");
      assert.ok(R3_DOI && R3_NGUNG && dsDt.length === 3, `ba mức riêng của đối tác: ${dsDt.length}`);
      const csMoi = async (ten, tyLeBp) => { const c = await capMoi(ten); await dongCap(c, { phamVi: "ALL", kieu: "RATE", tyLeBp }); return c.code; };
      const TEN_CS_1 = `Riêng một ${CHU} ${D}`;
      const TEN_CS_2 = `Riêng hai ${CHU} ${D}`;
      const CS_1 = await csMoi(TEN_CS_1, 900);
      const CS_2 = await csMoi(TEN_CS_2, 1100);
      // Bước 12 (ADR-0148): một đại lý mang cấp riêng từ hôm nay (chưa có đơn).
      const ORG4 = await orgMoi(`Đại lý Sóng Xanh ${CHU} ${D}`, L_A);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/ho-so/${ORG4.id}/muc-rieng`, { muc: CS_1, tuNgay: HOM_NAY }), 201, "cấp riêng cho đại lý");
      // Bước 13 (N5): một loại áp dụng cấp «Sắp tới» từ hôm nay + 5.
      const TU_SAP = vnDate(5);
      const L_J = await loaiMoi("Đại lý tour");
      const CS_3 = await csMoi(`Sắp tới ${CHU} ${D}`, 950);
      const G_J = phai(await call(ACCOUNTS.accounting, "POST", "/api/pricing/muc-ta/gan", { loai: L_J.code, muc: CS_3, tuNgay: TU_SAP }), 201, "áp dụng cấp sắp tới cho loại").gan;
      // Bước 14 (N5): một đại lý mang cấp riêng SẮP áp dụng.
      const ORG5 = await orgMoi(`Đại lý Bình Minh ${CHU} ${D}`, L_A);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/ho-so/${ORG5.id}/muc-rieng`, { muc: CS_1, tuNgay: TU_SAP }), 201, "cấp riêng sắp áp cho đại lý");
      // Bước 1x (bậc 10–12) và CR (409): một đại lý mang cấp riêng Bạc từ 10 ngày trước.
      const ORG6 = await orgMoi(`Đại lý Hoàng Hôn ${CHU} ${D}`, L_A);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/ho-so/${ORG6.id}/muc-rieng`, { muc: C_B.code, tuNgay: vnDate(-10) }), 201, "cấp riêng Bạc cho đại lý");
      // Bước CR: đại lý mới, chưa có gì riêng.
      const ORG7 = await orgMoi(`Đại lý Ánh Dương ${CHU} ${D}`, L_A);
      // Bước DC (ADR-0151): bốn đại lý cho bốn ca của «Đổi cấp». ORG8 đổi thật; ORG9 mang cấp cũ ĐANG KHOÁ (khoá sau khi đặt); ORG10 có ngày ngừng; ORG11 gặp 409 (cấp mới bị khoá chen giữa).
      const C_N1 = await capMoi(`Mới một ${CHU} ${D}`);
      await dongCap(C_N1, { phamVi: "ALL", kieu: "RATE", tyLeBp: 650 });
      const C_Z = await capMoi(`Cũ khoá ${CHU} ${D}`);
      await dongCap(C_Z, { phamVi: "ALL", kieu: "RATE", tyLeBp: 600 });
      const ORG8 = await orgMoi(`Đại lý Gió Mới ${CHU} ${D}`, L_A);
      const ORG9 = await orgMoi(`Đại lý Sao Khuya ${CHU} ${D}`, L_A);
      const ORG10 = await orgMoi(`Đại lý Mây Trắng ${CHU} ${D}`, L_A);
      const ORG11 = await orgMoi(`Đại lý Sóng Bạc ${CHU} ${D}`, L_A);
      for (const [org, cap] of [[ORG8, C_A], [ORG9, C_Z], [ORG10, C_A], [ORG11, C_A]]) phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/ho-so/${org.id}/muc-rieng`, { muc: cap.code, tuNgay: vnDate(-10) }), 201, `cấp riêng cho ${org.ten}`);
      const ganCua = async (org) => phai(await call(ACCOUNTS.accounting, "GET", `/api/pricing/ho-so/${org.id}/hoa-hong`), 200, `hồ sơ ${org.ten}`).ganRieng[0];
      const G_8 = await ganCua(ORG8);
      const G_9 = await ganCua(ORG9);
      const G_10 = await ganCua(ORG10);
      const G_11 = await ganCua(ORG11);
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-ta/${C_Z.code}/tat`, {}), 200, "khoá cấp cũ của ORG9");
      phai(await call(ACCOUNTS.accounting, "POST", `/api/pricing/muc-rieng/${G_10.id}/ket-thuc`, { denNgay: vnDate(3) }), 200, "ORG10 có ngày ngừng");

      // ======================= Kế toán =======================
      {
        const p = await moTrang(ACCOUNTS.accounting, "/hoa-hong", vp);
        try {
          await choTrang(p);
          await buoc(`1${kho}`, "Kế toán: ba thẻ, phím mũi tên / Home / End, thẻ nhớ ở `hh-the`; giá trị cũ (ap-dung, thiet-lap, rác) mở «Các cấp đại lý»; Tra nhanh theo tên và theo loại", async () => {
            assert.deepEqual(await p.ev("[...document.querySelectorAll('.hh-the [role=tab]')].map((t) => t.textContent.trim())"), ["Các cấp đại lý", "Loại đối tác", "Riêng từng đối tác"]);
            assert.equal(await theDangMo(p), "cap", "mặc định mở «Các cấp đại lý»");
            assert.equal(await p.ev("document.getElementById('hh-the-loai').hidden && document.getElementById('hh-the-doi-tac').hidden"), true);
            await p.ev("document.getElementById('hh-tab-cap').focus(), true");
            const sau = [];
            for (const k of ["ArrowRight", "ArrowRight", "ArrowRight", "ArrowLeft", "End", "Home"]) {
              await phim(p, k);
              sau.push(await p.ev("[document.activeElement?.dataset.the ?? null, [...document.querySelectorAll('.hh-the [role=tab]')].find((t) => t.getAttribute('aria-selected') === 'true')?.dataset.the, sessionStorage.getItem('hh-the')].join('/')"));
            }
            assert.deepEqual(sau, ["loai/loai/loai", "doi-tac/doi-tac/doi-tac", "cap/cap/cap", "doi-tac/doi-tac/doi-tac", "doi-tac/doi-tac/doi-tac", "cap/cap/cap"], "phím mũi tên chuyển thẻ, giữ tiêu điểm, ghi hh-the");
            await bocucSach(p, `bước 1 ${kho}`);
            await axeKiem(p, `Kế toán mở /hoa-hong ${kho}`);
            await chup(p, `01-ke-toan-ba-the-${tenKho}`);
            for (const cu of ["ap-dung", "thiet-lap", "rác-xyz"]) {
              await p.ev(`sessionStorage.setItem('hh-the', ${JSON.stringify(cu)}), true`);
              await p.send("Page.reload");
              await sleep(300);
              await p.waitFor("document.readyState === 'complete'", "tải lại");
              await choTrang(p);
              assert.equal(await theDangMo(p), "cap", `hh-the=«${cu}» ⇒ thẻ «Các cấp đại lý»`);
              assert.equal(await p.ev("document.getElementById('hh-the-cap').hidden === false && document.querySelector('#hh-the-cap').innerText.trim().length > 20"), true, `hh-the=«${cu}»: thẻ có nội dung, không trống`);
            }
            let scope = await traNhanh(p, tenKho, { q: `Biển Xanh ${CHU} ${D}`, goiY: ORG.ten });
            const kqTen = await p.ev(`(() => { const k = document.querySelector(${JSON.stringify(scope + " .hh-tn-kq")}); return { so: k.querySelector('.hh-tn-so')?.textContent ?? '', cau: k.querySelector('.hh-ket-qua')?.textContent ?? '', theoLoai: k.innerText.includes(${JSON.stringify(CAU_TRA_THEO_LOAI)}) }; })()`);
            assert.match(kqTen.so, /10\s*%/, `số to của Tra nhanh theo tên: ${JSON.stringify(kqTen)}`);
            assert.ok(kqTen.cau.length > 10, "câu nguồn của máy chủ");
            assert.equal(kqTen.theoLoai, false, "tra theo tên không có câu «Đang tra theo loại»");
            await bocucSach(p, `bước 1 sau Tra nhanh theo tên ${kho}`);
            await chup(p, `02-tra-nhanh-theo-ten-${tenKho}`, tenKho !== "390");
            await dongTra(p, tenKho);
            scope = await traNhanh(p, tenKho, { q: L_A.ten.slice(0, 6), goiY: `Loại: ${L_A.ten}` });
            assert.equal(await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tn-kq")}).innerText.includes(${JSON.stringify(CAU_TRA_THEO_LOAI)})`), true, "tra theo loại có câu «Đang tra theo loại…»");
            await chup(p, `03-tra-nhanh-theo-loai-${tenKho}`, tenKho !== "390");
            await dongTra(p, tenKho);
          });

          await buoc(`1d${kho}`, "Dải §5.1: thân nguyên văn, mỗi loại thiếu một dòng nguyên văn, số ở tiêu đề = số dòng = số cụm thiếu ở thẻ loại, dòng loại đã tắt = số loại tắt của máy chủ", async () => {
            const dai = await p.ev(`(() => { const d = document.querySelector('#hh-dai .dai[data-tong="cat"]'); if (!d || document.getElementById('hh-dai').hidden) return null;
              return { tieuDe: d.querySelector('strong')?.textContent ?? '', p: [...d.querySelectorAll('.dai-cau > p')].map((x) => x.textContent), li: [...d.querySelectorAll('li')].map((x) => x.textContent), chu: d.innerText }; })()`);
            assert.ok(dai, "có dải `.dai[data-tong=cat]`");
            const n = dai.li.length;
            assert.equal(dai.tieuDe, cauTieuDeDai(n), `tiêu đề = số dòng: ${dai.tieuDe} / ${n} dòng`);
            assert.equal(dai.p[0], CAU_THAN_DAI, "thân dải nguyên văn §5.1");
            assert.ok(dai.li.includes(`${L_KC.ten}: chưa có mức cho dịch vụ nào`), `dòng KHONG_CO nguyên văn: ${JSON.stringify(dai.li.filter((x) => x.includes(CHU)).slice(0, 4))}`);
            const thieu = TEN_DV.filter((s) => s.code !== "TD101");
            const tenThieu = thieu.slice(0, 3).map((s) => s.name).join(", ") + (thieu.length > 3 ? ` và ${thieu.length - 3} dịch vụ khác` : "");
            assert.ok(dai.li.includes(`${L_TH.ten}: thiếu mức cho ${thieu.length} dịch vụ (${tenThieu})`), `dòng THIEU nguyên văn: ${dai.li.find((x) => x.startsWith(L_TH.ten))}`);
            for (const l of [L_DU, L_K, L_TAT, L_TAT0]) assert.ok(!dai.li.some((x) => x.startsWith(`${l.ten}:`)), `loại ${l.ten} không có dòng thiếu`);
            const soTat = phai(await goiTrongTrang(p, "GET", "/api/pricing/loai-doi-tac"), 200, "loại").loai.filter((l) => !l.dangBat).length;
            assert.ok(soTat >= 1 && dai.p.includes(cauLoaiTatDai(soTat)), `dòng loại đã tắt = ${soTat}: ${JSON.stringify(dai.p)}`);
            assert.ok(!/mở khoá|tự động/.test(dai.chu), "dải không chứa «mở khoá», «tự động»");
            await chuyenThe(p, "loai");
            await locLoai(p, "tat-ca");
            const cum = await p.ev("[...document.querySelectorAll('#hh-the-loai article[data-loai]')].map((a) => a.dataset.phu)");
            assert.equal(cum.filter((k) => k === "KHONG_CO" || k === "THIEU").length, n, `số cụm thiếu ở thẻ loại = ${n}`);
            assert.equal(await p.ev(`document.querySelector('article[data-loai="${L_KC.code}"] .hh-loai-dau .huy-hieu')?.dataset.tong`), "do", "loại KHONG_CO: huy hiệu `do`");
            assert.equal(await p.ev(`document.querySelector('article[data-loai="${L_TH.code}"] .hh-loai-dau .huy-hieu')?.dataset.tong`), "cat", "loại THIEU: huy hiệu `cat`");
            assert.equal(await p.ev(`document.querySelector('article[data-loai="${L_TAT0.code}"] .hh-loai-dau .huy-hieu')?.textContent.trim()`), "Đã tắt", "loại đã tắt: «Đã tắt»");
            await locLoai(p, "ap");
            await chuyenThe(p, "cap");
            await p.ev("window.scrollTo(0, 0), true");
            await bocucSach(p, `bước 1d ${kho}`);
            await chup(p, `01d-dai-canh-bao-${tenKho}`, false);
          });

          await buoc(`1m${kho}`, "Ma trận: hàng nhóm, ô «—» + câu §5.4, > 5 cấp cuộn trong khung (≥ 900) / chip theo cấp (< 900); khổ 900 + 1040 có thanh bên, cấp có NL/TE/NCT: trang không cuộn ngang", async () => {
            const kiemRong = async (nhan) => {
              await chonCap(p, C_A.code);
              const k = await p.ev(`(() => { const kh = document.querySelector('#hh-cap-ct .hh-muc-cap-khung'); const th = [...kh.querySelectorAll('thead th')].map((x) => x.textContent.trim());
                return { th, ox: getComputedStyle(kh).overflowX, sw: document.documentElement.scrollWidth, iw: innerWidth, sb: (() => { const s = document.getElementById('sidebar'); return s && getComputedStyle(s).display !== 'none' ? Math.round(s.getBoundingClientRect().width) : 0; })() }; })()`);
              assert.ok(k.th.includes("Người lớn") && k.th.includes("Trẻ em") && k.th.includes("Người cao tuổi"), `${nhan}: cấp Vàng có cột NL/TE/NCT: ${k.th}`);
              assert.ok(k.ox === "auto" || k.ox === "scroll", `${nhan}: bảng «Mức của cấp» cuộn trong khung (overflow-x ${k.ox})`);
              assert.ok(k.sw <= k.iw, `${nhan}: trang cuộn ngang ${k.sw} > ${k.iw}`);
              return k;
            };
            const nCap = await p.ev("document.querySelectorAll('.hh-cap-chon [data-chon-cap]').length");
            assert.ok(nCap > 5, `hơn 5 cấp: ${nCap}`);
            if (tenKho === "390") {
              assert.equal(await p.ev("getComputedStyle(document.querySelector('.hh-ma-tran-vung')).display"), "none", "390: ma trận ẩn");
              assert.equal(await p.ev("document.querySelector('.hh-cap-chon').offsetParent !== null"), true, "390: dải chip chọn cấp hiện");
              const chu = await p.ev("document.querySelector('main').innerText");
              assert.ok(!chu.includes(CAU_O_TRONG), "390: câu ô «—» không hiện khi không có ma trận");
              assert.ok(chu.includes(CAU_THU_TU_AP_MUC), "390: câu thứ tự áp mức §5.3 hiện");
              await kiemRong("390");
              await bocucSach(p, `bước 1m ${kho}`);
              await axeKiem(p, `ma trận / chip ${kho}`);
              await chup(p, `01m-chip-cap-${tenKho}`);
              return;
            }
            const mt = await p.ev(`(() => { const kh = document.querySelector('.hh-ma-tran-khung'); const bang = kh.querySelector('table'); const cot = [...bang.querySelectorAll('thead [data-chon-cap]')].map((b) => b.dataset.chonCap);
              const hang = [...bang.querySelectorAll('tbody tr')].map((tr) => ({ ten: tr.querySelector('th').textContent.trim(), o: [...tr.querySelectorAll('td')].map((td) => ({ chu: td.textContent.trim(), trong: td.classList.contains('hh-o-trong') })) }));
              return { cot, hang, nhieu: kh.hasAttribute('data-nhieu'), sw: kh.scrollWidth, cw: kh.clientWidth, ox: getComputedStyle(kh).overflowX, chip: document.querySelector('.hh-cap-chon').offsetParent !== null }; })()`);
            assert.ok(mt.nhieu && mt.sw > mt.cw && (mt.ox === "auto" || mt.ox === "scroll"), `1040: ma trận > 5 cấp cuộn trong khung (${mt.sw} > ${mt.cw}, ${mt.ox})`);
            assert.equal(mt.chip, false, "1040: chip chọn cấp ẩn");
            assert.equal(mt.hang[0]?.ten, "Mọi dịch vụ", "hàng đầu «Mọi dịch vụ»");
            const hNhom = mt.hang.find((x) => x.ten === `Nhóm ${TEN_NHOM}`);
            assert.ok(hNhom, `có hàng nhóm «Nhóm ${TEN_NHOM}»: ${mt.hang.map((x) => x.ten)}`);
            const iA = mt.cot.indexOf(C_A.code), iB = mt.cot.indexOf(C_B.code);
            assert.match(hNhom.o[iA].chu, /12\s*%/, "ô Vàng × nhóm = dòng nhóm 12%");
            assert.deepEqual(hNhom.o[iB], { chu: "—", trong: true }, "ô Bạc × nhóm: «—» (không kế thừa dòng «Mọi dịch vụ»)");
            assert.ok((await p.ev("document.querySelector('.hh-ma-tran-vung').innerText")).includes(CAU_O_TRONG), "câu §5.4 dưới ma trận");
            assert.ok((await p.ev("document.querySelector('main').innerText")).includes(CAU_THU_TU_AP_MUC), "câu thứ tự áp mức §5.3");
            const k1040 = await kiemRong("1040");
            await bocucSach(p, `bước 1m 1040 ${kho}`);
            await axeKiem(p, `ma trận ${kho}`);
            await chup(p, `01m-ma-tran-1040`);
            // 900 (thanh bên vẫn hiện) rồi 899 (bố cục điện thoại), cùng trang.
            try {
              for (const w of [900, 899]) {
                await p.send("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: false });
                await p.waitFor(`innerWidth === ${w}`, `khổ ${w}`);
                await sleep(400);
                if (w === 900) {
                  const k = await kiemRong("900");
                  assert.ok(k.sb > 0, `900: thanh bên đang mở (${k.sb}px)`);
                  console.log(`    (thanh bên: 1040 ⇒ ${k1040.sb}px, 900 ⇒ ${k.sb}px)`);
                  await bocucSach(p, `bước 1m 900 ${kho}`);
                  await chup(p, `01m-ma-tran-900`);
                } else {
                  assert.equal(await p.ev("getComputedStyle(document.querySelector('.hh-ma-tran-vung')).display"), "none", "899: ma trận ẩn");
                  assert.equal(await p.ev("document.querySelector('.hh-cap-chon').offsetParent !== null"), true, "899: chip chọn cấp hiện");
                  assert.ok(!(await p.ev("document.querySelector('main').innerText")).includes(CAU_O_TRONG), "899: câu ô «—» không hiện");
                  await kiemRong("899");
                  await bocucSach(p, `bước 1m 899 ${kho}`);
                  await chup(p, `01m-chip-899`);
                }
              }
            } finally {
              await p.send("Emulation.setDeviceMetricsOverride", { width: 1040, height: 900, deviceScaleFactor: 1, mobile: false });
              await p.waitFor("innerWidth === 1040", "khổ 1040");
              await sleep(400);
            }
          });

          await buoc(`1x${kho}`, "«Xem dòng ↓» §3.3: bậc 1–3 ⇒ đối tác, 4–6 ⇒ loại (kể cả khi bộ lọc giấu dòng), 7–9 và 10–12 ⇒ cấp (+ câu cấp riêng); dòng không có trên trang ⇒ toast", async () => {
            const dauMoi = async () => { await p.ev("window.scrollTo(0, 0), true"); };
            // bậc 4–6, bộ lọc thẻ loại đang giấu loại đó
            await chuyenThe(p, "loai");
            await p.ev(setInput("document.getElementById('hh-loc-tim-loai')", "khongkhopgica"));
            await p.waitFor(`!document.querySelector('#hh-the-loai article[data-loai="${L_A.code}"]')`, "bộ lọc giấu loại Lễ tân");
            await chuyenThe(p, "cap");
            await dauMoi();
            let scope = await traNhanh(p, tenKho, { q: `Biển Xanh ${CHU} ${D}`, goiY: ORG.ten });
            await xemDong(p, tenKho, scope);
            await daNhay(p, `#hh-the-loai article[data-loai="${L_A.code}"] tr[data-dong-id="${R_A.id}"]`, "bậc 4–6: dòng của loại được tô và nhận tiêu điểm");
            assert.equal(await theDangMo(p), "loai");
            assert.equal(await p.ev("sessionStorage.getItem('hh-the')"), "loai", "nhảy cũng ghi hh-the");
            assert.equal(await p.ev("document.getElementById('hh-loc-tim-loai').value"), "", "bộ lọc về mặc định");
            await chup(p, `04-xem-dong-loai-${tenKho}`);
            // bậc 1–3, bộ lọc thẻ đối tác đang giấu đối tác đó
            await chuyenThe(p, "doi-tac");
            await p.ev(setInput("document.getElementById('hh-loc-tim-doi-tac')", "khongkhopgica"));
            await p.waitFor(`!document.querySelector('.hh-dt[data-party="${ORG3.id}"]')`, "bộ lọc giấu đối tác");
            await chuyenThe(p, "cap");
            await dauMoi();
            scope = await traNhanh(p, tenKho, { q: `Sao Biển ${CHU} ${D}`, goiY: ORG3.ten });
            await xemDong(p, tenKho, scope);
            await daNhay(p, `.hh-dt[data-party="${ORG3.id}"] tr[data-dong-id="${R3_DOI.id}"]`, "bậc 1–3: dòng của đối tác được tô và nhận tiêu điểm");
            assert.equal(await theDangMo(p), "doi-tac");
            assert.equal(await p.ev("document.getElementById('hh-loc-tim-doi-tac').value"), "", "bộ lọc đối tác về mặc định");
            await chup(p, `04b-xem-dong-doi-tac-${tenKho}`);
            // bậc 7–9: loại theo cấp Vàng ⇒ dòng nhóm của cấp Vàng
            const dongA = phai(await goiTrongTrang(p, "GET", "/api/pricing/muc-ta"), 200, "cấp").muc.find((m) => m.code === C_A.code).dong;
            const R_A_NHOM = dongA.find((r) => r.phamVi === "GROUP");
            await chuyenThe(p, "loai");
            await dauMoi();
            scope = await traNhanh(p, tenKho, { q: L_DU.ten.slice(0, 8), goiY: `Loại: ${L_DU.ten}` });
            await xemDong(p, tenKho, scope);
            await daNhay(p, `#hh-cap-ct[data-cap="${C_A.code}"] tr[data-dong-id="${R_A_NHOM.id}"]`, "bậc 7–9: dòng nhóm của cấp Vàng");
            assert.equal(await theDangMo(p), "cap");
            assert.equal(await p.ev("!!document.querySelector('.hh-cap-rieng-tra')"), false, "bậc 7–9: không câu cấp riêng");
            // bậc 10–12: đại lý có cấp riêng Bạc
            await dauMoi();
            scope = await traNhanh(p, tenKho, { q: `Hoàng Hôn ${CHU} ${D}`, goiY: ORG6.ten });
            assert.match(await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tn-so")})?.textContent ?? ''`), /8\s*%/, "cấp riêng Bạc 8% thắng mức riêng của loại 10%");
            await xemDong(p, tenKho, scope);
            const R_B_ALL = phai(await goiTrongTrang(p, "GET", "/api/pricing/muc-ta"), 200, "cấp").muc.find((m) => m.code === C_B.code).dong[0];
            await daNhay(p, `#hh-cap-ct[data-cap="${C_B.code}"] tr[data-dong-id="${R_B_ALL.id}"]`, "bậc 10–12: dòng của cấp riêng");
            assert.equal(await p.ev("document.querySelector('.hh-cap-rieng-tra')?.textContent"), `${C_B.ten} ${CAU_CAP_RIENG_DANG_TRA}`, "bậc 10–12: «<cấp> — cấp riêng của đối tác đang tra»");
            await bocucSach(p, `bước 1x bậc 10–12 ${kho}`);
            await chup(p, `04c-xem-dong-cap-rieng-${tenKho}`);
            // dòng không có trên trang: dòng duy nhất của cấp Hết hạn đã ngừng trước khi mở trang; tra ngày cũ ⇒ dòng đó thắng, thẻ cấp không vẽ dòng đã ngừng ⇒ toast.
            await dauMoi();
            scope = await traNhanh(p, tenKho, { q: L_X.ten.slice(0, 8), goiY: `Loại: ${L_X.ten}`, ngay: vnDate(-5) });
            assert.match(await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tn-so")})?.textContent ?? ''`), /4\s*%/, "ngày cũ: dòng 4% của cấp Hết hạn thắng");
            await xemDong(p, tenKho, scope);
            await p.waitFor(`[...document.querySelectorAll('.toast')].some((t) => t.dataset.tong === 'bien' && t.textContent.includes(${JSON.stringify(CAU_KHONG_THAY_DONG)}))`, "toast «Không thấy dòng này trên trang — tải lại trang.» tông bien");
            await chup(p, `04d-toast-khong-thay-dong-${tenKho}`, false);
          });

          await buoc(`K${kho}`, "Khoá cấp: hộp §5.2 nguyên văn, huy hiệu `cat`; dòng mức của cấp khoá chỉ «Ngừng» (nút và «⋯»); không nút thêm; lần xếp «Đổi cấp» sang cấp khác ⇒ 200", async () => {
            await chuyenThe(p, "cap");
            await chonCap(p, C_K.code);
            assert.equal(await clickTrong(p, "#hh-cap-ct", "Khoá cấp"), true, "nút «Khoá cấp»");
            await choHop(p, ".sheet[role=alertdialog]");
            const hop = await p.ev("(() => { const s = document.querySelector('.sheet[role=alertdialog]'); return { t: s.querySelector('.sheet-title').textContent, p: s.querySelector('.sheet-body p').textContent, nut: [...s.querySelectorAll('.sheet-foot button')].map((b) => b.textContent.trim()) }; })()");
            const hk = HOP_KHOA_CAP(C_K.ten);
            assert.deepEqual(hop, { t: hk.tieuDe, p: hk.hauQua, nut: ["Giữ nguyên", hk.nut] }, "hộp Khoá cấp nguyên văn §5.2");
            assert.ok(!/mở khoá|tự động/.test(hop.p), "câu hậu quả không chứa «mở khoá» / «tự động»");
            await bocucSach(p, `bước K hộp ${kho}`);
            await axeKiem(p, `hộp Khoá cấp ${kho}`);
            await chup(p, `05k-hop-khoa-cap-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", hk.nut), true);
            await choOk(p, "Đã khoá cấp.");
            assert.deepEqual(await ghiCuoi(p, `/muc-ta/${C_K.code}/tat`), [200], "POST khoá cấp 200");
            await chonCap(p, C_K.code);
            const ct = await p.ev(`(() => { const c = document.querySelector('#hh-cap-ct[data-cap="${C_K.code}"]'); const hh = c.querySelector('.hh-cap-ct-dau .huy-hieu'); return { tong: hh?.dataset.tong, chu: hh?.textContent.trim(), nut: [...c.querySelectorAll('.hh-cap-nut button')].map((b) => b.textContent.trim()) }; })()`);
            assert.deepEqual(ct, { tong: "cat", chu: NHAN_CAP_DA_KHOA, nut: ["Mở lại cấp"] }, "huy hiệu `cat` nguyên văn; chỉ còn «Mở lại cấp» (không «Thêm loại vào cấp này», «＋ Thêm hoa hồng cho dịch vụ»)");
            const R_K = phai(await goiTrongTrang(p, "GET", "/api/pricing/muc-ta"), 200, "cấp").muc.find((m) => m.code === C_K.code).dong[0];
            const v = await viecCua(p, `#hh-cap-ct tr[data-dong-id="${R_K.id}"]`);
            assert.ok(v, "dòng mức của cấp khoá còn hiện");
            assert.deepEqual([v.nut, v.menu], [[], ["Ngừng"]], `cấp khoá: dòng mức chỉ còn «Ngừng» (nút ${JSON.stringify(v.nut)}, «⋯» ${JSON.stringify(v.menu)})`);
            const vg = await viecCua(p, `#hh-cap-ct li[data-gan-id="${G_K.id}"]`);
            const coDoiCap = !!vg && (vg.nut.includes("Đổi cấp") || vg.menu.includes("Đổi cấp"));
            assert.ok(coDoiCap && vg.menu.includes("Thôi theo cấp này"), `lần xếp vào cấp khoá còn «Đổi cấp» và «Thôi theo cấp này»: ${JSON.stringify(vg)}`);
            await bocucSach(p, `bước K ${kho}`);
            await axeKiem(p, `cấp đã khoá ${kho}`);
            await chup(p, `05k-cap-da-khoa-${tenKho}`);
            // Rà soát ngôn ngữ 30/10: hộp «Thôi theo cấp này» (chụp rồi đóng, không ghi).
            await chayViec(p, `#hh-cap-ct li[data-gan-id="${G_K.id}"]`, "Thôi theo cấp này");
            await choHop(p, "#hh-ngung-ngay");
            assert.equal(await p.ev("document.querySelector('.sheet-title').textContent"), "Thôi theo cấp này");
            await chup(p, `05k-hop-thoi-theo-cap-${tenKho}`, false);
            await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
            await choDongHop(p);
            await chayViec(p, `#hh-cap-ct li[data-gan-id="${G_K.id}"]`, "Đổi cấp");
            await choHop(p, "#hh-dcs-muc");
            assert.equal(await p.ev(`[...document.getElementById('hh-dcs-muc').options].some((o) => o.value === ${JSON.stringify(C_K.code)})`), false, "ô chọn cấp không có cấp đang khoá");
            await p.ev(`(() => { const s = document.getElementById('hh-dcs-muc'); s.value = ${JSON.stringify(C_B.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await bocucSach(p, `bước K hộp Đổi cấp ${kho}`);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await choDongHop(p);
            await p.waitFor(`(() => { const e = document.getElementById('ok'); return !e.hidden && e.textContent.startsWith('Loại «${L_K.ten}» đã theo cấp «${C_B.ten}»'); })()`, "câu đã đổi cấp");
            assert.deepEqual(await ghiCuoi(p, `/muc-ta/gan/${G_K.id}/doi`), [200], "POST Đổi cấp ra khỏi cấp khoá ⇒ 200 (tiêu chí 4)");
            const mt = (await goiTrongTrang(p, "GET", "/api/pricing/muc-ta")).json.muc;
            assert.ok(mt.find((m) => m.code === C_B.code).gan.some((g) => g.loai.code === L_K.code && g.tuNgay === HOM_NAY), "loại đã sang cấp Bạc từ hôm nay");
          });

          await buoc(`T${kho}`, "Tắt loại: hộp §5.2 nguyên văn; sau đó huy hiệu `xam` «Đã tắt»; dải thêm một loại đã tắt", async () => {
            await chuyenThe(p, "loai");
            const soTat0 = phai(await goiTrongTrang(p, "GET", "/api/pricing/loai-doi-tac"), 200, "loại").loai.filter((l) => !l.dangBat).length;
            await cuonToi(p, `article[data-loai="${L_TAT.code}"]`);
            assert.equal(await clickTrong(p, `article[data-loai="${L_TAT.code}"]`, "Tắt"), true, "nút «Tắt» của loại");
            await choHop(p, ".sheet[role=alertdialog]");
            const hop = await p.ev("(() => { const s = document.querySelector('.sheet[role=alertdialog]'); return { t: s.querySelector('.sheet-title').textContent, p: s.querySelector('.sheet-body p').textContent, nut: [...s.querySelectorAll('.sheet-foot button')].map((b) => b.textContent.trim()) }; })()");
            const ht = HOP_TAT_LOAI(L_TAT.ten);
            assert.deepEqual(hop, { t: ht.tieuDe, p: ht.hauQua, nut: ["Giữ nguyên", ht.nut] }, "hộp Tắt loại nguyên văn §5.2");
            await bocucSach(p, `bước T hộp ${kho}`);
            await axeKiem(p, `hộp Tắt loại ${kho}`);
            await chup(p, `05t-hop-tat-loai-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", ht.nut), true);
            await choOk(p, "Đã tắt loại.");
            await p.waitFor(`document.querySelector('article[data-loai="${L_TAT.code}"]')?.dataset.phu === 'TAT'`, "cụm loại đã tắt");
            const hh = await p.ev(`(() => { const b = document.querySelector('article[data-loai="${L_TAT.code}"] .hh-loai-dau .huy-hieu'); return { tong: b?.dataset.tong, chu: b?.textContent.trim(), nut: [...document.querySelectorAll('article[data-loai="${L_TAT.code}"] .hh-loai-dau button')].map((x) => x.textContent.trim()) }; })()`);
            assert.deepEqual(hh, { tong: "xam", chu: "Đã tắt", nut: ["Bật"] }, "huy hiệu `xam` «Đã tắt», nút «Bật»");
            assert.ok((await p.ev("[...document.querySelectorAll('#hh-dai .dai-cau > p')].map((x) => x.textContent)")).includes(cauLoaiTatDai(soTat0 + 1)), `dải: ${soTat0 + 1} loại đã tắt`);
            await bocucSach(p, `bước T ${kho}`);
            await chup(p, `05t-loai-da-tat-${tenKho}`);
          });

          await buoc(`8k${kho}`, "«⋯» bằng bàn phím: Tab tới nút, Enter mở, tiêu điểm vào khung, Tab tiếp, Esc đóng về «⋯»; aria-haspopup=dialog; nền inert khi mở (tiêu chí 8)", async () => {
            await chuyenThe(p, "cap");
            await chonCap(p, C_A.code);
            const dongAll = phai(await goiTrongTrang(p, "GET", "/api/pricing/muc-ta"), 200, "cấp").muc.find((m) => m.code === C_A.code).dong.find((r) => r.phamVi === "ALL");
            const SEL = `#hh-cap-ct tr[data-dong-id="${dongAll.id}"] .hh-viec-khac`;
            const a = await p.ev(`(() => { const n = document.querySelector(${JSON.stringify(SEL)}); n.dataset.hhDich = '1'; n.scrollIntoView({ block: 'center' });
              const tab = [...document.querySelectorAll('button, [href], input, select, textarea, [tabindex]')].filter((e) => e.tabIndex >= 0 && !e.disabled && e.offsetParent !== null && !e.closest('[inert]'));
              const i = tab.indexOf(n); if (i > 0) tab[i - 1].focus(); return { i, haspopup: n.getAttribute('aria-haspopup'), nhan: n.getAttribute('aria-label'), truoc: i > 0 ? (tab[i - 1].textContent || tab[i - 1].id).trim().slice(0, 30) : null }; })()`);
            assert.equal(a.haspopup, "dialog", "aria-haspopup=dialog");
            assert.match(a.nhan, /^Thao tác khác: /, "aria-label «Thao tác khác: …»");
            await phim(p, "Tab");
            assert.equal(await p.ev("document.activeElement?.dataset.hhDich === '1'"), true, `Tab (từ «${a.truoc}») tới «⋯»`);
            await phim(p, "Enter");
            await choHop(p, ".sheet .hh-viec-ds");
            const mo = await p.ev("(() => ({ tieuDiem: document.activeElement === document.querySelector('.sheet'), inert: [...document.body.children].filter((e) => !e.classList.contains('sheet-root')).every((e) => e.hasAttribute('inert')), nenCo: [...document.body.children].filter((e) => !e.classList.contains('sheet-root')).length }))()");
            assert.deepEqual({ tieuDiem: mo.tieuDiem, inert: mo.inert }, { tieuDiem: true, inert: true }, `Enter mở: tiêu điểm vào khung, nền inert (${mo.nenCo} phần tử nền)`);
            await phim(p, "Tab");
            const sau1 = await p.ev("(() => { const a = document.activeElement; return { trongHop: !!a?.closest('.sheet'), laDau: a === document.querySelector('.sheet .hh-viec-nut'), chu: (a?.textContent || a?.getAttribute('aria-label') || '').trim() }; })()");
            const thuTuTab = [sau1.chu];
            if (!sau1.laDau) {
              await phim(p, "Tab");
              const sau2 = await p.ev("(() => { const a = document.activeElement; return { laDau: a === document.querySelector('.sheet .hh-viec-nut'), chu: (a?.textContent || a?.getAttribute('aria-label') || '').trim() }; })()");
              thuTuTab.push(sau2.chu);
              console.log(`    (Tab trong bảng «⋯»: ${thuTuTab.map((x) => `«${x}»`).join(" → ")} — nút ✕ «Đóng» của moBangTruot đứng trước danh sách)`);
              assert.ok(sau1.trongHop && sau2.laDau, `Tab thứ hai tới nút đầu của danh sách: ${JSON.stringify(thuTuTab)}`);
              axeNhe.push(`8k ${kho}: Tab đầu tiên trong bảng «⋯» tới «${thuTuTab[0]}», Tab thứ hai tới «${thuTuTab[1]}» (nút đầu danh sách)`);
            }
            await bocucSach(p, `bước 8k bảng «⋯» ${kho}`);
            await axeKiem(p, `bảng «⋯» ${kho}`);
            await chup(p, `06k-bang-viec-khac-${tenKho}`, false);
            await phim(p, "Escape");
            await choDongHop(p);
            assert.equal(await p.ev("document.activeElement?.dataset.hhDich === '1'"), true, "Esc đóng, tiêu điểm về «⋯»");
            assert.equal(await p.ev("[...document.body.children].some((e) => e.hasAttribute('inert'))"), false, "đóng xong: nền hết inert");
          });

          await buoc(`CR${kho}`, "Cấp riêng ngay trên trang: đặt, sửa, ngừng; 409 chồng ngày hiện câu §6.1 nguyên văn trong hộp (tiêu chí 5)", async () => {
            await chuyenThe(p, "doi-tac");
            assert.equal(await clickTrong(p, "#hh-the-doi-tac .hh-cap-dau", "Chọn cấp riêng cho đối tác"), true, "nút chính «Chọn cấp riêng cho đối tác»");
            await choHop(p, "#hh-dcr-doi-tac");
            await p.ev(setInput("document.getElementById('hh-dcr-doi-tac')", `Ánh Dương ${CHU} ${D}`));
            await p.waitFor(`!!document.querySelector('.sheet button[data-party="${ORG7.id}"]')`, "kết quả tìm có đại lý");
            await bam(p, `.sheet button[data-party="${ORG7.id}"]`);
            assert.equal(await p.ev(`[...document.getElementById('hh-dcr-muc').options].some((o) => o.value === ${JSON.stringify(C_K.code)})`), false, "ô cấp không có cấp đang khoá");
            await p.ev(`(() => { const s = document.getElementById('hh-dcr-muc'); s.value = ${JSON.stringify(C_A.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await bocucSach(p, `bước CR hộp Đặt ${kho}`);
            await axeKiem(p, `hộp Đặt cấp riêng ${kho}`);
            await chup(p, `07c-hop-dat-cap-rieng-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await choOk(p, cauDaDatCapRieng(C_A.ten, ORG7.ten, HOM_NAY));
            const cum = `.hh-dt[data-party="${ORG7.id}"]`;
            await p.waitFor(`(() => { const c = document.querySelector('${cum}'); return !!c && c.querySelector('.hh-loai-nut').getAttribute('aria-expanded') === 'true' && !!c.querySelector('.hh-tl-gan li[data-gan-id]'); })()`, "cụm đại lý mở, có cấp riêng");
            const g1 = await p.ev(`(() => { const li = document.querySelector('${cum} .hh-tl-gan li[data-gan-id]'); return { id: li.dataset.ganId, chu: li.innerText }; })()`);
            assert.ok(g1.chu.includes(`Cấp riêng: ${C_A.ten}`), `dòng cấp riêng: ${g1.chu}`);
            const vg = await viecCua(p, `${cum} li[data-gan-id="${g1.id}"]`);
            assert.deepEqual([vg.nut.length > 0 ? vg.nut : vg.menu.slice(0, 1), vg.menu.filter((x) => x !== "Đổi cấp")], [["Đổi cấp"], ["Sửa", "Thôi theo cấp này"]], `cấp riêng (ADR-0151): «Đổi cấp» (nút ở máy tính / đầu «⋯» ở điện thoại), «⋯» còn Sửa, Ngừng áp dụng: ${JSON.stringify(vg)}`);
            await cuonToi(p, cum);
            await bocucSach(p, `bước CR sau Đặt ${kho}`);
            await chup(p, `07c-sau-dat-cap-rieng-${tenKho}`);
            await chayViec(p, `${cum} li[data-gan-id="${g1.id}"]`, "Sửa");
            await choHop(p, "#hh-scr-ly-do");
            assert.equal(await p.ev("document.querySelector('.sheet .hint[role=status]')?.textContent.trim()"), CAU_SUA_RIENG_HUY_THAY, "chưa có đơn ⇒ «sẽ thay hẳn»");
            await p.ev(`(() => { const s = document.getElementById('hh-scr-muc'); s.value = ${JSON.stringify(C_B.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await p.ev(setInput("document.getElementById('hh-scr-ly-do')", "Chọn nhầm cấp khi đặt cho đại lý"));
            await bocucSach(p, `bước CR hộp Sửa ${kho}`);
            await axeKiem(p, `hộp Sửa cấp riêng ${kho}`);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu sửa"), true);
            await choOk(p, CAU_DA_SUA_CAP_RIENG);
            const DS_HIEN = `${cum} .hh-tl-gan:not(.hh-lich-su) li[data-gan-id]`;
            await p.waitFor(`[...document.querySelectorAll('${DS_HIEN}')].some((li) => li.innerText.includes('Cấp riêng: ${C_B.ten}'))`, "cấp riêng mới (Bạc) hiện");
            const g2 = await p.ev(`[...document.querySelectorAll('${DS_HIEN}')].find((li) => li.innerText.includes('Cấp riêng: ${C_B.ten}')).dataset.ganId`);
            assert.equal(await p.ev(`document.querySelector('${cum} .hh-lich-su-khoi button')?.textContent.trim()`), "Xem lịch sử (1)", "lần cũ vào lịch sử");
            await chayViec(p, `${cum} li[data-gan-id="${g2}"]`, "Thôi theo cấp này");
            await choHop(p, "#hh-ngung-ngay");
            await bocucSach(p, `bước CR hộp Ngừng ${kho}`);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await choOk(p, cauDaNgungCapRieng(C_B.ten, ORG7.ten));
            const r = (await goiTrongTrang(p, "GET", `/api/pricing/ho-so/${ORG7.id}/hoa-hong`)).json;
            assert.ok(r.ganRieng.find((g) => g.id === g2)?.denNgay, `cấp riêng đã có ngày ngừng: ${JSON.stringify(r.ganRieng)}`);
            await chup(p, `07c-sau-ngung-cap-rieng-${tenKho}`);
            // 409: đặt cấp riêng chồng ngày cho đại lý đang có cấp riêng Bạc
            await p.ev("window.scrollTo(0, 0), true");
            assert.equal(await clickTrong(p, "#hh-the-doi-tac .hh-cap-dau", "Chọn cấp riêng cho đối tác"), true);
            await choHop(p, "#hh-dcr-doi-tac");
            await p.ev(setInput("document.getElementById('hh-dcr-doi-tac')", `Hoàng Hôn ${CHU} ${D}`));
            await p.waitFor(`!!document.querySelector('.sheet button[data-party="${ORG6.id}"]')`, "kết quả tìm có đại lý Hoàng Hôn");
            await bam(p, `.sheet button[data-party="${ORG6.id}"]`);
            await p.ev(`(() => { const s = document.getElementById('hh-dcr-muc'); s.value = ${JSON.stringify(C_A.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await p.waitFor("(() => { const w = document.querySelector('.sheet .sheet-warn'); return !!w && !w.hidden && w.textContent.trim().length > 5; })()", "câu lỗi của máy chủ trong hộp");
            assert.equal(await p.ev("document.querySelector('.sheet .sheet-warn').textContent"), CAU_409_CAP_RIENG, "câu 409 nguyên văn §6.1");
            assert.deepEqual(await ghiCuoi(p, `/ho-so/${ORG6.id}/muc-rieng`), [409], "máy chủ trả 409");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet .sheet-foot button')].every((b) => !b.disabled)"), true, "hộp còn mở, bấm lại được");
            await bocucSach(p, `bước CR 409 ${kho}`);
            await chup(p, `07c-409-cap-rieng-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
            await choDongHop(p);
          });

          await buoc(`DC${kho}`, "Đổi cấp riêng (ADR-0151): đổi từ hôm nay ⇒ cũ ngừng hôm qua + mới từ hôm nay; cấp cũ khoá ⇒ câu Đ8; có ngày ngừng ⇒ không nút; cấp mới bị khoá chen giữa ⇒ 409 nguyên văn trong hộp", async () => {
            await chuyenThe(p, "doi-tac");
            const moCum = async (org) => {
              const cum = `.hh-dt[data-party="${org.id}"]`;
              await cuonToi(p, cum);
              await p.ev(`(() => { const n = document.querySelector('${cum} .hh-loai-nut'); if (n.getAttribute('aria-expanded') !== 'true') n.click(); return true; })()`);
              await p.waitFor(`!!document.querySelector('${cum} .hh-tl-gan li[data-gan-id]')`, `cụm ${org.ten} mở, có cấp riêng`);
              return cum;
            };
            // (a) đổi thật: ORG8 Vàng -> Bạc từ hôm nay
            const cum8 = await moCum(ORG8);
            await chayViec(p, `${cum8} li[data-gan-id="${G_8.id}"]`, "Đổi cấp");
            await choHop(p, "#hh-dcr2-muc");
            assert.equal(await p.ev("document.querySelector('.sheet .sheet-title').textContent"), "Đổi cấp riêng", "tiêu đề hộp");
            const opts = await p.ev("[...document.getElementById('hh-dcr2-muc').options].map((o) => o.value)");
            assert.ok(!opts.includes(C_A.code) && !opts.includes(C_K.code) && !opts.includes(C_Z.code) && opts.includes(C_B.code), `ô cấp: chỉ cấp đang mở, khác cấp cũ: ${JSON.stringify(opts)}`);
            assert.equal(await p.ev("document.getElementById('hh-dcr2-tu').value"), HOM_NAY, "ô «Từ» mặc định hôm nay (cấp cũ bắt đầu 10 ngày trước)");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet p')].some((e) => e.textContent.startsWith('Cấp cũ «'))"), false, "cấp cũ đang mở ⇒ không có câu Đ8");
            await p.ev(`(() => { const s = document.getElementById('hh-dcr2-muc'); s.value = ${JSON.stringify(C_B.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await bocucSach(p, `bước DC hộp Đổi cấp ${kho}`);
            await axeKiem(p, `hộp Đổi cấp riêng ${kho}`);
            if (tenKho === "390") await chup(p, `17-hop-doi-cap-rieng-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await choOk(p, `«${ORG8.ten}» đã chuyển sang cấp riêng «${C_B.ten}» từ ngày ${ngayVi(HOM_NAY)}.`);
            assert.deepEqual(await ghiCuoi(p, `/muc-rieng/${G_8.id}/doi`), [200], "POST đổi cấp riêng 200");
            const r8 = (await goiTrongTrang(p, "GET", `/api/pricing/ho-so/${ORG8.id}/hoa-hong`)).json.ganRieng;
            const cu = r8.find((g) => g.id === G_8.id);
            const moi = r8.find((g) => g.id !== G_8.id && g.muc.code === C_B.code);
            assert.equal(cu?.denNgay, homQua, `lần cũ ngừng hôm qua: ${JSON.stringify(r8)}`);
            assert.equal(moi?.tuNgay, HOM_NAY, `lần mới từ hôm nay: ${JSON.stringify(r8)}`);
            assert.equal(moi?.denNgay, null, "lần mới không thời hạn");
            await p.waitFor(`[...document.querySelectorAll('${cum8} .hh-tl-gan:not(.hh-lich-su) li[data-gan-id]')].some((li) => li.innerText.includes('Cấp riêng: ${C_B.ten}'))`, "cấp riêng mới (Bạc) hiện");
            assert.equal(await p.ev(`document.querySelector('${cum8} .hh-lich-su-khoi button')?.textContent.trim()`), "Xem lịch sử (1)", "lần cũ vào lịch sử");
            await bocucSach(p, `bước DC sau đổi ${kho}`);
            // (b) cấp cũ đang khoá: hộp có câu Đ8 nguyên văn; cấp khoá không có trong ô chọn
            const cum9 = await moCum(ORG9);
            await chayViec(p, `${cum9} li[data-gan-id="${G_9.id}"]`, "Đổi cấp");
            await choHop(p, "#hh-dcr2-muc");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet .hint[role=status]')].map((e) => e.textContent.trim())[0]"), `Cấp cũ «${C_Z.ten}» đang khoá. Đổi xong thì không đổi ngược về cấp này được, trừ khi mở lại cấp.`, "câu Đ8 nguyên văn");
            await bocucSach(p, `bước DC hộp cấp cũ khoá ${kho}`);
            await axeKiem(p, `hộp Đổi cấp riêng (cấp cũ khoá) ${kho}`);
            if (tenKho === "390") await chup(p, `17-hop-doi-cap-rieng-cap-cu-khoa-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
            await choDongHop(p);
            // (c) lần có ngày ngừng: không «Đổi cấp» (nút lẫn «⋯»)
            const cum10 = await moCum(ORG10);
            const v10 = await viecCua(p, `${cum10} li[data-gan-id="${G_10.id}"]`);
            assert.ok(!v10 || (!v10.nut.includes("Đổi cấp") && !v10.menu.includes("Đổi cấp")), `lần có ngày ngừng không có «Đổi cấp»: ${JSON.stringify(v10)}`);
            // (d) 409: cấp mới bị khoá chen giữa lúc hộp đang mở (khoá bằng fetch trong trang — gọi từ ngoài sẽ đá phiên của trang)
            const cum11 = await moCum(ORG11);
            await chayViec(p, `${cum11} li[data-gan-id="${G_11.id}"]`, "Đổi cấp");
            await choHop(p, "#hh-dcr2-muc");
            await p.ev(`(() => { const s = document.getElementById('hh-dcr2-muc'); s.value = ${JSON.stringify(C_N1.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            assert.equal((await goiTrongTrang(p, "POST", `/api/pricing/muc-ta/${C_N1.code}/tat`, {})).status, 200, "khoá cấp mới chen giữa");
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await p.waitFor("(() => { const w = document.querySelector('.sheet .sheet-warn'); return !!w && !w.hidden && w.textContent.trim().length > 5; })()", "câu lỗi của máy chủ trong hộp");
            const hien = await p.ev("document.querySelector('.sheet .sheet-warn').textContent");
            const sonde = await goiTrongTrang(p, "POST", `/api/pricing/muc-rieng/${G_11.id}/doi`, { muc: C_N1.code, tuNgay: HOM_NAY });
            assert.equal(sonde.status, 409, `máy chủ trả 409: ${JSON.stringify(sonde.json)}`);
            assert.equal(hien, sonde.json.error.message, "câu 409 trong hộp = nguyên văn câu máy chủ");
            assert.deepEqual((await ghiCuoi(p, `/muc-rieng/${G_11.id}/doi`)).slice(0, 1), [409], "lần bấm của hộp trả 409");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet .sheet-foot button')].every((b) => !b.disabled)"), true, "hộp còn mở, bấm lại được");
            await bocucSach(p, `bước DC 409 ${kho}`);
            assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
            await choDongHop(p);
          });

          await buoc(`2${kho}`, "«＋ Thêm mức» → «Một đối tác» → tạo → đối tác hiện ở thẻ «Riêng từng đối tác»; ô «Tách theo loại khách» không bị kéo dài", async () => {
            assert.equal(await p.ev(`(() => { const b = [...document.querySelectorAll('#hh-them-muc, #hh-them-muc-day')].find((x) => x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`), true, "nút «＋ Thêm mức» đang hiện");
            await choHop(p, "#hh-hop-pham-vi");
            assert.equal(await p.ev("document.querySelector('.sheet-title').textContent"), "Thêm mức hoa hồng");
            assert.equal(await bam(p, "input[name='hh-hop-ai'][value='DOI_TAC']"), true);
            await p.ev(setInput("document.getElementById('hh-hop-doi-tac')", `Hải Sản ${CHU} ${D}`));
            await p.waitFor(`!!document.querySelector('.sheet button[data-party="${ORG2.id}"]')`, "kết quả tìm có đối tác");
            await bam(p, `.sheet button[data-party="${ORG2.id}"]`);
            await p.ev("(() => { const s = document.getElementById('hh-hop-pham-vi'); s.value = 'SERVICE'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            await p.ev("(() => { const s = document.getElementById('hh-hop-dich-vu'); s.value = 'TD101'; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            await p.ev("(() => { const k = document.getElementById('hh-hop-kieu'); k.value = 'PER_PAX'; k.dispatchEvent(new Event('change', { bubbles: true })); document.getElementById('hh-hop-theo-loai').click(); return true; })()");
            const rongO = await p.ev("document.getElementById('hh-hop-theo-loai').getBoundingClientRect().width");
            assert.ok(rongO > 0 && rongO <= 32, `ô «Tách theo loại khách» rộng ${rongO}px — bị kéo dài (thiếu lớp o-tick)`);
            await chup(p, `05b-o-tach-theo-loai-${tenKho}`, false);
            await p.ev("(() => { document.getElementById('hh-hop-theo-loai').click(); const k = document.getElementById('hh-hop-kieu'); k.value = 'RATE'; k.dispatchEvent(new Event('change', { bubbles: true })); return true; })()");
            await p.ev(setInput("document.getElementById('hh-hop-ty-le')", "12,5"));
            await p.waitFor("!document.querySelector('.sheet .hint[aria-live]').hidden", "câu «Sẽ tạo…» hiện");
            assert.match(await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent"), /^Sẽ tạo: .*12,5\s*%.*không thời hạn\.$/);
            await bocucSach(p, `bước 2 hộp Thêm mức ${kho}`);
            await axeKiem(p, `hộp Thêm mức ${kho}`);
            await chup(p, `05-hop-them-muc-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Thêm mức"), true);
            await choOk(p, "Đã thêm mức.");
            await choDongHop(p);
            await chuyenThe(p, "doi-tac");
            await p.waitFor(`!!document.querySelector('.hh-dt[data-party="${ORG2.id}"]')`, "đối tác có ở thẻ «Riêng từng đối tác»");
            assert.match(await p.ev(`document.querySelector('.hh-dt[data-party="${ORG2.id}"]').innerText`), /Mức riêng/);
            await bocucSach(p, `bước 2 ${kho}`);
          });

          await buoc(`2c${kho}`, "Tên dịch vụ rất dài (≥ 120 ký tự) ở dòng đối tác: không tràn ngang, dòng tóm tắt bắt đầu bằng số", async () => {
            await chuyenThe(p, "doi-tac");
            const k = await p.ev(`(() => { const t = document.querySelector('.hh-dt[data-party="${ORG3.id}"] .hh-tom-tat'); return t ? { chu: t.textContent, rong: document.documentElement.scrollWidth, khung: innerWidth } : null; })()`);
            assert.ok(k, "đối tác có dòng tóm tắt");
            assert.match(k.chu, /^\d/, `dòng tóm tắt bắt đầu bằng số: ${k.chu.slice(0, 60)}`);
            assert.ok(k.chu.includes(TEN_DAI), "tên dịch vụ dài có trong dòng tóm tắt (bị cắt bằng CSS, không mất chữ)");
            assert.ok(k.rong <= k.khung, `không tràn ngang: scrollWidth ${k.rong} > ${k.khung}`);
            await cuonToi(p, `.hh-dt[data-party="${ORG3.id}"]`);
            await bocucSach(p, `bước 2c ${kho}`);
            await chup(p, `17-ten-dich-vu-rat-dai-${tenKho}`, false);
          });

          await buoc(`2b${kho}`, "Thẻ «Riêng từng đối tác»: mở một đối tác thấy số, «Đổi» và «Ngừng» dòng mức riêng chạy được", async () => {
            const sel = `.hh-dt[data-party="${ORG3.id}"]`;
            if ((await p.ev(`document.querySelector('${sel} .hh-loai-nut').getAttribute('aria-expanded')`)) === "true") await bam(p, `${sel} .hh-loai-nut`); // bước 1x đã mở
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-lo-ct').hidden`), true, "đóng");
            assert.equal(await bam(p, `${sel} .hh-loai-nut`), true);
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-loai-nut').getAttribute('aria-expanded')`), "true");
            await p.waitFor(`[...document.querySelectorAll('${sel} .hh-lo-ct h3')].some((x) => x.textContent === 'Cấp riêng')`, "hồ sơ đã nạp");
            const chu = await p.ev(`document.querySelector('${sel} .hh-lo-ct').innerText`);
            assert.match(chu, /12\s*%/, `thấy số của dòng mức riêng: ${chu.slice(0, 200)}`);
            assert.ok(chu.includes("Đang áp dụng"), "thấy trạng thái");
            assert.ok(chu.includes("Danh bạ"), "có liên kết hồ sơ ở Danh bạ");
            assert.equal(await p.ev("document.querySelectorAll('[role=button] button').length"), 0, "không có vai nút nào chứa nút thật");
            await bocucSach(p, `bước 2b mở đối tác ${kho}`);
            await axeKiem(p, `đối tác mở ${kho}`);
            await chup(p, `18-doi-tac-mo-ra-${tenKho}`);
            await moDoi(p, R3_DOI.id);
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "14"));
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            let dong = await cacDong(p);
            assert.equal(dong.find((r) => r.id === R3_DOI.id).denNgay, homQua, "dòng cũ của đối tác ngừng hôm qua");
            assert.ok(dong.some((r) => r.doiTuong.partyId === ORG3.id && r.id !== R3_DOI.id && r.tyLeBp === 1400), "dòng mới 14% của đối tác");
            assert.equal(await p.ev(`document.querySelector('${sel} .hh-loai-nut').getAttribute('aria-expanded')`), "true", "đối tác vẫn mở sau khi vẽ lại");
            await chayViec(p, `tr[data-dong-id="${R3_NGUNG.id}"]`, "Ngừng");
            await choHop(p, "#hh-ngung-ngay");
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Ngừng"), true);
            await choOk(p, "Đã ngừng.");
            await choDongHop(p);
            dong = await cacDong(p);
            assert.notEqual(dong.find((r) => r.id === R3_NGUNG.id).denNgay, null, "dòng «Mọi dịch vụ» của đối tác đã có ngày ngừng");
            await bocucSach(p, `bước 2b ${kho}`);
          });

          await buoc(`3${kho}`, "Thẻ loại — «Đổi» dòng mức riêng: Từ = hôm nay → cũ ngừng hôm qua; Từ = hôm nay + 5 → cũ ngừng hôm nay + 4; «Tất cả» hiện dòng đã ngừng", async () => {
            await chuyenThe(p, "loai");
            await locLoai(p, "ap");
            await moDoi(p, R_B.id);
            assert.match(await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent"), /^Mức cũ .* sẽ ngừng, đến hết /);
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "20"));
            await bocucSach(p, `bước 3a hộp Đổi ${kho}`);
            await axeKiem(p, `hộp Đổi ${kho}`);
            await chup(p, `06-hop-doi-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            let dong = await cacDong(p);
            const cuB = dong.find((r) => r.id === R_B.id);
            const moiB = dong.find((r) => r.doiTuong.code === L_B.code && r.id !== R_B.id);
            assert.equal(cuB.denNgay, homQua, "dòng cũ ngừng hôm qua");
            assert.equal(moiB.tuNgay, HOM_NAY, "dòng mới từ hôm nay");
            assert.equal(await hang(p, R_B.id), null, "mặc định («Đang và sắp áp dụng») giấu dòng đã ngừng");
            await locLoai(p, "tat-ca");
            const [hCu, hMoi] = [await hang(p, R_B.id), await hang(p, moiB.id)];
            assert.ok(hCu?.chu.includes("Đã ngừng") && hCu.nut.length === 0 && !hCu.khac, `«Tất cả»: dòng cũ «Đã ngừng», không việc: ${JSON.stringify(hCu)}`);
            assert.ok(hMoi?.chu.includes("Đang áp dụng"), `dòng mới «Đang áp dụng»: ${JSON.stringify(hMoi)}`);
            await cuonToi(p, `tr[data-dong-id="${R_B.id}"]`);
            await chup(p, `07-sau-doi-tu-hom-nay-${tenKho}`);
            await locLoai(p, "ap");
            await moDoi(p, R_C.id);
            await p.ev(setInput("document.getElementById('hh-doi-tu-ngay')", vnDate(5)));
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "15"));
            assert.match(await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent"), /^Mức cũ .* sẽ ngừng, đến hết /);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            dong = await cacDong(p);
            assert.equal(dong.find((r) => r.id === R_C.id).denNgay, vnDate(4), "dòng cũ ngừng hôm nay + 4");
            const moiC = dong.find((r) => r.doiTuong.code === L_C.code && r.id !== R_C.id);
            assert.equal(moiC.tuNgay, vnDate(5), "dòng mới từ hôm nay + 5");
            const v = await viecCua(p, `tr[data-dong-id="${R_C.id}"]`);
            const hCu2 = await hang(p, R_C.id);
            assert.ok(hCu2.chu.includes(`đến ${ngayVi(vnDate(4))}`) && hCu2.chu.includes("Đang áp dụng"), `dòng cũ «đến <ngày>», đang áp: ${hCu2.chu}`);
            assert.deepEqual([v.nut, v.menu], [[], ["Sửa"]], `dòng đã hẹn ngày ngừng: chỉ «Sửa» (ADR-0148): ${JSON.stringify(v)}`);
            await bocucSach(p, `bước 3 ${kho}`);
          });

          await buoc(`4${kho}`, "Đổi bị từ chối: dòng bị ngừng giữa chừng → hộp còn mở, câu của máy chủ hiện, «Huỷ» bấm được", async () => {
            await chuyenThe(p, "loai");
            await moDoi(p, R_D.id);
            const kq = await goiTrongTrang(p, "POST", `/api/pricing/hoa-hong/${R_D.id}/dong`, { denNgay: HOM_NAY });
            assert.equal(kq.status, 200, JSON.stringify(kq.json));
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "30"));
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Đổi mức"), true);
            await p.waitFor("(() => { const w = document.querySelector('.sheet .sheet-warn'); return !!w && !w.hidden && w.textContent.trim().length > 5; })()", "câu lỗi của máy chủ trong hộp");
            const cau = await p.ev("document.querySelector('.sheet .sheet-warn').textContent");
            assert.ok(!CHU_ANH.test(cau), `câu lỗi không lộ mã: ${cau}`);
            assert.equal(await p.ev("!!document.querySelector('.sheet')"), true, "hộp còn mở");
            assert.equal(await p.ev("[...document.querySelectorAll('.sheet .sheet-foot button')].every((b) => !b.disabled)"), true, "nút bấm lại được");
            await bocucSach(p, `bước 4 ${kho}`);
            await chup(p, `08-doi-bi-tu-choi-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
            await choDongHop(p);
          });

          await buoc(`5${kho}`, "Thẻ loại — dòng sắp áp dụng và dòng có ngày ngừng tương lai: không Đổi / Ngừng, chỉ «Sửa» (ADR-0148); huy hiệu đúng", async () => {
            await chuyenThe(p, "loai");
            const [e, f] = [await hang(p, R_E.id), await hang(p, R_F.id)];
            assert.ok(e?.chu.includes("Sắp áp dụng"), `dòng sắp áp dụng: ${JSON.stringify(e)}`);
            assert.ok(f?.chu.includes(`đến ${ngayVi(vnDate(7))}`) && f.chu.includes("Đang áp dụng"), `dòng ngừng sau: ${JSON.stringify(f)}`);
            for (const id of [R_E.id, R_F.id]) {
              const v = await viecCua(p, `tr[data-dong-id="${id}"]`);
              assert.deepEqual([v.nut, v.menu], [[], ["Sửa"]], `chỉ «Sửa»: ${JSON.stringify(v)}`);
            }
            await cuonToi(p, `article[data-loai="${L_E.code}"]`);
            await bocucSach(p, `bước 5 ${kho}`);
            await axeKiem(p, `dòng sắp / ngừng sau ${kho}`);
            await chup(p, `09-dong-sap-va-ngung-sau-${tenKho}`);
          });

          await buoc(`5b${kho}`, "Dòng bắt đầu hôm nay: có «Đổi»; hộp Đổi từ ngày mai kèm câu vì sao; đổi xong cũ ngừng hết hôm nay, mới từ ngày mai", async () => {
            const MAI = vnDate(1);
            await chuyenThe(p, "loai");
            const v0 = await viecCua(p, `tr[data-dong-id="${R_H.id}"]`);
            const tatCa = [...v0.nut, ...v0.menu];
            assert.ok(["Đổi", "Sửa", "Ngừng"].every((x) => tatCa.includes(x)) && tatCa.length === 3, `dòng bắt đầu hôm nay: Đổi, Sửa, Ngừng: ${JSON.stringify(v0)}`);
            if (tenKho !== "390") assert.deepEqual(v0.nut, ["Đổi"], "máy tính: «Đổi» thấy sẵn, còn lại trong «⋯»");
            else assert.equal(v0.menu[0], "Đổi", "điện thoại: «Đổi» đứng đầu «⋯»");
            await moDoi(p, R_H.id);
            assert.deepEqual(await p.ev("(() => { const t = document.getElementById('hh-doi-tu-ngay'); return { v: t.value, min: t.min }; })()"), { v: MAI, min: MAI }, "ô Từ mặc định và sớm nhất là ngày mai");
            assert.ok(await p.ev(`[...document.querySelectorAll('.sheet .hint')].some((x) => x.textContent.trim() === ${JSON.stringify(CAU_DOI_TU_NGAY_MAI)})`), "câu vì sao mức mới từ ngày mai");
            assert.ok((await p.ev("document.querySelector('.sheet .hint[aria-live]').textContent")).endsWith(`đến hết ${ngayVi(HOM_NAY)}.`), "mức cũ ngừng hết hôm nay");
            await p.ev(setInput("document.getElementById('hh-doi-ty-le')", "25"));
            await bocucSach(p, `bước 5b hộp Đổi ${kho}`);
            await axeKiem(p, `hộp Đổi dòng bắt đầu hôm nay ${kho}`);
            await chup(p, `09b-hop-doi-dong-hom-nay-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Đổi mức"), true);
            await choOk(p, "Đã đổi mức.");
            await choDongHop(p);
            const dong = await cacDong(p);
            const moiH = dong.find((r) => r.doiTuong.code === L_H.code && r.id !== R_H.id);
            assert.equal(dong.find((r) => r.id === R_H.id).denNgay, HOM_NAY, "dòng cũ ngừng hết hôm nay");
            assert.equal(moiH?.tuNgay, MAI, "dòng mới từ ngày mai");
            const v1 = await viecCua(p, `tr[data-dong-id="${R_H.id}"]`);
            assert.ok(![...v1.nut, ...v1.menu].some((t) => t === "Đổi" || t === "Ngừng"), `dòng cũ không Đổi / Ngừng: ${JSON.stringify(v1)}`);
            await bocucSach(p, `bước 5b ${kho}`);
          });

          await buoc(`11${kho}`, "Sửa (ADR-0148): dòng 2027 → 2028 chưa có đơn — «sẽ thay hẳn», điền sẵn số + hai ngày, lý do bắt buộc; lưu ⇒ «Tất cả» hiện dòng cũ «Đã huỷ — thay bằng dòng khác», không việc", async () => {
            await chuyenThe(p, "loai");
            await locLoai(p, "ap");
            const h0 = await hang(p, R_I.id);
            assert.ok(h0 && h0.chu.includes("Sắp áp dụng"), `dòng 2027 → 2028: ${JSON.stringify(h0)}`);
            const v0 = await viecCua(p, `tr[data-dong-id="${R_I.id}"]`);
            assert.deepEqual([v0.nut, v0.menu], [[], ["Sửa"]], "dòng chưa tới ngày: chỉ «Sửa»");
            await chayViec(p, `tr[data-dong-id="${R_I.id}"]`, "Sửa");
            await choHop(p, "#hh-sua-ly-do");
            const o = await p.ev(`(() => ({ cau: document.querySelector('.sheet .hint[role=status]')?.textContent.trim() ?? '', tu: document.getElementById('hh-sua-tu-ngay').value,
              denChon: document.getElementById('hh-sua-den-chon').value, den: document.getElementById('hh-sua-den-ngay').value, tyLe: document.getElementById('hh-sua-ty-le').value }))()`);
            assert.deepEqual(o, { cau: CAU_SUA_HUY_THAY, tu: TU_I, denChon: "NGAY", den: DEN_I, tyLe: "10" }, "điền sẵn số và HAI ngày của dòng cũ");
            await p.ev(setInput("document.getElementById('hh-sua-ty-le')", "12"));
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu sửa"), true);
            await p.waitFor("(() => { const e = document.querySelector('.sheet [data-loi=lyDo]'); return !!e && !e.hidden; })()", "lỗi lý do dưới ô");
            assert.equal(await p.ev("document.querySelector('.sheet [data-loi=lyDo]').textContent"), "Ghi lý do sửa (ít nhất 10 ký tự).");
            assert.equal(await p.ev("!!document.querySelector('.sheet')"), true, "thiếu lý do: hộp còn mở, không gửi");
            await p.ev(setInput("document.getElementById('hh-sua-ly-do')", "Nhập sai giá đại lý của tour"));
            await bocucSach(p, `bước 11 hộp Sửa ${kho}`);
            await axeKiem(p, `hộp Sửa ${kho}`);
            await chup(p, `19-hop-sua-huy-thay-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu sửa"), true);
            await choOk(p, "Đã sửa mức.");
            await choDongHop(p);
            const dong = await cacDong(p);
            const cu = dong.find((r) => r.id === R_I.id);
            const moi = dong.find((r) => r.thayCho === R_I.id);
            assert.deepEqual([cu.daHuy, moi?.tyLeBp, moi?.tuNgay, moi?.denNgay, moi?.lyDoSua], [true, 1200, TU_I, DEN_I, "Nhập sai giá đại lý của tour"], "dòng mới giữ hai ngày, mang lý do");
            assert.equal(await hang(p, R_I.id), null, "bộ lọc «Đang và sắp áp dụng» giấu dòng đã huỷ");
            assert.ok((await hang(p, moi.id))?.chu.includes("12"), "dòng mới 12% hiện");
            await locLoai(p, "tat-ca");
            const hHuy = await hang(p, R_I.id);
            assert.ok(hHuy && hHuy.chu.includes(NHAN_DA_HUY) && hHuy.nut.length === 0 && !hHuy.khac, `dòng huỷ ở «Tất cả»: «${NHAN_DA_HUY}», không việc: ${JSON.stringify(hHuy)}`);
            await cuonToi(p, `tr[data-dong-id="${R_I.id}"]`);
            await bocucSach(p, `bước 11 ${kho}`);
            await axeKiem(p, `dòng đã huỷ ${kho}`);
            await chup(p, `20-dong-da-huy-${tenKho}`);
            await locLoai(p, "ap");
          });

          await buoc(`6${kho}`, "Loại «Có sẵn» không Tắt/Bật + câu lý do; «＋ Thêm loại»; «＋ Thêm cấp đại lý»; «Áp dụng cấp cho loại» với loại còn mức riêng → khung vàng", async () => {
            await chuyenThe(p, "loai");
            const goc = await p.ev("[...document.querySelectorAll('#hh-the-loai article[data-loai]')].filter((a) => [...a.querySelectorAll('.badge')].some((b) => b.textContent.trim() === 'Có sẵn')).map((a) => [...a.querySelectorAll('.hh-loai-dau button')].map((b) => b.textContent.trim()))");
            assert.ok(goc.length > 0, "có loại mang nhãn «Có sẵn»");
            for (const nut of goc) assert.ok(!nut.some((t) => /^(Tắt|Bật)$/.test(t)), `«Có sẵn» không có Tắt/Bật: ${nut}`);
            assert.ok(await p.ev("[...document.querySelectorAll('#hh-the-loai .hint')].some((x) => x.textContent.trim() === 'Loại có sẵn đi kèm tài khoản đăng nhập của đối tác nên không tắt được.')"), "câu lý do dưới danh sách loại");
            await bocucSach(p, `bước 6 thẻ loại ${kho}`);
            await axeKiem(p, `thẻ loại ${kho}`);
            await chup(p, `10-the-loai-${tenKho}`);
            const TEN_LOAI = `Điểm bán ${CHU} ${D}`;
            assert.equal(await clickTrong(p, "#hh-the-loai .hh-cap-dau", "＋ Thêm loại"), true);
            await choHop(p, "#hh-hoi-ten");
            await p.ev(setInput("document.getElementById('hh-hoi-ten')", TEN_LOAI));
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Thêm loại"), true);
            await choOk(p, "Đã thêm loại.");
            await choDongHop(p);
            await p.waitFor(`[...document.querySelectorAll('#hh-the-loai article[data-loai] h3')].some((x) => x.textContent === ${JSON.stringify(TEN_LOAI)})`, "loại mới có trong danh sách");
            await chuyenThe(p, "cap");
            const TEN_CAP = `Cấp thử ${CHU} ${D}`;
            assert.equal(await clickTrong(p, "#hh-the-cap .hh-cap-dau", "＋ Thêm cấp đại lý"), true);
            await choHop(p, "#hh-hoi-ten");
            assert.equal(await p.ev("document.querySelector('.sheet-title').textContent"), "Thêm cấp đại lý");
            await p.ev(setInput("document.getElementById('hh-hoi-ten')", TEN_CAP));
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Thêm cấp đại lý"), true);
            await choOk(p, "Đã thêm cấp đại lý.");
            await choDongHop(p);
            const maCap = (await goiTrongTrang(p, "GET", "/api/pricing/muc-ta")).json.muc.find((m) => m.ten === TEN_CAP)?.code;
            assert.ok(maCap, "cấp mới có ở máy chủ");
            await chonCap(p, maCap);
            assert.ok((await p.ev("document.querySelector('#hh-cap-ct').innerText")).includes("Cấp này chưa có mức nào."), "câu nhắc §4.3 của cấp rỗng");
            assert.equal(await clickTrong(p, "#hh-cap-ct", "Thêm loại vào cấp này"), true, "nút «Thêm loại vào cấp này»");
            await choHop(p, "#hh-adcs-loai");
            await p.ev(`(() => { const s = document.getElementById('hh-adcs-loai'); s.value = ${JSON.stringify(L_G.code)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await bocucSach(p, `bước 6 hộp Áp dụng ${kho}`);
            await chup(p, `11-hop-ap-dung-cap-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu"), true);
            await choDongHop(p);
            await p.waitFor("[...document.querySelectorAll('#hh-noi-dung .sheet-warn')].some((w) => !w.hidden && w.offsetParent !== null && w.innerText.length > 10)", "khung vàng");
            const vang = await p.ev("[...document.querySelectorAll('#hh-noi-dung .sheet-warn')].find((w) => !w.hidden && w.offsetParent !== null && w.innerText.length > 10).innerText");
            assert.ok(vang.includes(CAU_THONG_BAO_DONG_RIENG), `khung vàng: ${vang}`);
            assert.ok(vang.includes(L_G.ten), `khung vàng nêu loại còn mức riêng: ${vang}`);
            await p.ev("window.scrollTo(0, 0), true");
            await bocucSach(p, `bước 6 khung vàng ${kho}`);
            await chup(p, `12-khung-vang-${tenKho}`);
            // Rà soát ngôn ngữ 30/10: hộp «Chọn cấp cho loại» mở từ thẻ Loại đối tác (loại mới chưa theo cấp nào); chụp rồi đóng, không ghi.
            await chuyenThe(p, "loai");
            assert.equal(await p.ev(`(() => { const a = [...document.querySelectorAll('#hh-the-loai article[data-loai]')].find((x) => x.querySelector('h3')?.textContent === ${JSON.stringify(TEN_LOAI)}); const b = a && [...a.querySelectorAll('button')].find((x) => x.textContent.trim() === 'Chọn cấp cho loại này' && x.offsetParent !== null); if (!b) return false; b.click(); return true; })()`), true, "nút «Chọn cấp cho loại này» ở loại mới");
            await choHop(p, ".sheet .hh-viec-ds");
            assert.equal(await clickTrong(p, ".sheet .hh-viec-ds", TEN_CAP), true, "chọn cấp trong danh sách");
            await choHop(p, "#hh-adcs-loai");
            assert.equal(await p.ev("document.querySelector('.sheet-title').textContent"), "Chọn cấp cho loại");
            await chup(p, `13-hop-chon-cap-cho-loai-${tenKho}`, false);
            await p.ev("document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })), true");
            await choDongHop(p);
          });

          await buoc(`13${kho}`, "N5 — chi tiết cấp: lần áp dụng SẮP tới, «Sắp áp dụng từ …» + chỉ «Sửa»; sửa ⇒ lần cũ vào «Xem lịch sử» «Đã huỷ…», không việc; lần mới dưới cấp mới", async () => {
            await chuyenThe(p, "cap");
            await chonCap(p, CS_3);
            const dongGan = (id) => p.ev(`(() => { const li = document.querySelector('#hh-cap-ct li[data-gan-id="${id}"]'); if (!li) return null;
              return { chu: li.innerText, an: !!li.closest('[hidden]'), sapAp: li.hasAttribute('data-sap-ap'), nut: [...li.querySelectorAll('button')].map((b) => b.textContent.trim()) }; })()`);
            const g0 = await dongGan(G_J.id);
            assert.ok(g0 && !g0.an && g0.sapAp && g0.chu.includes(L_J.ten) && g0.chu.includes(`Sắp áp dụng từ ${ngayVi(TU_SAP)}`), `lần sắp áp hiện dưới cấp: ${JSON.stringify(g0)}`);
            const v0 = await viecCua(p, `#hh-cap-ct li[data-gan-id="${G_J.id}"]`);
            assert.deepEqual([v0.nut, v0.menu], [[], ["Sửa"]], "lần sắp áp: chỉ «Sửa» (không Đổi cấp / Thôi theo cấp này — chưa tới ngày)");
            assert.equal(await p.ev("!!document.querySelector('#hh-cap-ct .hh-lich-su-khoi')"), false, "chưa có lịch sử ⇒ không nút «Xem lịch sử»");
            await bocucSach(p, `bước 13 chi tiết cấp ${kho}`);
            await axeKiem(p, `chi tiết cấp — lần sắp áp ${kho}`);
            await chup(p, `23-cap-lan-sap-ap-${tenKho}`);
            await chayViec(p, `#hh-cap-ct li[data-gan-id="${G_J.id}"]`, "Sửa");
            await choHop(p, "#hh-sua-gan-ly-do");
            const o = await p.ev(`(() => ({ cau: document.querySelector('.sheet .hint[role=status]')?.textContent.trim() ?? '', muc: document.getElementById('hh-sua-gan-muc').value, tu: document.getElementById('hh-sua-gan-tu').value }))()`);
            assert.deepEqual(o, { cau: CAU_SUA_CS_HUY_THAY, muc: CS_3, tu: TU_SAP }, "điền sẵn cấp và ngày của lần cũ");
            await p.ev(`(() => { const s = document.getElementById('hh-sua-gan-muc'); s.value = ${JSON.stringify(CS_2)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await p.ev(setInput("document.getElementById('hh-sua-gan-ly-do')", "Chọn nhầm cấp cho loại này"));
            await bocucSach(p, `bước 13 hộp Sửa áp dụng ${kho}`);
            await axeKiem(p, `hộp Sửa áp dụng ${kho}`);
            await chup(p, `24-hop-sua-lan-sap-ap-${tenKho}`, false);
            assert.equal(await clickTrong(p, ".sheet .sheet-foot", "Lưu sửa"), true);
            await choDongHop(p);
            await p.waitFor(`(() => { const e = document.getElementById('ok'); return !e.hidden && e.textContent.startsWith('Đã sửa: loại «${L_J.ten}»'); })()`, "câu đã sửa áp dụng");
            const mt = (await goiTrongTrang(p, "GET", "/api/pricing/muc-ta")).json.muc;
            const cu = mt.find((m) => m.code === CS_3).gan.find((g) => g.id === G_J.id);
            const moi = mt.find((m) => m.code === CS_2).gan.find((g) => g.thayCho === G_J.id);
            assert.deepEqual([cu.daHuy, moi?.tuNgay, moi?.loai.code], [true, TU_SAP, L_J.code], "lần cũ đã huỷ, lần mới cùng loại, cùng ngày");
            await chonCap(p, CS_3);
            await p.waitFor("!!document.querySelector('#hh-cap-ct .hh-lich-su-khoi button')", "nút «Xem lịch sử» ở cấp cũ");
            assert.deepEqual(await p.ev("(() => { const b = document.querySelector('#hh-cap-ct .hh-lich-su-khoi button'); return { chu: b.textContent.trim(), mo: b.getAttribute('aria-expanded') }; })()"), { chu: "Xem lịch sử (1)", mo: "false" });
            assert.equal((await dongGan(G_J.id))?.an, true, "mặc định lịch sử ẩn");
            assert.equal(await p.ev("(() => { const b = document.querySelector('#hh-cap-ct .hh-lich-su-khoi button'); b.click(); return b.getAttribute('aria-expanded'); })()"), "true");
            const gHuy = await dongGan(G_J.id);
            assert.ok(gHuy && !gHuy.an && gHuy.chu.includes(NHAN_DA_HUY) && gHuy.chu.includes(L_J.ten), `lần đã huỷ trong lịch sử: ${JSON.stringify(gHuy)}`);
            assert.deepEqual(gHuy.nut, [], "lịch sử: không nút");
            assert.equal(await p.ev("document.querySelector('#hh-cap-ct .hh-lich-su-khoi button').textContent.trim()"), "Ẩn lịch sử");
            await bocucSach(p, `bước 13 lịch sử ${kho}`);
            await axeKiem(p, `chi tiết cấp — lịch sử áp dụng ${kho}`);
            await chup(p, `25-cap-lich-su-${tenKho}`);
            await chonCap(p, CS_2);
            const gMoi = await dongGan(moi.id);
            const vm = await viecCua(p, `#hh-cap-ct li[data-gan-id="${moi.id}"]`);
            assert.ok(gMoi && gMoi.sapAp && gMoi.chu.includes(`Sắp áp dụng từ ${ngayVi(TU_SAP)}`) && vm.menu.includes("Sửa"), `lần mới dưới cấp mới: ${JSON.stringify(gMoi)} ${JSON.stringify(vm)}`);
          });

          if (tenKho === "390") {
            // Từ đợt 0 (644ba653) nút Trợ lý nằm trên thanh trên, không còn nút nổi `#tl-fab` ⇒ bước này đo: không còn nút nổi nào, tâm «＋ Thêm mức» ở thanh đáy trả đúng nút đó
            // (không bị thanh tab hay lớp nào che), bấm mở được hộp.
            await buoc(`9${kho}`, "Hit-test thanh đáy: «＋ Thêm mức» không bị gì che (không còn nút nổi Trợ lý); bấm mở hộp", async () => {
              await chuyenThe(p, "cap");
              await p.ev("window.scrollTo(0, 0); true");
              await sleep(500);
              assert.equal(await p.ev("!!document.getElementById('tl-fab') || !!document.querySelector('.tl-fab')"), false, "không còn nút nổi Trợ lý (đợt 0 chuyển lên thanh trên)");
              const doHit = () => p.ev(`(() => { const n = document.getElementById('hh-them-muc-day'); const r = n.getBoundingClientRect(); const e = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
                return { dung: e === n || n.contains(e), hien: r.width > 0 && r.bottom <= innerHeight + 1, nut: [r.top, r.bottom, r.left, r.right], nutKhac: e ? (e.id || e.className || e.tagName) : null }; })()`);
              const hit = await doHit();
              assert.deepEqual({ dung: hit.dung, hien: hit.hien }, { dung: true, hien: true }, `tâm nút «＋ Thêm mức» bị che bởi ${hit.nutKhac} (${JSON.stringify(hit)})`);
              await chup(p, `13-thanh-day-khong-bi-che-${tenKho}`, false);
              assert.equal(await bam(p, "#hh-them-muc-day"), true);
              await choHop(p, "#hh-hop-pham-vi");
              assert.equal(await clickTrong(p, ".sheet", "Huỷ"), true);
              await choDongHop(p);
            });
          }

          await buoc(`10${kho}`, "Chuỗi cấm không có trong chữ nhìn thấy (ba thẻ; thẻ loại «Tất cả»; mọi cụm đối tác mở)", async () => {
            for (const the of ["cap", "loai", "doi-tac"]) {
              await chuyenThe(p, the);
              if (the === "loai") await locLoai(p, "tat-ca");
              if (the === "doi-tac") {
                await p.ev("(() => { for (const n of document.querySelectorAll('#hh-the-doi-tac .hh-loai-nut')) if (n.getAttribute('aria-expanded') !== 'true') n.click(); return true; })()");
                await sleep(1500);
              }
              await bocucSach(p, `bước 10 thẻ ${the} ${kho}`);
            }
            await chup(p, `14-tat-ca-dong-mo-${tenKho}`);
            await chuyenThe(p, "loai");
            await locLoai(p, "ap");
            await chuyenThe(p, "cap");
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Kế toán ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Kế toán — danh mục hỏng (Review Focus 2) =======================
      {
        const p = await moTrang(ACCOUNTS.accounting, "/hoa-hong", vp, { them: HONG_DANH_MUC });
        try {
          await buoc(`1e${kho}`, "Danh mục hỏng: dải chỉ câu «chưa kiểm được», không số nào; thẻ loại không huy hiệu phủ mức", async () => {
            await choTrang(p);
            const dai = await p.ev("(() => { const d = document.querySelector('#hh-dai .dai'); return d && !document.getElementById('hh-dai').hidden ? { chu: d.innerText.trim(), li: d.querySelectorAll('li').length, strong: d.querySelectorAll('strong').length } : null; })()");
            assert.deepEqual(dai, { chu: CAU_DAI_CHUA_KIEM, li: 0, strong: 0 }, `dải chỉ câu chưa kiểm được: ${JSON.stringify(dai)}`);
            await chuyenThe(p, "loai");
            assert.equal(await p.ev("[...document.querySelectorAll('#hh-the-loai article[data-loai]')].filter((a) => a.dataset.phu !== 'TAT' && [...a.querySelectorAll('.hh-loai-dau .huy-hieu')].length > 0).length"), 0, "loại chưa kiểm được: không huy hiệu phủ mức");
            await chup(p, `01e-danh-muc-hong-${tenKho}`, false);
          });
        } finally {
          p.close();
        }
      }

      // ======================= Quản trị — Danh bạ (ADR-0148: Sửa cấp riêng của một đại lý) =======================
      {
        const p = await moTrang(ACCOUNTS.admin, `/parties?id=${encodeURIComponent(ORG4.id)}`, vp);
        try {
          await buoc(`12${kho}`, "Danh bạ (Quản trị): cấp riêng có «Sửa» cạnh «Thôi theo cấp này»; chưa có đơn ⇒ «sẽ thay hẳn»; đổi cấp + lý do ⇒ lưu, cấp riêng mới", async () => {
            const SEC = "#hoa-hong-hien-hanh";
            await p.waitFor(`(() => { const s = document.querySelector('${SEC}'); return !!s && !s.hidden && s.innerText.includes('Cấp riêng'); })()`, "mục Hoa hồng hiện hành");
            assert.deepEqual(await p.ev(`[...document.querySelectorAll('${SEC} .actions button')].map((b) => b.textContent.trim())`), ["Thôi theo cấp này", "Sửa"]);
            assert.equal(await clickTrong(p, SEC, "Sửa"), true);
            await choHop(p, "#hhhh-sua-ly-do");
            assert.equal(await p.ev(`document.querySelector('${SEC} .hint[role=status]').textContent.trim()`), CAU_SUA_RIENG_HUY_THAY);
            assert.deepEqual(await p.ev("(() => ({ muc: document.getElementById('hhhh-sua-muc').value, tu: document.getElementById('hhhh-sua-tu').value, den: document.getElementById('hhhh-sua-den').value }))()"),
              { muc: CS_1, tu: HOM_NAY, den: "" }, "điền sẵn cấp và ngày của cấp riêng cũ");
            await p.ev(`(() => { const s = document.getElementById('hhhh-sua-muc'); s.value = ${JSON.stringify(CS_2)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await p.ev(setInput("document.getElementById('hhhh-sua-ly-do')", "Chọn nhầm cấp khi tạo hồ sơ"));
            const m = await p.ev(`(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
              nho: [...document.querySelectorAll('${SEC} input, ${SEC} select')].filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.tagName),
              chu: document.querySelector('${SEC}').innerText }))()`);
            assert.ok(m.sw <= m.iw, `tràn ngang: ${m.sw} > ${m.iw}`);
            assert.deepEqual(m.nho, [], "ô gõ nhỏ hơn 16px");
            assert.ok(!CHU_ANH.test(m.chu), `lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
            assert.ok(!CHINH_SACH.test(m.chu), "mục Hoa hồng hiện hành còn chữ «chính sách»");
            await axeKiem(p, `Danh bạ — Sửa cấp riêng ${kho}`);
            await chup(p, `21-danh-ba-sua-cap-rieng-${tenKho}`);
            assert.equal(await clickTrong(p, SEC, "Lưu sửa"), true);
            await p.waitFor(`(() => { const e = document.querySelector('${SEC} .alert.ok'); return !!e && e.textContent.trim() === 'Đã sửa cấp riêng của đại lý này.'; })()`, "câu đã sửa");
            const r = await goiTrongTrang(p, "GET", `/api/pricing/ho-so/${ORG4.id}/hoa-hong`);
            assert.equal(r.json.mucRieng?.muc.code, CS_2, `cấp riêng mới: ${JSON.stringify(r.json.mucRieng)}`);
            await chup(p, `22-danh-ba-sau-sua-${tenKho}`);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Quản trị Danh bạ ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Quản trị — Danh bạ (N5: cấp riêng SẮP áp dụng có «Sửa»; lịch sử «Đã huỷ») =======================
      {
        const p = await moTrang(ACCOUNTS.admin, `/parties?id=${encodeURIComponent(ORG5.id)}`, vp);
        try {
          await buoc(`14${kho}`, "N5 — Danh bạ (Quản trị): cấp riêng SẮP áp dụng hiện «Sắp áp dụng từ …» kèm «Sửa»; sửa ⇒ lần mới sắp áp, lần cũ trong «Xem lịch sử» «Đã huỷ…», không nút", async () => {
            const SEC = "#hoa-hong-hien-hanh";
            const SAP = `${SEC} [data-khoi="gan-rieng-sap"]`;
            await p.waitFor(`(() => { const s = document.querySelector('${SEC}'); return !!s && !s.hidden && !!document.querySelector('${SAP}'); })()`, "mục Hoa hồng hiện hành có cấp riêng sắp áp");
            const sap0 = await p.ev(`[...document.querySelectorAll('${SAP} li')].map((li) => ({ chu: li.innerText, nut: [...li.querySelectorAll('button')].map((b) => b.textContent.trim()) }))`);
            assert.equal(sap0.length, 1, `một lần sắp áp: ${JSON.stringify(sap0)}`);
            assert.ok(sap0[0].chu.includes(`Cấp riêng: ${TEN_CS_1}`) && sap0[0].chu.includes(`Sắp áp dụng từ ${ngayVi(TU_SAP)}`), `dòng sắp áp: ${sap0[0].chu}`);
            assert.deepEqual(sap0[0].nut, ["Sửa"]);
            assert.deepEqual(await p.ev(`[...document.querySelectorAll('${SEC} .actions button')].map((b) => b.textContent.trim())`), ["Áp dụng cấp riêng"], "hôm nay chưa có cấp riêng đang áp: nút như cũ");
            assert.equal(await p.ev(`!!document.querySelector('${SEC} .hh-lich-su-khoi')`), false, "chưa có lịch sử");
            const kiemMuc = async (nhan) => {
              const m = await p.ev(`(() => ({ sw: document.documentElement.scrollWidth, iw: innerWidth,
                nho: [...document.querySelectorAll('${SEC} input, ${SEC} select')].filter((e) => e.offsetParent !== null && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.id || e.tagName),
                chu: document.querySelector('${SEC}').innerText }))()`);
              assert.ok(m.sw <= m.iw, `${nhan}: tràn ngang ${m.sw} > ${m.iw}`);
              assert.deepEqual(m.nho, [], `${nhan}: ô gõ nhỏ hơn 16px`);
              assert.ok(!CHU_ANH.test(m.chu), `${nhan}: lộ chữ Anh / mã thô: ${CHU_ANH.exec(m.chu)?.[0]}`);
              for (const re of [...CHU_CAM, CHINH_SACH]) assert.ok(!re.test(m.chu), `${nhan}: còn chữ cũ «${re.exec(m.chu)?.[0]}»`);
            };
            await p.ev(`document.querySelector('${SEC}').scrollIntoView({ block: 'start' }), true`);
            await kiemMuc(`bước 14 ${kho}`);
            await axeKiem(p, `Danh bạ — cấp riêng sắp áp ${kho}`);
            await chup(p, `26-danh-ba-cap-rieng-sap-ap-${tenKho}`);
            assert.equal(await clickTrong(p, SAP, "Sửa"), true, "nút Sửa của lần sắp áp");
            await choHop(p, "#hhhh-sua-ly-do");
            assert.equal(await p.ev(`document.querySelector('${SEC} .hint[role=status]').textContent.trim()`), CAU_SUA_RIENG_HUY_THAY);
            assert.deepEqual(await p.ev("(() => ({ muc: document.getElementById('hhhh-sua-muc').value, tu: document.getElementById('hhhh-sua-tu').value, den: document.getElementById('hhhh-sua-den').value }))()"),
              { muc: CS_1, tu: TU_SAP, den: "" }, "điền sẵn cấp và ngày của lần sắp áp");
            await p.ev(`(() => { const s = document.getElementById('hhhh-sua-muc'); s.value = ${JSON.stringify(CS_2)}; s.dispatchEvent(new Event('change', { bubbles: true })); return true; })()`);
            await p.ev(setInput("document.getElementById('hhhh-sua-ly-do')", "Chọn nhầm cấp khi hẹn ngày áp dụng"));
            assert.equal(await clickTrong(p, SEC, "Lưu sửa"), true);
            await p.waitFor(`(() => { const e = document.querySelector('${SEC} .alert.ok'); return !!e && e.textContent.trim() === 'Đã sửa cấp riêng của đại lý này.'; })()`, "câu đã sửa");
            const r = (await goiTrongTrang(p, "GET", `/api/pricing/ho-so/${ORG5.id}/hoa-hong`)).json;
            assert.equal(r.mucRieng, null, "hôm nay vẫn chưa có cấp riêng đang áp");
            assert.deepEqual(r.ganRieng.map((g) => [g.muc.code, g.daHuy, g.tuNgay]), [[CS_2, false, TU_SAP], [CS_1, true, TU_SAP]], "lịch sử: lần mới rồi lần đã huỷ");
            const sap1 = await p.ev(`[...document.querySelectorAll('${SAP} li')].map((li) => li.innerText)`);
            assert.ok(sap1.length === 1 && sap1[0].includes(`Cấp riêng: ${TEN_CS_2}`) && sap1[0].includes("Sắp áp dụng từ"), `lần mới sắp áp: ${JSON.stringify(sap1)}`);
            const NUT_LS = `${SEC} .hh-lich-su-khoi button`;
            assert.equal(await p.ev(`document.querySelector('${NUT_LS}')?.textContent.trim()`), "Xem lịch sử (1)");
            assert.equal(await p.ev(`document.querySelector('${SEC} .hh-lich-su').hidden`), true, "mặc định lịch sử ẩn");
            await p.ev(`document.querySelector('${NUT_LS}').click(), true`);
            const ls = await p.ev(`[...document.querySelectorAll('${SEC} .hh-lich-su li')].map((li) => ({ chu: li.innerText, nut: li.querySelectorAll('button').length, an: !!li.closest('[hidden]') }))`);
            assert.equal(ls.length, 1, `một lần trong lịch sử: ${JSON.stringify(ls)}`);
            assert.ok(!ls[0].an && ls[0].chu.includes(`Cấp riêng: ${TEN_CS_1}`) && ls[0].chu.includes(NHAN_DA_HUY) && ls[0].nut === 0, `lần đã huỷ: ${JSON.stringify(ls[0])}`);
            await kiemMuc(`bước 14 lịch sử ${kho}`);
            await axeKiem(p, `Danh bạ — lịch sử cấp riêng ${kho}`);
            await chup(p, `27-danh-ba-lich-su-${tenKho}`);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Quản trị Danh bạ N5 ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Bán hàng =======================
      {
        const p = await moTrang(ACCOUNTS.salesA, "/hoa-hong", vp, { them: PHA === "lo-nut" ? PHA_LO_NUT : "" });
        try {
          await choTrang(p);
          await buoc(`7${kho}`, "Bán hàng: không một nút ghi nào (ba thẻ, mọi cụm đối tác mở, không «⋯» / «Đổi» nào); Tra nhanh theo tên vẫn chạy", async () => {
            const demNut = async () => p.ev(`(() => {
              const nut = [...document.querySelectorAll('#hh-noi-dung button, #hh-them-muc, #hh-thanh-cuoi button')].filter((b) => b.offsetParent !== null || b.closest('[hidden]') === null).map((b) => b.textContent.trim()).filter((t) => /${NUT_GHI.source}/.test(t));
              const viec = document.querySelectorAll('#hh-noi-dung .hh-viec-khac, #hh-noi-dung .hh-viec-doi, #hh-noi-dung .hh-viec').length;
              const vaiNut = document.querySelectorAll('#hh-noi-dung [role=button]:not([role=tab])').length;
              const an = ['hh-them-muc', 'hh-thanh-cuoi'].map((i) => document.getElementById(i).hidden);
              return { nut, viec, vaiNut, an }; })()`);
            for (const the of ["cap", "loai", "doi-tac"]) {
              await chuyenThe(p, the);
              if (the === "doi-tac") {
                await p.ev("(() => { for (const n of document.querySelectorAll('#hh-the-doi-tac .hh-loai-nut')) if (n.getAttribute('aria-expanded') !== 'true') n.click(); return true; })()");
                await sleep(1500);
              }
              const k = await demNut();
              assert.deepEqual(k, { nut: [], viec: 0, vaiNut: 0, an: [true, true] }, `Bán hàng thấy nút ghi ở thẻ ${the}: ${JSON.stringify(k)}`);
              if (the === "cap") {
                // Cấp CS_2 có lần áp dụng sắp tới (sau bước 13): người chỉ xem thấy dòng, không việc.
                await chonCap(p, CS_2);
                const sap = await p.ev("[...document.querySelectorAll('#hh-cap-ct li[data-sap-ap]')].map((li) => ({ chu: li.innerText, nut: li.querySelectorAll('button').length }))");
                assert.ok(sap.length >= 1 && sap.every((x) => x.chu.includes("Sắp áp dụng từ") && x.nut === 0), `Bán hàng: lần sắp áp hiện, không nút: ${JSON.stringify(sap)}`);
                const k2 = await demNut();
                assert.deepEqual([k2.nut, k2.viec], [[], 0], `Bán hàng: chi tiết cấp không nút ghi: ${JSON.stringify(k2)}`);
              }
              await bocucSach(p, `bước 7 thẻ ${the} ${kho}`);
              await axeKiem(p, `Bán hàng thẻ ${the} ${kho}`);
            }
            await chuyenThe(p, "cap");
            await p.ev("window.scrollTo(0, 0), true");
            const scope = await traNhanh(p, tenKho, { q: `Biển Xanh ${CHU} ${D}`, goiY: ORG.ten });
            assert.match(await p.ev(`document.querySelector(${JSON.stringify(scope + " .hh-tn-kq .hh-tn-so")})?.textContent ?? ''`), /\d/, "Tra nhanh theo tên cho ra số");
            await bocucSach(p, `bước 7 ${kho}`);
            await chup(p, `15-ban-hang-chi-xem-${tenKho}`, tenKho !== "390");
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }

      // ======================= Bán hàng — Danh bạ (N5, người kiểm 29/10) =======================
      {
        const p = await moTrang(ACCOUNTS.salesA, `/parties?id=${encodeURIComponent(ORG5.id)}`, vp, { them: PHA === "lo-nut" ? PHA_LO_NUT : "" });
        try {
          await buoc(`14b${kho}`, "N5 — Danh bạ (Bán hàng, chỉ xem): thấy cấp riêng sắp áp và «Xem lịch sử», không một nút ghi nào; hồ sơ có cấp riêng đang áp cũng không nút", async () => {
            const SEC = "#hoa-hong-hien-hanh";
            const docMuc = () => p.ev(`(() => { const s = document.querySelector('${SEC}'); if (!s || s.hidden) return null;
              return { chu: s.innerText, ghi: [...s.querySelectorAll('button')].map((b) => b.textContent.trim()).filter((t) => /${NUT_GHI.source}/.test(t)),
                sap: s.querySelectorAll('[data-khoi="gan-rieng-sap"] li').length, lichSu: !!s.querySelector('.hh-lich-su-khoi button') }; })()`);
            await p.waitFor(`(() => { const s = document.querySelector('${SEC}'); return !!s && !s.hidden && !!s.querySelector('[data-khoi="gan-rieng-sap"]'); })()`, "mục Hoa hồng hiện hành (Bán hàng)");
            const a = await docMuc();
            assert.ok(a && a.sap === 1 && a.chu.includes(`Cấp riêng: ${TEN_CS_2}`) && a.chu.includes("Sắp áp dụng từ"), `Bán hàng thấy lần sắp áp: ${JSON.stringify(a)}`);
            assert.equal(a.lichSu, true, "Bán hàng thấy nút «Xem lịch sử» (nút xem)");
            assert.deepEqual(a.ghi, [], "Bán hàng: không nút ghi nào trong mục (kể cả «Sửa» lần sắp áp)");
            await p.ev(`document.querySelector('${SEC}').scrollIntoView({ block: 'start' }), true`);
            await axeKiem(p, `Danh bạ — Bán hàng chỉ xem ${kho}`);
            await chup(p, `28-danh-ba-ban-hang-chi-xem-${tenKho}`);
            // Hồ sơ có cấp riêng ĐANG áp (bước 12 đã sửa sang CS_2): nút «Thôi theo cấp này» / «Sửa» của lượt 1 cũng không hiện.
            await p.send("Page.navigate", { url: env.base + `/parties?id=${encodeURIComponent(ORG4.id)}` });
            await p.waitFor(`(() => { const s = document.querySelector('${SEC}'); return !!s && !s.hidden && s.innerText.includes('Cấp riêng: ${TEN_CS_2}'); })()`, "mục Hoa hồng hiện hành của hồ sơ đang áp (Bán hàng)");
            const b = await docMuc();
            assert.deepEqual(b?.ghi, [], `Bán hàng: hồ sơ đang áp không nút ghi: ${JSON.stringify(b)}`);
          });
          if (p.consoleErrors.length) loi.push(`lỗi console (Bán hàng Danh bạ ${kho}): ${p.consoleErrors.join(" | ").slice(0, 300)}`);
        } finally {
          p.close();
        }
      }
    }

    // ======================= Đối tác — SAU CÙNG, cả hai khổ (tiêu chí 7: kho cookie dùng chung) =======================
    for (const [tenKho, vp] of KHO) {
      const kho = `[${tenKho}]`;
      const p = await moTrang(PARTNER, "/hoa-hong", vp);
      try {
        await buoc(`8${kho}`, "Tài khoản Đối tác (mở sau cùng): trang 403 với câu tiếng Việt, máy chủ trả 403", async () => {
          await p.waitFor("document.body.dataset.trangThai === '403' || location.pathname !== '/hoa-hong'", "trạng thái 403 hoặc rời khỏi trang", 12000);
          const url = await p.ev("location.pathname");
          if (url === "/hoa-hong") {
            assert.equal(await p.ev("document.querySelector('.trang-thai[data-loai=\"403\"] .trang-thai-tieu-de')?.textContent.trim()"), CAU_KHONG_CO_QUYEN_XEM);
            assert.equal(await p.ev("!!document.getElementById('hh-noi-dung')"), false, "nội dung trang không còn");
            await chup(p, `16-doi-tac-khong-quyen-${tenKho}`);
          } else {
            console.log(`    (Đối tác bị cổng trang đưa sang ${url} — không vào được /hoa-hong)`);
          }
          assert.equal((await goiTrongTrang(p, "GET", "/api/pricing/hoa-hong")).status, 403, "máy chủ: GET /api/pricing/hoa-hong ⇒ 403");
        });
      } finally {
        p.close();
      }
    }
  } catch (e) { if (e?.message !== "DUNG") throw e; console.log(`(dừng theo HH_DUNG=${DUNG})`); }
} finally {
  await env.stop();
}

console.log(`\nẢnh: ${anh.length} tệp trong ${OUT}`);
if (axeNhe.length) console.log(`\naxe nhẹ / ghi nhận (ghi vào báo cáo, không đỏ):\n  ${[...new Set(axeNhe)].join("\n  ")}`);
if (loi.length) {
  console.log(`\nHOA HONG SMOKE ĐỎ — ${loi.length} bước:\n  ${loi.join("\n  ")}`);
  process.exit(1);
}
console.log("\nHOA HONG SMOKE OK");
