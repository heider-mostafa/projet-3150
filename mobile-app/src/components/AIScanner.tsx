import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { colors, layout, spacing } from '../theme';

const { width } = Dimensions.get('window');

export const AIScanner = ({ isScanning }: { isScanning: boolean }) => {
    const scanLinePos = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (isScanning) {
            Animated.loop(
                Animated.sequence([
                    Animated.timing(scanLinePos, {
                        toValue: 300,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                    Animated.timing(scanLinePos, {
                        toValue: 0,
                        duration: 2000,
                        useNativeDriver: true,
                    }),
                ])
            ).start();
        } else {
            scanLinePos.setValue(0);
        }
    }, [isScanning]);

    if (!isScanning) return null;

    return (
        <View style={styles.container}>
            {/* Simulated Scanner Line */}
            <Animated.View
                style={[
                    styles.scanLine,
                    { transform: [{ translateY: scanLinePos }] }
                ]}
            />

            {/* Simulated OCR Detections */}
            <View style={[styles.ocrBox, { top: 50, left: 40 }]}>
                <Text style={styles.ocrText}>DETECTED: FAUCET_HEAD</Text>
            </View>
            <View style={[styles.ocrBox, { top: 180, left: 120 }]}>
                <Text style={styles.ocrText}>SERIAL#: 4529-X</Text>
            </View>
            <View style={[styles.ocrBox, { top: 220, left: 60, borderColor: colors.action }]}>
                <Text style={[styles.ocrText, { color: colors.action }]}>ANOMALY: WATER_SHEEN</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.1)',
        zIndex: 10,
    },
    scanLine: {
        height: 4,
        width: '100%',
        backgroundColor: colors.accent,
        opacity: 0.6,
        shadowColor: colors.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 10,
    },
    ocrBox: {
        position: 'absolute',
        borderWidth: 1,
        borderColor: colors.accent,
        padding: 4,
        backgroundColor: 'rgba(255,255,255,0.7)',
    },
    ocrText: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.accent,
        letterSpacing: 0.5,
    },
});
