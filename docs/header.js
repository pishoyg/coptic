"use strict";import*as r from"./paths.js";export var CLS=(e=>(e.RESET="reset",e.DEVELOPER="developer",e))(CLS||{}),EVENT=(o=>(o.RESET="reset",o))(EVENT||{});export function dispatch(t){document.dispatchEvent(new CustomEvent(t))}export function reports(){const t=new URL(r.REPORTS);return t.searchParams.set(r.REPORTS_PAGE_PARAM,window.location.href),t.toString()}
//# sourceMappingURL=header.js.map
