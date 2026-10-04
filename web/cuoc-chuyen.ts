// Một chuyến của TÀI XẾ (/cuoc-chuyen?id=) — ADR-0049 V6 Chuyến đang chạy (route 20–29) + V7 Xuất bến; bản vẽ docs/design/van-chuyen-dieu-phoi/project/05
// (5a, 5b), 06 (6b, 6c); bản đối chiếu 2.5, H15; ruling R-P11, R-P17; lệnh điều phối vòng 3.
// - Chưa xuất bến: CHỈ điều kiện CÒN THIẾU, mỗi dòng "(văn phòng lo)"; đạt hết → "Đủ điều kiện xuất bến" (không hạn giấy tờ, không số giấy tờ); nút "Xuất bến"
//   dính đáy, khoá khi còn thiếu. Tài xế tự bấm: KHÔNG ô "xảy ra lúc" — giờ là lúc bấm (máy chủ từ chối `xayRaLuc` từ route tài xế).
// - Đang chạy: thẻ từng điểm (đón: khách + Đã đón / Vắng / Khách đã huỷ; trả: "Đã trả"), liên hệ của đơn (CHỈ từ GET — phản hồi lệnh không kèm, màn giữ
//   `lienHe` của lần GET; không lưu vào bộ nhớ trình duyệt), đổi thứ tự điểm chưa tới bằng nút lên / xuống (không ô giờ), "Kết thúc chuyến", "Kết thúc gián
//   đoạn" (chọn lý do; KHÔNG ô ghi chú — chủ Q1).
// - HT-03 (kiểm theo vai 2/10 — V1.3): "Xuất bến" mở bảng trượt xác nhận (mã chuyến, ngày chạy, giờ dự kiến, biển số, số khách — `hopXuatBen`); ngày chạy
//   khác hôm nay → dòng cảnh báo đỏ trên trang VÀ trong hộp (`canhBaoNgayChay`, chung với văn phòng). Không dùng confirm() của trình duyệt.
// - Kiểu A (V1.4): "Đã trả" cả điểm và "Kết thúc chuyến" cũng qua bảng trượt xác nhận (`hopTraCaDiem`, `hopKetThuc`); lệnh suất một chạm (Đã đón / Vắng /
//   Khách đã huỷ / người đi kèm) giữ một chạm nhưng hiện ngay "Vừa ghi … — Sai? Báo văn phòng." dưới dòng đó (`dongVuaGhi`).
// - Đợt 5 (bản vẽ V6 bổ sung): điểm văn phòng thêm khi xe chạy → dải "Văn phòng vừa thêm điểm" (giờ đón + tổng khách — lời chủ 5.3) tới khi bấm "Đã xem"
//   (máy này nhớ, `localStorage` bọc try/catch); chip "Mới thêm" / "Văn phòng đã báo huỷ — vẫn tới điểm" ở `veDiemChay`.
// - Mất mạng: dòng đó "Chưa gửi được" + "Bấm lại" (CÙNG requestId — bấm lại hai lần vẫn một lệnh); máy KHÔNG tự gửi lại (lệnh điều phối, khác câu 5a).
import { giuTenKhach, ketThucDuoc, chiSuatKhach, soHieuTaiDiemDon, tenNguoiDiKemCuaChuyen, thanDoiThuTu, viecNguoiDiKem, type BuocDiem } from "../src/shared/tien-do-man";
import type { CuocChiTietResponse } from "../src/shared/contracts";
import { coCuocCuaToi } from "../src/shared/start-page";
import { ApiError, api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, nhomChon, taoLenh } from "./dieu-phoi-ui";
import { loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";
import { taoBoLamMoi } from "./lam-moi-logic";
import type { SuKienChuyen } from "../src/shared/bang-tin";
import { cauLoiTienDo, dongMoc, veDiemChay, type LenhDiem } from "./tien-do-ui";
import { msToVnLocal, ngayNgan, vnToday } from "../src/shared/vn-date";
import { canhBaoNgayChay, hopXuatBen } from "../src/shared/xac-nhan-xuat-ben";
import { diemMoiChuaXem } from "../src/shared/xe-dang-chay-man";
import { dongVuaGhi, hopKetThuc, hopTraCaDiem, type HopXacNhan, type LenhVuaGhi } from "../src/shared/xac-nhan-tien-do";

const errorEl = byId("error");
const trangEl = byId("cc-trang");
const dayEl = byId("cc-day");
const id = new URLSearchParams(location.search).get("id") ?? "";
const goc = `/api/van-chuyen/cuoc-cua-toi/${encodeURIComponent(id)}`;

let duLieu: CuocChiTietResponse | null = null;
/** Liên hệ của đơn — CHỈ từ GET trong ngày chạy; lệnh tiến độ không trả lại khoá này (R-P11). Chỉ giữ trong bộ nhớ trang. */
let lienHe: NonNullable<CuocChiTietResponse["lienHe"]> = [];
let baoCao: HTMLElement | null = null;
/** Kiểu A (V1.4): lệnh suất một chạm vừa ghi xong — dòng "Vừa ghi …" dưới đúng dòng khách / người đi kèm; lệnh kế tiếp xoá. Chỉ trong bộ nhớ trang. */
let vuaGhi: { suatId: string; cau: string } | null = null;
/** Việc chưa gửi được (mất mạng): khoá dòng → hàm gửi lại (cùng thân ⇒ cùng requestId qua `taoLenh`). */
const choGui = new Map<string, () => Promise<void>>();
const cacLenh = new Map<string, ReturnType<typeof taoLenh>>();
const gui = async (duoi: string, than: Record<string, unknown> = {}): Promise<void> => {
  const url = `${goc}/${duoi}`;
  let l = cacLenh.get(url);
  if (!l) cacLenh.set(url, (l = taoLenh()));
  const r = await l.gui<CuocChiTietResponse>(url, "POST", than);
  // GA-55 (máy chủ A18): phản hồi lệnh tiến độ KHÔNG còn tên khách, liên hệ — đọc lại GET chi tiết (route duy nhất trả tên trong ngày chạy); đọc lại
  // hỏng (mất mạng) thì giữ tên đã có theo id suất và liên hệ của lần GET trước.
  try {
    await nap();
  } catch {
    duLieu = giuTenKhach(r, duLieu);
  }
};

async function nap(): Promise<void> {
  duLieu = await api<CuocChiTietResponse>(goc);
  lienHe = duLieu.lienHe ?? [];
}

/** Chạy một lệnh: mất mạng → ghi vào `choGui` (dòng đó hiện "Chưa gửi được" + "Bấm lại"); lỗi khác → dải báo. */
async function chay(khoa: string, viec: () => Promise<void>): Promise<void> {
  vuaGhi = null;
  try {
    await viec();
    choGui.delete(khoa);
    baoCao = null;
  } catch (e) {
    if (!(e instanceof ApiError)) choGui.set(khoa, viec);
    else {
      choGui.delete(khoa);
      baoCao = dai("danger", cauLoiTienDo(e, Date.now(), duLieu!.chuyen.gioBatDau.ngay).cau);
      await nap().catch(() => undefined);
    }
  }
  ve();
}

/** Dòng "Người đi kèm: <tên>" (hướng dẫn viên; chỉ tên, không SĐT) — ở mọi trạng thái chuyến. */
function dongDiKem(): HTMLElement | null {
  const ten = tenNguoiDiKemCuaChuyen(duLieu!.suat);
  return ten.length ? h("div", { class: "dp-cc-di-kem" }, icon("me", 16), h("span", null, `Người đi kèm: ${ten.join(", ")}`)) : null;
}

/** Người đi kèm cũng phải "Đã lên xe" → "Đã xuống" thì "Kết thúc chuyến" thường mới được (máy chủ đếm như khách): nút theo `viecNguoiDiKem`, chỉ khi xe đang chạy. */
function khoiDiKem(): HTMLElement | null {
  const viec = viecNguoiDiKem(duLieu!.suat);
  if (!viec.length || duLieu!.chuyen.trangThai !== "RUNNING") return null;
  return h("div", { class: "dp-cc-di-kem-viec" }, ...viec.map((v) => {
    const nut = v.lenh ? h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": `di-kem-${v.lenh}`, "data-suat": v.id }, v.nhan!) : null;
    nut?.addEventListener("click", () => void chay(`di-kem:${v.id}`, async () => {
      await gui(`phan-bo/${encodeURIComponent(v.id)}/${v.lenh}`);
      ghiVua(v.id, `di-kem-${v.lenh}` as LenhVuaGhi, v.ten);
    }));
    return h("div", { class: "dp-cc-di-kem-dong" }, h("span", null, `${v.ten} — ${v.trangThai === "WAITING" ? "chưa lên xe" : v.trangThai === "BOARDED" ? "đang trên xe" : "đã xuống"}`), nut,
      vuaGhi?.suatId === v.id ? h("div", { class: "dp-vua-ghi", role: "status" }, icon("check", 16, 2), h("span", null, vuaGhi.cau)) : null);
  }));
}

/** Điểm "thêm khi chạy" máy này đã xem (dải V6 6.1) — chỉ là tiện ích của máy; không đọc / ghi được thì dải hiện lại, không hỏng. */
const KHOA_DA_XEM = `cc-diem-da-xem:${id}`;
function daXem(): Set<string> {
  try {
    const v = JSON.parse(localStorage.getItem(KHOA_DA_XEM) ?? "[]") as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}
let daXemTam = new Set<string>();
function ghiDaXem(ids: readonly string[]): void {
  daXemTam = new Set([...daXemTam, ...ids]);
  try {
    localStorage.setItem(KHOA_DA_XEM, JSON.stringify([...new Set([...daXem(), ...ids])]));
  } catch {
    /* không ghi được: giữ trong bộ nhớ trang */
  }
}
function daiDiemMoi(): HTMLElement | null {
  const r = duLieu!;
  if (r.chuyen.trangThai !== "RUNNING") return null;
  const moi = diemMoiChuaXem(r.diem, new Set([...daXem(), ...daXemTam]), r.chuyen.gioBatDau.ngay);
  if (!moi.length) return null;
  const nut = h("button", { type: "button", class: "btn", "data-action": "da-xem-diem-moi" }, "Đã xem");
  nut.addEventListener("click", () => {
    ghiDaXem(moi.map((x) => x.id));
    ve();
  });
  return dai("info", "Văn phòng vừa thêm điểm", [...moi.map((x) => `${x.cau}.`), "Đã nằm trong lộ trình của bạn."], undefined, [h("div", { class: "banner-actions" }, nut)]);
}

function ve(): void {
  const r = duLieu!;
  const c = r.chuyen;
  document.title = `${c.ma} — Island Booking System`;
  setBarTitle(c.trangThai === "PLANNED" ? `Xuất bến ${c.ma}` : c.ma);
  const ngay = c.gioBatDau.ngay;
  const dauMang = choGui.size ? dai("warning", `Mất mạng — ${choGui.size} thao tác chưa gửi được`, ["Bấm lại ở dòng đó khi có mạng — máy không tự gửi lại."]) : null;
  if (c.trangThai === "PLANNED") return veXuatBen(dauMang);
  const trenXe = r.suat.filter((s) => s.trangThai === "BOARDED").length;
  const dauTrang = h(
    "div",
    { class: "dp-cc-head" },
    chip(c.trangThaiNhan, c.trangThai === "RUNNING" ? "unit" : c.trangThai === "ENDED" ? "ok" : "muted"),
    h("span", null, h("strong", null, c.bienSo), c.xuatBen ? ` · xuất bến ${c.xuatBen.gioXayRa.gio}` : "", " · trên xe ", h("strong", null, `${trenXe}/${c.soCho}`)),
  );
  const chayDuoc = c.trangThai === "RUNNING";
  const diem = veDiemChay({
    diem: r.diem, suat: r.suat, trangThai: c.trangThai, ngayXem: ngay, coNut: chayDuoc, onLenh: lenhDiem,
    choGui: new Set([...choGui.keys()]),
    vuaGhi,
    phuDiem: (b) => ({ ben: nutThuTu(b), duoi: [...bayCua(b, r.suat), ...lienHeCua(b)] }),
  });
  // "Bấm lại" ở dòng khách chưa gửi được.
  for (const el of diem) {
    for (const nut of el.querySelectorAll<HTMLButtonElement>('[data-action="bam-lai"]')) {
      nut.addEventListener("click", () => {
        const viec = choGui.get(nut.dataset.suat!);
        if (viec) void chay(nut.dataset.suat!, viec);
      });
    }
  }
  const diemCho = [...choGui.keys()].filter((k) => k.startsWith("diem:"));
  const ketThuc = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: !ketThucDuoc(r.suat), "data-action": "ket-thuc" }, "Kết thúc chuyến");
  // Kiểu A (V1.4): "Kết thúc chuyến" mở hộp xác nhận (tóm tắt kết quả khách) — lệnh chỉ gửi khi bấm nút trong hộp.
  ketThuc.addEventListener("click", () => moXacNhan(ketThuc, hopKetThuc({ ma: c.ma, suat: r.suat }), "ket-thuc", () => void chay("ket-thuc", () => gui("ket-thuc"))));
  const gianDoan = h("button", { type: "button", class: "vc-btn vc-btn-stop dp-gian-doan", "data-action": "ket-thuc-gian-doan" }, "Kết thúc gián đoạn"); // bản 1.39: nút viền đỏ, nhỏ hơn — không còn là nút to nhất lúc đang chạy (nút xác nhận trong hộp vẫn đỏ đặc)
  gianDoan.addEventListener("click", () => moGianDoan(gianDoan));
  replaceChildren(
    trangEl,
    dauMang,
    baoCao,
    daiDiemMoi(),
    dauTrang,
    dongDiKem(),
    khoiDiKem(),
    c.ketThucThat ? h("div", { class: "dp-ct-moc" }, dongMoc(c.trangThai === "ENDED_INTERRUPTED" ? "Kết thúc gián đoạn" : "Kết thúc", c.ketThucThat, ngay)) : null,
    ...diemCho.map((k) => h("div", { class: "dp-khach-cho" }, "Một lệnh ở điểm chưa gửi được", h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "bam-lai" }, "Bấm lại"))),
    h("div", { class: "dp-run-list" }, ...diem),
    chayDuoc ? h("div", { class: "dp-run-end thanh-hanh-dong-cuoi" }, ketThuc, ketThuc.disabled ? h("span", { class: "dp-note" }, "Bấm được khi đã trả hết khách và người đi kèm đã xuống.") : null, gianDoan) : null,
  );
  // Nút "Bấm lại" của lệnh ở điểm (Đã tới / Đã trả).
  trangEl.querySelectorAll<HTMLButtonElement>(':scope > .dp-khach-cho [data-action="bam-lai"]').forEach((nut, i) => {
    nut.addEventListener("click", () => {
      const k = diemCho[i]!;
      const viec = choGui.get(k);
      if (viec) void chay(k, viec);
    });
  });
  dayEl.hidden = true;
}

/** Số hiệu chuyến bay của khách lên ở điểm đón này (ADR-0055 C3 — có mọi lúc, không chỉ ra người): cả trước xuất bến lẫn lúc chạy. */
function bayCua(b: BuocDiem, suat: CuocChiTietResponse["suat"]): Child[] {
  if (b.diem.loai !== "PICKUP") return [];
  const ds = soHieuTaiDiemDon(suat, b.diem.id);
  return ds.length ? [h("div", { class: "dp-run-bay" }, ...ds.map((x) => h("span", { class: "chip chip-code" }, `✈︎ ${x}`)))] : [];
}

/** Liên hệ của đơn có khách lên ở điểm đón này (chỉ trong ngày chạy — DTO có `lienHe`). */
function lienHeCua(b: BuocDiem): Child[] {
  if (b.diem.loai !== "PICKUP" || !lienHe.length) return [];
  const don = new Set(duLieu!.suat.filter((s) => s.diemLen === b.diem.id && s.maDon).map((s) => s.maDon));
  return lienHe.filter((l) => don.has(l.maDon)).map((l) =>
    h("div", { class: "dp-run-lien-he" }, icon("handset", 16), h("span", null, `Liên hệ: ${l.tenLienHe}`), h("a", { href: `tel:${l.sdtLienHe.replace(/[^\d+]/g, "")}` }, l.sdtLienHe)));
}

/** Đổi thứ tự điểm CHƯA TỚI (route 29) — nút lên / xuống thay tay nắm kéo của bản vẽ 5a (bấm được bằng bàn phím); không ô giờ. */
function nutThuTu(b: BuocDiem): HTMLElement | null {
  const r = duLieu!;
  if (r.chuyen.trangThai !== "RUNNING" || b.diem.trangThai !== "PENDING") return null;
  const nut = (huong: -1 | 1, kyHieu: string, nhan: string, action: string) => {
    const than = thanDoiThuTu(r.diem, b.diem.id, huong);
    const x = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary dp-thu-tu", disabled: !than, "aria-label": nhan, "data-action": action }, kyHieu);
    x.addEventListener("click", () => { if (than) void chay("thu-tu", () => gui("thu-tu", than)); });
    return x;
  };
  return h("span", { class: "dp-thu-tu-nhom" }, nut(-1, "↑", `Đưa ${b.diem.tenNoi} lên trước`, "len"), nut(1, "↓", `Đưa ${b.diem.tenNoi} xuống sau`, "xuong"));
}

function lenhDiem(l: LenhDiem, nut: HTMLButtonElement): void {
  const d = l.buoc.diem;
  if (l.loai === "da-toi") return void chay(`diem:${d.id}`, () => gui(`diem/${encodeURIComponent(d.id)}/da-toi`));
  // Kiểu A (V1.4) + HT-02: "Đã trả" cả điểm mở hộp xác nhận (số khách xuống ở đây; 0 khách → cảnh báo) — lệnh chỉ gửi khi bấm nút trong hộp.
  if (l.loai === "tra-het") return moXacNhan(nut, hopTraCaDiem({ tenNoi: d.tenNoi, soKhach: l.buoc.traCho.length }), "tra-het", () => traHet(l));
  const lenh = l.loai;
  const ten = l.ten;
  void chay(l.suatId, async () => {
    await gui(`phan-bo/${encodeURIComponent(l.suatId)}/${lenh}`);
    ghiVua(l.suatId, lenh, ten);
  });
}

/** Ghi dòng "Vừa ghi …" (Kiểu A) cho lệnh suất vừa thành công; `ve()` của `chay` vẽ nó. */
function ghiVua(suatId: string, lenh: LenhVuaGhi, ten: string): void {
  const cau = dongVuaGhi(lenh, ten);
  vuaGhi = cau ? { suatId, cau } : null;
}

/** Bảng trượt xác nhận dùng chung cho lệnh chốt (Kết thúc chuyến, Đã trả cả điểm) — nội dung từ hàm thuần, giao diện chỉ vẽ. */
function moXacNhan(opener: HTMLElement, hop: HopXacNhan, ten: string, lam: () => void): void {
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": `${ten}-xac-nhan` }, hop.nutXacNhan);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": `${ten}-dong` }, "Chưa, quay lại");
  const bang = moBangTruot({
    title: hop.tieuDe,
    body: [
      hop.canhBao ? dai("warning", hop.canhBao) : null,
      h("dl", { class: "dp-xn-ds" }, ...hop.dong.flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
      h("p", { class: "dp-sheet-text dp-note" }, hop.ghiChu),
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", () => {
    chinh.disabled = true;
    bang.close(false);
    lam();
  });
}

/** "Đã trả" cả điểm sau khi xác nhận: tới điểm nếu chưa tới, rồi trả từng suất còn trên xe xuống ở đây. */
function traHet(l: Extract<LenhDiem, { loai: "tra-het" }>): void {
  const d = l.buoc.diem;
  void chay(`diem:${d.id}`, async () => {
    if (duLieu!.diem.find((x) => x.id === d.id)?.trangThai === "PENDING") await gui(`diem/${encodeURIComponent(d.id)}/da-toi`);
    for (const sid of l.buoc.traCho) {
      if (duLieu!.suat.find((x) => x.id === sid)?.trangThai !== "BOARDED") continue;
      await gui(`phan-bo/${encodeURIComponent(sid)}/tra`);
    }
  });
}

/** Hộp "Kết thúc gián đoạn" (bản vẽ 5b): lý do nhóm Kết thúc gián đoạn; không ô ghi chú (Q1). */
function moGianDoan(opener: HTMLElement): void {
  const r = duLieu!;
  let lyDo: string | null = null;
  const conTren = chiSuatKhach(r.suat).filter((s) => s.trangThai === "BOARDED").length;
  const chuaDon = chiSuatKhach(r.suat).filter((s) => s.trangThai === "WAITING").length;
  const loi = h("div", { class: "vc-field-error", role: "alert", hidden: true });
  const chinh = h("button", { type: "button", class: "vc-btn vc-btn-danger", disabled: true, "data-action": "gian-doan-gui" }, "Kết thúc gián đoạn");
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Đóng");
  const bang = moBangTruot({
    title: "Kết thúc gián đoạn",
    body: [
      h("p", { class: "dp-sheet-text" }, `${r.chuyen.ma} dừng ở đây. ${conTren} khách còn trên xe và ${chuaDon} khách chưa đón sẽ báo về văn phòng.`),
      nhomChon("cc-gd", "Lý do", r.lyDo.map((x) => ({ code: x.code, nhan: x.nhan })), (c) => {
        lyDo = c;
        chinh.disabled = false;
      }),
      loi,
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", async () => {
    if (!lyDo) return;
    bang.setBusy(true);
    chinh.disabled = true;
    try {
      await gui("ket-thuc-gian-doan", { lyDo });
      bang.close(false);
      baoCao = dai("info", `Đã kết thúc gián đoạn ${duLieu!.chuyen.ma}`, ["Văn phòng đã nhận báo."]);
      ve();
    } catch (e) {
      replaceChildren(loi, icon("alert", 16, 2), cauLoiTienDo(e, Date.now(), r.chuyen.gioBatDau.ngay).cau);
      loi.hidden = false;
      chinh.disabled = false;
    } finally {
      bang.setBusy(false);
    }
  });
}

/** Điểm của chuyến CHƯA xuất bến (bản 1.39): số người ở mỗi điểm; điểm trả có giờ hẹn thì ghi kèm (điểm đón đã có "HẸN …" ở nhãn loại). */
function veDiemTruoc(r: CuocChiTietResponse): HTMLElement[] {
  const theoId = new Map(r.diem.map((d) => [d.id, d]));
  return veDiemChay({
    diem: r.diem, suat: [], trangThai: r.chuyen.trangThai, ngayXem: r.chuyen.gioBatDau.ngay, coNut: false, onLenh: () => undefined,
    phuDiem: (b) => {
      const d = theoId.get(b.diem.id)!;
      const hen = d.loai === "DROPOFF" && d.gioHen ? `Hẹn ${d.gioHen.gio} · ` : "";
      return { duoi: [...bayCua(b, r.suat), h("div", { class: "dp-note dp-cc-so-nguoi" }, `${hen}${d.soNguoi} khách`)] };
    },
  });
}

/** Xuất bến (bản vẽ 6b, 6c — màn tài xế): chỉ điều kiện CÒN THIẾU "(văn phòng lo)"; đạt hết → "Đủ điều kiện xuất bến". Không ô giờ. */
function veXuatBen(dauMang: HTMLElement | null): void {
  const r = duLieu!;
  const c = r.chuyen;
  const thieu = r.dieuKienConThieu;
  const lechNgay = canhBaoNgayChay(c.gioBatDau.ngay, vnToday(new Date()));
  replaceChildren(
    trangEl,
    dauMang,
    baoCao,
    lechNgay ? dai("danger", "Không phải chuyến của hôm nay", [lechNgay]) : null,
    h("div", { class: "dp-note dp-cc-meta" }, `${c.bienSo} · ${ngayNgan(c.gioBatDau.ngay, vnToday(new Date()))} ${c.gioBatDau.gio} · ${chiSuatKhach(r.suat).length} khách`),
    dongDiKem(),
    // Bản 1.39 (chủ quyết 30/9: "tài xế nên thấy điểm đón từ trước, ngày giờ đón, vị trí và số lượng khách"): các điểm của chuyến TRƯỚC khi xuất bến — thứ tự,
    // loại, tên nơi, giờ hẹn, số người; dùng lại cách vẽ điểm của màn đang chạy, KHÔNG nút tiến độ, KHÔNG khách từng người (`suat: []`) — tên / SĐT khách vẫn
    // chỉ trong ngày chạy (ADR-0053 D7.2). Chỉ vẽ dữ liệu route 20 đã gửi (`diem`), không đổi máy chủ.
    h("div", { class: "dp-run-list dp-cc-diem" }, ...veDiemTruoc(r)),
    h(
      "section",
      { class: "vc-card dp-side-card", "aria-labelledby": "cc-dk-title" },
      h("div", { class: "dp-card-head" }, h("h2", { id: "cc-dk-title", class: "dp-card-title" }, "Điều kiện xuất bến"), thieu.length ? chip(`${thieu.length} chưa đạt`, "danger") : chip("Đạt hết", "ok")),
      ...(thieu.length
        ? thieu.map((x) => h("div", { class: "dp-cond", "data-dat": "false" }, h("span", { class: "dp-cond-mark is-chua", "aria-label": "Chưa đạt" }, "✕"),
            h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, `${x.loiNhan} (văn phòng lo)`))))
        : [h("div", { class: "dp-cond", "data-dat": "true" }, h("span", { class: "dp-cond-mark is-dat", "aria-label": "Đạt" }, "✓"), h("span", { class: "dp-cond-text" }, h("span", { class: "dp-cond-nhan" }, "Đủ điều kiện xuất bến")))]),
    ),
  );
  const nut = h("button", { type: "button", class: "vc-btn btn btn-accent", disabled: thieu.length > 0, "data-action": "xuat-ben" }, "Xuất bến");
  // HT-03: một chạm chỉ MỞ hộp xác nhận; lệnh chỉ gửi khi bấm nút trong hộp. Mất mạng lúc gửi: hộp đóng, "Bấm lại" ở dải đầu trang như cũ (`chay`).
  nut.addEventListener("click", () => moXacNhanXuatBen(nut));
  replaceChildren(dayEl, nut, h("span", { class: "dp-note dp-cc-foot" }, thieu.length ? "Chưa xuất bến được — văn phòng đang lo." : `Bấm lúc xe lăn bánh — giờ ghi là lúc bấm (${msToVnLocal(Date.now()).time}).`));
  dayEl.hidden = false;
}

/** Hộp xác nhận "Xuất bến" (HT-03): nội dung từ hàm thuần `hopXuatBen` — giao diện chỉ vẽ. */
function moXacNhanXuatBen(opener: HTMLElement): void {
  const r = duLieu!;
  const c = r.chuyen;
  const hop = hopXuatBen({ ma: c.ma, ngayChay: c.gioBatDau.ngay, gioDuKien: c.gioBatDau.gio, bienSo: c.bienSo, soKhach: chiSuatKhach(r.suat).length }, vnToday(new Date()));
  const chinh = h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "xuat-ben-xac-nhan" }, hop.nutXacNhan);
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "xuat-ben-dong" }, "Chưa, quay lại");
  const bang = moBangTruot({
    title: hop.tieuDe,
    body: [
      hop.canhBao ? dai("danger", "Không phải chuyến của hôm nay", [hop.canhBao]) : null,
      h("dl", { class: "dp-xn-ds" }, ...hop.dong.flatMap(([k, v]) => [h("dt", null, k), h("dd", null, v)])),
      h("p", { class: "dp-sheet-text dp-note" }, hop.ghiChu),
    ],
    foot: [dong, chinh],
    footClass: "vc-foot-2",
    opener,
  });
  if (!bang) return;
  dong.addEventListener("click", () => bang.close());
  chinh.addEventListener("click", () => {
    chinh.disabled = true;
    bang.close(false);
    // Sau xuất bến, `gui` đọc lại chi tiết — có tên khách + liên hệ NẾU trong ngày chạy (phản hồi lệnh không kèm; xuất bến sớm tối hôm trước thì chưa có — Q-L3-B).
    void chay("xuat-ben", () => gui("xuat-ben"));
  });
}

async function main(): Promise<void> {
  const staff = await initShell();
  if (!coCuocCuaToi(staff)) return showError(errorEl, "Tài khoản này không có cuốc xe.");
  if (!id) return showError(errorEl, "Thiếu mã chuyến.");
  try {
    await nap();
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  ve();
}
await main();

/** ADR-0052 D6.4: đang mở bảng trượt / hộp (khuôn `.sheet[role=dialog]`) thì KHÔNG tự dựng lại trang dưới tay người dùng — lần nối lại / tin sau sẽ tải. */
const bangDangMo = (): boolean => document.querySelector('.sheet[role="dialog"]') !== null;
// ADR-0052 D6.4: văn phòng sửa / huỷ / đổi tài xế chuyến đang xem → tải lại + vẽ lại (bị đổi ra thì máy chủ trả 404 → câu lỗi). Nối lại Bảng tin → tải lại.
const lamMoi = taoBoLamMoi(async () => {
  if (!duLieu || bangDangMo()) return;
  try {
    await nap();
  } catch (e) {
    trangEl.hidden = true; // chuyến không còn mở được (bị đổi ra, không còn quyền) — không để màn cũ trông như còn đúng
    return showError(errorEl, loiCua(e));
  }
  // Vòng sửa 1 (T2): tải lại được (vd sau một lần lỗi mạng) thì hiện lại trang, ẩn câu lỗi cũ.
  trangEl.hidden = false;
  showError(errorEl, null);
  ve();
});
window.addEventListener("chuyen-thay-doi", (ev) => {
  if ((ev as CustomEvent<SuKienChuyen[]>).detail.some((e) => e.maChuyen === duLieu?.chuyen.ma)) void lamMoi.yeuCau();
});
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
