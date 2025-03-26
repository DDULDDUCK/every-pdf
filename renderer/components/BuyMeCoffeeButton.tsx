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
      className="px-4 py-2 bg-[#FFDD00] text-gray-900 font-semibold rounded-lg hover:bg-[#FFED4A] transition-colors duration-200 flex items-center gap-2"
    >
        ☕  Buy me a coffee
    </a>
  );
}