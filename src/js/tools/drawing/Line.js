/**
 * @provide pskl.tools.drawing.Line
 *
 * @require pskl.utils
 */
(function() {
  var ns = $.namespace('pskl.tools.drawing');

  ns.Line = function() {
    this.toolId = 'tool-line';
    this.helpText = 'Line tool';
    this.shortcut = pskl.service.keyboard.Shortcuts.TOOL.STROKE;
    this.tooltipDescriptors = [
      {key : 'shift', description : 'Hold shift to draw straight lines'}
    ];

    // Line's first point coordinates (set in applyToolAt)
    this.startCol = null;
    this.startRow = null;
  };

  pskl.utils.inherit(ns.Line, ns.BaseTool);

  ns.Line.prototype.supportsDynamicPenSize = function() {
    return true;
  };

  /**
   * @override
   */
  ns.Line.prototype.applyToolAt = function(col, row, frame, overlay, event) {
    this.startCol = col;
    this.startRow = row;

    // When drawing a line we don't change the model instantly, since the
    // user can move his cursor to change the line direction and length
    // dynamically. Instead we draw the (preview) line in a fake canvas that
    // overlay the drawing canvas.
    // We wait for the releaseToolAt callback to impact both the
    // frame model and canvas rendering.

    // The fake canvas where we will draw the preview of the line:
    // Drawing the first point of the line in the fake overlay canvas:
    overlay.setPixel(col, row, this.getToolColor());
  };

  ns.Line.prototype.moveToolAt = function(col, row, frame, overlay, event) {
    overlay.clear();

    var penSize = pskl.app.penSizeService.getPenSize();
    var isStraight = event.shiftKey;
    var color = this.getToolColor();
    if (color == Constants.TRANSPARENT_COLOR) {
      // When mousemoving the line tool, we draw in the canvas overlay above the drawing canvas.
      // If the line color is transparent, we won't be
      // able to see it during the movement.
      // We set it to a semi-opaque white during the tool mousemove allowing to see colors below the line.
      // When the line tool will be released, It will draw a transparent line,
      // eg deleting the equivalent of a line.
      color = Constants.SELECTION_TRANSPARENT_COLOR;
    }

    this.draw_(col, row, color, overlay, penSize, isStraight);
  };

  /**
   * @override
   */
  ns.Line.prototype.releaseToolAt = function(col, row, frame, overlay, event) {
    var penSize = pskl.app.penSizeService.getPenSize();
    var isStraight = event.shiftKey;
    var color = this.getToolColor();

    // The user released the tool to draw a line. We will compute the pixel coordinate, impact
    // the model and draw them in the drawing canvas (not the fake overlay anymore)
    this.draw_(col, row, color, frame, penSize, isStraight);

    // For now, we are done with the line tool and don't need an overlay anymore:
    overlay.clear();

    this.raiseSaveStateEvent({
      col : col,
      row : row,
      startCol : this.startCol,
      startRow : this.startRow,
      color : color,
      penSize : penSize,
      isStraight : isStraight
    });
  };

  ns.Line.prototype.draw_ = function (col, row, color, targetFrame, penSize, isStraight) {
    var linePixels;
    if (isStraight) {
      linePixels = pskl.PixelUtils.getUniformLinePixels(this.startCol, col, this.startRow, row);
    } else {
      linePixels = pskl.PixelUtils.getLinePixels(col, this.startCol, row, this.startRow);
    }

    //draw the square ends of the line
    pskl.PixelUtils.resizePixel(linePixels[0].col, linePixels[0].row, penSize)
      .forEach(function (point) {targetFrame.setPixel(point[0], point[1], color);});
    pskl.PixelUtils.resizePixel(linePixels[linePixels.length].col, linePixels[linePixels.length].row, penSize)
      .forEach(function (point) {targetFrame.setPixel(point[0], point[1],color);});

    //for each step along the line, draw an x centered on that pixel of size penSize
    linePixels.forEach(function (point) {
      for (var i = 0; i < penSize; i++) {
        targetFrame.setPixel(
          point.col - Math.floor(penSize / 2) + i, point.row - Math.floor(penSize / 2) + i, color
        );
        targetFrame.setPixel(
          point.col - Math.floor(penSize / 2) + i, point.row + Math.ceil(penSize / 2) - i - 1, color
        );
        //draw an additional x directly next to the first to prevent unwanted dithering
        if (i !== 0) {
          targetFrame.setPixel(
            point.col - Math.floor(penSize / 2) + i, point.row - Math.floor(penSize / 2) + i - 1, color
          );
          targetFrame.setPixel(
            point.col - Math.floor(penSize / 2) + i, point.row + Math.ceil(penSize / 2) - i, color
          );
        }
      }
    });
  };

  ns.Line.prototype.replay = function(frame, replayData) {
    this.startCol = replayData.startCol;
    this.startRow = replayData.startRow;
    this.draw_(replayData.col, replayData.row, replayData.color, frame, replayData.penSize, replayData.isStraight);
  };

})();
