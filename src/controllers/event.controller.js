const httpStatus = require('http-status');
const catchAsync = require('../utils/catchAsync');
const { eventService } = require('../services');
const ApiError = require('../utils/ApiError');

const createEvent = catchAsync(async (req, res) => {
  const { 
    title, 
    description, 
    category, 
    startDateTime, 
    endDateTime, 
    venueName, 
    visibility, 
    isOnlineEvent, 
    onlineEventLink,
    isFreeEvent 
  } = req.body;
  
  if (!req.file) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cover image is required');
  }

  const coverImageUrl = req.file.path;

  let ticketTypes = [];
  
  if (isFreeEvent === true || isFreeEvent === 'true') {
    ticketTypes = [{ name: 'Free Pass', price: 0, quantity: 1000 }];
  } else {
    if (!req.body.ticketTypes) {
      throw new ApiError(httpStatus.BAD_REQUEST, 'Ticket types are required for paid events');
    }
    ticketTypes = JSON.parse(req.body.ticketTypes);
  }

  const eventData = {
    organizer: req.user.id,
    title,
    description,
    category,
    startDateTime,
    endDateTime,
    coverImage: coverImageUrl,
    venueName,
    ticketTypes,
    visibility,
    isOnlineEvent,
    onlineEventLink: isOnlineEvent ? onlineEventLink : null,
    isFreeEvent: isFreeEvent === true || isFreeEvent === 'true',
  };

  const event = await eventService.createEvent(eventData);
  res.status(httpStatus.CREATED).send(event);
});

const getEvents = catchAsync(async (req, res) => {
  const filter = { visibility: 'public' };
  const options = {
    sortBy: req.query.sortBy,
    limit: req.query.limit,
    page: req.query.page,
  };

  const result = await eventService.queryEvents(filter, options);
  res.send(result);
});

const getEventById = catchAsync(async (req, res) => {
  const event = await eventService.getEventById(req.params.eventId);
  
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }
  
  res.send(event);
});

const updateEvent = catchAsync(async (req, res) => {
  const event = await eventService.getEventById(req.params.eventId);
  
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const { isFreeEvent, ticketTypes } = req.body;

  let updateTicketTypes = event.ticketTypes;

  if (isFreeEvent !== undefined) {
    const isFree = isFreeEvent === true || isFreeEvent === 'true';
    
    if (isFree) {
      updateTicketTypes = [{ name: 'Free Pass', price: 0, quantity: 1000 }];
    } else if (ticketTypes) {
      updateTicketTypes = JSON.parse(ticketTypes);
    }
  } else if (ticketTypes) {
    updateTicketTypes = JSON.parse(ticketTypes);
  }

  let coverImage = event.coverImage;
  
  if (req.file) {
    coverImage = req.file.path;
  }

  const updateData = {
    ...req.body,
    coverImage,
    ticketTypes: updateTicketTypes,
    isFreeEvent: isFreeEvent === true || isFreeEvent === 'true',
  };

  const updatedEvent = await eventService.updateEventById(req.params.eventId, updateData);
  res.send(updatedEvent);
});

const deleteEvent = catchAsync(async (req, res) => {
  const event = await eventService.getEventById(req.params.eventId);
  
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  await eventService.deleteEventById(req.params.eventId);
  res.status(httpStatus.NO_CONTENT).send();
});

const getOrganizerEvents = catchAsync(async (req, res) => {
  const filter = { organizer: req.user.id };
  const options = {
    sortBy: req.query.sortBy,
    limit: req.query.limit,
    page: req.query.page,
  };

  const result = await eventService.queryEvents(filter, options);
  res.send(result);
});

const viewPayments = catchAsync(async (req, res) => {
  const event = await eventService.getEventById(req.params.eventId);
  
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  const payments = await eventService.getEventPayments(req.params.eventId);
  res.send(payments);
});

const buyTickets = catchAsync(async (req, res) => {
  const { ticketTypeIndex, quantity } = req.body;

  if (!ticketTypeIndex && ticketTypeIndex !== 0) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Ticket type is required');
  }

  if (!quantity || quantity < 1) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Quantity must be at least 1');
  }

  const event = await eventService.getEventById(req.params.eventId);
  
  if (!event) {
    throw new ApiError(httpStatus.NOT_FOUND, 'Event not found');
  }

  if (ticketTypeIndex >= event.ticketTypes.length) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid ticket type');
  }

  const ticketType = event.ticketTypes[ticketTypeIndex];

  if (ticketType.quantity < quantity) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Not enough tickets available');
  }

  const booking = await eventService.createBooking({
    event: req.params.eventId,
    user: req.user.id,
    ticketType: ticketType.name,
    quantity,
    totalPrice: ticketType.price * quantity,
  });

  res.status(httpStatus.CREATED).send(booking);
});

module.exports = {
  createEvent,
  getEvents,
  getEventById,
  updateEvent,
  deleteEvent,
  getOrganizerEvents,
  viewPayments,
  buyTickets,
};