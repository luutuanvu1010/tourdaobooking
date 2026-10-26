// Luồng một yêu cầu của trang Hỗ trợ (PR 3): đầu yêu cầu có ba chip (trạng thái, ưu tiên, người xử lý), dòng phụ (nhóm, đơn, chi tiết),
// luồng tin gom theo cụm có mốc ngày và dòng hệ thống, ô trả lời dính đáy. Tự làm mới 5 s (mở) / 30 s (đóng).
// Mở tại chỗ (không tải lại trang): máy tính ở cột phải, điện thoại toàn màn. Quyền chỉ đọc từ `perms` của máy chủ; chỉ ẩn/hiện, máy chủ luôn kiểm lại.
// Không import feedback.ts (nó có top-level await) nên mọi thứ của trang đi vào qua `NgCanhLuong`.
import { FEEDBACK_STATUS_NAME, SAC_TRANG_THAI, buocGopY, nhanNutChuyen, statusAfterSubmitterReply } from "../src/shared/feedback-catalog";
import { tomTatThietBi } from "../src/shared/thoi-gian-tuong-doi";
import { PRIORITIES, PRIORITY_NAME, TEAM_ROLE_NAME, type Priority } from "../src/shared/ve-ho-tro";
import {
  CAU_DA_CHUYEN_NHOM, CAU_KHONG_CON_TRONG_NHOM, CAU_MO_LAI, LAM_MOI_GOI_NGAY_TOI_DA, NHAN_TAI_LAI, buocChoPhep, buocLamMoi, chenSuKien, chuKyLamMoi, dauPhieuDoi, gomTin,
  hienNhanViec, nguoiXuLyHienThi, nhomChuyenDuoc, type CumTin,
} from "../src/shared/ve-ho-tro-hien-thi";
import { ApiError, api, type Api } from "./api";
import { moBangTruot, type BangTruot } from "./bang-truot";
import { h, replaceChildren, type Child } from "./dom";
import { icon } from "./icons";

/** Thứ trang đưa cho luồng (luồng không tự biết trang đang ở thẻ nào, ai đang xem). */
export interface NgCanhLuong {
  staffId: string;
  teams: Api.FeedbackTeamsResponse;
  /** Đóng luồng (trang lo địa chỉ, thanh tab, danh sách). */
  dong(): void;
  /** Nạp lại danh sách bên trái (giữ số dòng đã tải). */
  napLaiDs(): void;
  /** Đã chuyển nhóm xong: người chuyển thường mất quyền xem. */
  chuyenXong(): void;
}

type Perms = Api.FeedbackDetailResponse["perms"];

const wide = (): boolean => window.matchMedia("(min-width: 900px)").matches;
const TZ = "Asia/Ho_Chi_Minh";
const when = (iso: string): string => new Date(iso).toLocaleString("vi-VN", { timeZone: TZ, dateStyle: "short", timeStyle: "short" });
const ngayVN = (iso: string): string => new Date(iso).toLocaleDateString("vi-VN", { timeZone: TZ, day: "2-digit", month: "2-digit", year: "numeric" });
const gioVN = (iso: string): string => new Date(iso).toLocaleTimeString("vi-VN", { timeZone: TZ, hour: "2-digit", minute: "2-digit" });
const thongBao = (err: unknown): string => (err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const dangMo = (t: Pick<Api.FeedbackTicketDto, "status">): boolean => t.status !== "DONE" && t.status !== "DECLINED";

/** Bản nháp ô trả lời theo yêu cầu: giữ qua mọi lần dựng lại (đổi trạng thái, giao việc…) — chỉ xoá khi gửi thành công. */
const banNhap = new Map<string, { body: string; internal: boolean }>();
/** Yêu cầu đã gửi được tin lý do từ chối mà chưa đổi được trạng thái: bấm Từ chối lại thì KHÔNG gửi lý do lần nữa (Task 4). */
const lyDoDaGui = new Set<string>();

/** Một thao tác GHI: khoá nút từ lúc bấm đến khi xong (bấm đúp không gửi hai lần), lỗi hiện qua `hienLoi` (trong luồng hoặc trong hộp đang mở). */
async function chay<T>(fn: () => Promise<T>, btn: HTMLButtonElement | null | undefined, hienLoi: (m: string | null) => void): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  hienLoi(null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    hienLoi(thongBao(err));
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

/** Bộ ngữ cảnh của MỘT lần dựng luồng (`t` được cập nhật tại chỗ khi vòng làm mới thấy đầu yêu cầu đổi). */
interface Bo {
  t: Api.FeedbackTicketDto;
  perms: Perms;
  o: NgCanhLuong;
  reload(): void;
  hienLoi(m: string | null): void;
}

// ---- Tự làm mới (ADR-0127, đặc tả 2.1) ----------------------------------------------------------------------------------------
// MỘT vòng cho cả trang: mỗi lần dựng luồng tăng `doiLuong`; vòng / lời gọi của đời cũ thấy đời đổi thì bỏ. Hẹn giờ bằng setTimeout nối nhau
// sau khi lời gọi trước xong ⇒ không bao giờ hai lời gọi chồng nhau. 404/403 ⇒ dừng hẳn kèm câu báo; lỗi khác ⇒ bỏ qua lần đó. Tuyến làm mới không ghi «đã xem».
interface LamMoi {
  doi: number;
  id: string;
  tin: Api.FeedbackMessageDto[];
  suKien: Map<string, Api.FeedbackEventDto>;
  since: string;
  macDinh: string;
  dau: Api.FeedbackMessagesSinceResponse["ticket"];
  hen?: ReturnType<typeof setTimeout>;
  dangGoi: boolean;
  dung: boolean;
  daDoiNhom: boolean;
  ve: (r: Api.FeedbackMessagesSinceResponse, moi: Api.FeedbackMessageDto[]) => void;
  dungVi: () => void;
}
let doiLuong = 0;
let lm: LamMoi | null = null;
let dongHienTai: (() => void) | null = null;

/** Dừng luồng đang mở (trang gọi khi đóng luồng): vòng làm mới ngừng, phím Esc không còn đóng gì. */
export function dungLuong(): void {
  doiLuong++;
  if (lm) {
    clearTimeout(lm.hen);
    lm.dung = true;
    lm = null;
  }
  dongHienTai = null;
}

function henLamMoi(s: LamMoi): void {
  clearTimeout(s.hen);
  s.hen = undefined;
  if (s.dung || s.doi !== doiLuong || document.visibilityState !== "visible") return; // ẩn tab: dừng; hiện lại thì visibilitychange gọi ngay
  s.hen = setTimeout(() => void vongLamMoi(s), chuKyLamMoi(s.dau.status));
}

async function vongLamMoi(s: LamMoi, lanGoiNgay = 0): Promise<void> {
  if (s.dung || s.dangGoi || s.doi !== doiLuong || document.visibilityState !== "visible") return;
  s.dangGoi = true;
  let r: Api.FeedbackMessagesSinceResponse;
  try {
    r = await api<Api.FeedbackMessagesSinceResponse>(`/api/feedback/${s.id}/messages?since=${encodeURIComponent(s.since)}`);
  } catch (err) {
    s.dangGoi = false;
    if (s.doi !== doiLuong) return;
    if (err instanceof ApiError && (err.status === 404 || err.status === 403)) {
      s.dung = true;
      s.dungVi();
      return;
    }
    henLamMoi(s); // lỗi mạng / máy chủ: bỏ qua lần này
    return;
  }
  s.dangGoi = false;
  if (s.doi !== doiLuong || s.dung) return;
  const b = buocLamMoi(s.tin, r.messages, s.macDinh);
  s.tin = b.tin;
  s.since = b.since;
  for (const e of r.suKien ?? []) s.suKien.set(e.id, e);
  s.ve(r, b.moi);
  s.dau = r.ticket;
  if (b.goiNgay && lanGoiNgay < LAM_MOI_GOI_NGAY_TOI_DA) return void vongLamMoi(s, lanGoiNgay + 1);
  henLamMoi(s);
}

document.addEventListener("visibilitychange", () => {
  if (!lm) return;
  if (document.visibilityState === "visible") {
    clearTimeout(lm.hen);
    lm.hen = undefined;
    void vongLamMoi(lm);
  } else {
    clearTimeout(lm.hen); // tab ẩn: không gọi gì
    lm.hen = undefined;
  }
});

// Phím Esc đóng luồng ở điện thoại (toàn màn); không đóng khi một hộp trượt đang mở (Esc của hộp đóng hộp trước).
document.addEventListener("keydown", (e) => {
  if (e.key !== "Escape" || !dongHienTai || wide() || document.querySelector(".sheet-root")) return;
  dongHienTai();
});

// ---- Hộp trượt nhỏ cho từng chip ---------------------------------------------------------------------------------------------------
interface Hop { bt: BangTruot | null; hienLoi(m: string | null): void }
function mo(tieuDe: string, opener: HTMLElement | null, dung: (hop: Hop) => Child[]): void {
  const loi = h("p", { class: "alert", role: "alert", hidden: true });
  const hop: Hop = {
    bt: null,
    hienLoi: (m) => {
      loi.textContent = m ?? "";
      loi.hidden = !m;
    },
  };
  const body = dung(hop);
  hop.bt = moBangTruot({ title: tieuDe, body: [loi, ...body], foot: [], opener });
}

function chip(noiDung: Child[], aria: string, bam: ((nut: HTMLButtonElement) => void) | null, sac = ""): HTMLButtonElement {
  const n = h("button", { type: "button", class: `ht-chip${sac ? ` is-${sac}` : ""}`, "aria-label": aria, disabled: !bam }, ...noiDung, bam && icon("chevron-down", 16));
  if (bam) n.addEventListener("click", () => bam(n));
  return n;
}

/** Trạng thái: các bước cho phép từ trạng thái hiện tại; «Từ chối» đi qua `tuChoi` (bắt điền lý do). */
function hopTrangThai(b: Bo, opener: HTMLElement): void {
  const { t } = b;
  mo("Đổi trạng thái", opener, (hop) =>
    buocChoPhep(t.status).map((to) => {
      const n = h("button", { type: "button", class: "btn ht-hop-nut", "data-to": to }, nhanNutChuyen(t.status, to));
      n.addEventListener("click", async () => {
        if (to === "DECLINED") {
          hop.bt?.close(false);
          tuChoi(t, lyDoDaGui, b.reload, opener);
          return;
        }
        const r = await chay(async () => (await api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { status: to } }), true), n, hop.hienLoi);
        if (r) hop.bt?.close(false);
        b.reload(); // thành công hay 409 (trạng thái đã đổi) đều nạp lại để thấy trạng thái mới; bản nháp trả lời được giữ
      });
      return n;
    }),
  );
}

/** Mức ưu tiên (người xử lý chọn; máy chủ kiểm lại). */
function hopUuTien(b: Bo, opener: HTMLElement): void {
  const { t } = b;
  mo("Mức ưu tiên", opener, (hop) =>
    PRIORITIES.map((p: Priority) => {
      const n = h("button", { type: "button", class: `btn ht-hop-nut${p === t.priority ? " btn-primary" : ""}`, "data-uu-tien": p, "aria-pressed": String(p === t.priority) }, PRIORITY_NAME[p]);
      n.addEventListener("click", async () => {
        if (p === t.priority) return void hop.bt?.close();
        const r = await chay(async () => (await api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { priority: p } }), true), n, hop.hienLoi);
        if (r) hop.bt?.close(false);
        b.reload();
      });
      return n;
    }),
  );
}

/** Người xử lý: «Nhận việc cho tôi» khi chưa ai nhận; «Giao cho người khác» cho Trưởng nhóm / Toàn quyền (`perms.giaoViec`) — danh sách thành viên tải khi mở hộp. */
function hopNguoiXuLy(b: Bo, opener: HTMLElement): void {
  const { t, perms, o } = b;
  mo("Người xử lý", opener, (hop) => {
    const ra: Child[] = [];
    if (hienNhanViec(t, o.staffId)) {
      const nhan = h("button", { type: "button", class: "btn btn-primary ht-hop-nut", "data-nhan-viec": t.id }, "Nhận việc cho tôi");
      nhan.addEventListener("click", async () => {
        const r = await chay(async () => (await api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/claim`, { method: "POST" }), true), nhan, hop.hienLoi);
        if (r) hop.bt?.close(false);
        b.reload(); // 409 «Vừa có người nhận…» hiện trong hộp; vẫn nạp lại để thấy ai nhận
      });
      ra.push(nhan);
    }
    if (perms.giaoViec && dangMo(t)) {
      const vung = h("div", { class: "ht-giao", id: "fb-giao" }, h("p", { class: "muted" }, "Đang tải danh sách…"));
      ra.push(vung);
      void (async () => {
        try {
          const r = await api<Api.FeedbackMembersResponse>(`/api/feedback/teams/${encodeURIComponent(t.teamId)}/members?ticket=${encodeURIComponent(t.id)}`);
          const dangGiu = t.assigneeActive ? t.assigneeId : null;
          const ds = r.members.filter((m) => m.staffId !== dangGiu);
          if (ds.length === 0) return void replaceChildren(vung, h("p", { class: "muted" }, "Nhóm chưa có thành viên khác để giao."));
          const chon = h("select", { id: "fb-giao-chon", "aria-label": "Giao cho" }, ...ds.map((m) => h("option", { value: m.staffId }, `${m.name} · ${TEAM_ROLE_NAME[m.role]}`)));
          const giao = h("button", { type: "button", class: "btn btn-primary" }, "Giao");
          giao.addEventListener("click", async () => {
            const ok = await chay(async () => (await api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { assigneeId: chon.value } }), true), giao, hop.hienLoi);
            if (ok) hop.bt?.close(false);
            b.reload();
          });
          replaceChildren(vung, h("label", null, "Giao cho người khác", chon), giao);
        } catch (err) {
          replaceChildren(vung);
          hop.hienLoi(thongBao(err));
        }
      })();
    }
    return ra;
  });
}

/** Chuyển sang nhóm khác (Trưởng nhóm đang giữ yêu cầu hoặc Toàn quyền): nhóm nhận + lý do bắt buộc 1–300 ký tự. */
function hopNhom(b: Bo, opener: HTMLElement): void {
  const { t, o } = b;
  const dich = nhomChuyenDuoc(o.teams, t.teamId);
  mo("Chuyển nhóm", opener, (hop) => {
    const chon = h("select", { id: "fb-chuyen-nhom", "aria-label": "Nhóm nhận" }, ...dich.map((x) => h("option", { value: x.id }, x.name)));
    const lyDo = h("input", { id: "fb-chuyen-ly-do", type: "text", maxLength: 300, "aria-label": "Lý do chuyển nhóm" });
    const nut = h("button", { type: "button", class: "btn btn-primary" }, "Chuyển");
    nut.addEventListener("click", async () => {
      const ly = lyDo.value.trim();
      if (!ly) return hop.hienLoi("Ghi lý do chuyển nhóm.");
      const r = await chay(async () => (await api<unknown>(`/api/feedback/${t.id}/transfer`, { method: "POST", body: { teamId: chon.value, reason: ly } }), true), nut, hop.hienLoi);
      if (r) {
        hop.bt?.close(false);
        o.chuyenXong(); // người chuyển thường mất quyền xem: về danh sách kèm câu báo
      }
    });
    return [h("label", null, "Nhóm nhận", chon), h("label", null, "Lý do (bắt buộc)", lyDo), nut];
  });
}

/** Từ chối: Task 4 thay bằng hai bước có lý do. */
export function tuChoi(t: Api.FeedbackTicketDto, _daGui: Set<string>, sau: () => void, opener: HTMLElement | null): void {
  mo("Từ chối yêu cầu", opener, (hop) => {
    const nut = h("button", { type: "button", class: "btn btn-primary" }, "Từ chối");
    nut.addEventListener("click", async () => {
      const r = await chay(async () => (await api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/xu-ly`, { method: "PATCH", body: { status: "DECLINED" } }), true), nut, hop.hienLoi);
      if (r) hop.bt?.close(false);
      sau();
    });
    return [nut];
  });
}

// ---- Đầu yêu cầu ---------------------------------------------------------------------------------------------------------------------
function dungChiTiet(b: Bo): HTMLElement {
  const { t, perms } = b;
  const hang = (nhan: string, ...nd: Child[]): Child[] => [h("dt", null, nhan), h("dd", null, ...nd)];
  const thietBi = t.context.device ?? "";
  const goc = h("code", { class: "ht-ua", hidden: true }, thietBi);
  const nutGoc = h("button", { type: "button", class: "btn btn-link ht-nut-goc", "aria-expanded": "false" }, "chuỗi gốc");
  nutGoc.addEventListener("click", () => {
    goc.hidden = !goc.hidden;
    nutGoc.setAttribute("aria-expanded", String(!goc.hidden));
  });
  return h(
    "dl",
    { class: "ht-chi-tiet", id: "fb-chi-tiet", hidden: true },
    ...hang("Người gửi", t.submitterName ?? "?"),
    ...hang("Loại", t.kindName),
    ...hang("Giờ gửi", when(t.createdAt)),
    ...(perms.xuLy ? [] : hang("Mức ưu tiên", PRIORITY_NAME[t.priority])),
    ...(t.resolvedIn ? hang("Sửa ở bản", t.resolvedIn) : []),
    ...(t.context.path ? hang("Từ trang", t.context.path) : []),
    ...(!t.orderCode && t.context.orderCode ? hang("Đơn", t.context.orderCode) : []),
    ...hang("Thiết bị", tomTatThietBi(thietBi || null), thietBi ? " " : null, thietBi ? nutGoc : null, thietBi ? goc : null),
    ...(t.context.appVersion ? hang("Bản", t.context.appVersion) : []),
    ...(t.mailPending ? hang("Email báo nhóm", "chưa gửi được") : []),
  );
}

/** Thanh bước bốn mốc thu một dòng cho người gửi không xử lý (không chip quyền). */
function dungBuoc(t: Api.FeedbackTicketDto): HTMLElement {
  const buoc = buocGopY(t.status);
  const sac = SAC_TRANG_THAI[t.status];
  return h(
    "div",
    { class: `ht-buoc is-${sac}`, "aria-label": `Trạng thái: ${t.statusName}` },
    h("strong", null, sac === "xong" ? "✓ " : sac === "tu-choi" ? "✕ " : "● ", t.statusName || FEEDBACK_STATUS_NAME[t.status]),
    buoc ? h("ol", { class: "ht-buoc-dong" }, ...buoc.map((x) => h("li", { class: `is-${x.tinh}`, "aria-current": x.tinh === "dang" ? "step" : undefined }, x.nhan))) : null,
  );
}

/** Khối đầu: tiêu đề, chip (người xử lý được), dòng phụ, chi tiết. Dựng lại khi vòng làm mới thấy đầu yêu cầu đổi. */
function dungDau(b: Bo): HTMLElement[] {
  const { t, perms, o } = b;
  const nx = nguoiXuLyHienThi(t);
  const choNhan = hienNhanViec(t, o.staffId);
  const choGiao = perms.giaoViec && dangMo(t);
  const chips = perms.xuLy
    ? h(
        "div",
        { class: "ht-chips" },
        chip([t.statusName || FEEDBACK_STATUS_NAME[t.status]], `Trạng thái: ${t.statusName}`, buocChoPhep(t.status).length ? (n) => hopTrangThai(b, n) : null, SAC_TRANG_THAI[t.status]),
        chip([`Ưu tiên: ${PRIORITY_NAME[t.priority]}`], `Mức ưu tiên: ${PRIORITY_NAME[t.priority]}`, (n) => hopUuTien(b, n)),
        chip([nx.kieu === "co" ? `Người xử lý: ${nx.ten}` : "Chưa ai nhận"], "Người xử lý", choNhan || choGiao ? (n) => hopNguoiXuLy(b, n) : null),
        nx.kieu === "cu" ? h("span", { class: "muted ht-ten-mo" }, `Người giữ trước: ${nx.ten} (đã nghỉ hoặc rời nhóm)`) : null,
      )
    : dungBuoc(t);
  const chuyenDuoc = perms.chuyenNhom && dangMo(t) && nhomChuyenDuoc(o.teams, t.teamId).length > 0;
  const nhom = chuyenDuoc
    ? chip([`Nhóm: ${t.teamName}`], "Chuyển nhóm", (n) => hopNhom(b, n))
    : h("span", { class: "ht-nhom-chu" }, `Nhóm: ${t.teamName}`);
  const chiTiet = dungChiTiet(b);
  const nutChiTiet = h("button", { type: "button", class: "btn btn-link ht-nut-chi-tiet", "aria-expanded": "false", "aria-controls": "fb-chi-tiet" }, "Chi tiết ", icon("chevron-down", 16));
  nutChiTiet.addEventListener("click", () => {
    chiTiet.hidden = !chiTiet.hidden;
    nutChiTiet.setAttribute("aria-expanded", String(!chiTiet.hidden));
  });
  return [
    h("h2", { class: "ht-tieu-de-luong" }, `${t.code} · ${t.title}`),
    chips,
    h("div", { class: "ht-dong-phu" }, nhom, t.orderId && t.orderCode ? h("a", { id: "fb-don", href: `/order?id=${encodeURIComponent(t.orderId)}` }, `Đơn ${t.orderCode} ›`) : null, nutChiTiet),
    chiTiet,
  ];
}

// ---- Luồng tin ---------------------------------------------------------------------------------------------------------------------------
/** Một bong bóng tin. Giữ lớp `card` + `data-tin` (kịch bản Chrome tìm tin theo `#thread .card`). */
const bongBong = (m: Api.FeedbackMessageDto): HTMLElement =>
  h("div", { class: `card fb-tin${m.mine ? " is-minh" : ""}${m.internal ? " is-noi-bo" : ""}`, "data-tin": m.id }, h("p", null, m.body));

function veCum(c: CumTin): HTMLElement {
  return h(
    "div",
    { class: `ht-cum${c.cuaToi ? " is-minh" : ""}${c.noiBo ? " is-noi-bo" : ""}` },
    h("div", { class: "muted fb-tin-dau" }, `${c.tacGia} · ${gioVN(c.luc)}`,
      c.noiBo && h("span", { class: "badge badge-draft ht-noi-bo" }, icon("lock", 14), " Ghi chú nội bộ · người gửi không thấy")),
    ...c.tin.map(bongBong),
  );
}

/** Dựng lại cả luồng (cụm + dòng hệ thống + mốc ngày). Ô trả lời nằm ngoài khối này nên bản nháp không mất. */
function veLuong(ds: HTMLElement, tin: readonly Api.FeedbackMessageDto[], suKien: readonly Api.FeedbackEventDto[], staffId: string, coSuKien: boolean): void {
  const hom = ngayVN(new Date().toISOString());
  let ngayTruoc = "";
  const ra: Child[] = [];
  const modNgay = (iso: string): void => {
    const n = ngayVN(iso);
    if (n === ngayTruoc) return;
    ngayTruoc = n;
    ra.push(h("p", { class: "ht-moc-ngay", role: "separator" }, n === hom ? "Hôm nay" : n));
  };
  for (const it of chenSuKien(gomTin(tin, staffId), coSuKien ? suKien : [])) {
    if ("suKien" in it) {
      modNgay(it.suKien.at);
      ra.push(h("p", { class: "ht-he-thong muted", role: "note", "data-su-kien": it.suKien.id }, `${it.cau} · ${gioVN(it.suKien.at)}`));
    } else {
      modNgay(it.luc);
      ra.push(veCum(it));
    }
  }
  replaceChildren(ds, ...ra);
}

/** Người xem đang ở gần cuối trang (đọc tin mới nhất / đang gõ trả lời) — chỉ khi đó mới cuộn theo tin mới. */
const oCuoiTrang = (): boolean => window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 160;

/** Mở luồng của một yêu cầu trong `goc` (cột phải ở máy tính, toàn màn ở điện thoại). Gọi lại với cùng hay khác `id` đều dựng lại từ đầu. */
export function moLuong(goc: HTMLElement, id: string, o: NgCanhLuong): void {
  dongHienTai = o.dong;
  void loadThread(goc, id, o, true);
}

async function loadThread(box: HTMLElement, id: string, o: NgCanhLuong, dauTien: boolean): Promise<void> {
  const doiNay = ++doiLuong;
  if (lm) {
    clearTimeout(lm.hen);
    lm.dung = true;
    lm = null;
  }
  box.hidden = false;
  const nutQuay = h("button", { type: "button", class: "btn btn-link ht-quay", "aria-label": "Quay lại danh sách" }, icon("back", 20), " Danh sách");
  nutQuay.addEventListener("click", () => o.dong());
  const loi = h("p", { class: "alert", role: "alert", id: "ht-luong-loi", hidden: true });
  const hienLoi = (m: string | null): void => {
    loi.textContent = m ?? "";
    loi.hidden = !m;
  };
  let d: Api.FeedbackDetailResponse | null = null;
  let loiMo = "";
  try {
    d = await api<Api.FeedbackDetailResponse>(`/api/feedback/${id}`);
  } catch (err) {
    loiMo = thongBao(err);
  }
  if (doiNay !== doiLuong) return; // đã có lần nạp mới hơn (hoặc luồng đã đóng)
  // Máy chủ vừa đánh dấu đã xem: nạp lại danh sách để dòng không giữ chấm «mới» cũ (góp ý 1/10). Vòng tự làm mới KHÔNG nạp danh sách.
  o.napLaiDs();
  if (!d) {
    replaceChildren(box, nutQuay, h("p", { class: "muted", id: "fb-loi-mo" }, loiMo));
    return;
  }
  const t = d.ticket;
  const perms = d.perms;
  const reload = (): void => void loadThread(box, id, o, false);
  const b: Bo = { t, perms, o, reload, hienLoi };

  const nhap = banNhap.get(id) ?? { body: "", internal: false };
  let noiBo = perms.xuLy && nhap.internal;
  const body = h("textarea", { rows: 3, maxLength: 4000, placeholder: "Viết phản hồi…", "aria-label": "Nội dung trả lời", value: nhap.body });
  const luuNhap = (): void => void banNhap.set(id, { body: body.value, internal: noiBo });
  body.addEventListener("input", luuNhap);
  const send = h("button", { type: "button", class: "btn btn-primary btn-chinh" }, "Gửi");
  const nutCong = h("button", { type: "button", class: "ht-che-do", "aria-pressed": "false" }, "Trả lời người gửi");
  const nutNoiBo = h("button", { type: "button", class: "ht-che-do", "aria-pressed": "false", hidden: !perms.xuLy }, "Ghi chú nội bộ");
  const cauMoLai = h("p", { class: "muted ht-mo-lai", role: "status", id: "ht-mo-lai", hidden: true }, CAU_MO_LAI);
  const traLoi = h("div", { class: "ht-tra-loi thanh-hanh-dong-cuoi", id: "fb-tra-loi" },
    h("div", { class: "ht-che-do-hang", role: "group", "aria-label": "Kiểu tin" }, nutCong, nutNoiBo),
    cauMoLai,
    body,
    send);
  /** Dòng «Gửi sẽ mở lại…» hiện TRƯỚC khi bấm: chỉ người gửi, yêu cầu đã xong / từ chối, đang ở kiểu công khai. */
  const veCheDo = (): void => {
    nutCong.setAttribute("aria-pressed", String(!noiBo));
    nutNoiBo.setAttribute("aria-pressed", String(noiBo));
    traLoi.classList.toggle("is-noi-bo", noiBo);
    cauMoLai.hidden = !(t.submitterId === o.staffId && !noiBo && statusAfterSubmitterReply(t.status) !== t.status);
  };
  nutCong.addEventListener("click", () => {
    noiBo = false;
    luuNhap();
    veCheDo();
  });
  nutNoiBo.addEventListener("click", () => {
    noiBo = true;
    luuNhap();
    veCheDo();
  });
  veCheDo();
  send.addEventListener("click", async () => {
    const r = await chay(async () => (await api<Api.FeedbackDetailResponse>(`/api/feedback/${id}/messages`, { method: "POST", body: { body: body.value, internal: perms.xuLy && noiBo } }), true), send, hienLoi);
    if (!r) return;
    banNhap.delete(id);
    void loadThread(box, id, o, true); // gửi xong cuộn xuống tin vừa gửi (điện thoại)
  });

  const khoiDau = h("div", { id: "fb-dau", class: "ht-dau-luong" }, ...dungDau(b));
  const ds = h("div", { class: "ht-luong-ds", id: "fb-tin-ds" });
  const suKien = new Map<string, Api.FeedbackEventDto>();
  for (const e of d.suKien ?? []) suKien.set(e.id, e);
  const coSuKien = perms.xuLy; // Q2: người gửi không xử lý không có dòng hệ thống (máy chủ cũng không trả `suKien` cho họ)
  const ve = (tin: readonly Api.FeedbackMessageDto[]): void => veLuong(ds, tin, [...suKien.values()], o.staffId, coSuKien);
  ve(d.messages);
  const baoDung = h("p", { class: "alert", role: "status", id: "fb-lam-moi-dung", hidden: true });
  const nutTaiLai = h("button", { type: "button", class: "btn btn-link", onclick: reload }, NHAN_TAI_LAI);
  const baoChuyen = h("p", { class: "muted", role: "status", id: "fb-da-doi-nhom", hidden: true }, CAU_DA_CHUYEN_NHOM, " ", nutTaiLai);

  replaceChildren(box, nutQuay, loi, khoiDau, baoDung, baoChuyen, ds, traLoi);

  const s: LamMoi = {
    doi: doiNay,
    id,
    tin: [],
    suKien,
    since: "",
    macDinh: t.createdAt,
    dau: { status: t.status, assigneeId: t.assigneeId, assigneeName: t.assigneeName, assigneeActive: t.assigneeActive, priority: t.priority, teamId: t.teamId },
    dangGoi: false,
    dung: false,
    daDoiNhom: false,
    ve: (r, moi) => {
      if (moi.length || (r.suKien?.length ?? 0) > 0) {
        const cuoi = oCuoiTrang();
        ve(s.tin);
        if (cuoi) window.scrollTo({ top: document.documentElement.scrollHeight });
      }
      if (r.ticket.teamId !== t.teamId) {
        s.daDoiNhom = true;
        baoChuyen.hidden = false; // quyền trên nhóm mới (perms) chỉ có ở tuyến chi tiết: người xem tự bấm tải lại
      }
      if (dauPhieuDoi(s.dau, r.ticket)) {
        Object.assign(t, { status: r.ticket.status, statusName: FEEDBACK_STATUS_NAME[r.ticket.status], assigneeId: r.ticket.assigneeId, assigneeName: r.ticket.assigneeName, assigneeActive: r.ticket.assigneeActive, priority: r.ticket.priority });
        replaceChildren(khoiDau, ...dungDau(b));
        veCheDo();
      }
    },
    dungVi: () => {
      baoDung.textContent = s.daDoiNhom ? CAU_DA_CHUYEN_NHOM : CAU_KHONG_CON_TRONG_NHOM;
      baoDung.append(" ", h("button", { type: "button", class: "btn btn-link", onclick: reload }, NHAN_TAI_LAI));
      baoDung.hidden = false;
      baoChuyen.hidden = true;
      traLoi.hidden = true;
      khoiDau.hidden = true; // chip không còn dùng được: ẩn cùng ô trả lời
    },
  };
  const b0 = buocLamMoi([], d.messages, t.createdAt);
  s.tin = b0.tin;
  s.since = b0.since;
  lm = s;
  henLamMoi(s);
  if (dauTien && !wide()) window.scrollTo({ top: document.documentElement.scrollHeight });
}
