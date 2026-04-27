import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, FlatList
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft, Search, UserPlus, Phone, Check
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import * as Contacts from 'expo-contacts';

interface ContactItem {
    id: string;
    name: string;
    phone: string;
}

const SPECIALTIES = [
    'Plumbing', 'Electrical', 'HVAC', 'Roofing', 'Painting',
    'Carpentry', 'Locksmith', 'Cleaning', 'Landscaping', 'General'
];

export const ContactPickerScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();

    const [contacts, setContacts] = useState<ContactItem[]>([]);
    const [filteredContacts, setFilteredContacts] = useState<ContactItem[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [selectedContact, setSelectedContact] = useState<ContactItem | null>(null);
    const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        loadContacts();
    }, []);

    useEffect(() => {
        if (searchQuery.trim() === '') {
            setFilteredContacts(contacts);
        } else {
            const q = searchQuery.toLowerCase();
            setFilteredContacts(contacts.filter(c =>
                c.name.toLowerCase().includes(q) || c.phone.includes(q)
            ));
        }
    }, [searchQuery, contacts]);

    const loadContacts = async () => {
        try {
            const { status } = await Contacts.requestPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Please allow access to your contacts.');
                setIsLoading(false);
                return;
            }

            const { data } = await Contacts.getContactsAsync({
                fields: [Contacts.Fields.PhoneNumbers, Contacts.Fields.Name],
            });

            const mapped: ContactItem[] = data
                .filter(c => c.name && c.phoneNumbers && c.phoneNumbers.length > 0)
                .map(c => ({
                    id: c.id || `${c.name}_${Math.random()}`,
                    name: c.name || 'Unknown',
                    phone: c.phoneNumbers![0].number || '',
                }))
                .sort((a, b) => a.name.localeCompare(b.name));

            setContacts(mapped);
            setFilteredContacts(mapped);
        } catch (err) {
            console.error('Load contacts error:', err);
            Alert.alert('Error', 'Could not load contacts.');
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        if (!selectedContact || !selectedSpecialty || !user) return;
        setIsSaving(true);
        try {
            // Insert as custom vendor
            const { error } = await supabase
                .from('project_vendors')
                .insert({
                    name: selectedContact.name,
                    contact_name: selectedContact.name,
                    phone_number: selectedContact.phone,
                    specialty: selectedSpecialty.toLowerCase(),
                    is_custom: true,
                    created_by: user.id,
                    is_verified: false,
                    rating: 0,
                });

            if (error) throw error;

            // Also add to landlord's network
            const { data: newVendor } = await supabase
                .from('project_vendors')
                .select('id')
                .eq('phone_number', selectedContact.phone)
                .eq('created_by', user.id)
                .limit(1)
                .single();

            if (newVendor) {
                await supabase.from('project_landlord_vendors').insert({
                    landlord_id: user.id,
                    vendor_id: newVendor.id,
                });
            }

            Alert.alert(
                'Vendor Added',
                `${selectedContact.name} has been added to your network as a ${selectedSpecialty} specialist.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err: any) {
            Alert.alert('Error', err.message || 'Could not save vendor.');
        } finally {
            setIsSaving(false);
        }
    };

    const renderContact = ({ item }: { item: ContactItem }) => (
        <TouchableOpacity
            onPress={() => setSelectedContact(item)}
            style={[styles.contactCard, selectedContact?.id === item.id && styles.contactCardSelected]}
        >
            <View style={styles.contactAvatar}>
                <Text style={styles.contactInitial}>{item.name[0].toUpperCase()}</Text>
            </View>
            <View style={styles.contactInfo}>
                <Text style={styles.contactName}>{item.name}</Text>
                <View style={styles.phoneRow}>
                    <Phone color={colors.textTertiary} size={10} />
                    <Text style={styles.contactPhone}>{item.phone}</Text>
                </View>
            </View>
            {selectedContact?.id === item.id && (
                <View style={styles.checkCircle}>
                    <Check color={colors.textInverse} size={14} />
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.brand}>IMPORT CONTACT</Text>
                            <Text style={styles.headerTitle}>Add to Network</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Search color={colors.textTertiary} size={16} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search contacts..."
                    placeholderTextColor={colors.textTertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
            </View>

            {isLoading ? (
                <ActivityIndicator color={colors.primary} style={{ marginTop: 40 }} />
            ) : (
                <FlatList
                    data={filteredContacts}
                    renderItem={renderContact}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No contacts found.</Text>
                        </View>
                    }
                />
            )}

            {/* Specialty Picker (shown when contact selected) */}
            {selectedContact && (
                <View style={styles.bottomSheet}>
                    <Text style={styles.sheetTitle}>
                        Select specialty for {selectedContact.name}:
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.specialtyScroll}>
                        {SPECIALTIES.map((spec) => (
                            <TouchableOpacity
                                key={spec}
                                style={[styles.specChip, selectedSpecialty === spec && styles.specChipActive]}
                                onPress={() => setSelectedSpecialty(spec)}
                            >
                                <Text style={[styles.specChipText, selectedSpecialty === spec && styles.specChipTextActive]}>
                                    {spec}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                    <TouchableOpacity
                        style={[styles.importBtn, (!selectedSpecialty || isSaving) && styles.importBtnDisabled]}
                        onPress={handleSave}
                        disabled={!selectedSpecialty || isSaving}
                    >
                        {isSaving ? (
                            <ActivityIndicator color={colors.textInverse} />
                        ) : (
                            <>
                                <UserPlus color={colors.textInverse} size={18} />
                                <Text style={styles.importBtnText}>ADD TO NETWORK</Text>
                            </>
                        )}
                    </TouchableOpacity>
                </View>
            )}
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
        paddingBottom: spacing.m,
    },
    headerContent: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: spacing.l,
        gap: 12,
        marginTop: spacing.s,
    },
    backBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
    },
    brand: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.primary,
        letterSpacing: 2.5,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        margin: spacing.l,
        paddingHorizontal: spacing.m,
        paddingVertical: 10,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
    },
    searchInput: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    listContent: {
        paddingHorizontal: spacing.l,
        paddingBottom: 200,
    },
    contactCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        backgroundColor: colors.surface,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: colors.border,
        marginBottom: spacing.s,
    },
    contactCardSelected: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(15, 76, 58, 0.03)',
    },
    contactAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(15, 76, 58, 0.08)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    contactInitial: {
        fontSize: 16,
        fontWeight: '700',
        color: colors.primary,
    },
    contactInfo: {
        flex: 1,
    },
    contactName: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    phoneRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginTop: 2,
    },
    contactPhone: {
        fontSize: 11,
        color: colors.textTertiary,
    },
    checkCircle: {
        width: 28,
        height: 28,
        borderRadius: 14,
        backgroundColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        alignItems: 'center',
        paddingTop: 40,
    },
    emptyText: {
        fontSize: 14,
        color: colors.textTertiary,
    },
    // Bottom sheet
    bottomSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: colors.surface,
        borderTopWidth: 1,
        borderTopColor: colors.border,
        padding: spacing.l,
        paddingBottom: 40,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    sheetTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
        marginBottom: spacing.m,
    },
    specialtyScroll: {
        marginBottom: spacing.m,
    },
    specChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 16,
        backgroundColor: colors.background,
        borderWidth: 1,
        borderColor: colors.border,
        marginRight: 8,
    },
    specChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    specChipText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.textSecondary,
    },
    specChipTextActive: {
        color: colors.textInverse,
    },
    importBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        height: 52,
        borderRadius: 12,
    },
    importBtnDisabled: {
        opacity: 0.5,
    },
    importBtnText: {
        fontSize: 13,
        fontWeight: '800',
        color: colors.textInverse,
        letterSpacing: 1.5,
    },
});
