// Kiểm bằng máy danh sách nút quan trọng rồi sinh NUT-QUAN-TRONG.md và KIEM-MAY.md (rà soát nút bấm 2026-11-04).
// Chạy ở gốc dự án, sau liet-ke-nut.mjs: node docs/superpowers/specs/2026-11-04-ra-soat-nut-bam/kiem-va-sinh.mjs
// Nguồn người viết: nut-quan-trong.json. Bốn phép kiểm, sai thì in ra và ghi vào KIEM-MAY.md:
//   1. Độ phủ: mọi nút máy coi là ứng viên phải có hàng hoặc có lý do bỏ qua; mọi trang và mọi vai phải được nhắc.
//   2. Tệp:dòng: mọi nguồn phải tồn tại; nguồn đầu phải có chữ của nút ở gần dòng đó.
//   3. Khuôn: hàng hiểu lầm phải có ví dụ và tên đề xuất; hàng ghi dữ liệu phải chỉ tới mã máy chủ.
//   4. Tên đề xuất: không trúng chữ đã loại (TU_DA_LOAI, CAM_THEO_TEP) và không trùng tên đang chỉ việc khác.
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { CAM_THEO_TEP, NGHIA_HON_DAO, TU_DA_LOAI } from "../../../../src/shared/bang-tu-giao-dien.ts";
import { PAGES } from "../../../../src/shared/sw-policy.ts";

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, "../../../..");
const docDs = JSON.parse(readFileSync(join(HERE, "danh-sach-day-du.json"), "utf8"));
const nutThat = docDs.filter((r) => r.kenh !== "khuon");
const QT = JSON.parse(readFileSync(join(HERE, "nut-quan-trong.json"), "utf8"));
const hang = QT.hang;
const VAI = ["Bán hàng", "Kế toán", "Quản trị", "Hiện trường", "Đối tác", "Toàn quyền", "Thực tập", "Tài xế công ty", "Tài xế đối tác", "Nhân sự"];
const loi = { phu: [], dong: [], khuon: [], ten: [], trungTen: [] };

// ---------- 1. Độ phủ ----------
const ungVien = nutThat.filter((r) => r.lyDo.includes("ghi") || r.lyDo.includes("nguy hiểm") || r.lyDo.includes("nút chính"));
const daPhu = new Set([...hang.flatMap((h) => h.ma_may ?? []), ...QT.bo_qua.map((b) => b.ma)]);
const maTonTai = new Set(nutThat.map((r) => r.ma));
for (const r of ungVien) if (!daPhu.has(r.ma)) loi.phu.push(`${r.ma} ${r.tep}:${r.dong} «${r.nhan.join(" / ").slice(0, 60)}» chưa có hàng hoặc lý do bỏ qua`);
for (const m of daPhu) if (!maTonTai.has(m)) loi.phu.push(`mã lạ ${m} không có trong danh sách đầy đủ`);
const trangCoHang = new Set(hang.flatMap((h) => h.trang ?? []));
const trangKhongCo = new Map((QT.trang_khong_co_nut_quan_trong ?? []).map((t) => [t.trang, t.ly_do]));
for (const p of PAGES) if (!trangCoHang.has(p) && !trangKhongCo.has(p)) loi.phu.push(`trang ${p} không có hàng nào và không có lý do`);
const demVai = Object.fromEntries(VAI.map((v) => [v, 0]));
// Vai có thể kèm ghi chú trong ngoặc: «Bán hàng (đơn mình lập)». «Mọi vai…» tính cho cả mười vai. Hai nhóm dưới không phải quyền nhưng là người bấm thật.
const VAI_THEM = new Set(["Người có hồ sơ cá nhân", "Trưởng nhóm hỗ trợ"]);
for (const h of hang) for (const goc of h.vai ?? []) {
  const v = goc.split(" (")[0];
  if (v.startsWith("Mọi vai")) { for (const x of VAI) if (!(v.includes("trừ") && v.includes(x))) demVai[x]++; continue; }
  if (v in demVai) demVai[v]++;
  else if (!VAI_THEM.has(v)) loi.khuon.push(`tên vai lạ «${goc}» ở «${h.ten}»`);
}
for (const v of VAI) if (!demVai[v]) loi.phu.push(`vai ${v} không có hàng nào`);

// ---------- 2. Tệp:dòng ----------
const docTep = new Map();
const tep = (p) => {
  if (!docTep.has(p)) docTep.set(p, existsSync(join(ROOT, p)) ? readFileSync(join(ROOT, p), "utf8").split("\n") : null);
  return docTep.get(p);
};
const manhTen = (t) => t.split(/\s*(?:\/|·|→|,|;|\||\(|\)|«|»|⟪|⟫|‹…›)\s*/u).map((x) => x.replace(/^[＋+✓←⋯\s]+/u, "").trim()).filter((x) => x.length >= 2);
for (const h of hang) {
  const ds = h.nguon ?? [];
  if (!ds.length) loi.dong.push(`«${h.ten}» không có nguồn`);
  ds.forEach((n, i) => {
    const m = n.match(/^([^:]+):(\d+)/);
    if (!m) return loi.dong.push(`«${h.ten}»: nguồn sai khuôn «${n}»`);
    const dong = tep(m[1]);
    if (!dong) return loi.dong.push(`«${h.ten}»: không có tệp ${m[1]}`);
    if (Number(m[2]) > dong.length) return loi.dong.push(`«${h.ten}»: ${n} vượt quá ${dong.length} dòng`);
    if (i === 0) {
      const vung = dong.slice(Math.max(0, Number(m[2]) - 9), Number(m[2]) + 8).join("\n");
      // Chữ nút có thể nằm trong hằng hoặc hàm dùng chung. Khi đó chấp nhận nếu dòng này đúng là một nút máy đã quét và hàng có khai mã nút đó.
      const khopMay = nutThat.some((r) => (h.ma_may ?? []).includes(r.ma) && r.tep === m[1] && Math.abs(r.dong - Number(m[2])) <= 8);
      const docTay = (QT.nguon_doc_tay ?? []).some((d) => d.ten === h.ten && d.nguon === n);
      if (!manhTen(h.ten).some((t) => vung.includes(t)) && !khopMay && !docTay) loi.dong.push(`«${h.ten}»: không thấy chữ nút quanh ${n} và dòng này không phải nút máy đã quét (cần đọc tay)`);
    }
  });
  if (h.ghi_du_lieu && !ds.some((n) => n.startsWith("src/"))) loi.khuon.push(`«${h.ten}» ghi dữ liệu nhưng không chỉ tới mã máy chủ`);
}

// ---------- 3. Khuôn ----------
for (const h of hang) {
  if (!["dung", "mo_ho", "hieu_lam"].includes(h.ket_luan)) loi.khuon.push(`«${h.ten}»: kết luận lạ ${h.ket_luan}`);
  if (h.ket_luan !== "dung" && !(h.vi_du ?? "").trim()) loi.khuon.push(`«${h.ten}»: ${h.ket_luan} mà không có ví dụ`);
  if (h.ket_luan === "hieu_lam" && !(h.de_xuat ?? []).length && !(h.van_de_hien_thi ?? "").trim()) loi.khuon.push(`«${h.ten}»: hiểu lầm mà không có đề xuất`);
  if (h.ket_luan === "dung" && h.uu_tien !== "khong") loi.khuon.push(`«${h.ten}»: đúng mà ưu tiên ${h.uu_tien}`);
  if (h.ket_luan !== "dung" && !["cao", "vua", "thap"].includes(h.uu_tien)) loi.khuon.push(`«${h.ten}»: ưu tiên lạ ${h.uu_tien}`);
  if ((h.de_xuat ?? []).length > 3) loi.khuon.push(`«${h.ten}»: quá 3 tên đề xuất`);
}

// ---------- 4. Tên đề xuất ----------
const CHU_TRANH = /(?<![\p{L}])(gắn|vá|lỗ|hoãn|hủy|xóa|khóa|hòa|tùy)(?![\p{L}])/iu;
const chuanTen = (s) => s.replace(/^[＋+✓←→⋯\s]+/u, "").replace(/\s+/g, " ").trim();
const nhanDangDung = new Map();
for (const r of nutThat) {
  for (const t of r.nhan) {
    const k = chuanTen(t);
    if (!nhanDangDung.has(k)) nhanDangDung.set(k, `${r.tep}:${r.dong}`);
  }
}
const viPham = (chu) => {
  const bo = chu.replace(NGHIA_HON_DAO, "");
  return TU_DA_LOAI.find((t) => t.cam.test(t.cam.source.includes("Đđ]ảo") ? bo : chu)) ?? null;
};
let soTen = 0;
for (const h of hang) {
  const tepNut = (h.nguon?.[0] ?? "").split(":")[0];
  for (const t of h.de_xuat ?? []) {
    soTen++;
    const v = viPham(t);
    if (v) loi.ten.push(`«${t}» (cho «${h.ten}»): trúng chữ đã loại ${v.cam} → dùng «${v.thay}»`);
    for (const l of CAM_THEO_TEP) if (l.tep.some((re) => re.test(tepNut)) && l.cam.test(t)) loi.ten.push(`«${t}» (cho «${h.ten}», tệp ${tepNut}): trúng luật theo tệp ${l.cam} → dùng «${l.thay}»`);
    if (CHU_TRANH.test(t)) loi.ten.push(`«${t}» (cho «${h.ten}»): chữ nên tránh hoặc sai chính tả dự án`);
    const trung = nhanDangDung.get(chuanTen(t));
    if (trung && trung.split(":")[0] !== tepNut) loi.trungTen.push(`«${t}» (đề xuất cho «${h.ten}», ${h.nguon?.[0]}) đang là tên nút ở ${trung}: đọc xem có chỉ cùng việc không`);
  }
}

// ---------- báo cáo ----------
const tongLoi = loi.phu.length + loi.dong.length + loi.khuon.length + loi.ten.length;
const dem = (f) => hang.filter(f).length;
let km = `# Kết quả máy kiểm (do máy sinh, đừng sửa tay)\n\nSinh bởi \`kiem-va-sinh.mjs\` từ \`nut-quan-trong.json\` và \`danh-sach-day-du.json\`.\n\n`;
km += `- Nút thật trong mã: **${nutThat.length}**. Máy coi là ứng viên (có ghi, tông nguy hiểm, hoặc nút chính): **${ungVien.length}**.\n- Hàng trong danh sách quan trọng: **${hang.length}** (mỗi hàng một việc, nút mở và nút trong hộp tính một). Ứng viên có lý do bỏ qua: **${QT.bo_qua.length}**.\n- Kết luận: đúng ${dem((h) => h.ket_luan === "dung")} · chưa rõ ${dem((h) => h.ket_luan === "mo_ho")} · gây hiểu lầm ${dem((h) => h.ket_luan === "hieu_lam")}. Ưu tiên: cao ${dem((h) => h.uu_tien === "cao")} · vừa ${dem((h) => h.uu_tien === "vua")} · thấp ${dem((h) => h.uu_tien === "thap")}.\n- Số tên đề xuất đã kiểm với bảng từ: ${soTen}.\n\n## Số hàng theo vai\n\n| Vai | Số hàng |\n|---|---:|\n`;
for (const v of VAI) km += `| ${v} | ${demVai[v]} |\n`;
km += `\n## Trang không có hàng (có lý do)\n\n`;
for (const [t, l] of trangKhongCo) km += `- \`${t}\`: ${l}\n`;
km += `\n## Nguồn đọc tay (máy không tự xác nhận được, người đã đọc)\n\n`;
for (const d of QT.nguon_doc_tay ?? []) km += `- «${d.ten}» \`${d.nguon}\`: ${d.ly_do}\n`;
const muc = [["Độ phủ", loi.phu], ["Tệp:dòng", loi.dong], ["Khuôn", loi.khuon], ["Tên đề xuất trúng chữ đã loại", loi.ten], ["Tên đề xuất trùng tên nút khác (đọc tay, không tính là lỗi)", loi.trungTen]];
for (const [t, ds] of muc) {
  km += `\n## ${t}: ${ds.length} mục\n\n`;
  for (const d of ds) km += `- ${d}\n`;
}
writeFileSync(join(HERE, "KIEM-MAY.md"), km);

// ---------- sinh bảng ----------
const oc = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
const BAC = { cao: 0, vua: 1, thap: 2, khong: 3 };
const NHAN_KL = { dung: "Đúng", mo_ho: "Chưa rõ", hieu_lam: "**Gây hiểu lầm**" };
const NHAN_UT = { cao: "**Cao**", vua: "Vừa", thap: "Thấp", khong: "" };
const nhomThuTu = [...new Set(hang.map((h) => h.nhom))];
let md = `# Danh sách nút quan trọng (2026-11-04)\n\nHồ sơ có ngày. Tóm tắt cho chủ: \`TOM-TAT-CHO-CHU.md\`. Bảng này do \`kiem-va-sinh.mjs\` sinh từ \`nut-quan-trong.json\`; sửa ở tệp JSON rồi chạy lại. ${hang.length} việc, ${dem((h) => h.ket_luan === "hieu_lam")} gây hiểu lầm, ${dem((h) => h.ket_luan === "mo_ho")} chưa rõ. Trong mỗi nhóm, chỗ cần xem đứng trước.\n\n${QT.kiem_doc_lap ?? ""}\n\n`;
md += `Cột «Ghi · Tiền · Gửi · Đảo ngược» trả lời: có ghi dữ liệu không, có chạm tiền không, có gửi gì ra ngoài không, đảo ngược được không. «Hiển thị» ghi màu nút và có hỏi xác nhận không.\n\n`;
for (const n of nhomThuTu) {
  const ds = hang.filter((h) => h.nhom === n).sort((a, b) => BAC[a.uu_tien] - BAC[b.uu_tien]);
  md += `## ${n} (${ds.length})\n\n| Màn hình | Vai | Tên hiện tại | Thật sự làm gì | Ghi · Tiền · Gửi · Đảo ngược | Hiển thị | Kết luận và ví dụ | Tên đề xuất | Ưu tiên | Nguồn |\n|---|---|---|---|---|---|---|---|---|---|\n`;
  for (const h of ds) {
    const co = (x) => (x ? "có" : "không");
    const tom = `Ghi: ${co(h.ghi_du_lieu)} · Tiền: ${co(h.cham_tien)}${h.cham_quyen ? " · Quyền: có" : ""} · Gửi: ${oc(h.gui_ra_ngoai)} · Đảo ngược: ${oc(h.dao_nguoc)}`;
    const hienThi = [`${oc(h.mau)}`, `xác nhận: ${oc(h.xac_nhan)}`, h.cau_bao ? `báo: «${oc(h.cau_bao)}»` : "", h.nhat_ky ? `nhật ký: «${oc(h.nhat_ky)}»` : "", h.huong_dan && h.huong_dan !== "không nhắc" ? `Hướng dẫn: «${oc(h.huong_dan)}»` : ""].filter(Boolean).join("; ");
    const kl = [NHAN_KL[h.ket_luan], h.vi_du ? oc(h.vi_du) : "", h.van_de_hien_thi ? `Hiển thị: ${oc(h.van_de_hien_thi)}` : "", h.hai_ten ? `Tên khác của cùng việc: ${oc(h.hai_ten)}.` : "", h.chu_da_chon ? `Chủ đã chọn tên này: ${oc(h.chu_da_chon)}.` : ""].filter(Boolean).join(" ");
    const ten = oc(h.ten) + (h.ten_trong_hop ? `<br>Hộp: ${oc(h.ten_trong_hop)}` : "");
    md += `| ${oc(h.man_hinh)} | ${(h.vai ?? []).join(", ")} | ${ten} | ${oc(h.that_su_lam)} | ${tom} | ${hienThi} | ${kl} | ${(h.de_xuat ?? []).map((t) => `«${oc(t)}»`).join(" · ")} | ${NHAN_UT[h.uu_tien]} | ${(h.nguon ?? []).map((x) => `\`${x}\``).join(" ")} |\n`;
  }
  md += `\n`;
}
if ((QT.chu_khac ?? []).length) {
  md += `## Chữ khác đáng sửa, ngoài nút (${QT.chu_khac.length})\n\nĐể riêng cho khỏi loãng danh sách nút.\n\n| Loại | Màn hình | Hiện tại | Vấn đề | Đề xuất | Nguồn |\n|---|---|---|---|---|---|\n`;
  const NHAN_LOAI = { tieu_de: "Tiêu đề", cot: "Nhãn cột", bao_loi: "Câu báo lỗi", khac: "Khác" };
  for (const c of QT.chu_khac) md += `| ${NHAN_LOAI[c.loai] ?? oc(c.loai)} | ${oc(c.man_hinh)} | ${oc(c.hien_tai)} | ${oc(c.van_de)} | ${oc(c.de_xuat)} | \`${oc(c.nguon)}\` |\n`;
  md += `\n`;
}
if ((QT.chua_kiem ?? []).length) {
  md += `## Điều chưa kiểm (${QT.chua_kiem.length})\n\nDo các trợ lý đọc mã tự khai. Không ai mở trình duyệt trong lượt này, nên màu nút lấy từ tên lớp trong mã, chưa có ảnh thật.\n\n`;
  for (const c of QT.chua_kiem) md += `- ${oc(c)}\n`;
  md += `\n`;
}
writeFileSync(join(HERE, "NUT-QUAN-TRONG.md"), md);
console.log(`hàng ${hang.length}; ứng viên ${ungVien.length}; lỗi độ phủ ${loi.phu.length}; tệp:dòng ${loi.dong.length}; khuôn ${loi.khuon.length}; tên ${loi.ten.length}; trùng tên (đọc tay) ${loi.trungTen.length}`);
process.exitCode = tongLoi ? 1 : 0;
