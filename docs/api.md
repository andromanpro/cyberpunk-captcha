# API Reference

## BaseCaptcha

All captcha implementations extend `BaseCaptcha`. Common interface:

```js
class BaseCaptcha {
  constructor(mountEl: HTMLElement, options?: object)

  // Validation
  isValid(): boolean              // sync, fires 'pass'/'fail' events + onValidate callback
  validate(): { pass: boolean, message?: string }  // pure check, no events

  // Lifecycle
  replay(): void                  // reset state, new round, re-render
  destroy(): void                 // remove from DOM, clear listeners

  // Events
  on(event: string, fn: Function): () => void  // returns unsubscribe
  off(event: string, fn: Function): void
}
```

### Common options

```js
{
  onValidate: (passed: boolean, verdict: { pass, message }) => {},
  onChange: (...args) => {}
}
```

### Events

| Event   | When | Args |
|---------|------|------|
| `change` | User interaction with widget | varies per captcha |
| `pass`   | `isValid()` returned true | `verdict` object |
| `fail`   | `isValid()` returned false | `verdict` object |
| `replay` | `replay()` called | — |
| `lock`   | DecoderLock finished decoding | — |

---

## DecoderLock

Type the word that morphs from noise.

```js
new DecoderLock(mount, {
  pool?: string[],     // word pool (default 10 latin words)
  noise?: string,      // noise chars (default mixed Cyrillic/Latin/symbols)
  stepMs?: number      // animation speed per char (default 60)
})
```

State: locks after decode finishes (~`stepMs * pool[i].length` ms).

---

## LavaOrbTemp

Drag slider into target temperature band.

```js
new LavaOrbTemp(mount, {
  lavaOrb?: object,    // window.LavaOrb or import from @andromanpro/lava-orb (optional)
  orbSize?: number     // diameter in px when LavaOrb attached (default 70)
})
```

Bands: `ICE` (0-15), `COLD` (16-35), `WARM` (36-55), `HOT` (56-75), `FIRE` (76-100).

---

## SequenceDecode

Simon-style: watch flashed sequence, repeat.

```js
new SequenceDecode(mount, {
  minLen?: number,     // min sequence length (default 3)
  maxLen?: number      // max sequence length (default 5)
})
```

Wrong tap → auto-restart (replays sequence).

---

## HoneypotTime

Invisible: hidden field + timestamp.

```js
new HoneypotTime(mount, {
  minElapsed?: number,  // min seconds since render (default 3)
  fieldName?: string,   // honeypot input name (default 'website2')
  showDebug?: boolean   // visible debug overlay (default true; set false in prod)
})
```

In production, set `showDebug: false`. Captcha is fully invisible.

---

## CodeBug1C

Click broken 1С code snippet.

```js
new CodeBug1C(mount, {
  sets?: Array<Array<{ code: string, bug: boolean }>>  // own snippet sets
})
```

Each set: 3 snippets, exactly one with `bug: true`. Default pool: 5 sets.

---

## ScrubReveal

Slider into sweet-spot window (target ±N%).

```js
new ScrubReveal(mount, {
  pool?: string[],       // word pool
  windowSize?: number,   // half-width of sweet spot (default 3 → 6% wide)
  targetMin?: number,    // random target lower bound (default 30)
  targetMax?: number     // random target upper bound (default 89)
})
```

Reveal: 100% in window, fades linearly with distance to 0% at distance ≥30.

---

## CaptchaRotation

Random pick from a set of variants.

```js
new CaptchaRotation(mount, {
  variants: string[],           // captcha ids to rotate from
  pickStrategy?: 'random' | 'session',  // default 'random'
  sessionKey?: string,          // sessionStorage key (default 'cpcap-pick')
  options?: { [id]: object }    // forward per-captcha options
})
```

Captcha IDs: `'decoder-lock'`, `'lava-orb-temp'`, `'sequence-decode'`, `'honeypot-time'`, `'code-bug-1c'`, `'scrub-reveal'`.

`session` strategy: sticky pick per browser session (sessionStorage). Same visitor sees same captcha across page loads in one session.
