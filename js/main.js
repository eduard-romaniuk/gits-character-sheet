(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  Sheet.state = Sheet.loadState();
  Sheet.TEXT_FIELD_KEYS.forEach((fieldKey) => {
    const el = query('[data-field="' + fieldKey + '"]');
    if (el) el.value = Sheet.state.data[fieldKey] || '';
  });
  Sheet.renderPortrait();
  Sheet.renderAttributes();
  Sheet.renderConflictTracker();
  Sheet.renderHitLocations();
  Sheet.renderItemSections();
  Sheet.renderTotals();
  Sheet.persistState();
})(window.Sheet = window.Sheet || {});
