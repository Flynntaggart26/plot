import React from 'react';
import { WipScreen } from '@/ui/components/SubHeader';
import { useLocalSearchParams } from 'expo-router';

export default function IdeaDetail() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <WipScreen title="Fikir" note={`Fikir kartı detayı hafta 7'de kurulacak. (id: ${id ?? '—'})`} />;
}
