'use client';
import dynamic from 'next/dynamic';

const Qr = dynamic(
  () => Promise.all([import('@/components/layout/StaffGate'), import('@/views/QrPage')]).then(
    ([g, p]) => () => <g.StaffGate><p.QrPage /></g.StaffGate>,
  ),
  { ssr: false },
);

export default function Page() {
  return <Qr />;
}
