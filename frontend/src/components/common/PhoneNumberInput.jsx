import { useMemo } from "react";
import { useController } from "react-hook-form";

import {
  getCountryOptions,
  parsePastedInternationalNumber,
} from "../../utils/phoneNumber";

export default function PhoneNumberInput({
  control,
  countryName = "phone_country",
  nationalNumberName = "national_phone_number",
  disabled = false,
}) {
  const countryOptions = useMemo(() => getCountryOptions(), []);
  const {
    field: countryField,
    fieldState: { error: countryError },
  } = useController({ control, name: countryName });
  const {
    field: nationalNumberField,
    fieldState: { error: nationalNumberError },
  } = useController({ control, name: nationalNumberName });

  function handlePaste(event) {
    const parsed = parsePastedInternationalNumber(event.clipboardData.getData("text"));

    if (!parsed) {
      return;
    }

    event.preventDefault();
    countryField.onChange(parsed.country);
    nationalNumberField.onChange(parsed.nationalNumber);
  }

  return (
    <div className="phone-input">
      <label className="field" htmlFor={`${countryName}-select`}>
        <span className="field-label">Country/region code</span>
        <select
          id={`${countryName}-select`}
          className={countryError ? "input input-error" : "input"}
          disabled={disabled}
          name={countryField.name}
          onBlur={countryField.onBlur}
          onChange={countryField.onChange}
          ref={countryField.ref}
          value={countryField.value || ""}
        >
          {countryOptions.map((country) => (
            <option key={country.value} value={country.value}>
              {country.label}
            </option>
          ))}
        </select>
        {countryError ? <span className="field-error" role="alert">{countryError.message}</span> : null}
      </label>

      <label className="field" htmlFor={`${nationalNumberName}-input`}>
        <span className="field-label">Phone number</span>
        <input
          id={`${nationalNumberName}-input`}
          autoComplete="tel-national"
          className={nationalNumberError ? "input input-error" : "input"}
          disabled={disabled}
          inputMode="tel"
          name={nationalNumberField.name}
          onBlur={nationalNumberField.onBlur}
          onChange={nationalNumberField.onChange}
          onPaste={handlePaste}
          placeholder="Local/national number"
          ref={nationalNumberField.ref}
          type="tel"
          value={nationalNumberField.value || ""}
        />
        {nationalNumberError ? <span className="field-error" role="alert">{nationalNumberError.message}</span> : null}
      </label>
    </div>
  );
}
