"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
} from "react";
import {
  type CountryCode,
  type MarketConfig,
  DEFAULT_COUNTRY,
  detectCountryCode,
  getMarket,
  COUNTRY_OPTIONS,
} from "@/lib/commerce/market";

interface MarketContextValue {
  country: CountryCode;
  market: MarketConfig;
  setCountry: (code: CountryCode) => void;
  countryOptions: typeof COUNTRY_OPTIONS;
}

const MarketContext = createContext<MarketContextValue | null>(null);

export function MarketContextProvider({ children }: { children: React.ReactNode }) {
  const [country, setCountryState] = useState<CountryCode>(DEFAULT_COUNTRY);

  useEffect(() => {
    setCountryState(detectCountryCode());
  }, []);

  const setCountry = useCallback((code: CountryCode) => {
    setCountryState(code);
    localStorage.setItem("dora_market_country", code);
  }, []);

  const market = getMarket(country);

  return (
    <MarketContext.Provider
      value={{
        country,
        market,
        setCountry,
        countryOptions: COUNTRY_OPTIONS,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket(): MarketContextValue {
  const ctx = useContext(MarketContext);
  if (!ctx) {
    throw new Error("useMarket must be used within MarketContextProvider");
  }
  return ctx;
}
