// Esquema para modelar bloques
const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const blockSchema = new Schema ({
  title: {
    type: String,
    required: true
  },
  section: [String],
  number: Number,
  order: Number,
  content: String,
  // media:
  // rules:
  questionaries: {
    type: Schema.Types.ObjectId,
    ref: 'questionaries'
  },
  isPublished: {
    type: Boolean,
    default: false
  },
  isVisible: {
    type: Boolean,
    default: false
  },
  keywords: [String],
  author: {
    type: Schema.Types.ObjectId,
    ref: 'user'
  },
  own: OwnerSchema,
  mod: [ModSchema],
  perm: PermissionsSchema
});

const Blocks = mongoose.model('blocks', blockSchema);
module.exports = Blocks;
