import Svg, { Defs, LinearGradient, Path, Rect, Stop, Text as SvgText } from 'react-native-svg';

type Props = {
  size?: number;
  style?: object;
};

export function FastagBrandIcon({ size = 24, style }: Props) {
  return (
    <Svg width={size} height={size} viewBox="0 0 48 48" fill="none" style={style}>
      <Defs>
        <LinearGradient id="fastagBg" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#FF6B00" />
          <Stop offset="100%" stopColor="#D93800" />
        </LinearGradient>
        <LinearGradient id="blueStripe" x1="0" y1="0" x2="48" y2="0" gradientUnits="userSpaceOnUse">
          <Stop offset="0%" stopColor="#0F172A" />
          <Stop offset="100%" stopColor="#1E3A8A" />
        </LinearGradient>
      </Defs>

      {/* Card Tag Body */}
      <Rect x="2" y="6" width="44" height="36" rx="8" fill="url(#fastagBg)" />

      {/* Navy Header Stripe */}
      <Path d="M 2 14 C 2 9.578 5.578 6 10 6 L 38 6 C 42.422 6 46 9.578 46 14 L 46 18 L 2 18 Z" fill="url(#blueStripe)" />

      {/* RFID Waves */}
      <Path d="M 34 11 A 3 3 0 0 1 34 15" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M 37 9 A 6 6 0 0 1 37 17" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />
      <Path d="M 40 7 A 9 9 0 0 1 40 19" stroke="#38BDF8" strokeWidth="1.8" strokeLinecap="round" />

      {/* "FAST" Text in Bold White */}
      <SvgText
        x="6"
        y="15"
        fill="#FFFFFF"
        fontSize="8"
        fontWeight="900"
        fontFamily="System"
        letterSpacing="0.5"
      >
        FAST
      </SvgText>

      {/* Speed Chevron Arrows */}
      <Path d="M 8 28 L 14 34 L 8 40" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <Path d="M 16 28 L 22 34 L 16 40" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

      {/* "ag" Text */}
      <SvgText
        x="24"
        y="38"
        fill="#FFFFFF"
        fontSize="16"
        fontWeight="900"
        fontStyle="italic"
        fontFamily="System"
      >
        ag
      </SvgText>
    </Svg>
  );
}
