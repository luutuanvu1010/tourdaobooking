// Kiểm phản biện nhóm V4 (Điều phối) — bài thử nhỏ, dữ liệu GIẢ, chạy trên SQLite tạm của khung thử. Không sửa repo.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  SALES, DRIVER, LOC, NGAY, batDongHo, denGio, setup, xe, taoChuyen, chiTiet, tienDo, uuid,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";

const VP_TRAN_PHU = "d4b573d1-872e-411c-a648-2695c53b0997"; // điểm danh mục (0010)
const tom = (r) => ({ status: r.status, code: r.json?.error?.code ?? null });
const log = (nhan, obj) => console.log(`=== ${nhan} ${JSON.stringify(obj)}`);

/** Đơn đã xác nhận; nơi đón là chữ tự do `noiDon` hoặc điểm danh mục `diemDon`. */
async function donX(w, v) {
  const r = await w.call("POST", "/api/orders", {
    as: SALES,
    body: {
      customerName: v.lienHe ?? "Liên Hệ Dò Tìm", customerPhone: v.sdt ?? "0911000100", customerNote: "", paymentNote: "",
      services: [{
        kind: "catalog", pickupChoice: "DON", catalogCode: "ZA1", pax: { adult: v.soNguoi, child: 0, senior: 0, infant: 0 }, catalogPriceSeen: { adult: 777000 }, departDate: NGAY,
        legs: [{ direction: "OUT", pickupDate: NGAY, pickupTime: v.gio, pickupLocationId: v.diemDon ?? null, pickupPlace: v.diemDon ? "" : v.noiDon, dropoffLocationId: LOC, dropoffPlace: "" }],
      }],
      passengers: Array.from({ length: v.soNguoi }, (_x, i) => ({ fullName: `${v.ten ?? "Khách"} ${i + 1}`, birthYear: 1980 + i, paxCode: "adult" })),
    },
  });
  assert.equal(r.status, 201, r.text);
  const o = r.json.order;
  const x = await w.call("POST", `/api/orders/${o.id}/status`, { as: SALES, body: { status: "confirmed" } });
  assert.equal(x.status, 200, x.text);
  return { id: o.id, code: o.orderCode, legId: o.services[0].legs[0].id };
}
const xep = async (w, tripId, ds) => w.call("POST", `/api/van-chuyen/chuyen/${tripId}/phan-bo`, {
  as: SALES, body: { version: (await chiTiet(w, tripId)).chuyen.version, requestId: uuid(), chang: ds.map(([d, n]) => ({ legId: d.legId, soSuat: n })) },
});
const diemVP = async (w, id) => (await chiTiet(w, id)).diem.map((d) => ({ id: d.id, thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen?.gio ?? null, soNguoi: d.soNguoi, trangThai: d.trangThai }));

test("K1 (LC-21, ADR-0096 Đ3): giờ hẹn đón 12:00 sớm hơn giờ khởi hành 12:30 — xếp, cảnh báo, xuất bến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donX(w, { soNguoi: 2, gio: "12:00", noiDon: "Khách sạn Sớm" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    const r = await xep(w, t, [[A, 2]]);
    const ct = await chiTiet(w, t);
    const lich = await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES });
    const cb = (lich.json.canhBao ?? []).map((x) => x.loai);
    const dk = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t}`, { as: DRIVER })).json.dieuKienConThieu;
    denGio("12:35");
    const xb = await tienDo(w, "tai-xe", t, "xuat-ben");
    log("K1", { xep: tom(r), lyDoGiu: ct.chuyen.lyDoGiu ?? null, canhBaoLich: cb, dieuKienTaiXe: dk, xuatBen: tom(xb), trangThai: xb.json?.chuyen?.trangThai });
  } finally { tat(); }
});

test("K2 (C30): đơn gấp đón 12:40 xếp thêm vào chuyến đã có điểm 13:00, 13:20 — đứng ở đâu; có cảnh báo không", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donX(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A" });
    const B = await donX(w, { soNguoi: 2, gio: "13:20", noiDon: "Khách sạn B" });
    const G = await donX(w, { soNguoi: 2, gio: "12:40", noiDon: "Khách sạn Gấp" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    assert.equal((await xep(w, t, [[A, 2], [B, 2]])).status, 200);
    const r = await xep(w, t, [[G, 2]]);
    const ct = await chiTiet(w, t);
    log("K2", { xep: tom(r), canhBaoXep: r.json?.canhBaoXep ?? null, canhBaoChiTiet: (ct.canhBao ?? []).map((x) => x.loai), diem: await diemVP(w, t) });
  } finally { tat(); }
});

test("K3 (C33): hai nhóm đón cùng ĐIỂM DANH MỤC lúc 07:00 và 07:30 — gộp một điểm, giờ hiện; DTO tài xế có giờ riêng từng nhóm không", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donX(w, { soNguoi: 2, gio: "13:00", diemDon: VP_TRAN_PHU, ten: "Nhóm A" });
    const B = await donX(w, { soNguoi: 3, gio: "13:30", diemDon: VP_TRAN_PHU, ten: "Nhóm B", sdt: "0911000101" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    const r = await xep(w, t, [[A, 2], [B, 3]]);
    denGio("12:00"); // trong ngày chạy — DTO tài xế có tên khách
    const tx = (await w.call("GET", `/api/van-chuyen/cuoc-cua-toi/${t}`, { as: DRIVER })).json;
    const khoaSuat = [...new Set(tx.suat.flatMap((s) => Object.keys(s)))].sort();
    log("K3", { xep: tom(r), diemVP: await diemVP(w, t), diemTaiXe: tx.diem.map((d) => ({ thuTu: d.thuTu, loai: d.loai, tenNoi: d.tenNoi, gioHen: d.gioHen?.gio ?? null, soNguoi: d.soNguoi })), khoaSuatTaiXe: khoaSuat });
  } finally { tat(); }
});

test("K4 (C38): tài xế bấm ↑ trên màn cũ sau khi văn phòng vừa đổi thứ tự khác — thân đủ mọi điểm chờ với số thứ tự tuyệt đối", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const A = await donX(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A" });
    const B = await donX(w, { soNguoi: 2, gio: "13:10", noiDon: "Khách sạn B" });
    const C = await donX(w, { soNguoi: 2, gio: "13:20", noiDon: "Khách sạn C" });
    const t = (await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" })).chuyen.id;
    assert.equal((await xep(w, t, [[A, 2], [B, 2], [C, 2]])).status, 200);
    denGio("12:35");
    assert.equal((await tienDo(w, "tai-xe", t, "xuat-ben")).status, 200);
    denGio("12:36");
    const d0 = (await diemVP(w, t)).filter((d) => d.trangThai === "PENDING").sort((x, y) => x.thuTu - y.thuTu);
    const id = (ten) => d0.find((d) => d.tenNoi === ten).id;
    const so = (ten) => d0.find((d) => d.tenNoi === ten).thuTu;
    // Văn phòng: đổi B ↔ C (khuôn thanDoiThuTu: gửi đủ điểm chờ, giữ tập số cũ).
    const vp = await tienDo(w, "van-phong", t, "thu-tu", { diem: d0.map((d) => ({ id: d.id, thuTu: d.tenNoi === "Khách sạn B" ? so("Khách sạn C") : d.tenNoi === "Khách sạn C" ? so("Khách sạn B") : d.thuTu })) }, SALES);
    const sauVP = (await diemVP(w, t)).sort((x, y) => x.thuTu - y.thuTu).map((d) => d.tenNoi);
    denGio("12:37");
    // Tài xế trên màn CŨ (d0: A,B,C,Trả) bấm ↑ ở B: đổi A ↔ B, gửi đủ điểm chờ theo số của d0.
    const txBody = { diem: d0.map((d) => ({ id: d.id, thuTu: d.tenNoi === "Khách sạn A" ? so("Khách sạn B") : d.tenNoi === "Khách sạn B" ? so("Khách sạn A") : d.thuTu })) };
    const tx = await tienDo(w, "tai-xe", t, "thu-tu", txBody);
    const sauTX = (await diemVP(w, t)).sort((x, y) => x.thuTu - y.thuTu).map((d) => d.tenNoi);
    const sk = w.q("SELECT count(*) AS n FROM vc_trip_event WHERE trip_id = ? AND kind = 'STOPS_REORDERED'", t)[0].n;
    log("K4", { vanPhong: tom(vp), sauVanPhong: sauVP, taiXeManCu: tom(tx), sauTaiXe: sauTX, soSuKienDoiThuTu: sk, idA: !!id("Khách sạn A") });
  } finally { tat(); }
});
