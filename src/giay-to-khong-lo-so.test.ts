// HÀNG RÀO TOÀN TUYẾN — số giấy tờ của NGƯỜI không lọt ra ngoài (ADR-0040 D2: "nhật ký, Bảng tin, thông báo không bao giờ chứa số giấy tờ"; số CCCD, số bằng lái
// luôn che ở mọi DTO mặc định; số đầy đủ CHỈ ở route "xem đủ số"). Kế hoạch Task A16.
//   (1) ĐỦ TUYẾN (siết): tập route thật (phương thức + đường dẫn) của parties + van-chuyen có "/documents" hoặc "/giay-to" trong đường dẫn — lấy từ MÃ THẬT
//       (esbuild, như src/route-access.test.ts) — phải BẰNG tập khoá của TUYEN. Thêm route giấy tờ mới mà quên ca ở đây → đỏ.
//   (2) NHẬT KÝ: toàn bộ audit_log không chứa số đánh dấu nào (người lẫn xe — một luật chung, G4), không chứa nơi cấp đánh dấu.
//   (3) THÂN TRẢ VỀ: mọi lời gọi ở TUYEN trừ "xem đủ số", cộng GET /api/parties/:id, GET /api/van-chuyen/sap-het-han, GET /api/audit (Toàn quyền), không chứa số
//       đánh dấu của NGƯỜI (giấy tờ xe hiện đủ số — không phải dữ liệu cá nhân). Nơi cấp được hiện ở danh sách giấy tờ, KHÔNG ở nhật ký.
//   (4) Chống bài rỗng: thân "xem đủ số" CÓ đúng số.
// Chạy CẢ ứng dụng trên SQLite thật (tests/audit/harness.mjs). Mọi số ở đây là số GIẢ, đánh dấu để dò.
// Bài thứ hai (ADR-0049 Task A18 bước 1): ba route điều phối — GET /chuyen/:id, GET /cuoc-cua-toi/:id, POST …/xuat-ben — thêm luật quét NƠI CẤP (cuối tệp).
import { test } from "node:test";
import assert from "node:assert/strict";
import * as esbuild from "esbuild";
import type { AppModule } from "./shared/router.ts";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { world, seedStaff } from "../tests/audit/harness.mjs";
import { DRIVER, DRIVER2, SALES, batDongHo, denGio, don, setup, taoChuyen, uuid, xe, xepHet } from "../tests/audit/dieu-phoi-khung.mjs";

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
// ADR-0048 D1: tài xế ĐỐI TÁC (vai "Tài xế đối tác", thuộc một nhà xe) cũng có giấy tờ — số đánh dấu riêng, sắp hết hạn để lên danh sách "sắp hết hạn".
const SO_CCCD_DT = "079555444333";
const SO_GPLX_DT = "790555444333";
const SO_XE = "KD-DANHDAU-9";
const SO_XE_MOI = "KD-DANHDAU-8";
/** Mọi dạng lộ của số người: đủ số, 8 ký tự đầu, 8 ký tự cuối (số che chỉ để lộ 4 ký tự cuối). */
const DAU_SO_NGUOI = [SO_CCCD, SO_CCCD_MOI, SO_GPLX, SO_SUC_KHOE, SO_CCCD_DT, SO_GPLX_DT].flatMap((s) => [s, s.slice(0, 8), s.slice(-8)]);
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
  // ADR-0048 D1: tài xế đối tác của một nhà xe, giấy tờ có số đánh dấu, sắp hết hạn → lên danh sách "sắp hết hạn" (nhãn nhà xe, KHÔNG số).
  const tkDt = await w.call("POST", "/api/staff", { as: ADM, body: { fullName: "Tài Xế Đối Tác Dò Số", phone: "0900000096", roles: ["DRIVER_EXTERNAL"] } });
  assert.equal(tkDt.status, 201, tkDt.text);
  const PDT = w.q("SELECT party_id FROM staff WHERE id = ?", tkDt.json.staff.id)[0].party_id as string;
  const nhaXe = (await w.call("POST", "/api/parties", { as: ADM, body: { kind: "ORGANIZATION", displayName: "Nhà Xe Dò Số" } })).json.party.id as string;
  await goi("gán Nhà xe đối tác", "POST", `/api/parties/${nhaXe}/roles`, ADM, { roleTypeCode: "CARRIER" }, 201);
  await goi("Tài xế của", "POST", `/api/parties/${nhaXe}/relationships`, ADM, { fromPartyId: PDT, toPartyId: nhaXe, relationshipTypeCode: "DRIVES_FOR" }, 201);
  await goi("thêm CCCD tài xế đối tác", "POST", `/api/parties/${PDT}/documents`, ADM, { typeCode: "CCCD", number: SO_CCCD_DT, issuedPlace: NOI, expiryDate: ngay(4) }, 201);
  await goi("thêm GPLX tài xế đối tác", "POST", `/api/parties/${PDT}/documents`, ADM, { typeCode: "GPLX", number: SO_GPLX_DT, classCode: "D2", issuedPlace: NOI, expiryDate: ngay(6) }, 201);
  const sapHet = await goi("sắp hết hạn", "GET", "/api/van-chuyen/sap-het-han", ADM, undefined, 200);
  const dongDt = sapHet.json.items.filter((i: any) => i.targetId === PDT);
  assert.equal(dongDt.length, 2, "chống bài rỗng: giấy tờ tài xế đối tác CÓ lên danh sách sắp hết hạn");
  for (const d of dongDt) assert.equal(d.ownerLabel, "Nhà Xe Dò Số", "dòng tài xế đối tác mang nhãn nhà xe (tên, không số)");
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

// ==== BA ROUTE ĐIỀU PHỐI (ADR-0049 Task A18 bước 1 — kế hoạch mục 1.6): GET /chuyen/:id, GET /cuoc-cua-toi/:id, POST …/xuat-ben ===============================
// Tài xế + xe có số giấy tờ đánh dấu, chuyến có ĐIỀU KIỆN giấy tờ (khám sức khoẻ tài xế, phù hiệu xe) — một chuyến đủ (xuất bến ĐẠT), một chuyến thiếu (xuất bến
// bị chặn, DTO kể "còn thiếu"). Thân trả về của ba route: không số của NGƯỜI (mọi dạng), KHÔNG NƠI CẤP (luật quét thêm — phần (3) ở trên chỉ quét số);
// nhật ký + bản chụp xuất bến (`vc_trip_departure_check*`): không số (người lẫn xe), không nơi cấp.
const SO_CCCD_TX = "079444333222";
const SO_SK_TX = "SK444333222";
const SO_CCCD_TX2 = "079444333221";
const SO_PHU_HIEU = "PH-DANHDAU-7";
const NOI_TX = "NOI CAP TAI XE DANH DAU";
/** Số GPLX + nơi cấp khung thử gieo (tests/audit/dieu-phoi-khung.mjs `thanhTaiXe`): tài xế thứ nhất / thứ hai. */
const SO_GPLX_KHUNG = ["791100000001", "791100000002"];
const NOI_KHUNG = "Nơi cấp Dò Tìm";

test("ba route điều phối (chi tiết chuyến, cuốc của tôi, xuất bến) + xe của đơn (ADR-0059): thân không số của người, KHÔNG NƠI CẤP; nhật ký + bản chụp không số, không nơi cấp", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const P1 = `pty-${DRIVER}`;
    const P2 = `pty-${DRIVER2}`;
    for (const [p, body] of [
      [P1, { typeCode: "CCCD", number: SO_CCCD_TX, issuedPlace: NOI_TX, expiryDate: "2035-01-01" }],
      [P1, { typeCode: "HEALTH_CHECK", number: SO_SK_TX, issuedPlace: NOI_TX, expiryDate: "2030-01-01" }],
      [P2, { typeCode: "CCCD", number: SO_CCCD_TX2, issuedPlace: NOI_TX, expiryDate: "2035-01-01" }],
    ] as const) {
      const r = await w.call("POST", `/api/parties/${p}/documents`, { as: SUP, body });
      assert.equal(r.status, 201, r.text);
    }
    for (const body of [{ minCapacity: 10, subject: "DRIVER", documentTypeCode: "HEALTH_CHECK" }, { minCapacity: 10, subject: "VEHICLE", documentTypeCode: "CONTRACT_BADGE" }]) {
      const r = await w.call("POST", "/api/van-chuyen/dieu-kien", { as: SUP, body });
      assert.ok(r.status < 300, r.text);
    }
    const xeDu = xe(w);
    const ph = await w.call("POST", `/api/van-chuyen/xe/${xeDu}/giay-to`, { as: ADM, body: { typeCode: "CONTRACT_BADGE", number: SO_PHU_HIEU, expiryDate: "2030-01-01" } });
    assert.equal(ph.status, 201, ph.text);
    // Chuyến A đủ điều kiện (tài xế một có khám sức khoẻ, xe có phù hiệu); chuyến B thiếu cả hai (tài xế hai, xe không phù hiệu).
    const dA = await don(w, { soNguoi: 2, gio: "13:00" });
    const dB = await don(w, { soNguoi: 2, gio: "13:00" });
    const A = await taoChuyen(w, { xe: xeDu, taiXe: P1 });
    const B = await taoChuyen(w, { xe: xe(w), taiXe: P2 });
    await xepHet(w, A, dA, 2);
    await xepHet(w, B, dB, 2);

    const than: { khoa: string; text: string }[] = [];
    const goi = async (khoa: string, method: string, path: string, as: string, body?: unknown) => {
      const r = await w.call(method, path, { as, body });
      than.push({ khoa, text: r.text });
      return r;
    };
    for (const [k, t] of [["A", A], ["B", B]] as const) {
      assert.equal((await goi(`chi tiết chuyến ${k}`, "GET", `/api/van-chuyen/chuyen/${t.chuyen.id}`, SALES)).status, 200);
      assert.equal((await goi(`chi tiết chuyến ${k} (Toàn quyền)`, "GET", `/api/van-chuyen/chuyen/${t.chuyen.id}`, SUP)).status, 200);
    }
    const cuocB = await goi("cuốc B (thiếu)", "GET", `/api/van-chuyen/cuoc-cua-toi/${B.chuyen.id}`, DRIVER2);
    assert.equal(cuocB.status, 200, cuocB.text);
    assert.ok(cuocB.json.dieuKienConThieu.length >= 2, `chống bài rỗng: cuốc thiếu điều kiện kể "còn thiếu" — ${cuocB.text}`);
    denGio("12:40");
    const xbB = await goi("xuất bến B (thiếu — tài xế)", "POST", `/api/van-chuyen/cuoc-cua-toi/${B.chuyen.id}/xuat-ben`, DRIVER2, { requestId: uuid() });
    assert.equal(xbB.status, 409, `chống bài rỗng: thiếu điều kiện → xuất bến bị chặn — ${xbB.text}`);
    const xbB2 = await goi("xuất bến B (thiếu — văn phòng)", "POST", `/api/van-chuyen/chuyen/${B.chuyen.id}/xuat-ben`, SALES, { requestId: uuid() });
    assert.equal(xbB2.status, 409, xbB2.text);
    const xbA = await goi("xuất bến A (đủ)", "POST", `/api/van-chuyen/cuoc-cua-toi/${A.chuyen.id}/xuat-ben`, DRIVER, { requestId: uuid() });
    assert.equal(xbA.status, 200, xbA.text);
    assert.equal((await goi("cuốc A sau xuất bến", "GET", `/api/van-chuyen/cuoc-cua-toi/${A.chuyen.id}`, DRIVER)).status, 200);
    assert.equal((await goi("chi tiết A sau xuất bến", "GET", `/api/van-chuyen/chuyen/${A.chuyen.id}`, SALES)).status, 200);
    // ADR-0059: xe trên chi tiết đơn có TÊN tài xế — thân không số giấy tờ, không nơi cấp của người.
    const xeDon = await goi("xe của đơn A (ADR-0059)", "GET", `/api/van-chuyen/xe-cua-don/${dA.id}`, SALES);
    assert.equal(xeDon.status, 200, xeDon.text);
    assert.ok(xeDon.json.chang[0].xe[0].tenTaiXe, "chống bài rỗng: có tên tài xế");
    const chup = w.q("SELECT id, ket_qua FROM vc_trip_departure_check WHERE trip_id = ?", A.chuyen.id);
    assert.deepEqual(chup.map((c: any) => c.ket_qua), ["DAT"]);
    const muc = w.q("SELECT * FROM vc_trip_departure_check_item WHERE check_id = ?", chup[0].id);
    assert.ok(muc.length >= 5, `chống bài rỗng: bản chụp có GPLX + khám sức khoẻ + Kiểm định + Bảo hiểm + phù hiệu (${muc.length})`);

    const soNguoi = [SO_CCCD_TX, SO_SK_TX, SO_CCCD_TX2, ...SO_GPLX_KHUNG].flatMap((s) => [s, s.slice(0, 8), s.slice(-8)]);
    const noiCap = [NOI_TX, NOI_KHUNG];
    // Thân của ba route: không số người, không nơi cấp.
    for (const t of than) {
      for (const s of soNguoi) assert.ok(!t.text.includes(s), `thân "${t.khoa}" lộ số "${s}"`);
      for (const n of noiCap) assert.ok(!t.text.includes(n), `thân "${t.khoa}" lộ nơi cấp "${n}"`);
    }
    // Nhật ký + bản chụp: không số (người lẫn xe), không nơi cấp; bỏ dấu cách / chấm / gạch cũng không có.
    for (const [ten, dl] of [["nhật ký", w.q("SELECT * FROM audit_log")], ["bản chụp xuất bến", [...w.q("SELECT * FROM vc_trip_departure_check"), ...w.q("SELECT * FROM vc_trip_departure_check_item")]]] as const) {
      const txt = JSON.stringify(dl);
      const gon = txt.replace(/[\s.\-]/g, "");
      for (const s of [...soNguoi, SO_PHU_HIEU, "DANHDAU"]) assert.ok(!txt.includes(s) && !gon.includes(s.replace(/[\s.\-]/g, "")), `${ten} lộ số "${s}"`);
      for (const n of noiCap) assert.ok(!txt.includes(n), `${ten} lộ nơi cấp "${n}"`);
    }
  } finally {
    tat();
  }
});

test("ADR-0068 G8/G10: gộp hồ sơ — xem trước, phản hồi gộp, câu lỗi, nhật ký KHÔNG chứa số giấy tờ; số đi đúng sang hồ sơ chính (xem đủ số)", async () => {
  const w = world();
  seedStaff(w.sqlite, { id: SUP, phone: "0900000007", name: "Chủ", perms: ["SUPER_ADMIN"] });
  const tao = async (ten: string) => (await w.call("POST", "/api/parties", { as: SUP, body: { kind: "PERSON", fullName: ten, contacts: [] } })).json.party.id as string;
  const A = await tao("Gộp Dò Số");
  const B = await tao("Gộp Dò Số Chính");
  assert.equal((await w.call("POST", `/api/parties/${A}/documents`, { as: SUP, body: { typeCode: "CCCD", number: SO_CCCD, issuedPlace: NOI, expiryDate: "2035-01-01" } })).status, 201);
  assert.equal((await w.call("POST", `/api/parties/${A}/documents`, { as: SUP, body: { typeCode: "GPLX", number: SO_GPLX, classCode: "D2", expiryDate: "2031-01-01" } })).status, 201);
  const than: string[] = [];
  const p = await w.call("POST", `/api/parties/${A}/merge/preview`, { as: SUP, body: { intoPartyId: B } });
  assert.equal(p.status, 200, p.text);
  than.push(p.text);
  assert.deepEqual(p.json.chuyen.filter((x: any) => x.loai === "GIAY_TO").map((x: any) => x.nhan).sort(), ["Căn cước công dân (CCCD)", "Giấy phép lái xe Hạng D2"]);
  const sai = await w.call("POST", `/api/parties/${A}/merge`, { as: SUP, body: { intoPartyId: B, xacNhan: "sai tên" } });
  assert.equal(sai.status, 409, sai.text);
  than.push(sai.text);
  const r = await w.call("POST", `/api/parties/${A}/merge`, { as: SUP, body: { intoPartyId: B, xacNhan: "Gộp Dò Số" } });
  assert.equal(r.status, 200, r.text);
  than.push(r.text);
  than.push((await w.call("GET", `/api/parties/${A}`, { as: SUP })).text, (await w.call("GET", `/api/parties/${B}`, { as: SUP })).text);
  const nhatKy = JSON.stringify(w.q("SELECT detail FROM audit_log"));
  for (const s of [...than, nhatKy]) for (const dau of DAU_SO_NGUOI) assert.ok(!s.includes(dau), `lộ số ${dau}`);
  assert.ok(!nhatKy.includes(NOI), "nơi cấp không vào nhật ký");
  // Kế hoạch R5: bảng giấy tờ không có cột lý do — lý do huỷ dòng ở hồ sơ phụ nằm ở chi tiết nhật ký party_merged.
  assert.match(w.q("SELECT detail FROM audit_log WHERE action = 'party_merged' AND target_id = ?", A)[0].detail, /đã gộp vào hồ sơ khác/);
  const cccdB = w.q("SELECT id FROM pty_person_document WHERE party_id = ? AND document_type_code = 'CCCD'", B)[0].id;
  const xem = await w.call("POST", `/api/parties/${B}/documents/${cccdB}/reveal`, { as: SUP, body: {} });
  assert.equal(xem.json.number, SO_CCCD, "chống bài rỗng: số thật đã sang hồ sơ chính");
});
