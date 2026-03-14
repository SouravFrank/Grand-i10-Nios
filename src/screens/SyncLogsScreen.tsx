import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/useAppTheme';
import { clearSyncLogEntries, useSyncLogEntries } from '@/utils/syncLogger';

type Props = NativeStackScreenProps<AppStackParamList, 'SyncLogs'>;

export function SyncLogsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const logEntries = useSyncLogEntries();

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>SYNC DEBUG LOGS</Text>
        <Pressable onPress={clearSyncLogEntries} style={[styles.clearBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
          <Text style={[styles.clearText, { color: colors.textPrimary }]}>Clear</Text>
        </Pressable>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {logEntries.length === 0 ? (
          <View style={[styles.emptyState, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.emptyTitle, { color: colors.textPrimary }]}>No sync logs captured yet.</Text>
            <Text style={[styles.emptyCopy, { color: colors.textSecondary }]}>
              Trigger a sync or reopen the app, then long-press the version footer again.
            </Text>
          </View>
        ) : (
          logEntries.map((entry) => (
            <View
              key={entry.id}
              style={[
                styles.logCard,
                {
                  borderColor: colors.border,
                  backgroundColor: colors.card,
                },
              ]}>
              <Text
                style={[
                  styles.level,
                  {
                    color:
                      entry.level === 'error'
                        ? '#A30000'
                        : entry.level === 'warn'
                          ? colors.textSecondary
                          : colors.textPrimary,
                  },
                ]}>
                {entry.level.toUpperCase()}
              </Text>
              <Text style={[styles.line, { color: colors.textPrimary }]}>{entry.line}</Text>
            </View>
          ))
        )}
      </ScrollView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    gap: 8,
  },
  iconBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  clearBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  clearText: {
    fontSize: 12,
    fontWeight: '700',
  },
  content: {
    gap: 10,
    paddingBottom: 24,
  },
  emptyState: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  emptyCopy: {
    fontSize: 13,
    lineHeight: 19,
  },
  logCard: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    gap: 8,
  },
  level: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  line: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
