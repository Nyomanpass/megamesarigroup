const colWidthToPx = (width) => Math.floor((width || 8.43) * 7 + 5);
const rowHeightToPx = (height) => Math.floor((height || 15) * 96 / 72);

const getBoxWidthPx = (sheet, startCol, endCol) => {
  let total = 0;
  for (let col = startCol; col <= endCol; col++) {
    total += colWidthToPx(sheet.getColumn(col).width);
  }
  return total;
};

const getBoxHeightPx = (sheet, startRow, endRow) => {
  let total = 0;
  for (let row = startRow; row <= endRow; row++) {
    total += rowHeightToPx(sheet.getRow(row).height);
  }
  return total;
};

const getTopLeftFromOffset = (sheet, startCol, startRow, offsetX, offsetY) => {
  let col = startCol;
  let row = startRow;
  let remainingX = offsetX;
  let remainingY = offsetY;
  let colWidth = colWidthToPx(sheet.getColumn(col).width);
  let rowHeight = rowHeightToPx(sheet.getRow(row).height);

  while (remainingX > colWidth && colWidth > 0) {
    remainingX -= colWidth;
    col++;
    colWidth = colWidthToPx(sheet.getColumn(col).width);
  }

  while (remainingY > rowHeight && rowHeight > 0) {
    remainingY -= rowHeight;
    row++;
    rowHeight = rowHeightToPx(sheet.getRow(row).height);
  }

  return {
    col: col - 1 + remainingX / colWidth,
    row: row - 1 + remainingY / rowHeight
  };
};

export const getCenteredImagePlacement = ({
  sheet,
  startCol,
  endCol,
  startRow,
  endRow,
  widthPx,
  heightPx,
  paddingPx = 6
}) => {
  const boxWidth = getBoxWidthPx(sheet, startCol, endCol);
  const boxHeight = getBoxHeightPx(sheet, startRow, endRow);
  const maxWidth = Math.max(1, boxWidth - paddingPx * 2);
  const maxHeight = Math.max(1, boxHeight - paddingPx * 2);
  const scale = Math.min(1, maxWidth / widthPx, maxHeight / heightPx);
  const imageWidth = Math.round(widthPx * scale);
  const imageHeight = Math.round(heightPx * scale);
  const offsetX = Math.max(paddingPx, (boxWidth - imageWidth) / 2);
  const offsetY = Math.max(paddingPx, (boxHeight - imageHeight) / 2);

  return {
    tl: getTopLeftFromOffset(sheet, startCol, startRow, offsetX, offsetY),
    ext: {
      width: imageWidth,
      height: imageHeight
    },
    editAs: "oneCell"
  };
};
