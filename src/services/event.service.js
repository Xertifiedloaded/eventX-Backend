const httpStatus = require('http-status');
const mongoose = require('mongoose');
const ApiError = require('../utils/ApiError');
const { Event, Booking } = require('../models');

const createEvent = async (eventBody) => {
  const event = await Event.create(eventBody);
  return event;
};

const queryEvents = async (filter = {}, options = {}) => {
  const page = Math.max(parseInt(options.page, 10) || 1, 1);
  const limit = Math.max(parseInt(options.limit, 10) || 10, 1);

  let sort = { createdAt: -1 };
  if (options.sortBy) {
    const [field, order] = options.sortBy.split(':');
    sort = { [field]: order === 'desc' ? -1 : 1 };
  }

  const skip = (page - 1) * limit;

  const [results, total] = await Promise.all([
    Event.find(filter).populate('organizer', 'name email').sort(sort).limit(limit).skip(skip).exec(),
    Event.countDocuments(filter).exec(),
  ]);

  return {
    results,
    page,
    limit,
    total,
    pages: Math.ceil(total / limit) || 0,
  };
};

const getEventById = async (eventId) => {
  return Event.findById(eventId).populate('organizer', 'name email').exec();
};

const updateEventById = async (eventId, updateBody) => {
  const event = await Event.findById(eventId);
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }
  Object.assign(event, updateBody);
  await event.save();
  return event;
};

const deleteEventById = async (eventId) => {
  const event = await Event.findByIdAndDelete(eventId);
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }
  return event;
};

const getEventsByCategory = async (category, options = {}) => {
  const filter = { category, visibility: 'public' };
  return queryEvents(filter, options);
};

const searchEvents = async (searchQuery, options = {}) => {
  const q = searchQuery || '';
  const filter = {
    $or: [
      { title: { $regex: q, $options: 'i' } },
      { description: { $regex: q, $options: 'i' } },
    ],
    visibility: 'public',
  };
  return queryEvents(filter, options);
};

const createBooking = async (bookingBody) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const event = await Event.findById(bookingBody.event).session(session);
    if (!event) {
      throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
    }

    const ticket = event.ticketTypes.find((t) => t.name === bookingBody.ticketType);
    if (!ticket) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ticket type');
    }

    if (ticket.quantity < bookingBody.quantity) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough tickets available');
    }
    const totalPrice = (ticket.price || 0) * bookingBody.quantity;
    ticket.quantity -= bookingBody.quantity;
    await event.save({ session });

    const bookingData = {
      event: bookingBody.event,
      user: bookingBody.user,
      ticketType: ticket.name,
      quantity: bookingBody.quantity,
      totalPrice,
      status: bookingBody.status || 'confirmed',
    };

    const [booking] = await Booking.create([bookingData], { session });

    await session.commitTransaction();
    session.endSession();

    return booking;
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
};

const getEventPayments = async (eventId) => {
  const bookings = await Booking.find({ event: eventId }).populate('user', 'name email').exec();
  const totalRevenue = bookings.reduce((sum, b) => sum + (b.totalPrice || 0), 0);
  return { bookings, totalRevenue };
};

module.exports = {
  createEvent,
  queryEvents,
  getEventById,
  updateEventById,
  deleteEventById,
  getEventsByCategory,
  searchEvents,
  createBooking,
  getEventPayments,
};