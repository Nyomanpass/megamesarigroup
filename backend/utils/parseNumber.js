export const parseNumber = (value) => {
  if (value === null || value === undefined) return 0;

  let clean = String(value).trim();
  if (clean === "") return 0;

  if (clean.includes(",") && clean.includes(".")) {
    if (clean.indexOf(",") > clean.indexOf(".")) {
      // format indo: 175.111,53
      clean = clean.replace(/\./g, "").replace(",", ".");
    } else {
      // format US: 175,111.53
      clean = clean.replace(/,/g, "");
    }
  } else {
    clean = clean.replace(/,/g, "");
  }

  const result = parseFloat(clean);
  return isNaN(result) ? 0 : result;
};