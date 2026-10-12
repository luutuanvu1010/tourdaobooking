// S4 — Chuyến ghép 4 điểm đón → bến tàu. Ghi DTO tài xế ở từng pha; chạy trọn chuyến; đọc lại SQLite. Chỉ assert điều khung cần để chạy tiếp.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SALES, DRIVER, NGAY, NGAY_SAU, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, donRieng, tom, log, vnLuc, uuid,
} from "./helpers.mjs";

const pick = (j) => ({
  trongNgayChay: j.trongNgayChay,
  khoaGoc: Object.keys(j).sort(),
  chuyen: { ma: j.chuyen.ma, trangThai: j.chuyen.trangThai, bienSo: j.chuyen.bienSo, soCho: j.chuyen.soCho, gioBatDau: j.chuyen.gioBatDau, xuatBen: j.chuyen.xuatBen },
  diem: j.diem.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen, soNguoi: d.soNguoi, trangThai: d.trangThai, daToi: d.daToi, khoa: Object.keys(d).sort().join(",") })),
  suat: j.suat.map((s) => ({ maDon: s.maDon, diemLen: j.diem.find((d) => d.id === s.diemLen)?.thuTu ?? s.diemLen, trangThai: s.trangThai, hoTen: s.hoTen, namSinh: s.namSinh, khoa: Object.keys(s).sort().join(",") })),
  lienHe: j.lienHe,
  dieuKienConThieu: j.dieuKienConThieu,
});

test("S4 chuyến ghép 4 điểm", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    // 06:00 — bốn đơn, khách sạn khác nhau, SĐT liên hệ khác nhau.
    const A = await donRieng(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn Sao Biển, 12 Trần Phú, Lộc Thọ", lienHe: "Liên Hệ A", sdt: "0911000001", tenKhach: "Khách A" });
    const B = await donRieng(w, { soNguoi: 4, gio: "13:15", noiDon: "Khách sạn Hoà Bình, 45 Hùng Vương", lienHe: "Liên Hệ B", sdt: "0911000002", tenKhach: "Khách B" });
    const C = await donRieng(w, { soNguoi: 1, gio: "13:30", noiDon: "Nhà riêng hẻm 7 Ngô Gia Tự, gọi 0987654321", lienHe: "Liên Hệ C", sdt: "0911000003", tenKhach: "Khách C" });
    const D = await donRieng(w, { soNguoi: 3, gio: "13:45", noiDon: "Resort Biển Xanh, Phạm Văn Đồng", lienHe: "Liên Hệ D", sdt: "0911000004", tenKhach: "Khách D" });
    log("S4.don", [A, B, C, D].map((d) => ({ code: d.code, soNguoi: d.soNguoi, gio: d.gio, noiDon: d.noiDon, sdt: d.sdt })));
    const c = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
    const tripId = c.chuyen.id;
    // Xếp MỘT lệnh, liệt kê lệch giờ: D, B, A, C.
    const v = (await chiTiet(w, tripId)).chuyen.version;
    const xp = await w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, { as: SALES, body: { version: v, requestId: uuid(), chang: [D, B, A, C].map((d) => ({ legId: d.legId, soSuat: d.soNguoi })) } });
    assert.equal(xp.status, 200, xp.text);
    log("S4.xep.van_phong.diem", xp.json.diem.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen, soNguoi: d.soNguoi })));
    log("S4.xep.van_phong.canhBao", xp.json.canhBaoXep ?? null);

    // (a) ngoài ngày chạy: chuyến khác ngày mai, một đơn.
    const E = await donRieng(w, { soNguoi: 2, gio: "09:00", ngay: NGAY_SAU, noiDon: "Khách sạn Ngày Mai", lienHe: "Liên Hệ E", sdt: "0911000005", tenKhach: "Khách E" });
    const c2 = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, ngay: NGAY_SAU, bd: "08:30", kt: "10:30" });
    const v2 = (await chiTiet(w, c2.chuyen.id)).chuyen.version;
    assert.equal((await w.call("POST", `/api/van-chuyen/chuyen/${c2.chuyen.id}/phan-bo`, { as: SALES, body: { version: v2, requestId: uuid(), chang: [{ legId: E.legId, soSuat: 2 }] } })).status, 200);
    const ngoai = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${c2.chuyen.id}`, { as: DRIVER });
    log("S4.a.ngoai_ngay_chay.GET", { status: ngoai.status, ...pick(ngoai.json) });

    // Danh sách cuốc của tôi.
    const ds = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi?tu=${NGAY}&den=${NGAY_SAU}`, { as: DRIVER });
    log("S4.danh_sach_cuoc", { status: ds.status, body: ds.json });

    // (b) trong ngày chạy, trước xuất bến.
    const truoc = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${tripId}`, { as: DRIVER });
    log("S4.b.truoc_xuat_ben.GET", { status: truoc.status, ...pick(truoc.json) });
    log("S4.b.text_co_sdt_khach_san_C", { coSo0987654321: /0987654321/.test(truoc.text), coSoChe: /\*{5,}|•{5,}/.test(truoc.text) });

    // (c) xuất bến 12:35.
    denGio("12:35");
    const xb = await tienDo(w, "tai-xe", tripId, "xuat-ben");
    log("S4.c.xuat_ben.phan_hoi_lenh", { status: xb.status, code: xb.json?.error?.code, ...(xb.status === 200 ? pick(xb.json) : { body: xb.json }) });
    assert.equal(xb.status, 200, xb.text);
    const sau = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${tripId}`, { as: DRIVER });
    log("S4.c.sau_xuat_ben.GET", { status: sau.status, ...pick(sau.json) });
    // bản đồ: điểm → mã đơn → SĐT (tài xế phải tự ghép qua suat.diemLen)
    const map = sau.json.diem.filter((d) => d.loai === "PICKUP").map((d) => {
      const ma = [...new Set(sau.json.suat.filter((s) => s.diemLen === d.id).map((s) => s.maDon))];
      return { thuTu: d.thuTu, tenNoi: d.tenNoi, soNguoi: d.soNguoi, maDon: ma, sdt: ma.map((m) => sau.json.lienHe?.find((l) => l.maDon === m)?.sdtLienHe ?? null) };
    });
    log("S4.c.ghep_diem_sdt", map);

    const dp = Object.fromEntries(sau.json.diem.map((d) => [d.tenNoi.slice(0, 18), d]));
    const diemCua = (don) => sau.json.diem.find((d) => d.loai === "PICKUP" && sau.json.suat.some((s) => s.diemLen === d.id && s.maDon === don.code));
    const suatCua = (don) => sau.json.suat.filter((s) => s.maDon === don.code).map((s) => s.id);
    const diemTra = sau.json.diem.find((d) => d.loai === "DROPOFF");
    void dp;
    const kq = {};
    let phut = 36;
    const tick = () => { const m = 12 * 60 + phut++; denGio(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`); };

    // Điểm A: tới + đón đủ 2.
    tick(); kq.A_daToi = tom(await tienDo(w, "tai-xe", tripId, `diem/${diemCua(A).id}/da-toi`));
    for (const s of suatCua(A)) { tick(); kq[`A_don_${s.slice(0, 4)}`] = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${s}/don`)); }
    // Điểm B: tới, đón 3, 1 vắng.
    tick(); kq.B_daToi = tom(await tienDo(w, "tai-xe", tripId, `diem/${diemCua(B).id}/da-toi`));
    const sB = suatCua(B);
    for (const s of sB.slice(0, 3)) { tick(); kq[`B_don_${s.slice(0, 4)}`] = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${s}/don`)); }
    tick(); kq.B_vang_1 = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${sB[3]}/vang`));
    // Thử sửa nhầm: suất đã đón → vắng.
    tick(); kq.B_thu_doi_daDon_thanh_vang = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${sB[0]}/vang`));
    log("S4.ket_qua_A_B", kq);
    const giua = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${tripId}`, { as: DRIVER });
    log("S4.d.giua_chuyen.GET", { status: giua.status, ...pick(giua.json) });

    // Điểm C: thử khách huỷ khi chưa "Đã tới"; rồi tới + khách huỷ.
    const kq2 = {};
    const sC = suatCua(C);
    tick(); kq2.C_khachHuy_truoc_daToi = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${sC[0]}/khach-huy`));
    tick(); kq2.C_daToi = tom(await tienDo(w, "tai-xe", tripId, `diem/${diemCua(C).id}/da-toi`));
    tick(); kq2.C_khachHuy = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${sC[0]}/khach-huy`));
    // Thử kết thúc khi điểm D còn nguyên.
    tick(); kq2.ketThuc_khi_D_chua_xu_ly = tom(await tienDo(w, "tai-xe", tripId, "ket-thuc"));
    // Điểm D: thử vắng trước khi tới; rồi tới + vắng cả nhóm (3 suất).
    const sD = suatCua(D);
    tick(); kq2.D_vang_truoc_daToi = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${sD[0]}/vang`));
    tick(); kq2.D_daToi = tom(await tienDo(w, "tai-xe", tripId, `diem/${diemCua(D).id}/da-toi`));
    for (const s of sD) { tick(); kq2[`D_vang_${s.slice(0, 4)}`] = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${s}/vang`)); }
    log("S4.ket_qua_C_D", kq2);
    log("S4.trang_thai_diem_sau_D", w.q("SELECT seq, kind, status, arrived_at, done_at, skip_reason_code FROM vc_trip_stop WHERE trip_id = ? ORDER BY seq", tripId));

    // Thử kết thúc: mọi khách đón đã có kết quả nhưng điểm trả chưa tới / khách trên xe chưa trả.
    const kq3 = {};
    tick(); kq3.ketThuc_khi_chua_tra = tom(await tienDo(w, "tai-xe", tripId, "ket-thuc"));
    // Trả trước khi tới bến.
    const trenXe = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${tripId}`, { as: DRIVER })).json.suat.filter((s) => s.trangThai === "BOARDED").map((s) => s.id);
    tick(); kq3.tra_truoc_daToi_ben = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${trenXe[0]}/tra`));
    tick(); kq3.ben_daToi = tom(await tienDo(w, "tai-xe", tripId, `diem/${diemTra.id}/da-toi`));
    for (const s of trenXe) { tick(); kq3[`tra_${s.slice(0, 4)}`] = tom(await tienDo(w, "tai-xe", tripId, `phan-bo/${s}/tra`)); }
    tick(); kq3.ketThuc = tom(await tienDo(w, "tai-xe", tripId, "ket-thuc"));
    log("S4.ket_qua_ben_ket_thuc", kq3);
    const cuoi = await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${tripId}`, { as: DRIVER });
    log("S4.e.sau_ket_thuc.GET", { status: cuoi.status, ...pick(cuoi.json) });

    // SQLite: sự kiện tiến độ.
    log("S4.sqlite.vc_trip_event", w.q("SELECT kind, stop_id IS NOT NULL co_diem, allocation_id IS NOT NULL co_suat, count, occurred_at, created_at, occurred_source, policy_id IS NOT NULL co_cs, created_by FROM vc_trip_event WHERE trip_id = ? ORDER BY created_at, rowid", tripId)
      .map((e) => ({ ...e, occurred_vn: vnLuc(e.occurred_at), created_vn: vnLuc(e.created_at), lech_ms: Date.parse(e.created_at) - Date.parse(e.occurred_at) })));
    log("S4.sqlite.vc_trip_stop", w.q("SELECT seq, kind, place_text, planned_time, status, arrived_at, done_at, skip_reason_code FROM vc_trip_stop WHERE trip_id = ? ORDER BY seq", tripId));
    log("S4.sqlite.vc_trip_allocation", w.q("SELECT a.status, a.valid_to_at, a.close_reason, s.seq board_seq FROM vc_trip_allocation a LEFT JOIN vc_trip_stop s ON s.id = a.board_stop_id WHERE a.trip_id = ? ORDER BY s.seq", tripId));
    log("S4.sqlite.vc_trip", w.q("SELECT code, status, departed_at, ended_at, end_reason_code, version FROM vc_trip WHERE id = ?", tripId));
    log("S4.sqlite.audit_log_trip", w.q("SELECT action, detail FROM audit_log WHERE target_id = ? ORDER BY created_at, rowid", tripId));
  } finally {
    tat();
  }
});
