import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Animated } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, spacing } from '../theme';
import { X, Info, SkipForward, CheckCircle2 } from 'lucide-react-native';

const { width } = Dimensions.get('window');

interface GuidedCameraProps {
    onCaptureComplete: (images: string[]) => void;
    onCancel: () => void;
}

const STEPS = [
    {
        id: 1,
        title: 'CONTEXT',
        desc: 'Wide shot of the room where the issue is located.',
        optional: false,
    },
    {
        id: 2,
        title: 'DETAIL',
        desc: 'Get closer. Focus on the specific fault or problem.',
        optional: false,
    },
    {
        id: 3,
        title: 'SOURCE',
        desc: 'Show where it originates (base of leak, burnt area, etc.).',
        optional: false,
    },
    {
        id: 4,
        title: 'DAMAGE',
        desc: 'Surrounding area impacted (floor, walls, cabinets).',
        optional: true,
    },
    {
        id: 5,
        title: 'ASSET TAG',
        desc: 'Model/serial number sticker — skip if no appliance involved.',
        optional: true,
    },
];

const REQUIRED_COUNT = STEPS.filter(s => !s.optional).length; // 3

export const GuidedCamera: React.FC<GuidedCameraProps> = ({ onCaptureComplete, onCancel }) => {
    const [permission, requestPermission] = useCameraPermissions();
    const [currentStep, setCurrentStep] = useState(0);
    const [capturedImages, setCapturedImages] = useState<string[]>([]);
    // Track per-step whether the user captured or skipped
    const [stepResults, setStepResults] = useState<(string | null)[]>([]);
    const cameraRef = useRef<CameraView>(null);
    const flashAnim = useRef(new Animated.Value(0)).current;

    if (!permission) return <View />;

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionTitle}>CAMERA ACCESS REQUIRED</Text>
                <Text style={styles.permissionText}>
                    We need camera access to document the issue for your legal audit log.
                </Text>
                <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                    <Text style={styles.permissionButtonText}>GRANT ACCESS</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.permissionCancel} onPress={onCancel}>
                    <Text style={styles.permissionCancelText}>Cancel</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const flashShutter = () => {
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const advance = (newImages: string[], newResults: (string | null)[]) => {
        const next = currentStep + 1;
        if (next >= STEPS.length) {
            // Done — filter out nulls (skipped steps) for the final image array
            onCaptureComplete(newImages);
        } else {
            setCurrentStep(next);
        }
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync();
        if (!photo) return;

        flashShutter();
        const newImages = [...capturedImages, photo.uri];
        const newResults = [...stepResults, photo.uri];
        setCapturedImages(newImages);
        setStepResults(newResults);
        advance(newImages, newResults);
    };

    const skipStep = () => {
        const newResults = [...stepResults, null];
        setStepResults(newResults);
        advance(capturedImages, newResults);
    };

    const step = STEPS[currentStep];
    const totalCaptured = capturedImages.length;
    const stepsLeft = STEPS.length - currentStep;

    return (
        <View style={styles.container}>
            <CameraView style={styles.camera} ref={cameraRef} facing="back" />

            {/* Shutter flash overlay */}
            <Animated.View
                pointerEvents="none"
                style={[StyleSheet.absoluteFill, styles.flashOverlay, { opacity: flashAnim }]}
            />

            <View style={[StyleSheet.absoluteFill, styles.overlay]}>
                {/* Top Bar */}
                <View style={styles.topBar}>
                    <TouchableOpacity onPress={onCancel} style={styles.iconBtn}>
                        <X color="white" size={22} />
                    </TouchableOpacity>

                    <View style={styles.stepIndicator}>
                        <Text style={styles.stepCounter}>
                            {currentStep + 1} / {STEPS.length}
                        </Text>
                        <Text style={styles.stepTitle}>{step.title}</Text>
                        {step.optional && (
                            <View style={styles.optionalBadge}>
                                <Text style={styles.optionalText}>OPTIONAL</Text>
                            </View>
                        )}
                    </View>

                    {/* Progress dots */}
                    <View style={styles.dotsRow}>
                        {STEPS.map((s, i) => {
                            const done = i < currentStep;
                            const active = i === currentStep;
                            const wasSkipped = done && stepResults[i] === null;
                            return (
                                <View
                                    key={i}
                                    style={[
                                        styles.dot,
                                        done && !wasSkipped && styles.dotDone,
                                        active && styles.dotActive,
                                        wasSkipped && styles.dotSkipped,
                                    ]}
                                />
                            );
                        })}
                    </View>
                </View>

                {/* Viewfinder frame */}
                <View style={styles.guideFrame}>
                    <View style={styles.cornerTL} />
                    <View style={styles.cornerTR} />
                    <View style={styles.cornerBL} />
                    <View style={styles.cornerBR} />
                    {step.optional && (
                        <View style={styles.optionalFrameBadge}>
                            <SkipForward color="rgba(255,255,255,0.8)" size={14} />
                            <Text style={styles.optionalFrameText}>Optional — tap SKIP if not applicable</Text>
                        </View>
                    )}
                </View>

                {/* Bottom Area */}
                <View style={styles.bottomArea}>
                    {/* Instruction */}
                    <View style={styles.infoBox}>
                        <Info color={colors.accent} size={16} />
                        <Text style={styles.guideDesc}>{step.desc}</Text>
                    </View>

                    {/* Controls row */}
                    <View style={styles.controls}>
                        {/* Captured count thumbnail */}
                        <View style={styles.previewContainer}>
                            {totalCaptured > 0 && (
                                <View style={styles.thumbnail}>
                                    <CheckCircle2 color="white" size={16} />
                                    <Text style={styles.thumbnailCount}>{totalCaptured}</Text>
                                </View>
                            )}
                        </View>

                        {/* Shutter */}
                        <TouchableOpacity style={styles.shutter} onPress={takePicture}>
                            <View style={styles.shutterInner} />
                        </TouchableOpacity>

                        {/* Skip button — only for optional steps */}
                        <View style={styles.skipContainer}>
                            {step.optional ? (
                                <TouchableOpacity style={styles.skipBtn} onPress={skipStep}>
                                    <SkipForward color="rgba(255,255,255,0.7)" size={18} />
                                    <Text style={styles.skipText}>SKIP</Text>
                                </TouchableOpacity>
                            ) : (
                                <View style={{ width: 60 }} />
                            )}
                        </View>
                    </View>

                    {/* Minimum note */}
                    {currentStep < REQUIRED_COUNT && (
                        <Text style={styles.requiredNote}>
                            {REQUIRED_COUNT - currentStep} required photo{REQUIRED_COUNT - currentStep !== 1 ? 's' : ''} remaining
                        </Text>
                    )}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'black',
    },
    camera: {
        flex: 1,
    },
    flashOverlay: {
        backgroundColor: 'white',
        zIndex: 10,
    },
    overlay: {
        flex: 1,
        justifyContent: 'space-between',
        padding: spacing.l,
    },
    topBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginTop: spacing.xl,
    },
    iconBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.4)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    stepIndicator: {
        alignItems: 'center',
    },
    stepCounter: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 10,
        fontWeight: '700',
        letterSpacing: 1,
    },
    stepTitle: {
        color: 'white',
        fontSize: 15,
        fontWeight: '800',
        marginTop: 2,
        letterSpacing: 2,
    },
    optionalBadge: {
        marginTop: 4,
        backgroundColor: 'rgba(242,201,76,0.25)',
        borderRadius: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: 'rgba(242,201,76,0.5)',
    },
    optionalText: {
        color: '#F2C94C',
        fontSize: 8,
        fontWeight: '800',
        letterSpacing: 1,
    },
    dotsRow: {
        flexDirection: 'row',
        gap: 5,
        justifyContent: 'center',
        marginTop: 4,
    },
    dot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.25)',
    },
    dotActive: {
        backgroundColor: 'white',
        width: 14,
    },
    dotDone: {
        backgroundColor: colors.success,
    },
    dotSkipped: {
        backgroundColor: 'rgba(242,201,76,0.6)',
    },
    guideFrame: {
        flex: 1,
        marginVertical: spacing.xl,
        position: 'relative',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cornerTL: {
        position: 'absolute', top: 0, left: 0, width: 40, height: 40,
        borderTopWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    },
    cornerTR: {
        position: 'absolute', top: 0, right: 0, width: 40, height: 40,
        borderTopWidth: 2, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    },
    cornerBL: {
        position: 'absolute', bottom: 0, left: 0, width: 40, height: 40,
        borderBottomWidth: 2, borderLeftWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    },
    cornerBR: {
        position: 'absolute', bottom: 0, right: 0, width: 40, height: 40,
        borderBottomWidth: 2, borderRightWidth: 2, borderColor: 'rgba(255,255,255,0.6)',
    },
    optionalFrameBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    optionalFrameText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 11,
        fontWeight: '600',
    },
    bottomArea: {
        marginBottom: spacing.xl,
    },
    infoBox: {
        backgroundColor: 'rgba(0,0,0,0.65)',
        padding: spacing.m,
        borderRadius: 10,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: spacing.l,
    },
    guideDesc: {
        color: 'white',
        fontSize: 13,
        flex: 1,
        fontWeight: '500',
        lineHeight: 18,
    },
    controls: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    previewContainer: {
        width: 60,
        alignItems: 'center',
    },
    thumbnail: {
        width: 52,
        height: 52,
        borderRadius: 10,
        backgroundColor: 'rgba(15,76,58,0.5)',
        borderWidth: 2,
        borderColor: colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 2,
    },
    thumbnailCount: {
        color: 'white',
        fontWeight: '800',
        fontSize: 11,
    },
    shutter: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: 'rgba(255,255,255,0.5)',
    },
    shutterInner: {
        width: 62,
        height: 62,
        borderRadius: 31,
        backgroundColor: 'white',
    },
    skipContainer: {
        width: 60,
        alignItems: 'center',
    },
    skipBtn: {
        alignItems: 'center',
        gap: 4,
    },
    skipText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 9,
        fontWeight: '800',
        letterSpacing: 1,
    },
    requiredNote: {
        color: 'rgba(255,255,255,0.4)',
        fontSize: 10,
        textAlign: 'center',
        marginTop: spacing.m,
        fontWeight: '600',
    },
    permissionContainer: {
        flex: 1,
        backgroundColor: colors.background,
        justifyContent: 'center',
        alignItems: 'center',
        padding: spacing.xl,
    },
    permissionTitle: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 2,
        marginBottom: spacing.m,
    },
    permissionText: {
        textAlign: 'center',
        fontSize: 15,
        color: colors.textSecondary,
        marginBottom: spacing.xl,
        lineHeight: 22,
    },
    permissionButton: {
        backgroundColor: colors.primary,
        paddingHorizontal: spacing.xl,
        paddingVertical: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    permissionButtonText: {
        color: 'white',
        fontWeight: '800',
        fontSize: 12,
        letterSpacing: 1.5,
    },
    permissionCancel: {
        padding: spacing.m,
    },
    permissionCancelText: {
        color: colors.textTertiary,
        fontSize: 13,
    },
});
