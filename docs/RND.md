# R&D: Mobile Book Reader (MVP)

## Context

Нужно выбрать технологический стек для кроссплатформенного мобильного приложения — читалки книг (EPUB, PDF, DOCX). Ниже — результаты исследования по всем критичным направлениям с конкретной рекомендацией.

---

## 1. Framework: React Native (Expo) vs Flutter

### Рекомендация: **React Native + Expo**

| Критерий                    | React Native                                                                                                | Flutter                                                                                                |
| --------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| EPUB рендеринг              | `react-native-readium` — **нативный** (Readium Swift/Kotlin). Индустриальный стандарт, 100+ production apps | `flutter_epub_viewer` — WebView обёртка над epub.js. Или `vocsy_epub_viewer` — обёртка над FolioReader |
| PDF рендеринг               | `react-native-pdf` (1.8k stars) или `react-native-pdf-jsi`                                                  | `syncfusion_flutter_pdfviewer` (OOM issues с большими файлами)                                         |
| DOCX                        | Конвертация в EPUB (см. секцию ниже)                                                                        | Аналогично                                                                                             |
| Зрелость экосистемы ридеров | **Readium** — лучший в индустрии                                                                            | Всё через WebView, нет нативного ридера                                                                |
| Твой стек                   | React/TS — родной стек                                                                                      | Dart — новый язык                                                                                      |

**Ключевой фактор:** `react-native-readium` использует нативные движки Readium (Swift Toolkit для iOS, Kotlin Toolkit для Android) через Nitro Modules. Это не WebView-обёртка — это тот же движок, на котором работают Apple Books, Kobo и десятки коммерческих ридеров. Flutter-альтернативы — всё WebView-обёртки с потолком по производительности.

---

## 2. Рендеринг форматов

### EPUB — `react-native-readium`

- 153 stars, последний коммит Jan 2025
- Нативный рендеринг (не WebView)
- EPUB 2 и EPUB 3
- TOC из встроенного содержания
- Аннотации, закладки, темы, навигация свайпами
- CFI-based позиционирование
- **Риск:** PDF пока на roadmap, не реализован

### PDF — `react-native-pdf` / `react-native-pdf-jsi`

- `react-native-pdf`: 1.8k stars, проверенный
- **Известные проблемы:** OOM crash на файлах 30-80MB, совместимость с RN 0.80 New Architecture и Android 15
- `react-native-pdf-jsi`: JSI-based (быстрее), но менее зрелый
- **Митигация:** Виртуализированный рендеринг страниц, предупреждение при файлах >50MB

### DOCX — исключён из MVP

**Ни одна open-source библиотека не рендерит DOCX качественно на мобильных.**

- `mammoth.js` — конвертирует в semantic HTML, но теряет сложное форматирование
- `docxjs` / `docx-preview` — browser-only
- Enterprise SDK (Apryse, Syncfusion) — платные лицензии ($$$)

**Решение:** DOCX убран из MVP. Фокус на EPUB + PDF. В v2 можно добавить через server-side конвертацию (Pandoc/Calibre CLI → EPUB).

---

## 3. Архитектура хранения данных

### Трёхслойная архитектура: File System + SQLite + MMKV

| Данные                                | Хранилище                                   | Почему                                             |
| ------------------------------------- | ------------------------------------------- | -------------------------------------------------- |
| Файлы книг + обложки                  | **File System** (`expo-file-system`)        | Стандарт для бинарных файлов                       |
| Метаданные, категории, связи, заметки | **SQLite** (`expo-sqlite` + Drizzle ORM)    | ACID, SQL запросы, JOIN для many-to-many, миграции |
| Позиция чтения (hot path)             | **MMKV** (primary) + **SQLite** (canonical) | mmap-запись за микросекунды, crash-safe            |
| Настройки (тема, шрифт)               | **MMKV** (`react-native-mmkv` v4)           | Простой K/V, синхронный, быстрый                   |

### Позиция чтения — критичная логика

```
При чтении:
  → Debounced MMKV write каждые ~2 сек (микросекунды, без UI jank)

При уходе в background (AppState listener):
  → Flush в SQLite

Периодически (каждые 30-60 сек):
  → Sync MMKV → SQLite

При запуске:
  → Сравнить timestamp MMKV vs SQLite, взять новее
```

MMKV использует mmap — ядро ОС сбрасывает страницы на диск даже при kill процесса.

### Отвергнутые варианты

| Хранилище        | Причина отказа                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------- |
| **Realm**        | Deprecated MongoDB, EOL 30 сентября 2025. Мертвый проект                                       |
| **Isar**         | Автор бросил проект. Rust core делает community-поддержку сложной                              |
| **Hive**         | Не умеет реляционные запросы. Many-to-many (книга↔категория) потребует загрузки всего в память |
| **WatermelonDB** | Жизнеспособен, но overkill для offline-only без sync                                           |

### Схема БД (SQLite)

```sql
books (id, title, cover_path, file_path, format, status, rating, date_added, date_modified)
categories (id, name)
book_categories (book_id, category_id)  -- many-to-many
notes (id, book_id, text, created_at, updated_at)
reading_positions (book_id, position_data, chapter_index, percentage, updated_at)
```

---

## 4. UX-паттерны из индустрии

Исследование коммерческих ридеров (Google Play Books, Apple Books, Moon+ Reader, ReadEra, Lithium):

- **Tap zones:** Лево/право — перелистывание, центр — overlay с controls
- **Нижний скроллер** — page slider/scrubber
- **Верхний бар** — TOC, поиск, закладки, настройки
- **Settings panel** — font size, font family, line spacing, margins, themes (day/night/sepia), brightness
- **Никто не переключает формат runtime** — EPUB и PDF используют разные движки рендеринга. Формат определяется при импорте

---

## 5. Известные подводные камни

### EPUB

- CSS-конфликты — publisher CSS vs user settings vs reader defaults (проблема #1)
- WebView-ридеры рендерят всю главу перед пагинацией — нет точного "страница X из Y"
- EPUB 3 рендерится хуже чем EPUB 2 (MathML/SVG)
- RTL-поддержка слабая в большинстве open-source ридеров

### PDF

- **Память** — файлы 30-80MB крашат приложения на Android
- Митигация: виртуализированный рендеринг страниц, нативные движки (PDFKit/PdfRenderer)

### Reading Position (CFI)

- DOM-инъекции ридера ломают CFI-разрешение
- Разные XML-парсеры дают разный DOM для идентичного XML
- Обновление книги инвалидирует все сохранённые CFI
- **Best practice:** Хранить CFI + chapter index + percentage + text anchor как fallback

---

## 6. Файловый импорт и "Open With"

### File Picker

- `expo-document-picker` — стандартный, работает из коробки
- Фильтрация по MIME-типам: `application/epub+zip`, `application/pdf`, `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### Share / Open With

- **iOS:** Регистрация UTI в `Info.plist` (`CFBundleDocumentTypes`)
- **React Native:** `react-native-share-menu` или `react-native-receive-sharing-intent`
- **Expo:** Поддержка через config plugins
- При получении файла: копировать в app sandbox, извлечь метаданные, добавить в SQLite

---

## 7. Итоговый стек

| Слой         | Технология                                                |
| ------------ | --------------------------------------------------------- |
| Framework    | React Native + Expo (managed workflow)                    |
| EPUB reader  | `react-native-readium`                                    |
| PDF reader   | `react-native-pdf` (с fallback на `react-native-pdf-jsi`) |
| DOCX         | Исключён из MVP (v2: server-side Pandoc → EPUB)           |
| Navigation   | Expo Router                                               |
| State        | React hooks + MMKV / SQLite                               |
| DB           | `expo-sqlite` + Drizzle ORM                               |
| Fast K/V     | `react-native-mmkv` v4                                    |
| File system  | `expo-file-system`                                        |
| File picker  | `expo-document-picker`                                    |
| Share intent | `react-native-receive-sharing-intent`                     |
| Styling      | NativeWind (Tailwind for RN)                              |

---

## 8. Риски и митигации

| Риск                                       | Вероятность | Митигация                                                            |
| ------------------------------------------ | ----------- | -------------------------------------------------------------------- |
| `react-native-readium` не покрывает PDF    | Высокая     | Отдельная библиотека для PDF — уже в плане                           |
| OOM на больших PDF                         | Средняя     | Виртуализация страниц, лимит размера файла с предупреждением         |
| DOCX в v2                                  | —           | Убран из MVP. Server-side Pandoc в следующей версии                  |
| `react-native-readium` недостаточно зрелый | Средняя     | Fallback: `epubjs-react-native` (WebView, но проверенный, 243 stars) |
| MMKV потеря данных                         | Низкая      | mmap + dual-write в SQLite                                           |

---

## 9. Open-source референсы

- [react-native-readium](https://github.com/5-stones/react-native-readium) — нативный EPUB ридер
- [epubjs-react-native](https://github.com/victorsoares96/epubjs-react-native) — WebView EPUB (fallback)
- [Readium Swift Toolkit](https://github.com/readium/swift-toolkit) — iOS нативный движок
- [Readium Kotlin Toolkit](https://github.com/readium/kotlin-toolkit) — Android нативный движок
- [OpenReadEra](https://readera.org/open-readera) — C/C++ ридер (справочно, для архитектурных идей)
- [FlutterEbookApp](https://github.com/JideGuru/FlutterEbookApp) — Flutter аналог (справочно)

---

## 10. Следующие шаги (после утверждения R&D)

1. Инициализация Expo проекта с TypeScript strict
2. Настройка SQLite схемы + Drizzle + MMKV
3. Прототип EPUB ридера на `react-native-readium`
4. Прототип PDF ридера
5. File picker + библиотека книг
6. Категории, статусы, рейтинги, заметки
7. Настройки чтения (тема, шрифт)
8. Share intent интеграция
9. Edge cases и полировка
