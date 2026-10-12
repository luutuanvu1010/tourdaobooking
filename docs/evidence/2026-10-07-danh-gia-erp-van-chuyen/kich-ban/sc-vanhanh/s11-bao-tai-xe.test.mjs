// S11 — Báo tài xế sau mỗi thay đổi: hộp thông báo (GET /api/thong-bao) của DRIVER / DRIVER2 / SALES + số lời gọi hàm tiêm baoThayDoiChuyen (Bảng tin).
import { test, mock } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, DRIVER2, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, uuid } from "./helpers.mjs";

test("S11 tin cho tài xế", async () => {
  const tat = batDongHo();
  try {
    const goi = [];
    const w = setup({ ghiDe: { baoThayDoiChuyen: async (_env, _a, e) => void goi.push(e) } });
    const daThay = { [DRIVER]: new Set(), [DRIVER2]: new Set(), [SALES]: new Set() };
    const buoc = [];
    async function sau(nhan, kq) {
      const moi = {};
      for (const ai of [DRIVER, DRIVER2, SALES]) {
        const r = await w.call("GET", "/api/thong-bao", { as: ai });
        const tin = (r.json?.tin ?? []).filter((t) => t.loai === "chuyen" || /chuyến/.test(t.cau ?? ""));
        const m = tin.filter((t) => !daThay[ai].has(t.id ?? t.cau + t.luc));
        m.forEach((t) => daThay[ai].add(t.id ?? t.cau + t.luc));
        moi[ai === DRIVER ? "DRIVER" : ai === DRIVER2 ? "DRIVER2" : "SALES"] = m.map((t) => t.cau);
      }
      buoc.push({ nhan, kq: kq ? tom(kq) : null, soLoiGoiBangTin: goi.length, tinMoi: moi });
      goi.length = 0;
      // Tiến đồng hồ 1 phút sau mỗi bước — tránh hai sự kiện trùng ĐÚNG mili-giây (tin-chuyen.ts so chuỗi ISO; trùng ms chỉ có ở đồng hồ giả).
      if (Date.now() < Date.parse("2027-03-11T06:30:00+07:00")) mock.timers.tick(60_000);
    }
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000061", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 2, gio: "13:20", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000062", tenKhach: "Khách B" });
    const E = await donRieng(w, { soNguoi: 2, gio: "13:40", noiDon: "Khách sạn E", lienHe: "LH E", sdt: "0911000063", tenKhach: "Khách E" });
    await sau("0. tạo đơn (chưa có chuyến)");
    const ver = async (id) => (await chiTiet(w, id, ADM)).chuyen.version;
    const xe1 = xe(w, 15), xe2 = xe(w, 15), xe3 = xe(w, 15);
    const t1 = (await taoChuyen(w, { xe: xe1, taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    await sau("1. tạo chuyến T1 cho DRIVER");
    await sau("2. xếp 2 khách A lên T1 (chưa chạy)", await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo`, { as: SALES, body: { version: await ver(t1), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }] } }));
    await sau("3. sửa giờ kết thúc T1", await w.call("PUT", `/api/van-chuyen/chuyen/${t1}`, { as: SALES, body: { version: await ver(t1), requestId: uuid(), ketThuc: { ngay: "2027-03-11", gio: "15:30" } } }));
    const sA = (await chiTiet(w, t1, ADM)).suat.filter((s) => s.maDon === A.code).map((s) => s.id);
    await sau("4. rút 1 khách A khỏi T1", await w.call("POST", `/api/van-chuyen/chuyen/${t1}/rut`, { as: SALES, body: { version: await ver(t1), requestId: uuid(), suatIds: [sA[1]] } }));
    await sau("4b. xếp lại khách A vừa rút", await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo`, { as: SALES, body: { version: await ver(t1), requestId: uuid(), chang: [{ legId: A.legId, soSuat: 1 }] } }));
    const t2 = (await taoChuyen(w, { xe: xe2, taiXe: `pty-${DRIVER2}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    await sau("5. tạo chuyến T2 cho DRIVER2");
    await sau("6. xếp B lên T2", await w.call("POST", `/api/van-chuyen/chuyen/${t2}/phan-bo`, { as: SALES, body: { version: await ver(t2), requestId: uuid(), chang: [{ legId: B.legId, soSuat: 2 }] } }));
    const sB = (await chiTiet(w, t2, ADM)).suat.filter((s) => s.maDon === B.code).map((s) => s.id);
    await sau("7. dời 2 khách B từ T2 (DRIVER2) sang T1 (DRIVER)", await w.call("POST", `/api/van-chuyen/chuyen/${t2}/doi`, { as: SALES, body: { version: await ver(t2), requestId: uuid(), denChuyenId: t1, denVersion: await ver(t1), suatIds: sB } }));
    const t3 = (await taoChuyen(w, { xe: xe3, taiXe: `pty-${DRIVER2}`, bd: "16:00", kt: "17:00" })).chuyen.id;
    await sau("8. tạo chuyến T3 cho DRIVER2");
    await sau("9. đổi tài xế T3: DRIVER2 → DRIVER", await w.call("PUT", `/api/van-chuyen/chuyen/${t3}`, { as: SALES, body: { version: await ver(t3), requestId: uuid(), taiXePartyId: `pty-${DRIVER}` } }));
    await sau("10. huỷ T3", await w.call("POST", `/api/van-chuyen/chuyen/${t3}/huy`, { as: SALES, body: { version: await ver(t3), requestId: uuid(), lyDo: "HUY_KHAC" } }));
    await sau("11. huỷ T2 (rỗng, DRIVER2)", await w.call("POST", `/api/van-chuyen/chuyen/${t2}/huy`, { as: SALES, body: { version: await ver(t2), requestId: uuid(), lyDo: "HUY_KHONG_CON_KHACH" } }));
    // Đơn đổi giờ đón sau khi đã xếp (bán hàng sửa đơn) — có báo tài xế không?
    const donA = await w.call("GET", `/api/orders/${A.id}`, { as: SALES });
    buoc.push({ nhan: "11b. (đọc đơn A để biết cách sửa giờ đón)", kq: { status: donA.status, khoa: Object.keys(donA.json ?? {}) } });
    denGio("12:35");
    await sau("12. DRIVER xuất bến T1", await tienDo(w, "tai-xe", t1, "xuat-ben"));
    denGio("12:36");
    await sau("13. ADM thêm điểm E khi xe chạy (phá lệ)", await w.call("POST", `/api/van-chuyen/chuyen/${t1}/them-diem`, { as: ADM, body: { version: await ver(t1), requestId: uuid(), chang: [{ legId: E.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } } }));
    denGio("12:37");
    const ct = await chiTiet(w, t1, ADM);
    const sE = ct.suat.filter((s) => s.maDon === E.code).map((s) => s.id);
    await sau("14. SALES báo huỷ 1 khách E", await w.call("POST", `/api/van-chuyen/chuyen/${t1}/phan-bo/${sE[0]}/bao-huy`, { as: SALES, body: { version: await ver(t1), requestId: uuid(), lyDo: "BAO_HUY_KHONG_DI" } }));
    denGio("12:38");
    const pts = ct.diem.filter((d) => d.loai === "PICKUP" && d.trangThai === "PENDING");
    await sau("15. SALES đổi thứ tự điểm khi xe chạy", await tienDo(w, "van-phong", t1, "thu-tu", { diem: [{ id: pts[0].id, thuTu: pts[1].thuTu }, { id: pts[1].id, thuTu: pts[0].thuTu }] }, SALES));
    denGio("12:39");
    const pA = ct.diem.find((d) => d.tenNoi === "Khách sạn A");
    await sau("16. SALES bấm thay 'Đã tới' A", await tienDo(w, "van-phong", t1, `diem/${pA.id}/da-toi`, {}, SALES));
    denGio("12:40");
    const sA2 = ct.suat.filter((s) => s.maDon === A.code).map((s) => s.id);
    await sau("17. DRIVER bấm 'Vắng' 1 khách A", await tienDo(w, "tai-xe", t1, `phan-bo/${sA2[0]}/vang`));
    denGio("12:41");
    await sau("18. DRIVER kết thúc gián đoạn", await tienDo(w, "tai-xe", t1, "ket-thuc-gian-doan", { lyDo: "GIAN_DOAN_XE_HONG" }));
    for (const b of buoc) log(`S11.${b.nhan}`, b);
    log("S11.audit_actions", w.q("SELECT action, count(*) n FROM audit_log WHERE target_type = 'trip' GROUP BY action"));
  } finally { tat(); }
});
