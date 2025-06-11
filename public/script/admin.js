// Add event listener to the addAdminButton
document.getElementById("addAdminButton").addEventListener("click", async () => {
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

        // Render the user list with make admin or remove admin buttons
        renderAdminList(members, users);
    } catch (error) {
        console.error("Error fetching group members or users:", error);
    }
});

// Function to render the user list with make admin or remove admin buttons
function renderAdminList(members, users) {
    const userList = document.getElementById("userList");
    userList.innerHTML = ""; // Clear existing users

    users.forEach(user => {
        const userItem = document.createElement("li");
        userItem.textContent = user.name; // Display user name

        // Check if the user is already an admin
        const isAdmin = members.some(member => member.user_id === user.id && member.isAdmin);

        // Create make admin or remove admin button
        const button = document.createElement("button");
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
