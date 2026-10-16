# HeaderGuard öğrenme alıştırması

## Önce davranışı gör — 10 dakika

1. Önce örneğini incele: 5 “İncele”, 1 “Eksik”. HSTS'nin neden geçmediğini ve CSP'nin neden eksik sayıldığını açıkla.
2. Sonra örneğine geç: altı kontrol geçer. Aynı girdiyi HTTP bağlamında inceleyince neden HSTS sonucunun değiştiğini anlat.
3. `Referrer-Policy: unsafe-url, no-referrer` ile `Referrer-Policy: no-referrer, unsafe-url` satırlarını karşılaştır. Sıralama sonucu değiştirir.
4. Çerez satırına `SADECE_EGITIM_ICIN_123` yaz; raporu indir. Bu değerin raporda bulunmadığını kontrol et. Gerçek oturum bilgisi kullanma.

## Motoru takip et — 15 dakika

`parseHeaders`, bir yanıtı parçalara ayırır ve tekrarları korur. `analyze`, altı kurala aynı veriyi verir. `exportReport`, ham başlıkları dışarı taşımadan sonuçları üretir. CLI ve tarayıcı aynı `engine.ts` dosyasından derlenen kodu kullanır.

Neden tekrarlanan başlıkların sonuncusunu her durumda almak doğru değil? Neden Report-Only uygulanan CSP gibi sayılmıyor? CSP frame-ancestors varken X-Frame-Options DENY neden her zaman daha katı sonuç anlamına gelmiyor?

## Kendi politikanı ekle — 20 dakika

Mevcut HSTS kontrolü yalnızca pozitif `max-age` arar. `max-age=1` bu nedenle geçer. Bu, protokol biçimi ile bir kurumun güvenlik beklentisinin aynı şey olmadığını gösterir.

1. `git switch -c exercise/hsts-duration` ile yeni dal aç.
2. Bu alıştırmaya özel beklentiyi tanımla: **bir günden kısa süreler “İncele” olsun**. Bu eşik HTTP standardının zorunlu koşulu değildir; bu projenin örnek politika tercihidir.
3. `max-age=86399` için “İncele”, `max-age=86400` için “Geçti” bekleyen testler ekle.
4. `npm run build && npm test` çalıştır. Yeni beklentinin mevcut motorla neden uyuşmadığını gör.
5. `hsts` fonksiyonuna süre kontrolünü ekle. Mevcut `max-age=1` testini yeni politika beklentisine göre güncelle; sıfır, HTTP bağlamı ve tekrarlı yönerge testlerini koru.
6. README'de değişikliğin standart gerekliliği değil, örnek kurum politikası olduğunu yaz. Gerekçeli bir commit oluştur.

Alıştırma ana dalda uygulanmadı. Üretim ortamının HSTS süresini bu eğitim eşiğini kopyalayarak belirleme; alan adı, alt alan adları ve geri dönüş planına göre değerlendir.

## Mülakatta anlat

- “Başlık mevcut” ile “politika sınırlı kontrolü geçti” arasındaki fark.
- Gizli veri içerebilen ham yanıttan rapora hangi alanların taşındığı.
- Çoklu CSP ve tarayıcı varsayılanları gibi hangi konuları bilerek manuel incelemeye bıraktığın.
- Eklediğin süre testinin hangi davranışı koruduğu.

Kendi katkını, değiştirdiğin test ve kurallarla somutlaştır.
