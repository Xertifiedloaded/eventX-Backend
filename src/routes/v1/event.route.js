const express = require('express');

const eventController = require('../../controllers/event.controller');
const auth = require('../../middlewares/auth');
const upload = require('../../config/multer');

const router = express.Router();
router.post('/', auth(), upload.single('coverImage'), eventController.createEvent);
router.get('/', eventController.getEvents);
router.get('/:eventId', eventController.getEventById);
router.patch('/:eventId', auth(), upload.single('coverImage'), eventController.updateEvent);
router.delete('/:eventId', auth(), eventController.deleteEvent);
router.get('/my-events', auth(), eventController.getOrganizerEvents);

module.exports = router;