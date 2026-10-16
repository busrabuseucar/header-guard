# HeaderGuard

HTML sayfalarının HTTP yanıt başlıklarını **yerel olarak** inceleyen TypeScript projesi. Bir web demosu ve aynı motoru kullanan Node.js CLI içerir. Altı temel kontrolün sonucunu, gerekçesini ve ilgili dokümanı gösterir.

**Geliştiren:** Büşra Buse Uçar

**Herkese açık demo:** [HeaderGuard'ı aç](https://header-guard-buse.sleek-brush-8818.chatgpt.site)  
**Kaynak kod:** [busrabuseucar/header-guard](https://github.com/busrabuseucar/header-guard) · **CI:** [GitHub Actions](https://github.com/busrabuseucar/header-guard/actions/workflows/ci.yml)

## Kurulum

Node.js 24+ gerekir. Depoyu klonla:

```bash
git clone https://github.com/busrabuseucar/header-guard.git
cd header-guard
npm ci
npm run check
npm run build
npm test
npm run source
node scripts/check-assets.mjs
npm start
```

Yerel demo: `http://127.0.0.1:8080`. Kaynak ZIP üretimi ve yerel HTTP sunucusu Python 3 kullanır. Uygulama çalışma zamanında üçüncü taraf JavaScript bağımlılığı veya API anahtarı istemez.

## Bir dakikalık demo

1. **Önce** örneği: 5 “İncele”, 1 “Eksik”. HSTS başlığı olmasına rağmen `max-age=0` kontrolü geçmez. CSP yalnızca Report-Only olduğu için zorunlu politika eksik sayılır.
2. **Sonra** örneği: altı sınırlı kontrol de geçer. Bu, sayfanın güvenli olduğuna dair bir sertifika değildir.
3. Aynı örnekte bağlantıyı **HTTP** yap ve yeniden incele: HSTS artık kontrolü geçmez.
4. **JSON indir**: kontrol sonuçları ve sabit açıklamalar raporlanır. Ham çerez, başlık değerleri, özel başlık adları ve yanıttaki adresler rapora taşınmaz.

Örnekler kurmacadır; çerez değeri geçerli oturum bilgisi değildir. Çerez politikaları kontrol kapsamına dahil değildir; örnek çerez, rapora ham veri taşınmadığını göstermek için her iki örnekte de aynıdır.

## Kendi başlıklarını al

Kendi sitenin HTML sayfasında, URL'yi değiştirerek:

```bash
curl -sS -D - -o /dev/null https://example.com
```

Bu komut GET yanıtının başlıklarını gösterir, gövdeyi kaydetmez ve yönlendirmeyi otomatik takip etmez. Çıktıyı araca yapıştır. Tarayıcının Network bölümündeki sayfa isteğinin ham **Response Headers** görünümü de kullanılabilir. Birden fazla yanıt bloğu varsa yalnızca incelemek istediğin tek bloğu seç. HTTP/2 veya HTTP/3 durum satırından HTTPS varsayımı yapılmaz; bağlantı türünü sen belirtirsin.

HeaderGuard **URL'ye istek göndermez**. CORS engelini aşan bir proxy veya uzaktan site tarayıcısı değildir. Sayfanın statik dosyaları normal ağ istekleriyle yüklenir; analiz girdisi gönderilmez.

## Kontroller ve kapsam

| Kontrol | “Geçti” ne demek? | Sınır |
| --- | --- | --- |
| HSTS | HTTPS bağlamında tek, desteklenen politika ve pozitif `max-age` | Sürenin operasyonel yeterliliği, önceki HSTS kayıtları, preload kaydı, ana alan adı ve TLS doğrulanmaz. |
| X-Content-Type-Options | Tek `nosniff` değeri | Yanıt gövdesinin gerçek türü incelenmez. |
| CSP | Etkin script kaynağı yalnızca self/none; object-src none; base-uri self/none; ek script yönergeleri aynı basit profilde | Tam CSP sözdizimi veya XSS doğrulaması değil. Nonce/hash, karmaşık kaynaklar ve çoklu politikalar elle incelenir. |
| Çerçeve politikası | Uygulanan CSP'de tek self/none frame-ancestors; bu yönerge yoksa tek geçerli X-Frame-Options | Özel kaynak listeleri ve çoklu CSP birleşimi hesaplanmaz. default-src, frame-ancestors yerine geçmez. |
| Referrer-Policy | Son tanınan politika no-referrer, same-origin, strict-origin veya strict-origin-when-cross-origin | Tarayıcı sürümü ve HTML/istek düzeyindeki ek ayarlar modellenmez. |
| Teknoloji ifşası | Server ve X-Powered-By yok | Diğer parmak izleri incelenmez; varlıkları tek başına açık değildir. |

**“İncele”**, bir açık bulunduğu anlamına gelmez. Geniş politika, desteklenmeyen yapı, tekrar veya eksik bağlam nedeniyle insan değerlendirmesi gerekir. **“Eksik”**, yalnızca bu yanıtta beklenen açık başlığın bulunmadığını belirtir; tarayıcı varsayılanlarını veya önceki kayıtlarını yok saymaz.

CSP'de script-src yoksa default-src kullanılır. script-src-elem ve script-src-attr ayrıca incelenir. Çoklu CSP başlıkları, virgülle birleştirilmiş politikalar ve tekrarlı yönergeler sessizce tek bir değere indirgenmez; “İncele” olur. Report-Only politikası uygulanmış koruma sayılmaz. Frame-ancestors mevcutsa X-Frame-Options bunu geçersiz kılıyor gibi gösterilmez.

Cookie/SameSite, CORS, Permissions-Policy, COOP/COEP, sertifika zinciri, TLS sürümü, yönlendirme zinciri, HTML meta etiketleri ve uygulama açıkları kapsam dışıdır. HTML dışı veya 2xx olmayan yanıtlarda bağlam notu gösterilir.

## Girdi ve gizlilik

- Tek HTTP yanıtı; isteğe bağlı HTTP/1.0, HTTP/1.1, HTTP/2 veya HTTP/3 durum satırı. Başlık adları büyük/küçük harfe duyarsızdır; tekrarlanan alanlar sırayla korunur.
- En fazla **64 KiB UTF-8**, **200 başlık**, satır başına **8.192 UTF-16 kod birimi**. CRLF ve LF desteklenir. Kontrol karakterleri, katlanmış/girintili satırlar, gövde ve ikinci yanıt reddedilir.
- Ham girdi, kullanıcının metin alanında görünür ve yerel analiz sırasında bellektedir. Analiz sonuçları hiçbir ham başlık değeri içermez. JSON yalnızca açık alan listesiyle üretilir; satır sayısı yerine başlık sayısı, girdi boyutu, bağlantı türü ve durum kodu metaverileri kalır.
- Uygulamada kalıcı kayıt, analitik veya tarama geçmişi yoktur. Temizle, girdiyi ve sonuçları boşaltır; JavaScript belleği için kriptografik silme garantisi verilmez.
- Raporu paylaşmadan önce genel metaverilerin de paylaşmaya uygun olduğunu kontrol et. Doküman bağlantıları sabittir; girdiden bağlantı üretilmez.

## CLI

```bash
node cli.mjs --demo
node cli.mjs --demo-fixed
node cli.mjs --scheme https response-headers.txt
node cli.mjs --scheme https response-headers.txt > report.json
```

Bağlantı belirtilmezse `unknown` kullanılır; HSTS kontrolü incelemeye düşer. CLI yalnızca UTF-8 normal dosya okur; klasör ve sembolik bağlantıları reddeder. Dosyayı değiştirmez, ağ isteği yapmaz. Dosya yolu ve ham içerik hatalara eklenmez.

| Çıkış | Anlam |
| --- | --- |
| 0 | Altı sınırlı kontrol geçti. |
| 1 | En az bir “İncele” veya “Eksik” sonucu var. |
| 2 | Girdi veya dosya okuma hatası; stdout boş. |

Bu kodları doğrudan “site güvenli/güvensiz” kararı olarak kullanma; özellikle teknoloji ifşası bilgi amaçlıdır.

## Yapı ve doğrulama

- `src/engine.ts`: sınırlandırılmış HTTP ayrıştırma, altı kontrol ve JSON raporu.
- `src/app.ts`: yerel girdi, sonuçlar, örnekler; DOM'a metinler `textContent` ile eklenir.
- `src/samples.ts`: sentetik önce/sonra örnekleri.
- `cli.mjs`: aynı motorun dosya tabanlı kullanımı.
- `tests/`: kuralların sınırları, rapor gizliliği ve gerçek CLI testleri.
- `.github/workflows/ci.yml`: kurulum, tür kontrolü, derleme, test ve kaynak/bağlantı denetimi.

Yerel doğrulamada **29 test geçti**: 23 analiz motoru ve 6 gerçek CLI testi. CI; kurulum, tür kontrolü, derleme, testler ve kaynak paketi denetimini çalıştıracak şekilde yapılandırılmıştır. [GitHub'daki çalışma sonuçlarını incele](https://github.com/busrabuseucar/header-guard/actions/workflows/ci.yml). Tarayıcı görsel/uçtan uca testi bu doğrulamalara dahil değildir. Kaynak `.openai/hosting.json` içindeki proje kimliği indirilen ZIP'ten çıkarılır.

## Öğrenme ve CV

[Öğrenme alıştırması](docs/LEARNING.md) · [CV taslağı](docs/CV.md)

## Teknik dayanaklar

- [MDN: HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)
- [W3C: CSP3 ve frame-ancestors / X-Frame-Options ilişkisi](https://www.w3.org/TR/CSP3/#frame-ancestors-and-frame-options)
- [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [OWASP: HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

MIT lisansı. Tam bir güvenlik tarayıcısı yerine, sınırları açık bir öğrenme ve ön inceleme aracı olarak tasarlanmıştır.
