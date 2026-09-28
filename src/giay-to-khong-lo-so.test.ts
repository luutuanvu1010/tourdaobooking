// HÀNG RÀO TOÀN TUYẾN — số giấy tờ của NGƯỜI không lọt ra ngoài (ADR-0040 D2: "nhật ký, Bảng tin, thông báo không bao giờ chứa số giấy tờ"; số CCCD, số bằng lái
// luôn che ở mọi DTO mặc định; số đầy đủ CHỈ ở route "xem đủ số"). Kế hoạch Task A16.
//   (1) ĐỦ TUYẾN (siết): tập route thật (phương thức + đường dẫn) của parties + van-chuyen có "/documents" hoặc "/giay-to" trong đường dẫn — lấy từ MÃ THẬT
//       (esbuild, như src/route-access.test.ts) — phải BẰNG tập khoá của TUYEN. Thêm route giấy tờ mới mà quên ca ở đây → đỏ.
//   (2) NHẬT KÝ: toàn bộ audit_log không chứa số đánh dấu nào (người lẫn xe — một luật chung, G4), không chứa nơi cấp đánh dấu.
//   (3) THÂN TRẢ VỀ: mọi lời gọi ở TUYEN trừ "xem đủ số", cộng GET /api/parties/:id, GET /api/van-chuyen/sap-het-han, GET /api/audit (Toàn quyền), không chứa số
//       đánh dấu của NGƯỜI (giấy tờ xe hiện đủ số — không phải dữ liệu cá nhân). Nơi cấp được hiện ở danh sách giấy tờ, KHÔNG ở nhật ký.
//   (4) Chống bài rỗng: thân "xem đủ số" CÓ đúng số.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Mọi số ở đây là số GIẢ, đánh dấu để dò.
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";

async function routesOf(entry: string, exportName: string): Promise<string[]> {
  const built = await esbuild.build({ entryPoints: [new URL(entry, import.meta.url).pathname], bundle: true, format: "esm", platform: "neutral", target: "es2022", write: false });
  const mod = (await import(`data:text/javascript;base64,${Buffer.from(built.outputFiles[0]!.text).toString("base64")}`)) as Record<string, AppModule>;
  return mod[exportName]!.routes.map((r) => `${r.method} ${r.path}`);
}
const TUYEN_THAT = [...(await routesOf("./modules/parties/index.ts", "partiesModule")), ...(await routesOf("./modules/van-chuyen/index.ts", "vanChuyenModule"))]
  .filter((k) => /\/documents|\/giay-to/.test(k.split(" ")[1]!))
  .sort();

const ADM = "33333333-3333-4333-8333-333333333333";
const SUP = "77777777-7777-4777-8777-777777777777";
const SO_CCCD = "079888777666";
const SO_CCCD_MOI = "079888777665";
const SO_GPLX = "790888777666";
const SO_SUC_KHOE = "SK888777444";
const NOI = "NOI CAP DANH DAU";
const NOI_MOI = "NOI CAP DANH DAU MOI";
const SO_XE = "KD-DANHDAU-9";
const SO_XE_MOI = "KD-DANHDAU-8";
/** Mọi dạng lộ của số người: đủ số, 8 ký tự đầu, 8 ký tự cuối (số che chỉ để lộ 4 ký tự cuối). */
const DAU_SO_NGUOI = [SO_CCCD, SO_CCCD_MOI, SO_GPLX, SO_SUC_KHOE].flatMap((s) => [s, s.slice(0, 8), s.slice(-8)]);
const DAU_SO_XE = [SO_XE, SO_XE_MOI, "DANHDAU"];
const HOM_NAY = new Date(Date.now() + 7 * 3600e3).toISOString().slice(0, 10);
const ngay = (n: number) => new Date(Date.parse(`${HOM_NAY}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);

test("số giấy tờ của người chỉ rời máy chủ ở 'xem đủ số': đủ tuyến, nhật ký sạch, thân trả về sạch, 'xem đủ số' có số", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: ADM, phone: "0900000003", name: "Quản trị", perms: ["ADMIN"] });
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const tk = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Tài Xế Dò Số", phone: "0900000097", roles: ["DRIVER_INTERNAL"] } });
  assert.equal(tk.status, 201, tk.text);
  const TX = tk.json.staff.id as string;
  const P = w.q("SELECT party_id FROM staff WHERE id = ?", TX)[0].party_id as string;
  const khac = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "PERSON", fullName: "Người Khác", contacts: [] } })).json.party.id as string;
  const xe = (await w.call("POST", "/api/van-chuyen/xe", { as: ADM, body: { plateNumber: "79B-777.77", chassisNumber: "KHUNGDOSO01", name: "Xe Dò Số", passengerCapacity: 15 } })).json.vehicle.id as string;
  const idCua = (r: any, type: string) => r.json.documents.find((d: any) => d.typeCode === type && d.current)?.id as string;

  const than: { khoa: string; text: string }[] = [];
  let lanXemSo = "";
  const goi = async (khoa: string, method: string, path: string, as: string, body?: unknown, mongDoi?: number) => {
    const r = await w.call(method, path, { as, body });
    if (mongDoi !== undefined) assert.equal(r.status, mongDoi, `${khoa}: ${r.text}`);
    than.push({ khoa, text: r.text });
    return r;
  };
  const moc = (did: string, bang = "pty_person_document") => w.q(`SELECT updated_at FROM ${bang} WHERE id = ?`, did)[0].updated_at as string;
  const doi = () => new Promise((res) => setTimeout(res, 5));

  // Bảng ca: mỗi route giấy tờ chạy ÍT NHẤT một lần (khoá = "PHƯƠNG_THỨC đường_dẫn" đúng như route khai).
  const TUYEN: Record<string, () => Promise<void>> = {
    "POST /api/parties/:id/documents": async () => {
      await goi("thêm CCCD", "POST", `/api/parties/${P}/documents`, ADM, { typeCode: "CCCD", number: "079 888 777 666", issuedPlace: NOI, expiryDate: "2035-01-01" }, 201);
      await goi("thêm GPLX", "POST", `/api/parties/${P}/documents`, ADM, { typeCode: "GPLX", number: SO_GPLX, classCode: "D2", issuedPlace: NOI, expiryDate: ngay(10) }, 201);
      await goi("thêm khám sức khoẻ", "POST", `/api/parties/${P}/documents`, ADM, { typeCode: "HEALTH_CHECK", number: SO_SUC_KHOE, issuedPlace: NOI, expiryDate: ngay(40) }, 201);
      await goi("CCCD trùng người khác", "POST", `/api/parties/${khac}/documents`, ADM, { typeCode: "CCCD", number: SO_CCCD }, 409);
    },
    "POST /api/parties/:id/documents/:did/renew": async () => {
      const r = await goi("đọc để gia hạn", "GET", `/api/parties/${P}/documents`, ADM, undefined, 200);
      await goi("gia hạn GPLX (không gửi số)", "POST", `/api/parties/${P}/documents/${idCua(r, "GPLX")}/renew`, ADM, { issuedPlace: NOI, expiryDate: ngay(20) }, 201);
    },
    "POST /api/parties/:id/documents/:did/correct": async () => {
      const r = await goi("đọc để sửa", "GET", `/api/parties/${P}/documents`, ADM, undefined, 200);
      const cccd = idCua(r, "CCCD");
      await doi();
      await goi("sửa sai số CCCD", "POST", `/api/parties/${P}/documents/${cccd}/correct`, ADM, { reason: "SAI_SO", value: SO_CCCD_MOI, expectedUpdatedAt: moc(cccd) }, 200);
      await doi();
      await goi("sửa sai nơi cấp", "POST", `/api/parties/${P}/documents/${cccd}/correct`, ADM, { reason: "SAI_NOI_CAP", value: NOI_MOI, expectedUpdatedAt: moc(cccd) }, 200);
      const sk = idCua(r, "HEALTH_CHECK");
      await goi("huỷ dòng khám sức khoẻ", "POST", `/api/parties/${P}/documents/${sk}/correct`, ADM, { reason: "NHAP_NHAM_DONG", expectedUpdatedAt: moc(sk) }, 200);
    },
    "POST /api/parties/:id/documents/:did/reveal": async () => {
      const r = await w.call("GET", `/api/parties/${P}/documents`, { as: ADM });
      for (const as of [ADM, SUP]) {
        const x = await w.call("POST", `/api/parties/${P}/documents/${idCua(r, "CCCD")}/reveal`, { as });
        assert.equal(x.status, 200, x.text);
        lanXemSo += x.text; // KHÔNG đưa vào `than` — thân "xem đủ số" là nơi DUY NHẤT được có số
      }
    },
    "GET /api/parties/documents/mine": async () => {
      await goi("giấy tờ của tôi", "GET", "/api/parties/documents/mine", TX, undefined, 200);
    },
    "GET /api/parties/documents/meta": async () => {
      await goi("danh mục giấy tờ", "GET", "/api/parties/documents/meta", ADM, undefined, 200);
    },
    "GET /api/parties/:id/documents": async () => {
      await goi("giấy tờ của một người", "GET", `/api/parties/${P}/documents`, SUP, undefined, 200);
    },
    "POST /api/van-chuyen/xe/:id/giay-to": async () => {
      await goi("thêm giấy tờ xe", "POST", `/api/van-chuyen/xe/${xe}/giay-to`, ADM, { typeCode: "INSPECTION", number: SO_XE, expiryDate: ngay(5) }, 201);
    },
    "POST /api/van-chuyen/xe/:id/giay-to/:did/gia-han": async () => {
      const r = await w.call("GET", `/api/van-chuyen/xe/${xe}`, { as: ADM });
      await goi("gia hạn giấy tờ xe", "POST", `/api/van-chuyen/xe/${xe}/giay-to/${idCua(r, "INSPECTION")}/gia-han`, ADM, { expiryDate: ngay(365) }, 201);
    },
    "POST /api/van-chuyen/xe/:id/giay-to/:did/sua-sai": async () => {
      const r = await w.call("GET", `/api/van-chuyen/xe/${xe}`, { as: ADM });
      const did = idCua(r, "INSPECTION");
      await doi();
      await goi("sửa sai số giấy tờ xe", "POST", `/api/van-chuyen/xe/${xe}/giay-to/${did}/sua-sai`, ADM, { reason: "SAI_SO", value: SO_XE_MOI, expectedUpdatedAt: moc(did, "vc_vehicle_document") }, 200);
    },
  };

  // (1) ĐỦ TUYẾN
  assert.deepEqual(Object.keys(TUYEN).sort(), TUYEN_THAT, "mỗi route giấy tờ thật phải có ca ở TUYEN (và ngược lại)");

  for (const k of Object.keys(TUYEN)) await TUYEN[k]!();
  await goi("hồ sơ người", "GET", `/api/parties/${P}`, ADM, undefined, 200);
  await goi("sắp hết hạn", "GET", "/api/van-chuyen/sap-het-han", ADM, undefined, 200);
  await goi("trang Nhật ký (Toàn quyền)", "GET", "/api/audit?limit=100", SUP, undefined, 200);

  // (2) NHẬT KÝ: không số (người lẫn xe), không nơi cấp; bỏ dấu cách/chấm/gạch cũng không có.
  const nhatKy = JSON.stringify(w.q("SELECT * FROM audit_log"));
  const nhatKyGon = nhatKy.replace(/[\s.\-]/g, "");
  for (const s of [...DAU_SO_NGUOI, ...DAU_SO_XE]) assert.ok(!nhatKy.includes(s) && !nhatKyGon.includes(s.replace(/[\s.\-]/g, "")), `nhật ký lộ "${s}"`);
  for (const noi of [NOI, NOI_MOI]) assert.ok(!nhatKy.includes(noi), `nhật ký lộ nơi cấp "${noi}"`);
  assert.ok(w.q("SELECT count(*) n FROM audit_log WHERE action LIKE 'party_document_%' OR action LIKE 'vehicle_document_%'")[0].n >= 10, "chống bài rỗng: có nhật ký giấy tờ để quét");

  // (3) THÂN TRẢ VỀ (trừ "xem đủ số"): không số của NGƯỜI.
  for (const t of than) for (const s of DAU_SO_NGUOI) assert.ok(!t.text.includes(s), `thân "${t.khoa}" lộ "${s}"`);
  assert.ok(than.some((t) => t.text.includes(NOI)), "chống bài rỗng: nơi cấp CÓ hiện ở danh sách giấy tờ (không phải số)");
  assert.ok(than.some((t) => t.text.includes("••••7665")), "chống bài rỗng: số che có mặt");

  // (4) "xem đủ số" có đúng số.
  assert.ok(lanXemSo.includes(SO_CCCD_MOI), "thân 'xem đủ số' phải có số đầy đủ");
});
