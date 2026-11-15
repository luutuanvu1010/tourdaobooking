// TT1 (kiểm toán 14/11): một dòng Sheet gõ sai (giá «850k», thiếu Đơn vị) KHÔNG được làm dịch vụ đang bán biến khỏi form lập đơn.
// Chạy CẢ hàm lệnh đồng bộ trên SQLite thật (tests/audit/harness.mjs); Google Sheet là bản giả trong bộ nhớ; không gọi mạng.
import { test } from "node:test";
import assert from "node:assert/strict";
import { tacNhan } from "../../shared/permissions.ts";
import { toEffective } from "./rules.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { app, world } from "../../../tests/audit/harness.mjs";

const SHEET = "1XPx1g0JVTdevdX35MeCpt6Cc6Dgxdmfer6okEWleD3s";
const HEADER = "Mã tour,Tên tour,Khoá giá,Đường dẫn,Đơn vị,Giá người lớn,Giá trẻ em,Ghi chú trẻ em,Giá người cao tuổi,Ghi chú người cao tuổi,Giá em bé,Ghi chú em bé,Ghi chú nội bộ";
const dong = (ma: string, gia: string, donVi = "perPax") => `${ma},Tour ${ma},k,d,${donVi},${gia},,,,,,,`;
const csv = (...rows: string[]) => [HEADER, ...rows].join("\n");
const NAM = ["T1", "T2", "T3", "T4", "T5"];
const binhThuong = () => NAM.map((m) => dong(m, "100000"));
const BEN = tacNhan("DONG_BO_DANH_MUC");

async function voiSheet<T>(noiDung: string, viec: () => Promise<T>): Promise<T> {
  const goc = globalThis.fetch;
  globalThis.fetch = (async () => new Response(noiDung, { status: 200, headers: { "content-type": "text/csv; charset=utf-8" } })) as typeof fetch;
  try {
    return await viec();
  } finally {
    globalThis.fetch = goc;
  }
}

type Tin = { tieuDe: string; noiDung: string };
async function dongBo(w: any, noiDung: string, tin: Tin[] = []) {
  w.env.SERVICES_SHEET_ID = SHEET;
  return voiSheet(noiDung, () => app.syncCatalog(w.env, BEN, { baoTin: async (t: Tin) => void tin.push(t) }));
}
const dichVu = (w: any, ma: string) => ({ ...w.q("SELECT code, in_sheet, price_adult FROM catalog_item WHERE code = ?", ma)[0] });
// «Hiện trong form lập đơn» = đúng hàm toEffective mà getEffectiveServices dùng, trên dòng thật trong D1.
const hienTrongForm = async (w: any, ma: string) => {
  const r = w.q("SELECT * FROM catalog_item WHERE code = ?", ma)[0];
  const prices = { adult: r.price_adult, child: r.price_child, senior: r.price_senior, infant: r.price_infant };
  return toEffective({ code: r.code, name: r.name, unit: r.unit, prices, notes: { child: null, senior: null, infant: null }, inSheet: r.in_sheet === 1, override: null }).visible;
};

test("TT1(a): giá của X gõ thành «850k» → X vẫn còn trong Sheet, giá cũ, vẫn hiện trong form lập đơn", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  assert.equal(await hienTrongForm(w, "T3"), true);
  const kq = await dongBo(w, csv(dong("T1", "100000"), dong("T2", "100000"), dong("T3", "850k"), dong("T4", "100000"), dong("T5", "100000")));
  assert.equal(kq.ok, true);
  assert.deepEqual(dichVu(w, "T3"), { code: "T3", in_sheet: 1, price_adult: 100000 });
  assert.equal(await hienTrongForm(w, "T3"), true);
  const giu = w.q("SELECT problems_json FROM catalog_sync WHERE id = 'default'")[0].problems_json;
  assert.match(giu, /"giuLai":true/);
});

test("TT1(b): dòng của X bị XOÁ hẳn khỏi Sheet → X bị ẩn như cũ", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  await dongBo(w, csv(dong("T1", "100000"), dong("T2", "100000"), dong("T4", "100000"), dong("T5", "100000")));
  assert.equal(dichVu(w, "T3").in_sheet, 0);
  assert.equal(await hienTrongForm(w, "T3"), false);
});

test("TT1(c): dòng hỏng của mã CHƯA từng có → không tạo dịch vụ, chỉ ghi vấn đề; (f) ô mã cũng hỏng → như cũ, không vỡ", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  const tin: Tin[] = [];
  const kq = await dongBo(w, csv(...binhThuong(), dong("MOI1", "abc"), dong("", "100000"), dong("MA SAI !", "100000")), tin);
  assert.equal(kq.ok, true);
  assert.equal(w.q("SELECT count(*) AS n FROM catalog_item WHERE code = 'MOI1'")[0].n, 0);
  assert.equal(w.q("SELECT count(*) AS n FROM catalog_item")[0].n, 5);
  assert.equal(kq.problems.length, 3);
  assert.equal(tin.length, 0, "không có dịch vụ đang bán nào bị ảnh hưởng thì không báo");
});

test("TT1(d): hai lần liên tiếp cùng một dòng hỏng → MỘT tin; sửa dòng rồi hỏng dòng khác → tin mới; tin nêu tên dịch vụ và ô sai", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  const tin: Tin[] = [];
  const hongT3 = csv(dong("T1", "100000"), dong("T2", "100000"), dong("T3", "850k"), dong("T4", "100000"), dong("T5", "100000"));
  await dongBo(w, hongT3, tin);
  await dongBo(w, hongT3, tin);
  assert.equal(tin.length, 1);
  assert.match(tin[0]!.noiDung, /Tour T3/);
  assert.match(tin[0]!.noiDung, /Giá người lớn/);
  assert.doesNotMatch(tin[0]!.noiDung, /perPax|problems|giuLai/);
  await dongBo(w, csv(...binhThuong()), tin); // đã sửa
  await dongBo(w, csv(dong("T1", "100000"), dong("T2", "100000"), dong("T3", "100000"), dong("T4", "100000", ""), dong("T5", "100000")), tin);
  assert.equal(tin.length, 2);
  assert.match(tin[1]!.noiDung, /Tour T4/);
  assert.match(tin[1]!.noiDung, /Đơn vị/);
});

test("TT1(d'): chưa nối được kênh báo (hoặc báo lỗi) thì lần sau vẫn báo; đồng bộ không vỡ", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  const hong = csv(dong("T1", "100000"), dong("T2", "100000"), dong("T3", "850k"), dong("T4", "100000"), dong("T5", "100000"));
  w.env.SERVICES_SHEET_ID = SHEET;
  const kq = await voiSheet(hong, () => app.syncCatalog(w.env, BEN, { baoTin: async () => { throw new Error("hỏng kênh"); } }));
  assert.equal(kq.ok, true);
  const tin: Tin[] = [];
  await dongBo(w, hong, tin);
  assert.equal(tin.length, 1);
});

test("TT1(e): Sheet mất quá nửa thật → chốt chặn vẫn chặn, không ẩn gì", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  const kq = await dongBo(w, csv(dong("T1", "100000")));
  assert.equal(kq.ok, false);
  assert.equal(kq.code, "sync_guard");
  assert.equal(w.q("SELECT count(*) AS n FROM catalog_item WHERE in_sheet = 1")[0].n, 5);
});

test("TT1: nhật ký catalog_synced ghi dòng giữ lại; lần lặp y hệt không ghi thêm", async () => {
  const w = world();
  await dongBo(w, csv(...binhThuong()));
  const hong = csv(dong("T1", "100000"), dong("T2", "100000"), dong("T3", "850k"), dong("T4", "100000"), dong("T5", "100000"));
  const dem = () => w.q("SELECT detail FROM audit_log WHERE action = 'catalog_synced' ORDER BY rowid");
  const truoc = dem().length;
  await dongBo(w, hong);
  const sau = dem();
  assert.equal(sau.length, truoc + 1);
  assert.match(sau[sau.length - 1].detail, /giữ lại 1/);
  await dongBo(w, hong);
  assert.equal(dem().length, truoc + 1);
});
