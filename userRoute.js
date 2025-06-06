
const express = require('express');
const authenticateUser = require("../controllers/authenticationControllers");

const router = express.Router();

router.post("/signup",authenticateUser.signUp);
router.post("/login",authenticateUser.login);

module.exports = router;
