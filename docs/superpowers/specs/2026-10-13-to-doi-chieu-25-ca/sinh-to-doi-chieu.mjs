#!/usr/bin/env node
// Sinh "Tờ đối chiếu 25 ca sổ vàng" cho Kế toán từ ba tệp golden/*.json (không chép tay số nào).
// Chạy ở gốc kho: node docs/superpowers/specs/2026-10-13-to-doi-chieu-25-ca/sinh-to-doi-chieu.mjs
// Ra: docs/superpowers/specs/2026-10-13-to-doi-chieu-25-ca/to-doi-chieu.html (in được, A4).
// Chỉ ĐỌC dữ liệu; không đổi trạng thái ca nào (việc đó chỉ chủ dự án / Kế toán — golden/README.md "Thêm / sửa ca", Hiến pháp N8).
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const doc = (t) => JSON.parse(readFileSync(new URL(`../../../../golden/${t}.json`, import.meta.url), "utf8"));
const SC1 = doc("so-cong-no-luot-1").cac_ca.filter((c) => c.xac_nhan.trang_thai !== "da_xac_nhan");
const DL = doc("so-cong-no-luot-2").cac_ca.filter((c) => c.xac_nhan.trang_thai !== "da_xac_nhan");
const DH = doc("don-huy-coc").cac_ca.filter((c) => c.xac_nhan.trang_thai !== "da_xac_nhan");
const TONG = SC1.length + DL.length + DH.length;

const e = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const d = (n) => `${Number(n).toLocaleString("vi-VN")} đ`;
const ngay = (s) => { const [y, m, dd] = String(s).split("-"); return `${dd}/${m}/${y}`; };
const NHOM = { KHACH_HUY: "Khách huỷ", CONG_TY_HUY: "Công ty huỷ", LAP_LAI: "Huỷ để lập lại / trùng đơn", CHUA_KET_LUAN: "Chưa kết luận" };
const LOI = {
  coc_exceeds_approved: "chi vượt phần đã duyệt",
  coc_deadline: "đã quá hạn hoàn cọc",
  forbidden: "người này không có quyền làm việc đó",
  coc_same_person: "cùng một người vừa làm bước trước vừa làm bước này (luật bắt phải tách người)",
  coc_outside_once: "đơn này đã có một khoản «hoàn ngoài hệ thống» đang hiệu lực (mỗi đơn chỉ một khoản)",
  coc_paid_below_approved: "nếu đảo lần thu thì số khách đã trả sẽ thấp hơn số đã duyệt hoàn",
  coc_exceeds_paid: "duyệt vượt số tiền khách còn có thể được hoàn",
  coc_unclassified: "đơn chưa phân loại lý do huỷ nên chưa được duyệt hoàn",
};
// Tiêu đề đời thường của từng ca (chỉ là tên gọi; số liệu và các bước đều lấy từ dữ liệu).
const TIEU_DE = {
  "SV-SC-01": "Nhân viên thu đủ tiền mặt rồi nộp về công ty",
  "SV-SC-02": "Khách chuyển khoản một nửa, nhân viên thu tiền mặt nửa còn lại",
  "SV-SC-03": "Bớt khách sau khi đã thu: khách trả dư, nhân viên hoàn lại",
  "SV-SC-04": "Đơn cũ có cọc không rõ người thu: Kế toán đảo rồi ghi lại",
  "SV-SC-05": "Đơn có dịch vụ nhập tay và giảm giá",
  "SV-SC-06": "Nhân viên khai chuyển khoản nhưng tiền không về, nộp bù tiền mặt",
  "A-1": "Chọn mức hoa hồng cho đơn nhiều dòng (ba bậc khác nhau)",
  "A-2": "Hoa hồng tính theo khách, hướng dẫn viên sửa số khách",
  "A-3": "Công ty đổi bảng mức hoa hồng sau khi đơn đã xác nhận",
  "A-4": "Thiếu mức hoa hồng, Kế toán ghi tay 15%",
  "A-5": "Làm tròn khi hoa hồng ra số lẻ",
  "B-3": "Giảm giá trên dịch vụ của nhà cung cấp",
  "SV-DH-01": "Khách huỷ, công ty giữ cọc",
  "SV-DH-02": "Hoàn một phần cọc; chi vượt phần đã duyệt thì bị chặn",
  "SV-DH-03": "Duyệt hoàn quá hạn thì bị từ chối",
  "SV-DH-04": "Công ty huỷ (thời tiết), hoàn toàn bộ",
  "SV-DH-05": "Công ty huỷ, dời lịch: chuyển tiền sang đơn khác",
  "SV-DH-06": "Huỷ để lập lại đơn, chuyển tiền sang đơn mới",
  "SV-DH-07": "Đơn huỷ cũ, công ty đã hoàn tay cho khách",
  "SV-DH-08": "Không cho đảo lần thu làm hụt số đã duyệt hoàn",
  "SV-DH-09": "Phải tách người duyệt và người chi",
  "SV-DH-10": "Khoản khách chuyển khoản chưa được Kế toán xác nhận",
  "SV-DH-11": "Đơn huỷ chưa phân loại lý do",
  "SV-DH-12": "Đơn nháp chưa có ngày đi: tính hạn hoàn từ ngày huỷ",
  "SV-DH-13": "Đã hoàn dư trước khi huỷ, rồi duyệt hoàn",
};
// Bỏ tham chiếu tài liệu thiết kế khỏi đoạn mô tả (Kế toán không cần); căn cứ vẫn in ở dòng «Căn cứ thiết kế».
const sachMoTa = (t) => t
  .replace(/^ADR-\d+ điều \d+ — /, "")
  .replace(/^VP-01 \([^)]*\)\.\s*/, "")
  .replace(/\s*\((?:[^()]*ADR[^()]*)\)/g, "")
  .replace(/\s*\((?:chủ duyệt|H8 = A|H3 — thận trọng|đặc tả §\d+)[^()]*\)/g, "")
  .replace(/\s{2,}/g, " ").trim();
const nguoiLa = (n) => (n === "he-thong" ? "Hệ thống" : n);

// Mỗi bước thành {loai: "vao"|"ra"|"viec"|"loi", chu, so}
function buoc(ev) {
  const so = ev.so !== undefined ? d(ev.so) : "";
  let r;
  switch (ev.loai) {
    case "thu":
      if (ev.vai_nguoi_thu === "nhan_vien") r = { k: "vao", chu: `${ev.nguoi_thu} thu tiền mặt của khách, nhân viên đang GIỮ tiền này của công ty`, so };
      else if (ev.vai_nguoi_thu === "chua_ro") r = { k: "vao", chu: "Khoản thu cũ ghi trên đơn, KHÔNG rõ ai đã thu", so };
      else if (ev.nguoi_ghi_la_ke_toan) r = { k: "vao", chu: `Kế toán (${nguoiLa(ev.nguoi_ghi)}) ghi: công ty đã nhận tiền (chuyển khoản / tại công ty)`, so };
      else r = { k: "vao", chu: `${nguoiLa(ev.nguoi_ghi)} KHAI «Công ty thu – chuyển khoản» (Kế toán CHƯA xác nhận tiền đã về)`, so };
      break;
    case "xac_nhan_cong_ty": r = { k: "viec", chu: `Kế toán bấm «Công ty đã nhận» cho lần thu số ${ev.thu_so}` }; break;
    case "nop": r = { k: "ra", chu: `${ev.ben} nộp tiền đang giữ về công ty`, so }; break;
    case "hoan": r = { k: "ra", chu: `${ev.nguoi_tra} trả lại khách (Kế toán ghi)`, so }; break;
    case "dao_thu": r = { k: "viec", chu: `Kế toán ĐẢO (huỷ) lần thu số ${ev.thu_so}` }; break;
    case "hoan_tu_do": r = { k: "ra", chu: `${ev.nguoi_tra} hoàn phần khách trả dư, TRƯỚC khi đơn bị huỷ`, so }; break;
    case "huy":
      r = ev.legacy
        ? { k: "viec", chu: `Đơn đã bị huỷ từ trước khi có sổ cọc (huỷ ngày ${ngay(ev.ngay)}); chưa rõ lý do` }
        : { k: "viec", chu: `${ev.nguoi} huỷ đơn ngày ${ngay(ev.ngay)}. Nhóm lý do: «${NHOM[ev.nhom] ?? ev.nhom}»` };
      break;
    case "phan_loai": r = { k: "viec", chu: `${ev.nguoi} phân loại lý do huỷ thành «${NHOM[ev.nhom] ?? ev.nhom}»` }; break;
    case "duyet":
      r = ev.loai_duyet === "chuyen"
        ? { k: "viec", chu: `${ev.nguoi} duyệt CHUYỂN tiền sang đơn ${ev.don_nhan} (ngày ${ngay(ev.ngay)})`, so }
        : { k: "viec", chu: `${ev.nguoi} duyệt HOÀN cho khách (ngày ${ngay(ev.ngay)})`, so };
      break;
    case "huy_duyet": r = { k: "viec", chu: `${ev.nguoi} huỷ lệnh duyệt số ${ev.duyet_so}`, so }; break;
    case "chi": r = { k: "ra", chu: `${ev.nguoi} chi trả khách theo lệnh duyệt số ${ev.duyet_so} (người trả: ${ev.nguoi_tra})`, so }; break;
    case "chuyen": r = { k: "viec", chu: `${ev.nguoi} ghi chuyển sang đơn kia theo lệnh duyệt số ${ev.duyet_so} (tiền đang do ${ev.nguoi_giu} giữ)`, so }; break;
    case "ghi_hoan_ngoai": r = { k: "ra", chu: `${ev.nguoi} ghi: công ty đã trả tay cho khách ngoài hệ thống`, so }; break;
    case "xac_nhan_hoan_ngoai": r = { k: "viec", chu: `${ev.nguoi} xác nhận khoản «hoàn ngoài hệ thống»` }; break;
    case "chup": {
      const p = [];
      if (ev.da_tra !== undefined) p.push(`đã trả ${d(ev.da_tra)}`);
      if (ev.dang_doi_chieu !== undefined) p.push(`đang chờ xác nhận ${d(ev.dang_doi_chieu)}`);
      if (ev.con_giu !== undefined) p.push(`công ty còn giữ ${d(ev.con_giu)}`);
      if (ev.da_duyet !== undefined) p.push(`đã duyệt ${d(ev.da_duyet)}`);
      if (ev.da_chi !== undefined) p.push(`đã chi ${d(ev.da_chi)}`);
      r = { k: "kiem", chu: `Điểm kiểm giữa chừng, máy phải cho: ${p.join(" · ")}` };
      break;
    }
    default: r = { k: "viec", chu: ev.loai };
  }
  if (ev.ky_vong_loi) r = { ...r, k: "loi", loi: LOI[ev.ky_vong_loi] ?? ev.ky_vong_loi };
  return r;
}

function cacBuoc(events) {
  const hang = events.map((ev, i) => {
    const b = buoc(ev);
    const dau = { vao: "＋", ra: "−", viec: "●", loi: "✖", kiem: "◆" }[b.k];
    const loi = b.k === "loi" ? `<div class="tu-choi">Máy phải TỪ CHỐI bước này: ${e(b.loi)}. Số liệu không đổi.</div>` : "";
    return `<tr class="b-${b.k}"><td class="stt">${i + 1}</td><td class="dau">${dau}</td><td>${e(b.chu)}${loi}</td><td class="so">${b.so ? e(b.so) : ""}</td></tr>`;
  });
  return `<table class="buoc"><thead><tr><th>#</th><th></th><th>Việc xảy ra, theo thứ tự</th><th>Số tiền</th></tr></thead><tbody>${hang.join("")}</tbody></table>`;
}

const o = (nhan, gt, ghichu) => `<div class="o"><div class="nhan">${e(nhan)}</div><div class="gt">${gt}</div>${ghichu ? `<div class="gc">${e(ghichu)}</div>` : ""}</div>`;
const tien = (n) => `<b>${e(d(n))}</b>`;
const coKhong = (b) => (b ? `<b class="co">CÓ</b>` : `<b class="khong">KHÔNG</b>`);
const nguoiGiu = (m) => {
  const k = Object.entries(m ?? {});
  if (k.length === 0) return "<b>Không ai giữ</b>";
  return k.map(([ten, n]) => (n > 0 ? `${e(ten)} đang giữ ${tien(n)} của công ty` : n < 0 ? `Công ty còn nợ ${e(ten)} ${tien(-n)}` : `${e(ten)}: không giữ gì (${tien(0)})`)).join("<br>");
};

function ketQuaCongNo(a) {
  return `<div class="luoi">${[
    o("Khách đã trả (tính ròng, sau khi đảo / hoàn)", tien(a.da_thu)),
    o("Khách còn thiếu", tien(a.con_lai)),
    o("Khách trả dư, chờ hoàn", tien(a.du)),
    o("Khoản thu chưa rõ ai thu", tien(a.chua_ro)),
    o("Ai đang giữ tiền của công ty", nguoiGiu(a.no_tour_dao)),
    o("Bấm được «Đã giao – đã thu đủ» không?", coKhong(a.giao_duoc), "Chỉ xét về tiền: đã thu đủ và không còn khoản chưa rõ."),
  ].join("")}</div>`;
}

function ketQuaCoc(a) {
  const ts = [
    o("Khách đã trả (công ty đã xác nhận)", tien(a.da_tra)),
    o("Đang chờ Kế toán xác nhận", tien(a.dang_doi_chieu)),
    o("Khách còn nợ (đơn huỷ thì phải là 0)", tien(a.con_lai)),
    o("Đã hoàn dư trước khi huỷ", tien(a.hoan_truoc_huy)),
    o("Đã duyệt (hoàn hoặc chuyển)", tien(a.da_duyet)),
    o("Đã chi trả khách", tien(a.da_chi)),
    o("Đã chuyển sang đơn khác", tien(a.da_chuyen)),
    o("Đã hoàn ngoài hệ thống (đã xác nhận)", tien(a.hoan_ngoai)),
    o("Công ty còn GIỮ (cọc)", tien(a.con_giu), "Đã trả − hoàn dư trước huỷ − đã chi − đã chuyển."),
    o("Đã duyệt nhưng CHƯA chi", tien(a.cho_chi)),
    o("Mặc định chờ hoàn", tien(a.cho_hoan_mac_dinh), "Luật: khách huỷ mặc định KHÔNG được hoàn cọc, nên số này là 0."),
    o("Hạn duyệt hoàn cọc (nhóm khách huỷ)", `<b>${e(ngay(a.han))}</b>`, "Ngày đi muộn nhất + 60 ngày; đơn chưa có ngày đi thì ngày huỷ + 60."),
    o("Nhãn hiện trên đơn", `<b>${e(a.nhan)}</b>${a.nhan_phu ? `<br>${e(a.nhan_phu)}` : ""}`),
    o("Ai đang giữ tiền của công ty", nguoiGiu(a.so_du)),
  ];
  if (a.don_nhan) ts.push(o("Đơn nhận tiền chuyển sang", `Khách đã trả ${tien(a.don_nhan.da_tra)}<br>${nguoiGiu(a.don_nhan.so_du)}`));
  return `<div class="luoi">${ts.join("")}</div>`;
}

function dongTien(c) {
  // sổ đại lý: từng dòng "đầu vào → kết quả"
  const hang = c.dong.map((dg) => {
    const v = dg.dau_vao, a = dg.dap_an;
    const cong = [];
    if (a.trang_thai === "MISSING") cong.push(`<span class="muc">Chưa có dòng mức cho người này ⇒ máy báo <b>THIẾU MỨC</b> (không tự tính hoa hồng; đơn bị giữ ở «Đã giao»)</span>`);
    else {
      if (v.thanh_tien !== null) cong.push(`Thành tiền dòng: ${tien(v.thanh_tien)}`);
      if (v.kieu === "RATE" && v.ty_le_bp !== null) cong.push(`Mức: <b>${e((v.ty_le_bp / 100).toLocaleString("vi-VN"))}%</b> thành tiền`);
      if (v.kieu === "PER_PAX") cong.push(`Mức: ${tien(v.moi_khach)} mỗi khách × <b>${v.khach_tinh} khách tính</b>`);
      if (v.ty_le_mua_bp !== null) cong.push(`Mức mua lại của nhà cung cấp: <b>${e((v.ty_le_mua_bp / 100).toLocaleString("vi-VN"))}%</b> thành tiền (tính trên thành tiền TRƯỚC giảm giá)`);

    }
    const kq = [];
    const trong = (nhan) => `<span class="trong">ADR không nêu số: Kế toán điền (${e(nhan)}): <span class="gach"></span></span>`;
    if (a.ty_le_bp_ap_dung !== undefined) kq.push(`Máy phải áp mức: <b>${e((a.ty_le_bp_ap_dung / 100).toLocaleString("vi-VN"))}%</b> (ca này chỉ kiểm MỨC, không có số tiền)`);
    if (a.hoa_hong !== null) kq.push(`Hoa hồng đại lý: ${tien(a.hoa_hong)}`);
    else if (v.kieu && a.ty_le_bp_ap_dung === undefined && a.trang_thai !== "MISSING" && v.ty_le_mua_bp === null) kq.push(trong("hoa hồng"));
    if (a.gia_dai_ly !== null) kq.push(`Giá đại lý trả công ty: ${tien(a.gia_dai_ly)}`);
    else if (a.hoa_hong !== null && v.thanh_tien === null) kq.push(trong("giá đại lý"));
    if (a.gia_von !== null) kq.push(`Giá vốn trả nhà cung cấp: ${tien(a.gia_von)}`);
    if (dg.bo_sung) kq.push(`Tour Đảo giảm cho khách ${tien(dg.bo_sung.giam_gia)} ⇒ khách trả ${tien(dg.bo_sung.khach_tra)}; công ty giữ lại ${tien(dg.bo_sung.cong_ty_giu)} (= khách trả − giá vốn)`);
    return `<tr><td class="nd"><b>${e(dg.nhan)}</b></td><td>${cong.join("<br>") || "Theo mô tả ở phần «Chuyện xảy ra»"}</td><td class="kq">${kq.join("<br>") || "—"}</td></tr>`;
  });
  const tong = c.tong ? `<div class="tong">Cộng cả ca: thành tiền ${tien(c.tong.thanh_tien)} · hoa hồng ${tien(c.tong.hoa_hong)} · giá đại lý ${tien(c.tong.gia_dai_ly)}</div>` : "";
  return `<table class="dl"><thead><tr><th>Dòng</th><th>Đầu vào (đề bài)</th><th>Kết quả máy cho là ĐÚNG</th></tr></thead><tbody>${hang.join("")}</tbody></table>${tong}`;
}

function khungDanhGia(ma) {
  return `<div class="danhgia">
    <span class="hop">☐ ĐÚNG hoàn toàn</span><span class="hop">☐ SAI ở chỗ:</span><span class="dong"></span>
    <div class="ghichu">Số đúng theo Kế toán / ghi chú: <span class="dong dai"></span></div>
  </div>`;
}

function theCa(c, phan, kieuNoiDung) {
  return `<section class="ca" id="${e(c.ma)}">
    <h3><span class="ma">${e(c.ma)}</span> ${e(TIEU_DE[c.ma] ?? "")}<br><span class="phan">${e(phan)}</span></h3>
    <p class="chuyen"><b>Chuyện xảy ra.</b> ${e(sachMoTa(c.mo_ta))}</p>
    ${kieuNoiDung}
    ${khungDanhGia(c.ma)}
    <div class="nguon">Căn cứ thiết kế: ${e(c.nguon.replace(/thanh_tien/g, "thành tiền").replace(/gia_dai_ly/g, "giá đại lý").replace(/hoa_hong/g, "hoa hồng").replace(/để null/g, "để trống"))}</div>
  </section>`;
}

const cong = (m) => (m.length > 150 ? m.slice(0, 147) + "…" : m);
function ketQuaMotDong(c, loai) {
  if (loai === "sc") return `giữ: ${Object.entries(c.dap_an.no_tour_dao).map(([k, v]) => `${k} ${d(v)}`).join(", ") || "—"} · Đã giao ${c.dap_an.giao_duoc ? "được" : "chưa được"}`;
  if (loai === "dh") return `công ty giữ ${d(c.dap_an.con_giu)} · đã chi ${d(c.dap_an.da_chi)} · đã chuyển ${d(c.dap_an.da_chuyen)}`;
  const hh = c.dong.map((x) => x.dap_an.hoa_hong ?? x.dap_an.gia_von).filter((x) => x !== null && x !== undefined);
  return hh.length ? `số tiền: ${hh.map(d).join(" · ")}` : "chỉ kiểm mức áp dụng";
}

const phan1 = SC1.map((c) => theCa(c, "Sổ công nợ lượt 1 — tiền khách lẻ", `${c.dau_vao.dong_don ? `<table class="dongdon"><thead><tr><th>Dòng đơn</th><th>SL</th><th>Đơn giá</th></tr></thead><tbody>${c.dau_vao.dong_don.map((x) => `<tr><td>${e(x.ten_dich_vu ?? x.mo_ta)}${x.loai === "nhap_tay" ? " <i>(nhập tay)</i>" : ""}</td><td>${x.so_luong}</td><td>${e(d(x.don_gia))}</td></tr>`).join("")}</tbody></table>` : ""}<div class="phaithu">Đơn khách phải trả (số cuối cùng): ${tien(c.dau_vao.phai_thu)}${c.dau_vao.giam_gia ? ` (đã trừ giảm giá ${e(d(c.dau_vao.giam_gia))})` : ""}</div>${cacBuoc(c.dau_vao.su_kien)}<h4>Máy cho kết quả như sau — Kế toán đối chiếu:</h4>${ketQuaCongNo(c.dap_an)}`));
const phan2 = DL.map((c) => theCa(c, "Sổ đại lý — hoa hồng và giá vốn", `<h4>Đề bài và kết quả máy cho là đúng — Kế toán đối chiếu:</h4>${dongTien(c)}`));
const phan3 = DH.map((c) => theCa(c, "Đơn huỷ và cọc", `<div class="phaithu">Giá trị đơn: ${tien(c.dau_vao.phai_thu)} · ngày đi: ${e((c.dau_vao.ngay_di ?? []).map(ngay).join(", ") || "chưa có")} · “hôm nay” của ca: ${e(ngay(c.dau_vao.hom_nay))}</div>${cacBuoc(c.dau_vao.su_kien)}<h4>Sau các bước trên, máy cho kết quả — Kế toán đối chiếu:</h4>${ketQuaCoc(c.dap_an)}`));

const bangTom = (cacCa, loai, ten) => `<h3 class="tom-phan">${e(ten)}</h3><table class="tom"><thead><tr><th>Mã</th><th>Chuyện gì</th><th>Kết quả chính</th><th>Đúng</th><th>Sai</th></tr></thead><tbody>${cacCa.map((c) => `<tr><td class="mact"><a href="#${e(c.ma)}">${e(c.ma)}</a></td><td>${e(TIEU_DE[c.ma] ?? "")}</td><td>${e(ketQuaMotDong(c, loai))}</td><td class="tick">☐</td><td class="tick">☐</td></tr>`).join("")}</tbody></table>`;

const html = `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Tờ đối chiếu ${TONG} ca sổ vàng cho Kế toán</title>
<style>
:root{--xanh:#0c4a6e;--xanh-nhat:#dcebf6;--nen:#f2f5f9;--vien:#e1e7ef;--chu:#0f172a;--chu-phu:#475569;--vao:#166534;--vao-nen:#dcfce7;--ra:#8e0e2b;--ra-nen:#fde9ee;--cat:#fbe3b3;--cat-chu:#5a4109}
*{box-sizing:border-box}
body{font:15px/1.5 "Be Vietnam Pro",system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:var(--chu);background:var(--nen);margin:0;padding:16px}
.trang{max-width:900px;margin:0 auto}
h1{color:var(--xanh);font-size:26px;margin:0 0 4px}h2{color:var(--xanh);font-size:20px;margin:28px 0 8px;border-bottom:2px solid var(--xanh);padding-bottom:4px}
h3{margin:0 0 8px;font-size:18px}h4{margin:14px 0 6px;font-size:15px;color:var(--xanh)}
.hop-gt{background:#fff;border:1px solid var(--vien);border-radius:12px;padding:14px 16px;margin:10px 0}
.hop-gt ol{margin:6px 0 0 20px;padding:0}.hop-gt li{margin:4px 0}
.luu-y{background:var(--cat);color:var(--cat-chu);border-radius:12px;padding:12px 16px;margin:10px 0;font-weight:500}
.chuthich{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px;margin:8px 0}
.chuthich div{background:#fff;border:1px solid var(--vien);border-radius:8px;padding:8px 10px;font-size:14px}
.chuthich b{color:var(--xanh)}
table{border-collapse:collapse;width:100%;background:#fff}
th,td{border:1px solid var(--vien);padding:6px 8px;text-align:left;vertical-align:top;font-size:14px}
th{background:var(--xanh-nhat);color:var(--xanh)}
table.tom td.mact{white-space:nowrap}
.nguon{margin-top:8px;font-size:12px;color:var(--chu-phu)}
table.tom td.tick{text-align:center;font-size:20px;width:46px}
.tom-phan{margin:16px 0 6px;color:var(--xanh)}
section.ca{background:#fff;border:1px solid var(--vien);border-radius:14px;padding:14px 16px;margin:14px 0;page-break-inside:avoid;break-inside:avoid}
.ma{background:var(--xanh);color:#fff;border-radius:8px;padding:2px 10px;font-size:16px}.phan{color:var(--chu-phu);font-size:14px;font-weight:400}
.chuyen{margin:6px 0 10px;background:var(--nen);border-radius:8px;padding:8px 10px}
.phaithu{margin:4px 0 8px;font-size:15px}
table.buoc td.stt{width:28px;text-align:center;color:var(--chu-phu)}table.buoc td.dau{width:26px;text-align:center;font-weight:700}
table.buoc td.so{white-space:nowrap;text-align:right;font-weight:600}
tr.b-vao td.dau,tr.b-vao td.so{color:var(--vao)}tr.b-vao{background:var(--vao-nen)}
tr.b-ra td.dau,tr.b-ra td.so{color:var(--ra)}tr.b-ra{background:var(--ra-nen)}
tr.b-loi{background:#eceff3;color:#334155}tr.b-loi td.dau{color:var(--ra)}
tr.b-kiem{background:var(--xanh-nhat)}
.tu-choi{margin-top:3px;color:var(--ra);font-weight:600;font-size:13px}
.luoi{display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:8px}
.o{border:1px solid var(--vien);border-radius:10px;padding:8px 10px;background:#fff}.o .nhan{font-size:12.5px;color:var(--chu-phu)}.o .gt{font-size:16px;margin-top:2px}.o .gc{font-size:12px;color:var(--chu-phu);margin-top:2px}
.co{color:var(--vao)}.khong{color:var(--ra)}
.dl .nd{width:26%}.dl .kq{background:var(--vao-nen)}.muc{color:var(--cat-chu);background:var(--cat);padding:2px 6px;border-radius:6px}
.trong{display:inline-block;background:var(--cat);color:var(--cat-chu);padding:2px 6px;border-radius:6px}
.tong{margin-top:6px;font-size:14px}
.gach{display:inline-block;border-bottom:1px solid var(--chu);min-width:110px;height:1.1em;vertical-align:bottom}
.danhgia{margin-top:12px;border-top:2px dashed var(--chu-phu);padding-top:10px;font-size:16px}
.hop{display:inline-block;margin-right:18px;font-weight:700}.dong{display:inline-block;border-bottom:1px solid var(--chu);min-width:240px;height:1.2em;vertical-align:bottom}.dong.dai{min-width:70%}
.ghichu{margin-top:10px}
.ky{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}.ky div{border-top:1px solid var(--chu);padding-top:4px;font-size:14px;text-align:center}
a{color:var(--xanh)}
@media print{body{background:#fff;padding:0;font-size:13px}.luoi{grid-template-columns:repeat(4,1fr);gap:5px}.o{padding:4px 7px}.o .gt{font-size:14px}.o .nhan{font-size:11.5px}.o .gc{font-size:10.5px}section.ca{padding:10px 12px;margin:8px 0}.chuyen{padding:6px 8px;margin:4px 0 6px}h4{margin:8px 0 4px}th,td{padding:4px 6px;font-size:12.5px}.danhgia{margin-top:8px;padding-top:6px}.ghichu{margin-top:6px}.trang{max-width:none}section.ca{border-radius:6px}.noprint{display:none}@page{size:A4;margin:12mm}}
</style></head><body><div class="trang">
<h1>Tờ đối chiếu ${TONG} ca sổ vàng</h1>
<p style="margin:0;color:var(--chu-phu)">Dành cho Kế toán · lập ngày 13/10/2026 · dữ liệu lấy thẳng từ ba tệp ca mẫu của Nền tảng, không chép tay</p>

<div class="luu-y">Mục đích: xác nhận máy tính tiền đúng đến từng đồng. Bạn không cần biết lập trình. Chỉ cần cho biết con số ở cột «máy cho là đúng» có khớp với cách Kế toán sẽ ghi sổ không.</div>

<div class="hop-gt"><b>Cách làm, cho mỗi ca (khoảng 2–5 phút):</b>
<ol>
<li>Đọc ô <b>Chuyện xảy ra</b> để hiểu tình huống.</li>
<li>Theo dõi bảng <b>các bước</b>: dòng xanh là tiền VÀO, dòng hồng là tiền RA, dòng xám có dấu ✖ là bước máy phải TỪ CHỐI.</li>
<li>Tự tính nhẩm kết quả, rồi so với phần <b>máy cho là đúng</b>.</li>
<li>Khớp hết thì đánh dấu <b>☐ ĐÚNG hoàn toàn</b>. Chỗ nào bạn không đồng ý thì đánh dấu <b>☐ SAI</b> và ghi số bạn cho là đúng.</li>
</ol>
<div style="margin-top:6px"><b>Quan trọng:</b> chỉ đánh dấu ĐÚNG khi bạn đồng ý với TỪNG con số của ca đó. Chưa chắc thì để trống, đừng đoán. Ca để trống hoặc ghi SAI sẽ được xử lý riêng; không ai tự ý xác nhận thay bạn.</div></div>

<div class="hop-gt"><b>Một vài từ dùng trong tờ này</b>
<div class="chuthich">
<div><b>Nhân viên giữ tiền</b>: hướng dẫn viên thu tiền mặt của khách và chưa nộp về công ty. Số này là «công ty đang bị nhân viên giữ».</div>
<div><b>Công ty thu / Công ty đã nhận</b>: tiền đã vào tài khoản hoặc quỹ công ty. Nhân viên có thể KHAI là công ty đã thu, nhưng chỉ tính chắc khi Kế toán bấm xác nhận.</div>
<div><b>Nộp</b>: nhân viên nộp tiền đang giữ về công ty.</div>
<div><b>Đảo lần thu</b>: Kế toán huỷ một lần ghi thu ghi sai; số liệu tính lại như chưa từng có lần thu đó.</div>
<div><b>Cọc giữ lại</b>: khi khách huỷ, tiền khách đã trả mặc định công ty giữ, không bắt buộc hoàn.</div>
<div><b>Duyệt hoàn → Chi</b>: Quản trị duyệt trước rồi Kế toán mới chi. Người duyệt không được tự chi (phải tách hai người).</div>
<div><b>Hạn hoàn cọc</b>: tối đa 60 ngày sau ngày khởi hành dự kiến (chỉ áp cho nhóm «khách huỷ»).</div>
<div><b>Hoa hồng / giá đại lý / giá vốn</b>: hoa hồng là phần công ty trả đại lý; giá đại lý = thành tiền − hoa hồng; giá vốn là phần công ty trả nhà cung cấp.</div>
<div><b>Làm tròn «nửa lên»</b>: tính từng dòng; số lẻ từ nửa đồng trở lên thì làm tròn lên 1 đồng (chủ dự án đã duyệt cách này ngày 08/10).</div>
</div></div>

<h2>Bảng tóm tắt — ký nhanh sau khi đã xem từng ca</h2>
${bangTom(SC1, "sc", `Phần 1. Sổ công nợ lượt 1 (${SC1.length} ca)`)}
${bangTom(DL, "dl", `Phần 2. Sổ đại lý — hoa hồng và giá vốn (${DL.length} ca)`)}
${bangTom(DH, "dh", `Phần 3. Đơn huỷ và cọc (${DH.length} ca)`)}

<h2>Phần 1. Sổ công nợ lượt 1 — ${SC1.length} ca</h2>${phan1.join("")}
<h2>Phần 2. Sổ đại lý — hoa hồng và giá vốn — ${DL.length} ca</h2>
<div class="luu-y">Lưu ý: ca A-2, A-3, A-4 có chỗ tài liệu thiết kế KHÔNG nêu số tiền. Chỗ đó được tô vàng, mời Kế toán tự điền số đúng. Ca A-5 dòng thứ hai (1.000.004 đ) không có trong tài liệu thiết kế, do người lập đề xuất để thử đúng ca «nửa đồng».</div>
${phan2.join("")}
<h2>Phần 3. Đơn huỷ và cọc — ${DH.length} ca</h2>${phan3.join("")}

<h2>Xác nhận của Kế toán</h2>
<div class="hop-gt">Tôi đã xem các ca trong tờ này. Các ca tôi đánh dấu ĐÚNG, tôi đồng ý con số đúng từng đồng. Các ca đánh dấu SAI hoặc để trống chưa được xác nhận.
<div class="ky"><div>Họ tên Kế toán</div><div>Ngày</div><div>Chữ ký</div></div>
<p class="noprint" style="margin-top:14px;color:var(--chu-phu);font-size:13px"><b>Sau khi ký:</b> đưa tờ này cho chủ dự án. Chủ dự án (hoặc Kế toán) mới là người chuyển từng ca ĐÚNG sang trạng thái «đã xác nhận» kèm tên và ngày. Trợ lý AI không tự đổi trạng thái.</p></div>
</div></body></html>`;

const ra = fileURLToPath(new URL("./to-doi-chieu.html", import.meta.url));
writeFileSync(ra, html);
console.log(`Đã sinh ${ra} — ${TONG} ca (${SC1.length} + ${DL.length} + ${DH.length})`);
