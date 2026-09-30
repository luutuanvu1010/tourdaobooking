// LÕI THUẦN của bộ sinh kho (d) "cấu trúc app" cho trợ lý Hỗ trợ (ADR-0070 điều 1, 5). Không đọc tệp: phần đọc nằm ở scripts/sinh-so-do-trang.mjs.
// Nhận dữ liệu (module, cạnh phụ thuộc, bản đồ quyền, ô có máy chủ hỏi, bảng tên lời thường, sơ đồ trang) → trả các đoạn { tieuDe, quyen, noiDung }.
// Ném lỗi (câu tiếng Việt nêu đúng mã) khi: thiếu tên lời thường cho module / ô quyền, tên thừa, lý do phụ thuộc cho cạnh không có, bước luồng trỏ ô /
// trang / mục không còn, và khi chữ sinh ra vi phạm luật nội dung (`viPhamChu`) hoặc bộ lọc tên kỹ thuật (`viPhamKyThuat`) — không bao giờ âm thầm bỏ.

/** Đọc TĨNH khối `const ALLOWED_EDGES … = { … };` của src/architecture.test.ts (không import tệp test — import sẽ đăng ký và chạy bài của nó). */
export function docCanh(src) {
  const m = /const ALLOWED_EDGES[^=]*=\s*\{([\s\S]*?)\n\};/.exec(src);
  if (!m) throw new Error("Không đọc được ALLOWED_EDGES ở src/architecture.test.ts — bộ sinh cấu trúc app cần khối này (sửa scripts/tro-ly-cau-truc-lib.mjs nếu đổi cách viết).");
  const than = m[1].replace(/\/\/.*$/gm, "");
  const out = {};
  for (const d of than.matchAll(/(?:"([a-z-]+)"|([a-z]+))\s*:\s*\[([^\]]*)\]/g)) {
    out[d[1] ?? d[2]] = [...d[3].matchAll(/"([a-z-]+)"/g)].map((x) => x[1]);
  }
  if (Object.keys(out).length === 0) throw new Error("ALLOWED_EDGES đọc ra rỗng — sai cách đọc.");
  return out;
}

/**
 * Ô quyền có máy chủ hỏi: xuất hiện nguyên văn `"<ô>"` trên một dòng có `can(` hoặc `MATRIX[` của mã `src/modules` (ngoài *.test.ts, đã che chú thích) —
 * CÙNG cách đếm của src/permission-enforcement.test.ts. Ô chỉ có trên bảng (hoãn ở docs/quyen-hoan.json) không vào danh sách "làm được" (bài học 24/9).
 */
export function oDuocHoi(tep, ops, maskSource) {
  const out = new Set();
  for (const src of tep) {
    for (const line of maskSource(src, { strings: false, comments: true }).split("\n")) {
      if (!/\bcan\s*\(|\bMATRIX\[/.test(line)) continue;
      for (const op of ops) if (line.includes(`"${op}"`)) out.add(op);
    }
  }
  return out;
}

const PHAM_VI = {
  any: "",
  own: "phần của mình",
  assigned: "chỉ phần đang được giao cho mình",
  ownOrAssigned: "phần của mình hoặc đang được giao",
};

/** Tạo hàm kiểm chữ: vi phạm ⇒ ném lỗi nêu chỗ + luật + đoạn khớp. */
export function taoKiem(viPhamChu, viPhamKyThuat) {
  return (noi, s) => {
    const v = viPhamChu(s);
    if (v) throw new Error(`Chữ gửi trợ lý ở ${noi} vi phạm luật nội dung (${v.luat}): "${v.khop}" — sửa chữ này.`);
    const k = viPhamKyThuat(s);
    if (k) throw new Error(`Chữ gửi trợ lý ở ${noi} có ${k.luat}: "${k.khop}" — viết lại bằng lời thường (ADR-0070 điều 5).`);
    return s;
  };
}

const cau = (s) => (/[.!?]$/.test(s) ? s : `${s}.`);

/**
 * @param {{
 *   thuMucModule: string[], canh: Record<string, string[]>, maTran: Record<string, Record<string, string>>, duocHoi: Set<string>,
 *   maQuyen: string[], nhanQuyen: Record<string, string>,
 *   ten: { phanHe: Record<string, {ten: string, moTa: string}>, thaoTac: Record<string, {ten: string, moTa: string}>, lyDo: Record<string, string>, luong: any[] },
 *   trang: { duongDan: string, tieuDe: string, nhomMenu: string[], menu: string[], boCuc: { muc: string, nut: string[] }[] }[],
 *   kiem: (noi: string, s: string) => string,
 * }} vao
 * @returns {{ tieuDe: string, quyen: string[], noiDung: string }[]}
 */
export function dungCauTruc(vao) {
  const { thuMucModule, canh, maTran, duocHoi, maQuyen, nhanQuyen, ten, trang, kiem } = vao;
  const TEP_TEN = "src/shared/tro-ly-cau-truc-ten.ts";

  // ---- kiểm bảng tên (ADR-0070 điều 1: thiếu tên ⇒ đỏ)
  for (const m of thuMucModule) if (!(m in canh)) throw new Error(`Thư mục module "${m}" chưa khai ở ALLOWED_EDGES (src/architecture.test.ts).`);
  const nut = Object.keys(canh);
  for (const m of nut) if (!ten.phanHe[m]) throw new Error(`Thiếu tên lời thường cho phân hệ "${m}" — thêm { ten, moTa } vào TEN_PHAN_HE ở ${TEP_TEN}.`);
  for (const m of Object.keys(ten.phanHe)) if (!nut.includes(m)) throw new Error(`Tên lời thường thừa cho phân hệ "${m}" (không còn trong mã) — xoá khỏi TEN_PHAN_HE ở ${TEP_TEN}.`);
  const ops = Object.keys(maTran);
  for (const op of ops) if (!ten.thaoTac[op]) throw new Error(`Thiếu tên lời thường cho ô quyền "${op}" — thêm { ten, moTa } vào TEN_THAO_TAC ở ${TEP_TEN}.`);
  for (const op of Object.keys(ten.thaoTac)) if (!ops.includes(op)) throw new Error(`Tên lời thường thừa cho ô quyền "${op}" (không còn trong bản đồ quyền) — xoá khỏi TEN_THAO_TAC ở ${TEP_TEN}.`);
  for (const k of Object.keys(ten.lyDo)) {
    const [a, b] = k.split(">");
    if (!canh[a]?.includes(b)) throw new Error(`Lý do phụ thuộc "${k}" trỏ tới cạnh không có trong ALLOWED_EDGES — sửa LY_DO_PHU_THUOC ở ${TEP_TEN}.`);
  }
  for (const [ma, t] of Object.entries(ten.phanHe)) { kiem(`tên phân hệ "${ma}"`, t.ten); kiem(`mô tả phân hệ "${ma}"`, t.moTa); }
  for (const [ma, t] of Object.entries(ten.thaoTac)) { kiem(`tên ô "${ma}"`, t.ten); kiem(`mô tả ô "${ma}"`, t.moTa); }
  for (const [ma, s] of Object.entries(ten.lyDo)) kiem(`lý do phụ thuộc "${ma}"`, s);

  const tenPH = (m) => ten.phanHe[m].ten;
  const tenOp = (op) => ten.thaoTac[op].ten;
  const coPhamVi = (op, q) => {
    const s = maTran[op][q];
    if (!(s in PHAM_VI) && s !== "none") throw new Error(`Phạm vi lạ "${s}" ở ô "${op}" — thêm cách đọc vào PHAM_VI của scripts/tro-ly-cau-truc-lib.mjs.`);
    return s;
  };
  const viecCoPhamVi = (op, q) => {
    const pv = PHAM_VI[coPhamVi(op, q)];
    return pv ? `${tenOp(op)} (${pv})` : tenOp(op);
  };
  const aiLamDuoc = (op) => {
    const co = maQuyen.filter((q) => coPhamVi(op, q) !== "none").map((q) => (PHAM_VI[maTran[op][q]] ? `${nhanQuyen[q]} (${PHAM_VI[maTran[op][q]]})` : nhanQuyen[q]));
    const khong = maQuyen.filter((q) => maTran[op][q] === "none").map((q) => nhanQuyen[q]);
    return { co, khong };
  };
  const trangTheo = (duong) => trang.find((t) => t.duongDan === duong);
  const viTriTrang = (t) => {
    const menu = t.nhomMenu.length ? ` (menu ${t.nhomMenu.join(", ")} › ${t.menu[t.menu.length - 1] ?? t.tieuDe})` : t.menu.length ? ` (thanh tab: ${t.menu.join(", ")})` : " (mở từ trang khác)";
    return `trang "${t.tieuDe}"${menu}`;
  };

  const out = [];
  const them = (tieuDe, quyen, noiDung) => out.push({ tieuDe: kiem(`tiêu đề đoạn "${tieuDe}"`, tieuDe), quyen, noiDung: kiem(`đoạn "${tieuDe}"`, noiDung) });

  // ---- phân hệ (bỏ cạnh tới Nhật ký: gần như mọi phân hệ ghi nhật ký — lặp vô ích; mô tả Nhật ký đã nói chung)
  const LA_NHAT_KY = "audit";
  const phuThuoc = (m) => canh[m].filter((b) => b !== LA_NHAT_KY);
  const duocDuaVao = (m) => nut.filter((a) => a !== m && canh[a].includes(m));
  them(
    "Các phân hệ của app",
    [],
    `App chia thành ${nut.length} phân hệ, mỗi phân hệ lo một phần việc và chỉ nhờ phân hệ khác qua cửa đã định: ${nut.map((m) => tenPH(m)).join(", ")}. Người dùng thấy các phân hệ này qua menu và các trang; menu hiện theo quyền của tài khoản.`,
  );
  for (const m of nut) {
    const dong = [cau(`Phân hệ ${tenPH(m)}: ${ten.phanHe[m].moTa}`)];
    const pt = phuThuoc(m);
    if (pt.length) dong.push(`Dựa vào: ${pt.map((b) => (ten.lyDo[`${m}>${b}`] ? `${tenPH(b)} (${ten.lyDo[`${m}>${b}`]})` : tenPH(b))).join(", ")}.`);
    const dv = m === LA_NHAT_KY ? [] : duocDuaVao(m);
    if (dv.length) dong.push(`Được dựa vào bởi: ${dv.map(tenPH).join(", ")}.`);
    if (!pt.length && m !== LA_NHAT_KY) dong.push("Không dựa vào phân hệ nào khác.");
    them(`Phân hệ ${tenPH(m)}`, [], dong.join(" "));
  }

  // ---- luồng chính
  them("Luồng chính của một đơn", [], `Một đơn đi qua các bước theo thứ tự: ${ten.luong.map((b, i) => `${i + 1}. ${b.ten}`).join("; ")}. Mỗi bước có đoạn riêng giải thích ai làm, làm ở đâu và vì sao phải theo thứ tự này.`);
  ten.luong.forEach((b, i) => {
    for (const op of b.thaoTac) {
      if (!ops.includes(op)) throw new Error(`Bước luồng "${b.ten}" trỏ ô quyền "${op}" không còn trong bản đồ quyền — sửa LUONG_CHINH ở ${TEP_TEN}.`);
      if (!duocHoi.has(op)) throw new Error(`Bước luồng "${b.ten}" dùng ô "${op}" chưa có máy chủ hỏi — trợ lý không được hứa việc app chưa làm; sửa LUONG_CHINH ở ${TEP_TEN}.`);
    }
    const dong = [cau(b.moTa), `Vì sao: ${cau(b.viSao)}`];
    for (const op of b.thaoTac) dong.push(`Ai ${tenOp(op)}: ${aiLamDuoc(op).co.join(", ")}.`);
    if (b.trang) {
      const t = trangTheo(b.trang);
      if (!t) throw new Error(`Bước luồng "${b.ten}" trỏ trang "${b.trang}" không còn trong sơ đồ trang — sửa LUONG_CHINH ở ${TEP_TEN}.`);
      let viTri = `Làm ở ${viTriTrang(t)}`;
      if (b.muc) {
        const mc = t.boCuc.find((x) => x.muc === b.muc);
        if (!mc) throw new Error(`Bước luồng "${b.ten}" trỏ mục "${b.muc}" không còn trên trang "${t.tieuDe}" — sửa LUONG_CHINH ở ${TEP_TEN}.`);
        const truoc = t.boCuc[t.boCuc.indexOf(mc) - 1];
        viTri += `, ${mc.muc}${mc.nut.length ? ` — nút: ${mc.nut.join(", ")}` : ""}${truoc ? ` (nằm dưới mục ${truoc.muc})` : ""}`;
      }
      dong.push(cau(viTri));
    }
    for (const s of [b.ten, b.moTa, b.viSao]) kiem(`bước luồng "${b.ten}"`, s);
    them(`Luồng chính, bước ${i + 1}: ${b.ten}`, [], dong.join(" "));
  });

  // ---- vai (ô chưa có máy chủ hỏi không vào cả hai danh sách)
  const opHoi = ops.filter((op) => duocHoi.has(op));
  for (const q of maQuyen) {
    const co = opHoi.filter((op) => coPhamVi(op, q) !== "none").map((op) => viecCoPhamVi(op, q));
    const khong = opHoi.filter((op) => maTran[op][q] === "none").map(tenOp);
    them(
      `Vai ${nhanQuyen[q]} làm được gì`,
      [q],
      `Tài khoản có quyền ${nhanQuyen[q]} (một tài khoản có thể giữ vài quyền; làm được việc nếu ít nhất một quyền cho phép).\nLàm được: ${co.join("; ") || "không việc nào"}.\nKhông làm được: ${khong.join("; ") || "không có"}.\nKhông thấy một nút hay mục menu thường vì vai không có quyền việc đó; máy chủ luôn kiểm lại quyền.`,
    );
  }

  // ---- mỗi việc (ô quyền có máy chủ hỏi)
  for (const op of opHoi) {
    const { co, khong } = aiLamDuoc(op);
    them(`Việc: ${tenOp(op)}`, [], `${cau(ten.thaoTac[op].moTa)} Ai làm được: ${co.join(", ") || "không ai"}.${khong.length ? ` Không làm được: ${khong.join(", ")}.` : ""}`);
  }

  const trung = out.map((d) => d.tieuDe).filter((t, i, a) => a.indexOf(t) !== i);
  if (trung.length) throw new Error(`Tên đoạn cấu trúc trùng: ${[...new Set(trung)].join(", ")} — hai tên lời thường giống nhau trong bảng tên.`);
  return out;
}
