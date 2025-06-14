// routes/inviteRoutes.js
const express = require('express');
const inviteControl = require("../controllers/inviteController"); // Import your inviteController
const authenticate = require("../middleware/auth"); // Your authentication middleware

const router = express.Router();

// Invite Management Routes
router.get("/pending", authenticate, inviteControl.getPendingInvites); // Get pending invites for a user
router.post("/:invite_id/accept", authenticate, inviteControl.acceptInvite); // Accept an invite
router.post("/:invite_id/reject", authenticate, inviteControl.rejectInvite); // Reject an invite

// A specific route for inviting a user TO a group, handled by inviteController
router.post("/groups/:group_id/invite", authenticate, inviteControl.sendInviteToUser);

module.exports = router;
