import { useSyncBootstrap } from '@/hooks/useSyncBootstrap';

export function useAppInitialization() {
  useSyncBootstrap();
}
