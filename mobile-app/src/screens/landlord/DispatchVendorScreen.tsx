import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    TextInput, ActivityIndicator, Alert, Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft, Truck, Clock, DollarSign,
    FileText, CheckCircle2, ShieldCheck, Star, Calendar, MapPin
} from 'lucide-react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import DateTimePicker from '@react-native-community/datetimepicker';

interface Vendor {
    id: string;
    name: string;
    specialty: string;
    rating: number;
    phone: string;
    is_verified: boolean;
}

interface RequestInfo {
    id: string;
    category: string;
    description: string;
    urgency_level: string;
    building_id: string;
    tenant_id: string;
    building_address?: string;
    unit_number?: string;
}

export const DispatchVendorScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { user } = useAuth();

    const requestId = route.params?.requestId;
    const buildingId = route.params?.buildingId;

    const [request, setRequest] = useState<RequestInfo | null>(null);
    const [vendors, setVendors] = useState<Vendor[]>([]);
    const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
    const [scheduledDate, setScheduledDate] = useState(new Date());
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [estimatedCost, setEstimatedCost] = useState('');
    const [notes, setNotes] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Fetch request details
            const { data: reqData } = await supabase
                .from('project_requests')
                .select(`
                    id, category, description, urgency_level, building_id, tenant_id,
                    building:project_buildings(address),
                    unit:project_units!unit_id(unit_number)
                `)
                .eq('id', requestId)
                .single();

            if (reqData) {
                const bld = Array.isArray(reqData.building) ? reqData.building[0] : reqData.building;
                const unt = Array.isArray(reqData.unit) ? reqData.unit[0] : reqData.unit;
                setRequest({
                    ...reqData,
                    building_address: bld?.address || '',
                    unit_number: unt?.unit_number || '',
                } as RequestInfo);
            }

            // Fetch vendors from landlord's network
            if (!user) return;
            const { data: networkVendors } = await supabase
                .from('project_landlord_vendors')
                .select(`
                    vendor:project_vendors(
                        id, name, specialty, rating, phone_number, is_verified
                    )
                `)
                .eq('landlord_id', user.id);

            if (networkVendors) {
                const mapped = networkVendors
                    .map((nv: any) => {
                        const v = Array.isArray(nv.vendor) ? nv.vendor[0] : nv.vendor;
                        if (!v) return null;
                        return {
                            id: v.id,
                            name: v.name,
                            specialty: v.specialty,
                            rating: v.rating || 0,
                            phone: v.phone_number || '',
                            is_verified: v.is_verified || false,
                        };
                    })
                    .filter(Boolean) as Vendor[];
                setVendors(mapped);
            }
        } catch (err) {
            console.error('DispatchVendor fetchData error:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleDispatch = async () => {
        if (!selectedVendor) {
            Alert.alert('Select Vendor', 'Please select a vendor from your network.');
            return;
        }
        if (!user || !request) return;

        setIsSubmitting(true);
        try {
            // 1. Create work order
            const { data: workOrder, error: woError } = await supabase
                .from('project_work_orders')
                .insert({
                    request_id: requestId,
                    landlord_id: user.id,
                    vendor_id: selectedVendor.id,
                    vendor_name: selectedVendor.name,
                    vendor_phone: selectedVendor.phone,
                    scheduled_arrival: scheduledDate.toISOString(),
                    estimated_cost: estimatedCost ? parseFloat(estimatedCost) : null,
                    status: 'dispatched',
                    notes: notes || null,
                })
                .select()
                .single();

            if (woError) throw woError;

            // 2. Create appointment
            await supabase.from('project_appointments').insert({
                landlord_id: user.id,
                request_id: requestId,
                work_order_id: workOrder.id,
                title: `${selectedVendor.name} - ${request.category}`,
                scheduled_at: scheduledDate.toISOString(),
                vendor_id: selectedVendor.id,
                location: request.building_address || '',
            });

            // 3. Update request status to scheduled
            await supabase
                .from('project_requests')
                .update({ status: 'scheduled' })
                .eq('id', requestId);

            // 4. Send notification to tenant
            await supabase.from('project_notifications').insert({
                user_id: request.tenant_id,
                title: 'Vendor Dispatched',
                body: `${selectedVendor.name} has been dispatched for your ${request.category} request. Arrival: ${scheduledDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} at ${scheduledDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}`,
                type: 'maintenance',
                reference_id: requestId,
                reference_type: 'request',
            });

            Alert.alert(
                'Vendor Dispatched',
                `${selectedVendor.name} has been assigned and notified.`,
                [{ text: 'OK', onPress: () => navigation.goBack() }]
            );
        } catch (err: any) {
            console.error('Dispatch error:', err);
            Alert.alert('Dispatch Failed', err.message || 'Something went wrong.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const onDateChange = (_event: any, selectedDate?: Date) => {
        setShowDatePicker(false);
        if (selectedDate) {
            const updated = new Date(scheduledDate);
            updated.setFullYear(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
            setScheduledDate(updated);
        }
    };

    const onTimeChange = (_event: any, selectedTime?: Date) => {
        setShowTimePicker(false);
        if (selectedTime) {
            const updated = new Date(scheduledDate);
            updated.setHours(selectedTime.getHours(), selectedTime.getMinutes());
            setScheduledDate(updated);
        }
    };

    if (isLoading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View>
                            <Text style={styles.brand}>DISPATCH PROTOCOL</Text>
                            <Text style={styles.title}>Assign Vendor</Text>
                        </View>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Request Summary */}
                {request && (
                    <GlassCard style={styles.requestCard}>
                        <View style={styles.reqRow}>
                            <Text style={styles.reqLabel}>REQUEST</Text>
                            <Text style={styles.reqCategory}>{request.category.toUpperCase()}</Text>
                        </View>
                        <Text style={styles.reqDesc} numberOfLines={2}>{request.description}</Text>
                        <View style={styles.reqMeta}>
                            <MapPin color={colors.textTertiary} size={12} />
                            <Text style={styles.reqLocation}>
                                {request.building_address}{request.unit_number ? ` • Unit ${request.unit_number}` : ''}
                            </Text>
                        </View>
                    </GlassCard>
                )}

                {/* Vendor Selection */}
                <Text style={styles.sectionTitle}>SELECT VENDOR</Text>
                {vendors.length === 0 ? (
                    <GlassCard style={styles.emptyCard}>
                        <Text style={styles.emptyText}>No vendors in your network yet.</Text>
                        <Text style={styles.emptySubtext}>Add vendors via the Vendor Discovery screen.</Text>
                    </GlassCard>
                ) : (
                    <View style={styles.vendorList}>
                        {vendors.map((vendor) => (
                            <TouchableOpacity
                                key={vendor.id}
                                onPress={() => setSelectedVendor(vendor)}
                            >
                                <GlassCard style={[
                                    styles.vendorCard,
                                    selectedVendor?.id === vendor.id && styles.vendorCardSelected
                                ]}>
                                    <View style={styles.vendorRow}>
                                        <View style={styles.radioOuter}>
                                            {selectedVendor?.id === vendor.id && (
                                                <View style={styles.radioInner} />
                                            )}
                                        </View>
                                        <View style={styles.vendorInfo}>
                                            <View style={styles.vendorNameRow}>
                                                <Text style={styles.vendorName}>{vendor.name}</Text>
                                                {vendor.is_verified && (
                                                    <ShieldCheck color={colors.primary} size={14} />
                                                )}
                                            </View>
                                            <Text style={styles.vendorSpecialty}>{vendor.specialty}</Text>
                                        </View>
                                        <View style={styles.ratingBadge}>
                                            <Star color={colors.warning} size={12} fill={colors.warning} />
                                            <Text style={styles.ratingText}>{vendor.rating.toFixed(1)}</Text>
                                        </View>
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                {/* Schedule */}
                <Text style={styles.sectionTitle}>SCHEDULE</Text>
                <GlassCard style={styles.scheduleCard}>
                    <TouchableOpacity
                        style={styles.scheduleRow}
                        onPress={() => setShowDatePicker(true)}
                    >
                        <Calendar color={colors.primary} size={18} />
                        <View style={styles.scheduleInfo}>
                            <Text style={styles.scheduleLabel}>DATE</Text>
                            <Text style={styles.scheduleValue}>
                                {scheduledDate.toLocaleDateString('en-US', {
                                    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
                                })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                    <View style={styles.divider} />
                    <TouchableOpacity
                        style={styles.scheduleRow}
                        onPress={() => setShowTimePicker(true)}
                    >
                        <Clock color={colors.primary} size={18} />
                        <View style={styles.scheduleInfo}>
                            <Text style={styles.scheduleLabel}>TIME</Text>
                            <Text style={styles.scheduleValue}>
                                {scheduledDate.toLocaleTimeString('en-US', {
                                    hour: '2-digit', minute: '2-digit'
                                })}
                            </Text>
                        </View>
                    </TouchableOpacity>
                </GlassCard>

                {showDatePicker && (
                    <DateTimePicker
                        value={scheduledDate}
                        mode="date"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        minimumDate={new Date()}
                        onChange={onDateChange}
                    />
                )}
                {showTimePicker && (
                    <DateTimePicker
                        value={scheduledDate}
                        mode="time"
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                    />
                )}

                {/* Cost & Notes */}
                <Text style={styles.sectionTitle}>DETAILS</Text>
                <GlassCard style={styles.detailsCard}>
                    <View style={styles.inputRow}>
                        <DollarSign color={colors.textTertiary} size={18} />
                        <TextInput
                            style={styles.input}
                            placeholder="Estimated Cost"
                            placeholderTextColor={colors.textTertiary}
                            value={estimatedCost}
                            onChangeText={setEstimatedCost}
                            keyboardType="decimal-pad"
                        />
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.inputRow}>
                        <FileText color={colors.textTertiary} size={18} />
                        <TextInput
                            style={[styles.input, { minHeight: 60 }]}
                            placeholder="Notes for vendor (optional)"
                            placeholderTextColor={colors.textTertiary}
                            value={notes}
                            onChangeText={setNotes}
                            multiline
                        />
                    </View>
                </GlassCard>

                {/* Dispatch Button */}
                <TouchableOpacity
                    style={[
                        styles.dispatchBtn,
                        (!selectedVendor || isSubmitting) && styles.dispatchBtnDisabled
                    ]}
                    onPress={handleDispatch}
                    disabled={!selectedVendor || isSubmitting}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color={colors.textInverse} />
                    ) : (
                        <>
                            <Truck color={colors.textInverse} size={20} />
                            <Text style={styles.dispatchBtnText}>DISPATCH NOW</Text>
                        </>
                    )}
                </TouchableOpacity>

                <View style={{ height: 100 }} />
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
    title: {
        fontSize: 24,
        fontWeight: '700',
        color: colors.text,
        marginTop: 2,
    },
    scrollContent: {
        padding: spacing.l,
    },
    sectionTitle: {
        fontSize: 10,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 2,
        marginBottom: spacing.m,
        marginTop: spacing.l,
    },
    // Request card
    requestCard: {
        padding: spacing.l,
        borderLeftWidth: 3,
        borderLeftColor: colors.primary,
    },
    reqRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    reqLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    reqCategory: {
        fontSize: 9,
        fontWeight: '900',
        color: colors.primary,
        backgroundColor: 'rgba(15, 76, 58, 0.05)',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 4,
    },
    reqDesc: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        lineHeight: 20,
        marginBottom: 8,
    },
    reqMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    reqLocation: {
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    // Vendor list
    vendorList: {
        gap: spacing.s,
    },
    vendorCard: {
        padding: spacing.m,
        borderWidth: 1,
        borderColor: colors.border,
    },
    vendorCardSelected: {
        borderColor: colors.primary,
        backgroundColor: 'rgba(15, 76, 58, 0.03)',
    },
    vendorRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    radioOuter: {
        width: 22,
        height: 22,
        borderRadius: 11,
        borderWidth: 2,
        borderColor: colors.primary,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: spacing.m,
    },
    radioInner: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: colors.primary,
    },
    vendorInfo: {
        flex: 1,
    },
    vendorNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    vendorName: {
        fontSize: 15,
        fontWeight: '700',
        color: colors.text,
    },
    vendorSpecialty: {
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '500',
        marginTop: 2,
    },
    ratingBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: 'rgba(242, 201, 76, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    ratingText: {
        fontSize: 12,
        fontWeight: '700',
        color: colors.text,
    },
    // Schedule
    scheduleCard: {
        padding: 0,
        overflow: 'hidden',
    },
    scheduleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: spacing.m,
        gap: 12,
    },
    scheduleInfo: {
        flex: 1,
    },
    scheduleLabel: {
        fontSize: 9,
        fontWeight: '700',
        color: colors.textTertiary,
        letterSpacing: 1,
    },
    scheduleValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: colors.border,
    },
    // Details
    detailsCard: {
        padding: 0,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        padding: spacing.m,
        gap: 12,
    },
    input: {
        flex: 1,
        fontSize: 14,
        color: colors.text,
    },
    // Dispatch button
    dispatchBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: colors.primary,
        height: 56,
        borderRadius: 12,
        marginTop: spacing.xl,
    },
    dispatchBtnDisabled: {
        opacity: 0.5,
    },
    dispatchBtnText: {
        fontSize: 14,
        fontWeight: '800',
        color: colors.textInverse,
        letterSpacing: 1.5,
    },
    // Empty state
    emptyCard: {
        padding: spacing.xl,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptySubtext: {
        fontSize: 12,
        color: colors.textTertiary,
        marginTop: 4,
    },
});
