// S1b (bổ sung) — (1) hai đơn CÙNG khách sạn trong MỘT chuyến: một điểm hay hai; (2) văn phòng sắp "trả trước đón" bằng PUT diem rồi bấm xuất bến: máy giữ hay cho chạy.
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DRIVER, NGAY, SALES, batDongHo, chiTiet, denGio, setup, tienDo, uuid, vnMs, xe,
} from "../../../../../tests/audit/dieu-phoi-khung.mjs";
import { donXacNhan, ghi, lyDoGiu, taoChuyenRaw, tom, xep } from "./chung.mjs";

const diemTom = (ct) => ct.diem.map((d) => `${d.thuTu}.${d.loai === "PICKUP" ? "Đón" : "Trả"} ${d.tenNoi} ${d.gioHen ? d.gioHen.gio : "-"} (${d.soNguoi}) ${d.trangThai}`);

test("S1b+: cùng khách sạn → một điểm; trả trước đón → xuất bến?", async () => {
  const tat = batDongHo(vnMs("2027-03-10", "06:00"));
  try {
    const w = setup();
    const a = await donXacNhan(w, { soNguoi: 2, noiDon: "Khách sạn Havana", gio: "07:00" });
    const b = await donXacNhan(w, { soNguoi: 3, noiDon: "Khách sạn Havana", gio: "07:20" });
    const c = await donXacNhan(w, { soNguoi: 2, noiDon: "khách sạn havana ", gio: "07:30" }); // khác hoa/thường + khoảng trắng
    const d = await donXacNhan(w, { soNguoi: 2, noiDon: "KS Havana", gio: "07:40" }); // viết tắt
    const t = await taoChuyenRaw(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}` });
    const id = t.json.chuyen.id;
    const r = await xep(w, id, [a, b, c, d].map((x) => ({ legId: x.legId, soSuat: x.soNguoi })));
    ghi("S1b+.cungKS.xep", { ...tom(r), diem: r.json ? diemTom(r.json) : null });
    const ct = await chiTiet(w, id);
    // Sắp "trả trước đón".
    const dao = [...ct.diem.filter((x) => x.loai === "DROPOFF"), ...ct.diem.filter((x) => x.loai === "PICKUP")].map((x, i) => ({ id: x.id, thuTu: i + 1 }));
    const p = await w.call("PUT", `/api/van-chuyen/chuyen/${id}`, { as: SALES, body: { version: ct.chuyen.version, requestId: uuid(), diem: dao } });
    ghi("S1b+.traTruocDon.PUT", { ...tom(p), diem: p.status === 200 ? diemTom(p.json) : null, lyDoGiu: p.status === 200 ? lyDoGiu(p.json) : null });
    const lich = (await w.call("GET", `/api/van-chuyen/lich?ngay=${NGAY}`, { as: SALES })).json;
    ghi("S1b+.traTruocDon.lichCanhBao", { canhBao: (lich.canhBao ?? []).map((x) => x.loai ?? x.ma ?? JSON.stringify(x)).slice(0, 5) });
    denGio("06:30");
    const xb = await tienDo(w, "van-phong", id, "xuat-ben");
    ghi("S1b+.traTruocDon.xuatBen", { ...tom(xb), trangThai: xb.json?.chuyen?.trangThai, diem: xb.status === 200 ? diemTom(xb.json) : null });
    if (xb.status === 200) {
      const diemTra = xb.json.diem.find((x) => x.loai === "DROPOFF");
      const toi = await tienDo(w, "tai-xe", id, `diem/${diemTra.id}/da-toi`);
      ghi("S1b+.traTruocDon.daToiDiemTra.taiXe", tom(toi));
    }
  } finally {
    tat();
  }
});
