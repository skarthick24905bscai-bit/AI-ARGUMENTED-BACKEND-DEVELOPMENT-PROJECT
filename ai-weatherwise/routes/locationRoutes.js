const express = require('express');
const router = express.Router();
const {
  getLocations,
  addLocation,
  deleteLocation,
} = require('../controllers/locationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.get('/', getLocations);
router.post('/', addLocation);
router.delete('/:id', deleteLocation);

module.exports = router;
