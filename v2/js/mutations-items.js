(function (Sheet) {
  'use strict';

  const toNumber = Sheet.toNumber;
  const clamp = Sheet.clamp;

  Sheet.adjustItemUse = function adjustItemUse(sectionKey, instanceId, delta) {
    const resolved = Sheet.resolveItem(sectionKey, (Sheet.state.items[sectionKey] || []).find((i) => i.instanceId === instanceId));
    if (!resolved) return;
    const total = Math.max(0, toNumber(resolved.extra.qty, 0) + toNumber(resolved.extra.freeQty, 0));
    const used = clamp(toNumber(resolved.extra.used, 0) + delta, 0, total);
    Sheet.setInstanceField(sectionKey, instanceId, 'used', used);
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };

  Sheet.deleteItemEntry = function deleteItemEntry(sectionKey, instanceId) {
    if (sectionKey === 'Equipment') {
      const resolved = Sheet.resolveSectionItems('Equipment');
      const attachedChildren = resolved.filter((item) => Sheet.isAttachment(item) && item.extra.fittedId === instanceId);
      if (attachedChildren.length) {
        const many = attachedChildren.length > 1;
        if (!window.confirm('This weapon has ' + attachedChildren.length + ' attachment' + (many ? 's' : '') + '. Delete ' + (many ? 'them' : 'it') + ' too?')) return;
        const idsToRemove = attachedChildren.map((item) => item.instanceId).concat([instanceId]);
        Sheet.state.items.Equipment = (Sheet.state.items.Equipment || []).filter((instance) => idsToRemove.indexOf(instance.instanceId) < 0);
        Sheet.persistCharacterState();
        Sheet.renderItemSections();
        Sheet.renderTotals();
        return;
      }
    }
    Sheet.state.items[sectionKey] = (Sheet.state.items[sectionKey] || []).filter((instance) => instance.instanceId !== instanceId);
    Sheet.persistCharacterState();
    Sheet.renderItemSections();
    Sheet.renderTotals();
  };
})(window.Sheet = window.Sheet || {});
