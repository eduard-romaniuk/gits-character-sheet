(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  Sheet.stepDie = function stepDie(attributeKey, delta) {
    const index = Math.max(0, Sheet.DICE_STEPS.indexOf(Sheet.state.data[attributeKey] || 'd6'));
    Sheet.state.data[attributeKey] = Sheet.DICE_STEPS[clamp(index + delta, 0, Sheet.DICE_STEPS.length - 1)];
    Sheet.persistState();
    Sheet.renderAttributes();
  };

  Sheet.stepBarrier = function stepBarrier(delta) {
    Sheet.state.data.Barrier = clamp(toNumber(Sheet.state.data.Barrier, 6) + delta * 2, 6, 20);
    Sheet.persistState();
    Sheet.renderAttributes();
  };

  function stepMarkState(store, key, delta) {
    const index = Sheet.MARK_STATES.indexOf(store[key] || '');
    const next = Sheet.MARK_STATES[(index + delta + 3) % 3];
    if (next) store[key] = next; else delete store[key];
  }

  Sheet.stepConflictMark = function stepConflictMark(markKey, delta) {
    stepMarkState(Sheet.state.sc, markKey, delta);
    Sheet.persistState();
    Sheet.renderConflictTracker();
  };

  function hitTrackFor(value) {
    return Sheet.HIT_LETHAL_STATES.includes(value) ? Sheet.HIT_LETHAL_STATES : Sheet.HIT_NONLETHAL_STATES;
  }

  Sheet.stepHitBox = function stepHitBox(boxKey, delta, forceTrack) {
    const current = Sheet.state.hp[boxKey] || '';
    const track = forceTrack || hitTrackFor(current);
    const index = track.indexOf(current);
    const from = index === -1 ? 0 : index;
    const next = track[(from + delta + track.length) % track.length];
    if (next) Sheet.state.hp[boxKey] = next; else delete Sheet.state.hp[boxKey];
    Sheet.persistState();
    Sheet.renderHitLocations();
  };

  Sheet.toggleItemRow = function toggleItemRow(sectionKey, itemId) {
    const rowKey = sectionKey + ':' + itemId;
    if (Sheet.state.openRows[rowKey]) delete Sheet.state.openRows[rowKey]; else Sheet.state.openRows[rowKey] = 1;
    Sheet.persistState();
    Sheet.renderItemSections();
  };

  Sheet.toggleAllRows = function toggleAllRows(sectionKey) {
    const openAll = !Sheet.state.sectionAllOpen[sectionKey];
    (Sheet.state.items[sectionKey] || []).forEach((item) => {
      const rowKey = sectionKey + ':' + item.id;
      if (openAll) Sheet.state.openRows[rowKey] = 1; else delete Sheet.state.openRows[rowKey];
    });
    Sheet.state.sectionAllOpen[sectionKey] = openAll;
    Sheet.persistState();
    Sheet.renderItemSections();
  };

  Sheet.adjustItemUse = function adjustItemUse(sectionKey, itemId, delta) {
    Sheet.state.items[sectionKey] = (Sheet.state.items[sectionKey] || []).map((item) => {
      if (item.id !== itemId) return item;
      const extra = item.extra || {};
      const total = Math.max(0, toNumber(extra.qty, 0));
      return { ...item, extra: { ...extra, used: clamp(toNumber(extra.used, 0) + delta, 0, total) } };
    });
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.deleteItemEntry = function deleteItemEntry(sectionKey, itemId) {
    if (sectionKey === 'Equipment') {
      const list = Sheet.state.items.Equipment || [];
      const attachedChildren = list.filter((item) => Sheet.isAttachment(item) && (item.extra || {}).fittedId === itemId);
      if (attachedChildren.length) {
        const many = attachedChildren.length > 1;
        if (!window.confirm('This weapon has ' + attachedChildren.length + ' attachment' + (many ? 's' : '') + '. Delete ' + (many ? 'them' : 'it') + ' too?')) return;
        const idsToRemove = attachedChildren.map((item) => item.id).concat([itemId]);
        Sheet.state.items.Equipment = list.filter((item) => idsToRemove.indexOf(item.id) < 0);
        Sheet.persistState();
        Sheet.renderItemSections();
        Sheet.renderTotals();
        return;
      }
    }
    Sheet.state.items[sectionKey] = (Sheet.state.items[sectionKey] || []).filter((item) => item.id !== itemId);
    Sheet.persistState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };
})(window.Sheet = window.Sheet || {});
