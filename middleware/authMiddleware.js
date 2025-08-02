import { verifyAccessToken } from '../services/jwtService.js';

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
   
  if (!authHeader || !authHeader.startsWith('Bearer '))
    return res.status(401).json({ message: 'Access denied. No token provided.' });

  const token = authHeader.split(' ')[1];

  try {
    const decoded = verifyAccessToken(token);

    req.user = decoded;
    next();
  } catch (err) {
     console.log(err)
    return res.status(403).json({ message: 'Session expired please login again.' });
  }
};

export default authenticate;
