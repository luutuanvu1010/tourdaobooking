// SINH bởi scripts/huong-dan-xem-lai.mjs, không sửa tay. Mỗi bài: dấu vân lúc xem lại gần nhất, kèm bản và ngày.
export interface DauVanBai { readonly neo: string; readonly chu: string; readonly ban: string; readonly ngay: string }
export const DAU_VAN: Readonly<Record<string, DauVanBai>> = {
  "kho-ve": {"neo":"7a1ca5bd1e9812c9","chu":"06499a40550f473e","ban":"3.37","ngay":"2026-11-23"},
  "quet-ve": {"neo":"4f35180cc3cd9424","chu":"a44eef5edc87a346","ban":"3.41","ngay":"2026-11-23"},
  "doi-chieu-ve": {"neo":"fd305aef484ccfe9","chu":"80947f92445b6340","ban":"3.37","ngay":"2026-11-23"},
  "cai-dat-ve": {"neo":"1a9be7c66766df30","chu":"78895cd744fbcb8b","ban":"2.80","ngay":"2026-11-09"},
  "dich-vu-can-kiem-ve": {"neo":"f2dde5cfd02f1520","chu":"b41fe0afa23fe41f","ban":"3.33","ngay":"2026-11-23"},
  "gioi-han-nhap-hoa-hong": {"neo":"5be668561a80de9f","chu":"f2fe829bae2aff80","ban":"2.58","ngay":"2026-11-03"},
  "han-muc-tra-sau": {"neo":"7f5b9d0308bd1cb2","chu":"e1ce3060c41a683e","ban":"3.37","ngay":"2026-11-23"},
  "xem-no-tra-sau": {"neo":"9df29f44a22d33e7","chu":"87acc817cf3c3645","ban":"3.37","ngay":"2026-11-23"},
  "giao-dien": {"neo":"7fde36318901a977","chu":"8d315591cb3389c0","ban":"3.6","ngay":"2026-11-15"},
  "phi-don": {"neo":"a0fcba41b1b5d9b4","chu":"19bd88ff8bec3e67","ban":"3.17","ngay":"2026-11-18"},
};
