

document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    const CurrentUserId = parseInt(localStorage.getItem("userId")); 

    console.log("Token retrieved:", token, "CurrentUserId:", CurrentUserId); 

    const fileInput = document.getElementById('fileInput');
    const attachFileBtn = document.getElementById('attachFileBtn');
    const sendFileBtn = document.getElementById('sendFileBtn');
    const sendTextBtn = document.getElementById('sendTextBtn');
    const messageInput = document.getElementById('messageInput');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const messagesContainer = document.getElementById("groupMessages");
    const addMemberModal = document.getElementById("addMemberModal"); 
    const modalTitle = document.getElementById("modalTitle"); 
    const userListInModal = document.getElementById("userList"); 
    const invitationAlertModal = document.getElementById("invitationAlertModal"); 
    const invitationMessage = document.getElementById("invitationMessage");
    const acceptInvitationBtn = document.getElementById("acceptInvitation");
    const rejectInvitationBtn = document.getElementById("rejectInvitation");


    let selectedFile = null; 
    let currentGroupId = null; 
    let creatorId = null; 

    const socket = io('http://localhost:5500'); 

    if (!token) {
        console.error("No token found. User may not be logged in. Redirecting to login...");
        window.location.href = "/login"; 
        return; 
    }

    await loadGroups(token);
    fetchPendingInvites(); 

    socket.on('connect', () => {
        console.log('Connected to server via Socket.IO');
        const storedGroupId = localStorage.getItem("currentGroupId");
        if (storedGroupId) { 
            socket.emit('joinGroup', parseInt(storedGroupId));
            console.log("Re-joined stored group via socket:", storedGroupId);
        }
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server via Socket.IO');
    });

    socket.on('newMessage', (newMessage) => {
        console.log("Received newMessage:", newMessage);
        const currentGroupIdFromStorage = parseInt(localStorage.getItem("currentGroupId"));
        if (parseInt(newMessage.groupId) === currentGroupIdFromStorage) {
            displayMessage(newMessage);
            if (messagesContainer.scrollHeight - messagesContainer.scrollTop <= messagesContainer.clientHeight + 50) { 
                messagesContainer.scrollTop = messagesContainer.scrollHeight;
            }
        }
    });

    socket.on('groupUpdate', (data) => {
        const currentGroupIdFromStorage = localStorage.getItem("currentGroupId");
        if (data.groupId === currentGroupIdFromStorage) {
            updateGroupName(currentGroupIdFromStorage, token);
            checkIfAdmin(currentGroupIdFromStorage, token);
        }
    });


    document.getElementById("createGroupForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const groupName = document.getElementById("groupNameInput").value.trim();
        if (groupName) {
            await createGroup(groupName, token);
            document.getElementById("groupNameInput").value = ''; 
        } else {
            alert("Group name cannot be empty.");
        }
    });

    document.getElementById("groupMessageForm").addEventListener("submit", async (event) => {
        event.preventDefault();
        const message = messageInput.value.trim();

        if (message && currentGroupId) {
            await sendMessage(currentGroupId, message, token); 
            messageInput.value = ''; 
        } else if (!currentGroupId) {
            alert("Please select a group to send a message.");
        } else {
            alert("Message cannot be empty.");
        }
    });

    attachFileBtn.addEventListener('click', () => {
        fileInput.click(); 
    });

    fileInput.addEventListener('change', (event) => {
        selectedFile = event.target.files[0];
        if (selectedFile) {
            fileNameDisplay.textContent = `Selected: ${selectedFile.name}`;
            sendFileBtn.style.display = 'inline-block'; 
            sendTextBtn.style.display = 'none'; 
            messageInput.placeholder = "Add caption (optional)"; 
            messageInput.required = false; 
        } else {
            fileNameDisplay.textContent = '';
            sendFileBtn.style.display = 'none';
            sendTextBtn.style.display = 'inline-block';
            messageInput.placeholder = "Type your message...";
            messageInput.required = true;
        }
    });

    sendFileBtn.addEventListener('click', async () => {
        if (selectedFile && currentGroupId) {
            const caption = messageInput.value.trim() || null; 
            await sendFile(currentGroupId, selectedFile, caption, token); 
            
            selectedFile = null;
            fileInput.value = ''; 
            fileNameDisplay.textContent = '';
            sendFileBtn.style.display = 'none';
            sendTextBtn.style.display = 'inline-block'; 
            messageInput.value = ''; 
            messageInput.placeholder = "Type your message...";
            messageInput.required = true;
        } else if (!currentGroupId) {
            alert("Please select a group to send the file.");
        } else {
            alert("Please select a file first.");
        }
    });

    document.getElementById("closeModal").addEventListener("click", () => {
        addMemberModal.style.display = "none";
    });

    const leaveGroupButton = document.getElementById("leaveGroupButton");
    if (leaveGroupButton) {
        leaveGroupButton.addEventListener("click", async () => {
            if (!currentGroupId) {
                alert("Please select a group to leave.");
                return;
            }
            try {
                const response = await fetch(`/api/groups/${currentGroupId}/leave`, {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                });

                let result;
                try {
                    result = await response.json();
                } catch (e) {
                    result = { message: await response.text() || 'An unknown error occurred.' };
                }

                if (response.ok) { 
                    alert(result.message || "Successfully left the group.");
                    localStorage.removeItem("currentGroupId"); 
                    window.location.href = "/group"; 
                } else {
                    console.error("Failed to leave group:", result.message);
                    alert(`Failed to leave group: ${result.message}`);
                }
            } catch (error) {
                console.error("Network error leaving group:", error);
                alert("A network error occurred while leaving the group. Please try again.");
            }
        });
    }

    document.getElementById("addAdminButton").addEventListener("click", async () => {
        if (!currentGroupId) {
            alert("Please select a group to manage admins.");
            return;
        }
        await fetchAndRenderModalUsers("Admin"); 
    });

    document.getElementById("addGroupMemberButton").addEventListener("click", async () => {
        if (!currentGroupId) {
            alert("Please select a group to add members to.");
            return;
        }
        await fetchAndRenderModalUsers("Add"); 
    });

    document.getElementById("deleteGroupMemberButton").addEventListener("click", async () => {
        if (!currentGroupId) {
            alert("Please select a group to remove members from.");
            return;
        }
        await fetchAndRenderModalUsers("Remove"); 
    });


    async function loadGroups(token) {
        try {
            const response = await fetch("/api/groups", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to load groups:", errorText);
                alert(`Failed to load groups: ${errorText}`);
                return;
            }
            const groups = await response.json();
            renderGroups(groups);
        } catch (error) {
            console.error("Error loading groups:", error);
            alert("Error loading groups. Please try again.");
        }
    }

    function renderGroups(groups) {
        const groupList = document.getElementById("groupList");
        groupList.innerHTML = ''; 
        if (groups.length === 0) {
            const noGroupsMessage = document.createElement("div");
            noGroupsMessage.innerText = "You are not a member of any groups.";
            noGroupsMessage.classList.add("text-gray-500", "p-4", "text-center"); 
            groupList.appendChild(noGroupsMessage);
            return;
        }
        groups.forEach(group => {
            const groupItem = document.createElement("div");
            groupItem.innerText = group.name;
            groupItem.classList.add("group-item", "cursor-pointer", "p-2", "hover:bg-blue-600", "rounded-md", "mb-1"); 
            groupItem.dataset.groupId = group.id;
            groupItem.addEventListener("click", () => selectGroup(group.id, token));
            groupList.appendChild(groupItem);
        });
    }

    async function selectGroup(groupId, token) {
        currentGroupId = groupId;
        localStorage.setItem("currentGroupId", currentGroupId);
        
        if (socket.connected) {
            socket.emit('joinGroup', currentGroupId);
            console.log("Joined group via socket:", currentGroupId);
        } else {
            socket.connect(); 
            const onConnectHandler = () => {
                socket.emit('joinGroup', currentGroupId);
                console.log("Connected and joined group via socket:", currentGroupId);
                socket.off('connect', onConnectHandler); 
            };
            socket.on('connect', onConnectHandler);
        }

        await loadGroupMessages(groupId, token); 
        await updateGroupName(groupId, token);
        await checkIfAdmin(groupId, token); 
        
        try {
            const groupResponse = await fetch(`/api/groups/${groupId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!groupResponse.ok) {
                const errorText = await groupResponse.text();
                console.error("Failed to fetch group details:", errorText);
                alert(`Failed to fetch group details: ${errorText}`);
                return;
            }
            const group = await groupResponse.json();
            creatorId = group.creator_id; 
        } catch (error) {
            console.error("Error fetching group details:", error);
            alert("Error fetching group details. Please try again.");
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
                alert('Group created successfully!'); 
                await loadGroups(token); 
            } else {
                const errorText = await response.text();
                console.error("Failed to create group:", errorText);
                alert(`Failed to create group: ${errorText}`);
            }
        } catch (error) {
            console.error("Error creating group:", error);
            alert("Error creating group. Please try again.");
        }
    }

    async function sendMessage(groupId, message, token) {
        try {
            if (!groupId || !message) {
                alert("Invalid request: Group or message missing.");
                return;
            }
            const userId = CurrentUserId; 
            socket.emit('sendMessage', { groupId: parseInt(groupId), message, userId }); 
        } catch (error) {
            alert("Error sending message. Please try again.");
            console.error("Error sending message:", error);
        }
    }

    async function sendFile(groupId, file, caption, token) {
        try {
            if (!groupId) {
                alert("Please select a group to send the file.");
                return;
            }
            if (!file) {
                alert("No file selected.");
                return;
            }

            const formData = new FormData();
            formData.append('file', file); 
            formData.append('groupId', groupId);
            formData.append('userId', CurrentUserId); 
            if (caption) {
                formData.append('message', caption); 
            }

            const response = await fetch(`/api/groups/${groupId}/upload-file`, { 
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                },
                body: formData
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to upload file:", errorText);
                alert(`Failed to upload file: ${errorText}`);
                return;
            }

            const result = await response.json();
            console.log("File uploaded successfully:", result);
        } catch (error) {
            console.error("Error sending file:", error);
            alert("Error sending file. Please try again.");
        }
    }

    async function updateGroupName(groupId, token) {
        try {
            const response = await fetch(`/api/groups/${groupId}`, {
                headers: { 'Authorization': `Bearer ${token}` }
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
            if (groupNameElement) {
                groupNameElement.innerText = group.name;
            }
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
                const { isAdmin: fetchedIsAdmin } = await response.json(); 
                
                const addAdminButton = document.getElementById("addAdminButton");
                const addGroupMemberButton = document.getElementById("addGroupMemberButton");
                const deleteGroupMemberButton = document.getElementById("deleteGroupMemberButton");
                const leaveGroupButton = document.getElementById("leaveGroupButton");

                if (addAdminButton) addAdminButton.style.display = fetchedIsAdmin ? 'block' : 'none';
                if (addGroupMemberButton) addGroupMemberButton.style.display = fetchedIsAdmin ? 'block' : 'none';
                if (deleteGroupMemberButton) deleteGroupMemberButton.style.display = fetchedIsAdmin ? 'block' : 'none';
                
                const groupDetailsResponse = await fetch(`/api/groups/${groupId}`, { headers: { Authorization: `Bearer ${token}` } });
                if (groupDetailsResponse.ok) {
                    const groupDetails = await groupDetailsResponse.json();
                    if (leaveGroupButton) {
                        if (groupDetails.creator_id === CurrentUserId) { 
                            leaveGroupButton.style.display = 'none'; 
                        } else {
                            leaveGroupButton.style.display = 'block'; 
                        }
                    }
                } else {
                    console.error("Failed to fetch group details for leave button:", await groupDetailsResponse.text());
                    if (leaveGroupButton) leaveGroupButton.style.display = 'block'; // Default to visible if error
                }

            } else {
                console.error("Failed to check admin status:", await response.text());
                const addAdminButton = document.getElementById("addAdminButton");
                const addGroupMemberButton = document.getElementById("addGroupMemberButton");
                const deleteGroupMemberButton = document.getElementById("deleteGroupMemberButton");
                if (addAdminButton) addAdminButton.style.display = 'none';
                if (addGroupMemberButton) addGroupMemberButton.style.display = 'none';
                if (deleteGroupMemberButton) deleteGroupMemberButton.style.display = 'none';
                const leaveGroupButton = document.getElementById("leaveGroupButton");
                if (leaveGroupButton) leaveGroupButton.style.display = 'block';
            }
        } catch (error) {
            console.error("Error checking admin status:", error);
            const addAdminButton = document.getElementById("addAdminButton");
            const addGroupMemberButton = document.getElementById("addGroupMemberButton");
            const deleteGroupMemberButton = document.getElementById("deleteGroupMemberButton");
            if (addAdminButton) addAdminButton.style.display = 'none';
            if (addGroupMemberButton) addGroupMemberButton.style.display = 'none';
            if (deleteGroupMemberButton) deleteGroupMemberButton.style.display = 'none';
            const leaveGroupButton = document.getElementById("leaveGroupButton");
            if (leaveGroupButton) leaveGroupButton.style.display = 'block';
        }
    }

    function displayMessages(messages) {
        messagesContainer.innerHTML = ''; 
        if (Array.isArray(messages)) {
            messages.forEach(message => {
                displayMessage(message);
            });
        } else {
            displayMessage(messages); 
        }
        messagesContainer.scrollTop = messagesContainer.scrollHeight; 
    }

    async function loadGroupMessages(groupId, token) { 
        try {
            const response = await fetch(`/api/groups/${groupId}/messages`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!response.ok) {
                const errorText = await response.text();
                console.error("Failed to load messages:", errorText);
                messagesContainer.innerHTML = `<div class="text-red-500 p-4 text-center">Failed to load messages: ${errorText}</div>`;
                return;
            }
            const messages = await response.json();
            displayMessages(messages);
        } catch (error) {
            console.error("Error loading group messages:", error);
            messagesContainer.innerHTML = `<div class="text-red-500 p-4 text-center">Error loading messages. Please try again.</div>`;
        }
    }


async function displayMessage(message) { 
        const messageItem = document.createElement("div");
        messageItem.style.padding = '8px';
        messageItem.style.margin = '4px 0';
        messageItem.style.borderRadius = '8px';
        messageItem.style.maxWidth = '75%';
        messageItem.style.wordBreak = 'break-word';

        if (message.userId === CurrentUserId) {
            messageItem.style.backgroundColor = '#2563eb'; 
            messageItem.style.color = '#ffffff';
            messageItem.style.marginLeft = 'auto';
        } else {
            messageItem.style.backgroundColor = '#e5e7eb'; 
            messageItem.style.color = '#1f2937';
            messageItem.style.marginRight = 'auto';
        }

        let contentHTML = '';
        const senderName = message.name || `User ${message.userId}`;

        contentHTML += `<small style="font-weight: bold;">${senderName}:</small><br>`;

        if (message.fileUrl && message.fileType) {
            const fileKey = message.fileUrl.substring(message.fileUrl.lastIndexOf('/') + 1);

            try {
                const response = await fetch(`/api/groups/${message.groupId}/files/${encodeURIComponent(fileKey)}`, {
                    headers: {
                        Authorization: `Bearer ${localStorage.getItem("token")}`
                    }
                });

                if (!response.ok) {
                    throw new Error(`Failed to get signed URL: ${await response.text()}`);
                }
                const data = await response.json();
                const signedFileUrl = data.fileUrl; 

                if (message.fileType.startsWith('image')) {
                    contentHTML += `<img src="${signedFileUrl}" alt="Shared Image" style="max-width: 100%; height: auto; border-radius: 6px; margin-top: 4px; cursor: pointer;" onclick="window.open('${signedFileUrl}', '_blank');">`;
                } else if (message.fileType.startsWith('video')) {
                    contentHTML += `<video src="${signedFileUrl}" controls style="max-width: 100%; height: auto; border-radius: 6px; margin-top: 4px;"></video>`;
                } else {
                    const fileName = fileKey; 
                    contentHTML += `<a href="${signedFileUrl}" target="_blank" download="${fileName}" style="color: #00e6ff; text-decoration: underline; display: block; margin-top: 4px;">
                                        <span style="vertical-align: middle; margin-right: 4px;">&#128190;</span> Download File: ${fileName}
                                    </a>`;
                }
            } catch (error) {
                console.error("Error fetching pre-signed URL:", error);
                contentHTML += `<p style="color: red; margin-top: 4px;">Error loading file: ${error.message}</p>`;
            }

            if (message.message) {
                contentHTML += `<p style="margin-top: 4px;">${message.message}</p>`;
            }
        } else if (message.message) {
            contentHTML += `<p>${message.message}</p>`;
        }
        
        messageItem.innerHTML = contentHTML;
        messagesContainer.appendChild(messageItem);
    }
    async function addinviteToGroup(group_id, invite_id, action) {
        try {
            let endpoint;
            
            endpoint = `/api/invites/${invite_id}/${action}`; 

            const response = await fetch(endpoint, {
                method: "POST", 
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ groupId: group_id }) 
            });

            let result;
            try {
                result = await response.json();
            } catch (e) {
                result = { message: await response.text() || 'An unknown error occurred.' };
            }

            if (response.ok) {
                alert(result.message || "Invite action successful!"); 
            } else {
                console.error(`Failed to ${action} invite:`, result.message);
                alert(`Failed to ${action} invite: ${result.message}`);
            }
        } catch (error) {
            console.error(`Error during ${action} invite:`, error);
            alert(`An error occurred while ${action}ing invite. Please try again.`);
        }
        loadGroups(token); 
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
            if (invites.length > 0) {
                showInviteModal(invites); 
            }
        } catch (error) {
            console.error("Error fetching pending invites:", error);
        }
    }

    function showInviteModal(invites) {
        if (invites.length > 0) {
            const invite = invites[0]; 
            if (invite.group && invite.group.name) { 
                invitationMessage.textContent = `You have been invited to join the group: ${invite.group.name}. Do you accept?`;
                invitationAlertModal.style.display = "flex"; 

                acceptInvitationBtn.onclick = null;
                rejectInvitationBtn.onclick = null;

                acceptInvitationBtn.onclick = async () => {
                    await addinviteToGroup(invite.groupId, invite.id, "accept");
                    invitationAlertModal.style.display = "none"; 
                    fetchPendingInvites(); 
                };
                rejectInvitationBtn.onclick = async () => {
                    await addinviteToGroup(invite.groupId, invite.id, "reject");
                    invitationAlertModal.style.display = "none"; 
                    fetchPendingInvites(); 
                };
            } else {
                console.error("Group details missing for invite or malformed:", invite);
                invites.shift(); 
                showInviteModal(invites); 
            }
        } else {
            invitationAlertModal.style.display = "none"; 
        }
    }

    async function sendInviteToUser(user_id) {
        try {
            const response = await fetch(`/api/invites/groups/${currentGroupId}/invite`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ user_id }) 
            });

            let result;
            try {
                result = await response.json();
            } catch (e) {
                result = { message: await response.text() || 'An unknown error occurred.' };
            }
            
            if (response.ok) {
                alert(result.message || "Invite sent successfully!"); 
            } else {
                console.error("Failed to send invite:", result.message);
                alert(`Failed to send invite: ${result.message}`);
            }
        } catch (error) {
            console.error("Network error sending invite:", error);
            alert("A network error occurred while sending invite. Please try again.");
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

            let result;
            try {
                result = await response.json();
            } catch (e) {
                result = { message: await response.text() || 'An unknown error occurred.' };
            }

            if (response.ok) {
                alert(result.message || "User removed successfully!"); 
                await fetchAndRenderModalUsers("Remove"); 
            } else {
                console.error("Failed to remove user:", result.message);
                alert(`Failed to remove user: ${result.message}`);
            }
        } catch (error) {
            console.error("Network error removing user from group:", error);
            alert("A network error occurred while removing user. Please try again.");
        }
    }

    async function fetchAndRenderModalUsers(type) {
        try {
            const usersInGroup = await getGroupMembers(); 
            let usersToRender = [];

            if (type === "Add") {
                const allUsersResponse = await fetch(`/api/users`, { headers: { Authorization: `Bearer ${token}` } });
                if (!allUsersResponse.ok) {
                    console.error("Failed to fetch all users:", await allUsersResponse.text());
                    alert("Error fetching all users for adding.");
                    return;
                }
                const allUsers = await allUsersResponse.json(); 
                const memberUserIds = usersInGroup.map(u => u.id); 
                usersToRender = allUsers.filter(user => !memberUserIds.includes(user.id) && user.id !== CurrentUserId); 
                modalTitle.textContent = "Add Group Members";
                renderUserList(usersToRender, "Add");
            } else if (type === "Remove") {
                usersToRender = usersInGroup.filter(user => user.id !== CurrentUserId && user.id !== creatorId);
                modalTitle.textContent = "Remove Group Members";
                renderUserList(usersToRender, "Remove");
            } else if (type === "Admin") {
                usersToRender = usersInGroup.filter(user => user.id !== creatorId);
                modalTitle.textContent = "Manage Admins";
                renderAdminList(usersToRender); 
            }
            addMemberModal.style.display = "flex";
        } catch (error) {
            console.error(`Error fetching users for ${type} modal:`, error);
            alert(`Error preparing ${type} members. Please try again.`);
        }
    }


    async function getGroupMembers() {
        try {
            const membersResponse = await fetch(`/api/groups/${currentGroupId}/members`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!membersResponse.ok) {
                const errorText = await membersResponse.text();
                console.error("Failed to fetch group members:", errorText);
                alert(`Failed to fetch group members: ${errorText}`);
                return []; 
            }
            const members = await membersResponse.json(); 
            return members; 
        } catch (error) {
            console.error("Error fetching group members:", error);
            alert("Error fetching group members. Please try again.");
            return [];
        }
    }

    function renderUserList(users, buttonType) {
        userListInModal.innerHTML = ""; 

        if (users.length === 0) {
            const noUsersMessage = document.createElement("li");
            noUsersMessage.textContent = `No ${buttonType === "Add" ? "users to add" : "members to remove"}.`;
            noUsersMessage.style.cssText = "color: #6b7280; padding: 8px;"; 
            userListInModal.appendChild(noUsersMessage);
            return;
        }

        users.forEach(user => {
            const userItem = document.createElement("li");
            userItem.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #e5e7eb;"; 
            
            const userNameSpan = document.createElement("span");
            userNameSpan.textContent = user.name;
            userItem.appendChild(userNameSpan);
            
            const button = document.createElement("button");
            button.style.cssText = "padding: 4px 12px; border-radius: 6px; color: white; font-weight: 600; cursor: pointer;"; 
            
            if (buttonType === "Add") {
                button.textContent = "Add";
                button.style.backgroundColor = '#22c55e'; 
                button.onmouseover = () => button.style.backgroundColor = '#16a34a'; 
                button.onmouseout = () => button.style.backgroundColor = '#22c55e';
                button.onclick = async () => {
                    await sendInviteToUser(user.id);
                    await fetchAndRenderModalUsers("Add"); 
                };
            } else if (buttonType === "Remove") {
                button.textContent = "Remove";
                button.style.backgroundColor = '#ef4444'; 
                button.onmouseover = () => button.style.backgroundColor = '#dc2626'; 
                button.onmouseout = () => button.style.backgroundColor = '#ef4444';
                button.onclick = async () => {
                    await removeUserFromGroup(user.id);
                    await fetchAndRenderModalUsers("Remove"); 
                };
            }
            userItem.appendChild(button);
            userListInModal.appendChild(userItem);
        });
    }

    function renderAdminList(usersForAdminManagement) { 
        userListInModal.innerHTML = "";

        if (usersForAdminManagement.length === 0) {
            const noUsersMessage = document.createElement("li");
            noUsersMessage.textContent = "No members to manage admin status (creator excluded).";
            noUsersMessage.style.cssText = "color: #6b7280; padding: 8px;";
            userListInModal.appendChild(noUsersMessage);
            return;
        }

        usersForAdminManagement.forEach(user => {
            const userItem = document.createElement("li");
            userItem.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 8px; border-bottom: 1px solid #e5e7eb;"; 
            userItem.textContent = user.name; 

            const isMemberAdmin = user.isAdmin; 

            const button = document.createElement("button");
            button.style.cssText = "padding: 4px 12px; border-radius: 6px; color: white; font-weight: 600; cursor: pointer;";
            
            if (isMemberAdmin) {
                button.textContent = "Remove Admin";
                button.style.backgroundColor = '#f97316'; 
                button.onmouseover = () => button.style.backgroundColor = '#ea580c'; 
                button.onmouseout = () => button.style.backgroundColor = '#f97316';
                button.onclick = async () => {
                    await removeAdmin(user.id);
                    await fetchAndRenderModalUsers("Admin"); 
                };
            } else {
                button.textContent = "Make Admin";
                button.style.backgroundColor = '#8b5cf6'; 
                button.onmouseover = () => button.style.backgroundColor = '#7c3aed'; 
                button.onmouseout = () => button.style.backgroundColor = '#8b5cf6';
                button.onclick = async () => {
                    await makeAdmin(user.id);
                    await fetchAndRenderModalUsers("Admin"); 
                };
            }

            userItem.appendChild(button);
            userListInModal.appendChild(userItem);
        });
    }

    async function makeAdmin(userId) {
        try {
            const response = await fetch(`/api/groups/${currentGroupId}/members/${userId}/make-admin`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            let result;
            try {
                result = await response.json(); 
            } catch (e) {
                result = { message: await response.text() || 'An unknown error occurred.' };
            }

            if (response.ok) {
                alert(result.message || "User is now an admin.");
            } else {
                console.error("Failed to make user an admin:", result.message);
                alert(`Failed to make user an admin: ${result.message}`);
            }
        } catch (error) {
            console.error("Network or parsing error making user an admin:", error);
            alert("An unexpected error occurred. Please try again.");
        }
    }

    async function removeAdmin(userId) {
        try {
            const response = await fetch(`/api/groups/${currentGroupId}/members/${userId}/remove-admin`, {
                method: "PATCH",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            let result;
            try {
                result = await response.json(); 
            } catch (e) {
                result = { message: await response.text() || 'An unknown error occurred.' };
            }

            if (response.ok) {
                alert(result.message || "User is no longer an admin.");
            } else {
                console.error("Failed to remove user's admin status:", result.message);
                alert(`Failed to remove user's admin status: ${result.message}`);
            }
        } catch (error) {
            console.error("Network or parsing error removing user's admin status:", error);
            alert("An unexpected error occurred. Please try again.");
        }
    }
});
