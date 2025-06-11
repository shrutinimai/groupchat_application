document.addEventListener("DOMContentLoaded", async () => {
    // Retrieve the token from local storage
    const token = localStorage.getItem("token");
    console.log("Token retrieved:", token); // Log the token

    if (!token) {
        console.error("No token found. User may not be logged in.");
        return; // Exit if there's no token
    }

    // Load existing messages when the page loads
    await loadMessages(token);

    document.getElementById("sendMessage").addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = document.getElementById("message").value;

        const response = await fetch("/api/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` // Include the token here
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errorText = await response.text(); // Get the error message
            console.error("Error:", errorText); // Log the error message
            return; // Exit if there's an error
        }

        const result = await response.json(); // Parse the response as JSON
        console.log("Message sent:", result);
        storeMessage(result); // Store the new message in local storage
        displayMessages([result]); // Display the new message
        document.getElementById("message").value = ''; // Clear the input field

        // Fetch all messages again to refresh the display
        await loadMessages(token);
    });

    async function loadMessages() {
        const response = await fetch("/api/messages", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}` // Include the token here
            }
        });

        if (!response.ok) {
            const errorText = await response.text(); // Get the error message
            console.error("Error fetching messages:", errorText); // Log the error message
            return; // Exit if there's an error
        }

        const messages = await response.json();
        displayMessages(messages); // Display the fetched messages
    }

    function displayMessages(messages) {
        const allMessages = document.getElementById("allMessages");
        allMessages.innerHTML = ''; // Clear existing messages

        // Check if messages is an array
        if (Array.isArray(messages)) {
            messages.forEach(msg => {
                createMessageElement(msg, allMessages);
            });
        } else {
            // If it's a single message object, create a message element for it
            createMessageElement(messages, allMessages);
        }
    }

    function createMessageElement(msg, container) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");

        // Check if the message is from the current user
        if (msg.isCurrent) { // Adjust this check based on your logic
            messageDiv.classList.add("current-user");
            messageDiv.style.textAlign = "right";
            container.appendChild(document.createElement("br"))
        } else {
            messageDiv.classList.add("other-user");
            messageDiv.style.textAlign = "left";
            container.appendChild(document.createElement("br"))
        }

        messageDiv.innerText = `${msg.name || msg.userId}: ${msg.message}`; // Display user name or ID
        container.appendChild(messageDiv);
    }

    function storeMessage(message) {
        let messages = JSON.parse(localStorage.getItem('messages')) || [];
        messages.push(message);
        
        // Limit to the most recent 10 messages
        if (messages.length > 10) {
            messages.shift(); // Remove the oldest message
        }
        
        localStorage.setItem('messages', JSON.stringify(messages)); // Save updated messages back to local storage
    }
});
