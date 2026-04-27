import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, layout } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft,
    Building2,
    MapPin,
    Plus,
    LayoutGrid,
    ArrowRight,
    CheckCircle2,
    Search
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';

export const AddBuildingScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();

    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);

    // Form Data
    const [address, setAddress] = useState('');
    const [buildingName, setBuildingName] = useState('');
    const [unitCount, setUnitCount] = useState('');
    const [floorCount, setFloorCount] = useState('');

    const handleSave = async () => {
        if (!address || !buildingName) {
            Alert.alert('Missing Info', 'Please provide a name and address.');
            return;
        }

        setIsLoading(true);
        try {
            const { data, error } = await supabase
                .from('project_buildings')
                .insert({
                    owner_id: user?.id,
                    name: buildingName,
                    address: address,
                })
                .select()
                .single();

            if (error) throw error;

            // Automation: In a real app, logic would trigger here to generate unit stubs
            navigation.goBack();
        } catch (err: any) {
            Alert.alert('Error', err.message);
        } finally {
            setIsLoading(false);
        }
    };

    const renderStep1 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Identify the Asset</Text>
            <Text style={styles.stepSub}>Select a verified address to auto-populate building details and legal compliance data.</Text>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>LEGAL ADDRESS</Text>
                <View style={styles.searchWrapper}>
                    <Search color={colors.textTertiary} size={16} />
                    <TextInput
                        style={styles.input}
                        placeholder="Search for address..."
                        placeholderTextColor={colors.textTertiary}
                        value={address}
                        onChangeText={setAddress}
                    />
                </View>
                <Text style={styles.inputHint}>Powered by Google Places API</Text>
            </View>

            <View style={styles.inputGroup}>
                <Text style={styles.label}>BUILDING ALIAS (INTERNAL)</Text>
                <TextInput
                    style={styles.input}
                    placeholder="e.g., The Clark Residences"
                    placeholderTextColor={colors.textTertiary}
                    value={buildingName}
                    onChangeText={setBuildingName}
                />
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={() => setStep(2)}>
                <Text style={styles.nextText}>CONFIGURE MATRIX</Text>
                <ArrowRight color={colors.textInverse} size={16} />
            </TouchableOpacity>
        </View>
    );

    const renderStep2 = () => (
        <View style={styles.stepContainer}>
            <Text style={styles.stepTitle}>Architecture & Density</Text>
            <Text style={styles.stepSub}>Define the unit distribution. The system will automatically generate a digital twin roll.</Text>

            <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>TOTAL FLOORS</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="e.g., 4"
                        value={floorCount}
                        onChangeText={setFloorCount}
                    />
                </View>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.label}>UNITS PER FLOOR</Text>
                    <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        placeholder="e.g., 6"
                        value={unitCount}
                        onChangeText={setUnitCount}
                    />
                </View>
            </View>

            <GlassCard style={styles.matrixPreview}>
                <LayoutGrid color={colors.primary} size={24} />
                <View>
                    <Text style={styles.matrixTitle}>Dynamic Roll Generation</Text>
                    <Text style={styles.matrixSub}>Will generate ~{Number(floorCount) * Number(unitCount) || 0} unit identifiers.</Text>
                </View>
            </GlassCard>

            <View style={styles.btnRow}>
                <TouchableOpacity style={styles.prevBtn} onPress={() => setStep(1)}>
                    <Text style={styles.prevText}>BACK</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    {isLoading ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <>
                            <Text style={styles.saveText}>PROVISION ASSET</Text>
                            <CheckCircle2 color={colors.textInverse} size={16} />
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.navRow}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.headerContent}>
                        <Text style={styles.title}>Asset Onboarding</Text>
                        <View style={styles.stepIndicator}>
                            <View style={[styles.stepDot, { backgroundColor: colors.primary }]} />
                            <View style={[styles.stepDot, { backgroundColor: step >= 2 ? colors.primary : colors.border }]} />
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {step === 1 ? renderStep1() : renderStep2()}
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
        paddingBottom: spacing.l,
    },
    navRow: {
        paddingHorizontal: spacing.m,
        marginTop: spacing.s,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        paddingHorizontal: spacing.l,
        marginTop: spacing.s,
    },
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
    },
    stepIndicator: {
        flexDirection: 'row',
        gap: 8,
        marginTop: 12,
    },
    stepDot: {
        width: 40,
        height: 4,
        borderRadius: 2,
    },
    scrollContent: {
        padding: spacing.l,
    },
    stepContainer: {
        gap: spacing.l,
    },
    stepTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
    },
    stepSub: {
        fontSize: 14,
        color: colors.textSecondary,
        lineHeight: 20,
    },
    inputGroup: {
        gap: 8,
    },
    label: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1.5,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: spacing.m,
        height: 50,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: colors.text,
        height: 50,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: 8,
        paddingHorizontal: spacing.m,
    },
    inputHint: {
        fontSize: 10,
        color: colors.textTertiary,
        fontStyle: 'italic',
    },
    nextBtn: {
        height: 54,
        backgroundColor: colors.primary,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        marginTop: spacing.l,
    },
    nextText: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textInverse,
        letterSpacing: 1,
    },
    row: {
        flexDirection: 'row',
        gap: spacing.m,
    },
    matrixPreview: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
        padding: spacing.l,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        borderStyle: 'dashed',
    },
    matrixTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    matrixSub: {
        fontSize: 11,
        color: colors.textSecondary,
        marginTop: 2,
    },
    btnRow: {
        flexDirection: 'row',
        gap: spacing.m,
        marginTop: spacing.l,
    },
    prevBtn: {
        flex: 1,
        height: 54,
        backgroundColor: colors.surface,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    prevText: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textTertiary,
    },
    saveBtn: {
        flex: 2,
        height: 54,
        backgroundColor: colors.primary,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
    },
    saveText: {
        fontSize: 11,
        fontWeight: '900',
        color: colors.textInverse,
        letterSpacing: 1,
    }
});
