(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const toNumber = Sheet.toNumber;

  Sheet.renderTotals = function renderTotals() {
    const skillPoints = Sheet.skillPointsTotal();
    const requisitionPoints = Sheet.requisitionPointsTotal();
    const skillPointsEl = query('#skillPointsTotal');
    const requisitionPointsEl = query('#requisitionPointsTotal');
    skillPointsEl.textContent = skillPoints;
    requisitionPointsEl.textContent = requisitionPoints;
    skillPointsEl.classList.toggle('exceeded', toNumber(Sheet.state.data.SP2, 0) > 0 && skillPoints > toNumber(Sheet.state.data.SP2, 0));
    requisitionPointsEl.classList.toggle('exceeded', toNumber(Sheet.state.data.RP2, 0) > 0 && requisitionPoints > toNumber(Sheet.state.data.RP2, 0));
  };
})(window.Sheet = window.Sheet || {});
