const API_BASE_URL = 'http://localhost:3000/api/vehicles';

// Mock data for development (since you don't want actual API connection)
const mockVehicles = [
  {
    _id: '1',
    vehicleId: 'V001',
    ownerId: 'user123',
    basicInfo: {
      make: 'Toyota',
      model: 'Camry',
      year: 2022,
      color: 'White',
      licensePlate: 'ABC123',
      chassisNumber: 'CHS001',
      engineNumber: 'ENG001'
    },
    details: {
      category: 'Sedan',
      fuelType: 'Petrol',
      transmission: 'Automatic',
      seatingCapacity: 5,
      mileage: 15000,
      features: ['AC', 'Bluetooth', 'GPS'],
      condition: 'Excellent',
      description: 'Well maintained vehicle'
    },
    pricing: {
      dailyRate: 5000,
      weeklyRate: 30000,
      monthlyRate: 100000,
      securityDeposit: 10000,
      currency: 'LKR'
    },
    status: 'approved',
    availability: {
      isAvailable: true
    }
  }
];

let vehicles = [...mockVehicles];
let nextId = 2;

// Simulate API delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export const vehicleService = {
  // Get all vehicles
  getAllVehicles: async () => {
    await delay(500);
    return vehicles;
  },

  // Get vehicle by ID
  getVehicleById: async (id) => {
    await delay(300);
    const vehicle = vehicles.find(v => v._id === id);
    if (!vehicle) throw new Error('Vehicle not found');
    return vehicle;
  },

  // Create new vehicle
  createVehicle: async (vehicleData) => {
    await delay(400);
    const newVehicle = {
      _id: String(nextId++),
      vehicleId: `V${String(nextId).padStart(3, '0')}`,
      ...vehicleData,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };
    vehicles.push(newVehicle);
    return newVehicle;
  },

  // Update vehicle
  updateVehicle: async (id, vehicleData) => {
    await delay(400);
    const index = vehicles.findIndex(v => v._id === id);
    if (index === -1) throw new Error('Vehicle not found');
    
    vehicles[index] = { ...vehicles[index], ...vehicleData };
    return vehicles[index];
  },

  // Delete vehicle
  deleteVehicle: async (id) => {
    await delay(300);
    const index = vehicles.findIndex(v => v._id === id);
    if (index === -1) throw new Error('Vehicle not found');
    
    vehicles.splice(index, 1);
    return { message: 'Vehicle deleted successfully' };
  }
};