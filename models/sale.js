
const mongoose = require('mongoose');

if (mongoose.models.Sale) {
  module.exports = mongoose.models.Sale;
} else {
  const saleItemSchema = new mongoose.Schema({
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    unitPrice: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  });

  const saleSchema = new mongoose.Schema({
    saleNumber: {
      type: String,
      unique: true,
      required: true
    },
    items: [saleItemSchema],
    total: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['Efectivo', 'Tarjeta', 'Transferencia'],
      required: true
    },
    status: {
      type: String,
      enum: ['Completada', 'Cancelada'],
      default: 'Completada'
    },
    seller: {
      type: String,
      required: true
    },
    
    createdAt: Date
  });

  module.exports = mongoose.model('Sale', saleSchema);
}