/**
 * Request sanitization middleware
 * Strips script tags, HTML injection vectors, and protects against NoSQL query operator injections
 */
const sanitizeValue = (val) => {
  if (typeof val === 'string') {
    return val
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, (char) => (char === '<' ? '&lt;' : '&gt;'))
      .trim();
  }
  if (val !== null && typeof val === 'object') {
    const cleanObj = Array.isArray(val) ? [] : {};
    for (const key of Object.keys(val)) {
      // Prevent NoSQL operator manipulation (keys starting with $)
      if (!key.startsWith('$')) {
        cleanObj[key] = sanitizeValue(val[key]);
      }
    }
    return cleanObj;
  }
  return val;
};

const sanitizeInput = (req, res, next) => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeValue(req.params);
  }
  next();
};

module.exports = { sanitizeInput };
