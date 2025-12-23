'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import {
    Plus,
    Trash2,
    Type,
    AlignLeft,
    List,
    GripVertical,
} from 'lucide-react';

interface Question {
    id: string;
    type: string;
    label: string;
    required: boolean;
    placeholder?: string;
    options?: string[];
}

interface FormBuilderProps {
    questions: Question[];
    onChange: (questions: Question[]) => void;
}

export function FormBuilder({ questions, onChange }: FormBuilderProps) {

    const addQuestion = (type: string) => {
        const newQ: Question = {
            id: `q-${Date.now()}`,
            type,
            label: 'New Question',
            required: false,
            placeholder: '',
            options: type === 'select' || type === 'radio' || type === 'checkbox' ? ['Option 1'] : []
        };
        onChange([...questions, newQ]);
    };

    const updateQuestion = (id: string, field: keyof Question, value: any) => {
        onChange(questions.map(q => q.id === id ? { ...q, [field]: value } : q));
    };

    const removeQuestion = (id: string) => {
        onChange(questions.filter(q => q.id !== id));
    };

    const addOption = (qId: string) => {
        onChange(questions.map(q => {
            if (q.id === qId) {
                return { ...q, options: [...(q.options || []), `Option ${q.options!.length + 1}`] }
            }
            return q;
        }));
    };

    const updateOption = (qId: string, index: number, value: string) => {
        onChange(questions.map(q => {
            if (q.id === qId) {
                const newOptions = [...q.options!];
                newOptions[index] = value;
                return { ...q, options: newOptions }
            }
            return q;
        }));
    };

    const removeOption = (qId: string, index: number) => {
        onChange(questions.map(q => {
            if (q.id === qId) {
                const newOptions = q.options!.filter((_, i) => i !== index);
                return { ...q, options: newOptions }
            }
            return q;
        }));
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-slate-900">Registration Form</h2>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => addQuestion('text')}><Type className="w-4 h-4 mr-2" /> Short Answer</Button>
                    <Button variant="outline" size="sm" onClick={() => addQuestion('textarea')}><AlignLeft className="w-4 h-4 mr-2" /> Paragraph</Button>
                    <Button variant="outline" size="sm" onClick={() => addQuestion('select')}><List className="w-4 h-4 mr-2" /> Dropdown</Button>
                </div>
            </div>

            <div className="space-y-4">
                {questions.map((q) => (
                    <Card key={q.id} className="border-slate-200 shadow-sm relative group">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="mt-3 text-slate-400 cursor-move">
                                    <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="flex-1 space-y-4">
                                    <div className="flex gap-4">
                                        <div className="flex-1">
                                            <Input
                                                value={q.label}
                                                onChange={(e) => updateQuestion(q.id, 'label', e.target.value)}
                                                className="font-medium text-lg border-transparent hover:border-slate-200 focus:border-indigo-600 px-0 h-auto py-1"
                                                placeholder="Question Title"
                                            />
                                        </div>
                                        <select
                                            value={q.type}
                                            onChange={(e) => updateQuestion(q.id, 'type', e.target.value)}
                                            className="h-9 rounded-md border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-600"
                                        >
                                            <option value="text">Short Answer</option>
                                            <option value="textarea">Paragraph</option>
                                            <option value="email">Email</option>
                                            <option value="number">Number</option>
                                            <option value="select">Dropdown</option>
                                            <option value="radio">Multiple Choice</option>
                                            <option value="checkbox">Checkboxes</option>
                                            <option value="date">Date</option>
                                        </select>
                                    </div>

                                    {/* Options for Select/Radio/Checkbox */}
                                    {(q.type === 'select' || q.type === 'radio' || q.type === 'checkbox') && (
                                        <div className="space-y-2 pl-1">
                                            {q.options?.map((opt, idx) => (
                                                <div key={idx} className="flex items-center gap-2">
                                                    <div className="w-4 h-4 border-2 border-slate-300 rounded-full"></div>
                                                    <Input
                                                        value={opt}
                                                        onChange={(e) => updateOption(q.id, idx, e.target.value)}
                                                        className="h-8 text-sm"
                                                    />
                                                    <Button variant="ghost" size="sm" onClick={() => removeOption(q.id, idx)} className="text-slate-400 hover:text-red-500 h-8 w-8 p-0">
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            ))}
                                            <Button variant="link" size="sm" onClick={() => addOption(q.id)} className="text-indigo-600 px-0">
                                                + Add Option
                                            </Button>
                                        </div>
                                    )}

                                    <div className="flex items-center justify-end gap-4 pt-2 border-t border-slate-100">
                                        <div className="flex items-center space-x-2">
                                            <Switch
                                                checked={q.required}
                                                onCheckedChange={(checked) => updateQuestion(q.id, 'required', checked)}
                                            />
                                            <Label className="text-sm text-slate-600">Required</Label>
                                        </div>
                                        <Button variant="ghost" size="sm" onClick={() => removeQuestion(q.id)} className="text-slate-400 hover:text-red-600">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="flex justify-center py-4 border-2 border-dashed border-slate-200 rounded-lg hover:border-indigo-300 hover:bg-indigo-50 transition-colors cursor-pointer" onClick={() => addQuestion('text')}>
                <div className="flex items-center text-slate-500 font-medium">
                    <Plus className="w-5 h-5 mr-2" />
                    Add Question
                </div>
            </div>
        </div>
    );
}
