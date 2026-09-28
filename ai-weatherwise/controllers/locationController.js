const Location = require('../models/Location');
const { isMongoConnected } = require('../config/db');
const { store, generateId } = require('../config/fallbackStore');

// @desc    Get current user's favorite locations
// @route   GET /api/locations
// @access  Private
const getLocations = async (req, res, next) => {
  try {
    const userId = req.user._id;

    if (isMongoConnected()) {
      const locations = await Location.find({ user: userId }).sort({ createdAt: -1 });
      return res.status(200).json({
        success: true,
        count: locations.length,
        data: locations,
      });
    } else {
      const locations = store.locations.filter((loc) => String(loc.user) === String(userId));
      return res.status(200).json({
        success: true,
        count: locations.length,
        data: locations,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Add a new favorite location
// @route   POST /api/locations
// @access  Private
const addLocation = async (req, res, next) => {
  try {
    const { city, country } = req.body;
    const userId = req.user._id;

    if (!city || !city.trim()) {
      return res.status(400).json({
        success: false,
        message: 'City name is required',
      });
    }

    const cleanCity = city.trim();
    const cleanCountry = (country || 'Global').trim();

    if (isMongoConnected()) {
      // Check for duplicate for this user
      const existing = await Location.findOne({
        user: userId,
        city: { $regex: new RegExp(`^${cleanCity}$`, 'i') },
      });

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `${cleanCity} is already in your favorite locations list`,
        });
      }

      const location = await Location.create({
        user: userId,
        city: cleanCity,
        country: cleanCountry,
      });

      return res.status(201).json({
        success: true,
        message: 'Favorite location saved successfully',
        data: location,
      });
    } else {
      const existing = store.locations.find(
        (l) => String(l.user) === String(userId) && l.city.toLowerCase() === cleanCity.toLowerCase()
      );

      if (existing) {
        return res.status(400).json({
          success: false,
          message: `${cleanCity} is already in your favorite locations list`,
        });
      }

      const newLocation = {
        _id: generateId(),
        user: userId,
        city: cleanCity,
        country: cleanCountry,
        createdAt: new Date(),
      };

      store.locations.push(newLocation);

      return res.status(201).json({
        success: true,
        message: 'Favorite location saved successfully',
        data: newLocation,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete a favorite location
// @route   DELETE /api/locations/:id
// @access  Private
const deleteLocation = async (req, res, next) => {
  try {
    const locationId = req.params.id;
    const userId = req.user._id;

    if (isMongoConnected()) {
      const location = await Location.findById(locationId);

      if (!location) {
        return res.status(404).json({
          success: false,
          message: 'Location not found',
        });
      }

      // Check ownership
      if (String(location.user) !== String(userId) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this favorite location',
        });
      }

      await Location.findByIdAndDelete(locationId);

      return res.status(200).json({
        success: true,
        message: 'Favorite location removed successfully',
      });
    } else {
      const locIndex = store.locations.findIndex((l) => String(l._id) === String(locationId));

      if (locIndex === -1) {
        return res.status(404).json({
          success: false,
          message: 'Location not found',
        });
      }

      if (String(store.locations[locIndex].user) !== String(userId) && req.user.role !== 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Not authorized to delete this favorite location',
        });
      }

      store.locations.splice(locIndex, 1);

      return res.status(200).json({
        success: true,
        message: 'Favorite location removed successfully',
      });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getLocations,
  addLocation,
  deleteLocation,
};
