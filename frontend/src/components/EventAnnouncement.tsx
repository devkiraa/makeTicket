'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from '@/components/ui/tabs';
import {
    AlertCircle,
    Bell,
    Calendar,
    Loader2,
    Send,
    X,
    Eye,
    CheckCircle2,
    AlertTriangle
} from 'lucide-react';

interface EventAnnouncementProps {
    eventId: string;
    eventTitle: string;
    onSuccess?: () => void;
}

export function EventAnnouncement({ eventId, eventTitle, onSuccess }: EventAnnouncementProps) {
    const [open, setOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('custom');
    const [loading, setLoading] = useState(false);
    const [previewLoading, setPreviewLoading] = useState(false);
    const [result, setResult] = useState<{ success: boolean; message: string; stats?: any } | null>(null);
    const [previewHtml, setPreviewHtml] = useState<string | null>(null);

    // Form states
    const [subject, setSubject] = useState('');
    const [message, setMessage] = useState('');
    const [newDateTime, setNewDateTime] = useState('');
    const [newLocation, setNewLocation] = useState('');
    const [additionalMessage, setAdditionalMessage] = useState('');
    const [cancelReason, setCancelReason] = useState('');
    const [refundInfo, setRefundInfo] = useState('');

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

    const getPreview = async () => {
        setPreviewLoading(true);
        try {
            const token = localStorage.getItem('auth_token');
            const res = await fetch(`${API_URL}/events/${eventId}/announce/preview`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    type: activeTab,
                    subject: getSubjectForTab(),
                    message: getMessageForTab(),
                    eventTitle,
                    newDateTime: activeTab === 'time_change' ? newDateTime : undefined,
                    newLocation: activeTab === 'time_change' ? newLocation : undefined
                })
            });

            if (res.ok) {
                const data = await res.json();
                setPreviewHtml(data.html);
            }
        } catch (error) {
            console.error('Failed to get preview:', error);
        } finally {
            setPreviewLoading(false);
        }
    };

    const getSubjectForTab = () => {
        switch (activeTab) {
            case 'cancellation':
                return `❌ Event Cancelled: ${eventTitle}`;
            case 'time_change':
                return `📅 Schedule Update: ${eventTitle}`;
            default:
                return subject;
        }
    };

    const getMessageForTab = () => {
        switch (activeTab) {
            case 'cancellation':
                let msg = `We regret to inform you that "${eventTitle}" has been cancelled.`;
                if (cancelReason) msg += `\n\nReason: ${cancelReason}`;
                if (refundInfo) msg += `\n\n💰 Refund Information:\n${refundInfo}`;
                return msg;
            case 'time_change':
                let timeMsg = `The schedule for "${eventTitle}" has been updated.`;
                if (additionalMessage) timeMsg += `\n\n${additionalMessage}`;
                return timeMsg;
            default:
                return message;
        }
    };

    const sendAnnouncement = async () => {
        setLoading(true);
        setResult(null);

        try {
            const token = localStorage.getItem('auth_token');
            let endpoint = `${API_URL}/events/${eventId}/announce`;
            let body: any = {
                type: activeTab,
                subject: getSubjectForTab(),
                message: getMessageForTab()
            };

            if (activeTab === 'cancellation') {
                endpoint = `${API_URL}/events/${eventId}/cancel`;
                body = { reason: cancelReason, refundInfo };
            } else if (activeTab === 'time_change') {
                endpoint = `${API_URL}/events/${eventId}/update-time`;
                body = { newDateTime, newLocation, additionalMessage };
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(body)
            });

            const data = await res.json();

            if (res.ok) {
                setResult({
                    success: true,
                    message: data.message || 'Announcement sent successfully!',
                    stats: data.stats
                });
                onSuccess?.();
            } else {
                setResult({
                    success: false,
                    message: data.message || 'Failed to send announcement'
                });
            }
        } catch (error) {
            setResult({
                success: false,
                message: 'Failed to send announcement. Please try again.'
            });
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setSubject('');
        setMessage('');
        setNewDateTime('');
        setNewLocation('');
        setAdditionalMessage('');
        setCancelReason('');
        setRefundInfo('');
        setResult(null);
        setPreviewHtml(null);
    };

    const handleClose = () => {
        setOpen(false);
        resetForm();
    };

    return (
        <Dialog open={open} onOpenChange={(o: boolean) => { setOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
                <Button variant="outline" className="gap-2">
                    <Bell className="w-4 h-4" />
                    Send Announcement
                </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Bell className="w-5 h-5 text-indigo-600" />
                        Send Announcement
                    </DialogTitle>
                    <DialogDescription>
                        Notify all registered attendees about event updates
                    </DialogDescription>
                </DialogHeader>

                {result ? (
                    <div className="py-8 text-center">
                        {result.success ? (
                            <>
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <CheckCircle2 className="w-8 h-8 text-green-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Announcement Sent!
                                </h3>
                                {result.stats && (
                                    <p className="text-gray-600 mb-4">
                                        Successfully sent to {result.stats.sent} of {result.stats.total} attendees
                                        {result.stats.failed > 0 && ` (${result.stats.failed} failed)`}
                                    </p>
                                )}
                                <Button onClick={handleClose}>Close</Button>
                            </>
                        ) : (
                            <>
                                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <AlertCircle className="w-8 h-8 text-red-600" />
                                </div>
                                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                                    Failed to Send
                                </h3>
                                <p className="text-gray-600 mb-4">{result.message}</p>
                                <Button variant="outline" onClick={() => setResult(null)}>
                                    Try Again
                                </Button>
                            </>
                        )}
                    </div>
                ) : previewHtml ? (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="font-medium text-gray-900">Email Preview</h3>
                            <Button variant="ghost" size="sm" onClick={() => setPreviewHtml(null)}>
                                <X className="w-4 h-4 mr-1" /> Close Preview
                            </Button>
                        </div>
                        <div className="border rounded-lg overflow-hidden bg-gray-50">
                            <iframe
                                srcDoc={previewHtml}
                                className="w-full h-[400px] border-0"
                                title="Email Preview"
                            />
                        </div>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1" onClick={() => setPreviewHtml(null)}>
                                Back to Edit
                            </Button>
                            <Button className="flex-1 bg-indigo-600 hover:bg-indigo-700" onClick={sendAnnouncement} disabled={loading}>
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                Send to All Attendees
                            </Button>
                        </div>
                    </div>
                ) : (
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                            <TabsTrigger value="custom" className="gap-1">
                                <Bell className="w-4 h-4" />
                                <span className="hidden sm:inline">Custom</span>
                            </TabsTrigger>
                            <TabsTrigger value="time_change" className="gap-1">
                                <Calendar className="w-4 h-4" />
                                <span className="hidden sm:inline">Time Change</span>
                            </TabsTrigger>
                            <TabsTrigger value="cancellation" className="gap-1 text-red-600 data-[state=active]:text-red-600">
                                <X className="w-4 h-4" />
                                <span className="hidden sm:inline">Cancel</span>
                            </TabsTrigger>
                        </TabsList>

                        {/* Custom Announcement */}
                        <TabsContent value="custom" className="space-y-4 mt-4">
                            <div className="space-y-2">
                                <Label>Subject *</Label>
                                <Input
                                    placeholder="Important Update About Your Event"
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Message *</Label>
                                <Textarea
                                    placeholder="Write your announcement message here..."
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    rows={6}
                                />
                            </div>
                        </TabsContent>

                        {/* Time Change */}
                        <TabsContent value="time_change" className="space-y-4 mt-4">
                            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-amber-800">Schedule Update</p>
                                    <p className="text-amber-700 text-sm">All attendees will be notified about the new date/time.</p>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>New Date & Time</Label>
                                    <Input
                                        type="datetime-local"
                                        value={newDateTime}
                                        onChange={(e) => setNewDateTime(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>New Location (optional)</Label>
                                    <Input
                                        placeholder="New venue or online link"
                                        value={newLocation}
                                        onChange={(e) => setNewLocation(e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Additional Message (optional)</Label>
                                <Textarea
                                    placeholder="Any additional information about the change..."
                                    value={additionalMessage}
                                    onChange={(e) => setAdditionalMessage(e.target.value)}
                                    rows={3}
                                />
                            </div>
                        </TabsContent>

                        {/* Cancellation */}
                        <TabsContent value="cancellation" className="space-y-4 mt-4">
                            <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                                <div>
                                    <p className="font-medium text-red-800">⚠️ This will cancel the event</p>
                                    <p className="text-red-700 text-sm">The event will be closed and all attendees will be notified. This action cannot be undone.</p>
                                </div>
                            </div>
                            <div className="space-y-2">
                                <Label>Reason for Cancellation (optional)</Label>
                                <Textarea
                                    placeholder="Explain why the event is being cancelled..."
                                    value={cancelReason}
                                    onChange={(e) => setCancelReason(e.target.value)}
                                    rows={3}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Refund Information (optional)</Label>
                                <Textarea
                                    placeholder="Details about refunds if applicable..."
                                    value={refundInfo}
                                    onChange={(e) => setRefundInfo(e.target.value)}
                                    rows={2}
                                />
                            </div>
                        </TabsContent>

                        {/* Action Buttons */}
                        <div className="flex gap-2 mt-6 pt-4 border-t">
                            <Button
                                variant="outline"
                                className="flex-1"
                                onClick={getPreview}
                                disabled={previewLoading || (activeTab === 'custom' && (!subject || !message))}
                            >
                                {previewLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Eye className="w-4 h-4 mr-2" />}
                                Preview
                            </Button>
                            <Button
                                className={`flex-1 ${activeTab === 'cancellation' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                                onClick={sendAnnouncement}
                                disabled={loading || (activeTab === 'custom' && (!subject || !message)) || (activeTab === 'time_change' && !newDateTime && !newLocation)}
                            >
                                {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                                {activeTab === 'cancellation' ? 'Cancel Event & Notify' : 'Send Announcement'}
                            </Button>
                        </div>
                    </Tabs>
                )}
            </DialogContent>
        </Dialog>
    );
}
