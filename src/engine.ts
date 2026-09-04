export const LIMITS={bytes:65536,headers:200,lineLength:8192} as const;
export type Scheme='https'|'http'|'unknown';
export type Status='pass'|'review'|'missing';
export type CheckId='hsts'|'nosniff'|'csp'|'framing'|'referrer'|'disclosure';
export type Check={id:CheckId;status:Status;title:string;summary:string;reason:string;action:string;source:string};
export type Analysis={schemaVersion:1;scheme:Scheme;statusCode:number|null;headerCount:number;inputBytes:number;notes:string[];checks:Check[]};
type Parsed={headers:Map<string,string[]>;statusCode:number|null;headerCount:number;bytes:number};
export class InputError extends Error{constructor(message:string){super(message);this.name='InputError';}}
const docs='https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/';
export const META:Record<CheckId,{title:string;reason:string;action:string;source:string}>={
 hsts:{title:'HTTPS zorunluluğu',reason:'HSTS, tarayıcıya sonraki bağlantıları HTTPS ile açmasını söyler. HTTP yanıtındaki HSTS dikkate alınmaz.',action:'Önce HTTPS kullanımını doğrula. HTTPS yanıtında pozitif max-age belirle; includeSubDomains ve preload için tüm alan adlarının hazır olduğundan emin ol.',source:docs+'Strict-Transport-Security'},
 nosniff:{title:'İçerik türü denetimi',reason:'nosniff, MIME türünü tahmin ederek yorumlamayı sınırlar. Doğru Content-Type göndermenin yerini tutmaz.',action:'Yanıta tek bir X-Content-Type-Options: nosniff başlığı ekle ve dosyaların doğru Content-Type ile sunulduğunu doğrula.',source:docs+'X-Content-Type-Options'},
 csp:{title:'İçerik güvenlik politikası',reason:'CSP kaynakları kısıtlayabilir. Report-Only yalnızca raporlar; birden fazla politika birlikte uygulanır. Bu araç tam CSP doğrulayıcısı değildir.',action:'Uygulamanın ihtiyaçlarına göre CSP tasarla. Önce Report-Only ile etkisini gözlemle, sonra zorunlu politikaya geç. Script kaynakları, object-src ve base-uri kurallarını incele.',source:docs+'Content-Security-Policy'},
 framing:{title:'Sayfanın çerçeveye alınması',reason:'CSP frame-ancestors, sayfayı hangi üst sayfaların gömebileceğini belirler. default-src bu yönergenin yerine geçmez. Uygulanan frame-ancestors modern tarayıcılarda X-Frame-Options yerine değerlendirilir.',action:'Gömülme gerekmiyorsa frame-ancestors \'none\'; yalnızca aynı kaynaktan gerekiyorsa \'self\' kullanmayı değerlendir. X-Frame-Options için DENY veya SAMEORIGIN seçeneklerini incele.',source:docs+'Content-Security-Policy/frame-ancestors'},
 referrer:{title:'Yönlendiren adresin paylaşımı',reason:'Referrer-Policy, sonraki isteklere gönderilen adres bilgisini sınırlar. Virgüllü listede desteklenen son politika kullanılır. Başlık yokluğu, tarayıcıda hiç varsayılan koruma olmadığı anlamına gelmez.',action:'İhtiyaca göre no-referrer, same-origin, strict-origin veya strict-origin-when-cross-origin değerlerinden birini açıkça belirle.',source:docs+'Referrer-Policy'},
 disclosure:{title:'Teknoloji bilgisinin ifşası',reason:'Server ve X-Powered-By başlıkları teknoloji hakkında ipucu verebilir. Bu başlıkların varlığı tek başına bir güvenlik açığı değildir.',action:'Gereksiz ürün/sürüm bilgisini kaldırmayı değerlendir. Bunu güncelleme, erişim kontrolü veya diğer güvenlik önlemlerinin yerine koyma.',source:'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html'},
};
function check(id:CheckId,status:Status,summary:string):Check{return {id,status,summary,...META[id]};}
export function parseHeaders(input:string):Parsed{
 const bytes=new TextEncoder().encode(input).length;
 if(bytes>LIMITS.bytes)throw new InputError('Girdi 64 KiB sınırını aşıyor. Tek bir yanıt bloğu kullan.');
 if(!input.trim())throw new InputError('Önce HTTP yanıt başlıklarını yapıştır.');
 const lines=input.replace(/^\ufeff/,'').split(/\r\n|\n/);
 let started=false,ended=false,statusCode:number|null=null,headerCount=0;
 const headers=new Map<string,string[]>();
 for(let i=0;i<lines.length;i++){
   const line=lines[i]!;
   if(line.length>LIMITS.lineLength)throw new InputError('Bir satır 8.192 karakter sınırını aşıyor.');
   if(/[\x00-\x08\x0b-\x1f\x7f]/.test(line))throw new InputError('Kontrol karakteri veya desteklenmeyen satır sonu bulundu.');
   if(line===''){if(started)ended=true;continue;}
   if(ended)throw new InputError('Birden fazla yanıt veya gövde bulundu. Yalnızca tek yanıtın başlıklarını yapıştır.');
   const status=/^HTTP\/(?:1\.[01]|2(?:\.0)?|3(?:\.0)?) ([1-5][0-9]{2})(?:[ \t].*)?$/.exec(line);
   if(status){if(started)throw new InputError('Birden fazla HTTP durum satırı bulundu. Tek yanıt seç.');statusCode=Number(status[1]);started=true;continue;}
   if(/^[ \t]/.test(line))throw new InputError('Katlanmış veya girintili başlık desteklenmiyor. Her başlığı ayrı satıra yaz.');
   const field=/^([!#$%&'*+.^_`|~0-9A-Za-z-]+):[ \t]*(.*)$/.exec(line);
   if(!field)throw new InputError('Geçersiz başlık satırı. Biçim “Başlık-Adı: değer” olmalı.');
   started=true;headerCount++;
   if(headerCount>LIMITS.headers)throw new InputError('Bir yanıtta en fazla 200 başlık destekleniyor.');
   const name=field[1]!.toLowerCase(),value=field[2]!.trim();headers.set(name,[...(headers.get(name)??[]),value]);
 }
 if(!headerCount)throw new InputError('Durum satırı var ancak analiz edilecek başlık yok.');
 return {headers,statusCode,headerCount,bytes};
}
type Csp={present:boolean;ambiguous:boolean;directives:Map<string,string[]>};
function parseCsp(values:string[]):Csp{
 const out:Csp={present:values.length>0,ambiguous:false,directives:new Map()};
 if(values.length!==1){out.ambiguous=values.length>1;return out;}
 const policy=values[0]!;
 if(!policy||policy.includes(',')){out.ambiguous=true;return out;}
 for(const part of policy.split(';')){
   if(!part.trim())continue;
   const [rawName,...tokens]=part.trim().split(/[ \t]+/);const name=rawName!.toLowerCase();
   if(!/^[a-z][a-z0-9-]*$/.test(name)){out.ambiguous=true;continue;}
   if(out.directives.has(name)){out.ambiguous=true;continue;}
   out.directives.set(name,tokens);
 }
 if(!out.directives.size)out.ambiguous=true;
 return out;
}
const localSources=(tokens:string[]|undefined)=>!!tokens&&tokens.length===1&&(tokens[0]==="'none'"||tokens[0]==="'self'");
function hsts(values:string[],scheme:Scheme):Check{
 if(scheme==='unknown')return check('hsts','review','Bağlantı türü bilinmiyor; HSTS etkisi değerlendirilemedi.');
 if(scheme==='http')return check('hsts','review','HTTP seçildi. Bu yanıtta HSTS bulunsa bile tarayıcı uygulamaz.');
 if(!values.length)return check('hsts','missing','HTTPS yanıtında HSTS başlığı yok.');
 if(values.length!==1)return check('hsts','review','HSTS başlığı tekrarlanmış. Tek ve açık bir politika gönder.');
 const raw=values[0]!;if(!raw)return check('hsts','review','HSTS değeri boş.');
 const parts=raw.split(';').map(p=>p.trim()).filter(Boolean),seen=new Set<string>();let age:number|undefined;
 for(const part of parts){
   const m=/^([A-Za-z0-9-]+)(?:\s*=\s*(.*))?$/.exec(part);
   if(!m)return check('hsts','review','HSTS yönerge biçimi desteklenmiyor.');
   const name=m[1]!.toLowerCase();if(seen.has(name))return check('hsts','review','HSTS içinde yinelenen yönerge var.');seen.add(name);
   if(name==='max-age'){
     const n=/^(?:[0-9]+|"[0-9]+")$/.test(m[2]??'')?Number(m[2]!.replaceAll('"','')):NaN;
     if(!Number.isSafeInteger(n))return check('hsts','review','max-age geçerli ve desteklenen bir tam sayı değil.');age=n;
   }else if(name==='includesubdomains'||name==='preload'){
     if(m[2]!==undefined)return check('hsts','review','HSTS bayrağı beklenmeyen bir değer içeriyor.');
   }else return check('hsts','review','HSTS içinde bu sınırlı analizcinin tanımadığı yönerge var.');
 }
 if(age===undefined)return check('hsts','review','HSTS var ancak geçerli max-age yok.');
 if(age===0)return check('hsts','review','max-age=0 bu alan adının HSTS kaydını kaldırır; korumayı etkinleştirmez.');
 return check('hsts','pass','HTTPS ve pozitif max-age kontrolü geçti. Sürenin ihtiyaca uygunluğu ayrıca değerlendirilmeli.');
}
function cspCheck(csp:Csp,reportOnly:boolean):Check{
 if(!csp.present)return check('csp','missing',reportOnly?'Yalnızca Report-Only bulundu; zorunlu CSP yok.':'Zorunlu Content-Security-Policy başlığı yok.');
 if(csp.ambiguous)return check('csp','review','Boş, tekrarlı veya birden fazla CSP var; birleşik etki bu sürümde hesaplanmıyor.');
 const d=csp.directives,script=d.get('script-src')??d.get('default-src');
 if(!localSources(script))return check('csp','review','Script kaynakları basit self/none kontrolünü geçmiyor. Nonce/hash veya özel politikalar elle incelenmeli.');
 for(const name of ['script-src-elem','script-src-attr'])if(d.has(name)&&!localSources(d.get(name)))return check('csp','review','Ek script yönergesi ayrı inceleme gerektiriyor.');
 if(d.get('object-src')?.join(' ')!=="'none'"||!localSources(d.get('base-uri')))return check('csp','review','Bu temel profilde object-src none ve sınırlı base-uri bekleniyor.');
 return check('csp','pass','Script, object-src ve base-uri için sınırlı profil kontrolü geçti. Tam CSP doğrulaması yapılmadı.');
}
function framing(csp:Csp,xfo:string[]):Check{
 if(csp.present&&csp.ambiguous)return check('framing','review','CSP belirsiz; çerçeve politikasının birleşik etkisini elle incele.');
 const ancestors=csp.directives.get('frame-ancestors');
 if(ancestors!==undefined)return localSources(ancestors)?check('framing','pass','Uygulanan CSP içinde tek self/none frame-ancestors bulundu.'):check('framing','review','frame-ancestors özel, geniş veya desteklenmeyen bir kaynak listesi içeriyor; X-Frame-Options buna üstün sayılmaz.');
 if(!xfo.length)return check('framing','missing','Ne frame-ancestors ne de X-Frame-Options bulundu.');
 if(xfo.length!==1)return check('framing','review','X-Frame-Options tekrarlı; davranışı açık hâle getir.');
 return /^(?:DENY|SAMEORIGIN)$/i.test(xfo[0]!)?check('framing','pass','Tek bir geçerli DENY/SAMEORIGIN çerçeve politikası bulundu.'):check('framing','review','X-Frame-Options değeri geçerli DENY/SAMEORIGIN değil. ALLOW-FROM güncel bir çözüm değildir.');
}
function referrer(values:string[]):Check{
 if(!values.length)return check('referrer','missing','Açık Referrer-Policy yok; tarayıcı varsayılanı ayrıca geçerli olabilir.');
 const known=new Set(['no-referrer','no-referrer-when-downgrade','origin','origin-when-cross-origin','same-origin','strict-origin','strict-origin-when-cross-origin','unsafe-url']);
 const tokens=values.flatMap(v=>v.split(',').map(t=>t.trim()));
 const recognized=tokens.filter(t=>known.has(t));const effective=recognized.at(-1);
 if(!effective)return check('referrer','review','Desteklenen bir Referrer-Policy değeri bulunamadı.');
 if(!['no-referrer','same-origin','strict-origin','strict-origin-when-cross-origin'].includes(effective))return check('referrer','review','Desteklenen son politika bu aracın kısıtlı paylaşım profilini geçmiyor.');
 return check('referrer','pass','Desteklenen son politika, kısıtlı adres paylaşımı profilini geçti.');
}
export function analyze(input:string,scheme:Scheme):Analysis{
 if(!['https','http','unknown'].includes(scheme))throw new InputError('Bağlantı türü HTTPS, HTTP veya bilinmiyor olmalı.');
 const p=parseHeaders(input),get=(name:string)=>p.headers.get(name)??[];
 const csp=parseCsp(get('content-security-policy'));const sniff=get('x-content-type-options');
 const checks=[hsts(get('strict-transport-security'),scheme),!sniff.length?check('nosniff','missing','X-Content-Type-Options başlığı yok.'):sniff.length===1&&/^nosniff$/i.test(sniff[0]!)?check('nosniff','pass','Tek nosniff değeri bulundu.'):check('nosniff','review','Başlık boş, tekrarlı veya nosniff dışında bir değer içeriyor.'),cspCheck(csp,get('content-security-policy-report-only').length>0),framing(csp,get('x-frame-options')),referrer(get('referrer-policy')),get('server').length||get('x-powered-by').length?check('disclosure','review','Server veya X-Powered-By başlığı var. Bu bilgi amaçlı bir incelemedir.'):check('disclosure','pass','Server ve X-Powered-By başlıkları bulunmadı. Diğer izler incelenmedi.')];
 const notes=['Bu analiz HTML sayfası yanıtı içindir; uygulamanın güvenli olduğunu kanıtlamaz.'];
 const contentType=get('content-type');
 if(contentType.length!==1||!/^text\/html(?:\s*;|$)/i.test(contentType[0]!))notes.push('Tek bir text/html Content-Type doğrulanamadı. HTML dışı yanıtlarda bazı kontroller uygun olmayabilir.');
 if(p.statusCode!==null&&(p.statusCode<200||p.statusCode>=300))notes.push('Yanıt başarılı 2xx aralığında değil. Yönlendirme veya hata yanıtı, hedef sayfanın başlıklarını temsil etmeyebilir.');
 return {schemaVersion:1,scheme,statusCode:p.statusCode,headerCount:p.headerCount,inputBytes:p.bytes,notes,checks};
}
export function exportReport(result:Analysis):string{
 // Static descriptions are reconstructed; no arbitrary header names/values escape.
 return JSON.stringify({tool:'HeaderGuard',schemaVersion:1,scheme:result.scheme,statusCode:result.statusCode,headerCount:result.headerCount,inputBytes:result.inputBytes,scope:'Limited HTML response header review; not a security certificate.',checks:result.checks.map(c=>({id:c.id,status:c.status,title:META[c.id].title,summary:c.summary,reason:META[c.id].reason,action:META[c.id].action,source:META[c.id].source}))},null,2)+'\n';
}
