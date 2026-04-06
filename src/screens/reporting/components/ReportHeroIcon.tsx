import { useEffect, useRef } from 'react';
import { Animated, Easing, View } from 'react-native';
import MaterialIcons from '@expo/vector-icons/MaterialIcons';
import { styles } from '../../ReportScreen.styles';

export function ReportHeroIcon({
  cardColor,
  borderColor,
  iconColor,
}: {
  cardColor: string;
  borderColor: string;
  iconColor: string;
}) {
  const pulse = useRef(new Animated.Value(1)).current;
  const shimmer = useRef(new Animated.Value(-1)).current;

  useEffect(() => {
    const pulseLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, {
          toValue: 1.06,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(pulse, {
          toValue: 1,
          duration: 1200,
          easing: Easing.inOut(Easing.quad),
          useNativeDriver: true,
        }),
      ]),
    );

    const shimmerLoop = Animated.loop(
      Animated.timing(shimmer, {
        toValue: 1.2,
        duration: 2200,
        easing: Easing.inOut(Easing.cubic),
        useNativeDriver: true,
      }),
    );

    pulseLoop.start();
    shimmerLoop.start();

    return () => {
      pulseLoop.stop();
      shimmerLoop.stop();
    };
  }, [pulse, shimmer]);

  return (
    <Animated.View
      style={[
        styles.heroIconWrap,
        {
          backgroundColor: cardColor,
          borderColor,
          transform: [{ scale: pulse }],
        },
      ]}
    >
      <View style={[styles.heroIconCore, { borderColor }]}>
        <MaterialIcons name="directions-car" size={28} color={iconColor} />
        <View style={styles.heroChart}>
          <View style={[styles.heroBar, { backgroundColor: iconColor, height: 12 }]} />
          <View style={[styles.heroBar, { backgroundColor: iconColor, height: 20, opacity: 0.85 }]} />
          <View style={[styles.heroBar, { backgroundColor: iconColor, height: 28, opacity: 0.65 }]} />
        </View>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.heroShimmer,
          {
            transform: [
              {
                translateX: shimmer.interpolate({
                  inputRange: [-1, 1.2],
                  outputRange: [-90, 90],
                }),
              },
              { rotate: '18deg' },
            ],
          },
        ]}
      />
    </Animated.View>
  );
}
