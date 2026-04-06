import { useEffect, useRef, useState } from 'react';
import { Animated } from 'react-native';

export function useTripAnimations(onSuccessComplete: () => void) {
    const overlayOpacity = useRef(new Animated.Value(0)).current;
    const popupScale = useRef(new Animated.Value(0.88)).current;
    const popupOpacity = useRef(new Animated.Value(0)).current;
    const carSlideX = useRef(new Animated.Value(-80)).current;
    const carOpacity = useRef(new Animated.Value(0)).current;
    const headerSlideY = useRef(new Animated.Value(-20)).current;
    const headerOpacity = useRef(new Animated.Value(0)).current;
    const formSlideY = useRef(new Animated.Value(30)).current;
    const formOpacity = useRef(new Animated.Value(0)).current;
    const buttonSlideY = useRef(new Animated.Value(20)).current;
    const buttonOpacity = useRef(new Animated.Value(0)).current;

    // Success state
    const [showSuccess, setShowSuccess] = useState(false);
    const successScale = useRef(new Animated.Value(0)).current;
    const successOpacity = useRef(new Animated.Value(0)).current;
    const checkScale = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        Animated.stagger(80, [
            Animated.timing(overlayOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.parallel([
                Animated.spring(popupScale, { toValue: 1, useNativeDriver: true, tension: 65, friction: 10 }),
                Animated.timing(popupOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(carSlideX, { toValue: 0, useNativeDriver: true, tension: 40, friction: 9 }),
                Animated.timing(carOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(headerSlideY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 10 }),
                Animated.timing(headerOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(formSlideY, { toValue: 0, useNativeDriver: true, tension: 50, friction: 10 }),
                Animated.timing(formOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]),
            Animated.parallel([
                Animated.spring(buttonSlideY, { toValue: 0, useNativeDriver: true, tension: 60, friction: 9 }),
                Animated.timing(buttonOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
        ]).start();
    }, []);

    const playSuccessAnimation = () => {
        setShowSuccess(true);
        Animated.sequence([
            Animated.parallel([
                Animated.spring(successScale, { toValue: 1, useNativeDriver: true, tension: 50, friction: 7 }),
                Animated.timing(successOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
            ]),
            Animated.spring(checkScale, { toValue: 1, useNativeDriver: true, tension: 80, friction: 6 }),
            Animated.delay(600),
            Animated.parallel([
                Animated.timing(successOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(popupOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
                Animated.timing(overlayOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
            ]),
        ]).start(onSuccessComplete);
    };

    return {
        showSuccess,
        playSuccessAnimation,
        anims: {
            overlayOpacity, popupScale, popupOpacity, carSlideX, carOpacity,
            headerSlideY, headerOpacity, formSlideY, formOpacity, buttonSlideY, buttonOpacity,
            successScale, successOpacity, checkScale
        }
    };
}