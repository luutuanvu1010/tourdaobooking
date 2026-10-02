// SỔ VÀNG CHI PHÍ XE THUÊ (Hiến chương 5.17; ADR-0057 C12 — kế hoạch Đợt 4 Task 6, tự chốt TC-3: tệp riêng vì src/so-vang.test.ts chỉ hiểu khuôn sổ công nợ).
// Hai lớp (khuôn golden/README.md "Hai lớp kiểm"):
//   LỚP 1 (mọi ca, chạy ngay): ca tự cân — tiền nguyên; tổng = cộng các dòng; tổng ≥ 0 sau MỖI dòng (ADR C8); mỗi dòng đảo đối dấu một dòng trước nó chưa bị
//     đảo; ca "da_xac_nhan" phải có người + ngày. Bắt CA VIẾT SAI, không kiểm mã.
//   LỚP 2 (CHỈ ca "da_xac_nhan"): chuỗi sự kiện chạy qua CHÍNH kế hoạch chi phí của lô chuyến (tien-xe-lo.ts: keHoachChiPhiKhiDoi, keHoachChiPhiKhiHuy — gọi
//     chonDongGiaThue, coXeCua, thuTuDaoTatCa) + luật thuần tien-xe.ts (nguonGiaConHieuLuc, tongChiPhiChuyen, daoDuoc) — so đáp án từng đồng. Chưa có ca nào xác nhận ⇒ bài lớp 2 báo `todo` (không "xanh vì rỗng").
// AI KHÔNG tự đổi ca sang "da_xac_nhan" (Hiến pháp N8) — chỉ chủ dự án / Kế toán.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { daoDuoc, dieuChinhDuoc, ngayDieuChinhMacDinh, ngayGhiDao, nguonGiaConHieuLuc, nhaXeChiuChiPhi, tongChiPhiChuyen, type CoXe, type DongChiPhi, type DongGiaThue, type LoaiDongChiPhi, type TrangThaiChuyenTien } from "./modules/van-chuyen/tien-xe.ts";
// Vòng sửa 1 (V-2): mô phỏng gọi THẲNG kế hoạch chi phí của lô chuyến (không tự dựng lại phép đảo / chụp).
import { keHoachChiPhiKhiDoi, keHoachChiPhiKhiHuy, type DongLo, type KeHoachChiPhi } from "./modules/van-chuyen/tien-xe-lo.ts";
import { addDays, isISODate } from "./shared/vn-date.ts";

interface SuKien { loai: string; [k: string]: unknown }
interface Ca {
  ma: string;
  mo_ta: string;
  xac_nhan: { trang_thai: "cho_xac_nhan" | "da_xac_nhan"; nguoi: string | null; ngay: string | null };
  chuyen: { nha_xe: string; so_cho: number; tuyen: string | null; ngay: string };
  su_kien: SuKien[];
  dap_an: {
    dong: [LoaiDongChiPhi, number, string][]; tong: number; thieu_gia: boolean | null; tu_choi?: [number, string][]; so_dieu_chinh_bi_dao?: number;
    /** Vòng sửa 2 (C12, 4.7): nhà xe mang trên TỪNG dòng (cùng thứ tự `dong`) — chỉ ca cần kiểm nhà xe chịu chi phí. */
    nha_xe_dong?: string[];
  };
}
interface Tep {
  bang_gia: { id: string; nha_xe: string; tuyen: string | null; co: string | null; tien: number; tu: string; den: string | null }[];
  co_xe: { code: string; min: number; max: number }[];
  cac_ca: Ca[];
}
const TEP = JSON.parse(readFileSync(new URL("../golden/van-chuyen-chi-phi.json", import.meta.url), "utf8")) as Tep;
const DA_XAC_NHAN = TEP.cac_ca.filter((c) => c.xac_nhan.trang_thai === "da_xac_nhan");

test("sổ vàng chi phí xe — LỚP 1: mỗi ca tự cân (tiền nguyên, tổng = cộng dòng, tổng ≥ 0 sau mỗi dòng, dòng đảo đối dấu dòng trước chưa đảo); xác nhận có người + ngày", () => {
  assert.ok(TEP.cac_ca.length >= 22, "đủ ca V1–V14b (+ V5b, V6b, V8b, V12b) + vòng sửa 2: C12 đổi nhà xe, 4.7, SV-1");
  const ma = new Set<string>();
  for (const c of TEP.cac_ca) {
    assert.ok(!ma.has(c.ma), `${c.ma}: trùng mã`);
    ma.add(c.ma);
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay, `${c.ma}: đã xác nhận phải có người + ngày`);
    let tong = 0;
    const conDao: { loai: LoaiDongChiPhi; tien: number; ngay: string }[] = [];
    for (const [loai, tien, ngay] of c.dap_an.dong) {
      assert.ok(Number.isSafeInteger(tien) && tien !== 0, `${c.ma}: tiền nguyên khác 0`);
      assert.ok(isISODate(ngay), `${c.ma}: mỗi dòng có ngày phát sinh YYYY-MM-DD`);
      if (loai === "REVERSAL") {
        const i = conDao.map((d) => d.tien).lastIndexOf(-tien);
        assert.ok(i >= 0, `${c.ma}: dòng đảo ${tien} không đối dấu dòng nào chưa đảo`);
        // SV-1 (vòng sửa 2): dòng đảo mang NGÀY của dòng gốc (khoá kỳ chưa có — mọi kỳ còn mở).
        assert.equal(ngay, conDao[i]!.ngay, `${c.ma}: dòng đảo ${tien} phải mang ngày dòng gốc ${conDao[i]!.ngay}`);
        conDao.splice(i, 1);
      } else {
        if (loai !== "ADJUSTMENT") assert.ok(tien > 0, `${c.ma}: ${loai} phải dương`);
        conDao.push({ loai, tien, ngay });
      }
      tong += tien;
      assert.ok(tong >= 0, `${c.ma}: tổng âm giữa chừng`);
    }
    assert.equal(tong, c.dap_an.tong, `${c.ma}: tổng ≠ cộng các dòng`);
    if (c.dap_an.nha_xe_dong) assert.equal(c.dap_an.nha_xe_dong.length, c.dap_an.dong.length, `${c.ma}: nha_xe_dong phải có đúng một nhà xe mỗi dòng`);
    assert.ok(conDao.filter((d) => d.loai === "SNAPSHOT" || d.loai === "AGREED").length <= 1, `${c.ma}: tối đa một nguồn giá còn hiệu lực`);
  }
});

// ---- Bộ mô phỏng thuần (chỉ gọi luật của tien-xe.ts; không tự viết lại phép chọn / cộng) ---------------------------------------------------------------
const CO_XE: CoXe[] = TEP.co_xe.map((c) => ({ ...c, active: true }));
interface KetQuaMoPhong { dong: [LoaiDongChiPhi, number, string][]; tong: number; thieu_gia: boolean | null; tu_choi: [number, string][]; nha_xe_dong: string[] }
function moPhong(c: Ca): KetQuaMoPhong {
  const gia: DongGiaThue[] = TEP.bang_gia.map((g) => ({ id: g.id, carrierPartyId: g.nha_xe, routeCode: g.tuyen, sizeCode: g.co, amount: g.tien, validFrom: g.tu, validTo: g.den }));
  const x = { ...c.chuyen, trangThai: "PLANNED" as TrangThaiChuyenTien, thue: c.chuyen.nha_xe !== "CONG_TY", ngayHuy: null as string | null };
  const dong: DongLo[] = [];
  const tuChoi: [number, string][] = [];
  let n = 0;
  // Nhà xe trên dòng như máy chủ: chụp / thoả thuận = chủ xe hiện tại; đảo = nhà xe của dòng gốc; điều chỉnh = nhà xe chịu chi phí (`nhaXeChiuChiPhi`).
  const them = (kind: LoaiDongChiPhi, amount: number, reversesId: string | null, ngay: string, carrierPartyId: string) =>
    dong.push({ id: `d${String(++n).padStart(3, "0")}`, kind, amount, reversesId, reasonCode: kind === "SNAPSHOT" ? null : "X", createdAt: String(n).padStart(6, "0"), carrierPartyId, occurredDate: ngay });
  const NHA_XE_MO = new Set(["HP", "NV"]);
  /** Áp kế hoạch chi phí của CHÍNH lô chuyến (`keHoachChiPhiKhiDoi` / `keHoachChiPhiKhiHuy` — vòng sửa 1, V-2): đảo theo thứ tự kế hoạch rồi chụp. */
  const apKeHoach = (kh: KeHoachChiPhi) => {
    for (const d of kh.dao) them("REVERSAL", -d.goc.amount, d.goc.id, d.ngay, d.goc.carrierPartyId);
    if (kh.chup) them("SNAPSHOT", kh.chup.amount, null, kh.chup.ngayChay, x.nha_xe);
  };
  const doi = (v: { tuyen?: string | null; ngay?: string; xe?: { so_cho: number; nha_xe: string }; laTaoMoi?: boolean }) => {
    const nhaXeMoi = v.xe?.nha_xe ?? x.nha_xe;
    const kh = keHoachChiPhiKhiDoi({
      dong, homNay: x.ngay, rentedMoi: nhaXeMoi === "CONG_TY" ? 0 : 1, chuXeMoi: nhaXeMoi, nhaXeDangMo: NHA_XE_MO, laTaoMoi: v.laTaoMoi ?? false,
      doiXeHoacNhaXe: v.xe !== undefined, doiTuyen: v.tuyen !== undefined && v.tuyen !== x.tuyen, doiNgay: v.ngay !== undefined && v.ngay !== x.ngay,
      tuyenMoi: v.tuyen !== undefined ? v.tuyen : x.tuyen, soChoMoi: v.xe?.so_cho ?? x.so_cho, ngayChayMoi: v.ngay ?? x.ngay, gia, coXe: CO_XE,
    });
    if (!kh.ok) throw new Error(`${c.ma}: ${kh.loi}`);
    if (v.xe) { x.so_cho = v.xe.so_cho; x.nha_xe = v.xe.nha_xe; x.thue = x.nha_xe !== "CONG_TY"; }
    if (v.tuyen !== undefined) x.tuyen = v.tuyen;
    if (v.ngay !== undefined) x.ngay = v.ngay;
    apKeHoach(kh.kh);
  };
  c.su_kien.forEach((e, i) => {
    switch (e.loai) {
      case "CHUP": doi({ laTaoMoi: true }); break;
      case "GIA_THOA_THUAN":
        if (x.trangThai !== "PLANNED" || !x.thue || nguonGiaConHieuLuc(dong)) tuChoi.push([i, "khong_nhap_duoc"]);
        else them("AGREED", e.tien as number, null, x.ngay, x.nha_xe);
        break;
      case "DIEU_CHINH":
        if (dong.length === 0) tuChoi.push([i, "chua_co_dong"]);
        else if (!dieuChinhDuoc({ rented: x.thue ? 1 : 0, trangThai: x.trangThai, lyDo: e.ly_do as string })) tuChoi.push([i, "khong_phai_xe_thue"]);
        else if (tongChiPhiChuyen(dong) + (e.tien as number) < 0) tuChoi.push([i, "tong_am"]);
        else {
          them("ADJUSTMENT", e.tien as number, null, (e.ngay as string | undefined) ?? ngayDieuChinhMacDinh({ trangThai: x.trangThai, ngayHuy: x.ngayHuy, homNay: x.ngay }),
            nhaXeChiuChiPhi(dong, x.nha_xe));
        }
        break;
      case "DAO": {
        const d = dong[e.dong as number]!;
        if (!daoDuoc(dong, d, x.trangThai)) tuChoi.push([i, "khong_dao_duoc"]);
        else if (tongChiPhiChuyen(dong) - d.amount < 0) tuChoi.push([i, "tong_am"]);
        else them("REVERSAL", -d.amount, d.id, ngayGhiDao(d, { homNay: x.ngay }), d.carrierPartyId);
        break;
      }
      case "DOI_TUYEN": doi({ tuyen: e.tuyen as string | null }); break;
      case "DOI_NGAY": doi({ ngay: e.ngay as string }); break;
      case "DOI_XE": doi({ xe: { so_cho: e.so_cho as number, nha_xe: e.nha_xe as string } }); break;
      case "HUY": apKeHoach(keHoachChiPhiKhiHuy(dong, (e.ngay as string | undefined) ?? x.ngay)); x.trangThai = "CANCELLED"; x.ngayHuy = (e.ngay as string | undefined) ?? x.ngay; break;
      case "KET_THUC_GIAN_DOAN": x.trangThai = "ENDED_INTERRUPTED"; break;
      case "THEM_GIA": {
        const thay = gia.findIndex((g) => g.id === e.thay);
        if (thay >= 0) gia[thay] = { ...gia[thay]!, validTo: addDays(e.tu as string, -1) };
        gia.push({ id: e.id as string, carrierPartyId: "HP", routeCode: e.tuyen as string | null, sizeCode: e.co as string | null, amount: e.tien as number, validFrom: e.tu as string, validTo: e.den as string | null });
        break;
      }
      default: throw new Error(`${c.ma}: sự kiện lạ ${e.loai}`);
    }
  });
  return {
    dong: dong.map((d) => [d.kind, d.amount, d.occurredDate]), tong: tongChiPhiChuyen(dong), tu_choi: tuChoi, nha_xe_dong: dong.map((d) => d.carrierPartyId),
    thieu_gia: x.trangThai === "PLANNED" ? x.thue && nguonGiaConHieuLuc(dong) === null : null,
  };
}
const soVoi = (c: Ca, kq: KetQuaMoPhong) =>
  ({ dong: kq.dong, tong: kq.tong, thieu_gia: kq.thieu_gia, tu_choi: kq.tu_choi, ...(c.dap_an.nha_xe_dong ? { nha_xe_dong: kq.nha_xe_dong } : {}) }) as unknown as Record<string, unknown>;
const dapAn = (c: Ca) => ({ dong: c.dap_an.dong, tong: c.dap_an.tong, thieu_gia: c.dap_an.thieu_gia, tu_choi: c.dap_an.tu_choi ?? [], ...(c.dap_an.nha_xe_dong ? { nha_xe_dong: c.dap_an.nha_xe_dong } : {}) });

test("sổ vàng chi phí xe — LỚP 2: ca ĐÃ XÁC NHẬN chạy qua luật thuần thật, khớp từng đồng", { todo: DA_XAC_NHAN.length === 0 ? "chưa có ca nào được Kế toán / chủ dự án xác nhận — lớp 2 chưa áp dụng" : false }, () => {
  assert.ok(DA_XAC_NHAN.length > 0, "không xanh vì rỗng");
  for (const c of DA_XAC_NHAN) assert.deepEqual(soVoi(c, moPhong(c)), dapAn(c), c.ma);
});

// Chạy thử bộ mô phỏng trên ca CHỜ xác nhận — CHỈ báo chẩn đoán (t.diagnostic), KHÔNG khẳng định: AI không tự nghiệm thu đáp án (N8). Dùng để người lập ca /
// Kế toán thấy ngay ca nào mã hiện tại cho số khác đáp án đề xuất.
test("sổ vàng chi phí xe — chạy thử ca chờ xác nhận (chẩn đoán, không nghiệm thu)", (t) => {
  for (const c of TEP.cac_ca.filter((x) => x.xac_nhan.trang_thai !== "da_xac_nhan")) {
    const kq = soVoi(c, moPhong(c));
    t.diagnostic(`${c.ma}: chưa áp dụng (chờ xác nhận) — mã hiện tại ${JSON.stringify(kq) === JSON.stringify(dapAn(c)) ? "KHỚP" : `LỆCH: ${JSON.stringify(kq)}`} đáp án đề xuất`);
  }
});
