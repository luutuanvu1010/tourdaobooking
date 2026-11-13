// Dựng trang so sánh ảnh cho chủ (kiểm giao diện 13/11/2026): lưới theo họ màn × khổ (390 / 820 / 1280), mỗi ảnh gắn mã phát hiện; thêm ảnh riêng của phát hiện.
// Chạy từ GỐC kho sau chep-anh-dai-dien.mjs: node docs/evidence/2026-11-13-kiem-giao-dien/kich-ban/dung-so-sanh.mjs → ../so-sanh.html (ảnh tham chiếu tương đối anh/…)
import { writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const HO = [
  ["Trang chủ", "trang-chu", "Bán hàng", ["N9", "N4", "N6"]],
  ["Lập đơn", "tao-don", "Bán hàng", ["N3", "N6", "N10"]],
  ["Đơn hàng", "don-hang", "Bán hàng", ["S3", "S4", "N9"]],
  ["Chi tiết đơn", "chi-tiet-don", "Bán hàng", ["N6", "S4"]],
  ["Điều phối xe", "dieu-phoi", "Quản trị", ["S6", "N5"]],
  ["Chuyến của tài xế", "tai-xe-chuyen", "Tài xế công ty", ["N12"]],
  ["Sổ công nợ", "so-cong-no", "Kế toán", ["N8"]],
  ["Hoa hồng", "hoa-hong", "Kế toán", ["N6"]],
  ["Quản lý tài khoản", "tai-khoan", "Toàn quyền", ["N10", "N11", "S8"]],
  ["Thiết lập", "thiet-lap", "Toàn quyền", ["S7"]],
  ["Đơn hàng của đối tác", "doi-tac-don", "Đối tác", ["N9"]],
  ["Trang Tôi của đối tác", "doi-tac-toi", "Đối tác", ["K5"]],
  ["Đăng nhập", "dang-nhap", "chưa đăng nhập", ["K1", "K2", "K3"]],
];
const RIENG = [
  ["K3 · N4", "thanh-ben-1280.jpg", "Máy tính 1280: khối tên «Island Booking System» đè mục đầu của thanh bên khi thanh bên tự cuộn (ba trang khác nhau)."],
  ["N3", "tao-don-xoay-ngang.jpg", "Điện thoại xoay ngang 844×390: thanh nút dưới cao 137 px, chỗ nhìn nội dung Tạo đơn còn rất hẹp."],
  ["N2", "chu-x2-don-hang-390.jpg", "Phép xấp xỉ nhân đôi cỡ chữ ở 390: Đơn hàng — chữ chồng, thanh tab chồng chữ."],
  ["N2", "chu-x2-trang-chu-390.jpg", "Phép xấp xỉ nhân đôi cỡ chữ ở 390: Trang chủ Kế toán."],
  ["N14", "bao-ban-nut-mo-390.jpg", "Tài xế đối tác: «Lưu khung bận» mờ, không nói phải chọn lý do."],
  ["N13", "quet-ve-390.jpg", "Quét vé: ô chọn ảnh không có nhãn cho bộ đọc màn hình."],
  ["S2", "ma-tho-dia-diem-390.jpg", "Địa điểm: mã thô tiếng Anh hiện cho người dùng."],
  ["S5", "rong-don-hang.jpg", "Kho rỗng: Đơn hàng chỉ một dòng chữ; băng nhắc hai lớp cao 3 dòng (N9)."],
  ["S5", "rong-khong-quyen.jpg", "Không quyền: khối có viền xanh đậm như đang chọn."],
  ["S5", "rong-khong-trang.jpg", "Không có trang."],
  ["S9", "rong-ngoai-mang.jpg", "Ngoài mạng: thanh tab còn 4 mục."],
];
const nhan = (m) => `<span class="ma ma-${m[0]}">${m}</span>`;
const hang = HO.map(([ten, k, vai, ma]) => `<section class="ho"><h3>${ten} <small>${vai}</small> ${ma.map(nhan).join(" ")}</h3><div class="khung">
${[390, 820, 1280].map((w) => `<figure class="w${w}"><a href="anh/${k}-${w}.jpg"><img loading="lazy" src="anh/${k}-${w}.jpg" alt="${ten} khổ ${w}"></a><figcaption>${w === 390 ? "Điện thoại 390" : w === 820 ? "iPad đứng 820" : "Máy tính 1280"}</figcaption></figure>`).join("")}
</div></section>`).join("\n");
const rieng = RIENG.map(([ma, f, cap]) => `<figure class="rieng"><a href="anh/${f}"><img loading="lazy" src="anh/${f}" alt="${cap}"></a><figcaption>${ma.split(" · ").map(nhan).join(" ")} ${cap}</figcaption></figure>`).join("\n");
const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>So sánh ảnh giao diện</title>
<style>
:root{--nen:#f4f6f8;--the:#fff;--chu:#14212b;--phu:#5b6b78;--vien:#d8dee4;--k:#b42318;--n:#b54708;--s:#475467}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){--nen:#11161b;--the:#1a2128;--chu:#e7edf2;--phu:#9aa9b5;--vien:#2c3640;--k:#f97066;--n:#fdb022;--s:#98a2b3}}
:root[data-theme="dark"]{--nen:#11161b;--the:#1a2128;--chu:#e7edf2;--phu:#9aa9b5;--vien:#2c3640;--k:#f97066;--n:#fdb022;--s:#98a2b3}
*{box-sizing:border-box}body{margin:0;background:var(--nen);color:var(--chu);font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif}
main{max-width:1400px;margin:0 auto;padding:24px 16px 64px}h1{font-size:26px;margin:0 0 4px}h2{font-size:20px;margin:40px 0 12px}
p.mo{color:var(--phu);margin:0 0 16px;max-width:900px}.chu-giai{display:flex;gap:16px;flex-wrap:wrap;color:var(--phu);font-size:14px}
.ho{background:var(--the);border:1px solid var(--vien);border-radius:12px;padding:16px;margin:16px 0}.ho h3{margin:0 0 12px;font-size:17px}.ho h3 small{color:var(--phu);font-weight:400}
.khung{display:grid;grid-template-columns:minmax(0,390fr) minmax(0,560fr) minmax(0,900fr);gap:12px;align-items:start}
figure{margin:0}img{width:100%;height:auto;display:block;border:1px solid var(--vien);border-radius:8px;max-height:760px;object-fit:cover;object-position:top}
figcaption{font-size:13px;color:var(--phu);margin-top:6px}.ma{display:inline-block;font-size:12px;font-weight:600;padding:1px 7px;border-radius:999px;border:1px solid currentColor}
.ma-K{color:var(--k)}.ma-N{color:var(--n)}.ma-S{color:var(--s)}.luoi-rieng{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px}
.rieng{background:var(--the);border:1px solid var(--vien);border-radius:12px;padding:12px}
@media (max-width:760px){.khung{grid-template-columns:1fr}}
</style></head><body><main>
<h1>So sánh ảnh giao diện — bước 0, 13/11/2026</h1>
<p class="mo">Ảnh thật từ máy chủ thử (dữ liệu giả, tệp giao diện công ty giống bản thật), bản 2.96. Mỗi họ màn: điện thoại 390, iPad đứng 820, máy tính 1280 — chỉ màn đầu.
Mã trên mỗi hàng trỏ tới danh sách phát hiện (<code>docs/superpowers/specs/2026-11-13-kiem-giao-dien/PHAT-HIEN.md</code>). Bấm ảnh để xem cỡ lớn.</p>
<div class="chu-giai">${nhan("K")} Chặn kho ${nhan("N")} Nặng ${nhan("S")} Nhỏ</div>
<h2>Theo họ màn</h2>
${hang}
<h2>Ảnh riêng của từng phát hiện</h2>
<div class="luoi-rieng">${rieng}</div>
</main></body></html>
`;
writeFileSync(join(HERE, "..", "so-sanh.html"), html);
console.log("Ghi so-sanh.html");
