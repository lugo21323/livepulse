'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // For now, redirect to the join page
    router.replace('/join');
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-lp-bg">
      <div className="text-center">
        <div className="w-[72px] h-[72px] rounded-[18px] bg-gradient-to-br from-lp-accent to-lp-pink flex items-center justify-center mx-auto mb-5 text-3xl shadow-[0_8px_32px_rgba(108,92,231,0.3)]">
          ⚡
        </div>
        <h1 className="text-3xl font-bold tracking-tight">LivePulse</h1>
        <p className="text-lp-muted mt-2">Loading...</p>
      </div>
    </div>
  );
}
