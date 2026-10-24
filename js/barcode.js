(function (Sheet) {
  'use strict';

  // Code 128 (Subset B) bar/space module-width patterns, indexed by symbol value
  // 0-106. Each of values 0-105 is a 6-digit string (3 bars + 3 spaces, alternating
  // starting with a bar, widths 1-4 modules, always summing to 11); value 106 (Stop)
  // is the unique 7-digit/13-module pattern. Sourced from the standard Code 128
  // (ISO/IEC 15417) symbol table and verified: all 107 rows present, every value
  // 0-105 sums to 11 modules, value 106 sums to 13.
  const WIDTHS = [
    '212222', '222122', '222221', '121223', '121322', '131222', '122213', '122312', '132212', '221213',
    '221312', '231212', '112232', '122132', '122231', '113222', '123122', '123221', '223211', '221132',
    '221231', '213212', '223112', '312131', '311222', '321122', '321221', '312212', '322112', '322211',
    '212123', '212321', '232121', '111323', '131123', '131321', '112313', '132113', '132311', '211313',
    '231113', '231311', '112133', '112331', '132131', '113123', '113321', '133121', '313121', '211331',
    '231131', '213113', '213311', '213131', '311123', '311321', '331121', '312113', '312311', '332111',
    '314111', '221411', '431111', '111224', '111422', '121124', '121421', '141122', '141221', '112214',
    '112412', '122114', '122411', '142112', '142211', '241211', '221114', '413111', '241112', '134111',
    '111242', '121142', '121241', '114212', '124112', '124211', '411212', '421112', '421211', '212141',
    '214121', '412121', '111143', '111341', '131141', '114113', '114311', '411113', '411311', '113141',
    '114131', '311141', '411131', '211412', '211214', '211232', '2331112',
  ];
  const START_B = 104;
  const STOP = 106;
  const QUIET_MODULES = 10;
  const HEIGHT = 100;

  // Returns raw SVG markup for a Code 128 (Subset B) barcode of `text`, or '' if
  // `text` contains a character outside the encodable ASCII 32-126 range (guard —
  // shouldn't happen for a digits/dash agent ID, but keeps rendering safe either way).
  Sheet.code128Svg = function code128Svg(text) {
    const chars = Array.from(String(text || ''));
    if (!chars.length) return '';
    const values = [];
    for (let i = 0; i < chars.length; i++) {
      const value = chars[i].charCodeAt(0) - 32;
      if (value < 0 || value > 94) return '';
      values.push(value);
    }
    const checksum = (START_B + values.reduce((sum, value, i) => sum + value * (i + 1), 0)) % 103;
    const symbols = [START_B].concat(values, [checksum, STOP]);

    let x = QUIET_MODULES;
    let isBar = true;
    let bars = '';
    symbols.forEach((symbolValue) => {
      const pattern = WIDTHS[symbolValue];
      for (let i = 0; i < pattern.length; i++) {
        const width = Number(pattern[i]);
        if (isBar) bars += '<rect x="' + x + '" y="0" width="' + width + '" height="' + HEIGHT + '" fill="currentColor"/>';
        x += width;
        isBar = !isBar;
      }
    });
    const totalWidth = x + QUIET_MODULES;

    return '<svg viewBox="0 0 ' + totalWidth + ' ' + HEIGHT + '" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg">' + bars + '</svg>';
  };
})(window.Sheet = window.Sheet || {});
