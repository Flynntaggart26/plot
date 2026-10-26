import React from 'react';
import { WipScreen } from '@/ui/components/SubHeader';
import { useLocalSearchParams } from 'expo-router';

export default function NoteDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <WipScreen title="Not" note={`Not düzenleyici hafta 4'te kurulacak. (id: ${id ?? '—'})`} />;
}
