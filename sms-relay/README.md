# SMS aktarıcısı (Verimor sabit IP gereksinimi)

## Neden var

Verimor, BTK'nın 34374171-000-E.18622 sayılı kararı gereği API isteklerinin
**sabit bir IP adresinden** gelmesini zorunlu tutuyor; IP tanımlanmazsa
`401 Hesabınızda izinli IP ayarları yapılmamış` hatası dönüyor.

Site Vercel'de çalışıyor ve Vercel sabit giden IP vermiyor — "Static IPs"
eklentisi proje başına 100 USD/ay. Verimor'a bu durum sorulduğunda cevap net
oldu: muafiyet yok, sabit çıkış IP'si sağlayan bir çözüm ya da proxy şart.

Bu aktarıcı o sabit IP'yi sağlar. Oracle Cloud'un **Always Free** katmanında
çalıştığı için ek maliyeti yoktur.

```
Vercel (Next.js)                     Oracle Cloud (sabit IP)         Verimor
  sendSms()  ──TLS + Bearer token──►  Caddy :443 ──► relay :8080 ──►  API
```

## Tasarım kararları

**Aktarıcı bilerek "aptal".** Mesaj metni, malik/kiracı demirbaş görünürlük
kuralı ve `sms_log` kaydı Next.js tarafında (`src/lib/sms/`) kalır. Buraya
yalnızca "şu numaraya şu metni gönder" gelir. İş kuralının iki yere dağılıp
zamanla birbirinden sapmasını önlemek için.

**Verimor şifresi Vercel'de durmaz,** yalnızca bu makinede durur. Vercel'in
elindeki `SMS_RELAY_TOKEN` sızsa bile Verimor hesabına doğrudan erişilemez.

**Hız sınırı var** (varsayılan 100/dakika, 300/gün). Token sızsa bile 500'lük
SMS paketi boşaltılamaz. Aylık gerçek gönderim ~72 daire olduğu için bu
tavanlar fazlasıyla geniş.

**Yalnızca Türkiye cep numaraları** kabul edilir (`905XXXXXXXXX`). Yurt dışı
gönderim kat kat pahalı; token sızsa bile dışarıya SMS çıkmaz.

**TLS zorunlu.** İstekte hem token hem sakinlerin telefon numarası ve mesaj
metni geçiyor. Aktarıcı yalnızca `127.0.0.1`'i dinler; dışa açılan tek kapı
Caddy'dir ve sertifikayı kendisi alıp yeniler.

---

## Kurulum

### 1. Oracle Cloud'da makine

Always Free katmanında **VM.Standard.E2.1.Micro** (AMD, 1 GB) yeterlidir —
ARM A1 shape'lerinde sık sık kapasite bulunamıyor. İmaj olarak
**Ubuntu 24.04** seçin (Caddy ve Node paketleri en az uğraşla kuruluyor).

> **Önemli:** Makine oluşturulurken verilen public IP **ephemeral**'dır ve
> makine sonlandırılırsa kaybolur — Verimor'a kaydettiğiniz IP geçersizleşir.
> Bunu kalıcıya çevirin:
> *Instance > Attached VNICs > (VNIC) > IPv4 Addresses > Edit > No public IP →
> Reserved public IP > Create new*
>
> Rezerve IP, makineyi silip yeniden kurarsanız yeni makineye tekrar
> bağlanabilir; Verimor'daki kaydı bir daha değiştirmeniz gerekmez.

### 2. Güvenlik duvarı — iki katman

Oracle'da **iki** duvar var; sadece birini açmak en sık yapılan hata.

**a) VCN Security List** (Oracle konsolu): *Networking > VCN > Security Lists >
Default Security List > Add Ingress Rules*

| Source | Protocol | Port | Niçin |
| --- | --- | --- | --- |
| 0.0.0.0/0 | TCP | 443 | Vercel'den gelen istekler |
| 0.0.0.0/0 | TCP | 80 | Let's Encrypt doğrulaması (yoksa sertifika alınamaz) |

**b) Makinenin kendi iptables kuralları** (OCI imajları 22 dışındaki her şeyi
düşürür):

```bash
sudo iptables -I INPUT 1 -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 1 -p tcp --dport 80 -j ACCEPT
sudo netfilter-persistent save
```

### 3. DNS

Alan adı sağlayıcınızda bir A kaydı ekleyin:

```
sms.bizimkentb205.com.   A   <makinenin rezerve IP'si>
```

`bizimkentb205.com`'un nameserver'ları Vercel'de değil (Vercel `Third Party`
gösteriyor), bu yüzden kaydı alan adını aldığınız yerden eklemelisiniz.
Caddy'yi çalıştırmadan önce yayılmasını bekleyin: `dig +short sms.bizimkentb205.com`

### 4. Node, Caddy ve aktarıcı

```bash
sudo apt update && sudo apt install -y nodejs debian-keyring debian-archive-keyring apt-transport-https curl
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | sudo gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | sudo tee /etc/apt/sources.list.d/caddy-stable.list
sudo apt update && sudo apt install -y caddy
node --version   # 18 veya üstü olmalı (global fetch gerekiyor)
```

Bu klasördeki dosyaları makineye kopyalayın:

```bash
sudo mkdir -p /opt/sms-relay
sudo cp server.js /opt/sms-relay/
sudo cp sms-relay.service /etc/systemd/system/
sudo cp Caddyfile /etc/caddy/Caddyfile
```

### 5. Şifreler

Önce aktarıcı token'ı üretin — bu değeri hem makinede hem Vercel'de aynı
girmeniz gerekecek, başka kimseyle paylaşmayın:

```bash
openssl rand -hex 32
```

Sonra `/etc/sms-relay.env` dosyasını oluşturun:

```bash
sudo install -m 600 /dev/null /etc/sms-relay.env
sudo nano /etc/sms-relay.env
```

```
RELAY_TOKEN=<yukarıda ürettiğiniz değer>
VERIMOR_USERNAME=<12 haneli telefon numaranız, örn. 905xxxxxxxxx>
VERIMOR_PASSWORD=<OİM'de belirlediğiniz API şifresi>
VERIMOR_SOURCE_ADDR=Bizimkent
```

Dosya `root`'a ait ve `0600` olmalı (yukarıdaki `install` komutu bunu yapıyor).
systemd bu dosyayı yetki düşürmeden önce okur, aktarıcı süreci onu okuyamaz.

### 6. Başlat

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now sms-relay caddy
sudo systemctl status sms-relay --no-pager
curl -s https://sms.bizimkentb205.com/health   # "ok" dönmeli
```

### 7. Verimor paneli

[SMS Ayarlarım](https://oim.verimor.com.tr/sms_settings/edit):

| Alan | Değer |
| --- | --- |
| Api Erişimi | AÇIK |
| API Şifresi | `/etc/sms-relay.env`'e yazdığınız şifre |
| Api İzinli IP'ler | Makinenin **rezerve** IP'si |
| Api Yetkili İsmi / E-Posta / Telefon | Kendi bilgileriniz |

### 8. Vercel ve yerel ortam

```bash
npx vercel env add SMS_RELAY_URL production     # https://sms.bizimkentb205.com/send
npx vercel env add SMS_RELAY_TOKEN production   # 5. adımdaki token
```

Aynı iki satırı `.env.local`'e de ekleyin; test scripti oradan okuyor.

### 9. Test

```bash
npm run sms:test -- B2.05B-35
```

---

## Oracle Always Free: boşta kalan makineler durdurulur

Oracle, Always Free makineleri 7 gün boyunca **CPU kullanımı %20'nin altında
ve ağ kullanımı %20'nin altında** kalırsa geri alıyor (durduruyor). Bu aktarıcı
ayda ~72 istek aldığı için bu eşiklerin çok altında kalır — yani varsayılan
haliyle **durdurulma riski gerçek.**

Bu sessiz bir arıza olur: sakinlerin şifre sıfırlama SMS'i gelmez ve
[otp.ts](../src/lib/sms/otp.ts) numara sızdırmasını önlemek için bilerek sessiz
davrandığından kimse farkı anlamaz.

İki önlem:

1. **Hesaba ödeme yöntemi ekleyin (Pay As You Go'ya yükseltin).** Oracle,
   yükselttikten sonra da Always Free kaynakları için ücret almıyor; yaygın
   deneyim bu hesapların boşta-durdurma politikasına tabi olmadığı yönünde —
   ancak Oracle bunu dokümanında açıkça taahhüt etmiyor. Yanlışlıkla ücretli
   kaynak açılırsa fark edilsin diye 1 USD'lik bir **budget alert** kurun.
2. **`/health` adresine dışarıdan uptime takibi koyun** (UptimeRobot, Better
   Stack vb. ücretsiz katmanları yeter). Makine durursa haberiniz olur. 5
   dakikalık aralıkla yapılan kontroller ayrıca makineyi bir miktar meşgul
   tutar, ama tek başına %20 eşiğini aşmaya yetmez — 1. maddenin yerine geçmez.

## İşletim

```bash
sudo journalctl -u sms-relay -f        # canlı log (telefon numaraları maskeli)
sudo systemctl restart sms-relay       # .env değişince
```

Aktarıcı log'una mesaj metni yazılmaz, telefon numaraları son 4 hane dışında
maskelenir.

## Sorun giderme

| Belirti | Sebep |
| --- | --- |
| `401 Hesabınızda izinli IP ayarları yapılmamış` | Verimor panelindeki IP, makinenin güncel IP'si değil (ephemeral IP değişmiş olabilir) |
| `curl .../health` zaman aşımı | VCN security list veya iptables'ta 443 kapalı |
| Caddy sertifika alamıyor | 80 kapalı ya da DNS henüz yayılmamış |
| `Aktarıcıya ulaşılamadı` (sms_log) | Makine durmuş olabilir — Always Free geri alma politikası |
| `INSUFFICIENT_CREDITS` | Verimor SMS kredisi bitmiş |
