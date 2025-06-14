// routes/groupRoutes.js
const express = require('express');
const groupControl = require("../controllers/groupController");
const authenticate = require("../middleware/auth");
const { upload } = require('../middleware/uploadMiddleware'); // <-- Notice the curly braces { }
console.log("Group Routes file loaded successfully!"); // <--- ADD THIS LINE

const router = express.Router();

// User and Group Management (CORE GROUP ROUTES)
router.post("/groups", authenticate, groupControl.createGroup);
router.get("/groups", authenticate, groupControl.getGroups);
router.get("/groups/:group_id", authenticate, groupControl.getGroupDetails);
router.get("/groups/:group_id/members", authenticate, groupControl.getGroupMembers);
router.post("/groups/:group_id/join", authenticate, groupControl.joinGroup);
router.delete("/groups/:group_id/leave", authenticate, groupControl.leaveGroup);
router.get("/groups/:group_id/admin", authenticate, groupControl.checkAdminStatus);
router.delete("/groups/:group_id/remove", authenticate, groupControl.removeUserFromGroup);
router.patch("/groups/:group_id/members/:user_id/make-admin", authenticate, groupControl.makeAdmin);
router.patch("/groups/:group_id/members/:user_id/remove-admin", authenticate, groupControl.removeAdmin);

// Group Messaging
router.get("/groups/:group_id/messages", authenticate, groupControl.getGroupMessages);
router.post("/groups/:group_id/messages", authenticate, groupControl.sendGroupMessage);

// File Upload within a Group
router.post("/groups/:groupId/upload-file", authenticate, upload.single('file'), groupControl.uploadFile);

// New route for fetching ALL users (expected by current group.js for 'Add Members')
router.get("/users", authenticate, groupControl.getAllUsers);

// Re-adding the route for fetching users within a specific group context (as you had it)
router.get("/groups/:group_id/users", authenticate, groupControl.getAllUsers);


// routes/groupRoute.js (add this line)
router.get("/groups/:group_id/files/:fileKey", authenticate, groupControl.getSignedUrlForFile);

module.exports = router;
