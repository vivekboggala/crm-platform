"use client";
import React, { useState, useEffect } from "react";
import PhoneInput, { isValidPhoneNumber, type Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";

interface PhoneInputFieldProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  id?: string;
}

/**
 * Auto-detect user's country from browser timezone.
 * Falls back to "US" if detection fails.
 */
function detectCountry(): Country {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "";
    const tzMap: Record<string, Country> = {
      "Asia/Kolkata": "IN", "Asia/Calcutta": "IN",
      "America/New_York": "US", "America/Chicago": "US", "America/Denver": "US", "America/Los_Angeles": "US",
      "Europe/London": "GB", "Europe/Paris": "FR", "Europe/Berlin": "DE",
      "Asia/Tokyo": "JP", "Asia/Shanghai": "CN", "Asia/Dubai": "AE",
      "Australia/Sydney": "AU", "America/Toronto": "CA", "America/Sao_Paulo": "BR",
      "Asia/Singapore": "SG", "Asia/Seoul": "KR",
    };
    // Try exact match first
    if (tzMap[tz]) return tzMap[tz];
    // Try region prefix
    if (tz.startsWith("Asia/Kolkata") || tz.startsWith("Asia/Calcutta")) return "IN";
    if (tz.startsWith("America/")) return "US";
    if (tz.startsWith("Europe/")) return "GB";
    if (tz.startsWith("Australia/")) return "AU";
  } catch {}
  return "US";
}

export default function PhoneInputField({ value, onChange, placeholder, id }: PhoneInputFieldProps) {
  const [country, setCountry] = useState<Country>("US");
  const [error, setError] = useState("");

  useEffect(() => {
    setCountry(detectCountry());
  }, []);

  const handleChange = (val: string | undefined) => {
    const phoneVal = val || "";
    onChange(phoneVal);

    // Validate only if user typed something
    if (phoneVal && phoneVal.length > 3) {
      if (!isValidPhoneNumber(phoneVal)) {
        setError("Invalid phone number for selected country");
      } else {
        setError("");
      }
    } else {
      setError("");
    }
  };

  return (
    <div className="phone-input-wrapper">
      <PhoneInput
        id={id}
        international
        countryCallingCodeEditable={false}
        defaultCountry={country}
        value={value || ""}
        onChange={handleChange}
        placeholder={placeholder || "+1 555 0123"}
        className="phone-input-field"
      />
      {error && (
        <div style={{ color: "var(--danger)", fontSize: "0.75rem", marginTop: 4 }}>
          {error}
        </div>
      )}
    </div>
  );
}
