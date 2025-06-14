document.addEventListener("DOMContentLoaded", () => {
    const signUpForm = document.getElementById("signUpForm");
    if (signUpForm) {
        signUpForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const name = document.getElementById("name").value;
            const email = document.getElementById("email").value;
            const phone = document.getElementById("phone").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch("/api/signup", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ name, email, phone, password }),
                });

                const result = await response.json(); 

                console.log(result);

                if (response.ok && result === "success") { 
                    alert("Signup successful!");
                    window.location.href = "/login";
                } else {
                    alert(result);
                }
            } catch (err) {
                console.error('Error during signup:', err);
                alert("An error occurred during signup. Please try again.");
            }
        });
    }

    
    const loginPage = document.getElementById("loginPage");
    if (loginPage) {
        loginPage.addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.href = "/login"; 
        });
    }

    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value;
            const password = document.getElementById("password").value;

            try {
                const response = await fetch("/api/login", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email, password }),
                });

                const result = await response.json(); 

                if (response.ok) { 
                    alert("Login successful!"); 
                    localStorage.setItem("token", result.token);
                    localStorage.setItem("userId", result.userId);
                    window.location.href = "/group";
                } else {
                    if (result === "email not found") {
                        alert("Incorrect email.");
                    } else if (result === "password incorrect") {
                        alert("Incorrect password.");
                    } else {

                        alert(result);
                    }
                }
            } catch (err) {
                console.error('Error during login:', err);
                alert("An error occurred during login. Please try again.");
            }
        });
    }

    
    const signUpPage = document.getElementById("signUpPage");
    if (signUpPage) {
        signUpPage.addEventListener("submit", (e) => {
            e.preventDefault();
            window.location.href = "/"; 
        });
    }
});