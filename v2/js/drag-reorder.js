(function (Sheet) {
  'use strict';

  let draggedItemRef = null;

  document.addEventListener('dragstart', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    if (!row) return;
    draggedItemRef = { section: row.dataset.section, id: row.dataset.id };
    row.classList.add('dragging');
    if (event.dataTransfer) {
      event.dataTransfer.effectAllowed = 'move';
      try { event.dataTransfer.setData('text/plain', row.dataset.id); } catch (error) {}
    }
  });

  document.addEventListener('dragover', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    if (!row || !draggedItemRef || row.dataset.section !== draggedItemRef.section) return;
    event.preventDefault();
    row.classList.add('drag-over');
  });

  document.addEventListener('dragleave', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    if (row) row.classList.remove('drag-over');
  });

  document.addEventListener('dragend', () => {
    draggedItemRef = null;
    Array.prototype.forEach.call(document.querySelectorAll('.row.dragging,.row.drag-over'), (row) => row.classList.remove('dragging', 'drag-over'));
  });

  document.addEventListener('drop', (event) => {
    const row = event.target.closest && event.target.closest('.row[draggable]');
    const dragged = draggedItemRef;
    draggedItemRef = null;
    if (!row || !dragged) return;
    event.preventDefault();

    const sectionKey = row.dataset.section;
    const instanceId = row.dataset.id;
    if (sectionKey !== dragged.section || instanceId === dragged.id) { Sheet.renderItemSections(); return; }

    const list = (Sheet.state.items[sectionKey] || []).slice();
    const from = list.findIndex((instance) => instance.instanceId === dragged.id);
    const targetInstance = list.find((instance) => instance.instanceId === instanceId);
    if (from < 0 || !targetInstance) { Sheet.renderItemSections(); return; }

    if (sectionKey === 'Equipment') {
      const movedResolved = Sheet.resolveItem(sectionKey, list[from]);
      if (Sheet.isAttachment(movedResolved)) {
        const targetResolved = Sheet.resolveItem(sectionKey, targetInstance);
        const parentId = Sheet.isAttachment(targetResolved) ? targetResolved.extra.fittedId
          : ((targetResolved.extra.type || 'weapon') === 'weapon' ? targetResolved.instanceId : null);
        if (!parentId) { Sheet.renderItemSections(); return; }
        Sheet.setInstanceField(sectionKey, dragged.id, 'fittedId', parentId);
      }
    }

    const workingList = (Sheet.state.items[sectionKey] || []).slice();
    const movedIndex = workingList.findIndex((instance) => instance.instanceId === dragged.id);
    const moved = workingList[movedIndex];
    workingList.splice(movedIndex, 1);
    const to = workingList.findIndex((instance) => instance.instanceId === instanceId);
    workingList.splice(to < 0 ? workingList.length : to, 0, moved);
    Sheet.state.items[sectionKey] = workingList;

    Sheet.persistCharacterState();
    Sheet.renderItemSections();
  });
})(window.Sheet = window.Sheet || {});
