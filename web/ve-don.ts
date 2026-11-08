// Khối "Vé điện tử" ở trang chi tiết đơn (ADR-0153; kế hoạch Task 9b). Gọi:
//   GET  /api/ve/don/:orderId            → số lượng vé theo dịch vụ + nhóm khách (cần / đang giữ / thiếu), cờ thu đủ, đường dẫn khách (KHÔNG token), mã phân bổ để xem ảnh
//   GET  /api/ve/anh/:allocationId       → ảnh vé (chỉ khi đơn thu đủ và người xem có ô `ve.cap.send`)
//   POST /api/ve/giao                    → ghi lần giao Zalo (bấm đúp cùng requestId không nhân đôi)
//   POST /api/ve/duong-dan, …/:id/thu-hoi → đường dẫn riêng cho khách (token chỉ hiện MỘT lần ngay sau khi tạo)
// 404 / 403 ⇒ ẩn khối lặng lẽ (người xem không có phần ở đơn này). Không có vé nào cần giữ ⇒ ẩn. Chưa thu đủ: chỉ hiện số lượng, KHÔNG có nút ảnh / Zalo / đường dẫn.
// Chia sẻ nhiều ảnh sang Zalo: iOS chỉ cho mở bảng chia sẻ ngay trong lần bấm, nên tải ảnh về TRƯỚC (nút «Chuẩn bị vé»), rồi nút «Gửi Zalo» gọi `navigator.share` đồng bộ;
// máy không chia sẻ được tệp thì có «Tải ảnh về» và «Sao chép đường dẫn». Không innerHTML.
import { ApiError, api } from "./api";
import { h, replaceChildren } from "./dom";
import { CAU_VE_QUA_HAN_TRA_SAU, CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC } from "../src/shared/tra-sau";

interface NhomVe { nhom: string; nhan: string; can: number; giu: number; thieu: number }
interface VeDonRes {
  dichVu: { serviceId: string; catalogCode: string; nhom: NhomVe[] }[];
  thuDu: boolean;
  choDoiTacNop?: boolean;
  /** ADR-0170 Đ2 mục 5: người xem giữ quyền Đối tác — nói câu «Công ty chưa xác nhận…». */
  nguoiXemLaDoiTac?: boolean;
  /** ADR-0168 Đ3 mục 1: đơn Trả sau quá hạn còn nợ — vé chưa mở chưa xem được, vé đã mở (trong `veXem`) vẫn xem. */
  traSauQuaHan?: boolean;
  duongDan: { id: string; hetHan: string; daThuHoi: boolean; luotMo: number }[];
  veXem: { id: string; stt: number }[];
  /** ADR-0175 Đ2.2: có vé Tour Đảo mở được trước khi thu đủ (đơn nội bộ đã xác nhận) — `veXem` đã chỉ gồm vé mở được, theo từng vé. */
  veTourDaoMoSom?: boolean;
}
/** ADR-0166 câu 3: nói trước khi bấm — mở vé hoặc tạo đường dẫn là coi mọi vé của đơn đã lộ, vé đã lộ không về lại kho. */
const CAU_VE_KHONG_VE_KHO = "Bấm là coi như vé đã giao cho khách: vé của đơn này sẽ không quay về kho nữa, kể cả khi khách huỷ. Chưa chắc khách lấy thì đừng bấm.";
export interface VeDonVao { orderId: string; coQuyenGui: boolean }

const ngayVn = (iso: string): string => new Date(new Date(iso).getTime() + 7 * 3600 * 1000).toISOString().slice(0, 10).split("-").reverse().join("/");
const lyDoLoi = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");

export async function initVeDon(el: HTMLElement, vao: VeDonVao): Promise<void> {
  let res: VeDonRes;
  try {
    res = await api<VeDonRes>(`/api/ve/don/${encodeURIComponent(vao.orderId)}`);
  } catch (err) {
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) return; // không có phần ở đơn này: ẩn lặng lẽ
    el.hidden = false;
    replaceChildren(el, h("h2", null, "Vé điện tử"), h("p", { class: "alert", role: "alert" }, lyDoLoi(err)));
    return;
  }
  const dong = res.dichVu.filter((d) => d.nhom.length > 0);
  if (dong.length === 0) return;
  el.hidden = false;
  veKhoi(el, vao, res, dong);
}

function veKhoi(el: HTMLElement, vao: VeDonVao, res: VeDonRes, dong: VeDonRes["dichVu"]): void {
  const tongThieu = dong.reduce((n, d) => n + d.nhom.reduce((m, x) => m + x.thieu, 0), 0);
  const thongBao = h("p", { class: "muted", role: "status", hidden: true });
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const hien = (cau: string | null, laLoi = false): void => {
    thongBao.hidden = laLoi || !cau; loi.hidden = !laLoi || !cau;
    (laLoi ? loi : thongBao).textContent = cau ?? "";
  };
  const danhSach = h("ul", { class: "pay-list", "data-khoi": "ve-don" }, ...dong.map((d) =>
    h("li", { "data-service-id": d.serviceId },
      ...d.nhom.map((x) => h("p", null, `${x.nhan}: ${x.giu}/${x.can} vé`, x.thieu > 0 ? h("span", { class: "huy-hieu", "data-tong": "cat" }, ` Thiếu ${x.thieu} vé`) : null)))));
  const nutCap = tongThieu > 0 ? h("button", { type: "button", class: "btn", "data-action": "cap-ve" }, "Cấp vé") : null;
  nutCap?.addEventListener("click", async () => {
    nutCap.disabled = true; hien(null);
    try { await api("/api/ve/cap", { method: "POST", body: { orderId: vao.orderId } }); await initVeDon(el, vao); } catch (err) { hien(lyDoLoi(err), true); nutCap.disabled = false; }
  });
  const khoi: (Node | null)[] = [h("h2", null, "Vé điện tử"), tongThieu > 0 ? h("p", { class: "muted" }, res.nguoiXemLaDoiTac ? `Còn thiếu ${tongThieu} vé. Bấm Cấp vé; nếu vẫn thiếu, báo văn phòng.` : `Còn thiếu ${tongThieu} vé. Nhập thêm vé vào kho rồi bấm Cấp vé.`) : null, danhSach, nutCap ? h("div", { class: "handler-actions" }, nutCap) : null];

  if (!res.thuDu && res.veXem.length === 0 && !res.veTourDaoMoSom) {
    khoi.push(h("p", { class: "muted" }, res.traSauQuaHan ? (res.nguoiXemLaDoiTac ? CAU_VE_QUA_HAN_TRA_SAU_DOI_TAC : CAU_VE_QUA_HAN_TRA_SAU) : res.choDoiTacNop ? (res.nguoiXemLaDoiTac ? "Công ty chưa xác nhận đã nhận đủ tiền nên chưa mở được vé." : "Đang chờ đối tác nộp tiền về công ty nên chưa xem hoặc gửi được vé.") : "Đơn chưa thu đủ tiền nên chưa xem hoặc gửi được vé."));
  } else if (vao.coQuyenGui && res.veXem.length > 0) {
    // ---- Gửi Zalo / tải ảnh -------------------------------------------------------------------------------------------------------------------------------
    let tep: File[] = [];
    const nutChuanBi = h("button", { type: "button", class: "btn btn-primary", "data-action": "chuan-bi-ve" }, `Mở ${res.veXem.length} vé để gửi khách`);
    const canhBaoMo = h("p", { class: "muted", "data-khoi": "ve-khong-ve-kho" }, CAU_VE_KHONG_VE_KHO);
    const nutGui = h("button", { type: "button", class: "btn btn-primary", "data-action": "gui-zalo", hidden: true }, "Gửi Zalo");
    const khuTai = h("div", { class: "handler-actions", hidden: true });
    const ghiLanGiao = async (): Promise<void> => {
      try { await api("/api/ve/giao", { method: "POST", body: { orderId: vao.orderId, requestId: crypto.randomUUID() } }); } catch (err) { hien(lyDoLoi(err), true); }
    };
    nutChuanBi.addEventListener("click", async () => {
      nutChuanBi.disabled = true; hien("Đang tải vé…");
      try {
        tep = await Promise.all(res.veXem.map(async (v) => {
          const r = await fetch(`/api/ve/anh/${encodeURIComponent(v.id)}`, { credentials: "same-origin" });
          if (!r.ok) throw new Error("Không tải được một vé.");
          const blob = await r.blob();
          return new File([blob], `ve-${v.stt}.${blob.type === "image/jpeg" ? "jpg" : "png"}`, { type: blob.type || "image/png" });
        }));
      } catch (err) { hien(err instanceof Error ? err.message : lyDoLoi(err), true); nutChuanBi.disabled = false; return; }
      nutChuanBi.hidden = true; canhBaoMo.hidden = true; hien(`Đã mở ${tep.length} vé. Các vé này sẽ không quay về kho nữa, kể cả khi khách huỷ.`);
      const chiaSeDuoc = typeof navigator.canShare === "function" && typeof navigator.share === "function" && navigator.canShare({ files: tep });
      nutGui.hidden = !chiaSeDuoc;
      khuTai.hidden = false;
      replaceChildren(khuTai, ...tep.map((f, i) => {
        const url = URL.createObjectURL(f);
        return h("a", { class: "btn", href: url, download: f.name, "data-action": "tai-ve" }, `Tải vé ${i + 1}`);
      }));
      khuTai.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => void ghiLanGiao()));
    });
    nutGui.addEventListener("click", () => {
      // GỌI NGAY trong lần bấm (không await trước đó) — iOS chỉ cho phép bảng chia sẻ trong cử chỉ của người dùng.
      navigator.share({ files: tep, title: "Vé tham quan" }).then(() => ghiLanGiao()).catch(() => { /* người dùng đóng bảng chia sẻ: không ghi lần giao */ });
    });
    khoi.push(h("div", { class: "handler-actions" }, nutChuanBi, nutGui), canhBaoMo, khuTai);

    // ---- Đường dẫn riêng cho khách -------------------------------------------------------------------------------------------------------------------------
    const khuLink = h("div", { "data-khoi": "duong-dan" });
    const veLink = (): void => replaceChildren(khuLink, ...res.duongDan.map((l) => {
      const nut = l.daThuHoi ? null : h("button", { type: "button", class: "btn", "data-action": "thu-hoi-duong-dan", "data-id": l.id }, "Thu hồi");
      nut?.addEventListener("click", async () => {
        nut.disabled = true;
        try { await api(`/api/ve/duong-dan/${encodeURIComponent(l.id)}/thu-hoi`, { method: "POST", body: {} }); l.daThuHoi = true; veLink(); hien("Đã thu hồi đường dẫn."); } catch (err) { hien(lyDoLoi(err), true); nut.disabled = false; }
      });
      return h("p", { class: "muted" }, `Đường dẫn khách · ${l.daThuHoi ? "đã thu hồi" : `hết hạn ${ngayVn(l.hetHan)}`} · mở ${l.luotMo} lần `, nut);
    }));
    veLink();
    const nutLink = h("button", { type: "button", class: "btn", "data-action": "tao-duong-dan" }, "Tạo đường dẫn cho khách");
    const oLink = h("p", { class: "muted", hidden: true });
    nutLink.addEventListener("click", async () => {
      nutLink.disabled = true; hien(null);
      try {
        const r = await api<{ id: string; duongDan: string; hetHan: string }>("/api/ve/duong-dan", { method: "POST", body: { orderId: vao.orderId, requestId: crypto.randomUUID() } });
        const day = `${location.origin}${r.duongDan}`;
        const nutChep = h("button", { type: "button", class: "btn", "data-action": "chep-duong-dan" }, "Sao chép");
        nutChep.addEventListener("click", () => { void navigator.clipboard?.writeText(day).then(() => hien("Đã sao chép đường dẫn."), () => hien("Không sao chép được, hãy chép tay.", true)); });
        oLink.hidden = false;
        replaceChildren(oLink, `Đường dẫn chỉ hiện lúc này, gửi ngay cho khách: ${day} `, nutChep);
        res.duongDan.unshift({ id: r.id, hetHan: r.hetHan, daThuHoi: false, luotMo: 0 }); veLink();
      } catch (err) { hien(lyDoLoi(err), true); }
      nutLink.disabled = false;
    });
    khoi.push(h("div", { class: "handler-actions" }, nutLink), h("p", { class: "muted", "data-khoi": "ve-khong-ve-kho-link" }, CAU_VE_KHONG_VE_KHO), oLink, khuLink);
  }
  replaceChildren(el, ...khoi, thongBao, loi);
}
