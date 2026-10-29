import{k as i,F as d}from"./preact.module.Blkd8Nil.js";/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const w=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),g=(...e)=>e.filter((t,o,r)=>!!t&&t.trim()!==""&&r.indexOf(t)===o).join(" ").trim();/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */var h={xmlns:"http://www.w3.org/2000/svg",width:24,height:24,viewBox:"0 0 24 24",fill:"none",stroke:"currentColor","stroke-width":"2","stroke-linecap":"round","stroke-linejoin":"round"};/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const m=({color:e="currentColor",size:t=24,strokeWidth:o=2,absoluteStrokeWidth:r,children:n,iconNode:s,class:c="",...l})=>i("svg",{...h,width:String(t),height:t,stroke:e,"stroke-width":r?Number(o)*24/Number(t):o,class:["lucide",c].join(" "),...l},[...s.map(([a,u])=>i(a,u)),...d(n)]);/**
 * @license lucide-preact v0.460.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const k=(e,t)=>{const o=({class:r="",children:n,...s})=>i(m,{...s,iconNode:t,class:g(`lucide-${w(e)}`,r)},n);return o.displayName=`${e}`,o};export{k as c};
