(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  Sheet.stepDie = function stepDie(attributeKey, delta) {
    const index = Math.max(0, Sheet.DICE_STEPS.indexOf(Sheet.state.data[attributeKey] || 'd6'));
    Sheet.state.data[attributeKey] = Sheet.DICE_STEPS[clamp(index + delta, 0, Sheet.DICE_STEPS.length - 1)];
    Sheet.persistCharacterState();
    Sheet.renderAttributes();
  };

  Sheet.stepBarrier = function stepBarrier(delta) {
    Sheet.state.data.Barrier = clamp(toNumber(Sheet.state.data.Barrier, 6) + delta * 2, 6, 20);
    Sheet.persistCharacterState();
    Sheet.renderAttributes();
  };

  function stepMarkState(store, key, delta) {
    const index = Sheet.MARK_STATES.indexOf(store[key] || '');
    const next = Sheet.MARK_STATES[(index + delta + 3) % 3];
    if (next) store[key] = next; else delete store[key];
  }

  Sheet.stepConflictMark = function stepConflictMark(markKey, delta) {
    stepMarkState(Sheet.state.sc, markKey, delta);
    Sheet.persistCharacterState();
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
    Sheet.persistCharacterState();
    Sheet.renderHitLocations();
  };

  Sheet.toggleItemRow = function toggleItemRow(sectionKey, instanceId) {
    const rowKey = sectionKey + ':' + instanceId;
    if (Sheet.state.openRows[rowKey]) delete Sheet.state.openRows[rowKey]; else Sheet.state.openRows[rowKey] = 1;
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
  };

  Sheet.toggleAllRows = function toggleAllRows(sectionKey) {
    const openAll = !Sheet.state.sectionAllOpen[sectionKey];
    (Sheet.state.items[sectionKey] || []).forEach((instance) => {
      const rowKey = sectionKey + ':' + instance.instanceId;
      if (openAll) Sheet.state.openRows[rowKey] = 1; else delete Sheet.state.openRows[rowKey];
    });
    Sheet.state.sectionAllOpen[sectionKey] = openAll;
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
  };
})(window.Sheet = window.Sheet || {});
