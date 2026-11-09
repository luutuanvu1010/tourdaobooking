// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"0a7948f6e4121c67","chu":"b6be711fed135675","ban":"2.83","ngay":"2026-11-09"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"9a5cc2433c951b5e","chu":"b41fe0afa23fe41f","ban":"2.76","ngay":"2026-11-08"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"d8d3abd46c095c77","chu":"4c299fabe8253f65","ban":"2.83","ngay":"2026-11-09"},
  "xem-no-tra-sau": {"neo":"973fc0d160c029ed","chu":"fa963bef8425dbf2","ban":"2.70","ngay":"2026-11-06"},
  "giao-dien": {"neo":"19ec67016422d82d","chu":"8d315591cb3389c0","ban":"2.58","ngay":"2026-11-03"},
};
