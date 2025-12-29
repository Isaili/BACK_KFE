
const Sale = require('../models/Sale');
const Product = require('../models/Product');
const mongoose = require('mongoose');

// Función para obtener fecha/hora LOCAL
function getLocalDateTime() {
  const now = new Date();
  // Ajustar a zona horaria local
  return new Date(now.getTime() - (now.getTimezoneOffset() * 60000));
}

// Función para generar número de venta
async function generateSaleNumber(session = null) {
  try {
    const count = session 
      ? await Sale.countDocuments().session(session)
      : await Sale.countDocuments();
    
    return `KFE-${(count + 1).toString().padStart(6, '0')}`;
  } catch (error) {
    return `KFE-${Date.now().toString().slice(-6)}`;
  }
}

// Crear nueva venta CON FECHA LOCAL
exports.createSale = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  
  try {
    const { items, paymentMethod, seller } = req.body;
    
    // Validaciones básicas
    if (!items || !Array.isArray(items) || items.length === 0) {
      throw new Error('Debe incluir al menos un item en la venta');
    }
    
    if (!paymentMethod || !seller) {
      throw new Error('paymentMethod y seller son requeridos');
    }
    
    // Validar y calcular venta
    let total = 0;
    const saleItems = [];
    
    for (const item of items) {
      if (!item.productId || !item.quantity) {
        throw new Error('Cada item debe tener productId y quantity');
      }
      
      const product = await Product.findById(item.productId).session(session);
      
      if (!product) {
        throw new Error(`Producto ${item.productId} no encontrado`);
      }
      
      if (product.stock < item.quantity) {
        throw new Error(`Stock insuficiente para ${product.name}. Disponible: ${product.stock}`);
      }
      
      // Calcular subtotal
      const subtotal = product.price * item.quantity;
      total += subtotal;
      
      // Reducir stock
      product.stock -= item.quantity;
      await product.save({ session });
      
      saleItems.push({
        product: product._id,
        quantity: item.quantity,
        unitPrice: product.price,
        subtotal: subtotal
      });
    }
    
    // Generar número de venta
    const saleNumber = await generateSaleNumber(session);
    
   
    const localDate = getLocalDateTime();
    
    // Crear venta CON FECHA LOCAL
    const sale = new Sale({
      saleNumber: saleNumber,
      items: saleItems,
      total: total,
      paymentMethod: paymentMethod,
      seller: seller,
      createdAt: localDate  
    });
    
    await sale.save({ session });
    
    await session.commitTransaction();
    session.endSession();
    
    // Mostrar información de fecha para debug
    console.log('📅 Venta creada con fecha:');
    console.log('  Local:', localDate.toISOString());
    console.log('  Formato legible:', localDate.toLocaleString());
    console.log('  Solo fecha:', localDate.toISOString().split('T')[0]);
    
    res.status(201).json({
      success: true,
      data: {
        ...sale.toObject(),
        fechaLocal: localDate.toISOString().split('T')[0],
        horaLocal: localDate.toISOString().split('T')[1].split('.')[0]
      },
      message: `Venta ${saleNumber} registrada correctamente`
    });
    
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    
    console.error('❌ Error creando venta:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener ventas con soporte para fecha LOCAL
exports.getSales = async (req, res) => {
  try {
    const { startDate, endDate, page = 1, limit = 10, useLocalDate = 'true' } = req.query;
    let query = {};
    
    // Filtrar por fecha - CON SOPORTE PARA FECHA LOCAL
    if (startDate || endDate) {
      query.createdAt = {};
      
      if (startDate) {
        if (useLocalDate === 'true') {
          // Para fecha local, buscar desde inicio del día LOCAL
          const startLocal = new Date(startDate + 'T00:00:00');
          startLocal.setMinutes(startLocal.getMinutes() - startLocal.getTimezoneOffset());
          query.createdAt.$gte = startLocal;
        } else {
          query.createdAt.$gte = new Date(startDate);
        }
      }
      
      if (endDate) {
        if (useLocalDate === 'true') {
          // Para fecha local, buscar hasta fin del día LOCAL
          const endLocal = new Date(endDate + 'T23:59:59.999');
          endLocal.setMinutes(endLocal.getMinutes() - endLocal.getTimezoneOffset());
          query.createdAt.$lte = endLocal;
        } else {
          query.createdAt.$lte = new Date(endDate + 'T23:59:59.999');
        }
      }
    }
    
    const sales = await Sale.find(query)
      .populate('items.product', 'name category price')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);
    
    // Formatear fechas a local para la respuesta
    const formattedSales = sales.map(sale => {
      const saleObj = sale.toObject();
      const localDate = new Date(sale.createdAt.getTime() - (sale.createdAt.getTimezoneOffset() * 60000));
      
      return {
        ...saleObj,
        fechaLocal: localDate.toISOString().split('T')[0],
        horaLocal: localDate.toISOString().split('T')[1].split('.')[0],
        fechaCompletaLocal: localDate.toLocaleString()
      };
    });
    
    const total = await Sale.countDocuments(query);
    
    res.json({
      success: true,
      data: formattedSales,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        itemsPerPage: parseInt(limit)
      },
      dateInfo: {
        startDate: startDate || 'No aplica',
        endDate: endDate || 'No aplica',
        useLocalDate: useLocalDate === 'true'
      }
    });
  } catch (error) {
    console.error('❌ Error obteniendo ventas:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Endpoint adicional para diagnóstico de fechas
exports.getSalesWithTimezoneInfo = async (req, res) => {
  try {
    const sales = await Sale.find()
      .populate('items.product', 'name')
      .sort({ createdAt: -1 })
      .limit(20);
    
    const salesWithTimezone = sales.map(sale => {
      const utcDate = sale.createdAt;
      const localDate = new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
      
      return {
        saleNumber: sale.saleNumber,
        total: sale.total,
        seller: sale.seller,
        dates: {
          utc: {
            iso: utcDate.toISOString(),
            date: utcDate.toISOString().split('T')[0],
            time: utcDate.toISOString().split('T')[1].split('.')[0]
          },
          local: {
            iso: localDate.toISOString(),
            date: localDate.toISOString().split('T')[0],
            time: localDate.toISOString().split('T')[1].split('.')[0],
            formatted: localDate.toLocaleString()
          }
        },
        timezoneOffset: utcDate.getTimezoneOffset() / 60 // Horas de diferencia
      };
    });
    
    res.json({
      success: true,
      timezoneInfo: {
        serverTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        utcOffset: new Date().getTimezoneOffset() / 60,
        currentTime: {
          utc: new Date().toISOString(),
          local: new Date().toLocaleString()
        }
      },
      sales: salesWithTimezone,
      total: sales.length
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};