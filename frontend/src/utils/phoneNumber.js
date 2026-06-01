import {
  getCountries,
  getCountryCallingCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js";

const FALLBACK_COUNTRY = "IN";

function normalizeCountry(countryIso2) {
  return String(countryIso2 || "").trim().toUpperCase();
}

function isSupportedCountry(countryIso2) {
  return getCountries().includes(normalizeCountry(countryIso2));
}

function getBrowserLocaleRegion() {
  const languages = globalThis.navigator?.languages?.length
    ? globalThis.navigator.languages
    : [globalThis.navigator?.language].filter(Boolean);

  for (const language of languages) {
    try {
      const region = new Intl.Locale(language).region;
      if (region && isSupportedCountry(region)) {
        return region;
      }
    } catch {
      const match = String(language).match(/[-_]([A-Za-z]{2})\b/);
      if (match && isSupportedCountry(match[1])) {
        return normalizeCountry(match[1]);
      }
    }
  }

  return null;
}

export function getDefaultCountry() {
  const browserCountry = getBrowserLocaleRegion();
  if (browserCountry) {
    return browserCountry;
  }

  const envCountry = normalizeCountry(import.meta.env.VITE_DEFAULT_COUNTRY);
  if (isSupportedCountry(envCountry)) {
    return envCountry;
  }

  return FALLBACK_COUNTRY;
}

export function formatCountryOptionLabel(countryIso2) {
  const country = normalizeCountry(countryIso2);
  let countryName = country;

  try {
    countryName = new Intl.DisplayNames([globalThis.navigator?.language || "en"], {
      type: "region",
    }).of(country) || country;
  } catch {
    countryName = country;
  }

  return `${countryName} (${country}) +${getCountryCallingCode(country)}`;
}

export function getCountryOptions() {
  return getCountries()
    .map((country) => ({
      value: country,
      label: formatCountryOptionLabel(country),
      dialCode: `+${getCountryCallingCode(country)}`,
    }))
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function parsePastedInternationalNumber(value) {
  const parsed = parsePhoneNumberFromString(String(value || "").trim());

  if (!parsed?.country || !parsed.isPossible() || !parsed.isValid()) {
    return null;
  }

  return {
    country: parsed.country,
    nationalNumber: parsed.nationalNumber,
    e164: parsed.number,
  };
}

export function getPhoneFormValuesFromE164(value) {
  const parsed = parsePastedInternationalNumber(value);

  if (!parsed) {
    return {
      phone_country: getDefaultCountry(),
      national_phone_number: "",
    };
  }

  return {
    phone_country: parsed.country,
    national_phone_number: parsed.nationalNumber,
  };
}

export function validateAndFormatPhoneNumber(nationalNumber, countryIso2) {
  const value = String(nationalNumber || "").trim();
  const country = normalizeCountry(countryIso2);

  if (!value) {
    return {
      isValid: false,
      error: "Phone number is required.",
    };
  }

  if (/[A-Za-z]/.test(value)) {
    return {
      isValid: false,
      error: "Enter a valid phone number for the selected country.",
    };
  }

  const parsed = value.startsWith("+")
    ? parsePhoneNumberFromString(value)
    : parsePhoneNumberFromString(value, country);

  if (!parsed?.isPossible() || !parsed.isValid()) {
    return {
      isValid: false,
      error: "Enter a valid phone number for the selected country.",
    };
  }

  return {
    isValid: true,
    e164: parsed.number,
    country: parsed.country || country,
    nationalNumber: parsed.nationalNumber,
  };
}
