import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../theme';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/Input';
import { GuidedCamera } from '../components/GuidedCamera';
import { useNavigation } from '@react-navigation/native';
import { Camera, CheckCircle2, ChevronRight, Wrench, Zap, Wind, Key, Settings, Sparkles, ShieldCheck, AlertTriangle } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';
import { diagnoseRequest, AIDiagnosis } from '../lib/gemini';

const CATEGORIES = [
    { id: 'plumbing', label: 'Plumbing', icon: Wrench },
    { id: 'electrical', label: 'Electrical', icon: Zap },
    { id: 'hvac', label: 'HVAC', icon: Wind },
    { id: 'locksmith', label: 'Locksmith', icon: Key },
    { id: 'general', label: 'General', icon: Settings },
];

const URGENCY_LEVELS = [
    { id: 'urgent', label: 'Urgent (24H)', color: colors.error },
    { id: 'normal', label: 'Normal (72H)', color: colors.warning },
    { id: 'low', label: 'Low (1 Week)', color: colors.success },
];

export const NewRequestScreen = () => {
    const { user } = useAuth();
    const [description, setDescription] = useState('');
    const [showCamera, setShowCamera] = useState(false);
    const [images, setImages] = useState<string[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('general');
    const [selectedUrgency, setSelectedUrgency] = useState('normal');
    const [aiSuggestedUrgency, setAiSuggestedUrgency] = useState<string | null>(null);
    const [tenantUnit, setTenantUnit] = useState<any>(null);
    const [aiDiagnosis, setAiDiagnosis] = useState<AIDiagnosis | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const navigation = useNavigation<any>();

    // Map Gemini urgency enum → our 3-level system
    const mapAIUrgency = (aiUrgency: string): string => {
        if (aiUrgency === 'immediate' || aiUrgency === 'within_24h') return 'urgent';
        if (aiUrgency === 'within_week') return 'normal';
        return 'low';
    };

    // Auto-fetch tenant's unit/building info
    useEffect(() => {
        const fetchUnit = async () => {
            if (!user) return;
            const { data } = await supabase
                .from('project_units')
                .select('id, building_id, unit_number, building:project_buildings(name, address)')
                .eq('tenant_id', user.id)
                .limit(1)
                .single();

            if (data) setTenantUnit(data);
        };
        fetchUnit();
    }, [user]);

    const handleCaptureComplete = (capturedImages: string[]) => {
        setImages(capturedImages);
        setShowCamera(false);
    };

    // Upload images to Supabase Storage
    const uploadImages = async (): Promise<string[]> => {
        const storagePaths: string[] = [];
        for (let i = 0; i < images.length; i++) {
            const uri = images[i];
            const fileName = `${user?.id}/${Date.now()}_${i}.jpg`;
            try {
                const base64 = await FileSystem.readAsStringAsync(uri, {
                    encoding: 'base64',
                });
                const { error } = await supabase.storage
                    .from('request-images')
                    .upload(fileName, decode(base64), {
                        contentType: 'image/jpeg',
                    });
                if (error) throw error;
                storagePaths.push(fileName);
            } catch (err) {
                console.error('Image upload error:', err);
            }
        }
        return storagePaths;
    };

    // Step 1: Run AI diagnostic
    const handleRunDiagnostic = async () => {
        if (images.length < 3) {
            Alert.alert('More Photos Needed', 'Please capture at least 3 angles (Context, Detail, Source) for a valid report.');
            return;
        }
        if (!description.trim()) {
            Alert.alert('Missing Description', 'Please describe the issue before running the diagnostic.');
            return;
        }

        setIsAnalyzing(true);
        try {
            const diagnosis = await diagnoseRequest(description, selectedCategory);
            setAiDiagnosis(diagnosis);
            // Auto-apply AI urgency suggestion
            const mapped = mapAIUrgency(diagnosis.urgency);
            setAiSuggestedUrgency(mapped);
            setSelectedUrgency(mapped);
        } catch (error) {
            Alert.alert('Diagnostic Error', 'AI diagnostic could not be completed. You can still submit the request.');
        } finally {
            setIsAnalyzing(false);
        }
    };

    // Step 2: Confirm and submit
    const handleSubmit = async () => {
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in to submit a request.');
            return;
        }

        if (!tenantUnit) {
            Alert.alert('No Unit Linked', 'Your account is not linked to a unit. Please complete onboarding first.');
            return;
        }

        setIsSubmitting(true);
        try {
            // Upload images to Supabase Storage
            const storagePaths = await uploadImages();

            // Insert request with real building_id, unit_id, and AI diagnosis
            const { error } = await supabase.from('project_requests').insert({
                tenant_id: user.id,
                building_id: tenantUnit.building_id,
                unit_id: tenantUnit.id,
                description,
                category: selectedCategory.toUpperCase(),
                images: storagePaths,
                status: 'pending',
                urgency_level: selectedUrgency,
                ai_diagnosis: aiDiagnosis,
            });

            if (error) throw error;

            Alert.alert('Verified', 'Issue reported and notarized with AI diagnostic.', [
                { text: 'OK', onPress: () => navigation.navigate('HomeHub') }
            ]);
        } catch (err: any) {
            Alert.alert('Submission Failed', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const getSeverityLabel = (severity: number) => {
        const labels = ['', 'Cosmetic', 'Minor', 'Moderate', 'Major', 'Emergency'];
        return labels[severity] || 'Unknown';
    };

    const getSeverityColor = (severity: number) => {
        if (severity >= 4) return colors.error;
        if (severity >= 3) return colors.warning;
        return colors.success;
    };

    if (showCamera) {
        return (
            <GuidedCamera
                onCaptureComplete={handleCaptureComplete}
                onCancel={() => setShowCamera(false)}
            />
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <Text style={styles.headerTitle}>DIAGNOSTIC REPORT</Text>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Linked unit info */}
                {tenantUnit && (
                    <GlassCard style={styles.unitBanner}>
                        <Text style={styles.unitBannerLabel}>FILING FOR</Text>
                        <Text style={styles.unitBannerValue}>
                            {(tenantUnit.building as any)?.name} — Unit {tenantUnit.unit_number}
                        </Text>
                    </GlassCard>
                )}

                {/* Category Picker */}
                <Text style={styles.superTitle}>STEP 1: CATEGORY</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
                    <View style={styles.categoryRow}>
                        {CATEGORIES.map(cat => {
                            const Icon = cat.icon;
                            const isActive = selectedCategory === cat.id;
                            return (
                                <TouchableOpacity
                                    key={cat.id}
                                    style={[styles.categoryChip, isActive && styles.categoryChipActive]}
                                    onPress={() => setSelectedCategory(cat.id)}
                                >
                                    <Icon color={isActive ? colors.primary : colors.textTertiary} size={14} />
                                    <Text style={[styles.categoryLabel, isActive && styles.categoryLabelActive]}>
                                        {cat.label.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </ScrollView>

                {/* Urgency Picker */}
                <View style={styles.urgencyHeader}>
                    <Text style={[styles.superTitle, { marginTop: spacing.l }]}>URGENCY LEVEL</Text>
                    {aiSuggestedUrgency && (
                        <View style={styles.aiUrgencyBadge}>
                            <Text style={styles.aiUrgencyBadgeText}>🤖 AI SUGGESTED</Text>
                        </View>
                    )}
                </View>
                {aiSuggestedUrgency && (
                    <Text style={styles.urgencyOverrideHint}>
                        {selectedUrgency === aiSuggestedUrgency
                            ? 'AI has assessed this urgency based on your description.'
                            : '⚠️ You overrode the AI suggestion — both will be saved.'}
                    </Text>
                )}
                <View style={styles.urgencyRow}>
                    {URGENCY_LEVELS.map(u => {
                        const isActive = selectedUrgency === u.id;
                        const isAISuggested = aiSuggestedUrgency === u.id;
                        return (
                            <TouchableOpacity
                                key={u.id}
                                style={[
                                    styles.urgencyChip,
                                    isActive && { borderColor: u.color, backgroundColor: `${u.color}10` },
                                ]}
                                onPress={() => setSelectedUrgency(u.id)}
                            >
                                <View style={[styles.urgencyDot, { backgroundColor: u.color }]} />
                                <Text style={[styles.urgencyLabel, isActive && { color: colors.text }]}>
                                    {u.label}
                                </Text>
                                {isAISuggested && (
                                    <View style={styles.aiDot} />
                                )}
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {/* Visual Evidence */}
                <Text style={[styles.superTitle, { marginTop: spacing.xl }]}>STEP 2: VISUAL PROOF</Text>
                <Text style={styles.title}>Guided Evidence</Text>

                <GlassCard style={styles.captureCard}>
                    {images.length === 0 ? (
                        <View style={styles.emptyState}>
                            <View style={styles.iconCircle}>
                                <Camera color={colors.primary} size={32} />
                            </View>
                            <Text style={styles.emptyTitle}>Guided Evidence Capture</Text>
                            <Text style={styles.emptyDesc}>
                                3 required + 2 optional angles. Steps 4 &amp; 5 can be skipped.
                            </Text>
                            <Button
                                title="OPEN DIAGNOSTIC CAMERA"
                                onPress={() => setShowCamera(true)}
                                style={styles.camButton}
                            />
                        </View>
                    ) : (
                        <View style={styles.photoGrid}>
                            {images.map((uri, idx) => (
                                <Image key={idx} source={{ uri }} style={styles.thumbnail} />
                            ))}
                            <View style={styles.photoMeta}>
                                <View style={[styles.photoCountBadge,
                                    images.length >= 3 ? styles.photoCountOk : styles.photoCountWarn
                                ]}>
                                    <Text style={styles.photoCountText}>
                                        {images.length}/5 CAPTURED{images.length >= 3 ? ' ✓' : ''}
                                    </Text>
                                </View>
                                <TouchableOpacity style={styles.retake} onPress={() => setShowCamera(true)}>
                                    <Text style={styles.retakeText}>RETAKE</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}
                </GlassCard>

                <View style={styles.stepHeader}>
                    <Text style={styles.superTitle}>STEP 3: CONTEXT</Text>
                    {images.length >= 5 && <CheckCircle2 color={colors.success} size={16} />}
                </View>

                <Input
                    label="What's happening?"
                    placeholder="e.g. Water is pooling under the sink but only when the faucet is on..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                />

                {/* AI Diagnosis Section */}
                {!aiDiagnosis && (
                    <Button
                        title={isAnalyzing ? "ANALYZING WITH GEMINI AI..." : "RUN AI DIAGNOSTIC"}
                        onPress={handleRunDiagnostic}
                        isLoading={isAnalyzing}
                        style={styles.diagnosticBtn}
                    />
                )}

                {isAnalyzing && (
                    <GlassCard style={styles.analyzingCard}>
                        <ActivityIndicator size="small" color={colors.primary} />
                        <Text style={styles.analyzingText}>Gemini AI is analyzing your report...</Text>
                    </GlassCard>
                )}

                {aiDiagnosis && (
                    <GlassCard style={styles.diagnosisCard}>
                        <View style={styles.diagnosisHeader}>
                            <Sparkles color={colors.accent} size={18} />
                            <Text style={styles.diagnosisTitle}>AI DIAGNOSTIC RESULT</Text>
                            <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(aiDiagnosis.severity) }]}>
                                <Text style={styles.severityText}>
                                    {getSeverityLabel(aiDiagnosis.severity).toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        <Text style={styles.diagnosisCause}>{aiDiagnosis.probable_cause}</Text>

                        <View style={styles.diagnosisGrid}>
                            <View style={styles.diagnosisItem}>
                                <Text style={styles.diagnosisItemLabel}>EST. COST</Text>
                                <Text style={styles.diagnosisItemValue}>
                                    ${aiDiagnosis.estimated_cost_min}–${aiDiagnosis.estimated_cost_max} CAD
                                </Text>
                            </View>
                            <View style={styles.diagnosisItem}>
                                <Text style={styles.diagnosisItemLabel}>URGENCY</Text>
                                <Text style={styles.diagnosisItemValue}>
                                    {aiDiagnosis.urgency.replace(/_/g, ' ').toUpperCase()}
                                </Text>
                            </View>
                            <View style={styles.diagnosisItem}>
                                <Text style={styles.diagnosisItemLabel}>TRADE</Text>
                                <Text style={styles.diagnosisItemValue}>
                                    {aiDiagnosis.recommended_trade.replace(/_/g, ' ').toUpperCase()}
                                </Text>
                            </View>
                        </View>

                        {aiDiagnosis.legal_obligation && (
                            <View style={styles.legalBanner}>
                                <ShieldCheck color={colors.primary} size={14} />
                                <Text style={styles.legalText}>Landlord is legally obligated to fix (CCQ Art. 1854)</Text>
                            </View>
                        )}

                        {aiDiagnosis.next_steps.length > 0 && (
                            <View style={styles.nextSteps}>
                                <Text style={styles.nextStepsTitle}>RECOMMENDED ACTIONS</Text>
                                {aiDiagnosis.next_steps.map((step, i) => (
                                    <Text key={i} style={styles.nextStepItem}>• {step}</Text>
                                ))}
                            </View>
                        )}

                        <TouchableOpacity onPress={() => setAiDiagnosis(null)} style={styles.rerunBtn}>
                            <Text style={styles.rerunText}>RE-RUN DIAGNOSTIC</Text>
                        </TouchableOpacity>
                    </GlassCard>
                )}

                <View style={styles.disclaimer}>
                    <Text style={styles.disclaimerText}>
                        By submitting, you authorize the management to share this diagnostic data with verified service providers.
                    </Text>
                </View>

                {!aiDiagnosis && description.trim() && images.length >= 3 && (
                    <View style={styles.noAiWarning}>
                        <Text style={styles.noAiWarningText}>
                            ⚠️ Submit without AI diagnostic? Your landlord won't get cost estimates.
                        </Text>
                    </View>
                )}
                <TouchableOpacity
                    style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitBtnText}>
                        {isSubmitting ? 'PROCESSING...' : 'CONFIRM & SUBMIT REPORT'}
                    </Text>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        backgroundColor: colors.surface,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingBottom: spacing.s,
    },
    headerTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: spacing.s,
    },
    scrollContent: {
        padding: spacing.l,
        paddingBottom: 40,
    },
    unitBanner: {
        padding: spacing.m,
        marginBottom: spacing.l,
        backgroundColor: 'rgba(15, 76, 58, 0.03)',
    },
    unitBannerLabel: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 1.5,
    },
    unitBannerValue: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    superTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1.5,
    },
    title: {
        fontSize: 28,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.l,
    },
    // Category
    categoryScroll: {
        marginTop: spacing.m,
        marginBottom: spacing.m,
    },
    categoryRow: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    categoryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    categoryChipActive: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
    },
    categoryLabel: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 0.5,
    },
    categoryLabelActive: {
        color: colors.primary,
    },
    // Urgency
    urgencyHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.l,
    },
    aiUrgencyBadge: {
        backgroundColor: 'rgba(86,204,242,0.12)',
        borderWidth: 1,
        borderColor: 'rgba(86,204,242,0.4)',
        borderRadius: 6,
        paddingHorizontal: 6,
        paddingVertical: 3,
    },
    aiUrgencyBadgeText: {
        fontSize: 7,
        fontWeight: '900',
        color: '#56CCF2',
        letterSpacing: 0.5,
    },
    urgencyOverrideHint: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 4,
        marginBottom: 4,
        fontStyle: 'italic',
    },
    urgencyRow: {
        flexDirection: 'row',
        gap: spacing.s,
        marginTop: spacing.m,
    },
    urgencyChip: {
        flex: 1,
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 4,
        paddingVertical: 12,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        backgroundColor: colors.surface,
    },
    urgencyDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    urgencyLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textTertiary,
        textAlign: 'center',
    },
    aiDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#56CCF2',
        position: 'absolute',
        top: 6,
        right: 6,
    },
    // Camera
    captureCard: {
        padding: spacing.xl,
        borderStyle: 'dashed',
        borderWidth: 1,
        borderColor: colors.borderMedium,
    },
    emptyState: {
        alignItems: 'center',
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
    emptyTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 8,
    },
    emptyDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        textAlign: 'center',
        lineHeight: 18,
        marginBottom: spacing.xl,
    },
    camButton: {
        width: '100%',
    },
    photoGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        justifyContent: 'center',
    },
    thumbnail: {
        width: 78,
        height: 98,
        borderRadius: 8,
        backgroundColor: '#EEE',
    },
    photoMeta: {
        width: '100%',
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: spacing.m,
    },
    photoCountBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 6,
    },
    photoCountOk: {
        backgroundColor: 'rgba(15,76,58,0.08)',
    },
    photoCountWarn: {
        backgroundColor: 'rgba(235,87,87,0.08)',
    },
    photoCountText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 0.5,
    },
    retake: {
        alignItems: 'center',
    },
    retakeText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.textTertiary,
        textDecorationLine: 'underline',
    },
    noAiWarning: {
        backgroundColor: 'rgba(235,87,87,0.05)',
        borderWidth: 1,
        borderColor: 'rgba(235,87,87,0.2)',
        borderRadius: 8,
        padding: spacing.m,
        marginBottom: spacing.m,
    },
    noAiWarningText: {
        fontSize: 11,
        color: colors.error,
        textAlign: 'center',
        lineHeight: 16,
    },
    stepHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: spacing.xxl,
        marginBottom: spacing.m,
    },
    textArea: {
        height: 120,
        paddingTop: spacing.m,
    },
    disclaimer: {
        marginTop: spacing.xl,
        marginBottom: spacing.l,
    },
    disclaimerText: {
        fontSize: 10,
        color: colors.textTertiary,
        textAlign: 'center',
        lineHeight: 16,
    },
    submitBtn: {
        marginBottom: spacing.xxl,
        backgroundColor: colors.primary,
        paddingVertical: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitBtnDisabled: {
        opacity: 0.3,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 1,
    },
    // AI Diagnosis styles
    diagnosticBtn: {
        marginBottom: spacing.m,
        backgroundColor: '#1A1A2E',
    },
    analyzingCard: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        padding: spacing.l,
        marginBottom: spacing.m,
    },
    analyzingText: {
        fontSize: 13,
        color: colors.textSecondary,
        fontStyle: 'italic',
    },
    diagnosisCard: {
        padding: spacing.l,
        marginBottom: spacing.m,
        backgroundColor: 'rgba(15, 76, 58, 0.02)',
        borderWidth: 1,
        borderColor: colors.primary,
    },
    diagnosisHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: spacing.m,
    },
    diagnosisTitle: {
        fontSize: 10,
        fontWeight: '900',
        color: colors.primary,
        letterSpacing: 1.5,
        flex: 1,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 6,
    },
    severityText: {
        fontSize: 8,
        fontWeight: '900',
        color: 'white',
        letterSpacing: 0.5,
    },
    diagnosisCause: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 20,
        marginBottom: spacing.l,
    },
    diagnosisGrid: {
        flexDirection: 'row',
        gap: spacing.m,
        marginBottom: spacing.m,
    },
    diagnosisItem: {
        flex: 1,
        backgroundColor: 'rgba(15, 76, 58, 0.04)',
        padding: spacing.m,
        borderRadius: 10,
    },
    diagnosisItemLabel: {
        fontSize: 8,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    diagnosisItemValue: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.text,
    },
    legalBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: 'rgba(15, 76, 58, 0.06)',
        padding: spacing.m,
        borderRadius: 8,
        marginBottom: spacing.m,
    },
    legalText: {
        fontSize: 11,
        fontWeight: '700',
        color: colors.primary,
        flex: 1,
    },
    nextSteps: {
        marginBottom: spacing.m,
    },
    nextStepsTitle: {
        fontSize: 8,
        fontWeight: '900',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginBottom: 6,
    },
    nextStepItem: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: 2,
    },
    rerunBtn: {
        alignItems: 'center',
        paddingTop: spacing.m,
        borderTopWidth: 1,
        borderTopColor: colors.border,
    },
    rerunText: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
});
