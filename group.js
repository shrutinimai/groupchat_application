
document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    let CurrentUserId = localStorage.getItem("userId");

    console.log("Token retrieved:", token, CurrentUserId); // Log the token
    fetchPendingInvites() 
    let currentGroupId = null;
    let creatorId = null;
    let isAdmin = false; 

    if (!token) {
        console.error("No token found. User may not be logged in.");
        return;
    }

    await loadGroups(token);

    document.getElementById("createGroupForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const groupName = document.getElementById("groupNameInput").value;
        await createGroup(groupName, token);
        document.getElementById("groupNameInput").value = '';
    });

    document.getElementById("groupMessageForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const messageInput = document.getElementById("messageInput");
        const message = messageInput.value;
        //console.log("current group id ====", currentGroupId, message, token);
        await sendMessage(currentGroupId, message, token);
        messageInput.value = ''; 
    });


    async function loadGroups(token) {
        try {
            const response = await fetch("/api/groups", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to load groups:", errorText);
                return;
            }
            const groups = await response.json();
            renderGroups(groups);
        } catch (error) {
            console.error("Error loading groups:", error);
        }
    }


    function renderGroups(groups) {
        const groupList = document.getElementById("groupList");
        groupList.innerHTML = '';
        if (groups.length === 0) {
            const noGroupsMessage = document.createElement("div");
            noGroupsMessage.innerText = "You are not a member of any groups.";
            groupList.appendChild(noGroupsMessage);
            return;
        }
        groups.forEach(group => {
            const groupItem = document.createElement("div");
            groupItem.innerText = group.name;
            groupItem.classList.add("group-item");
            groupItem.dataset.groupId = group.id;
            groupItem.addEventListener("click", () => selectGroup(group.id, token));
            groupList.appendChild(groupItem);
        });
    }


    async function selectGroup(groupId, token) {
        //console.log("Selected group ID:", groupId);
        //console.log("Token:", token); //  Verify the token
        currentGroupId = groupId;
        //console.log("Current group ID:", currentGroupId);
        localStorage.setItem("currentGroupId",currentGroupId)
        socket.disconnect();
        socket.connect();
        socket.emit('joinGroup', currentGroupId);
        console.log("Joined group:", currentGroupId);
        
        await loadGroupMessages(groupId, token);
        await updateGroupName(groupId, token);
        await checkIfAdmin(groupId, token);
        const groupResponse = await fetch(`/api/groups/${groupId}`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        if (!groupResponse.ok) {
            const errorText = await groupResponse.text();
            console.error("Failed to fetch group:", errorText);
            return;
        }
        const group = await groupResponse.json();
        creatorId = group.creator_id; 
    }

    const socket = io('http://localhost:5500');
    socket.on('connect', () => {
        console.log('Connected to server');
        const currentGroupId = localStorage.getItem("currentGroupId")
        console.log(currentGroupId)
        socket.emit('joinGroup', currentGroupId);
        console.log("groupJoined")
        const messagesContainer = document.getElementById("groupMessages");
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
        
    });

    socket.on('newMessage', (newMessage) => {
        console.log("newMessage:", newMessage);
        const currentGroupId = localStorage.getItem("currentGroupId");
        if (parseInt(newMessage.groupId)===parseInt(currentGroupId)) {
            displayMessage(newMessage)
            const messagesContainer = document.getElementById("groupMessages");
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });

    socket.on('groupUpdate', (data) => {
        currentGroupId = localStorage.getItem("currentGroupId");
        if (data.groupId === currentGroupId) {
            updateGroupName(currentGroupId, token);
            checkIfAdmin(currentGroupId, token);
        }
    });

    async function loadGroupMessages(groupId, token) {
        try {
            const response = await fetch(`/api/groups/${groupId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.json();
                console.error("Failed to load messages:", errorText);
                return;
            }
            const messages = await response.json();
            displayMessages(messages);

        } catch (error) {
            console.error("Error loading group messages:", error);
        }
    }


    async function createGroup(groupName, token) {
        try {
            const response = await fetch('/api/groups', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ name: groupName })
            });
            if (response.ok) {
                await loadGroups(token); 
            } else {
                const errorText = await response.text();
                console.error("Failed to create group:", errorText);
            }
        } catch (error) {
            console.error("Error creating group:", error);
        }
    }


    async function sendMessage(groupId, message, token) {
        try {
            if (!groupId || !message) {
                alert("Invalid request");
                return;
            }
            const userId = parseInt(localStorage.getItem("userId"));
            const ans = socket.emit('sendMessage', { groupId, message, userId });
            document.getElementById("messageInput").value = '';
        } catch (error) {
            alert("Error sending message. Please try again."); 
            console.error("Error sending message:", error);
        }
    }


    async function updateGroupName(groupId, token) {
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to fetch group name:", errorText);
                const groupNameElement = document.getElementById("groupName");
                if (groupNameElement) {
                    groupNameElement.innerText = "Group not found";
                }
                return;
            }
            const group = await response.json();
            const groupNameElement = document.getElementById("groupName");
            groupNameElement.innerText = group.name;
        } catch (error) {
            console.error("Error fetching group name:", error);
            const groupNameElement = document.getElementById("groupName");
            if (groupNameElement) {
                groupNameElement.innerText = "Error fetching group name";
            }
        }
    }


    async function checkIfAdmin(groupId, token) {
        try {
            const response = await fetch(`/api/groups/${groupId}/admin`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                
                const { isAdmin } = await response.json();
                document.getElementById("addAdminButton").style.display = isAdmin ? 'block' : 'none';
                document.getElementById("addGroupMemberButton").style.display = isAdmin ? 'block' : 'none';
                document.getElementById("deleteGroupMemberButton").style.display = isAdmin ? 'block' : 'none';
                document.getElementById("leaveGroupButton").style.display = isAdmin ? 'none' : 'block';
            } else {
                console.error("Failed to check admin status");
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
        }
    }

    function displayMessages(messages) {
        if (Array.isArray(messages)) {
            messages.forEach(message => {
                displayMessage(message);
            });
        } else {
            displayMessage(messages);
        }
    }
    
    function displayMessage(message) {
        const messagesContainer = document.getElementById("groupMessages");
        const messageItem = document.createElement("div");
        if (message.userId === parseInt(localStorage.getItem("userId"))) {
            messageItem.classList.add("current-user");
            messageItem.style.textAlign = "right";
        } else {
            messageItem.classList.add("other-user");
            messageItem.style.textAlign = "left";
        }
        messageItem.innerText = `${message.name}: ${message.message}`;
        messagesContainer.appendChild(messageItem);
        messagesContainer.scrollTop = messagesContainer.scrollHeight; // Scroll to the bottom
    }

    async function addinviteToGroup(group_id,invite_id, action) {
        try {
            let endpoint;
            if (action === "accept") {
                endpoint = `/api/groups/${group_id}/invite/${invite_id}/accept`; // Endpoint for accepting invite
            } else if (action === "reject") {
                endpoint = `/api/groups/${group_id}/invite/${invite_id}/reject`; // Endpoint for rejecting invite
            } else {
                throw new Error("Invalid action");
            }
    
            const response = await fetch(endpoint, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ id: invite_id }) // Pass the invite ID
            });
    
            const result = await response.json();
            alert(result); // Show the result
        } catch (error) {
            console.error(`Error ${action === "accept" ? "accepting" : "rejecting"} invite:`, error);
            alert(`Error ${action === "accept" ? "accepting" : "rejecting"} invite. Please try again.`);
        }
        loadGroups(token)
    }

    async function fetchPendingInvites() {
        try {
            const response = await fetch("/api/invites/pending", {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to fetch pending invites:", errorText);
                return;
            }
            const invites = await response.json();
            showInviteAlerts(invites); // Show alerts for pending invites
        } catch (error) {
            console.error("Error fetching pending invites:", error);
        }
    }
    
    function showInviteAlerts(invites) {
        invites.forEach(invite => {
            if (invite.group) {
                const alertMessage = `You have been invited to join the group: ${invite.group.name}. Do you accept?`;
                const userResponse = confirm(alertMessage); // Show a confirmation dialog
                console.log("User response:", invite.id,invite.user_id, userResponse); // Debugging: Log user response
                if (userResponse) {
                    addinviteToGroup(invite.group.id,invite.id, "accept"); // Call function to accept the invite
                } else {
                    addinviteToGroup(invite.group.id,invite.id, "reject"); // Call function to reject the invite
                }
            } else {
                console.error("Group not found for invite:", invite);
            }
        });    
    }

    async function sendInviteToUser (user_id) {
        try {
            const response = await fetch(`/api/groups/${currentGroupId}/invite`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_id }) // Pass the user ID
            });
    
            const result = await response.json();
            alert(result); // Show the result
        } catch (error) {
            console.error("Error sending invite:", error);
            alert("Error sending invite. Please try again.");
        }
    }
    async function removeUserFromGroup(userId) {
        try {
            const response = await fetch(`/api/groups/${currentGroupId}/remove`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_id: userId })
            });
            const result = await response.json();
            alert("Removed User sussessfully"); // Show the result
            document.getElementById("deleteGroupMemberButton").click();
        } catch (error) {
            console.error("Error removing user from group:", error);
            alert("Error removing user from group. Please try again.");
        }
    }

 
    document.getElementById("addGroupMemberButton").addEventListener("click", async () => {
        try {
            // Fetch all users
            const usersResponse = await fetch(`/api/groups/${currentGroupId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!usersResponse.ok) {
                const errorText = await usersResponse.text();
                console.error("Failed to fetch users:", errorText);
                return;
            }
            const users = await usersResponse.json();
            const membersResponse = await fetch(`/api/groups/${currentGroupId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!membersResponse.ok) {
                const errorText = await membersResponse.text();
                console.error("Failed to fetch group members:", errorText);
                return;
            }
            const members = await membersResponse.json();
            const memberIds = members.map(member => member.user_id);
            const usersNotInGroup = users.filter(user => !memberIds.includes(user.id));
            renderUserList(usersNotInGroup, "Add");

            document.getElementById("modalTitle").textContent = "Add Group Members";
            const modal = document.getElementById("addMemberModal");
            modal.style.display = "block"; 
            console.log("Modal should be visible now"); 
        } catch (error) {
            console.error("Error fetching users or group members:", error);
        }
    });

    async function getGroupMembers() {
        try {
            // Fetch all group members
            const membersResponse = await fetch(`/api/groups/${currentGroupId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!membersResponse.ok) {
                const errorText = await membersResponse.text();
                console.error("Failed to fetch group members:", errorText);
                return;
            }
            const members = await membersResponse.json();
            //console.log("members ====", members);
            // Fetch all users
            const usersResponse = await fetch(`/api/groups/${currentGroupId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!usersResponse.ok) {
                const errorText = await usersResponse.text();
                console.error("Failed to fetch users:", errorText);
                return;
            }
            const users = await usersResponse.json();
    
            // Filter users to only include those who are also group members
            const usersInGroup = users.filter(user => members.some(member => member.user_id === user.id));
    
            return usersInGroup;
        } catch (error) {
            console.error("Error fetching group members or users:", error);
        }
    }


    document.getElementById("deleteGroupMemberButton").addEventListener("click", async () => {
        try {
            const usersInGroup = await getGroupMembers();
            renderUserList(usersInGroup, "Remove");
            document.getElementById("modalTitle").textContent = "Delete Group Members";

            const modal = document.getElementById("addMemberModal");
            modal.style.display = "block";
        } catch (error) {
            console.error("Error fetching group members:", error);
        }
    });
    

    function renderUserList(users, buttonType) {
        const userList = document.getElementById("userList");
        userList.innerHTML = ""; 
    
        users.forEach(user => {
            const userItem = document.createElement("li");
            userItem.textContent = user.name; 
            const button = document.createElement("button");
            if (user.id === creatorId) {
                button.textContent = "Creator";
                userItem.appendChild(button); 
                userList.appendChild(userItem);
                return;
            }
            button.textContent = buttonType;
            button.onclick = async () => {
                if (buttonType === "Add") {
                    await sendInviteToUser(user.id); 
                } else {
                    await removeUserFromGroup(user.id); 
                }
                document.getElementById(buttonType === "Add" ? "addGroupMemberButton" : "deleteGroupMemberButton").click();
            };
    
            userItem.appendChild(button); 
            userList.appendChild(userItem);
        });
    }

    document.getElementById("closeModal").addEventListener("click", () => {
        const modal = document.getElementById("addMemberModal");
        modal.style.display = "none"; 
    });
    const leaveGroupButton = document.getElementById("leaveGroupButton");
    if (leaveGroupButton) {
        leaveGroupButton.addEventListener("click", async () => {
            try {
                const response = await fetch(`/api/groups/${currentGroupId}/leave`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                const result = await response.json();
                alert(result); // Show the result

                window.location.href = "/group.html"; 
            } catch (error) {
                console.error("Error leaving group:", error);
                alert("Error leaving group. Please try again.");
            }
        });
    }
    // Add event listener to the addAdminButton
    document.getElementById("addAdminButton").addEventListener("click", async () => {
        try {
            const membersResponse = await fetch(`/api/groups/${currentGroupId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!membersResponse.ok) {
                const errorText = await membersResponse.text();
                console.error("Failed to fetch group members:", errorText);
                return;
            }
            const members = await membersResponse.json();
    
            const usersResponse = await fetch(`/api/groups/${currentGroupId}/users`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!usersResponse.ok) {
                const errorText = await usersResponse.text();
                console.error("Failed to fetch users:", errorText);
                return;
            }
            const users = await usersResponse.json();
    
            // Filter users to only include those who are also group members
            const usersInGroup = users.filter(user => members.some(member => member.user_id === user.id));
    
            // Render the admin list
            renderAdminList(usersInGroup, members);
        } catch (error) {
            console.error("Error fetching group members or users:", error);
        }
    });

// Function to render the user list with make admin or remove admin buttons
function renderAdminList(usersInGroup,members) {
    const userList = document.getElementById("userList");
    userList.innerHTML = ""; // Clear existing users
    
    
    usersInGroup.forEach(user => {
        const userItem = document.createElement("li");
        userItem.textContent = user.name; // Display user name
        console.log("user id ====", user);
        // Skip the creator
        if (user.id === creatorId) {
            const creatorButton = document.createElement("button");
            creatorButton.textContent = "Creator";
            creatorButton.disabled = true; // Disable the button for the creator
            userItem.appendChild(creatorButton);
            userList.appendChild(userItem);
            return;
        }
        const member = members.find(member => member.user_id === user.id);

        // Check if the user is already an admin
        const isAdmin = member ? member.isAdmin : false;

        // Create make admin or remove admin button
        const button = document.createElement("button");
        button.classList.add("adminButton");
        if (isAdmin) {
            button.textContent = "Remove Admin";
            button.onclick = async () => {
                await removeAdmin(user.id);
                document.getElementById("addAdminButton").click();
            };
        } else {
            button.textContent = "Make Admin";
            button.onclick = async () => {
                await makeAdmin(user.id);
                document.getElementById("addAdminButton").click();
            };
        }

        userItem.appendChild(button); // Add button to user item
        userList.appendChild(userItem); // Add user item to user list
    });

    // Show the modal
    document.getElementById("modalTitle").textContent = "Manage Admins";
    const modal = document.getElementById("addMemberModal");
    modal.style.display = "block"; // Show the modal
}

// Function to make a user an admin
async function makeAdmin(userId) {
    try {
        const response = await fetch(`/api/groups/${currentGroupId}/members/${userId}/make-admin`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        alert(result); // Show the result
    } catch (error) {
        console.error("Error making user an admin:", error);
        alert("Error making user an admin. Please try again.");
    }
}

// Function to remove a user's admin status
async function removeAdmin(userId) {
    try {
        const response = await fetch(`/api/groups/${currentGroupId}/members/${userId}/remove-admin`, {
            method: "PATCH",
            headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "application/json"
            }
        });
        const result = await response.json();
        alert(result); // Show the result
    } catch (error) {
        console.error("Error removing user's admin status:", error);
        alert("Error removing user's admin status. Please try again.");
    }
}
});