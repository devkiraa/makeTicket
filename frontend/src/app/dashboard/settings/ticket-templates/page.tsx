'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    ArrowLeft,
    Plus,
    Loader2,
    CheckCircle2,
    Edit,
    Trash2,
    Ticket,
    Star,
    Save,
    X,
    Download,
    Move,
    Type,
    QrCode,
    Image as ImageIcon,
    Palette,
    Maximize2
} from 'lucide-react';

interface TicketElement {
    id: string;
    type: 'text' | 'placeholder';
    content?: string;
    placeholder?: string;
    x: number;
    y: number;
    fontSize: number;
    fontFamily: string;
    fontWeight: string;
    color: string;
    textAlign: string;
}

interface TicketTemplate {
    _id: string;
    name: string;
    width: number;
    height: number;
    backgroundColor: string;
    backgroundImage?: string;
    backgroundSize: string;
    qrCode: {
        x: number;
        y: number;
        size: number;
        backgroundColor: string;
        foregroundColor: string;
    };
    elements: TicketElement[];
    isDefault: boolean;
    isActive: boolean;
    isGlobal?: boolean;
    createdAt: string;
}

interface TemplateSpecs {
    recommended: { width: number; height: number; format: string; dpi: number };
    sizes: Array<{ name: string; width: number; height: number; aspectRatio: string }>;
    placeholders: Array<{ key: string; description: string; example: string }>;
    qrCode: { description: string; recommendedSize: string; minSize: number; maxSize: number };
}

const sampleData: Record<string, string> = {
    'guest_name': 'John Doe',
    'event_title': 'Tech Conference 2025',
    'event_date': 'Dec 25, 2025 • 10:00 AM',
    'event_location': 'Convention Center',
    'ticket_code': 'TKT-ABC123'
};

export default function TicketTemplatesPage() {
    const [loading, setLoading] = useState(true);
    const [templates, setTemplates] = useState<TicketTemplate[]>([]);
    const [specs, setSpecs] = useState<TemplateSpecs | null>(null);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Editor state
    const [selectedTemplate, setSelectedTemplate] = useState<TicketTemplate | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [dragType, setDragType] = useState<'qr' | 'element' | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Form state
    const [formData, setFormData] = useState({
        name: '',
        width: 600,
        height: 300,
        backgroundColor: '#ffffff',
        backgroundImage: '',
        backgroundSize: 'cover',
        qrCode: {
            x: 20,
            y: 90,
            size: 120,
            backgroundColor: '#ffffff',
            foregroundColor: '#000000'
        },
        elements: [] as TicketElement[],
        isDefault: false
    });

    useEffect(() => {
        fetchTemplates();
        fetchSpecs();
    }, []);

    const fetchTemplates = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ticket-templates`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                setTemplates(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch templates', err);
        } finally {
            setLoading(false);
        }
    };

    const fetchSpecs = async () => {
        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ticket-templates/specs`,
                { headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                setSpecs(await res.json());
            }
        } catch (err) {
            console.error('Failed to fetch specs', err);
        }
    };

    const startCreating = () => {
        setSelectedTemplate(null);
        setIsCreating(true);
        setFormData({
            name: '',
            width: 600,
            height: 300,
            backgroundColor: '#1e1b4b',
            backgroundImage: '',
            backgroundSize: 'cover',
            qrCode: { x: 20, y: 90, size: 120, backgroundColor: '#ffffff', foregroundColor: '#000000' },
            elements: [
                { id: '1', type: 'placeholder', placeholder: 'event_title', x: 160, y: 30, fontSize: 24, fontFamily: 'Arial', fontWeight: 'bold', color: '#ffffff', textAlign: 'left' },
                { id: '2', type: 'placeholder', placeholder: 'guest_name', x: 160, y: 70, fontSize: 18, fontFamily: 'Arial', fontWeight: 'normal', color: '#e0e7ff', textAlign: 'left' },
                { id: '3', type: 'placeholder', placeholder: 'event_date', x: 160, y: 110, fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', color: '#a5b4fc', textAlign: 'left' },
                { id: '4', type: 'placeholder', placeholder: 'event_location', x: 160, y: 135, fontSize: 14, fontFamily: 'Arial', fontWeight: 'normal', color: '#a5b4fc', textAlign: 'left' },
                { id: '5', type: 'placeholder', placeholder: 'ticket_code', x: 160, y: 180, fontSize: 16, fontFamily: 'monospace', fontWeight: 'bold', color: '#fbbf24', textAlign: 'left' }
            ],
            isDefault: false
        });
    };

    const selectTemplate = (template: TicketTemplate) => {
        setSelectedTemplate(template);
        setIsCreating(false);
        setFormData({
            name: template.name,
            width: template.width,
            height: template.height,
            backgroundColor: template.backgroundColor,
            backgroundImage: template.backgroundImage || '',
            backgroundSize: template.backgroundSize,
            qrCode: template.qrCode,
            elements: template.elements,
            isDefault: template.isDefault
        });
    };

    const cancelEdit = () => {
        setSelectedTemplate(null);
        setIsCreating(false);
        setSelectedElement(null);
    };

    const handleSubmit = async () => {
        if (!formData.name) {
            setMessage({ type: 'error', text: 'Please enter a template name' });
            return;
        }

        setSaving(true);
        setMessage({ type: '', text: '' });

        const token = localStorage.getItem('auth_token');
        const url = selectedTemplate
            ? `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ticket-templates/${selectedTemplate._id}`
            : `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ticket-templates`;

        try {
            const res = await fetch(url, {
                method: selectedTemplate ? 'PATCH' : 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setMessage({ type: 'success', text: selectedTemplate ? 'Template updated!' : 'Template created!' });
                fetchTemplates();
                if (!selectedTemplate) {
                    setSelectedTemplate(data);
                    setIsCreating(false);
                }
            } else {
                setMessage({ type: 'error', text: data.message || 'Failed to save template' });
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Something went wrong' });
        } finally {
            setSaving(false);
        }
    };

    const deleteTemplate = async (templateId: string) => {
        if (!confirm('Delete this ticket template?')) return;

        const token = localStorage.getItem('auth_token');
        try {
            const res = await fetch(
                `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api'}/ticket-templates/${templateId}`,
                { method: 'DELETE', headers: { 'Authorization': `Bearer ${token}` } }
            );
            if (res.ok) {
                setMessage({ type: 'success', text: 'Template deleted' });
                if (selectedTemplate?._id === templateId) cancelEdit();
                fetchTemplates();
            }
        } catch (err) {
            setMessage({ type: 'error', text: 'Failed to delete' });
        }
    };

    const addElement = (type: 'text' | 'placeholder', placeholder?: string) => {
        const newElement: TicketElement = {
            id: Date.now().toString(),
            type,
            content: type === 'text' ? 'New Text' : undefined,
            placeholder: placeholder,
            x: 160,
            y: 200,
            fontSize: 16,
            fontFamily: 'Arial',
            fontWeight: 'normal',
            color: '#ffffff',
            textAlign: 'left'
        };
        setFormData({ ...formData, elements: [...formData.elements, newElement] });
        setSelectedElement(newElement.id);
    };

    const updateElement = (id: string, updates: Partial<TicketElement>) => {
        setFormData({
            ...formData,
            elements: formData.elements.map(el => el.id === id ? { ...el, ...updates } : el)
        });
    };

    const deleteElement = (id: string) => {
        setFormData({
            ...formData,
            elements: formData.elements.filter(el => el.id !== id)
        });
        setSelectedElement(null);
    };

    const handleMouseDown = (e: React.MouseEvent, type: 'qr' | 'element', elementId?: string) => {
        e.preventDefault();
        setIsDragging(true);
        setDragType(type);
        if (elementId) setSelectedElement(elementId);
    };

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging || !canvasRef.current) return;

        const rect = canvasRef.current.getBoundingClientRect();
        const scale = formData.width / rect.width;
        const x = Math.max(0, Math.min(formData.width - 50, (e.clientX - rect.left) * scale));
        const y = Math.max(0, Math.min(formData.height - 20, (e.clientY - rect.top) * scale));

        if (dragType === 'qr') {
            setFormData({ ...formData, qrCode: { ...formData.qrCode, x, y } });
        } else if (dragType === 'element' && selectedElement) {
            updateElement(selectedElement, { x, y });
        }
    };

    const handleMouseUp = () => {
        setIsDragging(false);
        setDragType(null);
    };

    const downloadTemplate = () => {
        const canvas = document.createElement('canvas');
        canvas.width = formData.width;
        canvas.height = formData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Background
        ctx.fillStyle = formData.backgroundColor;
        ctx.fillRect(0, 0, formData.width, formData.height);

        // Draw border guide
        ctx.strokeStyle = 'rgba(255,255,255,0.3)';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(10, 10, formData.width - 20, formData.height - 20);
        ctx.setLineDash([]);

        // QR placeholder with border
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(formData.qrCode.x, formData.qrCode.y, formData.qrCode.size, formData.qrCode.size);
        ctx.strokeStyle = '#4F46E5';
        ctx.lineWidth = 2;
        ctx.strokeRect(formData.qrCode.x, formData.qrCode.y, formData.qrCode.size, formData.qrCode.size);
        ctx.fillStyle = '#6366f1';
        ctx.font = 'bold 12px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR CODE ZONE', formData.qrCode.x + formData.qrCode.size / 2, formData.qrCode.y + formData.qrCode.size / 2);
        ctx.font = '10px Arial';
        ctx.fillText(`${formData.qrCode.size}×${formData.qrCode.size}px`, formData.qrCode.x + formData.qrCode.size / 2, formData.qrCode.y + formData.qrCode.size / 2 + 15);

        // Elements with position markers
        formData.elements.forEach(el => {
            // Draw position marker
            ctx.fillStyle = 'rgba(99, 102, 241, 0.2)';
            ctx.fillRect(el.x - 2, el.y - 2, 150, el.fontSize + 4);

            ctx.fillStyle = el.color;
            ctx.font = `${el.fontWeight} ${el.fontSize}px ${el.fontFamily}`;
            ctx.textAlign = el.textAlign as CanvasTextAlign;
            const text = el.type === 'placeholder' ? `{{${el.placeholder}}}` : (el.content || '');
            ctx.fillText(text, el.x, el.y + el.fontSize);
        });

        // Add dimension labels
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '11px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(`${formData.width} × ${formData.height}px`, formData.width / 2, formData.height - 8);

        // Download
        const link = document.createElement('a');
        link.download = `${formData.name || 'ticket-template'}-guide.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    // Download blank template for external design
    const downloadBlankTemplate = () => {
        const canvas = document.createElement('canvas');
        canvas.width = formData.width;
        canvas.height = formData.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        // Transparent/white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, formData.width, formData.height);

        // Safety margins
        ctx.strokeStyle = '#e5e7eb';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(10, 10, formData.width - 20, formData.height - 20);
        ctx.setLineDash([]);

        // QR zone marker
        ctx.fillStyle = '#f3f4f6';
        ctx.fillRect(formData.qrCode.x, formData.qrCode.y, formData.qrCode.size, formData.qrCode.size);
        ctx.strokeStyle = '#d1d5db';
        ctx.lineWidth = 1;
        ctx.strokeRect(formData.qrCode.x, formData.qrCode.y, formData.qrCode.size, formData.qrCode.size);
        ctx.fillStyle = '#9ca3af';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('QR ZONE', formData.qrCode.x + formData.qrCode.size / 2, formData.qrCode.y + formData.qrCode.size / 2 + 4);

        // Dimension label
        ctx.fillStyle = '#d1d5db';
        ctx.font = '10px Arial';
        ctx.textAlign = 'right';
        ctx.fillText(`${formData.width}×${formData.height}px`, formData.width - 10, formData.height - 8);

        const link = document.createElement('a');
        link.download = `ticket-template-${formData.width}x${formData.height}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    };

    const showEditor = selectedTemplate || isCreating;
    const selectedEl = formData.elements.find(el => el.id === selectedElement);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Link href="/dashboard/settings/emails" className="text-slate-500 hover:text-slate-900">
                        <ArrowLeft className="w-5 h-5" />
                    </Link>
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900">Ticket Design Templates</h1>
                        <p className="text-slate-500">Design custom tickets with QR codes for your events</p>
                    </div>
                </div>
                {!showEditor && (
                    <Button onClick={startCreating} className="bg-indigo-600 hover:bg-indigo-700">
                        <Plus className="w-4 h-4 mr-2" /> New Template
                    </Button>
                )}
            </div>

            {/* Messages */}
            {message.text && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                    <CheckCircle2 className="w-5 h-5" />
                    {message.text}
                </div>
            )}

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2].map(i => (
                        <Card key={i} className="animate-pulse overflow-hidden">
                            <div className="h-40 bg-gradient-to-br from-slate-200 to-slate-100">
                                <div className="p-4">
                                    <div className="w-16 h-16 bg-white/50 rounded" />
                                </div>
                            </div>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-2">
                                        <div className="h-4 w-24 bg-slate-200 rounded" />
                                        <div className="h-3 w-16 bg-slate-100 rounded" />
                                    </div>
                                    <div className="flex gap-1">
                                        <div className="h-8 w-8 bg-slate-100 rounded" />
                                        <div className="h-8 w-8 bg-slate-100 rounded" />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : !showEditor ? (
                /* Template List */
                <>
                    {/* Specs Card */}
                    {specs && (
                        <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-100">
                            <CardContent className="pt-6">
                                <div className="flex items-start gap-4">
                                    <div className="p-3 bg-white rounded-lg shadow-sm">
                                        <Download className="w-6 h-6 text-indigo-600" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-slate-900 mb-2">Design Specifications</h3>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                            {specs.sizes.map(size => (
                                                <div key={size.name} className="bg-white rounded-lg p-3 shadow-sm">
                                                    <p className="font-medium text-slate-700">{size.name}</p>
                                                    <p className="text-slate-500">{size.width} × {size.height}px</p>
                                                    <p className="text-xs text-slate-400">{size.aspectRatio}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {templates.length === 0 ? (
                        <Card>
                            <CardContent className="py-12 text-center">
                                <Ticket className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                                <h3 className="font-semibold text-slate-900 mb-2">No ticket templates yet</h3>
                                <p className="text-slate-500 text-sm mb-4">
                                    Design custom tickets with QR codes for your events
                                </p>
                                <Button onClick={startCreating}>
                                    <Plus className="w-4 h-4 mr-2" /> Create Template
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {templates.map((template) => (
                                <Card
                                    key={template._id}
                                    className="hover:shadow-md transition-shadow cursor-pointer overflow-hidden"
                                    onClick={() => selectTemplate(template)}
                                >
                                    {/* Preview */}
                                    <div
                                        className="h-40 relative"
                                        style={{ backgroundColor: template.backgroundColor }}
                                    >
                                        {/* Mini QR */}
                                        <div
                                            className="absolute bg-white rounded"
                                            style={{
                                                left: `${(template.qrCode.x / template.width) * 100}%`,
                                                top: `${(template.qrCode.y / template.height) * 100}%`,
                                                width: `${(template.qrCode.size / template.width) * 100}%`,
                                                height: `${(template.qrCode.size / template.height) * 100}%`
                                            }}
                                        >
                                            <div className="w-full h-full flex items-center justify-center">
                                                <QrCode className="w-1/2 h-1/2 text-slate-400" />
                                            </div>
                                        </div>
                                        {template.isDefault && (
                                            <div className="absolute top-2 right-2 flex gap-1">
                                                <Star className="w-5 h-5 text-amber-400 fill-amber-400" />
                                            </div>
                                        )}
                                        {template.isGlobal && (
                                            <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[10px] uppercase font-bold px-2 py-0.5 rounded-full shadow-sm">
                                                Global
                                            </div>
                                        )}
                                    </div>
                                    <CardContent className="p-4">
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-semibold text-slate-900">{template.name}</p>
                                                <p className="text-sm text-slate-500">{template.width} × {template.height}px</p>
                                            </div>
                                            {!template.isGlobal && (
                                                <div className="flex gap-1">
                                                    <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); selectTemplate(template); }}>
                                                        <Edit className="w-4 h-4" />
                                                    </Button>
                                                    <Button variant="ghost" size="sm" className="text-red-500" onClick={(e) => { e.stopPropagation(); deleteTemplate(template._id); }}>
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    )}
                </>
            ) : (
                /* Editor */
                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                    {/* Left: Controls */}
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">Template Settings</CardTitle>
                                <Button variant="ghost" size="sm" onClick={cancelEdit}>
                                    <X className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label>Template Name</Label>
                                <Input
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="My Ticket Design"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <Label>Width (px)</Label>
                                    <Input
                                        type="number"
                                        value={formData.width}
                                        onChange={(e) => setFormData({ ...formData, width: parseInt(e.target.value) || 600 })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Height (px)</Label>
                                    <Input
                                        type="number"
                                        value={formData.height}
                                        onChange={(e) => setFormData({ ...formData, height: parseInt(e.target.value) || 300 })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Background Color</Label>
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={formData.backgroundColor}
                                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                        className="w-12 h-10 rounded border cursor-pointer"
                                    />
                                    <Input
                                        value={formData.backgroundColor}
                                        onChange={(e) => setFormData({ ...formData, backgroundColor: e.target.value })}
                                        className="flex-1"
                                    />
                                </div>
                            </div>

                            {/* Background Image Upload */}
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2">
                                    <ImageIcon className="w-4 h-4" /> Background Image
                                </Label>
                                <div className="space-y-3">
                                    {formData.backgroundImage ? (
                                        <div className="relative">
                                            <img
                                                src={formData.backgroundImage}
                                                alt="Background preview"
                                                className="w-full h-24 object-cover rounded-lg border"
                                            />
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="absolute top-1 right-1 bg-red-500 hover:bg-red-600 text-white h-6 w-6 p-0"
                                                onClick={() => setFormData({ ...formData, backgroundImage: '' })}
                                            >
                                                <X className="w-3 h-3" />
                                            </Button>
                                        </div>
                                    ) : (
                                        <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition-colors">
                                            <ImageIcon className="w-6 h-6 text-slate-400 mb-1" />
                                            <span className="text-sm text-slate-500">Click to upload</span>
                                            <span className="text-xs text-slate-400">PNG, JPG (max 2MB)</span>
                                            <input
                                                type="file"
                                                accept="image/*"
                                                className="hidden"
                                                onChange={(e) => {
                                                    const file = e.target.files?.[0];
                                                    if (file) {
                                                        if (file.size > 2 * 1024 * 1024) {
                                                            setMessage({ type: 'error', text: 'Image must be less than 2MB' });
                                                            return;
                                                        }
                                                        const reader = new FileReader();
                                                        reader.onload = (event) => {
                                                            setFormData({
                                                                ...formData,
                                                                backgroundImage: event.target?.result as string
                                                            });
                                                        };
                                                        reader.readAsDataURL(file);
                                                    }
                                                }}
                                            />
                                        </label>
                                    )}
                                    {formData.backgroundImage && (
                                        <select
                                            value={formData.backgroundSize}
                                            onChange={(e) => setFormData({ ...formData, backgroundSize: e.target.value })}
                                            className="w-full h-9 px-3 rounded-md border border-slate-200 text-sm"
                                        >
                                            <option value="cover">Cover (fill)</option>
                                            <option value="contain">Contain (fit)</option>
                                            <option value="100% 100%">Stretch</option>
                                        </select>
                                    )}
                                </div>
                                <p className="text-xs text-slate-500">
                                    Design in Photoshop/Figma ({formData.width}×{formData.height}px), then upload here
                                </p>
                            </div>

                            <div className="border-t pt-4">
                                <Label className="flex items-center gap-2 mb-3">
                                    <QrCode className="w-4 h-4" /> QR Code Settings
                                </Label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div className="space-y-1">
                                        <Label className="text-xs">Size</Label>
                                        <Input
                                            type="number"
                                            value={formData.qrCode.size}
                                            onChange={(e) => setFormData({ ...formData, qrCode: { ...formData.qrCode, size: parseInt(e.target.value) || 120 } })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">X</Label>
                                        <Input
                                            type="number"
                                            value={Math.round(formData.qrCode.x)}
                                            onChange={(e) => setFormData({ ...formData, qrCode: { ...formData.qrCode, x: parseInt(e.target.value) || 0 } })}
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <Label className="text-xs">Y</Label>
                                        <Input
                                            type="number"
                                            value={Math.round(formData.qrCode.y)}
                                            onChange={(e) => setFormData({ ...formData, qrCode: { ...formData.qrCode, y: parseInt(e.target.value) || 0 } })}
                                        />
                                    </div>
                                </div>
                            </div>

                            <div className="border-t pt-4">
                                <Label className="flex items-center gap-2 mb-3">
                                    <Type className="w-4 h-4" /> Add Text Elements
                                </Label>
                                <div className="flex flex-wrap gap-2">
                                    {specs?.placeholders.map(p => (
                                        <button
                                            key={p.key}
                                            onClick={() => addElement('placeholder', p.key)}
                                            className="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 rounded-full hover:bg-indigo-100 transition-colors"
                                            title={p.description}
                                        >
                                            + {p.key}
                                        </button>
                                    ))}
                                    <button
                                        onClick={() => addElement('text')}
                                        className="px-2 py-1 text-xs bg-slate-100 text-slate-700 rounded-full hover:bg-slate-200"
                                    >
                                        + Custom Text
                                    </button>
                                </div>
                            </div>

                            {/* Selected Element Props */}
                            {selectedEl && (
                                <div className="border-t pt-4 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <Label>Edit: {selectedEl.placeholder || 'Text'}</Label>
                                        <Button variant="ghost" size="sm" className="text-red-500 h-7" onClick={() => deleteElement(selectedEl.id)}>
                                            <Trash2 className="w-3 h-3" />
                                        </Button>
                                    </div>
                                    {selectedEl.type === 'text' && (
                                        <Input
                                            value={selectedEl.content}
                                            onChange={(e) => updateElement(selectedEl.id, { content: e.target.value })}
                                            placeholder="Text content"
                                        />
                                    )}
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="space-y-1">
                                            <Label className="text-xs">Font Size</Label>
                                            <Input
                                                type="number"
                                                value={selectedEl.fontSize}
                                                onChange={(e) => updateElement(selectedEl.id, { fontSize: parseInt(e.target.value) || 16 })}
                                            />
                                        </div>
                                        <div className="space-y-1">
                                            <Label className="text-xs">Color</Label>
                                            <input
                                                type="color"
                                                value={selectedEl.color}
                                                onChange={(e) => updateElement(selectedEl.id, { color: e.target.value })}
                                                className="w-full h-10 rounded border cursor-pointer"
                                            />
                                        </div>
                                    </div>
                                    <select
                                        value={selectedEl.fontWeight}
                                        onChange={(e) => updateElement(selectedEl.id, { fontWeight: e.target.value })}
                                        className="w-full h-10 px-3 rounded-md border border-slate-200 text-sm"
                                    >
                                        <option value="normal">Normal</option>
                                        <option value="bold">Bold</option>
                                    </select>
                                </div>
                            )}

                            <div className="flex items-center gap-2 pt-2">
                                <input
                                    type="checkbox"
                                    id="isDefault"
                                    checked={formData.isDefault}
                                    onChange={(e) => setFormData({ ...formData, isDefault: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor="isDefault" className="font-normal text-sm">Set as default</Label>
                            </div>

                            <div className="space-y-2 pt-4 border-t">
                                <Label className="flex items-center gap-2 text-sm">
                                    <Download className="w-4 h-4" /> Download Templates
                                </Label>
                                <div className="grid grid-cols-2 gap-2">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadBlankTemplate}
                                        className="text-xs"
                                        title="Download blank canvas for Photoshop/Figma"
                                    >
                                        Blank Canvas
                                    </Button>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={downloadTemplate}
                                        className="text-xs"
                                        title="Download with current design as guide"
                                    >
                                        Design Guide
                                    </Button>
                                </div>
                                <p className="text-xs text-slate-500">
                                    Design externally, then upload as background
                                </p>
                            </div>

                            <div className="flex gap-2 pt-4 border-t">
                                <Button onClick={handleSubmit} disabled={saving} className="w-full bg-indigo-600 hover:bg-indigo-700">
                                    {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
                                    Save Template
                                </Button>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Right: Canvas Preview */}
                    <div className="xl:col-span-2">
                        <Card>
                            <CardHeader className="pb-2">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg flex items-center gap-2">
                                        <Ticket className="w-5 h-5" /> Live Preview
                                    </CardTitle>
                                    <span className="text-sm text-slate-500">{formData.width} × {formData.height}px</span>
                                </div>
                                <CardDescription>Drag QR code and text elements to position them</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex justify-center">
                                    <div
                                        ref={canvasRef}
                                        className="relative rounded-lg overflow-hidden shadow-lg cursor-crosshair select-none"
                                        style={{
                                            width: '100%',
                                            maxWidth: formData.width,
                                            aspectRatio: `${formData.width} / ${formData.height}`,
                                            backgroundColor: formData.backgroundColor,
                                            backgroundImage: formData.backgroundImage ? `url(${formData.backgroundImage})` : undefined,
                                            backgroundSize: formData.backgroundSize
                                        }}
                                        onMouseMove={handleMouseMove}
                                        onMouseUp={handleMouseUp}
                                        onMouseLeave={handleMouseUp}
                                    >
                                        {/* QR Code */}
                                        <div
                                            className={`absolute bg-white rounded-lg shadow-md cursor-move transition-shadow ${isDragging && dragType === 'qr' ? 'ring-2 ring-indigo-500' : 'hover:ring-2 hover:ring-indigo-300'}`}
                                            style={{
                                                left: `${(formData.qrCode.x / formData.width) * 100}%`,
                                                top: `${(formData.qrCode.y / formData.height) * 100}%`,
                                                width: `${(formData.qrCode.size / formData.width) * 100}%`,
                                                aspectRatio: '1'
                                            }}
                                            onMouseDown={(e) => handleMouseDown(e, 'qr')}
                                        >
                                            <div className="w-full h-full flex items-center justify-center p-2">
                                                <img
                                                    src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${sampleData.ticket_code}`}
                                                    alt="QR Code"
                                                    className="w-full h-full object-contain"
                                                />
                                            </div>
                                        </div>

                                        {/* Text Elements */}
                                        {formData.elements.map(el => (
                                            <div
                                                key={el.id}
                                                className={`absolute cursor-move whitespace-nowrap px-1 rounded transition-all ${selectedElement === el.id
                                                    ? 'ring-2 ring-indigo-500 bg-indigo-500/10'
                                                    : 'hover:ring-2 hover:ring-indigo-300 hover:bg-white/10'
                                                    }`}
                                                style={{
                                                    left: `${(el.x / formData.width) * 100}%`,
                                                    top: `${(el.y / formData.height) * 100}%`,
                                                    fontSize: `${(el.fontSize / formData.width) * 100}vw`,
                                                    fontFamily: el.fontFamily,
                                                    fontWeight: el.fontWeight,
                                                    color: el.color
                                                }}
                                                onMouseDown={(e) => handleMouseDown(e, 'element', el.id)}
                                                onClick={() => setSelectedElement(el.id)}
                                            >
                                                {el.type === 'placeholder' ? sampleData[el.placeholder!] || `{{${el.placeholder}}}` : el.content}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            )}
        </div>
    );
}
