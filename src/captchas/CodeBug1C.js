import { BaseCaptcha } from '../core/BaseCaptcha.js';
import { randomItem } from '../utils.js';

const DEFAULT_SETS = [
  [
    { code: 'Процедура Тест()\n  Сообщить("Привет");\nКонецПроцедуры', bug: false },
    { code: 'Если а > 0 Тогда\n  Сообщить("+");\nКонецЕсли;', bug: false },
    { code: 'Процедура Тест()\n  Сообщить("Привет");', bug: true }
  ],
  [
    { code: 'Товары = Новый Массив;\nТовары.Добавить("Пицца");', bug: false },
    { code: 'Товары = Новый Массив(;\nТовары.Добавить("Пицца");', bug: true },
    { code: 'Товары = Новый Массив;\nТовары.Очистить();', bug: false }
  ],
  [
    { code: 'Запрос = Новый Запрос;\nЗапрос.Текст = "ВЫБРАТЬ * ИЗ Справочник.Номенклатура";', bug: false },
    { code: 'Запрос = Новый Запрос\nЗапрос.Текст = "ВЫБРАТЬ";', bug: true },
    { code: 'Запрос = Новый Запрос;\nРезультат = Запрос.Выполнить();', bug: false }
  ],
  [
    { code: 'Для каждого Стр Из Таблица Цикл\n  Сообщить(Стр.Имя);\nКонецЦикла;', bug: false },
    { code: 'Для каждого Стр Из Таблица Цикл\n  Сообщить(Стр.Имя);', bug: true },
    { code: 'Пока Счётчик < 10 Цикл\n  Счётчик = Счётчик + 1;\nКонецЦикла;', bug: false }
  ],
  [
    { code: 'Сообщить("Привет, " + ИмяПользователя);', bug: false },
    { code: 'Сообщить("Привет, " + ИмяПользователя);\n  Сообщить(Дата);', bug: false },
    { code: 'Сообщить("Привет, " + ИмяПользователя;', bug: true }
  ]
];

/**
 * CodeBug1C — audience-specific captcha: 3 1С code snippets, one has a syntax bug.
 * Click the broken one. Bot can't parse 1С language → fails.
 *
 * options.sets — pass own snippet sets (each: array of 3 with one bug:true)
 */
export class CodeBug1C extends BaseCaptcha {
  static id = 'code-bug-1c';
  static name = '1С Code — Spot the Bug';

  render() {
    const sets = this.options.sets || DEFAULT_SETS;
    this.state.set = randomItem(sets).slice().sort(() => Math.random() - 0.5);
    this.state.solved = false;

    this.mount.innerHTML = `
      <div class="cpcap-label">
        <span>// CLICK THE BROKEN TRANSMISSION</span>
        <span class="cpcap-bug-status">scan…</span>
      </div>
      <div class="cpcap-bug-snippets">
        ${this.state.set.map((s) => `<div class="cpcap-bug-snippet" data-bug="${s.bug ? '1' : '0'}">${this._escape(s.code)}</div>`).join('')}
      </div>
    `;

    this._snippetsRoot = this.mount.querySelector('.cpcap-bug-snippets');
    this._statusEl = this.mount.querySelector('.cpcap-bug-status');

    this._snippetsRoot.addEventListener('click', (e) => this._onClick(e));
  }

  _escape(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  _onClick(e) {
    if (this.state.solved) return;
    const div = e.target.closest('.cpcap-bug-snippet');
    if (!div) return;
    const isBug = div.getAttribute('data-bug') === '1';
    if (isBug) {
      div.classList.add('cpcap-locked-correct');
      this._statusEl.textContent = '✓ broken transmission spotted';
      this._statusEl.style.color = 'var(--cpcap-signal-green)';
      this.state.solved = true;
      this.emit('change', true);
    } else {
      div.classList.add('cpcap-locked-wrong');
      this._statusEl.textContent = '✗ this one valid, scan others';
      this._statusEl.style.color = 'var(--cpcap-hot)';
    }
  }

  checkValid() {
    if (!this.state.solved) return { pass: false, message: 'find the broken snippet' };
    return { pass: true, message: 'bug spotted — 1С verified' };
  }
}
