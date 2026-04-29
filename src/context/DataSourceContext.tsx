import React, { createContext, useContext, useState } from 'react';

export type DataSource = 'opencellid' | 'supabase';

interface DataSourceContextValue {
  dataSource: DataSource;
  setDataSource: (src: DataSource) => void;
}

const DataSourceContext = createContext<DataSourceContextValue>({
  dataSource: 'opencellid',
  setDataSource: () => {},
});

export function DataSourceProvider({ children }: { children: React.ReactNode }) {
  const [dataSource, setDataSource] = useState<DataSource>('supabase');
  return (
    <DataSourceContext.Provider value={{ dataSource, setDataSource }}>
      {children}
    </DataSourceContext.Provider>
  );
}

export function useDataSource() {
  return useContext(DataSourceContext);
}
