/**
 * BaseCaptcha — common interface for all captcha implementations.
 *
 * Lifecycle:
 *   new Captcha(mountEl, options)  → constructs, calls render()
 *   captcha.isValid()              → boolean (synchronous validation)
 *   captcha.replay()               → reset state, new round, re-render widget
 *   captcha.destroy()              → remove from DOM, clear listeners
 *
 * Events:
 *   captcha.on('change', handler)  → fires on user interaction with widget
 *   captcha.on('pass', handler)    → fires when validation succeeds
 *   captcha.on('fail', handler)    → fires when validation fails
 *
 * Options (common to all):
 *   onValidate(passed: boolean)    → callback after isValid() called
 *   onChange()                     → callback on user interaction
 *
 * Subclasses should:
 *   - override render() to build widget DOM inside this.mount
 *   - override checkValid() returning {pass: boolean, message?: string}
 *   - call this.emit('change') on user interaction
 *   - put captcha-specific state in this.state
 */

import { createEmitter, reducedMotion } from '../utils.js';

export class BaseCaptcha {
  static name = 'BaseCaptcha';

  constructor(mountEl, options = {}) {
    if (!mountEl || !(mountEl instanceof HTMLElement)) {
      throw new Error('[cyberpunk-captcha] mount element required');
    }
    this.mount = mountEl;
    this.options = options;
    this.state = {};
    this._emitter = createEmitter();
    this._destroyed = false;
    this._reduced = reducedMotion();
    this.mount.classList.add('cpcap', `cpcap-${this.constructor.id || 'base'}`);
    this.render();
  }

  // Override in subclass
  render() {
    this.mount.innerHTML = '<div class="cpcap-error">BaseCaptcha.render() not implemented</div>';
  }

  // Override in subclass
  checkValid() {
    return { pass: false, message: 'BaseCaptcha.checkValid() not implemented' };
  }

  isValid() {
    if (this._destroyed) return false;
    const verdict = this.checkValid();
    this._emitter.emit(verdict.pass ? 'pass' : 'fail', verdict);
    if (typeof this.options.onValidate === 'function') {
      this.options.onValidate(verdict.pass, verdict);
    }
    return verdict.pass;
  }

  // Validation with full verdict (pass + message)
  validate() {
    if (this._destroyed) return { pass: false, message: 'destroyed' };
    return this.checkValid();
  }

  replay() {
    if (this._destroyed) return;
    this.state = {};
    this.mount.innerHTML = '';
    this.render();
    this._emitter.emit('replay');
  }

  destroy() {
    if (this._destroyed) return;
    this._destroyed = true;
    this.mount.innerHTML = '';
    this.mount.classList.remove('cpcap', `cpcap-${this.constructor.id || 'base'}`);
    this._emitter.clear();
  }

  on(event, fn)  { return this._emitter.on(event, fn); }
  off(event, fn) { this._emitter.off(event, fn); }
  emit(event, ...args) {
    this._emitter.emit(event, ...args);
    if (event === 'change' && typeof this.options.onChange === 'function') {
      try { this.options.onChange(...args); } catch (e) { /* noop */ }
    }
  }
}
