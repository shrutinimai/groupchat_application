document.addEventListener("DOMContentLoaded", async () => {
    const token = localStorage.getItem("token");
    console.log("Token retrieved:", token); 

    if (!token) {
        console.error("No token found. User may not be logged in.");
        return; 
    }

    await loadMessages(token);

    document.getElementById("sendMessage").addEventListener("submit", async (e) => {
        e.preventDefault();
        const message = document.getElementById("message").value;

        const response = await fetch("/api/messages", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}` 
            },
            body: JSON.stringify({ message })
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            console.error("Error:", errorText); 
            return; 
        }

        const result = await response.json(); 
        console.log("Message sent:", result);
        storeMessage(result); 
        displayMessages([result]); 
        document.getElementById("message").value = ''; 

        await loadMessages(token);
    });

    async function loadMessages() {
        const response = await fetch("/api/messages", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${token}` 
            }
        });

        if (!response.ok) {
            const errorText = await response.text(); 
            console.error("Error fetching messages:", errorText); 
            return; // Exit if there's an error
        }

        const messages = await response.json();
        displayMessages(messages);
    }

    function displayMessages(messages) {
        const allMessages = document.getElementById("allMessages");
        allMessages.innerHTML = ''; 

        if (Array.isArray(messages)) {
            messages.forEach(msg => {
                createMessageElement(msg, allMessages);
            });
        } else {
            createMessageElement(messages, allMessages);
        }
    }

    function createMessageElement(msg, container) {
        const messageDiv = document.createElement("div");
        messageDiv.classList.add("message");

        if (msg.isCurrent) { 
            messageDiv.classList.add("current-user");
            messageDiv.style.textAlign = "right";
            container.appendChild(document.createElement("br"))
        } else {
            messageDiv.classList.add("other-user");
            messageDiv.style.textAlign = "left";
            container.appendChild(document.createElement("br"))
        }

        messageDiv.innerText = `${msg.name || msg.userId}: ${msg.message}`; 
        container.appendChild(messageDiv);
    }

    function storeMessage(message) {
        let messages = JSON.parse(localStorage.getItem('messages')) || [];
        messages.push(message);
        
        if (messages.length > 10) {
            messages.shift(); 
        }
        
        localStorage.setItem('messages', JSON.stringify(messages));
    }
});