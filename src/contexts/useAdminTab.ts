import { useContext } from 'react';
import { AdminTabContext } from './AdminTabContextDef';

export function useAdminTab() {
  return useContext(AdminTabContext);
}
