// Module company — hồ sơ pháp lý của công ty (tên, MST, địa chỉ, hotline, email). Route: GET /api/company (công khai, chỉ đọc).
// Đáy đồ thị phụ thuộc (ADR-0002): không import module nào. Sửa hồ sơ công ty là việc của M5 (ngoài phạm vi hiện tại).
// Công khai vì màn đăng nhập (chưa có phiên) hiển thị các thông tin này; DTO chỉ gồm trường được phép lộ (xem CompanyDto).
import type { CompanyDto, CompanyResponse } from "../../shared/contracts";
import { error, json } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { findCompany, type CompanyRow } from "./repository";

const toDto = (r: CompanyRow): CompanyDto => ({ name: r.company_name, taxCode: r.tax_code, address: r.address, hotline: r.hotline, email: r.email });

export const companyModule: AppModule = {
  name: "company",
  routes: [
    route("GET", "/api/company", "public", async ({ env }) => {
      const row = await findCompany(env.DB);
      if (!row) return error(404, "not_found", "Chưa có thông tin công ty.");
      return json({ company: toDto(row) } satisfies CompanyResponse);
    }),
  ],
};
