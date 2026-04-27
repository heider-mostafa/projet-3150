import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity, Animated, Easing, Alert, ActivityIndicator } from 'react-native';
import { colors, spacing, typography, layout } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useLanguage } from '../context/LanguageContext';
import { supabase } from '../lib/supabase';
import { FileUp, CheckCircle2, ShieldCheck, MapPin, Calendar, Clock, KeyRound, Building2 } from 'lucide-react-native';

interface UnitInfo {
    unitNumber: string;
    buildingName: string;
    buildingAddress: string;
    landlordName: string;
}

export const OnboardingFlow = () => {
    const [step, setStep] = useState(1);
    const [inviteCode, setInviteCode] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [unitInfo, setUnitInfo] = useState<UnitInfo | null>(null);
    const navigation = useNavigation<any>();
    const { user, refreshProfile } = useAuth();
    const { t } = useLanguage();
    const progress = useRef(new Animated.Value(0)).current;

    // ─── Step 1: Verify invite code and link tenant to unit ───
    const handleVerifyCode = async () => {
        if (!inviteCode || inviteCode.length < 6) {
            Alert.alert(t('common.error'), t('onboarding.codeNotFound'));
            return;
        }

        setIsVerifying(true);
        try {
            // Look up the invite code
            const { data: invite, error: lookupError } = await supabase
                .from('project_invite_codes')
                .select(`
                    id, unit_id, building_id, expires_at, used_by,
                    unit:project_units(unit_number),
                    building:project_buildings(name, address, owner_id)
                `)
                .eq('code', inviteCode.toUpperCase().trim())
                .single();

            if (lookupError || !invite) {
                Alert.alert(t('onboarding.invalidCode'), t('onboarding.codeNotFound'));
                return;
            }

            if (invite.used_by) {
                Alert.alert(t('onboarding.invalidCode'), t('onboarding.codeNotFound'));
                return;
            }

            if (new Date(invite.expires_at) < new Date()) {
                Alert.alert(t('onboarding.invalidCode'), t('onboarding.codeNotFound'));
                return;
            }

            // Claim the invite code
            const { error: claimError } = await supabase
                .from('project_invite_codes')
                .update({ used_by: user?.id, used_at: new Date().toISOString() })
                .eq('id', invite.id);

            if (claimError) {
                Alert.alert(t('onboarding.linkError'), t('onboarding.codeNotFound'));
                return;
            }

            // Link tenant to the unit
            const { error: linkError } = await supabase
                .from('project_units')
                .update({ tenant_id: user?.id, status: 'occupied' })
                .eq('id', invite.unit_id);

            if (linkError) {
                Alert.alert(t('onboarding.linkError'), t('onboarding.codeNotFound'));
                return;
            }

            // Fetch landlord name for display
            const buildingData = invite.building as any;
            let landlordName = 'Your Landlord';
            if (buildingData?.owner_id) {
                const { data: landlordProfile } = await supabase
                    .from('project_profiles')
                    .select('full_name')
                    .eq('id', buildingData.owner_id)
                    .single();
                if (landlordProfile?.full_name) {
                    landlordName = landlordProfile.full_name;
                }
            }

            const unitData = invite.unit as any;
            setUnitInfo({
                unitNumber: unitData?.unit_number || 'N/A',
                buildingName: buildingData?.name || 'Building',
                buildingAddress: buildingData?.address || '',
                landlordName,
            });

            setStep(2);
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('onboarding.linkError'));
        } finally {
            setIsVerifying(false);
        }
    };

    // ─── Step 2: Lease Upload (optional) ───
    const startAnalysis = () => {
        setIsUploading(true);
        Animated.timing(progress, {
            toValue: 1,
            duration: 2500,
            easing: Easing.bezier(0.4, 0, 0.2, 1),
            useNativeDriver: false,
        }).start(() => {
            setStep(3);
            setIsUploading(false);
        });
    };

    // ─── Step 3: Complete onboarding ───
    const handleComplete = async () => {
        // Refresh profile so AuthContext sees the new unit link
        await refreshProfile();
        // Navigate to main app
        navigation.reset({
            index: 0,
            routes: [{ name: 'TenantMain' }],
        });
    };

    return (
        <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
                <View style={styles.header}>
                    <Text style={styles.stepIndicator}>{t('onboarding.stepOf').replace('{{current}}', String(step)).replace('{{total}}', '3')}</Text>
                    <Text style={styles.title}>
                        {step === 1 ? t('onboarding.joinBuilding').replace(' ', '\n') : step === 2 ? t('onboarding.leaseUpload').replace(' ', '\n') : t('onboarding.profileVerified').replace(' ', '\n')}
                    </Text>
                </View>

                <View style={styles.content}>
                    {/* Step 1: Invite code entry */}
                    {step === 1 && (
                        <View>
                            <Text style={styles.instruction}>
                                {t('onboarding.inviteCodeDesc')}
                            </Text>

                            <GlassCard style={styles.codeCard}>
                                <View style={styles.codeIconCircle}>
                                    <KeyRound color={colors.primary} size={28} />
                                </View>
                                <Input
                                    label={t('onboarding.inviteCodeLabel')}
                                    placeholder={t('onboarding.inviteCodePlaceholder')}
                                    value={inviteCode}
                                    onChangeText={(text) => setInviteCode(text.toUpperCase())}
                                    autoCapitalize="characters"
                                    maxLength={6}
                                    style={styles.codeInput}
                                    editable={!isVerifying}
                                />
                            </GlassCard>

                            <Button
                                title={isVerifying ? t('onboarding.linking') : t('onboarding.linkAccount')}
                                onPress={handleVerifyCode}
                                isLoading={isVerifying}
                            />

                            <Text style={styles.helpText}>
                                {t('onboarding.noCodeHint')}
                            </Text>
                        </View>
                    )}

                    {/* Step 2: Lease upload (optional) */}
                    {step === 2 && (
                        <View>
                            <Text style={styles.instruction}>
                                {t('onboarding.leaseOptional')}
                            </Text>

                            {/* Show linked unit confirmation */}
                            {unitInfo && (
                                <GlassCard style={styles.unitConfirmCard}>
                                    <Building2 color={colors.success} size={20} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.unitConfirmTitle}>{t('onboarding.successLinked')}</Text>
                                        <Text style={styles.unitConfirmSub}>
                                            {unitInfo.buildingName} — {t('onboarding.unit')} {unitInfo.unitNumber}
                                        </Text>
                                    </View>
                                    <CheckCircle2 color={colors.success} size={18} />
                                </GlassCard>
                            )}

                            <TouchableOpacity onPress={startAnalysis} disabled={isUploading}>
                                <GlassCard style={[styles.uploadBox, isUploading && { borderColor: colors.primary }]}>
                                    {isUploading ? (
                                        <View style={styles.uploadingContainer}>
                                            <View style={styles.progressTrack}>
                                                <Animated.View
                                                    style={[
                                                        styles.progressBar,
                                                        {
                                                            width: progress.interpolate({
                                                                inputRange: [0, 1],
                                                                outputRange: ['0%', '100%']
                                                            })
                                                        }
                                                    ]}
                                                />
                                            </View>
                                            <Text style={styles.uploadingText}>AI SCANNING LEASE PROTOCOL...</Text>
                                        </View>
                                    ) : (
                                        <View style={styles.idleContainer}>
                                            <View style={styles.iconCircle}>
                                                <FileUp color={colors.primary} size={32} />
                                            </View>
                                            <Text style={styles.idleText}>{t('onboarding.attachLease')}</Text>
                                            <Text style={styles.idleSubtext}>{t('onboarding.leaseFormats')}</Text>
                                        </View>
                                    )}
                                </GlassCard>
                            </TouchableOpacity>

                            <Button
                                title={t('onboarding.skipForNow')}
                                variant="ghost"
                                onPress={() => setStep(3)}
                                style={styles.manualButton}
                            />
                        </View>
                    )}

                    {/* Step 3: Confirmation */}
                    {step === 3 && (
                        <View>
                            <Text style={styles.instruction}>
                                {t('onboarding.profileReady')}
                            </Text>

                            <View style={styles.dataGrid}>
                                {unitInfo && (
                                    <>
                                        <GlassCard style={styles.dataCard}>
                                            <MapPin color={colors.primary} size={16} />
                                            <View style={styles.dataText}>
                                                <Text style={styles.dataLabel}>{t('onboarding.address')}</Text>
                                                <Text style={styles.dataValue}>{unitInfo.buildingAddress}</Text>
                                            </View>
                                        </GlassCard>

                                        <GlassCard style={styles.dataCard}>
                                            <Building2 color={colors.primary} size={16} />
                                            <View style={styles.dataText}>
                                                <Text style={styles.dataLabel}>{t('onboarding.unit')}</Text>
                                                <Text style={styles.dataValue}>{unitInfo.buildingName} — {t('onboarding.unit')} {unitInfo.unitNumber}</Text>
                                            </View>
                                        </GlassCard>

                                        <GlassCard style={styles.dataCard}>
                                            <ShieldCheck color={colors.primary} size={16} />
                                            <View style={styles.dataText}>
                                                <Text style={styles.dataLabel}>{t('onboarding.landlord')}</Text>
                                                <Text style={styles.dataValue}>{unitInfo.landlordName}</Text>
                                            </View>
                                        </GlassCard>
                                    </>
                                )}
                            </View>

                            <Button
                                title={t('onboarding.enterHomeOs')}
                                onPress={handleComplete}
                            />
                        </View>
                    )}
                </View>

                <View style={styles.footer}>
                    <ShieldCheck color={colors.textTertiary} size={12} />
                    <Text style={styles.footerText}>{t('onboarding.encryptedProfile')}</Text>
                </View>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        padding: spacing.l,
        marginTop: spacing.xl,
    },
    stepIndicator: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
        marginBottom: spacing.xs,
    },
    title: {
        fontSize: 42,
        fontWeight: '700',
        color: colors.text,
        lineHeight: 42,
    },
    content: {
        flex: 1,
        padding: spacing.l,
    },
    instruction: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 22,
        marginBottom: spacing.xl,
    },
    // ─── Step 1: Invite Code ───
    codeCard: {
        alignItems: 'center',
        padding: spacing.l,
        marginBottom: spacing.l,
    },
    codeIconCircle: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    codeInput: {
        textAlign: 'center',
        fontSize: 24,
        fontWeight: '800',
        letterSpacing: 8,
    },
    helpText: {
        marginTop: spacing.l,
        fontSize: 11,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 18,
    },
    // ─── Step 2: Unit confirmation + upload ───
    unitConfirmCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: spacing.m,
        marginBottom: spacing.l,
        backgroundColor: 'rgba(52, 199, 89, 0.05)',
        borderColor: 'rgba(52, 199, 89, 0.15)',
    },
    unitConfirmTitle: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.success,
        letterSpacing: 1.5,
    },
    unitConfirmSub: {
        fontSize: 13,
        fontWeight: '600',
        color: colors.text,
        marginTop: 2,
    },
    uploadBox: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
        borderStyle: 'dashed',
        borderColor: colors.border,
        backgroundColor: 'rgba(255,255,255,0.02)',
    },
    iconCircle: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: spacing.m,
    },
    idleContainer: {
        alignItems: 'center',
    },
    idleText: {
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 1,
        color: colors.text,
    },
    idleSubtext: {
        marginTop: 6,
        fontSize: 9,
        color: colors.textTertiary,
    },
    uploadingContainer: {
        width: '100%',
        paddingHorizontal: spacing.xl,
        alignItems: 'center',
    },
    progressTrack: {
        width: '100%',
        height: 2,
        backgroundColor: colors.border,
        marginBottom: spacing.l,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        backgroundColor: colors.primary,
    },
    uploadingText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2,
    },
    manualButton: {
        marginTop: spacing.l,
    },
    // ─── Step 3: Confirmation ───
    dataGrid: {
        gap: spacing.m,
        marginBottom: spacing.xxl,
    },
    dataCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        gap: 12,
    },
    dataText: {
        flex: 1,
    },
    dataLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginBottom: 2,
    },
    dataValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        paddingBottom: spacing.xl,
    },
    footerText: {
        fontSize: 9,
        color: colors.textTertiary,
        fontWeight: '600',
    }
});
