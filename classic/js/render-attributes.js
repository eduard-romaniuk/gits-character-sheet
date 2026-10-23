(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const escapeHtml = Sheet.escapeHtml;
  const toNumber = Sheet.toNumber;

  function renderStepper(action, dataKey, value) {
    return '<div class="step"><button data-action="' + action + '" data-key="' + dataKey + '" data-delta="-1" aria-label="decrease">−</button>'
      + '<div class="step-value">' + escapeHtml(value) + '</div>'
      + '<button data-action="' + action + '" data-key="' + dataKey + '" data-delta="1" aria-label="increase">+</button></div>';
  }

  Sheet.renderAttributes = function renderAttributes() {
    let html = '';
    Sheet.ATTRIBUTE_GROUPS.forEach(([name, list]) => {
      html += '<div class="panel"><div class="panel-header"><div class="title">' + name + '</div></div>'
        + '<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;padding-top:14px">';
      list.forEach(([key, label]) => {
        html += '<div class="col"><span class="label">' + label + '</span>' + renderStepper('die', key, Sheet.state.data[key] || 'd6') + '</div>';
      });
      html += '</div></div>';
    });
    html += '<div class="panel"><div class="panel-header"><div class="title">CYBERBRAIN</div></div>'
      + '<div class="grid" style="grid-template-columns:1fr 1fr;gap:12px;padding-top:14px">'
      + '<div class="col"><span class="label">HACKING</span>' + renderStepper('die', 'Hacking', Sheet.state.data.Hacking || 'd6') + '</div>'
      + '<div class="col"><span class="label">BARRIER</span>' + renderStepper('barrier', 'Barrier', toNumber(Sheet.state.data.Barrier, 6)) + '</div>'
      + '</div></div>';
    query('#attributes').innerHTML = html;
  };
})(window.Sheet = window.Sheet || {});
