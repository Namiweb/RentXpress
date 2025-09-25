import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema({
  notificationId: {
    type: String,
    required: true,
    unique: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'users',
    required: true
  },
  type: {
    type: String,
    required: true,
    enum: ['booking', 'payment', 'system', 'reminder']
  },
  priority: {
    type: String,
    required: true,
    enum: ['low', 'medium', 'high']
  },
  status: {
    type: String,
    required: true,
    enum: ['pending', 'delivered', 'failed']
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  channels: {
    email: {
      sent: Boolean,
      sentAt: Date
    },
    sms: {
      sent: Boolean,
      sentAt: Date
    },
    inApp: {
      read: Boolean,
      readAt: Date,
      actionUrl: String
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Notification", notificationSchema);
