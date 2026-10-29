import{u as c}from"./index.C3UIvaYc.js";import{o as d,$ as p,a as m}from"./store.CgRnbl6p.js";import{u}from"./useList.D7jslu-N.js";import{i as h,B as b}from"./nav.DA_DhEb2.js";import{w as v}from"./urls.DqaIyPML.js";import{u as a}from"./jsxRuntime.module.BfIVMmzk.js";import{c as t}from"./createLucideIcon.Bd-XODZy.js";import"./hooks.module.C7gYg2uW.js";import"./preact.module.Blkd8Nil.js";import"./container.SWxJ8NX1.js";/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const y=t("House",[["path",{d:"M15 21v-8a1 1 0 0 0-1-1h-4a1 1 0 0 0-1 1v8",key:"5wwlr5"}],["path",{d:"M3 10a2 2 0 0 1 .709-1.528l7-5.999a2 2 0 0 1 2.582 0l7 5.999A2 2 0 0 1 21 10v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"1d0kgt"}]]);/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=t("Library",[["path",{d:"m16 6 4 14",key:"ji33uf"}],["path",{d:"M12 6v14",key:"1n7gus"}],["path",{d:"M8 8v12",key:"1gg7y9"}],["path",{d:"M4 4v16",key:"6qkkli"}]]);/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const f=t("Search",[["circle",{cx:"11",cy:"11",r:"8",key:"4ej97u"}],["path",{d:"m21 21-4.3-4.3",key:"1qie3q"}]]),x=[{href:"/",label:"Inicio",Icon:y},{href:"/biblioteca",label:"Biblioteca",Icon:k},{href:"/buscar",label:"Buscar",Icon:f}];function $({pathname:n="/"}){u();const e=c(p)?.count??null,i=c(m);return a("nav",{class:"btm-nav md:hidden z-40 border-t border-base-300",children:[x.map(({href:r,label:s,Icon:l})=>{const o=h(r,n);return a("a",{href:v(r),"aria-label":s,"aria-current":o?"page":void 0,class:o?"active text-primary":"",children:[a(l,{size:20,"aria-hidden":!0}),a("span",{class:"btm-nav-label text-xs",children:s})]},r)}),a("button",{type:"button","aria-label":"Mi lista","aria-expanded":i,class:i?"active text-primary":"",onClick:d,children:[a("div",{class:"indicator",children:[a(b,{size:20,"aria-hidden":!0}),e!==null&&e>0&&a("span",{class:"badge badge-primary badge-xs indicator-item",children:e})]}),a("span",{class:"btm-nav-label text-xs",children:"Mi lista"})]})]})}export{$ as default};
