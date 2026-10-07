// S4f — Thứ tự điểm theo giờ hẹn và các luật ADR-0096 (đã duyệt 3/10): LC-19 (đón trước trả), Đ1.4 (Đã tới điểm trả khi còn khách chưa đón), LC-20 (cửa sổ xuất bến).
import { test } from "node:test";
import assert from "node:assert/strict";
import { SALES, ADM, DRIVER, NGAY, NGAY_SAU, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, uuid } from "./helpers.mjs";

test("S4f thứ tự điểm + ADR-0096", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A", lienHe: "LH A", sdt: "0911000091", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 2, gio: "13:45", noiDon: "Khách sạn B", lienHe: "LH B", sdt: "0911000092", tenKhach: "Khách B" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    const kq = {};
    // Xếp B (13:45) trước A (13:00) trong một lệnh.
    const x = await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo`, { as: SALES, body: { version: (await chiTiet(w, t)).chuyen.version, requestId: uuid(), chang: [B, A].map((d) => ({ legId: d.legId, soSuat: 2 })) } });
    kq.xep = tom(x);
    const vp = await chiTiet(w, t, SALES);
    kq.van_phong_diem = vp.diem.map((d) => ({ thuTu: d.thuTu, tenNoi: d.tenNoi, gioHen: d.gioHen?.gio, gioXeToi: d.gioXeToi?.gio ?? null, canhBao: d.canhBao ?? undefined }));
    kq.van_phong_khoa_canh_bao = Object.keys(vp).filter((k) => /canh|giu|lyDo/i.test(k)).map((k) => [k, vp[k]]);
    // Văn phòng sửa thứ tự trên chuyến kế hoạch (PUT diem) — có được không.
    const pA = vp.diem.find((d) => d.tenNoi === "Khách sạn A"), pB = vp.diem.find((d) => d.tenNoi === "Khách sạn B"), pT = vp.diem.find((d) => d.loai === "DROPOFF");
    kq.sua_thu_tu_ke_hoach = tom(await w.call("PUT", `/api/van-chuyen/chuyen/${t}`, { as: SALES, body: { version: vp.chuyen.version, requestId: uuid(), diem: [{ id: pA.id, thuTu: pB.thuTu, gioXeToi: null }, { id: pB.id, thuTu: pA.thuTu, gioXeToi: null }] } }));
    // Đưa điểm TRẢ lên đầu khi chuyến còn kế hoạch (LC-19 phải chặn xuất bến / từ chối).
    const vp2 = await chiTiet(w, t, SALES);
    const a2 = vp2.diem.find((d) => d.id === pA.id), t2 = vp2.diem.find((d) => d.id === pT.id);
    kq.ke_hoach_dua_tra_len_dau = tom(await w.call("PUT", `/api/van-chuyen/chuyen/${t}`, { as: SALES, body: { version: vp2.chuyen.version, requestId: uuid(), diem: [{ id: t2.id, thuTu: a2.thuTu, gioXeToi: null }, { id: a2.id, thuTu: t2.thuTu, gioXeToi: null }] } }));
    const vp3 = await chiTiet(w, t, SALES);
    kq.diem_sau = vp3.diem.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi }));
    kq.dieu_kien_tai_xe = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t}`, { as: DRIVER })).json.dieuKienConThieu;
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    kq.lich_chung_co_TRA_TRUOC_DON = { status: lich.status, co: /TRA_TRUOC_DON/.test(lich.text), doan: (lich.text.match(/.{0,120}TRA_TRUOC_DON.{0,160}/) ?? [null])[0] };
    denGio("12:35");
    kq.xuat_ben_khi_tra_dung_truoc_don = tom(await tienDo(w, "tai-xe", t, "xuat-ben"));
    denGio("12:36");
    // Đ1.4: "Đã tới" điểm trả khi còn khách chờ đón của điểm đó.
    kq.da_toi_diem_tra_khi_chua_don_ai = tom(await tienDo(w, "tai-xe", t, `diem/${pT.id}/da-toi`));
    log("S4f.ket_qua", kq);
  } finally { tat(); }
});

test("S4f.2 cửa sổ xuất bến (LC-20): xuất bến 31 giờ trước giờ khởi hành", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", ngay: NGAY_SAU, noiDon: "Khách sạn Mai", lienHe: "LH M", sdt: "0911000093", tenKhach: "Khách M" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "12:30", kt: "15:00" })).chuyen.id;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${t}/phan-bo`, { as: SALES, body: { version: (await chiTiet(w, t)).chuyen.version, requestId: uuid(), chang: [{ legId: A.legId, soSuat: 2 }] } })).status, 200);
    denGio("06:30");
    const r = await tienDo(w, "tai-xe", t, "xuat-ben");
    log("S4f.2.xuat_ben_som_30h", { ...tom(r), trangThai: r.json?.chuyen?.trangThai });
    log("S4f.2.cot_chinh_sach", w.q("SELECT name FROM pragma_table_info('vc_dispatch_policy') WHERE name LIKE '%window%'"));
  } finally { tat(); }
});
