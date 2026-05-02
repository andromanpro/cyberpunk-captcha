# Security notes

## Threat model

**In scope**: drive-by spam bots, cheap form-fillers, simple OCR scripts.

**Out of scope**: targeted attacks, human spam farms, sophisticated ML solvers (Recurrent CNNs trained on this exact captcha). For those, use a paid service (hCaptcha, Cloudflare Turnstile).

## Per-captcha resistance

### DecoderLock
- **Bypass**: bot needs JavaScript execution + DOM observation + screenshot OCR.
- **Mitigation**: Word pool is static client-side — sophisticated bot can pre-extract pool, then just submit any word. To harden, generate pool server-side on form render and compare on submit.
- **Default behavior**: client-side only validation (sync `isValid()`). For real production, cross-check expected word with backend.

### LavaOrbTemp
- **Bypass**: bot can read target band from DOM and set slider value programmatically.
- **Mitigation**: combine with HoneypotTime (timestamp catches instant submissions).

### SequenceDecode
- **Bypass**: bot can observe flash events (CSS class `.flash` toggles), record sequence, replay.
- **Mitigation**: `_flash` is JS-driven; observation requires running scripts inside the browser. Headless browsers can do it but introduces complexity vs. value for mass spam.

### HoneypotTime
- **Bypass**: bot smart enough to skip hidden inputs + wait 3+ seconds.
- **Real-world effectiveness**: blocks ~70-80% of mass-form-fill bots that don't read CSS (or fill all visible+hidden inputs by default).

### CodeBug1C
- **Bypass**: ML trained on 1С syntax could spot bugs. But cost of training is high vs. value of one blog's spam slot.
- **Effectiveness**: very high for general spam, low if attacker specifically targets your blog with 1С-aware tooling.

### ScrubReveal
- **Bypass**: bot can iterate slider values 0..100, observe DOM display text length stability (full word visible only in window). Or if word pool is hardcoded, brute-force submission.
- **Mitigation**: pool variability + server-side word issuance (similar to DecoderLock).

## Recommendations for production

### Tier 1 — bare minimum

```js
const captcha = new HoneypotTime(mount, { showDebug: false });
// invisible, ~70-80% spam blocked
```

### Tier 2 — visible challenge

```js
const captcha = new CaptchaRotation(mount, {
  variants: ['decoder-lock', 'scrub-reveal', 'sequence-decode'],
  pickStrategy: 'session'
});
// honeypot also recommended as separate hidden layer in same form
```

### Tier 3 — maximum resistance

- Server-issued nonces — generate captcha state server-side, send to client, validate echo on submit
- Backend rate-limit — per-IP, per-form-token
- Add Cloudflare/nginx-level WAF rules (block known bot user agents)
- For commercial sites with high attack value, switch to hCaptcha or Cloudflare Turnstile

## Accessibility vs bot-resistance

`prefers-reduced-motion: reduce` fallbacks make captchas easier — but not significantly easier for bots since:
- Bots ignore CSS media queries entirely
- Reduced-motion fallbacks still require user interaction (typing, clicking, sliding)

If bot resistance is critical, do **not** disable captchas for screen readers — instead provide audio captcha or accessibility-friendly alternative (e.g., logic puzzles).

## Anti-replay

Captcha state is reset on every `replay()`. After successful `isValid()` returning true, the captcha remains in "passed" state until next `replay()` or page reload. **Don't allow infinite retries** — track failed attempts client- or server-side and lock form after N failures.

```js
let attempts = 0;
const submit = () => {
  if (++attempts > 5) {
    alert('Too many attempts');
    form.disabled = true;
    return;
  }
  if (captcha.isValid()) {
    // proceed
  } else {
    captcha.replay();
  }
};
```

## License & attribution

MIT license. No telemetry, no third-party requests (except optional `@andromanpro/lava-orb` peer). Self-contained, auditable, ~5 KB minified+gzipped per captcha.
