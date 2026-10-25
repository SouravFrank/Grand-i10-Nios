import { useCallback, useState } from 'react';
import { runOnJS, useSharedValue, withDelay, withTiming } from 'react-native-reanimated';

/** How long the success celebration stays on screen before the scene fades. */
const SUCCESS_HOLD_MS = 1500;
const EXIT_FADE_MS = 280;

/**
 * Trip popup motion, fully Reanimated: entrance staggering is done with
 * `entering` builders on each section (UI thread), and this hook drives the
 * success celebration — it fades the whole scene out and only then hands
 * control back to navigation on the JS thread.
 */
export function useTripAnimations(onSuccessComplete: () => void) {
    const [showSuccess, setShowSuccess] = useState(false);

    /** Fades the backdrop + popup together once the celebration is done. */
    const sceneOpacity = useSharedValue(1);

    const playSuccessAnimation = useCallback(() => {
        setShowSuccess(true);
        sceneOpacity.value = withDelay(
            SUCCESS_HOLD_MS,
            withTiming(0, { duration: EXIT_FADE_MS }, (finished) => {
                if (finished) runOnJS(onSuccessComplete)();
            }),
        );
    }, [onSuccessComplete, sceneOpacity]);

    return { showSuccess, playSuccessAnimation, sceneOpacity };
}
