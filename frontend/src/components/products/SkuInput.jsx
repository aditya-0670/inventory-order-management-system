import { useEffect, useMemo, useState } from "react";
import { useController } from "react-hook-form";

import { useSkuAvailability, useSkuSuggestions } from "../../hooks/useProducts";
import { useDebounce } from "../../hooks/useDebounce";
import { isValidSkuFormat, normalizeSkuInput } from "../../utils/sku";

export default function SkuInput({
  control,
  productName,
  currentProductId,
  currentSku = "",
  disabled = false,
}) {
  const [hiddenSuggestionsForName, setHiddenSuggestionsForName] = useState("");
  const {
    field,
    fieldState: { error },
  } = useController({ control, name: "sku" });
  const productNameKey = String(productName || "").trim();
  const debouncedProductName = useDebounce(productName, 400);
  const debouncedSku = useDebounce(field.value, 400);
  const normalizedCurrentSku = normalizeSkuInput(currentSku).replace(/^-+|-+$/g, "");
  const normalizedDebouncedSku = normalizeSkuInput(debouncedSku).replace(/^-+|-+$/g, "");
  const skuCanBeChecked = isValidSkuFormat(normalizedDebouncedSku) && normalizedDebouncedSku !== normalizedCurrentSku;
  const suggestions = useSkuSuggestions(debouncedProductName, 2, Boolean(debouncedProductName?.trim()));
  const availability = useSkuAvailability(normalizedDebouncedSku, currentProductId, skuCanBeChecked);
  const visibleSuggestions = useMemo(() => {
    if (!productNameKey || hiddenSuggestionsForName === productNameKey) {
      return [];
    }

    return (suggestions.data?.suggestions ?? []).slice(0, 2);
  }, [hiddenSuggestionsForName, productNameKey, suggestions.data?.suggestions]);
  const isGeneratingSuggestions = Boolean(productNameKey) && suggestions.isFetching;
  const shouldShowSuggestions = !suggestions.isFetching && visibleSuggestions.length > 0;

  useEffect(() => {
    if (!productNameKey) {
      setHiddenSuggestionsForName("");
    }
  }, [productNameKey]);

  function handleChange(event) {
    field.onChange(normalizeSkuInput(event.target.value));
  }

  function handleSuggestionClick(sku) {
    field.onChange(sku);
    setHiddenSuggestionsForName(productNameKey);
  }

  return (
    <div className="sku-field">
      <div className="sku-input-wrapper">
        <label className="field" htmlFor="product-sku">
          <span className="field-label">SKU</span>
          <input
            id="product-sku"
            className={error ? "input input-error" : "input"}
            disabled={disabled}
            name={field.name}
            onBlur={field.onBlur}
            onChange={handleChange}
            ref={field.ref}
            value={field.value || ""}
          />
          {error ? <span className="field-error" role="alert">{error.message}</span> : null}
        </label>
      </div>

      <div className="sku-helper">
        {isGeneratingSuggestions ? <p className="sku-status">Generating SKU suggestions...</p> : null}
        {shouldShowSuggestions ? (
          <>
            <p className="sku-status">Select a suggested SKU or enter your own.</p>
            <div className="sku-suggestions" aria-label="SKU suggestions">
              {visibleSuggestions.map((suggestion) => (
                <button
                  className="sku-suggestion-chip"
                  disabled={disabled}
                  key={suggestion.sku}
                  onClick={() => handleSuggestionClick(suggestion.sku)}
                  type="button"
                >
                  {suggestion.sku}
                </button>
              ))}
            </div>
          </>
        ) : null}
        {availability.isFetching ? <p className="sku-status">Checking SKU availability...</p> : null}
        {!availability.isFetching && availability.isError ? <p className="sku-status">Unable to verify SKU availability right now.</p> : null}
        {!availability.isFetching && availability.data?.available ? <p className="sku-status sku-ok">SKU available</p> : null}
        {!availability.isFetching && availability.data?.available === false ? <p className="sku-status sku-error">SKU already exists</p> : null}
      </div>
    </div>
  );
}
