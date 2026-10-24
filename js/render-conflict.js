(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  Sheet.renderConflictTracker = function renderConflictTracker() {
    let html = '';
    Sheet.CONFLICT_ROWS.forEach((size) => {
      html += '<div class="conflict-row">'
        + '<div class="mark left ' + (Sheet.state.sc['L' + size] || '') + '" data-action="conflict" data-key="L' + size + '" role="button" tabindex="0" aria-label="left ' + size + '"></div>'
        + '<div class="conflict-die">D' + size + '</div>'
        + '<div class="mark right ' + (Sheet.state.sc['R' + size] || '') + '" data-action="conflict" data-key="R' + size + '" role="button" tabindex="0" aria-label="right ' + size + '"></div>'
        + '</div>';
    });
    html += '<div class="conflict-row"><div class="mark left fixed x"></div><div class="conflict-die">D4</div>'
      + '<div class="mark right fixed x"></div></div>';
    query('#conflictGrid').innerHTML = html;
    query('#conflictNotes').hidden = !Sheet.state.scOpen;
    query('#conflictToggle').textContent = Sheet.state.scOpen ? 'HIDE NOTES' : 'NOTES';
  };
})(window.Sheet = window.Sheet || {});
