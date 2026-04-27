import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { colors, spacing, typography, layout } from '../theme';

interface ButtonProps {
    title: string;
    onPress: () => void;
    variant?: 'primary' | 'outline' | 'ghost';
    isLoading?: boolean;
    style?: ViewStyle;
    haptic?: Haptics.ImpactFeedbackStyle;
}

export const Button: React.FC<ButtonProps> = ({
    title,
    onPress,
    variant = 'primary',
    isLoading,
    style,
    haptic = Haptics.ImpactFeedbackStyle.Light
}) => {
    const isPrimary = variant === 'primary';
    const isOutline = variant === 'outline';

    const handlePress = () => {
        Haptics.impactAsync(haptic);
        onPress();
    };

    return (
        <TouchableOpacity
            style={[
                styles.container,
                isPrimary && styles.primaryContainer,
                isOutline && styles.outlineContainer,
                style
            ]}
            onPress={handlePress}
            disabled={isLoading}
            activeOpacity={0.8}
        >
            {isLoading ? (
                <ActivityIndicator color={isPrimary ? colors.textInverse : colors.text} />
            ) : (
                <Text style={[
                    styles.text,
                    isPrimary && styles.primaryText,
                    isOutline && styles.outlineText
                ]}>
                    {title}
                </Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        height: 56,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: layout.radius,
        paddingHorizontal: spacing.l,
        borderWidth: layout.borderWidth,
        borderColor: 'transparent',
    },
    primaryContainer: {
        backgroundColor: colors.text,
        borderColor: colors.text,
    },
    outlineContainer: {
        backgroundColor: 'transparent',
        borderColor: colors.borderStrong,
    },
    text: {
        fontFamily: 'System',
        fontSize: typography.sizes.s,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    primaryText: {
        color: colors.textInverse,
    },
    outlineText: {
        color: colors.text,
    },
});
