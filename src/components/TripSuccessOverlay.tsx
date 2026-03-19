import { useAppTheme } from '@/theme/useAppTheme';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import React from 'react';
import { Animated, StyleSheet, Text } from 'react-native';

type Props = {
    isEditing: boolean;
    isEndingTrip: boolean;
    modeAccent: string;
    opacity: Animated.Value;
    scale: Animated.Value;
    checkScale: Animated.Value;
};

export function TripSuccessOverlay({ isEditing, isEndingTrip, modeAccent, opacity, scale, checkScale }: Props) {
    const { colors, isDark } = useAppTheme();

    return (
        <Animated.View
            style={[
                styles.overlay,
                {
                    backgroundColor: isDark ? 'rgba(0,0,0,0.85)' : 'rgba(255,255,255,0.92)',
                    opacity: opacity,
                    transform: [{ scale: scale }],
                },
            ]}
        >
            <Animated.View
                style={[
                    styles.circle,
                    {
                        backgroundColor: modeAccent,
                        transform: [{ scale: checkScale }],
                    },
                ]}
            >
                <MaterialIcons name={isEndingTrip ? 'flag' : 'directions-car'} size={36} color="#FFFFFF" />
            </Animated.View>
            <Text style={[styles.title, { color: colors.textPrimary }]}>
                {isEditing ? 'Updated!' : isEndingTrip ? 'Trip Ended!' : 'Trip Started!'}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                {isEditing
                    ? 'Odometer reading has been updated.'
                    : isEndingTrip
                        ? 'Your trip has been recorded successfully.'
                        : 'Drive safe! Your trip is being tracked.'}
            </Text>
        </Animated.View>
    );
}

const styles = StyleSheet.create({
    overlay: {
        ...StyleSheet.absoluteFillObject,
        borderRadius: 28,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    circle: {
        width: 72,
        height: 72,
        borderRadius: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    title: {
        fontSize: 22,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    subtitle: {
        fontSize: 14,
        textAlign: 'center',
        paddingHorizontal: 32,
        lineHeight: 20,
    },
});