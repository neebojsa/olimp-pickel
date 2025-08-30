import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { Search, Wrench, Settings, Package } from "lucide-react";

interface ToolSuggestion {
  id: string;
  tool_name: string;
  tool_type: string;
  category: string;
  description: string;
  specifications: any;
  manufacturer: string;
  part_number: string;
  typical_applications: string[];
  cutting_parameters: any;
}

interface ToolFormData {
  name: string;
  description: string;
  part_number: string;
  supplier: string;
  unit_price: string;
  quantity: string;
  minimum_stock: string;
  location: string;
}

interface ToolSuggestionsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onToolSelected: (toolData: ToolFormData) => void;
}

const getToolTypeIcon = (toolType: string) => {
  switch (toolType) {
    case 'cutting_tool':
      return <Settings className="h-4 w-4" />;
    case 'tool_holder':
      return <Package className="h-4 w-4" />;
    case 'workholding':
      return <Wrench className="h-4 w-4" />;
    default:
      return <Settings className="h-4 w-4" />;
  }
};

const getToolTypeColor = (toolType: string) => {
  switch (toolType) {
    case 'cutting_tool':
      return 'bg-blue-500/10 text-blue-700 border-blue-200';
    case 'tool_holder':
      return 'bg-green-500/10 text-green-700 border-green-200';
    case 'workholding':
      return 'bg-purple-500/10 text-purple-700 border-purple-200';
    case 'insert':
      return 'bg-orange-500/10 text-orange-700 border-orange-200';
    default:
      return 'bg-gray-500/10 text-gray-700 border-gray-200';
  }
};

export function ToolSuggestionsDialog({ open, onOpenChange, onToolSelected }: ToolSuggestionsDialogProps) {
  const [suggestions, setSuggestions] = useState<ToolSuggestion[]>([]);
  const [filteredSuggestions, setFilteredSuggestions] = useState<ToolSuggestion[]>([]);
  const [selectedTool, setSelectedTool] = useState<ToolSuggestion | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [toolTypeFilter, setToolTypeFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [loading, setLoading] = useState(false);
  
  // Form data
  const [formData, setFormData] = useState<ToolFormData>({
    name: "",
    description: "",
    part_number: "",
    supplier: "",
    unit_price: "0",
    quantity: "1",
    minimum_stock: "1",
    location: ""
  });

  useEffect(() => {
    if (open) {
      fetchToolSuggestions();
    }
  }, [open]);

  useEffect(() => {
    filterSuggestions();
  }, [suggestions, searchQuery, toolTypeFilter, categoryFilter]);

  const fetchToolSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('tools_library')
        .select('*')
        .order('tool_name');

      if (error) throw error;
      setSuggestions(data || []);
    } catch (error) {
      console.error('Error fetching tool suggestions:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterSuggestions = () => {
    let filtered = suggestions;

    if (searchQuery) {
      filtered = filtered.filter(tool => 
        tool.tool_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tool.category.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (toolTypeFilter !== "all") {
      filtered = filtered.filter(tool => tool.tool_type === toolTypeFilter);
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter(tool => tool.category === categoryFilter);
    }

    setFilteredSuggestions(filtered);
  };

  const handleToolSelect = (tool: ToolSuggestion) => {
    setSelectedTool(tool);
    
    // Pre-fill form with suggestion data
    setFormData({
      name: tool.tool_name,
      description: tool.description || "",
      part_number: tool.part_number || "",
      supplier: tool.manufacturer || "",
      unit_price: "0",
      quantity: "1",
      minimum_stock: "1",
      location: ""
    });
  };

  const handleFormSubmit = () => {
    onToolSelected(formData);
    onOpenChange(false);
    
    // Reset form
    setSelectedTool(null);
    setFormData({
      name: "",
      description: "",
      part_number: "",
      supplier: "",
      unit_price: "0",
      quantity: "1",
      minimum_stock: "1",
      location: ""
    });
    setSearchQuery("");
    setToolTypeFilter("all");
    setCategoryFilter("all");
  };

  const uniqueToolTypes = [...new Set(suggestions.map(s => s.tool_type))];
  const uniqueCategories = [...new Set(suggestions.map(s => s.category))];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Add Tool from Library
          </DialogTitle>
          <DialogDescription>
            Select a tool from our CNC machining library or customize the details as needed.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left side - Tool suggestions */}
          <div className="space-y-4">
            <div className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search tools..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <div className="flex gap-2">
                <Select value={toolTypeFilter} onValueChange={setToolTypeFilter}>
                  <SelectTrigger className="w-1/2">
                    <SelectValue placeholder="Tool Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    {uniqueToolTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        {type.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-1/2">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {uniqueCategories.map(category => (
                      <SelectItem key={category} value={category}>
                        {category.replace('_', ' ').toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2 max-h-96 overflow-y-auto">
              {loading ? (
                <p className="text-center py-4 text-muted-foreground">Loading tools...</p>
              ) : filteredSuggestions.length === 0 ? (
                <p className="text-center py-4 text-muted-foreground">No tools found matching your criteria.</p>
              ) : (
                filteredSuggestions.map((tool) => (
                  <Card 
                    key={tool.id} 
                    className={`cursor-pointer transition-colors hover:bg-accent ${
                      selectedTool?.id === tool.id ? 'ring-2 ring-primary bg-accent' : ''
                    }`}
                    onClick={() => handleToolSelect(tool)}
                  >
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getToolTypeIcon(tool.tool_type)}
                            <h4 className="font-medium text-sm">{tool.tool_name}</h4>
                          </div>
                          <p className="text-xs text-muted-foreground mb-2">{tool.description}</p>
                          
                          <div className="flex flex-wrap gap-1 mb-2">
                            <Badge 
                              variant="outline" 
                              className={`text-xs ${getToolTypeColor(tool.tool_type)}`}
                            >
                              {tool.tool_type.replace('_', ' ')}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {tool.category.replace('_', ' ')}
                            </Badge>
                          </div>

                          {tool.specifications && Object.keys(tool.specifications).length > 0 && (
                            <div className="text-xs text-muted-foreground">
                              <span className="font-medium">Specs: </span>
                              {Object.entries(tool.specifications).slice(0, 2).map(([key, value]) => (
                                <span key={key}>{key}: {value as string}; </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>

          {/* Right side - Tool details form */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Tool Details</h3>
              {selectedTool && (
                <Badge variant="outline" className="text-xs">
                  Based on: {selectedTool.tool_name}
                </Badge>
              )}
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Tool Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Enter tool name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tool description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="part_number">Part Number</Label>
                  <Input
                    id="part_number"
                    value={formData.part_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, part_number: e.target.value }))}
                    placeholder="Part number"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier/Manufacturer</Label>
                  <Input
                    id="supplier"
                    value={formData.supplier}
                    onChange={(e) => setFormData(prev => ({ ...prev, supplier: e.target.value }))}
                    placeholder="Supplier name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quantity">Quantity *</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={formData.quantity}
                    onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="1"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={formData.unit_price}
                    onChange={(e) => setFormData(prev => ({ ...prev, unit_price: e.target.value }))}
                    placeholder="0.00"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="minimum_stock">Min Stock</Label>
                  <Input
                    id="minimum_stock"
                    type="number"
                    value={formData.minimum_stock}
                    onChange={(e) => setFormData(prev => ({ ...prev, minimum_stock: e.target.value }))}
                    placeholder="1"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Storage Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="Storage location"
                />
              </div>

              {selectedTool && (
                <>
                  <Separator />
                  <div className="bg-muted/50 p-3 rounded-md">
                    <h4 className="font-medium text-sm mb-2">Additional Tool Information</h4>
                    
                    {selectedTool.typical_applications && selectedTool.typical_applications.length > 0 && (
                      <div className="mb-2">
                        <span className="text-xs font-medium">Applications: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {selectedTool.typical_applications.map((app, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {app.replace('_', ' ')}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedTool.cutting_parameters && Object.keys(selectedTool.cutting_parameters).length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        <span className="font-medium">Cutting Parameters: </span>
                        {Object.entries(selectedTool.cutting_parameters).map(([key, value]) => (
                          <span key={key}>{key}: {value as string}; </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 pt-4">
              <Button
                onClick={handleFormSubmit}
                disabled={!formData.name || !formData.quantity}
                className="flex-1"
              >
                Add Tool to Inventory
              </Button>
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}