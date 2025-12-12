"use strict";import*as t from"./paths.js";export var CLS=(e=>(e.RESET="reset",e.DEVELOPER="developer",e))(CLS||{});export function reports(){const r=new URL(t.REPORTS);return r.searchParams.set(t.REPORTS_PAGE_PARAM,window.location.href),r.toString()}
//# sourceMappingURL=header.js.map
