// Sinh SO-LIEU.md của hồ sơ khung gốc 21/11/2026 từ ba tệp số đo ngoài kho (tong-hop-truoc.json, kiem-ke-ma.json, quet-be-rong.json). Không chép tay.
// Chạy từ GỐC kho: node docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/lap-so-lieu.mjs --ban <mã lần lưu được đo> [--ra ~/tourdao-bo-cuc-2026-11-21]
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

const lay = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const ra = resolve(lay("--ra", "~/tourdao-bo-cuc-2026-11-21").replace(/^~/, homedir()));
const BAN = lay("--ban", "(chưa ghi)");
const doc = (t) => JSON.parse(readFileSync(join(ra, "so-do", t), "utf8"));
const th = doc("tong-hop-truoc.json"), kk = doc("kiem-ke-ma.json");
const quet = existsSync(join(ra, "so-do", "quet-be-rong.json")) ? doc("quet-be-rong.json") : null;
const TEN_BO = { SALES: "Bán hàng", INTERN: "Thực tập sinh", ACCOUNTING: "Kế toán", ADMIN: "Quản trị", FIELD: "Hướng dẫn viên", PARTNER: "Đối tác", SUPER_ADMIN: "Toàn quyền", DRIVER: "Tài xế công ty", DRIVER_PARTNER: "Tài xế đối tác", HR: "Nhân sự", SALES_MANAGER: "Quản lý bán hàng", KHACH: "người chưa đăng nhập" };
const KHO = Object.keys(th.theoKho);
const TEN_KHO = { "390x844": "điện thoại 390", "1130x820": "cửa sổ 1.130", "1440x900": "máy tính 1.440", "1920x1080": "màn lớn 1.920" };
const tenMan = Object.fromEntries(th.loaiManChiTiet.map((x) => [x.so, `${x.tieuDe} (${TEN_BO[x.bo]})`]));
const doiTen = (s) => s.replace(/^(\d+) [A-Z_]+:\/[a-z0-9-]*/, (m, so) => `màn ${so} ${tenMan[so] ?? ""}`);
const g = (a, n = 99) => a.slice(0, n).map(([v, c]) => `${v} (${c})`).join(" · ");
const md = [];
const them = (...d) => md.push(...d);

them("# Số liệu — phân tích bố cục và khung gốc giao diện (21/11/2026)", "",
  "> Hồ sơ có ngày. Máy sinh bằng `docs/evidence/2026-11-21-phan-tich-bo-cuc/kich-ban/lap-so-lieu.mjs` từ số đo ngoài kho (`~/tourdao-bo-cuc-2026-11-21/so-do/`); không chép tay.",
  `> Bản được đo: bản chính \`${BAN}\` (bản 3.19), máy thử trên máy này với kho dữ liệu giả của đợt 20/11 và tệp giao diện công ty giống bản chạy thật. Không chạm bản chạy thật.`,
  `> ${th.loaiManChiTiet.length} màn (bảng màn của đợt 20/11) × ${KHO.length} bề rộng (${KHO.map((k) => TEN_KHO[k]).join(", ")}) = ${th.soO} ô, ${th.hong.length} ô hỏng. Bề rộng 1.130 là cỡ cửa sổ suy từ bốn ảnh chủ gửi 20/11 (ảnh rộng khoảng 2.260 điểm trên màn hai lần điểm ảnh).`, "");

them("## 1. Kiểm kê mã (không cần mở trang)", "", "| Điều đếm | Con số |", "|---|---|",
  `| Tệp kiểu chung \`public/app.css\` | ${Math.round(kk.css.byte / 1000)} nghìn ký tự, ${kk.css.luat} luật, ${kk.css.khaiBao} khai báo, ${kk.css.lopKhacNhau} tên lớp |`,
  `| Họ lớp (tiền tố tên lớp) | ${kk.hoLop.soHo} họ; luật thuộc bộ thành phần chung (đợt 0, 28/10): ${kk.hoLop.luatBoChungV2} trên ${kk.css.luat} |`,
  `| Sáu họ lớn nhất | ${kk.hoLop.nhieuNhat.slice(0, 6).map(([h, n]) => `${h} ${n}`).join(" · ")} |`,
  `| Khai báo bề rộng | ${kk.beRong.khaiBao} chỗ, ${kk.beRong.giaTriKhacNhau} giá trị khác nhau; ${kk.beRong.maxWidthRieng} luật tự đặt trần bề rộng (${kk.beRong.maxWidthGiaTri} giá trị) |`,
  `| Token bề rộng (\`--w-*\`) | ${kk.token.beRong} token, ${kk.token.beRongDungToiDaMotLan} token dùng không quá một lần |`,
  `| Cách chia cột (\`grid-template-columns\`) | ${kk.chiaCot.khaiBao} chỗ, ${kk.chiaCot.cachKhacNhau} cách khác nhau |`,
  `| Mốc đổi bố cục theo bề rộng cửa sổ | ${kk.mocKho.mocChuan.length} giá trị («tới N» và «từ N+1» tính là một): ${kk.mocKho.mocChuan.map(([v, n]) => `${v} (${n} chỗ)`).join(" · ")}. Coi 640 và 641 là một mốc viết lệch một điểm thì còn ${kk.mocKho.mocChuan.length - (kk.mocKho.mocChuan.some(([v]) => v === 640) && kk.mocKho.mocChuan.some(([v]) => v === 641) ? 1 : 0)} mốc: hai mốc chính (641, 900) và các mốc lẻ |`,
  `| Khoảng cách (đệm, lề, khe) | ${kk.khoangCach.khaiBao} khai báo, ${kk.khoangCach.giaTriKhacNhau} giá trị khác nhau |`,
  `| Cỡ chữ | ${kk.coChu.khaiBao} khai báo, ${kk.coChu.khacNhau} giá trị khác nhau; ${kk.token.theoNhom.find(([n]) => n === "fs")?.[1] ?? "?"} token cỡ chữ |`,
  `| Bo góc; bóng | bo góc ${kk.boGoc.khacNhau} giá trị; bóng ${kk.bong.khacNhau} giá trị |`,
  `| Token ở gốc | ${kk.token.tong} token |`,
  `| Mã dựng trang \`web/*.ts\` | ${kk.web.tep} tệp, ${kk.web.lopKhacNhau} tên lớp, trong đó ${kk.web.lopChiMotTepDung} tên chỉ một tệp dùng |`,
  `| Nút kiểu cũ và kiểu mới | \`.btn\`: ${kk.web.tepDungHoBtn} tệp; \`.nut\`: ${kk.web.tepDungNut} tệp |`,
  `| Thẻ kiểu cũ và kiểu mới | \`.card\`: ${kk.web.tepDungCard} tệp; \`.the\`: ${kk.web.tepDungThe} tệp |`,
  `| Tệp dùng chung để dựng bố cục | không có: mỗi trang tự dựng bằng hàm \`h()\`; không có hàm dựng khuôn trang, khối hay lưới |`, "");

them("## 2. Viền ngoài của trang (phần lưới 15/11 đã quản)", "", "| Bề rộng cửa sổ | Mức hẹp | Mức vừa | Mức rộng | Không khai (Trang chủ, Đăng nhập) | Số bề rộng khác nhau |", "|---|---|---|---|---|---|");
for (const k of KHO) { const a = th.theoKho[k].A_vienNgoai; const o = (m) => a[m] ? a[m].beRong.split(" ").map((x) => x.replace("×", " × ") + " màn").join(", ") : "—"; them(`| ${TEN_KHO[k]} | ${o("hep")} | ${o("vua")} | ${o("rong")} | ${o("(không khai)")} | ${th.theoKho[k].A_soBeRongNoiDung} |`); }
them("", "Đọc: «834 × 42 màn» nghĩa là 42 màn có vùng nội dung rộng 834 điểm.", "");

const baKho = ["390x844", "1130x820", "1440x900"].filter((k) => th.theoKho[k]);
them("## 3. Bên trong trang (phần chưa có luật)", "", `| Điều đo | ${baKho.map((k) => TEN_KHO[k]).join(" | ")} |`, `|---|${baKho.map(() => "---").join("|")}|`);
const hang = (ten, f) => them(`| ${ten} | ${baKho.map((k) => f(th.theoKho[k])).join(" | ")} |`);
hang("Thẻ tầng ngoài cùng: số bề rộng khác nhau trên toàn Nền tảng", (t) => t.D_theNgoaiCung.beRongKhacNhauToanNenTang);
hang("Màn có từ 2 bề rộng thẻ; từ 3 bề rộng", (t) => `${t.D_theNgoaiCung.manCoTu2BeRong}; ${t.D_theNgoaiCung.manCoTu3BeRong}`);
hang("Kiểu vỏ thẻ khác nhau (đệm × bo góc × viền, nền, bóng)", (t) => t.E_voThe.kieuKhacNhau);
hang("Bộ đệm thẻ khác nhau", (t) => t.E_voThe.demKhacNhau);
hang("Màn có thẻ lồng trong thẻ; lồng từ hai tầng", (t) => `${t.E_theLong.manCoTheLongThe}; ${t.E_theLong.manLongTu2Tang}`);
hang("Khoảng cách giữa các khối lớn: số giá trị", (t) => t.F_nhipCap1.soGiaTri);
hang("… các giá trị (số màn)", (t) => t.F_nhipCap1.giaTri.slice(0, 6).map((s) => s.replace("×", " (") + ")").join(" · "));
hang("Khoảng cách bên trong khối: số giá trị", (t) => t.F_nhipTrongKhoi.soGiaTri);
hang("Chỗ chia cột bên trong khối; số tỉ lệ khác nhau", (t) => `${t.C_chiaCotTrong.soChoChia}; ${t.C_chiaCotTrong.tiLeKhacNhau}`);
hang("Tiêu đề khối (h2): cỡ chữ (số kiểu gặp)", (t) => t.G_tieuDe.h2.co.split(" ").join(" · ").replace(/×/g, " × "));
hang("Tiêu đề khối (h2): lề dưới", (t) => t.G_tieuDe.h2.leDuoi.split(" ").join(" · ").replace(/×/g, " × "));
hang("Ô nhập: chiều cao (số kiểu gặp)", (t) => t.H_oNhap.cao.slice(0, 6).map((s) => s.replace("×", " × ")).join(" · "));
hang("Ô nhập: vị trí nhãn", (t) => t.H_oNhap.viTriNhan.map((s) => s.replace("tren", "trên ô").replace("an", "ẩn").replace("trong", "nổi trong ô").replace("trai", "bên trái").replace("khac", "khác").replace("×", " × ")).join(" · "));
hang("Màn có ô nhập rộng hơn 600 điểm", (t) => t.H_oNhap.manCoORongHon600.length);
hang("Dáng nút khác nhau trong trang, trên toàn Nền tảng: bộ cũ; riêng của trang; bộ mới", (t) => { const m = t.I_nut.kieuKhacNhauToanNenTang; return `${m["cũ (.btn)"] ?? 0}; ${m["riêng của trang"] ?? 0}; ${m["mới (.nut)"] ?? 0}`; });
hang("Màn chỉ dùng nút kiểu cũ; chỉ kiểu mới; có nút riêng", (t) => `${t.I_nut.manChiCu}; ${t.I_nut.manChiMoi}; ${t.I_nut.manCoNutRieng}`);
hang("Chiều cao nút (số kiểu gặp)", (t) => t.I_nut.cao.slice(0, 5).map((s) => s.replace("×", " × ")).join(" · "));
hang("Màn không dùng lớp nào của bộ thành phần chung", (t) => `${t.L_lop.manKhongCoLopV2} trên ${t.soMan}`);
hang("Tỉ lệ tên lớp riêng của trang trong một màn (trung vị)", (t) => `${t.L_lop.tiLeRiengTrungVi} %`);
hang("Số đường gióng trái của chữ đầu khối trong một màn", (t) => t.N_duongGiongTrai.phanBo.join(" · "));
hang("Màn điện thoại trộn khối sát mép với khối thụt lề", (t) => t.O_tranMep);
them("", "Vỏ thẻ gặp nhiều nhất ở máy tính 1.440:", "", ...th.theoKho["1440x900"].E_voThe.nhieuNhat.slice(0, 8).map((s) => `- ${s}`), "",
  "Màn có từ ba bề rộng thẻ tầng ngoài cùng ở máy tính 1.440:", "", ...th.theoKho["1440x900"].D_theNgoaiCung.vd.map((s) => `- ${doiTen(s)}`), "",
  "Màn có ô nhập rộng hơn 600 điểm ở máy tính 1.440 (số trong ngoặc là ô rộng nhất):", "", th.theoKho["1440x900"].H_oNhap.manCoORongHon600.map(doiTen).join("; ") + ".", "");

them("## 4. Trang cùng loại, bố cục khác nhau", "", "Loại do phiên phân tích xếp theo việc người dùng làm ở trang đó (bảng ở mục 6). Mỗi trang tính một lần (trang có nhiều bộ quyền lấy màn đầu tiên; bỏ ba màn chấm lúc không có quyền hoặc báo lỗi). «Nút chính» là nút nền đặc hoặc nút gửi biểu mẫu đang hiện trong trang; một trang có thể có hơn một vị trí.", "");
for (const k of ["1440x900", "390x844"]) {
  them(`### ${TEN_KHO[k][0].toUpperCase()}${TEN_KHO[k].slice(1)}`, "", "| Loại | Số trang | Mức bề rộng đã khai | Khối mở đầu trang | Vị trí nút chính | Nút chính bên trái; bên phải |", "|---|---|---|---|---|---|");
  for (const [l, v] of Object.entries(th.theoKho[k].M_theoLoaiTrang)) them(`| ${l} | ${v.soTrang} | ${v.muc.split(" ").map((x) => x.replace("×", " × ")).join(", ").replace("hep", "hẹp").replace("vua", "vừa").replace("rong", "rộng")} | ${v.soKieuKhoiDau} kiểu: ${v.khoiDau.replace(/×/g, " × ")} | ${v.soViTriNut} kiểu vị trí: ${v.nutChinh.replace(/×/g, " × ")} | ${v.nutChinhBenTrai}; ${v.nutChinhBenPhai} |`);
  them("");
}

// Trang khai mức bề rộng lệch bảng loại trang của quyết định lưới 15/11 (hẹp: biểu mẫu một cột, trang đọc; vừa: chi tiết, biểu mẫu hai cột, thiết lập; rộng: danh sách, tổng quan).
const MUC_THEO_LOAI = { "Danh sách": ["rong"], "Tổng quan": ["rong", ""], "Chi tiết": ["vua"], "Thiết lập": ["vua"], "Biểu mẫu": ["hep", "vua"], "Trang đọc": ["hep"] };
const TEN_MUC = { hep: "hẹp", vua: "vừa", rong: "rộng", "": "không khai" };
const daXet = new Set(); const lech = [];
for (const x of th.loaiManChiTiet) { if (daXet.has(x.trang) || !MUC_THEO_LOAI[x.loai]) continue; daXet.add(x.trang); if (!MUC_THEO_LOAI[x.loai].includes(x.muc)) lech.push(`${x.tieuDe} (\`${x.trang}\`): loại ${x.loai}, đang khai ${TEN_MUC[x.muc] ?? x.muc}`); }
them(`### Trang khai mức bề rộng lệch bảng loại trang của lưới 15/11 (${lech.length} trang, theo cách xếp loại của phiên phân tích)`, "", ...lech.map((l) => `- ${l}`), "", "Biểu mẫu được tính là khớp khi khai hẹp hoặc vừa (bảng 15/11: một cột thì hẹp, hai cột thì vừa).", "");

them("## 5. Bố cục vỡ ở bề rộng trung gian", "");
if (quet) {
  const co = quet.ketQua.filter((x) => x.bop || x.tranNgang); const theoMan = new Map();
  for (const x of co) { if (!theoMan.has(x.so)) theoMan.set(x.so, []); theoMan.get(x.so).push(x); }
  them(`Quét ${th.loaiManChiTiet.length} màn ở các bề rộng ${quet.rong.join(", ")} (${quet.ketQua.length} ô, ${quet.ketQua.filter((x) => x.loi).length} ô không đo được). Phép đo: đoạn chữ bị bóp tới mức mỗi dòng còn một hai ký tự, và trang tràn ngang.`, "",
    theoMan.size ? "| Màn | Bề rộng bị lỗi | Hiện tượng |" : "Không màn nào có lỗi theo hai phép đo này.", ...(theoMan.size ? ["|---|---|---|"] : []));
  for (const [so, a] of [...theoMan.entries()].sort((p, q) => p[0] - q[0])) them(`| màn ${so} ${tenMan[so]} | ${a.map((x) => x.rong).join(", ")} | ${a.some((x) => x.bop) ? `chữ bị bóp dọc (${Math.max(...a.map((x) => x.bop))} đoạn, ví dụ «${a.find((x) => x.bop)?.vd?.[0] ?? ""}»)` : ""}${a.some((x) => x.tranNgang) ? " tràn ngang" : ""} |`);
  them("", "Quét mịn riêng màn Đơn hàng của Bán hàng (bước 20 điểm, 1.040 tới 1.400): cột tên khách bị bóp ở mọi bề rộng từ 1.100 tới 1.180, hết từ 1.200.", "");
} else them("Chưa chạy `quet-be-rong.mjs --tat-ca`.", "");

them("## 6. Bảng xếp loại 87 màn", "", "| Loại | Màn |", "|---|---|");
const theoLoai = {}; for (const x of th.loaiManChiTiet) (theoLoai[x.loai] ??= []).push(`${x.so} ${x.tieuDe} (${TEN_BO[x.bo]})`);
for (const [l, a] of Object.entries(theoLoai)) them(`| ${l} (${a.length}) | ${a.join("; ")} |`);
them("", "## 7. Giới hạn của phép đo", "",
  "- Chỉ đo màn vừa tải, chưa đo sau khi bấm, hộp thoại, bảng trượt. Chrome giả lập, chưa phải iPhone, iPad, Android thật.",
  "- 15 màn chấm lúc rỗng hoặc gần rỗng như đợt 20/11 (cùng kho dữ liệu thử), nên số khối và số thẻ của các màn đó thấp hơn lúc có dữ liệu.",
  "- «Thẻ» là phần tử có viền từ ba cạnh, có nền khác nền cha hoặc có bóng, rộng từ 160 và cao từ 40 điểm; anh em cùng tên lớp gộp một dòng. Dòng của danh sách có vỏ cũng được tính.",
  "- Loại màn và «vị trí nút chính» là cách xếp của phiên phân tích, chưa có người thứ hai xếp lại.",
  "- Bề rộng 1.130 là suy đoán từ kích thước ảnh chủ gửi, chưa hỏi chủ.", "");
const tep = "docs/superpowers/specs/2026-11-21-khung-goc-giao-dien/SO-LIEU.md"; // tính từ gốc kho
writeFileSync(tep, md.join("\n"));
console.log(`Ghi ${tep}: ${md.length} dòng.`);
