const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');


router.get('/products-sold', reportController.getProductsSoldByDate);
router.get('/top-products', reportController.getTopProducts);
router.get('/sales-chart', reportController.getSalesChartData);
router.get('/summary', reportController.getSalesSummary);
router.get('/by-category', reportController.getSalesByCategory);

// NUEVA RUTA para gráfica de productos
router.get('/products-chart', reportController.getProductsChartData);

module.exports = router;