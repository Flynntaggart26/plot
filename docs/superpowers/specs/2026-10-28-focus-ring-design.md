# Focus Ring — Tasarım Spec (0.4.0)

## Özet

Plot uygulamasına **Focus (Odak) ekranı** ekleniyor. Mevcut `src/app/(tabs)/focus.tsx` placeholder'ını tam işlevli bir Pomodoro zamanlayıcısıyla değiştirir. Tek bir halka (ring) iki concantric daireden oluşur: **iç halka** zamanlayıcı progress (azalır), **dış halka** oturum segmentleri (dolur). İki mod: **Çalışma** ve **Mola**. Otomatik akış: Çalışma → Kısa Mola → Çalışma → ... → 4. Çalışma → Uzun Mola.

---

## Kullanıcı Akışı

### 1. İlk Açılış
- Varsayılan: **Çalışma modu**, 25 dk, 4 oturum
- İç halka: tam dolu (altın `#E8A33D`)
- Dış halka: 4 eşit segment, boş (border rengi `#2A2A30`)
- Altında: 4 session dot (boş), "4 oturum" etiketi
- Mod toggle: Çalışma aktif (altın pill), Mola pasif

### 2. Ayarlar Değiştirme
- **Süre (dk)**: `input[type=number]` 1–120, sağda "dk" birimi
- **Oturum**: `select` 2/3/4/5/6/8 → dış halka segment sayısı anında güncellenir
- **Renkler**: İç/Dış halka için `input[type=color]` butonları (44px, hover scale, focus ring)
- Sadece Çalışma modunda aktif; Mola modunda devre dışı (varsayılan mola renkleri kullanılır)

### 3. Çalıştırma
- **Başlat** butonu (hero gradient, play ikonu) → iç halka azalmaya başlar (saniyede 1/1500), 1. segment dolmaya başlar
- **Duraklat** → pause ikonu, "Devam Et" metni
- Zaman biterse:
  - **Çalışma biter**: `completedWorkSessions++`, 1. segment **kalıcı dolu** (altın), **Kısa Mola (5 dk)** başlar (mod otomatik Mola'ya geçer)
  - **Mola biter**: Mod **Çalışma'ya** döner, sonraki segment dolmaya başlar, önceki segmentler **dolu kalır**
  - **4. çalışma biter**: Tüm segmentler dolu, **Uzun Mola (15 dk)** başlar
  - **Uzun mola biter**: Döngü 1. segmentten devam eder (segmentler dolu kalır)

### 4. Session Dots
- 8px yuvarlak noktalar, `totalSessions` adet
- **Dolu**: `completedWorkSessions` indeksinden küçükler → `filled` class (scale 1.15, accent rengi)
- **Geçerli**: `completedWorkSessions` indeksi ve `isRunning` ve `mode=work` → `current` class (pulse animasyonu, border accent)
- **Boş**: Diğerleri → border rengi

---

## Tasarım Token'ları (Theme Uyumlu)

Tüm renkler `src/ui/tokens.ts` `color.dark` / `color.light` token'larından gelir:

| Anlam | Koyu Tema | Açık Tema | CSS Var |
|---|---|---|---|
| Arka plan | `#0E0E10` | `#FAF8F5` | `--bg` |
| Kart yüzeyi | `#16161A` | `#FFFFFF` | `--surface` |
| Border | `#2A2A30` | `#E4DED5` | `--border` |
| Metin | `#F2EDE6` | `#1B1917` | `--text` |
| Metin muted | `#9A948C` | `#6E6961` | `--text-muted` |
| **Accent (Çalışma)** | `#E8A33D` | `#94621A` | `--accent` |
| Accent soft | `#E8A33D22` | `#94621A1A` | `--accent-soft` |
| **Focus (Mola)** | `#7BE0AD` | `#2F9E6A` | `--focus` |
| Focus soft | `#7BE0AD1F` | `#2F9E6A14` | `--focus-soft` |

**Mola renkleri (varsayılan, kullanıcı değiştiremez):**
- İç: `#FF6B2E` (turuncu) — koyu temada
- Dış: `#FF9F5A` (açık turuncu)
- Açık temada: `#D4541E` / `#E88440`

---

## SVG Halka Mimarisi

```svg
<svg viewBox="0 0 300 300" style="transform: rotate(-90deg)">
  <!-- Dış segmentler (8px, segmentli) -->
  <g id="outerSegments">
    <!-- Her segment: background path (boş) + foreground path (dolu) -->
    <path class="bg" d="..." stroke="var(--border)" stroke-width="8" fill="none" stroke-linecap="round"/>
    <path class="fg" d="..." stroke="var(--accent)" stroke-width="8" fill="none" stroke-linecap="round"/>
    ...
  </g>
  
  <!-- Dış halka arka plan (tam daire, 8px) -->
  <circle id="outerBg" cx="150" cy="150" r="138" stroke="var(--border)" stroke-width="8" fill="none" stroke-linecap="round"/>
  
  <!-- İç halka arka plan (tam daire, 24px) -->
  <circle id="innerBg" cx="150" cy="150" r="112" stroke="var(--border)" stroke-width="24" fill="none"/>
  
  <!-- İç halka progress (24px, stroke-dasharray ile azalır) -->
  <circle id="innerProgress" cx="150" cy="150" r="112" stroke="var(--accent)" stroke-width="24" fill="none" stroke-linecap="round" stroke-dasharray="703.72" stroke-dashoffset="0"/>
</svg>
```

### Ölçüler

| Parametre | Değer |
|---|---|
| SVG viewBox | `300×300` |
| Merkez | `(150, 150)` |
| İç halka yarıçap (R_INNER) | `112` |
| Dış segment yarıçap (R_OUTER) | `138` |
| İç halka kalınlık (W_INNER) | `24` |
| Dış segment kalınlık (W_OUTER) | `8` |
| İç dasharray | `2π × 112 = 703.72` |

---

## Segment Geometrisi (Kritik)

**`createSegmentPath(index, total, progress)`** — Her segment temiz eşit dilim:

```typescript
function createSegmentPath(index: number, total: number, progress: number): string {
  const gap = 0.02;                    // Segment arası boşluk (radyan)
  const segmentAngle = 2 * Math.PI / total;
  const startAngle = index * segmentAngle - Math.PI / 2 + gap / 2;
  const sweepAngle = (segmentAngle - gap) * Math.min(Math.max(progress, 0), 1);
  const endAngle = startAngle + sweepAngle;
  const largeArc = sweepAngle > Math.PI ? 1 : 0;
  
  const x1 = CENTER + R_OUTER * Math.cos(startAngle);
  const y1 = CENTER + R_OUTER * Math.sin(startAngle);
  const x2 = CENTER + R_OUTER * Math.cos(endAngle);
  const y2 = CENTER + R_OUTER * Math.sin(endAngle);
  
  return `M ${x1.toFixed(2)} ${y1.toFixed(2)} A ${R_OUTER} ${R_OUTER} 0 ${largeArc} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
}
```

**Kurallar:**
- `total` = 2,3,4,5,6,8 → her zaman **eşit açı** (`2π/total`)
- `gap = 0.02` rad (~1.15°) → segmentler **birbirine değmez**
- `progress` 0→1 arası **doğrusal** dolum
- `largeArc` flag: `sweepAngle > π` ise `1` (180°'dan büyük yaylar için doğru SVG arc)
- Koordinatlar `.toFixed(2)` → sub-pixel titreşim yok

**Her segment iki path:**
1. **Background** — `progress=1`, renk `var(--border)`, her zaman çizilir (track)
2. **Foreground** — `progress=0→1`, renk mod rengi (altın/turuncu), transition'lı

---

## State Modeli

```typescript
interface FocusState {
  mode: 'work' | 'break';
  duration: number;              // saniye (çevrimiçi süre)
  timeLeft: number;              // kalan saniye
  totalSessions: number;         // 2|3|4|5|6|8
  completedWorkSessions: number; // KALICI - sadece reset'te 0
  currentSessionProgress: number; // 0-1, her tick güncellenir
  isRunning: boolean;
  
  // Renkler (sadece Çalışma modunda kullanıcı değiştirir)
  innerColor: string;      // Çalışma iç: '#E8A33D'
  outerColor: string;      // Çalışma dış: '#FFD47A'
  breakInnerColor: string; // Mola iç (sabit): '#FF6B2E'
  breakOuterColor: string; // Mola dış (sabit): '#FF9F5A'
  
  timerId: number | null;
}
```

### State Geçişleri

| Event | Aksiyon |
|---|---|
| **Başlat** | `isRunning=true`, `timerId=setInterval(1s)` |
| **Tick (work)** | `timeLeft--`, `currentSessionProgress = 1 - timeLeft/duration`, `renderOuterSegments()` |
| **Tick (break)** | `timeLeft--`, `currentSessionProgress` güncellenir, `renderOuterSegments()` |
| **Work biter** | `completedWorkSessions++`, `mode='break'`, `duration=5*60` (son çalışmaysa `15*60`), `timeLeft=duration`, `currentSessionProgress=0` |
| **Break biter** | `mode='work'`, `duration=input.value*60`, `timeLeft=duration`, `currentSessionProgress=0` |
| **Duraklat** | `clearInterval`, `isRunning=false` |
| **Süre/Oturum değişimi** (idle) | `duration/totalSessions` güncelle, `completedWorkSessions=0`, `timeLeft=duration` |
| **Mod değiştirme** (idle) | `mode` flip, `timeLeft=duration`, `completedWorkSessions=0` |

---

## UI Bileşenleri (Polished)

### Layout Hiyerarşisi
```
Ring Card (surface, border, shadow, top accent line)
├── Ring Wrap (300×300, flex center)
│   ├── SVG (300×300, rotate -90°)
│   └── Center (absolute, flex column)
│       ├── Time (64px, tabular-nums, monospace, accent color)
│       └── Mode Badge (pill, icon+text, accent soft bg)
├── Session Dots (flex, gap 6px)
│   ├── Dot × totalSessions (8px, border)
│   │   ├── .filled (completedWorkSessions < i) → scale 1.15, accent bg
│   │   ├── .current (i === completedWorkSessions && running) → pulse, border accent
│   │   └── default → border only
│   └── Label "N oturum" (muted)
├── Mode Toggle (pill, surface-raised, gap 6px)
│   ├── Work btn (🔥 Çalışma) — active: accent bg, text=bg
│   └── Break btn (☕ Mola) — active: focus bg, text=bg
├── Divider "Ayarlar"
├── Settings Grid (2-col, gap 12px)
│   ├── Süre: label + input-wrap (input + "dk" unit)
│   └── Oturum: label + select-wrap (custom arrow)
├── Divider "Renkler"
├── Color Row (flex, gap 12px)
│   ├── İç Halka: label + color-btn (44px, hidden input[type=color])
│   └── Dış Halka: label + color-btn (44px, hidden input[type=color])
└── Start Button (hero, full-width)
    ├── Gradient bg (accent → lighter)
    ├── Shadow (accent 30%)
    ├── Hover: lift -2px, shadow 40%
    ├── Play ↔ Pause SVG morph
    └── Disabled: opacity 50%
```

### Erişilebilirlik
- `aria-label` tüm butonlarda
- `role="radiogroup"` + `role="radio"` + `aria-checked` mode toggle
- `focus-visible` ring (accent color) tüm interaktif elementlerde
- `prefers-reduced-motion: reduce` → animasyonlar kapatılır
- Tab sırası: Mode → Süre → Oturum → İç Renk → Dış Renk → Başlat

---

## React Native / Expo Implementation Notları

### Teknoloji Seçimi
- **SVG**: `react-native-svg` (Expo'da built-in)
- **Animasyon**: `react-native-reanimated` (worklet-based, 60fps)
- **State**: Mevcut `zustand` store veya local `useState`/`useRef`
- **Timer**: `setInterval` + `useEffect` cleanup (native'de `setInterval` güvenilir)

### Bileşen Yapısı
```
FocusScreen.tsx
├── useFocusStore (zustand) — state + actions
├── RingSVG.tsx — SVG + segment path logic
│   ├── OuterSegments.tsx (map totalSessions → SegmentPath)
│   ├── InnerProgress.tsx (stroke-dashoffset animated)
│   └── SessionDots.tsx
├── ModeToggle.tsx
├── SettingsGrid.tsx
│   ├── DurationInput.tsx
│   └── SessionsSelect.tsx
├── ColorPickers.tsx
└── StartButton.tsx
```

### Reanimated Kullanımı (Performans)
```typescript
// Inner progress - shared value
const progress = useSharedValue(1);
const innerDashOffset = useDerivedValue(() => DASH_INNER * (1 - progress.value));

// Segment progress - shared value array
const segmentProgress = useSharedValue<number[]>(Array(totalSessions).fill(0));

// SVG path'ler useAnimatedProps ile bağlanır
<AnimatedPath
  d={useDerivedValue(() => createSegmentPath(i, total, segmentProgress.value[i]))}
  stroke={useDerivedValue(() => mode === 'work' ? innerColor : breakInnerColor)}
/>
```

### Persistência
- `completedWorkSessions` → `AsyncStorage` / `expo-sqlite` (settings tablosu)
- `duration`, `totalSessions`, `innerColor`, `outerColor` → settings
- App yeniden açıldığında son durum yüklenir

---

## Test Senaryoları

| Senaryo | Beklenen |
|---|---|
| Oturum 2→8 değiştir | Segmentler eşit, gap'lı, anında yeniden çizilir |
| Çalışma 25dk başlat, 5dk bekle | İç halka %80, 1. segment %80 dolu |
| Çalışma bitir | 1. segment tam dolu (altın), Kısa Mola (5dk) başlar |
| Mola bitir | Mod Çalışma, 2. segment dolmaya başlar, 1. dolu kalır |
| 4. çalışma bitir | 4 segment dolu, Uzun Mola (15dk) başlar |
| Uzun mola bitir | 1. segmentten devam, 4 segment dolu kalır |
| Duraklat → Devam | Zaman kaldığı yerden devam |
| Açık tema toggle | Tüm renkler token'lardan gelir, AA kontrast |
| Renk seçici değiştir | İç/Dış halka anında güncellenir (sadece work modunda) |
| Oturum sayısı 6 yap | 6 eşit segment, 6 dot |

---

## Dosya Yerleşimi (Önerilen)

```
src/
├── app/(tabs)/focus.tsx           # Ana ekran (yeni implementasyon)
├── features/focus/
│   ├── store.ts                   # zustand store
│   ├── types.ts                   # State tipi
│   ├── RingSVG.tsx                # SVG bileşeni
│   ├── SegmentPath.ts             # createSegmentPath export
│   ├── SessionDots.tsx
│   ├── ModeToggle.tsx
│   ├── SettingsGrid.tsx
│   ├── ColorPickers.tsx
│   └── StartButton.tsx
├── ui/components/
│   ├── ColorButton.tsx            # 44px renk butonu (yeniden kullanılabilir)
│   └── SelectWrap.tsx             # Custom select (yeniden kullanılabilir)
└── ui/tokens.ts                   # Mevcut token'lar (değişiklik yok)
```

---

## Kabul Kriterleri

- [ ] TypeScript `npm run typecheck` geçer
- [ ] ESLint `npm run lint` geçer
- [ ] Expo Doctor `npx expo-doctor` 20/20
- [ ] Web (isolated) + Desktop (Tauri) her ikisinde çalışır
- [ ] Koyu/Açık tema anında geçiş, kontrast AA
- [ ] `prefers-reduced-motion` animasyonları kapatır
- [ ] Segment sayısı 2-8 arası her değerde geometri bozulmaz
- [ ] `completedWorkSessions` kalıcı (app restart sonrası korunur)
- [ ] Mola renkleri sabit, sadece Çalışma renkleri değiştirilebilir

---

## Notlar

- Bu spec **0.4.0** için `Focus` ekranını tamamlar
- `Plan` kapasite uyarıları, `Notes` grafik, `Share intent` → 0.5.0+
- Mevcut `src/app/(tabs)/focus.tsx` placeholder tamamen değiştirilecek
- `src-tauri` / `web:export` hiçbir değişiklik gerektirmez (sadece JS bundle)