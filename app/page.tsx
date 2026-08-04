'use client';

import dynamic from 'next/dynamic';

const Dashboard = dynamic(() => import('@/components/Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-8 h-8 border-2 border-white/20 border-t-white animate-spin rounded-full" />
        <span className="text-[10px] uppercase tracking-widest text-white/50 font-bold">Loading Engine...</span>
      </div>
    </div>
  )
});

export default function Page() {
  return <Dashboard />;
}
