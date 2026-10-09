// Đề nghị chuyển khách (/de-nghi?ngay=) — gói A5, ADR-0111 Đ3 (b), (d); ADR-0052 D4.2 ĐP4; bản vẽ V10.
// - Ô trip.view (cùng mục "Điều phối xe" — `thayDieuPhoiXe`) xem danh sách đề nghị của các chuyến chạy ngày `ngay` (mặc định hôm nay) — chỉ đọc.
// - Đề nghị Leo thang đứng đầu, có bảng dòng kiểm lần bấm gần nhất (`hopDuyetDeNghi`). Ô trip.override (Quản trị, Toàn quyền) thấy nút Duyệt / Bác:
//   Duyệt chọn lý do nhóm Phá lệ (PHA_LE), Bác chọn lý do nhóm Không nhận (TU_CHOI_NHAN) — danh sách lý do đi kèm phản hồi GET /de-nghi.
//   Có điều kiện bắt buộc không đạt (`hop = CHI_BAC`) thì KHÔNG có nút Duyệt, chỉ câu giải thích + Bác. Máy chủ vẫn là cổng (chạy lại kiểm khi Duyệt).
// - Mỗi đề nghị có neo `#dn-<id>` (link "Mở hộp duyệt" từ Chi tiết chuyến). Tin Bảng tin về chuyến → tải lại.
import type { DeNghiDto, DeNghiLenhResponse, DeNghiNgayResponse, LyDoDangDungDto } from "../src/shared/contracts";
import { thayDieuPhoiXe } from "../src/shared/dieu-phoi-man";
import { can } from "../src/shared/permissions";
import { isISODate, vnToday } from "../src/shared/vn-date";
import { dongDeNghiVanPhong, hopDuyetDeNghi } from "../src/shared/xe-dang-chay-man";
import { api } from "./api";
import { moBangTruot } from "./bang-truot";
import { byId, h, replaceChildren } from "./dom";
import { chip, dai, nhomChon, taoLenh } from "./dieu-phoi-ui";
import { datCrumb, loiCua } from "./giay-to-ui";
import { taoBoLamMoi } from "./lam-moi-logic";
import { initShell, showError } from "./shell";

const errorEl = byId("error");
const trangEl = byId("dn-trang");
const staff = await initShell();
const coDuyet = can(staff, "trip.override");

const tuUrl = new URLSearchParams(location.search).get("ngay");
let ngay = tuUrl && isISODate(tuUrl) ? tuUrl : vnToday(new Date());
let duLieu: DeNghiNgayResponse | null = null;
let baoCao: HTMLElement | null = null;
let daCuonNeo = false;
/** Một mã lệnh cho mỗi ý định (url) — bấm lại sau lỗi mạng dùng lại mã (máy chủ trả kết quả lần trước, không ghi hai lần). */
const lenhCua = new Map<string, ReturnType<typeof taoLenh>>();

const KET_QUA_DIEU_KIEN = { DAT: "ok", KHONG_DAT: "danger", CANH_BAO: "warn" } as const;

async function nap(): Promise<void> {
  duLieu = await api<DeNghiNgayResponse>(`/api/van-chuyen/de-nghi?ngay=${ngay}`);
}

function lyDoNhom(nhom: LyDoDangDungDto["nhom"]): { code: string; nhan: string }[] {
  return (duLieu?.lyDo ?? []).filter((l) => l.nhom === nhom).map((l) => ({ code: l.code, nhan: l.nhan }));
}

/** Duyệt (lý do Phá lệ) hoặc Bác (lý do Không nhận): chọn lý do → gửi. Máy chủ kiểm lại; lỗi hiện trong dải đầu trang. */
function moHopLyDo(opener: HTMLButtonElement, d: DeNghiDto, loai: "duyet" | "bac"): void {
  let lyDo: string | null = null;
  const ds = lyDoNhom(loai === "duyet" ? "PHA_LE" : "TU_CHOI_NHAN");
  const chinh = h("button", { type: "button", class: `vc-btn btn ${loai === "duyet" ? "btn-accent" : "btn-primary"}`, disabled: true, "data-action": `${loai}-gui` },
    loai === "duyet" ? "Duyệt chuyển khách" : "Bác đề nghị") as HTMLButtonElement;
  const dong = h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary" }, "Quay lại");
  const bang = moBangTruot({
    title: loai === "duyet" ? "Duyệt đề nghị" : "Bác đề nghị",
    body: [
      h("p", { class: "dp-sheet-text" }, loai === "duyet"
        ? `${d.soKhach} khách chuyển từ ${d.tuMaChuyen} sang ${d.denMaChuyen}. Máy sẽ kiểm lại các điều kiện trước khi chuyển.`
        : `Khách ở lại chuyến ${d.tuMaChuyen}. Hai tài xế nhận thông báo.`),
      ds.length
        ? nhomChon(`dn-ly-do-${loai}`, loai === "duyet" ? "Lý do phá lệ" : "Lý do bác", ds, (c) => {
            lyDo = c;
            chinh.disabled = false;
          })
        : h("p", { class: "dp-note" }, "Danh mục chưa có lý do đang dùng cho việc này — nhờ Quản trị thêm ở Danh mục lý do."),
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
    bang.close(false);
    const url = `/api/van-chuyen/de-nghi/${encodeURIComponent(d.id)}/${loai}`;
    let l = lenhCua.get(url);
    if (!l) lenhCua.set(url, (l = taoLenh()));
    try {
      const r = await l.gui<DeNghiLenhResponse>(url, "POST", { lyDo });
      lenhCua.delete(url);
      baoCao = r.ketQua === "DA_CHUYEN"
        ? dai("ok", "Đã duyệt — khách đã sang xe nhận", [`${r.deNghi.tuMaChuyen} → ${r.deNghi.denMaChuyen}`])
        : dai("ok", "Đã bác đề nghị", [`Khách ở lại chuyến ${r.deNghi.tuMaChuyen}.`]);
    } catch (e) {
      baoCao = dai("danger", loiCua(e));
    }
    await nap().catch(() => undefined);
    ve();
  });
}

function theLeoThang(d: DeNghiDto): HTMLElement {
  const x = dongDeNghiVanPhong(d, ngay);
  const hop = hopDuyetDeNghi(d);
  const duyetNut = coDuyet && hop.coDuyet ? (h("button", { type: "button", class: "vc-btn btn btn-accent", "data-action": "duyet" }, "Duyệt") as HTMLButtonElement) : null;
  const bacNut = coDuyet && hop.coBac ? (h("button", { type: "button", class: "vc-btn vc-btn-ghost-primary", "data-action": "bac" }, "Bác") as HTMLButtonElement) : null;
  duyetNut?.addEventListener("click", () => moHopLyDo(duyetNut, d, "duyet"));
  bacNut?.addEventListener("click", () => moHopLyDo(bacNut, d, "bac"));
  return h(
    "section",
    { class: "vc-card dn-the dn-leo-thang", id: `dn-${d.id}`, "data-de-nghi": d.id, "aria-labelledby": `dn-t-${d.id}` },
    h("div", { class: "dp-card-head" }, h("h2", { id: `dn-t-${d.id}`, class: "dp-card-title" }, x.tieuDe), chip(x.chip.nhan, x.chip.tone)),
    h("p", { class: "dp-note" }, x.dong.map(([k, v]) => `${k}: ${v}`).join(" · ")),
    hop.kiem.length
      ? h("div", { class: "dn-kiem" }, ...hop.kiem.map((k) =>
          h("div", { class: "dp-kc" }, h("span", { class: "dp-kc-text" }, h("strong", null, k.nhan), h("span", { class: "dp-note" }, k.tang)), chip(k.ketQua, KET_QUA_DIEU_KIEN[k.dat]))))
      : null,
    hop.cauChiBac ? h("p", { class: "dp-note", role: "note" }, hop.cauChiBac) : null,
    duyetNut || bacNut ? h("div", { class: "vc-foot-2" }, bacNut, duyetNut) : null,
  );
}

function dongThuong(d: DeNghiDto): HTMLElement {
  const x = dongDeNghiVanPhong(d, ngay);
  return h(
    "div",
    { class: "dp-kc", id: `dn-${d.id}`, "data-de-nghi": d.id },
    h("span", { class: "dp-kc-text" }, h("strong", null, x.tieuDe), h("span", { class: "dp-note" }, x.dong.map(([k, v]) => `${k}: ${v}`).join(" · "))),
    chip(x.chip.nhan, x.chip.tone),
  );
}

function ve(): void {
  const ds = [...(duLieu?.deNghi ?? [])].sort((a, b) => b.guiLuc.localeCompare(a.guiLuc));
  const leo = ds.filter((d) => d.trangThai === "ESCALATED");
  const con = ds.filter((d) => d.trangThai !== "ESCALATED");
  const chonNgay = h("input", { id: "dn-ngay", class: "vc-input", type: "date", value: ngay, "aria-label": "Ngày chạy" }) as HTMLInputElement;
  chonNgay.addEventListener("change", async () => {
    if (!isISODate(chonNgay.value)) return;
    ngay = chonNgay.value;
    history.replaceState(null, "", `/de-nghi?ngay=${ngay}`);
    baoCao = null;
    try {
      await nap();
      showError(errorEl, null);
    } catch (e) {
      showError(errorEl, loiCua(e));
    }
    ve();
  });
  replaceChildren(
    trangEl,
    h("div", { class: "xdc-head" }, h("h1", { class: "dp-ct-title" }, "Đề nghị chuyển khách"), chonNgay),
    baoCao,
    leo.length
      ? h("div", { class: "dn-ds-leo" }, h("h2", { class: "dp-card-title" }, `Chờ văn phòng duyệt (${leo.length})`), ...leo.map(theLeoThang))
      : h("div", { class: "vc-card xdc-rong" }, "Không có đề nghị nào đang chờ văn phòng duyệt."),
    con.length
      ? h("section", { class: "vc-card", "aria-labelledby": "dn-khac" }, h("div", { class: "dp-card-head" }, h("h2", { id: "dn-khac", class: "dp-card-title" }, "Đề nghị khác trong ngày"), h("span", { class: "dp-card-note" }, `${con.length} đề nghị`)), ...con.map(dongThuong))
      : null,
  );
  if (!daCuonNeo && location.hash) {
    daCuonNeo = true; // chỉ cuộn tới neo lần vẽ đầu — tải lại do Bảng tin không kéo người đang đọc về chỗ cũ
    document.getElementById(location.hash.slice(1))?.scrollIntoView({ block: "start" });
  }
}

async function main(): Promise<void> {
  if (!thayDieuPhoiXe(staff)) return showError(errorEl, "Tài khoản này không xem được lịch xe.");
  datCrumb("Vận chuyển", "Đề nghị chuyển khách");
  try {
    await nap();
  } catch (e) {
    return showError(errorEl, loiCua(e));
  }
  ve();
}
await main();

const lamMoi = taoBoLamMoi(async () => {
  if (!thayDieuPhoiXe(staff)) return;
  try {
    await nap();
    showError(errorEl, null);
    ve();
  } catch (e) {
    showError(errorEl, loiCua(e));
  }
});
window.addEventListener("chuyen-thay-doi", () => void lamMoi.yeuCau());
window.addEventListener("can-tai-lai", () => void lamMoi.yeuCau());
