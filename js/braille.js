(function (Sheet) {
  'use strict';

  // Standard Grade-1 English Braille (Unicode Braille Patterns block, U+2800).
  const LETTER_CELLS = {
    a: '⠁', b: '⠃', c: '⠉', d: '⠙', e: '⠑',
    f: '⠋', g: '⠛', h: '⠓', i: '⠊', j: '⠚',
    k: '⠅', l: '⠇', m: '⠍', n: '⠝', o: '⠕',
    p: '⠏', q: '⠟', r: '⠗', s: '⠎', t: '⠞',
    u: '⠥', v: '⠧', w: '⠺', x: '⠭', y: '⠽', z: '⠵',
  };
  const NUMERIC_INDICATOR = '⠼';
  const BLANK_CELL = '⠀';
  // Digits reuse the letter cells: 1->a, 2->b, ... 9->i, 0->j.
  const DIGIT_CELLS = { 1: 'a', 2: 'b', 3: 'c', 4: 'd', 5: 'e', 6: 'f', 7: 'g', 8: 'h', 9: 'i', 0: 'j' };
  Object.keys(DIGIT_CELLS).forEach((digit) => { DIGIT_CELLS[digit] = LETTER_CELLS[DIGIT_CELLS[digit]]; });

  Sheet.brailleTransliterate = function brailleTransliterate(text) {
    const input = String(text || '').toLowerCase();
    let out = '';
    let numberMode = false;
    for (let i = 0; i < input.length; i++) {
      const char = input[i];
      if (DIGIT_CELLS[char]) {
        if (!numberMode) { out += NUMERIC_INDICATOR; numberMode = true; }
        out += DIGIT_CELLS[char];
      } else {
        numberMode = false;
        out += LETTER_CELLS[char] || BLANK_CELL;
      }
    }
    return out;
  };
})(window.Sheet = window.Sheet || {});
