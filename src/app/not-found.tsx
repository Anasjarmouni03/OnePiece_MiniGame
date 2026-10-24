'use client';
import dynamic from 'next/dynamic';

const NotFound = dynamic(() => import('@/views/NotFound').then((m) => m.NotFound), { ssr: false });

export default function Page() {
  return <NotFound />;
}
