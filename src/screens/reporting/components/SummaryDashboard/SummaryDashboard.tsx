import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View } from 'react-native';

import { useAppTheme } from '@/theme/useAppTheme';

import { ReportData, ReportUserSummary } from '../../reportCalculations';
import { formatINRZeroDecimal } from '../../reportUtils';
import { CountUpText } from '../CountUpText';
import { styles } from './SummaryDashboard.styles';

// --- UI CONSTANTS ---
const ACCENT_COLOR = '#2563EB'; // Action highlight color
const HERO_TEXT = '#FFFFFF';
const HERO_MUTED = '#A1A1AA';

// --- PERSONAL THEME COLORS ---
const AYAN_COLOR = '#3B82F6'; // Modern Blue
const SOURAV_COLOR = '#8B5CF6'; // Modern Purple

interface SummaryDashboardProps {
  report: ReportData;
  ayanSummary: ReportUserSummary | undefined;
  souravSummary: ReportUserSummary | undefined;
  canConfirmSettlement: boolean;
  onOpenSettlement: () => void;
  statusScaleAnim: Animated.Value;
  statusToneAnim: Animated.Value;
  statusBackgroundColor: Animated.AnimatedInterpolation<string | number>;
  statusBorderColor: Animated.AnimatedInterpolation<string | number>;
  statusTextColor: Animated.AnimatedInterpolation<string | number>;
  surfaceColor: string;
  secondarySurfaceColor: string;
}

export function SummaryDashboard({
  report,
  ayanSummary,
  souravSummary,
  canConfirmSettlement,
  onOpenSettlement,
  statusScaleAnim,
  statusBackgroundColor,
  statusTextColor,
  surfaceColor,
  secondarySurfaceColor,
}: SummaryDashboardProps) {
  const { colors } = useAppTheme();

  // --- ANIMATIONS ---
  const shimmerAnim = useRef(new Animated.Value(-1)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    // 1. Shimmer loop for Hero Card (Translates from left to right)
    Animated.loop(
      Animated.timing(shimmerAnim, {
        toValue: 1,
        duration: 2500,
        useNativeDriver: true,
      })
    ).start();

    // 2. Pulse loop for Settlement Amount (Breathing effect)
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1, // Slight scale up
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1, // Scale back to normal
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [shimmerAnim, pulseAnim]);

  // Calculate pixel translation for shimmer (assuming roughly 400px screen width)
  const shimmerTranslate = shimmerAnim.interpolate({
    inputRange: [-1, 1],
    outputRange: [-400, 400],
  });

  return (
    <View style={styles.summaryGrid}>
      {/* Total Expense - HERO CARD with Shimmer */}
      <View style={[styles.heroCard, styles.gridSpanFull]}>
        {/* Animated Shimmer Overlay */}
        <Animated.View
          style={[
            styles.shimmerOverlay,
            { transform: [{ skewX: '-20deg' }, { translateX: shimmerTranslate }] },
          ]}
        />

        <View style={styles.summaryTopRow}>
          <View style={styles.labelRow}>
            <MaterialIcons name="account-balance-wallet" size={16} color={HERO_MUTED} />
            <Text style={[styles.summaryLabel, { color: HERO_MUTED }]}>Total Expense</Text>
          </View>
          <View
            style={[
              styles.inlineStatPill,
              { backgroundColor: 'rgba(255, 255, 255, 0.12)' },
            ]}
          >
            <MaterialIcons name="timeline" size={12} color={HERO_TEXT} />
            <Text style={[styles.inlineStatText, { color: HERO_TEXT }]}>
              {report.summary.totalTrips} {report.summary.totalTrips === 1 ? 'trip' : 'trips'}
            </Text>
          </View>
        </View>
        <View style={styles.summaryFrame}>
          <CountUpText
            value={report.summary.totalExpense}
            formatter={formatINRZeroDecimal}
            style={styles.heroValue}
          />
        </View>
      </View>

      {/* Ayan's Share (Using AYAN_COLOR) */}
      <View style={[styles.summaryCard, styles.gridSpanHalf, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
        <View style={styles.labelRow}>
          <MaterialIcons name="pie-chart-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ayan&apos;s Share</Text>
        </View>
        <View style={styles.summaryFrame}>
          <CountUpText
            value={report.summary.ayanShare}
            formatter={formatINRZeroDecimal}
            style={[styles.summaryValue, { color: AYAN_COLOR }]}
          />
        </View>
      </View>

      {/* Sourav's Share (Using SOURAV_COLOR) */}
      <View style={[styles.summaryCard, styles.gridSpanHalf, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
        <View style={styles.labelRow}>
          <MaterialIcons name="pie-chart-outline" size={14} color={colors.textSecondary} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sourav&apos;s Share</Text>
        </View>
        <View style={styles.summaryFrame}>
          <CountUpText
            value={report.summary.souravShare}
            formatter={formatINRZeroDecimal}
            style={[styles.summaryValue, { color: SOURAV_COLOR }]}
          />
        </View>
      </View>

      {/* Ayan Paid (Using AYAN_COLOR) */}
      <View style={[styles.summaryCard, styles.gridSpanHalf, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
        <View style={styles.labelRow}>
          <MaterialIcons name="payments" size={14} color={AYAN_COLOR} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Ayan Paid</Text>
        </View>
        <View style={styles.summaryFrame}>
          <CountUpText
            value={ayanSummary?.totalPaidAmount || 0}
            formatter={formatINRZeroDecimal}
            style={[styles.summaryValue, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* Sourav Paid (Using SOURAV_COLOR) */}
      <View style={[styles.summaryCard, styles.gridSpanHalf, { backgroundColor: surfaceColor, borderColor: colors.border }]}>
        <View style={styles.labelRow}>
          <MaterialIcons name="payments" size={14} color={SOURAV_COLOR} />
          <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>Sourav Paid</Text>
        </View>
        <View style={styles.summaryFrame}>
          <CountUpText
            value={souravSummary?.totalPaidAmount || 0}
            formatter={formatINRZeroDecimal}
            style={[styles.summaryValue, { color: colors.textPrimary }]}
          />
        </View>
      </View>

      {/* Settlement Card - Action Focused */}
      {report.settlement.amount > 0 ? <Animated.View
        style={[
          styles.settlementCard,
          styles.gridSpanFull,
          {
            backgroundColor: surfaceColor,
            borderColor: colors.border,
            transform: [{ scale: statusScaleAnim }],
          },
        ]}
      >
        {/* Top Section: Label & Amount */}
        <View style={styles.settlementHeader}>
          <View style={styles.labelRow}>
            <MaterialIcons name="swap-horiz" size={16} color={colors.textSecondary} />
            {/* We use report.settlement.title here (e.g., "Pending settlement") to eliminate double headers */}
            <Text style={[styles.summaryLabel, { color: colors.textSecondary }]}>
              {report.settlement.title}
            </Text>
            {report.isSettled ? <MaterialIcons name="check-circle" size={22} color={"green"} /> : null}
          </View>

          {!report.isSettled && report.settlement.amount > 0 && (
            <View style={styles.settlementAmountWrapper}>
              {/* Highlight Pulse Animation applied here */}
              <Animated.View style={{ transform: [{ scale: pulseAnim }], alignSelf: 'flex-start' }}>
                <Text style={[styles.settlementAmount, { color: ACCENT_COLOR }]}>
                  {formatINRZeroDecimal(report.settlement.amount)}
                </Text>
              </Animated.View>

              <View style={styles.labelRow}>
                {/* A nested arrow icon makes the flow of money visual */}
                <MaterialIcons name="subdirectory-arrow-right" size={16} color={colors.textSecondary} />
                <Text style={[styles.settlementDirection, { color: colors.textSecondary }]}>
                  {report.settlement.directionMessage}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Bottom Section: Full-Width Action Button */}
        {report.isSettled ? null : <Pressable onPress={onOpenSettlement} style={styles.settlementBadgePressable}>
          <Animated.View
            style={[
              styles.settlementBadge,
              {
                // If settled, gray it out. If pending, use the dynamic background.
                backgroundColor: report.isSettled ? secondarySurfaceColor : statusBackgroundColor,
                borderWidth: report.isSettled ? 1 : 0,
                borderColor: report.isSettled ? colors.border : 'transparent',
              },
            ]}
          >
            <Animated.Text
              style={[
                styles.settlementBadgeText,
                { color: report.isSettled ? colors.textPrimary : statusTextColor }
              ]}
            >
              {report.settlement.currentUserMessage}
            </Animated.Text>
          </Animated.View>
        </Pressable>}

        {/* Lock Hints / Warnings below the button */}
        {!canConfirmSettlement && !report.isSettled ? (
          <View style={[styles.inlineInfoRow, { justifyContent: 'center', alignItems: 'center', marginTop: -8 }]}>
            <MaterialIcons name="info-outline" size={14} color={colors.textSecondary} />
            <Text style={[styles.settlementLockHint, { color: colors.textSecondary, marginTop: -2 }]}>
              Complete month required
            </Text>
          </View>
        ) : null}

        {report.isSettled ? (
          <View
            style={[
              styles.readOnlyBanner,
              {
                backgroundColor: secondarySurfaceColor,
                borderWidth: 1,
                borderColor: colors.border,
              },
            ]}
          >
            <MaterialIcons name="lock" size={16} color={colors.textPrimary} />
            <Text style={[styles.readOnlyText, { color: colors.textPrimary }]}>
              This month is settled. Mileage and editable controls are locked.
            </Text>
          </View>
        ) : null}
      </Animated.View> : null}

      {/* Warnings */}
      {report.warnings.length > 0 ? (
        <View
          style={[
            styles.warningCard,
            styles.gridSpanFull,
            { borderColor: '#FCA5A5', backgroundColor: '#FEF2F2' }
          ]}
        >
          <MaterialIcons name="warning-amber" size={20} color="#DC2626" />
          <View style={styles.warningCopy}>
            {report.warnings.map((warning) => (
              <Text key={warning} style={[styles.warningText, { color: '#991B1B' }]}>
                {warning}
              </Text>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}