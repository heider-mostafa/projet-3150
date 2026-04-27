import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, Animated, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { Button } from '../components/Button';
import { GlassCard } from '../components/GlassCard';
import { Input } from '../components/Input';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useNavigation } from '@react-navigation/native';
import { Camera, CheckCircle2, ChevronRight, Wrench, Zap, Wind, Key, Settings, Sparkles, X } from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import * as FileSystem from 'expo-file-system';
import { decode } from 'base64-arraybuffer';

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

export const FastRequestScreen = () => {
    const { user } = useAuth();
    const navigation = useNavigation<any>();
    
    const [permission, requestPermission] = useCameraPermissions();
    const [showCamera, setShowCamera] = useState(false);
    const cameraRef = useRef<CameraView>(null);
    const flashAnim = useRef(new Animated.Value(0)).current;

    const [description, setDescription] = useState('');
    const [imageUri, setImageUri] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('general');
    const [selectedUrgency, setSelectedUrgency] = useState('normal');
    const [tenantUnit, setTenantUnit] = useState<any>(null);

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

    const flashShutter = () => {
        Animated.sequence([
            Animated.timing(flashAnim, { toValue: 1, duration: 60, useNativeDriver: true }),
            Animated.timing(flashAnim, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start();
    };

    const takePicture = async () => {
        if (!cameraRef.current) return;
        const photo = await cameraRef.current.takePictureAsync();
        if (!photo) return;
        flashShutter();
        setImageUri(photo.uri);
        setTimeout(() => setShowCamera(false), 300);
    };

    const uploadImage = async (uri: string): Promise<string> => {
        const fileName = `${user?.id}/${Date.now()}_fast.jpg`;
        const base64 = await FileSystem.readAsStringAsync(uri, { encoding: 'base64' });
        const { error } = await supabase.storage
            .from('request-images')
            .upload(fileName, decode(base64), { contentType: 'image/jpeg' });
        if (error) throw error;
        return fileName;
    };

    const handleSubmit = async () => {
        if (!user) {
            Alert.alert('Authentication Error', 'You must be logged in.');
            return;
        }
        if (!tenantUnit) {
            Alert.alert('No Unit Linked', 'Please complete onboarding first.');
            return;
        }
        if (!imageUri) {
            Alert.alert('Image Required', 'Please provide at least 1 photo for context.');
            return;
        }

        setIsSubmitting(true);
        try {
            const storagePath = await uploadImage(imageUri);
            const { error } = await supabase.from('project_requests').insert({
                tenant_id: user.id,
                building_id: tenantUnit.building_id,
                unit_id: tenantUnit.id,
                description: description || 'No description provided.',
                category: selectedCategory.toUpperCase(),
                images: [storagePath],
                status: 'pending',
                urgency_level: selectedUrgency,
                ai_diagnosis: null,
            });

            if (error) throw error;
            Alert.alert('Request Sent', 'Your maintenance request was successfully logged.', [
                { text: 'OK', onPress: () => navigation.navigate('HomeHub') }
            ]);
        } catch (err: any) {
            Alert.alert('Submission Failed', err.message);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Inline Camera View
    if (showCamera) {
        if (!permission) return <View style={styles.container} />;
        if (!permission.granted) {
            return (
                <View style={styles.permissionContainer}>
                    <Text style={styles.permissionTitle}>CAMERA ACCESS REQUIRED</Text>
                    <Text style={styles.permissionText}>We need camera access to photograph the issue.</Text>
                    <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
                        <Text style={styles.permissionButtonText}>GRANT ACCESS</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.permissionCancel} onPress={() => setShowCamera(false)}>
                        <Text style={styles.permissionCancelText}>Cancel</Text>
                    </TouchableOpacity>
                </View>
            );
        }

        return (
            <View style={styles.cameraContainer}>
                <CameraView style={styles.camera} ref={cameraRef} facing="back" />
                <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flashOverlay, { opacity: flashAnim }]} />
                <View style={styles.cameraOverlay}>
                    <TouchableOpacity onPress={() => setShowCamera(false)} style={styles.closeBtn}>
                        <X color="white" size={24} />
                    </TouchableOpacity>
                    <View style={styles.shutterContainer}>
                        <TouchableOpacity style={styles.shutter} onPress={takePicture}>
                            <View style={styles.shutterInner} />
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <Text style={styles.headerTitle}>REPORT AN ISSUE</Text>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {tenantUnit && (
                    <GlassCard style={styles.unitBanner}>
                        <Text style={styles.unitBannerLabel}>YOUR LOCATION</Text>
                        <Text style={styles.unitBannerValue}>
                            {(tenantUnit.building as any)?.name} — Unit {tenantUnit.unit_number}
                        </Text>
                    </GlassCard>
                )}

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

                <Text style={[styles.superTitle, { marginTop: spacing.l }]}>STEP 2: URGENCY LEVEL</Text>
                <View style={styles.urgencyRow}>
                    {URGENCY_LEVELS.map(u => {
                        const isActive = selectedUrgency === u.id;
                        return (
                            <TouchableOpacity
                                key={u.id}
                                style={[styles.urgencyChip, isActive && { borderColor: u.color, backgroundColor: `${u.color}10` }]}
                                onPress={() => setSelectedUrgency(u.id)}
                            >
                                <View style={[styles.urgencyDot, { backgroundColor: u.color }]} />
                                <Text style={[styles.urgencyLabel, isActive && { color: colors.text }]}>{u.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <Text style={[styles.superTitle, { marginTop: spacing.xl }]}>STEP 3: PHOTO & DESCRIPTION</Text>
                <GlassCard style={styles.captureCard}>
                    {!imageUri ? (
                        <View style={styles.emptyState}>
                            <View style={styles.iconCircle}>
                                <Camera color={colors.primary} size={32} />
                            </View>
                            <Text style={styles.emptyTitle}>Quick Photo Capture</Text>
                            <Text style={styles.emptyDesc}>1 photo is required.</Text>
                            <Button title="OPEN CAMERA" onPress={() => setShowCamera(true)} style={styles.camButton} />
                        </View>
                    ) : (
                        <View style={styles.photoGrid}>
                            <Image source={{ uri: imageUri }} style={styles.thumbnailFull} />
                            <TouchableOpacity style={styles.retakeFull} onPress={() => setShowCamera(true)}>
                                <Text style={styles.retakeText}>RETAKE PHOTO</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </GlassCard>

                <Input
                    label="Description (Optional)"
                    placeholder="Briefly describe the issue..."
                    value={description}
                    onChangeText={setDescription}
                    multiline
                    numberOfLines={3}
                    style={styles.textArea}
                />

                <TouchableOpacity
                    style={[styles.submitBtn, isSubmitting && styles.submitBtnDisabled]}
                    onPress={handleSubmit}
                    disabled={isSubmitting}
                >
                    <Text style={styles.submitBtnText}>
                        {isSubmitting ? 'PROCESSING...' : 'SUBMIT REQUEST'}
                    </Text>
                </TouchableOpacity>

                <View style={styles.divider} />
                
                <TouchableOpacity onPress={() => navigation.navigate('NewRequest')} style={styles.aiUpsellBtn}>
                    <GlassCard style={styles.aiUpsellCard}>
                        <Sparkles color="#A485FF" size={24} />
                        <View style={{ flex: 1, marginLeft: 12 }}>
                            <Text style={styles.aiUpsellTitle}>Don't know the issue?</Text>
                            <Text style={styles.aiUpsellSub}>Let Gemini AI diagnose it and estimate costs.</Text>
                        </View>
                        <ChevronRight color={colors.textTertiary} size={20} />
                    </GlassCard>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    header: { backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border, paddingBottom: spacing.s },
    headerTitle: { fontSize: 9, fontWeight: '700', color: colors.textSecondary, letterSpacing: 2, textAlign: 'center', marginTop: spacing.s },
    scrollContent: { padding: spacing.l, paddingBottom: 40 },
    
    unitBanner: { padding: spacing.m, marginBottom: spacing.l, backgroundColor: 'rgba(15, 76, 58, 0.03)' },
    unitBannerLabel: { fontSize: 8, fontWeight: '900', color: colors.primary, letterSpacing: 1.5 },
    unitBannerValue: { fontSize: 14, fontWeight: '700', color: colors.text, marginTop: 2 },
    
    superTitle: { fontSize: 9, fontWeight: '700', color: colors.primary, letterSpacing: 1.5 },
    
    categoryScroll: { marginTop: spacing.m, marginBottom: spacing.m },
    categoryRow: { flexDirection: 'row', gap: spacing.s },
    categoryChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    categoryChipActive: { borderColor: colors.primary, backgroundColor: 'rgba(15, 76, 58, 0.05)' },
    categoryLabel: { fontSize: 9, fontWeight: '800', color: colors.textTertiary, letterSpacing: 0.5 },
    categoryLabelActive: { color: colors.primary },

    urgencyRow: { flexDirection: 'row', gap: spacing.s, marginTop: spacing.m },
    urgencyChip: { flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 12, borderRadius: 10, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    urgencyDot: { width: 7, height: 7, borderRadius: 3.5 },
    urgencyLabel: { fontSize: 8, fontWeight: '700', color: colors.textTertiary, textAlign: 'center' },

    captureCard: { padding: spacing.xl, borderStyle: 'dashed', borderWidth: 1, borderColor: colors.borderMedium, marginTop: spacing.m, marginBottom: spacing.l },
    emptyState: { alignItems: 'center' },
    iconCircle: { width: 64, height: 64, borderRadius: 32, backgroundColor: 'rgba(15, 76, 58, 0.05)', justifyContent: 'center', alignItems: 'center', marginBottom: spacing.m },
    emptyTitle: { fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: 8 },
    emptyDesc: { fontSize: 12, color: colors.textSecondary, textAlign: 'center', marginBottom: spacing.xl },
    camButton: { width: '100%' },
    photoGrid: { alignItems: 'center' },
    thumbnailFull: { width: '100%', height: 200, borderRadius: 10, backgroundColor: '#EEE' },
    retakeFull: { marginTop: spacing.m, paddingVertical: spacing.s, paddingHorizontal: spacing.l, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.05)' },
    retakeText: { fontSize: 10, fontWeight: '700', color: colors.textTertiary, textDecorationLine: 'underline' },

    textArea: { height: 100, paddingTop: spacing.m, marginBottom: spacing.xl },
    
    submitBtn: { backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12, alignItems: 'center' },
    submitBtnDisabled: { opacity: 0.3 },
    submitBtnText: { color: 'white', fontSize: 12, fontWeight: '800', letterSpacing: 1 },

    divider: { height: 1, backgroundColor: colors.border, marginVertical: spacing.xl },
    aiUpsellBtn: { marginBottom: spacing.xl },
    aiUpsellCard: { flexDirection: 'row', alignItems: 'center', padding: spacing.m, backgroundColor: 'rgba(164, 133, 255, 0.05)', borderColor: 'rgba(164, 133, 255, 0.2)' },
    aiUpsellTitle: { fontSize: 13, fontWeight: '800', color: '#A485FF' },
    aiUpsellSub: { fontSize: 10, color: colors.textSecondary, marginTop: 2 },

    // Single Camera view styles
    cameraContainer: { flex: 1, backgroundColor: 'black' },
    camera: { flex: 1 },
    flashOverlay: { backgroundColor: 'white', zIndex: 10 },
    cameraOverlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', padding: spacing.xl },
    closeBtn: { marginTop: spacing.xl, alignSelf: 'flex-start', padding: spacing.s, backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: 20 },
    shutterContainer: { alignItems: 'center', marginBottom: spacing.xxl },
    shutter: { width: 80, height: 80, borderRadius: 40, backgroundColor: 'rgba(255,255,255,0.25)', justifyContent: 'center', alignItems: 'center', borderWidth: 3, borderColor: 'rgba(255,255,255,0.5)' },
    shutterInner: { width: 62, height: 62, borderRadius: 31, backgroundColor: 'white' },

    permissionContainer: { flex: 1, backgroundColor: colors.background, justifyContent: 'center', alignItems: 'center', padding: spacing.xl },
    permissionTitle: { fontSize: 11, fontWeight: '900', color: colors.primary, letterSpacing: 2, marginBottom: spacing.m },
    permissionText: { textAlign: 'center', fontSize: 15, color: colors.textSecondary, marginBottom: spacing.xl, lineHeight: 22 },
    permissionButton: { backgroundColor: colors.primary, paddingHorizontal: spacing.xl, paddingVertical: spacing.m, borderRadius: 8, marginBottom: spacing.m },
    permissionButtonText: { color: 'white', fontWeight: '800', fontSize: 12, letterSpacing: 1.5 },
    permissionCancel: { padding: spacing.m },
    permissionCancelText: { color: colors.textTertiary, fontSize: 13 },
});
