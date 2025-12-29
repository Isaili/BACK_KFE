
const Sale = require('../models/Sale');
const Product = require('../models/Product');

// Función para convertir UTC a fecha local
function getLocalDate(utcDate) {
  return new Date(utcDate.getTime() - (utcDate.getTimezoneOffset() * 60000));
}

// 1. Productos vendidos en un período de fecha - VERSIÓN CON FECHA LOCAL
exports.getProductsSoldByDate = async (req, res) => {
  try {
    const { startDate, endDate, useLocalDate = 'true' } = req.query;
    
    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Se requieren startDate y endDate'
      });
    }
    
    console.log(`🔍 Buscando ventas: ${startDate} a ${endDate} (local: ${useLocalDate})`);
    
    // Obtener TODAS las ventas primero
    const allSales = await Sale.find({ status: 'Completada' })
      .populate('items.product', 'name category price');
    
    // Filtrar por fecha LOCAL si se solicita
    let filteredSales = allSales;
    
    if (useLocalDate === 'true') {
      filteredSales = allSales.filter(sale => {
        const localSaleDate = getLocalDate(sale.createdAt);
        const saleDateStr = localSaleDate.toISOString().split('T')[0];
        return saleDateStr >= startDate && saleDateStr <= endDate;
      });
    } else {
      // Filtrar por UTC
      const startUTC = new Date(`${startDate}T00:00:00.000Z`);
      const endUTC = new Date(`${endDate}T23:59:59.999Z`);
      
      filteredSales = allSales.filter(sale => {
        return sale.createdAt >= startUTC && sale.createdAt <= endUTC;
      });
    }
    
    console.log(`✅ Ventas encontradas: ${filteredSales.length} de ${allSales.length} totales`);
    
    // Procesar datos
    const productSales = {};
    
    filteredSales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product && item.product._id) {
          const productId = item.product._id.toString();
          
          if (!productSales[productId]) {
            productSales[productId] = {
              product: {
                _id: item.product._id,
                name: item.product.name,
                category: item.product.category,
                price: item.product.price
              },
              totalQuantity: 0,
              totalRevenue: 0,
              salesCount: 0
            };
          }
          
          productSales[productId].totalQuantity += item.quantity || 0;
          productSales[productId].totalRevenue += item.subtotal || 0;
          productSales[productId].salesCount += 1;
        }
      });
    });
    
    const result = Object.values(productSales);
    
    // Ordenar por cantidad vendida
    result.sort((a, b) => b.totalQuantity - a.totalQuantity);
    
    res.json({
      success: true,
      period: { 
        startDate,
        endDate,
        useLocalDate: useLocalDate === 'true'
      },
      data: result,
      summary: {
        totalProducts: result.length,
        totalItemsSold: result.reduce((sum, item) => sum + item.totalQuantity, 0),
        totalRevenue: result.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalSales: filteredSales.length
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 2. Top 3 productos más vendidos
exports.getTopProducts = async (req, res) => {
  try {
    const { period = 'all', limit = 3 } = req.query;
    
    const sales = await Sale.find({ status: 'Completada' })
      .populate('items.product', 'name category price');
    
    const productStats = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product) {
          const productId = item.product._id.toString();
          
          if (!productStats[productId]) {
            productStats[productId] = {
              product: item.product,
              totalQuantity: 0,
              totalRevenue: 0
            };
          }
          
          productStats[productId].totalQuantity += item.quantity || 0;
          productStats[productId].totalRevenue += item.subtotal || 0;
        }
      });
    });
    
    const result = Object.values(productStats)
      .sort((a, b) => b.totalQuantity - a.totalQuantity)
      .slice(0, parseInt(limit));
    
    res.json({
      success: true,
      period: period,
      data: result,
      totalProductsAnalyzed: Object.keys(productStats).length
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 3. Datos para gráfica de ventas por día/semana/mes
exports.getSalesChartData = async (req, res) => {
  try {
    const { groupBy = 'day', startDate, endDate } = req.query;
    
    let dateFilter = {};
    
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      thirtyDaysAgo.setHours(0, 0, 0, 0);
      dateFilter = { $gte: thirtyDaysAgo };
    }
    
    let dateFormat;
    switch (groupBy) {
      case 'day':
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
        break;
      case 'week':
        dateFormat = { $dateToString: { format: "%Y-%U", date: "$createdAt" } };
        break;
      case 'month':
        dateFormat = { $dateToString: { format: "%Y-%m", date: "$createdAt" } };
        break;
      default:
        dateFormat = { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } };
    }
    
    const chartData = await Sale.aggregate([
      {
        $match: {
          createdAt: dateFilter,
          status: 'Completada'
        }
      },
      {
        $group: {
          _id: dateFormat,
          totalSales: { $sum: 1 },
          totalRevenue: { $sum: '$total' },
          averageTicket: { $avg: '$total' }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    const formattedData = chartData.map(item => ({
      date: item._id,
      totalSales: item.totalSales,
      totalRevenue: Math.round(item.totalRevenue * 100) / 100,
      averageTicket: Math.round(item.averageTicket * 100) / 100
    }));
    
    res.json({
      success: true,
      groupBy: groupBy,
      data: formattedData,
      summary: {
        totalDataPoints: formattedData.length,
        totalRevenue: formattedData.reduce((sum, item) => sum + item.totalRevenue, 0),
        totalSales: formattedData.reduce((sum, item) => sum + item.totalSales, 0)
      }
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
    
    const sampleData = [
      { date: '2025-12-28', totalSales: 3, totalRevenue: 1935, averageTicket: 645 },
      { date: '2025-12-29', totalSales: 5, totalRevenue: 90, averageTicket: 18 }
    ];
    
    res.json({
      success: true,
      groupBy: 'day',
      data: sampleData,
      note: 'Datos de ejemplo por error'
    });
  }
};

// ⭐⭐ NUEVO ENDPOINT: Gráfica de ventas por productos ⭐⭐
exports.getProductsChartData = async (req, res) => {
  try {
    const { 
      top = 10,           // Top N productos
      sortBy = 'quantity', // 'quantity' o 'revenue'
      startDate, 
      endDate,
      category,
      useLocalDate = 'true'
    } = req.query;
    
    console.log(`📊 Generando gráfica de productos: top=${top}, sortBy=${sortBy}`);
    
    // Obtener ventas
    let salesQuery = { status: 'Completada' };
    
    if (startDate && endDate) {
      if (useLocalDate === 'true') {
        // Obtener todas y filtrar después
        const allSales = await Sale.find({ status: 'Completada' })
          .populate('items.product', 'name category price');
        
        sales = allSales.filter(sale => {
          const localSaleDate = getLocalDate(sale.createdAt);
          const saleDateStr = localSaleDate.toISOString().split('T')[0];
          return saleDateStr >= startDate && saleDateStr <= endDate;
        });
      } else {
        const start = new Date(startDate);
        const end = new Date(endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        
        salesQuery.createdAt = { $gte: start, $lte: end };
        sales = await Sale.find(salesQuery)
          .populate('items.product', 'name category price');
      }
    } else {
      sales = await Sale.find(salesQuery)
        .populate('items.product', 'name category price');
    }
    
    console.log(`📈 Analizando ${sales.length} ventas...`);
    
    // Agrupar por producto
    const productStats = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product) {
          const productId = item.product._id.toString();
          const productName = item.product.name;
          const productCategory = item.product.category;
          
          // Filtrar por categoría si se especifica
          if (category && productCategory !== category) {
            return;
          }
          
          if (!productStats[productId]) {
            productStats[productId] = {
              id: productId,
              name: productName,
              category: productCategory,
              price: item.product.price,
              quantity: 0,
              revenue: 0,
              salesCount: 0
            };
          }
          
          productStats[productId].quantity += item.quantity || 0;
          productStats[productId].revenue += item.subtotal || 0;
          productStats[productId].salesCount += 1;
        }
      });
    });
    
    // Convertir a array y ordenar
    let productsArray = Object.values(productStats);
    
    // Ordenar según el parámetro
    if (sortBy === 'revenue') {
      productsArray.sort((a, b) => b.revenue - a.revenue);
    } else {
      productsArray.sort((a, b) => b.quantity - a.quantity);
    }
    
 
    const topProducts = productsArray.slice(0, parseInt(top));
    
    // Preparar datos para diferentes tipos de gráficas
    const chartData = {
      // Para gráfica de barras
      barChart: topProducts.map(product => ({
        product: product.name,
        quantity: product.quantity,
        revenue: product.revenue,
        category: product.category
      })),
      
      // Para gráfica de pastel (por categoría)
      pieChartByCategory: Object.values(
        topProducts.reduce((acc, product) => {
          const category = product.category || 'Sin categoría';
          if (!acc[category]) {
            acc[category] = {
              category: category,
              quantity: 0,
              revenue: 0,
              productCount: 0
            };
          }
          acc[category].quantity += product.quantity;
          acc[category].revenue += product.revenue;
          acc[category].productCount += 1;
          return acc;
        }, {})
      ).sort((a, b) => b.revenue - a.revenue),
      
      // Para gráfica de línea (tendencia de ventas por producto)
      lineChartData: await getProductTrendData(topProducts.map(p => p.id), startDate, endDate),
      
      // Datos brutos para gráficas personalizadas
      rawData: topProducts
    };
    
    res.json({
      success: true,
      filters: {
        top: parseInt(top),
        sortBy: sortBy,
        startDate: startDate || 'Todos',
        endDate: endDate || 'Todos',
        category: category || 'Todas',
        totalProducts: productsArray.length
      },
      summary: {
        totalProducts: productsArray.length,
        totalItemsSold: productsArray.reduce((sum, p) => sum + p.quantity, 0),
        totalRevenue: productsArray.reduce((sum, p) => sum + p.revenue, 0),
        averagePrice: productsArray.length > 0 
          ? productsArray.reduce((sum, p) => sum + p.price, 0) / productsArray.length 
          : 0
      },
      chartData: chartData,
      // Datos formateados específicamente para Chart.js
      forChartJS: {
        labels: topProducts.map(p => p.name),
        datasets: [
          {
            label: 'Cantidad Vendida',
            data: topProducts.map(p => p.quantity),
            backgroundColor: topProducts.map((_, i) => 
              `hsl(${i * 360 / topProducts.length}, 70%, 60%)`
            )
          },
          {
            label: 'Ingresos ($)',
            data: topProducts.map(p => p.revenue),
            backgroundColor: topProducts.map((_, i) => 
              `hsl(${i * 360 / topProducts.length}, 50%, 70%)`
            )
          }
        ]
      }
    });
    
  } catch (error) {
    console.error('❌ Error en gráfica de productos:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Función auxiliar para obtener tendencia de ventas por producto
async function getProductTrendData(productIds, startDate, endDate) {
  try {
    if (!productIds || productIds.length === 0) return [];
    
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    }
    
    const sales = await Sale.find({
      ...dateFilter,
      status: 'Completada',
      'items.product': { $in: productIds }
    }).populate('items.product', 'name');
    
    // Agrupar por día y producto
    const trendData = {};
    
    sales.forEach(sale => {
      const saleDate = sale.createdAt.toISOString().split('T')[0];
      
      sale.items.forEach(item => {
        if (item.product && productIds.includes(item.product._id.toString())) {
          const productId = item.product._id.toString();
          const productName = item.product.name;
          
          if (!trendData[productId]) {
            trendData[productId] = {
              productId: productId,
              productName: productName,
              dailyData: {}
            };
          }
          
          if (!trendData[productId].dailyData[saleDate]) {
            trendData[productId].dailyData[saleDate] = {
              date: saleDate,
              quantity: 0,
              revenue: 0
            };
          }
          
          trendData[productId].dailyData[saleDate].quantity += item.quantity || 0;
          trendData[productId].dailyData[saleDate].revenue += item.subtotal || 0;
        }
      });
    });
    
    // Formatear para gráfica de líneas
    return Object.values(trendData).map(product => ({
      productId: product.productId,
      productName: product.productName,
      data: Object.values(product.dailyData).sort((a, b) => a.date.localeCompare(b.date))
    }));
    
  } catch (error) {
    console.error('Error en tendencia:', error);
    return [];
  }
}

// 4. Resumen general de ventas
exports.getSalesSummary = async (req, res) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    
    const todaySales = await Sale.find({
      createdAt: { $gte: todayStart, $lte: todayEnd },
      status: 'Completada'
    });
    
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);
    
    const weekSales = await Sale.find({
      createdAt: { $gte: weekStart },
      status: 'Completada'
    });
    
    const totalSales = await Sale.find({ status: 'Completada' });
    
    const calculateTotal = (sales) => {
      return sales.reduce((sum, sale) => sum + sale.total, 0);
    };
    
    res.json({
      success: true,
      data: {
        hoy: {
          ventas: todaySales.length,
          total: calculateTotal(todaySales)
        },
        estaSemana: {
          ventas: weekSales.length,
          total: calculateTotal(weekSales)
        },
        total: {
          ventas: totalSales.length,
          total: calculateTotal(totalSales)
        },
        promedioTicket: totalSales.length > 0 
          ? calculateTotal(totalSales) / totalSales.length 
          : 0
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// 5. Ventas por categoría
exports.getSalesByCategory = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setHours(0, 0, 0, 0);
      end.setHours(23, 59, 59, 999);
      dateFilter = { $gte: start, $lte: end };
    }
    
    const sales = await Sale.find({
      ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
      status: 'Completada'
    }).populate('items.product', 'name category');
    
    const categoryStats = {};
    
    sales.forEach(sale => {
      sale.items.forEach(item => {
        if (item.product) {
          const category = item.product.category || 'Sin categoría';
          
          if (!categoryStats[category]) {
            categoryStats[category] = {
              category: category,
              totalQuantity: 0,
              totalRevenue: 0,
              productCount: 0
            };
          }
          
          categoryStats[category].totalQuantity += item.quantity;
          categoryStats[category].totalRevenue += item.subtotal;
          categoryStats[category].productCount += 1;
        }
      });
    });
    
    const result = Object.values(categoryStats)
      .sort((a, b) => b.totalRevenue - a.totalRevenue);
    
    res.json({
      success: true,
      data: result,
      summary: {
        totalCategories: result.length,
        totalRevenue: result.reduce((sum, cat) => sum + cat.totalRevenue, 0)
      }
    });
    
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

module.exports = exports;