/**
 * Shared utilities used across captcha implementations.
 */

export function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[c]);
}

export function reducedMotion() {
  return typeof window !== 'undefined' &&
    window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Tiny event emitter mixin for BaseCaptcha.
 */
export function createEmitter() {
  const listeners = new Map();
  return {
    on(event, fn) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(fn);
      return () => listeners.get(event)?.delete(fn);
    },
    off(event, fn) {
      listeners.get(event)?.delete(fn);
    },
    emit(event, ...args) {
      const set = listeners.get(event);
      if (!set) return;
      for (const fn of set) {
        try { fn(...args); } catch (e) { console.error(`[cyberpunk-captcha] handler for "${event}" threw:`, e); }
      }
    },
    clear() { listeners.clear(); }
  };
}
