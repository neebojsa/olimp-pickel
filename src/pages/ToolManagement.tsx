import React, { useState, useEffect } from 'react';
import { Plus, Search, Wrench, Filter } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ToolSelector } from '@/components/ToolSelector';
import { ToolFilterPanel } from '@/components/ToolFilterPanel';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Tool {
  id: string;
  name: string;
  machiningType?: string;
  toolType?: string;
  subCategory?: string;
  description?: string;
  manufacturer?: string;
  partNumber?: string;
  quantity?: number;
  location?: string;
}

interface FilterOptions {
  machiningTypes: string[];
  toolTypes: string[];
  subcategories: string[];
}

export const ToolManagement = () => {
  const [tools, setTools] = useState<Tool[]>([]);
  const [filteredTools, setFilteredTools] = useState<Tool[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedTool, setSelectedTool] = useState<{
    machiningType: string;
    toolType: string;
    subCategory?: string;
  } | null>(null);
  const [toolForm, setToolForm] = useState({
    name: '',
    description: '',
    manufacturer: '',
    partNumber: '',
    quantity: '',
    location: ''
  });
  const [activeFilters, setActiveFilters] = useState<FilterOptions>({
    machiningTypes: [],
    toolTypes: [],
    subcategories: []
  });

  useEffect(() => {
    loadTools();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [tools, searchTerm, activeFilters]);

  const loadTools = async () => {
    try {
      // Load from inventory table where category = 'Tools'
      const { data: inventoryTools } = await supabase
        .from('inventory')
        .select('*')
        .eq('category', 'Tools');

      // Load from tools_library table
      const { data: libraryTools } = await supabase
        .from('tools_library')
        .select('*');

      const allTools: Tool[] = [];

      // Add inventory tools
      if (inventoryTools) {
        allTools.push(...inventoryTools.map(tool => {
          const toolsUsed = tool.tools_used as any;
          return {
            id: tool.id,
            name: tool.name,
            description: tool.description || '',
            quantity: tool.quantity || 0,
            location: tool.location || '',
            // Parse machining type and tool type from tools_used if available
            machiningType: toolsUsed?.machiningType || 'Unknown',
            toolType: toolsUsed?.toolType || tool.name,
            subCategory: toolsUsed?.subCategory
          };
        }));
      }

      // Add library tools (without quantity/location)
      if (libraryTools) {
        allTools.push(...libraryTools.map(tool => ({
          id: tool.id,
          name: tool.tool_name,
          description: tool.description || '',
          manufacturer: tool.manufacturer || '',
          partNumber: tool.part_number || '',
          machiningType: tool.category || tool.tool_type,
          toolType: tool.tool_type,
        })));
      }

      setTools(allTools);
    } catch (error) {
      console.error('Error loading tools:', error);
      toast.error('Failed to load tools');
    }
  };

  const applyFilters = () => {
    let filtered = [...tools];

    // Apply text search
    if (searchTerm) {
      filtered = filtered.filter(tool =>
        tool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.manufacturer?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tool.partNumber?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filters
    if (activeFilters.machiningTypes.length > 0) {
      filtered = filtered.filter(tool =>
        activeFilters.machiningTypes.includes(tool.machiningType || '')
      );
    }

    if (activeFilters.subcategories.length > 0) {
      filtered = filtered.filter(tool =>
        activeFilters.subcategories.includes(tool.subCategory || '')
      );
    }

    setFilteredTools(filtered);
  };

  const handleAddTool = async () => {
    if (!selectedTool || !toolForm.name) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Save to inventory table
      const { error } = await supabase
        .from('inventory')
        .insert({
          name: toolForm.name,
          description: toolForm.description,
          category: 'Tools',
          quantity: parseInt(toolForm.quantity) || 0,
          location: toolForm.location,
          supplier: toolForm.manufacturer,
          part_number: toolForm.partNumber,
          tools_used: {
            machiningType: selectedTool.machiningType,
            toolType: selectedTool.toolType,
            subCategory: selectedTool.subCategory
          }
        });

      if (error) throw error;

      // Update frequency in tool_categories
      await updateCategoryFrequency(selectedTool.machiningType, 'machining_type');
      if (selectedTool.toolType !== selectedTool.machiningType) {
        await updateCategoryFrequency(selectedTool.toolType, 'tool_type');
      }

      toast.success('Tool added successfully');
      setIsAddDialogOpen(false);
      setToolForm({
        name: '',
        description: '',
        manufacturer: '',
        partNumber: '',
        quantity: '',
        location: ''
      });
      setSelectedTool(null);
      await loadTools();
    } catch (error) {
      console.error('Error adding tool:', error);
      toast.error('Failed to add tool');
    }
  };

  const updateCategoryFrequency = async (categoryName: string, categoryType: 'machining_type' | 'tool_type') => {
    try {
      const { data: existing } = await supabase
        .from('tool_categories')
        .select('*')
        .eq('name', categoryName)
        .eq('category_type', categoryType)
        .single();

      if (existing) {
        await supabase
          .from('tool_categories')
          .update({ frequency: existing.frequency + 1 })
          .eq('id', existing.id);
      }
    } catch (error) {
      // Category might not exist in custom categories, which is fine
      console.log('Category not found in custom categories:', categoryName);
    }
  };

  const handleFiltersChange = (filters: FilterOptions) => {
    setActiveFilters(filters);
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Wrench className="w-8 h-8" />
            Tool Management System
          </h1>
          <p className="text-muted-foreground">
            Manage your tools with hierarchical categorization and filtering
          </p>
        </div>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Add New Tool</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              {/* Tool Category Selector */}
              <ToolSelector
                onToolChange={setSelectedTool}
              />
              
              {/* Tool Details Form */}
              {selectedTool && (
                <Card>
                  <CardHeader>
                    <CardTitle>Tool Details</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Tool Name *</label>
                        <Input
                          value={toolForm.name}
                          onChange={(e) => setToolForm(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="Enter tool name"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Quantity</label>
                        <Input
                          type="number"
                          value={toolForm.quantity}
                          onChange={(e) => setToolForm(prev => ({ ...prev, quantity: e.target.value }))}
                          placeholder="0"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Manufacturer</label>
                        <Input
                          value={toolForm.manufacturer}
                          onChange={(e) => setToolForm(prev => ({ ...prev, manufacturer: e.target.value }))}
                          placeholder="Tool manufacturer"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Part Number</label>
                        <Input
                          value={toolForm.partNumber}
                          onChange={(e) => setToolForm(prev => ({ ...prev, partNumber: e.target.value }))}
                          placeholder="Manufacturer part number"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Location</label>
                        <Input
                          value={toolForm.location}
                          onChange={(e) => setToolForm(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Storage location"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <Input
                        value={toolForm.description}
                        onChange={(e) => setToolForm(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Tool description"
                      />
                    </div>
                    
                    <div className="flex gap-2 pt-4">
                      <Button onClick={handleAddTool}>
                        Add Tool
                      </Button>
                      <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search and Filter */}
      <div className="flex flex-col lg:flex-row gap-4">
        <div className="flex-1">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search tools..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
        <div className="lg:w-80">
          <ToolFilterPanel
            activeFilters={activeFilters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
      </div>

      {/* Tools Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTools.map((tool) => (
          <Card key={tool.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <CardTitle className="text-lg">{tool.name}</CardTitle>
              {tool.description && (
                <p className="text-sm text-muted-foreground">{tool.description}</p>
              )}
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* Category Badges */}
                <div className="flex flex-wrap gap-2">
                  {tool.machiningType && (
                    <Badge variant="default" className="text-xs">
                      {tool.machiningType}
                    </Badge>
                  )}
                  {tool.subCategory && (
                    <Badge variant="secondary" className="text-xs">
                      {tool.subCategory}
                    </Badge>
                  )}
                </div>
                
                {/* Tool Details */}
                <div className="text-sm space-y-1">
                  {tool.manufacturer && (
                    <div><span className="font-medium">Manufacturer:</span> {tool.manufacturer}</div>
                  )}
                  {tool.partNumber && (
                    <div><span className="font-medium">Part #:</span> {tool.partNumber}</div>
                  )}
                  {tool.quantity !== undefined && (
                    <div><span className="font-medium">Quantity:</span> {tool.quantity}</div>
                  )}
                  {tool.location && (
                    <div><span className="font-medium">Location:</span> {tool.location}</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTools.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Wrench className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No tools found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm || Object.values(activeFilters).some(arr => arr.length > 0)
                ? 'Try adjusting your search or filters'
                : 'Add your first tool to get started'
              }
            </p>
            <Button onClick={() => setIsAddDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Tool
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};