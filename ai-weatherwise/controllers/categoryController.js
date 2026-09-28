const Category = require('../models/Category');
const { isMongoConnected } = require('../config/db');
const { store, generateId } = require('../config/fallbackStore');

const slugify = (text) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
};

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res, next) => {
  try {
    if (isMongoConnected()) {
      const categories = await Category.find({}).sort({ name: 1 });
      return res.status(200).json({
        success: true,
        count: categories.length,
        data: categories,
      });
    } else {
      return res.status(200).json({
        success: true,
        count: store.categories.length,
        data: store.categories,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res, next) => {
  try {
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const cleanName = name.trim();
    const slug = slugify(cleanName);

    if (isMongoConnected()) {
      const exists = await Category.findOne({
        $or: [{ name: cleanName }, { slug }],
      });

      if (exists) {
        return res.status(400).json({ success: false, message: 'A category with this name already exists' });
      }

      const category = await Category.create({
        name: cleanName,
        slug,
        description: (description || '').trim(),
      });

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: category,
      });
    } else {
      const exists = store.categories.find(
        (c) => c.name.toLowerCase() === cleanName.toLowerCase() || c.slug === slug
      );

      if (exists) {
        return res.status(400).json({ success: false, message: 'A category with this name already exists' });
      }

      const newCat = {
        _id: generateId(),
        name: cleanName,
        slug,
        description: (description || '').trim(),
        createdAt: new Date(),
      };

      store.categories.push(newCat);

      return res.status(201).json({
        success: true,
        message: 'Category created successfully',
        data: newCat,
      });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res, next) => {
  try {
    const catId = req.params.id;
    const { name, description } = req.body;

    if (isMongoConnected()) {
      const category = await Category.findById(catId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      if (name) {
        category.name = name.trim();
        category.slug = slugify(name.trim());
      }
      if (description !== undefined) {
        category.description = description.trim();
      }

      await category.save();
      return res.status(200).json({ success: true, message: 'Category updated successfully', data: category });
    } else {
      const cat = store.categories.find((c) => String(c._id) === String(catId));
      if (!cat) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      if (name) {
        cat.name = name.trim();
        cat.slug = slugify(name.trim());
      }
      if (description !== undefined) {
        cat.description = description.trim();
      }

      return res.status(200).json({ success: true, message: 'Category updated successfully', data: cat });
    }
  } catch (error) {
    next(error);
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res, next) => {
  try {
    const catId = req.params.id;

    if (isMongoConnected()) {
      const category = await Category.findById(catId);
      if (!category) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      await Category.findByIdAndDelete(catId);
      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    } else {
      const catIndex = store.categories.findIndex((c) => String(c._id) === String(catId));
      if (catIndex === -1) {
        return res.status(404).json({ success: false, message: 'Category not found' });
      }

      store.categories.splice(catIndex, 1);
      return res.status(200).json({ success: true, message: 'Category deleted successfully' });
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
};
