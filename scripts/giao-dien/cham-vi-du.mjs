// Chấm báo cáo của trợ lý đánh giá giao diện trên bộ ví dụ thử (scripts/giao-dien/vi-du/ca.json).
//   node scripts/giao-dien/cham-vi-du.mjs --khoa <khoa.json> --bao-cao <thư mục chứa man-XX.md>
// Dòng phát hiện hợp lệ có 9 ô ngăn bằng « | »:
//   PHÁT HIỆN | <mã[, mã…]> | <Chặn việc / Nặng / Nhỏ[ (gộp)]> | <BỘ:/trang @khổ> | <tên ảnh> | <chỗ trên màn> | <điều nhìn thấy> | <vì sao phạm tiêu chí> | <hướng sửa>
// Máy chấm KHÔNG dựa vào tên ảnh (chỉ giữ cho người đọc tra). Dòng sai khuôn được đếm, không nuốt im lặng.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, isAbsolute, join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const MUC = [["chặn việc", "Chặn việc"], ["nặng", "Nặng"], ["nhỏ", "Nhỏ"]];
const MA_HOP_LE = /^(S|T|M)\d+$/;
const thuong = (s) => String(s).normalize("NFC").toLowerCase();

/** Trả { soDongGop, phatHien: [{ ma[], gop (từ hai mã trở lên), muc, mucGoc, o, anh, cho, thay, vi, huong }], dongSaiKhuon }. */
export function docPhatHien(chu) {
  const phatHien = [];
  let dongSaiKhuon = 0, soDongGop = 0;
  for (const dong of String(chu).split("\n")) {
    const d = dong.trim().replace(/^[-*>\s]+/, "");
    if (!/^PHÁT HIỆN\s*\|/.test(d.normalize("NFC"))) continue;
    const o = d.split(/\s+\|\s+/).map((x) => x.trim());
    if (o.length !== 9) { dongSaiKhuon++; continue; }
    const ma = o[1].split(/[,\s]+/).filter(Boolean);
    const mucGoc = o[2];
    const muc = MUC.find(([dau]) => thuong(mucGoc).startsWith(dau))?.[1];
    if (!ma.length || !ma.every((m) => MA_HOP_LE.test(m)) || !muc) { dongSaiKhuon++; continue; }
    const gop = ma.length >= 2;
    if (gop) soDongGop++;
    phatHien.push({ ma, gop, muc, mucGoc, o: o[3], anh: o[4], cho: o[5], thay: o[6], vi: o[7], huong: o[8] });
  }
  return { phatHien, dongSaiKhuon, soDongGop };
}

/**
 * Ca `cay` / `that`: bắt được khi có phát hiện ĐÚNG MỘT MÃ (dòng gộp nhiều mã không tính, vì dễ khớp nhầm) mang ít nhất một mã thuộc mongDoi.ma VÀ phần chữ (chỗ + điều thấy + vì sao) chứa một tuKhoa.
 * batBangMaChinh: trong các phát hiện khớp, có dòng mang đúng ma[0]. Ca `khong-cay`: liệt kê phát hiện Nặng trở lên để người đối chiếu ảnh.
 */
export function chamCa(ca, phatHien) {
  if (ca.nhom === "khong-cay") return { ca: ca.ma, nhom: ca.nhom, nang: phatHien.filter((p) => p.muc === "Nặng" || p.muc === "Chặn việc"), soPhatHien: phatHien.length };
  const khop = phatHien.filter((p) => {
    if (p.gop || !p.ma.some((m) => ca.mongDoi.ma.includes(m))) return false;
    const chu = thuong(`${p.cho} ${p.thay} ${p.vi}`);
    return ca.mongDoi.tuKhoa.some((k) => chu.includes(thuong(k)));
  });
  return { ca: ca.ma, nhom: ca.nhom, bat: khop.length > 0, batBangMaChinh: khop.some((p) => p.ma.includes(ca.mongDoi.ma[0])), khop, maNeu: [...new Set(phatHien.flatMap((p) => p.ma))], soPhatHien: phatHien.length };
}

function chayLenh(argv) {
  const lay = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : undefined; };
  const khoaDuong = lay("--khoa"), baoCao = lay("--bao-cao");
  if (!khoaDuong || !baoCao) { console.error("Dùng: node scripts/giao-dien/cham-vi-du.mjs --khoa <khoa.json> --bao-cao <thư mục chứa man-XX.md>"); process.exit(2); }
  const ketQuaDuong = join(dirname(resolve(baoCao)), "ket-qua.md");
  const rel = relative(process.cwd(), ketQuaDuong);
  if (!rel.startsWith("..") && !isAbsolute(rel)) { console.error(`ket-qua.md sẽ nằm trong kho (${ketQuaDuong}): đặt thư mục báo cáo ngoài kho.`); process.exit(2); }
  const khoa = JSON.parse(readFileSync(khoaDuong, "utf8")); // { "man-01": { ...ca } }
  const rutGon = (p) => `${p.ma.join("+")} | ${p.muc} | ${p.cho} | ${p.thay}`.replace(/\s+/g, " ").slice(0, 160);
  const NHOM = { cay: "cấy", that: "lỗi thật", "khong-cay": "không cấy" };
  const dong = ["| Ca | Nhóm | Màn | Kết quả | Chi tiết |", "|---|---|---|---|---|"];
  const chiTiet = [];
  let cay = 0, cayBat = 0, cayBatChinh = 0, that = 0, thatBat = 0, nangKhongCay = 0, saiKhuon = 0, dongGop = 0;
  const thieu = [];
  for (const [alias, ca] of Object.entries(khoa).sort((a, b) => a[1].ma.localeCompare(b[1].ma))) {
    const tep = join(baoCao, `${alias}.md`);
    if (!existsSync(tep)) { thieu.push(ca.ma); dong.push(`| ${ca.ma} | ${NHOM[ca.nhom]} | ${alias} | THIẾU BÁO CÁO | |`); continue; }
    const { phatHien, dongSaiKhuon, soDongGop } = docPhatHien(readFileSync(tep, "utf8"));
    saiKhuon += dongSaiKhuon;
    dongGop += soDongGop;
    const r = chamCa(ca, phatHien);
    if (ca.nhom === "khong-cay") {
      nangKhongCay += r.nang.length;
      dong.push(`| ${ca.ma} | ${NHOM[ca.nhom]} | ${alias} | ${r.nang.length} phát hiện Nặng trở lên | đối chiếu ảnh |`);
      for (const p of r.nang) chiTiet.push(`- ${ca.ma} (${alias}) Nặng trở lên: ${rutGon(p)}`);
    } else {
      if (ca.nhom === "cay") { cay++; if (r.bat) cayBat++; if (r.batBangMaChinh) cayBatChinh++; }
      else { that++; if (r.bat) thatBat++; }
      dong.push(`| ${ca.ma} | ${NHOM[ca.nhom]} | ${alias} | ${r.bat ? (r.batBangMaChinh ? "BẮT ĐƯỢC (mã chính)" : "bắt được (mã thay thế)") : "BỎ SÓT"} | cần ${ca.mongDoi.ma.join("/")}; ${r.soPhatHien} phát hiện |`);
      if (r.bat) for (const p of r.khop) chiTiet.push(`- ${ca.ma} (${alias}) bắt bởi dòng: ${rutGon(p)}`);
      else chiTiet.push(`- ${ca.ma} (${alias}) KHÔNG bắt; báo cáo nêu mã: ${r.maNeu.length ? r.maNeu.join(", ") : "(không có dòng PHÁT HIỆN nào)"}`);
    }
  }
  const tong = [`Bắt ${cayBat}/${cay} ca cấy (đúng mã chính ${cayBatChinh}/${cay}); ${thatBat}/${that} ca lỗi thật; ${nangKhongCay} phát hiện Nặng trở lên ở ca không cấy (người đối chiếu ảnh xem báo nhầm); ${saiKhuon} dòng sai khuôn; ${dongGop} dòng gộp nhiều mã (không tính vào bắt được); ca thiếu báo cáo: ${thieu.length ? thieu.join(", ") : "không"}.`];
  const md = ["# Kết quả chấm bộ ví dụ thử", "", ...tong, "", ...dong, "", "## Dòng làm nên kết quả", "", ...chiTiet, ""].join("\n");
  writeFileSync(ketQuaDuong, md);
  console.log(md);
  console.log(`Ghi ${ketQuaDuong}`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) chayLenh(process.argv.slice(2));
