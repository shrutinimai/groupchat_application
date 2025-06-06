
const express = require('express');
const authenticateUser = require("../controllers/authenticateController");

const router = express.Router();

router.post("/signup",authenticateUser.signUp);
router.post("/login",authenticateUser.login);

module.exports = router;
