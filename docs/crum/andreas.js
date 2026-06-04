"use strict";import*as t from"../html.js";import*as o from"../paths.js";import*as p from"./cls.js";const i=/[\p{Script=Greek}][\p{Script=Greek}\p{Mark}]*/u;export function handle(r){t.linkifyText(r,i,e=>o.greekLookup(e[0]),[p.GREEK])}
//# sourceMappingURL=andreas.js.map
