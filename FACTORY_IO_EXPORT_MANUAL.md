# Мануал: как вытащить модели деталей из Factory I/O

Этот документ собирает в одном месте практическую инструкцию по поиску, извлечению и подготовке моделей деталей из `Factory I/O` для дальнейшего использования в проекте `expo_dashboard`.

---

## 1. Цель

Нужно понять:

- есть ли в проекте готовые 3D-модели деталей;
- где они физически лежат;
- какими инструментами их извлекать;
- как подготовить их для использования в веб-интерфейсе или в собственном 3D-пайплайне.

Короткий ответ:

- отдельные `.fbx`, `.obj`, `.gltf`, `.glb` модели в репозитории не найдены;
- модели деталей встроены в Unity-ассеты Factory I/O;
- извлекать их нужно внешними Unity asset extraction инструментами;
- для современного Unity в этом проекте основной вариант: `AssetRipper`.

---

## 2. Что найдено в репозитории

### 2.1. Сцены Factory I/O

В проекте есть набор готовых сцен:

- `Factory IO/Scenes/Sorting by Weight.factoryio`
- `Factory IO/Scenes/Sorting by Height (Basic).factoryio`
- `Factory IO/Scenes/Sorting by Height (Advanced).factoryio`
- `Factory IO/Scenes/Sorting Station.factoryio`
- `Factory IO/Scenes/Separating Station.factoryio`
- `Factory IO/Scenes/Production Line.factoryio`
- `Factory IO/Scenes/Pick & Place XYZ.factoryio`
- `Factory IO/Scenes/Pick & Place (Basic).factoryio`
- `Factory IO/Scenes/Palletizer.factoryio`
- `Factory IO/Scenes/Level Control.factoryio`
- `Factory IO/Scenes/Elevator (Basic).factoryio`
- `Factory IO/Scenes/Elevator (Advanced).factoryio`
- `Factory IO/Scenes/Converge Station.factoryio`
- `Factory IO/Scenes/Buffer Station.factoryio`
- `Factory IO/Scenes/Automated Warehouse.factoryio`
- `Factory IO/Scenes/Assembler.factoryio`
- `Factory IO/Scenes/Assembler (Analog).factoryio`

Файлы `.factoryio` содержат описание сцен и список используемых типов деталей, но не являются удобным экспортным 3D-форматом.

### 2.2. Где лежат Unity-ассеты

Основные бинарные ассеты Factory I/O находятся здесь:

- `Factory IO/Factory IO_Data/sharedassets0.assets`
- `Factory IO/Factory IO_Data/sharedassets1.assets`
- `Factory IO/Factory IO_Data/sharedassets1.assets.resS`
- `Factory IO/Factory IO_Data/resources.assets`
- `Factory IO/Factory IO_Data/resources.assets.resS`
- `Factory IO/Factory IO_Data/globalgamemanagers`

Именно эти файлы нужно открывать инструментами для Unity-ассетов.

### 2.3. Что еще есть готового

В проекте есть 2D-превью деталей:

- `Factory IO/Documentation/manual/parts/items.html`
- `Factory IO/Documentation/manual/parts/img/items/`

Там лежат изображения вроде:

- `box-s.png`
- `box-m.png`
- `box-l.png`
- `raw-material-blue.png`
- `raw-material-green.png`
- `raw-material-metal.png`
- `product-base-blue.png`
- `product-base-green.png`
- `product-base-metal.png`
- `product-lid-blue.png`
- `product-lid-green.png`
- `product-lid-metal.png`
- `final-product-*.png`

Если для интерфейса не нужен 3D, эти изображения можно использовать напрямую.

---

## 3. Какие детали реально есть в Factory I/O

По документации `Factory IO/Documentation/manual/parts/items.html` и содержимому сцен доступны следующие группы деталей.

### 3.1. Коробки

- `BoxS` — маленькая коробка
- `BoxM` — средняя коробка
- `BoxL` — большая коробка
- `PalletizingBox` — коробка для паллетизации

### 3.2. Паллеты

- `SquarePallet`
- `Pallet`

### 3.3. Контейнеры

- `StackableBox`

### 3.4. Сырье

- `RawMaterialBlue`
- `RawMaterialGreen`
- `RawMaterialMetal`

### 3.5. Составные детали изделия

- `ProductBaseBlue`
- `ProductBaseGreen`
- `ProductBaseMetal`
- `ProductLidBlue`
- `ProductLidGreen`
- `ProductLidMetal`

### 3.6. Готовые изделия

Есть и финальные изделия, собираемые из базы и крышки:

- `Final Product`
- различные комбинации `Base + Lid`

---

## 4. Как это видно в сценах

Во внутренних XML-описаниях сцен встречаются блоки такого типа:

```xml
<Parts BoxS="True" BoxM="True" BoxL="True" PalletizingBox="True" />
```

или:

```xml
<Parts RawMaterialBlue="True" RawMaterialGreen="True" RawMaterialMetal="True"
       ProductBaseBlue="True" ProductBaseGreen="True" ProductBaseMetal="True"
       ProductLidBlue="True" ProductLidGreen="True" ProductLidMetal="True" />
```

Это означает, что соответствующие типы деталей используются в сцене и должны существовать внутри Unity-ассетов.

Внутри самих ассетов встречаются строки и имена вида:

- `BoxS_Inst`
- `BoxM_Inst`
- `BoxL_Inst`
- `PalletizingBox_Inst`
- `StackableBox_Inst`
- `ProductBaseMetal_Inst`
- `RawMaterialMetal_Inst`

Именно по таким именам удобно искать нужные объекты в извлекателе ассетов.

---

## 5. Версия Unity и почему это важно

По содержимому `UnityPlayer.dll` в сборке определяется версия:

- `Unity 2023.1.5f1`

Это важно, потому что старые утилиты для Unity-ассетов могут плохо открывать современные форматы. Поэтому основной рекомендуемый инструмент здесь — `AssetRipper`.

---

## 6. Какие инструменты нужны

### 6.1. Основной инструмент

#### AssetRipper

Рекомендуется как основной вариант для этой сборки.

- Сайт: `https://assetripper.github.io/`
- GitHub: `https://github.com/AssetRipper/AssetRipper`

Плюсы:

- хорошо работает с новыми версиями Unity;
- умеет открывать `.assets` и связанные `.resS`;
- умеет доставать `GameObject`, `Mesh`, `Texture2D`, материалы и часть структуры префабов;
- подходит для последующего экспорта и ручной доработки.

### 6.2. Альтернативы

#### AssetStudio

- GitHub: `https://github.com/Perfare/AssetStudio`

Плюсы:

- удобный просмотр ассетов;
- удобно фильтровать по `Mesh`, `Texture2D`, `GameObject`.

Минусы:

- оригинальный проект давно не обновлялся;
- с Unity 2023 может работать нестабильно или не открывать часть данных.

#### UABEA

- GitHub: `https://github.com/nesrak1/UABEA`

Подходит для:

- точечного просмотра ассетов;
- ручного извлечения отдельных объектов.

#### UnityPy

- Python-пакет: `UnityPy`

Подходит, если нужен собственный скрипт для пакетной обработки.

### 6.3. Что еще понадобится

#### Blender

Нужен для:

- проверки мешей после извлечения;
- правки масштаба и ориентации;
- пересборки материалов;
- экспорта в `glTF/GLB` для веба.

---

## 7. Минимальный рабочий набор

Если нужна простая и рабочая схема, достаточно:

1. `AssetRipper` — открыть и извлечь Unity-ассеты
2. `Blender` — проверить модель и экспортировать в `GLB`

Если нужна автоматизация:

3. `UnityPy` — пакетное извлечение / анализ

---

## 8. Пошаговый workflow извлечения

### 8.1. Подготовка

1. Не редактировать оригинальные `.assets` напрямую.
2. При необходимости сделать копию папки:
   - `Factory IO/Factory IO_Data/`
3. Убедиться, что рядом с `.assets` лежат соответствующие `.resS`.

### 8.2. Открытие в AssetRipper

1. Запустить `AssetRipper`.
2. В качестве источника указать:
   - либо всю папку `Factory IO/Factory IO_Data/`,
   - либо конкретные файлы `sharedassets*.assets`, `resources.assets`, `globalgamemanagers`.
3. Дождаться завершения анализа.

### 8.3. Что искать

В интерфейсе инструмента искать объекты типов:

- `GameObject`
- `Mesh`
- `Texture2D`
- `Material`

Искать по названиям:

- `BoxS`
- `BoxM`
- `BoxL`
- `PalletizingBox`
- `StackableBox`
- `RawMaterial`
- `ProductBase`
- `ProductLid`
- `Pallet`

Если есть найденные объекты с суффиксами вроде `_Inst`, `_Mesh`, `_Prefab`, их тоже нужно проверять.

### 8.4. Что экспортировать

Минимально стоит выгружать:

1. сам объект / prefab / game object;
2. связанные meshes;
3. texture assets;
4. materials, если инструмент умеет их корректно связать.

### 8.5. После экспорта

1. Открыть результат в `Blender`.
2. Проверить:
   - масштаб;
   - оси;
   - ориентацию;
   - наличие UV;
   - корректность материалов.
3. Если материалы сломаны, перевесить текстуры вручную.
4. Экспортировать итог в:
   - `GLB` — предпочтительно для веба;
   - или `glTF`, если нужен раздельный набор файлов.

---

## 9. Как понять, какие детали нужны именно для дашборда

В проекте `expo_dashboard` дашборд работает с данными PLC / Factory I/O и уже использует семантику деталей.

В `back/ОПИСАНИЕ_ДАННЫХ.md` указано, что для vision-сенсоров и цвета используются коды:

- `0` — нет детали
- `1-3` — синяя
- `4-6` — зеленая
- `7-9` — серая / metal

Это значит:

- по `Vision Sensor * (Value)` и `COLOR` можно определять цвет / класс детали;
- для UI можно маппить значения на нужный визуальный объект:
  - blue -> синий `RawMaterial`, `ProductBase`, `ProductLid`
  - green -> зеленый вариант
  - metal -> металлический вариант

Важно: сам код цвета не всегда однозначно указывает на геометрию детали. Он чаще описывает класс / цвет, а тип детали нужно уточнять по сцене или логике процесса.

---

## 10. Рекомендация по поиску внутри ассетов

Практический порядок поиска такой:

1. Открыть нужную сцену `.factoryio`
2. Посмотреть, какие `Parts` и `Bases` там включены
3. В `AssetRipper` искать одноименные объекты
4. Сначала вытащить базовый набор:
   - `BoxS`
   - `BoxM`
   - `BoxL`
   - `RawMaterialBlue`
   - `RawMaterialGreen`
   - `RawMaterialMetal`
   - `ProductBaseBlue`
   - `ProductBaseGreen`
   - `ProductBaseMetal`
   - `ProductLidBlue`
   - `ProductLidGreen`
   - `ProductLidMetal`
5. Проверить, какие из них реально лучше всего подходят под визуализацию на `/production`

---

## 11. Что использовать, если 3D не обязателен

Если задача — не сделать настоящий 3D viewer, а просто визуально показать тип детали на дашборде, то дешевле и надежнее использовать 2D-превью:

- `Factory IO/Documentation/manual/parts/img/items/box-s.png`
- `Factory IO/Documentation/manual/parts/img/items/raw-material-blue.png`
- `Factory IO/Documentation/manual/parts/img/items/product-base-green.png`
- `Factory IO/Documentation/manual/parts/img/items/product-lid-metal.png`

Это особенно полезно, если:

- нужно быстро собрать интерфейс;
- 3D-сцена не является обязательной;
- важнее стабильная интеграция, чем полное соответствие Unity-оригиналу.

---

## 12. Ограничения

### 12.1. Технические

- не все материалы и шейдеры корректно восстанавливаются автоматически;
- часть объектов может быть собрана из нескольких мешей;
- экспортированный результат может потребовать ручной чистки.

### 12.2. Лицензионные

Модели принадлежат правообладателю `Factory I/O / Real Games`.

Использование для внутреннего демонстрационного интерфейса обычно одно, а повторная публикация ассетов как собственного контента — другое. Перед внешним распространением нужно проверить лицензионные ограничения.

---

## 13. Рекомендуемый практический сценарий

Если цель — показать детали на дашборде, оптимальный путь такой:

1. Сначала попробовать 2D-превью из `Documentation/manual/parts/img/items/`
2. Если нужен именно 3D:
   - открыть `Factory IO_Data` в `AssetRipper`
   - найти нужные `Box / RawMaterial / ProductBase / ProductLid`
   - экспортировать
   - привести модели в `Blender`
   - сохранить в `GLB`
3. На фронте использовать уже подготовленные `GLB` или изображения в зависимости от сценария

---

## 14. Краткий итог

Что уже понятно по этому репозиторию:

- модели деталей есть, но они не лежат отдельными 3D-файлами;
- они встроены в Unity asset files Factory I/O;
- основной инструмент для извлечения: `AssetRipper`;
- запасные варианты: `AssetStudio`, `UABEA`, `UnityPy`;
- для веб-использования после извлечения лучше приводить модели через `Blender` к формату `GLB`;
- если 3D не обязателен, проще использовать готовые 2D-изображения деталей из документации.
