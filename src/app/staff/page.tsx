'use client';
import dynamic from 'next/dynamic';

const Staff = dynamic(
  () => Promise.all([import('@/components/layout/StaffGate'), import('@/views/StaffPage')]).then(
    ([g, p]) => () => <g.StaffGate><p.StaffPage /></g.StaffGate>,
  ),
  { ssr: false },
);

export default function Page() {
  return <Staff />;
}
