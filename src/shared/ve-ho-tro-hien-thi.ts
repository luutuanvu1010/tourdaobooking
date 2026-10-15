// Luật hiển thị THUẦN của trang Hỗ trợ (/feedback, ADR-0119 đợt 1): tab nào hiện, nhóm nào chọn được ở hàng đợi, khi nào hiện «Nhận việc», địa chỉ hàng đợi.
// Chỉ ẩn/hiện — máy chủ (quyenPhieu) luôn kiểm lại. Không I/O; bài ở ve-ho-tro-hien-thi.test.ts.
import type { FeedbackTeamsResponse, FeedbackTicketDto } from "./contracts.ts";
import type { FeedbackStatus } from "./feedback-catalog.ts";
import type { LocHangDoi } from "./ve-ho-tro.ts";

export type TabHoTro = "mine" | "queue" | "teams";

/** Tab hiện cho người xem: «Yêu cầu của tôi» luôn có; «Hàng đợi nhóm» khi là thành viên một nhóm còn dùng hoặc Toàn quyền; «Quản lý nhóm» chỉ Toàn quyền. */
export function tabHoTro(t: FeedbackTeamsResponse): TabHoTro[] {
  const out: TabHoTro[] = ["mine"];
  if (t.isSuper || nhomHangDoi(t).length > 0) out.push("queue");
  if (t.isSuper) out.push("teams");
  return out;
}

/** Nhóm chọn được ở hàng đợi: Toàn quyền mọi nhóm đang dùng; thành viên chỉ nhóm mình thuộc (và nhóm đó còn dùng — `teams` chỉ gồm nhóm đang dùng). */
export function nhomHangDoi(t: FeedbackTeamsResponse): { id: string; name: string }[] {
  if (t.isSuper) return t.teams.map((x) => ({ id: x.id, name: x.name }));
  const cua = new Set(t.mine.map((m) => m.teamId));
  return t.teams.filter((x) => cua.has(x.id)).map((x) => ({ id: x.id, name: x.name }));
}

/** Phiếu coi như «chưa ai nhận»: chưa giao, hoặc người giữ đã bị khoá (ADR-0119 điều 8). */
export const chuaAiNhan = (t: Pick<FeedbackTicketDto, "assigneeId" | "assigneeActive">): boolean => !t.assigneeId || !t.assigneeActive;

/** Nút «Nhận việc»: phiếu chưa ai nhận, chưa đóng, và không phải phiếu chính người xem gửi (người gửi không xử lý phiếu mình — Review Focus 1). */
export function hienNhanViec(t: Pick<FeedbackTicketDto, "assigneeId" | "assigneeActive" | "submitterId" | "status">, staffId: string): boolean {
  return chuaAiNhan(t) && t.submitterId !== staffId && t.status !== "DONE" && t.status !== "DECLINED";
}

/** Địa chỉ hàng đợi một nhóm. Bỏ `status` khi chưa lọc: máy chủ trả 400 cho `status=` rỗng. */
export function duongHangDoi(team: string, loc: LocHangDoi, status: FeedbackStatus | ""): string {
  const q = new URLSearchParams({ team, loc });
  if (status) q.set("status", status);
  return `/api/feedback/queue?${q.toString()}`;
}

/** Nhóm nhận khi chuyển: mọi nhóm đang dùng trừ nhóm đang giữ phiếu. */
export const nhomChuyenDuoc = (t: FeedbackTeamsResponse, dangGiu: string): { id: string; name: string }[] =>
  t.teams.filter((x) => x.id !== dangGiu).map((x) => ({ id: x.id, name: x.name }));
