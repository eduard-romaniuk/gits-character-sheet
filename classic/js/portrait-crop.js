(function (Sheet) {
  'use strict';

  const query = Sheet.query;
  const clamp = Sheet.clamp;

  const CROP_VIEWPORT_SIZE = 280;
  const CROP_OUTPUT_SIZE = 480;

  Sheet.openPortraitCropDialog = function openPortraitCropDialog(file) {
    const fileReader = new FileReader();
    fileReader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const baseScale = CROP_VIEWPORT_SIZE / Math.min(img.naturalWidth, img.naturalHeight);
        Sheet.state.crop = { src: fileReader.result, naturalWidth: img.naturalWidth, naturalHeight: img.naturalHeight, zoom: 1, baseScale, offsetX: 0, offsetY: 0 };
        centerCropImage();
        renderCropDialog();
      };
      img.src = fileReader.result;
    };
    fileReader.readAsDataURL(file);
  };

  function currentCropScale() { return Sheet.state.crop.baseScale * Sheet.state.crop.zoom; }

  function centerCropImage() {
    const crop = Sheet.state.crop;
    const scale = currentCropScale();
    crop.offsetX = (CROP_VIEWPORT_SIZE - crop.naturalWidth * scale) / 2;
    crop.offsetY = (CROP_VIEWPORT_SIZE - crop.naturalHeight * scale) / 2;
  }

  function clampCropOffset() {
    const crop = Sheet.state.crop;
    const scale = currentCropScale();
    crop.offsetX = clamp(crop.offsetX, CROP_VIEWPORT_SIZE - crop.naturalWidth * scale, 0);
    crop.offsetY = clamp(crop.offsetY, CROP_VIEWPORT_SIZE - crop.naturalHeight * scale, 0);
  }

  Sheet.updateCropImage = function updateCropImage() {
    const crop = Sheet.state.crop;
    if (!crop) return;
    clampCropOffset();
    const img = query('#cropImage');
    if (!img) return;
    const scale = currentCropScale();
    img.style.width = (crop.naturalWidth * scale) + 'px';
    img.style.height = (crop.naturalHeight * scale) + 'px';
    img.style.left = crop.offsetX + 'px';
    img.style.top = crop.offsetY + 'px';
  };

  function renderCropDialog() {
    const crop = Sheet.state.crop;
    if (!crop) return;
    const scale = currentCropScale();
    const html = '<div class="panel-header"><div class="title">ADJUST PORTRAIT</div></div>'
      + '<div class="crop-view" id="cropViewport">'
      + '<img id="cropImage" src="' + crop.src + '" draggable="false" alt=""'
      + ' style="width:' + (crop.naturalWidth * scale) + 'px;height:' + (crop.naturalHeight * scale) + 'px;left:' + crop.offsetX + 'px;top:' + crop.offsetY + 'px">'
      + '</div>'
      + '<div class="col"><span class="label">ZOOM</span>'
      + '<input class="range" id="cropZoomRange" type="range" min="1" max="3" step="0.01" value="' + crop.zoom + '"></div>'
      + '<div class="dialog-footer"><button class="btn ghost" data-action="cropCancel">CANCEL</button>'
      + '<button class="btn primary" data-action="cropSave">USE PHOTO</button></div>';
    query('#dialog').innerHTML = html;
    query('#scrim').hidden = false;
    bindCropDragHandlers();
  }

  function bindCropDragHandlers() {
    const viewport = query('#cropViewport');
    if (!viewport) return;
    let dragging = false;
    let startX = 0, startY = 0, startOffsetX = 0, startOffsetY = 0;

    viewport.addEventListener('pointerdown', (event) => {
      dragging = true;
      startX = event.clientX; startY = event.clientY;
      startOffsetX = Sheet.state.crop.offsetX; startOffsetY = Sheet.state.crop.offsetY;
      viewport.classList.add('dragging');
      try { viewport.setPointerCapture(event.pointerId); } catch (error) {}
    });
    viewport.addEventListener('pointermove', (event) => {
      if (!dragging) return;
      Sheet.state.crop.offsetX = startOffsetX + (event.clientX - startX);
      Sheet.state.crop.offsetY = startOffsetY + (event.clientY - startY);
      Sheet.updateCropImage();
    });
    const end = (event) => {
      if (!dragging) return;
      dragging = false;
      viewport.classList.remove('dragging');
      try { viewport.releasePointerCapture(event.pointerId); } catch (error) {}
    };
    viewport.addEventListener('pointerup', end);
    viewport.addEventListener('pointercancel', end);
  }

  Sheet.closeCropDialog = function closeCropDialog() {
    Sheet.state.crop = null;
    query('#scrim').hidden = true;
    query('#dialog').innerHTML = '';
  };

  Sheet.savePortraitCrop = function savePortraitCrop() {
    const crop = Sheet.state.crop;
    if (!crop) return;
    const scale = currentCropScale();
    const cropX = -crop.offsetX / scale;
    const cropY = -crop.offsetY / scale;
    const cropSize = CROP_VIEWPORT_SIZE / scale;
    const canvas = document.createElement('canvas');
    canvas.width = CROP_OUTPUT_SIZE;
    canvas.height = CROP_OUTPUT_SIZE;
    canvas.getContext('2d').drawImage(query('#cropImage'), cropX, cropY, cropSize, cropSize, 0, 0, CROP_OUTPUT_SIZE, CROP_OUTPUT_SIZE);
    Sheet.state.portrait = canvas.toDataURL('image/jpeg', 0.88);
    Sheet.closeCropDialog();
    Sheet.persistState();
    Sheet.renderPortrait();
  };
})(window.Sheet = window.Sheet || {});
