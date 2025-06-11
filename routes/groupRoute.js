const express = require('express');
const groupControl = require("../controllers/groupController");
const authenticate = require("../middleware/auth");

const router = express.Router();

router.post("/groups", authenticate, groupControl.createGroup);
router.get("/groups", authenticate, groupControl.getGroups);
router.get("/groups/:group_id", authenticate, groupControl.getGroupDetails);
router.get("/groups/:group_id/members", authenticate, groupControl.getGroupMembers);
router.post("/groups/:group_id/join", authenticate, groupControl.joinGroup);
router.delete("/groups/:group_id/leave", authenticate, groupControl.leaveGroup);
router.get("/groups/:group_id/messages", authenticate, groupControl.getGroupMessages);
router.post("/groups/:group_id/messages", authenticate, groupControl.sendGroupMessage);
router.get("/groups/:group_id/users", authenticate, groupControl.getAllUsers);
router.post("/groups/:group_id/invite", authenticate, groupControl.inviteUserToGroup);
router.get("/groups/:group_id/admin", authenticate, groupControl.checkAdminStatus);
router.delete("/groups/:group_id/remove", authenticate, groupControl.removeUserFromGroup);
router.get("/invites/pending", authenticate, groupControl.getPendingInvites);
router.post("/groups/:group_id/invite/:invite_id/accept", authenticate, groupControl.acceptInvite);
router.post("/groups/:group_id/invite/:invite_id/reject", authenticate, groupControl.rejectInvite);

router.patch("/groups/:group_id/members/:user_id/make-admin", authenticate, groupControl.makeAdmin);
router.patch("/groups/:group_id/members/:user_id/remove-admin", authenticate, groupControl.removeAdmin);



module.exports = router;
