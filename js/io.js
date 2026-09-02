(function (Sheet) {
  'use strict';

  Sheet.exportSheet = function exportSheet() {
    const blob = new Blob([JSON.stringify({
      data: Sheet.state.data, hp: Sheet.state.hp, sc: Sheet.state.sc, scOpen: Sheet.state.scOpen, items: Sheet.state.items, openRows: Sheet.state.openRows, portrait: Sheet.state.portrait,
    }, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = String(Sheet.state.data.AgentName || 'agent').replace(/[^\w\-]+/g, '-').toLowerCase() + '-sheet.json';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 2000);
  };

  Sheet.importSheet = function importSheet(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      try {
        const parsed = JSON.parse(fileReader.result);
        localStorage.setItem(Sheet.STORAGE_KEY, JSON.stringify({
          data: parsed.data || {}, hp: parsed.hp || {}, sc: parsed.sc || {}, scOpen: parsed.scOpen !== false,
          items: parsed.items || {}, loadouts: parsed.loadouts || [], activeLoadoutId: parsed.activeLoadoutId || '',
          openRows: parsed.openRows || {}, portrait: parsed.portrait || '',
        }));
        window.location.reload();
      } catch (error) {
        window.alert('That file could not be read as a character sheet.');
      }
    };
    fileReader.readAsText(file);
  };
})(window.Sheet = window.Sheet || {});
