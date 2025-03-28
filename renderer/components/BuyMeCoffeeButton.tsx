import React, { useEffect, useState } from 'react';

export default function BuyMeCoffeeButton() {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return null;
  }

  return (
    <a
      href="https://www.buymeacoffee.com/dduldduck"
      target="_blank"
      rel="noopener noreferrer"
      className="coffee-button"
    >
        ☕  Buy me a coffee
    </a>
  );
}