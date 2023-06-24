 function updateChatHistory() {
     $.ajax({
         url: '/get_chat_history',
         type: 'GET',
         success: function(data) {
             $('#chat-history').empty();
             data.forEach(function(message) {
                 $('#chat-history').append('<div class="message"><strong>' + message.sender + ':</strong> ' + message.message + '</div>');
             });
             $('#scroll-window').scrollTop($('#chat-history').prop('scrollHeight'));
         }
     });
 }

 function updateConnectedUsers() {
     $.ajax({
         url: '/get_connected_users',
         type: 'GET',
         success: function(data) {
             $('#connected-users').empty();
             $('#connected-users').append('<strong>Connected users:</strong> ' + data.length);
             $('#user-list').empty();
             data.forEach(function(username) {
                 $('#user-list').append('<p>' + username + '</p>');
             });
         }
     });
 }

 function sendMessage() {
     var username = $('#username-input').val();
     var message = $('#message-input').val();
     $.ajax({
         url: '/send_message',
         type: 'POST',
         data: JSON.stringify({
             'username': username,
             'message': message
         }),
         contentType: 'application/json; charset=utf-8',
         dataType: 'json',
         async: false,
         success: function() {
             $('#message-input').val('');
         }
     });
 }

 function promptChatbot() {
     var username = 'Chatbot AI';
     $.ajax({
         url: '/prompt_chatbot',
         type: 'POST',
         data: JSON.stringify({
             'username': username
         }),
         contentType: 'application/json; charset=utf-8',
         dataType: 'json',
         async: false
     });
 }

 function toggleUserList() {
     $('#user-list').toggleClass('show');
 }

 $(document).ready(function() {
     updateChatHistory();
     updateConnectedUsers();
     setInterval(updateChatHistory, 5000);
     setInterval(updateConnectedUsers, 5000);

     $('#message-input').emojioneArea({
         pickerPosition: 'top',
         tonesStyle: 'bullet',
         autocomplete: false,
         events: {
             keyup: function(editor, event) {
                 if (event.keyCode == 13 && !event.shiftKey) {
                     sendMessage();
                     this.setText('');
                 }
             }
         }
     });
 });
