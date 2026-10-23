(function (Sheet) {
  'use strict';

  Sheet.query = (selector, root) => (root || document).querySelector(selector);
  Sheet.escapeHtml = (value) => String(value == null ? '' : value).replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[char]));
  Sheet.toNumber = (value, fallback) => { const n = Number(value); return isFinite(n) ? n : (fallback || 0); };
  Sheet.clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

  // Agent ID format: XX-XXXX-XXXX (10 digits: section, then an 8-digit date).
  Sheet.formatAgentId = function formatAgentId(raw) {
    const digits = String(raw || '').replace(/\D/g, '').slice(0, 10);
    let out = digits.slice(0, 2);
    if (digits.length > 2) out += '-' + digits.slice(2, 6);
    if (digits.length > 6) out += '-' + digits.slice(6, 10);
    return out;
  };

  Sheet.generateAgentId = function generateAgentId() {
    const now = new Date();
    const pad2 = (n) => String(n).padStart(2, '0');
    const yyyy = String(now.getFullYear()).padStart(4, '0');
    const mmdd = pad2(now.getMonth() + 1) + pad2(now.getDate());
    return Sheet.formatAgentId('09' + yyyy + mmdd);
  };
})(window.Sheet = window.Sheet || {});
