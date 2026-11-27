import mongoose from 'mongoose';

const { Schema } = mongoose;

const MessageSchema = new Schema({
  chatId: { type: String, required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  content: { type: String, required: function () { return this.type !== 'file'; } }, // encrypted payload (base64)
  iv: { type: String, required: true },
  type: { type: String, enum: ['text', 'file'], default: 'text' },
  fileId: { type: Schema.Types.ObjectId },
  fileTag: { type: String },
  fileName: { type: String },
  mimeType: { type: String },
  fileSize: { type: Number },
  createdAt: { type: Date, default: Date.now, index: true }
});

// Compound index to speed retrieval by chat and date
MessageSchema.index({ chatId: 1, createdAt: 1 });

export default mongoose.model('Message', MessageSchema);
