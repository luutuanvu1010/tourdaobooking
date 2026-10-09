// BÀI ĐỐI CHIẾU BẢNG SỰ KIỆN VẬN CHUYỂN ↔ MÃ (việc 6b, 2026-10-09; bảng: src/shared/bang-su-kien-van-chuyen.ts — ĐỀ XUẤT, chưa vào sổ hàng rào).
//
// Bảng ghi điều MÃ đang làm; bài đối chiếu HAI CHIỀU những gì máy thấy được:
//   (a) phủ: mọi việc nhật ký nhóm chuyến (nhóm "trip" hoặc tên `trip_*`), mọi `LOAI_SU_KIEN_CHUYEN`, mọi phần tử `HANH_DONG_TIN_*`, mọi hàm xuất của
//       dieu-phoi.ts đều có dòng (hoặc mục ngoài phạm vi) — và ngược lại; dòng "chưa có mã" (A5) đỏ ngay khi tên của nó xuất hiện trong mã;
//   (b) người nhận tin: gọi hàm thuần thật (`tinChuyenCho`, `tinGioHenCho`) với người mẫu × tình huống khả thi của dòng, so với cột tin của bảng; cổng gõ cửa
//       (`dongCoTheSinhTin`) phải mở khi có người nhận; loại Bảng tin khớp `thayDoiCuaHanhDongChuyen`;
//   (c) ô quyền của từng route khớp `MATRIX`;
//   (d) quét tĩnh route của van-chuyen / dispatch / orders: route ghi phải có dòng hoặc mục ngoài phạm vi; thân route hỏi đúng ô, gọi đúng hàm, có / không hỏi
//       lớp vượt, có / không báo tin đúng như bảng; hàm dựng lô ghi đúng việc nhật ký và loại sự kiện;
//   (e) quy tắc chung QT1–QT3 (bảng): mọi chỗ vi phạm phải có mục ở `CHO_LECH`, mục không còn vi phạm → đỏ; dấu hiệu của mục lệch hết đúng → đỏ (đã sửa?).
// KHÔNG kiểm (dựa vào kỷ luật): cột "bảng bị ghi", cột "luật", cột việc nhật ký phía ĐƠN (`nhatKyDon` — chỉ kiểm tên có trong audit-actions); lệnh mới viết mà không qua route có tên / không ghi việc nhật ký nhóm chuyến; chữ ADR (bài không
// đọc ADR — chỗ lệch ADR do người khai vào CHO_LECH).
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { maskSource } from "../scripts/source-mask-lib.mjs";
import { AUDIT_ACTIONS, isAuditAction } from "./shared/audit-actions.ts";
import { LOAI_SU_KIEN_CHUYEN } from "./shared/dieu-phoi-kieu.ts";
import { MATRIX, PERMISSION_CODES, type OperationCode, type PermissionCode, type Scope } from "./shared/permissions.ts";
import {
  HANH_DONG_TIN_CHUYEN, HANH_DONG_TIN_GIO_HEN, HANH_DONG_TIN_KHACH, HANH_DONG_TIN_THUONG, dongCoTheSinhTin, dungDongChuyen, thayDoiCuaHanhDongChuyen, tinChuyenCho,
  tinGioHenCho, type ChuyenChoTin, type NguoiNhanChuyen,
} from "./shared/tin-chuyen.ts";
import {
  BANG_SU_KIEN_VAN_CHUYEN as BANG, CHO_LECH, NGOAI_PHAM_VI_NHAT_KY, NGOAI_PHAM_VI_ROUTE, NGUOI_MAU, type DongSuKien, type MaQuyTac, type NguoiMau, type Tin,
} from "./shared/bang-su-kien-van-chuyen.ts";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const doc = (rel: string) => readFileSync(join(ROOT, rel), "utf8");
const CO_MA = BANG.filter((d) => d.trangThai === "co_ma");
const CHUA_CO_MA = BANG.filter((d) => d.trangThai === "chua_co_ma");
const khoaRoute = (r: { phuongThuc: string; duongDan: string }) => `${r.phuongThuc} ${r.duongDan}`;
const tapKhac = (a: Iterable<string>, b: Iterable<string>) => {
  const sb = new Set(b);
  return [...new Set(a)].filter((x) => !sb.has(x)).sort();
};

// ---- (a) Phủ hai chiều ------------------------------------------------------------------------------------------------------------------------------------
test("bảng: id dòng, route không trùng; đủ số dòng (chống bài rỗng); mục lệch trỏ dòng có thật", () => {
  assert.equal(new Set(BANG.map((d) => d.id)).size, BANG.length, "id dòng trùng");
  const keys = BANG.flatMap((d) => d.routes.map(khoaRoute));
  assert.equal(new Set(keys).size, keys.length, "một route ở hai dòng");
  assert.ok(CO_MA.length >= 30, `chỉ ${CO_MA.length} dòng có mã — bảng bị cắt?`);
  const ids = new Set(BANG.map((d) => d.id));
  assert.equal(new Set(CHO_LECH.map((l) => l.id)).size, CHO_LECH.length, "mã mục lệch trùng");
  for (const l of CHO_LECH) for (const id of l.dong) assert.ok(ids.has(id), `CHO_LECH ${l.id} trỏ dòng lạ ${id}`);
});

test("(a) mọi việc nhật ký nhóm chuyến có dòng hoặc mục ngoài phạm vi — và ngược lại", () => {
  const nhomChuyen = Object.entries(AUDIT_ACTIONS).filter(([k, v]) => v.group === "trip" || k.startsWith("trip_")).map(([k]) => k);
  const trongBang = CO_MA.flatMap((d) => [d.nhatKy, ...(d.nhatKyDon ?? [])]).filter((x): x is string => x !== null);
  const ngoai = Object.keys(NGOAI_PHAM_VI_NHAT_KY);
  assert.deepEqual(tapKhac(nhomChuyen, [...trongBang, ...ngoai]), [], "việc nhật ký nhóm chuyến CHƯA có dòng trong bảng (khai dòng, hoặc mục ngoài phạm vi kèm lý do)");
  for (const a of [...trongBang, ...ngoai]) assert.ok(isAuditAction(a), `bảng ghi việc nhật ký không có trong audit-actions: ${a}`);
  assert.deepEqual(tapKhac(ngoai, nhomChuyen), [], "mục ngoài phạm vi không thuộc nhóm chuyến");
  assert.deepEqual(trongBang.filter((a) => ngoai.includes(a)), [], "việc vừa ở bảng vừa ở ngoài phạm vi");
});

test("(a) loại sự kiện chuyến: tập của bảng = LOAI_SU_KIEN_CHUYEN", () => {
  const trongBang = CO_MA.map((d) => d.suKien).filter((x): x is string => x !== null);
  assert.deepEqual(tapKhac(LOAI_SU_KIEN_CHUYEN, trongBang), [], "loại sự kiện có trong mã nhưng chưa có dòng");
  assert.deepEqual(tapKhac(trongBang, LOAI_SU_KIEN_CHUYEN), [], "bảng ghi loại sự kiện mã không có");
});

test("(a) dòng CHƯA CÓ MÃ: tên việc nhật ký / loại sự kiện chưa xuất hiện trong mã (xuất hiện → chuyển dòng sang co_ma, khai đủ route, ô, tin)", () => {
  for (const d of CHUA_CO_MA) {
    assert.ok(d.nhatKy === null || !Object.hasOwn(AUDIT_ACTIONS, d.nhatKy), `${d.id}: mã đã có việc nhật ký ${d.nhatKy} — chuyển dòng sang co_ma`);
    assert.ok(d.suKien === null || !(LOAI_SU_KIEN_CHUYEN as readonly string[]).includes(d.suKien), `${d.id}: mã đã có loại sự kiện ${d.suKien} — chuyển dòng sang co_ma`);
    assert.ok(d.nhatKy === null || !(HANH_DONG_TIN_CHUYEN as readonly string[]).includes(d.nhatKy), `${d.id}: danh sách tin đã có ${d.nhatKy}`);
  }
});

test("(a) nhóm tin của từng dòng khớp HANH_DONG_TIN_KHACH / _THUONG / _GIO_HEN — và mọi phần tử của ba danh sách có dòng", () => {
  const coTin: string[] = [];
  for (const d of CO_MA) {
    const a = d.nhatKy;
    if (a !== null) {
      assert.equal(d.tin?.nhom === "khach", (HANH_DONG_TIN_KHACH as readonly string[]).includes(a), `${d.id}: nhóm "khach" lệch HANH_DONG_TIN_KHACH`);
      assert.equal(d.tin?.nhom === "thuong", HANH_DONG_TIN_THUONG.includes(a), `${d.id}: nhóm "thuong" lệch HANH_DONG_TIN_THUONG`);
      if (d.tin) coTin.push(a);
    } else assert.equal(d.tin, null, `${d.id}: không có việc nhật ký chuyến mà khai tin chuyến`);
    const gioHen = (d.nhatKyDon ?? []).some((x) => (HANH_DONG_TIN_GIO_HEN as readonly string[]).includes(x));
    assert.equal(d.tinDon?.nhom === "gio_hen", gioHen, `${d.id}: tin giờ hẹn (MQ-07) lệch HANH_DONG_TIN_GIO_HEN`);
  }
  assert.deepEqual(tapKhac(HANH_DONG_TIN_CHUYEN, coTin), [], "hành động sinh tin chưa có dòng khai tin");
  const donCoTin = CO_MA.filter((d) => d.tinDon).flatMap((d) => d.nhatKyDon ?? []);
  assert.deepEqual(tapKhac(HANH_DONG_TIN_GIO_HEN, donCoTin), [], "hành động tin giờ hẹn chưa có dòng");
});

test("(a) Bảng tin: loại thay đổi khớp thayDoiCuaHanhDongChuyen; dòng không báo thì không có loại", () => {
  for (const d of CO_MA) {
    assert.equal(d.bangTin === null, d.bao === "khong", `${d.id}: cột Bảng tin lệch cột "báo"`);
    if (d.bangTin === null || d.nhatKy === null) continue;
    assert.equal(thayDoiCuaHanhDongChuyen(d.nhatKy, false), d.bangTin, `${d.id}: Bảng tin (chưa chạy)`);
    assert.equal(thayDoiCuaHanhDongChuyen(d.nhatKy, true), d.bangTinXeChay ?? d.bangTin, `${d.id}: Bảng tin (xe đang chạy)`);
  }
});

// ---- (b) Người nhận tin: hàm thật × người mẫu × tình huống -------------------------------------------------------------------------------------------
const LUC = "2027-03-11T05:00:00.000Z";
const TRUOC = "2027-03-11T01:00:00.000Z";
const nguoi = (id: string, permissions: PermissionCode[], partyId: string | null = null): NguoiNhanChuyen => ({ id, permissions, partyId });
const NGUOI: Readonly<Record<NguoiMau, NguoiNhanChuyen>> = {
  TX_DANG_LAI: nguoi("s-tx1", ["DRIVER"], "p-tx1"), TX_VUA_XEP: nguoi("s-tx2", ["DRIVER"], "p-tx2"), TX_VUA_GO: nguoi("s-tx3", ["DRIVER"], "p-tx3"),
  TX_NGUON: nguoi("s-tx4", ["DRIVER"], "p-tx4"), TX_KHAC: nguoi("s-tx5", ["DRIVER"], "p-tx5"),
  BAN_HANG: nguoi("s-bh", ["SALES"]), BAN_HANG_LAP_DON: nguoi("s-lap", ["SALES"]), KE_TOAN: nguoi("s-kt", ["ACCOUNTING"]), QUAN_TRI: nguoi("s-qt", ["ADMIN"]),
  TOAN_QUYEN: nguoi("s-tq", ["SUPER_ADMIN"]), HDV_PHU_TRACH: nguoi("s-hdv", ["FIELD"]), NGUOI_LAM: nguoi("s-lam", ["SALES"]),
};
const LAI_DICH = [{ partyId: "p-tx1", tu: TRUOC, den: null }, { partyId: "p-tx2", tu: LUC, den: null }, { partyId: "p-tx3", tu: TRUOC, den: LUC }];
const LAI_NGUON = [{ partyId: "p-tx4", tu: TRUOC, den: null }];
const DON = { orderId: "o-1", maDon: "DH-0001", ownerId: NGUOI.BAN_HANG_LAP_DON.id, handlerStaffId: NGUOI.HDV_PHU_TRACH.id };

interface TinhHuong { chay: boolean; boQua: boolean }
const tinhHuong = (d: DongSuKien): TinhHuong[] =>
  d.trangThaiChuyen.flatMap((t) => (d.vuot.length > 0 ? [false, true] : [false]).map((boQua) => ({ chay: t === "RUNNING", boQua })));
const tenTH = (t: TinhHuong) => `${t.chay ? "xe đang chạy" : "chưa chạy"}, ${t.boQua ? "có bỏ qua luật" : "không bỏ qua luật"}`;

/** Dòng nhật ký chuyến dựng qua `dungDongChuyen` (đúng đường gốc lắp ráp ghép dữ kiện). */
function dongMau(d: DongSuKien, t: TinhHuong) {
  const id = "ev-1";
  const f: ChuyenChoTin = {
    chuyen: [
      { tripId: "t-dich", ma: "CX-1103-01", ngayChay: "2027-03-11", lai: LAI_DICH, xuatBen: t.chay ? TRUOC : null },
      { tripId: "t-nguon", ma: "CX-1103-02", ngayChay: "2027-03-11", lai: LAI_NGUON, xuatBen: null },
    ],
    vang: [{ suKienId: id, orderId: DON.orderId }],
    khanCap: t.boQua ? [id] : [], vuotMoc: t.boQua ? [id] : [],
    khanCapNguon: t.boQua && d.suKienCoChuyenNguon ? [{ suKienId: id, tripId: "t-nguon" }] : [],
  };
  const r = dungDongChuyen([{ id, tripId: "t-dich", actorId: NGUOI.NGUOI_LAM.id, action: d.nhatKy!, luc: LUC }], f, [DON]);
  assert.equal(r.length, 1);
  return r[0]!;
}
const kyVong = (tin: Tin | null | undefined, p: NguoiMau, t: TinhHuong): string | null =>
  tin?.nhan.find((n) => n.ai.includes(p) && (n.khi === undefined || (n.khi === "xe_dang_chay" ? t.chay : t.boQua)))?.loai ?? null;
const thatChuyen = (d: DongSuKien, p: NguoiMau, t: TinhHuong): string | null => (d.nhatKy === null ? null : (tinChuyenCho(NGUOI[p], dongMau(d, t))?.loai ?? null));
function thatGioHen(p: NguoiMau): string | null {
  const r = tinGioHenCho(NGUOI[p], {
    actorId: NGUOI.NGUOI_LAM.id, luc: LUC, maDon: DON.maDon, ownerId: DON.ownerId, handlerStaffId: DON.handlerStaffId,
    chuyen: [{ tripId: "t-dich", ma: "CX-1103-01", ngayChay: "2027-03-11", lai: LAI_DICH }],
  });
  return r === null ? null : r.lienKet.startsWith("/cuoc-chuyen") ? "gio_hen_tai_xe" : "gio_hen_goi_bao";
}

test("(b) người nhận tin của từng dòng = hàm thuần thật (mọi người mẫu × mọi tình huống khả thi)", () => {
  const lech: string[] = [];
  for (const d of CO_MA) {
    for (const t of tinhHuong(d)) {
      for (const p of NGUOI_MAU) {
        const ky = kyVong(d.tin, p, t);
        const that = thatChuyen(d, p, t);
        if (ky !== that) lech.push(`${d.id} [${tenTH(t)}] ${p}: bảng ${ky ?? "không"} — mã ${that ?? "không"}`);
      }
      if (d.nhatKy !== null && NGUOI_MAU.some((p) => thatChuyen(d, p, t) !== null)) {
        assert.ok(dongCoTheSinhTin({ action: d.nhatKy, khanCap: t.boQua }), `${d.id} [${tenTH(t)}]: có người nhận mà cổng gõ cửa (dongCoTheSinhTin) đóng — hai luật lệch`);
      }
    }
    if (d.tinDon) {
      for (const p of NGUOI_MAU) {
        const ky = kyVong(d.tinDon, p, { chay: false, boQua: false });
        const that = thatGioHen(p);
        if (ky !== that) lech.push(`${d.id} [giờ hẹn] ${p}: bảng ${ky ?? "không"} — mã ${that ?? "không"}`);
      }
    }
  }
  assert.deepEqual(lech, [], "người nhận tin ở bảng lệch hàm tin thật");
});

// ---- (c) Ô quyền = ma trận ----------------------------------------------------------------------------------------------------------------------------------
test("(c) ai bấm được (ô quyền của từng route) khớp MATRIX", () => {
  for (const d of CO_MA) {
    for (const r of d.routes) {
      const hang = (MATRIX as Record<string, Partial<Record<PermissionCode, Scope>> | undefined>)[r.o];
      assert.ok(hang, `${d.id}: ô ${r.o} không có trong MATRIX`);
      const ky: Partial<Record<PermissionCode, Scope>> = {};
      if (r.ngucanh === "MATRIX_TRUC_TIEP") {
        // Route HDV sửa số khách: chỉ cột có ô ĐÚNG "assigned" (đang phụ trách) + Toàn quyền (ADR-0014 điều 2) — không dùng can() trần.
        for (const p of PERMISSION_CODES) if (hang![p] === "assigned") ky[p] = "assigned";
        ky.SUPER_ADMIN = "any";
      } else for (const p of PERMISSION_CODES) if (hang![p] && hang![p] !== "none") ky[p] = hang![p];
      assert.deepEqual(r.ai, ky, `${d.id} ${khoaRoute(r)}: ai bấm được (ô ${r.o}) lệch MATRIX`);
    }
  }
});

// ---- (d) Quét tĩnh route và hàm dựng lô -------------------------------------------------------------------------------------------------------------------
const TEP_ROUTE = ["src/modules/van-chuyen/index.ts", "src/modules/dispatch/index.ts", "src/modules/orders/index.ts"] as const;
interface RouteMa { tep: string; khoa: string; cong: string; than: string }
/** Mọi khai báo route của một tệp; `than` = thân `{…}` đã che CHÚ THÍCH (giữ chuỗi để tìm tên ô, tên việc). */
function routeCua(tep: string): RouteMa[] {
  const goc = doc(tep);
  const che = maskSource(goc);
  const cheChuThich = maskSource(goc, { strings: false });
  const out: RouteMa[] = [];
  for (const m of che.matchAll(/\broute\(/g)) {
    const pos = m.index!;
    const h = /^route\(\s*"(GET|POST|PUT|PATCH|DELETE)",\s*"([^"]+)",\s*"(\w+)"/.exec(goc.slice(pos, pos + 300));
    assert.ok(h, `${tep}: route( ở vị trí ${pos} không khớp khuôn route("METHOD", "path", "cổng", …)`);
    const open = che.indexOf("{", che.indexOf("=>", pos + h![0].length));
    let depth = 0;
    let i = open;
    for (; i < che.length; i++) {
      if (che[i] === "{") depth++;
      else if (che[i] === "}" && --depth === 0) break;
    }
    assert.equal(depth, 0, `${tep} ${h![1]} ${h![2]}: ngoặc nhọn không cân`);
    out.push({ tep, khoa: `${h![1]} ${h![2]}`, cong: h![3]!, than: cheChuThich.slice(open, i + 1) });
  }
  return out;
}
const ROUTES = TEP_ROUTE.flatMap(routeCua);
const GHI = /^(POST|PUT|PATCH|DELETE) /;

test("(d) route ghi của van-chuyen / dispatch có dòng hoặc mục ngoài phạm vi; route đơn gọi máy đồng bộ phải có dòng", () => {
  const trongBang = new Set(BANG.flatMap((d) => d.routes.map(khoaRoute)));
  const ngoai = new Set(Object.keys(NGOAI_PHAM_VI_ROUTE));
  const loi: string[] = [];
  for (const r of ROUTES) {
    if (!GHI.test(r.khoa)) continue;
    const coTin = /\bbaoThayDoiChuyen\s*\(|\bdongBoChuyen\s*\(/.test(r.than);
    if (r.tep.includes("/orders/")) {
      if (coTin && !trongBang.has(r.khoa)) loi.push(`${r.khoa}: gọi máy đồng bộ / báo chuyến mà chưa có dòng`);
      continue;
    }
    if (trongBang.has(r.khoa) === ngoai.has(r.khoa)) loi.push(`${r.khoa}: phải ở ĐÚNG MỘT trong hai — dòng của bảng / NGOAI_PHAM_VI_ROUTE`);
    if (ngoai.has(r.khoa) && coTin) loi.push(`${r.khoa}: ngoài phạm vi mà báo chuyến / gọi máy đồng bộ — đây là lệnh đổi chuyến, khai dòng`);
  }
  const coThat = new Set(ROUTES.map((r) => r.khoa));
  for (const k of ngoai) if (!coThat.has(k)) loi.push(`NGOAI_PHAM_VI_ROUTE trỏ route không có: ${k}`);
  assert.deepEqual(loi, []);
});

test("(d) thân route khớp dòng: cổng, ô hỏi, hàm xử lý, lớp vượt, báo tin / máy đồng bộ", () => {
  const theoKhoa = new Map(ROUTES.map((r) => [r.khoa, r]));
  const loi: string[] = [];
  for (const d of CO_MA) {
    for (const r of d.routes) {
      const m = theoKhoa.get(khoaRoute(r));
      if (!m) {
        loi.push(`${d.id}: route ${khoaRoute(r)} không có trong mã`);
        continue;
      }
      const t = m.than;
      const co = (s: string) => t.includes(s);
      if (m.cong !== r.cong) loi.push(`${d.id} ${m.khoa}: cổng mã "${m.cong}" — bảng "${r.cong}"`);
      const hoi = r.ngucanh === "khong" ? `can(staff, "${r.o}")` : r.ngucanh === "MATRIX_TRUC_TIEP" ? `MATRIX["${r.o}"]` : `can(staff, "${r.o}", {`;
      if (!co(hoi)) loi.push(`${d.id} ${m.khoa}: thân không có ${hoi}`);
      const dau = /\bcan\(staff, "([\w.]+)"/.exec(t)?.[1];
      if (r.ngucanh !== "MATRIX_TRUC_TIEP" && dau !== (r.oDau ?? r.o)) loi.push(`${d.id} ${m.khoa}: ô hỏi đầu thân là "${dau}" — bảng "${r.oDau ?? r.o}"`);
      if (!new RegExp(`\\b${r.ham}\\s*\\(`).test(t)) loi.push(`${d.id} ${m.khoa}: thân không gọi ${r.ham}(`);
      if (co(`"trip.urgent_adjust"`) !== d.vuot.length > 0) loi.push(`${d.id} ${m.khoa}: hỏi lớp vượt (trip.urgent_adjust) ${co(`"trip.urgent_adjust"`) ? "có" : "không"} — bảng vượt [${d.vuot}]`);
      const baoRoute = /\bbaoThayDoiChuyen\s*\(/.test(t);
      const may = /\bdongBoChuyen\s*\(/.test(t);
      if (baoRoute !== (d.bao === "route")) loi.push(`${d.id} ${m.khoa}: gọi baoThayDoiChuyen ${baoRoute ? "có" : "không"} — bảng "${d.bao}"`);
      if (may !== (d.bao === "may_dong_bo")) loi.push(`${d.id} ${m.khoa}: gọi dongBoChuyen ${may ? "có" : "không"} — bảng "${d.bao}"`);
    }
  }
  assert.deepEqual(loi, []);
});

const TEP_LO = "src/modules/van-chuyen/dieu-phoi.ts";
const LO_GOC = maskSource(doc(TEP_LO), { strings: false });
const thanHam = (src: string, ten: string): string | null => {
  const i = src.search(new RegExp(`(^|\\n)(export )?(async )?function ${ten}\\b`));
  if (i < 0) return null;
  const j = src.indexOf("\nexport ", i + 1);
  return src.slice(i, j < 0 ? undefined : j);
};

test("(d) hàm dựng lô: mọi hàm xuất của dieu-phoi.ts có dòng; lô ghi đúng việc nhật ký và loại sự kiện của dòng", () => {
  const xuat = [...LO_GOC.matchAll(/^export function (\w+)/gm)].map((m) => m[1]!);
  assert.ok(xuat.length >= 20, `chỉ thấy ${xuat.length} hàm xuất ở ${TEP_LO}`);
  const dung = CO_MA.map((d) => d.lo).filter((x): x is string => x !== null);
  assert.deepEqual(tapKhac(xuat, dung), [], "hàm dựng lô chưa có dòng (lệnh mới?)");
  assert.deepEqual(tapKhac(dung, xuat), [], "bảng trỏ hàm dựng lô không có");
  const loi: string[] = [];
  for (const d of CO_MA) {
    if (d.lo === null) continue;
    if (d.loKhoa) {
      const m = new RegExp(`\\b${d.loKhoa}: \\{[^}]*suKien: "(\\w+)", action: "(\\w+)"`).exec(LO_GOC);
      if (!m) loi.push(`${d.id}: không thấy ${d.loKhoa} trong LENH_SUAT`);
      else if (m[1] !== d.suKien || m[2] !== d.nhatKy) loi.push(`${d.id}: LENH_SUAT.${d.loKhoa} = ${m[1]} / ${m[2]} — bảng ${d.suKien} / ${d.nhatKy}`);
      continue;
    }
    const t = thanHam(LO_GOC, d.lo) ?? "";
    if (d.nhatKy && !t.includes(`"${d.nhatKy}"`)) loi.push(`${d.id}: ${d.lo} không ghi việc nhật ký ${d.nhatKy}`);
    if (d.suKien && !t.includes(`"${d.suKien}"`)) loi.push(`${d.id}: ${d.lo} không ghi sự kiện ${d.suKien}`);
  }
  assert.deepEqual(loi, []);
});

// ---- (e) Quy tắc chung và chỗ lệch ---------------------------------------------------------------------------------------------------------------------
interface ViPham { quyTac: MaQuyTac; dong: string; boQua: boolean; moTa: string }
function viPhamQuyTac(): ViPham[] {
  const out: ViPham[] = [];
  for (const d of CO_MA) {
    const coVanPhong = d.routes.some((r) => r.cong !== "staff") || d.loai === "may_dong_bo";
    const xetQT1 = ["ke_hoach", "may_dong_bo", "don_khong_dong_bo", "dieu_chinh"].includes(d.loai) || (d.loai === "tien_do" && coVanPhong);
    for (const t of tinhHuong(d)) {
      const nhan = thatChuyen(d, "TX_DANG_LAI", t) !== null || (d.tinDon !== undefined && thatGioHen("TX_DANG_LAI") !== null);
      if (xetQT1 && !nhan) out.push({ quyTac: "QT1", dong: d.id, boQua: t.boQua, moTa: `${d.id} [${tenTH(t)}]: tài xế đang lái không nhận tin` });
      if (t.boQua && !nhan) out.push({ quyTac: "QT2", dong: d.id, boQua: true, moTa: `${d.id} [${tenTH(t)}]: bỏ qua luật mà tài xế đang lái không nhận tin` });
    }
    if (d.loai === "tien_do") {
      const cong = d.routes.map((r) => r.cong).sort().join("+");
      const ham = new Set(d.routes.map((r) => r.ham));
      if (cong !== "office+staff" || ham.size !== 1) out.push({ quyTac: "QT3", dong: d.id, boQua: false, moTa: `${d.id}: tiến độ không có đủ cặp tài xế ↔ văn phòng cùng một hàm` });
    }
  }
  return out;
}

test("(e) quy tắc chung QT1–QT3: mọi vi phạm có mục ở CHO_LECH; mục nào không còn vi phạm → xoá", () => {
  const vp = viPhamQuyTac();
  const phu = (l: (typeof CHO_LECH)[number], v: ViPham) => l.quyTac === v.quyTac && l.dong.includes(v.dong) && (!l.chiKhiKhongBoQua || !v.boQua);
  assert.deepEqual(vp.filter((v) => !CHO_LECH.some((l) => phu(l, v))).map((v) => `${v.quyTac} ${v.moTa}`), [], "vi phạm quy tắc CHƯA khai ở CHO_LECH");
  const thua = CHO_LECH.filter((l) => l.quyTac && !vp.some((v) => phu(l, v))).map((l) => l.id);
  assert.deepEqual(thua, [], "mục CHO_LECH không còn vi phạm nào (đã sửa?) — xoá mục / sửa dòng");
  for (const l of CHO_LECH.filter((x) => x.quyTac)) {
    const dongCo = new Set(vp.filter((v) => phu(l, v)).map((v) => v.dong));
    assert.deepEqual(tapKhac(l.dong, dongCo), [], `${l.id}: dòng khai trong mục mà không vi phạm ${l.quyTac}`);
  }
});

test("(e) dấu hiệu của từng chỗ lệch vẫn đúng (hết đúng = có vẻ đã sửa → cập nhật CHO_LECH và dòng của bảng)", () => {
  for (const l of CHO_LECH) {
    const h = l.dauHieu;
    if (!h) continue;
    if (h.soLan !== undefined) {
      const tep = readdirSync(join(ROOT, h.tep)).filter((f) => f.endsWith(".ts") && !f.endsWith(".test.ts"));
      const dem = tep.reduce((n, f) => n + maskSource(doc(`${h.tep}/${f}`), { strings: false }).split(h.chua!).length - 1, 0);
      assert.equal(dem, h.soLan, `${l.id}: "${h.chua}" xuất hiện ${dem} lần ở ${h.tep} (khai ${h.soLan}) — chỗ lệch đã sửa? cập nhật CHO_LECH và dòng của bảng`);
      continue;
    }
    const src = maskSource(doc(h.tep), { strings: false });
    const vung = h.ham ? thanHam(src, h.ham) : src;
    assert.ok(vung !== null, `${l.id}: không thấy hàm ${h.ham} ở ${h.tep}`);
    if (h.chua !== undefined) assert.ok(vung!.includes(h.chua), `${l.id}: ${h.tep}${h.ham ? `:${h.ham}` : ""} không còn "${h.chua}" — chỗ lệch đã sửa?`);
    if (h.khongChua !== undefined) assert.ok(!vung!.includes(h.khongChua), `${l.id}: ${h.tep}${h.ham ? `:${h.ham}` : ""} đã có "${h.khongChua}" — chỗ lệch đã sửa?`);
  }
});

test("(e) ô quyền dự kiến của mục lệch tài xế đối tác còn đúng hiện trạng", () => {
  // TAI-XE-DOI-TAC: hết lệch khi A4 mở ô cho tài xế đối tác → bài đỏ, nhắc sửa mục + dòng.
  assert.equal((MATRIX as Record<OperationCode, Record<PermissionCode, Scope>>)["trip.passenger.add"].DRIVER_PARTNER, "none", "TAI-XE-DOI-TAC: ô đã mở — cập nhật CHO_LECH và dòng bo-sung-ten");
});
