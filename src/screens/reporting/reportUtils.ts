import { ComponentProps } from 'react';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { ReportSection } from '@/screens/reporting/reportCalculations';

export type MaterialIconName = ComponentProps<typeof MaterialIcons>['name'];
export type DateTarget = 'from' | 'to';
export type ReportFilterMode = 'month' | 'range';
export type ReportTab = 'trip' | 'others';

export function formatINR(value: number): string {
  if (!Number.isFinite(value)) return '₹0';
  return `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export function formatLiters(value: number): string {
  if (!Number.isFinite(value)) return '0 L';
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })} L`;
}

export function formatKm(value: number): string {
  if (!Number.isFinite(value)) return '0 km';
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km`;
}

export function formatMileage(value: number): string {
  if (!Number.isFinite(value)) return '--';
  return `${value.toLocaleString('en-IN', { maximumFractionDigits: 1 })} km/l`;
}

export function getOtherSectionIcon(sectionKey: ReportSection['key']): MaterialIconName {
  if (sectionKey === 'toll') return 'toll';
  if (sectionKey === 'repairs') return 'build';
  return 'receipt';
}
