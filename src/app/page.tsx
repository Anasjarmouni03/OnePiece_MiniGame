'use client';
import dynamic from 'next/dynamic';

const MapPage = dynamic(() => import('@/views/MapPage').then((m) => m.MapPage), { ssr: false });

export default function Page() {
  return <MapPage />;
}
