import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { ReportTab } from '../../reportUtils';
import { styles } from './TabNavigator.styles';

interface TabNavigatorProps {
  activeTab: ReportTab;
  onTabChange: (tab: ReportTab) => void;
  surfaceColor: string;
}

export function TabNavigator({ activeTab, onTabChange, surfaceColor }: TabNavigatorProps) {
  const { colors, isDark } = useAppTheme();
  
  // A dedicated smooth background for the whole segmented control
  const shellBgColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)';

  return (
    <View style={[styles.tabShell, { backgroundColor: shellBgColor }]}>
      <Pressable
        onPress={() => onTabChange('trip')}
        style={[
          styles.tabButton,
          activeTab === 'trip' && styles.tabButtonActive,
          {
            backgroundColor: activeTab === 'trip' ? colors.textPrimary : 'transparent',
          },
        ]}
      >
        <View style={styles.tabInner}>
          <MaterialIcons 
            name="directions-car" 
            size={16} 
            color={activeTab === 'trip' ? colors.invertedText : colors.textPrimary} 
          />
          <Text style={[styles.tabText, { color: activeTab === 'trip' ? colors.invertedText : colors.textPrimary }]}>
            Trip
          </Text>
        </View>
      </Pressable>

      <Pressable
        onPress={() => onTabChange('others')}
        style={[
          styles.tabButton,
          activeTab === 'others' && styles.tabButtonActive,
          {
            backgroundColor: activeTab === 'others' ? colors.textPrimary : 'transparent',
          },
        ]}
      >
        <View style={styles.tabInner}>
          <MaterialIcons 
            name="receipt-long" 
            size={16} 
            color={activeTab === 'others' ? colors.invertedText : colors.textPrimary} 
          />
          <Text style={[styles.tabText, { color: activeTab === 'others' ? colors.invertedText : colors.textPrimary }]}>
            Others
          </Text>
        </View>
      </Pressable>
    </View>
  );
}