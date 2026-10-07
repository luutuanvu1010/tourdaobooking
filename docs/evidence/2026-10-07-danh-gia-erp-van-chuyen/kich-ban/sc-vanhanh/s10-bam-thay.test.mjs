// S10 — Văn phòng bấm thay tài xế với "xảy ra lúc": hai trục giờ, kẹp lùi, giờ tương lai, trước mốc trước, quyền.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, ACC, DRIVER, FIELD, NGAY, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, vnLuc, uuid } from "./helpers.mjs";

const T = (gio) => `${NGAY}T${gio}:00+07:00`;
test("S10 văn phòng bấm thay", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000051", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 1, gio: "13:30", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000052", tenKhach: "Khách B" });
    const c = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
    const id = c.chuyen.id;
    const v = (await chiTiet(w, id)).chuyen.version;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${id}/phan-bo`, { as: SALES, body: { version: v, requestId: uuid(), chang: [A, B].map((d) => ({ legId: d.legId, soSuat: d.soNguoi })) } })).status, 200);
    log("S10.chinh_sach", w.q("SELECT proxy_backdate_max_minutes, min_lead_minutes FROM vc_dispatch_policy"));
    const kq = {};
    denGio("12:40");
    kq.taiXe_gui_xayRaLuc = tom(await tienDo(w, "tai-xe", id, "xuat-ben", { xayRaLuc: T("12:35") }));
    kq.ACC_xuat_ben = tom(await tienDo(w, "van-phong", id, "xuat-ben", {}, ACC));
    kq.FIELD_xuat_ben = tom(await tienDo(w, "van-phong", id, "xuat-ben", {}, FIELD));
    kq.SALES_xuatBen_tuong_lai = tom(await tienDo(w, "van-phong", id, "xuat-ben", { xayRaLuc: T("12:50") }, SALES));
    kq.SALES_xuatBen_khong_mui_gio = tom(await tienDo(w, "van-phong", id, "xuat-ben", { xayRaLuc: `${NGAY}T12:35:00` }, SALES));
    kq.SALES_xuatBen_12_35 = tom(await tienDo(w, "van-phong", id, "xuat-ben", { xayRaLuc: T("12:35") }, SALES));
    const ct = await chiTiet(w, id, SALES);
    kq.gioSomNhatKhai = ct.gioSomNhatKhai;
    const pA = ct.diem.find((d) => d.tenNoi === "Khách sạn A"), pB = ct.diem.find((d) => d.tenNoi === "Khách sạn B");
    const sA = ct.suat.filter((s) => s.maDon === A.code).map((s) => s.id), sB = ct.suat.filter((s) => s.maDon === B.code).map((s) => s.id);
    // Tới A: khai trước giờ xuất bến (12:30 < 12:35) → ?
    denGio("12:45");
    kq.ADM_daToi_truoc_xuat_ben = tom(await tienDo(w, "van-phong", id, `diem/${pA.id}/da-toi`, { xayRaLuc: T("12:30") }, ADM));
    kq.ADM_daToi_12_42 = tom(await tienDo(w, "van-phong", id, `diem/${pA.id}/da-toi`, { xayRaLuc: T("12:42") }, ADM));
    // Đón A không khai giờ (văn phòng bấm thay, giờ = lúc bấm).
    denGio("12:46");
    kq.SALES_don_khong_khai = tom(await tienDo(w, "van-phong", id, `phan-bo/${sA[0]}/don`, {}, SALES));
    // Tài xế mất sóng tới 16:30, văn phòng ghi lại hết: khai lùi quá 180 phút → ?
    denGio("16:30");
    kq.SALES_don_A1_lui_qua_kep_13_00 = tom(await tienDo(w, "van-phong", id, `phan-bo/${sA[1]}/don`, { xayRaLuc: T("13:00") }, SALES));
    kq.SALES_don_A1_lui_trong_kep_13_35 = tom(await tienDo(w, "van-phong", id, `phan-bo/${sA[1]}/don`, { xayRaLuc: T("13:35") }, SALES));
    kq.SALES_daToi_B_13_40 = tom(await tienDo(w, "van-phong", id, `diem/${pB.id}/da-toi`, { xayRaLuc: T("13:40") }, SALES));
    // Khai giờ ĐÓN B TRƯỚC giờ tới B (13:38 < 13:40) → ?
    kq.SALES_don_B_truoc_daToi = tom(await tienDo(w, "van-phong", id, `phan-bo/${sB[0]}/don`, { xayRaLuc: T("13:38") }, SALES));
    kq.SALES_vang_B_13_45 = tom(await tienDo(w, "van-phong", id, `phan-bo/${sB[0]}/vang`, { xayRaLuc: T("13:45") }, SALES));
    // Trả: phải tới bến
    const pT = ct.diem.find((d) => d.loai === "DROPOFF");
    kq.SALES_daToi_ben_14_10 = tom(await tienDo(w, "van-phong", id, `diem/${pT.id}/da-toi`, { xayRaLuc: T("14:10") }, SALES));
    for (const s of sA) kq[`SALES_tra_${s.slice(0, 4)}`] = tom(await tienDo(w, "van-phong", id, `phan-bo/${s}/tra`, { xayRaLuc: T("14:12") }, SALES));
    kq.SALES_ketThuc_14_20 = tom(await tienDo(w, "van-phong", id, "ket-thuc", { xayRaLuc: T("14:20") }, SALES));
    log("S10.ket_qua", kq);
    log("S10.sqlite.su_kien", w.q("SELECT kind, occurred_at, created_at, occurred_source, policy_id IS NOT NULL co_cs, created_by FROM vc_trip_event WHERE trip_id = ? AND kind NOT IN ('CREATED','ALLOCATED') ORDER BY created_at, rowid", id)
      .map((e) => ({ kind: e.kind, xayRa: vnLuc(e.occurred_at), ghiNhan: vnLuc(e.created_at), nguon: e.occurred_source, co_cs: e.co_cs, nguoi: e.created_by.slice(0, 8) })));
    log("S10.sqlite.trip", w.q("SELECT status, departed_at, ended_at FROM vc_trip WHERE id = ?", id).map((t) => ({ ...t, departed_vn: vnLuc(t.departed_at), ended_vn: vnLuc(t.ended_at) })));
    log("S10.audit_detail", w.q("SELECT action, detail FROM audit_log WHERE target_id = ? AND action NOT IN ('trip_created','trip_allocated') ORDER BY created_at, rowid", id));
    // Tài xế thấy gì về mốc do văn phòng bấm (có khai / không khai).
    const tx = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${id}`, { as: DRIVER })).json;
    log("S10.dto_tai_xe_moc", { xuatBen: tx.chuyen.xuatBen, diem: tx.diem.map((d) => ({ tenNoi: d.tenNoi, daToi: d.daToi })), suat: tx.suat.map((s) => ({ maDon: s.maDon, trangThai: s.trangThai, daDon: s.daDon })) });
  } finally { tat(); }
});
