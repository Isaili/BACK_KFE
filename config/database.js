
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    console.log('🔗 Conectando a MongoDB Atlas...');
    
   
    await mongoose.connect(process.env.MONGODB_URI, {
    
      serverSelectionTimeoutMS: 5000, 
      socketTimeoutMS: 45000, 
    });
    
    console.log('✅ MongoDB Atlas conectado exitosamente');
    console.log(`📊 Base de datos: ${mongoose.connection.name}`);
    console.log(`🔗 Host: ${mongoose.connection.host}`);
    
    
    await seedProducts();
    
    return mongoose.connection;
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB Atlas:', error.message);
    
    // Información de depuración
    if (error.name === 'MongooseServerSelectionError') {
      console.log('\n🔍 Posibles causas:');
      console.log('1. Verifica tu conexión a Internet');
      console.log('2. Ve a MongoDB Atlas → Network Access → Add IP Address');
      console.log('3. Click en "Add Current IP Address"');
      console.log('4. Espera 1-2 minutos para que se apliquen los cambios');
    }
    
    process.exit(1);
  }
};

async function seedProducts() {
  const Product = require('../models/Product');
  const count = await Product.countDocuments();
  
  if (count === 0) {
    console.log('🌱 Creando productos de ejemplo...');
    
    const products = [
      {
        name: 'Café Americano',
        description: 'Café negro tradicional',
        category: 'Bebida Caliente',
        price: 2.50,
        cost: 0.80,
        stock: 100
      },
      {
        name: 'Capuchino',
        description: 'Café con leche espumosa',
        category: 'Bebida Caliente',
        price: 3.50,
        cost: 1.20,
        stock: 80
      },
      {
        name: 'Latte',
        description: 'Café con leche vaporizada',
        category: 'Bebida Caliente',
        price: 3.75,
        cost: 1.30,
        stock: 70
      },
      {
        name: 'Mocha',
        description: 'Café con chocolate y leche',
        category: 'Bebida Caliente',
        price: 4.00,
        cost: 1.50,
        stock: 60
      },
      {
        name: 'Frappé de Vainilla',
        description: 'Bebida fría con sabor vainilla',
        category: 'Bebida Fría',
        price: 4.50,
        cost: 1.80,
        stock: 50
      },
      {
        name: 'Té Helado',
        description: 'Té negro frío con limón',
        category: 'Bebida Fría',
        price: 2.75,
        cost: 0.90,
        stock: 90
      },
      {
        name: 'Croissant',
        description: 'Panadería francesa',
        category: 'Pastelería',
        price: 2.00,
        cost: 0.60,
        stock: 50
      },
      {
        name: 'Donut de Chocolate',
        description: 'Donut glaseado de chocolate',
        category: 'Pastelería',
        price: 1.75,
        cost: 0.50,
        stock: 40
      },
      {
        name: 'Sandwich de Jamón y Queso',
        description: 'Pan integral con jamón y queso',
        category: 'Sandwich',
        price: 3.50,
        cost: 1.20,
        stock: 30
      },
      {
        name: 'Bagel con Crema de Queso',
        description: 'Bagel tostado con queso crema',
        category: 'Sandwich',
        price: 2.75,
        cost: 0.85,
        stock: 35
      }
    ];
    
    await Product.insertMany(products);
    console.log(`✅ ${products.length} productos de ejemplo creados`);
  } else {
    console.log(`📦 Base de datos ya tiene ${count} productos`);
  }
}

module.exports = connectDB;