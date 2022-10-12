/*!
 * LUX Frontend
 * (c) 2022 thelaumix
 * Released under the MIT License.
*/
const Lux=(e={})=>{let t=Object.assign({backend:"/api",socket:!0},e);var n=[];let a={};a.Call=(e,a=null,l=null)=>(data=null,null!=a&&(data=JSON.stringify(a)),new Promise(r=>{try{$.ajax({contentType:"application/json",data,dataType:"json",xhrFields:{withCredentials:!0},complete(e,t){let a={xhr:e,data:t,cancel:!1};for(let l of n)!0!=a.cancel&&l(a);!0!==a.cancel?r({code:e.status,data:e.responseJSON||{}}):r({code:-1,data:{error:"REJECTED_BY_MIDDLEWARE",message:"The request was rejected by a middleware instance"}})},type:l||(null!=a?"POST":"GET"),url:t.backend+"/"+e})}catch{r({code:500,data:{error:"FAILED"}})}})),a.Call.use=e=>{"function"==typeof e&&n.push(e)};let l;if(!0===t.socket){let r,c={},o=new Set,i=()=>{o=new Set,(l=io(t.backend,{transports:["websocket"],secure:!0,reconnection:!0,reconnectionDelay:1e3,reconnectionDelayMax:5e3,reconnectionAttempts:1/0})).on("connect",()=>{for(let e in"function"==typeof r&&r(!0,l.id),c){let t=c[e];o.has(t)||(o.add(t),l.on(e,t))}}),l.on("disconnect",()=>{"function"==typeof r&&r(!1)})};i(),a.Socket={Emit:(e,...t)=>new Promise((n,a)=>{try{l.emit(e,...t,e=>{n(e)})}catch(r){a(r)}}),On(e,t){c[e]=t;try{o.has(t)||(o.add(t),l.on(e,t))}catch(n){}},Connection(e){r=e},Reconnect(){l.disconnect(),i()}}}let s=()=>{},u=async()=>{a.Page.Path=window.location.pathname;let e=window.location.pathname.toLowerCase().split("/");e.splice(0,1),a.Page.Args=e,await s()};return a.Page=async(e,t=!1)=>{if($("html").addClass("--loading"),"function"==typeof e)s=e,a.Page.Path=window.location.pathname,await u();else if("string"==typeof e){let n=e;a.Page.Path=n;let l={p_url:n},r="LUX Web System";!0!==t&&history.pushState(l,r,n),document.title=r,await u()}$("html").removeClass("--loading")},a.Page.Args=[],a.Page.Path=window.location.pathname,$("a").live("click",function(e){let t=$(this).attr("href");if("/"==t.substr(0,1))return e.preventDefault(),a.Page(t),!1}),setTimeout(function(){$(window).bind("popstate",function(e){return a.Page(location.pathname,!0),e.preventDefault(!0),!1})},200),a};function QueryMatchUrl(e,t){if("string"!=typeof e||"string"!=typeof t)return!1;"/"==e[0]&&(e=e.substring(1)),"/"==t[0]&&(t=t.substring(1)),"/"==e.substring(e.length-1)&&(e=e.substring(0,e.length-1)),"/"==t.substring(t.length-1)&&(t=t.substring(0,t.length-1));try{if(RegExp(`^${t}$`).test(e))return!0}catch(n){return!1}let a=e.split("/"),l=t.split("/");if(a.length!=l.length)return!1;let r=0,c={};for(let o=0;o<l.length;o++)try{let i=/:([a-z]+)(\(([^\)]+)\))?/ig.exec(l[o]);if(null!=i){if(null==i[3])c[i[1]]=a[o],r++;else{let s=RegExp(`^${i[3]}$`).exec(a[o]);null!=s&&(c[i[1]]=s[0],r++)}}else l[o]==a[o]&&r++}catch(u){return!1}return r==a.length&&(c=={}||c)}function WAIT(e){return new Promise(t=>{setTimeout(function(){t()},e)})}Math.clamp=function(e,t,n){return n<e?e:n>t?t:n},Math.lerp=function(e,t,n){return e+(t-e)*n};