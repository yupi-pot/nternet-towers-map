import { Icon, Label, NativeTabs } from 'expo-router/unstable-native-tabs';

import { DataSourceProvider } from '@/src/context/DataSourceContext';
import { TowersProvider } from '@/src/context/TowersContext';

export default function TabLayout() {
  return (
    <DataSourceProvider>
    <TowersProvider>
      <NativeTabs tintColor="#1c1c1e" inactiveTintColor="#9ca3af">
        <NativeTabs.Trigger name="index">
          <Icon sf={{ default: 'map', selected: 'map.fill' }} />
          <Label>Map</Label>
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="two">
          <Icon sf={{ default: 'rectangle.grid.1x2', selected: 'rectangle.grid.1x2.fill' }} />
          <Label>List</Label>
        </NativeTabs.Trigger>
      </NativeTabs>
    </TowersProvider>
    </DataSourceProvider>
  );
}
