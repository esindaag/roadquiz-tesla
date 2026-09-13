const countryPacks = {
  TR: require('./tr/config')
};

function normalizeCountryCode(code='TR') {
  return String(code || 'TR').trim().toUpperCase();
}

function getCountryPack(code='TR') {
  const normalized = normalizeCountryCode(code);
  return countryPacks[normalized] || countryPacks.TR;
}

function listCountryPacks({ enabledOnly = true } = {}) {
  return Object.values(countryPacks).filter(pack => !enabledOnly || pack.enabled);
}

module.exports = {
  DEFAULT_COUNTRY: 'TR',
  countryPacks,
  normalizeCountryCode,
  getCountryPack,
  listCountryPacks
};
