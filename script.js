const typingForm = document.querySelector(".typing-form");
const chatList = document.querySelector(".chat-list");
const suggestions = document.querySelectorAll(".suggestion-list .suggestion");
const toggleThemeButton = document.querySelector("#toggle-theme-button");
const deleteChatButton = document.querySelector("#delete-chat-button");


let userMessage = null;
let isResponseGenerating = false;

// API configuration
const API_KEY = 'YOUR-API-KEY';
const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=YOUR-API-KEY';

const loadLocalStorageData = () =>{
    const savedChats = localStorage.getItem("savedChats");
    const isLightMode = (localStorage.getItem("themeColor") === "light_mode");

    // Apply the stored theme
    document.body.classList.toggle("light_mode", isLightMode);
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";

    // Restore saved chats
    chatList.innerHTML = savedChats || "";

    document.body.classList.toggle("hide-header", savedChats); // Hide the header once the chat starts
    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
}

loadLocalStorageData();

//Create a new meaage element and return it
const createMessageElement = (content, ...classes) => {
    const div = document.createElement('div');
    div.classList.add("message", ...classes);
    div.innerHTML = content;
    return div;
}

// Show typing effect by displaying words one by one
const showTypingEffect = (text, textElement, incomingMessageDiv) => {
    const words  = text.split(' ');
    let currentWordIndex = 0;

    const typingInterval = setInterval(() => {
        // Append each word to the text element with a space
        textElement.innerHTML += (currentWordIndex === 0 ? '' : ' ') + words[currentWordIndex++];
        incomingMessageDiv.querySelector(".icon").classList.add("hide");

        //If all words are displayed
        if(currentWordIndex === words.length){
            clearInterval(typingInterval);
            isResponseGenerating = false;
            incomingMessageDiv.querySelector(".icon").classList.remove("hide");
            localStorage.setItem("savedChats", chatList.innerHTML); // Save chats to local storage
            
        }
        chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
    }, 75);
}



const formatResponseText = (text) => {
    let formattedText = text
        .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>')         // Replace bold (**text**)
        .replace(/\*(.*?)\*/g, '<i>$1</i>')             // Replace italic (*text*)
        .replace(/~~(.*?)~~/g, '<s>$1</s>')             // Replace strikethrough (~~text~~)
        .replace(/`([^`]+)`/g, '<code>$1</code>')       // Replace inline code (`code`)
        .replace(/## (.*?)(\n|$)/g, '<h2>$1</h2>')      // Replace headings (## Heading)
        //.replace(/\n{2,}/g, '</p><p>')                  // Replace double newlines with paragraphs
        .replace(/\n/g, ' <br>')                        // Replace single newlines with <br>
        .replace(/\s{2,}/g, ' ');                       // Replace extra spaces with a single space

    return `${formattedText}`; // Wrap the whole content in a paragraph tag
};


// Fetch response from the API based on user message
const generateAPIResponse = async (incomingMessageDiv) => {
    
    const textElement = incomingMessageDiv.querySelector(".text");  // Get text element

    // Send a POST request to API with the user's message
    try{
        const response = await fetch(API_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                contents: [{
                    role: "user",
                    parts: [{text: userMessage}]
                }]
            })
        });

        const data = await response.json();
        if(!response.ok) throw new Error(data.error.message);

        // Get api response text and remove asteriks from it .replace(/\*\*(.*?)\*\*/g, '$1')
        const apiResponse = formatResponseText (data?.candidates[0].content.parts[0].text);
        showTypingEffect(apiResponse, textElement, incomingMessageDiv);
    }catch (error){
        isResponseGenerating = false;
        textElement.innerText = error.message;
        textElement.classList.remove.add("error");
    }finally{
        incomingMessageDiv.classList.remove("loading");
    }
}

// Show a loading animation while waiting for the API response
const showLoadingAnimation = () =>{
    const html='<div class="message-content"><img src="gemini.svg" alt="Gemini Image" class="avatar"><p class="text"></p><div class="loading-indicator"><div class="loading-bar"></div><div class="loading-bar"></div><div class="loading-bar"></div></div></div><span onclick="copyMessage(this)" class="icon material-symbols-rounded">content_copy</span>';

    const incomingMessageDiv = createMessageElement(html, "incoming", "loading");
    chatList.appendChild(incomingMessageDiv);

    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
    generateAPIResponse(incomingMessageDiv);
}

// Copy text to clipboard
const copyMessage = (copyIcon) =>{
    const messageText = copyIcon.parentElement.querySelector(".text").innerText;

    navigator.clipboard.writeText(messageText);
    copyIcon.innerText = "done"; // Show text icon
    setTimeout(() => copyIcon.innerText = "content_copy", 1000); // Revert icon after 1 second
}


// Handling sending outgoing chat messages
const handleOutgoingChat = () => {
    userMessage = typingForm.querySelector(".typing-input").value.trim() || userMessage;
    if(!userMessage || isResponseGenerating) return; //Exit if there is no message

    isResponseGenerating = true;

    const html = '<div class="message-content"><img src="profile-pic.png" alt="User Image" class="avatar"><p class="text">Lorem ipsum dolor sit amet consectetur adipisicing elit.</p></div>';

    const outgoingMessageDiv = createMessageElement(html, "outgoing");
    outgoingMessageDiv.querySelector(".text").innerHTML = userMessage;
    chatList.appendChild(outgoingMessageDiv);

    typingForm.reset(); //Clear input field
    chatList.scrollTo(0, chatList.scrollHeight); // Scroll to the bottom
    document.body.classList.add("hide-header"); // Hide the header once the chat starts
    setTimeout(showLoadingAnimation, 500); // Show loading animation after a delay
}

// Set userMessage and handle outgoing chat when a suggestion is failed
suggestions.forEach(suggestion => {
    suggestion.addEventListener("click", () =>{
        userMessage = suggestion.querySelector(".text").innerText;
        handleOutgoingChat();
    });
})

// Toggle between light and dark themes
toggleThemeButton.addEventListener("click", () =>{
    const isLightMode = document.body.classList.toggle("light_mode");
    localStorage.setItem("themeColor", isLightMode ? "light_mode" : "dark_mode");
    toggleThemeButton.innerText = isLightMode ? "dark_mode" : "light_mode";
});

// Delete all chats from local storage when delete button is clicked
deleteChatButton.addEventListener("click", () => {
    if(confirm("Are you sure you want to delete all messages?")){
        localStorage.removeItem("savedChats");
        loadLocalStorageData();
    }
})

// Prevent default form submission and handle outgoing chat
typingForm.addEventListener("submit", (e) =>{
    e.preventDefault();

    handleOutgoingChat();
});


