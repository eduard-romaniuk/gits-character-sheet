(function (Sheet) {
  'use strict';

  Sheet.query = (selector, root) => (root || document).querySelector(selector);
  Sheet.escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  Sheet.toNumber = (value, fallback) => { const n = Number(value); return isFinite(n) ? n : (fallback || 0); };
  Sheet.clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
})(window.Sheet = window.Sheet || {});
