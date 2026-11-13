// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"b6f5257b6cddae90","chu":"dbb458aafae54ae3","ban":"2.97","ngay":"2026-11-13"},
  "quet-ve": {"neo":"c57944f163c6a7ea","chu":"3832545a5f0470e6","ban":"2.97","ngay":"2026-11-13"},
  "doi-chieu-ve": {"neo":"e4f49f5a34c037cb","chu":"f9153bd203565954","ban":"2.97","ngay":"2026-11-13"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"bad8a5165ce33a3a","chu":"b41fe0afa23fe41f","ban":"2.97","ngay":"2026-11-13"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"94c777db435d9756","chu":"38ef6594a828abfa","ban":"2.95","ngay":"2026-11-12"},
  "xem-no-tra-sau": {"neo":"9ba037078edc04ce","chu":"fa963bef8425dbf2","ban":"2.97","ngay":"2026-11-13"},
  "giao-dien": {"neo":"09a74c3f97ac5316","chu":"8d315591cb3389c0","ban":"2.97","ngay":"2026-11-13"},
};
