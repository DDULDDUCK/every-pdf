import React from 'react'
import type { AppProps } from 'next/app'
import { I18nextProvider } from 'react-i18next';
import i18n from '../i18n';
import { useEffect, useState } from 'react';

import '../styles/globals.css'

function MyApp({ Component, pageProps }: AppProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <I18nextProvider i18n={i18n}>
      <Component {...pageProps} />
    </I18nextProvider>
  );
}

export default MyApp
