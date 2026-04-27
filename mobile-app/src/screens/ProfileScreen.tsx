import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Image, TextInput, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../theme';
import { GlassCard } from '../components/GlassCard';
import { useAuth } from '../context/AuthContext';
import { useNavigation } from '@react-navigation/native';
import {
    User, Shield, CreditCard, Bell, LogOut, ChevronRight,
    Key, Pencil, X, Check, Camera
} from 'lucide-react-native';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useLanguage } from '../context/LanguageContext';

export const ProfileScreen = () => {
    const { user, persona, profile, signOut, refreshProfile } = useAuth();
    const navigation = useNavigation<any>();
    const { t, setLocale } = useLanguage();
    const [stats, setStats] = useState<any>(null);

    // Edit mode state
    const [isEditing, setIsEditing] = useState(false);
    const [editName, setEditName] = useState('');
    const [editPhone, setEditPhone] = useState('');
    const [editLanguage, setEditLanguage] = useState('en');
    const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    useEffect(() => {
        if (!user) return;
        (async () => {
            if (persona === 'landlord') {
                const { data: buildings } = await supabase
                    .from('project_buildings')
                    .select('id')
                    .eq('owner_id', user.id);

                const buildingIds = (buildings || []).map(b => b.id);
                if (buildingIds.length > 0) {
                    const { count: unitCount } = await supabase
                        .from('project_units')
                        .select('*', { count: 'exact', head: true })
                        .in('building_id', buildingIds);

                    setStats({
                        buildings: buildingIds.length,
                        units: unitCount || 0
                    });
                } else {
                    setStats({ buildings: 0, units: 0 });
                }
            } else {
                const { data } = await supabase
                    .from('project_units')
                    .select('unit_number, building:project_buildings(name, address)')
                    .eq('tenant_id', user.id)
                    .limit(1)
                    .single();
                if (data) setStats(data);
            }
        })();
    }, [user, persona]);

    // Populate edit fields from profile
    useEffect(() => {
        if (profile) {
            setEditName(profile.full_name || '');
            setEditPhone((profile as any).phone || '');
            setEditLanguage((profile as any).preferred_language || 'en');
            setAvatarUrl((profile as any).avatar_url || null);
        }
    }, [profile]);

    const handleStartEdit = () => {
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        // Reset to profile values
        if (profile) {
            setEditName(profile.full_name || '');
            setEditPhone((profile as any).phone || '');
            setEditLanguage((profile as any).preferred_language || 'en');
            setAvatarUrl((profile as any).avatar_url || null);
        }
        setIsEditing(false);
    };

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const { error } = await supabase
                .from('project_profiles')
                .update({
                    full_name: editName.trim(),
                    phone: editPhone.trim() || null,
                    preferred_language: editLanguage,
                    avatar_url: avatarUrl,
                })
                .eq('id', user.id);

            if (error) throw error;

            // Refresh the profile in AuthContext
            if (refreshProfile) {
                await refreshProfile();
            }

            setIsEditing(false);
            Alert.alert(t('common.success'), t('profile.profileUpdated'));
        } catch (err: any) {
            Alert.alert(t('common.error'), err.message || t('profile.saveFailed'));
        } finally {
            setIsSaving(false);
        }
    };

    const handleAvatarPick = async () => {
        const permResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permResult.granted) {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (result.canceled || !result.assets?.[0]) return;

        setIsUploading(true);
        try {
            const asset = result.assets[0];
            const ext = asset.uri.split('.').pop() || 'jpg';
            const fileName = `${user?.id || 'unknown'}_${Date.now()}.${ext}`;
            const filePath = `avatars/${fileName}`;

            // Fetch the image as a blob
            const response = await fetch(asset.uri);
            const blob = await response.blob();

            // Read blob as ArrayBuffer
            const arrayBuffer = await new Response(blob).arrayBuffer();

            const { error: uploadError } = await supabase.storage
                .from('avatars')
                .upload(filePath, arrayBuffer, {
                    contentType: `image/${ext}`,
                    upsert: true,
                });

            if (uploadError) throw uploadError;

            const { data: urlData } = supabase.storage
                .from('avatars')
                .getPublicUrl(filePath);

            setAvatarUrl(urlData.publicUrl);
        } catch (err: any) {
            console.error('Avatar upload error:', err);
            Alert.alert('Upload Failed', err.message || 'Could not upload avatar.');
        } finally {
            setIsUploading(false);
        }
    };

    const languages = [
        { key: 'en', label: 'English' },
        { key: 'fr', label: 'Français' },
    ];

    const menuItems = [
        { icon: Shield, label: t('account.security'), sub: t('account.securitySub'), route: 'SecurityPrivacy' },
        ...(persona === 'tenant' ? [
            { icon: Key, label: t('account.digitalKeys'), sub: t('account.digitalKeysSub'), route: 'DigitalKeycard' },
            { icon: CreditCard, label: t('account.paymentMethods'), sub: t('account.paymentMethodsSub'), route: 'PaymentMethods' },
        ] : []),
        { icon: Bell, label: t('account.notifications'), sub: t('account.notificationsSub'), route: 'Notifications' },
    ];

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerRow}>
                        <Text style={styles.headerTitle}>{t('profile.title')}</Text>
                        {!isEditing ? (
                            <TouchableOpacity onPress={handleStartEdit} style={styles.editToggle}>
                                <Pencil color={colors.primary} size={16} />
                            </TouchableOpacity>
                        ) : (
                            <TouchableOpacity onPress={handleCancelEdit} style={styles.editToggle}>
                                <X color={colors.error} size={16} />
                            </TouchableOpacity>
                        )}
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                {/* Digital ID Card */}
                <GlassCard style={styles.idCard}>
                    <View style={styles.idHeader}>
                        <TouchableOpacity
                            style={styles.avatarContainer}
                            onPress={isEditing ? handleAvatarPick : undefined}
                            disabled={!isEditing}
                        >
                            {avatarUrl ? (
                                <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <User color={colors.primary} size={32} />
                                </View>
                            )}
                            {isEditing && (
                                <View style={styles.cameraOverlay}>
                                    {isUploading ? (
                                        <ActivityIndicator color="white" size="small" />
                                    ) : (
                                        <Camera color="white" size={16} />
                                    )}
                                </View>
                            )}
                        </TouchableOpacity>
                        <View style={styles.idInfo}>
                            {isEditing ? (
                                <TextInput
                                    style={styles.nameInput}
                                    value={editName}
                                    onChangeText={setEditName}
                                    placeholder="Full Name"
                                    placeholderTextColor={colors.textTertiary}
                                />
                            ) : (
                                <Text style={styles.name}>
                                    {(profile?.full_name || user?.email || 'RESIDENT').toUpperCase()}
                                </Text>
                            )}
                            <Text style={styles.role}>
                                {persona === 'landlord' ? t('profile.landlord') : t('profile.resident')} • {t('common.verified')}
                            </Text>
                        </View>
                        {!isEditing && (
                            <View style={styles.qrPlaceholder}>
                                <View style={styles.qrDot} />
                            </View>
                        )}
                    </View>

                    <View style={styles.idFooter}>
                        <View>
                            <Text style={styles.idLabel}>{t('profile.address')}</Text>
                            <Text style={styles.idValue}>
                                {persona === 'landlord'
                                    ? `${stats?.buildings || 0} ${t('tenantHome.building')}${stats?.buildings !== 1 ? 'S' : ''}, ${stats?.units || 0} ${t('tenantHome.unit')}${stats?.units !== 1 ? 'S' : ''}`
                                    : stats
                                        ? `${t('tenantHome.unit')} ${stats.unit_number}, ${(Array.isArray(stats.building) ? stats.building[0]?.address : stats.building?.address) || ''}`
                                        : t('profile.noUnit')}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.idLabel}>MEMBER SINCE</Text>
                            <Text style={styles.idValue}>
                                {user?.created_at
                                    ? new Date(user.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }).toUpperCase()
                                    : '—'}
                            </Text>
                        </View>
                    </View>
                </GlassCard>

                {/* Editable Fields (shown in edit mode) */}
                {isEditing && (
                    <>
                        <Text style={styles.sectionHeader}>{t('profile.editDetails')}</Text>

                        <GlassCard style={styles.editCard}>
                            <Text style={styles.editLabel}>{t('profile.phone')}</Text>
                            <TextInput
                                style={styles.editInput}
                                value={editPhone}
                                onChangeText={setEditPhone}
                                placeholder={t('profile.phonePlaceholder')}
                                placeholderTextColor={colors.textTertiary}
                                keyboardType="phone-pad"
                            />
                        </GlassCard>

                        <GlassCard style={styles.editCard}>
                            <Text style={styles.editLabel}>{t('profile.language')}</Text>
                            <View style={styles.langRow}>
                                {languages.map((lang) => (
                                    <TouchableOpacity
                                        key={lang.key}
                                        style={[styles.langChip, editLanguage === lang.key && styles.langChipActive]}
                                        onPress={() => {
                                            setEditLanguage(lang.key);
                                            setLocale(lang.key);
                                        }}
                                    >
                                        <Text style={[styles.langChipText, editLanguage === lang.key && styles.langChipTextActive]}>
                                            {lang.label}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                        </GlassCard>

                        <TouchableOpacity
                            style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                            onPress={handleSave}
                            disabled={isSaving}
                        >
                            {isSaving ? (
                                <ActivityIndicator color={colors.textInverse} />
                            ) : (
                                <>
                                    <Check color={colors.textInverse} size={18} />
                                    <Text style={styles.saveBtnText}>{t('common.save')}</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}

                <Text style={styles.sectionHeader}>{t('account.title')}</Text>
                <View style={styles.menuContainer}>
                    {menuItems.map((item, idx) => (
                        <TouchableOpacity
                            key={idx}
                            style={styles.menuItem}
                            onPress={() => item.route && navigation.navigate(item.route)}
                        >
                            <View style={styles.menuIconContainer}>
                                <item.icon color={colors.primary} size={20} />
                            </View>
                            <View style={styles.menuTextContainer}>
                                <Text style={styles.menuLabel}>{item.label}</Text>
                                <Text style={styles.menuSub}>{item.sub}</Text>
                            </View>
                            <ChevronRight color={colors.textTertiary} size={16} />
                        </TouchableOpacity>
                    ))}
                </View>

                <TouchableOpacity style={styles.logoutButton} onPress={signOut}>
                    <LogOut color={colors.error} size={20} />
                    <Text style={styles.logoutText}>{t('profile.signOut')}</Text>
                </TouchableOpacity>

                <Text style={styles.vTag}>{t('profile.version')}</Text>
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
        paddingBottom: spacing.s,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: spacing.s,
        paddingHorizontal: spacing.l,
    },
    headerTitle: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textSecondary,
        letterSpacing: 3,
        textAlign: 'center',
        flex: 1,
    },
    editToggle: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(15, 76, 58, 0.06)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        padding: spacing.l,
        paddingBottom: 100,
    },
    idCard: {
        padding: 0,
        overflow: 'hidden',
        backgroundColor: 'rgba(255,255,255,0.7)',
        borderColor: colors.primary,
        borderWidth: 0.5,
    },
    idHeader: {
        flexDirection: 'row',
        padding: spacing.l,
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    avatarContainer: {
        marginRight: spacing.m,
        position: 'relative',
    },
    avatar: {
        width: 64,
        height: 64,
        borderRadius: 32,
    },
    avatarPlaceholder: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: 'rgba(15, 76, 58, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    cameraOverlay: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: 'white',
    },
    idInfo: {
        flex: 1,
    },
    name: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    nameInput: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        borderBottomWidth: 1,
        borderBottomColor: colors.primary,
        paddingVertical: 4,
    },
    role: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.primary,
        letterSpacing: 1,
        marginTop: 4,
    },
    qrPlaceholder: {
        width: 40,
        height: 40,
        backgroundColor: '#F5F5F5',
        borderRadius: 4,
        padding: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    qrDot: {
        width: 24,
        height: 24,
        borderWidth: 4,
        borderColor: colors.text,
        borderStyle: 'dashed',
    },
    idFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: spacing.l,
        backgroundColor: 'rgba(15, 76, 58, 0.03)',
    },
    idLabel: {
        fontSize: 8,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
        marginBottom: 4,
    },
    idValue: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.text,
    },
    // Edit mode
    sectionHeader: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginTop: spacing.xl,
        marginBottom: spacing.m,
    },
    editCard: {
        padding: spacing.l,
        marginBottom: spacing.m,
    },
    editLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.s,
    },
    editInput: {
        fontSize: 16,
        fontWeight: '600',
        color: colors.text,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
        paddingVertical: 6,
    },
    langRow: {
        flexDirection: 'row',
        gap: spacing.s,
    },
    langChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: colors.surface,
        borderWidth: 1,
        borderColor: colors.border,
    },
    langChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    langChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    langChipTextActive: {
        color: colors.textInverse,
    },
    saveBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: 12,
        marginTop: spacing.m,
    },
    saveBtnDisabled: {
        opacity: 0.5,
    },
    saveBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textInverse,
        letterSpacing: 1.5,
    },
    // Menu
    menuContainer: {
        backgroundColor: 'white',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    menuIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    menuTextContainer: {
        flex: 1,
    },
    menuLabel: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    menuSub: {
        fontSize: 10,
        color: colors.textTertiary,
        marginTop: 2,
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        marginTop: spacing.xxl,
        paddingVertical: spacing.m,
        borderWidth: 1,
        borderColor: colors.error,
        borderRadius: 8,
        borderStyle: 'dashed',
    },
    logoutText: {
        fontSize: 10,
        fontWeight: '700',
        color: colors.error,
        letterSpacing: 1.5,
    },
    vTag: {
        textAlign: 'center',
        fontSize: 8,
        color: colors.textTertiary,
        marginTop: spacing.xl,
        letterSpacing: 1,
    }
});
