import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { ChevronLeft, Share2, Info, Plus, UploadCloud } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { GlassCard } from '../components/GlassCard';
import * as ImagePicker from 'expo-image-picker';

const { width } = Dimensions.get('window');

export const DigitalKeycardScreen = () => {
    const navigation = useNavigation();
    const [hasUploadedKey, setHasUploadedKey] = useState(false);

    const handleUploadKey = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setHasUploadedKey(true);
            Alert.alert('Key Saved', 'Digital duplicate stored in your secure vault.');
        }
    };

    return (
        <View style={styles.container}>
            <SafeAreaView edges={['top']}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <ChevronLeft color={colors.text} size={24} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>RESIDENT PASS</Text>
                    <TouchableOpacity>
                        <Share2 color={colors.text} size={20} />
                    </TouchableOpacity>
                </View>
            </SafeAreaView>

            <View style={styles.content}>
                <View style={styles.passContainer}>
                    <GlassCard style={styles.passCard}>
                        <View style={styles.passHeader}>
                            <View>
                                <Text style={styles.orgName}>RESIDENTIAL</Text>
                                <Text style={styles.subOrg}>MAINTENANCE GROUP</Text>
                            </View>
                            <View style={styles.chip} />
                        </View>

                        {!hasUploadedKey ? (
                            <TouchableOpacity style={styles.emptyMid} onPress={handleUploadKey}>
                                <View style={styles.uploadIcon}>
                                    <UploadCloud color={colors.primary} size={32} />
                                </View>
                                <Text style={styles.emptyText}>UPLOAD PHYSICAL KEY</Text>
                                <Text style={styles.emptySub}>Scan Fob or Metal Key for digital backup</Text>
                            </TouchableOpacity>
                        ) : (
                            <View style={styles.midSection}>
                                <Text style={styles.passLabel}>VALID UNTIL</Text>
                                <Text style={styles.passValue}>DEC 31, 2026</Text>

                                <View style={styles.qrContainer}>
                                    <View style={styles.qrRow}>
                                        <View style={[styles.qrBlock, { backgroundColor: colors.text }]} />
                                        <View style={styles.qrBlock} />
                                        <View style={[styles.qrBlock, { backgroundColor: colors.text }]} />
                                        <View style={styles.qrBlock} />
                                    </View>
                                    <View style={styles.qrRow}>
                                        <View style={styles.qrBlock} />
                                        <View style={[styles.qrBlock, { backgroundColor: colors.text }]} />
                                        <View style={styles.qrBlock} />
                                        <View style={[styles.qrBlock, { backgroundColor: colors.text }]} />
                                    </View>
                                    <View style={styles.qrRow}>
                                        <View style={[styles.qrBlock, { backgroundColor: colors.text }]} />
                                        <View style={styles.qrBlock} />
                                        <View style={[styles.qrBlock, { backgroundColor: colors.text }]} />
                                        <View style={styles.qrBlock} />
                                    </View>
                                </View>
                            </View>
                        )}

                        <View style={styles.passFooter}>
                            <View>
                                <Text style={styles.tenantName}>MOSTAFA HEIDER</Text>
                                <Text style={styles.unitInfo}>UNIT 302 • LEVEL 3</Text>
                            </View>
                            <View style={styles.accessBadge}>
                                <Text style={styles.accessText}>FULL ACCESS</Text>
                            </View>
                        </View>
                    </GlassCard>
                </View>

                <View style={styles.instructionBox}>
                    <Info color={colors.textTertiary} size={16} />
                    <Text style={styles.instructionText}>
                        {hasUploadedKey
                            ? 'Hold your device near the building scanner or show this pass to the concierge for manual verification.'
                            : 'Save a digital image of your physical key or fob to have an emergency backup if locked out.'}
                    </Text>
                </View>

                <View style={styles.actionGrid}>
                    <TouchableOpacity style={styles.actionBtn}>
                        <Text style={styles.actionBtnText}>ADD TO APPLE WALLET</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, styles.secondaryBtn]} onPress={handleUploadKey}>
                        <Text style={[styles.actionBtnText, { color: colors.text }]}>
                            {hasUploadedKey ? 'UPDATE KEY IMAGE' : 'START SCAN PROTOCOL'}
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: spacing.m,
    },
    headerTitle: {
        fontSize: 10,
        fontWeight: '700',
        color: 'white',
        letterSpacing: 2,
    },
    content: {
        flex: 1,
        padding: spacing.xl,
        justifyContent: 'center',
    },
    passContainer: {
        alignItems: 'center',
        marginBottom: spacing.xxl,
    },
    passCard: {
        width: width - spacing.xl * 2,
        aspectRatio: 0.63,
        backgroundColor: 'rgba(255,255,255,0.95)',
        padding: spacing.xl,
        borderRadius: 20,
        justifyContent: 'space-between',
    },
    passHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    orgName: {
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
        color: colors.primary,
    },
    subOrg: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
    chip: {
        width: 40,
        height: 30,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#CCC',
    },
    emptyMid: {
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#EEE',
        borderStyle: 'dashed',
        padding: spacing.xl,
        borderRadius: 12,
    },
    uploadIcon: {
        marginBottom: spacing.m,
    },
    emptyText: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 1,
    },
    emptySub: {
        fontSize: 8,
        color: colors.textTertiary,
        marginTop: 4,
        textAlign: 'center',
    },
    midSection: {
        alignItems: 'center',
    },
    passLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: 4,
    },
    passValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.xl,
    },
    qrContainer: {
        width: 140,
        height: 140,
        padding: 15,
        backgroundColor: 'white',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
    },
    qrRow: {
        flexDirection: 'row',
        gap: 4,
        marginBottom: 4,
    },
    qrBlock: {
        width: 20,
        height: 20,
        backgroundColor: '#F0F0F0',
        borderRadius: 2,
    },
    passFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
    },
    tenantName: {
        fontSize: 16,
        fontWeight: '800',
        color: colors.text,
    },
    unitInfo: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        marginTop: 2,
    },
    accessBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 4,
    },
    accessText: {
        fontSize: 8,
        fontWeight: '800',
        color: 'white',
    },
    instructionBox: {
        flexDirection: 'row',
        gap: 12,
        backgroundColor: 'rgba(255,255,255,0.05)',
        padding: spacing.l,
        borderRadius: 12,
        marginBottom: spacing.xl,
    },
    instructionText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 11,
        lineHeight: 18,
        flex: 1,
    },
    actionGrid: {
        gap: spacing.m,
    },
    actionBtn: {
        backgroundColor: 'white',
        height: 50,
        borderRadius: 25,
        justifyContent: 'center',
        alignItems: 'center',
    },
    secondaryBtn: {
        backgroundColor: 'transparent',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    actionBtnText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        color: 'black',
    }
});
