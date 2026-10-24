'use client';
import dynamic from 'next/dynamic';

const CheckinPage = dynamic(() => import('@/views/CheckinPage').then((m) => m.CheckinPage), { ssr: false });

export default function Page() {
  return <CheckinPage />;
}
