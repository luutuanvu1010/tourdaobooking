// ADR-0062 Đ2 — khuôn chữ nhật ký "số khách: … · lý do: …" (hàm viết) và hàm đọc tin `phanDoiCuaTin` (ngữ pháp chặt, không bao giờ in mẩu thô).
import { test } from "node:test";
import assert from "node:assert/strict";
import { CHIEU_LABEL, LY_DO_DAT_GAP, ghiDatGapNhatKy, moTaChang, type MoTaChangVao } from "./chang-dua-don.ts";
import { CAP_NHAT_CHANG, doanSoKhach, ghepLyDo, phanDoiCuaTin, type PhanDoiTin } from "./tin-doi-don.ts";

const pax = (adult: number, child = 0, senior = 0, infant = 0) => ({ adult, child, senior, infant });
const DV = [
  { id: "s1", catalogCode: "ZA1", name: "Tour 3 đảo" },
  { id: "s2", catalogCode: "ZA2", name: "Lặn biển" },
  { id: "s3", catalogCode: null, name: "Anh Nam 0901234567" },
];

test("doanSoKhach: một dịch vụ danh mục, người lớn 4 → 3", () => {
  assert.equal(doanSoKhach([{ serviceId: "s1", pax: pax(4) }], [{ serviceId: "s1", pax: pax(3) }], DV), "số khách: Tour 3 đảo: người lớn 4 → 3");
});

test("doanSoKhach: hai loại khách đổi ghi theo thứ tự cố định; dịch vụ không đổi bị bỏ; hai dịch vụ nối ' | '", () => {
  assert.equal(
    doanSoKhach(
      [{ serviceId: "s1", pax: pax(4, 1) }, { serviceId: "s2", pax: pax(2) }, { serviceId: "s1x", pax: pax(1) }],
      [{ serviceId: "s1", pax: pax(3, 0) }, { serviceId: "s2", pax: pax(2, 0, 0, 1) }, { serviceId: "s1x", pax: pax(1) }],
      DV,
    ),
    "số khách: Tour 3 đảo: người lớn 4 → 3, trẻ em 1 → 0 | Lặn biển: em bé 0 → 1",
  );
});

test("doanSoKhach: dịch vụ nhập tay ghi nhãn cố định 'dịch vụ nhập tay' — không bao giờ tên / SĐT người dùng gõ", () => {
  const d = doanSoKhach([{ serviceId: "s3", pax: pax(2) }], [{ serviceId: "s3", pax: pax(5) }], DV);
  assert.equal(d, "số khách: dịch vụ nhập tay: người lớn 2 → 5");
  assert.ok(!d.includes("Anh Nam") && !d.includes("0901234567"));
});

test("doanSoKhach: dịch vụ không có trong danh sách của đơn → cũng ghi 'dịch vụ nhập tay' (không đoán tên)", () => {
  assert.equal(doanSoKhach([{ serviceId: "lạ", pax: pax(1) }], [{ serviceId: "lạ", pax: pax(2) }], DV), "số khách: dịch vụ nhập tay: người lớn 1 → 2");
});

test("ghepLyDo: lý do LUÔN ở cuối, sau ' · lý do: '", () => {
  assert.equal(ghepLyDo("số khách: Tour 3 đảo: người lớn 4 → 3", "Khách báo bớt 1"), "số khách: Tour 3 đảo: người lớn 4 → 3 · lý do: Khách báo bớt 1");
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// HÀM ĐỌC (ADR-0062 "Bài kiểm" mục 2)

/** Câu tin "không tên" như thong-bao.ts dựng — để quét chữ cấm trên đúng chuỗi người nhận thấy. */
const cau = (k: PhanDoiTin | null): string =>
  k === null ? "" : k.loai === "cu-the" ? `Đơn TD-1: ${k.phan}` : k.cau === "chang" ? "Đơn TD-1 vừa đổi chặng đưa đón" : "Đơn TD-1: đổi số khách";
const cuThe = (phan: string, gioHen = false): PhanDoiTin => ({ loai: "cu-the", phan, gioHen });
const chung = (c: "chang" | "so-khach", gioHen = false): PhanDoiTin => ({ loai: "chung", cau: c, gioHen });
const CAM = ["0901234567", "Anh Nam", "12 Trần Phú", "01:00", "02:00", "1 → 9", "lý do", "Khách báo"];
const khongLo = (c: string, them: string[] = []) => {
  for (const x of [...CAM, ...them]) assert.ok(!c.includes(x), `câu tin lộ "${x}": ${c}`);
};

/** Khuôn describeTripChange của orders (khứ hồi với hàm viết thật ở src/modules/orders/tin-doi-khu-hoi.test.ts). */
const dv = (ten: string, ...phan: string[]) => `${ten}: ${phan.join(", ")}`;

const chang = (v: Partial<MoTaChangVao> = {}): MoTaChangVao => ({
  direction: "OUT", pickupDate: "2027-03-11", pickupTime: "07:00", noiDon: "Khách sạn Biển Xanh", noiTra: "Bến tàu", soHieu: null, soNguoiVe: null, xeRieng: false, choToiThieu: null, ...v,
});

test("trip_updated: 'cập nhật chặng đưa đón' (có / không đuôi đặt gấp) → câu chung", () => {
  assert.deepEqual(phanDoiCuaTin("trip_updated", CAP_NHAT_CHANG), chung("chang"));
  assert.deepEqual(phanDoiCuaTin("trip_updated", `${CAP_NHAT_CHANG}${ghiDatGapNhatKy(LY_DO_DAT_GAP.KHAC)}`), chung("chang"));
});

test("trip_updated chỉ đổi ghi chú / nơi check-in → KHÔNG tin; đổi giờ khởi hành / check-in (câu 3 = A) → có tin; điểm đón → 'đổi nơi đón' (không chữ nơi)", () => {
  assert.equal(phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "đổi ghi chú")), null);
  assert.equal(phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "đổi nơi check-in", "đổi ghi chú")), null);
  assert.deepEqual(phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "giờ khởi hành 07:30 → 08:00")), cuThe("giờ khởi hành 07:30 → 08:00"));
  assert.deepEqual(phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "giờ check-in (trống) → 14:00")), cuThe("giờ check-in (trống) → 14:00"));
  assert.deepEqual(phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "ngày khởi hành 2027-03-11 → 2027-03-12")), cuThe("ngày khởi hành 11/03/2027 → 12/03/2027"));
  assert.deepEqual(
    phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "giờ đón 07:00 → 06:30", "đổi điểm đón", "đổi ghi chú")),
    cuThe("giờ đón 07:00 → 06:30, đổi nơi đón"),
  );
});

test("đuôi đặt gấp (mọi nhãn lý do) không lọt vào câu tin", () => {
  for (const nhan of Object.values(LY_DO_DAT_GAP)) {
    const k = phanDoiCuaTin("trip_updated", `${dv("Tour 3 đảo", "giờ đón 07:00 → 06:30")}${ghiDatGapNhatKy(nhan)}`);
    assert.deepEqual(k, cuThe("giờ đón 07:00 → 06:30"), nhan);
    assert.ok(!cau(k).includes("đặt gấp") && !cau(k).includes(nhan));
    const l = phanDoiCuaTin("order_leg_updated", `${moTaChang("Tour 3 đảo", chang({ pickupTime: "07:00" }), chang({ pickupTime: "06:30" }))!}${ghiDatGapNhatKy(nhan)}`);
    assert.deepEqual(l, cuThe("Chiều đi: giờ đón 07:00 → 06:30", true), nhan);
  }
});

test("đuôi lạ ở cuối (vd đuôi lượt đổi giờ của ADR-0063 — chưa có hàm viết trên nhánh này) → câu chung, không in đuôi", () => {
  const k = phanDoiCuaTin("trip_updated", `${dv("Tour 3 đảo", "giờ đón 07:00 → 06:30")} · tính 1 lượt đổi giờ`);
  assert.deepEqual(k, chung("chang"));
  assert.ok(!cau(k).includes("lượt"));
});

test("khứ hồi moTaChang: mọi tổ hợp phần đổi → đọc ra đúng phần giữ (ngày/giờ đón, 'đổi nơi đón'); phần phụ (nơi trả, số hiệu, số người về, xe) bỏ", () => {
  const doi: Record<string, Partial<MoTaChangVao>> = {
    ngay: { pickupDate: "2027-03-12" }, gio: { pickupTime: "06:30" }, noiDon: { noiDon: "12 Trần Phú; giờ đón 01:00 → 02:00" }, noiTra: { noiTra: "Sân bay → Cam Ranh" },
    soHieu: { soHieu: "VN1553" }, soVe: { soNguoiVe: 3 }, xeRieng: { xeRieng: true }, choTT: { choToiThieu: 16 },
  };
  const khoa = Object.keys(doi);
  let dem = 0;
  for (let mask = 1; mask < 1 << khoa.length; mask++) {
    const chon = khoa.filter((_, i) => mask & (1 << i));
    const sau = chang(Object.assign({}, ...chon.map((k) => doi[k])));
    for (const ten of ["Tour 3 đảo", "Anh Nam 0901234567", "Tour: đảo; giờ đón 01:00 → 02:00"]) {
      const d = moTaChang(ten, chang(), sau)!;
      const k = phanDoiCuaTin("order_leg_updated", d);
      const giu = [
        ...(chon.includes("ngay") ? ["ngày đón 11/03/2027 → 12/03/2027"] : []),
        ...(chon.includes("gio") ? ["giờ đón 07:00 → 06:30"] : []),
        ...(chon.includes("noiDon") ? ["đổi nơi đón"] : []),
      ];
      const gioHen = chon.includes("ngay") || chon.includes("gio");
      if (k?.loai === "chung") {
        // Tên / chữ nơi đối kháng có thể cho nhiều cách đọc → câu chung chấp nhận được (báo thừa) — luôn gioHen = true.
        assert.equal(k.gioHen, true);
      } else if (giu.length === 0) assert.equal(k, null, `${ten} ${chon}: ${d}`);
      else assert.deepEqual(k, cuThe(`Chiều đi: ${giu.join(", ")}`, gioHen), `${ten} ${chon}: ${d}`);
      khongLo(cau(k), ["đảo", ...(ten === "Tour 3 đảo" ? [] : ["Tour:"])]);
      dem++;
    }
  }
  assert.equal(dem, 255 * 3);
});

test("khứ hồi moTaChang: tên thường + nơi thường → đọc CỤ THỂ (không rơi về câu chung)", () => {
  const d = moTaChang("Tour 3 đảo", chang(), chang({ pickupTime: "06:30", noiDon: "Khách sạn Mường Thanh", noiTra: "Ga Nha Trang", soHieu: "VJ123" }))!;
  assert.deepEqual(phanDoiCuaTin("order_leg_updated", d), cuThe("Chiều đi: giờ đón 07:00 → 06:30, đổi nơi đón", true));
  const v = moTaChang("Tour 3 đảo", chang({ direction: "RETURN" }), chang({ direction: "RETURN", noiDon: "Bến tàu Cầu Đá" }))!;
  assert.deepEqual(phanDoiCuaTin("order_leg_updated", v), cuThe("Chiều về: đổi nơi đón", false));
});

test("order_leg_updated chỉ đổi nơi trả / số hiệu / số người về / xe → KHÔNG tin", () => {
  for (const sau of [chang({ noiTra: "Sân bay" }), chang({ soHieu: "VN1553" }), chang({ soNguoiVe: 2 }), chang({ xeRieng: true }), chang({ choToiThieu: 29 })]) {
    assert.equal(phanDoiCuaTin("order_leg_updated", moTaChang("Tour 3 đảo", chang(), sau)!), null, JSON.stringify(sau));
  }
});

test("order_leg_added / order_leg_closed: thêm / bỏ chặng đón — KHÔNG đọc detail (chữ nơi tự do)", () => {
  const them = moTaChang("Anh Nam 0901234567", null, chang({ noiDon: "12 Trần Phú" }))!;
  assert.deepEqual(phanDoiCuaTin("order_leg_added", them), cuThe("thêm chặng đón"));
  assert.deepEqual(phanDoiCuaTin("order_leg_added", `${them}${ghiDatGapNhatKy(LY_DO_DAT_GAP.KHAC)}`), cuThe("thêm chặng đón"));
  assert.deepEqual(phanDoiCuaTin("order_leg_closed", moTaChang("Anh Nam 0901234567", chang(), null, "NOT_NEEDED")!), cuThe("bỏ chặng đón"));
});

test("hành động ngoài tập nguồn → null (không có câu chung cho dòng không qua bộ lọc)", () => {
  for (const a of ["updated", "confirmed", "order_leg_short_notice", "order_passenger_changed", "booker_changed"]) assert.equal(phanDoiCuaTin(a, "Tour: giờ đón 07:00 → 06:30"), null, a);
});

test("số khách: khứ hồi doanSoKhach + ghepLyDo → 'đổi số khách (…)'; lý do KHÔNG BAO GIỜ vào câu", () => {
  const before = [{ serviceId: "s1", pax: pax(4, 1) }, { serviceId: "s3", pax: pax(2) }];
  const after = [{ serviceId: "s1", pax: pax(3, 0) }, { serviceId: "s3", pax: pax(3) }];
  const d = ghepLyDo(doanSoKhach(before, after, DV), "Khách báo thêm; SĐT 0901234567 · lý do: số khách đi xe 1 → 9");
  const k = phanDoiCuaTin("order_money_adjusted_by_field", d, true);
  assert.deepEqual(k, cuThe("đổi số khách (Tour 3 đảo: người lớn 4 → 3, trẻ em 1 → 0 | dịch vụ nhập tay: người lớn 2 → 3)"));
  khongLo(cau(k), ["SĐT"]);
  assert.deepEqual(phanDoiCuaTin("order_money_adjusted", d, true), k, "văn phòng (ADR-0063 D1) dùng cùng khuôn");
});

test("số khách: dòng cũ (detail chỉ là lý do) / lý do chứa 'số khách đi xe 1 → 9' → câu chung, không in gì của lý do", () => {
  for (const d of ["Khách báo thêm 1 người", "số khách đi xe 1 → 9", "số khách đi xe 1 → 9 · lý do: x", "", "số khách: "]) {
    const k = phanDoiCuaTin("order_money_adjusted_by_field", d, true);
    assert.deepEqual(k, chung("so-khach"), d);
    khongLo(cau(k));
  }
});

test("ca chéo tiền tố: 'số khách: …' trong trip_updated không đọc thành số khách; 'số khách đi xe' ở dòng số khách không đọc thành đoạn số khách", () => {
  const k = phanDoiCuaTin("trip_updated", "số khách: Tour: người lớn 4 → 3");
  assert.ok(k === null || k.loai === "chung", JSON.stringify(k));
  assert.ok(!cau(k).includes("người lớn"));
  assert.deepEqual(phanDoiCuaTin("order_money_adjusted_by_field", "số khách đi xe 4 → 3 · lý do: x", true), chung("so-khach"));
});

test("tên danh mục chứa ' · lý do: ' ở dòng số khách → cắt sớm, phần trước không khớp → câu chung", () => {
  const d = ghepLyDo(doanSoKhach([{ serviceId: "x", pax: pax(4) }], [{ serviceId: "x", pax: pax(3) }], [{ id: "x", catalogCode: "Z", name: "Tour · lý do: lạ" }]), "Anh Nam");
  assert.deepEqual(phanDoiCuaTin("order_money_adjusted_by_field", d, true), chung("so-khach"));
});

test("tên dịch vụ đối kháng (trip_updated) — mỗi ca một kết quả mong đợi, không bao giờ in đổi GIẢ", () => {
  // tên chứa ":" + đổi giờ thật → cụ thể, không chứa "đảo"
  let k = phanDoiCuaTin("trip_updated", dv("Tour: đảo", "giờ đón 07:00 → 06:30"));
  assert.deepEqual(k, cuThe("giờ đón 07:00 → 06:30"));
  khongLo(cau(k), ["đảo"]);
  // tên chứa " | " + đổi giờ giả → chỉ đổi thật
  k = phanDoiCuaTin("trip_updated", dv("Tour | giờ đón 01:00 → 02:00", "giờ đón 07:00 → 06:30"));
  assert.deepEqual(k, cuThe("giờ đón 07:00 → 06:30"));
  khongLo(cau(k));
  // tên khiến detail đọc được nhiều cách cho kết quả khác nhau → câu chung (đổi giả không lọt)
  k = phanDoiCuaTin("trip_updated", dv("A: giờ đón 01:00 → 02:00 | Z", "đổi ghi chú"));
  assert.deepEqual(k, chung("chang"));
  k = phanDoiCuaTin("trip_updated", dv("X → Y: giờ đón 01:00 → 02:00 | Z", "giờ đón 07:00 → 06:30"));
  assert.ok(k?.loai === "chung" || (k?.loai === "cu-the" && k.phan === "giờ đón 07:00 → 06:30"), JSON.stringify(k));
  khongLo(cau(k));
  // tên bắt đầu bằng "số khách đi xe 1 → 9 | " + đổi giờ thật → không có "số khách đi xe" (đoạn ADR-0065 chưa có, và chỉ được nhận ở cuối)
  k = phanDoiCuaTin("trip_updated", dv("số khách đi xe 1 → 9 | Tour", "giờ đón 07:00 → 06:30"));
  assert.deepEqual(k, cuThe("giờ đón 07:00 → 06:30"));
  khongLo(cau(k));
});

test("giá trị sai dạng (giờ đón 7h → 6h30) → câu chung, không in giá trị", () => {
  const k = phanDoiCuaTin("trip_updated", dv("Tour 3 đảo", "giờ đón 7h → 6h30"));
  assert.deepEqual(k, chung("chang"));
  assert.ok(!cau(k).includes("7h"));
  const l = phanDoiCuaTin("order_leg_updated", "Chiều đi · Tour: giờ đón 7h → 6h30");
  assert.deepEqual(l, chung("chang", true));
});

test("chữ nơi đón tự do chứa ', giờ đón 01:00 → 02:00' / '; giờ đón 01:00 → 02:00; nơi trả Q' → chỉ 'đổi nơi đón' (+ đổi thật) hoặc câu chung; KHÔNG BAO GIỜ '01:00 → 02:00'", () => {
  for (const noi of ["KS A, giờ đón 01:00 → 02:00", "KS A; giờ đón 01:00 → 02:00", "X → Y; giờ đón 01:00 → 02:00; nơi trả Q1", "; giờ đón 01:00 → 02:00", "giờ đón 01:00 → 02:00"]) {
    for (const [truoc, sau] of [[chang(), chang({ noiDon: noi })], [chang({ noiDon: noi }), chang({ noiDon: "Z" })], [chang({ noiDon: noi }), chang({ noiDon: "Z", pickupTime: "06:30" })]] as const) {
      const d = moTaChang("Tour", truoc, sau)!;
      const k = phanDoiCuaTin("order_leg_updated", d);
      assert.ok(k !== null, d);
      if (k.loai === "cu-the") assert.ok(["Chiều đi: đổi nơi đón", "Chiều đi: giờ đón 07:00 → 06:30, đổi nơi đón"].includes(k.phan), `${d} → ${k.phan}`);
      khongLo(cau(k), ["KS A", "X → Y", "Q1"]);
    }
  }
});

test("gioHen (MQ-07): chỉ order_leg_updated có đổi ngày / giờ đón (hoặc câu chung của chặng) — trip_updated, thêm / bỏ chặng, số khách luôn false", () => {
  assert.equal(phanDoiCuaTin("order_leg_updated", moTaChang("T", chang(), chang({ pickupDate: "2027-03-12" }))!)?.gioHen, true);
  assert.equal(phanDoiCuaTin("order_leg_updated", moTaChang("T", chang(), chang({ noiDon: "B" }))!)?.gioHen, false);
  assert.equal(phanDoiCuaTin("trip_updated", dv("T", "giờ đón 07:00 → 06:30"))?.gioHen, false);
  assert.equal(phanDoiCuaTin("order_leg_added", "x")?.gioHen, false);
  assert.equal(phanDoiCuaTin("order_leg_updated", "dòng lạ")?.gioHen, true, "không đọc được → báo thừa");
  assert.equal(Object.values(CHIEU_LABEL).length, 2);
});

test("chuỗi đối kháng dài (nhiều ': ', ' | ', ' → ', '; ') → trả kết quả an toàn, nhanh (không bùng nổ tổ hợp)", () => {
  const rac = Array.from({ length: 40 }, (_, i) => `a${i}: giờ đón 0${i % 10}:00 → 0${i % 10}:30 | nơi đón x → y; b`).join("");
  for (const [a, d] of [["trip_updated", `${rac}: giờ đón 07:00 → 06:30`], ["order_leg_updated", `Chiều đi · ${rac}: nơi đón ${rac} → ${rac}`]] as const) {
    const t0 = performance.now();
    const k = phanDoiCuaTin(a, d);
    assert.ok(performance.now() - t0 < 2000, `${a}: chậm`);
    assert.ok(k === null || k.loai === "chung" || !/0[0-9]:00 → 0[0-9]:30/.test(k.phan), JSON.stringify(k));
  }
});
