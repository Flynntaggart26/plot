# Plan sürükle-bırak + Not bağlantıları — Tasarım

Tarih: 2026-10-28
Durum: Onaylandı (kullanıcı), uygulama planı bekliyor
Sürüm hedefi: 0.3.0

## 1. Amaç

Plot'un iki yarım kalmış yüzeyini tamamlamak:

1. **Plan** ekranı gerçekten planlama yapsın: görevler sürüklenerek güne yerleşsin, günler arası taşınsın, tamamlansın; açık temada bozulmasın.
2. **Notlar** birbirine bağlanabilsin: `[[başlık]]` linkleri kaydedilsin, not detayında tıklanabilsin, backlink'ler görünsün ve notlar arasında arama yapılabilsin.

Bugünkü durum:

- `WeekView` içinde `onSchedule` prop'u tanımlı ama hiçbir drop hedefi onu çağırmıyor; kart sürüklenince yerine dönüyor.
- `WeekView`/`MonthView` 30'dan fazla sabit koyu renk içeriyor; açık temada okunmuyor.
- `note_links` tablosu, `extractWikiLinks`, `createNoteLink` ve `useNoteLinks` mevcut; ancak kayıt akışına bağlı değil. Hiçbir not link üretmiyor, detay ekranı link göstermiyor.
- Not başlığı değişince eski linkler yeniden çözülmüyor; backlink sorgusu yok.

## 2. Kapsam dışı

- Görevlerde teslim tarihi / tekrarlayan görev arayüzü (`dueAt`, `recurringRule` şemada var, UI yok).
- Etiket ve klasör yönetimi arayüzü.
- Not grafiği (graph view).
- Muse'un gerçek sağlayıcıya bağlanması.
- Yeni veritabanı tablosu/kolonu veya migration.

## 3. Plan — sürükle-bırak

### 3.1 Etkileşim

**Kaynak panel ("Planlanmamış")**

- Bugünün **must-do + açık** görevlerinden planlanmamış olanlar yatay şeritte listelenir (tekrarlar `id`'ye göre ayıklanır; mevcut kod yalnızca `open` okuyor, bu yüzden must-do'lar panelde hiç görünmüyor).
- Karttan sürükleyip hafta kolonuna bırakma → `useScheduleTask`.
- Sürükleme sırasında hedef kolon: vurgu çerçevesi + içindeki bırakma alanı accent zemini.
- Geçerli bir güne bırakılmazsa kart yayla geri döner (`spring.snappy`), haptik yok.
- Karta **tıklama** (sürüklemeden) → 7 günlük gün seçim sheet'i. Bu, sürüklemenin çalışmadığı klavye/ekran okuyucu yoludur ve aynı mutasyonu çağırır.

**Planlanmış kartlar**

- Uzun basıp sürükleme (250 ms) → başka güne taşıma; aynı güne bırakma no-op.
- "Planlanmamış" paneline bırakma → `useUnscheduleTask`.
- Karta tıklama → `/task/[id]` görev detayı.
- Soldaki onay kutusu → `useToggleTask`; ardından `planKeys.all` invalidasyonu. Kolonun "✓ n tamamlandı" bölümü anında güncellenir.
- Mevcut `×` düğmesi planlamayı kaldırmaya devam eder (erişilebilir yol).

**Geri bildirim**

- Sürükleme başında haptik `tick`, başarılı bırakmada `light`.
- Toast kullanılmaz: kartın yer değiştirmesi yeterli geri bildirim.

**Yerleşim**

- Kaynak panel her zaman görünür kalmalı: hafta şeridi kalan yüksekliği alır (`flex: 1`, `minHeight: 0`), panel alt güvenli alanın üstünde durur. Aksi hâlde sürükleme hedefi ekran dışında kalır.

**Erişilebilirlik**

- Kaynak kart: `accessibilityLabel="Görevi planla: <başlık>"`, `accessibilityHint="Gün seçmek için aç"`.
- Planlanmış kart: `accessibilityLabel="<başlık>, <gün> <saat>"`, taşıma ipucu; onay kutusu ayrı `accessibilityRole="checkbox"`.
- Sürükleme hiçbir zaman tek yol değil: gün seçim sheet'i ve `×` düğmesi klavye/ekran okuyucu için yeterli.

### 3.2 Sürükleme tekniği

Kolon konumlarını her karede ölçmek yerine geometri hesaplanır:

- Kolon genişliği `DAY_WIDTH = 120`, arada `space.sm` (12) boşluk, yatay iç boşluk `space.md` (16).
- Grid'in sol/üst köşesi ve yüksekliği `onLayout` + `measureInWindow` ile **bir kez** (ve pencere yeniden boyutlanınca) ölçülür; değerler `useSharedValue`'ya yazılır.
- Yatay kaydırma miktarı `onScroll` ile `useSharedValue`'ya yazılır (`scrollEventThrottle={16}`).
- `PanGestureHandler`'ın `onGestureEvent` worklet'inde:
  `index = floor((absoluteX - gridOriginX + scrollX - padX) / (DAY_WIDTH + gap))`
  ve dikey aralık kontrolü `gridOriginY … gridOriginY + gridHeight`.
- Hedef gün yalnızca **değiştiğinde** `runOnJS` ile React state'ine yazılır; her karede JS çağrısı yapılmaz.
- Bırakma anında son hedef worklet'ten okunur; ayrı bir JS isabet testi yok.

Jest çakışmaları:

- Kaynak panel yatay ScrollView'ın **dışında** olduğu için sürükleme başlangıcı scroll ile çakışmaz.
- Sürükleme state'i aktifken hafta ScrollView'ında `scrollEnabled={false}`; bitince `true`.
- Planlanmış kartlarda `activateAfterLongPress(250)` kullanılır. RNGH web delegesinde bu desteklenmezse `minDistance(8)` + scroll kilidi fallback'i uygulanır; uygulama sırasında dev sunucuda doğrulanır.

### 3.3 Ay görünümü

- Tüm sabit renkler tema token'larına bağlanır: hücre zemini `c.surface`, çerçeve `c.border`, soluk aylar `opacity 0.4`, bugün `c.accent`, tamamlanan noktası `c.focus`.
- Güne tıklama → Plan ekranı hafta görünümüne geçer, o günün haftası açılır ve gün vurgulanır.
  - `PlanScreen` `weekAnchor` state'ini tutar ve `WeekView`'a kontrollü prop olarak geçirir.
  - `MonthView` `onOpenDay(dayKey)` prop'u alır.
- Ay hücresindeki görev noktası gerçek yükü gösterir (bkz. 3.5).

### 3.4 Açık tema

- `WeekView` ve `MonthView` içindeki ham renkler kaldırılır:
  - kolon zemini → `c.surface`, başlık zemini → `c.surfaceRaised`, çerçeve → `c.border`
  - ikincil metin → `c.textMuted`, soluk metin → `c.textFaint`
  - vurgu → `c.accent`, tamamlanan → `c.focus`
- `glow.soft` yalnızca koyu temada uygulanır (`dark ? glow.soft : undefined`); açık temada gölge yerine çerçeve yeterli.
- "Sıcak metal" dili korunur: aynı köşe yarıçapları, aynı accent, aynı hiyerarşi.

### 3.5 Plan servisi düzeltmesi

`getWeekPlan` içindeki `allOpen` sorgusu her gün için tüm `priority = 1` görevleri döndürüyor; bu yüzden ay görünümünde her hücrede aynı nokta çıkıyor. Yeni tanım:

- `tasks` = o güne planlanmış açık görevler (`scheduledOpen`) **+** `dueAt` değeri o güne düşen açık görevler.
  - `dueAt` ISO-8601 ise `dayBounds` aralığıyla karşılaştırılır; yalnızca `YYYY-MM-DD` ise gün anahtarı eşleşmesi kullanılır (iki biçim de desteklenir).
- Tekrarlar `id`'ye göre ayıklanır.
- `scheduledOpen` ve `completed` anlamları değişmez.

`dateFromDayKey` ve `weekStartKey` kopyaları `src/lib/date.ts`'ten import edilir (Plan servisi ve WeekView'daki yerel kopyalar kaldırılır).

## 4. Not bağlantıları — veri katmanı

Yeni tablo veya migration yok; mevcut `note_links` (+ index'ler) kullanılır.

### 4.1 `syncNoteLinks(noteId, bodyMd)`

- `extractWikiLinks` ile başlıkları çıkarır.
- Boşları atar, `trim` sonrası büyük/küçük harf duyarsız tekilleştirir (ilk yazım korunur).
- Tek transaction içinde: kaynağa ait eski `note_links` satırlarını siler, yenilerini ekler.
- Hedef çözümleme: notlar bellekte normalize edilmiş başlıkla karşılaştırılır (bkz. 4.2; SQLite `lower()` Türkçe `İ` harfini katlamaz); birden fazla eşleşme varsa en son güncellenen seçilir. Kendi notuna verilen link `resolvedId = noteId` olarak saklanır ama backlink listesinde gösterilmez.

### 4.2 `resolveDanglingLinks(noteId, title)`

- Yeni not oluşturulduğunda **ve** not başlığı değiştiğinde çağrılır.
- `resolvedId IS NULL` olan linkleri bellekte gezer (SQLite `lower()` Türkçe `İ` katlamaz), normalize edilmiş başlık eşleşiyorsa `resolvedId = noteId` yazar.
- Böylece "önce link, sonra not" akışı da çalışır.

### 4.3 Sorgular

- `getBacklinks(noteId)`: `resolvedId = noteId` olan linkler + kaynak notlar; kaynak `noteId` ise atlanır; kaynak başlığına göre alfabetik.
- `getOutgoingLinks(noteId)`: kaynak notun linkleri + `resolved` boolean.
- `resolveWikiTarget(title)`: normalize başlıkla tek not döndürür (yoksa `null`).
- `searchNotes(query)`: `listNotes()` üzerinde bellekte filtre.
  - Normalizasyon: `toLocaleLowerCase('tr-TR')` + `NFD` + diakritik temizliği + `ı→i`, `İ→i` eşlemesi.
  - Başlık veya gövde eşleşmesi; sonuç `{ note, excerpt }` döner.
  - `excerpt`: markdown işaretleri temizlenmiş gövdede eşleşen konumun ~40 karakter öncesi/80 sonrası, tek satır.

### 4.4 Bağlama noktaları

- `createNote`: kayıt sonrası `syncNoteLinks` + `resolveDanglingLinks`.
- `updateNote`: gövde veya başlık değiştiyse `syncNoteLinks`; başlık değiştiyse `resolveDanglingLinks`.
- `deleteNote`: FK `cascade` linkleri temizler; `resolved_id` için `set null` zaten tanımlı. Ek iş yok.
- Sorgu anahtarları: `noteKeys.links(id)` mevcut; `noteKeys.backlinks(id)` eklenir. `noteKeys.all` invalidasyonu ikisini de kapsar.

## 5. Not bağlantıları — arayüz

### 5.1 Not detayı: okuma modu (varsayılan)

- Üst çubuk: "Not" + tarih; sağda **Düzenle** düğmesi.
- Gövde `NoteBody` bileşeniyle render edilir (yeni bağımlılık yok):
  - `#`, `##`, `###` → sırasıyla `title`, `section`, `bodyStrong`
  - `- ` / `* ` → madde işareti + satır
  - `1. ` → numaralı madde
  - `> ` → sol accent çizgili alıntı
  - boş satır → blok arası boşluk
  - satır içi: `**kalın**`, `` `kod` ``, `[[başlık]]`
  - Satır içi ayrıştırma tek geçişli tokenizer ile yapılır; iç içe biçim (ör. kalın içinde link) desteklenmez, en dıştaki kalıp kazanır.
- `[[başlık]]`:
  - hedef varsa `c.accent` renkli, altı çizili çip; tıklayınca `router.push('/note/[id]')`.
  - hedef yoksa `c.textFaint`, kesikli alt çizgi; **tıklama not oluşturmaz** (yanlışlıkla not açmayı önler). Erişilebilirlik etiketi "bağlantı hedefi yok".
- Uzun gövde kaydırılabilir; silme onayı en altta korunur.

### 5.2 Düzenleme modu

- **Düzenle** → aynı ekranda `NoteEditor` açılır; **Vazgeç** okuma moduna döner.
- Kaydet → `useUpdateNote` → toast "Not güncellendi" → okuma moduna dön (köke dönmez).
- Yeni not (`/note/new`) akışı değişmez: kaydet → toast → `dismissToRoot`.
- Editörün gövde alanının altında **Bağlantı ekle** düğmesi:
  - Aranabilir not listesi sheet'i açar: ekranı kaplayan hafif karartma + alt panel (`c.surfaceRaised`, `radius.sheet`), mevcut yakalama sheet'i diliyle aynı; panelde arama alanı ve not satırları, üstte "Bağlantı ekle" başlığı.
  - Seçilen başlık, imlecin son konumuna `[[Başlık]]` olarak eklenir; imleç linkin sonuna taşınır.
  - İmleç konumu `onSelectionChange` ile tutulur; hiç dokunulmadıysa gövdenin sonuna eklenir.
  - Aynı başlık zaten varsa ikinci kez eklenmez; toast "Zaten bağlı".

### 5.3 Bağlantılar bölümü

Okuma modunun altında:

- **Bu nottan** (giden): çipler. Çözülmemiş çipte `+` düğmesi → başlığıyla not oluşturur, `[[...]]` linkini bağlar ve yeni nota gider.
- **Bu nota** (gelen / backlink): kaynak başlığı + tarih satırları; tıklanınca kaynağa gider.
- Hiçbiri yoksa tek satır ipucu: ``[[Başlık]] yazarak notları bağlayın.``
- Bölüm başlıkları küçük, harf aralıklı meta yazı; kart kullanılmaz, sade liste.

### 5.4 Notlar listesinde arama

- `ScreenIntro` altında arama alanı: büyüteç ikonu, temizle düğmesi, `accessibilityLabel="Notlarda ara"`.
- 1+ karakterde liste filtrelenir; sonuç sayısı alt metinde gösterilir.
- Her satırda, arama aktifken başlığın altında eşleşen alıntı satırı (`numberOfLines={1}`).
- Eşleşme yoksa `EmptyState`: "Eşleşme yok" + "Aramayı temizle" eylemi.
- Arama durumu ekran içi state; uygulama yeniden açıldığında sıfırlanır.

## 6. Kenar durumları

- Aynı not birden fazla kez `[[X]]` içerirse tek link satırı.
- Başlık değişince eski başlığa verilen linkler çözülmemiş kalır (hedef yok), yeni başlığa verilenler çözülür. Bu beklenen davranış; UI çözülmemişi soluk gösterir.
- Hedef not silinince `resolved_id` null olur; link metni korunur.
- Sürükleme sırasında hafta değiştirme (ok düğmeleri) devre dışı: sürükleme bitmeden navigasyon yok.
- Pencere yeniden boyutlanınca grid geometrisi yeniden ölçülür.
- Boş gövde / yalnızca boşluk içeren not: okuma modunda "Henüz içerik yok" sessiz durumu.

## 7. Doğrulama

Kod kontrolleri:

- `npm run typecheck`, `npm run lint`, `npx expo-doctor`, `npm run web:export`.
- Dev sunucuda (Metro 8081 + COOP proxy 8082) açık ve koyu temada Plan/Ay/Not ekranları; konsol hatası olmamalı.

Paketlenmiş uygulama (CDP, gerçek fare olayları):

- Sürükleme adımları `Input.dispatchMouseEvent` ile: `mousePressed` → 350 ms bekle (uzun basış eşiği) → kademeli `mouseMoved` → `mouseReleased`. Tek adımlı sıçrama RNGH tarafından jest olarak algılanmaz.

- Mevcut 20 kontrol korunur; not detayı okuma modunda açıldığı için "prefilled" kontrolü "Düzenle → alanlar dolu" olarak güncellenir.
- Yeni kontroller:
  1. Kaynak karttan güne sürükleme → kart o kolonda görünür.
  2. Planlanmış kartı başka güne taşıma → eski kolonda yok, yeni kolonda var.
  3. "Planlanmamış" paneline bırakma → kart kolondan çıkar.
  4. Onay kutusu → "tamamlandı" sayısı artar.
  5. Ay hücresine tıklama → hafta görünümü o haftada açılır.
  6. Not A'da `[[Not B]]` → kaydet → okuma modunda link vurgulu.
  7. Linke tıklama → Not B açılır.
  8. Not B'de backlink satırında Not A görünür.
  9. Çözülmemiş link çipinde `+` → yeni not oluşur.
  10. Arama: başlıkta ve gövdede eşleşme; Türkçe karakter duyarsız; "Eşleşme yok" durumu.
- Test kayıtları (`Masaüstü ...` başlıkları) sonunda silinir.

## 8. Sürüm

- `package.json`, `app.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` → **0.3.0**.
- `app-v0.3.0` tag'i → `release-windows.yml` → NSIS + portable zip.
- Release notları: Plan sürükle-bırak, açık tema, not bağlantıları/backlink, not araması.
- `README.md` "Deferred" listesinden Plan görünümleri ve `[[wikilink]]` maddeleri çıkarılır.

## 9. Dosya haritası

Yeni:

- `src/features/notes/NoteBody.tsx` — markdown-lite + wikilink renderer.
- `src/features/notes/NoteLinks.tsx` — giden/gelen bağlantı bölümü ve not seçici sheet.
- `src/features/notes/link-utils.ts` — başlık normalizasyonu ve çözümleme yardımcıları (servis + arama ortak kullanır).

Değişecek:

- `src/features/plan/service.ts` — `getWeekPlan` görev kümesi, `lib/date` importları.
- `src/features/plan/queries.ts` — `weekAnchor` destekli kullanım (gerekirse), tamamlama sonrası plan invalidasyonu.
- `src/features/plan/WeekView.tsx` — sürükle-bırak geometrisi, gün seçim sheet'i, tema token'ları, onay kutusu, görev detayına gezinme.
- `src/features/plan/MonthView.tsx` — tema token'ları, `onOpenDay`.
- `src/app/plan/index.tsx` — hafta/ay koordinasyonu (`weekAnchor`, `focusDay`).
- `src/features/notes/service.ts` — `syncNoteLinks`, `resolveDanglingLinks`, `getBacklinks`, `resolveWikiTarget`, `searchNotes`, `normalizeTitle`.
- `src/features/notes/queries.ts` — `noteKeys.backlinks`, `useBacklinks`.
- `src/features/notes/NoteEditor.tsx` — imleç takibi, "Bağlantı ekle".
- `src/app/note/[id].tsx` — okuma/düzenleme modları, bağlantılar bölümü.
- `src/app/(tabs)/notes.tsx` — arama alanı, alıntılı sonuçlar, boş durum.
- `src/features/notes/NoteEditor.tsx` kaydetme akışı: düzenlemede köke dönmeme (detay ekranı yönetir).
- `README.md` — özellik listesi ve Deferred bölümü.
- `package.json`, `app.json`, `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` — 0.3.0.

## 10. Riskler

- **RNGH web + ScrollView**: sürükleme jestinin yatay kaydırmayla çakışması. Azaltma: kaynak panel scroll dışında, sürükleme sırasında scroll kilidi, uzun basış eşiği; dev sunucuda erken doğrulama.
- **Türkçe normalizasyon**: `İ/ı` SQLite'ta katlanmaz; bu yüzden başlık çözümleme ve arama bellekte yapılır. Veri hacmi küçük (kişisel kullanım), kabul edilebilir.
- **Link senkronu**: her kayıtta delete+insert. Not başına link sayısı küçük; transaction içinde olduğu için tutarlı.
- **Okuma modu değişikliği**: mevcut smoke testi ve kullanıcı alışkanlığı değişir; kaydetme artık köke dönmediği için "notum kayboldu" hissi doğmaz.
