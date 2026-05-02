/**
 * @andromanpro/cyberpunk-captcha — six cyberpunk-style captcha mechanics.
 *
 * Exports:
 *   BaseCaptcha       — common interface (extend for custom captchas)
 *   DecoderLock       — type word morphing from noise
 *   LavaOrbTemp       — drag slider into temperature band
 *   SequenceDecode    — Simon-style: repeat flashed sequence
 *   HoneypotTime      — invisible: hidden field + timestamp
 *   CodeBug1C         — click broken 1С code snippet
 *   ScrubReveal       — slider into sweet-spot window (target ±N%)
 *   CaptchaRotation   — random pick from active variants
 */

import { BaseCaptcha } from './core/BaseCaptcha.js';
import { DecoderLock } from './captchas/DecoderLock.js';
import { LavaOrbTemp } from './captchas/LavaOrbTemp.js';
import { SequenceDecode } from './captchas/SequenceDecode.js';
import { HoneypotTime } from './captchas/HoneypotTime.js';
import { CodeBug1C } from './captchas/CodeBug1C.js';
import { ScrubReveal } from './captchas/ScrubReveal.js';

export { BaseCaptcha, DecoderLock, LavaOrbTemp, SequenceDecode, HoneypotTime, CodeBug1C, ScrubReveal };

const REGISTRY = {
  'decoder-lock':    DecoderLock,
  'lava-orb-temp':   LavaOrbTemp,
  'sequence-decode': SequenceDecode,
  'honeypot-time':   HoneypotTime,
  'code-bug-1c':     CodeBug1C,
  'scrub-reveal':    ScrubReveal
};

/**
 * CaptchaRotation — random pick from a list of variants.
 *
 * options.variants — array of captcha id strings (e.g. ['decoder-lock', 'scrub-reveal'])
 * options.pickStrategy — 'random' (default) | 'session' (sticky per session via sessionStorage)
 * options.sessionKey   — sessionStorage key name (default 'cpcap-pick')
 * options.options[id]  — per-captcha options forwarded on pick
 */
export class CaptchaRotation {
  constructor(mount, opts = {}) {
    this.mount = mount;
    this.opts = opts;
    const variants = opts.variants || Object.keys(REGISTRY);
    this.variants = variants.filter(id => REGISTRY[id]);
    if (this.variants.length === 0) throw new Error('[cyberpunk-captcha] no valid variants');

    let pickedId;
    if (opts.pickStrategy === 'session' && typeof sessionStorage !== 'undefined') {
      const key = opts.sessionKey || 'cpcap-pick';
      pickedId = sessionStorage.getItem(key);
      if (!pickedId || !this.variants.includes(pickedId)) {
        pickedId = this.variants[Math.floor(Math.random() * this.variants.length)];
        sessionStorage.setItem(key, pickedId);
      }
    } else {
      pickedId = this.variants[Math.floor(Math.random() * this.variants.length)];
    }

    this.pickedId = pickedId;
    const Ctor = REGISTRY[pickedId];
    const subOpts = (opts.options && opts.options[pickedId]) || {};
    this.captcha = new Ctor(mount, subOpts);
  }

  isValid() { return this.captcha.isValid(); }
  validate() { return this.captcha.validate(); }
  replay()  { this.captcha.replay(); }
  destroy() { this.captcha.destroy(); }
  on(event, fn)  { return this.captcha.on(event, fn); }
  off(event, fn) { this.captcha.off(event, fn); }
}

// UMD-style global for IIFE bundle
if (typeof window !== 'undefined') {
  window.CyberpunkCaptcha = window.CyberpunkCaptcha || {
    BaseCaptcha, DecoderLock, LavaOrbTemp, SequenceDecode,
    HoneypotTime, CodeBug1C, ScrubReveal, CaptchaRotation
  };
}
