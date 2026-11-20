// Sinh BANG-PHU.md của đợt đánh giá lại giao diện 20/11/2026 từ: ma trận quyền (sinh từ mã bằng ma-tran-quyen.mjs của lượt 13/11),
// bang-man.json, trang-thai-chup.json, tom-tat.md từng màn và bảng gộp phát hiện. Không chép tay.
// Chạy từ GỐC kho:  node docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/lap-bang-phu.mjs [--ra ~/tourdao-danh-gia-2026-11-20]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const lay = (k) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : undefined; };
const ra = resolve((lay("--ra") ?? join(homedir(), "tourdao-danh-gia-2026-11-20")).replace(/^~/, homedir()));
const doc = (t) => JSON.parse(readFileSync(t, "utf8"));
const maTran = doc(join(ra, "ma-tran-quyen.json"));
const man = doc(join(HERE, "bang-man.json")).man;
const chup = doc(join(ra, "trang-thai-chup.json"));
const gop = doc(join(ra, "phat-hien-gop.json"));
const TEN = { SALES: "Bán hàng", INTERN: "Thực tập sinh", ACCOUNTING: "Kế toán", ADMIN: "Quản trị", FIELD: "Hướng dẫn viên", PARTNER: "Đối tác", SUPER_ADMIN: "Toàn quyền", DRIVER: "Tài xế công ty", DRIVER_PARTNER: "Tài xế đối tác", HR: "Nhân sự", SALES_MANAGER: "Quản lý bán hàng", KHACH: "người chưa đăng nhập" };
// Lý do không chấm và ghi chú dữ liệu do phiên điều phối khai (đã kiểm trên ảnh và báo cáo của trợ lý).
const KHONG_CHAM = { "/home": "trang cũ, chỉ chuyển hướng về Trang chủ «/»", "/danh-muc-giay-to": "trang cũ, chỉ chuyển hướng sang Loại giấy tờ cá nhân" };
const DU_LIEU = {
  34: "chấm trên màn rỗng (0 xe đang chạy)", 35: "chấm trên màn rỗng (không có đề nghị)", 41: "chấm trên màn rỗng (nhà xe chưa có giá)", 44: "chấm trên màn rỗng (chưa có tháng khoá được)",
  46: "chấm trên màn rỗng (chưa có phiếu)", 48: "gần rỗng (chưa có cấp độ đại lý nào)", 49: "chấm trên màn rỗng (chưa đối tác nào bật Trả sau)", 51: "chấm trên màn rỗng (không còn đơn chờ chụp bù)",
  53: "gần rỗng (chưa có mức phí)", 55: "chấm trên màn rỗng (không có phiếu chờ)", 63: "màn báo không có quyền (trang chỉ Toàn quyền xem được; đã chấm thêm màn 87)", 64: "chấm trên màn rỗng (chưa có luật)",
  65: "chấm trên màn rỗng (chưa có đặc điểm)", 72: "chấm trên màn rỗng (kho chưa có vé)", 73: "chấm trên màn rỗng (ngày không có lượt quét)", 76: "màn báo lỗi (kho thử không có người quản lý tổ chức)",
  78: "trạng thái «tạm ngừng nhận đăng ký» của kho thử; biểu mẫu đăng ký đầy đủ chưa chấm", 86: "màn «không có quyền» (chủ ý)", 15: "đơn mở ra là đơn đã có mã (màn «Sửa đơn»), không phải nháp chưa gửi",
};
const soCua = (so) => `man-${String(so).padStart(3, "0")}`;
const trangGoc = (t) => t.split("?")[0];
const dem = (so) => { const p = gop.phatHien.filter((x) => x.so === so); const c = (m) => p.filter((x) => x.muc === m).length; return { chan: c("Chặn việc"), nang: c("Nặng"), nho: c("Nhỏ"), n: p.length }; };
const coBaoCao = (so) => gop.phatHien.some((x) => x.so === so) || gop.luot.some((l) => l.tep === `${soCua(so)}.md`) || man.find((m) => m.so === so)?.gop;
const chuaHet = (so) => { const t = join(ra, "bang-chung", soCua(so), "tom-tat.md"); return existsSync(t) && /CHƯA CHỤP HẾT/.test(readFileSync(t, "utf8")); };

const boDau = Object.values(maTran.bo)[0];
const PAGES = [...new Set([...boDau.trang, ...boDau.khongLoiVao])].sort();
const md = ["# Bảng phủ — đánh giá lại giao diện 20/11/2026", "",
  "> Hồ sơ có ngày. Sinh bằng `docs/evidence/2026-11-20-danh-gia-lai-giao-dien/kich-ban/lap-bang-phu.mjs` từ ma trận quyền (sinh từ mã), bảng màn, trạng thái chụp và bảng gộp phát hiện; không chép tay.",
  `> Bản được chấm: mã giao diện của bản chính \`31d4c0174\`; ảnh chụp ở các lần lưu của nhánh đợt này, chỉ thêm tài liệu (\`public\`, \`web\`, \`src\` không đổi). Một màn = một bộ quyền với một trang, đủ hai khổ 390 và 1280. Tổng: ${man.length} màn (trần 110, không phải cắt).`, "",
  "## 1. Từng trang trong `PAGES`", "", "| Trang | Bộ quyền có lối vào (sinh từ mã) | Chấm với bộ quyền … / không chấm vì … |", "|---|---|---|"];
for (const p of PAGES) {
  const coLoi = Object.entries(maTran.bo).filter(([, v]) => v.trang.includes(p)).map(([b]) => TEN[b]);
  const ds = man.filter((m) => trangGoc(m.trang) === p);
  const cham = ds.length ? "chấm với " + ds.map((m) => `${TEN[m.bo]} (màn ${m.so})`).join(", ") : `không chấm vì ${KHONG_CHAM[p] ?? "CHƯA GHI LÝ DO"}`;
  md.push(`| \`${p}\` | ${coLoi.length === 11 ? "cả 11 bộ" : coLoi.join(", ") || "không bộ nào (mở bằng địa chỉ)"} | ${cham} |`);
}
md.push("", "## 2. Từng màn (cũng là bảng việc)", "", "| Màn | Họ màn | Bộ quyền : trang | Trạng thái | Máy đo (dòng đầu) | Chặn việc / Nặng / Nhỏ | Dữ liệu và ghi chú |", "|---|---|---|---|---|---|---|");
for (const m of man) {
  const c = chup[soCua(m.so)]; const d = dem(m.so);
  const tt = !c ? "chưa chụp" : (c.oHong?.length ? "ô hỏng" : coBaoCao(m.so) ? "đã chụp, đã chấm" : "đã chụp, chưa chấm");
  const mayDo = c ? c.dongDau.replace("KẾT QUẢ MÁY ĐO: ", "") : "—";
  const gc = [DU_LIEU[m.so] ?? "có dữ liệu thử", chuaHet(m.so) ? "trang dài, máy dừng ở số ảnh tối đa nên CHƯA CHỤP HẾT" : null, m.dau ? "màn đầu sau đăng nhập" : null, m.dangSua ? "họ Lập đơn đang có đợt sửa đã duyệt, chưa thi công" : null, m.gop ? `chấm trong lượt gộp \`${m.gop}\`` : null].filter(Boolean).join("; ");
  md.push(`| ${m.so} | ${m.ho} | ${m.bo}:${trangGoc(m.trang)} | ${tt} | ${mayDo} | ${d.chan} / ${d.nang} / ${d.nho} | ${gc} |`);
}
md.push("", "Không ô nào «đo thiếu» hay «ô hỏng» ở lượt chụp cuối. Hai trang `/404` và `/ngoai-mang` lượt đầu chụp bằng người chưa đăng nhập ra ô hỏng (bị chuyển về Đăng nhập), đã chụp lại bằng tài khoản Bán hàng.", "Màn 68 chấm hai lần: lượt gộp có một dòng sai khuôn nên giao lại riêng một lần; bảng gộp dùng báo cáo riêng.", "");
const ra2 = "docs/superpowers/specs/2026-11-20-danh-gia-lai-giao-dien/BANG-PHU.md"; // tính từ gốc kho
writeFileSync(ra2, md.join("\n"));
console.log(`Ghi ${ra2}: ${PAGES.length} trang, ${man.length} màn; trang chưa có lý do: ${PAGES.filter((p) => !man.some((m) => trangGoc(m.trang) === p) && !KHONG_CHAM[p]).join(", ") || "không"}`);
