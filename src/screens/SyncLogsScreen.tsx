import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import * as Clipboard from 'expo-clipboard';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/ScreenContainer';
import type { AppStackParamList } from '@/navigation/types';
import { useAppTheme } from '@/theme/useAppTheme';
import { clearSyncLogEntries, useSyncLogEntries } from '@/utils/syncLogger';

type Props = NativeStackScreenProps<AppStackParamList, 'SyncLogs'>;

export function SyncLogsScreen({ navigation }: Props) {
  const { colors } = useAppTheme();
  const logEntries = useSyncLogEntries();

  const handleCopyAll = async () => {
    if (logEntries.length === 0) {
      Alert.alert('Nothing to copy', 'No sync logs are available yet.');
      return;
    }

    const payload = logEntries
      .slice()
      .reverse()
      .map((entry) => `[${entry.level.toUpperCase()}] ${entry.line}`)
      .join('\n');

    try {
      await Clipboard.setStringAsync(payload);
      Alert.alert('Copied', `${logEntries.length} sync log ${logEntries.length === 1 ? 'entry' : 'entries'} copied to clipboard.`);
    } catch {
      Alert.alert('Copy failed', 'Could not copy sync logs.');
    }
  };

  const handleCopyEntry = async (line: string) => {
    try {
      await Clipboard.setStringAsync(line);
      Alert.alert('Copied', 'Sync log line copied to clipboard.');
    } catch {
      Alert.alert('Copy failed', 'Could not copy this sync log line.');
    }
  };

  return (
    <ScreenContainer>
      <View style={styles.headerRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.iconBtn}>
          <MaterialIcons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={[styles.title, { color: colors.textPrimary }]}>SYNC DEBUG LOGS</Text>
        <View style={styles.headerActions}>
          <Pressable onPress={() => void handleCopyAll()} style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <MaterialIcons name="content-copy" size={16} color={colors.textPrimary} />
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Copy</Text>
          </Pressable>
          <Pressable onPress={clearSyncLogEntries} style={[styles.actionBtn, { borderColor: colors.border, backgroundColor: colors.card }]}>
            <Text style={[styles.actionText, { color: colors.textPrimary }]}>Clear</Text>
          </Pressable>
        </View>
      </View>

      <View style={[styles.tipCard, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
        <MaterialIcons name="info-outline" size={16} color={colors.textSecondary} />
        <Text style={[styles.tipText, { color: colors.textSecondary }]}>
          Use Copy for the full log dump, or copy an individual line from any log card.
        </Text>
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
              <View style={styles.logHeader}>
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
                <Pressable
                  onPress={() => void handleCopyEntry(entry.line)}
                  style={[styles.copyChip, { borderColor: colors.border, backgroundColor: colors.backgroundSecondary }]}>
                  <MaterialIcons name="content-copy" size={14} color={colors.textPrimary} />
                  <Text style={[styles.copyChipText, { color: colors.textPrimary }]}>Copy line</Text>
                </Pressable>
              </View>
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
    flexWrap: 'wrap',
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tipCard: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  tipText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
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
  logHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    flexWrap: 'wrap',
  },
  level: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.9,
  },
  copyChip: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  copyChipText: {
    fontSize: 11,
    fontWeight: '700',
  },
  line: {
    fontSize: 12,
    lineHeight: 18,
    fontFamily: 'monospace',
  },
});
