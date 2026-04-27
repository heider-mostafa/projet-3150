import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, DateData } from 'react-native-calendars';
import { colors, spacing } from '../../theme';
import { GlassCard } from '../../components/GlassCard';
import {
    ChevronLeft,
    Plus,
    Clock,
    MapPin,
    User,
    Wrench,
    Calendar as CalendarIcon,
    CheckCircle,
    XCircle,
    AlertTriangle,
    UserPlus,
} from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';

interface Appointment {
    id: string;
    title: string;
    description: string | null;
    scheduled_at: string;
    duration_minutes: number;
    location: string | null;
    status: 'scheduled' | 'completed' | 'cancelled';
    request_id: string | null;
    vendor?: { company_name?: string; contact_name?: string; name?: string; specialty: string } | null;
    request?: { category: string; description: string } | null;
}

interface MarkedDates {
    [date: string]: {
        marked: boolean;
        dotColor: string;
        selected?: boolean;
        selectedColor?: string;
    };
}

export const CalendarScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useAuth();
    const { t } = useLanguage();
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);
    const [markedDates, setMarkedDates] = useState<MarkedDates>({});

    const fetchAppointments = useCallback(async () => {
        if (!user) return;

        try {
            const { data, error } = await supabase
                .from('project_appointments')
                .select(`
                    *,
                    vendor:project_vendors(company_name, contact_name, name, specialty),
                    request:project_requests(category, description)
                `)
                .eq('landlord_id', user.id)
                .order('scheduled_at', { ascending: true });

            if (error) throw error;

            const appointmentData = (data || []) as Appointment[];
            setAppointments(appointmentData);

            // Build marked dates
            const marks: MarkedDates = {};
            appointmentData.forEach(apt => {
                const date = apt.scheduled_at.split('T')[0];
                marks[date] = {
                    marked: true,
                    dotColor: apt.status === 'completed' ? colors.success :
                             apt.status === 'cancelled' ? colors.error : colors.primary,
                };
            });

            // Add selected date styling
            if (marks[selectedDate]) {
                marks[selectedDate] = { ...marks[selectedDate], selected: true, selectedColor: colors.primary };
            } else {
                marks[selectedDate] = { marked: false, dotColor: '', selected: true, selectedColor: colors.primary };
            }

            setMarkedDates(marks);
        } catch (err) {
            console.error('Error fetching appointments:', err);
        } finally {
            setLoading(false);
        }
    }, [user, selectedDate]);

    useEffect(() => {
        fetchAppointments();
    }, [fetchAppointments]);

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);

        // Update marked dates with new selection
        setMarkedDates(prev => {
            const updated = { ...prev };
            // Remove selection from previous date
            Object.keys(updated).forEach(date => {
                if (updated[date].selected) {
                    updated[date] = { ...updated[date], selected: false, selectedColor: undefined };
                }
            });
            // Add selection to new date
            if (updated[day.dateString]) {
                updated[day.dateString] = { ...updated[day.dateString], selected: true, selectedColor: colors.primary };
            } else {
                updated[day.dateString] = { marked: false, dotColor: '', selected: true, selectedColor: colors.primary };
            }
            return updated;
        });
    };

    const selectedDateAppointments = appointments.filter(apt =>
        apt.scheduled_at.startsWith(selectedDate)
    );

    const formatTime = (iso: string) => {
        return new Date(iso).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    const formatDuration = (minutes: number) => {
        if (minutes < 60) return `${minutes}min`;
        const hours = Math.floor(minutes / 60);
        const mins = minutes % 60;
        return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed':
                return <CheckCircle color={colors.success} size={16} />;
            case 'cancelled':
                return <XCircle color={colors.error} size={16} />;
            default:
                return <Clock color={colors.primary} size={16} />;
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return colors.success;
            case 'cancelled': return colors.error;
            default: return colors.primary;
        }
    };

    const handleAppointmentPress = (appointment: Appointment) => {
        if (appointment.request_id) {
            navigation.navigate('RequestDetail', { requestId: appointment.request_id });
        }
    };

    const handleAddAppointment = () => {
        Alert.alert(
            t('calendar.newAppointment'),
            t('calendar.newAppointmentMsg'),
            [{ text: t('common.ok') }]
        );
    };

    const getVendorName = (vendor: any): string => {
        if (!vendor) return '';
        return vendor.company_name || vendor.contact_name || vendor.name || t('activity.assignedExpert');
    };

    const formatSelectedDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        if (dateString === today.toISOString().split('T')[0]) {
            return t('calendar.today');
        } else if (dateString === tomorrow.toISOString().split('T')[0]) {
            return t('calendar.tomorrow');
        }
        return date.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric'
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <SafeAreaView edges={['top']}>
                    <View style={styles.headerContent}>
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                            <ChevronLeft color={colors.text} size={24} />
                        </TouchableOpacity>
                        <View style={styles.headerCenter}>
                            <Text style={styles.headerTitle}>{t('calendar.title')}</Text>
                        </View>
                        <TouchableOpacity
                            onPress={() => navigation.navigate('ContactPicker')}
                            style={styles.addBtn}
                        >
                            <UserPlus color={colors.primary} size={18} />
                        </TouchableOpacity>
                    </View>
                </SafeAreaView>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                <Calendar
                    style={styles.calendar}
                    theme={{
                        backgroundColor: colors.surface,
                        calendarBackground: colors.surface,
                        textSectionTitleColor: colors.textTertiary,
                        selectedDayBackgroundColor: colors.primary,
                        selectedDayTextColor: colors.textInverse,
                        todayTextColor: colors.primary,
                        dayTextColor: colors.text,
                        textDisabledColor: colors.textTertiary,
                        dotColor: colors.primary,
                        monthTextColor: colors.text,
                        arrowColor: colors.primary,
                        textDayFontWeight: '500',
                        textMonthFontWeight: '700',
                        textDayHeaderFontWeight: '600',
                        textDayFontSize: 14,
                        textMonthFontSize: 16,
                        textDayHeaderFontSize: 11,
                    }}
                    markedDates={markedDates}
                    onDayPress={handleDayPress}
                    enableSwipeMonths={true}
                />

                <View style={styles.scheduleSection}>
                    <View style={styles.dateHeader}>
                        <CalendarIcon color={colors.primary} size={18} />
                        <Text style={styles.dateTitle}>{formatSelectedDate(selectedDate)}</Text>
                    </View>

                    {loading ? (
                        <ActivityIndicator color={colors.primary} style={{ marginTop: 20 }} />
                    ) : selectedDateAppointments.length === 0 ? (
                        <GlassCard style={styles.emptyCard}>
                            <Text style={styles.emptyText}>{t('calendar.noAppointments')}</Text>
                            <Text style={styles.emptySubtext}>
                                {t('calendar.noAppointmentsSub')}
                            </Text>
                        </GlassCard>
                    ) : (
                        selectedDateAppointments.map((appointment) => (
                            <TouchableOpacity
                                key={appointment.id}
                                onPress={() => handleAppointmentPress(appointment)}
                                activeOpacity={0.7}
                            >
                                <GlassCard style={styles.appointmentCard}>
                                    <View style={[styles.statusBar, { backgroundColor: getStatusColor(appointment.status) }]} />
                                    <View style={styles.appointmentContent}>
                                        <View style={styles.timeRow}>
                                            <View style={styles.timeInfo}>
                                                <Text style={styles.timeText}>{formatTime(appointment.scheduled_at)}</Text>
                                                <Text style={styles.durationText}>{formatDuration(appointment.duration_minutes)}</Text>
                                            </View>
                                            {getStatusIcon(appointment.status)}
                                        </View>

                                        <Text style={styles.appointmentTitle}>{appointment.title}</Text>

                                        {appointment.description && (
                                            <Text style={styles.appointmentDesc} numberOfLines={2}>
                                                {appointment.description}
                                            </Text>
                                        )}

                                        <View style={styles.metaRow}>
                                            {appointment.vendor && (
                                                <View style={styles.metaItem}>
                                                    <User color={colors.textTertiary} size={12} />
                                                    <Text style={styles.metaText}>
                                                        {getVendorName(appointment.vendor)}
                                                    </Text>
                                                </View>
                                            )}
                                            {appointment.location && (
                                                <View style={styles.metaItem}>
                                                    <MapPin color={colors.textTertiary} size={12} />
                                                    <Text style={styles.metaText} numberOfLines={1}>
                                                        {appointment.location}
                                                    </Text>
                                                </View>
                                            )}
                                            {appointment.request && (
                                                <View style={styles.metaItem}>
                                                    <Wrench color={colors.textTertiary} size={12} />
                                                    <Text style={styles.metaText}>
                                                        {(appointment.request as any).category?.toUpperCase() || 'Request'}
                                                    </Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))
                    )}
                </View>

                <View style={styles.legend}>
                    <Text style={styles.legendTitle}>{t('calendar.statusLegend')}</Text>
                    <View style={styles.legendRow}>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.primary }]} />
                            <Text style={styles.legendText}>{t('calendar.scheduled')}</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.success }]} />
                            <Text style={styles.legendText}>{t('calendar.completed')}</Text>
                        </View>
                        <View style={styles.legendItem}>
                            <View style={[styles.legendDot, { backgroundColor: colors.error }]} />
                            <Text style={styles.legendText}>{t('calendar.cancelled')}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.spacer} />
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
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing.m,
        paddingVertical: spacing.m,
    },
    backBtn: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 12,
        fontWeight: '800',
        color: colors.text,
        letterSpacing: 2,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${colors.primary}10`,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContent: {
        paddingBottom: 40,
    },
    calendar: {
        borderBottomWidth: 1,
        borderBottomColor: colors.border,
    },
    scheduleSection: {
        padding: spacing.l,
    },
    dateHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: spacing.l,
    },
    dateTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    emptyCard: {
        padding: spacing.xl,
        alignItems: 'center',
        backgroundColor: colors.surface,
    },
    emptyText: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.textSecondary,
    },
    emptySubtext: {
        fontSize: 12,
        color: colors.textTertiary,
        textAlign: 'center',
        marginTop: spacing.s,
        lineHeight: 18,
    },
    appointmentCard: {
        flexDirection: 'row',
        padding: 0,
        marginBottom: spacing.m,
        overflow: 'hidden',
        backgroundColor: colors.surface,
    },
    statusBar: {
        width: 4,
    },
    appointmentContent: {
        flex: 1,
        padding: spacing.m,
    },
    timeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.s,
    },
    timeInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    timeText: {
        fontSize: 14,
        fontWeight: '700',
        color: colors.text,
    },
    durationText: {
        fontSize: 11,
        fontWeight: '600',
        color: colors.textTertiary,
        backgroundColor: `${colors.primary}10`,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    appointmentTitle: {
        fontSize: 15,
        fontWeight: '600',
        color: colors.text,
        marginBottom: 4,
    },
    appointmentDesc: {
        fontSize: 12,
        color: colors.textSecondary,
        lineHeight: 18,
        marginBottom: spacing.s,
    },
    metaRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginTop: spacing.s,
    },
    metaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    metaText: {
        fontSize: 11,
        color: colors.textTertiary,
        fontWeight: '500',
    },
    legend: {
        paddingHorizontal: spacing.l,
        marginTop: spacing.m,
    },
    legendTitle: {
        fontSize: 9,
        fontWeight: '800',
        color: colors.textTertiary,
        letterSpacing: 1.5,
        marginBottom: spacing.m,
    },
    legendRow: {
        flexDirection: 'row',
        gap: 20,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        fontSize: 11,
        color: colors.textSecondary,
        fontWeight: '500',
    },
    spacer: {
        height: 40,
    },
});
