// Một chuyến của TÀI XẾ (/cuoc-chuyen?id=) — ADR-0049 V6 Chuyến đang chạy (route 20–29) + V7 Xuất bến; bản vẽ docs/design/van-chuyen-dieu-phoi/project/05
// (5a, 5b), 06 (6b, 6c); bản đối chiếu 2.5, H15; ruling R-P11, R-P17; lệnh điều phối vòng 3.
// - Chưa xuất bến: CHỈ điều kiện CÒN THIẾU, mỗi dòng "(văn phòng lo)"; đạt hết → "Đủ điều kiện xuất bến" (không hạn giấy tờ, không số giấy tờ); nút "Xuất bến"
//   dính đáy, khoá khi còn thiếu. Tài xế tự bấm: KHÔNG ô "xảy ra lúc" — giờ là lúc bấm (máy chủ từ chối `xayRaLuc` từ route tài xế).
// - Đang chạy: thẻ từng điểm (đón: khách + Đã đón / Vắng / Khách đã huỷ; trả: "Đã trả"), liên hệ của đơn (CHỈ từ GET — phản hồi lệnh không kèm, màn giữ
//   `lienHe` của lần GET; không lưu vào bộ nhớ trình duyệt), đổi thứ tự điểm chưa tới bằng nút lên / xuống (không ô giờ), "Kết thúc chuyến", "Kết thúc gián
//   đoạn" (chọn lý do; KHÔNG ô ghi chú — chủ Q1).
// - Mất mạng: dòng đó "Chưa gửi được" + "Bấm lại" (CÙNG requestId — bấm lại hai lần vẫn một lệnh); máy KHÔNG tự gửi lại (lệnh điều phối, khác câu 5a).
import { giuTenKhach, ketThucDuoc, soHieuTaiDiemDon, thanDoiThuTu, type BuocDiem } from "../src/shared/tien-do-man";
import type { CuocChiTietResponse } from "../src/shared/contracts";
import { coCuocCuaToi } from "../src/shared/start-page";
import { ApiError, api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren, type Child } from "./dom";
import { chip, dai, nhomChon, taoLenh } from "./dieu-phoi-ui";
import { loiCua } from "./giay-to-ui";
import { icon } from "./icons";
import { initShell, setBarTitle, showError } from "./shell";
import { cauLoiTienDo, dongMoc, veDiemChay, type LenhDiem } from "./tien-do-ui";
import { formatDm } from "../src/shared/trip-form";
import { msToVnLocal } from "../src/shared/vn-date";

const errorEl = byId("error");
const trangEl = byId("cc-trang");
const dayEl = byId("cc-day");
const id = new URLSearchParams(location.search).get("id") ?? "";
const goc = `/api/van-chuyen/cuoc-cua-toi/${encodeURIComponent(id)}`;

let duLieu: CuocChiTietResponse | null = null;
/** Liên hệ của đơn — CHỈ từ GET trong ngày chạy; lệnh tiến độ không trả lại khoá này (R-P11). Chỉ giữ trong bộ nhớ trang. */
let lienHe: NonNullable<CuocChiTietResponse["lienHe"]> = [];
let baoCao: HTMLElement | null = null;
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
  ketThuc.addEventListener("click", () => void chay("ket-thuc", () => gui("ket-thuc")));
  const gianDoan = h("button", { type: "button", class: "vc-btn vc-btn-stop dp-gian-doan", "data-action": "ket-thuc-gian-doan" }, "Kết thúc gián đoạn"); // bản 1.39: nút viền đỏ, nhỏ hơn — không còn là nút to nhất lúc đang chạy (nút xác nhận trong hộp vẫn đỏ đặc)
  gianDoan.addEventListener("click", () => moGianDoan(gianDoan));
  replaceChildren(
    trangEl,
    dauMang,
    baoCao,
    dauTrang,
    c.ketThucThat ? h("div", { class: "dp-ct-moc" }, dongMoc(c.trangThai === "ENDED_INTERRUPTED" ? "Kết thúc gián đoạn" : "Kết thúc", c.ketThucThat, ngay)) : null,
    ...diemCho.map((k) => h("div", { class: "dp-khach-cho" }, "Một lệnh ở điểm chưa gửi được", h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "bam-lai" }, "Bấm lại"))),
    h("div", { class: "dp-run-list" }, ...diem),
    chayDuoc ? h("div", { class: "dp-run-end" }, ketThuc, ketThuc.disabled ? h("span", { class: "dp-note" }, "Bấm được khi đã trả hết khách.") : null, gianDoan) : null,
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

function lenhDiem(l: LenhDiem): void {
  const d = l.buoc.diem;
  if (l.loai === "da-toi") return void chay(`diem:${d.id}`, () => gui(`diem/${encodeURIComponent(d.id)}/da-toi`));
  if (l.loai === "tra-het") {
    return void chay(`diem:${d.id}`, async () => {
      if (duLieu!.diem.find((x) => x.id === d.id)?.trangThai === "PENDING") await gui(`diem/${encodeURIComponent(d.id)}/da-toi`);
      for (const sid of l.buoc.traCho) {
        if (duLieu!.suat.find((x) => x.id === sid)?.trangThai !== "BOARDED") continue;
        await gui(`phan-bo/${encodeURIComponent(sid)}/tra`);
      }
    });
  }
  const lenh = l.loai;
  void chay(l.suatId, () => gui(`phan-bo/${encodeURIComponent(l.suatId)}/${lenh}`));
}

/** Hộp "Kết thúc gián đoạn" (bản vẽ 5b): lý do nhóm Kết thúc gián đoạn; không ô ghi chú (Q1). */
function moGianDoan(opener: HTMLElement): void {
  const r = duLieu!;
  let lyDo: string | null = null;
  const conTren = r.suat.filter((s) => s.trangThai === "BOARDED").length;
  const chuaDon = r.suat.filter((s) => s.trangThai === "WAITING").length;
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
  replaceChildren(
    trangEl,
    dauMang,
    baoCao,
    h("div", { class: "dp-note dp-cc-meta" }, `${c.bienSo} · ${formatDm(c.gioBatDau.ngay)} ${c.gioBatDau.gio} · ${r.suat.length} khách`),
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
  // Sau xuất bến, `gui` đọc lại chi tiết — có tên khách + liên hệ NẾU trong ngày chạy (phản hồi lệnh không kèm; xuất bến sớm tối hôm trước thì chưa có — Q-L3-B).
  nut.addEventListener("click", () => void chay("xuat-ben", () => gui("xuat-ben")));
  replaceChildren(dayEl, nut, h("span", { class: "dp-note dp-cc-foot" }, thieu.length ? "Chưa xuất bến được — văn phòng đang lo." : `Bấm lúc xe lăn bánh — giờ ghi là lúc bấm (${msToVnLocal(Date.now()).time}).`));
  dayEl.hidden = false;
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
