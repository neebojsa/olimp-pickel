import { Material } from '@/types';

// Mock API functions - replace with actual API calls
export const getAllMaterials = async (): Promise<Material[]> => {
  // Mock data for development
  return [
    {
      id: '1',
      name: 'Steel Sheet',
      category: 'steel',
      quantity: 100,
      price: 2.5,
      priceUnit: 'kg'
    },
    {
      id: '2', 
      name: 'Aluminum Rod',
      category: 'aluminum',
      quantity: 50,
      price: 4.2,
      priceUnit: 'meter'
    }
  ];
};

export const deleteMaterial = async (id: string): Promise<void> => {
  // Mock delete function
  console.log('Deleting material with id:', id);
};

export const createMaterial = async (material: Omit<Material, 'id'>): Promise<Material> => {
  // Mock create function
  const newMaterial = { ...material, id: Date.now().toString() };
  console.log('Creating material:', newMaterial);
  return newMaterial;
};

export const updateMaterial = async (id: string, material: Partial<Material>): Promise<Material> => {
  // Mock update function
  const updatedMaterial = { ...material, id } as Material;
  console.log('Updating material:', updatedMaterial);
  return updatedMaterial;
};