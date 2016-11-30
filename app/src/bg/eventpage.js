/// Handle & Pass request to sandboxed iframe
function handleRenderMessage(request, sender, sendResponse) {
    var name = request.content.name;
    var context = request.content.context;
    var source = request.content.source;

    var type = request.type;
    var from = request.from;
    console.log("message received > ", type, ", from: " + from, name);

    var iframe = document.getElementById('theFrame');
    var message = {
        command: type, //'render' or 'new'
        name: name,
        context: context,
        source: source
    };
    iframe.contentWindow.postMessage(message, '*');
}

chrome.runtime.onMessage.addListener(handleRenderMessage);

/// Receive iframe response
window.addEventListener('message', function (event) {
    var response = {
        from: 'eventpage.js',
    };
    if (event.data.html) {
        response.type = "compiled";
        response.content = event.data.html;

        console.log(response);

        // chrome.runtime.sendMessage(response);
        new Notification('Templated!', {
            body: 'HTML Received for "' + event.data.name + '": `' +
            event.data.html + '`'
        });
    }
    if (event.data.name && event.data.success) {
        response.type = "new_success";
        response.content = event.data.name;

        console.log(response);
        shared.sendResponse(response);
        new Notification('New!!', {
            body: 'HTML stored for "' + event.data.name
        });
    }
});
