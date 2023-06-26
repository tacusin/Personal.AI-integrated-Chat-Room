let username = localStorage.getItem('username');

function login() {
    var input_username = $('#username-input').val();
    if (!input_username) {
        alert('Username cannot be empty.');
        return;
    }

    // Fetch connected users
    $.ajax({
        url: '/get_connected_users',
        type: 'GET',
        success: function(data) {
            // Check if input_username is in the list of connected users
            if (data.includes(input_username)) {
                alert('Username is already in use.');
            } else {
                // If username is not in use, proceed with login
                username = input_username;
                localStorage.setItem('username', username);
                window.location.href = '/chat';
            }
        },
        error: function() {
            alert('There was a problem checking the username. Please try again.');
        }
    });
}

// Function to scroll the chat window to the bottom
function scrollChatWindowToBottom() {
  const chatHistory = document.getElementById('chat-history');
  chatHistory.scrollTop = chatHistory.scrollHeight;
}

// Function to check if the user is at the bottom of the chat window
function isUserAtBottom() {
  const chatHistory = document.getElementById('chat-history');
  return chatHistory.scrollTop + chatHistory.clientHeight === chatHistory.scrollHeight;
}

function updateChatHistory() {
    $.ajax({
        url: '/get_chat_history',
        type: 'GET',
        success: function(data) {
            const chatHistory = $('#chat-history');
            const isUserAtBottom = chatHistory.scrollTop() + chatHistory.innerHeight() >= chatHistory[0].scrollHeight;

            chatHistory.empty();
            data.forEach(function(message) {
                chatHistory.append('<div class="message"><strong>' + message.sender + ':</strong> ' + message.message + '</div>');
            });

            if (isUserAtBottom) {
                chatHistory.scrollTop(chatHistory.prop('scrollHeight'));
            }
        }
    });
}

function updateConnectedUsers() {
    $.ajax({
        url: '/get_connected_users',
        type: 'GET',
        success: function(data) {
            $('#connected-users').empty();
            $('#connected-users').append('<strong><span class="underline">Connected Users:</strong> ' + data.length + '</span> <--- Clickable');
            $('#user-list').empty();
            $('#user-list').append('<div id="connected-users" onclick="toggleUserList()"><span class="underline">Connected Users</div>');
            data.forEach(function(user) {
                $('#user-list').append('<p>• ' + user + '</p>');
            });
        }
    });
}

function sendView() {
    $.ajax({
        url: '/send_view',
        type: 'POST',
        contentType: 'text/plain',
        data: username
    });
} 

function logout() {
  localStorage.removeItem('username');
  window.location.href = '/';
}

function sendMessage() {
    var message = $('#message-input').val();
    $('#message-input').val('');
    var emojioneArea = $("#message-input").data("emojioneArea");
    if (!message && emojioneArea.getText().trim() !== '') {
      message = emojioneArea.getText().trim();
    }
    emojioneArea.setText('');
    if (!message) return;  // prevent empty messages
    $.ajax({
        url: '/send_message',
        type: 'POST',
        data: JSON.stringify({
            'username': username,
            'message': message
        }),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json',
        async: false
    });
}

function promptChatbot() {
    var message = $('#message-input').val();
    $('#message-input').val('');
    var emojioneArea = $("#message-input").data("emojioneArea");
    if (!message && emojioneArea.getText().trim() !== '') {
      message = emojioneArea.getText().trim();
    }
    emojioneArea.setText('');
    if (!message) return; // prevent empty messages
    $.ajax({
        url: '/prompt_chatbot',
        type: 'POST',
        data: JSON.stringify({
            'username': username,
            'message': message
        }),
        contentType: 'application/json; charset=utf-8',
        dataType: 'json'
    });
}

function toggleUserList() {
    $('#user-list').toggleClass('show');
}

$(document).ready(function() {
    if (window.location.pathname === '/chat') {
        if (!username) {
            window.location.href = '/';
            return;
        }

        updateChatHistory();
        updateConnectedUsers();
        sendView();
        setInterval(updateChatHistory, 5000);
        setInterval(updateConnectedUsers, 5000);
        setInterval(sendView, 5000);

        $('#message-input').emojioneArea({
        pickerPosition: 'top',
        tonesStyle: 'bullet',
        autocomplete: false,
        events: {
            keyup: function(editor, event) {
                if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    sendMessage();
                    }
                }
            }
        });
    }
});
