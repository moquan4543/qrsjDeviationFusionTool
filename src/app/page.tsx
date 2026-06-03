'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Analytics } from "@vercel/analytics/next"
export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/zh-TW');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="animate-pulse text-indigo-600 font-medium">Redirecting...</div>
      <Analytics />
    </div>
  );
}
