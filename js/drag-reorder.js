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
    const itemId = row.dataset.id;
    if (sectionKey !== dragged.section || itemId === dragged.id) { Sheet.renderItemSections(); return; }

    const list = (Sheet.state.items[sectionKey] || []).slice();
    const from = list.findIndex((item) => item.id === dragged.id);
    const target = list.filter((item) => item.id === itemId)[0];
    if (from < 0 || !target) { Sheet.renderItemSections(); return; }

    let moved = list[from];
    if (sectionKey === 'Equipment' && Sheet.isAttachment(moved)) {
      const parentId = Sheet.isAttachment(target) ? (target.extra || {}).fittedId
        : ((((target.extra || {}).type) || 'weapon') === 'weapon' ? target.id : null);
      if (!parentId) { Sheet.renderItemSections(); return; }
      moved = { ...moved, extra: { ...(moved.extra || {}), fittedId: parentId } };
    }

    list.splice(from, 1);
    const to = list.findIndex((item) => item.id === itemId);
    list.splice(to < 0 ? list.length : to, 0, moved);
    Sheet.state.items[sectionKey] = list;

    Sheet.persistState();
    Sheet.renderItemSections();
  });
})(window.Sheet = window.Sheet || {});
