// Module company — thông tin công khai của công ty cho biên nhận (tên pháp lý, MST, địa chỉ, hotline, email). Route: GET /api/company (công khai, chỉ đọc).
// ADR-0024 6.2: định danh đọc qua hàm công bố ownerCompany của module parties (hồ sơ tổ chức đang giữ vai "Công ty chủ"; cạnh company → parties).
// Module này giữ DANH SÁCH TRẮNG năm trường (CompanyDto — cố ý không Zalo, logo, người sửa). company_profile chỉ còn logo_url (6.3).
import type { CompanyDto, CompanyResponse } from "../../shared/contracts";
import { error, json } from "../../shared/http";
import { route, type AppModule } from "../../shared/router";
import { ownerCompany } from "../parties";
import { toCompanyDto } from "./rules";

/** API công khai cho module `receipt` (biên nhận — ADR-0024 đ1): CÙNG danh sách trắng năm trường của `GET /api/company`; null = chưa có công ty chủ. */
export async function congTyChoBienNhan(db: D1Database): Promise<CompanyDto | null> {
  return toCompanyDto(await ownerCompany(db));
}

export const companyModule: AppModule = {
  name: "company",
  routes: [
    route("GET", "/api/company", "public", async ({ env }) => {
      const dto = toCompanyDto(await ownerCompany(env.DB));
      if (!dto) return error(404, "not_found", "Chưa có thông tin công ty.");
      return json({ company: dto } satisfies CompanyResponse);
    }),
  ],
};
