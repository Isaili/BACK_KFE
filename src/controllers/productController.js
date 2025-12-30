
const Product = require('../models/product');

// Crear producto
exports.createProduct = async (req, res) => {
  try {
    const product = new Product(req.body);
    await product.save();
    res.status(201).json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener todos los productos
exports.getProducts = async (req, res) => {
  try {
    const { category, active } = req.query;
    let query = {};
    
    if (category) query.category = category;
    if (active !== undefined) query.isActive = active === 'true';
    
    const products = await Product.find(query).sort({ createdAt: -1 });
    
    res.json({
      success: true,
      count: products.length,
      data: products
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Obtener producto por ID
exports.getProductById = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Actualizar producto
exports.updateProduct = async (req, res) => {
  try {
    req.body.updatedAt = Date.now();
    
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      data: product
    });
  } catch (error) {
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar producto (borrado lógico)
exports.deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    product.isActive = false;
    product.updatedAt = Date.now();
    await product.save();
    
    res.json({
      success: true,
      message: 'Producto desactivado correctamente'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};

// Eliminar producto permanentemente (borrado físico)
exports.deleteProductPermanently = async (req, res) => {
  try {
    const product = await Product.findByIdAndDelete(req.params.id);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        error: 'Producto no encontrado'
      });
    }
    
    res.json({
      success: true,
      message: 'Producto eliminado permanentemente',
      data: product
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
};