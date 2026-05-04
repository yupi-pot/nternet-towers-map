import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTranslation } from 'react-i18next';

import { DataSourceProvider } from '@/src/context/DataSourceContext';
import { TowersProvider } from '@/src/context/TowersContext';

export default function TabLayout() {
  const { t } = useTranslation();
  return (
    <DataSourceProvider>
    <TowersProvider>
      <NativeTabs tintColor="#1c1c1e" inactiveTintColor="#9ca3af">
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'map', selected: 'map.fill' }} />
          <Label>{t('tabs.map')}</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="two">
          <Icon sf={{ default: 'rectangle.grid.1x2', selected: 'rectangle.grid.1x2.fill' }} />
          <Label>{t('tabs.list')}</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TowersProvider>
    </DataSourceProvider>
  );
}
