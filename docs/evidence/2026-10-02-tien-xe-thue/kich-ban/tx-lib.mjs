// Dữ liệu thử dùng chung cho ba kịch bản Chrome tiền xe thuê (Đợt 4 G1, G2, G4 — bản vẽ docs/design/van-chuyen-dot-3-7/Chi phí xe thuê.dc.html). Dựng trên D1 TẠM
// của `dungMoiTruong` (../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs). Nhà xe / tài xế / xe chèn bằng SQL (chưa có màn tạo nhà xe kèm vai CARRIER — khuôn
// tests/e2e/tien-xe-thue.mjs, CÓ dòng pty_organization để R-N1-2 không đỏ); tuyến, cỡ, giá, chuyến, chi phí đi ĐƯỜNG THẬT (route API). Mọi tên, biển số, số giấy
// tờ là GIẢ. Kế toán ghi danh mục + giá (ô transport.rate.manage); Quản trị tạo chuyến (ô trip.dispatch).
import { randomUUID } from "node:crypto";
import { ACCOUNTS, assert, vnDate } from "../../2026-09-29-adr-0049/kich-ban/dp-lib.mjs";

const AT = new Date().toISOString();
let so = 0;

export function nhaXe(env, ten, { thoi = false } = {}) {
  const id = randomUUID();
  env.sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'ORGANIZATION', '${ten}', 1, '${AT}', '${AT}')`);
  env.sql(`INSERT INTO pty_organization (party_id, legal_name, created_at, updated_at) VALUES ('${id}', '${ten}', '${AT}', '${AT}')`);
  env.sql(`INSERT INTO pty_party_role (id, party_id, role_type_code, location_id, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${id}', 'CARRIER', NULL, '2026-01-01', '${AT}', '${AT}')`);
  return { id, ten, thoi: () => env.sql(`UPDATE pty_party_role SET valid_to_date = '${vnDate(-1)}' WHERE party_id = '${id}' AND role_type_code = 'CARRIER' AND valid_to_date IS NULL`) };
}

export function taiXe(env, carrierId, ten) {
  const id = randomUUID();
  so++;
  env.sql(`INSERT INTO pty_party (id, party_kind, display_name, active, created_at, updated_at) VALUES ('${id}', 'PERSON', '${ten}', 1, '${AT}', '${AT}')`);
  env.sql(`INSERT INTO pty_person (party_id, given_name, created_at, updated_at) VALUES ('${id}', '${ten}', '${AT}', '${AT}')`);
  env.sql(`INSERT INTO pty_party_relationship (id, from_party_id, to_party_id, relationship_type_code, valid_from_date, created_at, updated_at) VALUES ('${randomUUID()}', '${id}', '${carrierId}', 'DRIVES_FOR', '2026-01-01', '${AT}', '${AT}')`);
  const so10 = `79330000${String(so).padStart(2, "0")}`;
  env.sql(`INSERT INTO pty_person_document (id, party_id, document_type_code, document_number, number_key, issued_place, license_class_code, expiry_date, created_at, updated_at)
    VALUES ('${randomUUID()}', '${id}', 'GPLX', '${so10}', '${so10}', 'Nơi cấp thử', 'D', '${vnDate(400)}', '${AT}', '${AT}')`);
  return id;
}

export function xe(env, carrierId, bien, cho) {
  const id = randomUUID();
  const key = bien.replace(/[^0-9A-Z]/g, "");
  env.sql(`INSERT INTO vc_vehicle (id, plate_number, plate_key, chassis_number, chassis_key, name, model_year, passenger_capacity, owner_party_id, status, valid_from_date, created_at, updated_at)
    VALUES ('${id}', '${bien}', '${key}', 'TX${key}', 'TX${key}', 'Xe nhà xe thử', 2021, ${cho}, '${carrierId}', 'active', '2026-01-01', '${AT}', '${AT}')`);
  for (const loai of ["INSPECTION", "TPL_INSURANCE"]) {
    env.sql(`INSERT INTO vc_vehicle_document (id, vehicle_id, document_type_code, expiry_date, created_at, updated_at) VALUES ('${randomUUID()}', '${id}', '${loai}', '${vnDate(400)}', '${AT}', '${AT}')`);
  }
  return id;
}

/**
 * Nền chung: hai nhà xe đang hợp tác (Phúc Thành, Minh Tâm) + một đã thôi còn giá mở (Hoàng Long); tuyến (bản vẽ) + một tuyến ngưng; cỡ 4–7, 10–16, 17–28,
 * 29–35, 45 (ngưng); giá theo bản vẽ (đủ tuyến + cỡ — ADR-0095 Q3). Trả mã để kịch bản dùng.
 */
export async function dungNenGia(env, call) {
  const dung = (r, ma, viec) => assert.equal(r.status, ma, `${viec}: ${r.status} ${r.text}`);
  const PT = nhaXe(env, "Nhà xe Phúc Thành");
  const MT = nhaXe(env, "Nhà xe Minh Tâm");
  const HL = nhaXe(env, "Nhà xe Hoàng Long");
  const tuyen = {};
  for (const [k, ten] of [["CR", "Nha Trang – sân bay Cam Ranh"], ["BB", "Nha Trang – Bình Ba"], ["VP", "Nha Trang – Vinpearl"], ["HT", "Nha Trang – Hòn Tằm"], ["DM", "Nha Trang – Đầm Môn"]]) {
    const r = await call(ACCOUNTS.accounting, "POST", "/api/van-chuyen/tuyen", { ten });
    dung(r, 201, `tuyến ${ten}`);
    tuyen[k] = r.json.tuyen.find((t) => t.ten === ten).ma;
  }
  dung(await call(ACCOUNTS.accounting, "PUT", `/api/van-chuyen/tuyen/${tuyen.HT}`, { dangDung: false }), 200, "ngưng Hòn Tằm");
  const co = {};
  for (const [k, tu, den] of [["C7", 4, 7], ["C16", 10, 16], ["C28", 17, 28], ["C35", 29, 35], ["C45", 45, 45]]) {
    const r = await call(ACCOUNTS.accounting, "POST", "/api/van-chuyen/co-xe", { tuSoKhach: tu, denSoKhach: den });
    dung(r, 201, `cỡ ${tu}-${den}`);
    co[k] = r.json.coXe.find((c) => c.tuSoKhach === tu && c.denSoKhach === den && c.dangDung).ma;
  }
  dung(await call(ACCOUNTS.accounting, "PUT", `/api/van-chuyen/co-xe/${co.C45}`, { dangDung: false }), 200, "ngưng cỡ 45");
  const gia = async (nx, t, c, soTien, tuNgay, denNgay = null, ghiChu = null) => {
    const r = await call(ACCOUNTS.accounting, "POST", "/api/van-chuyen/bang-gia", { requestId: randomUUID(), nhaXePartyId: nx.id, tuyen: t, coXe: c, soTien, tuNgay, denNgay, ghiChu, thayDongId: null });
    dung(r, 201, `giá ${soTien}`);
    return r.json.dong.id;
  };
  const nam = Number(vnDate(0).slice(0, 4));
  const G = {
    crMoi: await gia(PT, tuyen.CR, co.C16, 450_000, `${nam}-07-01`, null, "Giá một chiều"),
    crCu: await gia(PT, tuyen.CR, co.C16, 400_000, `${nam}-01-01`, `${nam}-06-30`, "Giá cũ"),
    cr35: await gia(PT, tuyen.CR, co.C35, 1_100_000, `${nam}-07-01`, null, "Xe lớn"),
    bbSap: await gia(PT, tuyen.BB, co.C35, 1_600_000, vnDate(30), null, "Mùa cao điểm"),
    vp7: await gia(PT, tuyen.VP, co.C7, 350_000, `${nam}-07-01`),
    mtBB: await gia(MT, tuyen.BB, co.C16, 1_600_000, `${nam}-01-01`),
    hlCR: await gia(HL, tuyen.CR, co.C16, 500_000, `${nam}-01-01`),
  };
  HL.thoi();
  return { PT, MT, HL, tuyen, co, G };
}
