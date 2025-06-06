const jwt = require("jsonwebtoken");

const authenticate = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader) return res.status(401).send('Access Denied');

    const token = authHeader.split(' ')[1]; 
    if (!token) return res.status(401).send('Access Denied');

    try {
        const verified = jwt.verify(token, 'secret'); 
        req.user = verified; 
        next();
    } catch (err) {
        res.status(400).send('Invalid Token');
    }
};

module.exports = authenticate;