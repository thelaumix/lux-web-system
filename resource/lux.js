/*!
 * LUX Frontend
 * (c) 2022 thelaumix
 * Released under the MIT License.
*/
const Lux=(e={},t=null)=>{let n=Object.assign({backend:"{{path_endpoint}}",socket:!0,socket_address:!1,frontend_root:"{{path_frontend}}/"},e),l=[],a={{{plugin_array}}},r={};r.Call=(e,t=null,a=null)=>(data=null,null!=t&&(data=JSON.stringify(t)),new Promise(r=>{try{$.ajax({contentType:"application/json",data,dataType:"json",xhrFields:{withCredentials:!0},complete(e,t){let n={xhr:e,data:t,cancel:!1};for(let a of l)!0!=n.cancel&&a(n);!0!==n.cancel?r({code:e.status,data:e.responseJSON||{}}):r({code:-1,data:{error:"REJECTED_BY_MIDDLEWARE",message:"The request was rejected by a middleware instance"}})},type:a||(null!=t?"POST":"GET"),url:n.backend+"/"+e})}catch{r({code:500,data:{error:"FAILED"}})}})),r.Call.use=e=>{"function"==typeof e&&l.push(e)};let o;if(!0===n.socket){let s,c={},i=new Set,u=()=>{i=new Set;let e="",t=null;try{let l=new URL(n.socket_address||n.backend);e=l.origin,t=(l.pathname+"/socket.io").replace(/[\/]{2,}/ig,"/")}catch(a){e="/",t=(n.backend+"/socket.io").replace(/[\/]{2,}/ig,"/")}(o=io(e,{transports:["websocket"],secure:!0,reconnection:!0,reconnectionDelay:1e3,reconnectionDelayMax:5e3,reconnectionAttempts:1/0,path:t})).on("connect",()=>{for(let e in"function"==typeof s&&s(!0,o.id),c){let t=c[e];i.has(t)||(i.add(t),o.on(e,t))}}),o.on("disconnect",()=>{"function"==typeof s&&s(!1)})};u(),r.Socket={Emit:(e,...t)=>new Promise((n,l)=>{try{o.emit(e,...t,e=>{n(e)})}catch(a){l(a)}}),On(e,t){c[e]=t;try{i.has(t)||(i.add(t),o.on(e,t))}catch(n){}},Connection(e){s=e},Reconnect(){o.disconnect(),u()}}}let p=()=>{},g=async()=>{r.Page.Path=window.location.pathname;let e=window.location.pathname.toLowerCase().split("/");e.splice(0,1),r.Page.Args=e,await p()};r.Page=async(e,t=!1)=>{if($("html").addClass("--loading"),"function"==typeof e)p=e,r.Page.Path=window.location.pathname,await g();else if("string"==typeof e){let n=e;r.Page.Path=n;let l={p_url:n},a="LUX Web System";!0!==t&&history.pushState(l,a,n),document.title=a,await g()}$("html").removeClass("--loading")},r.Page.Args=[],r.Page.Path=window.location.pathname,$("a").live("click",function(e){let t=$(this).attr("href");if("/"==t.substr(0,1))return e.preventDefault(),r.Page(t),!1}),setTimeout(function(){$(window).bind("popstate",function(e){return r.Page(location.pathname,!0),e.preventDefault(!0),!1})},200),r.Plugins={};let d=new Set;return(async()=>{let e=$("<meta>");$(document.head).prepend(e);let l=()=>{e.remove(),"function"==typeof t&&t()};if(0==Object.keys(a).length)return l();for(let o in a){let s=a[o],c=(n.frontend_root+"js:@"+o).replace(/[\/]{2,}/ig,"/");(2&s)>0&&(async()=>{d.add(o);try{let e={Page:r.Page,Plugins:r.Plugins,Socket:r.Socket,Call:(e,t=null,n=null)=>"/"==e[0]?r.Call(e,t,n):r.Call(`@/${o}/${e}`)};e.Call.use=r.Call.use;let t=await import(c+".js"),n=await t.Enable(e);r.Plugins[o]=n}catch(a){console.error("Failed to load plugin '"+o+"':",a)}d.delete(o),0==d.size&&l()})(),(1&s)>0&&$(document.head).prepend($("<link>",{rel:"stylesheet",href:c+".css"}))}})(),r};Math.clamp=function(e,t,n){return n<e?e:n>t?t:n},Math.lerp=function(e,t,n){return e+(t-e)*n},window.QueryMatchUrl=(e,t)=>{if("string"!=typeof e||"string"!=typeof t)return!1;"/"==e[0]&&(e=e.substring(1)),"/"==t[0]&&(t=t.substring(1)),"/"==e.substring(e.length-1)&&(e=e.substring(0,e.length-1)),"/"==t.substring(t.length-1)&&(t=t.substring(0,t.length-1));try{if(RegExp(`^${t}$`).test(e))return!0}catch(n){return!1}let l=e.split("/"),a=t.split("/");if(l.length!=a.length)return!1;let r=0,o={};for(let s=0;s<a.length;s++)try{let c=/:([a-z]+)(\(([^\)]+)\))?/ig.exec(a[s]);if(null!=c){if(null==c[3])o[c[1]]=l[s],r++;else{let i=RegExp(`^${c[3]}$`).exec(l[s]);null!=i&&(o[c[1]]=i[0],r++)}}else a[s]==l[s]&&r++}catch(u){return!1}return r==l.length&&(o=={}||o)},window.Wait=e=>new Promise(t=>{setTimeout(function(){t()},e)});