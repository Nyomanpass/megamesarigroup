const removeStyleMarkers = (value) =>
  String(value || "")
    .replace(/\((bold|tebal)\)/gi, "")
    .replace(/\((garis bawah|underline)\)/gi, "")
    .replace(/\s+/g, " ")
    .trim();

export const getTtdTextStyle = (value, defaults = {}) => {
  const rawValue = String(value || "");

  return {
    text: removeStyleMarkers(rawValue),
    bold: defaults.bold || /\((bold|tebal)\)/i.test(rawValue),
    underline:
      defaults.underline ||
      /\((garis bawah|underline)\)/i.test(rawValue)
  };
};

export const applyTtdCellText = (cell, value, options = {}) => {
  const style = getTtdTextStyle(value, options);

  cell.value = style.text;
  cell.font = {
    ...(cell.font || {}),
    bold: style.bold || undefined,
    underline: style.underline || undefined
  };

  return cell;
};
