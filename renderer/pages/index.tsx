import React, { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function IndexPage() {
  const router = useRouter();

  useEffect(() => {
    router.push('/welcome');
  }, [router]);

  return null;
}
