# Design decisions

## Why these six (and what didn't make it)

### Included

| Captcha | Why |
|---|---|
| **Decoder Lock** | Reuses cyberpunk visual language (decoder is already on the home page hero). Visitors recognize the pattern. |
| **Lava-Orb Temp** | Leverages existing npm package. Slider-based = low friction. Bot can't simulate range drag accurately. |
| **Sequence Decode** | Memory challenge, no text typing. Mobile-friendly. Bot can't time animation reliably. |
| **Honeypot + Time** | Zero-friction invisible layer. Recommended as **fallback** under any visible captcha. |
| **1С Code Bug** | Audience-specific (1С dev blog). Gates non-1С visitors but that's the point. |
| **Scrub Reveal** | Tactile slider, sweet-spot window prevents "drag to end" trivial bypass. |

### Considered, dropped

- **Konami Code**: included originally, removed as redundant — too well-known, bots eventually learn it. Better as Easter egg, not captcha.
- **Math captcha** (`2 + 3 = ?`): too generic, no brand fit. Bots solve trivially with regex.
- **Image grid** (Google reCAPTCHA-style "click cars"): infrastructure heavy, accessibility nightmare, costs API requests.
- **Audio CAPTCHA**: WAV synth + pattern detection — too complex for v1.

## Steps vs smooth animations

Original implementations used `steps(N)` CSS easing for "digital glitch" feel. After user testing this came across as "nervous" / "jittery". Switched all timings to `cubic-bezier(0.22, 1, 0.36, 1)` (Apple-style ease-out). Smooth movement, cyberpunk feel preserved through **color and glow**, not jitter.

## Decoder font handling

DecoderLock had three iterations:

1. **Monospace during decode, proportional on lock** → font shift visible at lock moment.
2. **Monospace everywhere** → looked great but lock cleanup needed to swap to proportional, jarring.
3. **Same font throughout (proportional Manrope)** → no font shift. But noise chars `█▓▒░|` don't render in Manrope → browser falls back to monospace → letter widths jitter.

Final: **inherit page font + remove block chars from noise pool**. Lost some "blocky" cyberpunk vibe but gained stability.

## Scrub sweet-spot

Original: drag to ≥X% to pass. Simple but always-monotonic — same target each round felt boring.

Iteration: random target X% (60-89), pass if slider ≥ X. Better, but visitor can always over-scrub to 100% and pass — no skill.

Final: **sweet-spot window** — target ±3% (6% wide). Outside window the word fades back to noise. Forces precision but not impossibly narrow.

## Reduced-motion respect

`prefers-reduced-motion: reduce` triggered fallbacks per captcha:

- DecoderLock: instant word reveal, no morph
- LavaOrbTemp: native slider behavior, no orb attach
- SequenceDecode: numbered list `1.▴ 2.▶ 3.◀` instead of flash sequence
- ScrubReveal: gradient transitions disabled
- HoneypotTime: already invisible
- CodeBug1C: pure click, no animation

User-pref check is one-shot at construction time, not reactive — visitors who flip the OS setting mid-session need to refresh.

## Friction vs bot resistance

Trade-off matrix (subjective, based on testing):

```
HIGH bot resistance  +  LOW friction  →  HoneypotTime, LavaOrbTemp
HIGH bot resistance  +  HIGH friction →  CodeBug1C (audience-specific)
MED  bot resistance  +  MED  friction →  DecoderLock, SequenceDecode, ScrubReveal
```

**Recommendation for production**: combine **HoneypotTime** (invisible layer) + one visible captcha rotated via `CaptchaRotation`. Catches different bot types: simple form-fillers (honeypot), human farms ("low friction" captcha doesn't deter them, but visible challenge slows down throughput).

## Why no async validation

All `isValid()` calls are **synchronous**. Tradeoff: can't do server-side anti-replay tokens or rate-limit checks within the captcha itself. Reason: keep the library frontend-only, zero deps, minimal API surface.

For production: combine with backend rate-limit (per-IP, per-form-token), or wrap CaptchaRotation in your own async validator that posts the verdict + a server-issued nonce.
