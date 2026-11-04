// Các phép kiểm của bảng tham chiếu ngôn ngữ (ADR-0167). Hàm thuần: nhận dữ liệu, trả mảng câu lỗi (rỗng là đạt).
// Bài `src/bang-tham-chieu.test.ts` thử bằng dữ liệu mẫu rồi chạy trên dữ liệu thật. Máy kiểm tên có NHẤT QUÁN, không kiểm tên có ĐÚNG SỰ THẬT.
import { NGHIA_HON_DAO } from "../src/shared/bang-tu-giao-dien.ts";
import { chuanNhan, khoaNut } from "./quet-nut-lib.mjs";

const CHU_GHEP = /[⟪‹]/u;
const khoaViTri = (tep, chu) => `${tep}\u0000${chu}`;

/** Nhãn không phải tên để so (biểu thức lúc chạy, biểu tượng, gạch ngang). */
const laNhanKhongTen = (t) => !t || t.startsWith("⟪") || t.startsWith("[biểu tượng") || t === "—";
const tenCuaNut = (n) => [...(n.nhan ?? [])].map(chuanNhan).filter((t) => !laNhanKhongTen(t));
const mangHoa = (x) => (x instanceof Set ? [...x] : [...(x ?? [])]);
const cat = (s, n = 70) => (s.length > n ? `${s.slice(0, n)}…` : s);

/** Điều 1: nút đã khai phải còn mang đúng tên trong bảng, ở đúng tệp. */
export function kiemNoiDat(viec, nut) {
  const co = new Set(nut.map((n) => khoaViTri(n.tep, khoaNut(n))));
  const loi = [];
  for (const v of viec) {
    for (const d of v.noiDat) {
      if (co.has(khoaViTri(d.tep, d.chu))) continue;
      if (CHU_GHEP.test(d.chu)) {
        loi.push(`${d.tep}: nút của việc «${v.ten}» khai «${d.chu}» là chữ ghép từ mã (đổi tên biến thì khoá đổi), không còn thấy nữa. Đọc tay nút đó rồi sửa bảng cho khớp.`);
        continue;
      }
      const dangCo = [...new Set(nut.filter((n) => n.tep === d.tep).map(khoaNut))].slice(0, 6).join(" · ");
      loi.push(`${d.tep}: việc «${v.ten}» khai tên «${d.chu}» nhưng nút không còn mang tên đó (tệp đang có: ${dangCo || "không có nút nào"}). Sửa nút về tên chuẩn; nếu chủ đã chọn tên mới thì sửa bảng cùng lần lưu; nút bị bỏ thì bỏ dòng khỏi bảng.`);
    }
  }
  return loi;
}

/** Điều 2: tên đã khai (trừ chữ dùng chung) xuất hiện trên nút ở chỗ chưa khai. */
export function kiemTenLacCho(viec, boQua, chuDungChung, nut) {
  const chung = new Set(chuDungChung.map((c) => chuanNhan(c.chu)));
  const daKhai = new Set([...viec.flatMap((v) => v.noiDat), ...boQua].map((d) => khoaViTri(d.tep, d.chu)));
  const trongViec = new Set(viec.flatMap((v) => v.noiDat).map((d) => khoaViTri(d.tep, d.chu)));
  const tenDaKhai = new Map(); // tên → các việc
  for (const n of nut) {
    if (!trongViec.has(khoaViTri(n.tep, khoaNut(n)))) continue;
    const v = viec.find((x) => x.noiDat.some((d) => d.tep === n.tep && d.chu === khoaNut(n)));
    for (const t of tenCuaNut(n)) {
      if (chung.has(t)) continue;
      const o = tenDaKhai.get(t) ?? new Set();
      o.add(v ? v.ten : "?");
      tenDaKhai.set(t, o);
    }
  }
  const loi = [];
  const daBao = new Set();
  for (const n of nut) {
    if (daKhai.has(khoaViTri(n.tep, khoaNut(n)))) continue;
    for (const t of tenCuaNut(n)) {
      const o = tenDaKhai.get(t);
      if (!o) continue;
      const k = `${n.tep}|${n.dong}|${t}`;
      if (daBao.has(k)) continue;
      daBao.add(k);
      loi.push(`${n.tep}:${n.dong} nút «${t}» mang tên đã khai cho việc «${[...o].join(" / ")}» nhưng nút này chưa khai. Làm một trong ba: sửa nút về tên khác; khai nút vào bảng (một việc có hai lối vào thì thêm nơi đặt); hoặc nếu chữ này đủ rõ nhờ tiêu đề hộp cạnh nút thì thêm vào chữ dùng chung kèm lý do.`);
    }
  }
  return loi;
}

/**
 * Mỗi tên nằm ở hơn một hàng việc phải được xếp loại: chữ dùng chung, cùng một việc, hoặc chờ chủ (đặc tả mục «Chữ dùng chung»).
 * Đây là chỗ canh lỗi gốc «một tên chỉ nhiều việc»; dòng xếp thừa cũng đỏ để danh sách không cũ đi.
 */
export function kiemTenNhieuHang(viec, chuDungChung, tenNhieuHang, nut) {
  const chung = new Set(chuDungChung.map((c) => chuanNhan(c.chu)));
  const daXep = new Set(tenNhieuHang.map((t) => chuanNhan(t.chu)));
  const theoViTri = new Map();
  for (const n of nut) {
    const k = khoaViTri(n.tep, khoaNut(n));
    if (!theoViTri.has(k)) theoViTri.set(k, []);
    theoViTri.get(k).push(n);
  }
  const ten = new Map();
  for (const v of viec) {
    for (const d of v.noiDat) {
      for (const n of theoViTri.get(khoaViTri(d.tep, d.chu)) ?? []) {
        for (const t of tenCuaNut(n)) {
          if (!ten.has(t)) ten.set(t, new Set());
          ten.get(t).add(v);
        }
      }
    }
  }
  const loi = [];
  for (const [t, hang] of ten) {
    if (hang.size < 2 || chung.has(t) || daXep.has(t)) continue;
    const ds = [...hang].slice(0, 3).map((v) => `«${cat(v.ten, 40)}»`).join(", ");
    loi.push(`Tên «${t}» nằm ở ${hang.size} hàng việc (${ds}) mà chưa xếp loại. Thấy đối tượng ngay cạnh nút thì thêm vào CHU_DUNG_CHUNG; cùng một việc nhiều lối vào thì thêm vào TEN_NHIEU_HANG loại cung-viec; khác việc mà không thấy đối tượng thì thêm loại cho-chu và trình chủ, không tự đặt tên.`);
  }
  for (const t of daXep) {
    if ((ten.get(t)?.size ?? 0) < 2) loi.push(`TEN_NHIEU_HANG còn «${t}» nhưng tên này không còn ở nhiều hàng việc; bỏ dòng đó.`);
  }
  return loi;
}

/** Điều 3: nút dò thấy ghi, nguy hiểm hoặc nút chính phải có dòng trong bảng hoặc trong danh sách bỏ qua. */
export function kiemUngVien(viec, boQua, nut) {
  const daKhai = new Set([...viec.flatMap((v) => v.noiDat), ...boQua].map((d) => khoaViTri(d.tep, d.chu)));
  const loi = [];
  const daBao = new Set();
  for (const n of nut) {
    if (!(n.lyDo ?? []).some((x) => x === "ghi" || x === "nguy hiểm" || x === "nút chính")) continue;
    const k = khoaViTri(n.tep, khoaNut(n));
    if (daKhai.has(k) || daBao.has(k)) continue;
    daBao.add(k);
    loi.push(`${n.tep}:${n.dong} nút «${khoaNut(n)}» (dấu hiệu: ${n.lyDo.join(", ")}) chưa có trong bảng. Khai một việc (trạng thái «cho-chon» nếu chưa có tên chốt), hoặc thêm vào danh sách bỏ qua kèm lý do nếu máy coi nhầm.`);
  }
  return loi;
}

/** Điều 4: đường lệnh và mã nhật ký đã khai phải còn có trong mã. */
export function kiemDuong(viec, duong, maHopLe) {
  const d = new Set(mangHoa(duong));
  const m = new Set(mangHoa(maHopLe));
  const loi = [];
  for (const v of viec) {
    for (const x of v.duongLenh) if (!d.has(x)) loi.push(`việc «${v.ten}»: đường lệnh «${x}» không còn route nào trong mã. Sửa hoặc bỏ khỏi bảng.`);
    for (const x of v.maNhatKy) if (!m.has(x)) loi.push(`việc «${v.ten}»: mã nhật ký «${x}» không có trong audit-actions. Sửa hoặc bỏ khỏi bảng.`);
  }
  return loi;
}

/** Điều 5: tên Hướng dẫn gọi bằng [[tên]] phải có thật và không phải chữ đã loại. */
export function kiemHuongDan(ten, nut, toanChu, tuDaLoai) {
  const nhanNut = new Set();
  for (const n of nut) for (const x of [...(n.nhan ?? []), ...(n.doiChu ?? []), n.aria ?? ""]) if (x) nhanNut.add(chuanNhan(x));
  const loi = [];
  for (const { ten: t, noi } of ten) {
    const bi = tuDaLoai.find((x) => x.cam.test(t));
    if (bi) {
      loi.push(`${noi}: Hướng dẫn gọi [[${t}]] là chữ đã loại; dùng «${bi.thay}».`);
      continue;
    }
    const c = chuanNhan(t);
    if (nhanNut.has(c) || toanChu.includes(c)) continue;
    loi.push(`${noi}: Hướng dẫn gọi [[${t}]] nhưng không nút nào và không chữ nào trong giao diện mang tên đó. Sửa Hướng dẫn cho đúng tên đang hiện.`);
  }
  return loi;
}

function biBat(chu, tuDaLoai, camTheoTep) {
  const bo = chu.replace(NGHIA_HON_DAO, "");
  const a = tuDaLoai.find((t) => t.cam.test(t.cam.source.includes("Đđ]ảo") ? bo : chu));
  if (a) return a;
  return camTheoTep.find((t) => t.cam.test(chu)) ?? null;
}
const biBatToanCuc = (chu, tuDaLoai) => {
  const bo = chu.replace(NGHIA_HON_DAO, "");
  return tuDaLoai.find((t) => t.cam.test(t.cam.source.includes("Đđ]ảo") ? bo : chu)) ?? null;
};

/** Khái niệm: đã chốt phải có giải nghĩa, ngày chủ chọn; chữ đã loại phải bị dòng cấm bắt; tên chuẩn không được là chữ đã loại. */
export function kiemKhaiNiem(khaiNiem, tuDaLoai, camTheoTep) {
  const loi = [];
  for (const k of khaiNiem) {
    if (k.trangThai === "da-chot") {
      if (!k.giaiNghia || !k.giaiNghia.trim()) loi.push(`khái niệm «${k.ten}» đã chốt mà thiếu giải nghĩa.`);
      if (!/20\d\d-\d\d-\d\d/.test(k.chuChon ?? "")) loi.push(`khái niệm «${k.ten}» đã chốt mà thiếu ngày chủ chọn (dạng 2026-10-18); chưa có ngày thì để «cho-chon».`);
    }
    for (const c of k.chuDaLoai) if (!biBat(c, tuDaLoai, camTheoTep)) loi.push(`khái niệm «${k.ten}»: chữ đã loại «${c}» không bị dòng cấm nào của bảng từ bắt. Thêm dòng cấm ở bang-tu-giao-dien.ts (khi chủ đã chọn) hoặc bỏ chữ khỏi bảng.`);
    const bi = biBatToanCuc(k.ten, tuDaLoai);
    if (bi) loi.push(`khái niệm «${k.ten}»: tên chuẩn lại là chữ đã loại ${bi.cam}; tên chuẩn phải là «${bi.thay}».`);
  }
  return loi;
}

/** Tên việc và chữ khai ở nơi đặt không được là chữ đã loại (toàn cục hoặc theo tệp). */
export function kiemKhongDungChuLoai(viec, tuDaLoai, camTheoTep) {
  const loi = [];
  for (const v of viec) {
    const bi = biBatToanCuc(v.ten, tuDaLoai);
    if (bi) loi.push(`việc «${v.ten}»: tên việc là chữ đã loại ${bi.cam}; dùng «${bi.thay}».`);
    for (const d of v.noiDat) {
      const b2 = biBatToanCuc(d.chu, tuDaLoai) ?? camTheoTep.find((t) => t.tep.some((m) => m.test(d.tep)) && t.cam.test(d.chu));
      if (b2) loi.push(`${d.tep}: việc «${v.ten}» khai nút «${d.chu}» là chữ đã loại ${b2.cam}; dùng «${b2.thay}».`);
    }
  }
  return loi;
}

const o = (s) => String(s ?? "").replace(/\|/g, "\\|").replace(/\s*\n\s*/g, " ").trim();
const nhatKy = (v) => [...v.duongLenh.map((x) => `\`${x}\``), ...v.maNhatKy.map((x) => `nhật ký \`${x}\``)].join("<br>") || "(chưa nối)";
const noiDatChu = (v) => v.noiDat.map((d) => `\`${d.tep}\`: ${o(d.chu)}`).join("<br>");
const nhanTrangThai = (t) => (t === "da-chot" ? "đã chốt" : "chờ chọn");

/** Điều 6: bản đọc cho người. Cùng đầu vào cho cùng chuỗi. */
export function renderBangThamChieu({ khaiNiem, chuDungChung, tenNhieuHang = [], viec, boQua }) {
  const ra = [];
  ra.push("# Bảng tham chiếu ngôn ngữ", "");
  ra.push("> Do máy sinh, đừng sửa tay; sửa ở `src/shared/bang-tham-chieu*.ts` rồi chạy `npm run tham-chieu`. Quyết định: `docs/adr/ADR-0167-bang-tham-chieu-ngon-ngu.md`.", "");
  ra.push("Mỗi khái niệm một tên, mỗi tên một nghĩa, tra từ một nguồn. Viết hay sửa chữ giao diện thì tra ở đây trước; chưa có thì đưa 2 đến 3 tên cho chủ chọn, không tự đặt. Chữ đã loại nằm ở `src/shared/bang-tu-giao-dien.ts`.", "");
  ra.push("**Giới hạn phải nói thẳng.** Máy kiểm tên có nhất quán, không kiểm tên có đúng sự thật: cột «Thật sự làm gì» dựa vào người đọc mã. Hai nút cùng chữ trong một tệp tính là một nơi đặt. Nút có chữ ghép từ mã (đánh dấu ‹…› hoặc ⟪…⟫) thì khi đổi tên biến, khoá đổi theo: máy báo đỏ, người đọc tay rồi sửa bảng. Lời Nền tảng trả lời người dùng trong trò chuyện thì máy không canh được.", "");
  ra.push("## Khái niệm", "");
  ra.push("| Tên chuẩn | Nghĩa | Khác với | Chữ đã loại | Mã nội bộ | Trạng thái | Chủ chọn |", "|---|---|---|---|---|---|---|");
  for (const k of khaiNiem) ra.push(`| **${o(k.ten)}** | ${o(k.giaiNghia)} | ${o(k.khacVoi)} | ${k.chuDaLoai.map(o).join("; ")} | ${k.maNoiBo.map((x) => `\`${o(x)}\``).join(" ")} | ${nhanTrangThai(k.trangThai)} | ${o(k.chuChon)} |`);
  ra.push("", "## Chữ dùng chung", "", "Chữ theo ngữ cảnh: người đọc thấy đối tượng ngay cạnh nút, trong tiêu đề hộp hoặc dòng đang xem.", "", "| Chữ | Vì sao đủ rõ |", "|---|---|");
  for (const c of chuDungChung) ra.push(`| ${o(c.chu)} | ${o(c.vi)} |`);
  ra.push("", "## Tên dùng ở nhiều hàng việc", "", "Cùng một việc có nhiều lối vào, hoặc khác việc và đang chờ chủ chọn tên. Tên mới rơi vào diện này mà chưa xếp thì máy báo đỏ.", "", "| Tên | Loại | Vì sao |", "|---|---|---|");
  for (const t of tenNhieuHang) ra.push(`| ${o(t.chu)} | ${t.loai === "cho-chu" ? "chờ chủ" : "cùng một việc"} | ${o(t.vi)} |`);
  const cho = viec.filter((v) => v.trangThai === "cho-chon");
  ra.push("", `## Việc chờ chọn (${cho.length})`, "", "Chữ ĐANG HIỆN là tên hiện hành; máy vẫn canh chữ đó. Khi chủ chọn tên mới thì sửa bảng và nút trong cùng một lần lưu.", "", "| Việc | Chữ đang hiện | Nhóm | Ghi chú |", "|---|---|---|---|");
  for (const v of cho) ra.push(`| ${o(v.ten)} | ${noiDatChu(v)} | ${o(v.nhom)} | ${o(v.nguonTen)} |`);
  ra.push("", `## Việc quan trọng (${viec.length})`, "");
  const nhom = [];
  for (const v of viec) if (!nhom.includes(v.nhom)) nhom.push(v.nhom);
  for (const g of nhom) {
    ra.push(`### ${o(g)}`, "", "| Tên | Màn hình | Thật sự làm gì | Hỏi lại | Hoàn tác | Đường lệnh, nhật ký | Nơi đặt nút | Trạng thái |", "|---|---|---|---|---|---|---|---|");
    for (const v of viec.filter((x) => x.nhom === g)) ra.push(`| **${o(v.ten)}** | ${o(v.manHinh)} | ${o(v.thatSuLam)} | ${o(v.hoiLai)} | ${o(v.hoanTac)} | ${nhatKy(v)} | ${noiDatChu(v)} | ${nhanTrangThai(v.trangThai)} (${o(v.nguonTen)}) |`);
    ra.push("");
  }
  ra.push(`## Mục bỏ qua (${boQua.length})`, "", "Nút máy dò là ghi dữ liệu hay nút chính nhưng thực ra không phải; mỗi mục có lý do.", "", "| Tệp | Nút | Lý do |", "|---|---|---|");
  for (const b of boQua) ra.push(`| \`${b.tep}\` | ${o(b.chu)} | ${o(b.lyDo)} |`);
  ra.push("");
  return ra.join("\n");
}
