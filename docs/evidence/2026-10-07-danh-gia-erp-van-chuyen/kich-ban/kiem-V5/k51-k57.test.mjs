// Người kiểm phản biện V5 — C51 (khách Vắng có xếp lại sang xe khác được không) và C57 (màn "Kết thúc chuyến" vs máy chủ khi cả đoàn vắng).
// CHỈ ĐỌC repo; D1 tạm của khung thử. Dữ liệu GIẢ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, DRIVER2, NGAY, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo } from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donRieng, tom, log, uuid } from "../sc-vanhanh/helpers.mjs";
import { ketThucDuoc } from "../../../../../src/shared/tien-do-man.ts";

const ver = async (w, id) => (await chiTiet(w, id, ADM)).chuyen.version;
const changLich = async (w, legId) => {
  const r = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
  const c = r.json.chang?.find((x) => x.legId === legId);
  return c ? { trangThai: c.trangThai, soNguoi: c.soNguoi, soDaXep: c.soDaXep, nhan: c.nhan } : { khong_thay: true, status: r.status };
};

test("C51 khách Vắng trên xe 1 → xếp lại sang xe 2 (xe 1 đang chạy, rồi đã kết thúc)", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000041", tenKhach: "Khách A" });
    const t1 = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    const t2 = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER2}`, bd: "13:30", kt: "16:00" })).chuyen.id;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo`, { as: SALES, body: { version: await ver(w, t1), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }] } })).status, 200);
    denGio("12:35");
    assert.equal((await tienDo(w, "tai-xe", t1, "xuat-ben")).status, 200);
    const ct = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}`, { as: DRIVER })).json;
    const dA = ct.diem.find((d) => d.loai === "PICKUP"), dT = ct.diem.find((d) => d.loai === "DROPOFF");
    const s = ct.suat.filter((x) => x.loai === "PASSENGER").map((x) => x.id);
    denGio("13:00"); assert.equal((await tienDo(w, "tai-xe", t1, `diem/${dA.id}/da-toi`)).status, 200);
    denGio("13:05"); assert.equal((await tienDo(w, "tai-xe", t1, `phan-bo/${s[0]}/vang`)).status, 200);
    denGio("13:06"); assert.equal((await tienDo(w, "tai-xe", t1, `phan-bo/${s[1]}/don`)).status, 200);
    const kq = {};
    kq.lich_chang_A_sau_vang = await changLich(w, A.legId);
    kq.suat_t1_sau_vang = w.q("SELECT status, valid_to_at IS NOT NULL dong, close_reason, passenger_key IS NOT NULL co_ten FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER'", t1);
    const xep = async (as, extra = {}) => tom(await w.call("POST", `/api/van-chuyen/chuyen/${t2}/phan-bo`, { as, body: { version: await ver(w, t2), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 1 }], ...extra } }));
    kq.t1_RUNNING_xep_1_suat_sang_t2_SALES = await xep(SALES);
    kq.t1_RUNNING_xep_1_suat_sang_t2_ADM_pha_le = await xep(ADM, { phaLe: { lyDo: "PHA_LE_SU_CO" } });
    // Kết thúc xe 1 bình thường: trả khách đã đón.
    denGio("13:30"); kq.t1_den_ben = tom(await tienDo(w, "tai-xe", t1, `diem/${dT.id}/da-toi`));
    denGio("13:31"); kq.t1_tra = tom(await tienDo(w, "tai-xe", t1, `phan-bo/${s[1]}/tra`));
    denGio("13:32"); kq.t1_ket_thuc = tom(await tienDo(w, "tai-xe", t1, "ket-thuc"));
    kq.suat_t1_sau_ket_thuc = w.q("SELECT status, valid_to_at IS NOT NULL dong, close_reason FROM vc_trip_allocation WHERE trip_id = ? AND kind = 'PASSENGER'", t1);
    kq.lich_chang_A_sau_ket_thuc = await changLich(w, A.legId);
    kq.t1_ENDED_xep_1_suat_sang_t2_SALES = await xep(SALES);
    kq.t1_ENDED_xep_1_suat_sang_t2_ADM_pha_le = await xep(ADM, { phaLe: { lyDo: "PHA_LE_SU_CO" } });
    log("C51.ket_qua", kq);
  } finally {
    tat();
  }
});

test("C57 cả đoàn của điểm trả vắng → nút màn vs máy chủ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Villa riêng", lienHe: "LH R", sdt: "0911000051", tenKhach: "Đoàn R" });
    const t1 = (await taoChuyen(w, { xe: xe(w, 7), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo`, { as: SALES, body: { version: await ver(w, t1), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }] } })).status, 200);
    denGio("12:35");
    assert.equal((await tienDo(w, "tai-xe", t1, "xuat-ben")).status, 200);
    const ct = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}`, { as: DRIVER })).json;
    const dA = ct.diem.find((d) => d.loai === "PICKUP"), dT = ct.diem.find((d) => d.loai === "DROPOFF");
    const s = ct.suat.filter((x) => x.loai === "PASSENGER").map((x) => x.id);
    denGio("13:00"); assert.equal((await tienDo(w, "tai-xe", t1, `diem/${dA.id}/da-toi`)).status, 200);
    denGio("13:10"); assert.equal((await tienDo(w, "tai-xe", t1, `phan-bo/${s[0]}/vang`)).status, 200);
    denGio("13:11"); assert.equal((await tienDo(w, "tai-xe", t1, `phan-bo/${s[1]}/vang`)).status, 200);
    const sau = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t1}`, { as: DRIVER })).json;
    const kq = {};
    kq.diem_sau_vang_het = sau.diem.map((d) => ({ loai: d.loai, trangThai: d.trangThai }));
    kq.man_ketThucDuoc = ketThucDuoc(sau.suat);
    denGio("13:12"); kq.may_chu_ket_thuc_tai_xe = tom(await tienDo(w, "tai-xe", t1, "ket-thuc"));
    kq.may_chu_ket_thuc_van_phong_ADM = tom(await tienDo(w, "van-phong", t1, "ket-thuc", {}, ADM));
    // Đường màn có sẵn: "Đã trả" ở điểm trả (0 khách) → hộp "Vẫn ghi đã tới" → lệnh da-toi ở điểm trả.
    denGio("13:13"); kq.da_toi_diem_tra_0_khach = tom(await tienDo(w, "tai-xe", t1, `diem/${dT.id}/da-toi`));
    kq.diem_sau_da_toi_tra = w.q("SELECT kind, status FROM vc_trip_stop WHERE trip_id = ? ORDER BY seq", t1);
    denGio("13:14"); kq.ket_thuc_sau_da_toi_tra = tom(await tienDo(w, "tai-xe", t1, "ket-thuc"));
    log("C57.ket_qua", kq);
  } finally {
    tat();
  }
});
