(async function () {
            const scriptTag = document.currentScript;
            const chatbotId = scriptTag.getAttribute("chatbot-id");
            const sessionId =
                localStorage.getItem("chatbot_session_id") || crypto.randomUUID();
            localStorage.setItem("chatbot_session_id", sessionId);
            const apiBase = "https://api.0804.in/api"; // Your API base URL

            const CHATBOT_NAME = "Supa Agent";
            const GREETING_MESSAGE = "Hello! I'm Supa Agent, your AI-powered virtual assistant. How can I help you today?";
            const GREETING_SUGGESTIONS = [
                "How can you help me?",
                "Hi, I need some assistance",
                "I want contact details",
            ];

            const savedEmail = localStorage.getItem("chatbot_user_email");
            let skipOTP = false;
            let greetingShown = false;

            if (savedEmail) {
                try {
                    const sessionCheck = await fetch(
                        `${apiBase}/otp/check-session?email=${encodeURIComponent(savedEmail)}&chatbotId=${chatbotId}`
                    );
                    const sessionData = await sessionCheck.json();
                    if (sessionCheck.ok && sessionData.valid) {
                        skipOTP = true;
                    }
                } catch (err) {
                    console.error("Session check failed:", err);
                }
            }

            const style = document.createElement("style");
            style.innerHTML = `
/* CSS Reset for Chatbot Container */
#troika-chatbox, 
#troika-chatbox *, 
#troika-chatbox *::before, 
#troika-chatbox *::after {
  all: unset !important;
  box-sizing: border-box !important;
  font-family: 'Poppins', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
}

/* Floating Action Button Container */
#troika-fab {
  position: fixed !important;
  bottom: 40px !important;
  right: 40px !important;
  z-index: 999999 !important;
}

/* Add this new CSS class anywhere in the <style> block */
.troika-is-floating {
  animation: troika-float 3s ease-in-out infinite !important;
}

/* Chat Button */
#troika-fab #troika-chat-button.troika-chat-btn {
  all: unset !important;
  width: 80px !important;
  height: 80px !important;
  cursor: pointer !important;
  overflow: hidden !important;
  display: block !important;
  background: none !important;
  border: none !important;
  outline: none !important;
  margin: 0 !important;
  padding: 0 !important;
}

#troika-fab #troika-chat-button.troika-chat-btn img {
  width: 100% !important;
  height: 100% !important;
  object-fit: cover !important;
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}

/* Floating Label with Speech Bubble */
#troika-fab #troika-chat-label.troika-label {
  position: absolute !important;
  bottom: 100% !important;
  right: 0 !important;
  transform: translate(-30px, -12px) !important;
    background: hsla(205, 46%, 30%, 1);
    background: linear-gradient(90deg, hsla(205, 46%, 30%, 1) 0%, hsla(260, 29%, 36%, 1) 100%);
    background: -moz-linear-gradient(90deg, hsla(205, 46%, 30%, 1) 0%, hsla(260, 29%, 36%, 1) 100%);
    background: -webkit-linear-gradient(90deg, hsla(205, 46%, 30%, 1) 0%, hsla(260, 29%, 36%, 1) 100%);
    filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#295270", endColorstr="#524175", GradientType=1);
  color: white !important;
  padding: 8px 14px !important;
  border-radius: 12px !important;
  font-size: 13px !important;
  font-weight: 700 !important;
  font-family: 'Poppins', sans-serif !important;
  white-space: nowrap !important;
  pointer-events: none !important;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15) !important;
  margin: 0 !important;
  line-height: 1 !important;
}

/* Speech Bubble Tail */
#troika-fab #troika-chat-label.troika-label::after {
  content: "" !important;
  position: absolute !important;
  bottom: -5px !important;
  right: 20px !important;
  width: 10px !important;
  height: 10px !important;
  transform: rotate(45deg) !important;
  border: none !important;
  background: hsla(205, 46%, 30%, 1);
  background: linear-gradient(90deg, hsla(205, 46%, 30%, 1) 0%, hsla(260, 29%, 36%, 1) 100%);
  background: -moz-linear-gradient(90deg, hsla(205, 46%, 30%, 1) 0%, hsla(260, 29%, 36%, 1) 100%);
  background: -webkit-linear-gradient(90deg, hsla(205, 46%, 30%, 1) 0%, hsla(260, 29%, 36%, 1) 100%);
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#295270", endColorstr="#524175", GradientType=1);
}

/* Floating Animation */
@keyframes troika-float {
  0% { transform: translateY(0px) !important; }
  50% { transform: translateY(-14px) !important; }
  100% { transform: translateY(0px) !important; }
}

/* Core Chatbot Container */
#troika-chatbox.troika-widget {
  position: fixed !important;
  bottom: 20px !important;
  right: 20px !important;
  width: 340px !important;
  height: 550px !important;
  max-height: 90vh !important;
  background: #fff !important;
  border-radius: 18px !important;
  box-shadow: 0 10px 30px rgba(0,0,0,0.15) !important;
  display: none !important;
  flex-direction: column !important;
  overflow: hidden !important;
  z-index: 999999 !important;
  font-family: 'Poppins', sans-serif !important;
  color: #333 !important;
  text-align: left !important;
  line-height: 1.4 !important;
  margin: 0 !important;
  padding: 0 !important;
  border: none !important;
}

#troika-chatbox.troika-widget[data-visible="true"] {
  display: flex !important;
}

/* Mobile Responsiveness */
@media(max-width: 480px) {
  #troika-chatbox.troika-widget {
    width: 90% !important;
    right: 5% !important;
    bottom: 20px !important;
    height: 75vh !important;
  }
  
  #troika-fab {
    bottom: 20px !important;
    right: 5% !important;
  }
}

/* Header Styling */
#troika-chatbox.troika-widget #troika-header.troika-header {
  background: hsla(225, 40%, 54%, 1) !important;
  background: -webkit-linear-gradient(to right, hsla(225, 40%, 54%, 1), hsla(284, 75%, 54%, 1)) !important;
  background: -moz-linear-gradient(to right, hsla(225, 40%, 54%, 1), hsla(284, 75%, 54%, 1)) !important;
  background: linear-gradient(to right, hsla(225, 40%, 54%, 1), hsla(284, 75%, 54%, 1)) !important;
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#5C73B9", endColorstr="#B330E1", GradientType=1) !important;
  color: #fff !important;
  padding: 18px 16px !important;
  display: flex !important;
  justify-content: space-between !important;
  align-items: center !important;
  border-top-left-radius: 18px !important;
  border-top-right-radius: 18px !important;
  gap: 10px !important;
  margin: 0 !important;
  border: none !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header .header-content {
  display: flex !important;
  align-items: center !important;
  gap: 10px !important;
  margin: 0 !important;
  flex: 1 !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header .header-text {
  display: flex !important;
  flex-direction: column !important;
  align-items: flex-start !important;
  margin: 0 !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header .header-text .troika-main-title {
  font-weight: 700 !important;
  font-size: 18px !important;
  margin: 0 0 4px 0 !important;
  color: #fff !important;
  line-height: 1.2 !important;
  padding: 0 !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header .header-text .troika-sub-title {
  font-weight: 400 !important;
  font-size: 12px !important;
  opacity: 0.8 !important;
  margin: 0 !important;
  color: #fff !important;
  line-height: 1.2 !important;
  padding: 0 !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header .header-avatar {
  width: 50px !important;
  height: 50px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  padding: 3px !important;
  margin: 0 !important;
  display: block !important;
  border: none !important;
}

/* Close Button Styling */
#troika-chatbox.troika-widget #troika-header.troika-header #troika-close.troika-close {
  cursor: pointer !important;
  font-size: 30px !important;
  font-weight: bold !important;
  padding: 8px !important;
  line-height: 1 !important;
  color: #fff !important;
  <!-- background: rgba(255,255,255,0.1) !important; -->
  border: none !important;
  border-radius: 4px !important;
  margin: 0 !important;
  text-decoration: none !important;
  outline: none !important;
  user-select: none !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  width: 32px !important;
  height: 32px !important;
  transition: all 0.2s ease !important;
  flex-shrink: 0 !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header #troika-close.troika-close:hover {
  transform: scale(1.2) !important;
}

#troika-chatbox.troika-widget #troika-header.troika-header #troika-close.troika-close:active {
  transform: scale(0.95) !important;
}

/* Messages Area */
#troika-chatbox.troika-widget #troika-messages.troika-messages {
  flex: 1 !important;
  padding: 16px !important;
  overflow-y: auto !important;
  background: #fff !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 12px !important;
  box-sizing: border-box !important;
  margin: 0 !important;
  border: none !important;
}

#troika-chatbox.troika-widget .troika-msg.troika-message {
  display: flex !important;
  align-items: flex-end !important;
  gap: 10px !important;
  margin: 0 0 12px 0 !important;
  padding: 0 !important;
  background: none !important;
  border: none !important;
  width: 100% !important;
}

#troika-chatbox.troika-widget .troika-avatar.troika-avatar {
  width: 40px !important;
  height: 40px !important;
  border-radius: 50% !important;
  object-fit: cover !important;
  align-self: flex-start !important;
  margin: 0 !important;
  padding: 0 !important;
  display: block !important;
  flex-shrink: 0 !important;
  border: none !important;
}

#troika-chatbox.troika-widget .troika-bubble.troika-bubble {
  padding: 12px 16px !important;
  border-radius: 16px !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
  max-width: 80% !important;
  word-wrap: break-word !important;
  color: #333 !important;
  display: flex !important;
  flex-direction: column !important;
  margin: 0 !important;
  text-align: left !important;
  border: none !important;
}

#troika-chatbox.troika-widget .troika-bubble-text {
  margin: 0 0 4px 0 !important;
  padding: 0 !important;
  color: inherit !important;
}

#troika-chatbox.troika-widget .user.troika-user .troika-bubble.troika-bubble {
  background: #EEF2FF !important;
  color: #333 !important;
  border-bottom-right-radius: 4px !important;
  margin-left: auto !important;
  border: none !important;
}

#troika-chatbox.troika-widget .bot.troika-bot .troika-bubble.troika-bubble {
  background: #fff !important;
  border: 1px solid #E0E0E0 !important;
  border-bottom-left-radius: 4px !important;
  margin-right: auto !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.05) !important;
  color: #333 !important;
}

/* Timestamps */
#troika-chatbox.troika-widget .troika-timestamp.troika-timestamp {
  font-size: 10px !important;
  color: #999 !important;
  margin: 2px 0 0 0 !important;
  align-self: flex-end !important;
  padding: 0 !important;
  background: none !important;
  border: none !important;
}

#troika-chatbox.troika-widget .user.troika-user .troika-timestamp.troika-timestamp {
  align-self: flex-end !important;
}

#troika-chatbox.troika-widget .bot.troika-bot .troika-timestamp.troika-timestamp {
  align-self: flex-start !important;
}

/* Input Area */
#troika-chatbox.troika-widget #troika-input.troika-input {
  display: flex !important;
  padding: 10px !important;
  border-top: 1px solid #eee !important;
  background: #fff !important;
  align-items: center !important;
  gap: 8px !important;
  border-bottom-left-radius: 18px !important;
  border-bottom-right-radius: 18px !important;
  margin: 0 !important;
}

#troika-chatbox.troika-widget #troika-input.troika-input input.troika-input-field {
  all: unset !important;
  flex: 1 !important;
  padding: 12px 16px !important;
  border-radius: 25px !important;
  background: #F8F9FA !important;
  font-size: 14px !important;
  border: 1px solid #E0E0E0 !important;
  box-sizing: border-box !important;
  transition: border-color 0.2s ease !important;
  color: #333 !important;
  font-family: 'Poppins', sans-serif !important;
  outline: none !important;
  margin: 0 !important;
  width: auto !important;
  height: auto !important;
  min-height: 20px !important;
}

#troika-chatbox.troika-widget #troika-input.troika-input input.troika-input-field::placeholder {
  color: #999 !important;
  opacity: 1 !important;
}

#troika-chatbox.troika-widget #troika-input.troika-input input.troika-input-field:focus {
  border-color: #A81BBE !important;
  outline: none !important;
  box-shadow: 0 0 0 2px rgba(168, 27, 190, 0.2) !important;
}

#troika-chatbox.troika-widget #troika-input.troika-input button.troika-send-btn {
  all: unset !important;
  background: hsla(225, 40%, 54%, 1) !important;
  background: -webkit-linear-gradient(to right, hsla(225, 40%, 54%, 1), hsla(284, 75%, 54%, 1)) !important;
  background: -moz-linear-gradient(to right, hsla(225, 40%, 54%, 1), hsla(284, 75%, 54%, 1)) !important;
  background: linear-gradient(to right, hsla(225, 40%, 54%, 1), hsla(284, 75%, 54%, 1)) !important;
  filter: progid:DXImageTransform.Microsoft.gradient(startColorstr="#5C73B9", endColorstr="#B330E1", GradientType=1) !important;
  border: none !important;
  color: white !important;
  border-radius: 50% !important;
  width: 50px !important;
  height: 50px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  font-size: 25px !important;
  cursor: pointer !important;
  transition: all 0.3s ease !important;
  box-shadow: 0 2px 8px rgba(0,0,0,0.2) !important;
  margin: 0 !important;
  padding: 0 !important;
  outline: none !important;
  flex-shrink: 0 !important;
}

#troika-chatbox.troika-widget #troika-input.troika-input button.troika-send-btn:hover {
  transform: scale(1.1) !important;
}

#troika-chatbox.troika-widget #troika-input.troika-input button.troika-send-btn::before {
  content: "➤" !important;
  display: inline-block !important;
  line-height: 1 !important;
  color: white !important;
  font-size: 20px !important;
  margin: 0 !important;
  padding: 0 !important;
}

/* Typing Indicator */
#troika-chatbox.troika-widget .typing-indicator.troika-typing {
  font-style: italic !important;
  font-size: 13px !important;
  opacity: 0.6 !important;
  color: #666 !important;
  margin: 0 !important;
  padding: 8px !important;
}

#troika-chatbox.troika-widget #typing-indicator.troika-typing-msg {
  display: flex !important;
  align-items: flex-end !important;
  gap: 10px !important;
  margin: 0 0 12px 0 !important;
  padding: 0 !important;
  background: none !important;
  border: none !important;
}

#troika-chatbox.troika-widget #typing-indicator.troika-typing-msg .troika-bubble.troika-bubble {
  background: #fff !important;
  border: 1px solid #E0E0E0 !important;
  color: #666 !important;
}

/* Suggestion Buttons */
#troika-chatbox.troika-widget .troika-suggestion-button.troika-suggestion {
  all: unset !important;
  width: auto !important;
  min-width: 80px !important;
  text-align: center !important;
  padding: 8px 16px !important;
  font-size: 13px !important;
  border-radius: 20px !important;
  border: 1.5px solid #ccc !important;
  background: #ffffff !important;
  color: #333 !important;
  font-weight: 500 !important;
  cursor: pointer !important;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08) !important;
  transition: all 0.3s ease !important;
  margin: 0 4px 6px 0 !important;
  white-space: nowrap !important;
  display: inline-block !important;
  font-family: 'Poppins', sans-serif !important;
  line-height: 1.2 !important;
  outline: none !important;
}

#troika-chatbox.troika-widget .troika-suggestion-button.troika-suggestion:hover {
  background: linear-gradient(to right, rgba(92, 115, 185, 0.1), rgba(179, 48, 225, 0.1)) !important;
  color: #5C73B9 !important;
  border: 1.5px solid rgba(92, 115, 185, 0.2) !important;
}

#troika-chatbox.troika-widget #troika-suggestion-row {
  margin: 10px 0 0 100px !important;
  display: flex !important;
  justify-content: flex-end; !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  align-items: flex-start !important;
  justify-content: flex-start !important;
  padding: 0 !important;
  background: none !important;
  border: none !important;
}

#troika-chatbox.troika-widget #troika-suggestion-row .troika-avatar.troika-avatar {
  display: none !important;
}

#troika-chatbox.troika-widget #troika-suggestion-row .troika-bubble.troika-bubble {
  all: unset !important;
  display: flex !important;
  flex-wrap: wrap !important;
  gap: 8px !important;
  max-width: 100% !important;
  padding: 0 !important;
  background: none !important;
  border: none !important;
  box-shadow: none !important;
}

/* Auth Wrapper */
#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth {
  padding: 20px !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 15px !important;
  flex: 1 !important;
  justify-content: center !important;
  margin: 0 !important;
  background: #fff !important;
  border: none !important;
}

#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth input {
  all: unset !important;
  width: 100% !important;
  padding: 12px !important;
  border: 1px solid #ccc !important;
  border-radius: 8px !important;
  box-sizing: border-box !important;
  font-family: 'Poppins', sans-serif !important;
  color: #333 !important;
  background: #fff !important;
  font-size: 14px !important;
  margin: 0 !important;
  outline: none !important;
  display: block !important;
}

#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth input::placeholder {
  color: #999 !important;
  opacity: 1 !important;
}

#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth input:focus {
  border-color: #7F56D9 !important;
  box-shadow: 0 0 0 2px rgba(127, 86, 217, 0.2) !important;
}

#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth button {
  all: unset !important;
  width: 100% !important;
  padding: 12px !important;
  background: #7F56D9 !important;
  color: white !important;
  border: none !important;
  border-radius: 8px !important;
  cursor: pointer !important;
  font-size: 16px !important;
  transition: background 0.3s ease !important;
  text-align: center !important;
  font-family: 'Poppins', sans-serif !important;
  margin: 0 !important;
  box-sizing: border-box !important;
  outline: none !important;
  display: block !important;
}

#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth button:hover {
  background: #6D43B5 !important;
}

/* OTP Section Styling */
#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth #otp-section {
  margin: 0 !important;
  display: none !important;
  flex-direction: column !important;
  gap: 15px !important;
  padding: 0 !important;
  background: none !important;
  border: none !important;
}

#troika-chatbox.troika-widget #troika-auth-wrapper.troika-auth #otp-section.show {
  display: flex !important;
}

/* Links inside messages */
#troika-chatbox.troika-widget #troika-messages.troika-messages a {
  color: #7F56D9 !important;
  text-decoration: underline !important;
  font-weight: bold !important;
  cursor: pointer !important;
}

#troika-chatbox.troika-widget #troika-messages.troika-messages a:hover {
  color: #6D43B5 !important;
}

/* Scrollbar Styling */
#troika-chatbox.troika-widget #troika-messages.troika-messages::-webkit-scrollbar {
  width: 6px !important;
}

#troika-chatbox.troika-widget #troika-messages.troika-messages::-webkit-scrollbar-track {
  background: #f1f1f1 !important;
  border-radius: 3px !important;
}

#troika-chatbox.troika-widget #troika-messages.troika-messages::-webkit-scrollbar-thumb {
  background: #ccc !important;
  border-radius: 3px !important;
}

#troika-chatbox.troika-widget #troika-messages.troika-messages::-webkit-scrollbar-thumb:hover {
  background: #bbb !important;
}

/* Other Animations */
@keyframes troika-fadeInUp {
  from { 
    opacity: 0 !important; 
    transform: translateY(10px) !important; 
  }
  to { 
    opacity: 1 !important; 
    transform: translateY(0) !important; 
  }
}
`;

            document.head.appendChild(style);

            const el = (tag, attrs = {}, html = "") => {
                const e = document.createElement(tag);
                Object.entries(attrs).forEach(([k, v]) => e.setAttribute(k, v));
                if (html) e.innerHTML = html;
                return e;
            };

            // Create floating action button container
            const fabContainer = el("div", { id: "troika-fab" });

            const button = el(
                "button",
                { id: "troika-chat-button", class: "troika-chat-btn" },
                `<img src="https://raw.githubusercontent.com/troika-tech/Asset/refs/heads/main/Troika%203d%20logo.png" alt="Chat" />`
            );

            const label = el("div", { id: "troika-chat-label", class: "troika-label" }, "SUPA Agent");

            // Append button and label to fab container
            fabContainer.appendChild(button);
            fabContainer.appendChild(label);

            const chatbox = el(
                "div",
                { id: "troika-chatbox", class: "troika-widget" },
                `
<div id="troika-header" class="troika-header">
<div class="header-content">
<img class="header-avatar" src="https://raw.githubusercontent.com/troika-tech/Asset/53e29e1748a7b203eaf3895581cfa4aac341f016/Supa%20Agent.svg" alt="Supa Agent Avatar" />
<div class="header-text">
<div class="troika-main-title">${CHATBOT_NAME}</div>
<div class="troika-sub-title">AI Assistant</div>
</div>
</div>
<span id="troika-close" class="troika-close">×</span>
</div>
<div id="troika-messages" class="troika-messages"></div>
<div id="troika-input" class="troika-input">
<input type="text" class="troika-input-field" placeholder="Type your message..." />
<button class="troika-send-btn"></button>
</div>
`
            );

            document.body.appendChild(fabContainer);
            fabContainer.classList.add('troika-is-floating');
            document.body.appendChild(chatbox);

            const input = chatbox.querySelector("input");
            const sendBtn = chatbox.querySelector("button");
            const messages = chatbox.querySelector("#troika-messages");
            const closeBtn = chatbox.querySelector("#troika-close");
            const inputBox = chatbox.querySelector("#troika-input");

            button.onclick = () => {
                chatbox.style.display = "flex";
                chatbox.setAttribute("data-visible", "true");
                fabContainer.style.display = "none";
                fabContainer.classList.remove('troika-is-floating');
                document.querySelector("#troika-auth-wrapper")?.remove();
                !skipOTP ? showAuth() : enableChat();
            };

            // Close button functionality
            closeBtn.onclick = (e) => {
                e.preventDefault();
                e.stopPropagation();
                chatbox.style.display = "none";
                chatbox.setAttribute("data-visible", "false");
                fabContainer.style.display = "block";

                // Force browser reflow to restart the animation
                fabContainer.classList.remove('troika-is-floating'); // 1. Make sure the class is off
                void fabContainer.offsetWidth;                      // 2. Trigger a reflow
                fabContainer.classList.add('troika-is-floating');    // 3. Add the class back
            }

            // Ensure the FAB is visible initially if the chatbox is closed
            // Ensure the FAB is visible initially if the chatbox is closed
            window.addEventListener('load', () => {
                if (chatbox.style.display === 'none' || !chatbox.getAttribute("data-visible")) {
                    fabContainer.style.display = 'block';

                    // Force browser reflow to start the animation
                    fabContainer.classList.remove('troika-is-floating'); // 1. Make sure the class is off
                    void fabContainer.offsetWidth;                      // 2. Trigger a reflow
                    fabContainer.classList.add('troika-is-floating');    // 3. Add the class back
                }
            });

            function showAuth() {
                const authWrapper = el(
                    "div",
                    { id: "troika-auth-wrapper", class: "troika-auth" },
                    `
<input id="troika-email" type="email" placeholder="Enter your email" />
<button id="request-otp">Send OTP</button>
<div id="otp-section">
<input id="troika-otp" type="text" placeholder="Enter OTP" />
<button id="verify-otp">Verify OTP</button>
</div>
`
                );
                chatbox.insertBefore(authWrapper, messages);
                inputBox.style.display = "none";

                const emailInput = authWrapper.querySelector("#troika-email");
                const otpInput = authWrapper.querySelector("#troika-otp");
                const otpSection = authWrapper.querySelector("#otp-section");

                authWrapper.querySelector("#request-otp").onclick = async () => {
                    const email = emailInput.value.trim();
                    if (!email) return alert("Enter your email");

                    try {
                        const res = await fetch(`${apiBase}/otp/request-otp`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email }),
                        });
                        if (res.ok) {
                            alert("OTP sent to your email");
                            // Show OTP section properly
                            otpSection.style.display = "flex";
                            otpSection.classList.add("show");
                        } else {
                            alert("Failed to send OTP");
                        }
                    } catch (error) {
                        console.error("OTP request failed:", error);
                        alert("Failed to send OTP. Please try again.");
                    }
                };

                authWrapper.querySelector("#verify-otp").onclick = async () => {
                    const email = emailInput.value.trim().toLowerCase();
                    const otp = otpInput.value.trim();
                    if (!email || !otp) return alert("Enter both email and OTP");

                    try {
                        const res = await fetch(`${apiBase}/otp/verify-otp`, {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ email, otp, chatbotId, sessionId }),
                        });
                        const data = await res.json();
                        if (res.ok && data.success) {
                            localStorage.setItem("chatbot_user_email", email);
                            localStorage.setItem("chatbot_verified_at", new Date().toISOString());
                            chatbox.removeChild(authWrapper);
                            skipOTP = true;
                            enableChat();
                        } else {
                            alert(data.message || "Invalid OTP");
                        }
                    } catch (error) {
                        console.error("OTP verification failed:", error);
                        alert("Verification failed. Please try again.");
                    }
                };
            }

            function enableChat() {
                document.querySelector("#troika-auth-wrapper")?.remove();
                inputBox.style.display = "flex";
                showGreeting();
            }

            function showGreeting() {
                if (greetingShown) return;
                greetingShown = true;
                // Only show suggestions for greeting message
                addMessage("bot", GREETING_MESSAGE, null, GREETING_SUGGESTIONS, new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
            }

            function addMessage(role, text, avatar = null, suggestions = [], time = null) {
                const row = el("div", { class: `troika-msg troika-message ${role} troika-${role}` });

                const bubbleContent = `
<div class="troika-bubble-text">${text.replace(
                    /\[([^\]]+)\]\(([^)]+)\)/g,
                    '<a href="$2" target="_blank">$1</a>'
                )}</div>
${time ? `<div class="troika-timestamp troika-timestamp">${time}</div>` : ''}
`;
                const bubble = el("div", { class: "troika-bubble troika-bubble" }, bubbleContent);

                const img = el("img", {
                    class: "troika-avatar troika-avatar",
                    src:
                        avatar ||
                        (role === "user"
                            ? "https://cdn-icons-png.flaticon.com/512/149/149071.png"
                            : "https://raw.githubusercontent.com/troika-tech/Asset/53e29e1748a7b203eaf3895581cfa4aac341f016/Supa%20Agent.svg"),
                });

                if (role === "user") {
                    row.appendChild(bubble);
                    row.appendChild(img);
                } else {
                    row.appendChild(img);
                    row.appendChild(bubble);
                }
                messages.appendChild(row);

                // Only show suggestions if they exist and are provided
                if (role === "bot" && suggestions.length > 0) {
                    const suggContainer = el("div", {
                        id: "troika-suggestion-row"
                    });

                    const suggBubble = el("div", { class: "troika-bubble troika-bubble" });
                    suggestions.forEach((text) => {
                        const btn = el("button", { class: "troika-suggestion-button troika-suggestion" }, text);
                        btn.onclick = () => {
                            document.getElementById("troika-suggestion-row")?.remove();
                            input.value = text;
                            sendMessage();
                        };
                        suggBubble.appendChild(btn);
                    });
                    suggContainer.appendChild(suggBubble);
                    messages.appendChild(suggContainer);
                }
                messages.scrollTop = messages.scrollHeight;
            }

            function showTyping() {
                const typing = el("div", {
                    class: "troika-msg bot troika-bot troika-typing-msg",
                    id: "typing-indicator",
                });
                typing.appendChild(
                    el("img", {
                        class: "troika-avatar troika-avatar",
                        src: "https://raw.githubusercontent.com/troika-tech/Asset/53e29e1748a7b203eaf3895581cfa4aac341f016/Supa%20Agent.svg",
                    })
                );
                typing.appendChild(
                    el("div", { class: "troika-bubble troika-bubble typing-indicator troika-typing" }, "Typing...")
                );
                messages.appendChild(typing);
                messages.scrollTop = messages.scrollHeight;
            }

            function removeTyping() {
                document.getElementById("typing-indicator")?.remove();
            }

            async function sendMessage() {
                const query = input.value.trim();
                if (!query) return;
                addMessage("user", query, null, [], new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                document.getElementById("troika-suggestion-row")?.remove();
                input.value = "";
                showTyping();

                const email = localStorage.getItem("chatbot_user_email");

                if (!email) {
                    removeTyping();
                    addMessage(
                        "bot",
                        "❌ Email is missing. Please refresh and verify again.",
                        null, [], new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
                    );
                    return;
                }

                try {
                    const res = await fetch(`${apiBase}/chat/query`, {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ email, query, chatbotId, sessionId }),
                    });
                    const data = await res.json();
                    removeTyping();
                    if (res.ok) {
                        // Don't pass data.suggestions - only pass empty array to prevent suggestions
                        addMessage("bot", data.answer || "(No response)", null, [], new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                    } else {
                        addMessage("bot", `❌ ${data.message || "Error"}`, null, [], new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                    }
                } catch (err) {
                    removeTyping();
                    addMessage("bot", "⚠️ Unable to reach server.", null, [], new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }));
                }
            }

            sendBtn.onclick = sendMessage;
            input.addEventListener("keypress", (e) => {
                if (e.key === "Enter") sendMessage();
            });
        })();