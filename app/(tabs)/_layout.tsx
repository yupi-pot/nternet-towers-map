import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { DataSourceProvider } from '@/src/context/DataSourceContext';
import { TowersProvider } from '@/src/context/TowersContext';

export default function TabLayout() {
  return (
    <DataSourceProvider>
    <TowersProvider>
      <NativeTabs tintColor="#3b82f6">
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'map', selected: 'map.fill' }} />
          <Label>Map</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="two">
          <Icon sf={{ default: 'list.bullet', selected: 'list.bullet' }} />
          <Label>List</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TowersProvider>
    </DataSourceProvider>
  );
}
