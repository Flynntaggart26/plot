import React, { useState } from 'react';
import { View } from 'react-native';
import { SubHeader } from '@/ui/components/SubHeader';
import { useTheme } from '@/ui/theme';
import { dismissToRoot } from '@/lib/navigation';
import { toast } from '@/lib/toast';
import { IdeaForm, type IdeaFormValues } from '@/features/ideas/IdeaForm';
import { useCreateIdea } from '@/features/ideas/queries';

/**
 * Hızlı fikir yakalama. Fikir her zaman "kıvılcım" olarak doğar;
 * durum seçimi detay ekranında yapılır.
 */
export default function NewIdeaScreen() {
  const { c } = useTheme();
  const create = useCreateIdea();
  const [error, setError] = useState<string | null>(null);

  const submit = (values: IdeaFormValues) => {
    setError(null);
    create.mutate(
      {
        title: values.title,
        body: values.body,
        firstStep: values.firstStep,
        status: 'spark',
      },
      {
        onSuccess: () => {
          toast('Fikir yakalandı');
          dismissToRoot();
        },
        onError: (cause) => {
          setError(cause instanceof Error ? cause.message : 'Fikir kaydedilemedi.');
        },
      },
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: c.bg }}>
      <SubHeader title="Yeni fikir" subtitle="Yakala, sonra düşün." />
      <IdeaForm
        submitLabel="Fikri kaydet"
        onSubmit={submit}
        busy={create.isPending}
        error={error}
      />
    </View>
  );
}
