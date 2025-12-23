'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Trash2 } from 'lucide-react';

export type FormField = {
    id: string;
    label: string;
    type: 'text' | 'email' | 'number' | 'select' | 'checkbox';
    required: boolean;
    options?: string[]; // Comma separated for editing
};

export function EventBuilder({ onChange }: { onChange: (schema: FormField[]) => void }) {
    const [fields, setFields] = useState<FormField[]>([]);

    const addField = () => {
        const newField: FormField = {
            id: `field_${Date.now()}`,
            label: 'New Question',
            type: 'text',
            required: true
        };
        const newFields = [...fields, newField];
        setFields(newFields);
        onChange(newFields);
    };

    const removeField = (index: number) => {
        const newFields = fields.filter((_, i) => i !== index);
        setFields(newFields);
        onChange(newFields);
    };

    const updateField = (index: number, key: keyof FormField, value: any) => {
        const newFields = [...fields];
        newFields[index] = { ...newFields[index], [key]: value };
        setFields(newFields);
        onChange(newFields);
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-white">Registration Form</h3>
                <Button onClick={addField} variant="secondary" size="sm">
                    <Plus className="w-4 h-4 mr-2" /> Add Field
                </Button>
            </div>

            <div className="space-y-3">
                {fields.map((field, index) => (
                    <Card key={field.id} className="bg-slate-900 border-slate-800">
                        <CardContent className="p-4 flex gap-4 items-start">
                            <div className="flex-1 space-y-3">
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <Label>Label</Label>
                                        <Input
                                            value={field.label}
                                            onChange={(e) => updateField(index, 'label', e.target.value)}
                                            className="bg-slate-950 border-slate-700"
                                        />
                                    </div>
                                    <div className="w-32">
                                        <Label>Type</Label>
                                        <select
                                            className="flex h-10 w-full rounded-md border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                            value={field.type}
                                            onChange={(e) => updateField(index, 'type', e.target.value)}
                                        >
                                            <option value="text">Text</option>
                                            <option value="email">Email</option>
                                            <option value="number">Number</option>
                                            <option value="select">Select</option>
                                            <option value="checkbox">Checkbox</option>
                                        </select>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        checked={field.required}
                                        onChange={(e) => updateField(index, 'required', e.target.checked)}
                                        className="rounded border-slate-700 bg-slate-950"
                                    />
                                    <span className="text-sm text-slate-400">Required</span>
                                </div>
                            </div>

                            <Button variant="ghost" size="icon" onClick={() => removeField(index)} className="text-red-400 hover:text-red-300 hover:bg-red-950/50">
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    );
}
