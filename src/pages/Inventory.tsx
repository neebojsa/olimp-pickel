import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Eye, Edit, Trash2 } from 'lucide-react';
import MaterialForm from '@/components/MaterialForm';
import ViewMaterialDialog from '@/components/ViewMaterialDialog';
import EditMaterialDialog from '@/components/EditMaterialDialog';
import { useToast } from "@/components/ui/use-toast"
import { Material } from '@/types';
import { getAllMaterials, deleteMaterial } from '@/lib/api';

const Inventory = () => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [items, setItems] = useState<Material[]>([]);
  const [selectedItem, setSelectedItem] = useState<Material | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const { toast } = useToast();

  useEffect(() => {
    fetchMaterials();
  }, []);

  const fetchMaterials = async () => {
    try {
      const materials = await getAllMaterials();
      setItems(materials);
    } catch (error) {
      console.error("Failed to fetch materials:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to fetch materials. Please try again.",
      })
    }
  };

  const handleViewItem = (item: Material) => {
    setSelectedItem(item);
    setIsViewOpen(true);
  };

  const handleEditItem = (item: Material) => {
    setSelectedItem(item);
    setIsEditOpen(true);
  };

  const handleDeleteItem = async (id: string) => {
    try {
      await deleteMaterial(id);
      setItems(items.filter(item => item.id !== id));
      toast({
        title: "Success",
        description: "Material deleted successfully.",
      })
    } catch (error) {
      console.error("Failed to delete material:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: "Failed to delete material. Please try again.",
      })
    }
  };

  const filteredItems = items?.filter((item) => {
    const searchRegex = new RegExp(searchTerm, 'i');
    const categoryMatch = categoryFilter === 'all' || item.category === categoryFilter;
    return searchRegex.test(item.name) && categoryMatch;
  });

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Inventory Management</h1>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Add Material
        </Button>
      </div>

      <div className="flex gap-4 mb-4">
        <Input
          placeholder="Search materials..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="max-w-sm"
        />
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="steel">Steel</SelectItem>
            <SelectItem value="aluminum">Aluminum</SelectItem>
            <SelectItem value="plastic">Plastic</SelectItem>
            <SelectItem value="wood">Wood</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden" style={{ height: '90px', overflowY: 'auto' }}>
        <div className="space-y-2 p-4">
          {filteredItems?.map((item) => (
            <div key={item?.id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50 cursor-pointer">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {item?.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <h3 className="font-medium">{item?.name}</h3>
                  <p className="text-sm text-gray-500">
                    {item?.category} • Stock: {item?.quantity} • 
                    {item?.price && item?.priceUnit ? 
                      ` $${item.price}/${item.priceUnit}` : 
                      ' Price not set'
                    }
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" onClick={() => handleViewItem(item)}>
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleEditItem(item)}>
                  <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item?.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>

      <MaterialForm open={isFormOpen} setOpen={setIsFormOpen} onMaterialAdded={fetchMaterials} />
      <ViewMaterialDialog open={isViewOpen} setOpen={setIsViewOpen} item={selectedItem} />
      <EditMaterialDialog open={isEditOpen} setOpen={setIsEditOpen} item={selectedItem} onMaterialUpdated={fetchMaterials} />
    </div>
  );
};

export default Inventory;
