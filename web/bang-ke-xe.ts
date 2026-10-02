// Bảng kê chi phí xe thuê (/bang-ke-xe — ADR-0057 T2 C9; bản vẽ Đợt 4 màn 1c). Khung trang (Task G0); nội dung ở Task G4.
import { can } from "../src/shared/permissions";
import { byId } from "./dom";
import { datCrumb } from "./giay-to-ui";
import { initShell, showError } from "./shell";

const staff = await initShell();
datCrumb("Vận chuyển", "Bảng kê chi phí xe");
if (!can(staff, "transport.cost.view")) showError(byId("error"), "Tài khoản này không xem được bảng kê chi phí xe.");
