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
python3 -m unittest discover -s tests -p 'test_*.py'
npm run source
node scripts/check-assets.mjs
npm start
```

Yerel demo: `http://127.0.0.1:8080`. Kaynak ZIP üretimi ve yerel HTTP sunucusu Python 3.10+ kullanır. Göreli kaynak yolları alt dizinde yayını da destekler. Uygulama çalışma zamanında üçüncü taraf JavaScript bağımlılığı veya API anahtarı istemez.

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

- Tek HTTP yanıtı; isteğe bağlı HTTP/1.0, HTTP/1.1, HTTP/2 veya HTTP/3 durum satırı. Değerlerin kenarlarında yalnızca HTTP boşluğu (SP/HTAB) temizlenir; Unicode boşluklar sessizce geçerli politikaya dönüştürülmez. Başlık adları büyük/küçük harfe duyarsızdır; tekrarlanan alanlar sırayla korunur.
- En fazla **64 KiB UTF-8**, **200 başlık**, satır başına **8.192 UTF-16 kod birimi**. CRLF ve LF desteklenir. Kontrol karakterleri, katlanmış/girintili satırlar, gövde ve ikinci yanıt reddedilir.
- Ham girdi, kullanıcının metin alanında görünür ve yerel analiz sırasında bellektedir. Analiz sonuçları hiçbir ham başlık değeri içermez. JSON yalnızca açık alan listesiyle üretilir; HTML dışı veya 2xx olmayan yanıtlara ait sabit bağlam uyarıları da korunur; satır sayısı yerine başlık sayısı, girdi boyutu, bağlantı türü ve durum kodu metaverileri kalır.
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

**31 Node testi** (25 motor, 6 gerçek CLI), **1 Python paketleme testi** ve **6 Chromium senaryosu** (3 akış × masaüstü/Pixel 7 emülasyonu) bulunur. Tarayıcı testleri önce/sonra örneklerini, HTTPS/HTTP değişikliğini, rapor indirmeyi, bağlam uyarılarını, ham değerlerin rapora taşınmamasını, ağ/depolama kullanımını, temizlemeyi ve bozuk girdiden kurtarmayı kontrol eder. Fiziksel cihaz, canlı sunucu başlıkları veya gerçek saldırı dayanıklılığı doğrulaması değildir.

Geliştirme bağımlılıkları TypeScript 5.9.3 ve Playwright 1.58.2 olarak sabittir. Tarayıcı kontrollerini çalıştırmak için:

```bash
npx playwright install chromium
npm run test:browser
```

CI tür kontrolü, derleme, Node/Python testleri, kaynak paketi, bağlantı denetimi ve Chromium senaryolarını çalıştırır. Hatalı tarayıcı koşularının izleri saklanır; yalnızca sentetik girdiler kullanılır.

Kaynak ZIP açık dosya/dizin/uzantı listesiyle oluşturulur. Ortam dosyaları, özel JSON/veritabanları, sembolik bağlantılar, bağımlılıklar ve test çıktıları dışarıda kalır. Yayın kimliği yerine yalnızca `dist` dizinini belirten manifest eklenir. Bu paketleyici, izin verilen kaynak dosyalarına yazılmış sırları tespit eden bir tarayıcı değildir.

## Teknik dayanaklar

- [RFC 9110: HTTP alan değerleri ve SP/HTAB boşluğu](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.3)

- [MDN: HSTS](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Strict-Transport-Security)
- [MDN: X-Content-Type-Options](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/X-Content-Type-Options)
- [W3C: CSP3 ve frame-ancestors / X-Frame-Options ilişkisi](https://www.w3.org/TR/CSP3/#frame-ancestors-and-frame-options)
- [MDN: Referrer-Policy](https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Headers/Referrer-Policy)
- [OWASP: HTTP Headers Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html)

MIT lisansı. Tam bir güvenlik tarayıcısı yerine, sınırları açık bir öğrenme ve ön inceleme aracı olarak tasarlanmıştır.
