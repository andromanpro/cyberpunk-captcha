# cyberpunk-captcha

🇷🇺 **Русский** · 🇬🇧 [English](README.md)

> Шесть киберпанк-капч для форм комментариев и анти-бот защиты.
> Vanilla JS, без зависимостей (lava-orb — опциональный peer). Уважает `prefers-reduced-motion`.

## Demo

[Живые примеры](https://andromanpro.github.io/cyberpunk-captcha) · [Статья на блоге](https://androman.pro/cyberpunk-captcha)

## Что внутри

| # | Название | Механика | Сложность для человека | Защита от бота |
|---|---|---|---|---|
| 01 | **Decoder Lock** | Ввести слово, которое проявляется из шума | Средняя | Высокая |
| 02 | **Lava-Orb Temperature** | Слайдер в нужный диапазон температур (опционально `@andromanpro/lava-orb`) | Низкая | Средняя |
| 03 | **Sequence Decode** | Simon-style: повторить мигающую последовательность | Средняя | Высокая |
| 04 | **Honeypot + Time** | Невидимая (скрытое поле + таймер) | Нулевая | Высокая |
| 05 | **1С Code Spot the Bug** | Кликнуть на сломанный фрагмент 1С-кода | Высокая | Очень высокая (специфична) |
| 06 | **Scrub Reveal** | Слайдер в sweet-spot окно (target ±N%) | Средняя | Средне-высокая |

## Установка

```bash
npm install @andromanpro/cyberpunk-captcha
# Опциональный peer (только для LavaOrbTemp):
npm install @andromanpro/lava-orb
```

Или через CDN:
```html
<link rel="stylesheet" href="https://unpkg.com/@andromanpro/cyberpunk-captcha/dist/cyberpunk-captcha.css">
<script src="https://unpkg.com/@andromanpro/cyberpunk-captcha/dist/cyberpunk-captcha.min.js"></script>
```

## Быстрый старт

```html
<div id="captcha-mount"></div>
<button id="submit">Submit</button>

<script type="module">
  import { DecoderLock } from '@andromanpro/cyberpunk-captcha';
  import '@andromanpro/cyberpunk-captcha/style.css';

  const captcha = new DecoderLock(document.getElementById('captcha-mount'));

  document.getElementById('submit').addEventListener('click', () => {
    if (captcha.isValid()) {
      console.log('Прошёл!');
    } else {
      console.log('Капча не пройдена');
      captcha.replay();
    }
  });
</script>
```

## Все шесть — использование

### DecoderLock
```js
import { DecoderLock } from '@andromanpro/cyberpunk-captcha';

const captcha = new DecoderLock(mount, {
  pool: ['ANDROMAN', 'CYBER', 'NEON'],   // пул слов (есть default)
  noise: '#@$%&*+=...',                   // символы шума (есть default)
  stepMs: 60                              // скорость анимации на символ
});
```

### LavaOrbTemp
```js
import { LavaOrbTemp } from '@andromanpro/cyberpunk-captcha';

// Без lava-orb — стилизованный градиентный слайдер
const captcha = new LavaOrbTemp(mount);

// С lava-orb (опциональная peer-зависимость)
import LavaOrb from '@andromanpro/lava-orb';
const captcha = new LavaOrbTemp(mount, {
  lavaOrb: LavaOrb,    // передай импортированную библиотеку
  orbSize: 70          // диаметр в пикселях
});
```

### SequenceDecode
```js
import { SequenceDecode } from '@andromanpro/cyberpunk-captcha';

const captcha = new SequenceDecode(mount, {
  minLen: 3,   // мин. длина последовательности (default 3)
  maxLen: 5    // макс. длина (default 5)
});
```

### HoneypotTime
```js
import { HoneypotTime } from '@andromanpro/cyberpunk-captcha';

const captcha = new HoneypotTime(mount, {
  minElapsed: 3,         // мин. секунд после рендера (default 3)
  fieldName: 'website2', // имя honeypot-поля (default 'website2')
  showDebug: false       // показать отладочный оверлей (default true для демо)
});
```

### CodeBug1C
```js
import { CodeBug1C } from '@andromanpro/cyberpunk-captcha';

const captcha = new CodeBug1C(mount, {
  // опционально: свои наборы фрагментов (каждый набор: 3 фрагмента, один с bug:true)
  sets: [[
    { code: 'Процедура Тест()\n  ...\nКонецПроцедуры', bug: false },
    { code: 'Если а > 0 Тогда\n  ...', bug: true /* пропущен КонецЕсли */ },
    { code: '...', bug: false }
  ]]
});
```

### ScrubReveal
```js
import { ScrubReveal } from '@andromanpro/cyberpunk-captcha';

const captcha = new ScrubReveal(mount, {
  pool: ['LAVA', 'ORB', 'NEON'],   // пул слов
  windowSize: 3,                    // полу-ширина sweet-spot (default 3 → окно ±3 → 6%)
  targetMin: 30,                    // диапазон случайного target
  targetMax: 89
});
```

### CaptchaRotation
Случайный выбор из набора вариантов на каждом рендере:
```js
import { CaptchaRotation } from '@andromanpro/cyberpunk-captcha';

const captcha = new CaptchaRotation(mount, {
  variants: ['decoder-lock', 'scrub-reveal', 'sequence-decode'],
  pickStrategy: 'random',     // или 'session' (sticky на сессию через sessionStorage)
  sessionKey: 'cpcap-pick',   // ключ sessionStorage
  options: {
    'decoder-lock': { stepMs: 50 }
  }
});
```

## Общий API (BaseCaptcha)

Все капчи наследуются от `BaseCaptcha` и имеют общий интерфейс:

```js
captcha.isValid();        // → boolean (синхронная валидация, fires 'pass' или 'fail')
captcha.validate();       // → { pass: boolean, message: string } (без событий)
captcha.replay();         // сброс состояния, новый раунд, перерендер
captcha.destroy();        // удалить из DOM, очистить listeners

captcha.on('change', fn); // взаимодействие пользователя
captcha.on('pass', fn);   // валидация прошла
captcha.on('fail', fn);   // валидация не прошла
captcha.on('replay', fn); // раунд сброшен
```

Общие опции:
```js
new XCaptcha(mount, {
  onChange: (...args) => {},          // на взаимодействии пользователя
  onValidate: (passed, verdict) => {} // после вызова isValid()
});
```

## Доступность

Все капчи уважают `prefers-reduced-motion: reduce`:
- **DecoderLock** — мгновенный fallback (слово показывается статично, без морфинга)
- **LavaOrbTemp** — слайдер работает как обычный range input
- **SequenceDecode** — нумерованный список кнопок вместо мигающей последовательности
- **HoneypotTime** — и так невидим, на a11y не влияет
- **CodeBug1C** — чисто на кликах, без анимаций
- **ScrubReveal** — градиентные переходы отключены

## Поддержка браузеров

ES2017+ (Chrome 58+, Firefox 53+, Safari 11+, Edge 14+). Без IE11.
Для старых браузеров — транспиляция через Babel в твоём bundler.

## Лицензия

MIT © [Роман Андриянов (androman)](https://androman.pro)
