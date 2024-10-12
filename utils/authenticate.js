const jwt = require('jsonwebtoken');

// Check authentication
const authenticate = (req) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    throw new Error('Authorization header is required');
  }

  const token = authHeader.replace('Bearer ', '');

  // const { userId } = jwt.verify(token, 'temporary_secret');
  
  // return userId;

  try {
    const { userId } = jwt.verify(token, 'temporary_secret');
    return userId;
  } catch (err) {
    throw new Error('Invalid or expired authroization token');
  }
};

module.exports = authenticate;