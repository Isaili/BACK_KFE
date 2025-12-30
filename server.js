
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const connectDB = require('./config/database');

// Configurar variables de entorno
dotenv.config();

// Crear aplicación Express
const app = express();

// Middlewares esenciales
app.use(cors());
app.use(express.json());

// Conectar a la base de datos
connectDB();

// ========== RUTAS PRINCIPALES ==========
// Productos
const productController = require('./controllers/productController');
app.get('/api/products', productController.getProducts);
app.get('/api/products/:id', productController.getProductById);
app.post('/api/products', productController.createProduct);
app.put('/api/products/:id', productController.updateProduct);
app.delete('/api/products/:id', productController.deleteProduct);

// Ventas
const saleController = require('./controllers/saleController');
app.post('/api/sales', saleController.createSale);
app.get('/api/sales', saleController.getSales);

// Reportes
const reportController = require('./controllers/reportController');
app.get('/api/reports/products-sold', reportController.getProductsSoldByDate);
app.get('/api/reports/top-products', reportController.getTopProducts);
app.get('/api/reports/sales-chart', reportController.getSalesChartData);

// ========== RUTA DE BIENVENIDA ==========
app.get('/', (req, res) => {
  res.json({
    message: '☕ KFE Coffee API v1.0',
    status: 'online',
    documentation: {
      baseUrl: 'http://localhost:3000',
      endpoints: {
        products: '/api/products',
        sales: '/api/sales',
        reports: '/api/reports'
      }
    }
  });
});

// ========== MANEJO DE ERRORES ==========
// 1. Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Endpoint no encontrado',
    requested: {
      method: req.method,
      url: req.originalUrl
    },
    availableEndpoints: {
      products: 'GET, POST /api/products',
      sales: 'GET, POST /api/sales',
      reports: 'GET /api/reports/*'
    }
  });
});

// 2. Error del servidor (500)
app.use((error, req, res, next) => {
  console.error('🔴 Error del servidor:', error);
  res.status(500).json({
    success: false,
    error: 'Error interno del servidor',
    details: process.env.NODE_ENV === 'development' ? error.message : 'Contacta al administrador'
  });
});

// ========== INICIAR SERVIDOR ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
  ╔══════════════════════════════════════════╗
  ║         ☕ KFE COFFEE API v1.0           ║
  ╠══════════════════════════════════════════╣
  ║  ✅ Servidor activo en puerto: ${PORT}     ║
  ║  🔗 URL: http://localhost:${PORT}         ║
  ║  📊 Base: MongoDB Atlas                 ║
  ║  🚀 Estado: Conectado                   ║
  ╚══════════════════════════════════════════╝
  `);
});

module.exports = app;