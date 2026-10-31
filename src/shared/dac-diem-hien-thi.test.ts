// Chữ và cảnh báo màn «Đặc điểm dịch vụ» (ADR-0152 Đ4 mục 2, (d), mục 4; ca vàng CV-8; tiêu chí 17, 17b; kế hoạch 2026-10-30 T12). Cảnh báo là GIAO DIỆN — máy chủ không ép.
import { test } from "node:test";
import assert from "node:assert/strict";
import type { CatalogDacDiemResponse, LuatBanDto } from "./contracts.ts";
import { CAU_CHUA_KIEM_LUAT, CAU_CHUA_KIEM_NHOM, canhBaoBatLai, canhBaoDoiNhom, canhBaoDoiGiaTri, canhBaoDoiTen, nhanNguon, trangThaiTuMan } from "./dac-diem-hien-thi.ts";

const luat = (o: Partial<LuatBanDto>): LuatBanDto => ({
  id: "l", loai: "LT", tenLoai: "Lễ tân khách sạn", phamVi: "ATTRIBUTE", catalogCode: null, tenDichVu: null, groupCode: null, tenNhom: null,
  attributeCode: "aVC", valueCode: "vKHONG", tenDacDiem: "Vận chuyển cảng–đảo", tenGiaTri: "Không gồm", tuNgay: "2026-10-01", denNgay: null, ghiChu: null,
  trangThai: "DANG_AP_DUNG", khongPhu: false, ...o,
});
// CV-3: Lễ tân khách sạn, Tài xế taxi không được đặt vé «Không gồm» trong nhóm Hòn Tằm.
const CV3 = [luat({ id: "l1", groupCode: "gHT", tenNhom: "Hòn Tằm" }), luat({ id: "l2", loai: "TX", tenLoai: "Tài xế taxi", groupCode: "gHT", tenNhom: "Hòn Tằm" })];
const dm: CatalogDacDiemResponse = {
  homNay: "2026-10-30",
  dacDiem: [{ code: "aVC", ten: "Vận chuyển cảng–đảo", thuTu: 1, dangDung: true, capNhatLuc: "x", chuaKhai: [], giaTri: [
    { code: "vGOM", ten: "Gồm", thuTu: 1, dangDung: true, capNhatLuc: "x" }, { code: "vKHONG", ten: "Không gồm", thuTu: 2, dangDung: true, capNhatLuc: "x" },
    { code: "vKHAC", ten: "Khác", thuTu: 3, dangDung: true, capNhatLuc: "x" }] }],
  dichVu: [
    { code: "H2", ten: "H2", dangBan: true, groupCode: "gHT", giaTri: { aVC: { valueCode: "vKHONG", nguon: "SERVICE" } } },
    { code: "H3", ten: "Hòn Tằm 3", dangBan: true, groupCode: "gHT", giaTri: { aVC: { valueCode: "vKHONG", nguon: "GROUP" } } },
    { code: "H4", ten: "Hòn Tằm 4", dangBan: true, groupCode: "gHT", giaTri: { aVC: { valueCode: "vKHONG", nguon: "GROUP" } } },
    { code: "K1", ten: "Ngoài nhóm", dangBan: true, groupCode: null, giaTri: {} },
  ],
  nhom: [{ code: "gHT", ten: "Hòn Tằm", dangDung: true, giaTri: { aVC: "vKHONG" } }],
  moiTheoNhom: [],
};

test("trạng thái dịch vụ từ dữ liệu màn: giá trị riêng thắng chung; bỏ riêng ⇒ theo nhóm; đổi nhóm ⇒ thừa hưởng nhóm mới", () => {
  assert.equal(trangThaiTuMan(dm, "H2").giaTri.get("aVC"), "vKHONG");
  assert.equal(trangThaiTuMan(dm, "H2", { rieng: { aVC: "vGOM" } }).giaTri.get("aVC"), "vGOM");
  assert.equal(trangThaiTuMan(dm, "K1", { rieng: { aVC: null } }).giaTri.get("aVC"), undefined, "bỏ riêng, không nhóm ⇒ chưa khai");
  assert.equal(trangThaiTuMan(dm, "H2", { rieng: { aVC: null } }).giaTri.get("aVC"), "vKHONG", "bỏ riêng ⇒ theo nhóm");
  assert.equal(trangThaiTuMan(dm, "H3", { nhom: null }).giaTri.get("aVC"), undefined, "rời nhóm ⇒ mất giá trị thừa hưởng");
  assert.deepEqual([nhanNguon("SERVICE"), nhanNguon("GROUP")], ["riêng", "theo nhóm"]);
});

test("CV-8: Bán hàng đổi H2 «Không gồm» → «Gồm» khi CV-3 hiệu lực ⇒ «sẽ bỏ chặn «H2» cho: Lễ tân khách sạn, Tài xế taxi»; đổi ngược ⇒ «bắt đầu chặn»", () => {
  const truoc = trangThaiTuMan(dm, "H2");
  const sau = trangThaiTuMan(dm, "H2", { rieng: { aVC: "vGOM" } });
  assert.equal(canhBaoDoiGiaTri({ luat: CV3, truoc: [truoc], sau: [sau] }), "Đổi giá trị này sẽ bỏ chặn «H2» cho: Lễ tân khách sạn, Tài xế taxi.");
  assert.equal(canhBaoDoiGiaTri({ luat: CV3, truoc: [sau], sau: [truoc] }), "Đổi giá trị này sẽ bắt đầu chặn «H2» cho: Lễ tân khách sạn, Tài xế taxi.");
});

test("đổi giữa hai giá trị đều không có luật ⇒ null; luật đã kết thúc hoặc «không phủ» không tính; dịch vụ vẫn bị luật khác chặn ⇒ không nói «bỏ chặn» loại đó", () => {
  const gom = trangThaiTuMan(dm, "H2", { rieng: { aVC: "vGOM" } });
  const khac = trangThaiTuMan(dm, "H2", { rieng: { aVC: "vKHAC" } });
  assert.equal(canhBaoDoiGiaTri({ luat: CV3, truoc: [gom], sau: [khac] }), null);
  const truoc = trangThaiTuMan(dm, "H2");
  assert.equal(canhBaoDoiGiaTri({ luat: [luat({ trangThai: "DA_KET_THUC", denNgay: "2026-10-20" })], truoc: [truoc], sau: [gom] }), null);
  assert.equal(canhBaoDoiGiaTri({ luat: [luat({ khongPhu: true })], truoc: [truoc], sau: [gom] }), null);
  // Luật «Một dịch vụ» H2 cho Lễ tân vẫn chặn sau khi đổi ⇒ chỉ Tài xế taxi được bỏ chặn.
  const conChan = [...CV3, luat({ id: "l3", phamVi: "SERVICE", catalogCode: "H2", attributeCode: null, valueCode: null })];
  assert.equal(canhBaoDoiGiaTri({ luat: conChan, truoc: [truoc], sau: [gom] }), "Đổi giá trị này sẽ bỏ chặn «H2» cho: Tài xế taxi.");
});

test("đổi giá trị THEO NHÓM ⇒ nêu số dịch vụ thừa hưởng (dịch vụ có giá trị riêng không bị ảnh hưởng)", () => {
  const truoc = dm.dichVu.filter((d) => d.groupCode === "gHT").map((d) => trangThaiTuMan(dm, d.code));
  const sau = dm.dichVu.filter((d) => d.groupCode === "gHT").map((d) => trangThaiTuMan(dm, d.code, { nhomGiaTri: { aVC: "vGOM" } }));
  assert.equal(canhBaoDoiGiaTri({ luat: CV3, truoc, sau }), "Đổi giá trị này sẽ bỏ chặn 2 dịch vụ đang theo nhóm («Hòn Tằm 3», «Hòn Tằm 4») cho: Lễ tân khách sạn, Tài xế taxi.");
});

test("không tải được danh sách luật ⇒ câu «chưa kiểm được» (không im lặng bỏ cảnh báo)", () => {
  assert.match(CAU_CHUA_KIEM_LUAT, /^Chưa kiểm được luật bán/);
  assert.equal(canhBaoDoiGiaTri({ luat: null, truoc: [trangThaiTuMan(dm, "H2")], sau: [trangThaiTuMan(dm, "H2", { rieng: { aVC: "vGOM" } })] }), CAU_CHUA_KIEM_LUAT);
});

test("ADR-0152 Đ4 (d), tiêu chí 17b: bật lại giá trị / đặc điểm còn luật trỏ tới ⇒ «còn N luật bán…, sẽ chặn [loại] khi … gắn lại»; không luật ⇒ null", () => {
  const tat = [luat({ id: "x1", khongPhu: true }), luat({ id: "x2", loai: "TX", tenLoai: "Tài xế taxi", khongPhu: true }), luat({ id: "x3", trangThai: "DA_KET_THUC", denNgay: "2026-10-01" })];
  assert.equal(canhBaoBatLai({ luat: tat, ma: "vKHONG", la: "GIA_TRI" }), "Còn 2 luật bán trỏ tới giá trị này, sẽ chặn Lễ tân khách sạn, Tài xế taxi khi giá trị được gắn lại cho dịch vụ.");
  assert.equal(canhBaoBatLai({ luat: [tat[0]!], ma: "aVC", la: "DAC_DIEM" }), "Còn 1 luật bán trỏ tới đặc điểm này, sẽ chặn Lễ tân khách sạn khi giá trị của đặc điểm được gắn lại cho dịch vụ.");
  assert.equal(canhBaoBatLai({ luat: tat, ma: "vGOM", la: "GIA_TRI" }), null);
  assert.equal(canhBaoBatLai({ luat: null, ma: "vGOM", la: "GIA_TRI" }), CAU_CHUA_KIEM_LUAT);
});

test("ADR-0152 Đ4 mục 4: đổi TÊN giá trị có luật trỏ tới ⇒ cảnh báo (không đổi luật, nhưng người đọc luật thấy tên mới); không luật ⇒ null", () => {
  assert.equal(
    canhBaoDoiTen({ luat: CV3, ma: "vKHONG", la: "GIA_TRI", tenCu: "Không gồm", tenMoi: "Không bao gồm" }),
    "Giá trị «Không gồm» đang có 2 luật bán trỏ tới (Lễ tân khách sạn, Tài xế taxi). Đổi tên thành «Không bao gồm» không đổi dịch vụ nào bị chặn, nhưng các luật đó sẽ hiện tên mới — kiểm tra tên mới vẫn đúng nghĩa.",
  );
  assert.equal(canhBaoDoiTen({ luat: CV3, ma: "vGOM", la: "GIA_TRI", tenCu: "Gồm", tenMoi: "Có gồm" }), null);
  assert.match(canhBaoDoiTen({ luat: CV3, ma: "aVC", la: "DAC_DIEM", tenCu: "Vận chuyển", tenMoi: "Đưa đón" }) ?? "", /^Đặc điểm «Vận chuyển» đang có 2 luật bán/);
});

// ---- T13: màn gán nhóm (ADR-0146 Đ3 «Màn gán nhóm phải cảnh báo»; ADR-0152 Đ4 (c)) ----
const dm2: CatalogDacDiemResponse = {
  ...dm,
  dichVu: [...dm.dichVu, { code: "M1", ten: "Tour Mới", dangBan: true, groupCode: "gKHAC", giaTri: { aVC: { valueCode: "vGOM", nguon: "GROUP" } } }],
  nhom: [...dm.nhom, { code: "gKHAC", ten: "Đảo Khác", dangDung: true, giaTri: { aVC: "vGOM" } }, { code: "gRONG", ten: "Nhóm Rỗng", dangDung: true, giaTri: {} }],
};
const nhomLuat = (g: string, ten: string, loai = "Lễ tân khách sạn") => luat({ id: `n-${g}`, phamVi: "GROUP", groupCode: g, tenNhom: ten, attributeCode: null, valueCode: null, tenLoai: loai });

test("T13: nhóm CŨ có luật «cả nhóm» ⇒ «thôi chặn»; nhóm MỚI có luật ⇒ «bắt đầu chặn»", () => {
  const cu = canhBaoDoiNhom({ luat: [nhomLuat("gKHAC", "Đảo Khác")], dm: dm2, codes: ["M1"], nhomMoi: "gRONG" });
  assert.match(cu ?? "", /^Chuyển nhóm sẽ thôi chặn «Tour Mới» cho: Lễ tân khách sạn\./);
  const moi = canhBaoDoiNhom({ luat: [nhomLuat("gRONG", "Nhóm Rỗng", "Tài xế taxi")], dm: dm2, codes: ["M1"], nhomMoi: "gRONG" });
  assert.match(moi ?? "", /^Chuyển nhóm sẽ bắt đầu chặn «Tour Mới» cho: Tài xế taxi\./);
});

test("T13: giá trị thừa hưởng đổi ⇒ nêu đặc điểm cũ → mới; kéo theo luật theo đặc điểm trong nhóm (CV-3) ⇒ nêu bắt đầu chặn", () => {
  // M1 (thừa hưởng «Gồm» từ Đảo Khác) sang Hòn Tằm (chung «Không gồm») ⇒ CV-3 bắt đầu chặn.
  const c = canhBaoDoiNhom({ luat: CV3, dm: dm2, codes: ["M1"], nhomMoi: "gHT" }) ?? "";
  assert.match(c, /bắt đầu chặn «Tour Mới» cho: Lễ tân khách sạn, Tài xế taxi\./);
  assert.match(c, /Giá trị thừa hưởng đổi: Vận chuyển cảng–đảo: Gồm → Không gồm \(«Tour Mới»\)\./);
  // Không luật nào, chỉ giá trị thừa hưởng đổi ⇒ vẫn cảnh báo (nêu đặc điểm).
  assert.equal(canhBaoDoiNhom({ luat: [], dm: dm2, codes: ["M1"], nhomMoi: null }), "Giá trị thừa hưởng đổi: Vận chuyển cảng–đảo: Gồm → chưa khai («Tour Mới»).");
  // Dịch vụ có giá trị riêng: không thừa hưởng, không đổi gì ⇒ null.
  assert.equal(canhBaoDoiNhom({ luat: [], dm: dm2, codes: ["H2"], nhomMoi: "gKHAC" }), null);
});

test("T13: không tải được luật hoặc đặc điểm ⇒ câu «chưa kiểm được»", () => {
  assert.equal(canhBaoDoiNhom({ luat: null, dm: dm2, codes: ["M1"], nhomMoi: "gHT" }), CAU_CHUA_KIEM_NHOM);
  assert.equal(canhBaoDoiNhom({ luat: [], dm: null, codes: ["M1"], nhomMoi: "gHT" }), CAU_CHUA_KIEM_NHOM);
  assert.match(CAU_CHUA_KIEM_NHOM, /^Chưa kiểm được/);
});
