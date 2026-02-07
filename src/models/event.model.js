const mongoose = require('mongoose');
const { toJSON, paginate } = require('./plugins');

const eventSchema = mongoose.Schema(
  {
    organizer: {
      type: mongoose.SchemaTypes.ObjectId,
      ref: 'User',
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    description: {
      type: String,
      required: true,
    },

    category: {
      type: String,
      enum: ['music', 'sports', 'technology', 'business', 'arts', 'education', 'other'],
      required: true,
    },

    startDateTime: {
      type: Date,
      required: true,
    },

    endDateTime: {
      type: Date,
      required: true,
    },

    coverImage: {
      type: String,
      required: true,
    },

    venueName: {
      type: String,
      required: true,
    },

    isFreeEvent: {
      type: Boolean,
      default: false,
    },

    ticketTypes: [
      {
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        _id: false,
      },
    ],

    visibility: {
      type: String,
      enum: ['public', 'private'],
      default: 'public',
    },

    isOnlineEvent: {
      type: Boolean,
      default: false,
    },

    onlineEventLink: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

eventSchema.plugin(toJSON);
eventSchema.plugin(paginate);

const Event = mongoose.model('Event', eventSchema);

module.exports = Event;