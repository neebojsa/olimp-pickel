import React, { useState, useEffect } from 'react';
import { Filter, X, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';

interface FilterOptions {
  machiningTypes: string[];
  toolTypes: string[];
  subcategories: string[];
}

interface ToolFilterPanelProps {
  onFiltersChange: (filters: {
    machiningTypes: string[];
    toolTypes: string[];
    subcategories: string[];
  }) => void;
  activeFilters: FilterOptions;
}

const PRESET_CATEGORIES = [
  {
    name: 'Drilling tools',
    subcategories: [
      'Core and countersink drills',
      'Machine threading taps',
      'Machine tap Synchro',
      'Machine tap M-SFT-DUPLEX',
      'Machine tap V-TI-SFT/POT',
      'Machine tap WHR-NI-SFT/POT',
      'Machine tap M-SFT-DUPLEX DIN 5156',
      'Machine forming taps',
      'Machine forming tap with internal cooling',
      'M-NRT',
      'Solid carbide tap extractors',
      'Hand taps',
      'Thread repair kits Helicoil plus',
      'Threading dies',
      'Thread cutting tool sets'
    ]
  },
  {
    name: 'Milling tools',
    subcategories: ['End Mills', 'Face Mills', 'Ball Mills', 'Roughing Mills']
  },
  {
    name: 'Turning tools',
    subcategories: ['Carbide Inserts', 'Boring Bars', 'Threading Inserts']
  },
  {
    name: 'Clamping tools',
    subcategories: ['Vises', 'Clamps', 'Chucks']
  },
  {
    name: 'Measuring equipment',
    subcategories: ['Calipers', 'Micrometers', 'Dial Indicators']
  }
];

export const ToolFilterPanel: React.FC<ToolFilterPanelProps> = ({
  onFiltersChange,
  activeFilters
}) => {
  const [customCategories, setCustomCategories] = useState<string[]>([]);
  const [expandedSections, setExpandedSections] = useState<string[]>(['Drilling tools']);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    loadCustomCategories();
  }, []);

  const loadCustomCategories = async () => {
    try {
      const { data } = await supabase
        .from('tool_categories')
        .select('name')
        .eq('category_type', 'machining_type')
        .order('frequency', { ascending: false });

      if (data) {
        setCustomCategories(data.map(cat => cat.name));
      }
    } catch (error) {
      console.error('Error loading custom categories:', error);
    }
  };

  const toggleFilter = (type: keyof FilterOptions, value: string) => {
    const currentFilters = { ...activeFilters };
    const filterArray = currentFilters[type];
    
    if (filterArray.includes(value)) {
      currentFilters[type] = filterArray.filter(item => item !== value);
    } else {
      currentFilters[type] = [...filterArray, value];
    }
    
    onFiltersChange(currentFilters);
  };

  const clearAllFilters = () => {
    onFiltersChange({
      machiningTypes: [],
      toolTypes: [],
      subcategories: []
    });
  };

  const toggleSection = (sectionName: string) => {
    setExpandedSections(prev => 
      prev.includes(sectionName)
        ? prev.filter(name => name !== sectionName)
        : [...prev, sectionName]
    );
  };

  const allCategories = [...PRESET_CATEGORIES, ...customCategories.map(name => ({ name, subcategories: [] }))];
  const hasActiveFilters = Object.values(activeFilters).some(arr => arr.length > 0);

  if (!isOpen) {
    return (
      <Button 
        variant="outline" 
        onClick={() => setIsOpen(true)}
        className="w-full md:w-auto"
      >
        <Filter className="w-4 h-4 mr-2" />
        Filter Tools
        {hasActiveFilters && (
          <Badge variant="secondary" className="ml-2">
            {Object.values(activeFilters).reduce((sum, arr) => sum + arr.length, 0)}
          </Badge>
        )}
      </Button>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Tool Filters
          </CardTitle>
          <div className="flex gap-2">
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                Clear All
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={() => setIsOpen(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
        
        {/* Active Filters Summary */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-2">
            {activeFilters.machiningTypes.map(type => (
              <Badge key={type} variant="default" className="text-xs">
                {type}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => toggleFilter('machiningTypes', type)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
            {activeFilters.subcategories.map(sub => (
              <Badge key={sub} variant="secondary" className="text-xs">
                {sub}
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto p-0 ml-1"
                  onClick={() => toggleFilter('subcategories', sub)}
                >
                  <X className="w-3 h-3" />
                </Button>
              </Badge>
            ))}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Machining Types */}
        {allCategories.map((category) => (
          <Collapsible
            key={category.name}
            open={expandedSections.includes(category.name)}
            onOpenChange={() => toggleSection(category.name)}
          >
            <CollapsibleTrigger asChild>
              <div className="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md cursor-pointer">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={activeFilters.machiningTypes.includes(category.name)}
                    onCheckedChange={() => toggleFilter('machiningTypes', category.name)}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <span className="font-medium">{category.name}</span>
                </div>
                <ChevronDown 
                  className={`w-4 h-4 transition-transform ${
                    expandedSections.includes(category.name) ? 'rotate-180' : ''
                  }`} 
                />
              </div>
            </CollapsibleTrigger>
            
            {category.subcategories.length > 0 && (
              <CollapsibleContent className="ml-6 mt-2 space-y-2">
                {category.subcategories.map((subcategory) => (
                  <div key={subcategory} className="flex items-center gap-2 p-1">
                    <Checkbox
                      checked={activeFilters.subcategories.includes(subcategory)}
                      onCheckedChange={() => toggleFilter('subcategories', subcategory)}
                    />
                    <span className="text-sm text-muted-foreground">{subcategory}</span>
                  </div>
                ))}
              </CollapsibleContent>
            )}
          </Collapsible>
        ))}
      </CardContent>
    </Card>
  );
};