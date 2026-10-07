// C51 bổ sung: "Kết thúc gián đoạn" có đóng suất Vắng (NO_SHOW) không → xếp lại sang xe 2 được không. Dữ liệu GIẢ, D1 tạm.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, DRIVER2, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donRieng, tom, log, uuid } from "../sc-vanhanh/helpers.mjs";
const ver = async (w, id) => (await chiTiet(w, id, ADM)).chuyen.version;
test("C51b vắng rồi kết thúc gián đoạn", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000061", tenKhach: "Khách A" });
    const t1 = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    const t2 = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER2}`, bd: "13:30", kt: "16:00" })).chuyen.id;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo`, { as: SALES, body: { version: await ver(w, t1), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }] } })).status, 200);
    denGio("12:35"); assert.equal((await tienDo(w, "tai-xe", t1, "xuat-ben")).status, 200);
    const ct = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}`, { as: DRIVER })).json;
    const dA = ct.diem.find((d) => d.loai === "PICKUP");
    const s = ct.suat.filter((x) => x.loai === "PASSENGER").map((x) => x.id);
    denGio("13:00"); assert.equal((await tienDo(w, "tai-xe", t1, `diem/${dA.id}/da-toi`)).status, 200);
    denGio("13:05"); assert.equal((await tienDo(w, "tai-xe", t1, `phan-bo/${s[0]}/vang`)).status, 200);
    denGio("13:06"); assert.equal((await tienDo(w, "tai-xe", t1, `phan-bo/${s[1]}/don`)).status, 200);
    const kq = {};
    denGio("13:10"); kq.gian_doan = tom(await tienDo(w, "tai-xe", t1, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_KHAC" }));
    if (kq.gian_doan.status !== 200) kq.gian_doan_xe_hong = tom(await tienDo(w, "tai-xe", t1, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }));
    kq.suat_t1 = w.q("SELECT status, valid_to_at IS NOT NULL dong, close_reason FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER'", t1);
    kq.xep_lai_ca_2_sang_t2_ADM_pha_le = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t2}/phan-bo`, { as: ADM, body: { version: await ver(w, t2), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    kq.xep_lai_1_sang_t2_ADM_pha_le = tom(await w.call("POST", `/api/van-chuyen/chuyen/${t2}/phan-bo`, { as: ADM, body: { version: await ver(w, t2), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 1 }], phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    kq.suat_t2 = w.q("SELECT status, valid_to_at IS NOT NULL dong FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER'", t2);
    log("C51b.ket_qua", kq);
  } finally { tat(); }
});
