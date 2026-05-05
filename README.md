# cyberpunk-captcha

🇬🇧 **English** · 🇷🇺 [Русский](README.ru.md)

> Six cyberpunk-style captcha mechanics for comment forms or anti-bot challenges.
> Vanilla JS, zero deps (lava-orb optional peer). Reduced-motion respected.

## Demo

[Live demo](https://andromanpro.github.io/cyberpunk-captcha) · [Article](https://androman.pro/cyberpunk-captcha)

## What's inside

| # | Name | Mechanics | Friction | Bot resistance |
|---|---|---|---|---|
| 01 | **Decoder Lock** | Type word that morphs from noise | Medium | High |
| 02 | **Lava-Orb Temperature** | Drag slider into target band (optional `@andromanpro/lava-orb`) | Low | Medium |
| 03 | **Sequence Decode** | Simon-style: repeat flashed sequence | Medium | High |
| 04 | **Honeypot + Time** | Invisible (hidden field + timestamp) | None | High |
| 05 | **1С Code Spot the Bug** | Click broken 1С code snippet | High | Very High (gated) |
| 06 | **Scrub Reveal** | Slider into sweet-spot window (target ±N%) | Medium | Medium-High |

## Install

```bash
npm install @andromanpro/cyberpunk-captcha
# Optional peer (only for LavaOrbTemp):
npm install @andromanpro/lava-orb
```

Or via CDN:
```html
<link rel="stylesheet" href="https://unpkg.com/@andromanpro/cyberpunk-captcha/dist/cyberpunk-captcha.css">
<script src="https://unpkg.com/@andromanpro/cyberpunk-captcha/dist/cyberpunk-captcha.min.js"></script>
```

## Quick start

```html
<div id="captcha-mount"></div>
<button id="submit">Submit</button>

<script type="module">
  import { DecoderLock } from '@andromanpro/cyberpunk-captcha';
  import '@andromanpro/cyberpunk-captcha/style.css';

  const captcha = new DecoderLock(document.getElementById('captcha-mount'));

  document.getElementById('submit').addEventListener('click', () => {
    if (captcha.isValid()) {
      console.log('Pass!');
    } else {
      console.log('Captcha failed');
      captcha.replay();
    }
  });
</script>
```

## All six — usage

### DecoderLock
```js
import { DecoderLock } from '@andromanpro/cyberpunk-captcha';

const captcha = new DecoderLock(mount, {
  pool: ['ANDROMAN', 'CYBER', 'NEON'],   // word pool (default included)
  noise: '#@$%&*+=...',                   // noise chars (default included)
  stepMs: 60                              // animation speed per char
});
```

### LavaOrbTemp
```js
import { LavaOrbTemp } from '@andromanpro/cyberpunk-captcha';

// Without lava-orb — styled gradient slider
const captcha = new LavaOrbTemp(mount);

// With lava-orb (optional peer dependency)
import LavaOrb from '@andromanpro/lava-orb';
const captcha = new LavaOrbTemp(mount, {
  lavaOrb: LavaOrb,    // pass the imported library
  orbSize: 70          // diameter in pixels
});
```

### SequenceDecode
```js
import { SequenceDecode } from '@andromanpro/cyberpunk-captcha';

const captcha = new SequenceDecode(mount, {
  minLen: 3,   // min sequence length (default 3)
  maxLen: 5    // max sequence length (default 5)
});
```

### HoneypotTime
```js
import { HoneypotTime } from '@andromanpro/cyberpunk-captcha';

const captcha = new HoneypotTime(mount, {
  minElapsed: 3,         // min seconds since render (default 3)
  fieldName: 'website2', // honeypot field name (default 'website2')
  showDebug: false       // show debug overlay (default true for demos)
});
```

### CodeBug1C
```js
import { CodeBug1C } from '@andromanpro/cyberpunk-captcha';

const captcha = new CodeBug1C(mount, {
  // optional: own snippet sets (each set: 3 snippets, one with bug:true)
  sets: [[
    { code: 'Процедура Тест()\n  ...\nКонецПроцедуры', bug: false },
    { code: 'Если а > 0 Тогда\n  ...', bug: true /* missing КонецЕсли */ },
    { code: '...', bug: false }
  ]]
});
```

### ScrubReveal
```js
import { ScrubReveal } from '@andromanpro/cyberpunk-captcha';

const captcha = new ScrubReveal(mount, {
  pool: ['LAVA', 'ORB', 'NEON'],   // word pool
  windowSize: 3,                    // half-width of sweet spot (default 3 → window ±3 → 6%)
  targetMin: 30,                    // random target range
  targetMax: 89
});
```

### CaptchaRotation
Random pick from a set of variants per render:
```js
import { CaptchaRotation } from '@andromanpro/cyberpunk-captcha';

const captcha = new CaptchaRotation(mount, {
  variants: ['decoder-lock', 'scrub-reveal', 'sequence-decode'],
  pickStrategy: 'random',     // or 'session' (sticky per session via sessionStorage)
  sessionKey: 'cpcap-pick',   // sessionStorage key
  options: {
    'decoder-lock': { stepMs: 50 }
  }
});
```

## Common API (BaseCaptcha)

All captchas extend `BaseCaptcha` and share this interface:

```js
captcha.isValid();        // → boolean (sync validation, fires 'pass' or 'fail' event)
captcha.validate();       // → { pass: boolean, message: string } (no events)
captcha.replay();         // reset state, new round, re-render
captcha.destroy();        // remove from DOM, clear listeners

captcha.on('change', fn); // user interaction
captcha.on('pass', fn);   // validation passed
captcha.on('fail', fn);   // validation failed
captcha.on('replay', fn); // round reset
```

Common options:
```js
new XCaptcha(mount, {
  onChange: (...args) => {},          // fired on user interaction
  onValidate: (passed, verdict) => {} // after isValid() called
});
```

## Accessibility

All captchas respect `prefers-reduced-motion: reduce`:
- **DecoderLock** — instant fallback (word shown statically, no morph animation)
- **LavaOrbTemp** — slider works as plain range input
- **SequenceDecode** — numbered list of buttons instead of flash sequence
- **HoneypotTime** — already invisible, no a11y impact
- **CodeBug1C** — purely click-based, no animation
- **ScrubReveal** — gradient transitions disabled

## Browser support

ES2017+ baseline (Chrome 58+, Firefox 53+, Safari 11+, Edge 14+). No IE11.
For older browsers, transpile via Babel using your own bundler.

## License

MIT © [Roman Andriyanov (androman)](https://androman.pro)
