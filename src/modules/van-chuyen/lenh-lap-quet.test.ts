// C38 + phiếu kiểm độc lập V2(a): quét MỌI route lệnh chuyến khai `traLenhLap` — gửi lặp ĐÚNG lệnh (cùng thân, cùng `requestId`) ⇒ 200 cả hai lần, đúng
// MỘT sự kiện mang mã đó. Khai sai tập loại sự kiện ở route (vd thu-tu khai ENDED thay vì STOPS_REORDERED) thì lần gửi lại bị 409 `request_id_reused` ⇒ đỏ.
// Bảng `BANG` là nguồn: mỗi route (khoá "PHƯƠNG THỨC đường dẫn" đúng như index.ts khai) + loại sự kiện khai + nơi giữ — "quét" (bài dưới) hoặc trỏ tới bài
// sẵn có (tệp + tên bài; bài cấu trúc đòi tên đó còn trong tệp). Bài cấu trúc so `BANG` với index.ts: thêm route lệnh chuyến mới mà không thêm dòng ⇒ đỏ.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
// tệp .mjs không có khai kiểu; typecheck không phủ *.test.ts
import { ADM, DRIVER, LOC, SALES, batDongHo, chiTiet, chuyenSan, denGio, don, setup, taoChuyen, tienDo, uuid, xe, xepHet } from "../../../tests/audit/dieu-phoi-khung.mjs";

type Giu = "quét" | { tep: string; bai: string };
const VC = "/api/van-chuyen";
const TIEN_DO: Record<string, string> = {
  "xuat-ben": "DEPARTED",
  "diem/:sid/da-toi": "STOP_ARRIVED",
  "phan-bo/:aid/don": "PASSENGER_BOARDED",
  "phan-bo/:aid/vang": "PASSENGER_NO_SHOW",
  "phan-bo/:aid/khach-huy": "PASSENGER_CANCELLED_AT_STOP",
  "phan-bo/:aid/tra": "PASSENGER_DROPPED",
  "ket-thuc": "ENDED",
  "ket-thuc-gian-doan": "ENDED_INTERRUPTED",
  "thu-tu": "STOPS_REORDERED",
};
const BANG: Record<string, { loai: string; giu: Giu }> = {
  [`POST ${VC}/chuyen`]: { loai: "CREATED", giu: { tep: "ma-lenh-dung-lai.test.ts", bai: "gửi lặp đúng lệnh vẫn 200: tạo chuyến (cùng chuyến cũ) và dời khách" } },
  [`PUT ${VC}/chuyen/:id`]: { loai: "UPDATED", giu: { tep: "ma-lenh-dung-lai.test.ts", bai: "lệnh kế hoạch: mã lệnh của 'sửa chuyến P'" } },
  [`POST ${VC}/chuyen/:id/phan-bo`]: { loai: "ALLOCATED", giu: "quét" },
  [`POST ${VC}/chuyen/:id/them-diem`]: { loai: "STOP_ADDED_RUNNING", giu: "quét" },
  [`POST ${VC}/chuyen/:id/phan-bo/:aid/bao-huy`]: { loai: "ALLOCATION_OFFICE_CANCELLED", giu: "quét" },
  [`POST ${VC}/chuyen/:id/rut`]: { loai: "ALLOCATION_REMOVED", giu: "quét" },
  [`POST ${VC}/chuyen/:id/doi`]: { loai: "ALLOCATION_MOVED", giu: { tep: "ma-lenh-dung-lai.test.ts", bai: "gửi lặp đúng lệnh vẫn 200: tạo chuyến (cùng chuyến cũ) và dời khách" } },
  [`POST ${VC}/chuyen/:id/huy`]: { loai: "CANCELLED", giu: "quét" },
  [`POST ${VC}/chuyen/:id/cap-nhat-diem`]: { loai: "ALLOCATION_STOP_CHANGED", giu: "quét" },
  [`POST ${VC}/chuyen/:id/cap-nhat-khach`]: { loai: "ALLOCATION_PASSENGER_CHANGED", giu: { tep: "cap-nhat-khach.test.ts", bai: "R-P29: lệnh lặp cùng requestId" } },
  [`POST ${VC}/cuoc-cua-toi/:id/hanh-khach`]: { loai: "PASSENGER_NAMED", giu: { tep: "bo-sung-ten.test.ts", bai: "D5b chuyến LÊN KẾ HOẠCH trong ngày chạy" } },
  // ADR-0097 (gói A1, V3-B): hai lệnh điều chỉnh của văn phòng — lần đầu 201 (+ Location), lần lặp 200 (quét bên dưới với `lan1` = 201).
  [`POST ${VC}/chuyen/:id/phan-bo/:aid/dieu-chinh`]: { loai: "CORRECTION", giu: "quét" },
  [`POST ${VC}/chuyen/:id/thu-hoi-xuat-ben`]: { loai: "DEPARTURE_REVOKED", giu: "quét" },
  ...Object.fromEntries(
    ["cuoc-cua-toi", "chuyen"].flatMap((goc) => Object.entries(TIEN_DO).map(([duoi, loai]) => [`POST ${VC}/${goc}/:id/${duoi}`, { loai, giu: "quét" as Giu }])),
  ),
};
/** Route có `requestId` trong thân nhưng KHÔNG đi qua `traLenhLap` — ngoại lệ có tên (họ "gọi báo", tra `mocByRequest`; nợ ghi ở sổ thi công). */
const NGOAI_LE = [`POST ${VC}/chang/:legId/da-goi-bao`, `POST ${VC}/chang/:legId/bo-danh-dau-goi-bao`];

const doc = (tep: string) => readFileSync(new URL(`./${tep}`, import.meta.url), "utf8");

test("bảng lệnh lặp: route nào của index.ts gọi `traLenhLap` thì có ĐÚNG một dòng ở BANG (cùng loại sự kiện khai); route ghi nhận requestId mà không qua `traLenhLap` chỉ là ngoại lệ có tên; dòng trỏ bài khác thì bài đó còn trong tệp", () => {
  const src = doc("index.ts");
  const mo = [...src.matchAll(/route\("(GET|POST|PUT|PATCH|DELETE)", "([^"]+)"/g)];
  const khai: Record<string, string> = {};
  const khongQua: string[] = [];
  mo.forEach((m, i) => {
    const than = src.slice(m.index, mo[i + 1]?.index ?? src.length);
    const khoa = `${m[1]} ${m[2]}`;
    const goi = [...than.matchAll(/traLenhLap\([^;]*?loai: \[([^\]]*)\]/g)];
    if (goi.length === 0) {
      if (m[1] !== "GET" && /requestId/.test(than)) khongQua.push(khoa);
      return;
    }
    assert.equal(goi.length, 1, `${khoa}: một route một lần traLenhLap`);
    khai[khoa] = [...goi[0]![1]!.matchAll(/"([A-Z_]+)"/g)].map((x) => x[1]).join(",");
  });
  assert.deepEqual(khai, Object.fromEntries(Object.entries(BANG).map(([k, v]) => [k, v.loai])), "route lệnh chuyến ↔ BANG (thêm route mới thì thêm dòng và cách giữ)");
  assert.equal(Object.keys(BANG).length, 31);
  assert.deepEqual(khongQua, NGOAI_LE, "route mới nhận requestId phải đi qua traLenhLap");
  for (const [khoa, { giu }] of Object.entries(BANG)) {
    if (giu === "quét") continue;
    assert.ok(doc(giu.tep).includes(`test("${giu.bai}`), `${khoa}: không còn bài "${giu.bai}" trong ${giu.tep}`);
  }
});

// ---- quét hành vi -----------------------------------------------------------------------------------------------------------------------------------------
const daQuet = new Set<string>();
const soSuKien = (w: any, rid: string): number => w.q("SELECT count(*) AS n FROM vc_trip_event WHERE request_id = ?", rid)[0].n;
const ver = async (w: any, id: string) => (await chiTiet(w, id, ADM)).chuyen.version as number;

/** Gửi HAI lần cùng thân cùng requestId; `mau` là đường dẫn như index.ts khai (":sid", ":aid"), `thamSo` điền chỗ trống. `lan1` = mã lần đầu (lệnh tạo bản
 *  ghi mới trả 201 — ADR-0097); lần lặp luôn 200. */
async function lapOk(w: any, method: string, mau: string, thamSo: Record<string, string>, than: Record<string, unknown>, as: string, lan1 = 200) {
  const khoa = `${method} ${VC}/${mau}`;
  assert.ok(BANG[khoa], `${khoa} không có trong BANG`);
  const duong = `${VC}/${mau.replace(/:(\w+)/g, (_, k) => thamSo[k] ?? assert.fail(`thiếu ${k}`))}`;
  const rid = uuid();
  const r1 = await w.call(method, duong, { as, body: { ...than, requestId: rid } });
  const r2 = await w.call(method, duong, { as, body: { ...than, requestId: rid } });
  assert.equal(r1.status, lan1, `${khoa} lần 1: ${r1.text}`);
  assert.equal(r2.status, 200, `${khoa} lần 2 (lặp đúng lệnh): ${r2.text}`);
  assert.equal(soSuKien(w, rid), 1, `${khoa}: đúng một sự kiện`);
  daQuet.add(khoa);
  return r1;
}

/** Hai đơn A (13:00) B (13:10), chuyến 12:30–15:00, xếp hết. */
async function chuyenAB(w: any) {
  const dA = await don(w, { soNguoi: 2, gio: "13:00", noiDon: "Khách sạn A" });
  const dB = await don(w, { soNguoi: 2, gio: "13:10", noiDon: "Khách sạn B" });
  const c = await taoChuyen(w, { xe: xe(w, 15), taiXe: `pty-${DRIVER}`, bd: "12:30", kt: "15:00" });
  await xepHet(w, c, dA, 2);
  const sau = await xepHet(w, c, dB, 2);
  const suatCua = (legId: string) => sau.suat.filter((s: any) => s.loai === "PASSENGER" && s.legId === legId);
  return { id: c.chuyen.id as string, sA: suatCua(dA.legId), sB: suatCua(dB.legId) };
}

for (const ben of ["tai-xe", "van-phong"] as const) {
  const goc = ben === "tai-xe" ? "cuoc-cua-toi" : "chuyen";
  const as = ben === "tai-xe" ? DRIVER : SALES;
  const lenh = (w: any, mau: string, thamSo: Record<string, string>, than: Record<string, unknown> = {}) => lapOk(w, "POST", `${goc}/:id/${mau}`, thamSo, than, as);

  test(`quét lặp đúng lệnh (${ben}): xuất bến, thứ tự, đã tới, đón, vắng, khách huỷ, trả, kết thúc`, async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const { id, sA, sB } = await chuyenAB(w);
      denGio("12:35");
      await lenh(w, "xuat-ben", { id });
      const ct = (await w.call("GET", `${VC}/${goc}/${id}`, { as })).json;
      const dA = sA[0].diemLen as string, dB = sB[0].diemLen as string;
      const pa = ct.diem.find((d: any) => d.id === dA), pb = ct.diem.find((d: any) => d.id === dB);
      await lenh(w, "thu-tu", { id }, { diem: [{ id: dA, thuTu: pb.thuTu }, { id: dB, thuTu: pa.thuTu }] });
      denGio("12:40");
      await lenh(w, "diem/:sid/da-toi", { id, sid: dB });
      denGio("12:42");
      await lenh(w, "phan-bo/:aid/don", { id, aid: sB[0].id });
      await lenh(w, "phan-bo/:aid/vang", { id, aid: sB[1].id });
      denGio("12:44");
      await lenh(w, "diem/:sid/da-toi", { id, sid: dA });
      await lenh(w, "phan-bo/:aid/khach-huy", { id, aid: sA[0].id });
      await lenh(w, "phan-bo/:aid/don", { id, aid: sA[1].id });
      denGio("14:00");
      await lenh(w, "diem/:sid/da-toi", { id, sid: ct.diem.find((d: any) => d.loai === "DROPOFF").id });
      await lenh(w, "phan-bo/:aid/tra", { id, aid: sB[0].id });
      await lenh(w, "phan-bo/:aid/tra", { id, aid: sA[1].id });
      denGio("14:30");
      await lenh(w, "ket-thuc", { id });
    } finally {
      tat();
    }
  });

  test(`quét lặp đúng lệnh (${ben}): kết thúc gián đoạn`, async () => {
    const tat = batDongHo();
    try {
      const w = setup();
      const { id } = await chuyenAB(w);
      denGio("12:35");
      assert.equal((await tienDo(w, ben, id, "xuat-ben")).status, 200);
      denGio("12:40");
      await lenh(w, "ket-thuc-gian-doan", { id }, { lyDo: "GIAN_DOAN_XE_HONG" });
    } finally {
      tat();
    }
  });
}

test("quét lặp đúng lệnh (kế hoạch): xếp, rút, huỷ chuyến", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d1 = await don(w, { soNguoi: 2, gio: "16:30" });
    const P = await taoChuyen(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "16:00", kt: "18:00" });
    const id = P.chuyen.id as string;
    const x = await lapOk(w, "POST", "chuyen/:id/phan-bo", { id }, { version: await ver(w, id), chang: [{ legId: d1.legId, soSuat: 2 }] }, SALES);
    const suat = x.json.suat.filter((s: any) => s.loai === "PASSENGER").map((s: any) => s.id as string);
    await lapOk(w, "POST", "chuyen/:id/rut", { id }, { version: await ver(w, id), suatIds: [suat[0]] }, SALES);
    await lapOk(w, "POST", "chuyen/:id/huy", { id }, { version: await ver(w, id), lyDo: "HUY_KHAC" }, SALES);
  } finally {
    tat();
  }
});

test("quét lặp đúng lệnh (xe đang chạy): thêm điểm, văn phòng báo khách huỷ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const a = await chuyenSan(w);
    const b = await don(w, { gio: "13:30", soNguoi: 2, ten: 1, noiDon: "Khách sạn Hai Dò Tìm" });
    denGio("12:40");
    assert.equal((await tienDo(w, "tai-xe", a.id, "xuat-ben")).status, 200);
    denGio("12:41");
    await lapOk(w, "POST", "chuyen/:id/them-diem", { id: a.id }, { version: await ver(w, a.id), chang: [{ legId: b.legId, soSuat: 2 }], phaLe: { lyDo: "PHA_LE_SU_CO" } }, ADM);
    await lapOk(w, "POST", "chuyen/:id/phan-bo/:aid/bao-huy", { id: a.id, aid: a.suat[0] }, { version: await ver(w, a.id), lyDo: "BAO_HUY_KHONG_DI" }, ADM);
  } finally {
    tat();
  }
});

test("quét lặp đúng lệnh (điều chỉnh — ADR-0097): thu hồi xuất bến, điều chỉnh kết quả một khách — lần đầu 201, lần lặp 200, đúng một sự kiện", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const { id, sA } = await chuyenAB(w);
    denGio("12:35");
    assert.equal((await tienDo(w, "van-phong", id, "xuat-ben")).status, 200);
    await lapOk(w, "POST", "chuyen/:id/thu-hoi-xuat-ben", { id }, { version: await ver(w, id), lyDo: "DIEU_CHINH_BAM_NHAM" }, SALES, 201);
    denGio("12:38");
    assert.equal((await tienDo(w, "van-phong", id, "xuat-ben")).status, 200);
    denGio("12:40");
    assert.equal((await tienDo(w, "van-phong", id, `diem/${sA[0].diemLen}/da-toi`)).status, 200);
    assert.equal((await tienDo(w, "van-phong", id, `phan-bo/${sA[0].id}/don`)).status, 200);
    await lapOk(w, "POST", "chuyen/:id/phan-bo/:aid/dieu-chinh", { id, aid: sA[0].id }, { version: await ver(w, id), trangThai: "NO_SHOW", lyDo: "DIEU_CHINH_BAM_NHAM" }, SALES, 201);
  } finally {
    tat();
  }
});

test("quét lặp đúng lệnh (kế hoạch): cập nhật điểm theo đơn — lần gửi lại trả kết quả cũ", async () => {
  const tat = batDongHo();
  try {
    const w = setup();
    const d = await don(w, { soNguoi: 2, gio: "16:30", noiDon: "Sheraton 12345678" });
    const P = await taoChuyen(w, { xe: xe(w, 16), taiXe: `pty-${DRIVER}`, bd: "16:00", kt: "18:00" });
    await xepHet(w, P, d, 2);
    const l = (await w.call("GET", `/api/orders/${d.id}`, { as: SALES })).json.order.services[0].legs[0];
    const u = await w.call("PUT", `/api/orders/${d.id}/legs/${l.id}`, {
      as: SALES, body: { expectedUpdatedAt: l.updatedAt, leg: { pickupDate: l.pickupDate, pickupTime: l.pickupTime, pickupLocationId: null, pickupPlace: "Amiana 12345678", dropoffLocationId: LOC, dropoffPlace: "" } },
    });
    assert.equal(u.status, 200, u.text);
    const id = P.chuyen.id as string;
    const c = await lapOk(w, "POST", "chuyen/:id/cap-nhat-diem", { id }, { version: await ver(w, id) }, SALES);
    assert.equal(c.json.daCapNhat, 2, "chống bài rỗng: lệnh thật sự dời hai suất");
  } finally {
    tat();
  }
});

test("mọi dòng 'quét' của BANG đã được bài hành vi ở trên gửi lặp (chạy SAU các bài quét — node:test chạy tuần tự trong một tệp)", () => {
  const canQuet = Object.entries(BANG).filter(([, v]) => v.giu === "quét").map(([k]) => k).sort();
  assert.deepEqual([...daQuet].sort(), canQuet);
});
