(function (Sheet) {
  'use strict';

  const query = Sheet.query;

  Sheet.renderPortrait = function renderPortrait() {
    const portraitEl = query('#portrait');
    portraitEl.classList.toggle('filled', !!Sheet.state.portrait);
    portraitEl.innerHTML = Sheet.state.portrait ? '<img alt="Agent portrait" src="' + Sheet.state.portrait + '">' : 'AGENT<br>PORTRAIT';
  };
})(window.Sheet = window.Sheet || {});
