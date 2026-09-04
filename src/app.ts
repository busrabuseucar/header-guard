import {analyze,exportReport,InputError,type Analysis,type Scheme} from './engine.js';
import {BEFORE,AFTER} from './samples.js';
function get<T extends HTMLElement>(id:string):T{const e=document.getElementById(id);if(!e)throw Error('Missing element');return e as T;}
function node<K extends keyof HTMLElementTagNameMap>(tag:K,text?:string,cls?:string){const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;}
const input=get<HTMLTextAreaElement>('input'),scheme=get<HTMLSelectElement>('scheme'),download=get<HTMLButtonElement>('export');
let result:Analysis|null=null;
const statusLabels={pass:'Geçti',review:'İncele',missing:'Eksik'};
function status(text:string,error=false){get('status').textContent=text;get('status').classList.toggle('error',error);}
function reset(){result=null;download.disabled=true;for(const id of ['pass','review','missing'])get(id).textContent='—';get('checks').replaceChildren(node('p','Sonuçlar için başlıkları incele.','empty'));get('result-note').textContent='Bu sonuçlar bir güvenlik puanı değildir.';}
function render(){
 if(!result)return;
 for(const state of ['pass','review','missing'] as const)get(state).textContent=String(result.checks.filter(c=>c.status===state).length);
 get('result-note').textContent=`${result.headerCount} başlık · ${result.statusCode===null?'durum kodu verilmedi':`HTTP ${result.statusCode}`} · ${result.notes.join(' ')}`;
 const list=get('checks');list.replaceChildren();
 result.checks.forEach((c,i)=>{
   const item=node('details',undefined,'check'),summary=node('summary');
   summary.append(node('span',String(i+1).padStart(2,'0'),'number'),node('span',c.title,'title'),node('span',statusLabels[c.status],`badge ${c.status}`),node('span','+','chevron'));
   const body=node('div',undefined,'detail');body.append(node('p',c.summary,'finding'),node('p',c.reason),node('p',c.action,'action'));
   const a=node('a','İlgili dokümanı oku ↗','doc-link');a.href=c.source;a.target='_blank';a.rel='noopener noreferrer';body.append(a);item.append(summary,body);if(i===0)item.open=true;list.append(item);
 });download.disabled=false;
}
function bytes(){get('bytes').textContent=new TextEncoder().encode(input.value).length.toLocaleString('tr-TR')+' B';}
function inspect(){reset();bytes();try{result=analyze(input.value,scheme.value as Scheme);render();status('İnceleme tamamlandı. Sonuçlar yalnızca bu yanıt bloğuna ait.');}catch(error){status(error instanceof InputError?error.message:'İnceleme tamamlanamadı. Girdiyi kontrol et.',true);}}
function custom(){get('before').setAttribute('aria-pressed','false');get('after').setAttribute('aria-pressed','false');get('mode').textContent='SENİN GİRDİN';reset();bytes();status('Girdi değişti. Sonuçları yenilemek için tekrar incele.');}
function sample(after:boolean){input.value=after?AFTER:BEFORE;scheme.value='https';get('before').setAttribute('aria-pressed',String(!after));get('after').setAttribute('aria-pressed',String(after));get('mode').textContent='SENTETİK YANIT';inspect();}
input.addEventListener('input',custom);scheme.addEventListener('change',custom);
get('analyze').addEventListener('click',inspect);get('before').addEventListener('click',()=>sample(false));get('after').addEventListener('click',()=>sample(true));
get('clear').addEventListener('click',()=>{input.value='';custom();status('Girdi ve sonuçlar temizlendi.');input.focus();});
download.addEventListener('click',()=>{if(!result)return;const url=URL.createObjectURL(new Blob([exportReport(result)],{type:'application/json;charset=utf-8'})),a=node('a');a.href=url;a.download='headerguard-report.json';document.body.append(a);a.click();a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),1000);});
window.addEventListener('pagehide',()=>{input.value='';reset();});window.addEventListener('pageshow',event=>{if(event.persisted)custom();});
sample(false);
