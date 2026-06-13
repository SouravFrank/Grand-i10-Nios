import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Animated, BackHandler, Easing, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useAppTheme } from '@/theme/useAppTheme';

type AppAlertButtonStyle = 'default' | 'cancel' | 'destructive';

export type AppAlertButton = {
  text?: string;
  onPress?: (value?: string) => void;
  style?: AppAlertButtonStyle;
  isPreferred?: boolean;
};

export type AppAlertOptions = {
  cancelable?: boolean;
  onDismiss?: () => void;
  userInterfaceStyle?: 'unspecified' | 'light' | 'dark';
};

type AppAlertRequest = {
  id: number;
  title: string;
  message?: string;
  buttons: AppAlertButton[];
  options?: AppAlertOptions;
};

type AppAlertIntent = 'success' | 'danger' | 'warning' | 'info';
type AppAlertHost = {
  id: number;
  priority: number;
  push: (request: AppAlertRequest) => void;
};
type MaterialIconName = keyof typeof MaterialIcons.glyphMap;

const pendingAlerts: AppAlertRequest[] = [];
const alertHosts = new Map<number, AppAlertHost>();
let nextAlertId = 1;
let nextHostId = 1;

function normalizeButtons(buttons?: AppAlertButton[]): AppAlertButton[] {
  if (!buttons || buttons.length === 0) {
    return [{ text: 'OK', style: 'default' }];
  }

  return buttons.map((button) => ({ ...button, text: button.text ?? 'OK' }));
}

function getTopAlertHost() {
  return Array.from(alertHosts.values()).sort((left, right) => {
    if (left.priority !== right.priority) {
      return right.priority - left.priority;
    }

    return right.id - left.id;
  })[0];
}

function flushPendingAlerts() {
  const host = getTopAlertHost();
  if (!host) {
    return;
  }

  while (pendingAlerts.length > 0) {
    const request = pendingAlerts.shift();
    if (request) host.push(request);
  }
}

function registerAppAlertHost(push: (request: AppAlertRequest) => void, priority: number) {
  const id = nextHostId;
  nextHostId += 1;

  alertHosts.set(id, { id, priority, push });
  flushPendingAlerts();

  return () => {
    alertHosts.delete(id);
    flushPendingAlerts();
  };
}

export const AppAlert = {
  alert(title: string, message?: string, buttons?: AppAlertButton[], options?: AppAlertOptions) {
    const request: AppAlertRequest = {
      id: nextAlertId,
      title,
      message,
      buttons: normalizeButtons(buttons),
      options,
    };

    nextAlertId += 1;

    const host = getTopAlertHost();

    if (!host) {
      pendingAlerts.push(request);
      return;
    }

    host.push(request);
  },
};

function getAlertIntent(alert: AppAlertRequest): AppAlertIntent {
  const title = alert.title.toLowerCase();
  const message = alert.message?.toLowerCase() ?? '';
  const hasDestructiveAction = alert.buttons.some((button) => button.style === 'destructive');

  if (hasDestructiveAction || title.includes('delete') || title.includes('remove')) {
    return 'danger';
  }

  if (
    title.includes('copied') ||
    title.includes('uploaded') ||
    title.includes('saved') ||
    title.includes('ready')
  ) {
    return 'success';
  }

  if (
    title.includes('error') ||
    title.includes('failed') ||
    title.includes('invalid') ||
    title.includes('unavailable') ||
    title.includes('expired') ||
    title.includes('not supported') ||
    title.includes('nothing') ||
    message.includes('could not') ||
    message.includes('failed')
  ) {
    return 'warning';
  }

  return 'info';
}

function getIntentMeta(intent: AppAlertIntent): { accent: string; icon: MaterialIconName; label: string } {
  if (intent === 'danger') {
    return { accent: '#EF4444', icon: 'delete-outline', label: 'Confirmation' };
  }

  if (intent === 'success') {
    return { accent: '#10B981', icon: 'check-circle-outline', label: 'Success' };
  }

  if (intent === 'warning') {
    return { accent: '#F59E0B', icon: 'error-outline', label: 'Attention' };
  }

  return { accent: '#3B82F6', icon: 'info-outline', label: 'Notice' };
}

type AppAlertProviderProps = {
  priority?: number;
};

export function AppAlertProvider({ priority = 0 }: AppAlertProviderProps) {
  const { colors, isDark } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [queue, setQueue] = useState<AppAlertRequest[]>([]);
  const [activeAlert, setActiveAlert] = useState<AppAlertRequest | null>(null);
  const [rendered, setRendered] = useState(false);
  const isClosingRef = useRef(false);

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const panelOpacity = useRef(new Animated.Value(0)).current;
  const panelScale = useRef(new Animated.Value(0.94)).current;
  const panelTranslateY = useRef(new Animated.Value(18)).current;
  const iconScale = useRef(new Animated.Value(0.82)).current;

  const enqueueAlert = useCallback((request: AppAlertRequest) => {
    setQueue((previousQueue) => [...previousQueue, request]);
  }, []);

  useEffect(() => registerAppAlertHost(enqueueAlert, priority), [enqueueAlert, priority]);

  useEffect(() => {
    if (activeAlert || queue.length === 0 || isClosingRef.current) {
      return;
    }

    setActiveAlert(queue[0]);
    setQueue((previousQueue) => previousQueue.slice(1));
  }, [activeAlert, queue]);

  useEffect(() => {
    if (!activeAlert) {
      return;
    }

    setRendered(true);
    overlayOpacity.setValue(0);
    panelOpacity.setValue(0);
    panelScale.setValue(0.94);
    panelTranslateY.setValue(18);
    iconScale.setValue(0.82);

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 1,
        duration: 180,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 1,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(panelScale, {
        toValue: 1,
        speed: 18,
        bounciness: 8,
        useNativeDriver: true,
      }),
      Animated.spring(panelTranslateY, {
        toValue: 0,
        speed: 18,
        bounciness: 7,
        useNativeDriver: true,
      }),
      Animated.spring(iconScale, {
        toValue: 1,
        speed: 16,
        bounciness: 9,
        useNativeDriver: true,
      }),
    ]).start();
  }, [activeAlert, iconScale, overlayOpacity, panelOpacity, panelScale, panelTranslateY]);

  const closeAlert = useCallback((button?: AppAlertButton, dismissed = false) => {
    if (!activeAlert || isClosingRef.current) {
      return;
    }

    isClosingRef.current = true;

    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 150,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(panelOpacity, {
        toValue: 0,
        duration: 120,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(panelScale, {
        toValue: 0.97,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(panelTranslateY, {
        toValue: 10,
        duration: 140,
        easing: Easing.in(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => {
      setRendered(false);
      setActiveAlert(null);
      isClosingRef.current = false;

      if (button?.onPress) {
        button.onPress();
      }

      if (dismissed) {
        activeAlert.options?.onDismiss?.();
      }
    });
  }, [activeAlert, overlayOpacity, panelOpacity, panelScale, panelTranslateY]);

  useEffect(() => {
    if (!rendered || !activeAlert) {
      return undefined;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      if (activeAlert.options?.cancelable === true) {
        closeAlert(undefined, true);
      }

      return true;
    });

    return () => subscription.remove();
  }, [activeAlert, closeAlert, rendered]);

  const alertMeta = useMemo(() => {
    if (!activeAlert) {
      return getIntentMeta('info');
    }

    return getIntentMeta(getAlertIntent(activeAlert));
  }, [activeAlert]);

  if (!rendered || !activeAlert) {
    return null;
  }

  const isCancelable = activeAlert.options?.cancelable === true;
  const stackedButtons = activeAlert.buttons.length > 2;
  const messageIsLong = (activeAlert.message?.length ?? 0) > 120;

  return (
    <View style={styles.modalRoot} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.overlay,
          {
            backgroundColor: isDark ? 'rgba(0,0,0,0.72)' : 'rgba(0,0,0,0.48)',
            opacity: overlayOpacity,
          },
        ]}>
        <Pressable
          accessibilityRole="button"
          disabled={!isCancelable}
          onPress={() => closeAlert(undefined, true)}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <View
        pointerEvents="box-none"
        style={[
          styles.centerWrap,
          {
            paddingTop: Math.max(insets.top, 20),
            paddingBottom: Math.max(insets.bottom, 20),
          },
        ]}>
        <Animated.View
          style={[
            styles.panel,
            {
              backgroundColor: colors.card,
              borderColor: colors.border,
              opacity: panelOpacity,
              transform: [{ translateY: panelTranslateY }, { scale: panelScale }],
            },
            Platform.OS === 'android' ? styles.androidShadow : styles.iosShadow,
          ]}>
          <View style={[styles.accentBar, { backgroundColor: alertMeta.accent }]} />

          <View style={styles.content}>
            <View style={styles.headerRow}>
              <Animated.View
                style={[
                  styles.iconBadge,
                  {
                    backgroundColor: `${alertMeta.accent}18`,
                    borderColor: `${alertMeta.accent}40`,
                    transform: [{ scale: iconScale }],
                  },
                ]}>
                <MaterialIcons name={alertMeta.icon} size={26} color={alertMeta.accent} />
              </Animated.View>

              <View style={styles.copyWrap}>
                <Text style={[styles.eyebrow, { color: colors.textSecondary }]}>{alertMeta.label}</Text>
                <Text style={[styles.title, { color: colors.textPrimary }]}>{activeAlert.title}</Text>
              </View>
            </View>

            {activeAlert.message ? (
              <Text
                selectable={messageIsLong}
                style={[styles.message, { color: colors.textSecondary }]}>
                {activeAlert.message}
              </Text>
            ) : null}
          </View>

          <View style={[styles.buttonWrap, stackedButtons && styles.buttonWrapStacked]}>
            {activeAlert.buttons.map((button, index) => {
              const isCancel = button.style === 'cancel';
              const isDestructive = button.style === 'destructive';
              const isPrimary = button.isPreferred || (!isCancel && index === activeAlert.buttons.length - 1);
              const backgroundColor = isDestructive
                ? '#EF4444'
                : isPrimary
                  ? colors.invertedBackground
                  : colors.backgroundSecondary;
              const borderColor = isDestructive
                ? '#EF4444'
                : isPrimary
                  ? colors.invertedBackground
                  : colors.border;
              const textColor = isDestructive
                ? '#FFFFFF'
                : isPrimary
                  ? colors.invertedText
                  : colors.textPrimary;

              return (
                <Pressable
                  key={`${activeAlert.id}-${button.text}-${index}`}
                  accessibilityRole="button"
                  onPress={() => closeAlert(button)}
                  style={({ pressed }) => [
                    styles.button,
                    stackedButtons && styles.stackedButton,
                    { backgroundColor, borderColor, opacity: pressed ? 0.86 : 1 },
                  ]}>
                  {isDestructive ? (
                    <MaterialIcons name="delete-outline" size={17} color={textColor} />
                  ) : null}
                  <Text style={[styles.buttonText, { color: textColor }]} numberOfLines={1} adjustsFontSizeToFit>
                    {button.text}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 10000,
    elevation: 10000,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  centerWrap: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  panel: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  iosShadow: {
    shadowColor: '#000000',
    shadowOpacity: 0.26,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  androidShadow: {
    elevation: 18,
  },
  accentBar: {
    height: 3,
    width: '100%',
  },
  content: {
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 6,
    gap: 14,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconBadge: {
    width: 52,
    height: 52,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyWrap: {
    flex: 1,
    minWidth: 0,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
    letterSpacing: 0,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: '500',
    letterSpacing: 0,
  },
  buttonWrap: {
    flexDirection: 'row',
    gap: 10,
    padding: 14,
    paddingTop: 10,
  },
  buttonWrapStacked: {
    flexDirection: 'column',
  },
  button: {
    flex: 1,
    minHeight: 46,
    borderRadius: 4,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  stackedButton: {
    width: '100%',
  },
  buttonText: {
    fontSize: 14,
    lineHeight: 18,
    fontWeight: '800',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
});
