import React, { useState, useEffect } from 'react';
import { ChevronDown, Plus, Search, Drill, Wrench } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';

interface ToolCategory {
  id: string;
  name: string;
  type: 'preset' | 'custom';
  frequency: number;
  subcategories?: ToolSubcategory[];
}

interface ToolSubcategory {
  id: string;
  name: string;
  description?: string;
  image?: string;
  frequency: number;
}

interface ToolSelectorProps {
  onToolChange: (toolData: {
    machiningType: string;
    toolType: string;
    subCategory?: string;
  }) => void;
  initialData?: {
    machiningType?: string;
    toolType?: string;
    subCategory?: string;
  };
}

const PRESET_MACHINING_TYPES: ToolCategory[] = [
  {
    id: 'drilling',
    name: 'Drilling tools',
    type: 'preset',
    frequency: 0,
    subcategories: [
      { id: 'core-countersink', name: 'Core and countersink drills', description: 'For creating precise holes and countersinks', frequency: 0 },
      { id: 'machine-taps', name: 'Machine threading taps', description: 'For blind-hole and through-hole threads', frequency: 0 },
      { id: 'machine-tap-synchro', name: 'Machine tap Synchro', description: 'Synchronized tapping operations', frequency: 0 },
      { id: 'machine-tap-sft-duplex', name: 'Machine tap M-SFT-DUPLEX', description: 'Dual-purpose tapping tool', frequency: 0 },
      { id: 'machine-tap-v-ti', name: 'Machine tap V-TI-SFT/POT', description: 'High-performance tapping', frequency: 0 },
      { id: 'machine-tap-whr', name: 'Machine tap WHR-NI-SFT/POT', description: 'Specialized tapping application', frequency: 0 },
      { id: 'machine-tap-din5156', name: 'Machine tap M-SFT-DUPLEX DIN 5156', description: 'DIN standard compliant', frequency: 0 },
      { id: 'machine-forming-taps', name: 'Machine forming taps', description: 'Cold forming thread creation', frequency: 0 },
      { id: 'machine-forming-cooling', name: 'Machine forming tap with internal cooling', description: 'Enhanced cooling capability', frequency: 0 },
      { id: 'm-nrt', name: 'M-NRT', description: 'Specialized threading tool', frequency: 0 },
      { id: 'carbide-extractors', name: 'Solid carbide tap extractors', description: 'For removing broken taps', frequency: 0 },
      { id: 'hand-taps', name: 'Hand taps', description: 'Manual threading operations', frequency: 0 },
      { id: 'thread-repair-kits', name: 'Thread repair kits Helicoil plus', description: 'Thread restoration systems', frequency: 0 },
      { id: 'threading-dies', name: 'Threading dies', description: 'External thread cutting', frequency: 0 },
      { id: 'thread-cutting-sets', name: 'Thread cutting tool sets', description: 'Complete threading solutions', frequency: 0 },
    ]
  },
  {
    id: 'milling',
    name: 'Milling tools',
    type: 'preset',
    frequency: 0,
    subcategories: [
      { id: 'end-mills', name: 'End Mills', description: 'General purpose cutting tools', frequency: 0 },
      { id: 'face-mills', name: 'Face Mills', description: 'Surface finishing tools', frequency: 0 },
      { id: 'ball-mills', name: 'Ball Mills', description: '3D contouring applications', frequency: 0 },
      { id: 'roughing-mills', name: 'Roughing Mills', description: 'Material removal operations', frequency: 0 },
    ]
  },
  {
    id: 'turning',
    name: 'Turning tools',
    type: 'preset',
    frequency: 0,
    subcategories: [
      { id: 'carbide-inserts', name: 'Carbide Inserts', description: 'Replaceable cutting edges', frequency: 0 },
      { id: 'boring-bars', name: 'Boring Bars', description: 'Internal machining operations', frequency: 0 },
      { id: 'threading-inserts', name: 'Threading Inserts', description: 'Lathe threading operations', frequency: 0 },
    ]
  },
  {
    id: 'clamping',
    name: 'Clamping tools',
    type: 'preset',
    frequency: 0,
    subcategories: [
      { id: 'vises', name: 'Vises', description: 'Workpiece holding devices', frequency: 0 },
      { id: 'clamps', name: 'Clamps', description: 'Securing mechanisms', frequency: 0 },
      { id: 'chucks', name: 'Chucks', description: 'Rotary workholding', frequency: 0 },
    ]
  },
  {
    id: 'measuring',
    name: 'Measuring equipment',
    type: 'preset',
    frequency: 0,
    subcategories: [
      { id: 'calipers', name: 'Calipers', description: 'Precision measurement tools', frequency: 0 },
      { id: 'micrometers', name: 'Micrometers', description: 'High-precision measurements', frequency: 0 },
      { id: 'indicators', name: 'Dial Indicators', description: 'Movement and positioning', frequency: 0 },
    ]
  },
];

export const ToolSelector: React.FC<ToolSelectorProps> = ({ onToolChange, initialData }) => {
  const [machiningTypes, setMachiningTypes] = useState<ToolCategory[]>(PRESET_MACHINING_TYPES);
  const [toolTypes, setToolTypes] = useState<ToolCategory[]>([]);
  const [selectedMachining, setSelectedMachining] = useState(initialData?.machiningType || '');
  const [selectedTool, setSelectedTool] = useState(initialData?.toolType || '');
  const [selectedSubcategory, setSelectedSubcategory] = useState(initialData?.subCategory || '');
  const [customMachiningInput, setCustomMachiningInput] = useState('');
  const [customToolInput, setCustomToolInput] = useState('');
  const [isAddingMachining, setIsAddingMachining] = useState(false);
  const [isAddingTool, setIsAddingTool] = useState(false);

  useEffect(() => {
    loadCustomCategories();
  }, []);

  useEffect(() => {
    // Update tool types when machining type changes
    const selectedMachiningType = machiningTypes.find(mt => mt.name === selectedMachining);
    if (selectedMachiningType) {
      setToolTypes([selectedMachiningType]);
      // Clear tool selection when machining type changes
      setSelectedTool('');
      setSelectedSubcategory('');
    }
  }, [selectedMachining, machiningTypes]);

  useEffect(() => {
    // Notify parent of changes
    onToolChange({
      machiningType: selectedMachining,
      toolType: selectedTool,
      subCategory: selectedSubcategory,
    });
  }, [selectedMachining, selectedTool, selectedSubcategory, onToolChange]);

  const loadCustomCategories = async () => {
    try {
      const { data: customCategories } = await supabase
        .from('tool_categories')
        .select('*')
        .order('frequency', { ascending: false });

      if (customCategories) {
        const customMachiningTypes = customCategories
          .filter(cat => cat.category_type === 'machining_type')
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            type: 'custom' as const,
            frequency: cat.frequency || 0,
          }));

        const customToolTypesData = customCategories
          .filter(cat => cat.category_type === 'tool_type')
          .map(cat => ({
            id: cat.id,
            name: cat.name,
            type: 'custom' as const,
            frequency: cat.frequency || 0,
          }));

        // Merge with presets and sort by frequency
        const allMachiningTypes = [...PRESET_MACHINING_TYPES, ...customMachiningTypes]
          .sort((a, b) => b.frequency - a.frequency);

        setMachiningTypes(allMachiningTypes);
      }
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  };

  const saveCustomCategory = async (name: string, type: 'machining_type' | 'tool_type') => {
    try {
      // Check if category already exists
      const { data: existing } = await supabase
        .from('tool_categories')
        .select('*')
        .eq('name', name)
        .eq('category_type', type)
        .single();

      if (existing) {
        // Update frequency
        await supabase
          .from('tool_categories')
          .update({ frequency: (existing.frequency || 0) + 1 })
          .eq('id', existing.id);
      } else {
        // Create new category
        await supabase
          .from('tool_categories')
          .insert({ name, category_type: type, frequency: 1 });
      }

      // Reload categories
      await loadCustomCategories();
    } catch (error) {
      console.error('Error saving custom category:', error);
    }
  };

  const handleAddCustomMachining = async () => {
    if (customMachiningInput.trim()) {
      await saveCustomCategory(customMachiningInput.trim(), 'machining_type');
      setSelectedMachining(customMachiningInput.trim());
      setCustomMachiningInput('');
      setIsAddingMachining(false);
    }
  };

  const handleAddCustomTool = async () => {
    if (customToolInput.trim()) {
      await saveCustomCategory(customToolInput.trim(), 'tool_type');
      setSelectedTool(customToolInput.trim());
      setCustomToolInput('');
      setIsAddingTool(false);
    }
  };

  const getCurrentSubcategories = () => {
    const selectedMachiningType = machiningTypes.find(mt => mt.name === selectedMachining);
    return selectedMachiningType?.subcategories || [];
  };

  const renderDrillingToolImage = (subcategoryId: string) => {
    // For now, we'll show drill icon for drilling tools
    if (subcategoryId.includes('drill') || subcategoryId.includes('tap') || subcategoryId.includes('thread')) {
      return <Drill className="w-6 h-6 text-muted-foreground" />;
    }
    return <Wrench className="w-6 h-6 text-muted-foreground" />;
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Machining Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type of Machining</label>
          <div className="flex gap-2">
            <Select value={selectedMachining} onValueChange={setSelectedMachining}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select machining type" />
              </SelectTrigger>
              <SelectContent>
                {machiningTypes.map((type) => (
                  <SelectItem key={type.id} value={type.name}>
                    <div className="flex items-center justify-between w-full">
                      <span>{type.name}</span>
                      {type.frequency > 0 && (
                        <Badge variant="secondary" className="ml-2 text-xs">
                          {type.frequency}
                        </Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Popover open={isAddingMachining} onOpenChange={setIsAddingMachining}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="icon">
                  <Plus className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Add Custom Machining Type</h4>
                  <Input
                    placeholder="Enter machining type..."
                    value={customMachiningInput}
                    onChange={(e) => setCustomMachiningInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomMachining()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddCustomMachining} size="sm">
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsAddingMachining(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Tool Type Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Type of Tool</label>
          <div className="flex gap-2">
            <Select 
              value={selectedTool} 
              onValueChange={setSelectedTool}
              disabled={!selectedMachining}
            >
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select tool type" />
              </SelectTrigger>
              <SelectContent>
                {selectedMachining && (
                  <SelectItem value={selectedMachining}>
                    {selectedMachining}
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
            
            <Popover open={isAddingTool} onOpenChange={setIsAddingTool}>
              <PopoverTrigger asChild>
                <Button 
                  variant="outline" 
                  size="icon"
                  disabled={!selectedMachining}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80">
                <div className="space-y-3">
                  <h4 className="font-medium">Add Custom Tool Type</h4>
                  <Input
                    placeholder="Enter tool type..."
                    value={customToolInput}
                    onChange={(e) => setCustomToolInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCustomTool()}
                  />
                  <div className="flex gap-2">
                    <Button onClick={handleAddCustomTool} size="sm">
                      Add
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => setIsAddingTool(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>
      </div>

      {/* Subcategories (for drilling tools) */}
      {selectedMachining === 'Drilling tools' && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Drilling Tool Subcategories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {getCurrentSubcategories().map((subcategory) => (
                <div
                  key={subcategory.id}
                  className={`p-3 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${
                    selectedSubcategory === subcategory.name ? 'border-primary bg-primary/5' : ''
                  }`}
                  onClick={() => setSelectedSubcategory(
                    selectedSubcategory === subcategory.name ? '' : subcategory.name
                  )}
                >
                  <div className="flex items-start gap-3">
                    {renderDrillingToolImage(subcategory.id)}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm">{subcategory.name}</h4>
                      {subcategory.description && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {subcategory.description}
                        </p>
                      )}
                      {subcategory.frequency > 0 && (
                        <Badge variant="outline" className="mt-2 text-xs">
                          Used {subcategory.frequency} times
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selected Summary */}
      {(selectedMachining || selectedTool || selectedSubcategory) && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Selected Tool Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {selectedMachining && (
                <Badge variant="default">{selectedMachining}</Badge>
              )}
              {selectedTool && selectedTool !== selectedMachining && (
                <Badge variant="secondary">{selectedTool}</Badge>
              )}
              {selectedSubcategory && (
                <Badge variant="outline">{selectedSubcategory}</Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};