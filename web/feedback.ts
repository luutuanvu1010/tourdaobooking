// Trang Hỗ trợ (mã trang gopY, đường /feedback — ADR-0119 đợt 1): gửi yêu cầu tới một nhóm hỗ trợ, "Yêu cầu của tôi", luồng trả lời;
// thành viên nhóm (và Toàn quyền) có thẻ "Việc của nhóm" (lọc, nhận việc); Toàn quyền có thêm thẻ "Nhóm hỗ trợ". Luồng ở ho-tro-luong.ts, hộp gửi ở ho-tro-gui.ts.
// Dữ liệu qua /api/feedback*. Chuỗi từ người dùng chỉ đi qua h()/textContent. Địa chỉ: /feedback (danh sách), ?id=<uuid> (luồng), ?new=1&from=<đường dẫn> (mở form).
// Giao diện chỉ ẩn/hiện theo `teams` / `perms` máy chủ trả về; máy chủ (quyenPhieu) luôn kiểm lại.
import { can } from "../src/shared/permissions";
import { cauTepLoi } from "../src/shared/tep-hien-thi";
import { NHAN_TAB, nhomHangDoi, tabHoTro, type TabHoTro } from "../src/shared/ve-ho-tro-hien-thi";
import { ApiError, api, type Api } from "./api";
import { byId, h, replaceChildren } from "./dom";
import { veDanhSach } from "./ho-tro-danh-sach";
import { moHopGui } from "./ho-tro-gui";
import { dungLuong, moLuong, type NgCanhLuong } from "./ho-tro-luong";
import { veNhomHoTro } from "./ho-tro-nhom";
import { datThanhTab, initShell, showError } from "./shell";

const errorEl = byId("error");
const staff = await initShell();
const params = new URLSearchParams(location.search);

const fail = (err: unknown) => showError(errorEl, err instanceof ApiError ? err.message : "Không kết nối được máy chủ.");
const when = (iso: string) => new Date(iso).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh", dateStyle: "short", timeStyle: "short" });

/** Thao tác GHI: khoá nút từ lúc bấm đến khi xong (bấm đúp không gửi hai lần), mở lại ở finally. */
async function act<T>(fn: () => Promise<T>, btn?: HTMLButtonElement | null): Promise<T | undefined> {
  if (btn?.disabled) return undefined;
  showError(errorEl, null);
  if (btn) btn.disabled = true;
  try {
    return await fn();
  } catch (err) {
    fail(err);
    return undefined;
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ---- Nhóm hỗ trợ của người xem: nạp TRƯỚC mọi thứ (form, tab, luồng đều cần). Lỗi → coi như chỉ gửi được nhóm mặc định, không vỡ trang. ----------
let teams: Api.FeedbackTeamsResponse = { teams: [], mine: [], isSuper: false };
try {
  teams = await api<Api.FeedbackTeamsResponse>("/api/feedback/teams");
} catch {
  /* để rỗng: ô chọn nhóm ẩn, máy chủ tự gửi tới Kỹ thuật */
}
const tabs = tabHoTro(teams);
const hangDoiChon = nhomHangDoi(teams);
let tab: TabHoTro = "mine";
let queueTeam = hangDoiChon.find((x) => teams.mine.some((m) => m.teamId === x.id))?.id ?? hangDoiChon[0]?.id ?? "";

/** «Nhận việc»: nhận phiếu cho chính mình. 409 «Vừa có người nhận…» hiện ở dòng báo lỗi; thành công hay không đều gọi `after` để thấy trạng thái mới. */
function nutNhanViec(t: Api.FeedbackTicketDto, nhan: string, after: () => void): HTMLButtonElement {
  const b = h("button", { type: "button", class: "btn", "data-nhan-viec": t.id }, nhan);
  b.addEventListener("click", async () => {
    await act(() => api<Api.FeedbackDetailResponse>(`/api/feedback/${t.id}/claim`, { method: "POST" }), b);
    after();
    void napHuyHieu(); // việc vừa nhận không còn «chưa ai nhận»: huy hiệu đếm lại
  });
  return b;
}

// ---- Khung: thanh thẻ + danh sách (PR 3) -------------------------------------------------------------------------
// Danh sách hai thẻ nằm ở web/ho-tro-danh-sach.ts; thẻ «Nhóm hỗ trợ» (quản lý nhóm) ở web/ho-tro-nhom.ts.
let idDangMo = params.get("id");
let dsDangDung: { napLai(): void } | null = null;
let theDangDung: TabHoTro | null = null;
let demHangDoi = 0;
/** Luồng đang mở nhưng vòng làm mới đã dừng vì người xem sang thẻ «Nhóm hỗ trợ» (R40): quay lại thẻ danh sách thì chạy lại. */
let luongTamDung = false;

function veThanhThe(): void {
  const thanh = byId("ht-tabs");
  const giuTieuDiem = thanh.contains(document.activeElement); // vẽ lại thanh thẻ không được làm rơi tiêu điểm bàn phím
  replaceChildren(
    thanh,
    ...tabs.map((k, i) => {
      const b = h("button", {
        type: "button", role: "tab", id: `ht-tab-${k}`, "aria-selected": String(tab === k), "aria-controls": "ht-hai-cot", tabindex: tab === k ? "0" : "-1",
        class: `ht-tab${tab === k ? " is-on" : ""}`, "data-tab": k,
      }, NHAN_TAB[k], k === "queue" && demHangDoi > 0 && h("span", { class: "ht-dem", "aria-label": `${demHangDoi} yêu cầu chưa đọc` }, String(demHangDoi)));
      const chon = (): void => {
        if (tab === k) return;
        tab = k;
        void loadList();
      };
      b.addEventListener("click", chon);
      b.addEventListener("keydown", (e) => {
        const toi = e.key === "ArrowRight" ? (i + 1) % tabs.length : e.key === "ArrowLeft" ? (i - 1 + tabs.length) % tabs.length : e.key === "Home" ? 0 : e.key === "End" ? tabs.length - 1 : -1;
        if (toi < 0) return;
        e.preventDefault();
        const moi = tabs[toi]!;
        if (tab !== moi) {
          tab = moi;
          void loadList(); // vẽ lại thanh thẻ và giữ tiêu điểm ở thẻ mới
        } else byId(`ht-tab-${moi}`).focus();
      });
      return b;
    }),
  );
  if (giuTieuDiem) byId(`ht-tab-${tab}`).focus();
  byId(`ht-tab-${tab}`).scrollIntoView({ block: "nearest", inline: "nearest" }); // 390px: thanh thẻ cuộn ngang — thẻ đang chọn không bị cắt
  byId("ht-hai-cot").setAttribute("aria-labelledby", `ht-tab-${tab}`);
  byId("ht-gui").className = tab === "mine" ? "btn btn-primary" : "btn";
}

async function napHuyHieu(): Promise<void> {
  if (!tabs.includes("queue")) return;
  try {
    const b = await api<Api.FeedbackBadgeResponse>("/api/feedback/badge");
    if (b.queue !== demHangDoi) {
      demHangDoi = b.queue;
      veThanhThe();
    }
  } catch {
    /* huy hiệu chỉ là phụ: lỗi thì thôi */
  }
}

/** Dựng thanh thẻ + nội dung thẻ đang chọn. Thẻ danh sách: dựng một lần rồi chỉ nạp lại; gọi lại nhiều lần (luồng đổi, đổi khổ) đều an toàn. */
async function loadList(): Promise<void> {
  showError(errorEl, null);
  veThanhThe();
  const goc = byId("ht-danh-sach");
  byId("ht-hai-cot").classList.toggle("is-mot-cot", tab === "teams");
  if (tab === "teams") {
    dsDangDung = null;
    theDangDung = null;
    byId("ht-luong").hidden = true;
    if (idDangMo && !luongTamDung) {
      dungLuong(); // luồng bị ẩn thì không làm mới ngầm
      luongTamDung = true;
    }
    veNhomHoTro(goc); // bảng nhóm + hộp Sửa / Thêm nhóm (web/ho-tro-nhom.ts)
    return;
  }
  if (idDangMo) {
    byId("ht-luong").hidden = false; // luồng đang mở vẫn hiện khi đổi thẻ ở máy tính
    if (luongTamDung) {
      luongTamDung = false;
      moLuong(byId("ht-luong"), idDangMo, ngCanh);
    }
  }
  if (dsDangDung && theDangDung === tab) dsDangDung.napLai();
  else {
    theDangDung = tab;
    dsDangDung = veDanhSach(goc, {
      the: tab,
      nhom: tab === "queue" ? hangDoiChon : [],
      nhomMacDinh: queueTeam,
      staffId: staff.id,
      get dangMo() {
        return idDangMo;
      },
      nutNhanViec,
      baoLoi: fail,
      moYeuCau,
    });
  }
  void napHuyHieu();
}

const moForm = (opener: HTMLElement | null = null): void => moHopGui({ from: params.get("from"), staff, teams, opener });
byId("ht-gui").addEventListener("click", () => moForm(byId("ht-gui")));

// ---- Luồng một yêu cầu: mở tại chỗ (web/ho-tro-luong.ts) ----------------------------------------------------------------
// Địa chỉ `?id=` giữ trên thanh địa chỉ: mở = pushState (nút quay lại của trình duyệt đóng luồng), mở thẳng từ `?id=` = đóng bằng replaceState.
const ngCanh: NgCanhLuong = {
  staffId: staff.id,
  teams,
  coGoTep: can(staff, "feedback.triage"), // gỡ tệp gửi nhầm: chỉ Toàn quyền (ADR-0144 đ6); máy chủ kiểm lại
  dong: () => dongLuong(),
  napLaiDs: () => {
    dsDangDung?.napLai();
    void napHuyHieu(); // mở luồng là đã đọc: huy hiệu giảm
  },
  chuyenXong: () => location.replace("/feedback?chuyen=1"),
};

function danhDauDangMo(id: string | null): void {
  idDangMo = id;
  for (const el of document.querySelectorAll<HTMLElement>(".ht-dong")) el.classList.toggle("is-dang-mo", id !== null && el.dataset.ticket === id);
}

/** Hiện luồng của `id` (không đụng địa chỉ). Điện thoại: toàn màn và ẩn thanh tab. */
function hienLuong(id: string, canhBao?: string | null): void {
  danhDauDangMo(id);
  document.body.classList.add("ht-luong-mo");
  datThanhTab(false);
  const goc = byId("ht-luong");
  goc.hidden = false;
  moLuong(goc, id, ngCanh, canhBao);
}

/** Ẩn luồng (không đụng địa chỉ): mọi đường đóng đều đi qua đây nên thanh tab luôn hiện lại. */
function anLuong(): void {
  dungLuong();
  luongTamDung = false;
  void napHuyHieu();
  danhDauDangMo(null);
  document.body.classList.remove("ht-luong-mo");
  datThanhTab(true);
  byId("ht-luong").hidden = true;
  replaceChildren(byId("ht-luong"));
}

function moYeuCau(yc: string): void {
  const url = `/feedback?id=${encodeURIComponent(yc)}`;
  // Đang có luồng mở (máy tính, bấm sang dòng khác): thay mục lịch sử, không chồng thêm — nút quay lại vẫn đóng luồng bằng MỘT lần bấm.
  if (idDangMo !== null) history.replaceState(history.state, "", url);
  else history.pushState({ htLuong: true }, "", url);
  hienLuong(yc);
}

function dongLuong(): void {
  if (history.state?.htLuong) history.back(); // popstate lo phần còn lại
  else {
    history.replaceState(null, "", "/feedback");
    anLuong();
  }
}

window.addEventListener("popstate", () => {
  const moi = new URLSearchParams(location.search).get("id");
  if (moi) hienLuong(moi);
  else anLuong();
});

if (idDangMo) {
  // Vừa gửi yêu cầu mà có tệp chưa lên kho (`&tepLoi=n` do hộp gửi thêm): báo MỘT lần trong luồng rồi bỏ khỏi địa chỉ (tải lại trang không báo nữa).
  const canhBao = cauTepLoi(Number(params.get("tepLoi")) || 0);
  if (params.has("tepLoi")) history.replaceState(history.state, "", `/feedback?id=${encodeURIComponent(idDangMo)}`);
  hienLuong(idDangMo, canhBao);
}
void loadList();
if (!idDangMo) {
  if (params.get("chuyen") === "1") byId("ht-tabs").before(h("p", { class: "muted", role: "status", id: "fb-da-chuyen" }, "Đã chuyển nhóm."));
  if (params.get("new") === "1") moForm();
}
