
const mongoose = require('mongoose');

// Verificar si el modelo ya existe para evitar recompilarlo
if (mongoose.models.Product) {
  module.exports = mongoose.models.Product;
} else {
  const productSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    category: {
      type: String,
      enum: ['Bebida Caliente', 'Bebida Fría', 'Pastelería', 'Sandwich', 'Otros'],
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    cost: {
      type: Number,
      required: true,
      min: 0
    },
    stock: {
      type: Number,
      default: 0,
      min: 0
    },
    isActive: {
      type: Boolean,
      default: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    }
  });

  module.exports = mongoose.model('Product', productSchema);
}