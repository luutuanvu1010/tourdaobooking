// SỔ VÀNG CHI PHÍ XE THUÊ (Hiến chương 5.17; ADR-0057 C12 — kế hoạch Đợt 4 Task 6, tự chốt TC-3: tệp riêng vì src/so-vang.test.ts chỉ hiểu khuôn sổ công nợ).
// Hai lớp (khuôn golden/README.md "Hai lớp kiểm"):
//   LỚP 1 (mọi ca, chạy ngay): ca tự cân — tiền nguyên; tổng = cộng các dòng; tổng ≥ 0 sau MỖI dòng (ADR C8); mỗi dòng đảo đối dấu một dòng trước nó chưa bị
//     đảo; ca "da_xac_nhan" phải có người + ngày. Bắt CA VIẾT SAI, không kiểm mã.
//   LỚP 2 (CHỈ ca "da_xac_nhan"): chuỗi sự kiện chạy qua CHÍNH luật thuần src/modules/van-chuyen/tien-xe.ts (chonDongGiaThue, coXeCua, thuTuDaoTatCa,
//     nguonGiaConHieuLuc, tongChiPhiChuyen, daoDuoc) — so đáp án từng đồng. Chưa có ca nào xác nhận ⇒ bài lớp 2 báo `todo` (không "xanh vì rỗng").
// AI KHÔNG tự đổi ca sang "da_xac_nhan" (Hiến pháp N8) — chỉ chủ dự án / Kế toán.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  chonDongGiaThue, coXeCua, daoDuoc, nguonGiaConHieuLuc, thuTuDaoTatCa, tongChiPhiChuyen, type CoXe, type DongChiPhi, type DongGiaThue, type LoaiDongChiPhi,
  type TrangThaiChuyenTien,
} from "./modules/van-chuyen/tien-xe.ts";
import { addDays } from "./shared/vn-date.ts";

interface SuKien { loai: string; [k: string]: unknown }
interface Ca {
  ma: string;
  mo_ta: string;
  xac_nhan: { trang_thai: "cho_xac_nhan" | "da_xac_nhan"; nguoi: string | null; ngay: string | null };
  chuyen: { nha_xe: string; so_cho: number; tuyen: string | null; ngay: string };
  su_kien: SuKien[];
  dap_an: { dong: [LoaiDongChiPhi, number][]; tong: number; thieu_gia: boolean | null; tu_choi?: [number, string][]; so_dieu_chinh_bi_dao?: number };
}
interface Tep {
  bang_gia: { id: string; nha_xe: string; tuyen: string | null; co: string | null; tien: number; tu: string; den: string | null }[];
  co_xe: { code: string; min: number; max: number }[];
  cac_ca: Ca[];
}
const TEP = JSON.parse(readFileSync(new URL("../golden/van-chuyen-chi-phi.json", import.meta.url), "utf8")) as Tep;
const DA_XAC_NHAN = TEP.cac_ca.filter((c) => c.xac_nhan.trang_thai === "da_xac_nhan");

test("sổ vàng chi phí xe — LỚP 1: mỗi ca tự cân (tiền nguyên, tổng = cộng dòng, tổng ≥ 0 sau mỗi dòng, dòng đảo đối dấu dòng trước chưa đảo); xác nhận có người + ngày", () => {
  assert.ok(TEP.cac_ca.length >= 14, "đủ ca V1–V13 (+ V5b, V6b, V8b, V12b)");
  const ma = new Set<string>();
  for (const c of TEP.cac_ca) {
    assert.ok(!ma.has(c.ma), `${c.ma}: trùng mã`);
    ma.add(c.ma);
    assert.ok(["cho_xac_nhan", "da_xac_nhan"].includes(c.xac_nhan.trang_thai), c.ma);
    if (c.xac_nhan.trang_thai === "da_xac_nhan") assert.ok(c.xac_nhan.nguoi && c.xac_nhan.ngay, `${c.ma}: đã xác nhận phải có người + ngày`);
    let tong = 0;
    const conDao: { loai: LoaiDongChiPhi; tien: number }[] = [];
    for (const [loai, tien] of c.dap_an.dong) {
      assert.ok(Number.isSafeInteger(tien) && tien !== 0, `${c.ma}: tiền nguyên khác 0`);
      if (loai === "REVERSAL") {
        const i = conDao.map((d) => d.tien).lastIndexOf(-tien);
        assert.ok(i >= 0, `${c.ma}: dòng đảo ${tien} không đối dấu dòng nào chưa đảo`);
        conDao.splice(i, 1);
      } else {
        if (loai !== "ADJUSTMENT") assert.ok(tien > 0, `${c.ma}: ${loai} phải dương`);
        conDao.push({ loai, tien });
      }
      tong += tien;
      assert.ok(tong >= 0, `${c.ma}: tổng âm giữa chừng`);
    }
    assert.equal(tong, c.dap_an.tong, `${c.ma}: tổng ≠ cộng các dòng`);
    assert.ok(conDao.filter((d) => d.loai === "SNAPSHOT" || d.loai === "AGREED").length <= 1, `${c.ma}: tối đa một nguồn giá còn hiệu lực`);
  }
});

// ---- Bộ mô phỏng thuần (chỉ gọi luật của tien-xe.ts; không tự viết lại phép chọn / cộng) ---------------------------------------------------------------
const CO_XE: CoXe[] = TEP.co_xe.map((c) => ({ ...c, active: true }));
interface KetQuaMoPhong { dong: [LoaiDongChiPhi, number][]; tong: number; thieu_gia: boolean | null; tu_choi: [number, string][] }
function moPhong(c: Ca): KetQuaMoPhong {
  const gia: DongGiaThue[] = TEP.bang_gia.map((g) => ({ id: g.id, carrierPartyId: g.nha_xe, routeCode: g.tuyen, sizeCode: g.co, amount: g.tien, validFrom: g.tu, validTo: g.den }));
  const x = { ...c.chuyen, trangThai: "PLANNED" as TrangThaiChuyenTien, thue: c.chuyen.nha_xe !== "CONG_TY" };
  const dong: DongChiPhi[] = [];
  const tuChoi: [number, string][] = [];
  let n = 0;
  const them = (kind: LoaiDongChiPhi, amount: number, reversesId: string | null = null) => dong.push({ id: `d${String(++n).padStart(3, "0")}`, kind, amount, reversesId, reasonCode: kind === "SNAPSHOT" ? null : "X", createdAt: String(n).padStart(6, "0") });
  const chup = () => {
    if (!x.thue) return;
    const g = chonDongGiaThue({ carrierPartyId: x.nha_xe, routeCode: x.tuyen, sizeCode: coXeCua(x.so_cho, CO_XE), ngayChay: x.ngay }, gia);
    if (g) them("SNAPSHOT", g.amount);
  };
  const daoHet = () => { for (const d of thuTuDaoTatCa(dong)) them("REVERSAL", -d.amount, d.id); };
  c.su_kien.forEach((e, i) => {
    switch (e.loai) {
      case "CHUP": chup(); break;
      case "GIA_THOA_THUAN":
        if (x.trangThai !== "PLANNED" || !x.thue || nguonGiaConHieuLuc(dong)) tuChoi.push([i, "khong_nhap_duoc"]);
        else them("AGREED", e.tien as number);
        break;
      case "DIEU_CHINH":
        if (dong.length === 0) tuChoi.push([i, "chua_co_dong"]);
        else if (tongChiPhiChuyen(dong) + (e.tien as number) < 0) tuChoi.push([i, "tong_am"]);
        else them("ADJUSTMENT", e.tien as number);
        break;
      case "DAO": {
        const d = dong[e.dong as number]!;
        if (!daoDuoc(dong, d, x.trangThai)) tuChoi.push([i, "khong_dao_duoc"]);
        else if (tongChiPhiChuyen(dong) - d.amount < 0) tuChoi.push([i, "tong_am"]);
        else them("REVERSAL", -d.amount, d.id);
        break;
      }
      case "DOI_TUYEN": if (e.tuyen !== x.tuyen) { daoHet(); x.tuyen = e.tuyen as string | null; chup(); } break;
      case "DOI_NGAY": if (e.ngay !== x.ngay) { daoHet(); x.ngay = e.ngay as string; chup(); } break;
      case "DOI_XE": daoHet(); x.so_cho = e.so_cho as number; x.nha_xe = e.nha_xe as string; x.thue = x.nha_xe !== "CONG_TY"; chup(); break;
      case "HUY": daoHet(); x.trangThai = "CANCELLED"; break;
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
    dong: dong.map((d) => [d.kind, d.amount]), tong: tongChiPhiChuyen(dong), tu_choi: tuChoi,
    thieu_gia: x.trangThai === "PLANNED" ? x.thue && nguonGiaConHieuLuc(dong) === null : null,
  };
}
const soVoi = (c: Ca, kq: KetQuaMoPhong) => ({ dong: kq.dong, tong: kq.tong, thieu_gia: kq.thieu_gia, tu_choi: kq.tu_choi }) as unknown as Record<string, unknown>;
const dapAn = (c: Ca) => ({ dong: c.dap_an.dong, tong: c.dap_an.tong, thieu_gia: c.dap_an.thieu_gia, tu_choi: c.dap_an.tu_choi ?? [] });

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
